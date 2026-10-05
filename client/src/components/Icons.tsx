import type { CardType } from '../../../shared/types.ts';

/** Original line-art glyphs for each card type (48x48 grid). */
export function GoodIcon({ type, className }: { type: CardType; className?: string }) {
  const common = { viewBox: '0 0 48 48', className: `glyph ${className ?? ''}`, 'aria-hidden': true as const };
  switch (type) {
    case 'diamond':
      return (
        <svg {...common}>
          <path d="M24 42 L7 18 L14 8 H34 L41 18 Z" className="fill" />
          <path d="M7 18 H41 M14 8 L19 18 L24 8 L29 18 L34 8 M19 18 L24 42 L29 18" className="line" />
        </svg>
      );
    case 'gold':
      return (
        <svg {...common}>
          <path d="M5 38 L10 29 H24 L29 38 Z M19 38 L24 29 H38 L43 38 Z M12 28 L17 19 H31 L36 28 Z" className="fill" />
          <path d="M5 38 L10 29 H24 L29 38 Z M19 38 L24 29 H38 L43 38 Z M12 28 L17 19 H31 L36 28 Z" className="line" />
          <path d="M24 6 V12 M16 9 L18.5 13.5 M32 9 L29.5 13.5" className="line" />
        </svg>
      );
    case 'silver':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="16" className="fill" />
          <circle cx="24" cy="24" r="16" className="line" />
          <circle cx="24" cy="24" r="10.5" className="line" />
          <path d="M28 16.5 A8 8 0 1 0 28 31.5 A6.5 6.5 0 1 1 28 16.5 Z" className="line solid" />
        </svg>
      );
    case 'cloth':
      return (
        <svg {...common}>
          <path d="M12 9 H40 V33 H12 Z" className="fill" />
          <path d="M12 9 H40 V33 H12" className="line" />
          <path d="M12 16 C18 13 22 19 28 16 S36 13 40 16 M12 23 C18 20 22 26 28 23 S36 20 40 23 M12 30 C18 27 22 33 28 30 S36 27 40 30" className="line thin" />
          <ellipse cx="12" cy="21" rx="5" ry="12" className="fill" />
          <ellipse cx="12" cy="21" rx="5" ry="12" className="line" />
          <path d="M34 33 L34 41 L30 38 L26 41 L26 33" className="line" />
        </svg>
      );
    case 'spice':
      return (
        <svg {...common}>
          <path d="M10 30 C12 18 18 12 24 12 C30 12 36 18 38 30 Z" className="fill" />
          <path d="M10 30 C12 18 18 12 24 12 C30 12 36 18 38 30" className="line" />
          <path d="M6 30 H42 C40 37 33 41 24 41 C15 41 8 37 6 30 Z" className="fill" />
          <path d="M6 30 H42 C40 37 33 41 24 41 C15 41 8 37 6 30 Z" className="line" />
          <path d="M24 12 C24 9 26 7 29 6" className="line" />
          <circle cx="18" cy="24" r="1.4" className="dot" /><circle cx="25" cy="20" r="1.4" className="dot" /><circle cx="30" cy="25" r="1.4" className="dot" /><circle cx="22" cy="27" r="1.4" className="dot" />
        </svg>
      );
    case 'leather':
      return (
        <svg {...common}>
          <path d="M8 18 H40 V40 H8 Z" className="fill" />
          <path d="M8 18 H40 V40 H8 Z" className="line" />
          <path d="M8 18 C8 12 13 10 24 10 C35 10 40 12 40 18 L36 28 H12 Z" className="fill" />
          <path d="M8 18 C8 12 13 10 24 10 C35 10 40 12 40 18 L36 28 H12 Z" className="line" />
          <rect x="20.5" y="25" width="7" height="7" rx="1" className="line" />
          <path d="M11 36.5 H37" className="line stitch" />
          <path d="M18 10 C18 5 30 5 30 10" className="line" />
        </svg>
      );
    case 'camel':
      return (
        <svg {...common}>
          <path d="M8 26 C9 18 14 11 20 11 C24 11 26 16 28 20 C30 20 32 17 33.5 14 L35.5 10.5 C37.5 9.5 40.5 10.5 42 12.5 L42.5 15 L38.5 16 C37.5 19.5 36.5 23.5 34.5 26.5 L33.5 40 H31 L30 30 H18 L17 40 H14.5 L13.5 29 C11 28.5 9 27.5 8 26 Z" className="fill" />
          <path d="M8 26 C9 18 14 11 20 11 C24 11 26 16 28 20 C30 20 32 17 33.5 14 L35.5 10.5 C37.5 9.5 40.5 10.5 42 12.5 L42.5 15 L38.5 16 C37.5 19.5 36.5 23.5 34.5 26.5 L33.5 40 H31 L30 30 H18 L17 40 H14.5 L13.5 29 C11 28.5 9 27.5 8 26 Z M8 26 L6 32" className="line" />
        </svg>
      );
  }
}

export function SealGlyph({ filled = true, className }: { filled?: boolean; className?: string }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 19 : 22;
    return `${24 + r * Math.cos(a)},${24 + r * Math.sin(a)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 48 48" className={`seal-glyph ${filled ? 'is-filled' : 'is-empty'} ${className ?? ''}`} aria-hidden>
      <polygon points={points} className="seal-edge" />
      <circle cx="24" cy="24" r="14" className="seal-ring" />
      <path d="M24 14 L26.6 21 H34 L28 25.4 L30.3 32.5 L24 28 L17.7 32.5 L20 25.4 L14 21 H21.4 Z" className="seal-star" />
    </svg>
  );
}

export function RupeeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="rupee" aria-hidden>
      <path d="M7 5 H17 M7 9 H17 M7 5 H10.5 C13.5 5 15 7 15 9 C15 11.5 13 13 10 13 H8 L15 20" />
    </svg>
  );
}
