import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategory } from "@/lib/mock/categories";
import { getEventsByCategory, getMinPriceAgorot, getListingCount } from "@/lib/queries/catalog";
import { getAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { CalendarX } from "lucide-react";

type Props = { params: { slug: string } };

export function generateMetadata({ params }: Props): Metadata {
  const category = getCategory(params.slug);
  return { title: category ? `${category.labelHe} | כרטיס חוזר` : "כרטיס חוזר" };
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategory(params.slug);
  if (!category) notFound();

  const [events, user] = await Promise.all([getEventsByCategory(category.slug), getAppUser()]);
  const eventsWithStats = await Promise.all(
    events.map(async (e) => ({
      event: e,
      minPriceAgorot: await getMinPriceAgorot(e.id),
      listingCount: await getListingCount(e.id),
    }))
  );

  const eventFavoriteIds = user
    ? new Set(
        (
          await db.eventFavorite.findMany({
            where: { userId: user.id, eventId: { in: events.map((e) => e.id) } },
            select: { eventId: true },
          })
        ).map((f) => f.eventId)
      )
    : new Set<string>();

  return (
    <div>
      <TopBar title={category.labelHe} />
      <div
        className="mx-4 mt-3 mb-4 rounded-3xl p-5 text-white"
        style={{ background: `linear-gradient(135deg, ${category.gradient[0]}, ${category.gradient[1]})` }}
      >
        <p className="text-2xl mb-1">{category.emoji}</p>
        <p className="font-black text-lg">{category.labelHe}</p>
        <p className="text-xs text-white/80 mt-0.5">{events.length} אירועים קרובים</p>
      </div>

      <div className="px-4 space-y-3">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarX size={26} />}
            title="אין אירועים כרגע"
            subtitle="חזרו לבדוק בקרוב — אירועים חדשים מתווספים כל הזמן"
          />
        ) : (
          eventsWithStats.map(({ event, minPriceAgorot, listingCount }) => (
            <EventCard
              key={event.id}
              event={event}
              minPriceAgorot={minPriceAgorot}
              listingCount={listingCount}
              isFavorited={eventFavoriteIds.has(event.id)}
              canFavorite={!!user}
            />
          ))
        )}
      </div>
    </div>
  );
}
