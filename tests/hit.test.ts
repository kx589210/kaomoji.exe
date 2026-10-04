import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FULL_AIM, LEAD, RING, aimAt, aimMoves, aimPose, composeAim, flash, flowAim, hit, hop, launch, moveTrack, punch, rise, shake, slam, strike, track, within } from '../src/motion/hit.ts';

const peak = (f: (x: number) => number, a: number, b: number) => Math.max(...Array.from({ length: Math.round((b - a) * 20) + 1 }, (_, i) => f(a + i / 20)));

test('a hit is still until its lead, starts fast, lands exactly on its frame, overshoots a little and holds', () => {
  assert.equal(hit(94, 100, 6), 0);
  assert.ok(hit(95, 100, 6) > 1.3 / 6, 'faster than an even move at the start');
  assert.equal(hit(100, 100, 6), 1);
  const over = peak((f) => hit(f, 100, 4), 100, 100 + RING);
  assert.ok(over > 1.05 && over < 1.12, `overshoot ${over}`);
  for (let f = 100 + RING; f < 130; f += 0.5) assert.equal(hit(f, 100, 4), 1);
  assert.ok(Math.abs(hit(100 + 0.75 * RING, 100, 4) - 1) < 0.01, 'almost settled before the ring ends');
});

test('a hit has no jump anywhere', () => {
  for (let f = 90; f < 112; f += 0.01) assert.ok(Math.abs(hit(f + 0.01, 100, 4) - hit(f, 100, 4)) < 0.01, `${f}`);
});

test('bounce scales the overshoot, and 0 lands dead; rise never passes 1', () => {
  const a = peak((f) => hit(f, 100, 4, 0.5), 100, 108) - 1;
  const b = peak((f) => hit(f, 100, 4, 1), 100, 108) - 1;
  assert.ok(Math.abs(a / b - 0.5) < 1e-6);
  assert.equal(peak((f) => hit(f, 100, 4, 0), 100, 108), 1);
  assert.ok(peak((f) => rise(f, 100, 4), 90, 110) <= 1);
  assert.equal(rise(100, 100, 4), 1);
});

test('a track holds each value between its keys, with half a beat of stillness when keys are a beat apart', () => {
  const keys = [{ land: 24, to: 10 }, { land: 48, to: -5 }];
  assert.equal(track(10, 3, keys), 3);
  assert.equal(track(24, 3, keys), 10);
  for (let f = 24 + RING; f <= 48 - LEAD; f += 0.5) assert.equal(track(f, 3, keys), 10);
  assert.ok(48 - LEAD - (24 + RING) >= 12, 'half a beat');
  assert.equal(track(60, 3, keys), -5);
});

test('an aim moves its zoom evenly in scale and lands on each key', () => {
  const keys = [{ land: 24, aim: { zoom: 4, x: 100, y: -50, roll: 0.1 } }];
  assert.deepEqual(aimAt(0, FULL_AIM, keys), FULL_AIM);
  assert.deepEqual(aimAt(24, FULL_AIM, keys), keys[0].aim);
  const mid = aimAt(22, FULL_AIM, keys);
  const share = hit(22, 24);
  assert.ok(Math.abs(mid.zoom - 4 ** share) < 1e-9 && Math.abs(mid.x - 100 * share) < 1e-9);
  const p = aimPose({ zoom: 2, x: 10, y: 20, roll: 0 }, 3000, 20, -500);
  assert.deepEqual(p.position, [10, 20, 1000]);
  assert.deepEqual(p.target, [10, 20, -500]);
});

test('a hop lifts and comes back down exactly on its landing', () => {
  assert.equal(hop(94, 100), 0);
  assert.ok(Math.abs(hop(97, 100) - 1) < 1e-9);
  assert.ok(Math.abs(hop(100, 100)) < 1e-9);
});

test('a punch starts on its kick, peaks 1.5 frames later and is gone 14 frames after the kick', () => {
  assert.equal(punch(100, 100), 0);
  assert.ok(punch(100.5, 100) > 0.3);
  assert.equal(punch(101.5, 100), 1);
  for (let f = 114; f < 120; f++) assert.equal(punch(f, 100), 0);
  for (let f = 99; f < 115; f += 0.01) assert.ok(Math.abs(punch(f + 0.01, 100) - punch(f, 100)) < 0.03, `${f}`);
});

