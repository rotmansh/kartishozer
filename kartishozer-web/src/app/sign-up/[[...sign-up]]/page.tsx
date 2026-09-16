import Image from "next/image";
import { SignUp } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/auth/config";
import { TopBar } from "@/components/layout/TopBar";
import { AuthNotConfigured } from "@/components/AuthNotConfigured";

export default function SignUpPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="px-6 pt-2">
        <Image src="/logo-mark.png" alt="" width={56} height={56} className="mb-5" />
        <h1 className="text-2xl font-black text-ink-900 mb-1.5">הצטרפו לכרטיס חוזר</h1>
        <p className="text-sm text-ink-500 mb-7">הרשמה מהירה כדי לקנות ולמכור כרטיסים בבטחה</p>

        {CLERK_ENABLED ? (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/profile"
          />
        ) : (
          <AuthNotConfigured />
        )}
      </div>
    </div>
  );
}
