import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CATEGORIES, getCategory } from "@/lib/mock/categories";
import { getEventsByCategory } from "@/lib/mock/events";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { CalendarX } from "lucide-react";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const category = getCategory(params.slug);
  return { title: category ? `${category.labelHe} | כרטיס חוזר` : "כרטיס חוזר" };
}

export default function CategoryPage({ params }: Props) {
  const category = getCategory(params.slug);
  if (!category) notFound();

  const events = getEventsByCategory(category.slug);

  return (
    <div>
      <TopBar title={category.labelHe} />
      <div
        className="mx-4 mt-3 mb-4 rounded-3xl p-5 text-white"
        style={{ background: `linear-gradient(135deg, ${category.gradient[0]}, ${category.gradient[1]})` }}
      >
        <p className="text-2xl mb-1">{category.emoji}</p>
        <p className="font-black text-lg">{category.labelHe}</p>
        <p className="text-xs text-white/80 mt-0.5">{events.length} אירועים קרובים</p>
      </div>

      <div className="px-4 space-y-3">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarX size={26} />}
            title="אין אירועים כרגע"
            subtitle="חזרו לבדוק בקרוב — אירועים חדשים מתווספים כל הזמן"
          />
        ) : (
          events.map((e) => <EventCard key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}
