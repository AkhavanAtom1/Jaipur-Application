/**
 * The authoritative Jaipur engine. Pure game logic with no I/O: it mutates a
 * GameState after validating every action with the shared rule checks.
 */
import type { BonusSize, Card, CardType, GameAction, GameActionType, GoodType, LogBody, PlayerIndex, RoundEndReason } from '../../shared/types.ts';
import { DEPLETED_TYPES_TO_END, GOODS, MARKET_SIZE, SEALS_TO_WIN } from '../../shared/constants.ts';
import { bonusSizeFor, checkExchange, checkSell, checkTakeCamels, checkTakeGood, type Check } from '../../shared/rules.ts';
import { cryptoRng, type Rng } from './rng.ts';
import { createRound } from './setup.ts';
import { camelMajority, decideSeal, scorePlayer } from './scoring.ts';
import { other, type GameState, type RoundState } from './state.ts';

export type EngineResult = { ok: true } | { ok: false; error: string };

const MAX_LOG = 250;

function pushLog(state: GameState, body: LogBody) {
  state.log.push({ ...body, id: state.nextLogId++ } as GameState['log'][number]);
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

function event(state: GameState, player: PlayerIndex, type: GameActionType | 'roundStart') {
  state.lastEvent = { seq: (state.lastEvent?.seq ?? 0) + 1, player, type };
}

export function createGame(rng: Rng = cryptoRng, startingPlayer?: PlayerIndex): GameState {
  // "Pick a starting player": chosen at random.
  const starter: PlayerIndex = startingPlayer ?? (rng() < 0.5 ? 0 : 1);
  const state: GameState = {
    phase: 'playing',
    round: createRound(1, starter, rng),
    seals: [0, 0],
    results: [],
    winner: null,
    log: [],
    nextLogId: 1,
    lastEvent: null,
    version: 1,
  };
  pushLog(state, { kind: 'roundStart', round: 1, starter });
  event(state, starter, 'roundStart');
  return state;
}

export function depletedTypes(round: RoundState): number {
  return GOODS.filter((g) => round.goodsTokens[g].length === 0).length;
}

// ---------------------------------------------------------------------------
// Input parsing: never trust the shape of client data.
// ---------------------------------------------------------------------------

const isStrArray = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && x.length < 64);

export function parseAction(raw: unknown): GameAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  switch (a.type) {
    case 'takeGood':
      return typeof a.cardId === 'string' ? { type: 'takeGood', cardId: a.cardId } : null;
    case 'takeCamels':
      return { type: 'takeCamels' };
    case 'exchange':
      if (!isStrArray(a.takeIds, MARKET_SIZE) || !isStrArray(a.giveIds, MARKET_SIZE)) return null;
      if (typeof a.giveCamels !== 'number' || !Number.isInteger(a.giveCamels) || a.giveCamels < 0 || a.giveCamels > MARKET_SIZE) return null;
      return { type: 'exchange', takeIds: a.takeIds.slice(), giveIds: a.giveIds.slice(), giveCamels: a.giveCamels };
    case 'sell':
      return isStrArray(a.cardIds, 16) ? { type: 'sell', cardIds: a.cardIds.slice() } : null;
    default:
      return null;
  }
}

