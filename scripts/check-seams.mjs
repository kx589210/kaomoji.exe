// Seams of the film: for each seam frame f, frames f − 1 and f, decoded from a rendered cut or rendered fresh, and
//   change   the mean |Δ| of 8 × 8 block averages over R, G and B (0–255): how much the picture as a whole jumps;
//   overlap  of the bright strokes (luma ≥ --floor, 170): pixels bright in both frames over pixels bright in either — the face,
//            outlines and cracks that a hand-off or a match cut must keep in place ("—" when neither frame has any);
//   motion   (from a cut, or with --context) the median change of the frame pairs around the seam (f − 3 … f + 3), and
//   jump     the change over that motion: near 1 when the seam moves no more than the shot around it.
// A judged seam passes when change ≤ --max-change (3), or overlap ≥ --min-overlap (0.5), or jump ≤ --max-jump (1.5).
// Which seams (--seams):
//   parts (default)  the part boundaries of the film map (src/score/film.ts): where one section hands over to the next; all judged.
//   shots            every shot boundary of the shot table (src/score/shots.ts), judged where the outgoing shot claims picture
//                    continuity (exit continuous or match) and only reported elsewhere (cuts, whips, punches, the stutter and the
//                    section transitions T1–T7, which may flash or wipe on purpose).
//   F[:cut],…        film frames; ":cut" = report only.
// Each seam also gets a sheet, f − 1 | f | bright strokes (white both, red f − 1 only, green f only), in --save
// (output/qa/check-seams/<name>). Exit code 1 if a judged seam fails.
// From a cut, two more reports (the continuity plan v07, FW5; off with --no-anchors / --no-dead):
//   anchor   what holds its place across the line (FW5: the hero's face or • eye-dot, the red Defender circle, the amber byte): over f − 12 …
//            f + 12 (at 480 × 270) the centroid of each colour class — the hero's amber (hue 25–50°, saturated, bright) and the Defender's
//            red (hue ≥ 350° or ≤ 10°) — and the longest run of frames holding f − 1 and f in which it stays within --anchor-tol (40) px of
//            its place on f − 1 (a class counts on a frame where it covers at least 0.2 % of it). The best class and its hold are reported;
//            FW5 asks for --anchor-min (12) frames. Colour only: a hero drawn in another world's colours, or a face that is not amber,
//            reads "—" — look at the sheet.
//   dead     dead picture under live music: runs of --dead-frames (12) frames or more whose picture change (check-sync's: mean |Δ luma| at
//            384 × 216) is ≤ --dead-change (2) while the mix (100 ms RMS round the frame; the cut's own soundtrack or --audio WAV, read from
//            film frame 0) is above --dead-db (−30 dBFS), outside --dead-allow (GLASS_HELD: the glass's held hit, 2677-2711 on the 61-bar map,
//            2773-2807 on the 63-bar one). Over the whole clip.
// Both are reported; with --strict a short anchor on a judged seam or a dead run also fails the check.
// --seams plan: the continuity plan's seams (scripts/check-seam-audio.mjs PLAN_SEAMS; TOTAL_FRAMES is the loop, read as frame 0's left side).
//   node scripts/check-seams.mjs output/kaomoji-full-v04-1080p.mp4 [--seams shots]          # decode the seams from a cut
//   node scripts/check-seams.mjs output/kaomoji-full-v06-proposed-1x.mp4 --seams plan --size 960x540 [--strict]
//   node scripts/check-seams.mjs output/break-wip-v04-1x.mp4 --start break --seams 2112,2208
//   node scripts/check-seams.mjs --render --seams 1920,2496 [--scale 1] [--draft] [--no-energy] [--context]
//     (renders f − 1 and f from the section compositions at final quality, camera energy on as in the film)
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { PLAN_SEAMS } from './check-seam-audio.mjs';
import { changeSeries } from './check-sync.mjs';
import { decodePng, drawLabel, encodePng, resize } from './lib/png.mjs';
import { KX } from './lib/remotion.mjs';
import { cliArgs, filmMap, grabFrames, isMain, num, parseSize, probe, readSoundtrack, resolveInput, table, writeJson } from './lib/review.mjs';
import { fromV07 } from '../src/score/film.ts';

