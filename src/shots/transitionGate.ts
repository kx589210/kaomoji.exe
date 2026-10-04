// The transition's picture as pure functions of the instant (the part 'transition', 2 bars: "DUPLICATOR → VERTIGO → STAR GATE →
// CRASH STOP → ✦"; build sheet notes/bcos/sheet.md §3, design notes/cosmos3/final.md §4 bars 13–14, prototype
// cosmos3/w/j2.js). The GPU side is src/scenes/transitionGate.ts (+ transitionFilms.ts, transitionLens.ts); this file says where
// everything is, so Node tests can pin it.
//
// The world (real 3D): the Riso print's last page is the plane z = 0 (the sun on paper, drawn with riso.ts's own shapes and camera);
// the films are fronto-parallel sheets in front of it, film n at z = 460 − 20 n (films 1–9 of the pastes at z = 40 k, films 10–18 of
// the auto-repeat in the gaps, the flight's films behind the page from n = 23 on); world units are screen px at the Riso print's last
// zoom. The camera sits on the axis and looks down −z with a lens shift that keeps the axis on the sun (the vanishing point, `vp`):
// a point (x, y, z) lands at vp + R(roll) · (x, y) · focal / (eye − z). Bar 1 is the Vertigo dolly zoom (eye = d = 400 / q, focal =
// zoom · d: the page plane keeps its size while the films separate in depth); from 1.3 the camera flies down −z (the travel T), the
// page and the sun becoming the light at the end; on 2.3 it stops dead and the dolly runs backwards on the 32nds about the plane that
// was 470 units ahead (3D → 2D); then the flat page squashes into the ✦ (a post on a frozen frame of it) and the point.
// Coordinates: 1080p logical px, origin at the frame centre, y up; angles in radians, counter-clockwise positive.
// Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import type { Pose } from '../engine/camera.ts';
import { clamp, lerp } from '../engine/math.ts';
import { hash, noise1 } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { aimPose } from '../motion/hit.ts';
import {
  AUTO_REPEAT, CHASE_LIGHTS, CORKSCREW, CRASH, CROSS, DOLLY, FLARE_BORN, GATES, HATS, KICKS, LAUNCH, PASTES, POINT, PRESS_PASSES, PUSH, REVERSE_VERTIGO,
  SINGS, SLIT, SLUG as SLUG_WINDOW, SPEED, SPIN, SUN_SHEDS, TARGETS, TRANSITION_END, TRANSITION_START, VERTIGO, WALTZ, WALTZ_STEPS, at,
} from '../score/transition.ts';
import type { Temporal } from '../engine/temporal.ts';
import { frameOf, transitionTemporal } from './cosmosKit.ts';
import { type RisoLayout, risoFrame } from './riso.ts';
import { FOV, FRONT } from './swiss.ts';

const DEG = Math.PI / 180;

// ——— Motion curves (the prototype's, j1.js: L launch, cO / cI / sF eases, env decay) —————————————————————————————————————————————

/** Launch: 75 % of the move in 3 f, ≤ 3 % rebound, settled by ≈ 12 f (prototype `L`). */
export const L = (t: number): number => (t <= 0 ? 0 : 1 - Math.exp(-0.5625 * t) * (Math.cos(0.496 * t) + 1.134 * Math.sin(0.496 * t)));
/** The waltz step: a launch with the design's 6 % overshoot, settled in ≈ 8 f. */
export const waltzStep = (t: number): number => (t <= 0 ? 0 : 1 - Math.exp(-0.55 * t) * (Math.cos(0.615 * t) + (0.55 / 0.615) * Math.sin(0.615 * t)));
const cO = (t: number): number => 1 - (1 - clamp(t)) ** 3;
const cI = (t: number): number => clamp(t) ** 3;
const sF = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
/** A decay from 1 on t = 0 to 0 by t = n (squared). */
const env = (t: number, n: number): number => (t < 0 || t >= n ? 0 : (1 - t / n) ** 2);
const lastAtOrBefore = (xs: readonly number[], f: number): number => xs.filter((x) => x <= f).pop() ?? -Infinity;

// ——— The world ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A film's window: half-size 400 × 225 round the sun; its ink reaches up to 600 units out (the halftone falloff's end). */
export const WINDOW = { a: 400, b: 225 } as const;
export const OUTER = 600;
/** A gate's window rule is 16 units; its two face blocks (380 × 140) sit 170 units above and below the window. */
export const GATE = { rule: 16, blockW: 380, blockH: 140, faceW: 320, offset: 170 } as const;
/** Films sit 20 units apart along the axis; film n at z = 460 − 20 n (n 5–22 are the pastes', n ≥ 23 the flight's). */
export const FILM_GAP = 20;
export const filmZ = (n: number): number => 460 - FILM_GAP * n;
/** The page's distance at the launch (q = 0.85): d = 400 / q. */
export const LAUNCH_D = 400 / DOLLY[DOLLY.length - 1].q;
/** Films are born this far ahead (a window there just clears the sun's rim) and dropped once nearer than this (wholly off screen). */
export const RIM_D = 594;
export const NEAR_D = 94;
/** A gate is placed so that it is this far ahead on its hit (its window then just leaves the frame). */
export const GATE_AHEAD = 196;
/** The frame, its strip and its bands repeat every slot along the window's perimeter (20 slots: 4a + 4b = 2500 units). */
export const SLOT = (4 * WINDOW.a + 4 * WINDOW.b) / 20;
/** The waltzing station's spin: 0.12 turn/s along the perimeter (units a frame). */
export const SPIN_SPEED = (0.12 * 4 * (WINDOW.a + WINDOW.b)) / 60;

/** The plates, in the films' rotation: blue, pink, the films' pale yellow. */
export type PlateIndex = 0 | 1 | 2;

/** The order a paste-film was printed in (1–18) from its place n (5–22) in the stack; the flight's films count on from 19. */
export function editionOf(n: number): number {
  if (n >= 23) return n - 4;
  return n % 2 ? (23 - n) / 2 : 10 + (22 - n) / 2;
}
/** Film k's plate (B, P, Y; F4–F6 P, Y, B …: prototype j2 `plate`). */
export function plateOf(n: number): PlateIndex {
  if (n >= 23) return ((2 * n + 1) % 3) as PlateIndex;
  const k = editionOf(n);
  return ((k - 1 + Math.floor((k - 1) / 3)) % 3) as PlateIndex;
}
/**
 * Film n's twist: bar 1's films 0.75° a film (−1.5° · k in the prototype's y-down canvas, so counter-clockwise on screen) ± 0.3° hashed,
 * 13.5° → 0° by n = 23. The flight's films fold the fan back and forth instead of winding on (a sine through 0 on n = 23 at the same
 * slope, ±6.4°), its period set so the stack the crash flattens is centred on 0°: the corkscrew's 90° then leaves a portrait frame
 * (final.md §4 2.3), not one turned 45° by the late films' twist.
 */
