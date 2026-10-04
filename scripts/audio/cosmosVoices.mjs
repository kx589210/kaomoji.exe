// The transition's and the cosmos's own voices (parts 'transition' and 'cosmos', "VERTIGO ∞ · LIGHTSPEED PRESS"; build sheet
// notes/bcos/sheet.md §11, design notes/cosmos3/final.md §9, music bible notes/prep/music.md §7): the sounds the shared
// modules (drums.mjs, fx.mjs, fm.mjs, synth.mjs, vox.mjs, breakVoices.mjs, drop2Voices.mjs) do not have. Built from Osc, SVF and fmBell
// only, each adding into a mono Float32Array (or a stereo pair) from a sample index; deterministic for a seed (no Math.random). The
// transition's seeds are 6000–6499, the cosmos's 6500–6999 (the callers pass them).
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { fmBell } from './fm.mjs';
import { panGains } from './mix.mjs';
import { Osc } from './osc.mjs';

const TAU = 2 * Math.PI;
const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** A pink-noise source (Kellet's filter on white noise from `seed`): a function returning the next sample, roughly ±1. */
export function pink(seed) {
  const r = rng(seed);
  let [b0, b1, b2, b3, b4, b5, b6] = [0, 0, 0, 0, 0, 0, 0];
  return () => {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return 0.2 * y;
  };
}

// ——— Bodies, ticks and knocks ————————————————————————————————————————————————————————————————————————————————————————————————————

/** A decaying sine at `freq` (time constant `tauMs`), struck in `attackMs`: a thump, a mode of a struck body. Mono. */
export function thump(out, at, sr, { freq, gain = 0.2, tauMs = 60, attackMs = 1.5, drop = 0 }) {
  const n = Math.round((tauMs * 6 * sr) / 1000);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + drop * Math.exp(-t / 0.012))) / sr;
    const env = Math.min(1, t / (attackMs / 1000)) * Math.exp(-t / (tauMs / 1000)) * Math.min(1, (n - i) / (0.003 * sr));
    put(out, at + i, gain * env * Math.sin(TAU * ph));
  }
}

/** A tick: noise band-passed at `tone` Hz (Q `q`) for `ms`, falling away at once: a paper tick, a key-repeat burr, a crackle grain. Mono. */
export function tick(out, at, sr, { tone = 3000, q = 1.5, ms = 3, gain = 0.1, seed = 1 }) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((ms / 1000) * sr) + Math.round(0.004 * sr);
  const hold = Math.round((ms / 1000) * sr);
  for (let i = 0; i < n; i++) {
    f.process(i < hold ? r() * 2 - 1 : 0, tone, q);
    const env = i < hold ? 1 - (0.6 * i) / hold : 0.4;
    put(out, at + i, gain * env * f.bp * Math.sqrt(q));
  }
}

/** The printer's key-repeat burr (one film sliding out of the sun's rim): a 3 ms tick at 3.2 kHz over a 600 Hz body of 4 ms. Mono. */
export function burr(out, at, sr, { gain = 0.05, seed = 6000 } = {}) {
  tick(out, at, sr, { tone: 3200, q: 2, ms: 3, gain, seed });
  thump(out, at, sr, { freq: 600, gain: 0.5 * gain, tauMs: 4, attackMs: 0.5 });
}

/** Paper struck flat (the rim tock's thwack): noise band-passed round 1.2 kHz for 50 ms over a 160 Hz body. Mono. */
export function paperThwack(out, at, sr, { gain = 0.15, seed = 6001 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.07 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 1200 + 1400 * Math.exp(-t / 0.01), 1.1);
    put(out, at + i, gain * f.bp * Math.min(1, t / 0.0008) * Math.exp(-t / 0.016));
  }
  thump(out, at, sr, { freq: 160, gain: 0.6 * gain, tauMs: 22, attackMs: 1, drop: 0.4 });
}

/** A woodblock at `freq`: two modes (× 1 and × 2.66) dying in tens of milliseconds and a click. Mono. */
export function woodBlock(out, at, sr, { freq, gain = 0.1, tauMs = 28, seed = 6500 }) {
  thump(out, at, sr, { freq, gain, tauMs, attackMs: 0.4 });
  thump(out, at, sr, { freq: freq * 2.66, gain: 0.45 * gain, tauMs: tauMs * 0.4, attackMs: 0.3 });
  tick(out, at, sr, { tone: 4000, q: 1, ms: 1.5, gain: 0.5 * gain, seed });
}

