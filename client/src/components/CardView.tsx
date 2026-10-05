import type { CSSProperties } from 'react';
import type { Card } from '../../../shared/types.ts';
import { CARD_LABELS } from '../../../shared/constants.ts';
import { GoodIcon } from './Icons.tsx';

interface Props {
  card?: Card | null;
  faceDown?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  flip?: boolean;
  title?: string;
  style?: CSSProperties;
  className?: string;
}

const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

export function CardView({ card, faceDown, selected, dimmed, onClick, size = 'md', flip = true, title, style, className }: Props) {
  if (faceDown || !card) {
    return (
      <div className={cx('card', 'card--back', size === 'sm' && 'card--sm', className)} style={style} aria-hidden>
        <span className="card__back-art" />
      </div>
    );
  }
  const label = CARD_LABELS[card.type];
  return (
    <button
      type="button"
      className={cx('card', `card--${card.type}`, size === 'sm' && 'card--sm', selected && 'is-selected', dimmed && 'is-dimmed', onClick ? 'is-interactive' : 'is-static', className)}
      data-flip={flip ? card.id : undefined}
      data-kind={card.type === 'camel' ? 'camel' : 'good'}
      onClick={onClick}
      tabIndex={onClick ? 0 : -1}
      aria-pressed={onClick ? !!selected : undefined}
      aria-label={label.one}
      title={title ?? label.one}
      style={style}
    >
      <span className="card__face">
        <span className="card__pattern" />
        <span className="card__corner"><GoodIcon type={card.type} /></span>
        <span className="card__art"><GoodIcon type={card.type} /></span>
        <span className="card__name">{label.many}</span>
      </span>
      {selected && <span className="card__tick" aria-hidden>✓</span>}
    </button>
  );
}
