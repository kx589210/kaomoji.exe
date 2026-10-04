import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Biquad } from '../scripts/audio/filters.mjs';
import { SPLICE_MS, mixdown, renderStems } from '../scripts/audio/bgm.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { BREAK_MUSIC } from '../scripts/audio/sections/break.mjs';
import { BANG_TRIM } from '../scripts/audio/sections/cosmos.mjs';
import { PROGRESSION, VOICINGS, renderDrop1 } from '../scripts/audio/sections/drop1.mjs';
import * as C from '../src/score/club.ts';
import * as D from '../src/score/drop1.ts';
import { builtPartBars, partBar, partFrame, partStart, partTail } from '../src/score/film.ts';
import { barFrame } from '../src/score/tempo.ts';

const SR = 48000;
/**
 * RETIRED, not deleted: these tests pin v04's cosmos music (sections/drop1.mjs renderDrop1:
 * its drums, hits, pad, stutter, sparks and hum on cosmos 1–4). The film's cosmos is the new one (sections/cosmos.mjs, tested in
 * tests/cosmosAudio.test.mjs), and bgm.mjs no longer renders renderDrop1. See the cosmos build sheet (notes/bcos/sheet.md) §12.7:
 * retire them with the v04 code. The club and shatter rows of this file still run.
 */
