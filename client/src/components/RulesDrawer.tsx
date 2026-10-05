import { useEffect } from 'react';
import { CARD_COUNTS, CARD_LABELS, CARD_TYPES, GOODS, GOODS_TOKEN_VALUES } from '../../../shared/constants.ts';
import { GoodIcon } from './Icons.tsx';

/** In-game rules, summarised from the official Space Cowboys rulebook. */
export function RulesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`scrim ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden />
      <aside className={`drawer ${open ? 'is-open' : ''}`} aria-label="Rules" aria-hidden={!open}>
        <header className="drawer__head">
          <h2>How to trade in Jaipur</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close rules">✕</button>
        </header>
        <div className="drawer__body">
          <p className="lede">Be the richer trader at the end of a round to earn a <b>Seal of Excellence</b>. The first to <b>2 seals</b> wins.</p>

          <h3>The cards (55)</h3>
          <ul className="rules-cards">
            {CARD_TYPES.map((t) => (
              <li key={t}><GoodIcon type={t} className={`glyph--${t}`} /> {CARD_LABELS[t].many} <span className="muted">×{CARD_COUNTS[t]}</span></li>
            ))}
          </ul>

          <h3>Setup</h3>
          <p>3 camels start in the market, plus 2 cards from the deck. Each player gets 5 cards; camels dealt to you go straight to your <b>herd</b>.</p>

          <h3>On your turn: take <em>or</em> sell, never both</h3>
          <ol className="rules-list">
            <li><b>Take 1 good</b> from the market. The deck refills the slot.</li>
            <li><b>Exchange</b>: take 2 or more goods and give back the same number of cards, from your hand and/or camels from your herd. You can't take and give back the same goods type, and camels can't be taken this way. No refill.</li>
            <li><b>Take all the camels</b> in the market (always all of them) into your herd. The deck refills the slots.</li>
            <li><b>Sell</b> any number of cards of <b>one</b> goods type. Take that many tokens from the top of its stack (highest first). Diamonds, gold and silver must be sold <b>2 or more</b> at a time.</li>
          </ol>
          <p><b>Hand limit: 7 cards</b> at the end of your turn. Camels don't count.</p>

          <h3>Tokens</h3>
          <ul className="rules-tokens">
            {GOODS.map((g) => <li key={g}><GoodIcon type={g} className={`glyph--${g}`} /> {GOODS_TOKEN_VALUES[g].join(' · ')}</li>)}
          </ul>
          <p><b>Bonus tokens</b> for big sales, drawn face down: 3 cards → 1 to 3; 4 cards → 4 to 6; 5+ cards → 8 to 10. You get the bonus even if goods tokens ran short. Your opponent can't see your bonus values.</p>

          <h3>Round end</h3>
          <p>A round ends immediately when <b>3 goods token stacks are empty</b>, or when the <b>deck can't refill the market</b>.</p>
          <p>The larger herd takes the <b>camel token (5₹)</b>; equal herds, nobody does. The richer player takes a seal. Tie? Most bonus tokens wins; still tied, most goods tokens. The loser of a round starts the next one.</p>

          <p className="source">Source: official Jaipur rulebook, Space Cowboys / Asmodee. The exact size of an opponent's herd is not public, so it's shown only roughly.</p>
        </div>
      </aside>
    </>
  );
}
