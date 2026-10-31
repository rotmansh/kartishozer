// The "director": turns analyzed media + a beat grid into an edit.
// Picks the best moments, cuts on beats (faster in loud parts), keeps the
// story in chronological order, and chooses transitions and effects that
// fit the chosen style.
import { rng, clamp, uid } from './util.js';
import { similarity } from './analyzer.js';
import { bestSection } from './beat.js';

export const STYLES = {
  energetic: {
    name: 'אנרגטי', desc: 'קאטים מהירים על הביט, זום ופלאשים', emoji: '⚡',
    beats: (e, r) => (e > 0.8 ? (r() < 0.3 ? 1 : 2) : e > 0.45 ? (r() < 0.2 ? 4 : 2) : 4),
    transitions: { cut: 5, zoom: 2, whip: 2, flash: 1.5, glitch: 1, spin: 0.6 },
    accent: ['flash', 'zoom', 'glitch'], transBeats: 0.5, pulse: 0.045, filter: 'vivid', kb: 0.14,
  },
  chill: {
    name: 'רגוע', desc: 'מעברים רכים וקצב נינוח', emoji: '🌊',
    beats: (e, r) => (e > 0.7 ? 4 : r() < 0.5 ? 4 : 8),
    transitions: { fade: 5, slideL: 1.5, slideUp: 1, iris: 0.7, cut: 1 },
    accent: ['fade'], transBeats: 1, pulse: 0, filter: 'warm', kb: 0.1,
  },
  cinematic: {
    name: 'קולנועי', desc: 'פסים שחורים, צבע סרט וכניסות דרמטיות', emoji: '🎬',
    beats: (e, r) => (e > 0.8 ? (r() < 0.5 ? 2 : 4) : 4),
    transitions: { fade: 3, black: 2, cut: 2, zoom: 0.6 },
    accent: ['black', 'flash'], transBeats: 1, pulse: 0.015, filter: 'teal', kb: 0.08, letterbox: true,
  },
  vlog: {
    name: 'ולוג', desc: 'נקי וטבעי, מתאים לסיפור היום', emoji: '📱',
    beats: (e, r) => (e > 0.7 ? 2 : r() < 0.6 ? 4 : 2),
    transitions: { cut: 6, slideL: 1.5, whip: 1, fade: 1 },
    accent: ['whip'], transBeats: 0.5, pulse: 0.02, filter: 'none', kb: 0.08,
  },
  retro: {
    name: 'רטרו', desc: 'גרעין, גליצ׳ים וצבעי VHS', emoji: '📼',
    beats: (e, r) => (e > 0.7 ? 2 : 4),
    transitions: { glitch: 3, cut: 3, flash: 1, slideUp: 1 },
    accent: ['glitch'], transBeats: 0.5, pulse: 0.03, filter: 'vintage', kb: 0.1,
  },
};

export const TRANSITIONS = {
  cut: 'חיתוך', fade: 'דהייה', black: 'דרך שחור', flash: 'פלאש', zoom: 'זום', whip: 'מהיר',
  slideL: 'החלקה', slideUp: 'למעלה', spin: 'סיבוב', glitch: 'גליץ׳', iris: 'עיגול',
};

function autoLength(media, musicLeft) {
  let s = 0;
  for (const m of media) s += m.type === 'video' ? Math.min(6, Math.max(1.5, m.duration * 0.6)) : 2.2;
  return clamp(s, 10, Math.min(60, musicLeft));
}

// Build candidate moments: whole photos, and ~2.5s windows inside videos.
function candidates(media) {
  const out = [];
  for (const m of media) {
    const a = m.analysis;
    if (!a) continue;
    if (m.type === 'image') {
      out.push({ m, kind: 'image', score: a.score, sig: a.sig, center: 0, motion: 0 });
      continue;
    }
    const step = 2;
    for (let w = 0; w < Math.max(0.01, m.duration - 0.6); w += step) {
      const inWin = a.samples.filter((s) => s.t >= w && s.t < w + 2.5);
      if (!inWin.length) continue;
      const sc = inWin.reduce((x, s) => x + s.score, 0) / inWin.length;
      const best = inWin.reduce((x, s) => (s.score > x.score ? s : x), inWin[0]);
      const mo = inWin.reduce((x, s) => x + s.motion, 0) / inWin.length;
      out.push({ m, kind: 'video', score: sc + 0.05, sig: a.sig, center: best.t, motion: mo, win: w });
    }
  }
  return out;
}

