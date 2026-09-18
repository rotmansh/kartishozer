import "server-only";

import { Resend } from "resend";
import { getSiteUrl } from "@/lib/site-url";
import { getNotificationPreference } from "@/lib/notificationPreferences";

// A seller freely types an event's name (see events.actions.ts) — never
// trust it as safe HTML. Used for eventNameHe below; sendNewMessageEmail's
// existing interpolations predate this helper and are a separate,
// pre-existing concern, not something this change touches.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Optional, same convention as CLERK_ENABLED: without an API key the app
// still works end-to-end, it just silently skips sending the email
// instead of crashing every message-send.
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "כרטיס חוזר <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendNewMessageEmail(params: {
  recipientUserId: string;
  toEmail: string;
  toName: string;
  fromName: string;
  eventNameHe: string;
  conversationId: string;
  messageBody: string;
}): Promise<void> {
  if (!resend) return;
  if (!(await getNotificationPreference(params.recipientUserId)).notifyNewMessage) return;

  const url = `${getSiteUrl()}/messages/${params.conversationId}`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.toEmail,
      subject: `${params.fromName} שלח/ה לך הודעה בנוגע ל${params.eventNameHe}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <p style="font-size: 15px; color: #1a1a1a;">היי ${params.toName},</p>
          <p style="font-size: 15px; color: #1a1a1a;">
            <strong>${params.fromName}</strong> שלח/ה לך הודעה בנוגע ל<strong>${params.eventNameHe}</strong>:
          </p>
          <blockquote style="border-right: 3px solid #E8503A; padding-right: 12px; margin: 16px 0; color: #444;">
            ${params.messageBody}
          </blockquote>
          <a href="${url}" style="display: inline-block; background: #E8503A; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; font-size: 14px;">
            לצפייה בשיחה
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 24px;">כרטיס חוזר — קונים ומוכרים כרטיסים ביד שנייה, בבטחה.</p>
        </div>
      `,
    });
  } catch (err) {
    // A failed notification email must never fail the message-send itself.
    console.error("Failed to send new-message email:", err);
  }
}

// Fixed, non-interpolated copy per case — never embeds a buyer's free-text
// dispute reason, since that's user input and this HTML isn't escaped.
// Anyone who wants the details opens the order in the app, where React
// renders it safely.
export async function sendDisputeUpdateEmail(params: {
  recipientUserId: string;
  toEmail: string;
  toName: string;
  subject: string;
  headline: string;
}): Promise<void> {
  if (!resend) return;
  if (!(await getNotificationPreference(params.recipientUserId)).notifyDisputeUpdate) return;

  const url = `${getSiteUrl()}/profile`;

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.toEmail,
      subject: params.subject,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <p style="font-size: 15px; color: #1a1a1a;">היי ${params.toName},</p>
          <p style="font-size: 15px; color: #1a1a1a;">${params.headline}</p>
          <a href="${url}" style="display: inline-block; background: #E8503A; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; font-size: 14px;">
            לצפייה בהזמנה
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 24px;">כרטיס חוזר — קונים ומוכרים כרטיסים ביד שנייה, בבטחה.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send dispute update email:", err);
  }
}

export async function sendListingAvailableEmail(params: {
  recipientUserId: string;
  toEmail: string;
  toName: string;
  eventNameHe: string;
  eventId: string;
}): Promise<void> {
  if (!resend) return;
  if (!(await getNotificationPreference(params.recipientUserId)).notifyListingAvailable) return;

  const url = `${getSiteUrl()}/event/${params.eventId}`;
  const safeEventName = escapeHtml(params.eventNameHe);

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: params.toEmail,
      subject: `כרטיס חדש זמין ל${params.eventNameHe}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <p style="font-size: 15px; color: #1a1a1a;">היי ${escapeHtml(params.toName)},</p>
          <p style="font-size: 15px; color: #1a1a1a;">
            נרשמתם לקבל עדכון כשיהיה כרטיס זמין ל<strong>${safeEventName}</strong> — ורגע קודם התפרסם כרטיס ראשון למכירה.
          </p>
          <a href="${url}" style="display: inline-block; background: #E8503A; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; font-size: 14px;">
            לצפייה בכרטיס
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 24px;">כרטיס חוזר — קונים ומוכרים כרטיסים ביד שנייה, בבטחה.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send listing-available email:", err);
  }
}
