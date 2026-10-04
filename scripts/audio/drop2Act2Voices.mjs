// Drop 2's new voices (bars 5, 8–17 and the bullet time of 20; build sheet notes/bid2/drop2-sheet2.md §8, the music bible
// notes/prep/music.md §7 "new voices"): one per world and one per Defender gadget, each deterministic for a seed (8000–8999) and
// adding into `out` from sample `at`, silent before it. Built from Osc, SVF, Biquad and plain sines; no shared module changes.
//   the wave (10–11): taiko, koto (Karplus–Strong), the noise of the foam (noiseHit), the seal's wood (woodClack);
//   the arcade and the well (12–13): the NES-style triangle and LFSR noise (chipTriangle, chipNoise);
//   Memphis (14): the 80s gated hits, the cowbell, the FM slap bass, the orchestra hit (and its reverse for the J-cut);
//   the pictograms (15): synth brass, the drumline's snare, the timpani roll, the pea whistle, the boing;
//   the mirror trap and the bullet time (16–20): glass, the music box, the heartbeat, the grain freeze of the frozen chord;
//   Defender (dry, pitch class C, the bible's M8): beep (a square with a duty and a bend to C♯ when infected), clang (its box).
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { Osc } from './osc.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};
/** A fade over the last `share` of `n` samples (1 before it). */
const tail = (i, n, share = 0.1) => Math.min(1, (n - i) / Math.max(1, share * n));

/**
 * A taiko's DON: a membrane at `freq` whose pitch falls onto it from 1.6× over the first 25 ms, two inharmonic modes (1.59, 2.14) that
 * die faster, and the stick's slap (band-passed noise at 2 kHz, gone in 10 ms); a little saturation. About 4 decays long.
 */
export function taiko(out, at, sr, { freq = 62, gain = 0.5, decayMs = 450 } = {}, seed = 8000) {
  const r = rng(seed);
  const slap = new SVF(sr);
  const tau = decayMs / 1000;
  const n = Math.round(4 * tau * sr);
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const bend = 1 + 0.6 * Math.exp(-t / 0.025);
    p1 += (freq * bend) / sr;
    p2 += (1.59 * freq * bend) / sr;
    p3 += (2.14 * freq * bend) / sr;
    const body = Math.sin(2 * Math.PI * p1) * Math.exp(-t / tau) + 0.35 * Math.sin(2 * Math.PI * p2) * Math.exp((-3 * t) / tau) + 0.2 * Math.sin(2 * Math.PI * p3) * Math.exp((-5 * t) / tau);
    slap.process(r() * 2 - 1, 2000, 0.7);
    const env = Math.min(1, t / 0.0015) * tail(i, n, 0.2);
    put(out, at + i, gain * env * Math.tanh(1.3 * (body + 1.4 * slap.bp * Math.exp(-t / 0.006))));
  }
}

/**
 * A koto string (Karplus–Strong): a burst of noise (its brightness `bright`, 0–1) circulating in a delay tuned to `freq` (a two-point
 * average and a first-order all-pass make up the fraction), losing 60 dB in `decay` s, darker every pass; plus the plectrum's click.
 */
export function koto(out, at, sr, { freq, gain = 0.2, decay = 1.2, bright = 0.6 } = {}, seed = 8001) {
  const r = rng(seed);
  const period = sr / freq;
  let D = Math.floor(period - 0.5);
  let frac = period - 0.5 - D;
  if (frac < 0.2) {
    D -= 1;
    frac += 1;
  }
  const c = (1 - frac) / (1 + frac);
  const g = 0.001 ** (1 / (freq * decay));
  const line = new Float32Array(D);
  let lp = 0;
  let mean = 0;
  for (let k = 0; k < D; k++) {
    lp += bright * (r() * 2 - 1 - lp);
    line[k] = lp;
    mean += lp / D;
  }
  for (let k = 0; k < D; k++) line[k] -= mean;
  const click = new SVF(sr);
  const n = Math.round(1.3 * decay * sr);
  let p = 0;
  let s1 = 0;
  let a1 = 0;
  let y1 = 0;
  for (let i = 0; i < n; i++) {
    const s = line[p];
    const a = 0.5 * (s + s1);
    s1 = s;
    const y = c * a + a1 - c * y1;
    a1 = a;
    y1 = y;
    line[p] = g * y;
    p = (p + 1) % D;
    click.process(i < 0.002 * sr ? r() * 2 - 1 : 0, 5000, 0.8);
    put(out, at + i, gain * (s + 0.3 * click.hp) * Math.min(1, i / 3) * tail(i, n, 0.15));
  }
}

