// S29 Z-BUFFER, drop2 3.1 − 6 … 5.1 − 1 (builder ZBUF; build sheet notes/d2build/sheet.md §5.6, §4.2 rows drop2 3.1–4.4&, §9 H1–H2): the one real
// 3D of drop 2 and the outro, as pure functions of the frame. The hero is his own glyph — (•ω•) rasterised exactly as S04 rasterised its giant
// face, turned into one signed-distance field per part (brackets, eyes, ω) and extruded 0.42 em with rounded edges — raymarched on the
// CPU through a perspective camera (the dolly-zoom, the orbit, the swing onto intro bar 4's framing, the collapse), and then drawn as
// characters on a grid: every cell takes the rays through it (supersampled; on fast moves each ray at its own instant of the shutter,
// so the cells blur instead of strobing) and prints one glyph in a design language chosen by depth — TERMINAL's ramp, RISO's two
// plates, donut.c's ramp and light (E7, src/shots/drop2Donut.ts), LED dots, NEON edge strokes, BRUTAL blocks, intro bar 4's own ramp and
// inks, Swiss digits. The characters are resolved once per output frame, so glyphs never smear. src/scenes/drop2Zbuf.ts copies the
// cells into flat glyph and shape fields. Pure: Node tests import it (no three / remotion / react).
// Rev 1 (review R1-02, R1-03, ω-illegible, near-still): his own light is fixed to him (the fronts are always the lit planes); his ω and
// eyes are a mask whose front cells keep their own ink as glyphs in every dialect (RISO prints them in solid plate tints, BRUTAL as
// amber / yellow glyphs, never a slab); the yaw is capped (≤ 20° under RISO, ≤ 28° on the conveyor) and the 3D reads from the walls, a
// pitch / roll sway, a dolly that pumps with the beat, a bounce that lands on every kick, a glint that sweeps his faces each beat and
// the backdrop's dots on a real plane behind him (parallax, motion-blurred); the pop lands its depth and its light on the downbeat
// itself; finer cells (13.5 → 12 → 10.8 px) with anti-aliased, coverage-faded characters that print strokes dense along the spine.
// Rev 3 (the whole-film review's fixes: the 20-bar sheet notes/bid2/drop2-sheet2.md §1.3 D, ZBUF2 in src/score/drop2.ts; design
// notes/extend/drop2-final.md §3.1 bars 37–38, §4.3): the orbit turns ±25° on ZBUF2_YAW's keys, ratcheted 3° on every 16th hat; the
// dolly-zoom grows him to 1250 px (65 % of the width) by 3.1&; the frame's ground is the front band's dialect, each change a radial
// cell wipe from his centre landing on its beat (two light beats: Riso pink on 3.2, Brutal cream with hard shadows on 4.2); the donut
// is one beat (re-formed on the 3.4 clap, his eyes riding the torus as @ nodes); the conveyor has four states; Defender's flat 2D scan
// line shears across his depth on 3.2; his ω on Swiss cells is amber (the colour law). Bar 4's frame, the blink, the collapse and the
// paper wipe are as built (but the ω's colour).
// Coordinates: world = S04's world px (FACE: 9.6 × 19.2 cells), origin at the face raster's centre, x right, y up, z toward the
// front-on camera; screen = layout px, 1920 × 1080, origin top-left, y down; the flat fields' world = screen − (960, 540), y up.
import { type Raster, RAMP } from '../actors/asciiFace.ts';
import { DIALECT_GLYPHS, READOUT2 } from '../content/drop2.ts';
import { type RGB, linear, mixRGB, scaleRGB, transmit } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { punch } from '../motion/hit.ts';
import { BLINK2, COLLAPSE, type Ground2, HATS2, HOOK2, KICKS2, OPEN_HATS2, POP, PUPILS, RES_STEPS, RIMS2, SWEEPS, SWING, SWISS_SWEEP, ZBUF2, ZBUF2_GROUNDS, ZBUF2_MARCH, ZBUF2_YAW, wobbleLfo } from '../score/drop2.ts';
import { partFrame } from '../score/film.ts';
import { FRAMES_PER_BAR } from '../score/tempo.ts';
import { terminalLook } from '../worlds/terminal.ts';
import * as DN from './drop2Donut.ts';
import { BAR4, COLOR_LAW_V2, LAW, PALETTES, SWISS_OMEGA, drop2Segment, impact, springL } from './drop2Shared.ts';
import { FACE } from './intro.ts';

export type Vec3 = [number, number, number];
export type PartKind = DN.PartKind;
export type Dialect = 'terminal' | 'riso' | 'donut' | 'led' | 'neon' | 'brutal' | 'bar4' | 'swiss';

/** Discrete changes are taken at the output frame (the characters are resolved there). */
const frameOf = (f: number): number => Math.floor(f + 0.5);
/** The pre-roll S28 draws over its whip with renderHero, then S29 itself. */
const PREROLL_FROM = POP - 6;
/** S29's last frame + 1: the hard match cut. */
const CUT = COLLAPSE.to + 3;

// ——— The hero's geometry (sheet §5.6.1) —————————————————————————————————————————————————————————————————————————————————————

/** The face, and which part each character is (S04's FaceCell.part is the character's index). */
export const FACE_TEXT = '(•ω•)';
const KINDS: readonly PartKind[] = ['bracket', 'eye', 'mouth', 'eye', 'bracket'];
/** (•ω•)'s core in M PLUS Rounded is 2.7 em wide (S27's master: 1240 px at em 459.6). */
const EMS_WIDE = 2.7;
/** The extrusion's depth and its rounding (sheet: 0.42 em and 0.03 em). */
const DEPTH_EM = 0.42;
const ROUND_EM = 0.03;
/** Raster px kept around each part's ink before its distance field is cut off. */
const MARGIN = 16;

export type InkBox = readonly [number, number, number, number];
/** One part of the face: its signed distance (world units, negative inside) on a crop of the raster. */
export type HeroPart = {
  kind: PartKind;
  index: number;
  /** Coverage centroid (world). */
  centre: readonly [number, number];
  /** Ink box [x0, x1, y0, y1] (world). */
  ink: InkBox;
  /** How deep its inside reaches (world): the swallow pushes it out by this much. */
  thick: number;
  sdf: Float32Array;
  w: number;
  h: number;
  /** World x of the crop's first column centre, world y of its first row centre. */
  left: number;
  top: number;
  px: number;
};
export type Hero = { parts: HeroPart[]; px: number; ink: InkBox; inkWidth: number; inkHeight: number; inkCentre: readonly [number, number]; em: number };

const INF = 1e20;
function edt1d(grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Uint16Array, z: Float64Array): void {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const d = q - r;
    grid[offset + q * stride] = f[r] + d * d;
  }
}
function edt2d(grid: Float64Array, width: number, height: number): void {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const v = new Uint16Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, v, z);
}

/**
 * The exact signed distance (px; negative inside, positive outside) to the edge of an anti-aliased coverage raster: the Euclidean
 * distance transform of Felzenszwalb & Huttenlocher, as src/engine/sdf.ts encodes it into 8 bits, here kept as floats so the
 * raymarcher can step by it and the swallow can push a part out by its whole thickness.
 */
export function signedDistance(alpha: Float32Array, w: number, h: number): Float32Array {
  const outer = new Float64Array(w * h);
  const inner = new Float64Array(w * h);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    if (a >= 1) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const d = 0.5 - a;
      outer[i] = d > 0 ? d * d : 0;
      inner[i] = d < 0 ? d * d : 0;
    }
  }
  edt2d(outer, w, h);
  edt2d(inner, w, h);
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  return out;
}

/** The hero from S04's raster of (•ω•) (actors/asciiFace.ts rasterParts on FACE's grid, any multiple of its sub-pixels). */
export function heroFromRaster(r: Raster): Hero {
  const W = r.cols * r.subX;
  const H = r.rows * r.subY;
  const px = FACE.cellW / r.subX;
  const parts = r.parts.map((alpha, index): HeroPart => {
    let u0 = W;
    let u1 = -1;
    let v0 = H;
    let v1 = -1;
    let sum = 0;
    let sx = 0;
    let sy = 0;
    for (let v = 0; v < H; v++) {
      for (let u = 0; u < W; u++) {
        const a = alpha[v * W + u];
        if (a <= 0.01) continue;
        if (u < u0) u0 = u;
        if (u > u1) u1 = u;
        if (v < v0) v0 = v;
        if (v > v1) v1 = v;
        sum += a;
        sx += a * (u + 0.5);
        sy += a * (v + 0.5);
      }
    }
    if (u1 < 0) throw new Error(`part ${index} of the face raster is empty`);
    const cu0 = Math.max(0, u0 - MARGIN);
    const cu1 = Math.min(W - 1, u1 + MARGIN);
    const cv0 = Math.max(0, v0 - MARGIN);
    const cv1 = Math.min(H - 1, v1 + MARGIN);
    const w = cu1 - cu0 + 1;
    const h = cv1 - cv0 + 1;
    const crop = new Float32Array(w * h);
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) crop[v * w + u] = alpha[(cv0 + v) * W + cu0 + u];
    const sdf = signedDistance(crop, w, h);
    let deepest = 0;
    for (let i = 0; i < sdf.length; i++) {
      sdf[i] *= px;
      if (sdf[i] < deepest) deepest = sdf[i];
    }
    const X = (u: number) => (u - W / 2) * px;
    const Y = (v: number) => (H / 2 - v) * px;
    return {
      kind: KINDS[index] ?? 'bracket',
      index,
      centre: [X(sx / sum), Y(sy / sum)],
      ink: [X(u0), X(u1 + 1), Y(v1 + 1), Y(v0)],
      thick: -deepest,
      sdf,
      w,
      h,
      left: X(cu0 + 0.5),
      top: Y(cv0 + 0.5),
      px,
    };
  });
  const ink: InkBox = [Math.min(...parts.map((p) => p.ink[0])), Math.max(...parts.map((p) => p.ink[1])), Math.min(...parts.map((p) => p.ink[2])), Math.max(...parts.map((p) => p.ink[3]))];
  const inkWidth = ink[1] - ink[0];
  return { parts, px, ink, inkWidth, inkHeight: ink[3] - ink[2], inkCentre: [(ink[0] + ink[1]) / 2, (ink[2] + ink[3]) / 2], em: inkWidth / EMS_WIDE };
}

/** The 2D signed distance (world) from (x, y) to one part's outline: bilinear on its crop, the distance to its ink box outside it. */
export function partDistance(p: HeroPart, x: number, y: number): number {
  const u = (x - p.left) / p.px;
  const v = (p.top - y) / p.px;
  if (u < 0 || v < 0 || u > p.w - 1 || v > p.h - 1) {
    const dx = Math.max(p.ink[0] - x, 0, x - p.ink[1]);
    const dy = Math.max(p.ink[2] - y, 0, y - p.ink[3]);
    return Math.max(Math.hypot(dx, dy), MARGIN * 0.5 * p.px);
  }
  const i = Math.min(Math.floor(u), p.w - 2);
  const j = Math.min(Math.floor(v), p.h - 2);
  const fu = u - i;
  const fv = v - j;
  const k = j * p.w + i;
  const s = p.sdf;
  return (s[k] * (1 - fu) + s[k + 1] * fu) * (1 - fv) + (s[k + p.w] * (1 - fu) + s[k + p.w + 1] * fu) * fv;
}

// ——— The schedule (sheet §5.6.3–§5.6.7) ———————————————————————————————————————————————————————————————————————————————————————

/** A grid of character cells (layout px): cell (c, r) spans [ox + c·cw, ox + (c + 1)·cw) × [oy + r·ch, oy + (r + 1)·ch). */
export type Grid = { cw: number; ch: number; ox: number; oy: number };
/** The backdrop's dim dot grid, registered to S28's: 12 × 22 from layout (0, 0). */
export const BACKDROP: Grid = { cw: 12, ch: 22, ox: 0, oy: 0 };
/**
 * The backdrop's dot as S28's grid shader draws it (1.3 px radius at each cell centre, #D8F5E1 at 12 %): JetBrains Mono's middle dot is
 * 0.166 em of ink, so 16 px gives ≈ 2.66 px; `drop` (layout px, down) puts its ink on the cell centre — measured on the drop2 3.1 − 1 → 3.1 + 1
 * frames, where the atlas's middle line left it 1.5 px high at 20 px (the integrator's fix for S28 → S29's registration).
 */
export const BACKDROP_DOT = { size: 16, drop: 1.2 } as const;
/** JetBrains Mono's middle dot is 0.166 em of ink. */
const DOT_INK_EM = 0.166;
const BAR4_GRID: Grid = { cw: BAR4.cellW, ch: BAR4.cellH, ox: BAR4.centre[0] - (BAR4.col0 + 0.5) * BAR4.cellW, oy: BAR4.centre[1] - (BAR4.row0 + 0.5) * BAR4.cellH };

/**
 * His cells change size on the kicks (RES_STEPS), coarse to fine: 13.5 × 24.75 from the pre-roll (fine enough that the ω keeps its two
 * lobes and the eyes read as dots; rev 0's 24 × 44 made them '####' bars and a pink blob), the backdrop's own 12 × 22 on the clap,
 * finer still (10.8 × 19.8) for the conveyor on drop2 3.4, S04's own cells in intro bar 4's frame. (RES_STEPS[1], the swallow, keeps the clap's
 * cells: the swallow is its own event.)
 */
export function cellGrid(f: number): Grid {
  const d = frameOf(f);
  if (d < RES_STEPS[0]) return { cw: 13.5, ch: 24.75, ox: 0, oy: 0 };
  if (d < RES_STEPS[2]) return { ...BACKDROP };
  if (d < RES_STEPS[3]) return { cw: 10.8, ch: 19.8, ox: 0, oy: 0 };
  if (d < RES_STEPS[4]) return { ...BAR4_GRID };
  return { ...BACKDROP };
}

