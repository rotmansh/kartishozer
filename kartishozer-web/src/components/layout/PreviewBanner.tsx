import { Sparkles } from "lucide-react";

export function PreviewBanner() {
  return (
    <div className="flex items-center gap-2 bg-ink-900 text-white/90 px-4 py-2 text-[11px] font-bold">
      <Sparkles size={13} className="text-brand-300 flex-shrink-0" />
      <span>גרסת פיתוח — ליסטינגים והזמנות נשמרים באמת, אך התשלום עדיין בדמו ולא מתבצע חיוב בפועל</span>
    </div>
  );
}
