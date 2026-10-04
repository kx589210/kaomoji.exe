import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { kick } from '../scripts/audio/drums.mjs';
import { SVF } from '../scripts/audio/filters.mjs';
import { limit } from '../scripts/audio/limiter.mjs';
import { correlation, integratedLoudness, truePeakDb } from '../scripts/audio/meter.mjs';
import { Osc } from '../scripts/audio/osc.mjs';
import { readWav, writeWav } from '../scripts/audio/wav.mjs';
import { xcorrLag } from '../scripts/lib/fft.mjs';

const SR = 48000;
const sine = (f, amp, seconds, phase = 0) => Float32Array.from({ length: Math.round(SR * seconds) }, (_, i) => amp * Math.sin(2 * Math.PI * f * (i / SR) + phase));
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);

test('WAV round-trip without dither is exact to 1 LSB and clamps overs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-wav-'));
  const L = Float32Array.from([0, 0.5, -0.5, 1.7, -2]);
  const R = Float32Array.from([0.25, -0.25, 0, 0, 0]);
  writeWav(path.join(dir, 'a.wav'), L, R, SR, { dither: false });
  const { sampleRate, channels } = readWav(path.join(dir, 'a.wav'));
  assert.equal(sampleRate, SR);
  [0, 0.5, -0.5, 1, -1].forEach((v, i) => assert.ok(Math.abs(channels[0][i] - v) <= 1 / 32767 + 1e-9, `L[${i}]`));
  assert.ok(Math.abs(channels[1][0] - 0.25) <= 1 / 32767 + 1e-9);
});

test('EBU Tech 3341 case 1: 1 kHz stereo sine at −23 dBFS reads −23 LUFS', () => {
  const x = sine(1000, 10 ** (-23 / 20), 20);
  assert.ok(Math.abs(integratedLoudness(x, x, SR) + 23) < 0.1);
});

test('true peak finds inter-sample peaks', () => {
  const x = sine(SR / 4, 0.5, 1, Math.PI / 4);
  const samplePeak = Math.max(...x.map(Math.abs));
  assert.ok(samplePeak < 0.36);
  assert.ok(Math.abs(truePeakDb(x, x) - 20 * Math.log10(0.5)) < 0.2);
});

test('correlation: identical, inverted, independent', () => {
  const x = sine(440, 0.5, 0.5);
  assert.ok(correlation(x, x) > 0.999);
  assert.ok(correlation(x, x.map((v) => -v)) < -0.999);
  const y = sine(523.25, 0.5, 0.5);
  assert.ok(Math.abs(correlation(x, y)) < 0.05);
});

test('limiter keeps an overdriven signal under its ceiling', () => {
  const L = sine(100, 2, 1);
  const R = sine(150, 1.5, 1);
  limit(L, R, SR, { ceilingDb: -1, lookaheadMs: 5, releaseMs: 80 });
  const ceil = 10 ** (-1 / 20);
  assert.ok(Math.max(...L.map(Math.abs), ...R.map(Math.abs)) <= ceil + 1e-6);
});

test('limiter keeps inter-sample peaks under its ceiling too (true peak)', () => {
  // A quarter-rate sine at 45°: every sample sits at 0.707 of the waveform's peak.
  const L = sine(SR / 4, 1.2, 1, Math.PI / 4);
  const R = sine(SR / 4, 1.2, 1, Math.PI / 4);
  limit(L, R, SR, { ceilingDb: -1 });
  assert.ok(truePeakDb(L, R) <= -1 + 1e-3, `true peak ${truePeakDb(L, R).toFixed(2)} dBTP`);
  // A dense saw chord: many partials, peaks between samples.
  const saw = (f, i) => ((i * f) / SR) % 1 * 2 - 1;
  const n = SR;
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    for (const f of [220, 277.2, 329.6, 440.1, 554.4, 659.3]) {
      A[i] += 0.45 * saw(f, i);
      B[i] += 0.45 * saw(f * 1.003, i);
    }
  }
  limit(A, B, SR, { ceilingDb: -1 });
  assert.ok(truePeakDb(A, B) <= -1 + 1e-3, `saw chord true peak ${truePeakDb(A, B).toFixed(2)} dBTP`);
});

test('SVF low-pass keeps 100 Hz and cuts 10 kHz', () => {
  const filt = (f) => {
    const s = new SVF(SR);
    const x = sine(f, 1, 0.5);
    const y = x.map((v) => (s.process(v, 500, 0.707), s.lp));
    return rms(y.subarray(SR / 10)) / rms(x.subarray(SR / 10));
  };
  assert.ok(filt(100) > 0.9);
  assert.ok(filt(10000) < 0.01);
});

test('band-limited saw has no DC and the right period', () => {
  const o = new Osc(SR);
  const x = Float32Array.from({ length: SR }, () => o.saw(100));
  const mean = x.reduce((s, v) => s + v, 0) / x.length;
  assert.ok(Math.abs(mean) < 0.01);
  // PolyBLEP spreads each reset over two samples, so count entries into the
  // low region instead of single big drops.
  let wraps = 0;
  for (let i = 1; i < x.length; i++) if (x[i] < -0.5 && x[i - 1] >= -0.5) wraps++;
  assert.ok(Math.abs(wraps - 100) <= 1, `wraps ${wraps}`);
});

test('kick energy sits below 150 Hz', () => {
  const out = new Float32Array(SR);
  kick(out, 0, SR, {}, 1);
  const low = new SVF(SR);
  const lp = out.map((v) => (low.process(v, 150, 0.707), low.lp));
  assert.ok(rms(lp) / rms(out) > 0.7);
});

test('xcorrLag recovers a delay', () => {
  const a = Float32Array.from({ length: 20000 }, (_, i) => Math.sin(i * 0.01) * Math.sin(i * 0.137) + ((i * 7919) % 13) / 13 - 0.5);
  const b = new Float32Array(a.length);
  b.set(a.subarray(0, a.length - 37), 37);
  assert.equal(xcorrLag(a, b, 200), 37);
});
