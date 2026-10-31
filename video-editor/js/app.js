import { $, $$, clamp, uid, fmtTime, escapeHtml, rng, makeCanvas, sleep } from './util.js';
import { loadMedia, analyzeMedia } from './analyzer.js';
import { decodeAudioFile, analyzeAudio } from './beat.js';
import { TRACKS, renderTrack } from './music.js';
import { STYLES, TRANSITIONS, direct, layout, kenBurns, snapToBeats } from './director.js';
import { Renderer, FILTERS, FONTS } from './renderer.js';
import { Player } from './player.js';
import { exportVideo, canExport } from './exporter.js';
import { makeDemoFiles } from './demo.js';

// ---------------------------------------------------------------- state
const S = {
  media: [],
  track: null,            // { id, name, buffer, analysis }
  trackCache: new Map(),
  style: 'energetic',
  length: 'auto',
  aspect: '9:16',
  title: '',
  bestPart: true,
  seed: 1,
  P: null,                // the project being edited
  tab: 'clips',
  selClip: null,
  selOv: null,
  undo: [], redo: [],
  draw: { color: '#ffffff', width: 14, neon: false, outline: false, strokes: [] },
};
const mediaById = (id) => S.media.find((m) => m.id === id);

const ASPECTS = {
  '9:16': { name: '9:16 סטורי', w: 9, h: 16 },
  '4:5': { name: '4:5 פוסט', w: 4, h: 5 },
  '1:1': { name: '1:1 ריבוע', w: 1, h: 1 },
  '16:9': { name: '16:9 רוחבי', w: 16, h: 9 },
};
const LENGTHS = { auto: 'אוטומטי', 15: '15 שנ׳', 30: '30 שנ׳', 60: 'דקה', full: 'כל השיר' };
const COLORS = ['#ffffff', '#111111', '#ff4d5e', '#ffb53d', '#ffe14d', '#4fe0b5', '#3db6ff', '#8a6bff', '#ff6bd6', '#7cff4f'];
const STICKERS = ['❤️', '🔥', '😂', '😍', '🥳', '✨', '⭐', '🎉', '💯', '👑', '😎', '🌈', '☀️', '🌙', '⚡', '💥', '🎶', '📍', '✈️', '🏖️', '🌴', '🍕', '🍦', '🎂', '🎁', '🐶', '🐱', '🦄', '🌸', '⚽', '🏀', '🎮', '📸', '💪', '🙌', '👏', '🤩', '😜', '🥰', '💖', '💫', '👀', '🙈', '🤯', '😭', '🫶', '➡️', '⬇️', '✔️', '❗'];
const BADGES = [
  { text: 'WOW', bg: '#ff4d5e' }, { text: 'מזל טוב!', bg: '#8a6bff' }, { text: 'חג שמח', bg: '#ffb53d', color: '#111' },
  { text: 'LOL', bg: '#3db6ff' }, { text: 'אוהבת ❤', bg: '#ff6bd6' }, { text: 'סוף שבוע', bg: '#4fe0b5', color: '#111' },
  { text: 'OMG', bg: '#111', color: '#ffe14d' }, { text: 'יום הולדת שמח', bg: '#ff7a45' }, { text: 'החופש הגדול', bg: '#3db6ff' },
];
const ANIMS = { pop: 'קפיצה', fade: 'דהייה', slide: 'החלקה', type: 'הקלדה', beat: 'על הביט', wiggle: 'נדנוד', none: 'בלי' };
const TEXT_STYLES = { plain: 'צל', outline: 'קו מתאר', box: 'רקע', neon: 'ניאון', badge: 'מדבקה' };

// ---------------------------------------------------------------- helpers
function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function show(name) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
  if (name === 'editor') requestAnimationFrame(fitCanvas);
}

function openSheet(html, onMount) {
  const sh = $('#sheet');
  sh.innerHTML = html;
  sh.hidden = false; $('#sheet-back').hidden = false;
  onMount?.(sh);
}
function closeSheet() {
  $('#sheet').hidden = true; $('#sheet-back').hidden = true;
  $('#sheet').innerHTML = '';
  closeSheet.onClose?.(); closeSheet.onClose = null;
}
$('#sheet-back').addEventListener('click', () => { if (!closeSheet.locked) closeSheet(); });

let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = player?.audio() || new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// ---------------------------------------------------------------- 1. media
for (const id of ['#file-media', '#file-videos', '#file-photos']) {
  $(id).addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    await addFiles(files);
  });
}
$('#btn-demo').addEventListener('click', async () => {
  toast('יוצרים תמונות לדוגמה…');
  await addFiles(await makeDemoFiles());
});

async function addFiles(files) {
  if (!files.length) return;
  $('#home-empty').hidden = true;
  $('#home-picked').hidden = false;
  $('#home-cta').hidden = false;
  const startIdx = S.media.length;
  const pending = files.map((f, i) => ({ id: 'p' + i, pending: true, name: f.name }));
  renderGrid(pending);
  const failed = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const m = await loadMedia(files[i], startIdx + i);
      S.media.push(m);
    } catch (err) {
      console.warn(err);
      failed.push(files[i].name || 'קובץ');
    }
    renderGrid(pending.slice(i + 1));
  }
  const added = S.media.slice(startIdx);
  const nv = added.filter((m) => m.type === 'video').length;
  if (failed.length) {
    openSheet(`<h3>${failed.length === 1 ? 'קובץ אחד לא נפתח' : `${failed.length} קבצים לא נפתחו`}</h3>
      <p class="note">${failed.map(escapeHtml).join('<br>')}</p>
      <p class="note">הדפדפן לא הצליח לנגן אותם. זה קורה בעיקר עם סרטוני HEVC מאייפון בכרום או באנדרואיד. מה אפשר לעשות: לפתוח את קליפי בספארי, או לשנות באייפון את הגדרות ← מצלמה ← פורמטים ל"תואם ביותר".</p>
      <button type="button" class="btn" id="fail-ok">הבנתי</button>`, (sh) => $('#fail-ok', sh).addEventListener('click', closeSheet));
  } else if (added.length) {
    toast(`נוספו ${nv} סרטונים ו-${added.length - nv} תמונות`);
  }
  if (!S.media.length) { $('#home-empty').hidden = false; $('#home-picked').hidden = true; $('#home-cta').hidden = true; }
  return added;
}

function renderGrid(pending = []) {
  const g = $('#media-grid');
  const n = S.media.length;
  $('#picked-count').textContent = `${n} ${n === 1 ? 'פריט' : 'פריטים'}`;
  g.innerHTML = S.media.map((m) => `
    <div class="tile" data-id="${m.id}">
      <img src="${m.thumb}" alt="">
      ${m.type === 'video' ? `<span class="dur">${fmtTime(m.duration)}</span>` : ''}
      ${m.analysis ? `<span class="score" title="ציון AI">${Math.round(m.analysis.score * 100)}</span>` : ''}
      <button class="x" data-del="${m.id}" aria-label="הסרה" type="button">✕</button>
    </div>`).join('') + pending.map(() => '<div class="tile loading"></div>').join('');
  $('#btn-to-music').disabled = n === 0;
}
$('#media-grid').addEventListener('click', (e) => {
  const id = e.target.closest('[data-del]')?.dataset.del;
  if (!id) return;
  S.media = S.media.filter((m) => m.id !== id);
  renderGrid();
  if (!S.media.length) { $('#home-empty').hidden = false; $('#home-picked').hidden = true; $('#home-cta').hidden = true; }
});
$('#btn-to-music').addEventListener('click', () => { renderTracks(); show('music'); });
$$('[data-back]').forEach((b) => b.addEventListener('click', () => { stopPreview(); show(b.dataset.back); }));

// ---------------------------------------------------------------- 2. music
let previewSrc = null;
function stopPreview() {
  if (previewSrc) { try { previewSrc.stop(); } catch { /* */ } previewSrc = null; }
  $$('.track .tplay').forEach((b) => (b.textContent = '▶'));
}

async function getBuiltin(id) {
  if (S.trackCache.has(id)) return S.trackCache.get(id);
  const t = TRACKS.find((x) => x.id === id);
  const { buffer, analysis } = await renderTrack(t);
  const tr = { id, name: t.name, buffer, analysis, builtin: true };
  S.trackCache.set(id, tr);
  return tr;
}

function renderTracks() {
  const list = $('#track-list');
  list.innerHTML = TRACKS.map((t) => `
    <button class="track ${S.track?.id === t.id ? 'on' : ''}" data-track="${t.id}" type="button">
      <span class="tplay" data-play="${t.id}">▶</span>
      <span><b>${t.name}</b><small>${t.vibe}</small></span>
      <span class="bpmtag" dir="ltr">${t.bpm} BPM</span>
    </button>`).join('');
  $('#btn-to-style').disabled = !S.track;
}

