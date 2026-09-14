"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import { CATEGORIES } from "@/lib/mock/categories";
import { searchEvents } from "@/lib/mock/events";
import { getMinPriceAgorot } from "@/lib/data";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import type { CategorySlug } from "@/lib/types";

type SortKey = "date" | "price_asc" | "price_desc";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [sort, setSort] = useState<SortKey>("date");

  const results = useMemo(() => {
    let items = searchEvents(query);
    if (category) items = items.filter((e) => e.category === category);
    if (sort === "date") {
      items = [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    } else {
      const price = (id: string) => getMinPriceAgorot(id) ?? Infinity;
      items = [...items].sort((a, b) =>
        sort === "price_asc" ? price(a.id) - price(b.id) : price(b.id) - price(a.id)
      );
    }
    return items;
  }, [query, category, sort]);

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

        <div className="flex items-center gap-2 mt-3">
          <SlidersHorizontal size={14} className="text-ink-400" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: "date", label: "התאריך הקרוב" },
                { key: "price_asc", label: "מחיר: נמוך לגבוה" },
                { key: "price_desc", label: "מחיר: גבוה לנמוך" },
              ] as { key: SortKey; label: string }[]
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
        {results.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title="לא נמצאו תוצאות"
            subtitle="נסו לחפש מילה אחרת או לבחור קטגוריה שונה"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-ink-500 font-bold px-1">{results.length} אירועים נמצאו</p>
            {results.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
