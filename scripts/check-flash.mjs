// Photosensitivity check of a rendered cut: an approximation of the general-flash and red-flash tests of WCAG 2.2 (2.3.1) and
// the Harding / Ofcom guidance, run on screen blocks rather than on a certified flash analyser.
//   - The frame is decoded at 384 × 216 and split into blocks: the whole frame (grid 1), 3 × 3 blocks (each 1/9 of the screen,
//     about the 10° field WCAG measures at a normal viewing distance) and 6 × 6 blocks (1/36: a stricter, local check).
//   - Each block's mean *relative luminance* (linear light, Rec. 709 weights, 0–1) is followed frame by frame. A *transition* is a
//     swing of at least --delta (0.1) from the last extreme, the darker side below --dark (0.8); one flash = two opposing
//     transitions.
//   - Red flashes: each pixel's WCAG red value — (R − G − B) × 320 (sRGB 0–1, negatives 0) where R / (R + G + B) ≥ 0.8, else 0 —
//     averaged per block; a red transition is a swing of at least --red-delta (20).
//   - A window is any 1 s (fps frames); it fails when a block has more than --max-flashes (3) flashes in it, i.e. 2 × 3 + 2 = 8
//     transitions or more.
// Prints every failing span (merged windows) with the block, then each range's busiest 1 s window per grid. Exit code 1 if any fails.
//   node scripts/check-flash.mjs output/kaomoji-full-v04-1080p.mp4
//   node scripts/check-flash.mjs FILE.mp4 --start drop2 [--section drop2] [--grids 1,3,6] [--delta 0.1] [--max-flashes 3] [--no-red] [--json out.json]
import path from 'node:path';
import { parseArgs } from 'node:util';
import { LINEAR, cliArgs, eachFrame, filmMap, isMain, parseSize, probe, resolveInput, table, writeJson } from './lib/review.mjs';

/**
 * Transitions of a series (relative luminance or red value): [{ at, dir (+1 up, −1 down), from, to }], `at` the index where the swing
 * reaches `delta` from the last extreme. The darker side of a swing must be under `dark`. NaN entries are skipped.
 */
export function transitions(series, { delta = 0.1, dark = 0.8 } = {}) {
  const out = [];
  let dir = 0;
  let hi = NaN;
  let lo = NaN;
  let ext = NaN;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (!Number.isFinite(v)) continue;
    if (!Number.isFinite(hi)) {
      hi = lo = ext = v;
      continue;
    }
    if (dir === 0) {
      if (v > hi) hi = v;
      if (v < lo) lo = v;
      if (hi - v >= delta && v < dark) {
        out.push({ at: i, dir: -1, from: hi, to: v });
        dir = -1;
        ext = v;
      } else if (v - lo >= delta && lo < dark) {
        out.push({ at: i, dir: 1, from: lo, to: v });
        dir = 1;
        ext = v;
      }
    } else if (dir === 1) {
      if (v > ext) ext = v;
      else if (ext - v >= delta && v < dark) {
        out.push({ at: i, dir: -1, from: ext, to: v });
        dir = -1;
        ext = v;
      }
    } else if (v < ext) ext = v;
    else if (v - ext >= delta && ext < dark) {
      out.push({ at: i, dir: 1, from: ext, to: v });
      dir = 1;
      ext = v;
    }
  }
  return out;
}

/** For transition times `at` (sorted), every window of `span` frames that starts on a transition: [{ from, to (exclusive), count }]. */
export function windows(at, span) {
  const out = [];
  for (let s = 0, e = 0; s < at.length; s++) {
    if (e < s) e = s;
    while (e + 1 < at.length && at[e + 1] - at[s] < span) e++;
    out.push({ from: at[s], to: at[s] + span, count: e - s + 1 });
  }
  return out;
}

/** Windows with more than `maxFlashes` flashes (count ≥ 2 × maxFlashes + 2), merged where they overlap: [{ from, to, count (the most) }]. */
export function failingSpans(at, span, maxFlashes = 3) {
  const bad = windows(at, span).filter((w) => Math.floor(w.count / 2) > maxFlashes);
  const out = [];
  for (const w of bad) {
    const last = out[out.length - 1];
    if (last && w.from < last.to) {
      last.to = Math.max(last.to, w.to);
      last.count = Math.max(last.count, w.count);
    } else out.push({ ...w });
  }
  return out;
}

/** Per-pixel block index of a W × H frame cut into g × g blocks. */
const blockIndex = (W, H, g) => {
  const idx = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) idx[y * W + x] = Math.min(g - 1, Math.floor((y * g) / H)) * g + Math.min(g - 1, Math.floor((x * g) / W));
  return idx;
};

