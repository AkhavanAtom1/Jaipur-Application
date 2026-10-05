import type { Card, PublicRoundView } from '../../../shared/types.ts';
import { CardView } from './CardView.tsx';

interface Props {
  round: PublicRoundView;
  selected: string[];
  dimmed: (c: Card) => boolean;
  onCardClick: (c: Card) => void;
  myTurn: boolean;
}

export function Market({ round, selected, dimmed, onCardClick, myTurn }: Props) {
  const camels = round.market.filter((c) => c.type === 'camel').length;
  return (
    <section className={`market ${myTurn ? 'is-live' : ''}`} aria-label="Market">
      <div className="market__pile" data-anchor="deck">
        <div className="deck-stack" style={{ ['--depth' as string]: Math.min(6, Math.ceil(round.deckCount / 7)) }}>
          {round.deckCount > 0 ? <CardView faceDown /> : <div className="card card--empty">empty</div>}
        </div>
        <span className="pile-caption"><strong>{round.deckCount}</strong> in deck</span>
      </div>

      <div className="market__cards">
        <div className="market__label">
          <h2 className="eyebrow">The market</h2>
          <span className="market__meta">{camels ? `${camels} camel${camels === 1 ? '' : 's'}` : 'no camels'}</span>
        </div>
        <div className="market__row">
          {round.market.map((c) => (
            <CardView key={c.id} card={c} selected={selected.includes(c.id)} dimmed={dimmed(c)} onClick={() => onCardClick(c)} />
          ))}
        </div>
      </div>

      <div className="market__pile" data-anchor="discard">
        <div className="discard-stack">
          {round.discardTop ? <CardView card={round.discardTop} flip={false} className="card--discard" /> : <div className="card card--empty">discard</div>}
        </div>
        <span className="pile-caption"><strong>{round.discardCount}</strong> sold</span>
      </div>
    </section>
  );
}
