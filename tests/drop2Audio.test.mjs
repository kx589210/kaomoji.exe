// Drop 2's music (scripts/audio/sections/drop2.mjs; the new bars in scripts/audio/drop2Act2.mjs and drop2Bullet.mjs; voices in
// scripts/audio/drop2Voices.mjs and drop2Act2Voices.mjs), the part 'drop2' (20 bars), against its build sheet
// (notes/bid2/drop2-sheet2.md §3, §8) and the music bible (notes/prep/music.md §4.7, §6.3): F♯ major, drop 1's hook a semitone
// up climbing to its top on drop2 bar 5; the antivirus's half-time switch and its borrowed chords; act 2's five worlds, each with its
// groove and hook timbre; every hit on its frame; the freeze, the bullet time and the hand-off's zero; louder than drop 1 by 1.5 LU at
// the same ceiling. The carried bars (1–4, 6–7, 18–19) keep their as-built tests, moved with their score names. Every event comes from
// src/score/drop2.ts and is measured in the rendered audio, not only in the list; every other frame is written in drop 2's own bars
// (drop2At(bar, beat), 0-based beats as partFrame) or from a score name.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { digitalZeroIn, mixdown, renderStems } from '../scripts/audio/bgm.mjs';
import * as A2 from '../scripts/audio/drop2Act2.mjs';
import * as V from '../scripts/audio/drop2Act2Voices.mjs';
import { CROWN_NOTES, FREEZE_GAIN, MUSIC_BOX_FLAT, MUSIC_BOX_ON, TAPE_SAG } from '../scripts/audio/drop2Bullet.mjs';
import * as E from '../scripts/audio/drop2Edo.mjs';
import * as W from '../scripts/audio/drop2Worlds.mjs';
import { buzzLoops, chopGate, crush, gulp, rim, scrubAhead, shaker, slam, sweep, sweepBus, trackingCut, voxLine, wobble, wobbleCutoff, wobbleLfo } from '../scripts/audio/drop2Voices.mjs';
import { Biquad } from '../scripts/audio/filters.mjs';
import { CEILING_DB } from '../scripts/audio/limiter.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from '../scripts/audio/meter.mjs';
import { group as groupOf, sixteenths as sixteenthsOf } from '../scripts/audio/perceived.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { HOOK, VOICINGS } from '../scripts/audio/sections/drop1.mjs';
import * as S from '../scripts/audio/sections/drop2.mjs';
import { VOWELS, voxChop } from '../scripts/audio/vox.mjs';
import { readWav, writeWav } from '../scripts/audio/wav.mjs';
import { DELIVERY_AUDIO, DELIVERY_TRIM_DB } from '../scripts/lib/encode.mjs';
import { ffmpegPath } from '../scripts/lib/remotion.mjs';
import * as D2C from '../src/content/drop2.ts';
import * as BR from '../src/score/break.ts';
import { HAND_OFF_ZERO, TAPE_STOP } from '../src/score/bridgeB.ts';
import * as D2 from '../src/score/drop2.ts';
import { partEnd, partFrame, partStart } from '../src/score/film.ts';

const { PIPS, SIGNATURE_BYTES, byteVoice } = A2;
const SR = 48000;
const at = (frame) => Math.round((frame / 60) * SR);
/** A frame of drop 2: its bar (1-based) and beat (0-based). */
const drop2At = (bar, beat = 0) => partFrame('drop2', bar, beat);
const rms = (x, a, b) => {
  let s = 0;
  for (let i = Math.max(0, Math.round(a)); i < Math.round(b); i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, Math.round(b) - Math.round(a)));
};
const dB = (x) => (20 * Math.log10(Math.max(1e-12, x))).toFixed(1);
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
/** `x` through two 2-pole high-passes at `lo` (24 dB an octave) and, if `hi` is given, two 2-pole low-passes at `hi`. */
const band = (x, lo, hi) => {
  const fs = [Biquad.highpass(SR, lo), Biquad.highpass(SR, lo), ...(hi ? [Biquad.lowpass(SR, hi), Biquad.lowpass(SR, hi)] : [])];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
/** Frequency of `x` over [a, b) from its rising zero crossings (Hz): for sines. */
const zcPitch = (x, a, b) => {
  const ups = [];
  for (let i = Math.round(a) + 1; i < Math.round(b); i++) if (x[i - 1] < 0 && x[i] >= 0) ups.push(i - x[i] / (x[i] - x[i - 1]));
  return ups.length < 2 ? 0 : ((ups.length - 1) * SR) / (ups[ups.length - 1] - ups[0]);
};
/** Fundamental of `x` over [a, b) by normalised autocorrelation between `lo` and `hi` Hz: for voices with formants. */
const acPitch = (x, a, b, lo = 150, hi = 2400) => {
  a = Math.round(a);
  b = Math.round(b);
  let best = 0;
  let lag = 0;
  const corr = (L) => {
    let s = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = a; i + L < b; i++) {
      s += x[i] * x[i + L];
      e1 += x[i] * x[i];
      e2 += x[i + L] * x[i + L];
    }
    return s / Math.sqrt(e1 * e2 + 1e-20);
  };
  const c = [];
  for (let L = Math.floor(SR / hi); L <= Math.ceil(SR / lo); L++) c[L] = corr(L);
  // The first peak above 0.85 of the best: the period, not a multiple of it.
  for (let L = Math.floor(SR / hi) + 1; L < Math.ceil(SR / lo); L++) if (c[L] > best) best = c[L];
  for (let L = Math.floor(SR / hi) + 1; L < Math.ceil(SR / lo); L++) {
    if (c[L] >= 0.85 * best && c[L] >= c[L - 1] && c[L] >= c[L + 1]) {
      lag = L + (0.5 * (c[L - 1] - c[L + 1])) / (c[L - 1] - 2 * c[L] + c[L + 1]);
      break;
    }
  }
  return lag ? SR / lag : 0;
};
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

// --- Voices (pure) -----------------------------------------------------------------------------------------------------------------

test('the shaker is a soft-attack hiss above 4 kHz, deterministic for a seed, gone within a sixteenth', () => {
  const b = new Float32Array(SR / 4);
  shaker(b, 1000, SR, { gain: 0.1, decayMs: 30 }, 4000);
  const c = new Float32Array(SR / 4);
  shaker(c, 1000, SR, { gain: 0.1, decayMs: 30 }, 4000);
  assert.deepEqual(b, c);
  assert.equal(rms(b, 0, 1000), 0, 'silent before its sample');
  const ms = (m) => (m / 1000) * SR;
  assert.ok(rms(b, 1000 + ms(3), 1000 + ms(6)) > 1.5 * rms(b, 1000, 1000 + ms(1)), 'it swells in (a shaker, not a hat)');
  const hi = band(b, 4000);
  assert.ok(rms(hi, 1000, 1000 + ms(40)) > 0.7 * rms(b, 1000, 1000 + ms(40)), 'its energy is above 4 kHz');
  assert.ok(rms(b, 1000 + ms(100), 1000 + ms(130)) < 0.01 * rms(b, 1000 + ms(2), 1000 + ms(12)), 'gone within a sixteenth (100 ms)');
});

test('the rim is a dry, bright knock: on its sample, mostly 400 Hz – 6 kHz, gone in 60 ms', () => {
  const b = new Float32Array(SR / 4);
  rim(b, 2000, SR, { gain: 0.2 }, 4001);
  assert.equal(rms(b, 0, 2000), 0);
  assert.ok(Math.abs(b[2002]) > 0, 'sounding from its sample');
  const mid = band(b, 400, 6000);
  assert.ok(rms(mid, 2000, 2000 + 0.03 * SR) > 0.6 * rms(b, 2000, 2000 + 0.03 * SR), 'its energy is in the knock band');
  assert.ok(rms(b, 2000 + 0.06 * SR, 2000 + 0.1 * SR) < 0.01 * rms(b, 2000, 2000 + 0.01 * SR), 'gone in 60 ms');
});

test('the wobble LFO is +1 on every period start of WOBBLE_RATES, −1 halfway, continuous where the rate changes, 0 outside the wobble', () => {
  for (let k = 0; k < D2.WOBBLE_RATES.length; k++) {
    const r = D2.WOBBLE_RATES[k];
    const end = k + 1 < D2.WOBBLE_RATES.length ? D2.WOBBLE_RATES[k + 1].at : D2.WOBBLE.to;
    for (let f = r.at; f < end; f += r.every) {
      assert.ok(Math.abs(wobbleLfo(f) - 1) < 1e-9, `peak on ${f}`);
      assert.ok(Math.abs(wobbleLfo(f + r.every / 2) + 1) < 1e-9, `trough on ${f + r.every / 2}`);
    }
  }
  for (const r of D2.WOBBLE_RATES.slice(1)) assert.ok(Math.abs(wobbleLfo(r.at - 1e-3) - wobbleLfo(r.at)) < 1e-3, `continuous at ${r.at}`);
  assert.equal(wobbleLfo(D2.WOBBLE.from - 1), 0);
  assert.equal(wobbleLfo(D2.WOBBLE.to), 0);
  assert.ok(near(wobbleCutoff(-1), 180, 1e-9) && near(wobbleCutoff(1), 2400, 1e-9), 'the filter opens 180 Hz → 2.4 kHz');
});

test('the wobble is a saw and a sub-octave square through a resonant low-pass that opens on the LFO’s peaks', () => {
  const n = SR;
  const b = new Float32Array(n);
  const period = 0.2 * SR; // a test LFO: peaks every 200 ms
  wobble(b, [{ at: 0, len: n - 2000, freq: 116.54 }], SR, { gain: 0.3, lfo: (i) => Math.cos((2 * Math.PI * i) / period) });
  const hi = band(b, 1200);
  const peaks = [];
  const troughs = [];
  for (let k = 1; k < 4; k++) {
    peaks.push(rms(hi, k * period - 0.015 * SR, k * period + 0.015 * SR));
    troughs.push(rms(hi, (k + 0.5) * period - 0.015 * SR, (k + 0.5) * period + 0.015 * SR));
  }
  for (let k = 0; k < 3; k++) assert.ok(peaks[k] > 4 * troughs[k], `bright on the peak, dark in the trough: ${dB(peaks[k])} vs ${dB(troughs[k])} dB`);
  const low = band(b, 20, 90);
  assert.ok(rms(low, 0.3 * SR, 0.7 * SR) > 0.1 * rms(b, 0.3 * SR, 0.7 * SR), 'the sub octave (58 Hz) is there');
});

test('a sung line follows its pitch curve, and its formants follow a high note (it does not thin out like a plain chop)', () => {
  const b = new Float32Array(SR);
  voxLine(b, 0, SR, { len: 0.8 * SR, note: (t) => (t < 0.4 ? 80 : 87), vowel: 'a', gain: 0.3, seed: 4002 });
  assert.ok(near(acPitch(b, 0.15 * SR, 0.35 * SR), midiHz(80), 0.02), `${acPitch(b, 0.15 * SR, 0.35 * SR)} Hz`);
  assert.ok(near(acPitch(b, 0.55 * SR, 0.75 * SR), midiHz(87), 0.02), `${acPitch(b, 0.55 * SR, 0.75 * SR)} Hz`);
  assert.ok(rms(b, 0.83 * SR, SR) < 1e-4, 'it ends after its length');
  const level = (m, voice) => {
    const x = new Float32Array(SR / 2);
    if (voice === 'line') voxLine(x, 0, SR, { len: 0.4 * SR, note: () => m, vowel: 'a', gain: 0.3, seed: 4003 });
    else voxChop(x, 0, SR, { freq: midiHz(m), len: 0.4 * SR, vowel: 'a', gain: 0.3, seed: 4003 });
    return rms(x, 0.05 * SR, 0.35 * SR);
  };
  for (const m of [80, 87, 92, 95]) {
    const r = level(m, 'line') / level(80, 'line');
    assert.ok(r > 0.5 && r < 2, `MIDI ${m}: ${dB(r)} dB against MIDI 80`);
  }
  assert.ok(level(95, 'line') > 1.5 * level(95, 'chop'), 'louder up high than drop 1’s chop');
  assert.ok(VOWELS.a, 'drop 1’s vowel table is reused');
});

test('the 32nd gate restarts its attack on every chop and closes before the next one', () => {
  const chop = at(3);
  const g = chopGate(8 * chop, chop, SR, { attackMs: 1.5, duty: 0.7 });
  for (let k = 0; k < 8; k++) {
    assert.ok(g[k * chop] < 0.05, `chop ${k} starts closed`);
    assert.ok(g[k * chop + Math.round(0.004 * SR)] > 0.95, `chop ${k} is open 4 ms in`);
    assert.ok(g[(k + 1) * chop - 1] < 0.05, `chop ${k} is closed at its end`);
  }
});

test('the crusher quantises only inside its window and leaves the rest alone', () => {
  const x = Float32Array.from({ length: SR / 10 }, (_, i) => 0.3 * Math.sin(i / 9));
  const L = Float32Array.from(x);
  const R = Float32Array.from(x);
  crush(L, R, 1000, 3000, SR, { bits: 4, holdHz: 8000 });
  for (let i = 0; i < 1000 - 80; i += 7) assert.equal(L[i], x[i], `untouched before, ${i}`);
  for (let i = 3080; i < x.length; i += 7) assert.equal(L[i], x[i], `untouched after, ${i}`);
  const levels = new Set();
  for (let i = 1100; i < 2900; i++) levels.add(L[i]);
  assert.ok(levels.size <= 16, `4 bits: ${levels.size} levels`);
  for (let i = 1100; i < 2900; i++) assert.ok(Math.abs(L[i] - x[i]) < 0.25, 'still the signal');
});

test('the master sweep: a +6 dB peak climbing 500 Hz → 12 kHz and a shelf opening, a high-pass rising from its own start; nothing outside its window', () => {
  const n = SR * 2;
  const noise = Float32Array.from({ length: n }, (_, i) => Math.sin(i * 12.9898 + Math.sin(i * 78.233) * 43758.5453) * 0.2);
  const bus = { L: Float32Array.from(noise), R: Float32Array.from(noise) };
  const a = 0.25 * SR;
  const b = 1.75 * SR;
  const h = 1.25 * SR;
  sweepBus(bus, SR, a, b, { peak: [500, 12000], q: 2.5, gainDb: 6, shelfDb: 5, shelfHz: 8000, hp: { from: h, hz: [20, 280] } });
  for (let i = 0; i < a - 100; i += 101) assert.equal(bus.L[i], noise[i]);
  const ratio = (lo, hi, from, to) => rms(band(bus.L, lo, hi), from, to) / rms(band(noise, lo, hi), from, to);
  assert.ok(ratio(400, 650, a + 0.02 * SR, a + 0.1 * SR) > 1.4, `the peak starts near 500 Hz: ${dB(ratio(400, 650, a + 0.02 * SR, a + 0.1 * SR))} dB`);
  assert.ok(ratio(8000, 14000, b - 0.15 * SR, b - 0.02 * SR) > 1.8, 'brighter at the end');
  assert.ok(ratio(30, 120, b - 0.15 * SR, b - 0.02 * SR) < 0.6, 'the lows thinned by the high-pass');
  assert.ok(ratio(30, 120, h - 0.2 * SR, h - 0.05 * SR) > 0.85, 'no high-pass before its start');
});

// Iteration 3 (E10's whistle under the race): the bed is ducked where the whistle is — a peaking cut gliding with it, so it carves the
// whistle's own band out of the music and leaves the rest of the spectrum (and everything outside its window) alone.
test('a tracking cut glides with the whistle: a tone at its centre drops ≥ 9 dB, two octaves off it barely moves, nothing outside its window', () => {
  const n = SR;
  const a = 0.2 * SR;
  const b = 0.9 * SR;
  const centreAt = (i) => 2400 * (600 / 2400) ** ((i - a) / (b - a));
  // A tone that follows the cut's centre, and one two octaves under it.
  const tone = (k) => {
    const x = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      ph += (i < a ? 2400 : i >= b ? 600 : centreAt(i)) / k / SR;
      x[i] = 0.2 * Math.sin(2 * Math.PI * ph);
    }
    return x;
  };
  const on = tone(1);
  const off = tone(4);
  const busOn = { L: Float32Array.from(on), R: Float32Array.from(on) };
  const busOff = { L: Float32Array.from(off), R: Float32Array.from(off) };
  for (const bus of [busOn, busOff]) trackingCut(bus, SR, a, b, { from: 2400, to: 600, db: -12, q: 0.7, fadeMs: 20 });
  for (let i = 0; i < a - 10; i += 37) assert.equal(busOn.L[i], on[i], 'untouched before its window');
  const w = [a + 0.05 * SR, b - 0.05 * SR];
  const cut = 20 * Math.log10(rms(busOn.L, ...w) / rms(on, ...w));
  const spared = 20 * Math.log10(rms(busOff.L, ...w) / rms(off, ...w));
  assert.ok(cut <= -9, `the whistle's own band: ${cut.toFixed(1)} dB`);
  assert.ok(spared > -2.5, `two octaves under it: ${spared.toFixed(1)} dB`);
  assert.ok(Math.abs(20 * Math.log10(rms(busOn.L, b + 0.05 * SR, n) / rms(on, b + 0.05 * SR, n))) < 0.5, 'released after its window');
});

test('a sweep glides exponentially from one pitch to another, starting on its sample', () => {
  const b = new Float32Array(SR);
  sweep(b, 4800, SR, { from: 2400, to: 600, ms: 400, gain: 0.3 });
  assert.equal(rms(b, 0, 4800), 0);
  assert.ok(near(zcPitch(b, 4800 + 0.01 * SR, 4800 + 0.03 * SR), 2400 * 0.25 ** (0.02 / 0.4), 0.05));
  assert.ok(near(zcPitch(b, 4800 + 0.36 * SR, 4800 + 0.39 * SR), 600 * 4 ** (0.025 / 0.4), 0.05));
});

test('the gulp falls 300 → 90 Hz through an “o” and is gone soon after its length', () => {
  const b = new Float32Array(SR / 2);
  gulp(b, 0, SR, { from: 300, to: 90, ms: 150, gain: 0.12 });
  assert.ok(rms(b, 0, 0.15 * SR) > 0.01);
  const early = band(b, 200, 500);
  const late = band(b, 60, 150);
  assert.ok(rms(early, 0.005 * SR, 0.04 * SR) > rms(early, 0.11 * SR, 0.15 * SR), 'starts high');
  assert.ok(rms(late, 0.11 * SR, 0.15 * SR) > rms(late, 0.005 * SR, 0.04 * SR), 'ends low');
  assert.ok(rms(b, 0.25 * SR, 0.5 * SR) < 1e-4, 'gone');
});

test('the stuck buffer: its slice replays loop by loop, each quieter and darker, spliced without clicks, and stops', () => {
  const n = SR;
  const L = Float32Array.from({ length: n }, (_, i) => (i < 20000 ? 0.5 * Math.sin(i / 3) + 0.2 * Math.sin(i / 1.3) : 0));
  const R = Float32Array.from(L);
  const slice = 2400;
  const from = 20000;
  buzzLoops(L, R, SR, { from, slice, loops: 8, stepDb: -2.5, lp: [12000, 2000], fadeMs: 1.5 });
  const loudness = Array.from({ length: 8 }, (_, k) => rms(L, from + k * slice + 200, from + (k + 1) * slice - 200));
  for (let k = 1; k < 8; k++) assert.ok(loudness[k] < loudness[k - 1], `loop ${k} quieter: ${dB(loudness[k])} < ${dB(loudness[k - 1])}`);
  assert.ok(near(loudness[1] / loudness[0], 10 ** (-2.5 / 20), 0.25), `−2.5 dB a loop: ${dB(loudness[1] / loudness[0])}`);
  const hf = (k) => rms(band(L, 6000), from + k * slice + 200, from + (k + 1) * slice - 200) / loudness[k];
  assert.ok(hf(7) < 0.5 * hf(0), 'darker loop by loop');
  for (let i = from + 1; i < from + 8 * slice; i++) assert.ok(Math.abs(L[i] - L[i - 1]) < 0.35, `no click at ${i}`);
  assert.equal(rms(L, from + 8 * slice, n), 0, 'silent after the last loop');
});

// Iteration 2 (the director's ruling 12; sync review 3): blended in at −24 dB (6 %) under a kick, the scrub was 22.5 dB under the mix —
// never heard. Now it is a real skip: the bed drops out, the grain of the future plays in its place at `db`, then a short gap of silence,
// and the bed comes back — every splice faded, so nothing clicks and nothing gets louder than what it replaces.
test('the scrub-ahead is a real skip: the bed drops out for the reversed grain of the future at db, then a short gap, then comes back — no clicks, never louder', () => {
  const n = SR;
  const L = Float32Array.from({ length: n }, (_, i) => 0.8 * Math.sin(i / 50) * (i > 30000 ? 1 : 0.5));
  const R = Float32Array.from(L);
  const src = Float32Array.from(L);
  scrubAhead(L, R, SR, { from: 30000, to: 6000, ms: 40, db: -6, gapMs: 30 });
  const len = Math.round(0.04 * SR);
  const gap = Math.round(0.03 * SR);
  const g = 10 ** (-6 / 20);
  for (const k of [len / 4, len / 2, (3 * len) / 4].map(Math.round)) {
    assert.ok(Math.abs(L[6000 + k] - g * src[30000 + len - 1 - k]) < 1e-6, `the grain alone, the future reversed (${k})`);
  }
  assert.ok(rms(L, 6000 + len + 0.2 * gap, 6000 + len + 0.8 * gap) < 1e-6, 'then a gap of silence');
  for (let i = 0; i < 5990; i += 13) assert.equal(L[i], src[i], `before: ${i}`);
  for (let i = 6000 + len + gap; i < n; i += 13) assert.equal(L[i], src[i], `after: ${i}`);
  let step = 0;
  for (let i = 5990; i < 6000 + len + gap + 10; i++) step = Math.max(step, Math.abs(L[i] - L[i - 1]));
  assert.ok(step < 0.05, `no click: the largest step ${step.toFixed(4)}`);
  for (let i = 0; i < n; i++) assert.ok(Math.abs(L[i]) <= Math.max(Math.abs(src[i]), g * 0.8) + 1e-6, `never louder: ${i}`);
  assert.deepEqual(L, R);
});

test('the slam: quiet sound comes out +db and eases back to the mix, peaks soft-clip at the ceiling (denser, not louder), nothing outside its window changes, and the clip does not alias', () => {
  const n = SR;
  const c = 10 ** (-1.2 / 20);
  const win = { from: 12000, to: 24000, out: 36000, db: 3 };
  const tone = (parts, peak) => {
    const x = Float32Array.from({ length: n }, (_, i) => parts.reduce((s, [hz, a]) => s + a * Math.sin((2 * Math.PI * hz * i) / SR + hz), 0));
    const p = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    return x.map((v) => (v * peak) / p);
  };
  // Quiet: a plain gain, +3 dB at full drive, easing back to exactly the mix; both channels alike; untouched outside.
  const L = tone([[1000, 1]], 0.01);
  const R = Float32Array.from(L);
  const src = Float32Array.from(L);
  slam(L, R, SR, win);
  assert.deepEqual(L, R, 'both channels alike');
  for (let i = 0; i < n; i++) if (i < win.from || i >= win.out) assert.equal(L[i], src[i], `sample ${i} untouched`);
  const gain = (a, b) => 20 * Math.log10(rms(L, a, b) / rms(src, a, b));
  assert.ok(Math.abs(gain(13000, 23000) - 3) < 0.05, `full drive: ${gain(13000, 23000).toFixed(3)} dB`);
  const easing = [24000, 28000, 32000].map((a) => gain(a, a + 4000));
  assert.ok(easing[0] > easing[1] && easing[1] > easing[2] && easing[2] < 0.6, `eases back: ${easing.map((g) => g.toFixed(2)).join(' → ')} dB`);
  assert.ok(Math.abs(gain(35800, 36000)) < 0.01, 'back to the mix at its end');
  assert.ok(Math.abs(L[win.from] - src[win.from]) < 1e-4, 'it eases in: no step on its first sample');
  // Loud: a dense signal peaking at the ceiling keeps its peaks there and gains density.
  const busy = [[210, 1], [613, 0.8], [1530, 0.7], [3700, 0.5], [7900, 0.35], [12100, 0.25]];
  const L2 = tone(busy, c);
  const src2 = Float32Array.from(L2);
  slam(L2, Float32Array.from(L2), SR, win);
  let peak = 0;
  for (let i = win.from; i < win.out; i++) peak = Math.max(peak, Math.abs(L2[i]));
  assert.ok(peak <= c * 10 ** (0.25 / 20), `peaks at the ceiling: ${dB(peak)} dB`);
  const denser = 20 * Math.log10(rms(L2, 13000, 23000) / rms(src2, 13000, 23000));
  assert.ok(denser >= 1.5, `denser: +${denser.toFixed(2)} dB RMS at the same peak`);
  // Aliasing: a 15 kHz tone at the ceiling clipped per sample folds its 3rd harmonic (45 kHz) down to 3 kHz; the slam's clip runs at
  // twice the rate and is band-limited back, so that fold stays far below the naive clip's.
  const hi = tone([[15000, 1]], c);
  const ours = Float32Array.from(hi);
  slam(ours, Float32Array.from(hi), SR, win);
  const g = 10 ** (3 / 20);
  const naive = hi.map((v, i) => (i >= 13000 && i < 23000 ? c * Math.tanh((g * v) / c) : v));
  const fold = (x) => rms(band(x, 2000, 4000), 14000, 22000);
  assert.ok(fold(ours) < fold(naive) * 10 ** (-30 / 20), `the fold at 3 kHz: ${dB(fold(ours))} dB against the naive clip’s ${dB(fold(naive))} dB`);
});