$('#track-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-track]');
  if (!btn) return;
  const id = btn.dataset.track;
  const playing = btn.querySelector('.tplay').textContent === '■';
  stopPreview();
  $$('.track').forEach((x) => x.classList.toggle('on', x === btn));
  $('#custom-music-name').textContent = 'MP3, M4A, WAV';
  btn.querySelector('.tplay').textContent = '…';
  const ctx = ac();
  ctx.resume?.();
  const tr = await getBuiltin(id);
  S.track = tr;
  $('#btn-to-style').disabled = false;
  if (playing) { btn.querySelector('.tplay').textContent = '▶'; return; }
  const src = ctx.createBufferSource();
  src.buffer = tr.buffer; src.connect(ctx.destination);
  src.start(0, tr.analysis.duration * 0.3);
  previewSrc = src;
  btn.querySelector('.tplay').textContent = '■';
  src.onended = () => { if (previewSrc === src) stopPreview(); };
});

$('#file-music').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  stopPreview();
  $('#custom-music-name').textContent = 'מנתחים את השיר…';
  try {
    const buffer = await decodeAudioFile(f, ac());
    const analysis = analyzeAudio(buffer);
    S.track = { id: 'custom', name: f.name.replace(/\.[^.]+$/, ''), buffer, analysis };
    $('#custom-music-name').textContent = `${S.track.name} · ${Math.round(analysis.bpm)} BPM`;
    $$('.track').forEach((x) => x.classList.remove('on'));
    $('#btn-to-style').disabled = false;
    if (S.P) { applyNewTrack(); closeSheet(); }
  } catch (err) {
    console.warn(err);
    $('#custom-music-name').textContent = 'הקובץ לא נתמך. נסו MP3 או M4A';
  }
});
$('#btn-to-style').addEventListener('click', () => { stopPreview(); renderStyleScreen(); show('style'); });

// ---------------------------------------------------------------- 3. style
function suggestTitle() {
  const times = S.media.map((m) => m.time).filter(Boolean).sort();
  if (!times.length) return 'הרגעים שלנו';
  const d = new Date(times[Math.floor(times.length / 2)]);
  return 'רגעים מ' + d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

function chipRow(el, map, cur, attr) {
  el.innerHTML = Object.entries(map).map(([k, v]) => `<button type="button" class="chip ${String(cur) === k ? 'on' : ''}" data-${attr}="${k}">${typeof v === 'string' ? v : v.name}</button>`).join('');
}

function renderStyleScreen() {
  $('#style-list').innerHTML = Object.entries(STYLES).map(([k, s]) => `
    <button type="button" class="style-card ${S.style === k ? 'on' : ''}" data-style="${k}">
      <span class="em">${s.emoji}</span><b>${s.name}</b><small>${s.desc}</small>
    </button>`).join('');
  chipRow($('#length-chips'), LENGTHS, S.length, 'len');
  chipRow($('#aspect-chips'), ASPECTS, S.aspect, 'aspect');
  $('#title-input').placeholder = suggestTitle();
  $('#title-input').value = S.title;
}
$('#style-list').addEventListener('click', (e) => { const b = e.target.closest('[data-style]'); if (b) { S.style = b.dataset.style; renderStyleScreen(); } });
$('#length-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-len]'); if (b) { S.length = b.dataset.len; renderStyleScreen(); } });
$('#aspect-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-aspect]'); if (b) { S.aspect = b.dataset.aspect; renderStyleScreen(); } });
$('#title-input').addEventListener('input', (e) => { S.title = e.target.value; });
$('#best-part').addEventListener('change', (e) => { S.bestPart = e.target.checked; });

// ---------------------------------------------------------------- 4. AI processing
$('#btn-make').addEventListener('click', makeVideo);

async function makeVideo() {
  show('process');
  const steps = [
    ['music', 'מנתחים את השיר ומוצאים את הביט'],
    ['media', 'צופים בכל הסרטונים והתמונות'],
    ['pick', 'בוחרים את הרגעים הכי טובים'],
    ['sync', 'מסנכרנים קאטים ומעברים לקצב'],
  ];
  $('#proc-steps').innerHTML = steps.map(([k, l]) => `<li data-step="${k}">${l}</li>`).join('');
  const mark = (k, st, label) => {
    const li = $(`[data-step="${k}"]`);
    li.className = st;
    if (label) li.textContent = label;
  };
  const bar = $('#proc-bar');
  bar.style.width = '0%';
  mark('music', 'doing');
  await sleep(60);
  const a = S.track.analysis;
  mark('music', 'done');
  $('[data-step="music"]').innerHTML = `קצב השיר: <bdi>${Math.round(a.bpm)} BPM</bdi>`;
  mark('media', 'doing');
  const todo = S.media.filter((m) => !m.analysis);
  for (let i = 0; i < todo.length; i++) {
    try { await analyzeMedia(todo[i]); } catch (err) { console.warn(err); todo[i].analysis = { score: 0.3, sig: new Float32Array(64), samples: [{ t: 0, q: 0.3, score: 0.3, motion: 0 }] }; }
    bar.style.width = `${10 + (75 * (i + 1)) / todo.length}%`;
    $('[data-step="media"]').textContent = `צופים במדיה (${i + 1}/${todo.length})`;
  }
  const vids = S.media.filter((m) => m.type === 'video').length;
  mark('media', 'done', `נותחו ${S.media.length} פריטים${vids ? `, מתוכם ${vids} סרטונים` : ''}`);
  mark('pick', 'doing');
  await sleep(150);
  buildProject({ keepOverlays: false });
  bar.style.width = '92%';
  const used = new Set(S.P.clips.map((c) => c.mediaId)).size;
  mark('pick', 'done', `נבחרו ${S.P.clips.length} קטעים מתוך ${used} פריטים`);
  mark('sync', 'doing');
  await sleep(250);
  mark('sync', 'done');
  bar.style.width = '100%';
  await sleep(300);
  enterEditor();
}

function styleDefaults(style) {
  const st = STYLES[style];
  return { filter: st.filter, pulse: st.pulse, letterbox: !!st.letterbox, fadeEdges: style === 'cinematic' || style === 'chill' };
}

function buildProject({ keepOverlays }) {
  const res = direct(S.media, S.track, { style: S.style, length: S.length, seed: S.seed, fromStart: !S.bestPart });
  const old = S.P;
  const d = styleDefaults(S.style);
  S.P = {
    clips: res.clips,
    overlays: keepOverlays && old ? old.overlays : [],
    filter: keepOverlays && old?.filterLocked ? old.filter : d.filter,
    filterLocked: keepOverlays && old?.filterLocked,
    pulse: d.pulse, letterbox: d.letterbox, fadeEdges: d.fadeEdges,
    style: S.style, aspect: S.aspect,
    musicOffset: res.musicOffset,
    musicVolume: old?.musicVolume ?? 1,
    origVolume: old?.origVolume ?? 0,
    fadeOut: old?.fadeOut ?? true,
    music: S.track,
    duration: 0,
  };
  S.P.duration = layout(S.P.clips);
  if (!keepOverlays && (S.title || '').trim()) addTitleOverlay(S.title.trim());
  for (const o of S.P.overlays) { o.end = Math.min(o.end, S.P.duration); o.start = Math.min(o.start, Math.max(0, S.P.duration - 0.5)); }
  refreshBeats();
}

function addTitleOverlay(text) {
  const looks = {
    energetic: { font: 'heebo', style: 'outline', anim: 'pop', color: '#ffffff', size: 120 },
    chill: { font: 'varela', style: 'plain', anim: 'fade', color: '#ffffff', size: 96 },
    cinematic: { font: 'suez', style: 'plain', anim: 'fade', color: '#f4e6c8', size: 100 },
    vlog: { font: 'rubik', style: 'box', anim: 'slide', color: '#ffffff', size: 84 },
    retro: { font: 'secular', style: 'neon', anim: 'type', color: '#ff6bd6', size: 104 },
  };
  const l = looks[S.style] || looks.energetic;
  const b = S.P.music.analysis.beats.map((x) => x - S.P.musicOffset).filter((x) => x > 0.1);
  const end = Math.min(S.P.duration, b[7] ?? 3.2);
  S.P.overlays.push({ id: uid('o'), kind: 'text', text, x: 0.5, y: 0.45, scale: 1, rot: 0, start: 0.15, end, ...l });
}

