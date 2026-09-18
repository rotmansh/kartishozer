import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getFileStorageProvider } from "@/lib/storage/provider.factory";

export const dynamic = "force-dynamic";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// The only place a ticket file's bytes ever reach a browser. A buyer can
// only get here once they actually own an order on this listing — there
// is no other route, link, or API response anywhere in the app that
// exposes TicketFile.storageUrl itself.
export async function GET(_req: Request, { params }: { params: { listingId: string } }) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });

  const listing = await db.listing.findUnique({
    where: { id: params.listingId },
    include: {
      ticketFile: true,
      vendor: { select: { userId: true } },
      orders: {
        where: { buyerId: user.id, status: { in: ["PAID", "CONFIRMED", "TICKET_DELIVERED", "DISPUTED"] } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!listing || !listing.ticketFile) {
    return NextResponse.json({ error: "לא נמצא קובץ כרטיס למודעה זו" }, { status: 404 });
  }

  const isOwner = listing.vendor.userId === user.id;
  const isPayingBuyer = listing.orders.length > 0;
  if (!isOwner && !isPayingBuyer) {
    return NextResponse.json({ error: "אין לכם הרשאה לצפות בקובץ זה" }, { status: 403 });
  }

  const provider = getFileStorageProvider();
  if (!provider) return NextResponse.json({ error: "אחסון קבצים אינו זמין כרגע" }, { status: 500 });

  const buffer = await provider.fetch(listing.ticketFile.storageUrl);
  const ext = EXT_BY_MIME[listing.ticketFile.mimeType] ?? "bin";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": listing.ticketFile.mimeType,
      "Content-Disposition": `attachment; filename="ticket-${listing.id}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
