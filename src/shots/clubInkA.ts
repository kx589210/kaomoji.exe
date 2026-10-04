// The comic club INK, club bars 1–3 (shots K1 SPLASH, K2 THE PAGE, K3 THE RECORD; club 1.1 → 4.1), pure — the club's builder 'a' (build
// sheet notes/b58/club-sheet.md §3.2–§3.4, §4 E1–E6, §5; prototype club3/w/src/j2.js, j3.js, motion and timing exactly theirs).
//   Bar 1. The cosmos's last point is his left • eye: a jagged 14-spike halftone burst inks the frame from it (log-polar paper dots on the
//   void, stretching along their rays), and on +8 figure and ground swap — the stretched dots become K focus lines on paper. The pull-back
//   to a comic cover: the lit floor card-flips up, the infected crowd pops up (their only colour the amber ω), BOOM out of the floor on
//   the stomp, the corner box with his hex barcode, the tagline, CLAP! on the disco point.
//   Bar 2. He cuts the page: each leap lays a light-cycle trail that a BOOM band inks into a gutter. P1 Lichtenstein (the girl, the high
//   five, her infection), P2 Kirby (the flexer, the fist bump), the flam's narrow band opening the lounge strip where the antivirus sits
//   immune (the stray ω spark ricochets off his shades as the first red ✦), the cat DJ's round inset cut by WIKKA-WIKKA, the dive.
//   Bar 3. The dance floor is the record: a Busby Berkeley overhead of three chorus lines, the FLOWER on 3.3, the red scan line a beat
//   late, the rise into the match cut (the record r 300 with his face where the cherry will be).
//
// Drawn with the flat engine's own primitives (rects, ellipses, rings, capsules, glyphs, halftone tints): no clips, so panels are painted
// left to right, each ground a half-plane covering everything right of its gutter, and the burst's jagged front is a fan of void slivers
// laid over everything outside it. The prototype's world is kept as it was (y DOWN, its units, its rotations); every shape and glyph is
// flipped to the engine's y-up on its way out (`shp`, `gl`), and the camera too (`poseOf`). Plain Node loads this file.
import type { Pose } from '../engine/camera.ts';
import type { RGB } from '../engine/color.ts';
import type { FlatContent, Paper } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { hash } from '../engine/random.ts';
import type { Shape, ShapeKind } from '../engine/shapeField.ts';
import type { Temporal } from '../engine/temporal.ts';
import { COMIC_INKS } from '../engine/post/comicModel.ts';
import type { ScreenAnchor } from '../engine/post/dotScreen.ts';
import type { Look } from '../engine/types.ts';
import type { InkDrawB, Poly } from './clubInkB.ts';
import { type Aim, aimPose } from '../motion/hit.ts';
import { CAT_INK, CROWD, FLEXER, GIRL, GUEST_INK, HERO_INK, RINGS } from '../content/castClub.ts';
import { COVER, type InkAtlasId, LETTERING, SIGNATURE } from '../content/club.ts';
import {
  BANDS,
  BARCODE,
  BENDAY_RINGS,
  BERKELEY_STEPS,
  CLAPS,
  CLUB,
  CORNER_BOX,
  CROWD_UP,
  DISCO,
  DIVE,
  DOT_INKS,
  FILL,
  FIST_BUMP,
  FLAM,
  FLOWER,
  HATS,
  HIGH_FIVE,
  INFECTIONS,
  INSET,
  KICKS,
  LEAPS,
  MATCH_CUP,
  PULL_BACK,
  RECORD,
  RISE,
  SCAN_SWEEP,
  SPARK,
  STABS,
  STOMP,
  SWAP,
  TAGLINE,
  TEAR,
  TING,
  club,
} from '../score/club.ts';
import { v07Frame } from '../score/film.ts';
import { inkHudContent } from './clubInkReadout.ts';
import { HUD } from './hud.ts';
import { AMBER, CYAN, FOV, FRONT, type InkDraw, type InkLayout, type InkPart, K, NIGHT, PAPER, PAPER_GRAIN, PINK, PLATE_REST, RED, SCREEN, VOID, bumpAt, frameOf, inkLook, plateAt, shutter } from './clubInkKit.ts';

// ——— The prototype's maths ———————————————————————————————————————————————————————————————————————————————————————————————————

const PI = Math.PI;
const TAU = 2 * PI;
const D2R = PI / 180;
const cl = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
const lr = (a: number, b: number, t: number): number => a + (b - a) * t;
const lg = (a: number, b: number, t: number): number => Math.exp(lr(Math.log(a), Math.log(b), t));
const sF = (t: number): number => 0.5 - 0.5 * Math.cos(PI * cl(t));
const cO = (t: number): number => 1 - (1 - cl(t)) ** 3;
const cI = (t: number): number => cl(t) ** 3;
/** A launch (the sheet's L): off on t = 0, 75 % of the way in 3 frames, a 2.8 % rebound, settled by ~14. */
const launch = (t: number): number => {
  if (t <= 0) return 0;
  const z = 0.75;
  const w = 0.72;
  const d = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(d * t) + ((z * w) / d) * Math.sin(d * t));
};
/** An impact (the sheet's I): accelerating from `a` into frame `b`, then a 2 % rebound over 6 frames. */
const impact = (f: number, a: number, b: number, p = 2.2): number => (f <= a ? 0 : f < b ? ((f - a) / (b - a)) ** p : 1 + (f - b < 6 ? 0.02 * Math.sin((PI * (f - b)) / 6) : 0));
const keys = (ks: readonly (readonly [number, number])[], t: number): number => {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++)
    if (t < ks[i][0]) {
      const [a, va] = ks[i - 1];
      const [b, vb] = ks[i];
      return lr(va, vb, (t - a) / (b - a));
    }
  return ks[ks.length - 1][1];
};
/** On twos: the output frame, rounded down to even. */
const tw = (f: number): number => Math.floor(frameOf(f) / 2) * 2;
/**
 * On sixes (a 16th: continuity plan v07 §4): the output frame, rounded down to its sixteenth. His bounce steps here, so its biggest step
 * is the landing on the kick (with the squash), not a 2-frame shimmer that keeps the whole beat busy.
 */
const six = (f: number): number => Math.floor(frameOf(f) / 6) * 6;
const lastOf = (a: readonly number[], f: number): number => {
  let r = -1e9;
  for (const v of a) if (v <= f) r = v;
  return r;
};
const since = (a: readonly number[], f: number): number => f - lastOf(a, f);
const countTo = (a: readonly number[], f: number): number => a.filter((v) => v <= f).length;
/** A pop: from 0.4 to 1.15 in 2 frames, settling to 1 by 5. */
const popS = (t: number): number => (t < 0 ? 0 : t < 2 ? lr(0.4, 1.15, t / 2) : t < 5 ? lr(1.15, 1, (t - 2) / 3) : 1);
/** A word landing on its drum frame: in from 1.6×, rebounding to 0.97, settled by +5. */
const land = (t: number): number => (t < -2 ? 0 : t < 0 ? lr(1.6, 1, (t + 2) / 2) : t < 2 ? lr(1, 0.97, t / 2) : t < 5 ? lr(0.97, 1, (t - 2) / 3) : 1);
/**
 * A snap (continuity plan v07 §4, the club's beat-lock: a move that lands ON its kick): more than half the way on the drum's own frame
 * (59 % — whole through its shutter: it starts half a frame early, between frames), the rest easing out over ~8 frames. A launch (L) is
 * nothing on its frame and fastest a frame or two after it, so the club's moves peaked after their kicks.
 */
export const SNAP = { rest: 0.5, tau: 2.5 } as const;
export const snapL = (t: number): number => (t < -0.5 ? 0 : 1 - SNAP.rest * Math.exp(-(t + 0.5) / SNAP.tau));

/**
 * Time since drum `at` for something that appears on it: −1 (absent) until output frame `at`, then never below 0 — so a pop is whole on
 * its drum frame (the frame's earlier sub-frames show it at its first size) instead of half-exposed.
 */
const since0 = (f: number, at: number): number => (frameOf(f) >= at ? Math.max(0, f - at) : -1);
/** Every kick, the flam among them (the hero's bounce and the dots' thump read it). */
const KK: readonly number[] = [...KICKS, FLAM].sort((a, b) => a - b);

/** The vocal hook's note starts (sixteenths) of club bars 1–3 (HOOK[3], HOOK[4] in sections/drop1.mjs, and PEAK): his head-bob. */
export const HOOK_NODS: readonly (readonly number[])[] = [
  [0, 2, 3, 6, 8, 11, 12, 14],
  [0, 2, 3, 6, 8, 12, 14],
  [0, 1, 2, 4, 5, 6, 8, 11, 12],
];
const NOD_AT: readonly number[] = HOOK_NODS.flatMap((row, k) => row.map((s) => club(k + 1, s / 4)));
/** The head-bob on the hook's notes (on twos): a 9 px dip over 10 frames and a ±2.2° tilt alternating note to note → [dy, rot]. */
function nod(f: number): [number, number] {
  if (f < CLUB.from || f >= MATCH_CUP) return [0, 0];
  const g = tw(f);
  let n = -1;
  for (let i = 0; i < NOD_AT.length; i++) if (NOD_AT[i] <= g) n = i;
  if (n < 0) return [0, 0];
  const t = g - NOD_AT[n];
  return t >= 10 ? [0, 0] : [9 * Math.sin((PI * t) / 10), (n % 2 ? 1 : -1) * 2.2 * D2R * (1 - t / 10)];
}
/** The bounce between kicks (on twos): up H at mid-beat (y down: negative). */
const bob = (f: number, H: number): number => {
  const u = cl(since(KK, six(f)) / 24);
  return -H * 4 * u * (1 - u);
};
/** The squash on a kick (on twos): `a` on the kick, gone by +6. */
const squ = (f: number, a = 0.1): number => {
  const t = since(KK, frameOf(f));
  return t < 6 ? a * (1 - t / 6) : 0;
};
/**
 * Every Ben-Day screen thumps on the kicks (dot radius +20 %, 8 frames) and breathes on the closed hats (+8 %, 3 frames) — `amount` 1;
 * a screen that fills much of the frame thumps at a third of that (radius +7 %), or the whole frame would pulse past the flash limits
 * (scripts/check-flash.mjs: the P1 ground alone swung the frame's luminance 0.12 on every kick).
 */
const thump = (f: number, amount = 1): number => {
  const F = frameOf(f);
  const k = since(KK, F);
  const h = since(HATS, F);
  return (1 + amount * ((k < 8 ? 0.2 * (1 - k / 8) : 0) + (h < 3 ? 0.08 * (1 - h / 3) : 0))) ** 2;
};
const BIG_THUMP = 1 / 3;

// ——— The pen: the draw list in painter's order, the prototype's y-down world flipped on the way out —————————————————————————————————

type Atlas = Exclude<InkAtlasId, 'readout'>;
/** The ink layer draws its atlases in this order (src/scenes/clubInk.ts INK_PICTURE_ATLASES): a glyph of an earlier atlas after a later one needs a new draw. */
const ORDER: Readonly<Record<Atlas, number>> = { face: 1, sfx: 2, ui: 3, display: 4, mono: 5 };
const UNDER_MAX = 8000;
const OVER_MAX = 500;
const GLYPH_MAX = 8000;

const NO_CONTENT: FlatContent = { under: [], glyphs: {}, over: [] };
/**
 * Collects shapes and glyphs into the fewest draws that keep painter's order (under → glyphs by atlas → over), within the ink layer's
 * capacities; polygons (src/shots/clubInkB.ts Poly, drawn by the scene's polygon layer) come in their own draws, in order, with the screen
 * their `fixed` dot screens are printed on.
 */
class Pen {
  out: InkDrawB[] = [];
  pose: Pose;
  paper: Paper | null;
  under: Shape[] = [];
  over: Shape[] = [];
  glyphs: Partial<Record<Atlas, Glyph[]>> = {};
  count = 0;
  phase = 0;
  constructor(pose: Pose, ground: RGB) {
    this.pose = pose;
    this.paper = { color: ground, grain: PAPER_GRAIN };
  }
  flush(): void {
    if (this.under.length + this.over.length + this.count === 0 && !this.paper) return;
    this.out.push({ layer: 'ink', pose: this.pose, content: { under: this.under, glyphs: this.glyphs, over: this.over }, paper: this.paper });
    this.under = [];
    this.over = [];
    this.glyphs = {};
    this.count = 0;
    this.phase = 0;
    this.paper = null;
  }
  at(pose: Pose): void {
    if (pose === this.pose) return;
    this.flush();
    this.pose = pose;
  }
  shape(s: Shape): void {
    if (this.phase === 0) {
      if (this.under.length >= UNDER_MAX) this.flush();
      this.under.push(s);
    } else if (this.over.length < OVER_MAX) {
      this.over.push(s);
      this.phase = 6;
    } else {
      this.flush();
      this.under.push(s);
    }
  }
  glyph(a: Atlas, g: Glyph): void {
    const o = ORDER[a];
    if (this.phase > o || (this.glyphs[a]?.length ?? 0) >= GLYPH_MAX) this.flush();
    const list = this.glyphs[a] ?? (this.glyphs[a] = []);
    list.push(g);
    this.count++;
    this.phase = o;
  }
  /** Polygons (world units, y DOWN like every other shape here: flipped on the way out), after everything before them; fixed screens print on `anchor`. */
  poly(anchor: ScreenAnchor | undefined, ...ps: Poly[]): void {
    if (ps.length === 0) return;
    this.flush();
    const flip = ps.map((q): Poly => ({ ...q, tri: q.tri.map((v, i) => (i % 2 ? -v : v)) }));
    const last = this.out[this.out.length - 1] as (InkDrawB & { polys: Poly[] }) | undefined;
    if (last && last.polys && last.content === NO_CONTENT && last.pose === this.pose && last.anchor === anchor) last.polys.push(...flip);
    else this.out.push({ layer: 'ink', pose: this.pose, content: NO_CONTENT, paper: this.paper, polys: flip, ...(anchor ? { anchor } : {}) });
    this.paper = null;
  }
  done(): InkDrawB[] {
    this.flush();
    return this.out;
  }
}

/** The prototype's camera: screen = R(ro) · z · (p − c), y down. */
type Cam = { z: number; cx: number; cy: number; ro: number };
/**
 * What every drawing helper needs: the pen, the advances, the instant, the camera and the zoom line widths are kept constant against, and
 * the camera of the output frame the instant belongs to (`camF`: what the frame's fixed screens and its output-frame figures are seen by).
 */
type Ctx = { p: Pen; L: InkLayout; f: number; cam: Cam; camF: Cam; poseF: Pose; z: number; bf: number; dm: number; dmBig: number };
const aimOf = (c: Cam): Aim => ({ zoom: c.z, x: c.cx, y: -c.cy, roll: -c.ro });
const poseOf = (c: Cam): Pose => aimPose(aimOf(c), FRONT, FOV);
const ctxOf = (p: Pen, L: InkLayout, f: number, cam: Cam, camF: Cam): Ctx => ({
  p,
  L,
  f,
  cam,
  camF,
  poseF: poseOf(camF),
  z: cam.z,
  // The keylines boil on the 16ths (plan v07 §4: on twos they shimmered every other frame of the beat), hashed on the frame as approved on
  // the 61-bar map (v07Frame: v08's bridge A moved the club a bar, a whole number of 16ths).
  bf: Math.floor(v07Frame(frameOf(f)) / 6),
  dm: thump(f),
  dmBig: thump(f, BIG_THUMP),
});
/**
 * U3 (no blur smear on a face; sheet §10.2 checklist 3): `draw` as the output frame's camera sees it, on every sub-frame
 * — the characters (and P1's dots) are whole on each frame, and only the page under them (the grounds, the focus lines, the floor, the
 * gutters) carries the camera's move. The pen switches to that camera's pose and back, so painter's order is kept.
 */
function still(c: Ctx, draw: (s: Ctx) => void): void {
  const back = c.p.pose;
  c.p.at(c.poseF);
  draw({ ...c, cam: c.camF, z: c.camF.z });
  c.p.at(back);
}
/**
 * The screen a fixed dot screen is printed on so that its plane is a frame of this world as camera `c` sees it (dotScreen.ts ScreenAnchor:
 * screen = (x, y) + zoom · R(roll) · plane, y up): `o` the plane's origin, `sc` world units a plane unit, `turn` the plane turned clockwise
 * in this y-down world. Anchored on the output frame's camera, the dots stay put through every sub-frame (no blur reaches them) and ride
 * the world from frame to frame.
 */
