"use client";

// ============================================================
// TEMPORARY diagnostic boundary — not part of the approved design.
// Next.js's default "Application error: a client-side exception has
// occurred" screen hides the real message/stack in production. This
// replaces that screen with the actual error so it can be read on a
// phone with no DevTools access. Safe to remove once the live crash
// is identified and fixed — catches only the render path itself, does
// not touch auth, data, or any business logic.
// ============================================================

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          padding: 16,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#1E1917",
          color: "#fff",
          direction: "ltr",
          textAlign: "left",
        }}
      >
        <h1 style={{ color: "#E8503A", fontSize: 18, marginBottom: 8 }}>
          Diagnostic: client-side exception caught
        </h1>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
          This is a temporary diagnostic screen, not the real app UI.
        </p>
        <div style={{ background: "#00000040", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>name</p>
          <p style={{ fontSize: 14, margin: "2px 0 10px", wordBreak: "break-word" }}>{error.name}</p>
          <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>message</p>
          <p style={{ fontSize: 14, margin: "2px 0 10px", wordBreak: "break-word" }}>{error.message}</p>
          {error.digest && (
            <>
              <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>digest</p>
              <p style={{ fontSize: 14, margin: "2px 0 10px" }}>{error.digest}</p>
            </>
          )}
        </div>
        {error.stack && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 11,
              background: "#00000040",
              padding: 12,
              borderRadius: 8,
              maxHeight: "50vh",
              overflow: "auto",
            }}
          >
            {error.stack}
          </pre>
        )}
      </body>
    </html>
  );
}
