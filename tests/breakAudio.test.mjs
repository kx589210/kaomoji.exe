// The interlude's music (scripts/audio/sections/break.mjs; voices in scripts/audio/breakVoices.mjs, as built, and breakSfx.mjs, v2), the
// part 'break', 8 bars, against its build sheet (notes/bid2/break-sheet2.md §3, §10), the design's §8 and the music bible §4.6: the
// glass played as the rhythm, drop 1's hook rebuilt note by note as his face is rebuilt, the stutter, the tape-stop hang and the restart,
// four on the floor in break 5, the coaster (HOOK[4] whole, scooped and bent by the ride), the sling's notches, the pivot to C♯9sus4 on 8.1,
// the held breath, the release cut dead on 8.3, the bwomp, and S4's dead air into drop2 1.1. KEEP-FIRST: the as-built buses of break 1–5
// and the sounds of v04's bar 6 that bar 7 keeps are pinned to hashes taken from the v04 master's code (notes/bid2/break-music).
// Every event is taken from src/score/break.ts and measured in the rendered stems, not only in the event list; every other frame is
// written in the break's own bars (brk(bar, beat), 0-based beats as partFrame) or from a score name.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { DIGITAL_ZERO as BGM_DIGITAL_ZERO, digitalZeroIn, mixdown, renderStems } from '../scripts/audio/bgm.mjs';
import { boing, bonk, bwomp, chain, creak, crtTick, crunch, fwoom, hum, lift, links, reverseNoise, rewind, rip, roar, shimmer, skid, sparks, thud, thwang, tick, uiPop } from '../scripts/audio/breakSfx.mjs';
import { chip, chirp, pad, plip, sing, stutterSlices, sweepHighpass, tapeStop, tink } from '../scripts/audio/breakVoices.mjs';
import { Biquad } from '../scripts/audio/filters.mjs';
import { integratedLoudness, lowCorrelation, truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { group as groupOf, sixteenths as sixteenthsOf } from '../scripts/audio/perceived.mjs';
import { VOWELS } from '../scripts/audio/vox.mjs';
import { ARC_RIDE, BREAK_MUSIC, CUTS, DIGITAL_ZERO, EGG_DUCKS, EGG_RAISE_DB, HOOK6, RISER, RISER_V08, SENDS, SILENCES, V04_BUSES, V2_BUSES, arcRide, arcRideDb, hookNotes, renderBreak, riser, trackSpeed, trackValue } from '../scripts/audio/sections/break.mjs';
import { writeWav } from '../scripts/audio/wav.mjs';
import { HOOK as DROP1_HOOK } from '../scripts/audio/sections/drop1.mjs';
import { SIGNATURE } from '../src/content/break.ts';
import * as BR from '../src/score/break.ts';
// Drop 1's glass silence is the club's (the comic club INK: its hit on club 6.4 → break 1.1).
import { SILENCE as DROP1_SILENCE } from '../src/score/club.ts';
import { locate, partBar, partFrame, partStart } from '../src/score/film.ts';
import { SECTIONS } from '../src/score/shots.ts';
import { barFrame } from '../src/score/tempo.ts';

const SR = 48000;
const at = (frame) => Math.round((frame / 60) * SR);
/** A frame of the break: its bar (1-based) and beat (0-based). */
const brk = (bar, beat = 0) => partFrame('break', bar, beat);
/** A little before the break's first frame: where the solo renders are cleared and searched from. */
const BEFORE = BR.BREAK_START - 20;
const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / Math.max(1, b - a));
const peakAbs = (x, a = 0, b = x.length) => x.subarray(a, b).reduce((p, v) => Math.max(p, Math.abs(v)), 0);
/** Frequency of `x` over [a, b) from its rising zero crossings (Hz). */
const pitch = (x, a, b) => {
  const ups = [];
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) ups.push(i - x[i] / (x[i] - x[i - 1]));
  return ups.length < 2 ? 0 : ((ups.length - 1) * SR) / (ups[ups.length - 1] - ups[0]);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol * b;
/** The strongest frequency of `x` over [a, b) within ±10 % of `f0` (Hann-windowed DFT in 0.2 % steps): a pitch that ignores FM sidebands. */
const peakHz = (x, a, b, f0) => {
  let best = 0;
  let hz = 0;
  for (let f = 0.9 * f0; f <= 1.1 * f0; f += 0.002 * f0) {
    let re = 0;
    let im = 0;
    for (let i = a; i < b; i++) {
      const w = (0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a))) * x[i];
      re += w * Math.cos((2 * Math.PI * f * i) / SR);
      im -= w * Math.sin((2 * Math.PI * f * i) / SR);
    }
    if (re * re + im * im > best) [best, hz] = [re * re + im * im, f];
  }
  return hz;
};
/** The mid (L + R) / 2 of a stereo bus. */
const mid = (bus) => Float32Array.from(bus.L, (v, i) => 0.5 * (v + bus.R[i]));
/** `x` through two 2-pole high-passes at `lo` and, if `hi` is given, two 2-pole low-passes at `hi`. */
const band = (x, lo, hi) => {
  const fs = [Biquad.highpass(SR, lo), Biquad.highpass(SR, lo), ...(hi ? [Biquad.lowpass(SR, hi), Biquad.lowpass(SR, hi)] : [])];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
const db = (x) => 20 * Math.log10(Math.max(1e-12, x));
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
/** A sha256 (first 16 hex digits) of buses `names` (L, then R) over frames [a, b). */
const sha = (stems, names, a, b) => {
  const h = createHash('sha256');
  for (const k of names) {
    for (const ch of ['L', 'R']) {
      const x = stems[k][ch].subarray(at(a), at(b));
      h.update(Buffer.from(x.buffer, x.byteOffset, x.byteLength));
    }
  }
  return h.digest('hex').slice(0, 16);
};

// --- The first note --------------------------------------------------------------------------------------------------------------

test('the music comes back on the break’s first note: the sub thoom and the first tink on break 1.1', () => {
  assert.equal(BREAK_MUSIC, BR.BREAK_START);
  assert.equal(BREAK_MUSIC, partStart('break'));
});

// --- Voices (pure): as built -----------------------------------------------------------------------------------------------------

test('chirp sweeps exponentially from one pitch to another, starting on its sample', () => {
  const b = new Float32Array(SR);
  chirp(b, 1000, SR, { from: 880, to: 220, ms: 330, wave: 'sine', gain: 0.5 });
  assert.equal(rms(b, 0, 1000), 0, 'silent before its start');
  assert.ok(Math.abs(b[1002]) > 0, 'sounding on its start');
  assert.ok(near(pitch(b, 1000, 1000 + 0.02 * SR), 880 * (220 / 880) ** (0.01 / 0.33), 0.06), `starts near 880 Hz: ${pitch(b, 1000, 1000 + 0.02 * SR)}`);
  const end = 1000 + 0.33 * SR;
  assert.ok(near(pitch(b, end - 0.03 * SR, end), 880 * (220 / 880) ** (0.315 / 0.33), 0.06), `ends near 220 Hz: ${pitch(b, end - 0.03 * SR, end)}`);
  assert.ok(rms(b, end + 0.01 * SR, end + 0.05 * SR) < 1e-6, 'and stops');
});

test('a plip drops a third of its pitch in 20 ms over a little thud, and is gone in a tenth of a second', () => {
  const b = new Float32Array(SR / 2);
  plip(b, 0, SR, { freq: 800, gain: 0.1 });
  assert.ok(rms(b, 0, 0.01 * SR) > 0.02);
  assert.ok(rms(b, 0.15 * SR, 0.25 * SR) < 0.002 * 10 ** 0, 'gone');
});

test('a tink is bright, then pure, and rings for its decay', () => {
  const b = new Float32Array(SR);
  tink(b, 0, SR, { freq: 1760, gain: 0.2, decayMs: 600, seed: 3000 });
  const c = new Float32Array(SR);
  tink(c, 0, SR, { freq: 1760, gain: 0.2, decayMs: 600, seed: 3000 });
  assert.deepEqual(b, c, 'deterministic for a seed');
  assert.ok(rms(b, 0.3 * SR, 0.32 * SR) > 0.1 * rms(b, 0.01 * SR, 0.03 * SR), 'still ringing at 300 ms');
  assert.ok(near(pitch(b, 0.3 * SR, 0.4 * SR), 1760, 0.02), 'its tail is the note');
  const s = new Float32Array(SR);
  tink(s, 0, SR, { freq: 1760, gain: 0.2, decayMs: 150, seed: 3000 });
  assert.ok(rms(s, 0.3 * SR, 0.32 * SR) < 0.2 * rms(b, 0.3 * SR, 0.32 * SR), 'a hat tink is short');
});

test('the pad bends every voice together: +1 semitone moves its pitch by 2^(1/12)', () => {
  const L = new Float32Array(SR);
  const R = new Float32Array(SR);
  pad(L, R, [{ at: 0, len: SR, freqs: [220] }], SR, { voices: 1, detune: 0, gain: 0.2, cutoff: () => 900, bend: (i) => (i < SR / 2 ? 0 : 1) });
  assert.ok(near(pitch(L, 0.2 * SR, 0.45 * SR), 220, 0.01));
  assert.ok(near(pitch(L, 0.6 * SR, 0.95 * SR), 220 * 2 ** (1 / 12), 0.01));
});

test('the chip arp plays its notes on their samples with a band-limited pulse, bent and crushed on demand', () => {
  const b = new Float32Array(SR / 2);
  chip(b, [{ at: 4800, len: 4000, freq: 587.33, duty: 0.25 }], SR, { gain: 0.1, cutoff: () => 6000 });
  assert.equal(rms(b, 0, 4800), 0);
  assert.ok(rms(b, 4800, 8800) > 0.02);
  assert.ok(near(pitch(b, 5200, 8600), 587.33, 0.03), `${pitch(b, 5200, 8600)}`);
});

test('a sung line follows its pitch curve and vowel', () => {
  const b = new Float32Array(SR);
  sing(b, 0, SR, { freq: 440, len: 0.4 * SR, vowel: 'a', to: 'a', pitch: (u) => 12 * u, gain: 0.3, seed: 3001 });
  assert.ok(rms(b, 0.05 * SR, 0.35 * SR) > 0.01);
  const lo = new Float32Array(SR);
  sing(lo, 0, SR, { freq: 440, len: 0.4 * SR, vowel: 'a', to: 'a', gain: 0.3, seed: 3001 });
  assert.ok(rms(lo, 0.45 * SR, 0.6 * SR) < 1e-4, 'it ends');
});

test('the tape stop replays its window at a rate falling an octave, darkening, and ends in silence', () => {
  const x = Float32Array.from({ length: SR }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / SR));
  const a = 0.2 * SR;
  const b = a + 0.2 * SR;
  tapeStop(x, a, b, SR, { semitones: 12 });
  assert.ok(near(pitch(x, a - 0.05 * SR, a), 440, 0.01), 'untouched before');
  assert.ok(near(pitch(x, a, a + 0.02 * SR), 440, 0.05), `full speed at its start: ${pitch(x, a, a + 0.02 * SR)}`);
  const late = pitch(x, b - 0.04 * SR, b - 0.005 * SR);
  assert.ok(late > 200 && late < 260, `an octave down by its end: ${late}`);
  assert.equal(rms(x, b, b + 0.1 * SR), 0, 'silent after');
});

