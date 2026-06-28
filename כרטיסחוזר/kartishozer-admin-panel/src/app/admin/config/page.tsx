import { requireAdmin } from "@/lib/types/admin";
import { ConfigPage }   from "@/components/admin/AdminPages";
export const metadata = { title: "הגדרות פלטפורמה | Admin" };
export default async function Page() {
  await requireAdmin();
  return <ConfigPage />;
}
