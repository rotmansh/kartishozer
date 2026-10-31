// Export: record the canvas + the mixed audio in real time with MediaRecorder.
export function pickMime() {
  const opts = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of opts) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* ignore */ } }
  return '';
}

export function canExport() {
  return typeof MediaRecorder !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;
}

export async function exportVideo(player, { width, height, fps = 30 }, onProgress) {
  const P = player.getProject();
  const canvas = player.canvas;
  const prev = { w: canvas.width, h: canvas.height, opts: player.drawOpts };
  player.pause();
  canvas.width = width; canvas.height = height;
  player.drawOpts = {};
  const ac = player.audio();
  await ac.resume().catch(() => {});
  const dest = ac.createMediaStreamDestination();
  player.master.connect(dest);
  const stream = canvas.captureStream(fps);
  const at = dest.stream.getAudioTracks()[0];
  if (at) stream.addTrack(at);
  const mimeType = pickMime();
  const rec = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: height >= 1900 || width >= 1900 ? 12_000_000 : 7_000_000,
    audioBitsPerSecond: 192_000,
  });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  let wakeLock = null;
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }

  player.seek(0);
  await player.ready(0);
  player.invalidate();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  let cancelled = false;
  const done = new Promise((resolve) => {
    const onTime = (t) => onProgress?.(Math.min(1, t / P.duration));
    player.listeners.time.push(onTime);
    const finish = () => {
      player.listeners.time = player.listeners.time.filter((f) => f !== onTime);
      player.listeners.ended = player.listeners.ended.filter((f) => f !== finish);
      setTimeout(resolve, 250);
    };
    player.listeners.ended.push(finish);
    player._cancelExport = () => { cancelled = true; player.pause(); finish(); };
  });
  rec.start(250);
  await player.play();
  await done;
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.stop();
  await stopped;
  try { player.master.disconnect(dest); } catch { /* ignore */ }
  stream.getTracks().forEach((t) => t.stop());
  try { await wakeLock?.release(); } catch { /* ignore */ }
  canvas.width = prev.w; canvas.height = prev.h;
  player.drawOpts = prev.opts;
  player.seek(0);
  player._cancelExport = null;
  if (cancelled) return null;
  const type = (mimeType || chunks[0]?.type || 'video/webm').split(';')[0];
  const blob = new Blob(chunks, { type });
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  return { blob, ext, type };
}
