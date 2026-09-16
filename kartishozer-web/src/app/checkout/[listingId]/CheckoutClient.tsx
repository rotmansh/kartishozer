"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Smartphone,
  Wallet,
  WalletCards,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MapPin,
} from "lucide-react";
import type { Listing, EventItem } from "@/lib/types";
import { fmtAgorot, fmtEventDate, fmtTime } from "@/lib/format";
import { createOrderAction } from "@/lib/actions/orders.actions";
import { TopBar } from "@/components/layout/TopBar";
import { SellerBadge } from "@/components/SellerBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type PaymentMethod = "card" | "bit" | "apple_pay" | "google_pay";
type Totals = { priceAgorot: number; buyerFeeAgorot: number; totalAgorot: number };

export function CheckoutClient({
  listing,
  event,
  totals,
}: {
  listing: Listing | null;
  event: EventItem | null;
  totals: Totals | null;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!listing || !event || !totals) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-black text-ink-900 mb-2">הכרטיס לא נמצא</p>
        <p className="text-sm text-ink-500 mb-5">ייתכן שהוא כבר נמכר או שהקישור שגוי</p>
        <Link href="/search">
          <Button>חזרה לחיפוש</Button>
        </Link>
      </div>
    );
  }

  async function handleConfirm() {
    setProcessing(true);
    setError(null);
    const result = await createOrderAction(listing!.id);
    setProcessing(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 gap-4">
        <div className="h-20 w-20 rounded-full bg-accent-50 flex items-center justify-center">
          <CheckCircle2 size={36} className="text-accent-600" />
        </div>
        <h1 className="text-xl font-black text-ink-900">ההזמנה אושרה (דמו)</h1>
        <p className="text-sm text-ink-500 max-w-[34ch] leading-relaxed">
          זו הדגמה של תהליך תשלום — לא בוצע חיוב אמיתי דרך ספק סליקה. ההזמנה
          עצמה כן נשמרה במערכת ותוכלו לראות אותה בפרופיל שלכם.
        </p>
        <div className="w-full max-w-xs space-y-2.5 pt-2">
          <Link href="/profile">
            <Button fullWidth>לצפייה בהזמנות שלי</Button>
          </Link>
          <Link href="/">
            <Button fullWidth variant="outline">
              חזרה לדף הבית
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <TopBar title="סיכום הזמנה" />

      {/* Event + listing summary */}
      <div className="mx-4 mt-3 bg-white rounded-2xl border border-ink-900/5 shadow-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl flex-shrink-0">{event.emoji}</span>
          <div className="min-w-0">
            <p className="font-black text-sm text-ink-900 truncate">{event.nameHe}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-500 mt-0.5">
              <Calendar size={11} />
              {event.isOpenDate ? fmtEventDate(event) : `${fmtEventDate(event)} · ${fmtTime(event.startsAt)}`}
              <span className="mx-0.5">·</span>
              <MapPin size={11} />
              {event.venue.city}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-ink-900/5">
          <SellerBadge seller={listing.seller} size="sm" />
          <span className="text-xs font-bold text-ink-500">{listing.quantity} כרטיסים</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="mx-4 mt-4">
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-2 px-1">
          אמצעי תשלום (דמו)
        </p>
        <div className="space-y-2">
          {(
            [
              { key: "card", label: "כרטיס אשראי", icon: CreditCard },
              { key: "bit", label: "Bit", icon: Smartphone },
              { key: "google_pay", label: "Google Pay", icon: WalletCards },
              { key: "apple_pay", label: "Apple Pay", icon: Wallet },
            ] as { key: PaymentMethod; label: string; icon: typeof CreditCard }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMethod(opt.key)}
              className={cn(
                "tap w-full flex items-center gap-3 rounded-2xl border p-3.5 bg-white",
                method === opt.key ? "border-brand" : "border-ink-900/10"
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  method === opt.key ? "bg-brand-50 text-brand-600" : "bg-ink-100 text-ink-500"
                )}
              >
                <opt.icon size={17} />
              </div>
              <span className="flex-1 text-right text-sm font-bold text-ink-900">{opt.label}</span>
              <span
                className={cn(
                  "h-5 w-5 rounded-full border-2 flex-shrink-0",
                  method === opt.key ? "border-brand bg-brand" : "border-ink-200"
                )}
              />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 mt-2 px-1">
          לא נאספים פרטי תשלום אמיתיים בשלב זה של האתר.
        </p>
      </div>

      {/* Price breakdown */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-ink-900/5 shadow-card p-4 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">מחיר הכרטיס</span>
          <span className="text-ink-700">{fmtAgorot(totals.priceAgorot)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">עמלת שירות</span>
          <span className="text-ink-700">{fmtAgorot(totals.buyerFeeAgorot)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-ink-900/5">
          <span className="font-black text-ink-900">סה&quot;כ לתשלום</span>
          <span className="font-black text-brand text-lg">{fmtAgorot(totals.totalAgorot)}</span>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-2xl bg-brand-50 text-brand-600 p-3.5 text-xs font-bold text-center">
          {error}
        </div>
      )}

      <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl bg-ink-100 p-3.5">
        <ShieldCheck size={16} className="text-ink-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-700 leading-relaxed">
          התשלום נשמר בנאמנות עד לאישור קבלת הכרטיס. זהו מסך הדגמה —
          לא יבוצע חיוב אמיתי.
        </p>
      </div>

      <div
        className="fixed bottom-0 inset-x-0 z-30 max-w-app mx-auto px-4 pt-4 bg-white border-t border-ink-900/5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <Button size="lg" fullWidth disabled={processing} onClick={handleConfirm}>
          {processing ? "מעבד…" : `אישור הזמנה (דמו) · ${fmtAgorot(totals.totalAgorot)}`}
        </Button>
      </div>
    </div>
  );
}
