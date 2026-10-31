// Built-in, royalty-free music generated on the device with Web Audio.
// Beats are known exactly, so these tracks skip beat detection.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CH = {
  Am: [57, 60, 64], F: [53, 57, 60], C: [48, 52, 55], G: [55, 59, 62], Em: [52, 55, 59],
  Dm: [50, 53, 57], Bb: [46, 50, 53], Cmaj7: [48, 52, 55, 59], Am7: [57, 60, 64, 67],
  Dm7: [50, 53, 57, 60], G7: [55, 59, 62, 65], Fmaj7: [53, 57, 60, 64], E: [52, 56, 59],
};

export const TRACKS = [
  { id: 'sunset', name: 'שקיעה בתל אביב', vibe: 'פופ שמח', bpm: 112, chords: ['C', 'G', 'Am', 'F'], kit: 'pop', bars: 28 },
  { id: 'drive', name: 'נסיעת לילה', vibe: 'סינת׳וייב אנרגטי', bpm: 124, chords: ['Dm', 'Bb', 'F', 'C'], kit: 'synth', bars: 32 },
  { id: 'lofi', name: 'בוקר עצלן', vibe: 'לו־פיי רגוע', bpm: 84, chords: ['Cmaj7', 'Am7', 'Dm7', 'G7'], kit: 'lofi', bars: 20 },
  { id: 'hype', name: 'הייפ', vibe: 'טראפ עם בס כבד', bpm: 140, chords: ['Am', 'F', 'Dm', 'E'], kit: 'trap', bars: 32 },
  { id: 'epic', name: 'רגע גדול', vibe: 'קולנועי ומרגש', bpm: 96, chords: ['Am', 'F', 'C', 'G'], kit: 'epic', bars: 24 },
];

// Section intensity over the arrangement (fraction of song -> level 0..1).
function sectionLevel(bar, bars) {
  const f = bar / bars;
  if (f < 0.125) return 0.25;     // intro
  if (f < 0.25) return 0.5;       // build
  if (f < 0.5) return 0.85;       // verse/chorus
  if (f < 0.625) return 0.45;     // break
  if (f < 0.9) return 1;          // drop
  return 0.35;                    // outro
}

let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function env(ctx, g, t, a, peak, d, sus = 0.0001, len = 0) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + d);
  if (len) g.gain.setValueAtTime(Math.max(sus, 0.0001), t + len);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (len || a + d) + 0.08);
}

function kick(ctx, out, t, big = false) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(big ? 170 : 150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  env(ctx, g, t, 0.003, big ? 1.1 : 0.95, big ? 0.45 : 0.3);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.6);
}
function snare(ctx, out, t, lv = 0.5) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
  const g = ctx.createGain(); env(ctx, g, t, 0.002, lv, 0.16);
  s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.3);
  const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 190;
  env(ctx, g2, t, 0.002, lv * 0.6, 0.08); o.connect(g2).connect(out); o.start(t); o.stop(t + 0.2);
}
function clap(ctx, out, t, lv = 0.45) {
  for (let k = 0; k < 3; k++) {
    const s = ctx.createBufferSource(); s.buffer = noise(ctx);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 1.2;
    const g = ctx.createGain(); const tt = t + k * 0.011;
    env(ctx, g, tt, 0.001, lv, k === 2 ? 0.18 : 0.02);
    s.connect(f).connect(g).connect(out); s.start(tt, Math.random() * 0.5); s.stop(tt + 0.3);
  }
}
function hat(ctx, out, t, open = false, lv = 0.14) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
  const g = ctx.createGain(); env(ctx, g, t, 0.001, lv, open ? 0.22 : 0.035);
  s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.4);
}
function bass(ctx, out, t, midi, len, type = 'sawtooth', cutoff = 520, lv = 0.32) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(midi);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(cutoff * 2.2, t); f.frequency.exponentialRampToValueAtTime(cutoff, t + 0.15);
  const g = ctx.createGain(); env(ctx, g, t, 0.005, lv, 0.12, lv * 0.6, Math.max(0.05, len - 0.1));
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + len + 0.2);
}
function sub808(ctx, out, t, midi, len) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(NOTE(midi + 12), t); o.frequency.exponentialRampToValueAtTime(NOTE(midi), t + 0.06);
  const ws = ctx.createWaveShaper(); const c = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; c[i] = Math.tanh(x * 2.2); }
  ws.curve = c;
  const g = ctx.createGain(); env(ctx, g, t, 0.004, 0.55, len * 0.9, 0.0001);
  o.connect(ws).connect(g).connect(out); o.start(t); o.stop(t + len + 0.2);
}
function pad(ctx, out, t, notes, len, lv = 0.07, bright = 1400) {
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lv, t + Math.min(0.6, len * 0.3));
  g.gain.setValueAtTime(lv, t + len - 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.25);
  f.connect(g).connect(out);
  for (const n of notes) for (const det of [-9, 8]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + len + 0.3);
  }
}
function pluck(ctx, out, t, midi, lv = 0.12, type = 'square') {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = NOTE(midi);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.2);
  const g = ctx.createGain(); env(ctx, g, t, 0.003, lv, 0.22);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 0.4);
}
function keys(ctx, out, t, notes, len, lv = 0.09) {
  for (const n of notes) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = NOTE(n + 12);
    const g = ctx.createGain(); env(ctx, g, t, 0.01, lv, len * 0.8, 0.0001);
    o.connect(g).connect(out); o.start(t); o.stop(t + len + 0.2);
  }
}
function riser(ctx, out, t, len) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(8000, t + len);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + len);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
  s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + len + 0.1);
}

