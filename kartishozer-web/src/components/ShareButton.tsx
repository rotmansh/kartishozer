"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

// navigator.share() opens the phone's own share sheet (WhatsApp, Facebook,
// Instagram, copy link, ...) directly — no per-platform integration
// needed. It's unavailable on some desktop browsers, so those fall back
// to copying the link, which is enough since the listing page's own
// opengraph-image gives the pasted link a real preview card either way.
export function ShareButton({
  title,
  text,
  url,
  iconOnly,
  className,
}: {
  title: string;
  text?: string;
  url?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // Cancelled or dismissed the native share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing more we can do silently.
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleShare}
        aria-label="שיתוף המודעה"
        className={
          className ??
          "tap h-14 w-14 flex-shrink-0 rounded-2xl bg-white border border-ink-900/10 flex items-center justify-center shadow-card"
        }
      >
        {copied ? <Check size={20} className="text-accent-600" /> : <Share2 size={20} className="text-ink-700" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className={
        className ??
        "tap inline-flex items-center gap-2 rounded-2xl border-2 border-ink-900/10 px-4 h-11 text-sm font-bold text-ink-900"
      }
    >
      {copied ? (
        <>
          <Check size={16} className="text-accent-600" />
          הקישור הועתק!
        </>
      ) : (
        <>
          <Share2 size={16} />
          שיתוף המודעה
        </>
      )}
    </button>
  );
}
