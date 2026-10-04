// Break bar 6, GRAPH: what the graph editor draws at an instant — shapes, glyphs and convex polygons, layer by layer — from the pure
// model in src/shots/breakGraph.ts. Build sheet notes/bid2/break-sheet2.md §3 "Break 6 · GRAPH", §9; design
// notes/extend/interlude-final.md §3.6, §5.2–§5.3, §7 (look: "32 GRAPH"). The scene (src/scenes/breakGraph.ts) only uploads it.
//
// Layers, back to front (world items move with the ride camera; screen items are fixed to the frame):
//   back    the paper and the 16ths' graph paper (×0.9 parallax: it lies a little behind the track)
//   world   the beats' graph paper, the stilts and braces, the rails (ink-edged cream ribbon), the ties, the handles, the key icons (◆ kick,
//           ⧗ clap, ● hat), the hex chips; from the rewind the red easeInBack hook and the curve it replaced (a dashed ghost); the
//           bottoms' impacts (a shockwave ring, sparks)
//   train   four copies of him in their cars behind him
//   hero    k10's handles stretched into a V, his car, him
//   top     the ratchet's clacks, the segment labels, T9
//   chrome  (screen, at the inverse of the rig's punch) the editor: title bar, value axis, ruler, playhead, status line; the red cursor
//   overlay (screen, once per output frame) the selection carried across C6 and T8 (graphOverlay)
// Colours: red (#FF4A1C) only for the antivirus (the cursor, the marquee, T8 / T9, the status line, the hook and its label); amber only
// for him (his body, `(•ω•)` in UI text). Hard shadows keep their screen offset however the camera banks. Lengths are layout px (y down)
// in the world (they zoom with it) unless named `…Px` (screen px). Plain Node imports this file: no three / remotion / react.
import { EDITOR_TEXTS, ORDER_TEXTS, editorBeat, orderId } from '../content/break.ts';
import { HERO_FACES_V2 } from '../content/castBreak.ts';
import { type RGB, linear } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { CHAIN_CLICKS, GRAPH, ORDERS, RATTLE, REWIND, WHIP_CUT } from '../score/break.ts';
import { partBar } from '../score/film.ts';
import { ORDER_TAG, selectChip, selectMarquee } from './breakDefender.ts';
import { GROUND_SPEED, GROUND_STREAKS, type GroundStreak, TRAIL, TRAIL_SPEED } from './breakLaunch.ts';
import { BREAK_PALETTE, HERO_ADVANCE, type BreakCam, frameOf, fromScreen, lGlyph, lSegment, lShape, pop, rotate, toEngine, toScreen } from './breakShared.ts';
import {
  CAR,
  CURSOR_SHAPE,
  FLUNG,
  KEYS,
  type Key,
  RIDE_EM,
  TRACK,
  TRAIN_COLORS,
  arcOfX,
  axisFlingAt,
  flungStreaksAt,
  bezierAt,
  carAt,
  chipAt,
  chromeAt,
  cordsAt,
  cursorAt,
  graphCam,
  heroAt,
  hookAt,
  keyPoint,
  labelsAt,
  marqueeAt,
  omegaAt,
  playX,
  railAtX,
  railY,
  impactsAt,
  trainAt,
  xOfArc,
  crestPopAt,
  joltAt,
  joltWeight,
  selectedAt,
  selectionAt,
  groupAt,
  type GraphCam,
} from './breakGraph.ts';

type V2 = readonly [number, number];
const P = BREAK_PALETTE;

// ——— Content ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A filled convex polygon in engine units (the flat world's: origin at the frame's centre, y up), drawn as a triangle fan. */
export type Poly = { pts: readonly V2[]; color: RGB; alpha?: number };
/** One FlatLayer draw: shapes under the type, glyphs per atlas (`hero`, `mono`), shapes over; polygons after `under` and after `over`. */
export type GraphLayer = { under: Shape[]; glyphs: { hero: Glyph[]; mono: Glyph[] }; over: Shape[]; polys: Poly[]; polysOver: Poly[] };
const layer = (): GraphLayer => ({ under: [], glyphs: { hero: [], mono: [] }, over: [], polys: [], polysOver: [] });

/** The atlases' advances (set by the scene from its atlases; Node tests use these defaults). */
let heroAdv: Advance = (ch) => (HERO_ADVANCE as Record<string, number>)[ch] ?? ([...'⊙✦✪｀'].includes(ch) ? (ch === '⊙' ? 1 : 0.9) : 0.6);
let monoAdv: Advance = (ch) => (ch.codePointAt(0)! >= 0x2e80 ? 1 : 0.6);
export const setGraphAdvance = (o: { hero: Advance; mono: Advance }): void => {
  heroAdv = o.hero;
  monoAdv = o.mono;
};

// ——— Geometry helpers (layout px, y down; angles in degrees clockwise) ———————————————————————————————————————————————————————————

/** Local point (x, y) placed at (ox, oy), turned `rot` degrees clockwise, scaled by s. */
const place = (x: number, y: number, ox: number, oy: number, rot: number, s = 1): V2 => {
  const [rx, ry] = rotate(x * s, y * s, rot);
  return [ox + rx, oy + ry];
};
/** A screen-px offset (d, d) down-right as a world vector under camera c (hard shadows keep their screen offset when the camera banks). */
const shadowOf = (c: BreakCam, d: number): V2 => {
  const [x, y] = rotate(d, d, -c.roll);
  return [x / c.zoom, y / c.zoom];
};
/** The convex polygon `pts` grown by d (mitred, each mitre at most 2.5 d). */
function grow(pts: readonly V2[], d: number): V2[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const s = area > 0 ? 1 : -1;
  const normal = (a: V2, b: V2): V2 => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [(s * dy) / l, (-s * dx) / l];
  };
  return pts.map((p, i) => {
    const n0 = normal(pts[(i - 1 + n) % n], p);
    const n1 = normal(p, pts[(i + 1) % n]);
    const mx = n0[0] + n1[0];
    const my = n0[1] + n1[1];
    const m = Math.hypot(mx, my) || 1;
    const cos = (mx / m) * n1[0] + (my / m) * n1[1];
    const k = Math.min(2.5 * d, d / Math.max(cos, 1e-3));
    return [p[0] + (mx / m) * k, p[1] + (my / m) * k];
  });
}
const toPoly = (pts: readonly V2[], color: RGB, alpha?: number): Poly => ({ pts: pts.map(([x, y]) => toEngine(x, y)), color, alpha });
/** Convex parts drawn as one sticker: all shadows, then all ink outlines, then all fills (layout px). */
function sticker(out: Poly[], parts: readonly (readonly V2[])[], fill: RGB, outline: number, shadow: V2 | null, alpha = 1): void {
  if (shadow) for (const p of parts) out.push(toPoly(grow(p, outline).map(([x, y]) => [x + shadow[0], y + shadow[1]] as V2), P.ink, alpha));
  for (const p of parts) out.push(toPoly(grow(p, outline), P.ink, alpha));
  for (const p of parts) out.push(toPoly(p, fill, alpha));
}
const push = (out: Shape[], s: Shape | null): void => {
  if (s) out.push(s);
};

/** The world rect (an AABB) camera c shows, `margin` screen px past the frame on every side. */
function viewRect(c: BreakCam, margin = 60): { x0: number; y0: number; x1: number; y1: number } {
  const pts = [
    [-margin, -margin],
    [1920 + margin, -margin],
    [-margin, 1080 + margin],
    [1920 + margin, 1080 + margin],
  ].map(([x, y]) => fromScreen(c, x, y));
  return { x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])) };
}

