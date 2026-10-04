// Renderer A's first bar, pure: "PRINTED BIG BANG · BULLET TIME · 10⁻⁷ m" (the part 'cosmos', bar 1; build sheet
// notes/bcos/sheet.md §4.1, design notes/cosmos3/final.md §4 bar 15, prototype cosmos3/w/j3.js). Everything is a function of the
// film instant (fractional through the sub-frames) and of the score's names — never a film frame — so the bar moves with the map.
//
// The world (W = his card's width = 1 unit): a 3D blast centred on O, his card (•ω•) 1 × 0.42 at O facing +z, the ream of his copies
// behind it (0.002 W a sheet). The explosion clock τ runs 1× through the white, decelerates into the freeze on 1.1e (0.03×), holds, and the
// slice on 1.4 ramps it 0.03 → 4× in 3 f; every debris element is a pure function of τ. The camera orbits his card in bullet time (yaw
// about the card, pitch 8°, horizontal FOV 64°) by the prototype's exact curves; the 36 fragments of `10⁻⁷ m` are solved once from the
// vantage V* (the orbit at the lock), so the orbit really lines them up. Plain Node loads this file (tests): no three / remotion / react.
import { BANG_PARTS } from '../content/castCosmos.ts';
import type { Pose } from '../engine/camera.ts';
import { hash } from '../engine/random.ts';
import { FOUNTAIN, LEVELS, LOCK, ORBIT, POWERS, REAM, REAM_PASTES, SHELL, SLICE, SPARK, SWEEP, TIME, BANG } from '../score/cosmos.ts';

// ——— The prototype's curves (cosmos3/w/j1.js), exact ——————————————————————————————————————————————————————————————————————————————

export type V3 = readonly [number, number, number];
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
/** Cosine ease in-out over [0, 1] (j1 sF). */
export const sF = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
/** Cubic ease-out (j1 cO). */
export const cO = (t: number): number => 1 - (1 - clamp01(t)) ** 3;
/** Cubic ease-in (j1 cI). */
export const cI = (t: number): number => clamp01(t) ** 3;
/**
 * Launch (j1 L): leaves from rest on t = 0 (L'(0) = 0.5625 − 0.496 · 1.134 = 0), 75 % of the move in 3 f, < 3 % rebound, settled by
 * ≈ 12 f. 0 before. Its biggest step lands 2 frames after t = 0: a drum-keyed move uses LK.
 */
export const L = (t: number): number => (t <= 0 ? 0 : 1 - Math.exp(-0.5625 * t) * (Math.cos(0.496 * t) + 1.134 * Math.sin(0.496 * t)));
/** LK's pre-roll into L (frames) and how far before its drum frame it leaves (the drum frame's first sub-frame: shutter 0.5 opens 0.25 f early). */
export const LK_PREROLL = 1;
export const LK_LEAD = 0.25;
const L_PRE = L(LK_PREROLL);
/**
 * The kicked launch, for every move keyed on a drum: L pre-rolled by a frame and renormalised, leaving at speed (≈ 0.37 of the move a
 * frame) on the drum frame's first sub-frame (t = −LK_LEAD), so the drum frame shows it starting and its biggest step lands on the frame
 * after (the house's +1), never two frames late; 95 % in 3 f, ≤ 3.5 % rebound, settled by ≈ 11 f. 0 before.
 */
export const LK = (t: number): number => (t <= -LK_LEAD ? 0 : (L(t + LK_LEAD + LK_PREROLL) - L_PRE) / (1 - L_PRE));
/** Impact (j1 Im): accelerates into t = n (exactly 1 there), then a 2 % rebound over 6 f. 0 before. */
export const Im = (t: number, n: number): number => (t <= 0 ? 0 : t < n ? (t / n) ** 2.4 : 1 + 0.02 * Math.sin(Math.PI * clamp01((t - n) / 6)));
/** A decaying envelope: 1 on t = 0, (1 − t/n)² to 0 at n (j1 env). */
export const env = (t: number, n: number): number => (t < 0 || t >= n ? 0 : (1 - t / n) ** 2);
/** Piecewise-linear keys [t, v] (j1 keys). */
export function keys(ks: readonly (readonly [number, number])[], t: number): number {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t < ks[i][0]) {
      const [a, va] = ks[i - 1];
      const [b, vb] = ks[i];
      return lerp(va, vb, (t - a) / (b - a));
    }
  }
  return ks[ks.length - 1][1];
}
const D2R = Math.PI / 180;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// ——— The world ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** His card: 1 W wide, 0.42 W tall, at O facing +z (j3 CH = 0.21 is its half height). */
export const CARD = { w: 1, h: 0.42 } as const;
/** The ream's sheet pitch (W): 343 copies make a 0.69 W ream. */
export const REAM_PITCH = 0.002;
/** The ream's full count. */
export const REAM_MAX = 343;
/** The bang's focal length, 1080p px (j3 BF): a horizontal FOV of 64°. */
export const BANG_FOCAL = 1536;
/** Its vertical FOV (three's PerspectiveCamera.fov), degrees. */
export const BANG_FOV = (2 * Math.atan(540 / BANG_FOCAL)) / D2R;
/** The orbit's pitch (degrees, the camera above the card's plane). */
export const ORBIT_PITCH = 8;

