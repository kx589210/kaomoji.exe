// The interlude's v2 voices (the part 'break', 8 bars; sections/break.mjs plays them): the design's §8.2 recipes
// (notes/extend/interlude-final.md) for what the 8-bar interlude adds to the as-built break — the antivirus's dry hand (its cursor
// clicks, the scanner, the lock beeps, the rewind), the world's foley (creaks, rips, thuds, the skid, the reels, the fwoom, the UI pop),
// the coaster (the rail roar that follows his speed, the chain lift, the sparks), the slingshot (the car crunch, the band's boing and
// creaks, the link ticks, the bonk) and the fake drop (the film's shimmer, the reversed crash, the thwang, the bwomp).
// The as-built voices stay in breakVoices.mjs, untouched (the club, the transition and the ending import them too).
// Every voice adds into its output from a sample index (a reversed one ends on one); deterministic for a seed; nothing reads a clock.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { panGains } from './mix.mjs';
import { Osc } from './osc.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
const TAU = 2 * Math.PI;
/** A unity-peak band-pass of the SVF just processed (its bp peaks at q). */
const bp = (f, q) => f.bp / q;

/**
 * The antivirus's cursor click (design §8.2): a 1.5 ms tick of noise above 4 kHz and an 8 ms sine at `tone` — C7 by default, since the
 * Defender's notes are on C (the music bible's M8). Dry and short: gone in 10 ms.
 */
