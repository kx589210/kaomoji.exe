// The 8-bit look's pure parts: the config a scene puts in its Look, the palettes, the colour maths (sRGB, OKLab, ordered
// dithering, the scattered cell pick) and a CPU reference of the whole effect, one device pixel at a time. The GPU side is
// src/engine/post/pixel.ts; its shader is generated from the constants here (BAYER4, OKLAB_*, PIXEL_SALT), so the two cannot drift,
// and every formula below is written to match its GLSL line for line. Pure: no three, no DOM; node tests import it.
import type { RGB } from '../color.ts';

/** The height (px) the cell size is designed at; a bigger render gets bigger cells (pipeline.ts LOOK_HEIGHT; not imported: that module needs three). */
const DESIGN_HEIGHT = 1080;

/** The most colours a palette may have (the shader's uniform arrays). */
export const PIXEL_MAX_COLOURS = 16;

/**
 * Game palettes, as display (sRGB) hex, darkest first where that means something. The film's colour logic holds (story bible
 * 颜色逻辑): amber is the virus (•ω•), red the antivirus (￣▽￣).
 * - `film16`: the film's own colours as a 16-colour game palette — night, navy, the amber ramp (shadow, #FFB23E, highlight), the
 *   red ramp (shadow, #FF4A1C), pink, violet, Riso blue, cyan, the terminal greens, Riso yellow, grey, paper.
 * - `amber4`: the virus's amber monochrome monitor, 4 shades. `red4`: the antivirus's red X-ray view, 4 shades.
 * - `dmg4`: the pea-green 4-shade handheld LCD. `cga4`: black, cyan, magenta, white. `pico16`: the 16-colour fantasy-console set.
 * - `onebit`: black and white.
 */
export const PIXEL_PALETTES = {
  film16: ['#07060C', '#121B3E', '#6B3A0E', '#FFB23E', '#FFE3A3', '#7A1408', '#FF4A1C', '#FF5FA2', '#A78BFA', '#0078BF', '#3FE0FF', '#1E7A4A', '#4CF08C', '#FFE800', '#5A5F66', '#F1EEE7'],
  amber4: ['#100802', '#5C330C', '#B8701E', '#FFB23E'],
  red4: ['#0E0302', '#5A1206', '#B32A10', '#FF4A1C'],
  dmg4: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'],
  cga4: ['#000000', '#55FFFF', '#FF55FF', '#FFFFFF'],
  pico16: ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'],
  onebit: ['#000000', '#FFFFFF'],
} as const satisfies Record<string, readonly string[]>;

export type PixelPaletteName = keyof typeof PIXEL_PALETTES;

/**
 * What a scene puts in its Look (`look.pixel`, once the integrator adds the field) for the 8-bit look. The picture is cut into
 * square game pixels on a grid centred on the frame; each pixel takes the average colour of its area, optionally snapped to a game
 * palette (or posterised), with an optional ordered dither and optional dark gaps between pixel rows / columns. Sizes are 1080p px:
 * a 4K render gets the same picture, scaled.
 */
export type PixelLook = {
  /**
   * The share of the game pixels that turn (0 = off: the pipeline skips the pass; 1 = all of them). In between, a fixed scattered
   * set turns (the same cells at every frame, and every cell turned at a lower amount stays turned at a higher one): ramp it for
   * a block-by-block crumble into (or out of) 8-bit.
   */
  amount: number;
  /** Game-pixel size in 1080p px (6 → 320 × 180 pixels across a 1920 × 1080 frame). Ramp it for the mosaic transition. ≥ 1 device px. */
  cell: number;
  /** Snap each game pixel to the nearest palette colour (OKLab distance): a preset name or 2–16 '#rrggbb' colours. */
  palette?: PixelPaletteName | readonly string[];
  /** Without a palette: posterise each display channel to this many steps (2–256; 4 → 0, 85, 170, 255). Neither: colours kept (a plain mosaic). */
  levels?: number;
  /**
   * Ordered dithering: a 4 × 4 Bayer offset per game pixel, added in display space before the snap, this many display units
   * peak to peak (0 / absent = none). Only with `palette` or `levels`. Palettes look right at 0.1–0.3; `levels` n at about 1 / (n − 1).
   */
  dither?: number;
  /** Darkness (0–1, as displayed) of a gap along the bottom of every game-pixel row: scanlines. 0 / absent = CRT off, flat pixels. */
  scanlines?: number;
  /** Darkness (0–1, as displayed) of a gap along the left of every game-pixel column; with `scanlines`, an LCD dot grid. */
  grid?: number;
  /** The gaps' width, as a share of the game pixel (default 0.25). */
  gap?: number;
};

/** A PixelLook resolved for one frame size: what the shader's uniforms hold. Colours are linear light; `labs` their OKLab. */
export type PixelParams = {
  amount: number;
  /** Game-pixel size in device px. */
  cellPx: number;
  /** 0 = colours kept, 1 = palette, 2 = posterise. */
  mode: 0 | 1 | 2;
  colours: readonly RGB[];
  labs: readonly (readonly [number, number, number])[];
  levels: number;
  dither: number;
  scanlines: number;
  grid: number;
  gap: number;
};