function refreshBeats() {
  const P = S.P;
  const a = P.music.analysis;
  P.beats = a.beats.map((b) => b - P.musicOffset).filter((b) => b >= -0.01 && b <= P.duration + 0.01);
  const first = a.beats.length - a.beats.filter((b) => b >= P.musicOffset - 0.01).length;
  P.downbeats = new Set();
  P.beats.forEach((_, i) => { if ((first + i - a.downbeatPhase) % 4 === 0) P.downbeats.add(i); });
}

// ---------------------------------------------------------------- 5. editor
const renderer = new Renderer();
const canvas = $('#cv');
const player = new Player(canvas, renderer, () => S.P, mediaById);

function enterEditor() {
  S.undo = []; S.redo = [];
  S.selClip = null; S.selOv = null;
  setCanvasSize();
  show('editor');
  setTab('clips');
  player.seek(0);
  renderScrub();
  updateHist();
  updateBpmLabel();
}

function previewSize(aspect) {
  const a = ASPECTS[aspect];
  const short = 540;
  return a.w < a.h ? [short, Math.round((short * a.h) / a.w / 2) * 2] : a.w === a.h ? [720, 720] : [Math.round((short * a.w) / a.h / 2) * 2, short];
}
function setCanvasSize() {
  const [w, h] = previewSize(S.P.aspect);
  canvas.width = w; canvas.height = h;
  fitCanvas();
  player.invalidate();
}
function fitCanvas() {
  const st = $('#stage');
  const r = st.getBoundingClientRect();
  if (!r.width || !S.P) return;
  const cs = getComputedStyle(st);
  const aw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const k = Math.min(aw / canvas.width, ah / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * k)}px`;
  canvas.style.height = `${Math.floor(canvas.height * k)}px`;
}
window.addEventListener('resize', fitCanvas);

// ---- history
const SNAP_KEYS = ['clips', 'overlays', 'filter', 'filterLocked', 'pulse', 'letterbox', 'fadeEdges', 'style', 'aspect', 'musicOffset', 'musicVolume', 'origVolume', 'fadeOut'];
function snapshot() {
  const o = {};
  for (const k of SNAP_KEYS) o[k] = S.P[k];
  return JSON.stringify({ p: o, track: S.P.music.id });
}
function restore(json) {
  const { p, track } = JSON.parse(json);
  Object.assign(S.P, p);
  if (track !== S.P.music.id) {
    const tr = track === 'custom' ? S.track : S.trackCache.get(track);
    if (tr) { S.P.music = tr; S.track = tr; }
  }
  afterChange({ aspect: true });
}
function mutate(fn, opts = {}) {
  S.undo.push(snapshot());
  if (S.undo.length > 60) S.undo.shift();
  S.redo = [];
  fn();
  afterChange(opts);
}
function afterChange(opts = {}) {
  S.P.duration = layout(S.P.clips);
  refreshBeats();
  if (opts.aspect) setCanvasSize();
  if (player.time > S.P.duration) player.seek(S.P.duration);
  if (S.selClip && !S.P.clips.some((c) => c.id === S.selClip)) S.selClip = null;
  if (S.selOv && !S.P.overlays.some((o) => o.id === S.selOv)) S.selOv = null;
  syncDrawOpts();
  player.invalidate();
  renderScrub();
  if (!opts.keepPanel) renderPanel();
  updateHist();
  updateBpmLabel();
  if (player.playing && opts.restart) { player.pause(); player.play(); }
}
function updateBpmLabel() {
  $('#bpm').innerHTML = `<bdi>${Math.round(S.P.music.analysis.bpm)} BPM</bdi> · ${S.P.clips.length} קטעים`;
}
function updateHist() {
  $('#btn-undo').disabled = !S.undo.length;
  $('#btn-redo').disabled = !S.redo.length;
}
$('#btn-undo').addEventListener('click', () => { if (!S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); toast('בוטל'); });
$('#btn-redo').addEventListener('click', () => { if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); });

// ---- transport
player.on('time', (t) => updateTime(t));
player.on('state', (p) => { $('#btn-play').textContent = p ? '❚❚' : '▶'; $('#btn-play').setAttribute('aria-label', p ? 'השהה' : 'נגן'); });
$('#btn-play').addEventListener('click', () => { if (S.tab === 'draw' && S.draw.strokes.length) commitDrawing(); player.toggle(); });
function updateTime(t) {
  $('#time').textContent = `${fmtTime(t)} / ${fmtTime(S.P.duration)}`;
  $('#playhead').style.left = `${(t / S.P.duration) * 100}%`;
  if (S.tab === 'clips' && player.playing) {
    const c = S.P.clips.find((x) => t >= x.start && t < x.start + x.dur);
    $$('.scrub-clips div').forEach((d) => d.classList.toggle('sel', d.dataset.id === c?.id));
  }
}

function renderScrub() {
  const P = S.P;
  $('#scrub-clips').innerHTML = P.clips.map((c) => {
    const m = mediaById(c.mediaId);
    return `<div data-id="${c.id}" class="${c.id === S.selClip ? 'sel' : ''}" style="width:${(c.dur / P.duration) * 100}%;background-image:url(${m?.thumb || ''})"></div>`;
  }).join('');
  $('#scrub-beats').innerHTML = P.beats.map((b, i) => `<i class="${P.downbeats.has(i) ? 'd' : ''}" style="left:${(b / P.duration) * 100}%"></i>`).join('');
  $('#scrub-ov').innerHTML = P.overlays.map((o) => `<i class="${o.id === S.selOv ? 'sel' : ''}" style="left:${(o.start / P.duration) * 100}%;width:${((o.end - o.start) / P.duration) * 100}%"></i>`).join('');
  updateTime(player.time);
}

(() => {
  const sc = $('#scrub');
  let down = false;
  const at = (e) => {
    const r = sc.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1) * S.P.duration;
  };
  sc.addEventListener('pointerdown', (e) => { down = true; sc.setPointerCapture(e.pointerId); if (player.playing) player.pause(); player.seek(at(e)); });
  sc.addEventListener('pointermove', (e) => { if (down) player.seek(at(e)); });
  const up = (e) => {
    if (!down) return;
    down = false;
    if (S.tab === 'clips') {
      const t = at(e);
      const c = S.P.clips.find((x) => t >= x.start && t < x.start + x.dur);
      if (c && c.id !== S.selClip) { S.selClip = c.id; renderPanel(); renderScrub(); }
    }
  };
  sc.addEventListener('pointerup', up);
  sc.addEventListener('pointercancel', up);
})();

// ---- tabs
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) setTab(b.dataset.tab);
});
function setTab(tab) {
  if (S.tab === 'draw' && tab !== 'draw' && S.draw.strokes.length) commitDrawing();
  S.tab = tab;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#stage').classList.toggle('drawing', tab === 'draw');
  $('#draw-hint').hidden = tab !== 'draw';
  if (tab === 'draw') player.pause();
  if (tab !== 'text' && tab !== 'stickers' && tab !== 'draw') S.selOv = null;
  syncDrawOpts();
  renderPanel();
  renderScrub();
}

function syncDrawOpts() {
  player.drawOpts = {
    selectedId: S.selOv,
    showSelected: !player.playing,
    pending: S.draw.strokes.length ? { id: 'pending', kind: 'draw', strokes: S.draw.strokes, x: 0.5, y: 0.5, scale: 1, rot: 0, start: 0, end: 1e9, anim: 'none', drawOn: false } : null,
  };
  player.invalidate();
  renderOvBar();
}
player.on('state', () => syncDrawOpts());

// ---------------------------------------------------------------- panels
const panel = $('#panel');
function renderPanel() {
  const fn = { clips: panelClips, text: panelText, stickers: panelStickers, draw: panelDraw, filters: panelFilters, music: panelMusic, style: panelStyle }[S.tab];
  panel.innerHTML = fn();
  if (S.tab === 'filters') drawFilterThumbs();
  const sel = panel.querySelector('.cl.sel');
  if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
}
const selClip = () => S.P.clips.find((c) => c.id === S.selClip);
const selOv = () => S.P.overlays.find((o) => o.id === S.selOv);

function panelClips() {
  const P = S.P;
  const strip = P.clips.map((c, i) => {
    const m = mediaById(c.mediaId);
    const w = clamp(c.dur * 26, 40, 110);
    const tr = i > 0 ? `<button type="button" class="tr ${c.transition.type !== 'cut' ? 'has' : ''}" data-tr="${c.id}" aria-label="מעבר">${c.transition.type === 'cut' ? '|' : '⟷'}</button>` : '';
    return `${tr}<button type="button" class="cl ${c.id === S.selClip ? 'sel' : ''}" data-clip="${c.id}" style="width:${w}px;background-image:url(${m?.thumb})"><span>${c.dur.toFixed(1)}</span></button>`;
  }).join('');
  const c = selClip();
  let detail = `<div class="row"><button type="button" class="btn accent" data-act="remix">🔀 ערבוב AI</button><button type="button" class="btn" data-act="add-media">＋ הוספת מדיה</button><button type="button" class="btn" data-act="snap">🎯 יישור לביט</button></div>
    <p class="empty-note">לוחצים על קטע כדי לערוך אותו, או על ⟷ כדי לבחור מעבר.</p>`;
  if (c) {
    const m = mediaById(c.mediaId);
    const isV = m.type === 'video';
    const beat = 60 / P.music.analysis.bpm;
    const maxIn = isV ? Math.max(0, m.duration - c.dur * c.speed) : 0;
    detail = `
      <div class="row nowrap">
        <button type="button" class="btn" data-act="left" aria-label="הזז אחורה">◀</button>
        <button type="button" class="btn" data-act="right" aria-label="הזז קדימה">▶</button>
        <button type="button" class="btn" data-act="replace">🔄 החלפה</button>
        <button type="button" class="btn" data-act="dup">⧉ שכפול</button>
        <button type="button" class="btn" data-act="fit">${c.fit === 'contain' ? '⬜ מלא מסך' : '🔲 תמונה מלאה'}</button>
        <button type="button" class="btn danger" data-act="del">🗑 מחיקה</button>
        <button type="button" class="btn" data-act="desel" aria-label="סגירה">✕</button>
      </div>
      <div class="row"><span class="lbl">אורך</span>
        <button type="button" class="btn" data-act="shorter">− ביט</button>
        <span class="val">${c.dur.toFixed(2)} שנ׳</span>
        <button type="button" class="btn" data-act="longer">+ ביט</button>
        <span class="empty-note">ביט = ${beat.toFixed(2)} שנ׳</span>
      </div>
      ${isV ? `<div class="row"><span class="lbl">התחלה</span><input type="range" id="r-in" min="0" max="${maxIn.toFixed(2)}" step="0.05" value="${c.in.toFixed(2)}" ${maxIn <= 0 ? 'disabled' : ''}><span class="val" id="v-in">${c.in.toFixed(1)}</span></div>
      <div class="row"><span class="lbl">מהירות</span>${[0.5, 0.75, 1, 1.5, 2].map((s) => `<button type="button" class="btn ${Math.abs(c.speed - s) < 0.01 ? 'on' : ''}" data-speed="${s}">${s}x</button>`).join('')}</div>
      <div class="row"><span class="lbl">סאונד מקורי</span><input type="range" id="r-vol" min="0" max="1" step="0.05" value="${c.volume ?? 1}"></div>` : ''}
      <div class="row"><span class="lbl">זום</span><input type="range" id="r-zoom" min="1" max="2" step="0.02" value="${c.zoom || 1}"></div>
      <div class="row nowrap"><span class="lbl">פילטר</span><button type="button" class="btn ${!c.filter ? 'on' : ''}" data-cfilter="">כמו הסרט</button>${Object.entries(FILTERS).map(([k, f]) => `<button type="button" class="btn ${c.filter === k ? 'on' : ''}" data-cfilter="${k}">${f.name}</button>`).join('')}</div>`;
  }
  return `<div class="strip" dir="ltr">${strip}</div>${detail}`;
}

function panelOverlayControls(o) {
  if (!o) return '';
  return `
    <div class="row nowrap">
      ${o.kind === 'text' ? '<button type="button" class="btn" data-act="ov-edit">✎ עריכה</button>' : ''}
      <button type="button" class="btn" data-act="ov-start">⇤ מתחיל עכשיו</button>
      <button type="button" class="btn" data-act="ov-end">⇥ נגמר עכשיו</button>
      <button type="button" class="btn" data-act="ov-all">כל הסרטון</button>
      <button type="button" class="btn" data-act="ov-dup">⧉</button>
      <button type="button" class="btn danger" data-act="ov-del">🗑</button>
    </div>
    <div class="row"><span class="lbl">זמן</span><span class="val" dir="ltr">${fmtTime(o.start)}.${Math.floor((o.start % 1) * 10)} – ${fmtTime(o.end)}.${Math.floor((o.end % 1) * 10)}</span>
      ${[1, 2, 3, 5].map((d) => `<button type="button" class="btn" data-ovdur="${d}">${d} שנ׳</button>`).join('')}</div>
    <div class="row"><span class="lbl">גודל</span><input type="range" id="r-scale" min="0.2" max="4" step="0.02" value="${o.scale}"></div>
    <div class="row"><span class="lbl">סיבוב</span><input type="range" id="r-rot" min="-3.14" max="3.14" step="0.01" value="${o.rot || 0}"></div>
    <div class="row nowrap"><span class="lbl">אנימציה</span>${Object.entries(ANIMS).map(([k, v]) => `<button type="button" class="btn ${o.anim === k ? 'on' : ''}" data-anim="${k}">${v}</button>`).join('')}</div>`;
}

function textStyleControls(o) {
  return `
    <div class="swatches">${COLORS.map((c) => `<button type="button" class="sw ${o.color === c ? 'on' : ''}" style="background:${c}" data-tcolor="${c}" aria-label="צבע"></button>`).join('')}</div>
    <div class="row nowrap"><span class="lbl">סגנון</span>${Object.entries(TEXT_STYLES).map(([k, v]) => `<button type="button" class="btn ${o.style === k ? 'on' : ''}" data-tstyle="${k}">${v}</button>`).join('')}</div>
    ${o.style === 'box' || o.style === 'badge' || o.style === 'outline' ? `<div class="swatches"><span class="lbl">רקע/קו</span>${COLORS.map((c) => `<button type="button" class="sw ${o.bg === c ? 'on' : ''}" style="background:${c}" data-tbg="${c}" aria-label="צבע רקע"></button>`).join('')}</div>` : ''}
    <div class="row nowrap"><span class="lbl">גופן</span>${Object.entries(FONTS).map(([k, f]) => `<button type="button" class="btn ${o.font === k ? 'on' : ''}" data-tfont="${k}" style="font:${f.css.replace('{s}', 15)}">${f.name}</button>`).join('')}</div>`;
}

function overlaysChips(kind) {
  const list = S.P.overlays.filter((o) => o.kind === kind);
  if (!list.length) return '';
  return `<div class="row nowrap">${list.map((o) => `<button type="button" class="btn ${o.id === S.selOv ? 'on' : ''}" data-selov="${o.id}">${kind === 'text' ? escapeHtml(o.text.slice(0, 14)) : kind === 'sticker' ? o.emoji : '✏️ ' + fmtTime(o.start)}</button>`).join('')}</div>`;
}

function panelText() {
  const o = selOv();
  const isText = o && o.kind === 'text';
  return `<div class="row"><button type="button" class="btn accent" data-act="add-text">＋ הוספת טקסט</button><span class="empty-note">הטקסט יופיע מהרגע הנוכחי. גוררים כדי להזיז, צובטים להגדלה.</span></div>
    ${overlaysChips('text')}
    ${isText ? textStyleControls(o) + panelOverlayControls(o) : ''}`;
}

function panelStickers() {
  const o = selOv();
  const isSt = o && (o.kind === 'sticker' || (o.kind === 'text' && o.style === 'badge'));
  return `${isSt ? panelOverlayControls(o) : ''}
    <div class="badges">${BADGES.map((b, i) => `<button type="button" class="badge" data-badge="${i}" style="background:${b.bg};color:${b.color || '#fff'}">${b.text}</button>`).join('')}</div>
    <div class="stickers">${STICKERS.map((s) => `<button type="button" data-sticker="${s}">${s}</button>`).join('')}</div>
    ${overlaysChips('sticker')}`;
}

function panelDraw() {
  const d = S.draw;
  const o = selOv();
  return `
    <div class="swatches">${COLORS.map((c) => `<button type="button" class="sw ${d.color === c ? 'on' : ''}" style="background:${c}" data-dcolor="${c}" aria-label="צבע"></button>`).join('')}</div>
    <div class="row"><span class="lbl">עובי</span><input type="range" id="r-width" min="4" max="48" step="1" value="${d.width}">
      <button type="button" class="btn ${d.neon ? 'on' : ''}" data-act="neon">✦ ניאון</button>
      <button type="button" class="btn ${d.outline ? 'on' : ''}" data-act="outline">◯ מסגרת</button></div>
    <div class="row"><button type="button" class="btn" data-act="undo-stroke" ${d.strokes.length ? '' : 'disabled'}>↶ קו אחרון</button>
      <button type="button" class="btn accent" data-act="commit-draw" ${d.strokes.length ? '' : 'disabled'}>✓ סיום השרבוט</button>
      <span class="empty-note">השרבוט יופיע מהרגע הנוכחי ל-3 שניות, עם אנימציית ציור.</span></div>
    ${overlaysChips('draw')}
    ${o && o.kind === 'draw' ? panelOverlayControls(o) : ''}`;
}

function panelFilters() {
  const P = S.P;
  return `<div class="fgrid">${Object.entries(FILTERS).map(([k, f]) => `<button type="button" class="ftile ${P.filter === k ? 'on' : ''}" data-filter="${k}"><canvas width="96" height="96" data-fthumb="${k}"></canvas>${f.name}</button>`).join('')}</div>
    <div class="row">
      <button type="button" class="btn ${P.pulse ? 'on' : ''}" data-act="pulse">💓 פעימה על הביט</button>
      <button type="button" class="btn ${P.letterbox ? 'on' : ''}" data-act="letterbox">🎬 פסים קולנועיים</button>
      <button type="button" class="btn ${P.fadeEdges ? 'on' : ''}" data-act="fadeedges">🌑 כניסה ויציאה בשחור</button>
    </div>`;
}

function drawFilterThumbs() {
  const c = S.P.clips.find((x) => x.start <= player.time && player.time < x.start + x.dur) || S.P.clips[0];
  const m = c && mediaById(c.mediaId);
  if (!m) return;
  const tmp = makeCanvas(96, 96);
  const tctx = tmp.getContext('2d');
  const src = m.poster;
  const k = Math.max(96 / src.width, 96 / src.height);
  $$('[data-fthumb]', panel).forEach((cv) => {
    tctx.drawImage(src, (96 - src.width * k) / 2, (96 - src.height * k) / 2, src.width * k, src.height * k);
    renderer.grader.apply(tmp, FILTERS[cv.dataset.fthumb]);
    cv.getContext('2d').drawImage(tmp, 0, 0);
  });
}

function panelMusic() {
  const P = S.P;
  const a = P.music.analysis;
  return `
    <div class="row"><b>♪ ${escapeHtml(P.music.name)}</b><span class="empty-note"><bdi>${Math.round(a.bpm)} BPM</bdi> · מתחיל ב-<bdi>${fmtTime(P.musicOffset)}</bdi></span>
      <button type="button" class="btn" data-act="change-music">החלפת שיר</button></div>
    <div class="row"><span class="lbl">מוזיקה</span><input type="range" id="r-mvol" min="0" max="1" step="0.05" value="${P.musicVolume}"></div>
    <div class="row"><span class="lbl">סאונד מקורי</span><input type="range" id="r-ovol" min="0" max="1" step="0.05" value="${P.origVolume}"></div>
    <div class="row">
      <button type="button" class="btn ${P.fadeOut ? 'on' : ''}" data-act="fadeout">📉 דעיכה בסוף</button>
      <button type="button" class="btn" data-act="music-earlier">⏪ קטע מוקדם יותר</button>
      <button type="button" class="btn" data-act="music-later">⏩ קטע מאוחר יותר</button>
    </div>`;
}

function panelStyle() {
  return `<div class="row nowrap">${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="btn ${S.P.style === k ? 'on' : ''}" data-restyle="${k}">${s.emoji} ${s.name}</button>`).join('')}</div>
    <div class="row nowrap"><span class="lbl">אורך</span>${Object.entries(LENGTHS).map(([k, v]) => `<button type="button" class="btn ${String(S.length) === k ? 'on' : ''}" data-relen="${k}">${v}</button>`).join('')}</div>
    <div class="row nowrap"><span class="lbl">פורמט</span>${Object.entries(ASPECTS).map(([k, v]) => `<button type="button" class="btn ${S.P.aspect === k ? 'on' : ''}" data-reaspect="${k}">${v.name}</button>`).join('')}</div>
    <p class="empty-note">שינוי סגנון או אורך יוצר עריכה חדשה. הטקסטים, הסטיקרים והשרבוטים נשמרים.</p>`;
}

