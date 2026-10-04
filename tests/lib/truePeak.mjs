// Independent true-peak meters for the tests (nothing shared with scripts/audio/meter.mjs): plain polyphase interpolators, and
// ffmpeg's own resampler at 192 kHz, which is exactly what its ebur128 filter does for peak=true (f_ebur128.c: swresample with its
// defaults, 4× at 48 kHz). Remotion's ffmpeg has no ebur128 filter, so the resampled peak is read here.
import { execFileSync } from 'node:child_process';
import { ffmpegPath } from '../../scripts/lib/remotion.mjs';

/** The family the master must sit under: 8× windowed sincs of different lengths, two cut below Nyquist (as a playback filter is). */
export const INDEPENDENT = {
  '8×, 64-tap Kaiser β 8 (the iteration-2 verifier’s check)': { os: 8, taps: 64, beta: 8, fc: 1 },
  '8×, 128-tap Kaiser β 10': { os: 8, taps: 128, beta: 10, fc: 1 },
  '8×, 32-tap Kaiser β 9': { os: 8, taps: 32, beta: 9, fc: 1 },
  '8×, 32-tap Hann': { os: 8, taps: 32, window: 'hann', fc: 1 },
  '8×, 64-tap Kaiser β 9 cut at 0.97 of Nyquist': { os: 8, taps: 64, beta: 9, fc: 0.97 },
  '8×, 64-tap Kaiser β 9 cut at 0.92 of Nyquist': { os: 8, taps: 64, beta: 9, fc: 0.92 },
};

const i0 = (x) => {
  let s = 1;
  let t = 1;
  for (let k = 1; k < 64; k++) {
    t *= (x / (2 * k)) ** 2;
    s += t;
  }
  return s;
};

/** Phase p of `m` interpolates at n + p / os from x[n − taps/2 + 1 … n + taps/2]. */
function bank({ os, taps, beta = 8, window = 'kaiser', fc = 1 }) {
  return Array.from({ length: os }, (_, p) =>
    Float64Array.from({ length: taps }, (_, k) => {
      const u = p / os - (k - (taps / 2 - 1));
      const z = u / (taps / 2);
      if (Math.abs(z) >= 1) return 0;
      const w = window === 'hann' ? 0.5 + 0.5 * Math.cos(Math.PI * z) : i0(beta * Math.sqrt(1 - z * z)) / i0(beta);
      return (u === 0 ? fc : Math.sin(Math.PI * fc * u) / (Math.PI * u)) * w;
    }),
  );
}

/** True peak in dBTP of channels `xs` on meter `m` (see INDEPENDENT). Samples outside count as silence. */
export function independentDb(xs, m) {
  const c = bank(m);
  const half = m.taps / 2 - 1;
  let peak = 0;
  for (const x of xs) {
    const n = x.length;
    const pad = new Float64Array(n + m.taps);
    for (let i = 0; i < n; i++) pad[i + half] = x[i];
    for (let i = 0; i < n; i++) {
      for (const row of c) {
        let y = 0;
        for (let k = 0; k < m.taps; k++) y += row[k] * pad[i + k];
        if (Math.abs(y) > peak) peak = Math.abs(y);
      }
    }
  }
  return 20 * Math.log10(Math.max(peak, 1e-12));
}

/** ffmpeg's true peak of a WAV: resampled to 192 kHz in double precision with swresample's defaults, written as 24-bit PCM, its sample peak. */
export function ffmpegTruePeakDb(file) {
  const out = execFileSync(
    ffmpegPath(),
    ['-v', 'error', '-i', file, '-af', 'aformat=sample_fmts=dbl,aresample=192000,aformat=sample_fmts=s32', '-c:a', 'pcm_s24le', '-f', 'wav', '-'],
    { maxBuffer: 1 << 30 },
  );
  const data = out.indexOf('data', 36, 'ascii') + 8;
  let peak = 0;
  for (let p = data; p + 3 <= out.length; p += 3) {
    const v = Math.abs(out.readIntLE(p, 3));
    if (v > peak) peak = v;
  }
  return 20 * Math.log10(Math.max(peak / 8388608, 1e-12));
}
