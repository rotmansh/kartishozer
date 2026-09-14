"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function TopBar({
  title,
  action,
  transparent,
}: {
  title?: string;
  action?: ReactNode;
  transparent?: boolean;
}) {
  const router = useRouter();

  return (
    <header
      className={
        transparent
          ? "sticky top-0 z-30 flex items-center justify-between px-3 h-14"
          : "sticky top-0 z-30 flex items-center justify-between px-3 h-14 bg-ink-50/90 backdrop-blur border-b border-ink-900/5"
      }
    >
      <button
        onClick={() => router.back()}
        aria-label="חזרה"
        className={
          transparent
            ? "tap h-10 w-10 rounded-full bg-white/90 shadow-card flex items-center justify-center"
            : "tap h-10 w-10 rounded-full bg-white flex items-center justify-center border border-ink-900/5"
        }
      >
        <ChevronRight size={20} className="text-ink-900" />
      </button>
      {title && <h1 className="text-[15px] font-black text-ink-900 truncate">{title}</h1>}
      <div className="h-10 w-10 flex items-center justify-center">{action}</div>
    </header>
  );
}
