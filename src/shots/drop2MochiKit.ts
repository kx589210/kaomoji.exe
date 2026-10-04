// THE MOCHI WAVE's motion and geometry (drop2 10–11 with DROP2_THREADS.waveStyle 'mochi'; the lead's chosen redesign of 2026-10-03).
// A port of the design round's reference, output/qa/wave-lab/final/index.html (its port-spec.md §1–§8 name every function below), kept
// as close to it as the engine allows so the film moves as the judged prototype did. Its frames are LOCAL: 0 = drop2 10.1 (BURST),
// 191 = drop2 12.1 − 1; the film frame is BURST + local. Layout px, y down. Pure (seeded mulberry32, no clock): Node tests import it.
// Where the film's continuity wins over the prototype (the lead's ruling 1), this file says so: from 11.4 (local 168) he leaves the world
// for the arcade's mothership (the film's hand-off, the downsample kept); the prototype's 168–191 carve is cut to lead into it.
import { MOCHI_CARTOUCHE, MOCHI_POSES } from '../content/drop2Mochi.ts';
import { MOTHERSHIP } from './drop2ArcadeSprites.ts';
import { LAST, boxBurstAt } from './drop2Switch.ts';
import { FACE_ADVANCE } from './drop2SwitchType.ts';

export type XY = [number, number];

// ——— §1 Motion grammar (verbatim) ———————————————————————————————————————————————————————————————————————————————————————————

export const N = 192;
export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Fast start, still moving when it lands on the key frame. */
export const landEase = (t: number): number => {
  const u = clamp(t, 0, 1);
  return 0.8 * (1 - Math.pow(1 - u, 3.4)) + 0.2 * u;
};
export const easeIn = (t: number, p = 2.2): number => Math.pow(clamp(t, 0, 1), p);
export type Keys = readonly (readonly [number, number])[];
/** A keyed track: landEase between keys, a small overshoot after each key that settles. */
export function track(f: number, keys: Keys, os = 0.11, per = 12, dec = 5): number {
  if (f <= keys[0][0]) return keys[0][1];
  let v = keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [fa, va] = keys[i];
    const [fb, vb] = keys[i + 1];
    if (f < fb) {
      v = va + (vb - va) * landEase((f - fa) / (fb - fa));
      break;
    }
  }
  for (let i = 1; i < keys.length; i++) {
    const dt = f - keys[i][0];
    if (dt >= 0 && dt < dec * 7) v += (keys[i][1] - keys[i - 1][1]) * os * Math.sin((2 * Math.PI * dt) / per) * Math.exp(-dt / dec);
  }
  return v;
}
export const ring = (f: number, at: number, per = 10, dec = 5): number => {
  const d = f - at;
  return d < 0 ? 0 : Math.sin((2 * Math.PI * d) / per) * Math.exp(-d / dec);
};
/** A contact hit: at its fullest ON the frame, then rebounds and settles. */
export const hring = (f: number, at: number, per = 10, dec = 5): number => {
  const d = f - at;
  return d < 0 ? 0 : Math.cos((2 * Math.PI * d) / per) * Math.exp(-d / dec);
};
export const kick = (f: number, at: number, dec = 5): number => {
  const d = f - at;
  return d < 0 ? 0 : Math.exp(-d / dec);
};
/** Appears ON the hit at its biggest, rebounds below 1, settles. */
export const hitPop = (f: number, at: number, os = 0.3): number => {
  const d = f - at;
  return d < 0 ? 0 : 1 + os * Math.cos((d * Math.PI) / 2.4) * Math.exp(-d / 2);
};
/** A plate dropped on the paper: off register on its frame, snaps home with a 2–3 px overshoot. */
export const regSnap = (d: number): number => (d < 0 || d > 8 ? 0 : Math.cos((d * Math.PI) / 3.2) * Math.exp(-d / 1.6));
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const BEATS = [0, 24, 48, 72, 96, 120, 144, 168] as const;
/** The alternating 8th hop (swells, boats, oars): phase 0 hops on the beats, 1 on the off-8ths. */
export function hop8(f: number, phase: number): number {
  let v = 0;
  for (let k = phase ? 12 : 0; k < N + 24; k += 24) {
    const d = f - k;
    if (d < -3 || d > 30) continue;
    v += d < 0 ? landEase((d + 3) / 3) : Math.cos((2 * Math.PI * d) / 16) * Math.exp(-d / 4);
  }
  return v;
}
/** The world's clock: on the two kabuki mie (72, 120) the world nearly stops, then catches up by the next 8th. */
export function WT(f: number): number {
  for (const [at, hold, back] of [
    [72, 4, 84],
    [120, 3, 126],
  ]) {
    const a = at + hold * 0.2;
    if (f >= at && f < at + hold) return at + (f - at) * 0.2;
    if (f >= at + hold && f < back) return a + ((f - at - hold) * (back - a)) / (back - at - hold);
  }
  return f;
}

// ——— §3 The print's plates ———————————————————————————————————————————————————————————————————————————————————————————————————

export type Plate = 'key' | 'sky' | 'pale' | 'deep' | 'red';
export const PRINT = { sky: 6, pale: 12, deep: 18, red: 24 } as const;
export const REPRINT = { sky: 126, pale: 126, deep: 132, red: 132 } as const;
export const KNOCK = 120;
export const REG: Readonly<Record<Exclude<Plate, 'key'>, XY>> = { sky: [0, -24], pale: [26, -16], deep: [-24, 14], red: [20, 12] };
export type PlateState = { on: boolean; dx: number; dy: number };
/** A plate at f: printed or not, its register offset; `stage` elements (him, the seri, the cartouche, the seal) are immune to the 120 knock-out. */
export function plateAt(name: Plate, f: number, stage: boolean): PlateState {
  if (name === 'key') return { on: true, dx: 0, dy: 0 };
  let at: number = PRINT[name];
  if (!stage && f >= KNOCK) at = REPRINT[name];
  if (f < at) return { on: false, dx: 0, dy: 0 };
  const m = name === 'sky' && at === 6 ? 0 : regSnap(f - at);
  const o = REG[name];
  return { on: true, dx: o[0] * m, dy: o[1] * m };
}

