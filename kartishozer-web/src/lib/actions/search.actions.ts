"use server";

import { db } from "@/lib/db";
import { getMinPriceAgorot, getListingCount } from "@/lib/queries/catalog";
import type { EventItem, CategorySlug } from "@/lib/types";

export type SearchSortKey = "date" | "price_asc" | "price_desc";

export type SearchResultItem = {
  event: EventItem;
  minPriceAgorot: number | null;
  listingCount: number;
};

export async function searchCatalogAction(input: {
  query: string;
  category: CategorySlug | null;
  sort: SearchSortKey;
}): Promise<SearchResultItem[]> {
  const q = input.query.trim();

  const events = await db.event.findMany({
    where: {
      startsAt: { gte: new Date() },
      ...(input.category ? { category: input.category } : {}),
      ...(q
        ? {
            OR: [
              { nameHe: { contains: q, mode: "insensitive" } },
              { venue: { nameHe: { contains: q, mode: "insensitive" } } },
              { venue: { city: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { venue: true },
    orderBy: input.sort === "date" ? { startsAt: "asc" } : undefined,
  });

  const items: SearchResultItem[] = await Promise.all(
    events.map(async (event) => ({
      event: {
        id: event.id,
        nameHe: event.nameHe,
        category: event.category as CategorySlug,
        venue: { id: event.venue.id, nameHe: event.venue.nameHe, city: event.venue.city },
        startsAt: event.startsAt.toISOString(),
        descriptionHe: event.descriptionHe,
        gradient: [event.gradientFrom, event.gradientTo],
        emoji: event.emoji,
      },
      minPriceAgorot: await getMinPriceAgorot(event.id),
      listingCount: await getListingCount(event.id),
    }))
  );

  if (input.sort !== "date") {
    items.sort((a, b) => {
      const pa = a.minPriceAgorot ?? Infinity;
      const pb = b.minPriceAgorot ?? Infinity;
      return input.sort === "price_asc" ? pa - pb : pb - pa;
    });
  }

  return items;
}
