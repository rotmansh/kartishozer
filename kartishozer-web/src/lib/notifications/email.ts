import "server-only";

import { Resend } from "resend";
import { getSiteUrl } from "@/lib/site-url";

// Optional, same convention as CLERK_ENABLED: without an API key the app
// still works end-to-end, it just silently skips sending the email
// instead of crashing every message-send.
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "כרטיס חוזר <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendNewMessageEmail(params: {
  toEmail: string;
  toName: string;
  fromName: string;
  eventNameHe: string;
  conversationId: string;
  messageBody: string;
}): Promise<void> {
  if (!resend) return;

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