// ——— Text (JetBrains Mono Bold; `(•ω•)` in UI text is his: amber with an ink keyline) ——————————————————————————————————————————————

type TextOpts = { size: number; color: RGB; align?: number; count?: number; alpha?: number; rot?: number; sy?: number };
/** Glyphs for a line of mono text, its left / centre / right (align 0 / 0.5 / 1) at (x, y) before the turn `rot` about (ox, oy). */
function monoText(out: Glyph[], text: string, x: number, y: number, o: TextOpts, pivot: V2 = [x, y]): number {
  const line = typeset(text, monoAdv);
  const left = x - (o.align ?? 0) * line.width * o.size;
  const face = text.indexOf('(•ω•)');
  const faceChars = face < 0 ? -1 : [...text.slice(0, face)].length;
  const sy = o.sy ?? 1;
  line.chars.forEach((c, i) => {
    if (c.ch === ' ' || i >= (o.count ?? Infinity)) return;
    const amber = faceChars >= 0 && i >= faceChars && i < faceChars + 5;
    const [gx, gy] = place(left + c.x * o.size - pivot[0], (y - pivot[1]) * sy, pivot[0], pivot[1], o.rot ?? 0);
    const g = { ch: c.ch, x: gx, y: gy, size: o.size * sy, stretch: 1 / sy, color: amber ? P.amber : o.color, alpha: o.alpha, rot: o.rot ?? 0 };
    out.push(lGlyph(amber ? { ...g, outline: 0.05, outlineColor: P.ink } : g));
  });
  return line.width * o.size;
}
const monoWidth = (text: string, size: number): number => typeset(text, monoAdv).width * size;
/**
 * The ink chip behind `(•ω•)` in a line of UI text laid out as monoText lays it out (left / centre / right at (x, y), turned rot about
 * pivot): his amber face on ink, so it reads on any panel colour (on the yellow title bar and the mint ruler amber alone vanished).
 */
function faceBacking(out: Shape[], text: string, x: number, y: number, o: { size: number; align?: number; rot?: number }, pivot: V2 = [x, y]): void {
  const at = text.indexOf('(•ω•)');
  if (at < 0) return;
  const line = typeset(text, monoAdv);
  const i0 = [...text.slice(0, at)].length;
  const a = line.chars[i0];
  const b = line.chars[i0 + 4];
  const left = x - (o.align ?? 0) * line.width * o.size;
  const x0 = left + (a.x - a.w / 2) * o.size - 0.1 * o.size;
  const x1 = left + (b.x + b.w / 2) * o.size + 0.1 * o.size;
  const [cx, cy] = place((x0 + x1) / 2 - pivot[0], y - pivot[1], pivot[0], pivot[1], o.rot ?? 0);
  out.push(lShape({ kind: 'rect', x: cx, y: cy, w: x1 - x0, h: 1.18 * o.size, r: 0.28 * o.size, rot: o.rot ?? 0, color: P.ink }));
}

/**
 * A white box with text (the hex chips, the segment labels): `col` outlines the box (3 px, inside) and types the text; a (4, 4) ink
 * shadow. Centred on (x, y), scaled by s, folded by sy (its height). World or screen layout px.
 */
function textBox(L: GraphLayer, text: string, x: number, y: number, s: number, sy: number, col: RGB, size: number, shadow: V2): void {
  if (s <= 0 || sy <= 0.01) return;
  const w = (monoWidth(text, size) + 24) * s;
  const h = (size + 14) * s * sy;
  L.under.push(lShape({ kind: 'rect', x: x + shadow[0], y: y + shadow[1], w, h, color: P.ink }));
  L.under.push(lShape({ kind: 'rect', x, y, w, h, color: P.white, outline: 3 * s, outlineColor: col }));
  monoText(L.glyphs.mono, text, x, y + 1 * s * sy, { size: size * s, color: col, align: 0.5, sy });
}

/**
 * A work order (T8, T9): JetBrains Mono Bold 22 px, red text on a white tag (3 px ink border, (4, 4) shadow) with an ink ID chip on its
 * right end (white 17 px); `(•ω•)` amber. (x, y) is its top-left corner; it scales by s (sy folds it), turns rot degrees about that corner.
 */
function workOrder(L: GraphLayer, text: string, id: string, x: number, y: number, o: { s: number; sy?: number; rot?: number; count?: number; alpha?: number }): void {
  const sy = o.sy ?? 1;
  if (o.s <= 0 || sy <= 0.01) return;
  const W = monoWidth(text, 22) + 82;
  const H = 36;
  const rot = o.rot ?? 0;
  const at = (lx: number, ly: number): V2 => place(lx, ly * sy, x, y, rot, o.s);
  const rect = (lx: number, ly: number, w: number, h: number, color: RGB, extra: Partial<Shape> = {}) => {
    const [cx, cy] = at(lx + w / 2, ly + h / 2);
    L.under.push(lShape({ kind: 'rect', x: cx, y: cy, w: w * o.s, h: h * o.s * sy, rot, color, alpha: o.alpha, ...extra }));
  };
  rect(4, 4, W, H, P.ink);
  rect(0, 0, W, H, P.white, { outline: 3 * o.s, outlineColor: P.ink });
  rect(W - 52, 5, 46, H - 10, P.ink);
  const [tx, ty] = at(12, H / 2 + 1);
  monoText(L.glyphs.mono, text, tx, ty, { size: 22 * o.s, color: P.red, count: o.count, alpha: o.alpha, rot, sy }, [tx, ty]);
  const [ix, iy] = at(W - 29, H / 2 + 1);
  monoText(L.glyphs.mono, id, ix, iy, { size: 17 * o.s, color: P.white, align: 0.5, alpha: o.alpha, rot, sy }, [ix, iy]);
}

