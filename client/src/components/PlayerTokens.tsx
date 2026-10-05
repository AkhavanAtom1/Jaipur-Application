import type { BonusToken, GoodType, GoodsToken, HiddenBonusToken } from '../../../shared/types.ts';
import { GOODS } from '../../../shared/constants.ts';
import { BonusTokenChip, GoodsTokenChip } from './Token.tsx';

/** A player's earned tokens, grouped by goods type. */
export function PlayerTokens({ goods, bonus, anchor }: { goods: GoodsToken[]; bonus: (BonusToken | HiddenBonusToken)[]; anchor: string }) {
  const groups = GOODS.map((g) => [g, goods.filter((t) => t.good === g)] as [GoodType, GoodsToken[]]).filter(([, ts]) => ts.length);
  return (
    <div className="purse" data-anchor={anchor}>
      {groups.length === 0 && bonus.length === 0 && <span className="purse__empty">No sales yet</span>}
      {groups.map(([g, ts]) => (
        <span key={g} className="purse__group">
          {ts.map((t) => <GoodsTokenChip key={t.id} id={t.id} good={g} value={t.value} size="sm" />)}
        </span>
      ))}
      {bonus.length > 0 && (
        <span className="purse__group purse__group--bonus">
          {bonus.map((t) => <BonusTokenChip key={t.id} id={t.id} size={t.size} value={t.value} small />)}
        </span>
      )}
    </div>
  );
}
