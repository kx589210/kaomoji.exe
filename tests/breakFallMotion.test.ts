// Break bar 1's motion (src/shots/breakFall.ts): the face's fall and landing (Appendix B), the camera, the paint pool, each piece's life
// (hinge, gravity, tumble, landing), E2's shard on our side of the screen. Layout px (y down), degrees clockwise (the sheet's).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as BR from '../src/score/break.ts';
import * as F from '../src/shots/breakFall.ts';
import { SHARDS } from '../src/shots/glass.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

type V2 = readonly [number, number];
const layout = (p: readonly number[]): V2 => [p[0] + 960, 540 - p[1]];
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(4)} vs ${b.toFixed(4)} (±${tol})`);

// --- The face's fall (§4.3 face cells, Appendix B) ------------------------------------------------------------------------------------

/**
 * Appendix B: the 30 core cells' landed centroids and angles. The ω's 22 cells (rings 0–1 round the hit) land as one cracked ω —
 * spread ×1.05 about (960, 600), no jitter, turned 1–3°, never mirrored (review R1-01: the ω must always read); the eyes' cells
 * keep the sheet's ×1.3 spread, jitter and tumble.
 */
const CORE: Record<number, [number, number, number]> = {
  0: [1040.1, 583.5, -1.9], 1: [1023.2, 549.0, 2.4], 2: [1002.2, 527.6, 1.1], 3: [967.3, 518.2, 1.4], 4: [934.3, 517.6, -1.7], 5: [906.3, 535.1, -1.3],
  6: [889.9, 565.6, 1.2], 7: [878.5, 602.6, 1.5], 8: [879.1, 632.8, -2.6], 9: [903.5, 656.8, 1.4], 10: [937.8, 673.9, 1.2], 11: [973.6, 676.0, 1.6],
  12: [999.1, 667.3, -2.6], 13: [1020.4, 650.9, -1.2], 14: [1041.4, 618.1, 2.0], 15: [1147.7, 558.6, 2.1], 16: [1117.7, 473.7, 2.7],
  24: [815.4, 751.2, 2.4], 25: [896.4, 802.5, 2.5], 26: [1001.1, 813.3, 2.1], 27: [1073.7, 797.0, -2.2], 28: [1123.2, 740.3, 2.3],
  21: [732.0, 473.9, 9.2], 22: [675.0, 584.8, -8.7], 23: [714.2, 674.1, -16.6], 36: [473.8, 361.0, 18.5], 38: [519.3, 781.5, 19.7],
  29: [1177.8, 671.8, 29.8], 30: [1387.5, 502.2, 24.8], 44: [1436.4, 714.1, 27.6],
};

test('his face lets go on 21.4 as 35 pieces and lands on 22.1 where Appendix B says: the ω ×1.05 and the eyes ×1.3 about (960, 600), "(" flipped to (170, 800), ")" to (1790, 920)', () => {
  assert.equal(F.FACE_LANDING.length, 35);
  assert.ok(!F.FACE_LANDING.some((l) => l.k === F.E2_CELL), 'the E2 shard is not in the fall');
  for (const k of F.CORE_CELLS) {
    const l = F.FACE_LANDING.find((x) => x.k === k)!;
    const [x, y, a] = CORE[k];
    near(l.centroid[0], x, 0.06, `core ${k} x`);
    near(l.centroid[1], y, 0.06, `core ${k} y`);
    near(l.angle, a, 0.06, `core ${k} angle`);
    assert.equal(l.mirrored, k === 22, `core ${k} mirrored (only the ×L cell 22 flips)`);
  }
  // It drifts as one face: the core's mean lands within 60 px of the spread's centre (960, 600) (the sheet's "frame centre" is 89 px off:
  // the rest core sits 22 px below 540, and the formula, which Appendix B computes, wins).
  const mean = F.CORE_CELLS.map((k) => F.FACE_LANDING.find((x) => x.k === k)!.centroid).reduce((s, c) => [s[0] + c[0] / 30, s[1] + c[1] / 30], [0, 0]);
  assert.ok(Math.hypot(mean[0] - 960, mean[1] - 600) <= 60, `the core lands round (960, 600): ${mean.map((v) => v.toFixed(0))}`);
  // The brackets move as units: "(" its ink centre (397, 562) to (170, 800), mirrored, turned +25°; ")" (1522, 562) to (1790, 920), −20°.
  for (const [cells, pivot, to, deg, mirrored] of [[[51, 52, 53], [397, 562], [170, 800], 25, true], [[45, 59], [1522, 562], [1790, 920], -20, false]] as const) {
    for (const k of cells) {
      const l = F.FACE_LANDING.find((x) => x.k === k)!;
      const want = F.placeCorner(layout(SHARDS[k].c), pivot, to, deg, mirrored);
      near(l.centroid[0], want[0], 1e-9, `bracket cell ${k} x`);
      near(l.centroid[1], want[1], 1e-9, `bracket cell ${k} y`);
      assert.equal(l.angle, deg);
      assert.equal(l.mirrored, mirrored);
    }
  }
});

test('the 35 face pieces stand until 21.4, drift down tumbling at most half a turn, and arrive on their landing — flat, turned, mirrored where Appendix B says — exactly on 22.1', () => {
  for (const l of F.FACE_LANDING) {
    assert.equal(F.faceAt(l.k, at(1, 4) - 0.3).phase, 'stand', `face cell ${l.k} on the pane before 21.4`);
    assert.equal(F.faceAt(l.k, at(1, 4)).phase, 'fall');
    const s = F.faceAt(l.k, at(2));
    assert.equal(s.phase, 'fall');
    if (s.phase !== 'fall') continue;
    near(s.u, 1, 1e-12, `face cell ${l.k} arrives on 2016`);
    const c = SHARDS[l.k].c;
    SHARDS[l.k].pts.forEach((pt, i) => {
      const w = F.applyMat(s.matrix, [pt[0] - c[0], pt[1] - c[1], 0]);
      const want = F.placeCorner(layout(pt), layout(c), l.centroid, l.angle, l.mirrored);
      assert.ok(Math.hypot(layout(w)[0] - want[0], layout(w)[1] - want[1]) < 1e-6 && Math.abs(w[2]) < 1e-6, `face cell ${l.k} corner ${i} lands`);
    });
    // Never more than half a turn out of the plane on the way.
    for (let f = at(1, 4); f <= at(2); f += 0.5) {
      const st = F.faceAt(l.k, f);
      if (st.phase !== 'fall') continue;
      const nz = st.matrix[10];
      assert.ok(nz >= -1.0001, 'a rotation');
    }
  }
});

test('the ω falls as one cracked plate and stays legible all the way (review R1-01): its 22 cells keep within 6 px of one rigid ω, turn at most 6° from each other, never flip or tumble (≤ 10° out of the plane), and land with seams under 13 px', () => {
  const omega = F.FACE.omega;
  const rest = omega.map((k) => layout(SHARDS[k].c));
  const r0 = rest.reduce((s, c) => [s[0] + c[0] / omega.length, s[1] + c[1] / omega.length], [0, 0]);
  for (let f = at(1, 4); f <= at(2); f += 0.25) {
    const st = omega.map((k) => F.faceAt(k, f));
    const now = st.map((s) => (s.phase === 'fall' ? F.projectFall(f, F.applyMat(s.matrix, [0, 0, 0])) : ([0, 0] as V2)));
    const m = now.reduce((s, c) => [s[0] + c[0] / omega.length, s[1] + c[1] / omega.length], [0, 0]);
    const sc = Math.sqrt(now.reduce((s, c) => s + (c[0] - m[0]) ** 2 + (c[1] - m[1]) ** 2, 0) / rest.reduce((s, c) => s + (c[0] - r0[0]) ** 2 + (c[1] - r0[1]) ** 2, 0));
    omega.forEach((k, i) => {
      const want = [m[0] + sc * (rest[i][0] - r0[0]), m[1] + sc * (rest[i][1] - r0[1])];
      assert.ok(Math.hypot(now[i][0] - want[0], now[i][1] - want[1]) <= 6, `ω cell ${k} keeps its place in the ω on ${f}`);
    });
    const turns = st.map((s) => (s.phase === 'fall' ? (Math.atan2(s.matrix[1], s.matrix[0]) * 180) / Math.PI : 0));
    assert.ok(Math.max(...turns) - Math.min(...turns) <= 6.0001, `the ω's pieces turn together on ${f}`);
    for (const s of st) if (s.phase === 'fall') assert.ok(s.matrix[10] >= Math.cos((10 * Math.PI) / 180) - 1e-9, `no ω piece tumbles on ${f}`);
  }
  // Landed: every corner two ω cells share comes down within 13 px of itself — a cracked ω, not confetti.
  const land = new Map(F.FACE_LANDING.map((l) => [l.k, l]));
  const images = new Map<string, V2[]>();
  for (const k of omega) {
    const l = land.get(k)!;
    assert.ok(Math.abs(l.angle) >= 1 - 1e-9 && Math.abs(l.angle) <= 3 + 1e-9 && !l.mirrored, `ω cell ${k} turned 1–3°, face up`);
    for (const pt of SHARDS[k].pts) {
      const key = `${pt[0].toFixed(3)},${pt[1].toFixed(3)}`;
      images.set(key, [...(images.get(key) ?? []), F.placeCorner(layout(pt), layout(SHARDS[k].c), l.centroid, l.angle, false)]);
    }
  }
  for (const [key, ps] of images) {
    for (const a of ps) for (const b of ps) assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 13, `the ω's crack at ${key} opens under 13 px`);
  }
});

