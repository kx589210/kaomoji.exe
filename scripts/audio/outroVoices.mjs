// The ending's own voices (the part 'outro'; sections/outro.mjs plays them): a CRT switching off — powerOn played backwards, its flyback
// whine falling as the raster collapses — the thin whine of the line that is left, a damped FM electric piano that can sag when the
// power goes, the choke that stops the band clean on a cue, and S01's cursor tick exactly as the mix renders it on frame 0, so the
// film's last sound is its first. Then the 4-bar ending's (build sheet notes/b58/ending-sheet.md §8): the heartbeat's thump, the
// heart monitor's tone, the guest's closed-mouth "hm", a spring's boing, the ✧'s twinkle, the replication bloop, the relay's thunk, and
// a resampler for keys played lower. Deterministic for a seed (5000s, the ending's range).
import { rng } from '../../src/engine/random.ts';
import { blip } from './drums.mjs';
import { Biquad, SVF } from './filters.mjs';
import { Osc } from './osc.mjs';
import { plate } from './reverb.mjs';

const TAU = 2 * Math.PI;

/**
 * S01's cursor tick (sections/intro.mjs places it on each of the cursor's blinks, the first on frame 0, together with the CRT powering
 * on): a 10 ms square blip at 1760 Hz. tests/outroAudio.test.mjs checks the intro still plays exactly this.
 */
export const TICK = { freq: 1760, ms: 10, gain: 0.05 };

/**
 * A CRT switching off over `len` samples from `at`; the picture's line lands on `at + len`, where everything here stops (a 1 ms ramp)
 * and the pop takes over:
 * - the flyback whine falls from `from` to `to` Hz as the raster collapses, its pitch following the squeeze (1 − u³: slowly, then fast);
 * - powerOn's thump played backwards: a low sine whose pitch rises 38 → 78 Hz as it swells into the line;
 * - its static thickening into the line instead of thinning out.
 * `whine`, `thump` and `crackle` are the three parts' levels.
 */
export function powerOff(out, at, len, sr, { gain = 0.3, from = 7200, to = 900, whine = 0.35, thump = 0.9, crackle = 0.45, seed = 5001 } = {}) {
  const r = rng(seed);
  const hiss = new SVF(sr);
  const ramp = Math.max(1, Math.round(0.001 * sr));
  let pt = 0;
  let pw = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const tau = (len - i) / sr; // seconds to the line: powerOn's t, reversed
    pt += (38 + 40 * Math.exp(-tau / 0.05)) / sr;
    pw += (to + (from - to) * (1 - u * u * u)) / sr;
    pt -= Math.floor(pt);
    pw -= Math.floor(pw);
    const x = r() < 0.16 * Math.exp(-tau / 0.05) ? r() * 2 - 1 : 0;
    hiss.process(x, 4500, 0.8);
    const env = Math.min(1, i / (0.003 * sr)) * Math.min(1, (len - i) / ramp);
    const v = thump * Math.sin(TAU * pt) * Math.exp(-tau / 0.035) + crackle * hiss.bp + whine * (0.6 + 0.4 * u) * Math.sin(TAU * pw);
    const j = at + i;
    if (j >= 0 && j < out.length) out[j] += gain * env * v;
  }
}

/**
 * The line's thin whine: a sine at `freq(k)` Hz at its k-th sample (the ending traces the ω dip with it), from `at` for `len` samples,
 * decaying over `decayMs` and ramped to silence on its last 1.5 ms.
 */
export function lineWhine(out, at, len, sr, { gain = 0.02, freq = () => 11000, decayMs = 60 } = {}) {
  const ramp = Math.max(1, Math.round(0.0015 * sr));
  let ph = 0;
  for (let k = 0; k < len; k++) {
    ph += freq(k) / sr;
    ph -= Math.floor(ph);
    const t = k / sr;
    const env = Math.min(1, t / 0.001) * Math.exp(-t / (decayMs / 1000)) * Math.min(1, (len - 1 - k) / ramp);
    const j = at + k;
    if (j >= 0 && j < out.length) out[j] += gain * env * Math.sin(TAU * ph);
  }
}

/**
 * The wink's ting (iteration 3: the FM bell it replaced threw most of its energy above 8 kHz, so the wink lifted the mix's 2–8 kHz band
 * only 2–3 dB): a struck bright bar, additive so every partial lands where it is heard — `freq`, its fifth, its octave and a high
 * major third (× 1, 1.5, 2, 2.52; F♯7 gives 2960, 4440, 5920, 7459 Hz), the higher ones quieter and shorter — struck in 1 ms and
 * ringing over `decay` s. Fixed partial phases keep its crest low; its peak never passes `gain`. Mono, into `out` from `at`.
 */
