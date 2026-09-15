"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import { CATEGORIES } from "@/lib/mock/categories";
import {
  searchCatalogAction,
  type SearchResultItem,
  type SearchSortKey,
  type WhenFilter,
} from "@/lib/actions/search.actions";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import type { CategorySlug } from "@/lib/types";

const WHEN_OPTIONS: { key: WhenFilter; label: string }[] = [
  { key: "today", label: "היום" },
  { key: "tomorrow", label: "מחר" },
  { key: "week", label: "השבוע הקרוב" },
  { key: "month", label: "החודש הקרוב" },
];

function isCategorySlug(v: string | null): v is CategorySlug {
  return !!v && CATEGORIES.some((c) => c.slug === v);
}

function isWhenFilter(v: string | null): v is WhenFilter {
  return !!v && WHEN_OPTIONS.some((w) => w.key === v);
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  // Read once on first render only — quick-filter tiles on the homepage
  // link here with ?category=/?when= preset, but once the visitor starts
  // interacting with the chips on this page, the chips' own state takes
  // over (re-reading the URL on every render would fight the user's taps).
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategorySlug | null>(() =>
    isCategorySlug(searchParams.get("category")) ? (searchParams.get("category") as CategorySlug) : null
  );
  const [when, setWhen] = useState<WhenFilter | null>(() =>
    isWhenFilter(searchParams.get("when")) ? (searchParams.get("when") as WhenFilter) : null
  );
  const [sort, setSort] = useState<SearchSortKey>("date");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [canFavorite, setCanFavorite] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        const { items, canFavorite } = await searchCatalogAction({ query, category, sort, when });
        setResults(items);
        setCanFavorite(canFavorite);
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [query, category, sort, when]);

  return (
    <div>
      <div className="sticky top-0 z-20 bg-ink-50/95 backdrop-blur px-4 pt-4 pb-3 border-b border-ink-900/5">
        <h1 className="text-lg font-black text-ink-900 mb-3">חיפוש אירועים</h1>
        <div className="flex items-center gap-2 rounded-2xl bg-white border border-ink-900/10 px-3.5 h-12 shadow-card">
          <SearchIcon size={18} className="text-ink-500 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חפשו הופעה, הצגה, אמן או עיר…"
            className="flex-1 bg-transparent outline-none text-sm placeholder-ink-300 min-w-0"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="נקה חיפוש" className="tap text-ink-300">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-0.5">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            הכל
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.labelHe}
            </Chip>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-0.5">
          <Chip active={when === null} onClick={() => setWhen(null)}>
            כל התאריכים
          </Chip>
          {WHEN_OPTIONS.map((w) => (
            <Chip key={w.key} active={when === w.key} onClick={() => setWhen(when === w.key ? null : w.key)}>
              {w.label}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <SlidersHorizontal size={14} className="text-ink-400" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: "date", label: "התאריך הקרוב" },
                { key: "price_asc", label: "מחיר: נמוך לגבוה" },
                { key: "price_desc", label: "מחיר: גבוה לנמוך" },
              ] as { key: SearchSortKey; label: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`tap flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap ${
                  sort === opt.key ? "bg-brand-50 text-brand-600" : "text-ink-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {!isPending && results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title="לא נמצאו תוצאות"
            subtitle="נסו לחפש מילה אחרת או לבחור קטגוריה שונה"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-ink-500 font-bold px-1">{results.length} אירועים נמצאו</p>
            {results.map(({ event, minPriceAgorot, listingCount, isFavorited }) => (
              <EventCard
                key={event.id}
                event={event}
                minPriceAgorot={minPriceAgorot}
                listingCount={listingCount}
                isFavorited={isFavorited}
                canFavorite={canFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
