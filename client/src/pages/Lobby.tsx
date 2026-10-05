import { useState } from 'react';
import type { RoomView } from '../../../shared/types.ts';
import { GoodIcon } from '../components/Icons.tsx';
import { getPublicGameOrigin } from '../net/config.ts';

export function Lobby({ view, onLeave }: { view: RoomView; onLeave: () => void }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const me = view.players[view.you];
  const publicOrigin = getPublicGameOrigin();
  const link = publicOrigin ? `${publicOrigin}/?room=${view.roomId}` : null;

  const copy = async (what: 'code' | 'link') => {
    const text = what === 'code' ? view.roomId : link;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <main className="lobby">
      <p className="eyebrow">Your room is open</p>
      <h1 className="lobby__title">Share this code</h1>
      <div className="code" aria-label={`Room code ${view.roomId.split('').join(' ')}`}>
        {view.roomId.split('').map((ch, i) => <span key={i} className="code__tile" style={{ ['--i' as string]: i }}>{ch}</span>)}
      </div>
      <div className="lobby__copy">
        <button type="button" className="btn btn--primary" onClick={() => copy('code')}>{copied === 'code' ? 'Copied ✓' : 'Copy code'}</button>
        <button type="button" className="btn btn--ghost" onClick={() => copy('link')} disabled={!link}>{copied === 'link' ? 'Link copied ✓' : 'Copy invite link'}</button>
      </div>

      <div className="caravan" aria-hidden>
        <div className="caravan__dunes" />
        <div className="caravan__walkers">{[0, 1, 2].map((i) => <span key={i}><GoodIcon type="camel" /></span>)}</div>
      </div>

      <ol className="slots">
        <li className="slot is-filled"><span className="slot__n">1</span><span>{me?.name ?? 'You'}</span><span className="muted">host</span></li>
        <li className="slot is-waiting"><span className="slot__n">2</span><span>Waiting for opponent<span className="dots"><i>.</i><i>.</i><i>.</i></span></span></li>
      </ol>
      <p className="lobby__note">The game starts the moment they join.</p>
      <button type="button" className="btn btn--link" onClick={onLeave}>Close room</button>
    </main>
  );
}
