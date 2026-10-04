// The true-peak meter and the limiter against independent meters (iteration 3, ruling 16). The master read −1.51 dBTP on the
// project's old meter (4× oversampling, 12-tap Hann) but −1.08 on an 8× check and −1.26 on ffmpeg: that meter missed what the mix
// carries between 20 kHz and Nyquist (hats, noise, spray), and how a meter rebuilds that band moves the peak by a few tenths of a dB
// either way. So the meter is pinned to tones it must read exactly and to bright material it must read no lower than any of a family
// of independent meters (tests/lib/truePeak.mjs: 8× windowed sincs of 32–128 taps, two cut below Nyquist), and the limiter to bright
// material that all of them, and ffmpeg's own 192 kHz resampler (what its ebur128 peak=true uses), read at or under the ceiling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CEILING_DB, limit } from '../scripts/audio/limiter.mjs';
import { truePeakDb, truePeakEnvelope } from '../scripts/audio/meter.mjs';
import { writeWav } from '../scripts/audio/wav.mjs';
import { INDEPENDENT, ffmpegTruePeakDb, independentDb } from './lib/truePeak.mjs';

const SR = 48000;
const dB = (v) => 20 * Math.log10(v);

/** A seeded uniform random in [0, 1). */
const random = (seed) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

/**
 * Bright material like the master's loud passages: a bass tone, white noise and white noise tilted up towards Nyquist (its first
 * difference, as hats and spray are), with the band from 22 kHz to Nyquist about 20 dB under the whole, as in the master, and a few
 * one-sample clicks; the two channels differ. Its sample peak is `peak`.
 */
function bright(seconds, seed, peak = 1.4) {
  const n = Math.round(seconds * SR);
  const r = random(seed);
  const ch = () => {
    const x = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const w = r() * 2 - 1;
      x[i] = 0.55 * Math.sin((2 * Math.PI * 110 * i) / SR + seed) + 0.1 * Math.sin((2 * Math.PI * 1530 * i) / SR) + 0.06 * (r() * 2 - 1) + 0.08 * (w - prev);
      prev = w;
    }
    for (let k = 0; k < 6; k++) x[Math.floor(r() * n)] += (r() < 0.5 ? -1 : 1) * 0.2;
    let m = 0;
    for (const v of x) m = Math.max(m, Math.abs(v));
    for (let i = 0; i < n; i++) x[i] *= peak / m;
    return x;
  };
  return { L: ch(), R: ch() };
}

/** The true peak of a 0.5-amplitude tone at `f`, read on its middle (its abrupt ends ring, as band-limited edges do). */
const tone = (f, k) => {
  const x = Float32Array.from({ length: 4800 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / SR + (k * Math.PI) / 12 + 0.05));
  return dB(truePeakEnvelope(x).subarray(1200, 3600).reduce((m, v) => Math.max(m, v), 0));
};

test('tones from 1 to 20 kHz read their peak to 0.02 dB at any phase, including peaks between samples', () => {
  for (const f of [1000, 5000, 10000, 15000, 18000, 19000, 20000]) {
    for (let k = 0; k < 12; k++) {
      const err = tone(f, k) - dB(0.5);
      assert.ok(Math.abs(err) <= 0.02, `${f} Hz, phase ${k}: ${err.toFixed(3)} dB`);
    }
  }
});

test('a tone between 20 and 22 kHz is not read low by more than 0.05 dB (the old meter lost 0.2 dB at 20 kHz)', () => {
  for (const f of [21000, 22000]) {
    for (let k = 0; k < 12; k++) {
      const err = tone(f, k) - dB(0.5);
      assert.ok(err >= -0.05 && err <= 0.02, `${f} Hz, phase ${k}: ${err.toFixed(3)} dB`);
    }
  }
});

test('the envelope holds every sample and is the true peak at its maximum; `above` keeps it exact over that level', () => {
  const { L } = bright(0.1, 3, 0.9);
  const env = truePeakEnvelope(L);
  let m = 0;
  for (let i = 0; i < L.length; i++) {
    assert.ok(env[i] >= Math.abs(L[i]), `sample ${i}`);
    m = Math.max(m, env[i]);
  }
  assert.ok(Math.abs(dB(m) - truePeakDb(L, L)) < 1e-4, `${dB(m)} against ${truePeakDb(L, L)}`);
  const level = 0.5;
  const part = truePeakEnvelope(L, { above: level });
  for (let i = 0; i < L.length; i++) {
    if (env[i] > level) assert.equal(part[i], env[i], `sample ${i} over the level`);
    else assert.ok(part[i] <= level + 1e-6, `sample ${i} under the level`);
  }
});

test('on bright material the meter reads no lower than the independent meters (within 0.03 dB; the old one read up to 0.5 dB under)', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const { L, R } = bright(0.25, seed, 0.9);
    const own = truePeakDb(L, R);
    for (const [name, m] of Object.entries(INDEPENDENT)) {
      const other = independentDb([L, R], m);
      assert.ok(own >= other - 0.03, `seed ${seed}, ${name}: ours ${own.toFixed(3)}, theirs ${other.toFixed(3)}`);
    }
  }
});

test('the limiter holds bright material under its ceiling on every independent meter, as a 16-bit WAV through ffmpeg too', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-tp-'));
  try {
    for (const seed of [11, 12]) {
      const { L, R } = bright(0.5, seed);
      limit(L, R, SR);
      for (const [name, m] of Object.entries(INDEPENDENT)) {
        const tp = independentDb([L, R], m);
        assert.ok(tp <= CEILING_DB, `seed ${seed}, ${name}: ${tp.toFixed(3)} dBTP`);
      }
      const file = path.join(dir, `b${seed}.wav`);
      writeWav(file, L, R, SR);
      const ff = ffmpegTruePeakDb(file);
      assert.ok(ff <= CEILING_DB, `seed ${seed}, ffmpeg at 192 kHz: ${ff.toFixed(3)} dBTP`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the limiter leaves material already under its ceiling untouched', () => {
  const { L, R } = bright(0.25, 21, 0.4);
  const l = L.slice();
  const r = R.slice();
  limit(L, R, SR);
  assert.deepEqual(L, l);
  assert.deepEqual(R, r);
});

test('a second pass over a limited mix (`under`) changes only around what was edited, and holds the edit under the ceiling', () => {
  const { L, R } = bright(1, 31);
  limit(L, R, SR);
  const limited = { L: L.slice(), R: R.slice() };
  // An edit past the limiter, as bgm.mjs's stutter and finish() are: 20 ms at 0.6 s pushed 3 dB up.
  const a = Math.round(0.6 * SR);
  const b = a + Math.round(0.02 * SR);
  for (let i = a; i < b; i++) {
    L[i] *= 10 ** (3 / 20);
    R[i] *= 10 ** (3 / 20);
  }
  limit(L, R, SR, { under: limited });
  const lookahead = Math.round(0.006 * SR);
  for (let i = 0; i < a - lookahead; i++) {
    if (L[i] !== limited.L[i] || R[i] !== limited.R[i]) assert.fail(`sample ${i}, ${((a - i) / SR * 1000).toFixed(1)} ms before the edit, changed`);
  }
  for (const [name, m] of Object.entries(INDEPENDENT)) {
    const tp = independentDb([L, R], m);
    assert.ok(tp <= CEILING_DB, `${name}: ${tp.toFixed(3)} dBTP`);
  }
});
