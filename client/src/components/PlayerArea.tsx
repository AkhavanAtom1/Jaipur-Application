import type { Card, GameView, RoomPlayerView } from '../../../shared/types.ts';
import { GOODS, HAND_LIMIT } from '../../../shared/constants.ts';
import { CardView } from './CardView.tsx';
import { PlayerTokens } from './PlayerTokens.tsx';
import { Score } from './Score.tsx';
import { Seals } from './Seals.tsx';

interface Props {
  game: GameView;
  player: RoomPlayerView | null;
  active: boolean;
  seals: number;
  selectedHand: string[];
  giveCamels: number;
  exchangeMode: boolean;
  handAfter: number | null;
  dimHand: (c: Card) => boolean;
  onHandClick: (c: Card) => void;
  onCamels: (n: number) => void;
}

const order = (c: Card) => GOODS.indexOf(c.type as (typeof GOODS)[number]);

export function PlayerArea(p: Props) {
  const { me } = p.game;
  const total = me.goodsTokens.reduce((s, t) => s + t.value, 0) + me.bonusTokens.reduce((s, t) => s + t.value, 0);
  const hand = [...me.hand].sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id));
  const after = p.handAfter ?? me.hand.length;
  const over = after > HAND_LIMIT;
  // Camels leave from the end of the herd; highlight those that would be given.
  const herdSel = new Set(me.herd.slice(me.herd.length - p.giveCamels).map((c) => c.id));

  return (
    <section className={`seat seat--me ${p.active ? 'is-active' : ''}`} aria-label="Your area">
      <div className="seat__id">
        <span className="presence presence--online" />
        <h2 className="seat__name">{p.player?.name ?? 'You'} <span className="muted">(you)</span></h2>
        <Seals count={p.seals} label="Your" />
      </div>

      <div className="seat__hand seat__hand--me">
        <div className="hand-head">
          <h3 className="eyebrow">Hand</h3>
          <span className={`limit ${over ? 'is-over' : after === HAND_LIMIT ? 'is-full' : ''}`} aria-live="polite">
            <span className="limit__pips" aria-hidden>
              {Array.from({ length: HAND_LIMIT }, (_, i) => (
                <i key={i} className={i < me.hand.length ? 'on' : i < after ? 'next' : ''} />
              ))}
            </span>
            {me.hand.length}/{HAND_LIMIT}
            {p.handAfter !== null && p.handAfter !== me.hand.length && <span className="limit__after"> → {p.handAfter}</span>}
          </span>
        </div>
        <div className="fan" data-anchor="my-hand">
          {hand.map((c) => (
            <CardView key={c.id} card={c} selected={p.selectedHand.includes(c.id)} dimmed={p.dimHand(c)} onClick={() => p.onHandClick(c)} />
          ))}
          {hand.length === 0 && <span className="fan__empty">Your hand is empty. Take goods from the market.</span>}
        </div>
      </div>

      <div className="seat__herd seat__herd--me" data-anchor="my-herd">
        <div className="hand-head">
          <h3 className="eyebrow">Herd</h3>
          <span className="herd-count">{me.herd.length} camel{me.herd.length === 1 ? '' : 's'}</span>
        </div>
        <div className="herd">
          {me.herd.map((c, i) => (
            <CardView key={c.id} card={c} size="sm" selected={herdSel.has(c.id)} style={{ ['--i' as string]: i }} className="herd__card" />
          ))}
          {me.herd.length === 0 && <span className="fan__empty">no camels</span>}
        </div>
        {p.exchangeMode && me.herd.length > 0 && (
          <div className="stepper" role="group" aria-label="Camels to give in the exchange">
            <button type="button" onClick={() => p.onCamels(Math.max(0, p.giveCamels - 1))} disabled={p.giveCamels === 0} aria-label="One camel fewer">−</button>
            <span><strong>{p.giveCamels}</strong> to give</span>
            <button type="button" onClick={() => p.onCamels(Math.min(me.herd.length, p.giveCamels + 1))} disabled={p.giveCamels >= me.herd.length} aria-label="One camel more">+</button>
          </div>
        )}
      </div>

      <div className="seat__purse">
        <PlayerTokens goods={me.goodsTokens} bonus={me.bonusTokens} anchor="my-purse" />
        <Score value={total} label="Your rupees" />
      </div>
    </section>
  );
}
