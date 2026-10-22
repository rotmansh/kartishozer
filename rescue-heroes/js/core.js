// Core helpers: SVG building, tweens, timers that die with the scene,
// drag & drop, particles and the scene manager.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const G = (window.G = {});
  G.W = 1600;
  G.H = 900;

  // ---------- SVG building ----------
  G.el = function (tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      }
    }
    if (parent) parent.appendChild(e);
    return e;
  };
  G.g = (parent, attrs) => G.el('g', attrs, parent);
  G.svg = document.getElementById('game');
  let uid = 0;
  G.uid = (p) => (p || 'id') + ++uid;

  // ---------- math ----------
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.irand = (a, b) => Math.floor(G.rand(a, b + 1));
  G.pick = (a) => a[Math.floor(Math.random() * a.length)];
  G.shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  G.lerp = (a, b, k) => a + (b - a) * k;
  G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // screen point -> game coordinates
  G.toLocal = function (e) {
    const p = G.svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(G.svg.getScreenCTM().inverse());
    return { x: q.x, y: q.y };
  };
  // a point in some element's local coordinates -> game coordinates
  G.ptIn = function (node, x, y) {
    const p = G.svg.createSVGPoint();
    p.x = x || 0;
    p.y = y || 0;
    const m = G.svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
    const q = p.matrixTransform(m);
    return { x: q.x, y: q.y };
  };

  // position/rotate/scale a group through its transform attribute
  G.place = function (n, x, y, s, r) {
    n._x = x;
    n._y = y;
    if (s != null) n._s = s;
    if (r != null) n._r = r;
    const S = n._s == null ? 1 : n._s;
    const R = n._r || 0;
    let t = 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')';
    if (R) t += ' rotate(' + R.toFixed(1) + ')';
    if (S !== 1 || n._flip) t += ' scale(' + (n._flip ? -S : S) + ' ' + S + ')';
    n.setAttribute('transform', t);
    return n;
  };
  G.flip = function (n, on) {
    n._flip = !!on;
    G.place(n, n._x || 0, n._y || 0);
  };

  // ---------- easing / tweens ----------
  G.ease = {
    linear: (k) => k,
    outCubic: (k) => 1 - Math.pow(1 - k, 3),
    inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    outBack: (k) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    },
  };

  // Scene generation: everything scheduled through these helpers stops
  // silently once the player moves to another scene.
  G.gen = 0;
  function rawTween(dur, fn, ease) {
    ease = ease || G.ease.outCubic;
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        fn(ease(k), k);
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  }
  G.tween = function (dur, fn, ease) {
    ease = ease || G.ease.outCubic;
    const gen = G.gen;
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (t) => {
        if (gen !== G.gen) return; // scene changed: never resolve
        const k = Math.min(1, (t - t0) / dur);
        fn(ease(k), k);
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      requestAnimationFrame(step);
    });
  };
  G.moveTo = function (n, x, y, dur, ease) {
    const x0 = n._x, y0 = n._y;
    return G.tween(dur || 400, (k) => G.place(n, G.lerp(x0, x, k), G.lerp(y0, y, k)), ease);
  };
  // move at a constant speed (px/second)
  G.walkTo = function (n, x, y, speed) {
    const d = G.dist(n._x, n._y, x, y);
    return G.moveTo(n, x, y, Math.max(1, (d / (speed || 200)) * 1000), G.ease.linear);
  };
  G.later = function (fn, ms) {
    const gen = G.gen;
    return setTimeout(() => {
      if (gen === G.gen) fn();
    }, ms);
  };
  G.wait = (ms) => new Promise((res) => G.later(res, ms));
  G.every = function (fn, ms) {
    const gen = G.gen;
    const id = setInterval(() => {
      if (gen !== G.gen) clearInterval(id);
      else fn();
    }, ms);
    return id;
  };
  // restart a CSS animation class
  G.anim = function (n, cls, ms) {
    n.classList.remove(cls);
    void n.getBoundingClientRect();
    n.classList.add(cls);
    const key = '_t_' + cls;
    clearTimeout(n[key]);
    if (ms) n[key] = setTimeout(() => n.classList.remove(cls), ms);
  };

  // ---------- frame loop & particles ----------
  G.frames = [];
  G.onFrame = (fn) => G.frames.push(fn);
  G.parts = [];
  G.spawn = function (node, o) {
    const p = Object.assign(
      { x: 0, y: 0, vx: 0, vy: 0, ay: 0, life: 1, age: 0, r: 0, vr: 0, s: 1, vs: 0, fade: true, drag: 0, op: 1 },
      o
    );
    p.node = node;
    (o.parent || G.layers.fx).appendChild(node);
    G.parts.push(p);
    return p;
  };
  function updParts(dt) {
    for (let i = G.parts.length - 1; i >= 0; i--) {
      const p = G.parts[i];
      p.age += dt;
      if (p.age >= p.life || (p.update && p.update(p, dt) === false)) {
        p.node.remove();
        G.parts.splice(i, 1);
        continue;
      }
      p.vy += p.ay * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.s = Math.max(0.01, p.s + p.vs * dt);
      p.node.setAttribute(
        'transform',
        'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + p.r.toFixed(1) + ') scale(' + p.s.toFixed(3) + ')'
      );
      let o = p.op;
      if (p.fade) {
        const k = p.age / p.life;
        if (k > 0.6) o *= 1 - (k - 0.6) / 0.4;
      }
      p.node.setAttribute('opacity', o.toFixed(2));
    }
  }
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(50, t - last) / 1000;
    last = t;
    const fr = G.frames.slice();
    for (let i = 0; i < fr.length; i++) {
      // a frame callback that returns false is removed
      if (fr[i](dt, t) === false) {
        const j = G.frames.indexOf(fr[i]);
        if (j >= 0) G.frames.splice(j, 1);
      }
    }
    updParts(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- effects ----------
  const CONF = ['#ff5a5f', '#ffb400', '#00b3a4', '#7b61ff', '#3ec1ff', '#ff8ad8', '#8be04e'];
  G.confetti = function (x, y, n) {
    for (let i = 0; i < (n || 60); i++) {
      const r = G.el('rect', { x: -9, y: -5, width: 18, height: 10, rx: 3, fill: G.pick(CONF) });
      G.spawn(r, {
        x, y, vx: G.rand(-560, 560), vy: G.rand(-1150, -420), ay: 1500,
        life: G.rand(1.6, 2.5), vr: G.rand(-720, 720), drag: 0.7,
      });
    }
  };
  G.HEART = 'M0 -6 C -6 -18 -24 -18 -24 -2 C -24 12 -8 20 0 30 C 8 20 24 12 24 -2 C 24 -18 6 -18 0 -6 Z';
  G.hearts = function (x, y, n) {
    for (let i = 0; i < (n || 5); i++) {
      const h = G.el('path', { d: G.HEART, fill: G.pick(['#ff4f7b', '#ff7aa2', '#ff3366']), stroke: '#fff', 'stroke-width': 3 });
      G.spawn(h, {
        x: x + G.rand(-40, 40), y: y + G.rand(-20, 20), vx: G.rand(-70, 70), vy: G.rand(-240, -150),
        life: G.rand(1.1, 1.6), s: G.rand(0.6, 1), vs: 0.25, vr: G.rand(-30, 30),
      });
    }
  };
  G.starPath = function (r1, r2, n) {
    n = n || 5;
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1;
      const a = (Math.PI / n) * i - Math.PI / 2;
      d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ' ' + (Math.sin(a) * r).toFixed(1) + ' ';
    }
    return d + 'Z';
  };
  const STAR = G.starPath(20, 9);
  G.stars = function (x, y, n) {
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * Math.PI * 2, sp = G.rand(280, 520);
      const s = G.el('path', { d: STAR, fill: G.pick(['#ffd23f', '#fff2a8', '#ffb400']), stroke: '#fff', 'stroke-width': 2 });
      G.spawn(s, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 2.8, life: 0.9, vr: G.rand(-300, 300), s: G.rand(0.6, 1.1) });
    }
  };
  G.puff = function (x, y, n, color) {
    for (let i = 0; i < (n || 6); i++) {
      const c = G.el('circle', { r: G.rand(14, 26), fill: color || '#fff' });
      G.spawn(c, {
        x: x + G.rand(-25, 25), y: y + G.rand(-15, 15), vx: G.rand(-90, 90), vy: G.rand(-130, -40),
        drag: 1.5, life: G.rand(0.7, 1.1), vs: 1.3, op: 0.9,
      });
    }
  };

  // pulsing dashed ring that says "touch me"
  G.hint = function (parent, r, x, y) {
    const c = G.el('circle', { cx: x || 0, cy: y || 0, r: r || 70, class: 'hint' });
    parent.insertBefore(c, parent.firstChild);
    return c;
  };

  // ---------- input ----------
  G.onTap = function (n, fn) {
    n.classList.add('tap');
    n.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      G.audio.unlock();
      fn(e);
    });
  };

  // Drag & drop. o: { home:{x,y}, hitR, onStart, onMove, onDrop(x,y)->true if used, can() }
  G.draggable = function (n, o) {
    o = o || {};
    n.classList.add('drag');
    if (o.hitR !== 0) {
      const hit = G.el('circle', { cx: o.hx || 0, cy: o.hy || 0, r: o.hitR || 70, fill: 'transparent' });
      n.insertBefore(hit, n.firstChild);
    }
    const st = { on: false, id: null };
    n._drag = st;
    n.addEventListener('pointerdown', (e) => {
      if (st.on || (o.can && !o.can())) return;
      e.stopPropagation();
      e.preventDefault();
      G.audio.unlock();
      const gen = G.gen;
      const p = G.toLocal(e);
      st.on = true;
      st.id = e.pointerId;
      st.dx = n._x - p.x;
      st.dy = n._y - p.y;
      if (n.parentNode) n.parentNode.appendChild(n);
      n.classList.add('dragging');
      st.s0 = n._s == null ? 1 : n._s;
      G.place(n, n._x, n._y, st.s0 * (o.lift || 1.12));
      G.audio.play('pick');
      if (o.onStart) o.onStart(n._x, n._y);
      const move = (ev) => {
        if (ev.pointerId !== st.id) return;
        const q = G.toLocal(ev);
        G.place(n, q.x + st.dx, q.y + st.dy);
        if (o.onMove) o.onMove(n._x, n._y);
      };
      const up = (ev) => {
        if (ev.pointerId !== st.id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        st.on = false;
        n.classList.remove('dragging');
        if (gen !== G.gen) return;
        G.place(n, n._x, n._y, st.s0);
        const used = o.onDrop ? o.onDrop(n._x, n._y) : false;
        if (!used && o.home) G.sendHome(n, o.home);
        if (o.onEnd) o.onEnd(used);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    return st;
  };
  G.sendHome = function (n, h, dur) {
    const r0 = n._r || 0, r1 = h.r || 0;
    const x0 = n._x, y0 = n._y;
    return G.tween(dur || 380, (k) => G.place(n, G.lerp(x0, h.x, k), G.lerp(y0, h.y, k), null, G.lerp(r0, r1, k)), G.ease.outBack);
  };

  // ---------- backgrounds ----------
  // Backgrounds overflow the 1600x900 frame so wide/tall screens never show bare edges.
  G.bg = {
    sky(L, top, bottom) {
      const id = G.uid('sky');
      const defs = G.el('defs', null, L);
      const lg = G.el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      G.el('stop', { offset: 0, 'stop-color': top }, lg);
      G.el('stop', { offset: 1, 'stop-color': bottom }, lg);
      G.el('rect', { x: -1500, y: -900, width: 4600, height: 2000, fill: 'url(#' + id + ')' }, L);
    },
    sun(L, x, y) {
      const s = G.g(L);
      G.place(s, x, y);
      G.el('circle', { r: 95, fill: '#fff3a0', opacity: 0.5 }, s);
      G.el('circle', { r: 70, fill: '#ffd93b' }, s);
      return s;
    },
    cloud(L, x, y, sc, speed) {
      const c = G.g(L);
      G.place(c, x, y, sc || 1);
      for (const [cx, cy, r] of [[-60, 10, 40], [-15, -12, 52], [40, 0, 44], [80, 14, 32]]) {
        G.el('circle', { cx, cy, r, fill: '#fff' }, c);
      }
      G.el('rect', { x: -100, y: 10, width: 210, height: 36, rx: 18, fill: '#fff' }, c);
      const v = speed == null ? G.rand(8, 20) : speed;
      G.onFrame((dt) => {
        let nx = c._x + v * dt;
        if (nx > 1900) nx = -300;
        G.place(c, nx, c._y);
      });
      return c;
    },
    ground(L, y, color) {
      return G.el('rect', { x: -1500, y, width: 4600, height: 1400, fill: color }, L);
    },
  };

  // ---------- layers & scenes ----------
  G.layers = {};
  G.scenes = {};
  G.current = null;
  G.busy = false;
  G.init = function () {
    const s = G.svg;
    G.layers.scene = G.g(s, { id: 'scene' });
    G.layers.fx = G.g(s, { id: 'fx', 'pointer-events': 'none' });
    G.layers.ui = G.g(s, { id: 'ui' });
    G.layers.fade = G.el('rect', {
      x: -1500, y: -900, width: 4600, height: 2700, fill: '#ffffff', opacity: 0, 'pointer-events': 'none',
    }, s);
  };
  G.go = function (name) {
    if (G.busy || !G.scenes[name]) return;
    G.busy = true;
    const fade = G.layers.fade;
    const first = G.current == null;
    rawTween(first ? 1 : 220, (k) => fade.setAttribute('opacity', first ? 1 : k))
      .then(() => {
        G.gen++;
        G.frames.length = 0;
        G.parts.forEach((p) => p.node.remove());
        G.parts.length = 0;
        G.audio.stopAll();
        G.layers.scene.textContent = '';
        G.layers.fx.textContent = '';
        G.current = name;
        G.scenes[name].enter(G.layers.scene);
        if (G.ui) G.ui.update(name);
        return rawTween(320, (k) => fade.setAttribute('opacity', 1 - k));
      })
      .then(() => {
        G.busy = false;
      });
  };
})();
