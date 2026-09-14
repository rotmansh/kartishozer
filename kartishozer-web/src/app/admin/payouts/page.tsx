import { PayoutsPage } from "@/components/admin/AdminPages";
export const metadata = { title: "פייאוטים | Admin" };
type P = { searchParams: Record<string, string> };
export default async function Page({ searchParams }: P) {
  return <PayoutsPage searchParams={searchParams} />;
}
