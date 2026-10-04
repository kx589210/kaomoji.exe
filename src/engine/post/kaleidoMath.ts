// The kaleidoscope's pure parts: the config a scene puts in its Look, the mirror fold, the tilings and a CPU reference of where each
// output point samples the picture. The GPU side is src/engine/post/kaleidoscope.ts; its shader is these formulas line for line.
// Pure: no three, no DOM; node tests import it, and a shot can use kaleidoImages to know where a drawn thing will be mirrored to.
//
// Coordinates: logical 1080p px from the frame centre, x right, y up (the flat world's units, src/engine/flatLayer.ts). Angles are
// radians, counter-clockwise; the fold measures them from 12 o'clock.
import type { RGB } from '../color.ts';

/** The most mirror pairs (facets) the fold accepts. */
export const KALEIDO_MAX_FACETS = 64;
/** The smallest tile cell, 1080p px. */
export const KALEIDO_MIN_CELL = 8;

/**
 * What a scene puts in its Look (`look.kaleido`, once the integrator adds the field) for the kaleidoscope: the frame mirrored into
 * N-fold radial symmetry about `centre` — two mirrors π/N apart, as in the tube — or, with `tile`, a seamless wallpaper of such
 * mandalas. Seamless everywhere: the map from output to picture is continuous (a fold is a piecewise isometry), samples that would
 * land outside the picture reflect back in (no black wedges, no smeared edges), and the pattern can spin, flow and zoom freely.
 */
export type KaleidoLook = {
  /** 0 = off (the pipeline skips the pass) … 1 = the mirrored picture fully over the plain one (a crossfade in between). */
  amount: number;
  /**
   * N, the mirror pairs (1–64): the pattern repeats N times around the centre, each copy mirrored (the dihedral group D_N; 8 →
   * 8 petals). Whole numbers are exact symmetry; between them the fold stays continuous (morph 8 → 12 freely: the wedge at 6 o'clock
   * is a partial one until N lands). 1 = a single vertical mirror (the left half mirrored onto the right). With hex tiles N snaps to
   * a multiple of 3.
   */
  facets: number;
  /** Rad, CCW: turns the finished pattern rigidly about `centre` (with `tile`, the whole wallpaper). */
  spin?: number;
  /** Rad, CCW: turns the picture under the mirrors — which slice of it they see; animate it and the pattern flows in place. */
  turn?: number;
  /** > 1 magnifies the slice (a smaller piece of the picture fills the pattern); default 1. */
  zoom?: number;
  /** The symmetry centre (with `tile`, one cell's centre), 1080p px from the frame centre, y up. Default [0, 0]. */
  centre?: readonly [number, number];
  /** Where in the picture the slice is cut from, same units; default `centre`. With spin, turn and zoom at rest and `source` = `centre`, the wedge just left of 12 o'clock is the picture itself, unchanged. */
  source?: readonly [number, number];
  /**
   * Repeat the mandala as a wallpaper. `cell` (1080p px, ≥ 8): the cell width for 'rect' (the default; any N, cell height
   * `cell / aspect`, aspect default 1; neighbouring cells are mirror images, so the borders are seamless mirrors), or the distance
   * between hexagon centres for 'hex' (N snaps to 3, 6, 9, …: the only folds whose hexagons meet seamlessly — the 3-mirror toy).
   */
  tile?: { cell: number; lattice?: 'rect' | 'hex'; aspect?: number };
  /** Draws the mirror lines (and with `tile` the cell borders): `width` 1080p px, a linear colour (above 1 blooms when the pass runs before bloom), alpha default 1. */
  seam?: { width: number; color: RGB; alpha?: number };
};

/** A KaleidoLook resolved: every default filled, N clamped (and snapped for hex). What the shader's uniforms hold. */
export type KaleidoParams = {
  amount: number;
  facets: number;
  spin: number;
  turn: number;
  zoom: number;
  centre: readonly [number, number];
  source: readonly [number, number];
  /** 0 = radial (no tile), 1 = rect, 2 = hex. */
  lattice: 0 | 1 | 2;
  /** rect: cell width and height; hex: centre spacing (twice). 1080p px. */
  cell: readonly [number, number];
  seamWidth: number;
  seamColor: RGB;
  seamAlpha: number;
};

type V2 = readonly [number, number];

const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
/** Floor modulo, like GLSL mod(). */
const fmod = (x: number, y: number): number => x - y * Math.floor(x / y);
const rotate = (p: V2, a: number): [number, number] => [Math.cos(a) * p[0] - Math.sin(a) * p[1], Math.sin(a) * p[0] + Math.cos(a) * p[1]];
const SQRT3 = Math.sqrt(3);