export function twistOf(n: number): number {
  const jitter = (hash(n, 1) - 0.5) * 0.6;
  if (n <= 23) return -(0.75 * n - 17.25 + jitter) * DEG;
  const [n0, n1] = reverseFilms();
  const H = ((n0 + n1) / 2 - 23) / 2;
  return -(((0.75 * H) / Math.PI) * Math.sin((Math.PI * (n - 23)) / H) + jitter) * DEG;
}
/** The films the crash leaves in the stack (every film then 60 – 614 ahead): the reverse Vertigo flattens these. */
export function reverseFilms(): [number, number] {
  const Tc = CRASH_TRAVEL();
  return [Math.max(5, Math.ceil((Tc + 60 - 10) / FILM_GAP)), Math.floor((Tc + 614 - 10) / FILM_GAP)];
}
/** Film n's loose register: ±10 units. */
export const offsetOf = (n: number): [number, number] => [(hash(n, 2) - 0.5) * 20, -(hash(n, 3) - 0.5) * 20];
/** When film n is pasted (the three pastes, the auto-repeat; the flight's films on the launch). */
export function bornOf(n: number): number {
  if (n >= 23) return LAUNCH;
  const k = editionOf(n);
  if (k <= 9) return PASTES[Math.floor((k - 1) / 3)].at;
  return AUTO_REPEAT[k - 10];
}

// ——— The page: the Riso print's last frame (E0: the transition's first frame is it plus the films) —————————————————————————————————

/** The Riso shots need a layout only for S10's mouths and S12's face, both gone by the print's last frame (sucked into the sun). */
const RISO_LAYOUT: RisoLayout = { advance: () => 0.6, mouths: {} };
/** The Riso print's last output frame (the page the transition copies). */
export const RISO_LAST = TRANSITION_START - 1;

export type Page = {
  /** The Riso print's inks at its last frame, in page units (its own shapes: the sun's yellow disc and pink core). */
  shapes: readonly Shape[];
  /** Its camera's zoom and aim (S12's push: aimPose(s12Aim)). */
  zoom: number;
  aimY: number;
  /** The yellow disc's and the pink core's centres and radii, page units. */
  sun: { x: number; y: number; r: number };
  core: { x: number; y: number; r: number };
};

let pageCache: Page | null = null;
/** The Riso print's last frame, as the transition's page (computed once from riso.ts: whatever the print ends on, the page is). */
export function page(): Page {
  if (pageCache) return pageCache;
  const f = risoFrame(RISO_LAST, RISO_LAYOUT);
  const discs = f.content.under.filter((s) => s.kind === 'ellipse').sort((a, b) => b.w - a.w);
  if (discs.length < 2) throw new Error('transition: the Riso print no longer ends on its sun (a yellow disc and a pink core)');
  const zoom = FRONT / (f.camera.position[2] - f.camera.target[2]);
  pageCache = {
    shapes: f.content.under,
    zoom,
    aimY: f.camera.target[1],
    sun: { x: discs[0].x, y: discs[0].y, r: discs[0].w / 2 },
    core: { x: discs[1].x, y: discs[1].y, r: discs[1].w / 2 },
  };
  return pageCache;
}
/** The Riso print's last frame's glyphs and overlays (tests: the page carries none, so the shapes are all of it). */
export const risoLastContent = () => risoFrame(RISO_LAST, RISO_LAYOUT);

/** S12's push runs on from the print's rate and decelerates to a stop on the lurch (+1.6 %: the sun 175 → 178 px). */
const PUSH_RATE = Math.log(1.04) / 24;
const PUSH_LEN = PUSH.to - RISO_LAST;
const PUSH_POW = (PUSH_LEN * PUSH_RATE) / Math.log(1.016);
/** The page camera's zoom at instant f (riso's at its last frame, then the decelerating push; held from the lurch on). */
export function pageZoom(f: number): number {
  const t = clamp(f - RISO_LAST, 0, PUSH_LEN);
  return page().zoom * Math.exp(((PUSH_RATE * PUSH_LEN) / PUSH_POW) * (1 - (1 - t / PUSH_LEN) ** PUSH_POW));
}
/** The push relative to the hand-off: film units are screen px at the Riso print's last zoom. */
export const zoomRel = (f: number): number => pageZoom(f) / page().zoom;
/** The page camera (riso.ts's own pose maths: aimPose over the page plane). */
export const pagePose = (f: number): Pose => aimPose({ zoom: pageZoom(f), x: 0, y: page().aimY, roll: 0 }, FRONT, FOV);
/** The sun's centre on screen in bar 1 (the yellow disc's: the films' vanishing point). */
export function pageSunScreen(f: number): [number, number] {
  const p = page();
  const z = pageZoom(f);
  return [p.sun.x * z, (p.sun.y - p.aimY) * z];
}

// ——— The dolly, the flight, the roll ————————————————————————————————————————————————————————————————————————————————————————————

/** The depth reveal q = 400 / d at instant f (the Vertigo dolly zoom; DOLLY's keys: creep, lurch, glide to velocity 0 on the launch). */
export function dollyQ(f: number): number {
  const [k0, k1, k2, , k4, k5] = DOLLY;
  if (f < k1.at) return lerp(k0.q, k1.q, cI((f - k0.at) / (k1.at - k0.at)));
  if (f < k2.at) return lerp(k1.q, k2.q, (f - k1.at) / (k2.at - k1.at));
  if (f < k4.at) return k2.q + (k4.q - k2.q) * Math.min(1.02, L(f - k2.at));
  if (f < k5.at) return lerp(k4.q, k5.q, sF((f - k4.at) / (k5.at - k4.at)));
  return k5.q;
}

