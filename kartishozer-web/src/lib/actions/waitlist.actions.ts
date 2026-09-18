"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";

/**
 * Joining only makes sense while the event has zero ACTIVE listings —
 * once there's a real listing to buy, there's nothing to be "notified"
 * about, so this rejects rather than silently no-opping (a caller passing
 * an eventId with active listings is either the empty-state UI being
 * stale, or a direct action call that doesn't belong here).
 */
export async function joinEventWaitlistAction(eventId: string): Promise<{ joined: boolean } | { error: string }> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר כדי להצטרף לרשימת ההמתנה" };

  const activeCount = await db.listing.count({ where: { eventId, status: "ACTIVE", deletedAt: null } });
  if (activeCount > 0) return { error: "יש כבר כרטיסים למכירה לאירוע הזה" };

  await db.eventWaitlist.upsert({
    where: { userId_eventId: { userId: user.id, eventId } },
    create: { userId: user.id, eventId },
    update: {},
  });

  revalidatePath(`/event/${eventId}`);
  return { joined: true };
}

export async function leaveEventWaitlistAction(eventId: string): Promise<{ joined: boolean } | { error: string }> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  await db.eventWaitlist.deleteMany({ where: { userId: user.id, eventId } });

  revalidatePath(`/event/${eventId}`);
  return { joined: false };
}
