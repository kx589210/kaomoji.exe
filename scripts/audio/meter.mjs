// Loudness (ITU-R BS.1770-4), true peak (4× oversampled, the largest of several windowed-sinc rebuilds) and stereo correlation.
import { Biquad } from './filters.mjs';

// BS.1770 K-weighting coefficients at 48 kHz.
const K48 = [
  [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
];

const kWeight = (x, sr) => {
  if (sr !== 48000) throw new Error('loudness meter expects 48 kHz');
  const stages = K48.map(([b0, b1, b2, a1, a2]) => new Biquad(b0, b1, b2, a1, a2));
  return Float64Array.from(x, (v) => stages[1].process(stages[0].process(v)));
};

export function integratedLoudness(L, R, sr) {
  const l = kWeight(L, sr);
  const r = kWeight(R, sr);
  const block = Math.round(sr * 0.4);
  const hop = Math.round(sr * 0.1);
  const powers = [];
  for (let s = 0; s + block <= l.length; s += hop) {
    let pl = 0;
    let pr = 0;
    for (let i = s; i < s + block; i++) {
      pl += l[i] * l[i];
      pr += r[i] * r[i];
    }
    powers.push((pl + pr) / block);
  }
  const lufs = (p) => -0.691 + 10 * Math.log10(p);
  const gated = powers.filter((p) => lufs(p) > -70);
  if (!gated.length) return -Infinity;
  const relative = lufs(gated.reduce((s, p) => s + p, 0) / gated.length) - 10;
  const kept = gated.filter((p) => lufs(p) > relative);
  return lufs(kept.reduce((s, p) => s + p, 0) / kept.length);
}

// True peak (iteration 3, ruling 16). The old meter (4 phases of a 12-tap Hann sinc) read the master 0.4–0.5 dB under an 8× check
// and ffmpeg: the mix carries real energy between 20 kHz and Nyquist (hats, noise, spray, crushed sounds; about 20 dB under the
// whole), which a short filter rolls off, and how a meter rebuilds that band moves a peak by a few tenths of a dB either way —
// rebuilt right up to Nyquist with a long filter, cut a little under it (as ffmpeg's resampler and playback filters are) or with a
// short filter's soft edge, the band can add to a peak or take from it. So the signal is rebuilt several ways, each 4× oversampled
// with a Kaiser-windowed sinc, and the largest counts:
//   - to Nyquist with 128 taps a phase (β 10, flat to about 23 kHz) — every sample is rebuilt this way;
//   - to Nyquist with 512 taps (β 12): as near the ideal (band-limited) signal as a long FFT resample gets;
//   - cut sharply (128 taps) at 0.97, 0.94 and 0.9 of Nyquist: a meter whose response falls smoothly over the top band hears a blend
//     of such cuts, so it reads no higher than the largest of them;
//   - short filters as quick meters use: 16 and 32 taps to Nyquist, 32 at 0.97 (ffmpeg's swresample), 64 to Nyquist (an 8× check).
// Between the oversampled points a parabola through each local maximum finds the peak (a 20 kHz tone reads within 0.01 dB at any
// phase). All but the first are worked out only near points the first finds within 3 dB of the level that matters (they differ from
// it by the top band alone, a few tenths of a dB). The limiter aims a hair under its ceiling on top of this (limiter.mjs MARGIN_DB).

/** Points a sample. */
export const OVERSAMPLE = 4;
/** The rebuilds: cut-off as a fraction of Nyquist, the Kaiser window's β, taps a phase (even). The first is worked out everywhere. */
const BANKS = [
  { fc: 1, beta: 10, taps: 128 },
  { fc: 1, beta: 12, taps: 512 },
  { fc: 0.97, beta: 10, taps: 128 },
  { fc: 0.94, beta: 10, taps: 128 },
  { fc: 0.9, beta: 8, taps: 128 },
  { fc: 1, beta: 9, taps: 32 },
  { fc: 0.97, beta: 9, taps: 32 },
  { fc: 1, beta: 8, taps: 64 },
  { fc: 1, beta: 7, taps: 16 },
];
/** The other rebuilds are worked out only for rows where the first comes within this factor (3 dB) of the level that matters. */
const SLACK = 0.7;

const bessel0 = (x) => {
  let s = 1;
  let t = 1;
  for (let k = 1; k < 80; k++) {
    t *= (x / (2 * k)) ** 2;
    s += t;
  }
  return s;
};

/** Samples read before a point's own by the longest rebuild. */
const REACH = Math.max(...BANKS.map((b) => b.taps)) / 2 - 1;
/**
 * Each rebuild's phases: phase p reads x[n − half … n + taps − 1 − half] (half = taps / 2 − 1) for the point n + p / OVERSAMPLE.
 * A rebuild to Nyquist passes the samples through untouched, so its phase 0 is the sample itself and is not stored.
 */
const PLAN = BANKS.map(({ fc, beta, taps }) => {
  const half = taps / 2 - 1;
  const first = fc === 1 ? 1 : 0;
  const phases = [];
  for (let p = first; p < OVERSAMPLE; p++) {
    phases.push(
      Float64Array.from({ length: taps }, (_, k) => {
        const u = p / OVERSAMPLE - (k - half);
        const sinc = u === 0 ? fc : Math.sin(Math.PI * fc * u) / (Math.PI * u);
        return sinc * (bessel0(beta * Math.sqrt(Math.max(0, 1 - (u / (taps / 2)) ** 2))) / bessel0(beta));
      }),
    );
  }
  return { taps, first, phases, offset: REACH - half };
});
/** No rebuilt point (parabola included) is larger than this times the largest sample magnitude in reach of it. */
const BOUND = 1.125 * Math.max(1, ...PLAN.flatMap((b) => b.phases.map((h) => h.reduce((s, v) => s + Math.abs(v), 0))));
const BLOCK = 512;

/** The value at grid point j of `g` (|y|), raised to the vertex of the parabola through it and its neighbours where it is a local maximum. */
function refined(g, j) {
  const v = g[j];
  const a = g[j - 1];
  const c = g[j + 1];
  if (v < a || v < c) return v;
  const den = a - 2 * v + c;
  return den < 0 ? v - ((a - c) * (a - c)) / (8 * den) : v;
}

/**
 * Walks `x` in blocks. For each block [b0, b1), `want(bound, from, to)` — `bound` caps every rebuilt point in it, [from, to) is the
 * span of samples they read — returns false to skip it, or the level under which points need not be exact. `onBlock(grid, b0, b1)`
 * then gets the rebuilt points of samples b0 − 1 … b1, refined, the largest rebuild's at each: point n + q / OVERSAMPLE at
 * grid[(n − b0 + 1) * OVERSAMPLE + q].
 */
function scan(x, want, onBlock) {
  const n = x.length;
  const OS = OVERSAMPLE;
  const span = 2 * REACH + 2;
  const pad = new Float64Array(BLOCK + 2 + span);
  const grid = new Float64Array((BLOCK + 2) * OS);
  const bank = new Float64Array((BLOCK + 2) * OS);
  const rowMax = new Float64Array(BLOCK + 2);
  const busy = new Uint8Array(BLOCK + 2);
  for (let b0 = 0; b0 < n; b0 += BLOCK) {
    const b1 = Math.min(n, b0 + BLOCK);
    const from = Math.max(0, b0 - 1 - REACH);
    const to = Math.min(n, b1 + REACH + 2);
    let m = 0;
    for (let i = from; i < to; i++) {
      const a = Math.abs(x[i]);
      if (a > m) m = a;
    }
    const level = want(m * BOUND, from, to);
    if (level === false) continue;
    const rows = b1 - b0 + 2;
    const last = rows * OS - 1;
    // pad[j] = x[b0 − 1 − REACH + j]: row r (sample b0 − 1 + r) of a rebuild reads pad[r + offset + k].
    const s0 = b0 - 1 - REACH;
    for (let j = 0; j < rows + span; j++) {
      const i = s0 + j;
      pad[j] = i >= 0 && i < n ? x[i] : 0;
    }
    for (let b = 0; b < PLAN.length; b++) {
      const { taps, first, phases, offset } = PLAN[b];
      if (b > 0) {
        // Rows by one where the first rebuild comes near the level (2), and their neighbours, for the parabolas (1).
        const near = level * SLACK;
        for (let r = 0; r < rows; r++) busy[r] = rowMax[Math.max(0, r - 1)] >= near || rowMax[r] >= near || rowMax[Math.min(rows - 1, r + 1)] >= near ? 2 : 0;
        for (let r = 0; r < rows; r++) if (!busy[r] && ((r > 0 && busy[r - 1] === 2) || (r + 1 < rows && busy[r + 1] === 2))) busy[r] = 1;
      }
      if (first === 1) for (let r = 0; r < rows; r++) bank[r * OS] = Math.abs(pad[r + REACH]);
      for (let p = first; p < OS; p++) {
        const h = phases[p - first];
        for (let r = 0; r < rows; r++) {
          if (b > 0 && !busy[r]) continue;
          const o = r + offset;
          let y = 0;
          for (let k = 0; k < taps; k++) y += h[k] * pad[o + k];
          bank[r * OS + p] = y < 0 ? -y : y;
        }
      }
      if (b === 0) {
        for (let r = 0; r < rows; r++) {
          let v = 0;
          for (let p = 0; p < OS; p++) v = Math.max(v, bank[r * OS + p]);
          rowMax[r] = v;
        }
        grid[0] = bank[0];
        for (let j = 1; j < last; j++) grid[j] = refined(bank, j);
        grid[last] = bank[last];
        continue;
      }
      for (let r = 0; r < rows; r++) {
        if (busy[r] !== 2) continue;
        for (let p = 0; p < OS; p++) {
          const j = r * OS + p;
          const v = j > 0 && j < last ? refined(bank, j) : bank[j];
          if (v > grid[j]) grid[j] = v;
        }
      }
    }
    onBlock(grid, b0, b1);
  }
}

/**
 * True-peak envelope: at each sample, the largest magnitude of the rebuilt signal within half a sample of it (never less than the
 * sample's own). With `above`, it is exact wherever it is over `above` and may read only the sample's own magnitude elsewhere; with
 * `where(from, to)`, only blocks whose samples [from, to) it accepts are rebuilt (the others read their samples' own magnitudes).
 */
export function truePeakEnvelope(x, { above = 0, where = null } = {}) {
  const env = Float32Array.from(x, Math.abs);
  const OS = OVERSAMPLE;
  const half = OS / 2;
  scan(
    x,
    (bound, from, to) => (bound > above && (!where || where(from, to)) ? above : false),
    (g, b0, b1) => {
      for (let i = b0; i < b1; i++) {
        let m = env[i];
        const c = (i - b0 + 1) * OS;
        for (let q = -half + 1; q <= half; q++) if (g[c + q] > m) m = g[c + q];
        env[i] = m;
      }
    },
  );
  return env;
}

function peakOf(x, start) {
  const OS = OVERSAMPLE;
  const half = OS / 2;
  let m = start;
  scan(
    x,
    (bound) => (bound > m ? m : false),
    (g, b0, b1) => {
      for (let j = OS - half + 1; j <= (b1 - b0) * OS + half; j++) if (g[j] > m) m = g[j];
    },
  );
  return m;
}

/** The true peak of a stereo pair, in dBTP: the largest value of either channel's envelope. */
export function truePeakDb(L, R) {
  return 20 * Math.log10(Math.max(peakOf(R, peakOf(L, 0)), 1e-12));
}

export function correlation(L, R) {
  let lr = 0;
  let ll = 0;
  let rr = 0;
  for (let i = 0; i < L.length; i++) {
    lr += L[i] * R[i];
    ll += L[i] * L[i];
    rr += R[i] * R[i];
  }
  return ll && rr ? lr / Math.sqrt(ll * rr) : 1;
}

/** Correlation of the band below `hz` (checks that the low end is mono). */
export function lowCorrelation(L, R, sr, hz = 150) {
  const fl = Biquad.lowpass(sr, hz);
  const fr = Biquad.lowpass(sr, hz);
  return correlation(Float64Array.from(L, (v) => fl.process(v)), Float64Array.from(R, (v) => fr.process(v)));
}
