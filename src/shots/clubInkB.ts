// The comic club "INK", club bars 4–6 (film bars 24–26), pure — club builder b. Build sheet notes/b58/club-sheet.md §3.5–§3.8, §4
// E6–E14, §5.2–§5.3; prototype notes/club3/w/src/j3.js (`c24`, `glass24`, `guest24`, `scanBal`, `caption`, `bar24a`, `fe`, `retAt`,
// `bar24b`) and j4.js (`bar25`, `pcam`, `page`, `pops`, `flawP`, `flight`). Four parts, each an InkPart (src/shots/clubInkKit.ts) under the
// names of its stub, so src/shots/clubInk{Bar,Lens,Incident,Flight}.ts become one-line re-exports when the club goes live:
//   bar       club 4.1 → 4.3   MEANWHILE, AT THE BAR…: the honeypot cocktail (hard match on the record), the tilt to the two-shot, the shades
//                              flipping down into scan mode, the [SCAN] balloon, the crash zoom into his left lens;
//   lens      club 4.3 → 5.1   the antivirus POV: X-ray fisheye, red scanlines, the reticle tagging carriers, the LOCK and the ×4 inset, "!";
//   incident  club 5.1 → 5.3   SPLASH!: the kick (CLINK!), the splash and the cherry, lights out (only eyes), red eyes, the M × Y plates
//                              registering into exact red, the red panel slamming in, the grab;
//   flight    club 5.3 → 6.4   the QUARANTINE stamp, the throw, the whole club as one 3 × 3 comic page receding while he flies out of it at
//                              us (v04's flight law), BRRR, the 15 focus lines on the glass's crack angles, the plates rattling and snapping
//                              into register on HIT − 1; the hit itself is the v04 glass (the dispatcher's).
//
// Everything is drawn in screen px at 1080p, origin at the frame centre, y up (the prototype draws y down: its y and rotation signs are
// negated here). Each part returns an InkDrawB list: K's InkDraw (FlatContent through a Pose on the `ink` or `print` layer) plus what the
// comic needs and the flat engine has not got — filled polygons (stars, wedges, slanted panels, arcs, the glass's bowl), an axis-aligned
// clip (the live panel 9 on the page) and the baked page. src/scenes/clubInkB.ts executes all of it; K's executor draws the FlatContent
// and ignores the rest, so these parts degrade gracefully there. Plain Node loads this file: no three / remotion / react imports.
import type { Pose } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, transmit } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';
import { SCREEN_FIXED, type ScreenAnchor } from '../engine/post/dotScreen.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { CAPTION, CARRIER, FREE_FLAG, INDICIA, type InkAtlasId, LETTERING, PAGE_NUMBER, SCAN_LOCKED, SERIAL, STAMP, scanBalloon } from '../content/club.ts';
import { DARK_EYES, GUEST_INK, HERO_INK, LENS_FACES, REACTIONS, REACTION_MARKS } from '../content/castClub.ts';
import { aimPose, strike } from '../motion/hit.ts';
import { v07Frame } from '../score/film.ts';
import { BORDER_SNAP, CARRIER_TAGS, CLEAR, RECEDE, CRASH_ZOOM, DISCO, FLICKS, FLOWER, GRAB, HIT, INFECTIONS, PAGE as PAGE_AT, ROLL, THROW_KICKS, TING, club, reactionAt, HOPS, INSET_SLAM, KICKS, KICK_CUP, LENS, LIGHTS_OUT, LOCK, MATCH_CUP, NOTICE, PLATES, RED_EYES, SCANNER_TICKS, SCAN_BALLOON, SHADES, SPLASH, THROW, TILT } from '../score/club.ts';
import { AMBER, CYAN, FOV, FRONT, INK_FINISH, type InkDraw, type InkLayerId, type InkLayout, type InkPart, K, LEMON, LEMON_PLATE, MAGENTA_PLATE, NIGHT, PAPER, PAPER_GRAIN, PINK, RED, RED_SHADE, SCREEN, VOID, bumpPitch, comicPrint, frameOf, inkLook, shutter } from './clubInkKit.ts';
import { SHARDS } from './glass.ts';
import { inkHudContent } from './clubInkReadout.ts';
import { HUD } from './hud.ts';

export type V2 = readonly [number, number];
const TAU = 2 * Math.PI;
const D2R = Math.PI / 180;

// ——— The draw contract, extended (sheet §10.1 items 1, 2, 6) ———————————————————————————————————————————————————————————————————

/**
 * A filled polygon as triangles: `tri` holds x, y per vertex, three vertices a triangle, in the draw's world units (y up). Optionally a
 * screen like ShapeField's: `tint` the share of ink, `screen` the pitch and `angle` the angle of round dots, or of lines with `lines`; `fixed`
 * prints the screen on the draw's anchor (the output frame's camera) instead of the plane, so motion blur never smears it into mush.
 */
export type Poly = { tri: readonly number[]; color: RGB; alpha?: number; tint?: number; screen?: number; angle?: number; lines?: boolean; fixed?: boolean };
/** An axis-aligned rectangle of the output frame (1080p px, centre origin, y up): nothing of the draw lands outside it. */
export type Clip = { x0: number; y0: number; x1: number; y1: number };
/**
 * One draw of a part's frame, in order: K's InkDraw (paper, then `content`), then `polys`; `page` instead draws the baked page (PAGE) as a
 * plane in page units through `pose` (no paper, no content). `clip` scissors the whole draw.
 */
export type InkDrawB = InkDraw & { polys?: readonly Poly[]; page?: true; clip?: Clip; anchor?: ScreenAnchor };

const EMPTY: FlatContent = { under: [], glyphs: {}, over: [] };

/**
 * A draw list built in painter's order: shapes, glyphs (one atlas at a time) and polygons may come in any order and land in that order —
 * each run of one kind becomes its own draw. `ground` starts a frame with paper; `at` switches the pose (and layer) for what follows.
 */
export class Ink {
  readonly items: InkDrawB[] = [];
  private pose: Pose = SCREEN;
  private layer: InkLayerId = 'ink';
  private clip: Clip | undefined;
  private anchor: ScreenAnchor | undefined;
  private shapes: Shape[] | null = null;
  private glyphKey: InkAtlasId | null = null;
  private glyphs: Glyph[] | null = null;
  private polys: Poly[] | null = null;

  constructor(ground: RGB, pose: Pose = SCREEN) {
    this.pose = pose;
    this.items.push({ layer: 'ink', pose: SCREEN, content: EMPTY, paper: { color: ground, grain: PAPER_GRAIN } });
  }

  private flush(): void {
    const base = { layer: this.layer, pose: this.pose, ...(this.clip ? { clip: this.clip } : {}), ...(this.anchor ? { anchor: this.anchor } : {}) };
    if (this.shapes?.length) this.items.push({ ...base, content: { under: this.shapes, glyphs: {}, over: [] } });
    if (this.glyphs?.length && this.glyphKey) this.items.push({ ...base, content: { under: [], glyphs: { [this.glyphKey]: this.glyphs }, over: [] } });
    if (this.polys?.length) this.items.push({ ...base, content: EMPTY, polys: this.polys });
    this.shapes = null;
    this.glyphs = null;
    this.glyphKey = null;
    this.polys = null;
  }

  /** What follows is seen through `pose`, on layer `layer`, clipped to `clip`. */
  at(pose: Pose, layer: InkLayerId = 'ink', clip?: Clip): this {
    this.flush();
    this.pose = pose;
    this.layer = layer;
    this.clip = clip;
    return this;
  }

  /** The screen that fixed screens (Poly.fixed) are printed on, from here on. */
  printOn(anchor: ScreenAnchor | undefined): this {
    this.flush();
    this.anchor = anchor;
    return this;
  }

  shape(...s: (Shape | null | undefined)[]): this {
    if (this.glyphs || this.polys) this.flush();
    for (const x of s) if (x) (this.shapes ??= []).push(x);
    return this;
  }

  glyph(atlas: InkAtlasId, ...g: Glyph[]): this {
    if (this.shapes || this.polys || (this.glyphKey && this.glyphKey !== atlas)) this.flush();
    this.glyphKey = atlas;
    (this.glyphs ??= []).push(...g);
    return this;
  }

  poly(...p: (Poly | null | undefined)[]): this {
    if (this.shapes || this.glyphs) this.flush();
    for (const x of p) if (x && x.tri.length >= 6) (this.polys ??= []).push(x);
    return this;
  }

  /** Ends the current draw here (what follows starts a new one): a big batch of polygons gets a draw of its own. */
  cut(): this {
    this.flush();
    return this;
  }

  /** The baked page through `pose` (page units). */
  page(pose: Pose): this {
    this.flush();
    this.items.push({ layer: 'ink', pose, content: EMPTY, page: true });
    return this;
  }

  done(): InkDrawB[] {
    this.flush();
    return this.items;
  }
}

// ——— Cameras ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A flat camera: `zoom` × about world point (x, y), the world turned `turn` radians counter-clockwise on screen. */
export type Cam = { zoom: number; x: number; y: number; turn: number };
export const CAM0: Cam = { zoom: 1, x: 0, y: 0, turn: 0 };
/** The Pose of a Cam (aimPose rolls the camera's up vector, which turns the world the same way on screen). */
export const camPose = (c: Cam): Pose => aimPose({ zoom: c.zoom, x: c.x, y: c.y, roll: c.turn }, FRONT, FOV);
/** Where world point p lands on screen under `c`. */
export function toScreen(c: Cam, p: V2): [number, number] {
  const dx = (p[0] - c.x) * c.zoom;
  const dy = (p[1] - c.y) * c.zoom;
  const cs = Math.cos(c.turn);
  const sn = Math.sin(c.turn);
  return [dx * cs - dy * sn, dx * sn + dy * cs];
}

// ——— Motion grammar (sheet §0: L launch, I impact) ————————————————————————————————————————————————————————————————————————————

/**
 * L, a launch (sheet §0): off at full speed on t = 0, ¾ of the way in 3 frames, settled by 24 with a ≤ 3 % rebound — the house strike
 * (motion/hit.ts). The prototype's spring started from rest, so its biggest step came 2–3 frames after the drum; this one lands on it.
 */
export const launchL = (t: number): number => strike(t, 0, 3, 0.85);
/** I, an impact into frame b from a: accelerating (power p), exactly 1 on b, then a 2 % rebound over 6 frames. */
export function impactI(f: number, a: number, b: number, p = 2.2): number {
  if (f <= a) return 0;
  if (f < b) return ((f - a) / (b - a)) ** p;
  return 1 + (f - b < 6 ? 0.02 * Math.sin((Math.PI * (f - b)) / 6) : 0);
}
/** Smooth 0 → 1 (cosine), clamped. */
export const sF = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
/** Log-lerp (zooms move evenly in scale). */
export const lg = (a: number, b: number, t: number): number => Math.exp(lerp(Math.log(a), Math.log(b), t));
/** On twos: the frame's even step. */
export const onTwos = (f: number): number => Math.floor(Math.floor(f + 0.5) / 2);
/** A word landing on its drum frame (sheet §3.1): from 1.6× two frames out, 0.97 at +2, settled by +5. */
export const landScale = (t: number): number => (t < -2 ? 0 : t < 0 ? lerp(1.6, 1, (t + 2) / 2) : t < 2 ? lerp(1, 0.97, t / 2) : t < 5 ? lerp(0.97, 1, (t - 2) / 3) : 1);
/** A pop: 0.4 → 1.15 over 2 frames, settling to 1 by +5. */
export const popScale = (t: number): number => (t < 0 ? 0 : t < 2 ? lerp(0.4, 1.15, t / 2) : t < 5 ? lerp(1.15, 1, (t - 2) / 3) : 1);
/** The last of `list` at or before `f` (−∞ when none). */
export const lastOf = (list: readonly number[], f: number): number => {
  let r = -Infinity;
  for (const v of list) if (v <= f) r = v;
  return r;
};

// ——— Geometry (polygons as triangles) ————————————————————————————————————————————————————————————————————————————————————————

