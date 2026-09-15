// ============================================================
// /admin — Overview dashboard
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  Wallet,
  Clock,
  Check,
  Hourglass,
  AlertTriangle,
  Ban,
  Users,
  UserPlus,
  UserX,
  AlertCircle,
  Ticket,
  Gavel,
  Send,
  Settings,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth/server";
import { getPlatformStats } from "@/lib/admin/queries";
import { AdminStatCard } from "@/components/admin/AdminComponents";

export const metadata: Metadata = { title: "Admin | כרטיס חוזר" };

function fmt(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n / 100);
}

export default async function AdminOverviewPage() {
  await requireAdminUser();
  const stats = await getPlatformStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-black text-white">סקירה כללית</h1>
        <p className="text-xs text-white/30 mt-1">נתונים בזמן אמת</p>
      </div>

      {(stats.openDisputes > 0 || stats.pendingReviewListings > 0 || stats.highRiskListings > 0) && (
        <div className="rounded-xl border border-[#E8503A]/30 bg-[#E8503A]/10 p-4 space-y-2">
          <p className="text-xs font-black text-[#E8503A] uppercase tracking-wider">דורש טיפול</p>
          <div className="flex flex-wrap gap-3">
            {stats.openDisputes > 0 && (
              <Link href="/admin/disputes?status=OPEN" className="text-xs font-bold text-white/80 hover:text-white">
                {stats.openDisputes} סכסוכים פתוחים →
              </Link>
            )}
            {stats.pendingReviewListings > 0 && (
              <Link
                href="/admin/listings?status=PENDING_REVIEW"
                className="text-xs font-bold text-white/80 hover:text-white"
              >
                {stats.pendingReviewListings} ליסטינגים לבדיקה →
              </Link>
            )}
            {stats.highRiskListings > 0 && (
              <Link
                href="/admin/listings?riskLevel=HIGH"
                className="text-xs font-bold text-white/80 hover:text-white"
              >
                {stats.highRiskListings} ליסטינגים בסיכון גבוה →
              </Link>
            )}
          </div>
        </div>
      )}

      <section>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
          הכנסות — 30 ימים אחרונים
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="GMV" value={fmt(stats.gmv30dAgorot)} icon={TrendingUp} sub={`${stats.totalOrders30d} עסקאות`} />
          <AdminStatCard label="הכנסות פלטפורמה" value={fmt(stats.platformRevenue30dAgorot)} icon={BarChart3} />
          <AdminStatCard
            label="פייאוטים ממתינים"
            value={fmt(stats.pendingPayoutsAgorot)}
            icon={Wallet}
            sub={`${stats.pendingPayoutsCount} תשלומים`}
            alert={stats.pendingPayoutsAgorot > 100_000_00}
          />
          <AdminStatCard
            label="זמן פתרון ממוצע"
            value={stats.avgResolutionHours ? `${Math.round(stats.avgResolutionHours)}ש׳` : "—"}
            icon={Clock}
            sub="סכסוכים"
          />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">ליסטינגים</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="פעילים" value={stats.activeListings} icon={Check} />
          <AdminStatCard label="לבדיקה" value={stats.pendingReviewListings} icon={Hourglass} alert={stats.pendingReviewListings > 10} />
          <AdminStatCard label="סיכון גבוה" value={stats.highRiskListings} icon={AlertTriangle} alert={stats.highRiskListings > 0} />
          <AdminStatCard label="חסומים" value={stats.blockedListings} icon={Ban} alert={stats.blockedListings > 0} />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">משתמשים וסכסוכים</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="מוכרים" value={stats.totalVendors} icon={Users} />
          <AdminStatCard label="חדשים (7 ימים)" value={stats.newVendors7d} icon={UserPlus} />
          <AdminStatCard label="מושעים" value={stats.suspendedVendors} icon={UserX} alert={stats.suspendedVendors > 0} />
          <AdminStatCard label="סכסוכים פתוחים" value={stats.openDisputes} icon={AlertCircle} alert={stats.openDisputes > 0} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/admin/listings?status=PENDING_REVIEW", label: "אשרו ליסטינגים", icon: Ticket },
          { href: "/admin/disputes?status=OPEN", label: "פתרו סכסוכים", icon: Gavel },
          { href: "/admin/payouts?status=PENDING", label: "עבדו פייאוטים", icon: Send },
          { href: "/admin/config", label: "הגדרות פלטפורמה", icon: Settings },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
          >
            <item.icon size={18} color="#E8503A" />
            <span className="text-xs font-bold text-white/70">{item.label}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
