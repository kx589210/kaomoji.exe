// Drop 2's own voices and mix tools (the part 'drop2'; build sheet notes/d2build/sheet.md §6.6): the shaker and the rim that make the
// groove fuller than drop 1's, the wobble bass whose filter LFO the picture's depth bands ripple on (wobbleLfo, shared through
// src/score/drop2.ts WOBBLE_RATES), a sung line whose formants follow high notes (the scream and the climb reach B6), the inline
// one-liners as one exponential sweep (the band snap, the vwoom, the strain, the twang, the bwomp, the power-down, the drop's whistle),
// the gulp, the 32nd gate, the crusher and the master sweep for drop 2's music buses, and the two edits of the finished mix: the stuck
// buffer's buzz at the freeze and E8's scrub-ahead. Deterministic for a seed; every voice adds into `out` from sample `at`.
import { rng } from '../../src/engine/random.ts';
import { wobbleLfo } from '../../src/score/drop2.ts';
import { Biquad, SVF } from './filters.mjs';
import { Osc } from './osc.mjs';
import { VOWELS } from './vox.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/** A shaker: bright noise (band-passed at `tone`, high-passed at 5 kHz) that swells in over `attackMs` and decays; gone after 3 decays. */
export function shaker(out, at, sr, { gain = 0.08, decayMs = 40, attackMs = 4, tone = 9000 } = {}, seed = 4000) {
  const r = rng(seed);
  const bp = new SVF(sr);
  const hp = new SVF(sr);
  const att = (attackMs / 1000) * sr;
  const dec = (decayMs / 1000) * sr;
  const n = Math.round(att + 3 * dec);
  const fade = Math.max(1, Math.round(0.15 * n));
  for (let i = 0; i < n; i++) {
    bp.process(r() * 2 - 1, tone, 0.9);
    hp.process(bp.bp, 5000, 0.7);
    const env = (i < att ? (i / att) ** 2 : Math.exp(-(i - att) / dec)) * Math.min(1, (n - i) / fade);
    put(out, at + i, gain * 1.6 * env * hp.hp);
  }
}

/** A rim: a knock of two short sines (520 Hz and 1.75 kHz) and a click of noise at 3.2 kHz, slightly saturated; 55 ms long. */
export function rim(out, at, sr, { gain = 0.2 } = {}, seed = 4001) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.055 * sr);
  const fade = Math.round(0.012 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 3200, 1.5);
    const body = Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t / 0.009) + 0.7 * Math.sin(2 * Math.PI * 1750 * t) * Math.exp(-t / 0.005);
    const v = Math.tanh(1.3 * (body + 0.9 * f.bp * Math.exp(-t / 0.0018))) * Math.min(1, (n - i) / fade);
    put(out, at + i, gain * v);
  }
}

/** The wobble's filter LFO (−1 … 1, +1 on each period start of WOBBLE_RATES): one definition, in src/score/drop2.ts, shared with S29's depth bands. */
export { wobbleLfo };
/** The wobble's low-pass cutoff for an LFO value w: 180 Hz at −1, 2.4 kHz at +1, exponential between. */
export const wobbleCutoff = (w) => 180 * (2400 / 180) ** ((w + 1) / 2);

/**
 * The wobble bass: a saw and a square an octave below through a resonant low-pass (Q `q`) whose cutoff follows `lfo(i)` (−1 … 1 at
 * sample i) through wobbleCutoff, then a soft saturation. Notes are { at, len, freq } in samples; one filter runs through them all.
 */
export function wobble(out, notes, sr, { gain = 0.24, lfo = () => 0, q = 4 } = {}) {
  const raw = new Float32Array(out.length);
  const rel = Math.round(0.01 * sr);
  for (const note of notes) {
    const saw = new Osc(sr);
    const sq = new Osc(sr);
    for (let i = 0; i < note.len + rel; i++) {
      const j = note.at + i;
      if (j < 0 || j >= raw.length) continue;
      const env = Math.min(1, i / (0.003 * sr)) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      raw[j] += env * (0.6 * saw.saw(note.freq) + 0.55 * sq.pulse(note.freq / 2, 0.5));
    }
  }
  const f = new SVF(sr);
  for (let i = 0; i < raw.length; i++) {
    f.process(raw[i], wobbleCutoff(lfo(i)), q);
    out[i] += gain * Math.tanh(1.2 * f.lp);
  }
}

