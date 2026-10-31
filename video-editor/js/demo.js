// Sample photos drawn on a canvas, so the app can be tried without files.
import { makeCanvas, rng } from './util.js';

const SCENES = [
  { name: 'שקיעה בים', sky: ['#ff7e5f', '#feb47b', '#ffd59e'], ground: '#1d3557', sun: '#fff1c1', kind: 'sea' },
  { name: 'הרים', sky: ['#2b5876', '#4e4376', '#a77bca'], ground: '#1b1b2f', sun: '#ffe9a8', kind: 'mount' },
  { name: 'עיר בלילה', sky: ['#0f0c29', '#302b63', '#24243e'], ground: '#0b0b14', sun: '#f2f2f2', kind: 'city' },
  { name: 'מדבר', sky: ['#f6d365', '#fda085', '#f37b5c'], ground: '#a0522d', sun: '#fff7d6', kind: 'dunes' },
  { name: 'יער', sky: ['#a8e063', '#56ab2f', '#2f6b1f'], ground: '#143d14', sun: '#f9ffcf', kind: 'forest' },
  { name: 'מסיבה', sky: ['#ff0080', '#7928ca', '#2a0845'], ground: '#140021', sun: '#ffffff', kind: 'party' },
  { name: 'חוף', sky: ['#56ccf2', '#a1e3ff', '#e0f7ff'], ground: '#f4d58d', sun: '#fffbe6', kind: 'beach' },
  { name: 'זריחה', sky: ['#355c7d', '#c06c84', '#f8b195'], ground: '#2d2a32', sun: '#ffd8a8', kind: 'mount' },
];

function drawScene(sc, seed) {
  const W = 1080, H = 1440;
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  const r = rng(seed);
  const g = x.createLinearGradient(0, 0, 0, H * 0.7);
  sc.sky.forEach((col, i) => g.addColorStop(i / (sc.sky.length - 1), col));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // sun / moon glow
  const sx = W * r.range(0.25, 0.75), sy = H * r.range(0.22, 0.42);
  const rg = x.createRadialGradient(sx, sy, 10, sx, sy, 420);
  rg.addColorStop(0, sc.sun); rg.addColorStop(0.2, sc.sun + 'cc'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = rg; x.fillRect(0, 0, W, H);
  x.fillStyle = sc.sun; x.beginPath(); x.arc(sx, sy, 90, 0, Math.PI * 2); x.fill();
  const horizon = H * 0.62;
  x.fillStyle = sc.ground;
  if (sc.kind === 'mount' || sc.kind === 'dunes') {
    for (let layer = 0; layer < 3; layer++) {
      x.globalAlpha = 0.5 + layer * 0.25;
      x.beginPath(); x.moveTo(0, H);
      let y = horizon - 200 + layer * 120;
      for (let px = 0; px <= W; px += 60) {
        y += (r() - 0.5) * (sc.kind === 'mount' ? 160 : 50);
        x.lineTo(px, y);
      }
      x.lineTo(W, H); x.closePath(); x.fill();
    }
    x.globalAlpha = 1;
  } else if (sc.kind === 'city' || sc.kind === 'party') {
    for (let i = 0; i < 18; i++) {
      const bw = r.range(50, 120), bh = r.range(200, 620), bx = r.range(-40, W);
      x.fillStyle = sc.ground; x.fillRect(bx, H - bh - 300, bw, bh + 300);
      x.fillStyle = sc.kind === 'party' ? ['#ff0080', '#00e5ff', '#ffe600'][i % 3] : '#ffd27a';
      for (let wy = H - bh - 280; wy < H - 320; wy += 36) for (let wx = bx + 10; wx < bx + bw - 14; wx += 26) if (r() < 0.45) x.fillRect(wx, wy, 12, 18);
    }
    if (sc.kind === 'party') for (let i = 0; i < 40; i++) { x.fillStyle = `hsla(${r() * 360},100%,65%,0.8)`; x.beginPath(); x.arc(r() * W, r() * H * 0.6, r.range(4, 14), 0, 7); x.fill(); }
  } else if (sc.kind === 'forest') {
    x.fillRect(0, horizon, W, H);
    for (let i = 0; i < 26; i++) {
      const tx = r() * W, ty = horizon + r.range(-100, 300), th = r.range(240, 520);
      x.fillStyle = `rgba(10,${40 + r() * 40},20,0.9)`;
      x.beginPath(); x.moveTo(tx, ty - th); x.lineTo(tx - th * 0.3, ty); x.lineTo(tx + th * 0.3, ty); x.fill();
    }
  } else {
    x.fillRect(0, horizon, W, H - horizon);
    if (sc.kind === 'sea') {
      x.fillStyle = sc.sun + '88';
      for (let i = 0; i < 30; i++) x.fillRect(sx - r.range(20, 160), horizon + i * 22, r.range(40, 320), 5);
    }
    if (sc.kind === 'beach') {
      x.fillStyle = '#2fa4d9'; x.fillRect(0, horizon, W, 160);
      x.fillStyle = '#ffffffaa'; for (let i = 0; i < 6; i++) x.fillRect(r() * W, horizon + 150 + r() * 10, r.range(80, 260), 6);
      x.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"'; x.fillText('🏖️', W * 0.55, H * 0.92);
    }
  }
  // gentle vignette
  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
  return c;
}

export async function makeDemoFiles() {
  const base = Date.now() - 1000 * 60 * 60 * 24 * 3;
  const files = [];
  for (let i = 0; i < SCENES.length; i++) {
    const c = drawScene(SCENES[i], 101 + i * 17);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.88));
    files.push(new File([blob], `${SCENES[i].name}.jpg`, { type: 'image/jpeg', lastModified: base + i * 3600_000 }));
  }
  return files;
}