test('widen is an M/S rotation: over its bars the side above its corner rises by db and the mid there gives the power back, so each bar’s loudness stays; the lows and every sample outside stay', () => {
  const n = 2 * SR;
  const edges = [0.2 * SR, 0.9 * SR, 1.6 * SR];
  const sine = (hz, g) => Float32Array.from({ length: n }, (_, i) => g * Math.sin((2 * Math.PI * hz * i) / SR));
  const hiMid = sine(1000, 0.3);
  const loMid = sine(80, 0.2);
  // The second bar is wider already: its mid gives more back.
  const hiSide = sine(3000, 0.1).map((v, i) => (i >= edges[1] ? 2 * v : v));
  const loSide = sine(60, 0.1);
  const bus = { L: Float32Array.from(hiMid, (v, i) => v + loMid[i] + hiSide[i] + loSide[i]), R: Float32Array.from(hiMid, (v, i) => v + loMid[i] - hiSide[i] - loSide[i]) };
  const before = { L: bus.L.slice(), R: bus.R.slice() };
  const gm = S.widen(bus, SR, edges, { db: 2, hz: 300 });
  for (const i of [0, edges[0] - 1, edges[2], n - 1]) assert.ok(bus.L[i] === before.L[i] && bus.R[i] === before.R[i], `sample ${i} untouched`);
  assert.equal(gm.length, 2);
  assert.ok(gm[0] < 0 && gm[1] < gm[0], `the mid gives back more where the side has more: ${gm.map((g) => g.toFixed(2)).join(', ')} dB`);
  const ms = (x) => ({ m: Float32Array.from(x.L, (v, i) => 0.5 * (v + x.R[i])), s: Float32Array.from(x.L, (v, i) => 0.5 * (v - x.R[i])) });
  const [now, was] = [ms(bus), ms(before)];
  const gain = (x, y, lo, hi, a, b) => 20 * Math.log10(rms(band(x, lo, hi), a, b) / rms(band(y, lo, hi), a, b));
  const mid = [];
  for (let e = 0; e < 2; e++) {
    const [a, b] = [edges[e] + 0.05 * SR, edges[e + 1] - 0.02 * SR];
    assert.ok(Math.abs(gain(now.s, was.s, 2000, 5000, a, b) - 2) < 0.2, `bar ${e + 1}: the side at 3 kHz ${gain(now.s, was.s, 2000, 5000, a, b).toFixed(2)} dB, want +2`);
    mid.push(gain(now.m, was.m, 700, 1400, a, b));
    assert.ok(Math.abs(gain(now.s, was.s, 30, 100, a, b)) < 0.3, `bar ${e + 1}: the side at 60 Hz stays`);
    assert.ok(Math.abs(gain(now.m, was.m, 40, 120, a, b)) < 0.3, `bar ${e + 1}: the mid at 80 Hz stays`);
    const loud = (x) => integratedLoudness(x.L.slice(edges[e], edges[e + 1]), x.R.slice(edges[e], edges[e + 1]), SR);
    assert.ok(Math.abs(loud(bus) - loud(before)) < 0.02, `bar ${e + 1}: ${loud(bus).toFixed(3)} LUFS against ${loud(before).toFixed(3)} before`);
    assert.ok(correlation(bus.L.slice(a, b), bus.R.slice(a, b)) < correlation(before.L.slice(a, b), before.R.slice(a, b)) - 0.05, `bar ${e + 1}: wider`);
  }
  assert.ok(mid[0] < -0.3 && mid[1] < mid[0] - 0.5, `the mid at 1 kHz gives the power back, more where the side has more: ${mid.map((g) => g.toFixed(2)).join(', ')} dB`);
  // No click where the mid's gain changes (a 10 ms ease) or where the rotation starts and stops (5 ms): the change it makes moves no
  // faster there than inside the wider bar.
  const d = Float32Array.from(bus.L, (v, i) => v - before.L[i]);
  const slope = (a, b) => {
    let w = 0;
    for (let i = Math.round(a); i < Math.round(b); i++) w = Math.max(w, Math.abs(d[i] - d[i - 1]));
    return w;
  };
  assert.ok(slope(edges[0] - 10, edges[2] + 10) <= 1.05 * slope(edges[1] + 0.05 * SR, edges[2] - 0.02 * SR), 'no click');
  const same = { L: before.L.slice(), R: before.R.slice() };
  S.widen(same, SR, edges, { db: 0, hz: 300 });
  assert.deepEqual(same, before, '0 dB is a no-op');
});

// --- Act 2's voices (pure; scripts/audio/drop2Act2Voices.mjs) --------------------------------------------------------------------

/** Silent before `at`, sounding within 3 samples of it, deterministic: a voice's basic contract. */
const contract = (render, at = 1000, n = SR) => {
  const a = new Float32Array(n);
  render(a, at);
  const b = new Float32Array(n);
  render(b, at);
  assert.deepEqual(a, b, 'deterministic');
  for (let i = 0; i < at; i++) assert.equal(a[i], 0, `silent before its sample (${i})`);
  let first = -1;
  for (let i = at; i < n; i++) if (a[i] !== 0) {
    first = i;
    break;
  }
  assert.ok(first >= at && first <= at + 3, `sounding from its sample: ${first - at}`);
  return a;
};

test('taiko: a deep drum — its body under 150 Hz, a skin attack above, the pitch falling onto `freq`, gone within 2 s', () => {
  const x = contract((b, at) => V.taiko(b, at, SR, { freq: 62, gain: 0.5 }, 8000), 1000, 2 * SR);
  const low = band(x, 30, 150);
  assert.ok(rms(low, 1000, 1000 + 0.2 * SR) > 0.6 * rms(x, 1000, 1000 + 0.2 * SR), 'mostly low body');
  assert.ok(rms(band(x, 1500), 1000, 1000 + 0.004 * SR) > 3 * rms(band(x, 1500), 1000 + 0.1 * SR, 1000 + 0.14 * SR), 'a skin attack that dies fast');
  const p = acPitch(x, 1000 + 0.15 * SR, 1000 + 0.35 * SR, 30, 300);
  assert.ok(near(p, 62, 0.06), `settles on 62 Hz: ${p.toFixed(1)}`);
  assert.ok(rms(x, 1000 + 1.8 * SR, 2 * SR) < 1e-3 * rms(x, 1000, 1000 + 0.1 * SR), 'gone');
});

test('koto: a plucked string tuned to its note (F♯4–F♯6), bright at the pluck and darker after, decaying', () => {
  for (const m of [66, 73, 78, 85, 90]) {
    const x = contract((b, at) => V.koto(b, at, SR, { freq: midiHz(m), gain: 0.2, decay: 1 }, 8001 + m), 1000, SR);
    const p = acPitch(x, 1000 + 0.1 * SR, 1000 + 0.3 * SR, 100, 2400);
    assert.ok(near(p, midiHz(m), 0.01), `MIDI ${m}: ${p.toFixed(1)} Hz, want ${midiHz(m).toFixed(1)}`);
    const hf = (a, b) => rms(band(x, 4 * midiHz(m)), a, b) / rms(x, a, b);
    assert.ok(hf(1000, 1000 + 0.02 * SR) > hf(1000 + 0.4 * SR, 1000 + 0.45 * SR), `MIDI ${m}: darker as it rings`);
    assert.ok(rms(x, 1000 + 0.8 * SR, SR) < 0.3 * rms(x, 1000, 1000 + 0.1 * SR), `MIDI ${m}: decays`);
  }
});

test('chip triangle: a 4-bit stepped triangle (16 levels a half cycle) on its notes, silent between them', () => {
  const b = new Float32Array(SR / 2);
  V.chipTriangle(b, [{ at: 1000, len: 6000, freq: 155.56 }, { at: 12000, len: 6000, freq: 116.54 }], SR, { gain: 0.3 });
  const levels = new Set();
  for (let i = 1500; i < 6500; i++) levels.add(Math.round(b[i] * 1e6));
  assert.ok(levels.size <= 32 && levels.size >= 16, `${levels.size} levels`);
  assert.ok(near(acPitch(b, 1500, 6500, 60, 600), 155.56, 0.02));
  assert.ok(near(acPitch(b, 12500, 17500, 60, 600), 116.54, 0.02));
  assert.ok(rms(b, 7300, 11900) < 1e-6, 'silent between notes');
});

test('chip noise: an LFSR hiss held at its clock, deterministic, decaying; the short mode repeats every 93 clocks', () => {
  const x = contract((b, at) => V.chipNoise(b, at, SR, { gain: 0.3, clockHz: 12000, decayMs: 40 }, 8010));
  assert.ok(rms(x, 1000, 1000 + 0.01 * SR) > 10 * rms(x, 1000 + 0.2 * SR, 1000 + 0.21 * SR), 'decays');
  const s = new Float32Array(SR);
  V.chipNoise(s, 0, SR, { gain: 0.3, clockHz: 9300, decayMs: 4000, short: true }, 8011);
  // 93 clocks at 9300 Hz = 10 ms = 480 samples: a period.
  let same = 0;
  for (let i = 1000; i < 3000; i++) if (Math.sign(s[i]) === Math.sign(s[i + 480])) same++;
  assert.ok(same > 1900, `periodic: ${same} / 2000`);
});

test('cowbell: two square tones (540 / 800 Hz family) through a band, a sharp attack and a short tail', () => {
  const x = contract((b, at) => V.cowbell(b, at, SR, { gain: 0.15 }));
  const mid = band(x, 400, 3000);
  assert.ok(rms(mid, 1000, 1000 + 0.05 * SR) > 0.6 * rms(x, 1000, 1000 + 0.05 * SR), 'in its band');
  assert.ok(rms(x, 1000 + 0.4 * SR, 1000 + 0.45 * SR) < 0.02 * rms(x, 1000, 1000 + 0.02 * SR), 'short');
});

test('gated hit: a snare with a dense room tail that is cut dead at gateMs (the 80s gate)', () => {
  const x = contract((b, at) => V.gatedHit(b, at, SR, { gain: 0.4, gateMs: 140 }, 8020));
  const before = rms(x, 1000 + 0.1 * SR, 1000 + 0.13 * SR);
  const after = rms(x, 1000 + 0.16 * SR, 1000 + 0.2 * SR);
  assert.ok(before > 0.05 * rms(x, 1000, 1000 + 0.01 * SR), 'the room holds up to the gate');
  assert.ok(after < 0.05 * before, `then it is cut: ${after} vs ${before}`);
  const tom = contract((b, at) => V.gatedHit(b, at, SR, { gain: 0.4, gateMs: 120, tom: 110 }, 8021));
  assert.ok(near(acPitch(band(tom, 40, 400), 1000 + 0.02 * SR, 1000 + 0.08 * SR, 60, 400), 110, 0.08), 'the tom sings its pitch');
});

test('FM slap bass: each note on its pitch, a bright slap that settles, 8ths apart without clicks', () => {
  const b = new Float32Array(SR);
  const notes = [0, 1, 2, 3].map((k) => ({ at: 1000 + k * 9600, len: 8000, freq: k % 2 ? 123.47 : 61.74 }));
  V.fmSlap(b, notes, SR, { gain: 0.3 });
  for (const n of notes) {
    const p = acPitch(b, n.at + 0.03 * SR, n.at + 0.12 * SR, 40, 400);
    assert.ok(near(p, n.freq, 0.03), `${n.freq}: ${p.toFixed(1)}`);
    const hf = (a, c) => rms(band(b, 1000), a, c);
    assert.ok(hf(n.at, n.at + 0.01 * SR) > 2 * hf(n.at + 0.1 * SR, n.at + 0.12 * SR), 'the slap is bright, then it settles');
  }
  let step = 0;
  for (let i = 1; i < b.length; i++) step = Math.max(step, Math.abs(b[i] - b[i - 1]));
  assert.ok(step < 0.25, `no clicks: ${step}`);
});

test('orchestra hit: a stacked chord stab, loud at once and gone in half a second; reversed it swells into its end', () => {
  const freqs = [61.74, 123.47, 246.94, 311.13, 369.99, 493.88];
  const x = contract((b, at) => V.orchHit(b, at, SR, { freqs, gain: 0.3 }, 8030));
  assert.ok(rms(x, 1000, 1000 + 0.05 * SR) > 6 * rms(x, 1000 + 0.45 * SR, 1000 + 0.5 * SR), 'a stab');
  const r = new Float32Array(SR);
  V.orchHit(r, SR / 2, SR, { freqs, gain: 0.3, reverse: true }, 8030);
  assert.ok(rms(r, SR / 2 - 0.02 * SR, SR / 2) > 4 * rms(r, SR / 2 - 0.3 * SR, SR / 2 - 0.28 * SR), 'reversed: it swells');
  assert.ok(rms(r, SR / 2 + 10, SR) === 0, 'and stops on its end');
});

test('synth brass: each stab on its pitch, the filter opening over its first 30 ms (the blat), released after its length', () => {
  const b = new Float32Array(SR);
  V.brass(b, [{ at: 1000, len: 9000, freq: midiHz(68) }], SR, { gain: 0.2 });
  assert.ok(near(acPitch(b, 1000 + 0.05 * SR, 1000 + 0.15 * SR, 100, 1200), midiHz(68), 0.02));
  const hf = (a, c) => rms(band(b, 2000), a, c) / rms(b, a, c);
  assert.ok(hf(1000 + 0.03 * SR, 1000 + 0.06 * SR) > 1.3 * hf(1000, 1000 + 0.006 * SR), 'it opens');
  assert.ok(rms(b, 10000 + 0.12 * SR, SR) < 1e-4, 'released');
});

test('march snare: a tight, high snare — its body above 250 Hz, crisp wires, gone in 150 ms', () => {
  const x = contract((b, at) => V.marchSnare(b, at, SR, { gain: 0.3 }, 8040));
  assert.ok(rms(band(x, 4000), 1000, 1000 + 0.03 * SR) > 0.3 * rms(x, 1000, 1000 + 0.03 * SR), 'crisp');
  assert.ok(rms(x, 1000 + 0.15 * SR, 1000 + 0.2 * SR) < 0.02 * rms(x, 1000, 1000 + 0.02 * SR), 'tight');
});

test('timpani roll: strokes at `rate` on its pitch, swelling over its length', () => {
  const x = contract((b, at) => V.timpani(b, at, 0.8 * SR, SR, { freq: 92.5, gain: 0.3, rate: 16 }, 8050), 1000, 2 * SR);
  assert.ok(rms(x, 1000 + 0.6 * SR, 1000 + 0.8 * SR) > 1.8 * rms(x, 1000, 1000 + 0.2 * SR), 'a crescendo');
  assert.ok(near(acPitch(band(x, 40, 400), 1000 + 0.4 * SR, 1000 + 0.6 * SR, 50, 400), 92.5, 0.05), 'on its pitch');
});

test('music box: a tine on its pitch with a click of the pin, ringing over a second, its overtones fading first', () => {
  const x = contract((b, at) => V.musicBox(b, at, SR, { freq: midiHz(78), gain: 0.2 }), 1000, 3 * SR);
  assert.ok(near(acPitch(x, 1000 + 0.2 * SR, 1000 + 0.4 * SR, 300, 2400), midiHz(78), 0.01));
  assert.ok(rms(x, 1000 + 1 * SR, 1000 + 1.1 * SR) > 0.05 * rms(x, 1000, 1000 + 0.1 * SR), 'it rings');
  const hf = (a, b) => rms(band(x, 2500), a, b) / rms(x, a, b);
  assert.ok(hf(1000, 1000 + 0.02 * SR) > 3 * hf(1000 + 0.5 * SR, 1000 + 0.6 * SR), 'overtones fade first');
});

test('grain freeze: Hann grains of 80–120 ms from the source, overlapping, no clicks, the source’s spectrum', () => {
  const src = Float32Array.from({ length: SR / 2 }, (_, i) => 0.3 * Math.sin((2 * Math.PI * 440 * i) / SR) + 0.2 * Math.sin((2 * Math.PI * 660 * i) / SR));
  const out = new Float32Array(2 * SR);
  V.grainFreeze(out, src, 1000, SR, SR, { gain: 1, seed: 8060 });
  assert.equal(rms(out, 0, 1000), 0, 'silent before');
  assert.ok(rms(out, 1000 + SR + 10, 2 * SR) === 0, 'silent after its length');
  const mid = rms(out, 1000 + 0.2 * SR, 1000 + 0.8 * SR);
  assert.ok(mid > 0.5 * rms(src, 0, src.length) && mid < 1.6 * rms(src, 0, src.length), `level near the source's: ${mid}`);
  let step = 0;
  for (let i = 1000 + 1; i < 1000 + SR; i++) step = Math.max(step, Math.abs(out[i] - out[i - 1]));
  assert.ok(step < 0.15, `no clicks: ${step}`);
  assert.ok(near(acPitch(out, 1000 + 0.3 * SR, 1000 + 0.5 * SR, 100, 1000), 220, 0.03), 'the source’s common fundamental (220 Hz)');
});

test('heartbeat: a sub thump on its pitch, its peak at `gain`, gone in 400 ms', () => {
  const x = contract((b, at) => V.heartbeat(b, at, SR, { freq: 69.3, gain: 0.126 }));
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  assert.ok(near(peak, 0.126, 0.1), `peak ${peak}`);
  assert.ok(near(acPitch(x, 1000 + 0.02 * SR, 1000 + 0.12 * SR, 30, 200), 69.3, 0.06));
  assert.ok(rms(x, 1000 + 0.4 * SR, 1000 + 0.5 * SR) < 1e-3 * peak, 'gone');
});

test('glass: a short bright ting on its pitch', () => {
  const x = contract((b, at) => V.glass(b, at, SR, { freq: midiHz(97), gain: 0.05 }));
  assert.ok(near(acPitch(x, 1000 + 0.02 * SR, 1000 + 0.06 * SR, 1000, 6000), midiHz(97), 0.02));
  assert.ok(rms(x, 1000 + 0.6 * SR, 1000 + 0.7 * SR) < 0.05 * rms(x, 1000, 1000 + 0.05 * SR), 'short');
});

test('wood clack: a dry knock ringing at its pitch for a few ms', () => {
  const x = contract((b, at) => V.woodClack(b, at, SR, { freq: 1200, gain: 0.2 }, 8070));
  assert.ok(rms(band(x, 800, 1800), 1000, 1000 + 0.01 * SR) > 0.5 * rms(x, 1000, 1000 + 0.01 * SR), 'at its pitch');
  assert.ok(rms(x, 1000 + 0.06 * SR, 1000 + 0.08 * SR) < 0.01 * rms(x, 1000, 1000 + 0.005 * SR), 'dry');
});

test('beep: a dry square of its duty on its pitch, bending to `to` over its last bendMs', () => {
  const x = contract((b, at) => V.beep(b, at, SR, { freq: midiHz(72), to: midiHz(73), ms: 80, bendMs: 30, duty: 0.25, gain: 0.1 }));
  assert.ok(near(acPitch(x, 1000 + 0.005 * SR, 1000 + 0.045 * SR, 200, 2000), midiHz(72), 0.01), 'C5');
  assert.ok(near(acPitch(x, 1000 + 0.072 * SR, 1000 + 0.079 * SR, 200, 2000), midiHz(73), 0.015), 'bent to C♯5');
  // Duty 25 %: the share of samples above zero.
  let up = 0;
  for (let i = 1000 + 0.005 * SR; i < 1000 + 0.045 * SR; i++) if (x[i] > 0) up++;
  assert.ok(Math.abs(up / (0.04 * SR) - 0.25) < 0.04, `duty ${(up / (0.04 * SR)).toFixed(3)}`);
  assert.ok(rms(x, 1000 + 0.09 * SR, SR) === 0, 'stops');
});

test('clang: an inharmonic metal strike, loud at once, ringing', () => {
  const x = contract((b, at) => V.clang(b, at, SR, { freq: 180, gain: 0.3 }, 8080));
  assert.ok(rms(x, 1000, 1000 + 0.02 * SR) > 3 * rms(x, 1000 + 0.5 * SR, 1000 + 0.55 * SR));
  assert.ok(rms(x, 1000 + 0.3 * SR, 1000 + 0.35 * SR) > 0.01 * rms(x, 1000, 1000 + 0.02 * SR), 'it rings');
});

test('pea whistle: a high tone with its trill, on its pitch', () => {
  const x = contract((b, at) => V.whistle(b, at, SR, { freq: 2800, ms: 200, gain: 0.1 }, 8090));
  assert.ok(near(acPitch(band(x, 1500, 5000), 1000 + 0.05 * SR, 1000 + 0.15 * SR, 1500, 5000), 2800, 0.04));
});

test('boing: a spring — the pitch wobbling round its note and settling', () => {
  const x = contract((b, at) => V.boing(b, at, SR, { freq: 300, gain: 0.1, ms: 300 }));
  assert.ok(near(acPitch(x, 1000 + 0.2 * SR, 1000 + 0.28 * SR, 100, 800), 300, 0.05));
});

test('noise hit: band-limited noise between lo and hi, swelling over attackMs and decaying', () => {
  const x = contract((b, at) => V.noiseHit(b, at, SR, { lo: 400, hi: 3000, attackMs: 20, decayMs: 80, gain: 0.3 }, 8100));
  assert.ok(rms(band(x, 400, 3000), 1000, 1000 + 0.2 * SR) > 0.6 * rms(x, 1000, 1000 + 0.2 * SR));
  assert.ok(rms(x, 1000 + 0.015 * SR, 1000 + 0.025 * SR) > 2 * rms(x, 1000, 1000 + 0.005 * SR), 'swells');
});

test('tambourine: jingles above 5 kHz, sounding from its sample, deterministic, gone within 150 ms', () => {
  const x = contract((b, at) => V.tambourine(b, at, SR, { gain: 0.1 }, 8120), 1000, SR / 2);
  const ms = (m) => (m / 1000) * SR;
  const hi = band(x, 5000);
  assert.ok(rms(hi, 1000, 1000 + ms(40)) > 0.8 * rms(x, 1000, 1000 + ms(40)), 'its energy is above 5 kHz');
  assert.ok(rms(x, 1000 + ms(150), 1000 + ms(200)) < 0.01 * rms(x, 1000, 1000 + ms(20)), 'gone within 150 ms');
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak > 0.05 && peak < 0.2, `its peak follows its gain: ${peak.toFixed(3)}`);
});

// --- The worlds' chord voices (pure; scripts/audio/drop2Worlds.mjs): short-decay, one family a world ------------------------------------

/** The level (dB) of `x` over [a + ms0, a + ms1) against its first 20 ms after `a`. */
const fallDb = (x, a, ms0, ms1) => 20 * Math.log10(rms(x, a + (ms0 / 1000) * SR, a + (ms1 / 1000) * SR) / rms(x, a, a + 0.02 * SR));

test('the pane tink is FALL’s glass (break 1): an inharmonic FM strike with a click above 6 kHz, on its pitch, 30 dB down within its ring', () => {
  const x = contract((b, at) => W.paneTink(b, at, SR, { freq: 1480, gain: 0.09, decayMs: 600, seed: 3 }));
  assert.ok(near(acPitch(band(x, 1000, 2400), 1000 + 0.05 * SR, 1000 + 0.15 * SR, 1000, 2400), 1480, 0.02), 'on its pitch');
  assert.ok(rms(band(x, 6000), 1000, 1000 + 0.003 * SR) > 3 * rms(band(x, 6000), 1000 + 0.1 * SR, 1000 + 0.103 * SR), 'the click is at the strike');
  assert.ok(fallDb(x, 1000, 800, 900) < -30, `${fallDb(x, 1000, 800, 900).toFixed(1)} dB by 800 ms`);
});