/** Units of travel a frame at instant f: the launch (0 → 6 in 3 f), ×2 on 2.1 and 2.2 (L), each kick's ×1.6 surge over 10 f; 0 from the crash. */
export function speedAt(f: number): number {
  if (f < LAUNCH || f >= CRASH) return 0;
  const [s0, s1, s2] = SPEED;
  let v: number;
  if (f < s1.at) v = s0.units * cO((f - s0.at) / 3);
  else if (f < s2.at) v = s0.units + (s1.units - s0.units) * Math.min(1.02, L(f - s1.at));
  else v = s1.units + (s2.units - s1.units) * Math.min(1.02, L(f - s2.at));
  const k = lastAtOrBefore(KICKS.filter((x) => x >= LAUNCH && x < CRASH), f);
  // Gate 1's snare (1.4): the camera punches through it, a ×1.3 surge (bar 1 has no kick there; the gate's whoosh is the hit).
  return v * (1 + 0.6 * env(f - k, 10) + 0.3 * env(f - GATES[0], 8));
}
const TRAVEL_STEP = 1 / 32;
let travelTable: Float64Array | null = null;
/** Units travelled since the launch at instant f (the integral of speedAt; held from the crash). */
export function travel(f: number): number {
  if (!travelTable) {
    const n = Math.ceil((CRASH - LAUNCH) / TRAVEL_STEP);
    travelTable = new Float64Array(n + 1);
    for (let i = 1; i <= n; i++) {
      const a = LAUNCH + (i - 1) * TRAVEL_STEP;
      // Simpson on each step (the surges start with a jump on their kick, which is on the grid).
      const b = a + TRAVEL_STEP;
      const fa = speedAt(a);
      const fm = speedAt((a + b) / 2);
      const fb = speedAt(Math.min(b, CRASH - 1e-9));
      travelTable[i] = travelTable[i - 1] + (TRAVEL_STEP / 6) * (fa + 4 * fm + fb);
    }
  }
  const x = (clamp(f, LAUNCH, CRASH) - LAUNCH) / TRAVEL_STEP;
  const i = Math.min(travelTable.length - 2, Math.floor(x));
  return travelTable[i] + (travelTable[i + 1] - travelTable[i]) * (x - i) + joltAt(f);
}
/**
 * The jolts: on the launch's kick and on gate 1's snare the camera lurches forward a step, whole on the drum's frame (taken at the
 * output frame, so the frame before is still and the drum's frame shows the jump): the hit you feel before the speed builds.
 */
export const JOLTS: readonly { at: number; units: number }[] = [
  { at: LAUNCH, units: 12 },
  { at: GATES[0], units: 10 },
];
export const joltAt = (f: number): number => JOLTS.reduce((s, j) => (frameOf(f) >= j.at ? s + j.units : s), 0);
/** The travel at the crash (where the flight stops dead). */
export const CRASH_TRAVEL = (): number => travel(CRASH);

/** The corkscrew: 22.5° counter-clockwise on each roll 16th of 2.2 (L), 90° held from 2.2a's settle through the cross. */
export const rollAt = (f: number): number => 22.5 * DEG * CORKSCREW.reduce((s, h) => s + Math.min(1.02, L(f - h)), 0);

// ——— The camera ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type Phase = 'page' | 'flight' | 'reverse' | 'cross' | 'point';
/** The phase of instant f; the flight starts whole on the launch's frame (with its jolt). */
export const phaseAt = (f: number): Phase => (frameOf(f) < LAUNCH ? 'page' : f < CRASH ? 'flight' : f < CROSS ? 'reverse' : f < POINT ? 'cross' : 'point');

/** Where the films are seen from: a world point (x, y, z) lands at vp + R(roll) · (x, y) · focal / (eye − z). */
export type GateCamera = { eye: number; focal: number; roll: number; vp: readonly [number, number] };

/** The reverse Vertigo's step at output frame `d` (0–7) and the frames since it. */
export function reverseStep(f: number): { i: number; e: number } {
  const d = frameOf(f);
  const i = clamp(Math.floor((d - CRASH) / 3), 0, REVERSE_VERTIGO.length - 1);
  return { i, e: d - REVERSE_VERTIGO[i].at };
}
/** The reverse Vertigo's q at instant f: a snap a 32nd (1-frame step, −6 % overshoot, settled in 2 f). */
export function reverseQ(f: number): number {
  const { i, e } = reverseStep(f);
  const q = REVERSE_VERTIGO[i].q;
  const prev = i === 0 ? DOLLY[DOLLY.length - 1].q : REVERSE_VERTIGO[i - 1].q;
  const over = e <= 0 ? 0.06 : e === 1 ? 0.02 : 0;
  return q - (prev - q) * over;
}

/** The vanishing point: on the sun in bar 1 (it holds dead still), centred under the flight's first two beats (≤ 0.4 px a frame). */
export function vpAt(f: number): [number, number] {
  if (f < LAUNCH) return pageSunScreen(f);
  const [x, y] = pageSunScreen(LAUNCH);
  const u = 1 - sF((f - LAUNCH) / (at(2) - LAUNCH));
  return [x * u, y * u];
}

/** The camera at instant f (the films' projection). */
export function cameraAt(f: number): GateCamera {
  const roll = rollAt(f);
  const vp = vpAt(f);
  if (phaseAt(f) === 'page') {
    const d = 400 / dollyQ(f);
    return { eye: d, focal: zoomRel(f) * d, roll, vp };
  }
  const z = zoomRel(LAUNCH);
  if (f < CRASH) return { eye: LAUNCH_D - travel(f), focal: z * LAUNCH_D, roll, vp };
  // The reverse Vertigo about the plane that was LAUNCH_D ahead at the crash, the lens zooming in as it flattens (flatZoom); a 5-unit
  // recoil over the crash's first 4 frames.
  const q = reverseQ(f);
  const recoil = 5 * Math.sin(Math.PI * clamp((f - CRASH) / 4));
  return { eye: LAUNCH_D - CRASH_TRAVEL() - LAUNCH_D + 400 / q + recoil, focal: ((z * 400) / q) * flatZoom(q), roll, vp };
}
/**
 * The flat frame's size: the reverse Vertigo also zooms in as q falls (×1 at the launch's 0.85, ×FLAT_ZOOM flat), so the flattened stack,
 * portrait, fills the screen — its window 2 × 480 px tall, its lit falloff reaching past the left and right edges (final.md §4 2.3).
 */
export const FLAT_ZOOM = 1.18;
export const flatZoom = (q: number): number => 1 + (FLAT_ZOOM - 1) * clamp((0.85 - q) / 0.84);
/** Screen scale of a sheet at world depth z seen by camera c (px per unit), or Infinity behind the camera. */
export const scaleAt = (c: GateCamera, z: number): number => (c.eye - z > 0 ? c.focal / (c.eye - z) : Infinity);