/**
 * The NES-style triangle: 32 steps a cycle, 16 levels (a 4-bit staircase, −1 … 1), on each note { at, len, freq } (samples, Hz), with
 * 1 ms ramps at its edges; silent between notes.
 */
export function chipTriangle(out, notes, sr, { gain = 0.25 } = {}) {
  const ramp = Math.max(1, Math.round(0.001 * sr));
  for (const note of notes) {
    let ph = 0;
    for (let i = 0; i < note.len + ramp; i++) {
      const step = Math.floor(ph * 32) % 32;
      const level = step < 16 ? step : 31 - step;
      const env = Math.min(1, i / ramp) * (i < note.len ? 1 : 1 - (i - note.len) / ramp);
      put(out, note.at + i, gain * env * (level / 7.5 - 1));
      ph = (ph + note.freq / sr) % 1;
    }
  }
}

/**
 * The NES-style noise channel: a 15-bit LFSR clocked at `clockHz` (held between clocks), ±1, decaying over `decayMs`; `short` taps
 * bit 6 (the metallic 93-step loop) instead of bit 1.
 */
export function chipNoise(out, at, sr, { gain = 0.2, clockHz = 12000, decayMs = 40, attackMs = 0.5, short = false } = {}, seed = 8010) {
  let s = (1 + Math.floor(rng(seed)() * 32766)) & 0x7fff;
  const tap = short ? 6 : 1;
  const n = Math.min(Math.round((6 * decayMs * sr) / 1000), Math.max(0, out.length - at));
  const att = Math.max(1, (attackMs / 1000) * sr);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += clockHz / sr;
    while (acc >= 1) {
      acc -= 1;
      const fb = (s & 1) ^ ((s >> tap) & 1);
      s = (s >> 1) | (fb << 14);
    }
    const env = Math.min(1, i / att) * Math.exp(-i / ((decayMs / 1000) * sr)) * tail(i, n);
    put(out, at + i, gain * env * (s & 1 ? -1 : 1));
  }
}

/** A cowbell (the 808 recipe, tuned into F♯ major): squares on C♯5 and G♯5 through a band, a sharp knock and a short ring. */
export function cowbell(out, at, sr, { gain = 0.15, decayMs = 90 } = {}) {
  const a = new Osc(sr);
  const b = new Osc(sr, 0.37);
  const bp = new SVF(sr);
  const n = Math.round(0.5 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    bp.process(0.5 * (a.pulse(554.37) + b.pulse(830.61)), 1200, 0.8);
    const env = Math.min(1, t / 0.0008) * (0.6 * Math.exp(-t / 0.012) + 0.4 * Math.exp(-t / (decayMs / 1000))) * tail(i, n);
    put(out, at + i, gain * 1.6 * env * bp.bp);
  }
}

/**
 * A tambourine (Memphis's 80s 16ths): five inharmonic jingle partials (5.3–12.2 kHz) rattling at 70 Hz over band-passed noise (6–15
 * kHz), a 1 ms attack and a `decayMs` decay; about 160 ms long.
 */