test('the marimba bounces: a bar on its pitch with its overtone two octaves up (4 ×) that dies first, gone within a beat', () => {
  const x = contract((b, at) => W.marimba(b, at, SR, { freq: 740, gain: 0.1, decay: 0.12 }));
  assert.ok(near(acPitch(x, 1000 + 0.04 * SR, 1000 + 0.12 * SR, 400, 1500), 740, 0.02), 'on its pitch');
  const hi = band(x, 2400, 3600);
  assert.ok(rms(hi, 1000, 1000 + 0.01 * SR) > 4 * rms(hi, 1000 + 0.06 * SR, 1000 + 0.07 * SR), 'the partial dies first');
  assert.ok(fallDb(x, 1000, 400, 450) < -30, `${fallDb(x, 1000, 400, 450).toFixed(1)} dB a beat later`);
});

test('the drafting pluck (Defender’s blueprint) is clean: a sine and its low harmonics with a pen tick, on its pitch, gone in 300 ms', () => {
  const x = contract((b, at) => W.draftPluck(b, at, SR, { freq: 587.33, gain: 0.05 }));
  assert.ok(near(acPitch(x, 1000 + 0.02 * SR, 1000 + 0.08 * SR, 300, 1200), 587.33, 0.02), 'on its pitch');
  assert.ok(fallDb(x, 1000, 300, 340) < -30, `${fallDb(x, 1000, 300, 340).toFixed(1)} dB by 300 ms`);
});

test('the voxel bleep is blocky: a square an octave up for its first block, then on its note, stepping down in four flat blocks and stopping', () => {
  const x = contract((b, at) => W.bleep(b, at, SR, { freq: 554.37, gain: 0.05, ms: 80 }));
  const late = acPitch(x, 1000 + 0.03 * SR, 1000 + 0.05 * SR, 300, 2400);
  assert.ok(near(late, 554.37, 0.02), `on its note after the first block: ${late.toFixed(1)} Hz`);
  const early = acPitch(x, 1000 + 0.001 * SR, 1000 + 0.011 * SR, 300, 2400);
  assert.ok(near(early, 1108.73, 0.03), `an octave up first: ${early.toFixed(1)} Hz`);
  assert.equal(rms(x, 1000 + 0.09 * SR, 1000 + 0.2 * SR), 0, 'stopped after its length');
});

test('the pictograms’ bell is clean: harmonic partials only (ratio 2), on its pitch, ringing under a second', () => {
  const x = contract((b, at) => W.cleanBell(b, at, SR, { freq: 1108.73, gain: 0.05, decay: 0.3 }), 1000, 2 * SR);
  assert.ok(near(acPitch(band(x, 800, 1600), 1000 + 0.1 * SR, 1000 + 0.2 * SR, 800, 1600), 1108.73, 0.02), 'on its pitch');
  assert.ok(fallDb(x, 1000, 900, 1000) < -25, `${fallDb(x, 1000, 900, 1000).toFixed(1)} dB by 900 ms`);
  assert.equal(rms(x, 1000 + 1.6 * SR, 2 * SR), 0, 'gone by 1.5 s');
});

// --- M3, the wall smash on drop2 7.3& (pure; scripts/audio/drop2Worlds.mjs) -----------------------------------------------------------

// W (2026-10-03: on screen the bar reaches the wall in stages, so the music should hit each stage): the creak swelled to the snap as one smooth sound
// over a wall that moves in stages; it follows the wall's bow now, and each stage of the bar's push has its own hit.
test('the wall’s creak follows its bow (the picture’s spring): loudest as the bar slams it out (its first 3 frames), ≥ 10 dB down by its hold (+ 7 … + 11 frames), a plastic body, its peak its gain, cut at its length', () => {
  const len = Math.round((12 / 60) * SR);
  const x = contract((b, at) => W.wallCreak(b, at, SR, { len, gain: 0.3, seed: 4 }));
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(near(peak, 0.3, 0.001), `peak ${peak.toFixed(4)}`);
  const fr = (f) => 1000 + Math.round((f / 60) * SR);
  const out = rms(x, fr(0), fr(3));
  const back = rms(x, fr(3), fr(6));
  const hold = rms(x, fr(7), fr(11));
  assert.ok(out > back, `out ${dB(out)} dB, back ${dB(back)} dB`);
  assert.ok(20 * Math.log10(out / hold) >= 10, `the hold ${(20 * Math.log10(out / hold)).toFixed(1)} dB under the slam`);
  const share = (rms(band(x, 300, 4000), 1000, 1000 + len) / rms(x, 1000, 1000 + len)) ** 2;
  assert.ok(share >= 0.6, `${(100 * share).toFixed(0)} % in the body’s band`);
  assert.equal(rms(x, 1000 + len, SR), 0, 'cut at its length (the smash takes over)');
  // The speed it follows is the picture's: 0 before the hit, fastest ≈ 1 frame in, slow at the bow's turn (+ 3) and in the hold.
  assert.equal(W.bowSpeed(0), 0);
  assert.ok(W.bowSpeed(1) > 0.95 && W.bowSpeed(3) < 0.1 && W.bowSpeed(4.5) < 0.4 && W.bowSpeed(10.5) < 0.15, 'the spring’s speed');
});

test('a push of the bar: its body on its pitch under 200 Hz, its crunch bitcrushed (4 bits at 8 kHz) around its band, a creak tail that fades, gone by 0.35 s', () => {
  const x = contract((b, at) => W.pushHit(b, at, SR, { freq: 69.3, crunch: 1650, gain: 0.4, crunchGain: 1, tailMs: 140, seed: 5 }));
  const p = zcPitch(band(x, 20, 150), 1000 + 0.05 * SR, 1000 + 0.15 * SR);
  assert.ok(near(p, 69.3, 0.06), `the body settles on ${p.toFixed(1)} Hz`);
  const lows = (rms(band(x, 20, 200), 1000, 1000 + 0.1 * SR) / rms(x, 1000, 1000 + 0.1 * SR)) ** 2;
  assert.ok(lows >= 0.5, `${(100 * lows).toFixed(0)} % of its first 100 ms under 200 Hz`);
  // The crunch: loudest around its band in its first 25 ms (an octave around 1650 over the octave above it).
  const crunch = rms(band(x, 1100, 2400), 1000, 1000 + 0.025 * SR) / rms(band(x, 3300, 7000), 1000, 1000 + 0.025 * SR);
  assert.ok(crunch > 1.5, `its crunch sits on its band (${crunch.toFixed(2)})`);
  const tail = rms(band(x, 400, 2000), 1000 + 0.06 * SR, 1000 + 0.1 * SR);
  assert.ok(tail > 0 && tail > 3 * rms(band(x, 400, 2000), 1000 + 0.2 * SR, 1000 + 0.3 * SR), 'its creak tail fades');
  assert.equal(rms(x, 1000 + 0.35 * SR, SR), 0, 'gone by 0.35 s');
  // Higher pushes crunch higher: the centroid (1–8 kHz, first 25 ms) follows `crunch`.
  const centroid = (y) => {
    let num = 0;
    let den = 0;
    for (const fc of [1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]) {
      const e = rms(band(y, fc / 1.12, fc * 1.12), 1000, 1000 + 0.025 * SR) ** 2;
      num += fc * e;
      den += e;
    }
    return num / den;
  };
  const hi = contract((b, at) => W.pushHit(b, at, SR, { freq: 87.31, crunch: 2350, gain: 0.4, crunchGain: 1, tailMs: 0, seed: 5 }));
  assert.ok(centroid(hi) > 1.15 * centroid(x), `${centroid(x).toFixed(0)} → ${centroid(hi).toFixed(0)} Hz`);
});

test('a crack step is a dry, bitcrushed split around its band, gone in 30 ms', () => {
  const g = 0.1;
  const x = contract((b, at) => W.crackStep(b, at, SR, { freq: 3200, gain: g, seed: 6 }));
  for (let i = 1001; i < 1000 + 0.025 * SR; i++) if ((i - 1000) % 6) assert.equal(x[i], x[i - 1], `held (${i - 1000})`);
  const mids = (rms(band(x, 1500, 7000), 1000, 1000 + 0.03 * SR) / rms(x, 1000, 1000 + 0.03 * SR)) ** 2;
  assert.ok(mids >= 0.5, `${(100 * mids).toFixed(0)} % in 1.5–7 kHz`);
  assert.equal(rms(x, 1000 + 0.03 * SR, SR), 0, 'gone in 30 ms');
});

test('a push’s clank (W’s fix round) is pitched steel: on its note, most of its first 30 ms in 2–7 kHz, on 5-bit steps of its gain held 2 samples, its peak at most its gain, gone in 0.3 s', () => {
  const g = 0.4;
  for (const m of [82, 85, 89]) {
    const x = contract((b, at) => W.clank(b, at, SR, { freq: midiHz(m), gain: g, seed: 6 }));
    const p = acPitch(x, 1000 + 0.01 * SR, 1000 + 0.06 * SR, 0.7 * midiHz(m), 1.4 * midiHz(m));
    assert.ok(near(p, midiHz(m), 0.025), `${m}: ${p.toFixed(1)} Hz, want ${midiHz(m).toFixed(1)}`);
    const share = (rms(band(x, 2000, 7000), 1000, 1000 + 0.03 * SR) / rms(x, 1000, 1000 + 0.03 * SR)) ** 2;
    assert.ok(share >= 0.5, `${m}: ${(100 * share).toFixed(0)} % in 2–7 kHz`);
    for (let i = 1001; i < 1000 + 0.1 * SR; i++) if ((i - 1000) % 2) assert.equal(x[i], x[i - 1], `held (${i - 1000})`);
    const peak = x.reduce((mx, v) => Math.max(mx, Math.abs(v)), 0);
    assert.ok(peak <= g + 1e-6 && peak >= 0.85 * g, `peak ${peak.toFixed(3)}`);
    for (let i = 1000; i < 1000 + 0.1 * SR; i++) {
      const q = (x[i] / g) * 16;
      assert.ok(Math.abs(q - Math.round(q)) < 1e-3, `on a 5-bit step (${i - 1000})`);
    }
    assert.equal(rms(x, 1000 + 0.3 * SR, SR), 0, 'gone in 0.3 s');
  }
});

test('the wall’s thud is low: ≥ 85 % of it under 200 Hz, settling on ≈ 42 Hz, gone in 0.45 s', () => {
  const x = contract((b, at) => W.wallThud(b, at, SR, { gain: 0.75 }));
  const n = 0.45 * SR;
  const low = (rms(band(x, 20, 200), 1000, 1000 + n) / rms(x, 1000, 1000 + n)) ** 2;
  assert.ok(low >= 0.85, `${(100 * low).toFixed(0)} % under 200 Hz`);
  const p = zcPitch(x, 1000 + 0.1 * SR, 1000 + 0.25 * SR);
  assert.ok(near(p, 42, 0.08), `${p.toFixed(1)} Hz after 100 ms`);
  assert.equal(rms(x, 1000 + n, SR), 0, 'gone');
});

test('the bezel’s crack is bitcrushed: held 6 samples (8 kHz) at a time on 4 bits of its gain, mostly 1–6 kHz, its peak its gain, gone in 120 ms', () => {
  const g = 0.9;
  const x = contract((b, at) => W.bezelCrack(b, at, SR, { gain: g }));
  for (let i = 1001; i < 1000 + 0.1 * SR; i++) if ((i - 1000) % 6) assert.equal(x[i], x[i - 1], `held (${i - 1000})`);
  for (let i = 1000; i < 1000 + 0.1 * SR; i++) {
    const q = (x[i] / g) * 8;
    assert.ok(Math.abs(q - Math.round(q)) < 1e-3 && Math.abs(q) <= 8, `on a 4-bit step (${i - 1000}: ${q.toFixed(4)})`);
  }
  const n = 0.12 * SR;
  const mids = (rms(band(x, 1000, 6000), 1000, 1000 + n) / rms(x, 1000, 1000 + n)) ** 2;
  assert.ok(mids >= 0.5, `${(100 * mids).toFixed(0)} % in 1–6 kHz`);
  assert.ok(near(x.reduce((m, v) => Math.max(m, Math.abs(v)), 0), g, 0.001), 'its peak is its gain');
  assert.equal(rms(x, 1000 + n, SR), 0, 'gone');
});

test('the debris clatters: nothing for its first 20 ms, its first pieces the loudest (≥ 4 dB over the last), still landing after 300 ms, gone by 500 ms', () => {
  const render = () => {
    const b = new Float32Array(SR);
    W.debris(b, 1000, SR, { gain: 0.9 });
    return b;
  };
  const x = render();
  assert.deepEqual(x, render(), 'deterministic');
  assert.equal(rms(x, 0, 1000 + 0.02 * SR), 0, 'silent for 20 ms');
  const fall = 20 * Math.log10(rms(x, 1000 + 0.02 * SR, 1000 + 0.15 * SR) / rms(x, 1000 + 0.25 * SR, 1000 + 0.42 * SR));
  assert.ok(fall >= 4, `${fall.toFixed(1)} dB`);
  assert.ok(rms(x, 1000 + 0.3 * SR, 1000 + 0.45 * SR) > 0, 'still landing');
  assert.equal(rms(x, 1000 + 0.5 * SR, SR), 0, 'gone by 500 ms');
});

// --- E, the woodblock wave made Edo (pure; scripts/audio/drop2Edo.mjs; 2026-10-03: a more Edo sound for the woodblock wave) --------------

test('the shamisen: on its pitch, the bachi’s slap at the strike, the sawari’s buzz while it rings (> 2.5 kHz, ≥ 2 × the plain string’s at 50 ms) dying into the tone, a slide onto its note, gone by its decay', () => {
  const at0 = 1000;
  const x = contract((b, at) => E.shamisen(b, at, SR, { freq: 138.59, gain: 0.1, decay: 0.9, sawari: 1, seed: 7 }), at0, 2 * SR);
  const plain = contract((b, at) => E.shamisen(b, at, SR, { freq: 138.59, gain: 0.1, decay: 0.9, sawari: 0, bachi: 1, seed: 7 }), at0, 2 * SR);
  const p = acPitch(x, at0 + 0.15 * SR, at0 + 0.3 * SR, 100, 200);
  assert.ok(near(p, 138.59, 0.01), `on its pitch: ${p.toFixed(1)} Hz`);
  const buzz = (y, m) => rms(band(y, 2500), at0 + (m / 1000) * SR, at0 + ((m + 50) / 1000) * SR) / rms(y, at0 + (m / 1000) * SR, at0 + ((m + 50) / 1000) * SR);
  assert.ok(buzz(x, 50) >= 2 * buzz(plain, 50), `the sawari buzzes: ${buzz(x, 50).toFixed(2)} against ${buzz(plain, 50).toFixed(2)}`);
  assert.ok(buzz(x, 400) < 0.3 * buzz(x, 50), 'and dies into the tone');
  assert.ok(rms(band(x, 1000, 3000), at0, at0 + 0.004 * SR) > 2 * rms(band(x, 1000, 3000), at0 + 0.3 * SR, at0 + 0.304 * SR), 'the bachi strikes');
  assert.ok(fallDb(x, at0, 900, 950) < -40, `${fallDb(x, at0, 900, 950).toFixed(1)} dB by 900 ms`);
  // The suri: from a semitone above onto A♯4.
  const s = contract((b, at) => E.shamisen(b, at, SR, { freq: 466.16, gain: 0.1, decay: 0.55, from: 1, slideMs: 45, seed: 8 }), at0, SR);
  const start = acPitch(s, at0 + 0.002 * SR, at0 + 0.012 * SR, 380, 560);
  const end = acPitch(s, at0 + 0.08 * SR, at0 + 0.16 * SR, 380, 560);
  assert.ok(start > 1.035 * 466.16 && near(end, 466.16, 0.01), `slides ${start.toFixed(1)} → ${end.toFixed(1)} Hz`);
});

test('the hyoshigi: a bright “chon” of two wooden bars — ≥ 50 % of it in 0.9–8 kHz, its pitch its freq, sharp, gone in 350 ms', () => {
  const x = contract((b, at) => E.hyoshigi(b, at, SR, { freq: 1180, gain: 0.2, seed: 9 }));
  const share = (rms(band(x, 900, 8000), 1000, 1000 + 0.3 * SR) / rms(x, 1000, 1000 + 0.3 * SR)) ** 2;
  assert.ok(share >= 0.5, `${(100 * share).toFixed(0)} % in 0.9–8 kHz`);
  assert.ok(near(acPitch(band(x, 900, 1600), 1000 + 0.01 * SR, 1000 + 0.08 * SR, 900, 1600), 1180 * 1.02, 0.03), 'on its pair’s pitch');
  let peakAt = 0;
  for (let i = 1000; i < 1000 + 0.05 * SR; i++) if (Math.abs(x[i]) > Math.abs(x[peakAt])) peakAt = i;
  assert.ok(peakAt - 1000 < 0.002 * SR, `peaks ${((peakAt - 1000) / 48).toFixed(2)} ms in`);
  assert.equal(rms(x, 1000 + 0.35 * SR, SR), 0, 'gone');
});

test('the tsuke: a hard crack on a wooden board — its crack ≥ 15 dB over its tail above 1.5 kHz, the board (150 Hz – 1 kHz) ≥ 40 % of its body, 30 dB down by 200 ms', () => {
  const x = contract((b, at) => E.tsuke(b, at, SR, { gain: 0.3, seed: 10 }));
  const crack = 20 * Math.log10(rms(band(x, 1500), 1000, 1000 + 0.005 * SR) / rms(band(x, 1500), 1000 + 0.03 * SR, 1000 + 0.035 * SR));
  assert.ok(crack >= 15, `the crack ${crack.toFixed(1)} dB over its tail`);
  const board = (rms(band(x, 150, 1000), 1000 + 0.01 * SR, 1000 + 0.06 * SR) / rms(x, 1000 + 0.01 * SR, 1000 + 0.06 * SR)) ** 2;
  assert.ok(board >= 0.4, `${(100 * board).toFixed(0)} % board`);
  assert.ok(fallDb(x, 1000, 200, 240) < -30, `${fallDb(x, 1000, 200, 240).toFixed(1)} dB by 200 ms`);
  // `crack` (the fix round) raises the clappers' crack and leaves the board: ≥ 10 dB more above 1.5 kHz in its first 15 ms at 1.8, the
  // board's 10–60 ms the same within 0.5 dB, still a crack over a board.
  const hard = contract((b, at) => E.tsuke(b, at, SR, { gain: 0.3, crack: 1.8, seed: 10 }));
  const head = (y) => rms(band(y, 1500, 7000), 1000, 1000 + 0.015 * SR);
  assert.ok(20 * Math.log10(head(hard) / head(x)) >= 10, `the crack +${(20 * Math.log10(head(hard) / head(x))).toFixed(1)} dB`);
  const boardOf = (y) => rms(band(y, 150, 1000), 1000 + 0.01 * SR, 1000 + 0.06 * SR);
  assert.ok(Math.abs(20 * Math.log10(boardOf(hard) / boardOf(x))) < 0.5, 'the board unchanged');
  const share = (rms(band(hard, 150, 1000), 1000 + 0.01 * SR, 1000 + 0.06 * SR) / rms(hard, 1000 + 0.01 * SR, 1000 + 0.06 * SR)) ** 2;
  assert.ok(share >= 0.4, `${(100 * share).toFixed(0)} % board`);
});

test('the tsuzumi: the kotsuzumi’s pon lifts its pitch (the ropes squeezed) and settles on its note, ringing; the ōtsuzumi’s kan is high, dry and short', () => {
  const x = contract((b, at) => E.pon(b, at, SR, { freq: 369.99, gain: 0.15, seed: 11 }));
  const first = acPitch(x, 1000 + 0.008 * SR, 1000 + 0.028 * SR, 250, 500);
  const lifted = acPitch(x, 1000 + 0.04 * SR, 1000 + 0.07 * SR, 250, 500);
  const settled = acPitch(x, 1000 + 0.25 * SR, 1000 + 0.35 * SR, 250, 500);
  assert.ok(first < 0.98 * 369.99 && lifted > 1.02 * 369.99 && near(settled, 369.99, 0.015), `pon ${first.toFixed(0)} → ${lifted.toFixed(0)} → ${settled.toFixed(0)} Hz`);
  assert.ok(fallDb(x, 1000, 300, 320) > -20, 'it rings');
  const k = contract((b, at) => E.kan(b, at, SR, { freq: 1250, gain: 0.15, seed: 12 }));
  const high = (rms(band(k, 800), 1000, 1000 + 0.1 * SR) / rms(k, 1000, 1000 + 0.1 * SR)) ** 2;
  assert.ok(high >= 0.6, `kan: ${(100 * high).toFixed(0)} % above 800 Hz`);
  assert.ok(fallDb(k, 1000, 120, 140) < -30, 'kan is gone in 120 ms');
});

test('the shakuhachi: a short breathy phrase on its notes (each reached from below), opened by the muraiki’s burst of breath, silent after its last note (no held bed)', () => {
  const notes = [{ t: 0, midi: 75, len: 0.1 }, { t: 0.1, midi: 78, len: 0.16 }, { t: 0.26, midi: 77, len: 0.32 }];
  const x = contract((b, at) => E.shakuhachi(b, at, SR, { notes, gain: 0.075, breath: 0.55, seed: 13 }), 1000, 2 * SR);
  for (const n of notes) {
    const f = midiHz(n.midi);
    const p = acPitch(x, 1000 + (n.t + 0.45 * n.len) * SR, 1000 + (n.t + 0.9 * n.len) * SR, 400, 1000);
    assert.ok(near(p, f, 0.02), `${n.midi}: ${p.toFixed(1)} Hz, want ${f.toFixed(1)}`);
  }
  assert.ok(acPitch(x, 1000 + 0.004 * SR, 1000 + 0.03 * SR, 400, 1000) < 0.985 * midiHz(75), 'the first note is lifted from below');
  const air = (a, b) => rms(band(x, 3000), 1000 + a * SR, 1000 + b * SR) / rms(x, 1000 + a * SR, 1000 + b * SR);
  assert.ok(air(0, 0.05) > 1.2 * air(0.15, 0.25), `the muraiki: ${air(0, 0.05).toFixed(2)} against ${air(0.15, 0.25).toFixed(2)}`);
  assert.equal(rms(x, 1000 + (0.58 + 0.05) * SR, 2 * SR), 0, 'silent after its phrase');
});

// --- The section, rendered -----------------------------------------------------------------------------------------------------------

const N = at(D2.ZERO.to + 120); // two seconds into the outro (v08: after bridge B, whose last 16th is the zero): nothing of drop 2 may sound there
const { stems, events } = renderStems(SR, N);
/** The finished mix (with every section's finish(): the slams, the scrub-ahead and the stuck buffer), and without them. */
const master = mixdown(stems, SR);
const plain = mixdown(stems, SR, { stutter: false });
/** The music alone: without the post bus and without finish(). */
const music = mixdown({ ...stems, post: undefined }, SR, { stutter: false });
/** Drop 2 rendered alone into fresh buses (bgm.mjs's shared ones plus drop 2's own SENDS). */
const fresh = () => {
  const s = { keys: stereo(N), fx: stereo(N), music: stereo(N), chime: stereo(N), drums: stereo(N), bass: stereo(N), chords: stereo(N), vox: stereo(N), post: stereo(N), sub: new Float32Array(N) };
  for (const name of Object.keys(S.SENDS)) s[name] = stereo(N);
  return s;
};
const alone = fresh();
const aloneEvents = S.renderDrop2(alone, SR);
/** The group's drive and clip on that render (S.CLIP_REPORT is rewritten by every render, so it is kept here). */
const aloneGroup = { ...S.CLIP_REPORT };
const aloneWidth = S.WIDTH_REPORT.mid.map((m) => [...m]);
const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at);
const mid = (bus) => Float32Array.from(bus.L, (v, i) => 0.5 * (v + bus.R[i]));
const sumMid = (...buses) => {
  const out = new Float32Array(N);
  for (const b of buses) for (let i = 0; i < N; i++) out[i] += 0.5 * (b.L[i] + b.R[i]);
  return out;
};
const steps = (a, b, step) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const uniq = (xs) => [...new Set(xs)].sort((a, b) => a - b);

