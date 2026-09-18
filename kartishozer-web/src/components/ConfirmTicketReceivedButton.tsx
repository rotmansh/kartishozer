"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { confirmTicketReceivedAction } from "@/lib/actions/orders.actions";

export function ConfirmTicketReceivedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-accent-600">
        <CheckCircle2 size={14} />
        אישרתם קבלת הכרטיס
      </p>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await confirmTicketReceivedAction(orderId);
      if ("error" in res) setError(res.error);
      else {
        setDone(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink-900/5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="tap flex items-center gap-1.5 text-xs font-bold text-accent-600 disabled:opacity-40"
      >
        <CheckCircle2 size={14} />
        {isPending ? "מאשר..." : "אישור קבלת הכרטיס"}
      </button>
      {error && <p className="text-[11px] text-brand mt-1">{error}</p>}
    </div>
  );
}
