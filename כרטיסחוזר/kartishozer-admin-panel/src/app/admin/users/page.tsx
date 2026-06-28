import { requireAdmin } from "@/lib/types/admin";
import { UsersPage }    from "@/components/admin/AdminPages";
export const metadata = { title: "משתמשים | Admin" };
type P = { searchParams: Record<string, string> };
export default async function Page({ searchParams }: P) {
  await requireAdmin();
  return <UsersPage searchParams={searchParams} />;
}