// ---- panel events
panel.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t || t.disabled) return;
  const d = t.dataset;
  const P = S.P;
  if (d.clip) {
    S.selClip = d.clip === S.selClip ? null : d.clip;
    const c = selClip();
    if (c) player.seek(c.start + Math.min(0.05, c.dur / 2) + (c.transition.dur || 0) / 2);
    renderPanel(); renderScrub(); return;
  }
  if (d.tr) return transitionSheet(d.tr);
  if (d.speed) return mutate(() => { const c = selClip(); c.speed = +d.speed; fixClipIn(c); });
  if (d.cfilter !== undefined) return mutate(() => { selClip().filter = d.cfilter || null; });
  if (d.filter) return mutate(() => { P.filter = d.filter; P.filterLocked = true; });
  if (d.selov) { S.selOv = d.selov; const o = selOv(); if (player.time < o.start || player.time > o.end) player.seek(o.start + 0.5); syncDrawOpts(); renderPanel(); renderScrub(); return; }
  if (d.tcolor) return mutate(() => { selOv().color = d.tcolor; });
  if (d.tbg) return mutate(() => { selOv().bg = d.tbg; });
  if (d.tstyle) return mutate(() => { selOv().style = d.tstyle; });
  if (d.tfont) return mutate(() => { selOv().font = d.tfont; });
  if (d.anim) return mutate(() => { selOv().anim = d.anim; });
  if (d.ovdur) return mutate(() => { const o = selOv(); o.end = Math.min(P.duration, o.start + +d.ovdur); });
  if (d.dcolor) { S.draw.color = d.dcolor; renderPanel(); return; }
  if (d.sticker) return addSticker(d.sticker);
  if (d.badge) return addBadge(BADGES[+d.badge]);
  if (d.restyle) { S.style = d.restyle; return regenerate('הסגנון עודכן'); }
  if (d.relen) { S.length = d.relen; return regenerate('האורך עודכן'); }
  if (d.reaspect) return mutate(() => { P.aspect = d.reaspect; S.aspect = d.reaspect; }, { aspect: true });
  if (d.act) actions[d.act]?.();
});

