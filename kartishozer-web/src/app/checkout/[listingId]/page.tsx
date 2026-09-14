import type { Metadata } from "next";
import { getListing, getEvent, computeOrderTotals } from "@/lib/queries/catalog";
import { CheckoutClient } from "./CheckoutClient";

type Props = { params: { listingId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing(params.listingId);
  const event = listing ? await getEvent(listing.eventId) : undefined;
  return { title: event ? `תשלום · ${event.nameHe} | כרטיס חוזר` : "כרטיס חוזר" };
}

export default async function CheckoutPage({ params }: Props) {
  const listing = await getListing(params.listingId);
  const event = listing ? await getEvent(listing.eventId) : null;
  const totals = listing ? await computeOrderTotals(listing.priceAgorot) : null;

  return <CheckoutClient listing={listing} event={event} totals={totals} />;
}