function anchorIn(c: Cam, o: Pt = [0, 0], sc = 1, turn = 0): ScreenAnchor {
  const r = -c.ro;
  const dx = o[0] - c.cx;
  const dy = -(o[1] - c.cy);
  return { x: c.z * (Math.cos(r) * dx - Math.sin(r) * dy), y: c.z * (Math.sin(r) * dx + Math.cos(r) * dy), zoom: c.z * sc, roll: r - turn };
}
/** A loop (y-down world points) as a triangle fan from its first point (convex loops). */
function fanOf(pts: readonly Pt[]): number[] {
  const out: number[] = [];
  for (let i = 1; i + 1 < pts.length; i++) out.push(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  return out;
}
/** An annular sector (radii r0 → r1, angles a0 → a1, y-down world, clockwise on screen), each point mapped through `at`. */
function sectorTri(at: (x: number, y: number) => Pt, r0: number, r1: number, a0: number, a1: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = lr(a0, a1, i / n);
    const t1 = lr(a0, a1, (i + 1) / n);
    const p = [at(Math.cos(t0) * r0, Math.sin(t0) * r0), at(Math.cos(t0) * r1, Math.sin(t0) * r1), at(Math.cos(t1) * r1, Math.sin(t1) * r1), at(Math.cos(t1) * r0, Math.sin(t1) * r0)];
    out.push(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1], p[0][0], p[0][1], p[2][0], p[2][1], p[3][0], p[3][1]);
  }
  return out;
}
/** Whether world point (x, y) (± `ext` world units) is on screen. */
function onScreen(c: Ctx, x: number, y: number, ext: number): boolean {
  const { z, cx, cy, ro } = c.cam;
  const dx = x - cx;
  const dy = y - cy;
  const sx = z * (Math.cos(ro) * dx - Math.sin(ro) * dy);
  const sy = z * (Math.sin(ro) * dx + Math.cos(ro) * dy);
  const e = ext * z + 2;
  return sx > -960 - e && sx < 960 + e && sy > -540 - e && sy < 540 + e;
}

type ShapeOpts = { rot?: number; r?: number; alpha?: number; tint?: number; screen?: number; angle?: number; outline?: number; outlineColor?: RGB };
/** A shape in the prototype's world (y down, `rot` and the screen `angle` clockwise; angle in degrees, as its dt()). */
function shp(c: Ctx, kind: ShapeKind, x: number, y: number, w: number, h: number, color: RGB, o: ShapeOpts = {}): void {
  if (!(w > 0) || !(h > 0) || (o.alpha ?? 1) <= 0.002 || (o.tint ?? 1) <= 0.004) return;
  const s: Shape = { kind, x, y: -y, w, h, color };
  if (o.rot) s.rot = -o.rot;
  if (o.r !== undefined) s.r = o.r;
  if (o.alpha !== undefined && o.alpha < 1) s.alpha = o.alpha;
  if (o.tint !== undefined && o.tint < 0.999) {
    s.tint = o.tint;
    s.screen = o.screen;
    s.angle = -(o.angle ?? 0) * D2R;
  }
  if (o.outline) {
    s.outline = o.outline;
    s.outlineColor = o.outlineColor ?? K;
  }
  c.p.shape(s);
}
const rect = (c: Ctx, x: number, y: number, w: number, h: number, color: RGB, o: ShapeOpts = {}): void => shp(c, 'rect', x, y, w, h, color, o);
const ell = (c: Ctx, x: number, y: number, rx: number, ry: number, color: RGB, o: ShapeOpts = {}): void => shp(c, 'ellipse', x, y, 2 * rx, 2 * ry, color, o);
/** A capsule from (x0, y0) to (x1, y1), `width` thick (round caps). */
function seg(c: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, color: RGB, o: ShapeOpts = {}): void {
  const l = Math.hypot(x1 - x0, y1 - y0);
  shp(c, 'segment', (x0 + x1) / 2, (y0 + y1) / 2, l + width, width, color, { ...o, rot: Math.atan2(y1 - y0, x1 - x0) });
}
/** A straight band through (x, y) along direction `a`, `half` long each way, `width` across (butt ends). */
const band = (c: Ctx, x: number, y: number, a: number, half: number, width: number, color: RGB, o: ShapeOpts = {}): void => rect(c, x, y, 2 * half, width, color, { ...o, rot: a });
/** The half-plane on side `sd` of the line through (x, y) along `a` (sd = 1: left of a downward line on screen). */
function half(c: Ctx, x: number, y: number, a: number, sd: number, color: RGB, o: ShapeOpts = {}): void {
  const B = 40000;
  const nx = -Math.sin(a) * sd;
  const ny = Math.cos(a) * sd;
  rect(c, x + (nx * B) / 2, y + (ny * B) / 2, 4 * B, B, color, { ...o, rot: a });
}
/** Which side of the line through P along `a` the point (x, y) is on (> 0: side 1). */
const sideOf = (P: Pt, a: number, x: number, y: number): number => -Math.sin(a) * (x - P[0]) + Math.cos(a) * (y - P[1]);

type GlyphOpts = { rot?: number; stretch?: number; alpha?: number; outline?: number; outlineColor?: RGB };
/** A glyph of atlas `a` centred at (x, y) in the prototype's world; `outline` in ems (clamped to the atlas's reach). */
function gl(c: Ctx, a: Atlas, ch: string, x: number, y: number, size: number, color: RGB, o: GlyphOpts = {}): void {
  if (ch === ' ' || !(size > 0.05) || (o.alpha ?? 1) <= 0.002) return;
  const g: Glyph = { ch, x, y: -y, size, color };
  if (o.rot) g.rot = -o.rot;
  if (o.stretch !== undefined && o.stretch !== 1) g.stretch = o.stretch;
  if (o.alpha !== undefined && o.alpha < 1) g.alpha = o.alpha;
  if (o.outline && o.outline > 0) {
    g.outline = Math.min(0.23, o.outline);
    g.outlineColor = o.outlineColor ?? K;
  }
  c.p.glyph(a, g);
}

// ——— Type: faces, the system's voice, the lettering ——————————————————————————————————————————————————————————————————————————————

const widths = (L: InkLayout, a: Atlas, s: string): number[] => [...s].map((ch) => L.advance[a](ch));
/** The centre of character `i` of `s` from the string's centre, world units at `em` (by advance). */
function cposX(L: InkLayout, s: string, i: number, em: number, a: Atlas = 'face'): number {
  const ws = widths(L, a, s);
  const W = ws.reduce((m, v) => m + v, 0);
  let x = 0;
  for (let k = 0; k < i; k++) x += ws[k];
  return (x + ws[i] / 2 - W / 2) * em;
}
/** From a string's centre to the centre of its (…) core, world units at `em`: he is placed by his face, not by his arms. */
function coreX(L: InkLayout, s: string, em: number): number {
  const chars = [...s];
  const i = chars.indexOf('(');
  const j = chars.lastIndexOf(')');
  if (i < 0 || j < 0) return 0;
  const ws = widths(L, 'face', s);
  const W = ws.reduce((m, v) => m + v, 0);
  const a = ws.slice(0, i).reduce((m, v) => m + v, 0);
  const b = ws.slice(0, j + 1).reduce((m, v) => m + v, 0);
  return ((a + b) / 2 - W / 2) * em;
}

type TOpts = {
  atlas?: Atlas;
  fl?: RGB | null;
  lw?: number;
  rim?: number;
  rc?: RGB;
  sh?: readonly [number, number] | null;
  shc?: RGB;
  om?: RGB | null;
  r?: number;
  sx?: number;
  sy?: number;
  a?: number;
  ko?: 0 | 1;
  sk?: RGB;
  boil?: boolean;
  pl?: readonly [number, number];
  /** Characters left out (drawn on their own by the caller, at their places in the string). */
  skip?: string;
};
/**
 * A string as the prototype's T(): placed by its centre at (x, y), each character its own glyph, inked in layers over the whole string —
 * the hard shadow, the paper rim, the K keyline, the fill (ω in `om`). Keylines grow outward from the glyph (the SDF cannot stroke
 * inward): 0.6 of the prototype's centred stroke, so the K band reads the same weight; `ko: 0` (the keyline under the fill) keeps all of it.
 * Keylined type boils on twos (±6 % keyline, ±0.6 px).
 */
function T(c: Ctx, s: string, x0: number, y0: number, em: number, o: TOpts = {}): void {
  const atlas = o.atlas ?? 'face';
  const chars = [...s];
  const ws = widths(c.L, atlas, s);
  const W = ws.reduce((m, v) => m + v, 0);
  let x = x0;
  let y = y0;
  let lw = o.lw ?? 0;
  if (o.boil !== false && lw > 0) {
    const k = chars.length * 31 + (s.codePointAt(0) ?? 0);
    lw *= 1 + 0.06 * (2 * hash(c.bf, k, 7) - 1);
    x += (0.6 * (2 * hash(c.bf, k, 8) - 1)) / c.z;
    y += (0.6 * (2 * hash(c.bf, k, 9) - 1)) / c.z;
  }
  const sx = o.sx ?? 1;
  const sy = o.sy ?? 1;
  const r = o.r ?? 0;
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  const size = em * sy;
  const alpha = o.a ?? 1;
  if (alpha <= 0.002 || size <= 0.05) return;
  const pos: [number, number][] = [];
  let acc = 0;
  for (const w of ws) {
    const lx = (acc + w / 2 - W / 2) * em * sx;
    acc += w;
    pos.push([x + cs * lx, y + sn * lx]);
  }
  const kout = o.ko === 0 ? lw : 0.6 * lw;
  const ru = o.rim ?? 0;
  const layer = (dx: number, dy: number, color: (ch: string) => RGB, out: number, oc: RGB): void => {
    const ox = cs * dx - sn * dy;
    const oy = sn * dx + cs * dy;
    chars.forEach((ch, i) => {
      if (!o.skip?.includes(ch)) gl(c, atlas, ch, pos[i][0] + ox, pos[i][1] + oy, size, color(ch), { rot: r, stretch: sx / sy, alpha, outline: out / size, outlineColor: oc });
    });
  };
  if (o.sh) {
    const shc = o.shc ?? NIGHT;
    layer(o.sh[0], o.sh[1], () => shc, kout + ru, shc);
  }
  if (ru > 0) {
    const rc = o.rc ?? PAPER;
    layer(0, 0, () => rc, kout + ru, rc);
  }
  if (lw > 0) {
    const sk = o.sk ?? K;
    layer(0, 0, () => sk, kout, sk);
  }
  if (o.fl) {
    const fl = o.fl;
    const om = o.om ?? null;
    const pl = o.pl ?? [0, 0];
    layer(pl[0], pl[1], (ch) => (om && ch === 'ω' ? om : fl), 0, K);
  }
}
type HeroOpts = { fl?: RGB; r?: number; sx?: number; sy?: number; a?: number; om?: RGB | null; norim?: boolean; nosh?: boolean; pl?: readonly [number, number] };
/** The hero: amber fill, paper rim, K keyline, a NIGHT hard shadow (all capped in screen px), placed by his (…) core. */
function hero(c: Ctx, s: string, x: number, y: number, em: number, o: HeroOpts = {}): void {
  const z = c.z;
  const lw = Math.min(0.06 * em * z, 40) / z;
  const rim = Math.min(0.025 * em * z, 14) / z;
  const sh = Math.min(0.035 * em * z, 24) / z;
  T(c, s, x - coreX(c.L, s, em) * (o.sx ?? 1), y, em, { fl: o.fl ?? AMBER, lw, rim: o.norim ? 0 : rim, sh: o.nosh ? null : [sh, sh], r: o.r, sx: o.sx, sy: o.sy, a: o.a, om: o.om, pl: o.pl });
}
type PalOpts = { fl?: RGB; lw?: number; om?: RGB | null; r?: number; sx?: number; ko?: 0 | 1; a?: number; sh?: readonly [number, number]; sk?: RGB; skip?: string };
/** A friend: paper (or night) fill, K keyline (screen px), the amber ω of the infection. */
function pal(c: Ctx, s: string, x: number, y: number, em: number, o: PalOpts = {}): void {
  T(c, s, x, y, em, { fl: o.fl ?? PAPER, lw: (o.lw ?? Math.max(3, 0.05 * em * c.z)) / c.z, om: o.om === undefined ? AMBER : o.om, r: o.r, sx: o.sx, ko: o.ko, a: o.a, sh: o.sh, sk: o.sk, skip: o.skip });
}
/** A face drawn once and stamped about (the crowds): keyline in world units, scaled with it, no boil. */
function sprite(c: Ctx, s: string, em: number, x: number, y: number, rot: number, sc: number, o: { fl?: RGB; lw?: number; om?: RGB | null; ko?: 0 | 1; sk?: RGB } = {}): void {
  if (sc <= 0.01) return;
  T(c, s, x, y, em * sc, { fl: o.fl ?? PAPER, lw: (o.lw ?? 3) * sc, om: o.om === undefined ? AMBER : o.om, ko: o.ko, sk: o.sk, r: rot, boil: false });
}
/** Plain text (the system voice; the cover), centred vertically on y, left-aligned at x (or centred). */
function tx(c: Ctx, a: Atlas, s: string, x: number, y: number, size: number, color: RGB, o: { center?: boolean; rot?: number; ox?: number; oy?: number } = {}): void {
  const ws = widths(c.L, a, s);
  const W = ws.reduce((m, v) => m + v, 0) * size;
  const r = o.rot ?? 0;
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  let lx = o.center ? -W / 2 : 0;
  [...s].forEach((ch, i) => {
    const px = x + lx + (ws[i] * size) / 2;
    lx += ws[i] * size;
    const ox = o.ox ?? 0;
    const oy = o.oy ?? 0;
    gl(c, a, ch, ox + cs * px - sn * y, oy + sn * px + cs * y, size, color, { rot: r });
  });
}

type SfxOpts = { ex?: number; lw?: number; ht?: RGB; lc?: RGB; hl?: RGB };
/**
 * One letter of the lettering (the prototype's sfx + let1): `cap` its cap height (em = 1.36 cap), a NIGHT extrusion of `ex` layers down
 * and left, the K keyline (0.1 cap), a paper highlight sliver up and left, the face `fc`, its Ben-Day tint `ht` (the comic pass prints it
 * as dots). `s` scales it, `r` turns it, `u` > 0 un-prints it (the halftone dissolve: the pass prints the fading ink as shrinking dots).
 * The prototype's skew is left out (the glyph field has no shear; the letters' own turn carries the slant).
 */
function letter(c: Ctx, ch: string, x: number, y: number, cap: number, fc: RGB, s: number, r: number, u: number, a = 1, o: SfxOpts = {}): void {
  if (s <= 0.01 || u >= 1 || a <= 0) return;
  const em = cap * 1.36 * s;
  const ex = o.ex ?? 8;
  const lw = (o.lw ?? 0.1 * cap) * s;
  const alpha = a * (u > 0 ? Math.max(1 / 24, (20 / 24) * (1 - u) ** 1.5) : 1);
  const exAlpha = alpha >= 0.999 ? 1 : 1 - (1 - alpha) ** (1 / Math.max(1, ex));
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  const put = (dx: number, dy: number, color: RGB, out: number, oc: RGB, al: number): void =>
    gl(c, 'sfx', ch, x + cs * dx - sn * dy, y + sn * dx + cs * dy, em, color, { rot: r, alpha: al, outline: out / em, outlineColor: oc });
  for (let i = ex; i > 0; i--) put(-3 * i * s, 3 * i * s, NIGHT, lw, NIGHT, exAlpha);
  put(0, 0, o.lc ?? K, lw, o.lc ?? K, alpha);
  put(-3 * s, -3 * s, o.hl ?? PAPER, 0, K, alpha);
  put(s, s, fc, 0, K, alpha);
  if (o.ht) put(s, s, o.ht, 0, K, alpha * 0.45);
}

// ——— Shapes the prototype drew as paths ——————————————————————————————————————————————————————————————————————————————————————

/** The prototype's starP vertices: 2n points alternating valley (ri) and tip (ro), seeded jitter in radius (jr) and tip angle (ja°). */
function starVerts(x: number, y: number, n: number, ri: number, ro: number, sd = 0, jr = 0, ja = 0, rot = 0): [number, number][] {
  const v: [number, number][] = [];
  for (let i = 0; i < 2 * n; i++) {
    const o = i % 2;
    const a = rot + (i / 2 / n) * TAU + (o ? ja * (2 * hash(sd, i, 1) - 1) * D2R : 0);
    const r = (o ? ro : ri) * (1 + jr * (2 * hash(sd, i, 2) - 1));
    v.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return v;
}
/** How far from (x, y) the star polygon's edge is along angle θ. */
function edgeAt(v: readonly [number, number][], x: number, y: number, th: number): number {
  const dx = Math.cos(th);
  const dy = Math.sin(th);
  let best = 0;
  for (let i = 0; i < v.length; i++) {
    const ax = v[i][0] - x;
    const ay = v[i][1] - y;
    const ex = v[(i + 1) % v.length][0] - v[i][0];
    const ey = v[(i + 1) % v.length][1] - v[i][1];
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (ax * ey - ay * ex) / den;
    const s = (ax * dy - ay * dx) / den;
    if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9) best = Math.max(best, t);
  }
  return best;
}
type Piece = { x: number; y: number; rx: number; ry: number; rot: number };
/**
 * A star as the engine can draw one: a disc to its shallowest valley and, per tip, a long ellipse from inside the disc to the tip, as wide
 * as the valley-to-valley span where it leaves the disc (adjacent spikes meet at the valleys). The ends of long ellipses are sharp.
 */
