// Soldier: dress up from the wardrobe and taste food from the field kitchen.
(function () {
  'use strict';
  const el = G.el, g = G.g;

  const SOLDIER = { x: 800, y: 820, s: 1 };

  // ---------- wearables, drawn in the slot's own coordinates ----------
  function beret(color) {
    return (p) => {
      el('path', { d: 'M -88 -108 C -104 -150 -44 -188 30 -180 C 92 -172 108 -132 82 -110 C 40 -98 -40 -94 -88 -108 Z', fill: color }, p);
      el('path', { d: 'M -88 -108 C -40 -94 40 -98 82 -110', stroke: 'rgba(0,0,0,.3)', 'stroke-width': 10, fill: 'none', 'stroke-linecap': 'round' }, p);
      el('circle', { cx: -52, cy: -124, r: 11, fill: '#e8c547', stroke: '#b8922a', 'stroke-width': 3 }, p);
    };
  }
  const WEAR = {
    helmet: {
      slot: 'head', cy: -148, ts: 0.6,
      draw(p0) {
        const p = g(p0, { transform: 'translate(0 -20)' });
        el('path', { d: 'M -90 -90 C -90 -154 -50 -180 0 -180 C 50 -180 90 -154 90 -90 Z', fill: '#5d6b33' }, p);
        el('path', { d: 'M -60 -160 L 40 -100 M -20 -178 L 70 -120 M 60 -164 L -40 -100 M 20 -178 L -76 -118', stroke: '#47522a', 'stroke-width': 5, 'stroke-linecap': 'round' }, p);
        el('path', { d: 'M -100 -92 Q 0 -74 100 -92 L 100 -78 Q 0 -60 -100 -78 Z', fill: '#4b5728' }, p);
      },
    },
    beretPurple: { slot: 'head', cy: -140, ts: 0.6, draw: beret('#7b3fa0') },
    beretBrown: { slot: 'head', cy: -140, ts: 0.6, draw: beret('#7a5230') },
    glasses: {
      slot: 'eyes', cy: -84, ts: 0.95,
      draw(p) {
        el('path', { d: 'M -12 -88 Q 0 -96 12 -88', stroke: '#1d2b3a', 'stroke-width': 6, fill: 'none' }, p);
        el('path', { d: 'M -50 -92 L -80 -96 M 50 -92 L 80 -96', stroke: '#1d2b3a', 'stroke-width': 6, 'stroke-linecap': 'round' }, p);
        for (const sx of [-1, 1]) {
          el('rect', { x: sx * 31 - 24, y: -102, width: 48, height: 34, rx: 12, fill: '#1d2b3a' }, p);
          el('path', { d: 'M ' + (sx * 31 - 14) + ' -94 L ' + (sx * 31 - 4) + ' -94', stroke: '#8fd3ff', 'stroke-width': 5, 'stroke-linecap': 'round' }, p);
        }
      },
    },
    vest: {
      slot: 'body', cy: -132, ts: 0.6,
      draw(p) {
        el('path', { d: 'M -74 -152 Q -74 -196 -30 -196 L -20 -196 L -6 -150 L 6 -150 L 20 -196 L 30 -196 Q 74 -196 74 -152 L 74 -112 Q 74 -68 30 -68 L -30 -68 Q -74 -68 -74 -112 Z', fill: '#4f5a2b' }, p);
        for (const x of [-58, -22, 14]) el('rect', { x, y: -128, width: 32, height: 34, rx: 6, fill: '#3f4822' }, p);
        el('rect', { x: -74, y: -96, width: 148, height: 10, fill: '#3a4220' }, p);
      },
    },
    backpack: {
      slot: 'back', cy: -150, ts: 0.55,
      draw(p) {
        el('rect', { x: -98, y: -236, width: 196, height: 184, rx: 38, fill: '#6e5a3a' }, p);
        el('ellipse', { cx: 0, cy: -238, rx: 100, ry: 22, fill: '#3f6b3f' }, p);
        el('path', { d: 'M -60 -200 Q 0 -170 60 -200 L 60 -150 Q 0 -130 -60 -150 Z', fill: '#5a4a2e' }, p);
        el('rect', { x: -40, y: -120, width: 80, height: 50, rx: 12, fill: '#5a4a2e' }, p);
      },
      straps(p) {
        el('rect', { x: -52, y: -194, width: 16, height: 96, rx: 6, fill: '#5a4a2e' }, p);
        el('rect', { x: 36, y: -194, width: 16, height: 96, rx: 6, fill: '#5a4a2e' }, p);
      },
    },
  };
  const SHELF = [
    ['helmet', 125, 372], ['beretPurple', 290, 380],
    ['beretBrown', 125, 556], ['glasses', 290, 556],
    ['vest', 125, 722], ['backpack', 290, 716],
  ];

  // ---------- food ----------
  const FOOD = {
    pita: {
      x: 1195, y: 488, mood: 'yum', snd: 'yum', say: 'יאמי!',
      draw(p) {
        el('ellipse', { rx: 40, ry: 28, fill: '#f3d39a', stroke: '#d9b16b', 'stroke-width': 4 }, p);
        el('path', { d: 'M -26 -4 Q 0 8 26 -4', stroke: '#d9b16b', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, p);
        for (const [x, y] of [[-14, -12], [10, -14], [20, 10], [-18, 12]]) el('circle', { cx: x, cy: y, r: 2.5, fill: '#c99a4e' }, p);
      },
    },
    hummus: {
      x: 1282, y: 486, mood: 'big', snd: 'yum', say: 'חומוס!', hearts: true,
      draw(p) {
        el('path', { d: 'M -42 -6 Q 0 50 42 -6 Z', fill: '#ffffff', stroke: '#d6d6d6', 'stroke-width': 3 }, p);
        el('ellipse', { cx: 0, cy: -6, rx: 42, ry: 13, fill: '#e9cf8f' }, p);
        el('path', { d: 'M -20 -8 Q 0 -16 20 -6', stroke: '#c7a347', 'stroke-width': 4, fill: 'none' }, p);
        el('circle', { cx: 0, cy: -8, r: 6, fill: '#9cbf3b' }, p);
        for (const [x, y] of [[-26, -6], [24, -10], [12, -2]]) el('circle', { cx: x, cy: y, r: 2.5, fill: '#e8552a' }, p);
      },
    },
    schnitzel: {
      x: 1368, y: 490, mood: 'big', snd: 'yum', say: 'שניצל!', hearts: true,
      draw(p) {
        el('path', { d: 'M -40 -10 Q -44 -30 -14 -30 Q 10 -36 30 -24 Q 46 -12 38 10 Q 30 28 0 26 Q -36 26 -40 -10 Z', fill: '#d99a3a', stroke: '#b9781f', 'stroke-width': 4 }, p);
        for (const [x, y] of [[-20, -10], [6, -16], [20, 4], [-6, 10], [-26, 8]]) el('circle', { cx: x, cy: y, r: 3, fill: '#b9781f' }, p);
        el('path', { d: 'M 22 -30 L 46 -40 L 40 -18 Z', fill: '#ffe135' }, p);
      },
    },
    apple: {
      x: 1452, y: 484, mood: 'yum', snd: 'crunch', say: 'יאמי!',
      draw(p) {
        el('path', { d: 'M 0 -22 C 30 -40 46 -10 36 12 C 28 32 12 34 0 28 C -12 34 -28 32 -36 12 C -46 -10 -30 -40 0 -22 Z', fill: '#ff4d4d' }, p);
        el('path', { d: 'M 0 -22 L 4 -38', stroke: '#6b3e1f', 'stroke-width': 5, 'stroke-linecap': 'round' }, p);
        el('ellipse', { cx: 16, cy: -36, rx: 13, ry: 6, fill: '#5cb85c', transform: 'rotate(-25 16 -36)' }, p);
        el('ellipse', { cx: -16, cy: -8, rx: 7, ry: 12, fill: '#ff9a9a', transform: 'rotate(20 -16 -8)' }, p);
      },
    },
    cake: {
      x: 1532, y: 486, mood: 'yum', snd: 'yum', say: 'עוגה!', sparkle: true,
      draw(p) {
        el('path', { d: 'M -40 26 L 40 26 L 40 -6 L -40 -24 Z', fill: '#ffd1dc' }, p);
        el('path', { d: 'M -40 6 L 40 12 L 40 2 L -40 -6 Z', fill: '#8b4a2b' }, p);
        el('path', { d: 'M -44 -24 L 44 -6 L 40 -2 L -40 -20 Z', fill: '#ffffff' }, p);
        el('circle', { cx: 6, cy: -24, r: 9, fill: '#e8202a' }, p);
      },
    },
    shoko: {
      x: 1205, y: 650, mood: 'yum', snd: 'gulp', say: 'שוקו!', mustache: true,
      draw(p) {
        el('path', { d: 'M -28 -40 L 18 -40 L 30 -28 L 32 40 L -32 40 Z', fill: '#7b4a2a' }, p);
        el('rect', { x: -24, y: -14, width: 48, height: 34, rx: 6, fill: '#ffffff' }, p);
        el('text', { x: 0, y: 10, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: '#7b4a2a', text: 'שוקו' }, p);
        el('rect', { x: 14, y: -56, width: 6, height: 22, rx: 3, fill: '#ff6b9d', transform: 'rotate(18 17 -45)' }, p);
      },
    },
    lemon: {
      x: 1300, y: 660, mood: 'sour', snd: 'sour', say: 'חמוץ!',
      draw(p) {
        el('ellipse', { rx: 38, ry: 27, fill: '#ffe135', stroke: '#e6c400', 'stroke-width': 3 }, p);
        el('path', { d: 'M 36 -6 L 48 0 L 36 6 Z M -36 -6 L -48 0 L -36 6 Z', fill: '#ffe135' }, p);
        el('ellipse', { cx: -12, cy: -10, rx: 10, ry: 5, fill: '#fff6a8' }, p);
      },
    },
    pepper: {
      x: 1392, y: 660, mood: 'spicy', snd: 'spicy', say: 'חריף!',
      draw(p) {
        el('path', { d: 'M -30 -20 C -10 -24 30 -10 40 30 C 20 10 -10 0 -34 -6 Z', fill: '#ff2d1a' }, p);
        el('path', { d: 'M -32 -14 Q -46 -22 -40 -36', stroke: '#3a9d3a', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, p);
        el('path', { d: 'M -14 -14 Q 6 -12 20 0', stroke: '#ff9a8a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, p);
      },
    },
    broccoli: {
      x: 1485, y: 656, mood: 'yuck', snd: 'yuck', say: 'איכס!', spit: true,
      draw(p) {
        el('path', { d: 'M -10 40 L -6 0 L 6 0 L 10 40 Z', fill: '#9fd16b' }, p);
        for (const [x, y, r] of [[-22, -10, 18], [0, -24, 22], [22, -10, 18], [-10, 2, 14], [12, 2, 14]]) el('circle', { cx: x, cy: y, r, fill: '#2f8f3a' }, p);
        for (const [x, y] of [[-24, -16], [2, -32], [20, -16]]) el('circle', { cx: x, cy: y, r: 4, fill: '#47b04f' }, p);
      },
    },
  };

  G.scenes.soldier = {
    enter(L) {
      const S = { worn: {}, saluted: false, eating: false };

      G.bg.sky(L, '#8fd6ff', '#fff1d0');
      G.bg.cloud(L, 600, 90, 0.7);
      G.bg.cloud(L, 1350, 60, 0.5);
      el('ellipse', { cx: 300, cy: 680, rx: 700, ry: 150, fill: '#e3c47e' }, L);
      el('ellipse', { cx: 1400, cy: 690, rx: 700, ry: 160, fill: '#dcbc74' }, L);
      G.bg.ground(L, 640, '#ecd59a');
      for (let i = 0; i < 18; i++) el('circle', { cx: G.rand(0, 1600), cy: G.rand(700, 890), r: G.rand(3, 7), fill: '#d8bd7c' }, L);

      // tent
      el('polygon', { points: '470,650 600,500 730,650', fill: '#6f7d3a' }, L);
      el('polygon', { points: '575,650 600,560 625,650', fill: '#4b5728' }, L);

      // flag
      const flagG = g(L);
      el('rect', { x: 1052, y: 150, width: 12, height: 650, rx: 6, fill: '#9aa5b1' }, flagG);
      el('circle', { cx: 1058, cy: 146, r: 12, fill: '#ffd23f' }, flagG);
      const flag = g(flagG, { class: 'flag' });
      el('rect', { x: 1064, y: 160, width: 180, height: 126, fill: '#ffffff', stroke: '#e3e8ef', 'stroke-width': 2 }, flag);
      el('rect', { x: 1064, y: 176, width: 180, height: 16, fill: '#1f4fbf' }, flag);
      el('rect', { x: 1064, y: 254, width: 180, height: 16, fill: '#1f4fbf' }, flag);
      G.starOfDavid(flag, 1154, 223, 26, null, '#1f4fbf');
      G.onTap(flagG, () => {
        G.anim(flag, 'fast', 1600);
        G.audio.play('sparkle');
        G.stars(1154, 223, 8);
      });

      // jeep
      const jeepG = g(L);
      G.place(jeepG, 560, 760, 0.55);
      const jeep = G.draw.jeep(jeepG);
      G.onTap(jeepG, () => {
        G.audio.play('engine');
        G.audio.play('honk');
        G.anim(jeep.body, 'rumble', 800);
      });

      // wardrobe
      el('rect', { x: 26, y: 232, width: 372, height: 572, rx: 18, fill: '#a8733d' }, L);
      el('rect', { x: 44, y: 250, width: 336, height: 540, rx: 10, fill: '#e8c08a' }, L);
      for (const y of [420, 600, 780]) el('rect', { x: 36, y, width: 352, height: 18, rx: 6, fill: '#a8733d' }, L);

      // field kitchen cart
      el('rect', { x: 1150, y: 520, width: 420, height: 18, rx: 8, fill: '#8a949e' }, L);
      el('rect', { x: 1150, y: 690, width: 420, height: 18, rx: 8, fill: '#8a949e' }, L);
      el('rect', { x: 1160, y: 520, width: 14, height: 280, fill: '#6d767f' }, L);
      el('rect', { x: 1546, y: 520, width: 14, height: 280, fill: '#6d767f' }, L);
      el('circle', { cx: 1167, cy: 806, r: 16, fill: '#3a3a3a' }, L);
      el('circle', { cx: 1553, cy: 806, r: 16, fill: '#3a3a3a' }, L);

      // soldier
      const sol = G.makeCharacter('soldier');
      L.appendChild(sol.g);
      G.place(sol.g, SOLDIER.x, SOLDIER.y, SOLDIER.s);
      G.onTap(sol.g, () => {
        if (S.worn.head && S.worn.body && S.worn.back) {
          sol.salute();
          G.audio.play('snap');
          sol.react('big', 1400);
        } else {
          sol.tickle();
        }
      });

      const tools = g(L);

      // ---------- dressing up ----------
      function unequip(slot) {
        const w = S.worn[slot];
        if (!w) return;
        w.g.remove();
        if (w.extra) w.extra.remove();
        S.worn[slot] = null;
        S.saluted = false;
        const t = w.tool;
        G.place(t.g, t.home.x, t.home.y, t.ts);
        t.g.style.display = '';
        G.anim(t.inner, 'pop', 450);
      }
      function equip(t) {
        const W = WEAR[t.id];
        if (S.worn[W.slot]) unequip(W.slot);
        const wg = g(sol.slots[W.slot], { class: 'pop' });
        W.draw(wg);
        let extra = null;
        if (W.straps) {
          extra = g(sol.slots.body, { class: 'pop' });
          W.straps(extra);
        }
        S.worn[W.slot] = { g: wg, extra, tool: t };
        t.g.style.display = 'none';
        G.place(t.g, t.home.x, t.home.y, t.ts);
        G.audio.play(W.slot === 'body' || W.slot === 'back' ? 'zip' : 'pop');
        sol.react(G.pick(['big', 'wow']), 1000);
        sol.jump();
        const tapOff = (e) => {
          e.stopPropagation();
          e.preventDefault();
          G.audio.play('whoosh');
          unequip(W.slot);
          sol.react('wow', 700);
        };
        wg.addEventListener('pointerdown', tapOff);
        if (extra) extra.addEventListener('pointerdown', tapOff);
        if (!S.saluted && S.worn.head && S.worn.body && S.worn.back) {
          S.saluted = true;
          G.later(() => {
            sol.salute();
            G.audio.play('tada');
            G.audio.say('מוכן!');
            G.stars(SOLDIER.x, SOLDIER.y - 300, 14);
          }, 700);
        }
      }

      let wearHint = null;
      SHELF.forEach(([id, x, y], i) => {
        const W = WEAR[id];
        const t = { id, home: { x, y }, ts: W.ts };
        t.g = g(tools);
        t.inner = g(t.g);
        const art = g(t.inner);
        G.place(art, 0, -W.cy);
        W.draw(art);
        G.place(t.g, x, y, W.ts);
        if (i === 0) wearHint = G.hint(t.g, 110);
        G.draggable(t.g, {
          home: t.home,
          hitR: 120,
          lift: 1.6,
          onStart() { if (wearHint) { wearHint.remove(); wearHint = null; } },
          onDrop(dx, dy) {
            if (G.dist(dx, dy, SOLDIER.x, SOLDIER.y - 230) < 230) {
              equip(t);
              return true;
            }
            return false;
          },
        });
      });

      // ---------- eating ----------
      async function eat(id, t) {
        const F = FOOD[id];
        S.eating = true;
        const m = sol.mouthPt();
        const sx0 = t.g._x, sy0 = t.g._y;
        await G.tween(320, (k) => G.place(t.g, G.lerp(sx0, m.x, k), G.lerp(sy0, m.y, k), G.lerp(0.85, 0.5, k)));
        sol.setMood('chew');
        G.audio.play(F.snd === 'gulp' ? 'gulp' : 'crunch');
        if (F.spit) {
          await G.wait(450);
          G.audio.play('spit');
          sol.react('yuck', 1600);
          sol.shake();
          G.audio.say(F.say);
          const x0 = t.g._x, y0 = t.g._y;
          await G.tween(650, (k) => G.place(t.g, G.lerp(x0, t.home.x, k), G.lerp(y0, t.home.y, k) - Math.sin(k * Math.PI) * 160, G.lerp(0.5, 0.85, k), k * 720), G.ease.linear);
          G.place(t.g, t.home.x, t.home.y, 0.85, 0);
          S.eating = false;
          return;
        }
        t.g.style.display = 'none';
        await G.wait(650);
        sol.react(F.mood, 1900);
        G.audio.play(F.snd === 'crunch' || F.snd === 'gulp' ? 'yum' : F.snd);
        G.audio.say(F.say);
        const hp = sol.headPt();
        if (F.hearts) G.hearts(hp.x, hp.y - 80, 6);
        if (F.sparkle) { G.stars(hp.x, hp.y - 60, 10); G.audio.play('sparkle'); }
        if (F.mood === 'sour') { sol.shake(); G.later(() => sol.shake(), 600); }
        if (F.mood === 'spicy') {
          sol.jump();
          G.later(() => sol.jump(), 700);
          let n = 0;
          const id2 = G.every(() => {
            if (++n > 8) { clearInterval(id2); return; }
            for (const sx of [-1, 1]) {
              const p = G.ptIn(sol.head, sx * 84, -84);
              G.spawn(el('circle', { r: 16, fill: '#ffffff' }), { x: p.x, y: p.y, vx: sx * 120, vy: -120, vs: 1.6, life: 0.7, op: 0.85 });
            }
            if (n % 3 === 1) G.audio.play('steam');
          }, 170);
        }
        if (F.mustache) {
          const mu = el('path', { d: 'M -32 -52 Q -16 -68 0 -56 Q 16 -68 32 -52 Q 16 -44 0 -52 Q -16 -44 -32 -52 Z', fill: '#6b3e1f', class: 'pop' }, sol.extra);
          setTimeout(() => mu.remove(), 4500);
        }
        if (F.mood === 'yum' || F.mood === 'big') sol.jump();
        // a fresh one appears on the cart
        G.later(() => {
          G.place(t.g, t.home.x, t.home.y, 0.85, 0);
          t.g.style.display = '';
          G.anim(t.inner, 'pop', 450);
          G.audio.play('pop');
        }, 900);
        S.eating = false;
      }

      let foodHint = null;
      Object.keys(FOOD).forEach((id, i) => {
        const F = FOOD[id];
        const t = { home: { x: F.x, y: F.y } };
        t.g = g(tools);
        t.inner = g(t.g);
        F.draw(t.inner);
        G.place(t.g, F.x, F.y, 0.85, 0);
        if (i === 1) foodHint = G.hint(t.g, 60);
        G.draggable(t.g, {
          home: t.home,
          hitR: 52,
          lift: 1.25,
          can: () => !S.eating,
          onStart() { if (foodHint) { foodHint.remove(); foodHint = null; } },
          onDrop(x, y) {
            const m = sol.mouthPt();
            if (G.dist(x, y, m.x, m.y) < 150) {
              eat(id, t);
              return true;
            }
            return false;
          },
        });
      });
    },
  };
})();
