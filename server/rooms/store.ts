import type { Room } from './types.ts';

/**
 * Storage boundary. The in-memory implementation is used today; a Redis-backed
 * store only needs to implement this interface (rooms are plain JSON objects).
 */
export interface RoomStore {
  get(id: string): Room | undefined;
  has(id: string): boolean;
  set(room: Room): void;
  delete(id: string): void;
  values(): Iterable<Room>;
  size(): number;
}

export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, Room>();
  get(id: string) { return this.rooms.get(id); }
  has(id: string) { return this.rooms.has(id); }
  set(room: Room) { this.rooms.set(room.id, room); }
  delete(id: string) { this.rooms.delete(id); }
  values() { return this.rooms.values(); }
  size() { return this.rooms.size; }
}
