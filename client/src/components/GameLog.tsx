import { useEffect, useRef } from 'react';
import type { LogEntry, PlayerIndex } from '../../../shared/types.ts';
import { formatLog } from '../game/format.tsx';

export function GameLog({ log, name }: { log: LogEntry[]; name: (p: PlayerIndex) => string }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [log.length]);
  return (
    <section className="ledger" aria-label="Game log">
      <h2 className="eyebrow">Ledger</h2>
      <ol ref={list} className="ledger__list">
        {log.map((e) => {
          const { text, tone } = formatLog(e, name);
          return <li key={e.id} className={`ledger__item tone-${tone}`}>{text}</li>;
        })}
      </ol>
    </section>
  );
}
