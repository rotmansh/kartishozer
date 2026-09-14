import Link from "next/link";
import { Search, MessageCircle, ShieldCheck, Zap, BadgeCheck, Music, Mic2, Drama, Trophy, FerrisWheel, PartyPopper } from "lucide-react";
import { CATEGORIES } from "@/lib/mock/categories";
import { getFeaturedEvents } from "@/lib/mock/events";
import { getNewestListings } from "@/lib/mock/listings";
import { EventCard } from "@/components/EventCard";
import { ListingCard } from "@/components/ListingCard";
import { SectionHeader } from "@/components/SectionHeader";

const CATEGORY_ICONS = {
  Music,
  Mic2,
  Drama,
  Trophy,
  FerrisWheel,
  PartyPopper,
} as const;

export default function HomePage() {
  const featured = getFeaturedEvents();
  const newest = getNewestListings(4);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl bg-brand flex items-center justify-center text-white font-black">כ</div>
          <div>
            <p className="text-[11px] text-ink-500 leading-none">שלום 👋</p>
            <p className="text-sm font-black text-ink-900 leading-tight">כרטיס חוזר</p>
          </div>
        </div>
        <Link
          href="/messages"
          aria-label="הודעות"
          className="tap h-10 w-10 rounded-full bg-white border border-ink-900/5 flex items-center justify-center relative"
        >
          <MessageCircle size={19} className="text-ink-700" />
        </Link>
      </div>

      {/* Search bar */}
      <div className="px-4 mb-5">
        <Link
          href="/search"
          className="tap flex items-center gap-2.5 rounded-2xl bg-white border border-ink-900/10 px-4 py-3.5 shadow-card"
        >
          <Search size={18} className="text-ink-500 flex-shrink-0" />
          <span className="text-sm text-ink-500">חפשו הופעה, הצגה, אירוע או אמן…</span>
        </Link>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <SectionHeader title="קטגוריות" />
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon as keyof typeof CATEGORY_ICONS];
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="tap flex-shrink-0 w-[76px] flex flex-col items-center gap-1.5"
              >
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-card"
                  style={{ background: `linear-gradient(135deg, ${cat.gradient[0]}, ${cat.gradient[1]})` }}
                >
                  <Icon size={24} />
                </div>
                <span className="text-[11px] font-bold text-ink-700 text-center leading-tight">{cat.labelHe}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Featured events */}
      <div className="mb-7">
        <SectionHeader title="אירועים מומלצים" href="/search" />
        <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar pb-1">
          {featured.map((e) => (
            <EventCard key={e.id} event={e} wide />
          ))}
        </div>
      </div>

      {/* Trust strip */}
      <div className="mx-4 mb-7 rounded-3xl bg-ink-900 text-white p-4 grid grid-cols-3 gap-2 text-center">
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

      {/* Newest listings */}
      <div>
        <SectionHeader title="עולו לאתר עכשיו" href="/search" />
        <div className="px-4 space-y-3">
          {newest.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </div>
    </div>
  );
}