// ——— §4 The mochi —————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type Seg = readonly [number, number, number, number, number, number, number, number];
/** The rest outline: back slope, fat crown, round nose, soft neck, belly bulge, front foot (local: origin on the sea at the base, y up negative). */
export const MOCHI: readonly Seg[] = [
  [-700, 0, -520, 0, -440, -300, -300, -440],
  [-300, -440, -200, -548, 40, -660, 210, -596],
  [210, -596, 344, -548, 456, -500, 444, -402],
  [444, -402, 436, -344, 392, -334, 384, -286],
  [384, -286, 376, -236, 436, -196, 428, -100],
  [428, -100, 424, -34, 474, 0, 564, 0],
];
/** The convex flop target, same indexing. */
export const PUDDLE: readonly Seg[] = [
  [-760, 0, -600, 0, -500, -130, -330, -196],
  [-330, -196, -150, -262, 160, -282, 380, -246],
  [380, -246, 520, -222, 620, -186, 690, -142],
  [690, -142, 730, -116, 762, -92, 790, -70],
  [790, -70, 820, -46, 860, -24, 910, -10],
  [910, -10, 950, 0, 1000, 0, 1080, 0],
];
export const SEG_N = 40;
export const MOCHI_H = 640;
export const bez = (S: Seg, t: number): XY => {
  const mt = 1 - t;
  return [mt * mt * mt * S[0] + 3 * mt * mt * t * S[2] + 3 * mt * t * t * S[4] + t * t * t * S[6], mt * mt * mt * S[1] + 3 * mt * mt * t * S[3] + 3 * mt * t * t * S[5] + t * t * t * S[7]];
};
const sampleSegs = (S: readonly Seg[]): XY[] => {
  const pts: XY[] = [];
  S.forEach((s, k) => {
    for (let i = k ? 1 : 0; i <= SEG_N; i++) pts.push(bez(s, i / SEG_N));
  });
  return pts;
};
export const MOCHI_P: readonly XY[] = sampleSegs(MOCHI);
export const PUDDLE_P: readonly XY[] = sampleSegs(PUDDLE);
/** The arc length on the rest shape (0–1): the stable address of anchors along the outline. */
export const WAVE_U: readonly number[] = (() => {
  const u = [0];
  let L = 0;
  for (let i = 1; i < MOCHI_P.length; i++) {
    L += Math.hypot(MOCHI_P[i][0] - MOCHI_P[i - 1][0], MOCHI_P[i][1] - MOCHI_P[i - 1][1]);
    u.push(L);
  }
  return u.map((v) => v / L);
})();

export type OPt = { x: number; y: number; u: number; h: number; tx: number; ty: number; nx: number; ny: number };
function normals(A: OPt[]): void {
  const n = A.length;
  for (let i = 0; i < n; i++) {
    const a = A[Math.max(0, i - 2)];
    const b = A[Math.min(n - 1, i + 2)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    A[i].tx = dx / l;
    A[i].ty = dy / l;
    A[i].nx = dy / l;
    A[i].ny = -dx / l;
  }
}
export function atU(A: readonly OPt[], u0: number): { x: number; y: number; nx: number; ny: number; tx: number; ty: number } {
  const u = clamp(u0, 0, 1);
  let i = 1;
  while (i < A.length - 1 && A[i].u < u) i++;
  const a = A[i - 1];
  const b = A[i];
  const t = (u - a.u) / (b.u - a.u || 1);
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), nx: lerp(a.nx, b.nx, t), ny: lerp(a.ny, b.ny, t), tx: lerp(a.tx, b.tx, t), ty: lerp(a.ty, b.ty, t) };
}
export type Pose = { bx: number; by: number; g: number; sy: number; sx: number; lean: number; morph: number; dentU: number; dentW: number; dent: number; rip: number; ripPh: number; vis: boolean };
/** The deformed outline (plane px): morph → grow/squash → lean → dent and ripple along the normals → placed. */
export function waveOutline(P: Pose): OPt[] {
  const A: OPt[] = MOCHI_P.map((q, i) => {
    const x = lerp(q[0], PUDDLE_P[i][0], P.morph);
    const y = lerp(q[1], PUDDLE_P[i][1], P.morph);
    const h = clamp(-y / MOCHI_H, 0, 1);
    return { x: x * lerp(0.55, 1, P.g) * P.sx + P.lean * Math.pow(h, 1.6) * P.g, y: y * P.g * P.sy, u: WAVE_U[i], h, tx: 0, ty: 0, nx: 0, ny: 0 };
  });
  normals(A);
  for (const p of A) {
    let off = 0;
    if (P.dent) {
      const du = (p.u - P.dentU) / P.dentW;
      off -= P.dent * P.g * Math.exp(-du * du);
    }
    if (P.rip) off += P.rip * Math.sin(p.u * 18 - P.ripPh) * smooth(0.08, 0.25, p.u) * (1 - smooth(0.82, 0.95, p.u));
    p.x += p.nx * off + P.bx;
    p.y += p.ny * off + P.by;
  }
  normals(A);
  return A;
}
/**
 * The main mochi's pose at world time t. One change from the prototype: its constant 3 px ripple ramps in over the first 16th, so on 10.1
 * the key block is exactly the six cubics the switch drafted (port-spec §10: "the key block on 0 lands on the drafting").
 */