// ——— The press passes —————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The paper of each press state: 0 the Riso paper (the inks multiply), 1–4 the passes' darker papers (the inks are light). */
export const GROUND_HEX: readonly string[] = ['#F2EDE3', ...PRESS_PASSES.map((p) => p.paper)];
/** How much the inks light up in each state (0: they multiply, as ink). */
export const LIGHT: readonly number[] = [0, ...PRESS_PASSES.map((p) => p.light)];
/** Frames a pass's dark front takes from the sun to the corners. */
export const FRONT_FRAMES = 6;

/** The press state at instant f: `inner` inside the front (radius px from the vanishing point), `outer` outside it; no front: radius ∞. */
export function pressAt(f: number): { inner: number; outer: number; radius: number } {
  let j = 0;
  let jp = -1;
  let u = 0;
  // Taken at the output frame (frameOf): the kick's frame shows the front whole, already 40 % of the way out.
  const d = frameOf(f);
  PRESS_PASSES.forEach((p, i) => {
    if (d < p.at) return;
    const t = Math.max(0, f - p.at);
    if (t >= FRONT_FRAMES) j = i + 1;
    else {
      jp = i + 1;
      u = t / FRONT_FRAMES;
    }
  });
  // The front grows over its 6 f (final.md §4 bar 14): past the sun on the kick (r 520: the kick's frame darkens), decelerating
  // to the corners by its 6th frame — the roller's pace, a wipe you watch, not a cut.
  return jp > 0 ? { inner: jp, outer: j, radius: lerp(520, 1150, 1 - (1 - u) ** 1.7) } : { inner: j, outer: j, radius: Infinity };
}

// ——— The films and the gates ——————————————————————————————————————————————————————————————————————————————————————————————————

export type GateFilm = {
  /** Its place in the stack (z = filmZ(n)); a gate: −1 − its index. */
  n: number;
  kind: 'film' | 'gate';
  plate: PlateIndex;
  /** `copy k/∞` (films). */
  edition: number;
  /** The window's centre, world units. */
  x: number;
  y: number;
  z: number;
  /** Its twist (radians, counter-clockwise). */
  rot: number;
  /** How far out from the window edge its ink has printed (units: 14 the rule only … 600 everything). */
  reach: number;
  alpha: number;
  /** The chase light on its rule (0–1). */
  hot: number;
  /** Behind the passes, how brightly its lines (rule, guilloche, strip edges) are lit: only the near sheets streak hot (glowOf). */
  glow: number;
  /** … and its knock-outs (the lit faces, glints and gate faces: the brightest marks, fading less with depth; knockGlowOf). */
  knockGlow: number;
  /** How flat the stack is (0 in flight → 1 flattened by the reverse Vertigo): unsmeared, its rules, bands and falloff glow whole. */
  flat: number;
  /** Its strip and guilloche band along the frame (units, + clockwise). */
  scroll: number;
  /** ⊕ printed solid: bit 0 top-right, 1 bottom-right, 2 bottom-left. */
  targets: number;
  /** Characters of the signature slug typed up its left window edge (film 1 only). */
  slug: number;
  /** A gate's two knocked-out faces (GATE_FACES indices: top, bottom). */
  faces: readonly [number, number];
};

/** The waltz's strip position (units along the frame) for a film of `plate` at instant f: three steps (back and forth), then the spin. */
export function scrollAt(plate: PlateIndex, f: number): number {
  const dir = plate === 1 ? -1 : 1;
  const [w0, w1, w2] = WALTZ_STEPS;
  const steps = waltzStep(f - w0) - waltzStep(f - w1) + waltzStep(f - w2);
  return dir * (SLOT * steps + spinTravel(f));
}
/** The spin's travel (units): 0 → SPIN_SPEED over 1.2& → 1.3, held to 1.3&, back to 0 by 1.4 (SPIN). */
export function spinTravel(f: number): number {
  const a = SPIN.from;
  const ramp = LAUNCH - SPIN.from; // 12 f
  const b = a + ramp;
  const c = SPIN.to - ramp;
  const e = SPIN.to;
  const V = SPIN_SPEED;
  if (f <= a) return 0;
  if (f < b) return (V * (f - a) ** 2) / (2 * ramp);
  if (f < c) return (V * ramp) / 2 + V * (f - b);
  if (f < e) return (V * ramp) / 2 + V * (c - b) + V * ((f - c) - (f - c) ** 2 / (2 * ramp));
  return V * ramp + V * (c - b);
}
/** The knocked-out faces' pose (FILM_POSES pair index): they swap in unison on every waltz step (whole on the step's frame). */
export const poseAt = (f: number): number => WALTZ_STEPS.filter((w) => frameOf(f) >= w).length % 2;

/** The ⊕ marks printed solid at instant f (TARGETS: top-right on 1.1& for 4 f, bottom-right on 1.2 for 4 f, bottom-left while C5 holds). */
export function targetsAt(f: number): number {
  const d = frameOf(f);
  const bit = { tr: 1, br: 2, bl: 4 } as const;
  return TARGETS.reduce((m, t) => (d >= t.at && d < (t.to ?? t.at + 4) ? m | bit[t.corner] : m), 0);
}
/** The slug's typed characters at instant f (typed over 15 frames, its first characters on the transition's first frame; gone at the crash). */
export const slugChars = (f: number, length: number): number => (f >= SLUG_WINDOW.to || f < SLUG_WINDOW.from ? 0 : Math.ceil(clamp((f - SLUG_WINDOW.from + 1) / 15) * length));

/** The chase light at distance D ahead at instant f: every rule lights in turn from the sun to the lens in 8 f (1.3&, 1.4&). */
export function chaseAt(D: number, f: number): number {
  const c = CHASE_LIGHTS.find((x) => f >= x && f < x + 8);
  if (c === undefined) return 0;
  const p = lerp(RIM_D, GATE_AHEAD, (f - c) / 8);
  return Math.max(0, 1 - Math.abs(D - p) / 26);
}

/** Aerial perspective down the tunnel: a sheet's ink fades to 40 % between 400 and the sun's rim (the sun stays clean, the depth reads). */
export const depthFade = (D: number): number => 1 - 0.6 * clamp((D - 400) / (RIM_D - 400)) ** 1.5;

/**
 * Behind the passes only the near sheets streak hot: a sheet's lines are lit whole up to 200 ahead (its rule then at the frame's edge)
 * and fade to FAR_GLOW by 300 (two gate spacings), so the dense far sheets round the sun never sum to an even glow: the tunnel's depth
 * reads as the ink's dark bands, its speed as the near tubes' streaks (final.md §4 bar 14: neon in the dark).
 */
