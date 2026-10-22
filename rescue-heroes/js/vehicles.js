// Vehicles, drawn facing right with the origin at the bottom centre (ground line).
(function () {
  'use strict';
  const el = G.el, g = G.g;
  G.draw = {};

  G.draw.wheel = function (p, x, y, r) {
    el('circle', { cx: x, cy: y, r, fill: '#2b2b2b' }, p);
    el('circle', { cx: x, cy: y, r: r * 0.46, fill: '#d9d9d9' }, p);
    el('circle', { cx: x, cy: y, r: r * 0.15, fill: '#8a8a8a' }, p);
  };

  function lights(p, x, y, colA, colB, w) {
    const L = g(p);
    w = w || 30;
    el('circle', { cx: x + w / 2, cy: y + 9, r: 60, fill: colA, class: 'halo' }, L);
    el('circle', { cx: x + w * 1.5 + 4, cy: y + 9, r: 60, fill: colB, class: 'halo b' }, L);
    el('rect', { x, y, width: w, height: 18, rx: 7, fill: colA, class: 'lt lt-a' }, L);
    el('rect', { x: x + w + 4, y, width: w, height: 18, rx: 7, fill: colB, class: 'lt lt-b' }, L);
    return L;
  }

  G.draw.fireTruck = function (parent) {
    const t = g(parent);
    const body = g(t);
    el('rect', { x: -262, y: -202, width: 384, height: 152, rx: 18, fill: '#e8382e' }, body);
    el('path', { d: 'M 112 -50 L 112 -232 Q 112 -248 128 -248 L 200 -248 Q 220 -248 232 -228 L 262 -162 Q 268 -150 268 -136 L 268 -70 Q 268 -50 248 -50 Z', fill: '#e8382e' }, body);
    el('path', { d: 'M 136 -228 L 196 -228 Q 208 -228 214 -216 L 236 -166 L 136 -166 Z', fill: '#bfe9ff' }, body);
    el('rect', { x: -262, y: -100, width: 530, height: 14, fill: '#ffffff' }, body);
    for (let i = 0; i < 3; i++) el('rect', { x: -242 + i * 112, y: -184, width: 96, height: 72, rx: 10, fill: '#c92a22' }, body);
    el('rect', { x: 242, y: -80, width: 36, height: 22, rx: 6, fill: '#cfcfcf' }, body);
    el('circle', { cx: 258, cy: -122, r: 10, fill: '#ffe680' }, body);
    lights(body, 138, -266, '#ff3b3b', '#ff9a3b');
    G.draw.wheel(body, -170, -48, 44);
    G.draw.wheel(body, 172, -48, 44);
    return { g: t, body };
  };

  G.draw.ambulance = function (parent) {
    const t = g(parent);
    const body = g(t);
    el('rect', { x: -240, y: -252, width: 334, height: 204, rx: 20, fill: '#ffffff', stroke: '#d5d9de', 'stroke-width': 4 }, body);
    el('path', { d: 'M 90 -48 L 90 -192 Q 90 -202 100 -202 L 170 -202 Q 190 -202 200 -184 L 236 -122 Q 242 -112 242 -98 L 242 -68 Q 242 -48 222 -48 Z', fill: '#ffffff', stroke: '#d5d9de', 'stroke-width': 4 }, body);
    el('path', { d: 'M 112 -184 L 168 -184 Q 178 -184 184 -174 L 210 -128 L 112 -128 Z', fill: '#bfe9ff' }, body);
    el('rect', { x: -240, y: -120, width: 482, height: 22, fill: '#e8202a' }, body);
    el('rect', { x: -240, y: -94, width: 482, height: 8, fill: '#ffd23f' }, body);
    el('circle', { cx: -78, cy: -186, r: 46, fill: '#ffffff' }, body);
    G.starOfDavid(body, -78, -186, 40, '#e8202a');
    el('path', { d: 'M -150 -240 L -150 -130', stroke: '#e3e6ea', 'stroke-width': 4 }, body);
    el('circle', { cx: 236, cy: -84, r: 9, fill: '#ffe680' }, body);
    lights(body, -214, -270, '#3b7bff', '#ff3b3b');
    G.draw.wheel(body, -150, -46, 42);
    G.draw.wheel(body, 152, -46, 42);
    return { g: t, body };
  };

  G.draw.policeCar = function (parent) {
    const t = g(parent);
    const body = g(t);
    el('path', { d: 'M -132 -124 L -88 -198 Q -82 -208 -68 -208 L 76 -208 Q 92 -208 100 -196 L 152 -124 Z', fill: '#ffffff', stroke: '#cfd6e0', 'stroke-width': 4 }, body);
    el('path', { d: 'M -112 -128 L -78 -192 L -10 -192 L -10 -128 Z', fill: '#bfe9ff' }, body);
    el('path', { d: 'M 6 -128 L 6 -192 L 72 -192 Q 84 -192 90 -182 L 128 -128 Z', fill: '#bfe9ff' }, body);
    el('rect', { x: -222, y: -134, width: 444, height: 96, rx: 36, fill: '#ffffff', stroke: '#cfd6e0', 'stroke-width': 4 }, body);
    el('rect', { x: -218, y: -112, width: 436, height: 18, fill: '#1f4fbf' }, body);
    el('rect', { x: -218, y: -90, width: 436, height: 6, fill: '#e8202a' }, body);
    el('text', { x: 0, y: -50, 'text-anchor': 'middle', 'font-size': 30, 'font-weight': 700, fill: '#1f4fbf', text: 'משטרה' }, body);
    el('circle', { cx: 210, cy: -112, r: 9, fill: '#ffe680' }, body);
    lights(body, -56, -230, '#ff3b3b', '#3b7bff', 50);
    G.draw.wheel(body, -140, -40, 40);
    G.draw.wheel(body, 142, -40, 40);
    return { g: t, body };
  };

  G.draw.jeep = function (parent) {
    const t = g(parent);
    const body = g(t);
    el('circle', { cx: -202, cy: -112, r: 38, fill: '#2b2b2b' }, body);
    el('circle', { cx: -202, cy: -112, r: 16, fill: '#55602e' }, body);
    el('path', { d: 'M -150 -140 L -150 -226 L -24 -226 L -24 -140', stroke: '#3e4721', 'stroke-width': 12, fill: 'none', 'stroke-linejoin': 'round' }, body);
    el('path', { d: 'M 40 -140 L 70 -228 L 86 -228 L 58 -140 Z', fill: '#3e4721' }, body);
    el('rect', { x: -196, y: -144, width: 300, height: 100, rx: 16, fill: '#5f6d35' }, body);
    el('path', { d: 'M 90 -144 L 190 -126 Q 206 -122 206 -106 L 206 -64 Q 206 -44 186 -44 L 90 -44 Z', fill: '#5f6d35' }, body);
    el('rect', { x: -170, y: -126, width: 120, height: 50, rx: 10, fill: '#55602e' }, body);
    el('circle', { cx: 196, cy: -96, r: 10, fill: '#ffe680' }, body);
    el('rect', { x: 196, y: -70, width: 20, height: 20, rx: 4, fill: '#3a3a3a' }, body);
    G.draw.wheel(body, -120, -44, 44);
    G.draw.wheel(body, 130, -44, 44);
    return { g: t, body };
  };

  // small traffic car
  G.draw.car = function (parent, color) {
    const t = g(parent);
    el('ellipse', { cx: 0, cy: 0, rx: 92, ry: 10, fill: 'rgba(0,0,0,.18)' }, t);
    const body = g(t, { class: 'car-bob' });
    body.style.animationDelay = (-Math.random() * 0.3).toFixed(2) + 's';
    el('path', { d: 'M -56 -60 L -38 -100 Q -34 -106 -26 -106 L 34 -106 Q 42 -106 46 -100 L 64 -60 Z', fill: color }, body);
    el('path', { d: 'M -44 -64 L -30 -96 L -4 -96 L -4 -64 Z', fill: '#d4f1ff' }, body);
    el('path', { d: 'M 6 -64 L 6 -96 L 32 -96 Q 38 -96 40 -92 L 54 -64 Z', fill: '#d4f1ff' }, body);
    el('rect', { x: -90, y: -66, width: 180, height: 48, rx: 20, fill: color }, body);
    el('rect', { x: -90, y: -40, width: 180, height: 6, fill: 'rgba(255,255,255,.35)' }, body);
    el('circle', { cx: 84, cy: -48, r: 7, fill: '#ffe680' }, body);
    el('circle', { cx: -85, cy: -48, r: 6, fill: '#ff4040' }, body);
    G.draw.wheel(body, -52, -18, 21);
    G.draw.wheel(body, 54, -18, 21);
    return { g: t, body };
  };

  // turn a vehicle's lights on for a while
  G.sirenFor = function (veh, kind, ms) {
    veh.g.classList.add('siren');
    G.anim(veh.body, 'rumble', 800);
    G.audio.siren(kind, (ms || 3000) / 1000);
    clearTimeout(veh._sirenT);
    veh._sirenT = setTimeout(() => veh.g.classList.remove('siren'), ms || 3000);
  };
})();