export function makeSlots(analysis, offset, length, style, r) {
  const beats = analysis.beats.filter((b) => b >= offset - 0.02).map((b) => b - offset);
  const firstIdx = analysis.beats.length - beats.length;
  const P = 60 / analysis.bpm;
  if (!beats.length || beats[0] > 0.05) beats.unshift(0);
  const slots = [];
  let i = 0;
  let cur = 0;
  while (cur < length - 0.25 && i < beats.length) {
    const gi = firstIdx + i;
    const e = analysis.energy[gi] ?? 0.5;
    let nb = style.beats(e, r);
    // Long shots should end on a bar line.
    if (nb >= 4) {
      const ph = (gi - analysis.downbeatPhase) % 4;
      const toBar = (4 - ((ph + 4) % 4)) % 4;
      if (toBar && toBar < nb) nb = toBar + Math.floor((nb - toBar) / 4) * 4 || toBar;
    }
    const j = i + nb;
    let end = beats[j] ?? cur + nb * P;
    if (end - cur < 0.3) end = cur + Math.max(0.3, nb * P);
    if (end > length) end = length;
    slots.push({ start: cur, dur: end - cur, energy: e, down: (gi - analysis.downbeatPhase) % 4 === 0, gi });
    cur = end; i = j;
  }
  // Fold a too-short tail into the previous slot.
  const last = slots[slots.length - 1];
  if (slots.length > 1 && last.dur < 0.6) { slots.pop(); slots[slots.length - 1].dur += last.dur; }
  return slots;
}

