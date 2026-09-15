import { UserProfile } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/auth/config";
import { TopBar } from "@/components/layout/TopBar";
import { AuthNotConfigured } from "@/components/AuthNotConfigured";

export default function UserProfilePage() {
  return (
    <div className="min-h-screen">
      <TopBar title="אימות ואבטחה" />
      <div className="px-4 pt-2 flex justify-center">
        {CLERK_ENABLED ? (
          <UserProfile
            routing="path"
            path="/user-profile"
            appearance={{ elements: { rootBox: "w-full", card: "w-full shadow-none border border-black/5" } }}
          />
        ) : (
          <AuthNotConfigured />
        )}
      </div>
    </div>
  );
}