/** Frames since the bang. */
const sinceBang = (f: number): number => f - BANG;

/**
 * The explosion clock τ at instant `f`: 1× through the white; on the white's last frame it decelerates into the freeze (slope 1 → 0.03,
 * continuous), lands on 1.1e and holds at 0.03×; the slice on 1.4 ramps it 0.03 → 4× over 3 f (smoothly) and it runs on at 4×.
 */
export function tauAt(f: number): number {
  const r = sinceBang(f);
  const freeze = TIME.freeze - BANG;
  if (r < freeze - 1) return Math.max(0, r);
  if (r < freeze) {
    const u = r - (freeze - 1);
    return freeze - 1 + u - 0.485 * u * u;
  }
  const held = freeze - 0.485;
  if (f < TIME.restart) return held + 0.03 * (r - freeze);
  const t0 = held + 0.03 * (TIME.restart - TIME.freeze);
  const t = f - TIME.restart;
  const u = Math.min(1, t / 3);
  const ramp = t < 3 ? 3 * (u ** 3 - u ** 4 / 2) : 1.5 + (t - 3);
  return t0 + 0.03 * t + 3.97 * ramp;
}
/** How far the blast has flown at clock τ (j3 gx): a fast start easing out, then a slow drift. */
export const expansion = (t: number): number => 0.9 * (1 - Math.exp(-t / 2)) + 0.015 * t;

/**
 * The way each misregistered copy lands (unit, in his card's plane: down-left of him). Down-left, so the stack peeks out on the side the
 * 1.1e–1.2 camera sees (it starts left of him), and recedes from the orbit's later vantages (V*, edge-on) instead of swinging at the lens.
 */
export const REAM_DIR: readonly [number, number] = (() => {
  const l = Math.hypot(0.88, 0.48);
  return [-0.88 / l, -0.48 / l];
})();
/**
 * Ctrl+V made literal (design §4 bar 15, 1.1e: "six copies paste in behind his card, each misregistered; from this slightly off-axis view
 * the stack reads as a fat rainbow drop shadow"): sheet `i`'s offset in his card's plane (W; continuous in i), down-left of him. The first
 * six copies stand 0.026 W apart (a stripe each), the next 42 pack to 0.0024 W, the last 294 to 0.0009 W: from the 1.1e–1.2 vantage the
 * stack peeks out of his card at every paste, and the full ream leans like a slid deck of cards.
 */
export function reamOffset(i: number): [number, number] {
  const m = reamOffsetLength(i);
  return m === 0 ? [0, 0] : [REAM_DIR[0] * m, REAM_DIR[1] * m];
}
/** The offset's steps: up to sheet `upto`, each sheet lands `pitch` W further along REAM_DIR (the GPU box reads the same table). */
export const REAM_STEPS: readonly { upto: number; pitch: number }[] = [
  { upto: 6, pitch: 0.026 },
  { upto: 48, pitch: 0.0024 },
  { upto: Infinity, pitch: 0.0009 },
];
/** How far sheet `i` lands from his card along REAM_DIR (W; continuous, concave). */
export function reamOffsetLength(i: number): number {
  let k = Math.max(0, i);
  let m = 0;
  let from = 0;
  for (const s of REAM_STEPS) {
    const n = Math.min(k, s.upto - from);
    m += n * s.pitch;
    k -= n;
    from = s.upto;
    if (k <= 0) break;
  }
  return m;
}

/** His copies behind his card (a count, continuous: each Ctrl+V extrudes the ream with a kicked launch on its 16th): 1 → 7 → 49 → 343. */
export function reamCount(f: number): number {
  if (f < TIME.freeze) return 1;
  const [a, b, c] = REAM_PASTES;
  return 1 + 6 * Math.min(1, LK(f - a.at)) + 42 * Math.min(1, LK(f - b.at)) + 294 * Math.min(1, LK(f - c.at));
}

/**
 * The bullet-time drift under the orbit's steps (°/f): 0.3 through the freeze to 1.2, then this from step 1 to the lock, so the camera
 * never stops nor turns back while a step's ≤ 3.5 % rebound settles (L's steepest return is 1.16 % of the step a frame), then 0.04 (the
 * lock breathes ≤ 3 px) until step 2b turns his card edge-on.
 */