/** Resolves a KaleidoLook; null when it draws nothing (absent, or amount ≤ 0). Throws on a zoom or cell that cannot work. */
export function resolveKaleido(k: KaleidoLook | undefined): KaleidoParams | null {
  const amount = clamp(k?.amount ?? 0);
  if (!k || !(amount > 0)) return null;
  if (!Number.isFinite(k.facets)) throw new Error(`kaleidoscope: facets must be a number (got ${k.facets})`);
  const zoom = k.zoom ?? 1;
  if (!(zoom > 0)) throw new Error(`kaleidoscope: zoom must be > 0 (got ${zoom})`);
  const lattice = !k.tile ? 0 : k.tile.lattice === 'hex' ? 2 : 1;
  let facets = clamp(k.facets, 1, KALEIDO_MAX_FACETS);
  if (lattice === 2) facets = Math.max(3, Math.round(facets / 3) * 3);
  let cell: V2 = [0, 0];
  if (k.tile) {
    const c = Math.max(KALEIDO_MIN_CELL, k.tile.cell);
    const aspect = k.tile.aspect ?? 1;
    if (!(aspect > 0)) throw new Error(`kaleidoscope: tile aspect must be > 0 (got ${aspect})`);
    cell = lattice === 2 ? [c, c] : [c, Math.max(KALEIDO_MIN_CELL, c / aspect)];
  }
  const centre = k.centre ?? [0, 0];
  return {
    amount,
    facets,
    spin: k.spin ?? 0,
    turn: k.turn ?? 0,
    zoom,
    centre,
    source: k.source ?? centre,
    lattice,
    cell,
    seamWidth: Math.max(0, k.seam?.width ?? 0),
    seamColor: k.seam?.color ?? [1, 1, 1],
    seamAlpha: k.seam ? clamp(k.seam.alpha ?? 1) : 0,
  };
}

/**
 * The mirror fold: angle `a` (from 12 o'clock, CCW, in (−π, π]) folded into the wedge [0, π/N] by two mirrors π/N apart. A triangle
 * wave in |a|: even, so it agrees at ±π for any N — whole or not, the fold never tears.
 */
export function kaleidoFold(a: number, facets: number): number {
  const w = Math.PI / facets;
  const t = fmod(Math.abs(a), 2 * w);
  return Math.min(t, 2 * w - t);
}

/**
 * The tile lattice: `q` (px from the lattice origin, already unspun) → the point relative to its cell's centre, and its distance to
 * the cell border. rect: mirror-repeat into the cell (a continuous fold, so any N is seamless); hex: the nearest of two offset
 * rectangular grids (hexagon centres; neighbours at 0°, 60°, 120°). Radial (no tile): `q` itself, border infinitely far.
 */
export function kaleidoLocal(q: V2, K: Pick<KaleidoParams, 'lattice' | 'cell'>): { q: [number, number]; border: number } {
  if (K.lattice === 1) {
    const [cw, ch] = K.cell;
    const x = cw / 2 - Math.abs(fmod(q[0] + cw / 2, 2 * cw) - cw);
    const y = ch / 2 - Math.abs(fmod(q[1] + ch / 2, 2 * ch) - ch);
    return { q: [x, y], border: Math.min(cw / 2 - Math.abs(x), ch / 2 - Math.abs(y)) };
  }
  if (K.lattice === 2) {
    const d = K.cell[0];
    const s: V2 = [d, d * SQRT3];
    const a: V2 = [fmod(q[0], s[0]) - s[0] / 2, fmod(q[1], s[1]) - s[1] / 2];
    const b: V2 = [fmod(q[0] - s[0] / 2, s[0]) - s[0] / 2, fmod(q[1] - s[1] / 2, s[1]) - s[1] / 2];
    const l = a[0] * a[0] + a[1] * a[1] < b[0] * b[0] + b[1] * b[1] ? a : b;
    const reach = Math.max(Math.abs(l[0]), Math.abs(0.5 * l[0] + (SQRT3 / 2) * l[1]), Math.abs(-0.5 * l[0] + (SQRT3 / 2) * l[1]));
    return { q: [l[0], l[1]], border: d / 2 - reach };
  }
  return { q: [q[0], q[1]], border: Infinity };
}

/**
 * The CPU reference of KaleidoscopeEffect: output point P → the picture point it shows (`src`, logical px from the frame centre,
 * before the edge reflection, kaleidoUv), and `seam`, its distance to the nearest mirror line or cell border (px). Unspin about the
 * centre, find the cell, fold the angle, then turn and scale the slice out of `source`.
 */
export function kaleidoSource(P: V2, K: KaleidoParams): { src: [number, number]; seam: number } {
  const local = kaleidoLocal(rotate([P[0] - K.centre[0], P[1] - K.centre[1]], -K.spin), K);
  const q = local.q;
  const r = Math.hypot(q[0], q[1]);
  const f = kaleidoFold(r > 0 ? Math.atan2(-q[0], q[1]) : 0, K.facets);
  const beta = K.turn + f;
  const w = Math.PI / K.facets;
  return {
    src: [K.source[0] - (r / K.zoom) * Math.sin(beta), K.source[1] + (r / K.zoom) * Math.cos(beta)],
    seam: Math.min(r * Math.sin(Math.min(f, w - f)), local.border),
  };
}

