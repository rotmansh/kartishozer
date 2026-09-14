import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <FavoritesProvider>
            <AppShell>{children}</AppShell>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
