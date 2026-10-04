// Break bar 1, the glass falling into the paint: the pure frame functions of src/shots/breakFall.ts against the
// build sheet (notes/break/break-sheet.md §3 break bar 1, §4.3–§4.5, §7.1, Appendix B). Layout px: 1920 × 1080, origin top-left, y
// down; angles in degrees, clockwise-positive on screen (the sheet's conventions).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash } from '../src/engine/random.ts';
import * as BR from '../src/score/break.ts';
import * as F from '../src/shots/breakFall.ts';
import { SHARDS } from '../src/shots/glass.ts';

type V2 = readonly [number, number];
const layout = (p: readonly number[]): V2 => [p[0] + 960, 540 - p[1]];
const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} vs ${b.toFixed(3)} (±${tol})`);
const inside = (pt: V2, poly: readonly V2[]): boolean => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

// --- Which cell is which ----------------------------------------------------------------------------------------------------------

test('the 75 cells of the crack: 36 face cells (a fixed list), 33 visible blank cells, 6 wholly off the frame; cell 37 carries his left ×', () => {
  assert.deepEqual([...F.FACE_CELLS].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 36, 37, 38, 44, 45, 51, 52, 53, 59]);
  assert.equal(F.FACE_CELLS.length, 36);
  assert.equal(F.E2_CELL, 37);
  assert.equal(F.CORE_CELLS.length, 30, 'ω, ×L (but the E2 shard) and ×R');
  assert.ok(!F.CORE_CELLS.includes(F.E2_CELL));
  assert.deepEqual([...F.OFF_FRAME_CELLS].sort((a, b) => a - b), [62, 63, 64, 70, 71, 72]);
  assert.equal(F.PIECES.length, 33);
  const all = new Set([...F.FACE_CELLS, ...F.OFF_FRAME_CELLS, ...F.PIECES.map((p) => p.k)]);
  assert.equal(all.size, 75, 'every cell exactly once');
  // The left × glyph's centre (625, 545) lies in cell 37 (the sheet's point-in-polygon test).
  assert.ok(inside([625, 545], SHARDS[37].pts.map(layout)), 'his left × is on the E2 shard');
  // The off-frame cells never show, even at the dolly's widest (zoom 1).
  const onFrame = (k: number): boolean => {
    const poly = SHARDS[k].pts.map(layout);
    if (poly.some(([x, y]) => x > 1 && x < 1919 && y > 1 && y < 1079)) return true;
    for (let x = 0; x <= 1920; x += 4) for (const y of [0, 1080]) if (inside([x, y], poly)) return true;
    for (let y = 0; y <= 1080; y += 4) for (const x of [0, 1920]) if (inside([x, y], poly)) return true;
    return false;
  };
  for (const k of F.OFF_FRAME_CELLS) assert.ok(!onFrame(k), `cell ${k} off the frame`);
  for (const p of F.PIECES) assert.ok(onFrame(p.k), `cell ${p.k} shows`);
});

test('each blank piece takes the paint of the quadrant its centroid lies in (counter-clockwise from the hit: violet, yellow, coral, mint) — the sheet’s lists', () => {
  const lists: Record<string, number[]> = {
    violet: [46, 60, 17, 18, 31, 32, 33, 47, 48, 61],
    yellow: [66, 35, 20, 19, 34, 50, 49, 65],
    coral: [69, 55, 54, 40, 68, 39, 67],
    mint: [73, 56, 57, 58, 41, 42, 43, 74],
  };
  for (const p of F.PIECES) {
    const a = ((Math.atan2(SHARDS[p.k].c[1], SHARDS[p.k].c[0]) * 180) / Math.PI + 360) % 360;
    const q = ['violet', 'yellow', 'coral', 'mint'][Math.floor(a / 90)];
    assert.equal(p.paint, q, `cell ${p.k} at ${a.toFixed(0)}°`);
    assert.ok(lists[p.paint].includes(p.k), `cell ${p.k} in the sheet's ${p.paint} list`);
  }
});

// --- The release / landing table (§4.3, Appendix B) ---------------------------------------------------------------------------------