test('the eyes and brackets still scatter round the ω: ×1.3 with jitter and tumbles, the ×L cell 22 and the "(" flipping to land mirrored', () => {
  for (const k of [...F.FACE.eyeL, ...F.FACE.eyeR].filter((x) => x !== F.E2_CELL)) {
    const l = F.FACE_LANDING.find((x) => x.k === k)!;
    const r = layout(SHARDS[k].c);
    assert.ok(Math.abs(l.centroid[0] - (960 + 1.3 * (r[0] - 960))) <= 24 && Math.abs(l.centroid[1] - (600 + 1.3 * (r[1] - 540))) <= 24, `eye cell ${k} spreads ×1.3`);
    assert.ok(Math.abs(l.angle) >= 8, `eye cell ${k} tumbles to ≥ 8°`);
  }
  assert.equal(F.FACE_LANDING.find((x) => x.k === 22)!.mirrored, true);
  for (const k of F.FACE.open) assert.equal(F.FACE_LANDING.find((x) => x.k === k)!.mirrored, true);
});

// --- The camera and the pool --------------------------------------------------------------------------------------------------------

test('the camera pushes in +3.5 % over 21.1–21.3 (iteration 2, ruling 1: the hold after drop 1 must not read as a stall), creeps on to 1.043 by 22.1 and drifts its aim down to (960, 560) over 21.4, landing on the flat world’s camera on 22.1', () => {
  assert.deepEqual(F.fallCamera(at(1)), { zoom: 1, cx: 960, cy: 540 });
  near(F.fallCamera(at(1, 3)).zoom, 1.035, 1e-9, 'zoom on 21.3: +3.5 %');
  near(F.fallCamera(at(1, 2)).zoom, 1.0175, 0.004, 'about halfway on 21.2');
  assert.ok(F.fallCamera(at(1) + 1).zoom - 1 < 1e-4, 'from a standstill on the seam (1920 is 1919)');
  const end = F.fallCamera(at(2));
  near(end.zoom, 1.043, 1e-12, 'zoom on 22.1');
  assert.deepEqual([end.cx, end.cy], [960, 560]);
  // Most of the push is in break 1.1–1.3; it only creeps after (the face lets go into a calm camera).
  assert.ok(F.fallCamera(at(1, 3)).zoom - 1 > 4 * (end.zoom - F.fallCamera(at(1, 3)).zoom), 'the push is front-loaded');
  const pose = F.fallPose(at(2));
  near(pose.position[2], 3062.5 / 1.043, 0.05, 'dolly distance on 22.1');
  assert.deepEqual([pose.position[0], pose.position[1], pose.target[0], pose.target[1], pose.target[2]], [0, -20, 0, -20, 0]);
  for (let f = at(1); f < at(2); f += 0.25) {
    const a = F.fallCamera(f);
    const b = F.fallCamera(f + 0.25);
    assert.ok(b.zoom >= a.zoom && b.cy >= a.cy, `the push never backs off at ${f}`);
    assert.ok(Math.abs(b.zoom - a.zoom) < 0.0005 && Math.abs(b.cy - a.cy) < 0.6, `no snap at ${f}`);
  }
});

