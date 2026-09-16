import { RefreshCw, Ticket } from "lucide-react";

// Recreates the mark the user designed (a circular "swap" arrow with a
// ticket layered in front) using two existing lucide icons instead of
// hand-drawn SVG paths — sturdier than freehand paths, and RefreshCw's
// two-arrow-around-a-circle shape already matches the reference closely.
function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-block flex-shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      <RefreshCw size={size} strokeWidth={2.5} className="absolute inset-0 text-brand-300" />
      <Ticket
        size={size * 0.56}
        strokeWidth={0}
        fill="currentColor"
        className="absolute text-brand drop-shadow-sm"
        style={{ top: "24%", left: "24%", transform: "rotate(-18deg)" }}
      />
    </span>
  );
}

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
      <LogoMark size={markSize} />
      <span className={`font-black leading-none whitespace-nowrap ${textClassName}`}>
        <span className="text-brand">כרטיס </span>
        <span className="text-ink-900">חוזר</span>
      </span>
    </div>
  );
}
