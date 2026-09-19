import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requireAppUser } from "@/lib/auth/server";
import { TopBar } from "@/components/layout/TopBar";
import { AcceptTermsForm } from "@/components/AcceptTermsForm";

export default async function AcceptTermsPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const user = await requireAppUser("/sign-in?redirect=/accept-terms");
  const redirectTo = searchParams.redirect && searchParams.redirect.startsWith("/") ? searchParams.redirect : "/profile";

  if (user.termsAcceptedAt) redirect(redirectTo);

  return (
    <div>
      <TopBar title="לפני שממשיכים" />
      <div className="px-4 pt-4 pb-10">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-lg font-black text-ink-900 text-center mb-1.5">כמעט סיימנו</h1>
        <p className="text-sm text-ink-500 text-center mb-6 leading-relaxed">
          כרטיס חוזר היא זירת מסחר בין קונים ומוכרים פרטיים. לפני שממשיכים, חשוב לוודא שקראתם
          והבנתם את הכללים — מי אחראי על מה, איך עובד התשלום בנאמנות, ומה קורה במקרה של מחלוקת.
        </p>
        <AcceptTermsForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