test('the stutter repeats its first slice on each start, scaled, gated short', () => {
  const x = Float32Array.from({ length: SR }, (_, i) => Math.sin(i / 7));
  const src = Float32Array.from(x);
  const starts = [1000, 3400, 5800, 8200];
  stutterSlices(x, starts, 10600, 2160, [1, 0.85, 0.7, 0.55], SR);
  for (let k = 1; k < 4; k++) for (let i = 200; i < 2000; i += 97) assert.ok(Math.abs(x[starts[k] + i] - [1, 0.85, 0.7, 0.55][k] * src[1000 + i]) < 1e-6, `slice ${k} sample ${i}`);
  assert.equal(rms(x, starts[1] - 200, starts[1] - 100), 0, 'gated between slices');
  assert.ok(Math.abs(x[10600 + 500] - src[10600 + 500]) < 1e-6, 'the timeline resumes after');
});

test('the high-pass suck takes the lows out over its window and leaves what comes before', () => {
  const x = Float32Array.from({ length: SR }, (_, i) => Math.sin((2 * Math.PI * 60 * i) / SR) + 0.3 * Math.sin((2 * Math.PI * 3000 * i) / SR));
  const before = rms(x, 0.1 * SR, 0.2 * SR);
  sweepHighpass(x, 0.5 * SR, 0.6 * SR, SR, 20, 400);
  assert.ok(Math.abs(rms(x, 0.1 * SR, 0.2 * SR) - before) < 1e-9);
  assert.ok(rms(x, 0.58 * SR, 0.6 * SR) < 0.45 * before, 'the 60 Hz is gone by the end');
});

// --- Voices (pure): v2 (scripts/audio/breakSfx.mjs, the design's §8.2) -------------------------------------------------------------

/** Renders `voice` into a fresh second of silence from sample 1000; returns the buffer. */
const one = (draw, n = SR) => {
  const b = new Float32Array(n);
  draw(b);
  return b;
};
/** Every v2 voice: silent before its sample, sounding within 3 samples of it, the same for the same seed. */
test('v2 voices start on their sample and are deterministic for a seed', () => {
  const voices = {
    tick: (b) => tick(b, 1000, SR, { seed: 3001 }),
    creak: (b) => creak(b, 1000, SR, { seed: 3001 }),
    rip: (b) => rip(b, 1000, SR, { seed: 3001 }),
    thud: (b) => thud(b, 1000, SR, { seed: 3001 }),
    skid: (b) => skid(b, 1000, 9600, SR, { seed: 3001 }),
    hum: (b) => hum(b, 1000, 9600, SR),
    crtTick: (b) => crtTick(b, 1000, SR, { seed: 3001 }),
    fwoom: (b) => fwoom(b, 1000, 9600, SR, { seed: 3001 }),
    uiPop: (b) => uiPop(b, 1000, SR, { seed: 3001 }),
    roar: (b) => roar(b, 1000, 9600, SR, { speed: () => 100, seed: 3001 }),
    wind: (b) => roar(b, 1000, 9600, SR, { speed: () => 300, wind: 3, seed: 3001 }),
    lift: (b) => lift(b, 1000, 9600, SR, { seed: 3001 }),
    chain: (b) => chain(b, 1000, SR, { seed: 3001 }),
    sparks: (b) => sparks(b, 1000, SR, { seed: 3001 }),
    rewind: (b) => rewind(b, 1000, 4800, SR, { seed: 3001 }),
    crunch: (b) => crunch(b, 1000, SR, { seed: 3001 }),
    boing: (b) => boing(b, 1000, SR),
    links: (b) => links(b, 1000, SR),
    bonk: (b) => bonk(b, 1000, SR, { seed: 3001 }),
    thwang: (b) => thwang(b, 1000, SR),
    bwomp: (b) => bwomp(b, 1000, SR, { seed: 3001 }),
  };
  for (const [name, draw] of Object.entries(voices)) {
    const b = one(draw);
    assert.equal(rms(b, 0, 1000), 0, `${name}: silent before its sample`);
    const first = b.findIndex((v) => v !== 0);
    assert.ok(first >= 1000 && first <= 1003, `${name}: first sound on ${first}`);
    assert.deepEqual(b, one(draw), `${name}: deterministic`);
  }
});

test('the antivirus’s voices are on C (music bible M8): the cursor click rings C7, the hum is a C2 square', () => {
  const t = one((b) => tick(b, 0, SR, { seed: 3001 }));
  assert.ok(near(peakHz(t, 0, Math.round(0.008 * SR), 2093), 2093, 0.01), `the click: ${peakHz(t, 0, Math.round(0.008 * SR), 2093).toFixed(0)} Hz`);
  assert.ok(rms(t, Math.round(0.012 * SR), Math.round(0.02 * SR)) === 0, 'and is gone in 10 ms');
  const h = one((b) => hum(b, 0, SR / 2, SR, { toneGain: 0 }));
  assert.ok(near(pitch(h, 0.05 * SR, 0.45 * SR), 65.41, 0.01), `the hum: ${pitch(h, 0.05 * SR, 0.45 * SR).toFixed(2)} Hz`);
  assert.ok(rms(h, SR / 2, SR) === 0, 'and it lasts its window exactly');
});

test('the paper rip is three high bursts in 45 ms; the creak is a narrow band; the thud falls 90 → 60 Hz', () => {
  const r = one((b) => rip(b, 0, SR, { seed: 3001 }));
  const env = [0, 1, 2].map((k) => rms(r, Math.round((k * 0.015 + 0.0005) * SR), Math.round((k * 0.015 + 0.004) * SR)));
  const gaps = [0, 1, 2].map((k) => rms(r, Math.round((k * 0.015 + 0.011) * SR), Math.round((k * 0.015 + 0.0148) * SR)));
  for (let k = 0; k < 3; k++) assert.ok(env[k] > 3 * gaps[k], `burst ${k}: ${env[k].toFixed(4)} over its gap ${gaps[k].toFixed(4)}`);
  assert.ok(rms(band(r, 1500), 0, 0.05 * SR) > 3 * rms(band(r, 20, 600), 0, 0.05 * SR), 'high-passed');
  assert.ok(rms(r, 0.06 * SR, 0.1 * SR) === 0, 'over in 50 ms');
  const c = one((b) => creak(b, 0, SR, { freq: 700, seed: 3001 }));
  assert.ok(rms(band(c, 500, 1000), 0, 0.12 * SR) > 3 * rms(band(c, 2000), 0, 0.12 * SR), 'the creak sits on 700 Hz');
  const d = one((b) => thud(b, 0, SR, { seed: 3001 }));
  assert.ok(near(pitch(band(d, 20, 300), 0.005 * SR, 0.03 * SR), 82, 0.1), `the thud starts near 90 Hz: ${pitch(band(d, 20, 300), 0.005 * SR, 0.03 * SR).toFixed(1)}`);
  assert.ok(pitch(band(d, 20, 300), 0.07 * SR, 0.11 * SR) < 68, 'and falls toward 60 Hz');
});

test('the coaster’s voices: the roar opens with his speed; the chain clicks twice; the sparks are over in 34 ms; the rewind falls', () => {
  const slow = one((b) => roar(b, 0, SR / 2, SR, { speed: () => 24, seed: 3001 }));
  const fast = one((b) => roar(b, 0, SR / 2, SR, { speed: () => 200, seed: 3001 }));
  assert.ok(rms(fast, 0.1 * SR, 0.4 * SR) > 2 * rms(slow, 0.1 * SR, 0.4 * SR), 'louder fast');
  assert.ok(rms(band(fast, 2000), 0.1 * SR, 0.4 * SR) > 4 * rms(band(slow, 2000), 0.1 * SR, 0.4 * SR), 'and brighter');
  const c = one((b) => chain(b, 0, SR, { seed: 3001 }));
  const tickA = rms(c, 0, 0.006 * SR);
  const gap = rms(c, 0.0065 * SR, 0.0115 * SR);
  const tickB = rms(c, 0.012 * SR, 0.018 * SR);
  assert.ok(tickA > 3 * gap && tickB > 3 * gap, `two ticks 6 ms apart: ${tickA.toFixed(4)} / ${gap.toFixed(4)} / ${tickB.toFixed(4)}`);
  const s = one((b) => sparks(b, 0, SR, { seed: 3001 }));
  assert.ok(rms(s, 0.035 * SR, 0.06 * SR) < 1e-3 * rms(s, 0, 0.03 * SR), 'the sparks are over in 34 ms');
  const w = one((b) => rewind(b, 0, SR / 10, SR, { from: 1046.5, to: 261.6, seed: 3001 }));
  assert.ok(rms(band(w, 1200), 0, 0.03 * SR) > 2 * rms(band(w, 1200), 0.07 * SR, 0.1 * SR), 'the rewind falls');
});

test('the coaster’s wind: with `wind`, the roar adds air above 5 kHz that opens with the square of his speed; without it the roar is unchanged', () => {
  const plain = one((b) => roar(b, 0, SR / 2, SR, { speed: () => 200, seed: 3001 }));
  assert.deepEqual(one((b) => roar(b, 0, SR / 2, SR, { speed: () => 200, wind: 0, seed: 3001 })), plain, 'wind 0 is the roar as it was');
  const slow = one((b) => roar(b, 0, SR / 2, SR, { speed: () => 24, wind: 1, seed: 3001 }));
  const fast = one((b) => roar(b, 0, SR / 2, SR, { speed: () => 200, wind: 1, seed: 3001 }));
  const air = (x) => rms(band(x, 5000), 0.1 * SR, 0.4 * SR);
  assert.ok(air(fast) > 3 * air(plain), `the wind is the roar's air: ${db(air(fast)).toFixed(1)} dB against ${db(air(plain)).toFixed(1)} dB without it`);
  assert.ok(air(fast) > 20 * air(slow), `and rushes on the plunges only: ${db(air(fast)).toFixed(1)} dB fast, ${db(air(slow)).toFixed(1)} dB at the crawl`);
  // Below the wind the roar is untouched: its lows are the plain roar's.
  assert.ok(Math.abs(db(rms(band(fast, 20, 300), 0.1 * SR, 0.4 * SR)) - db(rms(band(plain, 20, 300), 0.1 * SR, 0.4 * SR))) < 0.5, 'the rumble is the same');
});

test('the sling’s riser: silent on its first sample, louder and brighter third by third (a band sweeping f0 → 12 kHz), and stopping on its end', () => {
  const n = SR * 2;
  const x = one((b) => lift(b, 1000, n, SR, { gain: 0.2, seed: 3001 }), SR * 3);
  assert.equal(rms(x, 0, 1001), 0, 'silent before and on its start');
  assert.equal(rms(x, 1000 + n, SR * 3), 0, 'silent after its end');
  const third = (k) => [1000 + Math.round((k * n) / 3), 1000 + Math.round(((k + 1) * n) / 3)];
  const level = [0, 1, 2].map((k) => rms(x, ...third(k)));
  assert.ok(level[0] < level[1] && level[1] < level[2], `louder: ${level.map((v) => db(v).toFixed(1)).join(' → ')} dB`);
  const bright = [0, 1, 2].map((k) => rms(band(x, 4000), ...third(k)) / Math.max(1e-12, rms(x, ...third(k))));
  assert.ok(bright[0] < bright[1] && bright[1] < bright[2], `brighter: ${bright.map((v) => v.toFixed(2)).join(' → ')} of it above 4 kHz`);
  assert.deepEqual(x, one((b) => lift(b, 1000, n, SR, { gain: 0.2, seed: 3001 }), SR * 3), 'deterministic for a seed');
});

