import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BonusSize, CardType, GoodType } from '../../shared/types.ts';
import { BONUS_TOKEN_VALUES, CARD_COUNTS, CARD_TYPES, GOODS, GOODS_TOKEN_VALUES } from '../../shared/constants.ts';
import { applyAction, createGame, createRematch, endRound, startNextRound, depletedTypes } from '../game/engine.ts';
import { seededRng } from '../game/rng.ts';
import { createRound } from '../game/setup.ts';
import { decideSeal, scorePlayer } from '../game/scoring.ts';
import type { GameState } from '../game/state.ts';
import { toGameView } from '../game/view.ts';
import { card, cards, randomLegalAction } from './helpers.ts';

const allCards = (s: GameState) => {
  const r = s.round;
  return [...r.deck, ...r.market, ...r.discard, ...r.players.flatMap((p) => [...p.hand, ...p.herd])];
};
const countBy = (types: CardType[]) => Object.fromEntries(CARD_TYPES.map((t) => [t, types.filter((x) => x === t).length]));
const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

/** A game with a hand-built, deterministic position for player 0. */
function rigged(opts: { hand?: CardType[]; herd?: CardType[]; market?: CardType[]; deck?: CardType[]; oppHand?: CardType[]; oppHerd?: CardType[] } = {}) {
  const s = createGame(seededRng(1), 0);
  const r = s.round;
  if (opts.hand) r.players[0].hand = cards(...opts.hand);
  if (opts.herd) r.players[0].herd = cards(...opts.herd);
  if (opts.oppHand) r.players[1].hand = cards(...opts.oppHand);
  if (opts.oppHerd) r.players[1].herd = cards(...opts.oppHerd);
  if (opts.market) r.market = cards(...opts.market);
  if (opts.deck) r.deck = cards(...opts.deck);
  return s;
}

test('deck composition: 55 cards with official counts, unique ids', () => {
  const s = createGame(seededRng(7));
  const all = allCards(s);
  assert.equal(all.length, 55);
  assert.deepEqual(countBy(all.map((c) => c.type)), CARD_COUNTS);
  assert.equal(new Set(all.map((c) => c.id)).size, 55);
});

test('setup: market of 5 with the 3 camels, hands of 5 split into hand/herd, 40 in deck', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const r = createRound(1, 0, seededRng(seed));
    assert.equal(r.market.length, 5);
    assert.ok(r.market.slice(0, 3).every((c) => c.type === 'camel'));
    assert.equal(r.deck.length, 40);
    for (const p of r.players) {
      assert.equal(p.hand.length + p.herd.length, 5);
      assert.ok(p.hand.every((c) => c.type !== 'camel'));
      assert.ok(p.herd.every((c) => c.type === 'camel'));
    }
  }
});

test('tokens: goods stacks sorted descending, bonus stacks shuffled with official values', () => {
  const r = createRound(1, 0, seededRng(3));
  let goodsCount = 0;
  for (const g of GOODS) {
    const values = r.goodsTokens[g].map((t) => t.value);
    assert.deepEqual(values, GOODS_TOKEN_VALUES[g]);
    assert.deepEqual(values, [...values].sort((a, b) => b - a));
    goodsCount += values.length;
  }
  assert.equal(goodsCount, 38);
  let bonusCount = 0;
  for (const size of [3, 4, 5] as BonusSize[]) {
    assert.deepEqual(sorted(r.bonusStacks[size].map((t) => t.value)), sorted(BONUS_TOKEN_VALUES[size]));
    bonusCount += r.bonusStacks[size].length;
  }
  assert.equal(bonusCount, 18);
  // Shuffling really happens across seeds
  const orders = new Set(Array.from({ length: 20 }, (_, i) => createRound(1, 0, seededRng(i + 100)).bonusStacks[5].map((t) => t.value).join()));
  assert.ok(orders.size > 1);
});

test('starting player is random for round 1', () => {
  const starters = new Set(Array.from({ length: 30 }, (_, i) => createGame(seededRng(i)).round.startingPlayer));
  assert.deepEqual([...starters].sort(), [0, 1]);
});

