import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clap, pop, press, snare } from '../scripts/audio/drums.mjs';
import { crash, flutter, inhale } from '../scripts/audio/fx.mjs';
import { correlation } from '../scripts/audio/meter.mjs';
import { applyGain, duck, gate, pingPong, stereo, truncate } from '../scripts/audio/mix.mjs';
import { pluckBass, supersaw } from '../scripts/audio/synth.mjs';
import { voxChop } from '../scripts/audio/vox.mjs';
import { fft } from '../scripts/lib/fft.mjs';

const SR = 48000;
const rms = (x, a = 0, b = x.length) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const peak = (x, a, b) => {
  let m = 0;
  for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
};
/** Energy between lo and hi Hz in the n samples from `from` (n a power of two). */
const band = (x, from, n, lo, hi) => {
  const re = Float64Array.from(x.subarray(from, from + n));
  const im = new Float64Array(n);
  fft(re, im);
  let s = 0;
  for (let k = Math.ceil((lo * n) / SR); k <= Math.floor((hi * n) / SR); k++) s += re[k] ** 2 + im[k] ** 2;
  return s;
};
const peakHz = (x, from, n, hi = SR / 2) => {
  const re = Float64Array.from(x.subarray(from, from + n));
  const im = new Float64Array(n);
  fft(re, im);
  let best = 1;
  for (let k = 1; k < Math.min(n / 2, (hi * n) / SR); k++) if (re[k] ** 2 + im[k] ** 2 > re[best] ** 2 + im[best] ** 2) best = k;
  return (best * SR) / n;
};
const ms = (t) => Math.round((t / 1000) * SR);

test('a clap is four quick bursts of mid-range noise, then a tail', () => {
  const b = new Float32Array(SR);
  clap(b, 100, SR, { gain: 0.5 }, 3);
  assert.equal(peak(b, 0, 100), 0);
  for (const t of [9, 18, 28]) assert.ok(peak(b, 100 + ms(t), 100 + ms(t + 2)) > 2 * peak(b, 100 + ms(t - 3), 100 + ms(t - 1)), `a burst at ${t} ms`);
  const mid = band(b, 100, 8192, 600, 2500);
  assert.ok(mid > band(b, 100, 8192, 2500, 12000) && mid > band(b, 100, 8192, 20, 400));
});

test('a snare has a tonal body at its tone, and a higher snare sounds higher', () => {
  for (const tone of [180, 360]) {
    const b = new Float32Array(SR);
    snare(b, 0, SR, { tone, gain: 0.5 }, 4);
    const hz = peakHz(b, 0, 4096, 1000);
    assert.ok(hz > 0.95 * tone && hz < 1.15 * tone, `${tone}: ${hz}`); // its pitch drops onto the tone in the first 30 ms
  }
});

test('a crash rings on for over a second; a pop and a press are short and finite', () => {
  const c = new Float32Array(3 * SR);
  crash(c, 0, SR, { gain: 0.3, decay: 1.4 }, 5);
  assert.ok(rms(c, SR, SR + ms(100)) > 0.05 * rms(c, 0, ms(100)));
  assert.ok(band(c, 0, 8192, 5000, 20000) > band(c, 0, 8192, 20, 2000));
  const p = new Float32Array(SR / 4);
  pop(p, 0, SR, { freq: 900, gain: 0.1 });
  assert.equal(peak(p, ms(75), p.length), 0);
  const q = new Float32Array(SR / 4);
  press(q, 0, SR, { gain: 0.3 }, 6);
  assert.ok(q.every(Number.isFinite) && band(q, 0, 4096, 40, 150) > band(q, 0, 4096, 150, 1000));
});

test('a plucked bass sits at its pitch and its brightness snaps shut', () => {
  const b = new Float32Array(SR);
  pluckBass(b, [{ at: 0, len: ms(400), freq: 55 }], SR, { gain: 0.4 });
  assert.ok(Math.abs(peakHz(b, 0, 16384, 400) - 55) < 4, `${peakHz(b, 0, 16384, 400)}`);
  assert.ok(band(b, 0, 2048, 400, 3000) > 10 * band(b, ms(150), 2048, 400, 3000));
});

test('a run of plucked bass notes carries no DC', () => {
  const b = new Float32Array(2 * SR);
  const notes = Array.from({ length: 16 }, (_, i) => ({ at: i * ms(100), len: ms(80), freq: 55 }));
  pluckBass(b, notes, SR, { gain: 0.4 });
  const mean = b.reduce((s, v) => s + v, 0) / b.length;
  assert.ok(Math.abs(mean) < 2e-4, `mean ${mean}`);
});

