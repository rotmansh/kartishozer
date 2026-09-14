import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CLERK_ENABLED } from "@/lib/auth/config";

const isProtectedRoute = createRouteMatcher([
  "/sell(.*)",
  "/checkout(.*)",
  "/profile(.*)",
  "/favorites(.*)",
  "/admin(.*)",
]);

export default CLERK_ENABLED
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) await auth.protect();
    })
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
