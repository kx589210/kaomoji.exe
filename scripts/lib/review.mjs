// Shared plumbing of the review checks (check-sync, check-flash, check-seams, check-loudness; scripts/README-checks.md):
// decoding a rendered cut, reading a soundtrack, the film's map (parts and sections) and the printed tables.
//
// Remotion's ffmpeg has no rawvideo muxer and only a few filters (scale, zscale …; no select, no trim), so frames come through
// image2pipe as RGB24 and exact frames are reached by input seeking (-ss before -i, which decodes from the keyframe before and drops
// what lies before the target).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav } from '../audio/wav.mjs';
import { KX, ffmpegPath, ffprobePath } from './remotion.mjs';

/** True when the module at `url` is the script node was started with (so a check can be imported by the tests without running). */
export function isMain(url) {
  if (!process.argv[1]) return false;
  const a = path.resolve(process.argv[1]);
  const b = fileURLToPath(url);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** The command line's arguments, with a negative number after an option glued to it ("--max-tp -1.5" → "--max-tp=-1.5"), which parseArgs would refuse. */
export function cliArgs(argv = process.argv.slice(2)) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (/^--[a-z]/.test(argv[i]) && !argv[i].includes('=') && /^-\d/.test(argv[i + 1] ?? '')) out.push(`${argv[i]}=${argv[++i]}`);
    else out.push(argv[i]);
  }
  return out;
}

/** A path from the command line: as given (relative to the working directory) if it exists, else relative to the repository root. */
export function resolveInput(p) {
  const here = path.resolve(p);
  if (fs.existsSync(here)) return here;
  const inKx = path.resolve(KX, p);
  if (fs.existsSync(inKx)) return inKx;
  throw new Error(`${p}: no such file (looked in ${path.dirname(here)} and ${path.dirname(inKx)})`);
}

/** "384x216" → [384, 216]. */
export function parseSize(s) {
  const m = /^(\d+)[x×](\d+)$/.exec(String(s));
  if (!m) throw new Error(`size "${s}" is not WIDTHxHEIGHT`);
  return [Number(m[1]), Number(m[2])];
}

// ---------------------------------------------------------------------------------------------------------------------------- video

/** Size, frame rate, frame count and start offset (video stream start − file start, in seconds) of a video file. */
export function probe(file) {
  const { streams, format } = JSON.parse(execFileSync(ffprobePath(), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
  const v = streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error(`${file}: no video stream`);
  const [num, den] = v.avg_frame_rate.split('/').map(Number);
  const fps = num / den;
  const duration = Number(v.duration ?? format.duration);
  const frames = Number(v.nb_frames) || Math.round(duration * fps);
  return { width: v.width, height: v.height, fps, frames, offset: (Number(v.start_time) || 0) - (Number(format.start_time) || 0) };
}

/**
 * Streams frames of `file` as RGB24 scaled (area average) to width × height: onFrame(rgb, index) for `count` frames from frame
 * `from` (0-based, of the file; all to the end by default). `rgb` is one buffer reused for every frame: copy what you keep.
 * Resolves with the number of frames delivered.
 */
export function eachFrame(file, { width, height, from = 0, count, onFrame, info = probe(file) }) {
  const args = ['-v', 'error'];
  // Half a frame before the target, so the frame before is dropped and the target kept, whatever the rounding of its timestamp.
  if (from > 0) args.push('-ss', ((from - 0.5) / info.fps + info.offset).toFixed(6));
  args.push('-i', file, '-an', '-sn');
  if (count !== undefined) args.push('-frames:v', String(count));
  // Passthrough timing: one output frame per decoded frame. (The default constant-rate output repeats the first frame after a seek
  // to fill the half frame before it.)
  args.push('-vf', `scale=${width}:${height}:flags=area`, '-fps_mode', 'passthrough', '-pix_fmt', 'rgb24', '-c:v', 'rawvideo', '-f', 'image2pipe', 'pipe:1');
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const size = width * height * 3;
    const frame = Buffer.allocUnsafe(size);
    let fill = 0;
    let n = 0;
    let err = '';
    let failed = null;
    p.stderr.on('data', (d) => {
      err += d;
    });
    p.stdout.on('data', (chunk) => {
      if (failed) return;
      let off = 0;
      while (off < chunk.length) {
        const take = Math.min(size - fill, chunk.length - off);
        chunk.copy(frame, fill, off, off + take);
        fill += take;
        off += take;
        if (fill === size) {
          try {
            onFrame(frame, from + n);
          } catch (e) {
            failed = e;
            p.kill();
            return;
          }
          n++;
          fill = 0;
        }
      }
    });
    p.on('error', reject);
    p.on('close', (code) => {
      if (failed) reject(failed);
      else if (code !== 0) reject(new Error(`ffmpeg failed decoding ${file} (exit ${code}): ${err.trim()}`));
      else resolve(n);
    });
  });
}

/** Copies of the frames `frames` (0-based, of the file) as RGB24 at width × height (the file's own size by default): Map frame → Buffer. */
export async function grabFrames(file, frames, { width, height } = {}) {
  const info = probe(file);
  const w = width ?? info.width;
  const h = height ?? info.height;
  const want = [...new Set(frames)].filter((f) => f >= 0 && f < info.frames).sort((a, b) => a - b);
  const out = new Map();
  // Runs of frames close together are decoded in one pass from one seek.
  for (let i = 0; i < want.length; ) {
    let j = i;
    while (j + 1 < want.length && want[j + 1] - want[j] <= 12) j++;
    const from = want[i];
    const keep = new Set(want.slice(i, j + 1));
    await eachFrame(file, { width: w, height: h, from, count: want[j] - from + 1, info, onFrame: (rgb, f) => keep.has(f) && out.set(f, Buffer.from(rgb)) });
    i = j + 1;
  }
  return { frames: out, width: w, height: h };
}

