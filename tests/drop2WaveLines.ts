// The D3 checks of the wave's geometry on screen (round 2, R2-01 / R2-02 / R2C-01: the straight planks seen at the lip were still
// on screen while the old D3 test passed, because it looked only at layer 4's quads and two keyline colours, in no particular frame
// space). These look at every VecItem (fill, quad, stroke) of every layer of a WaveFrame, in on-screen px after the camera:
//   visibleStraights — every straight run over T px that SHOWS: one long edge or segment, or a row of collinear edges of several items
//     (a cut through a stack of bands, a strip of quads ending in a straight line), not covered by what is drawn over it, not the seam
//     between two pieces of the same colour, not on the frame's border; and any quad long on both pairs of its sides (a plank).
//   failedFills — fills the painter cannot ear-clip whole (a self-crossing polygon): drawn as nothing or as shards, they leave their
//     keyline floating with no fill under it (the round-1 zigzag in the water after the crash).
// Items marked `straight` (the horizon and the graded bands it bounds, the paper's furniture, the game pixels) are exempt.
import * as THREE from 'three';
import type { VecItem, WaveFrame } from '../src/shots/drop2Wave.ts';

const W = 1920;
const H = 1080;
type RGB = readonly number[];
type Quad = Extract<VecItem, { kind: 'quad' }>;
type Area = Exclude<VecItem, { kind: 'stroke' }>;
type Occ = { i: number; v: Area; x0: number; y0: number; x1: number; y1: number; opaque: boolean };
type Edge = { i: number; L: number; k: number; x0: number; y0: number; x1: number; y1: number; th: number; rho: number };

/** The part of segment (x0, y0) → (x1, y1) inside the frame (Liang–Barsky): its parameter range, or null. */
function clipT(x0: number, y0: number, x1: number, y1: number): [number, number] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (const [p, q] of [
    [-dx, x0],
    [dx, W - x0],
    [-dy, y0],
    [dy, H - y0],
  ] as const) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
  }
  return t1 > t0 ? [t0, t1] : null;
}
const visLen = (x0: number, y0: number, x1: number, y1: number): number => {
  const c = clipT(x0, y0, x1, y1);
  return c ? (c[1] - c[0]) * Math.hypot(x1 - x0, y1 - y0) : 0;
};
function inside(p: readonly number[], x: number, y: number): boolean {
  let c = false;
  const n = p.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p[2 * i];
    const yi = p[2 * i + 1];
    const xj = p[2 * j];
    const yj = p[2 * j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** A quad's colour at a point inside it (the painter's two triangles 0-1-2 and 0-2-3, barycentric). */
function quadColour(v: Quad, x: number, y: number): RGB {
  for (const [a, b, c] of [
    [0, 1, 2],
    [0, 2, 3],
  ]) {
    const [ax, ay, bx, by, cx, cy] = [v.pts[2 * a], v.pts[2 * a + 1], v.pts[2 * b], v.pts[2 * b + 1], v.pts[2 * c], v.pts[2 * c + 1]];
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(d) < 1e-9) continue;
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
    const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return [0, 1, 2].map((ch) => l1 * v.colors[a][ch] + l2 * v.colors[b][ch] + l3 * v.colors[c][ch]);
  }
  return v.colors[0];
}
const merged = (iv: [number, number][], gap: number): number => {
  iv.sort((a, b) => a[0] - b[0]);
  let best = 0;
  let s = -Infinity;
  let e = -Infinity;
  for (const [a, b] of iv) {
    if (a > e + gap) {
      s = a;
      e = b;
    } else e = Math.max(e, b);
    best = Math.max(best, e - s);
  }
  return best;
};

const CELL = 60;
const GX = Math.ceil(W / CELL);
const GY = Math.ceil(H / CELL);
/** Collinear within 0.2° and 0.8 px. */
const ANG = (0.2 * Math.PI) / 180;
const RHO = 0.8;

