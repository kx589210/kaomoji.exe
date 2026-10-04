import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FaceCell } from '../src/actors/asciiFace.ts';
import { MOUTH_CHARS } from '../src/content/build.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { KosmosScene } from '../src/scenes/kosmos.ts';
import * as B from '../src/score/build.ts';
import * as D1 from '../src/score/drop1.ts';
import { FLIP } from '../src/score/build.ts';
import { ACCENTS, PUNCHES } from '../src/score/energy.ts';
import { partEnd, partFrame, partStart } from '../src/score/film.ts';
import * as I from '../src/score/intro.ts';
import { WHIP } from '../src/score/intro.ts';
import { GATHER, burstTemporal, coreAt } from '../src/shots/burst.ts';
import { GLASS } from '../src/shots/glass.ts';
import { HIGHWAY, S01_MOVES, S04_MOVES, buildIntroLayout, introCamera, introTemporal } from '../src/shots/intro.ts';
import { heroAt } from '../src/shots/lines.ts';
import { type RisoLayout, risoFrame, risoTemporal } from '../src/shots/riso.ts';
import { type SwissLayout, swissFrame, swissTemporal } from '../src/shots/swiss.ts';
import { FLATTEN, bridgeStep, voyageCamera } from '../src/shots/voyage.ts';
import { T2_SAMPLES, t2Camera } from '../src/transitions/flip.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, assertOnGrid, changes, fastFrames, onShutter, poseMoved, samePose, scoreFrames } from './lib/energyAudit.ts';

const face: FaceCell[] = [];
for (let row = 10; row < 28; row++) for (let col = 30; col < 146; col++) face.push({ col, row, ch: '#', lum: 0.73, part: col < 50 ? 0 : col < 70 ? 1 : col < 106 ? 2 : col < 126 ? 3 : 4 });
const IL = buildIntroLayout(face);
const SL: SwissLayout = { jp: (ch) => (ch === ' ' ? 0.28 : '()'.includes(ch) ? 0.36 : 0.62), display: () => 0.6, text: () => 0.5 };
/** S10's mouths: a 16:9 window inside each counter, made up (the audit skips the flight, so their size does not matter here). */
const RL: RisoLayout = { advance: (ch) => ('()'.includes(ch) ? 0.36 : 0.6), mouths: Object.fromEntries(MOUTH_CHARS.map((m) => [m, { x: 0, y: 0, half: 0.15 }])) };
/** S10's flight along z, from the dive into S09's last sheet to the burst through the last mouth into S11. */
const FLIGHT = { from: B.TEARS[B.TEARS.length - 1], to: B.HOLE } as const;

// The audits themselves live in tests/lib/energyAudit.ts, so each later section's own test file runs them over its own frames.

/** The frontal shots (the intro, Swiss and Riso parts): the film's shot camera at `frame` and the shutter sub-frames its scene asks for (T2: the camera over the cards). */
const at: CameraAt = (frame) => {
  if (frame < partEnd('intro')) return { pose: introCamera(frame, IL.eye), samples: onShutter(frame, introTemporal(frame)) };
  if (frame < partEnd('swiss')) return frame >= FLIP.from ? { pose: t2Camera(frame), samples: T2_SAMPLES } : { pose: swissFrame(frame, SL).camera, samples: onShutter(frame, swissTemporal(frame)) };
  return { pose: risoFrame(frame, RL).camera, samples: onShutter(frame, risoTemporal(frame)) };
};

/** Frames the frontal audit skips: the tilted highway and the whip off it (checked on their own below), S10's flight along z and its hand-over to S11's camera (risoTemporal photographs it on 48–64 sub-frames), and the hard cuts. */
const skip = (f: number) => (f >= HIGHWAY.from && f < WHIP.to) || (f >= FLIGHT.from && f <= FLIGHT.to) || [WHIP.to, partFrame('swiss', 3), partFrame('riso', 4)].includes(f);

