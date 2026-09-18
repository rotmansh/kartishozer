import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { PriceIndex } from "@/lib/types";
import { fmtAgorot } from "@/lib/format";

// A short, honest snapshot of the market for one event: the price range
// across every active listing, and where the "typical" listing sits
// relative to face value — the exact information a scalping site has no
// incentive to surface, shown here up front instead of making a buyer
// compare listings by eye.
export function PriceTransparencyIndex({ index }: { index: PriceIndex }) {
  const { minPriceAgorot, maxPriceAgorot, medianMarkupPercent, atOrBelowFaceCount, totalCount } = index;

  const Icon = medianMarkupPercent > 0 ? TrendingUp : medianMarkupPercent < 0 ? TrendingDown : Minus;
  const tone =
    medianMarkupPercent > 0 ? "text-brand" : medianMarkupPercent < 0 ? "text-accent-600" : "text-ink-500";

  return (
    <div className="rounded-2xl bg-ink-100 p-3.5 mb-3">
      <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-2">מדד שקיפות מחיר</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-500">טווח מחירים</p>
          <p className="text-sm font-black text-ink-900">
            {fmtAgorot(minPriceAgorot)} – {fmtAgorot(maxPriceAgorot)}
          </p>
        </div>
        <div className="text-left">
          <p className="text-xs text-ink-500">תוספת חציונית מעל מחיר פנים</p>
          <p className={`text-sm font-black flex items-center gap-1 justify-end ${tone}`}>
            <Icon size={14} />
            {medianMarkupPercent > 0 ? `+${medianMarkupPercent}%` : `${medianMarkupPercent}%`}
          </p>
        </div>
      </div>
      {atOrBelowFaceCount > 0 && (
        <p className="text-[11px] text-accent-600 font-bold mt-2.5 pt-2.5 border-t border-ink-900/5">
          {atOrBelowFaceCount} מתוך {totalCount} כרטיסים נמכרים במחיר פנים או מתחתיו
        </p>
      )}
    </div>
  );
}