/** A metal click: 2 ms of bright noise and a ping at 5.2 kHz (τ 6 ms). Mono. */
export function metalClick(out, at, sr, { gain = 0.1, seed = 6501 } = {}) {
  tick(out, at, sr, { tone: 7000, q: 0.9, ms: 2, gain, seed });
  thump(out, at, sr, { freq: 5200, gain: 0.5 * gain, tauMs: 6, attackMs: 0.2 });
}

/** The lock clunk under the unwrap (cosmos 2.4): wood at 90 Hz and a metal click. Mono. */
export function lockClunk(out, at, sr, { gain = 0.2, seed = 6502 } = {}) {
  woodBlock(out, at, sr, { freq: 90, gain, tauMs: 60, seed });
  metalClick(out, at + Math.round(0.004 * sr), sr, { gain: 0.6 * gain, seed: seed + 1 });
}

/** A typewriter clack (an overtype cursor rewriting a letter): a bright tick, a 1.1 kHz body of 6 ms and a 180 Hz thunk. Mono. */
export function typeClack(out, at, sr, { gain = 0.05, seed = 6503 } = {}) {
  tick(out, at, sr, { tone: 5200, q: 0.8, ms: 2.5, gain, seed });
  thump(out, at, sr, { freq: 1100, gain: 0.5 * gain, tauMs: 6, attackMs: 0.3 });
  thump(out, at, sr, { freq: 180, gain: 0.6 * gain, tauMs: 10, attackMs: 0.5 });
}

/** A dry stamp "chk" (a crisp copy of Earth pasted on the drag trail): noise band-passed at 2.5 kHz for 25 ms and a tick. Mono. */
export function stampChk(out, at, sr, { gain = 0.08, seed = 6504 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.03 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 2500, 1.4);
    put(out, at + i, gain * f.bp * Math.min(1, t / 0.0005) * Math.exp(-t / 0.007));
  }
  tick(out, at, sr, { tone: 6000, q: 1, ms: 1.2, gain: 0.7 * gain, seed: seed + 1 });
}

/** The press passes' clunk (transition bar 2, one per kick): a press clacking into register and a 70 Hz thump. Mono. */
export function pressClunk(out, at, sr, { gain = 0.25, seed = 6002 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.1 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 2600, 1.8);
    put(out, at + i, gain * 0.7 * f.bp * Math.exp(-t / 0.004));
  }
  thump(out, at, sr, { freq: 70, gain, tauMs: 70, attackMs: 1, drop: 0.6 });
}

/** A struck metal clank at pitch class `freq` (the sandbox's door, cosmos 6.3): five inharmonic partials on the fundamental, dry. Mono. */
const CLANK = [[1, 1, 0.42], [2.76, 0.6, 0.22], [5.4, 0.4, 0.12], [8.93, 0.25, 0.07], [13.34, 0.15, 0.04]];
export function clank(out, at, sr, { freq = 130.81, gain = 0.2, seed = 6505 } = {}) {
  for (const [ratio, amp, tau] of CLANK) thump(out, at, sr, { freq: freq * ratio, gain: gain * amp * 0.45, tauMs: tau * 1000, attackMs: 0.4 });
  tick(out, at, sr, { tone: 3500, q: 0.8, ms: 3, gain: 0.6 * gain, seed });
  thump(out, at, sr, { freq: freq / 2, gain: 0.5 * gain, tauMs: 50, attackMs: 1, drop: 0.5 });
}

// ——— Pitched one-shots ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** An FM chirp: a carrier sweeping exponentially from `from` to `to` Hz over `ms`, modulated at `ratio` × with `index`: a beam zap. Mono. */
export function fmChirp(out, at, sr, { from, to, ms, ratio = 1.5, index = 2, gain = 0.1, decayMs = 0 }) {
  const n = Math.round((ms / 1000) * sr);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = from * (to / from) ** (i / n);
    pc += f / sr;
    pm += (f * ratio) / sr;
    const env = Math.min(1, t / 0.001) * Math.min(1, (n - i) / (0.002 * sr)) * (decayMs ? Math.exp(-t / (decayMs / 1000)) : 1);
    put(out, at + i, gain * env * Math.sin(TAU * pc + index * Math.sin(TAU * pm)));
  }
}

