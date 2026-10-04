// The intro's new voices (scripts/audio/introVoices.mjs; the bars 1–14 design notes/b112/final.md §8.2, build sheet
// notes/b114/sheet.md §10): the RAIN bar's whooshes, hiss, drips and sub swell, the CRT thunk, and the Defender's dry voices
// (music bible M8: pure tones, pitch class C, dry and narrow) that the intro and the build both play.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFENDER_PITCH, beeps, crtThunk, drip, glide, rainHiss, subSwell, sweep } from '../scripts/audio/introVoices.mjs';
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
/** Energy between lo and hi Hz in the n samples from `from` (n a power of two), Hann-windowed. */
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
/** Zero crossings a second, halved: the pitch of a pure tone over [a, b). */
const zcHz = (x, a, b) => {
  let n = 0;
  for (let i = a + 1; i < b; i++) if (x[i] >= 0 !== x[i - 1] >= 0) n++;
  return (n / (b - a)) * (SR / 2);
};

test('the Defender sings in pitch class C (M8): C6 and C7', () => {
  assert.ok(Math.abs(DEFENDER_PITCH.c6 - 1046.5) < 0.1 && Math.abs(DEFENDER_PITCH.c7 - 2093) < 0.1);
});

test('sweep: band-passed noise loudest at its `peak` share, its band moving from → to, nothing outside [at, at + len)', () => {
  const len = ms(400);
  for (const p of [0.3, 0.8]) {
    const b = new Float32Array(ms(600));
    sweep(b, ms(100), len, SR, { from: 300, to: 4000, peak: p, gain: 0.3, seed: 101 });
    assert.equal(peak(b, 0, ms(100)), 0);
    assert.equal(peak(b, ms(100) + len), 0);
    const step = ms(20);
    let best = 0;
    let bestAt = 0;
    for (let i = ms(100); i + step <= ms(100) + len; i += step) {
      const r = rms(b, i, i + step);
      if (r > best) [best, bestAt] = [r, (i + step / 2 - ms(100)) / len];
    }
    assert.ok(Math.abs(bestAt - p) < 0.08, `peak share ${p}: loudest at ${bestAt.toFixed(2)}`);
  }
  const b = new Float32Array(ms(600));
  sweep(b, 0, ms(500), SR, { from: 300, to: 4000, peak: 0.5, gain: 0.3, seed: 101 });
  const lowShare = (from) => band(b, from, 4096, 150, 900) / band(b, from, 4096, 1800, 6000);
  assert.ok(lowShare(ms(20)) > 5 * lowShare(ms(370)), `the band rises: low/high ${lowShare(ms(20)).toFixed(2)} → ${lowShare(ms(370)).toFixed(2)}`);
  const c = new Float32Array(ms(600));
  sweep(c, 0, ms(500), SR, { from: 300, to: 4000, peak: 0.5, gain: 0.3, seed: 101 });
  assert.deepEqual(b, c, 'deterministic for a seed');
});

test('rain hiss: noise centred near 4 kHz that rises over `rise` and is gone by its end', () => {
  const len = ms(1600);
  const b = new Float32Array(len + ms(50));
  rainHiss(b, 0, len, SR, { gain: 0.04, rise: ms(1200), seed: 102 });
  assert.ok(rms(b, ms(1000), ms(1200)) > 4 * rms(b, ms(20), ms(220)), 'rises');
  assert.ok(rms(b, ms(1200), ms(1250)) > 3 * rms(b, len - ms(60), len), 'ducks into its end');
  assert.equal(peak(b, len), 0, 'nothing after');
  const mid = band(b, ms(1000), 8192, 2500, 6500);
  assert.ok(mid > band(b, ms(1000), 8192, 20, 1500) && mid > band(b, ms(1000), 8192, 9000, 24000), 'a 4 kHz band');
  assert.ok(peak(b) < 0.04 * 4, 'at its level');
});