/** A star-shaped loop as a triangle fan from `c` (its centroid by default). */
export function fan(pts: readonly V2[], c?: V2): number[] {
  const n = pts.length;
  const cx = c ? c[0] : pts.reduce((s, p) => s + p[0], 0) / n;
  const cy = c ? c[1] : pts.reduce((s, p) => s + p[1], 0) / n;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push(cx, cy, a[0], a[1], b[0], b[1]);
  }
  return out;
}
/** A band between two polylines of equal length (a ribbon, an arc band): two triangles per step. */
export function strip(a: readonly V2[], b: readonly V2[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < a.length; i++) out.push(a[i][0], a[i][1], b[i][0], b[i][1], a[i + 1][0], a[i + 1][1], a[i + 1][0], a[i + 1][1], b[i][0], b[i][1], b[i + 1][0], b[i + 1][1]);
  return out;
}
/** A tapered wedge from (x0, y0), w0 wide, to (x1, y1), w1 wide (a focus line, a speed line, a tear, an arm). */
export function wedge(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): number[] {
  const l = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / l;
  const ny = (x1 - x0) / l;
  return fan([[x0 + (nx * w0) / 2, y0 + (ny * w0) / 2], [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2], [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2], [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2]]);
}
/** The points of an ellipse (rx, ry) about (cx, cy), turned `rot`. */
export function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 72): V2[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return Array.from({ length: n }, (_, i): V2 => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
}
/** A star: n spikes between radii ri and ro, each point jittered by `jr` (share of its radius) and `ja` (degrees) from a fixed seed. */
export function starPts(cx: number, cy: number, n: number, ri: number, ro: number, seed = 0, jr = 0, ja = 0, rot = 0): V2[] {
  return Array.from({ length: 2 * n }, (_, i): V2 => {
    const tip = i % 2 === 0;
    const a = rot + (i / 2 / n) * TAU + (tip ? ja * D2R * (2 * hash(seed, i, 1) - 1) : 0);
    const r = (tip ? ro : ri) * (1 + jr * (2 * hash(seed, i, 2) - 1));
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
}
/** An arc band: radii r0 → r1 from angle a0 to a1 (radians, CCW), about (cx, cy). */
export function arcBand(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, n = 32): number[] {
  const at = (r: number) => Array.from({ length: n + 1 }, (_, i): V2 => [cx + Math.cos(lerp(a0, a1, i / n)) * r, cy + Math.sin(lerp(a0, a1, i / n)) * r]);
  return strip(at(r0), at(r1));
}
/** A loop grown outward by `d` (a keyline behind its fill): each vertex along its bisector, mitres capped at 2.5 d. Loops are CCW or CW. */
export function grow(pts: readonly V2[], d: number): V2[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const sgn = area >= 0 ? 1 : -1;
  return pts.map((p, i): V2 => {
    const a = pts[(i + n - 1) % n];
    const b = pts[(i + 1) % n];
    const e1 = [p[0] - a[0], p[1] - a[1]];
    const e2 = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1;
    const l2 = Math.hypot(e2[0], e2[1]) || 1;
    // Outward normals of the two edges (for a CCW loop the outside is on the right).
    const n1 = [(sgn * e1[1]) / l1, (-sgn * e1[0]) / l1];
    const n2 = [(sgn * e2[1]) / l2, (-sgn * e2[0]) / l2];
    const m = [n1[0] + n2[0], n1[1] + n2[1]];
    const ml = Math.hypot(m[0], m[1]) || 1;
    const cos = (n1[0] * m[0] + n1[1] * m[1]) / ml;
    const k = Math.min(2.5, 1 / Math.max(cos, 0.2));
    return [p[0] + (m[0] / ml) * d * k, p[1] + (m[1] / ml) * d * k];
  });
}
/** Turn and move a loop: rotate by `rot` about the origin, then add (x, y). */
export const place = (pts: readonly V2[], x: number, y: number, rot = 0, sx = 1, sy = sx): V2[] => {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return pts.map(([px, py]): V2 => [x + px * sx * c - py * sy * s, y + px * sx * s + py * sy * c]);
};
/** A loop inked like the prototype's inkP: K keyline `lw` wide straddling the edge (drawn as the grown loop behind), the fill inside. */
export function inked(pts: readonly V2[], fill: RGB | null, lw: number, o: { shadow?: V2; shadowColor?: RGB; key?: RGB; tint?: number; screen?: number; angle?: number; lines?: boolean; c?: V2 } = {}): Poly[] {
  const out: Poly[] = [];
  if (o.shadow) out.push({ tri: fan(lw ? grow(pts, lw / 2) : pts, o.c).map((v, i) => v + o.shadow![i % 2]), color: o.shadowColor ?? NIGHT });
  if (lw > 0) out.push({ tri: fan(grow(pts, lw / 2), o.c), color: o.key ?? K });
  if (fill) out.push({ tri: fan(lw > 0 ? grow(pts, -lw / 2) : pts, o.c), color: fill, tint: o.tint, screen: o.screen, angle: o.angle, lines: o.lines });
  return out;
}

// ——— Type (faces, lettering, the system voice) ————————————————————————————————————————————————————————————————————————————————

/** Each character of `s` with its centre (ems from the string's advance centre) and advance (ems). Spaces are kept for spacing only. */
export function layoutText(s: string, advance: Advance, tracking = 0): { ch: string; x: number; w: number }[] {
  const line = typeset(s, advance, tracking);
  return line.chars.map((c) => ({ ch: c.ch, x: c.x - line.width / 2, w: c.w }));
}
/** Width of `s` in ems. */
export const widthOf = (s: string, advance: Advance, tracking = 0): number => typeset(s, advance, tracking).width;
/** Offset (ems) from a face's advance centre to the centre of its (…) core: the prototype's `core`, so a face is placed by its bracket. */
export function coreOffset(s: string, advance: Advance): number {
  const i = s.indexOf('(');
  const j = s.lastIndexOf(')');
  if (i < 0 || j < i) return 0;
  const chars = layoutText(s, advance);
  const a = chars[i];
  const b = chars[j];
  return (a.x - a.w / 2 + (b.x + b.w / 2)) / 2;
}

export type FaceStyle = {
  /** Fill. */
  fill: RGB;
  /** The ω's own ink (an infected mouth: amber). */
  mouth?: RGB;
  /** Keyline (px, outside the glyph edge), PAPER rim beyond it (px), hard shadow offset (px, down-right). */
  key?: number;
  keyColor?: RGB;
  rim?: number;
  rimColor?: RGB;
  shadow?: number;
  shadowColor?: RGB;
  /** Turn (radians CCW) about the anchor, and a horizontal / vertical squash. */
  rot?: number;
  sx?: number;
  sy?: number;
  alpha?: number;
  /** Per character: an offset (px) or null to skip it (eyes swapped, a bracket dropped). */
  each?: (i: number, ch: string) => V2 | null;
  /** Per character: its fill instead of `fill`. */
  ink?: (i: number, ch: string) => RGB | null;
};

/**
 * A string of the `face` atlas (or another) as glyphs centred on (x, y): its hard shadow, its rim, then its fill with a K keyline — three
 * passes, so a face keeps one clean silhouette (every shadow under every rim under every fill).
 */
export function faceGlyphs(s: string, x: number, y: number, em: number, advance: Advance, st: FaceStyle): Glyph[] {
  const chars = layoutText(s, advance);
  const rot = st.rot ?? 0;
  const sx = st.sx ?? 1;
  const sy = st.sy ?? 1;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const size = em * sy;
  const stretch = sx / sy;
  const key = st.key ?? 0;
  const rim = st.rim ?? 0;
  const placed: { ch: string; x: number; y: number; fill: RGB }[] = [];
  chars.forEach((ch, i) => {
    if (ch.ch.trim() === '') return;
    const d = st.each ? st.each(i, ch.ch) : [0, 0];
    if (!d) return;
    const lx = ch.x * em * sx + d[0];
    const ly = d[1];
    const fill = (st.ink ? st.ink(i, ch.ch) : null) ?? (ch.ch === 'ω' && st.mouth ? st.mouth : st.fill);
    placed.push({ ch: ch.ch, x: x + lx * c - ly * sn, y: y + lx * sn + ly * c, fill });
  });
  const out: Glyph[] = [];
  const base = (p: (typeof placed)[number]): Glyph => ({ ch: p.ch, x: p.x, y: p.y, size, stretch, rot, color: p.fill, ...(st.alpha !== undefined ? { alpha: st.alpha } : {}) });
  if (st.shadow) for (const p of placed) out.push({ ...base(p), x: p.x + st.shadow, y: p.y - st.shadow, color: st.shadowColor ?? NIGHT, outline: (key + rim) / size, outlineColor: st.shadowColor ?? NIGHT });
  if (rim > 0) for (const p of placed) out.push({ ...base(p), color: st.rimColor ?? PAPER, outline: (key + rim) / size, outlineColor: st.rimColor ?? PAPER });
  for (const p of placed) out.push({ ...base(p), ...(key > 0 ? { outline: key / size, outlineColor: st.keyColor ?? K } : {}) });
  return out;
}

/** The hero's ink (prototype `hero`): AMBER, a K keyline min(0.06 em, 40 px), a PAPER rim min(0.025 em, 14 px), a NIGHT hard shadow min(0.035 em, 24 px), on screen. */
export function heroStyle(em: number, zoom = 1, o: Partial<FaceStyle> = {}): FaceStyle {
  return { fill: AMBER, key: Math.min(0.036 * em * zoom, 24) / zoom, rim: Math.min(0.025 * em * zoom, 14) / zoom, shadow: Math.min(0.035 * em * zoom, 24) / zoom, ...o };
}

/** The lettering's em for a cap height (Noto Sans JP Black: caps ≈ 0.735 em). */
export const sfxEm = (cap: number): number => cap * 1.36;

export type SfxStyle = {
  face: RGB;
  /** Extrusion copies (NIGHT, 3 px apart down-left), keyline (px), outline only (no face, no highlight), alpha. */
  ex?: number;
  key?: number;
  keyColor?: RGB;
  outlineOnly?: boolean;
  /** 0 printed … 1 gone: the un-print (the face and keyline fade toward `ground`, which the comic pass prints as shrinking dots). */
  unprint?: number;
  ground?: RGB;
  rot?: number;
  /** Horizontal scale; a negative one mirrors the extrusion and the highlight (a glyph quad cannot be flipped: GlyphField culls back faces). */
  sx?: number;
  alpha?: number;
};
/**
 * One letter of the comic's lettering (prototype `sfx` + `let1`): the NIGHT extrusion stack, the K keyline, a PAPER highlight sliver up-left
 * and the face; `scale` lands it (landScale) and `unprint` dissolves it.
 */
export function sfxGlyphs(ch: string, x: number, y: number, cap: number, scale: number, st: SfxStyle): Glyph[] {
  if (scale <= 0.01 || (st.unprint ?? 0) >= 1) return [];
  const size = sfxEm(cap) * scale;
  const u = clamp(st.unprint ?? 0);
  const ground = st.ground ?? PAPER;
  const fade = (c: RGB): RGB => (u > 0 ? mixRGB(c, ground, u) : c);
  const key = (st.key ?? 0.1 * cap) * scale;
  const rot = st.rot ?? 0;
  const mirror = (st.sx ?? 1) < 0 ? -1 : 1;
  const g = (dx: number, dy: number, color: RGB, outline: number, outlineColor: RGB): Glyph => ({
    ch, x: x + mirror * dx * scale, y: y + dy * scale, size, rot, color: fade(color), outline: outline / size, outlineColor: fade(outlineColor),
    ...(st.sx && Math.abs(st.sx) !== 1 ? { stretch: Math.abs(st.sx) } : {}), ...(st.alpha !== undefined ? { alpha: st.alpha } : {}),
  });
  const out: Glyph[] = [];
  const ex = st.ex ?? 0;
  for (let i = ex; i > 0; i--) out.push(g(-3 * i, -3 * i, NIGHT, key, NIGHT));
  if (st.outlineOnly) {
    // An outline alone: the letter in its keyline's ink, then the ground punched back in (a hollow letter).
    out.push(g(0, 0, st.keyColor ?? K, key, st.keyColor ?? K));
    out.push(g(0, 0, ground, 0, ground));
    return out;
  }
  out.push(g(0, 0, st.keyColor ?? K, key, st.keyColor ?? K));
  out.push(g(-3, 3, PAPER, 0, PAPER));
  out.push(g(1, -1, st.face, 0, st.face));
  return out;
}

/** Letter centres (px from the word's centre) for a word of the lettering at cap height `cap`, tracked a little tight (0.92). */
export function sfxAdvances(word: string, cap: number, advance: Advance, tracking = 0.92): number[] {
  const em = sfxEm(cap);
  const w = [...word].map((c) => advance(c) * em * tracking);
  const total = w.reduce((s, v) => s + v, 0);
  let x = -total / 2;
  return w.map((v) => {
    const c = x + v / 2;
    x += v;
    return c;
  });
}

/** Plain system-voice text (mono, ui, display) centred (align 0.5) or left-aligned (0) at (x, y). */
export function textLine(s: string, x: number, y: number, size: number, color: RGB, advance: Advance, o: { align?: number; rot?: number; alpha?: number; count?: number } = {}): Glyph[] {
  const chars = layoutText(s, advance);
  const w = widthOf(s, advance) * size;
  const off = ((o.align ?? 0.5) - 0.5) * w;
  const c = Math.cos(o.rot ?? 0);
  const sn = Math.sin(o.rot ?? 0);
  const out: Glyph[] = [];
  chars.forEach((ch, i) => {
    if (ch.ch.trim() === '' || (o.count !== undefined && i >= o.count)) return;
    const lx = ch.x * size - off;
    out.push({ ch: ch.ch, x: x + lx * c, y: y + lx * sn, size, rot: o.rot ?? 0, color, ...(o.alpha !== undefined ? { alpha: o.alpha } : {}) });
  });
  return out;
}

const toSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const toLin = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/**
 * A print tint: `a` mixed toward `b` by `t` as displayed (sRGB), not in linear light — the comic pass judges tone on display colours, so a
 * tint of PAPER and an ink prints exactly `t` of that ink as dots (light is dots, never a gradient: sheet §10.2).
 */
export const tintRGB = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => toLin(toSrgb(a[i]) + (toSrgb(b[i]) - toSrgb(a[i])) * t)) as unknown as RGB;
/** A unit used by tests and the scene: the layout a part draws with (K's InkLayout). */
export type { InkLayout };
export const HALF_W = 960;
export const HALF_H = 540;
/** The palette, linear, for the parts below (the kit's, plus the pale cyan of the glass's rim). */
export const GLASS_RIM = linear('#BFEFFF');

// ——— The page (sheet §3.8): the whole club as one 3 × 3 comic page ————————————————————————————————————————————————————————————————

/** The page in page units (1 unit = 1 px of a panel at 1080p): 3 × 3 panels of 1920 × 1080, 84 apart, 288 margins (prototype `prc`). */
export const PAGE = { w: 6504, h: 3984, pitchX: 2004, pitchY: 1164, margin: 288 } as const;
/** Panel k's centre (k 0–8, reading order), page units from the page's centre, y up. */
export const panelCentre = (k: number): [number, number] => [(k % 3 - 1) * PAGE.pitchX, (1 - Math.floor(k / 3)) * PAGE.pitchY];

// ——— Shared helpers for the parts ———————————————————————————————————————————————————————————————————————————————————————————————

/** A kick's hop (prototype `bob`), on twos: up to H px and down again over each beat. */
export function bob(f: number, H: number): number {
  const k = onTwos(f) * 2;
  const u = clamp((k - lastOf(KICKS, k)) / 24);
  return H * 4 * u * (1 - u);
}
/** The dot screen of the comic pass riding a flat camera (dotScreen.ts planePoint: the anchor is where the world's origin lands). */
export function printAnchor(c: Cam): ScreenAnchor {
  const zoom = clamp(c.zoom, 5 / 16, 3);
  const o = toScreen({ ...c, zoom }, [0, 0]);
  return { x: o[0], y: o[1], zoom, roll: c.turn };
}
/** The screen fixed screens are printed on: a camera's view of the world at the output frame (dotScreen.ts ScreenAnchor). */
export function anchorOf(c: Cam): ScreenAnchor {
  const o = toScreen(c, [0, 0]);
  return { x: o[0], y: o[1], zoom: c.zoom, roll: c.turn };
}
/** An ellipse inked with a K keyline `lw` straddling its edge: K behind, the fill inside (canvas stroke + fill). */
export function inkedEllipse(cx: number, cy: number, rx: number, ry: number, fill: RGB | null, lw: number, rot = 0, o: Parameters<typeof inked>[3] = {}): Poly[] {
  return inked(ellipsePts(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot), fill, lw, o);
}
/** A closed band along an ellipse (a stroke `w` wide on its edge). */
export function ellipseBand(cx: number, cy: number, rx: number, ry: number, w: number, rot = 0, n = 72): number[] {
  const outer = ellipsePts(cx, cy, rx + w / 2, ry + w / 2, rot, n);
  const inner = ellipsePts(cx, cy, Math.max(0, rx - w / 2), Math.max(0, ry - w / 2), rot, n);
  return strip([...outer, outer[0]], [...inner, inner[0]]);
}
/** A thought or speech balloon (prototype `balloon`): K keyline `lw` outside, the fill; thought = three bubbles toward (tx, ty), else a tail. */
export function balloonPolys(x: number, y: number, rx: number, ry: number, tx: number, ty: number, thought: boolean, lw = 6, fill: RGB = PAPER): Poly[] {
  const parts: V2[][] = [ellipsePts(x, y, rx, ry, 0, 64)];
  if (thought) {
    for (let i = 1; i <= 3; i++) {
      const u = i / 4 + 0.12;
      const r = (1 - u) * ry * 0.28 + 4;
      parts.push(ellipsePts(lerp(x, tx, u), lerp(y, ty, u), r, r * 0.8, 0, 24));
    }
  } else {
    const a = Math.atan2(ty - y, tx - x) + Math.PI / 2;
    parts.push([[x + Math.cos(a) * rx * 0.25, y + Math.sin(a) * ry * 0.25], [tx, ty], [x - Math.cos(a) * rx * 0.25, y - Math.sin(a) * ry * 0.25]]);
  }
  return [...parts.map((p): Poly => ({ tri: fan(grow(p, lw)), color: K })), ...parts.map((p): Poly => ({ tri: fan(p), color: fill }))];
}
/**
 * Ben-Day dots as real dots (round 2, R2-6): round `color` dots on a square lattice of pitch `pitch` turned `angle`, each a decagon of area
 * `coverage` × pitch² (a decagon of circumradius r has area 5 r² sin 36°: the share of the ground it covers is exactly `coverage`), over the
 * rectangle (cx, cy, w, h). The shader's cosine screen prints a tint t as far less than t of ink (cos x + cos y > 2 − 4t: .35 → ≈ 20 %) and
 * closes into a checkerboard by .5; these hold their coverage and stay round. One Poly; give it a draw of its own (Ink.cut).
 */
export function benDay(cx: number, cy: number, w: number, h: number, pitch: number, angle: number, coverage: number, color: RGB): Poly {
  const r = pitch * Math.sqrt(clamp(coverage, 0, 0.7) / (5 * Math.sin(TAU / 10)));
  const n = Math.ceil(Math.hypot(w, h) / 2 / pitch) + 1;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const ring = Array.from({ length: 10 }, (_, k): V2 => [Math.cos((k / 10) * TAU) * r, Math.sin((k / 10) * TAU) * r]);
  const tri: number[] = [];
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = cx + (i * c - j * s) * pitch;
      const y = cy + (i * s + j * c) * pitch;
      if (Math.abs(x - cx) > w / 2 + r || Math.abs(y - cy) > h / 2 + r) continue;
      for (let k = 0; k < 10; k++) {
        const a = ring[k];
        const b = ring[(k + 1) % 10];
        tri.push(x, y, x + a[0], y + a[1], x + b[0], y + b[1]);
      }
    }
  }
  return { tri, color };
}

/** A rectangle's corners (centre, size, turn). */
export const rectPts = (cx: number, cy: number, w: number, h: number, rot = 0): V2[] => place([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], cx, cy, rot);
/** A polyline stroke `w` wide as wedges. */
export function stroke(pts: readonly V2[], w: number): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < pts.length; i++) out.push(...wedge(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, w));
  return out;
}
/** A quadratic Bézier's points. */
export const quadPts = (a: V2, c: V2, b: V2, n = 12): V2[] =>
  Array.from({ length: n + 1 }, (_, i): V2 => {
    const t = i / n;
    return [(1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]];
  });
/** A polygon moved by (dx, dy) and scaled by s about (ox, oy). */
export const scalePoly = (p: Poly, s: number, ox: number, oy: number): Poly => ({ ...p, tri: p.tri.map((v, i) => (i % 2 === 0 ? ox + v * s : oy + v * s)) });

/**
 * The print's shutter: shorter than the house 0.5 wherever the frame is not making a big move. Motion blur is summed before the comic pass
 * prints the frame, so a long shutter turns every blurred keyline into a halo of key dots; the comic is drawn "on ones" and stays crisp.
 */
export const PRINT_SHUTTER = 0.3;

// ——— Bar 4 · MEANWHILE, AT THE BAR… (part `bar`, club 4.1 → 4.3; sheet §3.5 rows 4.1–4.2&, E6–E8) ———————————————————————————————————

/** The guest at the two-shot: his face, em and centre (two-shot px); the glass's rim centre at rest and its radius there. */
const GQ = GUEST_INK.calm;
const GEM = 230;
const GP: V2 = [400, 60];
const GL: V2 = [-90, -120];
const RR = 114;
/** The match cut's zoom on the glass: the rim's r 114 × 2.63 = r 300, the record's last size; the cherry r 17 × 2.63 = r 44. */
export const MATCH_ZOOM = 2.63;
/** The crash zoom into the lens: Ø 110 → 1276 (the lens part's r 640 circle and its rim). */
export const CRASH_ZOOM_TO = 11.6;
/** The two-shot's slow push after the tilt lands (zoom per frame): the hold is alive until the crash zoom. */
const TWO_SHOT_PUSH = 0.0009;
/** How high the ￣ eyes' ink sits above the face's middle line (ems): where the shades' lenses go. */
export const BROW = 0.2;

/** The tilt's progress (E7): 0 on the match cut, moving from 2 f in, accelerating into the two-shot on club 4.2 (I). */
export const tiltAt = (f: number): number => clamp((f - (TILT.from + 2)) / (TILT.to - TILT.from - 2)) ** 2;

/** The guest's two lens centres at the two-shot (shades down), left on screen first. */
export function guestLenses(adv: Advance): [V2, V2] {
  const ch = layoutText(GQ, adv);
  return [[GP[0] + ch[1].x * GEM, GP[1] + BROW * GEM], [GP[0] + ch[3].x * GEM, GP[1] + BROW * GEM]];
}

/** The bar's camera: on the glass at 2.63 (+2 % bump), pulling back to the two-shot through the tilt; then the crash zoom into his left lens. */
export function barCam(f: number, adv: Advance): Cam {
  const tau = tiltAt(f);
  const bump = f < MATCH_CUP + 4 ? 1 + 0.02 * Math.sin((Math.PI * Math.max(0, f - MATCH_CUP)) / 4) : 1;
  const push = (g: number) => 1 + TWO_SHOT_PUSH * Math.max(0, Math.min(g, CRASH_ZOOM.from) - SHADES);
  if (f >= CRASH_ZOOM.from) {
    const s = clamp(impactI(f, CRASH_ZOOM.from, CRASH_ZOOM.to));
    const lc = guestLenses(adv)[0];
    const z0 = push(f);
    const zoom = lg(z0, CRASH_ZOOM_TO, s);
    return { zoom, x: lc[0] - (lc[0] * z0 * (1 - s)) / zoom, y: lc[1] - (lc[1] * z0 * (1 - s)) / zoom, turn: -3 * D2R * s };
  }
  return { zoom: lg(MATCH_ZOOM, 1, tau) * bump * push(f), x: lerp(GL[0], 0, tau), y: lerp(GL[1], 0, tau), turn: 0 };
}