/** A spring's boing at `freq` (the slingshot, cosmos 3.3): the pitch wobbling ± `depth` semitones at `hz`, the wobble dying first. Mono. */
export function boing(out, at, sr, { freq = 350, gain = 0.12, ms = 320, hz = 13, depth = 2.2 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * 2 ** ((depth * Math.exp(-t / 0.08) * Math.sin(TAU * hz * t)) / 12)) / sr;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / (ms / 3000)) * Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * env * (Math.sin(TAU * ph) + 0.18 * Math.sin(2 * TAU * ph)));
  }
}

/** The blade "shing" of the slice (cosmos 1.4): an FM bell at `freq` (3.2 kHz, 120 ms) over a zip of air 3 → 10 kHz. Mono. */
export function bladeShing(out, at, sr, { freq = 3200, gain = 0.1, seed = 6506 } = {}) {
  fmBell(out, at, sr, { freq, gain, decay: 0.04, ratio: 1.414, index: 4.5, attackMs: 0.5 });
  fmBell(out, at, sr, { freq: freq * 1.5, gain: 0.4 * gain, decay: 0.025, ratio: 2.1, index: 3, attackMs: 0.5 });
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.05 * sr);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    f.process(r() * 2 - 1, 3000 * (10 / 3) ** u, 2);
    put(out, at + i, 0.5 * gain * Math.min(1, i / (0.001 * sr)) * (1 - u) ** 2 * f.bp);
  }
}

/** An arc of lightning striking (cosmos 5, one per hop): an FM pip at `freq` for 25 ms over 20 ms of crackle (`crackle` × gain). Mono. */
export function arcZap(out, at, sr, { freq, gain = 0.06, crackle: c = 0.4, seed = 6507 }) {
  const n = Math.round(0.025 * sr);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    pc += freq / sr;
    pm += (freq * 2) / sr;
    const env = Math.min(1, t / 0.0005) * Math.exp(-t / 0.009) * Math.min(1, (n - i) / (0.002 * sr));
    put(out, at + i, gain * env * Math.sin(TAU * pc + 2.5 * Math.exp(-t / 0.005) * Math.sin(TAU * pm)));
  }
  crackle(out, at, Math.round(0.02 * sr), sr, { gain: c * gain, density: 900, tone: 5200, seed });
}

/** Crackle: sparse noise impulses (`density` a second, thinning out) band-passed at `tone`, over `len` samples from `at`. Mono. */
export function crackle(out, at, len, sr, { gain = 0.05, density = 600, tone = 4500, seed = 6508 }) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const x = r() < (density / sr) * (1 - 0.7 * u) ? (r() < 0.5 ? -1 : 1) * (0.5 + 0.5 * r()) : 0;
    f.process(x, tone, 0.9);
    put(out, at + i, gain * 4 * f.bp * Math.min(1, (len - i) / (0.002 * sr)));
  }
}

/** A shower of sparks (an arc glancing off the shield): crackle thinning out over `len`, its grains panned at random. Stereo. */
export function sparkShower(L, R, at, len, sr, { gain = 0.05, density = 1200, tone = 6000, seed = 6509 } = {}) {
  const r = rng(seed);
  const fl = new SVF(sr);
  const fr = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    let xl = 0;
    let xr = 0;
    if (r() < (density / sr) * (1 - u) ** 2) {
      const [gl, gr] = panGains(1.8 * r() - 0.9);
      const a = (r() < 0.5 ? -1 : 1) * (0.4 + 0.6 * r());
      xl = a * gl;
      xr = a * gr;
    }
    const tn = tone * (1 - 0.35 * u);
    fl.process(xl, tn, 0.9);
    fr.process(xr, tn, 0.9);
    const k = gain * 4 * Math.min(1, (len - i) / (0.003 * sr));
    put(L, at + i, k * fl.bp);
    put(R, at + i, k * fr.bp);
  }
}

// ——— Swept noise: whooshes, passes, risers, beds ————————————————————————————————————————————————————————————————————————————

/**
 * A whoosh that travels across the field: noise band-passed sweeping `from` → `to` Hz over `len` samples, loudest at `peak` (a share of
 * its length), its pan gliding `panFrom` → `panTo` (smoothstep, centred on the peak). Stereo, into L and R from `at`.
 */
export function travel(L, R, at, len, sr, { from = 400, to = 5000, gain = 0.15, q = 1.3, panFrom = -0.8, panTo = 0.8, peak = 0.7, seed = 6510 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.process(r() * 2 - 1, from * (to / from) ** p, q);
    const env = p < peak ? (p / peak) ** 2 : ((1 - p) / (1 - peak)) ** 1.5;
    const [gl, gr] = panGains(panFrom + (panTo - panFrom) * smooth(0.5 + (p - peak) * 1.2));
    put(L, at + i, gain * env * f.bp * gl);
    put(R, at + i, gain * env * f.bp * gr);
  }
}

