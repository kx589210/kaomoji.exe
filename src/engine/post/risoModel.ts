// The Riso print post pass (RisoPrintEffect, ./risoPrint.ts), pure parts: what a scene puts in its Look, the colour separation
// the shader looks up, and the shader's per-pixel model in TypeScript (risoPrintAt), line for line, so Node can test the maths
// and a script can print a still on the CPU to compare with the GPU's.
//
// The picture is re-printed as a three-ink Riso (prototype A, notes/cosmos/A/riso.mjs): each colour is separated into
// pink, blue and yellow coverages by a lookup table that searched every ink combination for the printed colour nearest (OKLab)
// to an art-directed target; each plate is screened at its own angle (pink 75°, blue 15°, yellow 0°; Euclidean dots, pitch 10
// px at 1080p), prints solid where the plate has fine detail (strokes stay line ink instead of dissolving into dots), and lands
// where its own offset puts it (misregistration); the inks multiply onto paper with fibre, density mottle and starved specks.
// `night` chooses the separation: 0 day (black is bare paper, light prints as ink), 1 night (black is solid pink over solid
// blue, printed space; light knocks out to paper). `power` is prototype C (cosmos/C/render.mjs, recipes.mjs, sep.mjs): the
// room light goes out (paper falls through a violet dusk to the void, as a coarse printed screen or smoothly), the ink fades to near-black
// with the dots left as unlit glass, and the plates light up as neon: bright strokes and the halftone of bright areas glow in
// cyan, pink and amber (HDR, so the look's bloom makes the glow). Two opt-in stage controls (the cosmos's): `levels` lands
// printed space on a given ground and bare paper on a given paper, whatever the room light (the print's body keeps its contrast
// as the power rises), and `hdr` carries the input's light above 1 through the print (the print alone caps every light at paper).
import { type RGB, linear } from '../color.ts';
import { DOT_SHAPE, SCREEN_FIXED, type ScreenAnchor, type Vec2, decode, encodeRGB, luma, planePoint, screenInk, screenPx, uvOf, valueNoise } from './dotScreen.ts';

// ---------------------------------------------------------------------------------------------------------------------------
// The press. The same paper, inks, density, screen and grain as the Riso world (src/worlds/riso.ts; a test keeps them equal).

export type RisoPlate = 'pink' | 'blue' | 'yellow';
/** Plate order everywhere here and in the shader (the LUT's R, G, B channels). */
export const RISO_PRINT_PLATES: readonly RisoPlate[] = ['pink', 'blue', 'yellow'];
export const RISO_PRINT_INKS = { paper: '#F2EDE3', pink: '#FF48B0', blue: '#0078BF', yellow: '#FFE800' } as const;
/** How much light a solid layer of ink takes away. */
export const RISO_PRINT_DENSITY = 0.85;
/** Screen angles (radians), as on the press. */
export const RISO_PRINT_ANGLES: Readonly<Record<RisoPlate, number>> = { pink: (75 * Math.PI) / 180, blue: (15 * Math.PI) / 180, yellow: 0 };
/** Dot pitch, 1080p px. */
export const RISO_PRINT_PITCH = 10;
/** Paper fibre strength. */
export const RISO_PRINT_GRAIN = 0.035;
/** Powered up, each plate is a neon tube: blue → cyan, pink → pink, yellow → amber (the club's three). */
export const RISO_NEON = { pink: '#FF3D8B', blue: '#3FE0FF', yellow: '#FFB23E' } as const;
/** The room with the light out, and the unlit glass of the dots in it. */
export const RISO_VOID = '#07060C';
export const RISO_GHOST = '#1C1A24';
/** Paper dims through a violet dusk: the tint, strongest half-way. */
export const RISO_DUSK: RGB = [0.85, 0.8, 1.0];
/** Angle of the coarse screen the dark arrives as when powered (its pitch is RisoPrintLook.voidPitch). */
export const RISO_VOID_ANGLE = Math.PI / 4;

