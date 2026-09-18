import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppUser, isAdmin } from "@/lib/auth/server";
import { getFileStorageProvider } from "@/lib/storage/provider.factory";

export const dynamic = "force-dynamic";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Mirrors /api/tickets/[listingId]: the only place a dispute evidence
// file's bytes ever reach a browser. Only the buyer/seller on the
// dispute's own order, or an admin, can reach this.
export async function GET(
  _req: Request,
  { params }: { params: { disputeId: string; evidenceId: string } }
) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });

  const evidence = await db.disputeEvidence.findUnique({
    where: { id: params.evidenceId },
    include: {
      dispute: { include: { order: { include: { vendor: { select: { userId: true } } } } } },
    },
  });

  if (!evidence || evidence.disputeId !== params.disputeId) {
    return NextResponse.json({ error: "הקובץ לא נמצא" }, { status: 404 });
  }

  const isBuyer = evidence.dispute.order.buyerId === user.id;
  const isSeller = evidence.dispute.order.vendor.userId === user.id;
  if (!isBuyer && !isSeller && !(await isAdmin())) {
    return NextResponse.json({ error: "אין לכם הרשאה לצפות בקובץ זה" }, { status: 403 });
  }

  const provider = getFileStorageProvider();
  if (!provider) return NextResponse.json({ error: "אחסון קבצים אינו זמין כרגע" }, { status: 500 });

  const buffer = await provider.fetch(evidence.storageUrl);
  const ext = EXT_BY_MIME[evidence.mimeType] ?? "bin";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Disposition": `inline; filename="evidence-${evidence.id}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