const TING = [
  { ratio: 1, amp: 1, decay: 1, phase: 0 },
  { ratio: 1.5, amp: 0.55, decay: 0.7, phase: 1.9 },
  { ratio: 2, amp: 0.45, decay: 0.5, phase: 4.1 },
  { ratio: 2.52, amp: 0.3, decay: 0.35, phase: 2.7 },
];
export function ting(out, at, sr, { freq, gain = 0.2, decay = 0.5 } = {}) {
  const n = Math.round(decay * 6 * sr);
  const norm = 1 / TING.reduce((a, p) => a + p.amp, 0);
  for (let i = 0; i < n; i++) {
    const j = at + i;
    if (j >= out.length) break;
    if (j < 0) continue;
    const t = i / sr;
    const strike = Math.min(1, t / 0.001);
    let v = 0;
    for (const p of TING) v += p.amp * Math.exp(-t / (decay * p.decay)) * Math.sin(TAU * freq * p.ratio * t + p.phase);
    out[j] += gain * norm * strike * v;
  }
}

/**
 * The ω's dip, heard (iteration 3: the line bends into his mouth on outro 1.4, alone over the swell): a soft sine blip whose pitch droops
 * from `from` to `to` Hz over its `ms`, struck in 2 ms and faded over its second half. Mono, into `out` from `at`.
 */
export function dipBoop(out, at, sr, { from = 1109, to = 740, ms = 70, gain = 0.06 } = {}) {
  const n = Math.round((ms / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const u = i / n;
    ph += (from * (to / from) ** Math.min(1, 2 * u)) / sr;
    ph -= Math.floor(ph);
    const env = Math.min(1, i / (0.002 * sr)) * (u < 0.5 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (2 * u - 1)));
    if (j >= 0) out[j] += gain * env * Math.sin(TAU * ph);
  }
}

/**
 * An FM electric piano (build sheet §6.5: fmBell's tone at ratio 1, index 0.8, an 8 ms attack and a 2.5 s decay) with a tine — a
 * brief ratio-14 modulation on the strike — and a damper: each note { at, len, freq, gain } (samples, Hz) is lifted `len` samples in
 * (the next chord) and silent 60 ms later. `bend(j)` (semitones) and `amp(j)` (0–1), at output sample j, shape every note: the
 * power-down when the program exits.
 */
export function ePiano(out, notes, sr, { bend = () => 0, amp = () => 1, index = 0.8, decay = 2.5, attackMs = 8, tine = 0.3 } = {}) {
  const rel = Math.round(0.06 * sr);
  for (const note of notes) {
    const n = Math.min(note.len + rel, Math.round(decay * 5 * sr));
    let pc = 0;
    let pt = 0;
    for (let i = 0; i < n; i++) {
      const j = note.at + i;
      if (j >= out.length) break;
      const t = i / sr;
      const f = note.freq * 2 ** (bend(j) / 12);
      pc += f / sr;
      pt += (14 * f) / sr;
      pc -= Math.floor(pc);
      pt -= Math.floor(pt);
      const env = Math.min(1, t / (attackMs / 1000)) * Math.exp(-t / decay) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      const body = Math.sin(TAU * pc + index * Math.exp(-t / (decay * 0.35)) * Math.sin(TAU * pc));
      const ping = tine * Math.exp(-t / 0.25) * Math.sin(TAU * pc + 1.5 * Math.exp(-t / 0.02) * Math.sin(TAU * pt));
      if (j >= 0) out[j] += note.gain * amp(j) * env * (body + ping);
    }
  }
}

/** A stereo tremolo on `bus` over samples [from, to): `rate` Hz, the two sides in opposite phase (the suitcase piano's), `depth` 0–1. In place. */
export function tremolo(bus, from, to, sr, { rate = 4, depth = 0.15 } = {}) {
  for (let i = Math.max(0, from); i < Math.min(to, bus.L.length); i++) {
    const s = Math.sin((TAU * rate * (i - from)) / sr);
    bus.L[i] *= 1 - depth * (0.5 + 0.5 * s);
    bus.R[i] *= 1 - depth * (0.5 - 0.5 * s);
  }
}