/** The garnish's turn (radians, clockwise on screen as the record turned): 0.6°/f on the cut, slowing to a stop by +24. */
const garnishAt = (f: number): number => -0.6 * D2R * 12 * (1 - (1 - clamp((f - MATCH_CUP) / 24)) ** 2);

/** The cocktail (prototype `glass24`): top view on the cut, tilting into a side-view icon; the honeypot's cherry and FREE flag. */
function cocktail(ink: Ink, f: number, tau: number, z: number, adv: Advance): void {
  const [gx, gy] = GL;
  const ry = RR * lerp(1, 0.2, tau);
  const rcy = gy + 60 * tau;
  const ay = rcy - 110 * tau;
  const k = 1 / z;
  if (tau > 0.02) {
    ink.poly(...inkedEllipse(gx, ay - 90 * tau, 62, 12 * tau, PAPER, 6 * k));
    ink.poly(...inked(rectPts(gx, ay - 45 * tau, 8, 90 * tau), PAPER, 4 * k));
    ink.poly(...inked([[gx - RR, rcy], [gx + RR, rcy], [gx, ay]], PAPER, 6 * k));
    const liquid: V2[] = [[gx - RR * 0.8, rcy - 14 * tau], [gx + RR * 0.8, rcy - 14 * tau], [gx, ay + 10 * tau]];
    ink.poly({ tri: fan(liquid), color: tintRGB(CYAN, PAPER, 0.25) });
  }
  // The rim: CYAN under a PAPER dot screen, its pale inner rim, the K keyline; two PAPER glints.
  ink.poly(...inkedEllipse(gx, rcy, RR, ry, CYAN, 8 * k));
  ink.poly({ tri: fan(ellipsePts(gx, rcy, RR - 4 * k, Math.max(0.1, ry - 4 * k))), color: tintRGB(CYAN, PAPER, 0.22) });
  ink.poly({ tri: ellipseBand(gx, rcy, RR - 9 * k, Math.max(0.1, ry - 9 * k), 8 * k), color: GLASS_RIM });
  for (const [a, b] of [[0.7, 0.5], [-0.6, 0.35]] as const) ink.poly({ tri: fan(ellipsePts(gx + Math.cos(a * Math.PI) * RR * 0.8, rcy + Math.sin(a * Math.PI) * ry * 0.8, 10, 4 * b + 2, 0, 16)), color: PAPER });
  // The kick ripples from the cherry: the kick on the cut and the hat after it.
  for (const t0 of [MATCH_CUP, MATCH_CUP + 6]) {
    const t = f - t0;
    if (t < 0 || t >= 20) continue;
    const r = lerp(50, 280, t / 20) / MATCH_ZOOM;
    ink.poly({ tri: ellipseBand(gx, rcy, r, r * lerp(1, 0.2, tau), 4 * k), color: K });
  }
  // The cherry on its pick, the PAPER flag FREE: the honeypot (red: the antivirus's).
  const bobY = f >= MATCH_CUP && f < MATCH_CUP + 22 ? -4 * Math.sin((f - MATCH_CUP) * 0.6) * Math.exp(-(f - MATCH_CUP) / 10) : 0;
  const cy0 = rcy + 10 * tau + bobY;
  const g = garnishAt(f);
  const px = gx + Math.cos(g) * 70;
  const py = cy0 + Math.sin(g) * 70 * (1 - tau) + 70 * tau;
  ink.poly({ tri: wedge(gx, cy0, px, py, 4 * k, 4 * k), color: K });
  const fr = g * (1 - tau);
  ink.poly(...inked(place(rectPts(23, 11, 46, 22), px, py, fr), PAPER, 3 * k));
  const [fx, fy] = place([[23, 11]], px, py, fr)[0];
  ink.glyph('ui', ...textLine(FREE_FLAG, fx, fy, 15, K, adv, { rot: fr }));
  ink.poly(...inkedEllipse(gx, cy0, 17, 17, RED, 4 * k));
  ink.poly({ tri: fan(ellipsePts(gx - 6, cy0 + 6, 5, 3, 0.6, 12)), color: PAPER });
}

/** The guest at the table (prototype `guest24`): PAPER face, K keyline, NIGHT shadow; round shades up on his brow, flipping down on club 4.2. */
function guestAtBar(ink: Ink, f: number, L: InkLayout): void {
  const xin = f < MATCH_CUP + 6 ? 900 : 900 * (1 - launchL((f - (MATCH_CUP + 6)) * 0.6));
  ink.glyph('face', ...faceGlyphs(GQ, GP[0] + xin, GP[1], GEM, L.advance.face, { fill: PAPER, key: 5, shadow: 10 }));
  const ei = f < SHADES ? 0 : launchL((f - SHADES) * 1.3);
  const up = lerp(0.45 * GEM, 0, clamp(ei));
  const [l0, l1] = guestLenses(L.advance.face).map((p): V2 => [p[0] + xin, p[1] + up]);
  const flip = clamp((f - SHADES) / 4);
  const ry = 55 * Math.abs(Math.cos(Math.PI * flip)) + 2;
  ink.poly({ tri: stroke(quadPts([l0[0] + 55, l0[1]], [(l0[0] + l1[0]) / 2, l0[1] + 20], [l1[0] - 55, l1[1]]), 7), color: K });
  ink.poly({ tri: wedge(l0[0] - 55, l0[1], l0[0] - 120, l0[1] - 10, 7, 7), color: K }, { tri: wedge(l1[0] + 55, l1[1], l1[0] + 120, l1[1] - 10, 7, 7), color: K });
  for (const [x, y] of [l0, l1]) {
    ink.poly(...inkedEllipse(x, y, 55, ry, K, 7));
    if (f >= CRASH_ZOOM.from) {
      const k = 1 / CRASH_ZOOM_TO;
      for (const g of LENS_GLINTS) ink.poly({ tri: fan(ellipsePts(x + g.x * k, y + g.y * k, g.rx * k, g.ry * k, g.rot, 24)), color: PAPER });
    } else if (ry > 20) ink.poly({ tri: wedge(x - 30, y + ry * 0.35, x - 12, y + ry * 0.6, 5, 5), color: PAPER }, { tri: wedge(x - 34, y + ry * 0.05, x - 26, y + ry * 0.2, 5, 5), color: PAPER });
  }
}

/** The lens's two PAPER glints (lens px, centre origin): drawn the same at the two-shot's scale through the crash zoom. */
const LENS_GLINTS: readonly { x: number; y: number; rx: number; ry: number; rot: number }[] = [
  { x: -330, y: 380, rx: 90, ry: 34, rot: 0.6 },
  { x: -430, y: 300, rx: 26, ry: 12, rot: 0.6 },
];

/** The far dance floor behind the bar (a band of lit tiles, one amber speck: him), the table and the guest, fading in as dots after 40 % of the tilt. */
function barBackground(ink: Ink, f: number, tau: number, L: InkLayout): void {
  if (tau <= 0.4) return;
  const a = clamp((tau - 0.4) / 0.4);
  const n6 = Math.floor(Math.floor(f + 0.5) / 6);
  const tiles: RGB[] = [PINK, CYAN, NIGHT, PAPER];
  const dots: RGB[] = [PAPER, PAPER, CYAN, PINK];
  for (let i = 0; i < 8; i++) {
    const c = (i * 3 + n6) % 4;
    const x = -1060 + i * 96 + 48;
    ink.shape({ kind: 'rect', x, y: -230, w: 96, h: 64, color: tiles[c], alpha: a, outline: 4, outlineColor: K });
    ink.shape({ kind: 'ellipse', x, y: -230, w: 70, h: 44, color: dots[c], alpha: a, tint: 0.45, screen: 8, angle: 0.3 });
  }
  ink.poly(...inkedEllipse(-620, -226 + bob(f, 10), 11, 11, AMBER, 4).map((p) => ({ ...p, alpha: a })));
  ink.poly(...inked(rectPts(-90, -550, 40, 700), NIGHT, 5));
  ink.poly(...inkedEllipse(-90, -200, 240, 44, PAPER, 6));
  guestAtBar(ink, f, L);
}

/** The thought balloon (prototype `scanBal`), screen space, from club 4.2 to the cut: a cell a scanner tick, `1 threat` on the LOCK. */
export function scanBalloonInk(ink: Ink, f: number, adv: Advance): void {
  const d = Math.floor(f + 0.5);
  if (d < SCAN_BALLOON.from || d >= SCAN_BALLOON.to) return;
  const s = launchL((f - SHADES) * 0.8);
  const mv = f >= CRASH_ZOOM.from ? launchL(f - CRASH_ZOOM.from) : 0;
  const x = lerp(640, 620, mv);
  const y = lerp(340, 360, mv);
  const text = d >= LOCK ? SCAN_LOCKED : scanBalloon(SCANNER_TICKS.filter((t) => t <= d).length);
  const tx = mv > 0 ? lerp(-160, 240, mv) : -170;
  const ty = mv > 0 ? -lerp(260, 300, mv) : -230;
  ink.at(SCREEN);
  ink.poly(...balloonPolys(0, 0, 250, 70, tx, ty, true, 6).map((p) => scalePoly(p, s, x, y)));
  // The text in the system's red; the cells as crisp boxes on the glyphs' own places (the shade glyphs would print as mush).
  const size = 36 * s;
  const chars = layoutText(text, adv);
  const cells: Shape[] = [];
  chars.forEach((c) => {
    if (c.ch === '▓') cells.push({ kind: 'rect', x: x + c.x * size, y, w: 0.5 * size, h: 0.62 * size, color: RED });
    if (c.ch === '░') cells.push({ kind: 'rect', x: x + c.x * size, y, w: 0.5 * size, h: 0.62 * size, color: PAPER, outline: 2.5 * s, outlineColor: RED });
  });
  ink.glyph('mono', ...textLine(text, x, y - 2 * s, size, RED, adv).filter((g) => g.ch !== '▓' && g.ch !== '░'));
  ink.shape(...cells);
}

/** The LEMON caption box (prototype `caption`), screen space, sliding in on the cut and riding out with the crash zoom. */
function captionInk(ink: Ink, f: number, z: number, adv: Advance): void {
  if (frameOf(f) >= CRASH_ZOOM.from + 6) return;
  const s = launchL((f - MATCH_CUP) * 0.85);
  const zr = f >= CRASH_ZOOM.from ? z : 1;
  const cx = (-560 - (1 - s) * 840) * zr;
  const cy = 420 * zr;
  const rot = -2 * D2R;
  ink.at(SCREEN);
  ink.poly(...inked(rectPts(cx, cy, 660 * zr, 76 * zr, rot), LEMON, 6 * zr, { shadow: [8 * zr, -8 * zr] }));
  ink.glyph('ui', ...textLine(CAPTION, cx, cy, 42 * zr, K, adv, { rot }));
}

/** Club 4.1 → 4.3 at instant `f`. */
export function barFrame(f: number, L: InkLayout): InkDrawB[] {
  if (frameOf(f) >= LENS) return lensFrame(f, L);
  const c = barCam(f, L.advance.face);
  const tau = tiltAt(f);
  const out = barCam(frameOf(f), L.advance.face);
  const ink = new Ink(NIGHT, camPose(c)).printOn(anchorOf(out));
  // The bar is drawn in lines: the counter's PAPER line screen gathers into the spotlight cone over the table as the camera pulls back.
  const frame: V2[] = [[-1800, -1200], [1800, -1200], [1800, 1200], [-1800, 1200]];
  const cone: V2[] = [[-460, -240], [300, -240], [30, 700], [-170, 700]];
  ink.printOn(SCREEN_FIXED);
  ink.poly({ tri: fan(frame.map((p, i): V2 => [lerp(p[0], cone[i][0], tau), lerp(p[1], cone[i][1], tau)])), color: PAPER, tint: 0.2, screen: 15, angle: 30 * D2R, lines: true, fixed: true });
  ink.printOn(anchorOf(out));
  barBackground(ink, f, tau, L);
  cocktail(ink, f, tau, c.zoom, L.advance.ui);
  captionInk(ink, f, c.zoom, L.advance.ui);
  // The kick, heard from the bar: a muffled, hollow "boom" (B, 30 %), gone by club 4.1&.
  if (f < MATCH_CUP + 18) {
    ink.at(SCREEN);
    const o = clamp((MATCH_CUP + 18 - f) / 18);
    [...LETTERING.boomMuffled].forEach((ch, i) => ink.glyph('sfx', ...sfxGlyphs(ch, 560 + i * 80, -330, 90, landScale(f - MATCH_CUP), { face: NIGHT, ground: NIGHT, key: 5, outlineOnly: true, alpha: 0.3 * o })));
  }
  scanBalloonInk(ink, f, L.advance.mono);
  return ink.done();
}

/** Design §10.3: the tilt (32), the crash zoom (96: ×11.6 in 12 frames). */
export function barTemporal(frame: number): Temporal {
  if (frame >= TILT.from && frame <= TILT.to) return shutter(32);
  if (frame >= CRASH_ZOOM.from && frame < CRASH_ZOOM.to) return shutter(96);
  return shutter(24, PRINT_SHUTTER);
}

/** Printed, the dots riding the bar's camera (clamped so their pitch stays between 5 and 48 px). */
export function barLook(frame: number): Look {
  return inkLook(frame, { screen: printAnchor(barCam(frame, () => 0.6)) });
}

export const BAR: InkPart = { frame: barFrame, temporal: barTemporal, look: barLook };
export const BAR_RANGE = { from: MATCH_CUP, to: LENS } as const;

// ——— Bar 4 · inside the lens (part `lens`, club 4.3 → 5.1; sheet §3.5 rows 4.3–4.4&, E8–E10) ——————————————————————————————————————————

/** The lens circle (r 640, its K rim 18 just outside), the X-ray's fisheye strength, and where he dances in it (screen px). */
const LENS_R = 640;
const FISHEYE = 0.35;
/**
 * Round 2 (R2-7): he dances below the inset's box, not under it — the ×4 inset (a comic magnification, E9) slams in on the LOCK right above
 * him, so the reticle's snap onto him (r 90 → 64, the four brackets) is seen on the drum instead of being covered (and he is clear of the
 * lens's glints, upper left). His x stays −230 (the lock chirp is panned there, scripts/audio/sections/club.mjs), and the inset stays at
 * (−200, −20): its face still matches the kick's (E10).
 */
export const HERO_IN_LENS: V2 = [-230, -400];
/** The dancers in the lens (cast 15–20), their places and ems; the first three are the reticle's hops (tagged `carrier`). */
const LENS_DANCERS: readonly { face: string; x: number; y: number; em: number }[] = [
  { face: LENS_FACES[0].infected, x: 170, y: 40, em: 32 },
  { face: LENS_FACES[1].infected, x: -40, y: 170, em: 34 },
  { face: LENS_FACES[2].infected, x: -80, y: 10, em: 34 },
  { face: LENS_FACES[3].infected, x: 270, y: -180, em: 38 },
  { face: LENS_FACES[4].infected, x: 330, y: 260, em: 34 },
  { face: LENS_FACES[5].infected, x: -420, y: 180, em: 38 },
];
/** The reticle's stops: where it appears, the three carriers on the hops, him on the LOCK. */
export const RETICLE_STOPS: readonly { at: number; p: V2 }[] = [
  { at: LENS, p: [300, 100] },
  ...HOPS.map((at, i) => ({ at, p: [LENS_DANCERS[i].x, LENS_DANCERS[i].y] as V2 })),
  { at: LOCK, p: HERO_IN_LENS },
];
/** The inset that slams in on the LOCK (×4 on his face): its centre and size. */
export const INSET_AT: V2 = [-200, -20];

/** The fisheye of the antivirus's lens: r′ = r / (1 + 0.35 r²), r in lens radii. */
export function fisheye(x: number, y: number, k = FISHEYE): [number, number] {
  const r = Math.hypot(x, y) / LENS_R;
  const s = 1 / (1 + k * r * r);
  return [x * s, y * s];
}

/** The reticle's run onto him: an impact (I) over the 32nd before the LOCK, landing on it. */
export const LOCK_RUN = 3;
/** The lock's snap, per output frame from the LOCK (whole on each frame, R2-7/B1): the ring's radius and the brackets' scale. */
const LOCK_SNAP: readonly { r: number; s: number }[] = [{ r: 72, s: 1.18 }, { r: 66, s: 1.05 }];
/**
 * The reticle at instant `f`: hopping (L) between the carriers on the 16ths; then (round 2, R2-7) running onto him over the 32nd before the
 * LOCK (I, from wherever the last hop has it) and landing there on the drum — so the LOCK's frame is the one the reticle stops on, its ring
 * snapping 90 → 72 → 66 → 64 and its brackets 1.18 → 1.05 → 1 frame by frame (taken at the output frame: whole, never smeared).
 */