// ——— His face (and his copies') ——————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Slot advances (ems) for the glyphs whose advance is much wider than their ink (full-width or symbol fonts): ✦ (0.77 of 0.87), ✪ (0.73
 * of 0.83), ｀ (0.28 of 1.00). A face is laid out on these, each glyph drawn at its natural width centred in its slot, so every face stays
 * one compact silhouette with its ω on its placement point. ⊙ keeps its atlas advance (Noto Sans JP's 1.00): the flat world's 5.4&
 * lays (⊙ω⊙) out on it, and C6 carries that face across the cut eye for eye (a 0.8 slot moved each eye 35 px in on the cut).
 */
const SLOTS: Readonly<Record<string, number>> = { '✦': 0.82, '✪': 0.78, '｀': 0.42 };
/** A face's glyphs: each character and its slot centre in ems from the ω's. */
export function faceLayout(face: string, advance: Advance = heroAdv): { ch: string; dx: number }[] {
  const line = typeset(face, (ch) => SLOTS[ch] ?? advance(ch));
  const w = line.chars.find((c) => c.ch === 'ω') ?? line.chars[Math.floor(line.chars.length / 2)];
  return line.chars.filter((c) => c.ch !== ' ').map((c) => ({ ch: c.ch, dx: c.x - w.x }));
}

/**
 * A face's glyphs in a sticker style: ink shadow (the silhouette with its outline, shadowPx down-right on screen), then the body in
 * `fill` with an ink outline (outlinePx on screen). Placement: the ω at (x, y), em, squash sx / sy about the ω, turned rot degrees.
 */
function faceSticker(shadow: Glyph[], body: Glyph[], face: string, o: { x: number; y: number; em: number; sx: number; sy: number; rot: number; fill: RGB; outlinePx: number; shadowPx: number; cam: BreakCam; alpha?: number }): void {
  const size = o.em * o.sy;
  const outline = o.outlinePx / o.cam.zoom / size;
  const [shx, shy] = shadowOf(o.cam, o.shadowPx);
  for (const c of faceLayout(face)) {
    const [x, y] = place(c.dx * o.em * o.sx, 0, o.x, o.y, o.rot);
    const base = { ch: c.ch, size, stretch: o.sx / o.sy, rot: o.rot, alpha: o.alpha };
    shadow.push(lGlyph({ ...base, x: x + shx, y: y + shy, color: P.ink, outline, outlineColor: P.ink }));
    body.push(lGlyph({ ...base, x, y, color: o.fill, outline, outlineColor: P.ink }));
  }
}

// ——— The car ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A coaster car (an ink pill, a yellow stripe, two cream wheels with ink rims on the rails) centred at (x, y), turned rot degrees,
 * scaled s. Its rider is drawn over it, his ω on its top edge (a car drawn over him slashed his face on every drop).
 */
function car(out: Shape[], x: number, y: number, rot: number, s: number): void {
  const part = (lx: number, ly: number, sh: Omit<Shape, 'x' | 'y' | 'rot'>) => {
    const [px, py] = place(lx, ly, x, y, rot, s);
    out.push(lShape({ ...sh, x: px, y: py, rot }));
  };
  for (const u of [-CAR.wheel, CAR.wheel]) part(u, CAR.h / 2, { kind: 'ellipse', w: 2 * CAR.wheelR * s, h: 2 * CAR.wheelR * s, color: P.cream, outline: 5 * s, outlineColor: P.ink });
  part(0, 0, { kind: 'rect', w: CAR.w * s, h: CAR.h * s, r: (CAR.h / 2) * s, color: P.ink });
  part(0, -4, { kind: 'rect', w: (CAR.w - 60) * s, h: 14 * s, r: 3 * s, color: P.yellow });
}

// ——— The keys' icons ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** ⧗ (the easy-ease icon): two triangles tip to tip, 34 × 44 at scale 1 (layout px about its centre). */
const HOURGLASS: readonly (readonly V2[])[] = [
  [
    [-17, -22],
    [17, -22],
    [0, 0],
  ],
  [
    [-17, 22],
    [0, 0],
    [17, 22],
  ],
];
/**
 * A key's icons at (x, y), one per drum (◆ kick yellow, ⧗ clap violet, ● hat mint, side by side 46 apart), 4 px ink outlines, a (6, 6)
 * ink shadow; scale s (layout px of the world or of the screen, as the caller places them). `shadow` is the shadow's offset there.
 */
function keyIcons(L: GraphLayer, x: number, y: number, drums: number, s: number, shadow: V2): void {
  const bits = [1, 2, 4].filter((b) => drums & b);
  bits.forEach((b, j) => {
    const cx = x + (j - (bits.length - 1) / 2) * 46 * s;
    if (b === 1) {
      const d = 24 * Math.SQRT2 * s;
      L.under.push(lShape({ kind: 'rect', x: cx + shadow[0], y: y + shadow[1], w: d + 8 * s, h: d + 8 * s, rot: 45, color: P.ink }));
      L.under.push(lShape({ kind: 'rect', x: cx, y, w: d + 8 * s, h: d + 8 * s, rot: 45, color: P.yellow, outline: 4 * s, outlineColor: P.ink }));
    } else if (b === 4) {
      L.under.push(lShape({ kind: 'ellipse', x: cx + shadow[0], y: y + shadow[1], w: 44 * s, h: 44 * s, color: P.ink }));
      L.under.push(lShape({ kind: 'ellipse', x: cx, y, w: 44 * s, h: 44 * s, color: P.mint, outline: 4 * s, outlineColor: P.ink }));
    } else {
      sticker(L.polys, HOURGLASS.map((t) => t.map(([px, py]) => [cx + px * s, y + py * s] as V2)), P.violet, 4 * s, shadow);
    }
  });
}

// ——— The world ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A key's hex chip hangs this far under its key (world px): he rides 138 over the rail and his face fills the 160 px above it, so a chip
 * over the key (the design's 70) sat behind him exactly when it popped for him. Under the rail it is clear of him and of the train.
 */
const CHIP_DROP = 84;

/** Graph paper: lines every `sx` world px of x and every `sy` of y (from the rail's base), `widthPx` on screen, ink at `alpha`. */
function graphPaper(out: Shape[], c: BreakCam, sx: number, sy: number, widthPx: number, alpha: number): void {
  const r = viewRect(c, 40);
  const w = widthPx / c.zoom;
  for (let x = Math.ceil(r.x0 / sx) * sx; x <= r.x1; x += sx) out.push(lShape({ kind: 'rect', x, y: (r.y0 + r.y1) / 2, w, h: r.y1 - r.y0, color: P.ink, alpha }));
  for (let j = Math.ceil((TRACK.base - r.y1) / sy); TRACK.base - j * sy >= r.y0; j++) out.push(lShape({ kind: 'rect', x: (r.x0 + r.x1) / 2, y: TRACK.base - j * sy, w: r.x1 - r.x0, h: w, color: P.ink, alpha }));
}

/** A thick polyline (round joints: capsules) in `color`, `width` world px. */
function ribbon(out: Shape[], pts: readonly V2[], width: number, color: RGB, alpha?: number): void {
  for (let i = 1; i < pts.length; i++) push(out, lSegment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], width, color, alpha));
}
/** The rails: a 26 px cream band between 6 px rails (`edge`), along `pts`. */
function rails(out: Shape[], pts: readonly V2[], edge: RGB): void {
  ribbon(out, pts, 38, edge);
  ribbon(out, pts, 26, P.cream);
}

/** The visible rail (world x from a to b), sampled every `step` px of arc. */
function railPoints(a: number, b: number, step: number): V2[] {
  if (b <= a) return [];
  const s0 = arcOfX(a);
  const s1 = arcOfX(b);
  const pts: V2[] = [];
  for (let s = s0; s < s1; s += step) {
    const x = xOfArc(s);
    pts.push([x, railAtX(x)]);
  }
  pts.push([b, railAtX(b)]);
  return pts;
}
const slopeAtX = (x: number): number => (railAtX(x + 1) - railAtX(x - 1)) / 2;

/**
 * The bottoms' impacts (on the backbeats, from the beat frame's shutter opening), behind his car: an ink shockwave ring out of the bottom
 * key (7 px on screen, 170 → 690 px in 10 frames — born round the car's ends — fading from the 4th), and 16 sparks thrown off the rails
 * (ink, with a white or yellow core), already clear of the car on the beat frame.
 */
function impacts(out: Shape[], f: number, c: BreakCam): void {
  for (const { x, y, e } of impactsAt(f)) {
    const R = 170 + 520 * ease.outCubic(e / 10);
    if (e < 10) out.push(lShape({ kind: 'ring', x, y, w: 2 * R, h: 2 * R, r: 7 / c.zoom, color: P.ink, alpha: 1 - clamp((e - 4) / 6) }));
    for (let i = 0; i < 16; i++) {
      const h = (k: number) => {
        const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        return v - Math.floor(v);
      };
      // Up and out of the valley, both ways (the plunge's side and the climb's), a few skidding along the rail.
      const an = i % 5 ? -Math.PI / 2 + (i % 2 ? -1 : 1) * (0.35 + 0.9 * h(7)) : (i % 2 ? Math.PI : 0) - 0.15 * h(5);
      const d = 150 + (60 + 260 * h(9)) * (1 - (1 - e / 10) ** 2);
      const l = (50 + 70 * h(8)) * (1 - e / 11);
      const sx = x + Math.cos(an) * d;
      const sy = y + Math.sin(an) * d;
      push(out, lSegment(sx, sy, sx + Math.cos(an) * l, sy + Math.sin(an) * l, 13, P.ink));
      push(out, lSegment(sx, sy, sx + Math.cos(an) * l, sy + Math.sin(an) * l, 6, i % 2 ? P.yellow : P.white));
    }
  }
}

