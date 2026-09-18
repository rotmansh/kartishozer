import { CheckCircle2, Circle, ShieldCheck, Clock } from "lucide-react";
import type { SellerVerificationLevel } from "@/lib/types";

const VERIFICATION_LABEL: Record<SellerVerificationLevel, string> = {
  NONE: "המוכר/ת טרם עברו אימות",
  BASIC: "טלפון ומייל של המוכר/ת אומתו",
  FULL: "זהות המוכר/ת אומתה במלואה",
};

/**
 * A concrete, itemized version of "we checked this" instead of an
 * invisible background process — every line here reflects something the
 * server actually verified, not a marketing claim. Deliberately leaves
 * out "event details match the listing": that would require reading the
 * ticket file's own content (OCR/PDF text extraction), which isn't built
 * yet — see ticketFiles.actions.ts. Never claims a duplicate check ran
 * when hasTicketFile is false; there's nothing to have checked yet.
 */
export function TicketPassport({
  hasTicketFile,
  verificationLevel,
}: {
  hasTicketFile: boolean;
  verificationLevel: SellerVerificationLevel;
}) {
  const items: { done: boolean; label: string }[] = [
    { done: hasTicketFile, label: "קובץ הכרטיס הועלה למערכת" },
    { done: hasTicketFile, label: "לא נמצאה כפילות בכרטיס חוזר" },
    { done: true, label: "מחיר המכירה עומד בכללי הפלטפורמה" },
    { done: verificationLevel !== "NONE", label: VERIFICATION_LABEL[verificationLevel] },
    { done: true, label: "הכסף מוגן עד לאחר האירוע" },
  ];

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl border border-ink-900/5 shadow-card p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ShieldCheck size={16} className="text-accent-600" />
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">דרכון הכרטיס</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 size={16} className="text-accent-600 flex-shrink-0" />
            ) : (
              <Circle size={16} className="text-ink-300 flex-shrink-0" />
            )}
            <span className={item.done ? "text-ink-900" : "text-ink-400"}>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-ink-900/5 text-[11px] text-ink-400 leading-relaxed">
        <Clock size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          &ldquo;לא נמצאה כפילות&rdquo; מתייחס לבדיקה מול שאר הכרטיסים שהועלו לכרטיס חוזר — אין לנו קשר למערכת המנפיקה של האירוע, ולכן זו לא אימות מול המנפיק המקורי.
        </span>
      </div>
    </div>
  );
}