test('the slingshot’s voices: four crunches a frame apart, the boing rises then falls, eight link ticks a semitone apart', () => {
  const c = one((b) => crunch(b, 0, SR, { seed: 3001 }));
  for (let k = 0; k < 4; k++) assert.ok(rms(c, k * 800, k * 800 + 80) > 0.02, `crunch ${k} on sample ${k * 800}`);
  const b = one((x) => boing(x, 0, SR));
  const lo = band(b, 20, 400);
  const p0 = pitch(lo, 0.005 * SR, 0.025 * SR);
  const p1 = pitch(lo, 0.05 * SR, 0.07 * SR);
  const p2 = pitch(lo, 0.15 * SR, 0.19 * SR);
  assert.ok(p1 > 1.4 * p0 && p2 < 0.85 * p1, `the boing: ${p0.toFixed(0)} → ${p1.toFixed(0)} → ${p2.toFixed(0)} Hz`);
  const l = one((x) => links(x, 0, SR, { from: 3000 }));
  for (let k = 0; k < 8; k++) {
    const a = Math.round(k * 400);
    const want = 3000 * 2 ** (k / 12);
    assert.ok(near(peakHz(l, a, a + 240, want), want, 0.012), `link ${k}: ${peakHz(l, a, a + 240, want).toFixed(0)} Hz, want ${want.toFixed(0)}`);
  }
});

test('the film’s voices: the shimmer swells into its pad; the reversed crash swells into its end and stops there', () => {
  const L = new Float32Array(SR);
  const R = new Float32Array(SR);
  shimmer(L, R, 1000, 30000, 12000, SR, { freqs: [2217.46, 2793.83, 3322.44], gain: 0.01 });
  assert.equal(rms(L, 0, 1000), 0);
  assert.ok(rms(L, 9000, 12000) > 4 * rms(L, 1000, 4000), 'swells');
  assert.ok(rms(L, 20000, 28000) > 0.5 * rms(L, 12000, 13000), 'then holds');
  assert.equal(rms(L, 31000, SR) + rms(R, 31000, SR), 0, 'and stops at its end');
  assert.ok(near(peakHz(Float32Array.from(L, (v, i) => v + R[i]), 15000, 27000, 2217.46), 2217.46, 0.01), 'C♯7 in the cluster');
  const x = one((b) => reverseNoise(b, 30000, 24000, SR, { seed: 3001 }));
  assert.equal(rms(x, 0, 6000), 0, 'silent before it starts');
  assert.equal(rms(x, 30000, SR), 0, 'silent from its end');
  assert.ok(rms(x, 28000, 29900) > 10 * rms(x, 6000, 12000), 'swelling into its end');
});

test('the release’s voices: the thwang is a C♯2 that drops 30 cents and is under −60 dB in 250 ms; the bwomp falls 110 → 62 Hz and is under −60 dB in 150 ms', () => {
  const t = one((b) => thwang(b, 0, SR, { freq: 69.3 }));
  const early = peakHz(t, Math.round(0.005 * SR), Math.round(0.06 * SR), 69.3);
  assert.ok(near(early, 69.3, 0.015), `the thwang: ${early.toFixed(2)} Hz`);
  const late = peakHz(t, Math.round(0.12 * SR), Math.round(0.2 * SR), 69.3);
  assert.ok(late < early && near(late, 69.3 * 2 ** (-0.3 / 12), 0.015), `and drops 30 cents: ${late.toFixed(2)} Hz`);
  const top = peakAbs(t);
  assert.ok(db(peakAbs(t, Math.round(0.25 * SR)) / top) < -60, `under −60 dB from 250 ms: ${db(peakAbs(t, Math.round(0.25 * SR)) / top).toFixed(1)}`);
  const w = one((b) => bwomp(b, 0, SR, { seed: 3001 }));
  const sub = band(w, 20, 250);
  const a = pitch(sub, 0.003 * SR, 0.03 * SR);
  const z = pitch(sub, 0.045 * SR, 0.095 * SR);
  assert.ok(a > 85 && a < 112, `the bwomp starts near 110 Hz: ${a.toFixed(1)}`);
  assert.ok(z > 58 && z < 0.8 * a, `and falls toward 62 Hz: ${z.toFixed(1)}`);
  assert.ok(db(peakAbs(w, Math.round(0.15 * SR)) / peakAbs(w)) < -60, 'under −60 dB from 150 ms');
});

test('the fwoom swells over its window; the UI pop rises', () => {
  const f = one((b) => fwoom(b, 0, 9600, SR, { seed: 3001 }));
  assert.ok(rms(f, 7200, 9600) > 2 * rms(f, 0, 2400), 'swells');
  assert.ok(rms(f, 9600 + 0.07 * SR, SR) === 0, 'and falls away');
  const p = one((b) => uiPop(b, 0, SR, { seed: 3001 }));
  const lo = band(p, 20, 2500);
  assert.ok(pitch(lo, 0.02 * SR, 0.029 * SR) > 1.5 * pitch(lo, 0.001 * SR, 0.01 * SR), 'rises');
});

test('the coaster’s track: his value passes every keyframe’s byte of the signature, and his speed is fastest on the plunges', () => {
  for (let k = 0; k <= 8; k++) assert.equal(trackValue(BR.GRAPH_KEYS[k]), parseInt(SIGNATURE[k], 16), `k${k + 1}`);
  assert.ok(trackSpeed(BR.BOTTOMS[0] - 1) > 3 * trackSpeed(BR.CREST + 1), `the first plunge ${trackSpeed(BR.BOTTOMS[0] - 1).toFixed(0)} px/f against the crest ${trackSpeed(BR.CREST + 1).toFixed(0)}`);
  assert.ok(near(trackSpeed(BR.CREST + 0.5), 24, 0.05), 'at the crest he rolls along the graph at 24 px/f');
});

// --- The whole break, rendered ---------------------------------------------------------------------------------------------------

const N = at(BR.BREAK_END_V2 + 60); // a second past drop2 1.1
const { stems, events } = renderStems(SR, N);
const master = mixdown(stems, SR);
const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at);
const frames = (kind) => of(kind).map((s) => s / 800);
const OWN = Object.keys(SENDS);
const { BREAK_BARS_V2: BARS, RELEASE, LOOK } = BR;
const END = BR.BREAK_END_V2;
const sixteenths = (w) => Array.from({ length: (w.to - w.from) / 6 }, (_, i) => w.from + 6 * i);

/** Where each kind of sound sits on the score (src/score/break.ts; sheet §3, §10.2). */
const EXPECT = {
  // Break 1: the glass is the rhythm (as built).
  brthoom: [BR.BREAK_START],
  brfallblip: [BR.MONITOR_FALL.from],
  brtink: BR.FALL_TINKS,
  brplip: BR.PLIPS,
  brchip: BR.CHIPS,
  brglasspad: [BR.GLASS_PAD.from],
  brsubtail: [BR.SUB_TAIL.from],
  brswell: [BR.REVERSE_CYMBAL.from],
  brrevcym: [BR.REVERSE_CYMBAL.to],
  brcrack: [BR.SHARD_STAYS],
  brswarm: [BR.SWARM.from],
  // Drums from 2.1.
  brkick: BR.KICKS_V2,
  brghost: BR.GHOST_KICKS_V2,
  brclap: BR.CLAPS_V2,
  brsnare: BR.GHOST_SNARES_V2,
  brhat: BR.CLOSED_HATS_V2,
  brohat: BR.OPEN_HATS_V2,
  brglasshat: BR.GLASS_HATS,
  brcrash: BR.CRASHES_V2,
  brslap: [BR.IMPACT],
  // Harmony and the hook.
  brhook: BR.HOOK_V2,
  brchord: BR.CHORDS_V2.filter((f) => f !== BR.REVERSE),
  brglide: [BR.REVERSE],
  brsub: BR.CHORDS_V2.filter((f) => f !== BR.LOCK && f !== brk(6, 2)),
  brstab: [BR.MORPH.from],
  brpluck: [brk(3), brk(3, 1), brk(3, 1.5), brk(3, 2.5), brk(3, 3.5), brk(4), brk(4, 1), brk(4, 1.5), brk(4, 2.5), ...BR.OPEN_HATS.slice(0, 4), ...BR.BASS_V2, brk(8, 0.25), brk(8, 0.75)],
  brarp: BR.ARPS_V2.flatMap(sixteenths),
  brmotif: [...BR.MOTIF_UP_V2, ...BR.MOTIF_34],
  brrace: BR.ARP_RACE_V2,
  // E2, the shard on our side.
  brknock: BR.KNOCKS,
  brthwip: [BR.SHARD_FLIGHT.from],
  brglasspop: [BR.LOCK],
  // Reactions and the system.
  brouch: [BR.LOCK],
  brsnap: [BR.LOCK],
  brblip: [BR.MONITOR.from, BR.MONITOR.from + 6],
  bruwa: [BR.DIZZY],
  brclick: [BR.DIZZY, BR.STUTTER_END],
  brstutter: BR.STUTTER,
  brbuzz: [BR.STUTTER[2]],
  brrevsnare: [BR.REVERSE_SNARE.to],
  brclack: [BR.CARD_FLIP.to],
  brding: [BR.CARD_FLIP.to],
  // E3, the tofu eye.
  brwarble: [BR.REROLL[0]],
  brtick: BR.REROLL,
  brtofu: [BR.TOFU],
  brfetch: [BR.FETCH, BR.FETCH + 3],
  brstreak: [BR.GALAXY.to],
  brhm: [BR.RESCAN.from],
  brrescan: [BR.RED_RESCAN.from],
  brrevclick: [BR.POP_OUT],
  brpopout: [BR.POP_OUT],
  brtag: BR.TAG_COPIES,
  // The hang and the restart.
  brtapestop: [BR.TAPE_STOP.from],
  brhung: [BR.HUNG_BUZZ.from],
  brrestart: [0, 1, 2, 3].map((k) => BR.RESTARTING + k),
  brwipein: [3, 4, 5, 6].map((k) => BR.WIPE.from + k),
  brwipeout: [9, 10, 11, 12].map((k) => BR.WIPE.from + k),
  brpower: [BR.POWER_ON.from],
  // Break 5.
  brimpact: [BR.REVEAL],
  brwhole: [BR.REVEAL],
  brspark: [BR.GLINT, BR.WAVE, BR.LOUDER_V2],
  brblink: [BR.BLINK],
  brfan: [BR.FAN],
  brchipkey: BR.CHIP_KEYS,
  // Break 7: v04's bar-6 system sounds one bar later; the climbing steps.
  brbrow: BR.BROWS_V2,
  brerror: [BR.DIALOG_V2],
  brpress: [BR.LOUDER_V2],
  brzip: [BR.ROOT_V2],
  brsudo: BR.SUDO_V2,
  brenter: [BR.PASSWORD_V2],
  brclimb: BR.VOX_STEPS_V2,
  brgranted: BR.GRANTED_CHIME,
  brbeep: [BR.OVERLOAD_V2, BR.HELD_V2],
  brband: [BR.RUBBER_BAND_V2.from],
  brriser: [BR.RISER_V2.from],
  // Break 8: v04's held breath, 1.5 bars later.
  brstep: BR.VOX_34,
  brhup: [BR.HUP_V2],
  brglint: [BR.FIST_GLINT_V2],
  brsuck: [BR.HP_SUCK_V2.from],
  // v2, bars 2–5: the antivirus's hand and the world's new sounds.
  brcursor: BR.CURSOR_CLICKS,
  brcreak: BR.CREAKS,
  brrip: BR.TEARS,
  brthud: BR.THUDS,
  brskid: [BR.SKID.from + 2],
  brhum: [BR.SCANNER_HUM.from],
  brscan: [BR.POV.from],
  brlock: BR.POV_LOCKS.slice(1),
  brcrt: [BR.STUTTER_END],
  brreel: BR.WORLD_REROLL,
  brzoom: [BR.CRASH_WHOOSH.to],
  brfwoom: [BR.PULL_OUT.from],
  brinfect: [BR.INFECT_FLASH.from],
  brwa: [BR.INFECT],
  brmarquee: [BR.SELECT.from],
  bruipop: [BR.UI_POP],
  // Break 6: the coaster.
  brroar: [BR.RAIL_ROAR.from],
  brplunge: BR.PLUNGES.map((p) => p.from),
  brsparks: BR.BOTTOMS,
  brchain: BR.CHAIN_CLICKS,
  brair: [BR.CREST],
  brrewind: [BR.REWIND.from],
  brwhip: [BR.WHIP_CUT],
  // Break 7: the catch and the notches.
  brcrunch: [BR.CATCH - 2],
  brboing: [BR.CATCH],
  brslide: [BR.CURSOR_OK.from],
  brbonk: [BR.BONK.from],
  brbandcreak: BR.NOTCHES,
  brlinks: [BR.GRIP],
  brdenied: [BR.DENIED.from],
  brroot: [BR.ROOT_ROW],
  // Break 8: the film, the release.
  brshimmer: [BR.SHIMMER.from],
  brsqueak: [BR.SUCTION.from],
  brrevcrash: [BR.REV_CRASH.to],
  brthwang: [RELEASE],
  brcam: [BR.WHOOSH_AT_CAM.to],
  brbwomp: [BR.SPLAT],
};