export function reticleAt(f: number): { x: number; y: number; r: number; stop: number } {
  const d = frameOf(f);
  const last = RETICLE_STOPS.length - 1;
  if (d >= LOCK) {
    const k = d - LOCK;
    const p = RETICLE_STOPS[last].p;
    return { x: p[0], y: p[1], r: k < LOCK_SNAP.length ? LOCK_SNAP[k].r : 64, stop: last };
  }
  if (f >= LOCK - LOCK_RUN) {
    const a = reticleAt(LOCK - LOCK_RUN - 1e-6);
    const b = RETICLE_STOPS[last].p;
    const u = impactI(f, LOCK - LOCK_RUN, LOCK);
    return { x: lerp(a.x, b[0], u), y: lerp(a.y, b[1], u), r: 90, stop: last - 1 };
  }
  let i = 0;
  for (let k = 0; k < last; k++) if (f >= RETICLE_STOPS[k].at) i = k;
  const a = RETICLE_STOPS[Math.max(0, i - 1)].p;
  const b = RETICLE_STOPS[i].p;
  const u = i ? launchL((f - RETICLE_STOPS[i].at) * 1.4) : 1;
  return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), r: 90, stop: i };
}
/** The brackets' scale on output frame d (1 before the LOCK: they are only drawn from it). */
export const lockBrackets = (d: number): number => (d >= LOCK && d - LOCK < LOCK_SNAP.length ? LOCK_SNAP[d - LOCK].s : 1);
/** The lens's red hatching on output frame d: whole on the LOCK at 0.5, settling to 0.35 by LOCK + 4 (round 2, B1/R2-7: it faded in late). */
export const hatchTint = (d: number): number => (d < LOCK ? 0 : lerp(0.5, 0.35, clamp((d - LOCK) / 4)));
/**
 * The inset's slam, per output frame (round 2, R2-7/B1): its first frame is the LOCK's, at 1.18×, settling (L) to 1 by LOCK + 3 — whole on
 * each frame (it was taken at the sub-frame instant: its fastest part smeared into the drum's frame, double brackets and grey rims on a face).
 * On the 32nd before it (INSET_SLAM) only its four RED corner ticks fly in, 1.6× → 1.25×: the slam's speed, not the inset.
 */
export const insetScale = (d: number): number => (d < LOCK ? 0 : lerp(1.18, 1, launchL((d - LOCK) * 2.5)));

/** The lens's world camera at instant `f`: a slow drift, 0.18 px a frame (the energy audit reads it). */
export const lensCam = (f: number): Cam => ({ zoom: 1, x: (f - LENS) * 0.18, y: 0, turn: 0 });

/** Club 4.3 → 5.1 at instant `f`: the dance floor in the guest's lens (unprinted: his X-ray screen). */
export function lensFrame(f: number, L: InkLayout): InkDrawB[] {
  const d = Math.floor(f + 0.5);
  const cam = lensCam(f);
  const pose = camPose(cam);
  const ink = new Ink(PAPER, pose).printOn(anchorOf({ zoom: 1, x: (frameOf(f) - LENS) * 0.18, y: 0, turn: 0 }));
  // Outside the lens: the paper of the panel and the shades' bridge running off to the other lens.
  ink.shape({ kind: 'rect', x: 900, y: 10, w: 600, h: 60, color: K });
  // The X-ray: NIGHT, the floor's grid in fisheye as faint PAPER lines, the barrel breathing 2 %.
  ink.poly({ tri: fan(ellipsePts(0, 0, LENS_R, LENS_R, 0, 128)), color: NIGHT });
  const k = FISHEYE * (1 + 0.02 * Math.sin((TAU * (f - LENS)) / 48));
  const grid: Shape[] = [];
  const seg = (p: V2, q: V2) => grid.push({ kind: 'segment', x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, w: Math.hypot(q[0] - p[0], q[1] - p[1]) + 2, h: 2, rot: Math.atan2(q[1] - p[1], q[0] - p[0]), color: PAPER, alpha: 0.22 });
  for (let i = -8; i <= 8; i++) for (let j = 0; j < 24; j++) seg(fisheye(i * 120, 900 - j * 75 - 60, k), fisheye(i * 120, 900 - (j + 1) * 75 - 60, k));
  for (let j = -6; j <= 10; j++) for (let i = 0; i < 24; i++) seg(fisheye(-1200 + i * 100, -j * 110 - 60, k), fisheye(-1200 + (i + 1) * 100, -j * 110 - 60, k));
  ink.shape(...grid);
  // The dancers as PAPER silhouettes (no colour: the X-ray sees no ω), sized by the fisheye; he alone in amber.
  for (const dn of LENS_DANCERS) {
    const r = Math.hypot(dn.x, dn.y) / LENS_R;
    const em = (1.25 * dn.em * (1 - k * r * r)) / (1 + k * r * r) ** 1.2 + 8;
    ink.glyph('face', ...faceGlyphs(dn.face, dn.x, dn.y, em, L.advance.face, { fill: PAPER, key: 1.5 }));
  }
  const hx = HERO_IN_LENS[0] - coreOffset(HERO_INK.cheer, L.advance.face) * 60;
  ink.glyph('face', ...faceGlyphs(HERO_INK.cheer, hx, HERO_IN_LENS[1] + bob(f, 8), 60, L.advance.face, heroStyle(60, 1, { shadow: 0 })));
  // The floor's BOOM, mirrored and small in the reflection: MOOB (C).
  if (f < LENS + 22) [...LETTERING.boom].forEach((ch, i) => ink.glyph('sfx', ...sfxGlyphs(ch, 250 - (i - 1.5) * 46, -262, 56, landScale(f - LENS), { face: PAPER, ex: 3, sx: -1, unprint: (f - (LENS + 10)) / 10, ground: NIGHT })));
  // Red scanlines (3 px, pitch 9, 18 %), a notch further every 16th, across the lens only.
  const n16 = Math.floor((d - LENS) / 6);
  const scan: Shape[] = [];
  for (let y = -LENS_R + ((n16 * 3) % 9); y < LENS_R; y += 9) {
    const half = Math.sqrt(Math.max(0, LENS_R * LENS_R - y * y));
    if (half > 2) scan.push({ kind: 'rect', x: 0, y: -y, w: 2 * half, h: 3, color: RED, alpha: 0.18 });
  }
  ink.shape(...scan);
  // The reticle: RED ring and ticks hopping on the 16ths, `carrier` tags; on the LOCK the ring closes, the brackets slam, red hatching floods
  // the lens — all whole on the drum's frame (round 2: the flood faded in over 12 frames, the drum frame changed least).
  const ret = reticleAt(f);
  if (d >= LOCK) {
    const ring: V2[] = [];
    const hole: V2[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const pd = ret.x * dx + ret.y * dy;
      const t = -pd + Math.sqrt(pd * pd - (ret.x * ret.x + ret.y * ret.y - LENS_R * LENS_R));
      ring.push([ret.x + dx * t, ret.y + dy * t]);
      hole.push([ret.x + dx * (ret.r + 8), ret.y + dy * (ret.r + 8)]);
    }
    ink.poly({ tri: strip(ring, hole), color: RED, tint: hatchTint(d), screen: 10, angle: 30 * D2R, lines: true, fixed: true });
  }
  ink.shape({ kind: 'ring', x: ret.x, y: ret.y, w: 2 * ret.r + 6, h: 2 * ret.r + 6, r: 6, color: RED });
  for (let q = 0; q < 4; q++) {
    const a = (q * Math.PI) / 2;
    ink.poly({ tri: wedge(ret.x + Math.cos(a) * (ret.r - 14), ret.y + Math.sin(a) * (ret.r - 14), ret.x + Math.cos(a) * (ret.r + 22), ret.y + Math.sin(a) * (ret.r + 22), 6, 6), color: RED });
  }
  if (d >= LOCK) {
    const dd = ret.r * 1.3 * lockBrackets(d);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      ink.poly({ tri: [...wedge(ret.x + a * dd, ret.y + b * (dd - 24), ret.x + a * dd, ret.y + b * (dd + 3.5), 7, 7), ...wedge(ret.x + a * dd, ret.y + b * dd, ret.x + a * (dd - 24), ret.y + b * dd, 7, 7)], color: RED });
    }
  }
  const tag = CARRIER_TAGS.findIndex((w) => d >= w.from && d < w.to);
  // The tag stays on its carrier (round 2: the run onto him would have carried it away).
  if (tag >= 0) {
    const [tx, ty] = RETICLE_STOPS[tag + 1].p;
    ink.glyph('mono', ...textLine(CARRIER, tx + 70, ty + 70, 18, RED, L.advance.mono, { align: 0 }));
  }
  // The lens's K rim and its PAPER glints.
  ink.shape({ kind: 'ring', x: 0, y: 0, w: 2 * (LENS_R + 18), h: 2 * (LENS_R + 18), r: 18, color: K });
  for (const g of LENS_GLINTS) ink.poly({ tri: fan(ellipsePts(g.x, g.y, g.rx, g.ry, g.rot, 32)), color: PAPER });
  // The inset on the LOCK (E9): ×4 on his face, right under him, slamming in on the drum (its corner ticks flying in over the 32nd before);
  // his eyes glance at the FREE cocktail on 4.4& — "!". Everything of it is taken at the output frame (U3: never a face smeared).
  const [ix, iy] = INSET_AT;
  const insetPose = (s: number) => camPose({ zoom: s, x: ix - (ix - (d - LENS) * 0.18) / s, y: iy - iy / s, turn: 0 });
  const corners = (k: number, w: number) => {
    const tri: number[] = [];
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) tri.push(...wedge(ix + a * 284.5, iy + b * (204.5 - k), ix + a * 284.5, iy + b * (204.5 + w / 2), w, w), ...wedge(ix + a * (284.5 + w / 2), iy + b * 204.5, ix + a * (284.5 - k), iy + b * 204.5, w, w));
    return tri;
  };
  if (d >= INSET_SLAM.from && d < LOCK) {
    const u = (d - INSET_SLAM.from + 1) / (LOCK - INSET_SLAM.from + 1);
    ink.at(insetPose(lerp(1.6, 1.25, u)));
    ink.poly({ tri: corners(70, 9), color: RED });
  }
  if (d >= LOCK) {
    ink.at(insetPose(insetScale(d)));
    ink.shape({ kind: 'rect', x: ix, y: iy, w: 569, h: 409, color: NIGHT, outline: 9, outlineColor: RED });
    const gl = d >= NOTICE ? launchL((d - NOTICE) * 1.2) : 0;
    const em = 190;
    const fx = ix - coreOffset(HERO_INK.inked, L.advance.face) * em;
    ink.glyph('face', ...faceGlyphs(HERO_INK.inked, fx, iy - 10, em, L.advance.face, heroStyle(em, 1, { each: (i) => (gl > 0 && (i === 1 || i === 3) ? [22 * gl, 4 * gl] : [0, 0]) })));
    if (gl > 0) ink.glyph('face', ...faceGlyphs('!', ix + 150, iy + 130, 110 * gl, L.advance.face, { fill: PAPER, key: 5 }));
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      ink.poly({ tri: [...wedge(ix + a * 250, iy + b * 130, ix + a * 250, iy + b * 168.5, 7, 7), ...wedge(ix + a * 250, iy + b * 165, ix + a * 215, iy + b * 165, 7, 7)], color: RED });
    }
  }
  scanBalloonInk(ink, f, L.advance.mono);
  return ink.done();
}

/** Design §10.3: the crash zoom's landing frame (96), the reticle's run onto him (48: it blurs; the LOCK's own frame is whole). */
export function lensTemporal(frame: number): Temporal {
  if (frame === LENS) return shutter(96);
  if (frame >= LOCK - LOCK_RUN && frame < LOCK) return shutter(48);
  return shutter(24, PRINT_SHUTTER);
}

/** Not printed: the antivirus's X-ray screen (red scanlines would print as pink dots under the comic pass). */
export function lensLook(): Look {
  return INK_FINISH;
}

export const LENS_PART: InkPart = { frame: lensFrame, temporal: lensTemporal, look: lensLook };
export const LENS_RANGE = { from: LENS, to: KICK_CUP } as const;

// ——— Bar 5 · SPLASH! (part `incident`, club 5.1 → 5.3; sheet §3.6, E10–E12; v04's club bar 3, + 576) ——————————————————————————————————

/** The guest at the table in the incident (y up), his em; the rage face's place and em; where the hero kicks from (his (…) core). */
const G5: V2 = [560, 60];
const GEM5 = 245;
const RAGE_AT: V2 = [580, 40];
const RAGE_EM = 240;
const KICK_AT: V2 = [-200, -40];
/**
 * The swing (U2; round 2, R2-2): the fist goes once round a loop — an ellipse about LOOP.c, LOOP.rx × LOOP.ry — clockwise from LOOP.from (its
 * bottom) to the release at LOOP.to: up the left side of the dark panel, over the top, and away to the right, at the screen's centre where he
 * will hit (E13: he leaves toward it). Round 2: the loop is wider than he is (800 × 520 against his 460 px face at its bottom and 650 px at the
 * release — round 1's 480 × 320 was smaller than him and the swing read as a drag in a small circle) and sits left of the centre, so the whole
 * swing has the open dark panel and he is let go up-left of the centre, flying at it. The hero hangs from the fist by his head-top (GRIP),
 * leaning with the swing, upright enough to read. Screen px, y up.
 */
export const LOOP = { c: [-125, -5] as V2, rx: 400, ry: 255, from: (-90 * Math.PI) / 180, to: (-285 * Math.PI) / 180 } as const;
/** The fist on his head-top, from his ω's ink, in his own frame at HELD_EM (it turns and scales with him): held and flying he is placed by his ω. */
const GRIP: V2 = [100, 150];
const turn2 = (p: V2, a: number): V2 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
/** The fist on the loop at angle `a` (or on the loop grown by `k` px). */
export const onLoop = (a: number, k = 0): V2 => [LOOP.c[0] + Math.cos(a) * (LOOP.rx + k), LOOP.c[1] + Math.sin(a) * (LOOP.ry + k)];
/** His turn when let go (leaning clockwise into the swing: the tumble the flight carries on). */
export const WOUND_ROT = -0.5;
/** Where he is let go on the throw — the flight law's start (sheet §3.8, re-staged for U2), on screen: his ω. */
export const WOUND: V2 = ((): V2 => {
  const h = onLoop(LOOP.to);
  const q = turn2(GRIP, WOUND_ROT);
  return [h[0] - q[0], h[1] - q[1]];
})();
/** Where the flight law runs from (round 1's release point): from club 6.1 he is where round 1 had him, the roll's 6 × 6 flash test tuned on it. */
export const FLIGHT_FROM: V2 = [0, 90];
/** The flight's bow (v04's law's sin(πu)(1 − u) terms): small and downward, so nothing lifts him toward the frame's top edge. */
export const FLIGHT_BOW: V2 = [40, -40];
/** His em in the guest's hand and at the throw (the flight's S0). */
export const HELD_EM = 200;
/**
 * His em at the loop's bottom (round 2): the haul drags him back into the panel (200 → 140 — the anticipation in depth as well as down), and
 * the swing whips him round and out at us, growing back to HELD_EM on the release at about the rate the flight then grows on (≈ 6 px/f).
 */
export const EM_LOW = 140;
/**
 * The eight friends in the dark, as their own eye pairs (sheet §3.6 row 5.2); none under the party monitor's box or the stamp (the two
 * lower-left pairs moved up, round 1: one showed through the box).
 */
const DARK_SPOTS: readonly V2[] = [[-760, 380], [-420, 430], [-80, 470], [260, 430], [-860, 120], [-640, 210], [-400, 250], [120, -420]];
/**
 * The stamp's place, turn and size (sheet §15 item 5, re-placed round 1): on the dark panel where he hung, above the party monitor, clear
 * of his flight (which goes right) and of the red panel's line screen (its "(•ω•)" sank into the hatching there). I-landing on the throw
 * from 1.4×. World px of the incident's camera.
 */
export const STAMP_AT = { x: -280, y: -192, rot: -6 * D2R, w: 700, h: 124 } as const;

/** The incident's camera: still for the kick and the splash; a living hold in the dark (1 px/f); the punch-in to 1.18 on the grab (L). */
export function incidentCam(f: number): Cam {
  const drift = f >= LIGHTS_OUT ? Math.min(f, GRAB) - LIGHTS_OUT : 0;
  const pin = f >= GRAB ? 0.18 * launchL((f - GRAB) * 0.8) : 0;
  const flow = 1 + 0.0006 * Math.max(0, Math.min(f, GRAB) - KICK_CUP);
  return { zoom: flow * (1 + pin), x: drift, y: 0, turn: 0 };
}

// ——— The throw (U2: one move an audience reads in one look, comic-book style) ———————————————————————————————————————————————————————

/**
 * From the grab (club 5.2&) his own arm holds the hero by the head-top in a comic fist: it hauls him back and down to his own feet (the
 * wind-up, the anticipation: the hero squashed, tipped back, shrinking into the panel), then whips him round the shoulder in one big arc,
 * faster and faster (the swing: one AMBER→PAPER smear swoosh behind him and three speed lines outside the arc), and lets go on the drum
 * (THROW, v04's frame) exactly where v04's flight law takes him (WOUND, WOUND_ROT, HELD_EM), the hand flying open; the empty hand follows
 * through, up and over, closing again, and the arm draws back into his shoulder. Screen px, y up. Every pose is taken at the output frame:
 * whole on each frame, the speed drawn — never a face smeared by the shutter (U3).
 */
export const SWING = { from: GRAB + 4, to: THROW } as const;
/**
 * The swing's ease (round 1): s = t^1.12 over its 8 frames — accelerating into the release, but no frame steps more than ~30° round the
 * loop, so the arc reads on every frame instead of happening in its last three.
 */
