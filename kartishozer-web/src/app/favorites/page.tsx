"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { getListing } from "@/lib/mock/listings";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function FavoritesPage() {
  const { ids, isLoaded } = useFavorites();
  const listings = ids.map((id) => getListing(id)).filter((l): l is NonNullable<typeof l> => !!l);

  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-black text-ink-900">מועדפים</h1>
        <p className="text-sm text-ink-500 mt-0.5">כרטיסים ששמרתם לצפייה מאוחר יותר</p>
      </div>

      {isLoaded && listings.length === 0 ? (
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
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