/** How much of the extrusion intro bar 4's frame keeps: enough for the rounding to shade, little enough to land in S04's cells. */
const BAR4_DEPTH = 0.3;
/** The pop's overshoot: 0.6 em of depth at its peak (the sheet's 0.42 em is 1). */
export const POP_PEAK = 0.6 / DEPTH_EM;

/**
 * The dimension pop on drop2 3.1 (rev 1): the extrusion is already 0.36 em deep on the downbeat itself, overshoots to 0.6 em two frames later
 * and settles to 0.42 em by + 6 — the depth reads on the crash, not a beat after it.
 */
function popDepth(t: number): number {
  if (t < 0) return 0;
  if (t < 2) return lerp(0.85, POP_PEAK, Math.sin((Math.PI / 2) * (t / 2)));
  if (t < 6) return lerp(POP_PEAK, 1, 0.5 - 0.5 * Math.cos((Math.PI * (t - 2)) / 4));
  return 1;
}

/**
 * The extrusion (0 flat … 1 = 0.42 em): popped on drop2 3.1 (popDepth); eased down to BAR4_DEPTH by the swing so he lands in S04's flat face
 * cell for cell; flattened by the collapse (L keyed drop2 4.4&), exactly flat from drop2 5.1 − 3.
 */
export function extrusion(f: number): number {
  if (f >= COLLAPSE.to) return 0;
  if (f >= COLLAPSE.from - 1) return BAR4_DEPTH * clamp(1 - springL(f, COLLAPSE.from));
  if (f >= SWING.from) return lerp(1, BAR4_DEPTH, ease.inCubic(clamp((f - SWING.from) / (SWING.to - SWING.from))));
  return popDepth(f - POP);
}

/** His y-scale: S28's crouch (0.86) through the pre-roll, sprung out of it on drop2 3.1 (a soft spring: 0.86 → 1.05 → 1.0). */
export const squashY = (f: number): number => (f < POP - 1 ? 0.86 : 0.86 + 0.14 * (f - POP >= 40 ? 1 : springL(f, POP, 0.3)));

/** Both eyes in intro bar 4's frame: S04's blinkSquash curve on the grid (close, shut, open, done). Never one eye alone. */
export function eyeSquash(f: number): number {
  if (f < BLINK2.close || f >= BLINK2.done) return 1;
  if (f < BLINK2.shut) return lerp(1, 0.06, ease.inCubic((f - BLINK2.close) / (BLINK2.shut - BLINK2.close)));
  if (f < BLINK2.open) return 0.06;
  return lerp(0.06, 1, ease.outBack((f - BLINK2.open) / (BLINK2.done - BLINK2.open)));
}

/** He sees us (drop2 4.3&): the eye solids slide 0.05 em toward the lens (L), and back on the swing. Ems; the sign is the camera's side. */
export const pupilShift = (f: number): number => 0.05 * springL(f, PUPILS) * (1 - clamp((f - SWING.from) / (SWING.to - SWING.from)) ** 3);

/** The collapse's Swiss sweep through him: from his centre outward, 130 px a frame from the frame after drop2 4.4& (all of him by drop2 5.1 − 6). */
export const sweepRadius = (f: number): number => 130 * Math.max(0, frameOf(f) - COLLAPSE.from);
/** The paper card the backdrop's wipe holds around his flat face (px): it clears his 560 px face, a fifth of the frame. */
const PAPER_CARD = 360;
/** The backdrop cell centre farthest from PAPER_CENTRE is 1101 px out: the slam's reach covers it with a margin. */
const PAPER_REACH = 1120;
/** The slam's frames: it lands on the cut (drop2 5.1). */
const PAPER_SLAM = { from: CUT - 7, to: CUT } as const;
/**
 * The paper wipe of the backdrop (iteration 2, the director's ruling 6; sync review 6): it rides the Swiss sweep out to a card around him
 * (PAPER_CARD, by drop2 4.4& + 3, then creeping), then slams out to the corners (u⁴, fastest on its last frame), landing on the cut — S30's paper takes the frame
 * on the kick of drop2 5.1, and S29 never shows the whole frame white. (It used to cover the corners by drop2 5.1 − 4 at 130 px a frame: drop 2's
 * brightest frames, an unscheduled white 3–5 frames before the beat.)
 */
export function paperRadius(f: number): number {
  const d = frameOf(f);
  // The card keeps creeping out (12 px a frame) while he settles, so the held frames before the slam never stand still.
  const card = Math.min(sweepRadius(d), PAPER_CARD + 12 * Math.max(0, d - (COLLAPSE.from + 3)));
  const u = clamp((d - PAPER_SLAM.from) / (PAPER_SLAM.to - PAPER_SLAM.from));
  return card + (PAPER_REACH - card) * u ** 4;
}
const PAPER_CENTRE = [960, 520] as const;

/** Intro bar 4's CRT: on through the frame, drained by drop2 5.1 − 6. */
export function crtAmount(f: number): number {
  const d = frameOf(f);
  if (d < BLINK2.close) return 0;
  return d < COLLAPSE.from ? 1 : clamp(1 - (d - (COLLAPSE.from - 1)) / 7);
}

/** The lead's notes pulse his ω (+15 %, decaying). */
function omegaGlow(f: number): number {
  let g = 0;
  for (const n of HOOK2) if (n.at <= f && f - n.at < 12) g = Math.max(g, 0.15 * Math.exp(-(f - n.at) / 3));
  return g;
}

/** The 16th the hats are on (every 6 f from drop2 1.1). */
const sixteenth = (f: number): number => Math.floor((frameOf(f) - HATS2[0]) / 6);

/** On every 16th hat about 12 % of his cells (seeded per cell and per 16th) swap to the next shade up or down, held until the next hat. */
export function shimmer(f: number, col: number, row: number): -1 | 0 | 1 {
  const k = sixteenth(f);
  if (hash(col, row, k, 2901) >= 0.125) return 0;
  return hash(col, row, k, 2902) < 0.5 ? -1 : 1;
}

/**
 * The glint (rev 1: the 3D must never hold between hits): a slanted band of light sweeps across his front faces, edge to edge once a
 * beat and back on the next, turning round off his face on each kick — so his characters re-shade on every frame of the orbit, the way
 * a light passes over extruded type. 0 … 1 at screen point (x, y) for a face `width` px wide centred on `centre`.
 */
export const GLINT = { sigma: 80, gain: 0.4, slant: 0.35 } as const;
export function glint(f: number, x: number, y: number, centre: readonly [number, number], width: number): number {
  if (f < POP || f >= SWING.from) return 0;
  const u = ((f - POP) / 24) % 2;
  const tri = 1 - 2 * Math.abs(u - 1); // −1 on the even kicks, +1 on the odd ones
  const reach = width / 2 + GLINT.sigma;
  const at = centre[0] - tri * reach;
  const dx = x + GLINT.slant * (y - centre[1]) - at;
  return Math.exp(-(dx * dx) / (2 * GLINT.sigma * GLINT.sigma));
}

/** The wobble bass's filter LFO (+1 at its peaks; the score's one definition), from MARCH 0 (drop2 4.1) on: the depth bands ripple with it. */
const wobble = (f: number): number => (f < ZBUF2_MARCH[1] ? 0 : wobbleLfo(f));

// ——— The camera (sheet §5.6.8) ———————————————————————————————————————————————————————————————————————————————————————————————

type Key = { f: number; width: number; cy: number };
/** Drop 2's bar `bar` (1-based), plus `beat` beats (0-based, as barFrame): the orbit's keys sit on its kicks. */
const d2 = (bar: number, beat = 0): number => partFrame('drop2', bar, beat);
/**
 * The orbit's size and height keys (rev 3, the review fixes; design §4.3): the dolly-zoom grows him from the pre-roll's 960 px to 1250
 * px — 65 % of the width — by 3.1&, centred (960, 530); he stays that size through the orbit, pushed in 4 % on the claps (the scan, the
 * re-form, the cream ground), and swings onto intro bar 4's framing from it. (Rev 1–2 let him shrink to 960–1220 px.)
 */
const KEYS: readonly Key[] = [
  { f: POP, width: 960, cy: 520 },
  { f: ZBUF2.sizeBy, width: 1250, cy: 530 },
  { f: d2(3, 1), width: 1300, cy: 530 },
  { f: d2(3, 2), width: 1250, cy: 530 },
  { f: d2(3, 3), width: 1300, cy: 530 },
  { f: d2(4), width: 1250, cy: 530 },
  { f: d2(4, 1), width: 1300, cy: 530 },
  { f: d2(4, 2), width: 1250, cy: 530 },
  { f: SWING.from, width: 1250, cy: 530 },
];

/**
 * The orbit's yaw (°) through ZBUF2_YAW's keys — 0 on the pop, +25 on 3.2, 0 for the swallow, −25 on the re-form, the conveyor's −15,
 * +25, −10, 0 into bar 4 — on a Catmull-Rom (the keys sit a beat apart; held at the ends). Rev 1 capped the turn at 20° / 28° to keep his
 * ω legible; the review asked for the turn back, and the ω reads by its own mask (rev 2) at ±25°.
 */
export function yawKeyed(f: number): number {
  const K = ZBUF2_YAW;
  const n = K.length;
  const deg = (i: number): number => (K[i].at === POP ? POP_TURN.yaw : K[i].deg);
  if (f <= K[0].at) return deg(0);
  if (f >= K[n - 1].at) return deg(n - 1);
  let i = 0;
  while (f >= K[i + 1].at) i++;
  const p0 = deg(Math.max(0, i - 1));
  const p1 = deg(i);
  const p2 = deg(i + 1);
  const p3 = deg(Math.min(n - 1, i + 2));
  const t = (f - K[i].at) / (K[i + 1].at - K[i].at);
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}

/**
 * KEEP-FIRST (the sheet keeps the dimension pop exactly): on drop2 3.1 itself he is turned 14° and tipped 6° as built (rev 1: the depth
 * reads on the crash) — the orbit's first key is the pop's own pose, not ZBUF2_YAW's 0°; from there the keys run as the review asks.
 */
export const POP_TURN = { yaw: 14, pitch: 6 } as const;

/** The hat ratchet (design §4.3): each 16th hat kicks the orbit 3° further in its direction of travel — a 2 f launch, a 6 f decay. */
export const RATCHET = { deg: 3, launch: 2, decay: 6 } as const;
// (From the hat after the pop: drop2 3.1 itself lands crisp, an impact, as built.)
const RATCHET_HATS = HATS2.filter((h) => h > POP && h < SWING.from);
export function ratchet(f: number): number {
  let a = 0;
  for (const h of RATCHET_HATS) {
    const t = f - h;
    if (t <= 0 || t >= RATCHET.launch + RATCHET.decay) continue;
    const dir = Math.sign(yawKeyed(h + 3) - yawKeyed(h));
    const k = t < RATCHET.launch ? ease.outCubic(t / RATCHET.launch) : 1 - smoothstep(RATCHET.launch, RATCHET.launch + RATCHET.decay, t);
    a += dir * RATCHET.deg * k;
  }
  return a;
}
/** The orbit never turns further than this (the keys' 25° and the spline's overshoot past −25° into the conveyor, a ratchet step, the hand-held sway's 0.6 × 3°). */
export const YAW_MAX = 32;
/** The pitch (design §4.3): ±4° on a 2-bar sine from the pop — tipped 4° on the downbeat itself, so the extrusion reads on the crash. */
export const PITCH = { deg: 4, period: 192 } as const;
const LAND = { fov: BAR4.fov, scale: 1.3, cy: BAR4.centre[1] } as const;
const FLAT = { fov: 2, width: 560, cy: 520 } as const;
/** The FOV punch on the kicks from drop2 3.2 to 4.3 (−5 %, the picture zooms in on the hit). */
const PUNCH_KICKS = KICKS2.filter((k) => k >= d2(3, 1) && k <= d2(4, 2));
/**
 * The punch struck at the output frame (rev 2): its peak lands ON the kick frame (the whole of that frame’s shutter; none of the frame
 * before’s), then it springs back over 12 f. Rev 1 started it on the kick, where it is still 0, so the cells showed it a frame late
 * (drop2 4.3: 4.9 /255 of change against 6.6 on drop2 4.3 + 1).
 */
const kickPunch = (f: number): number => PUNCH_KICKS.reduce((a, k) => a + (f >= k - 0.5 ? punch(f + 1.5, k) : 0), 0);

/**
 * A hand on the camera that never rests (rev 1: between hits the orbit read as hit-then-hold): a small yaw, a bigger pitch (it never
 * fuses his parts, which sit side by side), a dutch roll, at periods of 32, 40 and 48 frames that never line up, and a dolly that pumps
 * with the beat; all faded in over the pop's first beat. Degrees and a share
 * of his size; the swing onto intro bar 4 starts from wherever it has carried him and lands it at 0.
 */
export function sway(f: number): { yaw: number; pitch: number; roll: number; dolly: number } {
  const t = f - POP;
  if (t <= 0) return { yaw: 0, pitch: 0, roll: 0, dolly: 0 };
  const env = smoothstep(0, 18, t);
  const w = (period: number, phase: number) => env * Math.sin((2 * Math.PI * t) / period + phase);
  // The dolly pumps with the beat like the sidechain, a 16th ahead of the bounce: it rests on the e and the a, where the bounce is fastest.
  const pump = env * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 24));
  return { yaw: 3 * w(32, Math.PI), pitch: 6 * w(40, 1.1), roll: 4 * w(48, 0.4), dolly: 0.04 * pump + 0.02 * w(96, 2.2) };
}

/**
 * He bounces on the beat (rev 1): lands on every kick (an impact, at full speed, tipped forward), launches off it and floats over the &
 * — a ball's bounce, 1 − |sin|, so the bob only rests at its apex. His whole face moves several px every frame, so the characters
 * re-quantise between the hits. Screen px down and degrees of pitch.
 */
