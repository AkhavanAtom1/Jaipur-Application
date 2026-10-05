import { SEALS_TO_WIN } from '../../../shared/constants.ts';
import { SealGlyph } from './Icons.tsx';

export function Seals({ count, label }: { count: number; label?: string }) {
  return (
    <span className="seals" aria-label={`${label ?? ''} ${count} of ${SEALS_TO_WIN} Seals of Excellence`} title={`${count} / ${SEALS_TO_WIN} Seals of Excellence`}>
      {Array.from({ length: SEALS_TO_WIN }, (_, i) => (
        <SealGlyph key={i} filled={i < count} className={i < count ? 'seal-pop' : ''} />
      ))}
    </span>
  );
}
