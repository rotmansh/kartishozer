// Absolute base URL for links inside emails/push notifications, where a
// relative path won't do. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on
// every deployment without any manual setup; NEXT_PUBLIC_SITE_URL is an
// escape hatch for a future custom domain, and localhost is the local-dev
// fallback.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