export const SWING_EASE = 1.12;
/** The follow-through: the empty hand carries on round the loop, clockwise, 35° more in 4 frames, reaching 40 px out; then the arm snaps back into his shoulder over 4 frames. */
const FOLLOW = { turn: 35 * D2R, frames: 4, out: 40, back: 4 } as const;
/** The empty hand on the release (R2-2): open, fingers spread, for 3 frames from the drum; curling on the 4th; a fist again from the 5th. */
export const HAND_OPEN = 3;
/** The guest's shoulder — his inner ╯, where his drawn arm comes out — on screen under the incident's camera at output frame `d`. */
export function shoulderAt(d: number, adv: Advance): V2 {
  const arm = layoutText(GUEST_INK.rage, adv)[1];
  return toScreen(incidentCam(Math.min(d, THROW)), [RAGE_AT[0] + arm.x * RAGE_EM, RAGE_AT[1]]);
}
/** How far he is tipped back (CCW) by the haul, at the loop's bottom. */
const HAUL_ROT = 0.15;
/** The throw at instant g: the hand, its angle round the loop, his ω, turn, squash and em; held or let go; the hand's opening (0 fist … 1 open). */
export type ThrowPose = { hand: V2; angle: number; x: number; y: number; rot: number; sx: number; sy: number; em: number; held: boolean; open: number };
/** The throw at instant `g` (from GRAB): the fist (screen px), its angle and reach about the shoulder, the hero's core and turn and squash. */
export function throwPose(g: number, adv: Advance): ThrowPose {
  const h0 = toScreen(incidentCam(GRAB), KICK_AT);
  const q0 = turn2(GRIP, 0);
  const H0: V2 = [h0[0] + q0[0], h0[1] + q0[1]];
  let hand: V2;
  let angle: number;
  let rot: number;
  let sx = 1;
  let sy = 1;
  let em = HELD_EM;
  let held = true;
  let open = 0;
  if (g < SWING.from) {
    // The haul down onto the loop's bottom (the anticipation: down before up, back before away): tipping back, squashing, shrinking.
    const u = sF((g - GRAB) / (SWING.from - GRAB));
    const HW = onLoop(LOOP.from);
    hand = [lerp(H0[0], HW[0], u), lerp(H0[1], HW[1], u)];
    angle = LOOP.from;
    rot = HAUL_ROT * u;
    sx = 1 + 0.12 * u;
    sy = 1 - 0.12 * u;
    em = lerp(HELD_EM, EM_LOW, u);
  } else if (g < THROW) {
    // The swing: once round the loop, clockwise, accelerating into the release (I); the squash springing into a stretch; out at us.
    const t = (g - SWING.from) / (SWING.to - SWING.from);
    const s = t ** SWING_EASE;
    angle = lerp(LOOP.from, LOOP.to, s);
    hand = onLoop(angle);
    // He is wound round clockwise with the fist, steadily, and let go turning that way (the flight's tumble carries the same spin on).
    rot = lerp(HAUL_ROT, WOUND_ROT, s);
    sx = lerp(1.12, 0.94, clamp(1.5 * t));
    sy = lerp(0.88, 1.06, clamp(1.5 * t));
    em = lerp(EM_LOW, HELD_EM, t ** 1.2);
  } else {
    // Let go on the drum, the hand flying open; it follows through, round and up, closing, then draws back into his shoulder.
    held = false;
    const t = clamp((g - THROW) / FOLLOW.frames);
    const back = sF((g - THROW - FOLLOW.frames) / FOLLOW.back);
    angle = LOOP.to - FOLLOW.turn * (1 - (1 - t) ** 3);
    const out = onLoop(angle, FOLLOW.out * sF(t));
    const S = shoulderAt(THROW, adv);
    hand = [lerp(out[0], S[0], back), lerp(out[1], S[1], back)];
    rot = WOUND_ROT;
    const k = Math.floor(g + 0.5) - THROW;
    open = k < HAND_OPEN ? 1 : k === HAND_OPEN ? 0.45 : 0;
  }
  const q = turn2([(GRIP[0] * em) / HELD_EM, (GRIP[1] * em) / HELD_EM], rot);
  return { hand, angle, x: hand[0] - q[0], y: hand[1] - q[1], rot, sx, sy, em, held, open };
}
/** Where the held hero is on screen from the grab to the release (his core): v04's WOUND, turned WOUND_ROT, on the throw. */
export function heldAt(f: number, adv: Advance): { x: number; y: number; rot: number; em: number } {
  const p = throwPose(Math.min(f, THROW), adv);
  return { x: p.x, y: p.y, rot: p.rot, em: p.em };
}

/** A ribbon along `pts`, `w0` wide at its start tapering to `w1` (the arm's hose, a speed line). */
export function ribbon(pts: readonly V2[], w0: number, w1: number): number[] {
  const n = pts.length;
  const L: V2[] = [];
  const Rr: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l;
    const ny = (b[0] - a[0]) / l;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return strip(L, Rr);
}
/** A ribbon along `pts` whose full width at share x (0 at its start, 1 at its end) is `w(x)` (a smear: nothing at its tail, round at its head). */
export function taperedRibbon(pts: readonly V2[], w: (x: number) => number): number[] {
  const n = pts.length;
  const L: V2[] = [];
  const Rr: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l;
    const ny = (b[0] - a[0]) / l;
    const h = Math.max(0, w(i / (n - 1))) / 2;
    L.push([pts[i][0] + nx * h, pts[i][1] + ny * h]);
    Rr.push([pts[i][0] - nx * h, pts[i][1] - ny * h]);
  }
  return strip(L, Rr);
}
/** A polyline moved `k` px along its left normal (a speed line beside a path). */
export function offsetLine(pts: readonly V2[], k: number): V2[] {
  const n = pts.length;
  return pts.map((p, i): V2 => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [p[0] - ((b[1] - a[1]) / l) * k, p[1] + ((b[0] - a[0]) / l) * k];
  });
}
/**
 * Where a face's advance centre goes so that its ω's ink lands on (x, y), at `em`, turned `rot`, squashed sx × sy — the hero is placed by his ω
 * held and flying alike, so the release hands the swing's ω to the flight law's without a jump.
 */
export function omegaAnchor(face: string, x: number, y: number, em: number, rot: number, sx: number, sy: number, adv: Advance): [number, number] {
  const w = layoutText(face, adv).find((c) => c.ch === 'ω');
  const ox = (w ? w.x : 0) * em * sx;
  const oy = -OMEGA_INK_DROP * em * sy;
  return [x - (ox * Math.cos(rot) - oy * Math.sin(rot)), y - (ox * Math.sin(rot) + oy * Math.cos(rot))];
}
/**
 * His arm and fist are inked like his glyphs (round 1: on the black panel a K keyline alone vanished, leaving a flat red vector): a NIGHT hard
 * shadow, a PAPER rim beyond the K keyline, then the RED — the rage face's key 6.6 / rim 8 / shadow 12, at the arm's scale.
 */
const ARM_RIM = 6;
const ARM_SHADOW: V2 = [11, -11];
const shifted = (tri: readonly number[], o: V2): number[] => tri.map((v, i) => v + o[i % 2]);
/**
 * His arm (U2/U3: an arm belongs to its owner): a RED hose from his shoulder to the wrist, bowed at the elbow, on a K keyline, and a comic
 * fist in the same ink — palm, three knuckles, the thumb, a PAPER sliver of light — heading along the arm. `grip` closes it on a head.
 */
function guestHose(ink: Ink, S: V2, H: V2, lw = 9): void {
  const dir = Math.atan2(H[1] - S[1], H[0] - S[0]);
  const W: V2 = [H[0] - Math.cos(dir) * 46, H[1] - Math.sin(dir) * 46];
  const len = Math.hypot(W[0] - S[0], W[1] - S[1]);
  const bow = 0.2 * len * (1 - clamp(len / 900)) + 30;
  const nx = -(W[1] - S[1]) / (len || 1);
  const ny = (W[0] - S[0]) / (len || 1);
  // The elbow bows downward (y up: toward −y).
  const sg = ny < 0 ? 1 : -1;
  const E: V2 = [(S[0] + W[0]) / 2 + sg * nx * bow, (S[1] + W[1]) / 2 + sg * ny * bow];
  const pts = quadPts(S, E, W, 16);
  const rim = ribbon(pts, 64 + 2 * lw + 2 * ARM_RIM, 40 + 2 * lw + 2 * ARM_RIM);
  ink.poly({ tri: shifted(rim, ARM_SHADOW), color: NIGHT }, { tri: rim, color: PAPER }, { tri: ribbon(pts, 64 + 2 * lw, 40 + 2 * lw), color: K }, { tri: ribbon(pts, 64, 40), color: RED });
}
/** His fist at the end of his arm (guestHose): heading from the shoulder S to the hand H. */
function guestFist(ink: Ink, S: V2, H: V2, lw = 9): void {
  const dir = Math.atan2(H[1] - S[1], H[0] - S[0]);
  // The fist: one silhouette of ellipses (shadow, rim, K behind all, then the fill), creases, a paper sliver.
  const at = (fw: number, ac: number): V2 => [H[0] + Math.cos(dir) * fw - Math.sin(dir) * ac, H[1] + Math.sin(dir) * fw + Math.cos(dir) * ac];
  const parts: [V2, number, number, number][] = [
    [at(-40, 0), 26, 30, dir],
    [at(0, 0), 52, 46, dir],
    [at(40, -28), 19, 16, dir],
    [at(46, 0), 20, 17, dir],
    [at(40, 28), 19, 16, dir],
    [at(8, 44), 28, 17, dir + 0.5],
  ];
  const outer = parts.map(([p, rx, ry, r]) => fan(grow(ellipsePts(p[0], p[1], rx, ry, r, 32), lw + ARM_RIM)));
  ink.poly(...outer.map((tri): Poly => ({ tri: shifted(tri, ARM_SHADOW), color: NIGHT })));
  ink.poly(...outer.map((tri): Poly => ({ tri, color: PAPER })));
  ink.poly(...parts.map(([p, rx, ry, r]): Poly => ({ tri: fan(grow(ellipsePts(p[0], p[1], rx, ry, r, 32), lw)), color: K })));
  ink.poly(...parts.map(([p, rx, ry, r]): Poly => ({ tri: fan(ellipsePts(p[0], p[1], rx, ry, r, 32)), color: RED })));
  for (const ac of [-14, 14]) {
    const a = at(22, ac);
    const b = at(52, ac);
    ink.poly({ tri: wedge(a[0], a[1], b[0], b[1], 5, 5), color: K });
  }
  const sl = at(-6, -24);
  ink.poly({ tri: fan(ellipsePts(sl[0], sl[1], 18, 6, dir, 16)), color: PAPER });
}
/**
 * His hand flying open on the release (R2-2): the palm and four fingers spread wide along the arm plus the thumb, in the fist's ink (shadow, rim,
 * K, RED, a paper sliver); `open` 1 is spread, ~0.45 curling back (short fingers, closer together). Four PAPER flick marks round it on the
 * drum and the frame after: the comic's "let go".
 */
function guestHand(ink: Ink, S: V2, H: V2, open: number, flick: boolean, lw = 9): void {
  if (open <= 0) {
    guestFist(ink, S, H, lw);
    return;
  }
  const dir = Math.atan2(H[1] - S[1], H[0] - S[0]);
  const at = (fw: number, ac: number): V2 => [H[0] + Math.cos(dir) * fw - Math.sin(dir) * ac, H[1] + Math.sin(dir) * fw + Math.cos(dir) * ac];
  const parts: [V2, number, number, number][] = [[at(-34, 0), 26, 30, dir], [at(0, 0), 46, 44, dir]];
  // Four fingers fanning out from the palm's front edge (−48°…+42° off the arm), the thumb out to the side.
  [-48, -18, 12, 42].forEach((deg, i) => {
    const a = dir + deg * D2R * open;
    const len = (i === 0 || i === 3 ? 54 : 64) * (0.55 + 0.45 * open);
    const base = at(30, (deg / 48) * 26);
    parts.push([[base[0] + Math.cos(a) * len * 0.5, base[1] + Math.sin(a) * len * 0.5], len * 0.5 + 9, 11, a]);
  });
  const ta = dir + 95 * D2R * open;
  const tb = at(4, 40);
  parts.push([[tb[0] + Math.cos(ta) * 24, tb[1] + Math.sin(ta) * 24], 30, 12, ta]);
  const outer = parts.map(([p, rx, ry, r]) => fan(grow(ellipsePts(p[0], p[1], rx, ry, r, 28), lw + ARM_RIM)));
  ink.poly(...outer.map((tri): Poly => ({ tri: shifted(tri, ARM_SHADOW), color: NIGHT })));
  ink.poly(...outer.map((tri): Poly => ({ tri, color: PAPER })));
  ink.poly(...parts.map(([p, rx, ry, r]): Poly => ({ tri: fan(grow(ellipsePts(p[0], p[1], rx, ry, r, 28), lw)), color: K })));
  ink.poly(...parts.map(([p, rx, ry, r]): Poly => ({ tri: fan(ellipsePts(p[0], p[1], rx, ry, r, 28)), color: RED })));
  const sl = at(-4, -20);
  ink.poly({ tri: fan(ellipsePts(sl[0], sl[1], 16, 5, dir, 16)), color: PAPER });
  if (flick) {
    const tri: number[] = [];
    for (const deg of [-70, -25, 25, 70]) {
      const a = dir + deg * D2R;
      tri.push(...wedge(H[0] + Math.cos(a) * 120, H[1] + Math.sin(a) * 120, H[0] + Math.cos(a) * 168, H[1] + Math.sin(a) * 168, 12, 3));
    }
    ink.poly({ tri, color: PAPER });
  }
}

/** His ω (screen px, the law's, no jitter) and em at instant g of the throw: held (the haul, the swing) before THROW, flying from it. */
export function omegaAt(g: number, adv: Advance): { x: number; y: number; em: number } {
  if (g < THROW) {
    const p = throwPose(g, adv);
    return { x: p.x, y: p.y, em: p.em };
  }
  const p = flightAt(g);
  return { x: p.x, y: p.y, em: p.em };
}
/**
 * The swing's smear (R2-2): one swoosh along his ω's path over the last 3 frames, 0.4 em wide at its head (under his face) tapering to nothing
 * at its tail, AMBER at the head fading to PAPER (the print turns the pale amber into amber dots on paper), on a 6 px K keyline; drawn behind
 * him. It carries on through the release (THROW … +2, thinning) along the flight's first steps.
 */
export const SWOOSH = { frames: 3, width: 0.4, key: 6 } as const;
export function swooshPolys(d: number, adv: Advance, fade = 1): Poly[] {
  const g0 = Math.max(SWING.from, d - SWOOSH.frames);
  if (d - g0 < 0.5 || fade <= 0) return [];
  const n = 18;
  const pts = Array.from({ length: n + 1 }, (_, i): V2 => {
    const p = omegaAt(lerp(g0, d, i / n), adv);
    return [p.x, p.y];
  });
  const W = SWOOSH.width * omegaAt(d, adv).em * fade;
  const w = (x: number) => W * x ** 0.7;
  const out: Poly[] = [{ tri: taperedRibbon(pts, (x) => (x > 0 ? w(x) + 2 * SWOOSH.key : 0)), color: K }];
  const fill = taperedRibbon(pts, w);
  for (let i = 0; i < n; i++) out.push({ tri: fill.slice(12 * i, 12 * i + 12), color: tintRGB(PAPER, AMBER, ((i + 0.5) / n) ** 0.8) });
  return out;
}
function swoosh(ink: Ink, d: number, adv: Advance, fade = 1): void {
  ink.poly(...swooshPolys(d, adv, fade));
}
/**
 * The swing's speed lines (R2-2): three PAPER lines outside the arc — the fist's path over the last 2½ frames moved 70, 120 and 170 px out from
 * the loop — thin at their tails, 10 px at their heads; any stretch of them that would cross his body (his face's box + 28 px) is left out.
 */
export const SPEED_LINES = [70, 120, 170] as const;
export function speedLinePolys(d: number, adv: Advance): number[] {
  const g0 = Math.max(SWING.from, d - 2.5);
  const g1 = d - 0.4;
  if (g1 <= g0) return [];
  const T = throwPose(d, adv);
  const face = HERO_INK.flight[0];
  const [hx, hy] = omegaAnchor(face, T.x, T.y, T.em, T.rot, T.sx, T.sy, adv);
  const a = (widthOf(face, adv) / 2) * T.em * T.sx + 28;
  const b = 0.55 * T.em * T.sy + 28;
  const inside = (p: V2) => {
    const q = turn2([p[0] - hx, p[1] - hy], -T.rot);
    return (q[0] / a) ** 2 + (q[1] / b) ** 2 < 1;
  };
  const n = 14;
  const hand = Array.from({ length: n + 1 }, (_, i): V2 => throwPose(lerp(g0, g1, i / n), adv).hand);
  const tri: number[] = [];
  for (const k of SPEED_LINES) {
    const line = offsetLine(hand, k);
    let run: number[] = [];
    const emit = () => {
      if (run.length >= 2) tri.push(...ribbon(run.map((i) => line[i]), 1 + (9 * run[0]) / n, 1 + (9 * run[run.length - 1]) / n));
      run = [];
    };
    for (let i = 0; i <= n; i++) {
      if (inside(line[i])) emit();
      else run.push(i);
    }
    emit();
  }
  return tri;
}
function speedLines(ink: Ink, d: number, adv: Advance): void {
  const tri = speedLinePolys(d, adv);
  if (tri.length) ink.poly({ tri, color: PAPER });
}

