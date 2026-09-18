import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock, MapPin, Info, Ticket as TicketIcon } from "lucide-react";
import { getEvent, getListingsByEvent } from "@/lib/queries/catalog";
import { getCategory } from "@/lib/mock/categories";
import { getAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { computePriceIndex } from "@/lib/types";
import { fmtEventDateLong, fmtTime } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { ListingCard } from "@/components/ListingCard";
import { PriceTransparencyIndex } from "@/components/PriceTransparencyIndex";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CategoryArt } from "@/components/CategoryArt";
import { EventFavoriteButton } from "@/components/EventFavoriteButton";
import { WaitlistButton } from "@/components/WaitlistButton";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEvent(params.id);
  return { title: event ? `${event.nameHe} | כרטיס חוזר` : "כרטיס חוזר" };
}

export default async function EventDetailsPage({ params }: Props) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  const [listings, user] = await Promise.all([getListingsByEvent(event.id), getAppUser()]);
  const category = getCategory(event.category);
  const priceIndex = computePriceIndex(listings);

  const favoriteIds = user
    ? new Set(
        (
          await db.favorite.findMany({
            where: { userId: user.id, listingId: { in: listings.map((l) => l.id) } },
            select: { listingId: true },
          })
        ).map((f) => f.listingId)
      )
    : new Set<string>();

  const isEventFavorited = user
    ? !!(await db.eventFavorite.findUnique({ where: { userId_eventId: { userId: user.id, eventId: event.id } } }))
    : false;

  const isOnWaitlist =
    user && listings.length === 0
      ? !!(await db.eventWaitlist.findUnique({ where: { userId_eventId: { userId: user.id, eventId: event.id } } }))
      : false;

  return (
    <div className="pb-6">
      <TopBar
        transparent
        action={<EventFavoriteButton eventId={event.id} isFavorited={isEventFavorited} canFavorite={!!user} />}
      />

      <div
        className="-mt-14 pt-14 pb-8 px-4 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${event.gradient[0]}, ${event.gradient[1]})` }}
      >
        <CategoryArt category={event.category} eventId={event.id} createdAt={event.createdAt} />
        <span className="relative text-4xl block mb-2">{event.emoji}</span>
        {category && (
          <span className="relative inline-block rounded-full bg-black/20 backdrop-blur px-2.5 py-1 text-[11px] font-bold mb-2">
            {category.labelHe}
          </span>
        )}
        <h1 className="relative text-xl font-black leading-snug">{event.nameHe}</h1>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white rounded-3xl shadow-card border border-ink-900/5 p-4 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar size={17} className="text-brand flex-shrink-0" />
            <span className="text-ink-900 font-bold">{fmtEventDateLong(event)}</span>
          </div>
          {!event.isOpenDate && (
            <div className="flex items-center gap-2.5 text-sm">
              <Clock size={17} className="text-brand flex-shrink-0" />
              <span className="text-ink-700">{fmtTime(event.startsAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin size={17} className="text-brand flex-shrink-0" />
            <span className="text-ink-700">
              {event.venue.nameHe}, {event.venue.city}
            </span>
          </div>
        </div>

        {event.descriptionHe && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-ink-100 p-3.5">
            <Info size={16} className="text-ink-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ink-700 leading-relaxed">{event.descriptionHe}</p>
          </div>
        )}

        <div className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-ink-900">
              כרטיסים למכירה
              {listings.length > 0 && <span className="text-ink-400 font-bold"> · {listings.length}</span>}
            </h2>
          </div>

          {priceIndex && <PriceTransparencyIndex index={priceIndex} />}

          {listings.length === 0 ? (
            <EmptyState
              icon={<TicketIcon size={24} />}
              title="אין כרגע כרטיסים למכירה"
              subtitle="היו הראשונים למכור כרטיס לאירוע הזה, או קבלו עדכון כשיהיה כרטיס"
              action={
                <div className="flex flex-col items-center gap-2.5">
                  <Link href={`/sell?eventId=${event.id}`}>
                    <Button>למכירת כרטיס לאירוע זה</Button>
                  </Link>
                  <WaitlistButton eventId={event.id} isOnWaitlist={isOnWaitlist} canJoin={!!user} />
                </div>
              }
            />
          ) : (
            <div className="space-y-3">
              {listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  showEvent={false}
                  isFavorited={favoriteIds.has(l.id)}
                  canFavorite={!!user}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