const GROUPS: [string, number[]][] = [
  ['P1', [33]], ['P2', [66]], ['P3', [60]], ['C1', [69, 73]], ['P4', [35]], ['C2', [55, 56, 57]], ['C3', [54, 58]], ['C4', [40, 41, 42, 68]],
  ['K1', [39, 43]], ['K2', [74, 67]], ['K3', [20, 17]], ['K4', [19, 18]], ['K5', [31, 32]], ['K6', [34, 46]], ['K7', [50, 47, 61]], ['K8', [49, 48, 65]],
];
/** Appendix B: landed centroid and angle of every blank piece (iteration 2, ruling 1: P1 is cell 33 above his face, cell 46 a K6 card). */
const LANDED: Record<number, [number, number, number]> = {
  33: [1040, 970, 23.95], 46: [1446, 251, 6.2], 66: [190, 985, -10.3], 60: [1830, 995, 24.5], 69: [331, 1211, 4.8], 73: [1701, 1224, -4.4], 35: [650, 950, -14.4],
  55: [765, 1181, -6.1], 56: [1095, 1219, 0.4], 57: [1309, 1156, -5.0], 54: [519, 1020, -2.2], 58: [1438, 991, -3.1],
  40: [827, 953, -0.1], 41: [1050, 965, -3.5], 42: [1181, 936, 7.0], 68: [84, 935, -2.3], 39: [642, 878, 9.5], 43: [1294, 848, 3.2],
  74: [1878, 794, 1.5], 67: [8, 615, 10.8], 20: [802, 450, 6.9], 17: [1100, 422, -6.4], 19: [860, 399, 3.0], 18: [1018, 395, 9.3],
  31: [1281, 374, 4.0], 32: [1191, 252, 14.6], 34: [798, 216, 12.0], 50: [515, 91, 9.5], 47: [1305, 35, -9.7],
  61: [1741, 20, 11.5], 49: [716, -35, -8.7], 48: [1078, -62, -7.0], 65: [308, -157, -1.9],
};
const SPLAT: Record<number, number> = { 46: 228, 66: 396, 60: 407, 69: 326, 73: 383, 35: 197, 55: 291, 56: 279, 57: 227, 54: 195, 58: 231, 40: 172, 41: 143, 42: 118, 68: 337, 39: 176, 43: 156, 74: 442, 67: 320, 20: 92, 17: 92, 19: 97, 18: 116, 31: 158, 32: 154, 34: 158, 33: 188, 50: 214, 47: 210, 61: 435, 49: 240, 48: 291, 65: 379 };

test('the pieces let go in the score’s groups — one release on 21.1, two on 21.2, four on 21.3, eight on 21.4 — and land where Appendix B says', () => {
  assert.equal(GROUPS.length, BR.PIECE_FALLS.length);
  GROUPS.forEach(([name, cells], i) => {
    for (const k of cells) {
      const p = F.PIECES.find((x) => x.k === k)!;
      assert.equal(p.group, name, `cell ${k}`);
      assert.equal(p.release, BR.PIECE_FALLS[i].from, `cell ${k} lets go with ${name}`);
      assert.equal(p.land, BR.PIECE_FALLS[i].to, `cell ${k} lands with ${name}`);
      assert.equal(p.cls, name[0] === 'P' ? 'single' : name[0] === 'C' ? 'crumble' : 'card');
    }
  });
  assert.deepEqual(F.PIECES.map((p) => p.order), F.PIECES.map((_, i) => i), 'in release order');
  for (const p of F.PIECES) {
    const [x, y, a] = LANDED[p.k];
    near(p.to[0], x, 0.6, `cell ${p.k} lands at x`);
    near(p.to[1], y, 0.6, `cell ${p.k} lands at y`);
    near(p.angle, a, 0.06, `cell ${p.k} lands turned`);
    near(p.splat, SPLAT[p.k], 0.6, `cell ${p.k}'s splat`);
    assert.deepEqual(p.from, layout(SHARDS[p.k].c), `cell ${p.k} falls from its centroid`);
  }
});

