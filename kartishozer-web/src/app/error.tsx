"use client";

// TEMPORARY diagnostic boundary — see global-error.tsx for context.
// This one catches errors below the root layout (i.e. everywhere
// global-error.tsx would NOT catch, since Next only uses global-error
// for failures in the root layout itself).

export default function RouteError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        margin: 0,
        padding: 16,
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#1E1917",
        color: "#fff",
        direction: "ltr",
        textAlign: "left",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#E8503A", fontSize: 18, marginBottom: 8 }}>
        Diagnostic: client-side exception caught (route level)
      </h1>
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
    </div>
  );
}