export const FAR_GLOW = 0.2;
export const glowOf = (D: number): number => 1 - (1 - FAR_GLOW) * sF((D - 200) / 100);
/**
 * The knock-outs (the lit faces, glints, the gates' faces) are the brightest marks where they read: mid-tunnel (250 – 400 ahead, slow
 * enough to streak crisp) whole, fading to 0.7 toward the sun; the nearest sheets' big faces, smeared over hundreds of px, would only
 * be a grey veil, so they dim to 0.35 (their rules' beads streak instead).
 */
export const knockGlowOf = (D: number): number => 0.35 + 0.65 * sF((D - 180) / 120) - 0.3 * sF((D - 350) / 250);

/** Flattened, the whole stack overprints in one frame, every sheet at one depth: its light is scaled so the overprint glows in its colours. */
export const REVERSE_GLOW = 0.5;
/** How flat the stack is at instant f: 0 on the crash (the flight's sharp tubes) → 1 by the reverse Vertigo's 5th step (+12). */
export const flatAt = (f: number): number => (f < CRASH ? 0 : clamp(reverseStep(f).i / 4));

/** The chase light's pulses on screen at instant f: each lit film's rule as a rectangle (centre, half-size, turn, its rule's width), and how hot. */
export function chaseRects(f: number): { x: number; y: number; hw: number; hh: number; rot: number; width: number; hot: number }[] {
  const cam = cameraAt(f);
  const c = Math.cos(cam.roll);
  const s = Math.sin(cam.roll);
  return filmsAt(f, 0)
    .filter((x) => x.hot > 0 && x.kind === 'film')
    .slice(0, 3)
    .map((x) => {
      const k = scaleAt(cam, x.z);
      return { x: cam.vp[0] + (c * x.x - s * x.y) * k, y: cam.vp[1] + (s * x.x + c * x.y) * k, hw: (WINDOW.a + 7) * k, hh: (WINDOW.b + 7) * k, rot: cam.roll + x.rot, width: 14 * k, hot: x.hot };
    });
}

/** Where gate i sits on the axis (placed so it is GATE_AHEAD from the camera on its hit, the kick surges included). */
export const gateZ = (G: number): number => LAUNCH_D - travel(G) - GATE_AHEAD;

/** Every film and gate drawn at instant f (empty from the cross: the slit is a post on the frozen flat page). */
export function filmsAt(f: number, slugLength: number): GateFilm[] {
  const phase = phaseAt(f);
  if (phase === 'cross' || phase === 'point') return [];
  const cam = cameraAt(f);
  const out: GateFilm[] = [];
  const base = (n: number): Omit<GateFilm, 'z' | 'reach' | 'alpha' | 'hot' | 'glow' | 'knockGlow' | 'flat'> => {
    const plate = plateOf(n);
    const [x, y] = offsetOf(n);
    return { n, kind: 'film', plate, edition: editionOf(n), x, y, rot: twistOf(n), scroll: scrollAt(plate, f), targets: targetsAt(f), slug: editionOf(n) === 1 ? slugChars(f, slugLength) : 0, faces: [0, 0] };
  };
  if (phase === 'page') {
    const q = dollyQ(f);
    for (let n = 5; n <= 22; n++) {
      const b0 = bornOf(n);
      if (frameOf(f) < b0) continue;
      const k = editionOf(n);
      const slot = filmZ(n);
      let z: number;
      let reach: number;
      if (k <= 9) {
        // Pasted onto the page, it peels toward the lens; its ink wipes out from the window edge (L: 75 % by +3, all by +8).
        z = slot * cO((f - b0) / 8);
        reach = 14 + (OUTER - 14) * Math.min(1, L(f - b0));
      } else {
        // Auto-repeat: it slides out of the sun's rim (a window there hugs the sun) into its gap in 6 f.
        const rim = (-0.282 * 400) / Math.max(q, 0.2);
        z = lerp(rim, slot, cO((f - b0) / 6));
        reach = 14 + (OUTER - 14) * Math.min(1, L(f - b0));
      }
      out.push({ ...base(n), z, reach, alpha: 1, hot: 0, glow: 1, knockGlow: 1, flat: 0 });
    }
    return out;
  }
  if (phase === 'flight') {
    // Film n is cam.eye − filmZ(n) ahead: the ones between the lens and the sun's rim.
    const nMax = Math.floor((RIM_D - cam.eye + filmZ(0)) / FILM_GAP);
    for (let n = 5; n <= nMax; n++) {
      // The auto-repeat runs on into the flight: a film pasted after the launch streams out of the sun's rim toward its gap (6 f) —
      // which the camera has already passed, so it flies at the lens: the duplicator feeding sheets at us.
      const b0 = n <= 22 ? bornOf(n) : LAUNCH;
      if (frameOf(f) < b0) continue;
      const z = b0 > LAUNCH ? lerp(cam.eye - RIM_D, filmZ(n), cO((f - b0) / 6)) : filmZ(n);
      const D = cam.eye - z;
      if (D < NEAR_D) continue;
      // Born at the sun's rim: the rule first, the bands printing out as it comes (the films beyond the page are pasted on the launch).
      const fromRim = clamp((RIM_D - D) / 60);
      // The six films beyond the old page are pasted whole on the launch's kick (the tunnel has no gap from its first frame).
      const onLaunch = 1;
      const reach = 14 + (OUTER - 14) * Math.min(cO(fromRim), onLaunch);
      // The films pasted beyond the old page print hard on the launch's kick, then recede into the tunnel's haze over 12 f.
      const fade = n >= 23 ? lerp(1, depthFade(D), clamp((f - LAUNCH) / 12)) : depthFade(D);
      out.push({ ...base(n), z, reach: b0 > LAUNCH ? 14 + (OUTER - 14) * Math.min(1, L(f - b0)) : reach, alpha: clamp((RIM_D + 6 - D) / 6) * fade, hot: chaseAt(D, f), glow: glowOf(D), knockGlow: knockGlowOf(D), flat: 0 });
    }
    GATES.forEach((G, i) => {
      const z = gateZ(G);
      const D = cam.eye - z;
      if (D <= NEAR_D * 0.42 || D > RIM_D) return;
      const plate: PlateIndex = i % 2 ? 1 : 0;
      out.push({
        n: -1 - i, kind: 'gate', plate, edition: 0, x: 0, y: 0, z, rot: twistOf(31 + i), reach: OUTER, alpha: clamp((RIM_D + 6 - D) / 6) * depthFade(D), hot: 0, glow: glowOf(D), knockGlow: knockGlowOf(D), flat: 0, scroll: 0, targets: 0, slug: 0,
        faces: [i % 3, (i + 1) % 3],
      });
    });
    return out;
  }
  // The reverse Vertigo: the stack as the crash left it (every film then 60 – 614 ahead), flattening about the plane LAUNCH_D ahead; its
  // light goes from the flight's (near hot, far dim) to one even glow as the depth goes.
  const eyeC = LAUNCH_D - CRASH_TRAVEL();
  const flat = flatAt(f);
  const [n0, n1] = reverseFilms();
  for (let n = n0; n <= n1; n++) {
    const z = filmZ(n);
    if (eyeC - z <= 0) continue;
    if (scaleAt(cam, z) > 5.5) continue;
    const D = eyeC - z;
    out.push({ ...base(n), z, reach: OUTER, alpha: 1, hot: 0, glow: lerp(glowOf(D), REVERSE_GLOW, flat), knockGlow: lerp(knockGlowOf(D), REVERSE_GLOW, flat), flat });
  }
  return out;
}

