import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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
export default CLERK_ENABLED
  ? clerkMiddleware(
      async (auth, req) => {
        if (isProtectedRoute(req)) await auth.protect();
      },
      { publishableKey: CLERK_PUBLISHABLE_KEY }
    )
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
