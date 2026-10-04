import assert from 'node:assert/strict';
import { test } from 'node:test';
import { INTRO_THREADS } from '../src/content/boot.ts';
import { mixdown, renderStems } from '../scripts/audio/bgm.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { partEnd } from '../src/score/film.ts';
import {
  CRANE_PEAK, DEFENDER_BEEPS, DRIPS, ENTER_FRAME, HIGHWAY_START, INTRO_END, LAUNCH, LOCK, LOG_START, LOG_TICKS, LOOK, PROGRESS_STEPS, RAIN,
  SCAN_HUD_CELLS, SCAN_RAIN, SIG_BELL, SUB_PULSES, TILT, TILT_PEAK, WHIP, typeFrames,
} from '../src/score/intro.ts';

const SR = 48000;
const at = (frame) => Math.round((frame / 60) * SR);
// The intro and the first 66 frames of the build (7.5 s from the film's start).
const { stems, events } = renderStems(SR, at(partEnd('intro') + 66));

test('every keystroke sound is placed on the frame its character appears', () => {
  assert.deepEqual(events.filter((e) => e.kind === 'key').map((e) => e.at), typeFrames.map(at));
  assert.equal(events.find((e) => e.kind === 'enter').at, at(ENTER_FRAME));
  assert.equal(events.find((e) => e.kind === 'launch').at, at(LAUNCH + 2), 'the launch whoosh peaks where the glyphs fly fastest');
  assert.equal(events.find((e) => e.kind === 'whip').at, at(WHIP.from + 2), 'the whip whoosh peaks where the whip is fastest');
  assert.equal(events.find((e) => e.kind === 'lock').at, at(LOCK));
});

test('the keys bus is silent until the first keystroke and sounds within 1 ms of it', () => {
  const first = at(typeFrames[0]);
  let before = 0;
  for (let i = 0; i < first; i++) before = Math.max(before, Math.abs(stems.keys.L[i]), Math.abs(stems.keys.R[i]));
  assert.equal(before, 0);
  let after = 0;
  for (let i = first; i < first + 48; i++) after = Math.max(after, Math.abs(stems.keys.L[i]) + Math.abs(stems.keys.R[i]));
  assert.ok(after > 0.005);
});

test('the intro mix stays under the ceiling, is stereo, and keeps its lows mono', () => {
  const { L, R } = mixdown(stems, SR);
  assert.ok(truePeakDb(L, R) <= -1.0);
  assert.ok(correlation(L, R) < 0.95);
  assert.ok(lowCorrelation(L, R, SR) > 0.9);
});

test('the intro music bus carries no DC offset', () => {
  for (const x of [stems.music.L, stems.music.R]) {
    const mean = x.reduce((a, v) => a + v, 0) / x.length;
    assert.ok(Math.abs(mean) < 5e-4, `mean ${mean}`);
  }
});

test('mixdown takes DC and infrasound out of the mid', () => {
  const n = 2 * SR;
  const s = { keys: stereo(n), fx: stereo(n), music: stereo(n), chime: stereo(n), sub: new Float32Array(n) };
  s.music.L.fill(0.05);
  s.music.R.fill(0.05);
  const { L, R } = mixdown(s, SR);
  const late = (x) => x.subarray(SR).reduce((a, v) => a + v, 0) / SR;
  assert.ok(Math.abs(late(L)) < 1e-3 && Math.abs(late(R)) < 1e-3, `late means ${late(L)}, ${late(R)}`);
});

// ——— Bars 1–5 (the bars 1–14 design notes/b112/final.md §8.2; build sheet notes/b114/sheet.md §10) ———————————————————————

const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at);
const inIntro = (a) => a < at(INTRO_END);

test('the log ticks run on the log’s own clock: one a line after the first, none in the RAIN bar, where no cursor blinks either', () => {
  assert.deepEqual(of('logtick'), LOG_TICKS.slice(1).map(at));
  for (const kind of ['logtick', 'tick']) assert.ok(!of(kind).some((a) => a >= at(RAIN.from) && a < at(RAIN.to)), `no ${kind} in 96–191`);
});

test('the Defender, dry: two C7 beeps as it loads (A1, 53) and as the rain’s scan finds nothing (168); in the intro the dry bus holds only its voices', () => {
  assert.deepEqual(DEFENDER_BEEPS, INTRO_THREADS.bootLines ? [53, 168] : [168]);
  assert.deepEqual(of('beeps').filter(inIntro), DEFENDER_BEEPS.map(at));
  // Each pair: 30 ms on, 30 ms off, 30 ms on (the left and right of a panned mono voice summed in power).
  const pow = (a, b) => {
    let s = 0;
    for (let i = a; i < b; i++) s += stems.bass.L[i] ** 2 + stems.bass.R[i] ** 2;
    return s / (b - a);
  };
  const ms = (t) => Math.round((t / 1000) * SR);
  for (const f of DEFENDER_BEEPS) {
    const a = at(f);
    assert.ok(pow(a + ms(5), a + ms(25)) > 100 * pow(a + ms(36), a + ms(56)), `the gap in the beeps on ${f}`);
    assert.ok(pow(a + ms(65), a + ms(85)) > 100 * pow(a + ms(36), a + ms(56)), `the second beep on ${f}`);
  }
  // The bass bus (no reverb send) carries nothing in the intro but the Defender's events (each well under a quarter second).
  const dry = events.filter((e) => ['beeps', 'scan', 'cell', 'look'].includes(e.kind) && inIntro(e.at)).map((e) => e.at);
  for (let i = 0; i < at(INTRO_END); i++) {
    if (stems.bass.L[i] === 0 && stems.bass.R[i] === 0) continue;
    assert.ok(dry.some((a) => i >= a && i < a + SR / 4), `the dry bus sounds at frame ${((i / SR) * 60).toFixed(2)}, outside the Defender's voices`);
  }
});

