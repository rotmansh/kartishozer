// ============================================================
// /admin/listings — Listings review queue
// ============================================================

import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/auth/server";
import { getAdminListings } from "@/lib/admin/queries";
import { AdminPageHeader, AdminFilterTabs, AdminBadge } from "@/components/admin/AdminComponents";
import { ListingReviewButtons } from "@/components/admin/AdminActionButtons";

export const metadata: Metadata = { title: "מודעות | Admin" };

type Props = { searchParams: Record<string, string> };

function fmt(n: number) {
  return `₪${(n / 100).toFixed(0)}`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export default async function AdminListingsPage({ searchParams }: Props) {
  await requireAdminUser();

  const status = searchParams.status;
  const riskLevel = searchParams.riskLevel;
  const page = Number(searchParams.page ?? 1);

  const { items, total } = await getAdminListings({ status, riskLevel, page });

  const RISK_FLAGS: { key: keyof NonNullable<(typeof items)[0]["riskAssessment"]>; label: string; tone?: "positive" }[] = [
    { key: "duplicateBarcode", label: "ברקוד כפול" },
    { key: "duplicatePdfHash", label: "PDF כפול" },
    { key: "suspiciousFaceValue", label: "מחיר פנים חשוד" },
    { key: "highRiskAccount", label: "חשבון בסיכון" },
    { key: "bulkListingFlag", label: "מכירה מרוכזת" },
    { key: "repeatEventFlag", label: "מודעות חוזרות לאירוע" },
    { key: "highQuantityFlag", label: "כמות גבוהה" },
    { key: "highValueTicketFlag", label: "כרטיס יקר" },
    { key: "pastDisputeFlag", label: "היסטוריית מחלוקות" },
    { key: "trustedSellerCredit", label: "מוכר ותיק ואמין", tone: "positive" },
  ];

  return (
    <div>
      <AdminPageHeader title="מודעות" count={total}>
        <span className="text-xs text-white/50">ממוינים לפי ציון סיכון</span>
      </AdminPageHeader>

      <AdminFilterTabs
        tabs={[
          { key: undefined, label: "הכל" },
          { key: "PENDING_REVIEW", label: "לבדיקה" },
          { key: "ACTIVE", label: "פעילים" },
          { key: "REJECTED", label: "נדחו" },
          { key: "SUSPENDED", label: "מושעים" },
        ]}
        active={status}
        baseHref="/admin/listings"
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {[
          { key: undefined, label: "כל הרמות" },
          { key: "HIGH", label: "סיכון גבוה" },
          { key: "MEDIUM", label: "סיכון בינוני" },
          { key: "BLOCKED", label: "חסומים" },
        ].map((tab) => (
          <a
            key={String(tab.key)}
            href={
              tab.key
                ? `/admin/listings${status ? `?status=${status}&` : "?"}riskLevel=${tab.key}`
                : `/admin/listings${status ? `?status=${status}` : ""}`
            }
            className={[
              "rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer",
              riskLevel === tab.key || (!riskLevel && !tab.key)
                ? "bg-[#E8503A]/20 text-[#E8503A]"
                : "text-white/50 hover:text-white/80",
            ].join(" ")}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-white/10 py-16 text-center">
          <p className="text-white/50 text-sm">אין מודעות בקטגוריה זו</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[820px] text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {["אירוע", "מוכר", "מחיר / פנים", "סיכון", "דגלים", "סטטוס", "פעולות"].map((h) => (
                  <th key={h} className="py-3 px-4 font-bold text-white/50 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((listing) => {
                const flags = listing.riskAssessment
                  ? RISK_FLAGS.filter((f) => Boolean(listing.riskAssessment?.[f.key]))
                  : [];

                return (
                  <tr key={listing.id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white/80 truncate max-w-[160px]">{listing.event.nameHe}</p>
                      <p className="text-white/50 mt-0.5">
                        {fmtDate(listing.event.startsAt)} · {listing.event.city}
                      </p>
                      <p className="text-white/50 mt-0.5 font-mono text-[10px]">{listing.id.slice(-8)}</p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-white/70 font-semibold">{listing.vendor.displayName}</p>
                      {listing.vendor.isVerified && (
                        <span className="text-[#00B4A6] text-[10px] font-bold">מאומת ✓</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-black text-white/80">{fmt(listing.priceAgorot)}</p>
                      <p className="text-white/50">פנים: {fmt(listing.faceValueAgorot)}</p>
                      <p className={`font-bold text-[11px] ${listing.markupPercent > 0 ? "text-[#E8503A]" : "text-white/50"}`}>
                        {listing.markupPercent > 0 ? `+${listing.markupPercent}%` : `${listing.markupPercent}%`}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <AdminBadge value={listing.riskLevel} />
                        <span className="font-black text-white/50 text-[11px]">{listing.riskScore}</span>
                      </div>
                      {listing.riskAssessment?.decision && (
                        <p className="text-white/50 text-[10px] mt-1">{listing.riskAssessment.decision}</p>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-[140px]">
                      <div className="flex flex-wrap gap-1">
                        {flags.map((f) => (
                          <span
                            key={f.key as string}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              f.tone === "positive" ? "bg-[#00B4A6]/20 text-[#00B4A6]" : "bg-[#E8503A]/20 text-[#E8503A]"
                            }`}
                          >
                            {f.label}
                          </span>
                        ))}
                        {flags.length === 0 && <span className="text-white/50 text-[10px]">ללא</span>}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <AdminBadge value={listing.status} />
                    </td>

                    <td className="py-3 px-4">
                      <ListingReviewButtons listingId={listing.id} currentStatus={listing.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