test('the paint pool’s base edge rises through its keyframes (monotone, never back down): below the frame until 21.2&, the surge on 21.4, past the top by 2013', () => {
  const keys: [number, number][] = [[at(1, 2.25), 1100], [at(1, 2.75), 1080], [at(1, 3.25), 1040], [at(1, 3.75), 960], [at(1, 4), 860], [at(1, 4.25), 690], [at(1, 4.5), 400], [at(1, 4.75), 130], [at(1, 4.875), -40]];
  for (const [f, y] of keys) near(F.poolEdge(f), y, 1e-9, `edge on ${f}`);
  assert.equal(F.poolEdge(at(1)), 1100);
  assert.equal(F.poolEdge(at(2) - 0.1), -40);
  for (let f = at(1, 1.75) + 2; f < at(2); f += 0.125) assert.ok(F.poolEdge(f + 0.125) <= F.poolEdge(f) + 1e-9, `the edge never sinks at ${f}`);
});

// --- One piece's life (§4.3) ----------------------------------------------------------------------------------------------------------

const piece = (k: number) => F.PIECES.find((p) => p.k === k)!;
const corner = (m: readonly number[], p: readonly number[]): [number, number, number] => F.applyMat(m, [p[0], p[1], p[2] ?? 0]);
/** Where a piece's centroid is (layout px) in its state at `f`. */
const centre = (p: F.Piece, f: number): V2 => {
  const s = F.pieceAt(p, f);
  if (s.phase === 'stand') return p.from;
  if (s.phase === 'land') return p.to;
  return layout(corner(s.matrix, [0, 0, 0]));
};