/** A picture: the linear colour at device px (x, y), y up, origin at the bottom-left corner (texture lookups at p / resolution). */
export type PixelSampler = (x: number, y: number) => RGB;

const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
/** Floor modulo, like GLSL mod(): the result takes the sign of the divisor. */
export const fmod = (x: number, y: number): number => x - y * Math.floor(x / y);

/** The game-pixel size in device px: `cell` px at 1080p, scaled to a frame `height` px tall, rounded, at least 1. */
export function pixelCellPx(cell: number, height: number): number {
  return Math.max(1, Math.round((cell * height) / DESIGN_HEIGHT));
}

// sRGB transfer, exact (the encoder at the end of the pipeline uses it, so a palette colour reaches the screen as its hex). The
// shader's pxToDisplay / pxToLinear are these, with step() for the branch (so the edge case `c == edge` takes the curved branch).
export const linearToSrgb = (c: number): number => (c < 0.0031308 ? 12.92 * Math.max(c, 0) : 1.055 * c ** (1 / 2.4) - 0.055);
export const srgbToLinear = (c: number): number => (c < 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Display (sRGB 0–1) values of '#rrggbb'. Throws on anything else, so a typo fails at configure time, not as a black pixel. */
export function parseHex(hex: string): RGB {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`pixel palette: "${hex}" is not a #rrggbb colour`);
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Linear sRGB → LMS (Björn Ottosson's OKLab, M1), rows. */
export const OKLAB_LMS = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
] as const;
/** Cube-rooted LMS → OKLab (M2), rows. */
export const OKLAB_LAB = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
] as const;

const row = (r: readonly [number, number, number], c: readonly [number, number, number]): number => r[0] * c[0] + r[1] * c[1] + r[2] * c[2];

/** OKLab (L 0–1, a, b) of a linear sRGB colour: a perceptual space, so the nearest palette colour is the one that looks nearest. */
export function oklab(c: RGB): [number, number, number] {
  const lms = OKLAB_LMS.map((r) => Math.cbrt(Math.max(0, row(r, c)))) as [number, number, number];
  return [row(OKLAB_LAB[0], lms), row(OKLAB_LAB[1], lms), row(OKLAB_LAB[2], lms)];
}

/** The 4 × 4 Bayer matrix, row-major: index (cell y mod 4) × 4 + (cell x mod 4), y up. Thresholds are (v + 0.5) / 16. */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** The ordered-dither threshold (0–1, mean 0.5) of game pixel (cx, cy). */
export const bayer = (cx: number, cy: number): number => (BAYER4[fmod(cy, 4) * 4 + fmod(cx, 4)] + 0.5) / 16;

/** PCG hash of a uint32 (the same as GlyphFlashEffect's gfPcg and the grain's): Math.imul and >>> 0 are the shader's uint maths. */
export function pcg(v: number): number {
  const state = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>> 0;
  return ((word >>> 22) ^ word) >>> 0;
}

/** Salts the cell pick, so the 8-bit crumble and the character flash's crumble never turn the same scattered set. */
export const PIXEL_SALT = 0x85ebca6b;

/** The cell's place in the crumble order, [0, 1): game pixel (cx, cy) turns once `amount` exceeds it. */
export function cellPick(cx: number, cy: number): number {
  return (pcg(((cx + 65536) >>> 0) ^ pcg(((cy + 65536) ^ PIXEL_SALT) >>> 0)) >>> 8) / 16777216;
}

/** Resolves a PixelLook for a frame `height` device px tall; null when it draws nothing (absent, or amount ≤ 0). Throws on a bad palette. */
export function resolvePixel(p: PixelLook | undefined, height: number): PixelParams | null {
  const amount = clamp(p?.amount ?? 0);
  if (!p || !(amount > 0)) return null;
  if (!(p.cell > 0)) throw new Error(`pixel: cell must be > 0 (got ${p.cell})`);
  const list: readonly string[] | undefined = typeof p.palette === 'string' ? PIXEL_PALETTES[p.palette] : p.palette;
  if (typeof p.palette === 'string' && !list) throw new Error(`pixel: no palette named "${p.palette}"`);
  if (list && (list.length < 2 || list.length > PIXEL_MAX_COLOURS)) throw new Error(`pixel: a palette has 2–${PIXEL_MAX_COLOURS} colours (got ${list.length})`);
  const colours = (list ?? []).map((hex) => parseHex(hex).map(srgbToLinear) as unknown as RGB);
  const mode = list ? 1 : p.levels !== undefined ? 2 : 0;
  return {
    amount,
    cellPx: pixelCellPx(p.cell, height),
    mode,
    colours,
    labs: colours.map(oklab),
    levels: Math.round(clamp(p.levels ?? 2, 2, 256)),
    dither: mode === 0 ? 0 : clamp(p.dither ?? 0),
    scanlines: clamp(p.scanlines ?? 0),
    grid: clamp(p.grid ?? 0),
    gap: clamp(p.gap ?? 0.25, 0, 1),
  };
}

