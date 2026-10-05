import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp.ts';

/** Animated rupee total with a floating "+n" when it grows. */
export function Score({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const shown = useCountUp(value);
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    if (value > prev.current) setDelta({ n: value - prev.current, key: Date.now() });
    prev.current = value;
  }, [value]);
  return (
    <span className="score" aria-label={`${label}: ${value} rupees${suffix ? ' ' + suffix : ''}`}>
      <span className="score__num">{shown}</span>
      <span className="score__unit">₹{suffix ? <em>{suffix}</em> : null}</span>
      {delta && <span key={delta.key} className="score__delta">+{delta.n}</span>}
    </span>
  );
}
