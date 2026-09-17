import type { CategorySlug } from "@/lib/types";

// ============================================================
// Layered cover-art content: backgrounds, primary/secondary
// elements, shared layouts and color families that
// CategoryArt.tsx composes per event. See rng.ts for how a pool
// gets sliced by version and indexed by event.
//
// Append-only: to add variety later, push new entries onto the
// end of a pool with a bumped `addedInVersion` (and add the
// matching row to POOL_VERSIONS in rng.ts) — never edit, reorder
// or remove an existing entry.
// ============================================================

export type PrimaryKind = "round" | "tall" | "wide";

type Renderer = (accent: string) => JSX.Element;

export type BgVariant = { id: string; addedInVersion: number; render: Renderer };
export type PrimaryVariant = { id: string; addedInVersion: number; kind: PrimaryKind; render: Renderer };
export type SecondaryVariant = { id: string; addedInVersion: number; render: Renderer };
export type ColorFamily = { id: string; addedInVersion: number; accent: string };

export type Layout = {
  id: string;
  addedInVersion: number;
  compatibleKinds: PrimaryKind[];
  primaryTransform: string;
  secondaryTransform: string;
};

// Shared across every category — a spatial arrangement is category-agnostic,
// so this set isn't duplicated six times over.
export const LAYOUTS: Layout[] = [
  {
    id: "centered",
    addedInVersion: 1,
    compatibleKinds: ["round", "tall", "wide"],
    primaryTransform: "translate(150,105)",
    secondaryTransform: "translate(150,50)",
  },
  {
    id: "diagonal",
    addedInVersion: 1,
    compatibleKinds: ["tall", "wide"],
    primaryTransform: "translate(112,98) rotate(-6)",
    secondaryTransform: "translate(215,135)",
  },
  {
    id: "corner",
    addedInVersion: 1,
    compatibleKinds: ["round", "wide"],
    primaryTransform: "translate(208,128) scale(0.92)",
    secondaryTransform: "translate(68,62)",
  },
];

type CategoryPools = {
  backgrounds: BgVariant[];
  primary: PrimaryVariant[];
  secondary: SecondaryVariant[];
  colors: ColorFamily[];
};

// ── הופעות ───────────────────────────────────────────────────
const concerts: CategoryPools = {
  backgrounds: [
    {
      id: "beams",
      addedInVersion: 1,
      render: (a) => (
        <>
          <polygon points="55,0 95,0 140,200 10,200" fill={a} fillOpacity="0.12" />
          <polygon points="175,0 215,0 270,200 130,200" fill={a} fillOpacity="0.1" />
          <path
            d="M0,192 Q15,178 30,192 T60,192 T90,192 T120,192 T150,192 T180,192 T210,192 T240,192 T270,192 T300,192 V200 H0 Z"
            fill="black"
            fillOpacity="0.16"
          />
        </>
      ),
    },
    {
      id: "haze-circles",
      addedInVersion: 1,
      render: (a) => (
        <>
          <circle cx="90" cy="60" r="46" fill={a} fillOpacity="0.1" />
          <circle cx="210" cy="70" r="58" fill={a} fillOpacity="0.08" />
          <circle cx="150" cy="150" r="70" fill="black" fillOpacity="0.12" />
        </>
      ),
    },
  ],
  primary: [
    {
      id: "mic-stand",
      addedInVersion: 1,
      kind: "tall",
      render: (a) => (
        <>
          <circle cy="-40" r="13" fill={a} fillOpacity="0.85" />
          <rect x="-4" y="-28" width="8" height="42" rx="4" fill={a} fillOpacity="0.85" />
          <line y1="14" y2="46" stroke={a} strokeOpacity="0.55" strokeWidth="3" />
        </>
      ),
    },
    {
      id: "crowd-hands",
      addedInVersion: 1,
      kind: "wide",
      render: (a) => (
        <>
          {[-48, -22, 4, 30, 54].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1={24}
              x2={x + (i % 2 === 0 ? -6 : 6)}
              y2={-30 - (i % 3) * 6}
              stroke={a}
              strokeOpacity="0.55"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
        </>
      ),
    },
  ],
  secondary: [
    {
      id: "sparkles",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[
            [-70, 40],
            [-40, 15],
            [60, 30],
            [80, 55],
            [-90, 75],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill={a} fillOpacity="0.6" />
          ))}
        </>
      ),
    },
    {
      id: "soundwave",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[0, 10, 20, 30, 40, 50].map((x, i) => (
            <rect
              key={i}
              x={x - 25}
              y={-(8 + ((i * 7) % 20))}
              width="5"
              height={16 + ((i * 7) % 20)}
              rx="2.5"
              fill={a}
              fillOpacity="0.45"
            />
          ))}
        </>
      ),
    },
  ],
  colors: [
    { id: "warm-classic", addedInVersion: 1, accent: "#FFFFFF" },
    { id: "warm-cream", addedInVersion: 1, accent: "#FFE9DE" },
    { id: "warm-gold", addedInVersion: 1, accent: "#FFD9A6" },
  ],
};

