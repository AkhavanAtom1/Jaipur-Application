import { useEffect, useState } from 'react';
import type { GameView } from '../../../shared/types.ts';
import { cardLabel } from '../../../shared/constants.ts';
import { intentLabel, type Intent } from '../game/intent.ts';

interface Props {
  game: GameView;
  intent: Intent;
  myTurn: boolean;
  opponentName: string;
  busy: boolean;
  onSubmit: () => void;
  onClear: () => void;
  onTakeCamels: () => void;
}

function hintFor(intent: Intent): string {
  switch (intent.kind) {
    case 'idle': return 'Pick one market good to take it, several goods to exchange, a camel to take them all, or cards in your hand to sell.';
    case 'takeCamels': return 'All camels go to your herd; the market refills from the deck.';
    case 'takeGood': return 'Take this card; the market refills from the deck.';
    case 'exchange':
      if (intent.need > 0) return `Now pick ${intent.need} more card${intent.need === 1 ? '' : 's'} to give back: hand cards and/or camels.`;
      if (intent.need < 0) return `You're giving ${-intent.need} too many. Deselect some.`;
      return 'Swap them: your cards take the empty market slots.';
    case 'sell':
      if (!intent.good) return '';
      return `Earn ${intent.tokens} token${intent.tokens === 1 ? '' : 's'} worth ${intent.rupees}₹${intent.bonus ? ` + a ${intent.bonus}-card bonus` : ''}${intent.tokens < intent.cards.length ? ` (only ${intent.tokens} ${cardLabel(intent.good)} token${intent.tokens === 1 ? '' : 's'} left)` : ''}.`;
  }
}

export function ActionBar({ game, intent, myTurn, opponentName, busy, onSubmit, onClear, onTakeCamels }: Props) {
  const camelsInMarket = game.round.market.filter((c) => c.type === 'camel').length;
  const [armed, setArmed] = useState(false);
  useEffect(() => { setArmed(false); }, [game.version, intent.kind]);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 2600); return () => clearTimeout(t); }, [armed]);

  if (game.phase !== 'playing') return <div className="actionbar actionbar--quiet">Round over</div>;
  if (!myTurn) {
    return (
      <div className="actionbar actionbar--quiet" aria-live="polite">
        <span className="waiting-dot" /> {opponentName} is trading. You can plan your next move.
      </div>
    );
  }

  const ok = intent.kind !== 'idle' && intent.check.ok;
  const reason = intent.kind !== 'idle' && !intent.check.ok ? intent.check.reason : null;
  // Exchanges in progress show guidance rather than an error.
  const guiding = intent.kind === 'exchange' && intent.need !== 0;

  return (
    <div className="actionbar" aria-live="polite">
      <div className="actionbar__text">
        <strong className="actionbar__title">{intent.kind === 'idle' ? 'Your move' : intentLabel(intent)}</strong>
        <span className={`actionbar__hint ${reason && !guiding ? 'is-error' : ''}`}>{reason && !guiding ? reason : hintFor(intent)}</span>
      </div>
      <div className="actionbar__buttons">
        {intent.kind === 'idle' && camelsInMarket > 0 && (
          <button type="button" className={`btn btn--ghost ${armed ? 'is-armed' : ''}`} disabled={busy}
            onClick={() => (armed ? onTakeCamels() : setArmed(true))}>
            {armed ? `Confirm: take ${camelsInMarket} camel${camelsInMarket === 1 ? '' : 's'}` : `Take all camels (${camelsInMarket})`}
          </button>
        )}
        {intent.kind !== 'idle' && <button type="button" className="btn btn--ghost" onClick={onClear}>Clear <kbd>Esc</kbd></button>}
        {intent.kind !== 'idle' && (
          <button type="button" className="btn btn--primary" disabled={!ok || busy} onClick={onSubmit}>
            {intentLabel(intent)} <kbd>↵</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