/** The output frames on which a slice of the galaxy's stutter starts (the bridge steps on). */
const SLICES: readonly number[] = Array.from({ length: D1.STUTTER.to - D1.STUTTER.from }, (_, i) => D1.STUTTER.from + i).filter((f) => bridgeStep(f) > bridgeStep(f - 1));

/** S11's first beat, as its camera settles onto the halftone from the last mouth (checked on its own below). */
const SETTLE = { from: B.HOLE + 1, to: B.HOLE + 24 } as const;

test('every frame whose camera moves fast gets at least 32 sub-frames on its shutter, the highway and the whip all through', () => {
  for (let f = HIGHWAY.from + 1; f < WHIP.to; f++) assert.ok(at(f).samples >= 32, `highway frame ${f}: ${at(f).samples} sub-frames on the shutter`);
  assertFastMovesSampled(partStart('intro'), SETTLE.from, at, skip);
  assertFastMovesSampled(SETTLE.to, D1.DROP1_START, at, skip);
});

test("S11's camera settling onto the halftone after the last mouth gets at least 32 sub-frames while it moves fast", () => {
  const settle = fastFrames(SETTLE.from, SETTLE.to, at, skip);
  assert.ok(settle.length > 0, 'the settle starts fast');
  for (const m of settle) assert.ok(m.samples >= 32, `frame ${m.f}: ${m.move.toFixed(0)} px a frame on ${m.samples} sub-frames`);
});

test('the camera, with its punches and shakes, never holds exactly still for more than 12 frames', () => {
  assertNeverStill(partStart('intro') + 1, D1.DROP1_START, poseMoved(at, skip));
});

test('the cosmos part is photographed with the sub-frames its 3D scene asks for: the burst’s 64 on the shutter through cosmos bar 1, at least 24 from Earth to the stutter’s last slice, and no trail through the stutter', () => {
  const kosmos = new KosmosScene();
  for (let f = D1.BURST; f < D1.LEVELS.earth; f++) {
    const t = kosmos.temporal(f);
    assert.deepEqual(t, burstTemporal(f), `frame ${f}: the scene photographs cosmos bar 1 with the burst's own shutter`);
    assert.equal(onShutter(f, t), 64, `frame ${f}: ${onShutter(f, t)} sub-frames on the shutter`);
  }
  for (let f = D1.LEVELS.earth; f < D1.STUTTER.to; f++) assert.ok(onShutter(f, kosmos.temporal(f)) >= 24, `frame ${f}: ${onShutter(f, kosmos.temporal(f))} sub-frames on the shutter`);
  // A trail into the past would carry the slice before into each repeated slice: every sub-frame of the stutter is on its shutter.
  for (let f = D1.STUTTER.from; f < D1.STUTTER.to; f++) {
    const t = kosmos.temporal(f);
    assert.equal(onShutter(f, t), temporalSamples(f, t).length, `stutter frame ${f}: a trail behind its shutter`);
  }
});

test('through the cosmos part the 3D camera, with the punches and shakes over it, never holds exactly still for more than 12 frames', () => {
  // The scene's camera at output frame f: the voyage camera at the content the frame shows (a stutter slice shows an earlier one again).
  const cam = (f: number) => voyageCamera(D1.stutterFrame(f));
  assertNeverStill(D1.BURST + 1, D1.STUTTER.to, (f) => !samePose(cam(f - 1), cam(f)));
});