// ── סטנדאפ ───────────────────────────────────────────────────
const standup: CategoryPools = {
  backgrounds: [
    {
      id: "club-glow",
      addedInVersion: 1,
      render: (a) => (
        <>
          <circle cx="150" cy="72" r="58" fill={a} fillOpacity="0.12" />
          <circle cx="150" cy="72" r="30" fill={a} fillOpacity="0.1" />
        </>
      ),
    },
    {
      id: "brick-wash",
      addedInVersion: 1,
      render: (a) => (
        <>
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 6 }, (_, col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 24 - (row % 2 === 0 ? 0 : 12) - 10}
                y={row * 14}
                width="20"
                height="10"
                fill="black"
                fillOpacity="0.06"
              />
            ))
          )}
          <circle cx="150" cy="90" r="55" fill={a} fillOpacity="0.1" />
        </>
      ),
    },
  ],
  primary: [
    {
      id: "mic-stand",
      addedInVersion: 1,
      kind: "tall",
      render: (a) => (
        <>
          <rect x="-3" y="-72" width="6" height="72" fill={a} fillOpacity="0.7" />
          <circle cy="-80" r="10" fill={a} fillOpacity="0.85" />
          <polygon points="-26,0 26,0 16,11 -16,11" fill={a} fillOpacity="0.5" />
        </>
      ),
    },
    {
      id: "stool",
      addedInVersion: 1,
      kind: "round",
      render: (a) => (
        <>
          <ellipse cy="-20" rx="26" ry="9" fill={a} fillOpacity="0.75" />
          <line x1="-18" y1="-16" x2="-24" y2="30" stroke={a} strokeOpacity="0.5" strokeWidth="3" />
          <line x1="0" y1="-14" x2="0" y2="32" stroke={a} strokeOpacity="0.5" strokeWidth="3" />
          <line x1="18" y1="-16" x2="24" y2="30" stroke={a} strokeOpacity="0.5" strokeWidth="3" />
        </>
      ),
    },
  ],
  secondary: [
    { id: "spot-circle", addedInVersion: 1, render: (a) => <circle r="34" fill={a} fillOpacity="0.1" /> },
    {
      id: "curtain-fold",
      addedInVersion: 1,
      render: (a) => (
        <>
          <path d="M-10,-30 Q0,-10 -10,10" stroke={a} strokeOpacity="0.4" strokeWidth="3" fill="none" />
          <path d="M14,-34 Q24,-12 14,14" stroke={a} strokeOpacity="0.35" strokeWidth="3" fill="none" />
        </>
      ),
    },
  ],
  colors: [
    { id: "purple-classic", addedInVersion: 1, accent: "#FFFFFF" },
    { id: "purple-cream", addedInVersion: 1, accent: "#F1E9FF" },
    { id: "purple-pink", addedInVersion: 1, accent: "#FFE0F3" },
  ],
};