export const YAW_DRIFT = 0.9;
/** Step 1's size (°): from −6.6° on 1.2 to 48° by 1.2& with the drift under it. */
const YAW_STEP1 = 48 - (-6.6 + YAW_DRIFT * (SWEEP - SHELL));
const yawDrift = (f: number): number =>
  0.3 * (Math.min(f, SHELL) - TIME.freeze) + YAW_DRIFT * Math.min(Math.max(f - SHELL, 0), LOCK.from - SHELL) + 0.04 * Math.min(Math.max(0, f - LOCK.from), REAM - LOCK.from);
/** The impact into V*'s size (°): whatever is left to 70° on the lock after the drift and step 1. */
const YAW_LAND = 70 - (-12 + yawDrift(LOCK.from) + YAW_STEP1 * LK(LOCK.from - SHELL));

/**
 * The orbit's yaw (degrees) at instant `f` (j3 yawOf with the score's names), the drift plus the steps: step 1 (LK on 1.2), the impact
 * into V* = 70° on 1.3 (from 1.2a), the lock's breath, step 2b (LK on 1.3&, to edge-on), step 3 (LK on 1.4, to the back of the ream).
 */
export function yawAt(f: number): number {
  if (f < TIME.freeze) return -12;
  const landing = ORBIT[3].at;
  const land = YAW_LAND * Math.min(1, Im(f - landing, LOCK.from - landing));
  return -12 + yawDrift(f) + YAW_STEP1 * LK(f - SHELL) + land + 19.52 * LK(f - REAM) + 90 * LK(f - SLICE.at);
}
/** The orbit's radius (W from O): 1.1 through the white, pulled out to 1.75 as the freeze lands (an ease-out over 13 f, so bullet time has settled before step 1's kick). */
export const orbitRadius = (f: number): number => (f < TIME.freeze ? 1.1 : lerp(1.1, 1.75, cO((f - TIME.freeze) / 13)));

/** The bullet-time camera at instant `f` (j3 bcam): on the orbit, aimed a little down past O, its centre shifted to the ream's middle when side-on. */
export function bangPose(f: number, yawDeg = yawAt(f)): Pose {
  const y = yawDeg * D2R;
  const p = ORBIT_PITCH * D2R;
  const depth = REAM_PITCH * (reamCount(f) - 1);
  const tz = (-depth / 2) * Math.abs(Math.sin(y));
  const rc = orbitRadius(f);
  const eye: V3 = [rc * Math.sin(y) * Math.cos(p), rc * Math.sin(p), tz + rc * Math.cos(y) * Math.cos(p)];
  const fwd = norm([-Math.sin(y), -Math.sin(p) * 1.2, -Math.cos(y)]);
  return { position: eye, target: add(eye, fwd), up: [0, 1, 0], fov: BANG_FOV };
}

/** A pose's basis: forward, right, up (unit). */
export function basis(pose: Pose): { f: V3; r: V3; u: V3 } {
  const f = norm([pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]]);
  const r = norm(cross(f, pose.up));
  return { f, r, u: cross(r, f) };
}

/** Where world point `p` lands on screen from `pose` (1080p px, origin at the centre, y up; `focal` px) and its depth; null behind. */
export function project(pose: Pose, p: V3, focal: number): { x: number; y: number; z: number } | null {
  const { f, r, u } = basis(pose);
  const d: V3 = [p[0] - pose.position[0], p[1] - pose.position[1], p[2] - pose.position[2]];
  const z = dot(d, f);
  if (z < 1e-4) return null;
  return { x: (dot(d, r) * focal) / z, y: (dot(d, u) * focal) / z, z };
}

// ——— The frozen blast: face-part cards, splats, torn strips, ✦, halftone domes, speed ribbons (no ω: ω is his) ———————————————————

