"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { sendNewMessageEmail } from "@/lib/notifications/email";
import { sendPushForNewMessage } from "@/lib/notifications/push";

type ActionResult<T = { success: true }> = T | { error: string };

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export async function sendMessageAction(input: z.infer<typeof sendMessageSchema>): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי לשלוח הודעות" };

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { error: "לא ניתן לשלוח הודעה ריקה" };
  const { conversationId, body } = parsed.data;

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { buyer: true, seller: true, order: { include: { event: true } } },
  });
  if (!conversation) return { error: "השיחה לא נמצאה" };
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return { error: "אין לכם גישה לשיחה הזו" };
  }

  // Sending a message means the sender is, by definition, caught up on
  // this thread — bump their own read pointer so their own message doesn't
  // leave their side showing an unread badge.
  const now = new Date();
  const isBuyer = conversation.buyerId === user.id;
  const recipient = isBuyer ? conversation.seller : conversation.buyer;

  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, body } }),
    db.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: now,
        ...(isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now }),
      },
    }),
  ]);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");

  // The recipient may well not have the app open right now — notify them
  // by whichever channels are configured, without letting either one's
  // failure affect the message that already sent successfully.
  await Promise.all([
    sendNewMessageEmail({
      recipientUserId: recipient.id,
      toEmail: recipient.email,
      toName: recipient.fullName,
      fromName: user.fullName,
      eventNameHe: conversation.order.event.nameHe,
      conversationId,
      messageBody: body,
    }),
    sendPushForNewMessage({
      recipientUserId: recipient.id,
      fromName: user.fullName,
      eventNameHe: conversation.order.event.nameHe,
      conversationId,
      messageBody: body,
    }),
  ]);

  return { success: true };
}

/** Marks a conversation as read up to now for whichever side `userId` is on. */
export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { error: "השיחה לא נמצאה" };
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return { error: "אין לכם גישה לשיחה הזו" };
  }

  const isBuyer = conversation.buyerId === user.id;
  await db.conversation.update({
    where: { id: conversationId },
    data: isBuyer ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
  });

  return { success: true };
}