/**
 * The onset nearest `frame` (within ±`win` frames): the sample where the next 5 ms are loudest against the 10 ms before (0.25 ms hop).
 * A ratio over windows longer than a low voice's cycle, so its swell inside a note never looks like a new hit.
 */
const onsetNear = (x, frame, win = 4) => {
  const after = Math.round(0.005 * SR);
  const before = Math.round(0.01 * SR);
  const hop = Math.round(0.00025 * SR);
  let best = -Infinity;
  let where = 0;
  for (let s = at(frame - win); s + after < at(frame + win); s += hop) {
    const r = rms(x, s, s + after) / (rms(x, s - before, s) + 1e-6);
    if (r > best) {
      best = r;
      where = s;
    }
  }
  return where;
};
const assertOnsets = (x, frames, label, tolMs = 2, win = 4) => {
  for (const f of frames) {
    const o = onsetNear(x, f, win);
    assert.ok(Math.abs(o - at(f)) <= (tolMs / 1000) * SR, `${label} on ${f}: measured ${(((o - at(f)) / SR) * 1000).toFixed(2)} ms off`);
  }
};

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let k = 0; k < len / 2; k++) {
      const cr = Math.cos(a * k);
      const ci = Math.sin(a * k);
      for (let i = 0; i < n; i += len) {
        const p = i + k;
        const q = p + len / 2;
        const vr = re[q] * cr - im[q] * ci;
        const vi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - vr;
        im[q] = im[p] - vi;
        re[p] += vr;
        im[p] += vi;
      }
    }
  }
}
/** Magnitude spectra of `x` over samples [a, b): `size`-point Hann windows hopping `hop` (size / 4 unless asked); calls `each(k, magnitude, size)` per bin. */
const spectra = (x, a, b, each, size = 4096, hop = size / 4) => {
  for (let s = Math.round(a); s + size <= Math.round(b); s += hop) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = x[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
    fft(re, im);
    for (let k = 1; k < size / 2; k++) each(k, Math.hypot(re[k], im[k]), size);
  }
};
/** Spectral centroid (Hz) of the mid of a mix over frames [a, b): magnitude-weighted, 30 Hz – `top` (16 kHz unless asked). */
const centroid = (m, a, b, top = 16000) => {
  const x = Float32Array.from({ length: at(b) - at(a) }, (_, i) => 0.5 * (m.L[at(a) + i] + m.R[at(a) + i]));
  let num = 0;
  let den = 0;
  spectra(x, 0, x.length, (k, mag, size) => {
    const f = (k * SR) / size;
    if (f < 30 || f > top) return;
    num += f * mag;
    den += mag;
  });
  return num / den;
};
/**
 * The music bible's centroid (§6.4; the critic's centroid.mjs): the mean over 4096-point Hann windows hopping 2048 of each window's
 * magnitude-weighted centroid of the mid, 23 Hz – `top` (the audible band, 16 kHz, unless asked; the bible's own is 24 kHz), over [a, b).
 */