/**
 * The choke (a hand on the cymbal, the band stopping on a cue) on one channel `x`: from sample `from` it falls to silence on a raised
 * cosine over `len` samples — a clean stop, not a fade, and no click — and is exactly zero after. In place. The ending's band stops so
 * on his bow, before the reverb, while the tonic rings on (sections/outro.mjs RING, U6).
 */
export function chokeChannel(x, from, len) {
  for (let i = Math.max(0, from); i < x.length; i++) {
    const k = i - from;
    x[i] *= k < len ? 0.5 + 0.5 * Math.cos((Math.PI * k) / len) : 0;
  }
}
/** The choke on a stereo pair `L`, `R` (chokeChannel on each). In place. */
export function choke(L, R, from, len) {
  chokeChannel(L, from, len);
  chokeChannel(R, from, len);
}

/**
 * S01's cursor tick as the finished mix holds it on frame 0 (bgm.mjs mixdown): the blip on the fx bus, centred, plus the bus's send
 * into the plate (0.22, wet 0.9, the plate restarting there), the mid high-passed at 20 Hz and the side at 150 Hz; the limiter leaves
 * it alone. { L, R }, 0.4 s. tests/outroAudio.test.mjs checks it against mixdown itself.
 */
export function cursorTick(sr) {
  const n = Math.round(0.4 * sr);
  const dry = new Float32Array(n);
  blip(dry, 0, sr, TICK);
  const bus = Float32Array.from(dry, (v) => Math.SQRT1_2 * v);
  const send = Float32Array.from(bus, (v) => 0.22 * v);
  const wet = plate(send, send, sr, { predelayMs: 18, decay: 0.62, damping: 0.4 });
  const side = Biquad.highpass(sr, 150);
  const lowCut = Biquad.highpass(sr, 20);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const l = bus[i] + 0.9 * wet.L[i];
    const r = bus[i] + 0.9 * wet.R[i];
    const mid = lowCut.process(0.5 * (l + r));
    const s = side.process(0.5 * (l - r));
    L[i] = mid + s;
    R[i] = mid - s;
  }
  return { L, R };
}

// ——— The 4-bar ending's voices (build sheet §8) ———————————————————————————————————————————————————————————————————————————————

const put = (out, j, v) => {
  if (j >= 0 && j < out.length) out[j] += v;
};

/**
 * The heartbeat (the lub and the dub, the knocks from inside the dot; drop 2's bullet-time thumps are the same voice): a sub sine whose
 * pitch falls from 1.6 × `freq` to `freq` over its first 15 ms, struck in 2 ms and dying over `decayMs` (τ), softly saturated (tanh 1.6,
 * so a phone hears its third harmonic) and scaled so its peak is exactly `gain`. Mono, into `out` from `at`; 6 τ long.
 */
export function heartThump(out, at, sr, { freq = 61.7, gain = 0.126, decayMs = 70 } = {}) {
  const n = Math.round((6 * decayMs * sr) / 1000);
  const buf = new Float32Array(n);
  let ph = 0;
  let pk = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * (1 + 0.6 * Math.exp(-t / 0.005))) / sr;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / (decayMs / 1000)) * Math.min(1, (n - i) / (0.003 * sr));
    buf[i] = Math.tanh(1.6 * env * Math.sin(2 * Math.PI * ph));
    pk = Math.max(pk, Math.abs(buf[i]));
  }
  for (let i = 0; i < n; i++) put(out, at + i, (gain / pk) * buf[i]);
}

/** A heart monitor's tone: a sine at `freq` for `len` samples from `at`, rising over `attackMs` and falling over its last `releaseMs` (no click either end). */
export function monitorTone(out, at, len, sr, { freq, gain = 0.025, attackMs = 10, releaseMs = 10 }) {
  const att = Math.max(1, (attackMs / 1000) * sr);
  const rel = Math.max(1, (releaseMs / 1000) * sr);
  for (let i = 0; i < len; i++) {
    const env = Math.min(1, i / att, (len - i) / rel);
    put(out, at + i, gain * env * Math.sin((2 * Math.PI * freq * i) / sr));
  }
}

/**
 * A closed-mouth hum ("hm", "hm-hm": the guest being smug, then content): a softened pulse at `note(t)` (MIDI, t in s from `at`) through
 * a nasal resonance (250 Hz) and a 900 Hz low-pass, sounding only inside `syllables` ([from, to] in s), each opening over 12 ms and
 * closing over 30 ms, with a breath of air. Its peak stays under `gain`. Mono, into `out` from `at`.
 */
