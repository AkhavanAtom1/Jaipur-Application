/**
 * Transport-agnostic room logic: creating/joining rooms, seats, reconnection,
 * and routing validated actions to the engine. Socket.IO lives in ../socket.
 */
import type { PlayerIndex, RoomView } from '../../shared/types.ts';
import { isRoomCodeFormat, normalizeRoomCode, type ErrorCode } from '../../shared/protocol.ts';
import { applyAction, createGame, createRematch, startNextRound } from '../game/engine.ts';
import { cryptoRng, type Rng } from '../game/rng.ts';
import { toGameView } from '../game/view.ts';
import { generateRoomCode, generateSeatToken } from './codes.ts';
import type { RoomStore } from './store.ts';
import type { Room, RoomPlayer } from './types.ts';

export type Fail = { ok: false; error: string; code: ErrorCode };
export type Result<T extends object> = ({ ok: true } & T) | Fail;

export interface SeatResult {
  room: Room;
  seat: PlayerIndex;
  token: string;
  /** Other rooms touched (e.g. the socket left a previous room). */
  affected: Room[];
}

export interface RoomManagerOptions {
  rng?: Rng;
  now?: () => number;
  /** Delete a room once every seated player has been gone this long. */
  abandonedTtlMs?: number;
}

const fail = (code: ErrorCode, error: string): Fail => ({ ok: false, code, error });

export function cleanName(raw: unknown, fallback: string): string {
  const s = typeof raw === 'string' ? raw.replace(/[-\u001f<>]/g, '').trim().slice(0, 18) : '';
  return s || fallback;
}

export class RoomManager {
  private store: RoomStore;
  private rng: Rng;
  private now: () => number;
  private abandonedTtlMs: number;
  private bySocket = new Map<string, { roomId: string; seat: PlayerIndex }>();

  constructor(store: RoomStore, opts: RoomManagerOptions = {}) {
    this.store = store;
    this.rng = opts.rng ?? cryptoRng;
    this.now = opts.now ?? Date.now;
    this.abandonedTtlMs = opts.abandonedTtlMs ?? 30 * 60_000;
  }

  getRoom(id: string) { return this.store.get(id); }
  roomOf(socketId: string) {
    const e = this.bySocket.get(socketId);
    return e ? { room: this.store.get(e.roomId), seat: e.seat } : null;
  }

  createRoom(name: unknown, socketId: string): Result<SeatResult> {
    const affected = this.detach(socketId);
    const id = generateRoomCode((c) => this.store.has(c));
    const token = generateSeatToken();
    const t = this.now();
    const room: Room = {
      id, createdAt: t, updatedAt: t,
      players: [this.newPlayer(token, cleanName(name, 'Player 1'), socketId), null],
      game: null,
      ready: [false, false],
    };
    this.store.set(room);
    this.bySocket.set(socketId, { roomId: id, seat: 0 });
    return { ok: true, room, seat: 0, token, affected };
  }

  joinRoom(code: unknown, name: unknown, socketId: string): Result<SeatResult> {
    const id = normalizeRoomCode(String(code ?? ''));
    if (!isRoomCodeFormat(id)) return fail('INVALID_CODE', 'Room codes are 5 letters or digits, like K7P4X.');
    const room = this.store.get(id);
    if (!room) return fail('ROOM_NOT_FOUND', `No open room with code ${id}. Check the code with your opponent.`);
    const current = this.bySocket.get(socketId);
    if (current?.roomId === id) return fail('ALREADY_IN_ROOM', 'You are already in this room.');
    if (room.players[1] !== null) return fail('ROOM_FULL', `Room ${id} already has two players.`);

    const affected = this.detach(socketId);
    const token = generateSeatToken();
    room.players[1] = this.newPlayer(token, cleanName(name, 'Player 2'), socketId);
    room.game = createGame(this.rng); // starts automatically once both seats are filled
    room.ready = [false, false];
    room.updatedAt = this.now();
    this.store.set(room);
    this.bySocket.set(socketId, { roomId: id, seat: 1 });
    return { ok: true, room, seat: 1, token, affected };
  }

  rejoinRoom(code: unknown, token: unknown, socketId: string): Result<SeatResult> {
    const id = normalizeRoomCode(String(code ?? ''));
    const room = this.store.get(id);
    if (!room || typeof token !== 'string') return fail('SESSION_EXPIRED', 'That game is no longer available.');
    const seat = room.players.findIndex((p) => p?.token === token);
    if (seat === -1) return fail('SESSION_EXPIRED', 'That seat is no longer yours.');
    const p = room.players[seat]!;
    if (p.left) return fail('SESSION_EXPIRED', 'You left that game.');

    const affected = this.bySocket.get(socketId)?.roomId === id ? [] : this.detach(socketId);
    if (p.socketId && p.socketId !== socketId) this.bySocket.delete(p.socketId); // stale tab/socket loses the seat
    p.socketId = socketId;
    p.connected = true;
    p.lastSeen = this.now();
    room.updatedAt = this.now();
    this.bySocket.set(socketId, { roomId: id, seat: seat as PlayerIndex });
    this.store.set(room);
    return { ok: true, room, seat: seat as PlayerIndex, token, affected };
  }