export const NOD = { px: 18, pitch: 3.5 } as const;
export function nod(f: number): { y: number; pitch: number } {
  const t = f - POP;
  if (t <= 0) return { y: 0, pitch: 0 };
  const k = smoothstep(0, 12, t) * (1 - Math.abs(Math.sin((Math.PI * t) / 24)));
  return { y: NOD.px * k, pitch: NOD.pitch * k };
}

/**
 * Hermite through the keys with finite-difference tangents, at rest on the first (rev 3: the dolly eases out of the pre-roll's framing,
 * so drop2 3.1 lands crisp on S28's grid while the extrusion pops) and on the last.
 */
function track(f: number, get: (k: Key) => number): number {
  const n = KEYS.length;
  if (f <= KEYS[0].f) return get(KEYS[0]);
  if (f >= KEYS[n - 1].f) return get(KEYS[n - 1]);
  let i = 0;
  while (f >= KEYS[i + 1].f) i++;
  const tan = (j: number) => (j >= n - 1 || j <= 0 ? 0 : (get(KEYS[j + 1]) - get(KEYS[j - 1])) / (KEYS[j + 1].f - KEYS[j - 1].f));
  const dt = KEYS[i + 1].f - KEYS[i].f;
  const s = (f - KEYS[i].f) / dt;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * get(KEYS[i]) + (s3 - 2 * s2 + s) * dt * tan(i) + (-2 * s3 + 3 * s2) * get(KEYS[i + 1]) + (s3 - s2) * dt * tan(i + 1);
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const zoomOf = (fov: number) => 1 / Math.tan(rad(fov) / 2);
const fovOf = (zoom: number) => (2 * Math.atan(1 / zoom) * 180) / Math.PI;

export type ZCam = {
  fov: number;
  yaw: number;
  pitch: number;
  /** Dutch roll (°). */
  roll: number;
  /** Screen px per world unit on his plane (z = 0); his apparent width (px) where the keys give one. */
  scale: number;
  width: number;
  /** Where his centre (the target) lands on screen. */
  centre: readonly [number, number];
  target: Vec3;
  pos: Vec3;
  right: Vec3;
  up: Vec3;
  /** Toward the camera (view +z). */
  back: Vec3;
  /** Focal length in px (with the kick punch). */
  fpx: number;
  /** Camera to target. */
  dist: number;
};

/** Apparent width of a yawed slab 2.7 em wide and 0.42 em deep, as a share of its front-on width. */
const yawWidth = (yaw: number, hero: Hero) => Math.cos(rad(Math.abs(yaw))) + ((DEPTH_EM * hero.em) / hero.inkWidth) * Math.sin(rad(Math.abs(yaw)));

type Orbit = { fov: number; yaw: number; pitch: number; roll: number; scale: number; width: number; cy: number };

/**
 * The orbit at instant `f` (before the swing): the pre-roll's flat front-on face, then from the pop the yaw keys + the hat ratchet + the
 * hand-held sway's yaw × 0.6, the 2-bar pitch sine + his bounce, the sway's roll and dolly, the size keys.
 */
function orbit(f: number, hero: Hero): Orbit {
  if (f < POP) return { fov: 2, yaw: 0, pitch: 0, roll: 0, width: 960, cy: 520, scale: 960 / hero.inkWidth };
  const s = sway(f);
  const n = nod(f);
  const fov = f < d2(3, 1) ? 2 + 36 * ease.outCubic((f - POP) / (d2(3, 1) - POP)) : 38;
  const yaw = yawKeyed(f) + ratchet(f) + 0.6 * s.yaw;
  const width = Math.exp(track(f, (k) => Math.log(k.width))) * (1 + s.dolly);
  // (The pop's own tip, 6° as built, eases into the sine's 4° over the beat.)
  const tip = (POP_TURN.pitch - PITCH.deg) * (1 - smoothstep(POP, POP + 24, f));
  const pitch = PITCH.deg * Math.cos((2 * Math.PI * (f - POP)) / PITCH.period) + tip + n.pitch;
  return { fov, yaw, pitch, roll: s.roll, width, cy: track(f, (k) => k.cy) + n.y, scale: width / (hero.inkWidth * yawWidth(yaw, hero)) };
}

/** The 3D camera at instant `f`: the orbit through the keys, the swing (impact) onto intro bar 4's framing, its hold, the collapse (L). */
export function zbufCamera(f: number, hero: Hero): ZCam {
  let fov: number;
  let yaw: number;
  let pitch: number;
  let roll = 0;
  let scale: number;
  let width: number;
  let cy: number;
  let onBar4: number; // 0: aimed at his ink centre, 1: at the raster centre (S04's framing)
  const flatScale = FLAT.width / hero.inkWidth;
  if (f < SWING.from) {
    ({ fov, yaw, pitch, roll, scale, width, cy } = orbit(f, hero));
    onBar4 = 0;
  } else if (f < BLINK2.close) {
    const k = orbit(SWING.from, hero);
    const e = ease.inCubic((f - SWING.from) / (SWING.to - SWING.from));
    fov = fovOf(Math.exp(lerp(Math.log(zoomOf(k.fov)), Math.log(zoomOf(LAND.fov)), e)));
    yaw = lerp(k.yaw, 0, e);
    pitch = lerp(k.pitch, 0, e);
    roll = lerp(k.roll, 0, e);
    scale = Math.exp(lerp(Math.log(k.scale), Math.log(LAND.scale), e));
    width = scale * hero.inkWidth;
    cy = lerp(k.cy, LAND.cy, e);
    onBar4 = e;
  } else {
    const drift = 1 + 0.004 * Math.sin((2 * Math.PI * (Math.min(f, COLLAPSE.from - 1) - BLINK2.close)) / 48);
    const held = LAND.scale * drift;
    const p = f < COLLAPSE.from - 1 ? 0 : springL(f, COLLAPSE.from);
    fov = fovOf(Math.exp(lerp(Math.log(zoomOf(LAND.fov)), Math.log(zoomOf(FLAT.fov)), p)));
    yaw = 0;
    pitch = 0;
    scale = Math.exp(lerp(Math.log(held), Math.log(flatScale), p));
    width = scale * hero.inkWidth;
    cy = lerp(LAND.cy, FLAT.cy, p);
    onBar4 = 1 - p;
  }
  const kick = kickPunch(f);
  const fpx0 = 540 * zoomOf(fov);
  const fpx = 540 * zoomOf(fov * (1 - 0.05 * kick));
  const dist = fpx0 / scale;
  const target: Vec3 = [hero.inkCentre[0] * (1 - onBar4), hero.inkCentre[1] * (1 - onBar4), 0];
  const cp = Math.cos(rad(pitch));
  const back: Vec3 = [Math.sin(rad(yaw)) * cp, Math.sin(rad(pitch)), Math.cos(rad(yaw)) * cp];
  const rl = Math.hypot(back[2], back[0]);
  const r0: Vec3 = [back[2] / rl, 0, -back[0] / rl];
  const u0: Vec3 = [back[1] * r0[2] - back[2] * r0[1], back[2] * r0[0] - back[0] * r0[2], back[0] * r0[1] - back[1] * r0[0]];
  // The dutch roll turns the camera about its own axis.
  const cr = Math.cos(rad(roll));
  const sr = Math.sin(rad(roll));
  const right: Vec3 = [r0[0] * cr + u0[0] * sr, r0[1] * cr + u0[1] * sr, r0[2] * cr + u0[2] * sr];
  const up: Vec3 = [u0[0] * cr - r0[0] * sr, u0[1] * cr - r0[1] * sr, u0[2] * cr - r0[2] * sr];
  const pos: Vec3 = [target[0] + back[0] * dist, target[1] + back[1] * dist, target[2] + back[2] * dist];
  return { fov, yaw, pitch, roll, scale, width, centre: [960, cy], target, pos, right, up, back, fpx, dist };
}

/** Screen position (layout px) and view depth of world point `p`. */
export function project(cam: ZCam, p: readonly [number, number, number]): [number, number, number] {
  const vx = p[0] - cam.pos[0];
  const vy = p[1] - cam.pos[1];
  const vz = p[2] - cam.pos[2];
  const x = vx * cam.right[0] + vy * cam.right[1] + vz * cam.right[2];
  const y = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
  const z = -(vx * cam.back[0] + vy * cam.back[1] + vz * cam.back[2]);
  return [cam.centre[0] + (cam.fpx * x) / z, cam.centre[1] - (cam.fpx * y) / z, z];
}

// ——— The scene at one instant: the parts, the torus, their distances ——————————————————————————————————————————————————————————

type PartState = { part: HeroPart; on: boolean; k: number; push: number; blink: number; dx: number };
type TorusState = { m: DN.Mat3; ring: number; tube: number; grow: number; pop: number };
export type ZState = {
  f: number;
  cam: ZCam;
  hero: Hero;
  /** Half the extrusion's depth and its rounding (world). */
  hz: number;
  r: number;
  sy: number;
  anchor: number;
  parts: PartState[];
  torus: TorusState | null;
  /** smin's melt (world). */
  k: number;
  /** World AABB of everything: [x0, x1, y0, y1, z0, z1]. */
  box: [number, number, number, number, number, number];
};

/** Everything the distance function needs at instant `f`. */
export function zbufState(f: number, hero: Hero): ZState {
  const cam = zbufCamera(f, hero);
  const px = 1 / cam.scale; // world units per screen px on his plane
  const r = ROUND_EM * hero.em;
  const hz = Math.max(r * 1.05, (DEPTH_EM * hero.em * extrusion(f)) / 2);
  const sy = squashY(f);
  const anchor = hero.ink[2];
  const donut = DN.donutActive(f);
  const blink = eyeSquash(f);
  const look = Math.sign(cam.back[0]) * pupilShift(f) * hero.em;
  const parts = hero.parts.map((part): PartState => {
    const s = donut ? DN.swallowed(f, part.kind) : 0;
    const { pull, late } = DN.SWALLOW_PULL[part.kind];
    return {
      part,
      on: s < 0.999,
      k: 1 - pull * s,
      push: s ** late * (part.thick + 4 * px),
      blink: part.kind === 'eye' ? blink : 1,
      dx: part.kind === 'eye' ? look : 0,
    };
  });
  let torus: TorusState | null = null;
  if (donut) {
    const { a, b } = DN.donutSpin(f);
    const grow = DN.torusGrowth(f);
    torus = { m: DN.torusRotation(a, b), ring: DN.TORUS.ring * px, tube: DN.TORUS.tube * px, grow: DN.TORUS.tube * px * (1 - grow), pop: DN.torusPop(f) };
  }
  const pad = 8 * px + r;
  const top = anchor + (hero.ink[3] - anchor) * Math.max(1, sy);
  const box: ZState['box'] = [hero.ink[0] - pad, hero.ink[1] + pad, hero.ink[2] - pad, top + pad, -hz - pad, hz + pad];
  if (torus) {
    const o = (DN.TORUS.ring + DN.TORUS.tube) * px * torus.pop * 1.15 + pad;
    const [tx, ty, tz] = cam.target;
    box[0] = Math.min(box[0], tx - o);
    box[1] = Math.max(box[1], tx + o);
    box[2] = Math.min(box[2], ty - o);
    box[3] = Math.max(box[3], ty + o);
    box[4] = Math.min(box[4], tz - o);
    box[5] = Math.max(box[5], tz + o);
  }
  return { f, cam, hero, hz, r, sy, anchor, parts, torus, k: 60 * px, box };
}

/** Index of the nearest thing after a sceneDistance call: 0–4 the face's characters, 5 the torus. */
let nearest = -1;
/** …and how deep inside that part's outline the point lies, in his plane (world; ∞ for the torus). */
let nearestInner = 0;
const TORUS_ID = 5;

/** Signed distance (world) from (x, y, z) to everything at this instant. Sets `nearest` and `nearestInner`. */
export function sceneDistance(st: ZState, x: number, y: number, z: number): number {
  const ys = st.anchor + (y - st.anchor) / st.sy;
  const sf = Math.min(1, st.sy);
  const [cx0, cy0] = st.hero.inkCentre;
  let best = INF;
  let who = -1;
  let inner = 0;
  for (let i = 0; i < st.parts.length; i++) {
    const ps = st.parts[i];
    if (!ps.on) continue;
    let px = cx0 + (x - cx0) / ps.k;
    let py = cy0 + (ys - cy0) / ps.k;
    const pz = z / ps.k;
    const scale = ps.k * sf * ps.blink;
    // A cheap lower bound first: the slab and the ink box.
    const p = ps.part;
    const bx = Math.max(p.ink[0] - px, 0, px - p.ink[1]);
    const by = Math.max(p.ink[2] - py, 0, py - p.ink[3]);
    const lb = Math.max(Math.hypot(bx, by) * (ps.blink < 1 ? ps.blink : 1), Math.abs(pz) - st.hz) * ps.k * sf + ps.push;
    if (lb > best + st.k) continue;
    if (ps.blink !== 1) py = p.centre[1] + (py - p.centre[1]) / ps.blink;
    px -= ps.dx;
    const d2 = partDistance(p, px, py);
    const wx = d2 + st.r;
    const wy = Math.abs(pz) - st.hz + st.r;
    const out = Math.hypot(Math.max(wx, 0), Math.max(wy, 0));
    const d = (Math.min(Math.max(wx, wy), 0) + out - st.r) * scale + ps.push;
    if (d < best) {
      best = d;
      who = i;
      inner = -d2 * scale;
    }
  }
  const t = st.torus;
  if (t) {
    const c = st.cam;
    const vx = x - c.target[0];
    const vy = y - c.target[1];
    const vz = z - c.target[2];
    const q: Vec3 = [
      (vx * c.right[0] + vy * c.right[1] + vz * c.right[2]) / t.pop,
      (vx * c.up[0] + vy * c.up[1] + vz * c.up[2]) / t.pop,
      (vx * c.back[0] + vy * c.back[1] + vz * c.back[2]) / t.pop,
    ];
    const dt = DN.torusDistance(q, t.m, t.ring, t.tube) * t.pop + t.grow;
    if (dt < best) {
      who = TORUS_ID;
      inner = INF;
    }
    best = DN.smin(best, dt, st.k);
  }
  nearest = who;
  nearestInner = inner;
  return best;
}

/** Where a ray enters and leaves the scene's box, or null. */
function slab(st: ZState, o: Vec3, d: Vec3): [number, number] | null {
  let t0 = 0;
  let t1 = INF;
  for (let a = 0; a < 3; a++) {
    const lo = st.box[2 * a];
    const hi = st.box[2 * a + 1];
    if (Math.abs(d[a]) < 1e-12) {
      if (o[a] < lo || o[a] > hi) return null;
      continue;
    }
    let ta = (lo - o[a]) / d[a];
    let tb = (hi - o[a]) / d[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  return [t0, t1];
}

/** One sample of the depth render: what a ray through screen point (sx, sy) hits. */
export type Hit = {
  hit: boolean;
  range: number;
  depth: number;
  n: Vec3;
  who: number;
  /** The normal in world space (his front faces are +z). */
  w: Vec3;
  /** How deep inside the hit part's outline (world, in his plane; ∞ on the torus). */
  inner: number;
};

/** Sphere-traces the ray through screen point (sx, sy); fills `out` (the normal in view space). */
export function marchRay(st: ZState, sx: number, sy: number, out: Hit): Hit {
  const c = st.cam;
  const ux = (sx - c.centre[0]) / c.fpx;
  const uy = -(sy - c.centre[1]) / c.fpx;
  let dx = c.right[0] * ux + c.up[0] * uy - c.back[0];
  let dy = c.right[1] * ux + c.up[1] * uy - c.back[1];
  let dz = c.right[2] * ux + c.up[2] * uy - c.back[2];
  const l = Math.hypot(dx, dy, dz);
  dx /= l;
  dy /= l;
  dz /= l;
  out.hit = false;
  const span = slab(st, c.pos, [dx, dy, dz]);
  if (!span) return out;
  let t = span[0];
  const pxAt = 1 / c.fpx; // world per px per unit of distance
  for (let i = 0; i < 120 && t <= span[1]; i++) {
    const x = c.pos[0] + dx * t;
    const y = c.pos[1] + dy * t;
    const z = c.pos[2] + dz * t;
    const d = sceneDistance(st, x, y, z);
    const eps = 0.35 * t * pxAt;
    if (d < eps) {
      const who = nearest;
      const inner = nearestInner;
      const h = 0.6 * t * pxAt;
      const gx = sceneDistance(st, x + h, y, z) - sceneDistance(st, x - h, y, z);
      const gy = sceneDistance(st, x, y + h, z) - sceneDistance(st, x, y - h, z);
      const gz = sceneDistance(st, x, y, z + h) - sceneDistance(st, x, y, z - h);
      const gl = Math.hypot(gx, gy, gz) || 1;
      const nx = gx / gl;
      const ny = gy / gl;
      const nz = gz / gl;
      out.hit = true;
      out.range = t;
      out.depth = t * -(dx * c.back[0] + dy * c.back[1] + dz * c.back[2]);
      out.w = [nx, ny, nz];
      out.n = [nx * c.right[0] + ny * c.right[1] + nz * c.right[2], nx * c.up[0] + ny * c.up[1] + nz * c.up[2], nx * c.back[0] + ny * c.back[1] + nz * c.back[2]];
      out.who = who;
      out.inner = inner;
      return out;
    }
    t += Math.max(d * 0.92, eps * 0.5);
  }
  return out;
}

// ——— Lighting ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

const norm3 = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};
/**
 * His own key (upper left, frontal) and rim (from the right), fixed to him in world space (rev 1), so his front faces are always the lit
 * planes and the extrusion's walls fall into shade whichever way the camera turns. Rev 0 lit him in view space: past ≈ 30° of orbit the
 * walls took the key and the fronts went dark, and at −40° BRUTAL filled his walls yellow and coral and blacked out his face.
 */
const KEY_W = norm3([-0.35, 0.45, 0.82]);
const RIM_W = norm3([0.9, 0.15, -0.25]);
/** S04's light (actors/asciiFace.ts shadeFace). */
const S04_LIGHT = norm3([-0.5, 0.6, 0.62]);
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Key 0.75, rim 0.3 (on the walls), ambient 0.15, in his own light: front ≈ 0.77, side walls ≈ 0.42, top 0.49, underside 0.15. */
export const lumW = (n: Vec3): number => clamp(0.15 + 0.75 * Math.max(0, dot(n, KEY_W)) + 0.3 * Math.max(0, dot(n, RIM_W)) * (1 - Math.max(0, n[2])));
/** S04's shading: 0.3 + 0.7 · lit. */
const lum04Of = (n: Vec3): number => Math.min(1, 0.3 + 0.7 * Math.max(0, dot(n, S04_LIGHT)));

// ——— Sampling: supersampled cells, and the shutter on fast moves ——————————————————————————————————————————————————————————————

/** The shutter the cell pass integrates over on fast moves (frames, centred on the output frame). */
const SHUTTER = 0.5;
/** Instants on the shutter where he moves fast (the house rule: ≥ 32 wherever the picture moves > 20 px a frame). */
const FAST_INSTANTS = 64;

/** How far (screen px) the corners of his box move in one frame around `f` (the camera, the squash, the extrusion). */
export function screenSpeed(f: number, hero: Hero): number {
  const corners = (g: number) => {
    const st = zbufState(g, hero);
    const out: [number, number][] = [];
    for (const x of [hero.ink[0], hero.ink[1]]) {
      for (const y of [hero.ink[2], hero.ink[3]]) {
        for (const z of [-st.hz, st.hz]) {
          const p = project(st.cam, [x, st.anchor + (y - st.anchor) * st.sy, z]);
          out.push([p[0], p[1]]);
        }
      }
    }
    return out;
  };
  const a = corners(f - 0.5);
  const b = corners(f + 0.5);
  return Math.max(...a.map((p, i) => Math.hypot(b[i][0] - p[0], b[i][1] - p[1])));
}

export type Sampling = { sx: number; sy: number; instants: number[] };
/** Rays per cell (about one per 6 px; 8 × 8 on fast moves) and the instants they are taken at (one each on fast moves). */
export function zbufSampling(f: number, hero: Hero): Sampling {
  const g = cellGrid(f);
  const d = frameOf(f);
  const fast = (d >= ZBUF2.donut.from && d < ZBUF2.donut.to) || (d >= POP && screenSpeed(d, hero) > 20);
  // The pop and the swing are impacts: drop2 3.1 and intro bar 4's frame start crisp (no instant of the flat pre-roll on drop2 3.1, none of the
  // approach on drop2 4.4 and after).
  const floor = d >= BLINK2.close ? BLINK2.close : d >= POP ? POP : -INF;
  const instants = fast ? Array.from({ length: FAST_INSTANTS }, (_, i) => Math.max(floor, d + SHUTTER * ((i + 0.5) / FAST_INSTANTS - 0.5))) : [d];
  if (!fast || instants.every((t) => t === instants[0])) return { sx: Math.max(2, Math.ceil(g.cw / 4)), sy: Math.max(2, Math.ceil(g.ch / 4)), instants: [instants[0]] };
  return { sx: 8, sy: 8, instants };
}

// ——— The cell pass ——————————————————————————————————————————————————————————————————————————————————————————————————————————

export type ZCell = {
  /** One of the two @ nodes his eyes become on the torus (the donut, rev 3). */
  node?: boolean;
  col: number;
  row: number;
  /** Centre (layout px). */
  x: number;
  y: number;
  /** One of his cells (else a backdrop cell). */
  hero: boolean;
  /** A backdrop cell the collapse has turned to paper. */
  paper: boolean;
  cover: number;
  lum: number;
  lum04: number;
  /** donut.c's light index (0–11). */
  donut: number;
  /** Mean view depth and ray length of the hits (world). */
  depth: number;
  range: number;
  /** Which depth band (0 front, 1 mid, 2 back; continuous). */
  band: number;
  /** How much the hits face his front (the mean of the world normal's z: 1 on his front faces, 0 on the extrusion's walls). */
  front: number;
  /** How deep inside his stroke the cell sits (screen px from the part's outline; large on the torus). */
  inner: number;
  /** The glint's light on this cell (0 … 1, front faces only; already added to lum). */
  glint: number;
  /** A backdrop dot's apparent size (1 = S28's grid; the plane recedes and turns in parallax). */
  dot?: number;
  /** How far the dot travels over the shutter (screen px) and which way (radians, counter-clockwise, y up): its motion streak. */
  streak?: number;
  angle?: number;
  part: PartKind | 'torus' | null;
  /** Which of his characters (0–4: ( • ω • ), 5 the torus; −1 none). */
  pid: number;
  /** One of a feature's (ω, eye) front cells on the outline of that front face (a 4-neighbour is not the same face). */
  outline: boolean;
  /** Edge strength and the stroke's orientation (for NEON); `silhouette`: a neighbour is not his. */
  edge: number;
  stroke: string;
  silhouette: boolean;
  dialect: Dialect | null;
  ch: string;
  /** The ink's name (for tests and the colour table). */
  ink: string;
};
export type ZFrame = { f: number; grid: Grid; cam: ZCam; cells: ZCell[]; sampling: Sampling };

const PART_OF: readonly (PartKind | 'torus')[] = ['bracket', 'eye', 'mouth', 'eye', 'bracket', 'torus'];
/** His features' part ids: the left eye, the ω, the right eye. */
const FEATURE_PIDS = [1, 2, 3] as const;

/** The dot plane lies this far behind his centre (a share of his ink width; world units). */
const PLANE_BACK = 0.35;
/** An affine map from S28's layout px to the screen: screen = at + m · (p − from). */
export type DotMap = { from: readonly [number, number]; at: readonly [number, number]; m: readonly [number, number, number, number] };
/**
 * Where the backdrop's dots go (rev 1): they lie on a plane behind him, seen through the 3D camera — exactly S28's grid on drop2 3.1, then
 * receding through the dolly-zoom and sliding against his turn, so the orbit reads as a camera move, not a turntable. The plane's
 * projection is linearised at the point behind his centre (exact there; dim 2.6 px dots never show the rest), which keeps the lattice
 * unbounded: its edge can never show, however far he turns.
 */
export function dotMap(cam: ZCam, hero: Hero): DotMap {
  const back = PLANE_BACK * hero.inkWidth;
  const w: Vec3 = [hero.inkCentre[0], hero.inkCentre[1], -back];
  const frame = (c: ZCam) => {
    const p = project(c, w);
    const x = project(c, [w[0] + 1, w[1], w[2]]);
    const y = project(c, [w[0], w[1] + 1, w[2]]);
    return { p: [p[0], p[1]] as const, ex: [x[0] - p[0], x[1] - p[1]], ey: [y[0] - p[0], y[1] - p[1]] };
  };
  const o = frame(zbufCamera(POP, hero));
  const n = frame(cam);
  // m = [ex ey] · [ex0 ey0]⁻¹
  const det = o.ex[0] * o.ey[1] - o.ey[0] * o.ex[1];
  const i = [o.ey[1] / det, -o.ey[0] / det, -o.ex[1] / det, o.ex[0] / det];
  const m = [n.ex[0] * i[0] + n.ey[0] * i[2], n.ex[0] * i[1] + n.ey[0] * i[3], n.ex[1] * i[0] + n.ey[1] * i[2], n.ex[1] * i[1] + n.ey[1] * i[3]] as const;
  return { from: o.p, at: n.p, m };
}

/**
 * The conveyor's states, front / mid / back (rev 3, design §3.1): the re-form on 3.4 (LED, NEON, BRUTAL), MARCH 0 on 4.1 (NEON, LED,
 * RISO: the old 4.1 re-form's set), 4.2 (BRUTAL, NEON, TERMINAL), 4.3 (TERMINAL home, BRUTAL, NEON) — one per ZBUF2_MARCH kick.
 */
export const CONVEYOR2: readonly (readonly [Dialect, Dialect, Dialect])[] = [
  ['led', 'neon', 'brutal'],
  ['neon', 'led', 'riso'],
  ['brutal', 'neon', 'terminal'],
  ['terminal', 'brutal', 'neon'],
];
/** A march flows in from the back over this many frames and lands on its kick (an impact): the front changes language on the hit. */
const MARCH_FLOW = 8;
/** A depth band is 220 px deep at his scale. */
const BAND_PX = 220;

/**
 * The dialect of one of his cells at output frame `d`: by the schedule, its band and its rank (0 nearest … 1 farthest in depth; in the
 * collapse, 1 once the paper wipe has reached it). `ripple` false: the conveyor's bands without the wobble's ripple (his ω, rev 2).
 * `torus`: the cell is the donut's (it stays donut.c's until it has thinned back into his brackets on the 3.4 clap).
 */
export function dialectAt(d: number, band: number, rank: number, ripple = true, torus = false): Dialect {
  const sweep = SWEEPS[0];
  if (d < sweep.from) return 'terminal';
  if (d < sweep.to) return rank >= 1 - ease.inCubic((d - sweep.from) / (sweep.to - sweep.from)) ? 'riso' : 'terminal';
  if (d < ZBUF2.donut.from) return 'riso';
  if (d < BLINK2.close) {
    // The donut, one beat; from the re-form's start his returning parts already take the conveyor's first state.
    if (d < ZBUF2.reform.from || (torus && d < ZBUF2.reform.to)) return 'donut';
    const pos = band - (ripple ? 0.35 * wobble(d) : 0);
    const b = clamp(Math.floor(pos + 0.5), 0, 2);
    let k = 0;
    for (let i = 1; i < ZBUF2_MARCH.length; i++) if (d >= ZBUF2_MARCH[i] - MARCH_FLOW) k = i;
    if (k === 0) return CONVEYOR2[0][b];
    // March k flows in from the back and lands on its kick (an impact): a band has turned once the wave (2 the back … 0 the front) is past it.
    const wave = 2 * (1 - impact(d, ZBUF2_MARCH[k], MARCH_FLOW));
    return clamp(pos, -0.5, 2.5) + 0.5 >= wave ? CONVEYOR2[k][b] : CONVEYOR2[k - 1][b];
  }
  if (d < SWISS_SWEEP.from) return 'bar4';
  if (d < SWISS_SWEEP.to) return rank >= 1 ? 'swiss' : 'bar4';
  return 'swiss';
}

const NEON_STROKES = DIALECT_GLYPHS.neon; // ─│╱╲┼
const strokeOf = (gx: number, gy: number): string => {
  let a = Math.atan2(gy, gx);
  if (a < 0) a += Math.PI;
  const o = Math.round(a / (Math.PI / 4)) % 4; // 0 gradient →: │, 1 ↘: ╱, 2 ↓: ─, 3 ↙: ╲
  return ['│', '╱', '─', '╲'][o];
};
const PERPENDICULAR: Readonly<Record<string, string>> = { '│': '─', '─': '│', '╱': '╲', '╲': '╱' };

/** S29 at output frame `f`: the cells (his, and in 'full' mode the backdrop's), each with its dialect and character. */
export function zbufFrame(f: number, hero: Hero, mode: 'full' | 'hero' = 'full'): ZFrame {
  const d = frameOf(f);
  const grid = cellGrid(d);
  const sampling = zbufSampling(d, hero);
  const states = sampling.instants.map((t) => zbufState(t, hero));
  const cam = states.length === 1 ? states[0].cam : zbufCamera(d, hero);
  // His screen box over the shutter: only those cells are traced.
  let bx0 = INF;
  let bx1 = -INF;
  let by0 = INF;
  let by1 = -INF;
  for (const st of states) {
    for (const x of [st.box[0], st.box[1]]) {
      for (const y of [st.box[2], st.box[3]]) {
        for (const z of [st.box[4], st.box[5]]) {
          const p = project(st.cam, [x, y, z]);
          bx0 = Math.min(bx0, p[0]);
          bx1 = Math.max(bx1, p[0]);
          by0 = Math.min(by0, p[1]);
          by1 = Math.max(by1, p[1]);
        }
      }
    }
  }
  const c0 = Math.max(Math.floor((Math.max(bx0, 0) - grid.ox) / grid.cw) - 1, Math.floor(-grid.ox / grid.cw));
  const c1 = Math.min(Math.floor((Math.min(bx1, 1920) - grid.ox) / grid.cw) + 1, Math.floor((1920 - 1e-6 - grid.ox) / grid.cw));
  const r0 = Math.max(Math.floor((Math.max(by0, 0) - grid.oy) / grid.ch) - 1, Math.floor(-grid.oy / grid.ch));
  const r1 = Math.min(Math.floor((Math.min(by1, 1080) - grid.oy) / grid.ch) + 1, Math.floor((1080 - 1e-6 - grid.oy) / grid.ch));
  const cols = Math.max(0, c1 - c0 + 1);
  const rows = Math.max(0, r1 - r0 + 1);
  const { sx, sy } = sampling;
  const n = sx * sy;
  const inst = states.length;
  const hit: Hit = { hit: false, range: 0, depth: 0, n: [0, 0, 1], who: -1, w: [0, 0, 1], inner: 0 };
  type Acc = { hits: number; lum: number; lum04: number; dl: number; depth: number; range: number; nz: number; wz: number; inner: number; parts: number[] };
  const acc: (Acc | null)[] = new Array(cols * rows).fill(null);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const col = c0 + c;
      const row = r0 + r;
      const x0 = grid.ox + col * grid.cw;
      const y0 = grid.oy + row * grid.ch;
      const shift = inst > 1 ? Math.floor(hash(col, row, 2903) * inst) : 0;
      let a: Acc | null = null;
      for (let j = 0; j < sy; j++) {
        for (let i = 0; i < sx; i++) {
          const k = j * sx + i;
          const st = states[(k + shift) % inst];
          marchRay(st, x0 + ((i + 0.5) / sx) * grid.cw, y0 + ((j + 0.5) / sy) * grid.ch, hit);
          if (!hit.hit) continue;
          a ??= { hits: 0, lum: 0, lum04: 0, dl: 0, depth: 0, range: 0, nz: 0, wz: 0, inner: 0, parts: [0, 0, 0, 0, 0, 0] };
          a.hits++;
          a.lum += lumW(hit.w);
          a.lum04 += lum04Of(hit.n);
          a.dl += hit.n[1] + hit.n[2];
          a.depth += hit.depth;
          a.range += hit.range;
          a.nz += hit.n[2];
          a.wz += hit.w[2];
          a.inner += Math.min(hit.inner, 1e4);
          if (hit.who >= 0) a.parts[hit.who]++;
        }
      }
      acc[r * cols + c] = a;
    }
  }
  // Edges for NEON: the Sobel of S = cover · (0.35 + 0.65 · n_z), at cell resolution.
  const S = new Float32Array(cols * rows);
  for (let i = 0; i < S.length; i++) {
    const a = acc[i];
    S[i] = a ? (a.hits / n) * (0.35 + 0.65 * Math.max(0, a.nz / a.hits)) : 0;
  }
  const at = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? 0 : S[r * cols + c]);
  const isHero = (c: number, r: number) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
    const a = acc[r * cols + c];
    return !!a && a.hits / n >= 0.25;
  };
  // The Sobel of S per cell (px⁻¹), then thinned to one cell across: an edge cell must not be weaker than his cells on either side
  // of it along its gradient (non-maximum suppression, so a stroke 5 cells wide shows two lines, not a filled band).
  const EX = new Float32Array(cols * rows);
  const EY = new Float32Array(cols * rows);
  const E = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gx = at(c + 1, r - 1) + 2 * at(c + 1, r) + at(c + 1, r + 1) - at(c - 1, r - 1) - 2 * at(c - 1, r) - at(c - 1, r + 1);
      const gy = at(c - 1, r + 1) + 2 * at(c, r + 1) + at(c + 1, r + 1) - at(c - 1, r - 1) - 2 * at(c, r - 1) - at(c + 1, r - 1);
      const i = r * cols + c;
      EX[i] = gx / (8 * grid.cw);
      EY[i] = gy / (8 * grid.ch);
      E[i] = Math.hypot(EX[i], EY[i]) * grid.cw;
    }
  }
  const thin = (c: number, r: number): number => {
    const i = r * cols + c;
    const a = Math.atan2(EY[i] * grid.ch, EX[i] * grid.cw);
    const dc = Math.round(Math.cos(a));
    const dr = Math.round(Math.sin(a));
    for (const k of [1, -1]) {
      const cc = c + k * dc;
      const rr = r + k * dr;
      if (isHero(cc, rr) && E[rr * cols + cc] > E[i] + (k === 1 ? 0 : 1e-9)) return 0;
    }
    return E[i];
  };
  const cells: ZCell[] = [];
  const index = new Map<number, ZCell>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = acc[r * cols + c];
      if (!a || a.hits / n < 0.25) continue;
      const col = c0 + c;
      const row = r0 + r;
      const ex = EX[r * cols + c];
      const ey = EY[r * cols + c];
      let best = 0;
      for (let k = 1; k < 6; k++) if (a.parts[k] > a.parts[best]) best = k;
      const depth = a.depth / a.hits;
      const cell: ZCell = {
        col,
        row,
        x: grid.ox + (col + 0.5) * grid.cw,
        y: grid.oy + (row + 0.5) * grid.ch,
        hero: true,
        paper: false,
        cover: a.hits / n,
        lum: a.lum / a.hits,
        lum04: a.lum04 / a.hits,
        donut: clamp(Math.floor((8 * a.dl) / a.hits), 0, 11),
        depth,
        range: a.range / a.hits,
        band: (depth - cam.dist) / (BAND_PX / cam.scale) + 1,
        front: a.wz / a.hits,
        inner: (a.inner / a.hits) * cam.scale,
        glint: 0,
        part: a.parts.some((p) => p > 0) ? PART_OF[best] : null,
        pid: a.parts.some((p) => p > 0) ? best : -1,
        outline: false,
        edge: thin(c, r),
        stroke: strokeOf(ex, ey),
        silhouette: !isHero(c - 1, r) || !isHero(c + 1, r) || !isHero(c, r - 1) || !isHero(c, r + 1),
        dialect: null,
        ch: ' ',
        ink: '',
      };
      cells.push(cell);
      index.set(r * cols + c, cell);
    }
  }
  // Corners: an edge cell next to a perpendicular stroke becomes ┼.
  for (const [i, cell] of index) {
    if (cell.edge < NEON_EDGE) continue;
    const c = i % cols;
    const r = Math.floor(i / cols);
    for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const o = index.get((r + dr) * cols + c + dc);
      if (o && c + dc < cols && o.edge >= NEON_EDGE && PERPENDICULAR[o.stroke] === cell.stroke && hash(cell.col, cell.row, 2904) < 0.5) cell.stroke = '┼';
    }
  }
  // His features' front faces (rev 2, D2-CONVEYOR-OMEGA): which of the ω's and the eyes' front cells lie on the outline of that front
  // face, and the direction of the letterform there — along the outline on it (the Sobel of the face's own mask), along the stroke
  // inside it (the structure tensor of the distance to the outline, which is the same on both sides of the stroke's spine) — so NEON can
  // draw a feature as tubes that follow the letter, never the shading or the walls.
  const faceAt = (c: number, r: number, pid: number): number => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return 0;
    const o = index.get(r * cols + c);
    return o && o.pid === pid && isFront(o) ? 1 : 0;
  };
  const innerAt = (c: number, r: number, pid: number): number => (faceAt(c, r, pid) ? index.get(r * cols + c)!.inner : 0);
  for (const [i, cell] of index) {
    if (!isFeature(cell)) continue;
    const c = i % cols;
    const r = Math.floor(i / cols);
    const m = (dc: number, dr: number) => faceAt(c + dc, r + dr, cell.pid);
    cell.outline = m(1, 0) * m(-1, 0) * m(0, 1) * m(0, -1) === 0;
    if (cell.outline) {
      const gx = m(1, -1) + 2 * m(1, 0) + m(1, 1) - m(-1, -1) - 2 * m(-1, 0) - m(-1, 1);
      const gy = m(-1, 1) + 2 * m(0, 1) + m(1, 1) - m(-1, -1) - 2 * m(0, -1) - m(1, -1);
      if (gx !== 0 || gy !== 0) cell.stroke = strokeOf(gx / grid.cw, gy / grid.ch);
      continue;
    }
    let jxx = 0;
    let jxy = 0;
    let jyy = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!m(dc, dr)) continue;
        const gx = (innerAt(c + dc + 1, r + dr, cell.pid) - innerAt(c + dc - 1, r + dr, cell.pid)) / (2 * grid.cw);
        const gy = (innerAt(c + dc, r + dr + 1, cell.pid) - innerAt(c + dc, r + dr - 1, cell.pid)) / (2 * grid.ch);
        jxx += gx * gx;
        jxy += gx * gy;
        jyy += gy * gy;
      }
    }
    const th = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
    cell.stroke = strokeOf(Math.cos(th), Math.sin(th));
  }
  // Dialects: by the schedule, the depth bands and each cell's rank between the nearest and the farthest of his cells.
  let lo = INF;
  let hi = -INF;
  for (const cell of cells) {
    lo = Math.min(lo, cell.range);
    hi = Math.max(hi, cell.range);
  }
  // The collapse's Swiss sweep: a cell turns Swiss when the sweep's front (from his centre outward, sweepRadius) reaches it; the
  // backdrop's paper rides it as far as the card around him (paperRadius).
  const wiping = d >= SWISS_SWEEP.from && d < SWISS_SWEEP.to;
  // The glint sweeps his front faces (his parts only: the torus spins in donut.c's own light).
  for (const cell of cells) {
    if (cell.part === 'torus' || cell.part === null) continue;
    const g = glint(d, cell.x, cell.y, cam.centre, cam.width) * smoothstep(0.35, 0.75, cell.front);
    cell.glint = g;
    cell.lum = Math.min(1, cell.lum + GLINT.gain * g);
  }
  for (const cell of cells) {
    const rank = wiping ? (sweepRadius(d) > 0 && Math.hypot(cell.x - PAPER_CENTRE[0], cell.y - PAPER_CENTRE[1]) < sweepRadius(d) + 40 ? 1 : 0) : hi > lo ? (cell.range - lo) / (hi - lo) : 0;
    cell.dialect = dialectAt(d, cell.band, rank, true, cell.part === 'torus');
  }
  // His ω and each eye are one subject each (rev 2, D2-CONVEYOR-OMEGA): on the conveyor the bands cut through his brackets, never
  // through a feature — all of it (front and walls) takes the dialect of the band its front face sits in, without the ripple, so the ω
  // changes language only on the march kicks and an eye only when the turn carries it across a band (rev 1 let a band border split
  // them: on drop2 4.4 − 6 half the ω was an empty NEON slab beside BRUTAL glyphs, and the left eye flipped NEON ↔ BRUTAL every 3–6 frames).
  if (d >= ZBUF2.reform.from && d < BLINK2.close) {
    for (const pid of FEATURE_PIDS) {
      const part = cells.filter((c) => c.pid === pid);
      const face = part.filter(isFront);
      const from = face.length > 0 ? face : part;
      if (from.length === 0) continue;
      const dialect = dialectAt(d, from.reduce((a, c) => a + c.band, 0) / from.length, 0, false);
      for (const c of part) c.dialect = dialect;
    }
  }
  for (const cell of cells) dress(cell, d);
  markEyeNodes(cells, d, hero, grid);
  if (mode === 'hero') return { f: d, grid, cam, cells, sampling };
  const his = new Set(cells.map((c) => c.row * 100000 + c.col));
  const under = (x: number, y: number) => his.has(Math.floor((y - grid.oy) / grid.ch) * 100000 + Math.floor((x - grid.ox) / grid.cw));
  if (d < SWING.to) {
    // The backdrop is a real plane behind him (rev 1): S28's dim dot grid exactly on drop2 3.1, then seen through the 3D camera — it recedes
    // through the dolly-zoom and slides against his turn, so the orbit reads as a camera move, not a turntable. None under his cells.
    const { from, at, m } = dotMap(cam, hero);
    // Each dot's motion over the shutter (½ frame): a fast move draws it as a faint streak, never a strobing lattice.
    // (The pop is an impact: drop2 3.1 starts crisp, on S28's grid, with no instant of the flat pre-roll.)
    const m0 = dotMap(zbufCamera(Math.max(POP, d - SHUTTER / 2), hero), hero);
    const m1 = dotMap(zbufCamera(d + SHUTTER / 2, hero), hero);
    const det = m[0] * m[3] - m[1] * m[2];
    const size = Math.sqrt(Math.abs(det));
    // The lattice range that covers the frame: the frame's corners taken back to S28's layout.
    let lx0 = INF;
    let lx1 = -INF;
    let ly0 = INF;
    let ly1 = -INF;
    for (const [sx, sy] of [[-20, -20], [1940, -20], [1940, 1100], [-20, 1100]]) {
      const dx = sx - at[0];
      const dy = sy - at[1];
      const lx = from[0] + (m[3] * dx - m[1] * dy) / det;
      const ly = from[1] + (-m[2] * dx + m[0] * dy) / det;
      lx0 = Math.min(lx0, lx);
      lx1 = Math.max(lx1, lx);
      ly0 = Math.min(ly0, ly);
      ly1 = Math.max(ly1, ly);
    }
    const bc0 = Math.floor((lx0 - BACKDROP.ox) / BACKDROP.cw);
    const bc1 = Math.ceil((lx1 - BACKDROP.ox) / BACKDROP.cw);
    const br0 = Math.floor((ly0 - BACKDROP.oy) / BACKDROP.ch);
    const br1 = Math.ceil((ly1 - BACKDROP.oy) / BACKDROP.ch);
    for (let br = br0; br <= br1; br++) {
      for (let bc = bc0; bc <= bc1; bc++) {
        const px = BACKDROP.ox + (bc + 0.5) * BACKDROP.cw - from[0];
        const py = BACKDROP.oy + (br + 0.5) * BACKDROP.ch - from[1];
        const x = at[0] + m[0] * px + m[1] * py;
        const y = at[1] + m[2] * px + m[3] * py;
        if (x < -8 || x > 1928 || y < -12 || y > 1092 || under(x, y)) continue;
        const vx = m1.at[0] + m1.m[0] * (px + from[0] - m1.from[0]) + m1.m[1] * (py + from[1] - m1.from[1]) - (m0.at[0] + m0.m[0] * (px + from[0] - m0.from[0]) + m0.m[1] * (py + from[1] - m0.from[1]));
        const vy = m1.at[1] + m1.m[2] * (px + from[0] - m1.from[0]) + m1.m[3] * (py + from[1] - m1.from[1]) - (m0.at[1] + m0.m[2] * (px + from[0] - m0.from[0]) + m0.m[3] * (py + from[1] - m0.from[1]));
        cells.push({
          col: bc, row: br, x, y, hero: false, paper: false, dot: size, streak: Math.hypot(vx, vy), angle: Math.atan2(-vy, vx),
          cover: 0, lum: 0, lum04: 0, donut: 0, depth: 0, range: 0, band: 0, front: 0, inner: 0, glint: 0, part: null, pid: -1, outline: false, edge: 0, stroke: '', silhouette: false, dialect: null, ch: '·', ink: 'dot',
        });
      }
    }
    return { f: d, grid, cam, cells, sampling };
  }
  // The collapse: the backdrop's own grid (S30's) turns to paper from his centre outward.
  const wipe = paperRadius(d);
  for (let br = 0; br * BACKDROP.ch < 1080; br++) {
    for (let bc = 0; bc * BACKDROP.cw < 1920; bc++) {
      const x = BACKDROP.ox + (bc + 0.5) * BACKDROP.cw;
      const y = BACKDROP.oy + (br + 0.5) * BACKDROP.ch;
      if (under(x, y)) continue;
      cells.push({
        col: bc, row: br, x, y, hero: false, paper: Math.hypot(x - PAPER_CENTRE[0], y - PAPER_CENTRE[1]) < wipe,
        cover: 0, lum: 0, lum04: 0, donut: 0, depth: 0, range: 0, band: 0, front: 0, inner: 0, glint: 0, part: null, pid: -1, outline: false, edge: 0, stroke: '', silhouette: false, dialect: null, ch: '·', ink: 'dot',
      });
    }
  }
  return { f: d, grid, cam, cells, sampling };
}

