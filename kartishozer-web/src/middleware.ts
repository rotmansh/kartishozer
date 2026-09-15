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
// unexpected failure (e.g. a malformed key slipping past our own
// sanitization, or a Clerk-internal error). Previously that failure was a
// raw, unlogged throw: it took the whole site down with Vercel's generic
// MIDDLEWARE_INVOCATION_FAILED page and left no trace of what actually
// broke. Logging it here means the real error now shows up in Vercel's
// Runtime Logs as a plain "[middleware]" console.error, no more guessing
// from a blank Logs tab. Failing shut (redirect home) on a protected route
// keeps the fail-closed guarantee — it never lets protected content
// through — while a public route degrades to "just render the page"
// instead of crashing outright.
const middleware: NextMiddleware = async (req: NextRequest, event: NextFetchEvent) => {
  try {
    return await clerkHandler(req, event);
  } catch (err) {
    console.error("[middleware] unexpected Clerk error:", err);
    if (isProtectedRoute(req)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }
};

export default CLERK_ENABLED ? middleware : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
