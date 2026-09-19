"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptTermsAction } from "@/lib/actions/legal.actions";
import { Button } from "@/components/ui/Button";

export function AcceptTermsForm({ redirectTo }: { redirectTo: string }) {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(() => {
      acceptTermsAction(redirectTo);
    });
  }

  return (
    <div>
      <label className="tap flex items-start gap-3 rounded-2xl bg-white border border-ink-900/5 shadow-card p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand"
        />
        <span className="text-sm text-ink-900 leading-relaxed">
          קראתי ואני מסכימ/ה{" "}
          <Link href="/terms" target="_blank" className="font-bold text-brand-600 underline">
            לתנאי השימוש
          </Link>{" "}
          ול
          <Link href="/privacy" target="_blank" className="font-bold text-brand-600 underline">
            מדיניות הפרטיות
          </Link>{" "}
          של כרטיס חוזר.
        </span>
      </label>

      <div className="mt-4">
        <Button size="lg" fullWidth disabled={!checked || isPending} onClick={handleSubmit}>
          {isPending ? "רק רגע..." : "המשך"}
        </Button>
      </div>
    </div>
  );
}