/** The lift hill's ratchet: an ink "clack" of three strokes off the car's tail on each chain click (5 frames), riding with the car. */
function clacks(out: Shape[], f: number): void {
  for (const c of CHAIN_CLICKS) {
    const e = f - c;
    if (e < 0 || e >= 5) continue;
    const x = playX(f) - 150;
    const y = railAtX(playX(f)) + 10;
    for (let i = 0; i < 3; i++) {
      const an = -Math.PI / 2 + (i - 1) * 0.6 - 0.5;
      const r0 = 24 + 6 * e;
      push(out, lSegment(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * (r0 + 22), y + Math.sin(an) * (r0 + 22), 6, P.ink));
    }
  }
}

/** A screen-px vector (x, y down) as a world vector under camera c. */
const screenVec = (c: BreakCam, v: V2): V2 => {
  const [x, y] = rotate(v[0], v[1], -c.roll);
  return [x / c.zoom, y / c.zoom];
};

/**
 * The track at instant f under camera c (the group on a short shutter through the ride: groupShutter, TRACK_SHUTTER): the paper
 * (back), the track, its keys and chips and the rewind's hook (world), the ratchet's clacks and the segment labels (top).
 */
function trackLayers(f: number, c: GraphCam): { back: GraphLayer; world: GraphLayer; top: GraphLayer } {
  const back = layer();
  const world = layer();
  const top = layer();
  // The paper: the 16ths and every 0x10 a little behind the track (×0.9), the beats and every 0x40 with it.
  graphPaper(back.under, { ...c, zoom: c.zoom * 0.9 }, 6 * TRACK.pxPerFrame, 16 * TRACK.valuePx, 2, 0.07);
  graphPaper(world.under, c, 24 * TRACK.pxPerFrame, 64 * TRACK.valuePx, 3, 0.16);

  const r = viewRect(c, 120);
  const H = hookAt(f);
  const end = H ? KEYS[8].x : KEYS[9].x;
  const xa = Math.max(r.x0, TRACK.leadIn);
  const xb = Math.min(r.x1, end);
  const sh6 = shadowOf(c, 6);
  // The rattle's jolt: the elastic section of the track knocked with his car (screen px → world), tapering into the rest of the rail.
  const J = screenVec(c, joltAt(f));
  const jp = (x: number, y: number): V2 => {
    const w = joltWeight(x);
    return [x + J[0] * w, y + J[1] * w];
  };

  // The supports: a column every 192 px from the rail down off the frame, a light brace across each bay (structure, not subject).
  for (let x = Math.ceil(xa / 192) * 192; x <= xb; x += 192) {
    const [jx, jy] = jp(x, railAtX(x));
    if (x + 192 <= end) push(world.under, lSegment(jx, jy + 70, x + 192, railAtX(x + 192) + 300, 4, P.ink, 0.45));
    push(world.under, lSegment(jx, jy + 16, jx, r.y1 + 40, 7, P.ink));
  }
  // The rails (the curve's last segment red-edged once the cursor has selected it), then the ties (yellow, every TIE_PITCH px of arc).
  const pts = railPoints(xa, xb, 10).map(([x, y]) => jp(x, y));
  const sel = selectedAt(f);
  const k9x = KEYS[8].x;
  const plain = sel ? pts.filter(([x]) => x <= k9x + 10) : pts;
  const red = sel ? pts.filter(([x]) => x >= k9x - 10) : [];
  ribbon(world.under, plain, 38, P.ink);
  ribbon(world.under, red, 38, P.red);
  ribbon(world.under, pts, 26, P.cream);
  if (xb > xa) {
    for (let s = Math.ceil(arcOfX(xa) / TIE_PITCH) * TIE_PITCH; s <= arcOfX(xb); s += TIE_PITCH) {
      const x = xOfArc(s);
      const [tx, ty] = jp(x, railAtX(x));
      world.under.push(lShape({ kind: 'rect', x: tx, y: ty, w: 14, h: 50, rot: (Math.atan(slopeAtX(x)) * 180) / Math.PI, color: P.yellow, outline: 3, outlineColor: P.ink }));
    }
  }
  // After the last key the curve holds its value: a dashed ink extrapolation (until the rewind takes k10 away).
  if (!H && r.x1 > KEYS[9].x) {
    const y = railY(KEYS[9].frame);
    for (let x = KEYS[9].x + 40; x < r.x1; x += 40) push(world.under, lSegment(x, y, Math.min(x + 22, r.x1), y, 5, P.ink, 0.45));
  }
  // The rewind: the curve k9 → k10 it replaced, as a dashed ghost, and the red easeInBack hook.
  if (H) {
    const k9 = KEYS[8];
    const k10 = KEYS[9];
    for (let t = 0; t < 1; t += 0.08) {
      const a = k9.frame + t * (k10.frame - k9.frame);
      const b = k9.frame + Math.min(1, t + 0.045) * (k10.frame - k9.frame);
      push(world.under, lSegment((a - GRAPH.from) * 24, railY(a), (b - GRAPH.from) * 24, railY(b), 5, P.ink, 0.4));
    }
    rails(world.under, Array.from({ length: 41 }, (_, i) => bezierAt(H, i / 40)), P.red);
  }
  // The keys: handles (96 px ink, white grips), the drum icons (popping 1.35× as he passes; the crest's 1.6× with an ink ring), the hex
  // chips (screen-sized type), and the click's red ring round k10.
  KEYS.forEach((k: Key, i: number) => {
    const [x, y] = i === 9 && H ? H[3] : jp(...keyPoint(i));
    if (i < 9 || !H) {
      push(world.under, lSegment(x - 96, y, x + 96, y, 3, P.ink));
      for (const gx of [x - 96, x + 96]) world.under.push(lShape({ kind: 'ellipse', x: gx, y, w: 17, h: 17, color: P.white, outline: 3, outlineColor: P.ink }));
    }
    const e = f - k.frame;
    const crest = i === 4 ? crestPopAt(f) : null;
    if (crest) world.under.push(lShape({ kind: 'ring', x, y, w: 2 * crest.r, h: 2 * crest.r, r: 7 / c.zoom, color: P.ink, alpha: crest.alpha }));
    if (i === 9 && sel) world.under.push(lShape({ kind: 'ring', x, y, w: 84, h: 84, r: 6 / c.zoom, color: P.red }));
    keyIcons(world, x, y, k.drums, crest ? crest.s : 1 + (e >= 0 && e < 6 ? 0.35 * (1 - e / 6) : 0), sh6);
    const chip = chipAt(i, f);
    if (chip) textBox(world, k.byte, x, y + CHIP_DROP, chip.s, chip.sy, P.ink, CHIP_PX / c.zoom, shadowOf(c, 4));
  });

  // Over the track: the ratchet's clacks, the segment labels.
  clacks(top.under, f);
  for (const l of labelsAt(f)) {
    if (l.rot === 0) textBox(top, l.text, l.x, l.y, l.s, l.sy, l.red ? P.red : P.ink, 26, shadowOf(c, 4));
    else workOrderLabel(top, l.text, l.x, l.y, l.s, l.rot, c);
  }
  return { back, world, top };
}
/**
 * The ties' pitch along the rail (world px of arc; review round 2, G-1). The world scrolls 24 px a frame along x, so along the rail a tie
 * moves 24 / cos(slope) a frame: at the design's 48 that is half the pitch on the flats (Nyquist: the ladder's direction reads either
 * way) and more on any slope (it reads backwards). At 72 a tie steps a third of the pitch on the flats and under half up to 48° — the
 * plunges' steep last frames are smeared by the track's shutter instead.
 */
