// Resumable render: JPEG frames rendered in chunks (a fresh browser per chunk,
// because the angle backend leaks memory) and written atomically under names
// of one fixed width; a manifest refuses frames from a different setup. Then
// encoded with Remotion's ffmpeg, muxed with the source WAV as limited-range
// BT.709, checked (size, frame rate, frame count, colour tags, audio sync),
// and downscaled to 1080p.
//   node scripts/render.mjs --comp KX-TechSample --name tech-sample-v01 --audio audio/tech-sample.wav --scale 2
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { renderFrames, selectComposition } from '@remotion/renderer';
import { truePeakDb } from './audio/meter.mjs';
import { readWav } from './audio/wav.mjs';
import { xcorrLag } from './lib/fft.mjs';
import { downscale, encodeMaster, probeVideo } from './lib/encode.mjs';
import { checkManifest, framePattern, framesOnDisk, sourceHash, writeFrameAtomic } from './lib/frames.mjs';
import { CHROMIUM, KX, bundleKaomoji, ffmpegPath, openGpuBrowser, planChunks } from './lib/remotion.mjs';

const { values } = parseArgs({
  options: {
    comp: { type: 'string' },
    name: { type: 'string' },
    audio: { type: 'string' },
    scale: { type: 'string', default: '2' },
    draft: { type: 'boolean', default: false },
    chunk: { type: 'string', default: '240' },
  },
});
if (!values.comp || !values.name || !values.audio) throw new Error('usage: --comp ID --name NAME --audio public/relative.wav');
const scale = Number(values.scale);
const inputProps = { quality: values.draft ? 'draft' : 'final' };
const framesDir = path.join(KX, 'output', 'frames', values.name);
fs.mkdirSync(framesDir, { recursive: true });

const serveUrl = await bundleKaomoji();
const probe = await openGpuBrowser(scale);
const composition = await selectComposition({ serveUrl, id: values.comp, inputProps, puppeteerInstance: probe, chromiumOptions: CHROMIUM });
await probe.close({ silent: true });

const total = composition.durationInFrames;
checkManifest(framesDir, { comp: values.comp, frames: total, width: composition.width, height: composition.height, fps: composition.fps, scale, quality: inputProps.quality, source: sourceHash(KX) });
const done = framesOnDisk(framesDir, total);
const chunks = planChunks(total, done, Number(values.chunk));
console.log(`${values.comp}: ${total} frames, ${done.size} on disk, ${chunks.length} chunk(s) to render`);
for (const [from, to] of chunks) {
  const browser = await openGpuBrowser(scale);
  try {
    const t0 = Date.now();
    await renderFrames({
      composition,
      serveUrl,
      inputProps,
      // Remotion would pad names to each chunk's last frame; write fixed-width names ourselves, atomically.
      outputDir: null,
      onFrameBuffer: (buffer, frame) => writeFrameAtomic(framesDir, frame, total, buffer),
      imageFormat: 'jpeg',
      jpegQuality: 95,
      frameRange: [from, to],
      scale,
      puppeteerInstance: browser,
      chromiumOptions: CHROMIUM,
      concurrency: 2,
      timeoutInMilliseconds: 300_000,
      onStart: () => undefined,
      onFrameUpdate: (n) => process.stdout.write(`\r  frames ${from}–${to}: ${n}/${to - from + 1}`),
    });
    console.log(`\r  frames ${from}–${to}: done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  } finally {
    await browser.close({ silent: true });
  }
}

const wav = path.join(KX, 'public', values.audio);
const master = path.join(KX, 'output', `${values.name}-${scale === 2 ? '4k' : `${scale}x`}.mp4`);
console.log(`encoding ${path.basename(master)}`);
encodeMaster({ frames: path.join(framesDir, framePattern(total)), wav, out: master, progress: true });

const got = probeVideo(master);
const want = { width: composition.width * scale, height: composition.height * scale, fps: composition.fps, frames: composition.durationInFrames, colorRange: 'tv', colorSpace: 'bt709' };
const wrong = Object.entries(want).filter(([k, v]) => got[k] !== v);
if (wrong.length > 0) {
  console.error(`${path.basename(master)}: ${wrong.map(([k, v]) => `${k} ${got[k]} (want ${v})`).join(', ')}`);
  process.exit(1);
}

const decoded = path.join(KX, 'output', 'frames', `${values.name}-decoded.wav`);
execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-i', master, '-map', '0:a', '-c:a', 'pcm_s16le', '-ar', '48000', decoded], { stdio: 'inherit' });
const src = readWav(wav).channels[0];
const decodedChannels = readWav(decoded).channels;
const back = decodedChannels[0];
// The delivery's true peak (the bible §6.4: −1.5 dBTP in the MP4). The native AAC coder is chaotic: at some sample alignments it throws
// a bad block well over the master's −2.0 (the whole-film mix pass, 2026-10-03: up to +0.9 dBTP in drop 2 at offsets the film does not
// use), so every delivered file is measured here, after DELIVERY_TRIM_DB (scripts/lib/encode.mjs).
const deliveredTp = truePeakDb(decodedChannels[0], decodedChannels[1] ?? decodedChannels[0]);
console.log(`audio true peak in ${path.basename(master)} after the AAC: ${deliveredTp.toFixed(2)} dBTP (the delivery's limit −1.5)`);
if (deliveredTp > -1.5) console.warn(`WARNING: ${path.basename(master)} is over the −1.5 dBTP delivery limit (an AAC bad block): find it with check-loudness and re-encode`);
const len = Math.min(src.length, back.length, 48000 * 20);
const lag = xcorrLag(src.subarray(0, len), back.subarray(0, len), 4800);
console.log(`audio lag in ${path.basename(master)}: ${lag} samples`);
if (Math.abs(lag) > 1) {
  console.error('AUDIO OUT OF SYNC');
  process.exit(1);
}

if (scale === 2) {
  const hd = path.join(KX, 'output', `${values.name}-1080p.mp4`);
  console.log(`encoding ${path.basename(hd)}`);
  downscale({ src: master, out: hd, width: composition.width, height: composition.height, progress: true });
  console.log(`→ ${path.relative(process.cwd(), master)}\n→ ${path.relative(process.cwd(), hd)}`);
}