/** The glass's held hit (the club's hit → the shatter's ring), where a still picture under loud music is designed: 2677–2711 on the 61-bar map, moved with the club. */
export const GLASS_HELD = [fromV07(2677), fromV07(2711)];

/** An image { width, height, channels, data }; RGB24 buffers from the decoder are wrapped with channels 3. */
const img = (data, width, height, channels = 3) => ({ width, height, channels, data });

/** Mean |Δ| of k × k block averages, over R, G and B (0–255). */
export function blockChange(a, b, k = 8) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('frames differ in size');
  let s = 0;
  let n = 0;
  for (let by = 0; by + k <= a.height; by += k) {
    for (let bx = 0; bx + k <= a.width; bx += k) {
      for (let c = 0; c < 3; c++) {
        let d = 0;
        for (let y = by; y < by + k; y++) for (let x = bx; x < bx + k; x++) d += a.data[(y * a.width + x) * a.channels + c] - b.data[(y * b.width + x) * b.channels + c];
        s += Math.abs(d) / (k * k);
        n++;
      }
    }
  }
  return s / n;
}

const lumaAt = (im, p) => 0.2126 * im.data[p * im.channels] + 0.7152 * im.data[p * im.channels + 1] + 0.0722 * im.data[p * im.channels + 2];

/** Pixels at least `floor` bright (Rec. 709 luma) in both frames over those bright in either; NaN when fewer than `min` of the pixels are bright in either. */
export function brightOverlap(a, b, { floor = 170, min = 0.001 } = {}) {
  let both = 0;
  let either = 0;
  const n = a.width * a.height;
  for (let p = 0; p < n; p++) {
    const la = lumaAt(a, p) >= floor;
    const lb = lumaAt(b, p) >= floor;
    if (la && lb) both++;
    if (la || lb) either++;
  }
  return either < min * n ? NaN : both / either;
}

/** A seam's verdict from its measures: which test passed ('change', 'overlap', 'jump'), or 'FAIL'; 'cut' seams are only reported. */
export function judgeSeam({ change, overlap, jump }, { kind = 'judged', maxChange = 3, minOverlap = 0.5, maxJump = 1.5 } = {}) {
  if (kind === 'cut') return 'cut';
  if (change <= maxChange) return 'change';
  if (Number.isFinite(overlap) && overlap >= minOverlap) return 'overlap';
  if (Number.isFinite(jump) && jump <= maxJump) return 'jump';
  return 'FAIL';
}

/** The sheet of a seam: f − 1 | f | bright strokes, each `w` wide, with the seam frame written under it. */
function sheet(a, b, f, { floor, w = 640 }) {
  const h = Math.round((w * a.height) / a.width);
  const A = resize(a, w, h);
  const B = resize(b, w, h);
  const ov = img(new Uint8Array(w * h * 3), w, h);
  for (let p = 0; p < w * h; p++) {
    const la = lumaAt(A, p) >= floor;
    const lb = lumaAt(B, p) >= floor;
    const c = la && lb ? [255, 255, 255] : la ? [230, 40, 40] : lb ? [40, 220, 90] : [24, 24, 24];
    ov.data.set(c, p * 3);
  }
  const gap = 8;
  const H = h + 34;
  const out = img(new Uint8Array((3 * w + 2 * gap) * H * 3).fill(12), 3 * w + 2 * gap, H);
  [A, B, ov].forEach((im, k) => {
    for (let y = 0; y < h; y++) out.data.set(im.data.subarray(y * w * 3, (y + 1) * w * 3), (y * out.width + k * (w + gap)) * 3);
  });
  drawLabel(out, 8, h + 8, String(f - 1), 4, [200, 200, 200]);
  drawLabel(out, w + gap + 8, h + 8, String(f), 4, [255, 255, 255]);
  return encodePng(out);
}