const bibleCentroid = (m, a, b, top = 16000) => {
  const x = Float32Array.from({ length: at(b) - at(a) }, (_, i) => 0.5 * (m.L[at(a) + i] + m.R[at(a) + i]));
  let sum = 0;
  let count = 0;
  for (let s = 0; s + 4096 <= x.length; s += 2048) {
    let num = 0;
    let den = 0;
    spectra(x, s, s + 4096, (k, mag, size) => {
      const f = (k * SR) / size;
      if (f < 23 || f > top) return;
      num += f * mag;
      den += mag;
    });
    if (den > 0) {
      sum += num / den;
      count++;
    }
  }
  return sum / count;
};
/** Energy per pitch class (0 = C) of `x` over samples [a, b), from bins within 35 cents of a note, `lo` – `hi` Hz (80 Hz – 2.7 kHz). */
const chroma = (x, a, b, lo = 80, hi = 2700) => {
  const pc = new Float64Array(12);
  spectra(
    x,
    a,
    b,
    (k, mag, size) => {
      const f = (k * SR) / size;
      if (f < lo || f > hi) return;
      const m = 69 + 12 * Math.log2(f / 440);
      const r = Math.round(m);
      if (Math.abs(m - r) < 0.35) pc[((r % 12) + 12) % 12] += mag * mag;
    },
    8192,
  );
  return pc;
};
/** K-weighted mean-square loudness (LUFS-like, ungated) of a mix over frames [a, b); the filters run in from 400 ms before. */
const K48 = [
  [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
  [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
];
const kLoud = (m, a, b) => {
  let p = 0;
  for (const ch of [m.L, m.R]) {
    const st = K48.map(([b0, b1, b2, a1, a2]) => new Biquad(b0, b1, b2, a1, a2));
    for (let i = at(a) - 0.4 * SR; i < at(b); i++) {
      const y = st[1].process(st[0].process(ch[i]));
      if (i >= at(a)) p += y * y;
    }
  }
  return -0.691 + 10 * Math.log10(p / (at(b) - at(a)));
};
const lufs = (m, a, b) => integratedLoudness(m.L.slice(at(a), at(b)), m.R.slice(at(a), at(b)), SR);
/** A beat's momentary loudness (400 ms from `f`) on the finished mix. */
const beat = (f) => lufs(master, f, f + 24);

/** The kernel's hook fragments: row 4's second half (HOOK2 from the march's third kick), four bars later. */
const KFRAG = D2.HOOK2.filter((h) => h.at >= D2.MARCH[2] && h.at < D2.GAME).map((h) => h.at + (D2.KERNEL.from - D2.MARCH[0]));
const hookOf = (voice) => D2.HOOK2_ACT2.filter((h) => h.voice === voice).map((h) => h.at);

// Where each kind of sound sits on the score (src/score/drop2.ts; the build sheet's §3). Whooshes are listed at their peaks.
const PLACES = {
  // The drums of every groove.
  d2kick: D2.KICKS2,
  d2snare: D2.CLAPS2,
  d2openhat: D2.OPEN_HATS2,
  d2hat: D2.HATS2,
  d2shaker: D2.SHAKER2,
  d2rim: D2.RIMS2,
  d2crash: D2.CRASHES2,
  d2tom: D2.TOMS2,
  d2roll: uniq([...D2.ROLL31, ...D2.SNARE32_32, ...D2.ROLL33, ...D2.ROLL34]),
  d2spillsnare: D2.SPILL_SNARES,
  // v07 (§3): 10.1's DON is the ō-daiko's (d2odaiko).
  d2taiko: D2.TAIKO2.filter((f) => f !== D2.BURST),
  d2chipsnare: D2.SNARES2,
  // v07 (seam 4704): the cowbell from 14.1& (14.1 is the face's landing).
  d2cowbell: D2.COWBELL2.filter((f) => f !== D2.TOTEM),
  d2tamb: steps(D2.TOTEM, D2.PICTO, 6),
  // v07 (seam 4704): the chip shaker carries two beats into Memphis (CHIP_CARRY), fading.
  d2chipshaker: steps(D2.ARCADE.from, D2.TOTEM + S.CHIP_CARRY.frames, 6).filter((_, k) => k % 4 !== 0),
  // v07 (seam 4800): 14.4's fill is the drumline's tenors, and the grid's 32nds its snare roll into 15.1.
  d2tenor: D2.GATED_TOMS2,
  d2drumline: [...D2.GRID_SNAP, ...D2.DRUMLINE2],
  d2timpani: [D2.TIMPANI2.from],
  d2buildsnare: D2.BUILD_SNARES2,
  // The harmony, the bass, the hook.
  d2arp: [D2.DROP2_START],
  d2wobble: [D2.WOBBLE.from],
  d2lead: D2.HOOK2.map((n) => n.at),
  d2harmony: D2.HOOK2.map((n) => n.at),
  d2hey: [D2.FULL_COMBO],
  d2climb: D2.VOX_CLIMB,
  d2glide: [D2.VOX_GLIDE.from],
  d2stutter: [...steps(D2.VOX_STUTTER.from, D2.CUTS2[2], 12), ...steps(D2.CUTS2[2], D2.VOX_STUTTER.to, 6)],
  d2scream: [D2.SCREAM.from],
  d2wa: D2.WA2,
  // Bar 1–4 (as built).
  d2drop: [D2.DROP2_START],
  d2snap: [D2.DROP2_START],
  d2pok: [D2.FILM_POP.from],
  d2droplets: [D2.FILM_POP.from],
  d2shing: D2.BLADES,
  d2takeoff: [D2.TURNS[0].to],
  d2turn: D2.TURNS.map((t) => t.to),
  d2ledrun: [D2.W2.from],
  d2ignite: [D2.TOMS2[0]],
  d2whip: [D2.WHIP.to],
  d2pop: [D2.POP],
  d2glint: [D2.RES_STEPS[0], D2.SPIN_ACCENT],
  d2gulp: [D2.SWALLOW.from],
  d2spin: [D2.SPIN_ACCENT],
  d2reform: [D2.ZBUF2_LIVE ? D2.ZBUF2.reform.to : D2.REFORM.from],
  d2fmpop: D2.ZBUF2_LIVE ? D2.ZBUF2_MARCH : D2.MARCH,
  ...(D2.ZBUF2_LIVE ? { d2zscan: [D2.ZBUF2.scan.from] } : {}),
  d2blink: [D2.BLINK2.close, D2.BLINK2.open],
  d2crush: D2.BITCRUSH,
  // Bar 5 (the crane bar, new) and 6 (the built game bar).
  d2gamestart: [D2.GAME],
  d2crane: [D2.CRANE.from + 18],
  d2probe: D2.PROBES,
  d2kana: D2.VOX_KANA,
  d2bytetick: D2.HAT_BYTES,
  d2sparkle: D2.NOTES_VOX,
  d2tink: D2.SCAN_BARS,
  d2scrub: [D2.SCRUB],
  d2combo: [D2.FULL_COMBO],
  d2tilt: [D2.TILT.to],
  // Bar 7: the overflow (as built; its pan lands in the kernel).
  d2tick: steps(D2.SURF[0], D2.PAN.to, 6),
  d2crack: [D2.CRACK],
  d2strain: [D2.BOW],
  d2twang: [D2.SNAP],
  d2fatal: [D2.SURF[3], D2.SURF[3] + 6],
  // W (2026-10-03): a push on each stage the bar goes through (7.1 256 %, 7.2 the surge, 7.3 into the wall), a crack step on each
  // cell the border's crack widens (7.2e, 7.2&, 7.2a).
  d2push: [D2.SURF[0], D2.SURF[1], D2.BOW],
  d2crackstep: [D2.CRACK + 6, D2.CRACK + 12, D2.CRACK + 18],
  // M3 (2026-10-02): the wall creaks as it bows, and is smashed out on the snap.
  d2wallcreak: [D2.BOW],
  d2wallsmash: [D2.SNAP],
  d2bwomp: [D2.WRAP],
  d2pan: [D2.PAN.to],
  // Bar 8: the kernel.
  d2clank: [D2.KERNEL.from],
  d2flood: [D2.KERNEL.from],
  d2domino: [...D2.DOMINOES_L, ...D2.DOMINOES_R],
  d2kscan: [D2.KERNEL_SCAN],
  d2corecrack: [D2.CORE_CRACK],
  d2errbuzz: [D2.HANG.from],
  d2install: D2.INSTALL_STEPS,
  d2kfrag: KFRAG,
  // Bar 9: the switch.
  d2v2ready: [D2.V2_READY[0]],
  // v07 (seam 4224): the alarm arms with the install (8.4&), an 8th before the switch.
  d2alarm: [D2.INSTALL.from, D2.ALARM.from, D2.CLAMP.from],
  d2figure: D2.DEFENDER_FIGURE.map((x) => x.at),
  d2scannote: D2.EXPLODE,
  d2servo: [D2.EXPLODE[1]],
  d2lock: [D2.EXPLODE[2]],
  d2bytes: [D2.SIGNATURE_MATCH.from],
  d2box: [D2.BOX],
  d2bulge: [D2.BULGE],
  // v07: the flood's whoosh peaks on the last arc, a 32nd before 10.1 (A2.FLOOD_PEAK).
  d2floodwhoosh: [A2.FLOOD_PEAK],
  // Bars 10–11: the wave.
  d2sung2: [D2.BURST],
  // v07 (§3): the impact and the foam are gone; the koto's sweep starts SWEEP_LEAD early, its top string on 10.1.
  d2gliss: [D2.BURST - A2.SWEEP_LEAD],
  // v07 (seam 4320): the drafting arcs are the hyoshigi's ki before the blocks' chon — the same clappers, the same kind.
  d2block: [...D2.ARCS, ...D2.BLOCKS],
  d2infect: D2.INFECT_ROWS,
  d2zing: [D2.CLAWS],
  d2crest: [D2.CREST],
  d2barrel: [D2.BARREL.to],
  d2wavecrash: [D2.WAVE_CRASH],
  d2spit: [D2.WAVE_CRASH + 18],
  d2seal: [D2.SEAL],
  d2creak: [D2.PROW],
  d2pip: PIPS,
  d2scantone: [D2.DOWNSAMPLE.from],
  d2pew: [D2.DOWNSAMPLE_STEPS[D2.DOWNSAMPLE_STEPS.length - 1], ...D2.PEWS],
  // v07 (FW1): the koto's hook — its ghost on the kernel's dominoes (8), its head on the spill (9.4), its rows on the wave (10–11).
  d2koto: [...D2.DOMINO_HOOK.map((h) => h.at), ...D2.SPILL_HOOK.map((h) => h.at), ...hookOf('koto')],
  // E (2026-10-03): the wave made Edo — the shamisen's 8ths on every kick and open hat from the burst to 11.4& (the fingers
  // tighten, the flow lines surge), the tsuke on the three mie (the dive, the crash, the seal), the kotsuzumi as he lands (the crest, the
  // prow), the ōtsuzumi as the fingers turn and on his stomp (11.3), the ō-daiko under the crash, the closing hyoshigi on Defender's
  // quantise steps (11.4, 11.4e, 11.4&).
  d2shamisen: steps(D2.BURST, D2.DOWNSAMPLE_STEPS[2] + 1, 12),
  d2tsuke: [D2.BARREL.from, D2.WAVE_CRASH, D2.SEAL],
  d2pon: [D2.CREST, D2.PROW],
  d2kan: [D2.CLAWS, D2.SEAL + 24],
  // v07: the ō-daiko on 10.1 (in place of the impact and the DON), 11.1, and crushed on the arcade's downbeat (12.1, the carry).
  d2odaiko: [D2.BURST, D2.WAVE_CRASH, D2.ARCADE.from],
  d2ki: D2.DOWNSAMPLE_STEPS.slice(0, 3),
  // Bars 12–13: the arcade and the well.
  d2chipland: [D2.ARCADE.from],
  d2split: D2.SPLITS,
  d2dive: [D2.DIVE],
  d2stomp: [D2.STOMP],
  d2thuds: [D2.INVASION],
  d2march: D2.MARCH_NOTES,
  d2chip: hookOf('chip'),
  d2bwoom: [D2.VOXEL_TILT.from],
  d2wall: [D2.WELL],
  d2harddrop: D2.HARD_DROPS,
  d2garbage: D2.GARBAGE,
  d2lineclear: [D2.LINE_CLEAR],
  d2voxburst: [D2.LINE_CLEAR],
  // v07 (seam 4704): the reversed orch hit's event is where it is first heard, a beat before the hit it swells into.
  d2orchrev: [D2.TOTEM - 24],
  // Bar 14: Memphis.
  d2orch: [D2.TOTEM],
  d2boing: A2.BOINGS,
  d2panel: D2.PANELS,
  d2rotate: [D2.SET_ROTATE.to],
  d2slap: D2.COWBELL2,
  d2voxhalf: hookOf('voxHalf'),
  d2pea: [D2.GRID_SNAP[2], D2.PICTO],
  // Bar 15: the pictograms.
  d2brass: hookOf('brass'),
  d2foil: [D2.TOUCHE],
  d2barrise: [D2.BAR_RISE],
  d2ratchet: D2.WORLD_ROLL,
  d2bend: [D2.WORLD_ROLL[D2.WORLD_ROLL.length - 1]],
  d2sheet: [D2.SHEET],
  d2shimmer: [D2.HINGE.from],
  // Bars 16–17: the mirror trap.
  d2light: [D2.LIGHT.from],
  d2mirror: D2.MIRRORS.filter((x) => x.at > D2.LIGHT.from && x.at < drop2At(17)).map((x) => x.at),
  d2reticle: [D2.RETICLES_IN],
  d2octaves: hookOf('octaves'),
  d2targetlock: D2.TARGET_LOCKS,
  d2clamp: [D2.CLAMP.from],
  d2starcreak: [D2.CLAMP.from + 12],
  d2giveup: [D2.GIVING_UP],
  d2rain: [D2.GIVING_UP],
  d2whipreel: [D2.WHIP_REEL.to],
  // Bar 18: the reel (as built).
  d2ring: [D2.REEL.from, ...D2.CUTS2.slice(1)],
  d2zap: D2.CUTS2.slice(1),
  d2wipe: [D2.WIPES[0], D2.WIPES[1] + 3, D2.WIPES[2] + 3],
  d2clack: [D2.REGISTER],
  d2reelshing: D2.REEL_BLADES,
  // Bar 19: stuck, the crash, the freeze (as built).
  d2whistle: [D2.DRIP],
  d2thunk: [D2.CRASH],
  d2plink: [D2.CRASH],
  d2powerdown: [D2.CRASH],
  d2sort: [D2.SORT.from],
  d2ringtick: D2.RINGS,
  d2buzz: [D2.CRASH + S.BUZZ_DELAY],
  // 19.4& – 20.4&: the bullet time; then the drain (as built), cut by the hand-off's zero.
  d2freeze: [D2.BULLET.from],
  d2orbit: [D2.BULLET.from],
  d2heart: D2.HEARTBEATS.flatMap((h) => [h.at, h.dub]),
  // v07 (seam 5376): and its last note's ghost on the outro's downbeat (MUSIC_BOX_GHOST, after the zero; v08: the zero is bridge B's last
  // 16th, so the outro's downbeat is the zero's end).
  d2musicbox: [...D2.MUSIC_BOX.map((x) => x.at), D2.ZERO.to],
  d2crown: D2.CROWN_TINGS,
  d2plates: [D2.PLATES.from],
  // (v08: the drain's whoosh and falling blips are bridge B's: tests/bridgeBAudio.test.mjs.)
  // The worlds' chord voices and the new sync hits (scripts/audio/drop2Worlds.mjs; since 2026-10-02: no chord wall, more
  // hits on the picture): the Z-buffer's FM pop chords on its beats, Defender's red rows, the blueprint's drafting plucks, the boats'
  // flung boxes, the cartouche re-signed, the well's bleeps on its hard drops, Memphis's marimba on the 8ths, the pictograms' bells on
  // the limbs, the roll and the sheet, the mirror trap's glass doubling a beat as in FALL and its 32nd cascade into the clamp, the star's
  // shatter.
  d2zchord: [D2.POP, D2.ZBUF2.scan.from, D2.ZBUF2.donut.from, ...D2.MARCH],
  d2defrow: D2.DEFENDER_ROWS,
  d2draft: [D2.SWITCH.from, ...D2.EXPLODE, D2.BOX, D2.SPILL[0]],
  d2throw: [D2.CREST],
  d2sign: [D2.SEAL],
  d2bleep: D2.HARD_DROPS,
  // v07 (seam 4704): the marimba arrives on the colour blips (13.4&: the march's D♯ C♯ B).
  d2marimba: [...D2.COLOUR_BLIPS, ...steps(D2.TOTEM, D2.PICTO, 12)],
  d2bell: [D2.PICTO + 12, D2.PICTO + 18, ...D2.WORLD_ROLL, D2.SHEET],
  // v07 (seam 4896): the hinge's two tones are the mirror trap's panes, a beat early.
  d2pane: [D2.HINGE.from, D2.HINGE.from + 6, drop2At(16, 0.5), ...steps(drop2At(16, 1), drop2At(16, 2), 12), ...steps(drop2At(16, 2), drop2At(16, 3), 6), ...steps(drop2At(16, 3), drop2At(17), 3), ...steps(D2.WALLPAPER.from, D2.WALLPAPER.to, 3)],
  d2shatter: [D2.GIVING_UP],
  d2plate: [D2.BLADES[2] + 3],
  d2look: [D2.MARCH[2] + 6],
  d2mountain: [D2.CREST + 12, D2.WAVE_CRASH + 60],
  d2spawn: [D2.HARD_DROPS[D2.HARD_DROPS.length - 1] - 6],
  d2unlock: [D2.WALLPAPER.from + 12],
  d2starcrack: steps(D2.CLAMP.from + 12, D2.CLAMP.from + 24, 3),
  d2fps: D2.SATURATE,
};

test('every sound of drop 2 is on its frame of the score (src/score/drop2.ts), as frame / 60 s exactly', () => {
  for (const [kind, frames] of Object.entries(PLACES)) assert.deepEqual(of(kind), frames.map(at), kind);
  const listed = new Set(Object.keys(PLACES));
  for (const e of events) if (e.kind.startsWith('d2')) assert.ok(listed.has(e.kind), `${e.kind} is placed on the score`);
});

test('every event of drop 2 is on the 32nd-note grid (a multiple of 3 frames) inside drop 2, and its kind starts with d2', () => {
  assert.ok(aloneEvents.length > 1200, `${aloneEvents.length} events`);
  for (const e of aloneEvents) {
    assert.ok(e.kind.startsWith('d2'), e.kind);
    const f = (e.at / SR) * 60;
    assert.ok(Math.abs(f - Math.round(f)) < 1e-9 && Math.round(f) % 3 === 0, `${e.kind} at frame ${f}`);
    // (v07, seam 5376: but the music box's ghost on the outro's downbeat, after the zero: MUSIC_BOX_GHOST.)
    const ghost = e.kind === 'd2musicbox' && Math.round(f) === D2.ZERO.to;
    assert.ok(ghost || (f >= D2.DROP2_START && f < D2.ZERO.from), `${e.kind} at frame ${f}`);
  }
});

/** Drop 2 rendered with only the sounds `kinds` pick (S.renderDrop2's solo; into buses reused and cleared first): the mono sum of every bus. */
const soloStems = fresh();
const only = (...kinds) => onlyWhere((k) => kinds.includes(k));
/** The same for any pick `want(kind, frame)` (a whole layer is asked without a frame). */
const onlyWhere = (want) => {
  for (const v of Object.values(soloStems)) {
    if (v instanceof Float32Array) v.fill(0);
    else {
      v.L.fill(0);
      v.R.fill(0);
    }
  }
  const ev = S.renderDrop2(soloStems, SR, { solo: want });
  const x = Float32Array.from(soloStems.sub);
  for (const [name, v] of Object.entries(soloStems)) if (name !== 'sub') for (let i = 0; i < N; i++) x[i] += 0.5 * (v.L[i] + v.R[i]);
  return { x, ev };
};
/** The first sample of `x` in [a, b) that is not exactly zero, or −1. */
const firstSound = (x, a, b) => {
  for (let i = a; i < b; i++) if (x[i] !== 0) return i;
  return -1;
};
/** Drop 2 alone as one mid signal (the sub and every bus, as onlyWhere returns a pick), made once. */
let aloneWhole = null;
const whole = () => {
  if (aloneWhole) return aloneWhole;
  aloneWhole = Float32Array.from(alone.sub);
  for (const [name, v] of Object.entries(alone)) if (name !== 'sub') for (let i = 0; i < N; i++) aloneWhole[i] += 0.5 * (v.L[i] + v.R[i]);
  return aloneWhole;
};
/** RMS of `x` in [lo, hi) Hz (band()'s filters) over samples [a, b), the filters run in from 100 ms before. */
const bandRms = (x, a, b, lo, hi) => {
  const fs = [Biquad.highpass(SR, lo), Biquad.highpass(SR, lo), ...(hi ? [Biquad.lowpass(SR, hi), Biquad.lowpass(SR, hi)] : [])];
  let e = 0;
  for (let i = a - Math.round(0.1 * SR); i < b; i++) {
    const y = fs.reduce((v, f) => f.process(v), x[i]);
    if (i >= a) e += y * y;
  }
  return Math.sqrt(e / (b - a));
};
/**
 * A voice's presence in the mix (the checkers' measure, 2026-10-03): dB of `v` (its pick rendered alone, onlyWhere) over the rest of drop 2
 * (the whole − it) in [lo, hi) Hz over `len` ms from frame `f` (on the mid).
 */
const presence = (v, f, lo, hi, len) => {
  const pre = Math.round(0.1 * SR);
  const [a, b] = [at(f), at(f) + Math.round((len / 1000) * SR)];
  const w = whole();
  const rest = Float32Array.from({ length: b - a + pre }, (_, i) => w[a - pre + i] - v[a - pre + i]);
  return 20 * Math.log10(bandRms(v, a, b, lo, hi) / bandRms(rest, pre, rest.length, lo, hi));
};

/**
 * Sounds with an attack, each kind rendered alone: its first is silent before its frame's first sample and sounding within 3 samples of
 * it, and every one starts within `tol` ms of its frame (an FM bell opens over a few ms: 4 ms, a quarter of a frame; a sung note’s
 * formants take longer to speak: 8 ms, half a frame; a run that climbs from soft under its own last hit: 5 ms).
 */
const HARD = {
  // As built.
  d2kick: 2, d2snare: 2, d2hat: 2, d2shaker: 3, d2openhat: 2, d2rim: 2, d2tom: 2, d2roll: 5, d2drop: 2, d2pop: 2, d2combo: 2,
  d2zap: 2, d2turn: 4, d2snap: 2, d2pok: 2, d2shing: 4, d2reelshing: 4, d2ring: 4, d2glint: 4, d2fmpop: 4, d2sparkle: 4, d2blink: 2,
  d2gamestart: 2, d2ledrun: 2, d2ignite: 2, d2tick: 2, d2crack: 2, d2twang: 2, d2fatal: 2, d2bwomp: 3, d2clack: 2, d2gulp: 8, d2reform: 8,
  d2hey: 8, d2stutter: 8, d2scream: 8, d2thunk: 2, d2plink: 4, d2powerdown: 4, d2ringtick: 2, // (v08: d2fall is bridge B's bbfall now)
  // Act 2's drums.
  d2spillsnare: 5, d2taiko: 5, d2chipsnare: 2, d2cowbell: 2, d2tamb: 3, d2chipshaker: 2, d2tenor: 2, d2drumline: 2, d2buildsnare: 5,
  // The new bars' hits, notes and blips.
  d2probe: 2, d2kana: 4, d2bytetick: 4, d2tink: 2, d2clank: 3, d2domino: 2, d2corecrack: 2, d2install: 2, d2kfrag: 8, d2v2ready: 2,
  d2scannote: 2, d2lock: 2, d2box: 3, d2infect: 4, d2seal: 2, d2pip: 2, d2pew: 2,
  d2split: 3, d2stomp: 2, d2wall: 2, d2harddrop: 2, d2garbage: 3, d2orch: 3, d2panel: 3, d2slap: 2, d2foil: 2,
  d2ratchet: 2, d2sheet: 2, d2mirror: 4, d2targetlock: 2, d2clamp: 2, d2chip: 2, d2march: 3, d2figure: 5, d2bytes: 2,
  d2musicbox: 4, d2plates: 2, d2heart: 6, d2wa: 8,
  // The worlds' chord voices and the new sync hits.
  d2zchord: 4, d2defrow: 2, d2draft: 3, d2throw: 2, d2sign: 3, d2bleep: 2, d2marimba: 3, d2bell: 4, d2pane: 4, d2shatter: 4,
  d2plate: 2, d2look: 4, d2mountain: 4, d2spawn: 2, d2unlock: 2, d2starcrack: 4, d2fps: 4,
  // M3: the wall smash; W: the stages before it.
  d2wallsmash: 2, d2push: 2, d2crackstep: 2,
  // E: the Edo voices of the wave.
  d2shamisen: 3, d2tsuke: 2, d2pon: 3, d2kan: 2, d2odaiko: 5, d2ki: 2,
};

test('measured: every hit, note and blip starts on its own frame — each kind rendered alone, its first silent before 800 × frame samples', () => {
  let count = 0;
  for (const [kind, tol] of Object.entries(HARD)) {
    const { x, ev } = only(kind);
    const frames = PLACES[kind];
    assert.deepEqual(ev.filter((e) => e.kind === kind).map((e) => e.at), frames.map(at), `${kind} renders alone`);
    const first = firstSound(x, 0, at(frames[0]) + at(1));
    assert.ok(first >= at(frames[0]) && first <= at(frames[0]) + 3, `${kind}: first sound at ${(first / 800).toFixed(4)}, want ${frames[0]}`);
    // A roll run that starts on a downbeat (drop2 7.1, 19.1) starts soft under the last, loudest hit of the run before: its kick marks it.
    // (v07: the colour blips' marimba, a 32nd apart, each ringing on the last: checked one by one below.)
    const singly = kind === 'd2marimba' ? D2.COLOUR_BLIPS : [];
    assertOnsets(x, kind === 'd2roll' ? frames.filter((f) => f !== D2.REEL.from && f !== D2.LATCH) : frames.filter((f) => !singly.includes(f)), kind, tol, 1.4);
    count += frames.length;
  }
  assert.ok(count > 1050, `${count} sounds measured`);
  // The crashes ring over each other, and so do the crown's glass tings (a 32nd apart, each ringing 200 ms) and the hyoshigi (v07: the
  // spill's ki on the drafting arcs, a 32nd apart, then the blocks' chon, their two bars beating as they ring), so each is rendered
  // alone: silent before its frame's first sample, sounding within 3 of it.
  for (const [kind, frames] of [['d2crash', PLACES.d2crash], ['d2crown', PLACES.d2crown], ['d2block', PLACES.d2block], ['d2marimba', D2.COLOUR_BLIPS]]) {
    for (const f of frames) {
      const { x } = onlyWhere((k, fr) => k === kind && fr === f);
      const first = firstSound(x, 0, at(f) + at(1));
      assert.ok(first >= at(f) && first <= at(f) + 3, `${kind} ${f}: first sound at ${(first / 800).toFixed(4)}`);
    }
  }
});

test('measured: the whooshes peak on their frames (the take-off, the whip, the crane, the tilt, the pans, the flood, the barrel, the spit, the rotation, the wipes)', () => {
  for (const kind of ['d2takeoff', 'd2whip', 'd2crane', 'd2tilt', 'd2pan', 'd2floodwhoosh', 'd2barrel', 'd2spit', 'd2rotate', 'd2whipreel', 'd2wipe']) {
    const { x } = only(kind);
    const air = band(x, 400, 9000);
    for (const peak of PLACES[kind].filter((f) => kind !== 'd2wipe' || f !== D2.WIPES[0])) {
      let best = 0;
      let where = 0;
      for (let f = peak - 9; f <= peak + 4; f += 0.25) {
        const v = rms(air, at(f) - 0.004 * SR, at(f) + 0.004 * SR);
        if (v > best) {
          best = v;
          where = f;
        }
      }
      assert.ok(Math.abs(where - peak) <= 2, `${kind} ${peak}: loudest at ${where}`);
    }
  }
});

test('measured: the swells end on their frames — the risers and the reversed cymbals stop on the hit they lead into', () => {
  const hits = [D2.TURNS[0].to, D2.WHIP.to, D2.GAME, D2.FULL_COMBO, D2.PAN.to, D2.SWITCH.from, D2.BURST, D2.PICTO, D2.REEL.from, D2.CRASH, D2.DRAIN.from];
  let led = 0;
  for (const kind of ['d2riser', 'd2reverse']) {
    const { x } = only(kind);
    for (const hit of hits) {
      const into = rms(x, at(hit) - 0.02 * SR, at(hit));
      if (into < 1e-4) continue; // this kind does not lead into that hit
      led++;
      assert.ok(into > 1.2 * rms(x, at(hit) - 0.3 * SR, at(hit) - 0.28 * SR), `${kind} grows into ${hit}`);
      assert.ok(rms(x, at(hit) + 0.002 * SR, at(hit) + 0.02 * SR) < 0.25 * into, `${kind} stops on ${hit}`);
    }
  }
  // (v07, §3: the riser and the reversed crash into 10.1 are gone — the swell into the wave's keyline print was noise.)
  assert.ok(led >= 12, `${led} swells measured`);
});

test('the hook is drop 1’s a semitone up (drop2 bar 2’s fourth note B, diatonic over the sus) on bars 1–4 and 6; bar 5 is row 4 a diatonic third up, its top', () => {
  const rows = [...HOOK.slice(0, 4).map((row, k) => [1 + k, row]), [6, HOOK[4]]];
  for (const [bar, row] of rows) {
    const notes = D2.HOOK2.filter((n) => n.at >= drop2At(bar) && n.at < drop2At(bar + 1));
    assert.equal(notes.length, row.length, `bar ${bar}`);
    row.forEach(([s, m], k) => {
      assert.equal(notes[k].at, drop2At(bar) + 6 * s);
      assert.equal(notes[k].midi, bar === 2 && s === 6 ? 83 : m + 1, `drop2 bar ${bar}, 16th ${s}`);
    });
  }
  const four = D2.HOOK2.filter((n) => n.at >= drop2At(4) && n.at < drop2At(5));
  const five = D2.HOOK2.filter((n) => n.at >= drop2At(5) && n.at < drop2At(6));
  assert.equal(five.length, four.length);
  five.forEach((n, k) => {
    assert.equal(n.at - drop2At(5), four[k].at - drop2At(4), `bar 5's rhythm is row 4's (${k})`);
    assert.equal(S.thirdBelow(n.midi), four[k].midi, `bar 5 note ${k}: a diatonic third over row 4's`);
  });
  const scale = [6, 8, 10, 11, 1, 3, 5];
  for (const n of D2.HOOK2) {
    const h = S.thirdBelow(n.midi);
    assert.ok([3, 4].includes(n.midi - h), `a third below ${n.midi}: ${h}`);
    assert.ok(scale.includes(h % 12) && scale.includes(n.midi % 12), `${n.midi} and ${h} are in F♯ major`);
  }
  const top = Math.max(...D2.HOOK2.map((n) => n.midi));
  assert.ok(D2.HOOK2.every((n) => (n.at >= drop2At(5) && n.at < drop2At(6)) || n.midi < top), 'its top is on drop2 bar 5');
});

test('measured: the hook sings its notes — the lead, rendered alone, on every note of two sixteenths or more; the harmony a third below', () => {
  const lead = only('d2lead').x;
  const harmony = only('d2harmony').x;
  const first = firstSound(lead, 0, at(D2.DROP2_START) + at(1));
  assert.ok(first >= at(D2.DROP2_START) && first <= at(D2.DROP2_START) + 3, `the hook starts on drop2 1.1: ${first}`);
  let n = 0;
  // (The notes under the bitcrusher, drop2 4.4& on, are sung through its sample-and-hold steps, which an autocorrelation reads instead.)
  for (const h of D2.HOOK2.filter((x) => x.len >= 2 && (x.at + 9 <= D2.BITCRUSH[0] || x.at >= D2.GAME))) {
    const p = acPitch(lead, at(h.at + 3), at(h.at + 9), 400, 2400);
    assert.ok(near(p, midiHz(h.midi), 0.025), `lead ${h.at}: ${p.toFixed(1)} Hz, want ${midiHz(h.midi).toFixed(1)}`);
    const q = acPitch(harmony, at(h.at + 3), at(h.at + 9), 300, 2400);
    assert.ok(near(q, midiHz(S.thirdBelow(h.midi)), 0.025), `harmony ${h.at}: ${q.toFixed(1)} Hz, want ${midiHz(S.thirdBelow(h.midi)).toFixed(1)}`);
    n++;
  }
  assert.ok(n >= 34, `${n} notes`);
  // Over bars 1–4.
  const [a, b] = [at(D2.DROP2_START), at(drop2At(5))];
  assert.ok(rms(harmony, a, b) > 0.55 * rms(lead, a, b) && rms(harmony, a, b) < 0.85 * rms(lead, a, b), 'the harmony sings at 0.7 ×');
});

// The chord bus (d2chords) holds the worlds' short-decay chord voices since the pads went (2026-10-02): the stabs, the arps, the koto's
// 16ths, the Z-buffer's FM pops, the blueprint's plucks, the bleeps, the marimba, the bells. Every chord is still heard on it, voiced.
test('F♯ major and the antivirus’s borrowed chords: the four strongest pitch classes of every chord of HARMONY2 are its voicing’s, on the chord voices', () => {
  const chords = mid(alone.d2chords);
  D2.HARMONY2.forEach((c, i) => {
    const end = i + 1 < D2.HARMONY2.length ? D2.HARMONY2[i + 1].at : D2.CRASH;
    const pc = chroma(chords, at(c.at + 3), at(end - 3));
    const top = [...pc.keys()].sort((a, b) => pc[b] - pc[a]).slice(0, 4).sort((a, b) => a - b);
    assert.deepEqual(top, uniq(S.VOICINGS2[c.chord].map((m) => m % 12)), `${c.chord} on ${c.at}`);
  });
  for (const name of Object.keys(VOICINGS)) assert.deepEqual(S.VOICINGS2[name], VOICINGS[name].map((m) => m + 1), `${name}: drop 1’s + 1`);
  // Borrowed from F♯ minor: ♭VI D, iv Bm, V7♭9, ♭VII E, V7 (the bible's §2.2); no tonic chord (F♯) anywhere in drop 2.
  assert.deepEqual(uniq(S.VOICINGS2.bVI.map((m) => m % 12)), [2, 4, 6, 9]);
  assert.deepEqual(uniq(S.VOICINGS2.iv.map((m) => m % 12)), [1, 2, 6, 11]);
  assert.ok(D2.HARMONY2.every((c) => c.chord in S.VOICINGS2 && c.chord !== 'I'), 'every chord voiced, none the tonic');
});

test('the arp and the stabs from drop2 1.1 on the chord bus, the stabs an octave and two over the voicing; nothing before it; the sub pumps with the kick', () => {
  const stabs = only('d2stab').x;
  // Over the first chord (IV), from 4 frames in to 2 frames before the next.
  const oct = chroma(band(stabs, 1000, 2600), at(D2.HARMONY2[0].at + 4), at(D2.HARMONY2[1].at - 2));
  assert.ok(oct[1] + oct[3] + oct[6] + oct[10] > 0.5 * oct.reduce((s, v) => s + v, 0), 'the stabs sing the voicing an octave up');
  const arp = band(only('d2arp').x, 900, 2600);
  assert.ok(rms(arp, at(drop2At(1)), at(drop2At(2))) > 0.004, `the arp plays in drop2 bar 1: ${dB(rms(arp, at(drop2At(1)), at(drop2At(2))))} dB`);
  assert.equal(rms(sumMid(alone.d2music, alone.d2chords, alone.d2vox, alone.d2bass, alone.d2dry, alone.drums, alone.fx, alone.chime, alone.post), 0, at(D2.DROP2_START)), 0, 'nothing before drop2 1.1');
  // (The first blade's whoosh peaks two frames after its blade, so it swells in over the last 4 frames of the break's dead air, which the
  // break gates to digital zero: the seam test below measures the mix there.)
  assert.equal(rms(mid(alone.d2air), 0, at(D2.DROP2_START - 4)), 0, 'nothing on the air bus before drop2 1.1 but the first whoosh’s swell');
  // The kicks of drop2 1.2 to 2.4 (the downbeat's crash aside).
  for (const k of D2.KICKS2.filter((f) => f > D2.DROP2_START + 4 && f < D2.DROP2_START + 184)) {
    const sb = rms(alone.sub, at(k) - at(3), at(k));
    const sa = rms(alone.sub, at(k) + at(0.4), at(k) + at(1.6));
    assert.ok(sa < 0.5 * sb, `sub at ${k}: ${dB(sa)} vs ${dB(sb)} dB`);
  }
});

// A chord held behind everything is noise; the model is break 1
// FALL (no drums, the glass is the rhythm, a faint pad). As the cosmos did (tests/cosmosAudio.test.mjs "no constant chord wall"), drop 2
// drops its bed — pads A, B and C, the air bed, the shine, the act-2 choirs — and carries its harmony on short-decay voices, one family a
// world (S.WORLD_VOICES), on the picture's events. The one swell left is the bullet time's frozen chord, after the freeze, fainter.
// v09 measured (drop 2 alone, to the crash): the pads at −9.42 LUFS, 2.5 LU over the drums (−11.93); between the kicks the floor of the
// chord and music buses (200 Hz – 4 kHz) 2.4 dB under their mean — a wall.
test('no constant chord wall (2026-10-02): no pad, air bed or choir; the chord voices sit under the drums and fall away between the hits; the one swell is the bullet time’s frozen chord, fainter', () => {
  for (const kind of ['d2chord', 'd2airbed', 'd2choir', 'd2choir2']) assert.equal(aloneEvents.filter((e) => e.kind === kind).length, 0, `${kind} is gone`);
  assert.ok(!('SHINE' in S) && !('PAD_C' in S) && !('AIR_BED' in S), 'no shine, no pad layer C, no air bed');
  const [a, b] = [at(D2.DROP2_START), at(D2.CRASH)];
  const lu = (bus) => integratedLoudness(bus.L.subarray(a, b), bus.R.subarray(a, b), SR);
  // As the cosmos's glass pad (≤ its drums − 3 LU), the chord voices sit under the drums; the pads sat 2.5 LU over them.
  assert.ok(lu(alone.d2chords) <= lu(alone.drums) - 3, `the chord voices ${lu(alone.d2chords).toFixed(1)} LUFS against the drums’ ${lu(alone.drums).toFixed(1)}`);
  // Between the kicks (90 ms after each to 15 ms before the next), 200 Hz – 4 kHz of the chord and music buses: a held chord keeps a gap's
  // floor (its quietest 10 % of 5 ms windows) near its mean; short-decay voices let it fall. Silent gaps (the held breath) are skipped.
  const x = band(sumMid(alone.d2chords, alone.d2music), 200, 4000);
  const kicks = D2.KICKS2.filter((f) => f < D2.CRASH);
  const byBar = new Map();
  for (let k = 0; k + 1 < kicks.length; k++) {
    const [g0, g1] = [at(kicks[k]) + Math.round(0.09 * SR), at(kicks[k + 1]) - Math.round(0.015 * SR)];
    if (g1 - g0 < 0.05 * SR || rms(x, g0, g1) < 1e-5) continue;
    const w = Math.round(0.005 * SR);
    const r = [];
    for (let s = g0; s + w <= g1; s += w) r.push(rms(x, s, s + w));
    r.sort((p, q) => p - q);
    const d = 20 * Math.log10(Math.max(1e-9, r[Math.floor(0.1 * r.length)]) / rms(x, g0, g1));
    const bar = Math.floor((kicks[k] - D2.DROP2_START) / 96) + 1;
    byBar.set(bar, [...(byBar.get(bar) ?? []), d]);
  }
  const median = (v) => [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)];
  const all = [...byBar.values()].flat();
  assert.ok(median(all) <= -8, `the gaps’ floor ${median(all).toFixed(1)} dB under their mean (v09: −2.4)`);
  for (const [bar, v] of byBar) assert.ok(median(v) <= -5, `drop2 bar ${bar}: the gaps’ floor ${median(v).toFixed(1)} dB under their mean`);
  // The one swell: the bullet time's frozen chord, after the freeze (its fade-in: the bullet-time test), 3 dB under v09's.
  assert.deepEqual(of('d2freeze'), [at(D2.BULLET.from)]);
  assert.ok(FREEZE_GAIN <= 0.55 * 10 ** (-3 / 20) + 1e-9, `the frozen chord at ${FREEZE_GAIN}`);
});

test('each world carries its harmony on its own family (S.WORLD_VOICES), and the picture gets ≥ 10 % more sync points than v09 (247 frames with a one-shot that is not a drum)', () => {
  const worlds = S.WORLD_VOICES;
  // Every bar of drop 2 up to the reel belongs to one world, in order, each with a voice and the kinds it places.
  assert.deepEqual(worlds.flatMap((w) => Array.from({ length: w.bars[1] - w.bars[0] + 1 }, (_, k) => w.bars[0] + k)), Array.from({ length: 19 }, (_, k) => k + 1));
  for (const w of worlds) {
    assert.ok(w.voice && w.kinds.length, w.world);
    for (const kind of w.kinds) assert.ok(aloneEvents.some((e) => e.kind === kind) || kind === 'd2stab' || kind === 'd2arp', `${w.world}: ${kind} is placed`);
  }
  const drums = new Set(['d2kick', 'd2snare', 'd2hat', 'd2shaker', 'd2openhat', 'd2rim', 'd2crash', 'd2tom', 'd2roll', 'd2spillsnare', 'd2taiko', 'd2chipsnare', 'd2cowbell', 'd2tamb', 'd2chipshaker', 'd2gatedtom', 'd2tenor', 'd2drumline', 'd2timpani', 'd2buildsnare']);
  const layers = new Set(['d2arp', 'd2wobble', 'd2freeze', 'd2orbit', 'd2crush', 'd2scrub', 'd2buzz']);
  const sync = new Set(aloneEvents.filter((e) => !drums.has(e.kind) && !layers.has(e.kind)).map((e) => e.at));
  assert.ok(sync.size >= 1.1 * 247, `${sync.size} frames with a sync hit (v09: 247; ≥ 10 % more)`);
});

test('the wobble’s filter opens on every peak of the LFO the picture ripples on (12 f, then 8 f from drop2 4.3, 6 f from 4.4)', () => {
  const bass = mid(alone.d2bass);
  const hi = band(bass, 900);
  const lo = band(bass, 40, 250);
  // Brightness over the open quarter-periods either side of a peak against the shut half around the trough after it (the saw's
  // high harmonics come in bursts at its edges, so short windows would measure where the edges fall, not the filter).
  const tilt = (a, b) => rms(hi, at(a), at(b)) / Math.max(1e-9, rms(lo, at(a), at(b)));
  let checked = 0;
  for (let k = 0; k < D2.WOBBLE_RATES.length; k++) {
    const r = D2.WOBBLE_RATES[k];
    const end = k + 1 < D2.WOBBLE_RATES.length ? D2.WOBBLE_RATES[k + 1].at : D2.WOBBLE.to;
    for (let f = r.at + r.every; f + r.every <= end; f += r.every) {
      if (D2.BITCRUSH[0] <= f && f < D2.GAME) continue; // crushed: its noise floor is not the filter
      const open = tilt(f - r.every / 4, f + r.every / 4);
      const shut = tilt(f + r.every / 4, f + (3 * r.every) / 4);
      assert.ok(open > 2 * shut, `open around ${f} (${open.toFixed(3)}), shut around ${f + r.every / 2} (${shut.toFixed(3)})`);
      checked++;
    }
  }
  assert.ok(checked > 12, `${checked} peaks`);
  // (the pluck comes back on drop2 5.1&)
  assert.ok(rms(bass, at(D2.WOBBLE.to) + 0.05 * SR, at(D2.OPEN_HATS2.find((f) => f > D2.WOBBLE.to))) < 0.02 * rms(bass, at(D2.WOBBLE.from), at(D2.WOBBLE.to)), 'gone from drop2 5.1');
  assert.equal(wobbleLfo(D2.WOBBLE.from), 1, 'peaking on drop2 3.1');
});

test('the bitcrusher: drop2 4.4& crunches drop 2’s music to 8 bits, to 4 bits a sixteenth later, and 5.1 is clean; the drums stay dry', () => {
  // Rendered with the 18 kHz top off (it filters every bus after the crusher, so no sample would stay on the grid), and the group's drive
  // and clip, which also come after the crusher, divided out (CLIP_REPORT.gain, from CLIP_REPORT.a).
  const top = S.TOP.hz;
  S.TOP.hz = 0;
  const raw = fresh();
  try {
    S.renderDrop2(raw, SR, { solo: (k) => k === 'd2arp' || k === 'd2crush' || k === 'd2kick' });
  } finally {
    S.TOP.hz = top;
  }
  const group = { ...S.CLIP_REPORT };
  const x = raw.d2chords.L;
  const y = (i) => x[i] / group.gain[i - group.a];
  const onGrid = (a, b, levels) => {
    for (let i = a; i < b; i++) if (Math.abs(y(i) * levels - Math.round(y(i) * levels)) > 1e-4) return false;
    return true;
  };
  const pad = Math.round(0.002 * SR);
  assert.ok(onGrid(at(D2.BITCRUSH[0]) + pad, at(D2.BITCRUSH[1]) - pad, 128), '8 bits');
  assert.ok(onGrid(at(D2.BITCRUSH[1]) + pad, at(D2.GAME) - pad, 8), '4 bits');
  assert.ok(!onGrid(at(D2.BITCRUSH[0]) + pad, at(D2.BITCRUSH[1]) - pad, 8), 'not yet 4 bits');
  assert.ok(!onGrid(at(D2.GAME) + pad, at(D2.GAME + 6), 128), 'clean on drop2 5.1');
  const d = raw.drums.L;
  let q = 0;
  for (let i = at(D2.BITCRUSH[1]) + pad; i < at(D2.GAME) - pad; i++) if (Math.abs((d[i] / group.gain[i - group.a]) * 8 - Math.round((d[i] / group.gain[i - group.a]) * 8)) < 1e-6) q++;
  assert.ok(q < 0.5 * (at(D2.GAME) - at(D2.BITCRUSH[1])), 'the drums are not crushed');
});

test('drop2 bar 7: one long “aa” climbing a semitone per kick (D♯6 → F♯6), then gliding down two octaves into the kernel', () => {
  const v = mid(alone.d2vox);
  D2.VOX_CLIMB.forEach((f, k) => {
    const p = acPitch(v, at(f + 4), at(f + 11), 400, 2400);
    assert.ok(near(p, midiHz(87 + k), 0.025), `${f}: ${p.toFixed(1)} Hz, want ${midiHz(87 + k).toFixed(1)}`);
  });
  const low = acPitch(v, at(D2.VOX_GLIDE.to - 3), at(D2.VOX_GLIDE.to), 150, 900);
  assert.ok(low > midiHz(64) && low < midiHz(72), `two octaves down by the wrap’s end (F♯4 on ${D2.VOX_GLIDE.to}): ${low.toFixed(1)} Hz`);
});

// M3 (2026-10-02, on the overflow: a sync sound for the wall on the right being smashed out): the snap (7.3&) had only the strain,
// the twang and three sparks under the stab. The wall now creaks as it bows and is smashed out: a thud, the bezel's crack, the debris —
// on the right, where the wall goes — with the music ducked under it.
test('M3, the wall smash on 7.3&: on the right, over the ducked music (its crack ≥ 6 dB in 1–6 kHz, its thud ≥ 3 dB under 200 Hz); the music drops into SNAP_GAP before it and the duck is WALL_DUCK, gone by 7.4’s FATAL, which stays its own sound', () => {
  const wall = (k) => k === 'd2wallsmash' || k === 'd2wallcreak';
  const side = (s, ch) => {
    const o = Float32Array.from(s.sub);
    for (const [name, v] of Object.entries(s)) if (name !== 'sub') for (let i = 0; i < N; i++) o[i] += v[ch][i];
    return o;
  };
  const [s0, f0] = [at(D2.SNAP), at(D2.SURF[3])];
  const ms = (m) => Math.round((m / 1000) * SR);
  const ratio = (x, y, a, b) => 20 * Math.log10(rms(x, a, b) / rms(y, a, b));
  // The music the duck acts on (the stab on the snap, the climbing "aa", the sub), with and without the wall.
  const music = (s) => sumMid(s.d2chords, s.d2vox);
  const ducked = music(alone);
  onlyWhere((k) => !wall(k));
  const open = music(soloStems);
  const subOpen = Float32Array.from(soloStems.sub);
  const restL = side(alone, 'L');
  const restR = side(alone, 'R');
  onlyWhere(wall);
  const [wL, wR] = [side(soloStems, 'L'), side(soloStems, 'R')];
  for (let i = 0; i < N; i++) {
    restL[i] -= wL[i];
    restR[i] -= wR[i];
  }
  const hold = [s0 + ms(5), s0 + ms(S.WALL_DUCK.holdMs)];
  // W's fix round: the snap lands out of the deepest gap (SNAP_GAP over the 32nd before it); nothing ducks before that.
  assert.ok(Math.abs(ratio(ducked, open, s0 - ms(45), s0 - ms(5)) - S.SNAP_GAP.db) < 1, `the gap before the snap: ${ratio(ducked, open, s0 - ms(45), s0 - ms(5)).toFixed(2)} dB`);
  assert.ok(S.SNAP_GAP.db < Math.min(...S.PUSHES.map((p) => p.gapDb)), 'the deepest gap');
  assert.ok(Math.abs(ratio(ducked, open, at(D2.SNAP - S.GAP.frames) - ms(60), at(D2.SNAP - S.GAP.frames) - ms(5))) < 0.1, 'nothing ducks before the gap');
  assert.ok(Math.abs(ratio(ducked, open, ...hold) - S.WALL_DUCK.db) < 1, `the music ducks ${ratio(ducked, open, ...hold).toFixed(2)} dB`);
  assert.ok(Math.abs(ratio(alone.sub, subOpen, ...hold) - S.WALL_DUCK.db) < 1, `the sub ducks ${ratio(alone.sub, subOpen, ...hold).toFixed(2)} dB`);
  assert.ok(Math.abs(ratio(ducked, open, f0, f0 + ms(40))) < 0.2, 'back by the FATAL');
  // On the right, where the wall and its debris fly.
  assert.ok(ratio(wR, wL, s0, s0 + ms(400)) >= 3, `the smash ${ratio(wR, wL, s0, s0 + ms(400)).toFixed(1)} dB right of centre`);
  assert.ok(ratio(wR, wL, s0 + ms(150), s0 + ms(400)) >= 4, `its debris ${ratio(wR, wL, s0 + ms(150), s0 + ms(400)).toFixed(1)} dB right`);
  // It reads over the music it ducks: the crack in 1–6 kHz on the right, the thud under 200 Hz in the middle.
  const crack = ratio(band(wR, 1000, 6000), band(restR, 1000, 6000), s0, s0 + ms(20));
  assert.ok(crack >= 6, `the crack ${crack.toFixed(1)} dB over the rest (1–6 kHz, right, its first 20 ms)`);
  const [wM, restM] = [wL.map((v, i) => 0.5 * (v + wR[i])), restL.map((v, i) => 0.5 * (v + restR[i]))];
  const thud = ratio(band(wM, 40, 200), band(restM, 40, 200), s0, s0 + ms(60));
  assert.ok(thud >= 3, `the thud ${thud.toFixed(1)} dB over the rest (40–200 Hz, its first 60 ms)`);
  // The FATAL beeps of 7.4 stand ≥ 12 dB over what is left of the wall (1–6 kHz, left, their first 60 ms).
  onlyWhere((k) => k === 'd2fatal');
  const fatal = side(soloStems, 'L');
  const distinct = ratio(band(fatal, 1000, 6000), band(wL, 1000, 6000), f0, f0 + ms(60));
  assert.ok(distinct >= 12, `the FATAL ${distinct.toFixed(1)} dB over the debris`);
});

// W (2026-10-03, on the overflow: the bar reaches the wall in stages, so the music should hit each one). Measured on drop2-wip-v09 (the green
// bar's leading edge, frame by frame, against src/shots/drop2Overflow.ts frontAt): it lands on 7.1 (256 %), surges 590 px over 7.2 → 7.2 + 5
// (65,536 %; the border cracks), steps a cell on 7.2e, 7.2&, 7.2a as the crack widens, runs into the wall from 7.2a and hits it on 7.3
// (16,777,216 %), bowing it out to + 3; snaps on 7.3& (268,435,456 %); FATAL (INT_MAX) on 7.4; wraps on 7.4&. The ear counts them now.
test('W, the overflow’s stages: a push on 7.1, 7.2, 7.3, each louder, heavier and higher than the last, the music ducked deeper each time; crack steps on 7.2e/&/a, rising; the snap (7.3&) the biggest hit; the FATAL (7.4) and the wrap (7.4&) their own sounds', () => {
  const stages = [D2.SURF[0], D2.SURF[1], D2.BOW];
  assert.deepEqual(S.PUSHES.map((p) => p.at), stages);
  const ms = (m) => Math.round((m / 1000) * SR);
  const db = (v) => 20 * Math.log10(v);
  // Everything of the wall's story, with the snap's twang and the clap's crack: louder on each stage, the snap louder still.
  const { x } = onlyWhere((k) => ['d2push', 'd2pushclank', 'd2wallsmash', 'd2wallcreak', 'd2twang', 'd2crack', 'd2strain'].includes(k));
  const [hi, lo] = [band(x, 1000, 6000), band(x, 30, 200)];
  const levels = [...stages, D2.SNAP].map((f) => ({ all: rms(x, at(f), at(f) + ms(60)), hi: rms(hi, at(f), at(f) + ms(30)), lo: rms(lo, at(f), at(f) + ms(60)) }));
  for (let k = 1; k < levels.length; k++) {
    for (const key of ['all', 'hi', 'lo']) assert.ok(levels[k][key] > levels[k - 1][key], `${key}: stage ${k + 1} ${db(levels[k][key]).toFixed(1)} dB over stage ${k} ${db(levels[k - 1][key]).toFixed(1)}`);
  }
  assert.ok(db(levels[3].all / levels[2].all) >= 2 && db(levels[3].lo / levels[2].lo) >= 3, 'the snap is the biggest hit');
  // Each push's crunch rings higher (its centroid over 1–8 kHz, its first 25 ms).
  const pushes = only('d2push').x;
  const centroid = (f) => {
    let num = 0;
    let den = 0;
    for (const fc of [1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300]) {
      const e = rms(band(pushes.subarray(at(f) - 4800, at(f) + ms(25)), fc / 1.12, fc * 1.12), 4800, 4800 + ms(25)) ** 2;
      num += fc * e;
      den += e;
    }
    return num / den;
  };
  const c = stages.map(centroid);
  assert.ok(c[1] > 1.05 * c[0] && c[2] > 1.1 * c[1], `the crunch climbs ${c.map((v) => v.toFixed(0)).join(' → ')} Hz`);
  // The music ducks deeper on each push (PUSHES' duckDb), and deepest on the snap (WALL_DUCK); held PUSH_DUCK.holdMs (the fix round: the
  // 40 ms ducks left no dip a listener hears).
  const music = (st) => sumMid(st.d2chords, st.d2vox);
  const ducked = music(alone);
  const openWhole = onlyWhere((k) => k !== 'd2push' && k !== 'd2pushclank').x;
  const open = music(soloStems);
  const held = S.PUSH_DUCK.holdMs;
  assert.ok(held >= 100 && held <= 150, `the pushes' ducks held ${held} ms`);
  const depth = stages.map((f) => db(rms(ducked, at(f) + ms(5), at(f) + ms(held)) / rms(open, at(f) + ms(5), at(f) + ms(held))));
  S.PUSHES.forEach((p, k) => assert.ok(Math.abs(depth[k] - p.duckDb) < 0.5, `the duck on stage ${k + 1}: ${depth[k].toFixed(2)} dB, want ${p.duckDb}`));
  assert.ok(depth[0] > depth[1] && depth[1] > depth[2] && depth[2] > S.WALL_DUCK.db, `deeper each time: ${depth.map((v) => v.toFixed(1)).join(', ')}, then ${S.WALL_DUCK.db}`);
  // The fix round (the checker, 2026-10-03: in the finished mix the pushes' energy went into the group clip and the limiter — 7.2 stayed
  // the loudest stage and nothing climbed): contrast instead. The gap: over the 32nd before each stage all of drop 2 drops its gapDb,
  // deeper each time (the snap's SNAP_GAP the deepest: the M3 test), nothing before it.
  S.PUSHES.forEach((p, k) => {
    const gap = db(rms(whole(), at(p.at) - ms(45), at(p.at) - ms(5)) / rms(openWhole, at(p.at) - ms(45), at(p.at) - ms(5)));
    assert.ok(Math.abs(gap - p.gapDb) < 1, `the gap before stage ${k + 1}: ${gap.toFixed(2)} dB, want ${p.gapDb}`);
    const before = at(p.at - S.GAP.frames);
    assert.ok(Math.abs(db(rms(whole(), before - ms(30), before) / rms(openWhole, before - ms(30), before))) < 0.1 || k > 0, 'nothing before the first gap');
  });
  assert.ok(S.PUSHES[0].gapDb > S.PUSHES[1].gapDb && S.PUSHES[1].gapDb > S.PUSHES[2].gapDb && S.PUSHES[2].gapDb > S.SNAP_GAP.db, 'deeper each time');
  // Each push heard in the mix: its clank (A♯5, C♯6, E♯6 on the iii chord) with its crunch ≥ 3 dB over the rest in 2.5–5 kHz (its first
  // 30 ms), its level there climbing stage by stage, the snap's crack over the third.
  const pushX = only('d2push', 'd2pushclank').x;
  const snapX = only('d2wallsmash').x;
  assert.deepEqual(S.PUSHES.map((p) => p.clank), [82, 85, 89]);
  const inMix = stages.map((f) => presence(pushX, f, 2500, 5000, 30));
  inMix.forEach((d, k) => assert.ok(d >= 3, `stage ${k + 1} in the mix: ${d.toFixed(1)} dB over the rest (2.5–5 kHz)`));
  const lv = [...stages.map((f) => bandRms(pushX, at(f), at(f) + ms(30), 2500, 5000)), bandRms(snapX, at(D2.SNAP), at(D2.SNAP) + ms(30), 2500, 5000)];
  for (let k = 1; k < lv.length; k++) assert.ok(lv[k] > lv[k - 1], `2.5–5 kHz: ${lv.map((v) => db(v).toFixed(1)).join(' → ')} dB`);
  // The crack steps climb: louder and higher each, and are heard (≥ 0 dB over the rest in 2–5 kHz, their first 20 ms).
  const cracks = only('d2crackstep').x;
  const cs = S.CRACK_STEPS.map((s3) => rms(cracks, at(s3.at), at(s3.at) + ms(20)));
  assert.ok(cs[1] > cs[0] && cs[2] > cs[1], 'the crack steps grow');
  assert.ok(S.CRACK_STEPS[1].freq > S.CRACK_STEPS[0].freq && S.CRACK_STEPS[2].freq > S.CRACK_STEPS[1].freq, 'and climb');
  S.CRACK_STEPS.forEach((c3) => {
    const d = presence(cracks, c3.at, 2000, 5000, 20);
    assert.ok(d >= 0, `the crack step on ${c3.at}: ${d.toFixed(1)} dB over the rest (2–5 kHz)`);
  });
  // On the finished mix the ear counts them: the K-weighted contrast of each stage (its first 100 ms over the 50 ms before it) climbs
  // stage by stage to the snap.
  const contrast = [...stages, D2.SNAP].map((f) => kLoud(master, f, f + 6) - kLoud(master, f - 3, f));
  for (let k = 1; k < contrast.length; k++) assert.ok(contrast[k] > contrast[k - 1], `K contrast: ${contrast.map((v) => v.toFixed(1)).join(' → ')} LU`);
  // The series is over by the FATAL (7.4): the pushes, the crack steps and the creak ≥ 20 dB under its beeps in 1–6 kHz (the debris is
  // the M3 test's: it flies right, the beeps sit left); the wrap's bwomp (7.4&) ≥ 12 dB over the series and the smash under 200 Hz.
  const fatal = band(only('d2fatal').x, 1000, 6000);
  const f0 = D2.SURF[3];
  const series = band(onlyWhere((k) => ['d2push', 'd2pushclank', 'd2crackstep', 'd2wallcreak'].includes(k)).x, 1000, 6000);
  const overFatal = db(rms(fatal, at(f0), at(f0) + ms(60)) / Math.max(1e-9, rms(series, at(f0), at(f0) + ms(60))));
  assert.ok(overFatal >= 20, `the FATAL ${overFatal.toFixed(1)} dB over the series`);
  const bwomp = band(only('d2bwomp').x, 30, 200);
  const wall = band(onlyWhere((k) => ['d2push', 'd2pushclank', 'd2crackstep', 'd2wallcreak', 'd2wallsmash'].includes(k)).x, 30, 200);
  const overWrap = db(rms(bwomp, at(D2.WRAP), at(D2.WRAP) + ms(150)) / rms(wall, at(D2.WRAP), at(D2.WRAP) + ms(150)));
  assert.ok(overWrap >= 12, `the wrap ${overWrap.toFixed(1)} dB over the series`);
});

// E (2026-10-03: a more Edo sound for the woodblock wave): the woodblock wave sounds Edo — the shamisen, the koto in the in-scale, the
// kabuki stage's hyoshigi and tsuke, the tsuzumi, a shakuhachi breath, the ō-daiko — on the beat and the song's chords (IV → V).
test('E, the woodblock wave is Edo: the koto’s 16ths gone for the shamisen’s 8ths, the koto in the in-scale on A♯ (inside F♯ major), the tsuke’s battari (a pickup a 32nd before each mie), the shakuhachi short and on the mountain’s pulses, every Edo voice inside bars 10–11', () => {
  assert.equal(aloneEvents.filter((e) => e.kind === 'd2kotoarp').length, 0, 'no koto 16ths');
  // The shamisen's 8ths are the picture's: every kick (the fingers tighten) and open hat (the flow lines surge) from the burst to 11.4&.
  const pulse = uniq([...D2.KICKS2, ...D2.OPEN_HATS2]).filter((f) => f >= D2.BURST && f <= D2.DOWNSAMPLE_STEPS[2]);
  assert.deepEqual(E.SHAMISEN.map((x) => x.at), pulse);
  assert.ok(E.SHAMISEN.every((x) => x.notes.every((m) => S.VOICINGS2[S.chordAt2(x.at)].some((v) => (v - m) % 12 === 0))), 'the shamisen plays the chord’s own tones');
  // The miyako-bushi in-scale on A♯ (0 1 5 7 8), all of F♯ major; the koto's sweep and ink run are in it.
  assert.deepEqual(E.IN_SCALE.map((pc) => (pc + 2) % 12).sort((a, b) => a - b), [0, 1, 5, 7, 8]);
  for (const pc of E.IN_SCALE) assert.ok(S.SCALE.includes(pc), `${pc} in F♯ major`);
  for (const m of [...E.HIRAJOSHI, ...E.SWEEP, ...E.INK_RUN]) assert.ok(E.IN_SCALE.includes(m % 12), `${m} in the in-scale`);
  const ink = only('d2infect').x;
  D2.INFECT_ROWS.forEach((f, k) => {
    const want = midiHz(E.INK_RUN[k]);
    const p = acPitch(ink, at(f) + 0.01 * SR, at(f) + 0.07 * SR, 0.8 * want, 1.25 * want);
    assert.ok(near(p, want, 0.015), `the ink on ${f}: ${p.toFixed(1)} Hz, want ${want.toFixed(1)}`);
  });
  // The tsuke's battari: the pickup a 32nd before each mie, the strike on it, ≥ 4 dB louder.
  const pick = onlyWhere((k) => k === 'd2tsukepick').x;
  const strike = only('d2tsuke').x;
  for (const f of PLACES.d2tsuke) {
    const first = firstSound(pick, at(f - 6), at(f));
    assert.ok(first >= at(f - 3) && first <= at(f - 3) + 3, `the pickup on ${f - 3}: ${((first - at(f - 3)) / SR) * 1000} ms`);
    assert.ok(20 * Math.log10(rms(strike, at(f), at(f) + 0.02 * SR) / rms(pick, at(f - 3), at(f - 3) + 0.02 * SR)) >= 4, `the strike on ${f} leads`);
  }
  // The shakuhachi: a phrase from each of the mountain's pulses, silent between them, the second done before the arcade (no held bed).
  const breath = only('d2mountain').x;
  const [m0, m1] = PLACES.d2mountain;
  const end0 = at(m0) + Math.round((E.BREATHS[0].notes.at(-1).t + E.BREATHS[0].notes.at(-1).len + 0.05) * SR);
  // (Silent: ≥ 80 dB under the phrase — the bus's top filters ring on below that.)
  const sung = rms(breath, at(m0), at(m0) + 0.3 * SR);
  assert.ok(rms(breath, end0, at(m1)) < 1e-4 * sung, `silent between its breaths: ${dB(rms(breath, end0, at(m1)) / sung)} dB`);
  assert.ok(rms(breath, at(D2.ARCADE.from), at(D2.ARCADE.from + 96)) < 1e-4 * sung, 'gone by the arcade');
  // Every Edo voice is inside the wave's two bars.
  // (v07, seam 4512: but the ō-daiko's DON carried onto the arcade's downbeat, crushed into its grain: E.ARCADE_DON.)
  for (const kind of ['d2shamisen', 'd2tsuke', 'd2pon', 'd2kan', 'd2odaiko', 'd2ki', 'd2mountain']) {
    for (const f of PLACES[kind]) assert.ok((f >= D2.BURST && f < D2.ARCADE.from) || (kind === 'd2odaiko' && f === E.ARCADE_DON.at), `${kind} on ${f}`);
  }
  // The fix round (the checker, 2026-10-03: the shamisen 14–24 dB, the ink 22–30 dB, the tsuke's crack 11–17 dB, the blocks' hyoshigi
  // 9–10 dB under the rest — written, not heard). The shamisen plays from C♯4 up, off the kick, the taiko and the bass.
  assert.ok(E.HONCHOSHI[0] >= 61 && E.SHAMISEN.every((x) => x.notes.every((m) => m >= 61)), 'the shamisen from C♯4 up');
  // And it is gone by the arcade (12.1; rung on into its 16 kHz sample-and-hold, its buzz rang the delivery's AAC over its ceiling).
  const sham = only('d2shamisen').x;
  const played = rms(sham, at(D2.BURST), at(D2.ARCADE.from));
  assert.ok(rms(sham, at(D2.ARCADE.from), at(D2.ARCADE.from + 48)) < 1e-3 * played, `the shamisen into the arcade: ${dB(rms(sham, at(D2.ARCADE.from), at(D2.ARCADE.from + 48)) / played)} dB`);
  // Each Edo voice holds its own in drop 2's mix (the rest = the whole − it), in its band from its frame: ≥ −6 dB.
  const EDO_PRESENCE = [
    ['the shamisen’s sawari', ['d2shamisen'], E.SHAMISEN.map((x) => x.at), 2500, 4500, 30],
    ['the ink (the in-scale)', ['d2infect'], D2.INFECT_ROWS, 800, 3000, 60],
    ['the koto’s sweep', ['d2gliss'], [D2.BURST - A2.SWEEP_LEAD], 800, 3000, 150],
    ['the tsuke’s crack', ['d2tsuke', 'd2tsukepick'], E.TSUKE, 1500, 7000, 15],
    ['the blocks’ hyoshigi', ['d2block'], D2.BLOCKS, 1000, 6000, 30],
    ['the kan', ['d2kan'], E.KAN, 1000, 4000, 30],
    ['the pon', ['d2pon'], E.PON.map((x) => x.at), 200, 1000, 100],
  ];
  for (const [label, kinds, frames, lo, hi, len] of EDO_PRESENCE) {
    const v = onlyWhere((k) => kinds.includes(k)).x;
    for (const f of frames) {
      const d = presence(v, f, lo, hi, len);
      assert.ok(d >= -6, `${label} on ${f}: ${d.toFixed(1)} dB against the rest (${lo}–${hi} Hz, ${len} ms)`);
    }
    // The tsuke is dry and unclipped: all of it on the post bus.
    if (kinds.includes('d2tsuke')) {
      assert.ok(rms(mid(soloStems.post), at(E.TSUKE[0]) - at(3), at(E.TSUKE[2] + 12)) > 0, 'the tsuke on the post bus');
      for (const [name, bus] of Object.entries(soloStems)) if (name !== 'post' && name !== 'sub') assert.equal(rms(mid(bus), at(D2.BURST), at(D2.ARCADE.from)), 0, `nothing of it on ${name}`);
    }
  }
});

test('drop2 bar 18, the reel: the hook’s first syllable retriggered on 8ths, then 16ths (their onsets: HARD above), a step higher each beat (D♯6 E♯6 F♯6 G♯6)', () => {
  const v = only('d2stutter').x;
  [
    [drop2At(18), 87],
    [drop2At(18, 1), 89],
    [drop2At(18, 2), 90],
    [drop2At(18, 3), 92],
  ].forEach(([f, m]) => {
    const p = acPitch(v, at(f + 1), at(f + 5), 400, 2400);
    assert.ok(near(p, midiHz(m), 0.025), `${f}: ${p.toFixed(1)} Hz, want ${midiHz(m).toFixed(1)}`);
  });
});

test('drop2 19.1–19.2: the scream is gated on every 32nd while its pitch glides G♯6 → A♯6 → B6', () => {
  const v = only('d2scream').x;
  for (let f = D2.SCREAM.from; f < D2.SCREAM.to; f += 3) {
    const open = rms(v, at(f) + 0.008 * SR, at(f) + 0.03 * SR);
    const shut = rms(v, at(f + 3) - 0.009 * SR, at(f + 3) - 0.001 * SR);
    assert.ok(shut < 0.1 * open, `chop ${f}: ${dB(shut)} vs ${dB(open)} dB`);
  }
  // On drop2 19.1, on 19.2, and on the scream's last 32nd.
  const [f0, f1, f2] = [drop2At(19), drop2At(19, 1), D2.SCREAM.to - 3];
  const p0 = acPitch(v, at(f0) + 0.004 * SR, at(f0) + 0.034 * SR, 800, 2400);
  const p1 = acPitch(v, at(f1) + 0.004 * SR, at(f1) + 0.034 * SR, 800, 2400);
  const p2 = acPitch(v, at(f2) + 0.004 * SR, at(f2) + 0.034 * SR, 800, 2400);
  assert.ok(near(p0, midiHz(92), 0.03), `G♯6 on drop2 19.1: ${p0.toFixed(0)}`);
  assert.ok(near(p1, midiHz(94), 0.03), `A♯6 on drop2 19.2: ${p1.toFixed(0)}`);
  assert.ok(near(p2, midiHz(95), 0.03), `B6 at the end: ${p2.toFixed(0)}`);
});

test('drop2 bar 18 → 19.2: the master sweep brightens drop 2’s music beat by beat; from 19.1 a high-pass thins it out', () => {
  const m = sumMid(alone.d2chords, alone.d2music);
  const air = band(m, 5000);
  const share = (f) => rms(air, at(f), at(f + 24)) / rms(m, at(f), at(f + 24));
  // The beats of drop2 18.1–19.2.
  const beats = [drop2At(18), drop2At(18, 1), drop2At(18, 2), drop2At(18, 3), drop2At(19), drop2At(19, 1)];
  for (let k = 1; k < beats.length; k++) assert.ok(share(beats[k]) > share(beats[k - 1]), `brighter on ${beats[k]}: ${share(beats[k - 1]).toFixed(3)} → ${share(beats[k]).toFixed(3)}`);
  assert.ok(share(beats[5]) > 1.6 * share(beats[0]), `much brighter by drop2 19.2: ${share(beats[0]).toFixed(3)} → ${share(beats[5]).toFixed(3)}`);
  // The sub drains away from drop2 19.1, measured 6–12 frames after a kick both times (the same point of its ducking).
  const early = rms(alone.sub, at(D2.SATURATE[0] + 6), at(D2.SATURATE[0] + 12));
  const late = rms(alone.sub, at(D2.SATURATE[3] + 6), at(D2.SATURATE[3] + 12));
  assert.ok(late < 0.25 * early, `the sub by drop2 19.2&: ${dB(early)} → ${dB(late)} dB`);
});

test('the freeze on drop2 19.3: the music stops dead (S5, the reverb restarted) and comes back for the bullet time on 19.4&; the hand-off’s last 16th is digital zero; drop 2 writes nothing after it', () => {
  assert.deepEqual(S.CUTS, [D2.CRASH, D2.BULLET.from, D2.ZERO.from]);
  assert.deepEqual(S.SILENCES, [D2.SILENCE_S5, D2.ZERO].map((w) => ({ from: w.from, to: w.to })));
  assert.equal(D2.SILENCE_S5.from, D2.CRASH);
  assert.equal(D2.SILENCE_S5.to, D2.BULLET.from);
  for (const [a, b] of [[D2.CRASH, D2.BULLET.from], [D2.ZERO.from, D2.ZERO.to]]) {
    for (let f = a; f < b; f++) {
      const level = Math.max(rms(music.L, at(f), at(f + 1)), rms(music.R, at(f), at(f + 1)));
      assert.ok(level < 1e-3, `frame ${f}: the music at ${dB(level)} dB`);
    }
  }
  // The bullet time is music again (the frozen chord, the music box, the heartbeats): heard from its first beat.
  assert.ok(rms(music.L, at(D2.BULLET.from + 12), at(D2.ZERO.from - 6)) > 0.01, `the bullet time is heard: ${dB(rms(music.L, at(D2.BULLET.from + 12), at(D2.ZERO.from - 6)))} dB`);
  for (const [name, bus] of Object.entries(alone)) {
    for (const x of name === 'sub' ? [bus] : [bus.L, bus.R]) {
      // (v07, seam 5376: the post bus holds the music box's ghost for a beat from the outro's downbeat, MUSIC_BOX_GHOST; nothing else.)
      const ghost = name === 'post' ? [at(D2.ZERO.to), at(D2.ZERO.to + S.MUSIC_BOX_GHOST.frames)] : null;
      assert.ok(rms(x, at(D2.ZERO.from), ghost ? ghost[0] : N) < 1e-9, `${name}: ${dB(rms(x, at(D2.ZERO.from), N))} dB from the zero on`);
      if (ghost) assert.ok(rms(x, ghost[1], N) < 1e-9, `${name}: the ghost gone in a beat`);
      if (name !== 'post') assert.ok(rms(x, at(D2.CRASH), at(D2.BULLET.from)) < 1e-9, `${name} is cut on the freeze`);
    }
  }
  // The finished mix too: the hand-off is exactly silent.
  for (let i = at(D2.ZERO.from); i < at(D2.ZERO.to); i++) assert.ok(master.L[i] === 0 && master.R[i] === 0, `digital zero at ${i}`);
  // v08: the zero is bridge B's last 16th (src/score/bridgeB.ts HAND_OFF_ZERO), just before the blue screen.
  assert.deepEqual([D2.ZERO.from, D2.ZERO.to], [HAND_OFF_ZERO.from, HAND_OFF_ZERO.to]);
  assert.ok(rms(mid(alone.post), at(D2.CRASH), at(D2.CRASH + 6)) > 0.03, 'the CRT thunk and the plink are heard on the freeze');
});

// Iteration 2 (the director's ruling 12; sync review 3): the stuck buffer starts a 16th after the freeze, so the drop's plink IS the sound
// of the crash (it was 11–16 dB under the buzz).
test('the stuck buffer: a 16th after the freeze (CRASH + 6 … + 29) it replays the last 3 frames before it 8 times, each quieter and darker, then only the post bus', () => {
  const slice = at(3);
  const start = at(D2.CRASH + S.BUZZ_DELAY);
  assert.equal(S.BUZZ_DELAY, 6);
  for (let i = at(D2.CRASH); i < start; i += 5) assert.ok(Math.abs(master.L[i] - plain.L[i]) < 1e-3, `nothing but the post bus before the buzz (${i})`);
  const src = master.L.slice(at(D2.CRASH) - slice, at(D2.CRASH));
  const loud = [];
  for (let k = 0; k < 8; k++) {
    const a = start + k * slice;
    const d = Float32Array.from({ length: slice }, (_, i) => master.L[a + i] - plain.L[a + i]);
    loud.push(rms(d, 200, slice - 200));
    let c = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 200; i < slice - 200; i++) {
      c += d[i] * src[i];
      e1 += d[i] * d[i];
      e2 += src[i] * src[i];
    }
    if (k < 3) assert.ok(c / Math.sqrt(e1 * e2) > 0.7, `loop ${k} replays the slice: r = ${(c / Math.sqrt(e1 * e2)).toFixed(2)}`);
  }
  assert.ok(loud[0] > 0.02, `the buzz is heard: ${dB(loud[0])} dB`);
  for (let k = 1; k < 8; k++) assert.ok(loud[k] < loud[k - 1], `loop ${k} quieter`);
  // (v07: until the hand-off's own edits of the finished mix — the space collapsing and darkening into the zero, S.DARKEN, S.WIDTH_RAMPS.)
  const handoff = Math.min(S.DARKEN.from, ...S.WIDTH_RAMPS.filter((w) => w.seam === D2.DROP2_END).map((w) => w.keys[0][0]));
  for (let i = start + 8 * slice; i < at(handoff); i += 7) assert.ok(Math.abs(master.L[i] - plain.L[i]) < 1e-3, `only the post bus after the buzz (${i})`);
});

