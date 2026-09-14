import { Suspense } from "react";
import { SellWizard } from "./SellWizard";

export default function SellPage() {
  return (
    <Suspense fallback={null}>
      <SellWizard />
    </Suspense>
  );
}
