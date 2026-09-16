import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Zap,
  BadgeCheck,
  Music,
  Mic2,
  Drama,
  Trophy,
  FerrisWheel,
  Gift,
  Calendar,
  CalendarClock,
  CalendarRange,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/lib/mock/categories";
import type { WhenFilter } from "@/lib/actions/search.actions";
import {
  getFeaturedEvents,
  getNewestListings,
  getEvent,
  getMinPriceAgorot,
  getListingCount,
  getSoleActiveListingId,
} from "@/lib/queries/catalog";
import { getAppUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { EventCard } from "@/components/EventCard";
import { ListingCard } from "@/components/ListingCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Logo } from "@/components/Logo";

const CATEGORY_ICONS = {
  Music,
  Mic2,
  Drama,
  Trophy,
  FerrisWheel,
  Gift,
} as const;

// Softer, single-tone colors for the flatter homepage tiles — deliberately
// separate from CATEGORIES' own bold two-tone gradients (still used for
// the category page hero etc.), which is exactly the "too bold" look this
// redesign moves away from on the homepage specifically.
const CATEGORY_SOFT_COLOR: Record<string, string> = {
  concerts: "#E37B67",
  standup: "#9B87D9",
  theater: "#4FBBAE",
  sports: "#5B93D9",
  attractions: "#E5A94A",
  vouchers: "#4FAE7C",
};

const WHEN_TILES: { key: WhenFilter; label: string; icon: LucideIcon; color: string }[] = [
  { key: "today", label: "היום", icon: Calendar, color: "#5B93D9" },
  { key: "tomorrow", label: "מחר", icon: CalendarClock, color: "#E5A94A" },
  { key: "week", label: "השבוע הקרוב", icon: CalendarRange, color: "#4FBBAE" },
  { key: "month", label: "החודש הקרוב", icon: CalendarDays, color: "#E37B67" },
];

export default async function HomePage() {
  const [featured, newest, user] = await Promise.all([
    getFeaturedEvents(),
    getNewestListings(4),
    getAppUser(),
  ]);

  const featuredWithStats = await Promise.all(
    featured.map(async (e) => ({
      event: e,
      minPriceAgorot: await getMinPriceAgorot(e.id),
      listingCount: await getListingCount(e.id),
      soleListingId: await getSoleActiveListingId(e.id),
    }))
  );

  const favoriteIds = user
    ? new Set(
        (
          await db.favorite.findMany({
            where: { userId: user.id, listingId: { in: newest.map((l) => l.id) } },
            select: { listingId: true },
          })
        ).map((f) => f.listingId)
      )
    : new Set<string>();

  const eventFavoriteIds = user
    ? new Set(
        (
          await db.eventFavorite.findMany({
            where: { userId: user.id, eventId: { in: featured.map((e) => e.id) } },
            select: { eventId: true },
          })
        ).map((f) => f.eventId)
      )
    : new Set<string>();

  const newestWithEvents = await Promise.all(
    newest.map(async (l) => ({ listing: l, event: await getEvent(l.eventId) }))
  );

  return (
    <div className="pb-4">
      {/* Top bar */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-white">
        <Logo markSize={36} textClassName="text-xl" />
        {user ? (
          <p className="text-sm font-bold text-ink-700 whitespace-nowrap">שלום, {user.fullName.split(" ")[0]} 👋</p>
        ) : (
          <Link href="/sign-in" className="text-sm font-bold text-brand">
            התחברות
          </Link>
        )}
      </div>

      {/* Hero */}
      <div
        className="h-72 relative overflow-hidden bg-ink-900 bg-cover bg-center"
        style={{ backgroundImage: "url(/hero-concert.jpg)" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,16,15,0.4) 0%, rgba(20,16,15,0.3) 45%, rgba(20,16,15,0.9) 100%)",
          }}
        />
        <div className="relative h-full flex flex-col items-center justify-center gap-5 px-6 text-center">
          <h1 className="text-3xl font-black text-white leading-snug">
            הדרך החדשה
            <br />
            לקנות ולמכור כרטיסים
          </h1>

          <Link
            href="/search"
            className="tap w-full max-w-sm flex items-center gap-2.5 rounded-2xl bg-white border border-ink-900/10 px-4 py-3.5 shadow-card"
          >
            <Search size={18} className="text-ink-500 flex-shrink-0" />
            <span className="text-sm text-ink-500">חפשו הופעה, הצגה, אירוע או אמן…</span>
          </Link>
        </div>
      </div>

      <div className="h-5" />

      {/* Quick date filters */}
      <div className="mb-6">
        <SectionHeader title="מצאו את האירוע הבא" />
        <div className="grid grid-cols-2 gap-3 px-4">
          {WHEN_TILES.map((tile) => (
            <Link
              key={tile.key}
              href={`/search?when=${tile.key}`}
              className="tap flex items-center justify-between gap-2 rounded-2xl bg-ink-100 px-4 py-4"
            >
              <span className="text-[13px] font-bold text-ink-900">{tile.label}</span>
              <tile.icon size={22} style={{ color: tile.color }} className="flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <SectionHeader title="קטגוריות" />
        <div className="grid grid-cols-2 gap-3 px-4">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon as keyof typeof CATEGORY_ICONS];
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="tap flex items-center justify-between gap-2 rounded-2xl bg-ink-100 px-4 py-4"
              >
                <span className="text-[13px] font-bold text-ink-900">{cat.labelHe}</span>
                <Icon size={22} style={{ color: CATEGORY_SOFT_COLOR[cat.slug] }} className="flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured events */}
      <div className="mb-7">
        <SectionHeader title="אירועים מומלצים" href="/search" />
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {featuredWithStats.map(({ event, minPriceAgorot, listingCount, soleListingId }) => (
            <EventCard
              key={event.id}
              event={event}
              wide
              minPriceAgorot={minPriceAgorot}
              listingCount={listingCount}
              isFavorited={eventFavoriteIds.has(event.id)}
              canFavorite={!!user}
              soleListingId={soleListingId}
            />
          ))}
        </div>
      </div>

      {/* Trust strip */}
      <Link
        href="/how-it-works"
        className="tap block mx-4 mb-7 rounded-3xl bg-ink-900 text-white p-4"
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <ShieldCheck size={20} className="text-accent-500" />
            <span className="text-[10px] font-bold leading-tight">עסקה מאובטחת</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <BadgeCheck size={20} className="text-brand-300" />
            <span className="text-[10px] font-bold leading-tight">מוכרים מאומתים</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Zap size={20} className="text-amber-400" />
            <span className="text-[10px] font-bold leading-tight">העברה דיגיטלית מהירה</span>
          </div>
        </div>
        <p className="text-center text-[11px] text-white/50 mt-3 font-bold">איך זה עובד ←</p>
      </Link>

      {/* Newest listings */}
      <div>
        <SectionHeader title="עולו לאתר עכשיו" href="/search" />
        <div className="px-4 space-y-3">
          {newestWithEvents.map(({ listing, event }) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              event={event ?? undefined}
              isFavorited={favoriteIds.has(listing.id)}
              canFavorite={!!user}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-6 text-[11px] text-ink-300">
        <Link href="/terms" className="hover:text-ink-500">
          תנאי שימוש
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-ink-500">
          מדיניות פרטיות
        </Link>
      </div>
    </div>
  );
}
