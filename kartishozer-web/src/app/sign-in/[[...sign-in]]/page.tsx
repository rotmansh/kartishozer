import { SignIn } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/auth/config";
import { TopBar } from "@/components/layout/TopBar";
import { AuthNotConfigured } from "@/components/AuthNotConfigured";

export default function SignInPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="px-6 pt-2">
        <div className="h-14 w-14 rounded-2xl bg-brand flex items-center justify-center text-white font-black text-2xl mb-5">
          כ
        </div>
        <h1 className="text-2xl font-black text-ink-900 mb-1.5">ברוכים השבים</h1>
        <p className="text-sm text-ink-500 mb-7">התחברו כדי לנהל מודעות, הזמנות ומועדפים</p>

        {CLERK_ENABLED ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/profile"
          />
        ) : (
          <AuthNotConfigured />
        )}
      </div>
    </div>
  );
}
