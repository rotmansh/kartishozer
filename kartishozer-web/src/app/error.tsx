"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Route-level error boundary — catches a render-time throw anywhere below
// the root layout. The real error (message/stack/digest) always goes to
// the server console via console.error here (visible in Vercel's Runtime
// Logs), so nothing about diagnosing a real failure is lost; what changed
// is that a signed-in visitor no longer sees that raw text on their own
// screen — a plain, friendly message replaces it.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 gap-3">
      <div className="h-16 w-16 rounded-full bg-ink-100 flex items-center justify-center text-brand">
        <AlertTriangle size={26} />
      </div>
      <p className="font-black text-ink-900">משהו השתבש</p>
      <p className="text-sm text-ink-500 max-w-[26ch]">
        אנחנו כבר יודעים על זה. אפשר לנסות שוב, או לחזור לדף הבית.
      </p>
      <div className="flex items-center gap-2 mt-2">
        <Button onClick={() => reset()}>נסו שוב</Button>
        <Link href="/">
          <Button variant="outline">חזרה לדף הבית</Button>
        </Link>
      </div>
    </div>
  );
}
