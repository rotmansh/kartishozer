"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/layout/TopBar";

export default function SignUpPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    signIn({ fullName: fullName || "משתמש/ת חדש/ה", email });
    router.push("/profile");
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="px-6 pt-2">
        <div className="h-14 w-14 rounded-2xl bg-brand flex items-center justify-center text-white font-black text-2xl mb-5">
          כ
        </div>
        <h1 className="text-2xl font-black text-ink-900 mb-1.5">הצטרפו לכרטיס חוזר</h1>
        <p className="text-sm text-ink-500 mb-7">
          הרשמה היא בתצוגה מקדימה בלבד — אין צורך בפרטים אמיתיים
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-ink-500 block mb-2">שם מלא</label>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-ink-900/10 px-4 py-3.5">
              <User size={17} className="text-ink-400 flex-shrink-0" />
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ישראל ישראלי"
                className="flex-1 bg-transparent outline-none text-sm placeholder-ink-300 min-w-0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-500 block mb-2">אימייל</label>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-ink-900/10 px-4 py-3.5">
              <Mail size={17} className="text-ink-400 flex-shrink-0" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                dir="ltr"
                className="flex-1 bg-transparent outline-none text-sm placeholder-ink-300 min-w-0 text-left"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-500 block mb-2">סיסמה</label>
            <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-ink-900/10 px-4 py-3.5">
              <Lock size={17} className="text-ink-400 flex-shrink-0" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                className="flex-1 bg-transparent outline-none text-sm placeholder-ink-300 min-w-0 text-left"
              />
            </div>
          </div>

          <Button type="submit" size="lg" fullWidth className="mt-2">
            יצירת חשבון
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-ink-900/10 flex-1" />
          <span className="text-xs text-ink-400 font-bold">או</span>
          <div className="h-px bg-ink-900/10 flex-1" />
        </div>

        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-ink-900/10 bg-white text-sm font-bold text-ink-400"
        >
          <Chrome size={18} />
          המשך עם Google
          <span className="text-[10px] font-bold bg-ink-100 text-ink-400 rounded-full px-2 py-0.5">בקרוב</span>
        </button>

        <p className="text-center text-[11px] text-ink-400 mt-6 leading-relaxed">
          בהרשמה אתם מאשרים את תנאי השימוש ומדיניות הפרטיות
        </p>

        <p className="text-center text-sm text-ink-500 mt-4">
          כבר יש לכם חשבון?{" "}
          <Link href="/sign-in" className="text-brand font-bold">
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
