"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferenceAction } from "@/lib/actions/notificationPreferences.actions";
import type { NotificationPreferenceFlags } from "@/lib/notificationPreferences";
import { cn } from "@/lib/cn";

const ROWS: { key: keyof NotificationPreferenceFlags; label: string; subtitle: string }[] = [
  {
    key: "notifyNewMessage",
    label: "הודעות חדשות",
    subtitle: "כשקונה/מוכר/ת שולח/ת לכם הודעה בנוגע להזמנה",
  },
  {
    key: "notifyDisputeUpdate",
    label: "עדכוני מחלוקות",
    subtitle: "כשנפתחת מחלוקת על הזמנה שלכם, או מתקבל עדכון עליה",
  },
  {
    key: "notifyListingAvailable",
    label: "כרטיס זמין (רשימת המתנה)",
    subtitle: "כשנרשמתם לקבל עדכון על אירוע, וכרטיס ראשון התפרסם",
  },
];

function ToggleRow({
  label,
  subtitle,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  subtitle: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink-900">{label}</p>
        <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={cn(
          "tap flex-shrink-0 w-12 h-6 rounded-full relative transition-colors disabled:opacity-50",
          checked ? "bg-brand" : "bg-ink-200"
        )}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
          style={{ right: checked ? "22px" : "4px" }}
        />
      </button>
    </div>
  );
}

export function NotificationPreferenceToggles({ initial }: { initial: NotificationPreferenceFlags }) {
  const [prefs, setPrefs] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: keyof NotificationPreferenceFlags) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    startTransition(async () => {
      const result = await updateNotificationPreferenceAction(key, next);
      if ("error" in result) {
        // Revert on failure -- the toggle already flipped optimistically.
        setPrefs((p) => ({ ...p, [key]: !next }));
      }
    });
  }

  return (
    <div className="bg-white rounded-3xl border border-ink-900/5 shadow-card px-4 divide-y divide-ink-900/5">
      {ROWS.map((row) => (
        <ToggleRow
          key={row.key}
          label={row.label}
          subtitle={row.subtitle}
          checked={prefs[row.key]}
          disabled={isPending}
          onChange={() => handleToggle(row.key)}
        />
      ))}
    </div>
  );
}
