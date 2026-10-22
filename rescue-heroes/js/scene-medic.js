// MDA paramedic: patch up the boo-boos, check the temperature, give medicine.
(function () {
  'use strict';
  const el = G.el, g = G.g;

  const SEAT = { x: 800, y: 676, s: 0.82 };
  const SPOTS = [
    { part: 'act', x: -29, y: -46 },   // left knee
    { part: 'act', x: 29, y: -46 },    // right knee
    { part: 'armL', x: 0, y: 52 },     // left arm
    { part: 'armR', x: 0, y: 52 },     // right arm
    { part: 'head', x: -48, y: -50 },  // cheek
  ];

  // ---------- tool drawings (origin = centre) ----------
  function drawBandaid(p) {
    const b = g(p, { transform: 'rotate(-20)' });
    el('rect', { x: -52, y: -19, width: 104, height: 38, rx: 19, fill: '#f3c58f', stroke: '#d9a066', 'stroke-width': 3 }, b);
    el('rect', { x: -17, y: -15, width: 34, height: 30, rx: 7, fill: '#fbe6cb' }, b);
    for (const x of [-38, -30, 30, 38]) for (const y of [-6, 6]) el('circle', { cx: x, cy: y, r: 2, fill: '#d9a066' }, b);
  }
  function drawBandage(p) {
    el('rect', { x: 10, y: 8, width: 52, height: 26, rx: 4, fill: '#ffffff', stroke: '#dcdcdc', 'stroke-width': 3 }, p);
    el('circle', { r: 38, fill: '#ffffff', stroke: '#dcdcdc', 'stroke-width': 4 }, p);
    el('circle', { r: 26, fill: 'none', stroke: '#ececec', 'stroke-width': 3 }, p);
    el('circle', { r: 12, fill: '#e8e8e8' }, p);
  }
  function drawIce(p) {
    el('rect', { x: -48, y: -34, width: 96, height: 68, rx: 22, fill: '#7fd0ff', stroke: '#4fb0e8', 'stroke-width': 4 }, p);
    el('rect', { x: -10, y: -44, width: 20, height: 14, rx: 4, fill: '#4fb0e8' }, p);
    el('rect', { x: -30, y: -14, width: 22, height: 22, rx: 4, fill: '#d9f3ff', transform: 'rotate(-12 -19 -3)' }, p);
    el('rect', { x: 6, y: -6, width: 22, height: 22, rx: 4, fill: '#d9f3ff', transform: 'rotate(14 17 5)' }, p);
  }
  function drawThermo(p) {
    const t = g(p, { transform: 'rotate(30)' });
    el('rect', { x: -12, y: -60, width: 24, height: 104, rx: 12, fill: '#ffffff', stroke: '#b9c2c9', 'stroke-width': 3 }, t);
    el('circle', { cx: 0, cy: 46, r: 17, fill: '#ff4040' }, t);
    const merc = el('rect', { x: -5, y: 10, width: 10, height: 34, rx: 5, fill: '#ff4040' }, t);
    for (let y = -46; y <= 20; y += 12) el('rect', { x: 4, y, width: 6, height: 3, fill: '#b9c2c9' }, t);
    return merc;
  }
  function drawSteth(p) {
    el('path', { d: 'M -30 -46 Q -40 0 0 10 Q 40 0 30 -46', stroke: '#5b6770', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, p);
    el('circle', { cx: -30, cy: -48, r: 7, fill: '#2d2226' }, p);
    el('circle', { cx: 30, cy: -48, r: 7, fill: '#2d2226' }, p);
    el('path', { d: 'M 0 10 Q 0 30 0 34', stroke: '#5b6770', 'stroke-width': 7, fill: 'none' }, p);
    el('circle', { cx: 0, cy: 44, r: 20, fill: '#c8d2d8', stroke: '#5b6770', 'stroke-width': 5 }, p);
  }
  function drawSpoon(p) {
    el('rect', { x: 8, y: -7, width: 70, height: 14, rx: 7, fill: '#c8d2d8', transform: 'rotate(-25)' }, p);
    el('ellipse', { cx: -18, cy: 8, rx: 36, ry: 24, fill: '#dfe6ea', stroke: '#b9c2c9', 'stroke-width': 3 }, p);
    el('ellipse', { cx: -18, cy: 8, rx: 26, ry: 15, fill: '#ff6fa8' }, p);
    el('ellipse', { cx: -26, cy: 3, rx: 8, ry: 4, fill: '#ffc1dc' }, p);
  }
  function drawLolly(p) {
    el('rect', { x: -5, y: 10, width: 10, height: 64, rx: 5, fill: '#ffffff', stroke: '#dcdcdc', 'stroke-width': 2 }, p);
    el('circle', { cy: -14, r: 36, fill: '#ff5d8f' }, p);
    el('path', { d: 'M 0 -14 m -24 0 a 24 24 0 1 1 48 0 a 16 16 0 1 1 -32 0 a 8 8 0 1 1 16 0', stroke: '#ffe066', 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' }, p);
  }

  G.scenes.medic = {
    enter(L) {
      const S = { patient: null, boos: [], fever: false, healed: false, busy: false };

      G.bg.sky(L, '#a5e4ff', '#eafaff');
      G.bg.cloud(L, 240, 120, 0.8);
      G.bg.cloud(L, 900, 70, 0.6);
      el('ellipse', { cx: 300, cy: 760, rx: 600, ry: 160, fill: '#b5e48c' }, L);
      G.bg.ground(L, 700, '#9ad66f');
      for (const [x, y] of [[120, 690], [560, 680], [1000, 690]]) {
        el('rect', { x: x - 10, y: y - 90, width: 20, height: 90, fill: '#8b5a2b' }, L);
        el('circle', { cx: x, cy: y - 120, r: 55, fill: '#5cb85c' }, L);
      }

      // ambulance
      const ambG = g(L);
      G.place(ambG, 1335, 800, 0.82);
      const amb = G.draw.ambulance(ambG);
      G.onTap(ambG, () => G.sirenFor(amb, 'mda', 3000));

      // stretcher
      const st = g(L);
      el('rect', { x: 650, y: 640, width: 14, height: 120, fill: '#9aa5b1' }, st);
      el('rect', { x: 936, y: 640, width: 14, height: 120, fill: '#9aa5b1' }, st);
      el('rect', { x: 650, y: 720, width: 300, height: 12, fill: '#9aa5b1' }, st);
      el('circle', { cx: 657, cy: 770, r: 15, fill: '#3a3a3a' }, st);
      el('circle', { cx: 943, cy: 770, r: 15, fill: '#3a3a3a' }, st);
      el('rect', { x: 612, y: 626, width: 376, height: 18, rx: 9, fill: '#9aa5b1' }, st);
      el('rect', { x: 618, y: 586, width: 364, height: 46, rx: 22, fill: '#ff7043' }, st);
      el('rect', { x: 628, y: 556, width: 96, height: 40, rx: 18, fill: '#ffffff' }, st);
      const patientLayer = g(L);

      // paramedic
      const medic = G.makeCharacter('medic');
      L.appendChild(medic.g);
      G.place(medic.g, 430, 800, 0.95);
      G.onTap(medic.g, () => medic.tickle());

      // tray
      el('rect', { x: 150, y: 802, width: 1300, height: 104, rx: 34, fill: '#c9171f' }, L);
      el('rect', { x: 150, y: 794, width: 1300, height: 104, rx: 34, fill: '#ffffff', stroke: '#e8202a', 'stroke-width': 6 }, L);
      const tools = g(L);

      // ---------- patient ----------
      function addBoo(P, spot) {
        const parent = spot.part === 'act' ? P.act : P[spot.part];
        const b = g(parent);
        G.place(b, spot.x, spot.y);
        const scrape = g(b);
        el('ellipse', { rx: 17, ry: 12, fill: '#e2453c', opacity: 0.9 }, scrape);
        el('ellipse', { rx: 9, ry: 6, fill: '#ff8a7a' }, scrape);
        el('path', { d: 'M -12 -4 L 8 -8 M -10 5 L 12 2', stroke: '#b8322b', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, scrape);
        return { g: b, scrape, fixed: false };
      }

      function newPatient() {
        S.healed = false;
        S.boos = [];
        const P = G.makeCharacter('patient', G.randomBuddy());
        patientLayer.appendChild(P.g);
        G.place(P.g, 1750, SEAT.y, SEAT.s);
        S.patient = P;
        G.shuffle(SPOTS).slice(0, G.irand(2, 3)).forEach((sp) => S.boos.push(addBoo(P, sp)));
        S.fever = Math.random() < 0.55;
        P.setBase(S.fever ? 'hot' : 'sad');
        G.onTap(P.g, () => {
          G.audio.play(S.healed ? 'giggle' : 'cry');
          P.react(S.healed ? 'big' : 'wow', 900);
          G.anim(P.act, S.healed ? 'a-jump' : 'a-shake', 650);
        });
        P.act.classList.add('a-hop');
        S.busy = true;
        G.walkTo(P.g, SEAT.x, SEAT.y, 700).then(() => {
          P.act.classList.remove('a-hop');
          G.audio.play('cry');
          S.busy = false;
        });
      }

      function checkHealed() {
        if (S.healed || S.fever || S.boos.some((b) => !b.fixed)) return;
        S.healed = true;
        const P = S.patient;
        G.later(() => {
          P.setBase('happy');
          P.react('big', 1500);
          P.jump();
          P.armsUp(1200);
          medic.dance(2000);
          medic.react('big', 1600);
          G.audio.play('tada');
          G.audio.say('תודה!');
          G.confetti(800, 420, 80);
        }, 500);
        G.later(() => {
          P.wave(1500);
          G.audio.play('giggle');
        }, 2600);
        G.later(() => {
          P.act.classList.add('a-hop');
          G.walkTo(P.g, -250, SEAT.y, 700).then(() => {
            P.g.remove();
            G.later(newPatient, 500);
          });
        }, 4200);
      }

      // ---------- treatments ----------
      function coverBoo(b, kind) {
        b.fixed = true;
        const c = g(b.g, { class: 'pop' });
        if (kind === 'bandaid') {
          const r = g(c, { transform: 'rotate(' + G.rand(-35, 35).toFixed(0) + ')' });
          el('rect', { x: -32, y: -12, width: 64, height: 24, rx: 12, fill: '#f3c58f', stroke: '#d9a066', 'stroke-width': 2 }, r);
          el('rect', { x: -10, y: -9, width: 20, height: 18, rx: 4, fill: '#fbe6cb' }, r);
          b.scrape.style.display = 'none';
          G.audio.play('squeak');
        } else if (kind === 'bandage') {
          for (const y of [-12, 0, 12]) el('rect', { x: -26, y: y - 6, width: 52, height: 12, rx: 4, fill: '#ffffff', stroke: '#dcdcdc', 'stroke-width': 2 }, c);
          b.scrape.style.display = 'none';
          G.audio.play('zip');
        } else {
          // ice: the scrape melts away and leaves a sparkle
          G.audio.play('ahh');
          G.tween(900, (k) => b.scrape.setAttribute('opacity', 1 - k));
          const s = el('path', { d: G.starPath(14, 6), fill: '#ffd23f', stroke: '#fff', 'stroke-width': 2 }, c);
          void s;
        }
        const p = G.ptIn(b.g, 0, 0);
        G.stars(p.x, p.y, 6);
        const P = S.patient;
        P.react('wow', 700);
        G.later(() => P.react('big', 800), 700);
        checkHealed();
      }

      async function mouthTool(t) {
        const P = S.patient;
        const m = P.mouthPt();
        S.busy = true;
        if (t.id === 'thermo') {
          await G.moveTo(t.g, m.x + 21, m.y - 36, 250);
          P.setMood('wow');
          const fever = S.fever;
          await G.tween(1100, (k) => {
            const h = 34 + k * (fever ? 66 : 28);
            t.merc.setAttribute('y', 44 - h);
            t.merc.setAttribute('height', h);
          });
          if (fever) {
            G.audio.play('beep');
            P.react('hot', 1400);
            P.shake();
            for (let i = 0; i < 4; i++) {
              const d = el('path', { d: 'M 0 -12 Q 9 2 0 8 Q -9 2 0 -12 Z', fill: '#7fd0ff' });
              const hp = P.headPt();
              G.spawn(d, { x: hp.x + G.rand(-60, 60), y: hp.y - 20, vy: 40, ay: 500, life: 0.9 });
            }
          } else {
            G.audio.play('ding');
            P.react('big', 1200);
            G.stars(m.x + 40, m.y, 6);
          }
          await G.wait(900);
          t.merc.setAttribute('y', 10);
          t.merc.setAttribute('height', 34);
        } else if (t.id === 'medicine') {
          await G.moveTo(t.g, m.x + 10, m.y + 6, 250);
          P.setMood('chew');
          G.audio.play('gulp');
          await G.wait(700);
          P.react('yuck', 1300);
          P.shake();
          G.audio.play('yuck');
          G.audio.say('איכס!');
          if (S.fever) {
            G.later(() => {
              S.fever = false;
              const hp = P.headPt();
              G.stars(hp.x, hp.y, 10);
              G.audio.play('sparkle');
              P.setBase(S.boos.some((b) => !b.fixed) ? 'sad' : 'happy');
              checkHealed();
            }, 1300);
          }
        } else if (t.id === 'lolly') {
          await G.moveTo(t.g, m.x + 16, m.y + 6, 250);
          P.react('yum', 1800);
          G.audio.play('yum');
          G.audio.say('יאמי!');
          G.hearts(m.x, m.y - 60, 5);
          await G.wait(900);
        }
        G.sendHome(t.g, t.home);
        S.busy = false;
      }

      async function listen(t) {
        const P = S.patient;
        const c = P.chestPt();
        S.busy = true;
        await G.moveTo(t.g, c.x, c.y - 30, 250);
        G.audio.play('heartbeat');
        G.hearts(c.x, c.y - 40, 3);
        await G.wait(800);
        G.hearts(c.x, c.y - 40, 3);
        P.react('big', 900);
        G.audio.play('giggle');
        await G.wait(500);
        G.sendHome(t.g, t.home);
        S.busy = false;
      }

      // ---------- tray tools ----------
      const TOOLS = [
        { id: 'bandaid', draw: drawBandaid, use: 'boo' },
        { id: 'bandage', draw: drawBandage, use: 'boo' },
        { id: 'ice', draw: drawIce, use: 'boo' },
        { id: 'thermo', draw: drawThermo, use: 'mouth' },
        { id: 'steth', draw: drawSteth, use: 'chest' },
        { id: 'medicine', draw: drawSpoon, use: 'mouth' },
        { id: 'lolly', draw: drawLolly, use: 'mouth' },
      ];
      let firstHint = null;
      TOOLS.forEach((t, i) => {
        t.g = g(tools);
        t.home = { x: 300 + i * 170, y: 846, r: 0 };
        t.merc = t.draw(t.g);
        G.place(t.g, t.home.x, t.home.y, 0.9, 0);
        if (i === 0) firstHint = G.hint(t.g, 70);
        G.draggable(t.g, {
          home: t.home,
          hitR: 72,
          can: () => !S.busy && !!S.patient && !S.healed,
          onStart() { if (firstHint) { firstHint.remove(); firstHint = null; } },
          onDrop(x, y) {
            const P = S.patient;
            if (t.use === 'boo') {
              let best = null, bd = 115;
              for (const b of S.boos) {
                if (b.fixed) continue;
                const p = G.ptIn(b.g, 0, 0);
                const d = G.dist(x, y, p.x, p.y);
                if (d < bd) { bd = d; best = b; }
              }
              if (best) coverBoo(best, t.id);
              else {
                const c = P.chestPt();
                if (G.dist(x, y, c.x, c.y) < 170) P.tickle();
              }
              return false;
            }
            if (t.use === 'mouth') {
              const m = P.mouthPt();
              if (G.dist(x, y, m.x, m.y) < 130) { mouthTool(t); return true; }
              return false;
            }
            const c = P.chestPt();
            if (G.dist(x, y, c.x, c.y) < 150) { listen(t); return true; }
            return false;
          },
        });
      });

      newPatient();
    },
  };
})();
