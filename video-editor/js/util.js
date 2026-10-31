// Small shared helpers.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
let _id = 0;
export const uid = (p = 'id') => `${p}${Date.now().toString(36)}${(_id++).toString(36)}`;

export function fmtTime(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

// Deterministic RNG so "remix" seeds are reproducible.
export function rng(seed) {
  let a = seed >>> 0 || 1;
  const f = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.weighted = (obj) => {
    const entries = Object.entries(obj);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = f() * total;
    for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
    return entries[entries.length - 1][0];
  };
  f.range = (a, b) => a + f() * (b - a);
  return f;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Find index of last element in sorted array <= v.
export function bisect(arr, v) {
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= v) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