panel.addEventListener('input', (e) => {
  const id = e.target.id;
  const v = +e.target.value;
  const P = S.P;
  // Sliders update live; one undo step is recorded on 'change'.
  if (!panel._snap) { panel._snap = snapshot(); }
  if (id === 'r-in') { selClip().in = v; $('#v-in').textContent = v.toFixed(1); player.seek(selClip().start + 0.05); }
  if (id === 'r-vol') selClip().volume = v;
  if (id === 'r-zoom') selClip().zoom = v;
  if (id === 'r-scale') selOv().scale = v;
  if (id === 'r-rot') selOv().rot = v;
  if (id === 'r-mvol') { P.musicVolume = v; if (player.musicGain) player.musicGain.gain.value = v; }
  if (id === 'r-ovol') P.origVolume = v;
  if (id === 'r-width') { S.draw.width = v; panel._snap = null; return; }
  player.invalidate();
});
panel.addEventListener('change', (e) => {
  if (!panel._snap) return;
  S.undo.push(panel._snap); S.redo = []; panel._snap = null;
  updateHist();
  if (e.target.id === 'r-ovol' || e.target.id === 'r-mvol') afterChange({ keepPanel: true, restart: true });
});

function fixClipIn(c) {
  const m = mediaById(c.mediaId);
  if (m.type !== 'video') return;
  c.in = clamp(c.in, 0, Math.max(0, m.duration - c.dur * c.speed));
}