test('every move of the camera and the actors starts or lands on the 32nd-note grid', () => {
  assert.equal(SLICES.length, 6, 'the stutter has its six slices');
  // Found in the shots themselves: every sheet S09 puts on top, the core flaring on the stab after the resume (cosmos 1.3&), and every change of (•ω•)'s face from club 1.3 to the hit.
  const sheets = changes(B.SLAMS[0], B.MOUTHS[0], (f) => {
    const top = (risoFrame(f, RL).stack?.sheets ?? []).filter((s) => !s.view && s.card.glyphs.rounded.length + s.ink.glyphs.rounded.length > 0).pop();
    return top ? [...top.card.glyphs.rounded, ...top.ink.glyphs.rounded].map((g) => g.ch).join('') : '';
  });
  const flares = changes(D1.BURST, GATHER.to, (f) => coreAt(f).flare > 1);
  const faces = changes(D1.LEVELS.cosmos, D1.HIT, (f) => heroAt(f)?.face ?? null);
  assert.equal(sheets.length, B.TEARS.length, `a new sheet on top of S09's pad on every tear: ${sheets}`);
  assert.equal(flares.length, 1, 'the core flares once in cosmos bar 1');
  assert.ok(faces.length >= 10, `(•ω•) changes face on the claps, the kick, the grab and every beat of the throw: ${faces}`);
  // Drop 1 (the cosmos and club parts, to the smash on break 1.1): every event its score exports — the burst, the freeze and the resume, the groove, the levels, the stutter, the throw, the hit, the silence and the smash.
  const drop1 = scoreFrames('drop 1', D1);
  assert.ok(drop1.length > 100, `Drop 1's events: ${drop1.length}`);
  const moves: [string, number][] = [
    ...S01_MOVES.map((m, i): [string, number] => [`S01 ${i}`, m.at]),
    ...S04_MOVES.map((m, i): [string, number] => [`S04 ${i}`, m.at]),
    ...(['LOG_START', 'ENTER_FRAME', 'LAUNCH', 'LOCK'] as const).map((k): [string, number] => [k, I[k]]),
    ...(['WHIP', 'FLING', 'SLAM', 'PUSH', 'RISE'] as const).flatMap((k): [string, number][] => [[`${k}.from`, I[k].from], [`${k}.to`, I[k].to]]),
    ...(['DISC_LAND', 'SLIDE', 'PULL', 'FLIP', 'STRETCH', 'SEA', 'SUNRISE', 'SUCK'] as const).flatMap((k): [string, number][] => [[`${k}.from`, B[k].from], [`${k}.to`, B[k].to]]),
    ...(['ROW_RULE', 'S05_BLINK', 'RED_CELL', 'GLASS_TURN', 'BLINK_WAVE', 'HOLE', 'MERGED'] as const).map((k): [string, number] => [k, B[k]]),
    // S09's slams and tears, S10's bursts through the mouths and landings on the faces, S11's faces.
    ...(['RULES', 'SPLITS', 'SWEEPS', 'SLAMS', 'TEARS', 'MOUTHS', 'LANDINGS', 'FACES'] as const).flatMap((k) => B[k].map((f, i): [string, number] => [`${k}[${i}]`, f])),
    ...sheets.map((f): [string, number] => ['a new sheet on top of the pad', f]),
    ...drop1,
    ...SLICES.flatMap((f, i): [string, number][] => [[`stutter slice ${i}`, f], [`stutter slice ${i} shows`, D1.stutterFrame(f)]]),
    // The moves the Drop 1 shots time themselves: the little faces gathering into Earth, the dolly zoom into the stutter, the glass cracking and breaking.
    ['GATHER.from', GATHER.from],
    ['GATHER.to', GATHER.to],
    ['FLATTEN.from', FLATTEN.from],
    ['FLATTEN.to', FLATTEN.to],
    ...Object.entries(GLASS).map(([k, f]): [string, number] => [`GLASS.${k}`, f]),
    ...flares.map((f): [string, number] => ['the core flaring', f]),
    ...faces.map((f): [string, number] => [`(•ω•) changing face to ${heroAt(f)?.face}`, f]),
    // The camera energy over the whole film: every punch, and every shake and flash (the later sections' accents merged in).
    ...PUNCHES.map((p, i): [string, number] => [`punch ${i}`, p.at]),
    ...ACCENTS.map((a, i): [string, number] => [`accent ${i}`, a.at]),
  ];
  // The break, drop 2 and the outro audit their own scores (tests/break.test.ts, drop2.test.ts, outro.test.ts).
  assertOnGrid(moves);
});
