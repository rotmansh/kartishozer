// ============================================================
// /admin — Overview dashboard
// ============================================================

import type { Metadata }    from "next";
import Link                 from "next/link";
import { requireAdmin }     from "@/lib/types/admin";
import { getPlatformStats } from "@/lib/queries/admin.queries";
import { AdminStatCard }    from "@/components/admin/AdminComponents";

export const metadata: Metadata = { title: "Admin | כרטיס חוזר" };

function fmt(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n / 100);
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const stats = await getPlatformStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-black text-white">סקירה כללית</h1>
        <p className="text-xs text-white/30 mt-1">נתונים בזמן אמת</p>
      </div>

      {/* Alerts row — things that need attention */}
      {(stats.openDisputes > 0 || stats.pendingReviewListings > 0 || stats.highRiskListings > 0) && (
        <div className="rounded-xl border border-[#E8503A]/30 bg-[#E8503A]/10 p-4 space-y-2">
          <p className="text-xs font-black text-[#E8503A] uppercase tracking-wider">
            דורש טיפול
          </p>
          <div className="flex flex-wrap gap-3">
            {stats.openDisputes > 0 && (
              <Link href="/admin/disputes?status=OPEN" className="text-xs font-bold text-white/80 hover:text-white">
                {stats.openDisputes} סכסוכים פתוחים →
              </Link>
            )}
            {stats.pendingReviewListings > 0 && (
              <Link href="/admin/listings?status=PENDING_REVIEW" className="text-xs font-bold text-white/80 hover:text-white">
                {stats.pendingReviewListings} ליסטינגים לבדיקה →
              </Link>
            )}
            {stats.highRiskListings > 0 && (
              <Link href="/admin/listings?riskLevel=HIGH" className="text-xs font-bold text-white/80 hover:text-white">
                {stats.highRiskListings} ליסטינגים בסיכון גבוה →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Revenue */}
      <section>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
          הכנסות — 30 ימים אחרונים
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard
            label="GMV"
            value={fmt(stats.gmv30dAgorot)}
            icon="ti-trending-up"
            sub={`${stats.totalOrders30d} עסקאות`}
          />
          <AdminStatCard
            label="הכנסות פלטפורמה"
            value={fmt(stats.platformRevenue30dAgorot)}
            icon="ti-chart-bar"
          />
          <AdminStatCard
            label="פייאוטים ממתינים"
            value={fmt(stats.pendingPayoutsAgorot)}
            icon="ti-wallet"
            sub={`${stats.pendingPayoutsCount} תשלומים`}
            alert={stats.pendingPayoutsAgorot > 100_000_00}
          />
          <AdminStatCard
            label="זמן פתרון ממוצע"
            value={
              stats.avgResolutionHours
                ? `${Math.round(stats.avgResolutionHours)}ש׳`
                : "—"
            }
            icon="ti-clock"
            sub="סכסוכים"
          />
        </div>
      </section>

      {/* Listings */}
      <section>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
          ליסטינגים
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="פעילים"      value={stats.activeListings}       icon="ti-check" />
          <AdminStatCard label="לבדיקה"      value={stats.pendingReviewListings} icon="ti-hourglass" alert={stats.pendingReviewListings > 10} />
          <AdminStatCard label="סיכון גבוה"  value={stats.highRiskListings}      icon="ti-alert-triangle" alert={stats.highRiskListings > 0} />
          <AdminStatCard label="חסומים"      value={stats.blockedListings}       icon="ti-ban" alert={stats.blockedListings > 0} />
        </div>
      </section>

      {/* Users + Disputes */}
      <section>
        <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">
          משתמשים וסכסוכים
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="מוכרים"         value={stats.totalVendors}    icon="ti-users" />
          <AdminStatCard label="חדשים (7 ימים)" value={stats.newVendors7d}    icon="ti-user-plus" />
          <AdminStatCard label="מושעים"         value={stats.suspendedVendors} icon="ti-user-off" alert={stats.suspendedVendors > 0} />
          <AdminStatCard label="סכסוכים פתוחים" value={stats.openDisputes}    icon="ti-alert-circle" alert={stats.openDisputes > 0} />
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/admin/listings?status=PENDING_REVIEW", label: "אשרו ליסטינגים", icon: "ti-ticket" },
          { href: "/admin/disputes?status=OPEN",           label: "פתרו סכסוכים",   icon: "ti-gavel" },
          { href: "/admin/payouts?status=PENDING",         label: "עבדו פייאוטים",  icon: "ti-send" },
          { href: "/admin/config",                         label: "הגדרות פלטפורמה", icon: "ti-settings" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
          >
            <i className={`ti ${item.icon}`} style={{ fontSize: 18, color: "#E8503A" }} aria-hidden="true" />
            <span className="text-xs font-bold text-white/70">{item.label}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
