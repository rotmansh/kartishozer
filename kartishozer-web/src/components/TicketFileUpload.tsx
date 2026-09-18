"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileCheck2, Upload } from "lucide-react";
import { uploadTicketFileAction } from "@/lib/actions/ticketFiles.actions";

export function TicketFileUpload({ listingId, hasFile }: { listingId: string; hasFile: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("listingId", listingId);
    formData.set("file", file);

    startTransition(async () => {
      const res = await uploadTicketFileAction(formData);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className={`tap flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40 ${
            hasFile ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          {hasFile ? <FileCheck2 size={14} /> : <Upload size={14} />}
          {isPending ? "מעלה..." : hasFile ? "כרטיס הועלה — להחלפה" : "העלאת קובץ הכרטיס"}
        </button>
        {hasFile && (
          <a
            href={`/api/tickets/${listingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-ink-100 text-ink-700"
            aria-label="צפייה בקובץ שהועלה"
          >
            <Eye size={14} />
            צפייה
          </a>
        )}
      </div>
      {error && <p className="text-[11px] text-accent-600 mt-1">{error}</p>}
    </div>
  );
}
