// A canvas-like recorder for the mochi wave (src/shots/drop2Mochi.ts): the prototype's Canvas 2D calls (save / translate / rotate /
// scale, fill, stroke, a vertical gradient, text) turned into the engine's VecItem polygons, gradient quads and strokes and SDF glyphs, in
// painter's order (a vector drawn after a glyph opens a new layer, so the GPU draws them in the order the prototype did). Paths are
// polylines (curves sampled), in the current transform's local units; everything lands in layout px (y down). Pure.
import type { RGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Advance } from '../engine/typeset.ts';
import type { VecItem, WaveLayer } from './drop2Wave.ts';
import type { XY } from './drop2MochiKit.ts';

/** An affine map in canvas order: x' = a x + c y + e, y' = b x + d y + f. */
export type Mat = [number, number, number, number, number, number];
const ID: Mat = [1, 0, 0, 1, 0, 0];
const mul = (m: Mat, n: Mat): Mat => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

export type GlyphKey = 'rounded' | 'hero';
export type Fonts = Readonly<Record<GlyphKey, Advance>>;
export const emptyWaveLayer = (): WaveLayer => ({ vec: [], glyphs: { rounded: [], jp: [], hero: [] } });

// ——— Paths ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A path under construction (canvas verbs, curves sampled); `polys` holds its closed or open subpaths. */
export class Path {
  readonly polys: XY[][] = [];
  /** Whether each subpath was closed (closePath). */
  readonly closed: boolean[] = [];
  private cur: XY[] | null = null;
  private last: XY = [0, 0];
  moveTo(x: number, y: number): this {
    this.cur = [[x, y]];
    this.polys.push(this.cur);
    this.closed.push(false);
    this.last = [x, y];
    return this;
  }
  lineTo(x: number, y: number): this {
    if (!this.cur) return this.moveTo(x, y);
    this.cur.push([x, y]);
    this.last = [x, y];
    return this;
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number, n = 0): this {
    const [x0, y0] = this.last;
    const k = n || Math.max(6, Math.min(40, Math.ceil((Math.hypot(cx - x0, cy - y0) + Math.hypot(x - cx, y - cy)) / 8)));
    for (let i = 1; i <= k; i++) {
      const t = i / k;
      const m = 1 - t;
      this.lineTo(m * m * x0 + 2 * m * t * cx + t * t * x, m * m * y0 + 2 * m * t * cy + t * t * y);
    }
    return this;
  }
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number, n = 0): this {
    const [x0, y0] = this.last;
    const k = n || Math.max(8, Math.min(48, Math.ceil((Math.hypot(c1x - x0, c1y - y0) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(x - c2x, y - c2y)) / 8)));
    for (let i = 1; i <= k; i++) {
      const t = i / k;
      const m = 1 - t;
      this.lineTo(m * m * m * x0 + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t * t * t * x, m * m * m * y0 + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t * t * t * y);
    }
    return this;
  }
  /** An arc (canvas semantics: from a0 to a1, clockwise on screen unless ccw); joins the current point with a line. */
  arc(cx: number, cy: number, r: number, a0: number, a1: number, ccw = false): this {
    return this.ellipse(cx, cy, r, r, 0, a0, a1, ccw);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw = false): this {
    let sweep = a1 - a0;
    const TAU = Math.PI * 2;
    if (!ccw && sweep < 0) sweep = (sweep % TAU) + TAU;
    if (ccw && sweep > 0) sweep = (sweep % TAU) - TAU;
    if (Math.abs(a1 - a0) >= TAU) sweep = ccw ? -TAU : TAU;
    const k = Math.max(6, Math.min(72, Math.ceil((Math.abs(sweep) * Math.max(rx, ry)) / 6)));
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let i = 0; i <= k; i++) {
      const a = a0 + (sweep * i) / k;
      const ex = rx * Math.cos(a);
      const ey = ry * Math.sin(a);
      const x = cx + ex * cr - ey * sr;
      const y = cy + ex * sr + ey * cr;
      if (i === 0 && !this.cur) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    return this;
  }
  closePath(): this {
    if (this.cur) {
      this.closed[this.closed.length - 1] = true;
      this.last = this.cur[0];
    }
    this.cur = null;
    return this;
  }
  /** The first subpath (most shapes are one). */
  get pts(): XY[] {
    return this.polys[0] ?? [];
  }
}
export const path = (): Path => new Path();
export function capsuleP(p: Path, x: number, y: number, w: number, h: number): Path {
  const r = Math.min(h / 2, w / 2);
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  p.lineTo(x + r, y + h);
  p.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  return p.closePath();
}
/** A capsule whose long edges bulge (domed top, round belly). */
export function mochiP(p: Path, x: number, y: number, w: number, h: number, bow = 0.08): Path {
  const r = h / 2;
  const b = h * bow + 2;
  p.moveTo(x + r, y);
  p.quadraticCurveTo(x + w / 2, y - 2 * b, x + w - r, y);
  p.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  p.quadraticCurveTo(x + w / 2, y + h + 2 * b, x + r, y + h);
  p.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  return p.closePath();
}
/** A seri tier: rounded corners, a domed top and a softly bulging base. */
export function domeP(p: Path, x: number, y: number, w: number, h: number, r0: number, dome: number): Path {
  // (The canvas filled a corner radius over half the side with the non-zero rule; a polygon must not cross itself.)
  const r = Math.max(0, Math.min(r0, h / 2, w / 2));
  p.moveTo(x + r, y);
  p.quadraticCurveTo(x + w / 2, y - 2 * dome, x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.quadraticCurveTo(x + w + 6, y + h / 2, x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.quadraticCurveTo(x + w / 2, y + h + dome, x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.quadraticCurveTo(x - 6, y + h / 2, x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p.closePath();
}
/** A rounded rectangle (arcTo corners). */
export function rrectP(p: Path, x: number, y: number, w: number, h: number, r: number): Path {
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  p.lineTo(x + w, y + h - r);
  p.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  p.lineTo(x + r, y + h);
  p.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  p.lineTo(x, y + r);
  p.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return p.closePath();
}
export const circleP = (x: number, y: number, r: number): Path => path().arc(x, y, r, 0, Math.PI * 2).closePath();
export const polyP = (pts: readonly XY[]): Path => {
  const p = path();
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  return p.closePath();
};

// ——— Polygon helpers (the prototype's clip(): a shape drawn inside another is pulled onto it) ——————————————————————————————

export function insidePoly(poly: readonly XY[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function nearestOn(poly: readonly XY[], x: number, y: number): XY {
  let best: XY = poly[0];
  let bd = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = dx * dx + dy * dy;
    const t = L > 0 ? Math.min(1, Math.max(0, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0;
    const px = a[0] + dx * t;
    const py = a[1] + dy * t;
    const d = (px - x) ** 2 + (py - y) ** 2;
    if (d < bd) {
      bd = d;
      best = [px, py];
    }
  }
  return best;
}
/** Resampled so no step is longer than `step`. */
export function resample(poly: readonly XY[], step: number, closed = true): XY[] {
  const out: XY[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    out.push(a);
    if (!closed && i === n - 1) break;
    const b = poly[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.floor(L / step);
    for (let j = 1; j <= k; j++) {
      const t = j / (k + 1);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
/** `poly` with every point outside `box` moved onto the box's edge: the shape clipped to the box (for shapes that hug it). */
export function clampInto(poly: readonly XY[], box: readonly XY[], step = 5): XY[] {
  const out: XY[] = [];
  for (const p of resample(poly, step)) {
    const q = insidePoly(box, p[0], p[1]) ? p : nearestOn(box, p[0], p[1]);
    const l = out[out.length - 1];
    if (!l || Math.abs(l[0] - q[0]) + Math.abs(l[1] - q[1]) > 0.4) out.push(q);
  }
  return out;
}
/** The convex hull of a point set (Andrew's monotone chain), counter-clockwise on screen (y down: clockwise in maths). */
export function convexHull(pts: readonly XY[]): XY[] {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cross = (o: XY, a: XY, b: XY): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: XY[] = [];
  for (const p of P) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  const up: XY[] = [];
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
/** `subject` clipped to the convex polygon `clip` (Sutherland–Hodgman; either winding): a simple polygon for a simple subject. */
export function clipConvex(subject: readonly XY[], clip: readonly XY[]): XY[] {
  let area = 0;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sgn = area >= 0 ? 1 : -1;
  let out: XY[] = [...subject];
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const side = (p: XY): number => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out;
}
/** The runs of a polyline that lie inside `box` (a line clipped to a shape). */
export function runsInside(line: readonly XY[], box: readonly XY[], step = 5): XY[][] {
  const runs: XY[][] = [];
  let cur: XY[] | null = null;
  for (const p of resample(line, step, false)) {
    if (insidePoly(box, p[0], p[1])) {
      if (!cur) {
        cur = [];
        runs.push(cur);
      }
      cur.push(p);
    } else cur = null;
  }
  return runs.filter((r) => r.length > 1);
}
/** The outline of a stroke of width w along a polyline (for strokes with alpha < 1, which must not overlap themselves at the joints). */
export function ribbonOf(line: readonly XY[], w: number | readonly number[]): XY[] {
  const n = line.length;
  const L: XY[] = [];
  const R: XY[] = [];
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const h = (typeof w === 'number' ? w : (w[i] ?? w[0])) / 2;
    L.push([line[i][0] - (dy / l) * h, line[i][1] + (dx / l) * h]);
    R.push([line[i][0] + (dy / l) * h, line[i][1] - (dx / l) * h]);
  }
  return [...L, ...R.reverse()];
}
/** Dashes along a polyline: [on, off] with an offset (canvas lineDashOffset), as polylines. */
export function dashRuns(line: readonly XY[], on: number, off: number, offset: number): XY[][] {
  const runs: XY[][] = [];
  const period = on + off;
  let s = (((-offset % period) + period) % period) - period;
  // s: the arc position where the current pattern period starts (≤ 0).
  const cum: number[] = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = (d: number): XY => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
  };
  for (; s < total; s += period) {
    const a = Math.max(0, s);
    const b = Math.min(total, s + on);
    if (b - a < 1) continue;
    const run: XY[] = [at(a)];
    for (let i = 0; i < cum.length; i++) if (cum[i] > a && cum[i] < b) run.push(line[i]);
    run.push(at(b));
    runs.push(run);
  }
  return runs;
}

// ——— The pen ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** `space`: the advance of ' ' (em), for the font's own spacing where its atlas holds no space (an atlas's fallback is 0.6 em). */
export type TextOpts = { align?: 'left' | 'center'; outline?: number; outlineColor?: RGB; alpha?: number; space?: number };

export class Pen {
  private m: Mat = ID;
  private readonly stack: Mat[] = [];
  readonly layers: WaveLayer[] = [];
  private cur: WaveLayer;
  /** Items drawn on purpose with long straight edges (the print's furniture: D3's whitelist) are marked while this is set. */
  straight = false;

  private readonly fonts: Fonts;

  constructor(fonts: Fonts) {
    this.fonts = fonts;
    this.cur = emptyWaveLayer();
    this.layers.push(this.cur);
  }

  /** Starts a fresh layer (a pass boundary). */
  newLayer(): void {
    if (this.cur.vec.length + this.cur.glyphs.rounded.length + this.cur.glyphs.hero.length === 0) return;
    this.cur = emptyWaveLayer();
    this.layers.push(this.cur);
  }
  private vecOut(): VecItem[] {
    if (this.cur.glyphs.rounded.length + this.cur.glyphs.hero.length > 0) this.newLayer();
    return this.cur.vec;
  }

  save(): void {
    this.stack.push(this.m);
  }
  restore(): void {
    this.m = this.stack.pop() ?? ID;
  }
  setTransform(m: Mat): void {
    this.m = m;
  }
  transform(n: Mat): void {
    this.m = mul(this.m, n);
  }
  translate(x: number, y: number): void {
    this.transform([1, 0, 0, 1, x, y]);
  }
  rotate(a: number): void {
    const c = Math.cos(a);
    const s = Math.sin(a);
    this.transform([c, s, -s, c, 0, 0]);
  }
  scale(sx: number, sy = sx): void {
    this.transform([sx, 0, 0, sy, 0, 0]);
  }
  pt(x: number, y: number): XY {
    const m = this.m;
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }
  /** The transform's linear scale (√|det|): stroke widths and radii. */
  get k(): number {
    const m = this.m;
    return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  }

  private flat(pts: readonly XY[]): number[] {
    const out: number[] = [];
    for (const [x, y] of pts) {
      const q = this.pt(x, y);
      out.push(q[0], q[1]);
    }
    return out;
  }
  fillPts(pts: readonly XY[], color: RGB, alpha = 1): void {
    if (pts.length < 3 || alpha <= 0) return;
    const it: VecItem = { kind: 'fill', pts: this.flat(pts), color, alpha };
    if (this.straight) it.straight = true;
    this.vecOut().push(it);
  }
  fill(p: Path, color: RGB, alpha = 1): void {
    for (const q of p.polys) this.fillPts(q, color, alpha);
  }
  /**
   * A stroke of width lw (local units) along a polyline, round-capped and round-joined as the prototype's (discs at the ends and at the
   * sharp turns). Strokes with alpha < 1 that are wide are drawn as one ribbon polygon, so their joints never double the alpha.
   */
  strokePts(pts: readonly XY[], lw: number, color: RGB, alpha = 1, closed = false, caps = true): void {
    if (pts.length < 2 || alpha <= 0 || lw <= 0) return;
    const w = lw * this.k;
    if (alpha < 0.999 && w > 3.5 && !closed) {
      this.fillPts(ribbonOf(pts, lw), color, alpha);
      return;
    }
    const flat = this.flat(pts);
    const it: VecItem = { kind: 'stroke', pts: flat, widths: flat.filter((_, i) => i % 2 === 0).map(() => w), color, alpha, closed };
    if (this.straight) it.straight = true;
    const out = this.vecOut();
    out.push(it);
    if (alpha < 0.999 || w < 5) return;
    // Round joins on the sharp turns, round caps at the ends.
    const disc = (x: number, y: number): void => {
      const n = 14;
      const d: number[] = [];
      for (let j = 0; j < n; j++) d.push(x + (w / 2) * Math.cos((2 * Math.PI * j) / n), y + (w / 2) * Math.sin((2 * Math.PI * j) / n));
      out.push({ kind: 'fill', pts: d, color, alpha, ...(this.straight ? { straight: true as const } : {}) });
    };
    const n = flat.length / 2;
    for (let i = 0; i < n; i++) {
      const end = i === 0 || i === n - 1;
      if (end && !closed) {
        if (caps) disc(flat[2 * i], flat[2 * i + 1]);
        continue;
      }
      const a = (i - 1 + n) % n;
      const b = (i + 1) % n;
      const ax = flat[2 * i] - flat[2 * a];
      const ay = flat[2 * i + 1] - flat[2 * a + 1];
      const bx = flat[2 * b] - flat[2 * i];
      const by = flat[2 * b + 1] - flat[2 * i + 1];
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      if (la < 1e-6 || lb < 1e-6) continue;
      if ((ax * bx + ay * by) / (la * lb) < 0.9) disc(flat[2 * i], flat[2 * i + 1]);
    }
  }
  /** An opaque stroke whose width varies along it (local px per point), round-capped. */
  strokeVar(pts: readonly XY[], widths: readonly number[], color: RGB): void {
    if (pts.length < 2) return;
    const k = this.k;
    const out = this.vecOut();
    out.push({ kind: 'stroke', pts: this.flat(pts), widths: widths.map((w) => w * k), color, alpha: 1, closed: false });
    for (const i of [0, pts.length - 1]) {
      const [X, Y] = this.pt(pts[i][0], pts[i][1]);
      const r = (widths[i] * k) / 2;
      const d: number[] = [];
      for (let j = 0; j < 14; j++) d.push(X + r * Math.cos((2 * Math.PI * j) / 14), Y + r * Math.sin((2 * Math.PI * j) / 14));
      out.push({ kind: 'fill', pts: d, color, alpha: 1 });
    }
  }
  stroke(p: Path, lw: number, color: RGB, alpha = 1, caps = true): void {
    p.polys.forEach((q, i) => this.strokePts(q, lw, color, alpha, p.closed[i] && q.length > 2, caps));
  }
  /** A quad with a colour (and alpha) per corner. */
  quad(pts: readonly [XY, XY, XY, XY], colors: readonly [RGB, RGB, RGB, RGB], alpha = 1, alphas?: readonly [number, number, number, number]): void {
    const it: VecItem = { kind: 'quad', pts: this.flat(pts), colors, alpha, ...(alphas ? { alphas } : {}) };
    if (this.straight) it.straight = true;
    this.vecOut().push(it);
  }
  /**
   * A vertical gradient (stops: [y, colour, alpha]) filling the region x0 … xr(y) between the first and the last stop's y, as rows of quads
   * (rows split every `step` px where the right edge curves).
   */
  gradRows(stops: readonly (readonly [number, RGB, number])[], x0: number, xr: (y: number) => number, step = 0): void {
    const at = (y: number): [RGB, number] => {
      if (y <= stops[0][0]) return [stops[0][1], stops[0][2]];
      for (let i = 0; i + 1 < stops.length; i++) {
        const [ya, ca, aa] = stops[i];
        const [yb, cb, ab] = stops[i + 1];
        if (y <= yb) {
          const t = (y - ya) / (yb - ya || 1);
          return [[ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t], aa + (ab - aa) * t];
        }
      }
      const l = stops[stops.length - 1];
      return [l[1], l[2]];
    };
    const ys: number[] = [];
    for (let i = 0; i < stops.length; i++) {
      ys.push(stops[i][0]);
      if (step > 0 && i + 1 < stops.length) for (let y = stops[i][0] + step; y < stops[i + 1][0]; y += step) ys.push(y);
    }
    for (let i = 0; i + 1 < ys.length; i++) {
      const [ya, yb] = [ys[i], ys[i + 1]];
      if (yb - ya < 1e-6) continue;
      const [ca, aa] = at(ya);
      const [cb, ab] = at(yb);
      if (aa <= 0 && ab <= 0) continue;
      this.quad(
        [
          [x0, ya],
          [xr(ya), ya],
          [xr(yb), yb],
          [x0, yb],
        ],
        [ca, ca, cb, cb],
        1,
        [aa, aa, ab, ab],
      );
    }
  }
  /** A polygon filled with a vertical gradient (c0 at y0 → c1 at y1), as horizontal strips of quads (for x-convex shapes). */
  gradFill(pts: readonly XY[], y0: number, y1: number, c0: RGB, c1: RGB, step = 6): void {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of pts) {
      lo = Math.min(lo, p[1]);
      hi = Math.max(hi, p[1]);
    }
    const span = (y: number): [number, number] | null => {
      let a = Infinity;
      let b = -Infinity;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi <= y && yj >= y) || (yj <= y && yi >= y)) {
          const x = Math.abs(yj - yi) < 1e-9 ? Math.min(xi, xj) : xi + ((y - yi) * (xj - xi)) / (yj - yi);
          const x2 = Math.abs(yj - yi) < 1e-9 ? Math.max(xi, xj) : x;
          a = Math.min(a, x);
          b = Math.max(b, x2);
        }
      }
      return a <= b ? [a, b] : null;
    };
    const col = (y: number): RGB => {
      const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    };
    const n = Math.max(1, Math.ceil((hi - lo) / step));
    for (let i = 0; i < n; i++) {
      const ya = lo + ((hi - lo) * i) / n;
      const yb = lo + ((hi - lo) * (i + 1)) / n;
      const A = span(ya + (i === 0 ? 1e-3 : 0));
      const B = span(yb - (i === n - 1 ? 1e-3 : 0));
      if (!A || !B) continue;
      const [ca, cb] = [col(ya), col(yb)];
      this.quad(
        [
          [A[0], ya],
          [A[1], ya],
          [B[1], yb],
          [B[0], yb],
        ],
        [ca, ca, cb, cb],
      );
    }
  }

  /**
   * Text (local units: `size` px of type), one glyph per character on the baseline's middle, as fillText with textBaseline 'middle'.
   * `outline` is the canvas strokeText's half width outside the letters (local px).
   */
  text(key: GlyphKey, s: string, x: number, y: number, size: number, color: RGB, o: TextOpts = {}): void {
    const font = this.fonts[key];
    const space = o.space;
    const adv = space === undefined ? font : (ch: string): number => (ch === ' ' ? space : font(ch));
    const chars = [...s];
    const total = chars.reduce((w, ch) => w + adv(ch), 0) * size;
    let pen = o.align === 'left' ? x : x - total / 2;
    const m = this.m;
    const sxl = Math.hypot(m[0], m[1]);
    const syl = Math.hypot(m[2], m[3]);
    const rot = -Math.atan2(m[1], m[0]);
    const out = this.cur.glyphs[key];
    for (const ch of chars) {
      const a = adv(ch) * size;
      const cx = pen + a / 2;
      pen += a;
      if (ch === ' ') continue;
      const [X, Y] = this.pt(cx, y);
      const g: Glyph = { ch, x: X - 960, y: 540 - Y, size: size * syl, color, rot, stretch: sxl / (syl || 1) };
      if (o.alpha !== undefined) g.alpha = o.alpha;
      if (o.outline) {
        g.outline = o.outline / size;
        g.outlineColor = o.outlineColor;
      }
      out.push(g);
    }
  }
  /** The width of a string (local px). */
  measure(key: GlyphKey, s: string, size: number): number {
    const adv = this.fonts[key];
    return [...s].reduce((w, ch) => w + adv(ch), 0) * size;
  }
}