test('E8’s scrub-ahead is a real skip on drop2 6.3: the bed drops out for 40 ms of 6.4’s own audio, reversed, at −6 dB, then a 30 ms gap', () => {
  const len = Math.round(0.04 * SR);
  const gap = Math.round(0.03 * SR);
  const g = 10 ** (-6 / 20);
  const a = at(D2.SCRUB);
  const f = at(D2.FULL_COMBO);
  for (const k of [len / 4, len / 2, (3 * len) / 4].map(Math.round)) {
    assert.ok(Math.abs(master.L[a + k] - g * plain.L[f + len - 1 - k]) < 1e-6, `sample ${k}: the grain alone`);
  }
  assert.ok(rms(master.L, a + len + 0.2 * gap, a + len + 0.8 * gap) < 1e-6, 'then silence');
  assert.ok(rms(plain.L, a + len + 0.2 * gap, a + len + 0.8 * gap) > 0.05, 'where the bed was loud');
  assert.equal(master.L[a - 10], plain.L[a - 10]);
  assert.equal(master.L[a + len + gap + 10], plain.L[a + len + gap + 10]);
  // Heard: the grain against what the bed was there (the review measured it 22.5 dB under the mix in the old blend).
  const grain = rms(master.L, a + 0.1 * len, a + 0.9 * len);
  const bed = rms(plain.L, a + 0.1 * len, a + 0.9 * len);
  assert.ok(grain > 10 ** (-12 / 20) * bed, `the grain ${dB(grain)} dB against the bed's ${dB(bed)} dB`);
});

