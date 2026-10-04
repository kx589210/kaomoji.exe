// Renderer B, the arm and the galaxy (cosmos 3.4& → 5.1: the fling's arm, then cosmos 4 "WARP ARM → NEON SPIRAL · 10²¹ m"; build sheet
// notes/bcos/sheet.md §4.4 and §6.4, design notes/cosmos3/final.md §4 bar 18, prototype cosmos3/w/j5.js), the pure half.
//
// One world, one camera, in the arm's units ("tunnel space": three.js's convention, y up, the warp flies down −z). The arm round the
// camera is a cylinder of host stars streaming past (the prototype's tunnel: r 0.25–7, 60 long, repeating as the camera travels T); the
// dust wall he punches open lies across it; and the whole spiral galaxy is placed in the same space, 1,250 arm units across a radius,
// with his star — the tunnel — on its arm 0 and the flight running along that arm. The snap zoom-out is then a real move of the one
// camera, 2,000 arm units out and up in 4 frames; the tilt through the disc another. Every time is a film instant (fractional during the
// sub-frames), from the score's names. Plain Node loads this file (tests): no three / remotion / react.
import { CROWDS, GALAXY_STARS, HERO_FACES } from '../content/castCosmos.ts';
import { hash } from '../engine/random.ts';
import { SWAP_LEAD } from '../engine/temporal.ts';
import { DUST, FLING, GLANCES, HOOK, HOOK_TOPS, IGNITION, KICKS, LIGHT_BURSTS, QUASAR, REVEAL, TILT, WARP, cs } from '../score/cosmos.ts';
import { type Cam, type V3, lookAlong, project as projectCam } from './cosmosSolar.ts';
import { Im, cO, clamp01, env, lastOf, lerp, sF } from './cosmosSolarKit.ts';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
/** `v` turned by `a` radians about the unit axis `k` (Rodrigues). */
const rot = (v: V3, k: V3, a: number): V3 => add(add(mul(v, Math.cos(a)), mul(cross(k, v), Math.sin(a))), mul(k, dot(k, v) * (1 - Math.cos(a))));
/** Spherical interpolation of unit vectors. */
function slerp(a: V3, b: V3, t: number): V3 {
  const c = Math.min(1, Math.max(-1, dot(a, b)));
  const o = Math.acos(c);
  if (o < 1e-5) return norm(add(mul(a, 1 - t), mul(b, t)));
  const s = Math.sin(o);
  return norm(add(mul(a, Math.sin((1 - t) * o) / s), mul(b, Math.sin(t * o) / s)));
}

// ——— The arm (the tunnel) ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** The tunnel: stars r 0.25–7.05 round the axis, repeating every 60 along it; he flies 3.2 ahead (prototype j5 NS/ZL/WF/hz). */
export const TUNNEL = { count: 6000, length: 60, he: 3.2, focal: 900 } as const;
/** A tunnel star: radius and angle round the axis, place along it, size (world), ink (0 cyan, 1 pink, 2 cream), face, hash. */
export type TunnelStar = { r: number; a: number; z: number; s: number; ink: 0 | 1 | 2; face: number; h: number };
/** The arm's hosts (the named stars and the crowd): their host and infected faces, by `face`. */
export const ARM_FACES: readonly { host: string; infected: string }[] = [
  ...GALAXY_STARS.map((g) => ({ host: g.host, infected: g.infected ?? HERO_FACES.face })),
  ...CROWDS.galaxy.map((c) => ({ host: c.host, infected: c.infected })),
];
export const TUNNEL_STARS: readonly TunnelStar[] = Array.from({ length: TUNNEL.count }, (_, i) => ({
  r: 0.25 + 6.8 * hash(i, 71) ** 1.6,
  a: TAU * hash(i, 72),
  z: TUNNEL.length * hash(i, 73),
  s: 0.12 + 0.1 * hash(i, 76),
  ink: Math.floor(hash(i, 75) * 3) as 0 | 1 | 2,
  // The named stars (GALAXY_STARS) a little more often than any one of the crowd.
  face: hash(i, 74) < 0.35 ? Math.floor(hash(i, 77) * GALAXY_STARS.length) : GALAXY_STARS.length + Math.floor(hash(i, 78) * CROWDS.galaxy.length),
  h: hash(i, 79),
}));

