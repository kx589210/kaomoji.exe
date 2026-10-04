// E7 donut.exe inside S29 Z-BUFFER, one beat (as built: notes/d2build/sheet.md §5.6.1, §5.6.3; the review fix: the 20-bar sheet
// notes/bid2/drop2-sheet2.md §1.3 D, ZBUF2 in src/score/drop2.ts). On drop2 3.3 he swallows himself into a torus — the brackets
// first, the eyes, the ω last (75 % by + 3, whole by + 6) — that spins on donut.c's two axes and is drawn in donut.c's own luminance ramp
// `.,-~:;=!*#$@` by donut.c's own light, his two eyes riding its front as two bright nodes; on the open hat of 3.3& it pops and its spin
// doubles, whipping it face-on exactly as the re-form starts, and he re-forms out of it (the ω first), landing whole on the drop2 3.4
// clap, straight into the conveyor (it was two beats, re-formed on drop2 4.1). Pure: the raymarcher in src/shots/drop2Zbuf.ts evaluates
// these distances; no three / remotion.
// Units: the torus's sizes are screen px at the hero's depth (the raymarcher divides by its scale); vectors are view space (x right,
// y up, z toward the camera).
import { DIALECT_GLYPHS } from '../content/drop2.ts';
import { clamp } from '../engine/math.ts';
import { ZBUF2 } from '../score/drop2.ts';
import { impact, impactSquash, springL } from './drop2Shared.ts';

/** The swallow (drop2 3.3, + 6) and the re-form (landing on the drop2 3.4 clap): ZBUF2's windows. */
const SWALLOW = ZBUF2.swallow;
const REFORM = ZBUF2.reform;
/** The open hat of 3.3&: the torus pops and its spin doubles, whipping it face-on as the re-form starts. */
export const SPIN_DOUBLE = { from: ZBUF2.swallow.from + 12, to: ZBUF2.reform.from } as const;

export type Vec3 = [number, number, number];
/** A 3 × 3 rotation, row-major. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

/** donut.c's luminance ramp, unlit to lit. */
export const DONUT_RAMP = DIALECT_GLYPHS.donut;

/**
 * donut.c's R2 : R1 = 2 : 1, outer Ø 960 px, centred where the face was (screen px): his 1250 px face's ( and ) fold onto the ring's
 * arcs. (The design's Ø 1100 does not fit the frame face-on: with the pop and the perspective it spanned 1150 px of the 1080.)
 */
export const TORUS = { ring: 320, tube: 160, centre: [960, 530] as const } as const;

/** donut.c's spin rates (rad a frame) about the screen's x axis (A) and the view axis (B). */
export const SPIN = { a: 0.1, b: 0.05 } as const;
/** A = π/2 turns donut.c's torus (axis y) to face the viewer: the ring the face falls into is an O. */
const A0 = Math.PI / 2;
/** The whip into the landing: the doubling over 3.3&, landing face-on as the re-form starts. */
const LAND_FROM = SPIN_DOUBLE.from;

/** donut.c's unnormalised light (0, 1, −1) in its own axes (z away from the viewer) = (0, 1, 1) in view space. */
export function donutIndex(n: readonly [number, number, number]): number {
  const L = n[1] + n[2];
  return clamp(Math.floor(8 * L), 0, 11);
}
export const donutChar = (n: readonly [number, number, number]): string => DONUT_RAMP[donutIndex(n)];

/** The free spin: face-on on the swallow, donut.c's rates. */
const freeA = (f: number): number => A0 + SPIN.a * Math.max(0, f - SWALLOW.from);

/**
 * The landing: from the open hat of 3.3& A whips (ease-in, an impact) from its free spin to the next face-on angle at least twice the
 * free spin ahead (the spin doubles, and more), exactly as the re-form starts.
 */
const LANDING = (() => {
  const a1 = freeA(LAND_FROM);
  const T = REFORM.from - LAND_FROM;
  // Face-on is A ≡ π/2 (mod π).
  const k = Math.ceil((a1 + 2 * SPIN.a * T - A0) / Math.PI);
  return { a1, T, target: A0 + k * Math.PI };
})();

/** donut.c's two angles at instant `f`: A about the screen's x axis, B about the view axis. Held face-on from the re-form's start. */
export function donutSpin(f: number): { a: number; b: number } {
  const b = SPIN.b * clamp(f - SWALLOW.from, 0, REFORM.from - SWALLOW.from);
  if (f <= LAND_FROM) return { a: freeA(f), b };
  if (f >= REFORM.from) return { a: LANDING.target, b };
  const u = (f - LAND_FROM) / LANDING.T;
  const { a1, T, target } = LANDING;
  return { a: a1 + SPIN.a * T * u + (target - a1 - SPIN.a * T) * u * u * u, b };
}

/** The torus's rotation (local → view): donut.c rotates by A about x, then by B about z. */
export function torusRotation(a: number, b: number): Mat3 {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  // Rz(B) · Rx(A)
  return [cb, -sb * ca, sb * sa, sb, cb * ca, -cb * sa, 0, sa, ca];
}