export const TIE_PITCH = 72;
/** The hex chips' type on screen (px): JetBrains Mono Bold, full ink (round 1 F3: 28 world px read 25–33 and blurred). */
const CHIP_PX = 28;

/** The bottoms' impacts at instant f (the sparks keep the shutter): over the track, under the train and him. */
function fxLayer(f: number, c: GraphCam): GraphLayer {
  const fx = layer();
  impacts(fx.under, f, c);
  // C7's colour carry (I-6): the value axis flung across the frame behind him — a screen-fixed violet sheet from x 0 to its edge, led by
  // a 3 px ink edge and a 6 px ink shadow, placed in the world through this instant's camera (it is level from the yank on).
  const w = axisFlingAt(f);
  if (w) {
    const rect = (x0: number, x1: number, color: RGB): void => {
      const [cx, cy] = fromScreen(c, (x0 + x1) / 2, 540);
      fx.under.push(lShape({ kind: 'rect', x: cx, y: cy, w: (x1 - x0) / c.zoom, h: 1400 / c.zoom, rot: -c.roll, color }));
    };
    rect(-120, w.x + 9, P.ink);
    rect(-120, w.x, P.violet);
    const s = flungStreaksAt(f);
    if (s) flungStreaks(fx, f, c, w.x - 3, s);
    rect(w.x - 3, w.x, P.ink);
  }
  return fx;
}

/** The sling side's ground streak tones (src/shots/breakLaunch.ts STREAK_TONES: the violet ground's two tints and the torn chrome's). */
const STREAK_TONES: Readonly<Record<GroundStreak['tone'], RGB>> = { light: linear('#D6C8FE'), dark: linear('#7552E8'), cream: P.cream, mint: P.mint, yellow: P.yellow, ink: P.ink };
/** The axis's hex labels as they ride the flung panel: every AXIS_STREAK.gap px along each of its tick rows, at AXIS_STREAK.px type. */
const AXIS_STREAK = { gap: 330, px: 26, tick: 22 } as const;
let flungRows: { y: number; label: string }[] | null = null;
/** The value axis's tick rows on screen at the fling's launch (the camera is level from the yank on): those inside the frame. */
function axisRows(): { y: number; label: string }[] {
  if (flungRows) return flungRows;
  const c = graphCam(FLUNG);
  flungRows = EDITOR_TEXTS.axis
    .map((label, i) => ({ label, y: toScreen(c, 0, TRACK.base - [0, 64, 128, 192, 255][i] * TRACK.valuePx)[1] }))
    .filter((r) => r.y > 60 && r.y < 1020);
  return flungRows;
}
/**
 * C7's whip on the flung panel (FLUNG_STREAKS; review round 2): the ground streaks and the speed lines, drawn as the sling side draws
 * them (the streaks' three soft widths; screen-placed through this instant's camera, rushing right GROUND_SPEED / TRAIL_SPEED px a frame
 * from the same places), and the axis's ticks and hex labels streaming with them — all clipped to the panel (screen x < edge).
 */
function flungStreaks(fx: GraphLayer, f: number, c: GraphCam, edge: number, s: { ground: number; axis: number }): void {
  const t0 = f - WHIP_CUT;
  const seg = (x0: number, x1: number, y: number, w: number, color: RGB, alpha: number): void => {
    const a = Math.min(x1, edge);
    if (a <= x0) return;
    const [ax, ay] = fromScreen(c, x0, y);
    const [bx, by] = fromScreen(c, a, y);
    push(fx.under, lSegment(ax, ay, bx, by, w / c.zoom, color, alpha));
  };
  for (const [wk, ak] of [[2.6, 0.18], [1.6, 0.35], [1, 1]] as const) {
    for (const t of GROUND_STREAKS) {
      if (t.tone === 'ink' && ak < 1) continue;
      const head = t.x + t.len + GROUND_SPEED * t0;
      seg(head - t.len, head, t.y, t.w * wk, STREAK_TONES[t.tone], t.a * ak * s.ground);
    }
  }
  // The sling side's speed lines (TRAIL: cream dashes with ink edges at TRAIL_SPEED), coming in with the ground's streaks.
  for (const [extra, color] of [[12, P.ink], [0, P.cream]] as const) {
    for (const t of TRAIL) {
      const head = t.x + t.len + TRAIL_SPEED * t0;
      seg(head - t.len, head, t.y, t.w + extra, color, s.ground);
    }
  }
  const move = GROUND_SPEED * (f - FLUNG);
  for (const r of axisRows()) {
    for (let x = 120 - AXIS_STREAK.gap + (move % AXIS_STREAK.gap); x < edge - 20; x += AXIS_STREAK.gap) {
      seg(x + 30, x + 30 + AXIS_STREAK.tick, r.y, 3, P.ink, s.axis);
      if (x + 26 < edge) {
        const [gx, gy] = fromScreen(c, x, r.y);
        monoText(fx.glyphs.mono, r.label, gx, gy, { size: AXIS_STREAK.px / c.zoom, color: P.ink, align: 0.5, alpha: s.axis });
      }
    }
  }
}

/** The train at instant f: his four copies in their cars, farthest first; the cars, then every copy's shadow, then every copy's body. */
function trainLayer(f: number, c: GraphCam): GraphLayer {
  const train = layer();
  const cars = trainAt(f);
  const trainShadow: Glyph[] = [];
  const trainBody: Glyph[] = [];
  for (let i = cars.length - 1; i >= 0; i--) {
    const t = cars[i];
    const spin = (t.spin * 180) / Math.PI;
    car(train.under, t.x, t.y, (t.th * 180) / Math.PI + spin, 0.5);
    faceSticker(trainShadow, trainBody, '(•ω•)', {
      x: t.face[0],
      y: t.face[1],
      em: RIDE_EM / 2,
      sx: 1,
      sy: 1,
      rot: clamp(((t.th * 180) / Math.PI) * 0.6, -50, 50) + spin,
      fill: P[TRAIN_COLORS[i]],
      outlinePx: 4,
      shadowPx: 8,
      cam: c,
    });
  }
  train.glyphs.hero = [...trainShadow, ...trainBody];
  return train;
}

/**
 * Him at instant f (the group on a short shutter from the second bottom, one sharp instant from full draw: groupShutter): k10's handles stretched into a V behind
 * him, his car, him (jolted with the rattle), the rattle's marks, and T9 under the dragged key.
 */