// ——— Anchors (FW5) ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Hue (degrees), saturation and value (0–1) of an RGB colour (0–255). */
export function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [(h + 360) % 360, max ? d / max : 0, max / 255];
}

/** The colour classes an anchor can be (FW5, the colour law): the hero's amber and the Defender's red. */
export const ANCHOR_CLASSES = {
  amber: (h, s, v) => h >= 25 && h <= 50 && s >= 0.55 && v >= 0.55,
  red: (h, s, v) => (h <= 10 || h >= 350) && s >= 0.6 && v >= 0.45,
};

/** Each class's share of the frame and its centroid in layout px (an RGB24 frame of w × h shown at `fullW` px wide): { amber: { share, x, y }, … }. */
export function classCentroids(rgb, w, h, fullW = 1920) {
  const k = fullW / w;
  const acc = Object.fromEntries(Object.keys(ANCHOR_CLASSES).map((c) => [c, { n: 0, x: 0, y: 0 }]));
  const tests = Object.entries(ANCHOR_CLASSES);
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 3) {
      const [hh, s, v] = hsv(rgb[i], rgb[i + 1], rgb[i + 2]);
      for (const [c, t] of tests) {
        if (t(hh, s, v)) {
          acc[c].n++;
          acc[c].x += x;
          acc[c].y += y;
        }
      }
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([c, a]) => [c, { share: a.n / (w * h), x: a.n ? ((a.x / a.n) + 0.5) * k : NaN, y: a.n ? ((a.y / a.n) + 0.5) * k : NaN }]));
}

/**
 * How long one class holds its place across a seam: `track` is its { share, x, y } on consecutive frames, `at` the index of the seam frame f
 * (at − 1 is f − 1). The run must hold f − 1 and f; it grows each way while the class is there (share ≥ minShare) within `tol` px of its
 * place on f − 1. { hold (frames; 0 when it is not there on both sides of the line or jumps there), from, to (indices), jump (px, f − 1 → f) }.
 */
export function anchorHold(track, at, { tol = 40, minShare = 0.002 } = {}) {
  const here = (p) => p && p.share >= minShare && Number.isFinite(p.x);
  const a = track[at - 1];
  const b = track[at];
  if (!here(a) || !here(b)) return { hold: 0, from: NaN, to: NaN, jump: NaN };
  const near = (p) => here(p) && Math.hypot(p.x - a.x, p.y - a.y) <= tol;
  const jump = Math.hypot(b.x - a.x, b.y - a.y);
  if (!near(b)) return { hold: 0, from: NaN, to: NaN, jump };
  let from = at - 1;
  let to = at;
  while (from - 1 >= 0 && near(track[from - 1])) from--;
  while (to + 1 < track.length && near(track[to + 1])) to++;
  return { hold: to - from + 1, from, to, jump };
}

/**
 * The best anchor of a seam from each class's track: the class holding longest (ties: the bigger share on f). When none holds, the class
 * that covers most of f − 1 (its hold 0, its jump in px, or NaN when it is gone on f); { cls: '—' } when no class is there on f − 1.
 */
export function bestAnchor(tracks, at, opts = {}) {
  const minShare = opts.minShare ?? 0.002;
  let best = null;
  let bestShare = -1;
  for (const [cls, track] of Object.entries(tracks)) {
    const r = anchorHold(track, at, opts);
    const share = track[at]?.share ?? 0;
    if (r.hold > 0 && (!best || r.hold > best.hold || (r.hold === best.hold && share > bestShare))) {
      best = { cls, ...r };
      bestShare = share;
    }
  }
  if (best) return best;
  let lead = null;
  for (const [cls, track] of Object.entries(tracks)) {
    const p = track[at - 1];
    if (p && p.share >= minShare && (!lead || p.share > lead.share)) lead = { cls, share: p.share };
  }
  return lead ? { cls: lead.cls, ...anchorHold(tracks[lead.cls], at, opts) } : { cls: '—', hold: 0, jump: NaN, from: NaN, to: NaN };
}

