// The build's new voices (scripts/audio/buildVoices.mjs; the bars 1–14 design notes/b112/final.md §8.3, build sheet
// notes/b114/sheet.md §10): the SCAN bar's muffle (the world heard through the antivirus), the J-cut's swell into the iris, the
// cut paper's slaps, the radar pings, the infection's print thumps, the guest's boing and riso's chord stabs (L14b).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rng } from '../src/engine/random.ts';
import { boing, chordStab, muffle, noiseSwell, paperSlap, printThump, radarPing } from '../scripts/audio/buildVoices.mjs';
import { fft } from '../scripts/lib/fft.mjs';

const SR = 48000;
const ms = (t) => Math.round((t / 1000) * SR);
const rms = (x, a = 0, b = x.length) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const peak = (x, a = 0, b = x.length) => {
  let m = 0;
  for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
};
const band = (x, from, n, lo, hi) => {
  const re = Float64Array.from({ length: n }, (_, i) => (x[from + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)));
  const im = new Float64Array(n);
  fft(re, im);
  let s = 0;
  for (let k = Math.max(1, Math.ceil((lo * n) / SR)); k <= Math.min(n / 2, Math.floor((hi * n) / SR)); k++) s += re[k] ** 2 + im[k] ** 2;
  return s;
};
const peakHz = (x, from, n, lo = 20, hi = SR / 2) => {
  const re = Float64Array.from({ length: n }, (_, i) => (x[from + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)));
  const im = new Float64Array(n);
  fft(re, im);
  let best = Math.ceil((lo * n) / SR);
  for (let k = best; k < Math.min(n / 2, (hi * n) / SR); k++) if (re[k] ** 2 + im[k] ** 2 > re[best] ** 2 + im[best] ** 2) best = k;
  return (best * SR) / n;
};
const noise = (n, seed) => {
  const r = rng(seed);
  return Float32Array.from({ length: n }, () => 0.3 * (r() * 2 - 1));
};

test('muffle: untouched outside its window, a 1.5 kHz low-pass while it holds, and no step where it goes in or comes out', () => {
  const n = ms(1000);
  const dry = noise(n, 1);
  const L = dry.slice();
  const R = dry.slice();
  const w = { a: ms(100), b: ms(200), c: ms(700), d: ms(708) };
  muffle([L, R], SR, { ...w, cutoff: 1500 });
  for (const x of [L, R]) {
    for (let i = 0; i < w.a; i++) assert.equal(x[i], dry[i]);
    for (let i = w.d; i < n; i++) assert.equal(x[i], dry[i], `dry again from d (${i})`);
  }
  const hiDry = band(dry, ms(300), 16384, 4000, 20000);
  const hiWet = band(L, ms(300), 16384, 4000, 20000);
  assert.ok(10 * Math.log10(hiDry / hiWet) > 20, `the highs ${(10 * Math.log10(hiDry / hiWet)).toFixed(1)} dB down while it holds`);
  const lo = 10 * Math.log10(band(dry, ms(300), 16384, 50, 600) / band(L, ms(300), 16384, 50, 600));
  assert.ok(Math.abs(lo) < 1.5, `the lows pass (${lo.toFixed(2)} dB)`);
  // No click at its edges: the largest sample-to-sample jump there is no bigger than the noise's own.
  let own = 0;
  for (let i = 1; i < n; i++) own = Math.max(own, Math.abs(dry[i] - dry[i - 1]));
  for (const e of [w.a, w.d]) for (let i = e - 200; i < e + 200; i++) assert.ok(Math.abs(L[i] - L[i - 1]) <= own + 1e-6, `no step at ${i}`);
  // It ramps: halfway down the in-ramp the highs are already well under the dry's, and the out-ramp opens before d.
  assert.ok(band(L, w.b - 2048, 2048, 6000, 20000) < 0.3 * band(dry, w.b - 2048, 2048, 6000, 20000));
});

test('muffle: a window past the buffer’s end, or before its start, is clipped to it', () => {
  const x = noise(ms(100), 2);
  const y = x.slice();
  muffle([y], SR, { a: ms(50), b: ms(60), c: ms(150), d: ms(160) });
  assert.ok(y.every(Number.isFinite));
  for (let i = 0; i < ms(50); i++) assert.equal(y[i], x[i]);
  const z = x.slice();
  muffle([z], SR, { a: -ms(50), b: -ms(40), c: ms(10), d: ms(20) });
  for (let i = ms(20); i < z.length; i++) assert.equal(z[i], x[i]);
});

