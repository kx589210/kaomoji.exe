// The dot screen the print effects share (RisoPrintEffect in ./risoPrint.ts, ComicInkEffect in ./comicInk.ts), plus the small
// helpers both need: where a pixel is in 1080p px, the plane a screen is printed on, hash noise and sRGB coding. Pure: the GLSL
// the two effects paste into their shaders (DOT_SCREEN_GLSL) and the same maths in TypeScript, line for line, which is the
// reference the tests check in Node (WebGL is not available there). The tables the GLSL embeds are computed here, once, so the
// shader and the reference read the same numbers.
//
// Units: every length is in px of the 1080p frame (the height the looks are designed at, pipeline.ts LOOK_HEIGHT); the effects
// scale them to the render (a 4K master is the 1080p print, scaled, never a print with finer dots). Screen points are 1080p px
// from the frame centre, y up, like the flat world's.
import type { RGB } from '../color.ts';

/** The frame height every size here is given at. */
export const PRINT_HEIGHT = 1080;

/**
 * The spot of a screen. `round`: discs that grow until they touch (78.5 %) and then close the corners: comic Ben-Day dots.
 * `euclid`: the press's Euclidean spot (cos + cos), round dots below 50 %, a checkerboard at 50 %, round holes above: Riso plates.
 */
export type DotShape = 'round' | 'euclid';
export const DOT_SHAPE: Readonly<Record<DotShape, number>> = { round: 0, euclid: 1 };

/**
 * The plane a screen (and its paper) is printed on, as the camera shows it, in the convention of engine/view.ts: the plane is
 * scaled by `zoom` about the frame centre, turned by `roll` (radians, counter-clockwise), then moved by (`x`, `y`) 1080p px, y up.
 * SCREEN_FIXED pins the dots to the screen; pass a scene's own camera move (or the Director's view) and the dots ride it like
 * ink on a page instead of sliding over the picture.
 */
export type ScreenAnchor = { x: number; y: number; zoom: number; roll: number };
export const SCREEN_FIXED: ScreenAnchor = { x: 0, y: 0, zoom: 1, roll: 0 };

/** Rec. 709 luma weights. */
export const LUMA: RGB = [0.2126, 0.7152, 0.0722];

/** sRGB encode of one linear channel, clamped to 0–1 (kxEncode). */
export const encode = (c: number): number => {
  const v = Math.min(1, Math.max(0, c));
  return v < 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};
