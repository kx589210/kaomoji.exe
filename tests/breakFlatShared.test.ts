// The break's shared pure helpers (src/shots/breakShared.ts): the values the fall, flat and launch builders all read, pinned to the
// build sheet (notes/break/break-sheet.md §2, §4.1, §4.2, §4.6, §7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linear } from '../src/engine/color.ts';
import {
  BAR22_BLOCKS,
  BAR25_BLOCKS,
  BAR25_CONFETTI,
  BREAK_HEX,
  BREAK_LOOK,
  BREAK_PALETTE,
  H,
  HERO_REST,
  HERO_SLOTS,
  bigLaunch,
  breakCam,
  flow,
  fromEngine,
  impact,
  impactSquash,
  launchL,
  pop,
  press,
  rotOf,
  snap,
  softLaunch,
  toEngine,
  toScreen,
} from '../src/shots/breakShared.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('the palette is the sheet’s hexes in linear light', () => {
  assert.equal(BREAK_HEX.cream, '#FDF3D8');
  assert.equal(BREAK_HEX.ink, '#111111');
  assert.equal(BREAK_HEX.amber, '#FFB23E');
  assert.deepEqual(BREAK_PALETTE.mint, linear('#5EE6A8'));
  assert.deepEqual(BREAK_PALETTE.violet, linear('#A78BFA'));
});

test('layout px ↔ engine: origin top-left y down ↔ centre y up; clockwise degrees ↔ counter-clockwise radians', () => {
  assert.deepEqual(toEngine(960, 540), [0, 0]);
  assert.deepEqual(toEngine(0, 0), [-960, 540]);
  assert.deepEqual(fromEngine(...toEngine(123, 456)), [123, 456]);
  near(rotOf(90), -Math.PI / 2, 1e-12, 'rot');
});

test('L, the launch spring, matches the sheet’s progress table and is settled by 12', () => {
  const want = [0.166, 0.474, 0.75, 0.934, 1.028, 1.058];
  want.forEach((w, i) => near(launchL(i + 1), w, 0.004, `L at ${i + 1}`));
  near(launchL(8), 1.036, 0.004, 'L at 8');
  near(launchL(10), 1.006, 0.004, 'L at 10');
  assert.equal(launchL(0), 0);
  assert.equal(launchL(-3), 0);
  assert.equal(launchL(12), 1);
  assert.equal(launchL(40), 1);
  assert.ok(softLaunch(6) < launchL(6) && Math.max(...[4, 5, 6, 7, 8].map(softLaunch)) < 1.035, 'soft L overshoots ≈ 2.8 %');
  assert.ok(Math.max(...[4, 5, 6, 7, 8].map(bigLaunch)) > 1.07, 'big L overshoots ≈ 9 %');
});

test('I, the impact: cubic in, exactly 1 on the beat, squash 1.06 / 0.94 there, springing back', () => {
  near(impact(-6, 6), 0, 1e-12, 'start');
  near(impact(-3, 6), 0.125, 1e-12, 'halfway');
  assert.equal(impact(0, 6), 1);
  assert.equal(impact(5, 6), 1);
  assert.deepEqual(impactSquash(0), [1.06, 0.94]);
  assert.deepEqual(impactSquash(-1), [1, 1]);
  const [a, c] = impactSquash(12);
  near(a, 1, 0.001, 'along settled');
  near(c, 1, 0.001, 'across settled');
});

test('S, pop, press and F', () => {
  near(snap(6), 1.04, 1e-9, 'snap peak');
  assert.equal(snap(8), 1);
  assert.equal(snap(0), 0);
  near(pop(0), 0.6, 1e-9, 'pop start');
  near(pop(3), 1.05, 1e-9, 'pop peak');
  assert.equal(pop(5), 1);
  assert.equal(pop(-1), 0);
  assert.equal(press(2), 1);
  assert.equal(press(10), 0);
  assert.equal(press(-1), 0);
  near(flow(0.5), 0.5, 1e-12, 'F');
});

test('the flat camera: zoom 1.043 about (960, 560) on 22.1 (iteration 2: bar 21’s +3.5 % push carries on), 1.05 on 22.3, 1.08 about (960, 540) at the end of bar 25', () => {
  const c0 = breakCam(at(2));
  near(c0.zoom, 1.043, 1e-9, 'zoom 2016');
  near(breakCam(at(2, 3)).zoom, 1.05, 1e-9, 'zoom 2064');
  for (let f = at(2); f < at(3); f += 0.25) assert.ok(breakCam(f + 0.25).zoom > breakCam(f).zoom, `bar 22 keeps pushing at ${f}`);
  assert.deepEqual([c0.cx, c0.cy, c0.roll], [960, 560, 0]);
  const s = toScreen(c0, 960, 560);
  assert.deepEqual(s, [960, 540]);
  near(breakCam(at(3)).zoom, 1.06, 1e-9, 'zoom 2112');
  near(breakCam(at(4)).zoom, 1.12, 1e-9, 'zoom 2208');
  near(breakCam(at(4, 4)).zoom, 1.18, 1e-9, 'zoom 2280');
  near(breakCam(at(3, 3.5)).roll, -8, 1e-9, 'sway trough');
  const c399 = breakCam(at(6) - 1);
  near(c399.zoom, 1.08, 0.002, 'zoom 2399');
  near(c399.cx, 960, 1e-9, 'cx 2399');
  assert.equal(c399.cy, 540);
  near(breakCam(at(5)).cx, 1000, 1e-9, 'cx after the wipe');
});

