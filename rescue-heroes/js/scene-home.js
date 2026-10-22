// Home screen: pick a hero.
(function () {
  'use strict';
  const el = G.el, g = G.g;

  const HEROES = [
    { key: 'fire', name: 'כבאי', color: '#ff6b5b', dark: '#d94335', veh: 'fireTruck', vs: 0.5, siren: 'fire' },
    { key: 'medic', name: 'מד״א', color: '#ff9eb0', dark: '#e8566f', veh: 'ambulance', vs: 0.55, siren: 'mda' },
    { key: 'police', name: 'שוטרת', color: '#6aa8ff', dark: '#3a78d8', veh: 'policeCar', vs: 0.56, siren: 'police' },
    { key: 'soldier', name: 'חייל', color: '#9ccc5a', dark: '#6f9a35', veh: 'jeep', vs: 0.6 },
  ];

  G.scenes.home = {
    enter(L) {
      G.bg.sky(L, '#5ec8ff', '#d6f4ff');
      G.bg.sun(L, 140, 140);
      G.bg.cloud(L, 420, 120, 0.9);
      G.bg.cloud(L, 1150, 90, 0.7);
      G.bg.cloud(L, 1500, 190, 0.6);
      el('ellipse', { cx: 250, cy: 930, rx: 760, ry: 260, fill: '#8fd16b' }, L);
      el('ellipse', { cx: 1350, cy: 950, rx: 820, ry: 280, fill: '#7cc45a' }, L);
      G.bg.ground(L, 850, '#6fbf4f');

      const title = g(L, { class: 'float' });
      el('text', {
        x: 800, y: 128, 'text-anchor': 'middle', 'font-size': 92, 'font-weight': 900, fill: '#ffffff',
        stroke: '#2a5d8f', 'stroke-width': 16, 'paint-order': 'stroke', 'stroke-linejoin': 'round', text: 'גיבורי ההצלה',
      }, title);

      const chars = [];
      HEROES.forEach((h, i) => {
        const card = g(L);
        G.place(card, 230 + i * 380, 540);
        const inner = g(card, { class: 'card-in' });
        inner.style.animationDelay = (-i * 0.8).toFixed(1) + 's';
        el('rect', { x: -165, y: -300, width: 330, height: 560, rx: 44, fill: h.dark }, inner);
        el('rect', { x: -165, y: -310, width: 330, height: 560, rx: 44, fill: h.color, stroke: '#ffffff', 'stroke-width': 10 }, inner);
        el('circle', { cx: 0, cy: -140, r: 120, fill: 'rgba(255,255,255,.25)' }, inner);
        const vg = g(inner);
        G.place(vg, h.key === 'fire' ? -4 : 0, -150, h.vs);
        const veh = G.draw[h.veh](vg);
        if (h.key === 'fire') {
          // ladder on the roof
          const lad = g(veh.body);
          el('rect', { x: -240, y: -222, width: 330, height: 10, rx: 5, fill: '#b0b8c0' }, lad);
          el('rect', { x: -240, y: -206, width: 330, height: 10, rx: 5, fill: '#b0b8c0' }, lad);
        }
        const c = G.makeCharacter(h.key);
        inner.appendChild(c.g);
        G.place(c.g, 0, 235, 0.78);
        chars.push(c);
        // name tag
        el('rect', { x: -110, y: 268, width: 220, height: 70, rx: 35, fill: '#ffffff' }, card);
        el('text', { x: 0, y: 316, 'text-anchor': 'middle', 'font-size': 42, 'font-weight': 700, fill: h.dark, text: h.name }, card);

        G.onTap(card, () => {
          if (G.busy) return;
          G.audio.play('pop');
          c.react('big', 900);
          c.jump();
          if (h.siren) G.sirenFor(veh, h.siren, 1200);
          else G.audio.play('honk');
          G.anim(inner, 'pop', 450);
          G.later(() => G.go(h.key), 650);
        });
      });

      // friendly waves now and then
      G.every(() => {
        const c = G.pick(chars);
        c.wave(1400);
        c.react('big', 1200);
      }, 2300);
    },
  };
})();