// ——— Dead picture under live music ——————————————————————————————————————————————————————————————————————————————————————————————

/** The mix's level (dBFS) round each film frame [0, frames): 100 ms RMS of both channels centred on the frame's own samples. */
export function frameLevels(L, R, sr, frames, fps = 60) {
  const spf = sr / fps;
  const half = Math.round(0.05 * sr);
  const out = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    const c = Math.round((f + 0.5) * spf);
    let s = 0;
    let n = 0;
    for (let i = Math.max(0, c - half); i < Math.min(L.length, c + half); i++) {
      s += 0.5 * (L[i] * L[i] + R[i] * R[i]);
      n++;
    }
    out[f] = n && s > 0 ? 10 * Math.log10(s / n) : -Infinity;
  }
  return out;
}

/**
 * Runs of dead picture under live music: `change[i]` (picture change of clip frame i; NaN where unknown) and `level[i]` (the mix, dBFS) for
 * the clip's frames, film frame = start + i. A frame is dead when its change is ≤ maxChange and the mix is above minDb; frames in `allow`
 * ([from, to] film frames, inclusive) never count. Runs of minFrames or more: [{ from, to (film frames, inclusive), frames, meanChange }].
 */
export function deadRuns(change, level, { start = 0, maxChange = 2, minDb = -30, minFrames = 12, allow = [GLASS_HELD] } = {}) {
  const runs = [];
  let run = null;
  const close = () => {
    if (run && run.frames >= minFrames) runs.push({ ...run, meanChange: run.sum / run.frames });
    run = null;
  };
  for (let i = 0; i < change.length; i++) {
    const f = start + i;
    const dead = Number.isFinite(change[i]) && change[i] <= maxChange && level[i] > minDb && !allow.some(([a, b]) => f >= a && f <= b);
    if (!dead) {
      close();
      continue;
    }
    if (!run) run = { from: f, to: f, frames: 0, sum: 0 };
    run.to = f;
    run.frames++;
    run.sum += change[i];
  }
  close();
  return runs.map((r) => ({ from: r.from, to: r.to, frames: r.frames, meanChange: r.meanChange }));
}

/** "2677-2711,3000-3010" → [[2677, 2711], [3000, 3010]]. */
const parseRanges = (s) => (s ? String(s).split(',').map((r) => r.split('-').map(Number)) : []);

/** The part boundaries of the film map (all judged), or every shot boundary with the outgoing shot's exit (judged where it claims continuity). */
async function defaultSeams(map, which) {
  if (which === 'plan') {
    return PLAN_SEAMS.map((f) => {
      const k = map.parts.findIndex((p) => p.from === f);
      const part = map.parts.find((p) => f >= p.from && f < p.to);
      const local = part ? (f - part.from) / map.FPB : 0;
      const what = f >= map.total ? `${map.parts[map.parts.length - 1].id} → ${map.parts[0].id} (the loop)` : k > 0 ? `${map.parts[k - 1].id} → ${part.id}` : `${part.id} ${local} → ${local + 1}`;
      return { frame: f, kind: 'judged', what };
    });
  }
  if (which === 'parts') return map.parts.slice(1).map((p, i) => ({ frame: p.from, kind: 'judged', what: `${map.parts[i].id} → ${p.id}` }));
  const { SHOTS, shotFrames } = await import('../src/score/shots.ts');
  const CONTINUOUS = new Set(['continuous', 'match']);
  return SHOTS.slice(1).map((s, i) => ({ frame: shotFrames(s).from, kind: CONTINUOUS.has(SHOTS[i].exit) ? 'judged' : 'cut', what: `${SHOTS[i].id} → ${s.id} (${SHOTS[i].exit})` }));
}

