import "server-only";

import webpush from "web-push";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim();
const PUSH_ENABLED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (PUSH_ENABLED) {
  webpush.setVapidDetails(`mailto:notifications@${new URL(getSiteUrl()).hostname}`, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

async function deliverPush(
  recipientUserId: string,
  payload: { title: string; body: string; url: string }
): Promise<void> {
  if (!PUSH_ENABLED) return;

  const subscriptions = await db.pushSubscription.findMany({ where: { userId: recipientUserId } });
  if (subscriptions.length === 0) return;

  const serialized = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          serialized
        );
      } catch (err) {
        // 404/410 means the browser dropped this subscription (uninstalled,
        // cleared site data, expired) — stop trying to push to it.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("Failed to send push notification:", err);
        }
      }
    })
  );
}

export async function sendPushForNewMessage(params: {
  recipientUserId: string;
  fromName: string;
  eventNameHe: string;
  conversationId: string;
  messageBody: string;
}): Promise<void> {
  await deliverPush(params.recipientUserId, {
    title: `${params.fromName} • ${params.eventNameHe}`,
    body: params.messageBody,
    url: `/messages/${params.conversationId}`,
  });
}

export async function sendPushForDisputeUpdate(params: {
  recipientUserId: string;
  title: string;
  body: string;
}): Promise<void> {
  await deliverPush(params.recipientUserId, { title: params.title, body: params.body, url: "/profile" });
}