test('supersaw chords are wide but not hollow', () => {
  const L = new Float32Array(SR);
  const R = new Float32Array(SR);
  supersaw(L, R, [{ at: 0, len: SR, freqs: [220, 277.18, 329.63] }], SR, { gain: 0.1, cutoff: () => 4000 });
  const c = correlation(L.subarray(ms(200), ms(900)), R.subarray(ms(200), ms(900)));
  assert.ok(c > 0.3 && c < 0.75, `correlation ${c}`);
  assert.ok(Math.abs(L.reduce((s, v) => s + v, 0) / L.length) < 1e-3, 'no DC');
});

test("a vocal chop sounds like its vowel: 'a' is open, 'i' is bright", () => {
  // Same source and gain, so the energy in each formant region shows the vowel's shape.
  const sing = (vowel) => {
    const b = new Float32Array(SR / 2);
    voxChop(b, 0, SR, { freq: 220, len: ms(300), vowel, gain: 0.3, seed: 7 });
    return { f1: band(b, ms(20), 8192, 700, 900), f2: band(b, ms(20), 8192, 2000, 2400) };
  };
  const a = sing('a');
  const i = sing('i');
  assert.ok(a.f1 > 3 * i.f1, `F1 of a ${a.f1} vs i ${i.f1}`);
  assert.ok(i.f2 > 2 * a.f2, `F2 of i ${i.f2} vs a ${a.f2}`);
});

test('a reverse inhale swells into its end and stops there; paper flutter stays in its window', () => {
  const b = new Float32Array(SR);
  inhale(b, ms(500), ms(200), SR, { gain: 0.4, seed: 8 });
  assert.ok(rms(b, ms(480), ms(500)) > 4 * rms(b, ms(300), ms(320)));
  assert.equal(peak(b, ms(500), b.length), 0);
  assert.equal(peak(b, 0, ms(300)), 0);
  const f = new Float32Array(SR);
  flutter(f, ms(100), ms(200), SR, { gain: 0.2, seed: 9 });
  assert.equal(peak(f, 0, ms(100)) + peak(f, ms(300), f.length), 0);
});

test('ducking dips right after each kick and recovers before the next; gain curves apply in place', () => {
  const g = duck(SR, [1000, 20200], SR, { depth: 0.7, attackMs: 3, releaseMs: 140 });
  assert.equal(g[999], 1);
  assert.ok(Math.abs(g[1000 + ms(3)] - 0.3) < 0.01);
  assert.ok(g[20199] > 0.95);
  assert.ok(g.every((v) => v >= 0.3 - 1e-6 && v <= 1));
  const bus = stereo(4);
  bus.L.fill(1);
  bus.R.fill(2);
  applyGain(bus, Float32Array.of(1, 0.5, 0, 1));
  assert.deepEqual([...bus.L, ...bus.R], [1, 0.5, 0, 1, 2, 1, 0, 2]);
});

test('ping-pong echoes go right, then left, each quieter', () => {
  const bus = stereo(SR);
  bus.L[0] = 1;
  bus.R[0] = 1;
  pingPong(bus, SR, { time: 0.1, feedback: 0.5, mix: 1 });
  const d = ms(100);
  assert.ok(Math.abs(bus.R[d] - 1) < 1e-6 && Math.abs(bus.L[d]) < 1e-6);
  assert.ok(Math.abs(bus.L[2 * d] - 0.5) < 1e-6 && Math.abs(bus.R[2 * d]) < 1e-6);
  assert.ok(Math.abs(bus.R[3 * d] - 0.25) < 1e-6);
});

test('gate silences a window after a short fade and leaves what follows alone; truncate cuts a voice', () => {
  const L = new Float32Array(1000).fill(1);
  const R = new Float32Array(1000).fill(1);
  gate(L, R, 500, 700, SR, 1);
  assert.equal(L[400], 1);
  assert.ok(L[490] > 0 && L[490] < 1);
  assert.ok(L.subarray(500, 700).every((v) => v === 0));
  assert.equal(L[700], 1);
  const b = new Float32Array(1000).fill(1);
  truncate(b, 600, SR, 1);
  assert.ok(b.subarray(600).every((v) => v === 0) && b[500] === 1 && b[595] < 1);
  const c = new Float32Array(10).fill(1);
  truncate(c, -5, SR);
  assert.ok(c.every((v) => v === 0));
});
