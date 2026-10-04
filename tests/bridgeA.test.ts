// Bridge A (v08, X02: src/score/bridgeA.ts, src/shots/bridgeA.ts, src/scenes/bridgeA.ts): the breath between the cosmos's point and the
// comic club's first dot. The v07 review: the turn from the cosmos to the comic came too fast. These pin the score's grid, the anchor (his left eye at the frame's centre
// on every frame), the push that lands on club 1.1's zoom, the layers printing a beat apart, the hand-offs on both sides (the cosmos's last
// frame into the bridge's first; the bridge's last into club 1.1's face and burst) and the finish going from the cosmos's to the club's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pose } from '../src/engine/camera.ts';
import type { RGB } from '../src/engine/color.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as A from '../src/score/bridgeA.ts';
import { CLUB, DOT_INKS } from '../src/score/club.ts';
import { POINT } from '../src/score/cosmos.ts';
import { isHeld, partEnd, partStart } from '../src/score/film.ts';
import { SHOTS } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import {
  BRIDGE_A_SEGMENT, BUMP_KICKS, CORNERS, EYE_R, FRONT_PX, PAGE, PUSH, bridgeAAt, bridgeALook, bridgeATemporal, bridgeCam, bumpAt, eyeOpen, frontAt,
  glowDots, leftEyeR, onScreenAt, penAt, plateShare, pushAt, rippleDots, rippleScale, rollAt,
} from '../src/shots/bridgeA.ts';
import { SPLASH_EYE, SPLASH_ZOOM, inkAAim } from '../src/shots/clubInkA.ts';
import { AMBER, CYAN, FRONT, type InkDraw, type InkLayout, PINK, VOID } from '../src/shots/clubInkKit.ts';
import { STUTTER_RINGS, pointEye, stutterRingDots } from '../src/shots/cosmosHole.ts';
import { BridgeAScene } from '../src/scenes/bridgeA.ts';

const advance = (ch: string): number => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6);
const L: InkLayout = { advance: { face: advance, sfx: advance, ui: advance, display: advance, mono: advance, readout: advance } };
const S = A.BRIDGE_A_START;
const END = A.BRIDGE_A_END;
const same = (a: RGB, b: RGB): boolean => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const zoomOf = (pose: Pose): number => FRONT / (pose.position[2] - pose.target[2]);
/** Screen px (y up) of world point (x, y) on z = 0 seen through `pose`. */
function screenOf(pose: Pose, x: number, y: number): [number, number] {
  const zoom = zoomOf(pose);
  const r = Math.atan2(pose.up[0], pose.up[1]);
  const dx = x - pose.target[0];
  const dy = y - pose.target[1];
  return [zoom * (Math.cos(r) * dx - Math.sin(r) * dy), zoom * (Math.sin(r) * dx + Math.cos(r) * dy)];
}
const shapes = (draws: readonly InkDraw[]) => draws.flatMap((d) => [...d.content.under, ...d.content.over].map((s) => ({ pose: d.pose, s })));
const glyphs = (draws: readonly InkDraw[]) => draws.flatMap((d) => Object.values(d.content.glyphs).flat().map((g) => ({ pose: d.pose, g })));
/** The left eye's amber disc on output frame F: the amber ellipse nearest the frame's centre, its screen centre and Ø (px). */
function eyeOf(F: number): { at: [number, number]; w: number; h: number } {
  const discs = shapes(bridgeAAt(F, L))
    .filter(({ s }) => s.kind === 'ellipse' && s.color.every((v, i) => Math.abs(v / AMBER[i] - s.color[0] / AMBER[0]) < 1e-6) && s.w * 1 > 4)
    .map(({ pose, s }) => ({ at: screenOf(pose, s.x, s.y), w: s.w * zoomOf(pose), h: s.h * zoomOf(pose) }))
    .sort((a, b) => Math.hypot(...a.at) - Math.hypot(...b.at));
  return discs[0];
}