test('a drip: a short FM blip gliding down seven semitones, gone within 60 ms', () => {
  const b = new Float32Array(ms(200));
  drip(b, 0, SR, { freq: 2093, gain: 0.03 });
  assert.equal(peak(b, ms(60)), 0);
  const early = peakHz(b, 0, 256, 500, 6000);
  const late = peakHz(b, ms(25), 512, 500, 6000);
  assert.ok(early > 1.25 * late, `glides down: ${early.toFixed(0)} → ${late.toFixed(0)} Hz`);
  assert.ok(Math.abs(late / 2093 - 2 ** (-7 / 12)) < 0.12, `lands a fifth down (${late.toFixed(0)} Hz)`);
  assert.ok(peak(b) <= 0.03 * 1.01);
});

test('the sub swell: a bump on its downbeat, then a body that swells, released before its end', () => {
  const len = ms(1600);
  const b = new Float32Array(len + ms(100));
  subSwell(b, 0, len, SR, { freq: 65.41, gain: 0.4 });
  assert.ok(peak(b, 0, ms(60)) > 0.6 * peak(b), 'a bump on the downbeat');
  assert.ok(rms(b, ms(700), ms(900)) > 1.3 * rms(b, ms(250), ms(450)), 'then it swells');
  assert.ok(rms(b, len - ms(20), len) < 0.15 * rms(b, ms(700), ms(900)), 'released into its end');
  assert.equal(peak(b, len), 0);
  assert.ok(Math.abs(zcHz(b, ms(600), ms(1000)) - 65.41) < 4, 'at its pitch');
  assert.ok(peak(b) <= 0.4 * 1.001);
});

test('the CRT thunk: an 80 Hz thump for about 120 ms and a faint 15.7 kHz flyback blip, 30 dB under it', () => {
  const b = new Float32Array(ms(400));
  crtThunk(b, ms(30), SR, { gain: 0.3 });
  assert.equal(peak(b, 0, ms(30)), 0);
  assert.ok(Math.abs(peakHz(b, 0, 8192, 30, 400) - 80) < 12);
  assert.ok(rms(b, ms(180), ms(280)) < 0.1 * rms(b, ms(30), ms(80)), 'gone after about 120 ms');
  const hi = band(b, 0, 8192, 14000, 17500);
  const lo = band(b, 0, 8192, 30, 300);
  const db = 10 * Math.log10(hi / lo);
  assert.ok(db < -20 && db > -45, `the whine ${db.toFixed(1)} dB under the thump`);
  assert.ok(peak(b) <= 0.31);
});

test('the Defender’s beeps: `count` dry C7 tones, `ms` long, onsets `gap` ms apart', () => {
  const b = new Float32Array(ms(300));
  beeps(b, ms(10), SR, { freq: DEFENDER_PITCH.c7, ms: 30, gap: 60, count: 2, gain: 0.05 });
  assert.equal(peak(b, 0, ms(10)), 0);
  for (const on of [10, 70]) {
    assert.ok(rms(b, ms(on + 5), ms(on + 25)) > 0.025, `a beep at ${on} ms`);
    assert.ok(Math.abs(zcHz(b, ms(on + 2), ms(on + 28)) - 2093) < 60);
  }
  assert.equal(peak(b, ms(42), ms(68)), 0, 'a gap between them');
  assert.equal(peak(b, ms(102)), 0, 'nothing after the second');
  assert.ok(peak(b) <= 0.05 * 1.001);
});

test('a glide: a pure sine from `from` to `to` Hz over `ms`, its hold, and a clean end', () => {
  const b = new Float32Array(ms(400));
  glide(b, 0, SR, { from: 1046.5, to: 523.25, ms: 200, holdMs: 0, gain: 0.05 });
  assert.ok(Math.abs(zcHz(b, ms(5), ms(30)) - 1000) < 80);
  assert.ok(Math.abs(zcHz(b, ms(170), ms(195)) - 560) < 60);
  assert.equal(peak(b, ms(201)), 0);
  const c = new Float32Array(ms(400));
  glide(c, 0, SR, { from: 300, to: 1200, ms: 200, holdMs: 100, gain: 0.04 });
  assert.ok(Math.abs(zcHz(c, ms(220), ms(290)) - 1200) < 40, 'holds the top');
  assert.ok(rms(c, ms(240), ms(280)) > 0.02);
  assert.equal(peak(c, ms(301)), 0);
  assert.ok(peak(c) <= 0.04 * 1.001);
});
