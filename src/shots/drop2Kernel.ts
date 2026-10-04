// S31K KERNEL, drop2 8.1 → 9.1 − 1 (2.5D; builder K, written by the act-1 fixer in round 1: R1, R1-T01). Build sheet
// notes/bid2/drop2-sheet2.md §3 "drop2 8", §4.4, §5 #9–#10, §6.3; design notes/extend/drop2-final.md §4.6.
//   −2,147,483,648 = 0x80000000, the first address of kernel space: the overflow's whip-pan lands him in Defender's home, a one-point
//   nave of sixteen red process pillars (`scan()` … `trust()`, `firewall()` … `main()`) over a floor of receding addresses, its far end a
//   core ring with Defender v1's avatar (￣ω￣;) and `defender.sys v1.0`.
//   8.1   the whip lands him at (960, 640), 628 px (the overflow's 600 px of ink), squashed 1.08 / 0.92, the fling's spin ringing out; the
//         overflow's green @ flood pours in from the left, its front tipping `scan()`; the dolly launches down the nave (0 → 60 u/f by 8.1&).
//   8.1&  THE DOMINOES: each pillar is struck by the one before it a 16th apart (the left row on the 16ths, the right a 32nd later) and
//         falls toward the core, landing on its clack; as it falls its ║ flip to ω from the base up (6 f, his amber on Defender's red); on
//         the floor it bursts into 40 glyph fragments. The flood front rides the chain at its speed (a pillar a 16th) and he surfs it.
//   8.2   Defender scans a beat late: a red scan plane races up the nave from the core and through us; the flood bends its lower edge
//         into an ω.
//   8.3   the dolly lands: he is at (960, 540), 600 px, inside the core ring (Ø ≈ 900); `trust()` and `main()` fall across the ring
//         (8.3&, 8.3& + 3) and on 8.3a the ring cracks at 12 o'clock into an ω (amber); the flood laps the ring's edge.
//   8.4   HANG: `defender.sys v1.0 (not responding)`: a 20 % grey veil over all but him, the flood frozen and breathing ±1 %, the
//         fragments frozen in the air; he alone moves (a living hold; the camera creeps 1 % a beat).
//   8.4&  INSTALL: the act's hairline lifts to y 540 (3 f, 2 → 24 px) and fills on the 32nds; left of its white-hot edge the picture is
//         Defender's slate X-ray (his left half X-ray, his right still amber; the cracked ring drawn as v2.0's reticle, same centre and
//         size); on 9.1 − 1 the bar folds into the reticle's crosshair: the hard cut on 9.1 is a match (sheet §5 #10, §6.3).
// Pure (Node tests import it): every frame from the score's names (part-local through at(): nothing hard-coded); every random draw
// hashed from seedFrame(). The nave's world: x right, y up, z toward the camera, 1 unit = 1 px at the start pose's z = 0 plane; the
// screen layers: px at 1080p, origin at the centre, y up; "layout": top-left origin, y down. GPU: src/scenes/drop2Kernel.ts.
import { S31_GAUGE } from '../content/castDrop2.ts';
import { AVATAR, HERO2, KERNEL_TEXT, READOUT2 } from '../content/drop2.ts';
import { type Pose, fillDistance } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import { type Look, mixLook } from '../engine/types.ts';
import { CORE_CRACK, DOMINOES_L, DOMINOES_R, GAME, HANG, HATS2, HOOK2, INSTALL, INSTALL_STEPS, KERNEL, KERNEL_DOLLY, KERNEL_SCAN, MARCH, SWITCH } from '../score/drop2.ts';
import { seedFrame } from '../score/film.ts';
import { LAW, PALETTES, type Point, drop2Segment, flow } from './drop2Shared.ts';
import { hairlineAt } from './drop2Monitor.ts';
import { KERNEL_ADVANCE, KERNEL_LANDING, KERNEL_LOOK_IN, wrapAt } from './drop2Overflow.ts';
import { reticleAt, switchLook } from './drop2Switch.ts';
import { FACE_ADVANCE, FACE_CHAR_ADVANCE, FACE_PARTS } from './drop2SwitchType.ts';
import { RAMP } from './hud.ts';

const T0 = KERNEL.from;
const END = SWITCH.from;
/** The part's last frame: the hard cut into the switch follows (a segment boundary). */
export const KERNEL_LAST = END - 1;
/** Discrete changes (typed text, a step) are whole on their output frame. */
const frameOf = (f: number): number => Math.floor(f + 0.5);
/** A hit that decays over `n` frames from `at` (1 on it, 0 from at + n; nothing before). */
const decay = (f: number, at: number, n: number): number => (f < at ? 0 : (1 - clamp((f - at) / n)) ** 2);

// ——— Inks (linear light) ———————————————————————————————————————————————————————————————————————————————————————————————————————

const K = PALETTES.kernel;
const POV = PALETTES.pov;
/** The live kernel: Defender's emissive red (dark ground: ×1.6, it blooms), his amber (as the overflow drew him), the flood's green. */
export const INK = {
  ground: linear(K.ground),
  red: linear(LAW.defender.emissive, LAW.defender.emissiveGain),
  redDim: linear(LAW.defender.emissive, 0.55),
  amber: linear(LAW.hero, 1.35),
  hero: linear(LAW.hero, 1.7),
  green: linear(K.flood),
  foam: linear(K.address, 1.25),
  address: linear(K.address),
  chip: linear('#06080A'),
  veil: linear(K.veil),
  grey: linear('#9AA3A0'),
  white: linear('#FFF6E0', 3),
} as const;
/** Defender v1's POV (design §4.5): the slate X-ray — a grade, dark stays dark; dense things bright, his ω (and every ω he infected) the hot spot. */
export const XRAY = {
  ground: linear(POV.slate),
  block: linear(POV.block),
  mid: linear('#6E828B'),
  light: linear('#A9BBC2'),
  ink: linear(POV.ink),
  hot: linear(POV.ink, 1.7),
  red: linear(LAW.defender.emissive, LAW.defender.emissiveGain),
  onBlue: linear(LAW.defender.onBlue),
} as const;
export type Skin = 'live' | 'xray';

// ——— The nave (world units) ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** The nave's lens: 50° vertical (a one-point perspective with depth), its focal length in px (1 unit = 1 px at this distance). */
export const FOVK = 50;
export const DK = fillDistance(1080, FOVK);
/**
 * The nave: the floor 420 below the eye (the vanishing point is the frame's centre, where the core ring frames him); the pillars ±710
 * (the nearest pair at layout x 250 / 1670 on 8.1), 420 deep apart, 1000 tall; the floor's lip at z −3300; the core ring's plane at −3600.
 */
export const NAVE = { floor: -420, x: 710, gap: 420, height: 1000, edge: -3300, core: -3600 } as const;

