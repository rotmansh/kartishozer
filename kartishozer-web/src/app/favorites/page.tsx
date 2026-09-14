import Link from "next/link";
import { Heart } from "lucide-react";
import { getAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getEvent } from "@/lib/queries/catalog";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { Listing } from "@/lib/types";

export default async function FavoritesPage() {
  const user = await getAppUser();

  const favorites = user
    ? await db.favorite.findMany({
        where: { userId: user.id, listing: { deletedAt: null } },
        include: { listing: { include: { vendor: { include: { user: true } } } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

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

  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-black text-ink-900">מועדפים</h1>
        <p className="text-sm text-ink-500 mt-0.5">כרטיסים ששמרתם לצפייה מאוחר יותר</p>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={<Heart size={26} />}
          title="עדיין אין מועדפים"
          subtitle="לחצו על הלב בכל כרטיס כדי לשמור אותו כאן"
          action={
            <Link href="/search">
              <Button>לחיפוש כרטיסים</Button>
            </Link>
          }
        />
      ) : (
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
      )}
    </div>
  );
}