/** The glances: the warp drops to 15 % for 6 f and the faces can be read. */
export const inGlance = (f: number): boolean => GLANCES.some((g) => f >= g.from && f < g.to);
/**
 * The camera's speed down the arm at instant `f` (arm units a frame; prototype j5 vW): the fling backwards (−1.6, stopping by 4.1 − 1);
 * from 4.1 the chase, full in 3 f (a launch), the base ramping ×1.5 over the first 1½ beats; each kick surges ×2 over 10 f; the punch
 * ×2.5 over 14 f; the glances at 15 %.
 */
export function speed(f: number): number {
  if (f < FLING.from) return 0;
  if (f < WARP) return -1.6 * (1 - cO((f - FLING.from) / 11));
  // The kicks' and the punch's surges are drum swaps: taken SWAP_LEAD early, so the streaks stretch whole on the drum's frame.
  const k = lastOf(KICKS, f + SWAP_LEAD);
  const launch = f < WARP + 3 ? cO((f - WARP) / 3) : 1;
  return 0.55 * launch * lerp(1, 1.5, clamp01((f - WARP) / 36)) * (1 + env(f - k + SWAP_LEAD, 10)) * (1 + 2 * env(f - DUST.punch + SWAP_LEAD, 14)) * (inGlance(f) ? 0.15 : 1);
}
/** The travel table: T at every 1/16 frame from the fling (the integral of speed), so any sub-frame instant reads the same T. */
const STEP = 1 / 16;
const T_FROM = FLING.from;
const T_TABLE: Float64Array = (() => {
  const n = Math.ceil((REVEAL - T_FROM) / STEP) + 2;
  const t = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    const a = T_FROM + (i - 1) * STEP;
    t[i] = t[i - 1] + (STEP * (speed(a) + 4 * speed(a + STEP / 2) + speed(a + STEP))) / 6;
  }
  return t;
})();
/** How far the camera has travelled down the arm by instant `f` (0 at the fling; held from the snap). */
export function travel(f: number): number {
  const x = (Math.min(Math.max(f, T_FROM), REVEAL - 4) - T_FROM) / STEP;
  const i = Math.min(T_TABLE.length - 2, Math.floor(x));
  return T_TABLE[i] + (T_TABLE[i + 1] - T_TABLE[i]) * (x - i);
}
/**
 * A hit's launch for the sync: full speed from `lead` frames before the drum (no ease-in), 75 % of the move 3 f into it, settling without a
 * rebound — so the biggest step of the move lands on the drum's own frame (the launch curve L starts at zero speed: its biggest step
 * falls 1–2 frames after the drum).
 */
export const hitLaunch = (t: number, lead = 0.75): number => (t + lead <= 0 ? 0 : 1 - Math.exp(-0.462 * (t + lead)));
/** The bank into the arm's curve: 25° on the punch (a hit launch: its biggest step on the clap's frame), unwinding inside the snap's blur. */
export function bank(f: number): number {
  if (f < DUST.punch - 0.75) return 0;
  const b = 25 * D2R * hitLaunch(f - DUST.punch) / hitLaunch(REVEAL - 4 - DUST.punch);
  if (f < REVEAL - 4) return b;
  return 25 * D2R * (1 - Math.min(1, Im(f - (REVEAL - 4), 4)));
}
/** The depth behind which the stars are his (amber): just past him, until the punch; then the amber front overtakes the camera. */
export const amberDepth = (f: number): number => (f < DUST.punch ? TUNNEL.he : lerp(TUNNEL.he, TUNNEL.length, cO((f - DUST.punch) / 10)));
/** The stars are drawn as tiny star systems (rosettes of rings round a host face) while the fling throws the camera back; as streaks from 4.1. */
export const rosettes = (f: number): boolean => f < WARP;

// ——— Him, ahead of the camera ——————————————————————————————————————————————————————————————————————————————————————————————————

/** His place on screen while he leads the chase (1080p px from the centre, y up) and his em there (px). */
export const HERO = { x: 0, y: -30, em: 84 } as const;
/** How far the camera is from the vanishing point he flies at (arm units): his depth through the chase, growing through the snap. */
export function heroDistance(f: number): number {
  const c = galaxyCamera(f);
  return Math.max(TUNNEL.he, Math.hypot(c.eye[0], c.eye[1], c.eye[2] + TUNNEL.he));
}
/**
 * He bursts out of his star on 4.1 (the paste flare's anchor): already 40 % of his size on the downbeat's frame (he is born in the flare),
 * full within 3 f (a hit launch). 0 before.
 */