/** The dolly's speeds (u/f): 0 → 60 by the first clack (8.1&), 90 at its peak, landing on 8.3; then the creep, 1 % a beat (a living hold). */
const V_UP = DOMINOES_L[0] - T0;
const V_PEAK = V_UP + 16;
const V_LAND = KERNEL_DOLLY.to - T0;
const CREEP = 1;
/** The dolly's travel (world units) `t` frames after 8.1: closed forms of the speed curve above. */
export function travel(t: number): number {
  if (t <= 0) return 0;
  const a = 40 * V_UP;
  if (t <= V_UP) return 60 * t - (60 * V_UP * (1 - (1 - t / V_UP) ** 3)) / 3;
  const b = a + 60 * (V_PEAK - V_UP) + 30 * ((V_PEAK - V_UP) / 2);
  if (t <= V_PEAK) {
    const s = t - V_UP;
    const n = V_PEAK - V_UP;
    return a + 60 * s + 30 * (s / 2 - (n / (2 * Math.PI)) * Math.sin((Math.PI * s) / n));
  }
  const n = V_LAND - V_PEAK;
  const c = b + CREEP * n + ((90 - CREEP) * n) / 3;
  if (t <= V_LAND) {
    const s = t - V_PEAK;
    return b + CREEP * s + ((90 - CREEP) * n * (1 - (1 - s / n) ** 3)) / 3;
  }
  return c + CREEP * (t - V_LAND);
}
/** The camera's z at instant `f` (the eye at y 0, looking down −z). */
export const camZ = (f: number): number => DK - travel(f - T0);

/** The core ring's radius (world): Ø 900 on screen exactly on the part's last frame, where v2.0's reticle takes it over (sheet §6.3). */
export const CORE_R = (450 * (camZ(KERNEL_LAST) - NAVE.core)) / DK;

/** A floor tremor under each pillar's landing (world units up, decaying in 6 f). */
const LANDS: readonly number[] = [...DOMINOES_L, ...DOMINOES_R].sort((a, b) => a - b);
function tremor(f: number): number {
  let y = 0;
  for (const l of LANDS) if (f >= l && f < l + 10) y += 7 * Math.exp(-(f - l) / 2) * Math.cos(1.7 * (f - l));
  return y;
}
/** The dolly's bank: ±0.8° over its run, level on its landing (the ring centred). */
const bank = (f: number): number => ((0.8 * Math.PI) / 180) * Math.sin(Math.PI * clamp((f - T0) / (KERNEL_DOLLY.to - T0))) * Math.sin((Math.PI * (f - T0)) / 24);

/** The nave's camera at instant `f`. */
export function kernelPose(f: number): Pose {
  const z = camZ(f);
  const y = tremor(f);
  const r = bank(f);
  return { position: [0, y, z], target: [0, y, z - 1000], up: [Math.sin(r), Math.cos(r), 0], fov: FOVK };
}

/** Where world point `p` lands on screen (layout px) through `pose`, and its depth (null behind the near plane). */
export function project(pose: Pose, p: readonly [number, number, number]): { x: number; y: number; d: number } | null {
  const [px, py, pz] = pose.position;
  const [ux, uy] = pose.up;
  const d = pz - p[2];
  if (d < 1) return null;
  const k = DK / d;
  // The camera looks down −z; `up` rolls it (right = (uy, −ux)).
  const dx = p[0] - px;
  const dy = p[1] - py;
  const rx = dx * uy - dy * ux;
  const ry = dx * ux + dy * uy;
  return { x: 960 + rx * k, y: 540 - ry * k, d };
}

/** Depth fog: far things dim (1 near, 0.35 at the far end of the nave). */
const fog = (d: number): number => clamp(1 - (d - 1600) / 4200, 0.35, 1);

/** The kernel's own clock: real time until the hang, then frozen (its rate falls to 0 over 6 f): the flood, the fragments, the ring. */
export function kt(f: number): number {
  const h = HANG.from;
  if (f < h) return f;
  const s = Math.min(f - h, 6);
  return h + s - (s * s) / 12;
}

// ——— The pillars ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The 16 process pillars: each falls a 16th after the one before it struck it, 12 f, landing on its clack. */
export const FALL = DOMINOES_L[0] - T0;
export type Pillar = { side: -1 | 1; k: number; x: number; z: number; start: number; land: number; label: string };
export const PILLARS: readonly Pillar[] = DOMINOES_L.flatMap((_, k) => [
  { side: -1 as const, k, x: -NAVE.x, z: -NAVE.gap * k, start: DOMINOES_L[k] - FALL, land: DOMINOES_L[k], label: KERNEL_TEXT.left[k] },
  { side: 1 as const, k, x: NAVE.x, z: -NAVE.gap * k, start: DOMINOES_R[k] - FALL, land: DOMINOES_R[k], label: KERNEL_TEXT.right[k] },
]);
/** A pillar's glyphs: two ║ shafts (± a cell) of 11 rows and the capital ╔═╗; JetBrains Mono at 72 u, rows 1.2 em apart (the lines join). */
export const SHAFT = { size: 72, cell: 43.2, pitch: 86.4, rows: 11, base: 43 } as const;
/** The cells of a pillar, base first: [height along it, x offset, glyph]. */
export const PILLAR_CELLS: readonly { h: number; dx: number; ch: string; j: number }[] = [
  ...Array.from({ length: SHAFT.rows }, (_, j) => [-1, 1].map((s) => ({ h: SHAFT.base + j * SHAFT.pitch, dx: s * SHAFT.cell, ch: '║', j }))).flat(),
  ...['╔', '═', '╗'].map((ch, i) => ({ h: SHAFT.base + SHAFT.rows * SHAFT.pitch, dx: (i - 1) * SHAFT.cell, ch, j: SHAFT.rows })),
];
/** Its fall (radians toward the core: 0 standing, π/2 on the floor): accelerating, u², landing exactly on its clack. */
export const fallAt = (p: Pillar, f: number): number => (Math.PI / 2) * clamp((f - p.start) / FALL) ** 2;
/** The infection's climb: cell row j flips ║ → ω over 2 f from start + 2 + 6·j/11 (base first, the capital last, done in 6 f + 2). */
export const flipAt = (p: Pillar, j: number, f: number): number => clamp((f - (p.start + 2 + (6 * j) / SHAFT.rows)) / 2);

/** The 40 fragments a pillar bursts into on its landing: its own 25 cells and 15 splinters, each with its throw (hashed per pillar). */
export type Fragment = { h: number; dx: number; ch: string; vx: number; vy: number; vz: number; spin: number; size: number; rot: number };
const SPLINTERS = ['═', '╬', 'ω', '║', '═'];
export const FRAGMENTS: readonly (readonly Fragment[])[] = PILLARS.map((p) => {
  const seed = seedFrame(p.land);
  return Array.from({ length: 40 }, (_, i) => {
    const r = (n: number) => hash(seed, 8200 + p.side, i, n);
    const cell = i < PILLAR_CELLS.length ? PILLAR_CELLS[i] : null;
    return {
      h: cell ? cell.h : r(1) * NAVE.height,
      dx: cell ? cell.dx : (r(2) - 0.5) * 90,
      ch: cell ? 'ω' : SPLINTERS[Math.floor(r(3) * SPLINTERS.length)],
      vx: (r(4) - 0.5) * 14 - p.side * 2,
      vy: 5 + 11 * r(5),
      vz: -3 - 9 * r(6),
      spin: (r(7) - 0.5) * 0.5,
      size: SHAFT.size * (0.5 + 0.5 * r(8)),
      rot: (r(9) - 0.5) * 1.2,
    };
  });
});
const G = 1.2;
const REST = NAVE.floor + 14;

