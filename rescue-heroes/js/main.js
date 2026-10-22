// UI buttons (home / sound / fullscreen) and start-up.
(function () {
  'use strict';
  const el = G.el, g = G.g;

  G.init();

  G.ui = {
    build() {
      const ui = G.layers.ui;

      const home = (this.home = g(ui));
      G.place(home, 80, 80);
      el('circle', { r: 54, fill: '#2a5d8f', cy: 5 }, home);
      el('circle', { r: 54, fill: '#ffffff', stroke: '#2a5d8f', 'stroke-width': 6 }, home);
      el('path', { d: 'M -30 2 L 0 -26 L 30 2', fill: 'none', stroke: '#ff6b5b', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, home);
      el('path', { d: 'M -20 -4 L -20 26 L 20 26 L 20 -4', fill: '#ff6b5b' }, home);
      el('rect', { x: -7, y: 8, width: 14, height: 18, rx: 3, fill: '#ffffff' }, home);
      G.onTap(home, () => {
        G.audio.play('pop');
        G.go('home');
      });

      const snd = (this.snd = g(ui));
      G.place(snd, 1520, 80);
      el('circle', { r: 46, fill: '#2a5d8f', cy: 5 }, snd);
      el('circle', { r: 46, fill: '#ffffff', stroke: '#2a5d8f', 'stroke-width': 6 }, snd);
      el('path', { d: 'M -24 -10 L -12 -10 L 4 -24 L 4 24 L -12 10 L -24 10 Z', fill: '#2a5d8f' }, snd);
      this.waves = el('path', { d: 'M 12 -12 Q 20 0 12 12 M 18 -20 Q 32 0 18 20', stroke: '#2a5d8f', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, snd);
      this.cross = el('path', { d: 'M 12 -12 L 30 10 M 30 -12 L 12 10', stroke: '#e8202a', 'stroke-width': 6, 'stroke-linecap': 'round' }, snd);
      G.onTap(snd, () => {
        G.audio.setMuted(!G.audio.muted);
        if (!G.audio.muted) G.audio.play('pop');
        this.drawSnd();
      });
      this.drawSnd();

      const de = document.documentElement;
      if (de.requestFullscreen || de.webkitRequestFullscreen) {
        const fs = (this.fs = g(ui));
        G.place(fs, 1410, 80);
        el('circle', { r: 46, fill: '#2a5d8f', cy: 5 }, fs);
        el('circle', { r: 46, fill: '#ffffff', stroke: '#2a5d8f', 'stroke-width': 6 }, fs);
        el('path', { d: 'M -20 -8 L -20 -20 L -8 -20 M 8 -20 L 20 -20 L 20 -8 M 20 8 L 20 20 L 8 20 M -8 20 L -20 20 L -20 8', stroke: '#2a5d8f', 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, fs);
        G.onTap(fs, () => {
          try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
              (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } else {
              (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
            }
          } catch (e) { /* not allowed here */ }
        });
      }
    },
    drawSnd() {
      this.waves.style.display = G.audio.muted ? 'none' : '';
      this.cross.style.display = G.audio.muted ? '' : 'none';
    },
    update(name) {
      this.home.style.display = name === 'home' ? 'none' : '';
    },
  };

  G.ui.build();
  window.addEventListener('pointerdown', () => G.audio.unlock(), { capture: true });
  // stop the page from scrolling / zooming on touch devices
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const start = (location.hash || '').replace('#', '');
  G.go(G.scenes[start] ? start : 'home');
})();
