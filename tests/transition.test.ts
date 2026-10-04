// The transition (the film part 'transition', 2 bars between the Riso print and the cosmos: "VERTIGO ∞ · LIGHTSPEED PRESS", design
// notes/cosmos3/final.md §4 bars 13–14; build sheet notes/bcos/sheet.md §3): its score against the design, part-locally (the
// design's frames are the 58-bar map's, 13.1 = 1152: every pin below is TRANSITION_START + the design's offset, so the map may move); its
// wiring (span, section, composition); its camera energy; its finishing (the first frame finishes as the Riso print's last); and its
// dispatcher, which routes every instant to its one renderer (a stub until builder T lands it).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import { TransitionScene } from '../src/scenes/transition.ts';
import { BUILD_END } from '../src/score/build.ts';
import { DROP1_START } from '../src/score/drop1.ts';
import { flashAt, rigAt } from '../src/score/energy.ts';
import { partBar, partEnd, partFrame, partStart } from '../src/score/film.ts';
import { SECTIONS, SHOTS, shotAtFrame } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import { barFrame } from '../src/score/tempo.ts';
import * as TR from '../src/score/transition.ts';
import { transitionLook, transitionTemporal } from '../src/shots/cosmosKit.ts';
import { risoLook } from '../src/worlds/riso.ts';
import { assertFlashesRare, assertOnGrid, assertRigContinuous, scoreFrames } from './lib/energyAudit.ts';

/** A design frame (58-bar numbering, transition 1.1 = 1152) as a film frame on today's map. */
const d = (designFrame: number): number => TR.TRANSITION_START + designFrame - 1152;

test('the transition runs from the end of the Riso print to the Big Bang on cosmos 1.1: one span, drawn by its scene, its own section, and KX-Transition renders exactly it', () => {
  assert.deepEqual([TR.TRANSITION_START, TR.TRANSITION_END], [partStart('transition'), partEnd('transition')]);
  assert.equal(TR.TRANSITION_START, BUILD_END, 'the build ends where it starts');
  assert.equal(TR.TRANSITION_END, DROP1_START, 'drop 1 starts where it ends');
  assert.equal(TR.TRANSITION_END - TR.TRANSITION_START, 2 * 96, 'two bars');
  assert.deepEqual(SPANS.filter((s) => s.key === 'transition'), [{ from: TR.TRANSITION_START, to: TR.TRANSITION_END, key: 'transition' }]);
  const s = SECTIONS.find((x) => x.id === 'transition')!;
  assert.equal(s.composition, 'KX-Transition');
  assert.deepEqual([barFrame(s.fromBar), barFrame(s.toBar + 1)], [TR.TRANSITION_START, TR.TRANSITION_END]);
  assert.equal(TR.at(2, 3.5), partFrame('transition', 2, 2.5), 'at() is 1-based in beats, as on the sheets');
  assert.equal(TR.at(1), d(1152));
  assert.equal(TR.at(2, 4.5), d(1332));
});

test('one shot, X01, covers its two bars (the lead re-cuts the shot table, sheet §12)', () => {
  const rows = SHOTS.filter((x) => x.fromBar >= partBar('transition') && x.toBar <= partBar('transition', 2));
  assert.deepEqual(rows.map((x) => x.id), ['X01']);
  for (const f of [TR.TRANSITION_START, TR.TRANSITION_END - 1]) assert.equal(shotAtFrame(f).id, 'X01');
});

test('every event the transition’s score exports — its accents included — sits on the 32nd-note grid', () => {
  assertOnGrid(scoreFrames('transition', TR));
  assertOnGrid(TR.WALTZ.map((n, i) => [`WALTZ[${i}].to`, n.to] as const));
  assert.deepEqual([...TR.TRANSITION_ACCENTS], [], 'no rig accent: the Vertigo constraint pins the page 1 : 1 with the screen');
});