/** A sheet at depth z seen by camera c is wholly off screen once its window's inscribed circle holds the frame (with its loose register). */
export const offScreen = (c: GateCamera, z: number): boolean => scaleAt(c, z) > 5.5;

// ——— The sun, the flare, the ghosts, the rings (the lens: screen space) —————————————————————————————————————————————————————————

export type GateSun = {
  /** 'page': the Riso print's own shapes (pagePose); 'ink': discs multiplied on the paper; 'light': discs as light on the dark. */
  mode: 'page' | 'ink' | 'light';
  /** The centre (screen px) and the yellow disc's radius. */
  x: number;
  y: number;
  r: number;
  /** The pink core's radius and its offset from the centre; the yellow's offset (its plate sliding off). */
  core: number;
  pink: readonly [number, number];
  yellow: readonly [number, number];
  yellowAlpha: number;
  pinkAlpha: number;
  /** The white-hot middle (light mode). */
  white: { r: number; alpha: number };
  /** 0 → 1 over 2.2 (the sun heats to an orange-white core). */
  hot: number;
  /** The blue keyline (from the lurch): its outer radius, width, alpha. */
  keyline: { r: number; width: number; alpha: number };
};

/** The sun's radius at instant f: the page's (178 at the launch), 200 by 2.1&, 240 on 2.2 (L), then the reverse Vertigo's steps. */
export function sunRadius(f: number): number {
  if (f < LAUNCH) return page().sun.r * pageZoom(f);
  const r0 = page().sun.r * pageZoom(LAUNCH);
  if (f < at(2, 2)) return lerp(r0, 200, clamp((f - LAUNCH) / (at(2, 2) - 1 - LAUNCH)));
  if (f < CRASH) return 200 + 40 * L(f - at(2, 2));
  if (f < CROSS) {
    const { i, e } = reverseStep(f);
    return REVERSE_VERTIGO[i].sunR * (e < 1 ? 0.94 : 1);
  }
  if (f < POINT) return SLIT[slitIndex(f)].sunR;
  return 5;
}
const firstShed = (what: string): number => SUN_SHEDS.find((s) => s.what === what)!.at;
const lastShed = (what: string): number => SUN_SHEDS.filter((s) => s.what === what).pop()!.at;
/** The end of the held C5 (the sun's keyline swells over it; the bottom-left ⊕ prints while it holds). */
export const C5_HELD = WALTZ.find((n) => n.note === 'C5')!;

/** The sun at instant f (null from the cross: the slit and the point draw their own). */
export function sunAt(f: number): GateSun | null {
  if (f >= CROSS) return null;
  const r = sunRadius(f);
  const hot = Math.min(1, L(f - at(2, 2)));
  const swell = 1 + 0.04 * sF((f - C5_HELD.at) / 20) * (f < C5_HELD.to ? 1 : 1 - clamp((f - C5_HELD.to) / 6));
  const keyAlpha = clamp((f - VERTIGO) / 3);
  if (phaseAt(f) === 'page') {
    const [x, y] = pageSunScreen(f);
    return { mode: 'page', x, y, r, core: r * 0.6, pink: [0, 0], yellow: [0, 0], yellowAlpha: 1, pinkAlpha: 1, white: { r: 0, alpha: 0 }, hot: 0, keyline: { r: r * (162 / 150) * swell, width: 10, alpha: keyAlpha } };
  }
  const [x, y] = vpAt(f);
  // The page's plates ease into register with the vanishing point; in flight they shake apart with the speed; on the crash they clack home.
  const p = page();
  const z = pageZoom(LAUNCH);
  const settle = 1 - sF((f - LAUNCH) / (at(2) - LAUNCH));
  const v = speedAt(f) / 24;
  const pink: [number, number] = [
    (p.core.x - p.sun.x) * z * settle + 5 * v * noise1((f - TRANSITION_START) / 3, 7),
    (p.core.y - p.sun.y) * z * settle + 5 * v * noise1((f - TRANSITION_START) / 3, 8),
  ];
  const mode: GateSun['mode'] = frameOf(f) >= PRESS_PASSES[0].at ? 'light' : 'ink';
  let yellowAlpha = 1;
  let pinkAlpha = 1;
  let yellow: [number, number] = [0, 0];
  let white = { r: r * (0.42 + 0.08 * hot), alpha: 1 };
  if (f >= CRASH) {
    pink[0] = 0;
    pink[1] = 0;
    const y0 = firstShed('yellow');
    const ys = clamp((frameOf(f) - y0) / (lastShed('yellow') - y0));
    yellowAlpha = 1 - ys;
    yellow = [30 * ys, -30 * ys];
    const p0 = firstShed('pink');
    const ps = clamp((frameOf(f) - p0) / (lastShed('pink') - p0));
    pinkAlpha = 1 - ps;
    pink[1] = -40 * ps;
    if (frameOf(f) >= p0) white = { r: r * 0.9, alpha: 1 };
  }
  return { mode, x, y, r, core: r * 0.6, pink, yellow, yellowAlpha, pinkAlpha, white, hot, keyline: { r: r * (162 / 150) * (f < at(2) ? swell : 1), width: mode === 'ink' ? 8 : 6, alpha: mode === 'ink' ? 0.8 : 0.35 } };
}

/**
 * The flare (the lens's: always horizontal): born whole on gate 1's snare (a snap: 6 % long on its frame), half 700 px, 8 → 10 px; it
 * lengthens to 960 as the sun shrinks. As light its soft glow brightens with the inks on 2.2 (0.35 → 0.6: final.md §4 2.2, still thin).
 */
