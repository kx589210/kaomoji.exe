import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Biquad } from '../scripts/audio/filters.mjs';
import { fmBell } from '../scripts/audio/fm.mjs';
import { powerOn, reverseCymbal, swarm, whoosh } from '../scripts/audio/fx.mjs';
import { keyPan, keyPress } from '../scripts/audio/keys.mjs';
import { correlation } from '../scripts/audio/meter.mjs';
import { addMono, panGains, stereo } from '../scripts/audio/mix.mjs';
import { plate } from '../scripts/audio/reverb.mjs';
import { pulseArp, subPulse } from '../scripts/audio/synth.mjs';
import { fft } from '../scripts/lib/fft.mjs';

const SR = 48000;
const rms = (x, a = 0, b = x.length) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const peakHz = (x, from, n) => {
  const re = Float64Array.from(x.subarray(from, from + n));
  const im = new Float64Array(n);
  fft(re, im);
  let best = 1;
  for (let k = 1; k < n / 2; k++) if (re[k] ** 2 + im[k] ** 2 > re[best] ** 2 + im[best] ** 2) best = k;
  return (best * SR) / n;
};

test('constant-power pan', () => {
  assert.deepEqual(panGains(-1).map((g) => +g.toFixed(9)), [1, 0]);
  for (const p of [-1, -0.4, 0, 0.3, 1]) {
    const [l, r] = panGains(p);
    assert.ok(Math.abs(l * l + r * r - 1) < 1e-12);
  }
  const d = stereo(8);
  addMono(d, Float32Array.of(1, 1), { at: 3, pan: -1 });
  assert.deepEqual([...d.L], [0, 0, 0, 1, 1, 0, 0, 0]);
  assert.ok(d.R.every((v) => Math.abs(v) < 1e-9));
});

test('a keystroke starts exactly on its sample, and Enter is louder than a letter', () => {
  const a = new Float32Array(SR);
  keyPress(a, 1000, SR, { seed: 5 });
  assert.equal(a[999], 0);
  assert.ok(Math.max(...a.subarray(1000, 1048).map(Math.abs)) > 0.01, 'sound within 1 ms');
  const b = new Float32Array(SR);
  keyPress(b, 1000, SR, { seed: 5 });
  assert.deepEqual(a, b, 'deterministic');
  const e = new Float32Array(SR);
  keyPress(e, 1000, SR, { kind: 'enter', seed: 5 });
  assert.ok(rms(e, 1000, 4000) > 1.3 * rms(a, 1000, 4000));
  assert.ok(Math.max(...e.map(Math.abs)) < 1);
});

test('keys sit where they are on a QWERTY keyboard', () => {
  assert.ok(keyPan('q') < keyPan('p'));
  assert.ok(keyPan('a') < 0 && keyPan('-') > 0);
  assert.equal(keyPan(' '), 0);
  for (const ch of 'kaomoji-run\n') assert.ok(Math.abs(keyPan(ch)) <= 0.62);
});

test('an unmodulated FM bell rings at its pitch and decays', () => {
  const x = new Float32Array(SR);
  fmBell(x, 0, SR, { freq: 1000, index: 0, decay: 0.2 });
  assert.ok(Math.abs(peakHz(x, 0, 8192) - 1000) < 6);
  // τ = 0.2 s: the last 100 ms of the first second sit about 39 dB below the strike.
  assert.ok(rms(x, SR - 4800) < rms(x, 0, 4800) / 50);
});

test('the plate reverb is silent through its predelay, decays, and is wide', () => {
  const n = 6 * SR;
  const imp = new Float32Array(n);
  imp[0] = 1;
  const { L, R } = plate(imp, imp, SR, { predelayMs: 20, decay: 0.5 });
  const pre = Math.round(0.02 * SR);
  assert.ok(L.subarray(0, pre).every((v) => v === 0) && R.subarray(0, pre).every((v) => v === 0));
  assert.ok(L.every(Number.isFinite) && R.every(Number.isFinite));
  const total = rms(L) ** 2 * n;
  const tail = rms(L, n - SR / 2) ** 2 * (SR / 2);
  assert.ok(tail < 1e-6 * total, `tail energy ${tail / total}`);
  assert.ok(Math.abs(correlation(L.subarray(SR / 10, 2 * SR), R.subarray(SR / 10, 2 * SR))) < 0.3);
});

test('a reverse cymbal swells into its end and stops there', () => {
  const x = new Float32Array(SR);
  reverseCymbal(x, 30000, 20000, SR, { seed: 3 });
  assert.ok(rms(x, 30000 - 2400, 30000) > 10 * rms(x, 10000, 12400));
  assert.ok(x.subarray(30000).every((v) => v === 0));
});

test('the 8-bit arp: a low cutoff takes out the highs', () => {
  const note = [{ at: 0, len: SR / 2, freq: 440, duty: 0.25 }];
  const hf = (cut) => {
    const x = new Float32Array(SR / 2);
    pulseArp(x, note, SR, { cutoff: () => cut });
    const hp = Biquad.highpass(SR, 2500);
    return rms(x.map((v) => hp.process(v)));
  };
  assert.ok(hf(300) < 0.1 * hf(6000));
});

test('a sub pulse sits at its frequency', () => {
  const x = new Float32Array(SR);
  subPulse(x, 0, SR, { freq: 55 });
  assert.ok(Math.abs(peakHz(x, 4800, 16384) - 55) < 3);
});

test('the swarm stays inside its window and is deterministic; the others are finite', () => {
  const run = () => {
    const d = stereo(SR);
    swarm(d.L, d.R, 10000, 20000, SR, { seed: 4 });
    return d;
  };
  const a = run();
  assert.deepEqual(a.L, run().L);
  assert.ok(a.L.subarray(0, 10000).every((v) => v === 0));
  assert.ok(rms(a.L, 10000, 30000) > 0);
  const w = new Float32Array(SR);
  whoosh(w, 0, 20000, SR);
  powerOn(w, 0, SR);
  assert.ok(w.every(Number.isFinite) && Math.max(...w.map(Math.abs)) < 2);
});

test('the 8-bit arp has no DC offset at any duty, even with gaps between notes', () => {
  const notes = [0.125, 0.25, 0.5, 0.25].map((duty, k) => ({ at: k * 6000, len: 4800, freq: 440, duty }));
  const x = new Float32Array(30000);
  pulseArp(x, notes, SR, { gain: 0.15, cutoff: () => 6000 });
  const mean = x.reduce((a, v) => a + v, 0) / x.length;
  assert.ok(Math.abs(mean) < 5e-4, `mean ${mean}`);
});
