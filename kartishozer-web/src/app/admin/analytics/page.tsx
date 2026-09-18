// ============================================================
// /admin/analytics — marketplace rollups (P3)
// Deliberately plain stat cards, no charts: this closes the "we collect
// data but can't see it" gap without becoming the full dashboard that
// was explicitly deferred earlier. See getMarketplaceAnalytics's own
// comment for exactly which numbers only cover activity from mid-Sep
// 2026 forward vs. full history.
// ============================================================

import type { Metadata } from "next";
import {
  Activity,
  UserPlus,
  Ticket,
  Store,
  TrendingUp,
  Users,
  Eye,
  ShoppingCart,
  Repeat,
  Gavel,
  Undo2,
  Compass,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth/server";
import { getMarketplaceAnalytics } from "@/lib/admin/queries";
import { AdminStatCard } from "@/components/admin/AdminComponents";

export const metadata: Metadata = { title: "אנליטיקס | Admin" };

function fmtAgorot(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n / 100);
}

function fmtPercent(n: number | null) {
  return n === null ? "—" : `${n.toFixed(1)}%`;
}

export default async function AdminAnalyticsPage() {
  await requireAdminUser();
  const stats = await getMarketplaceAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-black text-white">אנליטיקס</h1>
        <p className="text-xs text-white/50 mt-1">
          פעילות ומשפך — נאסף החל מאמצע ספטמבר 2026, אין נתונים לפני כן
        </p>
      </div>

      <section>
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">פעילות</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="פעילים (24 שעות)" value={stats.dau} icon={Activity} />
          <AdminStatCard label="פעילים (7 ימים)" value={stats.wau} icon={Activity} />
          <AdminStatCard label="פעילים (30 יום)" value={stats.mau} icon={Activity} />
          <AdminStatCard label="הרשמות חדשות (7 ימים)" value={stats.newSignups7d} icon={UserPlus} />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">היצע</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="מודעות חדשות (7 ימים)" value={stats.newListings7d} icon={Ticket} />
          <AdminStatCard label="מוכרים ייחודיים (סה״כ)" value={stats.uniqueSellersAllTime} icon={Store} />
          <AdminStatCard label="Sell-through" value={fmtPercent(stats.sellThroughPercent)} icon={TrendingUp} sub="נמכר מתוך פעיל+נמכר" />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">ביקוש והמרה — 30 יום</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="קונים ייחודיים (סה״כ)" value={stats.uniqueBuyersAllTime} icon={Users} />
          <AdminStatCard label="שווי הזמנה ממוצע" value={stats.aov30dAgorot !== null ? fmtAgorot(stats.aov30dAgorot) : "—"} icon={TrendingUp} />
          <AdminStatCard label="צפייה ← רכישה" value={fmtPercent(stats.listingViewsToPurchasePercent)} icon={Eye} />
          <AdminStatCard label="תחילת קנייה ← רכישה" value={fmtPercent(stats.checkoutToPurchasePercent)} icon={ShoppingCart} />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">נאמנות (סה״כ)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="קונים חוזרים" value={stats.repeatBuyers} icon={Repeat} />
          <AdminStatCard label="מוכרים חוזרים" value={stats.repeatSellers} icon={Repeat} />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">אמון ובטיחות — 30 יום</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AdminStatCard label="שיעור מחלוקות" value={fmtPercent(stats.disputeRate30dPercent)} icon={Gavel} alert={(stats.disputeRate30dPercent ?? 0) > 5} />
          <AdminStatCard label="שיעור החזרים" value={fmtPercent(stats.refundRate30dPercent)} icon={Undo2} alert={(stats.refundRate30dPercent ?? 0) > 5} />
        </div>
      </section>

      <section>
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Compass size={12} />
          מקורות הרשמה מובילים
        </p>
        {stats.topAcquisitionSources.length === 0 ? (
          <p className="text-xs text-white/50">אין עדיין נתוני ייחוס</p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/5">
            {stats.topAcquisitionSources.map((row) => (
              <div key={row.source} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-semibold text-white/70">{row.source}</span>
                <span className="text-xs font-black text-white">{row.signups}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