/** WCAG red value of an sRGB pixel (0–255 codes): (R − G − B) × 320 on the 0–1 scale where R / (R + G + B) ≥ 0.8, else 0. */
export const redValue = (r, g, b) => (r + g + b > 0 && r / (r + g + b) >= 0.8 ? Math.max(0, ((r - g - b) / 255) * 320) : 0);

/**
 * Block series of `file`: for each grid g, lum[g][block] and red[g][block], Float32Array per block indexed by clip frame (NaN where
 * not decoded).
 */
export async function blockSeries(file, { grids = [1, 3, 6], size = [384, 216], from = 0, count, red = true } = {}) {
  const info = probe(file);
  const [W, H] = size;
  const idx = grids.map((g) => blockIndex(W, H, g));
  const area = grids.map((g, k) => {
    const a = new Float64Array(g * g);
    for (const b of idx[k]) a[b]++;
    return a;
  });
  const mk = () => grids.map((g) => Array.from({ length: g * g }, () => new Float32Array(info.frames).fill(NaN)));
  const lum = mk();
  const reds = red ? mk() : null;
  const pxL = new Float64Array(W * H);
  const pxR = new Float64Array(W * H);
  await eachFrame(file, {
    width: W,
    height: H,
    from,
    count,
    info,
    onFrame: (rgb, f) => {
      for (let p = 0, i = 0; p < W * H; p++, i += 3) {
        pxL[p] = 0.2126 * LINEAR[rgb[i]] + 0.7152 * LINEAR[rgb[i + 1]] + 0.0722 * LINEAR[rgb[i + 2]];
        if (red) pxR[p] = redValue(rgb[i], rgb[i + 1], rgb[i + 2]);
      }
      grids.forEach((g, k) => {
        const sl = new Float64Array(g * g);
        const sr = new Float64Array(g * g);
        const ix = idx[k];
        for (let p = 0; p < W * H; p++) {
          sl[ix[p]] += pxL[p];
          if (red) sr[ix[p]] += pxR[p];
        }
        for (let b = 0; b < g * g; b++) {
          lum[k][b][f] = sl[b] / area[k][b];
          if (red) reds[k][b][f] = sr[b] / area[k][b];
        }
      });
    },
  });
  return { info, lum, red: reds };
}