export type DebrisKind = 'part' | 'splat' | 'strip' | 'star';
export type Debris = {
  readonly kind: DebrisKind;
  /** Unit direction from O and the radius it flies to at expansion 1 (W). */
  readonly u: V3;
  readonly r: number;
  /** Width (W). */
  readonly size: number;
  /** BANG_PARTS index (parts), splat or strip variant (splats, strips). */
  readonly variant: number;
  /** 0 pink, 1 blue, 2 paper. */
  readonly ink: 0 | 1 | 2;
  /** A knocked-out ink card (the glyph in paper on a card of ink) rather than a bare glyph. */
  readonly card: boolean;
  /** Its frozen orientation: the face's normal and in-plane angle, its tumble axis and rate (radians per unit of τ). */
  readonly normal: V3;
  readonly roll: number;
  readonly axis: V3;
  readonly spin: number;
  /** Crosses the lens on purpose (exempt from the clear cone). */
  readonly fg: boolean;
};
/** The design's counts (final.md §4 bar 15). */
export const DEBRIS_COUNTS = { part: 4000, splat: 600, strip: 200, star: 300 } as const;
const unitOf = (i: number, s: number): V3 => {
  const z = 2 * hash(i, s, 7) - 1;
  const a = 2 * Math.PI * hash(i, s, 8);
  const k = Math.sqrt(1 - z * z);
  return [k * Math.cos(a), z, k * Math.sin(a)];
};
let debrisCache: Debris[] | null = null;
/** The blast's pieces (deterministic; built once). */
export function bangDebris(): readonly Debris[] {
  const partCount = BANG_PARTS.length;
  if (debrisCache) return debrisCache;
  const out: Debris[] = [];
  const kinds: [DebrisKind, number][] = [['part', DEBRIS_COUNTS.part], ['splat', DEBRIS_COUNTS.splat], ['strip', DEBRIS_COUNTS.strip], ['star', DEBRIS_COUNTS.star]];
  let i = 0;
  for (const [kind, n] of kinds) {
    for (let k = 0; k < n; k++, i++) {
      const h = hash(i, 1);
      const size = kind === 'part' ? 0.016 + 0.14 * h ** 2.4 : kind === 'splat' ? 0.03 + 0.08 * h : kind === 'strip' ? 0.08 + 0.07 * h : 0.03 + 0.05 * h;
      const r = kind === 'star' ? 0.4 + 2.6 * hash(i, 2) : 0.28 + 2.8 * hash(i, 2) ** 1.3;
      out.push({
        kind,
        u: unitOf(i, 3),
        r,
        size,
        variant: kind === 'part' ? Math.floor(hash(i, 3) * partCount) : Math.floor(hash(i, 4) * 4),
        ink: Math.floor(hash(i, 5) * 3) as 0 | 1 | 2,
        card: kind === 'part' && i % 3 === 0,
        normal: unitOf(i, 9),
        roll: 2 * Math.PI * hash(i, 6),
        axis: unitOf(i, 11),
        spin: (hash(i, 12) - 0.5) * 2.4,
        fg: hash(i, 13) < 0.05,
      });
    }
  }
  debrisCache = out;
  return out;
}

/** A piece's centre at clock τ (W). */
export const debrisCentre = (d: Debris, t: number): V3 => scale(d.u, d.r * expansion(t));

/** Rodrigues: `v` turned by `a` radians about unit `k`. */
export function rotate(v: V3, k: V3, a: number): V3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}

/** A piece's frame at clock τ: its in-plane right and up (unit), tumbling about its axis as τ runs (frozen while τ holds). */
export function debrisFrame(d: Debris, t: number): { right: V3; up: V3 } {
  const n = d.normal;
  const helper: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const r0 = norm(cross(helper, n));
  const u0 = cross(n, r0);
  const c = Math.cos(d.roll);
  const s = Math.sin(d.roll);
  const right: V3 = [r0[0] * c + u0[0] * s, r0[1] * c + u0[1] * s, r0[2] * c + u0[2] * s];
  const up: V3 = [u0[0] * c - r0[0] * s, u0[1] * c - r0[1] * s, u0[2] * c - r0[2] * s];
  const a = d.spin * t;
  return { right: rotate(right, d.axis, a), up: rotate(up, d.axis, a) };
}

/**
 * The clear cone (design §4 bar 15): how much of a piece shows from `eye` (0 hidden … 1 whole). Nothing within 0.25 W of the line from
 * the camera to his card (a quadratic fade), nothing within 0.08 W of the camera; the FG pieces cross the lens on purpose.
 */
export function clearCone(p: V3, eye: V3, fg: boolean): number {
  const toEye = Math.hypot(p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]);
  const nearCam = toEye < 0.08 ? 0 : toEye < 0.16 ? (toEye - 0.08) / 0.08 : 1;
  if (fg) return nearCam;
  const ol = Math.hypot(eye[0], eye[1], eye[2]);
  const o: V3 = [-eye[0] / ol, -eye[1] / ol, -eye[2] / ol];
  const d: V3 = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
  const t = dot(d, o);
  if (t <= 0 || t >= ol) return nearCam;
  const q = Math.hypot(d[0] - o[0] * t, d[1] - o[1] * t, d[2] - o[2] * t);
  return q < 0.25 ? nearCam * (q / 0.25) ** 2 : nearCam;
}