export function mainPose(t: number): Pose {
  const g = track(t, [[0, 0.62], [24, 0.62], [36, 0.8], [48, 1.0]], 0.12, 14, 5);
  const rear = track(t, [[78, 0], [84, 1], [91, 0.9]], 0.1, 10, 4);
  const fall = t <= 91 ? 0 : easeIn((t - 91) / 5, 1.8);
  const gone = smooth(97, 107, t);
  let sy = 1 - 0.06 * hring(t, 24, 14, 5) - 0.05 * hring(t, 36, 12, 5) + 0.08 * ring(t, 48, 16, 6) - 0.06 * hring(t, 60, 12, 5) - 0.08 * hring(t, 72, 14, 5) + 0.14 * rear;
  sy = lerp(sy, 0.5, fall);
  if (t > 96) sy *= (1 - 0.92 * gone) * (1 - 0.14 * Math.max(0, ring(t, 96, 10, 3)));
  const sx = 1 / Math.pow(Math.max(0.35, sy), 0.4);
  let lean = track(t, [[0, 0], [48, 0], [60, 34], [72, 8], [84, -18], [91, 120]], 0.08, 12, 5);
  lean = lerp(lean, 150, fall);
  const dent = track(t, [[64, 0], [72, 116], [80, 102], [84, -36], [90, 0]], 0.1, 10, 4);
  const rip = 8 * (kick(t, 24, 6) + 0.6 * kick(t, 36, 6) + kick(t, 48, 8) + 0.8 * kick(t, 60, 6) + kick(t, 84, 7)) + 3 * smooth(0, 6, t);
  const bx = track(t, [[0, 600], [48, 610], [91, 640], [96, 700]], 0.04);
  return { bx, by: 900, g, sy, sx, lean, morph: fall, dentU: 0.5, dentW: lerp(0.06, 0.12, smooth(78, 84, t)), dent, rip, ripPh: t * 0.7, vis: t < 108 };
}
/**
 * The rebound mochi. Ruling 1: he leaves it at 11.4 (168) for the mothership, so the prototype's 180 landing dent is gone; the wave keeps
 * its own beat (the 180 squash and ripple) as he flies.
 */
export function reboundPose(t: number): Pose {
  const g = track(t, [[126, 0], [132, 0.44], [144, 0.72]], 0.14, 14, 5);
  const sy = 1 - 0.08 * hring(t, 144, 16, 6) + 0.05 * ring(t, 132, 12, 5) + 0.16 * track(t, [[150, 0], [156, 1], [163, 0]], 0.1, 10, 4) + 0.06 * ring(t, 168, 14, 5) - 0.07 * hring(t, 180, 14, 5);
  const lean = 26 * Math.sin((t - 144) / 9) * smooth(138, 150, t);
  const dent = track(t, [[140, 0], [144, 62], [150, 26], [155, 84], [156, -50], [162, 0]], 0.1, 10, 4);
  const rip = 7 * (kick(t, 144, 8) + kick(t, 156, 6) + 0.7 * kick(t, 168, 6) + kick(t, 180, 7)) + 3;
  const dentU = t < 166 ? 0.47 : 0.53;
  return { bx: 800, by: 900, g, sy, sx: 1 / Math.pow(Math.max(0.35, sy), 0.4), lean, morph: 0, dentU, dentW: 0.06, dent, rip, ripPh: t * 0.7, vis: t >= 126 };
}
/** The white cap's thickness at u: a smooth crescent over the crown, fat at the nose, gone at the neck. */
export const capTh = (u: number, gs: number): number => (16 + 80 * smooth(0.42, 0.64, u)) * smooth(0.33, 0.41, u) * (1 - smooth(0.7, 0.8, u)) * gs;

const OUTLINES = new Map<string, OPt[]>();
const memo = (key: string, make: () => OPt[]): OPt[] => {
  let A = OUTLINES.get(key);
  if (!A) {
    if (OUTLINES.size > 64) OUTLINES.clear();
    A = make();
    OUTLINES.set(key, A);
  }
  return A;
};
export const mainA = (t: number): OPt[] => memo(`m${t}`, () => waveOutline(mainPose(t)));
export const rebA = (t: number): OPt[] => memo(`r${t}`, () => waveOutline(reboundPose(t)));

/**
 * The frame-0 drafting (the switch's blueprint, bar 9 → 10.1): the six cubic segments of the rest outline at the 10.1 pose (g .62,
 * bx 600, by 900, no squash, lean, dent or ripple), on the wave's plane. An affine camera maps a cubic to a cubic: project the control
 * points with the camera of 10.1 to draft them on screen.
 */
export const DRAFT_SEGS: readonly Seg[] = MOCHI.map((s) => {
  const g = 0.62;
  const k = lerp(0.55, 1, g);
  return s.map((v, i) => (i % 2 === 0 ? v * k + 600 : v * g + 900)) as unknown as Seg;
});

// ——— The seri: a kagami-mochi stack of water tiers lifts him like a stage elevator ————————————————————————————————————————————————

export const COL_X = 1390;
export const COL_SEA = 905;
export const COL_FOOT = 36;
export const LAP = 26;
export const TIERS = [
  { w: 380, h: 196, at: 108 },
  { w: 470, h: 206, at: 114 },
  { w: 560, h: 216, at: 120 },
] as const;
export const tierGrow = (f: number, k: number): number => Math.max(0, track(f, [[TIERS[k].at - 5, 0], [TIERS[k].at, 1]], 0.12, 8, 3));
export function colStack(f: number): { top: number; ys: number[]; e: number[] } {
  const sink = 820 * easeIn((f - 128) / 14, 1.8);
  const e = TIERS.map((T, k) => (T.h - LAP) * tierGrow(f, k));
  const top = COL_SEA - COL_FOOT - LAP - e.reduce((a, b) => a + b, 0) + sink;
  const ys: number[] = [];
  let y = top;
  e.forEach((v) => {
    ys.push(y);
    y += v;
  });
  return { top, ys, e };
}
export const colTop = (f: number): number => colStack(f).top;

// ——— §5 The hero ————————————————————————————————————————————————————————————————————————————————————————————————————————————

