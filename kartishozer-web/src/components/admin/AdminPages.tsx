// ============================================================
// Admin sub-pages: disputes, payouts, users, config, audit
// ============================================================

import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/auth/server";
import {
  getAdminDisputes,
  getAdminPayouts,
  getAdminVendors,
  getPlatformConfig,
  getAuditLog,
} from "@/lib/admin/queries";
import { AdminPageHeader, AdminFilterTabs, AdminBadge } from "@/components/admin/AdminComponents";
import {
  DisputeResolvePanel,
  PayoutActionButtons,
  VendorActionButtons,
  ConfigEditor,
} from "@/components/admin/AdminActionButtons";

export const disputesMeta: Metadata = { title: "סכסוכים | Admin" };

function fmt(n: number) {
  return `₪${(n / 100).toFixed(0)}`;
}
function fmtDt(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d));
}

// ── DisputesPage ──────────────────────────────────────────────

export async function DisputesPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  await requireAdminUser();
  const status = searchParams.status;
  const page = Number(searchParams.page ?? 1);
  const { items, total } = await getAdminDisputes({ status, page });

  return (
    <div>
      <AdminPageHeader title="סכסוכים" count={total} />
      <AdminFilterTabs
        tabs={[
          { key: undefined, label: "הכל" },
          { key: "OPEN", label: "פתוחים" },
          { key: "UNDER_REVIEW", label: "בבדיקה" },
          { key: "RESOLVED_BUYER", label: "הוחזרו לקונה" },
          { key: "RESOLVED_SELLER", label: "שוחררו למוכר" },
        ]}
        active={status}
        baseHref="/admin/disputes"
      />

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 py-12 text-center">
            <p className="text-white/30 text-sm">אין סכסוכים 🎉</p>
          </div>
        ) : (
          items.map((dispute) => (
            <div key={dispute.id} className="rounded-xl border border-white/10 bg-white/3 p-5">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AdminBadge value={dispute.status} />
                    <span className="text-xs text-white/30 font-mono">{dispute.id.slice(-8)}</span>
                    <span className="text-xs text-white/30">{fmtDt(dispute.createdAt)}</span>
                  </div>
                  <p className="text-sm font-black text-white/80">{dispute.event.nameHe}</p>
                  <p className="text-xs text-white/40">
                    קונה: {dispute.order.buyerName} ({dispute.order.buyerEmail})
                    {" · "} מוכר: {dispute.vendor.displayName}
                    {" · "} הזמנה: {fmt(dispute.order.totalAgorot)}
                  </p>
                  <p className="text-xs text-white/50 mt-2 rounded bg-white/5 px-3 py-2">{dispute.reason}</p>
                  {dispute.sellerResponse && (
                    <div className="mt-2 rounded bg-white/5 px-3 py-2">
                      <p className="text-[10px] font-black text-white/30 mb-1">
                        תגובת מוכר/ת · {fmtDt(dispute.sellerRespondedAt)}
                      </p>
                      <p className="text-xs text-white/50">{dispute.sellerResponse}</p>
                    </div>
                  )}
                  {dispute.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {dispute.evidence.map((ev) => (
                        <a
                          key={ev.id}
                          href={`/api/disputes/${dispute.id}/evidence/${ev.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-brand-400 rounded bg-white/5 px-2 py-1"
                        >
                          אסמכתא · {ev.uploaderRole === "BUYER" ? "קונה" : ev.uploaderRole === "SELLER" ? "מוכר" : "צוות"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {(dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW") && (
                  <div className="w-full sm:w-64 sm:flex-shrink-0">
                    <DisputeResolvePanel disputeId={dispute.id} />
                  </div>
                )}

                {dispute.resolution && (
                  <div className="w-full sm:w-64 sm:flex-shrink-0 rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[11px] font-black text-white/40 mb-1">פתרון</p>
                    <p className="text-xs text-white/60">{dispute.resolution}</p>
                    <p className="text-[10px] text-white/25 mt-1">{fmtDt(dispute.resolvedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── PayoutsPage ───────────────────────────────────────────────

export async function PayoutsPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  await requireAdminUser();
  const status = searchParams.status;
  const { items, total } = await getAdminPayouts({ status });

  return (
    <div>
      <AdminPageHeader title="תשלומים למוכרים" count={total} />
      <AdminFilterTabs
        tabs={[
          { key: undefined, label: "הכל" },
          { key: "PENDING", label: "ממתינים" },
          { key: "PROCESSING", label: "בעיבוד" },
          { key: "ON_HOLD", label: "עצורים" },
          { key: "PAID", label: "שולמו" },
          { key: "FAILED", label: "נכשלו" },
        ]}
        active={status}
        baseHref="/admin/payouts"
      />

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["מוכר", "אירוע", "סכום", "טריגר", "מתוזמן", "סטטוס", "פעולות"].map((h) => (
                <th key={h} className="py-3 px-4 font-bold text-white/30 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((payout) => (
              <tr key={payout.id} className="hover:bg-white/3">
                <td className="py-3 px-4">
                  <p className="font-bold text-white/80">{payout.vendor.displayName}</p>
                  {!payout.vendor.bankAccountRef && (
                    <span className="text-[10px] text-[#E8503A] font-bold">חסר בנק</span>
                  )}
                </td>
                <td className="py-3 px-4 text-white/50 max-w-[120px] truncate">{payout.order.event.nameHe}</td>
                <td className="py-3 px-4 font-black text-white/80">{fmt(payout.amountAgorot)}</td>
                <td className="py-3 px-4 text-white/40">{payout.trigger}</td>
                <td className="py-3 px-4 text-white/40">{fmtDt(payout.scheduledFor)}</td>
                <td className="py-3 px-4">
                  <AdminBadge value={payout.status} />
                </td>
                <td className="py-3 px-4">
                  {["PENDING", "ON_HOLD"].includes(payout.status) && (
                    <PayoutActionButtons payoutId={payout.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── UsersPage ─────────────────────────────────────────────────

export async function UsersPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  await requireAdminUser();
  const status = searchParams.status;
  const { items, total } = await getAdminVendors({ status });

  return (
    <div>
      <AdminPageHeader title="מוכרים" count={total} />
      <AdminFilterTabs
        tabs={[
          { key: undefined, label: "הכל" },
          { key: "ACTIVE", label: "פעילים" },
          { key: "SUSPENDED", label: "מושעים" },
        ]}
        active={status}
        baseHref="/admin/users"
      />

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full min-w-[720px] text-right text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["מוכר", "אימות", "מודעות", "הזמנות", "נרשם", "סטטוס", "פעולות"].map((h) => (
                <th key={h} className="py-3 px-4 font-bold text-white/30 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-white/3">
                <td className="py-3 px-4">
                  <p className="font-bold text-white/80">{vendor.displayName}</p>
                  <p className="text-white/25 font-mono text-[10px]">{vendor.id.slice(-8)}</p>
                </td>
                <td className="py-3 px-4">
                  <AdminBadge value={vendor.verificationLevel ?? "NONE"} />
                </td>
                <td className="py-3 px-4 text-white/50">{vendor.listingCount}</td>
                <td className="py-3 px-4 text-white/50">{vendor.orderCount}</td>
                <td className="py-3 px-4 text-white/30">{fmtDt(vendor.createdAt).split(",")[0]}</td>
                <td className="py-3 px-4">
                  <AdminBadge value={vendor.status} />
                </td>
                <td className="py-3 px-4">
                  <VendorActionButtons
                    vendorId={vendor.id}
                    currentStatus={vendor.status}
                    isVerified={vendor.isVerified}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ConfigPage ────────────────────────────────────────────────

export async function ConfigPage() {
  await requireAdminUser();
  const config = await getPlatformConfig();

  return (
    <div>
      <AdminPageHeader title="הגדרות פלטפורמה" />
      <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
        {config.map((entry) => (
          <div key={entry.key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-6 px-5 py-4 hover:bg-white/3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white/80">{entry.label}</p>
              <p className="text-xs text-white/30 mt-0.5">{entry.description}</p>
              {entry.updatedAt.getTime() > 0 && (
                <p className="text-[10px] text-white/20 mt-1">עודכן: {fmtDt(entry.updatedAt)}</p>
              )}
            </div>
            <div className="sm:flex-shrink-0">
              <ConfigEditor entry={entry} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-[#E8503A]/20 bg-[#E8503A]/5 p-4">
        <p className="text-xs font-bold text-[#E8503A] mb-1">⚠️ שינויים בהגדרות פועלים מיידית</p>
        <p className="text-xs text-white/40">
          שינוי עמלות ישפיע על כל מודעות חדשות — לא ישפיע על עסקאות קיימות. שינוי סף סיכון ישפיע
          על מודעות חדשות שעוברות בדיקת סיכון.
        </p>
      </div>
    </div>
  );
}

// ── AuditPage ─────────────────────────────────────────────────

export async function AuditPage({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  await requireAdminUser();
  const { items, total } = await getAuditLog({
    action: searchParams.action,
    resourceType: searchParams.type,
    resourceId: searchParams.id,
    page: Number(searchParams.page ?? 1),
  });

  return (
    <div>
      <AdminPageHeader title="Audit Log" count={total} />

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full min-w-[560px] text-right text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {["תאריך", "פעולה", "סוג", "ID", "משתמש"].map((h) => (
                <th key={h} className="py-3 px-4 font-bold text-white/30 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((log) => (
              <tr key={log.id} className="hover:bg-white/3">
                <td className="py-2.5 px-4 text-white/30 font-mono text-[11px]">{fmtDt(log.createdAt)}</td>
                <td className="py-2.5 px-4">
                  <span className="font-bold text-white/70">{log.action}</span>
                </td>
                <td className="py-2.5 px-4 text-white/40">{log.resourceType}</td>
                <td className="py-2.5 px-4 text-white/25 font-mono">{log.resourceId.slice(-10)}</td>
                <td className="py-2.5 px-4 text-white/30 font-mono text-[10px]">
                  {log.userId === "system" ? "SYSTEM" : log.userId.slice(-8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
