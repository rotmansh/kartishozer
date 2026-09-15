"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";

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

  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { error: "השיחה לא נמצאה" };
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return { error: "אין לכם גישה לשיחה הזו" };
  }

  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: user.id, body } }),
    db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");

  return { success: true };
}
