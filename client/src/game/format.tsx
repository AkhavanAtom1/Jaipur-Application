import type { ReactNode } from 'react';
import type { CardType, LogEntry, PlayerIndex, RoundEndReason, SealDecider } from '../../../shared/types.ts';
import { cardLabel } from '../../../shared/constants.ts';

export const REASON_TEXT: Record<RoundEndReason, string> = {
  tokens: 'three goods sold out',
  deck: 'the deck could not refill the market',
};

export const DECIDER_TEXT: Record<SealDecider, string> = {
  rupees: 'most rupees',
  bonusCount: 'tie on rupees, more bonus tokens',
  goodsCount: 'tie on rupees and bonus tokens, more goods tokens',
  unbroken: 'a perfect tie: no seal awarded',
};

function summarize(types: CardType[]): string {
  const counts = new Map<CardType, number>();
  types.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  return [...counts].map(([t, n]) => `${n} ${cardLabel(t, n)}`).join(', ');
}

export function formatLog(e: LogEntry, name: (p: PlayerIndex) => string): { text: ReactNode; tone: string } {
  switch (e.kind) {
    case 'roundStart': return { text: <>Round {e.round} begins. <b>{name(e.starter)}</b> starts.</>, tone: 'system' };
    case 'takeGood': return { text: <><b>{name(e.player)}</b> took 1 {cardLabel(e.good)}</>, tone: 'take' };
    case 'takeCamels': return { text: <><b>{name(e.player)}</b> took all {e.count} camel{e.count === 1 ? '' : 's'}</>, tone: 'camel' };
    case 'exchange': return { text: <><b>{name(e.player)}</b> exchanged {e.took.length} cards: took {summarize(e.took)}, gave {summarize(e.gave)}</>, tone: 'swap' };
    case 'sell': return {
      text: <><b>{name(e.player)}</b> sold {e.count} {cardLabel(e.good, e.count)} for {e.rupees}₹{e.bonus ? <> + a {e.bonus}-card bonus</> : null}</>,
      tone: 'sell',
    };
    case 'roundEnd': return { text: <>Round {e.round} ended: {REASON_TEXT[e.reason]}.</>, tone: 'system' };
    case 'camelToken': return { text: e.player === null ? <>Herds tied: nobody gets the camel token.</> : <><b>{name(e.player)}</b> has the largest herd (+5₹)</>, tone: 'camel' };
    case 'seal': return { text: e.player === null ? <>{DECIDER_TEXT.unbroken}</> : <><b>{name(e.player)}</b> received a Seal of Excellence</>, tone: 'seal' };
    case 'gameEnd': return { text: <><b>{name(e.winner)}</b> is the Maharaja's trader!</>, tone: 'seal' };
  }
}