test('take one good: card to hand, market refilled from deck in the same slot, turn passes', () => {
  const s = rigged({ hand: ['cloth'], market: ['camel', 'diamond', 'gold', 'camel', 'leather'], deck: ['spice', 'silver'] });
  const target = s.round.market[1];
  const res = applyAction(s, 0, { type: 'takeGood', cardId: target.id });
  assert.deepEqual(res, { ok: true });
  assert.ok(s.round.players[0].hand.some((c) => c.id === target.id));
  assert.equal(s.round.market.length, 5);
  assert.equal(s.round.market[1].type, 'spice');
  assert.equal(s.round.deck.length, 1);
  assert.equal(s.round.currentPlayer, 1);
});

test('take one good: rejected with 7 cards in hand, and camels cannot be taken singly', () => {
  const s = rigged({ hand: ['cloth', 'cloth', 'cloth', 'spice', 'spice', 'leather', 'leather'], market: ['camel', 'diamond', 'gold', 'camel', 'leather'] });
  const r1 = applyAction(s, 0, { type: 'takeGood', cardId: s.round.market[1].id });
  assert.equal(r1.ok, false);
  s.round.players[0].hand.pop();
  const r2 = applyAction(s, 0, { type: 'takeGood', cardId: s.round.market[0].id });
  assert.equal(r2.ok, false);
  assert.equal(s.round.currentPlayer, 0);
});

test('take camels: all camels move to herd, market refilled, no hand limit impact', () => {
  const s = rigged({ hand: ['cloth', 'cloth', 'cloth', 'spice', 'spice', 'leather', 'leather'], herd: [], market: ['camel', 'diamond', 'camel', 'camel', 'leather'], deck: ['gold', 'gold', 'silver', 'silver'] });
  assert.equal(applyAction(s, 0, { type: 'takeCamels' }).ok, true);
  assert.equal(s.round.players[0].herd.length, 3);
  assert.deepEqual(s.round.market.map((c) => c.type), ['gold', 'diamond', 'gold', 'silver', 'leather']);
  const s2 = rigged({ market: ['diamond', 'gold', 'silver', 'cloth', 'leather'] });
  assert.equal(applyAction(s2, 0, { type: 'takeCamels' }).ok, false);
});

test('exchange: goods for a mix of hand goods and camels', () => {
  const s = rigged({ hand: ['leather', 'leather', 'cloth'], herd: ['camel', 'camel'], market: ['diamond', 'gold', 'silver', 'camel', 'spice'], deck: ['cloth'] });
  const r = s.round;
  const me = r.players[0];
  const take = [r.market[0].id, r.market[1].id, r.market[2].id];
  const res = applyAction(s, 0, { type: 'exchange', takeIds: take, giveIds: [me.hand[0].id, me.hand[1].id], giveCamels: 1 });
  assert.deepEqual(res, { ok: true });
  assert.deepEqual(me.hand.map((c) => c.type).sort(), ['cloth', 'diamond', 'gold', 'silver']);
  assert.equal(me.herd.length, 1);
  assert.deepEqual(r.market.map((c) => c.type), ['leather', 'leather', 'camel', 'camel', 'spice']);
  assert.equal(r.deck.length, 1, 'exchange does not draw');
});