test('every piece stands in the pane until it lets go, hinges off its top edge — its lower edge tipping toward the lens, 75 % of the way three frames in — then falls', () => {
  for (const p of F.PIECES) {
    assert.equal(F.pieceAt(p, p.release - 0.5).phase, 'stand', `cell ${p.k} before its release`);
    assert.notEqual(F.pieceAt(p, p.release).phase, 'stand', `cell ${p.k} on its release`);
    const s = F.pieceAt(p, p.release + 1.5);
    assert.equal(s.phase, 'fall');
    if (s.phase !== 'fall') continue;
    const c = SHARDS[p.k].c;
    const low = SHARDS[p.k].pts.reduce((m, q) => (q[1] < m[1] ? q : m));
    assert.ok(corner(s.matrix, [low[0] - c[0], low[1] - c[1]])[2] > 0.5, `cell ${p.k}'s lowest corner comes toward the lens`);
  }
  near(F.hingeAngle(piece(F.PIECES[0].k), at(1, 1.125)), 12 * 0.75, 0.05, 'P1 hinges 12°, 75 % at 1923');
  near(F.hingeAngle(piece(69), at(1, 2.5) + 1), 6 * 0.166, 0.05, 'a crumble hinges 6°');
});

test('the pieces fall like glass under gravity — the singles faster and faster (2.3 → 3.6 px/f²), landing at 60–72 px a frame — and land exactly on their points, flat, at their landing angle', () => {
  const singles = F.PIECES.filter((p) => p.cls === 'single');
  let lastG = 0;
  for (const p of singles) {
    const t0 = p.release + 4;
    const t1 = p.land - 0.25;
    const g = (2 * (p.to[1] - p.from[1])) / (t1 - t0) ** 2;
    assert.ok(g >= 2.2 && g <= 3.7 && g > lastG, `cell ${p.k} falls at ${g.toFixed(2)} px/f²`);
    lastG = g;
    const a = centre(p, t1 - 0.02);
    const b = centre(p, t1 - 0.01);
    const v = Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.01;
    assert.ok(v >= 55 && v <= 75, `cell ${p.k} lands at ${v.toFixed(0)} px a frame`);
  }
  for (const p of F.PIECES) {
    if (p.land >= BR.IMPACT) continue;
    // The swap to the flat polygon is taken a quarter frame early, so the landing frame is whole (GUIDE pitfall 3).
    assert.equal(F.pieceAt(p, p.land - 0.25).phase, 'land', `cell ${p.k} has landed through all of frame ${p.land}`);
    assert.equal(F.pieceAt(p, p.land - 0.26).phase, 'fall', `cell ${p.k} still falls before frame ${p.land}`);
    const s = F.pieceAt(p, p.land - 0.2500001);
    if (s.phase !== 'fall') continue;
    const l = F.PIECE_LANDING.find((x) => x.k === p.k)!;
    const c = SHARDS[p.k].c;
    SHARDS[p.k].pts.forEach((pt, i) => {
      const w = corner(s.matrix, [pt[0] - c[0], pt[1] - c[1]]);
      const at = layout(w);
      assert.ok(Math.hypot(at[0] - l.pts[i][0], at[1] - l.pts[i][1]) < 0.5, `cell ${p.k} corner ${i} lands on its landed outline (${at.map((v) => v.toFixed(1))} vs ${l.pts[i].map((v) => v.toFixed(1))})`);
      assert.ok(Math.abs(w[2]) < 0.5, `cell ${p.k} lands flat`);
    });
  }
});