/** sRGB decode of one display channel (kxDecode). */
export const decode = (c: number): number => (c < 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const encodeRGB = (c: RGB): RGB => [encode(c[0]), encode(c[1]), encode(c[2])];
export const decodeRGB = (c: RGB): RGB => [decode(c[0]), decode(c[1]), decode(c[2])];
export const luma = (c: RGB): number => LUMA[0] * c[0] + LUMA[1] * c[1] + LUMA[2] * c[2];

// ---------------------------------------------------------------------------------------------------------------------------
// Tone → threshold tables. A screen of tone c inks the share c of every cell: the spot function s(f) of the point's place f in
// its cell is compared with a threshold τ(c) such that exactly the share c of the cell has s > τ.

/** Steps of the tables (65 entries). */
export const TABLE_STEPS = 64;
/** Tone at which round dots touch their four neighbours. */
export const ROUND_TOUCH = Math.PI / 4;

/** Share of a unit cell inside a disc of radius `r` (cell units) centred on it; neighbours' discs never reach past the cell's own. */
export function roundArea(r: number): number {
  if (r <= 0) return 0;
  if (r >= Math.SQRT1_2) return 1;
  if (r <= 0.5) return Math.PI * r * r;
  return Math.PI * r * r - 4 * (r * r * Math.acos(0.5 / r) - 0.5 * Math.sqrt(r * r - 0.25));
}

/** Share of a cell where the Euclidean spot (cos 2πx + cos 2πy) / 2 exceeds `tau`, integrated exactly over y for each x. */
export function euclidCoverage(tau: number): number {
  const M = 2048;
  let sum = 0;
  for (let i = 0; i < M; i++) {
    const k = 2 * tau - Math.cos((2 * Math.PI * (i + 0.5)) / M);
    sum += k <= -1 ? 1 : k >= 1 ? 0 : Math.acos(k) / Math.PI;
  }
  return sum / M;
}

/** x in [lo, hi] where the monotone f(x) = target (bisection). */
function solve(f: (x: number) => number, target: number, lo: number, hi: number): number {
  const rising = f(hi) > f(lo);
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target === rising) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const fixed = (v: number): number => Number(v.toFixed(7));

/** Disc radius (cell units) for tones from ROUND_TOUCH to 1 in TABLE_STEPS steps (below ROUND_TOUCH the radius is √(c/π)). */
export const ROUND_RADII: readonly number[] = Array.from({ length: TABLE_STEPS + 1 }, (_, i) =>
  fixed(i === TABLE_STEPS ? Math.SQRT1_2 : i === 0 ? 0.5 : solve(roundArea, ROUND_TOUCH + ((1 - ROUND_TOUCH) * i) / TABLE_STEPS, 0.5, Math.SQRT1_2)),
);

/** Euclidean-spot threshold for tones 0 to 1 in TABLE_STEPS steps. */
export const EUCLID_THRESHOLDS: readonly number[] = Array.from({ length: TABLE_STEPS + 1 }, (_, i) =>
  fixed(i === 0 ? 1 : i === TABLE_STEPS ? -1 : solve(euclidCoverage, i / TABLE_STEPS, -1, 1)),
);

const tableAt = (table: readonly number[], x01: number): number => {
  const x = Math.min(1, Math.max(0, x01)) * TABLE_STEPS;
  const i = Math.min(Math.floor(x), TABLE_STEPS - 1);
  return table[i] + (table[i + 1] - table[i]) * (x - i);
};

/** Radius (cell units) of a round dot of tone `c` (kxRoundRadius). */
export function roundRadius(c: number): number {
  if (c <= ROUND_TOUCH) return Math.sqrt(Math.max(c, 0) / Math.PI);
  return tableAt(ROUND_RADII, (c - ROUND_TOUCH) / (1 - ROUND_TOUCH));
}

/** Threshold of the Euclidean spot for tone `c` (kxEuclidThreshold). */
export const euclidThreshold = (c: number): number => tableAt(EUCLID_THRESHOLDS, c);

// ---------------------------------------------------------------------------------------------------------------------------
// Hash noise (PCG, as the film grain): integer maths, so the GPU and this reference agree bit for bit on the lattice values.

/** One PCG step on a uint32 (kxPcg). */
export function pcg(v: number): number {
  const state = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737) >>> 0;
  return ((word >>> 22) ^ word) >>> 0;
}

/** Lattice offset that keeps negative cells positive before the uint conversion (GLSL's int → uint of a negative is not portable). */
const LATTICE = 1048576;

/** A value in [0, 1) for integer cell (ix, iy) and an integer seed ≥ 0 (kxHash). */
export function hash2(ix: number, iy: number, seed: number): number {
  const ux = (ix + LATTICE) >>> 0;
  const uy = (iy + LATTICE) >>> 0;
  return (pcg((ux ^ pcg((uy ^ pcg(seed >>> 0)) >>> 0)) >>> 0) >>> 8) / 16777216;
}

/** Smooth value noise in [−1, 1] with one lattice cell per unit (kxNoise). */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return 2 * (top + (bottom - top) * fy) - 1;
}

// ---------------------------------------------------------------------------------------------------------------------------
// Where a pixel is.

export type Vec2 = readonly [number, number];

/** A fragment (gl_FragCoord, device px, origin bottom-left) as 1080p px from the frame centre, y up (kxScreenPx). */
export const screenPx = (frag: Vec2, res: Vec2): Vec2 => [((frag[0] - 0.5 * res[0]) * PRINT_HEIGHT) / res[1], ((frag[1] - 0.5 * res[1]) * PRINT_HEIGHT) / res[1]];