test('bar 1 — DUPLICATOR → VERTIGO: three plates a paste on 1.1, 1.1& and 1.2; films 10–18 auto-repeat a 32nd apart from 1.2&; the lurch on 1.2, the launch on 1.3', () => {
  assert.deepEqual(TR.PASTES.map((p) => [p.at, p.films]), [[d(1152), [1, 2, 3]], [d(1164), [4, 5, 6]], [d(1176), [7, 8, 9]]]);
  assert.deepEqual([...TR.AUTO_REPEAT], [1188, 1191, 1194, 1197, 1200, 1203, 1206, 1209, 1212].map(d), 'films 10–18 slide out of the sun 1188 … 1212');
  assert.deepEqual([...TR.WALTZ_STEPS], [d(1164), d(1176), d(1188)]);
  assert.deepEqual({ ...TR.SPIN }, { from: d(1188), to: d(1224) });
  assert.deepEqual(TR.DOLLY.map((k) => [k.at, k.q]), [[d(1152), 0.0065], [d(1164), 0.04], [d(1176), 0.08], [d(1179), 0.485], [d(1188), 0.62], [d(1200), 0.85]]);
  // The Vertigo constraint: the depth reveal only grows, and the dolly's last key is the launch, so the flight starts from its velocity 0.
  for (let i = 1; i < TR.DOLLY.length; i++) assert.ok(TR.DOLLY[i].q > TR.DOLLY[i - 1].q && TR.DOLLY[i].at > TR.DOLLY[i - 1].at);
  assert.equal(TR.DOLLY.at(-1)!.at, TR.LAUNCH);
  assert.deepEqual([TR.VERTIGO, TR.LAUNCH, TR.VP_CENTRED, TR.FLARE_BORN], [d(1176), d(1200), d(1200), d(1224)]);
  assert.deepEqual({ ...TR.PUSH }, { from: d(1152), to: d(1176) }, 'the S12 push runs on and stops by the lurch');
  assert.deepEqual([...TR.CHASE_LIGHTS], [d(1212), d(1236)]);
  assert.deepEqual(TR.TARGETS.map((t) => [t.at, t.corner, t.to]), [[d(1164), 'tr', undefined], [d(1176), 'br', undefined], [d(1188), 'bl', d(1218)]]);
});

test('bar 2 — STAR GATE → CRASH STOP → ✦: the speed doubles a roll stage, a gate on every roll hit, the press turns the lights out a kick at a time, then the crash, the reverse Vertigo, the cross and the point', () => {
  assert.deepEqual(TR.SPEED.map((s) => [s.at, s.units]), [[d(1200), 6], [d(1248), 12], [d(1272), 24], [d(1296), 0]]);
  assert.deepEqual([...TR.ROLL], [1200, 1224, 1248, 1260, 1272, 1278, 1284, 1290, ...Array.from({ length: 12 }, (_, i) => 1296 + 3 * i)].map(d));
  assert.deepEqual([...TR.GATES], [1224, 1248, 1260, 1272, 1278, 1284, 1290].map(d), 'a gate on every roll hit from 1.4 to the crash');
  assert.deepEqual(TR.PRESS_PASSES.map((p) => [p.at, p.paper, p.light]), [[d(1248), '#664285', 0.35], [d(1272), '#272369', 0.7], [d(1296), '#0A033B', 1], [d(1320), '#0A0313', 1]]);
  assert.deepEqual([...TR.CORKSCREW], [1272, 1278, 1284, 1290].map(d), '22.5° a roll 16th: 90° on 2.2a');
  assert.deepEqual([TR.CRASH, TR.CROSS, TR.POINT], [d(1296), d(1320), d(1332)]);
  assert.deepEqual(TR.REVERSE_VERTIGO.map((s) => [s.at, s.q, s.sunR]), [0.6, 0.42, 0.29, 0.2, 0.13, 0.08, 0.04, 0.01].map((q, i) => [d(1296 + 3 * i), q, [240, 180, 135, 100, 72, 52, 36, 24][i]]));
  assert.deepEqual(TR.SUN_SHEDS.map((s) => [s.at, s.what]), [[d(1296), 'register'], [d(1302), 'yellow'], [d(1305), 'yellow'], [d(1308), 'pink'], [d(1311), 'pink'], [d(1314), 'pink'], [d(1317), 'paper']]);
  assert.deepEqual(TR.SLIT.map((s) => [s.at, s.width, s.half, s.flareHalf, s.flareWidth, s.sunR]), [
    [d(1320), 18, 540, 960, 10, 14],
    [d(1323), 12, 280, 420, 7, 9],
    [d(1326), 7, 100, 150, 4, 6],
    [d(1329), 4, 24, 30, 3, 5],
  ]);
  assert.deepEqual({ ...TR.SILENCE }, { from: d(1332), to: TR.TRANSITION_END }, 'the vacuum: S2, the music gated with a cut on its first frame');
  assert.deepEqual({ ...TR.SLUG }, { from: d(1152), to: d(1296) }, 'the signature slug prints from 1.1 while the plates fly');
});