function starPieces(v: readonly [number, number][], x: number, y: number): Piece[] {
  const n = v.length / 2;
  const rad = (p: readonly [number, number]): number => Math.hypot(p[0] - x, p[1] - y);
  let rmin = Infinity;
  for (let i = 0; i < v.length; i += 2) rmin = Math.min(rmin, rad(v[i]));
  const out: Piece[] = [{ x, y, rx: rmin * 0.98, ry: rmin * 0.98, rot: 0 }];
  for (let k = 0; k < n; k++) {
    const t = v[2 * k + 1];
    const v0 = v[2 * k];
    const v1 = v[(2 * k + 2) % v.length];
    const rt = rad(t);
    const rv = (rad(v0) + rad(v1)) / 2;
    const th = Math.atan2(t[1] - y, t[0] - x);
    const hw = Math.hypot(v1[0] - v0[0], v1[1] - v0[1]) / 2;
    const a = (rt + 0.9 * rv) / 2;
    const c0 = rt - a;
    const q = 1 - (1 - (rt - rv) / a) ** 2;
    out.push({ x: x + Math.cos(th) * c0, y: y + Math.sin(th) * c0, rx: a, ry: hw / Math.sqrt(Math.max(q, 0.05)), rot: th });
  }
  return out;
}
type InkOpts = { sh?: readonly [number, number]; shc?: RGB; f2?: { color: RGB; tint: number; screen: number; angle: number }; alpha?: number };
/** Inks a union of pieces: its hard shadow, a K keyline `lw` wide all round (the pieces grown), the fill, a tint over the fill. */
function inkPieces(c: Ctx, ps: readonly Piece[], fill: RGB | null, lw: number, o: InkOpts = {}): void {
  const alpha = o.alpha;
  if (o.sh) for (const q of ps) ell(c, q.x + o.sh[0], q.y + o.sh[1], q.rx + lw * 0.6, q.ry + lw * 0.6, o.shc ?? NIGHT, { rot: q.rot, alpha });
  if (lw > 0) for (const q of ps) ell(c, q.x, q.y, q.rx + lw * 0.6, q.ry + lw * 0.6, K, { rot: q.rot, alpha });
  if (fill) for (const q of ps) ell(c, q.x, q.y, q.rx, q.ry, fill, { rot: q.rot, alpha });
  if (o.f2) for (const q of ps) ell(c, q.x, q.y, q.rx, q.ry, o.f2.color, { rot: q.rot, tint: o.f2.tint, screen: o.f2.screen, angle: o.f2.angle, alpha });
}
const inkStar = (c: Ctx, x: number, y: number, n: number, ri: number, ro: number, sd: number, jr: number, ja: number, rot: number, fill: RGB, lw: number, o: InkOpts = {}): void =>
  inkPieces(c, starPieces(starVerts(x, y, n, ri, ro, sd, jr, ja, rot), x, y), fill, lw, o);
/** An inked ellipse: shadow, fill, a K keyline `lw` centred on its edge (as the prototype's stroke), a tint over the fill. */
function inkEll(c: Ctx, x: number, y: number, rx: number, ry: number, fill: RGB, lw: number, o: InkOpts & { rot?: number } = {}): void {
  const rot = o.rot ?? 0;
  if (o.sh) ell(c, x + o.sh[0], y + o.sh[1], rx + lw / 2, ry + lw / 2, o.shc ?? NIGHT, { rot });
  if (lw > 0) ell(c, x, y, rx + lw / 2, ry + lw / 2, K, { rot });
  ell(c, x, y, rx, ry, fill, { rot, outline: lw / 2 });
  if (o.f2) ell(c, x, y, rx - lw / 2, ry - lw / 2, o.f2.color, { rot, tint: o.f2.tint, screen: o.f2.screen, angle: o.f2.angle });
}
/** An inked rectangle (centre, size, turn): shadow, fill, a K keyline `lw` centred on its edge, a tint over the fill. */
function inkRect(c: Ctx, x: number, y: number, w: number, h: number, fill: RGB, lw: number, o: InkOpts & { rot?: number } = {}): void {
  const rot = o.rot ?? 0;
  if (o.sh) rect(c, x + o.sh[0], y + o.sh[1], w + lw, h + lw, o.shc ?? NIGHT, { rot });
  if (lw > 0) rect(c, x, y, w + lw, h + lw, K, { rot });
  rect(c, x, y, w, h, fill, { rot, outline: lw / 2 });
  if (o.f2) rect(c, x, y, w - lw, h - lw, o.f2.color, { rot, tint: o.f2.tint, screen: o.f2.screen, angle: o.f2.angle });
}
/** A balloon (thought: three bubbles toward (tx, ty)), paper on a K keyline `lw` wide. */
function balloon(c: Ctx, x: number, y: number, rx: number, ry: number, tx0: number, ty0: number, lw: number): void {
  const ps: Piece[] = [{ x, y, rx, ry, rot: 0 }];
  for (let i = 1; i <= 3; i++) {
    const u = i / 4;
    const r = (1 - u) * ry * 0.28 + 4;
    ps.push({ x: lr(x, tx0, u + 0.12), y: lr(y, ty0, u + 0.12), rx: r, ry: r * 0.8, rot: 0 });
  }
  for (const q of ps) ell(c, q.x, q.y, q.rx + lw, q.ry + lw, K);
  for (const q of ps) ell(c, q.x, q.y, q.rx, q.ry, PAPER);
}
/** A comic gutter along the line through (x, y), direction `a`: paper `w` px wide between K edges (screen px at zoom z). */
function gutter(c: Ctx, x: number, y: number, a: number, w: number, z: number): void {
  band(c, x, y, a, 8000, (w + 20) / z, K);
  band(c, x, y, a, 8000, w / z, PAPER);
}
/** A polyline as K-edged capsules (then a coloured core). */
function polyline(c: Ctx, pts: readonly Pt[], w: number, color: RGB, core = 0, coreColor: RGB = CYAN): void {
  for (let i = 1; i < pts.length; i++) seg(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, color);
  if (core > 0) for (let i = 1; i < pts.length; i++) seg(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], core, coreColor);
}
/** A polyline clipped to side `sd` of the line through P along `a` (the trail inside its panel). */
function clipPolyline(pts: readonly Pt[], P: Pt, a: number, sd: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const s = sideOf(P, a, pts[i][0], pts[i][1]) * sd;
    if (i > 0) {
      const s0 = sideOf(P, a, pts[i - 1][0], pts[i - 1][1]) * sd;
      if ((s0 > 0) !== (s > 0)) {
        const t = s0 / (s0 - s);
        out.push([lr(pts[i - 1][0], pts[i][0], t), lr(pts[i - 1][1], pts[i][1], t)]);
      }
    }
    if (s > 0) out.push(pts[i]);
  }
  return out;
}

/**
 * 集中线, focus lines converging on (vx, vy): 72 needles (long thin ellipses whose sharp ends point at it, widest beyond the frame edge).
 * Continuity plan v07 §4 (the kicks dominate): they move on the kicks only — re-jittered on each (angle ±0.6°, width ±20 %), the fan
 * shifted half a line (2.5°) on every other one, every other line ×1.3 wide on the kick, easing back with the print bump — where they
 * ticked on the open hats (the &s) and re-jittered every sixteenth (the & hit as hard as the kick). Their base sits half a step off the
 * burst's rays turned by its spin, so on the pull-back the K gaps between the stretched dots become these lines in place.
 */
function needles(c: Ctx, vx: number, vy: number, r0: number, color: RGB, n = 72): void {
  const z = c.z;
  const F = frameOf(c.f);
  const j = countTo(KK, F);
  const tk = (j % 2 ? 2.5 : 0) * D2R + burstSpin(F) * D2R;
  const swell = bumpAt(F);
  const reach = 1260 / z;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * TAU + tk + 0.6 * D2R * (2 * hash(i, j, 5) - 1);
    const wj = (1 + 0.2 * (2 * hash(i, j, 6) - 1)) * (i % 2 ? 1 + 0.3 * swell : 1);
    const d = reach - r0;
    if (d <= 0) continue;
    const A = 1.25 * d;
    const wEdge = ((2 + 16 * cl((reach * z - 380) / 720)) / z) * wj;
    const B = wEdge / (2 * Math.sqrt(1 - (1 - d / A) ** 2));
    ell(c, vx + Math.cos(a) * (r0 + A), vy + Math.sin(a) * (r0 + A), A, B, color, { rot: a });
  }
}

// ——— The splash world's layout and camera (bars 1–2; the prototype's lay() and c2()) ——————————————————————————————————————————————

type Pt = readonly [number, number];
/** The splash world: y down, units = screen px at the splash's own zoom (the sheet's 0.66), where the hero is em 396. */
const EM1 = 396;
/** At club 1.1 the camera is 600/396 closer: his face em 600 on screen. */
const ZB = 600 / EM1;
/**
 * His left • eye, the cosmos's point: the camera looks straight at it until the pull-back, so it is the frame centre on club 1.1 whatever
 * the font (his face is placed by its advances so that this • lands here; M PLUS Rounded 1c ExtraBold puts his face's centre at x ≈ 0).
 */
const E: Pt = [-267, 60];
const C1: Pt = [1656, 8];
const Z1 = 0.712;
const C2: Pt = [4540, -6];
const Z2 = 0.606;
const wp = (C: Pt, z: number, x: number, y: number): Pt => [C[0] + x / z, C[1] + y / z];
/** The hero in P1 (em 250 on screen) and P2 (em 220); the girl, the flexer, the guest, the inset's centre. */
const HP1 = wp(C1, Z1, -290, 190);
const HP2 = wp(C2, Z2, -430, 120);
const EP1 = 250 / Z1;
const EP2 = 220 / Z2;
const GP = wp(C1, Z1, 520, -150);
const FXP = wp(C2, Z2, 115, -130);
const GUP = wp(C2, Z2, 790, -10);
const IC = wp(C2, Z2, 240, -70);
const W3: Pt = [C2[0] + 600 / Z2, C2[1]];
/** The gutters' directions (pointing down): the first wall leans left at the top (+6°), the second right (−6°), the flam line steep. */
const WA = 84 * D2R;
const WB = 96 * D2R;
const WC = 100 * D2R;
/** The camera drifts across P1 (1.5 px a frame) and P2 (1.2): never a dead hold. */
const DRIFT1 = 1.5;
const DRIFT2 = 1.2;
/** He leaves P1 from where his bounce has him on the frame before (mid-bounce, up), so the take-off never jumps. */
const LEAP2_FROM: Pt = [HP1[0], HP1[1] + bob(LEAPS[1].from - 1, 40 / Z1)];
const GIRL_EM = 240 / Z1;
const FLEX_EM = 175 / Z2;
const GUEST_EM = 82 / Z2;
const LEAP_FACE = HERO_INK.point;

type Layout = { HS: Pt; W1: Pt; W2: Pt; HF: Pt; GM: Pt; GE: Pt; FM: Pt; BP: Pt; HFist: Pt; FFist: Pt; SG: Pt; GS: readonly [Pt, Pt] };
/**
 * The second leap as a swish pan (continuity plan v07 §4 C2: its pan swept the frame for all but its last frame — P1's dot lattice
 * racing past in every frame of the beat — so its landing on club 2.3 was the end of a move, not a hit, and the flam 3 frames after it
 * went unseen): his x and the pan go across together in LEAP2.frames frames on a cubic ease-out (no overshoot: the lattice reads any
 * drift), the leap's 96-sample short shutter streaking the page; then the page is still while he arcs down onto the kick, and the page
 * steps on the flam (FLAM_STEP).
 */
export const LEAP2 = { frames: 3 } as const;
const swish = (t: number): number => (t <= 0 ? 0 : t >= LEAP2.frames ? 1 : 1 - (1 - t / LEAP2.frames) ** 3);
/**
 * The leap: x launches, y lands on the kick 12 frames later, arcing 300 up. The second rides the swish: through it he keeps his place on
 * screen (the page streaks past under him), then eases to his landing spot on P2 over the rest of the leap (≈ 15 px a frame, never a
 * whip back).
 */
const leap = (f: number, A: Pt, B: Pt, f0: number): Pt => {
  const u = cl((f - f0) / 12);
  const y = lr(A[1], B[1], u) - 300 * 4 * u * (1 - u);
  if (f0 !== LEAPS[1].from) return [lr(A[0], B[0], launch(f - f0)), y];
  const cam = splashCam(f);
  const from = (A[0] - splashCam(f0).cx) * splashCam(f0).z;
  const to = (B[0] - C2[0]) * Z2;
  const sx = lr(from, to, sF((f - f0 - LEAP2.frames) / (12 - LEAP2.frames)));
  return [cam.cx + sx / cam.z, y];
};
const LAYOUTS = new WeakMap<InkLayout, Layout>();
function layout(L: InkLayout): Layout {
  const had = LAYOUTS.get(L);
  if (had) return had;
  const HS: Pt = [E[0] - cposX(L, HERO_INK.inked, 1, EM1), E[1]];
  const W1 = leap(LEAPS[0].from + 2, HS, HP1, LEAPS[0].from);
  const W2: Pt = [2960, leap(LEAPS[1].from + 6, HP1, HP2, LEAPS[1].from)[1]];
  const hq = EP1 / 100;
  const HF: Pt = [HP1[0] - coreX(L, LEAP_FACE, EP1) + cposX(L, LEAP_FACE, 5, EP1) + 28 * hq, HP1[1] - 34 * hq];
  const GM: Pt = [GP[0] + cposX(L, GIRL.host, 2, GIRL_EM), GP[1]];
  const GE: Pt = [GP[0] + cposX(L, GIRL.host, 1, GIRL_EM), GP[1]];
  const FM: Pt = [FXP[0] + cposX(L, FLEXER.host, 3, FLEX_EM), FXP[1]];
  const HFist: Pt = [HP2[0] - coreX(L, HERO_INK.flex, EP2) + cposX(L, HERO_INK.flex, [...HERO_INK.flex].length - 1, EP2), HP2[1]];
  const FFist: Pt = [FXP[0] + cposX(L, FLEXER.host, 0, FLEX_EM), FXP[1]];
  const BP: Pt = [(HFist[0] + FFist[0]) / 2, (HFist[1] + FFist[1]) / 2 - 20];
  const g1 = cposX(L, GUEST_INK.calm, 1, GUEST_EM);
  const g3 = cposX(L, GUEST_INK.calm, 3, GUEST_EM);
  // His sunglasses sit up on his brow, above his ￣ ￣ (whose ink rides high in the em: about 0.35 em over the line's middle).
  const GS: readonly [Pt, Pt] = [
    [GUP[0] + g1, GUP[1] - 0.85 * GUEST_EM],
    [GUP[0] + g3, GUP[1] - 0.85 * GUEST_EM],
  ];
  const SG: Pt = [(GS[0][0] + GS[1][0]) / 2, GS[0][1]];
  const out: Layout = { HS, W1, W2, HF, GM, GE, FM, BP, HFist, FFist, SG, GS };
  LAYOUTS.set(L, out);
  return out;
}

/**
 * How far he leads the pan at most, a share of each leap: he pulls ahead over 4 frames and the pan takes him back over the next 7. The
 * second leap's 0.16 is ≈ 200 px of lead; the first zooms out 1.05 → 0.71 while he lands on P1's left third, so its larger share only holds
 * his face in place on the launch (the page sweeps under him) — any more and the pan's catch-up passes 60 px a frame (T7).
 */
const LEADS = [0.24, 0.16] as const;
/**
 * The pan that follows a leap (T7): it launches with him (his own launch, L) less a lead that opens over his first 4 frames and closes over
 * the next 7, so he pulls ahead toward the next panel (≈ 250 px) and the pan brings him back no faster than ~60 px a frame — his screen x
 * never whips back against the leap. Settled a frame before the kick he lands on, then the landing's 2 % overshoot from the kick.
 */
export function leapFollow(f: number, k: 0 | 1): number {
  const { from, to } = LEAPS[k];
  const t = f - from;
  if (t <= 0) return 0;
  // The second landing holds still (the page steps on the flam instead: FLAM_STEP, splashCam's c2x); the first keeps its 2 % overshoot.
  if (f >= to) return k === 1 ? 1 : 1 + (f - to < 6 ? 0.02 * Math.sin((PI * (f - to)) / 6) : 0);
  if (k === 1) return swish(t);
  const lead = LEADS[k] * (t < 4 ? sF(t / 4) : 1 - sF((t - 4) / (to - from - 5)));
  return launch(t) - lead;
}
/**
 * The page steps on the flam (plan v07 §4 C2: the narrow band opening the lounge strip is a drum the picture must show): the camera
 * moves FLAM_STEP screen px toward the strip, most of it on the flam's own frame (snapL).
 */