export const heroBurst = (f: number): number => (f < WARP - SWAP_LEAD ? 0 : Math.min(1, 0.4 + 0.6 * hitLaunch(f - WARP, 0.25) / 0.72));
/** His face: (•ω•); his look back at us on the first glance ( ・ω・)?; the wave on 4.1a; (>ω<) on the bar's top note. */
export function heroFace(f: number): string {
  const o = Math.floor(f + 0.5);
  if (o >= GLANCES[0].from && o < GLANCES[0].to) return HERO_FACES.look;
  if (o >= DUST.looms && o < DUST.punch) return HERO_FACES.wave;
  if (HOOK_TOPS.some((t) => o >= t && o < t + 12)) return HERO_FACES.top;
  return HERO_FACES.face;
}
/** His bob (px, up) on the hook's note starts. */
export function heroBob(f: number): number {
  for (const n of HOOK) {
    const t = f - n.at;
    if (t >= 0 && t < 4) return 6 * Math.sin(Math.PI * (t / 4));
  }
  return 0;
}
/** The ring of flips that pops round him on every 16th of the chase (12 tiny amber faces, 6 f out from him). */
export function flipRing(f: number): { at: number; u: number } | null {
  if (f < WARP || f >= REVEAL - 4) return null;
  const at = WARP + 6 * Math.floor((f - WARP) / 6);
  return { at, u: (f - at) / 6 };
}

// ——— The dust wall ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The wall: 20,000 halftone particles in a sheet, looming from 10 ahead to his depth on 4.1a … 4.2, punched open on the clap. */
export const WALL = { count: 20000, half: 12, near: 10 } as const;
/**
 * The wall at instant `f`: its depth ahead (arm units), how opaque, and since the punch (frames; < 0 before). It looms from 10 to his depth
 * over the 10 frames before the punch (prototype j5: 1646 → 1656); after the punch the camera's travel carries it past the lens.
 */
export function wallAt(f: number): { depth: number; alpha: number; since: number } | null {
  const from = DUST.punch - 10;
  if (f < from - 2 || f >= DUST.punch + 14) return null;
  // The punch is a drum swap (taken SWAP_LEAD early): the sheet bursts whole on the clap's frame.
  const since = f - DUST.punch + SWAP_LEAD;
  const depth = since < 0 ? lerp(WALL.near, TUNNEL.he, cO((f - from) / (10 - SWAP_LEAD))) : TUNNEL.he - (travel(f) - travel(DUST.punch - SWAP_LEAD));
  const alpha = since < 0 ? clamp01((f - from + 2) / 8) : 1 - clamp01((since - 8) / 6);
  return { depth, alpha, since };
}

/**
 * The dust wall as a solid printed sheet (the dust's thick lanes, under its particles): how opaque, and the radius (px) of the hole he
 * punches round himself. It closes over the view as the wall looms (4.1a → 4.2); on the clap's frame the hole is already ≈ 560 px across
 * and it bursts radially past the frame's corners within 6 f — the frame's biggest change, so the picture hits on 4.2.
 */
export function sheetAt(f: number): { alpha: number; hole: number } | null {
  const from = DUST.punch - 10;
  if (f < from - 2 || f >= DUST.punch + 8) return null;
  const since = f - DUST.punch + SWAP_LEAD;
  const alpha = since < 0 ? 0.92 * clamp01((f - from + 2) / 9) : 0.92 * (1 - clamp01((since - 4) / 4));
  const hole = since < 0 ? 0 : 200 + 1700 * (1 - Math.exp(-0.45 * (since + 0.5)));
  return { alpha, hole };
}

// ——— The galaxy (placed in the arm's space) ————————————————————————————————————————————————————————————————————————————————

/** The spiral: four log arms (pitch 16°) from r 0.046 to 1.05 (galaxy radii), 60,000 stars; his star on arm 0 at r 0.4. */
export const SPIRAL = { count: 60000, pitch: 16 * D2R, r0: 0.046, rMax: 1.05, arms: 4, star: 0.4, radius: 1250 } as const;
/** An arm's angle at radius r (galaxy radii). */
export const armAngle = (arm: number, r: number): number => (arm * TAU) / SPIRAL.arms + Math.log(r / SPIRAL.r0) / Math.tan(SPIRAL.pitch);
/** A galaxy star: radius, angle, height (galaxy radii), arm (−1 the bulge), size (galaxy radii), named (a face card) or a dot. */
export type SpiralStar = { r: number; a: number; z: number; arm: number; s: number; face: number };
/** A standard normal from two hashes (Box–Muller). */
const gauss = (i: number, k: number): number => Math.sqrt(-2 * Math.log(Math.max(1e-9, hash(i, k)))) * Math.cos(TAU * hash(i, k + 1));
/** His stretch of arm 0 round his star, denser (the scale the snap passes through between the arm and the whole spiral). */
const LOCAL = { count: 8000, r: 0.035, a: 0.09 } as const;
/** His stretch's stars carry this arm number: his (amber), drawn only through the snap (`localAt`). */
export const LOCAL_ARM = 4;
/**
 * His stretch's light: full through the snap's in-between frames, gone a frame into the reveal (it is the scale between the arm and the
 * spiral; landed, its 8,000 stars would sum into one blot of light beside his star).
 */
