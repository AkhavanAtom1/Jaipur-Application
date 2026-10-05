import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../rooms/RoomManager.ts';
import { MemoryRoomStore } from '../rooms/store.ts';
import { seededRng } from '../game/rng.ts';
import { endRound } from '../game/engine.ts';
import { isRoomCodeFormat } from '../../shared/protocol.ts';

const mgr = (now = () => 1000) => new RoomManager(new MemoryRoomStore(), { rng: seededRng(4), now, abandonedTtlMs: 60_000 });

test('create room: unique, well-formed codes', () => {
  const m = mgr();
  const codes = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const r = m.createRoom('A', `s${i}`);
    assert.ok(r.ok);
    assert.ok(isRoomCodeFormat(r.room.id));
    codes.add(r.room.id);
  }
  assert.equal(codes.size, 2000);
});

test('join the exact room; third player, bad and unknown codes are rejected', () => {
  const m = mgr();
  const a = m.createRoom('Asha', 'sa');
  const b = m.createRoom('Bo', 'sb');
  assert.ok(a.ok && b.ok);
  const j = m.joinRoom(a.room.id.toLowerCase(), 'Chandra', 'sc');
  assert.ok(j.ok);
  assert.equal(j.room.id, a.room.id);
  assert.equal(j.seat, 1);
  assert.ok(j.room.game, 'game starts on join');
  assert.equal(m.getRoom(b.room.id)!.game, null, 'other room untouched');
  const third = m.joinRoom(a.room.id, 'Dev', 'sd');
  assert.equal(third.ok, false);
  assert.equal(!third.ok && third.code, 'ROOM_FULL');
  const bad = m.joinRoom('!!', 'Dev', 'sd');
  assert.equal(!bad.ok && bad.code, 'INVALID_CODE');
  const unknown = m.joinRoom('ZZZZZ', 'Dev', 'sd');
  assert.equal(!unknown.ok && unknown.code, 'ROOM_NOT_FOUND');
  const self = m.joinRoom(b.room.id, 'Bo', 'sb');
  assert.equal(!self.ok && self.code, 'ALREADY_IN_ROOM');
});

test('two rooms run independent games simultaneously', () => {
  const m = mgr();
  const a = m.createRoom('A1', 'a1'); const b = m.createRoom('B1', 'b1');
  assert.ok(a.ok && b.ok);
  m.joinRoom(a.room.id, 'A2', 'a2'); m.joinRoom(b.room.id, 'B2', 'b2');
  const ga = m.getRoom(a.room.id)!.game!; const gb = m.getRoom(b.room.id)!.game!;
  assert.notEqual(ga, gb);
  const beforeB = JSON.stringify(gb);
  const sockA = ga.round.currentPlayer === 0 ? 'a1' : 'a2';
  const res = m.act(sockA, { type: 'takeCamels' });
  assert.ok(res.ok);
  assert.equal(ga.version, 2);
  assert.equal(JSON.stringify(gb), beforeB);
  // A player of room B cannot act in room A
  const wrong = m.act('b1', { type: 'takeCamels' });
  assert.ok(wrong.ok === false || m.getRoom(a.room.id)!.game!.version === 2);
});

test('turn enforcement through the room layer', () => {
  const m = mgr();
  const a = m.createRoom('A', 'x1'); assert.ok(a.ok);
  m.joinRoom(a.room.id, 'B', 'x2');
  const g = m.getRoom(a.room.id)!.game!;
  const idle = g.round.currentPlayer === 0 ? 'x2' : 'x1';
  const r = m.act(idle, { type: 'takeCamels' });
  assert.equal(r.ok, false);
  assert.equal(m.act('nobody', { type: 'takeCamels' }).ok, false);
});

test('disconnect keeps the seat; token reclaims it; wrong token fails', () => {
  let t = 1000;
  const m = mgr(() => t);
  const a = m.createRoom('A', 'p1'); assert.ok(a.ok);
  const b = m.joinRoom(a.room.id, 'B', 'p2'); assert.ok(b.ok);
  const room = m.handleDisconnect('p2')!;
  assert.equal(room.players[1]!.connected, false);
  assert.equal(m.viewFor(room, 0).players[1]!.connected, false);
  assert.equal(m.rejoinRoom(a.room.id, 'forged', 'p2b').ok, false);
  const back = m.rejoinRoom(a.room.id, b.token, 'p2b');
  assert.ok(back.ok);
  assert.equal(back.seat, 1);
  assert.equal(back.room.players[1]!.connected, true);
  assert.ok(m.viewFor(back.room, 1).game!.me.hand.length >= 0);
  // Abandoned rooms are swept only after both are gone for the TTL
  m.handleDisconnect('p1'); m.handleDisconnect('p2b');
  t += 30_000; assert.deepEqual(m.sweep(), []);
  t += 60_000; assert.deepEqual(m.sweep(), [a.room.id]);
});

test('leaving: waiting room closes; mid-game leave is shown to the opponent', () => {
  const m = mgr();
  const a = m.createRoom('A', 'q1'); assert.ok(a.ok);
  m.leaveRoom('q1');
  assert.equal(m.getRoom(a.room.id), undefined);
  const b = m.createRoom('A', 'q1'); assert.ok(b.ok);
  m.joinRoom(b.room.id, 'B', 'q2');
  const r = m.leaveRoom('q2')!;
  assert.equal(m.viewFor(r, 0).players[1]!.left, true);
  assert.equal(m.continueGame('q1').ok, false);
  m.leaveRoom('q1');
  assert.equal(m.getRoom(b.room.id), undefined);
});

test('continue: both players must agree to start the next round', () => {
  const m = mgr();
  const a = m.createRoom('A', 'r1'); assert.ok(a.ok);
  m.joinRoom(a.room.id, 'B', 'r2');
  const room = m.getRoom(a.room.id)!;
  assert.equal(m.continueGame('r1').ok, false, 'nothing to continue mid-round');
  room.game!.round.players[0].goodsTokens.push({ id: 'z', good: 'gold', value: 6 });
  endRound(room.game!, 'deck');
  const first = m.continueGame('r1');
  assert.ok(first.ok && !first.advanced);
  assert.deepEqual(m.viewFor(room, 1).ready, [true, false]);
  const second = m.continueGame('r2');
  assert.ok(second.ok && second.advanced);
  assert.equal(room.game!.round.number, 2);
  assert.equal(room.game!.phase, 'playing');
});

test('views are per-seat: nobody receives the other hand', () => {
  const m = mgr();
  const a = m.createRoom('A', 'v1'); assert.ok(a.ok);
  m.joinRoom(a.room.id, 'B', 'v2');
  const room = m.getRoom(a.room.id)!;
  for (const seat of [0, 1] as const) {
    const json = JSON.stringify(m.viewFor(room, seat));
    for (const c of room.game!.round.players[seat === 0 ? 1 : 0].hand) assert.ok(!json.includes(`"${c.id}"`));
    assert.ok(!json.includes('token":"'), 'seat tokens never sent');
  }
});
