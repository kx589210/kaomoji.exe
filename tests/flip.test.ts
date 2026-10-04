import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILD_THREADS } from '../src/content/build.ts';
import { hue, linear } from '../src/engine/color.ts';
import { mixLook } from '../src/engine/types.ts';
import { FLIP, REGISTER, RETURN } from '../src/score/build.ts';
import { partEnd, partFrame, seedFrame } from '../src/score/film.ts';
import { FRONT, cardAt, swissSegment } from '../src/shots/swiss.ts';
import { CARDS, T2_EDGE, T2_INK, T2_SEGMENT, WINDUP, backsLive, cardCentre, flipAngle, t2Camera, turnStart, turnedShare } from '../src/transitions/flip.ts';
import { PAPER, PLATE, risoLook } from '../src/worlds/riso.ts';
import { SWISS, swissLook } from '../src/worlds/swiss.ts';

test('each card winds up, flips fast from its start, wobbles past flat, and all are flat 2 frames before the end of the flip', () => {
  for (let row = 0; row < CARDS.rows; row++) {
    for (let col = 0; col < CARDS.cols; col++) {
      assert.equal(flipAngle(turnStart(col, row) - WINDUP - 0.01, col, row), 0);
      assert.ok(flipAngle(turnStart(col, row) - 0.5, col, row) < 0, 'tips back first');
      for (let f = FLIP.to - 2; f < FLIP.to; f += 0.5) assert.ok(Math.abs(flipAngle(f, col, row) - Math.PI) < 1e-3, `flat at ${f}`);
    }
  }
  assert.ok(flipAngle(turnStart(3, 3) + 8, 3, 3) > Math.PI, 'wobbles past flat');
});

test('the wave runs along the diagonal, the first card winding up on the flip (swiss 5.3), the last starting a beat after it', () => {
  assert.equal(FLIP.from, partFrame('swiss', 5, 2));
  assert.equal(turnStart(0, 0) - WINDUP, FLIP.from);
  assert.equal(turnStart(15, 8), partFrame('swiss', 5, 3) + WINDUP);
  assert.equal(turnStart(3, 4), turnStart(4, 3));
  assert.ok(turnStart(4, 4) > turnStart(4, 3));
  assert.ok(flipAngle(turnStart(7, 2) + 1, 7, 2) > 0.25 * Math.PI, 'a fast start');
});

// v04's T2 (src/transitions/flip.ts of the 58-bar copy taken before the 60-bar map, where swiss 4.3 = v04 frame 720), frame for frame:
// the judge's guard G5. Every value is at its v04 instant + 192 (the SCAN and RAIN bars before it).
const V04 = {
  turnStart: { '0,0': 724, '3,4': 731.304347826087, '15,8': 748, '9,2': 735.4782608695652 },
  flipAngle: {
    721: [-0.02454369260617026, 0, 0], 724.5: [0.4741186080094669, 0, 0], 730: [3.234065617836378, 0, 0], 737.25: [3.1501959229303647, 1.7628259481928286, 0],
    744: [3.141592653589793, 3.2391681761503066, 0], 751: [3.141592653589793, 3.1405426530188736, 2.5576039064655305], 760.75: [3.141592653589793, 3.141592653589793, 3.1546538130023674],
    766: [3.141592653589793, 3.141592653589793, 3.1408913287678533],
  },
  turnedShare: { 721: 0, 724.5: 0.0010480322232854907, 730: 0.09275305392907682, 737.25: 0.468616589148948, 744: 0.845710566590054, 751: 0.9977742513721238, 760.75: 0.9999592528748674, 766: 0.999997793475845 },
  t2z: { 721: 3062.2302045545102, 724.5: 3057.3396362513604, 730: 3039.9605737842817, 737.25: 3013.2439262278267, 744: 3002.443316268199, 751: 3014.004048000568, 760.75: 3049.7587595805867, 766: 3061.449019136711 },
} as const;

