import Link from "next/link";
import {
  Ticket,
  ShoppingBag,
  BadgeCheck,
  ShieldQuestion,
  HelpCircle,
  ChevronLeft,
  UserRound,
  MessageCircle,
  LayoutDashboard,
  Heart,
  FileDown,
  Bell,
} from "lucide-react";
import { getAppUser, isAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { hasUnreadMessage } from "@/lib/queries/messages";
import { fmtAgorot, fmtDate } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/status-labels";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MyListingRow } from "@/components/MyListingRow";
import { SignOutButton } from "@/components/SignOutButton";
import { OpenDisputeButton } from "@/components/OpenDisputeButton";
import { DisputePanel } from "@/components/DisputePanel";
import { ConfirmTicketReceivedButton } from "@/components/ConfirmTicketReceivedButton";
import { SellerReviewForm } from "@/components/SellerReviewForm";
import { ResellOrderButton } from "@/components/ResellOrderButton";

export default async function ProfilePage() {
  const user = await getAppUser();

  if (!user) {
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<UserRound size={26} />}
          title="עדיין לא נכנסתם לחשבון"
          subtitle="התחברו כדי לראות מודעות, הזמנות ומועדפים"
          action={
            <Link href="/sign-in">
              <Button>התחברות / הרשמה</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const [myListings, myOrders, mySales, userIsAdmin] = await Promise.all([
    user.vendor
      ? db.listing.findMany({
          where: { vendorId: user.vendor.id, deletedAt: null },
          include: { event: true, ticketFile: { select: { id: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    db.order.findMany({
      where: { buyerId: user.id },
      include: {
        event: true,
        vendor: true,
        listing: { select: { ticketFile: { select: { id: true } } } },
        conversation: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
        sellerReview: { select: { id: true } },
        disputes: {
          where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
          select: {
            id: true,
            sellerResponse: true,
            evidence: { select: { id: true, uploaderRole: true, mimeType: true, createdAt: true, note: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    user.vendor
      ? db.order.findMany({
          where: { vendorId: user.vendor.id },
          include: {
            event: true,
            conversation: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
            disputes: {
              where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
              select: {
                id: true,
                sellerResponse: true,
                evidence: { select: { id: true, uploaderRole: true, mimeType: true, createdAt: true, note: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    isAdmin(),
  ]);

  // "התראות" was removed — there's no notification system behind it yet,
  // and a menu item that does nothing when tapped is worse than no item.
  // "לוח ניהול" only shows for admins — this is the one place a signed-in
  // admin can always get back into /admin without retyping the URL (the
  // admin panel's own "חזרה לאתר" link has no matching way back).
  // "מועדפים" moved here from the bottom nav — freeing that slot keeps
  // the nav's item count even, so the floating "מכירה" button sits
  // exactly in the middle instead of drifting off-center.
  const menuItems = [
    ...(userIsAdmin ? [{ icon: LayoutDashboard, label: "לוח ניהול", href: "/admin" }] : []),
    { icon: Heart, label: "מועדפים", href: "/favorites" },
    { icon: Bell, label: "העדפות התראות", href: "/profile/notifications" },
    { icon: ShieldQuestion, label: "אימות ואבטחה", href: "/user-profile" },
    { icon: HelpCircle, label: "עזרה ותמיכה", href: "/help" },
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
            <p className="text-[11px] text-ink-500 mt-1">המודעות שלי</p>
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
        <h2 className="px-4 text-sm font-black text-ink-900 mb-2">המודעות שלי</h2>
        {myListings.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={<Ticket size={22} />}
              title="אין לכם עדיין מודעות"
              subtitle="קניתם כרטיס שלא תוכלו להשתמש בו? זה הזמן למכור אותו הלאה"
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
                  hasTicketFile: Boolean(l.ticketFile),
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
                    {hasUnreadMessage(o.conversation, user.id) && (
                      <span className="h-2 w-2 rounded-full bg-brand" />
                    )}
                  </Link>
                )}
                {o.listing.ticketFile &&
                  ["PAID", "CONFIRMED", "TICKET_DELIVERED", "DISPUTED"].includes(o.status) && (
                    <a
                      href={`/api/tickets/${o.listingId}`}
                      className="tap mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-accent-600"
                    >
                      <FileDown size={14} />
                      צפייה בקובץ הכרטיס
                    </a>
                  )}
                {o.status === "PAID" && o.disputes.length === 0 && (
                  <ConfirmTicketReceivedButton orderId={o.id} />
                )}
                {["PAID", "CONFIRMED", "TICKET_DELIVERED"].includes(o.status) &&
                  (o.disputes.length > 0 ? (
                    <DisputePanel
                      disputeId={o.disputes[0].id}
                      viewerRole="BUYER"
                      sellerResponse={o.disputes[0].sellerResponse}
                      evidence={o.disputes[0].evidence.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
                    />
                  ) : (
                    <OpenDisputeButton orderId={o.id} />
                  ))}
                {["TICKET_DELIVERED", "CONFIRMED"].includes(o.status) &&
                  o.disputes.length === 0 &&
                  !o.sellerReview && <SellerReviewForm orderId={o.id} />}
                {["PAID", "CONFIRMED", "TICKET_DELIVERED"].includes(o.status) &&
                  o.disputes.length === 0 &&
                  !o.resoldAsListingId &&
                  o.event.startsAt.getTime() >= Date.now() && <ResellOrderButton orderId={o.id} />}
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
                      {hasUnreadMessage(o.conversation, user.id) && (
                        <span className="h-2 w-2 rounded-full bg-brand" />
                      )}
                    </Link>
                  )}
                  {o.disputes.length > 0 && (
                    <DisputePanel
                      disputeId={o.disputes[0].id}
                      viewerRole="SELLER"
                      sellerResponse={o.disputes[0].sellerResponse}
                      evidence={o.disputes[0].evidence.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
                    />
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
          <Link
            key={item.label}
            href={item.href}
            className="tap w-full flex items-center gap-3 px-4 py-3.5 text-right"
          >
            <item.icon size={18} className="text-ink-500 flex-shrink-0" />
            <span className="flex-1 text-sm font-bold text-ink-900">{item.label}</span>
            <ChevronLeft size={16} className="text-ink-300" />
          </Link>
        ))}
      </div>

      <div className="px-4 mt-4">
        <SignOutButton />
      </div>
    </div>
  );
}
