// The comic club's music (scripts/audio/sections/club.mjs, its new voices in scripts/audio/clubVoices.mjs, the club's own mix of them in
// scripts/audio/clubMix.mjs), the part 'club' (6 bars), against its build sheet (notes/b58/club-sheet.md §11; the music bible
// notes/prep/music.md §1, §2.1, §3, §4.4–4.5, §5 S3, §6, §7): drop 1's groove and voices continued, the hook through HOOK[3], HOOK[4]
// and PEAK, every comic gag on its picture's frame, bar 4 heard from the bar, v04's throw moved to club 5.3, and the music cut dead on the
// hit into v04's glass. Since 2026-10-03 no chord is held: the pad and the supersaw stabs are gone,
// the chords are the house piano on STABS and the horns on the lettered words, the BRRR and the swell into the hit, and the hit is heard
// through the master limiter exactly as the old club left it. Every frame is taken from src/score/club.ts; every check is measured in the
// rendered audio, not only in the event list.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { mixdown, renderStems } from '../scripts/audio/bgm.mjs';
import { clubAlone, mixClub } from '../scripts/audio/clubMix.mjs';
import { armStretch, hornHit, housePiano, lockChirp, needleDrop, paperCut, ride, scratch, stampChunk, villainLick, whip } from '../scripts/audio/clubVoices.mjs';
import { Biquad } from '../scripts/audio/filters.mjs';
import { LIMIT_DB, MASTER_TRIM_DB } from '../scripts/audio/limiter.mjs';
import { integratedLoudness, lowCorrelation, truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { group as sonesGroup, sixteenths as sonesRows } from '../scripts/audio/perceived.mjs';
import {
  ARP_PUMP, BAR1_AIR, BRRR, CARRY_TINKS, CUTS, HIT_SWELL, HOOK_LEVEL, HOOK_ROWS, HORNS, LEVEL_DB, NEEDLE_BUMP, OFF_KICK_PAN, PEAK, PIANO, PREVIEWS, ROOT, RUN, SENDS, SILENCES, SUNG_SPREAD, THWACK, TIER_A, WIDTH,
  chordAt, hatFadeIn, hookNotes, hornNotes, renderClub,
} from '../scripts/audio/sections/club.mjs';
import { BANG_TRIM, HOOK_LIFT_DB, HOOK_MAX_BOOST_DB, HOOK_NOTE_DB } from '../scripts/audio/sections/cosmos.mjs';
import { HOOK, VOICINGS } from '../scripts/audio/sections/drop1.mjs';
import * as C from '../src/score/club.ts';
import { partBar, partFrame, partStart } from '../src/score/film.ts';
import * as B from '../src/shots/clubInkB.ts';

const SR = 48000;
const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / Math.max(1, b - a));
const dB = (v) => 20 * Math.log10(Math.max(1e-12, v));
/** Frequency of `x` over [a, b) from its rising zero crossings (Hz). */
const pitch = (x, a, b) => {
  const ups = [];
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) ups.push(i - x[i] / (x[i] - x[i - 1]));
  return ups.length < 2 ? 0 : ((ups.length - 1) * SR) / (ups[ups.length - 1] - ups[0]);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol * b;
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
/** `x` through two 2-pole low-passes at `hz` (the fundamental of a bright voice, for pitch()). */
const lowpass = (x, hz) => {
  const fs = [Biquad.lowpass(SR, hz), Biquad.lowpass(SR, hz)];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
/** `x` through two 2-pole high-passes at `lo` and, if `hi` is given, two 2-pole low-passes at `hi`. */
const band = (x, lo, hi) => {
  const fs = [Biquad.highpass(SR, lo), Biquad.highpass(SR, lo), ...(hi ? [Biquad.lowpass(SR, hi), Biquad.lowpass(SR, hi)] : [])];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};

// ——— The new voices (pure) ——————————————————————————————————————————————————————————————————————————————————————————————————————

test('the ride: a hat ringing about 300 ms with a bell ping on it (ratio 2.7), from its sample', () => {
  const b = new Float32Array(SR);
  ride(b, 1000, SR, { gain: 0.2, bell: 2637, seed: 7001 });
  assert.equal(rms(b, 0, 1000), 0, 'silent before its start');
  const early = rms(b, 1000 + 0.01 * SR, 1000 + 0.04 * SR);
  const at300 = rms(b, 1000 + 0.29 * SR, 1000 + 0.32 * SR);
  assert.ok(dB(early) - dB(at300) > 5 && dB(early) - dB(at300) < 16, `rings ~300 ms: ${(dB(early) - dB(at300)).toFixed(1)} dB down at 300 ms`);
  assert.ok(rms(b, 1000 + 0.9 * SR, SR) < 0.05 * early, 'and has died by a second');
  const ping = rms(band(b, 2300, 3000), 1000 + 0.01 * SR, 1000 + 0.1 * SR);
  const below = rms(band(b, 1200, 1800), 1000 + 0.01 * SR, 1000 + 0.1 * SR);
  assert.ok(ping > 2 * below, 'the bell ping sounds at its pitch');
});

test('the villain lick: a wah-wah bass of two notes, a 16th each — D3 then A2 (and A2 then D2) — dry and in the chord', () => {
  const sp = Math.round(0.1 * SR); // 6 frames
  for (const [a, c] of [[50, 45], [45, 38]]) {
    const b = new Float32Array(SR / 2);
    villainLick(b, 1000, SR, { notes: [[a, sp], [c, sp]], gain: 0.3 });
    assert.equal(rms(b, 0, 1000), 0);
    const lo = lowpass(b, 200);
    const p1 = pitch(lo, 1000 + 0.03 * SR, 1000 + 0.09 * SR);
    const p2 = pitch(lo, 1000 + sp + 0.03 * SR, 1000 + sp + 0.09 * SR);
    assert.ok(near(p1, midiHz(a), 0.03), `first note ${p1.toFixed(1)} Hz ≈ ${midiHz(a).toFixed(1)}`);
    assert.ok(near(p2, midiHz(c), 0.03), `second note ${p2.toFixed(1)} Hz ≈ ${midiHz(c).toFixed(1)}`);
    // The wah: its resonance sweeps up to about 2 kHz a third of the way into each note and back down by its end.
    const w = band(b, 1500, 2600);
    const open = rms(w, 1000 + 0.026 * SR, 1000 + 0.042 * SR);
    const shut = rms(w, 1000 + 0.085 * SR, 1000 + 0.1 * SR);
    assert.ok(open > 3 * shut, `the wah opens (${dB(open).toFixed(1)} dB) and shuts (${dB(shut).toFixed(1)} dB)`);
    assert.ok(rms(b, 1000 + 2 * sp + 0.03 * SR, 1000 + 2 * sp + 0.06 * SR) < 0.02 * rms(b, 1000, 1000 + 2 * sp), 'and stops after its second note');
  }
});

test('the lock chirp: an FM chirp rising C7 → G7 in 80 ms, then the clunk and the chk', () => {
  const b = new Float32Array(SR / 2);
  lockChirp(b, 2000, SR, { gain: 0.2, seed: 7002 });
  assert.equal(rms(b, 0, 2000), 0);
  const c = band(b, 1500, 4500);
  const p0 = pitch(c, 2000 + 0.004 * SR, 2000 + 0.02 * SR);
  const p1 = pitch(c, 2000 + 0.06 * SR, 2000 + 0.078 * SR);
  assert.ok(near(p0, midiHz(96), 0.08), `starts near C7: ${p0.toFixed(0)} Hz`);
  assert.ok(near(p1, midiHz(103), 0.08), `ends near G7: ${p1.toFixed(0)} Hz`);
  const low = rms(band(b, 40, 160), 2000, 2000 + 0.06 * SR);
  assert.ok(low > 0.01, 'a low clunk under it');
});

test('a scratch reads its record backwards and forwards: the pull plays it reversed and faster, the crossfader cuts each move in two', () => {
  // The record: a steady 440 Hz tone for half a second.
  const src = Float32Array.from({ length: SR / 2 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / SR));
  const b = new Float32Array(SR);
  const moves = [{ from: 0.2, to: 0.05, ms: 100 }, { from: 0.05, to: 0.25, ms: 100 }];
  scratch(b, 1000, SR, { src, moves, gain: 0.5, noise: 0, gapMs: 10, seed: 7003 });
  assert.equal(rms(b, 0, 1000), 0);
  // The middle of the pull: speed = 0.15 s / 0.1 s × π/2 ≈ 2.36 at its peak; around it the pitch is well above the record's.
  const mid1 = 1000 + Math.round(0.03 * SR);
  const p = pitch(b, mid1, mid1 + Math.round(0.012 * SR));
  assert.ok(p > 1.7 * 440 && p < 2.6 * 440, `the pull plays faster: ${p.toFixed(0)} Hz`);
  // The crossfader: shut for gapMs in the middle of each move.
  for (const k of [0, 1]) {
    const c = 1000 + Math.round((0.05 + 0.1 * k) * SR);
    assert.ok(rms(b, c - Math.round(0.003 * SR), c + Math.round(0.003 * SR)) < 0.01, `move ${k + 1} is cut in two`);
  }
  assert.ok(rms(b, 1000 + Math.round(0.21 * SR), 1000 + Math.round(0.3 * SR)) < 1e-6, 'and stops after its last move');
  assert.ok(rms(b, 1000, 1000 + Math.round(0.2 * SR)) > 0.1, 'loud while it plays');
});

test('the stamp: a "ka" a 32nd before its frame and the "chunk" on it — a 70 Hz thud with a paper slap', () => {
  const b = new Float32Array(SR / 2);
  const on = 10000;
  stampChunk(b, on, SR, { gain: 0.3, seed: 7004 });
  const ka = Math.round((3 / 60) * SR);
  assert.equal(rms(b, 0, on - ka), 0, 'silent until the ka');
  assert.ok(rms(band(b, 1500), on - ka, on - ka + 0.01 * SR) > 0.01, 'the ka: a bright tick a 32nd early');
  const thud = lowpass(b, 120);
  assert.ok(rms(thud, on, on + 0.06 * SR) > 4 * rms(thud, on - ka, on - 10), 'the chunk lands on its frame');
  assert.ok(near(pitch(thud, on + 0.02 * SR, on + 0.09 * SR), 70, 0.15), `at about 70 Hz: ${pitch(thud, on + 0.02 * SR, on + 0.09 * SR).toFixed(1)}`);
});

test('the arm stretching (the haul): a rubbery glide F3 → C4 with the tension, a creak on it, swelling with the pull, stopping dead on its end', () => {
  const len = Math.round(0.1 * SR);
  const tone = (k) => {
    const L = new Float32Array(SR / 4);
    const R = new Float32Array(SR / 4);
    armStretch(L, R, 1000, len, SR, { gain: 0.3, creak: 0, tension: () => k, seed: 7007 });
    return L;
  };
  const slack = tone(0);
  const taut = tone(1);
  assert.equal(rms(slack, 0, 1000), 0, 'silent before its start');
  const p0 = pitch(lowpass(slack, 230), 1000 + 0.02 * SR, 1000 + 0.09 * SR);
  const p1 = pitch(lowpass(taut, 330), 1000 + 0.02 * SR, 1000 + 0.09 * SR);
  assert.ok(near(p0, midiHz(53), 0.03), `slack: ${p0.toFixed(1)} Hz ≈ F3`);
  assert.ok(near(p1, midiHz(60), 0.03), `taut: ${p1.toFixed(1)} Hz ≈ C4`);
  assert.equal(rms(taut, 1000 + len, SR / 4), 0, 'and stops dead on its end');
  // The creak: stick-slip ticks ringing a narrow band 650 → 1050 Hz.
  const L = new Float32Array(SR / 4);
  const R = new Float32Array(SR / 4);
  armStretch(L, R, 1000, len, SR, { gain: 0.3, seed: 7007 });
  const L0 = new Float32Array(SR / 4);
  armStretch(L0, new Float32Array(SR / 4), 1000, len, SR, { gain: 0.3, creak: 0, seed: 7007 });
  const added = dB(rms(band(L, 600, 1200), 1000, 1000 + len)) - dB(rms(band(L0, 600, 1200), 1000, 1000 + len));
  assert.ok(added > 4, `the creak rings over the tone in its band: +${added.toFixed(1)} dB`);
  // It swells with the pull (tension = p by default).
  const swell = dB(rms(L, 1000 + 0.7 * len, 1000 + 0.95 * len)) - dB(rms(L, 1000 + 0.05 * len, 1000 + 0.3 * len));
  assert.ok(swell > 3, `swelling as it tightens: +${swell.toFixed(1)} dB`);
});

test('the whip: air whose band climbs with the swing’s speed and its own rise, its level following the speed, panned as told, cut on its last sample', () => {
  const len = Math.round(0.133 * SR);
  const make = (o) => {
    const L = new Float32Array(SR / 2);
    const R = new Float32Array(SR / 2);
    whip(L, R, 1000, len, SR, { gain: 0.3, seed: 7008, ...o });
    return { L, R };
  };
  const still = make({ speed: () => 0 });
  assert.equal(rms(still.L, 0, SR / 2) + rms(still.R, 0, SR / 2), 0, 'no speed, no sound');
  const w = make({ speed: () => 1, pan: (p) => (p < 0.5 ? -1 : 1) });
  assert.equal(rms(w.L, 0, 1000), 0, 'silent before its start');
  assert.equal(rms(w.L, 1000 + len, SR / 2) + rms(w.R, 1000 + len, SR / 2), 0, 'cut on its last sample (the hand lets go)');
  // Panned: the first half all left, the second right.
  const [a, m, e] = [1000, 1000 + Math.round(len / 2), 1000 + len];
  assert.equal(rms(w.R, a, m - 200), 0, 'hard left');
  assert.ok(rms(w.L, m + 200, e) < 1e-6 * rms(w.R, m + 200, e), 'then hard right');
  // Rising: brighter and louder at its end than at its start.
  const both = Float32Array.from(w.L, (v, i) => v + w.R[i]);
  const tilt = (x, y) => dB(rms(band(both, 2500), x, y)) - dB(rms(band(both, 300, 1000), x, y));
  const q = Math.round(len / 4);
  assert.ok(tilt(e - q, e) > tilt(a, a + q) + 10, `the band climbs: ${tilt(a, a + q).toFixed(1)} → ${tilt(e - q, e).toFixed(1)} dB (above 2.5 kHz − 0.3–1 kHz)`);
  assert.ok(dB(rms(both, e - q, e)) > dB(rms(both, a, a + q)) + 4, 'and swells into the release');
});

test('the needle drop: 80 ms of crackle over a soft thump, then nothing', () => {
  const b = new Float32Array(SR / 2);
  needleDrop(b, 500, SR, { gain: 0.3, seed: 7005 });
  assert.equal(rms(b, 0, 500), 0);
  assert.ok(rms(band(b, 1500), 500, 500 + 0.08 * SR) > 0.005, 'crackle');
  assert.ok(rms(lowpass(b, 150), 500, 500 + 0.05 * SR) > 0.01, 'a thump');
  assert.ok(rms(b, 500 + 0.2 * SR, 500 + 0.3 * SR) < 1e-4, 'gone by 200 ms');
});

test('the paper cut: noise swelling into its end sample, where it stops dead', () => {
  const b = new Float32Array(SR / 2);
  const end = 12000;
  paperCut(b, end, Math.round(0.067 * SR), SR, { gain: 0.2, seed: 7006 });
  assert.equal(rms(b, 0, end - Math.round(0.067 * SR)), 0);
  assert.ok(rms(b, end - 400, end) > 3 * rms(b, end - 3000, end - 2600), 'swelling');
  assert.equal(rms(b, end, end + 2000), 0, 'and stops on its end');
});

test('the house piano (M2): a struck string — on its pitch, its high partials dying first, its detuned copies apart, the damper down after its length', () => {
  const len = Math.round(0.067 * SR);
  const L = new Float32Array(SR / 2);
  const R = new Float32Array(SR / 2);
  housePiano(L, R, 1000, SR, { notes: [69], len, gain: 0.3, seed: 7009 });
  const m = Float32Array.from(L, (v, i) => 0.5 * (v + R[i]));
  assert.equal(rms(m, 0, 1000), 0, 'silent before its start');
  const p = pitch(lowpass(m, 600), 1000 + 0.01 * SR, 1000 + 0.06 * SR);
  assert.ok(near(p, 440, 0.02), `${p.toFixed(1)} Hz ≈ A4`);
  const tilt = (a, b) => dB(rms(band(m, 2500), a, b)) - dB(rms(m, a, b));
  const [strike, later] = [tilt(1000 + 0.002 * SR, 1000 + 0.012 * SR), tilt(1000 + 0.045 * SR, 1000 + 0.06 * SR)];
  assert.ok(strike > later + 3, `the high partials die first: ${strike.toFixed(1)} → ${later.toFixed(1)} dB above 2.5 kHz`);
  const side = Float32Array.from(L, (v, i) => 0.5 * (v - R[i]));
  assert.ok(rms(side, 1000, 1000 + len) > 0.05 * rms(m, 1000, 1000 + len), 'the two copies apart (the shimmer)');
  const end = 1000 + len + Math.round(0.045 * SR);
  assert.equal(rms(L, end, SR / 2) + rms(R, end, SR / 2), 0, 'the damper is down: nothing held');
});

test('the horn hit (M2): lipped up into its pitch, a blat louder and brighter than its body, falling off or ripping up on the release; a swell rises into its cut', () => {
  const len = Math.round(0.1 * SR);
  const make = (o) => {
    const L = new Float32Array(SR);
    const R = new Float32Array(SR);
    hornHit(L, R, 1000, SR, { notes: [69], len, gain: 0.3, seed: 7010, ...o });
    return Float32Array.from(L, (v, i) => 0.5 * (v + R[i]));
  };
  const plain = make({});
  assert.equal(rms(plain, 0, 1000), 0, 'silent before its start');
  const lo = (x) => lowpass(x, 550);
  const held = pitch(lo(plain), 1000 + 0.04 * SR, 1000 + 0.095 * SR);
  assert.ok(near(held, 440, 0.015), `held on A4: ${held.toFixed(1)} Hz`);
  const lip = pitch(lo(plain), 1000 + 0.002 * SR, 1000 + 0.013 * SR);
  assert.ok(lip < 0.995 * 440, `lipped up from under: ${lip.toFixed(1)} Hz`);
  const at5 = [1000 + 0.008 * SR, 1000 + 0.02 * SR];
  const body = [1000 + 0.06 * SR, 1000 + 0.095 * SR];
  assert.ok(dB(rms(plain, ...at5)) > dB(rms(plain, ...body)) + 2, `the blat: ${(dB(rms(plain, ...at5)) - dB(rms(plain, ...body))).toFixed(1)} dB over the body`);
  const tilt = ([a, b]) => dB(rms(band(plain, 2000), a, b)) - dB(rms(plain, a, b));
  assert.ok(tilt(at5) > tilt(body) + 2, `brighter as it blares: ${tilt(at5).toFixed(1)} → ${tilt(body).toFixed(1)} dB above 2 kHz`);
  const tail = [1000 + len + 0.09 * SR, 1000 + len + 0.13 * SR];
  const fall = pitch(lo(make({ fall: 5, releaseMs: 150 })), ...tail);
  const doit = pitch(lowpass(make({ fall: -3, releaseMs: 150 }), 700), ...tail);
  assert.ok(fall < 0.92 * 440, `SPLASH! falls off: ${fall.toFixed(1)} Hz`);
  assert.ok(doit > 1.06 * 440, `the throw rips up: ${doit.toFixed(1)} Hz`);
  const swell = make({ swell: 0.4 });
  assert.ok(dB(rms(swell, 1000 + len - 0.02 * SR, 1000 + len)) > dB(rms(swell, 1000 + 0.01 * SR, 1000 + 0.03 * SR)) + 5, 'the swell rises');
  assert.equal(rms(swell, 1000 + len, SR), 0, 'and is cut on its last sample (the hit cuts it)');
});

// ——— The section ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const at = (frame) => Math.round((frame / 60) * SR);
/** The club rendered alone into stems that start half a bar before club 1.1 (so "nothing before club 1.1" is measured) and run past the glass giving way. */
const ORIGIN = C.CLUB.from - 48;
const END = C.SMASH + 40;
const N = at(END) - at(ORIGIN);
const rel = (frame) => at(frame) - at(ORIGIN);
const fresh = () => {
  const s = { post: stereo(N), sub: new Float32Array(N) };
  for (const k of Object.keys(SENDS)) s[k] = stereo(N);
  return s;
};
const render = (opts = {}) => {
  const st = fresh();
  const ev = renderClub(st, SR, { origin: ORIGIN, ...opts });
  return { stems: st, events: ev };
};
const { stems, events } = render();
const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at).sort((a, b) => a - b);
const mixOf = (st) => mixClub(st, SR, { origin: ORIGIN });
const full = mixOf(stems);
const music = mixOf({ ...stems, post: undefined });
const mid = (m) => Float32Array.from(m.L, (v, i) => 0.5 * (v + m.R[i]));
/** Buses of a render summed, mid channel. */
const busMid = (st, names) => {
  const out = new Float32Array(N);
  for (const k of names) for (let i = 0; i < N; i++) out[i] += 0.5 * (st[k].L[i] + st[k].R[i]);
  return out;
};
const MUSIC_BUSES = Object.keys(SENDS);
const lufs = (m, a, b) => integratedLoudness(m.L.subarray(rel(a), rel(b)), m.R.subarray(rel(a), rel(b)), SR);
const club = C.club;