// ── הצגות ────────────────────────────────────────────────────
const theater: CategoryPools = {
  backgrounds: [
    {
      id: "curtains",
      addedInVersion: 1,
      render: () => (
        <>
          <path d="M0,0 Q22,100 0,200 H45 Q28,100 45,0 Z" fill="black" fillOpacity="0.16" />
          <path d="M300,0 Q278,100 300,200 H255 Q272,100 255,0 Z" fill="black" fillOpacity="0.16" />
        </>
      ),
    },
    {
      id: "spotlight-dust",
      addedInVersion: 1,
      render: (a) => (
        <>
          <polygon points="150,0 210,200 90,200" fill={a} fillOpacity="0.08" />
          <circle cx="150" cy="120" r="8" fill={a} fillOpacity="0.5" />
        </>
      ),
    },
  ],
  primary: [
    {
      id: "masks",
      addedInVersion: 1,
      kind: "round",
      render: (a) => (
        <>
          <circle cx="-20" cy="10" r="24" fill={a} fillOpacity="0.75" />
          <circle cx="28" cy="17" r="24" fill={a} fillOpacity="0.5" />
        </>
      ),
    },
    {
      id: "chandelier",
      addedInVersion: 1,
      kind: "tall",
      render: (a) => (
        <>
          <line y1="-60" y2="-20" stroke={a} strokeOpacity="0.5" strokeWidth="2" />
          {[-30, -15, 0, 15, 30].map((x, i) => (
            <line key={i} x1="0" y1="-20" x2={x} y2="10" stroke={a} strokeOpacity="0.45" strokeWidth="2" />
          ))}
          {[-30, -15, 0, 15, 30].map((x, i) => (
            <circle key={i} cx={x} cy="10" r="4" fill={a} fillOpacity="0.7" />
          ))}
        </>
      ),
    },
  ],
  secondary: [
    {
      id: "sparkle-dust",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[
            [-60, 20],
            [50, -10],
            [70, 35],
            [-40, -20],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.6" fill={a} fillOpacity="0.55" />
          ))}
        </>
      ),
    },
    {
      id: "fold-lines",
      addedInVersion: 1,
      render: (a) => (
        <>
          <path d="M-40,-20 Q-30,0 -40,20" stroke={a} strokeOpacity="0.35" strokeWidth="2.5" fill="none" />
          <path d="M40,-24 Q50,0 40,24" stroke={a} strokeOpacity="0.3" strokeWidth="2.5" fill="none" />
        </>
      ),
    },
  ],
  colors: [
    { id: "teal-classic", addedInVersion: 1, accent: "#FFFFFF" },
    { id: "teal-cream", addedInVersion: 1, accent: "#E4FFFA" },
    { id: "teal-gold", addedInVersion: 1, accent: "#FFF0C9" },
  ],
};

// ── ספורט ────────────────────────────────────────────────────
const sports: CategoryPools = {
  backgrounds: [
    {
      id: "bleachers",
      addedInVersion: 1,
      render: () => (
        <path
          d="M0,155 L30,125 L60,155 L90,125 L120,155 L150,125 L180,155 L210,125 L240,155 L270,125 L300,155 V200 H0 Z"
          fill="black"
          fillOpacity="0.15"
        />
      ),
    },
    {
      id: "floodlight-beams",
      addedInVersion: 1,
      render: (a) => (
        <>
          <polygon points="20,0 70,0 60,160 -30,160" fill={a} fillOpacity="0.08" />
          <polygon points="230,0 280,0 330,160 240,160" fill={a} fillOpacity="0.08" />
        </>
      ),
    },
  ],
  primary: [
    {
      id: "ball",
      addedInVersion: 1,
      kind: "round",
      render: (a) => (
        <>
          <circle r="24" fill={a} fillOpacity="0.85" />
          <g stroke="black" strokeOpacity="0.2" strokeWidth="2" fill="none">
            <path d="M0,-24 V24" />
            <path d="M-24,0 H24" />
            <path d="M-16,-16 Q0,-2 16,-16" />
            <path d="M-16,16 Q0,2 16,16" />
          </g>
        </>
      ),
    },
    {
      id: "goal-net",
      addedInVersion: 1,
      kind: "wide",
      render: (a) => (
        <>
          <rect x="-40" y="-24" width="80" height="48" fill="none" stroke={a} strokeOpacity="0.4" strokeWidth="2" />
          {[-24, -8, 8, 24].map((x, i) => (
            <line key={`v${i}`} x1={x} y1="-24" x2={x} y2="24" stroke={a} strokeOpacity="0.25" strokeWidth="1.5" />
          ))}
          {[-12, 0, 12].map((y, i) => (
            <line key={`h${i}`} x1="-40" y1={y} x2="40" y2={y} stroke={a} strokeOpacity="0.25" strokeWidth="1.5" />
          ))}
        </>
      ),
    },
  ],
  secondary: [
    {
      id: "motion-lines",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[0, 10, 20].map((o, i) => (
            <line key={i} x1={-40 + o} y1={-10 + o} x2={-15 + o} y2={5 + o} stroke={a} strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
          ))}
        </>
      ),
    },
    {
      id: "dots-scatter",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[
            [-50, 10],
            [-30, 30],
            [40, -10],
            [55, 20],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3" fill={a} fillOpacity="0.5" />
          ))}
        </>
      ),
    },
  ],
  colors: [
    { id: "blue-classic", addedInVersion: 1, accent: "#FFFFFF" },
    { id: "blue-ice", addedInVersion: 1, accent: "#E6F2FF" },
    { id: "blue-warm", addedInVersion: 1, accent: "#FFF3E0" },
  ],
};

