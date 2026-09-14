import { getListingsByEvent } from "@/lib/mock/listings";
import { DEFAULT_FEES } from "@/lib/types";

export function getMinPriceAgorot(eventId: string): number | null {
  const listings = getListingsByEvent(eventId);
  if (listings.length === 0) return null;
  return Math.min(...listings.map((l) => l.priceAgorot));
}

export function getListingCount(eventId: string): number {
  return getListingsByEvent(eventId).length;
}

export function computeOrderTotals(priceAgorot: number) {
  const buyerFeeAgorot = Math.round((priceAgorot * DEFAULT_FEES.buyerFeePercent) / 100);
  return {
    priceAgorot,
    buyerFeeAgorot,
    totalAgorot: priceAgorot + buyerFeeAgorot,
  };
}