test('every sound of the break is on its frame of the score, and every frame is a whole number of samples (frame / 60 s exactly)', () => {
  const kinds = [...new Set(events.map((e) => e.kind).filter((k) => k.startsWith('br')))];
  assert.deepEqual(kinds.sort(), Object.keys(EXPECT).sort(), 'the break plays exactly these kinds of sound');
  for (const [kind, want] of Object.entries(EXPECT)) assert.deepEqual(frames(kind), [...new Set(want)].sort((a, b) => a - b), kind);
  for (const e of events.filter((x) => x.kind.startsWith('br'))) assert.equal(e.at, (e.at / 800) * 800, `${e.kind} at ${e.at}`);
  assert.ok(events.filter((x) => x.kind.startsWith('br')).every((e) => e.at >= at(BR.BREAK_START) && e.at < at(END)), 'all inside the break');
  assert.ok(events.filter((x) => x.kind.startsWith('br')).every((e) => e.at <= at(LOOK)), 'nothing is scheduled in the dead air (S4)');
});

test('the hook is drop 1’s, rebuilt: each note of the score’s HOOK_V2 is the note drop 1’s HOOK plays on that sixteenth (break 6: HOOK[4] whole)', () => {
  const notes = hookNotes();
  assert.equal(notes.length, BR.HOOK_V2.length);
  BR.HOOK_V2.forEach((f, i) => {
    const { id, bar } = locate(f);
    assert.equal(id, 'break', `${f} is in the break`);
    const row = DROP1_HOOK[bar - 2];
    const hit = row.find(([s]) => brk(bar) + 6 * s === f);
    assert.ok(hit, `${f} is a note of HOOK[${bar - 2}]`);
    assert.equal(notes[i].midi, hit[1], `${f}`);
  });
  assert.equal(notes.filter((n) => n.bar === partBar('break', 6)).length, DROP1_HOOK[4].length, 'break 6 sings HOOK[4] whole');
  assert.equal(HOOK6.vowels.length, DROP1_HOOK[4].length);
  for (const v of HOOK6.vowels) assert.ok(v in VOWELS, v);
});

test('silence before the first note: the break writes nothing before break 1.1, then the thoom and the first tink sound on it', () => {
  for (const k of OWN) for (const x of [stems[k].L, stems[k].R]) for (let i = 0; i < at(BR.BREAK_START); i++) assert.equal(x[i], 0, `${k} at sample ${i}`);
  const music = mixdown({ ...stems, post: undefined }, SR);
  for (let f = DROP1_SILENCE.from + 1; f < BR.BREAK_START; f++) assert.ok(rms(music.L, at(f), at(f + 1)) < 1e-3, `frame ${f}: the mix (no glass) is silent until the break`);
  const low = band(mid(stems.brSub), 30, 200);
  const one1 = BR.BREAK_START;
  assert.ok(rms(low, at(one1), at(one1 + 3)) > 0.05, `the thoom: ${rms(low, at(one1), at(one1 + 3))}`);
  assert.ok(rms(band(mid(stems.brGlass), 1500), at(one1), at(one1 + 1)) > 0.005, 'the tink');
});

// --- KEEP-FIRST (先保留、再加): the as-built sound is carried over byte for byte ----------------------------------------------------

/**
 * Hashes of v04's break, rendered by the v04 master's own code (notes/b58/map/backup, the 36-bar tree whose bgm.wav is the approved
 * one; notes/bid2/break-music/golden.mjs): (1) each as-built bus over v04's break 1–5, less v04's two re-voiced sounds (its sine
 * rescan and its off-grid callout keys: break.mjs change log S1–S2); (2) each sound of v04's bar 6 that the design keeps one bar later, rendered
 * alone, over its first 18 frames (part-local frame of its new place).
 */
const V04 = {
  bars: { brDrums: '6260f2061e7fb9dd', brGlass: 'd05795c587d67bcf', brBell: '9467447488c4de5d', brPad: 'a5d112caebe75bb8', brBass: '3a004390177712d7', brSub: '11e7166466060e59', brArp: 'a8aa552823e781a8', brVox: '41ea2ae7c6ddb3ce', brFx: '882c4be2c4119031', brRiser: '76ed5c9c326ba623', brDry: '76ed5c9c326ba623', brEgg: '76ed5c9c326ba623' },
  carried: [['brbrow', 582, '73b5acc9dd8dceda'], ['brbrow', 588, '34ca635a6b633f6c'], ['brerror', 588, '82ed73e05f62c0b5'], ['brpress', 600, 'a7440f2db9a531dd'], ['brspark', 600, 'ed7a36bb9f569f71'], ['brzip', 612, 'b01ca256b9258755'], ['brsudo', 624, '028b74da16d53a68'], ['brsudo', 630, 'd17c1014e6c25df1'], ['brsudo', 636, '56e62d84c55ff64f'], ['brsudo', 642, 'bc57977a159c0efa'], ['brenter', 645, '5ae951c17600d8ed'], ['brkick', 576, '290e3b0df6077a85'], ['brkick', 600, '91e711160e116d82'], ['brkick', 624, '20e81d77bab8c50c'], ['brkick', 648, '38234e20b1414ef1'], ['brclap', 600, '21076cb9cd23f3c8'], ['brclap', 624, 'e33614e4b2c5a804'], ['brclap', 648, 'f52bfb5d2825cdda'],
    // v04's bar-6 hats and open hats up to 7.3e (the build's brighter hats start on 7.3&: break.mjs change log S7).
    ['brhat', 576, '2161bf50b468bf9e'], ['brhat', 582, 'f29aeb390685a60b'], ['brhat', 594, 'bb823bc429bf80d8'], ['brhat', 600, 'cf130db922ccbd65'], ['brhat', 606, 'cac0de1a2807382d'], ['brhat', 618, '167656ed37cea560'], ['brhat', 624, '640bcdccd83965e5'], ['brhat', 630, '4de4f68a925647b4'], ['brohat', 588, '1425b9c5f78ea144'], ['brohat', 612, '2040a8ac4704b964']],
};

test('KEEP-FIRST: with every v2 sound playing, the twelve as-built buses carry v04’s break 1–5 byte for byte (the additions are on the new buses)', () => {
  assert.deepEqual(V04_BUSES, Object.keys(V04.bars));
  assert.deepEqual([...V04_BUSES, ...V2_BUSES].sort(), OWN.sort(), 'the break’s buses are the as-built twelve and v2’s');
  for (const k of V04_BUSES) {
    assert.equal(sha(stems, [k], BR.BREAK_START, BARS[5]), V04.bars[k], `${k} over break 1–5 is v04’s (if drop 1’s HOOK or VOICINGS changed on purpose, re-pin it and log it)`);
  }
});

// --- Measured: each sound starts on its own frame ----------------------------------------------------------------------------

/** The break's buses (and a sub) of N samples, for solo renders. */
const solo = Object.fromEntries([...OWN.map((k) => [k, stereo(N)]), ['sub', new Float32Array(N)]]);
const clear = () => {
  for (const k of OWN) {
    solo[k].L.fill(0, at(BEFORE));
    solo[k].R.fill(0, at(BEFORE));
  }
};
/**
 * Renders only the sounds `want(kind, frame)` picks into the solo buses (cleared first); returns their events. `ducks` false leaves out
 * the bed's ducks under the eggs (ruling 5), for tests that pin a bus edit the ducks would overlay.
 */
const only = (want, ducks = true) => {
  clear();
  return renderBreak(solo, SR, { solo: want, ducks });
};
/** The first sample in [a, b) where any of the solo buses is not exactly zero, or −1. */
const firstSound = (a, b) => {
  let first = -1;
  for (const k of OWN) {
    for (const x of [solo[k].L, solo[k].R]) {
      const end = first < 0 ? b : first;
      for (let i = a; i < end; i++) {
        if (x[i] !== 0) {
          first = i;
          break;
        }
      }
    }
  }
  return first;
};
/** The last sample in [a, b) where any of the solo buses sounds, or −1. */
const lastSound = (a, b) => {
  let last = -1;
  for (const k of OWN) {
    for (const x of [solo[k].L, solo[k].R]) {
      for (let i = b - 1; i > Math.max(a, last); i--) {
        if (x[i] !== 0) {
          last = i;
          break;
        }
      }
    }
  }
  return last;
};
/** The solo buses summed to mono over samples [a, b). */
const soloMix = (a, b) => Float32Array.from({ length: b - a }, (_, i) => OWN.reduce((s, k) => s + 0.5 * (solo[k].L[a + i] + solo[k].R[a + i]), 0));

test('KEEP-FIRST: each sound of v04’s bar 6 that bar 7 keeps — the brows, the error chime, LOUDER, root, sudo, the password, the kicks and claps of the notches, the hats to 7.3e — renders alone exactly as v04’s', () => {
  for (const [kind, local, want] of V04.carried) {
    const f = BR.BREAK_START + local;
    only((k, fr) => k === kind && fr === f);
    assert.equal(sha(solo, V04_BUSES, f, f + 18), want, `${kind} on ${local}`);
  }
});

/** Sounds with an attack: each one, rendered alone, is silent before its frame's first sample and sounding within 3 samples of it. */
const HARD = [
  'brthoom', 'brfallblip', 'brtink', 'brplip', 'brchip', 'brcrack', 'brkick', 'brghost', 'brclap', 'brsnare', 'brhat', 'brohat', 'brglasshat', 'brcrash', 'brslap', 'brhook', 'brchord', 'brsub', 'brstab', 'brpluck', 'brarp', 'brmotif', 'brrace',
  'brknock', 'brthwip', 'brglasspop', 'brouch', 'brsnap', 'brblip', 'bruwa', 'brclick', 'brbuzz', 'brclack', 'brding', 'brtick', 'brtofu', 'brfetch', 'brhm', 'brrescan', 'brpopout', 'brtag', 'brhung', 'brrestart',
  'brimpact', 'brwhole', 'brspark', 'brblink', 'brfan', 'brchipkey', 'brbrow', 'brerror', 'brpress', 'brzip', 'brsudo', 'brenter', 'brclimb', 'brstep', 'brgranted', 'brbeep', 'brhup', 'brglint', 'brband',
  'brcursor', 'brcreak', 'brrip', 'brthud', 'brskid', 'brhum', 'brscan', 'brlock', 'brcrt', 'brreel', 'brinfect', 'brwa', 'brmarquee', 'bruipop',
  'brroar', 'brplunge', 'brsparks', 'brchain', 'brrewind', 'brcrunch', 'brboing', 'brslide', 'brbonk', 'brbandcreak', 'brlinks', 'brdenied', 'brroot', 'brsqueak', 'brthwang', 'brbwomp',
];