function heroLayer(f: number, c: GraphCam): GraphLayer {
  const hero = layer();
  // k10's handles, stretched into a V behind him (the slingshot's cords to be): ink, white grips pinned at k10's old place.
  const v = cordsAt(f);
  if (v) {
    for (const g of v.grips) push(hero.under, lSegment(v.anchor[0], v.anchor[1], g[0], g[1], 7, P.ink));
    for (const g of v.grips) hero.under.push(lShape({ kind: 'ellipse', x: g[0], y: g[1], w: 20, h: 20, color: P.white, outline: 3, outlineColor: P.ink }));
  }
  // His car (it pops in under him on the cut, about his ω), then him.
  const J = screenVec(c, joltAt(f));
  const h0 = heroAt(f);
  const h = { ...h0, x: h0.x + J[0], y: h0.y + J[1] };
  const k = carAt(f);
  const thDeg = (k.th * 180) / Math.PI;
  const [px, py] = omegaAt(f);
  car(hero.under, px + J[0] + (k.x - px) * k.s, py + J[1] + (k.y + k.jerk - py) * k.s, thDeg, k.s);
  const shadow: Glyph[] = [];
  const body: Glyph[] = [];
  faceSticker(shadow, body, h.face, { x: h.x, y: h.y, em: h.em, sx: h.sx, sy: h.sy, rot: h.rot, fill: P.amber, outlinePx: 7, shadowPx: 14, cam: c });
  rattleMarks(hero.under, f, h, c);
  hero.glyphs.hero = [...shadow, ...body];
  t9(hero, f);
  return hero;
}

/** Everything the world layers draw at instant f under camera c (all at the one instant: the tests' view). */
function worldLayers(f: number, c: GraphCam): { back: GraphLayer; world: GraphLayer; fx: GraphLayer; train: GraphLayer; hero: GraphLayer; top: GraphLayer } {
  return { ...trackLayers(f, c), fx: fxLayer(f, c), train: trainLayer(f, c), hero: heroLayer(f, c) };
}

/**
 * The elastic rattle's vibration marks (comic): two ink ticks either side of his face, re-drawn each output frame a few px off (they
 * judder), screen-sized (8 px). His face stays put through the rattle (the camera holds him) — these, the eye swaps and the world are what
 * shake.
 */
function rattleMarks(out: Shape[], f: number, h: { face: string; x: number; y: number; em: number; rot: number }, c: BreakCam): void {
  if (f < RATTLE.from || f >= RATTLE.to) return;
  const o = frameOf(f);
  const j = o % 2 ? 1 : -1;
  const half = (faceLayout(h.face).reduce((m, g) => Math.max(m, Math.abs(g.dx)), 0) + 0.45) * h.em;
  const w = 8 / c.zoom;
  for (const side of [-1, 1]) {
    for (const k of [0, 1]) {
      const lx = side * (half + (18 + 22 * k) / c.zoom);
      const ly = (-0.22 + 0.36 * k) * h.em + (j * 4) / c.zoom;
      const len = (0.34 - 0.08 * k) * h.em;
      const tilt = side * (k ? 14 : -14) + j * 6;
      const [ax, ay] = place(lx, ly - len / 2, h.x, h.y, h.rot);
      const [bx, by] = place(lx + Math.sin((tilt * Math.PI) / 180) * len, ly + len / 2, h.x, h.y, h.rot);
      push(out, lSegment(ax, ay, bx, by, w, P.ink));
    }
  }
}

/** The torn red easeInBack label (whipped away from the hook on the fling): a white box with red text, turned. */
function workOrderLabel(L: GraphLayer, text: string, x: number, y: number, s: number, rot: number, c: BreakCam): void {
  const w = monoWidth(text, 26) + 24;
  const [shx, shy] = shadowOf(c, 4);
  L.under.push(lShape({ kind: 'rect', x: x + shx, y: y + shy, w: w * s, h: 40 * s, rot, color: P.ink }));
  L.under.push(lShape({ kind: 'rect', x, y, w: w * s, h: 40 * s, rot, color: P.white, outline: 3 * s, outlineColor: P.red }));
  monoText(L.glyphs.mono, text, x, y + 1, { size: 26 * s, color: P.red, align: 0.5, rot }, [x, y]);
}

/** T9 #A2 `rewind (•ω•) → 0 ✓` under the dragged key (pops on the rewind, types 3 characters a frame), torn off by the whip on the fling. */
function t9(L: GraphLayer, f: number): void {
  const w = ORDERS[9];
  if (f < w.from || f >= w.to) return;
  const H = hookAt(f);
  if (!H) return;
  const d = H[3];
  const e = f - w.from;
  const torn = Math.max(0, f - FLUNG);
  // Under the dragged key (he sits over it: a tag at his mouth's height hid his Σ(⊙ω⊙)), torn off down-left by the whip.
  // Right of the cursor's grip under the key (GRAB): the antivirus's hand and its order side by side.
  workOrder(L, ORDER_TEXTS[9][0], orderId(9), d[0] + 80 - 260 * torn, d[1] + 52 + 90 * torn, { s: pop(e), rot: -17 * torn, count: Math.floor((e + 1) * 3), alpha: 1 - clamp(torn / 3) });
}