/** Fragment `fr` of pillar `p` at instant `f` (world), or null before the landing. Ballistic, one bounce-less landing, frozen with the hang. */
export function fragmentAt(p: Pillar, fr: Fragment, f: number): { x: number; y: number; z: number; rot: number; size: number; fresh: number } | null {
  const t = kt(f) - p.land;
  if (t < 0) return null;
  const x0 = p.x + fr.dx;
  const y0 = NAVE.floor + 40;
  const z0 = p.z - fr.h;
  const over = z0 + fr.vz * 8 < NAVE.edge; // thrown past the floor's lip: it falls into the dark
  const tl = (fr.vy + Math.sqrt(fr.vy * fr.vy + 2 * G * (y0 - REST))) / G;
  const fresh = decay(t, 0, 4);
  if (over || t < tl) {
    return { x: x0 + fr.vx * t, y: y0 + fr.vy * t - 0.5 * G * t * t, z: z0 + fr.vz * t, rot: fr.rot + fr.spin * t, size: fr.size, fresh };
  }
  const slide = 1.6 * (1 - Math.exp(-(t - tl) / 1.6));
  return { x: x0 + fr.vx * (tl + slide), y: REST, z: z0 + fr.vz * (tl + slide), rot: fr.rot + fr.spin * (tl + slide), size: fr.size, fresh };
}

// ——— The flood ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The flood front: it pours in from the left on 8.1 and rides the domino chain (a pillar a 16th), stopping at the floor's lip. */
export const FLOOD_SPEED = NAVE.gap / (DOMINOES_L[1] - DOMINOES_L[0]);
const FRONT0 = 200;
export const floodFront = (f: number): number => Math.max(NAVE.edge, FRONT0 - FLOOD_SPEED * (kt(f) - T0));
/** How far across the floor it has poured (world x of its leading edge): from off the left edge to past the right in 8 f. */
export const pourAt = (f: number): number => lerp(-1600, 1700, clamp((kt(f) - T0 + 1) / 8) ** 0.6);
/** The rows' spacing (z) and the cells' (x). */
const DZ = 64;
const DX = 44;
/** The near plane the flood is cut at (world units in front of the eye). */
const NEAR = 240;
/** The surface's height above the floor at (x, z), its rolling swell, and the breaking front's crest. */
function surface(x: number, z: number, t: number, r: number): number {
  const swell = 24 * Math.sin(0.011 * x + 0.33 * t) + 16 * Math.sin(0.017 * z - 0.24 * t + 1.3) + 10 * Math.sin(0.03 * x - 0.02 * z + 0.5 * t);
  const crest = r < 5 ? 150 * (1 - r / 5) ** 1.6 * (0.85 + 0.15 * Math.sin(0.02 * x + 0.6 * t)) : 0;
  return NAVE.floor + 44 + swell + crest;
}
/** The flood laps the core ring's edge (8.3&): the front's crest surges once, lifting spray. */
const LAP = KERNEL_DOLLY.to + 12;
/** The dizzy faces riding the flood (the overflow's own: S31_GAUGE), each at a row behind the front and a place across. */
export const FLOOD_FACES: readonly { face: string; r: number; x: number; phase: number }[] = Array.from({ length: 10 }, (_, i) => ({
  face: S31_GAUGE[i % S31_GAUGE.length].face,
  r: 3 + ((i * 5) % 14),
  x: -880 + 1760 * hash(seedFrame(T0), 8300, i),
  phase: 6.28 * hash(seedFrame(T0), 8301, i),
}));

// ——— The core ring, the scan, the hang, the install ——————————————————————————————————————————————————————————————————————————————

/** The crack (8.3a): launched a frame ahead so its beat frame already moves (L), opening in 4 f with a 6 % recoil (S); the ω-shaped dent at 12 o'clock spans ±0.36 rad. */
export const crackAt = (f: number): number => {
  const t = kt(f) - (CORE_CRACK - 1);
  if (t <= 0) return 0;
  return t < 4 ? 1.06 * (1 - (1 - t / 4) ** 3) : t < 7 ? lerp(1.06, 1, (t - 4) / 3) : 1;
};
const CRACK_W = 0.36;
/** The ring's radius at angle `th` (0 = 3 o'clock, counter-clockwise), with the crack's ω dent (two bowls bent inward). */
export function ringRadius(th: number, crack: number): number {
  let d = th - Math.PI / 2;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (Math.abs(d) >= CRACK_W || crack <= 0) return CORE_R;
  const u = d / CRACK_W;
  return CORE_R * (1 - 0.17 * crack * Math.sin(Math.PI * (u + 1)) ** 2);
}

/**
 * The contract the switch reads (sheet §6.3, `kernelRingAt(767)` → `reticleAt(768)`): the core ring on screen at instant `f` — its centre
 * (layout px), its radius (px), its crack, and how far it is redrawn as v2.0's reticle (the install's fill: the X-ray side draws the
 * reticle). On the part's last frame: centre (960, 540), r 450, all reticle.
 */
export function kernelRingAt(f: number): { centre: Point; r: number; crack: number; reticle: number } {
  const p = project(kernelPose(f), [0, 0, NAVE.core]);
  const d = camZ(f) - NAVE.core;
  return { centre: [p ? p.x : 960, p ? p.y : 540], r: (CORE_R * DK) / d, crack: crackAt(f), reticle: installBarAt(f)?.fill ?? 0 };
}

/** Defender's scan plane (8.2): from the core up the nave and through the lens in an 8th, accelerating; its lower edge bent into an ω. */
export const SCAN_DUR = 12;
export function scanPlaneAt(f: number): { z: number; u: number; bend: number } | null {
  const u = (kt(f) - KERNEL_SCAN) / SCAN_DUR;
  if (u < 0 || u >= 1) return null;
  return { z: lerp(NAVE.core + 200, camZ(f) - 140, u ** 2), u, bend: smoothstep(0.15, 0.55, u) };
}

/**
 * The hang's veil (8.4): #C8C8C8 over all but him, eased in over 6 f — the design's 20 % is a display-space veil: composited in linear
 * light (this pipeline), 8 % lifts the kernel's black to about what 20 % does on screen.
 */
export const VEIL = 0.08;
export const veilAt = (f: number): number => (f < HANG.from - 0.5 ? 0 : VEIL * flow((f - (HANG.from - 0.5)) / 6));

/** The install bar (8.4&; sheet §6.3: the same object as the hairline — its length, its colour — lifted and thickened). Layout px. */
export type InstallBar = { y: number; h: number; len: number; alpha: number; fill: number; edge: number; fold: number; label: number };
/** The install's beeps: the first lifts the bar; the fill steps a third on each of the other three (each lands on its beep, cubic-out over 3 f: the beat frame already moves). */
const FILL_STEPS = INSTALL_STEPS.slice(1);
const fillAt = (f: number): number => FILL_STEPS.reduce((a, s) => a + (1 - (1 - clamp((f - s + 1) / 3)) ** 3) / FILL_STEPS.length, 0);
/** The fold into the crosshair: over the part's last frame. */
const foldAt = (f: number): number => smoothstep(KERNEL_LAST - 1, KERNEL_LAST, f);
export function installBarAt(f: number): InstallBar | null {
  if (f < INSTALL.from) return null;
  const hair = hairlineAt(INSTALL.from - 1);
  const lift = 1 - (1 - clamp((f - INSTALL.from) / 3)) ** 3;
  const fill = fillAt(f);
  const fold = foldAt(f);
  return {
    y: lerp(hair ? hair.y : 1077, 540, lift),
    h: lerp(lerp(hair ? hair.h : 2, 24, lift), 2.5, fold),
    len: hair ? hair.len : 1920,
    alpha: lerp(hair ? hair.alpha : 0.7, 1, lift),
    fill,
    edge: 1920 * fill,
    fold,
    label: lift,
  };
}