test('measured: every hit, note and key starts on its own frame — rendered alone, silent before 800 × frame samples, sounding from it', () => {
  let n = 0;
  for (const kind of HARD) {
    for (const f of new Set(EXPECT[kind])) {
      const e = only((k, fr) => k === kind && fr === f);
      assert.ok(e.length >= 1, `${kind} ${f} renders`);
      const s = firstSound(at(BEFORE), at(f) + at(1));
      assert.ok(s >= at(f) && s <= at(f) + 3, `${kind} on ${f}: first sound at ${(s / 800).toFixed(4)}`);
      const m = soloMix(at(f), at(f) + 960);
      assert.ok(m.reduce((p, v) => Math.max(p, Math.abs(v)), 0) > 2e-4, `${kind} on ${f} is heard within 20 ms`);
      n++;
    }
  }
  assert.ok(n > 400, `${n} sounds measured`);
});

test('measured: the swells start on their frame and grow to its end (the glass pad, the sub swell, the swarm, the riser, the power-up, the fwoom, the rubber band, the film’s shimmer)', () => {
  const windows = { brglasspad: BR.GLASS_PAD, brswell: BR.REVERSE_CYMBAL, brswarm: BR.SWARM, brriser: { from: BR.RISER_V2.from, to: BR.REV_CRASH.from }, brpower: BR.POWER_ON, brfwoom: BR.PULL_OUT, brband: BR.RUBBER_BAND_V2, brshimmer: BR.SHIMMER };
  for (const [kind, w] of Object.entries(windows)) {
    only((k) => k === kind);
    const s = firstSound(at(BEFORE), at(w.to));
    assert.ok(s >= at(w.from) && s < at(w.from + 6), `${kind}: starts on ${(s / 800).toFixed(2)} (${w.from})`);
    const m = soloMix(at(w.from), at(w.to));
    const q = Math.floor(m.length / 4);
    // The glass pad sounds from 1.1 since iteration 2 (ruling 1: no hole after drop 1), so it swells by less than the others.
    const grow = kind === 'brglasspad' ? 1.3 : 2;
    assert.ok(rms(m, 3 * q, 4 * q) > grow * rms(m, 0, q), `${kind} grows: ×${(rms(m, 3 * q, 4 * q) / rms(m, 0, q)).toFixed(2)}`);
  }
});

/** 2.1's suck: what swells into the impact stops 25 ms before it, so the break's first drum lands as a slap (review R1-12). */
const SUCK = at(BR.IMPACT) - Math.round(0.025 * SR);

test('measured: the reversed sounds swell into their frame and stop on it (the cymbal into break 2.1’s suck, the snare into 4.1, the click into the pop-out, the crash into the release)', () => {
  for (const [kind, from, f, end] of [['brrevcym', BR.REVERSE_CYMBAL.from, BR.REVERSE_CYMBAL.to, SUCK], ['brrevsnare', BR.REVERSE_SNARE.from, BR.REVERSE_SNARE.to], ['brrevclick', BR.POP_OUT - 3, BR.POP_OUT], ['brrevcrash', BR.REV_CRASH.from, BR.REV_CRASH.to]]) {
    const stop = end ?? at(f);
    only((k) => k === kind);
    const last = lastSound(at(f - 60), at(f + 60));
    assert.ok(last >= stop - 48 && last < stop, `${kind}: last sound at ${(last / 800).toFixed(3)} (${(stop / 800).toFixed(3)})`);
    assert.ok(firstSound(at(BEFORE), at(f)) >= at(from), `${kind} starts on ${from}`);
    const m = soloMix(at(from), stop);
    assert.ok(rms(m, Math.round(0.9 * m.length), m.length) > 3 * rms(m, 0, Math.round(0.5 * m.length)), `${kind} swells into ${(stop / 800).toFixed(3)}`);
  }
});

test('break 2.1 slaps (R1-12): the reverse cymbal, the swarm and the sub swell stop 25 ms before it, and its frame is at least 8 dB louder than the one before', () => {
  for (const kind of ['brrevcym', 'brswarm']) {
    only((k) => k === kind);
    const last = lastSound(at(BR.IMPACT - 30), at(BR.IMPACT + 60));
    assert.ok(last < SUCK && last >= SUCK - 96, `${kind}: last sound at ${(last / 800).toFixed(3)}, the suck at ${(SUCK / 800).toFixed(3)}`);
  }
  only((k) => k === 'brswell');
  const swell = mid(solo.brSub);
  assert.ok(rms(swell, SUCK - 2400, SUCK - 480) > 0.02, `the swell is loud into the suck: ${rms(swell, SUCK - 2400, SUCK - 480).toFixed(4)}`);
  assert.equal(rms(swell, SUCK, at(BR.IMPACT)), 0, 'and sucked out of its last 25 ms');
  const level = (f) => 10 * Math.log10((rms(master.L, at(f), at(f + 1)) ** 2 + rms(master.R, at(f), at(f + 1)) ** 2) / 2);
  const rise = level(BR.IMPACT) - level(BR.IMPACT - 1);
  assert.ok(rise >= 8, `${BR.IMPACT} is ${rise.toFixed(1)} dB over ${BR.IMPACT - 1} (${level(BR.IMPACT).toFixed(1)} against ${level(BR.IMPACT - 1).toFixed(1)} dB)`);
});

test('measured: the whooshes peak on their frames (the galaxy streak, the wipe’s panels, the crash zoom on the tofu, the airtime on the crest, the whip on its hidden cut, the whoosh at the camera on the splat)', () => {
  for (const kind of ['brstreak', 'brwipein', 'brwipeout', 'brzoom', 'brair', 'brwhip', 'brcam']) {
    for (const f of EXPECT[kind]) {
      only((k, fr) => k === kind && fr === f);
      const m = soloMix(at(f - 30), at(f + 30));
      const env = Array.from({ length: 60 * 8 }, (_, i) => rms(m, Math.max(0, i * 100 - 190), i * 100 + 290));
      const peak = (env.indexOf(Math.max(...env)) * 100 + 50) / 800 + f - 30;
      assert.ok(Math.abs(peak - f) <= 1, `${kind} peaks at ${peak.toFixed(2)} (${f})`);
    }
  }
});

// --- The stutter, the hang ---------------------------------------------------------------------------------------------------------

/** The as-built music buses (the fx bus plays through the edits; v2's buses are fx too). */
const MUSIC = V04_BUSES.filter((k) => k !== 'brFx');

test('the stutter: the clap tail, the bell and the hat of break 3.4 replay on each 32nd (gains 1, .85, .7, .55), each gated to 45 ms; the POV’s lock beeps ride on top', () => {
  // The as-built sounds of 3.4 (the POV's lock beep on the same 32nd is v2's, on top: below).
  only((k, f) => f === BR.STUTTER[0] && k !== 'brlock');
  const gate = Math.round(0.045 * SR);
  const ramp = Math.round(0.0015 * SR);
  const ref = soloMix(at(BR.STUTTER[0]), at(BR.STUTTER[0]) + gate);
  assert.ok(rms(ref, 0, gate) > 0.01, 'the slice sounds');
  [1, 0.85, 0.7, 0.55].forEach((g, k) => {
    const s = soloMix(at(BR.STUTTER[k]), at(BR.STUTTER[k]) + gate);
    for (let i = ramp; i < gate - ramp; i += 53) assert.ok(Math.abs(s[i] - g * ref[i]) < 1e-5, `slice ${k} sample ${i}`);
    const end = k < 3 ? at(BR.STUTTER[k + 1]) : at(BR.STUTTER_END);
    const gap = soloMix(at(BR.STUTTER[k]) + gate, end);
    assert.ok(rms(gap, 0, gap.length) < 1e-6, `gated after slice ${k}`);
  });
  for (let k = 0; k < 4; k++) {
    const a = at(BR.STUTTER[k]) + gate;
    const b = k < 3 ? at(BR.STUTTER[k + 1]) : at(BR.STUTTER_END);
    for (const name of MUSIC) assert.ok(rms(stems[name].L, a, b) < 1e-6, `${name} is gated after slice ${k} in the full mix`);
  }
  // The beeps are not sliced: each one sounds whole on its own 32nd.
  only((k) => k === 'brlock');
  for (const f of BR.STUTTER) assert.ok(rms(mid(solo.brDef), at(f), at(f) + 480) > 0.005, `the lock beep on ${f}`);
});

test('the hang: the music bends down an octave in a tape stop on break 4.4, the hung buzz and the keys play on, then only the wipe is heard until 5.1', () => {
  only((k, f) => k === 'brsub' && f === brk(4));
  // The D2 of break 4, from 8 frames before it to 8 frames past the tape stop: its pitch in the 12 frames before the hang, and late in it.
  const [w0, w1, t] = [brk(4) - 8, BR.TAPE_STOP.to + 8, BR.TAPE_STOP];
  const sub = soloMix(at(w0), at(w1));
  const before = pitch(sub, at(t.from - 12) - at(w0), at(t.from) - at(w0));
  const late = pitch(sub, at(t.from + 5) - at(w0), at(t.to - 1) - at(w0));
  assert.ok(near(before, 73.42, 0.03), `D2 before the hang: ${before.toFixed(1)} Hz`);
  assert.ok(late < 0.72 * before && late > 0.45 * before, `bent down by its end: ${late.toFixed(1)} Hz`);
  for (const name of [...MUSIC, ...V2_BUSES]) for (const x of [stems[name].L, stems[name].R]) assert.ok(rms(x, at(BR.WIPE.from), at(BR.REVEAL)) < 1e-7, `${name} is silent under the wipe`);
  assert.ok(rms(band(mid(stems.brFx), 600), at(BR.HUNG_BUZZ.from), at(BR.HUNG_BUZZ.to)) > 0.003, 'the hung buzz plays on');
  assert.ok(rms(mid(stems.brFx), at(BR.WIPE.from), at(BR.REVEAL)) > 0.005, 'the wipe is heard');
  assert.ok(CUTS.includes(BR.WIPE.from), 'the reverb restarts with the wipe: no tail of the hang under it');
});

// --- The coaster -------------------------------------------------------------------------------------------------------------------

test('break 6 rides the coaster: HOOK[4][2] is scooped 7 semitones down into the first bottom and back; HOOK[4][4] bends 5 down into the second', () => {
  const six = hookNotes().filter((h) => h.bar === partBar('break', 6));
  const [g, e] = [six[2], six[4]];
  assert.equal(g.frame, BR.PLUNGES[0].from, 'the scooped note starts the first plunge');
  assert.equal(e.frame, BR.CREST, 'the bent note is the crest’s');
  only((k, f) => k === 'brhook' && f === g.frame);
  const v = mid(solo.brVox);
  const hz = (f0, a, b) => peakHz(v, a, b, f0);
  const G = midiHz(g.midi);
  assert.ok(near(hz(G, at(g.frame) + 160, at(g.frame) + 960), G, 0.025), `starts on the note: ${hz(G, at(g.frame) + 160, at(g.frame) + 960).toFixed(0)} (${G.toFixed(0)})`);
  const lowG = G * 2 ** (-7 / 12);
  assert.ok(near(hz(lowG, at(BR.BOTTOMS[0]) - 400, at(BR.BOTTOMS[0]) + 400), lowG, 0.03), `7 down on the bottom: ${hz(lowG, at(BR.BOTTOMS[0]) - 400, at(BR.BOTTOMS[0]) + 400).toFixed(0)} (${lowG.toFixed(0)})`);
  only((k, f) => k === 'brhook' && f === e.frame);
  const w = mid(solo.brVox);
  const E = midiHz(e.midi);
  assert.ok(near(peakHz(w, at(e.frame) + 800, at(e.frame + 10), E), E, 0.02), 'the crest note holds before the plunge');
  const late = peakHz(w, at(BR.BOTTOMS[1] - 4), at(BR.BOTTOMS[1] - 1), E * 2 ** (-4.6 / 12));
  assert.ok(late < E * 2 ** (-4 / 12) && late > E * 2 ** (-5.5 / 12), `bent about 5 down into 6.4: ${late.toFixed(0)} (from ${E.toFixed(0)})`);
});