/**
 * A sung line of `len` samples from `at`: a glottal pulse (a softened saw plus breath) at the pitch `note(t)` (MIDI, t in seconds from
 * the start, glides allowed, one continuous phase) through drop 1's five formants of `vowel` morphing into `to`. With `tune` the first
 * formant follows a high fundamental (a soprano's formant tuning), so the top of the scream keeps its body instead of thinning out; the
 * level is matched to vox.mjs's voxChop on a mid note. `vibrato` (semitones) sets in after 120 ms.
 */
export function voxLine(out, at, sr, { len, note, vowel = 'a', to = vowel, gain = 0.3, breath = 0.04, seed = 1, tune = true, vibrato = 0 }) {
  const r = rng(seed);
  const src = new Osc(sr);
  const filters = VOWELS[vowel].map(() => new SVF(sr));
  const rel = Math.round(0.02 * sr);
  let soft = 0;
  for (let i = 0; i < len + rel; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const t = i / sr;
    const u = Math.min(1, i / len);
    const k = u * u * (3 - 2 * u);
    const vib = vibrato * Math.min(1, Math.max(0, (t - 0.12) / 0.15)) * Math.sin(2 * Math.PI * 5.6 * t);
    const f0 = midiHz(note(Math.min(t, len / sr)) + vib);
    soft += 0.35 * (src.saw(f0) - soft);
    const x = soft + breath * (r() * 2 - 1);
    let y = 0;
    let lift = 1;
    filters.forEach((flt, n) => {
      const [fa, da, ba] = VOWELS[vowel][n];
      const [fb, db, bb] = VOWELS[to][n];
      let fc = fa + (fb - fa) * k;
      let bw = ba + (bb - ba) * k;
      if (tune && n === 0 && fc < 1.08 * f0) {
        lift = (1.08 * f0) / fc;
        fc *= lift;
        bw *= lift;
      } else if (tune && n === 1 && fc < 1.08 * f0 * 1.45) {
        const s = (1.08 * f0 * 1.45) / fc;
        fc *= s;
        bw *= s;
      }
      flt.process(x, Math.min(fc, 0.45 * sr), fc / bw);
      y += 10 ** ((da + (db - da) * k) / 20) * flt.bp * (bw / fc);
    });
    const env = Math.min(1, i / (0.004 * sr)) * (i < len ? 1 : 1 - (i - len) / rel);
    if (j >= 0) out[j] += gain * env * y;
  }
}

/**
 * A gate that chops `n` samples into chops of `chop` samples: each opens from 0 over `attackMs` (its attack restarted), stays open for
 * `duty` of the chop and closes over 1.5 ms, so it is shut before the next chop starts. Returns the gain curve.
 */
export function chopGate(n, chop, sr, { attackMs = 1.5, duty = 0.7 } = {}) {
  const g = new Float32Array(n);
  const att = Math.max(1, (attackMs / 1000) * sr);
  const rel = Math.max(1, 0.0015 * sr);
  const open = duty * chop;
  for (let i = 0; i < n; i++) {
    const p = i % chop;
    const a = Math.min(1, p / att);
    const c = p < open ? 1 : Math.max(0, 1 - (p - open) / rel);
    g[i] = Math.sin((Math.PI / 2) * a) ** 2 * c;
  }
  return g;
}

/**
 * Crushes samples [a, b) of L and R in place: a sample-and-hold at `holdHz` and a quantiser to `bits` bits of full scale, faded in and
 * out over 1.5 ms inside the window; nothing outside it changes.
 */
export function crush(L, R, a, b, sr, { bits = 8, holdHz = 12000 } = {}) {
  const hold = Math.max(1, Math.round(sr / holdHz));
  const steps = 2 ** (bits - 1);
  const x = Math.max(1, Math.round(0.0015 * sr));
  for (const ch of [L, R]) {
    let held = 0;
    for (let i = Math.max(0, a); i < Math.min(ch.length, b); i++) {
      if ((i - a) % hold === 0) held = Math.round(ch[i] * steps) / steps;
      const w = Math.min(1, (i - a + 1) / x, (b - i) / x);
      ch[i] = w * held + (1 - w) * ch[i];
    }
  }
}

/** Sets a biquad's coefficients to a freshly designed one's, keeping its state (a time-varying filter without clicks). */
const retune = (q, d) => {
  q.b0 = d.b0;
  q.b1 = d.b1;
  q.b2 = d.b2;
  q.a1 = d.a1;
  q.a2 = d.a2;
};