export function tick(out, at, sr, { tone = 2093, gain = 0.05, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const nNoise = Math.round(0.0015 * sr);
  const nTone = Math.round(0.008 * sr);
  for (let i = 0; i < nTone; i++) {
    f.process(i < nNoise ? r() * 2 - 1 : 0, 4000, 0.7);
    const s = Math.sin((TAU * tone * i) / sr) * Math.min(1, i / (0.0004 * sr)) * (1 - i / nTone) ** 2;
    put(out, at + i, gain * (1.2 * f.hp + s));
  }
}

/** A creak (the iris, the slingshot's band): noise through a narrow band-pass at `freq`, beating at `am` Hz, over `ms`. */
export function creak(out, at, sr, { freq = 700, q = 6, am = 30, ms = 120, gain = 0.04, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((ms / 1000) * sr);
  for (let i = 0; i < n; i++) {
    f.process(r() * 2 - 1, freq, q);
    const env = Math.min(1, i / (0.004 * sr)) * Math.min(1, (n - i) / (0.012 * sr));
    const beat = 0.25 + 0.75 * (0.5 - 0.5 * Math.cos((TAU * am * i) / sr));
    put(out, at + i, gain * 3 * env * beat * bp(f, q));
  }
}

/** A tag torn (design §8.2 paper rip): `bursts` bursts of high-passed noise, 15 ms each, over 45 ms, the first the loudest. */
export function rip(out, at, sr, { gain = 0.06, bursts = 3, hp = 1500, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const len = Math.round(0.015 * sr);
  const n = bursts * len + Math.round(0.004 * sr);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(i / len);
    const j = i - k * len;
    const env = k < bursts ? Math.min(1, j / (0.0008 * sr)) * Math.exp(-j / (0.005 * sr)) * (1 - 0.25 * k) : 0;
    f.process(env * (r() * 2 - 1), hp, 0.7);
    put(out, at + i, gain * 2.2 * f.hp);
  }
}

/** A block landing (design §8.2 block thud): a sine falling from `from` to `to` Hz over `ms` with a little click on top. */
export function thud(out, at, sr, { from = 90, to = 60, ms = 120, gain = 0.12, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((ms / 1000) * sr);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    p += (from * (to / from) ** u) / sr;
    f.process(i < 0.002 * sr ? r() * 2 - 1 : 0, 2500, 0.7);
    const env = Math.min(1, i / (0.0008 * sr)) * Math.exp(-u * 4) * Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * (env * Math.sin(TAU * p) + 0.5 * f.lp));
  }
}

/** Things skidding downhill (design §8.2 skid): noise through a band-pass sweeping from `from` down to `to` Hz over `len` samples. */
export function skid(out, at, len, sr, { from = 1200, to = 400, q = 2.5, gain = 0.05, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    f.process(r() * 2 - 1, from * (to / from) ** u, q);
    const env = Math.min(1, i / (0.01 * sr)) * Math.min(1, (len - i) / (0.015 * sr)) * (1 - 0.4 * u);
    put(out, at + i, gain * 2 * env * bp(f, q));
  }
}

/**
 * The scanner's hum under the antivirus's POV (design §8.2): a square at `freq` (C2: the Defender's C, M8) through a 400 Hz low-pass, and a
 * thin sine at `tone` (C8), over `len` samples with 3 ms edges.
 */
export function hum(out, at, len, sr, { freq = 65.41, lp = 400, gain = 0.02, tone = 4186, toneGain = 0.006 } = {}) {
  const o = new Osc(sr);
  const f = new SVF(sr);
  const edge = 0.003 * sr;
  for (let i = 0; i < len; i++) {
    f.process(o.pulse(freq, 0.5), lp, 0.7);
    const env = Math.min(1, i / edge, (len - i) / edge);
    put(out, at + i, env * (gain * f.lp + toneGain * Math.sin((TAU * tone * i) / sr)));
  }
}

/** The scanner switching off (design §8.2 CRT tick): 3 ms of noise above 6 kHz over a 120 Hz thump of 20 ms. */
export function crtTick(out, at, sr, { gain = 0.05, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.02 * sr);
  const nNoise = Math.round(0.003 * sr);
  for (let i = 0; i < n; i++) {
    f.process(i < nNoise ? r() * 2 - 1 : 0, 6000, 0.7);
    const body = Math.sin((TAU * 120 * i) / sr) * Math.min(1, i / (0.0005 * sr)) * (1 - i / n) ** 2;
    put(out, at + i, gain * (1.4 * f.hp + body));
  }
}

/**
 * The pull-out's fwoom (design §8.2): noise through a low-pass opening from `from` to `to` Hz as it swells over `len` samples, then
 * falling away over `tailMs`.
 */
export function fwoom(out, at, len, sr, { from = 300, to = 1200, gain = 0.08, tailMs = 60, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const tail = Math.round((tailMs / 1000) * sr);
  for (let i = 0; i < len + tail; i++) {
    const u = Math.min(1, i / len);
    f.process(r() * 2 - 1, from * (to / from) ** u, 0.9);
    const env = i < len ? u ** 1.5 : Math.exp((-4 * (i - len)) / tail) * (1 - (i - len) / tail);
    put(out, at + i, gain * 3 * env * f.lp);
  }
}

/** The editor's UI pop (design §8.2): a sine rising 400 → 1200 Hz in 30 ms over 20 ms of noise above 3 kHz. */
export function uiPop(out, at, sr, { gain = 0.07, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.03 * sr);
  const nNoise = Math.round(0.02 * sr);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    p += (400 * 3 ** u) / sr;
    f.process(i < nNoise ? (r() * 2 - 1) * (1 - i / nNoise) : 0, 3000, 0.7);
    const env = Math.min(1, i / (0.001 * sr)) * (1 - u);
    put(out, at + i, gain * (env * Math.sin(TAU * p) + 0.5 * f.hp));
  }
}

/**
 * The coaster's rail roar (design §8.2): noise through a low-pass that opens with his track speed — `speed(i)` px/f at sample i — and
 * louder with it (both saturating at `top` px/f), over `len` samples, with 5 ms edges. A wheel rumble at 55 Hz rides under it.
 * `wind` (0 = none, the roar as first built) adds the rush of air on the plunges: its own noise above 5 kHz, at `wind` × the square of
 * his speed, so it is near silent at the crawl and full where he falls fastest.
 */
export function roar(out, at, len, sr, { speed, top = 200, gain = 0.03, floor = 0.15, wind = 0, seed = 1 } = {}) {
  const r = rng(seed);
  const rw = rng(seed + 7919);
  const f = new SVF(sr);
  const g = new SVF(sr);
  const h = new SVF(sr);
  const edge = 0.005 * sr;
  let p = 0;
  for (let i = 0; i < len; i++) {
    const s = Math.min(1, Math.max(0, speed(i) / top));
    f.process(r() * 2 - 1, 300 + 4700 * s, 0.8);
    g.process(f.lp, 120, 0.7);
    p += (55 * (1 + 0.5 * s)) / sr;
    const edges = Math.min(1, i / edge, (len - i) / edge);
    const env = edges * (floor + (1 - floor) * s);
    let air = 0;
    if (wind) {
      h.process(rw() * 2 - 1, 5000, 0.7);
      air = wind * s * s * edges * h.hp;
    }
    put(out, at + i, gain * env * (f.lp - 0.5 * g.lp + 0.6 * Math.sin(TAU * p) * (0.5 + 0.5 * s)) + gain * air);
  }
}

/**
 * The sling's riser (v2: from the catch on 7.1 to the release, 144 frames): noise through a band (Q 3) sweeping `f0` → 12 kHz
 * exponentially, a saw climbing three octaves from 110 Hz under it, swelling as p^`curve` (p 0 → 1 over `len`): drums.mjs's riser
 * with the build's air brought forward. Stretched over a bar and a half, that one's p² from 300 Hz stays dark and quiet through the
 * whole sling; this one is a third of the way up the band by 7.3 and opens through the held breath.
 */
export function lift(out, at, len, sr, { f0 = 800, curve = 1.2, gain = 0.2, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    f.process(r() * 2 - 1, f0 * (12000 / f0) ** u, 3);
    put(out, at + i, gain * u ** curve * (f.bp + 0.25 * o.saw(110 * 8 ** u)));
  }
}

/** The lift hill's chain click (design §8.2): two 6 ms square ticks at `tone`, 6 ms apart, over 4 ms of noise above 5 kHz. */
export function chain(out, at, sr, { tone = 1800, gain = 0.05, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  const tickLen = Math.round(0.006 * sr);
  const n = 3 * tickLen;
  for (let i = 0; i < n; i++) {
    f.process(i < 0.004 * sr ? r() * 2 - 1 : 0, 5000, 0.7);
    const j = i < tickLen ? i : i - 2 * tickLen;
    const sq = j >= 0 && j < tickLen ? o.pulse(tone, 0.5) * Math.min(1, j / (0.0003 * sr)) * (1 - j / tickLen) * (i < tickLen ? 1 : 0.8) : 0;
    put(out, at + i, gain * (0.7 * sq + 1.2 * f.hp));
  }
}

/** The bottoms' sparks (design §8.2): `bursts` 4 ms bursts of noise above 6 kHz spread over 30 ms, each a little quieter. */
export function sparks(out, at, sr, { gain = 0.05, bursts = 5, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const spacing = Math.round(0.03 * sr) / bursts;
  const len = Math.round(0.004 * sr);
  const n = Math.round(0.03 * sr) + len;
  const starts = Array.from({ length: bursts }, (_, k) => (k ? Math.round(k * spacing + (r() - 0.5) * 0.3 * spacing) : 0));
  for (let i = 0; i < n; i++) {
    let x = 0;
    starts.forEach((s, k) => {
      const j = i - s;
      if (j >= 0 && j < len) x += (r() * 2 - 1) * (1 - j / len) * 0.85 ** k;
    });
    f.process(x, 6000, 0.7);
    put(out, at + i, gain * 1.8 * f.hp);
  }
}

/** The rewind (design §8.2 rewind zip): noise and a saw buzz whose pitch falls from `from` to `to` Hz over `len` samples, a tape rewinding. */
export function rewind(out, at, len, sr, { from = 1200, to = 200, gain = 0.08, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const o = new Osc(sr);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const hz = from * (to / from) ** u;
    const buzz = o.saw(hz);
    f.process(0.6 * buzz + 0.6 * (r() * 2 - 1), 2.5 * hz, 1.2);
    const env = Math.min(1, i / (0.002 * sr)) * Math.min(1, (len - i) / (0.004 * sr)) * (0.6 + 0.4 * Math.abs(Math.sin(TAU * 30 * (i / sr))));
    put(out, at + i, gain * env * f.lp);
  }
}

/**
 * The four cars ramming his back (design §8.2 car crunch): `hits` thumps `spacing` samples apart (one frame), each a sine falling
 * 140 → 80 Hz over 40 ms with 20 ms of noise below 1.5 kHz, each a little quieter.
 */
export function crunch(out, at, sr, { hits = 4, spacing = sr / 60, gain = 0.08, seed = 1 } = {}) {
  const r = rng(seed);
  const n = Math.round(0.04 * sr);
  const nNoise = Math.round(0.02 * sr);
  for (let k = 0; k < hits; k++) {
    const f = new SVF(sr);
    const s = Math.round(k * spacing);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      p += (140 * (80 / 140) ** u) / sr;
      f.process(i < nNoise ? (r() * 2 - 1) * (1 - i / nNoise) : 0, 1500, 0.8);
      const env = Math.min(1, i / (0.0006 * sr)) * (1 - u) ** 1.5;
      put(out, at + s + i, gain * 0.9 ** k * (env * Math.sin(TAU * p) + 0.9 * f.lp));
    }
  }
}

/** The band catching him (design §8.2 band boing): a sine 120 → 240 → 160 Hz over 200 ms and a rubber squeak 1200 → 700 Hz of 90 ms. */
export function boing(out, at, sr, { gain = 0.12 } = {}) {
  const n = Math.round(0.2 * sr);
  const nSq = Math.round(0.09 * sr);
  let p = 0;
  let q = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const hz = u < 0.3 ? 120 * 2 ** (u / 0.3) : 240 * (160 / 240) ** ((u - 0.3) / 0.7);
    p += hz / sr;
    const sq = i < nSq ? 1200 * (700 / 1200) ** (i / nSq) : 0;
    q += sq / sr;
    const env = Math.min(1, i / (0.001 * sr)) * (1 - u) ** 1.2 * (1 + 0.25 * Math.sin(TAU * 18 * (i / sr)));
    const squeak = i < nSq ? 0.35 * Math.sin(TAU * q) * (1 - i / nSq) * Math.min(1, i / (0.002 * sr)) : 0;
    put(out, at + i, gain * (env * Math.sin(TAU * p) + squeak));
  }
}

/**
 * The stack's brackets landing on the cords (design §8.2 link ticks): `n` 5 ms sine ticks `spacing` samples apart (half a frame), the first
 * at `from` Hz and each a semitone higher.
 */
export function links(out, at, sr, { n = 8, spacing = sr / 120, from = 3000, gain = 0.02 } = {}) {
  const len = Math.round(0.005 * sr);
  for (let k = 0; k < n; k++) {
    const hz = from * 2 ** (k / 12);
    const s = Math.round(k * spacing);
    for (let i = 0; i < len; i++) put(out, at + s + i, gain * Math.sin((TAU * hz * i) / sr) * Math.min(1, i / (0.0003 * sr)) * (1 - i / len));
  }
}

/** The cursor bonked off the window (design §8.2): a sine falling 900 → 400 Hz over 60 ms on a click. */
export function bonk(out, at, sr, { gain = 0.05, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.06 * sr);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    p += (900 * (400 / 900) ** u) / sr;
    f.process(i < 0.0015 * sr ? r() * 2 - 1 : 0, 3500, 0.7);
    put(out, at + i, gain * (Math.min(1, i / (0.0005 * sr)) * (1 - u) * Math.sin(TAU * p) + 0.8 * f.hp));
  }
}

