"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Paperclip, Send } from "lucide-react";
import { addDisputeEvidenceAction, sellerRespondToDisputeAction } from "@/lib/actions/disputes.actions";

const UPLOADER_LABEL: Record<string, string> = {
  BUYER: "הקונה/ת",
  SELLER: "המוכר/ת",
  ADMIN: "הצוות",
};

export type DisputeEvidenceItem = {
  id: string;
  uploaderRole: string;
  mimeType: string;
  createdAt: string;
  note: string | null;
};

/**
 * Shared by both the buyer's and the seller's order card in /profile — the
 * only difference is `viewerRole`, which decides whether the response box
 * is a read-only display or an editable form. Evidence upload is symmetric
 * for both sides. Rendered only while the dispute is OPEN/UNDER_REVIEW; the
 * caller (profile page) decides that from the order's own dispute status.
 * (Named `viewerRole`, not `role` — a plain `role` prop collides with
 * ESLint's jsx-a11y/aria-role check, which flags any JSX attribute
 * literally named `role` even on a non-DOM component.)
 */
export function DisputePanel({
  disputeId,
  viewerRole,
  sellerResponse,
  evidence,
}: {
  disputeId: string;
  viewerRole: "BUYER" | "SELLER";
  sellerResponse: string | null;
  evidence: DisputeEvidenceItem[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [responseDraft, setResponseDraft] = useState("");
  const [responseError, setResponseError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    const formData = new FormData();
    formData.set("disputeId", disputeId);
    formData.set("file", file);

    startTransition(async () => {
      const res = await addDisputeEvidenceAction(formData);
      if ("error" in res) setUploadError(res.error);
      else router.refresh();
    });
  }

  function handleRespond() {
    setResponseError(null);
    startTransition(async () => {
      const res = await sellerRespondToDisputeAction({ disputeId, response: responseDraft });
      if ("error" in res) setResponseError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink-900/5 space-y-2">
      <p className="text-xs font-bold text-ink-900">פנייה פתוחה — הכסף מוקפא עד לבירור</p>

      {evidence.length > 0 && (
        <ul className="space-y-1">
          {evidence.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-2 text-[11px] text-ink-600">
              <span className="truncate">
                {UPLOADER_LABEL[ev.uploaderRole] ?? ev.uploaderRole}
                {ev.note ? ` — ${ev.note}` : ""}
              </span>
              <a
                href={`/api/disputes/${disputeId}/evidence/${ev.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tap flex items-center gap-1 font-bold text-accent-600 flex-shrink-0"
              >
                <Eye size={12} />
                צפייה
              </a>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="tap flex items-center gap-1.5 rounded-xl bg-ink-100 text-ink-700 text-xs font-bold px-3 py-2 disabled:opacity-40"
      >
        <Paperclip size={14} />
        {isPending ? "מעלה..." : "צירוף אסמכתא (תמונה או PDF)"}
      </button>
      {uploadError && <p className="text-[11px] text-accent-600">{uploadError}</p>}

      {sellerResponse ? (
        <div className="rounded-xl bg-ink-50 p-2.5">
          <p className="text-[10px] font-bold text-ink-500 mb-1">תגובת המוכר/ת:</p>
          <p className="text-xs text-ink-900 whitespace-pre-wrap">{sellerResponse}</p>
        </div>
      ) : viewerRole === "SELLER" ? (
        <div className="space-y-1.5">
          <textarea
            value={responseDraft}
            onChange={(e) => setResponseDraft(e.target.value)}
            placeholder="הגיבו על טענת הקונה/ת לפני שהצוות מכריע"
            rows={3}
            className="w-full rounded-xl border border-ink-900/10 px-3 py-2 text-xs text-ink-900 placeholder-ink-400 focus:outline-none focus:border-accent-500"
          />
          {responseError && <p className="text-[11px] text-accent-600">{responseError}</p>}
          <button
            onClick={handleRespond}
            disabled={isPending || responseDraft.trim().length < 10}
            className="tap flex items-center gap-1.5 rounded-xl bg-accent-600 text-white text-xs font-bold px-4 py-2 disabled:opacity-40"
          >
            <Send size={14} />
            שליחת תגובה
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-ink-400">טרם התקבלה תגובה מהמוכר/ת</p>
      )}
    </div>
  );
}
