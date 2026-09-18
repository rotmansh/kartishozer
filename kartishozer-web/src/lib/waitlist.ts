import "server-only";
import { db } from "@/lib/db";
import { sendListingAvailableEmail } from "@/lib/notifications/email";
import { sendPushForListingAvailable } from "@/lib/notifications/push";

/**
 * Called right after a listing for this event is created/approved as
 * ACTIVE. Notifies (and clears) the event's waitlist only on the exact
 * transition from 0 to 1 active listings — every listing after the first
 * is just another listing for an event buyers can already see, not a
 * "back in stock" moment. Re-counts from the DB rather than trusting a
 * flag passed in, so both call sites (seller auto-approval, admin manual
 * approval) share one source of truth for "was this the first one."
 *
 * Fire-and-forget by design, like every other notification helper in this
 * app: a failed email/push must never fail the listing action that
 * triggered it (each of sendListingAvailableEmail/sendPushForListingAvailable
 * already catches its own errors). Note this also means an unconfigured
 * provider (no RESEND_API_KEY / VAPID keys) silently no-ops and the
 * waitlist is still cleared — consistent with how every other optional
 * notification channel in this codebase behaves when unconfigured.
 */
export async function notifyEventWaitlistIfFirstActiveListing(eventId: string, eventNameHe: string): Promise<void> {
  const activeCount = await db.listing.count({ where: { eventId, status: "ACTIVE", deletedAt: null } });
  if (activeCount !== 1) return;

  const entries = await db.eventWaitlist.findMany({ where: { eventId }, include: { user: true } });
  if (entries.length === 0) return;

  await Promise.all(
    entries.map((entry) =>
      Promise.all([
        sendListingAvailableEmail({
          recipientUserId: entry.userId,
          toEmail: entry.user.email,
          toName: entry.user.fullName,
          eventNameHe,
          eventId,
        }),
        sendPushForListingAvailable({ recipientUserId: entry.userId, eventNameHe, eventId }),
      ])
    )
  );

  await db.eventWaitlist.deleteMany({ where: { eventId } });
}
