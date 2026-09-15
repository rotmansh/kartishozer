import Link from "next/link";
import { Heart } from "lucide-react";
import { getAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getEvent, getMinPriceAgorot, getListingCount } from "@/lib/queries/catalog";
import { ListingCard } from "@/components/ListingCard";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/SectionHeader";
import type { Listing, CategorySlug } from "@/lib/types";

export default async function FavoritesPage() {
  const user = await getAppUser();

  const [favorites, eventFavorites] = await Promise.all([
    user
      ? db.favorite.findMany({
          where: { userId: user.id, listing: { deletedAt: null } },
          include: { listing: { include: { vendor: { include: { user: true } } } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    user
      ? db.eventFavorite.findMany({
          where: { userId: user.id },
          include: { event: { include: { venue: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const favoritedEvents = await Promise.all(
    eventFavorites.map(async ({ event }) => ({
      event: {
        id: event.id,
        nameHe: event.nameHe,
        category: event.category as CategorySlug,
        venue: { id: event.venue.id, nameHe: event.venue.nameHe, city: event.venue.city },
        startsAt: event.startsAt.toISOString(),
        descriptionHe: event.descriptionHe,
        gradient: [event.gradientFrom, event.gradientTo] as [string, string],
        emoji: event.emoji,
      },
      minPriceAgorot: await getMinPriceAgorot(event.id),
      listingCount: await getListingCount(event.id),
    }))
  );

  const listings: { listing: Listing; eventItem: Awaited<ReturnType<typeof getEvent>> }[] = await Promise.all(
    favorites.map(async (f) => {
      const l = f.listing;
      const listing: Listing = {
        id: l.id,
        eventId: l.eventId,
        seller: {
          id: l.vendor.id,
          displayName: l.vendor.displayName,
          isVerified: l.vendor.isVerified,
          verificationLevel: l.vendor.verificationLevel,
          salesCount: 0,
          memberSince: l.vendor.createdAt.toISOString(),
        },
        status: l.status === "PENDING_REVIEW" ? "PENDING_REVIEW" : l.status === "SOLD" ? "SOLD" : "ACTIVE",
        section: l.section ?? undefined,
        quantity: l.quantity,
        priceAgorot: l.priceAgorot,
        faceValueAgorot: l.faceValueAgorot,
        isSafePassExchange: l.isSafePassExchange,
        note: l.note ?? undefined,
        createdAt: l.createdAt.toISOString(),
      };
      return { listing, eventItem: await getEvent(l.eventId) };
    })
  );

  const isEmpty = listings.length === 0 && favoritedEvents.length === 0;

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-black text-ink-900">מועדפים</h1>
        <p className="text-sm text-ink-500 mt-0.5">אירועים וכרטיסים ששמרתם לצפייה מאוחר יותר</p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Heart size={26} />}
          title="עדיין אין מועדפים"
          subtitle="לחצו על הלב באירוע או בכרטיס כדי לשמור אותו כאן"
          action={
            <Link href="/search">
              <Button>לחיפוש כרטיסים</Button>
            </Link>
          }
        />
      ) : (
        <>
          {favoritedEvents.length > 0 && (
            <div className="mb-6">
              <SectionHeader title="אירועים שמורים" />
              <div className="px-4 space-y-3">
                {favoritedEvents.map(({ event, minPriceAgorot, listingCount }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    minPriceAgorot={minPriceAgorot}
                    listingCount={listingCount}
                    isFavorited
                    canFavorite
                  />
                ))}
              </div>
            </div>
          )}

          {listings.length > 0 && (
            <div>
              <SectionHeader title="כרטיסים שמורים" />
              <div className="px-4 space-y-3">
                {listings.map(({ listing, eventItem }) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    event={eventItem ?? undefined}
                    isFavorited
                    canFavorite
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