export function tambourine(out, at, sr, { gain = 0.1, decayMs = 45 } = {}, seed = 8120) {
  const r = rng(seed);
  const hp = new SVF(sr);
  const lp = new SVF(sr);
  const partials = [5300, 7100, 8650, 10400, 12200].map((f) => ({ f: f * (0.98 + 0.04 * r()), ph: r() }));
  const n = Math.round(0.16 * sr);
  const tau = (decayMs / 1000) * sr;
  for (let i = 0; i < n; i++) {
    hp.process(r() * 2 - 1, 6000, 0.7);
    lp.process(hp.hp, 15000, 0.7);
    let j = 0;
    for (const p of partials) {
      p.ph += p.f / sr;
      j += Math.sin(2 * Math.PI * p.ph);
    }
    const rattle = 0.65 + 0.35 * Math.sin((2 * Math.PI * 70 * i) / sr);
    const env = Math.min(1, i / (0.001 * sr)) * Math.exp(-i / tau) * tail(i, n, 0.2);
    put(out, at + i, gain * env * rattle * (0.18 * j + 1.4 * lp.lp));
  }
}

/**
 * The 80s gated hit: a snare (body on `tone` and 1.47 × tone, bright noise) — or, with `tom` (Hz), a tom falling onto its pitch — with a
 * dense room of band-passed noise behind it, all of it cut dead `gateMs` after the hit (a 6 ms release).
 */
export function gatedHit(out, at, sr, { gain = 0.4, gateMs = 140, tone = 210, tom = 0 } = {}, seed = 8020) {
  const r = rng(seed);
  const wires = new SVF(sr);
  const room = new SVF(sr);
  const gate = (gateMs / 1000) * sr;
  const rel = 0.006 * sr;
  const n = Math.round(gate + rel);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const x = r() * 2 - 1;
    wires.process(x, 5200, 0.8);
    room.process(x, tom ? 900 : 1800, 0.5);
    let body;
    if (tom) {
      p1 += (tom * (1 + 0.3 * Math.exp(-t / 0.02))) / sr;
      body = Math.sin(2 * Math.PI * p1) * Math.exp(-t / 0.12);
    } else {
      const drop = 1 + 0.25 * Math.exp(-t / 0.012);
      p1 += (tone * drop) / sr;
      p2 += (1.47 * tone * drop) / sr;
      body = (Math.sin(2 * Math.PI * p1) + 0.6 * Math.sin(2 * Math.PI * p2)) * Math.exp(-t / 0.045) + 0.9 * (0.6 * wires.hp + 0.8 * wires.bp) * Math.exp(-t / 0.05);
    }
    const roomEnv = (tom ? 0.25 : 0.55) * Math.min(1, t / 0.005) * Math.exp(-t / 0.4);
    const g = i < gate ? 1 : Math.max(0, 1 - (i - gate) / rel);
    put(out, at + i, gain * g * Math.min(1, i / 3) * Math.tanh(body + roomEnv * room.bp * 2.2));
  }
}

/**
 * The FM slap bass (a two-operator 1:1 FM with its index falling 4.6 → 0.6 over 30 ms) on each note { at, len, freq } (samples, Hz),
 * with the slap itself on top (a 15 ms burst of noise at 2.5 kHz and a pop eight times the pitch); 1 ms attack, 10 ms release.
 */
export function fmSlap(out, notes, sr, { gain = 0.3 } = {}) {
  const rel = Math.round(0.01 * sr);
  notes.forEach((note, k) => {
    const r = rng(8030 + k);
    const bp = new SVF(sr);
    let pc = 0;
    let pm = 0;
    let pp = 0;
    for (let i = 0; i < note.len + rel; i++) {
      const t = i / sr;
      pc += note.freq / sr;
      pm += note.freq / sr;
      pp += (8 * note.freq) / sr;
      const idx = 0.6 + 4 * Math.exp(-t / 0.03);
      const body = Math.sin(2 * Math.PI * pc + idx * Math.sin(2 * Math.PI * pm)) * Math.exp(-t / 0.35);
      bp.process(i < 0.015 * sr ? r() * 2 - 1 : 0, 2500, 1.2);
      const slap = 0.6 * bp.bp + 0.25 * Math.sin(2 * Math.PI * pp) * Math.exp(-t / 0.008);
      const env = Math.min(1, t / 0.001) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      put(out, note.at + i, gain * env * Math.tanh(1.2 * (body + slap)));
    }
  });
}

