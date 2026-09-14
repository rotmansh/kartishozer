import { UsersPage } from "@/components/admin/AdminPages";
export const metadata = { title: "משתמשים | Admin" };
type P = { searchParams: Record<string, string> };
export default async function Page({ searchParams }: P) {
  return <UsersPage searchParams={searchParams} />;
}