export const localAt = (f: number): number => 1 - clamp01((f - (REVEAL - 1.5)) / 2.5);
/** The disc between the arms: a faint even population, so the spiral's gaps are space, not holes. */
const DISC = { count: 9000 } as const;
export const SPIRAL_STARS: readonly SpiralStar[] = [
  ...Array.from({ length: SPIRAL.count - LOCAL.count - DISC.count }, (_, i) => spiralStar(i)),
  ...Array.from({ length: LOCAL.count }, (_, i): SpiralStar => {
    const r = SPIRAL.star + LOCAL.r * gauss(i, 201);
    return { r, a: armAngle(0, SPIRAL.star) + (LOCAL.a * gauss(i, 203)) / 2, z: 0.004 * gauss(i, 205), arm: LOCAL_ARM, s: 0.0008 + 0.0012 * hash(i, 207), face: -1 };
  }),
  ...Array.from({ length: DISC.count }, (_, i): SpiralStar => ({ r: 0.08 + 0.95 * Math.sqrt(hash(i, 301)), a: TAU * hash(i, 302), z: 0.012 * gauss(i, 303), arm: 1 + 2 * Math.floor(hash(i, 304) * 2), s: 0.0007 + 0.001 * hash(i, 306), face: -1 })),
];
function spiralStar(i: number): SpiralStar {
  const bulge = i < 3000;
  const arm = bulge ? -1 : i % SPIRAL.arms;
  const u = hash(i, 91);
  const r = bulge ? 0.02 + 0.13 * u ** 0.7 : (SPIRAL.r0 + (SPIRAL.rMax - SPIRAL.r0) * u ** 0.85) * (1 + (hash(i, 93) - 0.5) * 0.16);
  const a = bulge ? TAU * hash(i, 92) : armAngle(arm, Math.max(SPIRAL.r0, r)) + (hash(i, 92) - 0.5) * 0.55 * (1 - 0.4 * u);
  const z = (hash(i, 95) - 0.5) * 0.05 * (bulge ? 2.5 : 1 - 0.6 * u);
  return { r, a, z, arm, s: 0.0011 + 0.0016 * hash(i, 96), face: !bulge && i % 120 === 7 ? Math.floor(hash(i, 94) * ARM_FACES.length) : -1 };
}

/** The galaxy in the arm's space: its core, its plane's axes (e1, e2) and normal, and its radius (arm units). */
export type Placement = { core: V3; e1: V3; e2: V3; n: V3; radius: number };
/**
 * Where the galaxy lies: his star (arm 0, r 0.4) at the tunnel's origin, the arm's tangent there pointing down the flight (−z), the disc's
 * normal straight up (+y) — so the warp runs along the arm inside the disc.
 */
export const PLACEMENT: Placement = (() => {
  const r = SPIRAL.star;
  const th = armAngle(0, r);
  // The arm's tangent in the galaxy plane (outward along the arm).
  const t: [number, number] = [Math.cos(th) - Math.sin(th) / Math.tan(SPIRAL.pitch), Math.sin(th) + Math.cos(th) / Math.tan(SPIRAL.pitch)];
  const tau = Math.atan2(t[1], t[0]);
  const beta = tau - Math.PI / 2;
  const e1: V3 = [Math.cos(beta), 0, Math.sin(beta)];
  const e2: V3 = [Math.sin(beta), 0, -Math.cos(beta)];
  const R = SPIRAL.radius;
  const core = mul(add(mul(e1, r * Math.cos(th)), mul(e2, r * Math.sin(th))), -R);
  return { core, e1, e2, n: [0, 1, 0], radius: R };
})();
/** A galaxy point (r, a, z in galaxy radii; a turned by the galaxy's spin) in the arm's space. */
export function galaxyPoint(r: number, a: number, z = 0): V3 {
  const P = PLACEMENT;
  return add(P.core, mul(add(add(mul(P.e1, r * Math.cos(a)), mul(P.e2, r * Math.sin(a))), mul(P.n, z)), P.radius));
}
/** The galaxy's slow turn (radians at r = 1; inner stars faster: a / r^0.5 in the shader). */
export const spinAt = (f: number): number => (f - REVEAL) * 0.0009;