test('a shake starts at zero on its beat, dies away within 16 frames, and seeds differ', () => {
  assert.deepEqual(shake(100, 100, 1), [0, 0, 0]);
  assert.ok(Math.hypot(...shake(101.5, 100, 1)) > 0.3);
  assert.deepEqual(shake(116, 100, 1), [0, 0, 0]);
  assert.notDeepEqual(shake(102, 100, 1), shake(102, 100, 2));
  for (let f = 100; f < 116; f += 0.01) assert.ok(Math.abs(shake(f + 0.01, 100, 3)[0] - shake(f, 100, 3)[0]) < 0.05, `${f}`);
});

test('a flash pops on its frame and is gone within 8', () => {
  assert.equal(flash(99, 100), 0);
  assert.equal(flash(100, 100), 1);
  assert.ok(flash(101, 100) < 0.7 && flash(103, 100) < 0.25);
  assert.equal(flash(108, 100), 0);
  assert.ok(within(99, [[100, 104]]) && !within(106, [[100, 104]]));
});

test('a strike starts at full speed on its beat, covers about 3/4 in 3 frames, overshoots softly and is exactly still after 8 × tau', () => {
  assert.equal(strike(100, 100), 0);
  assert.ok(strike(101, 100) > 0.25, 'fast from the first frame');
  assert.ok(Math.abs(strike(103, 100) - 0.74) < 0.02);
  const over = peak((f) => strike(f, 100), 100, 124);
  assert.ok(over > 1.02 && over < 1.06, `${over}`);
  for (let f = 124; f < 140; f++) assert.equal(strike(f, 100), 1);
  assert.equal(peak((f) => strike(f, 100, 3, 0), 100, 130), 1, 'bounce 0 never overshoots');
  for (let f = 99; f < 125; f += 0.01) assert.ok(Math.abs(strike(f + 0.01, 100) - strike(f, 100)) < 0.01);
});

test('a launch can wind up first: back by depth, then off from there on the beat', () => {
  const o = { depth: 0.1, len: 6 };
  assert.equal(launch(93, 100, o), 0);
  assert.ok(Math.abs(launch(100, 100, o) + 0.1) < 1e-9);
  assert.ok(launch(97, 100, o) < 0 && launch(97, 100, o) > -0.1);
  assert.equal(launch(130, 100, o), 1);
});

test('a slam eases in, hits exactly on its beat at speed, recoils a little and is still 12 frames later', () => {
  assert.equal(slam(91, 100, 8), 0);
  assert.ok(slam(96, 100, 8) < 0.5 * (4 / 8), 'eases in');
  assert.equal(slam(100, 100, 8), 1);
  assert.ok(peak((f) => slam(f, 100, 8), 100, 112) < 1.06);
  for (let f = 112; f < 130; f++) assert.equal(slam(f, 100, 8), 1);
});

test('moveTrack chains launches and slams; aimMoves moves zoom evenly in scale', () => {
  const moves = [{ at: 24, to: 10 }, { at: 48, to: -5, kind: 'slam' as const, lead: 6 }];
  assert.equal(moveTrack(20, 3, moves), 3);
  assert.ok(Math.abs(moveTrack(47.99 - 6, 3, moves) - 10) < 1e-3, 'at rest (the strike settles softly) when the slam begins');
  assert.equal(moveTrack(48, 3, moves), -5);
  const a = aimMoves(24 + 30, FULL_AIM, [{ at: 24, aim: { zoom: 4, x: 10, y: 0, roll: 0 } }]);
  assert.ok(Math.abs(a.zoom - 4) < 1e-9 && Math.abs(a.x - 10) < 1e-9);
});

test('a flow never stops; composeAim multiplies zooms and adds offsets', () => {
  const f = (t: number) => flowAim(t, 0, { zoom: 1.03, x: 5, roll: 0.01 });
  assert.ok(f(24).zoom > f(23).zoom && Math.abs(f(24).zoom - 1.03) < 1e-12 && Math.abs(f(48).x - 10) < 1e-12);
  assert.deepEqual(composeAim({ zoom: 2, x: 1, y: 2, roll: 0.1 }, { zoom: 1.5, x: 3, y: -1, roll: 0.05 }), { zoom: 3, x: 4, y: 1, roll: 0.15000000000000002 });
});