const PAPER = linear(RISO_PRINT_INKS.paper);
const INKS: readonly RGB[] = RISO_PRINT_PLATES.map((k) => linear(RISO_PRINT_INKS[k]));
/** Per plate, the share of each channel a solid layer takes away. */
export const RISO_ABSORB: readonly RGB[] = INKS.map((ink) => [0, 1, 2].map((c) => RISO_PRINT_DENSITY * (1 - ink[c])) as unknown as RGB);
export const RISO_PAPER_LINEAR = PAPER;
export const RISO_NEON_LINEAR: readonly RGB[] = RISO_PRINT_PLATES.map((k) => linear(RISO_NEON[k]));
export const RISO_VOID_LINEAR = linear(RISO_VOID);
export const RISO_GHOST_LINEAR = linear(RISO_GHOST);
/** Plate seeds for the press noise (dot edges, mottle, specks). */
export const RISO_SEEDS: readonly number[] = [11, 23, 37];

/** What solid coverages `c` (pink, blue, yellow; 0–1) of the three inks print on bare paper, linear RGB. */
export function risoPrinted(c: RGB): RGB {
  return [0, 1, 2].map((ch) => PAPER[ch] * (1 - c[0] * RISO_ABSORB[0][ch]) * (1 - c[1] * RISO_ABSORB[1][ch]) * (1 - c[2] * RISO_ABSORB[2][ch])) as unknown as RGB;
}
/** Printed space: solid pink over solid blue. */
export const RISO_SPACE: RGB = risoPrinted([1, 1, 0]);
/** How much of the paper's light printed space lets through, per channel (RisoPrintLook.levels' floor). */
export const RISO_SPACE_T: RGB = [0, 1, 2].map((c) => (1 - RISO_ABSORB[0][c]) * (1 - RISO_ABSORB[1][c])) as unknown as RGB;

// ---------------------------------------------------------------------------------------------------------------------------
// What a scene puts in its Look.

/**
 * The Riso print of one output frame (Look.riso once the integrator adds it). Only `amount` is required; everything else has
 * a default (RISO_PRINT_DEFAULTS). Lengths are 1080p px, offsets y up.
 */
export type RisoPrintLook = {
  /** 0 off (the pass is skipped and costs nothing) … 1 the print; between, the print over the picture. */
  amount: number;
  /**
   * The separation: 0 day (black is bare paper, light prints as ink: a render of space becomes ink on a sheet), 1 night (black
   * prints as solid pink over solid blue, printed space; light knocks out to paper and light tints). Between, the two
   * separations cross-fade (the ground darkens, but the picture's contrast dips mid-way: step it on a beat, or move fast).
   */
  night?: number;
  /** 0 printed … 1 powered: the room light goes out (to the void, via dusk), the ink fades to near-black and the plates glow as neon. */
  power?: number;
  /** Dot pitch, 1080p px on the plane. */
  pitch?: number;
  /**
   * Where each plate prints relative to where it should (1080p px, y up): misregistration. src/worlds/riso.ts misregistration(frame,
   * strongBeats, amount) returns exactly this shape and snaps it to 0 on the strong beats (the plates clack into register).
   */
  offsets?: Readonly<Partial<Record<RisoPlate, Vec2>>>;
  /** Source multiplier before the separation (more = lighter print in night, more ink in day). */
  exposure?: number;
  /** Source gamma before the separation (> 1 pushes mid-tones toward the ground). */
  gamma?: number;
  /** Local contrast of each plate before screening (0 none; strokes lift off haze). */
  clarity?: number;
  /** Paper fibre strength (0 smooth paper). */
  paperGrain?: number;
  /** Press noise: density mottle, roller banding and starved specks (0 a perfect press … 1 a Riso). */
  mottle?: number;
  /** The plane the dots, paper and press noise are printed on (dotScreen.ts ScreenAnchor); fixed to the screen when absent. */
  screen?: ScreenAnchor;
  /** Where the room light holds as `power` rises: full inside r0 of (x, y), out beyond r1 (C's "the last of the room light"). */
  light?: { x: number; y: number; r0: number; r1: number };
  /**
   * Pitch (1080p px) of the coarse screen the dark arrives as when powered: dots of void that grow until they close (C). At a
   * uniform half power that is a full-frame checkerboard, so it reads best with a `light` zone (a ring of growing dots) or a
   * quick ramp; 0 lets the room fade smoothly instead.
   */
  voidPitch?: number;
  /** Neon gains when powered: `strokes` the bright strokes (tubes), `dots` the halftone of bright areas (lamps). 1 = prototype C. */
  neon?: { strokes?: number; dots?: number };
  /**
   * The print re-levelled onto a stage (the cosmos's grounds, notes/bcos/sheet.md §9.2): wherever printed space (solid pink over
   * solid blue) lands, the print shows `ground`; wherever the paper is bare (a knock-out: light at night), `paper`; between, each
   * channel by the inks' own transmission (so a solid ink stays that ink between the two). Both linear RGB, under the paper's fibre,
   * and both whatever the room light: with levels the room's dimming and its violet dusk leave the print's body alone (the room still
   * decides how much the neon shows). `amount` 0 … 1 fades it in (default 1). Absent: the press's own space on room-dimmed paper.
   */
  levels?: { ground: RGB; paper: RGB; amount?: number };
  /**
   * Light the print cannot show (input above 1, linear, per channel) carried through and added on top, × this: HDR emissives keep
   * their energy for the bloom after the pass. 0 (the default): every light caps at paper.
   */
  hdr?: number;
};

