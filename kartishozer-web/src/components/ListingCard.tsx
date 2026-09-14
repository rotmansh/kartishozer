"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ShieldCheck, Ticket } from "lucide-react";
import type { Listing, EventItem } from "@/lib/types";
import { markupPercent } from "@/lib/types";
import { fmtAgorot } from "@/lib/format";
import { fmtDate } from "@/lib/format";
import { SellerBadge } from "@/components/SellerBadge";
import { toggleFavoriteAction } from "@/lib/actions/favorites.actions";
import { cn } from "@/lib/cn";

export function ListingCard({
  listing,
  event,
  showEvent = true,
  isFavorited = false,
  canFavorite = false,
}: {
  listing: Listing;
  event?: EventItem;
  showEvent?: boolean;
  isFavorited?: boolean;
  canFavorite?: boolean;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(isFavorited);
  const [, startTransition] = useTransition();
  const markup = markupPercent(listing.priceAgorot, listing.faceValueAgorot);

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!canFavorite) {
      router.push("/sign-in?redirect=/favorites");
      return;
    }
    setFav((v) => !v);
    startTransition(async () => {
      const result = await toggleFavoriteAction(listing.id);
      if ("error" in result) setFav((v) => !v);
    });
  }

  return (
    <div className="relative bg-white rounded-3xl border border-ink-900/5 shadow-card p-4">
      <button
        onClick={handleToggleFavorite}
        aria-label="הוסף למועדפים"
        className="tap absolute left-3 top-3 h-9 w-9 rounded-full bg-ink-50 flex items-center justify-center z-10"
      >
        <Heart size={17} className={fav ? "fill-brand text-brand" : "text-ink-500"} />
      </button>

      <Link href={`/listing/${listing.id}`} className="block">
        {showEvent && event && (
          <div className="mb-2.5 pl-10">
            <p className="text-sm font-black text-ink-900 truncate">{event.nameHe}</p>
            <p className="text-xs text-ink-500">
              {fmtDate(event.startsAt)} · {event.venue.city}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <SellerBadge seller={listing.seller} size="sm" />
          <div className="flex-shrink-0 flex items-center gap-1 text-ink-500 text-xs">
            <Ticket size={13} />
            {listing.quantity}
          </div>
        </div>

        {listing.section && (
          <p className="text-xs text-ink-500 mt-2">{listing.section}</p>
        )}

        <div className="flex items-end justify-between mt-3 pt-3 border-t border-ink-900/5">
          <div>
            <p className="text-lg font-black text-ink-900">{fmtAgorot(listing.priceAgorot)}</p>
            <p className="text-[11px] text-ink-500">
              מחיר פנים {fmtAgorot(listing.faceValueAgorot)}
              {markup !== 0 && (
                <span className={cn("font-bold mr-1", markup > 0 ? "text-brand" : "text-accent-600")}>
                  {markup > 0 ? `+${markup}%` : `${markup}%`}
                </span>
              )}
            </p>
          </div>
          {listing.isSafePassExchange && (
            <div className="flex items-center gap-1 text-accent-600 text-[11px] font-bold">
              <ShieldCheck size={14} />
              העברה מאובטחת
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
