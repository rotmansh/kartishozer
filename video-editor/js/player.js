// Real-time playback: keeps one <video> per clip near the playhead in sync
// with the music clock, and asks the renderer for a frame on every tick.
import { clamp } from './util.js';
import { createVideoEl, seekVideo } from './analyzer.js';

export class Player {
  constructor(canvas, renderer, getProject, getMedia) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = renderer;
    this.getProject = getProject;
    this.getMedia = getMedia;
    this.time = 0;
    this.playing = false;
    this.els = new Map();
    this.ac = null;
    this.listeners = { time: [], state: [], ended: [] };
    this.drawOpts = {};
    this._raf = 0;
    this._dirty = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  on(ev, fn) { this.listeners[ev].push(fn); }
  emit(ev, v) { for (const f of this.listeners[ev]) f(v); }

  audio() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.connect(this.ac.destination);
      this.musicGain = this.ac.createGain();
      this.musicGain.connect(this.master);
    }
    return this.ac;
  }

  get duration() { return this.getProject()?.duration || 0; }

  srcTime(clip, t, m) {
    const raw = clip.in + (t - clip.start) * clip.speed;
    return clamp(raw, 0, Math.max(0, (m.duration || 0) - 0.05));
  }

  // Which clips need a decoded frame at time t (current + transition partner).
  activeClips(t) {
    const P = this.getProject();
    if (!P) return [];
    const out = [];
    P.clips.forEach((c, i) => {
      const lead = (c.transition?.dur || 0) / 2 + 0.05;
      const tail = (P.clips[i + 1]?.transition?.dur || 0) / 2 + 0.05;
      if (t >= c.start - lead && t < c.start + c.dur + tail) out.push(c);
    });
    return out;
  }

  entry(clip) {
    const m = this.getMedia(clip.mediaId);
    if (!m || m.type !== 'video') return null;
    let e = this.els.get(clip.id);
    if (e && e.mediaId !== m.id) { this.dropEntry(clip.id); e = null; }
    if (!e) {
      const el = createVideoEl(m.url);
      el.muted = true;
      e = { el, mediaId: m.id, gain: null, src: null, lastUse: 0, ready: false };
      el.addEventListener('seeked', () => { e.ready = true; this._dirty = true; });
      el.addEventListener('loadeddata', () => { e.ready = true; this._dirty = true; });
      this.els.set(clip.id, e);
    }
    e.lastUse = performance.now();
    return e;
  }

  dropEntry(id) {
    const e = this.els.get(id);
    if (!e) return;
    try { e.el.pause(); e.el.removeAttribute('src'); e.el.load(); } catch { /* ignore */ }
    try { e.src?.disconnect(); } catch { /* ignore */ }
    this.els.delete(id);
  }

  // Connect a clip's original sound into the mix when it has volume.
  routeAudio(e, clip) {
    const P = this.getProject();
    const vol = (P.origVolume ?? 0) * (clip.volume ?? 1);
    if (vol <= 0.001) { e.el.muted = true; if (e.gain) e.gain.gain.value = 0; return; }
    const ac = this.audio();
    if (!e.src) {
      try {
        e.src = ac.createMediaElementSource(e.el);
        e.gain = ac.createGain();
        e.src.connect(e.gain).connect(this.master);
      } catch { e.src = null; }
    }
    if (e.gain) e.gain.gain.value = vol;
    e.el.muted = false;
  }

  getSource = (clip) => {
    const m = this.getMedia(clip.mediaId);
    if (!m) return null;
    if (m.type === 'image') return { el: m.el, w: m.width, h: m.height };
    const e = this.els.get(clip.id);
    if (e && e.el.readyState >= 2 && e.ready) return { el: e.el, w: e.el.videoWidth || m.width, h: e.el.videoHeight || m.height };
    return m.poster ? { el: m.poster, w: m.poster.width, h: m.poster.height } : null;
  };

  syncVideos(t, playing) {
    const P = this.getProject();
    if (!P) return;
    const active = new Set(this.activeClips(t).map((c) => c.id));
    // Preload the next upcoming clips so cuts are instant.
    const soon = P.clips.filter((c) => !active.has(c.id) && c.start > t && c.start - t < 1.6);
    for (const c of P.clips) {
      const m = this.getMedia(c.mediaId);
      if (!m || m.type !== 'video') continue;
      if (active.has(c.id)) {
        const e = this.entry(c);
        const want = this.srcTime(c, t, m);
        const frozen = c.in + (t - c.start) * c.speed > m.duration - 0.06 || t < c.start;
        e.el.playbackRate = c.speed;
        if (playing && !frozen) {
          this.routeAudio(e, c);
          if (e.el.paused) {
            if (Math.abs(e.el.currentTime - want) > 0.05) e.el.currentTime = want;
            const pr = e.el.play();
            if (pr && pr.catch) pr.catch(() => { e.el.muted = true; e.el.play().catch(() => {}); });
          } else if (Math.abs(e.el.currentTime - want) > 0.3) {
            e.el.currentTime = want;
          }
        } else {
          if (!e.el.paused) e.el.pause();
          if (Math.abs(e.el.currentTime - want) > 0.04 && !e.el.seeking) { e.ready = false; e.el.currentTime = want; }
        }
      } else if (soon.includes(c)) {
        const e = this.entry(c);
        if (!e.el.paused) e.el.pause();
        const want = this.srcTime(c, c.start, m);
        if (Math.abs(e.el.currentTime - want) > 0.05 && !e.el.seeking) e.el.currentTime = want;
      } else {
        const e = this.els.get(c.id);
        if (e && !e.el.paused) e.el.pause();
      }
    }
    // Release decoders that have not been needed for a while (mobile limits).
    const now = performance.now();
    if (this.els.size > 6) {
      for (const [id, e] of this.els) {
        if (!active.has(id) && now - e.lastUse > 4000) this.dropEntry(id);
      }
    }
    for (const id of [...this.els.keys()]) if (!P.clips.some((c) => c.id === id)) this.dropEntry(id);
  }

  async play() {
    const P = this.getProject();
    if (!P || this.playing) return;
    const ac = this.audio();
    try { await ac.resume(); } catch { /* ignore */ }
    if (this.time >= this.duration - 0.05) this.time = 0;
    this.playing = true;
    const startAt = ac.currentTime + 0.06;
    this.t0 = startAt - this.time;
    this.startMusic(startAt);
    this.emit('state', true);
  }

  startMusic(at) {
    const P = this.getProject();
    this.stopMusic();
    if (!P.music?.buffer) return;
    const ac = this.audio();
    const src = ac.createBufferSource();
    src.buffer = P.music.buffer;
    src.connect(this.musicGain);
    const g = this.musicGain.gain;
    const vol = P.musicVolume ?? 1;
    g.cancelScheduledValues(0);
    g.setValueAtTime(vol, at);
    const end = P.duration;
    if (P.fadeOut && end - this.time > 0.2) {
      const fs = Math.max(this.time, end - 2);
      g.setValueAtTime(vol, at + (fs - this.time));
      g.linearRampToValueAtTime(0.0001, at + (end - this.time));
    }
    const off = (P.musicOffset || 0) + this.time;
    if (off < P.music.buffer.duration) src.start(at, off);
    this.musicSrc = src;
  }

  stopMusic() {
    if (this.musicSrc) { try { this.musicSrc.stop(); } catch { /* ignore */ } this.musicSrc.disconnect(); this.musicSrc = null; }
  }

  pause() {
    if (!this.playing) return;
    this.time = this.clock();
    this.playing = false;
    this.stopMusic();
    for (const e of this.els.values()) e.el.pause();
    this.emit('state', false);
    this._dirty = true;
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  seek(t) {
    const was = this.playing;
    if (was) this.pause();
    this.time = clamp(t, 0, this.duration);
    this._dirty = true;
    this.syncVideos(this.time, false);
    this.emit('time', this.time);
    if (was) this.play();
  }

  clock() {
    if (!this.playing) return this.time;
    return Math.max(0, this.ac.currentTime - this.t0);
  }

  invalidate() { this._dirty = true; }

  // Wait until every video needed at time t has a decoded frame.
  async ready(t = this.time) {
    const deadline = performance.now() + 4000;
    this.syncVideos(t, false);
    for (const c of this.activeClips(t)) {
      const e = this.els.get(c.id);
      if (!e) continue;
      const m = this.getMedia(c.mediaId);
      if (e.el.readyState < 2) await new Promise((r) => { e.el.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 3000); });
      await seekVideo(e.el, this.srcTime(c, t, m));
      e.ready = true;
      if (performance.now() > deadline) break;
    }
  }

  loop() {
    requestAnimationFrame(this.loop);
    const P = this.getProject();
    if (!P) return;
    if (this.playing) {
      let t = this.clock();
      if (t >= P.duration) {
        t = P.duration;
        this.time = t;
        this.pause();
        this.emit('ended');
      } else this.time = t;
      this.syncVideos(this.time, this.playing);
      this.emit('time', this.time);
      this._dirty = true;
    }
    if (this._dirty) {
      this._dirty = false;
      if (!this.playing) this.syncVideos(this.time, false);
      this.renderer.draw(this.ctx, Math.min(this.time, P.duration - 0.001), P, this.getSource, this.drawOpts);
    }
  }
}
