import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from "@/lib/auth/config";

const isProtectedRoute = createRouteMatcher([
  "/sell(.*)",
  "/checkout(.*)",
  "/profile(.*)",
  "/favorites(.*)",
  "/admin(.*)",
]);

// Only publishableKey is passed explicitly here. Clerk's own
// parsePublishableKey() runs with `fatal: true` and throws synchronously on
// a malformed value (e.g. stray whitespace from a Vercel env var paste) —
// that throw, uncaught inside the Edge middleware function, is exactly what
// Vercel reports as MIDDLEWARE_INVOCATION_FAILED. secretKey has no such
// format check, so overriding it here would add nothing, while it WOULD
// switch Clerk into its "dynamic keys" mode and require a CLERK_ENCRYPTION_KEY
// env var just to avoid a (harmless but noisy) runtime warning. Leaving
// secretKey unset lets Clerk read process.env.CLERK_SECRET_KEY normally.
const clerkHandler: NextMiddleware = clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect();
  },
  { publishableKey: CLERK_PUBLISHABLE_KEY }
);

// Clerk's own control-flow (redirects to sign-in, not-found rewrites for
// protect()) is already resolved into a real NextResponse *inside*
// clerkHandler before it returns — this catch only ever sees a genuine,
// unexpected failure (e.g. an invalid secret key, or Clerk's API being
// briefly unreachable). It ONLY logs and rethrows — it must NOT substitute
// its own NextResponse (as an earlier version of this file did, returning
// NextResponse.next() / a redirect on error). Every response Clerk hands
// back to Next.js carries internal marker headers that later mark the
// request as "middleware ran"; auth()/currentUser() in any Server
// Component check for that marker and throw "Clerk: auth() was called but
// Clerk can't detect usage of clerkMiddleware()" if it's missing. A
// hand-rolled fallback response has none of that — it silently swapped one
// crash (a real, logged error) for a second, more confusing one on every
// page that calls auth()/currentUser(), homepage included. Logging then
// rethrowing keeps Next.js's own crash handling (still visible to users as
// before) while finally making the real cause visible in Runtime Logs.
const middleware: NextMiddleware = async (req: NextRequest, event: NextFetchEvent) => {
  try {
    return await clerkHandler(req, event);
  } catch (err) {
    console.error("[middleware] unexpected Clerk error:", err);
    throw err;
  }
};

export default CLERK_ENABLED ? middleware : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