test('break 6: the rail roar follows his speed — loudest on the plunges, quietest at the crest', () => {
  only((k) => k === 'brroar');
  const r = mid(solo.brFoley);
  const plunge = rms(r, at(BR.BOTTOMS[0] - 3), at(BR.BOTTOMS[0]));
  const crest = rms(r, at(BR.CREST), at(BR.CREST + 3));
  assert.ok(plunge > 2 * crest, `plunge ${plunge.toFixed(4)} against the crest ${crest.toFixed(4)}`);
  assert.equal(rms(r, at(BR.RAIL_ROAR.to), at(BR.RAIL_ROAR.to + 12)), 0, 'and it stops when the rewind takes him');
});

// --- The antivirus's palette (music bible M8, M9) ---------------------------------------------------------------------------------

test('the antivirus’s sounds are dry and on C (M8): its bus sends ≤ 0.05; its clicks, lock beeps and denied buzz ring on C; infected, its beep bends up to C♯', () => {
  assert.ok(SENDS.brDef <= 0.05, `brDef sends ${SENDS.brDef}`);
  for (const [kind, f, want] of [['brcursor', BR.CURSOR_CLICKS[0], 2093], ['brlock', BR.POV_LOCKS[1], 2093], ['brdenied', BR.DENIED.from, 130.81]]) {
    only((k, fr) => k === kind && fr === f);
    const x = mid(solo.brDef);
    const len = kind === 'brdenied' ? 2400 : 360;
    assert.ok(near(peakHz(x, at(f), at(f) + len, want), want, 0.012), `${kind}: ${peakHz(x, at(f), at(f) + len, want).toFixed(1)} Hz, want ${want}`);
  }
  only((k) => k === 'brinfect');
  const x = mid(solo.brDef);
  const a = at(BR.INFECT_FLASH.from);
  assert.ok(near(peakHz(x, a + 48, a + 720, 2093), 2093, 0.02), 'it starts on C7');
  assert.ok(near(peakHz(x, at(BR.INFECT) - 240, at(BR.INFECT) + 480, 2217.46), 2217.46, 0.02), 'and reaches C♯7 as he flips');
});

// --- The pivot (8.1) -----------------------------------------------------------------------------------------------------------------

test('measured: the pivot — the sub glides from C2 up to the C♯2 drone over break 8.1’s first 6 frames', () => {
  const [c2, p] = [brk(7, 2), BR.REVERSE];
  only((k, f) => k === 'brsub' && f === c2);
  const c = soloMix(at(c2), at(p));
  assert.ok(near(pitch(c, at(c2 + 24) - at(c2), at(p - 1) - at(c2)), 65.41, 0.01), `C2: ${pitch(c, at(c2 + 24) - at(c2), at(p - 1) - at(c2)).toFixed(2)}`);
  only((k, f) => k === 'brsub' && f === p);
  const cs = soloMix(at(p), at(p + 36));
  assert.ok(near(pitch(cs, at(p + 8) - at(p), at(p + 36) - at(p)), 69.3, 0.01), `C♯2: ${pitch(cs, at(p + 8) - at(p), at(p + 36) - at(p)).toFixed(2)}`);
});

test('the pivot (R1-11): no F or G natural sung or rung before break 8.1 rings into the C♯ bar — the last 8th goes to a drier send, and the notes, echoes and bell tails fade out over 8.1’s first 16th', () => {
  const pivot = BR.REVERSE;
  // Everything the vox and the bell sing and ring in F from the coaster to the pivot, without the bed's ducks (which would overlay the fade).
  only((k, f) => ['brhook', 'brclimb', 'brgranted'].includes(k) && f >= brk(6) && f < pivot, false);
  for (const k of OWN) for (const x of [solo[k].L, solo[k].R]) assert.equal(rms(x, at(pivot + 6), at(END)), 0, `${k} is silent from ${pivot + 6}`);
  const held = soloMix(at(pivot - 12), at(pivot + 6));
  assert.ok(rms(held, at(3), at(6)) > 0.003, `the last 8th sounds: ${rms(held, at(3), at(6)).toFixed(4)}`);
  assert.ok(rms(held, at(15), at(18)) < 0.4 * rms(held, at(12), at(15)), 'and fades out over the 16th');
  assert.ok(SENDS.brDry <= SENDS.brBell / 2 && SENDS.brDry <= SENDS.brVox / 4, `brDry's send ${SENDS.brDry}`);
  for (const k of ['brVox', 'brBell']) assert.equal(rms(mid(solo[k]), at(pivot - 12), at(pivot + 6)), 0, `${k} has handed the last 8th to brDry`);
  assert.ok(rms(mid(solo.brDry), at(pivot - 12), at(pivot)) > 0.003, 'brDry carries it');
  const m = mixdown(solo, SR, { stutter: false });
  const dB = (x, a, b) => 20 * Math.log10(Math.hypot(rms(x.L, at(a), at(b)), rms(x.R, at(a), at(b))) / Math.SQRT2);
  const drop = dB(m, pivot - 12, pivot) - dB(m, pivot + 6, pivot + 18);
  assert.ok(drop >= 15, `the held notes' ring in ${pivot + 6}–${pivot + 18} is ${drop.toFixed(1)} dB under the last 8th`);
  const under = dB(master, pivot + 6, pivot + 18) - dB(m, pivot + 6, pivot + 18);
  assert.ok(under >= 32, `and ${under.toFixed(1)} dB under the whole mix`);
  // What starts on the pivot (the first step of v04's climb, G♯5) is untouched by the fade.
  only((k, f) => k === 'brstep' && f === pivot);
  assert.ok(rms(mid(solo.brVox), at(pivot + 6), at(pivot + 10)) > 0.005, 'the step on break 8.1 sings through');
});

// --- The release (8.3) and S4 ---------------------------------------------------------------------------------------------------------

test('the release (8.3): every music bus is cut dead on its frame, the lows sucked out over the last 32nd, the riser and the reversed crash peaking into it', () => {
  assert.ok(CUTS.includes(RELEASE), 'the reverb restarts on the release: no pad tail survives it');
  for (const k of OWN.filter((x) => x !== 'brFoley')) for (const x of [stems[k].L, stems[k].R]) assert.equal(rms(x, at(RELEASE), N), 0, `${k} after the release`);
  // Only the release's own sounds play on: the thwang, the whoosh at the camera, the bwomp.
  only((k) => ['brthwang', 'brcam', 'brbwomp'].includes(k));
  const fol = mid(stems.brFoley);
  const own = mid(solo.brFoley);
  for (let i = at(RELEASE); i < N; i += 7) assert.equal(fol[i], own[i], `brFoley after the release is only the release (sample ${i})`);
  const drone = mid(stems.brSub);
  assert.ok(rms(drone, at(RELEASE - 3), at(RELEASE)) < 0.35 * rms(drone, at(BR.HELD_V2), at(BR.HP_SUCK_V2.from)), 'the drone is sucked out');
  const riser = mid(stems.brRiser);
  assert.ok(rms(riser, at(RELEASE - 3), at(RELEASE)) > rms(riser, at(BR.HELD_V2), at(BR.HP_SUCK_V2.from)), 'the riser keeps rising to its peak');
  // No click on the cut: the mix's largest step across it is under the largest step in the frame before.
  const step = (x, a, b) => {
    let s = 0;
    for (let i = a + 1; i < b; i++) s = Math.max(s, Math.abs(x[i] - x[i - 1]));
    return s;
  };
  for (const ch of ['L', 'R']) assert.ok(step(master[ch], at(RELEASE) - 40, at(RELEASE) + 40) <= step(master[ch], at(RELEASE - 1), at(RELEASE) - 40), `${ch}: no click on the cut`);
});

test('the bwomp and the thwang are deflated, not a hit: under −16 LUFS over the release’s beat, gone (−60 dB) by the gloat’s end, and S4 is digital zero to drop2 1.1', () => {
  only((k) => ['brthwang', 'brbwomp'].includes(k));
  const r = mid(solo.brFoley);
  assert.ok(db(peakAbs(r, at(BR.GLOAT_DONE), at(LOOK)) / peakAbs(r)) < -60, `under −60 dB from ${BR.GLOAT_DONE}`);
  assert.ok(loud(RELEASE, RELEASE + 24) <= -16, `the release's beat at ${loud(RELEASE, RELEASE + 24).toFixed(1)} LUFS`);
  assert.deepEqual(SILENCES, [{ from: LOOK, to: END }]);
  assert.ok(CUTS.includes(LOOK) && CUTS.includes(END));
  for (const k of OWN) for (const x of [stems[k].L, stems[k].R]) assert.equal(rms(x, at(LOOK), at(END)), 0, `${k} in the dead air`);
  for (const ch of ['L', 'R']) for (let i = at(LOOK); i < at(END); i++) assert.equal(master[ch][i], 0, `the mix is digital zero in S4 (${ch} sample ${i})`);
});

