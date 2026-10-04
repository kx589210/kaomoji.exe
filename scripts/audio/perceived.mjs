// Perceived loudness and sharpness of the soundtrack (the continuity plan's FW7, docs/2026-10-03-continuity-plan-v07.md §8; the review
// of 10-03: sections that measure the same can still sound very different in loudness, because their spectra differ). BS.1770 LUFS (K-weighting: a shelf and a
// high-pass, gated) does not model the ear's 2–5 kHz sensitivity, its level-dependent equal-loudness contours, masking, or how much louder
// and harsher broadband noise sounds than a tone of the same power. This measures what the plan asks for, per 16th, beat and bar:
//   sones     loudness of a Zwicker-type model — NOT a certified ISO 532-1 implementation, a documented approximation of it (the plan allows
//             one), built from published formulas only:
//               1. the power spectrum of each 16th (100 ms: Zwicker's temporal integration; a 4800-sample Hann window, an 8192-point FFT),
//                  L and R averaged (diotic), at a listening level of CAL_DB: a full-scale RMS signal (0 dBFS RMS) plays at 90 dB SPL, so the
//                  film's −11 LUFS sits near 79 dB SPL — loud headphones or a laptop turned up;
//               2. the outer and middle ear (ITU-R BS.1387 PEAQ, after Terhardt 1979): W(f) = −0.6·3.64·f^−0.8 + 6.5·e^(−0.6(f−3.3)²)
//                  − 10⁻³·f^3.6 dB, f in kHz — the ear canal's +6.5 dB at 3.3 kHz, the steep fall above 10 kHz and below 100 Hz;
//               3. the critical-band scale (Zwicker & Terhardt 1980): z = 13·atan(0.00076 f) + 3.5·atan((f/7500)²) Bark, 0.1 Bark bins to
//                  24 Bark;
//               4. the excitation pattern: each bin spread by an auditory filter with a flat 1-Bark top, a lower skirt of 27 dB/Bark and an
//                  upper skirt of 24 + 230/f − 0.2·L dB/Bark (Terhardt 1979; f in Hz, L the masker's critical-band level in dB; never under
//                  5 dB/Bark) — so loud sounds mask upward and broadband noise piles up excitation a tone does not;
//               5. specific loudness (Zwicker & Fastl, Psychoacoustics, eq. 8.6): N′ = c·E_TQ^0.23·[(0.5 + 0.5·E/E_TQ)^0.23 − 1] sone/Bark,
//                  E_TQ the threshold in quiet after W (BS.1387's internal noise 0.4·3.64·f^−0.8 dB), and N = ∫ N′ dz;
//                  c calibrated so a 1 kHz tone at 40 dB SPL is 1 sone (the sone's definition; tests/perceived.test.mjs pins it and
//                  checks 60 dB ≈ 4 sones, 80 dB ≈ 16).
//   acum      sharpness, DIN 45692: S = k·∫ N′(z)·g(z)·z dz / N, g = 1 to 15.8 Bark and 0.15·e^(0.42(z − 15.8)) + 0.85 above; k calibrated so
//             narrow-band noise one critical band wide at 1 kHz, 60 dB SPL, is 1 acum.
//   small     sones through a small speaker (a phone or laptop): a 4th-order high-pass at 250 Hz and a +5 dB presence bell at 3 kHz (one
//             octave wide), applied to the spectrum before step 2.
// Per beat: the mean of its four 16ths' sones (and their peak); its sharpness from the mean specific-loudness pattern of the four. Per bar the
// same over 16 sixteenths, with the bar's LUFS (BS.1770, K-weighted, ungated) beside it.
//   node scripts/audio/perceived.mjs                                     # public/audio/bgm.wav: the per-bar table and percentiles
//   node scripts/audio/perceived.mjs FILE.wav --from 3360 --to 3744 --beats   # one passage, per beat
//   node scripts/audio/perceived.mjs --json output/qa/v08/perceived.json
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { kWeighted } from '../check-loudness.mjs';
import { fft } from '../lib/fft.mjs';
import { readWav } from './wav.mjs';

/** dB SPL of a full-scale RMS signal (0 dBFS RMS): the assumed listening level. */
export const CAL_DB = 90;
/** Frames per analysis window (a 16th at 150 BPM, 60 fps: 100 ms) and the FFT's size. */
export const WINDOW_FRAMES = 6;
const NFFT = 8192;
const FPS = 60;
/** The 0.1-Bark grid: 240 bins to 24 Bark. */
const DZ = 0.1;
const NZ = 240;

