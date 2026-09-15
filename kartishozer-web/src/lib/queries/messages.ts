import "server-only";

import { db } from "@/lib/db";

export async function getConversationsForUser(userId: string) {
  const conversations = await db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    include: {
      buyer: true,
      seller: true,
      order: { include: { event: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((c) => {
    const isBuyer = c.buyerId === userId;
    const counterpart = isBuyer ? c.seller : c.buyer;
    return {
      id: c.id,
      counterpartName: counterpart.fullName,
      eventNameHe: c.order.event.nameHe,
      orderStatus: c.order.status,
      lastMessage: c.messages[0] ?? null,
      updatedAt: c.updatedAt,
    };
  });
}

/** Returns null if the conversation doesn't exist or userId isn't a party to it. */
export async function getConversationForUser(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      buyer: true,
      seller: true,
      order: { include: { event: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });

  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;

  const isBuyer = conversation.buyerId === userId;
  return { ...conversation, counterpart: isBuyer ? conversation.seller : conversation.buyer };
}