export type HeroPoseName = keyof typeof MOCHI_POSES;
/** His faces as left arm, face, right arm (src/content/drop2Mochi.ts). */
export const POSES: Readonly<Record<HeroPoseName, readonly [string, string, string]>> = MOCHI_POSES;
export const HERO_PX = 100;
/** Board-bottom to his centre (px at scale 1). */
export const HB = 74;
export type HeroState = {
  x: number;
  y: number;
  rot: number;
  s: number;
  sqx: number;
  sqy: number;
  pose: HeroPoseName;
  board: number;
  spark: number;
  brows: number;
  wake: { which: 'main' | 'reb'; u: number } | null;
  /** From 11.4: his screen-space leap to the mothership (x, y on screen; s the screen scale); the board falls away. */
  screen: boolean;
};
const MAIN_KEYS = [
  [24, 0.33, 0, 0],
  [36, 0.37, 0, 70],
  [48, 0.44, 0, 96],
  [60, 0.48, 0, 46],
  [66, 0.5, 80, 0],
  [72, 0.5, -8, 0],
  [80, 0.5, -8, 0],
  [84, 0.5, 26, 0],
] as const;
const REB_KEYS = [
  [144, 0.42, 0, 0],
  [150, 0.46, 0, 54],
  [156, 0.47, -6, 0],
] as const;
type RideKey = readonly [number, number, number, number];
export function anchorOn(A: readonly OPt[], u: number, off: number, s: number): [number, number, number] {
  const p = atU(A, u);
  const ang = clamp(Math.atan2(p.ty, p.tx), -0.42, 0.42);
  const d = HB * s + off;
  return [p.x + p.nx * d, p.y + p.ny * d, ang];
}
function ride(t: number, keys: readonly RideKey[], A: readonly OPt[], s: number): [number, number, number] {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  const e = landEase(u);
  const pa = anchorOn(A, a[1], a[2], s);
  const pb = anchorOn(A, b[1], b[2], s);
  return [lerp(pa[0], pb[0], e), lerp(pa[1], pb[1], e) - (b[3] || 0) * Math.sin(Math.PI * u), lerp(pa[2], pb[2], e)];
}
/** A ballistic hop from p0 (t0) to p1 (t1) with an arc of height hgt: it lands moving. */
function arcFly(t: number, t0: number, t1: number, p0: readonly number[], p1: readonly number[], hgt: number): [number, number, number] {
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  return [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) - hgt * 4 * u * (1 - u), u];
}
const atUOf = (t: number, keys: readonly RideKey[]): number => {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i];
  const b = keys[i + 1];
  return lerp(a[1], b[1], landEase((t - a[0]) / (b[0] - a[0])));
};
/** The crash's impact (plane px): the flopping mochi's u .66 on 96, + (40, 60). */
export const IMPACT: XY = (() => {
  const p = atU(mainA(96), 0.66);
  return [p.x + 40, p.y + 60];
})();
/** He leaves the world on 11.4 (local 168) and lands as the mothership's bitmap on 11.4& + 6 (local 186: DOWNSAMPLE_STEPS[3]). */
export const LEAP = { from: 168, bitmap: 186 } as const;
/** The mothership on screen (the arcade's HANDOFFS row: 13 × 9 at 42 px). */
export const MS = { x: MOTHERSHIP.cx, y: MOTHERSHIP.cy, width: 13 * MOTHERSHIP.px } as const;

const heroBase = (): HeroState => ({ x: 0, y: 0, rot: 0, s: 0.9, sqx: 1, sqy: 1, pose: 'ride', board: 1, spark: 0, brows: 0, wake: null, screen: false });

/**
 * The hand-off out of the switch's box (continuity plan v07, seam 4320; local frames): on 10.1 he is exactly where the box held his face
 * on its last frame (drop2Switch.ts boxBurstAt(LAST): his face 510 px wide on (960, 540), the glyph's placement line 22/360 em above its ink
 * middle, as the switch places it), the bare face (•ω•) with the hardened brows; then he launches into the eruption as built — 75 % of the
 * way by + 3 (L), whole by + 12 (10.1& − 1 … the shamisen chord's 16th: WP2's 4332) — the arms out on + 1, the board growing under him,
 * the brows let go on + 6. From + 12 everything is the prototype's.
 */
export const LAUNCH = { to: 12, at3: 0.75, arms: 1, brows: 6 } as const;
const LAUNCH_P = Math.log(1 - LAUNCH.at3) / Math.log(1 - 3 / LAUNCH.to);
/** The launch's ease (0 on 10.1 → 1 on + 12): 1 − (1 − f/12)^p, p chosen so it is 0.75 on + 3. */
export const launchEase = (f: number): number => (f <= 0 ? 0 : f >= LAUNCH.to ? 1 : 1 - Math.pow(1 - f / LAUNCH.to, LAUNCH_P));
/** His face in the box on the switch's last frame (screen px; `s` the mochi's scale for it: HERO_PX × s = the switch's em). */
export const BOX_FACE = (() => {
  const b = boxBurstAt(LAST);
  const em = b.face / FACE_ADVANCE;
  return { x: b.centre[0], y: b.centre[1] - (22 / 360) * em, s: em / HERO_PX, width: b.face };
})();

/** His state at local frame f (plane px on the wave's plane, or screen px once `screen`); the world's clock WT drives his ride. */
export function heroState(f: number): HeroState {
  const h = heroBuilt(f);
  if (f >= LAUNCH.to) return h;
  // The launch out of the box (screen px): from the box's face to the built eruption.
  const e = launchEase(f);
  const cam = camera(f);
  const [bx, by] = toScreen(cam, 1, h.x, h.y);
  h.x = lerp(BOX_FACE.x, bx, e);
  h.y = lerp(BOX_FACE.y, by, e);
  h.s = lerp(BOX_FACE.s, h.s * cam.z, e);
  h.rot *= e;
  h.sqx = 1 + (h.sqx - 1) * e;
  h.sqy = 1 + (h.sqy - 1) * e;
  h.board *= e;
  h.screen = true;
  if (f < LAUNCH.arms) h.pose = 'base';
  if (f < LAUNCH.brows) h.brows = 1;
  return h;
}

