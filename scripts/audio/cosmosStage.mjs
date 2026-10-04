// The stage the transition's and the cosmos's sound is placed on (sections/transition.mjs, sections/cosmos.mjs), and the film's chain
// applied to a part on its own (their previews, their tests' loudness checks, the WAVs render.mjs cuts to before bgm.mjs plays them).
//   stage(): each part renders into its own buses (its SENDS), which start on the part's first frame and are cut at its end (or its
//   silence) with a 1.5 ms fade, so nothing of it rings past its cut; a post bus plays through a silence. `origin` is the film frame of
//   the stems' first sample (0 in the film; a later frame renders a slice); `solo(kind, frame)` picks which events are rendered (the
//   tests render them one at a time). Every event is { kind, at }: `at` is the film sample of its score frame (frame × 800 at 48 kHz).
//   mixAlone(): bgm.mjs's mixdown for one or two parts — dry + a plate per bus send (restarting at the CUTS), the M/S clean-up (mid
//   high-passed at 20 Hz with the mono sub, side at 150 Hz), the SILENCES gated, the post bus added, the true-peak limiter at LIMIT_DB,
//   each part's finish() (the stutter), the re-limit of what the edits changed, the master trim to CEILING_DB. Kept in step with
//   bgm.mjs by hand (its plate settings, the order of its steps).
import { FPS } from '../../src/score/tempo.ts';
import { Biquad } from './filters.mjs';
import { WHOOSH_PEAK, reverseCymbal, whoosh } from './fx.mjs';
import { LIMIT_DB, MASTER_TRIM_DB, limit } from './limiter.mjs';
import { addMono, gate, stereo, truncate } from './mix.mjs';
import { plate } from './reverb.mjs';

/** The film sample of frame `frame` (fractional frames allowed) at `sr`. */
export const sampleOf = (frame, sr) => Math.round((frame / FPS) * sr);

/**
 * A part's stage: its own buses (`sends`' names) over [from, to) and a post bus running `postTail` seconds past `to`. Returns the
 * placing helpers and `commit({ cut })`, which cuts every own bus at `cut` (a frame; default `to`) and adds them and the post bus into
 * `stems` (creating any bus it lacks).
 */
export function stage(stems, sr, { origin = 0, from, to, sends, postTail = 0.6, solo = () => true }) {
  const at = (frame) => sampleOf(frame, sr);
  const n = (stems.post ?? Object.values(stems).find((b) => b && b.L) ?? { L: stems.sub }).L.length;
  stems.post ??= stereo(n);
  for (const name of Object.keys(sends)) stems[name] ??= stereo(n);
  const base = at(from);
  const len = at(to) - base;
  const shift = base - at(origin);
  const lo = (frame) => at(frame) - base;
  const frameAt = (i) => from + (i * FPS) / sr;
  const B = Object.fromEntries(Object.keys(sends).map((k) => [k, stereo(len)]));
  const post = stereo(len + Math.round(postTail * sr));
  const events = [];
  const mark = (kind, frame) => {
    if (!solo(kind, frame)) return false;
    events.push({ kind, at: at(frame) });
    return true;
  };
  /** Whether to render the sound (kind, frame) — or a further layer `as` of an event already marked — marking the event. */
  const take = (kind, as, frame) => (as ? solo(as, frame) : kind ? mark(kind, frame) : true);
  /** One mono voice: `draw(buf)` writes it from 0; it starts on `start` (a frame) and is the event (kind, frame), or a layer of one (`as`). */
  const place = (bus, frame, dur, draw, { kind, as, pan = 0, start = frame, gain = 1 } = {}) => {
    if (!take(kind, as, frame)) return;
    const buf = new Float32Array(Math.max(1, Math.round(dur * sr)));
    draw(buf);
    addMono(bus, buf, { at: lo(start), pan, gain });
  };
  /** One stereo voice `dur` seconds long: `draw(L, R, m)` writes it from 0 (a sound travelling across the field); otherwise as place. */
  const placeStereo = (bus, frame, dur, draw, { kind, as, start = frame } = {}) => {
    if (!take(kind, as, frame)) return;
    const m = Math.max(1, Math.round(dur * sr));
    const L = new Float32Array(m);
    const R = new Float32Array(m);
    draw(L, R, m);
    const s = lo(start);
    for (let i = Math.max(0, -s); i < Math.min(m, bus.L.length - s); i++) {
      bus.L[s + i] += L[i];
      bus.R[s + i] += R[i];
    }
  };
  /** A whoosh `frames` long whose loudest point lands on `peak` (the event is the peak). */
  const swoosh = (bus, peak, frames, o, opts = {}) => place(bus, peak, frames / FPS, (b) => whoosh(b, 0, b.length, sr, o), { ...opts, start: peak - WHOOSH_PEAK * frames });
  /** A reversed cymbal swelling from frame `a` into frame `b`, where it stops dead (the event is `b`). */
  const swell = (bus, a, b, gain, seed, opts = {}) => place(bus, b, (b - a) / FPS, (x) => reverseCymbal(x, x.length, x.length, sr, { gain, seed }), { ...opts, start: a });
  /** A mono voice into the post bus (never gated, never sent to the plate), from frame `start`. */
  const postAt = (frame, dur, draw, { kind, as, pan = 0, start = frame } = {}) => place(post, frame, dur, draw, { kind, as, pan, start });
  /** Cuts every own bus at `cut` (1.5 ms fade) and adds them and the post bus into `stems`. */
  const commit = ({ cut = to } = {}) => {
    const end = lo(cut);
    for (const [name, b] of Object.entries(B)) {
      for (const [src, dst] of [[b.L, stems[name].L], [b.R, stems[name].R]]) {
        truncate(src, end, sr);
        for (let i = Math.max(0, -shift); i < Math.min(len, n - shift); i++) dst[shift + i] += src[i];
      }
    }
    for (const [src, dst] of [[post.L, stems.post.L], [post.R, stems.post.R]]) {
      for (let i = Math.max(0, -shift); i < Math.min(src.length, n - shift); i++) dst[shift + i] += src[i];
    }
  };
  return { at, lo, frameAt, len, base, B, post, events, mark, take, place, placeStereo, swoosh, swell, postAt, commit };
}

