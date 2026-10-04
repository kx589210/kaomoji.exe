// The motion grammar of spec §3.1 (rule 7) as pure curves of the film frame:
// an action starts fast, arrives exactly on its beat, rings out in a small
// overshoot and then holds still. The camera energy (rules 3–4) uses the
// punch, shake and flash curves. 60 fps, 24 frames a beat.
import type { Pose } from '../engine/camera.ts';
import { clamp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';

/** Default frames of a move before it lands: short enough to leave half a beat of stillness when moves come a beat apart. */
export const LEAD = 4;
/** Frames a landed move rings for; from `land + RING` on it is exactly still. */
export const RING = 8;
const W = Math.PI / 5;
const TAU = 2.5;

/** The overshoot after a landing that arrived at `speed` (per frame): 0 on the landing, leaving it at that speed, exactly 0 again from RING on. */
const ring = (t: number, speed: number): number =>
  t <= 0 || t >= RING ? 0 : (speed / W) * Math.exp(-t / TAU) * Math.sin(W * t) * (1 - smoothstep(0.6 * RING, RING, t));

/** 0 until `land − lead`, then a fast start (1.5 × the average speed, slowing to 0.5 ×), exactly 1 on `land` and after: no overshoot. */
export function rise(frame: number, land: number, lead = LEAD): number {
  const u = clamp((frame - land + lead) / lead);
  return 1.5 * u - 0.5 * u * u;
}

/** One move of the grammar, 0 → 1: rise() into `land`, then an overshoot `bounce` times the natural one (about 9 % for a 4-frame lead) that rings out, still from `land + RING`. */
export function hit(frame: number, land: number, lead = LEAD, bounce = 1): number {
  return frame < land ? rise(frame, land, lead) : 1 + bounce * ring(frame - land, 0.5 / lead);
}

export type Key = { land: number; lead?: number; to: number };

/** A value that moves only by hits: `from` until the first key moves, each key's `to` reached on its `land` (keys in time order; at least lead + RING apart to land exactly). */
export function track(frame: number, from: number, keys: readonly Key[], bounce = 1): number {
  let v = from;
  let prev = from;
  for (const k of keys) {
    v += (k.to - prev) * hit(frame, k.land, k.lead ?? LEAD, bounce);
    prev = k.to;
  }
  return v;
}

/** A frontal camera: `zoom` times closer than the frame-filling distance, looking at (x, y), rolled `roll` radians. */
export type Aim = { zoom: number; x: number; y: number; roll: number };
export type AimKey = { land: number; lead?: number; aim: Aim };
/** The whole frame, square on. */
export const FULL_AIM: Aim = { zoom: 1, x: 0, y: 0, roll: 0 };

/** The aim at `frame`: `start` until the first key moves, then each key's aim reached on its land; the zoom moves evenly in scale. */
export function aimAt(frame: number, start: Aim, keys: readonly AimKey[], bounce = 1): Aim {
  const along = (get: (a: Aim) => number): number => track(frame, get(start), keys.map((k) => ({ land: k.land, lead: k.lead, to: get(k.aim) })), bounce);
  return { zoom: Math.exp(along((a) => Math.log(a.zoom))), x: along((a) => a.x), y: along((a) => a.y), roll: along((a) => a.roll) };
}

/** The pose of `aim` over the plane z = `z`, which fills the frame from `front` with field of view `fov`. */
export const aimPose = (a: Aim, front: number, fov: number, z = 0): Pose => ({
  position: [a.x, a.y, z + front / a.zoom],
  target: [a.x, a.y, z],
  up: [Math.sin(a.roll), Math.cos(a.roll), 0],
  fov,
});

/** A hop that lands on `land`: up and back down over the `lead` frames before it (highest halfway), 0 otherwise. */
export const hop = (frame: number, land: number, lead = 6): number => {
  const u = (frame - land + lead) / lead;
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
};

/**
 * A launch-type move (spec §3.1 rule 5), 0 → 1: still until `at`, then off at
 * full speed on `at` (about 3/4 of the way in 3 frames at the default tau), a
 * soft landing whose overshoot is `bounce` times the natural one (≈ 3.5%),
 * exactly 1 from `at + 8 × tau`. bounce 0 is a pure exponential ease-out.
 */
export function strike(frame: number, at: number, tau = 3, bounce = 1): number {
  const t = frame - at;
  if (t <= 0) return 0;
  const end = 8 * tau;
  if (t >= end) return 1;
  return 1 - Math.exp(-t / tau) * Math.cos((bounce * Math.PI * t) / (4 * tau)) * (1 - smoothstep(0.75 * end, end, t));
}

export type LaunchOpts = { tau?: number; bounce?: number; depth?: number; len?: number };

/** A strike on `at`, optionally wound up first: eased back to −depth over the `len` frames before `at`, then off from there. */
export function launch(frame: number, at: number, o: LaunchOpts = {}): number {
  const depth = o.depth ?? 0;
  if (frame < at) return depth ? 0 - depth * smoothstep(at - (o.len ?? 6), at, frame) : 0;
  return -depth + (1 + depth) * strike(frame, at, o.tau ?? 3, o.bounce ?? 1);
}

/** An impact-type move, 0 → 1: still until `at − lead`, easing in (cubic) to hit exactly 1 on `at`, a small recoil (`bounce` × 5%) that rings out, exactly 1 from `at + 12`. */
export function slam(frame: number, at: number, lead = 8, bounce = 1): number {
  const u = (frame - at + lead) / lead;
  if (u <= 0) return 0;
  if (u < 1) return u * u * u;
  const t = frame - at;
  if (t >= 12) return 1;
  return 1 + bounce * 0.05 * Math.exp(-t / 2.5) * Math.sin((Math.PI * t) / 5) * (1 - smoothstep(8, 12, t));
}

export type Move = LaunchOpts & { at: number; to: number; kind?: 'launch' | 'slam'; lead?: number };
const moveCurve = (frame: number, m: Omit<Move, 'to'>): number => (m.kind === 'slam' ? slam(frame, m.at, m.lead ?? 8, m.bounce ?? 1) : launch(frame, m.at, m));

/** A value moved by launches and slams: `from` until the first move, then each move's `to`. */
export function moveTrack(frame: number, from: number, moves: readonly Move[]): number {
  let v = from;
  let prev = from;
  for (const m of moves) {
    v += (m.to - prev) * moveCurve(frame, m);
    prev = m.to;
  }
  return v;
}

export type AimMove = Omit<Move, 'to'> & { aim: Aim };

/** An aim moved by launches and slams (zoom evenly in scale). */
export function aimMoves(frame: number, start: Aim, moves: readonly AimMove[]): Aim {
  const along = (get: (a: Aim) => number): number => moveTrack(frame, get(start), moves.map((m) => ({ ...m, to: get(m.aim) })));
  return { zoom: Math.exp(along((a) => Math.log(a.zoom))), x: along((a) => a.x), y: along((a) => a.y), roll: along((a) => a.roll) };
}

/** A camera that never stops (spec §3.1 rule 2): from `f0`, the zoom grows by the factor `zoom` a beat; x, y and roll drift by their amount a beat. */
export const flowAim = (frame: number, f0: number, rate: { zoom?: number; x?: number; y?: number; roll?: number }): Aim => {
  const b = (frame - f0) / 24;
  return { zoom: (rate.zoom ?? 1) ** b, x: (rate.x ?? 0) * b, y: (rate.y ?? 0) * b, roll: (rate.roll ?? 0) * b };
};

/** Two aims on top of each other: zooms multiply, offsets and rolls add. */
export const composeAim = (a: Aim, b: Aim): Aim => ({ zoom: a.zoom * b.zoom, x: a.x + b.x, y: a.y + b.y, roll: a.roll + b.roll });

/** A kick punch: starts on the kick `at` (its onset is the hit), peaks 1.5 frames later, springs back without overshoot, exactly 0 from `at + 14`. */
export function punch(frame: number, at: number): number {
  const t = frame - at;
  if (t <= 0 || t >= 14) return 0;
  if (t < 1.5) {
    const u = t / 1.5;
    return 1 - (1 - u) * (1 - u);
  }
  const k = (t - 1.5) / 2.2;
  return Math.exp(-k) * (1 + k) * (1 - smoothstep(9, 14, t));
}

/** A shake of unit size starting on `at`: [x, y, roll], each two sines that start at 0 (an impact) and die away, exactly 0 from `at + 16`; `seed` varies the frequencies and directions. */
export function shake(frame: number, at: number, seed: number): [number, number, number] {
  const t = frame - at;
  if (t <= 0 || t >= 16) return [0, 0, 0];
  const env = Math.exp(-t / 4) * (1 - smoothstep(10, 16, t));
  const wave = (i: number): number => {
    const a = (2 * Math.PI) / (3 + 2.5 * hash(seed, i));
    const b = (2 * Math.PI) / (2.2 + 1.5 * hash(seed, i + 3));
    return (hash(seed, i + 6) < 0.5 ? -1 : 1) * (0.7 * Math.sin(a * t) + 0.3 * Math.sin(b * t));
  };
  return [env * wave(0), env * wave(1), env * wave(2)];
}

/** A white flash on `at`: a pop, 1 on that frame, then about 0.46, 0.21, 0.1 …, exactly 0 from `at + 8`. */
export function flash(frame: number, at: number): number {
  const t = frame - at;
  return t < 0 || t >= 8 ? 0 : Math.exp(-t / 1.3) * (1 - smoothstep(4, 8, t));
}

/** True within one frame of any window [a, b]. */
export const within = (frame: number, windows: readonly (readonly [number, number])[]): boolean => windows.some(([a, b]) => frame >= a - 1 && frame <= b + 1);