const actions = {
  desel() { S.selClip = null; renderPanel(); renderScrub(); },
  remix() { S.seed = (S.seed * 7 + 13) % 100000; regenerate('עריכה חדשה מוכנה'); },
  'add-media'() { $('#file-add').click(); },
  snap() { mutate(() => snapToBeats(S.P.clips, S.P.music, S.P.musicOffset)); toast('כל הקאטים מיושרים לביט'); },
  left() { mutate(() => moveClip(-1)); },
  right() { mutate(() => moveClip(1)); },
  del() {
    if (S.P.clips.length <= 1) return toast('צריך לפחות קטע אחד');
    mutate(() => { const i = S.P.clips.findIndex((c) => c.id === S.selClip); S.P.clips.splice(i, 1); if (i === 0 && S.P.clips[0]) S.P.clips[0].transition = { type: 'cut', dur: 0 }; S.selClip = null; });
  },
  dup() { mutate(() => { const i = S.P.clips.findIndex((c) => c.id === S.selClip); const c = structuredClone(S.P.clips[i]); c.id = uid('c'); S.P.clips.splice(i + 1, 0, c); S.selClip = c.id; }); },
  fit() { mutate(() => { const c = selClip(); c.fit = c.fit === 'contain' ? 'cover' : 'contain'; }); },
  shorter() { mutate(() => { const c = selClip(); c.dur = Math.max(0.3, c.dur - beatLen()); c.transition.dur = Math.min(c.transition.dur, c.dur * 0.45); }); },
  longer() { mutate(() => { const c = selClip(); c.dur += beatLen(); fixClipIn(c); }); },
  replace() { replaceSheet(); },
  'add-text'() { textSheet(null); },
  'ov-edit'() { textSheet(selOv()); },
  'ov-start'() { mutate(() => { const o = selOv(); const len = o.end - o.start; o.start = player.time; o.end = Math.min(S.P.duration, o.start + Math.max(0.5, len)); }); },
  'ov-end'() { mutate(() => { const o = selOv(); o.end = Math.max(o.start + 0.3, player.time); }); },
  'ov-all'() { mutate(() => { const o = selOv(); o.start = 0; o.end = S.P.duration; }); },
  'ov-dup'() { mutate(() => { const o = structuredClone(selOv()); o.id = uid('o'); o.x = clamp(o.x + 0.05, 0, 1); o.y = clamp(o.y + 0.05, 0, 1); S.P.overlays.push(o); S.selOv = o.id; }); },
  'ov-del'() { mutate(() => { S.P.overlays = S.P.overlays.filter((o) => o.id !== S.selOv); S.selOv = null; }); syncDrawOpts(); },
  neon() { S.draw.neon = !S.draw.neon; renderPanel(); },
  outline() { S.draw.outline = !S.draw.outline; renderPanel(); },
  'undo-stroke'() { S.draw.strokes.pop(); syncDrawOpts(); renderPanel(); },
  'commit-draw'() { commitDrawing(); },
  pulse() { mutate(() => { S.P.pulse = S.P.pulse ? 0 : STYLES[S.P.style].pulse || 0.03; }); },
  letterbox() { mutate(() => { S.P.letterbox = !S.P.letterbox; }); },
  fadeedges() { mutate(() => { S.P.fadeEdges = !S.P.fadeEdges; }); },
  fadeout() { mutate(() => { S.P.fadeOut = !S.P.fadeOut; }, { restart: true }); },
  'change-music'() { musicSheet(); },
  'music-earlier'() { shiftMusic(-1); },
  'music-later'() { shiftMusic(1); },
};
const beatLen = () => 60 / S.P.music.analysis.bpm;

function moveClip(dir) {
  const cl = S.P.clips;
  const i = cl.findIndex((c) => c.id === S.selClip);
  const j = i + dir;
  if (j < 0 || j >= cl.length) return;
  [cl[i], cl[j]] = [cl[j], cl[i]];
  // Keep the first clip without an incoming transition.
  if (cl[0].transition.type !== 'cut') { const tmp = cl[0].transition; cl[0].transition = { type: 'cut', dur: 0 }; cl[Math.max(i, j)].transition = cl[Math.max(i, j)].transition.type === 'cut' ? tmp : cl[Math.max(i, j)].transition; }
}

function shiftMusic(dir) {
  const a = S.P.music.analysis;
  const bar = (60 / a.bpm) * 4;
  mutate(() => {
    S.P.musicOffset = clamp(S.P.musicOffset + dir * bar * 4, 0, Math.max(0, a.duration - S.P.duration));
    // Re-align downbeats: snap to nearest downbeat in the original grid.
    const downs = a.beats.filter((_, i) => (i - a.downbeatPhase) % 4 === 0);
    let best = S.P.musicOffset, bd = Infinity;
    for (const b of downs) { const dd = Math.abs(b - S.P.musicOffset); if (dd < bd) { bd = dd; best = b; } }
    S.P.musicOffset = best;
  }, { restart: true });
}

function regenerate(msg) {
  player.pause();
  S.undo.push(snapshot()); S.redo = [];
  const aspect = S.P.aspect;
  buildProject({ keepOverlays: true });
  S.P.aspect = aspect;
  S.selClip = null;
  afterChange({ aspect: true });
  player.seek(0);
  toast(msg);
}

function applyNewTrack() {
  regenerate(`השיר הוחלף · ${Math.round(S.track.analysis.bpm)} BPM`);
}

// ---------------------------------------------------------------- sheets
function transitionSheet(clipId) {
  const c = S.P.clips.find((x) => x.id === clipId);
  openSheet(`<h3>מעבר</h3>
    <div class="chips">${Object.entries(TRANSITIONS).map(([k, v]) => `<button type="button" class="chip ${c.transition.type === k ? 'on' : ''}" data-t="${k}">${v}</button>`).join('')}</div>
    <div class="row"><span class="lbl">משך</span><input type="range" id="t-dur" min="0.1" max="1.5" step="0.05" value="${c.transition.dur || 0.4}"><span class="val" id="t-dur-v">${(c.transition.dur || 0.4).toFixed(2)}</span></div>
    <div class="row"><button type="button" class="btn" id="t-all">החלה על כל המעברים</button><button type="button" class="btn accent" id="t-done">סיום</button></div>`, (sh) => {
    let type = c.transition.type;
    let dur = c.transition.dur || 0.4;
    const apply = (all) => mutate(() => {
      const list = all ? S.P.clips.slice(1) : [c];
      for (const x of list) x.transition = type === 'cut' ? { type, dur: 0 } : { type, dur: Math.min(dur, x.dur * 0.9, (S.P.clips[S.P.clips.indexOf(x) - 1]?.dur || 9) * 0.9) };
    }, { keepPanel: false });
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]');
      if (b) {
        type = b.dataset.t;
        $$('[data-t]', sh).forEach((x) => x.classList.toggle('on', x === b));
        apply(false);
        player.seek(Math.max(0, c.start - dur / 2 - 0.4)); player.play();
      }
    });
    $('#t-dur', sh).addEventListener('input', (e) => { dur = +e.target.value; $('#t-dur-v', sh).textContent = dur.toFixed(2); });
    $('#t-dur', sh).addEventListener('change', () => apply(false));
    $('#t-all', sh).addEventListener('click', () => { apply(true); closeSheet(); toast('המעבר הוחל על כל הקטעים'); });
    $('#t-done', sh).addEventListener('click', closeSheet);
  });
}

function replaceSheet() {
  openSheet(`<h3>החלפת קטע</h3><div class="media-pick">${S.media.map((m) => `<button type="button" data-m="${m.id}" style="background-image:url(${m.thumb})" aria-label="${escapeHtml(m.name)}"></button>`).join('')}</div>`, (sh) => {
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const m = mediaById(b.dataset.m);
      mutate(() => {
        const c = selClip();
        c.mediaId = m.id;
        c.speed = 1;
        if (m.type === 'video') {
          const best = m.analysis?.samples.reduce((x, s) => ((s.score ?? s.q) > (x.score ?? x.q) ? s : x));
          c.in = clamp((best?.t || 0) - c.dur * 0.35, 0, Math.max(0, m.duration - c.dur));
          if (m.duration < c.dur) c.speed = clamp(m.duration / c.dur, 0.5, 1);
          c.kb = null;
        } else { c.in = 0; c.kb = kenBurns(rng(Date.now()), 0.12); }
      });
      closeSheet();
    });
  });
}

function musicSheet() {
  openSheet(`<h3>החלפת שיר</h3>
    <label class="upload-music" for="file-music"><span class="pick-icon small">♪</span><span><b>שיר מהטלפון</b><small>ה-AI יזהה את הקצב ויערוך מחדש</small></span></label>
    <div class="tracks">${TRACKS.map((t) => `<button type="button" class="track ${S.P.music.id === t.id ? 'on' : ''}" data-tk="${t.id}"><span class="tplay">♪</span><span><b>${t.name}</b><small>${t.vibe}</small></span><span class="bpmtag" dir="ltr">${t.bpm} BPM</span></button>`).join('')}</div>`, (sh) => {
    sh.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-tk]');
      if (!b) return;
      b.querySelector('.tplay').textContent = '…';
      S.track = await getBuiltin(b.dataset.tk);
      closeSheet();
      applyNewTrack();
    });
  });
}