/** Every straight run over `T` px that shows on screen (see the header), described; empty when there is none. */
export function visibleStraights(fr: WaveFrame, T = 90): string[] {
  const items: { v: VecItem; L: number }[] = [];
  [...fr.layers, fr.top].forEach((L, li) => L.vec.forEach((v) => items.push({ v, L: li })));
  const out: string[] = [];
  // 1. Planks; every edge with its line (angle mod π, distance from the origin). Fill edges and quads' cross edges (1, 3: from one rail
  //    to the other) are bucketed to chain across items; stroke segments and quads' edges along their strip are judged one by one (a
  //    finely sampled curve may be near-straight over a long run without ever being a cut).
  const buckets = new Map<string, Edge[]>();
  const singles: Edge[] = [];
  items.forEach(({ v, L }, i) => {
    if (v.straight || v.alpha < 0.05) return;
    const p = v.pts;
    const n = p.length / 2;
    if (v.kind === 'quad') {
      const s = [0, 1, 2, 3].map((k) => visLen(p[2 * k], p[2 * k + 1], p[(2 * k + 2) % 8], p[(2 * k + 3) % 8]));
      if (Math.min(Math.max(s[0], s[2]), Math.max(s[1], s[3])) > 50) out.push(`L${L} quad #${i}: a plank (${s.map((d) => d.toFixed(0)).join(' / ')} px) at (${p[0].toFixed(0)}, ${p[1].toFixed(0)})`);
    }
    const closed = v.kind !== 'stroke' || v.closed;
    for (let k = 0; k < (closed ? n : n - 1); k++) {
      const j = (k + 1) % n;
      const [x0, y0, x1, y1] = [p[2 * k], p[2 * k + 1], p[2 * j], p[2 * j + 1]];
      if (visLen(x0, y0, x1, y1) < 4) continue;
      if (v.kind === 'quad' && v.alphas && Math.max(v.alphas[k], v.alphas[j]) * v.alpha < 0.15) continue;
      let th = Math.atan2(y1 - y0, x1 - x0);
      if (th < 0) th += Math.PI;
      if (th >= Math.PI) th -= Math.PI;
      const e: Edge = { i, L, k, x0, y0, x1, y1, th, rho: x0 * Math.sin(th) - y0 * Math.cos(th) };
      if (!(v.kind === 'fill' || (v.kind === 'quad' && k % 2 === 1))) {
        if (visLen(x0, y0, x1, y1) > T) singles.push(e);
        continue;
      }
      const key = `${Math.round(th / ANG)},${Math.round(e.rho / RHO)}`;
      const b = buckets.get(key);
      if (b) b.push(e);
      else buckets.set(key, [e]);
    }
  });
  // 2. Candidates: one edge over T, or the edges of three or more items on one line reaching over T in a row.
  const along = (e: Edge, th: number): [number, number] => {
    const a = e.x0 * Math.cos(th) + e.y0 * Math.sin(th);
    const b = e.x1 * Math.cos(th) + e.y1 * Math.sin(th);
    return a < b ? [a, b] : [b, a];
  };
  const cands: Edge[][] = singles.map((e) => [e]);
  for (const [key, own] of buckets) {
    const [ta, ra] = key.split(',').map(Number);
    const group: Edge[] = [];
    for (let da = -1; da <= 1; da++)
      for (let dr = -1; dr <= 1; dr++) {
        const b = buckets.get(`${ta + da},${ra + dr}`);
        if (b) group.push(...b);
      }
    const many = new Set(group.map((e) => e.i)).size >= 3;
    const long = own.filter((e) => visLen(e.x0, e.y0, e.x1, e.y1) > T);
    if (many && merged(group.map((e) => along(e, own[0].th)), 3) > T) cands.push(group);
    else for (const e of long) cands.push([e]);
  }
  if (cands.length === 0) return out;
  // 3. Where each candidate edge shows: the opaque items hide what they cover; any item that shows paints a colour a seam can match.
  const opaqueGrid: Occ[][] = Array.from({ length: GX * GY }, () => []);
  const allGrid: Occ[][] = Array.from({ length: GX * GY }, () => []);
  items.forEach(({ v }, i) => {
    if (v.kind === 'stroke') return;
    const as = v.kind === 'quad' && v.alphas ? v.alphas : [1];
    if (v.alpha * Math.max(...as) < 0.15) return;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let k = 0; k < v.pts.length; k += 2) {
      x0 = Math.min(x0, v.pts[k]);
      x1 = Math.max(x1, v.pts[k]);
      y0 = Math.min(y0, v.pts[k + 1]);
      y1 = Math.max(y1, v.pts[k + 1]);
    }
    if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
    const o: Occ = { i, v, x0, y0, x1, y1, opaque: v.alpha * Math.min(...as) >= 0.95 };
    for (let gy = Math.max(0, Math.floor(y0 / CELL)); gy <= Math.min(GY - 1, Math.floor(y1 / CELL)); gy++)
      for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx <= Math.min(GX - 1, Math.floor(x1 / CELL)); gx++) {
        allGrid[gy * GX + gx].push(o);
        if (o.opaque) opaqueGrid[gy * GX + gx].push(o);
      }
  });
  const off = (x: number, y: number): boolean => x < 0.5 || y < 0.5 || x >= W - 0.5 || y >= H - 0.5;
  const hit = (o: Occ, x: number, y: number): boolean => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1 && inside(o.v.pts, x, y);
  /** Whether something opaque drawn after item `after` covers (x, y). */
  const coveredAfter = (x: number, y: number, after: number): boolean => off(x, y) || opaqueGrid[Math.floor(y / CELL) * GX + Math.floor(x / CELL)].some((o) => o.i > after && hit(o, x, y));
  /** Whether, just outside item `self` at (x, y), an item that shows there has its edge's colour (a seam between pieces of one block). */
  const seam = (x: number, y: number, self: number, cin: RGB): boolean => {
    if (off(x, y)) return false;
    const list = allGrid[Math.floor(y / CELL) * GX + Math.floor(x / CELL)];
    for (let k = list.length - 1; k >= 0; k--) {
      const o = list[k];
      if (o.i === self || !hit(o, x, y)) continue;
      const c = o.v.kind === 'quad' ? quadColour(o.v, x, y) : o.v.color;
      if (c.every((q, ch) => Math.abs(q - cin[ch]) <= 0.03)) return true;
      if (o.opaque) return false;
    }
    return false;
  };
  const areas = new Map<number, number>();
  const area = (i: number): number => {
    let a = areas.get(i);
    if (a === undefined) {
      const p = items[i].v.pts;
      const n = p.length / 2;
      a = 0;
      for (let k = 0; k < n; k++) a += p[2 * k] * p[2 * ((k + 1) % n) + 1] - p[2 * ((k + 1) % n)] * p[2 * k + 1];
      areas.set(i, a);
    }
    return a;
  };
  const done = new Set<string>();
  for (const group of cands) {
    const sig = group
      .map((e) => `${e.i}:${e.k}`)
      .sort()
      .join(' ');
    if (done.has(sig)) continue;
    done.add(sig);
    const th = group[0].th;
    const shows: [number, number][] = [];
    for (const e of group) {
      const v = items[e.i].v;
      const len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
      const c = clipT(e.x0, e.y0, e.x1, e.y1);
      if (!c) continue;
      // The outward normal (y down: for a positive shoelace sum the inside lies right of the direction of travel).
      const sgn = area(e.i) > 0 ? -1 : 1;
      const nx = (sgn * -(e.y1 - e.y0)) / len;
      const ny = (sgn * (e.x1 - e.x0)) / len;
      const steps = Math.max(1, Math.ceil(((c[1] - c[0]) * len) / 4));
      let start: number | null = null;
      let last = 0;
      for (let s = 0; s <= steps; s++) {
        const t = c[0] + ((c[1] - c[0]) * s) / steps;
        const x = e.x0 + (e.x1 - e.x0) * t;
        const y = e.y0 + (e.y1 - e.y0) * t;
        let on: boolean;
        if (v.kind === 'stroke') on = !coveredAfter(x, y, e.i);
        else {
          const j = (e.k + 1) % (v.pts.length / 2);
          const cin: RGB = v.kind === 'quad' ? v.colors[e.k].map((q, ch) => q + (v.colors[j][ch] - q) * t) : v.color;
          // It shows where nothing drawn later covers either side of it (else what shows there is that item's own edge) and the colour
          // just outside differs from its own (else it is a seam inside one block).
          const [ox, oy, ix, iy] = [x + 2.5 * nx, y + 2.5 * ny, x - 2.5 * nx, y - 2.5 * ny];
          on = !off(x, y) && !off(ox, oy) && !coveredAfter(ix, iy, e.i) && !coveredAfter(ox, oy, e.i) && !seam(ox, oy, e.i, cin);
        }
        const pos = x * Math.cos(th) + y * Math.sin(th);
        if (on && start === null) start = pos;
        if (!on && start !== null) {
          shows.push(start < last ? [start, last] : [last, start]);
          start = null;
        }
        last = pos;
      }
      if (start !== null) shows.push(start < last ? [start, last] : [last, start]);
    }
    const run = merged(shows, 5);
    if (run > T) {
      const e = group[0];
      const others = new Set(group.map((g) => g.i)).size - 1;
      out.push(`L${e.L} ${items[e.i].v.kind} #${e.i}${others > 0 ? ` (+ ${others} in line)` : ''}: a straight run of ${run.toFixed(0)} px at ${((th * 180) / Math.PI).toFixed(1)}° through (${e.x0.toFixed(0)}, ${e.y0.toFixed(0)})`);
    }
  }
  return out;
}

