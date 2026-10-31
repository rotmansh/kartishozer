// Offline cache for the app shell (network-first so updates arrive quickly).
const CACHE = 'klipi-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/util.js', 'js/analyzer.js', 'js/beat.js', 'js/music.js', 'js/director.js',
  'js/renderer.js', 'js/player.js', 'js/exporter.js', 'js/demo.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.host.includes('fonts.g');
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