/**
 * •ω• never leaves (rev 3; design 37.3): while the torus is grown his two eyes ride its front as two bright @ nodes (drop2Donut eyeNodes),
 * turning with its spin — the cells within a cell and a half of each visible node print @ in the bright text ink.
 */
function markEyeNodes(cells: ZCell[], d: number, hero: Hero, grid: Grid): void {
  if (!DN.donutActive(d) || DN.torusGrowth(d) < 0.5) return;
  const st = zbufState(d, hero);
  if (!st.torus) return;
  const c = st.cam;
  const { a, b } = DN.donutSpin(d);
  const k = st.torus.pop / c.scale;
  const m = DN.torusRotation(a, b);
  const facing = DN.rotate(m, [0, 1, 0]);
  if (facing[2] < 0.25) return;
  for (const v of DN.eyeNodes(a, b, k)) {
    const w: Vec3 = [c.target[0] + v[0] * c.right[0] + v[1] * c.up[0] + v[2] * c.back[0], c.target[1] + v[0] * c.right[1] + v[1] * c.up[1] + v[2] * c.back[1], c.target[2] + v[0] * c.right[2] + v[1] * c.up[2] + v[2] * c.back[2]];
    const [sx, sy] = project(c, w);
    for (const cell of cells) {
      if (cell.part !== 'torus') continue;
      const ex = (cell.x - sx) / (2.4 * grid.cw);
      const ey = (cell.y - sy) / (1.3 * grid.ch);
      if (ex * ex + ey * ey > 1) continue;
      cell.node = true;
      cell.ch = '@';
      cell.ink = 'node';
    }
  }
}