/**
 * A doppler pass (a gate crossing the lens, the slingshot round the Sun): noise band-passed round a centre falling from `from` to `to`
 * as the source passes (steepest at the pass), its level 1 / (1 + (Δt / width)²) peaking at the pass (`peak`, a share of `len`), a tone
 * (`tone` Hz × the same doppler shift, `toneGain`) riding it, panned `panFrom` → `panTo` through the pass. Stereo, into L and R from `at`.
 */
export function doppler(L, R, at, len, sr, { from = 3000, to = 900, gain = 0.15, q = 1.6, peak = 0.5, width = 0.12, panFrom = -0.7, panTo = 0.7, tone = 0, toneGain = 0, seed = 6011 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const d = (p - peak) / width;
    const shift = 0.5 - 0.5 * Math.tanh(1.6 * d); // 1 approaching … 0 receding
    const c = to * (from / to) ** shift;
    f.process(r() * 2 - 1, c, q);
    const env = (1 / (1 + d * d)) * Math.min(1, i / (0.003 * sr)) * Math.min(1, (len - i) / (0.003 * sr));
    const v = f.bp + (tone ? toneGain * o.sine(tone * (c / Math.sqrt(from * to))) : 0);
    const [gl, gr] = panGains(panFrom + (panTo - panFrom) * smooth(0.5 + 0.5 * Math.tanh(d)));
    put(L, at + i, gain * env * v * gl);
    put(R, at + i, gain * env * v * gr);
  }
}

/** A noise band sweeping `from` → `to` Hz over `len` samples, swelling (u^`curve`) to a stop on its last sample (1.5 ms): a riser, a reversed whoosh. Mono. */
export function swellNoise(out, at, len, sr, { from = 800, to = 9000, gain = 0.1, q = 1.4, curve = 2, seed = 6012 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const ramp = Math.max(1, Math.round(0.0015 * sr));
  for (let i = 0; i < len; i++) {
    const u = i / len;
    f.process(r() * 2 - 1, from * (to / from) ** u, q);
    put(out, at + i, gain * u ** curve * Math.min(1, (len - i) / ramp) * f.bp);
  }
}

/**
 * A noise bed whose band follows the picture: `centre(i)` Hz, `level(i)` and `pan(i)` at its i-th sample (from `at`, `len` samples),
 * Q `q`, with a soft low shelf of pink rumble under it (`body` × level). The transition's flight noise. Stereo.
 */
export function trackedNoise(L, R, at, len, sr, { centre, level, pan = () => 0, q = 1.1, body = 0.35, seed = 6013 }) {
  const r = rng(seed);
  const pk = pink(seed + 1);
  const f = new SVF(sr);
  const g = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const c = centre(i);
    f.process(r() * 2 - 1, c, q);
    g.process(pk(), Math.max(80, 0.25 * c), 0.7);
    const v = level(i) * (f.bp + body * g.lp);
    const [gl, gr] = panGains(pan(i));
    put(L, at + i, v * gl);
    put(R, at + i, v * gr);
  }
}

/** A low rumble at `freq` (the collapse's 40 Hz): a sine and low-passed noise, swelling (u^1.5) over `len` samples, a slow tremor on it. Mono. */
export function rumble(out, at, len, sr, { freq = 40, gain = 0.2, seed = 6014 } = {}) {
  const pk = pink(seed);
  const f = new SVF(sr);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const t = i / sr;
    ph += freq / sr;
    f.process(pk(), 110, 0.7);
    const env = u ** 1.5 * (0.85 + 0.15 * Math.sin(TAU * 7 * t)) * Math.min(1, (len - i) / (0.0015 * sr));
    put(out, at + i, gain * env * (Math.sin(TAU * ph) + 1.2 * f.lp));
  }
}

/**
 * The Big Bang's explosion burst (cosmos 1.1): pink noise held for `holdMs` then dying over `decay` s (τ = decay / 4), through a
 * low-pass falling from 14 kHz to 700 Hz as it darkens, with a sub body (`body`) falling 90 → 32 Hz; the two sides from decorrelated sources
 * (a wide, sustained roar: it carries the drop's first beat). Stereo, into L and R from `at`.
 */
