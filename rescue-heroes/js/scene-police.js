// Police officer: whistle to stop the traffic so the ducks can cross, and find the lost puppy.
(function () {
  'use strict';
  const el = G.el, g = G.g;

  const CW = { x1: 760, x2: 900, mid: 830 };      // crosswalk
  const TOP_WALK = 556, BOTTOM_WALK = 868;
  const CAR_HALF = 82, CAR_S = 0.9;
  const CAR_COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#c77dff', '#ff9f1c', '#8ac926'];
  const SPOTS = [
    { x: 130, type: 'bush' },
    { x: 345, type: 'bin' },
    { x: 1110, type: 'box' },
    { x: 1310, type: 'mailbox' },
    { x: 1500, type: 'flowers' },
  ];

  function drawSpot(p, type) {
    const s = g(p);
    if (type === 'bush' || type === 'flowers') {
      for (const [x, y, r] of [[-50, -34, 40], [0, -56, 52], [50, -34, 40], [-22, -24, 36], [26, -22, 36]]) {
        el('circle', { cx: x, cy: y, r, fill: type === 'bush' ? '#3fa34d' : '#5cb85c' }, s);
      }
      if (type === 'flowers') {
        for (const [x, y, c] of [[-40, -60, '#ff6b9d'], [10, -86, '#ffd23f'], [44, -50, '#ff6b9d'], [-8, -40, '#ffffff']]) {
          el('circle', { cx: x, cy: y, r: 10, fill: c }, s);
          el('circle', { cx: x, cy: y, r: 4, fill: '#ff9f1c' }, s);
        }
      }
    } else if (type === 'bin') {
      el('rect', { x: -40, y: -96, width: 80, height: 96, rx: 8, fill: '#8a949e' }, s);
      for (const x of [-20, 0, 20]) el('rect', { x: x - 3, y: -84, width: 6, height: 72, rx: 3, fill: '#6d767f' }, s);
      el('rect', { x: -48, y: -110, width: 96, height: 18, rx: 8, fill: '#6d767f' }, s);
      el('rect', { x: -12, y: -122, width: 24, height: 12, rx: 5, fill: '#6d767f' }, s);
    } else if (type === 'box') {
      el('rect', { x: -62, y: -100, width: 124, height: 100, rx: 6, fill: '#d9a35b' }, s);
      el('polygon', { points: '-62,-100 -40,-122 40,-122 62,-100', fill: '#e8b977' }, s);
      el('rect', { x: -10, y: -100, width: 20, height: 100, fill: '#f2d39b' }, s);
    } else if (type === 'mailbox') {
      el('rect', { x: -8, y: -60, width: 16, height: 60, fill: '#555' }, s);
      el('rect', { x: -44, y: -150, width: 88, height: 100, rx: 18, fill: '#e8202a' }, s);
      el('rect', { x: -26, y: -128, width: 52, height: 8, rx: 4, fill: '#7a0f14' }, s);
      el('circle', { cx: 0, cy: -88, r: 14, fill: '#ffd23f' }, s);
    }
    return s;
  }

  function drawBird(p) {
    const b = g(p);
    el('ellipse', { cx: 0, cy: 0, rx: 24, ry: 18, fill: '#4fc3f7' }, b);
    el('circle', { cx: 18, cy: -12, r: 13, fill: '#4fc3f7' }, b);
    el('path', { d: 'M 29 -14 L 42 -10 L 29 -6 Z', fill: '#ff9f1c' }, b);
    el('circle', { cx: 22, cy: -15, r: 3, fill: '#2d2226' }, b);
    el('path', { d: 'M -6 -4 Q -20 -34 -30 -10 Z', fill: '#29a8e0' }, b);
    return b;
  }

  G.scenes.police = {
    enter(L) {
      const S = { stop: false, ducksWaiting: false, crossing: false, found: false, puppySpot: 0, puppyBusy: false };

      G.bg.sky(L, '#89d4ff', '#e6f7ff');
      G.bg.cloud(L, 700, 70, 0.6);
      // buildings
      const BCOL = ['#ffb4a2', '#a2d2ff', '#ffd6a5', '#cdb4db', '#bde0fe', '#ffc8dd', '#caffbf', '#fdffb6', '#a0c4ff', '#ffadad'];
      for (let i = 0; i < 10; i++) {
        const x = -360 + i * 240, h = 240 + ((i * 73) % 150), w = 230;
        el('rect', { x, y: 520 - h, width: w, height: h, fill: BCOL[i], stroke: 'rgba(0,0,0,.08)', 'stroke-width': 4 }, L);
        for (let wy = 520 - h + 30; wy < 470; wy += 70) {
          for (let wx = x + 28; wx < x + w - 40; wx += 64) {
            el('rect', { x: wx, y: wy, width: 40, height: 44, rx: 6, fill: '#ffffff', opacity: 0.75 }, L);
          }
        }
      }
      // sidewalks & road
      el('rect', { x: -1500, y: 520, width: 4600, height: 64, fill: '#d9d4cc' }, L);
      el('rect', { x: -1500, y: 576, width: 4600, height: 10, fill: '#bdb6ab' }, L);
      el('rect', { x: -1500, y: 586, width: 4600, height: 196, fill: '#5b5f66' }, L);
      for (let x = -400; x < 2000; x += 90) {
        if (x + 50 > CW.x1 - 10 && x < CW.x2 + 10) continue;
        el('rect', { x, y: 680, width: 50, height: 8, rx: 4, fill: '#f5f5f5' }, L);
      }
      for (let y = 594; y < 778; y += 36) el('rect', { x: CW.x1, y, width: CW.x2 - CW.x1, height: 20, fill: '#ffffff' }, L);

      // hiding spots
      const spotsLayer = g(L);
      const puppyLayer = g(L);
      const spots = SPOTS.map((sp) => {
        const sg = g(spotsLayer);
        G.place(sg, sp.x, TOP_WALK);
        const inner = drawSpot(sg, sp.type);
        const o = Object.assign({ g: sg, inner }, sp);
        G.onTap(sg, () => search(o));
        return o;
      });
      // the puppy sits behind the spots
      const pup = G.makeDog(puppyLayer);
      puppyLayer.parentNode.insertBefore(puppyLayer, spotsLayer);
      pup.g.style.display = 'none';

      // the kid who lost the puppy
      const kid = G.makeCharacter('kid', G.randomBuddy('kid'));
      L.appendChild(kid.g);
      G.place(kid.g, 590, 572, 0.5);
      kid.setBase('sad');
      G.onTap(kid.g, () => {
        if (S.found) kid.tickle();
        else { G.audio.play('cry'); kid.shake(); }
      });

      // traffic lanes
      const laneA = g(L), duckBack = g(L), laneB = g(L);
      const lanes = [
        { y: 676, dir: -1, layer: laneA, cars: [], stopX: CW.x2 + CAR_HALF + 8 },
        { y: 772, dir: 1, layer: laneB, cars: [], stopX: CW.x1 - CAR_HALF - 8 },
      ];
      lanes.forEach((ln) => {
        for (let i = 0; i < 3; i++) {
          const cg = g(ln.layer);
          const car = G.draw.car(cg, G.pick(CAR_COLORS));
          const c = { g: cg, car, x: ln.dir < 0 ? 300 + i * 620 : 1300 - i * 620, v: G.rand(190, 250), honked: false };
          cg._flip = ln.dir < 0;
          G.place(cg, c.x, ln.y, CAR_S);
          G.onTap(cg, () => {
            G.audio.play('honk');
            G.anim(c.car.body, 'rumble', 700);
          });
          ln.cars.push(c);
        }
      });

      // bottom sidewalk
      el('rect', { x: -1500, y: 782, width: 4600, height: 10, fill: '#bdb6ab' }, L);
      el('rect', { x: -1500, y: 792, width: 4600, height: 400, fill: '#d9d4cc' }, L);
      for (let x = -400; x < 2000; x += 120) el('rect', { x, y: 792, width: 4, height: 200, fill: '#c8c2b8' }, L);

      const pcG = g(L);
      G.place(pcG, 215, 905, 0.7);
      const pc = G.draw.policeCar(pcG);
      G.onTap(pcG, () => G.sirenFor(pc, 'police', 3000));

      const duckFront = g(L);

      // police officer with a stop sign
      const cop = G.makeCharacter('police');
      L.appendChild(cop.g);
      G.place(cop.g, 640, 892, 0.82);
      const paddle = g(cop.armR);
      el('rect', { x: -5, y: 92, width: 10, height: 66, rx: 4, fill: '#8a949e' }, paddle);
      el('circle', { cx: 0, cy: 186, r: 38, fill: '#e8202a', stroke: '#ffffff', 'stroke-width': 7 }, paddle);
      el('rect', { x: -22, y: 179, width: 44, height: 14, rx: 4, fill: '#ffffff' }, paddle);
      paddle.style.display = 'none';
      let copHint = null;
      G.onTap(cop.g, () => toggleStop());

      function setStop(on) {
        S.stop = on;
        paddle.style.display = on ? '' : 'none';
        cop.armR.classList.toggle('pose-up-r', on);
        lanes.forEach((ln) => ln.cars.forEach((c) => { c.honked = false; }));
      }
      function toggleStop() {
        if (S.crossing) { cop.tickle(); return; }
        G.audio.play('whistle');
        if (copHint) { copHint.remove(); copHint = null; }
        if (S.stop) { setStop(false); cop.react('happy', 400); return; }
        setStop(true);
        cop.react('big', 900);
        clearTimeout(S.autoGo);
        if (!S.ducksWaiting) {
          S.autoGo = G.later(() => {
            if (S.stop && !S.crossing) { setStop(false); G.audio.play('whistle'); }
          }, 4500);
        }
      }

      // ---------- traffic ----------
      function crosswalkClear() {
        return lanes.every((ln) => ln.cars.every((c) => Math.abs(c.x - CW.mid) > CAR_HALF + 90));
      }
      G.onFrame((dt) => {
        lanes.forEach((ln) => {
          // order cars so that each one knows who is ahead
          const cars = ln.cars.slice().sort((a, b) => (a.x - b.x) * -ln.dir);
          let ahead = null;
          for (const c of cars) {
            let nx = c.x + ln.dir * c.v * dt;
            if (S.stop) {
              const before = ln.dir < 0 ? c.x >= ln.stopX - 0.5 : c.x <= ln.stopX + 0.5;
              if (before) {
                nx = ln.dir < 0 ? Math.max(nx, ln.stopX) : Math.min(nx, ln.stopX);
                if (Math.abs(nx - ln.stopX) < 1 && !c.honked && Math.random() < 0.004) {
                  c.honked = true;
                  G.audio.play('honk');
                }
              }
            }
            if (ahead) nx = ln.dir < 0 ? Math.max(nx, ahead.x + 230) : Math.min(nx, ahead.x - 230);
            if (ln.dir < 0 ? nx > c.x : nx < c.x) nx = c.x;
            c.x = nx;
            ahead = c;
          }
          // wrap around
          for (const c of ln.cars) {
            if (ln.dir < 0 && c.x < -380) {
              c.x = Math.max(1980, Math.max(...ln.cars.map((o) => o.x)) + G.rand(260, 520));
              recolor(c);
            } else if (ln.dir > 0 && c.x > 1980) {
              c.x = Math.min(-380, Math.min(...ln.cars.map((o) => o.x)) - G.rand(260, 520));
              recolor(c);
            }
            G.place(c.g, c.x, ln.y);
          }
        });
        if (S.stop && S.ducksWaiting && !S.crossing && crosswalkClear()) crossDucks();
      });
      function recolor(c) {
        c.g.textContent = '';
        c.car = G.draw.car(c.g, G.pick(CAR_COLORS));
        c.v = G.rand(190, 250);
      }

      // ---------- ducks ----------
      let ducks = [];
      function newDucks() {
        duckFront.textContent = '';
        duckBack.textContent = '';
        ducks = [];
        for (let i = 0; i < 4; i++) {
          const d = G.makeDuck(duckFront, i > 0);
          G.flip(d.g, true);
          G.place(d.g, 1760 + i * 70, BOTTOM_WALK);
          ducks.push(d);
          G.onTap(d.g, () => {
            G.audio.play('quack');
            G.anim(d.inner, 'a-jump', 650);
          });
        }
        Promise.all(ducks.map((d, i) => G.walkTo(d.g, 990 + i * 70, BOTTOM_WALK, 260))).then(() => {
          S.ducksWaiting = true;
          G.audio.play('quack');
          if (!S.stop) copHint = copHint || G.hint(cop.g, 90, 0, -170);
        });
      }
      async function crossDucks() {
        S.crossing = true;
        clearTimeout(S.autoGo);
        G.audio.play('quack');
        await Promise.all(ducks.map(async (d, i) => {
          await G.wait(i * 380);
          await G.walkTo(d.g, CW.mid, BOTTOM_WALK, 200);
          G.flip(d.g, false);
          if (i % 2 === 0) G.audio.play('quack');
          await G.walkTo(d.g, CW.mid, TOP_WALK + 10, 200);
        }));
        // everyone is on the far sidewalk
        ducks.forEach((d) => duckBack.appendChild(d.g));
        S.crossing = false;
        S.ducksWaiting = false;
        G.audio.play('tada');
        G.audio.say('כל הכבוד!');
        G.stars(CW.mid, TOP_WALK - 40, 14);
        cop.react('big', 1500);
        cop.jump();
        G.later(() => { setStop(false); G.audio.play('whistle'); }, 900);
        await Promise.all(ducks.map((d, i) => G.wait(i * 150).then(() => G.walkTo(d.g, 1900 + i * 60, TOP_WALK + 10, 230))));
        G.later(newDucks, 3000);
      }

      // ---------- puppy hunt ----------
      function hidePuppy(exclude) {
        const options = spots.map((s, i) => i).filter((i) => i !== exclude);
        S.puppySpot = G.pick(options);
      }
      async function search(sp) {
        G.anim(sp.inner, 'wobble', 520);
        G.audio.play('rustle');
        const idx = spots.indexOf(sp);
        if (!S.found && !S.puppyBusy && idx === S.puppySpot) {
          S.puppyBusy = true;
          S.found = true;
          pup.g.style.display = '';
          G.flip(pup.g, sp.x <= 590);
          G.place(pup.g, sp.x, TOP_WALK);
          await G.moveTo(pup.g, sp.x, TOP_WALK - 70, 250, G.ease.outBack);
          G.audio.play('bark');
          await G.moveTo(pup.g, sp.x + (sp.x > 590 ? -90 : 90), TOP_WALK + 4, 300);
          pup.inner.classList.add('a-hop');
          puppyLayer.parentNode.insertBefore(puppyLayer, kid.g);
          await G.walkTo(pup.g, sp.x > 590 ? 660 : 520, TOP_WALK + 10, 520);
          pup.inner.classList.remove('a-hop');
          G.flip(pup.g, sp.x <= 590 ? true : false);
          G.audio.play('bark');
          kid.setBase('happy');
          kid.jump();
          kid.armsUp(1200);
          G.hearts(590, 440, 8);
          G.confetti(590, 420, 60);
          G.audio.play('tada');
          G.audio.say('מצאת את הכלב!');
          cop.react('big', 1400);
          S.puppyBusy = false;
          G.later(runAway, 12000);
          return;
        }
        // a funny surprise instead of the puppy
        const kind = G.pick(['bird', 'cat', 'ball']);
        const top = TOP_WALK - 100;
        if (kind === 'bird') {
          const b = drawBird(L);
          G.place(b, sp.x, top);
          G.audio.play('tweet');
          const dir = G.pick([-1, 1]);
          G.tween(1300, (k) => G.place(b, sp.x + dir * k * 600, top - k * 500 - Math.sin(k * 20) * 12), G.ease.linear).then(() => b.remove());
        } else if (kind === 'cat') {
          const c = G.makeCat(L);
          L.insertBefore(c.g, spotsLayer);
          G.place(c.g, sp.x + 10, TOP_WALK);
          G.audio.play('meow');
          await G.moveTo(c.g, sp.x + 10, TOP_WALK - 60, 250, G.ease.outBack);
          await G.wait(800);
          await G.moveTo(c.g, sp.x + 10, TOP_WALK, 250);
          c.g.remove();
        } else {
          const b = g(L);
          el('circle', { r: 22, fill: '#ff6b6b' }, b);
          el('path', { d: 'M -22 0 Q 0 -12 22 0 M -22 0 Q 0 12 22 0', stroke: '#ffffff', 'stroke-width': 4, fill: 'none' }, b);
          G.audio.play('boing');
          const dir = sp.x > 800 ? -1 : 1;
          G.tween(1100, (k) => G.place(b, sp.x + dir * k * 120, top + 40 - Math.abs(Math.sin(k * Math.PI * 2.5)) * 150 * (1 - k * 0.5), 1, k * 600 * dir), G.ease.linear)
            .then(() => G.moveTo(b, sp.x, top + 60, 300))
            .then(() => b.remove());
        }
      }
      async function runAway() {
        if (!S.found) return;
        S.puppyBusy = true;
        const from = S.puppySpot;
        hidePuppy(from);
        const sp = spots[S.puppySpot];
        G.audio.play('bark');
        kid.setBase('sad');
        G.flip(pup.g, sp.x > pup.g._x);
        pup.inner.classList.add('a-hop');
        await G.walkTo(pup.g, sp.x, TOP_WALK, 700);
        pup.inner.classList.remove('a-hop');
        puppyLayer.parentNode.insertBefore(puppyLayer, spotsLayer);
        await G.moveTo(pup.g, sp.x, TOP_WALK, 200);
        pup.g.style.display = 'none';
        S.found = false;
        S.puppyBusy = false;
      }

      // tears while the puppy is missing
      G.every(() => {
        if (S.found) return;
        for (const sx of [-1, 1]) {
          const p = G.ptIn(kid.head, sx * 28, -70);
          const d = el('ellipse', { rx: 4, ry: 6, fill: '#7fd0ff' });
          G.spawn(d, { x: p.x, y: p.y, vx: sx * 20, ay: 500, life: 0.5 });
        }
      }, 1100);

      hidePuppy(-1);
      newDucks();
    },
  };
})();
