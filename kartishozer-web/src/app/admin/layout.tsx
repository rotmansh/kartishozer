// ============================================================
// /admin layout — sidebar + role guard
// ============================================================

import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth/server";
import { AdminSidebar } from "@/components/admin/AdminComponents";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminUser();

  return (
    <div className="flex min-h-screen bg-gray-950 text-white" dir="rtl">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 border-b border-white/10 flex items-center px-6 gap-3 bg-gray-900">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-[#E8503A] flex items-center justify-center text-white font-black text-[10px]">
              כ
            </div>
            <span className="text-xs font-bold text-white/50">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <Link href="/" className="text-xs text-white/40 hover:text-white/70">
            חזרה לאתר
          </Link>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