test('T2’s mechanics are v04’s frame for frame, 192 frames later: the domino order, the angles, the share turned, the lean (G5)', () => {
  const now = (v04: number) => v04 + (FLIP.from - 720);
  assert.equal(seedFrame(FLIP.from), 720, 'the flip seeds as v04’s swiss 4.3');
  for (const [cr, v] of Object.entries(V04.turnStart)) {
    const [c, r] = cr.split(',').map(Number);
    assert.equal(turnStart(c, r), now(v), cr);
  }
  for (const [t, angles] of Object.entries(V04.flipAngle)) {
    const f = now(Number(t));
    assert.deepEqual([flipAngle(f, 0, 0), flipAngle(f, 7, 4), flipAngle(f, 15, 8)], angles, `${f}`);
  }
  for (const [t, share] of Object.entries(V04.turnedShare)) assert.equal(turnedShare(now(Number(t))), share, t);
  for (const [t, z] of Object.entries(V04.t2z)) assert.equal(t2Camera(now(Number(t))).position[2], z, t);
});

test("T2's finishing turns from the Swiss look to the Riso look as the cards turn", () => {
  assert.equal(turnedShare(FLIP.from - 1), 0);
  assert.ok(Math.abs(turnedShare(FLIP.to - 2) - 1) < 1e-4);
  const a = swissLook(false);
  const b = risoLook();
  const mid = mixLook(a, b, 0.5);
  assert.ok(Math.abs(mid.vignette - (a.vignette + b.vignette) / 2) < 1e-12 && Math.abs(mid.grain - (a.grain + b.grain) / 2) < 1e-12);
  const end = mixLook(a, b, 1);
  assert.ok(Math.abs(end.vignette - b.vignette) < 1e-12 && Math.abs(end.grain - b.grain) < 1e-12 && end.toneMapping === b.toneMapping);
});

test('the cards are the S08 grid, and T2 continues S08 without a cut, back to the groove’s return (the SCAN bar’s hard cut)', () => {
  for (const [col, row] of [[0, 0], [8, 4], [15, 8]] as const) assert.deepEqual(cardCentre(col, row), cardAt(col, row));
  assert.deepEqual(T2_SEGMENT, { from: RETURN, to: partEnd('swiss') });
  assert.equal(RETURN, partFrame('swiss', 4, 2));
  assert.deepEqual(swissSegment(partFrame('swiss', 5) + 28), T2_SEGMENT, 'S08 and T2 are one take, from the hard cut on swiss 4.3');
});

test('the camera leans in over the cards as they turn and back out, square on at swiss 5.3 and the Swiss part’s end and never still between', () => {
  for (const f of [FLIP.from, FLIP.to]) assert.deepEqual(t2Camera(f).position, [0, 0, FRONT]);
  let last = t2Camera(FLIP.from).position[2];
  for (let f = FLIP.from + 1; f < FLIP.to; f++) {
    const z = t2Camera(f).position[2];
    assert.ok(z < FRONT && Math.abs(z - last) > 1e-6, `${f}`);
    last = z;
  }
  assert.ok(Math.abs(FRONT / t2Camera((FLIP.from + FLIP.to) / 2).position[2] - 1.02) < 1e-9, 'in by 2% at the middle');
});

test('T2’s inks: between and along the turning cards the Riso world’s own ink shows (pink × blue on paper), never the antivirus’s red', () => {
  const purple = [0, 1, 2].map((i) => PAPER[i] * PLATE.pink[i] * PLATE.blue[i]);
  T2_INK.forEach((v, i) => assert.ok(Math.abs(v - purple[i]) < 1e-12, `printed purple, channel ${i}`));
  const h = hue(T2_INK);
  assert.ok(h > 250 && h < 300, `purple, not red: ${h}`);
  const red = linear(SWISS.red);
  assert.ok(Math.abs(hue(red) - h) > 90, 'far from the antivirus’s red');
  assert.ok(T2_EDGE > 0 && T2_EDGE < 0.5, 'the ink shows only while a card is near edge-on');
});

test('the backs render live while the plates converge (register), and once, from S09’s first frame, without it', () => {
  assert.equal(backsLive(BUILD_THREADS), BUILD_THREADS.register);
  assert.equal(backsLive({ ...BUILD_THREADS, register: true }), true);
  assert.equal(backsLive({ ...BUILD_THREADS, register: false }), false);
  assert.deepEqual([...REGISTER], [partFrame('swiss', 5, 3), partFrame('swiss', 5, 3.25), partFrame('swiss', 5, 3.5), partFrame('swiss', 5, 3.75)], 'the fill’s sixteenths');
});