  /** Temporary disconnect: the seat is kept for reconnection. */
  handleDisconnect(socketId: string): Room | null {
    const e = this.bySocket.get(socketId);
    if (!e) return null;
    this.bySocket.delete(socketId);
    const room = this.store.get(e.roomId);
    const p = room?.players[e.seat];
    if (!room || !p || p.socketId !== socketId) return null;
    p.socketId = null;
    p.connected = false;
    p.lastSeen = this.now();
    room.updatedAt = this.now();
    this.store.set(room);
    return room;
  }

  /** Deliberate leave. Returns the room if it still exists (so the opponent can be told). */
  leaveRoom(socketId: string): Room | null {
    return this.detach(socketId)[0] ?? null;
  }

  act(socketId: string, action: unknown): Result<{ room: Room }> {
    const found = this.seatOf(socketId);
    if (!found.ok) return found;
    const { room, seat } = found;
    if (!room.game) return fail('GAME_NOT_STARTED', 'Waiting for a second player.');
    const res = applyAction(room.game, seat, action);
    if (!res.ok) return fail('ILLEGAL_ACTION', res.error);
    room.ready = [false, false];
    room.updatedAt = this.now();
    this.store.set(room);
    return { ok: true, room };
  }

  /** Vote to continue (next round or rematch). Proceeds when both players agree. */
  continueGame(socketId: string): Result<{ room: Room; advanced: boolean }> {
    const found = this.seatOf(socketId);
    if (!found.ok) return found;
    const { room, seat } = found;
    const g = room.game;
    if (!g || g.phase === 'playing') return fail('ILLEGAL_ACTION', 'Nothing to continue right now.');
    const opp = room.players[seat === 0 ? 1 : 0];
    if (!opp || opp.left) return fail('ILLEGAL_ACTION', 'Your opponent has left the room.');
    room.ready[seat] = true;
    let advanced = false;
    if (room.ready[0] && room.ready[1]) {
      if (g.phase === 'roundOver') startNextRound(g, this.rng);
      else room.game = createRematch(g, this.rng);
      room.ready = [false, false];
      advanced = true;
    }
    room.updatedAt = this.now();
    this.store.set(room);
    return { ok: true, room, advanced };
  }

  viewFor(room: Room, seat: PlayerIndex): RoomView {
    const pv = (p: RoomPlayer | null) => (p ? { name: p.name, connected: p.connected, left: p.left } : null);
    return {
      roomId: room.id,
      you: seat,
      players: [pv(room.players[0]), pv(room.players[1])],
      status: room.game ? room.game.phase : 'waiting',
      ready: [room.ready[0], room.ready[1]],
      game: room.game ? toGameView(room.game, seat) : null,
    };
  }

  /** Remove abandoned rooms. Returns deleted ids. */
  sweep(): string[] {
    const t = this.now();
    const deleted: string[] = [];
    for (const room of [...this.store.values()]) {
      const seated = room.players.filter((p): p is RoomPlayer => p !== null);
      const anyoneHere = seated.some((p) => p.connected);
      const lastSeen = Math.max(...seated.map((p) => (p.connected ? t : p.lastSeen)));
      if (!anyoneHere && t - lastSeen > this.abandonedTtlMs) {
        this.store.delete(room.id);
        deleted.push(room.id);
      }
    }
    return deleted;
  }

  activeRoomCount() { return this.store.size(); }

  // -------------------------------------------------------------------------

  private newPlayer(token: string, name: string, socketId: string): RoomPlayer {
    return { token, name, socketId, connected: true, left: false, lastSeen: this.now() };
  }

  private seatOf(socketId: string): Result<{ room: Room; seat: PlayerIndex }> {
    const e = this.bySocket.get(socketId);
    const room = e && this.store.get(e.roomId);
    if (!e || !room) return fail('NOT_IN_ROOM', 'You are not in a room.');
    return { ok: true, room, seat: e.seat };
  }

  /** Remove a socket from whatever room it occupies. */
  private detach(socketId: string): Room[] {
    const e = this.bySocket.get(socketId);
    if (!e) return [];
    this.bySocket.delete(socketId);
    const room = this.store.get(e.roomId);
    const p = room?.players[e.seat];
    if (!room || !p) return [];
    p.left = true;
    p.connected = false;
    p.socketId = null;
    p.lastSeen = this.now();
    const everyoneLeft = room.players.every((x) => x === null || x.left);
    if (!room.game || everyoneLeft) {
      // A waiting room closes when its creator leaves; a game closes when both leave.
      for (const x of room.players) if (x?.socketId) this.bySocket.delete(x.socketId);
      this.store.delete(room.id);
      return room.game ? [] : room.players[1] ? [room] : [];
    }
    room.updatedAt = this.now();
    this.store.set(room);
    return [room];
  }
}
