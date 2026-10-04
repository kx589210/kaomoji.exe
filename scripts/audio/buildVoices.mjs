// The build's own new voices (the parts 'swiss' and 'riso'; sections/build.mjs plays them; the bars 1–14 design
// notes/b112/final.md §8.3, build sheet notes/b114/sheet.md §10), deterministic for a seed (1400–1499, the build's new range):
// - the SCAN bar's muffle: the world heard through the antivirus (a low-pass that glides in, holds and snaps open, cross-faded so it
//   never clicks), also the short low-pass duck under S08's greys;
// - the J-cut's noise swell into the iris; S05's cut-paper slaps; the radar pings the arp becomes in the scan bar; S08's print thumps;
//   the guest's boing; riso's chord stabs (L14b, in place of v04's supersaw bed). The Defender's own voices are
//   scripts/audio/introVoices.mjs's.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { panGains } from './mix.mjs';
import { Osc } from './osc.mjs';

const TAU = 2 * Math.PI;
const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const smooth = (u) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

/**
 * The muffle, in place on each of `channels` (Float32Arrays; a stereo bus's L and R, or a mono buffer), over samples [a, d): an SVF
 * low-pass (Q `q`) whose cutoff glides exponentially from `open` down to `cutoff` Hz over [a, b), holds to c and glides back up to
 * `open` by d − `xfadeMs`. The filtered signal cross-fades in over the first `xfadeMs` after a (raised cosine; the filter's start-up is
 * hidden under it) and back out to the dry over the last `xfadeMs` before d, so from d on the bus is exactly what it was, and before a
 * too. A window reaching past either end of the buffer is clipped to it.
 */
export function muffle(channels, sr, { a, b, c, d, cutoff = 1500, open = 20000, q = 0.7, xfadeMs = 2 }) {
  const x = Math.max(1, Math.round((xfadeMs / 1000) * sr));
  const shut = d - x;
  const at = (i) => {
    if (i < b) return open * (cutoff / open) ** ((i - a) / Math.max(1, b - a));
    if (i < c) return cutoff;
    if (i < shut) return cutoff * (open / cutoff) ** ((i - c) / Math.max(1, shut - c));
    return open;
  };
  const wet = (i) => (i < a + x ? smooth((i - a) / x) : i >= shut ? 1 - smooth((i - shut) / x) : 1);
  for (const ch of channels) {
    const f = new SVF(sr);
    for (let i = Math.max(0, a); i < Math.min(ch.length, d); i++) {
      f.process(ch[i], at(i), q);
      const w = wet(i);
      ch[i] = (1 - w) * ch[i] + w * f.lp;
    }
  }
}

/** Band-passed noise sweeping `from` → `to` Hz and swelling (∝ p²) over the `len` samples before `end`, where it stops (a 1 ms ramp). */
export function noiseSwell(out, end, len, sr, { from = 300, to = 3000, q = 1, gain = 0.12, seed = 1401 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const ramp = 0.001 * sr;
  for (let i = 0; i < len; i++) {
    const p = (i + 1) / len;
    f.process(r() * 2 - 1, from * (to / from) ** p, q);
    put(out, end - len + i, gain * p * p * Math.min(1, (len - i) / ramp) * f.bp);
  }
}

/**
 * A cut-paper slap (S05's Saul Bass pieces): a burst of noise high-passed at 400 Hz and a small body at 140 Hz, both raised `step`
 * semitones; 60 ms long.
 */
export function paperSlap(out, at, sr, { gain = 0.18, step = 0, seed = 1410 } = {}) {
  const r = rng(seed + step);
  const k = 2 ** (step / 12);
  const hp = new SVF(sr);
  const n = Math.round(0.06 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    hp.process(r() * 2 - 1, 400 * k, 0.7);
    ph += (140 * k * (1 + 0.3 * Math.exp(-t / 0.006))) / sr;
    const tail = Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * tail * (hp.hp * Math.exp(-t / 0.008) + 0.35 * Math.sin(TAU * ph) * Math.exp(-t / 0.012)));
  }
}

