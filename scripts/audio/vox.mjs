// Formant vocal chops (spec §8): a glottal pulse train (a saw softened by a
// one-pole low-pass, with a little breath) through five band-passes at the
// formants of a vowel, morphing to another vowel while the pitch glides.
// Formants: the usual soprano table (frequency Hz, level dB, bandwidth Hz).
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { Osc } from './osc.mjs';

export const VOWELS = {
  a: [[800, 0, 80], [1150, -6, 90], [2900, -32, 120], [3900, -20, 130], [4950, -50, 140]],
  e: [[350, 0, 60], [2000, -20, 100], [2800, -15, 120], [3600, -40, 150], [4950, -56, 200]],
  i: [[270, 0, 60], [2140, -12, 90], [2950, -26, 100], [3900, -26, 120], [4950, -44, 120]],
  o: [[450, 0, 70], [800, -11, 80], [2830, -22, 100], [3800, -22, 130], [4950, -50, 135]],
  u: [[325, 0, 50], [700, -16, 60], [2700, -35, 170], [3800, -40, 180], [4950, -60, 200]],
};

/** A sung chop of `len` samples from sample `at`: pitch `freq` gliding `glide` semitones, vowel `vowel` morphing into `to`. */
export function voxChop(out, at, sr, { freq, len, vowel = 'a', to = vowel, glide = 0, gain = 0.3, breath = 0.04, seed = 1 }) {
  const r = rng(seed);
  const src = new Osc(sr);
  const filters = VOWELS[vowel].map(() => new SVF(sr));
  const rel = Math.round(0.02 * sr);
  let soft = 0;
  for (let i = 0; i < len + rel; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const u = Math.min(1, i / len);
    const k = u * u * (3 - 2 * u);
    soft += 0.35 * (src.saw(freq * 2 ** ((glide * k) / 12)) - soft);
    const x = soft + breath * (r() * 2 - 1);
    let y = 0;
    filters.forEach((flt, n) => {
      const [fa, da, ba] = VOWELS[vowel][n];
      const [fb, db, bb] = VOWELS[to][n];
      const fc = fa + (fb - fa) * k;
      const bw = ba + (bb - ba) * k;
      flt.process(x, fc, fc / bw);
      // The SVF's band-pass peaks at Q; bw / fc brings each formant to its level.
      y += 10 ** ((da + (db - da) * k) / 20) * flt.bp * (bw / fc);
    });
    const env = Math.min(1, i / (0.004 * sr)) * (i < len ? 1 : 1 - (i - len) / rel);
    if (j >= 0) out[j] += gain * env * y;
  }
}