// ——— The hero ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The placement line of a rounded glyph above his ink middle in the switch (drop2SwitchFrame.ts PLACE); the overflow placed it on it. */
const PLACE = 22 / 360;
/** His hook fragments in the kernel (the music's own: the conveyor bar's hook moved into bar 8, scripts/audio/drop2Act2.mjs): his ω sings them. */
export const KERNEL_HOOK: readonly number[] = HOOK2.filter((h) => h.at >= MARCH[2] && h.at < GAME)
  .map((h) => h.at + (KERNEL.from - MARCH[0]))
  .filter((a) => a >= T0 && a < END);
export type KernelHero = { width: number; centre: Point; place: number; sx: number; sy: number; rot: number; omega: number; breath: number };
/** The fling's spin as it lands (radians a frame, counter-clockwise), from the overflow's contract. */
const LANDING_SPIN = clamp(wrapAt(T0 - 1).spin, -0.6, 0.6);

/**
 * Him at instant `f` (screen): landing at (960, 640) the overflow's 628 px (600 of ink), squashed 1.08 / 0.92 and ringing out the fling's
 * spin; riding the flood down the nave (an 8th's sway, a beat's lean), reaching (960, 540) at the switch's 600 px as the dolly lands; his ω
 * popping on his hook notes; breathing ±1.5 % through the hang.
 */
export function kernelHeroAt(f: number): KernelHero {
  const t = Math.max(0, f - T0);
  const e = flow((f - T0) / (KERNEL_DOLLY.to - T0));
  const ride = 1 - e;
  const s0 = 0.08 * Math.exp(-0.35 * t) * Math.cos(0.75 * t);
  const wobble = 0.3 * LANDING_SPIN * Math.exp(-t / 2.5) * Math.sin(0.9 * t);
  let omega = 1;
  for (const h of KERNEL_HOOK) {
    const u = f - h;
    if (u >= 0 && u < 10) omega = Math.max(omega, 1 + 0.16 * (u < 2 ? u / 2 : (1 - (u - 2) / 8) ** 2));
  }
  // He breathes through the hang (one 24 f breath from 8.4, ending where it began on 8.4&: the switch catches him at exactly 600 px).
  const breath = f < HANG.from || f >= INSTALL.from ? 1 : 1 + 0.015 * Math.sin((2 * Math.PI * (f - HANG.from)) / (INSTALL.from - HANG.from));
  return {
    width: lerp(KERNEL_ADVANCE, 600, e) * breath,
    centre: [KERNEL_LANDING.x + 18 * ride * Math.sin((2 * Math.PI * t) / 48), lerp(KERNEL_LANDING.y, 540, e) + 7 * ride * Math.sin((2 * Math.PI * t) / 12)],
    place: lerp(0, PLACE, e),
    sx: 1 + s0,
    sy: 1 - s0,
    rot: wobble + 0.045 * ride * Math.sin((2 * Math.PI * t) / 24),
    omega,
    breath,
  };
}

/** His glyphs (rounded, one per character: the switch's layout of (•ω•), so the 9.1 cut is a match), screen px. */
export function heroGlyphs(f: number, skin: Skin): Glyph[] {
  const h = kernelHeroAt(f);
  const em = h.width / FACE_ADVANCE;
  const [c, s] = [Math.cos(h.rot), Math.sin(h.rot)];
  const cx = h.centre[0] - 960;
  const cy = 540 - h.centre[1];
  return FACE_PARTS.map((p) => {
    const adv = FACE_CHAR_ADVANCE[p.ch];
    const lx = (p.x + adv / 2 - FACE_ADVANCE / 2) * em * h.sx;
    const ly = h.place * em * h.sy;
    const k = p.ch === 'ω' ? h.omega : 1;
    const color = skin === 'xray' ? (p.ch === 'ω' ? XRAY.hot : XRAY.ink) : INK.hero;
    return { ch: p.ch, x: cx + lx * c - ly * s, y: cy + lx * s + ly * c, size: em * h.sy * k, stretch: h.sx / h.sy, rot: h.rot, color, alpha: 1 };
  });
}

// ——— The frame ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type KernelAdvances = { mono: Advance; jp: Advance; rounded: Advance };
/** Every string each atlas needs (the scene builds one atlas per key; whole faces are one key each). */
export const KERNEL_STRINGS = {
  mono: [
    '║═╔╗╬ω@',
    RAMP,
    '0123456789ABCDEFx %',
    ...KERNEL_TEXT.left,
    ...KERNEL_TEXT.right,
    KERNEL_TEXT.core,
    KERNEL_TEXT.hang,
    ...READOUT2.filter((l) => l.site === 'install').map((l) => l.text),
    AVATAR.v1,
  ],
  jp: S31_GAUGE.map((c) => c.face),
  rounded: ['(', '•', 'ω', ')'],
} as const;
/** The install bar's label (READOUT2 site 'install'). */
export const INSTALL_LABEL = READOUT2.find((l) => l.site === 'install')!.text;

export type KernelFrame = {
  pose: Pose;
  ground: RGB;
  /** World, normal: the floor's addresses, the core's avatar and label (the back plane). */
  back: { under: Shape[]; mono: Glyph[] };
  /** World, additive: the core ring and its ticks, the crack, the scan plane, the spray's light. */
  glow: Shape[];
  /** World, normal: pillars, labels, fragments, flood, one painter's list far → near. */
  nave: Glyph[];
  /** World, normal: the dizzy faces on their chips. */
  faces: { chips: Shape[]; jp: Glyph[] };
  /** Screen, normal: the hang's veil (live: under the bar and him); the POV's scanlines and the reticle (X-ray: over him, as the switch draws them). */
  screen: Shape[];
  /** Screen, normal: the install bar (behind him). */
  bar: Shape[];
  /** Screen: him. */
  hero: Glyph[];
};

/** Layout px → the screen layer's world (origin centre, y up). */
const sx = (x: number): number => x - 960;
const sy = (y: number): number => 540 - y;
function seg(x0: number, y0: number, x1: number, y1: number, w: number, color: RGB, alpha = 1, z = 0, soft = 0): Shape {
  const len = Math.hypot(x1 - x0, y1 - y0);
  return { kind: 'segment', x: (x0 + x1) / 2, y: (y0 + y1) / 2, z, w: len + w, h: w, rot: Math.atan2(y1 - y0, x1 - x0), color, alpha, soft };
}
const ring = (x: number, y: number, r: number, w: number, color: RGB, alpha = 1, z = 0, soft = 0): Shape => ({ kind: 'ring', x, y, z, w: 2 * r, h: 2 * r, r: w, color, alpha, soft });
function corner(out: Shape[], x: number, y: number, dx: number, dy: number, arm: number, w: number, color: RGB, alpha: number, under?: RGB): void {
  if (under) {
    out.push(seg(x, y, x + dx * arm, y, w + 4, under, alpha * 0.85));
    out.push(seg(x, y, x, y + dy * arm, w + 4, under, alpha * 0.85));
  }
  out.push(seg(x, y, x + dx * arm, y, w, color, alpha));
  out.push(seg(x, y, x, y + dy * arm, w, color, alpha));
}

