"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { CATEGORIES } from "@/lib/mock/categories";
import { OPEN_DATE_SENTINEL, type EventItem, type CategorySlug } from "@/lib/types";

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
      isOpenDate: event.isOpenDate,
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

const findSimilarSchema = z.object({
  venueNameHe: z.string().trim().min(2),
  city: z.string().trim().min(2),
  date: z.string().optional(), // yyyy-mm-dd, from the form's <input type="date"> — absent when isOpenDate
  isOpenDate: z.boolean().optional().default(false),
});

/**
 * Run before a seller finalizes "add a new event": looks for events
 * already at the same venue (name+city) within a day of the chosen date
 * (or, for an open-date attraction, any other open-date listing at that
 * venue — there's no date to narrow by). Exact-name matching
 * (createEventAction's own safety net) only catches someone typing the
 * identical event name — two sellers describing the same real show
 * ("עומר אדם" vs "עומר אדם - סיבוב הופעות") wouldn't match that way, and
 * would otherwise end up as two separate, un-comparable listings for
 * what buyers experience as one event/attraction. This lets the UI
 * surface likely matches so the seller can pick an existing one instead.
 */
export async function findSimilarEventsAction(
  input: z.infer<typeof findSimilarSchema>
): Promise<EventItem[]> {
  const parsed = findSimilarSchema.safeParse(input);
  if (!parsed.success) return [];
  const { venueNameHe, city, date, isOpenDate } = parsed.data;

  let dateFilter: { isOpenDate: true } | { startsAt: { gte: Date; lt: Date } };
  if (isOpenDate) {
    dateFilter = { isOpenDate: true };
  } else {
    if (!date) return [];
    const dayStart = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dayStart.getTime())) return [];
    dateFilter = {
      startsAt: { gte: new Date(dayStart.getTime() - 24 * 3600 * 1000), lt: new Date(dayStart.getTime() + 48 * 3600 * 1000) },
    };
  }

  const events = await db.event.findMany({
    where: {
      ...dateFilter,
      venue: { nameHe: { contains: venueNameHe, mode: "insensitive" }, city: { contains: city, mode: "insensitive" } },
    },
    include: { venue: true },
    orderBy: { startsAt: "asc" },
    take: 5,
  });

  return events.map((event) => ({
    id: event.id,
    nameHe: event.nameHe,
    category: event.category as CategorySlug,
    venue: { id: event.venue.id, nameHe: event.venue.nameHe, city: event.venue.city },
    startsAt: event.startsAt.toISOString(),
    isOpenDate: event.isOpenDate,
    descriptionHe: event.descriptionHe,
    gradient: [event.gradientFrom, event.gradientTo],
    emoji: event.emoji,
  }));
}

const createEventSchema = z
  .object({
    nameHe: z.string().trim().min(2).max(120),
    category: z.enum(["concerts", "standup", "theater", "sports", "attractions", "vouchers"]),
    venueNameHe: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(60),
    isOpenDate: z.boolean().optional().default(false),
    startsAt: z.string().datetime().or(z.string().min(1)).optional(),
  })
  .refine((data) => data.isOpenDate || !!data.startsAt, {
    message: "תאריך נדרש",
    path: ["startsAt"],
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

  let startsAt: Date;
  if (data.isOpenDate) {
    startsAt = new Date(OPEN_DATE_SENTINEL);
  } else {
    startsAt = new Date(data.startsAt!);
    if (Number.isNaN(startsAt.getTime())) return { error: "תאריך לא תקין" };
    if (startsAt.getTime() < Date.now() - 24 * 3600 * 1000) {
      return { error: "לא ניתן להוסיף אירוע שכבר עבר" };
    }
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

  // Upserted, not created outright: if this exact name+venue+date was
  // already added (very plausible — several sellers listing tickets to
  // the same real show will often type the name near-identically), reuse
  // that Event instead of fragmenting the same show across two rows,
  // which would split their listings apart and defeat the whole point of
  // letting buyers compare prices across sellers for the same event.
  // This only catches an exact match; see findSimilarEventsAction for the
  // fuzzier "did you mean one of these?" check the UI runs first.
  const event = await db.event.upsert({
    where: { nameHe_venueId_startsAt: { nameHe: data.nameHe, venueId: venue.id, startsAt } },
    create: {
      nameHe: data.nameHe,
      category: data.category as CategorySlug,
      venueId: venue.id,
      startsAt,
      isOpenDate: data.isOpenDate,
      descriptionHe: "",
      gradientFrom: categoryMeta.gradient[0],
      gradientTo: categoryMeta.gradient[1],
      emoji: categoryMeta.emoji,
    },
    update: {},
  });

  return {
    id: event.id,
    nameHe: event.nameHe,
    category: event.category as CategorySlug,
    venue: { id: venue.id, nameHe: venue.nameHe, city: venue.city },
    startsAt: event.startsAt.toISOString(),
    isOpenDate: event.isOpenDate,
    descriptionHe: event.descriptionHe,
    gradient: [event.gradientFrom, event.gradientTo],
    emoji: event.emoji,
  };
}
