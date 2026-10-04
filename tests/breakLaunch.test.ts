// Break bar 6, the launch: the pure shot module src/shots/breakLaunch.ts, pinned to the build sheet
// (notes/break/break-sheet.md §2.4, §3 break bar 6, §4.5–§4.8, §7.2, §7.3). Assertions are about what the viewer sees: where his ω is on
// screen, which face he wears, where the fist meets [ LOUDER ], what the window says on each frame, how the band stretches.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BROWS, HERO_FACES } from '../src/content/castBreak.ts';
import { BREAK_TEXTS, WINDOW_TEXTS } from '../src/content/break.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as BR from '../src/score/break.ts';
import { rigAt } from '../src/score/energy.ts';
import { HERO_ADVANCE, breakCam, toScreen } from '../src/shots/breakShared.ts';
import {
  FIST_TOP,
  LAUNCH_ATLAS,
  LINK,
  LOUDER_BUTTON,
  PEG,
  WIN,
  bandAt,
  bandCord,
  blocksAt,
  brows,
  fistGlint,
  heroChars,
  heroPose,
  heroText,
  launchAt,
  launchCam,
  launchSegment,
  launchTemporal,
  OMEGA_INK,
  creepAt,
  omegaInkOnScreen,
  omegaOnScreen as omegaSeen,
  pegAt,
  pegParts,
  windowAt,
} from '../src/shots/breakLaunch.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, onShutter, poseMoved } from './lib/energyAudit.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