/** How bright a NEON feature's fill tubes are against its outline tube (rev 2). */
const NEON_FILL = 0.45;
/** Minimum edge strength for a NEON stroke. */
const NEON_EDGE = 0.07;
const LED_DOTS = DIALECT_GLYPHS.led; // ·•●
const BRUTAL_BLOCKS = DIALECT_GLYPHS.brutal; //  ░▒▓█
const SWISS_DIGITS = DIALECT_GLYPHS.swiss; //  1742356908

/** A cell is one of his front faces (not the extrusion's walls) when most of its hits face +z. */
const FRONT = 0.55;
export const isFront = (cell: ZCell): boolean => cell.front >= FRONT;
/** His features: the ω and the two eyes, whose front cells always keep a legible glyph in their own ink (never a block or a slab). */
export const isFeature = (cell: ZCell): boolean => (cell.part === 'mouth' || cell.part === 'eye') && isFront(cell);
/**
 * Partly covered cells print lighter, so his silhouette is anti-aliased and the gaps between his parts stay open; and (rev 1) a stroke
 * prints dense along its spine and lighter toward its outline, the way ASCII art draws letterforms — the ω keeps its two lobes and its
 * notch even in coarse cells.
 */
const coverage = (cell: ZCell): number => (0.35 + 0.65 * smoothstep(0.25, 0.8, cell.cover)) * (0.5 + 0.5 * smoothstep(3, 20, cell.inner));