test('the score: one bar (club 1.1 follows it), every event on the 32nd grid inside it, the layers a beat apart', () => {
  assert.equal(S, partStart('bridgeA'));
  assert.equal(END, partEnd('bridgeA'));
  assert.equal(END, CLUB.from);
  assert.equal(END - S, 96);
  const frames = [
    A.LANDING, A.BLINK.from, A.BLINK.to, ...A.GLASS, ...A.GLASS_THREAD, ...A.HATS, ...A.OPEN_HATS, ...A.KICKS, A.BASS, ...A.PLUCKS, ...A.FILL, A.PICKUP.piano, A.PICKUP.horn,
    ...A.STABS, A.SWELL.from, A.PLATES, A.REGISTER_STEP, A.REGISTER, ...A.HOOK_GHOST.map((h) => h.at), A.PEN.from, A.PEN.to, A.TARGETS, ...A.DOTS,
  ];
  for (const f of frames) {
    assert.ok(Number.isInteger(f) && f % 3 === 0, `${f} on the 32nd grid`);
    assert.ok(f >= S && f < END, `${f} inside the bridge`);
  }
  assert.equal(A.SWELL.to, END);
  assert.deepEqual(A.KICKS, [S + 24, S + 48, S + 72], 'a kick on every beat but the breath’s (FW2’s designed breath)');
  assert.deepEqual([A.PLATES, A.REGISTER_STEP, A.REGISTER], [S + 24, S + 36, S + 48], 'the plates land on beat 2, step on 2&, register on 3.1');
  assert.equal(A.BASS, A.REGISTER, 'the bass enters as the plates register');
  assert.deepEqual(A.DOTS.slice(3), [...A.FILL], 'the dots print a ring further on each hit of the fill');
  assert.deepEqual(A.BRIDGE_A_ACCENTS, [], 'no rig energy: the print bump is the scene’s own, crisp');
  for (const f of [S, S + 48, END - 1]) assert.equal(isHeld(f), false, `${f} is drawn (the bridge is built)`);
});

test('the bridge is its own span and shot (X02), continuous into C1', () => {
  assert.deepEqual(SPANS.filter((s) => s.key === 'bridgeA').map((s) => [s.from, s.to, s.held ?? false]), [[S, END, false]]);
  const x02 = SHOTS.find((s) => s.id === 'X02')!;
  assert.equal(x02.exit, 'continuous');
  const scene = new BridgeAScene();
  assert.deepEqual(scene.segment(), { from: S, to: END });
  assert.deepEqual(BRIDGE_A_SEGMENT, { from: S, to: END });
});

test('the anchor: his left eye holds the frame’s centre on every frame of the bridge (≤ 1 px; on a kick’s print bump it drops with the page, ≤ 6.5 px), as the point did and as club 1.1’s eye does', () => {
  for (let F = S; F < END; F++) {
    const e = eyeOf(F);
    assert.ok(e, `${F}: an eye`);
    assert.ok(Math.hypot(...e.at) <= (bumpAt(F) > 0 ? 6.5 : 1), `${F}: the eye at ${e.at.map((v) => v.toFixed(2))}`);
  }
  assert.deepEqual(SPLASH_EYE, [inkAAim(DOT_INKS).x, -inkAAim(DOT_INKS).y], 'club 1.1’s camera looks at the same eye');
});