export async function renderTrack(track) {
  const sr = 32000;
  const beat = 60 / track.bpm, bar = beat * 4;
  const bars = track.bars;
  const dur = bars * bar + 1.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.15;
  const master = ctx.createGain(); master.gain.value = 0.85;
  comp.connect(master).connect(ctx.destination);
  // Simple stereo delay for space.
  const dl = ctx.createDelay(1); dl.delayTime.value = beat * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  const pan = ctx.createStereoPanner(); pan.pan.value = 0.4;
  dl.connect(fb).connect(dl); dl.connect(pan).connect(wet).connect(comp);
  const drums = ctx.createGain(); drums.connect(comp);
  const music = ctx.createGain(); music.connect(comp);
  const fx = ctx.createGain(); fx.connect(comp); fx.connect(dl);

  const k = track.kit;
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    const lv = sectionLevel(b, bars);
    const chord = CH[track.chords[b % track.chords.length]];
    const root = chord[0] - 24 + (chord[0] < 50 ? 12 : 0);
    const nextLv = sectionLevel(b + 1, bars);
    // Pads / keys
    if (k === 'lofi') keys(ctx, music, t0, chord, bar * 0.95, 0.07);
    else pad(ctx, music, t0, chord, bar, lv > 0.8 ? 0.06 : 0.075, k === 'epic' ? 2200 : 1400);
    if (nextLv - lv > 0.3 && b < bars - 1) riser(ctx, fx, t0 + bar * 0.5, bar * 0.5);

    for (let s = 0; s < 16; s++) {
      const t = t0 + s * (beat / 4) + (k === 'lofi' && s % 2 ? beat * 0.06 : 0);
      const onBeat = s % 4 === 0;
      if (lv >= 0.5) {
        if (k === 'trap') {
          if (s === 0 || s === 10 || (lv > 0.9 && s === 7)) sub808(ctx, drums, t, root, beat * 1.4);
          if (s === 8) clap(ctx, drums, t, 0.5);
          if (lv > 0.8 && (s % 2 === 0 || (s > 11 && b % 2))) hat(ctx, drums, t, false, 0.1);
        } else if (k === 'lofi') {
          if (s === 0 || s === 10) kick(ctx, drums, t);
          if (s === 4 || s === 12) snare(ctx, drums, t, 0.32);
          if (s % 2 === 0) hat(ctx, drums, t, false, 0.07);
        } else if (k === 'epic') {
          if (onBeat) kick(ctx, drums, t, lv > 0.9);
          if (lv > 0.8 && (s === 4 || s === 12)) snare(ctx, drums, t, 0.55);
          if (lv > 0.9 && s % 2 === 0) hat(ctx, drums, t, false, 0.08);
        } else {
          if (onBeat) kick(ctx, drums, t, k === 'synth');
          if (s === 4 || s === 12) (k === 'pop' ? clap : snare)(ctx, drums, t, 0.45);
          if (s % 2 === 1 || lv > 0.9) hat(ctx, drums, t, s % 4 === 2 && k === 'synth', 0.11);
        }
      } else if (lv >= 0.3 && s % 4 === 2) {
        hat(ctx, drums, t, false, 0.07);
      }
      // Bass
      if (lv >= 0.45 && k !== 'trap') {
        if (k === 'synth' && s % 2 === 0) bass(ctx, music, t, root + (s % 4 === 2 ? 12 : 0), beat / 2 - 0.02, 'sawtooth', 600, 0.24);
        else if (k === 'pop' && (s === 0 || s === 6 || s === 8 || s === 14)) bass(ctx, music, t, root, beat * 0.45, 'square', 420, 0.22);
        else if (k === 'lofi' && (s === 0 || s === 7 || s === 10)) bass(ctx, music, t, root, beat * 0.8, 'triangle', 500, 0.3);
        else if (k === 'epic' && s % 8 === 0) bass(ctx, music, t, root, beat * 1.9, 'sawtooth', 300, 0.28);
      }
      // Arp / melody in the loud sections
      if (lv >= 0.85 && s % 2 === 0 && k !== 'lofi') {
        const seq = [0, 1, 2, 1, 2, chord.length - 1, 1, 0];
        const n = chord[seq[(s / 2) % seq.length] % chord.length] + 12;
        pluck(ctx, fx, t, n, k === 'trap' ? 0.06 : 0.08, k === 'epic' ? 'triangle' : 'square');
      }
      if (k === 'lofi' && lv >= 0.45 && (s === 3 || s === 9 || s === 14) && b % 2 === 1) {
        pluck(ctx, fx, t, chord[(s + b) % chord.length] + 24, 0.05, 'sine');
      }
    }
  }
  if (bars) kick(ctx, drums, bars * bar, true);
  const buffer = await ctx.startRendering();

  const beats = [];
  const total = bars * 4;
  for (let i = 0; i <= total; i++) beats.push(i * beat);
  const energy = beats.map((t) => sectionLevel(Math.floor(t / bar), bars));
  const strength = beats.map((_, i) => (i % 4 === 0 ? 1 : 0.6));
  return { buffer, analysis: { bpm: track.bpm, beats, downbeatPhase: 0, energy, strength, duration: bars * bar } };
}
