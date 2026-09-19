"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAppUser } from "@/lib/auth/server";

// Only a same-origin app path is ever accepted as the redirect target — it
// comes back from this page's own ?redirect query param (round-tripped
// through the accept-terms URL itself, never user free text), but a bad
// or missing value must still fall back to somewhere safe rather than
// building an open redirect.
function safeRedirectTarget(target: string | undefined): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return "/profile";
}

export async function acceptTermsAction(redirectTo?: string): Promise<never> {
  const user = await requireAppUser();

  if (!user.termsAcceptedAt) {
    await db.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date() },
    });
  }

  redirect(safeRedirectTarget(redirectTo));
}
