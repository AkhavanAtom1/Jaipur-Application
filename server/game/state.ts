import type {
  BonusSize, BonusToken, Card, GameEvent, GamePhase, GoodType, GoodsToken, LogEntry,
  PlayerIndex, RoundEndReason, RoundResult,
} from '../../shared/types.ts';

/** Full, secret server-side state. Never sent to clients as-is (see view.ts). */
export interface PlayerState {
  hand: Card[];
  herd: Card[];
  goodsTokens: GoodsToken[];
  bonusTokens: BonusToken[];
}

export interface RoundState {
  number: number;
  deck: Card[];
  market: Card[];
  discard: Card[];
  goodsTokens: Record<GoodType, GoodsToken[]>;
  bonusStacks: Record<BonusSize, BonusToken[]>;
  camelTokenAvailable: boolean;
  players: [PlayerState, PlayerState];
  currentPlayer: PlayerIndex;
  startingPlayer: PlayerIndex;
  endReason: RoundEndReason | null;
}

/** Plain JSON-serialisable object, so it can be moved to Redis or another store later. */
export interface GameState {
  phase: GamePhase;
  round: RoundState;
  seals: [number, number];
  results: RoundResult[];
  winner: PlayerIndex | null;
  log: LogEntry[];
  nextLogId: number;
  lastEvent: GameEvent | null;
  version: number;
}

export const other = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);