/**
 * A hole in a stereo bus that glides with a sweep (iteration 3, E10's whistle): a peaking cut of `db` (negative) and width `q` whose
 * centre glides exponentially from `from` Hz on sample `a` to `to` Hz on `b` — the law of sweep() — so the bed is ducked exactly where
 * the swept voice is and nowhere else. It runs in over the 4096 samples before `a` (the filter settles; the dry signal is kept there)
 * and cross-fades in over `fadeMs` from `a` and back out over `fadeMs` after `b`; nothing outside [a, b + fade) changes. Coefficients
 * are recomputed every 16 samples.
 */
export function trackingCut(bus, sr, a, b, { from, to, db = -12, q = 0.7, fadeMs = 20 }) {
  const fade = Math.max(1, Math.round((fadeMs / 1000) * sr));
  const centre = (i) => from * (to / from) ** Math.min(1, Math.max(0, (i - a) / (b - a)));
  for (const ch of [bus.L, bus.R]) {
    const pk = Biquad.peak(sr, from, q, db);
    const end = Math.min(ch.length, b + fade);
    for (let i = Math.max(0, a - 4096); i < end; i++) {
      if ((i - a) % 16 === 0) retune(pk, Biquad.peak(sr, centre(i), q, db));
      const y = pk.process(ch[i]);
      if (i < a) continue;
      const w = Math.min(1, (i - a + 1) / fade, (b + fade - i) / fade);
      ch[i] = w * y + (1 - w) * ch[i];
    }
  }
}

/**
 * Drop 2's master sweep on a stereo bus, samples [a, b), in place (sheet §6.6): a peaking filter (`q`, +`gainDb`) sweeping exponentially
 * from peak[0] to peak[1] Hz, a high shelf at `shelfHz` opening 0 → `shelfDb`, and, from `hp.from`, a 12 dB/octave high-pass rising
 * exponentially from hp.hz[0] to hp.hz[1] by `b`. The filters run in over the 4096 samples before `a` (so nothing clicks) and cross-fade
 * in over 1.5 ms; nothing outside [a, b) changes. Coefficients are recomputed every 16 samples.
 */
export function sweepBus(bus, sr, a, b, { peak = [500, 12000], q = 2.5, gainDb = 6, shelfDb = 5, shelfHz = 8000, hp = null } = {}) {
  const x = Math.max(1, Math.round(0.0015 * sr));
  for (const ch of [bus.L, bus.R]) {
    const pk = Biquad.peak(sr, peak[0], q, gainDb);
    const sh = Biquad.highShelf(sr, shelfHz, Math.SQRT1_2, 0.001);
    const hpf = Biquad.highpass(sr, hp ? hp.hz[0] : 20);
    const end = Math.min(ch.length, b);
    for (let i = Math.max(0, a - 4096); i < end; i++) {
      const p = Math.max(0, (i - a) / (b - a));
      if ((i - a) % 16 === 0) {
        retune(pk, Biquad.peak(sr, peak[0] * (peak[1] / peak[0]) ** p, q, gainDb));
        retune(sh, Biquad.highShelf(sr, shelfHz, Math.SQRT1_2, Math.max(0.001, shelfDb * p)));
        if (hp) retune(hpf, Biquad.highpass(sr, hp.hz[0] * (hp.hz[1] / hp.hz[0]) ** Math.max(0, (i - hp.from) / (b - hp.from))));
      }
      let y = sh.process(pk.process(ch[i]));
      if (hp) {
        const h = hpf.process(y);
        if (i >= hp.from) y = h;
      }
      if (i < a) continue;
      const w = Math.min(1, (i - a + 1) / x);
      ch[i] = w * y + (1 - w) * ch[i];
    }
  }
}

/**
 * An exponential glide from `from` to `to` Hz over `ms`, then held for `holdMs`: a sine (or `wave` 'saw' / 'square'), attack `attackMs`,
 * decaying with `decayMs` (if given), saturated by `drive` (tanh, 0 = clean), faded out over its last 10 %. The one-liners of the sheet.
 */
export function sweep(out, at, sr, { from, to, ms, gain = 0.2, wave = 'sine', attackMs = 1, decayMs = 0, holdMs = 0, drive = 0, vibrato = null }) {
  const o = new Osc(sr);
  const T = ms / 1000;
  const n = Math.round(((ms + holdMs) / 1000) * sr);
  const fade = Math.max(1, Math.round(0.1 * n));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let f = from * (to / from) ** Math.min(1, t / T);
    if (vibrato) f *= 2 ** ((vibrato.semitones * Math.sin(2 * Math.PI * vibrato.hz * t)) / 12);
    let v = wave === 'saw' ? o.saw(f) : wave === 'square' ? o.pulse(f, 0.5) : o.sine(f);
    if (drive) v = Math.tanh(drive * v) / Math.tanh(drive);
    const env = Math.min(1, t / (attackMs / 1000)) * (decayMs ? Math.exp(-t / (decayMs / 1000)) : 1) * Math.min(1, (n - i) / fade);
    put(out, at + i, gain * env * v);
  }
}

