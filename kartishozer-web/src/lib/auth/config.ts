// Sanitized defensively against the two most common ways a key gets
// corrupted when pasted into Vercel's plain-text environment variable UI
// (which, unlike a .env file, does not parse or strip quoting — whatever
// is typed becomes the literal value):
//   1. Stray leading/trailing whitespace or a trailing newline.
//   2. The whole value pasted WITH its surrounding quote characters, e.g.
//      pasting `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"` from a
//      .env file/docs snippet, or the value itself, quotes included, into
//      the single "Value" field — yielding a literal `"pk_live_xxx"`.
// Either corruption fails Clerk's strict key-format validation
// (@clerk/shared's parsePublishableKey, called with `fatal: true` deep
// inside clerkMiddleware's request handling), which throws synchronously
// and uncaught — reproduced locally as `Error: Publishable key not
// valid.` at the exact same call site Vercel reports as
// MIDDLEWARE_INVOCATION_FAILED. Every Clerk touchpoint (middleware,
// ClerkProvider) uses this constant instead of reading process.env
// directly, so there is exactly one place this can go wrong.
function sanitizeClerkKey(raw: string | undefined): string | undefined {
  let value = raw?.trim();
  if (!value) return undefined;
  const wrappedInQuotes =
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
  if (wrappedInQuotes && value.length >= 2) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

export const CLERK_PUBLISHABLE_KEY = sanitizeClerkKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// clerkMiddleware() unconditionally throws (@clerk/shared's
// throwMissingSecretKeyError, no guard) if it resolves an empty secretKey —
// it requires BOTH keys to run at all, not just the publishable one. A
// deployment with only NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY set (e.g. because
// CLERK_SECRET_KEY was scoped to the wrong Vercel environment, or its name
// was mistyped) must therefore be treated as "Clerk not configured" here
// too, or every request 500s with MIDDLEWARE_INVOCATION_FAILED instead of
// falling back to the existing AuthNotConfigured UI.
const CLERK_SECRET_KEY_PRESENT = Boolean(sanitizeClerkKey(process.env.CLERK_SECRET_KEY));

export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY) && CLERK_SECRET_KEY_PRESENT;
