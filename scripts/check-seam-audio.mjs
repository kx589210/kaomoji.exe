// Does the music cross the seams, or does a new track start at each one? The continuity plan's audio seam check (docs/2026-10-03-continuity-
// plan-v07.md FW1–FW4, FW6; scripts/README-checks.md). For every seam S (a film frame on a bar line; one beat = 24 frames, one bar = 96):
//   carry    voices of the old world that ring on into the new one (an L cut: a tonal kind heard in the bar before S, before its last
//            beat, and again in S … S + 2 beats) plus voices of the new world that arrive up to a beat early (a J cut: a tonal kind first heard in the beat before S that
//            the new bar keeps). Kinds are the soundtrack's event kinds without their section's prefix (cskick, clkick, d2kick → kick); drums
//            (kick, hat, snare, clap, roll, crash, taiko …) do not count: the kit is the rhythmic spine (kick). One voice or more passes, and so
//            does a designed breath: a section's SILENCES window (the mix gated) within two beats before S, or the mix under --silence-db
//            (−60 dBFS) for 50 ms there.
//   new@1    kinds that start on the downbeat (S − 1 … S + 2) without having been heard in the bar before: at most --max-new (4) (FW3).
//   kick     the kick spine (FW2), reported: a kick within two beats on each side of S when the old bar had one ("gap" when one side has
//            none; "—" when the old bar had no kick; "breath").
//   room     FW4: the beat before S against the beat after it — the spectral centroid's step (octaves; the mid, 60 Hz – 16 kHz), side over mid
//            (dB, broadband) and the momentary loudness (LUFS-M: the K-weighted level of the 400 ms beat). A change ramped over the bridging
//            beat has already moved the beat before, so a ramp shows as a small step and a jump on the downbeat as a big one. Passes with
//            |Δ side/mid| ≤ --max-side (3 dB) and |Δ centroid| ≤ --max-centroid (0.5 octave).
//   plate    the plate reverb restarts at each of the sections' CUTS (and the held tails' edges) — bgm.mjs's list, rebuilt from the same
//            modules. A restart is hot when the mix sounds (above --silence-db) in the 30 ms before AND after it with no designed silence
//            (a SILENCES window) starting there or ending within 12 frames before it: the plate's tail vanishes under live music. A hot
//            restart within a beat of a seam fails it.
//   hook     FW1, bar by bar from 1536 to 5231: the hook's level against the mix in 500 Hz – 4 kHz (dry stems summed, no reverb; the hook = the
//            mix minus the mix rendered again without the hook kinds: HOOK_KINDS and any kind with "hook" in its name; --hook-kinds K,… or
//            +K,…). Judged as the plan's table sets it: drop 2 bars 10–18 ≥ --hook-target (−6 dB), drop 2 bar 8 ≥ --hook-ghost (−14 dB, a
//            ghost), drop 2 bar 9 a statement on 9.4 (a hook note there). Every other bar is reported against the ghost level ("quiet" under
//            it; judged too with --hook-all), except the FALL glass world (break 1) and bars holding a designed breath.
// Event seams (1536 the bang, 2688 the shatter, 3456 the slam: the jump is the hit) and seams after a breath are exempt from new@1 and room.
// Judged seams are §2's (FIX_SEAMS: 2112, 3456, 4224, 4320, 4512, 4704, 4800, 4896, 5376 on the 61-bar map; v08: each of 2112 and 5376 is two
// lines now, either side of its bridge, all moved by film.ts fromV07); the plan's keep list is reported with what would
// fail ("keep: …"); --judge-all judges every seam. Exit code 1 when a judged seam or a judged hook bar fails.
// The mix is a WAV (public/audio/bgm.wav by default), a cut's soundtrack (MP4), or with --render the soundtrack rendered and mixed in memory
// from the source tree (renderStems + mixdown; nothing is written). Events and the hook's stems are rendered in memory from the source tree
// (renderStems, ~20 s, and again without the hook kinds, ~20 s; --no-hook skips that), or the events come from --events FILE.json
// ([{ frame, kind }], [[frame, kind]] or { events: […] }; film frames, or `at` in samples).
// Which seams (--seams): `plan` (default) the intro's bar lines, every part line, the break's inner lines, drop 2's world lines and the loop
// (TOTAL_FRAMES → 0); `parts` the part lines of src/score/film.ts and the loop; or film frames, `F:event` to mark one an event seam.
//   node scripts/check-seam-audio.mjs                                   # public/audio/bgm.wav, every seam of the plan
//   node scripts/check-seam-audio.mjs --render --seams 2112,4320,4704   # a builder's mix, in memory
//   node scripts/check-seam-audio.mjs output/kaomoji-full-v06-proposed-1x.mp4 --no-hook --json out.json
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { powerPrefix } from './check-loudness.mjs';
import { fft } from './lib/fft.mjs';
import { KX } from './lib/remotion.mjs';
import { cliArgs, filmMap, isMain, num, readSoundtrack, resolveInput, table, writeJson } from './lib/review.mjs';
import { fromV07, partFrame, partStart } from '../src/score/film.ts';