test('S4 is written as exact zeros (review F8): bgm.mjs leaves the 16-bit dither out of the break’s DIGITAL_ZERO in every WAV that holds it, and no other byte changes', () => {
  assert.deepEqual(DIGITAL_ZERO, SILENCES, 'the dead air is the window written without dither');
  assert.deepEqual(BGM_DIGITAL_ZERO, [[at(LOOK), at(END)]], 'bgm.mjs reads it, in samples of the film');
  // break.wav as bgm.mjs writes it: the section's slice of the mix, its windows in the slice's own samples.
  const sec = SECTIONS.find((s) => s.id === 'break');
  const a = at(barFrame(sec.fromBar));
  const b = at(barFrame(sec.toBar + 1));
  assert.equal(b, at(END), 'break.wav ends on drop2 1.1');
  const l = master.L.slice(a, b);
  const r = master.R.slice(a, b);
  const silent = digitalZeroIn(a, l.length);
  assert.deepEqual(silent, [[at(LOOK) - a, at(END) - a]], 'all of S4, at break +738–767');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-break-s4-'));
  try {
    writeWav(path.join(dir, 'zero.wav'), l, r, SR, { silent });
    writeWav(path.join(dir, 'dither.wav'), l, r, SR);
    const z = fs.readFileSync(path.join(dir, 'zero.wav'));
    const d = fs.readFileSync(path.join(dir, 'dither.wav'));
    assert.equal(z.length, d.length);
    const [s0, s1] = silent[0];
    // Exact zeros: every 16-bit sample of both channels, the whole window (the dither had left ±1 LSB on about a quarter of them).
    let dithered = 0;
    for (let i = s0; i < s1; i++) {
      for (let ch = 0; ch < 2; ch++) {
        assert.equal(z.readInt16LE(44 + 4 * i + 2 * ch), 0, `break.wav sample ${i} (${ch ? 'R' : 'L'}) is exact zero`);
        if (d.readInt16LE(44 + 4 * i + 2 * ch) !== 0) dithered++;
      }
    }
    assert.ok(dithered > 0, 'without the option the dither is there: the option is what makes it zero');
    // Every byte outside S4 (the header, break 1.1 → 8.3&, and drop2 1.1's edge) is what the plain writer writes.
    assert.equal(Buffer.compare(z.subarray(0, 44 + 4 * s0), d.subarray(0, 44 + 4 * s0)), 0, 'nothing before S4 changes');
    assert.equal(Buffer.compare(z.subarray(44 + 4 * s1), d.subarray(44 + 4 * s1)), 0, 'nothing after S4 changes');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // A file that does not hold S4 gets no window, so it is written byte for byte as before (drop 2 begins on its end).
  assert.deepEqual(digitalZeroIn(at(END), at(60)), []);
  assert.deepEqual(digitalZeroIn(0, at(LOOK)), []);
  assert.deepEqual(digitalZeroIn(at(LOOK) + 100, at(60)), [[0, at(END) - at(LOOK) - 100]], 'a slice that starts inside S4 is clipped to it');
});

test('writeWav’s silent ranges: opt-in, clipped to the buffer, in whole samples; without them the bytes are the plain writer’s', () => {
  const n = 4000;
  const x = Float32Array.from({ length: n }, (_, i) => (i >= 1000 && i < 3000 ? 0 : 0.25 * Math.sin(i / 7)));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-wav-silent-'));
  try {
    const w = (name, opts) => {
      writeWav(path.join(dir, name), x, x, SR, opts);
      return fs.readFileSync(path.join(dir, name));
    };
    const plain = w('plain.wav');
    assert.equal(Buffer.compare(w('empty.wav', { silent: [] }), plain), 0, 'no ranges: the plain bytes');
    assert.equal(Buffer.compare(w('outside.wav', { silent: [[-50, -10], [n + 10, n + 90], [700, 700]] }), plain), 0, 'ranges outside the buffer or empty: the plain bytes');
    const z = w('zero.wav', { silent: [[1000, 3000]] });
    for (let i = 0; i < n; i++) {
      const inside = i >= 1000 && i < 3000;
      for (let ch = 0; ch < 2; ch++) {
        const o = 44 + 4 * i + 2 * ch;
        if (inside) assert.equal(z.readInt16LE(o), 0, `sample ${i} is exact zero`);
        else assert.equal(z.readInt16LE(o), plain.readInt16LE(o), `sample ${i} keeps its dither (the draws go on through the range)`);
      }
    }
    assert.throws(() => w('frac.wav', { silent: [[10.5, 20]] }), /whole samples/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- Levels ---------------------------------------------------------------------------------------------------------------------

const slice = (a, b) => [master.L.slice(at(a), at(b)), master.R.slice(at(a), at(b))];
const lufs = (a, b) => integratedLoudness(...slice(a, b), SR);
/** Momentary-style loudness of frames [a, b) of the master (K-weighted, ungated), in LUFS. */
function loud(a, b) {
  const K = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585], [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621]];
  let p = 0;
  for (const x of [master.L, master.R]) {
    const st = K.map(([b0, b1, b2, a1, a2]) => new Biquad(b0, b1, b2, a1, a2));
    for (let i = at(a) - 9600; i < at(b); i++) {
      const y = st[1].process(st[0].process(x[i]));
      if (i >= at(a)) p += y * y;
    }
  }
  return -0.691 + 10 * Math.log10(p / (at(b) - at(a)));
}

/** The spectral centroid (Hz) of the master's mid over frames [a, b): the music bible's definition (§6.4: 4096-point Hann, hop 2048, magnitude-weighted). */
const centroidOf = (a, b) => {
  const n = 4096;
  const win = Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
  let num = 0;
  let den = 0;
  for (let s = at(a); s + n <= at(b); s += n / 2) {
    const re = Float64Array.from({ length: n }, (_, i) => 0.5 * (master.L[s + i] + master.R[s + i]) * win[i]);
    const im = new Float64Array(n);
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) [re[i], re[j], im[i], im[j]] = [re[j], re[i], im[j], im[i]];
    }
    for (let len = 2; len <= n; len <<= 1) {
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < len / 2; k++) {
          const [c, sn] = [Math.cos((-2 * Math.PI * k) / len), Math.sin((-2 * Math.PI * k) / len)];
          const [p, q] = [i + k, i + k + len / 2];
          const [xr, xi] = [re[q] * c - im[q] * sn, re[q] * sn + im[q] * c];
          [re[q], im[q], re[p], im[p]] = [re[p] - xr, im[p] - xi, re[p] + xr, im[p] + xi];
        }
      }
    }
    for (let k = 2; k < n / 2; k++) {
      const m = Math.hypot(re[k], im[k]);
      num += (m * k * SR) / n;
      den += m;
    }
  }
  return num / den;
};

// The design (§8.3) wants the centroid to rise every bar into the release. As built it never did over its last bars (v04's break 6
// sat under its break 5: the build's kicks and sub weigh down a magnitude-weighted centroid), and the first 8-bar mix lost air in the
// coaster and the sling (−1.3 dB above 4 kHz against break 5). So the test pins the arc the ear hears: the coaster at least as bright and
// airy as the reveal; the sling's wind-up (the catch, Am9) a breath darker, then opening from 7.3 (C9sus4) half-bar by half-bar into the
// release, where the race and the hup are the interlude's airiest moment.
// v08, change log S9 (the v07 review: after the slingshot the volume and the white noise spiked): v07's riser swelled its noise band on to 12 kHz into the release — the
// mix's band over 6 kHz climbed 10 dB in a beat and a half to −21.9 dB a 16th, and 8.2's sharpness reached the film's 95th percentile.
test('S9: the fake drop\'s riser — bar 7 as built (lift\'s samples), from 8.1 its band stops at capHz and its level eases down: the band over 6 kHz peaks ≥ 3.5 dB under v07\'s, 8.2 is no sharper than 2.25 acum', () => {
  // The riser itself: lift's own samples up to 8.1, then the cap (a band-pass at the cap, not above it) and the easing.
  const len = at(BR.RISER_V2.to) - at(BR.RISER_V2.from);
  const [cut, hold] = [at(RISER_V08.from) - at(BR.RISER_V2.from), at(RISER_V08.hold) - at(BR.RISER_V2.from)];
  const a = new Float32Array(len);
  const b = new Float32Array(len);
  lift(a, 0, len, SR, { gain: RISER.gain, curve: RISER.curve, f0: RISER.f0, seed: 3456 });
  riser(b, len, cut, hold, SR, 3456);
  for (let i = 0; i < cut; i += 7) assert.equal(b[i], a[i], `bar 7 as built (sample ${i})`);
  assert.deepEqual([RISER_V08.from, RISER_V08.hold], [brk(8), brk(8, 0.25)]);
  assert.ok(RISER_V08.capHz <= 10000 && RISER_V08.noiseDb <= -2, 'capped and easing down');
  const hi = (x, i0, i1) => db(rms(band(x, 9000), i0, i1));
  assert.ok(hi(b, len - at(6), len) < hi(a, len - at(6), len) - 6, `the last 16th over 9 kHz: ${hi(b, len - at(6), len).toFixed(1)} dB against as built ${hi(a, len - at(6), len).toFixed(1)}`);
  // The mix: the band over 6 kHz per 16th of bar 8 to the release, and 8.2's sharpness.
  const h6 = band(mid(master), 6000);
  const peak = Math.max(...sixteenths({ from: brk(8), to: RELEASE }).map((f) => db(rms(h6, at(f), at(f + 6)))));
  assert.ok(peak <= -25.4, `the band over 6 kHz peaks at ${peak.toFixed(1)} dB a 16th (v07: −21.9)`);
  const [beat82] = groupOf(sixteenthsOf(master.L, master.R, SR, brk(8, 1), RELEASE, { small: false }), 4);
  assert.ok(beat82.acum <= 2.25, `8.2: ${beat82.acum.toFixed(2)} acum (v07: 2.30)`);
});

test('the build opens: the coaster is as bright and airy as break 5, the sling winds up, then from 7.3 the air rises every half bar to the release', () => {
  const hi = band(mid(master), 4000);
  const air = (a, b) => db(rms(hi, at(a), at(b)));
  const bar = (k) => [BARS[k - 1], Math.min(BARS[k - 1] + 96, RELEASE)];
  const half = (k, h) => {
    const [a, b] = bar(k);
    return h ? [(a + b) / 2, b] : [a, (a + b) / 2];
  };
  const [a5, a6] = [air(...bar(5)), air(...bar(6))];
  assert.ok(a6 >= a5 - 0.5, `the coaster's air ${a6.toFixed(1)} dB against break 5's ${a5.toFixed(1)}`);
  const [c5, c6] = [centroidOf(...bar(5)), centroidOf(...bar(6))];
  assert.ok(c6 >= c5, `the coaster's centroid ${c6.toFixed(0)} Hz against break 5's ${c5.toFixed(0)}`);
  const rise = [half(7, 0), half(7, 1), half(8, 0), half(8, 1)].map((w) => air(...w));
  assert.ok(rise[1] > rise[0] + 1, `the sling opens on 7.3: ${rise[0].toFixed(1)} → ${rise[1].toFixed(1)} dB`);
  assert.ok(rise[1] >= a5 - 0.5, `and is back to break 5's air by then: ${rise[1].toFixed(1)} against ${a5.toFixed(1)} dB`);
  for (let k = 2; k < rise.length; k++) assert.ok(rise[k] > rise[k - 1] + 1, `then rises every half bar: ${rise.map((v) => v.toFixed(1)).join(' → ')} dB`);
});

/** The levels test's measurements, for the arc rule split out of it below (tests in a file run in order). */
let arc = null;
/** What the bang trim (2026-10-03, sections/cosmos.mjs BANG_TRIM) took off drop 1's integrated loudness (measured 0.116 LU). */
const DROP1_TRIM_LU = 0.12;

test('levels: the interlude builds bar by bar to the held breath (break 1 quietest, 8 loudest before the release), stays under drop 1, and the hup and the race are its loudest beat', () => {
  const bars = BARS.map((f) => lufs(f, Math.min(f + barFrame(2), RELEASE)));
  for (let k = 1; k < bars.length; k++) assert.ok(bars[k] > bars[k - 1] + (k < 7 ? 0.5 : 0.2), `break ${1 + k}: ${bars[k].toFixed(1)} LUFS after ${bars[k - 1].toFixed(1)}`);
  // Iteration 2, ruling 1: break 1 is the sparse bar but no longer a cliff (it was −21.6 LUFS, 12 LU under drop 1's last bar).
  assert.ok(bars[0] > -19 && bars[0] < -18, `break 1 sits at about −18: ${bars[0].toFixed(1)} LUFS`);
  const drop1 = mixdown(renderStems(SR, at(partFrame('club', 3))).stems, SR);
  const d1 = integratedLoudness(drop1.L.slice(at(partStart('cosmos'))), drop1.R.slice(at(partStart('cosmos'))), SR);
  const br = lufs(BR.BREAK_START, LOOK);
  // On v08 (2026-10-03) the bang went down 2 dB (sections/cosmos.mjs BANG_TRIM, cosmos 1.1 → 2.1): drop 1 integrates
  // DROP1_TRIM_LU lower (−11.03 → −11.15), all of it in its first bar, so the margins below give exactly that back (3 → 2.88 here).
  assert.ok(br < d1 - 3 + DROP1_TRIM_LU, `the interlude ${br.toFixed(2)} LUFS against drop 1's ${d1.toFixed(2)}`);
  assert.ok(br > -14.8 && br < -13.6, `the interlude integrates to −14.2 ± 0.6 (music bible §1): ${br.toFixed(2)}`);
  // Break 6–8 under drop 1: the arc rule the quieter new cosmos moved, split out below (held again by the whole-film mix pass’s ride).
  arc = { bars, d1 };
  // Every beat of the interlude to the release: 8.2 (the race, the hup, the suck) is the loudest.
  const beats = Array.from({ length: (RELEASE - BR.BREAK_START) / 24 }, (_, k) => BR.BREAK_START + 24 * k);
  const levels = beats.map((f) => loud(f, f + 24));
  const top = levels.indexOf(Math.max(...levels));
  assert.equal(beats[top], brk(8, 1), `the loudest beat is ${locate(beats[top]).bar}.${locate(beats[top]).beat + 1} at ${levels[top].toFixed(1)} (8.2: ${loud(brk(8, 1), RELEASE).toFixed(1)})`);
  assert.ok(loud(BR.HELD_V2, RELEASE) > loud(brk(8), BR.HELD_V2) - 1.5, `the held breath ${loud(BR.HELD_V2, RELEASE).toFixed(1)} keeps up with 8.1–8.2& ${loud(brk(8), BR.HELD_V2).toFixed(1)}`);
});