export function flareAt(f: number): { half: number; width: number; glow: number } | null {
  if (frameOf(f) < FLARE_BORN || f >= CROSS) return null;
  const glow = frameOf(f) >= at(2, 2) ? 0.6 : 0.35;
  if (f < CRASH) return { half: 700 * (frameOf(f) === FLARE_BORN ? 1.06 : frameOf(f) === FLARE_BORN + 1 ? 1.02 : 1), width: f < at(2) ? 8 : 10, glow };
  return { half: lerp(700, 960, clamp((f - CRASH) / (lastShed('paper') - CRASH))), width: 10, glow };
}

/** The Riso lens ghosts on the flare axis from 2.1: hexagons of halftone (radius, plate, x), sliding a little. */
export const GHOSTS: readonly { r: number; plate: PlateIndex | 3; x: number }[] = [
  { r: 60, plate: 3, x: -260 },
  { r: 110, plate: 1, x: 330 },
  { r: 160, plate: 0, x: -540 },
  { r: 220, plate: 1, x: 780 },
];
export function ghostsAt(f: number): { x: number; r: number; plate: PlateIndex | 3; alpha: number }[] {
  if (f < PRESS_PASSES[0].at || f >= CROSS) return [];
  const j = pressAt(f).inner;
  // The slam (v07): they ride the closing page in toward the axis and go out with it.
  const s = squashAt(f) ?? 1;
  return GHOSTS.map((g, i) => ({ x: (g.x + Math.sin((f - TRANSITION_START) * 0.05 + i) * 14) * s, r: g.r, plate: g.plate, alpha: (0.22 + 0.1 * (j > 2 ? 1 : 0)) * s }));
}

/** The sun sings: a ring r → r + 60 over 10 f on every waltz note from the flare's birth; it holds at + 40 while C5 holds in bar 2. */
export function ringsAt(f: number): { r: number; width: number; alpha: number }[] {
  if (f < FLARE_BORN || f >= CROSS) return [];
  const R = sunRadius(f);
  const held = WALTZ.filter((n) => n.note === 'C5').pop()!;
  const out: { r: number; width: number; alpha: number }[] = [];
  for (const w of SINGS) {
    const t = f - w;
    if (t < 0) continue;
    const hold = w === held.at && f < held.to;
    if (!hold && t >= 10) continue;
    const e = hold ? Math.min(1, t / 6) : cO(t / 10);
    // The first song (C6 on gate 1's snare, the flare's birth) rings wide: the sun's first note.
    const first = w === SINGS[0];
    out.push({ r: R + (hold ? 40 : first ? 150 : 60) * e + (first ? 12 : 0), width: first ? 9 : 5, alpha: hold ? 0.7 : 1 - t / 10 });
  }
  return out;
}

// ——— The cross and the point ——————————————————————————————————————————————————————————————————————————————————————————————————

export const slitIndex = (f: number): number => clamp(Math.floor((frameOf(f) - CROSS) / 3), 0, SLIT.length - 1);
/** The ✦ cross at instant f: the flat page squashed into a vertical slit (width, half-height: × 1.06 on each step's first frame) × the flare. */
export function slitAt(f: number): { width: number; half: number; flareHalf: number; flareWidth: number; sunR: number; step: number } | null {
  if (f < CROSS || f >= POINT) return null;
  const i = slitIndex(f);
  const s = SLIT[i];
  const e = frameOf(f) - s.at;
  return { width: s.width, half: s.half * (e < 1 ? 1.06 : 1), flareHalf: s.flareHalf, flareWidth: s.flareWidth, sunR: s.sunR, step: i };
}
/** The point at instant f: its tremble (±1 px every 2 f), its warm halo (24 → 60 px), the faint ✦'s turn (2°/f), the breath (0 → 1). */
export function pointAt(f: number): { dx: number; dy: number; halo: number; star: number; breath: number } | null {
  if (f < POINT) return null;
  const e = sF((f - POINT) / (TRANSITION_END - POINT));
  const j = Math.floor((frameOf(f) - POINT) / 2);
  return { dx: hash(j, 1) < 0.5 ? -1 : 1, dy: hash(j, 2) < 0.5 ? -1 : 1, halo: 24 + 36 * e, star: (f - POINT) * 2 * DEG + Math.PI / 4, breath: e };
}

// ——— v07 WP5: the run-up into the bang as one inward motion (continuity plan §7; FW5) ————————————————————————————————————————————
// v06 lost the hand-off at 1×: the flat page vanished between two frames (2.4), then 24 near-black frames held a 5 px point, and the
// bang's white came from nowhere. Now everything flows into the point and out of it: the page SLAMS shut sideways into the slit over
// the reverse Vertigo's last 32nd (an impact, so 2.4 is its landing, not a cut); from the cross the printed space POURS into the point
// (the specks contract, accelerating); in the vacuum the sun's three shed plates come back as misregistered guilloche rings, converging
// on the point and landing where the bang prints (his Y/P/B ghosts' offsets, its shock ring's start radius) — the inhale the bang exhales.

/** The slam: from the reverse Vertigo's last step to the cross (one 32nd). */
export const SLAM = { from: CROSS - 3, to: CROSS } as const;
/** The page the slam squashes: the flat page on the cross's previous frame (settled; before the last pass's kick darkens its middle). */
export const SLAM_PAGE = CROSS - 1;
/** The page's width at the slit (its 3 W of the frozen page's 1920 px). */
export const SLAM_SLIT = (3 * SLIT[0].width) / 1920;
/**
 * The flat page's width (share of the frame) at instant f while it slams shut sideways into the slit, or null outside the slam: an
 * impact (u^2.4, the house's Im) taken at the output frame — 1 on the step's own frame, 0.93, 0.64, then the slit (0.028) on the cross:
 * the kick's frame (2.4) carries the biggest change.
 */
export function squashAt(f: number): number | null {
  const d = frameOf(f);
  if (d <= SLAM.from || d >= SLAM.to) return null;
  const u = (d - SLAM.from) / (SLAM.to - SLAM.from);
  return 1 - (1 - SLAM_SLIT) * u ** 2.4;
}

/** How far the printed space has poured into the point (its scale about the centre): 1 on the cross → 1 − INHALE_DEPTH at the bang. */
export const INHALE_DEPTH = 0.45;
export const inhaleScale = (f: number): number => 1 - INHALE_DEPTH * clamp((f - CROSS) / (TRANSITION_END - CROSS)) ** 2;

