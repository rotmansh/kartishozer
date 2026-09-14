import type { Listing } from "@/lib/types";
import { SELLERS } from "./sellers";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const seller = (id: string) => SELLERS.find((s) => s.id === id)!;

export const LISTINGS: Listing[] = [
  // e1 — רותם דגן
  { id: "l1", eventId: "e1", seller: seller("s1"), status: "ACTIVE", section: "יציע מזרחי, שורה 12", quantity: 2, priceAgorot: 32000, faceValueAgorot: 28000, isSafePassExchange: true, createdAt: daysAgo(2) },
  { id: "l2", eventId: "e1", seller: seller("s4"), status: "ACTIVE", section: "רחבה קדמית", quantity: 1, priceAgorot: 45000, faceValueAgorot: 39000, isSafePassExchange: true, createdAt: daysAgo(5) },
  { id: "l3", eventId: "e1", seller: seller("s3"), status: "ACTIVE", section: "יציע עליון", quantity: 4, priceAgorot: 21000, faceValueAgorot: 22000, isSafePassExchange: false, note: "מכירה מתחת למחיר פנים — לא יכולה להגיע", createdAt: daysAgo(1) },

  // e2 — אורות הצפון
  { id: "l4", eventId: "e2", seller: seller("s2"), status: "ACTIVE", section: "כללי", quantity: 2, priceAgorot: 26000, faceValueAgorot: 24000, isSafePassExchange: true, createdAt: daysAgo(3) },
  { id: "l5", eventId: "e2", seller: seller("s5"), status: "ACTIVE", section: "VIP", quantity: 2, priceAgorot: 58000, faceValueAgorot: 50000, isSafePassExchange: true, createdAt: daysAgo(7) },

  // e3 — גיא מזרחי סטנדאפ
  { id: "l6", eventId: "e3", seller: seller("s4"), status: "ACTIVE", section: "שורה 5", quantity: 2, priceAgorot: 18000, faceValueAgorot: 16000, isSafePassExchange: true, createdAt: daysAgo(1) },
  { id: "l7", eventId: "e3", seller: seller("s6"), status: "ACTIVE", quantity: 1, priceAgorot: 15000, faceValueAgorot: 16000, isSafePassExchange: false, note: "התוכנית התנגשה עם אירוע משפחתי", createdAt: daysAgo(0) },

  // e4 — ליהי אשד
  { id: "l8", eventId: "e4", seller: seller("s1"), status: "ACTIVE", quantity: 2, priceAgorot: 19000, faceValueAgorot: 17000, isSafePassExchange: true, createdAt: daysAgo(4) },

  // e5 — לילה טוב אמא
  { id: "l9", eventId: "e5", seller: seller("s5"), status: "ACTIVE", section: "אולם מרכזי, שורה 8", quantity: 2, priceAgorot: 24000, faceValueAgorot: 21000, isSafePassExchange: true, createdAt: daysAgo(6) },
  { id: "l10", eventId: "e5", seller: seller("s2"), status: "ACTIVE", section: "יציע", quantity: 3, priceAgorot: 16000, faceValueAgorot: 15000, isSafePassExchange: true, createdAt: daysAgo(2) },

  // e6 — הקוסם הקטן
  { id: "l11", eventId: "e6", seller: seller("s3"), status: "ACTIVE", quantity: 4, priceAgorot: 8000, faceValueAgorot: 7500, isSafePassExchange: false, note: "הילדים גדלו מהתאריך המקורי 🙂", createdAt: daysAgo(3) },

  // e7 — אבירי הדרום נגד נמרי הצפון
  { id: "l12", eventId: "e7", seller: seller("s4"), status: "ACTIVE", section: "יציע צפוני", quantity: 2, priceAgorot: 21000, faceValueAgorot: 19000, isSafePassExchange: true, createdAt: daysAgo(1) },
  { id: "l13", eventId: "e7", seller: seller("s1"), status: "ACTIVE", section: "רחבה", quantity: 2, priceAgorot: 34000, faceValueAgorot: 29000, isSafePassExchange: true, createdAt: daysAgo(0) },

  // e8 — מכבים ראשון נגד הפועל המפרץ
  { id: "l14", eventId: "e8", seller: seller("s5"), status: "ACTIVE", section: "יציע דרומי", quantity: 4, priceAgorot: 14000, faceValueAgorot: 13000, isSafePassExchange: true, createdAt: daysAgo(5) },

  // e9 — אקווה-לנד
  { id: "l15", eventId: "e9", seller: seller("s6"), status: "ACTIVE", quantity: 2, priceAgorot: 9000, faceValueAgorot: 9900, isSafePassExchange: false, note: "מזג האוויר לא מתאים לנו השנה", createdAt: daysAgo(2) },
  { id: "l16", eventId: "e9", seller: seller("s2"), status: "ACTIVE", quantity: 5, priceAgorot: 8500, faceValueAgorot: 9900, isSafePassExchange: true, createdAt: daysAgo(4) },

  // e10 — לילה לבן
  { id: "l17", eventId: "e10", seller: seller("s3"), status: "ACTIVE", quantity: 2, priceAgorot: 6000, faceValueAgorot: 6000, isSafePassExchange: false, createdAt: daysAgo(1) },

  // e11 — עולם הבועות
  { id: "l18", eventId: "e11", seller: seller("s5"), status: "ACTIVE", quantity: 3, priceAgorot: 7000, faceValueAgorot: 6500, isSafePassExchange: true, createdAt: daysAgo(3) },

  // e12 — נועה שגיא אקוסטי
  { id: "l19", eventId: "e12", seller: seller("s1"), status: "ACTIVE", section: "שורות ראשונות", quantity: 2, priceAgorot: 42000, faceValueAgorot: 36000, isSafePassExchange: true, createdAt: daysAgo(6) },
  { id: "l20", eventId: "e12", seller: seller("s4"), status: "ACTIVE", quantity: 1, priceAgorot: 33000, faceValueAgorot: 30000, isSafePassExchange: true, createdAt: daysAgo(2) },
];

export function getListing(id: string): Listing | undefined {
  return LISTINGS.find((l) => l.id === id);
}

export function getListingsByEvent(eventId: string): Listing[] {
  return LISTINGS.filter((l) => l.eventId === eventId && l.status === "ACTIVE").sort(
    (a, b) => a.priceAgorot - b.priceAgorot
  );
}

export function getNewestListings(limit = 8): (Listing & { eventId: string })[] {
  return [...LISTINGS]
    .filter((l) => l.status === "ACTIVE")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
