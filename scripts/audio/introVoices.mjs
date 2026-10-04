// The intro's own voices (the part 'intro'; sections/intro.mjs plays them; the bars 1–14 design notes/b112/final.md §8.2, build
// sheet notes/b114/sheet.md §10), deterministic for a seed (100–199, the intro's range):
// - the RAIN bar's: a whoosh whose peak sits anywhere in it (the tilt up peaks early, the crane down late), the rain hiss, the drips,
//   and the sub that bumps on the tilt and swells under the rain;
// - the tube kick's CRT thunk;
// - and the Defender's voices (music bible M8, M9: pure tones in pitch class C, dry and narrow; always a beat late): its beeps and a
//   sine glide (the scan sweeps, the look, the re-acquire chirps, the sonar ping). The antivirus is born in the intro, so its voices
//   live here; sections/build.mjs plays them too, and any later section may import them.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';

const TAU = 2 * Math.PI;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
/** A raised-cosine ramp 0 → 1 over u in [0, 1]. */
const smooth = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

/** The Defender's pitches (M8: pitch class C — in F the dominant, it belongs): C6 and C7. */
export const DEFENDER_PITCH = { c6: midi(84), c7: midi(96) };

/**
 * Band-passed noise sweeping from `from` to `to` Hz over `len` samples from `at`, loudest at `peak` (a share of its length): a whoosh
 * whose hit can sit early (a launch: the tilt up) or late (an impact: the crane landing). Silent at both ends; nothing outside
 * [at, at + len).
 */
export function sweep(out, at, len, sr, { from = 300, to = 4000, peak = 0.5, gain = 0.2, q = 1.4, seed = 101 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.process(r() * 2 - 1, from * (to / from) ** p, q);
    const env = p < peak ? (p / peak) ** 2 : ((1 - p) / (1 - peak)) ** 1.5;
    put(out, at + i, gain * env * f.bp);
  }
}

/**
 * The rain's hiss (the RAIN bar): noise band-passed at `centre` Hz (Q `q`), rising from nothing over its first `rise` samples and
 * ducking back to nothing by its end (raised cosines both ways). The virus's world: it goes on a wet bus.
 */
export function rainHiss(out, at, len, sr, { gain = 0.04, rise = len, centre = 4000, q = 0.7, seed = 102 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const fall = Math.max(1, len - rise);
  for (let i = 0; i < len; i++) {
    f.process(r() * 2 - 1, centre, q);
    const env = i < rise ? smooth(i / rise) : 1 - smooth((i - rise) / fall);
    put(out, at + i, gain * env * f.bp);
  }
}

/**
 * A drip of the rain (25 ms of FM): a sine at `freq` with a modulator an octave up whose index dies in 12 ms, gliding down seven
 * semitones over 25 ms and decaying (τ 9 ms); 50 ms long, faded out at its end.
 */
export function drip(out, at, sr, { freq = 2093, gain = 0.03 } = {}) {
  const n = Math.round(0.05 * sr);
  const glide = 2 ** (-7 / 12);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = freq * glide ** Math.min(1, t / 0.025);
    pc += f / sr;
    pm += (2 * f) / sr;
    const idx = Math.exp(-t / 0.012);
    const env = Math.min(1, t / 0.001) * Math.exp(-t / 0.009) * Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * env * Math.sin(TAU * pc + idx * Math.sin(TAU * pm)));
  }
}

/**
 * The sub under the tilt (intro 2.1, Vsus): `freq` with a 3 ms attack and subPulse's 2× → 1× glide in its first 30 ms, so it bumps
 * on the downbeat like the other sub pulses; then a body that swells (τ 0.5 s) under the rain and is released over its last 150 ms,
 * gone by `len`, so the next downbeat's sub lands fresh. Peaks at `gain`. Mono, for the sub bus.
 */
export function subSwell(out, at, len, sr, { freq = 65.41, gain = 0.4, releaseMs = 150 } = {}) {
  const rel = Math.min(len, Math.round((releaseMs / 1000) * sr));
  const env = new Float32Array(len);
  let top = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    env[i] = Math.min(1, t / 0.003) * (0.65 * Math.exp(-t / 0.12) + 0.75 * (1 - Math.exp(-t / 0.5))) * (i < len - rel ? 1 : 1 - smooth((i - (len - rel)) / rel));
    top = Math.max(top, env[i]);
  }
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    ph += (freq * (1 + Math.exp(-t / 0.03))) / sr;
    put(out, at + i, (gain / top) * env[i] * Math.sin(TAU * ph));
  }
}

/**
 * The tube kick's thunk (intro 5.3, the lock): an 80 Hz sine thump (from 95 Hz in its first 10 ms; 2 ms attack, τ 35 ms, 150 ms
 * long) and the flyback's 15.7 kHz whine blipping for 60 ms, 30 dB under it.
 */
export function crtThunk(out, at, sr, { gain = 0.3 } = {}) {
  const n = Math.round(0.15 * sr);
  const blip = Math.round(0.06 * sr);
  let ph = 0;
  let pw = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (80 + 15 * Math.exp(-t / 0.008)) / sr;
    pw += 15734 / sr;
    const thump = Math.min(1, t / 0.002) * Math.exp(-t / 0.035) * Math.min(1, (n - i) / (0.01 * sr)) * Math.sin(TAU * ph);
    const whine = i < blip ? Math.min(1, t / 0.001) * Math.min(1, (blip - i) / (0.005 * sr)) * Math.sin(TAU * pw) : 0;
    put(out, at + i, gain * (thump + 10 ** (-30 / 20) * whine));
  }
}

/** One pure tone `n` samples long with a 2 ms attack and a 4 ms release (a blip's envelope, on a sine). */
function tone(out, at, n, sr, freq, gain) {
  let ph = 0;
  for (let i = 0; i < n; i++) {
    ph += freq / sr;
    const env = Math.min(1, i / (0.002 * sr)) * Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * env * Math.sin(TAU * ph));
  }
}

/**
 * The Defender's beeps (M8): `count` dry sine tones at `freq`, each `ms` long, their onsets `gap` ms apart. Two C7 beeps when it loads
 * (intro 1.3, the log's line), when the rain's scan finds nothing (intro 2.4) and when the scan bar's grid comes back clean (swiss 4.2a).
 */
export function beeps(out, at, sr, { freq = DEFENDER_PITCH.c7, ms = 30, gap = 60, count = 2, gain = 0.05 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  for (let k = 0; k < count; k++) tone(out, at + Math.round(((k * gap) / 1000) * sr), n, sr, freq, gain);
}

/**
 * A pure sine gliding (exponentially) from `from` to `to` Hz over `ms`, then holding `to` for `holdMs`; `attackMs` in, 3 ms out, nothing
 * after. The Defender's sweeps (the rain's scan C6 → C5, the scan bar's tone 300 → 1200 Hz), its look (from = to), the re-acquire chirps
 * (C7 → G7) and the sonar ping (C7 → C6).
 */
export function glide(out, at, sr, { from, to = from, ms, holdMs = 0, gain = 0.05, attackMs = 2 } = {}) {
  const g = Math.round((ms / 1000) * sr);
  const n = g + Math.round((holdMs / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    ph += (from * (to / from) ** Math.min(1, i / g)) / sr;
    const env = Math.min(1, i / ((attackMs / 1000) * sr)) * Math.min(1, (n - i) / (0.003 * sr));
    put(out, at + i, gain * env * Math.sin(TAU * ph));
  }
}
