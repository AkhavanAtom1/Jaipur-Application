import type { BonusSize, BonusToken, Card, CardType, GoodType, GoodsToken, PlayerIndex } from '../../shared/types.ts';
import {
  BONUS_SIZES, BONUS_TOKEN_VALUES, CARD_COUNTS, CARD_TYPES, GOODS, GOODS_TOKEN_VALUES,
  HAND_SIZE, INITIAL_MARKET_CAMELS,
} from '../../shared/constants.ts';
import { shuffle, type Rng } from './rng.ts';
import type { PlayerState, RoundState } from './state.ts';

const emptyPlayer = (): PlayerState => ({ hand: [], herd: [], goodsTokens: [], bonusTokens: [] });

/**
 * Official setup:
 * 1. 3 camels face up in the market. 2. Shuffle the other 52 cards.
 * 3. Deal 5 to each player. 4. 2 more cards to the market.
 * 5. Players move camels from hand to herd. 6. Goods tokens sorted descending,
 *    bonus tokens shuffled per stack, camel token beside them.
 */
export function createRound(number: number, startingPlayer: PlayerIndex, rng: Rng): RoundState {
  let seq = 0;
  // Ids are assigned after shuffling and are opaque: they never encode card type or position.
  const mk = (type: CardType): Card => ({ id: `r${number}c${(seq++).toString(36)}`, type });

  const market: Card[] = [];
  for (let i = 0; i < INITIAL_MARKET_CAMELS; i++) market.push(mk('camel'));

  const rest: CardType[] = [];
  for (const type of CARD_TYPES) {
    const n = CARD_COUNTS[type] - (type === 'camel' ? INITIAL_MARKET_CAMELS : 0);
    for (let i = 0; i < n; i++) rest.push(type);
  }
  const deck = shuffle(rest, rng).map(mk);

  const players: [PlayerState, PlayerState] = [emptyPlayer(), emptyPlayer()];
  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of players) p.hand.push(deck.shift()!);
  }
  market.push(deck.shift()!, deck.shift()!);

  for (const p of players) {
    p.herd = p.hand.filter((c) => c.type === 'camel');
    p.hand = p.hand.filter((c) => c.type !== 'camel');
  }

  const goodsTokens = {} as Record<GoodType, GoodsToken[]>;
  for (const good of GOODS) {
    goodsTokens[good] = GOODS_TOKEN_VALUES[good].map((value, i) => ({ id: `r${number}t${good}${i}`, good, value }));
  }

  const bonusStacks = {} as Record<BonusSize, BonusToken[]>;
  for (const size of BONUS_SIZES) {
    bonusStacks[size] = shuffle(BONUS_TOKEN_VALUES[size], rng).map((value, i) => ({ id: `r${number}b${size}n${i}`, size, value }));
  }

  return {
    number,
    deck,
    market,
    discard: [],
    goodsTokens,
    bonusStacks,
    camelTokenAvailable: true,
    players,
    currentPlayer: startingPlayer,
    startingPlayer,
    endReason: null,
  };
}