export function direct(media, music, opts) {
  const style = STYLES[opts.style] || STYLES.energetic;
  const r = rng(opts.seed || 1);
  const a = music.analysis;
  const songLen = a.duration;
  let length = opts.length === 'auto' ? autoLength(media, songLen) : Math.min(+opts.length || 30, songLen);
  if (opts.length === 'full') length = songLen;
  length = Math.max(5, length);
  let offset = opts.fromStart ? 0 : bestSection(a, length);
  if (offset + length > songLen) offset = Math.max(0, songLen - length);
  // End on a downbeat for a clean finish when close to one.
  const P = 60 / a.bpm;
  const bars = Math.max(1, Math.round(length / (P * 4)));
  if (opts.length !== 'full' && offset + bars * P * 4 <= songLen + 0.01) length = bars * P * 4;

  const cands = candidates(media);
  if (!cands.length) return { clips: [], musicOffset: offset, duration: length };
  // With little material, hold each shot longer instead of repeating shots.
  let slots = null;
  for (const slow of [1, 2, 4]) {
    const st = slow === 1 ? style : { ...style, beats: (e, rr) => style.beats(e, rr) * slow };
    slots = makeSlots(a, offset, length, st, rng((opts.seed || 1) + slow));
    if (slots.length <= cands.length * 1.15) break;
  }

  // Greedy diverse selection (maximal marginal relevance).
  const chosen = [];
  const uses = new Map();
  for (let k = 0; k < slots.length; k++) {
    let best = null, bestV = -Infinity;
    for (const c of cands) {
      const u = uses.get(c) || 0;
      const mu = chosen.filter((x) => x.m === c.m).length;
      let sim = 0;
      for (const x of chosen.slice(-6)) sim = Math.max(sim, x.m === c.m ? 0.55 : similarity(x.sig, c.sig));
      const v = c.score - 0.35 * sim - 0.6 * u - 0.12 * mu + r() * 0.08;
      if (v > bestV) { bestV = v; best = c; }
    }
    uses.set(best, (uses.get(best) || 0) + 1);
    chosen.push(best);
  }
  // Story order: by capture time, then by position inside the video.
  const ordered = chosen
    .map((c, idx) => ({ c, idx }))
    .sort((x, y) => (x.c.m.time - y.c.m.time) || (x.c.m.order - y.c.m.order) || (x.c.center - y.c.center) || (x.idx - y.idx))
    .map((x) => x.c);
  // Never show the same photo (or the same video window) twice in a row.
  const same = (x, y) => !!x && !!y && x.m === y.m && (x.kind === 'image' || x === y);
  for (let k = 1; k < ordered.length; k++) {
    if (!same(ordered[k], ordered[k - 1])) continue;
    for (let j = k + 1; j < ordered.length; j++) {
      const X = ordered[k], Y = ordered[j];
      const okK = !same(Y, ordered[k - 1]) && !same(Y, j === k + 1 ? X : ordered[k + 1]);
      const okJ = !same(X, j - 1 === k ? Y : ordered[j - 1]) && !same(X, ordered[j + 1]);
      if (okK && okJ) { ordered[k] = Y; ordered[j] = X; break; }
    }
  }
  // Put the strongest-looking moment first as a hook in energetic edits.
  if (opts.style === 'energetic' && ordered.length > 3) {
    let bi = 0;
    ordered.forEach((c, i) => { if (c.score > ordered[bi].score) bi = i; });
    if (bi > 0) ordered.unshift(ordered.splice(bi, 1)[0]);
  }

  const usedRanges = new Map();
  const clips = slots.map((slot, k) => {
    const c = ordered[k];
    const m = c.m;
    const clip = {
      id: uid('c'), mediaId: m.id, dur: slot.dur, in: 0, speed: 1, volume: 1,
      transition: { type: 'cut', dur: 0 }, filter: null, kb: null,
    };
    if (m.type === 'video') {
      let speed = 1;
      if (m.duration < slot.dur) speed = clamp(m.duration / slot.dur, 0.5, 1);
      const need = slot.dur * speed;
      let start = clamp(c.center - need * 0.35, 0, Math.max(0, m.duration - need));
      // Avoid replaying the exact same part of a video.
      const ranges = usedRanges.get(m.id) || [];
      for (const [s, e] of ranges) {
        if (start < e && start + need > s) {
          const after = e + 0.1, before = s - need - 0.1;
          if (after + need <= m.duration) start = after;
          else if (before >= 0) start = before;
        }
      }
      ranges.push([start, start + need]);
      usedRanges.set(m.id, ranges);
      clip.in = start; clip.speed = speed;
      if (style.kb && r() < 0.35) clip.kb = kenBurns(r, style.kb * 0.5);
    } else {
      clip.kb = kenBurns(r, style.kb);
    }
    if (k > 0) {
      const prev = slots[k - 1];
      let type = r.weighted(style.transitions);
      const jump = slot.energy - prev.energy;
      if (jump > 0.25 && slot.down) type = r.pick(style.accent);
      if (type !== 'cut') {
        const td = Math.min(style.transBeats * P * (type === 'flash' || type === 'glitch' ? 0.8 : 1), 0.45 * Math.min(prev.dur, slot.dur), 1.2);
        clip.transition = { type, dur: Math.max(0.12, td) };
      }
    }
    return clip;
  });
  return { clips, musicOffset: offset, duration: length, style: opts.style };
}

export function kenBurns(r, amt) {
  const zoomIn = r() < 0.6;
  const s0 = zoomIn ? 1 : 1 + amt, s1 = zoomIn ? 1 + amt : 1;
  const dx = r.range(-1, 1) * amt * 0.5, dy = r.range(-1, 1) * amt * 0.5;
  return { s0, s1, x0: zoomIn ? 0 : dx, y0: zoomIn ? 0 : dy, x1: zoomIn ? dx : 0, y1: zoomIn ? dy : 0 };
}

// Lay clips end to end and return total duration.
export function layout(clips) {
  let t = 0;
  for (const c of clips) { c.start = t; t += c.dur; }
  return t;
}

// Snap every cut to the nearest beat (used after manual edits).
export function snapToBeats(clips, music, offset) {
  if (!music) return;
  const beats = music.analysis.beats.map((b) => b - offset).filter((b) => b >= 0);
  let t = 0;
  for (const c of clips) {
    const target = t + c.dur;
    let best = target, bd = Infinity;
    for (const b of beats) { const d = Math.abs(b - target); if (d < bd && b > t + 0.25) { bd = d; best = b; } }
    c.dur = Math.max(0.3, best - t);
    t += c.dur;
  }
}
