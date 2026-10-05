/**
 * Turns the player's current selection into a proposed action + an
 * explanation. Purely advisory: the server re-validates everything.
 */
import type { BonusSize, Card, GameAction, GameView, GoodType } from '../../../shared/types.ts';
import { HAND_LIMIT, cardLabel } from '../../../shared/constants.ts';
import { bonusSizeFor, checkExchange, checkSell, checkTakeCamels, checkTakeGood, type Check } from '../../../shared/rules.ts';

export interface Selection {
  market: string[];
  hand: string[];
  camels: number;
}

export type Intent =
  | { kind: 'idle' }
  | { kind: 'takeCamels'; count: number; check: Check; action: GameAction }
  | { kind: 'takeGood'; card: Card; check: Check; action: GameAction; handAfter: number }
  | { kind: 'exchange'; take: Card[]; give: Card[]; camels: number; check: Check; action: GameAction; handAfter: number; need: number }
  | { kind: 'sell'; cards: Card[]; good: GoodType | null; check: Check; action: GameAction; rupees: number; tokens: number; bonus: BonusSize | null };

export const EMPTY_SELECTION: Selection = { market: [], hand: [], camels: 0 };

export function computeIntent(game: GameView, sel: Selection): Intent {
  const { market } = game.round;
  const { hand, herd } = game.me;
  const mCards = sel.market.map((id) => market.find((c) => c.id === id)).filter((c): c is Card => !!c);
  const hCards = sel.hand.map((id) => hand.find((c) => c.id === id)).filter((c): c is Card => !!c);

  if (!mCards.length && !hCards.length && !sel.camels) return { kind: 'idle' };

  if (mCards.length && mCards.every((c) => c.type === 'camel')) {
    return { kind: 'takeCamels', count: mCards.length, check: checkTakeCamels(market), action: { type: 'takeCamels' } };
  }

  if (!mCards.length) {
    if (!hCards.length) return { kind: 'idle' };
    const good = hCards[0].type === 'camel' ? null : (hCards[0].type as GoodType);
    const check = checkSell(hand, sel.hand);
    const stack = good ? game.round.goodsTokens[good] : [];
    const taken = stack.slice(0, hCards.length);
    const size = bonusSizeFor(hCards.length);
    return {
      kind: 'sell', cards: hCards, good, check,
      action: { type: 'sell', cardIds: sel.hand },
      rupees: taken.reduce((s, t) => s + t.value, 0),
      tokens: taken.length,
      bonus: size && game.round.bonusStacks[size].length ? size : null,
    };
  }

  if (mCards.length === 1 && !hCards.length && !sel.camels) {
    return {
      kind: 'takeGood', card: mCards[0], check: checkTakeGood(market, hand, mCards[0].id),
      action: { type: 'takeGood', cardId: mCards[0].id }, handAfter: hand.length + 1,
    };
  }

  const check = checkExchange(market, hand, herd, sel.market, sel.hand, sel.camels);
  return {
    kind: 'exchange', take: mCards, give: hCards, camels: sel.camels, check,
    action: { type: 'exchange', takeIds: sel.market, giveIds: sel.hand, giveCamels: sel.camels },
    handAfter: hand.length - hCards.length + mCards.length,
    need: mCards.length - hCards.length - sel.camels,
  };
}

export function intentLabel(intent: Intent): string {
  switch (intent.kind) {
    case 'idle': return '';
    case 'takeCamels': return `Take ${intent.count} camel${intent.count === 1 ? '' : 's'}`;
    case 'takeGood': return `Take ${cardLabel(intent.card.type)}`;
    case 'exchange': return `Exchange ${intent.take.length} for ${intent.give.length + intent.camels}`;
    case 'sell': return intent.good ? `Sell ${intent.cards.length} ${cardLabel(intent.good, intent.cards.length)}` : 'Sell';
  }
}

export { HAND_LIMIT };
