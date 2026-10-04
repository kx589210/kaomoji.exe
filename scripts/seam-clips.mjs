// Seam clips for review (the continuity plan v07, FW6 and §6.7; scripts/README-checks.md): for every seam S, two bars round it (S − --span
// … S + --span − 1, ±1 bar by default) of film A (v06-proposed by default) and of B — a cut (--b FILM.mp4), a new mix on A's picture
// (--b-audio MIX.wav: the "listening preview" of a music package, no render), or A's picture with a package's re-rendered frames
// spliced in (--b-frames DIR of f<film frame>.png; with --b-audio or A's sound) — and from them:
//   clips   clip-S-A.mp4 / clip-S-B.mp4: the two bars with picture and sound, each frame labelled (A or B, the film's label, the seam, the
//           frame; the label turns red on the seam frame and the 5 after it), 960 × 540 by default (--size), H.264 + AAC;
//   reel    reel.mp4: every seam's A clip then its B clip, in seam order (only A's when there is no B);
//   strips  strip-S.png: every 4th frame (--step) of the two bars, the seam frame boxed in red, A's rows over B's;
//   spec    spec-S.png: the two bars' spectrograms (30 Hz – 20 kHz, log), A over B, the seam marked;
//   bands   bands-S.txt: per 16th, the mix's level, six bands, side/mid, centroid, spectral flux and peak (A, then B);
//   stems   stems-S.txt: per beat (±2 bars), each bus's level from the source tree's stems (renderStems, ~20 s), and the events round the seam.
// --what picks (default clips,reel,strips,spec). A whole film reads the loop seam (its length) as its last bar, then its first.
// Frames are decoded with Remotion's ffmpeg; clips are encoded from BMP frames through image2pipe (that ffmpeg has no raw video demuxer).
//   node scripts/seam-clips.mjs --b-audio output/qa/v07/wp2/bgm-wp2.wav --seams 4224,4320,4512 --out output/qa/v07/wp2/ab
//   node scripts/seam-clips.mjs --b output/kaomoji-full-v07-1x.mp4 --label-b v07 --out output/qa/v07/seam-reel
//   node scripts/seam-clips.mjs --b-frames output/qa/v07/WP4/after-frames --seams 3456 --label-b "v07 hole"
//   node scripts/seam-clips.mjs --what strips,spec,bands --seams 2112          # A alone
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import console from 'node:console';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { writeWav } from './audio/wav.mjs';
import { PLAN_SEAMS } from './check-seam-audio.mjs';
import { fft } from './lib/fft.mjs';
import { decodePng, encodePng, resize } from './lib/png.mjs';
import { KX, ffmpegPath } from './lib/remotion.mjs';
import { cliArgs, eachFrame, filmMap, isMain, parseSize, probe, readSoundtrack, resolveInput } from './lib/review.mjs';

const FPS = 60;

// ——— Text on frames: a 3 × 5 bitmap font (capitals, digits, a little punctuation) ——————————————————————————————————————————————

const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
  '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', '/': '001001010100100', '>': '100010001010100',
  '+': '000010111010000', '·': '000000010000000', '(': '010100100100010', ')': '010001001001010', ' ': '000000000000000',
};

/** Width in px of `text` at `scale` (4 columns a character). */
export const textWidth = (text, scale) => [...String(text)].length * 4 * scale - scale;

/** Draws `text` (capitals; lower case is drawn as capitals) into an RGB image { width, height, data } at (x, y), `scale` px a dot. */
export function drawText(img, x, y, text, scale, rgb) {
  [...String(text).toUpperCase()].forEach((ch, k) => {
    const bits = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (bits[r * 3 + c] !== '1') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = x + (k * 4 + c) * scale + dx;
            const py = y + r * scale + dy;
            if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
            img.data.set(rgb, (py * img.width + px) * 3);
          }
        }
      }
    }
  });
}

/** Fills a rectangle of an RGB image. */
export function fillRect(img, x0, y0, x1, y1, rgb) {
  for (let y = Math.max(0, y0); y < Math.min(img.height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(img.width, x1); x++) img.data.set(rgb, (y * img.width + x) * 3);
}

/** An RGB24 frame as a 24-bit BMP (bottom-up BGR rows, padded to 4 bytes). */
export function bmp(rgb, w, h) {
  const row = w * 3;
  const pad = (4 - (row % 4)) % 4;
  const size = 54 + (row + pad) * h;
  const b = Buffer.alloc(size);
  b.write('BM', 0);
  b.writeUInt32LE(size, 2);
  b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(w, 18);
  b.writeInt32LE(h, 22);
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(24, 28);
  b.writeUInt32LE((row + pad) * h, 34);
  for (let y = 0; y < h; y++) {
    const o = 54 + (h - 1 - y) * (row + pad);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      b[o + x * 3] = rgb[i + 2];
      b[o + x * 3 + 1] = rgb[i + 1];
      b[o + x * 3 + 2] = rgb[i];
    }
  }
  return b;
}

