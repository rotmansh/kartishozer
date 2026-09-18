"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { openDisputeAction } from "@/lib/actions/disputes.actions";

export function OpenDisputeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mt-3 pt-3 border-t border-ink-900/5 text-xs font-bold text-brand-600">
        הפנייה נשלחה — הכסף הוקפא והצוות שלנו יבדוק את זה
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-accent-600 w-full"
      >
        <AlertTriangle size={14} />
        הכרטיס לא עבד?
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await openDisputeAction({ orderId, reason });
      if ("error" in res) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink-900/5 space-y-2">
      <p className="text-xs font-bold text-ink-900">מה קרה עם הכרטיס?</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="תארו מה קרה (למשל: הכרטיס נדחה בכניסה, מספר ההזמנה לא תואם וכו')"
        rows={3}
        className="w-full rounded-xl border border-ink-900/10 px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:outline-none focus:border-accent-500"
      />
      {error && <p className="text-[11px] text-accent-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || reason.trim().length < 10}
          className="tap rounded-xl bg-accent-600 text-white text-xs font-bold px-4 py-2 disabled:opacity-40"
        >
          שליחת פנייה
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="tap rounded-xl bg-ink-100 text-ink-700 text-xs font-bold px-4 py-2"
        >
          ביטול
        </button>
      </div>
      <p className="text-[10px] text-ink-400">
        פתיחת פנייה מקפיאה מיידית את הכסף השמור עבור העסקה הזו עד לבירור.
      </p>
    </div>
  );
}