/** Every event the music places, by kind, on the score's frames (sheet §11's table, every row). */
const EXPECT = {
  clkick: C.KICKS,
  clflamkick: [C.FLAM],
  clsnare: C.CLAPS,
  clclapdouble: [C.HIGH_FIVE],
  clripple: [C.FIST_BUMP],
  clhat: C.HATS,
  clopenhat: C.OPEN_HATS,
  clride: C.RIDE,
  clfill: C.FILL,
  clpickup: C.PICKUPS,
  clroll: C.ROLL,
  clcrash: C.CRASHES,
  clsub: [C.CLUB.from],
  clstab: C.STABS,
  clhorn: [C.STOMP, C.BANDS[0], C.BANDS[1], C.SPLASH, C.THROW],
  clbrrr: C.ROLL.filter((f) => f < C.CLEAR),
  clswell: [C.CLEAR],
  clrun: [0, 1, 2, 3, 4, 5, 6, 7].map(C.reactionAt),
  clpluck: C.OPEN_HATS.filter((f) => f < C.DIP.from || f >= C.DIP.to),
  clarp: [C.ARP.from],
  clhook: hookNotes().map((h) => h.frame).filter((f) => f !== C.SCRATCH),
  cldot: [C.DOT_INKS],
  climpact: [C.DOT_INKS, C.THROW],
  clsungchord: [C.DOT_INKS],
  clratchet: [0, 1, 1, 2, 2, 3, 3, 4, 4].map((k) => C.PULL_BACK + k),
  clcrowdpop: [0, 2, 2, 4, 4, 6, 6, 8, 8].map((k) => C.CROWD_UP + k),
  clboom: [C.STOMP],
  clpaper: [C.CORNER_BOX],
  clribbon: [C.TAGLINE],
  clzip: C.LEAPS.map((l) => l.from),
  clshk: C.LEAPS.map((l) => l.to),
  clthup: C.LEAPS.map((l) => l.to),
  clband: [C.BANDS[0], C.BANDS[1]],
  clslap: [C.HIGH_FIVE],
  clplink: C.INFECTIONS,
  clspark: [C.SPARK.from],
  clting: [C.TING],
  clscratch: [C.SCRATCH],
  clrevcym: [C.RECORD, C.MATCH_CUP, C.KICK_CUP, C.THROW, C.HIT],
  cldive: [C.RECORD],
  clletter: [6, 8, 10, 12].map((d) => C.DIVE.from + d),
  clneedle: [C.RECORD],
  clbells: [C.SWAP, C.FLOWER, C.RISE.from],
  clscan: [C.SCAN_SWEEP.from],
  clrise: [C.MATCH_CUP],
  cldip: [C.DIP.from],
  clbloop: [C.MATCH_CUP, C.SHADES],
  clthunk: [C.MATCH_CUP],
  cllick: C.VILLAIN_LICKS,
  clshades: [C.SHADES],
  clballoon: [C.SCAN_BALLOON.from],
  cltick: C.SCANNER_TICKS,
  clzoom: [C.CRASH_ZOOM.to],
  cllock: [C.LOCK],
  clblip: C.DATA_BLIPS,
  cloh: [C.NOTICE],
  clclink: [C.KICK_CUP],
  clpow: [C.KICK_CUP],
  clswoosh: [C.KICK_CUP],
  clsplash: [C.SPLASH],
  cldroplet: [2, 5, 8].map((d) => C.SPLASH + d),
  cllightsout: [C.LIGHTS_OUT],
  clzzt: [C.RED_EYES],
  clpowerdown: [C.RED_EYES],
  clplates: [C.PLATES.to],
  clgrab: [C.GRAB],
  clgrowl: [C.GRAB],
  clstretch: [C.GRAB],
  clwhip: [B.SWING.to],
  clthrow: [C.THROW],
  clwaa: [C.THROW],
  clstamp: [C.THROW],
  clsnap: [C.BORDER_SNAP],
  clreaction: [0, 1, 2, 3, 4, 5, 6, 7].map(C.reactionAt),
  clriser: [club(6)],
  clfwip: C.ROLL.slice(0, 6),
  d1crack: [C.HIT],
  d1shatter: [C.SMASH],
  // Continuity plan v07: the cosmos's glass carried through club bar 1, the print's thwack on every clap, the needle bumped on the record's kicks.
  clcarrytink: CARRY_TINKS.map((t) => t.at),
  clthwack: C.CLAPS,
  clneedlebump: C.KICKS.filter((f) => f > C.RECORD && f < C.MATCH_CUP),
};