/** A RisoPrintLook with every field filled in. */
export type RisoPrintSettings = {
  amount: number;
  night: number;
  power: number;
  pitch: number;
  offsets: Readonly<Record<RisoPlate, Vec2>>;
  exposure: number;
  gamma: number;
  clarity: number;
  paperGrain: number;
  mottle: number;
  screen: ScreenAnchor;
  light: { x: number; y: number; r0: number; r1: number } | null;
  voidPitch: number;
  neon: { strokes: number; dots: number };
  levels: { ground: RGB; paper: RGB; amount: number } | null;
  hdr: number;
};

export const RISO_PRINT_DEFAULTS: Omit<RisoPrintSettings, 'amount'> = {
  night: 0,
  power: 0,
  pitch: RISO_PRINT_PITCH,
  offsets: { pink: [0, 0], blue: [0, 0], yellow: [0, 0] },
  exposure: 1.25,
  gamma: 1.2,
  clarity: 0.7,
  paperGrain: RISO_PRINT_GRAIN,
  mottle: 1,
  screen: SCREEN_FIXED,
  light: null,
  voidPitch: 40,
  neon: { strokes: 1, dots: 1 },
  levels: null,
  hdr: 0,
};

const unit = (x: number): number => Math.min(1, Math.max(0, x));

/** `look` with the defaults filled in, amount, night and power clamped to 0–1. */
export function resolveRiso(look: RisoPrintLook): RisoPrintSettings {
  const d = RISO_PRINT_DEFAULTS;
  return {
    amount: unit(look.amount),
    night: unit(look.night ?? d.night),
    power: unit(look.power ?? d.power),
    pitch: Math.max(1, look.pitch ?? d.pitch),
    offsets: { pink: look.offsets?.pink ?? d.offsets.pink, blue: look.offsets?.blue ?? d.offsets.blue, yellow: look.offsets?.yellow ?? d.offsets.yellow },
    exposure: look.exposure ?? d.exposure,
    gamma: look.gamma ?? d.gamma,
    clarity: look.clarity ?? d.clarity,
    paperGrain: look.paperGrain ?? d.paperGrain,
    mottle: look.mottle ?? d.mottle,
    screen: look.screen ?? d.screen,
    light: look.light ? { ...look.light, r0: Math.max(0, look.light.r0), r1: Math.max(look.light.r1, Math.max(0, look.light.r0) + 1e-3) } : null,
    voidPitch: Math.max(0, look.voidPitch ?? d.voidPitch),
    neon: { strokes: look.neon?.strokes ?? d.neon.strokes, dots: look.neon?.dots ?? d.neon.dots },
    levels: look.levels ? { ground: look.levels.ground, paper: look.levels.paper, amount: unit(look.levels.amount ?? 1) } : d.levels,
    hdr: Math.max(0, look.hdr ?? d.hdr),
  };
}

/**
 * A print between `a` (t = 0) and `b` (t = 1), for mixLook: the numbers blend (a side without a print fades its amount from 0
 * with the other side's settings); the light zone comes from the nearer side; levels blend, or fade in and out with the side that
 * has them. Neither side printing: undefined.
 */