export function burst(L, R, at, sr, { gain = 0.3, decay = 1.4, holdMs = 140, body = 0.5, seed = 6511 } = {}) {
  const a = pink(seed);
  const b = pink(seed + 1);
  const c = pink(seed + 2);
  const fl = new SVF(sr);
  const fr = new SVF(sr);
  const n = Math.round(decay * sr);
  const tau = decay / 4;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.002) * (t < holdMs / 1000 ? 1 : Math.exp(-(t - holdMs / 1000) / tau)) * Math.min(1, (n - i) / (0.02 * sr));
    const cut = 700 + 13300 * Math.exp(-t / 0.28);
    const mid = c();
    fl.process(0.7 * mid + 0.55 * a(), cut, 0.8);
    fr.process(0.7 * mid + 0.55 * b(), cut, 0.8);
    ph += (32 + 58 * Math.exp(-t / 0.09)) / sr;
    const sub = body * Math.sin(TAU * ph) * Math.exp(-t / 0.35);
    put(L, at + i, gain * env * (fl.lp + sub));
    put(R, at + i, gain * env * (fr.lp + sub));
  }
}

/**
 * A grain cloud read from `src` (a Float32Array, looped: the frozen burst's last frames): Hann grains of `grainMs` at `density` a second,
 * each from a random place in `src`, played at `rate(i)` (1 = as recorded; 4 = two octaves up: the tape spin-up) at its i-th sample,
 * over `len` samples from `at`, through a low-pass at `cutoff` Hz (a number, or a function of i). Mono.
 */
export function grains(out, src, at, len, sr, { gain = 0.1, grainMs = 30, density = 120, rate = () => 1, cutoff = 2500, seed = 6512 } = {}) {
  const r = rng(seed);
  const g = Math.max(8, Math.round((grainMs / 1000) * sr));
  const buf = new Float32Array(len);
  const step = sr / density;
  const m = src.length;
  for (let s = 0; s < len; s += step * (0.6 + 0.8 * r())) {
    const start = Math.round(s);
    const k = rate(start);
    let pos = r() * m;
    for (let j = 0; j < g && start + j < len; j++) {
      const p = Math.floor(pos);
      const fr = pos - p;
      const v = src[p % m] * (1 - fr) + src[(p + 1) % m] * fr;
      buf[start + j] += v * (0.5 - 0.5 * Math.cos((TAU * j) / g));
      pos += k;
    }
  }
  const f = new SVF(sr);
  const cut = typeof cutoff === 'function' ? cutoff : () => cutoff;
  const norm = 1 / Math.sqrt(Math.max(1, (g / step) * 0.5));
  for (let i = 0; i < len; i++) {
    f.process(buf[i], cut(i), 0.7);
    put(out, at + i, gain * norm * f.lp);
  }
}

/** A swirl of noise rising with the drain (cosmos 6): a band climbing `from` → `to` Hz, swelling, its level chopped by a swirl whose rate rises with `speed(u)`. Mono. */
export function drainSuck(out, at, len, sr, { from = 250, to = 2600, gain = 0.08, speed = (u) => 1 + 2 * u, seed = 6513 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  let sw = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const s = speed(u);
    sw += (3 * s) / sr;
    f.process(r() * 2 - 1, from * (to / from) ** (u * u), 2.2);
    const env = (0.25 + 0.75 * u * u) * (0.6 + 0.4 * Math.sin(TAU * sw)) * Math.min(1, i / (0.01 * sr)) * Math.min(1, (len - i) / (0.0015 * sr));
    put(out, at + i, gain * s ** 0.5 * env * f.bp);
  }
}

// ——— Tones and drones ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The ratchet's click-whirr (the bullet-time rig's servo, cosmos 1.2): clicks accelerating 30 → 140 a second and a servo whirr (a saw
 * 180 → 420 Hz band-passed at 1.4 kHz), both peaking `peakMs` in, gone by `ms`. Mono.
 */
export function ratchet(out, at, sr, { gain = 0.1, ms = 130, peakMs = 50, seed = 6514 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  const pk = (peakMs / 1000) * sr;
  const o = new Osc(sr);
  const f = new SVF(sr);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = i < pk ? (i / pk) ** 1.5 : ((n - i) / (n - pk)) ** 2;
    f.process(o.saw(180 * (420 / 180) ** p), 1400, 2.5);
    put(out, at + i, gain * 0.6 * env * f.bp);
  }
  let t = 0;
  for (let k = 0; t < ms / 1000; k++) {
    const i = Math.round(t * sr);
    const env = i < pk ? 0.4 + 0.6 * (i / pk) : (n - i) / (n - pk);
    tick(out, at + i, sr, { tone: 3800, q: 2, ms: 1.2, gain: gain * env, seed: seed + k });
    t += 1 / (30 + 110 * Math.min(1, t / (peakMs / 1000)));
  }
}