/** sRGB code value (0–255) → linear light (0–1). */
export const LINEAR = Float64Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** Rec. 709 luma (0–255, gamma-encoded) of every pixel of an RGB24 buffer. */
export function lumaOf(rgb, out = new Float32Array(rgb.length / 3)) {
  for (let p = 0, i = 0; p < out.length; p++, i += 3) out[p] = 0.2126 * rgb[i] + 0.7152 * rgb[i + 1] + 0.0722 * rgb[i + 2];
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------- audio

/** A soundtrack as { sampleRate, channels: [L, R] } (Float32Array): a 16-bit WAV, or the audio of a video file decoded to one. */
export function readSoundtrack(file) {
  if (/\.wav$/i.test(file)) return readWav(file);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-audio-'));
  try {
    const wav = path.join(dir, 'a.wav');
    execFileSync(ffmpegPath(), ['-v', 'error', '-y', '-i', file, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', '-f', 'wav', wav]);
    return readWav(wav);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------------- film map

/**
 * The film's map, for ranges, groups and labels. From src/score/film.ts (the parts: intro, swiss, riso, cosmos, club, break, drop2,
 * outro) when it exists, else from the section table (src/score/shots.ts SECTIONS) alone. Sections are always read from SECTIONS.
 */
export async function filmMap() {
  const FPB = 96;
  const BEAT = 24;
  let film = null;
  try {
    film = await import('../../src/score/film.ts');
  } catch (e) {
    if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  }
  const { SECTIONS } = await import('../../src/score/shots.ts');
  const sections = SECTIONS.map((s) => ({ id: s.id, from: (s.fromBar - 1) * FPB, to: s.toBar * FPB, composition: s.composition }));
  const parts = film ? film.FILM.map((p) => ({ id: p.id, from: film.partStart(p.id), to: film.partEnd(p.id) })) : sections.map(({ id, from, to }) => ({ id, from, to }));
  const total = film ? film.TOTAL_FRAMES : sections[sections.length - 1].to;
  const groupOf = (list, frame) => list.find((g) => frame >= g.from && frame < g.to) ?? (frame < 0 ? list[0] : list[list.length - 1]);
  /** "break 2.3" (part, its bar, the beat 1–4), "+6" frames past the beat when off it; the film bar first. */
  const label = (frame) => {
    const g = groupOf(parts, frame);
    const rel = frame - g.from;
    const bar = Math.floor(rel / FPB) + 1;
    const beat = Math.floor((rel - (bar - 1) * FPB) / BEAT) + 1;
    const off = rel - (bar - 1) * FPB - (beat - 1) * BEAT;
    return `${String(Math.floor(frame / FPB) + 1).padStart(2)} ${g.id} ${bar}.${beat}${off ? `+${off}` : ''}`;
  };
  /** Film frames [from, to) of a part or section id, "film", or film bars "A-B" (inclusive). */
  const range = (spec) => {
    if (spec === 'film') return { id: 'film', from: 0, to: total };
    const p = parts.find((x) => x.id === spec) ?? sections.find((x) => x.id === spec);
    if (p) return { id: p.id, from: p.from, to: p.to };
    const m = /^(\d+)(?:-(\d+))?$/.exec(spec);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2] ?? m[1]);
      return { id: `bars ${a}–${b}`, from: (a - 1) * FPB, to: b * FPB };
    }
    throw new Error(`"${spec}" is not a part (${parts.map((x) => x.id).join(', ')}), a section (${sections.map((x) => x.id).join(', ')}), "film" or bars A-B`);
  };
  /** A clip's first film frame: a number, or the first frame of a part or section. */
  const start = (spec) => (spec === undefined ? 0 : /^-?\d+$/.test(String(spec)) ? Number(spec) : range(String(spec)).from);
  /** The groups (`by` 'parts' or 'sections') overlapping [from, to), each clipped to it. */
  const groups = (from, to, by = 'parts') =>
    (by === 'sections' ? sections : parts).filter((g) => g.to > from && g.from < to).map((g) => ({ id: g.id, from: Math.max(g.from, from), to: Math.min(g.to, to) }));
  return { source: film ? 'src/score/film.ts' : 'src/score/shots.ts SECTIONS', parts, sections, total, label, range, start, groups, FPB, FPS: 60 };
}

// --------------------------------------------------------------------------------------------------------------------------- output

/** Rows of cells as a text table: columns padded to their widest cell, numbers (and cells starting with a digit or sign) right-aligned. */
export function table(head, rows) {
  const all = [head, ...rows].map((r) => r.map((c) => String(c ?? '')));
  const width = head.map((_, i) => Math.max(...all.map((r) => r[i]?.length ?? 0)));
  const right = head.map((_, i) => rows.length > 0 && rows.every((r) => /^[-+−]?[\d.]/.test(String(r[i] ?? '')) || r[i] === '—' || r[i] === ''));
  return all.map((r) => r.map((c, i) => (right[i] ? c.padStart(width[i]) : c.padEnd(width[i]))).join('  ').trimEnd()).join('\n');
}

/** Writes `data` as JSON to `file` (creating its folder) when `file` is given. */
export function writeJson(file, data) {
  if (!file) return;
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(path.resolve(file), JSON.stringify(data, null, 1));
}

/** "−1.23" with a real minus sign and `d` decimals; "—" for a missing or infinite value. */
export const num = (v, d = 2) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-/, '−'));
