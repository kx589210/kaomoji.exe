// The break 2.1 hand-off (break-sheet §7.1): what the fall lands on its frame is exactly what the flat world draws from it — the 33 landed blank
// pieces (src/shots/breakWorld.ts LANDED), the 35 face pieces (src/shots/breakHero.ts coreLanding and its bracket groups) — and E2's
// shard follows one path across the break 2.2a hand-off (breakHero.ts shardScreen). Read-only imports of the flat builder's modules: a
// change on either side that breaks the contract fails here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as F from '../src/shots/breakFall.ts';
import { coreLanding, shardScreen } from '../src/shots/breakHero.ts';
import { LANDED } from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

test('the 33 blank pieces land on 2016 exactly where the flat world draws them: same cells, paints, centroids, angles and outlines', () => {
  assert.equal(LANDED.length, F.PIECE_LANDING.length);
  for (const l of F.PIECE_LANDING) {
    const w = LANDED.find((x) => x.cell === l.k);
    assert.ok(w, `cell ${l.k} in the flat world`);
    assert.equal(w.color, l.paint, `cell ${l.k}'s paint`);
    assert.ok(Math.hypot(w.at[0] - l.centroid[0], w.at[1] - l.centroid[1]) < 1e-6, `cell ${l.k}'s landing`);
    assert.ok(Math.abs(w.angle - l.angle) < 1e-9, `cell ${l.k}'s angle`);
    l.pts.forEach((p, i) => assert.ok(Math.hypot(p[0] - w.pts[i][0], p[1] - w.pts[i][1]) < 1e-6, `cell ${l.k} corner ${i}`));
  }
});

test('the 30 core face pieces land on 2016 exactly where the flat world takes them over (centroid, angle, mirrored)', () => {
  for (const k of F.CORE_CELLS) {
    const l = F.FACE_LANDING.find((x) => x.k === k)!;
    const h = coreLanding(k);
    assert.ok(Math.hypot(h.at[0] - l.centroid[0], h.at[1] - l.centroid[1]) < 1e-9, `core ${k}`);
    assert.ok(Math.abs(h.angle - l.angle) < 1e-9, `core ${k}'s angle`);
    assert.equal(h.mirrored, l.mirrored, `core ${k} mirrored`);
  }
});

test('E2’s shard is where the flat world expects it while the fall still draws it, and on the 2058 hand-off (edge-on) within a hundredth of a pixel', () => {
  for (let t = at(2, 2.5); t <= at(2, 2.75); t += 0.5) {
    const a = F.shardAt(t)!;
    const b = shardScreen(t);
    assert.ok(Math.hypot(a.c[0] - b.centre[0], a.c[1] - b.centre[1]) < 0.01, `centre at ${t}`);
    assert.ok(Math.abs(a.scaleX - b.sx) < 1e-9, `edge-on turn at ${t}`);
  }
});
