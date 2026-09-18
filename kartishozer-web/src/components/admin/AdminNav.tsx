"use client";

// ============================================================
// Admin navigation — the only admin UI that needs usePathname(),
// so it's the only piece that has to be a Client Component. Kept
// separate from AdminComponents.tsx: that file's components (like
// AdminStatCard) take a Lucide icon *component* as a prop, and a
// Server Component can't pass a raw function reference as a prop
// into a Client Component — React can't serialize it across that
// boundary and the page crashes with a generic "Server Components
// render" error. Everything in AdminComponents.tsx stays a plain
// Server Component so that keeps working.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  AlertTriangle,
  Wallet,
  Users,
  Settings,
  ScrollText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

const NAV: { href: string; icon: LucideIcon; label: string; exact?: boolean }[] = [
  { href: "/admin", icon: LayoutDashboard, label: "סקירה", exact: true },
  { href: "/admin/analytics", icon: BarChart3, label: "אנליטיקס" },
  { href: "/admin/listings", icon: Ticket, label: "מודעות" },
  { href: "/admin/disputes", icon: AlertTriangle, label: "סכסוכים" },
  { href: "/admin/payouts", icon: Wallet, label: "תשלומים" },
  { href: "/admin/users", icon: Users, label: "משתמשים" },
  { href: "/admin/config", icon: Settings, label: "הגדרות" },
  { href: "/admin/audit", icon: ScrollText, label: "יומן פעולות" },
];

function isNavItemActive(pathname: string, item: (typeof NAV)[number]) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== "/admin";
}

// Desktop-only (md+): the full-height side rail. Hidden on mobile — at
// phone widths this used to sit alongside the main content as a second
// narrow column, squeezing everything into two illegible halves. See
// AdminMobileNav below for the phone equivalent.
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-52 flex-shrink-0 bg-gray-900 border-l border-white/10 flex-col">
      <div className="px-4 py-4 border-b border-white/10">
        <p className="text-xs font-black text-white/50 uppercase tracking-widest">
          Admin
        </p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5",
              ].join(" ")}
            >
              <Icon size={15} strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Mobile-only (below md): a horizontally-scrollable pill strip instead of
// a side rail — a fixed bottom nav (like the consumer app's) would only
// fit ~5 items comfortably, and this panel has 7 sections. Scroll-x pills
// keep every section one thumb-swipe away without shrinking below a
// tappable size.
export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex gap-1.5 overflow-x-auto px-3 py-2.5 bg-gray-900 border-b border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {NAV.map((item) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap",
              active ? "bg-white text-gray-950" : "bg-white/5 text-white/60",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={2.25} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
