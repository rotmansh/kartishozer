"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Accessibility, X, Plus, Minus, Contrast, Link2, PauseCircle, RotateCcw } from "lucide-react";

const STORAGE_KEY = "kh_a11y_prefs";
// 0 = default size (no class). 1-3 map to FONT_SCALE_STEPS[0..2] below —
// keep these two in sync (MAX_FONT_SCALE is FONT_SCALE_STEPS.length, not
// a separately-maintained number) so "increase" can never cap out one
// step short of the last defined size, as it did before this comment.
const FONT_SCALE_STEPS = ["a11y-font-md", "a11y-font-lg", "a11y-font-xl"] as const;
const MAX_FONT_SCALE = FONT_SCALE_STEPS.length;
type FontScale = 0 | 1 | 2 | 3;

type Prefs = {
  fontScale: FontScale;
  highContrast: boolean;
  underlineLinks: boolean;
  reduceMotion: boolean;
};

const DEFAULT_PREFS: Prefs = { fontScale: 0, highContrast: false, underlineLinks: false, reduceMotion: false };

function applyToDocument(prefs: Prefs) {
  const root = document.documentElement;
  FONT_SCALE_STEPS.forEach((cls) => root.classList.remove(cls));
  if (prefs.fontScale > 0) root.classList.add(FONT_SCALE_STEPS[prefs.fontScale - 1]);
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-underline-links", prefs.underlineLinks);
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
}

/**
 * A floating accessibility toolbar — genuinely functional controls (real
 * font scaling, contrast, link underlining, motion reduction), not a
 * decorative badge. This is the code-level half of Israeli web
 * accessibility compliance; the certified accessibility audit and the
 * published accessibility statement are a separate, still-pending step
 * (see the "Accessibility compliance" checklist item) that needs a
 * licensed accessibility assessor, not something this widget can
 * substitute for on its own.
 *
 * Hidden on /admin — that's an internal tool for the site operator, not
 * the public-facing service the accessibility regulations are about, and
 * it already has its own separate dark-themed layout this widget's light
 * styling would clash with.
 */
export function AccessibilityWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Prefs>;
        const merged = { ...DEFAULT_PREFS, ...parsed };
        setPrefs(merged);
        applyToDocument(merged);
      }
    } catch {
      // Private browsing / blocked storage — defaults stay in effect.
    } finally {
      setLoaded(true);
    }
  }, []);

  // Takes an updater keyed off the previous state (never a precomputed
  // object) — two clicks fired close together must each see the other's
  // result, not both read the same stale `prefs` from their own render's
  // closure and silently clobber one another (verified this the hard
  // way: two fast clicks on font-size "increase" landed on step 1
  // instead of 2 before this was a functional update).
  function update(updater: (prev: Prefs) => Prefs) {
    setPrefs((prev) => {
      const merged = updater(prev);
      applyToDocument(merged);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Nothing to do if storage is blocked — the preference still
        // applies for the rest of this page view.
      }
      return merged;
    });
  }

  function reset() {
    update(() => DEFAULT_PREFS);
  }

  if (!loaded || pathname?.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-24 inset-x-0 z-50 pointer-events-none">
      <div className="max-w-app mx-auto relative">
        <div className="absolute bottom-0 left-4 flex flex-col items-start gap-3">
          {open && (
          <div
            role="dialog"
            aria-label="הגדרות נגישות"
            className="pointer-events-auto w-64 rounded-2xl bg-white shadow-sheet border border-ink-900/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-ink-900">נגישות</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירת הגדרות נגישות"
                className="tap h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-700 flex items-center gap-1.5">
                <span className="font-black text-sm">א</span>
                גודל טקסט
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => update((prev) => ({ ...prev, fontScale: Math.max(0, prev.fontScale - 1) as FontScale }))}
                  disabled={prefs.fontScale === 0}
                  aria-label="הקטנת טקסט"
                  className="tap h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => update((prev) => ({ ...prev, fontScale: Math.min(MAX_FONT_SCALE, prev.fontScale + 1) as FontScale }))}
                  disabled={prefs.fontScale === MAX_FONT_SCALE}
                  aria-label="הגדלת טקסט"
                  className="tap h-8 w-8 rounded-full bg-ink-100 flex items-center justify-center disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={prefs.highContrast}
              onClick={() => update((prev) => ({ ...prev, highContrast: !prev.highContrast }))}
              className="tap w-full flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5"
            >
              <span className="text-xs font-bold text-ink-700 flex items-center gap-1.5">
                <Contrast size={15} />
                ניגודיות גבוהה
              </span>
              <span
                className={`w-9 h-5 rounded-full relative transition-colors ${prefs.highContrast ? "bg-accent-600" : "bg-ink-200"}`}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ right: prefs.highContrast ? "18px" : "2px" }}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={prefs.underlineLinks}
              onClick={() => update((prev) => ({ ...prev, underlineLinks: !prev.underlineLinks }))}
              className="tap w-full flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5"
            >
              <span className="text-xs font-bold text-ink-700 flex items-center gap-1.5">
                <Link2 size={15} />
                הדגשת קישורים
              </span>
              <span
                className={`w-9 h-5 rounded-full relative transition-colors ${prefs.underlineLinks ? "bg-accent-600" : "bg-ink-200"}`}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ right: prefs.underlineLinks ? "18px" : "2px" }}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={prefs.reduceMotion}
              onClick={() => update((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }))}
              className="tap w-full flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5"
            >
              <span className="text-xs font-bold text-ink-700 flex items-center gap-1.5">
                <PauseCircle size={15} />
                עצירת אנימציות
              </span>
              <span
                className={`w-9 h-5 rounded-full relative transition-colors ${prefs.reduceMotion ? "bg-accent-600" : "bg-ink-200"}`}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                  style={{ right: prefs.reduceMotion ? "18px" : "2px" }}
                />
              </span>
            </button>

            <button
              type="button"
              onClick={reset}
              className="tap w-full flex items-center justify-center gap-1.5 rounded-xl border border-ink-900/10 py-2 text-xs font-bold text-ink-500"
            >
              <RotateCcw size={13} />
              איפוס
            </button>
          </div>
        )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "סגירת הגדרות נגישות" : "פתיחת הגדרות נגישות"}
            className="tap pointer-events-auto h-12 w-12 rounded-full bg-ink-900 text-white shadow-card flex items-center justify-center flex-shrink-0"
          >
            <Accessibility size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
