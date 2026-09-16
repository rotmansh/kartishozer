"use client";

// ============================================================
// Admin client action components
// ListingReviewButtons · DisputeResolvePanel · PayoutActionButtons
// VendorActionButtons · ConfigEditor
// ============================================================

import { useState, useTransition } from "react";
import {
  reviewListingAction,
  resolveDisputeAction,
  processPayoutAction,
  holdPayoutAction,
  updateVendorStatusAction,
  updatePlatformConfigAction,
} from "@/lib/admin/actions";
import type { PlatformConfigEntry } from "@/lib/admin/types";

// ── Listing review ────────────────────────────────────────────

export function ListingReviewButtons({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: string;
}) {
  const [isPending, start] = useTransition();
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-[11px] font-bold text-[#00B4A6]">{done} ✓</span>;

  if (!["PENDING_REVIEW", "ACTIVE", "REJECTED"].includes(currentStatus)) {
    return <span className="text-white/20 text-[11px]">—</span>;
  }

  async function act(decision: "APPROVE" | "REJECT" | "REQUEST_INFO") {
    start(async () => {
      const r = await reviewListingAction({ listingId, decision, notes: note || undefined });
      if ("error" in r) setError(r.error);
      else setDone(decision === "APPROVE" ? "אושר" : decision === "REJECT" ? "נדחה" : "נשלחה בקשה");
    });
  }

  return (
    <div className="space-y-1.5">
      {error && <p className="text-[10px] text-[#E8503A]">{error}</p>}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="הערה (אופציונלי)"
        className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-[11px] text-white/70 placeholder-white/20 focus:outline-none focus:border-white/30"
      />
      <div className="flex gap-1">
        <button
          onClick={() => act("APPROVE")}
          disabled={isPending}
          className="rounded px-2.5 py-1 text-[11px] font-bold bg-[#00B4A6]/20 text-[#00B4A6] hover:bg-[#00B4A6]/30 disabled:opacity-40"
        >
          אשר
        </button>
        <button
          onClick={() => act("REJECT")}
          disabled={isPending}
          className="rounded px-2.5 py-1 text-[11px] font-bold bg-[#E8503A]/20 text-[#E8503A] hover:bg-[#E8503A]/30 disabled:opacity-40"
        >
          דחה
        </button>
        <button
          onClick={() => act("REQUEST_INFO")}
          disabled={isPending}
          className="rounded px-2.5 py-1 text-[11px] font-bold bg-white/10 text-white/50 hover:bg-white/15 disabled:opacity-40"
        >
          מידע
        </button>
      </div>
    </div>
  );
}

// ── Dispute resolution panel ──────────────────────────────────

export function DisputeResolvePanel({ disputeId }: { disputeId: string }) {
  const [isPending, start] = useTransition();
  const [resolution, setResolution] = useState<"REFUND_BUYER" | "RELEASE_TO_SELLER" | "PARTIAL_REFUND" | "">("");
  const [notes, setNotes] = useState("");
  const [partialAmt, setPartialAmt] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-xs font-bold text-[#00B4A6]">הסכסוך נפתר ✓</span>;

  return (
    <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
      <p className="text-xs font-black text-white/60">פתרון</p>

      <div className="space-y-1.5">
        {[
          { value: "REFUND_BUYER", label: "החזר לקונה (מלא)" },
          { value: "RELEASE_TO_SELLER", label: "שחרר למוכר" },
          { value: "PARTIAL_REFUND", label: "החזר חלקי" },
        ].map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`res_${disputeId}`}
              value={opt.value}
              checked={resolution === opt.value}
              onChange={() => setResolution(opt.value as typeof resolution)}
              className="accent-[#E8503A]"
            />
            <span className="text-xs text-white/60">{opt.label}</span>
          </label>
        ))}
      </div>

      {resolution === "PARTIAL_REFUND" && (
        <input
          type="number"
          value={partialAmt}
          onChange={(e) => setPartialAmt(e.target.value)}
          placeholder="סכום החזר (₪)"
          className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none"
          dir="ltr"
        />
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="הערות הכרחיות..."
        rows={2}
        className="w-full rounded bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/70 placeholder-white/20 focus:outline-none resize-none"
      />

      {error && <p className="text-[11px] text-[#E8503A]">{error}</p>}

      <button
        disabled={!resolution || notes.length < 5 || isPending}
        onClick={() =>
          start(async () => {
            const r = await resolveDisputeAction({
              disputeId,
              resolution: resolution as "REFUND_BUYER" | "RELEASE_TO_SELLER" | "PARTIAL_REFUND",
              notes,
              refundAmountShekel: resolution === "PARTIAL_REFUND" ? Number(partialAmt) : undefined,
            });
            if ("error" in r) setError(r.error);
            else setDone(true);
          })
        }
        className="w-full rounded-lg bg-[#E8503A]/20 border border-[#E8503A]/30 py-2 text-xs font-black text-[#E8503A] hover:bg-[#E8503A]/30 disabled:opacity-40 transition-colors"
      >
        {isPending ? "מעבד…" : "אשרו פתרון"}
      </button>
    </div>
  );
}

// ── Payout action buttons ─────────────────────────────────────

export function PayoutActionButtons({ payoutId }: { payoutId: string }) {
  const [isPending, start] = useTransition();
  const [holdReason, setHoldReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHold, setShowHold] = useState(false);

  if (done) return <span className="text-[11px] font-bold text-[#00B4A6]">{done} ✓</span>;

  return (
    <div className="space-y-1.5">
      {error && <p className="text-[10px] text-[#E8503A]">{error}</p>}
      <div className="flex gap-1">
        <button
          disabled={isPending}
          onClick={() =>
            start(async () => {
              const r = await processPayoutAction({ payoutId });
              if ("error" in r) setError(r.error);
              else setDone("בעיבוד");
            })
          }
          className="rounded px-2.5 py-1 text-[11px] font-bold bg-[#00B4A6]/20 text-[#00B4A6] hover:bg-[#00B4A6]/30 disabled:opacity-40"
        >
          עבד
        </button>
        <button
          disabled={isPending}
          onClick={() => setShowHold(!showHold)}
          className="rounded px-2.5 py-1 text-[11px] font-bold bg-white/10 text-white/50 hover:bg-white/15"
        >
          עצור
        </button>
      </div>
      {showHold && (
        <div className="space-y-1">
          <input
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            placeholder="סיבת העצירה"
            className="w-full rounded bg-white/5 border border-white/10 px-2 py-1 text-[11px] text-white/70 placeholder-white/20 focus:outline-none"
          />
          <button
            disabled={holdReason.length < 5 || isPending}
            onClick={() =>
              start(async () => {
                const r = await holdPayoutAction({ payoutId, reason: holdReason });
                if ("error" in r) setError(r.error);
                else setDone("עצור");
              })
            }
            className="rounded px-2.5 py-1 text-[11px] font-bold bg-[#EF9F27]/20 text-[#EF9F27] hover:bg-[#EF9F27]/30 disabled:opacity-40"
          >
            אשר עצירה
          </button>
        </div>
      )}
    </div>
  );
}

// ── Vendor action buttons ─────────────────────────────────────

export function VendorActionButtons({
  vendorId,
  currentStatus,
  isVerified,
}: {
  vendorId: string;
  currentStatus: string;
  isVerified: boolean;
}) {
  const [isPending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (done) return <span className="text-[11px] font-bold text-[#00B4A6]">{done} ✓</span>;

  async function act(action: "SUSPEND" | "REINSTATE" | "VERIFY") {
    if (action === "SUSPEND" && !confirm("לאשר השעיית המוכר?")) return;
    start(async () => {
      const r = await updateVendorStatusAction({ vendorId, action });
      if ("error" in r) setError(r.error);
      else setDone(action === "SUSPEND" ? "הושעה" : action === "VERIFY" ? "אומת" : "הופעל");
    });
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-[10px] text-[#E8503A]">{error}</p>}
      <div className="flex gap-1 flex-wrap">
        {!isVerified && (
          <button
            onClick={() => act("VERIFY")}
            disabled={isPending}
            className="rounded px-2.5 py-1 text-[11px] font-bold bg-[#00B4A6]/20 text-[#00B4A6] hover:bg-[#00B4A6]/30 disabled:opacity-40"
          >
            אמת
          </button>
        )}
        {currentStatus !== "SUSPENDED" ? (
          <button
            onClick={() => act("SUSPEND")}
            disabled={isPending}
            className="rounded px-2.5 py-1 text-[11px] font-bold bg-[#E8503A]/20 text-[#E8503A] hover:bg-[#E8503A]/30 disabled:opacity-40"
          >
            השעה
          </button>
        ) : (
          <button
            onClick={() => act("REINSTATE")}
            disabled={isPending}
            className="rounded px-2.5 py-1 text-[11px] font-bold bg-white/10 text-white/50 hover:bg-white/15 disabled:opacity-40"
          >
            הפעל
          </button>
        )}
      </div>
    </div>
  );
}

// ── Config editor ─────────────────────────────────────────────

export function ConfigEditor({ entry }: { entry: PlatformConfigEntry }) {
  const [value, setValue] = useState(entry.value);
  const [isPending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = value !== entry.value;

  return (
    <div className="flex items-center gap-3">
      {entry.type === "boolean" ? (
        <button
          onClick={() => setValue(value === "true" ? "false" : "true")}
          className={[
            "w-10 h-6 rounded-full transition-colors relative",
            value === "true" ? "bg-[#00B4A6]" : "bg-white/20",
          ].join(" ")}
          role="switch"
          aria-checked={value === "true"}
        >
          <span
            className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
            style={{ right: value === "true" ? "2px" : "calc(100% - 18px)" }}
          />
        </button>
      ) : (
        <input
          type="number"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="w-24 rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/30"
          dir="ltr"
        />
      )}

      {isDirty && (
        <button
          disabled={isPending}
          onClick={() =>
            start(async () => {
              const r = await updatePlatformConfigAction({ key: entry.key, value });
              if ("error" in r) setError(r.error);
              else setSaved(true);
            })
          }
          className="rounded-lg px-4 py-1.5 text-xs font-bold bg-[#E8503A] text-white hover:bg-[#c9432f] disabled:opacity-40 shadow-sm"
        >
          {isPending ? "מאשר…" : "אישור"}
        </button>
      )}

      {saved && <span className="text-[11px] text-[#00B4A6] font-bold">✓</span>}
      {error && <span className="text-[11px] text-[#E8503A]">{error}</span>}
    </div>
  );
}
