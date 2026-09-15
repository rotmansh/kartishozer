import Link from "next/link";
import { HelpCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-white rounded-3xl border border-ink-900/5 shadow-card p-4">
      <p className="text-sm font-black text-ink-900 mb-1.5">{q}</p>
      <p className="text-[13px] text-ink-500 leading-relaxed">{a}</p>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div>
      <TopBar title="עזרה ותמיכה" />

      <div className="px-4 space-y-3 pb-8">
        <FaqItem
          q="קניתי כרטיס, איך אני מקבל/ת אותו?"
          a='אחרי התשלום נפתחת אוטומטית שיחה בינך לבין המוכר/ת (זמינה תחת "הודעות" או בפרופיל שלכם) — משם מתאמים ביניכם את מסירת הכרטיס בפועל.'
        />
        <FaqItem
          q="מתי המוכר/ת מקבל/ת את הכסף?"
          a="הכסף לא מועבר מיד — הוא משתחרר רק כמה ימים אחרי מועד האירוע, כדי שיהיה זמן לוודא שהכל תקין. פירוט מלא בעמוד איך זה עובד."
        />
        <FaqItem
          q="יש בעיה עם הכרטיס שקניתי — מה עושים?"
          a="פנו קודם למוכר/ת דרך ההודעות בתוך המערכת. אם לא הגעתם להסכמה, יש אפשרות לפתוח מחלוקת רשמית — הכסף עדיין לא הועבר בשלב הזה, כך שיש זמן לטפל בזה."
        />
        <FaqItem
          q="למה המודעה שפרסמתי לא עלתה מיד לאתר?"
          a="כל מודעה חדשה עוברת בדיקת אבטחה אוטומטית. רוב המודעות עולות מיד; מודעות שסומנו (למשל מחיר חריג או חשבון חדש) ממתינות לאישור ידני."
        />
        <FaqItem
          q="לא מוצא/ת את האירוע שלי ברשימה"
          a='בעמוד "מכירת כרטיס", בשלב הראשון יש אפשרות "לא מוצאים את האירוע? הוסיפו אותו" — אפשר להוסיף כל אירוע/אטרקציה בעצמכם.'
        />

        <div className="rounded-3xl bg-ink-900 text-white p-4 flex items-start gap-3 mt-2">
          <ShieldCheck size={20} className="text-accent-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold mb-1">רוצים להבין את מנגנוני הבטיחות?</p>
            <Link href="/how-it-works" className="text-xs font-bold text-accent-400 underline">
              קראו עוד בעמוד &quot;איך זה עובד&quot; ←
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-ink-900/5 shadow-card p-4 flex items-start gap-3">
          <MessageCircle size={20} className="text-brand-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-ink-900 mb-1">בעיה ספציפית בהזמנה?</p>
            <p className="text-[13px] text-ink-500 leading-relaxed">
              הדרך הכי מהירה היא דרך ההודעות בתוך ההזמנה עצמה — בעמוד הפרופיל שלכם.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center pt-2 text-ink-400">
          <HelpCircle size={14} />
          <p className="text-[11px]">לא מצאתם תשובה? נשמח שתפנו אלינו — פרטי יצירת קשר יתעדכנו כאן בקרוב.</p>
        </div>
      </div>
    </div>
  );
}
