"use client";

import Link from "next/link";
import {
  Ticket,
  ShoppingBag,
  BadgeCheck,
  Bell,
  ShieldQuestion,
  HelpCircle,
  LogOut,
  ChevronLeft,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user, signOut } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn || !user) {
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<UserRound size={26} />}
          title="עדיין לא נכנסתם לחשבון"
          subtitle="התחברו כדי לראות ליסטינגים, הזמנות ומועדפים"
          action={
            <Link href="/sign-in">
              <Button>התחברות / הרשמה</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const menuItems = [
    { icon: Bell, label: "התראות" },
    { icon: ShieldQuestion, label: "אימות ואבטחה" },
    { icon: HelpCircle, label: "עזרה ותמיכה" },
  ];

  return (
    <div className="pb-4">
      {/* Account card */}
      <div className="mx-4 mt-4 rounded-3xl bg-ink-900 text-white p-5">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-brand flex items-center justify-center text-xl font-black flex-shrink-0">
            {user.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-black truncate">{user.fullName}</p>
            <p className="text-xs text-white/60 truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          {user.isSellerVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/20 text-accent-500 px-2.5 py-1 text-[11px] font-bold">
              <BadgeCheck size={13} />
              מוכר/ת מאומת/ת
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/70 px-2.5 py-1 text-[11px] font-bold">
              טרם עברתם אימות מוכר
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        <Link href="/profile" className="tap rounded-2xl bg-white border border-ink-900/5 shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <Ticket size={18} />
          </div>
          <div>
            <p className="text-lg font-black text-ink-900 leading-none">0</p>
            <p className="text-[11px] text-ink-500 mt-1">הליסטינגים שלי</p>
          </div>
        </Link>
        <Link href="/profile" className="tap rounded-2xl bg-white border border-ink-900/5 shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-lg font-black text-ink-900 leading-none">0</p>
            <p className="text-[11px] text-ink-500 mt-1">ההזמנות שלי</p>
          </div>
        </Link>
      </div>

      {/* My listings */}
      <div className="mt-6">
        <h2 className="px-4 text-sm font-black text-ink-900 mb-2">הליסטינגים שלי</h2>
        <div className="px-4">
          <EmptyState
            icon={<Ticket size={22} />}
            title="אין לכם עדיין ליסטינגים"
            subtitle="מכרתם כרטיס שלא תוכלו להשתמש בו? זה הזמן"
            action={
              <Link href="/sell">
                <Button>מכירת כרטיס ראשון</Button>
              </Link>
            }
          />
        </div>
      </div>

      {/* Menu */}
      <div className="mt-4 mx-4 rounded-2xl bg-white border border-ink-900/5 shadow-card overflow-hidden divide-y divide-ink-900/5">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="tap w-full flex items-center gap-3 px-4 py-3.5 text-right"
          >
            <item.icon size={18} className="text-ink-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-bold text-ink-900">{item.label}</span>
            <ChevronLeft size={16} className="text-ink-300" />
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        <Button variant="ghost" fullWidth icon={<LogOut size={16} />} onClick={signOut}>
          יציאה מהחשבון
        </Button>
      </div>
    </div>
  );
}
