"use client";

// Sold (and rejected/suspended) listings can never be delisted — they're
// real transaction history, not something a seller should be able to
// make disappear — but leaving them inline forever is exactly what turns
// "המודעות שלי" into an ever-growing scroll once a seller has sold a
// handful of tickets. Tucking them behind a collapsed toggle keeps the
// list short by default without deleting or hiding any real data.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MyListingRow, type MyListing } from "@/components/MyListingRow";

export function MyListingsHistory({ listings }: { listings: MyListing[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="tap w-full flex items-center justify-between rounded-2xl bg-ink-100 px-4 h-11 text-sm font-bold text-ink-700"
        aria-expanded={open}
      >
        <span>{open ? "הסתר" : "הצג"} היסטוריה — נמכרו / הוסרו ({listings.length})</span>
        <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && (
        <div className="space-y-3">
          {listings.map((l) => (
            <MyListingRow key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