/** Renders film frames from the section compositions that hold them: Map film frame → image. */
async function renderFilmFrames(frames, map, dir, { scale, quality, energy }) {
  const { renderStillsTo } = await import('./lib/remotion.mjs');
  const out = new Map();
  for (const s of map.sections) {
    const mine = frames.filter((f) => f >= s.from && f < s.to);
    if (!mine.length) continue;
    const files = await renderStillsTo(path.join(dir, s.composition), { comp: s.composition, frames: mine.map((f) => f - s.from), scale, inputProps: { quality, energy } });
    for (const f of mine) out.set(f, decodePng(fs.readFileSync(files.get(f - s.from))));
  }
  return out;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: cliArgs(),
    allowPositionals: true,
    allowNegative: true,
    options: {
      render: { type: 'boolean', default: false },
      start: { type: 'string', default: '0' },
      seams: { type: 'string', default: 'parts' },
      context: { type: 'boolean' },
      'max-change': { type: 'string', default: '3' },
      'min-overlap': { type: 'string', default: '0.5' },
      'max-jump': { type: 'string', default: '1.5' },
      floor: { type: 'string', default: '170' },
      size: { type: 'string' },
      scale: { type: 'string', default: '1' },
      draft: { type: 'boolean', default: false },
      energy: { type: 'boolean', default: true },
      save: { type: 'string' },
      sheets: { type: 'boolean', default: true },
      json: { type: 'string' },
      anchors: { type: 'boolean', default: true },
      'anchor-tol': { type: 'string', default: '40' },
      'anchor-min': { type: 'string', default: '12' },
      dead: { type: 'boolean', default: true },
      audio: { type: 'string' },
      'dead-change': { type: 'string', default: '2' },
      'dead-db': { type: 'string', default: '-30' },
      'dead-frames': { type: 'string', default: '12' },
      'dead-allow': { type: 'string', default: GLASS_HELD.join('-') },
      strict: { type: 'boolean', default: false },
    },
  });
  if (values.render ? positionals.length !== 0 : positionals.length !== 1) {
    throw new Error(
      `usage: check-seams.mjs FILE.mp4 [--start FRAME|PART] [--seams plan|shots|parts|F[:cut],…] [--size WxH] [--no-anchors] [--no-dead] [--audio WAV] [--strict] … | check-seams.mjs --render [--seams …] [--scale 1] [--draft] [--no-energy] [--context]; thresholds --max-change 3 --min-overlap 0.5 --max-jump 1.5 --floor 170, --anchor-tol 40 --anchor-min 12, --dead-change 2 --dead-db -30 --dead-frames 12 --dead-allow ${GLASS_HELD.join('-')}; --save DIR --json FILE`,
    );
  }
  const map = await filmMap();
  const seams = /^(shots|parts|plan)$/.test(values.seams)
    ? await defaultSeams(map, values.seams)
    : values.seams.split(',').map((s) => {
        const [f, kind] = s.trim().split(':');
        return { frame: Number(f), kind: kind === 'cut' ? 'cut' : 'judged', what: kind === 'cut' ? 'listed, cut' : 'listed' };
      });
  const name = values.render ? `render-${values.draft ? 'draft' : 'final'}` : path.basename(positionals[0], path.extname(positionals[0]));
  const save = path.resolve(values.save ?? path.join(KX, 'output', 'qa', 'check-seams', name));
  if (values.sheets) fs.mkdirSync(save, { recursive: true });
  const context = values.context ?? !values.render;
  const around = (f) => (context ? [-4, -3, -2, -1, 0, 1, 2, 3].map((d) => f + d) : [f - 1, f]);
  /** Anchors are measured at 480 × 270 over f − 12 … f + 12. */
  const AW = 480;
  const AH = 270;
  const REACH = 12;

  // Frames: decoded from the cut, or rendered. A whole film reads the loop seam (its length) as its last frame → its first.
  let get;
  let header;
  let file = null;
  let start = 0;
  let wrap = (f) => f;
  if (values.render) {
    const want = [...new Set(seams.flatMap((s) => around(s.frame)))].filter((f) => f >= 0 && f < map.total).sort((a, b) => a - b);
    const quality = values.draft ? 'draft' : 'final';
    const frames = await renderFilmFrames(want, map, path.join(save, 'frames'), { scale: Number(values.scale), quality, energy: values.energy });
    get = (f) => frames.get(f);
    header = `seams rendered from the section compositions (${quality}, scale ${values.scale}, camera energy ${values.energy ? 'on' : 'off'})`;
  } else {
    file = resolveInput(positionals[0]);
    const info = probe(file);
    start = map.start(values.start);
    if (start === 0 && info.frames >= map.total) wrap = (f) => (f >= map.total ? f - map.total : f);
    const [w, h] = values.size ? parseSize(values.size) : [Math.min(info.width, 1920), Math.round((Math.min(info.width, 1920) * info.height) / info.width)];
    const clipFrames = seams.flatMap((s) => around(s.frame)).map((f) => wrap(f) - start);
    const { frames } = await grabFrames(file, clipFrames, { width: w, height: h });
    get = (f) => (frames.has(wrap(f) - start) ? img(frames.get(wrap(f) - start), w, h) : undefined);
    header = `seams of ${path.basename(file)} (${info.frames} frames from film frame ${start}), decoded at ${w}×${h}`;
  }

  // Anchors (FW5): each colour class's centroid over f − 12 … f + 12, from the cut.
  const anchorOpts = { tol: Number(values['anchor-tol']) };
  const anchorMin = Number(values['anchor-min']);
  const anchorOf = new Map();
  if (file && values.anchors) {
    const want = seams.flatMap((s) => Array.from({ length: 2 * REACH + 1 }, (_, k) => wrap(s.frame - REACH + k) - start));
    const { frames } = await grabFrames(file, want, { width: AW, height: AH });
    for (const s of seams) {
      const cents = Array.from({ length: 2 * REACH + 1 }, (_, k) => {
        const rgb = frames.get(wrap(s.frame - REACH + k) - start);
        return rgb ? classCentroids(rgb, AW, AH) : null;
      });
      const tracks = Object.fromEntries(Object.keys(ANCHOR_CLASSES).map((c) => [c, cents.map((x) => x?.[c] ?? null)]));
      anchorOf.set(s.frame, bestAnchor(tracks, REACH, anchorOpts));
    }
  }

  const opts = { maxChange: Number(values['max-change']), minOverlap: Number(values['min-overlap']), maxJump: Number(values['max-jump']) };
  const floor = Number(values.floor);
  const results = [];
  for (const s of seams) {
    const anchor = anchorOf.get(s.frame);
    const a = get(s.frame - 1);
    const b = get(s.frame);
    if (!a || !b) {
      results.push({ ...s, anchor, verdict: 'missing' });
      continue;
    }
    const change = blockChange(a, b);
    const overlap = brightOverlap(a, b, { floor });
    let jump = NaN;
    let motion = NaN;
    if (context) {
      const ctx = [-3, -2, -1, 1, 2, 3].map((d) => [get(s.frame + d - 1), get(s.frame + d)]).filter(([x, y]) => x && y).map(([x, y]) => blockChange(x, y));
      if (ctx.length) {
        motion = ctx.sort((x, y) => x - y)[Math.floor(ctx.length / 2)];
        jump = change / Math.max(motion, 0.25);
      }
    }
    const verdict = judgeSeam({ change, overlap, jump }, { kind: s.kind, ...opts });
    if (values.sheets) fs.writeFileSync(path.join(save, `seam-${s.frame}.png`), sheet(a, b, s.frame, { floor }));
    results.push({ ...s, change, overlap, motion, jump, anchor, verdict });
  }

  // Dead picture under live music, over the whole clip.
  let dead = null;
  let deadNote = '';
  if (file && values.dead) {
    let sound = null;
    try {
      sound = readSoundtrack(values.audio ? resolveInput(values.audio) : file);
    } catch (e) {
      deadNote = `no soundtrack: ${String(e.message).split('\n')[0].slice(0, 100)}`;
    }
    if (sound) {
      const change = await changeSeries(file);
      // The clip's own soundtrack starts with the clip; a --audio WAV is the film's, from film frame 0.
      const offset = values.audio ? start : 0;
      const level = frameLevels(sound.channels[0], sound.channels[1], sound.sampleRate, change.length + offset).subarray(offset);
      dead = deadRuns(change, level, { start, maxChange: Number(values['dead-change']), minDb: Number(values['dead-db']), minFrames: Number(values['dead-frames']), allow: parseRanges(values['dead-allow']) });
    }
  }

  const anchorCell = (x) => (!x ? '—' : x.hold ? `${x.cls} ${x.hold} f` : x.cls === '—' ? 'none' : `${x.cls} 0 f (${Number.isFinite(x.jump) ? `jump ${num(x.jump, 0)} px` : 'gone'})`);
  console.log(`${header}; map: ${map.source}${values.sheets ? `; sheets in ${save}` : '; no sheets'}`);
  console.log(
    '\n' +
      table(
        ['seam', 'bar  part bar.beat', 'hand-over', 'change', 'overlap', 'motion', 'jump', 'anchor (hold)', 'verdict'],
        results.map((r) => [
          r.frame,
          map.label(wrap(r.frame)),
          r.what,
          num(r.change),
          num(r.overlap),
          num(r.motion),
          num(r.jump),
          anchorCell(r.anchor),
          r.verdict === 'cut' ? 'cut (reported)' : r.verdict === 'FAIL' || r.verdict === 'missing' ? r.verdict : `ok (${r.verdict})`,
        ]),
      ),
  );
  if (dead) {
    console.log(`\ndead picture under live music (change ≤ ${values['dead-change']} for ${values['dead-frames']}+ frames while the mix is over ${values['dead-db']} dBFS; allowed ${values['dead-allow'] || 'none'}): ${dead.length ? `${dead.length} runs` : 'none'}`);
    if (dead.length) console.log(table(['from', 'to', 'frames', 'bar  part bar.beat', 'mean change'], dead.map((d) => [d.from, d.to, d.frames, map.label(d.from), num(d.meanChange)])));
  } else if (file && values.dead) console.log(`\ndead picture under live music: not checked (${deadNote})`);
  const failures = results.filter((r) => r.verdict === 'FAIL' || r.verdict === 'missing');
  const shortAnchors = results.filter((r) => r.kind !== 'cut' && r.anchor && r.anchor.hold < anchorMin);
  writeJson(values.json, { source: header, options: { ...opts, floor, context, anchorTol: anchorOpts.tol, anchorMin }, seams: results, failures: failures.map((r) => r.frame), shortAnchors: shortAnchors.map((r) => r.frame), dead });
  const extra = [];
  if (anchorOf.size) extra.push(`anchors under ${anchorMin} frames at ${shortAnchors.length} of ${results.filter((r) => r.kind !== 'cut').length} judged seams${shortAnchors.length ? ` (${shortAnchors.map((r) => r.frame).join(', ')})` : ''}`);
  if (dead) extra.push(`${dead.length} dead runs under live music`);
  if (extra.length) console.log(`\n${extra.join('; ')}${values.strict ? ' (strict: these fail)' : ' (reported; --strict fails on them)'}`);
  if (failures.length) {
    console.error(`\nseam check FAILED at ${failures.map((r) => `${r.frame} (${r.verdict === 'missing' ? 'frames missing' : r.what})`).join(', ')} (pass: change ≤ ${opts.maxChange}, overlap ≥ ${opts.minOverlap}${context ? ` or jump ≤ ${opts.maxJump}` : ''})`);
    process.exit(1);
  }
  if (values.strict && (shortAnchors.length || dead?.length)) {
    console.error('\nseam check FAILED (strict): short anchors or dead picture under live music');
    process.exit(1);
  }
  console.log(`\nseam check OK (${results.filter((r) => r.verdict !== 'cut').length} judged, ${results.filter((r) => r.verdict === 'cut').length} cuts reported)`);
}

if (isMain(import.meta.url)) await main();
