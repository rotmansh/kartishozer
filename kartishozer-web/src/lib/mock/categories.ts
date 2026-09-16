import type { Category } from "@/lib/types";

export const CATEGORIES: Category[] = [
  { slug: "concerts", labelHe: "הופעות", icon: "Music", emoji: "🎤", gradient: ["#E8503A", "#F5876F"] },
  { slug: "standup", labelHe: "סטנדאפ", icon: "Mic2", emoji: "🎙️", gradient: ["#7C4DFF", "#B39DFF"] },
  { slug: "theater", labelHe: "הצגות", icon: "Drama", emoji: "🎭", gradient: ["#00B4A6", "#5FE0D4"] },
  { slug: "sports", labelHe: "ספורט", icon: "Trophy", emoji: "🏀", gradient: ["#378ADD", "#7FB7F0"] },
  { slug: "attractions", labelHe: "אטרקציות", icon: "FerrisWheel", emoji: "🎡", gradient: ["#EF9F27", "#FFC96B"] },
  { slug: "vouchers", labelHe: "שוברים", icon: "Gift", emoji: "🎁", gradient: ["#2E9E6B", "#8FE0B0"] },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
