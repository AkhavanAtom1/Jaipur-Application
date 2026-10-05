import type { BonusSize, PublicRoundView } from '../../../shared/types.ts';
import { BONUS_RANGES, BONUS_SIZES, CARD_LABELS, DEPLETED_TYPES_TO_END, GOODS } from '../../../shared/constants.ts';
import { GoodIcon } from './Icons.tsx';
import { BonusTokenChip, CamelToken, GoodsTokenChip } from './Token.tsx';

export function TokenBazaar({ round, highlight }: { round: PublicRoundView; highlight: string | null }) {
  return (
    <section className="bazaar" aria-label="Token bazaar">
      <header className="bazaar__head">
        <h2 className="eyebrow">Rupee tokens</h2>
        <span className={`sold-out ${round.depletedTypes >= 2 ? 'is-warning' : ''}`} title={`The round ends when ${DEPLETED_TYPES_TO_END} goods are sold out`}>
          Sold out {round.depletedTypes}/{DEPLETED_TYPES_TO_END}
        </span>
      </header>
      <ul className="bazaar__rows">
        {GOODS.map((g) => {
          const stack = round.goodsTokens[g];
          return (
            <li key={g} className={`bazaar__row bazaar__row--${g} ${stack.length === 0 ? 'is-empty' : ''} ${highlight === g ? 'is-highlight' : ''}`}>
              <span className="bazaar__label">
                <GoodIcon type={g} className={`glyph--${g}`} />
                <span>{CARD_LABELS[g].many}</span>
              </span>
              <span className="bazaar__stack">
                {stack.length === 0 && <span className="bazaar__empty">sold out</span>}
                {stack.map((t, i) => (
                  <span key={t.id} className="bazaar__slot" style={{ zIndex: 20 - i }}>
                    <GoodsTokenChip id={t.id} good={g} value={t.value} size={i === 0 ? 'md' : 'sm'} />
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="bazaar__bonus">
        {BONUS_SIZES.map((s: BonusSize) => (
          <div key={s} className="bonus-pile" title={`Sell ${s}${s === 5 ? '+' : ''} cards: bonus worth ${BONUS_RANGES[s]} rupees`}>
            <span className="bonus-pile__stack">
              {round.bonusStacks[s].length === 0 && <span className="bonus-pile__none">none</span>}
              {round.bonusStacks[s].map((id, i) => (
                <span key={id} className="bonus-pile__item" style={{ transform: `translateY(${-i * 2}px)`, zIndex: 10 - i }}>
                  <BonusTokenChip id={id} size={s} value={null} small />
                </span>
              )).reverse()}
            </span>
            <span className="bonus-pile__caption">{s}{s === 5 ? '+' : ''} cards · {BONUS_RANGES[s]}</span>
          </div>
        ))}
        <div className="bonus-pile" title="5 rupees to the player with the most camels at round end">
          <span className="bonus-pile__stack">{round.camelTokenAvailable && <CamelToken />}</span>
          <span className="bonus-pile__caption">Most camels</span>
        </div>
      </div>
    </section>
  );
}
