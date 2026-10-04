// E7 donut.exe inside S29, one beat (20-bar sheet notes/bid2/drop2-sheet2.md §1.3 D, §3 drop2 3.3–3.4; design drop2-final.md §3.1
// bar 37): the torus is donut.c's — its 2 : 1 radii, its two spin axes, its light and its 12-character ramp — Ø 1100 round his 1250 px
// face; he swallows himself into it on drop2 3.3 (the brackets first, the ω last: 75 % by + 3, whole by + 6), its spin doubles over the
// & and lands face-on as the re-form starts, and he re-forms out of it on the drop2 3.4 clap (the ω first), straight into the conveyor.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIALECT_GLYPHS } from '../src/content/drop2.ts';
import { ZBUF2 } from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import * as DN from '../src/shots/drop2Donut.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
/** Drop 2's bar `bar`, beat `beat` (both 1-based), as a film frame. */
const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const SW = ZBUF2.swallow;
const RF = ZBUF2.reform;

test('the one beat: swallowed on drop2 3.3, the spin’s doubling on 3.3&, the re-form landing on the 3.4 clap', () => {
  assert.deepEqual([SW.from, RF.to, ZBUF2.donut.from, ZBUF2.donut.to], [d2at(3, 3), d2at(3, 4), d2at(3, 3), d2at(3, 4)]);
  assert.equal(DN.SPIN_DOUBLE.from, d2at(3, 3.5));
  assert.equal(DN.SPIN_DOUBLE.to, RF.from, 'the doubling whips it face-on as the re-form starts');
});

test('the ramp is donut.c’s own, twelve characters from unlit to lit', () => {
  assert.equal(DN.DONUT_RAMP, '.,-~:;=!*#$@');
  assert.equal(DN.DONUT_RAMP, DIALECT_GLYPHS.donut);
});

test('the light is donut.c’s (0, 1, −1) in its own axes: up and toward the viewer; an unlit surface still prints a dot', () => {
  const s = Math.SQRT1_2;
  assert.equal(DN.donutIndex([0, s, s]), 11, 'facing the light: @');
  assert.equal(DN.donutChar([0, s, s]), '@');
  assert.equal(DN.donutIndex([0, -s, -s]), 0, 'facing away: still a dot, as donut.c prints');
  assert.equal(DN.donutChar([0, 0, -1]), '.');
  assert.equal(DN.donutIndex([0, 0, 1]), 8, 'facing the viewer: L = 1, N = 8·L = 8 (donut.c’s unnormalised light)');
  for (let k = 0; k < 200; k++) {
    const a = k * 0.37;
    const n: DN.Vec3 = [Math.cos(a) * Math.sin(k), Math.sin(a) * Math.sin(k), Math.cos(k)];
    const i = DN.donutIndex(n);
    assert.ok(i >= 0 && i <= 11 && Number.isInteger(i));
  }
});

test('the torus has donut.c’s 2 : 1 radii and is 960 px across on screen (his 1250 px face’s ( and ) fold onto its arcs; it fits the frame face-on)', () => {
  assert.ok(near(DN.TORUS.ring / DN.TORUS.tube, 2));
  assert.ok(near(2 * (DN.TORUS.ring + DN.TORUS.tube), 960));
  assert.deepEqual(DN.TORUS.centre, [960, 530]);
});

