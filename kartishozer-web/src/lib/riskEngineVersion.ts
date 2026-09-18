// Bumped whenever assessListingRisk's signals or scoring change (in
// listings.actions.ts) — every row that produces (the current ListingRisk
// snapshot, and every RiskAssessmentEvent history row, including the
// forced override in ticketFiles.actions.ts) is stamped with it, so a
// future change to the algorithm can never make a past decision look
// inexplicable or get silently reinterpreted under new rules. Lives in
// its own module, not in listings.actions.ts, because a "use server" file
// may only export async functions.
export const RISK_ENGINE_VERSION = "v1";