export const FPS = 60;
export const BEAT = 24;
export const BAR = 96;
/** v08's bridge lines: either side of bridge A (cosmos → bridge A, bridge A → club) and of bridge B (drop 2 → bridge B, bridge B → outro). */
const BRIDGE_SEAMS = [partStart('bridgeA'), partStart('club'), partStart('bridgeB'), partStart('outro')];
/** A sorted set of frames. */
const frames = (xs) => [...new Set(xs)].sort((a, b) => a - b);
/**
 * The plan's seams (§2 and its keep list): the intro's bar lines, every part line, the break's inner bar lines, drop 2's world lines, the
 * loop — written on the 61-bar v07 map and moved onto today's (film.ts fromV07: v08's bridges moved the club on by a bar, the outro by
 * two) — and the bridges' lines.
 */
export const PLAN_SEAMS = frames([
  ...[96, 192, 480, 960, 1344, 1536, 2112, 2688, 2784, 2880, 2976, 3072, 3168, 3264, 3360, 3456, ...Array.from({ length: 19 }, (_, i) => 3552 + 96 * i), 5376, 5856].map(fromV07),
  ...BRIDGE_SEAMS,
]);
/** The seams the plan fixes (§2, severity 2–5; the 61-bar map's, moved) and the bridges' lines: judged. The rest of PLAN_SEAMS is its keep list: reported. */
export const FIX_SEAMS = frames([...[3456, 4224, 4320, 4512, 4704, 4800, 4896].map(fromV07), ...BRIDGE_SEAMS]);
/** Seams where the jump is the hit (FW4's exemptions): the bang, the shatter, the slam. */
export const EVENT_SEAMS = [1536, 2688, 3456].map(fromV07);
/** The hook's voices (FW1): the cosmos's and the club's chopped vocal, the break's sung hook and its bell, drop 2's hook carriers. */
export const HOOK_KINDS = [
  'cslead', 'cswhisper', 'cshehe', 'clhook', 'brhook',
  'd2lead', 'd2harmony', 'd2koto', 'd2chip', 'd2voxhalf', 'd2brass', 'd2octaves', 'd2climb', 'd2glide', 'd2stutter', 'd2musicbox',
];
/** FW1's span: the cosmos's bang to the end of drop 2's bar 18 … 19 (the freeze is bar 19.3). */
export const HOOK_SPAN = { from: partStart('cosmos'), to: partFrame('drop2', 19, 2) };
const D2 = (bar) => partFrame('drop2', bar);
/** FW1's table: drop 2 bars 10–18 at −6 dB or louder, bar 8 a ghost (−14 dB or louder), bar 9 one statement on 9.4. */
export const HOOK_TABLE = { loud: { from: D2(10), to: D2(19) }, ghost: [D2(8)], statement: { bar: D2(9), from: D2(9) + 72, to: D2(10) } };
/** The FALL glass world (break 1): no hook by design. */
export const HOOK_EXEMPT = [{ from: partStart('break'), to: partFrame('break', 2) }];

