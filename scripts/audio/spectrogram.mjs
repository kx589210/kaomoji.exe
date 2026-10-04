import fs from 'node:fs';
import { fft } from '../lib/fft.mjs';
import { encodePng } from '../lib/png.mjs';

/** Log-frequency spectrogram (30 Hz–20 kHz) of the mid channel, as a PNG. */
export function spectrogramPng(file, L, R, sr, { width = 1600, height = 512 } = {}) {
  const N = 4096;
  const hop = Math.max(1, Math.floor((L.length - N) / width));
  const img = new Uint8Array(width * height * 3);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let x = 0; x < width; x++) {
    const s = x * hop;
    for (let i = 0; i < N; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
      re[i] = ((L[s + i] ?? 0) + (R[s + i] ?? 0)) * 0.5 * w;
      im[i] = 0;
    }
    fft(re, im);
    for (let y = 0; y < height; y++) {
      const f = 30 * (20000 / 30) ** (1 - y / (height - 1));
      const bin = Math.min(N / 2 - 1, Math.round((f / sr) * N));
      const db = 20 * Math.log10(Math.hypot(re[bin], im[bin]) / (N / 4) + 1e-9);
      const v = Math.max(0, Math.min(1, (db + 90) / 90));
      const o = (y * width + x) * 3;
      img[o] = Math.round(255 * Math.min(1, v * 1.8));
      img[o + 1] = Math.round(255 * Math.max(0, v * 1.6 - 0.5));
      img[o + 2] = Math.round(255 * Math.max(0, 0.5 - Math.abs(v - 0.35)) * 1.6);
    }
  }
  fs.writeFileSync(file, encodePng({ width, height, channels: 3, data: img }));
}