/** A glyph of the nave with its depth (for the painter's sort). */
type Deep = { d: number; g: Glyph };

/**
 * Everything the kernel draws at instant `f` (content) with its camera at instant `cam` (the shutter-open instant on phosphor tails), in
 * one skin: 'live' (the kernel as he sees it) or 'xray' (Defender's slate X-ray, left of the install's edge).
 */
export function kernelFrame(f: number, adv: KernelAdvances, cam = f, skin: Skin = 'live'): KernelFrame {
  const pose = kernelPose(cam);
  const x = skin === 'xray';
  const out: KernelFrame = { pose, ground: x ? XRAY.ground : INK.ground, back: { under: [], mono: [] }, glow: [], nave: [], faces: { chips: [], jp: [] }, screen: [], bar: [], hero: heroGlyphs(f, skin) };
  const zc = pose.position[2];
  const deep: Deep[] = [];
  const t = kt(f);
  // In the X-ray the kernel's world dissolves into the POV's clean slate as the bar folds into the crosshair (v2.0 boots on an empty
  // sheet: the 9.1 cut keeps only the ring, the crosshair and him).
  const dim = x ? 1 - 0.85 * (installBarAt(f)?.fold ?? 0) : 1;
  floor(out, f, zc, x, adv);
  core(out, f, x, adv);
  pillars(deep, f, pose, x, adv);
  flood(deep, out, f, zc, x, adv, dim);
  deep.sort((a, b) => b.d - a.d);
  out.nave = deep.map((q) => (dim < 1 ? { ...q.g, alpha: (q.g.alpha ?? 1) * dim } : q.g));
  if (dim < 1) out.back.mono = out.back.mono.map((g) => ({ ...g, alpha: (g.alpha ?? 1) * dim }));
  if (!x) {
    scanPlane(out, f);
    spray(out, f, t);
  }
  screen(out, f, x);
  bar(out, f);
  return out;
}

/** The floor: rows of addresses every 140 u from in front of the lens to the lip, three across; the nearest row is the live counter. */
const ROW_GAP = 140;
const ROW_Z0 = 760;
const ROWS = Math.floor((ROW_Z0 - NAVE.edge) / ROW_GAP) + 1;
function floor(out: KernelFrame, f: number, zc: number, x: boolean, adv: KernelAdvances): void {
  let nearest = -1;
  for (let i = 0; i < ROWS; i++) {
    const z = ROW_Z0 - i * ROW_GAP;
    if (zc - z >= 330) {
      nearest = i;
      break;
    }
  }
  for (let i = ROWS - 1; i >= 0; i--) {
    const z = ROW_Z0 - i * ROW_GAP;
    const d = zc - z;
    if (d < 300) continue;
    const live = i === nearest;
    const squash = clamp(-NAVE.floor / d, 0.12, 1);
    const size = (live ? 46 : 34) * squash;
    const ink = x ? XRAY.block : INK.address;
    const a = (live ? 0.8 : 0.28) * fog(d) * (x ? 1.6 : 1);
    for (const col of [-1, 0, 1]) {
      // Row i's middle address is 0x80000000 + i · 0x04000000 (the counter spins 0x8… 0x9… 0xA… 0xC… 0xE… as the dolly flies); its sides a cell either way.
      const text = KERNEL_TEXT.address(i * 0x400000 + ((col + 3) % 3));
      const w = [...text].reduce((s, ch) => s + adv.mono(ch), 0) * (live ? 46 : 34);
      let cx = col * 840 - w / 2;
      for (const ch of text) {
        const cw = adv.mono(ch) * (live ? 46 : 34);
        if (ch !== ' ') out.back.mono.push({ ch, x: cx + cw / 2, y: NAVE.floor + 2, z, size, stretch: 1 / squash, color: ink, alpha: clamp(a) });
        cx += cw;
      }
    }
  }
  // The ceiling: the same map overhead (dimmer, its rows offset half a gap), streaming over the lens with the dolly.
  const CEIL = 760;
  for (let i = ROWS - 1; i >= 0; i--) {
    const z = ROW_Z0 - (i + 0.5) * ROW_GAP;
    const d = zc - z;
    if (d < 300) continue;
    const squash = clamp(CEIL / d, 0.12, 1);
    const a = 0.16 * fog(d) * (x ? 1.6 : 1);
    for (const col of [-1, 1]) {
      const text = KERNEL_TEXT.address(i * 0x400000 + 8 + col);
      const w = [...text].reduce((sum, ch) => sum + adv.mono(ch), 0) * 30;
      let cx = col * 560 - w / 2;
      for (const ch of text) {
        const cw = adv.mono(ch) * 30;
        if (ch !== ' ') out.back.mono.push({ ch, x: cx + cw / 2, y: CEIL - 2, z, size: 30 * squash, stretch: 1 / squash, color: x ? XRAY.block : INK.address, alpha: clamp(a) });
        cx += cw;
      }
    }
  }
  // The floor's lip: a dim red rule of ═ at the edge, over the dark.
  const d = zc - NAVE.edge;
  if (d > 300) for (let i = -14; i <= 14; i++) out.back.mono.push({ ch: '═', x: i * 86, y: NAVE.floor + 2, z: NAVE.edge, size: 72 * clamp(-NAVE.floor / d, 0.12, 1), stretch: 1 / clamp(-NAVE.floor / d, 0.12, 1), color: x ? XRAY.mid : INK.redDim, alpha: 0.8 * fog(d) });
}

