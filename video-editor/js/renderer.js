// Frame compositor: clips (with Ken Burns + beat pulse), transitions,
// WebGL color grading, overlays (text, stickers, drawings), letterbox.
import { makeCanvas, clamp, lerp, easeInOut, easeOut, easeOutBack } from './util.js';

export const FILTERS = {
  none: { name: 'מקורי' },
  vivid: { name: 'חי', sat: 1.35, con: 1.08 },
  warm: { name: 'חמים', sat: 1.1, mul: [1.08, 1.0, 0.88], add: [0.02, 0.01, 0] },
  cool: { name: 'קריר', sat: 1.05, mul: [0.92, 1.0, 1.1], add: [0, 0.01, 0.03] },
  teal: { name: 'קולנוע', sat: 1.1, con: 1.12, split: [[0.0, 0.08, 0.1], [0.1, 0.05, -0.04]], vig: 0.35 },
  vintage: { name: 'וינטג׳', sat: 0.75, con: 0.9, mul: [1.07, 0.98, 0.82], add: [0.06, 0.04, 0.02], vig: 0.45, grain: 0.08 },
  bw: { name: 'שחור לבן', sat: 0, con: 1.18, vig: 0.25 },
  noir: { name: 'נואר', sat: 0, con: 1.45, add: [-0.04, -0.04, -0.04], vig: 0.6, grain: 0.05 },
  dreamy: { name: 'חלומי', sat: 0.9, con: 0.85, mul: [1.05, 0.98, 1.04], add: [0.07, 0.05, 0.08] },
  neon: { name: 'ניאון', sat: 1.6, con: 1.15, split: [[0.08, -0.04, 0.14], [0.02, 0.06, 0.08]] },
  sunset: { name: 'שקיעה', sat: 1.2, mul: [1.12, 0.96, 0.86], split: [[0.05, -0.02, 0.06], [0.08, 0.03, -0.05]], vig: 0.2 },
};