async function main() {
  const { values, positionals } = parseArgs({
    args: cliArgs(),
    allowPositionals: true,
    allowNegative: true,
    options: {
      start: { type: 'string', default: '0' },
      section: { type: 'string', multiple: true },
      bars: { type: 'string' },
      by: { type: 'string', default: 'parts' },
      grids: { type: 'string', default: '1,3,6' },
      delta: { type: 'string', default: '0.1' },
      dark: { type: 'string', default: '0.8' },
      'max-flashes': { type: 'string', default: '3' },
      red: { type: 'boolean', default: true },
      'red-delta': { type: 'string', default: '20' },
      size: { type: 'string', default: '384x216' },
      json: { type: 'string' },
    },
  });
  if (positionals.length !== 1) throw new Error('usage: check-flash.mjs FILE.mp4 [--start FRAME|PART] [--section ID]… [--bars A-B] [--grids 1,3,6] [--delta 0.1] [--dark 0.8] [--max-flashes 3] [--no-red] [--red-delta 20] [--json FILE]');
  const file = resolveInput(positionals[0]);
  const map = await filmMap();
  const info = probe(file);
  const start = map.start(values.start);
  const clip = { from: start, to: start + info.frames };
  const ranges = [...(values.section ?? []).map(map.range), ...(values.bars ? [map.range(values.bars)] : [])];
  const checked = ranges.length ? ranges.map((r) => ({ ...r, from: Math.max(r.from, clip.from), to: Math.min(r.to, clip.to) })).filter((r) => r.to > r.from) : [{ id: 'clip', ...clip }];
  if (!checked.length) throw new Error(`the ranges asked for lie outside the clip (film frames ${clip.from}–${clip.to - 1})`);
  const grids = values.grids.split(',').map(Number);
  const delta = Number(values.delta);
  const dark = Number(values.dark);
  const maxFlashes = Number(values['max-flashes']);
  const redDelta = Number(values['red-delta']);
  const span = Math.round(info.fps);

  // Decode the union of the checked ranges, plus a second before (a swing is measured from the last extreme).
  const lo = Math.max(clip.from, Math.min(...checked.map((r) => r.from)) - span);
  const hi = Math.min(clip.to, Math.max(...checked.map((r) => r.to)));
  const { lum, red } = await blockSeries(file, { grids, size: parseSize(values.size), from: lo - start, count: hi - lo, red: values.red });

  // Transitions by block, in film frames, kept where they fall inside a checked range.
  const inChecked = (f) => checked.some((r) => f >= r.from && f < r.to);
  const kinds = [['luminance', lum, { delta, dark }], ...(values.red ? [['red', red, { delta: redDelta, dark: Infinity }]] : [])];
  /** tr[kind][gridIndex][block] = film frames of the transitions. */
  const tr = {};
  for (const [kind, series, o] of kinds) tr[kind] = series.map((blocks) => blocks.map((s) => transitions(s, o).map((t) => t.at + start).filter(inChecked)));
  const name = (g, b) => (g === 1 ? 'frame' : `${g}×${g} r${Math.floor(b / g)}c${b % g}`);

  // Failing spans, merged across the blocks of one grid.
  const fails = [];
  for (const [kind] of kinds) {
    grids.forEach((g, k) => {
      const spans = tr[kind][k].flatMap((at, b) => failingSpans(at, span, maxFlashes).map((s) => ({ ...s, block: b })));
      spans.sort((a, b) => a.from - b.from);
      const merged = [];
      for (const s of spans) {
        const last = merged[merged.length - 1];
        if (last && s.from < last.to) {
          last.to = Math.max(last.to, s.to);
          if (s.count > last.count) Object.assign(last, { count: s.count, block: s.block });
          last.blocks.add(s.block);
        } else merged.push({ ...s, blocks: new Set([s.block]) });
      }
      for (const s of merged) fails.push({ kind, grid: g, from: s.from, to: s.to - 1, count: s.count, flashes: Math.floor(s.count / 2), worst: name(g, s.block), blocks: s.blocks.size });
    });
  }
  fails.sort((a, b) => a.from - b.from || a.grid - b.grid);

  console.log(`${path.basename(file)}: ${info.frames} frames from film frame ${start}; blocks of grids ${grids.join(', ')} at ${values.size}; a transition is a swing ≥ ${delta} in relative luminance (darker side < ${dark})${values.red ? ` or ≥ ${redDelta} in red value` : ''}; fails above ${maxFlashes} flashes in any ${span} frames; map: ${map.source}`);
  if (fails.length) {
    console.log('\nwindows over the limit:');
    console.log(
      table(
        ['frames', 'from', 'test', 'grid', 'worst block', 'blocks', 'transitions', 'flashes/s'],
        fails.map((x) => [`${x.from}–${x.to}`, map.label(x.from), x.kind, x.grid === 1 ? 'frame' : `${x.grid}×${x.grid}`, x.worst, x.blocks, x.count, x.flashes]),
      ),
    );
  } else console.log('\nno window over the limit');

  // The busiest 1 s window of each range, per grid and test.
  const rows = [];
  const summary = [];
  for (const r of checked) {
    for (const gr of map.groups(r.from, r.to, values.by)) {
      const row = [gr.id, `${gr.from}–${gr.to - 1}`];
      const entry = { id: gr.id, from: gr.from, to: gr.to, worst: {} };
      for (const [kind] of kinds) {
        grids.forEach((g, k) => {
          let best = { count: 0, from: null, block: null };
          tr[kind][k].forEach((at, b) => {
            for (const w of windows(at.filter((f) => f >= gr.from && f < gr.to), span)) if (w.count > best.count) best = { count: w.count, from: w.from, block: b };
          });
          const flashes = Math.floor(best.count / 2);
          entry.worst[`${kind}-${g}`] = { ...best, flashes, block: best.block === null ? null : name(g, best.block) };
          row.push(best.count ? `${flashes} (${best.count}t @${best.from})${flashes > maxFlashes ? ' FAIL' : ''}` : '0');
        });
      }
      summary.push(entry);
      rows.push(row);
    }
  }
  const head = ['range', 'frames', ...kinds.flatMap(([kind]) => grids.map((g) => `${kind === 'red' ? 'red ' : ''}${g === 1 ? 'frame' : `${g}×${g}`}`))];
  console.log(`\nmost flashes in any 1 s window (flashes, transitions and where the window starts):\n${table(head, rows)}`);
  writeJson(values.json, { file, start, frames: info.frames, options: { grids, delta, dark, maxFlashes, red: values.red, redDelta, window: span, size: values.size }, failures: fails, summary });
  if (fails.length) {
    console.error(`\nflash check FAILED: ${fails.length} span(s) over ${maxFlashes} flashes a second`);
    process.exit(1);
  }
  console.log(`\nflash check OK (≤ ${maxFlashes} flashes a second in every block)`);
}

if (isMain(import.meta.url)) await main();
