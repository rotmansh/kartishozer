"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Heart, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "בית", icon: Home, exact: true },
  { href: "/search", label: "חיפוש", icon: Search },
  { href: "/sell", label: "מכירה", icon: PlusCircle, cta: true },
  { href: "/favorites", label: "מועדפים", icon: Heart },
  { href: "/profile", label: "פרופיל", icon: User },
];

export function BottomNav() {
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
                <Icon
                  size={22}
                  className={active ? "text-brand" : "text-ink-300"}
                  strokeWidth={active ? 2.4 : 2}
                />
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
