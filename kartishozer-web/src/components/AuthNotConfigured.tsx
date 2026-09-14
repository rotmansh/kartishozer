import { KeyRound } from "lucide-react";

export function AuthNotConfigured() {
  return (
    <div className="rounded-2xl border border-dashed border-ink-900/15 bg-ink-100 p-5 text-center space-y-2">
      <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center mx-auto text-ink-500">
        <KeyRound size={20} />
      </div>
      <p className="text-sm font-bold text-ink-700">ההתחברות עדיין לא הוגדרה</p>
      <p className="text-xs text-ink-500 leading-relaxed">
        חסרים מפתחות Clerk בסביבה הזו. הוסיפו NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        ו-CLERK_SECRET_KEY כדי להפעיל כניסה והרשמה אמיתיות.
      </p>
    </div>
  );
}
