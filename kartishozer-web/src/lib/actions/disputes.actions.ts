"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { sendDisputeUpdateEmail } from "@/lib/notifications/email";
import { sendPushForDisputeUpdate } from "@/lib/notifications/push";
import { getFileStorageProvider } from "@/lib/storage/provider.factory";
import { checkRateLimit } from "@/lib/rateLimit";
import { fileContentMatchesClaimedType } from "@/lib/fileSignature";
import type { OrderStatus, DisputeEvidenceUploader } from "@prisma/client";

type ActionResult<T = { success: true }> = T | { error: string };

const OPEN_DISPUTE_STATUSES = ["OPEN", "UNDER_REVIEW"] as const;
const ALLOWED_EVIDENCE_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Both new actions below need the same check: is this user the buyer or
 * the seller on the order this dispute belongs to (an admin uses the
 * separate /admin/disputes flow, not these). Centralized so "you're not
 * part of this dispute" is enforced identically everywhere, not
 * re-implemented slightly differently per action.
 */
async function loadDisputeForParty(disputeId: string, userId: string) {
  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          event: { select: { nameHe: true } },
          buyer: true,
          vendor: { include: { user: true } },
        },
      },
    },
  });
  const notFound = { error: "הפנייה לא נמצאה" } as const;
  const noAccess = { error: "אין לכם גישה לפנייה זו" } as const;
  if (!dispute) return notFound;

  const isBuyer = dispute.order.buyerId === userId;
  const isSeller = dispute.order.vendor.userId === userId;
  if (!isBuyer && !isSeller) return noAccess;

  return { dispute, role: (isBuyer ? "BUYER" : "SELLER") as DisputeEvidenceUploader };
}

// TICKET_DELIVERED is never actually set anywhere in the app today (the
// buyer/seller hand off the ticket over the order's chat, not a tracked
// state), but it's a legitimate future state to allow a dispute from, so
// it's included here even though only PAID/CONFIRMED occur in practice.
const DISPUTABLE_ORDER_STATUSES: OrderStatus[] = ["PAID", "CONFIRMED", "TICKET_DELIVERED"];

const openDisputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(10, "נא לתאר את הבעיה בפירוט (לפחות 10 תווים)").max(1000),
});

/**
 * The buyer-facing "הכרטיס לא עבד" flow. Opening a dispute freezes the
 * escrowed money immediately, in two ways at once rather than relying on
 * just one: flipping the order to DISPUTED takes it out of the pool
 * schedule-payouts ever looks at (that cron only selects status "PAID"),
 * and any payout already scheduled for this order (created earlier by
 * that same cron once the event passed, or the admin's manual flow, before
 * the buyer even noticed a problem) is put ON_HOLD explicitly here since
 * the status change alone wouldn't touch a Payout row that already exists.
 * An admin resolves the dispute from /admin/disputes — see
 * resolveDisputeAction — which is what actually pays the seller or
 * refunds the buyer.
 */
