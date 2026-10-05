import type { PlayerIndex, RoomView, RoundResult, ScoreBreakdown } from '../../../shared/types.ts';
import { GOODS, SEALS_TO_WIN } from '../../../shared/constants.ts';
import { DECIDER_TEXT, REASON_TEXT } from '../game/format.tsx';
import { useCountUp } from '../hooks/useCountUp.ts';
import { SealGlyph } from './Icons.tsx';
import { BonusTokenChip, CamelToken, GoodsTokenChip } from './Token.tsx';

interface Props {
  view: RoomView;
  result: RoundResult;
  onContinue: () => void;
  onLeave: () => void;
  onPeek: () => void;
}

function Column({ name, s, sealed, camel, you, seals, delay }: { name: string; s: ScoreBreakdown; sealed: boolean; camel: boolean; you: boolean; seals: number; delay: number }) {
  const total = useCountUp(s.total, 1400);
  return (
    <div className={`tally ${sealed ? 'is-winner' : ''}`} style={{ ['--delay' as string]: `${delay}ms` }}>
      <h3 className="tally__name">{name}{you && <span className="muted"> (you)</span>}</h3>
      <div className="tally__lines">
        <div className="tally__line">
          <span>Goods <span className="muted">×{s.goodsTokenCount}</span></span>
          <span className="tally__chips">
            {GOODS.flatMap((g) => s.goodsTokens.filter((t) => t.good === g)).map((t) => <GoodsTokenChip key={t.id} id={t.id} good={t.good} value={t.value} size="sm" flip={false} />)}
          </span>
          <b>{s.goods}</b>
        </div>
        <div className="tally__line">
          <span>Bonus <span className="muted">×{s.bonusTokenCount}</span></span>
          <span className="tally__chips">{s.bonusTokens.map((t) => <BonusTokenChip key={t.id} id={t.id} size={t.size} value={t.value} small flip={false} />)}</span>
          <b>{s.bonus}</b>
        </div>
        <div className="tally__line">
          <span>Camels <span className="muted">×{s.camels}</span></span>
          <span className="tally__chips">{camel && <CamelToken small />}</span>
          <b>{s.camel}</b>
        </div>
      </div>
      <div className="tally__total"><span>Total</span><strong>{total}₹</strong></div>
      <div className="tally__seals">
        {Array.from({ length: SEALS_TO_WIN }, (_, i) => (
          <SealGlyph key={i} filled={i < seals} className={sealed && i === seals - 1 ? 'seal-stamp' : ''} />
        ))}
      </div>
    </div>
  );
}

export function RoundSummary({ view, result, onContinue, onLeave, onPeek }: Props) {
  const game = view.game!;
  const over = game.phase === 'gameOver';
  const you = view.you;
  const name = (p: PlayerIndex) => view.players[p]?.name ?? `Player ${p + 1}`;
  const opp = (you === 0 ? 1 : 0) as PlayerIndex;
  const iWon = result.sealWinner === you;
  const opponentGone = !!view.players[opp]?.left;
  const ready = view.ready[you];
  const oppReady = view.ready[opp];

  const title = over
    ? game.winner === you ? 'You are the Maharaja’s trader' : `${name(game.winner!)} wins the game`
    : result.sealWinner === null ? 'A perfect tie' : iWon ? 'You earned a Seal of Excellence' : `${name(result.sealWinner)} takes the seal`;

  return (
    <div className="summary" role="dialog" aria-label={`Round ${result.round} summary`}>
      <div className="summary__panel">
        <p className="eyebrow">Round {result.round} · {REASON_TEXT[result.reason]}</p>
        <h2 className="summary__title">{title}</h2>
        <p className="summary__sub">Decided by {DECIDER_TEXT[result.decidedBy]}.</p>
        <div className="summary__cols">
          {([you, opp] as PlayerIndex[]).map((p, i) => (
            <Column key={p} name={name(p)} s={result.scores[p]} sealed={result.sealWinner === p} camel={result.camelWinner === p} you={p === you} seals={result.sealsAfter[p]} delay={i * 120} />
          ))}
        </div>
        <div className="summary__actions">
          <button type="button" className="btn btn--ghost" onClick={onPeek}>View board</button>
          {over && <button type="button" className="btn btn--ghost" onClick={onLeave}>Leave</button>}
          {opponentGone ? (
            <span className="muted">{name(opp)} left the room.</span>
          ) : (
            <button type="button" className="btn btn--primary" disabled={ready} onClick={onContinue}>
              {ready ? `Waiting for ${name(opp)}…` : over ? (oppReady ? 'Accept rematch' : 'Rematch') : oppReady ? `Start round ${result.round + 1}` : `Ready for round ${result.round + 1}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
