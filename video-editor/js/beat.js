// On-device music analysis: onset envelope (spectral flux), tempo via
// autocorrelation, beat tracking via dynamic programming (Ellis 2007),
// downbeat phase and a per-beat energy curve.

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

export async function decodeAudioFile(file, ctx) {
  const ab = await file.arrayBuffer();
  return await new Promise((res, rej) => {
    const p = ctx.decodeAudioData(ab, res, rej);
    if (p && p.then) p.then(res, rej);
  });
}

export function analyzeAudio(buffer) {
  const sr = buffer.sampleRate;
  const n = buffer.length;
  const chs = buffer.numberOfChannels;
  const factor = Math.max(1, Math.floor(sr / 11025));
  const dsr = sr / factor;
  const m = Math.floor(n / factor);
  const x = new Float32Array(m);
  for (let c = 0; c < chs; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < m; i++) {
      let s = 0;
      const o = i * factor;
      for (let k = 0; k < factor; k++) s += d[o + k];
      x[i] += s / factor / chs;
    }
  }

  const N = 512, hop = 128;
  const fr = dsr / hop;
  const frames = Math.max(1, Math.floor((m - N) / hop) + 1);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  const re = new Float32Array(N), im = new Float32Array(N);
  const prev = new Float32Array(N / 2);
  const flux = new Float32Array(frames);
  const low = new Float32Array(frames);
  const rms = new Float32Array(frames);
  const lowBin = Math.max(2, Math.round((180 * N) / dsr));
  for (let f = 0; f < frames; f++) {
    const o = f * hop;
    let e = 0;
    for (let i = 0; i < N; i++) {
      const v = x[o + i] || 0;
      e += v * v;
      re[i] = v * win[i]; im[i] = 0;
    }
    rms[f] = Math.sqrt(e / N);
    fft(re, im);
    let fl = 0, lf = 0;
    for (let k = 1; k < N / 2; k++) {
      const mag = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag - prev[k];
      if (d > 0) { fl += d; if (k < lowBin) lf += d; }
      prev[k] = mag;
    }
    flux[f] = fl; low[f] = lf;
  }

  // Onset envelope: flux minus local mean, half-wave rectified, normalized.
  const onset = new Float32Array(frames);
  const half = Math.round(fr * 0.15);
  let acc = 0;
  const pre = new Float64Array(frames + 1);
  for (let i = 0; i < frames; i++) { acc += flux[i]; pre[i + 1] = acc; }
  let maxO = 1e-9;
  for (let i = 0; i < frames; i++) {
    const a = Math.max(0, i - half), b = Math.min(frames, i + half + 1);
    const mean = (pre[b] - pre[a]) / (b - a);
    onset[i] = Math.max(0, flux[i] - mean);
    if (onset[i] > maxO) maxO = onset[i];
  }
  let sd = 0;
  for (let i = 0; i < frames; i++) { onset[i] /= maxO; sd += onset[i] * onset[i]; }
  sd = Math.sqrt(sd / frames) || 1;
  for (let i = 0; i < frames; i++) onset[i] /= sd;

  // Tempo via autocorrelation with a perceptual prior around 120 BPM.
  const minLag = Math.floor((fr * 60) / 200), maxLag = Math.ceil((fr * 60) / 60);
  const span = Math.min(frames, Math.round(fr * 90));
  const ac = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = 0; i + lag < span; i++) s += onset[i] * onset[i + lag];
    ac[lag] = s / (span - lag);
  }
  let bestLag = minLag, bestV = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * fr) / lag;
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));
    // reinforce with the double-period peak
    const v = (ac[lag] + 0.5 * (ac[lag * 2] || 0)) * w;
    if (v > bestV) { bestV = v; bestLag = lag; }
  }
  let period = bestLag;
  const y0 = ac[bestLag - 1], y1 = ac[bestLag], y2 = ac[bestLag + 1];
  const den = y0 - 2 * y1 + y2;
  if (den < 0) period = bestLag + (0.5 * (y0 - y2)) / den;
  let bpm = (60 * fr) / period;

  // Beat tracking (dynamic programming).
  const tight = 100;
  const score = new Float32Array(frames);
  const back = new Int32Array(frames).fill(-1);
  for (let i = 0; i < frames; i++) {
    const lo = Math.max(0, Math.round(i - 2 * period));
    const hi = Math.round(i - period / 2);
    let best = -Infinity, bj = -1;
    for (let j = lo; j <= hi; j++) {
      const r = Math.log((i - j) / period);
      const v = score[j] - tight * r * r;
      if (v > best) { best = v; bj = j; }
    }
    score[i] = onset[i] + (bj >= 0 ? best : 0);
    back[i] = bj;
  }
  let end = frames - 1, bestEnd = -Infinity;
  for (let i = Math.max(0, frames - Math.round(period)); i < frames; i++) {
    if (score[i] > bestEnd) { bestEnd = score[i]; end = i; }
  }
  const bf = [];
  for (let i = end; i >= 0; i = back[i]) bf.push(i);
  bf.reverse();
  const toTime = (f) => (f * hop + N / 2) / dsr;
  let beats = bf.map(toTime);
  const P = period / fr;
  if (beats.length < 4) {
    beats = [];
    for (let t = 0; t < buffer.duration; t += 60 / bpm) beats.push(t);
  }
  // Drop unreliable edge beats (DP start/end can wander), then extend the
  // grid with the period to cover the whole track.
  const off = (a, b) => Math.abs((b - a) / P - 1) > 0.12;
  while (beats.length > 4 && off(beats[0], beats[1])) beats.shift();
  while (beats.length > 4 && off(beats[beats.length - 2], beats[beats.length - 1])) beats.pop();
  // Extend the grid to cover the whole track.
  while (beats[0] - P > -0.02) beats.unshift(Math.max(0, beats[0] - P));
  const dur = buffer.duration;
  while (beats[beats.length - 1] + P < dur) beats.push(beats[beats.length - 1] + P);
  // Use the measured mean period for display BPM.
  if (beats.length > 8) {
    const d = (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
    bpm = 60 / d;
  }

  // Downbeat phase: which of 4 positions has the strongest low-end onsets.
  const lowAt = (t) => {
    const f = Math.round(((t * dsr) - N / 2) / hop);
    let s = 0;
    for (let k = -2; k <= 2; k++) s += low[f + k] || 0;
    return s;
  };
  const phaseSum = [0, 0, 0, 0];
  beats.forEach((b, i) => { phaseSum[i % 4] += lowAt(b); });
  const downbeatPhase = phaseSum.indexOf(Math.max(...phaseSum));

  // Per-beat energy (RMS) normalized to the 95th percentile, lightly smoothed.
  const rmsAt = (a, b) => {
    const fa = Math.max(0, Math.floor((a * dsr) / hop)), fb = Math.min(frames, Math.ceil((b * dsr) / hop));
    let s = 0;
    for (let i = fa; i < fb; i++) s += rms[i];
    return fb > fa ? s / (fb - fa) : 0;
  };
  let energy = beats.map((b, i) => rmsAt(b, beats[i + 1] ?? b + P));
  const sorted = [...energy].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const p10 = sorted[Math.floor(sorted.length * 0.1)] || 0;
  energy = energy.map((e) => Math.min(1, Math.max(0, (e - p10 * 0.5) / (p95 - p10 * 0.5 || 1))));
  energy = energy.map((e, i) => ((energy[i - 1] ?? e) + 2 * e + (energy[i + 1] ?? e)) / 4);
  const strength = beats.map((b) => {
    const f = Math.round(((b * dsr) - N / 2) / hop);
    return Math.min(1, (onset[f] || 0) / 3);
  });

  return { bpm, beats, downbeatPhase, energy, strength, duration: dur };
}

// Choose where in the song to start so the edit uses its best part.
export function bestSection(analysis, length) {
  const { beats, energy, downbeatPhase, duration } = analysis;
  if (length >= duration - 1) return 0;
  let best = 0, bestScore = -Infinity;
  for (let i = downbeatPhase; i < beats.length; i += 4) {
    const t0 = beats[i];
    if (t0 + length > duration) break;
    let s = 0, c = 0;
    for (let j = i; j < beats.length && beats[j] < t0 + length; j++) { s += energy[j]; c++; }
    const mean = c ? s / c : 0;
    const before = energy.slice(Math.max(0, i - 4), i);
    const after = energy.slice(i, i + 4);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const jump = Math.max(0, avg(after) - avg(before));
    const sc = mean + 0.6 * jump - (t0 < 2 ? 0 : 0.02);
    if (sc > bestScore) { bestScore = sc; best = t0; }
  }
  return best;
}
