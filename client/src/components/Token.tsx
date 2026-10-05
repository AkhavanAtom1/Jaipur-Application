import type { BonusSize, GoodType } from '../../../shared/types.ts';
import { GoodIcon } from './Icons.tsx';

export function GoodsTokenChip({ id, good, value, size = 'md', flip = true }: { id: string; good: GoodType; value: number; size?: 'sm' | 'md' | 'lg'; flip?: boolean }) {
  return (
    <span className={`token token--goods token--${good} token--${size}`} data-flip={flip ? id : undefined} data-kind="token" title={`${good} token: ${value} rupees`}>
      <GoodIcon type={good} className="token__icon" />
      <span className="token__value">{value}</span>
    </span>
  );
}

export function BonusTokenChip({ id, size, value, flip = true, small }: { id: string; size: BonusSize; value: number | null; flip?: boolean; small?: boolean }) {
  return (
    <span
      className={`token token--bonus token--bonus${size} ${small ? 'token--sm' : ''} ${value === null ? 'is-hidden' : ''}`}
      data-flip={flip ? id : undefined}
      data-kind="bonus"
      title={value === null ? `${size}-card bonus (value hidden)` : `${size}-card bonus: ${value} rupees`}
    >
      <span className="token__bonus-size">{size}×</span>
      <span className="token__value">{value ?? '?'}</span>
    </span>
  );
}

export function CamelToken({ available = true, small }: { available?: boolean; small?: boolean }) {
  return (
    <span className={`token token--camel ${small ? 'token--sm' : ''} ${available ? '' : 'is-gone'}`} data-flip="camel-token" data-kind="token" title="Camel token: 5 rupees for the largest herd">
      <GoodIcon type="camel" className="token__icon" />
      <span className="token__value">5</span>
    </span>
  );
}
