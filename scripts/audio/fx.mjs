// Sound effects: whoosh, cymbals (reverse and crash), a swarm of tiny
// ticks, a CRT switching on, a reverse inhale, paper flutter. Deterministic
// for a seed.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { Osc } from './osc.mjs';

/** Band-passed noise sweeping from `from` to `to` Hz over `len` samples, peaking at 70%. */
/** Where a whoosh is loudest, as a share of its length: place one with its peak on a picture's hit (spec §3.1 rule 8). */
export const WHOOSH_PEAK = 0.7;

export function whoosh(out, at, len, sr, { from = 300, to = 5000, gain = 0.4, q = 1.4, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.process(r() * 2 - 1, from * (to / from) ** p, q);
    const env = p < WHOOSH_PEAK ? (p / WHOOSH_PEAK) ** 2 : ((1 - p) / (1 - WHOOSH_PEAK)) ** 1.5;
    const j = at + i;
    if (j >= 0 && j < out.length) out[j] += gain * env * f.bp;
  }
}

/** A synthetic cymbal: six square oscillators at TR-808 cymbal pitches plus noise, band-passed high, decaying as exp(−i / decaySamples). */
function cymbal(len, sr, seed, decaySamples) {
  const r = rng(seed);
  const oscs = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => ({ f, o: new Osc(sr, r()) }));
  const bp = new SVF(sr);
  const hp = new SVF(sr);
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let m = 0;
    for (const { f, o } of oscs) m += o.pulse(f, 0.5);
    bp.process(m / 6 + 0.6 * (r() * 2 - 1), 7500, 0.9);
    hp.process(bp.bp, 5000, 0.7);
    buf[i] = hp.hp * Math.exp(-i / decaySamples);
  }
  return buf;
}

/**
 * A synthetic crash played backwards so it swells into sample `end`. Its
 * decay is scaled to `len`, so even a short one rises from about −35 dB.
 */
export function reverseCymbal(out, end, len, sr, { gain = 0.35, seed = 1 } = {}) {
  const buf = cymbal(len, sr, seed, len / 4);
  for (let i = 0; i < len; i++) {
    const j = end - 1 - i;
    if (j >= 0 && j < out.length) out[j] += gain * buf[i];
  }
}

/** A crash cymbal from sample `at`, decaying over `decay` seconds. */
export function crash(out, at, sr, { gain = 0.3, decay = 1.4 } = {}, seed = 9) {
  const len = Math.round(decay * 4 * sr);
  const buf = cymbal(len, sr, seed, decay * sr);
  for (let i = 0; i < len; i++) {
    const j = at + i;
    if (j >= 0 && j < out.length) out[j] += gain * buf[i] * Math.min(1, i / (0.002 * sr));
  }
}

/** A reversed breath: noise through two formant-like band-passes (an open "haa"), swelling into sample `end`, where it stops. */
export function inhale(out, end, len, sr, { gain = 0.4, seed = 1 } = {}) {
  const r = rng(seed);
  const f1 = new SVF(sr);
  const f2 = new SVF(sr);
  const hp = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const x = r() * 2 - 1;
    f1.process(x, 1200, 3);
    f2.process(x, 2600, 4);
    hp.process(0.6 * f1.bp + 0.4 * f2.bp + 0.15 * x, 400, 0.7);
    const env = ((i + 1) / len) ** 3 * Math.min(1, (len - i) / (0.001 * sr));
    const j = end - len + i;
    if (j >= 0 && j < out.length) out[j] += gain * env * hp.hp;
  }
}

/** Paper flapping past: band-passed noise, amplitude-modulated at `rate` Hz, swelling and fading over `len` samples (loudest halfway). */
export function flutter(out, at, len, sr, { gain = 0.2, rate = 24, tone = 1800, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const p = i / len;
    f.process(r() * 2 - 1, tone, 1.2);
    const am = 0.55 + 0.45 * Math.sin(2 * Math.PI * rate * (i / sr) + 3 * p);
    const j = at + i;
    if (j >= 0 && j < out.length) out[j] += gain * Math.sin(Math.PI * p) ** 2 * am * f.bp;
  }
}

/** Tiny sine grains (2–6 ms, 1.5–7 kHz, random pan) whose density swells and fades over `len` samples. */
export function swarm(outL, outR, at, len, sr, { gain = 0.15, density = 400, seed = 1 } = {}) {
  const r = rng(seed);
  const perSample = density / sr;
  for (let i = 0; i < len; i++) {
    if (r() >= perSample * Math.sin((Math.PI * i) / len) ** 1.5) continue;
    const freq = 1500 + 5500 * r();
    const dur = Math.round((0.002 + 0.004 * r()) * sr);
    const a = ((r() * 2 - 1 + 1) * Math.PI) / 4;
    const amp = gain * (0.4 + 0.6 * r());
    for (let k = 0; k < dur && i + k < len; k++) {
      const j = at + i + k;
      if (j < 0 || j >= outL.length) continue;
      const v = amp * Math.sin((Math.PI * k) / dur) * Math.sin((2 * Math.PI * freq * k) / sr);
      outL[j] += v * Math.cos(a);
      outR[j] += v * Math.sin(a);
    }
  }
}

/**
 * A neon tube sparking: a hard tick of band-passed noise at `tone` Hz with a
 * short ping on it, and a buzz — noise around 2.6 kHz chopped at the mains'
 * 120 Hz — gone within about 30 ms.
 */
export function spark(out, at, sr, { gain = 0.2, tone = 4500 } = {}, seed = 1) {
  const r = rng(seed);
  const tick = new SVF(sr);
  const buzz = new SVF(sr);
  const o = new Osc(sr, r());
  const n = Math.round(0.035 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const x = r() * 2 - 1;
    tick.process(x, tone, 1.6);
    buzz.process(x, 2600, 2.2);
    const chop = Math.sin(2 * Math.PI * 120 * t) > -0.2 ? 1 : 0.15;
    const v = tick.bp * Math.exp(-t / 0.0015) + 0.3 * o.sine(tone * 1.5) * Math.exp(-t / 0.005) + 0.55 * chop * buzz.bp * Math.exp(-t / 0.009) * Math.min(1, (n - i) / (0.004 * sr));
    const j = at + i;
    if (j >= 0 && j < out.length) out[j] += gain * v;
  }
}

/** A CRT switching on: a low thump, a burst of static that thins out, and a faint settling whine. */
export function powerOn(out, at, sr, { gain = 0.4, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.6 * sr);
  let ph = 0;
  let wh = 0;
  for (let i = 0; i < n; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const t = i / sr;
    ph += (38 + 40 * Math.exp(-t / 0.05)) / sr;
    const thump = Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.12) * Math.min(1, t / 0.002);
    const crackle = r() < 0.16 * Math.exp(-t / 0.15) ? r() * 2 - 1 : 0;
    f.process(crackle, 3000, 0.8);
    wh += (1500 - 700 * Math.min(1, t / 0.3)) / sr;
    const whine = 0.04 * Math.sin(2 * Math.PI * wh) * Math.exp(-t / 0.25);
    if (j >= 0) out[j] += gain * (0.9 * thump + 0.8 * f.bp + whine);
  }
}
