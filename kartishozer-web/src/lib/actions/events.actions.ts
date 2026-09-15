"use server";

import { db } from "@/lib/db";
import type { EventItem, CategorySlug } from "@/lib/types";

export async function searchEventsForSellAction(query: string): Promise<EventItem[]> {
  const q = query.trim();
  try {
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
  } catch (err) {
    // This runs automatically the instant /sell mounts (SellWizard's
    // useEffect), so a DB error here previously surfaced as Next's
    // generic, message-stripped "Server Components render" crash with no
    // trace in Vercel's logs. Logging it here — the actual thrown
    // error/stack, not just the digest — is what src/middleware.ts already
    // does for its own unexpected-error path; this mirrors that here.
    console.error("[searchEventsForSellAction] failed:", err);
    throw err;
  }
}
