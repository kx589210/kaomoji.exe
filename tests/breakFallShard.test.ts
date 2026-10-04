// E2, the shard on our side of the screen (src/shots/breakFall.ts shardAt): cell 37, the glass with his left x, does not let go on break 1.4.
// It stays frozen where it is on screen, ignoring the camera and the punches; he knocks on it from behind on break 2.1& and 2.2&; it pops
// back through the screen (edge-on on break 2.2a, where the flat world takes it over) and slams into his left eye on the break 2.3 clap.
// Screen layout px (y down), degrees clockwise. The build sheet: notes/break/break-sheet.md section 4.3 (E2), 4.5, 4.10.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as BR from '../src/score/break.ts';
import * as F from '../src/shots/breakFall.ts';
import { SHARDS } from '../src/shots/glass.ts';
import { hash } from '../src/engine/random.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(4)} vs ${b.toFixed(4)} (+-${tol})`);
const REST: [number, number] = [SHARDS[37].c[0] + 960, 540 - SHARDS[37].c[1]];
/** The camera's zoom on break 1.4, where the shard freezes: ≈ 1.040 since iteration 2's break-bar-1 push (ruling 1). */
const Z1992 = F.fallCamera(at(1, 4)).zoom;

test('the shard stands in the pane until 21.4, then stays frozen on screen where it was on 1992: the rest polygon scaled by the camera’s 21.4 zoom (≈ 1.040) about the frame centre', () => {
  assert.equal(F.shardAt(at(1, 4) - 0.5), null);
  const s = F.shardAt(at(1, 4))!;
  near(Z1992, 1.0397, 0.001, 'the 21.4 zoom');
  near(s.scale, Z1992, 1e-9, 'its 1992 scale');
  near(s.c[0], 960 + Z1992 * (REST[0] - 960), 1e-3, 'x');
  near(s.c[1], 540 + Z1992 * (REST[1] - 540), 1e-3, 'y');
  assert.ok(Math.hypot(s.c[0] - 556, s.c[1] - 539) < 1.5, 'about (556, 539)');
  assert.equal(s.screen, true, 'on our side: drawn at the inverse of the rig, ignoring the camera');
  for (let f = at(1, 4); f < BR.KNOCKS[0]; f += 0.5) assert.deepEqual(F.shardAt(f), s, `frozen at ${f}`);
});

test('he knocks from behind on 22.1&, and frame 2028 itself shows it: struck a quarter frame early, the shard jolts toward us — scale 1 -> 1.08 in 1.5 frames, springing back (outBack) — and lifts 6 px toward the lens, its drop shadow reaching 10 px', () => {
  const rest = F.shardAt(at(2, 1.5) - 0.5)!;
  const k = BR.KNOCKS[0];
  const t0 = k - 0.25;
  assert.equal(rest.lift, 0, 'no lift before the knock');
  assert.deepEqual(F.shardAt(t0 - 0.01), rest, 'untouched until frame 2028’s shutter opens');
  assert.ok(F.shardAt(k)!.scale / rest.scale > 1.015, 'already jolting at 2028.0');
  const scales = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 5.4].map((t) => F.shardAt(t0 + t)!.scale / rest.scale);
  near(Math.max(...scales), 1.08, 0.002, 'the jolt peaks at 1.08');
  near(F.shardAt(t0 + 1.5)!.scale / rest.scale, 1.08, 1e-9, '1.5 frames in');
  assert.ok(Math.min(...scales) < 1 && Math.min(...scales) > 0.99, 'it springs back through 1 (outBack), by under 1 %');
  near(F.shardAt(t0 + 5.5)!.scale, rest.scale, 1e-9, 'back by 5.5 frames');
  near(F.shardAt(t0 + 3)!.lift, 1, 1e-9, 'fully lifted 3 frames in');
  const d = Math.hypot(F.shardAt(t0 + 3)!.c[0] - rest.c[0], F.shardAt(t0 + 3)!.c[1] - rest.c[1]);
  near(d, 6, 1e-6, 'a 6 px nudge');
  assert.ok(F.shardAt(t0 + 3)!.c[0] < rest.c[0] && F.shardAt(t0 + 3)!.c[1] < rest.c[1], 'up and left, away from its shadow');
  assert.equal(F.shardAt(t0 + 6)!.lift, 0);
  assert.deepEqual(F.shardAt(t0 + 6)!.c, rest.c, 'home again');
  near(F.SHARD_SHADOW * F.shardAt(t0 + 3)!.lift, 10, 1e-9, 'its shadow reaches 10 px');
  for (let t = -0.5; t < 6.5; t += 0.25) {
    const a = F.shardAt(t0 + t)!;
    const b = F.shardAt(t0 + t + 0.25)!;
    assert.ok(Math.abs(b.scale - a.scale) < 0.03 && Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1]) < 3, `smooth at ${t0 + t}`);
  }
});

