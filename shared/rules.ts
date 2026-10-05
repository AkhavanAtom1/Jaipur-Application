/**
 * Pure rule checks shared by server and client.
 *
 * The SERVER calls these to decide legality (authoritative).
 * The CLIENT calls the same functions only to pre-validate the UI
 * (enable/disable buttons, explain why). It never decides outcomes.
 */
import type { BonusSize, Card, GoodType } from './types.ts';
import { HAND_LIMIT, MIN_EXCHANGE, MIN_PRECIOUS_SALE, cardLabel, isPrecious } from './constants.ts';

export type Check = { ok: true } | { ok: false; reason: string };

const OK: Check = { ok: true };
const fail = (reason: string): Check => ({ ok: false, reason });
const hasDuplicates = (ids: readonly string[]) => new Set(ids).size !== ids.length;

export function checkTakeGood(market: readonly Card[], hand: readonly Card[], cardId: string): Check {
  const card = market.find((c) => c.id === cardId);
  if (!card) return fail('That card is not in the market.');
  if (card.type === 'camel') return fail('Camels are never taken one at a time: take them all.');
  if (hand.length >= HAND_LIMIT) return fail(`Your hand is full (${HAND_LIMIT} cards). Sell or exchange instead.`);
  return OK;
}

export function checkTakeCamels(market: readonly Card[]): Check {
  return market.some((c) => c.type === 'camel') ? OK : fail('There are no camels in the market.');
}

export function checkExchange(
  market: readonly Card[],
  hand: readonly Card[],
  herd: readonly Card[],
  takeIds: readonly string[],
  giveIds: readonly string[],
  giveCamels: number,
): Check {
  if (!Number.isInteger(giveCamels) || giveCamels < 0) return fail('Invalid number of camels.');
  if (hasDuplicates(takeIds) || hasDuplicates(giveIds)) return fail('Each card can only be chosen once.');
  const taken = takeIds.map((id) => market.find((c) => c.id === id));
  if (taken.some((c) => !c)) return fail('Some chosen cards are not in the market.');
  if (taken.some((c) => c!.type === 'camel')) return fail('An exchange takes goods only. Camels are taken with "Take camels".');
  const given = giveIds.map((id) => hand.find((c) => c.id === id));
  if (given.some((c) => !c)) return fail('Some cards to give back are not in your hand.');
  if (giveCamels > herd.length) return fail(`You only have ${herd.length} camel${herd.length === 1 ? '' : 's'}.`);
  if (takeIds.length < MIN_EXCHANGE) return fail(`An exchange always involves at least ${MIN_EXCHANGE} cards for ${MIN_EXCHANGE}.`);
  const giveCount = giveIds.length + giveCamels;
  if (giveCount !== takeIds.length) {
    return fail(`Give back exactly ${takeIds.length} cards (hand cards and/or camels). Chosen: ${giveCount}.`);
  }
  const takenTypes = new Set(taken.map((c) => c!.type));
  const clash = given.find((c) => takenTypes.has(c!.type));
  if (clash) return fail(`The same goods can't be taken and given back (${cardLabel(clash.type)}).`);
  const after = hand.length - giveIds.length + takeIds.length;
  if (after > HAND_LIMIT) return fail(`That leaves ${after} cards in hand; the limit is ${HAND_LIMIT}.`);
  return OK;
}

export function checkSell(hand: readonly Card[], cardIds: readonly string[]): Check {
  if (cardIds.length === 0) return fail('Choose the cards you want to sell.');
  if (hasDuplicates(cardIds)) return fail('Each card can only be chosen once.');
  const cards = cardIds.map((id) => hand.find((c) => c.id === id));
  if (cards.some((c) => !c)) return fail('Some of those cards are not in your hand.');
  const type = cards[0]!.type;
  if (type === 'camel') return fail('Camels have no sale value.');
  if (cards.some((c) => c!.type !== type)) return fail('You can only sell one type of goods per turn.');
  if (isPrecious(type) && cards.length < MIN_PRECIOUS_SALE) {
    return fail(`${cardLabel(type, 2)} must be sold at least ${MIN_PRECIOUS_SALE} at a time.`);
  }
  return OK;
}

export function bonusSizeFor(count: number): BonusSize | null {
  if (count >= 5) return 5;
  if (count === 4) return 4;
  if (count === 3) return 3;
  return null;
}

/** Goods type of a (valid) sale selection. */
export function saleGood(hand: readonly Card[], cardIds: readonly string[]): GoodType | null {
  const card = hand.find((c) => c.id === cardIds[0]);
  return card && card.type !== 'camel' ? card.type : null;
}