/** A radar ping (the scan bar's arp): a square at `freq`, 2 ms in, decaying (τ 14 ms), 50 ms long. */
export function radarPing(out, at, sr, { freq = 1046.5, gain = 0.05 } = {}) {
  const o = new Osc(sr);
  const n = Math.round(0.05 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / 0.014) * Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * env * o.pulse(freq, 0.5));
  }
}

/** S08's print thump: a sine on its note (τ 18 ms) over a 90 Hz thud (τ 14 ms), 70 ms long. */
export function printThump(out, at, sr, { freq, gain = 0.05 } = {}) {
  const n = Math.round(0.07 * sr);
  let pn = 0;
  let pt = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    pn += freq / sr;
    pt += (90 * (1 + 0.5 * Math.exp(-t / 0.005))) / sr;
    const tail = Math.min(1, t / 0.001) * Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * tail * (Math.sin(TAU * pn) * Math.exp(-t / 0.018) + 1.4 * Math.sin(TAU * pt) * Math.exp(-t / 0.014)));
  }
}

/** The guest's boing (S08's quarantine): a sine bent down `from` → `to` Hz over `ms`, wobbling at 22 Hz (dying away), decaying to nothing by its end. */
export function boing(out, at, sr, { from = 500, to = 180, ms = 220, gain = 0.05 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const u = i / n;
    const f = from * (to / from) ** Math.min(1, u * 1.4);
    ph += (f * (1 + 0.06 * Math.exp(-t / 0.08) * Math.sin(TAU * 22 * t))) / sr;
    const env = Math.min(1, t / 0.002) * (1 - u) ** 1.5;
    put(out, at + i, gain * env * Math.sin(TAU * ph));
  }
}

/**
 * A chord stab (riso's harmony since L14b: no held bed, short-decay chords on the picture's hits): each tone of `freqs`
 * is `voices` saws detuned across ± `detune` semitones and spread across the stereo field (as the supersaw it replaces), its level
 * held for `holdMs` after an `attackMs` attack, then decaying (τ `decayMs`), faded out over its last 30 ms and gone by `lenMs` (riso's: within
 * the eighth after its hit). Each side runs through a low-pass whose cutoff falls from `bright` to `dark` Hz (τ 45 ms; the stab's bite),
 * then a high-pass at `hp` Hz (no low mush under the bass). Adds into `outL` / `outR` from sample `at`.
 */
export function chordStab(outL, outR, at, sr, { freqs, gain = 0.1, voices = 3, detune = 0.14, spread = 0.7, attackMs = 2, holdMs = 0, decayMs = 45, lenMs = 190, bright = 4000, dark = 900, q = 0.9, hp = 220, seed = 1480 } = {}) {
  const r = rng(seed);
  const n = Math.round((lenMs / 1000) * sr);
  const fade = Math.round(0.03 * sr);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (const freq of freqs) {
    for (let v = 0; v < voices; v++) {
      const x = voices === 1 ? 0 : (2 * v) / (voices - 1) - 1;
      const f = freq * 2 ** ((detune * x + 0.02 * (r() - 0.5)) / 12);
      const [gl, gr] = panGains(spread * (v % 2 === 0 ? x : -x));
      const o = new Osc(sr, r());
      for (let i = 0; i < n; i++) {
        const s = o.saw(f);
        L[i] += s * gl;
        R[i] += s * gr;
      }
    }
  }
  const norm = gain / Math.sqrt(voices * freqs.length);
  for (const [x, out] of [[L, outL], [R, outR]]) {
    const lp = new SVF(sr);
    const hi = new SVF(sr);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      lp.process(x[i], dark + (bright - dark) * Math.exp(-t / 0.045), q);
      hi.process(lp.lp, hp, 0.7);
      const env = Math.min(1, t / (attackMs / 1000)) * Math.exp(-Math.max(0, t - (attackMs + holdMs) / 1000) / (decayMs / 1000)) * Math.min(1, (n - i) / fade);
      put(out, at + i, norm * env * hi.hp);
    }
  }
}
