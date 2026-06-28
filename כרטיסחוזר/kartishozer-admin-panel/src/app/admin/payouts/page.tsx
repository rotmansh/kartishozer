import { requireAdmin } from "@/lib/types/admin";
import { PayoutsPage }  from "@/components/admin/AdminPages";
export const metadata = { title: "פייאוטים | Admin" };
type P = { searchParams: Record<string, string> };
export default async function Page({ searchParams }: P) {
  await requireAdmin();
  return <PayoutsPage searchParams={searchParams} />;
}