export const FLAM_STEP = 30;
/** The camera's nudge toward the guest on the ting (screen px, T10): out 36 px with the launch, back by the dive. */
const tingNudge = (g: number): number => (g < TING ? 0 : 36 * (launch(g - TING) - sF((g - TING - 6) / 16)));
/**
 * How far the dive zooms (≈ 4.7): to where the inset's record, still a hair over its pop on club 3.1 (the launch's rebound), is exactly the
 * bar-3 record's r 1400 — so the landing frame's two halves (the inset, the record) print one record and one face (R2-3).
 */
const DIVE_ZOOM = 1400 / (300 * launch((RECORD - INSET) * 0.75));
/** Bars 1–2's camera (the prototype's c2 without its kick punches: those are the rig's, src/score/club.ts CLUB_ACCENTS). */
function splashCam(f: number): Cam {
  const zb = (g: number): number => ZB * (1 + 0.04 * sF((g - DOT_INKS) / 24));
  const z0 = zb(PULL_BACK);
  const push = LEAPS[0].from - 1 - PULL_BACK;
  // The pull-back snaps out on its kick (plan v07 §4 C1: it peaked a frame or two after it).
  const zA = (t: number): number => lg(z0, 1, snapL(t - PULL_BACK)) * (1 + 0.045 * sF((t - PULL_BACK) / push));
  const cA = (t: number): Pt => {
    const s = snapL(t - PULL_BACK);
    return [lr(E[0], 0, s), lr(E[1], 0, s)];
  };
  if (f < PULL_BACK) return { z: zb(f), cx: E[0], cy: E[1], ro: lr(-2, -1, (f - DOT_INKS) / 24) * D2R };
  if (f < LEAPS[0].from) {
    const c = cA(f);
    return { z: zA(f), cx: c[0], cy: c[1], ro: lr(-1, 1, sF((f - PULL_BACK) / push)) * D2R };
  }
  if (f < LEAPS[1].from) {
    const s = leapFollow(f, 0);
    const c0 = cA(LEAPS[0].from - 1);
    return { z: lg(zA(LEAPS[0].from - 1), Z1, s), cx: lr(c0[0], C1[0], s) + (Math.max(0, f - LEAPS[0].to) * DRIFT1) / Z1, cy: lr(c0[1], C1[1], s), ro: lr(1, 0, cl(s)) * D2R };
  }
  const c2x = (g: number): number => C2[0] + (Math.max(0, g - LEAPS[1].to) * DRIFT2 + tingNudge(g) + FLAM_STEP * snapL(g - FLAM)) / Z2;
  if (f < DIVE.from) {
    const s = leapFollow(f, 1);
    const c0x = C1[0] + ((LEAPS[1].from - LEAPS[0].to) * DRIFT1) / Z1;
    return { z: lg(Z1, Z2, s), cx: lr(c0x, c2x(f), s), cy: lr(C1[1], C2[1], s), ro: 0 };
  }
  const s = cl(impact(f, DIVE.from, DIVE.to));
  const P0: Pt = [(IC[0] - c2x(DIVE.from)) * Z2, (IC[1] - C2[1]) * Z2];
  const z = lg(Z2, Z2 * DIVE_ZOOM, s);
  return { z, cx: IC[0] - (P0[0] * (1 - s)) / z, cy: IC[1] - (P0[1] * (1 - s)) / z, ro: 0 };
}
/**
 * The DJ's nudge (continuity plan v07 §4 C3: the record spun evenly through every frame, so its kicks were only 1.3–1.7 × the picture's
 * change between them): bar 3's turning clock. From the second kick of the bar the record, its rings and the camera's roll turn by
 * beats — on each kick a surge (NUDGE.surge of the beat's turn, 40 % of it on the kick's own frame, 20 % on the next), then a crawl to
 * the next kick; the same turn a beat as before (the needle drop's beat spins as it did). In frames of the even clock it replaces.
 */
export const NUDGE = { surge: 0.6, tau: 0.5 } as const;
export function recordClock(f: number): number {
  const t0 = RECORD + 23.5;
  if (f < t0) return f;
  const n = Math.floor((f - RECORD + 0.5) / 24);
  const t = f - RECORD - 24 * n + 0.5;
  const u = NUDGE.surge * (1 - Math.exp(-t / NUDGE.tau)) + (1 - NUDGE.surge) * (t / 24);
  return t0 + 24 * (n - 1 + u);
}
/** Bar 3's camera: on the record's spindle, pushing 8 % in over the bar, rolling −0.2° a frame (by the nudge's clock), then the rise (I) to r 300 on club 4.1. */
function recordCam(f: number): Cam {
  const rise = f < RISE.from ? 0 : cl((f - RISE.from) / (RISE.to - 1 - RISE.from)) ** 1.4;
  const z = lg(1, 1.08, sF((f - RECORD) / (RISE.from - RECORD))) * lg(1, 0.214 / 1.08, rise);
  return { z, cx: 0, cy: 0, ro: -0.2 * D2R * (recordClock(f) - RECORD) };
}
/** The shot camera of bars 1–3 at instant `f` (engine coordinates, y up; the rig's punches and shakes come on top). */
export const inkAAim = (f: number): Aim => aimOf(f < RECORD ? splashCam(f) : recordCam(f));

// ——— Bar 1 · SPLASH ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The burst front's radius (screen px) `t` frames after the dot inks: full on the dot's own frame (continuity plan v07 §2.3: the club's
 * downbeat is seen where it is heard; it peaked 4 frames late), its spikes in the frame's corners, past them by +2.
 */
export const burstFront = (t: number): number =>
  keys(
    [
      [0, 1150],
      [2, 1500],
      [5, 2400],
      [10, 3200],
    ],
    t,
  );
/**
 * The stutter's spin carried into the burst (plan v07 §2.3, FW5: the old world's motion runs on into the new): the stutter turned the
 * disc 30° clockwise every 3 frames; the burst's rays and spikes go on turning clockwise from 10° a frame, slowing over the first beat
 * (BURST_SPIN° in all), taken at the output frame (crisp: no sub-frame smears a ray). Degrees, clockwise on screen.
 */
export const BURST_SPIN = { total: 40, tau: 4 } as const;
export const burstSpin = (F: number): number => (F < DOT_INKS ? 0 : BURST_SPIN.total * (1 - Math.exp(-(F - DOT_INKS) / BURST_SPIN.tau)));
const BURST_STAR = (t: number, F: number): [number, number][] => {
  const R = burstFront(t) / ZB;
  return starVerts(E[0], E[1], 14, R * 0.73, R, 77, 0.18, 6, (10 * D2R * t) / 11 + burstSpin(F) * D2R);
};
/**
 * The page prints in through the first beat (plan v07 §2.3: it went black → cream in 6 frames): the burst's paper dots grow and stretch
 * along their rays (PRINT_IN.stretch frames), and the paper clears the middle from the eye outward to PRINT_IN.disc px by the pull-back,
 * where the figure and ground swap (the K gaps between the stretched dots are the focus lines, in place).
 */
export const PRINT_IN = { stretch: 22, disc: 560, discFrom: 2, discFrames: 21 } as const;
/** The burst (club 1.1 → +8): the log-polar halftone of paper dots on the void, stretched along their rays behind the front; a paper disc clears the middle from +4. */
function burst(c: Ctx): void {
  const t = c.f - DOT_INKS;
  const F = frameOf(c.f);
  const R = burstFront(t) / ZB;
  const v = BURST_STAR(t, F);
  const spin = burstSpin(F) * D2R;
  // The print-in: the stretch grows with time as well as behind the front.
  const grown = sF(t / PRINT_IN.stretch);
  if (t >= PRINT_IN.discFrom) {
    const r = (PRINT_IN.disc / ZB) * sF((t - PRINT_IN.discFrom) / PRINT_IN.discFrames);
    if (r > 1) ell(c, E[0], E[1], r, r, PAPER);
  }
  for (let j = 0; j < 34; j++) {
    const r = (110 * Math.exp(0.09 * j)) / ZB;
    if (r > R * 1.2) break;
    const s = Math.min(grown, cl((R - r - 106) / (R * 0.5 + 1)));
    const b = 0.026 * r * (1 + 0.6 * s);
    const a = b * (1 + 5 * s);
    const color = j === 0 && t < 2 ? AMBER : PAPER;
    for (let i = 0; i < 72; i++) {
      const th = i * 5 * D2R + spin;
      if (r > edgeAt(v, E[0], E[1], th)) continue;
      const x = E[0] + Math.cos(th) * r;
      const y = E[1] + Math.sin(th) * r;
      if (!onScreen(c, x, y, a)) continue;
      ell(c, x, y, a, b, color, { rot: th });
    }
  }
}
/** Everything outside the jagged front stays the cosmos's void: a fan of void slivers from the front outward (no clip in the engine). */
function burstMask(c: Ctx): void {
  const t = c.f - DOT_INKS;
  const v = BURST_STAR(t, frameOf(c.f));
  const far = 1500 / c.z;
  const tiers: readonly [number, number, number][] = [
    [0.5, 1, 1.6],
    [1, 1.5, 3],
    [2, 2.8, 6],
    [4, 5.5, 12],
  ];
  for (const [step, f0, f1] of tiers) {
    for (let d = 0; d < 360; d += step) {
      const th = d * D2R;
      const R = edgeAt(v, E[0], E[1], th);
      const r0 = R * f0;
      const r1 = Math.min(R * f1, far);
      if (r1 <= r0) continue;
      const w = r1 * step * D2R * 1.8;
      const m = (r0 + r1) / 2;
      rect(c, E[0] + Math.cos(th) * m, E[1] + Math.sin(th) * m, r1 - r0, w, VOID, { rot: th });
    }
  }
}
/** Under his face: the pink Ben-Day rings born on the 16ths, and his amber face plate, 10 px off register on +2, snapping to rest by +12. */
function under(c: Ctx, Y: Layout): void {
  const f = c.f;
  const F = frameOf(f);
  if (F >= BENDAY_RINGS[0]) {
    const k = countTo(BENDAY_RINGS, F) - 1;
    const rp = [260, 440, 620, 800][Math.min(3, k)] / ZB;
    const r = rp * (0.9 + 0.1 * launch(f - BENDAY_RINGS[Math.min(3, k)]));
    ell(c, E[0], E[1], r, r, PINK, { tint: 0.32 * c.dmBig, screen: 13 / ZB, angle: 75 });
  }
  if (f >= DOT_INKS + 2) {
    const pd = 10 * (1 - sF((f - DOT_INKS - 2) / 10));
    ell(c, Y.HS[0] + pd / c.z, Y.HS[1] - pd / c.z, 650 / ZB, 450 / ZB, AMBER, { tint: 0.35 * c.dm, screen: 26 / ZB, angle: 0 });
  }
}
/**
 * His face before the pull-back: ( ω ) in type, the eyes inked discs. v08: both open, Ø 190 — bridge A (src/shots/bridgeA.ts) prints this
 * face round the cosmos's point and opens the point to this eye on its register a beat and a half before club 1.1 (it was the point
 * itself here, Ø 120 → 190 by +3, when the club began on the point's next frame).
 */
function face21(c: Ctx, Y: Layout): void {
  const s = HERO_INK.inked;
  const chars = [...s];
  const z = c.z;
  const lw = Math.min(0.06 * EM1 * z, 40) / z;
  const sh = 21 / ZB;
  for (const i of [0, 2, 4]) T(c, chars[i], Y.HS[0] + cposX(c.L, s, i, EM1), Y.HS[1], EM1, { fl: AMBER, lw, sh: [sh, sh] });
  for (const i of [1, 3]) {
    const x = i === 1 ? E[0] : Y.HS[0] + cposX(c.L, s, i, EM1);
    const r = 95 / ZB;
    inkEll(c, x, Y.HS[1], r, r, AMBER, 10 / ZB, { sh: [sh, sh] });
    ell(c, x - r * 0.38, Y.HS[1] - r * 0.42, 11 / ZB, 5 / ZB, PAPER, { rot: -35 * D2R });
  }
}
/** The lit floor (Saturday Night Fever): 2 × 9 tiles card-flipping up from the centre outward, flat colour under a halftone glow; the stabs step them. */
function floor21(c: Ctx): void {
  const f = c.f;
  const F = frameOf(f);
  const n = countTo(STABS, F);
  const GLOW = new Map<RGB, RGB>([
    [PINK, PAPER],
    [CYAN, PAPER],
    [NIGHT, CYAN],
    [PAPER, PINK],
  ]);
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 9; i++) {
      const d = Math.abs(i - 4);
      const sy = snapL(f - PULL_BACK - d);
      if (sy <= 0.01) continue;
      const x = -1080 + 240 * i + 120;
      const y = 270 + 240 * r + 120;
      let col = [PINK, CYAN, NIGHT, PAPER][(i * 3 + r * 2 + n) % 4];
      if (F >= STOMP && i === 4 && r === 0) col = CYAN;
      if (F >= DISCO && (i === 4 || r === 0)) col = (i + r) % 2 ? PAPER : CYAN;
      const h = 240 * sy;
      rect(c, x, y, 240, h, col, { outline: 4 });
      const glow = GLOW.get(col)!;
      rect(c, x, y, 232, Math.max(0, h - 8), glow, { tint: 0.15, screen: 16, angle: 0 });
      for (const [rr, tone] of [
        [118, 0.3],
        [88, 0.45],
        [58, 0.6],
        [30, 0.78],
      ] as const)
        ell(c, x, y, rr, rr * sy, glow, { tint: tone, screen: 16, angle: 0 });
    }
}
const CROWD_AT: readonly Pt[] = [
  [-860, -60],
  [-660, -210],
  [-430, -330],
  [-170, -400],
  [0, -455],
  [170, -400],
  [430, -330],
  [660, -210],
  [870, -60],
];
/** The corner box (masthead, issue, barcode, his hex typing in) and the tagline ribbon. */
function cover(c: Ctx): void {
  const f = c.f;
  const s = launch(since0(f, CORNER_BOX) * 0.75);
  const ox = -720 - 400 * (1 - s);
  const oy = -395 - 300 * (1 - s);
  const r = 1.5 * D2R;
  const at = (x: number, y: number): Pt => [ox + Math.cos(r) * x - Math.sin(r) * y, oy + Math.sin(r) * x + Math.cos(r) * y];
  inkRect(c, ox, oy, 340, 180, PAPER, 6, { rot: r, sh: [8, 8] });
  tx(c, 'display', COVER.masthead, -150, -58, 34, K, { rot: r, ox, oy });
  tx(c, 'mono', COVER.issue, -150, -22, 18, K, { rot: r, ox, oy });
  for (let i = 0; i < 46; i++)
    if (hash(i, 91) > 0.42) {
      const w = hash(i, 92) > 0.5 ? 4 : 2;
      const [x, y] = at(-150 + i * 6.6 + w / 2, 22);
      rect(c, x, y, w, 44, K, { rot: r });
    }
  if (frameOf(f) >= BARCODE) {
    const n = Math.min(SIGNATURE.length, (frameOf(f) - BARCODE) * 4);
    tx(c, 'mono', SIGNATURE.slice(0, n), -150, 62, 15, K, { rot: r, ox, oy });
  }
  if (frameOf(f) >= TAGLINE) {
    const u = launch(since0(f, TAGLINE) * 0.75);
    const px = -560 - 700 * (1 - u);
    const py = 445;
    const q = -4 * D2R;
    const to = (x: number, y: number): Pt => [px + Math.cos(q) * x - Math.sin(q) * y, py + Math.sin(q) * x + Math.cos(q) * y];
    for (const d of [-1, 1]) {
      const [tx0, ty0] = to(d * 320, 22);
      inkRect(c, tx0, ty0, 60, 68, PINK, 6, { rot: q });
    }
    inkRect(c, px, py, 600, 64, PINK, 6, { rot: q });
    tx(c, 'ui', COVER.tagline, 0, 2, 40, PAPER, { center: true, rot: q, ox: px, oy: py });
  }
}
/** The focus lines' vanishing point at instant `f` (the splash world, y down): his eye, snapping to his feet on the pull-back, sliding down on the stomp. */
function focusPoint(f: number, Y: Layout): Pt {
  let vx = E[0];
  let vy = E[1];
  if (f >= PULL_BACK) {
    const s = snapL(f - PULL_BACK);
    vx = lr(E[0], Y.HS[0], s);
    vy = lr(E[1], Y.HS[1], s);
  }
  if (f >= STOMP) vy = lr(vy, 270, sF((f - STOMP) / 10));
  return [vx, vy];
}
/** The focus lines' vanishing point for tests (engine coordinates, y up). */
export const focusPointOf = (f: number, L: InkLayout): [number, number] => {
  const [x, y] = focusPoint(f, layout(L));
  return [x, -y];
};
/** Bar 1's page (the splash): ground, rings and plate, focus lines, floor, crowd, the hero, BOOM, the cover, CLAP!. */
function splashPage(c: Ctx, Y: Layout): void {
  const f = c.f;
  const F = frameOf(f);
  under(c, Y);
  if (F >= PULL_BACK) {
    const [vx, vy] = focusPoint(f, Y);
    needles(c, vx, vy, f < PULL_BACK ? 250 : lr(250, 300, snapL(f - PULL_BACK)), K);
  }
  if (f >= PULL_BACK) floor21(c);
  // The infected crowd and, from the pull-back, the hero are the output frame's (A1, R2-3: whole through the pull-back and leap 1).
  if (F >= CROWD_UP)
    still(c, (s) => {
      const cn = countTo(CLAPS, F);
      CROWD.forEach((friend, k) => {
        // Their pop is the output frame's too (a face popping 40 px a frame is drawn there, not smeared through the shutter).
        const t = since0(F, CROWD_UP + 2 * Math.abs(k - 4));
        if (t < 0) return;
        const [x, y] = CROWD_AT[k];
        sprite(s, friend.infected, 68, x, y + 120 * (1 - launch(t)) + bob(f, 14), (cn % 2 ? 6 : -6) * D2R * (k % 2 ? 1 : -1), 1, { fl: NIGHT, lw: 3, ko: 0, sk: PAPER });
      });
    });
  if (F < PULL_BACK) face21(c, Y);
  else if (F < LEAPS[0].from)
    still(c, (s) => {
      const face = F < DISCO ? HERO_INK.cheer : HERO_INK.point;
      const cr = F >= DISCO ? 0.12 * sF((tw(f) - DISCO) / 4) : 0;
      const b = F < DISCO ? bob(f, F >= PULL_BACK + 8 && F < STOMP ? 60 : 40) : 0;
      const q = squ(f);
      const nd = nod(f);
      hero(s, face, Y.HS[0], Y.HS[1] + b + cr * 120 + nd[0] / s.z, EM1, { sx: 1 + q + cr, sy: 1 - q - cr, r: nd[1] });
    });
  if (F >= STOMP && f < STOMP + 32) {
    const at: readonly Pt[] = [
      [140, 345],
      [350, 318],
      [550, 276],
      [730, 226],
    ];
    at.forEach(([x, y], i) => {
      const t = since0(f, STOMP + i);
      if (t < 0) return;
      letter(c, LETTERING.boom[i], x + 0.28 * t, y - 0.28 * t, 200, PAPER, popS(t), (-8 + 6 * i) * D2R, (f - STOMP - 12 - 2 * i) / 14, 1, { ht: CYAN });
    });
  }
  if (F >= CORNER_BOX) cover(c);
  if (F >= DISCO - 2 && f < DISCO + 18) {
    const t = f - DISCO;
    const s = land(t) * (f >= DISCO + 10 ? 1 - cI((f - DISCO - 10) / 8) : 1);
    inkStar(c, -640, -140, 13, 120 * s, 185 * s, 31, 0.16, 5, 0, PAPER, 8 * s);
    [...LETTERING.clap].forEach((ch, i) => letter(c, ch, -640 + (i - 2) * 68 * s, -140 + (i % 2 ? 6 : -6) * s, 96, PINK, s, 0, (f - DISCO - 8 - i) / 10, 1, { ex: 5 }));
  }
}