// ——— The camera: the chase, the snap out and up, the drift, the tilt through the disc ——————————————————————————————————————————

/** The reveal: 1.85 galaxy radii from the core, 25° off face-on, its picture turned 38° (so the jets run top-left → bottom-right). */
export const REVEAL_VIEW = { distance: 1.85, incline: 25 * D2R, roll: 38 * D2R, focal: 2000 } as const;
/** The snap: an impact from REVEAL − 4 into REVEAL (0 → 1, a 2 % rebound over 6 f). */
export const snapAt = (f: number): number => (f < REVEAL - 4 ? 0 : Im(f - (REVEAL - 4), 4));
/**
 * The tilt: an impact from 4.4& that lands 4 f before the seam (5.1 − 4) and holds there, so the last frames' sub-frames (which run across
 * the seam into C's 5.1) see a still band, never one smeared up and down by the landing (BC1).
 */
export const TILT_LAND = TILT.to - 4;
export const tiltAt = (f: number): number => (f < TILT.from ? 0 : Math.min(1, Im(f - TILT.from, TILT_LAND - TILT.from)));

/** Where the reveal looks from: above the disc on his star's side and behind the flight. */
const REVEAL_DIR: V3 = (() => {
  const P = PLACEMENT;
  const toStar = norm(sub([0, 0, 0], P.core));
  const back = norm(add(toStar, [0, 0, 0.6]));
  const flat = norm(sub(back, mul(P.n, dot(back, P.n))));
  return norm(add(mul(P.n, Math.cos(REVEAL_VIEW.incline)), mul(flat, Math.sin(REVEAL_VIEW.incline))));
})();

/** A camera whose picture is turned by `roll` radians counter-clockwise (its basis turned clockwise about the view axis). */
export function rolled(c: Cam, roll: number): Cam {
  if (roll === 0) return c;
  const right = rot(c.right, c.fwd, roll);
  return { ...c, right, up: cross(right, c.fwd) };
}

/** The reveal's camera at instant `f` (a slow drift in: 3 % closer over its beat and a half, the galaxy turning under it). */
function revealCam(f: number): Cam {
  const P = PLACEMENT;
  const drift = 1 - 0.03 * clamp01((f - REVEAL) / 36);
  const eye = add(P.core, mul(REVEAL_DIR, REVEAL_VIEW.distance * drift * P.radius));
  return rolled(lookAlong(eye, sub(P.core, eye), P.n, REVEAL_VIEW.focal), REVEAL_VIEW.roll);
}

/**
 * The one camera at instant `f`, in the arm's space: through the fling and the chase it sits at the origin looking down the arm (−z),
 * banking 25° on the punch; the snap (4 f, an impact into 4.3) carries it 2,000 arm units out and up to the reveal, its lens lengthening
 * from 900 to 2,000 px and its view swinging onto the core (the core lands where the VP was); the tilt (4.4& → 5.1, an impact) drops it
 * into the disc's plane, half as far, its picture turning level, so the disc flattens into the band across the centre (its near stars stream past above and below).
 */
