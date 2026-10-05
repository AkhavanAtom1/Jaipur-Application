import type { Card, CardType, GameAction, PlayerIndex } from '../../shared/types.ts';
import { GOODS, HAND_LIMIT, isPrecious } from '../../shared/constants.ts';
import { validateAction } from '../game/engine.ts';
import type { Rng } from '../game/rng.ts';
import type { GameState } from '../game/state.ts';

let n = 0;
export const card = (type: CardType): Card => ({ id: `t${n++}`, type });
export const cards = (...types: CardType[]) => types.map(card);

/** Picks a random legal action; used by the fuzz/simulation tests. */
export function randomLegalAction(state: GameState, rng: Rng): GameAction {
  const r = state.round;
  const p = r.currentPlayer as PlayerIndex;
  const me = r.players[p];
  const candidates: GameAction[] = [];
  const goodsInMarket = r.market.filter((c) => c.type !== 'camel');
  if (me.hand.length < HAND_LIMIT) for (const c of goodsInMarket) candidates.push({ type: 'takeGood', cardId: c.id });
  if (r.market.some((c) => c.type === 'camel')) candidates.push({ type: 'takeCamels' });
  for (const g of GOODS) {
    const mine = me.hand.filter((c) => c.type === g);
    const min = isPrecious(g) ? 2 : 1;
    for (let k = min; k <= mine.length; k++) candidates.push({ type: 'sell', cardIds: mine.slice(0, k).map((c) => c.id) });
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const take = goodsInMarket.filter(() => rng() < 0.5).map((c) => c.id);
    if (take.length < 2) continue;
    const pool = [...me.hand].sort(() => rng() - 0.5);
    const give: string[] = [];
    let camels = 0;
    for (let i = 0; i < take.length; i++) {
      if (camels < me.herd.length && rng() < 0.4) camels++;
      else if (pool.length) give.push(pool.pop()!.id);
      else camels++;
    }
    candidates.push({ type: 'exchange', takeIds: take, giveIds: give, giveCamels: camels });
  }
  const legal = candidates.filter((a) => validateAction(state, p, a).ok);
  if (!legal.length) throw new Error('No legal action found: engine invariant broken');
  return legal[Math.floor(rng() * legal.length)];
}
