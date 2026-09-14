// ============================================================
// Seed script — ports the Phase 1 mock catalog into real rows so
// browsing/search/event/listing pages have real data to read via
// Prisma. Seeded sellers are demo NPCs (fake clerkId placeholders,
// not tied to any real login) purely to populate the catalog.
// ============================================================

import { PrismaClient, CategorySlug } from "@prisma/client";

const db = new PrismaClient();

function inDays(days: number, hour = 20, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("Seeding platform config…");
  const configDefaults: Record<string, string> = {
    max_markup_percent: "20",
    buyer_fee_percent: "10",
    seller_fee_percent: "7",
    payout_delay_days: "3",
    max_listings_per_vendor_per_day: "20",
    risk_auto_approve_threshold: "20",
    risk_manual_review_threshold: "60",
    risk_reject_threshold: "80",
    maintenance_mode: "false",
    new_vendor_registration_enabled: "true",
  };
  for (const [key, value] of Object.entries(configDefaults)) {
    await db.platformConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }

  console.log("Seeding demo sellers…");
  const sellers = [
    { id: "s1", displayName: "נועה כהן", isVerified: true, verificationLevel: "FULL" as const, email: "seed.s1@example.com" },
    { id: "s2", displayName: "איתי לוי", isVerified: true, verificationLevel: "BASIC" as const, email: "seed.s2@example.com" },
    { id: "s3", displayName: "שירה מזרחי", isVerified: false, verificationLevel: "NONE" as const, email: "seed.s3@example.com" },
    { id: "s4", displayName: "דניאל אברהם", isVerified: true, verificationLevel: "FULL" as const, email: "seed.s4@example.com" },
    { id: "s5", displayName: "מיכל בר", isVerified: true, verificationLevel: "BASIC" as const, email: "seed.s5@example.com" },
    { id: "s6", displayName: "יובל שגיא", isVerified: false, verificationLevel: "NONE" as const, email: "seed.s6@example.com" },
  ];
  for (const s of sellers) {
    const user = await db.user.upsert({
      where: { id: `u_${s.id}` },
      create: { id: `u_${s.id}`, clerkId: `seed_${s.id}`, email: s.email, fullName: s.displayName },
      update: {},
    });
    await db.vendor.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        userId: user.id,
        displayName: s.displayName,
        isVerified: s.isVerified,
        verificationLevel: s.verificationLevel,
      },
      update: {},
    });
  }

  console.log("Seeding venues…");
  const venues = [
    { id: "v1", nameHe: "היכל הבמה", city: "תל אביב" },
    { id: "v2", nameHe: "אצטדיון הצפון", city: "חיפה" },
    { id: "v3", nameHe: "היכל ים", city: "אילת" },
    { id: "v4", nameHe: "גני האירועים המרכזי", city: "ראשון לציון" },
    { id: "v5", nameHe: "כיכר האומנים", city: "ירושלים" },
    { id: "v6", nameHe: "פארק אקווה-לנד", city: "נתניה" },
    { id: "v7", nameHe: "תיאטרון הבמה הפתוחה", city: "באר שבע" },
    { id: "v8", nameHe: "ארנת ספורט ומופעים", city: "רמת גן" },
  ];
  for (const v of venues) {
    await db.venue.upsert({ where: { id: v.id }, create: v, update: {} });
  }

  console.log("Seeding events…");
  const events: {
    id: string; nameHe: string; category: CategorySlug; venueId: string;
    startsAt: Date; descriptionHe: string; gradientFrom: string; gradientTo: string; emoji: string;
  }[] = [
    { id: "e1", nameHe: "רותם דגן — סיבוב הופעות 2026", category: "concerts", venueId: "v1", startsAt: inDays(18, 21, 0), descriptionHe: "ערב הופעה חיה עם הלהיטים הגדולים מהאלבום החדש ואורחים מפתיעים.", gradientFrom: "#E8503A", gradientTo: "#F5876F", emoji: "🎤" },
    { id: "e2", nameHe: "להקת אורות הצפון — טור קיץ", category: "concerts", venueId: "v2", startsAt: inDays(32, 20, 30), descriptionHe: "מופע חוצות גדול עם תזמורת מלאה, מיוחד לקיץ.", gradientFrom: "#E8503A", gradientTo: "#F5876F", emoji: "🎸" },
    { id: "e3", nameHe: "גיא מזרחי — סטנדאפ לייב: \"רגע לפני\"", category: "standup", venueId: "v7", startsAt: inDays(9, 21, 30), descriptionHe: "שעה וחצי של סטנדאפ חד ומצחיק על החיים בישראל 2026.", gradientFrom: "#7C4DFF", gradientTo: "#B39DFF", emoji: "🎙️" },
    { id: "e4", nameHe: "ליהי אשד — הופעת סטנדאפ חדשה", category: "standup", venueId: "v5", startsAt: inDays(24, 20, 0), descriptionHe: "מופע בכורה של החומר החדש, ירושלים בלבד.", gradientFrom: "#7C4DFF", gradientTo: "#B39DFF", emoji: "😂" },
    { id: "e5", nameHe: "תיאטרון הבמה הפתוחה — \"לילה טוב אמא\"", category: "theater", venueId: "v7", startsAt: inDays(14, 20, 0), descriptionHe: "הצגת דרמה קומית רגישה ומרגשת, בכיכובם של להקת השחקנים הביתית.", gradientFrom: "#00B4A6", gradientTo: "#5FE0D4", emoji: "🎭" },
    { id: "e6", nameHe: "\"הקוסם הקטן\" — הצגת ילדים מוזיקלית", category: "kids", venueId: "v4", startsAt: inDays(11, 11, 0), descriptionHe: "הצגה מוזיקלית צבעונית לכל המשפחה, מומלץ מגיל 3.", gradientFrom: "#E85AA0", gradientTo: "#FFA4CE", emoji: "🎪" },
    { id: "e7", nameHe: "אבירי הדרום נגד נמרי הצפון — כדורסל", category: "sports", venueId: "v8", startsAt: inDays(6, 19, 0), descriptionHe: "משחק פלייאוף מכריע בליגת העל הדמיונית לכדורסל.", gradientFrom: "#378ADD", gradientTo: "#7FB7F0", emoji: "🏀" },
    { id: "e8", nameHe: "מכבים ראשון נגד הפועל המפרץ — כדורגל", category: "sports", venueId: "v2", startsAt: inDays(21, 19, 30), descriptionHe: "דרבי עונתי בין שתי הקבוצות המובילות בטבלה.", gradientFrom: "#378ADD", gradientTo: "#7FB7F0", emoji: "⚽" },
    { id: "e9", nameHe: "יום כיף בפארק אקווה-לנד", category: "attractions", venueId: "v6", startsAt: inDays(4, 9, 0), descriptionHe: "כרטיס יומי לכל המתקנים, כולל בריכת הגלים החדשה.", gradientFrom: "#EF9F27", gradientTo: "#FFC96B", emoji: "🎢" },
    { id: "e10", nameHe: "לילה לבן בכיכר האומנים", category: "attractions", venueId: "v5", startsAt: inDays(27, 19, 0), descriptionHe: "פסטיבל אומנות רחוב, מוזיקה חיה ודוכני אוכל עד אור הבוקר.", gradientFrom: "#EF9F27", gradientTo: "#FFC96B", emoji: "🎡" },
    { id: "e11", nameHe: "\"עולם הבועות\" — מופע ילדים אינטראקטיבי", category: "kids", venueId: "v1", startsAt: inDays(16, 10, 30), descriptionHe: "מופע בועות ענק עם קסמים ואפקטים, מתאים לכל המשפחה.", gradientFrom: "#E85AA0", gradientTo: "#FFA4CE", emoji: "🫧" },
    { id: "e12", nameHe: "נועה שגיא — הופעת אקוסטית אינטימית", category: "concerts", venueId: "v3", startsAt: inDays(39, 21, 0), descriptionHe: "ערב אקוסטי קטן ואינטימי מול הים באילת.", gradientFrom: "#E8503A", gradientTo: "#F5876F", emoji: "🎹" },
  ];
  for (const e of events) {
    await db.event.upsert({ where: { id: e.id }, create: e, update: {} });
  }

  console.log("Seeding listings…");
  const listings: {
    id: string; eventId: string; vendorId: string; section?: string; quantity: number;
    priceAgorot: number; faceValueAgorot: number; isSafePassExchange: boolean; note?: string; createdAt: Date;
  }[] = [
    { id: "l1", eventId: "e1", vendorId: "s1", section: "יציע מזרחי, שורה 12", quantity: 2, priceAgorot: 32000, faceValueAgorot: 28000, isSafePassExchange: true, createdAt: daysAgo(2) },
    { id: "l2", eventId: "e1", vendorId: "s4", section: "רחבה קדמית", quantity: 1, priceAgorot: 45000, faceValueAgorot: 39000, isSafePassExchange: true, createdAt: daysAgo(5) },
    { id: "l3", eventId: "e1", vendorId: "s3", section: "יציע עליון", quantity: 4, priceAgorot: 21000, faceValueAgorot: 22000, isSafePassExchange: false, note: "מכירה מתחת למחיר פנים — לא יכולה להגיע", createdAt: daysAgo(1) },
    { id: "l4", eventId: "e2", vendorId: "s2", section: "כללי", quantity: 2, priceAgorot: 26000, faceValueAgorot: 24000, isSafePassExchange: true, createdAt: daysAgo(3) },
    { id: "l5", eventId: "e2", vendorId: "s5", section: "VIP", quantity: 2, priceAgorot: 58000, faceValueAgorot: 50000, isSafePassExchange: true, createdAt: daysAgo(7) },
    { id: "l6", eventId: "e3", vendorId: "s4", section: "שורה 5", quantity: 2, priceAgorot: 18000, faceValueAgorot: 16000, isSafePassExchange: true, createdAt: daysAgo(1) },
    { id: "l7", eventId: "e3", vendorId: "s6", quantity: 1, priceAgorot: 15000, faceValueAgorot: 16000, isSafePassExchange: false, note: "התוכנית התנגשה עם אירוע משפחתי", createdAt: daysAgo(0) },
    { id: "l8", eventId: "e4", vendorId: "s1", quantity: 2, priceAgorot: 19000, faceValueAgorot: 17000, isSafePassExchange: true, createdAt: daysAgo(4) },
    { id: "l9", eventId: "e5", vendorId: "s5", section: "אולם מרכזי, שורה 8", quantity: 2, priceAgorot: 24000, faceValueAgorot: 21000, isSafePassExchange: true, createdAt: daysAgo(6) },
    { id: "l10", eventId: "e5", vendorId: "s2", section: "יציע", quantity: 3, priceAgorot: 16000, faceValueAgorot: 15000, isSafePassExchange: true, createdAt: daysAgo(2) },
    { id: "l11", eventId: "e6", vendorId: "s3", quantity: 4, priceAgorot: 8000, faceValueAgorot: 7500, isSafePassExchange: false, note: "הילדים גדלו מהתאריך המקורי 🙂", createdAt: daysAgo(3) },
    { id: "l12", eventId: "e7", vendorId: "s4", section: "יציע צפוני", quantity: 2, priceAgorot: 21000, faceValueAgorot: 19000, isSafePassExchange: true, createdAt: daysAgo(1) },
    { id: "l13", eventId: "e7", vendorId: "s1", section: "רחבה", quantity: 2, priceAgorot: 34000, faceValueAgorot: 29000, isSafePassExchange: true, createdAt: daysAgo(0) },
    { id: "l14", eventId: "e8", vendorId: "s5", section: "יציע דרומי", quantity: 4, priceAgorot: 14000, faceValueAgorot: 13000, isSafePassExchange: true, createdAt: daysAgo(5) },
    { id: "l15", eventId: "e9", vendorId: "s6", quantity: 2, priceAgorot: 9000, faceValueAgorot: 9900, isSafePassExchange: false, note: "מזג האוויר לא מתאים לנו השנה", createdAt: daysAgo(2) },
    { id: "l16", eventId: "e9", vendorId: "s2", quantity: 5, priceAgorot: 8500, faceValueAgorot: 9900, isSafePassExchange: true, createdAt: daysAgo(4) },
    { id: "l17", eventId: "e10", vendorId: "s3", quantity: 2, priceAgorot: 6000, faceValueAgorot: 6000, isSafePassExchange: false, createdAt: daysAgo(1) },
    { id: "l18", eventId: "e11", vendorId: "s5", quantity: 3, priceAgorot: 7000, faceValueAgorot: 6500, isSafePassExchange: true, createdAt: daysAgo(3) },
    { id: "l19", eventId: "e12", vendorId: "s1", section: "שורות ראשונות", quantity: 2, priceAgorot: 42000, faceValueAgorot: 36000, isSafePassExchange: true, createdAt: daysAgo(6) },
    { id: "l20", eventId: "e12", vendorId: "s4", quantity: 1, priceAgorot: 33000, faceValueAgorot: 30000, isSafePassExchange: true, createdAt: daysAgo(2) },
  ];
  for (const l of listings) {
    await db.listing.upsert({
      where: { id: l.id },
      create: { ...l, status: "ACTIVE", riskLevel: "LOW" },
      update: {},
    });
    await db.listingRisk.upsert({
      where: { listingId: l.id },
      create: { listingId: l.id, decision: "APPROVE", totalScore: 5 },
      update: {},
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