/** The core: the ring (with its crack), its ticks, Defender v1's avatar and label; in the X-ray the reticle is drawn on screen instead. */
function core(out: KernelFrame, f: number, x: boolean, adv: KernelAdvances): void {
  const z = NAVE.core;
  const crack = crackAt(f);
  const hang = f >= HANG.from;
  // The avatar (￣ω￣;): red, its ω amber; it sweats on the dolly's landing (a shiver), greys with the hang.
  const em = 0.13 * CORE_R;
  const shiver = decay(f, KERNEL_DOLLY.to, 10) * 6 * Math.sin(2.6 * (f - KERNEL_DOLLY.to));
  const g = hang ? clamp((f - HANG.from + 1) / 6) : 0;
  const red = x ? XRAY.mid : mixRGB(INK.red, INK.grey, g);
  const amber = x ? XRAY.hot : mixRGB(INK.amber, INK.grey, g);
  const chars = [...AVATAR.v1];
  const w = chars.reduce((s, ch) => s + adv.mono(ch), 0) * em;
  let cx = -w / 2 + shiver;
  for (const ch of chars) {
    const cw = adv.mono(ch) * em;
    if (ch !== ' ') out.back.mono.push({ ch, x: cx + cw / 2, y: 0.5 * CORE_R, z, size: em, color: ch === 'ω' ? amber : red, alpha: 1 });
    cx += cw;
  }
  const label = hang ? KERNEL_TEXT.hang : KERNEL_TEXT.core;
  const lem = 0.062 * CORE_R;
  const lw = [...label].reduce((s, ch) => s + adv.mono(ch), 0) * lem;
  let lx = -lw / 2;
  for (const ch of label) {
    const cw = adv.mono(ch) * lem;
    if (ch !== ' ') out.back.mono.push({ ch, x: lx + cw / 2, y: -0.52 * CORE_R, z, size: lem, color: red, alpha: 1 });
    lx += cw;
  }
  if (x) return;
  // The ring: a soft halo, the tube, a thin inner ring; 48 ticks outside it (a pulse runs round them on the 16ths until the hang).
  const pulse = hang ? 1 : 1 + 0.5 * decay(f, HATS2.filter((h) => h <= f).pop() ?? T0, 5);
  // The scan fires from the core (8.2): the ring flares (×2.6, out over 8 f) and throws a wide halo — the clap's hit while the dolly races.
  const fire = decay(kt(f), KERNEL_SCAN, 8);
  out.glow.push(ring(0, 0, CORE_R + 50, 90, scaleRGB(INK.red, 0.1 * pulse + 0.5 * fire), 1, z, 60));
  if (fire > 0) out.glow.push(ring(0, 0, CORE_R + 160 + 500 * (1 - fire), 60, scaleRGB(INK.red, 0.6 * fire), 1, z, 50));
  if (crack <= 0) out.glow.push(ring(0, 0, CORE_R, 18, scaleRGB(INK.red, 1 + 1.6 * fire), 1, z));
  else {
    const n = 160;
    for (let i = 0; i < n; i++) {
      const a0 = (2 * Math.PI * i) / n;
      const a1 = (2 * Math.PI * (i + 1)) / n;
      const r0 = ringRadius(a0, crack);
      const r1 = ringRadius(a1, crack);
      const mid = Math.abs(Math.atan2(Math.sin((a0 + a1) / 2 - Math.PI / 2), Math.cos((a0 + a1) / 2 - Math.PI / 2))) < CRACK_W;
      out.glow.push(seg(r0 * Math.cos(a0), r0 * Math.sin(a0), r1 * Math.cos(a1), r1 * Math.sin(a1), 18, mid ? INK.amber : INK.red, 1, z));
    }
    // The crack's flash: white-hot at 12 o'clock for 4 f.
    const fl = decay(kt(f), CORE_CRACK, 5);
    if (fl > 0) out.glow.push({ kind: 'ellipse', x: 0, y: CORE_R * 0.92, z, w: 520, h: 260, color: scaleRGB(INK.white, 0.5 * fl), alpha: 1, soft: 130 });
  }
  out.glow.push(ring(0, 0, 0.86 * CORE_R, 4, scaleRGB(INK.red, 0.55), 1, z));
  for (let i = 0; i < 48; i++) {
    const th = (2 * Math.PI * i) / 48;
    const l = i % 4 === 0 ? 90 : 46;
    const r0 = CORE_R + 34;
    out.glow.push(seg(r0 * Math.cos(th), r0 * Math.sin(th), (r0 + l) * Math.cos(th), (r0 + l) * Math.sin(th), 7, scaleRGB(INK.red, 0.7 * pulse), 1, z));
  }
}

/** The pillars standing, falling (their cells turned along the fall, foreshortened, flipping ║ → ω) and, once landed, their fragments. */
function pillars(deep: Deep[], f: number, pose: Pose, x: boolean, adv: KernelAdvances): void {
  const zc = pose.position[2];
  PILLARS.forEach((p, n) => {
    if (f >= p.land) {
      for (const fr of FRAGMENTS[n]) {
        const q = fragmentAt(p, fr, f);
        if (!q) continue;
        const d = zc - q.z;
        if (d < 120 || q.y < NAVE.floor - 900) continue;
        const color = x ? (fr.ch === 'ω' ? XRAY.hot : XRAY.ink) : fr.ch === 'ω' ? scaleRGB(INK.amber, 1 + 0.8 * q.fresh) : scaleRGB(INK.red, 1 + 0.6 * q.fresh);
        deep.push({ d, g: { ch: fr.ch, x: q.x, y: q.y, z: q.z, size: q.size, rot: q.rot, color, alpha: fog(d) } });
      }
      return;
    }
    const th = fallAt(p, f);
    const base: [number, number, number] = [p.x, NAVE.floor, p.z];
    const tip: [number, number, number] = [p.x, NAVE.floor + NAVE.height * Math.cos(th), p.z - NAVE.height * Math.sin(th)];
    const a = project(pose, base);
    const b = project(pose, tip);
    if (!a || !b || a.d < 150) return;
    // Its cells' screen direction (the fall seen through the lens) and how much the fall foreshortens them.
    const ang = Math.atan2(-(b.y - a.y), b.x - a.x) - Math.PI / 2;
    const flat = clamp(Math.hypot(b.x - a.x, b.y - a.y) / ((NAVE.height * DK) / ((a.d + b.d) / 2)), 0.08, 1);
    const glow = x ? XRAY.ink : INK.red;
    for (const c of PILLAR_CELLS) {
      const q = flipAt(p, c.j, f);
      const turned = q >= 0.5;
      const wpt: [number, number, number] = [p.x + c.dx, NAVE.floor + c.h * Math.cos(th), p.z - c.h * Math.sin(th)];
      const d = zc - wpt[2];
      if (d < 120) continue;
      const card = Math.abs(1 - 2 * q);
      const color = turned ? (x ? XRAY.hot : INK.amber) : glow;
      deep.push({ d, g: { ch: turned ? 'ω' : c.ch, x: wpt[0], y: wpt[1], z: wpt[2], size: SHAFT.size * flat, stretch: Math.max(0.02, card) / flat, rot: ang, color, alpha: fog(d) } });
    }
    // Its process name across the shaft, a third of the way up (it falls with it), on a dark keyline.
    const lh = 0.36 * NAVE.height;
    const lz = p.z - lh * Math.sin(th) + 2;
    const ly = NAVE.floor + lh * Math.cos(th);
    const d = zc - lz;
    if (d < 120) return;
    const size = 34;
    const w = [...p.label].reduce((s, ch) => s + adv.mono(ch), 0) * size;
    let lx = p.x - w / 2;
    for (const ch of p.label) {
      const cw = adv.mono(ch) * size;
      deep.push({ d: d - 1, g: { ch, x: lx + cw / 2, y: ly, z: lz, size: size * clamp(flat * 1.4, 0.15, 1), stretch: 1 / clamp(flat * 1.4, 0.15, 1), color: x ? XRAY.light : INK.foam, alpha: fog(d), outline: 0.09, outlineColor: x ? XRAY.ground : INK.ground } });
      lx += cw;
    }
  });
}

