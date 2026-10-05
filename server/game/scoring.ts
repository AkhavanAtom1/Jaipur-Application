import type { PlayerIndex, ScoreBreakdown, SealDecider } from '../../shared/types.ts';
import { CAMEL_TOKEN_VALUE } from '../../shared/constants.ts';
import type { PlayerState, RoundState } from './state.ts';

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/** Camel token: most camels takes it; a tie means neither player does. */
export function camelMajority(round: RoundState): PlayerIndex | null {
  const [a, b] = round.players.map((p) => p.herd.length);
  if (a === b) return null;
  return a > b ? 0 : 1;
}

export function scorePlayer(p: PlayerState, hasCamelToken: boolean): ScoreBreakdown {
  const goods = sum(p.goodsTokens.map((t) => t.value));
  const bonus = sum(p.bonusTokens.map((t) => t.value));
  const camel = hasCamelToken ? CAMEL_TOKEN_VALUE : 0;
  return {
    goods,
    bonus,
    camel,
    total: goods + bonus + camel,
    goodsTokenCount: p.goodsTokens.length,
    bonusTokenCount: p.bonusTokens.length,
    camels: p.herd.length,
    goodsTokens: p.goodsTokens.slice(),
    bonusTokens: p.bonusTokens.slice(),
  };
}

/**
 * Seal of Excellence: richest trader. Ties -> most bonus tokens -> most goods tokens.
 * The rulebook defines nothing beyond that; a perfect tie awards no seal ("unbroken").
 */
export function decideSeal(a: ScoreBreakdown, b: ScoreBreakdown): { winner: PlayerIndex | null; decidedBy: SealDecider } {
  const steps: [SealDecider, number, number][] = [
    ['rupees', a.total, b.total],
    ['bonusCount', a.bonusTokenCount, b.bonusTokenCount],
    ['goodsCount', a.goodsTokenCount, b.goodsTokenCount],
  ];
  for (const [decidedBy, x, y] of steps) {
    if (x !== y) return { winner: x > y ? 0 : 1, decidedBy };
  }
  return { winner: null, decidedBy: 'unbroken' };
}