test('the torus distance: zero on its surface, negative inside the tube, and the spin rotates it rigidly', () => {
  const R = 300;
  const r = 150;
  const rot = DN.torusRotation(0, 0);
  // donut.c's torus at A = B = 0: the circle in the xy-plane at (R, 0) swept about the y axis.
  assert.ok(near(DN.torusDistance([R + r, 0, 0], rot, R, r), 0));
  assert.ok(near(DN.torusDistance([0, 0, R - r], rot, R, r), 0));
  assert.ok(near(DN.torusDistance([R, 0, 0], rot, R, r), -r));
  assert.ok(near(DN.torusDistance([0, 0, 0], rot, R, r), R - r), 'the hole');
  for (const [a, b] of [[0.7, 0], [0, 1.1], [2.3, 0.4]]) {
    const m = DN.torusRotation(a, b);
    const p: DN.Vec3 = [R + r, 0, 0];
    const q = DN.rotate(m, p);
    assert.ok(Math.abs(DN.torusDistance(q, m, R, r)) < 1e-9, `(${a}, ${b}) keeps its surface`);
    assert.ok(Math.abs(Math.hypot(...q) - (R + r)) < 1e-9, 'rigid');
  }
  const faceOn = DN.torusRotation(Math.PI / 2, 0);
  assert.ok(Math.abs(DN.torusDistance([R + r, 0, 0], faceOn, R, r)) < 1e-9);
  assert.ok(Math.abs(DN.torusDistance([0, R + r, 0], faceOn, R, r)) < 1e-9);
  assert.ok(DN.torusDistance([0, 0, R], faceOn, R, r) > 100, 'nothing on the view axis: the hole');
});

test('the spin: face-on on the swallow, donut.c’s rates (A 0.10, B 0.05 rad/f); over 3.3& it doubles and more, whipping into face-on exactly as the re-form starts; held there', () => {
  const faceOn = (a: number) => Math.abs(Math.cos(a)) < 1e-6;
  assert.ok(faceOn(DN.donutSpin(SW.from).a), 'the ring the face falls into faces us');
  const rate = (f: number) => DN.donutSpin(f + 0.5).a - DN.donutSpin(f - 0.5).a;
  for (const f of [SW.from + 2, SW.from + 6, SW.from + 10]) assert.ok(near(rate(f), 0.1, 1e-6), `A rate on ${f}`);
  for (const f of [SW.from + 2, SW.from + 8, SW.from + 14]) assert.ok(near(DN.donutSpin(f + 0.5).b - DN.donutSpin(f - 0.5).b, 0.05, 1e-6), `B rate on ${f}`);
  const fast = DN.donutSpin(DN.SPIN_DOUBLE.to).a - DN.donutSpin(DN.SPIN_DOUBLE.from).a;
  assert.ok(fast >= 2 * 0.1 * 6 - 1e-9, `the spin doubles over 3.3&: ${fast.toFixed(2)} rad in 6 f`);
  assert.ok(faceOn(DN.donutSpin(RF.from).a), 'face-on as the re-form starts');
  assert.ok(rate(RF.from - 1) > 0.2, 'an impact: it whips round fastest into the landing …');
  assert.equal(rate(RF.from + 1), 0, '… and stops dead on it');
  for (let f = SW.from; f < RF.from; f += 0.25) assert.ok(DN.donutSpin(f + 0.25).a >= DN.donutSpin(f).a - 1e-12, `never spins back (${f})`);
  assert.deepEqual(DN.donutSpin(RF.to + 10), DN.donutSpin(RF.from), 'held after the landing');
});

test('the swallow: brackets first, then the eyes, the ω last — 75 % by + 3, whole by + 6; the re-form runs it backwards, the ω first, and lands him whole on the 3.4 clap', () => {
  const s = (f: number) => [DN.swallowed(f, 'bracket'), DN.swallowed(f, 'eye'), DN.swallowed(f, 'mouth')];
  assert.deepEqual(s(SW.from - 1), [0, 0, 0], 'his face before drop2 3.3');
  const early = s(SW.from + 1);
  assert.ok(early[0] > early[1] && early[1] > early[2], `brackets lead: ${early.map((x) => x.toFixed(2))}`);
  for (const k of s(SW.from + 3)) assert.ok(k >= 0.74, `75 % by + 3: ${s(SW.from + 3).map((x) => x.toFixed(2))}`);
  for (const k of s(SW.from + 6)) assert.ok(k > 0.99, 'whole by + 6');
  for (let f = SW.from + 10; f < RF.from; f++) assert.deepEqual(s(f), [1, 1, 1], `only the torus on ${f}`);
  const back = s(RF.from + 4);
  assert.ok(back[2] < back[1] && back[1] < back[0], `the ω comes back first: ${back.map((x) => x.toFixed(2))}`);
  assert.deepEqual(s(RF.to), [0, 0, 0], 'his face is whole on the clap');
  assert.ok(s(RF.to - 1).some((k) => k > 0.05), 'and only on it (an impact)');
  assert.equal(DN.swallowed(RF.from - 1, 'mouth'), 1);
});

