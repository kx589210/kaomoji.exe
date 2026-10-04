// Picture-to-drum sync of a rendered cut: for every drum event of the score (kick, clap, snare, ghost kick, heartbeat), does the
// picture change most on that frame? The picture change of frame f is the mean |Δ luma| (Rec. 709, 0–255) between frames f − 1
// and f at 384 × 216 (area-averaged), over the whole frame or its centre half. An *accent* is a frame whose change is a local
// maximum and at least --accent (1.35) times the base, the median change of f − 14 … f − 4 (the motion before the drum; at least
// 0.05). Each event is
//   hit    the drum frame is an accent, or carries at least 0.8 of the largest change within ±--window (4) frames;
//   close  the accent is one frame off (f ± 1: a launch whose first full step lands on f + 1, or an anticipation on f − 1);
//   miss   the nearest accent within ±--window is 2 or more frames off;
//   none   nothing in ±--window stands out from the base.
// A range fails when its on-beat share ((hit + close) / events) is under --min-on-beat (0.8; the approved bars 1–20 of v04 score
// 0.80–1.00), or it has more than --max-miss misses (no limit by default). Exit code 1 if any range fails.
//
// The drum events come from the soundtrack's own event list (scripts/audio/bgm.mjs renderStems, ~7 s), filtered by --kinds, so
// every section the audio scripts build is covered; or from --events FILE.json ([{ frame, kind }], film frames). Inside Drop 1's
// stutter the audio events are in content time.
//   node scripts/check-sync.mjs output/kaomoji-full-v04-1080p.mp4                       # the film, grouped by part
//   node scripts/check-sync.mjs output/break-wip-v04-1x.mp4 --start break               # a section render (clip starts at break 1.1)
//   node scripts/check-sync.mjs FILE.mp4 --section drop2 [--section club] [--bars 27-30] [--region centre] [--json out.json]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { cliArgs, eachFrame, filmMap, isMain, lumaOf, num, parseSize, probe, resolveInput, table, writeJson } from './lib/review.mjs';

/** Kinds of the soundtrack's events that count as drums: kicks, claps, snares, ghost kicks, the heartbeat; not reversed sounds. */
export const DRUM_KINDS = '^(?!.*rev)[a-z0-9]*(kick|clap|snare|ghost|heart)$';

const median = (xs) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/**
 * The verdict of the drum event on frame `f`, given `m` (m[g] = picture change of frame g; NaN or missing where unknown).
 * Returns { verdict: 'hit' | 'close' | 'miss' | 'none' | 'edge', offset (frames from f to the accent taken), base, at (m[f]), peak, peakAt }.
 */
export function judgeEvent(m, f, { window = 4, accent = 1.35, floor = 0.05, strong = 0.8 } = {}) {
  const val = (g) => (g >= 0 && g < m.length && Number.isFinite(m[g]) ? m[g] : NaN);
  if (!Number.isFinite(val(f)) || !Number.isFinite(val(f - 1)) || !Number.isFinite(val(f + 1))) return { verdict: 'edge', offset: null, base: NaN, at: val(f), peak: NaN, peakAt: null };
  const pre = [];
  for (let g = f - 14; g <= f - 4; g++) if (Number.isFinite(val(g))) pre.push(val(g));
  const base = Math.max(pre.length ? median(pre) : floor, floor);
  let peak = -1;
  let peakAt = f;
  for (let d = -window; d <= window; d++) {
    const v = val(f + d);
    if (Number.isFinite(v) && v > peak) {
      peak = v;
      peakAt = f + d;
    }
  }
  const at = val(f);
  /** g's change stands out from the base and is a local maximum. */
  const isAccent = (g) => {
    const v = val(g);
    if (!Number.isFinite(v) || v < accent * base) return false;
    const a = val(g - 1);
    const b = val(g + 1);
    return !(Number.isFinite(a) && a > v) && !(Number.isFinite(b) && b > v);
  };
  const out = (verdict, offset) => ({ verdict, offset, base, at, peak, peakAt: peakAt - f });
  if (at >= accent * base && (isAccent(f) || at >= strong * peak)) return out('hit', 0);
  if (isAccent(f + 1)) return out('close', 1);
  if (isAccent(f - 1)) return out('close', -1);
  for (let d = 2; d <= window; d++) {
    if (isAccent(f + d)) return out('miss', d);
    if (isAccent(f - d)) return out('miss', -d);
  }
  return out('none', null);
}

/** Counts and the on-beat share of judged events (edge events are not counted). */
export function tally(results) {
  const c = { events: 0, hit: 0, close: 0, miss: 0, none: 0, edge: 0 };
  for (const r of results) {
    c[r.verdict]++;
    if (r.verdict !== 'edge') c.events++;
  }
  return { ...c, onBeat: c.events ? (c.hit + c.close) / c.events : NaN };
}