test('each knock throws a double ripple that reads on the cream and on the glass, whole on the knock’s own frame: crack-cyan rings with a 2 px ink edge, at full strength, 4 -> 1 px, opening from 25 % to 90 and 140 px over 9 frames from the shard’s lower edge', () => {
  for (const k of BR.KNOCKS) {
    const t0 = k - 0.25;
    const poly = F.shardPolygon(k);
    const low = poly.map((p, i) => [p, poly[(i + 1) % poly.length]] as const).reduce((m, e) => ((e[0][1] + e[1][1]) / 2 > (m[0][1] + m[1][1]) / 2 ? e : m));
    for (const f of [t0, k, k + 0.25, k + 4.5]) {
      const r = F.knockRipples(f);
      assert.equal(r.length, 2, `two rings on ${f}`);
      near(r[0].cx, (low[0][0] + low[1][0]) / 2, 1e-6, 'centred on the lower edge');
      near(r[0].cy, (low[0][1] + low[1][1]) / 2, 1e-6, 'centred on the lower edge');
      for (const x of r) {
        assert.equal(x.alpha, 1, 'full strength');
        assert.equal(x.edge, 2, 'a 2 px ink edge');
        assert.equal(x.color, '#C9F2FF');
        assert.equal(x.edgeColor, '#111111');
      }
    }
    const on = F.knockRipples(t0);
    near(on[0].r, 0.25 * 90, 1e-9, 'the inner ring opens at 25 %');
    near(on[1].r, 0.25 * 140, 1e-9, 'the outer ring opens at 25 %');
    near(on[0].stroke, 4, 1e-9, '4 px on the knock');
    const mid = F.knockRipples(k + 4.5);
    assert.ok(mid[0].r > 50 && mid[0].r < 90 && mid[1].r > mid[0].r && mid[1].r < 140, 'two rings, growing');
    const end = F.knockRipples(t0 + 8.75);
    near(end[0].r, 90 * (0.25 + 0.75 * (1 - (1 - 8.75 / 9) ** 3)), 1e-9, 'inner ring toward 90');
    near(end[1].r, 140 * (0.25 + 0.75 * (1 - (1 - 8.75 / 9) ** 3)), 1e-9, 'outer ring toward 140');
    assert.ok(end[0].stroke > 1 && end[0].stroke < 1.1 && end[0].alpha < 0.2, 'thinning to 1 px and fading over its last 3 frames');
    assert.equal(F.knockRipples(t0 + 9).length, 0, 'gone after nine frames');
    assert.equal(F.knockRipples(t0 - 0.01).length, 0);
  }
});

test('T0’s leader can hang on the shard’s real lower-left corner, wherever the shard is: shardLowerLeft is its polygon’s lower-left vertex', () => {
  for (const f of [at(1, 4), at(2, 1.5), at(2, 1.5) + 1.5, at(2, 1.625), at(2, 2), at(2, 2.5), at(2, 2.625)]) {
    const poly = F.shardPolygon(f);
    const want = poly.reduce((m, p) => (p[1] - p[0] > m[1] - m[0] ? p : m));
    assert.deepEqual(F.shardLowerLeft(f), want, `on ${f}`);
  }
  const frozen = F.shardLowerLeft(at(2, 2));
  near(frozen[0], 960 + Z1992 * (501.6 - 960), 0.2, 'frozen: the 1992 corner, x');
  near(frozen[1], 540 + Z1992 * (635.0 - 540), 0.2, 'frozen: the 1992 corner, y');
});