test('the last cascades (K7, K8) fall as glass until frame 2016’s shutter opens (2015.75) and lie landed in plain paint from there — no squash, a full ink outline, the (12, 12) shadow — exactly as the flat world draws them on 22.1', () => {
  const late = F.PIECES.filter((x) => x.land === BR.IMPACT);
  assert.equal(late.length, 6);
  for (const p of late) {
    assert.equal(F.pieceAt(p, at(2) - 0.75).phase, 'fall', `cell ${p.k} falls through frame 2015`);
    const s = F.pieceAt(p, at(2) - 0.25);
    assert.equal(s.phase, 'land', `cell ${p.k} has landed in frame 2016's shutter`);
    if (s.phase !== 'land') continue;
    assert.deepEqual([s.sx, s.sy], [1, 1], 'no landing squash: the flat world draws it unsquashed');
    assert.deepEqual(s.outline, { width: 6, trim: 1, pop: false }, 'its ink outline, whole');
    assert.deepEqual(s.shadow, { dx: 12, dy: 12, alpha: 1 });
    assert.equal(F.splatAt(p, at(2) - 0.1), null, 'no splat: the pool is full');
    // Just before, its corners are almost on the landed outline (it arrives, it does not jump).
    const f = F.pieceAt(p, at(2) - 0.2501);
    if (f.phase !== 'fall') continue;
    const l = F.PIECE_LANDING.find((x) => x.k === p.k)!;
    const c = SHARDS[p.k].c;
    SHARDS[p.k].pts.forEach((pt, i) => {
      const at = layout(corner(f.matrix, [pt[0] - c[0], pt[1] - c[1]]));
      assert.ok(Math.hypot(at[0] - l.pts[i][0], at[1] - l.pts[i][1]) < 12, `cell ${p.k} corner ${i} is arriving`);
    });
  }
});

