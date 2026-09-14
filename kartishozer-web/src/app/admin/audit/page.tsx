import { AuditPage } from "@/components/admin/AdminPages";
export const metadata = { title: "Audit Log | Admin" };
type P = { searchParams: Record<string, string> };
export default async function Page({ searchParams }: P) {
  return <AuditPage searchParams={searchParams} />;
}