/** Fills in the frame that the painter's ear-clipping (three's ShapeUtils, as src/scenes/drop2WaveMesh.ts) cannot cover whole (≥ 5 % of their area lost or doubled). */
export function failedFills(fr: WaveFrame): string[] {
  const out: string[] = [];
  [...fr.layers, fr.top].forEach((L, li) =>
    L.vec.forEach((v, vi) => {
      if (v.kind !== 'fill' || v.pts.length < 6) return;
      const c: THREE.Vector2[] = [];
      for (let k = 0; k < v.pts.length; k += 2) c.push(new THREE.Vector2(v.pts[k], v.pts[k + 1]));
      if (c.every((p) => p.x < 0) || c.every((p) => p.x > W) || c.every((p) => p.y < 0) || c.every((p) => p.y > H)) return;
      let a = 0;
      for (let k = 0; k < c.length; k++) a += c[k].x * c[(k + 1) % c.length].y - c[(k + 1) % c.length].x * c[k].y;
      a = Math.abs(a / 2);
      if (a < 50) return;
      let tris: number[][] = [];
      try {
        tris = THREE.ShapeUtils.triangulateShape(c, []);
      } catch {
        tris = [];
      }
      let ta = 0;
      for (const [p, q, r] of tris.map((t) => t.map((k) => c[k]))) ta += Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) / 2;
      if (Math.abs(ta - a) / a > 0.05) out.push(`L${li}[${vi}]: a fill of ${c.length} points covers ${((ta / a) * 100).toFixed(0)} % of its area`);
    }),
  );
  return out;
}