// ——— Bar 2 · THE PAGE ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The light-cycle trail behind a leap: a cyan core on K edges, from the take-off to now (to the landing). */
function trailPts(f: number, f0: number, A: Pt, B: Pt, end: number): Pt[] {
  const pts: Pt[] = [];
  for (let g = f0; g <= Math.min(f, end) + 1e-9; g += 0.5) {
    const q = leap(g, A, B, f0);
    pts.push([q[0], q[1] + 185]);
  }
  if (f < end && f > f0) {
    const q = leap(f, A, B, f0);
    pts.push([q[0], q[1] + 185]);
  }
  return pts;
}
/**
 * The light-cycle trail's weight (T10: a light wall, not a wire — the print breaks anything under ~8 px into dots): a 14 px cyan core on
 * 5 px K edges, screen px. After the landing it narrows to nothing over TRAIL_OFF frames (`k` its width share).
 */
const TRAIL_CORE = 14;
const TRAIL_EDGE = 5;
const TRAIL_OFF = 4;
const trail = (c: Ctx, pts: readonly Pt[], k = 1): void => {
  if (k > 0.02) polyline(c, pts, ((TRAIL_CORE + 2 * TRAIL_EDGE) * k) / c.z, K, (TRAIL_CORE * k) / c.z, CYAN);
};
/** Where the trail crosses, it drops a slanted wall growing up and down over 8 frames. */
function wall(c: Ctx, P: Pt, a: number, f0: number): void {
  const h = 1500 * cO((c.f - f0) / 8);
  if (h <= 0) return;
  band(c, P[0], P[1], a, h, (TRAIL_CORE + 2 * TRAIL_EDGE) / c.z, K);
  band(c, P[0], P[1], a, h, TRAIL_CORE / c.z, CYAN);
}
/** A BOOM band stamps down the gutter line one letter a frame, its fill dissolving while the band narrows into a 28 px gutter. */
function boomBand(c: Ctx, f0: number, P: Pt, a: number, w0: number, fc: RGB, o: SfxOpts & { cap?: number } = {}): void {
  const t = c.f - f0;
  const w = t < 4 ? w0 : lr(w0, 28, sF((t - 4) / 10));
  gutter(c, P[0], P[1], a, w, c.z);
  const m = splashCam(f0 + 1);
  for (let i = 0; i < 4; i++) {
    const ti = since0(c.f, f0 + i);
    if (ti < 0) continue;
    const sy = m.cy + (-390 + 260 * i) / m.z;
    const sx = P[0] + (sy - P[1]) / Math.tan(a);
    letter(c, LETTERING.boom[i], sx, sy, o.cap ?? 200, fc, popS(ti) / c.z, 0, (t - 4 - i) / 10, 1, o);
  }
}
/** A panel gone inactive: one NIGHT dot screen of itself (paper over it, NIGHT dots) on side `sd` of its gutter. */
function inactive(c: Ctx, P: Pt, a: number, sd: number, f0: number): void {
  const A = cl((c.f - f0) / 12);
  if (A <= 0) return;
  half(c, P[0], P[1], a, sd, PAPER, { alpha: 0.86 * A });
  half(c, P[0], P[1], a, sd, NIGHT, { alpha: A, tint: 0.3 * c.dmBig, screen: 17, angle: 45 });
}
/** World point q as camera `from` sees it, re-aimed through camera `to`: drawn there, it lands on the same screen spot under `to`. */
function lockTo(to: Cam, from: Cam, q: Pt): Pt {
  const dx = q[0] - from.cx;
  const dy = q[1] - from.cy;
  const sx = from.z * (Math.cos(from.ro) * dx - Math.sin(from.ro) * dy);
  const sy = from.z * (Math.sin(from.ro) * dx + Math.cos(from.ro) * dy);
  return [to.cx + (Math.cos(to.ro) * sx + Math.sin(to.ro) * sy) / to.z, to.cy + (-Math.sin(to.ro) * sx + Math.cos(to.ro) * sy) / to.z];
}

// ——— The high five (U3: the hands must belong to their characters) ———————————————————————————————————————————————————————————————

/**
 * The high five on club 2.2, one move an audience reads: her arm comes out from behind her own bracket (from club 2.1& + 3), cocks up and
 * back on the 16th before the clap, slaps down onto his raised ノ on the clap (I: the impact star) and bounces back up, raised (L) —
 * approach → contact → recoil on the beat. It is hers: a paper sleeve in her K keyline, its comic glove in the same ink. He rises into it
 * and dips with the slap. Every pose is taken at the output frame (whole on each frame, never smeared: the slap's speed is the star's).
 */
const FIVE = { out: HIGH_FIVE - 9, cock: HIGH_FIVE - 6, slap: HIGH_FIVE, back: HIGH_FIVE + 9 } as const;
/**
 * P1's one ink weight (T6, U3: one language): every K line in the panel — her face, her arm, her glove, the balloon, the burst — prints
 * 9 px solid on screen, the hero's own keyline there (0.6 × 0.06 em at em 250).
 */
const KEY_PX = 9;
type Five = { S: Pt; G: Pt; dir: number; sq: number; em: number; lw: number };
/** His lean into the five (world units, y down): up 8 % of his em as she cocks, a dip on the slap, settled before he leaps (club 2.2&). */
function fiveLean(F: number): number {
  const e = EP1;
  if (F < FIVE.cock || F >= FIVE.back) return 0;
  if (F < FIVE.slap) return -0.08 * e * sF((F - FIVE.cock) / (FIVE.slap - FIVE.cock));
  return lr(0.03 * e, 0, sF((F - FIVE.slap) / (FIVE.back - FIVE.slap)));
}
/** Her shoulder (under her bracket) and her glove at output frame F (world, y down), the glove's heading, its squash; null before it shows. */
function fiveAt(L: InkLayout, Y: Layout, F: number): Five | null {
  if (F < FIVE.out) return null;
  const em = GIRL_EM;
  const S: Pt = [GP[0] + cposX(L, GIRL.host, 0, em) + 0.1 * em, GP[1] + 0.24 * em];
  const rest: Pt = [S[0] - 0.22 * em, S[1] + 0.12 * em];
  const cock: Pt = [S[0] - 0.95 * em, S[1] - 0.62 * em];
  const hit: Pt = [Y.HF[0] + 0.03 * em, Y.HF[1] - 0.05 * em + fiveLean(FIVE.slap)];
  const up: Pt = [S[0] - 0.5 * em, S[1] - 0.66 * em];
  const mix = (a: Pt, b: Pt, u: number): Pt => [lr(a[0], b[0], u), lr(a[1], b[1], u)];
  let G: Pt;
  let sq = 0;
  if (F < FIVE.cock) G = mix(rest, cock, launch((F - FIVE.out) * 1.4));
  else if (F < FIVE.slap) G = mix(cock, hit, ((F - FIVE.cock) / (FIVE.slap - FIVE.cock)) ** 2);
  else if (F < FIVE.slap + 3) {
    G = hit;
    sq = [0.2, 0.12, 0.05][F - FIVE.slap];
  } else G = mix(hit, up, launch((F - FIVE.slap - 3) * 0.9));
  const dir = Math.atan2(G[1] - S[1], G[0] - S[0]);
  return { S, G, dir, sq, em, lw: KEY_PX / Z1 };
}
/** The high five for tests (splash world, y down): her shoulder S and glove G at output frame F, his raised hand HF, her bracket's centre. */
export function highFiveAt(F: number, L: InkLayout): { S: Pt; G: Pt; HF: Pt; bracket: Pt; em: number; lean: number } | null {
  const Y = layout(L);
  const v = fiveAt(L, Y, F);
  return v && { S: v.S, G: v.G, HF: Y.HF, bracket: [GP[0] + cposX(L, GIRL.host, 0, GIRL_EM), GP[1]], em: GIRL_EM, lean: fiveLean(F) };
}
/** Her sleeve: a paper hose from her shoulder to the glove's cuff, bowed at the elbow, inside her K keyline (drawn before her face). */
function fiveArm(c: Ctx, v: Five): void {
  const { S, G, dir, em, lw } = v;
  const W: Pt = [G[0] - Math.cos(dir) * 0.2 * em, G[1] - Math.sin(dir) * 0.2 * em];
  const len = Math.hypot(W[0] - S[0], W[1] - S[1]);
  // The elbow bows out below the line from shoulder to wrist (y down: toward +y), more as the arm folds.
  const bow = 0.22 * len * (1 - cl(len / (1.4 * em))) + 0.06 * em;
  const nx = -(W[1] - S[1]) / (len || 1);
  const ny = (W[0] - S[0]) / (len || 1);
  const sgn = ny > 0 ? 1 : -1;
  const E: Pt = [(S[0] + W[0]) / 2 + sgn * nx * bow, (S[1] + W[1]) / 2 + sgn * ny * bow];
  const pts: Pt[] = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return [(1 - t) ** 2 * S[0] + 2 * t * (1 - t) * E[0] + t * t * W[0], (1 - t) ** 2 * S[1] + 2 * t * (1 - t) * E[1] + t * t * W[1]];
  });
  const w = (i: number): number => lr(0.12, 0.085, i / 10) * em;
  for (let i = 1; i < pts.length; i++) seg(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w(i) + 2 * lw, K);
  for (let i = 1; i < pts.length; i++) seg(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w(i), PAPER);
}
/** Her glove: a comic glove (palm, three fingers, the thumb, the cuff) in paper on her K keyline, heading along her arm; squashed on the slap. */
function fiveGlove(c: Ctx, v: Five): void {
  const { G, dir, em, lw } = v;
  const ax = Math.cos(dir);
  const ay = Math.sin(dir);
  const at = (fw: number, ac: number): Pt => [G[0] + (ax * fw - ay * ac) * em, G[1] + (ay * fw + ax * ac) * em];
  const cuff = at(-0.19, 0);
  inkEll(c, cuff[0], cuff[1], 0.055 * em, 0.15 * em, PAPER, lw, { rot: dir });
  const s1 = 1 + v.sq;
  const s2 = 1 - 0.6 * v.sq;
  const piece = (fw: number, ac: number, rx: number, ry: number, r = 0): Piece => {
    const p = at(fw, ac);
    return { x: p[0], y: p[1], rx: rx * em * s2, ry: ry * em * s1, rot: dir + r };
  };
  inkPieces(c, [piece(0, 0, 0.15, 0.135), piece(0.15, -0.075, 0.075, 0.045), piece(0.17, 0, 0.08, 0.047), piece(0.15, 0.075, 0.075, 0.045), piece(0.02, -0.15, 0.05, 0.085, 0.5)], PAPER, lw / 0.6);
  for (const ac of [-0.037, 0.037]) {
    const a = at(0.07, ac * s1);
    const b = at(0.18, ac * s1);
    seg(c, a[0], a[1], b[0], b[1], lw * 0.6, K);
  }
}

/**
 * P1's Ben-Day ground (T6, R2-5: "a real American-comic look", the prototype's hot pop at ≈ 47 % pink): Lichtenstein's dots drawn as dot
 * instances — round discs on a 45° lattice 40 px apart on screen at P1's rest zoom, r 0.41 of the pitch (53 % of the ground pink, the
 * prototype's 57 %; ≥ 40 % of the whole frame on +108 with her, him and the splash strip in it), clear paper gaps even on a kick (a disc
 * stays round, where the cosine screen closes into a checkerboard past 40 %). They sit on the page (they ride it from frame to frame)
 * and are drawn by the output frame's camera (`still`), so no sub-frame smears them. They thump at a third (radius +7 % on the kicks):
 * a fuller thump swings the frame's luminance past check-flash's 0.1.
 */
const P1_PITCH = 40 / Z1;
const P1_DOT = 0.41;
/** Ellipse instances the ground may take (the most any frame draws is ≈ 1930: leap 2's landing, at P2's wider zoom). */
const P1_DOTS_MAX = 2600;
/** P1's dots in the panel right of gutter W1 (a dot whose centre is on the panel's side; the gutter's band covers the rim). */
function benDay(c: Ctx, W1: Pt, gain: number): void {
  const p = P1_PITCH;
  const r = P1_DOT * p * Math.sqrt(gain);
  const u: Pt = [Math.SQRT1_2 * p, Math.SQRT1_2 * p];
  const v: Pt = [-Math.SQRT1_2 * p, Math.SQRT1_2 * p];
  // The lattice indices that can reach the frame: the frame's corners (with a pitch of room for the rig) in lattice coordinates.
  const { z, cx, cy, ro } = c.cam;
  const hw = (960 + 40) / z;
  const hh = (540 + 40) / z;
  let i0 = Infinity;
  let i1 = -Infinity;
  let j0 = Infinity;
  let j1 = -Infinity;
  for (const [sx, sy] of [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]) {
    // Screen offset (unzoomed) back to the world: the inverse of onScreen's turn.
    const x = cx + Math.cos(ro) * sx + Math.sin(ro) * sy;
    const y = cy - Math.sin(ro) * sx + Math.cos(ro) * sy;
    const i = (x * u[0] + y * u[1]) / (p * p);
    const j = (x * v[0] + y * v[1]) / (p * p);
    i0 = Math.min(i0, i);
    i1 = Math.max(i1, i);
    j0 = Math.min(j0, j);
    j1 = Math.max(j1, j);
  }
  let n = 0;
  for (let i = Math.floor(i0); i <= Math.ceil(i1); i++)
    for (let j = Math.floor(j0); j <= Math.ceil(j1); j++) {
      const x = i * u[0] + j * v[0];
      const y = i * u[1] + j * v[1];
      if (sideOf(W1, WA, x, y) >= 0 || !onScreen(c, x, y, r)) continue;
      if (++n > P1_DOTS_MAX) return;
      ell(c, x, y, r, r, PINK);
    }
}
/** Her ◕ eyes' highlight: the quarter the glyph leaves open, as a paper disc under it (radius, ems; the glyph's ink hides the rest). */
const EYE_R = 0.3;
/**
 * Her ◕ eyes as a comic girl's (T6): inked K — a dark eye whose open quarter is a paper highlight (a paper disc under the glyph) — on a
 * thin paper rim that keeps them off her K outline.
 */
