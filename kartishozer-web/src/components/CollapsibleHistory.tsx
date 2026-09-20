"use client";

// Generic collapsed-by-default section for anything that's real history —
// sold listings, or orders that already reached a final/near-final status
// — but shouldn't force an ever-growing scroll on a profile page just
// because it can never be deleted. Nothing here is hidden data loss:
// one tap shows every bit of it again.
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleHistory({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="tap w-full flex items-center justify-between rounded-2xl bg-ink-100 px-4 h-11 text-sm font-bold text-ink-700"
        aria-expanded={open}
      >
        <span>
          {open ? "הסתר" : "הצג"} {label} ({count})
        </span>
        <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}