/** The sections' prefixes; ba and bb are v08's bridges (sections/bridgeA.mjs, bridgeB.mjs), but the build's own plain kind 'bass' is no ba-ss. */
const PREFIX = /^(cs|cl|br|d2|d1|tr|out|bb|ba(?!ss$))(?=[a-z0-9])/;
/** A kind without its section's prefix: cskick, clkick, d2kick, bakick → kick (a voice's kind, whichever section plays it). */
export const normKind = (k) => String(k).replace(PREFIX, '') || String(k);
/** Drums: the kit is the rhythmic spine, not a carried voice. */
export const RHYTHM = /(kick|hat|snare|clap|rim|ride|shaker|tamb|cowbell|ghost|roll|fill|crash|tom|timpani|drumline|taiko)$/;
/** A kick (not a reversed one). */
export const KICK = /^(?!.*rev).*kick$/;
const tonal = (k) => !RHYTHM.test(normKind(k));
/** Whether a kind carries the hook: listed, or named for it. */
export const isHookKind = (k, kinds = HOOK_KINDS) => kinds.includes(k) || /hook/.test(k);

/** An event's film frame: its `frame`, or its `at` (samples at `sr`). */
export const eventFrame = (e, sr = 48000) => ('frame' in e && Number.isFinite(e.frame) ? e.frame : (e.at * FPS) / sr);

/**
 * The voices across seam S from the soundtrack's events ({ kind, frame } in film frames). For the loop seam (S = total) the film's first bar
 * plays after it. { tail, prelap, fresh, kick: { bar, before, after } } — kinds as normKind gives them.
 */
export function seamVoices(events, S, { total = Infinity } = {}) {
  const ev = S >= total ? [...events, ...events.filter((e) => e.frame < BAR).map((e) => ({ ...e, frame: e.frame + total }))] : events;
  const kinds = (a, b, keep = () => true) => new Set(ev.filter((e) => e.frame >= a && e.frame < b && keep(e.kind)).map((e) => normKind(e.kind)));
  // The old world: what played before the bridging beat; a voice first heard in the bridging beat is the new world's, early.
  const oldWorld = kinds(S - BAR, S - BEAT, tonal);
  const into = kinds(S, S + 2 * BEAT, tonal);
  const tail = [...oldWorld].filter((k) => into.has(k)).sort();
  const lastBeat = kinds(S - BEAT, S, tonal);
  const before = kinds(S - BAR, S - BEAT);
  const newBar = kinds(S, S + BAR, tonal);
  const prelap = [...lastBeat].filter((k) => !before.has(k) && newBar.has(k)).sort();
  const heard = kinds(S - BAR, S - 1);
  const fresh = [...kinds(S - 1, S + 3)].filter((k) => !heard.has(k)).sort();
  const kick = (a, b) => ev.some((e) => e.frame >= a && e.frame < b && KICK.test(e.kind));
  return { tail, prelap, fresh, kick: { bar: kick(S - BAR, S), before: kick(S - 2 * BEAT, S), after: kick(S, S + 2 * BEAT) } };
}

const dbOf = (p) => (p > 0 ? 10 * Math.log10(p) : -Infinity);
const wrapIndex = (i, n) => ((i % n) + n) % n;

/** Mean power (dBFS, both channels) of samples [a, b), wrapping round the end (the loop). */
export function levelDb(L, R, a, b) {
  let s = 0;
  for (let i = a; i < b; i++) {
    const j = wrapIndex(i, L.length);
    s += 0.5 * (L[j] * L[j] + R[j] * R[j]);
  }
  return dbOf(s / Math.max(1, b - a));
}

/**
 * The room of samples [a, b) (wrapping): the spectral centroid of the mid (Hz, power-weighted over 2048-point Hann frames hopped by 512,
 * 60 Hz – 16 kHz), side over mid (dB, broadband) and the mean power (dBFS).
 */