/** The texture uv (0–1, y up) of screen point `s` (kxUv). */
export const uvOf = (s: Vec2, res: Vec2): Vec2 => [(s[0] * res[1]) / PRINT_HEIGHT / res[0] + 0.5, (s[1] * res[1]) / PRINT_HEIGHT / res[1] + 0.5];

/** The point of the anchored plane that shows at screen point `s` (kxPlane): the inverse of the anchor's move. */
export function planePoint(s: Vec2, a: ScreenAnchor): Vec2 {
  const dx = s[0] - a.x;
  const dy = s[1] - a.y;
  const c = Math.cos(a.roll);
  const n = Math.sin(a.roll);
  const z = Math.max(a.zoom, 1e-3);
  return [(c * dx + n * dy) / z, (-n * dx + c * dy) / z];
}

/** Below this many device px per dot pitch a screen starts to fade to its flat tone, and at MOIRE_FLAT it is flat (no moiré). */
export const MOIRE_START = 5;
export const MOIRE_FLAT = 2.5;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Ink (0–1) of a dot screen of tone `cover` at plane point `p` (1080p px): `pitch` 1080p px from dot to dot along the screen's
 * rows, rows turned by `angle` (radians); `shape` 0 round, 1 Euclidean (DOT_SHAPE); `px` device px per 1080p px on screen (the
 * render scale times the anchor's zoom); `rough` how far (1080p px) noise pushes the dot edges, `seed` that noise's seed. The edge
 * is anti-aliased over one device px from its signed distance; a screen finer than MOIRE_START device px fades to its flat tone.
 * Tone 0 and 1 are exactly no ink and solid ink. (kxScreen)
 */
export function screenInk(p: Vec2, cover: number, pitch: number, angle: number, shape: number, px: number, rough = 0, seed = 0): number {
  if (cover <= 0) return 0;
  if (cover >= 1) return 1;
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const gx = (cs * p[0] + sn * p[1]) / pitch;
  const gy = (-sn * p[0] + cs * p[1]) / pitch;
  const fx = gx - Math.floor(gx + 0.5);
  const fy = gy - Math.floor(gy + 0.5);
  let d: number;
  if (shape < 0.5) {
    d = (roundRadius(cover) - Math.hypot(fx, fy)) * pitch;
  } else {
    const ax = 2 * Math.PI * fx;
    const ay = 2 * Math.PI * fy;
    const grad = Math.PI * Math.hypot(Math.sin(ax), Math.sin(ay));
    d = ((0.5 * (Math.cos(ax) + Math.cos(ay)) - euclidThreshold(cover)) / Math.max(grad, 1e-4)) * pitch;
  }
  if (rough > 0) d += rough * valueNoise(p[0] / 1.2, p[1] / 1.2, seed);
  const ink = Math.min(1, Math.max(0, 0.5 + d * px));
  const flat = smooth(MOIRE_FLAT, MOIRE_START, pitch * px);
  return cover + (ink - cover) * flat;
}

// ---------------------------------------------------------------------------------------------------------------------------
// The GLSL. Pasted into each effect's fragment shader before its own code. postprocessing prefixes every function and uniform
// name per effect, but not global constants: two effects carrying this chunk must never share one EffectPass (they cannot: both
// are convolution effects, which postprocessing refuses to merge).

const list = (values: readonly number[]): string => values.map((v) => v.toFixed(7)).join(', ');

export const DOT_SCREEN_GLSL = /* glsl */ `
const float KX_PI = 3.14159265358979;
const float KX_2PI = 6.28318530717959;
const vec3 KX_LUMA = vec3(0.2126, 0.7152, 0.0722);
const float KX_ROUND_TOUCH = ${ROUND_TOUCH.toFixed(9)};
const float KX_ROUND_RADII[${TABLE_STEPS + 1}] = float[${TABLE_STEPS + 1}](${list(ROUND_RADII)});
const float KX_EUCLID_THRESHOLDS[${TABLE_STEPS + 1}] = float[${TABLE_STEPS + 1}](${list(EUCLID_THRESHOLDS)});

float kxRoundRadius(float c) {
  if (c <= KX_ROUND_TOUCH) return sqrt(max(c, 0.0) / KX_PI);
  float x = clamp((c - KX_ROUND_TOUCH) / (1.0 - KX_ROUND_TOUCH), 0.0, 1.0) * ${TABLE_STEPS.toFixed(1)};
  int i = int(min(floor(x), ${(TABLE_STEPS - 1).toFixed(1)}));
  return mix(KX_ROUND_RADII[i], KX_ROUND_RADII[i + 1], x - float(i));
}

float kxEuclidThreshold(float c) {
  float x = clamp(c, 0.0, 1.0) * ${TABLE_STEPS.toFixed(1)};
  int i = int(min(floor(x), ${(TABLE_STEPS - 1).toFixed(1)}));
  return mix(KX_EUCLID_THRESHOLDS[i], KX_EUCLID_THRESHOLDS[i + 1], x - float(i));
}

uint kxPcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

float kxHash(ivec2 cell, float seed) {
  uvec2 u = uvec2(cell + ${LATTICE});
  return float(kxPcg(u.x ^ kxPcg(u.y ^ kxPcg(uint(seed)))) >> 8u) / 16777216.0;
}

float kxNoise(vec2 p, float seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f);
  ivec2 c = ivec2(i);
  float a = kxHash(c, seed);
  float b = kxHash(c + ivec2(1, 0), seed);
  float d = kxHash(c + ivec2(0, 1), seed);
  float e = kxHash(c + ivec2(1, 1), seed);
  return 2.0 * mix(mix(a, b, f.x), mix(d, e, f.x), f.y) - 1.0;
}

vec2 kxScreenPx(vec2 frag, vec2 res) {
  return (frag - 0.5 * res) * (${PRINT_HEIGHT.toFixed(1)} / res.y);
}

vec2 kxUv(vec2 s, vec2 res) {
  return s * (res.y / ${PRINT_HEIGHT.toFixed(1)}) / res + 0.5;
}

vec2 kxPlane(vec2 s, vec4 anchor) {
  vec2 d = s - anchor.xy;
  float c = cos(anchor.w);
  float n = sin(anchor.w);
  return vec2(c * d.x + n * d.y, -n * d.x + c * d.y) / max(anchor.z, 1e-3);
}

vec3 kxEncode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 kxDecode(vec3 c) {
  c = max(c, 0.0);
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

float kxScreen(vec2 p, float cover, float pitch, float angle, float shape, float px, float rough, float seed) {
  if (cover <= 0.0) return 0.0;
  if (cover >= 1.0) return 1.0;
  float cs = cos(angle);
  float sn = sin(angle);
  vec2 g = vec2(cs * p.x + sn * p.y, -sn * p.x + cs * p.y) / pitch;
  vec2 f = g - floor(g + 0.5);
  float d;
  if (shape < 0.5) {
    d = (kxRoundRadius(cover) - length(f)) * pitch;
  } else {
    vec2 a = KX_2PI * f;
    float grad = KX_PI * length(vec2(sin(a.x), sin(a.y)));
    d = (0.5 * (cos(a.x) + cos(a.y)) - kxEuclidThreshold(cover)) / max(grad, 1e-4) * pitch;
  }
  if (rough > 0.0) d += rough * kxNoise(p / 1.2, seed);
  float ink = clamp(0.5 + d * px, 0.0, 1.0);
  return mix(cover, ink, smoothstep(${MOIRE_FLAT.toFixed(1)}, ${MOIRE_START.toFixed(1)}, pitch * px));
}
`;
