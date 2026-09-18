"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getNotificationPreference, type NotificationPreferenceFlags } from "@/lib/notificationPreferences";

export async function getMyNotificationPreferencesAction(): Promise<NotificationPreferenceFlags | { error: string }> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };
  return getNotificationPreference(user.id);
}

export async function updateNotificationPreferenceAction(
  key: keyof NotificationPreferenceFlags,
  value: boolean
): Promise<{ success: true } | { error: string }> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  await db.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, [key]: value },
    update: { [key]: value },
  });

  revalidatePath("/profile/notifications");
  return { success: true };
}
