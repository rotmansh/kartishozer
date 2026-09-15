import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { getListing, getEvent, computeOrderTotals } from "@/lib/queries/catalog";
import { getCategory } from "@/lib/mock/categories";
import { fmtAgorot, fmtEventDate, fmtTime } from "@/lib/format";
import { markupPercent } from "@/lib/types";
import { TopBar } from "@/components/layout/TopBar";
import { SellerBadge } from "@/components/SellerBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ShareButton } from "@/components/ShareButton";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing(params.id);
  const event = listing ? await getEvent(listing.eventId) : undefined;
  const title = event ? `${event.nameHe} | כרטיס חוזר` : "כרטיס חוזר";
  const description =
    event && listing
      ? `כרטיס ל${event.nameHe} ב${event.venue.city} · ${fmtEventDate(event)} · החל מ־${fmtAgorot(
          listing.priceAgorot
        )}`
      : "קונים ומוכרים כרטיסים ביד שנייה — בבטחה.";

  // The actual preview image comes from the sibling opengraph-image.tsx
  // route — Next wires that in automatically for both openGraph and
  // twitter cards, no explicit `images` field needed here.
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ListingDetailsPage({ params }: Props) {
  const listing = await getListing(params.id);
  if (!listing) notFound();
  const event = await getEvent(listing.eventId);
  if (!event) notFound();

  const category = getCategory(event.category);
  const markup = markupPercent(listing.priceAgorot, listing.faceValueAgorot);
  const totals = await computeOrderTotals(listing.priceAgorot);

  return (
    <div className="pb-28">
      <TopBar title="פרטי כרטיס" />

      {/* Event summary */}
      <Link
        href={`/event/${event.id}`}
        className="tap mx-4 mt-3 flex items-center gap-3 rounded-2xl p-3 text-white"
        style={{ background: `linear-gradient(135deg, ${event.gradient[0]}, ${event.gradient[1]})` }}
      >
        <span className="text-3xl flex-shrink-0">{event.emoji}</span>
        <div className="min-w-0">
          <p className="font-black text-sm truncate">{event.nameHe}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-white/85 mt-0.5">
            <Calendar size={11} />
            {event.isOpenDate ? fmtEventDate(event) : `${fmtEventDate(event)} · ${fmtTime(event.startsAt)}`}
            <span className="mx-0.5">·</span>
            <MapPin size={11} />
            {event.venue.city}
          </div>
        </div>
      </Link>

      {/* Seller */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-ink-900/5 shadow-card p-4">
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-2.5">המוכר/ת</p>
        <SellerBadge seller={listing.seller} />
        {!listing.seller.isVerified && (
          <div className="flex items-center gap-1.5 mt-3 text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-[11px] font-bold">
            <AlertTriangle size={13} />
            מוכר/ת טרם עברו תהליך אימות מלא
          </div>
        )}
      </div>

      {/* Ticket details */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-ink-900/5 shadow-card p-4 space-y-3">
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">פרטי הכרטיס</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">קטגוריה</span>
          <span className="font-bold text-ink-900">{category?.labelHe}</span>
        </div>
        {listing.section && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-500">אזור / שורה</span>
            <span className="font-bold text-ink-900">{listing.section}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">כמות כרטיסים</span>
          <span className="font-bold text-ink-900 flex items-center gap-1">
            <Ticket size={14} />
            {listing.quantity}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">אופן ההעברה</span>
          {listing.isSafePassExchange ? (
            <span className="font-bold text-accent-600 flex items-center gap-1">
              <ShieldCheck size={14} />
              דיגיטלית ומאובטחת דרך האתר
            </span>
          ) : (
            <span className="font-bold text-ink-700">לתיאום מול המוכר/ת</span>
          )}
        </div>
        {listing.note && (
          <div className="rounded-xl bg-ink-100 p-3 text-xs text-ink-700 leading-relaxed">
            &ldquo;{listing.note}&rdquo;
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div className="mx-4 mt-4 bg-white rounded-2xl border border-ink-900/5 shadow-card p-4 space-y-2.5">
        <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide">מחיר</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">מחיר פנים (מקורי)</span>
          <span className="text-ink-700">{fmtAgorot(listing.faceValueAgorot)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">מחיר המוכר/ת</span>
          <span className="font-bold text-ink-900">{fmtAgorot(listing.priceAgorot)}</span>
        </div>
        {markup !== 0 && (
          <Badge tone={markup > 0 ? "brand" : "accent"}>
            {markup > 0 ? `+${markup}% ממחיר הפנים` : `${markup}% ממחיר הפנים`}
          </Badge>
        )}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-ink-900/5">
          <span className="text-ink-500">עמלת שירות (משוער)</span>
          <span className="text-ink-700">{fmtAgorot(totals.buyerFeeAgorot)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-black text-ink-900">סה&quot;כ לתשלום</span>
          <span className="font-black text-brand text-lg">{fmtAgorot(totals.totalAgorot)}</span>
        </div>
      </div>

      <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl bg-ink-100 p-3.5">
        <ShieldCheck size={16} className="text-ink-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-ink-700 leading-relaxed">
          הכסף שלכם נשמר בנאמנות עד לאישור קבלת הכרטיס. במקרה של בעיה — פותחים סכסוך ומקבלים החזר מלא.
        </p>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 inset-x-0 z-30 max-w-app mx-auto px-4 pb-3 pt-4 bg-gradient-to-t from-ink-50 via-ink-50/95 to-transparent">
        <div className="flex gap-2.5">
          <button
            aria-label="צרו קשר עם המוכר"
            className="tap h-14 w-14 flex-shrink-0 rounded-2xl bg-white border border-ink-900/10 flex items-center justify-center shadow-card"
          >
            <MessageCircle size={20} className="text-ink-700" />
          </button>
          <ShareButton
            iconOnly
            title={event.nameHe}
            text={`כרטיס ל${event.nameHe} ב${event.venue.city} · החל מ־${fmtAgorot(listing.priceAgorot)}`}
          />
          <Link href={`/checkout/${listing.id}`} className="flex-1">
            <Button size="lg" fullWidth>
              קנו עכשיו · {fmtAgorot(totals.totalAgorot)}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
