// All sounds are synthesized with the Web Audio API, so the game needs no audio files.
// Voice lines use the browser's Hebrew speech voice when the device has one.
(function () {
  'use strict';
  const A = (G.audio = { ctx: null, muted: false });
  let water = null, siren = null;

  A.unlock = function () {
    try {
      if (!A.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        A.ctx = new C();
        A.out = A.ctx.createGain();
        A.out.gain.value = 0.7;
        const comp = A.ctx.createDynamicsCompressor();
        A.out.connect(comp);
        comp.connect(A.ctx.destination);
        const len = A.ctx.sampleRate * 2;
        A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        const d = A.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (A.ctx.state === 'suspended') A.ctx.resume();
    } catch (e) { /* audio is optional */ }
  };
  const ok = () => A.ctx && !A.muted && A.ctx.state !== 'closed';

  A.tone = function (o) {
    if (!ok()) return;
    const c = A.ctx, t = c.currentTime + (o.at || 0), d = o.dur || 0.2;
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + d);
    const g = c.createGain();
    const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    if (o.vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = o.vib;
      lg.gain.value = o.vibAmt || 20;
      l.connect(lg);
      lg.connect(osc.frequency);
      l.start(t);
      l.stop(t + d + 0.05);
    }
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filter;
      f.frequency.value = o.ff || 1000;
      f.Q.value = o.q || 1;
      osc.connect(f);
      f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(A.out);
    osc.start(t);
    osc.stop(t + d + 0.05);
  };

  A.noise = function (o) {
    if (!ok()) return;
    const c = A.ctx, t = c.currentTime + (o.at || 0), d = o.dur || 0.3;
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.ff || 1000, t);
    if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + d);
    f.Q.value = o.q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + (o.att || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f);
    f.connect(g);
    g.connect(A.out);
    src.start(t, Math.random());
    src.stop(t + d + 0.05);
  };

  const S = {
    pick: () => A.tone({ type: 'triangle', f: 500, f2: 750, dur: 0.08, vol: 0.15 }),
    pop: () => A.tone({ f: 330, f2: 950, dur: 0.12, vol: 0.3 }),
    boing: () => A.tone({ f: 170, f2: 560, dur: 0.38, vol: 0.32, vib: 13, vibAmt: 70 }),
    giggle: () => {
      for (let i = 0; i < 5; i++) {
        A.tone({ f: 720 + (i % 2) * 190 + Math.random() * 60, f2: 620 + (i % 2) * 150, dur: 0.08, at: i * 0.09, vol: 0.2, vib: 30, vibAmt: 40 });
      }
    },
    yum: () => {
      A.tone({ f: 260, f2: 330, dur: 0.35, vol: 0.25, vib: 7, vibAmt: 15 });
      A.tone({ type: 'triangle', f: 420, f2: 700, dur: 0.18, at: 0.38, vol: 0.25 });
      A.tone({ type: 'triangle', f: 520, f2: 900, dur: 0.22, at: 0.58, vol: 0.25 });
    },
    yuck: () => A.tone({ type: 'sawtooth', f: 330, f2: 110, dur: 0.65, vol: 0.2, vib: 12, vibAmt: 35, filter: 'lowpass', ff: 900 }),
    sour: () => {
      A.tone({ type: 'square', f: 900, f2: 1500, dur: 0.3, vol: 0.09, vib: 25, vibAmt: 90, filter: 'lowpass', ff: 2500 });
      A.tone({ f: 1500, f2: 700, dur: 0.3, at: 0.3, vol: 0.15 });
    },
    spicy: () => {
      A.noise({ dur: 1, vol: 0.25, ff: 1500, ff2: 5000, q: 3 });
      A.tone({ type: 'sawtooth', f: 300, f2: 950, dur: 0.85, vol: 0.12, vib: 20, vibAmt: 60, filter: 'lowpass', ff: 1800 });
    },
    tada: () => [523, 659, 784, 1047].forEach((f, i) => A.tone({ type: 'triangle', f, dur: i === 3 ? 0.6 : 0.18, at: i * 0.12, vol: 0.26 })),
    ding: () => { A.tone({ f: 1320, dur: 0.5, vol: 0.2 }); A.tone({ f: 1760, dur: 0.6, at: 0.1, vol: 0.15 }); },
    sparkle: () => { for (let i = 0; i < 6; i++) A.tone({ f: 1500 + Math.random() * 1500, dur: 0.1, at: i * 0.05, vol: 0.09 }); },
    whistle: () => [0, 0.36].forEach((at) => A.tone({ f: 2700, dur: 0.28, at, vol: 0.16, vib: 28, vibAmt: 190 })),
    tweet: () => { for (let i = 0; i < 3; i++) A.tone({ f: 2400, f2: 3500, dur: 0.07, at: i * 0.1, vol: 0.12 }); },
    sizzle: () => A.noise({ dur: 0.8, vol: 0.3, filter: 'highpass', ff: 3000 }),
    whoosh: () => A.noise({ dur: 0.35, vol: 0.25, ff: 400, ff2: 2500, q: 1.5 }),
    rustle: () => { for (let i = 0; i < 3; i++) A.noise({ dur: 0.12, at: i * 0.09, vol: 0.2, ff: 2500, q: 0.8 }); },
    heartbeat: () => [0, 0.18, 0.75, 0.93].forEach((at, i) => A.tone({ f: i % 2 ? 55 : 68, f2: 40, dur: 0.15, at, vol: 0.7 })),
    quack: () => A.tone({ type: 'sawtooth', f: 540, f2: 380, dur: 0.16, vol: 0.2, filter: 'bandpass', ff: 1100, q: 4 }),
    bark: () => [0, 0.22].forEach((at) => {
      A.tone({ type: 'square', f: 480, f2: 250, dur: 0.12, at, vol: 0.14, filter: 'lowpass', ff: 1500 });
      A.noise({ dur: 0.1, at, vol: 0.15, ff: 900 });
    }),
    meow: () => {
      A.tone({ type: 'triangle', f: 520, f2: 800, dur: 0.25, vol: 0.2, vib: 6, vibAmt: 20 });
      A.tone({ type: 'triangle', f: 800, f2: 440, dur: 0.38, at: 0.24, vol: 0.2 });
    },
    honk: () => [0, 0.26].forEach((at) => {
      A.tone({ type: 'square', f: 370, dur: 0.18, at, vol: 0.11, filter: 'lowpass', ff: 1400 });
      A.tone({ type: 'square', f: 466, dur: 0.18, at, vol: 0.11, filter: 'lowpass', ff: 1400 });
    }),
    crunch: () => { for (let i = 0; i < 4; i++) A.noise({ dur: 0.06, at: i * 0.12, vol: 0.32, ff: 1800 + Math.random() * 1200, q: 2 }); },
    gulp: () => [0, 0.25, 0.5].forEach((at) => A.tone({ f: 220, f2: 80, dur: 0.14, at, vol: 0.4 })),
    bell: () => { for (let i = 0; i < 16; i++) A.tone({ type: 'triangle', f: 1350, dur: 0.06, at: i * 0.07, vol: 0.12 }); },
    thud: () => A.tone({ f: 130, f2: 50, dur: 0.16, vol: 0.45 }),
    zip: () => A.noise({ dur: 0.22, vol: 0.25, ff: 2500, ff2: 700, q: 2 }),
    squeak: () => A.tone({ f: 1100, f2: 1700, dur: 0.09, vol: 0.15 }),
    beep: () => [0, 0.18, 0.36].forEach((at) => A.tone({ type: 'square', f: 1900, dur: 0.1, at, vol: 0.07 })),
    ahh: () => A.tone({ f: 520, f2: 300, dur: 0.7, vol: 0.18, vib: 5, vibAmt: 10 }),
    cry: () => [0, 0.45].forEach((at) => A.tone({ f: 640, f2: 420, dur: 0.4, at, vol: 0.1, vib: 9, vibAmt: 40 })),
    spit: () => { A.noise({ dur: 0.15, vol: 0.3, ff: 1500, q: 1 }); A.tone({ f: 400, f2: 900, dur: 0.12, at: 0.05, vol: 0.2 }); },
    steam: () => A.noise({ dur: 0.5, vol: 0.18, filter: 'highpass', ff: 4000 }),
    engine: () => A.noise({ dur: 0.8, vol: 0.35, filter: 'lowpass', ff: 220, q: 4 }),
    snap: () => A.noise({ dur: 0.05, vol: 0.4, ff: 3000, q: 2 }),
  };
  A.play = function (name) {
    try { if (S[name]) S[name](); } catch (e) { /* ignore */ }
  };

  // ---------- sirens ----------
  A.siren = function (kind, dur) {
    if (!ok() || siren) return;
    const c = A.ctx, t = c.currentTime;
    dur = dur || 3;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.08);
    g.gain.setValueAtTime(0.07, t + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const fr = osc.frequency;
    if (kind === 'police') {
      // fast "yelp"
      for (let x = 0; x < dur; x += 0.22) { fr.setValueAtTime(750, t + x); fr.linearRampToValueAtTime(1550, t + x + 0.2); }
    } else if (kind === 'mda') {
      // hi-lo wail
      for (let x = 0; x < dur; x += 0.9) { fr.setValueAtTime(650, t + x); fr.linearRampToValueAtTime(1350, t + x + 0.45); fr.linearRampToValueAtTime(650, t + x + 0.9); }
    } else {
      // slow fire-truck wail
      fr.setValueAtTime(380, t);
      for (let x = 0; x < dur; x += 1.5) { fr.linearRampToValueAtTime(950, t + x + 0.75); fr.linearRampToValueAtTime(380, t + x + 1.5); }
    }
    osc.connect(f);
    f.connect(g);
    g.connect(A.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    siren = osc;
    osc.onended = () => { siren = null; };
  };

  // ---------- running water (hose) ----------
  A.waterStart = function () {
    if (!ok() || water) return;
    const c = A.ctx;
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1300;
    f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.28, c.currentTime + 0.15);
    src.connect(f);
    f.connect(g);
    g.connect(A.out);
    src.start();
    water = { src, g };
  };
  A.waterStop = function () {
    if (!water) return;
    const w = water;
    water = null;
    try {
      const t = A.ctx.currentTime;
      w.g.gain.cancelScheduledValues(t);
      w.g.gain.setValueAtTime(w.g.gain.value, t);
      w.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      w.src.stop(t + 0.25);
    } catch (e) { /* ignore */ }
  };

  A.stopAll = function () {
    A.waterStop();
    if (siren) { try { siren.stop(); } catch (e) { /* ignore */ } siren = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (m) A.stopAll();
  };

  // ---------- Hebrew voice lines ----------
  A.voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices();
    A.voice = vs.find((v) => /^(he|iw)/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }
  A.say = function (text, pitch) {
    if (A.muted || !A.voice || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = A.voice;
      u.lang = A.voice.lang;
      u.pitch = pitch || 1.7;
      u.rate = 1.05;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  };
})();
