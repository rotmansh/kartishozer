"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getFileStorageProvider } from "@/lib/storage/provider.factory";
import { RISK_ENGINE_VERSION } from "@/lib/riskEngineVersion";
import { checkRateLimit } from "@/lib/rateLimit";
import { fileContentMatchesClaimedType } from "@/lib/fileSignature";
import { decodeQrContent } from "@/lib/qrDecode";
import type { RiskAssessmentTrigger } from "@prisma/client";

type ActionResult<T = { success: true }> = T | { error: string };

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Exact-file/QR-content duplicate detection is worth a heavy penalty on
// its own — the same ticket showing up under a second listing (any
// vendor) is stronger evidence than any of the softer signals in
// assessListingRisk.
const DUPLICATE_FILE_SCORE_PENALTY = 50;

/**
 * Shared by both duplicate-detection paths below (exact file bytes, and
 * QR content) — same forced-review treatment either way, just a
 * different flag/trigger to keep the audit trail (RiskAssessmentEvent)
 * able to distinguish which signal actually caught it.
 */
async function forceListingToManualReview(params: {
  listingId: string;
  vendorId: string;
  trigger: RiskAssessmentTrigger;
  flag: "duplicatePdfHash" | "duplicateBarcode";
}): Promise<void> {
  const { listingId, vendorId, trigger, flag } = params;
  const risk = await db.listingRisk.findUnique({ where: { listingId } });
  const newScore = (risk?.totalScore ?? 0) + DUPLICATE_FILE_SCORE_PENALTY;

  await db.$transaction([
    db.listingRisk.update({
      where: { listingId },
      data: {
        [flag]: true,
        totalScore: newScore,
        decision: "REQUEST_INFO",
        riskEngineVersion: RISK_ENGINE_VERSION,
      },
    }),
    db.listing.update({
      where: { id: listingId },
      data: { status: "PENDING_REVIEW", riskLevel: "HIGH", riskScore: newScore },
    }),
    // Same P0 fix as listings.actions.ts: this forced override used to
    // only ever touch the current-state ListingRisk row — the exact
    // combination of flags that triggered a forced manual review is now
    // preserved permanently instead of being just another overwrite.
    db.riskAssessmentEvent.create({
      data: {
        listingId,
        vendorId,
        trigger,
        riskEngineVersion: RISK_ENGINE_VERSION,
        totalScore: newScore,
        riskLevel: "HIGH",
        decision: "REQUEST_INFO",
        duplicateBarcode: flag === "duplicateBarcode" ? true : risk?.duplicateBarcode ?? false,
        duplicatePdfHash: flag === "duplicatePdfHash" ? true : risk?.duplicatePdfHash ?? false,
        suspiciousFaceValue: risk?.suspiciousFaceValue ?? false,
        highRiskAccount: risk?.highRiskAccount ?? false,
        bulkListingFlag: risk?.bulkListingFlag ?? false,
        repeatEventFlag: risk?.repeatEventFlag ?? false,
        highQuantityFlag: risk?.highQuantityFlag ?? false,
        highValueTicketFlag: risk?.highValueTicketFlag ?? false,
        pastDisputeFlag: risk?.pastDisputeFlag ?? false,
        trustedSellerCredit: risk?.trustedSellerCredit ?? false,
      },
    }),
  ]);

  revalidatePath("/profile");
  revalidatePath("/admin/listings");
}

/**
 * The digital-vault upload: a seller attaches their actual ticket file to
 * a listing. The file itself is never linked to from anywhere a buyer can
 * reach before paying — see /api/tickets/[listingId], the only reader of
 * TicketFile.storageUrl. Two independent duplicate signals, either one
 * decisive on its own: exact file bytes already existing under a
 * different listing, or (for JPEG/PNG only) the same QR content already
 * existing under a different listing despite different file bytes — a
 * re-photographed or re-encoded copy of the same physical ticket.
 * Whichever fires, the *current* listing (not just this upload) is
 * pushed to manual review — attempting to upload a ticket someone else
 * already has on the platform is itself strong fraud evidence, whoever
 * the current uploader is.
 */
export async function uploadTicketFileAction(formData: FormData): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user?.vendor) return { error: "יש להתחבר כמוכר/ת" };

  // Protects storage costs — a seller replacing their ticket file a
  // handful of times is normal, dozens of uploads in an hour isn't.
  if (!(await checkRateLimit(`uploadTicketFile:${user.id}`, 10, 60 * 60_000))) {
    return { error: "יותר מדי קבצים הועלו בזמן קצר — נסו שוב מאוחר יותר" };
  }

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

  // file.type is only what the browser's upload request claimed — check
  // the actual bytes match before trusting it for anything (storage,
  // hashing, or the Content-Type this file is later served back with).
  if (!fileContentMatchesClaimedType(buffer, file.type)) {
    return { error: "תוכן הקובץ אינו תואם לסוג הקובץ המוצהר" };
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");

  const fileDuplicate = await db.ticketFile.findFirst({
    where: { sha256, listingId: { not: listingId } },
  });

  if (fileDuplicate) {
    // An exact-file duplicate is decisive on its own — this forces manual
    // review outright rather than only adding points and letting the
    // usual threshold math decide, which a listing with a low starting
    // score could otherwise dodge (verified: a clean listing's base score
    // plus this penalty alone can land under risk_manual_review_threshold
    // and stay ACTIVE, which would defeat the entire point of catching a
    // literal re-upload of someone else's ticket).
    await forceListingToManualReview({
      listingId,
      vendorId: listing.vendorId,
      trigger: "DUPLICATE_FILE_DETECTED",
      flag: "duplicatePdfHash",
    });
    return { error: "הקובץ הזה כבר הועלה למערכת במודעה אחרת. המודעה שלכם סומנה לבדיקה." };
  }

  // A follow-up signal for what exact-file hashing can't catch: a photo
  // or re-encoded copy of the same physical ticket has different bytes
  // but usually the same embedded QR content. PDFs are never decoded
  // (see decodeQrContent) — a failure to find a QR code here isn't
  // treated as suspicious on its own, only a genuine content match is.
  const qrContent = await decodeQrContent(buffer, file.type);
  if (qrContent) {
    const qrContentHash = createHash("sha256").update(qrContent).digest("hex");
    const qrDuplicate = await db.ticketFile.findFirst({
      where: { qrContentHash, listingId: { not: listingId } },
    });
    if (qrDuplicate) {
      await forceListingToManualReview({
        listingId,
        vendorId: listing.vendorId,
        trigger: "DUPLICATE_QR_DETECTED",
        flag: "duplicateBarcode",
      });
      return { error: "קוד ה-QR בכרטיס כבר קיים במודעה אחרת במערכת. המודעה שלכם סומנה לבדיקה." };
    }
  }

  const key = `tickets/${listingId}-${Date.now()}`;
  const { url } = await provider.upload({ key, buffer, contentType: file.type });
  const qrContentHash = qrContent ? createHash("sha256").update(qrContent).digest("hex") : null;

  await db.ticketFile.upsert({
    where: { listingId },
    create: { listingId, storageUrl: url, mimeType: file.type, fileSizeBytes: file.size, sha256, qrContentHash },
    update: {
      storageUrl: url,
      mimeType: file.type,
      fileSizeBytes: file.size,
      sha256,
      qrContentHash,
      uploadedAt: new Date(),
    },
  });

  revalidatePath("/profile");
  revalidatePath(`/listing/${listingId}`);
  return { success: true };
}