/** One cell's character and ink in its dialect. */
function dress(cell: ZCell, d: number): void {
  const sh = shimmer(d, cell.col, cell.row);
  const ramp = (x: number) => clamp(Math.round(9 * x) + sh, 1, 9);
  const mouth = cell.part === 'mouth';
  const front = isFront(cell);
  const aa = coverage(cell);
  switch (cell.dialect) {
    case 'terminal':
      cell.ch = RAMP[ramp(cell.lum * aa)];
      cell.ink = mouth ? 'pink' : cell.lum > 0.72 ? 'text' : 'green';
      return;
    case 'riso': {
      // Two plates on paper. His front faces carry his parts in solid plate tints (the ω hot pink, the eyes blue, the brackets a pale
      // pink), the walls a slate blue, so the ω and the eye never fuse into one cream bar; the glyphs print over them, misregistered.
      cell.ch = RAMP[clamp(Math.round(9 * clamp(1.15 - cell.lum) * aa) + sh, 1, 9)];
      cell.ink = !front ? 'r-wall' : mouth ? 'r-mouth' : cell.part === 'eye' ? 'r-eye' : 'r-front';
      return;
    }
    case 'donut':
      cell.ch = DN.DONUT_RAMP[clamp(cell.donut + (cell.donut > 0 ? sh : 0), 0, 11)];
      cell.ink = cell.donut >= 9 ? 'text' : 'green';
      return;
    case 'led': {
      const l = cell.lum * aa;
      const lit = l >= 0.32;
      cell.ch = lit ? LED_DOTS[clamp((l < 0.5 ? 0 : l < 0.66 ? 1 : 2) + sh, 0, 2)] : LED_DOTS[2];
      cell.ink = lit ? (mouth ? 'pink' : 'amber') : 'unlit';
      return;
    }
    case 'neon':
      if (cell.part === 'mouth' || cell.part === 'eye') {
        // A feature in NEON (rev 2, D2-CONVEYOR-OMEGA) is its front face as a neon letter: a closed tube on its outline, filled with
        // dimmer tubes that run along its strokes — no walls, no back edges, no shading lines (rev 1 drew the edge mask, and the ω read
        // as "(ɯ)" in a box). The walls are clipped.
        cell.ch = front ? (NEON_STROKES.includes(cell.stroke) ? cell.stroke : '─') : ' ';
        cell.ink = front ? (mouth ? 'amber' : 'cyan') : '';
        return;
      }
      if (cell.edge < NEON_EDGE) {
        cell.ch = ' ';
        cell.ink = '';
        return;
      }
      cell.ch = NEON_STROKES.includes(cell.stroke) ? cell.stroke : '─';
      cell.ink = mouth ? 'amber' : cell.silhouette ? 'cyan' : 'pink';
      return;
    case 'brutal': {
      // Outlined blocks (rev 1): his bracket faces are yellow tiles with dark grout, the extrusion's walls ochre tiles hatched ░ —
      // and his ω and eyes stay glyphs in their own inks (his amber, yellow) on the dark ground, never a filled slab over his face.
      if (isFeature(cell)) {
        cell.ch = RAMP[ramp(cell.lum * aa)];
        cell.ink = mouth ? 'b-mouth' : 'b-eye';
      } else if (front) {
        cell.ch = ' ';
        cell.ink = 'b-front';
      } else if (cell.part === 'mouth' || cell.part === 'eye') {
        // A feature's own walls are clipped (rev 2, D2-CONVEYOR-OMEGA: rev 1's dim hatch filled the ω's notch and boxed it in on drop2 4.4 − 6).
        cell.ch = ' ';
        cell.ink = mouth ? 'b-mouth-wall' : 'b-eye-wall';
      } else {
        cell.ch = cell.lum + 0.06 * sh < 0.3 ? BRUTAL_BLOCKS[2] : BRUTAL_BLOCKS[1];
        cell.ink = 'b-wall';
      }
      return;
    }
    case 'bar4': {
      const shut = cell.part === 'eye' && eyeSquash(d) < 0.4;
      cell.ch = shut ? '-' : RAMP[clamp(Math.round(cell.lum04 * 9), 1, 9)];
      cell.ink = cell.part === 'eye' ? 'eye' : mouth ? 'pink' : 'bracket';
      return;
    }
    case 'swiss':
      // Reversed Swiss type: his cells are solid ink (the ω red) with the digits knocked out in paper, thin where the face is
      // flat and lit, heavier on the bevel's highlights: from a few steps back he is the solid face the drop2 5.1 cut lands on.
      cell.ch = SWISS_DIGITS[clamp(Math.round(10 * clamp((cell.lum - 0.68) * 2)) + sh, 0, 10)];
      // (The colour law, sheet §1.3 C: his ω is amber with a #111 keyline; as built it was Swiss red, which is Defender's.)
      cell.ink = mouth ? (COLOR_LAW_V2 ? 'omega' : 'red') : 'ink';
      return;
    default:
      cell.ch = ' ';
  }
}

// ——— What the scene draws ——————————————————————————————————————————————————————————————————————————————————————————————————

/** The characters each atlas must hold: JetBrains Mono for every dialect but the Swiss digits (Inter Tight). */
export const ZBUF_GLYPHS = {
  mono: [...new Set([...RAMP, ...DN.DONUT_RAMP, ...LED_DOTS, ...NEON_STROKES, ...BRUTAL_BLOCKS, '-', ...READOUT2.find((l) => l.site === 'scanline')!.text])].filter((c) => c.trim() !== ''),
  digits: [...SWISS_DIGITS].filter((c) => c.trim() !== ''),
} as const;
/** FlatLayer capacities the scene builds (per atlas for glyphs; `under` for shapes). */
export const CAPACITY = { glyphs: 26000, shapes: 24000, tints: 8000 } as const;
/** JetBrains Mono's advance (em): a cell `cw` wide takes type cw / 0.6. */
const MONO_ADVANCE = 0.6;
/** LED dots sit apart on their pitch, as a matrix does. */
const LED_SIZE = 0.82;

