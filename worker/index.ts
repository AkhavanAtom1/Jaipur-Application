/**
 * Cloudflare Worker entry + the Durable Object that hosts every game room.
 *
 * - Static client files are served by Workers Assets (see wrangler.jsonc).
 * - /ws  -> upgraded to a WebSocket and handled by ONE Durable Object ("hub"),
 *           which keeps all rooms in memory (and snapshots them to storage).
 * - A single hub instance is plenty for friends-sized traffic and keeps both
 *   players of a room on the same object without any extra coordination.
 */
import { DurableObject } from 'cloudflare:workers';
import type { Ack, ClientToServerEvents } from '../shared/protocol.ts';
import type { PlayerIndex } from '../shared/types.ts';
import { RoomManager } from '../server/rooms/RoomManager.ts';
import { MemoryRoomStore } from '../server/rooms/store.ts';
import type { Room } from '../server/rooms/types.ts';

interface Env {
  HUB: DurableObjectNamespace;
  ASSETS: Fetcher;
}

type SeatGrantRes = { roomId: string; token: string; you: PlayerIndex };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/ws' || url.pathname === '/api/health') {
      const stub = env.HUB.get(env.HUB.idFromName('main'));
      return stub.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export class JaipurHub extends DurableObject<Env> {
  private store = new MemoryRoomStore();
  private manager = new RoomManager(this.store);
  private sockets = new Map<string, WebSocket>();
  private lastPersist = '';

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Room[]>('rooms');
      for (const room of saved ?? []) {
        // Sockets did not survive a restart: everybody must rejoin with their seat token.
        for (const p of room.players) if (p) { p.socketId = null; p.connected = false; }
        this.store.set(room);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, rooms: this.manager.activeRoomCount(), sockets: this.sockets.size });
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    server.accept();
    const sid = crypto.randomUUID();
    this.sockets.set(sid, server);

    server.addEventListener('message', (ev) => this.onMessage(sid, ev.data));
    const close = () => {
      if (this.sockets.get(sid) !== server) return;
      this.sockets.delete(sid);
      this.broadcast(this.manager.handleDisconnect(sid));
      this.persist();
    };
    server.addEventListener('close', close);
    server.addEventListener('error', close);

    server.send(JSON.stringify({ t: 'hello' }));
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------------------------------------------------------------------------

  private send(sid: string, msg: unknown) {
    try { this.sockets.get(sid)?.send(JSON.stringify(msg)); } catch { /* socket already closed */ }
  }

  /** Every player receives their own projection: hidden info never leaves the server. */
  private broadcast(room: Room | null | undefined) {
    if (!room || !this.manager.getRoom(room.id)) return;
    room.players.forEach((p, seat) => {
      if (p?.socketId) this.send(p.socketId, { t: 'event', event: 'room:state', payload: this.manager.viewFor(room, seat as PlayerIndex) });
    });
  }

  private persist() {
    const rooms = [...this.store.values()];
    const json = JSON.stringify(rooms);
    if (json === this.lastPersist) return;
    this.lastPersist = json;
    void this.ctx.storage.put('rooms', rooms);
  }

  private onMessage(sid: string, raw: unknown) {
    let msg: { t?: string; id?: number; event?: keyof ClientToServerEvents; payload?: any };
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (msg.t === 'ping') return this.send(sid, { t: 'pong' });
    if (msg.t !== 'emit' || typeof msg.id !== 'number') return;

    const id = msg.id;
    const payload = msg.payload ?? {};
    const reply: Ack<any> = (res) => this.send(sid, { t: 'ack', id, res });
    const m = this.manager;
    const grant = (res: ReturnType<RoomManager['createRoom']>) => {
      if (!res.ok) return reply(res);
      res.affected.forEach((r) => this.broadcast(r));
      reply({ ok: true, roomId: res.room.id, token: res.token, you: res.seat } satisfies { ok: true } & SeatGrantRes);
      this.broadcast(res.room);
    };

    switch (msg.event) {
      case 'room:create': grant(m.createRoom(payload.name, sid)); break;
      case 'room:join': grant(m.joinRoom(payload.roomId, payload.name, sid)); break;
      case 'room:rejoin': grant(m.rejoinRoom(payload.roomId, payload.token, sid)); break;
      case 'room:leave': {
        const room = m.leaveRoom(sid);
        reply({ ok: true });
        this.broadcast(room);
        break;
      }
      case 'game:action': {
        const res = m.act(sid, payload.action);
        if (!res.ok) return reply(res);
        reply({ ok: true });
        this.broadcast(res.room);
        break;
      }
      case 'game:continue': {
        const res = m.continueGame(sid);
        if (!res.ok) return reply(res);
        reply({ ok: true });
        this.broadcast(res.room);
        break;
      }
      default: reply({ ok: false, code: 'BAD_REQUEST', error: 'Unknown request.' });
    }
    m.sweep();
    this.persist();
  }
}