function girlEyes(c: Ctx, s: string, em: number): void {
  [...s].forEach((ch, i) => {
    if (ch !== '◕') return;
    const x = GP[0] + cposX(c.L, s, i, em);
    ell(c, x, GP[1], EYE_R * em, EYE_R * em, PAPER);
    T(c, ch, x, GP[1], em, { fl: K, lw: KEY_PX / c.z, ko: 0, rim: 4 / c.z, rc: PAPER });
  });
}
/** P1, the Lichtenstein panel: the girl (her tear, her balloon), the high five with her own arm and glove, the infection crawling to her mouth. */
function p1(c: Ctx, Y: Layout, W1: Pt): void {
  const f = c.f;
  const F = frameOf(f);
  const z = c.z;
  half(c, W1[0], W1[1], WA, -1, PAPER);
  // Lichtenstein's dots (T6, R2-5), by the output frame's camera, so neither the drift, the leap's pan nor a punch blurs them into mush.
  still(c, (s) => benDay(s, W1, (F >= TEAR && F < HIGH_FIVE ? 1.08 : 1) * c.dmBig));
  if (F >= LEAPS[0].to && F < LEAPS[0].to + TRAIL_OFF) trail(c, clipPolyline(trailPts(f, LEAPS[0].from, Y.HS, HP1, LEAPS[0].to), W1, WA, -1), 1 - (F - LEAPS[0].to) / TRAIL_OFF);
  // Her, her arm and glove, her tear, her balloon, the five and the hero in P1: the output frame's (A1: her infection's payoff is whole on
  // every frame of leap 2, while the page and its gutters carry the pan).
  still(c, (s) => p1Cast(s, Y));
  if (F >= HIGH_FIVE - 2 && f < HIGH_FIVE + 10) {
    const t = f - HIGH_FIVE;
    const s = land(t) * (f >= HIGH_FIVE + 6 ? 1 - cI((f - HIGH_FIVE - 6) / 4) : 1);
    const cx = C1[0] + 640 / z;
    const cy = C1[1] + 300 / z;
    if (s > 0.01) {
      inkStar(c, cx, cy, 12, (100 * s) / z, (150 * s) / z, 41, 0.15, 5, 0, CYAN, (8 * s) / z);
      [...LETTERING.clap].forEach((ch, i) => letter(c, ch, C1[0] + (640 + (i - 2) * 58 * s) / z, cy, 80, PAPER, s / z, 0, 0, 1, { ex: 4 }));
    }
  }
}
/** P1's characters (drawn by `still`): her arm, her face and eyes, the infection, her tear, the balloon, the slap, the hero, her glove. */
function p1Cast(c: Ctx, Y: Layout): void {
  const f = c.f;
  const F = frameOf(f);
  const z = c.z;
  const em = GIRL_EM;
  const inf = F >= INFECTIONS[0];
  const five = fiveAt(c.L, Y, F);
  if (five) fiveArm(c, five);
  const gs = inf ? GIRL.infected : GIRL.host;
  pal(c, gs, GP[0], GP[1], em, { lw: KEY_PX, ko: 0, om: AMBER, skip: '◕' });
  girlEyes(c, gs, em);
  if (f >= INFECTIONS[0] - 4 && f < INFECTIONS[0]) {
    const r = em * 0.16 * sF((f - INFECTIONS[0] + 5) / 4);
    ell(c, Y.GM[0], Y.GM[1], r, r * 0.8, K);
  }
  if (f < INFECTIONS[0] + 6) {
    const sw = F >= TEAR ? 1.3 : 1;
    const tr = F >= TEAR ? (3 * (2 * hash(v07Frame(tw(f)), 3) - 1)) / z : 0;
    const x0 = Y.GE[0] + tr;
    const y0 = Y.GE[1] + em * 0.42;
    const s = em * 0.13 * sw * (f >= INFECTIONS[0] ? 1 - cl((f - INFECTIONS[0]) / 3) : 1);
    if (s > 1) {
      const drop: Piece[] = [
        { x: x0, y: y0 + 0.2 * s, rx: 0.82 * s, ry: 0.8 * s, rot: 0 },
        { x: x0, y: y0 - 0.45 * s, rx: 0.95 * s, ry: 0.42 * s, rot: PI / 2 },
      ];
      inkPieces(c, drop, PAPER, 6 / z, { f2: { color: CYAN, tint: 0.4 * c.dm, screen: 9 / z, angle: 15 } });
    }
    if (f >= INFECTIONS[0])
      for (let i = 0; i < 8; i++) {
        const u = (f - INFECTIONS[0]) / 6;
        const r = (6 * (1 - u)) / z + 1;
        ell(c, x0 + (hash(i, 4) - 0.5) * 90 * u, y0 - 60 * u * hash(i, 5), r, r, CYAN);
      }
  }
  const bx = C1[0] + 650 / Z1;
  const by = C1[1] - 380 / Z1;
  balloon(c, bx, by, 120 / z, 80 / z, GP[0] + 60, GP[1] - em * 0.5, KEY_PX / z);
  gl(c, 'face', inf ? '♪' : '…', bx, by, 90 / z, K);
  if (F >= HIGH_FIVE && f < HIGH_FIVE + 10) {
    // The slap's burst, behind both hands, centred just past the glove's fingertips on his ノ: whole on the clap frame itself (R7: from
    // 0.85, so its spikes clear the glove on 2.2, not a frame later), 1.15 on +2, settled by +5.
    const t = since0(f, HIGH_FIVE);
    const s = (t < 2 ? lr(0.85, 1.15, t / 2) : t < 5 ? lr(1.15, 1, (t - 2) / 3) : 1) * (1 - cl((f - HIGH_FIVE - 6) / 4));
    const hit = fiveAt(c.L, Y, FIVE.slap);
    const tip: Pt = hit ? [hit.G[0] + Math.cos(hit.dir) * 0.22 * hit.em, hit.G[1] + Math.sin(hit.dir) * 0.22 * hit.em] : [Y.HF[0] + 20, Y.HF[1] - 30];
    if (s > 0.01) inkStar(c, tip[0], tip[1], 9, (70 / z) * s, (150 / z) * s, 5, 0.18, 8, 0, PAPER, KEY_PX / 0.6 / z);
  }
  if (F >= HIGH_FIVE && f < INFECTIONS[0])
    for (let i = 0; i < 9; i++) {
      const u = cl((since0(f, HIGH_FIVE) - i * 0.6) / 8);
      const x = lr(Y.HF[0], Y.GE[0], u);
      const y = lr(Y.HF[1], Y.GE[1] + em * 0.4, u) + (u > 0.6 ? lr(0, Y.GM[1] - Y.GE[1] - em * 0.4, (u - 0.6) / 0.4) : 0);
      const r = lr(9, 6, u) / z;
      ell(c, x, y, r, r, AMBER);
    }
  if (F < LEAPS[1].from) {
    const q = squ(f);
    const nd = nod(f);
    hero(c, LEAP_FACE, HP1[0], HP1[1] + bob(f, 40 / z) + nd[0] / z + fiveLean(F), EP1, { sx: 1 + q, sy: 1 - q, r: nd[1] });
  }
  if (five) fiveGlove(c, five);
}
/** The krackle's dots stay put on the page: their layout is P2's, not the camera's. */
const KRACKLE: readonly { a: number; r: number; dots: readonly { dx: number; dy: number; rr: number }[] }[] = Array.from({ length: 40 }, (_, k) => ({
  a: (k / 40) * TAU + hash(k, 1) * 0.1,
  r: ((330 + 1100 * hash(k, 2)) / Z2) * 0.6,
  dots: Array.from({ length: 6 }, (_, i) => ({ dx: ((hash(k, i, 4) - 0.5) * 70) / Z2, dy: ((hash(k, i, 5) - 0.5) * 70) / Z2, rr: ((5 + 16 * hash(k, i, 3)) / Z2) * 0.8 })),
}));
/** P2, the Kirby panel: the krackle, the flexer, the fist bump and his infection, the stray ω spark. */
function p2(c: Ctx, Y: Layout): void {
  const f = c.f;
  const F = frameOf(f);
  const z = c.z;
  const zw = f >= DIVE.from ? Z2 : z;
  const W2 = Y.W2;
  half(c, W2[0], W2[1], WB, -1, CYAN);
  const br = f >= FIST_BUMP ? (launch(f - FIST_BUMP) * 60) / Z2 : 0;
  const turn = f >= TING ? 6 * D2R * launch(f - TING) : 0;
  for (const k of KRACKLE) {
    const a = k.a + turn;
    const r = k.r + br;
    for (const d of k.dots) {
      const x = C2[0] + Math.cos(a) * r + d.dx;
      const y = C2[1] + Math.sin(a) * r * 0.7 + d.dy;
      if (sideOf(W2, WB, x, y) > -d.rr || !onScreen(c, x, y, d.rr)) continue;
      ell(c, x, y, d.rr, d.rr, K);
    }
  }
  if (F >= LEAPS[1].to && F < LEAPS[1].to + TRAIL_OFF) trail(c, clipPolyline(trailPts(f, LEAPS[1].from, LEAP2_FROM, HP2, LEAPS[1].to), W2, WB, -1), 1 - (F - LEAPS[1].to) / TRAIL_OFF);
  // The flexer, the fist bump and the hero: the output frame's (U3; the dive's zoom carries the page, not their faces).
  still(c, (k) => p2Cast(k, Y));
  if (F >= SPARK.from && f < SPARK.from + 20) {
    const o = cposX(c.L, HERO_INK.flex, 3, EP2);
    const P0: Pt = [HP2[0] - coreX(c.L, HERO_INK.flex, EP2) + o, HP2[1]];
    const A: Pt = [C2[0] + 200 / Z2, C2[1] - 420 / Z2];
    const S = Y.SG;
    const bz = (u: number): Pt => [(1 - u) ** 2 * P0[0] + 2 * u * (1 - u) * A[0] + u * u * S[0], (1 - u) ** 2 * P0[1] + 2 * u * (1 - u) * A[1] + u * u * S[1]];
    const u = cl(impact(f, SPARK.from, SPARK.to, 1.6));
    dashes(c, bz, u, 14 / zw, 10 / zw, 4 / zw);
    let q = bz(u);
    if (f >= TING) {
      const t = f - TING;
      q = [S[0] + (t * 24) / zw, S[1] + (t * t * 3 - 20 * t) / zw];
    }
    if (f < SPARK.from + 1) q = [lr(P0[0], q[0], 0.2), P0[1] - (30 / zw) * launch(since0(f, SPARK.from))];
    T(c, 'ω', q[0], q[1], 50 / zw, { fl: AMBER, lw: 4 / zw });
  }
}
/** P2's characters (drawn by `still`): the flexer, the fist bump's ω crawl and star, the hero flexing. */
function p2Cast(c: Ctx, Y: Layout): void {
  const f = c.f;
  const F = frameOf(f);
  const z = c.z;
  const zw = f >= DIVE.from ? Z2 : z;
  const lu = f >= FIST_BUMP - 6 && f < INSET ? sF((f - FIST_BUMP + 6) / 6) * (1 - sF((f - FIST_BUMP - 6) / 6)) : 0;
  const dF: Pt = [(Y.BP[0] - Y.FFist[0]) * 0.5, (Y.BP[1] - Y.FFist[1]) * 0.5];
  const dH: Pt = [(Y.BP[0] - Y.HFist[0]) * 0.5, (Y.BP[1] - Y.HFist[1]) * 0.5];
  const pose = countTo(CLAPS, F) % 2;
  pal(c, F >= INFECTIONS[1] ? FLEXER.infected : FLEXER.host, FXP[0] + lu * dF[0], FXP[1] + lu * dF[1], FLEX_EM, { lw: 7 * (z / zw), r: (4 + (pose ? 3 : 0)) * D2R, om: AMBER, sh: [8 / zw, 8 / zw] });
  if (F >= FIST_BUMP && f < INFECTIONS[1])
    for (let i = 0; i < 7; i++) {
      const u = cl((since0(f, FIST_BUMP) - i * 0.5) / 5);
      const r = lr(9, 6, u) / zw;
      ell(c, lr(Y.BP[0], Y.FM[0], u), lr(Y.BP[1], Y.FM[1], u) - (40 * Math.sin(PI * u)) / zw, r, r, AMBER);
    }
  {
    const q = squ(f);
    const nd = nod(f);
    hero(c, HERO_INK.flex, HP2[0] + lu * dH[0], HP2[1] + bob(f, 40 / zw) + lu * dH[1] + nd[0] / zw, EP2, { sx: 1 + q, sy: 1 - q, r: nd[1] });
  }
  if (F >= FIST_BUMP && f < FIST_BUMP + 10) {
    const s = popS(since0(f, FIST_BUMP)) * (1 - cl((f - FIST_BUMP - 6) / 4));
    if (s > 0.01) inkStar(c, Y.BP[0], Y.BP[1], 8, (45 / zw) * s, (95 / zw) * s, 9, 0.15, 0, 0, PAPER, 8 / zw);
  }
}
/** A dashed path along `bz` (0 → u): `on` px dashes, `off` px gaps, `w` thick. */
function dashes(c: Ctx, bz: (u: number) => Pt, u: number, on: number, off: number, w: number): void {
  let prev = bz(0);
  let run = 0;
  let start: Pt | null = prev;
  for (let g = 0.01; g <= u + 1e-9; g += 0.01) {
    const q = bz(Math.min(g, u));
    run += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
    if (start && run >= on) {
      seg(c, start[0], start[1], q[0], q[1], w, K);
      start = null;
      run = 0;
    } else if (!start && run >= off) {
      start = q;
      run = 0;
    }
    prev = q;
  }
  if (start && run > 0) seg(c, start[0], start[1], prev[0], prev[1], w, K);
}
/** P3, the lounge strip: the antivirus prints in lines; the guest at ease, shades up on his brow, the martini (the honeypot), the red ✦. */
function p3(c: Ctx, Y: Layout): void {
  const f = c.f;
  const z = c.z;
  const zw = f >= DIVE.from ? Z2 : z;
  half(c, W3[0], W3[1], WC, -1, NIGHT);
  // The line screen: paper lines at 30°, 10 px apart, from the flam's gutter rightward.
  const pitch = 10 / zw;
  const la = 30 * D2R;
  const nx = -Math.sin(la);
  const ny = Math.cos(la);
  const span = 1400 / z;
  const mid = nx * c.cam.cx + ny * c.cam.cy;
  const reach = (Math.abs(nx) + Math.abs(ny)) * span;
  for (let k = Math.floor((mid - reach) / pitch); k <= Math.ceil((mid + reach) / pitch); k++) {
    const d = k * pitch;
    // The line {p : n·p = d} along (cos la, sin la); where it meets the gutter line it starts.
    const bx = nx * d;
    const by = ny * d;
    const gx = Math.cos(WC);
    const gy = Math.sin(WC);
    const den = Math.cos(la) * gy - Math.sin(la) * gx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((W3[0] - bx) * gy - (W3[1] - by) * gx) / den;
    const sx = bx + Math.cos(la) * t;
    const sy = by + Math.sin(la) * t;
    const dir = sideOf(W3, WC, sx + Math.cos(la), sy + Math.sin(la)) < 0 ? 1 : -1;
    const L2 = 3000 / zw;
    band(c, sx + dir * Math.cos(la) * (L2 / 2), sy + dir * Math.sin(la) * (L2 / 2), la, L2 / 2, 0.16 * pitch, PAPER);
  }
  // The guest at his table: the output frame's (U3; the dive's zoom carries the strip, not his face).
  still(c, (k) => guest(k, Y));
  // The ting (T10: the antivirus planted where the eye can find it): a RED ✦ Ø 140 on his shades for 6 frames inside a ring of short red
  // focus lines that shoot out from it, while the camera nudges 36 px his way (tingNudge).
  if (frameOf(f) >= TING && f < TING + 6) {
    const t = since0(f, TING);
    const s = popS(t) * (t < 4 ? 1 : 1 - cI((t - 4) / 2));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.31;
      const r0 = lr(60, 150, cO(t / 5)) / zw;
      const r1 = r0 + (lr(70, 20, cl(t / 6)) * (i % 2 ? 0.7 : 1)) / zw;
      seg(c, Y.SG[0] + Math.cos(a) * r0, Y.SG[1] + Math.sin(a) * r0, Y.SG[0] + Math.cos(a) * r1, Y.SG[1] + Math.sin(a) * r1, 9 / zw, RED);
    }
    inkStar(c, Y.SG[0], Y.SG[1], 4, (22 / zw) * s, (70 / zw) * s, 0, 0, 0, PI / 4, RED, 6 / zw);
    T(c, LETTERING.ting, Y.SG[0], Y.SG[1] - 110 / zw, 40 / zw, { atlas: 'sfx', fl: RED, lw: 4 / zw, boil: false });
  }
}
/** The guest at ease at his table (drawn by `still`): the stem, the table top, the martini and its cherry, his face, his shades. */
function guest(c: Ctx, Y: Layout): void {
  const z = c.z;
  const zw = c.f >= DIVE.from ? Z2 : z;
  const G = GUP;
  const em = GUEST_EM;
  inkRect(c, G[0], G[1] + 375 / zw, 24 / zw, 400 / zw, NIGHT, 5 / zw);
  inkEll(c, G[0], G[1] + 175 / zw, 130 / zw, 30 / zw, PAPER, 6 / zw);
  const mx = G[0] - 60 / zw;
  const my = G[1] + 130 / zw;
  // The martini icon: the cone as a stack of capsules narrowing to the stem.
  const cone: Pt[] = [];
  for (let k = 0; k < 5; k++) cone.push([my - (34 / zw) * (1 - (k + 0.5) / 5), (28 / zw) * (1 - (k + 0.5) / 5)]);
  for (const [y, hw] of cone) seg(c, mx - hw, y, mx + hw, y, 34 / zw / 5 + 8 / zw, K);
  for (const [y, hw] of cone) seg(c, mx - hw, y, mx + hw, y, 34 / zw / 5 + 1 / zw, CYAN);
  inkRect(c, mx, my + 18 / zw, 4 / zw, 36 / zw, PAPER, 3 / zw);
  inkEll(c, mx + 8 / zw, my - 38 / zw, 9 / zw, 9 / zw, RED, 3 / zw);
  pal(c, GUEST_INK.calm, G[0], G[1], em, { lw: 6 * (z / zw), om: null });
  for (const g of Y.GS) inkEll(c, g[0], g[1], em * 0.2, em * 0.2, NIGHT, 6 / zw);
}
/** The record's turn (radians, clockwise on screen): 0.8° a frame; on the scratch (club 2.4&) the cat smears it back 1.5 turns over 6 frames. Bar 3 reads the same function: one record across the dive (E5); the cocktail's garnish carries it on (E6). */
export const recordAngle = (f: number): number =>
  f < INSET ? 0.8 * D2R * (f - INSET) : f < INSET + 6 ? -1.5 * TAU * sF((f - INSET) / 6) : -3 * PI + 0.8 * D2R * (recordClock(f) - INSET - 6);
