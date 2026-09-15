"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendMessageAction } from "@/lib/actions/messages.actions";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = value.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessageAction({ conversationId, body });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setValue("");
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-ink-50/95 backdrop-blur border-t border-ink-900/5 px-4 py-3 flex items-end gap-2"
    >
      <div className="flex-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="כתבו הודעה…"
          className="w-full resize-none rounded-2xl bg-white border border-ink-900/10 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand/30 max-h-32"
        />
        {error && <p className="text-[11px] text-brand mt-1 px-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        aria-label="שליחה"
        className="tap h-11 w-11 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
      >
        <Send size={17} />
      </button>
    </form>
  );
}