export function galaxyCamera(f: number): Cam {
  const P = PLACEMENT;
  const s = snapAt(f);
  if (s <= 0) return rolled(lookAlong([0, 0, 0], [0, 0, -1], [0, 1, 0], TUNNEL.focal), bank(f));
  if (f < TILT.from) {
    const end = revealCam(Math.max(f, REVEAL));
    if (s >= 1 && f >= REVEAL) return end;
    // The camera pulls straight back from the vanishing point (where he flies) at a steady rate of scale, 3.2 → 2,300 arm units, while
    // the point it looks at slides (late: u³) from the vanishing point to the core and its direction swings from down the arm to above the disc:
    // the arm streams into the centre, then the spiral opens round it and the core lands where the VP was. The bank unwinds into the roll.
    const u = Math.min(1, s);
    const vp: V3 = [0, 0, -TUNNEL.he];
    const endDist = Math.hypot(...sub(end.eye, P.core));
    const dist = TUNNEL.he * (endDist / TUNNEL.he) ** u;
    const target = add(vp, mul(sub(P.core, vp), u ** 3));
    const dir = slerp([0, 0, 1], REVEAL_DIR, sF(u));
    const eye = add(target, mul(dir, dist));
    const focal = lerp(TUNNEL.focal, REVEAL_VIEW.focal, u);
    return rolled(lookAlong(eye, mul(dir, -1), P.n, focal), lerp(bank(f), REVEAL_VIEW.roll, sF(u)));
  }
  const t = tiltAt(f);
  const start = revealCam(TILT.from);
  const dir0 = norm(sub(start.eye, P.core));
  const flat = norm(sub(dir0, mul(P.n, dot(dir0, P.n))));
  // The elevation falls from the reveal's 65° to 0.6° above the plane; the distance halves (into the disc: its near stars stream past).
  const el0 = Math.asin(Math.min(1, dot(dir0, P.n)));
  const el = lerp(el0, 0.6 * D2R, t);
  const dist = lerp(REVEAL_VIEW.distance * 0.97, 0.78, t) * P.radius;
  const eye = add(P.core, mul(add(mul(P.n, Math.sin(el)), mul(flat, Math.cos(el))), dist));
  return rolled(lookAlong(eye, sub(P.core, eye), P.n, REVEAL_VIEW.focal), lerp(REVEAL_VIEW.roll, 0, t));
}

// ——— The spiral's light: ignition, the host arms flipping, bursts, the quasar, the band ———————————————————————————————————————

/** The ignition ring's radius (galaxy radii): core → rim over 4.3 → 4.3& (cubic out); stars inside it burn as neon. */
export const ignitionAt = (f: number): number => (f < IGNITION.from ? 0 : lerp(0, 1.15, cO((f - IGNITION.from) / (IGNITION.to - IGNITION.from))));
/** The radius inside which the host arms (1 and 3) have flipped amber: a stretch a 16th from 4.3&, the last one popping on the quasar. */
export function flipRadius(f: number): number {
  if (f < LIGHT_BURSTS[1]) return 0;
  if (f >= QUASAR.at) return Infinity;
  return lerp(0, 1.08, (f - LIGHT_BURSTS[1]) / (QUASAR.at - LIGHT_BURSTS[1]));
}
/** Is a star of `arm` at radius `r` his (amber) at instant `f`? Arms 0 and 2 (and the bulge) from the reveal; arms 1 and 3 behind the flip. */
export const spiralAmber = (arm: number, r: number, f: number): boolean => arm === -1 || arm === LOCAL_ARM || arm % 2 === 0 || r < flipRadius(f);
/** The light bursts racing out every arm, core → rim, one a 16th: their radius (galaxy radii) and strength (fading in off the core). */
export function burstsAt(f: number): { r: number; a: number }[] {
  return LIGHT_BURSTS.map((b) => (f - b) / 12)
    .filter((u) => u >= 0 && u < 1)
    .map((u) => {
      const r = lerp(SPIRAL.r0, 1.08, u);
      return { r, a: 0.8 * (1 - u) * clamp01((r * SPIRAL.radius - 0.2 * SPIRAL.radius) / (0.24 * SPIRAL.radius)) };
    });
}
/**
 * The quasar's jets along the galaxy's axis (galaxy radii): the near jet (toward the lens) runs 1.6 — off the top-left edge — and the far
 * one 8, foreshortened toward its vanishing point past the bottom-right edge; they grow to the edges in 4 f (a launch). Knots ride out
 * along each jet `KNOT_SPEED` of its length a frame, `knots` of them.
 */
export const JET = { near: 1.6, far: 8, steps: 56, knots: 7, knotSpeed: 0.045 } as const;
/** The quasar's jets: how far they have grown (0 → 1, a launch, to the frame's edges in 4 f) and their strength (gone by QUASAR.gone). */
export function jetsAt(f: number): { grow: number; a: number } | null {
  if (f < QUASAR.at - SWAP_LEAD || f >= QUASAR.gone) return null;
  // They fire on the kick's own frame: two thirds of their reach on it (taken SWAP_LEAD early, the frame's biggest step), the rest
  // easing out over the next 3 f — the edges by 4.4 + 4.
  const t = f - QUASAR.at + SWAP_LEAD;
  return { grow: Math.min(1, 0.65 + 0.35 * (1 - Math.exp(-0.9 * t))), a: 1 - clamp01((f - (QUASAR.gone - 4)) / 4) };
}
/** A point of a jet on screen: 1080p px from the centre (y up), its distance up the axis (galaxy radii) and px per galaxy radius there. */
export type JetPoint = { x: number; y: number; z: number; px: number };
/**
 * The quasar's jets on screen at instant `f`, as the camera of `f` sees them: per jet (`sg` +1 toward the lens, −1 away) its spine from
 * the core outward (sampled densely near the core, stopping just past the frame's edge or at the lens), its knots riding out along it,
 * and its strength. Empty off the quasar.
 */
