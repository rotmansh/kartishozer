import { cn } from "@/lib/cn";

const TONES = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-50 text-accent-600",
  neutral: "bg-ink-100 text-ink-700",
  warn: "bg-amber-100 text-amber-700",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
