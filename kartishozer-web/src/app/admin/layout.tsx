// ============================================================
// /admin layout — sidebar + role guard
// ============================================================

import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/server";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminComponents";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminUser();

  return (
    // flex-col on mobile (header, then the scrollable nav strip, then
    // content, stacked full-width) / flex-row on md+ (the old side-rail
    // layout) — a single fixed flex-row broke on phone widths by forcing
    // the sidebar and the page content into two half-width columns.
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-950 text-white" dir="rtl">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 flex-shrink-0 border-b border-white/10 flex items-center px-4 md:px-6 gap-3 bg-gray-900">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-[#E8503A] flex items-center justify-center text-white font-black text-[10px] flex-shrink-0">
              כ
            </div>
            <span className="text-xs font-bold text-white/50 whitespace-nowrap">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 whitespace-nowrap">
            חזרה לאתר
          </Link>
        </header>
        <AdminMobileNav />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