/** His state as the prototype built it (heroState with the 10.1 hand-off out of the box before it). */
function heroBuilt(f: number): HeroState {
  const t = WT(f);
  const h = heroBase();
  const sq = (v: number): void => {
    h.sqx = 1 + v;
    h.sqy = 1 - v;
  };
  if (t < 24) {
    // Erupts out of the blueprint's box at the centre, arcs over the print, lands on the wave's back on 24.
    const L = anchorOn(mainA(24), 0.33, 0, 0.9);
    const [x, y, u] = arcFly(t, 0, 24, [960, 560], [L[0], L[1]], 300);
    h.x = x;
    h.y = y;
    h.s = lerp(1.45, 0.9, landEase(t / 14));
    h.rot = lerp(-0.18, L[2] * 0.8, u);
    h.pose = t < 20 ? 'jump' : 'ride';
    h.board = 0.5 + 0.5 * smooth(0, 8, t);
    sq(0.16 * kick(t, 0, 3) - 0.1 * smooth(16, 23, t));
    return h;
  }
  if (t < 84) {
    const A = mainA(t);
    const p = ride(t, MAIN_KEYS, A, 0.9);
    h.x = p[0];
    h.y = p[1];
    h.rot = p[2] * 0.8 + track(t, [[60, 0], [66, -0.3], [72, 0.12], [80, 0.06], [84, 0]], 0.08);
    h.pose = t < 64 ? 'ride' : t < 82 ? 'mie' : 'jump';
    h.brows = t >= 64 && t < 82 ? 1 : 0;
    h.spark = t >= 72 && t < 82 ? hitPop(t, 72, 0.4) * (1 - smooth(79, 82, t)) : 0;
    h.s = 0.9 + 0.03 * smooth(64, 72, t) - 0.03 * smooth(80, 84, t);
    sq(0.26 * hring(t, 72, 10, 4) + 0.18 * hring(t, 24, 12, 4) + 0.12 * hring(t, 36, 12, 4) + 0.16 * hring(t, 48, 12, 4) + 0.12 * hring(t, 60, 12, 4) - 0.14 * smooth(66, 72, t) * (1 - smooth(72, 74, t)));
    if (f >= 72 && f < 78) {
      // His tremble in the mie: a jitter from frame to frame (taken at the whole frame, never smeared).
      const fi = Math.round(f);
      h.x += Math.sin(fi * 2.7) * 3;
      h.y += Math.cos(fi * 3.3) * 2.5;
    }
    h.wake = t < 64 ? { which: 'main', u: atUOf(t, MAIN_KEYS) } : null;
    return h;
  }
  if (t < 96) {
    // Launched by the mochi: a full front flip at the top, falls into the crash.
    const L = anchorOn(mainA(84), 0.5, 26, 0.9);
    const [x, y] = arcFly(t, 84, 96, [L[0], L[1]], [1110, 500], 330);
    h.x = x;
    h.y = y;
    h.s = 0.95;
    h.rot = -Math.PI * 2 * smooth(85, 93, t) + 0.2 * (1 - smooth(84, 86, t));
    h.pose = t < 92 ? 'jump' : 'squint';
    sq(-0.22 * kick(t, 84, 3) + 0.08 * smooth(90, 95, t));
    return h;
  }
  if (t < 120) {
    // In the white water, then the seri lifts him (108 → 114 → 120).
    const hold = f < 100 ? 96 : f;
    const x = track(hold, [[96, 1110], [108, COL_X]], 0.06);
    const yf = 500 + 16 * Math.sin((hold - 96) / 3.2) * (1 - smooth(106, 110, hold));
    h.x = x;
    h.y = Math.min(yf, colTop(f) - HB);
    h.s = 1.0 - 0.06 * smooth(108, 120, f);
    h.rot = 0.12 * Math.sin((hold - 96) / 4) * (1 - smooth(108, 114, hold));
    h.pose = f < 110 ? 'squint' : 'cheer';
    if (f < 100) {
      const fi = Math.round(f);
      h.x += Math.sin(fi * 2.9) * 4;
      h.y += Math.cos(fi * 2.3) * 4;
    }
    sq(0.26 * hring(f, 96, 12, 4) + 0.12 * ring(f, 102, 12, 4) + 0.14 * hring(f, 108, 12, 4) + 0.16 * hring(f, 114, 12, 4));
    return h;
  }
  if (t < 144) {
    // The stamp mie on the column (120–126), springs off, twirls, lands on the regrown wave on 144.
    const top = [COL_X, colTop(126) - HB * 0.94];
    if (t < 126) {
      h.x = COL_X + (f < 124 ? Math.sin(Math.round(f) * 2.7) * 3 : 0);
      h.y = colTop(f) - HB * 0.94;
      h.s = 0.94;
      h.pose = 'cheer';
      h.brows = 1;
      h.spark = hitPop(f, 120, 0.4);
      sq(0.22 * kick(f, 120, 3) + 0.1 * hring(f, 120, 10, 4) + 0.14 * smooth(123, 126, f));
      return h;
    }
    const L = anchorOn(rebA(144), 0.42, 0, 0.9);
    const [x, y, u] = arcFly(t, 126, 144, top, [L[0], L[1]], 130);
    h.x = x;
    h.y = y;
    h.s = lerp(0.94, 0.9, u);
    h.rot = -Math.PI * 2 * landEase((t - 126) / 12) + L[2] * 0.8 * smooth(138, 144, t);
    h.pose = 'jump';
    h.board = 1;
    h.spark = (1 - smooth(126, 130, t)) * 0.8;
    sq(-0.18 * kick(t, 126, 3));
    return h;
  }
  if (t < 156) {
    const A = rebA(t);
    const p = ride(t, REB_KEYS, A, 0.9);
    h.x = p[0];
    h.y = p[1];
    h.rot = p[2] * 0.8;
    h.pose = 'ride';
    sq(0.24 * hring(t, 144, 12, 4) + 0.12 * hring(t, 150, 12, 4) + 0.14 * smooth(152, 156, t));
    h.wake = { which: 'reb', u: atUOf(t, REB_KEYS) };
    return h;
  }
  if (t < LEAP.from) {
    // Launch 2: a 360 that lands upright ON 168 at the top (the mini mie).
    const [x, y] = launch2(t);
    h.x = x;
    h.y = y;
    h.s = 0.92;
    h.rot = Math.PI * 2 * landEase((t - 156) / 12);
    h.pose = t < 166 ? 'jump' : 'cheer';
    h.brows = t >= 166 ? 1 : 0;
    sq(-0.2 * kick(t, 156, 3));
    return h;
  }
  return leapState(f);
}
/** Launch 2's arc (156 → its apex on 168), as the prototype flew it toward u .53 on 180. */
function launch2(t: number): [number, number] {
  const p0 = anchorOn(rebA(156), 0.47, -6, 0.9);
  const p1 = anchorOn(rebA(180), 0.53, 0, 0.9);
  const [x, y] = arcFly(t, 156, 180, p0, p1, 280);
  return [x, y];
}

