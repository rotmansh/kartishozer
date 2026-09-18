import { Suspense } from "react";
import { getAppUser } from "@/lib/auth/server";
import { recordSellWizardStarted } from "@/lib/analytics";
import { SellWizard } from "./SellWizard";

export default async function SellPage() {
  const user = await getAppUser();
  if (user) await recordSellWizardStarted({ userId: user.id });

  return (
    <Suspense fallback={null}>
      <SellWizard />
    </Suspense>
  );
}