const P = PALETTES;
const INKS = {
  ground: linear(P.terminal.ground),
  dot: linear(P.terminal.text),
  green: linear(P.terminal.green, 1.6),
  text: linear(P.terminal.text, 1.5),
  pink: linear(P.terminal.pink, 1.7),
  rPaper: linear(P.riso.ground),
  rBlue: linear(P.riso.blue),
  rPink: linear(P.riso.pink),
  ledGround: linear(P.led.ground),
  amber: linear(P.led.amber, 2.1),
  ledPink: linear(P.led.pink, 2.1),
  unlit: linear(P.led.unlit),
  neonGround: linear(P.neon.ground),
  cyan: linear(P.neon.cyan, 2.4),
  neonPink: linear(P.neon.pink, 2.4),
  neonAmber: linear(P.neon.amber, 2.4),
  yellow: linear(P.brutal.yellow),
  ochre: linear(P.brutal.yellow, 0.34),
  coral: linear(P.brutal.coral),
  bCoral: linear(P.brutal.coral, 2),
  // BRUTAL's ω (drop2 4.3, the one beat it reaches his features): his amber at ×2, not the coral above, which samples in Defender's red
  // family on the dark ground (#FB6E6E, hue 0, under Defender's red '[DEFENDER] 2D scanner' row). The colour law (red = Defender only,
  // amber = him only) and its ruling for the old shots (red there that is not the antivirus's becomes another colour); whole-film review 2026-10-03 (KEEP-FIRST change, logged).
  bAmber: linear(LAW.hero, 2),
  bYellow: linear(P.brutal.yellow, 1.6),
  black: linear(P.brutal.ink),
  sPaper: linear(P.swiss.ground),
  red: linear(P.swiss.red),
  omega: linear(SWISS_OMEGA.fill),
  keyline: linear(SWISS_OMEGA.keyline.color),
  defender: linear(LAW.defender.print),
  white: linear('#ffffff', 2.4),
} as const;

/** Intro bar 4's inks, as S04 inked its giant face (shots/intro.ts faceInk): eyes text → white-hot, the ω pink, the brackets green. */
function bar4Ink(cell: ZCell): RGB {
  const l = cell.lum04;
  const base =
    cell.part === 'eye'
      ? mixRGB(linear(P.terminal.text, 1.5), linear('#ffffff', 2.2), l)
      : cell.part === 'mouth'
        ? mixRGB(scaleRGB(INKS.pink, 0.45), INKS.pink, l)
        : mixRGB(scaleRGB(linear(P.terminal.green, 1.7), 0.3), mixRGB(linear(P.terminal.green, 1.7), linear(P.terminal.text, 1.5), 0.35), l);
  return scaleRGB(base, 0.9 + 0.2 * hash(cell.col * 1000 + cell.row, 5));
}

/** The ground a dialect lays under his cells (null: the terminal's own, i.e. nothing to draw in full mode). */
function groundOf(cell: ZCell): RGB | null {
  switch (cell.dialect) {
    case 'riso':
      return INKS.rPaper;
    case 'led':
      return INKS.ledGround;
    case 'neon':
      // A feature's walls are clipped in NEON (rev 2): no slab beside its outline.
      return (cell.part === 'mouth' || cell.part === 'eye') && !isFront(cell) ? null : INKS.neonGround;
    case 'brutal':
      // Tiles: his bracket faces yellow, the walls ochre; his ω and eyes lay no ground (they stay glyphs).
      return cell.ink === 'b-front' ? INKS.yellow : cell.ink === 'b-wall' ? INKS.ochre : null;
    case 'swiss':
      return cell.ink === 'omega' ? INKS.omega : cell.part === 'mouth' ? INKS.red : INKS.black;
    default:
      return null;
  }
}

/**
 * The frame's ground per dialect (rev 3, design §4.3; ZBUF2_GROUNDS keys them): TERMINAL #10251A with its dot grid, RISO pink paper,
 * donut.c's #0E1F15, LED grey, NEON violet, BRUTAL cream — the two light beats, never white — then intro bar 4's and the Swiss paper as
 * built.
 */
export const GROUND2: Readonly<Record<Ground2, string>> = {
  terminal: '#10251A',
  riso: '#EBC3D6',
  donut: '#0E1F15',
  led: '#1D2026',
  neon: '#1B1030',
  brutal: '#F4E7C1',
  bar4: P.terminal.ground,
  swiss: P.swiss.ground,
};
/** The light grounds: dark dots on them, a dark ground under his glowing cells, #111 hard shadows on the cream. */
const LIGHT_GROUNDS: ReadonlySet<Ground2> = new Set(['riso', 'brutal']);
/**
 * Each ground change is a radial wipe of the backdrop's cells from his centre, begun `frames` before its beat and landing on it — an
 * impact (u³) out to `reach` (every corner is 1106 px out): it opens small, and the frame's biggest change is the beat's own (the
 * design's 160 px a frame was steady, and put the biggest change 3–4 frames early: check-sync on the rough cut, 3.2 / 4.2 / 4.3).
 */
export const GROUND_WIPE = { reach: 1120, frames: 7, centre: [960, 530] as const } as const;
/**
 * The ground at output frame `f` (drop2 3.1 … 4.4 − 1; from intro bar 4's frame the as-built paper): `under` the whole frame's, `over`
 * the next wiping in from his centre out to `radius` px (0: no wipe).
 */
export function groundAt(f: number): { under: Ground2; over: Ground2 | null; radius: number } {
  const d = frameOf(f);
  let k = 0;
  for (let i = 1; i < ZBUF2_GROUNDS.length; i++) if (d >= ZBUF2_GROUNDS[i].at - GROUND_WIPE.frames) k = i;
  const g = ZBUF2_GROUNDS[k];
  if (k === 0 || d >= g.at) return { under: g.ground, over: null, radius: 0 };
  return { under: ZBUF2_GROUNDS[k - 1].ground, over: g.ground, radius: GROUND_WIPE.reach * impact(d, g.at, GROUND_WIPE.frames) };
}
const groundOfPoint = (g: { under: Ground2; over: Ground2 | null; radius: number }, x: number, y: number): Ground2 =>
  g.over && Math.hypot(x - GROUND_WIPE.centre[0], y - GROUND_WIPE.centre[1]) < g.radius ? g.over : g.under;

/**
 * Defender's beat (rev 3; design 37.2, ZBUF2.scan): a flat 2 px red line on the screen plane sweeps top → bottom over the 8th of drop2
 * 3.2. Where it crosses him it is sheared by parallax — dy = shear × (his depth there − his centre's), signed by the orbit's turn — so it
 * steps across his depth slabs (it is flat, he is not) and catches nothing. Its tag rides its right end (JetBrains Mono 20 px, red).
 */
export const SCAN = { px: 2, shear: 0.15, y0: 6, y1: 1074, tag: { size: 20, right: 1880, lift: 14 } } as const;
const SCAN_TAG = READOUT2.find((l) => l.site === 'scanline')!.text;
export type ScanLine = { y: number; segments: { x0: number; x1: number; y: number }[]; tag: string; color: string };
function scanLineOf(fr: ZFrame): ScanLine | null {
  const d = fr.f;
  if (d < ZBUF2.scan.from || d >= ZBUF2.scan.to) return null;
  const y = lerp(SCAN.y0, SCAN.y1, (d - ZBUF2.scan.from) / (ZBUF2.scan.to - ZBUF2.scan.from - 1));
  const { cw, ch, ox, oy } = fr.grid;
  const row = Math.floor((y - oy) / ch);
  const at = new Map<number, ZCell>();
  for (const c of fr.cells) if (c.hero && c.row === row) at.set(c.col, c);
  const sign = Math.sign(fr.cam.yaw) || 1;
  const segments: ScanLine['segments'] = [];
  for (let col = Math.floor(-ox / cw); ox + col * cw < 1920; col++) {
    const c = at.get(col);
    const dy = c ? Math.round(SCAN.shear * (c.depth - fr.cam.dist) * fr.cam.scale * sign) : 0;
    const x0 = ox + col * cw;
    const last = segments[segments.length - 1];
    if (last && Math.abs(last.y - (y + dy)) < 1e-9) last.x1 = x0 + cw;
    else segments.push({ x0, x1: x0 + cw, y: y + dy });
  }
  return { y, segments, tag: SCAN_TAG, color: LAW.defender.print };
}
/** The scan line at output frame `f` (null outside its 8th). */
export const scanLine = (f: number, hero: Hero): ScanLine | null => scanLineOf(zbufFrame(f, hero));

export type ZContent = { paper: RGB | null; base: FlatContent; ink: FlatContent; light: FlatContent; top: FlatContent };

/** How much of a cell's ground and ink is laid (0 … 1): its coverage, from the 25 % a cell needs to exist to fully covered at 70 %. */
export const cellFade = (c: ZCell): number => smoothstep(0.25, 0.7, c.cover);

/** The Riso tints per cell (plate, density), multiplied on the paper: the ω hot pink, the eyes blue, the bracket faces pale pink, the walls slate. */
const RISO_TINTS: Readonly<Record<string, readonly (readonly ['pink' | 'blue', number])[]>> = {
  'r-mouth': [['pink', 0.92]],
  'r-eye': [['blue', 0.9]],
  'r-front': [['pink', 0.42]],
  'r-wall': [['blue', 0.6], ['pink', 0.18]],
};

const toFlat = (x: number, y: number): [number, number] => [x - 960, 540 - y];
const latest = (xs: readonly number[], d: number): number => {
  let a = -INF;
  for (const x of xs) if (x <= d) a = x;
  return a;
};

/**
 * The march's flare (iteration 2, the director's ruling 9; sync review 7): on each march kick of drop2 bar 4 (MARCH; drop2 4.3 measured only ×1.3
 * over its neighbours) his glowing cells flare ×1.8 on the kick's own output frame and settle within the 8th (e^(−t/2.5)), so the step
 * the conveyor takes reads as a hit. 1 elsewhere.
 */
export function marchLift(f: number): number {
  const d = frameOf(f);
  const k = latest(ZBUF2_MARCH, d);
  const t = d - k;
  return t < 0 || t >= 12 ? 1 : 1 + 0.8 * Math.exp(-t / 2.5);
}

/**
 * The flat content of S29 at output frame `f`, one FlatContent per blend layer in draw order: `base` (normal: the grounds, the dim
 * dots, the paper, the brutal tiles and hatching, the Swiss digits, the cube's last outline), `ink` (multiply: the Riso plates' tints and glyphs) and
 * `light` (add: every glowing dialect). `mode` 'hero' leaves out the backdrop and lays every ground (S28's pre-roll).
 */
