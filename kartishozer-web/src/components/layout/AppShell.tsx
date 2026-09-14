"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PreviewBanner } from "./PreviewBanner";
import { BottomNav } from "./BottomNav";

const NO_NAV_PREFIXES = ["/sign-in", "/sign-up", "/checkout"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = NO_NAV_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className="app-shell shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      <PreviewBanner />
      <div className={hideNav ? "" : "pb-24"}>{children}</div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