test('every sound lands on its picture’s frame: each kind’s events are the score’s frames, sample = frame × 800', () => {
  for (const [kind, frames] of Object.entries(EXPECT)) assert.deepEqual(of(kind), [...frames].sort((a, b) => a - b).map((f) => f * 800), kind);
  const kinds = new Set(events.map((e) => e.kind));
  assert.deepEqual([...kinds].filter((k) => !(k in EXPECT)), [], 'no event outside the table');
  for (const k of kinds) assert.ok(k.startsWith('cl') || k === 'd1crack' || k === 'd1shatter', `${k}: the club's kinds start with cl (the v04 glass keeps drop 1's)`);
});

test('the hooks bgm.mjs reads: a cut and a silence on the hit, the club’s own buses, previews of both joins', () => {
  assert.deepEqual(CUTS, [C.HIT]);
  assert.deepEqual(SILENCES, [{ from: C.HIT, to: C.SMASH }]);
  for (const name of Object.keys(SENDS)) assert.ok(name.startsWith('cl'), `${name}: the club's own bus`);
  assert.ok(SENDS.clDry <= 0.05, 'the antivirus is dry (M9)');
  assert.equal(SENDS.clSub, 0);
  assert.equal(SENDS.clBass, 0);
  assert.deepEqual(PREVIEWS.map((p) => p.id), ['ink', 'glass']);
  assert.deepEqual([PREVIEWS[0].fromBar, PREVIEWS[0].toBar], [partBar('cosmos', 6), partBar('club', 2)]);
  assert.deepEqual([PREVIEWS[1].fromBar, PREVIEWS[1].toBar], [partBar('club', 6), partBar('break', 1)]);
});