export function quasarJets(f: number): { sg: 1 | -1; spine: JetPoint[]; knots: JetPoint[]; a: number }[] {
  const j = jetsAt(f);
  if (!j || j.grow <= 0) return [];
  const cam = galaxyCamera(f);
  const R = PLACEMENT.radius;
  const at = (sg: number, z: number): JetPoint | null => {
    const q = projectCam(cam, galaxyPoint(0, 0, sg * z));
    return q ? { x: q.x, y: q.y, z, px: q.k * R } : null;
  };
  const off = (p: JetPoint) => Math.abs(p.x) > 1060 || Math.abs(p.y) > 640;
  return ([1, -1] as const).map((sg) => {
    const len = j.grow * (sg > 0 ? JET.near : JET.far);
    const spine: JetPoint[] = [];
    for (let i = 0; i <= JET.steps; i++) {
      const p = at(sg, len * (i / JET.steps) ** 1.8);
      if (!p) break;
      spine.push(p);
      if (off(p)) break;
    }
    const reach = spine.length ? spine[spine.length - 1].z : 0;
    const knots: JetPoint[] = [];
    for (let k = 0; k < JET.knots; k++) {
      const u = (k / JET.knots + (f - QUASAR.at) * JET.knotSpeed) % 1;
      const p = at(sg, (sg > 0 ? JET.near : JET.far) * u ** 1.8);
      if (p && p.z <= reach && !off(p)) knots.push(p);
    }
    return { sg, spine, knots, a: j.a };
  });
}
/**
 * The core's anamorphic streak (half-width, px, and strength) over the tilt: grows with it, then from 4.4a widens past the frame's edges by
 * 5.1 − 1, burning brighter as it goes: the brightest thing on screen at the cut, the light C's 5.1 paste flare picks up.
 */
export function streakAt(f: number): { half: number; a: number } {
  const t = tiltAt(f);
  if (t <= 0) return { half: 0, a: 0 };
  const u = clamp01((f - TILT.streak) / (TILT.to - 1 - TILT.streak));
  const half = f >= TILT.streak ? lerp(400, 1000, sF(u)) : 300 * t;
  return { half, a: t * (f >= TILT.streak ? lerp(1, 1.6, u) : 1) };
}
/** C's bandProfile (src/shots/cosmosWeb.ts) as its three gaussians: σ (px) and gain on BAND_INK (a test keeps them equal). */
export const BAND_TERMS: readonly { sigma: number; gain: number }[] = [
  { sigma: 5, gain: 2.2 },
  { sigma: 22, gain: 0.8 },
  { sigma: 70, gain: 0.2 },
];
/**
 * How much of the band (C's bandProfile, the match cut's light) is drawn at instant `f`: it takes over the disc as the tilt lands
 * (TILT_LAND − 4 → TILT_LAND) and is the picture's whole light on the last frames, exactly C's profile (BC1).
 */
export const bandAt = (f: number): number => clamp01((f - (TILT_LAND - 4)) / 4);
/** The galaxy's own stars give way to the band as it takes over: gone once the tilt has landed (the seam's band is C's profile alone). */
export const discFade = (f: number): number => 1 - bandAt(f) ** 0.6;

/** Bar 4's range (renderer B draws cosmos 3.1 → 5.1). */
export const GALAXY_BAR = { from: cs(4), to: cs(5) } as const;

// ——— Where the light lands (the SUBJECT, the glints, the sparks), for the light drawn after the print ———————————————————————————

