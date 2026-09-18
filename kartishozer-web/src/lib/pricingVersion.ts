// Mirrors src/lib/riskEngineVersion.ts: identifies the fee engine's RULE
// STRUCTURE (today: a flat buyer-fee-percent + flat seller-fee-percent,
// no tiers, no promotions) that priced an order — bumped only when that
// structure itself changes (e.g. tiered fees, a promo/discount
// mechanism), never when an admin just edits a percentage value. Each
// config value's own history lives in PlatformConfigVersion instead.
// Can't live in a "use server" file (same reason as RISK_ENGINE_VERSION)
// since it's a plain constant, not an async action.
export const PRICING_VERSION = "v1";