test('exchange: illegal variants are rejected', () => {
  const base = () => rigged({ hand: ['leather', 'diamond', 'cloth', 'cloth', 'spice', 'spice'], herd: ['camel'], market: ['diamond', 'gold', 'silver', 'camel', 'leather'] });
  const tryEx = (f: (s: GameState) => { takeIds: string[]; giveIds: string[]; giveCamels: number }) => {
    const s = base();
    return applyAction(s, 0, { type: 'exchange', ...f(s) });
  };
  const m = (s: GameState, i: number) => s.round.market[i].id;
  const h = (s: GameState, i: number) => s.round.players[0].hand[i].id;
  // 1-for-1 is never allowed
  assert.equal(tryEx((s) => ({ takeIds: [m(s, 1)], giveIds: [h(s, 2)], giveCamels: 0 })).ok, false);
  // same type taken and returned (leather)
  assert.equal(tryEx((s) => ({ takeIds: [m(s, 4), m(s, 1)], giveIds: [h(s, 0), h(s, 2)], giveCamels: 0 })).ok, false);
  // same type: take diamond, give diamond
  assert.equal(tryEx((s) => ({ takeIds: [m(s, 0), m(s, 1)], giveIds: [h(s, 1), h(s, 2)], giveCamels: 0 })).ok, false);
  // cannot take camels in an exchange
  assert.equal(tryEx((s) => ({ takeIds: [m(s, 3), m(s, 1)], giveIds: [h(s, 2), h(s, 3)], giveCamels: 0 })).ok, false);
  // count mismatch
  assert.equal(tryEx((s) => ({ takeIds: [m(s, 1), m(s, 2)], giveIds: [h(s, 2)], giveCamels: 0 })).ok, false);
  // more camels than owned
  assert.equal(tryEx((s) => ({ takeIds: [m(s, 1), m(s, 2)], giveIds: [], giveCamels: 2 })).ok, false);
  // hand limit: 6 cards, give 1 camel + 1 card for 2 goods -> 7 ok; with 2 camels would be 8
  const ok = tryEx((s) => ({ takeIds: [m(s, 1), m(s, 2)], giveIds: [h(s, 2)], giveCamels: 1 }));
  assert.deepEqual(ok, { ok: true });
  const s = base();
  s.round.players[0].herd.push(card('camel'));
  assert.equal(applyAction(s, 0, { type: 'exchange', takeIds: [m(s, 1), m(s, 2)], giveIds: [], giveCamels: 2 }).ok, false);
});

test('sell: tokens from the top, bonus by size, one type only', () => {
  const s = rigged({ hand: ['silver', 'silver', 'silver', 'silver', 'cloth'] });
  const me = s.round.players[0];
  const ids = me.hand.filter((c) => c.type === 'silver').map((c) => c.id);
  assert.deepEqual(applyAction(s, 0, { type: 'sell', cardIds: ids }), { ok: true });
  assert.deepEqual(me.goodsTokens.map((t) => t.value), [5, 5, 5, 5]);
  assert.equal(me.bonusTokens.length, 1);
  assert.equal(me.bonusTokens[0].size, 4);
  assert.ok([4, 5, 6].includes(me.bonusTokens[0].value));
  assert.equal(s.round.goodsTokens.silver.length, 1);
  assert.equal(s.round.discard.length, 4);
  assert.deepEqual(me.hand.map((c) => c.type), ['cloth']);

  const s2 = rigged({ hand: ['cloth', 'cloth', 'cloth', 'cloth', 'cloth', 'cloth'] });
  applyAction(s2, 0, { type: 'sell', cardIds: s2.round.players[0].hand.map((c) => c.id) });
  assert.deepEqual(s2.round.players[0].goodsTokens.map((t) => t.value), [5, 3, 3, 2, 2, 1]);
  assert.equal(s2.round.players[0].bonusTokens[0].size, 5, '6 cards still takes the 5-card bonus');

  const s3 = rigged({ hand: ['cloth', 'spice'] });
  assert.equal(applyAction(s3, 0, { type: 'sell', cardIds: s3.round.players[0].hand.map((c) => c.id) }).ok, false);
  const s4 = rigged({ hand: ['leather'] });
  assert.equal(applyAction(s4, 0, { type: 'sell', cardIds: [s4.round.players[0].hand[0].id] }).ok, true, 'a single cheap good may be sold');
});

test('sell: diamonds, gold and silver need at least 2 cards, even with one token left', () => {
  for (const g of ['diamond', 'gold', 'silver'] as GoodType[]) {
    const s = rigged({ hand: [g, 'cloth'] });
    s.round.goodsTokens[g] = s.round.goodsTokens[g].slice(-1);
    assert.equal(applyAction(s, 0, { type: 'sell', cardIds: [s.round.players[0].hand[0].id] }).ok, false);
  }
});