test('the push: from the point’s scale (the eye Ø 34, the cosmos’s point r 17) to club 1.1’s zoom, slow through the breath, never back, landing ≤ 3 % short', () => {
  assert.ok(Math.abs(pushAt(S) - PUSH.from) < 1e-12);
  const d0 = eyeOf(S).w;
  assert.ok(Math.abs(d0 - 2 * pointEye(POINT.from + 2).r) < 0.5, `the eye Ø ${d0.toFixed(2)} on the bridge’s first frame, the point’s ${2 * pointEye(POINT.from + 2).r}`);
  assert.ok(pushAt(S + 24) / pushAt(S) < 1.1, 'the breath: under 10 % in beat 1');
  for (let f = S; f < END - 0.5; f += 0.5) assert.ok(pushAt(f + 0.5) >= pushAt(f) - 1e-12, `${f}: never pulls back`);
  assert.ok(pushAt(END - 1) > 0.97 && pushAt(END - 1) < 1, `lands short of club 1.1’s zoom: ${pushAt(END - 1).toFixed(3)}`);
  const step = pushAt(END - 1) / pushAt(END - 2);
  assert.ok(step > 1.01 && step < 1.035, `still moving into the downbeat (${((step - 1) * 100).toFixed(2)} % a frame): the push lands on the burst`);
  assert.equal(bridgeCam(END - 1e-9).z, SPLASH_ZOOM * pushAt(END - 1e-9));
});

test('the roll: clockwise all the way (as the stutter turned) to club 1.1’s −2°, easing out', () => {
  assert.equal(rollAt(S), -10);
  assert.ok(Math.abs(rollAt(END) - -2) < 1e-12);
  assert.ok(Math.abs(inkAAim(DOT_INKS).roll - (2 * Math.PI) / 180) < 1e-9, 'club 1.1’s camera rolls −2° (aim roll is the negation)');
  for (let f = S; f < END; f++) assert.ok(rollAt(f + 1) >= rollAt(f), `${f}: clockwise`);
});

test('beat 1: the stutter’s rings jump out on the landing (most of the jump on its frame) from where the point left them, drift and dissolve, gone by beat 2; the glow goes by the blink; the point blinks on 1&', () => {
  const held = stutterRingDots(S - 1);
  const first = rippleDots(S);
  assert.equal(first.length, held.length, 'the same dots');
  first.forEach((d, i) => {
    const r0 = Math.hypot(held[i].x, held[i].y);
    const r1 = Math.hypot(d.x, d.y);
    assert.ok(Math.abs(Math.atan2(d.y, d.x) - Math.atan2(held[i].y, held[i].x)) < 1e-9, `dot ${i} on its ray`);
    assert.ok(r1 / r0 > 1.1 && r1 / r0 < 1.3, `dot ${i} out ${(r1 / r0).toFixed(3)} on the landing`);
    assert.equal(d.paper, 0.8);
  });
  const jump = (rippleScale(0, 0) - 1) / (rippleScale(6, 0) - 1);
  assert.ok(jump > 0.5, `most of the move on the landing’s frame: ${jump.toFixed(2)}`);
  assert.equal(STUTTER_RINGS.r.length, 3);
  assert.equal(rippleDots(A.PLATES).length, 0, 'off the frame by the plates’ landing');
  assert.ok(glowDots(S).length > 0 && glowDots(A.BLINK.from).length === 0);
  assert.equal(eyeOpen(A.BLINK.from - 1), 1);
  assert.ok(eyeOpen(A.BLINK.from + 2) < 0.2, 'shut on 1&');
  assert.ok(eyeOpen(A.BLINK.to + 3) > 0.99, 'open again on 1a');
});

test('beats 2–3: the plates land off register round the eye on the kick, step on 2&, register on 3.1; the eye is in register throughout and opens as they register', () => {
  const ghosts = (F: number) => glyphs(bridgeAAt(F, L)).filter(({ g }) => same(g.color, CYAN) || same(g.color, PINK));
  assert.equal(ghosts(A.PLATES - 1).length, 0, 'nothing before the plates');
  assert.equal(ghosts(A.PLATES).length, 6, 'the cyan and the pink plate of ( ω ) on their kick');
  assert.equal(plateShare(A.PLATES), 1);
  assert.ok(plateShare(A.REGISTER_STEP) < 0.8 && plateShare(A.REGISTER_STEP) > 0.5, 'a step on 2&, most of it on its frame');
  assert.ok(Math.abs(plateShare(A.REGISTER)) < 0.25, 'most of the way on 3.1');
  for (let F = A.REGISTER + 6; F < END; F++) assert.ok(Math.abs(plateShare(F)) < 1e-9, `${F}: in register`);
  assert.ok(Math.abs(leftEyeR(A.REGISTER - 1) - EYE_R.left) < 1e-12, 'the point’s size until the register');
  assert.ok(leftEyeR(A.REGISTER) > EYE_R.left + 0.5 * (EYE_R.right - EYE_R.left), 'opening on 3.1');
  assert.ok(Math.abs(leftEyeR(A.REGISTER + 6) - EYE_R.right) < 1e-12, 'as open as the right eye, as on club 1.1');
});