test('on 22.2& it pops off our glass, turns edge-on (a 10 px slab, scale-x 0.08) on 2058, where the flat world takes it over, and lands in its slot on screen on the 22.3 clap', () => {
  const [a, b] = [BR.SHARD_FLIGHT.from, BR.SHARD_FLIGHT.to];
  assert.equal(F.shardAt(a - 0.1)!.screen, true);
  assert.equal(F.shardAt(a)!.screen, false, 'from 2052 it is in the world again: the rig moves it (the rig is identity on 2052)');
  near(F.shardAt(at(2, 2.75))!.scaleX, 0.08, 1e-9, 'edge-on on 2058');
  assert.ok(F.shardAt(at(2, 2.75) - 1)!.scaleX > 0.08 && F.shardAt(at(2, 2.75) + 1)!.scaleX > 0.08);
  const home = F.shardAt(b)!;
  // The flat camera on break 2.3: zoom 1.05 since iteration 2 (ruling 1's break-bar-1 push carries on through break bar 2).
  near(home.c[0], 960 + 1.05 * (REST[0] - 960), 1e-6, 'its slot x on screen (camera zoom 1.05 about (960, 560))');
  near(home.c[1], 540 + 1.05 * (REST[1] + 20 - 560) + 4, 1e-6, 'its slot y, with the camera 4 px nudge');
  near(home.scale, 1.05, 1e-9, 'the camera zoom');
  near(home.scaleX, 1, 1e-9, 'face on');
  assert.ok(Math.abs(home.rot) <= 1.5, 'its lock error');
  near(home.rot, F.E2_LOCK_ERROR, 1e-9, 'the lock error');
  // Its centroid rides a quadratic Bezier through (480, 380), progress u^3.
  const u = 0.5 ** 3;
  const p0 = F.shardAt(a - 1)!.c;
  near(F.shardAt(at(2, 2.75))!.c[0], (1 - u) ** 2 * p0[0] + 2 * u * (1 - u) * 480 + u * u * home.c[0], 1e-6, 'on its arc, x');
  near(F.shardAt(at(2, 2.75))!.c[1], (1 - u) ** 2 * p0[1] + 2 * u * (1 - u) * 380 + u * u * home.c[1], 1e-6, 'on its arc, y');
  // No jump anywhere on its way (a quarter frame apart).
  for (let f = at(1, 4); f < b; f += 0.25) {
    const s = F.shardAt(f)!;
    const t = F.shardAt(f + 0.25)!;
    assert.ok(Math.hypot(t.c[0] - s.c[0], t.c[1] - s.c[1]) < 25 && Math.abs(t.scale - s.scale) < 0.03, `no jump at ${f} (an impact: under 100 px a frame)`);
  }
});

test('the fall draws the shard on our side until 2058 (edge-on), where the flat world takes it, and both knocks’ ripples to their end', () => {
  assert.deepEqual(F.SHARD_OVER, { from: BR.SHARD_STAYS, to: BR.SHARD_FLIGHT.from + 6 });
  assert.deepEqual(F.FALL_OVER, { from: BR.SHARD_STAYS, to: BR.KNOCKS[1] + 9 });
  assert.equal(F.knockRipples(F.FALL_OVER.to - 0.01).length, 0, 'the last ripple is gone before the fall stops drawing over');
  assert.equal(F.E2_LOCK_ERROR, 1.5 * (2 * hash(37, 551) - 1), 'the flat world’s lock error for cell 37 (breakHero.ts lockError)');
  assert.equal(F.SHARD_HANDOFF, at(2, 2.75));
});
