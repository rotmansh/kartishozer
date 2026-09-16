"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// The Push API wants the VAPID key as a raw Uint8Array, but env vars can
// only carry strings — this is the standard base64url -> bytes conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Availability = "checking" | "unsupported" | "denied" | "available";

export function NotificationsOptIn() {
  const [availability, setAvailability] = useState<Availability>("checking");
  // Whether there's an active push subscription right now — this, not the
  // one-time browser permission grant, is what the switch reflects, so
  // the user can flip it off and back on as often as they like.
  const [subscribed, setSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setAvailability("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setAvailability("denied");
      return;
    }
    setAvailability("available");

    if (Notification.permission === "granted") {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {});
    }
  }, []);

  async function handleSubscribe() {
    if (!VAPID_PUBLIC_KEY) return;
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setAvailability("denied");
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      // .ready resolves once the worker is actually active — subscribing
      // right after .register() can race ahead of that and fail with
      // "no active Service Worker".
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setSubscribed(true);
    } catch (err) {
      console.error("Failed to enable push notifications:", err);
    } finally {
      setIsPending(false);
    }
  }

  async function handleUnsubscribe() {
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Failed to disable push notifications:", err);
    } finally {
      setIsPending(false);
    }
  }

  if (availability === "checking" || availability === "unsupported" || availability === "denied") {
    return null;
  }

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-white border border-ink-900/10 shadow-card px-3.5 py-3">
      <span className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
        <Bell size={16} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-ink-900">התראה כשמגיעה הודעה חדשה</span>
        <span className="block text-[11px] text-ink-500 mt-0.5">גם כשהאתר סגור — אפשר לשנות בכל זמן</span>
      </span>
      <button
        onClick={subscribed ? handleUnsubscribe : handleSubscribe}
        disabled={isPending}
        role="switch"
        aria-checked={subscribed}
        aria-label="התראה כשמגיעה הודעה חדשה"
        className={cn(
          "w-10 h-6 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-60",
          subscribed ? "bg-accent" : "bg-ink-100"
        )}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all"
          style={{ right: subscribed ? "2px" : "calc(100% - 18px)" }}
        />
      </button>
    </div>
  );
}
