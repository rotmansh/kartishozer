import Link from "next/link";
import { MessageCircle, UserRound } from "lucide-react";
import { getAppUser } from "@/lib/auth/server";
import { getConversationsForUser } from "@/lib/queries/messages";
import { fmtDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function MessagesPage() {
  const user = await getAppUser();

  if (!user) {
    return (
      <div className="px-4 pt-10">
        <EmptyState
          icon={<UserRound size={26} />}
          title="עדיין לא נכנסתם לחשבון"
          subtitle="התחברו כדי לראות הודעות על ההזמנות שלכם"
          action={
            <Link href="/sign-in">
              <Button>התחברות / הרשמה</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const conversations = await getConversationsForUser(user.id);

  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-black text-ink-900">הודעות</h1>
        <p className="text-sm text-ink-500 mt-0.5">תיאום מסירת כרטיסים בין קונים למוכרים</p>
      </div>

      {conversations.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon={<MessageCircle size={22} />}
            title="עדיין אין הודעות"
            subtitle="כשתקנו או תמכרו כרטיס, שיחה עם הצד השני תיפתח כאן אוטומטית"
          />
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="tap flex items-center gap-3 rounded-2xl bg-white border border-ink-900/5 shadow-card p-3.5"
            >
              <div className="h-11 w-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-black flex-shrink-0">
                {c.counterpartName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink-900 truncate">{c.counterpartName}</p>
                  <span className="text-[10px] text-ink-400 flex-shrink-0">
                    {fmtDate(c.updatedAt.toISOString())}
                  </span>
                </div>
                <p className="text-[11px] text-ink-500 truncate mt-0.5">{c.eventNameHe}</p>
                <p className="text-xs text-ink-500 truncate mt-0.5">
                  {c.lastMessage ? c.lastMessage.body : "עוד אין הודעות בשיחה הזו — שלחו את הראשונה"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