export function validateAction(state: GameState, player: PlayerIndex, action: GameAction): Check {
  const r = state.round;
  const me = r.players[player];
  switch (action.type) {
    case 'takeGood': return checkTakeGood(r.market, me.hand, action.cardId);
    case 'takeCamels': return checkTakeCamels(r.market);
    case 'exchange': return checkExchange(r.market, me.hand, me.herd, action.takeIds, action.giveIds, action.giveCamels);
    case 'sell': return checkSell(me.hand, action.cardIds);
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function applyAction(state: GameState, player: PlayerIndex, raw: unknown): EngineResult {
  if (state.phase !== 'playing') return { ok: false, error: 'The round is over.' };
  if (player !== state.round.currentPlayer) return { ok: false, error: "It's not your turn." };
  const action = parseAction(raw);
  if (!action) return { ok: false, error: 'Malformed action.' };
  const check = validateAction(state, player, action);
  if (!check.ok) return { ok: false, error: check.reason };

  const r = state.round;
  const me = r.players[player];

  switch (action.type) {
    case 'takeGood': {
      const idx = r.market.findIndex((c) => c.id === action.cardId);
      const card = r.market[idx];
      me.hand.push(card);
      const slots: (Card | null)[] = r.market.slice();
      slots[idx] = null;
      pushLog(state, { kind: 'takeGood', player, good: card.type as GoodType });
      event(state, player, 'takeGood');
      refillMarket(state, slots);
      break;
    }
    case 'takeCamels': {
      const camels = r.market.filter((c) => c.type === 'camel');
      me.herd.push(...camels);
      const slots = r.market.map((c) => (c.type === 'camel' ? null : c));
      pushLog(state, { kind: 'takeCamels', player, count: camels.length });
      event(state, player, 'takeCamels');
      refillMarket(state, slots);
      break;
    }
    case 'exchange': {
      const given: Card[] = action.giveIds.map((id) => me.hand.find((c) => c.id === id)!);
      me.hand = me.hand.filter((c) => !action.giveIds.includes(c.id));
      given.push(...me.herd.splice(me.herd.length - action.giveCamels, action.giveCamels));
      const took: GoodType[] = [];
      let g = 0;
      // Returned cards take the exact market slots that were emptied.
      r.market = r.market.map((c) => {
        if (!action.takeIds.includes(c.id)) return c;
        me.hand.push(c);
        took.push(c.type as GoodType);
        return given[g++];
      });
      pushLog(state, { kind: 'exchange', player, took, gave: given.map((c) => c.type as CardType) });
      event(state, player, 'exchange');
      break;
    }
    case 'sell': {
      const cards = me.hand.filter((c) => action.cardIds.includes(c.id));
      const good = cards[0].type as GoodType;
      me.hand = me.hand.filter((c) => !action.cardIds.includes(c.id));
      r.discard.push(...cards);
      // Take tokens from the top of the stack; if the stack runs out you simply get fewer.
      const tokens = r.goodsTokens[good].splice(0, cards.length);
      me.goodsTokens.push(...tokens);
      // The bonus is still awarded even when goods tokens ran short.
      const size: BonusSize | null = bonusSizeFor(cards.length);
      let bonus: BonusSize | null = null;
      if (size && r.bonusStacks[size].length > 0) {
        me.bonusTokens.push(r.bonusStacks[size].shift()!);
        bonus = size;
      }
      pushLog(state, {
        kind: 'sell', player, good, count: cards.length,
        rupees: tokens.reduce((s, t) => s + t.value, 0), tokens: tokens.length, bonus,
      });
      event(state, player, 'sell');
      if (depletedTypes(r) >= DEPLETED_TYPES_TO_END) endRound(state, 'tokens');
      break;
    }
  }

  if (state.phase === 'playing') r.currentPlayer = other(player);
  state.version++;
  return { ok: true };
}

/** Fill empty slots from the deck. If the deck cannot fill the market, the round ends. */
function refillMarket(state: GameState, slots: (Card | null)[]) {
  const r = state.round;
  let short = false;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]) continue;
    const next = r.deck.shift();
    if (next) slots[i] = next;
    else short = true;
  }
  r.market = slots.filter((c): c is Card => c !== null);
  if (short) endRound(state, 'deck');
}

export function endRound(state: GameState, reason: RoundEndReason) {
  const r = state.round;
  r.endReason = reason;
  const camelWinner = camelMajority(r);
  if (camelWinner !== null) r.camelTokenAvailable = false;
  const scores = [
    scorePlayer(r.players[0], camelWinner === 0),
    scorePlayer(r.players[1], camelWinner === 1),
  ] as [ReturnType<typeof scorePlayer>, ReturnType<typeof scorePlayer>];
  const { winner, decidedBy } = decideSeal(scores[0], scores[1]);
  if (winner !== null) state.seals[winner]++;
  state.results.push({
    round: r.number, reason, scores, camelWinner, sealWinner: winner, decidedBy,
    sealsAfter: [state.seals[0], state.seals[1]],
  });
  pushLog(state, { kind: 'roundEnd', round: r.number, reason });
  pushLog(state, { kind: 'camelToken', player: camelWinner });
  pushLog(state, { kind: 'seal', player: winner, decidedBy });

  if (winner !== null && state.seals[winner] >= SEALS_TO_WIN) {
    state.phase = 'gameOver';
    state.winner = winner;
    pushLog(state, { kind: 'gameEnd', winner });
  } else {
    state.phase = 'roundOver';
  }
}

/** Next round: full new setup; the loser of the previous round starts. */
export function startNextRound(state: GameState, rng: Rng = cryptoRng): EngineResult {
  if (state.phase !== 'roundOver') return { ok: false, error: 'The round is not over.' };
  const last = state.results[state.results.length - 1];
  // Perfect tie (no seal, not covered by the rulebook): the other player starts.
  const starter = last.sealWinner !== null ? other(last.sealWinner) : other(state.round.startingPlayer);
  const number = state.round.number + 1;
  state.round = createRound(number, starter, rng);
  state.phase = 'playing';
  pushLog(state, { kind: 'roundStart', round: number, starter });
  event(state, starter, 'roundStart');
  state.version++;
  return { ok: true };
}

/** Fresh game after a finished one. The previous game's loser starts. */
export function createRematch(prev: GameState, rng: Rng = cryptoRng): GameState {
  const starter = prev.winner !== null ? other(prev.winner) : undefined;
  const next = createGame(rng, starter);
  next.version = prev.version + 1;
  next.lastEvent = { seq: (prev.lastEvent?.seq ?? 0) + 1, player: next.round.startingPlayer, type: 'roundStart' };
  return next;
}
