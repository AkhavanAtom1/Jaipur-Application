import { useCallback, useEffect, useRef, useState } from 'react';
import type { AckResult, SeatGrant } from '../../../shared/protocol.ts';
import type { GameAction, RoomView } from '../../../shared/types.ts';
import { api, socket } from '../net/socket.ts';
import { local, session } from '../net/storage.ts';
import { isNativeApp } from '../net/config.ts';

const SESSION_KEY = 'jaipur.seat';
const seatStore = isNativeApp ? local : session;
type Session = { roomId: string; token: string };

// sessionStorage is per-tab: two tabs in one browser can be two different players.
const loadSession = (): Session | null => {
  try { return JSON.parse(seatStore.get(SESSION_KEY) ?? 'null'); } catch { return null; }
};
const saveSession = (s: SeatGrant) => seatStore.set(SESSION_KEY, JSON.stringify({ roomId: s.roomId, token: s.token }));
const clearSession = () => seatStore.remove(SESSION_KEY);

export interface RoomApi {
  view: RoomView | null;
  connected: boolean;
  restoring: boolean;
  notice: string | null;
  create: (name: string) => Promise<AckResult<SeatGrant>>;
  join: (code: string, name: string) => Promise<AckResult<SeatGrant>>;
  leave: () => Promise<void>;
  act: (action: GameAction) => Promise<AckResult>;
  continueGame: () => Promise<AckResult>;
  dismissNotice: () => void;
}

export function useRoom(): RoomApi {
  const [view, setView] = useState<RoomView | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [restoring, setRestoring] = useState(() => loadSession() !== null);
  const [notice, setNotice] = useState<string | null>(null);
  const hasView = useRef(false);

  useEffect(() => {
    const onState = (v: RoomView) => { hasView.current = true; setView(v); };
    const onConnect = () => {
      setConnected(true);
      const s = loadSession();
      if (!s) { setRestoring(false); return; }
      // Reclaim our seat after a refresh or a dropped connection.
      api.rejoin(s.roomId, s.token).then((res) => {
        setRestoring(false);
        if (!res.ok) {
          clearSession();
          if (hasView.current) setNotice(res.error);
          hasView.current = false;
          setView(null);
        }
      });
    };
    const onDisconnect = () => setConnected(false);
    socket.on('room:state', onState);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off('room:state', onState);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const create = useCallback(async (name: string) => {
    const res = await api.create(name);
    if (res.ok) saveSession(res);
    return res;
  }, []);

  const join = useCallback(async (code: string, name: string) => {
    const res = await api.join(code, name);
    if (res.ok) saveSession(res);
    return res;
  }, []);

  const leave = useCallback(async () => {
    clearSession();
    hasView.current = false;
    setView(null);
    await api.leave();
  }, []);

  return {
    view, connected, restoring, notice,
    create, join, leave,
    act: api.act,
    continueGame: api.continueGame,
    dismissNotice: () => setNotice(null),
  };
}