/** Reflects a texture coordinate back into [0, 1] (mirrored repeat): what keeps the folds from ever showing the picture's edge. */
export const mirrorUv = (u: number): number => 1 - Math.abs(fmod(u, 2) - 1);

/** The texture coordinate a picture point is read from, reflected in, for a frame `size` logical px (1080 tall: [1080 · w / h, 1080]). */
export function kaleidoUv(src: V2, size: V2): [number, number] {
  return [mirrorUv(src[0] / size[0] + 0.5), mirrorUv(src[1] / size[1] + 0.5)];
}

/**
 * Where the picture point X shows up in a radial (untiled) kaleidoscope: every output point P with kaleidoSource(P).src = X — 2N
 * of them for a whole N (N where X sits on a mirror), none when X is outside the slice the mirrors see. For a shot that wants to
 * know where its reticle, its rim bytes or its hero will be mirrored to. Throws for a tiled kaleidoscope (infinitely many).
 */
export function kaleidoImages(X: V2, K: KaleidoParams): [number, number][] {
  if (K.lattice !== 0) throw new Error('kaleidoImages: radial kaleidoscopes only (a tiled one repeats without end)');
  const d: V2 = [X[0] - K.source[0], X[1] - K.source[1]];
  const rho = Math.hypot(d[0], d[1]);
  if (rho === 0) return [[K.centre[0], K.centre[1]]];
  const w = Math.PI / K.facets;
  const f = fmod(Math.atan2(-d[0], d[1]) - K.turn, 2 * Math.PI);
  const eps = 1e-9;
  if (f > w + eps) return [];
  // Every angle in (−π, π] that folds onto f: 2mw ± f (the fold is even and 2w-periodic). −π and π are one direction.
  const norm = (a: number): number => {
    const x = fmod(a + Math.PI, 2 * Math.PI) - Math.PI;
    return x <= -Math.PI + eps ? Math.PI : x;
  };
  const angles: number[] = [];
  const n = Math.ceil(K.facets) + 1;
  for (let m = -n; m <= n; m++) {
    for (const s of [1, -1]) {
      const a = 2 * m * w + s * Math.min(f, w);
      if (Math.abs(a) > Math.PI + eps) continue;
      const x = norm(a);
      if (!angles.some((b) => Math.abs(b - x) < 1e-7)) angles.push(x);
    }
  }
  const r = rho * K.zoom;
  return angles.map((a) => {
    const p = rotate([-r * Math.sin(a), r * Math.cos(a)], K.spin);
    return [K.centre[0] + p[0], K.centre[1] + p[1]];
  });
}

/**
 * A KaleidoLook between `a` (t = 0) and `b` (t = 1), for a transition's mixed look: amount, facets (the fold stays continuous),
 * spin, turn, centre and source blend, the zoom geometrically; the tile and seam come from the nearer one (a tile cell blends when
 * both tile the same way). An absent side is the other one at amount 0.
 */
export function mixKaleido(a: KaleidoLook | undefined, b: KaleidoLook | undefined, t: number): KaleidoLook | undefined {
  if (!a && !b) return undefined;
  const A = a ?? { ...b!, amount: 0 };
  const B = b ?? { ...a!, amount: 0 };
  const m = (x: number, y: number) => x + (y - x) * t;
  const m2 = (x: V2, y: V2): [number, number] => [m(x[0], y[0]), m(x[1], y[1])];
  const near = t < 0.5 ? A : B;
  const ac = A.centre ?? [0, 0];
  const bc = B.centre ?? [0, 0];
  const sameTile = A.tile && B.tile && (A.tile.lattice ?? 'rect') === (B.tile.lattice ?? 'rect');
  const tile = sameTile ? { ...near.tile!, cell: m(A.tile!.cell, B.tile!.cell), aspect: m(A.tile!.aspect ?? 1, B.tile!.aspect ?? 1) } : near.tile;
  return {
    amount: m(A.amount, B.amount),
    facets: m(A.facets, B.facets),
    spin: m(A.spin ?? 0, B.spin ?? 0),
    turn: m(A.turn ?? 0, B.turn ?? 0),
    zoom: Math.exp(m(Math.log(A.zoom ?? 1), Math.log(B.zoom ?? 1))),
    centre: m2(ac, bc),
    source: m2(A.source ?? ac, B.source ?? bc),
    ...(tile ? { tile } : {}),
    ...(near.seam ? { seam: near.seam } : {}),
  };
}
