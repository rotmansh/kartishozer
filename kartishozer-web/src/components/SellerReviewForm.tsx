"use client";

import { useState, useTransition } from "react";
import { Star, Check } from "lucide-react";
import { submitSellerReviewAction } from "@/lib/actions/orders.actions";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function SellerReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="mt-3 pt-3 border-t border-ink-900/5 flex items-center gap-1.5 text-xs font-bold text-accent-600">
        <Check size={14} />
        תודה על הדירוג!
      </div>
    );
  }

  function handleSubmit() {
    if (rating === 0) {
      setError("בחרו דירוג לפני השליחה");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitSellerReviewAction({ orderId, rating, comment: comment.trim() || undefined });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-ink-900/5">
      <p className="text-xs font-bold text-ink-700 mb-1.5">איך היה החוויה עם המוכר/ת?</p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="דירוג המוכר">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} כוכבים`}
            onClick={() => setRating(n)}
            className="tap p-0.5"
          >
            <Star size={22} className={cn(n <= rating ? "fill-amber-400 text-amber-400" : "text-ink-200")} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        placeholder="רוצים להוסיף כמה מילים? (לא חובה)"
        rows={2}
        className="w-full mt-2 rounded-xl border border-ink-900/10 p-2.5 text-sm placeholder-ink-300 outline-none resize-none"
      />
      {error && <p className="text-xs text-brand-600 font-bold mt-1.5">{error}</p>}
      <Button size="md" className="mt-2" disabled={isPending} onClick={handleSubmit}>
        {isPending ? "שולח…" : "שליחת דירוג"}
      </Button>
    </div>
  );
}
