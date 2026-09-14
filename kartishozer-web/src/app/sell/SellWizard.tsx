"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Minus,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  PartyPopper,
} from "lucide-react";
import { searchEventsForSellAction } from "@/lib/actions/events.actions";
import { createListingAction } from "@/lib/actions/listings.actions";
import { fmtAgorot, fmtDate } from "@/lib/format";
import { markupPercent } from "@/lib/types";
import type { EventItem } from "@/lib/types";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const MAX_RECOMMENDED_MARKUP = 20; // mirrors admin platform config: max_markup_percent

type Step = 1 | 2 | 3;

export function SellWizard() {
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get("eventId");

  const [step, setStep] = useState<Step>(1);
  const [result, setResult] = useState<{ status: "ACTIVE" | "PENDING_REVIEW" | "REJECTED"; listingId: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [eventQuery, setEventQuery] = useState("");
  const [manualEventName, setManualEventName] = useState("");
  const [, startSearchTransition] = useTransition();

  const [quantity, setQuantity] = useState(2);
  const [section, setSection] = useState("");
  const [faceValue, setFaceValue] = useState("");
  const [price, setPrice] = useState("");
  const [safePass, setSafePass] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    startSearchTransition(async () => {
      const found = await searchEventsForSellAction(eventQuery);
      setEvents(found);
      if (preselectedEventId && !selectedEvent) {
        const match = found.find((e) => e.id === preselectedEventId);
        if (match) setSelectedEvent(match);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventQuery]);

  const faceValueAgorot = Math.round(Number(faceValue || 0) * 100);
  const priceAgorot = Math.round(Number(price || 0) * 100);
  const markup = markupPercent(priceAgorot, faceValueAgorot);
  const overMarkup = faceValueAgorot > 0 && markup > MAX_RECOMMENDED_MARKUP;

  const canContinueStep1 = !!selectedEvent || manualEventName.trim().length > 2;
  const canContinueStep2 =
    quantity > 0 && faceValueAgorot > 0 && priceAgorot > 0 && !overMarkup;

  async function handlePublish() {
    if (!selectedEvent) {
      setSubmitError("כרגע ניתן לפרסם כרטיס רק לאירוע קיים ברשימה — תמיכה בהוספת אירועים חדשים תגיע בהמשך");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const res = await createListingAction({
      eventId: selectedEvent.id,
      section: section || undefined,
      quantity,
      faceValueAgorot,
      priceAgorot,
      isSafePassExchange: safePass,
      note: note || undefined,
    });
    setSubmitting(false);
    if ("error" in res) {
      setSubmitError(res.error);
      return;
    }
    // status isn't returned directly, but a fresh read isn't needed here —
    // the confirmation screen already explains the review step regardless.
    setResult({ status: "PENDING_REVIEW", listingId: res.listingId });
  }

  if (result) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-10 gap-4">
        <div className="h-20 w-20 rounded-full bg-accent-50 flex items-center justify-center">
          <PartyPopper size={34} className="text-accent-600" />
        </div>
        <h1 className="text-xl font-black text-ink-900">הכרטיס פורסם!</h1>
        <p className="text-sm text-ink-500 max-w-[32ch] leading-relaxed">
          הכרטיס נשמר במערכת. כרטיסים עם ציון סיכון נמוך עולים לאתר מיד;
          כרטיסים שסומנו לבדיקה יעלו לאחר אישור מנהל/ת.
        </p>
        <div className="w-full max-w-xs space-y-2.5 pt-2">
          <Link href="/profile">
            <Button fullWidth>לצפייה בליסטינגים שלי</Button>
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
    <div className="pb-28">
      <TopBar title="מכירת כרטיס" />

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn("h-1.5 flex-1 rounded-full", s <= step ? "bg-brand" : "bg-ink-100")}
          />
        ))}
      </div>
      <p className="px-4 text-[11px] font-bold text-ink-400 mb-4">שלב {step} מתוך 3</p>

      {step === 1 && (
        <div className="px-4 space-y-4">
          <div>
            <h2 className="text-lg font-black text-ink-900 mb-1">איזה אירוע?</h2>
            <p className="text-sm text-ink-500">חפשו את האירוע שיש לכם כרטיס אליו</p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white border border-ink-900/10 px-3.5 h-12 shadow-card">
            <Search size={18} className="text-ink-500 flex-shrink-0" />
            <input
              value={eventQuery}
              onChange={(e) => {
                setEventQuery(e.target.value);
                setSelectedEvent(null);
              }}
              placeholder="שם ההופעה, ההצגה או האירוע…"
              className="flex-1 bg-transparent outline-none text-sm placeholder-ink-300 min-w-0"
            />
          </div>

          <div className="space-y-2">
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setSelectedEvent(e);
                  setManualEventName("");
                }}
                className={cn(
                  "tap w-full flex items-center gap-3 rounded-2xl border p-3 text-right",
                  selectedEvent?.id === e.id ? "border-brand bg-brand-50" : "border-ink-900/10 bg-white"
                )}
              >
                <span className="text-2xl flex-shrink-0">{e.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-ink-900 truncate">{e.nameHe}</p>
                  <p className="text-[11px] text-ink-500">
                    {fmtDate(e.startsAt)} · {e.venue.city}
                  </p>
                </div>
                {selectedEvent?.id === e.id && <CheckCircle2 size={20} className="text-brand flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <p className="text-xs font-bold text-ink-400 mb-2">לא מוצאים את האירוע?</p>
            <input
              value={manualEventName}
              onChange={(e) => {
                setManualEventName(e.target.value);
                setSelectedEvent(null);
              }}
              placeholder="הקלידו שם אירוע, מקום ותאריך"
              className="w-full rounded-2xl bg-white border border-ink-900/10 px-4 h-12 text-sm outline-none placeholder-ink-300"
            />
            {manualEventName.trim().length > 2 && (
              <p className="text-[11px] text-ink-400 mt-1.5">
                תמיכה בהוספת אירועים חדשים תגיע בקרוב — כרגע אפשר לפרסם רק לאירוע קיים.
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="px-4 space-y-5">
          <div>
            <h2 className="text-lg font-black text-ink-900 mb-1">פרטי הכרטיס</h2>
            <p className="text-sm text-ink-500">
              {selectedEvent ? selectedEvent.nameHe : manualEventName}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-500 block mb-2">כמות כרטיסים</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="tap h-11 w-11 rounded-2xl bg-ink-100 flex items-center justify-center"
              >
                <Minus size={18} />
              </button>
              <span className="text-lg font-black text-ink-900 w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="tap h-11 w-11 rounded-2xl bg-ink-100 flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-500 block mb-2">אזור / שורה (אופציונלי)</label>
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="לדוגמה: יציע מזרחי, שורה 12"
              className="w-full rounded-2xl bg-white border border-ink-900/10 px-4 h-12 text-sm outline-none placeholder-ink-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-ink-500 block mb-2">מחיר פנים (₪)</label>
              <input
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                dir="ltr"
                className="w-full rounded-2xl bg-white border border-ink-900/10 px-4 h-12 text-sm outline-none placeholder-ink-300 text-left"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-500 block mb-2">המחיר שלכם (₪)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                dir="ltr"
                className="w-full rounded-2xl bg-white border border-ink-900/10 px-4 h-12 text-sm outline-none placeholder-ink-300 text-left"
              />
            </div>
          </div>

          {faceValueAgorot > 0 && priceAgorot > 0 && (
            <div
              className={cn(
                "rounded-2xl p-3.5 text-xs font-bold flex items-start gap-2",
                overMarkup ? "bg-brand-50 text-brand-600" : "bg-accent-50 text-accent-600"
              )}
            >
              {overMarkup ? <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> : <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />}
              <span>
                {overMarkup
                  ? `המחיר גבוה ב-${markup}% ממחיר הפנים — מעל התקרה המומלצת של ${MAX_RECOMMENDED_MARKUP}%. הורידו את המחיר כדי להמשיך.`
                  : markup > 0
                  ? `המחיר גבוה ב-${markup}% ממחיר הפנים — בטווח המקובל.`
                  : "המחיר שלכם נמוך ממחיר הפנים או שווה לו."}
              </span>
            </div>
          )}

          <button
            onClick={() => setSafePass((v) => !v)}
            className="w-full flex items-center justify-between rounded-2xl bg-white border border-ink-900/10 p-4"
          >
            <div className="text-right">
              <p className="text-sm font-bold text-ink-900">העברה דיגיטלית מאובטחת</p>
              <p className="text-[11px] text-ink-500 mt-0.5">הכרטיס יועבר דרך המערכת, ללא מפגש אישי</p>
            </div>
            <span
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative flex-shrink-0",
                safePass ? "bg-accent-500" : "bg-ink-200"
              )}
            >
              <span
                className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
                style={{ right: safePass ? "22px" : "4px" }}
              />
            </span>
          </button>

          <div>
            <label className="text-xs font-bold text-ink-500 block mb-2">הערה לקונה/ה (אופציונלי)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="לדוגמה: הכרטיסים צמודים, לא ניתן להפריד"
              className="w-full rounded-2xl bg-white border border-ink-900/10 px-4 py-3 text-sm outline-none placeholder-ink-300 resize-none"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="px-4 space-y-4">
          <div>
            <h2 className="text-lg font-black text-ink-900 mb-1">סקירה ופרסום</h2>
            <p className="text-sm text-ink-500">בדקו שהכל נכון לפני פרסום</p>
          </div>

          <div className="bg-white rounded-2xl border border-ink-900/5 shadow-card p-4 space-y-3">
            <Row label="אירוע" value={selectedEvent ? selectedEvent.nameHe : manualEventName} />
            {selectedEvent && (
              <Row label="תאריך" value={`${fmtDate(selectedEvent.startsAt)} · ${selectedEvent.venue.city}`} />
            )}
            <Row label="כמות" value={String(quantity)} />
            {section && <Row label="אזור" value={section} />}
            <Row label="מחיר פנים" value={fmtAgorot(faceValueAgorot)} />
            <Row label="המחיר שלכם" value={fmtAgorot(priceAgorot)} bold />
            <Row label="העברה" value={safePass ? "דיגיטלית מאובטחת" : "תיאום ישיר מול הקונה"} />
          </div>

          {submitError && (
            <div className="rounded-2xl bg-brand-50 text-brand-600 p-3.5 text-xs font-bold text-center">
              {submitError}
            </div>
          )}

          <div className="rounded-2xl bg-ink-100 p-3.5 text-xs text-ink-700 leading-relaxed">
            לאחר הפרסום, הכרטיס יעבור בדיקת אבטחה קצרה (מחיר חשוד, חשבון חדש,
            ריבוי פרסומים) לפני שהוא עולה לאתר — בדיוק כמו בלוח הבקרה הניהולי.
          </div>
        </div>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-16 inset-x-0 z-30 max-w-app mx-auto px-4 pb-3 pt-4 bg-gradient-to-t from-ink-50 via-ink-50/95 to-transparent flex gap-2.5">
        {step > 1 && (
          <Button variant="outline" size="lg" onClick={() => setStep((s) => (s - 1) as Step)}>
            הקודם
          </Button>
        )}
        {step < 3 ? (
          <Button
            size="lg"
            fullWidth
            disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            המשך
          </Button>
        ) : (
          <Button size="lg" fullWidth disabled={submitting} onClick={handlePublish}>
            {submitting ? "מפרסם…" : "פרסום כרטיס"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className={bold ? "font-black text-ink-900" : "font-bold text-ink-700"}>{value}</span>
    </div>
  );
}