/**
 * The drop's boom (v08, drop2 1.1; the v07 review: after the slingshot the volume and the white noise spiked): drums.mjs impact's tonal body alone — a sine falling
 * 122 → 32 Hz in its first 0.2 s and ringing out over 0.5 s — without the impact's noise layer (white noise under a low-pass falling from
 * 2 kHz: the "white noise" of the drop's first 100 ms, spectral flatness 0.46). Pure weight, as 10.1's ō-daiko replaced its impact (v07).
 */
export function boom(out, at, sr, { gain = 0.3, seconds = 1.6 } = {}) {
  const n = Math.round(sr * seconds);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (32 + 90 * Math.exp(-t / 0.08)) / sr;
    put(out, at + i, gain * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.5) * Math.min(1, (n - i) / (0.01 * sr)));
  }
}

/** The gulp: a glide from `from` to `to` Hz over `ms` (odd harmonics from a soft clip) sung through an “o” (450 / 800 Hz), over its own fundamental. */
export function gulp(out, at, sr, { from = 300, to = 90, ms = 150, gain = 0.12 } = {}) {
  const f1 = new SVF(sr);
  const f2 = new SVF(sr);
  const T = ms / 1000;
  const n = Math.round(T * sr + 0.015 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (from * (to / from) ** Math.min(1, t / T)) / sr;
    const s = Math.sin(2 * Math.PI * ph);
    const x = Math.tanh(2.2 * s);
    f1.process(x, 450, 4);
    f2.process(x, 800, 5);
    const env = Math.min(1, t / 0.003) * (t < T ? 1 : Math.max(0, 1 - (t - T) / 0.015));
    put(out, at + i, gain * env * (0.6 * s + 1.4 * f1.bp + 0.8 * f2.bp));
  }
}

/**
 * The stuck buffer (sheet §6.5, the crash): the `slice` samples before `from` replay `loops` times from `start` (default `from`; drop 2
 * starts it a 16th after the freeze, so the plink is the crash's own sound), loop k at k·`stepDb` and through a low-pass (two one-poles,
 * 12 dB an octave) falling from lp[0] to lp[1] Hz across the loops; each loop fades in and out over `fadeMs` (an equal-power sine taper),
 * so no splice clicks and the last one ends in silence. Added to L and R in place (their window is gated).
 */
export function buzzLoops(L, R, sr, { from, slice, start = from, loops = 8, stepDb = -2.5, lp = [12000, 2000], fadeMs = 1.5 }) {
  if (from - slice < 0 || start < from || start + loops * slice > L.length) return;
  const x = Math.max(1, Math.round((fadeMs / 1000) * sr));
  for (const ch of [L, R]) {
    const src = ch.slice(from - slice, from);
    let y = src[0];
    let z = src[0];
    for (let k = 0; k < loops; k++) {
      const g = 10 ** ((k * stepDb) / 20);
      const c = lp[0] * (lp[1] / lp[0]) ** (k / Math.max(1, loops - 1));
      const a = 1 - Math.exp((-2 * Math.PI * c) / sr);
      for (let i = 0; i < slice; i++) {
        y += a * (src[i] - y);
        z += a * (y - z);
        const w = Math.sin((Math.PI / 2) * Math.min(1, (i + 0.5) / x, (slice - i - 0.5) / x));
        ch[start + k * slice + i] += g * w * z;
      }
    }
  }
}

/**
 * E8's scrub-ahead, a real skip (iteration 2, the director's ruling 12): at sample `to` the mix drops out and `ms` of the mix from sample
 * `from` plays in its place, reversed, at `db`; then `gapMs` of silence, and the mix comes back. Every splice is a `fadeMs` linear fade
 * (the bed out and back in, the grain in and out), so nothing clicks and nothing gets louder than what it replaces. (It was blended in at
 * −24 dB under the kick: never heard.) In place; skipped if it does not fit.
 */
