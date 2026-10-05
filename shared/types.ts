/**
 * Shared domain types. Imported by the server (authoritative engine) and the
 * client (rendering + UI hints). Pure types only: no runtime code here.
 */
export type GoodType = 'diamond' | 'gold' | 'silver' | 'cloth' | 'spice' | 'leather';
export type CardType = GoodType | 'camel';
export type PlayerIndex = 0 | 1;
export type BonusSize = 3 | 4 | 5;

export interface Card {
  id: string;
  type: CardType;
}

export interface GoodsToken {
  id: string;
  good: GoodType;
  value: number;
}

export interface BonusToken {
  id: string;
  size: BonusSize;
  value: number;
}

/** A bonus token whose value the viewer is not allowed to see. */
export interface HiddenBonusToken {
  id: string;
  size: BonusSize;
  value: null;
}

export type GameAction =
  | { type: 'takeGood'; cardId: string }
  | { type: 'takeCamels' }
  | { type: 'exchange'; takeIds: string[]; giveIds: string[]; giveCamels: number }
  | { type: 'sell'; cardIds: string[] };

export type GameActionType = GameAction['type'];
export type RoundEndReason = 'tokens' | 'deck';
/** Which criterion decided the Seal of Excellence. */
export type SealDecider = 'rupees' | 'bonusCount' | 'goodsCount' | 'unbroken';
export type GamePhase = 'playing' | 'roundOver' | 'gameOver';

export interface ScoreBreakdown {
  goods: number;
  bonus: number;
  camel: number;
  total: number;
  goodsTokenCount: number;
  bonusTokenCount: number;
  camels: number;
  goodsTokens: GoodsToken[];
  bonusTokens: BonusToken[];
}

export interface RoundResult {
  round: number;
  reason: RoundEndReason;
  scores: [ScoreBreakdown, ScoreBreakdown];
  camelWinner: PlayerIndex | null;
  sealWinner: PlayerIndex | null;
  decidedBy: SealDecider;
  sealsAfter: [number, number];
}

export type LogBody =
  | { kind: 'roundStart'; round: number; starter: PlayerIndex }
  | { kind: 'takeGood'; player: PlayerIndex; good: GoodType }
  | { kind: 'takeCamels'; player: PlayerIndex; count: number }
  | { kind: 'exchange'; player: PlayerIndex; took: GoodType[]; gave: CardType[] }
  | { kind: 'sell'; player: PlayerIndex; good: GoodType; count: number; rupees: number; tokens: number; bonus: BonusSize | null }
  | { kind: 'roundEnd'; round: number; reason: RoundEndReason }
  | { kind: 'camelToken'; player: PlayerIndex | null }
  | { kind: 'seal'; player: PlayerIndex | null; decidedBy: SealDecider }
  | { kind: 'gameEnd'; winner: PlayerIndex };

export type LogEntry = LogBody & { id: number };

export interface GameEvent {
  seq: number;
  player: PlayerIndex;
  type: GameActionType | 'roundStart';
}

// ---------------------------------------------------------------------------
// Views: what a single player is allowed to see.
// ---------------------------------------------------------------------------

export interface PublicRoundView {
  number: number;
  deckCount: number;
  market: Card[];
  discardCount: number;
  discardTop: Card | null;
  /** Remaining goods tokens per type, top of the stack first (values are public). */
  goodsTokens: Record<GoodType, GoodsToken[]>;
  /** Remaining bonus token ids per size, top first. Values are hidden. */
  bonusStacks: Record<BonusSize, string[]>;
  camelTokenAvailable: boolean;
  currentPlayer: PlayerIndex;
  startingPlayer: PlayerIndex;
  depletedTypes: number;
}

export interface SelfView {
  hand: Card[];
  herd: Card[];
  goodsTokens: GoodsToken[];
  bonusTokens: BonusToken[];
}

/** Opponent camel count is not public in the official rules; only the herd's rough size is visible. */
export type HerdHint = 'none' | 'few' | 'herd' | 'caravan';

export interface OpponentView {
  handCount: number;
  herdHint: HerdHint;
  goodsTokens: GoodsToken[];
  bonusTokens: HiddenBonusToken[];
}

export interface GameView {
  phase: GamePhase;
  round: PublicRoundView;
  me: SelfView;
  opponent: OpponentView;
  seals: [number, number];
  results: RoundResult[];
  winner: PlayerIndex | null;
  log: LogEntry[];
  lastEvent: GameEvent | null;
  version: number;
}

export type RoomStatus = 'waiting' | GamePhase;

export interface RoomPlayerView {
  name: string;
  connected: boolean;
  left: boolean;
}

export interface RoomView {
  roomId: string;
  you: PlayerIndex;
  players: [RoomPlayerView | null, RoomPlayerView | null];
  status: RoomStatus;
  /** "Continue" votes between rounds / for a rematch. */
  ready: [boolean, boolean];
  game: GameView | null;
}
