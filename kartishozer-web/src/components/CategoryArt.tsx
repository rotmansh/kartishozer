import type { CategorySlug } from "@/lib/types";
import { COVER_POOLS, LAYOUTS } from "@/lib/coverArt/pools";
import { poolIndex, resolvePoolVersion, filterByVersion } from "@/lib/coverArt/rng";

// Generic per-category decorative art — a stopgap for the fact that a
// listing's actual event/performer has no real photo behind it yet (that
// needs an admin-curated, auto-matched image library, which is a bigger
// piece of work). This is just flat vector shapes layered over the
// existing category gradient, not a real photo, but it reads as
// "designed" rather than an empty color block.
//
// Composed from independent pools (background / primary element /
// secondary element / layout / color accent) rather than one fixed
// illustration per category, so two events in the same category don't
// render identical cards — see src/lib/coverArt/{pools,rng}.tsx for the
// pool contents and the deterministic-seed/versioning scheme that
// guarantees the same event always renders the same cover, forever, even
// as new pool entries get added later.
const VIEWBOX = "0 0 300 200";

export function CategoryArt({
  category,
  eventId,
  createdAt,
  className,
}: {
  category: CategorySlug;
  eventId: string;
  createdAt: string | Date;
  className?: string;
}) {
  const pools = COVER_POOLS[category];
  const version = resolvePoolVersion(new Date(createdAt));

  const backgrounds = filterByVersion(pools.backgrounds, version);
  const primaries = filterByVersion(pools.primary, version);
  const secondaries = filterByVersion(pools.secondary, version);
  const colors = filterByVersion(pools.colors, version);

  const background = backgrounds[poolIndex(eventId, "bg", backgrounds.length)];
  const primary = primaries[poolIndex(eventId, "primary", primaries.length)];
  const secondary = secondaries[poolIndex(eventId, "secondary", secondaries.length)];
  const color = colors[poolIndex(eventId, "color", colors.length)];

  const compatibleLayouts = filterByVersion(
    LAYOUTS.filter((l) => l.compatibleKinds.includes(primary.kind)),
    version
  );
  const layout = compatibleLayouts[poolIndex(eventId, "layout", compatibleLayouts.length)];

  return (
    <svg
      viewBox={VIEWBOX}
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    >
      {background.render(color.accent)}
      <g transform={layout.primaryTransform}>{primary.render(color.accent)}</g>
      <g transform={layout.secondaryTransform}>{secondary.render(color.accent)}</g>
    </svg>
  );
}
