// The hero in the flat world, break bars 2–5 (src/shots/breakHero.ts): his fragments put back together on the beat, his expressions, and
// the effects that ride on him. Readers recover the story from the plain data the scene draws.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import { H } from '../src/shots/breakShared.ts';
import { HERO_FACES } from '../src/content/castBreak.ts';
import { FACE_LANDING } from '../src/shots/breakFall.ts';
import { FRAGMENTS, apply, eyesAt, fragPolygon, galaxyAt, heroAt, pivotOf, restPlacement, seamGap } from '../src/shots/breakHero.ts';
import { flatSegment, flatTemporal } from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const frag = (f: number, k: number) => heroAt(f).frags.find((d) => d.k === k);
const det = (m: readonly number[]): number => m[0] * m[3] - m[1] * m[2];

test('36 face fragments in five groups: ω 22, ×L 6, ×R 3, "(" 3, ")" 2', () => {
  assert.equal(FRAGMENTS.length, 36);
  const count = (g: string) => FRAGMENTS.filter((f) => f.group === g).length;
  assert.deepEqual([count('mouth'), count('eyeL'), count('eyeR'), count('open'), count('close')], [22, 6, 3, 3, 2]);
});

test('a fragment is its cell inset by half the seam gap along its own group’s cuts, and reaches out elsewhere', () => {
  const f0 = FRAGMENTS.find((f) => f.k === 0)!;
  const p8 = fragPolygon(f0, 8);
  const p0 = fragPolygon(f0, 0);
  assert.equal(p8.pts.length, 3);
  // The apex (the hit) is shared by two ω cuts: insetting it moves it away from the hit.
  const apex = (p: typeof p8) => p.pts.reduce((best, q) => (Math.hypot(q[0] - 960, q[1] - 540) < Math.hypot(best[0] - 960, best[1] - 540) ? q : best));
  assert.ok(Math.hypot(apex(p8)[0] - 960, apex(p8)[1] - 540) > Math.hypot(apex(p0)[0] - 960, apex(p0)[1] - 540) + 4);
  assert.deepEqual(p8.seams, [true, true, true], 'a ring-0 ω cell is cut from ω cells all round');
  // Cell 21 (×L, ring 1): cut from ×L along two edges; the ω and blank sides reach out, so a wider eye glyph is never clipped.
  const f21 = FRAGMENTS.find((f) => f.k === 21)!;
  const p21 = fragPolygon(f21, 8);
  assert.equal(p21.seams.filter(Boolean).length, 2);
  // Together a group's pieces cover a generous box around its glyph, so no expression is ever clipped by the cells.
  const inside = (pts: readonly (readonly [number, number])[], p: readonly [number, number]) => {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const [a, b] = [pts[i], pts[(i + 1) % pts.length]];
      const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (c !== 0) {
        if (s === 0) s = Math.sign(c);
        else if (Math.sign(c) !== s) return false;
      }
    }
    return true;
  };
  const x = restPlacement();
  const box = { open: [110, 210], eyeL: [160, 180], mouth: [210, 180], eyeR: [160, 180], close: [110, 210] } as const;
  for (const g of Object.keys(box) as (keyof typeof box)[]) {
    const polys = FRAGMENTS.filter((q) => q.group === g).map((q) => fragPolygon(q, 0).pts);
    for (let dx = -box[g][0]; dx <= box[g][0]; dx += 10) {
      for (let dy = -box[g][1]; dy <= box[g][1]; dy += 10) assert.ok(polys.some((q) => inside(q, [x[g] + dx, 555 + dy])), `${g} covers (${dx}, ${dy})`);
    }
  }
});

