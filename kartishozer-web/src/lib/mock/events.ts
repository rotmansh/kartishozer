import type { EventItem } from "@/lib/types";
import { VENUES } from "./venues";

function inDays(days: number, hour = 20, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const venue = (id: string) => VENUES.find((v) => v.id === id)!;

// All artists, teams, and shows below are entirely fictional.
export const EVENTS: EventItem[] = [
  {
    id: "e1",
    nameHe: "רותם דגן — סיבוב הופעות 2026",
    category: "concerts",
    venue: venue("v1"),
    startsAt: inDays(18, 21, 0),
    descriptionHe: "ערב הופעה חיה עם הלהיטים הגדולים מהאלבום החדש ואורחים מפתיעים.",
    gradient: ["#E8503A", "#F5876F"],
    emoji: "🎤",
  },
  {
    id: "e2",
    nameHe: "להקת אורות הצפון — טור קיץ",
    category: "concerts",
    venue: venue("v2"),
    startsAt: inDays(32, 20, 30),
    descriptionHe: "מופע חוצות גדול עם תזמורת מלאה, מיוחד לקיץ.",
    gradient: ["#E8503A", "#F5876F"],
    emoji: "🎸",
  },
  {
    id: "e3",
    nameHe: "גיא מזרחי — סטנדאפ לייב: \"רגע לפני\"",
    category: "standup",
    venue: venue("v7"),
    startsAt: inDays(9, 21, 30),
    descriptionHe: "שעה וחצי של סטנדאפ חד ומצחיק על החיים בישראל 2026.",
    gradient: ["#7C4DFF", "#B39DFF"],
    emoji: "🎙️",
  },
  {
    id: "e4",
    nameHe: "ליהי אשד — הופעת סטנדאפ חדשה",
    category: "standup",
    venue: venue("v5"),
    startsAt: inDays(24, 20, 0),
    descriptionHe: "מופע בכורה של החומר החדש, ירושלים בלבד.",
    gradient: ["#7C4DFF", "#B39DFF"],
    emoji: "😂",
  },
  {
    id: "e5",
    nameHe: "תיאטרון הבמה הפתוחה — \"לילה טוב אמא\"",
    category: "theater",
    venue: venue("v7"),
    startsAt: inDays(14, 20, 0),
    descriptionHe: "הצגת דרמה קומית רגישה ומרגשת, בכיכובם של להקת השחקנים הביתית.",
    gradient: ["#00B4A6", "#5FE0D4"],
    emoji: "🎭",
  },
  {
    id: "e6",
    nameHe: "\"הקוסם הקטן\" — הצגת ילדים מוזיקלית",
    category: "kids",
    venue: venue("v4"),
    startsAt: inDays(11, 11, 0),
    descriptionHe: "הצגה מוזיקלית צבעונית לכל המשפחה, מומלץ מגיל 3.",
    gradient: ["#E85AA0", "#FFA4CE"],
    emoji: "🎪",
  },
  {
    id: "e7",
    nameHe: "אבירי הדרום נגד נמרי הצפון — כדורסל",
    category: "sports",
    venue: venue("v8"),
    startsAt: inDays(6, 19, 0),
    descriptionHe: "משחק פלייאוף מכריע בליגת העל הדמיונית לכדורסל.",
    gradient: ["#378ADD", "#7FB7F0"],
    emoji: "🏀",
  },
  {
    id: "e8",
    nameHe: "מכבים ראשון נגד הפועל המפרץ — כדורגל",
    category: "sports",
    venue: venue("v2"),
    startsAt: inDays(21, 19, 30),
    descriptionHe: "דרבי עונתי בין שתי הקבוצות המובילות בטבלה.",
    gradient: ["#378ADD", "#7FB7F0"],
    emoji: "⚽",
  },
  {
    id: "e9",
    nameHe: "יום כיף בפארק אקווה-לנד",
    category: "attractions",
    venue: venue("v6"),
    startsAt: inDays(4, 9, 0),
    descriptionHe: "כרטיס יומי לכל המתקנים, כולל בריכת הגלים החדשה.",
    gradient: ["#EF9F27", "#FFC96B"],
    emoji: "🎢",
  },
  {
    id: "e10",
    nameHe: "לילה לבן בכיכר האומנים",
    category: "attractions",
    venue: venue("v5"),
    startsAt: inDays(27, 19, 0),
    descriptionHe: "פסטיבל אומנות רחוב, מוזיקה חיה ודוכני אוכל עד אור הבוקר.",
    gradient: ["#EF9F27", "#FFC96B"],
    emoji: "🎡",
  },
  {
    id: "e11",
    nameHe: "\"עולם הבועות\" — מופע ילדים אינטראקטיבי",
    category: "kids",
    venue: venue("v1"),
    startsAt: inDays(16, 10, 30),
    descriptionHe: "מופע בועות ענק עם קסמים ואפקטים, מתאים לכל המשפחה.",
    gradient: ["#E85AA0", "#FFA4CE"],
    emoji: "🫧",
  },
  {
    id: "e12",
    nameHe: "נועה שגיא — הופעת אקוסטית אינטימית",
    category: "concerts",
    venue: venue("v3"),
    startsAt: inDays(39, 21, 0),
    descriptionHe: "ערב אקוסטי קטן ואינטימי מול הים באילת.",
    gradient: ["#E8503A", "#F5876F"],
    emoji: "🎹",
  },
];

export function getEvent(id: string): EventItem | undefined {
  return EVENTS.find((e) => e.id === id);
}

export function getEventsByCategory(slug: string): EventItem[] {
  return EVENTS.filter((e) => e.category === slug).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
}

export function getFeaturedEvents(): EventItem[] {
  return [EVENTS[0], EVENTS[6], EVENTS[4], EVENTS[8], EVENTS[2]];
}

export function getUpcomingEvents(): EventItem[] {
  return [...EVENTS].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
}

export function searchEvents(query: string): EventItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return getUpcomingEvents();
  return EVENTS.filter(
    (e) =>
      e.nameHe.toLowerCase().includes(q) ||
      e.venue.nameHe.toLowerCase().includes(q) ||
      e.venue.city.toLowerCase().includes(q)
  );
}
