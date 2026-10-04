// Break bar 1, the glass falling into the paint (src/score/break.ts FALL), as pure functions of the frame. Build sheet
// notes/break/break-sheet.md §3 break bar 1, §4.3–§4.5, §7.1 and Appendix B. Owned by the fall builder; the flat world imports
// PIECE_LANDING, FACE_LANDING and shardAt() read-only (the hand-off on break 2.1 and E2's shard until it is home on 2.3).
//
// The cracked screen of drop 1's last frame lets go a pane at a time: each piece of real glass hinges off its top edge, falls (gravity) tumbling
// and lands in a rising pool of cream paint, where it becomes a flat colour polygon with an ink outline and a hard shadow; the paint
// fills the frame by break 1.4a + 3. On 1.4 his face lets go — all but cell 37, the shard with his left ×, which stays frozen on *our* side of
// the screen (E2) — and its 35 pieces slap flat on break 2.1, where the flat world takes them over.
//
// Conventions: positions are the sheet's layout px (1920 × 1080, origin top-left, y down) and its angles are degrees, clockwise-positive
// on screen, unless a name says `engine` (origin at the centre, y up, radians counter-clockwise — what three.js and the flat engine use).
// It reuses src/shots/glass.ts (SHARDS, glassFrame, decalUV, DECAL_Z, SHARD_DEPTH) by importing it, never by editing it. Plain Node
// imports it (tests): no three / remotion / react imports.
import { CHIP_REPAIR, CURSOR } from '../content/break.ts';
import { linear } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { ease } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { BREAK_START, CHIPS, CHIPS_UP, FACE_FALL, FALL, KNOCKS, MATCH_CUT, MONITOR_FALL, P1_GLINT, PIECE_FALLS, SHARD_FLIGHT, SHARD_STAYS } from '../score/break.ts';
import { BURST } from '../score/drop1.ts';
import { heldFrame, partFrame, seedFrame } from '../score/film.ts';
import { SHARDS } from './glass.ts';
import { HUD, RAMP, WARNINGS, hudContent } from './hud.ts';
import { BREAK_HEX, BREAK_LOOK as SHARED_LOOK, breakCam, flow, launchL, toScreen } from './breakShared.ts';
import { CLUB_BLOOM } from './lines.ts';

export type V2 = readonly [number, number];
/** The break's bar `bar` (1-based) plus `beat` beats (0-based, may be fractional), as a film frame. */
const brk = (bar: number, beat = 0): number => partFrame('break', bar, beat);

/** Engine (centre origin, y up) → layout (top-left origin, y down) px, and back. */
export const toLayout = (p: readonly number[]): V2 => [p[0] + 960, 540 - p[1]];
export const toEngine = (p: readonly number[]): V2 => [p[0] - 960, 540 - p[1]];

// ——— Which cell is which (§4.3) ———————————————————————————————————————————————————————————————————————————————————————————————————

/** The face cells by the glyph they carry; a fixed list (cells 16 and 36 count whatever the ink mask says), so the tables hold. */
export const FACE = {
  omega: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 24, 25, 26, 27, 28],
  eyeL: [21, 22, 23, 36, 37, 38],
  eyeR: [29, 30, 44],
  open: [51, 52, 53],
  close: [45, 59],
} as const;
export const FACE_CELLS: readonly number[] = Object.values(FACE).flat();
/** E2: the shard that carries his left × (its centre (625, 545) lies in it) stays on our side of the screen. */
export const E2_CELL = 37;
/** The face's core — ω, ×L (but the E2 shard), ×R — falls round (960, 600); the brackets fly off as two units. */
export const CORE_CELLS: readonly number[] = [...FACE.omega, ...FACE.eyeL.filter((k) => k !== E2_CELL), ...FACE.eyeR];
/**
 * His ω is the identity mark that must read in every frame (review R1-01): its 22 cells — rings 0 and 1 round the hit, the
 * finest pieces of the crack — fall as one cracked plate and land spread only ×1.05 about (960, 600), turned 1–3°, never flipped, so
 * it arrives as a cracked ω while the eyes and brackets scatter (the sheet's ×1.3, jitter and tumbles stay theirs).
 */
export const OMEGA_SPREAD = 1.05;
const OMEGA: ReadonlySet<number> = new Set(FACE.omega);
/** The ω plate's tilt out of the plane on its way down (degrees, out and back): enough to catch the light, never enough to blur the ω. */
const PLATE_TILT = 8;
/** Cells wholly off the frame: they let go silently with the last cascade and are never drawn. */
export const OFF_FRAME_CELLS: readonly number[] = [62, 63, 64, 70, 71, 72];

// ——— The blank pieces: release, fall, landing (§4.3, Appendix B) ————————————————————————————————————————————————————————————————————

export type Paint = 'violet' | 'yellow' | 'coral' | 'mint';
/** The four paints, by the quadrant of a piece's centroid about the hit (counter-clockwise on screen from 3 o'clock). */
export const PAINT_HEX: Readonly<Record<Paint, string>> = { violet: BREAK_HEX.violet, yellow: BREAK_HEX.yellow, coral: BREAK_HEX.coral, mint: BREAK_HEX.mint };
const QUADRANTS: readonly Paint[] = ['violet', 'yellow', 'coral', 'mint'];

export type FallClass = 'single' | 'crumble' | 'card';

/** A blank piece of glass: when it lets go and lands, where from and to (centroids, layout px), how it lands turned, how it falls. */
export type Piece = {
  k: number;
  /** Its release group: P1–P4 (singles), C1–C4 (crumbles), K1–K8 (cascades of cards). */
  group: string;
  cls: FallClass;
  paint: Paint;
  /** Frames: it lets go (a tink), it lands (a plip). */
  release: number;
  land: number;
  /** Release index 0 … 32 over the visible blank cells. */
  order: number;
  from: V2;
  to: V2;
  /** Landed rotation, degrees clockwise. */
  angle: number;
  /** Never mirrored: every piece lands face up (the §7.1 contract: its outline turned by its angle). Kept for the hand-off's shape. */
  mirrored: boolean;
  /** Equal-area radius (px) and its cream splat's radius (1.6 ×). */
  radius: number;
  splat: number;
  /** Glass thickness (px), transmission, and tumble amplitude: fat refracting glass first, paper cards last. */
  thickness: number;
  transmission: number;
  tumble: number;
};

/**
 * The release groups. P1 is cell 33, the pane right above his face (iteration 2, ruling 1: the first thing to move on break 1.1 falls across
 * his face, not in the top-right corner, where cell 46 — now a K6 card — used to let go first).
 */