test('token depletion: fewer tokens than cards still grants the bonus', () => {
  const s = rigged({ hand: ['leather', 'leather', 'leather', 'leather'] });
  s.round.goodsTokens.leather = s.round.goodsTokens.leather.slice(-2);
  applyAction(s, 0, { type: 'sell', cardIds: s.round.players[0].hand.map((c) => c.id) });
  assert.equal(s.round.players[0].goodsTokens.length, 2);
  assert.equal(s.round.players[0].bonusTokens.length, 1);
  assert.equal(s.round.goodsTokens.leather.length, 0);
});

test('round end: immediately when 3 goods token stacks are empty', () => {
  const s = rigged({ hand: ['cloth', 'cloth'] });
  s.round.goodsTokens.diamond = [];
  s.round.goodsTokens.gold = [];
  s.round.goodsTokens.cloth = s.round.goodsTokens.cloth.slice(-2);
  assert.equal(depletedTypes(s.round), 2);
  applyAction(s, 0, { type: 'sell', cardIds: s.round.players[0].hand.map((c) => c.id) });
  assert.equal(s.round.endReason, 'tokens');
  assert.notEqual(s.phase, 'playing');
  assert.equal(applyAction(s, 1, { type: 'takeCamels' }).ok, false, 'no actions after round end');
});

test('round end: when the deck cannot refill the market', () => {
  const s = rigged({ hand: ['cloth'], market: ['camel', 'camel', 'gold', 'silver', 'spice'], deck: ['leather'] });
  applyAction(s, 0, { type: 'takeCamels' });
  assert.equal(s.round.endReason, 'deck');
  // An exact refill that empties the deck does not end the round yet
  const s2 = rigged({ hand: ['cloth'], market: ['camel', 'diamond', 'gold', 'silver', 'spice'], deck: ['leather'] });
  applyAction(s2, 0, { type: 'takeGood', cardId: s2.round.market[1].id });
  assert.equal(s2.phase, 'playing');
  assert.equal(s2.round.deck.length, 0);
  applyAction(s2, 1, { type: 'takeCamels' });
  assert.equal(s2.round.endReason, 'deck');
});

test('camel majority: +5 to the larger herd, nobody on a tie', () => {
  const s = rigged({ herd: ['camel', 'camel', 'camel'], oppHerd: ['camel'] });
  endRound(s, 'deck');
  const res = s.results[0];
  assert.equal(res.camelWinner, 0);
  assert.equal(res.scores[0].camel, 5);
  assert.equal(res.scores[1].camel, 0);
  const t = rigged({ herd: ['camel', 'camel'], oppHerd: ['camel', 'camel'] });
  endRound(t, 'deck');
  assert.equal(t.results[0].camelWinner, null);
  assert.equal(t.results[0].scores[0].camel + t.results[0].scores[1].camel, 0);
});

test('seal tie-breaks: rupees, then bonus token count, then goods token count', () => {
  const mk = (goods: number[], bonus: number[]) =>
    scorePlayer({ hand: [], herd: [], goodsTokens: goods.map((v, i) => ({ id: `g${i}`, good: 'cloth', value: v })), bonusTokens: bonus.map((v, i) => ({ id: `b${i}`, size: 3, value: v })) }, false);
  assert.deepEqual(decideSeal(mk([5], []), mk([3], [])), { winner: 0, decidedBy: 'rupees' });
  assert.deepEqual(decideSeal(mk([5, 1], []), mk([3], [3])), { winner: 1, decidedBy: 'bonusCount' });
  assert.deepEqual(decideSeal(mk([2, 2, 2], [1]), mk([5], [2])), { winner: 0, decidedBy: 'goodsCount' });
  assert.deepEqual(decideSeal(mk([3, 3], [1]), mk([5, 1], [1])), { winner: null, decidedBy: 'unbroken' });
});

