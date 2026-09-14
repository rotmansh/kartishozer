import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 mb-3">
      <h2 className="text-base font-black text-ink-900">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs font-bold text-brand"
        >
          הצג הכל
          <ChevronLeft size={14} />
        </Link>
      )}
    </div>
  );
}