export function roomOf(L, R, sr, a, b) {
  const n = Math.max(0, b - a);
  const mids = new Float32Array(n);
  let side = 0;
  let mid = 0;
  for (let i = 0; i < n; i++) {
    const j = wrapIndex(a + i, L.length);
    const m = 0.5 * (L[j] + R[j]);
    const s = 0.5 * (L[j] - R[j]);
    mids[i] = m;
    mid += m * m;
    side += s * s;
  }
  const N = 2048;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let pw = 0;
  let cw = 0;
  const lo = Math.ceil((60 / sr) * N);
  const hi = Math.floor((16000 / sr) * N);
  const starts = [];
  if (n <= N) starts.push(0);
  else for (let s = 0; s + N <= n; s += 512) starts.push(s);
  for (const s of starts) {
    for (let i = 0; i < N; i++) {
      re[i] = (mids[s + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
      im[i] = 0;
    }
    fft(re, im);
    for (let k = lo; k <= hi; k++) {
      const p = re[k] * re[k] + im[k] * im[k];
      pw += p;
      cw += p * ((k * sr) / N);
    }
  }
  return { centroid: pw > 0 ? cw / pw : NaN, sideMid: dbOf(side) - dbOf(mid), db: dbOf((mid + side) / Math.max(1, n)) };
}

/** Steps from room x to room y: centroid (octaves), side/mid (dB); NaN where either side is silent. */
export const roomStep = (x, y) => ({ centroid: Math.log2(y.centroid / x.centroid), sideMid: y.sideMid - x.sideMid });

/** LUFS (ungated: one momentary block for 400 ms) over samples [a, b) of the K-weighted power prefix `p` (wrapping round its end). */
export function lufsOver(p, a, b) {
  const n = p.length - 1;
  const k = Math.floor(a / n) * n;
  const [u, w] = [a - k, b - k];
  const sum = w <= n ? p[w] - p[u] : p[n] - p[u] + p[w - n];
  const m = sum / Math.max(1, b - a);
  return m > 0 ? -0.691 + 10 * Math.log10(m) : -Infinity;
}

/** Whether frames [a, b) meet a gated window or hold 50 ms under `silenceDb`: a designed breath. Its first frame, or null. */
export function breathIn(L, R, sr, a, b, { windows = [], silenceDb = -60 } = {}) {
  for (const w of windows) if (w.from < b && w.to > a) return Math.max(a, w.from);
  const spf = sr / FPS;
  const win = Math.round(0.05 * sr);
  const hop = Math.round(0.01 * sr);
  for (let s = Math.round(a * spf); s + win <= Math.round(b * spf); s += hop) if (levelDb(L, R, s, s + win) < silenceDb) return s / spf;
  return null;
}

/**
 * The plate's restarts: each cut (film frame) with the mix's level in the 30 ms before and after it, and whether it is hot (both above
 * `silenceDb`, and no designed silence starting there or ending within 12 frames before it).
 */
export function plateRestarts(cuts, L, R, sr, { silenceDb = -60, windows = [] } = {}) {
  const spf = sr / FPS;
  const w = Math.round(0.03 * sr);
  return cuts.map((f) => {
    const c = Math.round(f * spf);
    const pre = levelDb(L, R, c - w, c);
    const post = levelDb(L, R, c, c + w);
    const designed = windows.some((s) => s.from <= f + 1 && s.to >= f - 12);
    return { frame: f, pre, post, designed, hot: pre > silenceDb && post > silenceDb && !designed };
  });
}

/** One-pole high pass at `hp` Hz, then one-pole low pass at `lp` Hz (the plan's 500 Hz – 4 kHz band): a filtered copy. */
function band(x, sr, hp = 500, lp = 4000) {
  const out = new Float64Array(x.length);
  const ah = Math.exp((-2 * Math.PI * hp) / sr);
  const al = Math.exp((-2 * Math.PI * lp) / sr);
  let h = 0;
  let p = 0;
  let l = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    h = ah * (h + v - p);
    p = v;
    l = (1 - al) * h + al * l;
    out[i] = l;
  }
  return out;
}

/** Every stem summed dry (the mono sub in both channels) over samples [a, b). */
function dryMix(stems, a, b) {
  const L = new Float64Array(b - a);
  const R = new Float64Array(b - a);
  for (const [name, bus] of Object.entries(stems)) {
    const [l, r] = name === 'sub' || !bus.L ? [bus, bus] : [bus.L, bus.R];
    for (let i = a; i < b; i++) {
      L[i - a] += l[i];
      R[i - a] += r[i];
    }
  }
  return { L, R };
}

/**
 * The hook's level bar by bar over film frames [from, to): the dry mix of `full` and of `noHook` (the same render without the hook kinds);
 * the hook is their difference; both in 500 Hz – 4 kHz. Rows { from, mixDb (dBFS), hookDb (dB against the mix) }.
 */
export function hookLevels(full, noHook, sr, { from = HOOK_SPAN.from, to = HOOK_SPAN.to } = {}) {
  const spf = sr / FPS;
  const a = Math.round(from * spf);
  const b = Math.round(to * spf);
  const m = dryMix(full, a, b);
  const r = dryMix(noHook, a, b);
  const hl = band(Float64Array.from(m.L, (v, i) => v - r.L[i]), sr);
  const hr = band(Float64Array.from(m.R, (v, i) => v - r.R[i]), sr);
  const ml = band(m.L, sr);
  const mr = band(m.R, sr);
  const rows = [];
  for (let f = from; f < to; f += BAR) {
    const x = Math.round((f - from) * spf);
    const y = Math.min(b - a, Math.round((f + BAR - from) * spf));
    let pm = 0;
    let ph = 0;
    for (let i = x; i < y; i++) {
      pm += 0.5 * (ml[i] * ml[i] + mr[i] * mr[i]);
      ph += 0.5 * (hl[i] * hl[i] + hr[i] * hr[i]);
    }
    rows.push({ from: f, mixDb: dbOf(pm / (y - x)), hookDb: dbOf(ph) - dbOf(pm) });
  }
  return rows;
}

/**
 * A hook bar's verdict (FW1): 'exempt' (FALL), 'breath' (it holds a designed breath), 'ok'; judged failures 'LOW' (drop 2 10–18 under
 * the target), 'QUIET' (bar 8, or any bar with `all`, under the ghost level), 'NONE' (bar 9 without a statement on 9.4); 'quiet' for an
 * unjudged bar under the ghost level. `statement`: whether a hook note sounds on 9.4.
 */
export function judgeHook(row, { ghost = -14, target = -6, breaths = [], statement = true, all = false } = {}) {
  const inBar = (f) => f >= row.from && f < row.from + BAR;
  if (HOOK_EXEMPT.some((w) => inBar(w.from))) return 'exempt';
  if (row.from >= HOOK_TABLE.loud.from && row.from < HOOK_TABLE.loud.to) return row.hookDb >= target ? 'ok' : 'LOW';
  if (HOOK_TABLE.ghost.includes(row.from)) return row.hookDb >= ghost ? 'ok' : 'QUIET';
  if (row.from === HOOK_TABLE.statement.bar) return statement ? 'ok' : 'NONE';
  if (breaths.some(inBar)) return 'breath';
  if (row.hookDb >= ghost) return 'ok';
  return all ? 'QUIET' : 'quiet';
}

/** A seam's failures from its measures ([] when it passes). Event seams and seams after a breath are exempt from new@1 and room. */
export function seamReasons(r, { maxNew = 4, maxSide = 3, maxCentroid = 0.5 } = {}) {
  const why = [];
  if (!r.breath && r.tail.length + r.prelap.length < 1) why.push('no carry');
  if (!r.event && !r.breath) {
    if (r.fresh.length > maxNew) why.push(`${r.fresh.length} new kinds on 1`);
    if (Number.isFinite(r.room.sideMid) && Math.abs(r.room.sideMid) > maxSide) why.push('side/mid step');
    if (Number.isFinite(r.room.centroid) && Math.abs(r.room.centroid) > maxCentroid) why.push('centroid step');
  }
  if (r.hotPlate.length) why.push(`hot plate restart ${r.hotPlate.join(',')}`);
  return why;
}

/** The sections' plate cuts and gated windows: bgm.mjs's CUTS and SILENCES (private there), rebuilt from the same modules. */
async function sectionHooks() {
  const { SILENCE } = await import('../src/score/build.ts');
  const { TAILS } = await import('../src/score/film.ts');
  const later = await Promise.all(['transition', 'cosmos', 'club', 'break', 'drop2', 'outro'].map((s) => import(`./audio/sections/${s}.mjs`)));
  const cuts = [...new Set([SILENCE.from, ...later.flatMap((s) => s.CUTS), ...TAILS.flatMap((t) => [t.from, t.to])])].sort((a, b) => a - b);
  const silences = [SILENCE, ...later.flatMap((s) => s.SILENCES)].map((w) => ({ from: w.from, to: w.to }));
  return { cuts, silences };
}

/**
 * Every stem rendered as bgm.mjs's renderStems does, with `solo(kind, frame)` passed to the parts that take one (transition, cosmos, club,
 * break, drop 2): the film without the sounds it refuses. Mirrors renderStems' list — keep the two in step.
 */
async function renderStemsSolo(sr, n, solo) {
  const { stereo } = await import('./audio/mix.mjs');
  const { renderIntro } = await import('./audio/sections/intro.mjs');
  const { renderBuild } = await import('./audio/sections/build.mjs');
  const [TR, CO, BA, CL, BR, DR, BB, OU] = await Promise.all(['transition', 'cosmos', 'bridgeA', 'club', 'break', 'drop2', 'bridgeB', 'outro'].map((s) => import(`./audio/sections/${s}.mjs`)));
  const stems = { keys: stereo(n), fx: stereo(n), music: stereo(n), chime: stereo(n), drums: stereo(n), bass: stereo(n), chords: stereo(n), vox: stereo(n), post: stereo(n), sub: new Float32Array(n) };
  for (const s of [TR, CO, BA, CL, BR, DR, BB, OU]) for (const name of Object.keys(s.SENDS)) stems[name] ??= stereo(n);
  renderIntro(stems, sr);
  renderBuild(stems, sr);
  TR.renderTransition(stems, sr, { solo });
  CO.renderCosmos(stems, sr, { solo });
  BA.renderBridgeA(stems, sr, { solo });
  CL.renderClub(stems, sr, { solo });
  BR.renderBreak(stems, sr, { solo });
  DR.renderDrop2(stems, sr, { solo });
  BB.renderBridgeB(stems, sr, { solo });
  OU.renderOutro(stems, sr);
  return stems;
}

/** The seams to check: the plan's, the film map's part lines (and the loop), or a list ("F" or "F:event"); each { frame, event, judged }. */
export function parseSeams(spec, map, { judgeAll = false } = {}) {
  const ev = new Set(EVENT_SEAMS);
  const fix = new Set(FIX_SEAMS);
  const one = (frame, event = ev.has(frame)) => ({ frame, event, judged: judgeAll || fix.has(frame) || !PLAN_SEAMS.includes(frame) });
  if (spec === 'plan') return PLAN_SEAMS.map((f) => one(f));
  if (spec === 'parts') return [...map.parts.slice(1).map((p) => p.from), map.total].map((f) => one(f));
  return String(spec)
    .split(',')
    .map((s) => {
      const [f, k] = s.trim().split(':');
      return one(Number(f), k === 'event' || ev.has(Number(f)));
    });
}

/** The soundtrack's events as { kind, frame } (film frames). */
const eventsOf = (list, sr) => list.filter((e) => e && (e.at !== undefined || e.frame !== undefined) && (e.kind ?? e.as)).map((e) => ({ kind: e.kind ?? e.as, frame: eventFrame(e, sr) }));

async function main() {
  const { values, positionals } = parseArgs({
    args: cliArgs(),
    allowPositionals: true,
    allowNegative: true,
    options: {
      render: { type: 'boolean', default: false },
      seams: { type: 'string', default: 'plan' },
      'judge-all': { type: 'boolean', default: false },
      events: { type: 'string' },
      hook: { type: 'boolean', default: true },
      'hook-kinds': { type: 'string' },
      'hook-all': { type: 'boolean', default: false },
      'max-new': { type: 'string', default: '4' },
      'max-side': { type: 'string', default: '3' },
      'max-centroid': { type: 'string', default: '0.5' },
      'hook-ghost': { type: 'string', default: '-14' },
      'hook-target': { type: 'string', default: '-6' },
      'silence-db': { type: 'string', default: '-60' },
      json: { type: 'string' },
    },
  });
  if (positionals.length > 1 || (values.render && positionals.length)) {
    throw new Error('usage: check-seam-audio.mjs [MIX.wav|FILM.mp4 | --render] [--seams plan|parts|F[:event],…] [--judge-all] [--events FILE.json] [--no-hook] [--hook-kinds K,…|+K,…] [--hook-all] [--json FILE]');
  }
  const t0 = Date.now();
  const map = await filmMap();
  const total = map.total;
  const seams = parseSeams(values.seams, map, { judgeAll: values['judge-all'] });
  const silenceDb = Number(values['silence-db']);
  const limits = { maxNew: Number(values['max-new']), maxSide: Number(values['max-side']), maxCentroid: Number(values['max-centroid']) };

  // The source tree's render: the events (unless given), the hook's stems, and with --render the mix itself.
  let stems = null;
  let events = null;
  let sr = 48000;
  const bgm = values.render || !values.events || values.hook ? await import('./audio/bgm.mjs') : null;
  if (bgm) {
    sr = bgm.SR;
    const r = bgm.renderStems();
    stems = r.stems;
    events = eventsOf(r.events, sr);
  }
  if (values.events) {
    const raw = JSON.parse(fs.readFileSync(resolveInput(values.events), 'utf8'));
    events = (Array.isArray(raw) ? raw : raw.events).map((e) => (Array.isArray(e) ? { frame: e[0], kind: e[1] } : { kind: e.kind ?? e.as, frame: eventFrame(e, sr) }));
  }

  // The mix.
  let L;
  let R;
  let source;
  if (values.render) {
    ({ L, R } = bgm.mixdown(stems, sr));
    source = 'the source tree, rendered and mixed in memory';
  } else {
    const file = resolveInput(positionals[0] ?? path.join(KX, 'public', 'audio', 'bgm.wav'));
    const w = readSoundtrack(file);
    if (w.sampleRate !== sr) throw new Error(`${file}: ${w.sampleRate} Hz (expected ${sr})`);
    [L, R] = w.channels;
    source = path.relative(process.cwd(), file).replace(/\\/g, '/');
  }
  const spf = sr / FPS;
  const p = powerPrefix([L, R], sr);
  const { cuts, silences } = await sectionHooks();
  const plates = plateRestarts(cuts, L, R, sr, { silenceDb, windows: silences });
  const breaths = silences.map((w) => w.from);

  // The hook, bar by bar.
  let hookRows = [];
  let hookKinds = HOOK_KINDS;
  if (values.hook && stems) {
    const hk = values['hook-kinds'];
    if (hk) hookKinds = hk.startsWith('+') ? [...HOOK_KINDS, ...hk.slice(1).split(',')] : hk.split(',');
    const noHook = await renderStemsSolo(sr, stems.sub.length, (kind) => !isHookKind(kind, hookKinds));
    const st = HOOK_TABLE.statement;
    const statement = events.some((e) => e.frame >= st.from && e.frame < st.to && isHookKind(e.kind, hookKinds));
    const opts = { ghost: Number(values['hook-ghost']), target: Number(values['hook-target']), breaths, statement, all: values['hook-all'] };
    hookRows = hookLevels(stems, noHook, sr).map((r) => ({ ...r, verdict: judgeHook(r, opts) }));
  }
  const hookAt = (f) => hookRows.find((r) => f >= r.from && f < r.from + BAR);

  // Each seam.
  const rows = seams.map(({ frame: S, event, judged }) => {
    const v = seamVoices(events, S, { total });
    const breathF = breathIn(L, R, sr, S - 2 * BEAT, S + 1, { windows: silences, silenceDb });
    const breath = breathF !== null;
    const kick = breath ? 'breath' : !v.kick.bar ? '—' : v.kick.before && v.kick.after ? 'ok' : 'gap';
    const a = Math.round(S * spf);
    const beatS = Math.round(BEAT * spf);
    const roomBefore = roomOf(L, R, sr, a - beatS, a);
    const roomAfter = roomOf(L, R, sr, a, a + beatS);
    const room = roomStep(roomBefore, roomAfter);
    const lufs = lufsOver(p, a, a + beatS) - lufsOver(p, a - beatS, a);
    const hotPlate = plates.filter((c) => c.hot && c.frame >= S - BEAT && c.frame <= S + BEAT).map((c) => c.frame);
    const row = { frame: S, label: S >= total ? 'loop → 1 intro 1.1' : map.label(S), event, judged, breath, breathAt: breathF, ...v, kick, room, roomBefore, roomAfter, lufs, hotPlate, hookBefore: hookAt(S - 1)?.hookDb, hookAfter: hookAt(S)?.hookDb };
    const reasons = seamReasons(row, limits);
    return { ...row, reasons, verdict: !reasons.length ? 'ok' : judged ? 'FAIL' : 'keep' };
  });

  const list = (xs, n = 3) => (xs.length ? `${xs.length}: ${xs.slice(0, n).join(' ')}${xs.length > n ? ' …' : ''}` : '0');
  console.log(`seams of ${source}; events and stems from the source tree; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(
    '\n' +
      table(
        ['seam', 'bar  part bar.beat', 'carry', 'L tail (old rings on)', 'J pre-lap (new comes early)', 'new@1', 'kick', 'Δcentroid oct', 'Δside/mid dB', 'ΔLUFS-M', 'hook ←', 'hook →', 'verdict'],
        rows.map((r) => [
          r.frame,
          `${r.label}${r.event ? ' (event)' : ''}${r.judged ? '' : ' (keep)'}`,
          r.breath ? `breath ${num(r.breathAt, 0)}` : String(r.tail.length + r.prelap.length),
          list(r.tail),
          list(r.prelap),
          list(r.fresh, 5),
          r.kick,
          num(r.room.centroid),
          num(r.room.sideMid, 1),
          num(r.lufs, 1),
          num(r.hookBefore, 1),
          num(r.hookAfter, 1),
          r.verdict === 'ok' ? 'ok' : `${r.verdict}: ${r.reasons.join('; ')}`,
        ]),
      ),
  );
  if (hookRows.length) {
    console.log(`\nthe hook against the mix, 500 Hz – 4 kHz (dry stems): drop 2 10–18 ≥ ${values['hook-target']} dB, bar 8 ≥ ${values['hook-ghost']} dB, bar 9 a statement on 9.4; other bars reported against ${values['hook-ghost']} dB${values['hook-all'] ? ' and judged' : ''}`);
    console.log(table(['frame', 'bar  part bar.beat', 'mix dBFS', 'hook dB', 'verdict'], hookRows.map((r) => [r.from, map.label(r.from), num(r.mixDb, 1), num(r.hookDb, 1), r.verdict])));
  }
  console.log('\nthe plate restarts (the mix 30 ms before / after the cut)');
  console.log(table(['cut', 'bar  part bar.beat', 'before dBFS', 'after dBFS', 'restart'], plates.map((c) => [c.frame, map.label(c.frame % total), num(c.pre, 1), num(c.post, 1), c.hot ? 'HOT (under live music)' : c.designed ? 'at a designed silence' : 'after / into a silence'])));

  const failed = rows.filter((r) => r.verdict === 'FAIL');
  const hookFailed = hookRows.filter((r) => ['QUIET', 'LOW', 'NONE'].includes(r.verdict));
  writeJson(values.json, { source, limits, hookKinds, seams: rows, hook: hookRows, plates, failures: failed.map((r) => r.frame), hookFailures: hookFailed.map((r) => r.from) });
  const summary = `${failed.length} of ${rows.filter((r) => r.judged).length} judged seams fail${failed.length ? ` (${failed.map((r) => r.frame).join(', ')})` : ''}, ${hookFailed.length} judged hook bars fail${hookFailed.length ? ` (${hookFailed.map((r) => map.label(r.from).trim()).join(', ')})` : ''}; ${rows.filter((r) => r.verdict === 'keep').length} keep seams would fail, ${hookRows.filter((r) => r.verdict === 'quiet').length} unjudged hook bars are quiet`;
  if (failed.length || hookFailed.length) {
    console.error(`\nseam audio check FAILED: ${summary}`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nseam audio check OK: ${summary}`);
}

if (isMain(import.meta.url)) await main();
