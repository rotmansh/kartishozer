"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { joinEventWaitlistAction, leaveEventWaitlistAction } from "@/lib/actions/waitlist.actions";
import { Button } from "@/components/ui/Button";

export function WaitlistButton({
  eventId,
  isOnWaitlist = false,
  canJoin = false,
}: {
  eventId: string;
  isOnWaitlist?: boolean;
  canJoin?: boolean;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(isOnWaitlist);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!canJoin) {
      router.push(`/sign-in?redirect=/event/${eventId}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = joined ? await leaveEventWaitlistAction(eventId) : await joinEventWaitlistAction(eventId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setJoined(result.joined);
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant={joined ? "outline" : "primary"} disabled={isPending} onClick={handleClick}>
        {joined ? (
          <span className="flex items-center gap-1.5">
            <BellOff size={16} />
            בטלו את ההתראה
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Bell size={16} />
            עדכנו אותי כשיהיה כרטיס
          </span>
        )}
      </Button>
      {error && <p className="text-xs text-brand-600 font-bold">{error}</p>}
    </div>
  );
}
