import { requireAppUser } from "@/lib/auth/server";
import { TopBar } from "@/components/layout/TopBar";
import { PayoutDetailsForm } from "@/components/PayoutDetailsForm";

export default async function PayoutDetailsPage() {
  const user = await requireAppUser("/sign-in?redirect=/profile/payout-details");

  return (
    <div className="pb-8">
      <TopBar title="פרטי תשלום למוכר" />
      <div className="px-4 pt-2">
        <PayoutDetailsForm
          currentBankAccountRef={user.vendor?.bankAccountRef ?? null}
          defaultAccountHolderName={user.fullName}
        />
      </div>
    </div>
  );
}
