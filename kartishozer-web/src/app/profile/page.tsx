import Link from "next/link";
import {
  Ticket,
  ShoppingBag,
  BadgeCheck,
  Bell,
  ShieldQuestion,
  HelpCircle,
  ChevronLeft,
  UserRound,
  MessageCircle,
} from "lucide-react";
import { getAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { fmtAgorot, fmtDate } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/status-labels";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MyListingRow } from "@/components/MyListingRow";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ProfilePage() {
  const user = await getAppUser();

  if (!user) {
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

  const [myListings, myOrders, mySales] = await Promise.all([
    user.vendor
      ? db.listing.findMany({
          where: { vendorId: user.vendor.id, deletedAt: null },
          include: { event: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    db.order.findMany({
      where: { buyerId: user.id },
      include: { event: true, vendor: true, conversation: true },
      orderBy: { createdAt: "desc" },
    }),
    user.vendor
      ? db.order.findMany({
          where: { vendorId: user.vendor.id },
          include: { event: true, conversation: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

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
          {user.vendor?.isVerified ? (
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
        <div className="rounded-2xl bg-white border border-ink-900/5 shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <Ticket size={18} />
          </div>
          <div>
            <p className="text-lg font-black text-ink-900 leading-none">{myListings.length}</p>
            <p className="text-[11px] text-ink-500 mt-1">הליסטינגים שלי</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-ink-900/5 shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-lg font-black text-ink-900 leading-none">{myOrders.length}</p>
            <p className="text-[11px] text-ink-500 mt-1">ההזמנות שלי</p>
          </div>
        </div>
      </div>

      {/* My listings (sold tickets are ones with status SOLD inside this same list) */}
      <div className="mt-6">
        <h2 className="px-4 text-sm font-black text-ink-900 mb-2">הליסטינגים שלי</h2>
        {myListings.length === 0 ? (
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
        ) : (
          <div className="px-4 space-y-3">
            {myListings.map((l) => (
              <MyListingRow
                key={l.id}
                listing={{
                  id: l.id,
                  status: l.status,
                  section: l.section,
                  quantity: l.quantity,
                  priceAgorot: l.priceAgorot,
                  isSafePassExchange: l.isSafePassExchange,
                  note: l.note,
                  eventNameHe: l.event.nameHe,
                  eventStartsAt: l.event.startsAt.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Purchased tickets */}
      <div className="mt-6">
        <h2 className="px-4 text-sm font-black text-ink-900 mb-2">כרטיסים שקניתי</h2>
        {myOrders.length === 0 ? (
          <div className="px-4">
            <EmptyState icon={<ShoppingBag size={22} />} title="עדיין לא קניתם כרטיסים" />
          </div>
        ) : (
          <div className="px-4 space-y-3">
            {myOrders.map((o) => (
              <div key={o.id} className="rounded-2xl bg-white border border-ink-900/5 shadow-card p-4">
                <Link href={`/event/${o.eventId}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900 truncate">{o.event.nameHe}</p>
                      <p className="text-[11px] text-ink-500 mt-0.5">{fmtDate(o.createdAt.toISOString())}</p>
                    </div>
                    <Badge tone={ORDER_STATUS_TONE[o.status] ?? "neutral"}>
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <p className="font-black text-ink-900 mt-2">{fmtAgorot(o.totalAgorot)}</p>
                </Link>
                {o.conversation && (
                  <Link
                    href={`/messages/${o.conversation.id}`}
                    className="tap mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-brand-600"
                  >
                    <MessageCircle size={14} />
                    תיאום מסירה עם המוכר/ת
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sold tickets */}
      {user.vendor && (
        <div className="mt-6">
          <h2 className="px-4 text-sm font-black text-ink-900 mb-2">כרטיסים שמכרתי</h2>
          {mySales.length === 0 ? (
            <div className="px-4">
              <EmptyState icon={<Ticket size={22} />} title="עדיין לא נמכרו כרטיסים" />
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {mySales.map((o) => (
                <div key={o.id} className="rounded-2xl bg-white border border-ink-900/5 shadow-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-900 truncate">{o.event.nameHe}</p>
                      <p className="text-[11px] text-ink-500 mt-0.5">
                        נקנה על ידי {o.buyerName} · {fmtDate(o.createdAt.toISOString())}
                      </p>
                    </div>
                    <Badge tone={ORDER_STATUS_TONE[o.status] ?? "neutral"}>
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <p className="font-black text-ink-900 mt-2">{fmtAgorot(o.priceAgorot)}</p>
                  {o.conversation && (
                    <Link
                      href={`/messages/${o.conversation.id}`}
                      className="tap mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-brand-600"
                    >
                      <MessageCircle size={14} />
                      תיאום מסירה עם הקונה/ת
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Menu */}
      <div className="mt-6 mx-4 rounded-2xl bg-white border border-ink-900/5 shadow-card overflow-hidden divide-y divide-ink-900/5">
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
        <SignOutButton />
      </div>
    </div>
  );
}