test('the singles, crumbles and cards land by the sheet’s rules: singles where the table says, crumbles 20 px out and 50 down, cards 40 out and 55 down; angles from the hashes', () => {
  for (const p of F.PIECES) {
    const h = hash(p.k, 541);
    if (p.cls === 'single') assert.equal(p.angle, (hash(p.k, 542) < 0.5 ? -1 : 1) * (10 + 15 * h));
    if (p.cls === 'crumble') assert.equal(p.angle, 8 * (2 * h - 1));
    if (p.cls === 'card') assert.equal(p.angle, 15 * (2 * h - 1));
    if (p.cls === 'single') continue;
    const [out, down] = p.cls === 'crumble' ? [20, 50] : [40, 55];
    assert.deepEqual(p.to, [p.from[0] + Math.sign(p.from[0] - 960) * out, p.from[1] + down], `cell ${p.k}`);
  }
  assert.deepEqual(F.PIECES.filter((p) => p.cls === 'single').map((p) => [p.k, ...p.to]), [[33, 1040, 970], [66, 190, 985], [60, 1830, 995], [35, 650, 950]]);
});

test('21.1 (iteration 2, ruling 1): the first pane to let go stands right above his face — not in a corner — and falls straight across it, glinting as it crosses his ω', () => {
  const p1 = F.PIECES[0];
  assert.equal(p1.release, BR.BREAK_START, 'it lets go on 21.1');
  assert.ok(Math.abs(p1.from[0] - 960) < 120 && p1.from[1] < 360, `it stands above his face, not in a corner: (${p1.from.map((v) => v.toFixed(0))})`);
  // His ink spans y 400–720 (em 360 about y 560); the pane's centroid crosses that band over his ω (x 800–1120).
  const path: V2[] = [];
  for (let f = p1.release; f < p1.land; f += 0.25) {
    const s = F.pieceAt(p1, f);
    if (s.phase === 'fall') path.push(layout([s.matrix[12], s.matrix[13]]));
  }
  const across = path.filter(([, y]) => y >= 400 && y <= 720);
  assert.ok(across.length > 8, 'it spends frames on his face');
  for (const [x, y] of across) assert.ok(x >= 800 && x <= 1120, `over his ω at y ${y.toFixed(0)}: x ${x.toFixed(0)}`);
  // The glint on BR.P1_GLINT (a 3-frame flare) lands while the pane is over his ω.
  const g = F.pieceAt(p1, BR.P1_GLINT + 1.5);
  assert.equal(g.phase, 'fall');
  if (g.phase === 'fall') {
    assert.ok(g.glint > 0.9, `the glint peaks: ${g.glint.toFixed(2)}`);
    const [x, y] = layout([g.matrix[12], g.matrix[13]]);
    assert.ok(x >= 800 && x <= 1120 && y >= 470 && y <= 690, `and it is over his ω then: (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }
});

test('the first panes fall as fat, refracting glass and the cascade drops like paper cards: thickness, transmission and tumble by release order', () => {
  for (const p of F.PIECES) {
    const u = p.order / 32;
    near(p.thickness, 22 - 18 * u, 1e-9, `thickness of ${p.k}`);
    near(p.transmission, 1 - 0.4 * u, 1e-9, `transmission of ${p.k}`);
    near(p.tumble, 1 - 0.8 * u, 1e-9, `tumble of ${p.k}`);
  }
});

test('every landed polygon is its crack cell’s outline turned by its landing angle about its landing point, never mirrored (§7.1) — exported for the flat world', () => {
  assert.equal(F.PIECE_LANDING.length, 33);
  for (const l of F.PIECE_LANDING) {
    const p = F.PIECES.find((x) => x.k === l.k)!;
    assert.deepEqual(l.centroid, p.to);
    assert.equal(l.angle, p.angle);
    assert.equal(l.mirrored, false);
    const s = SHARDS[l.k];
    const th = (l.angle * Math.PI) / 180;
    s.pts.forEach((pt, i) => {
      const [x0, y0] = layout(pt);
      const [cx, cy] = layout(s.c);
      let dx = x0 - cx;
      const dy = y0 - cy;
      if (l.mirrored) dx = -dx;
      const want: V2 = [l.centroid[0] + dx * Math.cos(th) - dy * Math.sin(th), l.centroid[1] + dx * Math.sin(th) + dy * Math.cos(th)];
      near(l.pts[i][0], want[0], 1e-6, `cell ${l.k} corner ${i} x`);
      near(l.pts[i][1], want[1], 1e-6, `cell ${l.k} corner ${i} y`);
    });
  }
});
