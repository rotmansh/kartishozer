import { BadgeCheck, Star } from "lucide-react";
import type { Seller } from "@/lib/types";

export function SellerBadge({ seller, size = "md" }: { seller: Seller; size?: "sm" | "md" }) {
  const initial = seller.displayName.trim().charAt(0);
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          size === "sm"
            ? "h-6 w-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-[11px] font-black flex-shrink-0"
            : "h-9 w-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-black flex-shrink-0"
        }
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className={size === "sm" ? "text-xs font-bold text-ink-700 truncate" : "text-sm font-bold text-ink-900 truncate"}>
            {seller.displayName}
          </p>
          {seller.isVerified && <BadgeCheck size={size === "sm" ? 13 : 15} className="text-accent-500 flex-shrink-0" />}
          {seller.ratingAverage != null && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-ink-500 flex-shrink-0">
              <Star size={size === "sm" ? 10 : 11} className="fill-amber-400 text-amber-400" />
              {seller.ratingAverage.toFixed(1)}
              <span className="text-ink-300 font-normal">({seller.ratingCount})</span>
            </span>
          )}
        </div>
        {size === "md" && (
          <p className="text-[11px] text-ink-500">
            {seller.salesCount > 0 ? `${seller.salesCount} מכירות באתר` : "מוכר/ת חדש/ה"}
          </p>
        )}
      </div>
    </div>
  );
}
