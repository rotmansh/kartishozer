"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PreviewBanner } from "./PreviewBanner";
import { BottomNav } from "./BottomNav";

// "/messages/" (with the trailing slash) matches a specific thread, not
// the "/messages" list — the thread view needs the full screen height for
// its own sticky composer, same reasoning as checkout.
const NO_NAV_PREFIXES = ["/sign-in", "/sign-up", "/checkout", "/messages/"];

export function AppShell({ children, unreadCount = 0 }: { children: ReactNode; unreadCount?: number }) {
  const pathname = usePathname();

  // The admin back-office is a separate, desktop-oriented tool with its
  // own full-width layout — it must not be squeezed into the mobile
  // consumer frame (or get the consumer bottom nav/banner).
  if (pathname.startsWith("/admin")) return <>{children}</>;

  const hideNav = NO_NAV_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <div className="app-shell shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      <PreviewBanner />
      <div className={hideNav ? "" : "pb-24"}>{children}</div>
      {!hideNav && <BottomNav unreadCount={unreadCount} />}
    </div>
  );
}