/** A rectangle's outline as four wedges, `lw` wide centred on its edge. */
export function rectOutline(cx: number, cy: number, w: number, h: number, lw: number, rot = 0): number[] {
  const p = rectPts(cx, cy, w, h, rot);
  const out: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = p[i];
    const b = p[(i + 1) % 4];
    const dx = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    out.push(...wedge(a[0] - (dx * lw) / 2, a[1] - (dy * lw) / 2, b[0] + (dx * lw) / 2, b[1] + (dy * lw) / 2, lw, lw));
  }
  return out;
}
/** A convex loop clipped to the side of the line a → b on its left (Sutherland–Hodgman). */
export function clipLeft(pts: readonly V2[], a: V2, b: V2): V2[] {
  const side = (p: V2) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const out: V2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** The QUARANTINE stamp (sheet §3.6 row 5.3): RED double-ruled box, the line in broken ink (an 85 % tint: the print screens it), the serial. */
function stampInk(ink: Ink, d: number, adv: Advance): void {
  if (d < THROW - 2) return;
  // Whole on each frame (round 1: landing through the shutter it smeared into a red bar on its own drum frame).
  const s = lerp(1.4, 1, impactI(d, THROW - 2, THROW, 1.2));
  const { x, y, rot, w, h } = STAMP_AT;
  ink.poly({ tri: rectOutline(x, y, w * s, h * s, 8 * s, rot), color: RED }, { tri: rectOutline(x, y, (w - 32) * s, (h - 32) * s, 4 * s, rot), color: RED });
  ink.glyph('mono', ...textLine(STAMP, x - Math.sin(rot) * 4 * s, y - Math.cos(rot) * 4 * s, 64 * s, tintRGB(PAPER, RED, 0.85), adv, { rot }));
  const [sx, sy] = place([[300 * s, -40 * s]], x, y, rot)[0];
  ink.glyph('mono', ...textLine(SERIAL, sx, sy, 16 * s, RED, adv, { rot }));
}

/** The SPLASH! panel's Ben-Day (R2-6): pitch 24 at 45°, coverage 0.48, swelling to 0.62 on the kick and the splash and settling over 8 frames. */
export const SPLASH_DOTS = { pitch: 24, angle: 45 * D2R, base: 0.48, swell: 0.14, settle: 8 } as const;
export function splashDots(d: number): number {
  const t = d - lastOf([KICK_CUP, SPLASH], d);
  return SPLASH_DOTS.base + SPLASH_DOTS.swell * (t >= 0 && t < SPLASH_DOTS.settle ? 1 - t / SPLASH_DOTS.settle : 0);
}

/** The bright half of the incident (club 5.1 → 5.2): the kick on the PINK panel, CLINK!, the glass's arc, SPLASH! and the cherry. */
function incidentBright(f: number, L: InkLayout): InkDrawB[] {
  const adv = L.advance.face;
  const d = Math.floor(f + 0.5);
  const ink = new Ink(PAPER, camPose(incidentCam(f))).printOn(anchorOf(incidentCam(d)));
  // Lichtenstein's PINK Ben-Day as solid dots (a light pink tint would print as RED: the comic pass picks inks by raw hue and the paper is
  // cream). Round 2 (R2-6): real dots at ≥ 45 % (the shader screen's .35 printed ≈ 18 % pink against the prototype's 38–53 %), swelling
  // on the kick and the splash like the prototype's (its DM) — whole on each frame, the dots riding the panel.
  ink.cut().poly(benDay(0, 0, 2040, 1220, SPLASH_DOTS.pitch, SPLASH_DOTS.angle, splashDots(d), PINK)).cut();
  // K speed lines from the left: the kick's direction.
  const lines: number[] = [];
  for (let i = 0; i < 14; i++) {
    const y = 420 - i * 64 - hash(i, 3) * 30;
    lines.push(...wedge(-1000, y, -260 - 200 * hash(i, 4), y, 6 + 8 * hash(i, 5), 1));
  }
  ink.poly({ tri: lines, color: K });
  // The table; the glass launching spinning along its arc toward his face (club 5.1 → 5.1&); the cherry flying ahead of it.
  ink.poly(...inked(rectPts(234, -400, 24, 500), NIGHT, 5), ...inkedEllipse(250, -150, 120, 24, PAPER, 6));
  const gu = clamp((f - KICK_CUP) / 12);
  if (d < SPLASH) {
    const gx = (1 - gu) ** 2 * 235 + 2 * gu * (1 - gu) * 420 + gu * gu * 520;
    const gy = (1 - gu) ** 2 * -66 + 2 * gu * (1 - gu) * 300 + gu * gu * 70;
    const r = -0.55 * Math.max(0, f - KICK_CUP);
    const bowl = place([[-72, 80], [72, 80], [0, 0]], gx, gy, r);
    ink.poly(...inked(bowl, tintRGB(CYAN, PAPER, 0.25), 6));
    ink.poly(...inked(place(rectPts(0, -40, 10, 80), gx, gy, r), PAPER, 5), ...inked(place(ellipsePts(0, -82, 40, 10, 0, 32), gx, gy, r), PAPER, 5));
    const [a, b] = place([[-58, 71], [58, 71]], gx, gy, r);
    ink.poly({ tri: wedge(a[0], a[1], b[0], b[1], 6, 6), color: GLASS_RIM });
  }
  const cherry = (hx: number, hy: number) => {
    ink.poly(...inkedEllipse(hx, hy, 22, 22, RED, 5));
    ink.poly({ tri: stroke(quadPts([hx, hy + 20], [hx + 10, hy + 50], [hx + 24, hy + 58]), 5), color: K });
  };
  // The guest: calm, shades down — then splashed: the CYAN splat, his shades flying off, (・_・) dripping, the cherry on his head.
  const splashed = d >= SPLASH;
  if (splashed) {
    const t = Math.max(0, f - SPLASH);
    const s = popScale(t);
    ink.poly(...inked(starPts(G5[0], G5[1], 11, 150 * s, 250 * s, 13, 0.3, 10), CYAN, 7));
    for (let i = 0; i < 9; i++) {
      const a = 0.9 * Math.PI - i * 0.22 * Math.PI;
      const r = (270 + 30 * hash(i, 7)) * s + t * 6;
      ink.poly(...inkedEllipse(G5[0] + Math.cos(a) * r, G5[1] + Math.sin(a) * r, 16 * s, 20 * s, CYAN, 4));
    }
    const step = onTwos(f - SPLASH) * 2;
    for (let i = 0; i < 5; i++) {
      const tt = step - i * 2;
      if (tt >= 0) ink.poly(...inkedEllipse(480 + i * 40, -70 - tt * tt * 0.8, 9, 13, CYAN, 3));
    }
    const shx = 680 + 20 * t;
    const shy = 250 + 30 * t - t * t;
    for (const dx of [-1, 1]) ink.poly(...inked(place(ellipsePts(dx * 40, 0, 34, 30, 0, 32), shx, shy, -0.5 * t), K, 5));
  }
  ink.glyph('face', ...faceGlyphs(splashed ? GUEST_INK.wet : GUEST_INK.calm, G5[0], G5[1], GEM5, adv, { fill: PAPER, key: 5.5, shadow: 11 }));
  if (!splashed) {
    const ch = layoutText(GUEST_INK.calm, adv);
    const [l0, l1] = [1, 3].map((i): V2 => [G5[0] + ch[i].x * GEM5, G5[1] + BROW * GEM5]);
    ink.poly({ tri: wedge(l0[0] + 58, l0[1], l1[0] - 58, l1[1], 7, 7), color: K });
    for (const [x, y] of [l0, l1]) ink.poly(...inkedEllipse(x, y, 60, 56, K, 7));
    const cu = clamp((f - KICK_CUP) / 12);
    cherry(lerp(235, 560, cu), lerp(30, 205, cu) + 260 * Math.sin(Math.PI * cu));
  } else cherry(G5[0], 190);
  // The hero: the kick (his leg in three outline multiples), then dropping back as ヽ(•ω•).
  if (d < SPLASH) {
    const em = 220;
    const ax = KICK_AT[0] - coreOffset(HERO_INK.kick, adv) * em;
    const legs = layoutText(HERO_INK.kick, adv);
    const leg = legs[legs.length - 1];
    for (let i = 3; i > 0; i--) ink.glyph('face', ...faceGlyphs(leg.ch, ax + leg.x * em - 22 * i, KICK_AT[1] - 10 * i, em, adv, { fill: K, alpha: [0.12, 0.25, 0.4][i - 1] }));
    ink.glyph('face', ...faceGlyphs(HERO_INK.kick, ax, KICK_AT[1], em, adv, heroStyle(em)));
  } else {
    const u = launchL(Math.max(0, f - SPLASH));
    const em = 220;
    ink.glyph('face', ...faceGlyphs(HERO_INK.drop, lerp(-200, -300, u) - coreOffset(HERO_INK.drop, adv) * em, lerp(-40, -60, u), em, adv, heroStyle(em)));
  }
  // The impact star on the table's edge and CLINK! (B) on the kick; SPLASH! (A) arched between them on the splash.
  if (d < KICK_CUP + 24) {
    const s = popScale(f - KICK_CUP) * (1 - clamp((f - KICK_CUP - 6) / 4));
    if (s > 0.01) ink.poly(...inked(starPts(215, -20, 8, 60 * s, 110 * s, 4, 0.12), PAPER, 8));
    const xs = sfxAdvances(LETTERING.clink, 100, L.advance.sfx);
    [...LETTERING.clink].forEach((ch, i) => ink.glyph('sfx', ...sfxGlyphs(ch, 300 + xs[i], -262, 100, landScale(f - KICK_CUP), { face: PAPER, ex: 5, unprint: (f - KICK_CUP - 6 - i) / 8, ground: PAPER })));
  }
  if (d >= SPLASH - 2) {
    [...LETTERING.splash].forEach((ch, i) => {
      const a = (129 - i * 13) * D2R;
      ink.glyph('sfx', ...sfxGlyphs(ch, 280 + Math.cos(a) * 520, 20 + Math.sin(a) * 300, 130, landScale(f - SPLASH), { face: CYAN, ex: 6, rot: a - Math.PI / 2, unprint: (f - SPLASH - 10 - i) / 10, ground: PAPER }));
    });
  }
  return ink.done();
}

/**
 * The dark half (club 5.2 → the throw, and on as panel 9 of the page to club 6.1): lights out — only eyes; his eyes going red; the M × Y
 * plates registering into his true red; the red panel, the gutter, the rage, his arm; the stamp. Without the hero (`hero` false) it is the
 * diptych the page carries (he has left it: the flight draws him).
 */
function incidentDark(f: number, L: InkLayout, hero: boolean, wrap: (c: Cam) => Cam = (c) => c, stamp = true, openHand = true): InkDrawB[] {
  const adv = L.advance.face;
  const d = Math.floor(f + 0.5);
  const c = incidentCam(f);
  const world = camPose(wrap(c));
  const ink = new Ink(K, world).printOn(anchorOf(wrap(incidentCam(d))));
  // The friends we met, as their own eye pairs in the dark, one pair blinking each 16th (on twos).
  DARK_EYES.forEach((eyes, i) => {
    const blink = Math.floor((d - LIGHTS_OUT) / 6) % 8 === i && (onTwos(f) * 2) % 6 < 4;
    const [x, y] = DARK_SPOTS[i];
    ink.glyph('face', ...faceGlyphs(eyes, x, y, blink ? 58 * 0.12 : 58, adv, { fill: PAPER, sx: blink ? 1 / 0.12 : 1 }));
  });
  if (d < GRAB) {
    // The splash's droplets hang as PAPER specks; his • • amber and a sweat drop; the guest's ・ ・, then red ° ° growing; a "…".
    const specks: Poly[] = [];
    for (let i = 0; i < 14; i++) {
      const a = 0.95 * Math.PI - i * 0.145 * Math.PI - hash(i, 71) * 0.2;
      const r = 285 + 70 * hash(i, 72);
      specks.push({ tri: fan(ellipsePts(G5[0] + Math.cos(a) * r, G5[1] + Math.sin(a) * r * 0.85, 3 + 4 * hash(i, 73), 3 + 4 * hash(i, 73), 0, 12)), color: PAPER });
    }
    ink.poly(...specks);
    const em = 220;
    ink.glyph('face', ...faceGlyphs(HERO_INK.drop, -300 - coreOffset(HERO_INK.drop, adv) * em, -60, em, adv, { fill: AMBER, each: (i) => (i === 2 || i === 4 ? [0, 0] : null) }));
    ink.poly({ tri: fan([[-40, 92], ...ellipsePts(-40, 58, 12, 13, 0, 20).filter((p) => p[1] < 62)]), color: PAPER });
    const red = d >= RED_EYES;
    const g = red ? launchL((f - RED_EYES) * 0.8) : 1;
    const eyes = red ? GUEST_INK.redEyes : GUEST_INK.wet;
    const ch = layoutText(eyes, adv);
    for (const i of [1, 3]) ink.glyph('face', ...faceGlyphs(ch[i].ch, G5[0] + ch[i].x * GEM5, G5[1], GEM5 * (red ? 0.5 + 0.9 * g : 1), adv, { fill: red ? RED : PAPER }));
    ink.poly(...balloonPolys(470, 315, 70, 46, 520, 175, false, 5));
    ink.glyph('face', ...faceGlyphs('…', 470, 315, 60, adv, { fill: K }));
    // The plates (club 5.2a → 5.2&): magenta′ from the left, lemon′ from the right, printed over each other (multiply) on a white
    // silhouette of both, so each shows its own ink and where they meet they make exactly his red (I over a 32nd).
    if (d >= PLATES.from - 1) {
      const ox = 260 * (1 - Math.min(1, impactI(f, PLATES.from, PLATES.to, 1.6)));
      const plate = (x: number, fill: RGB) => faceGlyphs(GUEST_INK.rage, x, RAGE_AT[1], RAGE_EM, adv, { fill });
      ink.glyph('face', ...plate(RAGE_AT[0] - ox, [1, 1, 1]), ...plate(RAGE_AT[0] + ox, [1, 1, 1]));
      ink.at(world, 'print');
      ink.glyph('face', ...plate(RAGE_AT[0] - ox, MAGENTA_PLATE), ...plate(RAGE_AT[0] + ox, LEMON_PLATE));
      ink.at(world);
    }
    return ink.done();
  }
  // The red panel slams in along its slanted gutter (L, from 300 px lower right): PAPER under a dense RED line screen, the rage
  // cross-hatched behind him; the gutter PAPER between K edges.
  const sl = 1 - launchL((f - GRAB) * 0.9);
  const p0: V2 = [60 + 300 * sl, -540 - 300 * sl];
  const p1: V2 = [360 + 300 * sl, 540 - 300 * sl];
  const e0: V2 = [p0[0] - (p1[0] - p0[0]) * 0.6, p0[1] - (p1[1] - p0[1]) * 0.6];
  const e1: V2 = [p1[0] + (p1[0] - p0[0]) * 0.6, p1[1] + (p1[1] - p0[1]) * 0.6];
  const panel: V2[] = [e0, [2600, e0[1]], [2600, e1[1]], e1];
  ink.poly({ tri: fan(panel), color: PAPER }, { tri: fan(panel), color: RED, tint: 0.3, screen: 10, angle: 30 * D2R, lines: true, fixed: true });
  ink.poly({ tri: fan(clipLeft(ellipsePts(600, 40, 420, 330, 0, 64), e1, e0)), color: RED_SHADE, tint: 0.3, screen: 10, angle: 120 * D2R, lines: true, fixed: true });
  ink.poly({ tri: wedge(e0[0], e0[1], e1[0], e1[1], 48, 48), color: K }, { tri: wedge(e0[0], e0[1], e1[0], e1[1], 28, 28), color: PAPER });
  // Its jitters and phases below hash the frame as approved on the 61-bar map (v07Frame: v08's bridge A moved the club a bar).
  const shake = d < THROW ? 3 * (2 * hash(onTwos(v07Frame(f)), 9) - 1) : 0;
  ink.glyph('face', ...faceGlyphs(GUEST_INK.rage, RAGE_AT[0] + shake, RAGE_AT[1], RAGE_EM, adv, { fill: RED, key: 6.6, rim: 8, shadow: 12 }));
  if (d < THROW + FOLLOW.frames + FOLLOW.back) {
    // The throw (U2): his own arm and fist, the wind-up, the swing, the release on the drum (the hand flying open), the follow-through — in
    // screen space (the punch-in moves the page, never the one he holds), every pose taken at the output frame.
    const T = throwPose(d, adv);
    const S = shoulderAt(d, adv);
    ink.at(camPose(wrap(CAM0)));
    const swinging = d > SWING.from && d < THROW;
    const face = d >= SWING.from ? HERO_INK.flight[0] : HERO_INK.sweat;
    if (T.held) {
      // Round 2 (R2-2): one smear swoosh behind him (no multiples: two hollow copies 1 and 2 frames back knotted up with the lines) and three
      // speed lines outside the arc, never across his body; no RED ︵ (the arm is the red arc).
      if (hero && swinging) swoosh(ink, d, adv);
      if (swinging) speedLines(ink, d, adv);
      guestHose(ink, S, T.hand);
      if (hero) {
        const jx = d < SWING.from ? 3 * (2 * hash(onTwos(v07Frame(d)), 8) - 1) : 0;
        const [hx, hy] = omegaAnchor(face, T.x + jx, T.y, T.em, T.rot, T.sx, T.sy, adv);
        ink.glyph('face', ...faceGlyphs(face, hx, hy, T.em, adv, heroStyle(T.em, 1, { rot: T.rot, rimColor: RED, sx: T.sx, sy: T.sy })));
      }
      // The fist again over his head (his own arm under him, the fist on top: he is held).
      guestFist(ink, S, T.hand);
    } else {
      // Let go: the hand open (3 frames, flick marks on the drum and after), curling, a fist again; the arm snapping back into his shoulder.
      guestHose(ink, S, T.hand);
      // While it is open the flight draws the hand over him instead (openHand false): he leaves from under it.
      if (openHand || T.open < 1) guestHand(ink, S, T.hand, T.open, d < THROW + 2);
    }
    ink.at(world);
  }
  if (stamp) stampInk(ink, d, L.advance.mono);
  return ink.done();
}

/**
 * The party monitor's box, backed in the picture (round 1, T4/R4): the readout is the screen overlay over the comic, its backing hud.ts's 62 %
 * — tuned for v04's dark neon — so over the lit, receding page it turned into a grey veil with the page's glyphs (and a friend's eyes) showing
 * through its rows. A solid K plate under exactly its box (hud.ts's geometry, taken from the readout itself) from the lights-out keeps every
 * story line ([QUARANTINE] (•ω•), memory 128 %) on black from the throw (before it the ground is the lights-out's K anyway, and the swing's
 * low arc passes behind the box's corner: there he shows through it as before rather than being cut off); it fades over the 6 frames before
 * the clear, from where the ground is VOID and the box is v04's again up to the glass (the break's hand-off box is untouched: the readout
 * itself is not changed).
 */
export const PLATE_FADE = 6;
function monitorPlate(ink: Ink, d: number, L: InkLayout): void {
  const box = inkHudContent(d, L.advance.readout).under[0];
  if (!box || box.kind !== 'rect') return;
  const a = ((box.alpha ?? 0) / HUD.panel) * clamp((CLEAR - d) / PLATE_FADE);
  if (a <= 0.001) return;
  ink.at(SCREEN);
  ink.shape({ kind: 'rect', x: box.x, y: box.y, w: box.w, h: box.h, color: K, alpha: Math.min(1, a) });
}
/** A tapered wedge's loop (for `inked`). */
export function wedgeLoop(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number): V2[] {
  const l = Math.hypot(x1 - x0, y1 - y0) || 1;
  const nx = -(y1 - y0) / l;
  const ny = (x1 - x0) / l;
  return [[x0 + (nx * w0) / 2, y0 + (ny * w0) / 2], [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2], [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2], [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2]];
}
/** Club 5.1 → 5.3 at instant `f`. */
export function incidentFrame(f: number, L: InkLayout): InkDrawB[] {
  const d = frameOf(f);
  // The throw's frame is whole: its early sub-frames (routed here by their instant) draw the flight.
  if (d >= THROW) return flightFrame(f, L);
  return d < LIGHTS_OUT ? incidentBright(f, L) : incidentDark(f, L, true);
}
/** The diptych without him (panel 9 of the page, live from the throw to club 6.1, baked at its last instant). */
export const diptychFrame = (f: number, L: InkLayout): InkDrawB[] => incidentDark(f, L, false);

/** Design §10.3: the kick (64), the splash (64), the plates and the grab (48). */
export function incidentTemporal(frame: number): Temporal {
  if (frame >= KICK_CUP && frame < KICK_CUP + 7) return shutter(64, PRINT_SHUTTER);
  if (frame >= SPLASH && frame < SPLASH + 5) return shutter(64, PRINT_SHUTTER);
  if (frame >= PLATES.from - 1 && frame < GRAB + 5) return shutter(48);
  return shutter(24, PRINT_SHUTTER);
}

/** Printed (the lights-out is K ink: the pass keeps it solid), the dots riding the punch-in. */
export function incidentLook(frame: number): Look {
  return inkLook(frame, { screen: printAnchor(incidentCam(frame)) });
}

export const INCIDENT: InkPart = { frame: incidentFrame, temporal: incidentTemporal, look: incidentLook };
export const INCIDENT_RANGE = { from: KICK_CUP, to: THROW } as const;

// ——— Bar 6 · OUT OF THE PAGE (part `flight`, club 5.3 → 6.4; sheet §3.6 row 5.3 on, §3.7, §3.8, E13–E14) ————————————————————————————

/**
 * The page's nine panels, each frozen at its instant (sheet §3.8): the splash, P1, P2 (part A's), the record, the cocktail, the two-shot,
 * the lens, SPLASH!, and the diptych without him (live until club 6.1, then baked at its last instant).
 */
export const PANELS: readonly { k: number; part: 'splash' | 'record' | 'bar' | 'lens' | 'incident' | 'diptych'; at: number; x: number; y: number }[] = (
  [
    ['splash', DISCO],
    ['splash', INFECTIONS[0]],
    ['splash', TING],
    ['record', FLOWER],
    ['bar', MATCH_CUP + 6],
    ['bar', SHADES + 8],
    ['lens', LOCK + 2],
    ['incident', SPLASH + 4],
    ['diptych', club(6) - 1],
  ] as const
).map(([part, at], k) => ({ k, part, at, x: panelCentre(k)[0], y: panelCentre(k)[1] }));
/** The live panel 9 is the diptych until club 6.1. */
export const PANEL9 = PANELS[8];
/** Each panel's K border (page units, centred on its edge) and the page's furniture. */
const BORDER = 24;

/** The page's borders, indicia and page number, drawn over the baked panels in page units through `pose` (a frame the page's height). */
export function pageFurniture(L: InkLayout, pose: Pose): InkDrawB[] {
  const ink = new Ink(PAPER, pose);
  ink.items.length = 0;
  ink.at(pose);
  for (const p of PANELS) ink.poly({ tri: rectOutline(p.x, p.y, 1920, 1080, BORDER), color: K });
  ink.glyph('mono', ...textLine(INDICIA, -PAGE.w / 2 + PAGE.margin, -PAGE.h / 2 + 144, 78, K, L.advance.mono, { align: 0 }));
  ink.glyph('display', ...textLine(PAGE_NUMBER, PAGE.w / 2 - 240, -PAGE.h / 2 + 156, 192, K, L.advance.display, { align: 1 }));
  return ink.done();
}

/**
 * The page's camera at instant `f` (prototype `pcam`): panel 9 full frame on the throw, the whole page at half size from the throw, then
 * receding to 0.16, tilting back 32°, turning 8° and darkening by the clear. Round 1, as the prototype paces it: the pull-back eases out of
 * the throw from a small punch-out on the drum (pageLaunch: the rest of the pull-back starts from rest — the throw's drum is his, the
 * stamp's and the swing's), so panel 9 reads as a panel inside its borders for a few frames; and the launch moves the camera only 15 % of the way to the page's centre,
 * so panel 9 stays near the middle while he flies out of it. From club 5.4 (RECEDE) every hit kicks the page a step further (recedeAt) —
 * the rest of the way to the centre with it — still between hits (no drift between the drums to blur their accents).
 */
export function pageCam(f: number): { zoom: number; x: number; y: number; turn: number; pitch: number; dark: number } {
  const a = pageLaunch(f - THROW, frameOf(f) >= THROW);
  const b = recedeAt(f);
  const zoom = lg(1, 0.5, a) * (0.16 / 0.5) ** b;
  const m = 0.15 * a + 0.85 * b;
  return { zoom, x: lerp(PANEL9.x, 0, m), y: lerp(PANEL9.y, 0, m), turn: 8 * D2R * b, pitch: 32 * D2R * b, dark: 0.85 * b };
}
/**
 * The pull-back's progress t frames after the throw: a punch-out on the drum (PAGE_KICK of the way, taken whole on the throw's frame: panel
 * 9's borders and the page round it are there on the drum), then the rest critically damped from rest (τ 3 f) — no step after the kick is
 * as big as it (the throw's frame stays the drum's accent, check-sync), and nothing smears: ~46 % by +4, ~92 % by +12.
 */
export const PAGE_KICK = 0.12;
export const pageLaunch = (t: number, struck = t >= 0): number => (struck ? PAGE_KICK : 0) + (1 - PAGE_KICK) * (t <= 0 ? 0 : 1 - (1 + t / 3) * Math.exp(-t / 3));
/** The hits that kick the page back: the clap on club 5.4 (the recede's start), then the roll's to the clear. */
export const RECEDE_HITS: readonly number[] = [RECEDE.from, ...ROLL.filter((h) => h < CLEAR)];
/**
 * The page's recede, 0 → 1 from club 5.4 to the clear: each hit slaps it back an equal step — an impact (I) from the hit before, landing on
 * its own frame, so every drum is the frame the page moves most (the roll's 32nds a blur of slaps).
 */
export function recedeAt(f: number): number {
  const hits = RECEDE_HITS;
  let b = 0;
  hits.forEach((h, k) => {
    // The first slap (club 5.4) out of a near-still page: a shorter, harder run-in (8 f, power 3), so the drum's step stands out.
    const from = k > 0 ? hits[k - 1] : h - 8;
    b += (f >= h ? 1 : f <= from ? 0 : ((f - from) / (h - from)) ** (k > 0 ? 2.2 : 3)) / hits.length;
  });
  return clamp(b);
}
/** A camera tilted back by `pitch` (the page's top receding) and turned `turn`, looking at (x, y) on the page from FRONT / zoom. */
export function tiltedPose(c: { zoom: number; x: number; y: number; turn: number; pitch: number }): Pose {
  const d = FRONT / c.zoom;
  const s = Math.sin(c.pitch);
  const k = Math.cos(c.pitch);
  return { position: [c.x, c.y - d * s, d * k], target: [c.x, c.y, 0], up: [Math.sin(c.turn), Math.cos(c.turn) * k, Math.cos(c.turn) * s], fov: FOV };
}

/** The 15 crack angles of the v04 glass (src/shots/glass.ts SHARDS' first ring: the ray from the hit through each one's first corner). */
export const CRACK_ANGLES: readonly number[] = SHARDS.filter((s) => s.ring === 0).map((s) => Math.atan2(s.pts[1][1], s.pts[1][0]));

/** His em when thrown, at the glass, and the flight law (v04's heroAt, re-keyed: sheet §3.8). */
export const AT_GLASS_EM = 1800;
/** Where the glass's ω is on the hit (the v04 glass squashes about its glyphs' middle line: (×ω×) at em 818 puts the ω's ink 84 px below the centre). */
export const OMEGA_AT_HIT: V2 = [0, -84];
/** The ω's ink centre below its glyph's middle line, in ems (M PLUS Rounded 1c ExtraBold; measured on the v04 glass at rest: 37 px at em 360). */
export const OMEGA_INK_DROP = 0.103;

/**
 * The swing's velocity at the release (px per frame, y up): his ω's last step in the fist, from THROW − 1 to THROW. The flight takes it on
 * (round 1: v04's law started him from rest, so the release read as a teleport and a stop).
 */
export const RELEASE_V: V2 = ((): V2 => {
  const a = throwPose(THROW - 1, () => 0.6);
  return [WOUND[0] - a.x, WOUND[1] - a.y];
})();
/**
 * How fast the tumble dies out: rot falls as 1 − (1 − u)^TUMBLE_DECAY — v04's 2 (round 1 measured 3, which turns him face-on sooner: the 6 × 6
 * flash test got worse, his eyes then crossing more edge blocks on the roll).
 */
export const TUMBLE_DECAY = 2;
/**
 * The release's carry (round 2, R2-2/B2): the swing's exit velocity, `carry` of it, dying away with time constant `tau` (6 f; round 1's 3
 * halved the step every frame, 125 → 93 → 49 → 39 → 21 → 9 px/f, and he parked mid-air right of the centre for a beat) and turning on clockwise
 * `spin` rad a frame — the loop's own sense, so the swing's arc runs on as a long curve that bends him down into the centre — blended out by
 * (1 − v)^fade as the law takes over (most of it gone by club 5.4, all of it by the hit). His step then falls ≈ 25 % a frame, 172 → 111 → 85 →
 * 65 → 49 → 37 → 28 → 21 → 16 → 13 px/f, into a steady 7–10 px/f as he swoops back toward the centre (≤ 175 px right of it, ≈ 60 px by club 5.4).
 */
export const RELEASE = { carry: 0.68, tau: 5.5, spin: 0.11, fade: 6 } as const;
/**
 * The lunge (round 2, B2): his size and his way to the glass run on u = r + 0.2 ((1 − v)⁴ − (1 − v)^LUNGE), r being v04's progress 0.8 v +
 * 0.2 (1 − (1 − v)³) — a front-loaded bump, gone again by club 6.1 — so the swing's energy goes on as "at us" the moment he is let go: em grows
 * ≈ 5.6 px/f off the release (the swing grows him at about that rate into it), 200 → ≈ 250 by club 5.3& and ≈ 280 by club 5.4, and from club
 * 6.1 as round 1 (≈ 1710 on HIT − 1, 1800 on the hit). The tumble keeps r, so his spin and his turn on the hit are as tested.
 */
export const LUNGE = 16;
/**
 * The release's path t frames after the throw, before its blend: ∫₀ᵗ V e^(−s/τ) e^(−i·spin·s) ds (V the swing's exit velocity as a complex
 * number; the velocity decays and turns clockwise) = V (1 − e^(−(1/τ + i·spin) t)) / (1/τ + i·spin).
 */
export function releaseCarry(t: number): [number, number] {
  const a = 1 / RELEASE.tau;
  const b = RELEASE.spin;
  const e = Math.exp(-a * t);
  const nr = 1 - e * Math.cos(b * t);
  const ni = e * Math.sin(b * t);
  const den = a * a + b * b;
  const qr = (nr * a + ni * b) / den;
  const qi = (ni * a - nr * b) / den;
  return [RELEASE_V[0] * qr - RELEASE_V[1] * qi, RELEASE_V[0] * qi + RELEASE_V[1] * qr];
}
/**
 * Where the flight puts his ω at instant g (screen px, y up), his em and turn: v04's law, S0 = HELD_EM, from WOUND to the glass's ω, plus the
 * swing's momentum (releaseCarry: it leaves at the swing's exit velocity along the loop's tangent and curves on clockwise into the centre,
 * dying away over ~10 frames — the follow-through of his body — and blended out by the hit, so the law still lands his ω on the glass's).
 */
export function flightAt(g: number): { u: number; em: number; x: number; y: number; rot: number } {
  const v = clamp((g - THROW) / (HIT - THROW));
  // v04's progress (r), plus the lunge: a front-loaded term that is gone again by club 6.1 (so the roll keeps round 1's sizes, R5).
  const r = 0.8 * v + 0.2 * (1 - (1 - v) ** 3);
  const u = r + 0.2 * ((1 - v) ** 4 - (1 - v) ** LUNGE);
  const em = HELD_EM / (1 - (1 - HELD_EM / AT_GLASS_EM) * u);
  // The law runs from FLIGHT_FROM (round 1's release, where the roll was tuned against the 6 × 6 flash test): his own release point's offset
  // from it blends away with (1 − v)³ (≤ 12 px left by club 6.2) and the carry with (1 − v)^fade (mostly gone by club 5.4).
  const [cx, cy] = releaseCarry(Math.max(0, g - THROW));
  const k = (1 - v) ** RELEASE.fade;
  const k0 = (1 - v) ** 3;
  const ox = (WOUND[0] - FLIGHT_FROM[0]) * k0 + RELEASE.carry * k * cx;
  const oy = (WOUND[1] - FLIGHT_FROM[1]) * k0 + RELEASE.carry * k * cy;
  const x = FLIGHT_FROM[0] * (1 - u) + FLIGHT_BOW[0] * Math.sin(Math.PI * u) * (1 - u) + OMEGA_AT_HIT[0] * u + ox;
  const y = FLIGHT_FROM[1] * (1 - u) ** 2 + FLIGHT_BOW[1] * Math.sin(Math.PI * u) * (1 - u) + OMEGA_AT_HIT[1] * u + oy;
  // The tumble carries on the way the loop whirled him (clockwise), dying out face-on (−2π) at the hit.
  const rot = WOUND_ROT - (2 * Math.PI + WOUND_ROT) * (1 - (1 - r) ** TUMBLE_DECAY);
  return { u, em, x, y, rot };
}
/** The drums that jolt him in flight: the throw's kicks and the roll. */
const JOLTS: readonly number[] = [...new Set([...THROW_KICKS, ...ROLL])].filter((h) => h > THROW).sort((a, b) => a - b);
/** His face a beat each from the throw (Σ(°ω°;), (°ω°), (ﾟωﾟ;), (⊙ω⊙), (>ω<)). */
export const flightFace = (d: number): string => HERO_INK.flight[clamp(Math.floor((d - THROW) / 24), 0, HERO_INK.flight.length - 1)];

/** The plates as the tension meter (sheet §3.1): along his motion ∝ speed (≤ 12 px) to club 6.1, then 3, 8, ±12 → 20 rattling on the 32nds, in register on HIT − 1. */
export function flightPlates(frame: number): [number, number] {
  const p = flightAt(frame);
  const q = flightAt(frame - 1);
  const md = Math.atan2(p.y - q.y, p.x - q.x);
  const sp = Math.hypot(p.x - q.x, p.y - q.y);
  let m: number;
  if (frame >= HIT - 1) return [0, 0];
  else if (frame < club(6)) m = Math.min(12, sp / 40);
  else if (frame < club(6, 1)) m = 3;
  else if (frame < club(6, 2)) m = 8;
  else m = (12 + 8 * clamp((frame - club(6, 2)) / (HIT - 3 - club(6, 2)))) * (Math.floor((frame - club(6, 2)) / 3) % 2 ? -1 : 1);
  return [Math.cos(md) * m, Math.sin(md) * m];
}

/** The hero in flight at output frame d: his face, its advance centre (cx, cy), em, turn and squash, and his ω (P). */
export type FlyingPose = { face: string; cx: number; cy: number; em: number; rot: number; sx: number; sy: number; P: { x: number; y: number } };
/**
 * Where the hero in flight is drawn (AMBER, K keyline, PAPER rim), placed and turned by his ω; jitter on twos, a jolt per drum, smears after
 * jolts. Taken at the output frame (U3: whole on each frame — the shutter blurs the page under him, never his face). From club 6.2 (round 1,
 * R5: the 6 × 6 flash test; club(6, 1)) the jitter is capped at 8 px and a drum is only a 2 % size pump — no shove, no smear — because on a face wider
 * than the frame every shove or stretch swung the frame's edge columns, his strokes sweeping through them every 2–3 frames.
 */
export function heroInFlight(d: number, adv: Advance): FlyingPose {
  const f = d;
  const P = flightAt(f);
  const Q = flightAt(f - 1);
  const md = Math.atan2(P.y - Q.y, P.x - Q.x);
  const step = onTwos(v07Frame(f));
  const calm = d >= club(6, 1);
  let jx = 0;
  let jy = 0;
  if (d < HIT - 1) {
    // Capped at 16 px (8 from club 6.2): on a face a screen wide, v04's 3 + 3.5 % of the em swung whole blocks of the frame on twos. Round 2:
    // none while the release carries him (its first 6 frames), easing in by +12, so the carry's step falls smoothly.
    const a = Math.min(3 + 0.035 * P.em, calm ? 8 : 16) * clamp((d - THROW - 6) / 6);
    jx = a * (2 * hash(step, 31) - 1) * 0.5;
    jy = a * (2 * hash(step, 32) - 1) * 0.5;
  }
  // A jolt on every drum of the throw (6 f decay, none from the clear): 14 px plus 1 % of his em, and a 4 % pump of his size that fades as
  // he nears the glass — v04's (lines.ts heroAt) scaled with him, so each hit reads over the jitter on twos.
  const hit = lastOf(JOLTS, d);
  // Whole on the drum's frame: its early sub-frames (before the drum's instant) already carry the jolt.
  const jt = Math.max(0, f - hit);
  let pump = 1;
  if (jt >= 0 && jt < 6 && d < CLEAR) {
    const e = 1 - jt / 6;
    if (calm) pump = 1 + 0.02 * e;
    else {
      const ja = hash(v07Frame(hit), 33) * TAU;
      const j = (14 + 0.01 * P.em) * e;
      jx += Math.cos(ja) * j;
      jy += Math.sin(ja) * j;
      pump = 1 + 0.04 * e * (1 - P.u);
    }
  }
  const face = d >= HIT - 1 ? HERO_INK.flight[4] : flightFace(d);
  const em = P.em * pump;
  const rot = P.rot;
  // A smear along his motion for 2 frames after each jolt (until club 6.2): scale along the motion in his own frame.
  const smear = jt >= 0 && jt < 2 && !calm;
  const phi = md - rot;
  const c2 = Math.cos(phi) ** 2;
  const sx = smear ? 1.15 ** (2 * c2 - 1) : 1;
  const sy = smear ? 1.15 ** (1 - 2 * c2) : 1;
  const [cx, cy] = omegaAnchor(face, P.x + jx, P.y + jy, em, rot, sx, sy, adv);
  return { face, cx, cy, em, rot, sx, sy, P: { x: P.x + jx, y: P.y + jy } };
}
function flyingHero(ink: Ink, H: FlyingPose, adv: Advance): void {
  ink.glyph('face', ...faceGlyphs(H.face, H.cx, H.cy, H.em, adv, { fill: AMBER, key: Math.min(0.036 * H.em, 24), rim: Math.min(0.025 * H.em, 14), rot: H.rot, sx: H.sx, sy: H.sy }));
}

/** Club 5.3 → 6.4 at instant `f`. */
export function flightFrame(f: number, L: InkLayout): InkDrawB[] {
  const d = Math.floor(f + 0.5);
  if (d < THROW) return incidentFrame(f, L);
  const pc = pageCam(f);
  const pose = tiltedPose(pc);
  const ink = new Ink(VOID);
  /** Panel 9 under page camera p: its clip on screen, and how a camera of the diptych is carried by the page. */
  const live = (p: ReturnType<typeof pageCam>) => {
    const c9 = toScreen({ zoom: p.zoom, x: p.x, y: p.y, turn: 0 }, [PANEL9.x, PANEL9.y]);
    const clip: Clip = { x0: c9[0] - 960 * p.zoom, y0: c9[1] - 540 * p.zoom, x1: c9[0] + 960 * p.zoom, y1: c9[1] + 540 * p.zoom };
    const wrap = (c: Cam): Cam => ({ zoom: p.zoom * c.zoom, x: c.x + (p.x - PANEL9.x) / c.zoom, y: c.y + (p.y - PANEL9.y) / c.zoom, turn: 0 });
    return { clip, wrap };
  };
  if (d < CLEAR) {
    ink.page(pose);
    // Panel 9, live to club 6.1: the diptych as the page carries it (clipped to its panel: the page is square on until then).
    if (d < club(6)) {
      const now = live(pc);
      // Round 1 (T3/R3): until club 5.4 the stamp is taken at the output frame (the page may blur under it, never the gag's payoff).
      const sharpStamp = d < PAGE_AT;
      for (const item of incidentDark(f, L, false, now.wrap, !sharpStamp, false)) ink.items.push({ ...item, clip: now.clip });
      if (sharpStamp) {
        const out = live(pageCam(d));
        ink.at(camPose(out.wrap(incidentCam(d))), 'ink', out.clip);
        stampInk(ink, d, L.advance.mono);
      }
      ink.at(pose);
      ink.poly({ tri: rectOutline(PANEL9.x, PANEL9.y, 1920, 1080, BORDER), color: K });
    }
    ink.at(pose);
    // He crosses panel 9's border on club 5.3& (the clsnap): the K line snaps where his body crossed it, its two ends curl back out.
    if (d >= BORDER_SNAP) borderSnap(ink);
    // Panels 1–9 flick on the first nine roll hits.
    FLICKS.forEach((at, k) => {
      // A light tint and a thick K border thumping out (2 f): the panel pops without the block's luminance swinging (check-flash's 6 × 6 test).
      if (d >= at && d < at + 2) {
        ink.shape({ kind: 'rect', x: PANELS[k].x, y: PANELS[k].y, w: 1920, h: 1080, color: PAPER, alpha: 0.06 });
        ink.poly({ tri: rectOutline(PANELS[k].x, PANELS[k].y, 1920, 1080, d === at ? 72 : 48), color: K });
      }
    });
    if (pc.dark > 0) {
      ink.at(pose, 'print');
      ink.shape({ kind: 'rect', x: 0, y: 0, w: PAGE.w, h: PAGE.h, color: transmit(NIGHT, pc.dark) });
    }
    ink.at(SCREEN);
    reactions(ink, f, pc, L.advance.face);
  }
  ink.at(SCREEN);
  // The 15 primary focus lines on the glass's crack angles (fading up from club 5.4, thickening into the hit); from club 6.3 the 30 secondary
  // lines re-inked on every 16th (a new jitter and weight, constant ink; each line's inner end fixed — round 1, R5: re-inked on the 32nds with
  // new inner ends they flickered on threes).
  if (d >= PAGE_AT) {
    // Round 2: they slam in whole on the clap (full ink, 1.6× wide, settling by +3, taken at the output frame) instead of fading up from 75 %
    // — the release's carry now keeps him moving into club 5.4, and the clap needs its own mark (check-sync read 2568 as none).
    const a = 0.85 + 0.15 * clamp((d - PAGE_AT) / 12);
    const pop = 1 + 0.6 * clamp(1 - (d - PAGE_AT) / 3);
    const w = (d < club(6, 2) ? 6 : lerp(6, 14, clamp((f - club(6, 2)) / 18))) * pop;
    const tri: number[] = [];
    for (const ang of CRACK_ANGLES) tri.push(...wedge(Math.cos(ang) * 40, Math.sin(ang) * 40, Math.cos(ang) * 2400, Math.sin(ang) * 2400, 1, w * 4));
    ink.poly({ tri, color: PAPER, alpha: a });
  }
  if (d >= club(6, 2) && d < CLEAR) {
    const k = Math.floor((d - club(6, 2)) / 6);
    const tri: number[] = [];
    const widths = Array.from({ length: 30 }, (_, i) => 1 + 0.2 * (2 * hash(k, i, 43) - 1));
    const mean = widths.reduce((s, v) => s + v, 0) / widths.length;
    for (let i = 0; i < 30; i++) {
      const base = CRACK_ANGLES[Math.floor(i / 2)] + ((i % 2) + 1) * ((CRACK_ANGLES[(Math.floor(i / 2) + 1) % 15] - CRACK_ANGLES[Math.floor(i / 2)] + TAU) % TAU) / 3;
      const ang = base + 1.5 * D2R * (2 * hash(k, i, 41) - 1);
      const r0 = 300 + 300 * hash(i, 42);
      tri.push(...wedge(Math.cos(ang) * r0, Math.sin(ang) * r0, Math.cos(ang) * 2400, Math.sin(ang) * 2400, 1, (8 * widths[i]) / mean));
    }
    ink.poly({ tri, color: PAPER });
  }
  // BRRRRRRRRRRRRR: one letter per roll hit (B), growing and shakier, swallowed at the clear.
  if (d >= club(6) && d < CLEAR) {
    const st = onTwos(v07Frame(f));
    ROLL.forEach((at, i) => {
      if (d < at) return;
      const cap = Math.round(lerp(60, 160, i / 13) / 10) * 10;
      const sh = 4 * (2 * hash(st, i, 51) - 1);
      ink.glyph('sfx', ...sfxGlyphs(LETTERING.brrr[i], -350 + i * 90 + sh, -400 + 0.9 * i * i + sh, cap, landScale(f - at), { face: PAPER, key: 7, rot: (2 * hash(st, i, 52) - 1) * 8 * D2R }));
    });
  }
  // The speed-line halo round him (12 PAPER wedges, length ∝ speed), then him.
  const P = flightAt(f);
  const Q = flightAt(f - 1);
  // On the release frame his speed is the swing's (the law's previous instant is still WOUND): the halo bursts on the drum.
  const sp = d === THROW ? Math.hypot(RELEASE_V[0], RELEASE_V[1]) : Math.hypot(P.x - Q.x, P.y - Q.y);
  if (d < CLEAR) {
    const tri: number[] = [];
    const r0 = P.em * 0.75;
    const l = Math.min(260, sp * 3 + 30);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + onTwos(v07Frame(f)) * 0.1;
      tri.push(...wedge(P.x + Math.cos(a) * r0, P.y + Math.sin(a) * r0 * 0.5, P.x + Math.cos(a) * (r0 + l), P.y + Math.sin(a) * (r0 + l) * 0.5, 3, 8));
    }
    ink.poly({ tri, color: PAPER });
  }
  const H = heroInFlight(d, L.advance.face);
  // The swing's swoosh carries through the release, thinning out by THROW + 3 (R2-2).
  if (d < THROW + SWOOSH.frames) swoosh(ink, d, L.advance.face, 1 - (d - THROW) / SWOOSH.frames);
  spinMarks(ink, d, H, L.advance.face);
  flyingHero(ink, H, L.advance.face);
  // The hand flying open (R2-2): on the drum and the two frames after it, over him — the fist was on his head; he leaves from under the open
  // hand (panel 9's camera and clip, like the arm it ends). Curling on the 4th frame it is back in the panel, behind him.
  if (d < THROW + HAND_OPEN) {
    const out = live(pageCam(d));
    const T = throwPose(d, L.advance.face);
    ink.at(camPose(out.wrap(CAM0)), 'ink', out.clip);
    guestHand(ink, shoulderAt(d, L.advance.face), T.hand, T.open, d < THROW + 2);
    ink.at(SCREEN);
  }
  monitorPlate(ink, d, L);
  return ink.done();
}

