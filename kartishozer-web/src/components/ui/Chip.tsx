import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Chip({
  active,
  onClick,
  children,
  icon,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 h-10 text-sm font-bold whitespace-nowrap transition-colors",
        active ? "bg-ink-900 text-white" : "bg-white text-ink-700 border border-ink-900/10"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
