import "server-only";

import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * A minimal sliding-window limiter backed by Postgres — no new external
 * service (Redis/Upstash) to sign up for and configure. `key` must
 * already encode both the action and the identity being limited (e.g.
 * `createOrder:${userId}`) so unrelated actions never share a bucket.
 *
 * Fails OPEN, deliberately: if the check itself throws (a DB hiccup),
 * the caller proceeds as if allowed. A rate limiter that can accidentally
 * lock out every real user during a transient DB issue is a worse
 * outage than the abuse it's meant to prevent — this can only ever make
 * the limiter more permissive than intended, never less available.
 */
export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMs);
    const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
    if (count >= max) return false;

    await db.rateLimitHit.create({ data: { key } });

    // Opportunistic cleanup instead of a dedicated cron job — cheap,
    // and keeps this table from growing unbounded. The exact window
    // (24h) is comfortably longer than any limiter's own window above.
    if (Math.random() < 0.01) {
      await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } } });
    }

    return true;
  } catch (err) {
    console.error(`Rate limit check failed for "${key}" — failing open:`, err);
    return true;
  }
}

/**
 * Best-effort client IP, for the handful of actions reachable without
 * being signed in (nothing to key a per-user limit on). Vercel always
 * sets x-forwarded-for in production; locally/self-hosted it may be
 * absent, in which case there's nothing meaningful to key on and the
 * caller should skip limiting rather than group every visitor together
 * under one shared bucket.
 */
export function getClientIp(): string | null {
  const forwardedFor = headers().get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || null;
}
