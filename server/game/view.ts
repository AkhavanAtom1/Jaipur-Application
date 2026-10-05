/** Projects secret server state into what ONE player may see. */
import type { BonusSize, GameView, GoodType, HerdHint, PlayerIndex } from '../../shared/types.ts';
import { BONUS_SIZES, GOODS } from '../../shared/constants.ts';
import { depletedTypes } from './engine.ts';
import { other, type GameState } from './state.ts';

export function herdHint(n: number): HerdHint {
  if (n === 0) return 'none';
  if (n <= 3) return 'few';
  if (n <= 6) return 'herd';
  return 'caravan';
}

export function toGameView(state: GameState, viewer: PlayerIndex): GameView {
  const r = state.round;
  const me = r.players[viewer];
  const opp = r.players[other(viewer)];
  const goodsTokens = {} as Record<GoodType, GameView['round']['goodsTokens'][GoodType]>;
  for (const g of GOODS) goodsTokens[g] = r.goodsTokens[g].map((t) => ({ ...t }));
  const bonusStacks = {} as Record<BonusSize, string[]>;
  for (const s of BONUS_SIZES) bonusStacks[s] = r.bonusStacks[s].map((t) => t.id);

  return {
    phase: state.phase,
    round: {
      number: r.number,
      deckCount: r.deck.length,
      market: r.market.map((c) => ({ ...c })),
      discardCount: r.discard.length,
      discardTop: r.discard.length ? { ...r.discard[r.discard.length - 1] } : null,
      goodsTokens,
      bonusStacks,
      camelTokenAvailable: r.camelTokenAvailable,
      currentPlayer: r.currentPlayer,
      startingPlayer: r.startingPlayer,
      depletedTypes: depletedTypes(r),
    },
    me: {
      hand: me.hand.map((c) => ({ ...c })),
      herd: me.herd.map((c) => ({ ...c })),
      goodsTokens: me.goodsTokens.map((t) => ({ ...t })),
      bonusTokens: me.bonusTokens.map((t) => ({ ...t })),
    },
    opponent: {
      handCount: opp.hand.length,
      herdHint: herdHint(opp.herd.length),
      goodsTokens: opp.goodsTokens.map((t) => ({ ...t })),
      bonusTokens: opp.bonusTokens.map((t) => ({ id: t.id, size: t.size, value: null })),
    },
    seals: [state.seals[0], state.seals[1]],
    // Results are revealed in full once a round has ended.
    results: structuredClone(state.results),
    winner: state.winner,
    log: state.log.slice(-120).map((e) => ({ ...e })),
    lastEvent: state.lastEvent ? { ...state.lastEvent } : null,
    version: state.version,
  };
}