/** The leap's screen path is fixed once (the camera of 168 and the apex). */
let LEAP0: { x: number; y: number; s: number } | null = null;
const leapStart = (): { x: number; y: number; s: number } => {
  if (!LEAP0) {
    const [x, y] = launch2(LEAP.from);
    const cam = camera(LEAP.from);
    const [sx, sy] = toScreen(cam, 1, x, y);
    LEAP0 = { x: sx, y: sy, s: 0.92 * cam.z };
  }
  return LEAP0;
};
/**
 * From 11.4 (ruling 1, the film's hand-off): the mini mie on the apex (168, ✧ + brows, the plovers' ring), then up off it to the top
 * centre, growing, his arms tucking in on the 16th 174 (the mothership is (•ω•) alone); on 186 the arcade's bitmap takes over (drawn in
 * the downsample's top layer). Screen px.
 */
function leapState(f: number): HeroState {
  const h = heroBase();
  const p0 = leapStart();
  h.screen = true;
  const u = clamp((f - LEAP.from) / (LEAP.bitmap - LEAP.from), 0, 1);
  const e = 1 - Math.pow(1 - u, 2.2);
  // The base face's width at s 1 is 2.698 em × 100 px; the bitmap is 546 px.
  const sEnd = MS.width / (2.698 * HERO_PX);
  h.x = lerp(p0.x, MS.x, e);
  // (No hop: the apex is near the top edge already; he glides down onto the mothership's place, growing.)
  h.y = lerp(p0.y, MS.y, e);
  h.s = lerp(p0.s, sEnd, e);
  h.pose = f < 174 ? 'cheer' : 'base';
  h.brows = f < 174 ? 1 : 0;
  h.spark = f < 178 ? hitPop(f, LEAP.from, 0.4) * (1 - smooth(174, 178, f)) : 0;
  h.board = 1 - smooth(LEAP.from, LEAP.from + 6, f);
  h.rot = 0;
  const v = 0.12 * hring(f, LEAP.from, 10, 4) + 0.1 * hring(f, 174, 10, 3) - 0.08 * kick(f, 180, 3);
  h.sqx = 1 + v;
  h.sqy = 1 - v;
  return h;
}

// ——— §2 Camera ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The camera: zoom z on the wave's plane, its focus (x, y), a shake (sx, sy, screen px) and a roll r (radians, clockwise on screen). */
export type MochiCam = { z: number; x: number; y: number; sx: number; sy: number; r: number };
let CAMK: { z: Keys; x: Keys; y: Keys } | null = null;
function camKeys(): { z: Keys; x: Keys; y: Keys } {
  if (CAMK) return CAMK;
  const h72 = heroState(72);
  CAMK = {
    z: [[0, 1.0], [24, 1.03], [48, 1.07], [60, 1.1], [72, 1.34], [80, 1.31], [84, 0.96], [92, 0.95], [96, 1.07], [108, 1.0], [120, 1.12], [132, 1.03], [144, 1.0], [168, 1.06]],
    x: [[0, 960], [24, 950], [48, 930], [60, 920], [72, h72.x - 30], [80, h72.x - 20], [84, 900], [92, 920], [96, 1060], [108, 1200], [120, 1400], [132, 1180], [144, 1010], [168, 1030]],
    y: [[0, 540], [24, 548], [48, 500], [60, 476], [72, h72.y + 60], [80, h72.y + 66], [84, 420], [92, 300], [96, 570], [108, 560], [120, 420], [132, 380], [144, 545], [168, 440]],
  };
  return CAMK;
}
/**
 * The camera at local f: flows on every frame, punches and shakes on the hits. After 168 (ruling 1) it keeps accelerating, but up after
 * him toward the mothership (the prototype pushed right into his carve, which the hand-off cuts): never settling into the downsample.
 */
