// Cute characters drawn in SVG. Origin of every character is between its feet.
// Body coordinates: shoulders at y≈-178, neck at y=-186, head centre at y≈-261.
(function () {
  'use strict';
  const el = G.el, g = G.g;
  const INK = '#2d2226';

  G.SKINS = ['#ffdbac', '#f6d1b0', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
  G.SHIRTS = ['#ff7eb6', '#7ec8ff', '#ffd166', '#9be564', '#c49bff', '#ff9f68', '#5ee0c8'];
  G.HAIRS = ['#2a1a12', '#5a3825', '#c98b2b', '#e8c07a', '#a0522d', '#111111'];

  const PRESETS = {
    fire: { skin: '#f1c27d', shirt: '#2c3e75', pants: '#24315e', shoes: '#222', hair: 'short', hairColor: '#5a3825', hat: 'fire', stripes: '#ffd23f' },
    medic: { skin: '#c68642', shirt: '#ffffff', pants: '#2b3a55', shoes: '#333', hair: 'curly', hairColor: '#2a1a12', vest: 'mda' },
    police: { skin: '#f6d1b0', shirt: '#8fbbe8', pants: '#1f2f5a', shoes: '#111', hair: 'pony', hairColor: '#c98b2b', hat: 'police', police: true },
    soldier: { skin: '#e0ac69', shirt: '#6b7a3c', pants: '#5f6d35', shoes: '#3a2b1a', hair: 'short', hairColor: '#1d1410', pockets: true },
  };

  // equilateral-triangle hexagram (Magen David)
  G.starOfDavid = function (parent, cx, cy, r, fill, stroke) {
    const tri = (rot) => {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const a = ((rot + i * 120) * Math.PI) / 180;
        pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1));
      }
      return pts.join(' ');
    };
    const attrs = stroke
      ? { fill: 'none', stroke, 'stroke-width': r * 0.22, 'stroke-linejoin': 'round' }
      : { fill };
    el('polygon', Object.assign({ points: tri(-90) }, attrs), parent);
    el('polygon', Object.assign({ points: tri(90) }, attrs), parent);
  };

  const MOUTH = {
    smile: { d: 'M -24 -48 Q 0 -22 24 -48', fill: 'none' },
    open: { d: 'M -28 -50 Q 0 0 28 -50 Z', fill: '#7a2236' },
    frown: { d: 'M -20 -32 Q 0 -50 20 -32', fill: 'none' },
    o: { d: 'M -11 -40 A 11 14 0 1 0 11 -40 A 11 14 0 1 0 -11 -40 Z', fill: '#7a2236' },
    wavy: { d: 'M -28 -40 q 7 -9 14 0 t 14 0 t 14 0 t 14 0', fill: 'none' },
    pucker: { d: 'M -9 -40 Q 0 -54 9 -40 Q 0 -26 -9 -40 Z', fill: '#7a2236' },
    chew: { d: 'M -18 -42 Q 0 -32 18 -42', fill: 'none' },
  };
  // [eyes, mouth, brows, tint, tongue-out]
  const MOODS = {
    happy: ['open', 'smile'],
    big: ['closed', 'open'],
    sad: ['open', 'frown', 'sad'],
    wow: ['open', 'o', 'up'],
    yum: ['closed', 'smile', null, null, true],
    yuck: ['squint', 'wavy', null, '#7cc242'],
    sour: ['squint', 'pucker', null, '#f2e14b'],
    spicy: ['squint', 'open', null, '#ff2d1a'],
    hot: ['open', 'frown', 'sad', '#ff5040'],
    chew: ['closed', 'chew'],
  };
  const BROWS = {
    sad: 'M -44 -106 L -16 -116 M 44 -106 L 16 -116',
    up: 'M -42 -114 Q -28 -126 -14 -114 M 42 -114 Q 28 -126 14 -114',
  };

  G.makeCharacter = function (kind, opt) {
    const o = Object.assign({ skin: '#f1c27d', shirt: '#7ec8ff', pants: '#3b4a6b', shoes: '#333', hair: 'short', hairColor: '#5a3825' },
      PRESETS[kind] || {}, opt || {});
    const root = g(null, { class: 'char' });
    el('ellipse', { cx: 0, cy: 2, rx: 80, ry: 14, fill: 'rgba(0,0,0,.16)' }, root);
    const act = g(root, { class: 'act' });
    const idle = g(act, { class: 'idle' });
    idle.style.animationDelay = (-Math.random() * 2.6).toFixed(2) + 's';

    // ---- back slot (backpack) ----
    const slotBack = g(idle);

    // ---- legs ----
    const legs = g(idle);
    el('rect', { x: -46, y: -88, width: 34, height: 80, rx: 14, fill: o.pants }, legs);
    el('rect', { x: 12, y: -88, width: 34, height: 80, rx: 14, fill: o.pants }, legs);
    if (o.stripes) {
      el('rect', { x: -46, y: -40, width: 34, height: 9, fill: o.stripes }, legs);
      el('rect', { x: 12, y: -40, width: 34, height: 9, fill: o.stripes }, legs);
    }
    el('ellipse', { cx: -31, cy: -8, rx: 28, ry: 14, fill: o.shoes }, legs);
    el('ellipse', { cx: 31, cy: -8, rx: 28, ry: 14, fill: o.shoes }, legs);

    // ---- body ----
    const body = g(idle);
    el('rect', { x: -70, y: -194, width: 140, height: 122, rx: 42, fill: o.shirt }, body);
    if (o.stripes) {
      el('rect', { x: -69, y: -132, width: 138, height: 13, fill: o.stripes }, body);
      el('rect', { x: -68, y: -112, width: 136, height: 6, fill: '#cfd8dc' }, body);
      el('rect', { x: -8, y: -194, width: 16, height: 70, fill: 'rgba(0,0,0,.18)' }, body);
    }
    if (o.vest === 'mda') {
      el('path', { d: 'M -70 -152 Q -70 -194 -28 -194 L -22 -194 L 0 -152 L 22 -194 L 28 -194 Q 70 -194 70 -152 L 70 -114 Q 70 -72 28 -72 L -28 -72 Q -70 -72 -70 -114 Z', fill: '#e8202a' }, body);
      el('rect', { x: -66, y: -104, width: 132, height: 9, fill: '#ffe066' }, body);
      el('circle', { cx: 34, cy: -140, r: 20, fill: '#fff' }, body);
      G.starOfDavid(body, 34, -140, 15, '#e8202a');
      el('path', { d: 'M -26 -192 Q -42 -140 -12 -128', stroke: '#5b6770', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, body);
      el('path', { d: 'M 24 -192 Q 30 -170 14 -160', stroke: '#5b6770', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, body);
      el('circle', { cx: -10, cy: -124, r: 10, fill: '#c8d2d8', stroke: '#5b6770', 'stroke-width': 4 }, body);
    }
    if (o.police) {
      el('path', { d: 'M -8 -192 L 8 -192 L 7 -150 L 0 -138 L -7 -150 Z', fill: '#1f2f5a' }, body);
      el('rect', { x: -68, y: -100, width: 136, height: 16, fill: '#1b1b1b' }, body);
      el('rect', { x: -11, y: -103, width: 22, height: 22, rx: 4, fill: '#d4af37' }, body);
      const badge = el('path', { d: G.starPath(15, 7, 6), fill: '#e8c547', stroke: '#b8922a', 'stroke-width': 2 }, body);
      G.place(badge, 36, -152);
      el('rect', { x: -52, y: -160, width: 28, height: 22, rx: 5, fill: 'none', stroke: 'rgba(0,0,0,.2)', 'stroke-width': 3 }, body);
    }
    if (o.pockets) {
      el('rect', { x: -52, y: -168, width: 34, height: 28, rx: 6, fill: 'none', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 4 }, body);
      el('rect', { x: 18, y: -168, width: 34, height: 28, rx: 6, fill: 'none', stroke: 'rgba(0,0,0,.25)', 'stroke-width': 4 }, body);
    }
    if (o.shirtPrint) {
      const pr = el('path', { d: G.starPath(18, 8), fill: o.shirtPrint }, body);
      G.place(pr, 0, -134);
    }

    const slotBody = g(idle);

    // ---- arms (pivot at the shoulder) ----
    function arm(side) {
      const outer = g(idle);
      G.place(outer, side * 64, -178, 1, side * -14);
      const inner = g(outer, { class: 'arm' });
      el('rect', { x: -17, y: -12, width: 34, height: 98, rx: 17, fill: o.sleeve || o.shirt }, inner);
      if (o.stripes) el('rect', { x: -17, y: 50, width: 34, height: 10, fill: o.stripes }, inner);
      if (o.vest === 'mda') el('rect', { x: -17, y: 52, width: 34, height: 8, fill: '#e8202a' }, inner);
      el('circle', { cx: 0, cy: 92, r: 19, fill: o.skin }, inner);
      inner._outer = outer;
      return inner;
    }
    const armL = arm(-1);
    const armR = arm(1);

    // ---- head (pivot at the neck) ----
    const headOuter = g(idle);
    G.place(headOuter, 0, -186);
    const head = g(headOuter, { class: 'head' });

    if (o.hair === 'pony') {
      el('ellipse', { cx: 0, cy: -82, rx: 86, ry: 84, fill: o.hairColor }, head);
      el('ellipse', { cx: 92, cy: -112, rx: 24, ry: 44, fill: o.hairColor, transform: 'rotate(32 92 -112)' }, head);
      el('circle', { cx: 74, cy: -132, r: 10, fill: '#ff4f7b' }, head);
    }
    if (o.hair === 'curly') {
      el('ellipse', { cx: 0, cy: -86, rx: 90, ry: 86, fill: o.hairColor }, head);
    }
    // ears
    if (o.ears === 'bear') {
      for (const sx of [-1, 1]) {
        el('circle', { cx: sx * 56, cy: -138, r: 28, fill: o.skin }, head);
        el('circle', { cx: sx * 56, cy: -138, r: 14, fill: '#e8a7a0' }, head);
      }
    } else if (o.ears === 'bunny') {
      for (const sx of [-1, 1]) {
        el('ellipse', { cx: sx * 30, cy: -182, rx: 21, ry: 58, fill: o.skin, transform: 'rotate(' + sx * 10 + ' ' + sx * 30 + ' -182)' }, head);
        el('ellipse', { cx: sx * 30, cy: -180, rx: 9, ry: 42, fill: '#ffb6c8', transform: 'rotate(' + sx * 10 + ' ' + sx * 30 + ' -180)' }, head);
      }
    } else if (o.ears === 'cat') {
      el('polygon', { points: '-74,-104 -64,-182 -14,-146', fill: o.skin }, head);
      el('polygon', { points: '74,-104 64,-182 14,-146', fill: o.skin }, head);
      el('polygon', { points: '-62,-118 -58,-164 -30,-144', fill: '#ffb6c8' }, head);
      el('polygon', { points: '62,-118 58,-164 30,-144', fill: '#ffb6c8' }, head);
    } else {
      el('circle', { cx: -77, cy: -72, r: 15, fill: o.skin }, head);
      el('circle', { cx: 77, cy: -72, r: 15, fill: o.skin }, head);
    }
    el('circle', { cx: 0, cy: -75, r: 78, fill: o.skin }, head);
    const tint = el('circle', { cx: 0, cy: -75, r: 78, fill: '#f00', class: 'tint', opacity: 0 }, head);
    tint.style.opacity = 0;
    if (o.ears === 'bear') {
      el('ellipse', { cx: 0, cy: -46, rx: 34, ry: 25, fill: '#e8c9a0' }, head);
      el('ellipse', { cx: 0, cy: -60, rx: 13, ry: 9, fill: INK }, head);
    } else if (o.ears === 'bunny') {
      el('ellipse', { cx: 0, cy: -58, rx: 9, ry: 7, fill: '#ff8fab' }, head);
    } else if (o.ears === 'cat') {
      el('path', { d: 'M -9 -62 L 9 -62 L 0 -52 Z', fill: '#ff8fab' }, head);
      for (const sx of [-1, 1]) {
        el('path', { d: 'M ' + sx * 30 + ' -54 L ' + sx * 78 + ' -64 M ' + sx * 30 + ' -46 L ' + sx * 78 + ' -44', stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }, head);
      }
    }

    // ---- face ----
    const face = g(head);
    el('circle', { cx: -50, cy: -50, r: 14, fill: '#ff7a8a', opacity: 0.45 }, face);
    el('circle', { cx: 50, cy: -50, r: 14, fill: '#ff7a8a', opacity: 0.45 }, face);
    const eyesOpen = g(face, { class: 'eyes' });
    eyesOpen.style.animationDelay = (-Math.random() * 4).toFixed(2) + 's';
    const eyesClosed = g(face);
    const eyesSquint = g(face);
    for (const sx of [-1, 1]) {
      const x = sx * 28;
      el('ellipse', { cx: x, cy: -84, rx: 11, ry: 14, fill: INK }, eyesOpen);
      el('circle', { cx: x + 4, cy: -89, r: 4, fill: '#fff' }, eyesOpen);
      el('path', { d: 'M ' + (x - 13) + ' -80 Q ' + x + ' -97 ' + (x + 13) + ' -80', stroke: INK, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, eyesClosed);
      el('path', { d: 'M ' + sx * 40 + ' -94 L ' + sx * 18 + ' -84 L ' + sx * 40 + ' -74', stroke: INK, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, eyesSquint);
    }
    const brows = el('path', { stroke: INK, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, face);
    const mouth = el('path', { stroke: INK, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, face);
    const tongueIn = el('ellipse', { cx: 0, cy: -30, rx: 12, ry: 5, fill: '#ff6f91' }, face);
    const tongueOut = el('ellipse', { cx: 13, cy: -36, rx: 11, ry: 9, fill: '#ff6f91', transform: 'rotate(25 13 -36)' }, face);
    const extra = g(face);

    // ---- front hair & hats ----
    if (o.hair === 'short') {
      el('path', { d: 'M -78 -78 Q -84 -158 0 -160 Q 84 -158 78 -78 Q 70 -112 40 -118 Q 10 -104 -14 -122 Q -46 -108 -78 -78 Z', fill: o.hairColor }, head);
    } else if (o.hair === 'pony') {
      el('path', { d: 'M -80 -80 Q -78 -162 0 -162 Q 78 -162 80 -80 Q 58 -130 0 -128 Q -42 -126 -80 -80 Z', fill: o.hairColor }, head);
    } else if (o.hair === 'curly') {
      for (let a = -175; a <= -5; a += 24) {
        const r = (a * Math.PI) / 180;
        el('circle', { cx: Math.cos(r) * 72, cy: -78 + Math.sin(r) * 72, r: 27, fill: o.hairColor }, head);
      }
    }
    // hats sit a bit higher so the eyes stay visible
    const hat = g(head, { transform: 'translate(0 -22)' });
    if (o.hat === 'fire') {
      el('path', { d: 'M -88 -94 C -88 -152 -50 -176 0 -176 C 50 -176 88 -152 88 -94 Z', fill: '#e8382e' }, hat);
      el('path', { d: 'M 0 -176 L 0 -98', stroke: '#b8261d', 'stroke-width': 12, 'stroke-linecap': 'round' }, hat);
      el('path', { d: 'M -108 -96 Q 0 -74 108 -96 Q 116 -82 102 -76 Q 0 -56 -102 -76 Q -116 -82 -108 -96 Z', fill: '#c42a21' }, hat);
      el('path', { d: 'M -22 -150 L 22 -150 L 22 -128 Q 22 -108 0 -102 Q -22 -108 -22 -128 Z', fill: '#ffd23f', stroke: '#c99a2e', 'stroke-width': 3 }, hat);
    } else if (o.hat === 'police') {
      el('path', { d: 'M -86 -104 C -92 -150 -46 -172 0 -172 C 46 -172 92 -150 86 -104 Z', fill: '#1f2f5a' }, hat);
      el('rect', { x: -84, y: -116, width: 168, height: 20, fill: '#111a3a' }, hat);
      el('path', { d: 'M -74 -98 Q 0 -66 74 -98 Q 0 -84 -74 -98 Z', fill: '#0a0a14' }, hat);
      el('circle', { cx: 0, cy: -136, r: 15, fill: '#e8c547', stroke: '#b8922a', 'stroke-width': 3 }, hat);
    }
    const slotHead = g(head);
    const slotEyes = g(head);

    const c = {
      g: root, act, idle, head, headOuter, armL, armR, extra, mouth, opt: o,
      slots: { back: slotBack, body: slotBody, head: slotHead, eyes: slotEyes },
      mood: 'happy', base: 'happy',
    };

    function setMood(m) {
      const M = MOODS[m] || MOODS.happy;
      c.mood = m;
      eyesOpen.style.display = M[0] === 'open' ? '' : 'none';
      eyesClosed.style.display = M[0] === 'closed' ? '' : 'none';
      eyesSquint.style.display = M[0] === 'squint' ? '' : 'none';
      const mo = MOUTH[M[1]];
      mouth.setAttribute('d', mo.d);
      mouth.setAttribute('fill', mo.fill);
      mouth.classList.toggle('chewing', m === 'chew');
      if (M[2]) {
        brows.setAttribute('d', BROWS[M[2]]);
        brows.style.display = '';
      } else {
        brows.style.display = 'none';
      }
      tint.style.fill = M[3] || '#ffffff';
      tint.style.opacity = M[3] ? 0.45 : 0;
      tongueIn.style.display = M[1] === 'open' ? '' : 'none';
      tongueOut.style.display = M[4] ? '' : 'none';
    }
    c.setMood = setMood;
    c.setBase = function (m) {
      c.base = m;
      clearTimeout(c._rt);
      setMood(m);
    };
    c.react = function (m, ms) {
      setMood(m);
      clearTimeout(c._rt);
      c._rt = setTimeout(() => setMood(c.base), ms || 1500);
    };
    c.jump = () => G.anim(act, 'a-jump', 650);
    c.shake = () => G.anim(act, 'a-shake', 560);
    c.dance = (ms) => G.anim(act, 'a-dance', ms || 2000);
    c.wave = (ms) => G.anim(armR, 'a-wave', ms || 1600);
    c.armsUp = (ms) => {
      G.anim(armL, 'a-up-l', ms || 1200);
      G.anim(armR, 'a-up-r', ms || 1200);
    };
    // the saluting hand must be drawn over the face
    c.salute = function () {
      const outer = armR._outer;
      idle.appendChild(outer);
      G.anim(armR, 'a-salute', 1600);
      clearTimeout(c._st);
      c._st = setTimeout(() => idle.insertBefore(outer, headOuter), 1650);
    };
    c.mouthPt = () => G.ptIn(head, 0, -40);
    c.headPt = () => G.ptIn(head, 0, -80);
    c.chestPt = () => G.ptIn(idle, 0, -135);
    c.tickle = function () {
      G.audio.play(G.pick(['giggle', 'boing', 'giggle']));
      c.react(G.pick(['big', 'wow', 'big', 'yum']), 1100);
      G.pick([c.jump, c.shake, c.jump])();
    };
    setMood('happy');
    return c;
  };

  // random kid / animal used as patient or passer-by
  G.randomBuddy = function (kindIn) {
    const kind = kindIn || G.pick(['kid', 'kid', 'bear', 'bunny', 'cat']);
    const base = { shirt: G.pick(G.SHIRTS), pants: G.pick(['#3b4a6b', '#5a6bd8', '#e85a7a', '#2f8f83', '#8a5cc7']), shirtPrint: G.pick([null, '#fff', '#ffe066']) };
    if (kind === 'bear') return Object.assign(base, { skin: '#b07a4f', ears: 'bear', hair: 'none' });
    if (kind === 'bunny') return Object.assign(base, { skin: '#f4f1ee', ears: 'bunny', hair: 'none' });
    if (kind === 'cat') return Object.assign(base, { skin: '#ffb347', ears: 'cat', hair: 'none' });
    return Object.assign(base, { skin: G.pick(G.SKINS), hair: G.pick(['short', 'curly', 'pony']), hairColor: G.pick(G.HAIRS) });
  };

  // ---------- small animals ----------
  // cat facing left, origin at its feet
  G.makeCat = function (parent, color) {
    const c = g(parent);
    const inner = g(c);
    color = color || '#ff9f43';
    el('ellipse', { cx: 0, cy: 2, rx: 40, ry: 7, fill: 'rgba(0,0,0,.15)' }, inner);
    const tail = el('path', { d: 'M 32 -30 Q 70 -40 58 -82', stroke: color, 'stroke-width': 13, fill: 'none', 'stroke-linecap': 'round', class: 'wag' }, inner);
    void tail;
    for (const x of [-22, -6, 12, 26]) el('rect', { x: x - 6, y: -24, width: 12, height: 24, rx: 6, fill: color }, inner);
    el('ellipse', { cx: 0, cy: -30, rx: 40, ry: 24, fill: color }, inner);
    el('path', { d: 'M -6 -52 L -2 -10 M 10 -52 L 12 -12', stroke: '#e07f20', 'stroke-width': 6, 'stroke-linecap': 'round' }, inner);
    el('polygon', { points: '-58,-70 -54,-104 -30,-80', fill: color }, inner);
    el('polygon', { points: '-22,-74 -14,-106 -2,-76', fill: color }, inner);
    el('circle', { cx: -32, cy: -60, r: 28, fill: color }, inner);
    el('ellipse', { cx: -42, cy: -64, rx: 4.5, ry: 6.5, fill: INK }, inner);
    el('ellipse', { cx: -22, cy: -64, rx: 4.5, ry: 6.5, fill: INK }, inner);
    el('path', { d: 'M -36 -52 L -28 -52 L -32 -47 Z', fill: '#ff6f91' }, inner);
    el('path', { d: 'M -40 -44 Q -32 -38 -24 -44', stroke: INK, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, inner);
    return { g: c, inner };
  };

  // puppy facing left, origin at its feet
  G.makeDog = function (parent) {
    const d = g(parent);
    const inner = g(d);
    const fur = '#c98b4a', light = '#f3e0c4';
    el('ellipse', { cx: 0, cy: 2, rx: 44, ry: 7, fill: 'rgba(0,0,0,.15)' }, inner);
    el('path', { d: 'M 36 -40 Q 62 -60 56 -80', stroke: fur, 'stroke-width': 11, fill: 'none', 'stroke-linecap': 'round', class: 'wag' }, inner);
    for (const x of [-24, -8, 14, 28]) el('rect', { x: x - 7, y: -26, width: 14, height: 26, rx: 7, fill: fur }, inner);
    el('ellipse', { cx: 2, cy: -34, rx: 44, ry: 26, fill: fur }, inner);
    el('ellipse', { cx: 6, cy: -28, rx: 22, ry: 14, fill: light }, inner);
    el('circle', { cx: -36, cy: -66, r: 30, fill: fur }, inner);
    el('ellipse', { cx: -50, cy: -54, rx: 18, ry: 13, fill: light }, inner);
    el('ellipse', { cx: -62, cy: -58, rx: 7, ry: 5.5, fill: INK }, inner);
    el('ellipse', { cx: -12, cy: -70, rx: 12, ry: 24, fill: '#8a5a2b', transform: 'rotate(-20 -12 -70)' }, inner);
    el('ellipse', { cx: -44, cy: -74, rx: 4.5, ry: 6, fill: INK }, inner);
    el('ellipse', { cx: -28, cy: -74, rx: 4.5, ry: 6, fill: INK }, inner);
    el('path', { d: 'M -56 -46 Q -50 -40 -44 -46', stroke: INK, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, inner);
    el('ellipse', { cx: -50, cy: -40, rx: 5, ry: 7, fill: '#ff6f91' }, inner);
    el('rect', { x: -24, y: -48, width: 24, height: 7, rx: 3, fill: '#e8202a' }, inner);
    return { g: d, inner };
  };

  // duck facing right, origin at its feet
  G.makeDuck = function (parent, baby) {
    const d = g(parent);
    const inner = g(d, { class: 'waddle' });
    inner.style.animationDelay = (-Math.random() * 0.5).toFixed(2) + 's';
    const col = baby ? '#ffd93b' : '#ffffff';
    el('ellipse', { cx: 0, cy: 2, rx: 30, ry: 6, fill: 'rgba(0,0,0,.15)' }, inner);
    el('path', { d: 'M -8 0 L -2 -8 L 4 0 Z M 6 0 L 12 -8 L 18 0 Z', fill: '#ff9a1f' }, inner);
    el('ellipse', { cx: 0, cy: -26, rx: 32, ry: 21, fill: col, stroke: baby ? 'none' : '#e6e6e6', 'stroke-width': 2 }, inner);
    el('path', { d: 'M -32 -32 L -44 -40 L -30 -22 Z', fill: col }, inner);
    el('path', { d: 'M -14 -30 Q 2 -16 16 -30 Q 2 -24 -14 -30 Z', fill: baby ? '#f5c518' : '#ececec' }, inner);
    el('circle', { cx: 22, cy: -52, r: 16, fill: col, stroke: baby ? 'none' : '#e6e6e6', 'stroke-width': 2 }, inner);
    el('path', { d: 'M 34 -54 L 50 -50 L 34 -44 Z', fill: '#ff9a1f' }, inner);
    el('circle', { cx: 27, cy: -56, r: 3.5, fill: INK }, inner);
    G.place(d, 0, 0, baby ? 0.62 : 1);
    return { g: d, inner };
  };
})();
