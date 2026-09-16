import "server-only";

import { db } from "@/lib/db";

type ReadTrackedConversation = {
  buyerId: string;
  sellerId: string;
  buyerLastReadAt: Date | null;
  sellerLastReadAt: Date | null;
  messages: { senderId: string; createdAt: Date }[];
};

/**
 * A conversation counts as unread for `userId` when its most recent message
 * was sent by the other side and arrived after this user's own last-read
 * timestamp for their side of the thread (or they've never opened it at
 * all). Only the latest message matters — if the user already saw it,
 * older unseen messages don't resurface the badge, same as most chat apps.
 */
export function hasUnreadMessage(conversation: ReadTrackedConversation, userId: string): boolean {
  const lastMessage = conversation.messages[0];
  if (!lastMessage || lastMessage.senderId === userId) return false;
  const lastReadAt = conversation.buyerId === userId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt;
  return !lastReadAt || lastMessage.createdAt > lastReadAt;
}

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
      isUnread: hasUnreadMessage(c, userId),
    };
  });
}

/** Total number of conversations with an unread message, for nav badges. */
export async function getUnreadConversationCount(userId: string): Promise<number> {
  const conversations = await db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: {
      buyerId: true,
      sellerId: true,
      buyerLastReadAt: true,
      sellerLastReadAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderId: true, createdAt: true } },
    },
  });
  return conversations.filter((c) => hasUnreadMessage(c, userId)).length;
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