/**
 * The tumble's spin, drawn (U2; round 1, T8/R8: the arcs sat inside his own glyphs as 7 px ticks): two classic rotation marks — PAPER arcs on
 * a K keyline outside his face (the laid-out string's half-length + 0.3 em from its centre), each trailing one end of him by 63° and thickening
 * to an arrowhead just behind that end, turning with him the way he spins (clockwise); strokes ≥ 10 px. From two frames after the release to
 * club 5.4 + 12.
 */
export function spinArcs(d: number, H: FlyingPose, adv: Advance): { pts: V2[]; w: number; head: V2[] }[] {
  if (d < THROW + 2 || d >= PAGE_AT + 12) return [];
  const fade = 1 - clamp((d - PAGE_AT) / 12);
  if (fade <= 0) return [];
  const r = (widthOf(H.face, adv) / 2) * H.em * H.sx + 0.3 * H.em;
  const w = Math.max(10, 0.06 * H.em) * Math.sqrt(fade);
  const at = (a: number, rr: number): V2 => [H.cx + Math.cos(a) * rr, H.cy + Math.sin(a) * rr];
  return [0, Math.PI].map((side) => {
    // Clockwise spin: "behind" an end is counter-clockwise of it (a larger angle).
    const head = H.rot + side + 0.14;
    const tail = head + 1.1 * fade;
    return { pts: Array.from({ length: 17 }, (_, i) => at(lerp(tail, head, i / 16), r)), w, head: [at(head - 0.16, r), at(head + 0.02, r + 1.4 * w), at(head + 0.02, r - 1.4 * w)] };
  });
}
function spinMarks(ink: Ink, d: number, H: FlyingPose, adv: Advance): void {
  for (const a of spinArcs(d, H, adv)) {
    ink.poly({ tri: ribbon(a.pts, 8, a.w + 8), color: K }, { tri: ribbon(a.pts, 0.5, a.w), color: PAPER });
    ink.poly(...inked(a.head, PAPER, 8));
  }
}