export async function openDisputeAction(
  input: z.infer<typeof openDisputeSchema>
): Promise<ActionResult<{ disputeId: string }>> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לפתוח פנייה" };

  if (!(await checkRateLimit(`openDispute:${user.id}`, 5, 10 * 60_000))) {
    return { error: "יותר מדי פניות בזמן קצר — נסו שוב בעוד כמה דקות" };
  }

  const parsed = openDisputeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const { orderId, reason } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { select: { nameHe: true, startsAt: true } },
      vendor: { include: { user: true } },
      payouts: { where: { status: "PENDING" }, select: { id: true, amountAgorot: true } },
      disputes: { where: { status: { in: ["OPEN", "UNDER_REVIEW"] } }, select: { id: true } },
    },
  });

  if (!order || order.buyerId !== user.id) return { error: "ההזמנה לא נמצאה" };
  if (!DISPUTABLE_ORDER_STATUSES.includes(order.status)) {
    return { error: "לא ניתן לפתוח פנייה על הזמנה בסטטוס זה" };
  }
  if (order.disputes.length > 0) {
    return { error: "כבר פתוחה פנייה על ההזמנה הזו — צוות התמיכה כבר מטפל בה" };
  }

  // Configurable via /admin/config (dispute_window_days) — measured from
  // the event date, not the purchase date, since "the ticket didn't
  // work" is only discoverable at or after the event itself. A ticket
  // bought weeks ahead of the show shouldn't have its window quietly
  // expire before the event even happens.
  const windowConfig = await db.platformConfig.findUnique({ where: { key: "dispute_window_days" } });
  const windowDays = Number(windowConfig?.value ?? 14);
  const disputeDeadline = new Date(order.event.startsAt);
  disputeDeadline.setDate(disputeDeadline.getDate() + windowDays);
  if (new Date() > disputeDeadline) {
    return { error: `לא ניתן לפתוח פנייה יותר מ-${windowDays} ימים לאחר מועד האירוע` };
  }

  const dispute = await db.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        orderId: order.id,
        type: "TICKET_INVALID",
        reason,
        status: "OPEN",
        requestedById: user.id,
      },
    });

    await tx.order.update({ where: { id: order.id }, data: { status: "DISPUTED" } });

    if (order.payouts.length > 0) {
      await tx.payout.updateMany({
        where: { id: { in: order.payouts.map((p) => p.id) } },
        data: { status: "ON_HOLD", failureReason: `הוקפא אוטומטית — מחלוקת פתוחה (${created.id})` },
      });
      await tx.paymentEvent.createMany({
        data: order.payouts.map((p) => ({
          orderId: order.id,
          payoutId: p.id,
          type: "PAYOUT_HELD" as const,
          provider: "internal",
          amountAgorot: p.amountAgorot,
          reason: `dispute opened (${created.id})`,
        })),
      });
    }

    return created;
  });

  revalidatePath("/profile");
  revalidatePath("/admin/disputes");
  revalidatePath("/admin/payouts");

  // The seller has no reason to be watching their own order right now —
  // this is the only way they'd find out a payment they're expecting just
  // got frozen, short of admin manually telling them.
  const sellerUser = order.vendor.user;
  await Promise.all([
    sendDisputeUpdateEmail({
      recipientUserId: sellerUser.id,
      toEmail: sellerUser.email,
      toName: sellerUser.fullName,
      subject: `נפתחה פנייה על ${order.event.nameHe}`,
      headline: `הקונה פתח/ה פנייה על ההזמנה עבור <strong>${order.event.nameHe}</strong>. התשלום שלך על ההזמנה הזו מוקפא עד לבירור מול הצוות שלנו.`,
    }),
    sendPushForDisputeUpdate({
      recipientUserId: sellerUser.id,
      title: "נפתחה פנייה על הזמנה",
      body: `${order.event.nameHe} — התשלום מוקפא עד לבירור`,
    }),
  ]);

  return { disputeId: dispute.id };
}

const sellerRespondSchema = z.object({
  disputeId: z.string().min(1),
  response: z.string().min(10, "נא לכתוב תגובה מפורטת (לפחות 10 תווים)").max(1000),
});

/**
 * One response per seller, ever, per dispute — this is a chance to give
 * their side of the story before an admin decides, not a chat. Once
 * written it's part of the record an admin (and later, the buyer) sees;
 * editing it after the fact would undermine that. If the dispute closes
 * before the seller responds, that's their choice to skip it.
 */
export async function sellerRespondToDisputeAction(
  input: z.infer<typeof sellerRespondSchema>
): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי להגיב" };

  const parsed = sellerRespondSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const { disputeId, response } = parsed.data;

  const loaded = await loadDisputeForParty(disputeId, user.id);
  if ("error" in loaded) return { error: loaded.error };
  if (loaded.role !== "SELLER") return { error: "רק המוכר יכול להגיב לפנייה זו" };

  const { dispute } = loaded;
  if (!OPEN_DISPUTE_STATUSES.includes(dispute.status as (typeof OPEN_DISPUTE_STATUSES)[number])) {
    return { error: "הפנייה כבר נסגרה" };
  }
  if (dispute.sellerResponse) return { error: "כבר הגבת לפנייה זו" };

  await db.dispute.update({
    where: { id: disputeId },
    data: { sellerResponse: response, sellerRespondedAt: new Date() },
  });

  revalidatePath("/profile");
  revalidatePath("/admin/disputes");

  // Only the buyer needs to hear about this — the response text itself
  // stays in the app (never echoed into an email/push body), same as the
  // buyer's own dispute reason never appears in the seller's notification.
  const { buyer, event } = dispute.order;
  const headline = `המוכר/ת הגיב/ה לפנייה שפתחת על <strong>${event.nameHe}</strong>. אפשר לראות את התגובה בעמוד ההזמנה.`;
  await Promise.all([
    sendDisputeUpdateEmail({
      recipientUserId: buyer.id,
      toEmail: buyer.email,
      toName: buyer.fullName,
      subject: `התקבלה תגובה לפנייה שלך — ${event.nameHe}`,
      headline,
    }),
    sendPushForDisputeUpdate({
      recipientUserId: buyer.id,
      title: "המוכר/ת הגיב/ה לפנייה",
      body: event.nameHe,
    }),
  ]);

  return { success: true };
}

