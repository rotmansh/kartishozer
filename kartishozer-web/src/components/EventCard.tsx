import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import type { EventItem } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { fmtAgorot } from "@/lib/format";
import { getCategory } from "@/lib/mock/categories";

export function EventCard({
  event,
  wide,
  minPriceAgorot: minPrice = null,
  listingCount: count = 0,
}: {
  event: EventItem;
  wide?: boolean;
  minPriceAgorot?: number | null;
  listingCount?: number;
}) {
  const category = getCategory(event.category);

  return (
    <Link
      href={`/event/${event.id}`}
      className={`tap flex-shrink-0 block bg-white rounded-3xl overflow-hidden shadow-card border border-ink-900/5 ${
        wide ? "w-[78vw] max-w-[300px]" : "w-full"
      }`}
    >
      <div
        className="h-32 relative flex items-end p-3"
        style={{
          background: `linear-gradient(135deg, ${event.gradient[0]}, ${event.gradient[1]})`,
        }}
      >
        <span className="absolute top-3 right-3 text-3xl drop-shadow-sm">{event.emoji}</span>
        {category && (
          <span className="absolute top-3 left-3 rounded-full bg-black/25 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-white">
            {category.labelHe}
          </span>
        )}
        {count > 0 && (
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-900">
            {count} כרטיסים זמינים
          </span>
        )}
      </div>
      <div className="p-3.5 space-y-1.5">
        <p className="font-black text-ink-900 text-sm leading-snug line-clamp-2">{event.nameHe}</p>
        <div className="flex items-center gap-1 text-ink-500 text-xs">
          <Calendar size={13} />
          <span>{fmtDate(event.startsAt)}</span>
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