export function camera(f: number): MochiCam {
  const K = camKeys();
  let z = track(f, K.z, 0.1);
  let x = track(f, K.x, 0.1);
  let y = track(f, K.y, 0.1);
  x += 12 * Math.sin(f / 19) * (1 - 0.7 * smooth(60, 72, f) * (1 - smooth(80, 84, f)));
  y += 7 * Math.sin(f / 27 + 1);
  if (f > 168) {
    const a = easeIn((f - 168) / 23, 1.7);
    z += 0.14 * a;
    x -= 40 * a;
    y -= 70 * a;
  }
  z *=
    1 +
    0.03 * kick(f, 0, 3) +
    0.01 * kick(f, 6, 2) +
    0.014 * kick(f, 12, 2) +
    0.02 * kick(f, 18, 2) +
    0.018 * kick(f, 24, 3) +
    0.012 * kick(f, 48, 3) +
    0.035 * kick(f, 96, 3) +
    0.02 * kick(f, 120, 3) +
    0.03 * kick(f, 144, 3) +
    0.03 * kick(f, 168, 3) +
    0.025 * kick(f, 180, 3) +
    0.012 * kick(f, 156, 3) +
    0.01 * kick(f, 132, 3);
  let sx = 0;
  let sy = 0;
  // The shake is a jitter from frame to frame (a 2.7-frame period): taken at the whole frame, so a shutter never smears it.
  const fi = Math.round(f);
  const sh = (at: number, a: number, d: number): void => {
    const e = kick(fi, at, d) * a;
    sx += Math.sin((fi - at) * 2.3 + at) * e;
    sy += Math.cos((fi - at) * 3.1 + at) * e;
  };
  sh(0, 12, 4);
  sh(12, 4, 2);
  sh(18, 6, 2);
  sh(24, 7, 3);
  sh(48, 5, 3);
  sh(72, 10, 3);
  sh(84, 6, 3);
  sh(96, 24, 5);
  sh(120, 16, 4);
  sh(144, 9, 3);
  sh(168, 9, 3);
  sh(180, 8, 3);
  const r = 0.012 * ring(f, 96, 16, 7) - 0.006 * ring(f, 72, 12, 4) + 0.007 * ring(f, 120, 12, 4) - 0.004 * ring(f, 168, 12, 4);
  return { z, x, y, sx, sy, r };
}
/** A plane-p point → the screen (linear parallax: scale 1 + (z − 1)p, focus 960 + (x − 960)p). */
export function toScreen(cam: MochiCam, p: number, x: number, y: number): XY {
  const z = 1 + (cam.z - 1) * p;
  const cx = 960 + (cam.x - 960) * p;
  const cy = 540 + (cam.y - 540) * p;
  const dx = (x - cx) * z;
  const dy = (y - cy) * z;
  const cs = Math.cos(cam.r * p);
  const sn = Math.sin(cam.r * p);
  return [960 + cam.sx * p + dx * cs - dy * sn, 540 + cam.sy * p + dx * sn + dy * cs];
}
/** A screen point → the plane-p point the camera shows there. */
export function fromScreen(cam: MochiCam, p: number, sx: number, sy: number): XY {
  const z = 1 + (cam.z - 1) * p;
  const cx = 960 + (cam.x - 960) * p;
  const cy = 540 + (cam.y - 540) * p;
  const dx = sx - 960 - cam.sx * p;
  const dy = sy - 540 - cam.sy * p;
  const cs = Math.cos(-cam.r * p);
  const sn = Math.sin(-cam.r * p);
  return [cx + (dx * cs - dy * sn) / z, cy + (dx * sn + dy * cs) / z];
}
/** Plane p's camera as an affine map [a, b, c, d, e, f] (canvas order: x' = a x + c y + e, y' = b x + d y + f). */
export function planeMatrix(cam: MochiCam, p: number): [number, number, number, number, number, number] {
  const z = 1 + (cam.z - 1) * p;
  const cx = 960 + (cam.x - 960) * p;
  const cy = 540 + (cam.y - 540) * p;
  const cs = Math.cos(cam.r * p) * z;
  const sn = Math.sin(cam.r * p) * z;
  return [cs, sn, -sn, cs, 960 + cam.sx * p - cs * cx + sn * cy, 540 + cam.sy * p - sn * cx - cs * cy];
}

/**
 * The drafting as the switch rules it on screen (bar 9.4&): DRAFT_SEGS through the camera of 10.1 (its instant 0), four strokes, one a
 * 32nd (score ARCS): the back slope, the crown, the nose and neck, the belly and foot.
 */
let DRAFT: Seg[] | null = null;
export function draftScreen(): readonly Seg[] {
  if (!DRAFT) {
    const cam = camera(0);
    DRAFT = DRAFT_SEGS.map((s) => {
      const out: number[] = [];
      for (let i = 0; i < 8; i += 2) out.push(...toScreen(cam, 1, s[i], s[i + 1]));
      return out as unknown as Seg;
    });
  }
  return DRAFT;
}
export const DRAFT_GROUPS: readonly (readonly number[])[] = [[0], [1], [2, 3], [4, 5]];

// ——— §6 The crash's white water (the halftone's coverage; the dots are drawn by the scene's shader) ——————————————————————————

export const HT_S = 34;
export const domeR = (f: number): number => (f < 94 ? 0 : f < 95 ? lerp(160, 420, f - 94) : f < 96 ? lerp(420, 1760, f - 95) : f < 98 ? lerp(1760, 2700, (f - 96) / 2) : 2700);
export const drainY = (f: number): number =>
  f < 101
    ? -600
    : track(
        f,
        [
          [101, -600],
          [102, 190],
          [107, 214],
          [108, 500],
          [113, 524],
          [114, 830],
          [118, 860],
          [120, 1600],
        ],
        0.1,
        8,
        3,
      );
/** The white water's coverage (0–1) at a plane-1 point. */
export function whiteCov(f: number, x: number, y: number): number {
  const R = domeR(f);
  if (R <= 0) return 0;
  const dx = (x - IMPACT[0]) / R;
  const dy = (y - IMPACT[1]) / (R * 0.82);
  const d = Math.sqrt(dx * dx + dy * dy);
  let cov = 1 - smooth(1 - Math.min(0.5, 260 / R), 1.02, d);
  const yd = drainY(f);
  cov *= smooth(yd - 30, yd + 190, y);
  return cov;
}
/** The share of the screen the white (coverage > .72) covers at f (a 20 px sample grid, as the prototype's check). */
export function whiteShare(f: number): number {
  if (f < 94 || f >= 120) return 0;
  const cam = camera(f);
  let n = 0;
  let w = 0;
  for (let sy = 10; sy < 1080; sy += 20)
    for (let sx = 10; sx < 1920; sx += 20) {
      n++;
      const p = fromScreen(cam, 1, sx, sy);
      if (whiteCov(f, p[0], p[1]) > 0.72) w++;
    }
  return w / n;
}