let snapMemo: { g: V2; t: V2; n: V2; s: number } | null = null;
/**
 * Where his body crosses panel 9's border on club 5.3& (BORDER_SNAP, the clsnap), page units: the border point his axis meets nearest his ω,
 * the border's direction there and its outward normal, and how far along his axis it is (screen px). Round 1 (T8): the notch was fixed at
 * the prototype's spot, which his new path had left 10 frames before.
 */
export function snapAt(): { g: V2; t: V2; n: V2; s: number } {
  if (snapMemo) return snapMemo;
  const P = flightAt(BORDER_SNAP);
  const pc = pageCam(BORDER_SNAP);
  // The page is square on until club 5.4 (no turn, no pitch): screen = (page − camera) × zoom.
  const o: V2 = [pc.x + P.x / pc.zoom, pc.y + P.y / pc.zoom];
  const u: V2 = [Math.cos(P.rot), Math.sin(P.rot)];
  const [x0, x1, y0, y1] = [PANEL9.x - 960, PANEL9.x + 960, PANEL9.y - 540, PANEL9.y + 540];
  let best: { g: V2; t: V2; n: V2; s: number } | null = null;
  const consider = (s: number, t: V2, n: V2) => {
    const g: V2 = [o[0] + u[0] * s, o[1] + u[1] * s];
    if (g[0] < x0 - 1 || g[0] > x1 + 1 || g[1] < y0 - 1 || g[1] > y1 + 1) return;
    if (!best || Math.abs(s) < Math.abs(best.s)) best = { g, t, n, s };
  };
  if (Math.abs(u[1]) > 1e-6) {
    consider((y1 - o[1]) / u[1], [1, 0], [0, 1]);
    consider((y0 - o[1]) / u[1], [1, 0], [0, -1]);
  }
  if (Math.abs(u[0]) > 1e-6) {
    consider((x0 - o[0]) / u[0], [0, 1], [-1, 0]);
    consider((x1 - o[0]) / u[0], [0, 1], [1, 0]);
  }
  const b = best ?? { g: [PANEL9.x, y1] as V2, t: [1, 0] as V2, n: [0, 1] as V2, s: Infinity };
  snapMemo = { ...b, s: Math.abs(b.s) * pc.zoom };
  return snapMemo;
}
/** The snapped border: a PAPER gap in the K line where he crossed, its two ends curling back out of the panel. */
function borderSnap(ink: Ink): void {
  const { g, t, n } = snapAt();
  const map = (tri: readonly number[]): number[] => {
    const out: number[] = [];
    for (let i = 0; i < tri.length; i += 2) out.push(g[0] + tri[i] * t[0] + tri[i + 1] * n[0], g[1] + tri[i] * t[1] + tri[i + 1] * n[1]);
    return out;
  };
  ink.poly({ tri: map(fan(rectPts(0, 0, 180, 80))), color: PAPER });
  ink.poly({ tri: map(arcBand(-120, 50, 50 - BORDER / 2, 50 + BORDER / 2, 0, -0.8 * Math.PI, 16)), color: K });
  ink.poly({ tri: map(arcBand(120, 50, 50 - BORDER / 2, 50 + BORDER / 2, -Math.PI, -0.2 * Math.PI, 16)), color: K });
}

/** The 8 reaction balloons (cast 21–26, "!!", "?!"), screen space round the frame, popping 1.5 f apart from club 5.4; shrinking, turning and darkening with the page. */
function reactions(ink: Ink, f: number, pc: ReturnType<typeof pageCam>, adv: Advance): void {
  const faces = [...REACTIONS.map((r) => r.infected), ...REACTION_MARKS];
  const k = Math.min(1, pc.zoom / pageCam(PAGE_AT + 12).zoom);
  const c = Math.cos(pc.turn);
  const s = Math.sin(pc.turn);
  const a = 1 - 0.8 * (pc.dark / 0.85);
  faces.forEach((face, i) => {
    const t = f - reactionAt(i);
    if (t < 0) return;
    const [x0, y0] = REACTION_SPOTS[i];
    const x = (x0 * c - y0 * s) * k;
    const y = (x0 * s + y0 * c) * k;
    const dd = Math.hypot(x0, y0);
    const w = widthOf(face, adv) * 54;
    const sc = popScale(t) * (1 + 0.04 * Math.sin(onTwos(v07Frame(f)) * 1.7 + i)) * k;
    ink.poly(...balloonPolys(0, 0, w / 2 + 38, 56, (-x0 / dd) * 110, (-y0 / dd) * 95, false, 6, NIGHT).map((p) => ({ ...scalePoly(p, sc, x, y), alpha: a })));
    ink.glyph('face', ...faceGlyphs(face, x, y, 54 * sc, adv, { fill: PAPER, mouth: AMBER, alpha: a }));
  });
}
/** Where the reaction balloons sit (screen px, y up: sheet §3.6 row 5.4). */
const REACTION_SPOTS: readonly V2[] = [[-600, 430], [-60, 460], [480, 440], [-640, 170], [820, 250], [-700, -140], [800, -40], [780, -230]];

/**
 * The throw's photography: 32 sub-frames at a 0.35 shutter while the page launches (round 1, T3: v04's 0.75 was for the neon flip; on the
 * printed page it smeared panel 9 into dot noise), then 32 @ 0.4, which keeps his panicking face and the receding page readable (32, not 24:
 * the page slaps back 20–59 px a frame on the recede hits — R14, the energy standard's ≥ 32 on fast frames; he is taken at the output frame).
 */
export const THROW_SHUTTER = 0.35;
export function flightTemporal(frame: number): Temporal {
  if (frame >= THROW && frame < THROW + 14) return shutter(32, THROW_SHUTTER);
  return shutter(32, 0.4);
}

/** Printed, the plates as the tension meter (flightPlates), the dots riding the page (and never finer than 5 px). */
export function flightLook(frame: number): Look {
  const pc = pageCam(frame);
  return { ...INK_FINISH, comic: comicPrint(flightPlates(frame), { pitch: bumpPitch(frame), screen: printAnchor({ zoom: pc.zoom, x: pc.x, y: pc.y, turn: pc.turn }) }) };
}

export const FLIGHT: InkPart = { frame: flightFrame, temporal: flightTemporal, look: flightLook };
export const FLIGHT_RANGE = { from: THROW, to: HIT } as const;

/** Bars 4–6, by part id (the scene routes these directly; src/shots/clubInk{Bar,Lens,Incident,Flight}.ts re-export them when live). */
export const B_PARTS: { bar: InkPart; lens: InkPart; incident: InkPart; flight: InkPart } = { bar: BAR, lens: LENS_PART, incident: INCIDENT, flight: FLIGHT };