export function scrubAhead(L, R, sr, { from, to, ms = 40, db = -6, gapMs = 30, fadeMs = 3 }) {
  const len = Math.round((ms / 1000) * sr);
  const gap = Math.round((gapMs / 1000) * sr);
  if (from + len > L.length || to + len + gap > L.length || to < 0) return;
  const g = 10 ** (db / 20);
  const x = Math.max(1, Math.round((fadeMs / 1000) * sr));
  const out = len + gap;
  for (const ch of [L, R]) {
    const grain = ch.slice(from, from + len).reverse();
    for (let k = 0; k < out; k++) {
      const bed = 1 - Math.min(1, (k + 0.5) / x, (out - k - 0.5) / x);
      const w = k < len ? g * Math.min(1, (k + 0.5) / x, (len - k - 0.5) / x) : 0;
      ch[to + k] = bed * ch[to + k] + (k < len ? w * grain[k] : 0);
    }
  }
}

/** Half the length, in samples, of the slam's resampling kernels (Blackman-windowed sincs). */
const HALF = 16;
const blackman = (t) => 0.42 + 0.5 * Math.cos(Math.PI * t) + 0.08 * Math.cos(2 * Math.PI * t);
const sinc = (t) => (t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t));
const unitSum = (h) => {
  const s = h.reduce((a, b) => a + b, 0);
  return h.map((v) => v / s);
};
/** The half-sample interpolator: x at k + ½ = Σ_j HALF_STEP[j] · x[k − HALF + 1 + j]. */
const HALF_STEP = unitSum(Float64Array.from({ length: 2 * HALF }, (_, j) => sinc(j - HALF + 0.5) * blackman((j - HALF + 0.5) / HALF)));
/** The half-band low-pass at twice the rate, odd taps only (its centre tap is ½, its other even taps 0): m = 2j − 2·HALF + 1. */
const HALF_BAND = unitSum(Float64Array.from({ length: 2 * HALF }, (_, j) => {
  const m = 2 * j - 2 * HALF + 1;
  return sinc(m / 2) * blackman(m / (2 * HALF));
})).map((v) => 0.5 * v);

/**
 * The slam (drop2 1.1, sheet §4.0: the drop wins on density, never by peak level): the finished mix from sample `from` driven `db` into a
 * soft clip at the ceiling, c · tanh(g·x / c), at full drive until `to` and easing back to the mix by `out` (raised cosine; a `fadeInMs`
 * ease in). Quiet sound simply comes out `db` louder; peaks bend under the ceiling, so the RMS rises at the same peak. Only the clip's
 * distortion (the shaped signal minus its linear part) is computed at twice the rate and band-limited back, so the mix itself passes
 * unfiltered and no harmonic folds down. In place; samples outside [from, out) are untouched. Follow it with the true-peak limiter.
 */
export function slam(L, R, sr, { from, to, out, db = 3, ceilingDb = -1.2, fadeInMs = 1 }) {
  const c = 10 ** (ceilingDb / 20);
  const g = 10 ** (db / 20);
  const fin = Math.max(1, (fadeInMs / 1000) * sr);
  /** The drive's weight 0 … 1 at sample position p (fractional for the in-between points). */
  const weight = (p) => {
    if (p < from || p >= out) return 0;
    if (p < from + fin) return 0.5 - 0.5 * Math.cos((Math.PI * (p - from)) / fin);
    if (p < to) return 1;
    return 0.5 + 0.5 * Math.cos((Math.PI * (p - to)) / (out - to));
  };
  const bend = (u, w) => (w ? w * (c * Math.tanh((g * u) / c) - g * u) : 0);
  const len = out - from;
  for (const ch of [L, R]) {
    const x = (i) => (i >= 0 && i < ch.length ? ch[i] : 0);
    // The clip's distortion at twice the rate: r2[2k] at sample from + k, r2[2k + 1] halfway to the next.
    const r2 = new Float64Array(2 * len);
    for (let k = 0; k < len; k++) {
      const i = from + k;
      r2[2 * k] = bend(x(i), weight(i));
      const w = weight(i + 0.5);
      if (!w) continue;
      let u = 0;
      for (let j = 0; j < 2 * HALF; j++) u += HALF_STEP[j] * x(i - HALF + 1 + j);
      r2[2 * k + 1] = bend(u, w);
    }
    const lin = Float64Array.from({ length: len }, (_, k) => x(from + k) * (1 + weight(from + k) * (g - 1)));
    for (let k = 0; k < len; k++) {
      let d = 0.5 * r2[2 * k];
      for (let j = 0; j < 2 * HALF; j++) {
        const q = 2 * k + 2 * j - 2 * HALF + 1;
        if (q >= 0 && q < r2.length) d += HALF_BAND[j] * r2[q];
      }
      ch[from + k] = lin[k] + d;
    }
  }
}
