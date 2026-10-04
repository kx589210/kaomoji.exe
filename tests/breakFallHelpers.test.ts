// Helpers the fall's scene draws with (src/shots/breakFall.ts): the cracks flaring round a fresh hole, the camera that keeps E2's shard
// still on screen whatever the rig does, and the ink outline ring of a landed piece.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { View } from '../src/engine/view.ts';
import * as F from '../src/shots/breakFall.ts';
import { SHARDS } from '../src/shots/glass.ts';
import { FRONT } from '../src/shots/swiss.ts';
import { partFrame, partStart } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

test('every cell knows the cells that share an edge with it, both ways', () => {
  for (const [k, ns] of F.NEIGHBOURS) {
    for (const n of ns) assert.ok(F.NEIGHBOURS.get(n)!.includes(k), `${k} and ${n} are neighbours both ways`);
    assert.ok(ns.length >= 2 && ns.length <= 6, `cell ${k} has ${ns.length} neighbours`);
  }
});

test('each crack edge knows the cell across it (−1 at the rim): the same neighbours both ways, one per edge of the cell', () => {
  for (const [k, es] of F.EDGE_NEIGHBOURS) {
    assert.equal(es.length, SHARDS[k].pts.length, `cell ${k}: one entry an edge`);
    for (const n of es) {
      if (n < 0) continue;
      assert.ok(F.NEIGHBOURS.get(k)!.includes(n), `${n} borders ${k}`);
      assert.ok(F.EDGE_NEIGHBOURS.get(n)!.includes(k), `${k} borders ${n}`);
    }
    assert.deepEqual([...es].filter((n) => n >= 0).sort((a, b) => a - b), [...F.NEIGHBOURS.get(k)!].sort((a, b) => a - b), `cell ${k}'s edges cover its neighbours`);
  }
});

test('a hole reads as a hole (review R1-05): the crack edge round it flares ×1.6 as its piece lets go, fades to 40 % over four frames and stays there; an edge between two standing panes stays whole', () => {
  const p1 = F.PIECES[0];
  const n = F.NEIGHBOURS.get(p1.k)![0];
  const i = F.EDGE_NEIGHBOURS.get(n)!.indexOf(p1.k);
  assert.ok(i >= 0);
  const g = (f: number) => F.edgeGains(n, f);
  assert.equal(g(p1.release - 0.5)[i], 1, 'whole before the release');
  assert.ok(Math.abs(g(p1.release - 0.25)[i] - 1.6) < 1e-9, '×1.6 the instant the hole opens (a quarter frame early, as the piece)');
  assert.ok(Math.abs(g(p1.release + 1.75)[i] - 1.0) < 1e-9, 'halfway down');
  assert.ok(Math.abs(g(p1.release + 3.75)[i] - 0.4) < 1e-9, '40 % after the flare');
  assert.equal(g(at(1, 4) - 2)[i], 0.4, 'and it stays dim');
  const others = F.EDGE_NEIGHBOURS.get(n)!.map((m, j) => ({ m, j })).filter(({ m }) => m !== p1.k && (m < 0 || F.pieceAt(F.PIECES.find((q) => q.k === m) ?? F.PIECES[0], p1.release + 2).phase === 'stand' || F.FACE_CELLS.includes(m)));
  for (const { m, j } of others) if (m < 0 || F.FACE_CELLS.includes(m)) assert.equal(g(p1.release + 2)[j], 1, `edge ${j} toward a standing ${m} stays whole`);
  // Before break 1.1 nothing has let go: drop 1's last frame exactly.
  for (const [k] of F.EDGE_NEIGHBOURS) assert.ok(F.edgeGains(k, partStart('break') - 0.3).every((x) => x === 1), `cell ${k} untouched before 21.1`);
});

test('the standing glass catches a slow softbox sheen from 21.1 — none on 1920 (the seam), then at least four times the void’s light, so the holes read darker than the glass', () => {
  assert.equal(F.standSheen(at(1)).amount, 0, 'the seam: 1920 is 1919');
  assert.equal(F.standSheen(at(1, 2)).amount, 1);
  const voidLuma = 0.2126 * 0.0021 + 0.7152 * 0.0018 + 0.0722 * 0.0037;
  assert.ok(F.STAND_SHEEN.base >= 4 * voidLuma, `the dimmest glass (${F.STAND_SHEEN.base}) is brighter than the void (${voidLuma.toFixed(4)})`);
  assert.ok(F.STAND_SHEEN.band >= 0.04, 'the softbox band');
  for (let f = at(1); f < at(2); f += 1) assert.ok(F.standSheen(f + 1).sweep > F.standSheen(f).sweep, `the softbox sweeps across the pane (${f})`);
});

/** Where the pipeline shows a point drawn at engine (x, y) on z = 0 through pose `p`, after sampling the picture through view `v`. */
const shown = (p: ReturnType<typeof F.inverseRigPose>, v: View, x: number, y: number): [number, number] => {
  const dist = p.position[2];
  const k = FRONT / dist;
  const up = p.up;
  const right = [up[1], -up[0]];
  const d = [x - p.position[0], y - p.position[1]];
  const img = [k * (d[0] * right[0] + d[1] * right[1]), k * (d[0] * up[0] + d[1] * up[1])];
  // The view: screen = R(roll) * zoom * rendered + (x, y).
  const c = Math.cos(v.roll);
  const s = Math.sin(v.roll);
  return [v.zoom * (c * img[0] - s * img[1]) + v.x, v.zoom * (s * img[0] + c * img[1]) + v.y];
};

test('drawn through the inverse of the rig, a point stays exactly where it is on screen whatever the punch, shake or roll', () => {
  for (const v of [{ zoom: 1, x: 0, y: 0, roll: 0 }, { zoom: 1.04, x: 0, y: 0, roll: 0 }, { zoom: 1.08, x: 12, y: -7, roll: 0.006 }, { zoom: 1.2, x: -30, y: 20, roll: -0.05 }]) {
    const p = F.inverseRigPose(v);
    for (const [x, y] of [[0, 0], [-396, 1], [700, -300]]) {
      const [sx, sy] = shown(p, v, x, y);
      assert.ok(Math.abs(sx - x) < 1e-6 && Math.abs(sy - y) < 1e-6, `(${x}, ${y}) under ${JSON.stringify(v)} shows at (${sx.toFixed(4)}, ${sy.toFixed(4)})`);
    }
  }
});

test('a landed piece’s outline is a band just inside its edge, its width set in the shader, with each corner’s share of the way round for the trim', () => {
  const l = F.PIECE_LANDING[0];
  const ring = F.outlineRing(l.pts.map(([x, y]) => [x - l.centroid[0], y - l.centroid[1]] as const));
  assert.equal(ring.outer.length, ring.inward.length);
  assert.equal(ring.outer.length, ring.frac.length);
  assert.equal(ring.index.length % 3, 0);
  assert.ok(ring.frac.every((u, i) => u >= 0 && u <= 1 && (i === 0 || i % 4 !== 0 || u >= ring.frac[i - 1] - 1e-9)));
  // Moving each outer corner inward by its miter keeps every edge parallel and the band 1 unit wide (convex cell).
  for (let i = 0; i < ring.outer.length; i++) {
    const [ox, oy] = ring.outer[i];
    const [mx, my] = ring.inward[i];
    if (mx === 0 && my === 0) continue;
    assert.ok(Math.hypot(ox + mx, oy + my) < Math.hypot(ox, oy), `corner ${i} moves inward`);
    assert.ok(Math.hypot(mx, my) >= 1 - 1e-9 && Math.hypot(mx, my) < 4, `its miter is at least the band's width`);
  }
});
