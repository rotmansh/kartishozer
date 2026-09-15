"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleEventFavoriteAction } from "@/lib/actions/favorites.actions";

export function EventFavoriteButton({
  eventId,
  isFavorited = false,
  canFavorite = false,
  className,
}: {
  eventId: string;
  isFavorited?: boolean;
  canFavorite?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [fav, setFav] = useState(isFavorited);
  const [, startTransition] = useTransition();

  function handleClick() {
    if (!canFavorite) {
      router.push("/sign-in?redirect=/favorites");
      return;
    }
    setFav((v) => !v);
    startTransition(async () => {
      const result = await toggleEventFavoriteAction(eventId);
      if ("error" in result) setFav((v) => !v);
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-label="הוסף למועדפים"
      className={
        className ??
        "tap h-10 w-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center"
      }
    >
      <Heart size={18} className={fav ? "fill-brand text-brand" : "text-white"} />
    </button>
  );
}