/**
 * An orchestra hit: every pitch of `freqs` as two detuned saws and a square, through a low-pass closing 7 kHz → 1.2 kHz, with a burst
 * of noise for the attack; loud at once, held 30 ms, decaying over `decayMs`. With `reverse` it is played backwards and `at` is its end.
 */
export function orchHit(out, at, sr, { freqs, gain = 0.3, decayMs = 160, reverse = false } = {}, seed = 8030) {
  const r = rng(seed);
  const n = Math.round(0.6 * sr);
  const buf = new Float32Array(n);
  const oscs = freqs.flatMap((f) => [
    { o: new Osc(sr, r()), f: f * 2 ** (8 / 1200), w: 'saw' },
    { o: new Osc(sr, r()), f: f * 2 ** (-8 / 1200), w: 'saw' },
    { o: new Osc(sr, r()), f, w: 'pulse' },
  ]);
  const lp = new SVF(sr);
  const nb = new SVF(sr);
  const norm = 1 / Math.sqrt(freqs.length * 3);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let s = 0;
    for (const v of oscs) s += v.w === 'saw' ? v.o.saw(v.f) : 0.6 * v.o.pulse(v.f);
    lp.process(s * norm, 1200 + 5800 * Math.exp(-t / 0.06), 0.9);
    nb.process(r() * 2 - 1, 1500, 0.7);
    const env = Math.min(1, t / 0.002) * (t < 0.03 ? 1 : Math.exp(-(t - 0.03) / (decayMs / 1000))) * tail(i, n);
    buf[i] = env * Math.tanh(1.4 * (lp.lp + 0.5 * nb.bp * Math.exp(-t / 0.025)));
  }
  for (let i = 0; i < n; i++) {
    if (reverse) put(out, at - 1 - i, gain * buf[i]);
    else put(out, at + i, gain * buf[i]);
  }
}

/**
 * Synth brass stabs on notes { at, len, freq } (samples, Hz): two saws ±7 cents and a square, scooped up from −0.4 st over 25 ms,
 * through a low-pass that blats open over the first 30 ms (1.5 → 7 × the pitch) and settles; 12 ms attack, 60 ms release.
 */
export function brass(out, notes, sr, { gain = 0.2 } = {}) {
  const rel = Math.round(0.06 * sr);
  for (const note of notes) {
    const a = new Osc(sr, 0.1);
    const b = new Osc(sr, 0.6);
    const q = new Osc(sr, 0.3);
    const lp = new SVF(sr);
    for (let i = 0; i < note.len + rel; i++) {
      const t = i / sr;
      const f = note.freq * 2 ** ((-0.4 * Math.exp(-t / 0.012)) / 12);
      const s = a.saw(f * 2 ** (7 / 1200)) + b.saw(f * 2 ** (-7 / 1200)) + 0.5 * q.pulse(f, 0.5);
      const open = (1 - Math.exp(-t / 0.012)) * (0.55 + 0.45 * Math.exp(-t / 0.25));
      lp.process(s / 2.5, note.freq * (1.5 + 5.5 * open), 1.1);
      const env = Math.min(1, t / 0.012) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      put(out, note.at + i, gain * env * lp.lp);
    }
  }
}

/**
 * A marching tenor drum (one of the quads; v07, the drumline's first accents on 14.4): a tight, high-tension head on `freq` — its pitch
 * bent 25 % sharp at the stick and settling in 12 ms, a second mode at 1.5 × that dies in 25 ms — and the stick's crack (noise around
 * 3 kHz, 3 ms), softly saturated, dry; gone in about 200 ms.
 */
export function tenor(out, at, sr, { freq = 220, gain = 0.3 } = {}, seed = 8045) {
  const r = rng(seed);
  const stick = new SVF(sr);
  const n = Math.round(0.22 * sr);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const bend = 1 + 0.25 * Math.exp(-t / 0.012);
    p1 += (freq * bend) / sr;
    p2 += (1.5 * freq * bend) / sr;
    stick.process(t < 0.003 ? r() * 2 - 1 : 0, 3000, 0.9);
    const body = Math.sin(2 * Math.PI * p1) * Math.exp(-t / 0.07) + 0.4 * Math.sin(2 * Math.PI * p2) * Math.exp(-t / 0.025);
    put(out, at + i, gain * Math.min(1, i / 3) * tail(i, n, 0.2) * Math.tanh(1.2 * (body + 1.6 * stick.bp)));
  }
}