const GROUP_CELLS: readonly (readonly [string, readonly number[]])[] = [
  ['P1', [33]], ['P2', [66]], ['P3', [60]], ['C1', [69, 73]], ['P4', [35]], ['C2', [55, 56, 57]], ['C3', [54, 58]], ['C4', [40, 41, 42, 68]],
  ['K1', [39, 43]], ['K2', [74, 67]], ['K3', [20, 17]], ['K4', [19, 18]], ['K5', [31, 32]], ['K6', [34, 46]], ['K7', [50, 47, 61]], ['K8', [49, 48, 65]],
];
/** The first pane to let go (P1): it falls straight down across his ω, glinting there (P1_GLINT). */
export const P1_CELL = 33;
/**
 * The singles' landing points (the sheet's table); the others land a fixed step out from x 960 and down. P1 drifts only 36 px right on its
 * way down, so its whole fall crosses his ω; it lands at y 970, a little short of P2's fall, so each single still falls faster than the last.
 */
const SINGLE_TO: Readonly<Record<number, V2>> = { [P1_CELL]: [1040, 970], 66: [190, 985], 60: [1830, 995], 35: [650, 950] };

const area = (pts: readonly (readonly number[])[]): number => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
};

export const PIECES: readonly Piece[] = (() => {
  const out: Piece[] = [];
  GROUP_CELLS.forEach(([group, cells], g) => {
    const cls: FallClass = group[0] === 'P' ? 'single' : group[0] === 'C' ? 'crumble' : 'card';
    for (const k of cells) {
      const s = SHARDS[k];
      const from = toLayout(s.c);
      const [out_, down] = cls === 'crumble' ? [20, 50] : [40, 55];
      const to: V2 = cls === 'single' ? SINGLE_TO[k] : [from[0] + Math.sign(from[0] - 960) * out_, from[1] + down];
      const h = hash(k, 541);
      const angle = cls === 'single' ? (hash(k, 542) < 0.5 ? -1 : 1) * (10 + 15 * h) : cls === 'crumble' ? 8 * (2 * h - 1) : 15 * (2 * h - 1);
      const quadrant = Math.floor((((Math.atan2(s.c[1], s.c[0]) * 180) / Math.PI + 360) % 360) / 90);
      const radius = Math.sqrt(area(s.pts) / Math.PI);
      const u = out.length / 32;
      out.push({
        k, group, cls, paint: QUADRANTS[quadrant], release: PIECE_FALLS[g].from, land: PIECE_FALLS[g].to, order: out.length, from, to, angle,
        mirrored: false, radius, splat: 1.6 * radius, thickness: 22 - 18 * u, transmission: 1 - 0.4 * u, tumble: 1 - 0.8 * u,
      });
    }
  });
  return out;
})();

/** Corner `pt` (layout) of a cell centred at `c` (layout), mirrored about its vertical axis if asked, turned `deg` clockwise, moved to `to`. */
export const placeCorner = (pt: V2, c: V2, to: V2, deg: number, mirrored: boolean): V2 => {
  const th = (deg * Math.PI) / 180;
  const dx = (mirrored ? -1 : 1) * (pt[0] - c[0]);
  const dy = pt[1] - c[1];
  return [to[0] + dx * Math.cos(th) - dy * Math.sin(th), to[1] + dx * Math.sin(th) + dy * Math.cos(th)];
};

/** A landed blank piece as the flat world takes it over on break 2.1 (§7.1): its paint, centroid, angle and outline (layout px). */
export type PieceLanding = { k: number; paint: Paint; color: string; centroid: V2; angle: number; mirrored: boolean; pts: readonly V2[] };
export const PIECE_LANDING: readonly PieceLanding[] = PIECES.map((p) => ({
  k: p.k,
  paint: p.paint,
  color: PAINT_HEX[p.paint],
  centroid: p.to,
  angle: p.angle,
  mirrored: p.mirrored,
  pts: SHARDS[p.k].pts.map((pt) => placeCorner(toLayout(pt), p.from, p.to, p.angle, p.mirrored)),
}));

// ——— Small linear algebra (engine coordinates; 4 × 4 column-major, as THREE.Matrix4.fromArray reads it) ————————————————————————————

export type Mat4 = readonly number[];
const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a: Mat4, b: Mat4): Mat4 => {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const compose = (...ms: Mat4[]): Mat4 => ms.reduce((a, b) => mul(a, b), IDENTITY);
const translate = (x: number, y: number, z = 0): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
/** A rotation by `a` radians (right-handed) about the unit axis (x, y, z) through the origin. */
const rotate = (x: number, y: number, z: number, a: number): Mat4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = 1 - c;
  return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1];
};
/** `m` applied to the point `p`. */
export const applyMat = (m: Mat4, p: readonly number[]): [number, number, number] => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];

// ——— Motion vocabulary (break-sheet §4.1: L and F come from src/shots/breakShared.ts) ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const outQuad = (u: number): number => 1 - (1 - clamp01(u)) ** 2;
const outCubic = (u: number): number => 1 - (1 - clamp01(u)) ** 3;
/** Discrete changes are taken this early (GUIDE pitfall 3: src/engine/temporal.ts SWAP_LEAD), so a landing frame is whole. */
const LEAD = 0.25;

// ——— The camera (§4.2, §7.1) ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** FRONT of src/shots/swiss.ts: the distance at which the z = 0 plane fills 1080 px at FOV 20 (1 unit = 1 px). */
const FRONT_DISTANCE = 1080 / 2 / Math.tan((20 * Math.PI) / 360);
/** The bar's dolly (the break's shot camera, breakShared.ts breakCam): zoom 1.000 → 1.035 over break 1.1–1.3 (iteration 2, ruling 1), creeping to 1.043 by 2.1, its aim drifting (960, 540) → (960, 560) over 1.4 (F). Layout px. */
export function fallCamera(f: number): { zoom: number; cx: number; cy: number } {
  const c = breakCam(f);
  return { zoom: c.zoom, cx: c.cx, cy: c.cy };
}
/** The 3D camera of the fall (engine): FOV 20° at the dolly distance FRONT / zoom, looking straight at the aim on the z = 0 plane. */
export function fallPose(f: number): { position: readonly [number, number, number]; target: readonly [number, number, number]; up: readonly [number, number, number]; fov: number } {
  const c = fallCamera(f);
  const [x, y] = toEngine([c.cx, c.cy]);
  return { position: [x, y, FRONT_DISTANCE / c.zoom], target: [x, y, 0], up: [0, 1, 0], fov: 20 };
}

// ——— The paint pool (§4.4) ———————————————————————————————————————————————————————————————————————————————————————————————————————