test('22.1: the 35 face pieces lie where the fall landed them (its FACE_LANDING), mirrored where it landed them mirrored', () => {
  for (const l of FACE_LANDING) {
    const fr = FRAGMENTS.find((f) => f.k === l.k)!;
    if (fr.group === 'open' || fr.group === 'close') continue;
    const [x, y] = apply(frag(at(2), l.k)!.m, fr.c);
    near(x, l.centroid[0], 0.2, `k${l.k} x`);
    near(y, l.centroid[1], 0.2, `k${l.k} y`);
    assert.equal(det(frag(at(2) + 0.6, l.k)!.m) < 0, l.mirrored, `cell ${l.k} mirrored as it landed`);
  }
  for (const k of [51, 52, 53]) assert.ok(det(frag(at(2) + 0.6, k)!.m) < 0, `cell ${k} ("(") mirrored`);
  for (const k of [45, 59]) assert.ok(det(frag(at(2) + 0.6, k)!.m) > 0, `cell ${k} (")") not mirrored`);
  const [ox, oy] = apply(frag(at(2, 1.25) - 2, 52)!.m, pivotOf('open'));
  near(ox, 170, 0.5, '"(" x');
  near(oy, 800, 3, '"(" y');
  assert.equal(frag(at(2, 2), 37), undefined, 'E2’s shard is on our side (the fall draws it)');
});

test('E2: the shard comes back through the screen edge-on on 22.2& + 6 and is home with the iris on 22.3', () => {
  assert.equal(frag(at(2, 2.75) - 0.1, 37), undefined);
  const s = frag(at(2, 2.75), 37)!;
  assert.ok(Math.abs(det(s.m)) < 0.15, 'edge-on');
  for (let k = 0; k < 36; k++) {
    const fr = FRAGMENTS[k];
    if (fr.group === 'open' || fr.group === 'close') continue;
    const [x, y] = apply(frag(at(2, 4) - 2, fr.k)!.m, fr.c);
    near(x, fr.c[0], 2.6, `cell ${fr.k} x locked`);
    near(y, fr.c[1] + 20, 2.6, `cell ${fr.k} y locked`);
  }
});

test('the iris: the core winds −70° open, then closes clockwise onto the slots', () => {
  const ang = (f: number, k: number) => {
    const fr = FRAGMENTS.find((q) => q.k === k)!;
    const [x, y] = apply(frag(f, k)!.m, fr.c);
    return (Math.atan2(y - H[1], x - H[0]) * 180) / Math.PI;
  };
  const a40 = ang(at(2, 2), 13);
  const a52 = ang(at(2, 2.5), 13);
  const turn = ((a52 - a40 + 540) % 360) - 180;
  near(turn, -70, 6, 'opened anticlockwise');
});

test('bar 23: the "(" launches, tops out at the apex, loops, slams into the left slot still mirrored and flips back', () => {
  const pin = (f: number) => apply(frag(f, 52)!.m, pivotOf('open'));
  near(pin(at(3))[0], 170, 1, 'launch x');
  near(pin(at(3, 2))[0], 380, 1, 'apex x');
  near(pin(at(3, 2))[1], 180, 1, 'apex y (R2-04: the loop sits 50 px lower)');
  near(pin(at(3, 3))[0], 397, 1, 'slot x');
  near(pin(at(3, 3))[1], 582, 1, 'slot y');
  assert.ok(det(frag(at(3, 4.25), 52)!.m) < 0, 'still mirrored before the flip');
  assert.ok(det(frag(at(3, 4.75) + 2, 52)!.m) > 0, 'right way round after the flip');
});

test('bar 24: the ")" walks home in nine hops and lands in its slot on the clap', () => {
  const pin = (f: number) => apply(frag(f, 45)!.m, pivotOf('close'));
  near(pin(at(4))[0], 1790, 1, 'start x');
  near(pin(at(4))[1], 920, 1, 'start y');
  const home = pin(at(4, 3.5) - 2);
  near(home[0], 1522, 1.5, 'home x');
  near(home[1], 582, 2.6, 'home y');
  assert.ok(Math.hypot(pin(at(4, 3))[0] - 1522, pin(at(4, 3))[1] - 582) <= 11, 'on the clap');
});

test('his eyes: × → > (lock) → ＠ (dizzy) → ◎ ⊙ ● × (re-roll) → tofu → － (rescan)', () => {
  const reel = (i: number) => [...HERO_FACES.reroll[i]][1];
  const want: [number, string, string][] = [
    [at(2, 3) - 1, '×', '×'],
    [at(2, 3), '>', '<'],
    [at(3, 3), '＠', '＠'],
    [at(4, 2), reel(0), reel(0)],
    [at(4, 2.125), reel(1), reel(1)],
    [at(4, 2.25), reel(2), reel(2)],
    [at(4, 2.375), reel(3), reel(3)],
    [at(4, 2.5), '•', 'tofu'],
    [at(4, 3.25), '－', '－'],
  ];
  for (const [f, l, r] of want) assert.deepEqual(eyesAt(f), [l, r], `eyes on ${f}`);
});