/** Game pixel (cx, cy) of device pixel centre (fx, fy) — gl_FragCoord — on a grid anchored at floor(size / 2), the frame centre. */
export function pixelCellOf(fx: number, fy: number, cellPx: number, width: number, height: number): [number, number] {
  return [Math.floor((fx - Math.floor(width / 2)) / cellPx), Math.floor((fy - Math.floor(height / 2)) / cellPx)];
}

/** One game pixel's colour, snapped: dither (display space), then the palette (OKLab) or the posterise; mode 0 returns it as is. */
export function quantize(lin: RGB, P: PixelParams, cx: number, cy: number): RGB {
  if (P.mode === 0) return lin;
  const o = P.dither > 0 ? (bayer(cx, cy) - 0.5) * P.dither : 0;
  const shown = lin.map((v) => clamp(linearToSrgb(v) + o));
  if (P.mode === 2) return shown.map((v) => srgbToLinear(Math.floor(v * (P.levels - 1) + 0.5) / (P.levels - 1))) as unknown as RGB;
  const lab = oklab(shown.map(srgbToLinear) as unknown as RGB);
  let best = Infinity;
  let k = 0;
  P.labs.forEach((q, i) => {
    const e = (q[0] - lab[0]) ** 2 + (q[1] - lab[1]) ** 2 + (q[2] - lab[2]) ** 2;
    if (e < best) {
      best = e;
      k = i;
    }
  });
  return P.colours[k];
}

/** How much of the device pixel [lp, lp + 1] (px from the cell's low edge) lies in the gap [0, gap × size): exact box coverage, so a 4K gap averages to the 1080p one. */
export const gapCover = (lp: number, size: number, gap: number): number => clamp(Math.min(lp + 1, gap * size) - Math.max(lp, 0));

/**
 * The CPU reference of PixelEffect: the colour of device pixel centre (fx, fy) (gl_FragCoord: x + 0.5, y up) of a `width` × `height`
 * frame, given the picture before the effect. Matches the shader step for step: the cell pick, 3 × 3 taps across the cell (kept half
 * a device px inside it, so 1-px cells are exact and no tap bleeds into the next cell), the linear average, the snap, the gaps.
 */
export function pixelShade(sample: PixelSampler, fx: number, fy: number, P: PixelParams, width: number, height: number): RGB {
  const [cx, cy] = pixelCellOf(fx, fy, P.cellPx, width, height);
  if (cellPick(cx, cy) >= P.amount) return sample(fx, fy);
  const ox = Math.floor(width / 2) + cx * P.cellPx;
  const oy = Math.floor(height / 2) + cy * P.cellPx;
  const sum = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      const x = clamp(ox + (P.cellPx * (i + 0.5)) / 3, ox + 0.5, ox + P.cellPx - 0.5);
      const y = clamp(oy + (P.cellPx * (j + 0.5)) / 3, oy + 0.5, oy + P.cellPx - 0.5);
      const c = sample(x, y);
      for (let k = 0; k < 3; k++) sum[k] += c[k];
    }
  }
  const avg = sum.map((v) => Math.max(v / 9, 0)) as unknown as RGB;
  const out = quantize(avg, P, cx, cy);
  const shade = (1 - P.scanlines * gapCover(fy - 0.5 - oy, P.cellPx, P.gap)) * (1 - P.grid * gapCover(fx - 0.5 - ox, P.cellPx, P.gap));
  return shade < 1 ? (out.map((v) => srgbToLinear(linearToSrgb(v) * shade)) as unknown as RGB) : out;
}

/**
 * A PixelLook between `a` (t = 0) and `b` (t = 1), for a transition's mixed look: the numbers blend (the cell geometrically, so a
 * mosaic grows evenly), the palette / levels come from the nearer one. An absent side is the other one at amount 0.
 */
export function mixPixel(a: PixelLook | undefined, b: PixelLook | undefined, t: number): PixelLook | undefined {
  if (!a && !b) return undefined;
  const A = a ?? { ...b!, amount: 0 };
  const B = b ?? { ...a!, amount: 0 };
  const m = (x: number, y: number) => x + (y - x) * t;
  const near = t < 0.5 ? A : B;
  return {
    amount: m(A.amount, B.amount),
    cell: Math.exp(m(Math.log(A.cell), Math.log(B.cell))),
    ...(near.palette ? { palette: near.palette } : {}),
    ...(near.levels !== undefined ? { levels: near.levels } : {}),
    dither: m(A.dither ?? 0, B.dither ?? 0),
    scanlines: m(A.scanlines ?? 0, B.scanlines ?? 0),
    grid: m(A.grid ?? 0, B.grid ?? 0),
    gap: m(A.gap ?? 0.25, B.gap ?? 0.25),
  };
}
