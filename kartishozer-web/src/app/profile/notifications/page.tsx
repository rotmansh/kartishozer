import { requireAppUser } from "@/lib/auth/server";
import { getNotificationPreference } from "@/lib/notificationPreferences";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationPreferenceToggles } from "@/components/NotificationPreferenceToggles";

export default async function NotificationPreferencesPage() {
  const user = await requireAppUser("/sign-in?redirect=/profile/notifications");
  const prefs = await getNotificationPreference(user.id);

  return (
    <div className="pb-8">
      <TopBar title="העדפות התראות" />
      <div className="px-4 pt-2">
        <p className="text-xs text-ink-500 mb-3 leading-relaxed">
          בחרו אילו התראות (במייל ובדחיפה לנייד) תרצו לקבל. גם כשמכבים, ההתראה עדיין תופיע בתוך האתר עצמו.
        </p>
        <NotificationPreferenceToggles initial={prefs} />
      </div>
    </div>
  );
}