/**
 * His card's shield on screen from `pose`: the box round the ream's eight corners (1080p px, y up) and its nearest depth. Pieces in front
 * of it fade as they enter it (the clear cone, widened to his card so his face always reads: design §11.7 "never mush").
 */
export function cardShield(pose: Pose, depth: number): { x0: number; x1: number; y0: number; y1: number; near: number } {
  const back = reamOffset(depth / REAM_PITCH);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let near = Infinity;
  for (const x of [-CARD.w / 2, CARD.w / 2]) {
    for (const y of [-CARD.h / 2, CARD.h / 2]) {
      for (const z of [0, -depth]) {
        const p = project(pose, z === 0 ? [x, y, z] : [x + back[0], y + back[1], z], BANG_FOCAL);
        if (!p) continue;
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
        near = Math.min(near, p.z);
      }
    }
  }
  return { x0, x1, y0, y1, near };
}
/** How much of a piece at screen (x, y) and depth z shows over the shield: hidden inside it, whole 90 px outside it (only in front of the card). */
export function shieldFade(x: number, y: number, z: number, box: { x0: number; x1: number; y0: number; y1: number; near: number }): number {
  if (z >= box.near) return 1;
  const d = Math.max(box.x0 - x, x - box.x1, box.y0 - y, y - box.y1);
  return d <= -10 ? 0 : d >= 90 ? 1 : ((d + 10) / 100) ** 2;
}

let blockerCache: Set<number> | null = null;
/** The pieces that would hide a fragment of `10⁻⁷ m` from V* (in front of the label's box): kept out of the blast, so the lock reads. */
export function labelBlockers(): ReadonlySet<number> {
  if (blockerCache) return blockerCache;
  const V = bangPose(LOCK.from, 70);
  const out = new Set<number>();
  const debris = bangDebris();
  const freezeT = tauAt(TIME.freeze);
  debris.forEach((d, i) => {
    if (d.fg) return;
    const p = project(V, debrisCentre(d, freezeT), BANG_FOCAL);
    if (!p) return;
    const r = (d.size * BANG_FOCAL) / p.z / 2;
    const inside = p.x > LOCK_LABEL.left - r - 20 && p.x < LOCK_LABEL.left + LOCK_LABEL.width + r + 20 && p.y < LOCK_LABEL.top + r + 20 && p.y > LOCK_LABEL.top - LOCK_LABEL.height - r - 20;
    if (inside && p.z < 1.75) out.add(i);
  });
  blockerCache = out;
  return out;
}

/** The three halftone shock domes: radius at expansion 1 (W), dot count, ink (0 pink, 1 blue, 2 cream). ≈ 9,000 dots. */
export const DOMES: readonly { r: number; n: number; ink: 0 | 1 | 2 }[] = [
  { r: 0.8, n: 1500, ink: 0 },
  { r: 1.6, n: 3000, ink: 1 },
  { r: 2.6, n: 4500, ink: 2 },
];
/** A dome's dot `i` on its Fibonacci lattice (unit direction) and its size (W) — a halftone gradient across the shell. */
export function domeDot(dome: number, i: number): { u: V3; size: number } {
  const n = DOMES[dome].n;
  const y = 1 - (2 * (i + 0.5)) / n;
  const k = Math.sqrt(1 - y * y);
  const a = i * 2.399963229728653 + dome * 0.7;
  const u: V3 = [k * Math.cos(a), y, k * Math.sin(a)];
  const tone = 0.5 + 0.5 * Math.sin(3.1 * u[0] + 1.7 * dome) * Math.cos(2.3 * u[1] - 0.6 * dome);
  return { u, size: (0.006 + 0.016 * tone) * (0.8 + 0.2 * DOMES[dome].r) };
}
/** A dome's radius at clock τ (they balloon a little ahead of the debris). */
export const domeRadius = (dome: number, t: number): number => DOMES[dome].r * expansion(t) * 1.1;

/** The speed ribbons (800): tapered halftone trails from a big piece back toward O, frozen with the blast (indices into bangDebris). */
export function ribbonPieces(debris: readonly Debris[]): number[] {
  return debris
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.kind === 'part' && d.size > 0.075)
    .sort((a, b) => b.d.size - a.d.size || a.i - b.i)
    .slice(0, 800)
    .map(({ i }) => i);
}

// ——— 1.1: the printed white (the film's one white; only HE is printed; the halftone prints back in from the corners) ———————————————

/**
 * v07 WP5 (FW5 at the freeze, 1.1e): v06's white face pushed in 1150 → 1400 px and the card he becomes on 1.1e printed him at ≈ 1090
 * (measured on the v06 frames: his dots 700 → 550 px apart), so the hand-off jumped back 22 % as the fireball (r 780) vanished. Now the
 * bang still punches him at us (+≈ 7 % by +2) but he lands on his card's own size on the freeze, already shrinking with the dolly back
 * into bullet time, and the fireball condenses toward his card (r 620 by +5) instead of vanishing at full size.
 */