// ——— Bits of the world ————————————————————————————————————————————————————————————————————————————————————————————————————————

export const barenPos = (f: number): { x: number; y: number; r: number; rot: number } => {
  const t = landEase((f - 5) / 7);
  return { x: lerp(-300, 2260, t), y: 150 + 46 * Math.sin(t * Math.PI), r: 120, rot: t * 7 };
};
export function whirlAngle(f: number, speed: number): number {
  let a = f * speed;
  for (const b of BEATS) if (f >= b) a += 0.9 * (1 - Math.exp(-(f - b) / 3));
  return a;
}
/** The rowers' faces: the film's guest variants (ruling 3) — at rest, looking up from the crash, infected one boat a 16th from 144. */
export function rowerFace(f: number, id: number): 'rest' | 'shock' | 'inf' {
  const inf = 144 + (2 - id) * 6;
  if (f >= inf) return 'inf';
  if (f >= 96) return 'shock';
  return 'rest';
}
export const FORMS: readonly (readonly XY[])[] = [
  [[0, 0], [-78, 34], [-156, 68], [78, 34], [156, 68]],
  [[0, 0], [-90, 0], [-180, 0], [90, 0], [180, 0]],
  [[0, -40], [-80, -14], [-150, 40], [80, -14], [150, 40]],
  [[0, -60], [-70, 0], [0, 60], [70, 0], [0, 0]],
  [[0, 0], [-60, 50], [-120, 0], [60, 50], [120, 0]],
];
/** The plovers' offsets (and how much each is placed absolutely: the 168 ring round him). */
export function birdOffsets(f: number, heroL: XY): [number, number, number][] {
  if (f < 120) {
    const k = 1 + 0.9 * kick(f, 96, 10) * smooth(92, 96, f + 4);
    return FORMS[0].map(([x, y]) => [x * k, y * k, 0]);
  }
  const k = Math.floor((f - 116) / 12);
  const start = 116 + k * 12;
  const get = (i: number): [number, number, number][] => {
    if (i < 0 || i >= 5) return FORMS[0].map(([x, y]) => [x, y, 0]);
    if (i === 4) return [0, 1, 2, 3, 4].map((j) => [heroL[0] + Math.cos((j / 5) * Math.PI * 2 - Math.PI / 2) * 250, heroL[1] + Math.sin((j / 5) * Math.PI * 2 - Math.PI / 2) * 190, 1]);
    return FORMS[(i % 4) + 1].map(([x, y]) => [x, y, 0]);
  };
  const A = get(k - 1);
  const B = get(k);
  const e = landEase((f - start) / 4) + 0.12 * ring(f, start + 4, 10, 3);
  return A.map((a, i) => [lerp(a[0], B[i][0], e), lerp(a[1], B[i][1], e), lerp(a[2], B[i][2], e)]);
}

/** The spray bursts: [frame, origin, count, speed, angle, spread, seed, size]. Ruling 1: no 180 landing (he has left for the mothership). */
export const BURSTS: readonly (readonly [number, 'hero' | 'col' | 'nose' | 'nose2', number, number, number, number, number, number])[] = [
  [24, 'hero', 12, 11, -Math.PI / 2, 2.4, 3, 10],
  [36, 'hero', 8, 9, -Math.PI / 2 - 0.3, 1.6, 4, 8],
  [48, 'nose', 12, 12, -Math.PI / 2 + 0.3, 1.8, 5, 11],
  [60, 'hero', 9, 10, -Math.PI / 2 - 0.4, 1.6, 7, 8],
  [72, 'hero', 16, 15, -Math.PI / 2, 2.8, 8, 11],
  [84, 'hero', 16, 16, -Math.PI / 2, 2.2, 9, 12],
  [108, 'col', 12, 12, -Math.PI / 2, 1.0, 11, 11],
  [120, 'col', 18, 15, -Math.PI / 2, 1.0, 12, 12],
  [144, 'hero', 14, 12, -Math.PI / 2, 2.2, 17, 10],
  [156, 'hero', 14, 14, -Math.PI / 2, 2.0, 18, 10],
  [168, 'nose2', 10, 10, -Math.PI / 2 + 0.3, 1.6, 19, 9],
  [180, 'nose2', 10, 10, -Math.PI / 2 + 0.2, 1.4, 23, 8],
];
const BURST_O = new Map<string, XY>();
export function burstOrigin(kind: string, f0: number): XY {
  const key = kind + f0;
  const got = BURST_O.get(key);
  if (got) return got;
  let o: XY;
  if (kind === 'hero') {
    const h = heroState(f0);
    o = [h.x, h.y + HB * h.s];
  } else if (kind === 'col') o = [COL_X, colTop(f0) + 10];
  else if (kind === 'nose') {
    const p = atU(mainA(f0), 0.6);
    o = [p.x, p.y];
  } else {
    const p = atU(rebA(f0), 0.6);
    o = [p.x, p.y];
  }
  BURST_O.set(key, o);
  return o;
}
/** The landing splashes: [frame, size]. */
export const LANDINGS: readonly (readonly [number, number])[] = [
  [24, 1],
  [36, 0.6],
  [48, 0.8],
  [60, 0.6],
  [144, 1.1],
];

/** The cartouche on the 0.3 plane, its seal's bytes (R1-T10 order, one column). */
export const CART = { x: 1690, y: 74, w: 140, h: 410 } as const;
export const BYTES = MOCHI_CARTOUCHE.bytes;
