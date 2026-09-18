"use client";

import { useEffect } from "react";
import { recordVisitAction } from "@/lib/actions/analytics.actions";

const SESSION_FLAG = "kh_visit_logged";

/**
 * Mounted once in the root layout, renders nothing. Fires exactly once
 * per browser-tab session (guarded by sessionStorage, not per navigation)
 * to record landing page / referrer / UTM attribution and a SITE_VISIT
 * event — deliberately not on every route change, since neither the
 * funnel nor DAU/WAU/MAU needs a full clickstream. Failing silently (no
 * sessionStorage in private browsing, the action itself failing) never
 * affects the page around it.
 */
export function AttributionTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return;
      sessionStorage.setItem(SESSION_FLAG, "1");
    } catch {
      // Storage blocked — fall through and log this one mount anyway.
    }

    const params = new URLSearchParams(window.location.search);
    void recordVisitAction({
      path: window.location.pathname,
      referrer: document.referrer || null,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"),
      utmTerm: params.get("utm_term"),
    });
  }, []);

  return null;
}