/** The drumline's snare: tight and high (330 Hz body, a 900 Hz rim ping), crisp wires above 3 kHz; gone in about 150 ms. */
export function marchSnare(out, at, sr, { gain = 0.3 } = {}, seed = 8040) {
  const r = rng(seed);
  const wires = new SVF(sr);
  const n = Math.round(0.25 * sr);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    p1 += (330 * (1 + 0.2 * Math.exp(-t / 0.008))) / sr;
    p2 += 900 / sr;
    wires.process(r() * 2 - 1, 6000, 0.7);
    const body = 0.8 * Math.sin(2 * Math.PI * p1) * Math.exp(-t / 0.025) + 0.5 * Math.sin(2 * Math.PI * p2) * Math.exp(-t / 0.006);
    const noise = (0.9 * wires.hp + 0.7 * wires.bp) * Math.exp(-t / 0.032);
    put(out, at + i, gain * Math.min(1, i / 3) * tail(i, n) * Math.tanh(body + 1.3 * noise));
  }
}

/**
 * A timpani roll from `at` for `len` samples: strokes `rate` a second (hands alternating, a hair uneven), each a tuned drum on `freq`
 * (its 2nd and 3rd harmonics fainter, a mallet's thud), swelling 0.3 → 1 over the roll; the last strokes ring on for a second.
 */
export function timpani(out, at, len, sr, { freq = 92.5, gain = 0.3, rate = 16 } = {}, seed = 8050) {
  const r = rng(seed);
  const strokes = Math.max(1, Math.floor((len / sr) * rate));
  const ring = Math.round(1.2 * sr);
  for (let k = 0; k < strokes; k++) {
    const s = Math.round((k * sr) / rate + (k > 0 ? (r() - 0.5) * 0.002 * sr : 0));
    const level = (0.3 + 0.7 * (k / Math.max(1, strokes - 1)) ** 1.5) * (0.9 + 0.2 * r());
    const thud = new SVF(sr);
    let ph = 0;
    for (let i = 0; i < ring; i++) {
      const t = i / sr;
      ph += (freq * (1 + 0.04 * Math.exp(-t / 0.015))) / sr;
      thud.process(i < 0.008 * sr ? r() * 2 - 1 : 0, 400, 0.7);
      const tone = (Math.sin(2 * Math.PI * ph) + 0.35 * Math.sin(4 * Math.PI * ph) + 0.15 * Math.sin(6 * Math.PI * ph)) * Math.exp(-t / 0.5);
      put(out, at + s + i, gain * level * Math.min(1, i / 3) * tail(i, ring, 0.2) * (tone + 0.8 * thud.lp));
    }
  }
}

/**
 * A music-box tine on `freq`: its fundamental ringing over `decay` s, the cantilever's high partial (6.27 ×) and a faint octave that
 * fade first, and the pin's click; a little saturation keeps it hard-edged.
 */
export function musicBox(out, at, sr, { freq, gain = 0.2, decay = 0.8 } = {}) {
  const r = rng(8055);
  const click = new SVF(sr);
  const n = Math.round(6 * decay * sr);
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    p1 += freq / sr;
    p2 += (2 * freq) / sr;
    p3 += (6.27 * freq) / sr;
    click.process(i < 0.0015 * sr ? r() * 2 - 1 : 0, 6000, 0.7);
    const v = Math.sin(2 * Math.PI * p1) * Math.exp(-t / decay) + 0.1 * Math.sin(2 * Math.PI * p2) * Math.exp(-t / 0.4) + 0.35 * Math.sin(2 * Math.PI * p3) * Math.exp(-t / 0.08) + 0.4 * click.hp;
    put(out, at + i, gain * Math.min(1, i / 3) * tail(i, n, 0.15) * Math.tanh(1.1 * v));
  }
}