// ——— Frames and sound of a seam ————————————————————————————————————————————————————————————————————————————————————————————————

/** Film frames [S − span, S + span) mapped into a film of `total` frames (the loop wraps), as contiguous runs { from, count, at }. */
export function seamRuns(S, span, total) {
  const frames = Array.from({ length: 2 * span }, (_, k) => (((S - span + k) % total) + total) % total);
  const runs = [];
  frames.forEach((f, k) => {
    const r = runs[runs.length - 1];
    if (r && f === r.from + r.count) r.count++;
    else runs.push({ from: f, count: 1, at: k });
  });
  return { frames, runs };
}

/**
 * The frames of a seam's two bars from `file` (a whole film from frame 0), as copies at w × h: an array in order. `splice` (a folder of
 * f<film frame>.png, e.g. a package's re-rendered window) replaces the film's frames it holds.
 */
async function seamFrames(file, info, S, span, total, w, h, splice = null) {
  const { frames, runs } = seamRuns(S, span, total);
  const out = new Array(frames.length);
  for (const r of runs) await eachFrame(file, { width: w, height: h, from: r.from, count: r.count, info, onFrame: (rgb, f) => (out[r.at + f - r.from] = Buffer.from(rgb)) });
  if (splice) {
    frames.forEach((f, k) => {
      const png = path.join(splice, `f${f}.png`);
      if (!fs.existsSync(png)) return;
      const img = decodePng(fs.readFileSync(png));
      const rgb = img.channels === 3 ? img : { ...img, channels: 3, data: Uint8Array.from({ length: img.width * img.height * 3 }, (_, i) => img.data[Math.floor(i / 3) * img.channels + (i % 3)]) };
      out[k] = Buffer.from(resize(rgb, w, h).data);
    });
  }
  return out;
}

/** Samples of a seam's two bars from a soundtrack { sampleRate, channels } (wrapping round the film). */
export function seamSound(sound, S, span) {
  const [L, R] = sound.channels;
  const spf = sound.sampleRate / FPS;
  const a = Math.round((S - span) * spf);
  const n = Math.round(2 * span * spf);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = (((a + i) % L.length) + L.length) % L.length;
    l[i] = L[j];
    r[i] = R[j];
  }
  return { L: l, R: r, sr: sound.sampleRate };
}