// ——— The chrome (screen) ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** The editor's chrome at instant f (screen layout px): title bar, value axis, ruler, playhead, status line; the cursor at instant `fc`. */
function chromeLayer(f: number, c: GraphCam, fc = f): GraphLayer {
  const L = layer();
  const ch = chromeAt(f);
  const px = c.head;
  // The click's marquee (6.4e → the yank): the dim outside it, C6's ants (4 px red dashes) and handles — over the world, under the panels.
  const sel = selectionAt(f);
  if (sel) {
    const { x0, y0, x1, y1, dim } = sel;
    const black: RGB = [0, 0, 0];
    L.under.push(lShape({ kind: 'rect', x: 960, y: y0 / 2, w: 1920, h: y0, color: black, alpha: dim }));
    L.under.push(lShape({ kind: 'rect', x: 960, y: (y1 + 1080) / 2, w: 1920, h: 1080 - y1, color: black, alpha: dim }));
    L.under.push(lShape({ kind: 'rect', x: x0 / 2, y: (y0 + y1) / 2, w: x0, h: y1 - y0, color: black, alpha: dim }));
    L.under.push(lShape({ kind: 'rect', x: (x1 + 1920) / 2, y: (y0 + y1) / 2, w: 1920 - x1, h: y1 - y0, color: black, alpha: dim }));
    const edge = (ax: number, ay: number, bx: number, by: number): void => {
      const len = Math.hypot(bx - ax, by - ay);
      for (let d = 0; d < len; d += SELECT_DASH[0] + SELECT_DASH[1]) {
        const e = Math.min(len, d + SELECT_DASH[0]);
        push(L.under, lSegment(ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len, ax + ((bx - ax) * e) / len, ay + ((by - ay) * e) / len, 4, P.red));
      }
    };
    edge(x0, y0, x1, y0);
    edge(x1, y0, x1, y1);
    edge(x1, y1, x0, y1);
    edge(x0, y1, x0, y0);
    for (const hx of [x0, (x0 + x1) / 2, x1]) for (const hy of [y0, (y0 + y1) / 2, y1]) if (hx !== (x0 + x1) / 2 || hy !== (y0 + y1) / 2) L.under.push(lShape({ kind: 'rect', x: hx, y: hy, w: 14, h: 14, color: P.white, outline: 3, outlineColor: P.red }));
  }
  // The playhead's line over the graph (under the panels).
  L.under.push(lShape({ kind: 'rect', x: px, y: 520, w: 3, h: 928, color: P.ink, alpha: 0.4 }));

  // Where a world point lands on screen, and where a horizontal (value) or vertical (time) world line crosses a screen line.
  const S = (x: number, y: number): V2 => toScreen(c, x, y);
  const crossX = (worldY: number, screenX: number): number => {
    const a = S(-1e4, worldY);
    const b = S(1e4, worldY);
    return a[1] + ((b[1] - a[1]) * (screenX - a[0])) / (b[0] - a[0] || 1e-9);
  };
  const crossY = (worldX: number, screenY: number): number => {
    const a = S(worldX, -1e4);
    const b = S(worldX, 1e4);
    return a[0] + ((b[0] - a[0]) * (screenY - a[1])) / (b[1] - a[1] || 1e-9);
  };

  // The value axis (violet, x 0–96), sliding in from the left; hex ticks where the 0x40 lines meet it.
  {
    const { dx, rot } = ch.axis;
    const at = (x: number, y: number): V2 => place(x - 48, y - 520, 48 + dx, 520, rot);
    const panel = (x: number, y: number, w: number, h: number, color: RGB) => {
      const [cx, cy] = at(x + w / 2, y + h / 2);
      L.under.push(lShape({ kind: 'rect', x: cx, y: cy, w, h, rot, color }));
    };
    panel(6, 62, 96, 928, P.ink);
    panel(0, 56, 96, 928, P.violet);
    panel(93, 56, 3, 928, P.ink);
    for (const [v, t] of [[0, '00'], [64, '40'], [128, '80'], [192, 'C0'], [255, 'FF']] as const) {
      const y = crossX(TRACK.base - v * TRACK.valuePx, 96);
      if (y < 80 || y > 965) continue;
      panel(78, y - 1.5, 18, 3, P.ink);
      const [tx, ty] = at(42, y);
      monoText(L.glyphs.mono, t, tx, ty, { size: 20, color: P.ink, align: 0.5, rot }, [tx, ty]);
    }
  }
  // The ruler (mint, y 984–1080), rising from the bottom: 16th ticks, beat labels (film bar.beat), the keys' icons, the status line.
  {
    const { dy, rot } = ch.ruler;
    const at = (x: number, y: number): V2 => place(x - 960, y - 1032, 960, 1032 + dy, rot);
    const panel = (x: number, y: number, w: number, h: number, color: RGB, alpha?: number) => {
      const [cx, cy] = at(x + w / 2, y + h / 2);
      L.under.push(lShape({ kind: 'rect', x: cx, y: cy, w, h, rot, color, alpha }));
    };
    panel(6, 990, 1920, 96, P.ink);
    panel(0, 984, 1920, 96, P.mint);
    panel(0, 984, 1920, 3, P.ink);
    const bar = partBar('break', 6);
    for (let k = -8; k <= 24; k++) {
      const x = crossY(k * 6 * TRACK.pxPerFrame, 984);
      if (x < 100 || x > 1915) continue;
      panel(x - 1, 987, 2, k % 4 ? 10 : 20, P.ink);
      if (((k % 4) + 4) % 4 === 0) {
        const beat = Math.floor(k / 4);
        const label = editorBeat(bar + Math.floor(beat / 4), (((beat % 4) + 4) % 4) + 1);
        const [tx, ty] = at(x + 6, 1014);
        monoText(L.glyphs.mono, label, tx, ty, { size: 18, color: P.ink, rot }, [tx, ty]);
      }
    }
    const statusW = monoWidth(chromeStatusFull(f), STATUS_PX) + 28;
    for (const k of KEYS) {
      const x = crossY(k.x, 1044);
      if (x < 110 || x > 1900 - statusW - 30) continue;
      const [ix, iy] = at(x, 1044);
      keyIcons(L, ix, iy, k.drums, 0.42, [3, 3]);
    }
    // The status line: the antivirus talking, as its work orders do — red type on a white tag with a 3 px ink border and a (4, 4)
    // shadow, over the ruler's right end (it covers the icon row there). The tag is sized for the whole line: it does not grow as it types.
    {
      const w = statusW;
      const x0 = 1900 - w;
      panel(x0 + 4, 1030, w, 40, P.ink);
      panel(x0, 1026, w, 40, P.ink);
      panel(x0 + 3, 1029, w - 6, 34, P.white);
      const [sx, sy] = at(x0 + 14, 1047);
      faceBacking(L.under, ch.status, sx, sy, { size: STATUS_PX, rot }, [sx, sy]);
      monoText(L.glyphs.mono, ch.status, sx, sy, { size: STATUS_PX, color: P.red, rot }, [sx, sy]);
    }
    // The playhead's pentagon on the ruler: the beat (no 16ths).
    const head: V2[] = [
      [px - 36, 988],
      [px + 36, 988],
      [px + 36, 1014],
      [px, 1030],
      [px - 36, 1014],
    ].map(([x, y]) => at(x, y));
    sticker(L.polys, [head], P.mint, 3, null);
    const [hx, hy] = at(px, 1004);
    monoText(L.glyphs.mono, ch.beat, hx, hy, { size: 18, color: P.ink, align: 0.5, rot }, [hx, hy]);
  }
  // The title bar (yellow, y 0–56), dropping in: `graph editor · (•ω•).y`, [value] lit, [speed] not.
  {
    const { dy, rot } = ch.title;
    const at = (x: number, y: number): V2 => place(x - 960, y - 28, 960, 28 + dy, rot);
    const panel = (x: number, y: number, w: number, h: number, color: RGB, extra: Partial<Shape> = {}) => {
      const [cx, cy] = at(x + w / 2, y + h / 2);
      L.under.push(lShape({ kind: 'rect', x: cx, y: cy, w, h, rot, color, ...extra }));
    };
    panel(6, 6, 1920, 56, P.ink);
    panel(0, 0, 1920, 56, P.yellow);
    panel(0, 53, 1920, 3, P.ink);
    const [tx, ty] = at(122, 29);
    faceBacking(L.under, EDITOR_TEXTS.title, tx, ty, { size: 24, rot }, [tx, ty]);
    monoText(L.glyphs.mono, EDITOR_TEXTS.title, tx, ty, { size: 24, color: P.ink, rot }, [tx, ty]);
    panel(1600, 12, 124, 34, P.ink);
    panel(1740, 12, 124, 34, P.yellow, { outline: 3, outlineColor: P.ink });
    const [ax, ay] = at(1662, 30);
    monoText(L.glyphs.mono, EDITOR_TEXTS.toggles[0], ax, ay, { size: 22, color: P.yellow, align: 0.5, rot }, [ax, ay]);
    const [bx, by] = at(1802, 30);
    monoText(L.glyphs.mono, EDITOR_TEXTS.toggles[1], bx, by, { size: 22, color: P.ink, align: 0.5, rot }, [bx, by]);
  }
  // The red cursor, over everything.
  const cur = cursorAt(fc);
  if (cur) {
    const pts = CURSOR_SHAPE;
    const head = [pts[0], pts[1], pts[6]];
    const tail = [pts[2], pts[3], pts[4], pts[5]];
    const at = (q: readonly V2[]) => q.map(([x, y]) => place(x, y, cur.x, cur.y, cur.rot, cur.s));
    sticker(L.polysOver, [at(head), at(tail)], P.red, 4, [6, 6]);
  }
  return L;
}
/** The click's marquee's ants: 22 px dashes, 14 px gaps (screen). */
const SELECT_DASH = [22, 14] as const;
const chromeStatusFull = (f: number): string => (f >= REWIND.from ? EDITOR_TEXTS.status[1] : EDITOR_TEXTS.status[0]);
/** The status line's type size (screen px). */
const STATUS_PX = 22;

// ——— The overlay: the selection carried across C6 (screen, per output frame) ——————————————————————————————————————————————————