test('the music’s frames: the soft kicks of bar 1, a kick a beat in bar 2, the 8-bit Blue Danube in two phrases whose last B♭5 the vacuum swallows', () => {
  assert.deepEqual([...TR.KICKS], [1152, 1200, 1248, 1272, 1296, 1320].map(d));
  assert.deepEqual([...TR.HATS], [1164, 1188, 1212, 1236, 1248, 1254, 1260, 1266, 1272, 1278, 1284, 1290].map(d));
  assert.deepEqual(TR.WALTZ.map((n) => [n.at, n.note]), [
    [1152, 'F4'], [1164, 'F4'], [1176, 'A4'], [1188, 'C5'], [1224, 'C6'], [1230, 'C6'], [1236, 'A5'], [1242, 'A5'],
    [1248, 'F4'], [1260, 'F4'], [1272, 'A4'], [1284, 'C5'], [1314, 'C6'], [1320, 'C6'], [1326, 'B♭5'],
  ].map(([f, n]) => [d(f as number), n]));
  assert.equal(TR.WALTZ.find((n) => n.at === d(1188))!.to, d(1218), 'phrase 1’s C5 is held to 1218 (a held key: the auto-repeat)');
  assert.equal(TR.WALTZ.find((n) => n.at === d(1284))!.to, d(1314), 'phrase 2’s C5 is held to 1313');
  assert.equal(TR.WALTZ.at(-1)!.to, TR.POINT, 'nothing sounds into the vacuum: the swallowed B♭5 is the bang’s sung top note');
  for (const n of TR.WALTZ) assert.ok(n.to > n.at && n.to <= TR.POINT);
  assert.deepEqual(TR.CHORDS.map((c) => [c.at, c.chord]), [[d(1152), 'ii'], [d(1248), 'Vsus']]);
  assert.deepEqual([...TR.SINGS], TR.WALTZ.map((n) => n.at).filter((f) => f >= d(1224)), 'the sun sings on every waltz note from the flare’s birth');
  assert.deepEqual([...TR.COLLAPSE_BLIPS], Array.from({ length: 8 }, (_, i) => d(1296 + 3 * i)));
  assert.deepEqual({ ...TR.FLIGHT_NOISE }, { from: TR.LAUNCH, to: TR.CRASH }, 'the flight noise dies on the crash stop');
  assert.deepEqual({ ...TR.WHINE }, { ...TR.SILENCE }, 'the point’s whine is the vacuum’s one sound (post bus)');
});

