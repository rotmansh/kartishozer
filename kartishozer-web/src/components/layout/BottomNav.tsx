"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

// Kept at 5 items (2 real tabs on each side of the "מכירה" CTA) — an odd
// count here is what keeps that floating button visually centered.
// "מועדפים" moved into the profile menu to make room for "הודעות"
// without breaking that balance.
const ITEMS = [
  { href: "/", label: "בית", icon: Home, exact: true },
  { href: "/search", label: "חיפוש", icon: Search },
  { href: "/sell", label: "מכירה", icon: PlusCircle, cta: true },
  { href: "/messages", label: "הודעות", icon: MessageCircle },
  { href: "/profile", label: "פרופיל", icon: User },
];

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-app mx-auto bg-white/95 backdrop-blur border-t border-ink-900/5 pb-safe-b">
        <div className="flex items-stretch justify-between px-2">
          {ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.cta) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="tap flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5"
                >
                  <span className="h-11 w-11 rounded-full bg-brand text-white flex items-center justify-center shadow-pop -mt-4">
                    <Icon size={22} />
                  </span>
                  <span className="text-[10px] font-bold text-ink-500">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="tap flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-w-0"
              >
                <span className="relative">
                  <Icon
                    size={22}
                    className={active ? "text-brand" : "text-ink-300"}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {item.href === "/messages" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-brand border-2 border-white" />
                  )}
                </span>
                <span className={cn("text-[10px] font-bold", active ? "text-brand" : "text-ink-300")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