/** Writes an H.264 + AAC clip from labelled frames and a sound slice. */
async function writeClip(out, frames, w, h, snd, label) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-seamclip-'));
  try {
    const wav = path.join(tmp, 'a.wav');
    writeWav(wav, snd.L, snd.R, snd.sr, { dither: false });
    const p = spawn(ffmpegPath(), ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'bmp', '-i', 'pipe:0', '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    const done = new Promise((resolve, reject) => p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg failed on ${out}: ${err.trim()}`)))));
    for (let k = 0; k < frames.length; k++) {
      const img = { width: w, height: h, data: Buffer.from(frames[k]) };
      label(img, k);
      if (!p.stdin.write(bmp(img.data, w, h))) await new Promise((r) => p.stdin.once('drain', r));
    }
    p.stdin.end();
    await done;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/** A strip: every `step`th frame of the two bars in `cols` columns of tw × th, the seam frame boxed in red; a title row on top. */
function stripOf(frames, filmFrames, S, total, { tw, th, cols, step, title, color }) {
  const keep = frames.map((_, k) => k).filter((k) => k % step === 0);
  const rows = Math.ceil(keep.length / cols);
  const gap = 4;
  const lab = 16;
  const head = 26;
  const W = cols * (tw + gap) + gap;
  const H = head + rows * (th + lab + gap);
  const img = { width: W, height: H, data: Buffer.alloc(W * H * 3, 16) };
  drawText(img, 8, 6, title, 3, color);
  const seamAt = ((S % total) + total) % total;
  keep.forEach((k, t) => {
    const x0 = gap + (t % cols) * (tw + gap);
    const y0 = head + Math.floor(t / cols) * (th + lab + gap);
    const f = filmFrames[k];
    const isSeam = f === seamAt && k === frames.length / 2;
    if (isSeam) fillRect(img, x0 - 3, y0 - 3, x0 + tw + 3, y0 + th + 3, [255, 40, 40]);
    for (let y = 0; y < th; y++) frames[k].copy(img.data, ((y0 + y) * W + x0) * 3, y * tw * 3, (y + 1) * tw * 3);
    drawText(img, x0 + 2, y0 + th + 4, String(f), 2, isSeam ? [255, 80, 80] : f % 24 === 0 ? [255, 220, 80] : [200, 200, 200]);
  });
  return img;
}

/** Stacks RGB images vertically (left-aligned, dark fill). */
function stack(images) {
  const W = Math.max(...images.map((i) => i.width));
  const H = images.reduce((s, i) => s + i.height, 0);
  const out = { width: W, height: H, data: Buffer.alloc(W * H * 3, 16) };
  let y0 = 0;
  for (const im of images) {
    for (let y = 0; y < im.height; y++) im.data.copy(out.data, ((y0 + y) * W) * 3, y * im.width * 3, (y + 1) * im.width * 3);
    y0 += im.height;
  }
  return out;
}

/** A spectrogram (mid, 30 Hz – 20 kHz, log; −90 … 0 dB) of a sound slice, width × height, the seam (the middle) marked, with a title. */
function spectrogram(snd, { width = 1536, height = 300, title, color }) {
  const N = 4096;
  const head = 24;
  const img = { width, height: height + head, data: Buffer.alloc(width * (height + head) * 3, 16) };
  drawText(img, 8, 5, title, 3, color);
  const hop = (snd.L.length - N) / width;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let x = 0; x < width; x++) {
    const s = Math.round(x * hop);
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
      re[i] = 0.5 * ((snd.L[s + i] ?? 0) + (snd.R[s + i] ?? 0)) * w;
      im[i] = 0;
    }
    fft(re, im);
    for (let y = 0; y < height; y++) {
      const f = 30 * (20000 / 30) ** (1 - y / (height - 1));
      const bin = Math.min(N / 2 - 1, Math.round((f / snd.sr) * N));
      const db = 20 * Math.log10(Math.hypot(re[bin], im[bin]) / (N / 4) + 1e-9);
      const v = Math.max(0, Math.min(1, (db + 90) / 90));
      img.data.set([Math.round(255 * Math.min(1, v * 1.8)), Math.round(255 * Math.max(0, v * 1.6 - 0.5)), Math.round(255 * Math.max(0, 0.5 - Math.abs(v - 0.35)) * 1.6)], ((head + y) * width + x) * 3);
    }
  }
  // The seam (the slice's middle, where the analysis window is centred on it) and the beats.
  const xAt = (sample) => Math.round((sample - N / 2) / hop);
  const spb = (24 / FPS) * snd.sr;
  for (let b = -8; b <= 8; b++) {
    const x = xAt(snd.L.length / 2 + b * spb);
    if (x < 0 || x >= width) continue;
    for (let y = head; y < head + (b === 0 ? height : 10); y++) img.data.set(b === 0 ? [255, 40, 40] : [230, 230, 230], (y * width + x) * 3);
  }
  return img;
}

const BANDS = [[20, 80, 'sub'], [80, 250, 'low'], [250, 1000, 'lmid'], [1000, 4000, 'mid'], [4000, 10000, 'hi'], [10000, 20000, 'air']];
const dbOf = (x) => (x > 0 ? 10 * Math.log10(x) : -120);

