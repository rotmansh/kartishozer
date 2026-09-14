import type { Metadata } from "next";
import { LISTINGS, getListing } from "@/lib/mock/listings";
import { getEvent } from "@/lib/mock/events";
import { CheckoutClient } from "./CheckoutClient";

type Props = { params: { listingId: string } };

export function generateStaticParams() {
  return LISTINGS.map((l) => ({ listingId: l.id }));
}

export function generateMetadata({ params }: Props): Metadata {
  const listing = getListing(params.listingId);
  const event = listing ? getEvent(listing.eventId) : undefined;
  return { title: event ? `תשלום · ${event.nameHe} | כרטיס חוזר` : "כרטיס חוזר" };
}

export default function CheckoutPage({ params }: Props) {
  return <CheckoutClient listingId={params.listingId} />;
}