export const rotate = (m: Mat3, p: readonly [number, number, number]): Vec3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
];

/** Signed distance from view-space point `q` (relative to the torus's centre) to donut.c's torus turned by `m`, radii `ring` and `tube`. */
export function torusDistance(q: readonly [number, number, number], m: Mat3, ring: number, tube: number): number {
  // local = mᵀ q: donut.c's torus is the circle (ring, 0) in the xy-plane swept about the y axis.
  const x = m[0] * q[0] + m[3] * q[1] + m[6] * q[2];
  const y = m[1] * q[0] + m[4] * q[1] + m[7] * q[2];
  const z = m[2] * q[0] + m[5] * q[1] + m[8] * q[2];
  return Math.hypot(Math.hypot(x, z) - ring, y) - tube;
}

/** The parts of (•ω•) in the order the swallow takes them. */
export type PartKind = 'bracket' | 'eye' | 'mouth';
/** Frames after drop2 3.3 each part starts to go (the ω last: 75 % by + 3, all of him by + 6) … */
export const SWALLOW_LAG: Readonly<Record<PartKind, number>> = { bracket: 0, eye: 0.5, mouth: 1 };
/** … and how many frames before the drop2 3.4 clap each part lands back (the ω first; the brackets on the clap itself). */
export const REFORM_LAG: Readonly<Record<PartKind, number>> = { mouth: 2, eye: 1, bracket: 0 };
/** A launch is settled this long after its key: from here the progress is exactly its end value (the donut is one beat). */
const SETTLED = 14;

const settledL = (f: number, at: number): number => (f - at >= SETTLED ? 1 : springL(f, at));

/** How the re-form brings part `kind` back: an impact landing `REFORM_LAG` frames before the clap (0 swallowed … 1 back). */
const reformed = (f: number, kind: PartKind): number => {
  const at = REFORM.to - REFORM_LAG[kind];
  return impact(f, at, at - REFORM.from);
};

/**
 * How far part `kind` is swallowed into the torus at instant `f`: 0 his face, 1 gone — a launch per part on the swallow (clamped: a part
 * never overshoots), an impact per part on the re-form, the brackets landing on the drop2 3.4 clap.
 */
export function swallowed(f: number, kind: PartKind): number {
  // (Once a part is in, it stays in: the spring’s ring never lets it peek back out.)
  const at = SWALLOW.from + SWALLOW_LAG[kind];
  if (f < REFORM.from) return f - at >= 4 ? 1 : clamp(springL(f, at));
  return clamp(1 - reformed(f, kind));
}

/**
 * How grown the torus is (0 a hairline hoop, 1 whole; the launch's overshoot lets it bulge a moment). ( and ) are two arcs of a ring:
 * the hoop thickens out of the brackets from the first frame of the swallow, and on the re-form it thins back into them as they return.
 */
export function torusGrowth(f: number): number {
  if (f < REFORM.from) return f < SWALLOW.from ? 0 : settledL(f, SWALLOW.from);
  return f >= REFORM.to ? 0 : Math.max(0, 1 - reformed(f, 'bracket'));
}

/** How far each part is drawn toward his centre at full swallow (the brackets barely: they already sit on the ring), and how late it thins out (the exponent on its progress). */
export const SWALLOW_PULL: Readonly<Record<PartKind, { pull: number; late: number }>> = {
  bracket: { pull: 0.15, late: 3 },
  eye: { pull: 0.6, late: 2 },
  mouth: { pull: 0.5, late: 2 },
};

/** The torus exists from the swallow until the re-form has taken it back (on the drop2 3.4 clap the hoop has thinned to nothing). */
export const donutActive = (f: number): boolean => f >= SWALLOW.from && f < REFORM.to;

/** The open hat of 3.3&: the torus pops 6 % and rings back (I) as its spin doubles. */
export const torusPop = (f: number): number => 1 + impactSquash(f, SPIN_DOUBLE.from);

/**
 * •ω• never leaves (design 37.3): his two eyes ride the torus as two nodes on its front — face-on, where his eyes were, upper left and
 * upper right of the ring on the tube's crest toward the viewer — turning with its spin. View-space points relative to the torus's centre
 * for donut.c's angles (a, b), its radii × `k` (the raymarcher's world units a px).
 */
export const EYE_NODE = { cos: 0.8, sin: -0.6 } as const;
export function eyeNodes(a: number, b: number, k: number): [Vec3, Vec3] {
  const m = torusRotation(a, b);
  const at = (side: number): Vec3 => rotate(m, [side * EYE_NODE.cos * TORUS.ring * k, TORUS.tube * k, EYE_NODE.sin * TORUS.ring * k]);
  return [at(-1), at(1)];
}

/** Polynomial smooth minimum: exact min when the two are further apart than `k`, melted together within it. */
export function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
}