const V04_COSMOS = 'retired v04 cosmos music (renderDrop1): the film plays sections/cosmos.mjs (tests/cosmosAudio.test.mjs); cosmos sheet notes/bcos/sheet.md §12.7';
const at = (frame) => Math.round((frame / 60) * SR);
const N = at(D.SMASH + 120); // to the smash on break 1.1 (32 s) and two seconds after it (the flip's crash would still ring there)
const { stems, events } = renderStems(SR, N);
const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at);
const master = mixdown(stems, SR);
/** The mix without the post bus (the glass): the music alone. */
const music = mixdown({ ...stems, post: undefined }, SR);
/** The fx bus alone through the whole mixdown — reverb, limiter and the stutter: what of it is heard at output time. */
const fxOut = mixdown({ fx: stems.fx, sub: new Float32Array(N) }, SR);
const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / (b - a));
const dB = (x) => (20 * Math.log10(Math.max(1e-12, x))).toFixed(1);
const mono = (m) => Float32Array.from(m.L, (v, i) => 0.5 * (v + m.R[i]));
/** `x` through two 2-pole high-passes at `lo` (24 dB an octave) and, if `hi` is given, two 2-pole low-passes at `hi`. */
const band = (x, lo, hi) => {
  const fs = [Biquad.highpass(SR, lo), Biquad.highpass(SR, lo), ...(hi ? [Biquad.lowpass(SR, hi), Biquad.lowpass(SR, hi)] : [])];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
/** The picture's slices of the stutter after its first (voyage.ts bridgeStep): each one, repeats included, is a new step of the bridge. */
const SLICE_STARTS = [6, 12, 15, 18, 21].map((d) => D.STUTTER.from + d);
/** RMS of `x` above `hz` (two 2-pole high-passes in a row: 24 dB an octave) over samples [a, b), in dB. */
const highDb = (x, a, b, hz = 2000) => {
  const f = Biquad.highpass(SR, hz);
  const g = Biquad.highpass(SR, hz);
  let s = 0;
  for (let i = Math.max(0, a - 4800); i < b; i++) {
    const y = g.process(f.process(x[i]));
    if (i >= a) s += y * y;
  }
  return 10 * Math.log10(s / (b - a));
};

/** The cosmos's frames of a list generated across drop 1 (drop1.ts's groove runs on into v04's club; the comic club has its own grid). */
const cosmosOnly = (frames) => frames.filter((f) => f < C.CLUB.from);

test('the drums: half time under the freeze, then four on the floor and a clap on 2 and 4, to the cosmos’s end (the club’s drums are sections/club.mjs’s)', { skip: V04_COSMOS }, () => {
  assert.deepEqual(of('d1kick'), [...D.BANG_KICKS, ...cosmosOnly(D.KICKS)].map(at));
  assert.deepEqual(of('d1snare'), [...D.BANG_SNARES, ...cosmosOnly(D.CLAPS)].map(at));
  assert.deepEqual(of('d1roll'), []);
  assert.deepEqual(of('d1fill'), D.FILL.map(at));
  assert.deepEqual(of('d1openhat'), cosmosOnly(D.OPEN_HATS).map(at));
});

test('the picture’s hits sound on their frames: the drop, the orbit, the resume, each level of the cosmos, the meteors', { skip: V04_COSMOS }, () => {
  assert.deepEqual(of('d1drop'), [at(D.BURST)]);
  assert.deepEqual(of('d1resume'), [at(D.RESUME)]);
  assert.equal(of('d1orbit').length, 1);
  assert.ok(of('d1orbit')[0] > at(D.FREEZE.from) && of('d1orbit')[0] < at(D.RESUME), 'the circling whoosh peaks inside the freeze');
  assert.deepEqual(of('d1level'), cosmosOnly(Object.values(D.LEVELS)).map(at), 'a crash on each new level');
  assert.deepEqual(of('d1zoom'), cosmosOnly(Object.values(D.LEVELS)).map(at), 'a whoosh peaking on each new level');
  assert.deepEqual(of('d1land'), D.METEOR_LANDS.map(at));
  assert.deepEqual(of('d1flip'), [], 'v04’s flip is retired (the club’s throw is clthrow)');
  assert.deepEqual(of('d1riser'), [], 'v04’s riser is retired (the club’s is its own)');
  assert.ok(of('d1lead').length >= 20, 'a vocal-chop hook through cosmos 2–4 (HOOK’s rows 0–2; rows 3–4 are the club’s)');
});

test('the chords are voice-led: common tones held, at most 6 semitones of movement in all, the top voice by a step, never a whole block shifting', () => {
  const names = PROGRESSION.flatMap((bar) => bar.map(([n]) => n));
  for (let k = 1; k < names.length; k++) {
    const a = VOICINGS[names[k - 1]];
    const b = VOICINGS[names[k]];
    const moves = b.map((m, i) => m - a[i]);
    const total = moves.reduce((s, d) => s + Math.abs(d), 0);
    assert.ok(total <= 6, `${names[k - 1]} → ${names[k]} moves ${total} semitones`);
    assert.ok(Math.abs(moves[3]) <= 2, `${names[k - 1]} → ${names[k]}: the top voice moves ${moves[3]}`);
    assert.ok(moves.some((d) => d === 0), `${names[k - 1]} → ${names[k]} keeps a common tone`);
  }
});

// RULED BY THE WHOLE-FILM MIX PASS (2026-10-03; it ran as a todo pending that pass, since the quieter new cosmos (−11.1 LUFS without the
// chord bed; cosmos sheet notes/bcos/sheet.md §16d ruling 1) moved it): v04's rule had every bar of cosmos 1 – club 2 within
// 1 dB of riso 4 above 2 kHz — written when drop 1 was a supersaw wall. The approved restyle (M2: no bed; FALL's
// space) leaves the arrival as bright as the build — the Big Bang's bar (cosmos 1) and the club's first two bars hold the rule — and the
// sparse cosmos 2–6 1.5–3.2 dB under riso 4 there (MEASURED: six seconds and the vacuum's silence apart, no listener compares them).
// Lifting them 2 dB above 2 kHz would put back the hiss that was taken out, so the rule is kept where it is heard (the drop's arrival) and
// guarded where it is not (no darker than riso 4 − 4 dB). Whether the cosmos should be brighter is for the ear (whole-film mix report).
// v08 (2026-10-03): the bang a little quieter (sections/cosmos.mjs BANG_TRIM: one gain on the finished mix, 2 dB through
// 1.1, eased back by 2.1). Its tone is untouched (a pure gain), but its bar's level above 2 kHz drops with it (−23.3 → −24.5 dB; riso 4 −22.7), so
// cosmos 1's allowance widens by the trim (riso 4 − 1 dB − 2 dB).
test('the drop arrives brighter than the end of the build: cosmos 1 (the Big Bang) and club 1–2 have at least as much above 2 kHz as riso 4 before its silent half beat (− 1 dB); the sparse cosmos 2–6 stays within 4 dB of it', () => {
  const mid = (i) => 0.5 * (master.L[i] + master.R[i]);
  const mono = Float32Array.from({ length: at(partFrame('club', 3)) }, (_, i) => mid(i));
  const build = highDb(mono, at(partFrame('riso', 4)), at(partFrame('riso', 4, 3.5)));
  // The cosmos's bars (all 6 built since 2026-10-02) and club 1–2.
  for (const bar of [...builtPartBars('cosmos'), partBar('club', 1), partBar('club', 2)]) {
    const d = highDb(mono, at(barFrame(bar)), at(barFrame(bar + 1)));
    const heard = bar === partBar('cosmos', 1) || bar >= partBar('club', 1);
    const trim = bar === partBar('cosmos', 1) ? -BANG_TRIM.db : 0;
    assert.ok(d >= build - (heard ? 1 : 4) - trim, `film bar ${bar}: ${d.toFixed(1)} dB above 2 kHz against riso 4's ${build.toFixed(1)}`);
  }
});

test('the pad pumps with the kick but keeps sounding (depth 0.6)', { skip: V04_COSMOS }, () => {
  for (const k of D.KICKS.slice(1, 12)) {
    const before = rms(stems.chords.L, at(k) - at(3), at(k));
    const after = rms(stems.chords.L, at(k) + at(0.4), at(k) + at(1.6));
    assert.ok(after < 0.85 * before && after > 0.25 * before, `at ${k}: ${after.toFixed(4)} vs ${before.toFixed(4)}`);
  }
});

test('the stutter repeats the finished mix exactly as the picture repeats its frames, past a 1.5 ms cross-fade at each splice', { skip: V04_COSMOS }, () => {
  assert.ok(rms(master.L, at(D.STUTTER.from), at(D.STUTTER.to)) > 0.02, 'it repeats music, not silence');
  const skip = Math.round((SPLICE_MS / 1000) * SR) + 1;
  let repeats = 0;
  for (let f = D.STUTTER.from; f < D.STUTTER.to; f++) {
    let first = D.STUTTER.from - 1000;
    for (let g = D.STUTTER.from; g < f; g++) if (D.stutterFrame(g) === D.stutterFrame(f)) { first = g; break; }
    if (first < D.STUTTER.from) continue;
    repeats++;
    for (let i = skip; i < at(1); i += 37) {
      assert.equal(master.L[at(f) + i], master.L[at(first) + i], `L at frame ${f} (as ${first})`);
      assert.equal(master.R[at(f) + i], master.R[at(first) + i], `R at frame ${f} (as ${first})`);
    }
  }
  assert.equal(repeats, 12);
});

test('no splice of the stutter clicks: across each, the mix steps no further than the two passages it joins', { skip: V04_COSMOS }, () => {
  const plain = mixdown(stems, SR, { stutter: false });
  // [the splice, the content it jumps to, the content it leaves]: frames of the stutter from STUTTER.from (s).
  const s = D.STUTTER.from;
  const splices = [[s + 6, s, s + 6], [s + 15, s + 6, s + 9], [s + 21, s + 9, s + 12], [D.STUTTER.to, D.STUTTER.to, s + 12]];
  for (const [f, to, from] of splices) {
    const i = at(f);
    for (let k = 0; k < 120; k++) {
      const step = Math.abs(master.L[i + k] - master.L[i + k - 1]);
      const own = (g) => Math.abs(plain.L[at(g) + k] - plain.L[at(g) + k - 1]);
      // An equal-power cross-fade of two passages steps at most √2 × the larger of their own steps (plus its gain change on their level).
      assert.ok(step <= Math.SQRT2 * Math.max(own(to), own(from)) + 0.02, `frame ${f} sample ${k}: ${step.toFixed(4)} against ${own(to).toFixed(4)} / ${own(from).toFixed(4)}`);
    }
  }
});

test('through the throw the music stays bright — the horns snap on with it after the lights-out (M2: no pad) — and grows into the hit', () => {
  const mono = (m) => Float32Array.from({ length: at(D.SMASH) }, (_, i) => 0.5 * (m.L[i] + m.R[i]));
  const a = mono(master);
  const before = highDb(a, at(C.THROW - 72), at(C.THROW - 6));
  const after = highDb(a, at(C.THROW + 24), at(C.HIT));
  assert.ok(after > before - 3, `${before.toFixed(1)} → ${after.toFixed(1)} dB above 2 kHz`);
  // Loudness as heard (K-weighted, a beat each): the last beat before the hit (the 32nd roll, the reversed cymbal) over the beat after the
  // throw (club 5.4: the page, the reactions) — raw RMS, which the sub and the old pad dominated, measured them level (−12.3 dB both).
  const beatLufs = (f) => integratedLoudness(master.L.subarray(at(f), at(f + 24)), master.R.subarray(at(f), at(f + 24)), SR);
  assert.ok(beatLufs(C.HIT - 24) > beatLufs(C.THROW + 24) + 0.3, `louder at the end of the throw than at its start: ${beatLufs(C.THROW + 24).toFixed(2)} → ${beatLufs(C.HIT - 24).toFixed(2)} LUFS`);
});

test('the hit cuts the music dead for the beat before the smash: only the glass is heard — the crack, then its creaking', () => {
  assert.ok(rms(music.L, at(C.SILENCE.from) + 96, at(C.SILENCE.to)) < 1e-4, 'the music is silent');
  assert.deepEqual(of('d1crack'), [at(C.HIT)], 'the club’s hit keeps v04’s glass and its event kind');
  assert.ok(rms(master.L, at(C.HIT), at(C.HIT) + 2400) > 0.05, 'the crack is loud');
  assert.ok(highDb(master.L, at(C.HIT), at(C.HIT) + 4800, 4000) > highDb(master.L, at(C.HIT) + 4800, at(C.SILENCE.to), 4000), 'bright, then dying away');
  assert.deepEqual(of('d1shatter'), [at(D.SMASH)]);
});

test('the cosmos’s music ends on club 1.1: every bus of sections/drop1.mjs is silent from there to the end of what is rendered (the club’s is its own)', () => {
  const alone = { keys: stereo(N), fx: stereo(N), music: stereo(N), chime: stereo(N), drums: stereo(N), bass: stereo(N), chords: stereo(N), vox: stereo(N), post: stereo(N), sub: new Float32Array(N) };
  renderDrop1(alone, SR);
  for (const [name, bus] of Object.entries(alone)) {
    for (const x of name === 'sub' ? [bus] : [bus.L, bus.R]) assert.equal(rms(x, at(C.CLUB.from), N), 0, `${name} after club 1.1`);
  }
});

/** The end of what is rendered or the break's first note (sections/break.mjs BREAK_MUSIC), whichever comes first: the music stays out of the mix until then. */
const QUIET_END = Math.min(N, at(BREAK_MUSIC));

test('the music stays silent through the shatter: without the glass the mix stays under −60 dB from the smash until the break’s music (or the end of what is rendered)', () => {
  for (let f = D.SMASH; at(f + 1) <= QUIET_END; f++) {
    const level = Math.max(rms(music.L, at(f), at(f + 1)), rms(music.R, at(f), at(f + 1)));
    assert.ok(level < 1e-3, `frame ${f}: the music at ${dB(level)} dB`);
  }
  assert.ok(rms(master.L, at(D.SMASH), at(D.SMASH) + 4800) > 0.05, 'the shatter is heard');
});

test('the mix itself keeps the music out after the hit: a voice left on a main bus past it — dry, its reverb or the sub — is not heard before the break’s music', () => {
  const stray = { L: Float32Array.from(stems.chords.L), R: Float32Array.from(stems.chords.R) };
  const sub = Float32Array.from(stems.sub);
  for (let i = at(C.SILENCE.from) - 4800; i < N; i++) {
    const v = 0.3 * Math.sin((2 * Math.PI * 440 * i) / SR);
    stray.L[i] += v;
    stray.R[i] += v;
    sub[i] += 0.3 * Math.sin((2 * Math.PI * 50 * i) / SR);
  }
  const m = mixdown({ ...stems, chords: stray, sub, post: undefined }, SR);
  assert.ok(rms(m.L, at(C.SILENCE.from) - 4800, at(C.SILENCE.from) - 96) > 0.05, 'the stray voice is heard before the hit');
  for (let f = C.SILENCE.from; at(f + 1) <= QUIET_END; f++) {
    const level = Math.max(rms(m.L, at(f), at(f + 1)), rms(m.R, at(f), at(f + 1)));
    assert.ok(level < 1e-3, `frame ${f}: ${dB(level)} dB`);
  }
});

test('the neon crackles on every slice of the stutter at output time: a spark above 3 kHz starts on each slice after the first (STUTTER.from + 6, 12, 15, 18, 21)', { skip: V04_COSMOS }, () => {
  const ms3 = Math.round(0.003 * SR);
  const fx = band(mono(fxOut), 3000);
  const mix = band(mono(master), 3000);
  for (const f of SLICE_STARTS) {
    const after = rms(fx, at(f), at(f) + ms3);
    const before = rms(fx, at(f) - ms3, at(f));
    assert.ok(after > 0.01 && after > 4 * before, `${f}: the crackle's bus ${dB(before)} → ${dB(after)} dB`);
    const a = rms(mix, at(f), at(f) + ms3);
    const b = rms(mix, at(f) - ms3, at(f));
    assert.ok(a > 2 * b, `${f}: the mix above 3 kHz ${dB(b)} → ${dB(a)} dB`);
  }
});

test('a transformer’s hum runs under the stutter’s last slices at output time, to the cosmos’s last frame (v04’s tubes no longer ignite on club 1.1: the dot inks there)', { skip: V04_COSMOS }, () => {
  const hum = band(mono(fxOut), 90, 300);
  for (let f = SLICE_STARTS[1]; f < D.COSMOS_END; f++) assert.ok(rms(hum, at(f), at(f + 1)) > 0.003, `${f}: the hum at ${dB(rms(hum, at(f), at(f + 1)))} dB`);
  assert.deepEqual(of('d1ignite'), []);
  const tail = partTail('cosmos');
  if (tail) assert.ok(rms(mono(master), at(tail.from + 1), at(tail.to)) === 0, 'the held bars are silent');
});

// v04's club 3 (the clink, the splash, the lights out, the grab, the flip's whoosh) is retired with v04's club; the comic club places its
// bar 5 on its own grid (tests/clubAudio.test.mjs: every event kind on its score frame).

test('Drop 1 is loud, under −1 dBTP, mono in the lows, wide above', () => {
  const a = at(partStart('cosmos'));
  const b = at(partFrame('club', 3));
  const l = master.L.slice(a, b);
  const r = master.R.slice(a, b);
  const lufs = integratedLoudness(l, r, SR);
  assert.ok(lufs > -12 && lufs < -9, `${lufs.toFixed(2)} LUFS`);
  assert.ok(truePeakDb(l, r) <= -1, `${truePeakDb(l, r).toFixed(2)} dBTP`);
  assert.ok(lowCorrelation(l, r, SR) > 0.95, 'mono lows');
  assert.ok(correlation(l, r) < 0.97, 'not mono overall');
  const mean = l.reduce((s, v) => s + v, 0) / l.length;
  assert.ok(Math.abs(mean) < 1e-3, 'no DC');
});