/** Him on screen through the chase at instant `f` (px, y up), his em (px) and how visible he is (he fades as the snap pulls away). */
export function heroScreen(f: number): { x: number; y: number; em: number; alpha: number } | null {
  if (f < WARP - SWAP_LEAD) return null;
  const snap = snapAt(f);
  if (snap >= 0.6) return null;
  const k = heroBurst(f) * (TUNNEL.he / heroDistance(f));
  return { x: HERO.x * k, y: HERO.y * k + heroBob(f), em: HERO.em * k, alpha: 1 - clamp01((snap - 0.3) / 0.3) };
}
/**
 * The neon power-up (reserved, 4.3; design "coloured +30 % for 8 f, never white"): on the snap's landing (taken SWAP_LEAD early) the
 * core's point burns in the ignition's colour and a coloured light (amber in pink) swells round the centre, and the ignition ring's
 * front burns brightest; all of it eases back over 8 f, while the light the ring leaves behind keeps growing (core → rim).
 */
export const powerUpAt = (f: number): number => env(f - REVEAL + SWAP_LEAD, 8);
/**
 * The bulge's core (his star's galaxy's heart): lit whole on the reveal's frame (taken SWAP_LEAD early, drawn where the landed camera
 * sees it: no smear of the snap's last instants), then held; it gives way to the band (its streak) as the tilt lands.
 */
export const bulgeAt = (f: number): number => (f < REVEAL - SWAP_LEAD ? 0 : 1 - bandAt(f));
/** The bulge's radius in galaxy radii: the arms' spines start at its edge (inside it the printed halftone bulge and the core's point). */
export const BULGE_R = 0.13;
/**
 * The core's point (round 2, b-galaxy-ignition-white-milky): a small amber-white point with a steep falloff, never a flat white disc.
 * `r` is its light's half-width (px; the hot overlay's plateau field, a gaussian of 0.45 r): at `gain` its hue-clamped centre reaches
 * full brightness out to ≈ 0.47 r and its light is under a tenth by ≈ 0.85 r, so the point reads ≈ 60 px in radius on the reveal and
 * ≈ 70 as the ignition spreads (the power-up builds, never dims). Kept small, it feeds the bloom a point's energy, not a disc's.
 */
export const CORE_POINT = { r0: 66, r1: 76, gain: 3 } as const;
export const corePointRadius = (f: number): number => lerp(CORE_POINT.r0, CORE_POINT.r1, cO((f - REVEAL) / 12));
/**
 * The light's SUBJECT at instant `f`: him through the chase; his star once the snap opens the spiral; the core from the quasar (it fires
 * the jets and becomes the band's heart).
 */
export function galaxySubject(f: number): { x: number; y: number; r: number } {
  const h = heroScreen(f);
  if (h && h.alpha > 0.5) return { x: h.x, y: h.y, r: 0.6 * h.em };
  const cam = galaxyCamera(f);
  const spin = spinAt(f);
  if (f >= QUASAR.at - 2) {
    const c = projectCam(cam, PLACEMENT.core);
    return c ? { x: c.x, y: c.y, r: 60 } : { x: 0, y: 0, r: 60 };
  }
  const r = SPIRAL.star;
  const q = projectCam(cam, galaxyPoint(r, armAngle(0, r) + spin / Math.sqrt(r)));
  return q ? { x: q.x, y: q.y, r: 30 } : { x: 0, y: 0, r: 30 };
}
/**
 * What catches the open hats' light at instant `f` (px): through the chase the near arm stars' heads (one in 37 of the tunnel, 1–25 arm
 * units ahead, off his bubble); on the spiral the named stars inside the ignition ring.
 */
export function galaxyGlints(f: number): [number, number][] {
  const cam = galaxyCamera(f);
  const out: [number, number][] = [];
  if (snapAt(f) < 0.5) {
    const T = travel(f);
    for (let i = 0; i < TUNNEL_STARS.length && out.length < 120; i += 37) {
      const s = TUNNEL_STARS[i];
      const dz = (((s.z - T) % TUNNEL.length) + TUNNEL.length) % TUNNEL.length;
      if (dz < 1 || dz > 25) continue;
      const q = projectCam(cam, [s.r * Math.cos(s.a), s.r * Math.sin(s.a), -dz]);
      if (q && Math.abs(q.x) < 940 && Math.abs(q.y) < 520 && Math.hypot(q.x, q.y + 30) > 200) out.push([q.x, q.y]);
    }
    return out;
  }
  const ig = ignitionAt(f);
  const spin = spinAt(f);
  for (const s of SPIRAL_STARS) {
    if (s.face < 0 || s.r > ig) continue;
    const q = projectCam(cam, galaxyPoint(s.r, s.a + spin / Math.sqrt(Math.max(s.r, 0.05)), s.z));
    if (q && Math.abs(q.x) < 940 && Math.abs(q.y) < 520) out.push([q.x, q.y]);
  }
  return out;
}
