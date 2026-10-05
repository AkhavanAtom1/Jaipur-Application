import type { AckResult, SeatGrant } from '../../../shared/protocol.ts';
import type { GameAction } from '../../../shared/types.ts';
import { getGameWebSocketUrl } from './config.ts';

/**
 * Minimal reconnecting WebSocket client (replaces socket.io-client).
 * Wire format: { t:'emit', id, event, payload } -> { t:'ack', id, res }, and
 * server pushes { t:'event', event, payload }.
 */
type Listener = (...args: any[]) => void;

class GameSocket {
  connected = false;
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private acks = new Map<number, (r: any) => void>();
  private nextId = 1;
  private retry = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.open();
    // Wake up immediately when the tab/network comes back.
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.open());
      document.addEventListener('visibilitychange', () => { if (!document.hidden) this.open(); });
    }
  }

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }
  off(event: string, fn: Listener) { this.listeners.get(event)?.delete(fn); }
  private fire(event: string, ...args: any[]) { this.listeners.get(event)?.forEach((fn) => fn(...args)); }

  emit(event: string, ...args: any[]) {
    const ack = typeof args[args.length - 1] === 'function' ? (args.pop() as (r: any) => void) : undefined;
    const payload = args[0];
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return; // ack never fires -> caller's timeout reports "offline"
    const id = this.nextId++;
    if (ack) this.acks.set(id, ack);
    this.ws.send(JSON.stringify({ t: 'emit', id, event, payload }));
  }

  private open() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const ws = new WebSocket(getGameWebSocketUrl());
    this.ws = ws;

    ws.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.t === 'hello') {
        this.retry = 0;
        this.connected = true;
        this.heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('{"t":"ping"}'); }, 25_000);
        this.fire('connect');
      } else if (msg.t === 'ack') {
        const cb = this.acks.get(msg.id);
        this.acks.delete(msg.id);
        cb?.(msg.res);
      } else if (msg.t === 'event') {
        this.fire(msg.event, msg.payload);
      }
    };
    const down = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null; }
      this.acks.clear();
      if (this.connected) { this.connected = false; this.fire('disconnect'); }
      const delay = Math.min(500 * 2 ** this.retry++, 4000);
      setTimeout(() => this.open(), delay);
    };
    ws.onclose = down;
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }
}

export const socket = new GameSocket();

const TIMEOUT = 8000;
const offline = <T extends object>(): AckResult<T> => ({ ok: false, code: 'BAD_REQUEST', error: 'The server did not answer. Check your connection.' });

function withTimeout<T extends object>(run: (done: (r: AckResult<T>) => void) => void): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(offline<T>()); } }, TIMEOUT);
    run((r) => { if (settled) return; settled = true; clearTimeout(timer); resolve(r); });
  });
}


export const api = {
  create: (name: string) => withTimeout<SeatGrant>((done) => socket.emit('room:create', { name }, done)),
  join: (roomId: string, name: string) => withTimeout<SeatGrant>((done) => socket.emit('room:join', { roomId, name }, done)),
  rejoin: (roomId: string, token: string) => withTimeout<SeatGrant>((done) => socket.emit('room:rejoin', { roomId, token }, done)),
  leave: () => withTimeout((done) => socket.emit('room:leave', done)),
  act: (action: GameAction) => withTimeout((done) => socket.emit('game:action', { action }, done)),
  continueGame: () => withTimeout((done) => socket.emit('game:continue', done)),
};
