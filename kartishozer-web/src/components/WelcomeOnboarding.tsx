"use client";

import { useEffect, useState } from "react";
import { Ticket, Scale, Lock, ChevronRight } from "lucide-react";

const SEEN_KEY = "kartishozer_welcome_seen_v1";

const SLIDES = [
  {
    icon: Ticket,
    title: "כרטיס חוזר",
    body: "השוק ההוגן לכרטיסים ביד שנייה — בלי ספסרות, בלי הפתעות.",
  },
  {
    icon: Scale,
    title: "המחיר שלך מוגן בחוק",
    body: "אף מוכר לא יכול לגבות יותר ממה ששילם על הכרטיס. זו לא המלצה — המערכת אוכפת את זה אוטומטית על כל מודעה.",
  },
  {
    icon: Lock,
    title: "הכסף שלך מחכה עד אחרי המופע",
    body: "הכרטיס נשמר בכספת דיגיטלית ולא נחשף לפני התשלום, והכסף משתחרר למוכר רק אחרי האירוע.",
  },
] as const;

export function WelcomeOnboarding() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setVisible(true);
    } catch {
      // Private browsing / blocked storage — just skip the one-time
      // welcome rather than risk showing it on every single visit.
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Nothing to do if storage isn't available — worst case it shows
      // again next visit, which is better than crashing the page.
    }
  }

  if (!visible) return null;

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[60] bg-ink-950 flex flex-col animate-fade-in">
      <div
        className="flex items-center justify-between px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className={`h-9 w-9 rounded-full flex items-center justify-center transition-opacity ${
            index === 0 ? "opacity-0 pointer-events-none" : "opacity-100 bg-white/10"
          }`}
          aria-label="הקודם"
        >
          <ChevronRight size={18} className="text-white/70" />
        </button>
        <button onClick={dismiss} className="text-xs font-bold text-white/50 px-2 py-1">
          דלג
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center" key={index}>
        <div className="h-20 w-20 rounded-3xl bg-brand/15 flex items-center justify-center mb-7 animate-slide-up">
          <Icon size={34} className="text-brand-400" strokeWidth={1.75} />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight mb-3 animate-slide-up text-balance">
          {slide.title}
        </h1>
        <p className="text-[15px] text-white/60 leading-relaxed max-w-[320px] animate-slide-up">
          {slide.body}
        </p>
      </div>

      <div
        className="px-6 flex flex-col items-center gap-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)" }}
      >
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-brand" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? dismiss() : setIndex((i) => i + 1))}
          className="tap w-full max-w-[320px] rounded-2xl bg-brand text-white font-bold text-sm py-3.5 shadow-pop"
        >
          {isLast ? "בואו נתחיל" : "הבא"}
        </button>
      </div>
    </div>
  );
}