// Iteration 2 (the director's ruling 12; sync review 3): the egg sounds of E10 were 26 dB (the whistle) and 11–16 dB (the plink) under
// the mix in their own bands — each is raised and the plink gets the crash to itself (the buzz waits a 16th).
const bandDb = (x, a, b, lo, hi) => 20 * Math.log10(Math.max(1e-12, rms(band(x, lo, hi), a, b)));
// Iteration 3 (verify: the whistle was still 12.9 dB under the rest of the mix in its band, masked): the whistle is raised again and the
// bed is ducked under it (a cut gliding with it on the music buses, S.WHISTLE_DUCK), so it sits within 6 dB of everything else there.
test('E10 is heard: the guest’s drop whistles within 6 dB of the rest of the mix in its band, and its plink is the loudest sound of the freeze’s first 16th', () => {
  const masterMid = Float32Array.from(master.L, (v, i) => 0.5 * (v + master.R[i]));
  const whistle = only('d2whistle').x;
  // The whistle as it sits in the finished mix (the master's gain and limiter scale it): project the mix onto it in its band, then
  // compare it with what is left (the rest of the mix).
  const [a, b] = [at(D2.DRIP), at(D2.CRASH)];
  const v = band(whistle, 500, 3000);
  const m = band(masterMid, 500, 3000);
  let vv = 0;
  let mv = 0;
  for (let i = a; i < b; i++) {
    vv += v[i] * v[i];
    mv += m[i] * v[i];
  }
  const g = mv / vv;
  let rr = 0;
  for (let i = a; i < b; i++) rr += (m[i] - g * v[i]) ** 2;
  const w = 10 * Math.log10((g * g * vv) / rr);
  assert.ok(g > 0.5, `the whistle is in the mix (gain ${g.toFixed(2)})`);
  assert.ok(w >= -6, `the whistle ${w.toFixed(1)} dB against the rest of the mix (500–3000 Hz, ${D2.DRIP}–${D2.CRASH})`);
  const plink = only('d2plink').x;
  const p = bandDb(plink, at(D2.CRASH), at(D2.CRASH + S.BUZZ_DELAY), 1000, 8000) - bandDb(masterMid, at(D2.CRASH), at(D2.CRASH + S.BUZZ_DELAY), 1000, 8000);
  assert.ok(p > -3, `the plink ${p.toFixed(1)} dB against the mix (1–8 kHz, ${D2.CRASH}–${D2.CRASH + S.BUZZ_DELAY}): it is the crash's sound`);
});

// --- Loudness and brightness (the music bible §6.3, §4.7; measured on the finished mix) ---------------------------------------------

const DROP1 = [partStart('cosmos'), partEnd('club')];

// The floor is drop 1's + 1.5 LU (the bible's rule). Its absolute twin (≥ −8.6) assumed drop 1 at −10.1 and a pad bed under drop 2; the
// cosmos was restyled to ≈ −10.7 and drop 2's bed removed on 2026-10-02, so only the relative floor is kept.
test('drop 2 is the loudest part: ≥ drop 1 + 1.5 LU, not over −7.5 LUFS; act 2 ≥ act 1 + 0.3 LU; no bar over −7.8, no beat over −6.8', () => {
  const drop1 = lufs(master, ...DROP1);
  const drop2 = lufs(master, D2.DROP2_START, D2.DROP2_END);
  assert.ok(drop2 - drop1 >= 1.5, `drop 2 ${drop2.toFixed(2)} against drop 1’s ${drop1.toFixed(2)}: +${(drop2 - drop1).toFixed(2)} LU`);
  assert.ok(drop2 <= -7.5, `drop 2 ${drop2.toFixed(2)} LUFS`);
  const act1 = lufs(master, drop2At(1), drop2At(9));
  const act2 = lufs(master, drop2At(10), drop2At(18));
  assert.ok(act2 >= act1 + 0.3, `act 2 ${act2.toFixed(2)} against act 1’s ${act1.toFixed(2)}`);
  for (let b = 1; b <= 19; b++) {
    const l = lufs(master, drop2At(b), drop2At(b + 1));
    // A guard band under the cap (music fix R6: the loudest two bars sat 0.001 LU under it, and the next change could tip them).
    assert.ok(l <= -7.82, `drop2 bar ${b}: ${l.toFixed(3)} LUFS`);
  }
  for (let f = D2.DROP2_START; f < D2.CRASH; f += 24) assert.ok(beat(f) <= -6.8, `the beat on ${f}: ${beat(f).toFixed(2)} LUFS`);
});

// The kit's air in act 2 (checker, 2026-10-02): with the pads' air bed gone, ACT2_DRUMS_DB's +3 dB on the hats, the shaker, the tambourine
// and the crashes filled the same band again (6–16 kHz +3 dB over v09 in 10–11, 97 % of it drums) and raised the floor between the hits.
// v09's band per act-2 bar, its mean and its floor (the quietest 10 % of 5 ms windows), measured on drop2-wip-v09's audio (drop2-old.wav).
const AIR_V09 = { 10: [-27.06, -30.2], 11: [-27.48, -30.2], 12: [-26.26, -29.63], 13: [-25.9, -29.59], 14: [-27.96, -31.31], 15: [-27.84, -30.62], 16: [-25.96, -28.64], 17: [-25.91, -29.53] };
test('act 2’s kit air is lifted ACT2_AIR_DB, its body ACT2_DRUMS_DB: 6–16 kHz within +1.5 dB of v09’s on every act-2 bar, the floor between the hits no higher', () => {
  assert.ok(S.ACT2_AIR_DB <= 1 && S.ACT2_AIR_DB < S.ACT2_DRUMS_DB, `the air +${S.ACT2_AIR_DB} dB, the body +${S.ACT2_DRUMS_DB} dB`);
  const x = band(mid(master), 6000, 16000);
  for (const [bar, [mean, floor]] of Object.entries(AIR_V09)) {
    const [a, b] = [at(drop2At(+bar)), at(drop2At(+bar + 1))];
    const m = 20 * Math.log10(rms(x, a, b));
    const w = [];
    for (let s = a; s + 240 <= b; s += 240) w.push(rms(x, s, s + 240));
    w.sort((p, q) => p - q);
    const f = 20 * Math.log10(w[Math.floor(0.1 * w.length)]);
    assert.ok(m <= mean + 1.5, `drop2 bar ${bar}: 6–16 kHz ${m.toFixed(2)} dB against v09’s ${mean}`);
    assert.ok(f <= floor + 0.3, `drop2 bar ${bar}: its floor ${f.toFixed(2)} dB against v09’s ${floor}`);
  }
});

test('the tier-1 hits: 10.1 is the loudest beat of both drops (≥ 1.1 + 0.1, v07; ≥ cosmos 1.1 + 2, ≥ 9.4 + 2.5, ≤ −6.8); 1.1 lands at −9 … −7.9 (v08); the switch the one dip; 16.1 just under 10.1', () => {
  const burst = beat(D2.BURST);
  const pop = beat(D2.DROP2_START);
  // v07 (§3, the wave-start noise): 10.1 is loud by its voices now — no impact, no foam, the kick 0.75, the drive 1.5 dB, the slam 1 dB above
  // 250 Hz — and the plan's floor is 1.1 + 0.0 LU (its target + 0.3; the slam's 3 → 1 dB alone took 1.5 LU): a 0.1 LU guard over it.
  assert.ok(burst >= pop + 0.1, `10.1 ${burst.toFixed(2)} against 1.1’s ${pop.toFixed(2)}`);
  assert.ok(burst >= beat(partStart('cosmos')) + 2, `10.1 against cosmos 1.1’s ${beat(partStart('cosmos')).toFixed(2)}`);
  assert.ok(burst >= beat(drop2At(9, 3)) + 2.5, `10.1 against 9.4’s ${beat(drop2At(9, 3)).toFixed(2)}`);
  assert.ok(burst <= -6.8, `10.1 ${burst.toFixed(2)}: loud, not crushed`);
  // v08 (S.LANDING; the v07 review: the volume and the white noise spiked after the slingshot): 1.1 was −7.4, the film's second loudest beat, out of the digital zero.
  assert.ok(pop >= -9 && pop <= -7.9, `1.1 ${pop.toFixed(2)} LUFS`);
  for (const [a, b] of [DROP1, [D2.DROP2_START, D2.CRASH]]) {
    for (let f = a; f + 24 <= b; f += 24) if (f !== D2.BURST) assert.ok(beat(f) < burst, `the beat on ${f}: ${beat(f).toFixed(2)} against 10.1’s ${burst.toFixed(2)}`);
  }
  for (let k = 0; k < 4; k++) assert.ok(beat(drop2At(9, k)) <= -10, `9.${k + 1}: ${beat(drop2At(9, k)).toFixed(2)} LUFS`);
  const light = beat(drop2At(16));
  assert.ok(light < burst && light > burst - 1.5, `16.1 ${light.toFixed(2)} just under 10.1`);
});

// Brightness is measured in the audible band (to 16 kHz): drop 2's top is cut at 16.5 and 18 kHz for the delivery (S.TOP: the AAC rang over the
// ceiling on the clip's splatter up there), and the bible's full-band measure (to 24 kHz) is mostly that inaudible splatter: it read
// 1.00 × with it and 0.80 × without, while the band a listener hears did not move (1.06 ×).
test('brighter where it counts: the bible’s centroid in the audible band (to 16 kHz) over drop 2’s bars (the switch aside, 19 to the crash) ≥ 1.03 × drop 1’s; the carried bars ≥ 1.0 ×; no bar under 0.95 ×', () => {
  const ref = bibleCentroid(master, ...DROP1);
  const ratios = [];
  for (let b = 1; b <= 19; b++) {
    if (b === 9) continue;
    const r = bibleCentroid(master, drop2At(b), b === 19 ? D2.CRASH : drop2At(b + 1)) / ref;
    ratios.push(r);
    assert.ok(r >= 0.95, `drop2 bar ${b}: ${r.toFixed(3)} × drop 1’s`);
    if ([1, 2, 3, 4, 6, 7, 18, 19].includes(b)) assert.ok(r >= 1, `drop2 bar ${b} (carried): ${r.toFixed(3)} × drop 1’s`);
  }
  const mean = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  assert.ok(mean >= 1.03, `the mean: ${mean.toFixed(3)} × drop 1’s ${ref.toFixed(0)} Hz`);
  assert.equal(S.TOP.hz, 18000, 'the top is cut at 18 kHz after the clip');
  assert.deepEqual(S.TOP.pre, { hz: 16500, poles: 8 }, 'and at 16.5 kHz before it');
});

test('the group clip bends only the transients: over 1 dB on ≤ 4 % of drop 2’s samples, over 3 dB on ≤ 0.5 %; the drive ≤ 3 dB (the bible’s bus guard)', () => {
  const c = aloneGroup.clip;
  let over1 = 0;
  let over3 = 0;
  for (let i = 0; i < c.length; i++) {
    const db = -20 * Math.log10(c[i]);
    if (db > 1) over1++;
    if (db > 3) over3++;
  }
  assert.ok(over1 <= 0.04 * c.length, `over 1 dB: ${((100 * over1) / c.length).toFixed(2)} %`);
  assert.ok(over3 <= 0.005 * c.length, `over 3 dB: ${((100 * over3) / c.length).toFixed(3)} %`);
  for (const k of S.DRIVE) assert.ok(k.db <= 3, `the drive at ${k.at}: ${k.db} dB`);
  assert.ok(S.CLIP.ceiling <= 1 && S.CLIP.kneeDb > 0);
});

// The seam (sheet §6.1; the bible §4.7): drop2 1.1 comes out of the interlude's fake drop — its release (break 8.3), then 30 frames of
// dead air (S4, the break's) — so the first pass's "+3 LU over the 400 ms before it" is met by construction and tests nothing. What is
// measured instead: the dead air stays dead, and the drop's first beat outweighs the release before it, the fake drop's apex (8.2) and
// drop 1's own downbeat. v08 (S.LANDING, S.BLOOM; the v07 review: after the slingshot the volume and the
// white noise blast): v07's first beat was −7.4 LUFS, the film's second loudest, ≥ cosmos 1.1 + 1.95 LU, its first 100 ms a broadband
// burst (spectral flatness 0.29) with its band over 6 kHz 8.4 dB over the slingshot's. Now it lands by its weight and its notes: no
// louder than −7.9, still over cosmos 1.1 and over the fake drop's apex, as heavy in the lows, tonal, its air arriving over two beats.
test('drop2 1.1 comes out of the fake drop’s dead air: nothing of drop 2 before it; its first beat lands by weight, not noise (v08) — over cosmos 1.1, the fake drop’s apex and the release, heavier in the lows, tonal, and its air blooms in', () => {
  for (let i = at(BR.SILENCE.from) + 72; i < at(D2.DROP2_START); i++) assert.ok(master.L[i] === 0 && master.R[i] === 0, `the dead air is digital zero (${i})`);
  const first = beat(D2.DROP2_START);
  assert.ok(first >= -9 && first <= -7.9, `1.1: ${first.toFixed(2)} LUFS`);
  assert.ok(first >= beat(partStart('cosmos')) + 0.5, `1.1 ${first.toFixed(2)} against cosmos 1.1’s ${beat(partStart('cosmos')).toFixed(2)}`);
  assert.ok(first >= beat(partFrame('break', 8, 1)) + 2, `1.1 ${first.toFixed(2)} against the fake drop’s 8.2 ${beat(partFrame('break', 8, 1)).toFixed(2)}`);
  assert.ok(first >= beat(BR.RELEASE) + 8, `1.1 ${first.toFixed(2)} against the release’s ${beat(BR.RELEASE).toFixed(2)}`);
  const low = (f) => {
    const a = at(f - 56);
    const x = band(Float32Array.from({ length: at(f + 34) - a }, (_, i) => 0.5 * (master.L[a + i] + master.R[a + i])), 30, 150);
    return rms(x, at(f) - a, at(f + 24) - a);
  };
  assert.ok(low(D2.DROP2_START) >= 1.8 * low(BR.RELEASE), `weight: ${dB(low(D2.DROP2_START))} dB against the release’s ${dB(low(BR.RELEASE))} dB`);
  assert.ok(low(D2.DROP2_START) >= low(partStart('cosmos')), `weight: ${dB(low(D2.DROP2_START))} dB against drop 1’s downbeat’s ${dB(low(partStart('cosmos')))} dB`);
  // Tonal, not noise: the first 4096 samples' spectral flatness (200 Hz – 16 kHz, the mid) under 0.12 (v07: 0.29), and the first beat's
  // band over 6 kHz within 3 dB of the slingshot bar's (break 7; v07: 8.4 dB over it).
  const a = at(D2.DROP2_START);
  const mid = Float32Array.from({ length: 4096 }, (_, i) => 0.5 * (master.L[a + i] + master.R[a + i]));
  let [lg, ar, nb] = [0, 0, 0];
  spectra(mid, 0, 4096, (k, mag, size) => {
    const f = (k * SR) / size;
    if (f < 200 || f > 16000) return;
    lg += Math.log(mag * mag + 1e-30);
    ar += mag * mag;
    nb++;
  });
  const flat = Math.exp(lg / nb) / (ar / nb);
  assert.ok(flat <= 0.12, `the first 85 ms: spectral flatness ${flat.toFixed(3)}`);
  const mixMid = Float32Array.from(master.L, (v, i) => 0.5 * (v + master.R[i]));
  const hi = (f0, f1) => bandRms(mixMid, at(f0), at(f1), 6000);
  const [landing, sling] = [hi(D2.DROP2_START, D2.DROP2_START + 24), hi(partFrame('break', 7), partFrame('break', 8))];
  assert.ok(dB(landing) <= dB(sling) + 3, `over 6 kHz: 1.1 ${dB(landing)} dB against the slingshot bar's ${dB(sling)} dB`);
  // The bloom: the first beat is the darkest of the bar's four (its air arrives over two beats), and in sones (perceived.mjs) it is
  // over the fake drop's apex but not over the plateau it opens into (1.3–1.4).
  const cen = [0, 1, 2, 3].map((k) => centroid(master, D2.DROP2_START + 24 * k, D2.DROP2_START + 24 * (k + 1)));
  assert.ok(cen[0] < Math.min(...cen.slice(1)) && cen[0] >= 0.85 * centroid(master, partStart('cosmos'), partStart('cosmos') + 24), `centroids ${cen.map((c) => c.toFixed(0)).join(' ')} Hz`);
  const sones = groupOf(sixteenthsOf(master.L, master.R, SR, D2.DROP2_START, D2.DROP2_START + 96, { small: false }), 4).map((b) => b.sones);
  const [apex] = groupOf(sixteenthsOf(master.L, master.R, SR, partFrame('break', 8, 1), BR.RELEASE, { small: false }), 4);
  assert.ok(sones[0] >= 1.05 * apex.sones, `1.1 ${sones[0].toFixed(1)} sones against the fake drop's 8.2 ${apex.sones.toFixed(1)}`);
  assert.ok(sones[0] <= Math.min(sones[2], sones[3]), `the landing blooms: ${sones.map((v) => v.toFixed(1)).join(' → ')} sones`);
  const b = at(D2.DROP2_START + 24);
  assert.ok(truePeakDb(master.L.slice(a, b), master.R.slice(a, b)) <= CEILING_DB + 0.01, 'on the ceiling, not over it');
});