/** A stand-in for the browser's measured advances: the sheet's measured ones, ems of a full-width box for kana, narrow for the rest. */
const advance = (ch: string): number => (HERO_ADVANCE as Record<string, number>)[ch] ?? (ch === ' ' ? 0.28 : /[぀-ヿ]/u.test(ch) ? 1 : 0.6);
const L = { advance };
const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a.toFixed(3)} vs ${b}`);
const LAUNCH = [...Array(96).keys()].map((i) => at(6) + i);
/** The instants of output frame F's shutter. */
const shutter = (F: number): number[] => temporalSamples(F, launchTemporal(F), launchSegment()).map((s) => s.frame);
const omegaOnScreen = (f: number): [number, number] => {
  const h = heroPose(f);
  return toScreen(launchCam(f), h.omega[0], h.omega[1]);
};
/** Where a world point is seen at instant f: the launch's camera, then the rig's punch about the frame centre. */
const seen = (f: number, x: number, y: number): [number, number] => {
  const [sx, sy] = toScreen(launchCam(f), x, y);
  const z = rigAt(f).zoom;
  return [960 + (sx - 960) * z, 540 + (sy - 540) * z];
};
/** The ink box (layout px) of his right つ at instant f: つ's ink is 0.839 em wide about its placement point, 0.33 em above it to 0.40 em below. */
const fistBox = (f: number) => {
  const t = heroChars(f, L).at(-1)!;
  const w = t.size * t.stretch;
  return { x0: t.x - 0.42 * w, x1: t.x + 0.42 * w, y0: t.y - 0.33 * t.size, y1: t.y + 0.4 * t.size };
};

test('26.1 is a hard match cut into the callout: zoom 1.60, his ω on the frame centre exactly where 2399’s was, and no sub-frame of bar 26 reaches back across it', () => {
  const c = launchAt(at(6), L).cam;
  near(c.zoom, 1.6, 1e-9, 'zoom on 2400');
  near(c.roll, 0, 1e-9, 'roll on 2400');
  const [sx, sy] = omegaOnScreen(at(6));
  near(sx, 960, 1e-9, 'ω x on screen');
  near(sy, 540, 1e-9, 'ω y on screen');
  for (const F of LAUNCH) {
    assert.deepEqual(launchSegment(), { from: BR.MATCH_CUT, to: BR.BREAK_END });
    for (const s of shutter(F)) assert.ok(s >= BR.MATCH_CUT && s < BR.BREAK_END, `sub-frame ${s} of ${F}`);
  }
});

test('the camera: breakCam’s exactly through the uppercut and on 2495 (drop 2 reads breakCam(2495): zoom 1.10013, roll −3.9989°); between, it pulls back with the slingshot and pushes in through the held breath', () => {
  for (let f = at(6); f < at(6, 2.5); f += 0.25) assert.deepEqual(launchCam(f), breakCam(f), `breakCam’s own on ${f}`);
  assert.deepEqual(launchCam(BR.BREAK_END - 1), breakCam(BR.BREAK_END - 1), 'the hand-off frame is breakCam’s');
  assert.deepEqual(launchAt(BR.BREAK_END - 1, L).cam, breakCam(BR.BREAK_END - 1));
  near(launchCam(BR.BREAK_END - 1).zoom, 1.10013, 1e-4, 'zoom on 2495');
  near(launchCam(BR.BREAK_END - 1).roll, -3.9989, 1e-3, 'roll on 2495');
  // The pull-back runs on from the uppercut to break 6.4& (it reveals the band and the peg as he steps back) …
  for (let f = at(6, 2.5); f < at(6, 4.5); f++) assert.ok(launchCam(f + 1).zoom < launchCam(f).zoom, `pulling back on ${f}`);
  assert.ok(launchCam(at(6, 4.5)).zoom <= 1.06, `wide on 26.4& (${launchCam(at(6, 4.5)).zoom.toFixed(3)})`);
  // … and the held breath pushes in, faster and faster, to the hand-off: the energy rises into drop2 1.1 instead of easing out.
  for (let f = at(6, 4.5); f < BR.BREAK_END - 1; f++) assert.ok(launchCam(f + 1).zoom > launchCam(f).zoom, `pushing in on ${f}`);
  assert.ok(launchCam(BR.BREAK_END - 1).zoom - launchCam(at(6, 4.5)).zoom >= 0.04, 'a push of at least 4 %');
  assert.ok(launchCam(BR.BREAK_END - 1).zoom - launchCam(BR.BREAK_END - 2).zoom > launchCam(at(6, 4.5) + 1).zoom - launchCam(at(6, 4.5)).zoom, 'accelerating into the drop');
});

test('the camera’s roll kicks on the steps of 26.3& and 26.4 (2460, 2472, 2478): each already moving on its own hit frame, bigger each time, gone 12 frames later', () => {
  const kick = (f: number) => launchCam(f).roll - breakCam(f).roll;
  const hits = [at(6, 3.5), at(6, 4), at(6, 4.25)];
  near(kick(at(6, 3.5) - 0.25), 0, 1e-12, 'still before the first');
  near(kick(at(6, 4) - 0.25), 0, 1e-12, 'the first is over before the second');
  let prev = 0;
  for (const h of hits) {
    assert.ok(Math.abs(kick(h + 0.25) - kick(h - 0.25)) > 0.1, `the roll is moving on ${h}’s own frame`);
    const peak = Math.max(...[0, 1, 2, 3, 4].map((t) => Math.abs(kick(h + t))));
    assert.ok(peak > prev, `bigger than the one before (${h})`);
    assert.ok(peak < 2.5, `small (${peak.toFixed(2)}°)`);
    prev = peak;
  }
  for (const f of [at(6, 3), at(6, 3.25) + 1, at(6, 3.5) - 1, at(6, 4.75), BR.BREAK_END - 5, BR.BREAK_END - 1]) near(kick(f), 0, 1e-12, `no kick on ${f}`);
});

test('the energy standard holds over bar 26: enough sub-frames wherever the camera moves fast, never still, and the rig only zooms (so the screen-fixed film can undo it exactly)', () => {
  const cameraAt: CameraAt = (f) => ({ pose: launchAt(f, L).pose, samples: onShutter(f, launchTemporal(f)) });
  // Break 6.1 is the cut: its half-frame before belongs to break bar 5's camera.
  assertFastMovesSampled(at(6), BR.BREAK_END, cameraAt, (f) => f === BR.MATCH_CUT);
  assertNeverStill(at(6), BR.BREAK_END, poseMoved(cameraAt));
  for (let f = at(6) - 0.5; f < BR.BREAK_END; f += 0.25) {
    const r = rigAt(f);
    assert.ok(r.x === 0 && r.y === 0 && r.roll === 0, `the rig at ${f} is a pure zoom`);
  }
});

test('he wears (ง•ω•)ง✧ from the cut and ─=≡Σ((( つ•ω•)つ from 26.3, swapped whole on 2448’s frame', () => {
  assert.equal(heroText(at(6)), HERO_FACES.ready);
  assert.equal(heroText(at(6, 3) - 0.75), HERO_FACES.ready);
  for (const s of shutter(at(6, 3))) assert.equal(heroText(s), HERO_FACES.zoom, `sub-frame ${s} of 2448`);
  for (const s of shutter(at(6, 3) - 1)) assert.equal(heroText(s), HERO_FACES.ready, `sub-frame ${s} of 2447`);
  assert.equal(heroText(BR.BREAK_END - 1), HERO_FACES.zoom);
  const drawn = heroChars(at(6, 2.75) - 2, L).map((c) => c.ch).join('');
  assert.equal(drawn, HERO_FACES.ready.replace(/\s/gu, ''), 'every visible character of his face is drawn');
  assert.ok(heroChars(at(6, 4) - 2, L).some((c) => c.ch === 'ω'), 'the ω is always there');
});

test('his ω holds at (960, 540) until 26.3, then steps back 90 / 80 / 70 / 60 px on the slingshot’s steps and 4 px on each creep: (644, 548) on 2495', () => {
  for (const f of [at(6), at(6, 2.25), at(6, 3) - 1]) assert.deepEqual(heroPose(f).omega, [960, 540], `ω on ${f}`);
  const steps: [number, number][] = [[at(6, 3.5) - 1, 870], [at(6, 4) - 1, 790], [at(6, 4.25) - 1, 720], [at(6, 4.5) - 1, 660]];
  for (const [f, x] of steps) near(heroPose(f).omega[0], x, 5, `ω x (with the L’s overshoot) before ${f + 1}`);
  const h = heroPose(BR.BREAK_END - 1);
  near(h.omega[0], 644, 1e-6, 'ω x on 2495');
  near(h.omega[1], 548, 1e-6, 'ω y on 2495');
  // Each step is a launch, off at full speed on its own hit frame (a frame into its L there): three quarters of the way 2 frames later.
  near(heroPose(at(6, 3) + 2).omega[0], 960 - 0.75 * 90, 3, 'L, 75 % 2 frames after the hit');
  for (const h of BR.SLINGSHOT) {
    const x = (f: number) => heroPose(f).omega[0];
    for (const s of shutter(h)) assert.ok(x(s) < x(h - 1) - 5, `moving on ${h}’s own frame (${s}: ${(x(h - 1) - x(s)).toFixed(1)} px)`);
  }
  // omegaOnScreen (what the film’s apex follows) is his ω through the launch’s camera and the rig.
  for (const f of [at(6, 1.75) + 2, at(6, 3) + 2, at(6, 4) + 1, BR.BREAK_END - 1]) {
    const [x, y] = seen(f, heroPose(f).omega[0], heroPose(f).omega[1]);
    near(omegaSeen(f)[0], x, 1e-9, `ω seen x on ${f}`);
    near(omegaSeen(f)[1], y, 1e-9, `ω seen y on ${f}`);
  }
});

test('the wind-up squashes his body (x 0.82 / y 1.10 by 26.4e), never his ω (≥ 0.92 as wide as it is tall): it stays a ω, not a “w”', () => {
  const h = heroPose(BR.BREAK_END - 1);
  near(h.sx, 0.82, 1e-6, 'body squash x');
  near(h.sy, 1.1, 1e-6, 'body squash y');
  for (let f = at(6); f < BR.BREAK_END; f += 0.25) {
    const w = heroChars(f, L).find((c) => c.ch === 'ω')!;
    assert.ok(w.stretch >= 0.92, `ω stretch ${w.stretch.toFixed(3)} on ${f}`);
    for (const e of heroChars(f, L).filter((c) => c.ch === '•')) assert.ok(e.stretch >= 0.92, `eye stretch on ${f}`);
  }
  // The body takes the squash: his ")" and つ are narrower than his ω.
  const c = heroChars(BR.BREAK_END - 1, L);
  const tsu = c.at(-1)!;
  assert.ok(tsu.stretch <= 0.76, `つ stretch ${tsu.stretch.toFixed(3)}`);
});

test('each step’s squash lands on the step’s own hit frame (every sub-frame of 2448, 2460, 2472, 2478 is squashed further than the frame before), then relaxes', () => {
  const sx = (f: number) => heroPose(f).sx;
  for (const h of BR.SLINGSHOT) {
    const before = Math.min(...shutter(h - 1).map(sx));
    for (const s of shutter(h)) assert.ok(sx(s) < before - 0.02, `squashed on ${h} (sub-frame ${s}): ${sx(s).toFixed(3)} vs ${before.toFixed(3)}`);
    assert.ok(sx(h + 5) > sx(h), `it relaxes after ${h}`);
  }
});

test('the brows drop in on 26.1e (ˋ, left eye) and 26.1& (ˊ, right eye), landing exactly on their frames above the eyes', () => {
  assert.equal(brows(at(6) - 0.1, L).length, 0);
  const atLand = (f: number, ch: string) => brows(f, L).find((b) => b.ch === ch);
  const eyes = heroChars(at(6, 1.75) + 2, L).filter((c) => c.ch === '•');
  const l = atLand(BR.BROWS[0], BROWS[0])!;
  const r = atLand(BR.BROWS[1], BROWS[1])!;
  assert.ok(l && r, 'both brows are there on their landing frames');
  near(l.x, eyes[0].x, 1e-6, 'ˋ over the left eye');
  near(r.x, eyes[1].x, 1e-6, 'ˊ over the right eye');
  assert.ok(l.y < 540 && r.y < 540 && Math.abs(l.y - r.y) < 1e-6, 'level, above the eyes');
  assert.ok(!brows(BR.BROWS[1] - 6.5, L).some((b) => b.ch === BROWS[1]), 'the right brow is not there before its fall');
  const falling = atLand(BR.BROWS[0] - 2, BROWS[0])!;
  assert.ok(falling.y < l.y - 10, 'and it falls in from above');
});

test('E5: his right fist (the second ง) uppercuts [ LOUDER ] — still until 2418, its top on the button’s bottom edge on 2424, back at rest by 2436', () => {
  const fist = (f: number) => heroChars(f, L).filter((c) => c.ch === 'ง')[1];
  const rest = (f: number) => {
    // Where the fist would be with no uppercut: the same character with the offset removed.
    const c = fist(f);
    return [c.x - c.dx, c.y - c.dy];
  };
  for (const f of [at(6), at(6, 1.5) - 2, at(6, 1.75), at(6, 2.5) + 1, at(6, 2.75) - 2]) {
    const c = fist(f);
    near(c.dx, 0, 0.6, `no offset on ${f}`);
    near(c.dy, 0, 0.6, `no offset on ${f}`);
    void rest;
  }
  // The fist's ink top (ง in Noto Sans Thai Looped: 0.562 em over the baseline, the rounded stack's 'middle' 0.377 em over it) and its
  // turn: on break 6.2, through the launch’s camera and the rig, it touches [ LOUDER ]’s bottom edge in screen px.
  near(FIST_TOP, 0.185, 0.01, 'ง’s ink top above its placement point (ems)');
  const c = fist(BR.LOUDER);
  const em = heroPose(BR.LOUDER).em;
  const a = (c.rot * Math.PI) / 180;
  const top: [number, number] = [c.x + Math.sin(a) * FIST_TOP * em, c.y - Math.cos(a) * FIST_TOP * em];
  const [sx, sy] = seen(BR.LOUDER, top[0], top[1]);
  near(sx, LOUDER_BUTTON.x, 0.5, 'fist under the button’s centre');
  near(sy, LOUDER_BUTTON.bottom, 0.5, 'fist top on the button’s bottom edge');
  // It eases in: slower at the start of the swing than at its end.
  const d = (f: number) => Math.hypot(fist(f).dx, fist(f).dy);
  assert.ok(d(at(6, 1.875)) - d(at(6, 1.75) + 2) < d(at(6, 2)) - d(at(6, 2) - 1), 'an impact: fastest as it lands');
});

test('E5: the ✧ pops at the contact on 2424 itself — full size, white, a 3 px ink outline on every sub-frame of the hit frame — and is gone by 2436', () => {
  const star = (f: number) => windowAt(f).glyphs.find((g) => g.ch === '✧');
  for (const s of shutter(BR.LOUDER - 1)) assert.equal(star(s), undefined, `not before the contact (${s})`);
  for (const s of shutter(BR.LOUDER)) {
    const g = star(s)!;
    assert.ok(g, `there on ${s}`);
    assert.ok(g.size >= 70, `full size on ${s} (${g.size.toFixed(0)} px)`);
    assert.deepEqual(g.color, [1, 1, 1], 'white');
    near(g.outline! * g.size, 3, 1e-9, '3 px ink outline');
  }
  assert.ok(star(at(6, 2.25))!.size < star(at(6, 2))!.size, 'it settles');
  assert.equal(star(at(6, 2.5)), undefined, 'gone by 2436');
});

test('the extrude stack: 8 coloured copies of his face core at (−9k, +9k) behind him and a 9th in solid ink; it breathes to 11 and 13 px and its colours chase one copy deeper on every 16th', () => {
  const b = bandAt(at(6));
  assert.equal(b.length, 9);
  b.forEach((c, i) => {
    assert.equal(c.k, i + 1);
    near(c.x, 960 - 9 * c.k, 1e-6, `copy ${c.k} x`);
    near(c.y, 540 + 9 * c.k, 1e-6, `copy ${c.k} y`);
  });
  assert.equal(b[8].color, 'ink');
  assert.deepEqual(b.slice(0, 4).map((c) => c.color), ['cream', 'yellow', 'mint', 'coral']);
  near(bandAt(at(6, 2.5) - 2)[0].x, 960 - 11, 0.3, 'step 11 after 26.1&');
  near(bandAt(at(6, 3) - 1)[0].x, 960 - 13, 0.3, 'step 13 after 26.2&');
  for (const h of BR.STACK_CHASE.slice(1)) {
    const before = bandAt(h - 1).map((c) => c.color);
    for (const s of shutter(h)) {
      const now = bandAt(s).map((c) => c.color);
      assert.deepEqual(now.slice(1, 8), before.slice(0, 7), `on ${h} (sub-frame ${s}) each colour moved one copy deeper`);
    }
  }
});

test('26.3’s fold is crisp: the copies’ faces (and the ink copy) are whole on every sub-frame of 2447 and gone on every sub-frame of 2448 — never half there, never faded', () => {
  for (const s of shutter(at(6, 3) - 1)) for (const c of bandAt(s)) assert.equal(c.core, 1, `copy ${c.k} whole on ${s}`);
  for (const s of shutter(at(6, 3))) {
    for (const c of bandAt(s)) {
      assert.equal(c.core, 0, `copy ${c.k}’s face gone on ${s}`);
      if (c.k === 9) assert.equal(c.scale, 0, `the ink copy gone on ${s}`);
    }
  }
  for (let f = at(6); f < BR.BREAK_END; f += 0.25) for (const c of bandAt(f)) assert.ok(c.core === 0 || c.core === 1, `copy ${c.k} core ${c.core} on ${f}`);
  // So no copy is ever drawn semi-transparent either.
  for (let f = at(6, 2.75) - 2; f < at(6, 3.5); f += 0.25) for (const g of launchAt(f, L).back.glyphs.hero ?? []) assert.equal(g.alpha ?? 1, 1, `a copy glyph faded on ${f}`);
});

test('the slingshot: from 26.3 the copies’ ")" fly to the band — links at 0.55 his size strung on a cord from his fist to the peg, evenly, the spacing widening on every step', () => {
  for (const c of bandAt(at(6, 1.75) + 2)) near(c.scale, c.k === 9 ? 1 : 1, 1e-9, 'full size in the stack');
  const b = bandAt(BR.BREAK_END - 1).filter((c) => c.k <= 8);
  assert.equal(b.length, 8);
  for (const c of b) near(c.scale, LINK, 1e-9, `link ${c.k} at ${LINK}`);
  near(LINK, 0.55, 1e-9, 'links at 0.55 his size');
  // The cord runs from his fist (the grip, inside his right つ) to the peg; the links sit on it in order, evenly spaced.
  const cord = bandCord(BR.BREAK_END - 1)!;
  near(cord.x1, PEG.x, 1e-9, 'the cord ends at the peg');
  near(cord.y1, PEG.y, 1e-9, 'the cord ends at the peg');
  const box = fistBox(BR.BREAK_END - 1);
  assert.ok(cord.x0 > box.x0 && cord.x0 < box.x1 && cord.y0 > box.y0 && cord.y0 < box.y1 + 30, 'and starts in his fist');
  const xs = b.map((c) => c.bx);
  for (let k = 1; k < 8; k++) assert.ok(xs[k] > xs[k - 1], 'in order toward the peg');
  const gaps = xs.slice(1).map((x, i) => x - xs[i]);
  for (const g of gaps) near(g, gaps[0], 1, 'evenly spaced');
  assert.ok(xs[7] < PEG.x && xs[0] > cord.x0, 'between his fist and the peg');
  // It stretches: wider after every step, and still a little on each creep of the held breath.
  const gap = (f: number) => (bandAt(f)[7].bx - bandAt(f)[0].bx) / 7;
  const settled = [at(6, 3.5) - 1, at(6, 4) - 1, at(6, 4.25) - 1, at(6, 4.5) - 1].map(gap);
  for (let i = 1; i < settled.length; i++) assert.ok(settled[i] > settled[i - 1] + 3, `wider after step ${i + 1} (${settled.map((g) => g.toFixed(0)).join(', ')})`);
  assert.ok(gap(BR.BREAK_END - 1) > gap(at(6, 4.5) - 1) + 1, 'and wider still through the held breath');
  assert.ok(gap(BR.BREAK_END - 1) >= 40, `stretched on 2495 (${gap(BR.BREAK_END - 1).toFixed(1)} px)`);
  // The cord thins as it stretches.
  assert.ok(bandCord(BR.BREAK_END - 1)!.w < bandCord(at(6, 3.5) - 1)!.w, 'the cord thins');
  // It re-spreads on every step with each link a frame later than the one before (a ripple running to the peg).
  const done = (k: number) => (bandAt(at(6, 3.5) + 2)[k - 1].bx - bandAt(at(6, 3.5) - 1)[k - 1].bx) / (bandAt(at(6, 4) - 1)[k - 1].bx - bandAt(at(6, 3.5) - 1)[k - 1].bx);
  assert.ok(done(1) > done(2) && done(2) > done(3), `a ripple: links 1–3 ${[1, 2, 3].map((k) => done(k).toFixed(2))} of their moves`);
});

test('the links squash with his body on the wind-up (a stretched band thins)', () => {
  const c = bandAt(BR.BREAK_END - 1)[3];
  near(c.sx, heroPose(BR.BREAK_END - 1).sx, 1e-9, 'x');
  near(c.sy, heroPose(BR.BREAK_END - 1).sy, 1e-9, 'y');
});

test('the tension pulses: on 2448 and 2460 and on every 32nd of 26.4 and the held breath a white outline runs along the band from the peg to him, one frame a link group, and only then', () => {
  const white = (f: number) => bandAt(f).filter((c) => c.white).map((c) => c.k);
  const pulses = [at(6, 3), at(6, 3.5), ...BR.TENSION, ...BR.CREEP];
  for (const t of pulses) {
    assert.deepEqual(white(t), [6, 7, 8], `${t}: at the peg`);
    assert.deepEqual(white(t + 1), [3, 4, 5], `${t + 1}: halfway`);
    assert.deepEqual(white(t + 2), [1, 2], `${t + 2}: at him`);
  }
  for (const f of LAUNCH.filter((f) => !pulses.some((t) => f >= t && f <= t + 2))) assert.deepEqual(white(f), [], `no pulse on ${f}`);
});

test('the anchor peg: a bold ink post (r ≥ 28, a cream ring and highlight, a hard shadow) that pops on 2448’s own frame, on screen to 2495, clear of his fist once he has stepped back (2464), of the blocks and of the window', () => {
  assert.equal(pegAt(at(6, 3) - 1), null);
  for (const s of shutter(at(6, 3))) assert.ok(pegAt(s)!.scale >= 0.6, `there on 2448’s own frame (${s})`);
  const p = pegAt(at(6, 4) - 2)!;
  assert.deepEqual([p.x, p.y], [PEG.x, PEG.y]);
  near(p.scale, 1, 1e-6, 'settled');
  assert.ok(PEG.r >= 28, 'r ≥ 28: a post about 60 px wide');
  // A post seen from the side (never a disc with a dot in it: that reads as a third eye): taller than wide, ink, a cream ring round it
  // and a cream highlight, a hard shadow down right.
  const parts = pegParts(p);
  const post = parts[1];
  assert.equal(post.color, 'ink');
  near(post.w, 2 * PEG.r, 1e-9, 'the post’s width');
  assert.ok(post.h >= 2.2 * post.w, `a post, not a disc (${post.w} × ${post.h})`);
  assert.deepEqual([parts[0].color, parts[0].x > post.x, parts[0].y > post.y, parts[0].w, parts[0].h], ['ink', true, true, post.w, post.h], 'a hard shadow, down right');
  const cream = parts.filter((s) => s.color === 'cream');
  assert.ok(cream.some((s) => s.w >= post.w - 1e-9 && s.h < post.h / 4), 'a cream ring round it');
  assert.ok(cream.some((s) => s.w < post.w / 3 && s.h > post.h / 3), 'a cream highlight down its side');
  for (const s of parts) assert.ok(s.h >= 0 && s.w >= 0 && s.kind === 'rect');
  // The post's half-size with its shadow (layout px).
  const hw = PEG.r + 10;
  const hh = post.h / 2 + 10;
  for (let f = at(6, 3); f < BR.BREAK_END; f++) {
    const [sx, sy] = seen(f, p.x, p.y);
    const z = launchCam(f).zoom * rigAt(f).zoom;
    assert.ok(sx - hw * z > 0 && sx + hw * z < 1920 && sy - hh * z > 0 && sy + hh * z < 1080, `on screen on ${f} (${sx.toFixed(0)}, ${sy.toFixed(0)})`);
    const w = windowAt(f).box!;
    assert.ok(sy - hh * z > w.y1 + 40 || sx + hw * z < w.x0, `clear of the window on ${f}`);
  }
  for (let f = at(6, 3.75) - 2; f < BR.BREAK_END; f++) {
    const b = fistBox(f);
    const dx = Math.max(b.x0 - (p.x + hw), 0, p.x - hw - b.x1);
    const dy = Math.max(b.y0 - (p.y + hh), 0, p.y - hh - b.y1);
    assert.ok(Math.hypot(dx, dy) > 0, `clear of his right つ on ${f}`);
  }
  for (const b of blocksAt(at(6, 4.25) + 2).blocks) {
    const inside = Math.abs(p.x - b.x) < b.w / 2 + hw && Math.abs(p.y - b.y) < b.h / 2 + hh;
    assert.ok(!inside, `clear of the ${b.color} block`);
  }
  // It is drawn in front of him (the band hooks onto it; nothing of his covers it).
  const front = launchAt(at(6, 4) - 2, L).front;
  assert.ok(front.over.some((s) => s.kind === 'rect'), 'in front: drawn over him');
});

test('the world: bar 25’s blocks at their places (the violet one cream, on the violet ground), shearing −10° toward him from 2451 — after 2448’s hit, not on it', () => {
  const b = blocksAt(at(6, 1.75) + 2);
  assert.deepEqual(b.blocks.map((x) => x.color).sort(), ['coral', 'cream', 'mint', 'yellow']);
  assert.equal(b.shear, 0);
  for (const f of [at(6, 3), at(6, 3) + 1, at(6, 3) + 2, at(6, 3.125)]) assert.equal(blocksAt(f).shear, 0, `no shear yet on ${f}`);
  assert.ok(blocksAt(at(6, 3.25) - 2).shear > 0, 'it starts on 2451');
  near(blocksAt(at(6, 4) - 2).shear, Math.tan((10 * Math.PI) / 180), 1e-6, 'shear −10°: the tops lean left, toward him');
});

test('E5, the window speaks in the system’s one voice: the dialog on 26.1&, LOUDER pressed on 26.2, root on 26.2&, sudo a word per 16th, ONE frame of 150bpm!!, then access granted', () => {
  assert.equal(windowAt(at(6, 1.5) - 1).box, null, 'no window before 26.1&');
  for (const s of shutter(BR.DIALOG)) assert.ok(windowAt(s).box, `it pops on ${BR.DIALOG}`);
  const has = (f: number, t: string) => windowAt(f).lines.some((l) => l.includes(t));
  assert.ok(has(at(6, 1.5), 'party too loud') && has(at(6, 1.5), WINDOW_TEXTS.ok) && has(at(6, 1.5), WINDOW_TEXTS.louder));
  assert.ok(windowAt(at(6, 2)).pressed && windowAt(at(6, 2.25) - 1).pressed && !windowAt(at(6, 2.25)).pressed && !windowAt(at(6, 2) - 1).pressed, 'LOUDER inverted for 6 frames');
  assert.ok(has(at(6, 2.5) + 2, 'party too loud') && !has(at(6, 2.5) + 2, WINDOW_TEXTS.root), 'the flip swaps halfway');
  assert.ok(has(at(6, 2.625), WINDOW_TEXTS.root) && !has(at(6, 2.625), WINDOW_TEXTS.louder));
  const typed = (f: number) => windowAt(f).lines.find((l) => l.startsWith('>')) ?? '';
  assert.equal(typed(at(6, 3) - 1), '');
  assert.equal(typed(at(6, 3)), '> sudo');
  assert.equal(typed(at(6, 3.25) - 1), '> sudo');
  assert.equal(typed(at(6, 3.25)), '> sudo make');
  assert.equal(typed(at(6, 3.5)), '> sudo make it');
  assert.equal(typed(at(6, 3.75)), '> sudo make it louder');
  for (const s of shutter(BR.PASSWORD)) assert.ok(has(s, WINDOW_TEXTS.plain), `150bpm!! on every sub-frame of ${BR.PASSWORD} (${s})`);
  for (const f of [BR.PASSWORD - 1, BR.PASSWORD + 1]) for (const s of shutter(f)) assert.ok(!has(s, WINDOW_TEXTS.plain), `never on ${f}`);
  assert.ok(has(BR.PASSWORD + 1, WINDOW_TEXTS.stars) && has(at(6, 4) - 1, WINDOW_TEXTS.stars));
  assert.ok(has(at(6, 4), WINDOW_TEXTS.granted) && !has(at(6, 4), WINDOW_TEXTS.root), 'rows 1–3 clear for access granted');
});

test('E5: from 26.4e the window grows a volume row that runs away 113 → 125 % and [WARN] party overload blinks 3 on / 3 off under it', () => {
  const vol = (f: number) => windowAt(f).lines.find((l) => l.startsWith('volume'));
  assert.equal(vol(at(6, 4.25) - 1), undefined);
  assert.ok(vol(at(6, 4.25))!.endsWith('113%'));
  for (const [f, v] of [[at(6, 4.5), 116], [at(6, 4.625), 119], [at(6, 4.75), 122], [at(6, 4.875), 125], [BR.BREAK_END - 1, 125]] as [number, number][]) assert.ok(vol(f)!.endsWith(`${v}%`), `${v} % on ${f}`);
  const warn = (f: number) => windowAt(f).lines.includes(WINDOW_TEXTS.overload);
  assert.deepEqual([at(6, 4.25), at(6, 4.25) + 1, at(6, 4.25) + 2, at(6, 4.375), at(6, 4.5) - 2, at(6, 4.5) - 1, at(6, 4.5)].map(warn), [true, true, true, false, false, false, true]);
  assert.equal(warn(BR.BREAK_END - 1), false, 'off on 2495 (§7.3)');
  assert.ok(windowAt(BR.BREAK_END - 1).box!.y1 > windowAt(at(6, 4.25) - 1).box!.y1, 'the box grew a row');
});

test('E5: the window is opaque (nothing of the world shows through it: linear 94 % still lets 6 % of the cream and confetti through), and [WARN] party overload is legible — JetBrains Mono Bold 22 px on a #0C0F0E strip', () => {
  for (const f of [at(6, 1.5), at(6, 2.75) - 2, at(6, 4) - 2, at(6, 4.25) + 2, BR.BREAK_END - 1]) assert.equal(windowAt(f).rects[0].alpha, 1, `backing opaque on ${f}`);
  // The strip blinks with its text (never a bare dark bar): off on break 6.4e + 3 and on the break's last frame.
  for (const f of [at(6, 4.375), BR.BREAK_END - 1]) assert.equal(windowAt(f).rects.find((r) => r.y > windowAt(f).box!.y1), undefined, `no strip on ${f}`);
  for (const f of [at(6, 4.25), at(6, 4.5), at(6, 4.75)]) {
    const w = windowAt(f);
    const strip = w.rects.find((r) => r.y > w.box!.y1);
    assert.ok(strip, `a strip under the box on ${f}`);
    assert.equal(strip.alpha, 1);
    assert.deepEqual(strip.color, windowAt(f).rects[0].color, 'the window’s own dark');
    const text = w.glyphs.filter((g) => g.y > w.box!.y1);
    for (const g of text) {
      near(g.size, 22, 1e-9, 'Bold 22 px');
      assert.ok(Math.abs(g.y - strip.y) < strip.h / 2 && g.x > strip.x - strip.w / 2 && g.x < strip.x + strip.w / 2, `${g.ch} on the strip`);
    }
  }
});

test('the window is screen-fixed at the top right and never covers his face', () => {
  for (const f of LAUNCH.filter((f) => f >= at(6, 1.5))) {
    const w = windowAt(f).box!;
    const h = heroPose(f);
    const cam = launchCam(f);
    // His face core's top: the brackets reach about 0.45 em above the ω's centre.
    const [, top] = toScreen(cam, h.omega[0], h.omega[1] - 0.45 * h.em * h.sy);
    assert.ok(w.y1 <= top + 1e-6 || f === at(6, 2), `window bottom ${w.y1.toFixed(0)} above his face top ${top.toFixed(0)} on ${f}`);
  }
  near(WIN.x0, 1094, 0, 'x0');
  near(WIN.x0 + WIN.cols * WIN.cell, 1874, 1e-9, 'x1');
});

test('every character bar 26 draws is in its atlas list and listed for the glyph check in the role it is drawn in', () => {
  const roles = new Map<string, Set<string>>();
  for (const t of BREAK_TEXTS) for (const ch of t.text) roles.set(t.role, (roles.get(t.role) ?? new Set()).add(ch));
  const heroSet = new Set(LAUNCH_ATLAS.hero.flatMap((s) => [...s]));
  const monoSet = new Set(LAUNCH_ATLAS.mono.flatMap((s) => [...s]));
  for (let f = at(6); f < BR.BREAK_END; f += 0.5) {
    const c = launchAt(f, L);
    for (const g of [...(c.back.glyphs.hero ?? []), ...(c.front.glyphs.hero ?? []), ...(c.window.glyphs.hero ?? [])]) {
      assert.ok(heroSet.has(g.ch), `${g.ch} on ${f} is in the hero atlas`);
      assert.ok(roles.get('rounded')!.has(g.ch), `${g.ch} is listed as rounded`);
    }
    for (const g of c.window.glyphs.mono ?? []) {
      assert.ok(monoSet.has(g.ch), `${g.ch} on ${f} is in the mono atlas`);
      assert.ok(roles.get('mono')!.has(g.ch), `${g.ch} is listed as mono`);
    }
  }
});

test('enough sub-frames where things move fast: the uppercut (2418–2436) and the slingshot with the film’s bulge (2448–2481); the held breath on the default', () => {
  for (let f = at(6, 1.75); f <= at(6, 2.5); f++) assert.ok(launchTemporal(f).samples >= 32, `${f}`);
  for (let f = at(6, 3); f <= at(6, 4.375); f++) assert.ok(launchTemporal(f).samples >= 32, `${f}`);
  assert.ok(launchTemporal(at(6, 4.75)).samples >= 16);
});

test('the ✧ glint on his right fist runs 2490 → 2494 and has faded by 2495 (drop 2 inherits a clean fist, §7.3)', () => {
  for (const s of shutter(BR.FIST_GLINT - 1)) assert.equal(fistGlint(s), 0, `not before its frame (${s})`);
  for (const s of shutter(BR.FIST_GLINT)) assert.ok(s <= BR.FIST_GLINT || fistGlint(s) > 0, `starting on its frame (${s})`);
  assert.ok(fistGlint(BR.BREAK_END - 4) > 1, 'bright at its peak');
  for (const s of shutter(BR.BREAK_END - 1)) assert.equal(fistGlint(s), 0, `faded on 2495 (${s})`);
  for (const s of shutter(BR.BREAK_END - 1)) assert.ok(!(launchAt(s, L).front.glyphs.hero ?? []).some((g) => g.ch === '✧'), `no ✧ drawn on 2495 (${s})`);
});

test('26.3’s hit frame carries one event: the confetti hold still on 2448 and drift from 2451, with the steps of 26.3&, 26.4 and 26.4e', () => {
  const x0 = (f: number) => launchAt(f, L).back.under.find((s) => s.kind === 'ellipse')!.x;
  near(x0(at(6, 3) + 0.25), x0(at(6, 3) - 0.25), 1e-9, 'not on 2448');
  near(x0(at(6, 3) + 2.25), x0(at(6, 3) - 0.25), 1e-9, 'not before 2451');
  assert.ok(x0(at(6, 3.25)) < x0(at(6, 3) + 2) - 10, 'drifting left from 2451');
  assert.ok(x0(BR.BREAK_END - 1) < x0(at(6, 3.25)) - 60, 'and on the later steps');
});

test('his ω’s ink centre on screen (R2-02: what the film’s black spot is round about) sits OMEGA_INK em under its placement point, through the camera and the rig: ≈ (612.5, 617) on 2495, measured on the --final still', () => {
  assert.ok(OMEGA_INK > 0.09 && OMEGA_INK < 0.13, `${OMEGA_INK} em`);
  for (const f of [at(6, 1.75) + 2, at(6, 3) + 2, at(6, 4) + 1, at(6, 4.75), BR.BREAK_END - 1]) {
    const h = heroPose(f);
    const [x, y] = seen(f, h.omega[0], h.omega[1] + OMEGA_INK * h.em * h.fy);
    near(omegaInkOnScreen(f)[0], x, 1e-9, `ink centre x on ${f}`);
    near(omegaInkOnScreen(f)[1], y, 1e-9, `ink centre y on ${f}`);
  }
  // The amber fill of his ω on the --final still of the break's last frame spans x 468–757, y 497–737.
  near(omegaInkOnScreen(BR.BREAK_END - 1)[0], 612.5, 5, 'on the ω’s ink, x');
  near(omegaInkOnScreen(BR.BREAK_END - 1)[1], 617, 5, 'on the ω’s ink, y');
  // And on the frame before break 6.3 (no squash, no turn to speak of): the fill spans x 785–1137, y 459–720.
  near(omegaInkOnScreen(at(6, 3) - 1)[0], 961, 3, 'on 2447, x');
  near(omegaInkOnScreen(at(6, 3) - 1)[1], 589.5, 4, 'on 2447, y');
});

test('bar 26 is exposed at a 0.35 shutter (R2-01): the pull-back and the steps keep their crisp ink (16 px smears became 9), and every drum swap is still whole on its frame', () => {
  for (const f of LAUNCH) assert.ok(launchTemporal(f).shutter <= 0.35 + 1e-9 && launchTemporal(f).shutter >= 0.3, `${f}: ${launchTemporal(f).shutter}`);
  for (const f of LAUNCH) {
    const s = shutter(f);
    assert.ok(Math.max(...s) - Math.min(...s) <= 0.35 + 1e-9, `${f}'s sub-frames span ${(Math.max(...s) - Math.min(...s)).toFixed(3)} frames`);
  }
});

test('the held breath’s creeps land on their 32nds (the arp’s notes 2484 / 2487 / 2490 / 2493): on each one’s own frame he has already crept ≥ 3 of its 4 px, none of it the frame before', () => {
  for (const c of BR.CREEP) {
    for (const s of shutter(c - 1)) assert.equal(creepAt(s, c), 0, `none of it on ${c - 1} (${s})`);
    for (const s of shutter(c)) assert.ok(creepAt(s, c) >= 0.75, `crept on ${c}’s own frame (${s}: ${creepAt(s, c).toFixed(3)})`);
    for (const s of shutter(c + 2)) assert.equal(creepAt(s, c), 1, `whole from ${c + 2}`);
  }
  // He moves with them: on break 6.4& (the 6.4e step has settled) he is 3+ px further back than on the frame before.
  assert.ok(heroPose(at(6, 4.5) - 1).omega[0] - heroPose(at(6, 4.5)).omega[0] >= 3, 'the first creep shows on 2484');
  near(heroPose(BR.BREAK_END - 1).omega[0], 644, 1e-9, 'and (644, 548) on 2495 all the same');
});
