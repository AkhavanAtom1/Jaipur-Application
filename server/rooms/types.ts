import type { PlayerIndex } from '../../shared/types.ts';
import type { GameState } from '../game/state.ts';

export interface RoomPlayer {
  /** Secret seat token; lets the same player reclaim the seat after a disconnect. */
  token: string;
  name: string;
  socketId: string | null;
  connected: boolean;
  left: boolean;
  lastSeen: number;
}

export interface Room {
  id: string;
  createdAt: number;
  updatedAt: number;
  players: [RoomPlayer | null, RoomPlayer | null];
  game: GameState | null;
  ready: [boolean, boolean];
}

export type Seat = PlayerIndex;
