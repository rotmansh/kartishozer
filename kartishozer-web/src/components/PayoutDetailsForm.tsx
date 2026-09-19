"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Landmark, ShieldCheck } from "lucide-react";
import { updatePayoutDetailsAction } from "@/lib/actions/vendor.actions";
import { Button } from "@/components/ui/Button";

const BANKS = [
  "בנק לאומי",
  "בנק הפועלים",
  "בנק דיסקונט",
  "בנק מזרחי טפחות",
  "הבנק הבינלאומי",
  "בנק יהב",
  "בנק ירושלים",
  "One Zero",
  "אחר",
];

export function PayoutDetailsForm({
  currentBankAccountRef,
  defaultAccountHolderName,
}: {
  currentBankAccountRef: string | null;
  defaultAccountHolderName: string;
}) {
  const [editing, setEditing] = useState(!currentBankAccountRef);
  const [bankName, setBankName] = useState(BANKS[0]);
  const [last4, setLast4] = useState("");
  const [accountHolderName, setAccountHolderName] = useState(defaultAccountHolderName);
  const [error, setError] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState(currentBankAccountRef);
  const [isPending, startTransition] = useTransition();

  const canSubmit = bankName.trim().length > 0 && /^\d{4}$/.test(last4) && accountHolderName.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) {
      setError("יש למלא בנק, שם בעל החשבון, ו-4 ספרות אחרונות של מספר החשבון");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updatePayoutDetailsAction({ bankName, last4, accountHolderName });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedRef(`${bankName} · ${accountHolderName} · ****${last4}`);
      setEditing(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-ink-100 p-3.5 flex items-start gap-2.5">
        <ShieldCheck size={16} className="text-ink-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-700 leading-relaxed">
          זהו שלב הכנה בלבד — אנחנו לא שומרים מספר חשבון מלא, רק את שם הבנק
          ו-4 הספרות האחרונות, לצורך תצוגה. לאחר חיבור ספק סליקה אמיתי, הזנת
          פרטי התשלום המלאים תתבצע ישירות מול הספק, בצורה מאובטחת.
        </p>
      </div>

      {!editing && savedRef ? (
        <div className="bg-white rounded-2xl border border-ink-900/5 shadow-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Landmark size={18} className="text-accent-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-accent-600 flex items-center gap-1">
                <CheckCircle2 size={12} />
                חשבון מחובר
              </p>
              <p className="text-sm font-bold text-ink-900 truncate mt-0.5">{savedRef}</p>
            </div>
          </div>
          <button onClick={() => setEditing(true)} className="tap text-xs font-bold text-brand-600 flex-shrink-0">
            עדכון
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-900/5 shadow-card p-4 space-y-3.5">
          <div>
            <label htmlFor="payout-bank" className="text-xs font-bold text-ink-500 block mb-2">
              בנק
            </label>
            <select
              id="payout-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-2xl bg-ink-50 border border-ink-900/10 px-4 h-12 text-sm outline-none"
            >
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="payout-holder" className="text-xs font-bold text-ink-500 block mb-2">
              שם בעל/ת החשבון
            </label>
            <input
              id="payout-holder"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="כפי שמופיע בחשבון הבנק"
              className="w-full rounded-2xl bg-ink-50 border border-ink-900/10 px-4 h-12 text-sm outline-none placeholder-ink-300"
            />
          </div>
          <div>
            <label htmlFor="payout-last4" className="text-xs font-bold text-ink-500 block mb-2">
              4 ספרות אחרונות של מספר החשבון
            </label>
            <input
              id="payout-last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
              dir="ltr"
              className="w-full rounded-2xl bg-ink-50 border border-ink-900/10 px-4 h-12 text-sm outline-none placeholder-ink-300 text-left"
            />
          </div>
          {error && <p className="text-xs text-brand-600 font-bold">{error}</p>}
          <div className="flex gap-2">
            {savedRef && (
              <Button variant="outline" fullWidth onClick={() => setEditing(false)}>
                ביטול
              </Button>
            )}
            <Button fullWidth disabled={isPending || !canSubmit} onClick={handleSubmit}>
              {isPending ? "שומר…" : "שמירת פרטי תשלום"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