const POOL_KEYS: readonly (readonly [number, number])[] = [[brk(1, 1.25), 1100], [brk(1, 1.75), 1080], [brk(1, 2.25), 1040], [brk(1, 2.75), 960], [brk(1, 3), 860], [brk(1, 3.25), 690], [brk(1, 3.5), 400], [brk(1, 3.75), 130], [brk(1, 3.875), -40]];
/** Monotone cubic (Fritsch–Carlson, flat at both ends) through the keys: the pool's base edge (layout y) at instant `f`. */
export function poolEdge(f: number): number {
  const K = POOL_KEYS;
  if (f <= K[0][0]) return K[0][1];
  if (f >= K[K.length - 1][0]) return K[K.length - 1][1];
  const d = K.slice(1).map((k, i) => (k[1] - K[i][1]) / (k[0] - K[i][0]));
  const m = K.map((_, i) => {
    if (i === 0 || i === K.length - 1) return 0;
    if (d[i - 1] * d[i] <= 0) return 0;
    const h0 = K[i][0] - K[i - 1][0];
    const h1 = K[i + 1][0] - K[i][0];
    const w1 = 2 * h1 + h0;
    const w2 = h1 + 2 * h0;
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  let i = 0;
  while (f > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0];
  const t = (f - K[i][0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * K[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * K[i + 1][1] + (t3 - t2) * h * m[i + 1];
}
/** The pool's surface: a travelling sine ripple, 10 px high, 320 px long, running 6 px a frame (layout y offset at x). */
export const poolRipple = (x: number, f: number): number => 10 * Math.sin((2 * Math.PI * (x - 6 * (f - BREAK_START))) / 320);

// ——— One piece's life (§4.3) ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** How far a piece's centroid lifts toward the lens at the middle of its fall (px), and its shadow's extra reach (§4.3 step 5). */
const LIFT = 60;
/** Frames a piece hinges before it falls: singles swing 12° over four, crumbles and cards 6° over two. */
const hingeFrames = (p: Piece): number => (p.cls === 'single' ? 4 : 2);
const hingeMax = (p: Piece): number => (p.cls === 'single' ? 12 : 6);
/**
 * The instant a piece lands: its landing frame, a quarter frame early, so the landing frame is whole — K7 and K8 included: they lie
 * landed through all of the shutter of break 2.1's frame, as the flat world draws them (review R1-01, the break 2.1 slap).
 */
const landAt = (p: Piece): number => p.land - LEAD;
const FACE_FALL_FROM = FACE_FALL.from;
const FACE_FALL_TO = FACE_FALL.to;

/** The hinge: the piece's highest edge (engine) — its midpoint relative to the centroid and its direction (pointing right). */
const HINGES: ReadonlyMap<number, { e: readonly [number, number]; a: readonly [number, number] }> = new Map(
  SHARDS.map((s) => {
    let best = 0;
    let top = -Infinity;
    s.pts.forEach((p, i) => {
      const q = s.pts[(i + 1) % s.pts.length];
      if ((p[1] + q[1]) / 2 > top) {
        top = (p[1] + q[1]) / 2;
        best = i;
      }
    });
    const p = s.pts[best];
    const q = s.pts[(best + 1) % s.pts.length];
    let ax = q[0] - p[0];
    let ay = q[1] - p[1];
    const l = Math.hypot(ax, ay);
    if (ax < 0) [ax, ay] = [-ax, -ay];
    return [s.k, { e: [(p[0] + q[0]) / 2 - s.c[0], (p[1] + q[1]) / 2 - s.c[1]] as const, a: [ax / l, ay / l] as const }] as const;
  }),
);

/** The hinge angle (degrees) of piece `p` at instant `f`: L from its release, 12° (singles) or 6°. */
export const hingeAngle = (p: Piece, f: number): number => hingeMax(p) * launchL(f - p.release);

/** Rotation about the hinge's edge direction by `deg`, the lower edge toward the lens (+z) for positive angles. */
const aboutEdge = (k: number, deg: number): Mat4 => {
  const h = HINGES.get(k)!;
  return rotate(h.a[0], h.a[1], 0, (-deg * Math.PI) / 180);
};

export type Shadow = { dx: number; dy: number; alpha: number };
export type PieceState =
  | { phase: 'stand' }
  | {
      phase: 'fall';
      /** Fall progress 0 → 1 (0 through the hinge). */
      u: number;
      /** Local (engine, relative to the rest centroid) → world (engine). */
      matrix: Mat4;
      /** Its screen silhouette's hard shadow, layout px right and down. */
      shadow: Shadow;
      /**
       * The smoked decal's opacity, the glass's transmission and a bevel glint (0–1). It stays glass all the way down — no paint in the
       * air (review R1-05: tinted pieces read as cellophane) — and becomes paint only by landing.
       */
      decal: number;
      transmission: number;
      glint: number;
    }
  | {
      phase: 'land';
      /** Frames since it landed. */
      t: number;
      /** The landing squash (screen axes). */
      sx: number;
      sy: number;
      /**
       * Its outline: width (px); `pop` white for its landing frame alone (the hit), then how much has turned from cyan crack to ink,
       * clockwise from its first corner.
       */
      outline: { width: number; trim: number; pop: boolean };
      shadow: Shadow;
    };

/** P1's specular sweep as it lets go (break 1.1 and the 3 frames after) and its glint crossing his ω (P1_GLINT); the other pieces glint off the studio alone. */
const glintOf = (p: Piece, f: number): number => {
  if (p.k !== P1_CELL) return 0;
  const g = (at: number, len: number) => (f >= at && f < at + len ? Math.sin((Math.PI * (f - at)) / len) : 0);
  return Math.max(g(PIECE_FALLS[0].from, 4), g(P1_GLINT, 3));
};

/** Piece `p` at instant `f`: standing in the pane, falling (a 3D transform), or landed (a flat polygon at its landing). */
export function pieceAt(p: Piece, f: number): PieceState {
  if (f < p.release - LEAD) return { phase: 'stand' };
  const L = landAt(p);
  if (f >= L) {
    const t = f - L;
    const shadow = { dx: 12, dy: 12, alpha: 1 };
    // K7 and K8 land in the shutter of break 2.1's frame, where the flat world takes them over unsquashed in plain ink: they arrive as it draws them.
    if (p.land >= FACE_FALL_TO) return { phase: 'land', t, sx: 1, sy: 1, outline: { width: 6, trim: 1, pop: false }, shadow };
    const q = 0.06 * (1 - outCubic(t / 4));
    return { phase: 'land', t, sx: 1 + q, sy: 1 - q, outline: { width: 6, trim: clamp01((t - 1) / 2), pop: t < 1 }, shadow };
  }
  const h = HINGES.get(p.k)!;
  const H = p.release + hingeFrames(p);
  const [cx, cy] = SHARDS[p.k].c;
  // The smoke (85 % once it lets go) clears as it falls — over the void that changes nothing, over the paint it keeps the late cards
  // glassy, not grey. Its paint comes only with the landing (the swap to the flat polygon).
  const fu = f < H ? 0 : clamp01((f - H) / (L - H));
  const decal = (1 - 0.15 * clamp01((f - p.release) / 2)) * (p.cls === 'card' ? 1 - 0.8 * fu : 1 - 0.6 * fu * fu);
  const common = { decal, transmission: p.transmission, glint: glintOf(p, f) };
  if (f < H) {
    // Hinging off the top edge: a rotation about the edge's line.
    const m = compose(translate(cx + h.e[0], cy + h.e[1]), aboutEdge(p.k, hingeAngle(p, f)), translate(-h.e[0], -h.e[1]));
    return { phase: 'fall', u: 0, matrix: m, shadow: { dx: 12, dy: 12, alpha: 0.35 }, ...common };
  }
  const u = clamp01((f - H) / (L - H));
  const aH = hingeAngle(p, H);
  // Where the hinge left the centroid (it swung about the edge, not about itself), carried off over the fall.
  const off = applyMat(aboutEdge(p.k, aH), [-h.e[0], -h.e[1], 0]);
  const [fx, fy] = toEngine(p.from);
  const [tx, ty] = toEngine(p.to);
  const x = fx + (tx - fx) * u + (h.e[0] + off[0]) * (1 - u);
  const y = fy + (ty - fy) * u * u + (h.e[1] + off[1]) * (1 - u);
  const z = off[2] * (1 - u) + LIFT * p.tumble * Math.sin(Math.PI * u);
  const spin = rotate(0, 0, 1, ((-p.angle * Math.PI) / 180) * outQuad(u));
  let turn: Mat4;
  if (p.cls === 'single') turn = aboutEdge(p.k, aH + (360 - aH) * outQuad(u));
  // A crumble rocks out to 90° about its hinge and back (a half turn would land it mirrored, which the hand-off does not do).
  else if (p.cls === 'crumble') turn = aboutEdge(p.k, aH * (1 - u) + 90 * p.tumble * Math.sin(Math.PI * u));
  else turn = aboutEdge(p.k, aH * (1 - u) + 30 * p.tumble * Math.sin(Math.PI * u));
  const s = 12 + LIFT * Math.sin(Math.PI * u);
  return { phase: 'fall', u, matrix: compose(translate(x, y, z), spin, turn), shadow: { dx: s, dy: s, alpha: 0.35 }, ...common };
}

/** The cream splat a landed piece throws (layout px): its radius, and the rim in the piece's paint running 2 frames ahead, fading out. */
export function splatAt(p: Piece, f: number): { cx: number; cy: number; r: number; rim: number; rimAlpha: number } | null {
  const L = landAt(p);
  if (p.land >= FACE_FALL_TO || f < L) return null;
  const t = f - L;
  return { cx: p.to[0], cy: p.to[1], r: p.splat * outCubic(t / 10), rim: p.splat * outCubic((t + 2) / 10), rimAlpha: 1 - clamp01((t - 6) / 6) };
}

// ——— The face's fall, break 1.4 → 2.1 (§4.3 face cells, Appendix B) ———————————————————————————————————————————————————————————————————

/** A face piece as the flat world takes it over on break 2.1 (§7.1): landed centroid (layout), angle (degrees clockwise), mirrored. */
export type FaceLanding = { k: number; centroid: V2; angle: number; mirrored: boolean };
/** The brackets fly as units about their ink centres: "(" mirrored (it reads ")") and turned +25°, ")" turned −20°. */
const BRACKETS: readonly { cells: readonly number[]; pivot: V2; to: V2; angle: number; mirrored: boolean }[] = [
  { cells: FACE.open, pivot: [397, 562], to: [170, 800], angle: 25, mirrored: true },
  { cells: FACE.close, pivot: [1522, 562], to: [1790, 920], angle: -20, mirrored: false },
];
/** The core pieces that flip 180° about their vertical axis and land mirrored: the sheet's 3, 10 and 22 but for the ω's (R1-01). */
const FLIPPED: readonly number[] = [22];
/**
 * As the paint rises behind the falling face (break 1.4e to 1.4& + 2), its pieces' neon dies into flat ink — amber with an ink outline — and their
 * smoked glass clears: pale neon on cream would vanish, and the flat world takes them over as amber ink on break 2.1. (The sheet fades the
 * smoke on the last 4 frames before break 2.1 only; the ink crossing is this builder's.)
 */
export const FACE_INK = { from: brk(1, 3.25), to: brk(1, 3.5) + 2 } as const;
export const FACE_LANDING: readonly FaceLanding[] = FACE_CELLS.filter((k) => k !== E2_CELL).map((k) => {
  const rest = toLayout(SHARDS[k].c);
  const b = BRACKETS.find((x) => x.cells.includes(k));
  if (b) return { k, centroid: placeCorner(rest, b.pivot, b.to, b.angle, b.mirrored), angle: b.angle, mirrored: b.mirrored };
  // The ω: one cracked plate, spread ×1.05 about (960, 600), no jitter, each piece turned 1–3°.
  if (OMEGA.has(k)) return { k, centroid: [960 + OMEGA_SPREAD * (rest[0] - 960), 600 + OMEGA_SPREAD * (rest[1] - 540)], angle: (hash(k, 534) < 0.5 ? -1 : 1) * (1 + 2 * hash(k, 533)), mirrored: false };
  const centroid: V2 = [960 + 1.3 * (rest[0] - 960) + 24 * (2 * hash(k, 531) - 1), 600 + 1.3 * (rest[1] - 540) + 24 * (2 * hash(k, 532) - 1)];
  return { k, centroid, angle: (hash(k, 534) < 0.5 ? -1 : 1) * (8 + 22 * hash(k, 533)), mirrored: FLIPPED.includes(k) };
});

export type FaceState =
  | { phase: 'stand' }
  | {
      phase: 'fall';
      u: number;
      matrix: Mat4;
      shadow: Shadow;
      /** The smoked decal's opacity; how far the smoke has cleared to the ink alone and the neon has become flat ink (FACE_INK, break 1.4e to 1.4& + 2); the glass's transmission (1 → 0.6) and its body's opacity (1 → 0), both over 1.4a to 1.4a + 4. */
      decal: number;
      inkOnly: number;
      inked: number;
      transmission: number;
      body: number;
      /** The white glint sweeping left to right across the face as it lets go (break 1.4 and the 3 frames after): its x (layout px), or null. */
      sweep: number | null;
      /**
       * The shutter of break 2.1's frame (from a quarter frame before it): the piece is already the flat world's — amber ink, its outline popping white, no glass, the
       * (14, 14) shadow at full strength — so both halves of the slap frame draw the same picture (review R1-01, the break 2.1 slap).
       */
      flat: boolean;
    };

/** Face cell `k` at instant `f` (not the E2 shard, which stays on our side: shardAt). */
export function faceAt(k: number, f: number): FaceState {
  if (f < FACE_FALL_FROM - LEAD) return { phase: 'stand' };
  const l = FACE_LANDING.find((x) => x.k === k)!;
  const u = clamp01((f - FACE_FALL_FROM) / (FACE_FALL_TO - FACE_FALL_FROM));
  const s = SHARDS[k];
  const b = BRACKETS.find((x) => x.cells.includes(k));
  // Each piece tilts out of the plane and back (≤ 25°) about a hashed in-plane axis, or flips about its vertical axis (it lands mirrored).
  const tiltAxis = Math.PI * hash(k, 537);
  const tilt = rotate(Math.cos(tiltAxis), Math.sin(tiltAxis), 0, (((12 + 13 * hash(k, 536)) * Math.PI) / 180) * Math.sin(Math.PI * u));
  const flip = l.mirrored ? rotate(0, 1, 0, Math.PI * outQuad(u)) : IDENTITY;
  const spin = rotate(0, 0, 1, ((-l.angle * Math.PI) / 180) * outQuad(u));
  const lift = 50 * Math.sin(Math.PI * u);
  let m: Mat4;
  if (OMEGA.has(k)) {
    // The ω falls as one plate: its centre (960, 540) → (960, 600) (ease-in quad), spreading 1 → 1.05, tilting back ≤ 8° and flat
    // again about the horizontal through its centre; each piece only turns to its own 1–3° in the plane.
    const sp = 1 + (OMEGA_SPREAD - 1) * u;
    const plate = rotate(1, 0, 0, ((-PLATE_TILT * Math.PI) / 180) * Math.sin(Math.PI * u));
    m = compose(translate(0, -60 * u * u, lift), plate, translate(sp * s.c[0], sp * s.c[1]), spin);
  } else if (b) {
    // The bracket's pivot moves (x linear, y ease-in), the group turning about it; each cell keeps its place in the group.
    const [px, py] = toEngine(b.pivot);
    const [qx, qy] = toEngine(b.to);
    m = compose(translate(px + (qx - px) * u, py + (qy - py) * u * u, lift), spin, flip, b.mirrored ? IDENTITY : tilt, translate(s.c[0] - px, s.c[1] - py));
  } else {
    const [tx, ty] = toEngine(l.centroid);
    m = compose(translate(s.c[0] + (tx - s.c[0]) * u, s.c[1] + (ty - s.c[1]) * u * u, lift), spin, flip, l.mirrored ? IDENTITY : tilt);
  }
  // The glass gives way to its ink: the body fades out over break 1.4a to 1.4a + 4 (so the frame before 2.1 is the ink alone, as the flat world draws it); its transmission
  // falls toward the sheet's 0.3 only as far as 0.6 — lower, the fading body turns to grey slabs. From a quarter frame before break 2.1 it is flat.
  const flat = f >= FACE_FALL_TO - LEAD;
  const dark = flat ? 1 : clamp01((f - brk(1, 3.75)) / 4);
  const off = flat ? 14 : 14 + 50 * Math.sin(Math.PI * u);
  const ink = flat ? 1 : clamp01((f - FACE_INK.from) / (FACE_INK.to - FACE_INK.from));
  return {
    phase: 'fall',
    u,
    matrix: m,
    shadow: { dx: off, dy: off, alpha: flat ? 1 : 0.35 },
    decal: 1 - 0.15 * clamp01((f - FACE_FALL_FROM) / 2),
    inkOnly: ink,
    inked: ink,
    transmission: 1 - 0.4 * dark,
    body: 1 - dark,
    sweep: f >= FACE_FALL_FROM && f < FACE_FALL_FROM + 3 ? 100 + (1720 * (f - FACE_FALL_FROM)) / 3 : null,
    flat,
  };
}

// ——— E2: the shard on our side of the screen (§4.3 E2, §4.5, §4.10) ————————————————————————————————————————————————————————————

/** Its lock error in the slot (degrees): one of the 31 pieces that lock on break 2.3, each within ±1.5° — the flat world's hash (breakHero.ts lockError). */
export const E2_LOCK_ERROR = 1.5 * (2 * hash(E2_CELL, 551) - 1);
/** The fall draws the shard on our side over whatever part holds these instants, until it is edge-on; then the flat world draws it. */
export const SHARD_OVER = { from: SHARD_STAYS, to: SHARD_FLIGHT.from + 6 } as const;
/** What the fall draws over the flat world: the shard (SHARD_OVER) and both knocks' ripples to their end (screen px, one look). */
export const FALL_OVER = { from: SHARD_STAYS, to: KNOCKS[1] + 9 } as const;
/** Knock 1 lifts the shard toward the lens: it moves this far (px) up and left, away from its drop shadow, which reaches SHARD_SHADOW px. */
export const SHARD_NUDGE = 6;
export const SHARD_SHADOW = 10;
/** Edge-on, passing through the screen plane: from here the flat world draws it, as (×ω×)'s left-eye fragment in ink. */
export const SHARD_HANDOFF = SHARD_FLIGHT.from + 6;

export type ShardState = {
  /** Its centroid on screen (layout px), its scale (× its rest size), its own horizontal scale (an edge-on turn), its rotation (° clockwise). */
  c: V2;
  scale: number;
  scaleX: number;
  rot: number;
  /** True while it is on our side of the screen: it ignores the camera and the rig (draw it at the inverse of the rig). */
  screen: boolean;
  /** How far knock 1 has lifted it toward us (0–1): its drop shadow reaches SHARD_SHADOW px down-right at 1. */
  lift: number;
};

/**
 * Knock 1, felt through the glass (t: frames since it is struck, a quarter frame before the knock, so break 2.1&'s frame is the hit): the
 * shard jolts to 1.08 in 1.5 frames (ease-out) and springs back (outBack) over 4…
 */
const knockJolt = (t: number): number => (t <= 0 || t >= 5.5 ? 0 : t < 1.5 ? 0.08 * (1 - (1 - t / 1.5) ** 2) : 0.08 * (1 - ease.outBack((t - 1.5) / 4)));
/** …and lifts toward the lens: up in 3 frames (cubic-out), down in 3 (sine). */
const knockLift = (t: number): number => (t <= 0 || t >= 6 ? 0 : t < 3 ? outCubic(t / 3) : 1 - ease.inOutSine((t - 3) / 3));

const E2_REST: V2 = toLayout(SHARDS[E2_CELL].c);
/** Its frozen place: the camera's zoom on break 1.4 about the frame centre (the aim drifts only from there). */
const E2_SCALE = fallCamera(SHARD_STAYS).zoom;
const E2_FROZEN: V2 = [960 + E2_SCALE * (E2_REST[0] - 960), 540 + E2_SCALE * (E2_REST[1] - 540)];
/** Its slot on screen on break 2.3: the rest polygon + (0, 20) in the world, through the flat world's camera there (zoom 1.04 about (960, 560), the 4 px nudge). */
const SLOT_CAM = breakCam(SHARD_FLIGHT.to);
const SLOT_ZOOM = SLOT_CAM.zoom;
const E2_SLOT: V2 = toScreen(SLOT_CAM, E2_REST[0], E2_REST[1] + 20);
const E2_CONTROL: V2 = [480, 380];

/** E2's shard at instant `f` (null while it still stands in the pane), on one path both parts read: the fall draws it to break 2.2a, the flat world after. */
export function shardAt(f: number): ShardState | null {
  if (f < SHARD_STAYS) return null;
  const [a, b] = [SHARD_FLIGHT.from, SHARD_FLIGHT.to];
  if (f < a) {
    const t = f - (KNOCKS[0] - LEAD);
    const lift = knockLift(t);
    const n = (SHARD_NUDGE / Math.SQRT2) * lift;
    const c: V2 = lift === 0 ? E2_FROZEN : [E2_FROZEN[0] - n, E2_FROZEN[1] - n];
    return { c, scale: E2_SCALE * (1 + knockJolt(t)), scaleX: 1, rot: 0, screen: true, lift };
  }
  if (f >= b) return { c: E2_SLOT, scale: SLOT_ZOOM, scaleX: 1, rot: E2_LOCK_ERROR, screen: false, lift: 0 };
  const e = ((f - a) / (b - a)) ** 3;
  const c: V2 = [0, 1].map((i) => (1 - e) ** 2 * E2_FROZEN[i] + 2 * e * (1 - e) * E2_CONTROL[i] + e * e * E2_SLOT[i]) as unknown as V2;
  const scaleX = f < SHARD_HANDOFF ? 1 - 0.92 * ((f - a) / 6) ** 3 : 0.08 + 0.92 * outCubic((f - SHARD_HANDOFF) / 6);
  return { c, scale: (E2_SCALE + (SLOT_ZOOM - E2_SCALE) * e) * (1 + 0.08 * launchL(4 * (f - a)) * (1 - e)), scaleX, rot: E2_LOCK_ERROR * e, screen: false, lift: 0 };
}

/** The shard's lower-left corner on screen at `f` (layout px): where T0's leader hangs while the shard is on our side. */
export const shardLowerLeft = (f: number): V2 => shardPolygon(f).reduce((m, p) => (p[1] - p[0] > m[1] - m[0] ? p : m));

/** The shard's outline on screen at `f` (layout px): its rest polygon scaled (x by scaleX too), turned and moved with it. */
export function shardPolygon(f: number): V2[] {
  const s = shardAt(f) ?? { c: E2_REST, scale: 1, scaleX: 1, rot: 0, screen: false, lift: 0 };
  const th = (s.rot * Math.PI) / 180;
  return SHARDS[E2_CELL].pts.map((p) => {
    const [x, y] = toLayout(p);
    const dx = (x - E2_REST[0]) * s.scale * s.scaleX;
    const dy = (y - E2_REST[1]) * s.scale;
    return [s.c[0] + dx * Math.cos(th) - dy * Math.sin(th), s.c[1] + dx * Math.sin(th) + dy * Math.cos(th)] as V2;
  });
}

/** A knock's ring (screen layout px): crack cyan `stroke` px wide inside radius r, edged outside and inside by `edge` px of ink. */
export type Ripple = { cx: number; cy: number; r: number; stroke: number; alpha: number; color: string; edge: number; edgeColor: string };
/**
 * The knocks' double ripples (screen layout px), from the shard's lower edge: rings opening at 25 % of 90 and 140 px on the knock's own
 * frame (struck a quarter frame early) and growing to them over 9 frames (cubic-out),
 * 4 → 1 px of crack cyan between 2 px ink edges so they read on the cream and on the glass alike, at full strength until the last 3
 * frames (review R1-03: the sheet's white 2 px rings at 60 % vanished on the cream).
 */
export function knockRipples(f: number): Ripple[] {
  // Struck a quarter frame early, so the knock's own frame shows the rings whole.
  const at = KNOCKS.find((k) => f >= k - LEAD && f < k - LEAD + 9);
  if (at === undefined) return [];
  const poly = shardPolygon(at);
  let best = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const r = poly[(best + 1) % poly.length];
    if (p[1] + q[1] > poly[best][1] + r[1]) best = i;
  });
  const p = poly[best];
  const q = poly[(best + 1) % poly.length];
  const t = (f - (at - LEAD)) / 9;
  const alpha = 1 - clamp01((9 * t - 6) / 3);
  return [90, 140].map((r) => ({ cx: (p[0] + q[0]) / 2, cy: (p[1] + q[1]) / 2, r: r * (0.25 + 0.75 * outCubic(t)), stroke: 4 - 3 * t, alpha, color: '#C9F2FF', edge: 2, edgeColor: '#111111' }));
}

// ——— How the fall is photographed (§4.2, §7.1) ————————————————————————————————————————————————————————————————————————————————————

/** What the club photographs its last frame with (src/scenes/club.ts look()): the break's first frame must look the same. */
const CLUB_LOOK: Look = { toneMapping: 'linear', exposure: 1, bloom: { ...CLUB_BLOOM }, aberration: 0, grain: 0.05, vignette: 0.22 };
/** The flat break's look (§7.1, breakShared.ts): only HDR highlights bloom — glints, stars, `access granted` — and the cream never glows. */
export const BREAK_LOOK: Look = SHARED_LOOK;
/** The cream's luminance (Rec. 709 of linear #FDF3D8): the bloom's threshold is above it from the first landing on. */
const CREAM_LUMA = 0.2126 * 0.982 + 0.7152 * 0.896 + 0.0722 * 0.686;

/**
 * The look at output frame `f`: the club's on break 1.1, the flat break's on 2.1. The paint arrives on 1.2e, so the bloom's threshold climbs
 * past the cream's luminance by then (the club's 0.75 would make the pool glow like a light — the sheet's "no light pool"); the rest
 * eases over the bar as the screen's neon dies into paint.
 */
export function fallLook(f: number): Look {
  const a = CLUB_LOOK;
  const b = BREAK_LOOK;
  const u = flow((f - brk(1, 1)) / (FACE_FALL_TO - brk(1, 1)));
  const m = (x: number, y: number) => x + (y - x) * u;
  const early = flow((f - brk(1, 0.75)) / (PIECE_FALLS[0].to - LEAD - brk(1, 0.75)));
  const threshold = a.bloom.threshold + (CREAM_LUMA + 0.005 - a.bloom.threshold) * early + (b.bloom.threshold - CREAM_LUMA - 0.005) * u;
  if (f >= FACE_FALL_TO) return b;
  if (f <= brk(1, 0.75)) return CLUB_LOOK;
  return {
    toneMapping: 'linear',
    exposure: 1,
    bloom: { intensity: m(a.bloom.intensity, b.bloom.intensity), threshold, smoothing: m(a.bloom.smoothing, b.bloom.smoothing), radius: m(a.bloom.radius, b.bloom.radius) },
    aberration: 0,
    grain: m(a.grain, b.grain),
    vignette: m(a.vignette, b.vignette),
  };
}

/** One segment from break 1.1 to the match cut: 2.1 is seamless (the shutter of 2.1's frame reaches back into the fall). */
export const fallSegment = (): Segment => ({ from: BREAK_START, to: MATCH_CUT });

/** Where world point `p` (engine, z toward the camera) lands on screen at instant `f` through the fall's camera (layout px). */
export function projectFall(f: number, p: readonly number[]): V2 {
  const c = fallCamera(f);
  const [ax, ay] = toEngine([c.cx, c.cy]);
  const k = FRONT_DISTANCE / (FRONT_DISTANCE / c.zoom - (p[2] ?? 0));
  return toLayout([(p[0] - ax) * k, (p[1] - ay) * k]);
}

/** Every moving corner on screen at instant `f` (layout px): the falling pieces, the falling face, the shard in flight. */
function movingCorners(f: number): Map<string, V2> {
  const out = new Map<string, V2>();
  const add = (k: number, m: Mat4) => {
    const c = SHARDS[k].c;
    SHARDS[k].pts.forEach((p, i) => out.set(`${k}:${i}`, projectFall(f, applyMat(m, [p[0] - c[0], p[1] - c[1], 0]))));
  };
  for (const p of PIECES) {
    const s = pieceAt(p, f);
    if (s.phase === 'fall') add(p.k, s.matrix);
  }
  for (const k of FACE_CELLS) {
    if (k === E2_CELL) continue;
    const s = faceAt(k, f);
    if (s.phase === 'fall') add(k, s.matrix);
  }
  if (f >= SHARD_FLIGHT.from && f < SHARD_OVER.to) shardPolygon(f).forEach((p, i) => out.set(`e2:${i}`, p));
  return out;
}

/** The fastest any corner on screen moves around instant `f` (px a frame), over the shutter's instants. */
export function fallSpeed(f: number): number {
  let v = 0;
  for (const t of [-0.25, -0.125, 0, 0.125, 0.249]) {
    const a = movingCorners(f + t - 0.01);
    const b = movingCorners(f + t + 0.01);
    for (const [key, p] of a) {
      const q = b.get(key);
      if (!q || p[0] < -200 || p[0] > 2120 || p[1] < -200 || p[1] > 1280) continue;
      v = Math.max(v, Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.02);
    }
  }
  return v;
}

/** How far apart consecutive sub-frames may print a moving glass edge (px): its bright bevel is about this wide. */
const STEP = 3;
/**
 * How the fall photographs output frame `f`: a 180° shutter with enough sub-frames that no edge moves more than STEP between two of
 * them — at least 32, 48 from break 1.4 (the sheet's counts). Over the flat world (the shard on our side) only what the shard needs.
 */
export function fallTemporal(f: number): Temporal {
  const shutter = 0.5;
  const need = (v: number, min: number) => Math.max(min, 16 * Math.ceil((v * shutter) / STEP / 16));
  if (f < FACE_FALL_FROM) return { samples: Math.min(160, need(fallSpeed(f), 32)), shutter, persistence: 0 };
  if (f < FALL.to) return { samples: Math.min(160, need(fallSpeed(f), 48)), shutter, persistence: 0 };
  // Break 2.1's shutter opens in the fall (the face arriving at full speed); the shard turning edge-on through 2.2a.
  if (f === FALL.to || (f >= SHARD_FLIGHT.from && f < SHARD_HANDOFF + 1)) return { samples: Math.min(96, need(fallSpeed(f), 32)), shutter, persistence: 0 };
  return { samples: 16, shutter, persistence: 0 };
}

// ——— The screen readouts: the party monitor falling away, the REPAIR MODE chips (§3 break 1.1–1.2, §4.8) ——————————————————————————

/**
 * The party monitor on break 1.1–1.2 (screen px: engine coordinates, drawn over the finished picture): the club's box of its last frame exactly
 * (src/shots/hud.ts hudContent, its fade included), its `[FATAL] screen integrity 0%` row lit and glitch-sliced on break 1.1 and the frame after (offset
 * ±18 / ±30 px with a split copy), then the whole box falling — y += 0.65 t², turning 8° (t / 20)² clockwise about its centre — gone below
 * the bottom edge 20 frames in (the sheet's 0.5 t² leaves its top row on screen there: 0.65 t² clears it, turn included).
 */
export function monitorFall(frame: number, advance: Advance): FlatContent {
  const f = Math.round(frame);
  if (f < MONITOR_FALL.from || f >= MONITOR_FALL.to) return { under: [], glyphs: { mono: [] }, over: [] };
  // The club's last drawn readout: the frame before break 1.1, or the one the club's held bars hold there (src/score/film.ts partTail).
  const last = heldFrame(MONITOR_FALL.from - 1);
  const box = hudContent(last, advance);
  const back = box.under[0];
  const glyphs: Glyph[] = [...(box.glyphs.mono ?? [])];
  const cell = advance('═') * HUD.size;
  const left = -960 + HUD.margin;
  const warning = WARNINGS[WARNINGS.length - 1];
  const y = -540 + HUD.margin + HUD.pitch / 2;
  const alpha = glyphs[0]?.alpha ?? 1;
  const glitch = f < MONITOR_FALL.from + 2;
  const red = linear('#FF5FA2', 1.6);
  // The [FATAL] row: lit and sliced on the thoom, then blinking on the sixteenths as the club blinked it (in phase with hud.ts: from BURST).
  if (glitch || Math.floor((f - BURST) / 3) % 2 === 0) {
    const dx = glitch ? [18, -30, 30, -18][Math.floor(hash(seedFrame(f), 552) * 4)] : 0;
    [...warning.text].forEach((ch, i) => {
      if (ch.trim() === '') return;
      const x = left + (2 + i + 0.5) * cell + dx;
      if (glitch) glyphs.push({ ch, x: x - 4, y: y + 2, size: HUD.size, color: linear('#3FE0FF', 1.2), alpha: alpha * 0.6 });
      glyphs.push({ ch, x, y, size: HUD.size, color: red, alpha: glitch ? Math.max(alpha, 0.6) : alpha });
    });
  }
  const t = Math.max(0, f - MONITOR_FALL.from);
  const drop = 0.65 * t * t;
  const rot = -((8 * Math.PI) / 180) * (t / 20) ** 2;
  const [cx, cy] = [back.x, back.y];
  const turn = (x: number, y0: number): [number, number] => {
    const dx = x - cx;
    const dy = y0 - cy;
    return [cx + dx * Math.cos(rot) - dy * Math.sin(rot), cy + dx * Math.sin(rot) + dy * Math.cos(rot) - drop];
  };
  if (t === 0) return { under: [...box.under], glyphs: { mono: glyphs }, over: [] };
  return {
    under: box.under.map((s) => ({ ...s, y: s.y - drop, rot })),
    glyphs: { mono: glyphs.map((g) => { const [x, yy] = turn(g.x, g.y); return { ...g, x, y: yy, rot }; }) },
    over: [],
  };
}

/** The chips' type (JetBrains Mono Bold 26 px), padding and inks. */
const CHIP = { size: 26, padX: 12, padY: 6, side: 48, edge: 40, ink: linear('#4CF08C'), back: linear('#0C0F0E'), line: linear('#111111') } as const;
const RAMP_CHARS = [...RAMP].filter((c) => c !== ' ');

/**
 * The four `REPAIR MODE▌` chips at output frame `frame` (screen px, engine coordinates): TL, TR, BR, BL decode on CHIPS — four frames
 * of ramp characters (hashed per frame), then the text — their cursor blinking 6 on, 6 off; on break 2.1 they fold into their corners
 * (width → 0, cubic-in, over the 16th).
 */
export function chipsContent(frame: number, advance: Advance): FlatContent {
  const f = Math.round(frame);
  const under: Shape[] = [];
  const glyphs: Glyph[] = [];
  if (f < CHIPS_UP.from || f >= CHIPS_UP.to) return { under, glyphs: { chip: glyphs }, over: [] };
  const text = [...(CHIP_REPAIR + CURSOR)];
  const cell = advance('M') * CHIP.size;
  const w0 = text.length * cell + 2 * CHIP.padX;
  const h = CHIP.size * 1.3 + 2 * CHIP.padY;
  const fold = 1 - clamp01((f - FALL.to) / (CHIPS_UP.to - FALL.to)) ** 3;
  CHIPS.forEach((at, i) => {
    if (f < at) return;
    const w = w0 * fold;
    const leftSide = i === 0 || i === 3;
    const top = i < 2;
    const x0 = leftSide ? -960 + CHIP.side : 960 - CHIP.side - w;
    const yc = top ? 540 - CHIP.edge - h / 2 : -540 + CHIP.edge + h / 2;
    under.push({ kind: 'rect', x: x0 + w / 2, y: yc, w, h, color: CHIP.back, outline: 2, outlineColor: CHIP.line });
    const scramble = f < at + 4;
    const cursorOn = Math.floor((f - at) / 6) % 2 === 0;
    const textLeft = (leftSide ? -960 + CHIP.side : 960 - CHIP.side - w0) + CHIP.padX;
    text.forEach((ch, j) => {
      if (ch.trim() === '') return;
      if (ch === CURSOR && !cursorOn) return;
      const x = textLeft + (j + 0.5) * cell;
      if (x - cell / 2 < x0 || x + cell / 2 > x0 + w) return;
      const shown = scramble && ch !== CURSOR ? RAMP_CHARS[Math.floor(hash(i, j, seedFrame(f), 551) * RAMP_CHARS.length)] : ch;
      glyphs.push({ ch: shown, x, y: yc, size: CHIP.size, color: CHIP.ink });
    });
  });
  return { under, glyphs: { chip: glyphs }, over: [] };
}

/** Every character the fall's screen readouts can show in the chips' atlas (the monitor uses Drop 1's MONITOR_GLYPHS). */
export const CHIP_CHARS: readonly string[] = [...new Set([...CHIP_REPAIR, CURSOR, ...RAMP_CHARS])].filter((c) => c.trim() !== '');

// ——— Helpers the scene draws with ————————————————————————————————————————————————————————————————————————————————————————————————

/** The cells that share an edge with each cell (two corners in common). */
export const NEIGHBOURS: ReadonlyMap<number, readonly number[]> = (() => {
  const key = (p: readonly number[]) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const corners = SHARDS.map((s) => new Set(s.pts.map(key)));
  return new Map(SHARDS.map((s, i) => [i, SHARDS.map((_, j) => j).filter((j) => j !== i && [...corners[i]].filter((c) => corners[j].has(c)).length >= 2)]));
})();
/** Each cell's edges (SHARDS order: pts[i] → pts[i + 1]) and the cell across each (−1 at the rim). */
export const EDGE_NEIGHBOURS: ReadonlyMap<number, readonly number[]> = (() => {
  const key = (p: readonly number[]) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const corners = SHARDS.map((s) => new Set(s.pts.map(key)));
  return new Map(
    SHARDS.map((s) => [
      s.k,
      s.pts.map((p, i) => {
        const a = key(p);
        const b = key(s.pts[(i + 1) % s.pts.length]);
        return SHARDS.findIndex((o) => o.k !== s.k && corners[o.k].has(a) && corners[o.k].has(b));
      }),
    ]),
  );
})();
/** When each cell lets go (frames): the blank pieces on their release, the face on break 1.4. */
const RELEASE: ReadonlyMap<number, number> = new Map([...PIECES.map((p) => [p.k, p.release] as const), ...FACE_CELLS.map((k) => [k, FACE_FALL_FROM] as const)]);
/**
 * How bright each crack edge of standing cell `k` is at `f` (× its frozen brightness, one per edge): whole between two standing panes;
 * once the cell across has let go (its hole opens a quarter frame early, with the piece) it flares ×1.6 and fades over four frames to
 * 40 %, and stays there, so the hole reads as a hole (review R1-05). An edge between two holes is gone with both cells.
 */
export function edgeGains(k: number, f: number): number[] {
  return (EDGE_NEIGHBOURS.get(k) ?? []).map((n) => {
    const r = n < 0 ? undefined : RELEASE.get(n);
    if (r === undefined) return 1;
    const t = f - (r - LEAD);
    return t < 0 ? 1 : t < 4 ? 0.4 + 1.2 * (1 - t / 4) : 0.4;
  });
}
/**
 * The standing glass's sheen (linear light added, × the shader's band): a base everywhere and a broad softbox band, 4× the first cut's,
 * so standing glass reads as a surface and the holes, onto the void, read as holes (review R1-05).
 */
export const STAND_SHEEN = { base: 0.01, band: 0.045 } as const;
/** How much of the sheen is up at `f` (none on break 1.1: the seam; full by 1.2) and where the softbox band's centre is (it sweeps the pane). */
export const standSheen = (f: number): { amount: number; sweep: number } => ({ amount: clamp01((f - BREAK_START) / 24), sweep: 300 + (1200 * (f - BREAK_START)) / 96 });

/** A camera (engine) that keeps whatever it draws still on screen under the rig's view `v`: the pipeline samples the picture through `v`. */
export const inverseRigPose = (v: { zoom: number; x: number; y: number; roll: number }) => ({
  position: [v.x, v.y, FRONT_DISTANCE * v.zoom] as const,
  target: [v.x, v.y, 0] as const,
  up: [-Math.sin(v.roll), Math.cos(v.roll), 0] as const,
  fov: 20,
});

/**
 * A band just inside a convex polygon's edge (corners relative to its centre): per vertex its outer corner, the inward miter that moves
 * it one unit in from both edges (the shader scales it by the width), and its share of the way round (the trim), as two triangles an edge.
 */
export function outlineRing(pts: readonly V2[]): { outer: V2[]; inward: V2[]; frac: number[]; index: number[] } {
  const n = pts.length;
  let a = 0;
  for (let i = 0; i < n; i++) a += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const s = a > 0 ? 1 : -1;
  // Inward normal of edge i (pts[i] → pts[i + 1]).
  const normal = (i: number): V2 => {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [(-s * (q[1] - p[1])) / l, (s * (q[0] - p[0])) / l];
  };
  const miter = (i: number): V2 => {
    const m0 = normal((i - 1 + n) % n);
    const m1 = normal(i);
    const d = 1 + m0[0] * m1[0] + m0[1] * m1[1];
    return [(m0[0] + m1[0]) / d, (m0[1] + m1[1]) / d];
  };
  const len = pts.map((p, i) => Math.hypot(pts[(i + 1) % n][0] - p[0], pts[(i + 1) % n][1] - p[1]));
  const total = len.reduce((x, y) => x + y, 0);
  const outer: V2[] = [];
  const inward: V2[] = [];
  const frac: number[] = [];
  const index: number[] = [];
  let run = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const b = outer.length;
    outer.push(pts[i], pts[j], pts[i], pts[j]);
    inward.push([0, 0], [0, 0], miter(i), miter(j));
    frac.push(run / total, (run + len[i]) / total, run / total, (run + len[i]) / total);
    index.push(b, b + 1, b + 3, b, b + 3, b + 2);
    run += len[i];
  }
  return { outer, inward, frac, index };
}