/** Bark of frequency f (Hz): Zwicker & Terhardt 1980. */
export const bark = (f) => 13 * Math.atan(0.00076 * f) + 3.5 * Math.atan((f / 7500) ** 2);
/** The outer and middle ear (ITU-R BS.1387, after Terhardt): its gain in dB at f (Hz). */
export const earDb = (f) => {
  const k = f / 1000;
  return -0.6 * 3.64 * k ** -0.8 + 6.5 * Math.exp(-0.6 * (k - 3.3) ** 2) - 1e-3 * k ** 3.6;
};
/** The threshold in quiet after the ear (BS.1387's internal noise), dB at f (Hz). */
const internalDb = (f) => 0.4 * 3.64 * (f / 1000) ** -0.8;
/** The small speaker: a 4th-order Butterworth high-pass at 250 Hz and a +5 dB bell at 3 kHz one octave wide, as a power gain at f (Hz). */
export const smallSpeaker = (f) => {
  const hp = 1 / (1 + (250 / Math.max(1, f)) ** 8);
  const bell = 5 * Math.exp(-(Math.log2(Math.max(1, f) / 3000) ** 2) / (2 * 0.5 ** 2));
  return hp * 10 ** (bell / 10);
};
/** Each 0.1-Bark bin's centre frequency (Hz), by bisection on bark(). */
const CENTRE = Float64Array.from({ length: NZ }, (_, j) => {
  const z = (j + 0.5) * DZ;
  let [lo, hi] = [1, 24000];
  for (let k = 0; k < 60; k++) {
    const m = 0.5 * (lo + hi);
    if (bark(m) < z) lo = m;
    else hi = m;
  }
  return 0.5 * (lo + hi);
});
const ETQ = Float64Array.from(CENTRE, (f) => 10 ** (internalDb(f) / 10));
const G = Float64Array.from({ length: NZ }, (_, j) => {
  const z = (j + 0.5) * DZ;
  return z <= 15.8 ? 1 : 0.15 * Math.exp(0.42 * (z - 15.8)) + 0.85;
});
const HANN_LEN = Math.round((WINDOW_FRAMES / FPS) * 48000);
const HANN = Float64Array.from({ length: HANN_LEN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / HANN_LEN));

/**
 * Bark-binned power (after the ear, and the small speaker when asked) of a window of `x` channels from sample `a`, `m` samples long, in
 * intensity units where 10·log10 is dB SPL. Each channel's spectrum is averaged (diotic).
 */
function barkPower(channels, a, m, sr, { speaker = false } = {}) {
  const w = m === HANN.length && sr === 48000 ? HANN : Float64Array.from({ length: m }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / m));
  let w2 = 0;
  for (let i = 0; i < m; i++) w2 += w[i] * w[i];
  const n = Math.max(NFFT, 1 << Math.ceil(Math.log2(m)));
  const out = new Float64Array(NZ);
  const scale = (2 / (n * w2)) * 10 ** (CAL_DB / 10) / channels.length;
  for (const x of channels) {
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < m; i++) re[i] = (x[a + i] ?? 0) * w[i];
    fft(re, im);
    for (let k = 1; k < n / 2; k++) {
      const f = (k * sr) / n;
      if (f < 20 || f > 16000) continue;
      const z = bark(f);
      const j = Math.min(NZ - 1, Math.floor(z / DZ));
      let p = (re[k] * re[k] + im[k] * im[k]) * scale * 10 ** (earDb(f) / 10);
      if (speaker) p *= smallSpeaker(f);
      out[j] += p;
    }
  }
  return out;
}

/** The excitation pattern of Bark-binned power `e` (step 4). */
function excitation(e) {
  const prefix = new Float64Array(NZ + 1);
  for (let j = 0; j < NZ; j++) prefix[j + 1] = prefix[j] + e[j];
  const cb = (j) => prefix[Math.min(NZ, j + 6)] - prefix[Math.max(0, j - 5)];
  let top = 0;
  for (let j = 0; j < NZ; j++) top = Math.max(top, e[j]);
  const out = new Float64Array(NZ);
  for (let i = 0; i < NZ; i++) {
    if (e[i] <= top * 1e-12) continue;
    const level = 10 * Math.log10(Math.max(1e-12, cb(i)));
    const up = Math.max(5, 24 + 230 / CENTRE[i] - 0.2 * level);
    for (let j = 0; j < NZ; j++) {
      const d = (j - i) * DZ;
      const s = Math.abs(d) <= 0.5 ? 1 : d < 0 ? 10 ** (-(27 * (-d - 0.5)) / 10) : 10 ** (-(up * (d - 0.5)) / 10);
      if (s < 1e-9) continue;
      out[j] += e[i] * s;
    }
  }
  return out;
}

