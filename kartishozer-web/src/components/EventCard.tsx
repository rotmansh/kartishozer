"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Heart } from "lucide-react";
import type { EventItem } from "@/lib/types";
import { fmtEventDate, fmtAgorot } from "@/lib/format";
import { getCategory } from "@/lib/mock/categories";
import { CategoryArt } from "@/components/CategoryArt";
import { toggleEventFavoriteAction } from "@/lib/actions/favorites.actions";

export function EventCard({
  event,
  wide,
  minPriceAgorot: minPrice = null,
  listingCount: count = 0,
  isFavorited = false,
  canFavorite = false,
  soleListingId = null,
}: {
  event: EventItem;
  wide?: boolean;
  minPriceAgorot?: number | null;
  listingCount?: number;
  isFavorited?: boolean;
  canFavorite?: boolean;
  // When the event has exactly one active listing, skip the event page
  // (built for comparing multiple sellers) and link straight to it.
  soleListingId?: string | null;
}) {
  const router = useRouter();
  const category = getCategory(event.category);
  const [fav, setFav] = useState(isFavorited);
  const [, startTransition] = useTransition();

  function handleToggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (!canFavorite) {
      router.push("/sign-in?redirect=/favorites");
      return;
    }
    setFav((v) => !v);
    startTransition(async () => {
      const result = await toggleEventFavoriteAction(event.id);
      if ("error" in result) setFav((v) => !v);
    });
  }

  return (
    <Link
      href={soleListingId ? `/listing/${soleListingId}` : `/event/${event.id}`}
      className={`tap flex-shrink-0 block bg-white rounded-3xl overflow-hidden shadow-card border border-ink-900/5 ${
        wide ? "w-[78vw] max-w-[300px]" : "w-full"
      }`}
    >
      <div
        className="h-32 relative flex items-end justify-between p-3 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${event.gradient[0]}, ${event.gradient[1]})`,
        }}
      >
        <CategoryArt category={event.category} />
        <button
          onClick={handleToggleFavorite}
          aria-label="הוסף למועדפים"
          className="tap absolute left-3 top-3 h-9 w-9 rounded-full bg-black/25 backdrop-blur flex items-center justify-center z-10"
        >
          <Heart size={16} className={fav ? "fill-brand text-brand" : "text-white"} />
        </button>
        <span className="absolute top-3 right-3 text-xl drop-shadow-sm">{event.emoji}</span>
        {category && (
          <span className="relative rounded-full bg-black/25 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
            {category.labelHe}
          </span>
        )}
        {count > 0 && (
          <span className="relative rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-900">
            {count} כרטיסים זמינים
          </span>
        )}
      </div>
      <div className="p-3.5 space-y-1.5">
        <p className="font-black text-ink-900 text-sm leading-snug line-clamp-2">{event.nameHe}</p>
        <div className="flex items-center gap-1 text-ink-500 text-xs">
          <Calendar size={13} />
          <span>{fmtEventDate(event)}</span>
          <span className="mx-0.5">·</span>
          <MapPin size={13} />
          <span className="truncate">{event.venue.city}</span>
        </div>
        {minPrice !== null && (
          <p className="text-xs text-ink-500">
            החל מ־<span className="font-black text-brand text-sm">{fmtAgorot(minPrice)}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
