import "server-only";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { CLERK_ENABLED } from "./config";
import { db } from "@/lib/db";
import { Prisma, type User, type Vendor } from "@prisma/client";

export type AppUser = User & { vendor: Vendor | null };

/**
 * Upserts the signed-in Clerk user into our own User table and returns
 * the local row (with vendor, if any). This is how every server action
 * gets a real, stable local user id to use as a foreign key — Clerk's
 * own id is kept only as `clerkId`.
 */
export async function getAppUser(): Promise<AppUser | null> {
  if (!CLERK_ENABLED) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email.split("@")[0];

  const data = { email, fullName, phone: clerkUser.primaryPhoneNumber?.phoneNumber ?? null };

  try {
    return await db.user.upsert({
      where: { clerkId: clerkUser.id },
      create: { clerkId: clerkUser.id, ...data },
      update: data,
      include: { vendor: true },
    });
  } catch (err) {
    // `email` is also unique. If this Clerk id is new but a row with this
    // email already exists (e.g. the app was pointed at a different Clerk
    // instance/key set earlier and created a row for the same person under
    // a different clerkId), the `create` branch above throws a unique
    // constraint violation (P2002) instead of just linking the accounts —
    // crashing every page that resolves the signed-in user. Since Clerk
    // itself verified this email for the current session, re-pointing the
    // existing row at the current clerkId is the same person, not a
    // security downgrade.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return db.user.update({
        where: { email },
        data: { clerkId: clerkUser.id, ...data },
        include: { vendor: true },
      });
    }
    throw err;
  }
}

/** For Server Components/pages that must be signed in — redirects otherwise. */
export async function requireAppUser(redirectTo = "/sign-in"): Promise<AppUser> {
  const user = await getAppUser();
  if (!user) redirect(redirectTo);
  return user;
}

/** Mirrors the admin panel's existing convention: role lives in Clerk's publicMetadata. */
export async function isAdmin(): Promise<boolean> {
  if (!CLERK_ENABLED) return false;
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function requireAdminUser(): Promise<AppUser> {
  const user = await requireAppUser("/sign-in?redirect=/admin");
  if (!(await isAdmin())) redirect("/");
  return user;
}