export function hum(out, at, sr, { note, syllables, gain = 0.05, seed = 5000 }) {
  const r = rng(seed);
  const src = new Osc(sr);
  const nasal = new SVF(sr);
  const lp = [Biquad.lowpass(sr, 900), Biquad.lowpass(sr, 900)];
  const end = Math.max(...syllables.map(([, b]) => b)) + 0.04;
  const n = Math.round(end * sr);
  const buf = new Float32Array(n);
  let soft = 0;
  let pk = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let env = 0;
    for (const [a, b] of syllables) if (t >= a) env = Math.max(env, Math.min(1, (t - a) / 0.012) * (t < b ? 1 : Math.max(0, 1 - (t - b) / 0.03)));
    soft += 0.25 * (src.pulse(440 * 2 ** ((note(t) - 69) / 12), 0.3) - soft);
    nasal.process(soft + 0.03 * (r() * 2 - 1), 250, 3);
    const y = lp.reduce((v, f) => f.process(v), 0.6 * nasal.bp + 0.4 * soft);
    buf[i] = env * y;
    pk = Math.max(pk, Math.abs(buf[i]));
  }
  if (pk > 0) for (let i = 0; i < n; i++) put(out, at + i, (gain / pk) * buf[i]);
}

/** A spring's boing: a sine at `freq` whose pitch wobbles ± `depth` semitones at `hz`, the wobble dying faster (τ 50 ms) than the tone (τ `ms` / 3). Mono. */
export function boing(out, at, sr, { freq, gain = 0.04, ms = 260, hz = 14, depth = 1.5 }) {
  const n = Math.round((ms / 1000) * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += (freq * 2 ** ((depth * Math.exp(-t / 0.05) * Math.sin(2 * Math.PI * hz * t)) / 12)) / sr;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / (ms / 3000)) * Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * env * Math.sin(2 * Math.PI * ph));
  }
}

/**
 * The ✧'s twinkle: a few high sines (`freqs`, around 8 kHz) each flickering at its own rate (23, 31, 37 … Hz), struck in 1 ms and gone
 * by `ms`. Mono, peak under `gain`.
 */
export function twinkle(out, at, sr, { freqs, gain = 0.02, ms = 140 }) {
  const n = Math.round((ms / 1000) * sr);
  const rates = [23, 31, 37, 43, 53];
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, t / 0.001) * Math.exp(-t / (ms / 3500)) * Math.min(1, (n - i) / (0.004 * sr));
    let v = 0;
    freqs.forEach((f, k) => {
      v += (0.5 + 0.5 * Math.sin(2 * Math.PI * rates[k % rates.length] * t + k)) * Math.sin(2 * Math.PI * f * t + 1.3 * k);
    });
    put(out, at + i, (gain * env * v) / freqs.length);
  }
}

/** A replication bloop: a sine popping in at `freq`, dipping `dip` semitones and back up within 40 ms (a fast down-up blip), dying over τ 70 ms. Mono. */
export function bloop(out, at, sr, { freq, gain = 0.05, dip = 5 }) {
  const n = Math.round(0.3 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const u = Math.min(1, t / 0.04);
    ph += (freq * 2 ** ((-dip * Math.sin(Math.PI * u)) / 12)) / sr;
    const env = Math.min(1, t / 0.0015) * Math.exp(-t / 0.07) * Math.min(1, (n - i) / (0.005 * sr));
    put(out, at + i, gain * env * Math.sin(2 * Math.PI * ph));
  }
}

/** The CRT's sync relay as the blue screen takes over: a dry mechanical clack (band-passed noise, 3 ms) over a low thud (110 → 55 Hz, τ 40 ms). Mono. */
export function relay(out, at, sr, { gain = 0.15, seed = 5000 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.2 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(i < 0.003 * sr ? r() * 2 - 1 : 0, 1800, 1.5);
    ph += (55 + 55 * Math.exp(-t / 0.012)) / sr;
    const thud = Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.04) * Math.min(1, t / 0.001);
    put(out, at + i, gain * (1.4 * f.bp * Math.exp(-t / 0.006) + 0.8 * thud));
  }
}

/** `buf` played `semitones` higher (negative: lower, and longer) by linear-interpolated resampling: the ↑ key pressed lower. A new buffer. */
export function repitch(buf, semitones) {
  const rate = 2 ** (semitones / 12);
  const n = Math.floor((buf.length - 1) / rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * rate;
    const k = Math.floor(x);
    out[i] = buf[k] + (buf[k + 1] - buf[k]) * (x - k);
  }
  return out;
}