test('the hero rest layout: H = (960, 560); each slot is its rest ink centre 20 px lower', () => {
  assert.deepEqual(H, [960, 560]);
  assert.deepEqual(HERO_SLOTS.open, [960 - 563, 560 + 22]);
  assert.deepEqual(HERO_SLOTS.eyeL, [960 - 335, 560 + 22]);
  assert.deepEqual(HERO_SLOTS.mouth, [960 - 3, 560 + 37]);
  for (const k of Object.keys(HERO_SLOTS) as (keyof typeof HERO_SLOTS)[]) assert.deepEqual(HERO_SLOTS[k], [HERO_REST[k][0], HERO_REST[k][1] + 20], k);
});

test('the blocks: bar 22’s rotated set and bar 25’s clean grid layout (which bar 26 keeps)', () => {
  assert.deepEqual(BAR22_BLOCKS.yellow, { x: 180, y: 70, w: 700, h: 220, r: 110, rot: -8 });
  assert.deepEqual(BAR22_BLOCKS.mint, { x: 1650, y: 960, w: 420, h: 420, r: 56, rot: 12 });
  assert.deepEqual(BAR25_BLOCKS.violet, { x: 1710, y: 340, w: 300, h: 440, r: 48, rot: 0 });
  assert.deepEqual(BAR25_BLOCKS.coral, { x: 440, y: 990, w: 640, h: 220, r: 40, rot: 0 });
  assert.equal(BAR25_CONFETTI.length, 4);
});

test('BREAK_LOOK: linear, only HDR highlights bloom, faint grain and vignette', () => {
  assert.equal(BREAK_LOOK.toneMapping, 'linear');
  assert.equal(BREAK_LOOK.exposure, 1);
  assert.equal(BREAK_LOOK.bloom.intensity, 0.35);
  assert.equal(BREAK_LOOK.bloom.threshold, 1.0);
  assert.equal(BREAK_LOOK.bloom.smoothing, 0.1);
  assert.equal(BREAK_LOOK.aberration, 0);
  assert.equal(BREAK_LOOK.grain, 0.03);
  assert.equal(BREAK_LOOK.vignette, 0.06);
});

test('camPose draws the world exactly where toScreen says (zoom, centre, roll and the nudge)', async () => {
  const { breakCam: cam, camPose: pose, toScreen: ts, fromScreen: fs } = await import('../src/shots/breakShared.ts');
  const project = (p: ReturnType<typeof pose>, x: number, y: number): [number, number] => {
    const [qx, qy] = [x - 960, 540 - y];
    const P = p.position;
    const d = [p.target[0] - P[0], p.target[1] - P[1], p.target[2] - P[2]];
    const dl = Math.hypot(d[0], d[1], d[2]);
    const fw = d.map((v) => v / dl);
    const U = p.up;
    let r = [fw[1] * U[2] - fw[2] * U[1], fw[2] * U[0] - fw[0] * U[2], fw[0] * U[1] - fw[1] * U[0]];
    const rl = Math.hypot(r[0], r[1], r[2]);
    r = r.map((v) => v / rl);
    const u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
    const v = [qx - P[0], qy - P[1], -P[2]];
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const k = 540 / Math.tan((p.fov * Math.PI) / 360);
    const ex = (dot(v, r) / dot(v, fw)) * k;
    const ey = (dot(v, u) / dot(v, fw)) * k;
    return [ex + 960, 540 - ey];
  };
  for (const f of [at(1, 2.25), at(2), at(2, 3), at(3, 3.5), at(3, 4.75) - 2, at(4, 4.5) - 2, at(4, 4.75) + 2, at(5, 3) - 2, at(6) - 1, at(6, 3) + 2]) {
    const c = cam(f);
    for (const [x, y] of [[960, 540], [100, 80], [1800, 1000], [397, 582]] as const) {
      const [a, b] = ts(c, x, y);
      const [px, py] = project(pose(c), x, y);
      near(px, a, 0.01, `x at ${f} (${x}, ${y})`);
      near(py, b, 0.01, `y at ${f} (${x}, ${y})`);
      const [bx, by] = fs(c, a, b);
      near(bx, x, 1e-6, 'inverse x');
      near(by, y, 1e-6, 'inverse y');
    }
  }
});

test('one confetti form for bars 22–26: the flat world’s SDF confetti and bar 26’s shapes take their sizes from CONFETTI_FORM', async () => {
  const { CONFETTI_FORM: C } = await import('../src/shots/breakShared.ts');
  const { worldAt } = await import('../src/shots/breakWorld.ts');
  const { launchAt } = await import('../src/shots/breakLaunch.ts');
  const half = C.stroke / 2 + C.border;
  const items = worldAt(at(5, 4.5) + 2).items.filter((i) => i.role === 'confetti');
  const [dot, squiggle, zigzag, pill] = items;
  assert.deepEqual([dot.hx, dot.r], [C.dot.r, C.dot.r]);
  assert.deepEqual([squiggle.hx, squiggle.hy - squiggle.r, squiggle.r], [C.squiggle.half, C.squiggle.amp, half]);
  assert.deepEqual([zigzag.hx, zigzag.hy - zigzag.r, zigzag.r], [C.zigzag.half, C.zigzag.amp, half]);
  assert.deepEqual([2 * pill.hx, 2 * pill.hy], [C.pill.w, C.pill.h]);
  for (const i of items) assert.equal(i.outline, C.border, 'a 4 px ink border');
  // Break bar 6 draws the same strokes: an ink line stroke + 2 × border wide under a colour line stroke wide.
  const shapes = launchAt(at(6, 3) + 2, { advance: () => 0.6 }).back.under;
  const widths = new Set(shapes.filter((s) => s.kind === 'segment').map((s) => s.h));
  assert.ok(widths.has(C.stroke) && widths.has(C.stroke + 2 * C.border), `segment widths ${[...widths]}`);
});