export const FACE_FREEZE = 1090;
export const FIREBALL_FREEZE = 620;
/** His face's width (px, the hero glyph's advance) `t` frames into the white: 1150 on the bang, a punch (+100 · sin) easing onto FACE_FREEZE by 1.1e. */
export const whiteFace = (t: number): number => lerp(1150, FACE_FREEZE, sF(t / 6)) + 100 * Math.sin(Math.PI * clamp01(t / 6));

/**
 * The white at instant `f` (screen px): `bright` the fireball, the radius of the bare paper (the whole frame on 1.1; from +1 the light
 * falls off from the edges inward and contracts to the fireball, r 1250 (the corners printing back) → FIREBALL_FREEZE (620) by +5, gone on the freeze), `core` the radius the paper is
 * solid to (inside it the halftone has not printed back yet; between it and `bright` the dots print back in from the corners, the dot gain
 * of a fading light), his face's width and its Y/P/B ghosts' spread (40–50 px → 0 by 1.1e, when the plates snap into register), and the
 * guilloche shock ring (r 300 → 1250, leaving the frame by +3), taken at the output frame so each frame prints it crisp. Null after the
 * white.
 */
export function whiteAt(f: number): { bright: number; core: number; face: number; faceAlpha: number; ghost: number; ring: number | null; ringAlpha: number } | null {
  const t = f - BANG;
  if (t < 0 || t >= 8) return null;
  const bright = t < 1 ? 2600 : f >= TIME.freeze ? 0 : keys([[1, 1250], [5, FIREBALL_FREEZE]], t);
  const core = t < 1 ? 2600 : bright * keys([[1, 0.82], [5, 0.5]], t);
  const face = f < TIME.freeze ? whiteFace(t) : 0;
  const k = Math.floor(f + 0.5) - BANG;
  return {
    bright,
    core,
    face,
    faceAlpha: f < TIME.freeze ? 1 : 0,
    ghost: lerp(45, 0, clamp01(t / 6)),
    ring: k < 3 ? lerp(300, 1250, (k / 3) ** 0.75) : null,
    ringAlpha: clamp01(1 - k / 3.5),
  };
}

// ——— 1.2: the guilloche shock shell (12 f) and the wave; 1.2&: the light sweep —————————————————————————————————————————————————

/** The shell's radius (W, from O) at output frame `f` (taken at the frame: crisp, and already out on the clap's own frame), or −1 outside its 16 f (j3: 3.4 W at the end of 12 f, cubic out). */
export const shellRadius = (f: number): number => {
  const k = Math.floor(f + 0.5) - SHELL;
  return k >= 0 && k < 16 ? 3.4 * cO((k + 1) / 13) : -1;
};
/** The shell's opacity (fades over its last 8 f). */
export const shellAlpha = (f: number): number => {
  const k = Math.floor(f + 0.5) - SHELL;
  return k < 0 || k >= 16 ? 0 : 1 - clamp01((k - 8) / 8);
};
/** He waves ヽ(•ω•)ノ for 8 f from the shell's clap (and the front sheet shows it). */
export const waving = (f: number): boolean => Math.floor(f + 0.5) >= SHELL && Math.floor(f + 0.5) < SHELL + 8;
/** The light sweep's screen x (px, from the left edge −960) for its 6 f from 1.2&, or null. */
export const sweepX = (f: number): number | null => (f >= SWEEP && f < SWEEP + 6 ? lerp(-1160, 1160, (f - SWEEP) / 6) : null);
/** The ream breathes on the sweep (gaps ×1.1 for 4 f). */
export const reamBreath = (f: number): number => (f >= SWEEP && f < SWEEP + 4 ? 1 + 0.1 * Math.sin((Math.PI * (f - SWEEP)) / 4) : 1);

// ——— 1.3: THE ANAMORPHIC LOCK — the 36 fragments of `10⁻⁷ m`, solved once from V* ——————————————————————————————————————————————————

/** The label as laid out on screen at the lock (1080p px, y up): its box, the type's size and baseline (j3 lblTex: Inter Tight Black 413 px, cap 300). */
export const LOCK_LABEL = { left: -700, top: 510, width: 1440, height: 460, size: 413, baseline: 380, rows: 4, cols: 9 } as const;
/** Where the fragments regather to (the flat label, top-left, cap 200: j3 frags → j6 plabel(53, 353, 275)). */
export const FLAT_LABEL = { left: -920, top: 440, k: 200 / 300 } as const;

