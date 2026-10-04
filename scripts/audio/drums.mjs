// One-shot voices. Each adds into `out` (Float32Array) starting at sample `at`.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { Osc } from './osc.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};

export function kick(out, at, sr, { gain = 0.9, f0 = 170, f1 = 46, pitchMs = 42, decayMs = 280 } = {}, seed = 1) {
  const r = rng(seed);
  let ph = 0;
  const n = Math.round((sr * decayMs * 4) / 1000);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (f1 + (f0 - f1) * Math.exp(-t / (pitchMs / 1000))) / sr;
    const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / (decayMs / 1000));
    const click = i < sr * 0.003 ? (r() * 2 - 1) * (1 - i / (sr * 0.003)) * 0.35 : 0;
    put(out, at + i, gain * Math.tanh(1.6 * body + click));
  }
}

export function hat(out, at, sr, { gain = 0.25, decayMs = 45, cutoff = 7500 } = {}, seed = 2) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((sr * decayMs * 5) / 1000);
  for (let i = 0; i < n; i++) {
    f.process(r() * 2 - 1, cutoff, 0.9);
    put(out, at + i, gain * f.hp * Math.exp(-i / sr / (decayMs / 1000)));
  }
}

/** A mechanical key: a tick of filtered noise plus a short resonant body. */
export function click(out, at, sr, { gain = 0.35, tone = 2400 } = {}, seed = 3) {
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  const n = Math.round(sr * 0.04);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 3800 + 1500 * r(), 2);
    put(out, at + i, gain * (f.bp * Math.exp(-t / 0.0025) + 0.35 * o.sine(tone) * Math.exp(-t / 0.008)));
  }
}

/** A short square-wave beep. */
export function blip(out, at, sr, { gain = 0.15, freq = 1320, ms = 45 } = {}) {
  const o = new Osc(sr);
  const n = Math.round((sr * ms) / 1000);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / (sr * 0.002)) * Math.min(1, (n - i) / (sr * 0.004));
    put(out, at + i, gain * env * o.pulse(freq, 0.5));
  }
}

/** Noise through a band-pass sweeping up, with a rising saw, from `at` for `len` samples. */
export function riser(out, at, len, sr, { gain = 0.3 } = {}, seed = 4) {
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.process(r() * 2 - 1, 300 * 40 ** p, 3);
    put(out, at + i, gain * p * p * (f.bp + 0.25 * o.saw(110 * 8 ** p)));
  }
}

/** Sub drop plus a noise burst with a long tail. */
export function impact(out, at, sr, { gain = 0.9 } = {}, seed = 5) {
  const r = rng(seed);
  const f = new SVF(sr);
  let ph = 0;
  const n = Math.round(sr * 1.6);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (32 + 90 * Math.exp(-t / 0.08)) / sr;
    f.process(r() * 2 - 1, 1800 * Math.exp(-t / 0.5) + 200, 0.8);
    put(out, at + i, gain * (Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.5) + 0.6 * f.lp * Math.exp(-t / 0.35)));
  }
}

/** A clap: four bursts of band-passed noise 9–10 ms apart, then a short tail. */
export function clap(out, at, sr, { gain = 0.5, tone = 1100, tailMs = 90 } = {}, seed = 6) {
  const r = rng(seed);
  const bp = new SVF(sr);
  const hp = new SVF(sr);
  const bursts = [0, 0.009, 0.018, 0.028];
  const n = Math.round(sr * (0.028 + (5 * tailMs) / 1000));
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let env = 0;
    for (const b of bursts) if (t >= b) env = Math.max(env, Math.exp(-(t - b) / 0.0035));
    if (t >= 0.028) env = Math.max(env, 0.5 * Math.exp(-(t - 0.028) / (tailMs / 1000)));
    bp.process(r() * 2 - 1, tone, 1.3);
    hp.process(bp.bp, 450, 0.7);
    put(out, at + i, gain * 2 * env * hp.hp);
  }
}

/** A snare: a body of two sines (tone and 1.47 × tone) that drop a little in pitch, plus bright noise. */
export function snare(out, at, sr, { gain = 0.5, tone = 190, decayMs = 150, noise = 0.8 } = {}, seed = 7) {
  const r = rng(seed);
  const f = new SVF(sr);
  let p1 = 0;
  let p2 = 0;
  const n = Math.round((sr * decayMs * 5) / 1000);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const drop = 1 + 0.25 * Math.exp(-t / 0.012);
    p1 += (tone * drop) / sr;
    p2 += (tone * 1.47 * drop) / sr;
    const body = (Math.sin(2 * Math.PI * p1) + 0.6 * Math.sin(2 * Math.PI * p2)) * Math.exp(-t / 0.045);
    f.process(r() * 2 - 1, 5200, 0.7);
    const hiss = (0.6 * f.hp + 0.8 * f.bp) * Math.exp(-t / (decayMs / 1000));
    put(out, at + i, gain * Math.tanh(0.7 * body + noise * hiss));
  }
}

/** A bubbly pop: a sine sweeping down from 2 × freq to freq in about 25 ms, gone by 70 ms. */
export function pop(out, at, sr, { freq = 900, gain = 0.1 } = {}) {
  let ph = 0;
  const n = Math.round(0.07 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + Math.exp(-t / 0.012))) / sr;
    const env = Math.min(1, t / 0.001) * Math.exp(-t / 0.018) * Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * env * Math.sin(2 * Math.PI * ph));
  }
}

/** A printing press clacking into register: a low thud and a dry click. */
export function press(out, at, sr, { gain = 0.3 } = {}, seed = 10) {
  const r = rng(seed);
  const f = new SVF(sr);
  let ph = 0;
  const n = Math.round(0.12 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (55 + 60 * Math.exp(-t / 0.015)) / sr;
    f.process(r() * 2 - 1, 2600, 1.8);
    put(out, at + i, gain * (0.9 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.05) + 0.7 * f.bp * Math.exp(-t / 0.004)));
  }
}