const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position = vec4(p,0.,1.); }`;
const FS = `precision mediump float; varying vec2 uv; uniform sampler2D tex;
uniform float sat, con, vig, grain, seed, shift; uniform vec3 mul, add, sh, hi;
float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)) + seed) * 43758.5453); }
void main(){
  vec3 c;
  if (shift > 0.0) { c = vec3(texture2D(tex, uv + vec2(shift,0.)).r, texture2D(tex, uv).g, texture2D(tex, uv - vec2(shift,0.)).b); }
  else c = texture2D(tex, uv).rgb;
  c = c * mul + add;
  float l = dot(c, vec3(0.299,0.587,0.114));
  c = mix(vec3(l), c, sat);
  c = (c - 0.5) * con + 0.5;
  c += sh * (1.0 - smoothstep(0.0, 0.55, l)) + hi * smoothstep(0.45, 1.0, l);
  vec2 d = uv - 0.5; c *= 1.0 - vig * smoothstep(0.25, 0.85, length(d) * 1.25);
  c += (rnd(uv * 997.0) - 0.5) * grain;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

class Grader {
  constructor() {
    this.canvas = makeCanvas(16, 16);
    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    this.gl = gl;
    if (!gl) return;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { this.gl = null; return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.u = {};
    for (const n of ['sat', 'con', 'vig', 'grain', 'seed', 'shift', 'mul', 'add', 'sh', 'hi']) this.u[n] = gl.getUniformLocation(pr, n);
  }
  // Grades `src` canvas in place.
  apply(src, f, extra = {}) {
    const gl = this.gl;
    if (!gl) return;
    const needs = (f && f !== FILTERS.none) || extra.shift || extra.grain;
    if (!needs) return;
    if (this.canvas.width !== src.width || this.canvas.height !== src.height) {
      this.canvas.width = src.width; this.canvas.height = src.height;
      gl.viewport(0, 0, src.width, src.height);
    }
    f = f || {};
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const s = f.split || [[0, 0, 0], [0, 0, 0]];
    gl.uniform1f(this.u.sat, f.sat ?? 1); gl.uniform1f(this.u.con, f.con ?? 1);
    gl.uniform1f(this.u.vig, f.vig ?? 0); gl.uniform1f(this.u.grain, (f.grain ?? 0) + (extra.grain || 0));
    gl.uniform1f(this.u.seed, (extra.seed || 0) % 100); gl.uniform1f(this.u.shift, extra.shift || 0);
    gl.uniform3fv(this.u.mul, f.mul || [1, 1, 1]); gl.uniform3fv(this.u.add, f.add || [0, 0, 0]);
    gl.uniform3fv(this.u.sh, s[0]); gl.uniform3fv(this.u.hi, s[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const ctx = src.getContext('2d');
    ctx.drawImage(this.canvas, 0, 0);
  }
}

export const FONTS = {
  heebo: { name: 'הבו', css: '900 {s}px Heebo, "Arial Hebrew", sans-serif' },
  rubik: { name: 'רוביק', css: '700 {s}px Rubik, "Arial Hebrew", sans-serif' },
  secular: { name: 'סקולר', css: '400 {s}px "Secular One", Heebo, sans-serif' },
  suez: { name: 'סואץ', css: '400 {s}px "Suez One", serif' },
  amatic: { name: 'כתב יד', css: '700 {s}px "Amatic SC", cursive' },
  varela: { name: 'עגול', css: '400 {s}px "Varela Round", sans-serif' },
};
const fontCss = (key, size) => (FONTS[key] || FONTS.heebo).css.replace('{s}', Math.round(size));

export class Renderer {
  constructor() {
    this.bufA = makeCanvas(16, 16);
    this.bufB = makeCanvas(16, 16);
    this.grader = new Grader();
  }

  ensure(w, h) {
    for (const b of [this.bufA, this.bufB]) if (b.width !== w || b.height !== h) { b.width = w; b.height = h; }
  }

  // ctx: target 2D context. P: { clips, overlays, filter, style, music beats (timeline-relative) }
  draw(ctx, t, P, getSource, opts = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    this.ensure(W, H);
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const clips = P.clips;
    let k = clips.findIndex((c) => t >= c.start && t < c.start + c.dur);
    if (k < 0) k = t <= 0 ? 0 : clips.length - 1;
    const cur = clips[k];
    let shift = 0, flash = 0;
    if (cur) {
      const next = clips[k + 1];
      let pair = null;
      if (next && next.transition.type !== 'cut') {
        const d = next.transition.dur;
        if (t > next.start - d / 2) pair = [cur, next, (t - (next.start - d / 2)) / d];
      }
      if (!pair && k > 0 && cur.transition.type !== 'cut') {
        const d = cur.transition.dur;
        if (t < cur.start + d / 2) pair = [clips[k - 1], cur, (t - (cur.start - d / 2)) / d];
      }
      if (pair) {
        const [A, B, p0] = pair;
        const p = clamp(p0, 0, 1);
        this.renderClip(this.bufA, A, t, P, getSource);
        this.renderClip(this.bufB, B, t, P, getSource);
        const fx = this.composite(ctx, B.transition.type, p, W, H);
        shift = fx.shift || 0; flash = fx.flash || 0;
      } else {
        this.renderClip(this.bufA, cur, t, P, getSource);
        ctx.drawImage(this.bufA, 0, 0);
      }
    }
    ctx.restore();
    if (shift) this.grader.apply(ctx.canvas, null, { shift, seed: t * 37 });
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${clamp(flash, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
    // Fade from/to black at the very start and end for cinematic.
    if (P.letterbox) {
      const bar = Math.round(H * (W < H ? 0.07 : 0.1));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
    }
    if (P.fadeEdges) {
      const a = Math.max(clamp(1 - t / 0.6, 0, 1), clamp(1 - (P.duration - t) / 0.8, 0, 1));
      if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }
    }
    for (const ov of P.overlays) {
      if (ov.hidden) continue;
      const force = opts.selectedId === ov.id && opts.showSelected;
      if (!force && (t < ov.start || t > ov.end)) continue;
      this.drawOverlay(ctx, ov, t, W, H, P, force);
    }
    if (opts.pending) this.drawOverlay(ctx, opts.pending, t, W, H, P, true);
    if (opts.selectedId) {
      const ov = P.overlays.find((o) => o.id === opts.selectedId);
      if (ov && (opts.showSelected || (t >= ov.start && t <= ov.end))) this.drawSelection(ctx, ov, W, H);
    }
  }

  pulseAt(t, P) {
    const amp = P.pulse || 0;
    if (!amp || !P.beats) return 0;
    let v = 0;
    const beats = P.beats;
    // binary search for last beat <= t
    let lo = 0, hi = beats.length - 1, idx = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (beats[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
    if (idx >= 0) {
      const dt = t - beats[idx];
      const strong = P.downbeats && P.downbeats.has(idx) ? 1.6 : 1;
      v = amp * strong * Math.exp(-dt * 9);
    }
    return v;
  }

  renderClip(buf, clip, t, P, getSource) {
    const ctx = buf.getContext('2d');
    const W = buf.width, H = buf.height;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const src = getSource(clip, t);
    if (src && src.w) {
      const local = clamp((t - clip.start) / clip.dur, -0.3, 1.3);
      let s = 1, ox = 0, oy = 0;
      if (clip.kb) {
        const e = easeInOut(clamp(local, 0, 1));
        s = lerp(clip.kb.s0, clip.kb.s1, e);
        ox = lerp(clip.kb.x0, clip.kb.x1, e); oy = lerp(clip.kb.y0, clip.kb.y1, e);
      }
      s *= 1 + this.pulseAt(t, P);
      s *= clip.zoom || 1;
      const fit = clip.fit === 'contain' ? Math.min(W / src.w, H / src.h) : Math.max(W / src.w, H / src.h);
      const dw = src.w * fit * s, dh = src.h * fit * s;
      if (clip.fit === 'contain') {
        // Blurred-fill background for letter/pillar boxes.
        const bf = Math.max(W / src.w, H / src.h) * 1.1;
        ctx.globalAlpha = 0.55;
        ctx.drawImage(src.el, (W - src.w * bf) / 2, (H - src.h * bf) / 2, src.w * bf, src.h * bf);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
      }
      const px = (clip.panX || 0) * (dw - W) / 2, py = (clip.panY || 0) * (dh - H) / 2;
      ctx.drawImage(src.el, (W - dw) / 2 + ox * W + px, (H - dh) / 2 + oy * H + py, dw, dh);
    }
    ctx.restore();
    const f = FILTERS[clip.filter || P.filter] || FILTERS.none;
    this.grader.apply(buf, f, { seed: Math.floor(t * 24) });
  }

  composite(ctx, type, p, W, H) {
    const A = this.bufA, B = this.bufB;
    const e = easeInOut(p);
    const blurCopies = (img, x, y, vx, vy, n, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, x, y);
      if (!n) return;
      ctx.globalAlpha = alpha * 0.35;
      for (let i = 1; i <= n; i++) ctx.drawImage(img, x - vx * i, y - vy * i);
      ctx.globalAlpha = 1;
    };
    const scaled = (img, s, alpha = 1, rot = 0) => {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(s, s);
      ctx.drawImage(img, -W / 2, -H / 2); ctx.restore();
    };
    switch (type) {
      case 'fade':
        ctx.drawImage(A, 0, 0); ctx.globalAlpha = e; ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; return {};
      case 'black':
        if (p < 0.5) { ctx.globalAlpha = 1 - easeOut(p * 2); ctx.drawImage(A, 0, 0); }
        else { ctx.globalAlpha = easeOut((p - 0.5) * 2); ctx.drawImage(B, 0, 0); }
        ctx.globalAlpha = 1; return {};
      case 'flash':
        ctx.drawImage(p < 0.5 ? A : B, 0, 0);
        return { flash: Math.pow(1 - Math.abs(2 * p - 1), 1.5) * 0.95 };
      case 'zoom': {
        if (p < 0.5) { const q = p * 2; scaled(A, 1 + q * q * 0.9, 1); }
        else { const q = (p - 0.5) * 2; scaled(B, 1.6 - 0.6 * easeOut(q), 1); }
        const v = 1 - Math.abs(2 * p - 1);
        if (v > 0.2) { // radial-ish motion blur
          ctx.globalAlpha = 0.25 * v; scaled(p < 0.5 ? A : B, 1.08 + 0.15 * v); ctx.globalAlpha = 1;
        }
        return { flash: v * 0.25 };
      }
      case 'whip': case 'slideL': {
        const q = type === 'whip' ? easeInOut(p) : easeOut(p);
        const dir = -1; // RTL-friendly: content moves to the left
        const x = dir * q * W;
        const v = type === 'whip' ? (1 - Math.abs(2 * p - 1)) * W * 0.06 : 0;
        blurCopies(A, x, 0, dir * v, 0, type === 'whip' ? 4 : 0);
        blurCopies(B, x - dir * W, 0, dir * v, 0, type === 'whip' ? 4 : 0);
        return {};
      }
      case 'slideUp': {
        const q = easeOut(p);
        ctx.drawImage(A, 0, -q * H * 0.3);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
        ctx.drawImage(B, 0, (1 - q) * H); ctx.restore();
        return {};
      }
      case 'spin': {
        if (p < 0.5) { const q = easeIn2(p * 2); scaled(A, 1 + q * 0.6, 1, q * 0.6); }
        else { const q = 1 - easeOut((p - 0.5) * 2); scaled(B, 1 + q * 0.6, 1, -q * 0.6); }
        return { flash: (1 - Math.abs(2 * p - 1)) * 0.2 };
      }
      case 'glitch': {
        const base = p < 0.5 ? A : B, other = p < 0.5 ? B : A;
        ctx.drawImage(base, 0, 0);
        const v = Math.sin(p * Math.PI);
        const slices = 7;
        for (let i = 0; i < slices; i++) {
          const r1 = fract(Math.sin((i + 1) * 91.7 + Math.floor(p * 12) * 13.1) * 437.5);
          if (r1 > v * 0.9) continue;
          const y = Math.floor(fract(r1 * 7.3) * H), h = Math.max(4, Math.floor(H * 0.03 + r1 * H * 0.08));
          const dx = (r1 - 0.5) * W * 0.18 * v;
          ctx.drawImage(r1 > 0.45 ? other : base, 0, y, W, h, dx, y, W, h);
        }
        return { shift: 0.012 * v };
      }
      case 'iris': {
        ctx.drawImage(A, 0, 0);
        ctx.save(); ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.hypot(W, H) * 0.5 * easeInOut(p), 0, Math.PI * 2);
        ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
        return {};
      }
      default:
        ctx.drawImage(p < 0.5 ? A : B, 0, 0); return {};
    }
  }

  // ---- Overlays ----------------------------------------------------------
  // Overlay geometry lives in a 1080-wide reference space.
  overlayTransform(ctx, ov, W) {
    const k = W / 1080;
    ctx.translate(ov.x * W, ov.y * ctx.canvas.height);
    ctx.rotate(ov.rot || 0);
    ctx.scale((ov.scale || 1) * k, (ov.scale || 1) * k);
  }

  measure(ctx, ov) {
    if (ov.kind === 'draw') {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of ov.strokes) for (const [x, y] of s.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const pad = 20;
      if (!isFinite(x0)) return { x: -50, y: -50, w: 100, h: 100 };
      return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
    }
    if (ov.kind === 'sticker') {
      const s = ov.size || 200;
      return { x: -s * 0.6, y: -s * 0.6, w: s * 1.2, h: s * 1.2 };
    }
    const size = ov.size || 96;
    ctx.save();
    ctx.font = fontCss(ov.font, size);
    const lines = String(ov.text || ' ').split('\n');
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width), size);
    ctx.restore();
    const lh = size * 1.2;
    const padX = ov.style === 'box' || ov.style === 'badge' ? size * 0.45 : size * 0.15;
    return { x: -w / 2 - padX, y: (-lines.length * lh) / 2 - size * 0.2, w: w + padX * 2, h: lines.length * lh + size * 0.4 };
  }

  drawOverlay(ctx, ov, t, W, H, P, force) {
    const local = force ? Math.max(t - ov.start, 10) : t - ov.start;
    const remain = force ? 10 : ov.end - t;
    const anim = ov.anim || 'pop';
    let a = 1, s = 1, dy = 0, reveal = 1;
    const tin = clamp(local / 0.4, 0, 1);
    if (anim === 'pop') s = tin < 1 ? Math.max(0.01, easeOutBack(tin)) : 1;
    if (anim === 'fade') a = easeOut(tin);
    if (anim === 'slide') { dy = (1 - easeOut(tin)) * 120; a = easeOut(tin); }
    if (anim === 'type') reveal = clamp(local / Math.max(0.4, String(ov.text || '').length * 0.06), 0, 1);
    if (anim === 'beat') s *= 1 + 0.6 * this.pulseAt(t, { ...P, pulse: Math.max(0.12, P.pulse || 0) * 1.2 });
    if (anim === 'wiggle') { s *= 1 + 0.03 * Math.sin(local * 9); }
    if (!force && remain < 0.25) a *= clamp(remain / 0.25, 0, 1);
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = a;
    this.overlayTransform(ctx, ov, W);
    ctx.translate(0, dy);
    if (anim === 'wiggle') ctx.rotate(Math.sin(local * 6) * 0.06);
    ctx.scale(s, s);
    if (ov.kind === 'text') this.drawText(ctx, ov, reveal);
    else if (ov.kind === 'sticker') {
      const size = ov.size || 200;
      ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      ctx.fillText(ov.emoji, 0, size * 0.05);
    } else if (ov.kind === 'draw') {
      const f = force ? 1 : ov.drawOn === false ? 1 : clamp(local / 0.8, 0, 1);
      this.drawStrokes(ctx, ov.strokes, f);
    }
    ctx.restore();
  }

  drawText(ctx, ov, reveal) {
    const size = ov.size || 96;
    const color = ov.color || '#ffffff';
    let text = String(ov.text || '');
    if (reveal < 1) text = [...text].slice(0, Math.ceil([...text].length * reveal)).join('');
    const lines = text.split('\n');
    ctx.font = fontCss(ov.font, size);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    const lh = size * 1.2;
    const y0 = (-(lines.length - 1) * lh) / 2;
    if (ov.style === 'box' || ov.style === 'badge') {
      const full = String(ov.text || '').split('\n');
      const w = Math.max(...full.map((l) => ctx.measureText(l).width));
      const padX = size * 0.45, padY = size * 0.25;
      const bw = w + padX * 2, bh = full.length * lh + padY * 2 - size * 0.2;
      ctx.save();
      if (ov.style === 'badge') { ctx.rotate(-0.06); ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; }
      ctx.fillStyle = ov.bg || (ov.style === 'badge' ? '#ff3d6e' : 'rgba(0,0,0,0.55)');
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, ov.style === 'badge' ? bh / 2 : size * 0.25);
      ctx.fill();
      ctx.restore();
      if (ov.style === 'badge') ctx.rotate(-0.06);
    }
    lines.forEach((line, i) => {
      const y = y0 + i * lh;
      if (ov.style === 'outline') {
        ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = ov.bg || '#000';
        ctx.strokeText(line, 0, y);
      } else if (ov.style === 'neon') {
        ctx.shadowColor = color; ctx.shadowBlur = size * 0.5;
        ctx.fillStyle = color; ctx.fillText(line, 0, y);
        ctx.shadowBlur = size * 0.2;
      } else if (ov.style === 'plain' || !ov.style) {
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.04;
      }
      ctx.fillStyle = ov.style === 'neon' ? '#fff' : color;
      ctx.fillText(line, 0, y);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    });
  }

  drawStrokes(ctx, strokes, f) {
    let total = 0;
    const lens = strokes.map((s) => {
      let L = 0;
      for (let i = 1; i < s.pts.length; i++) L += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
      total += L; return L;
    });
    let budget = total * f;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokes.forEach((s, si) => {
      if (budget <= 0 || !s.pts.length) return;
      const pts = s.pts;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      let used = 0;
      for (let i = 1; i < pts.length; i++) {
        const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (used + seg > budget) {
          const r = (budget - used) / (seg || 1);
          ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], r), lerp(pts[i - 1][1], pts[i][1], r));
          used = budget; break;
        }
        // smooth with quadratic midpoints
        const mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2;
        ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, my);
        used += seg;
      }
      if (pts.length === 1) ctx.lineTo(pts[0][0] + 0.1, pts[0][1]);
      budget -= lens[si];
      if (s.neon) {
        ctx.shadowColor = s.color; ctx.shadowBlur = s.width * 1.6;
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = s.width * 0.4; ctx.stroke();
      } else {
        if (s.outline) { ctx.strokeStyle = '#fff'; ctx.lineWidth = s.width + 10; ctx.stroke(); }
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.stroke();
      }
    });
  }

  drawSelection(ctx, ov, W) {
    ctx.save();
    this.overlayTransform(ctx, ov, W);
    const b = this.measure(ctx, ov);
    const k = 1 / ((ov.scale || 1) * (W / 1080));
    ctx.lineWidth = 3 * k * (W / 540);
    ctx.setLineDash([12 * k, 8 * k]);
    ctx.strokeStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd23f';
    const r = 12 * k * (W / 540);
    ctx.beginPath(); ctx.arc(b.x + b.w, b.y + b.h, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Returns overlay id under canvas point (px), topmost first.
  hitTest(ctx, P, t, px, py, W, H, selectedId) {
    for (let i = P.overlays.length - 1; i >= 0; i--) {
      const ov = P.overlays[i];
      if (ov.id !== selectedId && (t < ov.start || t > ov.end)) continue;
      const loc = this.toLocal(ov, px, py, W, H);
      const b = this.measure(ctx, ov);
      const pad = 30 / (ov.scale || 1);
      if (loc.x >= b.x - pad && loc.x <= b.x + b.w + pad && loc.y >= b.y - pad && loc.y <= b.y + b.h + pad) return ov.id;
    }
    return null;
  }

  toLocal(ov, px, py, W, H) {
    const k = (W / 1080) * (ov.scale || 1);
    const dx = px - ov.x * W, dy = py - ov.y * H;
    const c = Math.cos(-(ov.rot || 0)), s = Math.sin(-(ov.rot || 0));
    return { x: (dx * c - dy * s) / k, y: (dx * s + dy * c) / k };
  }
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const fract = (x) => x - Math.floor(x);
const easeIn2 = (t) => t * t;