// v08 (S.LANDING): 1.1 has no slam any more (SLAM.db 0: its +2.35 dB soft clip was part of the landing's blast) — it blooms (S.BLOOM).
test('the slams: 10.1 is driven into the ceiling and eases back a beat later, nothing before it changes; 1.1 is not slammed (v08) but blooms: its band over 4 kHz BLOOM.db down on 1.1 and the mix’s own by 1.3', () => {
  assert.deepEqual({ ...S.SLAM, db: 0 }, { from: D2.DROP2_START, to: D2.BLADES[1], out: D2.BLADES[1] + 24, db: 0 });
  assert.deepEqual({ ...S.SLAM_BURST, db: 0 }, { from: D2.BURST, to: D2.BURST + 24, out: D2.BURST + 48, db: 0, hz: S.SLAM_BURST.hz });
  // v07 (§3): 10.1's slam 3 → 1 dB, and only above SLAM_BURST.hz (its curve, ridden by the kick and the ō-daiko, was one of the wave-start's
  // noises); before it, finish()'s width and tone ramps into 10.1 (WIDTH_RAMPS, TONE_RAMPS) are the other edits.
  // (The ramps' spans, each with the master limiter's release after it — 30 frames — chained back from the slam: the window before them.)
  const edits = [...S.WIDTH_RAMPS, ...S.TONE_RAMPS.ramps].map((w) => [w.keys[0][0], w.keys[w.keys.length - 1][0] + 30]);
  const widthFrom = (f) => {
    let a = f;
    for (let moved = true; moved; ) {
      moved = false;
      for (const [x, y] of edits) {
        if (x < a && y > a - 24) {
          a = x;
          moved = true;
        }
      }
    }
    return a;
  };
  assert.equal(S.SLAM.db, 0, 'no slam on 1.1');
  for (const s of [S.SLAM_BURST]) {
    const burst = s === S.SLAM_BURST;
    assert.ok(s.db >= 1 && s.db <= 1.5 && s.hz >= 150, `${s.from}: ${s.db} dB`);
    for (let i = at(widthFrom(s.from)) - at(24); i < at(widthFrom(s.from)); i += 5) assert.equal(master.L[i], plain.L[i], `sample ${i} before ${s.from}`);
    const gain = kLoud(master, s.from, s.to) - kLoud(plain, s.from, s.to);
    assert.ok(gain >= (burst ? 0.15 : 0.6), `the first beat on ${s.from}: +${gain.toFixed(2)} LU over the unslammed mix`);
    const after = Math.abs(kLoud(master, s.out + 6, s.out + 24) - kLoud(plain, s.out + 6, s.out + 24));
    assert.ok(after < 0.05, `back to the mix by ${s.out + 6}: ${after.toFixed(3)} LU apart`);
  }
  // The bloom: finish()'s zero-phase shelf, mixed in by a weight easing 1 → 0 over two beats (the plain mix has no finish()).
  assert.deepEqual(S.BLOOM, { from: D2.DROP2_START, to: D2.DROP2_START + 48, hz: 4000, db: S.BLOOM.db });
  assert.ok(S.BLOOM.db <= -2 && S.BLOOM.db >= -6, `${S.BLOOM.db} dB`);
  const top = (m, f0, f1) => {
    const pre = at(12);
    const x = Float32Array.from({ length: pre + at(f1) - at(f0) }, (_, i) => 0.5 * (m.L[at(f0) - pre + i] + m.R[at(f0) - pre + i]));
    return bandRms(x, pre, x.length, 8000);
  };
  const opened = (f0, f1) => 20 * Math.log10(top(master, f0, f1) / top(plain, f0, f1));
  assert.ok(Math.abs(opened(S.BLOOM.from, S.BLOOM.from + 3) - S.BLOOM.db) < 0.7, `over 8 kHz on 1.1: ${opened(S.BLOOM.from, S.BLOOM.from + 3).toFixed(2)} dB against the unbloomed mix`);
  assert.ok(Math.abs(opened(S.BLOOM.to, S.BLOOM.to + 12)) < 0.3, `the mix’s own by 1.3: ${opened(S.BLOOM.to, S.BLOOM.to + 12).toFixed(2)} dB`);
});

// E's side effect (2026-10-03): with the wave's Edo plucks on 10.1&, the delivery's AAC rang +0.8 dBTP there, on the splatter the 10.1 slam's
// soft clip throws over 16.5 kHz (finish() runs after renderDrop2's TOP). The slam now ends in its own low-pass (SLAM_TOP).
test('10.1’s slam ends in a low-pass (SLAM_TOP): over its beat and its ease the finished mix holds no more over 17 kHz than the unslammed mix', () => {
  const hf = (x, a, b) => {
    const fs = [17000, 17000, 17000, 17000].map((c) => Biquad.highpass(SR, c));
    let e = 0;
    for (let i = a - 4800; i < b; i++) {
      const y = fs.reduce((v, st) => st.process(v), x[i]);
      if (i >= a) e += y * y;
    }
    return e;
  };
  const [a, b] = [at(S.SLAM_BURST.from), at(S.SLAM_BURST.out)];
  const over = 10 * Math.log10((hf(master.L, a, b) + hf(master.R, a, b)) / (hf(plain.L, a, b) + hf(plain.R, a, b)));
  assert.ok(over <= 0, `the slam's top: ${over.toFixed(1)} dB over the unslammed mix's above 17 kHz`);
  assert.ok(S.SLAM_TOP.hz <= 17000 && S.SLAM_TOP.poles >= 4, 'a steep cut at the top of the audible band');
});

test('drop 2 stays under the master’s ceiling (after its edits of the finished mix), mono in the lows, no DC', () => {
  const a = at(D2.DROP2_START);
  const b = at(D2.DROP2_END);
  const l = master.L.slice(a, b);
  const r = master.R.slice(a, b);
  assert.ok(truePeakDb(l, r) <= CEILING_DB + 0.01, `${truePeakDb(l, r).toFixed(2)} dBTP`);
  const c = at(D2.CRASH);
  assert.ok(lowCorrelation(master.L.slice(a, c), master.R.slice(a, c), SR) >= 0.99, 'mono lows (the bible: lowCorrelation ≥ 0.99)');
  const mean = l.reduce((s, v) => s + v, 0) / l.length;
  assert.ok(Math.abs(mean) < 1e-3, 'no DC');
});

// Width (the bible §6.3 lever 6; music fixes R1-T15, R7): an M/S rotation of the chord voices and the music bus over act 2 (WIDTH), each
// bar's power kept, so the image widens and the loudness does not move; folded to mono (L + R) / 2 drop 2 may lose at most 1 LU more than
// drop 1 does. The bible's window (correlation 0.70–0.78, act 2 the widest) was the pad wall's width: three spread supersaws on every
// chord. With the wall gone (2026-10-02) the section measures ≈ 0.90 — near the restyled cosmos (≈ 0.92) — and the width is the
// short voices' own placement (the stabs spread, the arps ±0.65, the koto ±0.6, the glass across the frame); the deferred spatial pass
// (a virtual stage for the whole film) is where more of it belongs. Guarded here: no narrower than that.
test('wide for size, not for LUFS: drop 2’s correlation ≤ 0.93 (to the freeze), no narrower than the cosmos + 0.03; each widened bar’s mid gives back what its side gains; the mono fold-down loses ≤ 1 LU more than drop 1’s', () => {
  const corr = (f0, f1) => correlation(master.L.slice(at(f0), at(f1)), master.R.slice(at(f0), at(f1)));
  const whole = corr(D2.DROP2_START, D2.CRASH);
  assert.ok(whole <= 0.93, `drop 2: ${whole.toFixed(3)}`);
  assert.ok(whole <= corr(partStart('cosmos'), partEnd('cosmos')) + 0.03, `drop 2 ${whole.toFixed(3)} against the cosmos’s ${corr(partStart('cosmos'), partEnd('cosmos')).toFixed(3)}`);
  assert.deepEqual([S.WIDTH.from, S.WIDTH.to], [10, 18], 'act 2');
  assert.ok(S.WIDTH.db > 0 && S.WIDTH.db <= 3, `the side +${S.WIDTH.db} dB`);
  assert.equal(aloneWidth.length, S.WIDTH.buses.length);
  // The chord voices (panned short notes) give back some of their mid's top in every bar; the music bus as much as it has side to gain
  // (none in the pictograms' bar, where it is mono).
  aloneWidth.forEach((mid, k) => {
    assert.equal(mid.length, S.WIDTH.to - S.WIDTH.from);
    for (const g of mid) assert.ok(g <= 0 && g > -3, `${S.WIDTH.buses[k]}: the mid's high band ${g.toFixed(2)} dB`);
    if (S.WIDTH.buses[k] === 'd2chords') for (const g of mid) assert.ok(g < -0.1, `the chord voices' mid gives back: ${g.toFixed(2)} dB`);
  });
  const monoLoss = (f0, f1) => {
    const m = Float32Array.from(master.L.slice(at(f0), at(f1)), (v, i) => 0.5 * (v + master.R[at(f0) + i]));
    return lufs(master, f0, f1) - integratedLoudness(m, m, SR);
  };
  const [two, one] = [monoLoss(D2.DROP2_START, D2.DROP2_END), monoLoss(...DROP1)];
  assert.ok(two - one <= 1, `folded to mono drop 2 loses ${two.toFixed(2)} LU, drop 1 ${one.toFixed(2)}`);
});

// The delivery (the bible §6.4): drop 2 is the densest, brightest and most clipped part, and the MP4's AAC (encode.mjs: the native coder
// at 320 kb/s) lifts its peaks over the −2.0 dBTP master. Measured as the KX-Drop2 cut carries it (its first sample on drop2 1.1) and as the
// film does (from the break on: drop 2 starts on AAC block 2700 in both). The coder is chaotic bar to bar (any change anywhere moves a
// bar's peak by ±0.15 dB), so this guards a margin: every bar ≤ −1.55 dBTP against the −1.5 limit. Encoded as the delivery is (the
// whole-film mix pass, 2026-10-03: scripts/lib/encode.mjs DELIVERY_AUDIO, the film turned down DELIVERY_TRIM_DB before the coder; with
// no trim bar 5 read −1.491 in the film's slice, and the club −1.37 in the whole film).
test('the delivery: through the MP4’s AAC (320 kb/s, after the delivery’s trim) every bar of drop 2 stays ≤ −1.55 dBTP, as the KX-Drop2 cut and in the film', () => {
  assert.ok(DELIVERY_TRIM_DB < 0 && DELIVERY_TRIM_DB >= -1, `the delivery's trim ${DELIVERY_TRIM_DB} dB: a small cut, one gain`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-drop2-aac-'));
  try {
    for (const [name, from] of [['cut', D2.DROP2_START], ['film', partStart('break')]]) {
      const [a, b] = [at(from), at(D2.DROP2_END)];
      const file = (suffix) => path.join(dir, `${name}${suffix}`);
      writeWav(file('.wav'), master.L.slice(a, b), master.R.slice(a, b), SR, { silent: digitalZeroIn(a, b - a) });
      execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-i', file('.wav'), ...DELIVERY_AUDIO, file('.mp4')]);
      execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-i', file('.mp4'), '-c:a', 'pcm_s16le', '-ar', '48000', file('-decoded.wav')]);
      const [l, r] = readWav(file('-decoded.wav')).channels;
      for (let k = 1; k <= 19; k++) {
        const [x, y] = [at(drop2At(k)) - a, at(drop2At(k + 1)) - a];
        const tp = truePeakDb(l.slice(x, y), r.slice(x, y));
        assert.ok(tp <= -1.55, `${name}: drop2 bar ${k} ${tp.toFixed(3)} dBTP`);
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- The new bars, measured -------------------------------------------------------------------------------------------------------

test('Defender is dry and pitched on C, the intruder against F♯ (the bible’s M8, M9): his bus barely reaches the plate; probes and tinks bend to C♯ when caught; his figure D C♮ B A♯', () => {
  assert.ok(S.SENDS.d2dry <= 0.05, `the dry bus sends ${S.SENDS.d2dry}`);
  const probes = only('d2probe').x;
  for (const f of D2.PROBES) {
    const p = acPitch(probes, at(f) + 0.01 * SR, at(f) + 0.07 * SR, 200, 2000);
    assert.ok(near(p, midiHz(72), 0.01), `probe ${f}: ${p.toFixed(1)} Hz, want C5`);
    const q = acPitch(probes, at(f) + 0.135 * SR, at(f) + 0.148 * SR, 200, 2000);
    assert.ok(q > midiHz(72.5), `probe ${f} bends up to C♯5: ${q.toFixed(1)} Hz`);
  }
  const figure = only('d2figure').x;
  for (const x of D2.DEFENDER_FIGURE) {
    const p = acPitch(figure, at(x.at + 3), at(x.at + 18), 80, 400);
    assert.ok(near(p, midiHz(x.midi), 0.015), `the figure on ${x.at}: ${p.toFixed(1)} Hz, want ${midiHz(x.midi).toFixed(1)}`);
  }
  assert.deepEqual(D2.DEFENDER_FIGURE.map((x) => x.midi % 12), [2, 0, 11, 10], 'D C♮ B A♯');
});

test('SIGNATURE MATCH reads the ten bytes of • ω • one a frame, each a dry square on Defender’s reading of it (its high nibble the octave of C)', () => {
  assert.deepEqual(SIGNATURE_BYTES, [0xe2, 0x80, 0xa2, 0x20, 0xcf, 0x89, 0x20, 0xe2, 0x80, 0xa2]);
  assert.deepEqual(SIGNATURE_BYTES.map((b) => b.toString(16).toUpperCase().padStart(2, '0')), [...D2C.SIGNATURE_BYTES]);
  const x = only('d2bytes').x;
  SIGNATURE_BYTES.forEach((byte, k) => {
    const v = byteVoice(byte);
    assert.equal(v.midi % 12, 0, `byte ${k} on a C`);
    const a = at(D2.SIGNATURE_MATCH.from + k);
    const p = acPitch(x, a + 80, a + 760, 200, 2400);
    assert.ok(near(p, midiHz(v.midi), 0.02), `byte ${k} (${byte.toString(16)}): ${p.toFixed(1)} Hz, want ${midiHz(v.midi).toFixed(1)}`);
  });
  assert.ok(rms(x, at(D2.SIGNATURE_MATCH.from + 10) + 50, at(D2.SIGNATURE_MATCH.from + 12)) < 1e-4, 'done after ten frames');
});

test('the kernel’s hang: from 8.4 the mix muffles (18 kHz → 900 Hz) and stays muffled through the install, letting go on 9.1', () => {
  const x = sumMid(alone.drums, alone.fx, alone.chime, alone.d2chords, alone.d2music);
  const hf = band(x, 3000);
  const share = (a, b) => rms(hf, at(a), at(b)) / rms(x, at(a), at(b));
  const before = share(D2.HANG.from - 24, D2.HANG.from);
  const muffled = share(D2.HANG.to, D2.SWITCH.from);
  assert.ok(muffled < 0.25 * before, `the air under the hang: ${muffled.toFixed(3)} against ${before.toFixed(3)}`);
});

test('the switch is Defender’s half-time bar: the kick on 9.1 and 9.2&, the backbeat on 9.3 gated dead, no pad, the spill’s hats rising', () => {
  const kicks = D2.KICKS2.filter((f) => f >= D2.SWITCH.from && f < D2.SWITCH.to);
  assert.deepEqual(kicks, [D2.SWITCH.from, drop2At(9, 1.5)]);
  const snare = onlyWhere((k, f) => k === 'd2snare' && f === D2.BOX).x;
  // The gate shuts 180 ms in: the 30 ms after it at least 10 dB under the 30 ms before it (the claps' own tails are what is left).
  const g = rms(snare, at(D2.BOX) + 0.15 * SR, at(D2.BOX) + 0.18 * SR);
  const after = rms(snare, at(D2.BOX) + 0.19 * SR, at(D2.BOX) + 0.22 * SR);
  assert.ok(after < 0.32 * g, `the backbeat is gated dead: ${dB(after)} dB after the gate against ${dB(g)} dB before it`);
  const hats = only('d2hat').x;
  const spill = D2.HATS2.filter((f) => f >= D2.SPILL[0] && f < D2.BURST);
  assert.ok(spill.length >= 4, `${spill.length} hats in the spill`);
  const lv = spill.map((f) => rms(hats, at(f), at(f) + 0.01 * SR));
  assert.ok(lv[lv.length - 1] > 1.5 * lv[0], `rising: ${dB(lv[0])} → ${dB(lv[lv.length - 1])} dB`);
});

test('each world brings its hook timbre on the hook’s own pitches: the chip square’s first sixteenth on its note, the march on the NES triangle (D♯ C♯ B A♯)', () => {
  // The chip's 16 kHz sample-and-hold steps every 3 samples, which pulls an autocorrelation onto multiples of 3 samples: the note is read
  // from its spectrum instead — its first sixteenth louder on its own pitch than a semitone either side.
  const chip = only('d2chip').x;
  const dft = (x, a, b, hz) => {
    let re = 0;
    let im = 0;
    for (let i = a; i < b; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a));
      re += w * x[i] * Math.cos((2 * Math.PI * hz * i) / SR);
      im += w * x[i] * Math.sin((2 * Math.PI * hz * i) / SR);
    }
    return Math.hypot(re, im);
  };
  for (const h of D2.HOOK2_ACT2.filter((x) => x.voice === 'chip' && x.len >= 2)) {
    const [a, b] = [at(h.at) + Math.round(0.005 * SR), at(h.at) + Math.round(0.08 * SR)];
    const on = dft(chip, a, b, midiHz(h.midi));
    const off = Math.max(dft(chip, a, b, midiHz(h.midi - 1)), dft(chip, a, b, midiHz(h.midi + 1)));
    assert.ok(on > 3 * off, `chip ${h.at}: ${dB(on)} dB on ${midiHz(h.midi).toFixed(1)} Hz against ${dB(off)} dB a semitone off`);
  }
  const march = only('d2march').x;
  [51, 49].forEach((m, k) => {
    const f = D2.MARCH_NOTES[k];
    const p = acPitch(band(march, 40, 400), at(f) + 0.05 * SR, at(f) + 0.3 * SR, 60, 400);
    assert.ok(near(p, midiHz(m), 0.02), `march ${f}: ${p.toFixed(1)} Hz, want ${midiHz(m).toFixed(1)}`);
  });
  assert.deepEqual([...new Set(D2.HOOK2_ACT2.map((h) => h.voice))], ['koto', 'chip', 'voxHalf', 'brass', 'octaves']);
});

test('the bullet time: the frozen chord fades in from 19.4&, the heartbeats are the only sub (C♯2), the music box sings F♯5 F♯5 A♯5 C♯6 each a little flatter, the crown never rings F♯', () => {
  // The frozen chord's J-cut.
  const freeze = only('d2freeze').x; // its grains are read from a pad rendered for it alone (never heard as a bed)
  const [a, b] = [at(D2.BULLET.from), at(D2.BULLET.from + 2)];
  assert.ok(rms(freeze, a, b) < 0.5 * rms(freeze, at(D2.BULLET.from + 12), at(D2.BULLET.from + 24)), 'it fades in');
  assert.equal(rms(freeze, at(D2.CRASH), a), 0, 'nothing before it');
  // The sub in bar 20 is the heartbeats only.
  const hearts = new Set(D2.HEARTBEATS.flatMap((h) => [h.at, h.dub]));
  for (let f = D2.BULLET.from; f < D2.ZERO.from; f += 3) {
    // (v07, seam 5376: the outro's heartThump, ≈ 25 frames, and 20.3's dub sagging to B1, a little longer.)
    const near1 = [...hearts].some((h) => f >= h && f < h + 30);
    if (!near1) assert.ok(rms(alone.sub, at(f), at(f + 3)) < 1e-6, `the sub is silent on ${f}`);
  }
  const heart = only('d2heart').x;
  const p = acPitch(heart, at(D2.HEARTBEATS[0].at) + 0.02 * SR, at(D2.HEARTBEATS[0].at) + 0.1 * SR, 30, 200);
  assert.ok(near(p, midiHz(37), 0.06), `the lub on C♯2: ${p.toFixed(1)} Hz`);
  // The music box.
  assert.equal(MUSIC_BOX_ON, true);
  // Each tine's pitch: the peak of its spectrum within half a semitone of its note, 100–350 ms in (the last tine still rings under it).
  const box = only('d2musicbox').x;
  const peakNear = (a, b, m) => {
    let best = 0;
    let where = 0;
    for (let c = -50; c <= 50; c += 0.5) {
      const hz = midiHz(m + c / 100);
      let re = 0;
      let im = 0;
      for (let i = a; i < b; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a));
        re += w * box[i] * Math.cos((2 * Math.PI * hz * i) / SR);
        im += w * box[i] * Math.sin((2 * Math.PI * hz * i) / SR);
      }
      if (Math.hypot(re, im) > best) {
        best = Math.hypot(re, im);
        where = c;
      }
    }
    return where;
  };
  const cents = D2.MUSIC_BOX.map((x) => peakNear(at(x.at) + Math.round(0.1 * SR), at(x.at) + Math.round(0.35 * SR), x.midi));
  // v08: the last tine (20.4) sags with the tape stop (TAPE_SAG over its span): measured over 100–350 ms, its mean share of the sag.
  const sagShare = (0.1 + 0.35) / 2 / ((TAPE_STOP.to - TAPE_STOP.from) / 60);
  const want = (k) => MUSIC_BOX_FLAT[k] + (k === D2.MUSIC_BOX.length - 1 ? TAPE_SAG.cents * Math.min(1, sagShare) : 0);
  D2.MUSIC_BOX.forEach((x, k) => assert.ok(Math.abs(cents[k] - want(k)) <= (k === D2.MUSIC_BOX.length - 1 ? 6 : 3), `music box ${x.at}: ${cents[k]} cents off its note, want ${want(k).toFixed(1)}`));
  const pitches = cents.map((c, k) => midiHz(D2.MUSIC_BOX[k].midi + c / 100));
  assert.ok(pitches[1] < pitches[0], 'the spring runs down: the repeated F♯ is flatter');
  assert.deepEqual(D2.MUSIC_BOX.map((x) => x.midi), [78, 78, 82, 85]);
  // The crown: C♯ E♯ G♯ B D♯, never the tonic.
  const crown = only('d2crown').x;
  const pc = chroma(crown, at(D2.CROWN_TINGS[0]), at(D2.CROWN_TINGS[D2.CROWN_TINGS.length - 1] + 18), 1000, 12000);
  const total = pc.reduce((s, v) => s + v, 0);
  assert.ok(pc[6] < 0.03 * total, `F♯ in the crown: ${((100 * pc[6]) / total).toFixed(1)} %`);
  assert.ok(CROWN_NOTES.every((m) => m % 12 !== 6), 'no F♯ written');
});
