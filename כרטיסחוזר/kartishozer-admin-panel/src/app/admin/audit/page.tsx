import { requireAdmin } from "@/lib/types/admin";
import { AuditPage }    from "@/components/admin/AdminPages";
export const metadata = { title: "Audit Log | Admin" };
type P = { searchParams: Record<string, string> };
export default async function Page({ searchParams }: P) {
  await requireAdmin();
  return <AuditPage searchParams={searchParams} />;
}