/** The mono bold advance of 'a' and '0' (the flat world's T8 lays its text out monospaced on them; set by the scene from its atlas). */
let t8Adv = { a: 0.6, zero: 0.6 };
export const setT8Advance = (o: { a: number; zero: number }): void => {
  t8Adv = o;
};

/**
 * The red marquee and T8 on output frame `frame`, drawn exactly as the flat world draws them on 5.4& (src/scenes/breakFlat.ts
 * screenOverlay, from src/shots/breakDefender.ts selectMarquee / selectChip — the same functions, so C6 is pixel for pixel): the 15 % dim
 * outside it, the ants (4 px red, marching on), the 14 px handles, and T8 `select (•ω•) · threats 2` (#80), monospaced, red on its white
 * tag. From the cut it shrinks with him about his ω on screen (UI line widths stay put) and folds away with T8 (marqueeAt).
 */
export function selectionLayer(frame: number): GraphLayer | null {
  const m = marqueeAt(frame);
  const sel = selectMarquee(frame);
  if (!m || !sel || m.alpha <= 0) return null;
  const L = layer();
  const a = m.alpha;
  const T = (p: V2): V2 => [m.about[0] + (p[0] - 960) * m.s, m.about[1] + (p[1] - 540) * m.s];
  // The dim, round the (shrinking) rect.
  if (sel.dim > 0) {
    const black: RGB = [0, 0, 0];
    const { x0, y0, x1, y1 } = m;
    L.under.push(lShape({ kind: 'rect', x: 960, y: y0 / 2, w: 1920, h: y0, color: black, alpha: sel.dim * a }));
    L.under.push(lShape({ kind: 'rect', x: 960, y: (y1 + 1080) / 2, w: 1920, h: 1080 - y1, color: black, alpha: sel.dim * a }));
    L.under.push(lShape({ kind: 'rect', x: x0 / 2, y: (y0 + y1) / 2, w: x0, h: y1 - y0, color: black, alpha: sel.dim * a }));
    L.under.push(lShape({ kind: 'rect', x: (x1 + 1920) / 2, y: (y0 + y1) / 2, w: 1920 - x1, h: y1 - y0, color: black, alpha: sel.dim * a }));
  }
  for (const [p, q] of sel.dashes) {
    const [ax, ay] = T(p);
    const [bx, by] = T(q);
    push(L.under, lSegment(ax, ay, bx, by, 4, P.red, a));
  }
  for (const h of sel.handles) {
    const [x, y] = T([h.x, h.y]);
    L.under.push(lShape({ kind: 'rect', x, y, w: 14 * h.s, h: 14 * h.s, color: P.white, alpha: a, outline: 3, outlineColor: P.red }));
  }
  // T8, as the flat world lays it out (ORDER_TAG; monospaced on the bold mono's 'a'), at the rect's top-left − 48, folding (sy = alpha).
  const chip = selectChip(frame);
  if (chip) {
    const O = ORDER_TAG;
    const [tx, ty] = T([chip.x, chip.y + 48]);
    const x = tx;
    const sy = a;
    const cw = t8Adv.a * O.size;
    const w = [...chip.full].length * cw + O.tail;
    const cy = ty - 48 + (O.h / 2) * sy;
    L.under.push(lShape({ kind: 'rect', x: x + w / 2 + O.shadow, y: cy + O.shadow, w, h: O.h * sy, r: 2, color: P.ink, alpha: a }));
    L.under.push(lShape({ kind: 'rect', x: x + w / 2, y: cy, w, h: O.h * sy, r: 2, color: P.white, alpha: a, outline: O.border, outlineColor: P.ink }));
    L.under.push(lShape({ kind: 'rect', x: x + w - O.chip.right - O.chip.w / 2, y: cy, w: O.chip.w, h: O.chip.h * sy, r: 2, color: P.ink, alpha: a }));
    [...chip.text].forEach((ch, k) => {
      if (ch !== ' ') L.glyphs.mono.push(lGlyph({ ch, x: x + O.pad + (k + 0.5) * cw, y: cy, size: O.size * sy, stretch: 1 / sy, color: P.red, alpha: a }));
    });
    const icw = t8Adv.zero * O.chip.size;
    [...chip.id].forEach((ch, k) =>
      L.glyphs.mono.push(lGlyph({ ch, x: x + w - O.chip.right - O.chip.w / 2 + (k - (chip.id.length - 1) / 2) * icw, y: cy, size: O.chip.size * sy, stretch: 1 / sy, color: P.white, alpha: a })),
    );
  }
  return L;
}

/** The screen overlay on output frame `frame`: the selection, from the cut until it has folded away (6.1&). */
export function graphOverlay(frame: number): GraphLayer | null {
  return selectionLayer(frame);
}

// ——— The frame ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Everything the graph draws at instant f (the camera, the world's six layers, the chrome), all at that one instant. */
export type GraphFrame = { cam: GraphCam; back: GraphLayer; world: GraphLayer; fx: GraphLayer; train: GraphLayer; hero: GraphLayer; top: GraphLayer; chrome: GraphLayer };
export function graphFrame(f: number): GraphFrame {
  const cam = graphCam(f);
  return { cam, ...worldLayers(f, cam), chrome: chromeLayer(f, cam) };
}
/**
 * What the scene draws for sub-frame instant f: each group at its own instant (groupAt) under its own camera — the track (back, world,
 * top) and him (hero) on their short shutters or one sharp instant where groupShutter says so, the cursor and the world (train, sparks)
 * too; the panels at f. `instant` / `cams` say which instant and camera each group took.
 */
export type GraphDraw = GraphFrame & { instant: { track: number; hero: number; cursor: number; world: number }; cams: { track: GraphCam; hero: GraphCam; world: GraphCam } };
export function graphDraw(f: number): GraphDraw {
  const cam = graphCam(f);
  const ft = groupAt('track', f);
  const fh = groupAt('hero', f);
  const fc = groupAt('cursor', f);
  const fw = groupAt('world', f);
  const camAt = (g: number): GraphCam => (g === f ? cam : graphCam(g));
  const camT = camAt(ft);
  const camH = camAt(fh);
  const camW = camAt(fw);
  return {
    cam,
    ...trackLayers(ft, camT),
    fx: fxLayer(fw, camW),
    train: trainLayer(fw, camW),
    hero: heroLayer(fh, camH),
    chrome: chromeLayer(f, cam, fc),
    instant: { track: ft, hero: fh, cursor: fc, world: fw },
    cams: { track: camT, hero: camH, world: camW },
  };
}

/** The strings the graph draws in JetBrains Mono (the scene builds its mono atlas from their characters; all listed in BREAK_TEXTS_V2). */
export const GRAPH_MONO_STRINGS: readonly string[] = [
  EDITOR_TEXTS.title,
  ...EDITOR_TEXTS.toggles,
  ...EDITOR_TEXTS.axis,
  ...EDITOR_TEXTS.status,
  ...EDITOR_TEXTS.labels,
  editorBeat(partBar('break', 6), 1) + '0123456789.-',
  ...KEYS.map((k) => k.byte),
  ORDER_TEXTS[8][0],
  ORDER_TEXTS[9][0],
  orderId(8),
  orderId(9),
];
/** The faces the graph draws in his type: his seven (HERO_FACES_V2's coaster faces) and his copies' (•ω•). */
export const GRAPH_HERO_STRINGS: readonly string[] = [HERO_FACES_V2.seated, HERO_FACES_V2.armsUp, HERO_FACES_V2.lift, HERO_FACES_V2.airtime, ...HERO_FACES_V2.rattle, HERO_FACES_V2.rewound, '(•ω•)'];
