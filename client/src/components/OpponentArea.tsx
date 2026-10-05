import type { GameView, HerdHint, RoomPlayerView } from '../../../shared/types.ts';
import { HAND_LIMIT } from '../../../shared/constants.ts';
import { CardView } from './CardView.tsx';
import { PlayerTokens } from './PlayerTokens.tsx';
import { Score } from './Score.tsx';
import { Seals } from './Seals.tsx';

const HERD_TEXT: Record<HerdHint, string> = { none: 'No camels', few: 'A few camels', herd: 'A herd', caravan: 'A caravan' };
const HERD_DEPTH: Record<HerdHint, number> = { none: 0, few: 2, herd: 4, caravan: 6 };

export function OpponentArea({ game, player, active, seals }: { game: GameView; player: RoomPlayerView | null; active: boolean; seals: number }) {
  const opp = game.opponent;
  const visible = opp.goodsTokens.reduce((s, t) => s + t.value, 0);
  const status = !player ? '' : player.left ? 'left' : player.connected ? 'online' : 'reconnecting';
  return (
    <section className={`seat seat--opponent ${active ? 'is-active' : ''}`} aria-label="Opponent">
      <div className="seat__id">
        <span className={`presence presence--${status}`} title={status} />
        <h2 className="seat__name">{player?.name ?? 'Opponent'}</h2>
        {active && <span className="thinking">choosing<i>.</i><i>.</i><i>.</i></span>}
        <Seals count={seals} label={player?.name} />
      </div>

      <div className="seat__hand" data-anchor="opp-hand" aria-label={`${opp.handCount} cards in hand`}>
        <div className="fan fan--backs">
          {Array.from({ length: opp.handCount }, (_, i) => (
            <CardView key={i} faceDown size="sm" style={{ ['--i' as string]: i - (opp.handCount - 1) / 2 }} />
          ))}
          {opp.handCount === 0 && <span className="muted">empty hand</span>}
        </div>
        <span className="seat__count">{opp.handCount}/{HAND_LIMIT}</span>
      </div>

      <div className="seat__herd" data-anchor="opp-herd" title="The exact size of an opponent's herd is not public">
        <div className="herd-hint" style={{ ['--depth' as string]: HERD_DEPTH[opp.herdHint] }}>
          {opp.herdHint !== 'none' && <CardView card={{ id: 'opp-herd', type: 'camel' }} size="sm" flip={false} />}
        </div>
        <span className="seat__caption">{HERD_TEXT[opp.herdHint]}</span>
      </div>

      <div className="seat__purse">
        <PlayerTokens goods={opp.goodsTokens} bonus={opp.bonusTokens} anchor="opp-purse" />
        <Score value={visible} suffix={opp.bonusTokens.length ? `+${opp.bonusTokens.length} bonus` : undefined} label="Opponent visible rupees" />
      </div>
    </section>
  );
}