test('the hook: HOOK[3] and HOOK[4] from drop 1’s table (never retyped), then PEAK, its ceiling G6; silent from club 4.1', () => {
  assert.equal(HOOK_ROWS[0], HOOK[3]);
  assert.equal(HOOK_ROWS[1], HOOK[4]);
  assert.equal(HOOK_ROWS[2], PEAK);
  assert.deepEqual(PEAK, [[0, 84, 1], [1, 88, 1], [2, 91, 2], [4, 88, 1], [5, 86, 1], [6, 84, 2], [8, 83, 3], [11, 84, 1], [12, 88, 4]]);
  assert.ok(PEAK.every(([, m]) => m <= 91), 'ceiling G6');
  const notes = hookNotes();
  assert.equal(notes.length, HOOK[3].length + HOOK[4].length + PEAK.length);
  for (const h of notes) {
    const row = HOOK_ROWS[h.bar - 1].find(([s]) => club(h.bar) + s * 6 === h.frame);
    assert.ok(row, `${h.frame} is a note of its row`);
    assert.equal(h.midi, row[1]);
    assert.ok(h.frame >= C.HOOK.from && h.frame < C.HOOK.to);
  }
  // The cat DJ scratches the hook's last note (club 2.4&): that note is the scratch, not sung again.
  assert.ok(notes.some((h) => h.frame === C.SCRATCH), 'the last note of HOOK[4] falls on the scratch');
});

test('the harmony: IV · Vsus → V · iii · vi · IV → V on the throw · iii → vi on club 6.3; the sub plays each root', () => {
  for (const { at: f, chord } of C.CHORDS) assert.equal(chordAt(f), chord);
  assert.deepEqual(ROOT, { IV: 34, Vsus: 36, V: 36, iii: 33, vi: 38 });
  const x = lowpass(busMid(render({ solo: (k) => k === 'clsub' }).stems, ['clSub']), 150);
  const cuts = [...C.CHORDS.map((c) => c.at), C.HIT];
  C.CHORDS.forEach(({ at: f, chord }, k) => {
    if (cuts[k + 1] - f < 24) return;
    const p = pitch(x, rel(f + 8), rel(cuts[k + 1] - 2));
    assert.ok(near(p, midiHz(ROOT[chord]), 0.03), `${chord} from ${f}: the sub at ${p.toFixed(1)} Hz, root ${midiHz(ROOT[chord]).toFixed(1)}`);
  });
});

test('the music starts on club 1.1 and is cut dead on the hit: digital zero before, and from the hit on (post excluded) through the glass silence', () => {
  for (const name of MUSIC_BUSES) {
    for (const ch of ['L', 'R']) {
      const b = stems[name][ch];
      assert.equal(rms(b, 0, rel(C.CLUB.from)), 0, `${name} before club 1.1`);
      assert.equal(rms(b, rel(C.HIT), N), 0, `${name} from the hit`);
    }
  }
  assert.equal(rms(music.L, rel(C.HIT), rel(C.SMASH)), 0, 'the mix without the glass is silent in the glass silence');
  assert.equal(rms(music.R, rel(C.HIT), rel(C.SMASH)), 0);
  assert.ok(rms(full.L, rel(C.HIT), rel(C.HIT + 6)) > 0.02, 'the hit itself is heard (post)');
});

test('no click on the cut: the largest step at the hit is under the music’s own steps just before it', () => {
  const m = mid(music);
  const step = (a, b) => {
    let mx = 0;
    for (let i = a + 1; i < b; i++) mx = Math.max(mx, Math.abs(m[i] - m[i - 1]));
    return mx;
  };
  assert.ok(step(rel(C.HIT) - 72, rel(C.HIT) + 200) <= step(rel(C.HIT) - 2400, rel(C.HIT) - 72), 'the 1.5 ms ramp');
});

/**
 * v04's glass on the post bus (the old sections/drop1.mjs on the 58-bar map, where drop 1's hit lay 2 bars before its smash), hashed when
 * the club went live and drop1.mjs stopped drawing it (sha256 of the Float32 samples, L then R): the hit's beat from the hit, and the
 * glass giving way from the smash with nothing else ringing (0.6 s). Measured equal to the club's own render on the day (club-integ).
 */
const V04_GLASS = { hit: '4698d6cc1d2a5cb07318f7516946a99270de3596e16fe94c38e0b8b2da0400be', gives: '03a93b598f4bed7cf636954e312fd2bf2da91ea7110b94f5a0562b5259873527' };
const sha = (...arrs) => {
  const h = createHash('sha256');
  for (const a of arrs) h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  return h.digest('hex');
};

test('the glass beat sounds exactly as v04: the hit, the cracks and the creak on club 6.4, the glass giving way on break 1.1', () => {
  const beat = at(24);
  const s = Math.round(0.6 * SR);
  assert.ok(N - rel(C.SMASH) >= s, 'the render runs 0.6 s past the smash');
  // The glass giving way alone (on the club's map its hit lies a beat before the smash, so its impact's tail would reach it; in v04 it did not).
  const gives = render({ solo: (k) => k === 'd1shatter' }).stems.post;
  const slice = (b, f, len) => [b.L.slice(rel(f), rel(f) + len), b.R.slice(rel(f), rel(f) + len)];
  assert.equal(sha(...slice(stems.post, C.HIT, beat)), V04_GLASS.hit, "the hit's beat: v04's samples");
  assert.equal(sha(...slice(gives, C.SMASH, s)), V04_GLASS.gives, 'the glass gives: v04’s samples');
});

/**
 * The ending kept (the glass into break 1 FALL, the seam to keep): bgm.mjs limits the whole mix at once, so the glass on the post
 * bus is heard through the master limiter's recovery from the club's last frames. The old club's pad held the limiter 3.29 dB down at the
 * hit; the swell into the hit (HIT_SWELL) is set to stand it in the same place, so the glass is heard as it was. Measured before M2,
 * 2026-10-03: the limiter's gain over the glass (mix ÷ (post × trim), dB) in windows from the hit — 0–10, 10–50, 50–100, 100–200 and
 * 200–400 ms (the glass silence). Since continuity plan v07 the plate no longer restarts on club 1.1 (the cosmos's room rings on into the
 * club), so the club alone (its own plate from club 1.1) no longer is the film: the gain is measured in the film's own mix (bgm.mjs
 * mixdown of every part from frame 0 to just past the hit), and HIT_SWELL is calibrated there (WP1's scratch calibfilm.mjs: a search on
 * the 0–10 ms window; the film's bgm from the hit on then matches the v06 mix to 0.001 LSB).
 */
const OLD_GLASS_GAIN = [-3.0658, -2.1689, -1.1648, -0.4693, -0.0943];

test('the glass is heard as it was (M2 keeps the ending): through the glass silence the film limiter’s gain on the glass is the old club’s within 0.003 dB', () => {
  // The film from frame 0 to a beat past the hit (every part before the break: the limiter and the plate see what the film's do).
  const { stems: film } = renderStems(SR, at(C.HIT + 24));
  const m = mixdown(film, SR);
  const trim = 10 ** (MASTER_TRIM_DB / 20);
  const H = at(C.HIT);
  assert.ok(clubAlone(SR).L.length === at(C.SMASH) - at(C.CLUB.from), 'the club alone runs to the smash');
  [[0, 10], [10, 50], [50, 100], [100, 200], [200, 400]].forEach(([a, b], k) => {
    let p = 0;
    let q = 0;
    for (let i = H + Math.round((a / 1000) * SR); i < H + Math.round((b / 1000) * SR); i++) {
      p += (film.post.L[i] ** 2 + film.post.R[i] ** 2) * trim * trim;
      q += m.L[i] ** 2 + m.R[i] ** 2;
    }
    const g = 10 * Math.log10(q / p);
    assert.ok(Math.abs(g - OLD_GLASS_GAIN[k]) <= 0.003, `${a}–${b} ms after the hit: ${g.toFixed(4)} dB, the old club ${OLD_GLASS_GAIN[k]}`);
  });
  assert.ok(HIT_SWELL.gain > 0 && HIT_SWELL.from < 1, 'the swell is what holds it');
  assert.equal(LIMIT_DB, -1.5, 'measured against this limit');
});

