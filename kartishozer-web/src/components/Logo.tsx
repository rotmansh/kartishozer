import Image from "next/image";

// The actual mark the user designed (a circular swap arrow with a ticket
// layered in front), cropped from her reference artwork with a
// transparent background — public/logo-mark.png. Replaces the earlier
// lucide-icon recreation now that we have the real asset.
export function Logo({
  className,
  textClassName = "text-xl",
  markSize = 36,
}: {
  className?: string;
  textClassName?: string;
  markSize?: number;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src="/logo-mark.png"
        alt=""
        width={markSize}
        height={markSize}
        className="flex-shrink-0"
        priority
      />
      <span className={`font-black leading-none whitespace-nowrap ${textClassName}`}>
        <span className="text-brand">כרטיס </span>
        <span className="text-ink-900">חוזר</span>
      </span>
    </div>
  );
}