// The new cosmos is quieter than v04's (−11.1 LUFS without the chord bed; cosmos sheet notes/bcos/sheet.md §16d ruling 1), so
// drop 1 integrates lower and break 8 was no longer 0.5 LU under it (−10.84 against −10.91 on 2026-10-03). Drop 1 cannot come up (drop 2
// must stay ≥ drop 1 + 1.5 LU on its own caps): the whole-film mix pass (2026-10-03) rides the end of the build down on the finished mix
// (break.mjs ARC_RIDE: 7.4, 8.1 and 8.2 by the beat), so the rule holds again, the build still climbs into it and 8.2 stays its peak.
test('levels: break 6–8 stay under drop 1 (by 0.5 LU), by the arc’s ride alone (a fader on the finished mix, ridden by the beat from 7.4 to the look)', () => {
  assert.ok(arc, 'the levels test above measured the bars and drop 1');
  const { bars, d1 } = arc;
  // 0.5 LU under v08's drop 1; its bang trimmed (DROP1_TRIM_LU, 10-03), break 8 sits 0.41 under it (was 0.53).
  for (const k of [5, 6, 7]) assert.ok(bars[k] < d1 - 0.5 + DROP1_TRIM_LU, `break ${k + 1} ${bars[k].toFixed(2)} still under drop 1 ${d1.toFixed(2)}`);
  assert.deepEqual(ARC_RIDE.keys.map((k) => k.at), [partFrame('break', 7, 3), BR.REVERSE, partFrame('break', 8, 1)], '7.4, 8.1 (the pivot), 8.2 (the hup)');
  assert.equal(ARC_RIDE.to, BR.LOOK, 'held to the look (S4)');
  for (const k of ARC_RIDE.keys) {
    assert.ok(k.db < 0 && k.db > -1.5, `a small cut: ${k.db} dB on ${k.at}`);
    assert.ok(Math.abs(arcRideDb(k.at) - k.db) < 1e-9, `${k.db} dB on ${k.at}`);
  }
  assert.equal(arcRide(ARC_RIDE.keys[0].at - ARC_RIDE.rampFrames), 1);
  assert.equal(arcRide(BR.LOOK), 1);
  // The mix before the edits past the limiter (every finish()): the break's is the only one in its bars, so the two are the same sample
  // for sample up to the ride's first 16th, and from there to the look the finished mix is the mix × the ride.
  const plain = mixdown(renderStems(SR, N).stems, SR, { stutter: false });
  const from = at(ARC_RIDE.keys[0].at - ARC_RIDE.rampFrames);
  for (let i = at(BARS[5]); i < from; i += 101) assert.equal(master.L[i], plain.L[i], `sample ${i}`);
  for (let i = from; i < at(BR.LOOK); i += 37) {
    const want = plain.L[i] * arcRide((i / SR) * 60);
    assert.ok(Math.abs(master.L[i] - want) <= 1e-6 * Math.max(1e-3, Math.abs(want)), `sample ${i}: ${master.L[i]} against ${want}`);
  }
});

test('no clipping: no bus of the break leaves ±1, the break’s mix stays under −1 dBTP, its lows are mono', () => {
  const [a, b] = [at(BR.BREAK_START), at(END)];
  for (const k of OWN) for (const x of [stems[k].L, stems[k].R]) assert.ok(peakAbs(x.subarray(a, b)) < 1, k);
  const dry = Float32Array.from({ length: b - a }, (_, i) => OWN.reduce((s, k) => s + stems[k].L[a + i], 0));
  assert.ok(peakAbs(dry) < 1.2, `the break's buses together peak at ${peakAbs(dry).toFixed(2)}`);
  const [l, r] = slice(BR.BREAK_START, LOOK);
  assert.ok(truePeakDb(l, r) <= -1, `${truePeakDb(l, r).toFixed(2)} dBTP`);
  assert.ok(lowCorrelation(l, r, SR) > 0.95, 'mono lows');
});

test('break 1.1 gives, it does not smash: Drop 1’s glass on the post bus is a dry crack and a soft knock, gone before the first pane lands', () => {
  const post = mid(stems.post);
  const one1 = BR.BREAK_START;
  const hit = rms(post, at(one1), at(one1 + 6));
  assert.ok(rms(band(post, 2000), at(one1), at(one1 + 3)) > 0.02, 'a crack on break 1.1');
  assert.ok(rms(post, at(brk(1, 1)), at(BR.IMPACT)) < 0.05 * hit, `no crash ringing over the fall: ${rms(post, at(brk(1, 1)), at(BR.IMPACT)).toFixed(4)} against ${hit.toFixed(4)}`);
});

test('measured: the bell of break 2–4 sounds drop 1’s hook notes (the ring of each, rendered alone and before the tape stop bends it, is at its pitch)', () => {
  for (const h of hookNotes().filter((x) => x.bar <= partBar('break', 4) && x.frame < BR.TAPE_STOP.from)) {
    only((k, f) => k === 'brhook' && f === h.frame);
    const m = soloMix(at(h.frame), at(h.frame) + Math.round(0.5 * SR));
    const want = 440 * 2 ** ((h.midi - 69) / 12);
    const hz = peakHz(m, Math.round(0.12 * SR), Math.round(0.3 * SR), want);
    const tol = h.frame === BR.DIZZY ? 0.03 : 0.006; // the dizzy A5 wobbles ±50 cents
    assert.ok(near(hz, want, tol), `${h.frame}: ${hz.toFixed(1)} Hz for MIDI ${h.midi} (${want.toFixed(1)})`);
  }
});

// --- Iteration 2 (the director's rulings 1 and 5) ---------------------------------------------------------------------------------

test('ruling 1: the glass pad sounds from break 1.1 and a low sub tail of the thoom (B♭1) holds under the fall, one continuous tone into the swell — no gap in the lows from 1.1 to the suck', () => {
  assert.equal(BR.GLASS_PAD.from, BR.BREAK_START, 'the pad starts on break 1.1');
  assert.deepEqual(BR.SUB_TAIL, { from: BR.BREAK_START, to: BR.REVERSE_CYMBAL.from });
  only((k) => k === 'brsubtail' || k === 'brswell');
  const sub = mid(solo.brSub);
  for (let f = BR.BREAK_START + 12; f < BR.IMPACT - 3; f += 6) assert.ok(rms(sub, at(f), at(f + 2)) > 0.015, `the lows hold on ${f}: ${rms(sub, at(f), at(f + 2)).toFixed(4)}`);
  const hz = pitch(sub, at(brk(1, 1)), at(BR.SUB_TAIL.to - 2));
  assert.ok(near(hz, 58.27, 0.01), `B♭1 under the fall: ${hz.toFixed(2)} Hz`);
  assert.ok(rms(sub, at(BR.SUB_TAIL.from + 12), at(BR.SUB_TAIL.to)) < 0.05, 'a tail, not a note');
  only((k) => k === 'brglasspad');
  const pad21 = soloMix(at(BR.GLASS_PAD.from), at(brk(1, 1)));
  assert.ok(rms(pad21, 0, pad21.length) > 0.004, `the pad is heard on break 1.1: ${rms(pad21, 0, pad21.length).toFixed(4)}`);
});

/** Band energy (dB) of mono x over samples [a, b), 200–8000 Hz (the eggs' band; the review's method). */
const bandDb = (x, a, b) => {
  const y = band(x.subarray(a - 4800, b), 200, 8000).subarray(4800);
  return 10 * Math.log10(y.reduce((p, v) => p + v * v, 0) / (b - a) + 1e-20);
};
const EGGS = { brsudo: BR.SUDO_V2, brhup: [BR.HUP_V2] };

test('ruling 5: the eggs are heard — sudo’s four keys and the "hup!" are raised 10–15 dB and each sits within 10 dB of the whole mix in its band (they were 17–26 dB under)', () => {
  for (const kind of Object.keys(EGGS)) assert.ok(EGG_RAISE_DB[kind] >= 10 && EGG_RAISE_DB[kind] <= 15, `${kind} raised ${EGG_RAISE_DB[kind]} dB`);
  const m = mid(master);
  for (const [kind, fr] of Object.entries(EGGS)) {
    only((k) => k === kind);
    const v = soloMix(0, N);
    for (const f of fr) {
      const d = bandDb(v, at(f), at(f) + Math.round(0.08 * SR)) - bandDb(m, at(f), at(f) + Math.round(0.08 * SR));
      assert.ok(d > -10, `${kind} on ${f}: ${d.toFixed(1)} dB against the mix`);
    }
  }
});

test('ruling 5: the bed (everything but the drums and the sub) ducks 6–10 dB for 50–100 ms under each egg, from just before its onset, and is untouched elsewhere', () => {
  const drums = ['brkick', 'brclap', 'brhat', 'brohat', 'brghost', 'brsnare'];
  const bed = (k) => !(k in EGGS) && !drums.includes(k);
  const render = (ducks) => {
    clear();
    renderBreak(solo, SR, { solo: bed, ducks });
    return Object.fromEntries(OWN.map((k) => [k, Float32Array.from(solo[k].L)]));
  };
  const on = render(true);
  const off = render(false);
  const buses = OWN.filter((k) => !['brDrums', 'brSub', 'brEgg'].includes(k));
  const sum = (b, a, z) => buses.reduce((p, k) => p + b[k].subarray(a, z).reduce((q, v) => q + v * v, 0), 0);
  for (const [kind, fr] of Object.entries(EGGS)) {
    const d = EGG_DUCKS[kind];
    const len = d.leadMs + d.holdMs + d.releaseMs;
    assert.ok(len >= 50 && len <= 100, `${kind}: a ${len} ms duck`);
    assert.ok(d.depthDb >= 6 && d.depthDb <= 10, `${kind}: ${d.depthDb} dB`);
    for (const f of fr) {
      const a = at(f);
      const z = at(f) + Math.round((d.holdMs / 1000) * SR);
      const g = 10 * Math.log10(sum(on, a, z) / sum(off, a, z));
      assert.ok(Math.abs(g + d.depthDb) < 0.6, `the bed under ${kind} on ${f} is ${g.toFixed(1)} dB`);
    }
  }
  // Untouched away from the eggs: from break 1.1 to 8 frames before sudo's first key.
  const eggs = BR.SUDO_V2[0] - 8;
  for (const k of buses) assert.equal(rms(on[k], at(BR.BREAK_START), at(eggs)), rms(off[k], at(BR.BREAK_START), at(eggs)), `${k} before the eggs`);
  // The drums and the sub drone are never ducked (sudo's first key lands with a kick and clap).
  for (const k of ['brDrums', 'brSub']) assert.ok(Math.abs(rms(on[k], at(eggs), at(END)) - rms(off[k], at(eggs), at(END))) < 1e-9, `${k} untouched`);
});