test('bar 4 is heard from the bar: hook / piano / arp / pluck rest, the floor’s tails muffled across the cut, the drums untouched', () => {
  for (const kind of ['clhook', 'clstab', 'clpluck', 'clhorn', 'clbrrr']) assert.ok(of(kind).every((s) => s < at(C.DIP.from) || s >= at(C.DIP.to)), `${kind} rests in bar 4`);
  const arp = busMid(render({ solo: (k) => k === 'clarp' }).stems, ['clArp']);
  assert.equal(rms(arp, rel(C.DIP.from) + 200, rel(C.DIP.to)), 0, 'the arp rests');
  const piano = busMid(render({ solo: (k) => k === 'clstab' }).stems, ['clPiano']);
  assert.equal(rms(piano, rel(C.DIP.from), rel(C.DIP.to)), 0, 'no piano in the bar');
  // What still rings of the club across the cut (the hook's ping-pong echo, about 13 dB under the hook itself) is muffled: the voice bus
  // 28 dB under its last beat of bar 3 from a 16th after the cut until "oh?" (unmuffled: 24 dB).
  const vox = busMid(render({ solo: (k) => k === 'clhook' }).stems, ['clVox']);
  const drop = dB(rms(vox, rel(club(3, 3)), rel(C.MATCH_CUP))) - dB(rms(vox, rel(C.MATCH_CUP + 6), rel(C.MATCH_CUP + 30)));
  assert.ok(drop > 28, `the hook's echo muffled: ${drop.toFixed(1)} dB under bar 3's last beat`);
  const k = busMid(render({ solo: (kind) => kind === 'clkick' || kind === 'clsnare' }).stems, ['clDrums']);
  const peak = (f) => k.subarray(rel(f), rel(f) + 2400).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  for (let b = 0; b < 4; b++) assert.ok(Math.abs(dB(peak(club(4, b))) - dB(peak(club(3, b)))) < 0.5, `beat ${b + 1}: the drums as loud as bar 3's`);
});

// ——— The harmony since 2026-10-03 (a sustained chord bed reads as noise): no chord held —————————————————————————————————————————————————————————————
// The old club's supersaw pad (7 saws × 7 notes from club 1.1 to the hit) sounded — within 15 dB of the mix — in 100 % of its 100 ms
// windows, about as loud as the drums, and held the master limiter 3–5 dB down through all six bars; its 35-saw stabs in 75 %.

/** The club's chord voices (M2): the piano (the stabs, the balloons' run) and the horns (the words, the throw, the BRRR, the swell). */
const CHORD_KINDS = ['clstab', 'clrun', 'clhorn', 'clbrrr', 'clswell'];
const chordStems = render({ solo: (k) => CHORD_KINDS.includes(k) }).stems;
/** The chord voices against the whole mix in 100 ms windows over [a, b) (frames): each window's level re the mix (dB). */
const chordWindows = (a, b) => {
  const w = Math.round(0.1 * SR);
  const pw = (L, R, i) => {
    let q = 0;
    for (let j = i; j < i + w; j++) q += 0.5 * (L[j] * L[j] + R[j] * R[j]);
    return q / w;
  };
  const out = [];
  for (let i = rel(a); i + w <= rel(b); i += w) {
    const c = MUSIC_BUSES.reduce((q, k) => q + pw(chordStems[k].L, chordStems[k].R, i), 0);
    out.push(10 * Math.log10(c + 1e-20) - 10 * Math.log10(pw(full.L, full.R, i) + 1e-20));
  }
  return out;
};
/** The share of windows within `db` of the mix, and the longest run of them (beats). */
const sounding = (levels, db) => {
  let on = 0;
  let run = 0;
  let best = 0;
  for (const d of levels) {
    if (d > -db) {
      on++;
      best = Math.max(best, ++run);
    } else run = 0;
  }
  return { share: on / levels.length, beats: (best * 0.1) / (24 / 60) };
};

test('no constant chord wall (M2): no pad, no supersaw; the chord voices sound — within 15 dB of the mix — in ≤ 50 % of 100 ms windows, at most a beat in a row in bars 1–5 (the throw’s rip) and 2 beats in bar 6 (the BRRR into the hit)', () => {
  assert.ok(!('clPad' in SENDS) && !('clStab' in SENDS), 'the pad and the supersaw stabs are gone');
  assert.ok(!events.some((e) => e.kind === 'clchord'), 'no chord is placed to be held');
  const all = sounding(chordWindows(club(1, 1), C.HIT), 15);
  assert.ok(all.share <= 0.5, `the chord voices in ${(100 * all.share).toFixed(0)} % of the windows`);
  const early = sounding(chordWindows(club(1, 1), club(6)), 15);
  assert.ok(early.beats <= 1, `bars 1–5: ${early.beats.toFixed(2)} beats in a row`);
  assert.ok(all.beats <= 2, `bar 6: ${all.beats.toFixed(2)} beats in a row`);
  // Struck, not held: between two stabs at least 3 sixteenths apart the piano falls 20 dB from its strike before the next.
  const piano = busMid(render({ solo: (k) => k === 'clstab' }).stems, ['clPiano']);
  const w = Math.round(0.03 * SR);
  C.STABS.forEach((f, k) => {
    const next = C.STABS[k + 1];
    if (next === undefined || next - f < 18) return;
    const strike = rms(piano, rel(f), rel(f) + w);
    const before = rms(piano, rel(next) - w, rel(next));
    assert.ok(dB(before) <= dB(strike) - 20, `stab ${f}: ${(dB(strike) - dB(before)).toFixed(1)} dB down before the next`);
  });
  // The sends short of a held chord (a long plate tail on every stab is the held chord again): the piano and the brass have a room since
  // continuity plan v07 (FW4: the club was a dry island between two glass worlds), at most the cosmos's bells' 0.35; the BRRR's horns 0.12.
  assert.ok(SENDS.clPiano <= 0.25 && SENDS.clBrass <= 0.25 && SENDS.clHorn <= 0.15, 'the chord voices short of a held chord');
});

test('the chords on the drawn: the piano on every STABS frame (the tiles, the grooves), the horns on the lettered words and the throw, the run on the balloons, a BRRR blip a letter', () => {
  assert.equal(PIANO.frames, 4);
  for (const f of C.STABS) assert.ok(f >= C.CLUB.from && f < C.MATCH_CUP, 'bars 1–3');
  assert.deepEqual(HORNS.map((h) => h.at), [C.STOMP, C.BANDS[0], C.BANDS[1], C.SPLASH, C.THROW]);
  assert.deepEqual(TIER_A.map((t) => t.at), HORNS.slice(0, 4).map((h) => h.at), 'a horn on every Tier A word (and the throw), nowhere else');
  for (const h of HORNS) {
    const c = chordAt(h.at);
    assert.deepEqual(hornNotes(h.at), [ROOT[c] + 24, ...VOICINGS[c].map((m) => m + 12)], `${h.at}: the root two octaves over the sub, the voicing an octave up`);
  }
  assert.equal(chordAt(C.THROW), 'V', 'the throw’s horns on C9');
  assert.ok(HORNS.find((h) => h.at === C.SPLASH).fall > 0 && HORNS.find((h) => h.at === C.THROW).fall < 0, 'SPLASH! falls off, the throw rips up');
  // Every chord voice is heard where it is drawn.
  const solo = (kind) => busMid(render({ solo: (k) => k === kind }).stems, MUSIC_BUSES);
  for (const [kind, f] of [['clstab', C.STABS[1]], ['clhorn', C.STOMP], ['clhorn', C.THROW], ['clrun', C.reactionAt(0)], ['clbrrr', C.ROLL[0]], ['clswell', C.CLEAR]]) {
    assert.ok(rms(solo(kind), rel(f), rel(f) + 2400) > 1e-3, `${kind} at +${f - C.CLUB.from}`);
  }
  assert.equal(rms(solo('clhorn'), 0, rel(C.STOMP)), 0, 'no horn before BOOM');
  // BRRR: a blip a letter, growing; Am9, then Dm9 from 6.3.
  assert.ok(BRRR.to > BRRR.from, 'growing up the roll');
  assert.deepEqual([...new Set(C.ROLL.filter((f) => f < C.CLEAR).map(chordAt))], ['iii', 'vi']);
  assert.ok(RUN.frames <= 24, 'the run rings under a beat before its damper');
});

test('the lights go out on the chords: from the lights out to the throw no chord voice sounds (SPLASH!’s fall is gone by then); the horns snap on with C9 on the throw', () => {
  const chords = busMid(chordStems, MUSIC_BUSES);
  assert.equal(rms(chords, rel(C.LIGHTS_OUT), rel(C.THROW)), 0, 'dark');
  assert.ok(rms(chords, rel(C.THROW), rel(C.THROW + 6)) > 0.01, 'the throw’s horns');
});

test('the hook leads as it does through the cosmos: each note sung at one level with the cosmos’s numbers (the seam keeps its level), 3–10 dB under the drums', () => {
  assert.deepEqual([HOOK_LEVEL.noteDb, HOOK_LEVEL.maxBoostDb, HOOK_LEVEL.liftDb], [HOOK_NOTE_DB, HOOK_MAX_BOOST_DB, HOOK_LIFT_DB]);
  const vox = busMid(render({ solo: (k) => k === 'clhook' }).stems, ['clVox']);
  const drums = busMid(stems, ['clDrums']);
  for (let b = 1; b <= 3; b++) {
    const d = dB(rms(drums, rel(club(b)), rel(club(b + 1)))) - dB(rms(vox, rel(club(b)), rel(club(b + 1))));
    assert.ok(d >= 3 && d <= 10, `bar ${b}: the hook ${d.toFixed(1)} dB under the drums`);
  }
});