test('the page: the pen draws its border over beat 2, its corners and targets lie outside the frame by club 1.1', () => {
  assert.equal(penAt(A.PEN.from - 1), 0);
  assert.equal(penAt(A.PEN.to), 1);
  const cam = bridgeCam(END - 1);
  for (const [x, y] of CORNERS) {
    const [sx, sy] = onScreenAt(cam, x, y);
    assert.ok(Math.abs(sx) > 960 || Math.abs(sy) > 540, `corner (${x}, ${y}) off the frame on the last frame`);
  }
  const [lx] = onScreenAt(cam, SPLASH_EYE[0] - PAGE.w, SPLASH_EYE[1]);
  assert.ok(lx < -960, 'the border’s left side is out');
});

test('beats 3–4: the Ben-Day dots print outward from 3.1e on the sixteenths and the fill, the front only growing; club 1.1’s burst takes it on', () => {
  assert.equal(frontAt(A.DOTS[0] - 1), 0);
  for (let F = A.DOTS[0]; F < END; F++) assert.ok(frontAt(F + 1) >= frontAt(F), `${F}: the front grows`);
  assert.ok(frontAt(END - 1) > 0.95 * FRONT_PX[FRONT_PX.length - 1]);
  assert.ok(frontAt(END - 1) < 1150 * 0.73, 'inside club 1.1’s burst (its trough 840 px): the downbeat still bursts');
  const dots = shapes(bridgeAAt(END - 1, L)).filter(({ s }) => s.kind === 'ellipse' && s.w === s.h && !same(s.color, AMBER) && s.w * zoomOf(bridgeAAt(END - 1, L)[0].pose) < 60);
  assert.ok(dots.length > 800, `the printed lattice on the last frame: ${dots.length} dots`);
});

test('the print bump on the kicks from beat 2, whole on the kick’s frame', () => {
  assert.deepEqual(BUMP_KICKS, A.KICKS);
  for (const k of BUMP_KICKS) {
    assert.equal(bumpAt(k), 1);
    assert.equal(bumpAt(k - 1), 0);
    assert.equal(bumpAt(k + 6), 0);
  }
  assert.equal(bumpAt(S), 0, 'no bump on the landing (the breath)');
});

test('the finish: the cosmos’s point’s (bloom 1.15 over 0.75, no grain, no print) on the first frame, the club’s print by the plates’ landing; the void the ground throughout', () => {
  const a = bridgeALook(S);
  assert.equal(a.bloom.intensity, 1.15);
  assert.equal(a.bloom.threshold, 0.75);
  assert.equal(a.grain, 0);
  assert.equal(a.comic!.amount, 0);
  const b = bridgeALook(A.PLATES);
  assert.equal(b.bloom.intensity, 0);
  assert.equal(b.comic!.amount, 1);
  assert.equal(b.grain, 0.03);
  for (const F of [S, A.PLATES, END - 1]) assert.ok(same(bridgeAAt(F, L)[0].paper!.color, VOID), `${F}: the void`);
});

test('photography: the print’s shutter inside the bridge’s own bar (no sub-frame reaches the point or club 1.1)', () => {
  for (const F of [S, S + 48, END - 1]) {
    const t = bridgeATemporal(F);
    assert.equal(t.shutter, 0.3);
    for (const s of temporalSamples(F, t, BRIDGE_A_SEGMENT)) assert.ok(s.frame >= S && s.frame < END, `${F}: sub-frame ${s.frame}`);
  }
});