export type Fragment = {
  /** The cell in the label texture (px from the label box's top-left, y down) and on screen at V* (centre, px, y up). */
  readonly sx: number;
  readonly sy: number;
  readonly w: number;
  readonly h: number;
  readonly cx: number;
  readonly cy: number;
  /** Its depth from V* (W) and its 3D centre and half-extents (it faces V* square on). */
  readonly lam: number;
  readonly centre: V3;
  readonly right: V3;
  readonly up: V3;
  /** The flat label's cell (screen px, centre, y up; half width and height). */
  readonly flat: { x: number; y: number; hw: number; hh: number };
};

let fragmentCache: Fragment[] | null = null;
/** The 36 cells of the label (4 rows × 9 jittered columns), each hung on its ray from V* at its own depth (0.35–1.7 W), scaled by it. */
export function labelFragments(): readonly Fragment[] {
  if (fragmentCache) return fragmentCache;
  const V = bangPose(LOCK.from, 70);
  const { f, r, u } = basis(V);
  const out: Fragment[] = [];
  const rowH = LOCK_LABEL.height / LOCK_LABEL.rows;
  const colW = 160;
  for (let row = 0; row < LOCK_LABEL.rows; row++) {
    let x0 = 0;
    for (let k = 0; k < LOCK_LABEL.cols; k++) {
      const x1 = k === LOCK_LABEL.cols - 1 ? LOCK_LABEL.width : (k + 1) * colW + (hash(row, k) - 0.5) * 70;
      const w = x1 - x0;
      const sx = x0;
      const sy = row * rowH;
      const cx = LOCK_LABEL.left + sx + w / 2;
      const cy = LOCK_LABEL.top - sy - rowH / 2;
      const lam = 0.35 + 1.35 * hash(row, k, 5);
      const dx = cx / BANG_FOCAL;
      const dy = cy / BANG_FOCAL;
      const centre: V3 = [
        V.position[0] + lam * (f[0] + dx * r[0] + dy * u[0]),
        V.position[1] + lam * (f[1] + dx * r[1] + dy * u[1]),
        V.position[2] + lam * (f[2] + dx * r[2] + dy * u[2]),
      ];
      const hw = ((w / 2) * lam) / BANG_FOCAL;
      const hh = ((rowH / 2) * lam) / BANG_FOCAL;
      const fx = FLAT_LABEL.left + (sx + w / 2) * FLAT_LABEL.k;
      const fy = FLAT_LABEL.top - (sy + rowH / 2) * FLAT_LABEL.k;
      out.push({ sx, sy, w, h: rowH, cx, cy, lam, centre, right: scale(r, hw), up: scale(u, hh), flat: { x: fx, y: fy, hw: (w / 2) * FLAT_LABEL.k, hh: (rowH / 2) * FLAT_LABEL.k } });
      x0 = x1;
    }
  }
  fragmentCache = out;
  return out;
}
/** The fragments show from the freeze (hung through the blast, reading as debris) until they have regathered into the flat label. */
export const fragmentsShown = (f: number): boolean => f >= TIME.freeze && f < POWERS[0];
/** How far the fragments have regathered into the flat label (L from the slice; 0 before). */
export const regather = (f: number): number => Math.min(1, LK(f - SLICE.at));
/** The lock's kick pulse on the label (emissive ×1.35 for 2 f, back over 10 f) and the sweep's flash across the fragments. */
export function fragmentGlow(f: number): number {
  const k = f - LOCK.from;
  const pulse = k >= 0 && k < 12 ? (k < 2 ? 1 : env(k - 2, 10)) : 0;
  const sweep = f >= SWEEP && f < SWEEP + 6 ? 1 - Math.abs(f - SWEEP - 3) / 3 : 0;
  return 0.35 * pulse + 0.5 * sweep;
}
/** The caption under his card flies in on the lock (L) and holds until the slice: 0 hidden … 1 landed. */
export const captionIn = (f: number): number => (f >= LOCK.from - LK_LEAD && f < SLICE.at ? Math.min(1, LK(f - LOCK.from)) : 0);

// ——— 1.4: THE SLICE → time snaps back → THE CARD FOUNTAIN ————————————————————————————————————————————————————————————————————

/** The slice line: through (−80, 0) at −35° (screen px, y up), its unit direction and the halves' slide along it. */
export const SLICE_LINE = { x: -80, y: 0, angle: (-35 * Math.PI) / 180 } as const;
/**
 * The slice at instant `f`: the halves' offset along the line (px: L to 28, held to 1.4e, eased back by 1.4&), the line's reach (it wipes
 * across in 2 f) and its glow (out over 5 f), the sparks' spread (px). Null outside [1.4, 1.4&).
 */
