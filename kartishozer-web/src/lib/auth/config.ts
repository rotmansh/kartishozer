// Trimmed defensively: a stray trailing newline/space from copy-pasting a
// key into Vercel's environment variable UI is enough to fail Clerk's own
// strict key-format validation (@clerk/shared's parsePublishableKey),
// which throws synchronously — exactly the kind of bug that only shows up
// in production and crashes the whole request. Every Clerk touchpoint
// (middleware, ClerkProvider) uses this constant instead of reading
// process.env directly, so there is exactly one place this can go wrong.
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || undefined;

// clerkMiddleware() unconditionally throws (@clerk/shared's
// throwMissingSecretKeyError, no guard) if it resolves an empty secretKey —
// it requires BOTH keys to run at all, not just the publishable one. A
// deployment with only NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY set (e.g. because
// CLERK_SECRET_KEY was scoped to the wrong Vercel environment, or its name
// was mistyped) must therefore be treated as "Clerk not configured" here
// too, or every request 500s with MIDDLEWARE_INVOCATION_FAILED instead of
// falling back to the existing AuthNotConfigured UI.
const CLERK_SECRET_KEY_PRESENT = Boolean(process.env.CLERK_SECRET_KEY?.trim());

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY) && CLERK_SECRET_KEY_PRESENT;