test('( and ) are two arcs of a ring: the hoop thickens out of the brackets from the swallow’s first frames, and thins back into them on the re-form, gone on the clap', () => {
  assert.equal(DN.torusGrowth(SW.from - 1), 0);
  assert.ok(DN.torusGrowth(SW.from + 1) > 0 && DN.torusGrowth(SW.from + 1) < 0.8, 'growing with the brackets');
  assert.ok(DN.torusGrowth(SW.from + 1) < DN.torusGrowth(SW.from + 2));
  assert.equal(DN.torusGrowth(SW.from + 14), 1, 'settled by + 14');
  assert.equal(DN.torusGrowth(RF.from), 1, 'whole as the ω starts back out of its hole');
  assert.ok(DN.torusGrowth(RF.to - 1) < 0.6 && DN.torusGrowth(RF.to - 3) < 1, 'thinning as the brackets return (an impact: most of it on the frames into the clap)');
  assert.equal(DN.torusGrowth(RF.to), 0);
  for (const k of ['bracket', 'eye', 'mouth'] as const) assert.ok(DN.SWALLOW_PULL[k].pull >= 0 && DN.SWALLOW_PULL[k].pull < 1);
  assert.ok(DN.SWALLOW_PULL.bracket.pull < DN.SWALLOW_PULL.eye.pull, 'the brackets already sit on the ring; the eyes fall into its hole');
  assert.equal(DN.donutActive(SW.from - 1), false);
  assert.equal(DN.donutActive(SW.from), true);
  assert.equal(DN.donutActive(RF.to), false);
});

test('the torus takes the open hat of 3.3& as its doubling starts: it pops 6 % and rings back over ≈ 8 f', () => {
  assert.equal(DN.torusPop(DN.SPIN_DOUBLE.from - 1), 1);
  assert.ok(near(DN.torusPop(DN.SPIN_DOUBLE.from), 1.06, 1e-9));
  assert.ok(Math.abs(DN.torusPop(DN.SPIN_DOUBLE.from + 9) - 1) < 0.005);
});

test('•ω• never leaves: his two eyes ride the torus as two nodes on its front, mirrored, turning with the spin', () => {
  const [l, r] = DN.eyeNodes(DN.donutSpin(SW.from).a, DN.donutSpin(SW.from).b, 1);
  // Face-on: where his eyes were, upper left and upper right of the ring, on the tube's crest toward the viewer.
  assert.ok(l[0] < 0 && r[0] > 0 && near(l[0], -r[0], 1e-6) && near(l[1], r[1], 1e-6) && l[1] > 0, `mirrored, above the centre: ${l} ${r}`);
  assert.ok(l[2] > 0 && r[2] > 0, 'on the front');
  const m = DN.torusRotation(DN.donutSpin(SW.from).a, DN.donutSpin(SW.from).b);
  for (const p of [l, r]) assert.ok(Math.abs(DN.torusDistance(p, m, DN.TORUS.ring, DN.TORUS.tube)) < 1e-6, 'on its surface');
  const later = DN.eyeNodes(DN.donutSpin(SW.from + 12).a, DN.donutSpin(SW.from + 12).b, 1);
  assert.ok(Math.hypot(later[0][0] - l[0], later[0][1] - l[1], later[0][2] - l[2]) > 50, 'they turn with it');
});

test('smooth-min melts two distances within k and is exact min outside', () => {
  assert.equal(DN.smin(1, 100, 10), 1);
  assert.ok(DN.smin(5, 5, 10) < 5);
  assert.ok(near(DN.smin(5, 5, 10), 5 - 10 / 4));
  assert.ok(DN.smin(3, 7, 10) <= 3);
});
