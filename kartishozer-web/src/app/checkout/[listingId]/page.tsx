import type { Metadata } from "next";
import { getListing, getEvent, computeOrderTotals, getPlatformFees } from "@/lib/queries/catalog";
import { getAppUser } from "@/lib/auth/server";
import { recordCheckoutStarted } from "@/lib/analytics";
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
  const fees = listing ? await getPlatformFees() : null;

  if (listing) {
    const user = await getAppUser();
    if (user) await recordCheckoutStarted({ listingId: listing.id, userId: user.id });
  }

  return (
    <CheckoutClient listing={listing} event={event} totals={totals} buyerFeePercent={fees?.buyerFeePercent ?? 0} />
  );
}
