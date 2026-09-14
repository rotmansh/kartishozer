import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      className={cn(
        "tap inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none",
        size === "lg" ? "h-14 px-6 text-[15px]" : "h-11 px-4 text-sm",
        variant === "primary" && "bg-brand text-white shadow-pop active:bg-brand-600",
        variant === "secondary" && "bg-ink-900 text-white",
        variant === "outline" && "border-2 border-ink-900/10 text-ink-900 bg-white",
        variant === "ghost" && "text-ink-900 bg-ink-100",
        variant === "danger" && "bg-brand-50 text-brand-600",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
