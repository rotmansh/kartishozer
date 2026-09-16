import type { CategorySlug } from "@/lib/types";

// Generic per-category decorative art — a stopgap for the fact that a
// listing's actual event/performer has no real photo behind it yet (that
// needs an admin-curated, auto-matched image library, which is a bigger
// piece of work). This is just flat vector shapes layered over the
// existing category gradient, not a real photo, but it reads as
// "designed" rather than an empty color block. Swap out per-category
// once real cover images exist.
const VIEWBOX = "0 0 300 200";

function ConcertArt() {
  return (
    <>
      <polygon points="55,0 95,0 140,200 10,200" fill="white" fillOpacity="0.12" />
      <polygon points="175,0 215,0 270,200 130,200" fill="white" fillOpacity="0.1" />
      <path
        d="M0,192 Q15,178 30,192 T60,192 T90,192 T120,192 T150,192 T180,192 T210,192 T240,192 T270,192 T300,192 V200 H0 Z"
        fill="black"
        fillOpacity="0.16"
      />
      <g transform="translate(150,108)">
        <circle cy="-40" r="13" fill="white" fillOpacity="0.85" />
        <rect x="-4" y="-28" width="8" height="42" rx="4" fill="white" fillOpacity="0.85" />
        <line y1="14" y2="46" stroke="white" strokeOpacity="0.55" strokeWidth="3" />
      </g>
    </>
  );
}

function StandupArt() {
  return (
    <>
      <circle cx="150" cy="72" r="58" fill="white" fillOpacity="0.12" />
      <circle cx="150" cy="72" r="30" fill="white" fillOpacity="0.1" />
      <g transform="translate(150,155)">
        <rect x="-3" y="-72" width="6" height="72" fill="white" fillOpacity="0.7" />
        <circle cy="-80" r="10" fill="white" fillOpacity="0.85" />
        <polygon points="-26,0 26,0 16,11 -16,11" fill="white" fillOpacity="0.5" />
      </g>
    </>
  );
}

function TheaterArt() {
  return (
    <>
      <path d="M0,0 Q22,100 0,200 H45 Q28,100 45,0 Z" fill="black" fillOpacity="0.16" />
      <path d="M300,0 Q278,100 300,200 H255 Q272,100 255,0 Z" fill="black" fillOpacity="0.16" />
      <circle cx="150" cy="100" r="48" fill="white" fillOpacity="0.1" />
      <circle cx="130" cy="115" r="24" fill="white" fillOpacity="0.75" />
      <circle cx="178" cy="122" r="24" fill="white" fillOpacity="0.5" />
    </>
  );
}

function SportsArt() {
  return (
    <>
      <path
        d="M0,155 L30,125 L60,155 L90,125 L120,155 L150,125 L180,155 L210,125 L240,155 L270,125 L300,155 V200 H0 Z"
        fill="black"
        fillOpacity="0.15"
      />
      <circle cx="150" cy="88" r="24" fill="white" fillOpacity="0.85" />
      <g stroke="black" strokeOpacity="0.2" strokeWidth="2" fill="none">
        <path d="M150,64 V112" />
        <path d="M126,88 H174" />
        <path d="M134,72 Q150,86 166,72" />
        <path d="M134,104 Q150,90 166,104" />
      </g>
    </>
  );
}

function AttractionsArt() {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <g transform="translate(150,120)">
      <circle r="68" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="4" />
      {spokes.map((a, i) => (
        <line
          key={i}
          x1={0}
          y1={0}
          x2={Math.cos(a) * 68}
          y2={Math.sin(a) * 68}
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="2.5"
        />
      ))}
      {spokes.map((a, i) => (
        <circle key={i} cx={Math.cos(a) * 68} cy={Math.sin(a) * 68} r="7" fill="white" fillOpacity="0.75" />
      ))}
      <circle r="8" fill="white" fillOpacity="0.9" />
    </g>
  );
}

function VouchersArt() {
  return (
    <g transform="translate(150,105)">
      <rect x="-72" y="-45" width="144" height="90" rx="14" fill="white" fillOpacity="0.14" />
      <rect x="-72" y="-45" width="144" height="90" rx="14" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="3" />
      <line x1="-18" y1="-45" x2="-18" y2="45" stroke="white" strokeOpacity="0.4" strokeWidth="3" strokeDasharray="6 8" />
      <circle cx="-18" cy="-45" r="8" fill="black" fillOpacity="0.18" />
      <circle cx="-18" cy="45" r="8" fill="black" fillOpacity="0.18" />
      <circle cx="18" cy="0" r="22" fill="white" fillOpacity="0.85" />
      <g stroke="none" fill="black" fillOpacity="0.28">
        <polygon points="18,-11 22,-2 31,-2 24,4 26,13 18,7 10,13 12,4 5,-2 14,-2" />
      </g>
    </g>
  );
}

const ART: Record<CategorySlug, () => React.JSX.Element> = {
  concerts: ConcertArt,
  standup: StandupArt,
  theater: TheaterArt,
  sports: SportsArt,
  attractions: AttractionsArt,
  vouchers: VouchersArt,
};

export function CategoryArt({ category, className }: { category: CategorySlug; className?: string }) {
  const Art = ART[category];
  return (
    <svg
      viewBox={VIEWBOX}
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    >
      <Art />
    </svg>
  );
}
