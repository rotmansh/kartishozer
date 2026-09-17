// Deterministic, dependency-free hashing + pool-versioning for the cover
// art system (see CategoryArt.tsx). Every function here is a pure
// function of its inputs — no Math.random, no Date.now() — so the exact
// same event renders the exact same cover forever, on the server or the
// client, today or in five years.

/** FNV-1a, a small well-known 32-bit string hash — good enough for
 * picking indices out of a handful of pools, not for anything
 * security-sensitive. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Murmur3's finalizer. FNV-1a's *low* bits are weak — hashing very
 * similar strings (e.g. "<id>:primary" vs "<id>:secondary") can leave
 * `hash % 2` identical far more often than chance, which was exactly
 * observed here: pool picks that should be independent (primary element
 * vs. secondary accent) came out perfectly correlated. This avalanche
 * step spreads the bits properly before the modulo. */
function avalanche(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * A stable index into `length` slots for a given event, decorrelated per
 * `salt` so picking the background doesn't move in lockstep with picking
 * the primary element, layout, etc.
 */
export function poolIndex(eventId: string, salt: string, length: number): number {
  if (length <= 0) return 0;
  return avalanche(fnv1a(`${eventId}:${salt}`)) % length;
}

// ── Pool versioning ──────────────────────────────────────────
//
// A pool's contents are append-only: once an item ships, its
// `addedInVersion` and its position in the array are permanent — never
// reordered, edited, or removed. To retire one, stop drawing new events
// from it going forward (leave it in place for old events) rather than
// deleting it.
//
// Add a new { version, from } row here *only* when new items are
// appended to some pool, using today's date as `from`. Existing events
// resolve to whichever version was current on their own `createdAt`, so
// they only ever "see" the slice of each pool that existed back then —
// appending new items later cannot change what an already-published
// event renders, by construction.
export const POOL_VERSIONS: { version: number; from: Date }[] = [
  { version: 1, from: new Date("2020-01-01T00:00:00.000Z") },
];

export function resolvePoolVersion(createdAt: Date): number {
  let resolved = POOL_VERSIONS[0].version;
  for (const entry of POOL_VERSIONS) {
    if (entry.from.getTime() <= createdAt.getTime()) resolved = entry.version;
  }
  return resolved;
}

export function filterByVersion<T extends { addedInVersion: number }>(pool: readonly T[], version: number): T[] {
  return pool.filter((item) => item.addedInVersion <= version);
}
