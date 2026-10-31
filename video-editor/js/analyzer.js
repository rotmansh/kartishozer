// On-device "AI" media analysis. Every photo and a set of frames from every
// video are scored for sharpness, exposure, contrast, colorfulness, motion
// and (where the browser supports it) faces, plus a color signature used
// to avoid near-duplicate shots. Nothing leaves the phone.
import { makeCanvas, uid, clamp } from './util.js';

const AW = 96; // analysis width
let faceDetector = null;
try { if ('FaceDetector' in window) faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 }); } catch { faceDetector = null; }

function waitEvent(el, ev, ms = 8000, strict = false) {
  return new Promise((res, rej) => {
    let to;
    const ok = () => { cleanup(); res(); };
    const bad = () => { cleanup(); rej(new Error(ev + ' failed')); };
    const cleanup = () => { clearTimeout(to); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); };
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener('error', bad, { once: true });
    to = setTimeout(strict ? bad : ok, ms);
  });
}

// Open a video file robustly. iPhone .mov files carry type "video/quicktime",
// which several browsers refuse even though the content is plain H.264/HEVC
// in an MP4-compatible container, so we retry with an MP4 type, then a data URL.
async function openVideo(file) {
  const tries = [];
  tries.push(() => URL.createObjectURL(file));
  if (!/mp4|webm/.test(file.type)) tries.push(() => URL.createObjectURL(new Blob([file], { type: 'video/mp4' })));
  if (file.size < 120e6) {
    tries.push(() => new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).replace(/^data:[^;]*;/, 'data:video/mp4;'));
      fr.onerror = rej;
      fr.readAsDataURL(file);
    }));
  }
  let lastErr;
  for (const make of tries) {
    let url;
    try {
      url = await make();
      const v = createVideoEl(url);
      await waitEvent(v, 'loadedmetadata', 12000, true);
      if (!(v.duration > 0) || !v.videoWidth) throw new Error('no video track');
      return { v, url };
    } catch (err) {
      lastErr = err;
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  }
  throw lastErr || new Error('video not supported');
}

export function seekVideo(v, t) {
  return new Promise((res) => {
    let done = false;
    const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin);
    setTimeout(fin, 2500);
    try { v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.04)); } catch { fin(); }
  });
}

export function createVideoEl(url) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  v.src = url;
  return v;
}

export async function loadMedia(file, index) {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp|hevc)$/i.test(file.name);
  let url = isVideo ? null : URL.createObjectURL(file);
  const m = {
    id: uid('m'), file, url, name: file.name, type: isVideo ? 'video' : 'image',
    order: index, time: file.lastModified || 0, duration: 0, width: 0, height: 0,
    el: null, thumb: '', poster: null, analysis: null,
  };
  if (isVideo) {
    const opened = await openVideo(file);
    const v = opened.v;
    m.url = opened.url;
    // iOS needs a play/pause before frames can be drawn.
    try { await v.play(); v.pause(); } catch { /* muted autoplay may be refused */ }
    m.duration = isFinite(v.duration) ? v.duration : 0;
    m.width = v.videoWidth; m.height = v.videoHeight;
    await seekVideo(v, Math.min(0.5, m.duration * 0.2));
    m.poster = snapshot(v, m.width, m.height, 480);
    releaseVideo(v); // phones allow only a few live decoders
    m.el = null;
  } else {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await waitEvent(img, 'load');
    if (img.decode) { try { await img.decode(); } catch { /* fine */ } }
    m.width = img.naturalWidth; m.height = img.naturalHeight;
    m.el = img;
    m.poster = snapshot(img, m.width, m.height, 480);
  }
  m.thumb = snapshot(m.poster, m.poster.width, m.poster.height, 200).toDataURL('image/jpeg', 0.7);
  return m;
}

function snapshot(src, w, h, max) {
  const s = Math.min(1, max / Math.max(w || 1, h || 1));
  const c = makeCanvas((w || 16) * s, (h || 9) * s);
  try { c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); } catch { /* not ready */ }
  return c;
}

const aCanvas = makeCanvas(AW, AW);
const aCtx = aCanvas.getContext('2d', { willReadFrequently: true });