test('the RAIN bar (A’s, L14d): the tilt peaks on 98, a drip on every sixteenth, the red scan’s falling sweep with a tick per HUD cell, his F6 bell on 162, the crane peaking on 190', () => {
  assert.deepEqual([TILT_PEAK, SIG_BELL, CRANE_PEAK], [98, 162, 190]);
  assert.deepEqual(of('tilt'), [at(TILT_PEAK)]);
  assert.deepEqual(of('hiss'), [at(RAIN.from)]);
  assert.deepEqual(of('drip'), DRIPS.map(at));
  for (const kind of ['facespawn', 'wave', 'faceland']) assert.deepEqual(of(kind), [], `no ${kind} (L14b's tinks, taken out by M5)`);
  assert.deepEqual(of('scan'), [at(SCAN_RAIN.from)]);
  assert.deepEqual(of('cell'), SCAN_HUD_CELLS.map(at));
  assert.deepEqual(of('sigbell'), [at(SIG_BELL)]);
  assert.deepEqual(of('crane'), [at(CRANE_PEAK)]);
});

// ——— L14b (no chord held behind everything), L14c (M4: some of B's small sounds, but A's opening — A's intro
// music back) and L14d (M5: the original code-rain sound — the RAIN bar wholly A's). Pinned to D
// (notes/b114/integ-r1/), provisionally. ———————————————————————————————————————————————————————————————————————————————————
test('A’s intro music (L14c): the arp’s unbroken sixteenths from the boot chime to the push, and the boot chime ringing on into the rain', () => {
  assert.deepEqual(of('arp').filter(inIntro), [at(LOG_START)]);
  assert.deepEqual(of('arpnote').filter(inIntro), [], 'no short-note arp in the intro (B)');
  // Every sixteenth from the boot chime to the push carries a note on the music bus (both sides together).
  const rms = (a, b) => Math.sqrt(stems.music.L.subarray(a, b).reduce((t, v, i) => t + v * v + stems.music.R[a + i] ** 2, 0) / (b - a));
  for (let f = LOG_START; f < INTRO_END; f += 6) assert.ok(rms(at(f), at(f + 4)) > 1e-3, `an arp note on ${f}`);
  // The boot chime is not faded under the tilt (B faded it over 96–108): it still rings when his bell (162) sounds.
  const ring = (a, b) => stems.chime.L.subarray(a, b).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(ring(at(TILT.to), at(SIG_BELL)) > 1e-3, 'the boot chime rings on under the rain');
  // What stays of B (L14b) in the intro: the highway's progress blips, one on each step.
  assert.deepEqual(of('progress'), PROGRESS_STEPS.map(at));
});

test('the RAIN bar sits near −16 LUFS (A’s), and the intro on the music bible’s −15.4 ± 0.3', () => {
  const { L, R } = mixdown(stems, SR);
  const lufs = (a, b) => integratedLoudness(L.subarray(at(a), at(b)), R.subarray(at(a), at(b)), SR);
  const rain = lufs(RAIN.from, RAIN.to);
  const intro = lufs(0, INTRO_END);
  assert.ok(Math.abs(rain + 16) <= 0.6, `the RAIN bar ${rain.toFixed(2)} LUFS`);
  assert.ok(Math.abs(intro + 15.4) <= 0.3, `the intro ${intro.toFixed(2)} LUFS`);
});

test('the sub lands on the downbeats of intro 2–5 (C2 C2 A1 D2); under the rain it is a C2 that swells, gone before the highway’s', () => {
  assert.deepEqual(SUB_PULSES.map((p) => [p.at, p.midi]), [[96, 36], [192, 36], [288, 33], [384, 38]]);
  assert.deepEqual(of('sub'), SUB_PULSES.map((p) => at(p.at)));
  const x = stems.sub;
  let n = 0;
  for (let i = at(130) + 1; i < at(160); i++) if (x[i] >= 0 !== x[i - 1] >= 0) n++;
  const hz = (n / (at(160) - at(130))) * (SR / 2);
  assert.ok(Math.abs(hz - 65.41) < 2, `the swell sings ${hz.toFixed(1)} Hz`);
  const rms = (a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / (b - a));
  assert.ok(rms(at(160), at(170)) > 1.5 * rms(at(110), at(120)), 'it swells under the rain');
  assert.ok(x.subarray(at(HIGHWAY_START - 2), at(HIGHWAY_START)).every((v) => v === 0), 'released before the highway lands');
});

test('intro 5: the tube kick’s CRT thunk on the lock, and the red band’s dry look on 444', () => {
  assert.deepEqual(of('thunk'), INTRO_THREADS.tubeKick ? [at(LOCK)] : []);
  assert.deepEqual(of('look'), INTRO_THREADS.redBand ? [at(LOOK)] : []);
});
