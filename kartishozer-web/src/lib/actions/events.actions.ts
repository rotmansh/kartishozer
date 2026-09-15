"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { CATEGORIES } from "@/lib/mock/categories";
import type { EventItem, CategorySlug } from "@/lib/types";

type ActionResult<T> = T | { error: string };

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

const createEventSchema = z.object({
  nameHe: z.string().trim().min(2).max(120),
  category: z.enum(["concerts", "standup", "theater", "sports", "attractions", "kids"]),
  venueNameHe: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(60),
  startsAt: z.string().datetime().or(z.string().min(1)),
});

/**
 * Lets a seller add the event/attraction themselves when it isn't in the
 * catalog yet — the whole point of a peer-to-peer resale marketplace is
 * that anyone can list a ticket to anything, not just events staff
 * pre-loaded. No admin approval gate on the event itself (the *listing*
 * still goes through the existing risk review) — duplicate/near-duplicate
 * event names are a real tradeoff of that, worth revisiting once there's
 * real usage to see how much it actually happens.
 */
export async function createEventAction(
  input: z.infer<typeof createEventSchema>
): Promise<ActionResult<EventItem>> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי להוסיף אירוע" };

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) return { error: "פרטי האירוע לא תקינים — בדקו שכל השדות מלאים" };
  const data = parsed.data;

  const startsAt = new Date(data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "תאריך לא תקין" };
  if (startsAt.getTime() < Date.now() - 24 * 3600 * 1000) {
    return { error: "לא ניתן להוסיף אירוע שכבר עבר" };
  }

  const categoryMeta = CATEGORIES.find((c) => c.slug === data.category);
  if (!categoryMeta) return { error: "קטגוריה לא תקינה" };

  // Reuse the venue if one with the same name+city already exists, so the
  // catalog doesn't accumulate duplicate venues every time someone adds an
  // event at a place that's already listed.
  const venue = await db.venue.upsert({
    where: { nameHe_city: { nameHe: data.venueNameHe, city: data.city } },
    create: { nameHe: data.venueNameHe, city: data.city },
    update: {},
  });

  const event = await db.event.create({
    data: {
      nameHe: data.nameHe,
      category: data.category as CategorySlug,
      venueId: venue.id,
      startsAt,
      descriptionHe: "",
      gradientFrom: categoryMeta.gradient[0],
      gradientTo: categoryMeta.gradient[1],
      emoji: categoryMeta.emoji,
    },
  });

  return {
    id: event.id,
    nameHe: event.nameHe,
    category: event.category as CategorySlug,
    venue: { id: venue.id, nameHe: venue.nameHe, city: venue.city },
    startsAt: event.startsAt.toISOString(),
    descriptionHe: event.descriptionHe,
    gradient: [event.gradientFrom, event.gradientTo],
    emoji: event.emoji,
  };
}