test('a noise swell rises into `end` and stops dead on it, its band climbing', () => {
  const b = new Float32Array(ms(400));
  const end = ms(300);
  noiseSwell(b, end, ms(200), SR, { from: 300, to: 3000, gain: 0.12, seed: 1401 });
  assert.equal(peak(b, 0, end - ms(200)), 0);
  assert.equal(peak(b, end), 0, 'nothing after its end');
  assert.ok(rms(b, end - ms(30), end - ms(2)) > 5 * rms(b, end - ms(190), end - ms(160)), 'swells');
  assert.ok(peak(b) <= 0.12 * 3);
});

test('paper slaps: short, mostly above 400 Hz, a step higher per piece', () => {
  const at = (step) => {
    const b = new Float32Array(ms(200));
    paperSlap(b, ms(25), SR, { gain: 0.18, step, seed: 1410 });
    return b;
  };
  const a = at(0);
  const c = at(8);
  assert.equal(peak(a, 0, ms(25)), 0);
  assert.equal(peak(a, ms(90)), 0);
  assert.ok(band(a, 0, 4096, 400, 12000) > band(a, 0, 4096, 20, 300));
  assert.ok(peakHz(c, 0, 4096, 60, 400) > 1.4 * peakHz(a, 0, 4096, 60, 400), 'the body steps up');
});

test('a radar ping: a short square at its pitch, gone within 60 ms', () => {
  const b = new Float32Array(ms(200));
  radarPing(b, 0, SR, { freq: 1046.5, gain: 0.05 });
  assert.equal(peak(b, ms(60)), 0);
  assert.ok(Math.abs(peakHz(b, 0, 2048, 300, 3000) - 1046.5) < 30);
  assert.ok(peak(b) <= 0.05 * 1.3);
});

test('a print thump: its note over a low thud, under 80 ms', () => {
  const b = new Float32Array(ms(200));
  printThump(b, 0, SR, { freq: 1174.66, gain: 0.05 });
  assert.equal(peak(b, ms(80)), 0);
  assert.ok(Math.abs(peakHz(b, 0, 2048, 600, 4000) - 1174.66) < 30);
  assert.ok(band(b, 0, 2048, 50, 200) > 0.2 * band(b, 0, 2048, 600, 4000), 'and a thud under it');
});

test('the boing: a sine bent down from `from` to `to` with a wobble, gone by its length', () => {
  const b = new Float32Array(ms(400));
  boing(b, 0, SR, { from: 500, to: 180, ms: 220, gain: 0.05 });
  assert.equal(peak(b, ms(221)), 0);
  assert.ok(peakHz(b, 0, 1024, 100, 1000) > 1.5 * peakHz(b, ms(150), 2048, 100, 1000));
});

test('a chord stab (L14b): its chord, held 30 ms then gone within an eighth, high-passed, wide, the same for a seed', () => {
  const draw = (seed = 1480) => {
    const L = new Float32Array(ms(400));
    const R = new Float32Array(ms(400));
    chordStab(L, R, 0, SR, { freqs: [233.08, 293.66, 349.23, 440], gain: 0.16, holdMs: 30, decayMs: 60, lenMs: 195, bright: 2500, dark: 900, hp: 220, seed });
    return { L, R };
  };
  const { L, R } = draw();
  assert.equal(peak(L, ms(195)), 0, 'nothing after its length');
  assert.ok(rms(L, ms(150), ms(195)) < 10 ** (-18 / 20) * rms(L, 0, ms(40)), 'decaying: 18 dB down by 150 ms, and silent before the next eighth (200 ms)');
  assert.ok(rms(L, ms(20), ms(30)) > 0.9 * rms(L, ms(2), ms(12)), 'it holds its first 30 ms');
  assert.ok(band(L, 0, 4096, 20, 150) < 0.02 * band(L, 0, 4096, 200, 5000), 'little under 150 Hz: no low mush under the bass');
  assert.ok(Math.abs(peakHz(L, 0, 4096, 150, 600) - 233.08) < 15 || Math.abs(peakHz(L, 0, 4096, 150, 600) - 293.66) < 15 || Math.abs(peakHz(L, 0, 4096, 150, 600) - 349.23) < 15 || Math.abs(peakHz(L, 0, 4096, 150, 600) - 440) < 15, 'its strongest tone is a chord tone');
  let d = 0;
  for (let i = 0; i < L.length; i++) d = Math.max(d, Math.abs(L[i] - R[i]));
  assert.ok(d > 0.1 * peak(L), 'its voices spread across the field');
  const again = draw();
  assert.ok(again.L.every((v, i) => v === L[i]), 'deterministic for a seed');
});