// ── אטרקציות ─────────────────────────────────────────────────
const attractions: CategoryPools = {
  backgrounds: [
    {
      id: "ferris-wheel",
      addedInVersion: 1,
      render: (a) => {
        const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
        return (
          <g transform="translate(150,120)">
            <circle r="68" fill="none" stroke={a} strokeOpacity="0.4" strokeWidth="4" />
            {spokes.map((angle, i) => (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={Math.cos(angle) * 68}
                y2={Math.sin(angle) * 68}
                stroke={a}
                strokeOpacity="0.3"
                strokeWidth="2"
              />
            ))}
          </g>
        );
      },
    },
    {
      id: "string-lights",
      addedInVersion: 1,
      render: (a) => (
        <>
          <path d="M-10,20 Q75,60 150,20 T310,20" stroke={a} strokeOpacity="0.3" strokeWidth="2" fill="none" />
          {[10, 70, 130, 190, 250].map((x, i) => (
            <circle key={i} cx={x} cy={i % 2 === 0 ? 32 : 24} r="3.5" fill={a} fillOpacity="0.6" />
          ))}
        </>
      ),
    },
  ],
  primary: [
    {
      id: "wheel-hub",
      addedInVersion: 1,
      kind: "round",
      render: (a) => (
        <>
          {Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3).map((angle, i) => (
            <circle key={i} cx={Math.cos(angle) * 34} cy={Math.sin(angle) * 34} r="7" fill={a} fillOpacity="0.75" />
          ))}
          <circle r="8" fill={a} fillOpacity="0.9" />
        </>
      ),
    },
    {
      id: "balloon-cluster",
      addedInVersion: 1,
      kind: "tall",
      render: (a) => (
        <>
          <circle cx="-14" cy="-20" r="16" fill={a} fillOpacity="0.55" />
          <circle cx="12" cy="-32" r="19" fill={a} fillOpacity="0.7" />
          <circle cx="30" cy="-12" r="14" fill={a} fillOpacity="0.5" />
          <line x1="-14" y1="-6" x2="0" y2="34" stroke={a} strokeOpacity="0.4" strokeWidth="1.5" />
          <line x1="12" y1="-15" x2="4" y2="34" stroke={a} strokeOpacity="0.4" strokeWidth="1.5" />
          <line x1="30" y1="0" x2="18" y2="34" stroke={a} strokeOpacity="0.4" strokeWidth="1.5" />
        </>
      ),
    },
  ],
  secondary: [
    {
      id: "confetti",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[
            [-70, 30],
            [-50, 10],
            [60, 20],
            [78, 45],
            [-90, 60],
          ].map(([cx, cy], i) => (
            <rect key={i} x={cx} y={cy} width="5" height="5" rx="1" fill={a} fillOpacity="0.55" transform={`rotate(${i * 27} ${cx} ${cy})`} />
          ))}
        </>
      ),
    },
    {
      id: "sparkle-stars",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[
            [-40, -10],
            [45, 15],
          ].map(([cx, cy], i) => (
            <path
              key={i}
              d={`M${cx},${cy - 7} L${cx + 2},${cy - 2} L${cx + 7},${cy} L${cx + 2},${cy + 2} L${cx},${cy + 7} L${cx - 2},${cy + 2} L${cx - 7},${cy} L${cx - 2},${cy - 2} Z`}
              fill={a}
              fillOpacity="0.6"
            />
          ))}
        </>
      ),
    },
  ],
  colors: [
    { id: "amber-classic", addedInVersion: 1, accent: "#FFFFFF" },
    { id: "amber-cream", addedInVersion: 1, accent: "#FFF6E5" },
    { id: "amber-pink", addedInVersion: 1, accent: "#FFE3EC" },
  ],
};

