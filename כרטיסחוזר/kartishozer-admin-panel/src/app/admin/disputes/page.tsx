// ============================================================
// Admin route pages — thin wrappers around AdminPages.tsx
// ============================================================

// src/app/admin/disputes/page.tsx
export { DisputesPage as default } from "@/components/admin/AdminPages";
export { disputesMeta as metadata } from "@/components/admin/AdminPages";

// ─────────────────────────────────────────────────────────────
// Create the following files with identical pattern:
//
// src/app/admin/payouts/page.tsx:
//   import { PayoutsPage } from "@/components/admin/AdminPages";
//   export default function Page({ searchParams }: any) {
//     return <PayoutsPage searchParams={searchParams} />;
//   }
//
// src/app/admin/users/page.tsx:
//   import { UsersPage } from "@/components/admin/AdminPages";
//   export default function Page({ searchParams }: any) {
//     return <UsersPage searchParams={searchParams} />;
//   }
//
// src/app/admin/config/page.tsx:
//   import { ConfigPage } from "@/components/admin/AdminPages";
//   export default function Page() { return <ConfigPage />; }
//
// src/app/admin/audit/page.tsx:
//   import { AuditPage } from "@/components/admin/AdminPages";
//   export default function Page({ searchParams }: any) {
//     return <AuditPage searchParams={searchParams} />;
//   }
// ─────────────────────────────────────────────────────────────
