"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// The Push API wants the VAPID key as a raw Uint8Array, but env vars can
// only carry strings — this is the standard base64url -> bytes conversion.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Status = "unsupported" | "denied" | "granted" | "promptable";

export function NotificationsOptIn() {
  const [status, setStatus] = useState<Status | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "promptable");
  }, []);

  async function handleEnable() {
    if (!VAPID_PUBLIC_KEY) return;
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "promptable");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("granted");
    } catch (err) {
      console.error("Failed to enable push notifications:", err);
    } finally {
      setIsPending(false);
    }
  }

  if (status === null || status === "unsupported" || status === "denied") return null;

  if (status === "granted") {
    return (
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-2xl bg-accent-50 text-accent-700 px-3.5 py-2.5 text-xs font-bold">
        <BellRing size={15} />
        התראות על הודעות חדשות פעילות
      </div>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={isPending}
      className="tap mx-4 mb-3 flex items-center gap-2.5 rounded-2xl bg-white border border-ink-900/10 shadow-card px-3.5 py-3 text-right disabled:opacity-60"
    >
      <span className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
        <Bell size={16} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-ink-900">קבלו התראה כשמגיעה הודעה חדשה</span>
        <span className="block text-[11px] text-ink-500 mt-0.5">גם כשהאתר סגור</span>
      </span>
    </button>
  );
}
