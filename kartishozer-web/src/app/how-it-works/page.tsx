import { ShieldCheck, BadgeCheck, Zap, TrendingDown, Clock, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { getPlatformFees } from "@/lib/queries/catalog";
import { TopBar } from "@/components/layout/TopBar";

async function getDisplayConfig() {
  const [fees, markupRow, delayRow] = await Promise.all([
    getPlatformFees(),
    db.platformConfig.findUnique({ where: { key: "max_markup_percent" } }),
    db.platformConfig.findUnique({ where: { key: "payout_delay_days" } }),
  ]);
  return {
    ...fees,
    maxMarkupPercent: Number(markupRow?.value ?? 20),
    payoutDelayDays: Number(delayRow?.value ?? 3),
  };
}

function Point({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3.5 bg-white rounded-3xl border border-ink-900/5 shadow-card p-4">
      <div className="h-11 w-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-ink-900 mb-1">{title}</p>
        <p className="text-[13px] text-ink-500 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export default async function HowItWorksPage() {
  const cfg = await getDisplayConfig();

  return (
    <div>
      <TopBar title="איך זה עובד" />

      <div className="px-4 pt-2 pb-2">
        <p className="text-sm text-ink-500 leading-relaxed">
          כרטיס חוזר בנוי כך שקונים ומוכרים יוכלו לסמוך על העסקה — הנה בדיוק איך אנחנו שומרים על זה.
        </p>
      </div>

      <div className="px-4 space-y-3 pb-8">
        <Point
          icon={<TrendingDown size={20} />}
          title={`תקרת מחיר של עד ${cfg.maxMarkupPercent}% מעל מחיר הפנים`}
          body={`אף מוכר לא יכול לגבות יותר מ-${cfg.maxMarkupPercent}% מעל המחיר המקורי של הכרטיס. מודעה שחורגת מזה מסומנת אוטומטית לבדיקה או נדחית — כדי שקונים לא ישלמו מחירי ספסרות.`}
        />

        <Point
          icon={<ShieldAlert size={20} />}
          title="בדיקת סיכון על כל מודעה"
          body="כל מודעה חדשה עוברת בדיקה אוטומטית (יחס מחיר, היסטוריית המוכר, כמות מודעות ביום) לפני שהיא מתפרסמת. מודעות בסיכון גבוה נשלחות לבדיקה ידנית או נדחות."
        />

        <Point
          icon={<BadgeCheck size={20} />}
          title="מוכרים מאומתים"
          body="מוכרים עם היסטוריית מכירות מוצלחת מסומנים בתג אימות שמופיע לצד השם שלהם בכל מודעה — כדי שתדעו מי עומד מאחורי הכרטיס."
        />

        <Point
          icon={<ShieldCheck size={20} />}
          title='מודעות עם "העברה מאובטחת"'
          body="חלק מהמודעות מסומנות כהעברה מאובטחת — אמצעי נוסף לוודא שהכרטיס עובר בצורה מוגנת בין המוכר לקונה."
        />

        <Point
          icon={<Clock size={20} />}
          title="הכסף למוכר משתחרר רק אחרי האירוע"
          body={`בניגוד לתשלום מיידי, הכסף שהקונה משלם נשמר במערכת ומועבר למוכר רק ${cfg.payoutDelayDays} ימים אחרי מועד האירוע — כדי שאם יש בעיה עם הכרטיס, עוד אפשר לפתוח מחלוקת לפני שהכסף כבר יצא.`}
        />

        <Point
          icon={<Zap size={20} />}
          title="עמלות שקופות"
          body={`עמלת קונה של ${cfg.buyerFeePercent}% ועמלת מוכר של ${cfg.sellerFeePercent}% — מוצגות במלואן לפני התשלום, בלי הפתעות בקופה.`}
        />
      </div>
    </div>
  );
}