const addEvidenceSchema = z.object({
  disputeId: z.string().min(1),
  note: z.string().max(500).optional(),
});

/**
 * Either party can attach supporting files (screenshots of the event
 * being cancelled, a rejection message from the venue, etc.) while the
 * dispute is still open. This is pure data collection for the admin who
 * resolves the dispute manually — no automated decision is made from it.
 */
export async function addDisputeEvidenceAction(formData: FormData): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי להעלות קובץ" };

  // Protects storage costs — a real dispute needs a handful of files at
  // most, never dozens in an hour.
  if (!(await checkRateLimit(`uploadEvidence:${user.id}`, 10, 60 * 60_000))) {
    return { error: "יותר מדי קבצים הועלו בזמן קצר — נסו שוב מאוחר יותר" };
  }

  const parsed = addEvidenceSchema.safeParse({
    disputeId: formData.get("disputeId"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "פרטים לא תקינים" };
  const { disputeId, note } = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "נא לבחור קובץ" };
  if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type)) {
    return { error: "סוג קובץ לא נתמך — יש להעלות תמונה (JPG/PNG) או PDF" };
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return { error: "הקובץ גדול מדי (מקסימום 10MB)" };
  }

  const loaded = await loadDisputeForParty(disputeId, user.id);
  if ("error" in loaded) return { error: loaded.error };
  const { dispute, role } = loaded;

  if (!OPEN_DISPUTE_STATUSES.includes(dispute.status as (typeof OPEN_DISPUTE_STATUSES)[number])) {
    return { error: "הפנייה כבר נסגרה" };
  }

  const storage = getFileStorageProvider();
  if (!storage) return { error: "העלאת קבצים אינה זמינה כרגע" };

  const buffer = Buffer.from(await file.arrayBuffer());

  // Same defense as ticketFiles.actions.ts's upload — file.type is only
  // what the browser's upload request claimed, so check the actual bytes
  // before trusting it for storage or how this file gets served back.
  if (!fileContentMatchesClaimedType(buffer, file.type)) {
    return { error: "תוכן הקובץ אינו תואם לסוג הקובץ המוצהר" };
  }

  const key = `dispute-evidence/${disputeId}-${Date.now()}`;
  const { url } = await storage.upload({ key, buffer, contentType: file.type });

  await db.disputeEvidence.create({
    data: {
      disputeId,
      uploadedById: user.id,
      uploaderRole: role,
      storageUrl: url,
      mimeType: file.type,
      fileSizeBytes: file.size,
      note: note || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/admin/disputes");

  // Notify whichever side didn't just upload — never the uploader
  // themselves, and never the file or its note (an admin only ever reads
  // evidence from /admin/disputes, so there's no ADMIN-uploader case to
  // notify a "counterparty" for here).
  const { buyer, vendor, event } = dispute.order;
  const recipient = role === "BUYER" ? vendor.user : role === "SELLER" ? buyer : null;
  if (recipient) {
    const headline = `נוספה אסמכתא חדשה לפנייה על <strong>${event.nameHe}</strong>. אפשר לראות אותה בעמוד ההזמנה.`;
    await Promise.all([
      sendDisputeUpdateEmail({
        recipientUserId: recipient.id,
        toEmail: recipient.email,
        toName: recipient.fullName,
        subject: `נוספה אסמכתא לפנייה — ${event.nameHe}`,
        headline,
      }),
      sendPushForDisputeUpdate({
        recipientUserId: recipient.id,
        title: "נוספה אסמכתא לפנייה",
        body: event.nameHe,
      }),
    ]);
  }

  return { success: true };
}