/** The cat DJ's round inset: the record from above (his hex on the label), its border cut by WIKKA-WIKKA; the cat in flat headphones peeks over. */
function inset(c: Ctx): void {
  const f = c.f;
  const zw = Z2;
  const s = launch((f - INSET) * 0.75);
  const r = (300 / Z2) * s;
  if (r < 1) return;
  // The cat DJ peeks over the rim: the output frame's — his pop, his bob and the camera (U3; the dive's zoom carries the page, not his face).
  const F = frameOf(f);
  const catPop = launch((F - INSET) * 0.75);
  const cq = (130 / Z2) * cl((catPop - 0.3) / 0.6);
  const cx = IC[0] - 40 / Z2;
  // His bob oscillates on the film frame as approved on the 61-bar map (v07Frame; v08 integrator: bridge A moved the club 96 frames, which
  // re-phased this sine on club 2.4+14 … +20).
  const cy = IC[1] - (300 / Z2) * catPop - cq * 0.25 + (18 * Math.sin(v07Frame(F) * 0.9)) / Z2;
  if (cq > 1)
    still(c, (k) => {
      pal(k, CAT_INK, cx, cy, cq, { lw: 6 * (k.z / zw), om: null });
      // Flat headphones: the band (an arc of capsules) and two pink cups.
      const hr = cq * 0.62;
      let prev: Pt | null = null;
      for (let i = 0; i <= 10; i++) {
        const a = PI * 1.08 + (i / 10) * PI * 0.84;
        const q: Pt = [cx + Math.cos(a) * hr, cy - cq * 0.15 + Math.sin(a) * hr];
        if (prev) seg(k, prev[0], prev[1], q[0], q[1], 12 / zw, K);
        prev = q;
      }
      for (const d of [-1, 1]) inkEll(k, cx + d * cq * 0.62, cy - cq * 0.05, cq * 0.14, cq * 0.22, PINK, 6 / zw);
    });
  // The rim: a K disc with 40 small teeth, the record inside, a K ring.
  inkPieces(c, starPieces(starVerts(IC[0], IC[1], 40, r + 2 / zw, r + 13 / zw, 3, 0.15), IC[0], IC[1]), K, 0);
  drawRecord(c, f, true, (g) => ({ ox: IC[0], oy: IC[1], sc: ((300 / Z2) * launch((g - INSET) * 0.75)) / 1400 }));
  shp(c, 'ring', IC[0], IC[1], 2 * r + 10 / zw, 2 * r + 10 / zw, K, { r: 10 / zw });
  const pw = IC[0] + r * 0.72;
  const ph = IC[1] - r * 0.66 + (f < INSET + 6 ? (Math.sin((f - INSET) * 2) * 20) / Z2 : 0);
  inkEll(c, pw, ph, 26 / zw, 20 / zw, PAPER, 5 / zw);
  recordLettering(c, f, IC[0], IC[1], r / 1400);
  [...LETTERING.wikka].forEach((ch, i) => {
    const t = f - INSET - i / 2;
    if (t < 0) return;
    const a = (-160 + 15 * i) * D2R;
    const rr = r + 34 / zw;
    letter(c, ch, IC[0] + Math.cos(a) * rr, IC[1] + Math.sin(a) * rr, 44, PAPER, popS(t) / zw, a + PI / 2, 0, 1, { ex: 3 });
  });
}
/** Whether any of the screen seen by `cam` lies right of the gutter line through P (direction a): the panel there is in the picture. */
function stripVisible(cam: Cam, P: Pt, a: number): boolean {
  const h = 640 / cam.z;
  const x0 = P[0] + (cam.cy - h - P[1]) / Math.tan(a);
  const x1 = P[0] + (cam.cy + h - P[1]) / Math.tan(a);
  return Math.min(x0, x1) < cam.cx + 1040 / cam.z;
}
/** Bars 1–2 at instant `f`. */
function splashAt(f: number, L: InkLayout): InkDraw[] {
  const Y = layout(L);
  const cam = splashCam(f);
  const pose = poseOf(cam);
  // The burst's beat: the dot inks, the page prints in (PRINT_IN) until the pull-back swaps figure and ground (plan v07 §2.3).
  if (frameOf(f) < PULL_BACK) {
    const p = new Pen(pose, VOID);
    const c = ctxOf(p, L, f, cam, splashCam(frameOf(f)));
    burst(c);
    under(c, Y);
    // v08: the face over the burst's mask — bridge A has printed it whole a bar before, so the jagged front no longer cuts it.
    burstMask(c);
    face21(c, Y);
    tss(p, c, f);
    return p.done();
  }
  const p = new Pen(pose, PAPER);
  const c = ctxOf(p, L, f, cam, splashCam(frameOf(f)));
  const z = cam.z;
  const F = frameOf(f);
  /** Is any of the screen left of the gutter line through P (direction a)? */
  const leftVisible = (P: Pt, a: number): boolean => {
    const h = 640 / z;
    const x0 = P[0] + (cam.cy - h - P[1]) / Math.tan(a);
    const x1 = P[0] + (cam.cy + h - P[1]) / Math.tan(a);
    return Math.max(x0, x1) > cam.cx - 1040 / z;
  };
  const { W1, W2 } = Y;
  /** Is any of the screen right of the gutter line through P? */
  const rightVisible = (P: Pt, a: number): boolean => stripVisible(cam, P, a);
  if (f < BANDS[0] || leftVisible(W1, WA)) {
    splashPage(c, Y);
    if (f >= LEAPS[0].from + 6) inactive(c, W1, WA, 1, LEAPS[0].from + 6);
  }
  if (F >= BANDS[0] && (f < BANDS[1] || leftVisible(W2, WB))) {
    p1(c, Y, W1);
    if (f >= INFECTIONS[0] + 2) inactive(c, W2, WB, 1, INFECTIONS[0] + 2);
  }
  if (F >= BANDS[1]) p2(c, Y);
  if (F >= FLAM && rightVisible(W3, WC)) p3(c, Y);
  // The leaps are the output frame's: every sub-frame of a take-off or a landing frame shows him in one place only.
  const inLeap = (k: 0 | 1): boolean => F >= LEAPS[k].from && F < LEAPS[k].to;
  if (inLeap(0)) trail(c, trailPts(f, LEAPS[0].from, Y.HS, HP1, LEAPS[0].to));
  if (f >= LEAPS[0].from + 2 && f < LEAPS[0].to) wall(c, W1, WA, LEAPS[0].from + 2);
  if (F >= BANDS[0]) {
    if (f < BANDS[0] + 16) boomBand(c, BANDS[0], W1, WA, 260, PINK);
    else if (leftVisible(W1, WA)) gutter(c, W1[0], W1[1], WA, 28, z);
  }
  if (inLeap(1)) trail(c, trailPts(f, LEAPS[1].from, LEAP2_FROM, HP2, LEAPS[1].to));
  if (f >= LEAPS[1].from + 4 && f < LEAPS[1].to) wall(c, W2, WB, LEAPS[1].from + 4);
  const zw = f >= DIVE.from ? Z2 : z;
  if (F >= BANDS[1]) {
    if (f < BANDS[1] + 16) boomBand(c, BANDS[1], W2, WB, 260, CYAN);
    else gutter(c, W2[0], W2[1], WB, 28, zw);
  }
  if (F >= FLAM) {
    if (f < FLAM + 16) boomBand(c, FLAM, W3, WC, 160, K, { lc: PAPER, cap: 150, ex: 4 });
    else gutter(c, W3[0], W3[1], WC, 28, zw);
  }
  // The hero in the air between panels (over the gutters), with three ghost multiples and his colour plate pulled along his motion.
  // U3 (no blur smear on a face) and R6: the pan follows him (leapFollow), so on screen he moves ~30–90 px a frame, and he
  // is photographed by the leap's own short shutter (LEAP_SHUTTER, an eighth of a frame: a 5–12 px streak) — never smeared, never a sharp
  // cut-out jumping against the moving page. The multiples hang where the frames before saw him (lockTo); his speed is drawn — the
  // multiples, the trail, the plate pulled along his motion.
  const camF = c.camF;
  const flight = (A: Pt, B: Pt, f0: number, e0: number, e1: number): void => {
    const emF = lr(e0, e1, cl((F - f0) / 12)) * (camF.z / cam.z);
    for (let i = 3; i > 0; i--) {
      const g = F - 2 * i;
      if (g < f0) continue;
      const q = lockTo(cam, camF, leap(g, A, B, f0));
      T(c, LEAP_FACE, q[0] - coreX(L, LEAP_FACE, emF), q[1], emF, { fl: K, a: [0.12, 0.25, 0.4][i - 1], boil: false });
    }
    const q0 = leap(f, A, B, f0);
    const q1 = leap(f - 1, A, B, f0);
    const sp = Math.hypot(q0[0] - q1[0], q0[1] - q1[1]) * z;
    hero(c, LEAP_FACE, q0[0], q0[1], lr(e0, e1, cl((f - f0) / 12)), { pl: [Math.min(12, sp / 30) / z, 0] });
  };
  if (inLeap(0)) flight(Y.HS, HP1, LEAPS[0].from, EM1, EP1);
  if (inLeap(1)) flight(LEAP2_FROM, HP2, LEAPS[1].from, EP1, EP2);
  if (f >= INSET) inset(c);
  tss(p, c, f);
  return p.done();
}
/** tss on club 1.1&, upper right, in screen space. */
function tss(p: Pen, c: Ctx, f: number): void {
  const F = frameOf(f);
  if (F >= club(1, 0.5) - 2 && F < club(1, 0.5) + 14) {
    p.at(SCREEN);
    const sc: Ctx = { ...c, cam: { z: 1, cx: 0, cy: 0, ro: 0 }, z: 1 };
    [...LETTERING.tss].forEach((ch, i) => letter(sc, ch, 600 + i * 34, -380, 44, PINK, land(f - club(1, 0.5)), 0, (f - club(1, 0.5) - 6) / 8, 1, { ex: 3 }));
  }
}

// ——— Bar 3 · THE RECORD (and the inset: one record) —————————————————————————————————————————————————————————————————————————————

/** The groove bands lit in 12 sectors (r from, r to). */
const GROOVE_BANDS: readonly Pt[] = [
  [300, 450],
  [480, 680],
  [720, 920],
  [960, 1380],
];
/** The three chorus lines: radius and size of each ring's faces (castClub.ts RINGS: who and how many). */
const RING_AT: readonly { R: number; em: number }[] = [
  { R: 330, em: 84 },
  { R: 560, em: 52 },
  { R: 800, em: 60 },
];
/** His hex twice round the label's rim. */
const LABEL_TEXT = [...`${SIGNATURE} · ${SIGNATURE} · `];
/** The Berkeley step: every ring jumps 1/32 turn on each & of bar 3. */
const berkeley = (f: number): number => {
  const n = countTo(BERKELEY_STEPS, f);
  return n === 0 ? 0 : 11.25 * D2R * (n - 1 + snapL(f - BERKELEY_STEPS[n - 1]));
};
/** The rise's backdrop: the whole frame (screen px, with room for the rig's shake), and its Ben-Day tint (round dots with gaps). */
const RISE_FIELD: readonly Pt[] = [
  [-1100, -700],
  [1100, -700],
  [1100, 700],
  [-1100, 700],
];
const RISE_TINT = 0.34;
/** Where a record is at instant `g`: its spindle (ox, oy) and the world units of one record unit (r 1400). */
type Place = (g: number) => { ox: number; oy: number; sc: number };
/** The dot angles of the lit groove sectors (the prototype's dt(), degrees clockwise): pink, cyan, paper. */
const SECTOR_ANGLES = [75, 15, 45] as const;
/**
 * The record at instant `f`, where `place` puts it: the vinyl, the lit groove sectors stepping on the stabs, the grooves, the pink label
 * with his hex, the sheen, the Busby Berkeley rings (popping up on club 3.1, the FLOWER on 3.3, nudged by the fill), and him on the label
 * hopping on the claps. `small`: inside the inset (no nod).
 *
 * T5 (the record must not print as static): the sectors' and the sheen's dots are fixed screens printed on the record as its output frame
 * sees it, so no sub-frame smears them; the chorus lines are taken at the output frame and held where its camera saw them through the
 * shutter (lockTo, as the leaps' multiples), so the Berkeley steps and the counter-rotation read as crisp formations, never as blur the
 * print re-inks into blobs; the grooves stay dark — NIGHT at full strength, never thinner than the print's plates can hold.
 */