/** The sun's shed plates as rings in the vacuum, misregistered by the bang's ghost offsets (cosmosBang whiteAt: 45 px, y up). */
export const PLATE_RINGS: readonly { plate: 'yellow' | 'pink' | 'blue'; dx: number; dy: number; lag: number }[] = [
  { plate: 'yellow', dx: -45, dy: 18, lag: 0 },
  { plate: 'pink', dx: 45, dy: -22.5, lag: 1 },
  { plate: 'blue', dx: 13.5, dy: 45, lag: 2 },
];
/** The rings converge from beyond the corners onto the bang's shock-ring start (cosmosBang whiteAt ring: 300 px on 1.1). */
export const INHALE_RING = { from: 1250, to: 300 } as const;
/**
 * The plate rings at instant f (taken at the output frame: crisp, as the vacuum's one-sample frames are): each converges as an
 * impact (u^1.6) from INHALE_RING.from to .to over the vacuum, the pink leaving a frame and the blue two after the yellow (a press's
 * plates in turn) and all three landing together on the vacuum's last frame, fading in over their first 3 frames; none outside it.
 */
export function plateRingsAt(f: number): { plate: 'yellow' | 'pink' | 'blue'; x: number; y: number; r: number; alpha: number }[] {
  if (f < POINT || f >= TRANSITION_END) return [];
  const d = frameOf(f);
  const last = TRANSITION_END - 1;
  return PLATE_RINGS.map((p) => {
    const u = clamp((d - POINT - p.lag) / (last - POINT - p.lag));
    return { plate: p.plate, x: p.dx, y: p.dy, r: lerp(INHALE_RING.from, INHALE_RING.to, u ** 1.6), alpha: clamp((d - POINT + 1) / 3) };
  });
}

/** The printed space's paper specks at instant f: their alpha and scale about the centre (from the cross they pour into the point). */
export function specksAt(f: number): { alpha: number; scale: number; density: number } {
  if (f >= POINT) {
    const e = sF((f - POINT) / (TRANSITION_END - POINT));
    return { alpha: 0.45 + 0.2 * e, scale: inhaleScale(f), density: 1 };
  }
  // Behind the passes a sparse printed starfield (fixed to the paper, so it never fights the flight's motion); denser as the lights go out.
  if (f >= CROSS) return { alpha: 0.06 + 0.2 * clamp((f - CROSS) / (POINT - CROSS)), scale: inhaleScale(f), density: 1 };
  return { alpha: 0.3, scale: 1, density: f >= CRASH ? 0.6 : 0.3 };
}

/** The last closed hat struck by instant f and the frames since (4 % of the knock-outs twinkle on each). */
export function hatAt(f: number): { index: number; age: number } {
  const d = frameOf(f);
  const i = HATS.filter((h) => h <= d).length - 1;
  return i < 0 ? { index: -1, age: 99 } : { index: i, age: f - HATS[i] };
}

/** Everything the transition draws at instant f. */
export type GateFrame = {
  phase: Phase;
  camera: GateCamera;
  press: { inner: number; outer: number; radius: number };
  sun: GateSun | null;
  films: GateFilm[];
  flare: ReturnType<typeof flareAt>;
  ghosts: { x: number; r: number; plate: PlateIndex | 3; alpha: number }[];
  rings: { r: number; width: number; alpha: number }[];
  slit: ReturnType<typeof slitAt>;
  point: ReturnType<typeof pointAt>;
  specks: { alpha: number; scale: number; density: number };
  /** v07: the slam's page width (null outside it) and the vacuum's converging plate rings. */
  squash: number | null;
  plateRings: ReturnType<typeof plateRingsAt>;
  pose: number;
  hat: { index: number; age: number };
  chase: ReturnType<typeof chaseRects>;
};

/** The frame state at instant f (camera at `cam`, the shutter's instant for the camera; equal to f inside the shutter). */
export function gateFrame(f: number, slugLength: number): GateFrame {
  return {
    phase: phaseAt(f),
    camera: cameraAt(f),
    press: pressAt(f),
    sun: sunAt(f),
    films: filmsAt(f, slugLength),
    flare: flareAt(f),
    ghosts: ghostsAt(f),
    rings: ringsAt(f),
    slit: slitAt(f),
    point: pointAt(f),
    specks: specksAt(f),
    squash: squashAt(f),
    plateRings: plateRingsAt(f),
    pose: poseAt(f),
    hat: hatAt(f),
    chase: chaseRects(f),
  };
}

// ——— The photography: the star gate's slit-scan ————————————————————————————————————————————————————————————————————————————————

/** Sub-frames a frame of the shutter and its tail (the house rule's density: consecutive sub-frames a stroke apart at 24 units/f). */
export const SLIT_SCAN_DENSITY = 32;
/** How strong the tail is against the shutter (below 1 a long tail stays a trail of light instead of a double exposure). */
export const SLIT_SCAN_AFTERGLOW = 0.6;
/** The tail's decay (frames) at speed v (units/f): it grows with the speed, so each doubling of the roll stretches the light further. */
export const slitScanTail = (v: number): number => clamp(0.06 * v, 0.6, 1.8);
/** Frames the tail takes to grow back after each kick of bar 2 (the kick's frame is the shutter alone: the hit lands sharp). */
export const SLIT_SCAN_REGROW = 8;
/**
 * The transition's photography (cosmosKit's transitionTemporal: the score's SUBFRAMES), with the star gate's slit-scan: behind the press
 * passes (2.1 → the crash) the shutter (0.75) keeps a phosphor tail into the past whose decay grows with the speed, so at 12 and 24
 * units a frame the lit rules, faces and gates leave long streaks of light (the 2001 slit-scan; design final.md §4 bar 14: the films
 * smear into continuous streak walls of pink, cyan and paper-white light). Each kick resets it (SLIT_SCAN_REGROW), so the kick's frame
 * lands sharp on the drum; the crash stop is a segment edge, so its frame is sharp too.
 */
export function gateTemporal(frame: number): Temporal {
  const base = transitionTemporal(frame);
  if (frame < PRESS_PASSES[0].at || frame >= CRASH) return base;
  // Each kick (each press pass) resets the exposure: its frame is sharp, then the streaks grow back with the speed.
  const k = lastAtOrBefore(KICKS.filter((x) => x < CRASH), frame);
  const persistence = slitScanTail(speedAt(frame)) * clamp((frame - k) / SLIT_SCAN_REGROW);
  if (persistence <= 0) return base;
  const window = base.shutter + 3 * persistence;
  return { samples: Math.max(base.samples, Math.ceil(window * SLIT_SCAN_DENSITY)), shutter: base.shutter, persistence, afterglow: SLIT_SCAN_AFTERGLOW };
}

/** The instant whose flat page the cross squashes: the last instant before the cross (the reverse Vertigo's last step, settled). */
export const FROZEN_PAGE = CROSS - 1e-3;