test('every swap is whole on its frame: all sub-frames of a swap frame show the new eyes', () => {
  for (const f of [at(2, 3), at(3, 3), at(4, 2), at(4, 2.125), at(4, 2.25), at(4, 2.375), at(4, 2.5)]) {
    for (const s of temporalSamples(f, flatTemporal(f), flatSegment(f))) assert.deepEqual(eyesAt(s.frame), eyesAt(f), `${f} @ ${s.frame}`);
  }
});

test('the seams: 8 px gaps, 4 from the dizzy slam, 2 from the rescan, shut when he is whole', () => {
  assert.equal(seamGap(at(2, 4.5)), 8);
  assert.equal(seamGap(at(3, 4.75) - 2), 4);
  assert.equal(seamGap(at(4, 3.25) - 2), 2);
  assert.equal(seamGap(at(4, 4.75) + 2), 0);
});

test('E3: drop 1’s galaxy streaks in from the upper right and lands in his right eye on the 24.3 clap', () => {
  const g0 = galaxyAt(at(4, 2.75))!;
  near(g0.x, 1740, 1, 'start x');
  near(g0.y, 120, 1, 'start y');
  near(g0.size, 40, 0.5, 'a small galaxy, not a speck (R1-02a)');
  const g1 = galaxyAt(at(4, 3))!;
  near(g1.x, 1290, 1, 'eye x');
  near(g1.y, 582, 1, 'eye y');
  near(g1.size, 220, 1, 'size');
  assert.equal(galaxyAt(at(4, 2.75) - 1), null);
});

test('the hang holds everything still, and bar 25 is the whole hero with his ω on (960, 540)', () => {
  assert.deepEqual(frag(at(4, 4.25) - 2, 0)!.m, frag(at(4, 4.75) - 2, 0)!.m);
  assert.equal(heroAt(at(4, 4.75) + 2).glyphs, null);
  const g = heroAt(at(5, 2) + 2).glyphs!;
  const w = g.find((q) => q.ch === 'ω')!;
  near(w.x, 960, 1e-6, 'ω x');
  near(w.y, 540, 3, 'ω y');
  assert.equal(w.size, 414);
});

test('23.2: as the bracket hangs at its apex his face tilts 4° toward it (anticlockwise) and back by 23.2&', () => {
  const angle = (f: number) => (Math.atan2(frag(f, 0)!.m[1], frag(f, 0)!.m[0]) * 180) / Math.PI;
  near(angle(at(3, 2.25)) - angle(at(3, 1.75)), -4, 0.3, 'tilted');
  near(angle(at(3, 2.5) + 2) - angle(at(3, 1.75)), 0, 0.05, 'back');
});

test('22.3& – 22.4&: in pain, the locked face throbs on each glass hat (2076, 2088, 2100): a swell about H that settles', () => {
  const span = (f: number) => {
    const a = apply(frag(f, 29)!.m, FRAGMENTS.find((q) => q.k === 29)!.c);
    const b = apply(frag(f, 22)!.m, FRAGMENTS.find((q) => q.k === 22)!.c);
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  };
  for (const throb of [at(2, 3.5), at(2, 4), at(2, 4.5)]) assert.ok(span(throb + 4) > span(throb) * 1.015, `throb on ${throb}`);
  const c29 = FRAGMENTS.find((q) => q.k === 29)!.c;
  const c22 = FRAGMENTS.find((q) => q.k === 22)!.c;
  near(span(at(3, 1.5) + 1), Math.hypot(c29[0] - c22[0], c29[1] - c22[1]), 1.5, 'settled by 23.1');
  // Between the throbs it still breathes: no two consecutive frames of break 2.3–2.4 hold the face exactly still.
  for (let f = at(2, 3) + 1; f < at(3); f++) assert.notEqual(span(f), span(f - 1), `${f}`);
});
