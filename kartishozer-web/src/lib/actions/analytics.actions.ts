"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";
import { getSiteUrl } from "@/lib/site-url";
import { VISITOR_COOKIE, recordSiteVisit } from "@/lib/analytics";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Fired once per browser-tab session by AttributionTracker (a client
 * component mounted in the root layout) — never on every navigation, so
 * this is "a visit happened", not "every page view". Issues the
 * long-lived anonymous visitor cookie on first-ever call, and records
 * first/last-touch acquisition attribution. A plain same-site navigation
 * (no utm_* param, no external referrer) never overwrites last-touch —
 * only a call that actually carries new attribution does, so it stays
 * meaningful as "the last real marketing touch" rather than just
 * whichever page happened to load most recently.
 */
export async function recordVisitAction(input: {
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
}): Promise<void> {
  // The only action here reachable with zero authentication — there's no
  // userId to key a limit on, so this is IP-based. Skipped (not blocked)
  // when no IP is available at all, rather than lumping every visitor
  // into one shared bucket.
  const ip = getClientIp();
  if (ip && !(await checkRateLimit(`recordVisit:${ip}`, 30, 10 * 60_000))) return;

  const store = cookies();
  let vid = store.get(VISITOR_COOKIE)?.value;
  const isNewVisitor = !vid;
  if (!vid) {
    vid = randomUUID();
    store.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  let isExternalReferrer = false;
  if (input.referrer) {
    try {
      isExternalReferrer = new URL(input.referrer).hostname !== new URL(getSiteUrl()).hostname;
    } catch {
      isExternalReferrer = true;
    }
  }

  const touch = {
    utmSource: input.utmSource || null,
    utmMedium: input.utmMedium || null,
    utmCampaign: input.utmCampaign || null,
    utmContent: input.utmContent || null,
    utmTerm: input.utmTerm || null,
    referrer: input.referrer || null,
    landingPath: input.path,
  };

  try {
    if (isNewVisitor) {
      await db.visitor.create({
        data: {
          id: vid,
          firstUtmSource: touch.utmSource,
          firstUtmMedium: touch.utmMedium,
          firstUtmCampaign: touch.utmCampaign,
          firstUtmContent: touch.utmContent,
          firstUtmTerm: touch.utmTerm,
          firstReferrer: touch.referrer,
          firstLandingPath: touch.landingPath,
          lastUtmSource: touch.utmSource,
          lastUtmMedium: touch.utmMedium,
          lastUtmCampaign: touch.utmCampaign,
          lastUtmContent: touch.utmContent,
          lastUtmTerm: touch.utmTerm,
          lastReferrer: touch.referrer,
          lastLandingPath: touch.landingPath,
        },
      });
    } else if (touch.utmSource || isExternalReferrer) {
      await db.visitor.update({
        where: { id: vid },
        data: {
          lastTouchAt: new Date(),
          lastUtmSource: touch.utmSource,
          lastUtmMedium: touch.utmMedium,
          lastUtmCampaign: touch.utmCampaign,
          lastUtmContent: touch.utmContent,
          lastUtmTerm: touch.utmTerm,
          lastReferrer: touch.referrer,
          lastLandingPath: touch.landingPath,
        },
      });
    }
  } catch (err) {
    console.error("Failed to record visit attribution:", err);
  }

  // A signed-in visit carries userId directly on its SITE_VISIT row —
  // this (not the visitorId) is what user-level metrics must dedupe by,
  // since the same signed-in user can have several Visitor rows, one per
  // browser/device (see getActiveIdentityCount).
  const user = await getAppUser();
  await recordSiteVisit(vid, input.path, user?.id ?? null);
}