/**
 * The soap film catching the light (design §8.2 film shimmer): an FM bell cluster (`freqs`) swelling from `at` over `swell` samples into a
 * glassy high pad that holds to `len` (each tone trembling ±6 cents, panned across), into the stereo pair. Its last 10 ms fade out.
 */
export function shimmer(outL, outR, at, len, swell, sr, { freqs = [2217.46, 2793.83, 3322.44], gain = 0.01 } = {}) {
  const fade = 0.01 * sr;
  freqs.forEach((hz, k) => {
    const [l, r] = panGains(-0.5 + (k / Math.max(1, freqs.length - 1)) * 1.0);
    let pc = 0;
    let pm = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const f = hz * 2 ** ((6 / 1200) * Math.sin(TAU * (4.5 + 1.3 * k) * t));
      pc += f / sr;
      pm += (f * 2.01) / sr;
      const env = Math.min(1, (i / swell) ** 2) * Math.min(1, (len - i) / fade);
      const idx = 0.6 + 0.4 * Math.sin(TAU * 0.7 * t + k);
      const v = gain * env * Math.sin(TAU * pc + idx * Math.sin(TAU * pm));
      put(outL, at + i, v * l);
      put(outR, at + i, v * r);
    }
  });
}

/**
 * A crash played backwards (design §8.2 reversed crash): noise through a broad band-pass at `freq`, swelling exponentially over `len`
 * samples into sample `end` (its last sample is end − 1: silent at the start, the peak at the end).
 */
