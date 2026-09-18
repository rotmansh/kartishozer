"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getFileStorageProvider } from "@/lib/storage/provider.factory";

type ActionResult<T = { success: true }> = T | { error: string };

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Exact-file duplicate detection is worth a heavy penalty on its own —
// the same bytes showing up under a second listing (any vendor) is
// stronger evidence than any of the softer signals in assessListingRisk.
const DUPLICATE_FILE_SCORE_PENALTY = 50;

/**
 * The digital-vault upload: a seller attaches their actual ticket file to
 * a listing. The file itself is never linked to from anywhere a buyer can
 * reach before paying — see /api/tickets/[listingId], the only reader of
 * TicketFile.storageUrl. A file whose exact bytes already exist under a
 * different listing is rejected outright and the *current* listing (not
 * just this upload) is pushed to manual review — attempting to upload a
 * ticket someone else already has on the platform is itself strong fraud
 * evidence, whoever the current uploader is.
 */
export async function uploadTicketFileAction(formData: FormData): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user?.vendor) return { error: "יש להתחבר כמוכר/ת" };

  const listingId = String(formData.get("listingId") ?? "");
  const file = formData.get("file");
  if (!listingId || !(file instanceof File)) return { error: "לא נבחר קובץ" };

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: "יש להעלות קובץ PDF, JPG או PNG בלבד" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "הקובץ גדול מדי — הגודל המקסימלי הוא 10MB" };
  }

  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.vendorId !== user.vendor.id) return { error: "המודעה לא נמצאה" };

  const provider = getFileStorageProvider();
  if (!provider) return { error: "העלאת קבצים אינה זמינה כרגע — נסו שוב מאוחר יותר" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const duplicate = await db.ticketFile.findFirst({
    where: { sha256, listingId: { not: listingId } },
  });

  if (duplicate) {
    // An exact-file duplicate is decisive on its own — this forces manual
    // review outright rather than only adding points and letting the
    // usual threshold math decide, which a listing with a low starting
    // score could otherwise dodge (verified: a clean listing's base score
    // plus this penalty alone can land under risk_manual_review_threshold
    // and stay ACTIVE, which would defeat the entire point of catching a
    // literal re-upload of someone else's ticket).
    const risk = await db.listingRisk.findUnique({ where: { listingId } });
    const newScore = (risk?.totalScore ?? 0) + DUPLICATE_FILE_SCORE_PENALTY;

    await db.$transaction([
      db.listingRisk.update({
        where: { listingId },
        data: { duplicatePdfHash: true, totalScore: newScore, decision: "REQUEST_INFO" },
      }),
      db.listing.update({
        where: { id: listingId },
        data: { status: "PENDING_REVIEW", riskLevel: "HIGH", riskScore: newScore },
      }),
    ]);

    revalidatePath("/profile");
    revalidatePath("/admin/listings");
    return { error: "הקובץ הזה כבר הועלה למערכת במודעה אחרת. המודעה שלכם סומנה לבדיקה." };
  }

  const key = `tickets/${listingId}-${Date.now()}`;
  const { url } = await provider.upload({ key, buffer, contentType: file.type });

  await db.ticketFile.upsert({
    where: { listingId },
    create: { listingId, storageUrl: url, mimeType: file.type, fileSizeBytes: file.size, sha256 },
    update: { storageUrl: url, mimeType: file.type, fileSizeBytes: file.size, sha256, uploadedAt: new Date() },
  });

  revalidatePath("/profile");
  revalidatePath(`/listing/${listingId}`);
  return { success: true };
}