/** The flood: rows of green @ from its front back to the lens, rising into a crest at the front (its cells cycling the ramp), with its faces. */
function flood(deep: Deep[], out: KernelFrame, f: number, zc: number, x: boolean, adv: KernelAdvances, dim: number): void {
  const t = kt(f) - T0;
  const front = floodFront(f);
  const pour = pourAt(f);
  const breath = f < HANG.from ? 1 : 1 + 0.01 * Math.sin((2 * Math.PI * (f - HANG.from)) / 24);
  const lap = decay(kt(f), LAP, 14) * smoothstep(LAP - 3, LAP, kt(f));
  const tick = Math.floor((frameOf(kt(f)) - T0) / 6);
  const cycle = RAMP.slice(1);
  // The rows sit on a world-fixed lattice (the water stays where it was poured and streams under the lens as the dolly flies); only the
  // front advances, each lattice row filling in as the front passes it.
  const n0 = Math.ceil(front / DZ);
  for (let n = n0; ; n++) {
    const z = n * DZ;
    const d = zc - z;
    if (d < NEAR) break;
    const r = (z - front) / DZ;
    const fill = clamp(r + 0.5);
    const half = (d * 960) / DK + 80;
    const odd = ((n % 2) + 2) % 2 ? DX / 2 : 0;
    for (let i = 0; ; i++) {
      const gx = -1500 + i * DX + odd;
      if (gx > 1500) break;
      if (Math.abs(gx) > half || gx > pour - (r < 1 ? 0 : 0.6 * r * DX)) continue;
      let y = surface(gx, z, t, r);
      if (r < 3) y += 120 * lap * (1 - r / 3) * (0.7 + 0.3 * Math.sin(0.02 * gx));
      const squash = clamp(0.25 + (-y / d) * 0.9 + (r < 3 ? 0.35 * (1 - r / 3) : 0), 0.32, 1);
      const foam = r < 2;
      const ch = foam ? cycle[(((tick + i + 3 * n) % cycle.length) + cycle.length) % cycle.length] : '@';
      const shade = 0.55 + 0.45 * clamp((y - NAVE.floor - 20) / 80);
      const color = x ? (foam ? XRAY.light : scaleRGB(XRAY.mid, 0.7 + 0.5 * shade)) : foam ? INK.foam : scaleRGB(INK.green, 0.6 + 0.6 * shade);
      deep.push({ d, g: { ch, x: gx, y, z, size: 46 * squash * breath, stretch: 1 / squash, color, alpha: fog(d) * fill * dim } });
    }
  }
  // The dizzy faces riding it, each on its dark chip (the overflow's), bobbing on the 8ths.
  const size = 40 * breath;
  for (const q of FLOOD_FACES) {
    const z = front + q.r * DZ;
    const d = zc - z;
    if (d < NEAR + 60 || q.x > pour - q.r * DX) continue;
    const y = surface(q.x, z, t, q.r) + 34 + 8 * Math.sin((2 * Math.PI * t) / 12 + q.phase);
    const w = adv.jp(q.face) * size;
    out.faces.chips.push({ kind: 'rect', x: q.x, y, z, w: w + 16, h: 0.78 * size, r: 5, color: x ? XRAY.ground : INK.chip, alpha: 0.9 * fog(d) * dim });
    out.faces.jp.push({ ch: q.face, x: q.x, y, z, size, rot: 0.12 * Math.sin(t / 5 + q.phase), color: x ? XRAY.light : INK.green, alpha: fog(d) * dim });
  }
}

/** Defender's scan plane: a red frame across the nave, its lower edge bent into an ω by the flood, a faint red sheet, scan rules. */
function scanPlane(out: KernelFrame, f: number): void {
  const s = scanPlaneAt(f);
  if (!s) return;
  const z = s.z;
  const a = 1 - 0.35 * s.u;
  const W = 1300;
  const top = 1400;
  const lo = NAVE.floor + 70;
  const red = INK.red;
  // A laser sheet, not a wall: fine scan rules and a bright frame, no fill (a red sheet over the whole frame read as a red flash).
  for (let y = lo + 48; y < top; y += 48) out.glow.push(seg(-W, y, W, y, 1.5, scaleRGB(red, 0.16), a, z));
  out.glow.push(seg(-W, lo, -W, top, 7, red, a, z), seg(W, lo, W, top, 7, red, a, z), seg(-W, top, W, top, 7, red, a, z));
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const gx = -W + (2 * W * i) / 64;
    const u = gx / 560;
    const bend = Math.abs(u) < 1 ? 230 * s.bend * Math.sin(Math.PI * (u + 1)) ** 2 : 0;
    pts.push([gx, lo + bend]);
  }
  for (let i = 1; i < pts.length; i++) {
    out.glow.push(seg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 34, scaleRGB(red, 0.25), a, z, 14));
    out.glow.push(seg(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 9, red, a, z));
  }
}

/** The "wa" on the dolly's landing (8.3, WA2): an amber shock ring out of his centre, through the core ring and off the frame in 10 f. */
export const WA = KERNEL_DOLLY.to;
export function waRingAt(f: number): { r: number; w: number; a: number } | null {
  const u = (f - (WA - 0.5)) / 10;
  if (u < 0 || u >= 1) return null;
  const e = 1 - (1 - u) ** 2;
  return { r: lerp(330, 1250, e), w: lerp(46, 10, u), a: (1 - u) ** 1.5 };
}

/** The light the flood's lap throws (8.3&): spray points over the lip, and the crack's chips. */
function spray(out: KernelFrame, f: number, t: number): void {
  const u = t - LAP;
  if (u >= 0 && u < 18) {
    const seed = seedFrame(LAP);
    for (let i = 0; i < 40; i++) {
      const r = (n: number) => hash(seed, 8400, i, n);
      const gx = -900 + 1800 * r(1);
      const vy = 6 + 10 * r(2);
      const y = NAVE.floor + 80 + vy * u - 0.5 * G * u * u;
      if (y < NAVE.floor - 200) continue;
      out.glow.push({ kind: 'ellipse', x: gx, y, z: NAVE.edge - 30 * r(3), w: 12, h: 12, color: scaleRGB(INK.green, 1.4 * (1 - u / 18)), alpha: 1 });
    }
  }
  const c = t - CORE_CRACK;
  if (c >= 0 && c < 14) {
    const seed = seedFrame(CORE_CRACK);
    for (let i = 0; i < 24; i++) {
      const r = (n: number) => hash(seed, 8500, i, n);
      const th = Math.PI / 2 + (r(1) - 0.5) * 0.8;
      const v = 14 + 22 * r(2);
      const px = CORE_R * Math.cos(th) + Math.cos(th) * v * c;
      const py = CORE_R * Math.sin(th) + Math.sin(th) * v * c - 0.6 * G * c * c;
      out.glow.push(seg(px, py, px - Math.cos(th) * 30, py - Math.sin(th) * 30, 6, scaleRGB(i % 3 ? INK.amber : INK.white, 1 - c / 14), 1, NAVE.core));
    }
  }
}