/** Per 16th of a sound slice (the seam in the middle): level, six bands, side/mid, centroid, flux and peak, as text lines. */
export function bandsTable(snd, S, span, title) {
  const spf = snd.sr / FPS;
  const N = 4096;
  const lines = [`${title}: rows every 6 frames (a 16th); dB re full scale; S/M side over mid; cen centroid (Hz); flux onset strength`, 'frame    rel    rms   sub   low  lmid   mid    hi   air    S/M    cen   flux   peak'];
  let prev = null;
  for (let k = 0; k < 2 * span; k += 6) {
    const a = Math.round(k * spf);
    const n = Math.round(6 * spf);
    let e = 0;
    let pk = 0;
    for (let i = a; i < a + n; i++) {
      const v = 0.5 * (snd.L[i] + snd.R[i]);
      e += v * v;
      pk = Math.max(pk, Math.abs(snd.L[i]), Math.abs(snd.R[i]));
    }
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    const sre = new Float64Array(N);
    const sim = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
      const l = snd.L[a + i] ?? 0;
      const r = snd.R[a + i] ?? 0;
      re[i] = 0.5 * (l + r) * w;
      sre[i] = 0.5 * (l - r) * w;
    }
    fft(re, im);
    fft(sre, sim);
    const m = new Float64Array(N / 2);
    let tm = 0;
    let ts = 0;
    let cn = 0;
    for (let b = 1; b < N / 2; b++) {
      m[b] = re[b] ** 2 + im[b] ** 2;
      tm += m[b];
      ts += sre[b] ** 2 + sim[b] ** 2;
      cn += m[b] * ((b * snd.sr) / N);
    }
    const band = BANDS.map(([lo, hi]) => {
      let x = 0;
      for (let b = Math.ceil((lo / snd.sr) * N); b < Math.min(N / 2, (hi / snd.sr) * N); b++) x += m[b];
      return dbOf(x / ((N * N) / 8));
    });
    let flux = 0;
    if (prev) for (let b = 1; b < N / 2; b++) flux += Math.max(0, Math.sqrt(m[b]) - Math.sqrt(prev[b]));
    prev = m;
    const f = S - span + k;
    lines.push(`${String(f).padStart(5)} ${String(f - S).padStart(6)} ${dbOf(e / n).toFixed(1).padStart(6)} ${band.map((b) => b.toFixed(0).padStart(5)).join(' ')} ${(dbOf(ts) - dbOf(tm)).toFixed(1).padStart(6)} ${(cn / tm || 0).toFixed(0).padStart(6)} ${flux.toFixed(1).padStart(6)} ${dbOf(pk * pk).toFixed(1).padStart(6)}${f === S ? '  <== SEAM' : ''}`);
  }
  return lines.join('\n');
}

/** Per beat (±2 bars), each bus's level (dB) from rendered stems, and the events (film frame − S: kind) round the seam. */
export function stemsTable(stems, events, S, sr, total) {
  const spf = sr / FPS;
  const lines = [`seam ${S}: each bus's level per beat, beats −8 … +7 (| = the seam), dB; · silent`, `bus       ${Array.from({ length: 16 }, (_, k) => String(k - 8).padStart(4)).join('')}`];
  const n = stems.sub.length;
  for (const [name, bus] of Object.entries(stems)) {
    const row = [];
    let any = false;
    for (let k = -8; k < 8; k++) {
      const a = Math.round((S + 24 * k) * spf);
      const z = Math.round((S + 24 * (k + 1)) * spf);
      let e = 0;
      for (let i = a; i < z; i++) {
        const j = ((i % n) + n) % n;
        e += name === 'sub' || !bus.L ? bus[j] * bus[j] : 0.5 * (bus.L[j] ** 2 + bus.R[j] ** 2);
      }
      e /= z - a;
      if (e > 1e-7) any = true;
      row.push(`${k === 0 ? '|' : ' '}${e > 1e-7 ? String(Math.round(10 * Math.log10(e))).padStart(3) : '  ·'}`);
    }
    if (any) lines.push(name.padEnd(10) + row.join(''));
  }
  const near = events
    .map((e) => ({ kind: e.kind ?? e.as, frame: 'frame' in e && Number.isFinite(e.frame) ? e.frame : (e.at * FPS) / sr }))
    .map((e) => ({ ...e, d: e.frame - S < -total / 2 ? e.frame - S + total : e.frame - S }))
    .filter((e) => e.kind && e.d >= -192 && e.d < 192)
    .sort((x, y) => x.d - y.d);
  lines.push(`\nevents ±2 bars (frames from the seam: kind): ${near.map((e) => `${Math.round(e.d)}:${e.kind}`).join(' ')}`);
  return lines.join('\n');
}

