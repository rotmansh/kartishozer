"use client";

// ============================================================
// Admin shared UI components
// AdminSidebar · AdminStatCard · AdminBadge · AdminTable
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
  type LucideIcon,
} from "lucide-react";

// ── Sidebar / mobile nav (shared nav model) ────────────────────

const NAV: { href: string; icon: LucideIcon; label: string; exact?: boolean }[] = [
  { href: "/admin", icon: LayoutDashboard, label: "סקירה", exact: true },
  { href: "/admin/listings", icon: Ticket, label: "ליסטינגים" },
  { href: "/admin/disputes", icon: AlertTriangle, label: "סכסוכים" },
  { href: "/admin/payouts", icon: Wallet, label: "פייאוטים" },
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
        <p className="text-xs font-black text-white/30 uppercase tracking-widest">
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

// ── Stat card (dark theme) ────────────────────────────────────

export function AdminStatCard({
  label,
  value,
  sub,
  alert,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-1"
      style={{
        background: alert ? "rgba(232,80,58,0.1)" : "rgba(255,255,255,0.04)",
        borderColor: alert ? "rgba(232,80,58,0.3)" : "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white/40">{label}</p>
        {Icon && <Icon size={14} color={alert ? "#E8503A" : "rgba(255,255,255,0.2)"} />}
      </div>
      <p className="text-2xl font-black" style={{ color: alert ? "#E8503A" : "#fff" }}>
        {value}
      </p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(0,180,166,0.15)", text: "#00B4A6" },
  APPROVED: { bg: "rgba(0,180,166,0.15)", text: "#00B4A6" },
  OPEN: { bg: "rgba(232,80,58,0.15)", text: "#E8503A" },
  PENDING: { bg: "rgba(239,159,39,0.15)", text: "#EF9F27" },
  PENDING_REVIEW: { bg: "rgba(239,159,39,0.15)", text: "#EF9F27" },
  PROCESSING: { bg: "rgba(55,138,221,0.15)", text: "#378ADD" },
  PAID: { bg: "rgba(0,180,166,0.15)", text: "#00B4A6" },
  REJECTED: { bg: "rgba(232,80,58,0.15)", text: "#E8503A" },
  SUSPENDED: { bg: "rgba(232,80,58,0.15)", text: "#E8503A" },
  BLOCKED: { bg: "rgba(232,80,58,0.15)", text: "#E8503A" },
  HIGH: { bg: "rgba(232,80,58,0.15)", text: "#E8503A" },
  MEDIUM: { bg: "rgba(239,159,39,0.15)", text: "#EF9F27" },
  LOW: { bg: "rgba(0,180,166,0.15)", text: "#00B4A6" },
  RESOLVED_BUYER: { bg: "rgba(0,180,166,0.15)", text: "#00B4A6" },
  RESOLVED_SELLER: { bg: "rgba(99,153,34,0.15)", text: "#639922" },
  ON_HOLD: { bg: "rgba(239,159,39,0.15)", text: "#EF9F27" },
};

export function AdminBadge({ value }: { value: string }) {
  const c = BADGE_COLORS[value] ?? { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" };
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: c.bg, color: c.text }}
    >
      {value}
    </span>
  );
}

// ── Page header ───────────────────────────────────────────────

export function AdminPageHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-black text-white">{title}</h1>
        {count !== undefined && (
          <p className="text-xs text-white/30 mt-0.5">{count.toLocaleString()} רשומות</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────

export function AdminFilterTabs({
  tabs,
  active,
  baseHref,
  paramName = "status",
}: {
  tabs: { key: string | undefined; label: string; count?: number }[];
  active: string | undefined;
  baseHref: string;
  paramName?: string;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-5">
      {tabs.map((tab) => {
        const isActive = active === tab.key || (!active && !tab.key);
        return (
          <Link
            key={String(tab.key)}
            href={tab.key ? `${baseHref}?${paramName}=${tab.key}` : baseHref}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              isActive ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5",
            ].join(" ")}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`mr-1.5 ${isActive ? "text-white/50" : "text-white/20"}`}>{tab.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