export function sliceAt(f: number): { offset: number; reach: number; glow: number; spread: number } | null {
  if (f < SLICE.at || f >= SLICE.back) return null;
  const t = f - SLICE.at;
  const held = SLICE.held - SLICE.at;
  const back = SLICE.back - SLICE.held;
  const offset = 28 * (f < SLICE.held ? Math.min(1, LK(t)) : 1 - sF((t - held) / back));
  return { offset, reach: Math.min(1, (t + 1) / 2), glow: 1 - clamp01((t - 2) / 3), spread: 20 + 40 * t };
}

/** The fountain: sheet i of the ream (1 … 342; the front sheet, him, stays) leaves on a fill snare, a quarter of the deck each, from the back. */
export function fountainRelease(i: number): number {
  const j = REAM_MAX - 1 - i;
  return SLICE.at + 6 * Math.floor(j / 86) - LK_LEAD + (j % 86) / 43;
}
/** Sheets still in the ream behind him at instant `f` (the box thins as the deck fans out). */
export function reamLeft(f: number): number {
  const n = Math.round(reamCount(f));
  if (f < SLICE.at) return n;
  let left = n;
  for (let i = 1; i < n; i++) if (fountainRelease(i) <= f) left--;
  return left;
}
/** How far (frames along its path) each pasted copy trails the sheet it copies: the arm of a sheet and its copies. */
export const COPY_LAG = 1.2;
/**
 * A flung sheet's centre and roll (W, radians) `t` frames after it left: from its misregistered place in the stack, a golden-angle spiral
 * spraying out (past 1 W within 12 f) and away from the camera that has orbited round behind him, through his card into the blast (j3
 * fountain's drift, opened out): seen from behind the deck, a vortex of cards; each turns slowly enough that its face reads (≤ 0.1 rad a
 * frame); every sheet and its copies make one arm.
 */
export function fountainCard(i: number, t: number): { centre: V3; roll: number } {
  const tt = Math.max(0, t);
  const a = i * 2.39996 + 0.07 * tt;
  const rr = 0.12 * Math.min(1, tt / 2) + 0.14 * tt ** 0.85;
  const o = reamOffset(i);
  return { centre: [o[0] + rr * Math.cos(a), o[1] + rr * Math.sin(a) * 0.8, -REAM_PITCH * i + 0.035 * tt], roll: a + 0.02 * tt };
}
/**
 * The copies each flung sheet pastes of itself, one generation a fill snare (2.4k, 17k, 118k): copy c (1 … 18) appears on its fill's
 * frame, whole (from the frame's first sub-frame: the paste is the snare's hit), each landing as a 2-frame ghost.
 */
export function copyAppears(i: number, c: number): number {
  const gen = Math.ceil(c / 6);
  return FOUNTAIN[gen].at - LK_LEAD + 0.01 * hash(i, c, 31);
}

// ——— 1.4& → 2.1: POWERS OF TEN — the crash zoom-out, the Eames squares, the spark ————————————————————————————————————————————

/**
 * The bang's scale on screen through the crash zoom-out: 1 on 1.4& itself, then shrinking hard (an impact into 2.1: 0.65 a frame later,
 * ≈ 0.03 by the spark on 1.4a, ≈ 0.003 by the landing; j3 crashOut, its first frame no longer skipped).
 */
export function crashZoom(f: number): number {
  if (f < POWERS[0]) return 1;
  const t = f - POWERS[0];
  return Math.exp(-4.4 * clamp01(t / 7) ** 1.2 - 1.4 * clamp01((t - 6) / 6) ** 1.5);
}
/**
 * The cream Eames squares rushing in from the frame's edges, one per 32nd (each starts just inside the frame, half-height 520, and shrinks
 * past the centre with an ease-out over 9 f): half-height (px) and opacity of each live one at output frame `f`.
 */
export function eamesRush(f: number): { half: number; alpha: number }[] {
  const out: { half: number; alpha: number }[] = [];
  for (const s of POWERS) {
    const u = (f - s) / 9;
    if (u < 0 || u > 1) continue;
    out.push({ half: lerp(520, 8, 1 - (1 - u) ** 2), alpha: 1 - u * 0.5 });
  }
  return out;
}
/** The spark's glow (0 … 1): it ignites whole on 1.4a's frame (the fill snare) as the explosion shrinks to a 30 px amber point. */
export const sparkGlow = (f: number): number => (Math.floor(f + 0.5) < SPARK ? 0 : 1);
/** The spark's ignition burst on 1.4a (1 on its frame, gone over 6 f). */
export const sparkBurst = (f: number): number => env(Math.floor(f + 0.5) - SPARK, 6);
/** The bar ends where Earth's landing begins. */
export const BANG_END = LEVELS.earth;