// ── שוברים ───────────────────────────────────────────────────
const vouchers: CategoryPools = {
  backgrounds: [
    {
      id: "gift-card",
      addedInVersion: 1,
      render: (a) => (
        <g transform="translate(150,105)">
          <rect x="-72" y="-45" width="144" height="90" rx="14" fill={a} fillOpacity="0.14" />
          <rect x="-72" y="-45" width="144" height="90" rx="14" fill="none" stroke={a} strokeOpacity="0.45" strokeWidth="3" />
          <line x1="-18" y1="-45" x2="-18" y2="45" stroke={a} strokeOpacity="0.4" strokeWidth="3" strokeDasharray="6 8" />
          <circle cx="-18" cy="-45" r="8" fill="black" fillOpacity="0.18" />
          <circle cx="-18" cy="45" r="8" fill="black" fillOpacity="0.18" />
        </g>
      ),
    },
    {
      id: "wrap-pattern",
      addedInVersion: 1,
      render: (a) =>
        (
          <>
            {Array.from({ length: 4 }, (_, row) =>
              Array.from({ length: 8 }, (_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={col * 40 + (row % 2 === 0 ? 0 : 20)}
                  cy={row * 40 + 10}
                  r="2.5"
                  fill={a}
                  fillOpacity="0.12"
                />
              ))
            )}
          </>
        ),
    },
  ],
  primary: [
    {
      id: "star-badge",
      addedInVersion: 1,
      kind: "round",
      render: (a) => (
        <>
          <circle r="22" fill={a} fillOpacity="0.85" />
          <polygon points="0,-11 4,-2 13,-2 6,4 8,13 0,7 -8,13 -6,4 -13,-2 -4,-2" fill="black" fillOpacity="0.28" />
        </>
      ),
    },
    {
      id: "ribbon-bow",
      addedInVersion: 1,
      kind: "wide",
      render: (a) => (
        <>
          <polygon points="0,0 -30,-16 -30,16" fill={a} fillOpacity="0.7" />
          <polygon points="0,0 30,-16 30,16" fill={a} fillOpacity="0.7" />
          <rect x="-8" y="-9" width="16" height="18" rx="4" fill={a} fillOpacity="0.9" />
        </>
      ),
    },
  ],
  secondary: [
    {
      id: "corner-dots",
      addedInVersion: 1,
      render: (a) => (
        <>
          {[
            [-50, -20],
            [-50, 20],
            [50, -20],
            [50, 20],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" fill="black" fillOpacity="0.14" />
          ))}
        </>
      ),
    },
    {
      id: "sparkle-mini",
      addedInVersion: 1,
      render: (a) => (
        <>
          <path d="M-40,-15 L-38,-8 L-31,-6 L-38,-4 L-40,3 L-42,-4 L-49,-6 L-42,-8 Z" fill={a} fillOpacity="0.55" />
        </>
      ),
    },
  ],
  colors: [
    { id: "green-classic", addedInVersion: 1, accent: "#FFFFFF" },
    { id: "green-cream", addedInVersion: 1, accent: "#F1FFF6" },
    { id: "green-gold", addedInVersion: 1, accent: "#FFF3C4" },
  ],
};

export const COVER_POOLS: Record<CategorySlug, CategoryPools> = {
  concerts,
  standup,
  theater,
  sports,
  attractions,
  vouchers,
};
