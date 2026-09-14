"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ChevronLeft } from "lucide-react";
import { fmtAgorot, fmtDate } from "@/lib/format";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONE } from "@/lib/status-labels";
import { updateListingAction, delistListingAction } from "@/lib/actions/listings.actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export type MyListing = {
  id: string;
  status: string;
  section: string | null;
  quantity: number;
  priceAgorot: number;
  isSafePassExchange: boolean;
  note: string | null;
  eventNameHe: string;
  eventStartsAt: string;
};

export function MyListingRow({ listing }: { listing: MyListing }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [price, setPrice] = useState(String(listing.priceAgorot / 100));
  const [quantity, setQuantity] = useState(listing.quantity);
  const [section, setSection] = useState(listing.section ?? "");
  const [note, setNote] = useState(listing.note ?? "");

  const canManage = listing.status === "ACTIVE" || listing.status === "PENDING_REVIEW";

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateListingAction({
        listingId: listing.id,
        priceAgorot: Math.round(Number(price) * 100),
        quantity,
        section: section || undefined,
        isSafePassExchange: listing.isSafePassExchange,
        note: note || undefined,
      });
      if ("error" in res) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function handleDelist() {
    if (!confirm("להסיר את הכרטיס מהמכירה?")) return;
    setError(null);
    startTransition(async () => {
      const res = await delistListingAction(listing.id);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-ink-900/5 shadow-card p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/listing/${listing.id}`} className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900 truncate">{listing.eventNameHe}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">{fmtDate(listing.eventStartsAt)}</p>
        </Link>
        <Badge tone={LISTING_STATUS_TONE[listing.status] ?? "neutral"}>
          {LISTING_STATUS_LABELS[listing.status] ?? listing.status}
        </Badge>
      </div>

      {!editing ? (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-900/5">
          <p className="font-black text-ink-900">{fmtAgorot(listing.priceAgorot)}</p>
          {canManage && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditing(true)}
                className="tap h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center"
                aria-label="עריכה"
              >
                <Pencil size={14} className="text-ink-700" />
              </button>
              <button
                onClick={handleDelist}
                disabled={isPending}
                className="tap h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center"
                aria-label="הסרה"
              >
                <Trash2 size={14} className="text-brand-600" />
              </button>
              <Link
                href={`/listing/${listing.id}`}
                className="tap h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center"
                aria-label="צפייה"
              >
                <ChevronLeft size={14} className="text-ink-700" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-ink-900/5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-ink-500 block mb-1">מחיר (₪)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                dir="ltr"
                className="w-full rounded-xl bg-ink-50 border border-ink-900/10 px-3 h-10 text-sm outline-none text-left"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink-500 block mb-1">כמות</label>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                dir="ltr"
                className="w-full rounded-xl bg-ink-50 border border-ink-900/10 px-3 h-10 text-sm outline-none text-left"
              />
            </div>
          </div>
          <input
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="אזור / שורה"
            className="w-full rounded-xl bg-ink-50 border border-ink-900/10 px-3 h-10 text-sm outline-none"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="הערה"
            className="w-full rounded-xl bg-ink-50 border border-ink-900/10 px-3 py-2 text-sm outline-none resize-none"
          />
          {error && <p className="text-[11px] text-brand-600 font-bold">{error}</p>}
          <div className="flex gap-2">
            <Button size="md" fullWidth disabled={isPending} onClick={handleSave}>
              {isPending ? "שומר…" : "שמירה"}
            </Button>
            <Button size="md" variant="outline" onClick={() => setEditing(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