/** The screen layer: the hang's veil (live); in the X-ray, the POV's rolling scanlines and v2.0's reticle on the ring's place. */
function screen(out: KernelFrame, f: number, x: boolean): void {
  if (!x) {
    const wa = waRingAt(f);
    if (wa) out.screen.push(ring(0, 0, wa.r, wa.w, scaleRGB(INK.amber, 1.4), wa.a, 0, wa.w / 2));
    const v = veilAt(f);
    if (v > 0) out.screen.push({ kind: 'rect', x: 0, y: 0, w: 1920, h: 1080, color: INK.veil, alpha: v });
    return;
  }
  // The scanlines: 2 px black at 35 % every 4 px, rolling 1 px a frame, in phase with the switch's (it counts from its own downbeat).
  const roll = (((f - END) % 4) + 4) % 4;
  for (let y = roll - 4; y < 1084; y += 4) out.screen.push({ kind: 'rect', x: 0, y: sy(y + 1), w: 1920, h: 2, color: [0, 0, 0], alpha: 0.35 });
  // The reticle on the ring: v2.0's own (drop2Switch reticleAt on its downbeat), at the ring's place and size now.
  const k = kernelRingAt(f);
  const r0 = reticleAt(END);
  const [cx, cy] = [sx(k.centre[0]), sy(k.centre[1])];
  const RED = XRAY.red;
  out.screen.push(ring(cx, cy, k.r + 2, r0.stroke + 4, XRAY.onBlue, 0.8), ring(cx, cy, k.r, r0.stroke, RED, 1));
  for (let i = 0; i < r0.ticks; i++) {
    const th = ((r0.rot + i * 10) * Math.PI) / 180;
    const len = r0.tick * (i % 3 === 0 ? 1.6 : 1);
    const rr = k.r + 8;
    out.screen.push(seg(cx + Math.cos(th) * rr, cy + Math.sin(th) * rr, cx + Math.cos(th) * (rr + len), cy + Math.sin(th) * (rr + len), 2.5, RED, 1));
  }
  const { w, h, arm } = r0.brackets;
  for (const [dx, dy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) corner(out.screen, cx + (dx * w) / 2, cy + (dy * h) / 2, -dx, -dy, arm, 4, RED, 1, XRAY.onBlue);
}

/**
 * The install bar (screen, behind him): its track at the hairline's 70 %, its fill full red, a white-hot head at the fill's edge; folding
 * on the last frame into the reticle's crosshair (2.5 px, its hairs opening round him to the switch's gap, the vertical hair drawn in).
 */
function bar(out: KernelFrame, f: number): void {
  const b = installBarAt(f);
  if (!b) return;
  const y = sy(b.y);
  const red = INK.red;
  const gap = reticleAt(END).gap * b.fold;
  const span = (x0: number, x1: number, h: number, color: RGB, alpha: number) => {
    // A bar from layout x0 to x1, cut by the crosshair's gap round his centre as it folds.
    const cuts: [number, number][] = gap > 1 ? [[x0, Math.min(x1, 960 - gap)], [Math.max(x0, 960 + gap), x1]] : [[x0, x1]];
    for (const [a, c] of cuts) if (c - a > 0.5) out.bar.push({ kind: 'rect', x: sx((a + c) / 2), y, w: c - a, h, color, alpha });
  };
  span(0, b.len, b.h, red, b.alpha * lerp(0.45, 0, b.fold));
  span(0, b.edge, b.h, red, lerp(1, 0.9, b.fold));
  if (b.fold > 0) {
    // The vertical hair, grown from his centre outward over the fold.
    const reach = lerp(0, 1100, b.fold);
    for (const s of [1, -1]) out.bar.push(seg(0, s * (reticleAt(END).gap), 0, s * Math.max(reticleAt(END).gap, reach), 2.5, red, 0.9 * b.fold));
  }
}

/** The screen's last layer, over him: the wipe's white-hot edge (full height) and the bar's label with its percentage. */
export function kernelHud(f: number, adv: Advance): { shapes: Shape[]; mono: Glyph[] } {
  const b = installBarAt(f);
  if (!b) return { shapes: [], mono: [] };
  const shapes: Shape[] = [];
  const mono: Glyph[] = [];
  const on = 1 - b.fold;
  if (b.edge > 0.5 && b.edge < 1919.5 && on > 0) {
    shapes.push({ kind: 'rect', x: sx(b.edge), y: 0, w: 46, h: 1080, color: scaleRGB(INK.red, 0.5), alpha: 0.5 * on, soft: 22 });
    shapes.push({ kind: 'rect', x: sx(b.edge), y: 0, w: 3, h: 1080, color: INK.white, alpha: on });
    shapes.push({ kind: 'ellipse', x: sx(b.edge), y: sy(b.y), w: 60, h: 60, color: INK.white, alpha: 0.9 * on, soft: 26 });
  }
  const label = `${INSTALL_LABEL}  ${Math.round(100 * b.fill)}%`;
  const count = Math.ceil(clamp((frameOf(f) - INSTALL.from + 1) / 6) * ([...label].length + 1));
  let x = 48;
  const size = 26;
  const ly = b.y - b.h / 2 - 24;
  [...label].forEach((ch, i) => {
    const w = adv(ch) * size;
    if (i < count && ch !== ' ') mono.push({ ch, x: sx(x + w / 2), y: sy(ly), size, color: INK.red, alpha: b.label * on });
    x += w;
  });
  return { shapes, mono };
}

// ——— Photography —————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The look: the overflow's landing finish (KERNEL_LOOK_IN: dark, Defender's red blooming, no CRT), a lift on the crack's flash, sliding
 * with the install's fill into v2.0's POV finish (the switch's own on its downbeat), so the 9.1 cut changes no photography.
 */
export function kernelLook(f: number): Look {
  const b = installBarAt(f);
  // The core's red light lifts the nave on the scan's fire (8.2: ×1.4, out over 6 f — the clap's hit, which the racing dolly's even
  // texture otherwise hid) and on the crack's flash (8.3a).
  const base = { ...KERNEL_LOOK_IN, exposure: KERNEL_LOOK_IN.exposure * (1 + SCAN_LIGHT * decay(kt(f), KERNEL_SCAN, 6) + 0.12 * decay(kt(f), CORE_CRACK, 6)) };
  return b ? mixLook(base, switchLook(END), b.fill) : base;
}

/** How far the scan's fire lifts the exposure on its frame. */
export const SCAN_LIGHT = 0.4;
/** 64 sub-frames on the whip's landing, 48 under the dolly (the near pillars and fragments race), 32 after, 24 in the hang, 32 for the install. */
export function kernelTemporal(f: number): Temporal {
  if (f < T0 + 4) return { samples: 64, shutter: 0.5, persistence: 0 };
  if (f < KERNEL_DOLLY.to + 2) return { samples: 48, shutter: 0.5, persistence: 0 };
  if (f < HANG.from) return { samples: 32, shutter: 0.5, persistence: 0 };
  if (f < INSTALL.from - 1) return { samples: 24, shutter: 0.5, persistence: 0 };
  return { samples: 32, shutter: 0.5, persistence: 0 };
}

/**
 * The part's segment: drop 2's (the switch follows on the 9.1 hard cut), but starting on its own downbeat. The overflow's whip-pan slams
 * onto 8.1 at its fastest (≈ 2000 px a frame over its last quarter frame): blended into 8.1 its last sub-frames strobed the pan's world
 * into dozens of red bars over the landing. So the landing frame's early sub-frames pile up on the downbeat instead (temporalSamples
 * clamps, never drops): the whip lands crisp, and the pan's own frames (its 64 → 128 sub-frames to 8.1 − 1) keep their blur.
 */
export const kernelSegment = (f: number): Segment => ({ from: Math.max(drop2Segment(f).from, T0), to: drop2Segment(f).to });

/** His face in the kernel (for the hand-off tests): the base face throughout. */
export const KERNEL_FACE = HERO2.base;
