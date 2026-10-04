// Break 2.1 (break-sheet §7.1): the flat world takes over exactly what the fall landed, and E2's shard follows the one path both
// parts read (src/shots/breakFall.ts shardAt): the flat builder's own copies of the sheet's formulas must agree with the fall's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FACE_LANDING, PIECE_LANDING, SHARD_HANDOFF, shardAt } from '../src/shots/breakFall.ts';
import { FRAGMENTS, apply, coreLanding, heroAt, shardScreen } from '../src/shots/breakHero.ts';
import { breakCam, toScreen } from '../src/shots/breakShared.ts';
import { LANDED, worldAt } from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('the 33 landed blank pieces are the fall’s PIECE_LANDING, corner for corner', () => {
  assert.equal(LANDED.length, PIECE_LANDING.length);
  for (const p of PIECE_LANDING) {
    const l = LANDED.find((q) => q.cell === p.k)!;
    assert.equal(l.color, p.paint, `colour of ${p.k}`);
    p.pts.forEach((q, i) => {
      near(l.pts[i][0], q[0], 1e-6, `${p.k}.${i} x`);
      near(l.pts[i][1], q[1], 1e-6, `${p.k}.${i} y`);
    });
  }
  // …and that is what the world draws on break 2.1.
  assert.equal(worldAt(at(2)).polys.length, 33);
});

test('the 35 face pieces lie where the fall’s FACE_LANDING put them', () => {
  for (const l of FACE_LANDING) {
    const fr = FRAGMENTS.find((q) => q.k === l.k)!;
    const d = heroAt(at(2) + 0.25).frags.find((q) => q.k === l.k)!;
    const [x, y] = apply(d.m, fr.c);
    // The slap's squash (×1.10 about each piece's centroid) leaves centroids in place.
    near(x, l.centroid[0], 0.6, `x of ${l.k}`);
    near(y, l.centroid[1], 0.6, `y of ${l.k}`);
    if (fr.group !== 'open' && fr.group !== 'close') {
      const c = coreLanding(l.k);
      near(c.angle, l.angle, 1e-9, `angle of ${l.k}`);
      assert.equal(c.mirrored, l.mirrored, `mirror of ${l.k}`);
    }
  }
});

test('E2: the shard’s path is the fall’s shardAt, and from the hand-off the flat world draws it there', () => {
  for (const f of [at(2, 2.5), at(2, 2.625), at(2, 2.75), at(2, 2.75) + 2, at(2, 3) - 1.5, at(2, 3) - 0.25]) {
    const a = shardAt(f)!;
    const b = shardScreen(f);
    near(b.centre[0], a.c[0], 0.01, `x on ${f}`);
    near(b.centre[1], a.c[1], 0.01, `y on ${f}`);
    near(b.sx, a.scaleX, 1e-6, `scale-x on ${f}`);
  }
  const fr = FRAGMENTS.find((q) => q.k === 37)!;
  for (const f of [SHARD_HANDOFF, at(2, 2.75) + 2, at(2, 3) - 1]) {
    const d = heroAt(f).frags.find((q) => q.k === 37)!;
    const w = apply(d.m, fr.c);
    const s = toScreen(breakCam(f), w[0], w[1]);
    near(s[0], shardAt(f)!.c[0], 0.01, `drawn x on ${f}`);
    near(s[1], shardAt(f)!.c[1], 0.01, `drawn y on ${f}`);
  }
});