/**
 * The buses in `stems` (each bus of `sends`, the post bus, a mono `sub` if any) mixed as bgm.mjs mixes the film, `origin` being the
 * film frame of the stems' first sample: `cuts` restart the plate, `silences` are gated, `finish(L, R, sr, { origin })` edits the
 * limited mix (then only what it changed is re-limited). Returns { L, R } at the master scale (or at the limit with `trim` false).
 */
export function mixAlone(stems, sr, { origin = 0, sends, cuts = [], silences = [], finish = null, trim = true }) {
  const n = Object.values(stems).find((b) => b && b.L)?.L.length ?? stems.sub.length;
  const at = (frame) => sampleOf(frame, sr) - sampleOf(origin, sr);
  const send = stereo(n);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (const [name, amount] of Object.entries(sends)) {
    const bus = stems[name];
    if (!bus) continue;
    for (let i = 0; i < n; i++) {
      send.L[i] += bus.L[i] * amount;
      send.R[i] += bus.R[i] * amount;
      L[i] += bus.L[i];
      R[i] += bus.R[i];
    }
  }
  const wet = stereo(n);
  const edges = [0, ...[...new Set(cuts)].map(at).filter((c) => c > 0 && c < n).sort((a, b) => a - b), n];
  for (let k = 0; k + 1 < edges.length; k++) {
    const part = plate(send.L.subarray(edges[k], edges[k + 1]), send.R.subarray(edges[k], edges[k + 1]), sr, { predelayMs: 18, decay: 0.62, damping: 0.4 });
    wet.L.set(part.L, edges[k]);
    wet.R.set(part.R, edges[k]);
  }
  const side = Biquad.highpass(sr, 150);
  const lowCut = Biquad.highpass(sr, 20);
  for (let i = 0; i < n; i++) {
    const l = L[i] + 0.9 * wet.L[i];
    const r = R[i] + 0.9 * wet.R[i];
    const mid = lowCut.process(0.5 * (l + r) + (stems.sub ? stems.sub[i] : 0));
    const s = side.process(0.5 * (l - r));
    L[i] = mid + s;
    R[i] = mid - s;
  }
  for (const s of silences) gate(L, R, Math.max(0, at(s.from)), Math.min(n, at(s.to)), sr);
  if (stems.post) {
    for (let i = 0; i < n; i++) {
      L[i] += stems.post.L[i];
      R[i] += stems.post.R[i];
    }
  }
  limit(L, R, sr, { ceilingDb: LIMIT_DB });
  if (finish) {
    const limited = { L: L.slice(), R: R.slice() };
    finish(L, R, sr, { origin });
    limit(L, R, sr, { ceilingDb: LIMIT_DB, under: limited });
  }
  if (!trim) return { L, R };
  const g = 10 ** (MASTER_TRIM_DB / 20);
  for (let i = 0; i < n; i++) {
    L[i] *= g;
    R[i] *= g;
  }
  return { L, R };
}