function drawRecord(c: Ctx, f: number, small: boolean, place: Place): void {
  const F = frameOf(f);
  const { ox, oy, sc } = place(f);
  const pF = place(F);
  const ra = recordAngle(f);
  const raF = recordAngle(F);
  const n = countTo(STABS, F);
  const at = (x: number, y: number): Pt => [ox + sc * x, oy + sc * y];
  const turned = (x: number, y: number): Pt => at(Math.cos(ra) * x - Math.sin(ra) * y, Math.sin(ra) * x + Math.cos(ra) * y);
  ell(c, ox, oy, 1400 * sc, 1400 * sc, K);
  // Screen px a record unit at the output frame. The sectors' dots never print under 7 px apart (the print's moiré guard); as the record
  // shrinks into the rise they thin out, so it ends a dark disc with colour in it, not a grey one. In the cat's inset (the dive) they stay
  // bold comic dots, 11 px or more apart, at full tone: the inset is a coloured record coming at us.
  const px = pF.sc * c.camF.z;
  const pitch = Math.max(20, (small ? 11 : 7) / Math.max(px, 1e-4));
  const thin = small ? 1.15 : lr(0.6, 1, cl((20 * px - 6) / 12));
  const sectors: Poly[] = [];
  for (let k = 0; k < 12; k++)
    for (let b = 0; b < 4; b++) {
      const ci = (k * 5 + b * 3 + n) % 5;
      if (ci > 2) continue;
      const a0 = k * 30 * D2R;
      const [r0, r1] = GROOVE_BANDS[b];
      sectors.push({ tri: sectorTri(turned, r0, r1, a0, a0 + 28 * D2R, 10), color: [PINK, CYAN, PAPER][ci], tint: 0.3 * c.dmBig * thin, screen: pitch, angle: -SECTOR_ANGLES[ci] * D2R, fixed: true });
    }
  c.p.poly(anchorIn(c.camF, [pF.ox, pF.oy], pF.sc, raF), ...sectors);
  // The grooves: the prototype's 5 record units of NIGHT at full strength, never under 4 px on screen (the plates print a thinner chromatic
  // line as bare paper, and a translucent one — part ink, part key — as grey), taken at the output frame (the dive's and the rise's zoom
  // would smear the rings into a grey haze). Once they crowd under 20 px apart (the inset, the end of the rise) they drop out one by one
  // (a fixed scattered order) until none is left at 14 px, and the record is a dark disc with the sectors' colour in it.
  const gs = 26 * px;
  const ga = cl((gs - 14) / 6);
  const k = (c.camF.z * pF.sc) / (c.cam.z * sc || 1);
  const gw = Math.max(5 * sc * k, 4 / c.cam.z);
  const [gx, gy] = lockTo(c.cam, c.camF, [pF.ox, pF.oy]);
  if (ga > 0) for (let r = 310, i = 0; r < 1390; r += 26, i++) if (hash(i, 61) < ga) shp(c, 'ring', gx, gy, 2 * r * sc * k + gw, 2 * r * sc * k + gw, NIGHT, { r: gw });
  const nudge = (i: number, g: number): number => {
    const h = [FILL[2], FILL[1], FILL[0]][i];
    return g >= h && g < h + 6 ? 12 * Math.sin((PI * (g - h)) / 6) : 0;
  };
  const ln = f >= FILL[3] && f < FILL[3] + 6 ? 1 + 0.05 * Math.sin((PI * (f - FILL[3])) / 6) : 1;
  inkEll(c, ox, oy, 240 * ln * sc, 240 * ln * sc, PINK, 6 * sc);
  LABEL_TEXT.forEach((ch, i) => {
    const th = ra + (i / LABEL_TEXT.length) * TAU;
    const [x, y] = at(212 * ln * Math.sin(th), -212 * ln * Math.cos(th));
    gl(c, 'mono', ch, x, y, 18 * ln * sc, K, { rot: th });
  });
  // The sheen: two paper wedges fixed to the floor (not the record), shifting 2° on each &.
  const so = 2 * D2R * countTo(BERKELEY_STEPS, F);
  c.p.poly(
    anchorIn(c.camF, [pF.ox, pF.oy], pF.sc),
    ...[-50, 130].map((a): Poly => ({ tri: sectorTri(at, 300, 1380, a * D2R + so, (a + 9) * D2R + so, 6), color: PAPER, tint: 0.3 * c.dmBig * thin, screen: Math.max(14, 7 / Math.max(px, 1e-4)), angle: -45 * D2R, fixed: true })),
  );
  // The chorus lines, at the output frame.
  const atF = (x: number, y: number): Pt => [pF.ox + pF.sc * x, pF.oy + pF.sc * y];
  const fl = [0, 1, 2].map((i) => (F >= FLOWER ? snapL(F - FLOWER - 2 * i) : 0));
  const breathe = F >= FLOWER + 12 ? 1 + 0.03 * Math.sin(PI * cl((F - FLOWER - 12) / 12)) : 1;
  const cn = countTo(CLAPS, F);
  const st = berkeley(F);
  const dro = c.camF.ro - c.cam.ro;
  RINGS.forEach((ring, ri) => {
    const { R, em } = RING_AT[ri];
    const N = ring.count;
    const t = F - RECORD - 2 * ri;
    // The dancers squash on each kick (the DJ's nudge, plan v07 §4 C3).
    const pop = (F < RECORD ? 1 : t < 0 ? 0.7 : 0.7 + 0.3 * launch(t)) * (F > RECORD ? 1 - 0.12 * bumpAt(F) : 1);
    const base = ri === 0 ? -0.6 * D2R * (recordClock(F) - RECORD) : ri === 1 ? raF : -1 * D2R * (recordClock(F) - RECORD);
    for (let i = 0; i < N; i++) {
      let a = base + st + (i / N) * TAU;
      let r = R + nudge(ri, F);
      if (fl[ri] > 0) {
        let a2 = a;
        let r2 = r;
        if (ri === 1) {
          a2 = base + st + (i >> 1) * 72 * D2R;
          r2 = (i % 2 ? 640 : 420) * breathe;
        } else if (ri === 2) {
          a2 = base + st + (i >> 1) * 45 * D2R;
          r2 = i % 2 ? 900 : 740;
        } else r2 = 280;
        a = lr(a, a2, fl[ri]);
        r = lr(r, r2, fl[ri]);
      }
      const out = ri === 0 && F < SWAP ? PI : ri === 0 ? PI * (1 - snapL(F - SWAP)) : 0;
      const tl = (cn % 2 ? 1 : -1) * 10 * D2R * (i % 2 ? 1 : -1) + (ri === 0 && fl[0] > 0 ? (PI / 3) * fl[0] : 0);
      const [x, y] = lockTo(c.cam, c.camF, atF(Math.cos(a) * r, Math.sin(a) * r));
      if (!onScreen(c, x, y, em * sc * k * 3)) continue;
      sprite(c, ring.friend.infected, em * sc * k, x, y, a + PI / 2 + out + tl + dro, pop, { lw: 4 * sc * k, ko: 0 });
    }
  });
  // His hop and 30° turn on each clap, keyed to the output frame's clap (a sub-frame before the clap on its own frame would still show the
  // last turn at full: the face double-printed on 3.2 and 3.4).
  // He is the output frame's too (R2-3: the dive's last frames smeared his face into the label's pink): his place, hop and turn at the
  // output frame, drawn by its camera on every sub-frame.
  const hp = Math.max(0, F - lastOf(CLAPS, F));
  const tn = (cn % 2 ? 15 : -15) * D2R * launch(hp);
  // No nod in the small inset; on the landing frame the inset's half of the shutter is already the record, so it nods with it.
  const nd = small && F < RECORD ? [0, 0] : nod(f);
  still(c, (k) => hero(k, HERO_INK.inked, pF.ox, pF.oy - pF.sc * (hp < 12 ? 40 * Math.sin((PI * hp) / 12) : 0) + nd[0] / k.z, 180 * pF.sc, { r: tn + nd[1] }));
}
/**
 * The record's lettering, in its own place (spindle at (ox, oy), `sc` world units a record unit): BOOM on the free band at 12 o'clock
 * landing on club 3.1 (from 1.6× over the dive's last two frames, so it is whole on the downbeat), BOOM at 6 o'clock on the FLOWER, tss on
 * the label's rim on 3.1& and 3.3&.
 */
function recordLettering(c: Ctx, f: number, ox: number, oy: number, sc: number): void {
  if (f >= RECORD - 2 && f < RECORD + 20)
    [...LETTERING.boom].forEach((ch, i) => {
      const a = (-90 + (i - 1.5) * 15) * D2R;
      letter(c, ch, ox + sc * Math.cos(a) * 452, oy + sc * Math.sin(a) * 452, 120, PINK, land(f - RECORD) * sc, a + PI / 2, (f - RECORD - 8) / 10, 1, { ex: 6 });
    });
  if (f >= FLOWER - 2 && f < FLOWER + 20)
    [...LETTERING.boom].forEach((ch, i) => {
      const a = (90 - (i - 1.5) * 14) * D2R;
      letter(c, ch, ox + sc * Math.cos(a) * 458, oy + sc * Math.sin(a) * 458, 110, CYAN, land(f - FLOWER) * sc, a - PI / 2, (f - FLOWER - 8) / 10, 1, { ex: 5 });
    });
  for (const t0 of [club(3, 0.5), club(3, 2.5)])
    if (f >= t0 - 2 && f < t0 + 12)
      [...LETTERING.tss].forEach((ch, i) => {
        const a = (-40 + i * 9) * D2R;
        letter(c, ch, ox + sc * Math.cos(a) * 300, oy + sc * Math.sin(a) * 300, 40, PAPER, land(f - t0) * sc, a + PI / 2, (f - t0 - 4) / 8, 1, { ex: 3 });
      });
}
/** Bar 3 at instant `f`. */
function recordAt(f: number, L: InkLayout): InkDraw[] {
  const cam = recordCam(f);
  const p = new Pen(poseOf(cam), PAPER);
  const c = ctxOf(p, L, f, cam, recordCam(frameOf(f)));
  const z = cam.z;
  // The rise's backdrop (T9): once the record's edge is in the frame, a vivid pink Ben-Day field — a screen-fixed 24 px pitch (the
  // prototype's dt(PK, .4, 24, 45)) that never shrinks with the camera under the print's moiré guard into flat peach.
  if (1400 * z < 1140) {
    const back = p.pose;
    p.at(SCREEN);
    c.p.poly(undefined, { tri: fanOf(RISE_FIELD), color: PINK, tint: RISE_TINT * c.dmBig, screen: 24, angle: -45 * D2R, fixed: true });
    p.at(back);
  }
  drawRecord(c, f, false, () => ({ ox: 0, oy: 0, sc: 1 }));
  recordLettering(c, f, 0, 0, 1);
  // The antivirus's scan line, a beat late (club 3.3 → 3.3a): a red line and a red line-screen band sweeping the frame top to bottom.
  if (f >= SCAN_SWEEP.from && f < SCAN_SWEEP.to) {
    p.at(SCREEN);
    const sc: Ctx = { ...c, cam: { z: 1, cx: 0, cy: 0, ro: 0 }, z: 1 };
    const y = -560 + 1120 * ((f - SCAN_SWEEP.from) / (SCAN_SWEEP.to - SCAN_SWEEP.from));
    for (let ly = Math.ceil((y - 46) / 10) * 10; ly < y - 6; ly += 10) rect(sc, 0, ly + 2.25, 1920, 4.5, RED);
    rect(sc, 0, y, 1920, 6, RED);
  }
  monitorPlate(p, f, L);
  return p.done();
}

/**
 * The party monitor's plate (round 1 hand-off, as clubInkB's monitorPlate does in window C): over the record's busy, light page the
 * readout's 62 % PANEL let the dancers and the dots through its rows, so the record prints a solid K plate under the box (the box's own
 * geometry from inkHudContent, appearing and fading with it). The readout itself is unchanged (the break's box hand-off stays exact).
 */
function monitorPlate(p: Pen, f: number, L: InkLayout): void {
  const box = inkHudContent(frameOf(f), L.advance.readout).under[0];
  if (!box || box.kind !== 'rect') return;
  const a = Math.min(1, (box.alpha ?? 0) / HUD.panel);
  if (a <= 0.001) return;
  p.at(SCREEN);
  p.shape({ kind: 'rect', x: box.x, y: box.y, w: box.w, h: box.h, color: K, ...(a < 1 ? { alpha: a } : {}) });
}

// ——— The parts ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The anchor of the print's dot screen for a camera: the dots ride the world like ink on the page (zoom kept where the dots stay ≥ 5 px). */
function anchorOf(a: Aim, z = a.zoom): { x: number; y: number; zoom: number; roll: number } {
  const zoom = cl(z, 5 / 16, 2.2);
  const cs = Math.cos(a.roll);
  const sn = Math.sin(a.roll);
  return { x: -zoom * (cs * a.x - sn * a.y), y: -zoom * (sn * a.x + cs * a.y), zoom, roll: a.roll };
}

/**
 * The leaps and the dive move 300–400 px a frame: at the house 180° shutter a printed blur smears him past reading and the pass turns
 * every smeared dot into noise, so they shoot at 43° and 126° (sheet §10.2: a shorter shutter where a trail turns to noise).
 */
const LEAP_SHUTTER = 0.12;
const DIVE_SHUTTER = 0.35;
/**
 * Everywhere else the print shoots at 0.3 of a frame (as bars 4–6, clubInkB.ts PRINT_SHUTTER): the blur is summed before the comic pass,
 * which re-inks every smeared keyline as a string of key dots — a rig punch at 0.5 beaded P1's outlines.
 */
const PRINT_SHUTTER = 0.3;
/**
 * The record (T5): 0.25 from the landing on — the Berkeley steps, the counter-rotating rings and the roll at 0.5 smeared the dancers and
 * the dots into static the print reprinted as blobs.
 */
const RECORD_SHUTTER = 0.25;
/** The print's inks without red: red belongs to the antivirus, and the pass would print a pale pink, or pink smeared over amber, as red. */
const INKS_NO_RED = COMIC_INKS.filter((i) => !i.color.every((v, k) => Math.abs(v - RED[k]) < 1e-6));
/** Whether the antivirus's red is in the picture on output frame `F` (the lounge strip on screen; the scan line): only then the print keeps red. */
function redOnScreen(F: number): boolean {
  if (F >= SCAN_SWEEP.from - 1 && F <= SCAN_SWEEP.to) return true;
  if (F < FLAM || F > RECORD) return false;
  return [F - 0.5, F, Math.min(F + 0.5, RECORD - 0.01)].some((f) => stripVisible(splashCam(f), W3, WC));
}
/** The print of output frame `F`: the comic pass riding the camera (in the dive its dots grow from P2's print to the record's, so the cut lands on the record's own dots). */
function printOf(F: number): Look {
  const a = inkAAim(F);
  const zoom = F >= DIVE.from && F < RECORD ? lg(Z2, 1, cl(impact(F, DIVE.from, DIVE.to))) : a.zoom;
  return inkLook(F, { screen: anchorOf(a, zoom), ...(redOnScreen(F) ? {} : { inks: INKS_NO_RED }), ...(F >= RECORD ? { offsets: recordPlates(F) } : {}) });
}
/**
 * The record's plates (T5): the register slip on its claps at a tenth of the club's. The colour plates print a chromatic line where they
 * land and leave paper where it was drawn, so every NIGHT groove on the K vinyl prints a paper sliver as wide as the plates are off: at the
 * club's 8 px slip the record went white on 3.2 and 3.4, and at a quarter of it the grooves still printed half pale. A tenth (≤ 0.8 px past
 * the rest's 1.8) keeps them dark; the claps still swap, hop and punch.
 */
const RECORD_SLIP = 0.1 * (8 / 12);
export function recordPlates(F: number): { c: [number, number]; m: [number, number]; y: [number, number] } {
  const p = plateAt(F);
  const o: [number, number] = [PLATE_REST[0] + RECORD_SLIP * (p[0] - PLATE_REST[0]), PLATE_REST[1] + RECORD_SLIP * (p[1] - PLATE_REST[1])];
  return { c: o, m: o, y: o };
}

/** The instants the splash part draws: from the dot inking to the dive's landing on club 3.1 (the record's). */
export const SPLASH_RANGE = { from: CLUB.from, to: club(3) } as const;
/** Club bars 1–2 at instant `f`. */
export const splashFrame = (f: number, L: InkLayout): InkDraw[] => splashAt(f, L);
/**
 * Design §10.3: the burst front (64), the pull-back (48), the leaps and the bands (96: ~400 px a frame), the dive through the ring (96).
 * The pull-back shoots at the leaps' short shutter (R2-3: at 0.5 its launch dissolved the first full view of him into dot clouds; he is
 * the output frame's now, and the focus lines and the floor carry the move).
 */
export function splashTemporal(frame: number): Temporal {
  if (frame >= DOT_INKS && frame < DOT_INKS + 6) return shutter(64);
  if (frame >= PULL_BACK && frame < PULL_BACK + 7) return shutter(48, LEAP_SHUTTER);
  if (frame >= LEAPS[0].from && frame <= LEAPS[0].to) return shutter(96, LEAP_SHUTTER);
  if (frame >= LEAPS[1].from && frame <= FLAM) return shutter(96, LEAP_SHUTTER);
  if (frame >= DIVE.from && frame < DIVE.to) return shutter(96, DIVE_SHUTTER);
  return shutter(24, PRINT_SHUTTER);
}
/** Printed: the comic pass, the plates slipping on the claps, its dots riding this part's camera. */
export const splashLook = (frame: number): Look => printOf(frame);
export const SPLASH: InkPart = { frame: splashFrame, temporal: splashTemporal, look: splashLook };

/** The instants the record part draws. */
export const RECORD_RANGE = { from: RECORD, to: MATCH_CUP } as const;
/** Club bar 3 at instant `f`. */
export const recordFrame = (f: number, L: InkLayout): InkDraw[] => recordAt(f, L);
/** Design §10.3: the dive's landing frame (96, its shutter reaching back into the inset), the rise (48). */
export function recordTemporal(frame: number): Temporal {
  if (frame === RECORD) return shutter(96, DIVE_SHUTTER);
  if (frame >= RISE.from && frame < RISE.to) return shutter(48, RECORD_SHUTTER);
  // The DJ's nudges (plan v07 §4 C3): the record, its rings and the camera's roll surge on these kicks; their frames take 32 sub-frames.
  if (BERKELEY_STEPS.some((k) => frame === k || frame === k - 1 || frame === k + 1)) return shutter(32, RECORD_SHUTTER);
  return shutter(24, RECORD_SHUTTER);
}
/** Printed, its dots riding the record's camera (the rise opens them up: below 5 px the print's own screen takes over). */
export const recordLook = (frame: number): Look => printOf(frame);
export const RECORD_PART: InkPart = { frame: recordFrame, temporal: recordTemporal, look: recordLook };

// ——— For bridge A (v08) ——————————————————————————————————————————————————————————————————————————————————————————————————————————
// The bar before club 1.1 (src/shots/bridgeA.ts) prints the splash's own world round his eye — the same face, the same Ben-Day burst,
// the same pen and camera model — so club 1.1 is the next frame of what it shows. It borrows the tools here rather than copying them;
// nothing above changes (the club's approved frames are untouched: output/qa/v08/bridgeA/).
export { E as SPLASH_EYE, EM1 as SPLASH_EM, ZB as SPLASH_ZOOM, INKS_NO_RED, Pen, T as inkType, anchorOf, aimOf, cposX, ctxOf, ell, inkEll, layout, poseOf, rect, seg, still };
export type { Cam as SplashCam, Ctx as SplashCtx, Pt as SplashPt };
