"use server";

import { db } from "@/lib/db";
import { getMinPriceAgorot, getListingCount } from "@/lib/queries/catalog";
import type { EventItem, CategorySlug } from "@/lib/types";

export type SearchSortKey = "date" | "price_asc" | "price_desc";
export type WhenFilter = "today" | "tomorrow" | "week" | "month";

export type SearchResultItem = {
  event: EventItem;
  minPriceAgorot: number | null;
  listingCount: number;
};

// Calendar-day boundaries (server local time — close enough for a quick
// "today/tomorrow" filter; not worth the added complexity of tracking the
// viewer's own timezone for this).
function whenRange(when: WhenFilter): { gte: Date; lt: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 3600 * 1000);

  switch (when) {
    case "today":
      return { gte: now, lt: startOfTomorrow };
    case "tomorrow":
      return { gte: startOfTomorrow, lt: new Date(startOfTomorrow.getTime() + 24 * 3600 * 1000) };
    case "week":
      return { gte: now, lt: new Date(now.getTime() + 7 * 24 * 3600 * 1000) };
    case "month":
      return { gte: now, lt: new Date(now.getTime() + 30 * 24 * 3600 * 1000) };
  }
}

export async function searchCatalogAction(input: {
  query: string;
  category: CategorySlug | null;
  sort: SearchSortKey;
  when?: WhenFilter | null;
}): Promise<SearchResultItem[]> {
  const q = input.query.trim();
  const whenBounds = input.when ? whenRange(input.when) : null;

  const events = await db.event.findMany({
    where: {
      startsAt: whenBounds ?? { gte: new Date() },
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