function textSheet(existing) {
  const o = existing || { text: '', font: 'heebo', color: '#ffffff', style: 'outline', anim: 'pop', size: 96 };
  openSheet(`<h3>${existing ? 'עריכת טקסט' : 'טקסט חדש'}</h3>
    <textarea id="tx" dir="auto" placeholder="מה לכתוב?" maxlength="120">${escapeHtml(o.text)}</textarea>
    <div class="row nowrap">${Object.entries(FONTS).map(([k, f]) => `<button type="button" class="btn ${o.font === k ? 'on' : ''}" data-f="${k}" style="font:${f.css.replace('{s}', 16)}">${f.name}</button>`).join('')}</div>
    <div class="swatches">${COLORS.map((c) => `<button type="button" class="sw ${o.color === c ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="צבע"></button>`).join('')}</div>
    <div class="row nowrap">${Object.entries(TEXT_STYLES).map(([k, v]) => `<button type="button" class="btn ${o.style === k ? 'on' : ''}" data-s="${k}">${v}</button>`).join('')}</div>
    <div class="row"><button type="button" class="btn accent" id="tx-ok">${existing ? 'שמירה' : 'הוספה'}</button><button type="button" class="btn" id="tx-cancel">ביטול</button></div>`, (sh) => {
    const st = { font: o.font, color: o.color, style: o.style };
    const ta = $('#tx', sh);
    setTimeout(() => ta.focus(), 50);
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const [attr, key] of [['f', 'font'], ['c', 'color'], ['s', 'style']]) {
        if (b.dataset[attr]) { st[key] = b.dataset[attr]; $$(`[data-${attr}]`, sh).forEach((x) => x.classList.toggle('on', x === b)); }
      }
    });
    $('#tx-cancel', sh).addEventListener('click', closeSheet);
    $('#tx-ok', sh).addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) return closeSheet();
      mutate(() => {
        if (existing) Object.assign(existing, st, { text });
        else {
          const ov = { id: uid('o'), kind: 'text', text, ...st, anim: 'pop', size: 96, x: 0.5, y: 0.5, scale: 1, rot: 0, start: player.time, end: Math.min(S.P.duration, player.time + 3) };
          if (ov.end - ov.start < 1) { ov.start = Math.max(0, S.P.duration - 3); ov.end = S.P.duration; }
          S.P.overlays.push(ov);
          S.selOv = ov.id;
        }
      });
      syncDrawOpts();
      closeSheet();
    });
  });
}

function addOverlayAtNow(ov) {
  ov.start = player.time;
  ov.end = Math.min(S.P.duration, player.time + 3);
  if (ov.end - ov.start < 1) { ov.start = Math.max(0, S.P.duration - 3); ov.end = S.P.duration; }
  mutate(() => { S.P.overlays.push(ov); S.selOv = ov.id; });
  syncDrawOpts();
}
function addSticker(emoji) {
  const r = Math.random;
  addOverlayAtNow({ id: uid('o'), kind: 'sticker', emoji, size: 200, x: 0.3 + r() * 0.4, y: 0.3 + r() * 0.4, scale: 1, rot: (r() - 0.5) * 0.4, anim: 'pop' });
}
function addBadge(b) {
  addOverlayAtNow({ id: uid('o'), kind: 'text', text: b.text, style: 'badge', bg: b.bg, color: b.color || '#ffffff', font: 'heebo', size: 80, x: 0.5, y: 0.3, scale: 1, rot: 0, anim: 'pop' });
}

function commitDrawing() {
  const strokes = S.draw.strokes;
  if (!strokes.length) return;
  // Re-center the strokes around their bounding box so the drawing can be moved/scaled as one.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) for (const [x, y] of s.pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const refH = (1080 * canvas.height) / canvas.width;
  const moved = strokes.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [Math.round(x - cx), Math.round(y - cy)]) }));
  const ov = { id: uid('o'), kind: 'draw', strokes: moved, x: (cx + 540) / 1080, y: (cy + refH / 2) / refH, scale: 1, rot: 0, anim: 'none' };
  S.draw.strokes = [];
  addOverlayAtNow(ov);
  toast('השרבוט נוסף');
}

// ---------------------------------------------------------------- canvas interaction
(() => {
  const pts = new Map();
  let mode = null, start = null, curStroke = null, lastTap = 0;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
  };
  // Drawing coordinates are stored in 1080-wide reference space, centered.
  const toRef = (p) => {
    const k = 1080 / canvas.width;
    return [Math.round(p.x * k - 540), Math.round(p.y * k - (canvas.height * k) / 2)];
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    pts.set(e.pointerId, p);
    if (S.tab === 'draw') {
      if (pts.size > 1) return;
      curStroke = { color: S.draw.color, width: S.draw.width * 2, neon: S.draw.neon, outline: S.draw.outline, pts: [toRef(p)] };
      S.draw.strokes.push(curStroke);
      mode = 'draw';
      syncDrawOpts();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (pts.size === 2 && S.selOv) {
      const [a, b] = [...pts.values()];
      const o = selOv();
      mode = 'pinch';
      start = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), scale: o.scale, rot: o.rot || 0, snap: snapshot() };
      return;
    }
    // Corner handle of selected overlay: scale/rotate.
    const o = selOv();
    if (o && !player.playing) {
      ctx.save();
      const b = renderer.measure(ctx, o);
      ctx.restore();
      const loc = renderer.toLocal(o, p.x, p.y, canvas.width, canvas.height);
      const hr = 40 / (o.scale || 1);
      if (Math.hypot(loc.x - (b.x + b.w), loc.y - (b.y + b.h)) < hr) {
        const cx = o.x * canvas.width, cy = o.y * canvas.height;
        mode = 'handle';
        start = { d: Math.hypot(p.x - cx, p.y - cy), ang: Math.atan2(p.y - cy, p.x - cx), scale: o.scale, rot: o.rot || 0, snap: snapshot() };
        return;
      }
    }
    const hit = renderer.hitTest(ctx, S.P, player.time, p.x, p.y, canvas.width, canvas.height, S.selOv);
    if (hit) {
      const now = performance.now();
      const ov = S.P.overlays.find((x) => x.id === hit);
      if (hit === S.selOv && now - lastTap < 350 && ov.kind === 'text') { textSheet(ov); return; }
      lastTap = now;
      if (player.playing) player.pause();
      if (S.selOv !== hit) {
        S.selOv = hit;
        const want = ov.kind === 'draw' ? 'draw' : ov.kind === 'sticker' || ov.style === 'badge' ? 'stickers' : 'text';
        if (S.tab !== want) setTab(want); else { renderPanel(); renderScrub(); }
        syncDrawOpts();
      }
      mode = 'drag';
      start = { p, x: ov.x, y: ov.y, snap: snapshot(), moved: false };
      return;
    }
    if (S.selOv) { S.selOv = null; syncDrawOpts(); renderPanel(); renderScrub(); return; }
    mode = 'tap';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = pos(e);
    pts.set(e.pointerId, p);
    if (mode === 'draw' && curStroke) {
      const r = toRef(p);
      const last = curStroke.pts[curStroke.pts.length - 1];
      if (Math.hypot(r[0] - last[0], r[1] - last[1]) > 3) { curStroke.pts.push(r); player.invalidate(); }
      return;
    }
    const o = selOv();
    if (!o) return;
    if (mode === 'drag') {
      o.x = clamp(start.x + (p.x - start.p.x) / canvas.width, 0, 1);
      o.y = clamp(start.y + (p.y - start.p.y) / canvas.height, 0, 1);
      start.moved = true;
      player.invalidate();
    } else if (mode === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      o.scale = clamp(start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / start.d), 0.15, 6);
      o.rot = start.rot + Math.atan2(b.y - a.y, b.x - a.x) - start.ang;
      start.moved = true;
      player.invalidate();
    } else if (mode === 'handle') {
      const cx = o.x * canvas.width, cy = o.y * canvas.height;
      o.scale = clamp(start.scale * (Math.hypot(p.x - cx, p.y - cy) / start.d), 0.15, 6);
      o.rot = start.rot + Math.atan2(p.y - cy, p.x - cx) - start.ang;
      start.moved = true;
      player.invalidate();
    }
  });
  const end = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (mode === 'draw') { curStroke = null; if (!pts.size) { mode = null; renderPanel(); } return; }
    if ((mode === 'drag' || mode === 'pinch' || mode === 'handle') && start?.moved) {
      S.undo.push(start.snap); S.redo = []; updateHist();
      const rs = $('#r-scale'); if (rs) rs.value = selOv()?.scale ?? 1;
      const rr = $('#r-rot'); if (rr) rr.value = selOv()?.rot ?? 0;
    }
    if (mode === 'tap' && e.type === 'pointerup') player.toggle();
    if (!pts.size) mode = null;
    else if (mode === 'pinch') mode = null;
    renderOvBar();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
})();

function renderOvBar() {
  const bar = $('#ov-bar');
  const o = selOv();
  if (!o || player.playing || S.tab === 'draw') { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `${o.kind === 'text' ? '<button type="button" data-ob="ov-edit">✎ עריכה</button>' : ''}
    <button type="button" data-ob="ov-dup">⧉ שכפול</button>
    <button type="button" data-ob="ov-del">🗑 מחיקה</button>
    <button type="button" data-ob="done">✓</button>`;
}
$('#ov-bar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ob]');
  if (!b) return;
  if (b.dataset.ob === 'done') { S.selOv = null; syncDrawOpts(); renderPanel(); renderScrub(); return; }
  actions[b.dataset.ob]();
});

// ---------------------------------------------------------------- add media from editor
$('#file-add').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length) return;
  toast('מנתחים את המדיה החדשה…', 4000);
  const before = S.media.length;
  for (const [i, f] of files.entries()) {
    try { const m = await loadMedia(f, before + i); await analyzeMedia(m); S.media.push(m); } catch (err) { console.warn(err); }
  }
  const added = S.media.slice(before);
  if (!added.length) return toast('לא הצלחנו לפתוח את הקבצים');
  mutate(() => {
    for (const m of added) {
      const dur = beatLen() * 4;
      const c = { id: uid('c'), mediaId: m.id, dur, in: 0, speed: 1, volume: 1, transition: { type: 'fade', dur: Math.min(0.4, dur * 0.3) }, filter: null, kb: m.type === 'image' ? kenBurns(rng(Date.now()), 0.12) : null };
      if (m.type === 'video') { if (m.duration < dur) c.speed = clamp(m.duration / dur, 0.5, 1); fixClipIn(c); }
      S.P.clips.push(c);
    }
  });
  toast(`נוספו ${added.length} פריטים בסוף. אפשר ללחוץ "ערבוב AI" כדי לשלב אותם.`, 3500);
});

// ---------------------------------------------------------------- export
$('#btn-export').addEventListener('click', () => {
  player.pause();
  if (S.draw.strokes.length) commitDrawing();
  if (!canExport()) {
    openSheet(`<h3>ייצוא לא נתמך בדפדפן הזה</h3><p class="note">נסו בכרום או בספארי מעודכנים (iOS 14.5 ומעלה).</p><button type="button" class="btn" id="x-close">סגירה</button>`, (sh) => $('#x-close', sh).addEventListener('click', closeSheet));
    return;
  }
  const a = ASPECTS[S.P.aspect];
  const dims = (short) => (a.w <= a.h ? [short, Math.round((short * a.h) / a.w / 2) * 2] : [Math.round((short * a.w) / a.h / 2) * 2, short]);
  let q = '720';
  openSheet(`<h3>ייצוא הסרטון</h3>
    <div class="chips"><button type="button" class="chip on" data-q="720">HD 720p</button><button type="button" class="chip" data-q="1080">Full HD 1080p</button></div>
    <p class="note">הייצוא קורה בזמן אמת (${fmtTime(S.P.duration)}) ישירות בטלפון. השאירו את המסך דלוק והאפליקציה פתוחה עד הסוף.</p>
    <button type="button" class="primary" id="x-go">ייצוא</button>`, (sh) => {
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-q]');
      if (b) { q = b.dataset.q; $$('[data-q]', sh).forEach((x) => x.classList.toggle('on', x === b)); }
    });
    $('#x-go', sh).addEventListener('click', () => runExport(dims(+q)));
  });
});

async function runExport([w, h]) {
  closeSheet.locked = true;
  S.selOv = null; syncDrawOpts();
  openSheet(`<h3>מייצאים…</h3><div class="export-progress"><div id="x-bar"></div></div><p class="note" id="x-note">0%</p><button type="button" class="btn" id="x-cancel">ביטול</button>`, (sh) => {
    $('#x-cancel', sh).addEventListener('click', () => player._cancelExport?.());
  });
  try { await document.fonts.ready; } catch { /* */ }
  let res = null;
  try {
    res = await exportVideo(player, { width: w, height: h }, (p) => {
      const bar = $('#x-bar'); if (bar) bar.style.width = `${p * 100}%`;
      const n = $('#x-note'); if (n) n.textContent = `${Math.round(p * 100)}%`;
    });
  } catch (err) {
    console.error(err);
    closeSheet.locked = false;
    closeSheet();
    toast('הייצוא נכשל. נסו באיכות 720p.');
    setCanvasSize();
    return;
  }
  closeSheet.locked = false;
  setCanvasSize();
  if (!res) { closeSheet(); toast('הייצוא בוטל'); return; }
  const name = `klipi-${new Date().toISOString().slice(0, 10)}.${res.ext}`;
  const file = new File([res.blob], name, { type: res.type });
  const url = URL.createObjectURL(res.blob);
  // Inside a claude.ai artifact, files are saved through the viewer's downloads capability.
  let dl = null;
  try { dl = (await window.claude?.use?.('downloads')) || null; } catch { dl = null; }
  if (dl) {
    openSheet(`<h3>הסרטון מוכן 🎉</h3>
      <video class="preview-video" src="${url}" controls playsinline></video>
      <button type="button" class="primary" id="x-save">שמירה (${(res.blob.size / 1e6).toFixed(1)}MB)</button>
      <p class="note">באפליקציית Claude לאייפון נפתח תפריט השיתוף: בוחרים "שמירת סרטון".</p>
      <button type="button" class="btn" id="x-close">חזרה לעריכה</button>`, (sh) => {
      $('#x-save', sh).addEventListener('click', async () => {
        try { await dl.save({ filename: name, data: res.blob }); toast('נשמר'); }
        catch (err) { if (err?.code !== 'declined') toast('השמירה לא זמינה כאן'); }
      });
      $('#x-close', sh).addEventListener('click', closeSheet);
    });
    closeSheet.onClose = () => URL.revokeObjectURL(url);
    return;
  }
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  openSheet(`<h3>הסרטון מוכן 🎉</h3>
    <video class="preview-video" src="${url}" controls playsinline></video>
    ${canShare ? '<button type="button" class="primary" id="x-share">שמירה לגלריה / שיתוף</button>' : ''}
    <a class="btn" id="x-dl" href="${url}" download="${name}" style="text-align:center;text-decoration:none">⬇ הורדה (${(res.blob.size / 1e6).toFixed(1)}MB)</a>
    ${canShare ? '<p class="note">באייפון: "שיתוף" ← "שמירת סרטון" כדי לשמור לגלריה.</p>' : ''}
    <button type="button" class="btn" id="x-close">חזרה לעריכה</button>`, (sh) => {
    $('#x-share', sh)?.addEventListener('click', async () => {
      try { await navigator.share({ files: [file], title: 'קליפי' }); } catch (err) { if (err.name !== 'AbortError') toast('השיתוף נכשל, נסו הורדה'); }
    });
    $('#x-close', sh).addEventListener('click', closeSheet);
  });
  closeSheet.onClose = () => URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------- leave editor
$('#btn-ed-back').addEventListener('click', () => {
  openSheet(`<h3>לחזור להתחלה?</h3><p class="note">העריכה הנוכחית תימחק. המדיה שבחרתם תישאר.</p>
    <div class="row"><button type="button" class="btn danger" id="lv-yes">כן, להתחלה</button><button type="button" class="btn" id="lv-no">להישאר</button></div>`, (sh) => {
    $('#lv-yes', sh).addEventListener('click', () => { player.pause(); closeSheet(); S.P = null; renderGrid(); show('home'); });
    $('#lv-no', sh).addEventListener('click', closeSheet);
  });
});

document.addEventListener('keydown', (e) => {
  if (!S.P || !$('#screen-editor').classList.contains('active') || e.target.matches('input, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); player.toggle(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $(e.shiftKey ? '#btn-redo' : '#btn-undo').click(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.selOv) actions['ov-del']();
});

// Redraw once web fonts arrive so text overlays use them.
document.fonts?.ready.then(() => player.invalidate());
for (const f of Object.values(FONTS)) document.fonts?.load(f.css.replace('{s}', 40), 'אבג abc').then(() => player.invalidate()).catch(() => {});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Debug/test hook.
window.__klipi = { S, player, addFiles, makeVideo };