/**
 * The frozen chord (the bullet time): Hann grains of 80–120 ms (`grainMs`) read from `src` at hashed places, each starting half the
 * last one's length after it (50 % overlap), from `at` for `len` samples; only whole grains, so nothing sounds outside it.
 */
export function grainFreeze(out, src, at, len, sr, { gain = 1, grainMs = [80, 120], seed = 8060 } = {}) {
  const r = rng(seed);
  let t = 0;
  for (;;) {
    const L = Math.round(((grainMs[0] + (grainMs[1] - grainMs[0]) * r()) / 1000) * sr);
    if (t + L > len || L >= src.length) break;
    const from = Math.floor(r() * (src.length - L));
    for (let i = 0; i < L; i++) put(out, at + t + i, gain * src[from + i] * Math.sin((Math.PI * i) / L) ** 2);
    t += Math.round(L / 2);
  }
}

/** A heartbeat's thump: a sine falling onto `freq` from 1.5× (10 ms), a 4 ms attack, a 70 ms decay; its peak is `gain`. */
export function heartbeat(out, at, sr, { freq = 69.3, gain = 0.126 } = {}) {
  const n = Math.round(0.35 * sr);
  const buf = new Float32Array(n);
  let ph = 0;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + 0.5 * Math.exp(-t / 0.01))) / sr;
    const env = (t < 0.004 ? Math.sin((Math.PI / 2) * (t / 0.004)) ** 2 : Math.exp(-(t - 0.004) / 0.07)) * tail(i, n, 0.2);
    buf[i] = env * Math.sin(2 * Math.PI * ph);
    peak = Math.max(peak, Math.abs(buf[i]));
  }
  for (let i = 0; i < n; i++) put(out, at + i, (gain / peak) * buf[i]);
}

/** A glass ting on `freq`: an FM bell (ratio 3.5) whose brightness is gone in 15 ms, over a pure tone decaying in `decay` s. */
export function glass(out, at, sr, { freq, gain = 0.05, decay = 0.18 } = {}) {
  const n = Math.round(5 * decay * sr);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    pc += freq / sr;
    pm += (3.5 * freq) / sr;
    const idx = 1.4 * Math.exp(-t / 0.005);
    const env = Math.min(1, t / 0.0005) * Math.exp(-t / decay) * tail(i, n);
    put(out, at + i, gain * env * Math.sin(2 * Math.PI * pc + idx * Math.sin(2 * Math.PI * pm)));
  }
}

/** A wooden clack (a domino, a seal): noise rung at `freq` (Q 6) and a sine on it, dry: gone in 60 ms. */
export function woodClack(out, at, sr, { freq = 1200, gain = 0.2 } = {}, seed = 8070) {
  const r = rng(seed);
  const bp = new SVF(sr);
  const n = Math.round(0.06 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += freq / sr;
    bp.process(r() * 2 - 1, freq, 6);
    const v = 2.5 * bp.bp * Math.exp(-t / 0.004) + 0.8 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.006);
    put(out, at + i, gain * Math.min(1, i / 2) * tail(i, n, 0.3) * Math.tanh(v));
  }
}

/**
 * Defender's beep (the bible's M8: dry, a square): `ms` long on `freq`, its duty `duty` (DC removed), gliding to `to` over its last
 * `bendMs` (C bending to C♯ when it is infected); 1 ms attack, 3 ms release inside its length.
 */
export function beep(out, at, sr, { freq, to = freq, ms = 60, bendMs = 0, duty = 0.5, gain = 0.1 } = {}) {
  const o = new Osc(sr);
  const n = Math.round((ms / 1000) * sr);
  const b0 = n - Math.round((bendMs / 1000) * sr);
  const rel = Math.round(0.003 * sr);
  for (let i = 0; i < n; i++) {
    const f = i < b0 ? freq : freq * (to / freq) ** ((i - b0) / Math.max(1, n - b0));
    const env = Math.min(1, i / (0.001 * sr)) * Math.min(1, (n - i) / rel);
    put(out, at + i, gain * env * (o.pulse(f, duty) - (2 * duty - 1)));
  }
}