/** Specific loudness (step 5, before the calibration constant) of an excitation pattern. */
function specific(exc) {
  const out = new Float64Array(NZ);
  for (let j = 0; j < NZ; j++) {
    const v = ETQ[j] ** 0.23 * ((0.5 + (0.5 * exc[j]) / ETQ[j]) ** 0.23 - 1);
    out[j] = v > 0 ? v : 0;
  }
  return out;
}

const sum = (n) => n.reduce((s, v) => s + v, 0) * DZ;
const sharpnessRaw = (n) => {
  let num = 0;
  for (let j = 0; j < NZ; j++) num += n[j] * G[j] * (j + 0.5) * DZ;
  const den = sum(n) / DZ;
  return den > 0 ? num / den : 0;
};

/** A seeded test signal for the calibrations: a sine of `hz`, or noise band-limited to [lo, hi] Hz, at `spl` dB SPL (RMS), 4800 samples. */
export function testSignal(sr, { hz = 0, band = null, spl = 60 } = {}) {
  const m = HANN.length;
  const x = new Float64Array(m);
  if (hz) for (let i = 0; i < m; i++) x[i] = Math.sin((2 * Math.PI * hz * i) / sr);
  else {
    // Band-limited noise: random phases on the band's bins of a long FFT, then a window's worth of it.
    const n = 1 << 15;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    let s = 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 2 ** 32);
    for (let k = 1; k < n / 2; k++) {
      const f = (k * sr) / n;
      if (f < band[0] || f > band[1]) continue;
      const ph = 2 * Math.PI * rnd();
      re[k] = Math.cos(ph);
      im[k] = Math.sin(ph);
      re[n - k] = re[k];
      im[n - k] = -im[k];
    }
    fft(re, im, true);
    for (let i = 0; i < m; i++) x[i] = re[i];
  }
  let ms = 0;
  for (let i = 0; i < m; i++) ms += x[i] * x[i];
  const g = Math.sqrt(10 ** ((spl - CAL_DB) / 10) / (ms / m));
  return Float32Array.from(x, (v) => v * g);
}

let calibration = null;
/** c (sones) and k (acum) of steps 5 and 6, from their reference signals (computed once). */
export function calibrate() {
  if (calibration) return calibration;
  const sr = 48000;
  const tone = testSignal(sr, { hz: 1000, spl: 40 });
  const c = 1 / sum(specific(excitation(barkPower([tone], 0, tone.length, sr))));
  const nb = testSignal(sr, { band: [920, 1080], spl: 60 });
  const k = 1 / sharpnessRaw(specific(excitation(barkPower([nb], 0, nb.length, sr))));
  calibration = { c, k };
  return calibration;
}

/** Loudness (sones), its specific-loudness pattern (sone/Bark, 240 bins of 0.1 Bark) and sharpness (acum) of samples [a, a + m) of `channels`. */
export function loudnessOf(channels, a, m, sr, { speaker = false } = {}) {
  const { c, k } = calibrate();
  const n = specific(excitation(barkPower(channels, a, m, sr, { speaker }))).map((v) => v * c);
  return { sones: sum(n), pattern: n, acum: k * sharpnessRaw(n) };
}

/**
 * Per 16th of film frames [from, to) of a stereo mix (`L`, `R` the whole film, frame 0 at sample 0): { frame, sones, acum, small, pattern }.
 */
export function sixteenths(L, R, sr, from, to, { small = true } = {}) {
  const m = Math.round((WINDOW_FRAMES / FPS) * sr);
  const rows = [];
  for (let f = from; f + WINDOW_FRAMES <= to; f += WINDOW_FRAMES) {
    const a = Math.round((f / FPS) * sr);
    const x = loudnessOf([L, R], a, m, sr);
    rows.push({ frame: f, sones: x.sones, acum: x.acum, small: small ? loudnessOf([L, R], a, m, sr, { speaker: true }).sones : null, pattern: x.pattern });
  }
  return rows;
}

