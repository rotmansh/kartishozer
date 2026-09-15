"use client";

import { useEffect } from "react";

// Root-layout error boundary — Next only renders this (instead of
// error.tsx) when the root layout itself fails, so it renders a full
// <html>/<body> with inline styles rather than relying on Tailwind
// classes/globals.css, which the crashed layout may not have applied.
// The real error still goes to the server console via console.error
// (visible in Vercel's Runtime Logs) — this only changes what a visitor
// sees on their own screen, from a raw stack trace to a plain message.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 32,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#FAF7F5",
          color: "#1E1917",
        }}
      >
        <p style={{ fontWeight: 900, fontSize: 16 }}>משהו השתבש</p>
        <p style={{ fontSize: 14, color: "#786D68", maxWidth: "26ch" }}>
          אנחנו כבר יודעים על זה. אפשר לנסות שוב, או לחזור לדף הבית.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => reset()}
            style={{
              height: 44,
              padding: "0 20px",
              borderRadius: 16,
              border: "none",
              background: "#E8503A",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            נסו שוב
          </button>
          <a
            href="/"
            style={{
              height: 44,
              padding: "0 20px",
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 16,
              border: "2px solid rgba(30,25,23,0.1)",
              color: "#1E1917",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            חזרה לדף הבית
          </a>
        </div>
      </body>
    </html>
  );
}
