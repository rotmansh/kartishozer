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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
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