export function reverseNoise(out, end, len, sr, { freq = 6000, q = 0.7, gain = 0.1, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const buf = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    f.process(r() * 2 - 1, freq, q);
    buf[i] = bp(f, q) * Math.exp((-5 * i) / len);
  }
  for (let i = 0; i < len; i++) put(out, end - 1 - i, gain * buf[i] * Math.min(1, i / (0.0015 * sr)) * Math.min(1, (len - i) / (0.003 * sr)));
}

/**
 * The band let go (design §8.2 thwang): a plucked saw at `freq` (C♯2) through a low-pass closing 2 kHz → 300 Hz in 80 ms, its pitch
 * dropping 30 cents, with a twang partial at 440 Hz; 250 ms in all, under −60 dB at its end.
 */
export function thwang(out, at, sr, { freq = 69.3, gain = 0.18 } = {}) {
  const o = new Osc(sr);
  const f = new SVF(sr);
  const n = Math.round(0.25 * sr);
  let q = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const hz = freq * 2 ** (-0.3 / 12 * Math.min(1, t / 0.12));
    f.process(o.saw(hz), 300 + 1700 * Math.exp(-t / 0.03), 1.4);
    q += (440 * 2 ** (-0.3 / 12 * Math.min(1, t / 0.12))) / sr;
    const env = Math.min(1, i / (0.0008 * sr)) * Math.exp(-t / 0.032);
    put(out, at + i, gain * env * (f.lp + 0.3 * Math.sin(TAU * q) * Math.exp(-t / 0.02)));
  }
}

/**
 * The film catching him (design §8.2 bwomp): a sine falling 110 → 62 Hz over 90 ms then dying over 60 ms, a puff of noise below 600 Hz
 * (60 ms) and a rubber squeak 1200 → 700 Hz (70 ms); 150 ms in all, under −60 dB at its end.
 */
export function bwomp(out, at, sr, { gain = 0.16, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.15 * sr);
  const sweep = 0.09 * sr;
  const nSq = Math.round(0.07 * sr);
  let p = 0;
  let q = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    p += (110 * (62 / 110) ** Math.min(1, i / sweep)) / sr;
    q += (1200 * (700 / 1200) ** Math.min(1, i / nSq)) / sr;
    f.process(i < 0.06 * sr ? (r() * 2 - 1) * (1 - t / 0.06) : 0, 600, 0.7);
    const env = Math.min(1, i / (0.002 * sr)) * (i < sweep ? 1 : Math.exp(-(i - sweep) / (0.009 * sr)));
    const squeak = i < nSq ? 0.25 * Math.sin(TAU * q) * Math.min(1, i / (0.002 * sr)) * (1 - i / nSq) ** 2 : 0;
    put(out, at + i, gain * (env * Math.sin(TAU * p) + 0.6 * f.lp + squeak));
  }
}