/** A metal clang (the quarantine box): six inharmonic partials of `freq` ringing down, the higher faster, over a struck noise. */
export function clang(out, at, sr, { freq = 180, gain = 0.3 } = {}, seed = 8080) {
  const r = rng(seed);
  const strike = new SVF(sr);
  const parts = [[1, 1, 0.35], [2.32, 0.7, 0.3], [3.76, 0.5, 0.22], [5.41, 0.4, 0.15], [7.03, 0.3, 0.1], [8.9, 0.2, 0.07]];
  const ph = parts.map(() => r());
  const n = Math.round(2 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    parts.forEach(([m, a, d], k) => {
      ph[k] += (m * freq) / sr;
      v += a * Math.sin(2 * Math.PI * ph[k]) * Math.exp(-t / d);
    });
    strike.process(r() * 2 - 1, 3000, 0.9);
    put(out, at + i, gain * Math.min(1, i / 3) * tail(i, n, 0.2) * Math.tanh(0.5 * v + 1.5 * strike.bp * Math.exp(-t / 0.006)));
  }
}

/** A pea whistle on `freq`: the pea's trill (±2.5 % at `trill` Hz, and its flutter in level) with a breath of noise on the pitch. */
export function whistle(out, at, sr, { freq = 2800, ms = 200, gain = 0.1, trill = 30 } = {}, seed = 8090) {
  const r = rng(seed);
  const breath = new SVF(sr);
  const n = Math.round((ms / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + 0.025 * Math.sin(2 * Math.PI * trill * t))) / sr;
    breath.process(r() * 2 - 1, freq, 4);
    const am = 0.7 + 0.3 * Math.abs(Math.sin(2 * Math.PI * trill * t));
    const env = Math.min(1, t / 0.01) * Math.min(1, (n - i) / (0.02 * sr));
    put(out, at + i, gain * env * am * (Math.sin(2 * Math.PI * ph) + 0.4 * breath.bp));
  }
}

/** A spring's boing: a sine on `freq` wobbling ±`depth` at `hz`, the wobble dying in 80 ms, the sound in `ms`. */
export function boing(out, at, sr, { freq = 300, gain = 0.1, ms = 300, hz = 12, depth = 0.25 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + depth * Math.exp(-t / 0.08) * Math.sin(2 * Math.PI * hz * t))) / sr;
    put(out, at + i, gain * Math.min(1, t / 0.002) * Math.exp(-t / (ms / 3000)) * tail(i, n) * Math.sin(2 * Math.PI * ph));
  }
}

/**
 * Band-limited noise (two 2-pole high-passes at `lo`, two low-passes at `hi`): a quadratic swell over `attackMs`, held `holdMs`, decaying
 * over `decayMs`. The foam, the flood, the voxel burst, the panel slams.
 */
export function noiseHit(out, at, sr, { lo = 400, hi = 3000, attackMs = 5, holdMs = 0, decayMs = 80, gain = 0.3 } = {}, seed = 8100) {
  const r = rng(seed);
  const f = [new SVF(sr), new SVF(sr), new SVF(sr), new SVF(sr)];
  const att = (attackMs / 1000) * sr;
  const hold = (holdMs / 1000) * sr;
  const n = Math.round(att + hold + (5 * decayMs * sr) / 1000);
  for (let i = 0; i < n; i++) {
    f[0].process(r() * 2 - 1, lo, Math.SQRT1_2);
    f[1].process(f[0].hp, lo, Math.SQRT1_2);
    f[2].process(f[1].hp, hi, Math.SQRT1_2);
    f[3].process(f[2].lp, hi, Math.SQRT1_2);
    const env = (i < att ? (i / att) ** 2 : i < att + hold ? 1 : Math.exp(-(i - att - hold) / ((decayMs / 1000) * sr))) * tail(i, n);
    put(out, at + i, gain * 2 * env * f[3].lp);
  }
}
