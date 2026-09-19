"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAppUser } from "@/lib/auth/server";

type ActionResult<T = { success: true }> = T | { error: string };

const updatePayoutDetailsSchema = z.object({
  bankName: z.string().trim().min(1).max(60),
  last4: z.string().regex(/^\d{4}$/),
  accountHolderName: z.string().trim().min(1).max(100),
});

/**
 * Interface-only payout onboarding: no real payment provider is wired in
 * yet (see task #9 in the checklist), so this deliberately never asks
 * for or stores a real bank account/IBAN number — only the bank name and
 * the last 4 digits, enough to show the seller "yes, we have something on
 * file" and to unblock admin's processPayoutAction's existing
 * !vendor.bankAccountRef gate. Once a real provider is integrated, actual
 * bank onboarding will go directly through that provider's own secure
 * flow, not through this field.
 */
export async function updatePayoutDetailsAction(
  input: z.infer<typeof updatePayoutDetailsSchema>
): Promise<ActionResult> {
  const user = await getAppUser();
  if (!user) return { error: "יש להתחבר" };

  const parsed = updatePayoutDetailsSchema.safeParse(input);
  if (!parsed.success) return { error: "פרטי התשלום לא תקינים — בדקו שהזנתם 4 ספרות אחרונות של מספר החשבון" };
  const { bankName, last4, accountHolderName } = parsed.data;

  const vendor = await db.vendor.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName: user.fullName },
    update: {},
  });

  await db.vendor.update({
    where: { id: vendor.id },
    data: { bankAccountRef: `${bankName} · ${accountHolderName} · ****${last4}` },
  });

  revalidatePath("/profile/payout-details");
  revalidatePath("/profile");
  return { success: true };
}
