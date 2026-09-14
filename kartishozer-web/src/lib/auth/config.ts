// Trimmed defensively: a stray trailing newline/space from copy-pasting a
// key into Vercel's environment variable UI is enough to fail Clerk's own
// strict key-format validation (@clerk/shared's parsePublishableKey),
// which throws synchronously — exactly the kind of bug that only shows up
// in production and crashes the whole request. Every Clerk touchpoint
// (middleware, ClerkProvider) uses this constant instead of reading
// process.env directly, so there is exactly one place this can go wrong.
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || undefined;

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);
