"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Repeat, CheckCircle2 } from "lucide-react";
import { resellOrderAction } from "@/lib/actions/listings.actions";

export function ResellOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);

  if (listingId) {
    return (
      <div className="mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-accent-600">
        <CheckCircle2 size={14} />
        פורסם מחדש למכירה —{" "}
        <Link href={`/listing/${listingId}`} className="underline">
          צפייה במודעה
        </Link>
      </div>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await resellOrderAction(orderId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setListingId(result.listingId);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink-900/5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="tap flex items-center gap-1.5 text-xs font-bold text-brand-600 disabled:opacity-40"
      >
        <Repeat size={14} />
        {isPending ? "מפרסם מחדש…" : "לא מגיעים? פרסמו מחדש למכירה"}
      </button>
      {error && <p className="text-[11px] text-brand mt-1">{error}</p>}
    </div>
  );
}
