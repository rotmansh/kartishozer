// Whether real Clerk auth is configured for this deployment. Both the
// client bundle and the server need this, so it only reads the
// NEXT_PUBLIC_ variable (inlined at build time) — the app treats "have a
// publishable key" as "Clerk is on" and expects CLERK_SECRET_KEY to be
// set alongside it in every real deployment.
export const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