/** A warp drone (cosmos 4): two detuned saws and a fifth through a low-pass, the level `level(i)` at its i-th sample, wide. Stereo. */
export function warpDrone(L, R, at, len, sr, { freq = 73.42, gain = 0.06, level = () => 1, seed = 6515 } = {}) {
  const r = rng(seed);
  const os = [[1, -0.08, -0.7], [1.004, 0.08, 0.7], [1.5, 0, 0], [2.003, 0, -0.3], [1.997, 0, 0.3]].map(([m, , p]) => ({ m, o: new Osc(sr, r()), p: panGains(p) }));
  const fl = new SVF(sr);
  const fr = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    let l = 0;
    let rr = 0;
    for (const { m, o, p } of os) {
      const s = o.saw(freq * m * (1 + 0.003 * Math.sin(TAU * 0.7 * t + m)));
      l += s * p[0];
      rr += s * p[1];
    }
    const cut = 600 + 500 * Math.sin(TAU * 1.3 * t) ** 2;
    fl.process(l, cut, 1.2);
    fr.process(rr, cut, 1.2);
    const k = gain * level(i) * Math.min(1, i / (0.02 * sr)) * Math.min(1, (len - i) / (0.0015 * sr));
    put(L, at + i, k * fl.lp);
    put(R, at + i, k * fr.lp);
  }
}

/** The punch whoomp (cosmos 4.2): low-passed noise falling 900 → 150 Hz over a sine 70 → 40 Hz, struck in 4 ms, gone in 0.4 s. Mono. */
export function whoomp(out, at, sr, { gain = 0.25, seed = 6516 } = {}) {
  const pk = pink(seed);
  const f = new SVF(sr);
  const n = Math.round(0.4 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(pk(), 150 + 750 * Math.exp(-t / 0.05), 0.9);
    ph += (40 + 30 * Math.exp(-t / 0.06)) / sr;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.11) * Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * env * (1.4 * f.lp + 0.8 * Math.sin(TAU * ph)));
  }
}

/** The Defender's scanner tone (cosmos 5.4): a sine sweeping `from` → `to` Hz over `len` samples, buzzing at `buzz` Hz; dry. Mono. */
export function scanner(out, at, len, sr, { from = 2400, to = 900, buzz = 30, gain = 0.05 } = {}) {
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    ph += (from * (to / from) ** (i / len)) / sr;
    const am = Math.sin(TAU * buzz * t) > 0 ? 1 : 0.45;
    const env = Math.min(1, t / 0.003) * Math.min(1, (len - i) / (0.003 * sr));
    put(out, at + i, gain * env * am * Math.sin(TAU * ph));
  }
}

/** The neon's transformer hum (the stutter): 120 Hz, its octave and a little square, swelling over `swell` s, faded over its last 30 ms. Mono. */
export function hum(out, at, len, sr, { gain = 0.035, swell = 0.2 } = {}) {
  const fade = 0.03 * sr;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.004) * Math.min(1, (len - i) / fade) * (0.5 + 0.5 * Math.min(1, t / swell));
    put(out, at + i, env * gain * (Math.sin(TAU * 120 * t) + 0.5 * Math.sin(TAU * 240 * t) + 0.3 * Math.sign(Math.sin(TAU * 120 * t))));
  }
}

// ——— Paper ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * One card flipping (the stadium wave, cosmos 2): a 9–16 ms puff of noise band-passed round `tone` (≈ 1.4–2.6 kHz) with a second, softer
 * slap 6 ms later (the card landing on its other face). Mono.
 */
export function flap(out, at, sr, { gain = 0.05, tone = 1900, seed = 6517 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((0.009 + 0.007 * r()) * sr);
  const slap = Math.round(0.006 * sr);
  for (let i = 0; i < n + slap + Math.round(0.006 * sr); i++) {
    const a = i < n ? Math.sin((Math.PI * i) / n) : 0;
    const b = i >= slap && i < slap + Math.round(0.004 * sr) ? 0.45 * (1 - (i - slap) / (0.004 * sr)) : 0;
    f.process((a + b) * (r() * 2 - 1), tone, 1.3);
    put(out, at + i, gain * 2 * f.bp);
  }
}