test('photography: segments tile the part at the crash, the cross and the vacuum; no shutter window crosses one; one sample through the snaps, 64 over the lurch and the flight', () => {
  const edges = TR.SEGMENTS.flat();
  assert.deepEqual(TR.SEGMENTS.map((s) => [...s]), [[TR.TRANSITION_START, TR.CRASH], [TR.CRASH, TR.CROSS], [TR.CROSS, TR.POINT], [TR.POINT, TR.TRANSITION_END]]);
  for (let i = 1; i < TR.SEGMENTS.length; i++) assert.equal(TR.SEGMENTS[i][0], TR.SEGMENTS[i - 1][1]);
  for (const w of TR.SUBFRAMES) for (const e of edges) assert.ok(!(w.from < e && w.to > e) || w.samples === 1, `the ${w.samples}-sample window [${w.from}, ${w.to}) crosses the cut ${e}`);
  for (let f = TR.TRANSITION_START; f < TR.TRANSITION_END; f++) {
    const t = transitionTemporal(f);
    const seg = TR.transitionSegment(f);
    assert.ok(seg.from <= f && f < seg.to, `${f} in its segment`);
    for (const s of temporalSamples(f, t, seg)) assert.ok(s.frame >= seg.from && s.frame < seg.to, `a sub-frame of ${f} leaves its segment`);
    if (f >= TR.CRASH) assert.equal(t.samples, 1, `${f}: the snaps are hard steps`);
    if (f >= TR.LAUNCH && f < TR.CRASH) assert.deepEqual([t.samples, t.shutter], [64, 0.75], `${f}: the flight`);
  }
});

test('through the transition the rig is continuous and never flashes white (the riso roll’s last shake dies in it)', () => {
  assertRigContinuous(TR.TRANSITION_START, TR.TRANSITION_END, []);
  assertFlashesRare(TR.TRANSITION_START, TR.TRANSITION_END, []);
  for (let f = TR.TRANSITION_START; f < TR.TRANSITION_END; f++) assert.equal(flashAt(f), 0, `${f}`);
  for (let f = TR.TRANSITION_START + 16; f < TR.TRANSITION_END; f += 0.5) assert.deepEqual(rigAt(f), { zoom: 1, x: 0, y: 0, roll: 0 }, `${f}: the page holds 1 : 1`);
});

test('the in hand-off: the transition’s first frame finishes exactly as the Riso print’s last (risoLook), the inks still printing on paper', () => {
  assert.deepEqual(transitionLook(TR.TRANSITION_START), risoLook());
  for (let f = TR.TRANSITION_START; f < TR.at(2); f++) assert.deepEqual(transitionLook(f), risoLook(), `${f}: bar 1 is the Riso world's finish`);
  const last = transitionLook(TR.TRANSITION_END - 1);
  assert.ok(Math.abs(last.grain - 0.18) < 1e-9 && Math.abs(last.vignette - 0.16) < 1e-9 && last.bloom.intensity === 0.15, 'bar 2 thins the grain and lets the sun and the cross bloom');
  assert.equal(last.riso, undefined, 'drawn in ink: the Riso print pass starts with the bang (hidden in its white)');
});

test('the dispatcher sends every instant of the part to its renderer and takes the score’s segments; constructible in Node', () => {
  const scene = new TransitionScene();
  assert.deepEqual(TR.TRANSITION_PARTS.map((p) => [p.id, p.from, p.to]), [['gate', TR.TRANSITION_START, TR.TRANSITION_END]]);
  for (const f of [TR.TRANSITION_START - 0.4, TR.TRANSITION_START, TR.CRASH, TR.TRANSITION_END - 0.1, TR.TRANSITION_END + 0.3]) assert.equal(scene.partAt(f), scene.parts.gate, `${f}`);
  for (const f of [TR.TRANSITION_START, TR.LAUNCH, TR.CRASH + 1, TR.POINT, TR.TRANSITION_END - 1]) {
    assert.deepEqual(scene.segment(f), TR.transitionSegment(f));
    assert.deepEqual(scene.temporal(f), transitionTemporal(f));
    assert.deepEqual(scene.look(f), transitionLook(f));
  }
});