export function mixRisoPrint(a: RisoPrintLook | undefined, b: RisoPrintLook | undefined, t: number): RisoPrintLook | undefined {
  if (!a && !b) return undefined;
  const A = resolveRiso(a ?? { ...b!, amount: 0 });
  const B = resolveRiso(b ?? { ...a!, amount: 0 });
  const m = (x: number, y: number) => x + (y - x) * t;
  const v = (x: Vec2, y: Vec2): Vec2 => [m(x[0], y[0]), m(x[1], y[1])];
  const light = (t < 0.5 ? A : B).light;
  const c3 = (x: RGB, y: RGB): RGB => [m(x[0], y[0]), m(x[1], y[1]), m(x[2], y[2])];
  const levels: RisoPrintSettings['levels'] =
    A.levels && B.levels
      ? { ground: c3(A.levels.ground, B.levels.ground), paper: c3(A.levels.paper, B.levels.paper), amount: m(A.levels.amount, B.levels.amount) }
      : A.levels
        ? { ...A.levels, amount: A.levels.amount * (1 - t) }
        : B.levels
          ? { ...B.levels, amount: B.levels.amount * t }
          : null;
  return {
    amount: m(A.amount, B.amount),
    night: m(A.night, B.night),
    power: m(A.power, B.power),
    pitch: m(A.pitch, B.pitch),
    offsets: { pink: v(A.offsets.pink, B.offsets.pink), blue: v(A.offsets.blue, B.offsets.blue), yellow: v(A.offsets.yellow, B.offsets.yellow) },
    exposure: m(A.exposure, B.exposure),
    gamma: m(A.gamma, B.gamma),
    clarity: m(A.clarity, B.clarity),
    paperGrain: m(A.paperGrain, B.paperGrain),
    mottle: m(A.mottle, B.mottle),
    screen: { x: m(A.screen.x, B.screen.x), y: m(A.screen.y, B.screen.y), zoom: m(A.screen.zoom, B.screen.zoom), roll: m(A.screen.roll, B.screen.roll) },
    ...(light ? { light } : {}),
    voidPitch: m(A.voidPitch, B.voidPitch),
    neon: { strokes: m(A.neon.strokes, B.neon.strokes), dots: m(A.neon.dots, B.neon.dots) },
    ...(levels ? { levels } : {}),
    ...(A.hdr > 0 || B.hdr > 0 ? { hdr: m(A.hdr, B.hdr) } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------
// The separation lookup table: display (sRGB) colour → coverages (pink, blue, yellow), one table per mode.

/** Nodes per axis. Trilinear in between (the GPU filters it). */
export const RISO_LUT_SIZE = 17;
/** Source haze below this (linear) prints as the ground. */
export const RISO_BLACK = 0.012;
/** Chroma gain of the target per mode (the inks are few; pushing chroma keeps hues apart). */
export const RISO_CHROMA = { day: 1.3, night: 1.6 } as const;

export type RisoLut = { size: number; day: Float32Array; night: Float32Array };

/** OKLab of a linear sRGB colour. */
export function oklab(c: RGB): RGB {
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
  const m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
  const s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

const L_PAPER = oklab(PAPER)[0];
const L_SPACE = oklab(RISO_SPACE)[0];

/** The colour (OKLab, chroma pushed) a display colour should print as, in either mode. */
export function risoTarget(x: RGB, night: boolean): RGB {
  const s = [0, 1, 2].map((c) => unit((decode(x[c]) - RISO_BLACK) / (1 - RISO_BLACK)));
  let lab: RGB;
  if (night) lab = oklab([0, 1, 2].map((c) => RISO_SPACE[c] + (PAPER[c] - RISO_SPACE[c]) * s[c]) as unknown as RGB);
  else {
    const src = oklab(s as unknown as RGB);
    lab = [L_PAPER - src[0] * (L_PAPER - L_SPACE), src[1], src[2]];
  }
  const k = night ? RISO_CHROMA.night : RISO_CHROMA.day;
  return [lab[0], lab[1] * k, lab[2] * k];
}

/** How far a printed colour (OKLab) is from a target: hue errors count double; a little more ink, and three-ink mud, cost extra. */
export function risoCost(lab: RGB, t: RGB, c: RGB): number {
  const dl = lab[0] - t[0];
  const da = lab[1] - t[1];
  const db = lab[2] - t[2];
  return dl * dl + 2 * (da * da + db * db) + 0.0015 * (c[0] + c[1] + c[2]) + 0.02 * c[0] * c[1] * c[2];
}

type Combo = { c: RGB; lab: RGB };
const COARSE = 11;
const FINE = 0.025;
let coarse: Combo[] | null = null;

/** The ink coverages that print nearest to target `t`: every combination on a 0.1 grid, then a 0.025 grid around the best. */
export function risoSolve(t: RGB): RGB {
  if (!coarse) {
    coarse = [];
    for (let p = 0; p < COARSE; p++) {
      for (let b = 0; b < COARSE; b++) {
        for (let y = 0; y < COARSE; y++) {
          const c: RGB = [p / (COARSE - 1), b / (COARSE - 1), y / (COARSE - 1)];
          coarse.push({ c, lab: oklab(risoPrinted(c)) });
        }
      }
    }
  }
  let best = coarse[0].c;
  let cost = Infinity;
  for (const k of coarse) {
    const e = risoCost(k.lab, t, k.c);
    if (e < cost) {
      cost = e;
      best = k.c;
    }
  }
  const centre = best;
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      for (let k = -3; k <= 3; k++) {
        const c: RGB = [unit(centre[0] + i * FINE), unit(centre[1] + j * FINE), unit(centre[2] + k * FINE)];
        const e = risoCost(oklab(risoPrinted(c)), t, c);
        if (e < cost) {
          cost = e;
          best = c;
        }
      }
    }
  }
  return best;
}

/** Builds both tables: entry ((r · G + g) · G + b) · 3 + plate for display colour (r, g, b) / (G − 1). About 0.1–0.3 s. */
export function buildRisoLut(size = RISO_LUT_SIZE): RisoLut {
  const day = new Float32Array(size ** 3 * 3);
  const night = new Float32Array(size ** 3 * 3);
  for (let r = 0; r < size; r++) {
    for (let g = 0; g < size; g++) {
      for (let b = 0; b < size; b++) {
        const x: RGB = [r / (size - 1), g / (size - 1), b / (size - 1)];
        const i = ((r * size + g) * size + b) * 3;
        day.set(risoSolve(risoTarget(x, false)), i);
        night.set(risoSolve(risoTarget(x, true)), i);
      }
    }
  }
  return { size, day, night };
}

let built: RisoLut | null = null;
/** The film's tables, built once per tab (pure and deterministic, so every render chunk builds the same). */
export function risoLut(): RisoLut {
  built ??= buildRisoLut();
  return built;
}

/**
 * Both tables as one RGBA8 image for the GPU, `size²` wide and `2 · size` tall: blue slices side by side along x (red inside a
 * slice), green along y, the day table in rows 0 … size − 1 and the night table above it; coverages in R, G, B (pink, blue,
 * yellow). Linear filtering then interpolates red and green; the shader mixes two blue slices.
 */
export function packRisoLut(lut: RisoLut): Uint8Array {
  const G = lut.size;
  const W = G * G;
  const out = new Uint8Array(W * 2 * G * 4);
  for (let mode = 0; mode < 2; mode++) {
    const src = mode === 0 ? lut.day : lut.night;
    for (let r = 0; r < G; r++) {
      for (let g = 0; g < G; g++) {
        for (let b = 0; b < G; b++) {
          const i = ((r * G + g) * G + b) * 3;
          const o = ((mode * G + g) * W + b * G + r) * 4;
          out[o] = Math.round(unit(src[i]) * 255);
          out[o + 1] = Math.round(unit(src[i + 1]) * 255);
          out[o + 2] = Math.round(unit(src[i + 2]) * 255);
          out[o + 3] = 255;
        }
      }
    }
  }
  return out;
}

/** A linearly filtered RGBA8 texel fetch at texel-space (x, y) (texel centres on integers), clamped to the edge, as the GPU's. */
function bilinear(px: Uint8Array, W: number, H: number, x: number, y: number): RGB {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const at = (xi: number, yi: number, k: number) => px[((Math.min(H - 1, Math.max(0, yi)) * W + Math.min(W - 1, Math.max(0, xi))) * 4) + k] / 255;
  return [0, 1, 2].map((k) => {
    const top = at(x0, y0, k) + (at(x0 + 1, y0, k) - at(x0, y0, k)) * tx;
    const bottom = at(x0, y0 + 1, k) + (at(x0 + 1, y0 + 1, k) - at(x0, y0 + 1, k)) * tx;
    return top + (bottom - top) * ty;
  }) as unknown as RGB;
}

/** One table's coverages for display colour `x`, from the packed image (rpLutMode). */
export function risoLutMode(packed: Uint8Array, size: number, x: RGB, mode: 0 | 1): RGB {
  const n = size - 1;
  const f = x.map((v) => unit(v) * n);
  const b0 = Math.min(Math.floor(f[2]), n - 1);
  const t = f[2] - b0;
  const W = size * size;
  const y = mode * size + f[1];
  const lo = bilinear(packed, W, 2 * size, b0 * size + f[0], y);
  const hi = bilinear(packed, W, 2 * size, (b0 + 1) * size + f[0], y);
  return [lo[0] + (hi[0] - lo[0]) * t, lo[1] + (hi[1] - lo[1]) * t, lo[2] + (hi[2] - lo[2]) * t];
}

/** Coverages for display colour `x` at `night` (rpCoverage). */
export function risoCoverage(packed: Uint8Array, size: number, x: RGB, night: number): RGB {
  const d: RGB = night < 1 ? risoLutMode(packed, size, x, 0) : [0, 0, 0];
  const n: RGB = night > 0 ? risoLutMode(packed, size, x, 1) : [0, 0, 0];
  return [d[0] + (n[0] - d[0]) * night, d[1] + (n[1] - d[1]) * night, d[2] + (n[2] - d[2]) * night];
}

// ---------------------------------------------------------------------------------------------------------------------------
// The per-pixel model (the shader in ./risoPrint.ts, function for function).

/** The pass input at a texture uv (0–1, y up), linear RGB; the caller clamps uv to the edge like the GPU. */
export type Sampler = (u: number, v: number) => RGB;

/** Detail taps: four diagonal neighbours this far (1080p px) from the centre. */
export const RISO_DETAIL_RADIUS = 2.5;
const DIAGONALS: readonly Vec2[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const smooth = (a: number, b: number, x: number): number => {
  const t = unit((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The input as the press sees it: exposed, gamma'd, hue-clamped (an over-bright colour keeps its hue), display-encoded (rpSource). */
export function risoSource(sample: Sampler, s: Vec2, res: Vec2, st: RisoPrintSettings): RGB {
  const [u, v] = uvOf(s, res);
  const c = sample(u, v).map((x) => Math.max(x, 0) ** st.gamma * st.exposure);
  const peak = Math.max(1, c[0], c[1], c[2]);
  return encodeRGB([c[0] / peak, c[1] / peak, c[2] / peak]);
}

/** One plate's view of the source (its offset applied): coverages at the centre, the 5 taps' mean and variance, the centre's colour, the taps' mean luma (rpTaps). */
export type RisoTaps = { cov: RGB; mean: RGB; variance: RGB; col: RGB; lumMean: number };

export function risoTaps(sample: Sampler, s: Vec2, res: Vec2, st: RisoPrintSettings, packed: Uint8Array, size: number): RisoTaps {
  const col = risoSource(sample, s, res, st);
  const cov = risoCoverage(packed, size, col, st.night);
  const sum = [...cov];
  const sq = cov.map((c) => c * c);
  let lum = luma(col);
  const r = RISO_DETAIL_RADIUS * Math.SQRT1_2;
  for (const [dx, dy] of DIAGONALS) {
    const x = risoSource(sample, [s[0] + dx * r, s[1] + dy * r], res, st);
    const c = risoCoverage(packed, size, x, st.night);
    for (let k = 0; k < 3; k++) {
      sum[k] += c[k];
      sq[k] += c[k] * c[k];
    }
    lum += luma(x);
  }
  const mean = sum.map((v) => v / 5) as unknown as RGB;
  return { cov, mean, variance: [0, 1, 2].map((k) => Math.max(sq[k] / 5 - mean[k] * mean[k], 0)) as unknown as RGB, col, lumMean: lum / 5 };
}

/** Ink of one plate at screen point `s` (already shifted by the plate's offset): screened tone, or solid line ink where the plate has fine detail (rpInk). */
export function risoInk(s: Vec2, c: number, m: number, variance: number, angle: number, seed: number, px: number, st: RisoPrintSettings): number {
  const sharp = unit(c + st.clarity * (c - m));
  const detail = smooth(0.07, 0.17, Math.sqrt(variance));
  const dots = screenInk(planePoint(s, st.screen), sharp, st.pitch, angle, DOT_SHAPE.euclid, px, 0.35, seed);
  return dots + (smooth(0.42, 0.58, sharp) - dots) * detail;
}

/** Ink density of a plate at plane point `q` relative to a perfect press: mottle, roller banding, starved specks (rpDensity). */
export function risoDensity(q: Vec2, seed: number, mottle: number): number {
  const n = 0.035 * valueNoise(q[0] / 0.9, q[1] / 0.9, seed) + 0.022 * valueNoise(q[0] / 28, q[1] / 28, seed + 1) + 0.015 * Math.sin(q[1] / 23 + seed);
  const voids = 1 - 0.7 * smooth(0.82, 0.9, valueNoise(q[0] / 1.1, q[1] / 1.1, seed + 2));
  return Math.min(1.15, Math.max(0, 1 + mottle * n)) * (1 + (voids - 1) * Math.min(mottle, 1));
}

/** Hue in degrees (0–360) of a display colour (kxHue in the shader). */
export function hueOf(x: RGB): number {
  const mx = Math.max(x[0], x[1], x[2]);
  const d = mx - Math.min(x[0], x[1], x[2]);
  if (d < 1e-5) return 0;
  let h = mx === x[0] ? ((x[1] - x[2]) / d) % 6 : mx === x[1] ? (x[2] - x[0]) / d + 2 : (x[0] - x[1]) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

/** Hue sectors of the three tubes: amber 40°, cyan 212°, pink 335° (prototype C's sep.mjs). */
export const RISO_NEON_HUES = { yellow: 40, blue: 212, pink: 335 } as const;

/**
 * Which tubes a display colour lights (pink, blue, yellow), 0–1: its hue between the two nearest tube hues, flattened toward the
 * dominant one; greys (low saturation) light the cyan tube, as white light on the club's glass (rpNeonWeights).
 */
export function risoNeonWeights(x: RGB): RGB {
  const mx = Math.max(x[0], x[1], x[2]);
  const mn = Math.min(x[0], x[1], x[2]);
  const sat = mx > 0.03 ? (mx - mn) / mx : 0;
  const conf = smooth(0.06, 0.16, sat);
  const h = hueOf(x);
  const { yellow: A, blue: C, pink: P } = RISO_NEON_HUES;
  let wc = 0;
  let wp = 0;
  let wa = 0;
  if (h >= A && h < C) {
    const t = (h - A) / (C - A);
    wa = 1 - t;
    wc = t;
  } else if (h >= C && h < P) {
    const t = (h - C) / (P - C);
    wc = 1 - t;
    wp = t;
  } else {
    const t = ((h < A ? h + 360 : h) - P) / (A + 360 - P);
    wp = 1 - t;
    wa = t;
  }
  const m = Math.max(wc, wp, wa, 1e-4);
  return [conf * smooth(0.25, 0.6, wp / m), conf * smooth(0.25, 0.6, wc / m) + (1 - conf), conf * smooth(0.25, 0.6, wa / m)];
}

/** How brightly one tube burns at a point (before power and visibility): bright strokes as tubes, bright areas as lit dots (rpGlow). */
export function risoGlow(x: RGB, lumMean: number, w: number, s: Vec2, angle: number, seed: number, px: number, st: RisoPrintSettings): number {
  const y = luma(x);
  const stroke = w * smooth(0.03, 0.12, y - lumMean) * smooth(0.18, 0.5, y);
  const level = w * smooth(0.25, 0.8, lumMean);
  const lamps = screenInk(planePoint(s, st.screen), 0.6 * level, st.pitch, angle, DOT_SHAPE.euclid, px, 0, seed);
  return 0.845 * st.neon.strokes * stroke + 0.3 * st.neon.dots * lamps;
}

/**
 * The effect's output at fragment `frag` (device px, gl_FragCoord) of a `res` frame, linear RGB: the shader's mainImage. `packed`
 * is packRisoLut's image. Settings with amount 0 return the input.
 */
export function risoPrintAt(sample: Sampler, frag: Vec2, res: Vec2, st: RisoPrintSettings, packed: Uint8Array, size = RISO_LUT_SIZE): RGB {
  const input = sample(frag[0] / res[0], frag[1] / res[1]);
  if (st.amount <= 0) return input;
  const s = screenPx(frag, res);
  const px = (res[1] / 1080) * Math.max(st.screen.zoom, 1e-3);
  const off = RISO_PRINT_PLATES.map((k) => st.offsets[k]);
  const at = off.map((o) => [s[0] - o[0], s[1] - o[1]] as Vec2);
  const inRegister = off.every((o) => o[0] === off[0][0] && o[1] === off[0][1]);
  const t0 = risoTaps(sample, at[0], res, st, packed, size);
  const taps = inRegister ? [t0, t0, t0] : [t0, risoTaps(sample, at[1], res, st, packed, size), risoTaps(sample, at[2], res, st, packed, size)];
  const angles = RISO_PRINT_PLATES.map((k) => RISO_PRINT_ANGLES[k]);
  const ink = [0, 1, 2].map((k) => risoInk(at[k], taps[k].cov[k], taps[k].mean[k], taps[k].variance[k], angles[k], RISO_SEEDS[k], px, st));
  const q = planePoint(s, st.screen);
  const fib = 1 + st.paperGrain * (0.7 * valueNoise(q[0] / 3.5, q[1] / 0.6, 101) + 0.35 * valueNoise(q[0] / 0.7, q[1] / 2.5, 102) + 0.6 * valueNoise(q[0] / 40, q[1] / 40, 103));
  let room = 1;
  if (st.power > 0) room = 1 - st.power * (st.light ? smooth(st.light.r0, st.light.r1, Math.hypot(s[0] - st.light.x, s[1] - st.light.y)) : 1);
  const lit = st.voidPitch > 0 ? 1 - screenInk(q, 1 - room, st.voidPitch, RISO_VOID_ANGLE, DOT_SHAPE.euclid, px, 0, 104) : room;
  const lk = lit ** 1.3;
  const tw = 4 * lit * (1 - lit);
  const out = [0, 1, 2].map((c) => (RISO_VOID_LINEAR[c] + (PAPER[c] - RISO_VOID_LINEAR[c]) * lk) * (1 + (RISO_DUSK[c] - 1) * tw) * fib);
  const inkT = [1, 1, 1];
  for (let k = 0; k < 3; k++) {
    const d = risoDensity(planePoint(at[k], st.screen), RISO_SEEDS[k], st.mottle);
    for (let c = 0; c < 3; c++) {
      const t = Math.max(0, 1 - ink[k] * d * RISO_ABSORB[k][c]);
      out[c] *= t;
      inkT[c] *= t;
    }
  }
  const ghost = (1 - room) * Math.min(1, ink[0] + ink[1] + ink[2]) * 0.7;
  for (let c = 0; c < 3; c++) out[c] += RISO_GHOST_LINEAR[c] * ghost;
  if (st.levels && st.levels.amount > 0) {
    // Re-levelled: printed space → the ground, bare paper → the stage's paper, each channel by the inks' transmission (the shader's
    // `levelsAmount` block). Below printed space (dense mottle) the ground scales down with the ink, so the press's texture stays.
    const { ground, paper, amount } = st.levels;
    for (let c = 0; c < 3; c++) {
      const S = RISO_SPACE_T[c];
      const g = ground[c] * fib;
      const lev = inkT[c] <= S ? (g * inkT[c]) / S : g + (paper[c] * fib - g) * ((inkT[c] - S) / (1 - S));
      out[c] += (lev - out[c]) * amount;
    }
  }
  if (st.power > 0) {
    const vis = 1 - smooth(0.3, 0.8, room);
    const e = [0, 1, 2].map((k) => risoGlow(taps[k].col, taps[k].lumMean, risoNeonWeights(taps[k].col)[k], at[k], angles[k], 51 + k, px, st));
    const white = 0.8 * (Math.max(e[0] - 0.7, 0) + Math.max(e[1] - 0.7, 0) + Math.max(e[2] - 0.7, 0));
    for (let c = 0; c < 3; c++) out[c] += st.power * vis * (RISO_NEON_LINEAR[0][c] * e[0] + RISO_NEON_LINEAR[1][c] * e[1] + RISO_NEON_LINEAR[2][c] * e[2] + white);
  }
  if (st.hdr > 0) for (let c = 0; c < 3; c++) out[c] += st.hdr * Math.max(0, input[c] - 1);
  return [0, 1, 2].map((c) => input[c] + (out[c] - input[c]) * st.amount) as unknown as RGB;
}