test('Tier A words (BOOM, the BOOM bands, SPLASH!): the bed ducks 3–6 dB under each, the drums and the sub do not', () => {
  const dry = render({ ducks: false }).stems;
  const BED = MUSIC_BUSES.filter((k) => !['clDrums', 'clSub', 'clEgg', 'clBrass'].includes(k));
  assert.deepEqual(TIER_A.map((t) => t.at), [C.STOMP, C.BANDS[0], C.BANDS[1], C.SPLASH]);
  for (const t of TIER_A) {
    assert.ok(t.depthDb >= 3 && t.depthDb <= 6 && t.holdMs + t.releaseMs >= 40 && t.holdMs + t.releaseMs <= 120, 'within the bible’s 3–6 dB over 40–80 ms');
    const a = rel(t.at) + 20;
    const b = rel(t.at) + Math.round((t.holdMs / 1000) * SR);
    const ducked = rms(busMid(stems, BED), a, b);
    const open = rms(busMid(dry, BED), a, b);
    assert.ok(Math.abs(dB(open) - dB(ducked) - t.depthDb) < 0.6, `the bed under ${t.kind}: ${(dB(open) - dB(ducked)).toFixed(1)} dB`);
    assert.equal(rms(busMid(stems, ['clDrums']), a, b), rms(busMid(dry, ['clDrums']), a, b), 'the drums untouched');
  }
});

test('the BOOM out of the floor: an 808 tuned to the bar’s root B♭1 under the kick, the sub ducked out of its way', () => {
  const x = busMid(render({ solo: (k) => k === 'clboom' }).stems, MUSIC_BUSES);
  const p = pitch(lowpass(x, 120), rel(C.STOMP) + 0.08 * SR, rel(C.STOMP) + 0.3 * SR);
  assert.ok(near(p, midiHz(34), 0.03), `${p.toFixed(1)} Hz ≈ B♭1`);
  const sub = busMid(render({ solo: (k) => k === 'clsub' }).stems, ['clSub']);
  assert.ok(rms(sub, rel(C.STOMP) + 0.03 * SR, rel(C.STOMP) + 0.2 * SR) < 0.25 * rms(sub, rel(C.STOMP) - 0.2 * SR, rel(C.STOMP) - 0.05 * SR), 'the sub steps aside');
});

test('the antivirus answers in its own dry voice: the villain lick on vi, the scan a beat late on C, the ticks climbing C6 → F♯6 in place of the hats', () => {
  assert.ok(of('clhat').every((s) => s < at(C.SCANNER_TICKS[0]) || s > at(C.SCANNER_TICKS.at(-1))), 'no closed hat under the ticks');
  assert.ok(!of('clopenhat').includes(at(C.SCRATCH)), 'the scratch takes 2.4&’s open hat');
  const t = busMid(render({ solo: (k) => k === 'cltick' }).stems, ['clDry']);
  C.SCANNER_TICKS.forEach((f, k) => {
    const p = pitch(lowpass(t, 2600), rel(f) + 30, rel(f) + Math.round(0.013 * SR));
    assert.ok(near(p, midiHz(84 + k), 0.04), `tick ${k + 1}: ${p.toFixed(0)} Hz ≈ ${midiHz(84 + k).toFixed(0)}`);
  });
  assert.equal(C.SCAN_SWEEP.from - C.SWAP, 24, 'the scan a beat after the clap');
  const scan = busMid(render({ solo: (k) => k === 'clscan' }).stems, ['clDry']);
  const end = pitch(scan, rel(C.SCAN_SWEEP.to) - 300, rel(C.SCAN_SWEEP.to) - 2);
  assert.ok(near(end, midiHz(84), 0.06), `the sweep ends on C6: ${end.toFixed(0)}`);
  const lick = lowpass(busMid(render({ solo: (k) => k === 'cllick' }).stems, ['clDry']), 200);
  for (const [f, notes] of [[C.VILLAIN_LICKS[0], [50, 45]], [C.VILLAIN_LICKS[1], [45, 38]]]) {
    notes.forEach((m, k) => {
      const p = pitch(lick, rel(f + 6 * k) + 0.03 * SR, rel(f + 6 * k) + 0.09 * SR);
      assert.ok(near(p, midiHz(m), 0.03), `lick at ${f}, note ${k + 1}: ${p.toFixed(1)} Hz`);
    });
  }
});

test('the small words are heard: ting! and CLINK! stand out in their band (solo against the mix)', () => {
  for (const [kind, f, lo, hi, within] of [['clting', C.TING, 3800, 4600, 10], ['clclink', C.KICK_CUP, 2400, 3800, 6]]) {
    const solo = mid(mixOf(render({ solo: (k) => k === kind }).stems));
    const a = rel(f);
    const b = a + Math.round(0.06 * SR);
    const s = rms(band(solo, lo, hi), a, b);
    const m = rms(band(mid(full), lo, hi), a, b);
    assert.ok(dB(s) > dB(m) - within, `${kind}: ${dB(s).toFixed(1)} dB against the mix's ${dB(m).toFixed(1)} dB in ${lo}–${hi} Hz`);
  }
});

/** The guest's fist on screen at instant g of the throw (clubInkB.ts's staging; a stand-in advance: none is read before the release). */
const fistX = (g) => B.throwPose(g, (ch) => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6)).hand[0];

