/** Socket.IO event contract between client and server. */
import type { GameAction, PlayerIndex, RoomView } from './types.ts';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_IN_ROOM'
  | 'SESSION_EXPIRED'
  | 'NOT_IN_ROOM'
  | 'GAME_NOT_STARTED'
  | 'ILLEGAL_ACTION';

export type AckResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; code: ErrorCode };
export type Ack<T extends object = object> = (res: AckResult<T>) => void;

export interface SeatGrant {
  roomId: string;
  token: string;
  you: PlayerIndex;
}

export interface ClientToServerEvents {
  'room:create': (payload: { name: string }, ack: Ack<SeatGrant>) => void;
  'room:join': (payload: { roomId: string; name: string }, ack: Ack<SeatGrant>) => void;
  'room:rejoin': (payload: { roomId: string; token: string }, ack: Ack<SeatGrant>) => void;
  'room:leave': (ack: Ack) => void;
  'game:action': (payload: { action: GameAction }, ack: Ack) => void;
  'game:continue': (ack: Ack) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
}

export const ROOM_CODE_LENGTH = 5;
/** No 0/O, 1/I/L: codes are read aloud and typed by hand. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function normalizeRoomCode(input: string): string {
  return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isRoomCodeFormat(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}
