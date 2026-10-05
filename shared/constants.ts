import type { BonusSize, CardType, GoodType } from './types.ts';

/**
 * Official Jaipur component data (Space Cowboys rulebook, 2025 edition):
 * 55 cards, 38 goods tokens, 18 bonus tokens, 1 camel token, 3 Seals of Excellence.
 */
export const GOODS: readonly GoodType[] = ['diamond', 'gold', 'silver', 'cloth', 'spice', 'leather'];
export const PRECIOUS_GOODS: readonly GoodType[] = ['diamond', 'gold', 'silver'];
export const CARD_TYPES: readonly CardType[] = [...GOODS, 'camel'];

export const CARD_COUNTS: Readonly<Record<CardType, number>> = {
  diamond: 6,
  gold: 6,
  silver: 6,
  cloth: 8,
  spice: 8,
  leather: 10,
  camel: 11,
};

/** Goods token values, top of the stack first (stacks are sorted in descending order). */
export const GOODS_TOKEN_VALUES: Readonly<Record<GoodType, readonly number[]>> = {
  diamond: [7, 7, 5, 5, 5],
  gold: [6, 6, 5, 5, 5],
  silver: [5, 5, 5, 5, 5],
  cloth: [5, 3, 3, 2, 2, 1, 1],
  spice: [5, 3, 3, 2, 2, 1, 1],
  leather: [4, 3, 2, 1, 1, 1, 1, 1, 1],
};

export const BONUS_SIZES: readonly BonusSize[] = [3, 4, 5];

/** Bonus token values per stack; each stack is shuffled separately and kept face down. */
export const BONUS_TOKEN_VALUES: Readonly<Record<BonusSize, readonly number[]>> = {
  3: [3, 3, 2, 2, 2, 1, 1],
  4: [6, 6, 5, 5, 4, 4],
  5: [10, 10, 9, 8, 8],
};

export const BONUS_RANGES: Readonly<Record<BonusSize, string>> = { 3: '1-3', 4: '4-6', 5: '8-10' };

export const HAND_LIMIT = 7;
export const HAND_SIZE = 5;
export const MARKET_SIZE = 5;
export const INITIAL_MARKET_CAMELS = 3;
export const CAMEL_TOKEN_VALUE = 5;
export const MIN_PRECIOUS_SALE = 2;
export const MIN_EXCHANGE = 2;
export const DEPLETED_TYPES_TO_END = 3;
export const SEALS_TO_WIN = 2;
export const TOTAL_SEALS = 3;

export function isPrecious(good: CardType): boolean {
  return (PRECIOUS_GOODS as readonly string[]).includes(good);
}

export const CARD_LABELS: Readonly<Record<CardType, { one: string; many: string }>> = {
  diamond: { one: 'Diamond', many: 'Diamonds' },
  gold: { one: 'Gold', many: 'Gold' },
  silver: { one: 'Silver', many: 'Silver' },
  cloth: { one: 'Cloth', many: 'Cloth' },
  spice: { one: 'Spice', many: 'Spices' },
  leather: { one: 'Leather', many: 'Leather' },
  camel: { one: 'Camel', many: 'Camels' },
};

export function cardLabel(type: CardType, count = 1): string {
  return count === 1 ? CARD_LABELS[type].one : CARD_LABELS[type].many;
}