test('seals, next round starter is the loser, game ends at 2 seals', () => {
  const s = createGame(seededRng(5), 0);
  s.round.players[0].goodsTokens.push({ id: 'x', good: 'diamond', value: 7 });
  endRound(s, 'deck');
  assert.deepEqual(s.seals, [1, 0]);
  assert.equal(s.phase, 'roundOver');
  assert.equal(startNextRound(s, seededRng(6)).ok, true);
  assert.equal(s.round.number, 2);
  assert.equal(s.round.startingPlayer, 1, 'loser of round 1 starts round 2');
  assert.equal(s.round.currentPlayer, 1);
  assert.equal(allCards(s).length, 55, 'full new setup');
  s.round.players[0].goodsTokens.push({ id: 'y', good: 'diamond', value: 7 });
  endRound(s, 'tokens');
  assert.deepEqual(s.seals, [2, 0]);
  assert.equal(s.phase, 'gameOver');
  assert.equal(s.winner, 0);
  assert.equal(startNextRound(s).ok, false);
  const re = createRematch(s, seededRng(9));
  assert.equal(re.phase, 'playing');
  assert.deepEqual(re.seals, [0, 0]);
  assert.equal(re.round.startingPlayer, 1);
  assert.ok(re.version > s.version);
});

test('turn enforcement and malformed input', () => {
  const s = createGame(seededRng(2), 0);
  assert.equal(applyAction(s, 1, { type: 'takeCamels' }).ok, false);
  for (const bad of [null, 42, 'sell', {}, { type: 'hack' }, { type: 'sell', cardIds: 'x' }, { type: 'exchange', takeIds: [], giveIds: [], giveCamels: -1 }, { type: 'takeGood' }]) {
    assert.equal(applyAction(s, 0, bad).ok, false);
  }
  assert.equal(s.version, 1, 'rejected actions change nothing');
  assert.equal(applyAction(s, 0, { type: 'takeCamels' }).ok, true);
  assert.equal(applyAction(s, 0, { type: 'takeCamels' }).ok, false);
});

test('player views never include hidden information', () => {
  const s = createGame(seededRng(11), 0);
  s.round.players[1].bonusTokens.push({ id: 'secret-bonus', size: 5, value: 10 });
  const v = toGameView(s, 0);
  const json = JSON.stringify(v);
  for (const c of s.round.players[1].hand) assert.ok(!json.includes(`"${c.id}"`), 'opponent hand id leaked');
  for (const c of s.round.deck) assert.ok(!json.includes(`"${c.id}"`), 'deck card leaked');
  assert.equal(v.opponent.handCount, s.round.players[1].hand.length);
  assert.equal(v.opponent.bonusTokens[0].value, null);
  assert.ok(!('herd' in v.opponent));
  for (const size of [3, 4, 5] as BonusSize[]) assert.ok(!json.includes(`"value":${s.round.bonusStacks[size][0].value},"id"`));
  assert.ok(!JSON.stringify(v.round.bonusStacks).includes('value'));
});

test('simulation: 300 random full games keep every invariant and always finish', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seededRng(seed);
    const s = createGame(rng);
    let turns = 0;
    while (s.phase !== 'gameOver') {
      if (s.phase === 'roundOver') { startNextRound(s, rng); continue; }
      const p = s.round.currentPlayer;
      const res = applyAction(s, p, randomLegalAction(s, rng));
      assert.equal(res.ok, true);
      const all = allCards(s);
      assert.equal(all.length, 55);
      assert.deepEqual(countBy(all.map((c) => c.type)), CARD_COUNTS);
      assert.ok(s.round.players.every((pl) => pl.hand.length <= 7 && pl.hand.every((c) => c.type !== 'camel')));
      const tokens = GOODS.reduce((n, g) => n + s.round.goodsTokens[g].length, 0) + s.round.players.reduce((n, pl) => n + pl.goodsTokens.length, 0);
      assert.equal(tokens, 38);
      if (s.phase === 'playing') assert.equal(s.round.market.length, 5);
      assert.ok(++turns < 5000);
    }
    assert.ok(s.seals[s.winner!] === 2);
    assert.ok(s.results.length >= 2);
  }
});