async function main() {
  const { values } = parseArgs({
    args: cliArgs(),
    allowPositionals: false,
    options: {
      a: { type: 'string', default: 'output/kaomoji-full-v06-proposed-1x.mp4' },
      b: { type: 'string' },
      'b-audio': { type: 'string' },
      'b-frames': { type: 'string' },
      'label-a': { type: 'string' },
      'label-b': { type: 'string' },
      seams: { type: 'string', default: 'plan' },
      span: { type: 'string', default: '96' },
      out: { type: 'string', default: 'output/qa/v07/seams' },
      size: { type: 'string', default: '960x540' },
      step: { type: 'string', default: '4' },
      what: { type: 'string', default: 'clips,reel,strips,spec' },
    },
  });
  const what = new Set(values.what.split(','));
  const map = await filmMap();
  const total = map.total;
  const span = Number(values.span);
  const [w, h] = parseSize(values.size);
  const out = path.resolve(KX, values.out);
  fs.mkdirSync(out, { recursive: true });
  const seams = values.seams === 'plan' ? PLAN_SEAMS : values.seams.split(',').map(Number);
  const aFile = resolveInput(values.a);
  const bFile = values.b ? resolveInput(values.b) : null;
  const labelA = values['label-a'] ?? path.basename(aFile, '.mp4').replace(/^kaomoji-full-/, '').replace(/-1x$/, '');
  const bFrames = values['b-frames'] ? resolveInput(values['b-frames']) : null;
  const labelB = values['label-b'] ?? (bFile ? path.basename(bFile, '.mp4').replace(/^kaomoji-full-/, '').replace(/-1x$/, '') : values['b-audio'] ? `${path.basename(values['b-audio'], '.wav')} on ${labelA} picture` : bFrames ? `${labelA} + new frames` : null);
  const sides = [{ id: 'A', file: aFile, label: labelA, color: [235, 235, 235] }];
  if (bFile || values['b-audio'] || bFrames) sides.push({ id: 'B', file: bFile ?? aFile, label: labelB, color: [120, 220, 255], audio: values['b-audio'] ? resolveInput(values['b-audio']) : null, splice: bFrames });
  for (const s of sides) {
    s.info = probe(s.file);
    if (s.info.frames < total) throw new Error(`${s.file}: ${s.info.frames} frames; seam clips need the whole film (${total})`);
    s.sound = readSoundtrack(s.audio ?? s.file);
  }
  let stems = null;
  let events = null;
  if (what.has('stems')) ({ stems, events } = (await import('./audio/bgm.mjs')).renderStems());
  const t0 = Date.now();
  const clips = [];
  const [tw, th] = [240, 135];
  for (const S of seams) {
    const name = map.label(S % total).trim();
    const { frames: filmFrames } = seamRuns(S, span, total);
    const strips = [];
    const specs = [];
    const bands = [];
    for (const s of sides) {
      const snd = seamSound(s.sound, S, span);
      const title = `${s.id} ${s.label} · seam ${S} ${S >= total ? '(loop)' : name}`;
      if (what.has('clips') || what.has('reel')) {
        const frames = await seamFrames(s.file, s.info, S, span, total, w, h, s.splice);
        const file = path.join(out, `clip-${S}-${s.id}.mp4`);
        const scale = Math.max(2, Math.round(w / 320));
        await writeClip(file, frames, w, h, snd, (img, k) => {
          const f = filmFrames[k];
          const onSeam = k >= span && k < span + 6;
          const text = `${s.id} ${s.label}  seam ${S}  f ${f}`;
          fillRect(img, 0, 0, textWidth(text, scale) + 4 * scale, 9 * scale, [0, 0, 0]);
          drawText(img, 2 * scale, 2 * scale, text, scale, onSeam ? [255, 60, 60] : s.color);
        });
        clips.push(file);
      }
      if (what.has('strips')) {
        const small = await seamFrames(s.file, s.info, S, span, total, tw, th, s.splice);
        strips.push(stripOf(small, filmFrames, S, total, { tw, th, cols: 8, step: Number(values.step), title, color: s.color }));
      }
      if (what.has('spec')) specs.push(spectrogram(snd, { title, color: s.color }));
      if (what.has('bands')) bands.push(bandsTable(snd, S, span, title));
    }
    if (strips.length) fs.writeFileSync(path.join(out, `strip-${S}.png`), encodePng({ ...stack(strips), channels: 3 }));
    if (specs.length) fs.writeFileSync(path.join(out, `spec-${S}.png`), encodePng({ ...stack(specs), channels: 3 }));
    if (bands.length) fs.writeFileSync(path.join(out, `bands-${S}.txt`), bands.join('\n\n'));
    if (stems) fs.writeFileSync(path.join(out, `stems-${S}.txt`), stemsTable(stems, events, S, 48000, total));
    console.log(`seam ${S} (${name}) done, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (what.has('reel') && clips.length) {
    const list = path.join(out, 'reel.txt');
    fs.writeFileSync(list, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n'));
    const reel = path.join(out, 'reel.mp4');
    await new Promise((resolve, reject) => {
      const p = spawn(ffmpegPath(), ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', reel], { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`reel failed: ${err.trim()}`))));
    });
    console.log(`reel: ${reel} (${clips.length} clips)`);
  }
  console.log(`seam clips in ${out}`);

}

if (isMain(import.meta.url)) await main();
