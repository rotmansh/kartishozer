import type { Seller } from "@/lib/types";

export const SELLERS: Seller[] = [
  { id: "s1", displayName: "נועה כהן", isVerified: true, verificationLevel: "FULL", salesCount: 34, memberSince: "2023-02-11" },
  { id: "s2", displayName: "איתי לוי", isVerified: true, verificationLevel: "BASIC", salesCount: 8, memberSince: "2024-06-01" },
  { id: "s3", displayName: "שירה מזרחי", isVerified: false, verificationLevel: "NONE", salesCount: 1, memberSince: "2025-11-20" },
  { id: "s4", displayName: "דניאל אברהם", isVerified: true, verificationLevel: "FULL", salesCount: 61, memberSince: "2022-09-04" },
  { id: "s5", displayName: "מיכל בר", isVerified: true, verificationLevel: "BASIC", salesCount: 15, memberSince: "2024-01-18" },
  { id: "s6", displayName: "יובל שגיא", isVerified: false, verificationLevel: "NONE", salesCount: 0, memberSince: "2026-08-02" },
];

export function getSeller(id: string): Seller {
  const s = SELLERS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown seller: ${id}`);
  return s;
}