test('frame 2016’s first half is already the flat world (review R1-01, the 22.1 slap): from 2015.75 every face piece is flat amber ink with the white outline pop, no glass body, its (14, 14) shadow at full strength; on frame 2015 it is still glass', () => {
  for (const l of F.FACE_LANDING) {
    const a = F.faceAt(l.k, at(2) - 0.75);
    assert.equal(a.phase, 'fall');
    if (a.phase !== 'fall') continue;
    assert.equal(a.flat, false, `cell ${l.k} is glass through frame 2015`);
    assert.ok(a.shadow.alpha < 1, 'its glass shadow is faint');
    for (const f of [at(2) - 0.25, at(2) - 0.1, at(2) - 0.001]) {
      const b = F.faceAt(l.k, f);
      assert.equal(b.phase, 'fall');
      if (b.phase !== 'fall') continue;
      assert.equal(b.flat, true, `cell ${l.k} is flat ink on ${f}`);
      assert.equal(b.body, 0, 'no glass body');
      assert.equal(b.inked, 1, 'flat ink');
      assert.deepEqual(b.shadow, { dx: 14, dy: 14, alpha: 1 }, 'the flat world’s (14, 14) shadow');
    }
  }
});

test('a landed piece squashes 1.06 → 1.0 over 4 frames, its outline pops white for its landing frame alone and then trims from crack cyan into 6 px of ink over 2 frames, its shadow closes to (12, 12) at full strength and a cream splat grows 1.6 × its radius over 10 frames', () => {
  const p = piece(F.P1_CELL);
  const s0 = F.pieceAt(p, at(1, 2.25));
  assert.equal(s0.phase, 'land');
  if (s0.phase !== 'land') return;
  assert.ok(s0.sx > 1.04 && s0.sy < 0.96, 'squashed on landing');
  assert.deepEqual(s0.outline, { width: 6, trim: 0, pop: true }, 'a white outline on the landing frame');
  for (const f of [at(1, 2.25) - 0.25, at(1, 2.25), at(1, 2.25) + 0.25, at(1, 2.25) + 0.7]) {
    const s = F.pieceAt(p, f);
    assert.ok(s.phase === 'land' && s.outline.pop, `the whole of frame 1950 pops (${f})`);
  }
  const s1 = F.pieceAt(p, at(1, 2.25) + 0.75);
  assert.ok(s1.phase === 'land' && !s1.outline.pop && s1.outline.trim === 0, 'frame 1951: the ink starts to trim on');
  const s4 = F.pieceAt(p, at(1, 2.5) - 2);
  assert.equal(s4.phase, 'land');
  if (s4.phase !== 'land') return;
  near(s4.sx, 1, 1e-9, 'unsquashed after 4 frames');
  assert.deepEqual(s4.outline, { width: 6, trim: 1, pop: false });
  assert.deepEqual(s4.shadow, { dx: 12, dy: 12, alpha: 1 });
  near(F.splatAt(p, at(1, 2.75) - 2.25)!.r, p.splat, 1e-9, 'the splat is full 10 frames on');
  assert.equal(F.splatAt(p, at(1, 2.25) - 1), null, 'no splat before it lands');
  const fall = F.pieceAt(p, at(1, 1.75) - 1);
  assert.equal(fall.phase, 'fall');
  if (fall.phase !== 'fall') return;
  assert.ok(fall.shadow.alpha === 0.35 && fall.shadow.dx > 40, 'falling, its shadow is faint and far: the glass is lifted toward us');
});

test('a falling piece stays clear or smoked glass all the way down (review R1-05: no tinted cellophane): it never takes on paint in the air and its transmission never drops; it becomes paint only by landing', () => {
  for (const p of F.PIECES) {
    for (let f = p.release; f < p.land; f += 0.25) {
      const s = F.pieceAt(p, f);
      if (s.phase !== 'fall') continue;
      assert.ok(!('tint' in s), `no paint tint on cell ${p.k} at ${f}`);
      assert.equal(s.transmission, p.transmission, `cell ${p.k} stays glass at ${f}`);
    }
  }
});
