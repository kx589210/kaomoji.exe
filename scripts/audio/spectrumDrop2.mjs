// The song's own spectrogram for S30's highway (E8, drop2 bar 5; build sheet notes/d2build/sheet.md §5.7). A CLI, run after
// every music lock (HANDOFF: the lead chains it after bgm.mjs): reads public/audio/bgm.wav and writes public/audio/bgm-spectrum.bin —
// TOTAL_FRAMES rows (one per film frame) × 96 bytes: an STFT hopping 800 samples (one frame at 48 kHz) with a 4096 Hann window centred on each
// frame's first sample, the mid channel, 96 log bins from 30 Hz to 16 kHz (each the loudest FFT bin inside it, or the level at its
// centre where it is narrower than one FFT bin), dB −72…0 mapped to 0…255 (0 dB = a full-scale sine). src/shots/drop2Game.ts parses it;
// src/scenes/drop2Game.ts loads it in init. Re-render S30 whenever the mix changes.
//   node scripts/audio/spectrumDrop2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOTAL_FRAMES } from '../../src/score/tempo.ts';
import { fft } from '../lib/fft.mjs';
import { readWav } from './wav.mjs';

/** One row per film frame (rows = TOTAL_FRAMES), 96 log bins. */
export const SPECTRUM = { rows: TOTAL_FRAMES, bins: 96, hop: 800, window: 4096, fmin: 30, fmax: 16000, dbMin: -72 };

const RATIO = Math.log(SPECTRUM.fmax / SPECTRUM.fmin);
/** The lower edge (Hz) of log bin `b` (b = 96 is the top edge). */
const edge = (b) => SPECTRUM.fmin * Math.exp((b / SPECTRUM.bins) * RATIO);
/** The log bin a frequency falls in (clamped to 0–95). */
export const binOfHz = (hz) => Math.max(0, Math.min(SPECTRUM.bins - 1, Math.floor((SPECTRUM.bins * Math.log(hz / SPECTRUM.fmin)) / RATIO)));

/**
 * The spectrum of a stereo mix at sample rate `sr`: `rows` rows of 96 bytes, row k from the window centred on sample k·sr/60 (the first
 * sample of film frame k), zero-padded outside the signal.
 */
export function spectrumRows(L, R, sr, { rows = SPECTRUM.rows } = {}) {
  const N = SPECTRUM.window;
  const out = new Uint8Array(rows * SPECTRUM.bins);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const mag = new Float64Array(N / 2);
  const hann = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const hzPerBin = sr / N;
  // Each log bin's FFT bins [k0, k1) and its centre (fractional FFT bin), fixed for every row.
  const bands = Array.from({ length: SPECTRUM.bins }, (_, b) => {
    const lo = edge(b) / hzPerBin;
    const hi = edge(b + 1) / hzPerBin;
    return { k0: Math.ceil(lo), k1: Math.min(N / 2, Math.ceil(hi)), centre: Math.sqrt(lo * hi) };
  });
  const full = N / 4; // a full-scale sine's peak bin through the Hann window
  for (let k = 0; k < rows; k++) {
    const start = Math.round((k * sr) / 60) - N / 2;
    let any = false;
    for (let i = 0; i < N; i++) {
      const s = start + i;
      const v = s >= 0 && s < L.length ? 0.5 * (L[s] + R[s]) : 0;
      if (v !== 0) any = true;
      re[i] = v * hann[i];
      im[i] = 0;
    }
    if (!any) continue;
    fft(re, im);
    for (let i = 0; i < N / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
    for (let b = 0; b < SPECTRUM.bins; b++) {
      const { k0, k1, centre } = bands[b];
      const c0 = Math.floor(centre);
      let m = mag[c0] + (mag[Math.min(N / 2 - 1, c0 + 1)] - mag[c0]) * (centre - c0);
      for (let i = k0; i < k1; i++) m = Math.max(m, mag[i]);
      const db = 20 * Math.log10(m / full + 1e-12);
      out[k * SPECTRUM.bins + b] = Math.round(255 * Math.max(0, Math.min(1, (db - SPECTRUM.dbMin) / -SPECTRUM.dbMin)));
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const wav = path.join(root, 'public', 'audio', 'bgm.wav');
  const bin = path.join(root, 'public', 'audio', 'bgm-spectrum.bin');
  const { sampleRate, channels } = readWav(wav);
  if (sampleRate !== 48000) throw new Error(`${wav}: expected 48 kHz, got ${sampleRate}`);
  const t0 = Date.now();
  const rows = spectrumRows(channels[0], channels[1] ?? channels[0], sampleRate);
  fs.writeFileSync(bin, rows);
  console.log(`${path.relative(process.cwd(), bin)}: ${SPECTRUM.rows} × ${SPECTRUM.bins} bytes from ${path.relative(process.cwd(), wav)} in ${Date.now() - t0} ms`);
}
