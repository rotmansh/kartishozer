import "server-only";
import { db } from "@/lib/db";

export type NotificationPreferenceFlags = {
  notifyNewMessage: boolean;
  notifyDisputeUpdate: boolean;
  notifyListingAvailable: boolean;
};

const ALL_ENABLED: NotificationPreferenceFlags = {
  notifyNewMessage: true,
  notifyDisputeUpdate: true,
  notifyListingAvailable: true,
};

/**
 * No row for this user means every category is on — this table is
 * opt-out, not opt-in, matching how every notification helper behaved
 * before this table existed (always send). A user who never opens the
 * notification settings page gets exactly the same behavior as today.
 */
export async function getNotificationPreference(userId: string): Promise<NotificationPreferenceFlags> {
  const row = await db.notificationPreference.findUnique({ where: { userId } });
  if (!row) return ALL_ENABLED;
  return {
    notifyNewMessage: row.notifyNewMessage,
    notifyDisputeUpdate: row.notifyDisputeUpdate,
    notifyListingAvailable: row.notifyListingAvailable,
  };
}
