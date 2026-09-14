"use server";

import { db } from "@/lib/db";
import type { EventItem, CategorySlug } from "@/lib/types";

export async function searchEventsForSellAction(query: string): Promise<EventItem[]> {
  const q = query.trim();
  const events = await db.event.findMany({
    where: {
      startsAt: { gte: new Date() },
      ...(q ? { nameHe: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { venue: true },
    orderBy: { startsAt: "asc" },
    take: q ? 8 : 6,
  });

  return events.map((event) => ({
    id: event.id,
    nameHe: event.nameHe,
    category: event.category as CategorySlug,
    venue: { id: event.venue.id, nameHe: event.venue.nameHe, city: event.venue.city },
    startsAt: event.startsAt.toISOString(),
    descriptionHe: event.descriptionHe,
    gradient: [event.gradientFrom, event.gradientTo],
    emoji: event.emoji,
  }));
}