export function zbufContent(f: number, hero: Hero, mode: 'full' | 'hero' = 'full'): ZContent {
  const fr = zbufFrame(f, hero, mode);
  const d = fr.f;
  const { cw, ch } = fr.grid;
  const size = cw / MONO_ADVANCE;
  const under: Shape[] = [];
  const tints: Shape[] = [];
  const grounds: Shape[] = [];
  const baseMono: Glyph[] = [];
  const digits: Glyph[] = [];
  const over: Shape[] = [];
  const inkMono: Glyph[] = [];
  const light: Glyph[] = [];
  const glow = omegaGlow(d);
  // Every closed hat lifts the glowing dialects a little (the LED rows' +25 % flash), and nudges the Riso plates' register; the march
  // kicks flare them (marchLift).
  const lastHat = latest(HATS2, d);
  const hatLift = (1 + 0.22 * Math.exp(-(d - lastHat) / 2)) * marchLift(d);
  const plate = [Math.round(2 * hash(sixteenth(d), 2906) - 1), Math.round(2 * hash(sixteenth(d), 2907) - 1)];
  const rim = RIMS2.includes(d);
  const oh = Math.exp(-(d - latest(OPEN_HATS2, d)) / 3);
  const hat = HATS2.includes(d) || HATS2.includes(d - 1);
  // Intro bar 4's frame is S04's own screen: the dot grid fades out over the swing, S04's phosphor haze glows in its place.
  const dots = 1 - clamp((d - SWING.from) / (SWING.to - SWING.from));
  const haze = clamp((d - SWING.from) / (SWING.to - SWING.from)) * (1 - clamp((d - (COLLAPSE.from - 1)) / 6));
  const glowShapes: Shape[] = [];
  if (haze > 0 && mode === 'full') {
    for (const [w, h, soft, k] of [[2600, 1700, 900, 0.018], [1500, 900, 520, 0.014]]) glowShapes.push({ kind: 'ellipse', x: 0, y: 0, w, h, soft, color: linear(P.terminal.green, k * haze) });
  }
  // The ground (rev 3): the front band's dialect, wiping in from his centre; from intro bar 4's frame on, the as-built paper.
  const gr = mode === 'full' && d >= POP && d < BLINK2.close ? groundAt(d) : null;
  const wipe: Shape[] = [];
  if (gr?.over && gr.radius > 0) {
    const col = linear(GROUND2[gr.over]);
    const [gx, gy] = GROUND_WIPE.centre;
    for (let br = 0; br * BACKDROP.ch < 1080; br++) {
      const cy = (br + 0.5) * BACKDROP.ch;
      const dy = cy - gy;
      if (Math.abs(dy) >= gr.radius) continue;
      const half = Math.sqrt(gr.radius * gr.radius - dy * dy);
      const c0 = Math.max(0, Math.ceil((gx - half) / BACKDROP.cw - 0.5));
      const c1 = Math.min(159, Math.floor((gx + half) / BACKDROP.cw - 0.5));
      if (c1 < c0) continue;
      const [x, y] = toFlat(((c0 + c1 + 1) / 2) * BACKDROP.cw, cy);
      wipe.push({ kind: 'rect', x, y, w: (c1 - c0 + 1) * BACKDROP.cw + 0.6, h: BACKDROP.ch + 0.6, color: col });
    }
  }
  const groundHere = (x: number, y: number): Ground2 | null => (gr ? groundOfPoint(gr, x, y) : null);
  const darkDot: Readonly<Record<string, RGB>> = { riso: INKS.rBlue, brutal: INKS.black };
  const shadows: Shape[] = [];
  const keylines: Shape[] = [];
  const heroCells = fr.cells.filter((c) => c.hero);
  const dialectOf = new Map(heroCells.map((c) => [`${c.col},${c.row}`, c.dialect]));
  const oneDialect = new Set(heroCells.map((c) => c.dialect)).size === 1;
  for (const c of fr.cells) {
    const [x, y] = toFlat(c.x, c.y);
    if (!c.hero) {
      if (c.paper) {
        under.push({ kind: 'rect', x, y, w: BACKDROP.cw + 0.6, h: BACKDROP.ch + 0.6, color: INKS.sPaper });
        // S30's 16 columns of 120 px, dotted where its hairlines will be.
        const left = c.x - BACKDROP.cw / 2;
        if (Math.abs(left / 120 - Math.round(left / 120)) < 1e-6) baseMono.push({ ch: '·', x: left - 960, y, size: 20, color: INKS.black, alpha: 0.15 });
        continue;
      }
      if (dots <= 0) continue;
      const sparkle = hat && hash(c.col, c.row, sixteenth(d), 2905) < 0.03;
      const k = c.dot ?? 1;
      // Motion blur: the dot's ink (≈ 2.6 px) stretched along its streak, its light spread over the length.
      const ink = BACKDROP_DOT.size * k * DOT_INK_EM;
      const smear = (ink + (c.streak ?? 0)) / ink;
      // On the light grounds (Riso pink, Brutal cream) the dots print dark.
      const g = groundHere(c.x, c.y);
      const light = g !== null && LIGHT_GROUNDS.has(g);
      baseMono.push({ ch: '·', x, y: y - BACKDROP_DOT.drop * k, size: BACKDROP_DOT.size * k, color: light ? darkDot[g!] : INKS.dot, alpha: (dots * (sparkle ? 0.45 : 0.12 + 0.08 * oh)) / smear, stretch: smear, rot: c.angle ?? 0 });
      continue;
    }
    // On a light ground his glowing cells (TERMINAL, donut.c) lay the terminal's dark ground under them, or their light would vanish.
    const here = groundHere(c.x, c.y);
    const ground = groundOf(c) ?? (here !== null && LIGHT_GROUNDS.has(here) && (c.dialect === 'terminal' || c.dialect === 'donut') ? INKS.ground : null);
    // BRUTAL's tiles are inset 2 px: outlined blocks with dark grout, never one slab.
    const tile = c.dialect === 'brutal' ? -2 : 0.6;
    // Anti-aliased characters (rev 1): a cell's ground and ink fade with its coverage, so his motion shows inside a cell on every frame
    // instead of jumping a whole cell every few frames (and an edge cell never pops in). Intro bar 4 and the Swiss cells stay crisp (S04, H2).
    const fade = c.dialect === 'bar4' || c.dialect === 'swiss' ? 1 : cellFade(c);
    // The cream beat's #111 hard shadows (design 38.2): his cells cast them 14 px down-right onto the cream.
    if (groundHere(c.x + 14, c.y + 14) === 'brutal') {
      const [sx, sy] = toFlat(c.x + 14, c.y + 14);
      shadows.push({ kind: 'rect', x: sx, y: sy, w: cw + 0.6, h: ch + 0.6, color: INKS.black, alpha: fade });
    }
    // His amber ω on the Swiss cells sits on a 2 px #111 keyline (the colour law).
    if (c.ink === 'omega') keylines.push({ kind: 'rect', x, y, w: cw + 2 * SWISS_OMEGA.keyline.px, h: ch + 2 * SWISS_OMEGA.keyline.px, color: INKS.keyline });
    if (ground) grounds.push({ kind: 'rect', x, y, w: cw + tile, h: ch + tile, color: ground, alpha: fade });
    else if (mode === 'hero') grounds.push({ kind: 'rect', x, y, w: cw + tile, h: ch + tile, color: INKS.ground });
    // The Riso plates' solid tints (multiply, on the paper): his parts in plate colours, not paper-white.
    if (c.dialect === 'riso') {
      const sheen = 1 - 0.5 * c.glint; // the glint lifts the plates, never to paper: the ω stays pink
      for (const [ink, density] of RISO_TINTS[c.ink] ?? []) tints.push({ kind: 'rect', x, y, w: cw + 0.6, h: ch + 0.6, color: transmit(ink === 'pink' ? INKS.rPink : INKS.rBlue, density * sheen * fade) });
    }
    // The extrusion's walls glow less than his faces in the glowing dialects, so his parts read by their fronts.
    const side = isFront(c) || c.part === 'torus' ? 1 : 0.62;
    const pulse = (c.part === 'mouth' ? 1 + glow : 1) * (c.dialect === 'swiss' || c.dialect === 'riso' ? 1 : hatLift) * (c.dialect === 'terminal' || c.dialect === 'led' ? side : 1);
    const g = (ch: string, color: RGB, extra: Partial<Glyph> = {}): Glyph => ({ ch, x, y, size, color: scaleRGB(color, pulse), ...extra, alpha: fade * (extra.alpha ?? 1) });
    switch (c.dialect) {
      case 'terminal':
        light.push(g(c.ch, c.ink === 'pink' ? INKS.pink : c.ink === 'text' ? INKS.text : mixRGB(INKS.green, INKS.text, smoothstep(0.5, 0.72, c.lum) * 0.5)));
        break;
      case 'donut':
        // (His eyes' @ nodes white-hot, so •ω• reads on the spinning ring.)
        light.push(g(c.ch, c.ink === 'node' ? INKS.white : c.ink === 'text' ? INKS.text : mixRGB(scaleRGB(INKS.green, 0.75), INKS.green, c.donut / 8)));
        break;
      case 'bar4':
        light.push(g(c.ch, bar4Ink(c)));
        break;
      case 'riso': {
        const k = RAMP.indexOf(c.ch);
        const clap = c.ink === 'r-mouth' ? 0.25 * Math.exp(-Math.max(0, d - SWEEPS[0].to) / 4) : 0;
        inkMono.push({ ch: c.ch, x, y, size, color: transmit(INKS.rBlue, 0.92 * fade) });
        inkMono.push({ ch: RAMP[Math.min(9, k + 1)], x: x + 4 + plate[0], y: y - 3 - plate[1], size, color: transmit(INKS.rPink, Math.min(1, 0.85 + clap) * fade) });
        break;
      }
      case 'led':
        if (c.ink === 'unlit') baseMono.push(g(c.ch, INKS.unlit, { size: size * LED_SIZE }));
        else light.push(g(c.ch, c.ink === 'pink' ? INKS.ledPink : INKS.amber, { size: size * LED_SIZE }));
        break;
      case 'neon':
        if (c.ch === ' ') break;
        // A feature's neon letter (rev 2): its outline tube full and steady (a dim silhouette cell would break the ring), the fill dimmer.
        if (isFeature(c)) light.push({ ...g(c.ch, c.ink === 'amber' ? INKS.neonAmber : INKS.cyan, { tube: 0.012 }), alpha: c.outline ? 0.75 + 0.25 * fade : NEON_FILL });
        else light.push(g(c.ch, c.ink === 'amber' ? INKS.neonAmber : c.ink === 'cyan' ? INKS.cyan : INKS.neonPink, { tube: 0.012 }));
        break;
      case 'brutal':
        if (c.ink === 'b-mouth' || c.ink === 'b-eye') light.push(g(c.ch, c.ink === 'b-mouth' ? INKS.bAmber : INKS.bYellow));
        else if (c.ch !== ' ') baseMono.push(g(c.ch, INKS.black, { alpha: 0.85 }));
        break;
      case 'swiss':
        if (c.ch !== ' ') digits.push({ ch: c.ch, x, y, size: ch * 0.95, color: INKS.sPaper, alpha: c.ink === 'red' || c.ink === 'omega' ? 0.85 : 0.9 });
        break;
      default:
        break;
    }
    // The rims glint: a one-frame white contour where two dialects meet (his silhouette when only one is on) — on his brackets only
    // (rev 2: his ω and eyes stay unoccluded, and their clipped walls get no stray dots).
    if (rim && c.part !== 'mouth' && c.part !== 'eye') {
      const border = oneDialect ? c.silhouette : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => {
        const o = dialectOf.get(`${c.col + dc},${c.row + dr}`);
        return o !== undefined && o !== c.dialect;
      });
      if (border) light.push({ ch: c.ch.trim() === '' || c.dialect === 'swiss' ? '·' : c.ch, x, y, size, color: INKS.white, alpha: 0.5 });
    }
  }
  under.unshift(...wipe);
  under.push(...shadows, ...keylines, ...grounds);
  // drop2 3.1–3.1 + 3: the cube's face F lands and its cream outline fades into the grid.
  const fade = d >= POP && d < POP + 3 ? 0.85 * (1 - (d - POP) / 3) : 0;
  if (fade > 0 && mode === 'full') {
    const cream = linear(P.brutal.ground);
    const [cx, cy] = toFlat(960, 560);
    for (const [x, y, w, h] of [[cx, cy + 422, 1503, 3], [cx, cy - 422, 1503, 3], [cx - 750, cy, 3, 847], [cx + 750, cy, 3, 847]]) over.push({ kind: 'rect', x, y, w, h, color: cream, alpha: fade });
  }
  // Defender's scan line and its tag, over everything (the `top` layer).
  const topUnder: Shape[] = [];
  const topMono: Glyph[] = [];
  const scan = mode === 'full' ? scanLineOf(fr) : null;
  if (scan) {
    for (const sg of scan.segments) {
      const [x, y] = toFlat((sg.x0 + sg.x1) / 2, sg.y);
      topUnder.push({ kind: 'rect', x, y, w: sg.x1 - sg.x0 + 0.5, h: SCAN.px, color: INKS.defender });
    }
    const chars = [...scan.tag];
    const size = SCAN.tag.size;
    const ty = clamp(scan.y - SCAN.tag.lift, 24, 1060);
    chars.forEach((chr, i) => {
      if (chr.trim() === '') return;
      const [x, y] = toFlat(SCAN.tag.right - (chars.length - i - 0.5) * MONO_ADVANCE * size, ty);
      topMono.push({ ch: chr, x, y, size, color: INKS.defender });
    });
  }
  return {
    paper: mode === 'full' ? (gr ? linear(GROUND2[gr.under]) : INKS.ground) : null,
    base: { under, glyphs: { mono: baseMono, digits }, over },
    ink: { under: tints, glyphs: { mono: inkMono }, over: [] },
    light: { under: glowShapes, glyphs: { mono: light }, over: [] },
    top: { under: topUnder, glyphs: { mono: topMono }, over: [] },
  };
}

// ——— Look, time, segment ——————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The pop's light: on drop2 3.1 his glow flares and settles — the downbeat is lit by him, not washed grey. Iteration 3 (verify: the bright
 * moment was S28's passing paper, 1–4 frames early, and drop2 3.1 itself dark): exposure + 0.8 and bloom + 1.6 on the pop, falling by
 * e^(−t/2) so most of it is gone within the 16th — drop2 3.1's light is a hit on the beat, not a glow.
 */
export const popFlare = (f: number): number => (f < POP ? 0 : Math.exp(-(f - POP) / 2));
const POP_LIGHT = { exposure: 0.8, bloom: 1.6 } as const;

/** The kicks S29 accents itself (iteration 3): drop2 3.2 to the swing's landing on drop2 4.4 (the pop has its own flare). */
const GLOW_KICKS = KICKS2.filter((k) => k > POP && k <= SWING.to);
/**
 * How much a kick lifts S29's exposure on its own output frame. Iteration 4 (photosensitivity; verify: at + 60 % with an e^(−t/1.2)
 * fall, the centre of the frame swung ≥ 0.1 in relative luminance 8 times in drop2 3.4 − 6 … 4.2 + 3, 4 flashes in a second): + 25 %, falling
 * round, keeps every swing of the pump span at ≤ 3 flashes a second on the 3 × 3 and 6 × 6 checks while each kick still reads.
 */
export const KICK_LIGHT = 0.25;
/** The pump's fall: the 8th after the kick (it is 0 from + PUMP_FALL). */
export const PUMP_FALL = 12;
/**
 * The kick pump (iteration 3; verify: the beats of 29–30 read weakly, and the rig's punch, shared with the intro, the build and drop 1, starts a frame late by
 * design): on each kick of drop2 3.2–4.4 the whole picture's light — the backdrop's dots, the Riso plates, every glowing cell — jumps on the
 * kick's own output frame (1). Iteration 4: it falls round, (1 − t/12)² over the 8th, instead of dropping by e^(−t/1.2) — the steep
 * fall back to dark a frame or two after each kick was the second half of a flash; the step up on the kick is still the hit. 0 elsewhere.
 */
export function kickGlow(f: number): number {
  const d = frameOf(f);
  const k = latest(GLOW_KICKS, d);
  const t = d - k;
  return t < 0 || t >= PUMP_FALL ? 0 : (1 - t / PUMP_FALL) ** 2;
}

/** S29's finishing: the terminal look without the CRT, the CRT on for intro bar 4's frame (drained by drop2 5.1 − 6); the bloom calms as the paper comes in. */
export function zbufLook(f: number): Look {
  const d = frameOf(f);
  const band = (((d % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const base = terminalLook(crtAmount(d), 0, band, 0.045);
  const paper = smoothstep(COLLAPSE.from, COLLAPSE.to, d);
  const flare = popFlare(d);
  const pump = 1 + KICK_LIGHT * kickGlow(d);
  return { ...base, exposure: base.exposure * (1 + POP_LIGHT.exposure * flare) * pump, bloom: { ...base.bloom, threshold: 1, intensity: lerp(1.3, 0.35, paper) + POP_LIGHT.bloom * flare } };
}

/** The characters are resolved at the output frame (the cell pass integrates its own shutter): one sub-frame. */
export const zbufTemporal: (frame: number) => Temporal = () => ({ samples: 1, shutter: 0, persistence: 0 });
export const zbufSegment = (frame: number): Segment => drop2Segment(frame);

/** The span S29 draws (with S28's pre-roll), for the scene's guards. */
export const ZBUF_SPAN = { from: PREROLL_FROM, to: CUT } as const;
