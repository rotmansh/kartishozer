import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-3">
      <div className="h-16 w-16 rounded-full bg-ink-100 flex items-center justify-center text-ink-500">
        {icon}
      </div>
      <p className="font-black text-ink-900">{title}</p>
      {subtitle && <p className="text-sm text-ink-500 max-w-[26ch]">{subtitle}</p>}
      {action}
    </div>
  );
}