test('the throw heard move by move (U2, T11): the arm stretches on the haul, the whip follows the fist round the loop and is cut on the release', () => {
  // On the picture's staging: the stretch from the grab to the loop's start, the whip from there to the throw, nothing of either outside.
  const st = render({ solo: (k) => k === 'clstretch' }).stems.clDry;
  const wh = render({ solo: (k) => k === 'clwhip' }).stems.clFx;
  for (const [name, b, a, e] of [['the stretch', st, C.GRAB, B.SWING.from], ['the whip', wh, B.SWING.from, C.THROW]]) {
    for (const ch of ['L', 'R']) {
      assert.equal(rms(b[ch], 0, rel(a)), 0, `${name} starts on its frame`);
      assert.equal(rms(b[ch], rel(e), N), 0, `${name} ends on its frame`);
    }
    assert.ok(rms(b.L, rel(a), rel(e)) > 0.003, `${name} sounds`);
  }
  // The whip rises into the release: its last quarter at least 6 dB over its first.
  const w = Float32Array.from(wh.L, (v, i) => 0.5 * (v + wh.R[i]));
  const q = Math.round((rel(C.THROW) - rel(B.SWING.from)) / 4);
  assert.ok(dB(rms(w, rel(C.THROW) - q, rel(C.THROW))) > dB(rms(w, rel(B.SWING.from), rel(B.SWING.from) + q)) + 6, 'rising');
  // … panned with the fist: frame by frame, its balance (R − L) follows the fist's x round the loop (the bible's x / 960 × 0.9).
  const frames = Array.from({ length: C.THROW - B.SWING.from }, (_, k) => B.SWING.from + k);
  const bal = frames.map((f) => dB(rms(wh.R, rel(f), rel(f + 1))) - dB(rms(wh.L, rel(f), rel(f + 1))));
  const xs = frames.map((f) => fistX(f + 0.5));
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const [mb, mx] = [mean(bal), mean(xs)];
  const r = bal.reduce((s, b, k) => s + (b - mb) * (xs[k] - mx), 0) / Math.sqrt(bal.reduce((s, b) => s + (b - mb) ** 2, 0) * xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  assert.ok(r > 0.9, `the balance follows the fist: r = ${r.toFixed(2)} (${bal.map((b) => b.toFixed(1)).join(' ')} dB)`);
  // Heard, as a Tier B sound is, and the throw whoosh under the whip in the loop's band. The bible's Tier B rule (within 6 dB of the bed
  // in its band) was set against the pad; with no chord held (M2) the rest of the mix in the stretch's upper band is thinner and the
  // stretch, unchanged, stands about 10 dB over it there: heard over the rest of its band (≥ −6 dB), not shouting (≤ +12 dB).
  const others = (kind) => mid(mixOf(render({ solo: (k) => k !== kind }).stems));
  const alone = (kind) => mid(mixOf(render({ solo: (k) => k === kind }).stems));
  for (const [kind, a, e, lo, hi] of [['clstretch', C.GRAB + 2, B.SWING.from, 150, 600], ['clstretch', C.GRAB + 2, B.SWING.from, 600, 1600], ['clwhip', B.SWING.from, C.THROW, 1000, 5000]]) {
    const [x0, x1] = [rel(a), rel(e)];
    const s = dB(rms(band(alone(kind), lo, hi), x0, x1));
    const bed = dB(rms(band(others(kind), lo, hi), x0, x1));
    assert.ok(s - bed >= -6 && s - bed <= 12, `${kind}: ${s.toFixed(1)} dB against the rest's ${bed.toFixed(1)} in ${lo}–${hi} Hz`);
  }
  const loop = (kind) => rms(band(alone(kind), 1000, 5000), rel(B.SWING.from), rel(C.THROW));
  assert.ok(dB(loop('clwhip')) > dB(loop('clthrow')) + 3, 'the loop is heard over the throw whoosh');
  assert.ok(!TIER_A.some((t) => t.kind === 'clstretch' || t.kind === 'clwhip'), 'neither ducks the bed');
});

/** Drop 1 brighter than the build's end (tests/drop1Audio.test.mjs): club bar 1 ≥ riso 4 − 1 dB above 2 kHz, riso 4 as recorded when the club went live. */
const RISO4_ABOVE_2K = -22.59;

test('club bar 1 keeps half a dB over drop 1’s brightness limit in its own buses (R11), its first beat untouched', () => {
  assert.ok(BAR1_AIR > 1, 'bar 1’s hats carry more air than bar 2’s');
  const highDb = (x, a, b) => {
    const f = [Biquad.highpass(SR, 2000), Biquad.highpass(SR, 2000)];
    let s = 0;
    for (let i = Math.max(0, a - 4800); i < b; i++) {
      const y = f.reduce((v, g) => g.process(v), x[i]);
      if (i >= a) s += y * y;
    }
    return 10 * Math.log10(s / (b - a));
  };
  const m = mid(full);
  const bar1 = highDb(m, rel(club(1)), rel(club(2)));
  // M2 took the pad's top octaves (to A6, open to 9 kHz) out of the bar, about 0.5 dB less above 2 kHz: BAR1_AIR (1.25 → 1.4) gives
  // the bar's hats part of it back.
  assert.ok(bar1 >= RISO4_ABOVE_2K - 1 + 0.5, `club 1: ${bar1.toFixed(2)} dB above 2 kHz, limit ${(RISO4_ABOVE_2K - 1).toFixed(2)}`);
  // The first beat (the tier-2 hit) has no more air than drop 1's hats give it.
  const plain = (kind) => kind === 'clhat' || kind === 'clopenhat';
  const hats = busMid(render({ solo: plain }).stems, ['clDrums']);
  // Continuity plan v07: club bar 1's closed hats fade in under the cosmos's carried glass (hatFadeIn: −9, −6, −3 dB, full on 1.4), so its
  // air over bar 2's is its last beat's; its first beat stays under the rest.
  const closed = busMid(render({ solo: (k) => k === 'clhat' }).stems, ['clDrums']);
  const beat = (b) => rms(closed, rel(club(1, b)), rel(club(1, b + 1)));
  const last = rms(hats, rel(club(1, 3)), rel(club(2)));
  const bar2 = rms(hats, rel(club(2)), rel(club(2, 1)));
  assert.ok(dB(last) - dB(bar2) > 1.5, `bar 1's last beat of hats over bar 2's first: ${(dB(last) - dB(bar2)).toFixed(1)} dB`);
  for (let b = 1; b < 4; b++) assert.ok(dB(beat(b)) - dB(beat(b - 1)) > 1.5, `the hats fade in: beat ${b + 1} ${(dB(beat(b)) - dB(beat(b - 1))).toFixed(1)} dB over beat ${b}`);
  assert.deepEqual([0, 1, 2, 3].map((b) => +(20 * Math.log10(hatFadeIn(club(1, b)))).toFixed(6)), [-9, -6, -3, 0]);
  assert.equal(hatFadeIn(club(2)), 1);
});

/**
 * The club keeps its place in the film (M2, LEVEL_DB): the old club's −10.5 LUFS (bars −10.2 −10.1 −10.0 −12.0 −10.35 · 6 −10.2), louder
 * than the quieter new cosmos (−11.1) as it was, the interlude 3 LU under drop 1 (tests/breakAudio.test.mjs), its loudest beat under the
 * cosmos's Big Bang (tests/cosmosAudio.test.mjs). Bars 1–3 at the top, bar 4 2 LU under them (heard from the bar), bar 5 just under, bar
 * 6 a build — quieter as the page recedes, louder each beat, its last beat (the 32nd BRRR and the swell into the hit) over bars 1–3.
 */
test('loudness (master scale, M2): bars 1–3 ≈ −10.3, bar 4 2 LU under them, bar 5 ≈ −10.4, bar 6 building into the hit; the part the old club’s −10.5 ± 0.3', () => {
  const bars = [1, 2, 3, 4, 5].map((b) => lufs(full, club(b), club(b + 1)));
  const six = lufs(full, club(6), C.HIT);
  const part = lufs(full, C.CLUB.from, C.CLUB.to);
  const beats = [0, 1, 2].map((k) => lufs(full, club(6, k), club(6, k + 1)));
  const report = `bars ${bars.map((v) => v.toFixed(2)).join(' ')} · 6 ${six.toFixed(2)} (beats ${beats.map((v) => v.toFixed(2)).join(' ')}) · part ${part.toFixed(2)}`;
  for (const b of [0, 1, 2]) assert.ok(Math.abs(bars[b] + 10.3) <= 0.4, `bar ${b + 1}: ${report}`);
  const top = (bars[0] + bars[1] + bars[2]) / 3;
  assert.ok(top - bars[3] >= 1.5 && top - bars[3] <= 2.5, `bar 4 is 2 LU under: ${report}`);
  assert.ok(Math.abs(bars[4] + 10.4) <= 0.4, `bar 5: ${report}`);
  assert.ok(beats[0] < beats[1] && beats[1] < beats[2] && beats[2] >= top, `bar 6 builds into the hit: ${report}`);
  assert.ok(Math.abs(six + 11) <= 0.5, `bar 6: ${report}`);
  assert.ok(Math.abs(part + 10.5) <= 0.3, `part: ${report}`);
  assert.ok(LEVEL_DB > 0 && LEVEL_DB <= 2, 'the club’s voices lifted into the master as one');
  assert.ok(truePeakDb(full.L, full.R) <= -2.0, `true peak ${truePeakDb(full.L, full.R).toFixed(2)} dBTP`);
  assert.ok(lowCorrelation(full.L, full.R, SR) >= 0.99, 'the lows are mono');
});

// On v08 (2026-10-03) the cosmos's bang went down 2 dB (sections/cosmos.mjs BANG_TRIM: the very start of the cosmos was too loud):
// in LUFS club 1.1 (−9.9) now measures over it (−11.36), so the tier is held where it is heard (sones, perceived.mjs, FW7): club
// 1.1 at least 3 % under cosmos 1.1 to the ear (33.3 against 35.3 sones), and in LUFS within the trim of where it stood (≤ cosmos 1.1 −
// 0.3 + 2 dB).
test('club 1.1 is a tier-2 hit: to the ear (sones) at least 3 % under the cosmos’s 1.1 (ink, not fire); in LUFS within the bang’s trim', () => {
  const { stems: film } = renderStems(SR, at(partFrame('cosmos', 1, 2)));
  const m = mixdown(film, SR);
  const a = at(partStart('cosmos'));
  const cosmos = integratedLoudness(m.L.subarray(a, a + at(24)), m.R.subarray(a, a + at(24)), SR);
  const ours = lufs(full, C.CLUB.from, C.CLUB.from + 24);
  assert.ok(ours <= cosmos - 0.3 - BANG_TRIM.db, `club 1.1 ${ours.toFixed(2)} vs cosmos 1.1 ${cosmos.toFixed(2)} (trimmed ${BANG_TRIM.db} dB)`);
  const [bang] = sonesGroup(sonesRows(m.L, m.R, SR, partStart('cosmos'), partStart('cosmos') + 24, { small: false }), 4);
  const [hit] = sonesGroup(sonesRows(full.L, full.R, SR, C.CLUB.from - ORIGIN, C.CLUB.from - ORIGIN + 24, { small: false }), 4);
  assert.ok(hit.sones <= 0.97 * bang.sones, `club 1.1 ${hit.sones.toFixed(1)} vs cosmos 1.1 ${bang.sones.toFixed(1)} sones`);
});

test('deterministic: the same render twice', () => {
  const again = render().stems;
  for (const k of [...MUSIC_BUSES, 'post']) for (const ch of ['L', 'R']) assert.ok(again[k][ch].every((v, i) => v === stems[k][ch][i]), `${k} ${ch}`);
});

// ——— Continuity plan v07 (docs/2026-10-03-continuity-plan-v07.md §2.3, §4): the seam into the club and the club's beat-lock —————————

test('the cosmos’s glass carried through club bar 1 (FW3): a tink on each Ben-Day ring (FALL’s A6 F6 D6 B♭5), then on the e and a, 3 dB softer a beat, on B♭maj9’s tones', () => {
  assert.deepEqual(CARRY_TINKS.slice(0, 4).map((t) => t.at), [...C.BENDAY_RINGS]);
  assert.deepEqual(CARRY_TINKS.slice(0, 4).map((t) => t.midi), [93, 89, 86, 82]);
  assert.deepEqual(CARRY_TINKS.slice(4).map((t) => t.at), [1, 2, 3].flatMap((b) => [club(1, b + 0.25), club(1, b + 0.75)]));
  const IV = new Set([...VOICINGS.IV, ROOT.IV].map((m) => ((m % 12) + 12) % 12));
  for (const t of CARRY_TINKS) {
    assert.ok(IV.has(t.midi % 12), `${t.at}: ${t.midi} is a tone of B♭maj9`);
    const beat = Math.floor((t.at - C.CLUB.from) / 24);
    assert.ok(Math.abs(20 * Math.log10(t.gain / (0.2 * (t.soft ? 0.75 : 1))) + 3 * beat) < 1e-9, `${t.at}: −3 dB a beat`);
  }
  assert.ok(CARRY_TINKS.every((t) => t.at < club(2)), 'gone by club 2.1');
  // Heard: each ring's tink within 10 dB of the club's mix over its first 80 ms (they carry the seam), on its note.
  const glass = render({ solo: (k) => k === 'clcarrytink' }).stems.clGlass;
  const lvl = 10 ** (LEVEL_DB / 20);
  const g = Float32Array.from(glass.L, (v, i) => 0.5 * lvl * (v + glass.R[i]));
  const w = Math.round(0.08 * SR);
  for (const t of CARRY_TINKS.slice(0, 4)) {
    const d = dB(rms(g, rel(t.at), rel(t.at) + w)) - dB(rms(mid(full), rel(t.at), rel(t.at) + w));
    assert.ok(d > -10, `the ring's tink on ${t.at}: ${d.toFixed(1)} dB re the mix`);
    const one = render({ solo: (k, f) => k === 'clcarrytink' && f === t.at }).stems.clGlass.L;
    assert.ok(near(pitch(lowpass(one, midiHz(t.midi) * 1.4), rel(t.at) + 200, rel(t.at) + 3000), midiHz(t.midi), 0.03), `${t.at} sings ${t.midi}`);
  }
  assert.equal(SENDS.clGlass, 0.32, 'in the cosmos’s glass room (csGlass)');
});

test('the dot inks in the cosmos’s width: the sung IV spread ±SUNG_SPREAD, the plate rings on from the cosmos (no cut on club 1.1)', () => {
  assert.equal(SUNG_SPREAD, 0.6);
  const v = render({ solo: (k) => k === 'clsungchord' }).stems.clVox;
  const side = rms(Float32Array.from(v.L, (x, i) => 0.5 * (x - v.R[i])), rel(C.DOT_INKS), rel(C.DOT_INKS + 20));
  const midv = rms(Float32Array.from(v.L, (x, i) => 0.5 * (x + v.R[i])), rel(C.DOT_INKS), rel(C.DOT_INKS + 20));
  assert.ok(dB(side) - dB(midv) > -12, `the sung IV's side/mid ${(dB(side) - dB(midv)).toFixed(1)} dB`);
});

test('the piano stabs hit (§4): 4 dB up with a hard 2 ms click, the downbeat’s as it was, the off-kick ones (16ths 3, 10, 13) panned apart', () => {
  assert.ok(Math.abs(20 * Math.log10(PIANO.gain / 0.24) - 4) < 1e-9, 'stabs +4 dB');
  assert.equal(PIANO.click, 1);
  assert.deepEqual(OFF_KICK_PAN, { 3: -0.35, 10: 0.35, 13: -0.35 });
  // The click: energy above 3 kHz in the stab's first 2 ms, against the same stab without it.
  const make = (click) => {
    const L = new Float32Array(SR / 2);
    const R = new Float32Array(SR / 2);
    housePiano(L, R, 1000, SR, { notes: [70, 74, 77, 81, 93], len: 3200, gain: PIANO.gain, bright: PIANO.bright, click, seed: 7600 });
    return band(Float32Array.from(L, (v, i) => 0.5 * (v + R[i])), 3000);
  };
  const hard = rms(make(1), 1000, 1096);
  const soft = rms(make(0), 1000, 1096);
  assert.ok(dB(hard) - dB(soft) > 4, `the click: ${(dB(hard) - dB(soft)).toFixed(1)} dB above 3 kHz in the first 2 ms`);
  // The off-kick stabs leave the centre: each one's energy on its side ≥ 3 dB over the other.
  const p = render({ solo: (k) => k === 'clstab' }).stems.clPiano;
  for (const f of C.STABS) {
    const s16 = Math.round(((f - C.CLUB.from) % 96) / 6);
    const side = OFF_KICK_PAN[s16];
    if (side === undefined) continue;
    const l = rms(p.L, rel(f), rel(f) + 2400);
    const r = rms(p.R, rel(f), rel(f) + 2400);
    assert.ok((side > 0 ? dB(r) - dB(l) : dB(l) - dB(r)) > 3, `the stab on ${f} (16th ${s16}) panned ${side}`);
  }
});

test('the print’s thwack on every clap (§4): a paper slap on a 150 Hz thud, over within 40 ms, 6 ± 1.5 dB under the clap, panned as the plate slips', () => {
  const t = render({ solo: (k) => k === 'clthwack' }).stems.clDrums;
  const c = render({ solo: (k) => k === 'clsnare' }).stems.clDrums;
  const tm = Float32Array.from(t.L, (v, i) => 0.5 * (v + t.R[i]));
  const cm = Float32Array.from(c.L, (v, i) => 0.5 * (v + c.R[i]));
  const w = Math.round(0.04 * SR);
  C.CLAPS.forEach((f, i) => {
    // (The fist bump's clap is its ripple, a separate kind: the thwack there is measured against the snare alone, so its level is not.)
    const d = dB(rms(tm, rel(f), rel(f) + w)) - dB(rms(cm, rel(f), rel(f) + w));
    assert.ok(f === C.FIST_BUMP || (d < -4.5 && d > -7.5), `the thwack on ${f}: ${d.toFixed(1)} dB re the clap`);
    assert.equal(rms(tm, rel(f) + w + 1, rel(f) + w + 2400), 0, `over within 40 ms of ${f}`);
    const side = dB(rms(t.R, rel(f), rel(f) + w)) - dB(rms(t.L, rel(f), rel(f) + w));
    assert.ok((i % 2 ? -1 : 1) * side > 1, `panned the way the plate slips (${f})`);
  });
  assert.ok(near(pitch(lowpass(tm, 200), rel(C.CLAPS[0]) + 48, rel(C.CLAPS[0]) + 1200), 150 * 1.02, 0.12), 'the thud near 150 Hz');
  assert.equal(THWACK.pan, 0.25);
});

test('the 8-bit arp pumps on every kick (§4): ARP_PUMP dB down at the kick, back within its release', () => {
  assert.deepEqual(ARP_PUMP, { depthDb: 3.5, attackMs: 2, releaseMs: 150 });
  const a = busMid(render({ solo: (k) => k === 'clarp' }).stems, ['clArp']);
  // Its level just after a kick (the arp's own 16th there) against the same 16th's partner off the kick: the kick's is quieter.
  const kicks = C.KICKS.filter((f) => f >= C.ARP.from + 24 && f < C.ARP.to);
  let down = 0;
  for (const k of kicks) down += dB(rms(a, rel(k) + 120, rel(k) + 900)) - dB(rms(a, rel(k + 12) + 120, rel(k + 12) + 900));
  assert.ok(down / kicks.length < -1.5, `the arp on the kicks ${(down / kicks.length).toFixed(1)} dB re the &`);
});

test('the record’s kicks bump the needle (§4, the DJ’s nudge): a tick on 3.2, 3.3 and 3.4 (3.1 is the needle drop), gone in 50 ms', () => {
  assert.deepEqual(of('clneedlebump'), [club(3, 1), club(3, 2), club(3, 3)].map((f) => f * 800));
  const x = busMid(render({ solo: (k) => k === 'clneedlebump' }).stems, ['clFx']);
  for (const f of [club(3, 1), club(3, 2), club(3, 3)]) {
    assert.ok(rms(x, rel(f), rel(f) + 480) > 0.002, `${f} ticks`);
    assert.equal(rms(x, rel(f) + Math.round(0.05 * SR) + 1, rel(f) + 2400), 0, `${f} gone in 50 ms`);
  }
  assert.ok(NEEDLE_BUMP.gain > 0);
});

test('the club is no dry island (FW4): side/mid (full band) of its bars from −17 dB up — but bar 4 (the antivirus’s dry, narrow room, M9) and bar 5 (the lights out)', () => {
  const sm = (a, b) => {
    let s = 0;
    let m = 0;
    for (let i = rel(a); i < rel(b); i++) {
      s += (0.5 * (full.L[i] - full.R[i])) ** 2;
      m += (0.5 * (full.L[i] + full.R[i])) ** 2;
    }
    return 10 * Math.log10(s / m);
  };
  const bars = [1, 2, 3, 4, 5, 6].map((b) => sm(club(b), b === 6 ? C.HIT : club(b + 1)));
  const msg = bars.map((v) => v.toFixed(1)).join(' ');
  for (const b of [0, 1, 2, 5]) assert.ok(bars[b] >= -17, `bar ${b + 1}: ${msg}`);
  assert.ok(bars[3] >= -21 && bars[4] >= -18.6, `bars 4 and 5: ${msg}`);
  assert.deepEqual(WIDTH, { claps: [-0.3, 0.35], roll: 0.45, brrr: 0.75, horns: 0.8, hats: [-0.4, 0.45], open: 0.35 });
  assert.deepEqual([SENDS.clPiano, SENDS.clBrass, SENDS.clHorn], [0.22, 0.2, 0.12]);
});