/** Drum events as a sorted list of { frame, kinds } (film frames), merged per frame, from { kind, at } audio events at `sr`. */
export function drumEvents(events, { sr, fps = 60, kinds = DRUM_KINDS } = {}) {
  const re = new RegExp(kinds);
  const byFrame = new Map();
  for (const e of events) {
    if (!re.test(e.kind)) continue;
    const frame = 'frame' in e ? e.frame : Math.round((e.at * fps) / sr);
    if (!byFrame.has(frame)) byFrame.set(frame, new Set());
    byFrame.get(frame).add(e.kind);
  }
  return [...byFrame].sort((a, b) => a[0] - b[0]).map(([frame, k]) => ({ frame, kinds: [...k] }));
}

/** Per-frame picture change of `file` over its frames [from, from + count): Float64Array indexed by clip frame (NaN where not decoded). */
export async function changeSeries(file, { from = 0, count, size = [384, 216], region = 'full' } = {}) {
  const info = probe(file);
  const [W, H] = size;
  const m = new Float64Array(info.frames).fill(NaN);
  const [x0, y0, x1, y1] = region === 'centre' ? [W / 4, H / 4, (3 * W) / 4, (3 * H) / 4].map(Math.round) : [0, 0, W, H];
  let prev = null;
  let cur = new Float32Array(W * H);
  let prevIndex = -2;
  await eachFrame(file, {
    width: W,
    height: H,
    from,
    count,
    info,
    onFrame: (rgb, f) => {
      lumaOf(rgb, cur);
      if (prev && prevIndex === f - 1) {
        let s = 0;
        for (let y = y0; y < y1; y++) for (let x = x0, q = y * W + x0; x < x1; x++, q++) s += Math.abs(cur[q] - prev[q]);
        m[f] = s / ((x1 - x0) * (y1 - y0));
      }
      const t = prev ?? new Float32Array(W * H);
      prev = cur;
      cur = t;
      prevIndex = f;
    },
  });
  return m;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: cliArgs(),
    allowPositionals: true,
    options: {
      start: { type: 'string', default: '0' },
      section: { type: 'string', multiple: true },
      bars: { type: 'string' },
      by: { type: 'string', default: 'parts' },
      kinds: { type: 'string', default: DRUM_KINDS },
      events: { type: 'string' },
      'save-events': { type: 'string' },
      region: { type: 'string', default: 'full' },
      size: { type: 'string', default: '384x216' },
      window: { type: 'string', default: '4' },
      accent: { type: 'string', default: '1.35' },
      'min-on-beat': { type: 'string', default: '0.8' },
      'max-miss': { type: 'string' },
      quiet: { type: 'boolean', default: false },
      json: { type: 'string' },
    },
  });
  if (positionals.length !== 1) throw new Error('usage: check-sync.mjs FILE.mp4 [--start FRAME|PART] [--section ID]… [--bars A-B] [--by parts|sections] [--kinds REGEX] [--events FILE.json] [--region full|centre] [--window 4] [--accent 1.35] [--min-on-beat 0.8] [--max-miss N] [--quiet] [--json FILE]');
  if (!['full', 'centre'].includes(values.region)) throw new Error('--region is full or centre');
  const file = resolveInput(positionals[0]);
  const map = await filmMap();
  const info = probe(file);
  const start = map.start(values.start);
  const clip = { from: start, to: start + info.frames };
  const ranges = [...(values.section ?? []).map(map.range), ...(values.bars ? [map.range(values.bars)] : [])];
  const checked = ranges.length ? ranges.map((r) => ({ ...r, from: Math.max(r.from, clip.from), to: Math.min(r.to, clip.to) })).filter((r) => r.to > r.from) : [{ id: 'clip', ...clip }];
  if (!checked.length) throw new Error(`the ranges asked for lie outside the clip (film frames ${clip.from}–${clip.to - 1})`);

  // Drum events.
  let events;
  let source;
  if (values.events) {
    // A list of frames, [frame, kind] pairs or { frame, kind } objects; every event in it counts unless --kinds is given.
    const raw = JSON.parse(fs.readFileSync(resolveInput(values.events), 'utf8'));
    const list = raw.map((e) => (typeof e === 'number' ? { frame: e, kind: 'drum' } : Array.isArray(e) ? { frame: e[0], kind: e[1] ?? 'drum' } : { frame: e.frame, kind: e.kind ?? 'drum' }));
    events = drumEvents(list, { kinds: values.kinds === DRUM_KINDS ? '' : values.kinds });
    source = path.basename(values.events);
  } else {
    const { renderStems, SR } = await import('./audio/bgm.mjs');
    events = drumEvents(renderStems(SR).events, { sr: SR, fps: info.fps, kinds: values.kinds });
    source = `the soundtrack's events (kinds /${values.kinds}/)`;
  }
  if (values['save-events']) writeJson(values['save-events'], events.flatMap((e) => e.kinds.map((kind) => ({ frame: e.frame, kind }))));
  const inChecked = (f) => checked.some((r) => f >= r.from && f < r.to);
  const todo = events.filter((e) => inChecked(e.frame));

  // Decode only what the checked ranges need (the base window reaches 15 frames back, the search 5 forward).
  const lo = Math.max(clip.from, Math.min(...checked.map((r) => r.from)) - 16);
  const hi = Math.min(clip.to, Math.max(...checked.map((r) => r.to)) + 6);
  const series = await changeSeries(file, { from: lo - start, count: hi - lo, size: parseSize(values.size), region: values.region });
  /** Picture change by film frame. */
  const m = new Float64Array(Math.max(map.total, clip.to) + 16).fill(NaN);
  series.forEach((v, i) => {
    if (start + i >= 0 && start + i < m.length) m[start + i] = v;
  });

  const opts = { window: Number(values.window), accent: Number(values.accent) };
  const results = todo.map((e) => ({ frame: e.frame, where: map.label(e.frame).trim(), kinds: e.kinds, ...judgeEvent(m, e.frame, opts) }));
  const fmtOff = (o) => (o === null || o === 0 ? '' : o > 0 ? `+${o}` : `−${-o}`);
  console.log(`${path.basename(file)}: ${info.frames} frames from film frame ${start}; ${todo.length} drum events from ${source}; change = mean |Δ luma| (0–255) at ${values.size}, ${values.region} frame; map: ${map.source}`);
  if (!values.quiet) {
    console.log(
      '\n' +
        table(
          ['frame', 'bar  part bar.beat', 'drums', 'base', 'Δ@f', 'peak', 'peak@', 'verdict'],
          results.map((r) => [r.frame, map.label(r.frame), r.kinds.join('+'), num(r.base), num(r.at), num(r.peak), r.peakAt === null ? '' : fmtOff(r.peakAt) || '0', r.verdict + (r.verdict === 'close' || r.verdict === 'miss' ? ` ${fmtOff(r.offset)}` : '')]),
        ),
    );
  }

  // Summary per group (parts or sections) inside each checked range, and per range.
  const minOnBeat = Number(values['min-on-beat']);
  const maxMiss = values['max-miss'] === undefined ? Infinity : Number(values['max-miss']);
  const rows = [];
  const summary = [];
  const failures = [];
  const add = (id, from, to) => {
    const t = tally(results.filter((r) => r.frame >= from && r.frame < to));
    if (!t.events && !t.edge) return;
    const ok = t.events === 0 || (t.onBeat >= minOnBeat && t.miss <= maxMiss);
    if (!ok) failures.push(`${id}: on-beat ${Math.round(100 * t.onBeat)}% (≥ ${Math.round(100 * minOnBeat)}%), misses ${t.miss}${Number.isFinite(maxMiss) ? ` (≤ ${maxMiss})` : ''}`);
    summary.push({ id, from, to, ...t, ok });
    rows.push([id, `${from}–${to - 1}`, t.events, t.hit, t.close, t.miss, t.none, t.edge || '', t.events ? `${Math.round(100 * t.onBeat)}%` : '—', ok ? 'ok' : 'FAIL']);
  };
  for (const r of checked) {
    const gs = map.groups(r.from, r.to, values.by);
    for (const g of gs) add(g.id, g.from, g.to);
    if (gs.length !== 1 || gs[0].from !== r.from || gs[0].to !== r.to) {
      const t = tally(results.filter((x) => x.frame >= r.from && x.frame < r.to));
      rows.push([`= ${r.id}`, `${r.from}–${r.to - 1}`, t.events, t.hit, t.close, t.miss, t.none, t.edge || '', t.events ? `${Math.round(100 * t.onBeat)}%` : '—', '']);
    }
  }
  console.log('\n' + table(['range', 'frames', 'events', 'hit', 'close', 'miss', 'none', 'edge', 'on-beat', ''], rows));
  writeJson(values.json, { file, start, frames: info.frames, source, options: { ...opts, region: values.region, size: values.size, minOnBeat, maxMiss: Number.isFinite(maxMiss) ? maxMiss : null }, events: results, summary, failures });
  if (failures.length) {
    console.error(`\nsync check FAILED\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`\nsync check OK (on-beat ≥ ${Math.round(100 * minOnBeat)}% in every range)`);
}

if (isMain(import.meta.url)) await main();
