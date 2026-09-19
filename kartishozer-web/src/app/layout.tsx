import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { heIL } from "@clerk/localizations";
import { CLERK_ENABLED, CLERK_PUBLISHABLE_KEY } from "@/lib/auth/config";
import { AppShell } from "@/components/layout/AppShell";
import { AttributionTracker } from "@/components/AttributionTracker";
import { AccessibilityWidget } from "@/components/AccessibilityWidget";
import { getAppUser } from "@/lib/auth/server";
import { getUnreadConversationCount } from "@/lib/queries/messages";
import { linkVisitorToUser } from "@/lib/analytics";

// Terms acceptance is required only at the actual transaction points —
// buying (checkout) or listing something for sale (sell) — not to browse
// the rest of the site. Both are already sign-in-gated in middleware.ts,
// so by the time this check runs the visitor is always a real signed-in
// user, never anonymous.
const TERMS_GATE_PATHS = ["/checkout", "/sell"];

function requiresTermsGate(pathname: string): boolean {
  return TERMS_GATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

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

// No maximumScale — a fixed 1x zoom cap fails WCAG 1.4.4 (Resize Text)
// outright, since it stops anyone from pinch-zooming text they can't
// read comfortably. Confirmed via axe-core: this was the one violation
// flagged identically on every single page, unrelated to any specific
// color/component.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();

  if (user && !user.termsAcceptedAt) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (requiresTermsGate(pathname)) {
      redirect(`/accept-terms?redirect=${encodeURIComponent(pathname)}`);
    }
  }

  const unreadCount = user ? await getUnreadConversationCount(user.id) : 0;
  if (user) await linkVisitorToUser(user.id);

  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased">
        <AttributionTracker />
        <AppShell unreadCount={unreadCount}>{children}</AppShell>
        <AccessibilityWidget />
      </body>
    </html>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (!CLERK_ENABLED) return <Shell>{children}</Shell>;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} localization={heIL} appearance={clerkAppearance}>
      <Shell>{children}</Shell>
    </ClerkProvider>
  );
}