/** Groups 16ths into spans of `per` (4: beats, 16: bars): mean sones, peak sones, sharpness of the mean pattern, mean small-speaker sones. */
export function group(rows, per) {
  const { k } = calibrate();
  const out = [];
  for (let s = 0; s + per <= rows.length; s += per) {
    const g = rows.slice(s, s + per);
    const pattern = new Float64Array(NZ);
    for (const r of g) for (let j = 0; j < NZ; j++) pattern[j] += r.pattern[j] / per;
    const mean = (key) => g.reduce((t, r) => t + r[key], 0) / per;
    out.push({ frame: g[0].frame, sones: mean('sones'), peak: Math.max(...g.map((r) => r.sones)), acum: k * sharpnessRaw(pattern), small: g[0].small === null ? null : mean('small') });
  }
  return out;
}

/** K-weighted, ungated loudness (LUFS) of samples [a, b) of L and R. */
export function lufs(L, R, sr, a, b) {
  const pad = Math.round(0.4 * sr);
  const s = Math.max(0, a - pad);
  const kl = kWeighted(L.subarray(s, b), sr);
  const kr = kWeighted(R.subarray(s, b), sr);
  let p = 0;
  for (let i = a - s; i < b - s; i++) p += kl[i] * kl[i] + kr[i] * kr[i];
  return p > 0 ? -0.691 + 10 * Math.log10(p / (b - a)) : -Infinity;
}

/** The q-th quantile (0…1) of `xs`. */
export const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))] : NaN;
};

/**
 * The whole film per beat and per bar (silent beats left out of the percentiles): { beats, bars, stats } where stats holds p50, p90, p95
 * and the max of the beats' sones, sharpness and small-speaker sones.
 */
export function filmReport(L, R, sr, { from = 0, to = Math.floor((L.length / sr) * FPS) } = {}) {
  const rows = sixteenths(L, R, sr, from, to);
  const beats = group(rows, 4);
  const bars = group(rows, 16).map((b) => ({ ...b, lufs: lufs(L, R, sr, Math.round((b.frame / FPS) * sr), Math.round(((b.frame + 96) / FPS) * sr)) }));
  const heard = beats.filter((b) => b.sones > 0.5);
  const stat = (key) => ({ p50: quantile(heard.map((b) => b[key]), 0.5), p90: quantile(heard.map((b) => b[key]), 0.9), p95: quantile(heard.map((b) => b[key]), 0.95), max: Math.max(...heard.map((b) => b[key])) });
  return { beats, bars, stats: { sones: stat('sones'), acum: stat('acum'), small: stat('small'), medianAcum: quantile(heard.map((b) => b.acum), 0.5) } };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { from: { type: 'string' }, to: { type: 'string' }, beats: { type: 'boolean' }, json: { type: 'string' } } });
  const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const file = positionals[0] ? path.resolve(positionals[0]) : path.join(KX, 'public', 'audio', 'bgm.wav');
  const { sampleRate: sr, channels } = readWav(file);
  const [L, R] = channels;
  const total = Math.floor((L.length / sr) * FPS);
  const from = values.from ? Number(values.from) : 0;
  const to = values.to ? Number(values.to) : total;
  const report = filmReport(L, R, sr, { from: from - (from % 24), to });
  const f2 = (v) => (v === null ? '—' : v.toFixed(2));
  if (values.beats || values.from) {
    console.log('frame   sones  peak   acum  small');
    for (const b of report.beats) console.log(`${String(b.frame).padStart(5)}  ${f2(b.sones).padStart(5)}  ${f2(b.peak).padStart(5)}  ${f2(b.acum)}  ${f2(b.small).padStart(5)}`);
  } else {
    console.log('bar  frame   LUFS   sones  peak   acum  small');
    report.bars.forEach((b, k) => console.log(`${String(k + 1 + Math.floor(from / 96)).padStart(3)}  ${String(b.frame).padStart(5)}  ${b.lufs.toFixed(1).padStart(5)}  ${f2(b.sones).padStart(5)}  ${f2(b.peak).padStart(5)}  ${f2(b.acum)}  ${f2(b.small).padStart(5)}`));
  }
  const s = report.stats;
  console.log(`beats (heard): sones p50 ${f2(s.sones.p50)} p90 ${f2(s.sones.p90)} p95 ${f2(s.sones.p95)} max ${f2(s.sones.max)} · acum p50 ${f2(s.acum.p50)} p95 ${f2(s.acum.p95)} max ${f2(s.acum.max)} · small p95 ${f2(s.small.p95)}`);
  if (values.json) {
    fs.writeFileSync(path.resolve(values.json), JSON.stringify({ file, calDb: CAL_DB, beats: report.beats, bars: report.bars, stats: report.stats }, null, 1));
  }
}
