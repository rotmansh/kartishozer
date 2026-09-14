import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import { CLERK_ENABLED } from "@/lib/auth/config";
import { AppShell } from "@/components/layout/AppShell";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "כרטיס חוזר",
  description: "קונים ומוכרים כרטיסים ביד שנייה — בבטחה.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAF7F5",
};

// Every page here reads live, per-user, or admin-gated data (auth state,
// favorites, listings/orders that change constantly). Forcing dynamic
// rendering app-wide guarantees Next never statically caches personalized
// content — notably, without this, pages built while Clerk has no keys
// configured get silently frozen as static (no dynamic API is ever
// invoked to signal otherwise), baking in a signed-out snapshot for
// every visitor forever.
export const dynamic = "force-dynamic";

const clerkAppearance = {
  layout: { logoPlacement: "none" as const },
  variables: {
    colorPrimary: "#E8503A",
    colorText: "#1E1917",
    colorTextSecondary: "#786D68",
    colorBackground: "#FFFFFF",
    colorInputBackground: "#FFFFFF",
    borderRadius: "1rem",
    fontFamily: "var(--font-heebo), Segoe UI, Arial, sans-serif",
  },
  elements: {
    card: "shadow-none border border-black/5",
    formButtonPrimary: "bg-brand hover:bg-brand-600 text-sm normal-case",
    footerActionLink: "text-brand hover:text-brand-600",
  },
};

// TEMPORARY diagnostic script — runs before any other client JS, so it
// catches crashes even if they happen before React attaches its own
// error boundaries (global-error.tsx/error.tsx only catch render-time
// throws). Writes the real error text into a full-screen overlay via
// plain DOM APIs, no React needed. Safe to remove once the live crash
// is diagnosed; does not touch auth, data, or business logic.
const DIAGNOSTIC_SCRIPT = `
(function () {
  function show(msg) {
    try {
      var el = document.getElementById('__diag_overlay');
      if (!el) {
        el = document.createElement('div');
        el.id = '__diag_overlay';
        el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#1E1917;color:#fff;padding:16px;font-family:monospace;font-size:12px;white-space:pre-wrap;overflow:auto;direction:ltr;text-align:left;';
        (document.body || document.documentElement).appendChild(el);
      }
      el.textContent += msg + '\\n\\n';
    } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    show('window.onerror: ' + (e.message || '') + '\\n' + ((e.error && e.error.stack) || ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    show('unhandledrejection: ' + ((r && r.message) || r) + '\\n' + ((r && r.stack) || ''));
  });
})();
`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DIAGNOSTIC_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <Shell>{children}</Shell>;

  return (
    <ClerkProvider localization={heIL} appearance={clerkAppearance}>
      <Shell>{children}</Shell>
    </ClerkProvider>
  );
}
