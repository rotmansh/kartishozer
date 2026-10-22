// Firefighter: spray water on the burning windows, rescue the cat with the ladder.
(function () {
  'use strict';
  const el = G.el, g = G.g;

  const WINDOWS = [[820, 450], [1080, 450], [820, 620], [1080, 620]];
  const TREE = { x: 1405, ground: 780 };
  const CAT_TOP = { x: 1420, y: 360 };
  const LADDER_HOME = { x: 300, y: 664, r: 0 };
  const NOZZLE_HOME = { x: 770, y: 760, r: -35 };

  function drawResident(parent, type) {
    const r = g(parent);
    const skin = G.pick(G.SKINS);
    if (type === 'cat') {
      el('polygon', { points: '-30,-14 -24,-50 -4,-26', fill: '#ff9f43' }, r);
      el('polygon', { points: '30,-14 24,-50 4,-26', fill: '#ff9f43' }, r);
      el('circle', { r: 32, fill: '#ff9f43' }, r);
    } else if (type === 'dog') {
      el('circle', { r: 32, fill: '#c98b4a' }, r);
      el('ellipse', { cx: -30, cy: 0, rx: 11, ry: 22, fill: '#8a5a2b' }, r);
      el('ellipse', { cx: 30, cy: 0, rx: 11, ry: 22, fill: '#8a5a2b' }, r);
      el('ellipse', { cx: 0, cy: 12, rx: 14, ry: 10, fill: '#f3e0c4' }, r);
    } else if (type === 'grandma') {
      el('circle', { cx: 0, cy: -34, r: 16, fill: '#d9d9d9' }, r);
      el('circle', { r: 32, fill: skin }, r);
      el('path', { d: 'M -32 -4 Q -32 -36 0 -36 Q 32 -36 32 -4 Q 20 -24 0 -22 Q -20 -24 -32 -4 Z', fill: '#e6e6e6' }, r);
      el('circle', { cx: -12, cy: -4, r: 10, fill: 'none', stroke: '#555', 'stroke-width': 3 }, r);
      el('circle', { cx: 12, cy: -4, r: 10, fill: 'none', stroke: '#555', 'stroke-width': 3 }, r);
    } else {
      el('circle', { r: 32, fill: skin }, r);
      el('path', { d: 'M -32 -4 Q -32 -36 0 -36 Q 32 -36 32 -4 Q 14 -22 -4 -18 Q -20 -24 -32 -4 Z', fill: G.pick(G.HAIRS) }, r);
    }
    el('circle', { cx: -11, cy: -2, r: 4.5, fill: '#2d2226' }, r);
    el('circle', { cx: 11, cy: -2, r: 4.5, fill: '#2d2226' }, r);
    el('path', { d: 'M -10 12 Q 0 21 10 12', stroke: '#2d2226', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, r);
    return r;
  }

  function makeFire(parent, x, y) {
    const f = g(parent);
    G.place(f, x, y + 46);
    const sc = g(f);
    const fl = g(sc, { class: 'flame' });
    fl.style.animationDelay = (-Math.random() * 0.3).toFixed(2) + 's';
    el('path', { d: 'M -62 0 C -72 -50 -42 -80 -32 -122 C -12 -92 -2 -102 -2 -152 C 20 -112 40 -102 34 -72 C 50 -82 56 -102 54 -112 C 78 -72 74 -30 62 0 Z', fill: '#ff4b1f' }, fl);
    el('path', { d: 'M -42 0 C -50 -36 -28 -54 -20 -86 C -6 -64 4 -72 4 -106 C 20 -76 34 -62 30 -42 C 40 -48 44 -60 44 -66 C 58 -38 52 -14 42 0 Z', fill: '#ff9a1f' }, fl);
    el('path', { d: 'M -22 0 C -26 -20 -12 -32 -8 -52 C 2 -38 8 -42 8 -60 C 22 -40 26 -18 20 0 Z', fill: '#ffe14d' }, fl);
    return { g: f, sc, x, y };
  }

  G.scenes.fire = {
    enter(L) {
      const S = { fires: [], spraying: false, ang: -35, catStuck: true, ladderBusy: false, resetting: false };

      G.bg.sky(L, '#7fd6ff', '#e3f7ff');
      G.bg.cloud(L, 300, 110, 0.8);
      G.bg.cloud(L, 1250, 80, 0.6);
      G.bg.ground(L, 700, '#86cc5c');
      el('rect', { x: -1500, y: 790, width: 4600, height: 400, fill: '#9aa0a8' }, L);
      el('rect', { x: -1500, y: 784, width: 4600, height: 12, fill: '#c9cdd2' }, L);
      for (let x = -200; x < 1800; x += 160) el('rect', { x, y: 862, width: 80, height: 10, rx: 5, fill: '#f2f2f2' }, L);

      // ---- house ----
      const house = g(L);
      el('rect', { x: 1040, y: 196, width: 54, height: 120, fill: '#a63d3a' }, house);
      el('rect', { x: 720, y: 340, width: 460, height: 440, fill: '#ffe0b0' }, house);
      el('rect', { x: 720, y: 760, width: 460, height: 20, fill: '#e8c18e' }, house);
      el('polygon', { points: '688,350 950,168 1212,350', fill: '#d65a4a', stroke: '#b44336', 'stroke-width': 10, 'stroke-linejoin': 'round' }, house);
      el('circle', { cx: 950, cy: 280, r: 30, fill: '#fff4dc', stroke: '#b44336', 'stroke-width': 6 }, house);
      el('rect', { x: 902, y: 640, width: 96, height: 140, rx: 14, fill: '#8a5a3c' }, house);
      el('circle', { cx: 980, cy: 714, r: 7, fill: '#ffd23f' }, house);

      const wins = WINDOWS.map(([x, y], i) => {
        const w = { x, y, i };
        el('rect', { x: x - 64, y: y - 58, width: 128, height: 116, rx: 12, fill: '#ffffff' }, house);
        w.glass = el('rect', { x: x - 54, y: y - 48, width: 108, height: 96, rx: 6, fill: '#aee3ff' }, house);
        const clipId = G.uid('win');
        const cp = el('clipPath', { id: clipId }, house);
        el('rect', { x: x - 54, y: y - 48, width: 108, height: 96, rx: 6 }, cp);
        const holder = g(house, { 'clip-path': 'url(#' + clipId + ')' });
        w.res = g(holder);
        drawResident(w.res, G.pick(['kid', 'cat', 'dog', 'grandma', 'kid']));
        G.place(w.res, x, y + 18);
        el('rect', { x: x - 72, y: y + 50, width: 144, height: 14, rx: 6, fill: '#e8c18e' }, house);
        w.fireLayer = g(house);
        G.onTap(w.glass, () => {
          if (w.fire) return;
          G.audio.play('giggle');
          G.anim(w.res, 'a-jump', 650);
        });
        return w;
      });

      // ---- tree with a cat ----
      const tree = g(L);
      el('rect', { x: TREE.x - 28, y: 430, width: 56, height: 350, rx: 12, fill: '#8b5a2b' }, tree);
      el('path', { d: 'M ' + TREE.x + ' 560 L ' + (TREE.x + 90) + ' 500', stroke: '#8b5a2b', 'stroke-width': 22, 'stroke-linecap': 'round' }, tree);
      for (const [dx, dy, r] of [[0, -90, 120], [-95, -40, 85], [95, -40, 85], [0, -190, 85], [-60, -150, 70], [70, -150, 70]]) {
        el('circle', { cx: TREE.x + dx, cy: 430 + dy, r, fill: '#4caf50' }, tree);
      }
      for (const [dx, dy, r] of [[-30, -130, 26], [40, -60, 20], [-80, -40, 16]]) {
        el('circle', { cx: TREE.x + dx, cy: 430 + dy, r, fill: '#66c56a' }, tree);
      }
      const cat = G.makeCat(L);
      G.place(cat.g, CAT_TOP.x, CAT_TOP.y);

      // ---- fire truck ----
      const truckG = g(L);
      G.place(truckG, 330, 870, 0.9);
      const truck = G.draw.fireTruck(truckG);
      const REEL = { x: 330 - 60 * 0.9, y: 870 - 140 * 0.9 };
      el('circle', { cx: REEL.x, cy: REEL.y, r: 36, fill: '#ffd34d', stroke: '#c9a227', 'stroke-width': 8 }, L);
      el('circle', { cx: REEL.x, cy: REEL.y, r: 12, fill: '#c9a227' }, L);
      G.onTap(truckG, () => G.sirenFor(truck, 'fire', 3000));

      // ---- hose (behind the firefighter) ----
      const hoseOut = el('path', { fill: 'none', stroke: '#b38a1e', 'stroke-width': 20, 'stroke-linecap': 'round' }, L);
      const hoseIn = el('path', { fill: 'none', stroke: '#f2cf4a', 'stroke-width': 11, 'stroke-linecap': 'round' }, L);

      // ---- firefighter ----
      const ff = G.makeCharacter('fire');
      L.appendChild(ff.g);
      G.place(ff.g, 645, 860, 0.85);
      G.onTap(ff.g, () => ff.tickle());

      const tools = g(L);

      // ---- ladder ----
      const ladder = g(tools);
      el('rect', { x: -155, y: -26, width: 310, height: 13, rx: 6, fill: '#b0b8c0' }, ladder);
      el('rect', { x: -155, y: 13, width: 310, height: 13, rx: 6, fill: '#b0b8c0' }, ladder);
      for (let x = -130; x <= 130; x += 37) el('rect', { x: x - 5, y: -16, width: 10, height: 32, rx: 4, fill: '#8a949e' }, ladder);
      G.place(ladder, LADDER_HOME.x, LADDER_HOME.y, 1, 0);
      let ladderHint = G.hint(ladder, 90);

      // ---- nozzle ----
      const nozzle = g(tools);
      el('rect', { x: -6, y: -15, width: 54, height: 30, rx: 8, fill: '#c99a2e' }, nozzle);
      el('path', { d: 'M 46 -14 L 84 -8 L 84 8 L 46 14 Z', fill: '#e8be50' }, nozzle);
      el('rect', { x: 12, y: 12, width: 14, height: 30, rx: 6, fill: '#8b5a2b' }, nozzle);
      G.place(nozzle, NOZZLE_HOME.x, NOZZLE_HOME.y, 1, NOZZLE_HOME.r);
      S.ang = NOZZLE_HOME.r;
      let nozzleHint = G.hint(nozzle, 75, 30, 0);

      function drawHose() {
        const nx = nozzle._x, ny = nozzle._y;
        const a = ((nozzle._r || 0) * Math.PI) / 180;
        const c2x = nx - Math.cos(a) * 140, c2y = ny - Math.sin(a) * 140 + 70;
        const d = 'M ' + REEL.x + ' ' + REEL.y + ' C ' + (REEL.x + 80) + ' ' + (REEL.y + 170) + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' + nx.toFixed(1) + ' ' + ny.toFixed(1);
        hoseOut.setAttribute('d', d);
        hoseIn.setAttribute('d', d);
      }
      drawHose();

      G.draggable(nozzle, {
        home: NOZZLE_HOME,
        hitR: 80,
        hx: 30,
        onStart() {
          S.spraying = true;
          G.audio.waterStart();
          if (nozzleHint) { nozzleHint.remove(); nozzleHint = null; }
        },
        onMove: drawHose,
        onDrop() { return false; },
        onEnd() {
          S.spraying = false;
          G.audio.waterStop();
          // keep the hose attached while the nozzle flies home
          const t0 = performance.now();
          G.onFrame(() => {
            drawHose();
            return performance.now() - t0 < 500;
          });
        },
      });

      G.draggable(ladder, {
        home: LADDER_HOME,
        hitR: 100,
        can: () => !S.ladderBusy,
        onStart() { if (ladderHint) { ladderHint.remove(); ladderHint = null; } },
        onDrop(x, y) {
          if (S.catStuck && G.dist(x, y, TREE.x - 60, 620) < 280) {
            useLadder();
            return true;
          }
          return false;
        },
      });

      // ---- fires ----
      function lightFires() {
        const n = G.irand(2, 4);
        G.shuffle(wins).slice(0, n).forEach((w, k) => {
          G.later(() => {
            G.moveTo(w.res, w.x, w.y + 120, 250);
            const f = makeFire(w.fireLayer, w.x, w.y);
            f.hp = 100;
            f.on = true;
            f.win = w;
            w.fire = f;
            w.glass.setAttribute('fill', '#ffb36b');
            G.anim(f.sc, 'pop', 450);
            S.fires.push(f);
          }, k * 250);
        });
        ff.setBase('wow');
      }

      function extinguish(f) {
        f.on = false;
        const w = f.win;
        w.fire = null;
        G.audio.play('sizzle');
        G.puff(f.x, f.y, 12, '#ffffff');
        f.g.remove();
        S.fires = S.fires.filter((x) => x !== f);
        w.glass.setAttribute('fill', '#aee3ff');
        G.later(() => {
          G.moveTo(w.res, w.x, w.y + 18, 400, G.ease.outBack);
          G.audio.play('giggle');
        }, 350);
        G.stars(f.x, f.y, 10);
        ff.react('big', 1200);
        ff.jump();
        if (S.fires.length === 0) G.later(allOut, 900);
      }

      function allOut() {
        S.resetting = true;
        G.audio.play('tada');
        G.audio.say('כל הכבוד!');
        G.confetti(950, 300, 90);
        ff.setBase('happy');
        ff.dance(2400);
        ff.armsUp(1200);
        wins.forEach((w) => G.later(() => G.anim(w.res, 'a-jump', 650), Math.random() * 600));
        G.later(() => {
          G.audio.play('bell');
          S.resetting = false;
          lightFires();
        }, 7000);
      }

      // smoke from burning windows
      G.every(() => {
        for (const f of S.fires) {
          if (!f.on) continue;
          const s = 0.4 + (0.6 * f.hp) / 100;
          const c = el('circle', { r: 20, fill: '#6b6b6b' });
          G.spawn(c, { x: f.x + G.rand(-20, 20), y: f.y - 90 * s, vx: G.rand(5, 35), vy: -90, vs: 1.1, life: 1.6, op: 0.3 });
        }
      }, 330);

      // ---- spraying ----
      let dropAcc = 0;
      G.onFrame((dt) => {
        if (!S.spraying) return;
        const nx = nozzle._x, ny = nozzle._y;
        let target = null, best = 600;
        for (const f of S.fires) {
          const d = G.dist(nx, ny, f.x, f.y);
          if (f.on && d < best) { best = d; target = f; }
        }
        let want = -35;
        if (target) want = (Math.atan2(target.y - 20 - ny, target.x - nx) * 180) / Math.PI;
        let diff = want - S.ang;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        S.ang += diff * Math.min(1, dt * 10);
        G.place(nozzle, nx, ny, null, S.ang);
        drawHose();

        const a = (S.ang * Math.PI) / 180, sc = nozzle._s || 1;
        const tx = nx + Math.cos(a) * 84 * sc, ty = ny + Math.sin(a) * 84 * sc;
        const life = target ? Math.min(0.75, (best - 40) / 950) : 0.55;
        dropAcc += dt * 150;
        while (dropAcc >= 1) {
          dropAcc -= 1;
          const j = a + G.rand(-0.06, 0.06), sp = G.rand(900, 1000);
          const drop = el('circle', { r: G.rand(6, 10), fill: G.pick(['#5ec8ff', '#9be0ff', '#3fb2ff']) });
          G.spawn(drop, { x: tx, y: ty, vx: Math.cos(j) * sp, vy: Math.sin(j) * sp, ay: 300, life: Math.max(0.2, life), op: 0.9, fade: false });
        }
        if (target) {
          target.hp -= 50 * dt;
          G.place(target.sc, 0, 0, Math.max(0.2, 0.25 + (0.75 * target.hp) / 100));
          if (Math.random() < dt * 20) {
            const s = el('circle', { r: 8, fill: '#bfe9ff' });
            G.spawn(s, { x: target.x + G.rand(-40, 40), y: target.y + G.rand(-30, 30), vx: G.rand(-200, 200), vy: G.rand(-300, -100), ay: 900, life: 0.5 });
          }
          if (target.hp <= 0) extinguish(target);
        }
      });

      // ---- the cat ----
      async function useLadder() {
        S.ladderBusy = true;
        G.audio.play('thud');
        const x0 = ladder._x, y0 = ladder._y;
        await G.tween(320, (k) => G.place(ladder, G.lerp(x0, TREE.x - 75, k), G.lerp(y0, 610, k), 1, -68 * k));
        S.catStuck = false;
        G.audio.play('meow');
        cat.inner.classList.add('a-hop');
        await G.walkTo(cat.g, TREE.x - 22, 470, 400);
        await G.walkTo(cat.g, TREE.x - 135, 770, 420);
        G.audio.play('meow');
        G.sendHome(ladder, LADDER_HOME, 500);
        await G.walkTo(cat.g, 760, 862, 420);
        cat.inner.classList.remove('a-hop');
        ff.react('big', 1600);
        ff.jump();
        G.hearts(760, 780, 7);
        G.audio.play('tada');
        G.audio.say('הצלת את החתול!');
        S.ladderBusy = false;
        G.later(catClimbs, 15000);
      }
      async function catClimbs() {
        if (S.catStuck) return;
        G.flip(cat.g, true);
        cat.inner.classList.add('a-hop');
        await G.walkTo(cat.g, TREE.x - 40, 776, 500);
        await G.tween(500, (k) => G.place(cat.g, G.lerp(TREE.x - 40, CAT_TOP.x, k), G.lerp(776, CAT_TOP.y, k) - Math.sin(k * Math.PI) * 120));
        cat.inner.classList.remove('a-hop');
        G.flip(cat.g, false);
        S.catStuck = true;
        G.audio.play('meow');
      }
      G.onTap(cat.g, () => {
        G.audio.play('meow');
        G.anim(cat.inner, 'a-jump', 650);
      });
      G.every(() => {
        if (S.catStuck && !S.ladderBusy) {
          G.audio.play('meow');
          G.anim(cat.inner, 'a-shake', 560);
        }
      }, 7000);

      // nudge: the firefighter points at the job when nobody plays
      G.every(() => {
        if (!S.spraying && S.fires.length) ff.react('wow', 1000);
      }, 5000);

      lightFires();
      G.later(() => G.audio.play('bell'), 400);
    },
  };
})();