function frameStats(src, w, h, prevGray) {
  const ah = Math.max(8, Math.round((AW * h) / (w || 1)));
  aCanvas.width = AW; aCanvas.height = ah;
  aCtx.drawImage(src, 0, 0, AW, ah);
  const { data } = aCtx.getImageData(0, 0, AW, ah);
  const n = AW * ah;
  const gray = new Float32Array(n);
  const hist = new Float32Array(64);
  let sumL = 0, sumL2 = 0, srg = 0, srg2 = 0, syb = 0, syb2 = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    gray[i] = L; sumL += L; sumL2 += L * L;
    const rg = (r - g) / 255, yb = (0.5 * (r + g) - b) / 255;
    srg += rg; srg2 += rg * rg; syb += yb; syb2 += yb * yb;
    hist[(r >> 6) * 16 + (g >> 6) * 4 + (b >> 6)]++;
  }
  const mean = sumL / n;
  const contrast = Math.sqrt(Math.max(0, sumL2 / n - mean * mean));
  const mrg = srg / n, myb = syb / n;
  const colorful = Math.sqrt(Math.max(0, srg2 / n - mrg * mrg) + Math.max(0, syb2 / n - myb * myb)) + 0.3 * Math.hypot(mrg, myb);
  let lap = 0;
  for (let y = 1; y < ah - 1; y++) for (let x = 1; x < AW - 1; x++) {
    const i = y * AW + x;
    lap += Math.abs(4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - AW] - gray[i + AW]);
  }
  const sharp = lap / ((AW - 2) * (ah - 2));
  let motion = 0;
  if (prevGray && prevGray.length === n) {
    for (let i = 0; i < n; i++) motion += Math.abs(gray[i] - prevGray[i]);
    motion /= n;
  }
  for (let i = 0; i < 64; i++) hist[i] /= n;
  return { mean, contrast, colorful, sharp, motion, gray, sig: hist };
}

function quality(s, faces = 0) {
  const expo = 1 - Math.pow(clamp(Math.abs(s.mean - 0.5) / 0.42, 0, 1), 2);
  const sharp = clamp(s.sharp / 0.07, 0, 1);
  const con = clamp(s.contrast / 0.24, 0, 1);
  const col = clamp(s.colorful / 0.35, 0, 1);
  let q = 0.32 * sharp + 0.18 * con + 0.2 * col + 0.3 * expo;
  if (s.mean < 0.08 || s.mean > 0.95) q *= 0.4; // black / blown-out frames
  if (faces) q = Math.min(1, q + 0.12 + 0.04 * Math.min(3, faces));
  return q;
}

async function countFaces(src) {
  if (!faceDetector) return 0;
  try { const f = await faceDetector.detect(src); return f.length; } catch { return 0; }
}

export async function analyzeMedia(m) {
  if (m.type === 'image') {
    const s = frameStats(m.el, m.width, m.height, null);
    const faces = await countFaces(m.poster);
    const q = quality(s, faces);
    m.analysis = { score: q, faces, sig: s.sig, samples: [{ t: 0, q, motion: 0 }], brightness: s.mean };
    return m.analysis;
  }
  const v = createVideoEl(m.url);
  await waitEvent(v, 'loadedmetadata');
  try { await v.play(); v.pause(); } catch { /* ignore */ }
  const d = m.duration || 0.1;
  const count = Math.round(clamp(d / 0.5, 3, 28));
  const samples = [];
  let prev = null, prevT = 0;
  const sig = new Float32Array(64);
  for (let i = 0; i < count; i++) {
    const t = Math.min(d - 0.05, 0.05 + ((d - 0.1) * i) / Math.max(1, count - 1));
    await seekVideo(v, t);
    const s = frameStats(v, m.width, m.height, prev);
    const gap = Math.max(0.1, t - prevT);
    const motion = prev ? s.motion / gap : 0;
    samples.push({ t, q: quality(s), motion, sharp: s.sharp, mean: s.mean });
    for (let k = 0; k < 64; k++) sig[k] += s.sig[k] / count;
    prev = s.gray; prevT = t;
  }
  if (samples.length > 1) samples[0].motion = samples[1].motion;
  // Motion: a little movement is interesting; heavy shake with blur is not.
  for (const s of samples) {
    const mo = clamp(s.motion / 0.12, 0, 1.5);
    let bonus = mo < 1 ? 0.12 * mo : 0.12 - 0.15 * (mo - 1);
    if (mo > 0.9 && s.sharp < 0.03) bonus -= 0.15;
    s.score = clamp(s.q + bonus, 0, 1);
  }
  const sorted = samples.map((s) => s.score).sort((a, b) => b - a);
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
  const score = top.reduce((a, b) => a + b, 0) / top.length;
  const avgMotion = samples.reduce((a, s) => a + s.motion, 0) / samples.length;
  releaseVideo(v);
  m.analysis = { score, faces: 0, sig, samples, motion: avgMotion };
  return m.analysis;
}

export function releaseVideo(v) {
  try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
}

export function similarity(a, b) {
  // Histogram intersection, 0..1
  let s = 0;
  for (let i = 0; i < 64; i++) s += Math.min(a[i], b[i]);
  return s;
}
