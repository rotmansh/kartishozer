import { MessageCircle, Clock } from "lucide-react";

const PLACEHOLDER_THREADS = [
  { seller: { displayName: "נועה כהן" }, lastMessageHe: "היי! הכרטיסים עדיין זמינים 🙂", when: "אתמול" },
  { seller: { displayName: "דניאל אברהם" }, lastMessageHe: "מעולה, שולח את הכרטיס עכשיו דרך המערכת", when: "לפני יומיים" },
];

export default function MessagesPage() {
  return (
    <div>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-lg font-black text-ink-900">הודעות</h1>
        <p className="text-sm text-ink-500 mt-0.5">שיחות בין קונים למוכרים</p>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-2xl bg-brand-50 text-brand-600 p-3.5 text-xs font-bold">
        <Clock size={16} className="flex-shrink-0" />
        התכונה בפיתוח — כרגע ניתן לצפות בעיצוב בלבד, שליחת הודעות תושק בהמשך
      </div>

      <div className="px-4 space-y-2">
        {PLACEHOLDER_THREADS.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-white border border-ink-900/5 p-3.5 opacity-70"
          >
            <div className="h-11 w-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-black flex-shrink-0">
              {t.seller.displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink-900 truncate">{t.seller.displayName}</p>
                <span className="text-[10px] text-ink-400 flex-shrink-0">{t.when}</span>
              </div>
              <p className="text-xs text-ink-500 truncate mt-0.5">{t.lastMessageHe}</p>
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
          <div className="h-14 w-14 rounded-full bg-ink-100 flex items-center justify-center text-ink-500">
            <MessageCircle size={24} />
          </div>
          <p className="text-xs text-ink-400 max-w-[26ch]">
            דוגמאות בלבד — הודעות אמיתיות יופיעו כאן כשהתכונה תושק
          </p>
        </div>
      </div>
    </div>
  );
}
