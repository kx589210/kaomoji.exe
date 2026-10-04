// The curtain call's bows (build sheet notes/b58/ending-sheet.md r4 §3.4, §3.5; U5 and round 2's
// R2-U5U6-NOTES: the r3 bows dipped 0.15 em, ≈ 14 px, and read as a blink). Pure curves, no layout: OutroCompany
// (src/shots/outroCompany.ts) puts them on the wall, the headliners and the principals.
//   · the headliner's call: a pop on its 8th (scale 1.25 → 1, light 1.8 → 1, 4 f, L), then a real bow a 32nd later: down (I) 3 f to
//     0.35 em with squash y 0.85 / x 1.04 about its baseline, its bottom on the call's 16th (+ 6, on the 32nd grid: round-2 review a1;
//     r4.1 bottomed on + 7), held 3 f, up (L) by the call + 18 — still rising as the next one goes down;
//   · the principals' bow is a LAUNCH from its drum (round-2 reviews R2T-1 / a1: the r4.1 bows eased in (I) and bottomed 4–6 frames
//     after the kick, the clap and the button, so on each hit only the eye swap moved and the dip read as a reaction a 16th late):
//     down outCubic over `down` frames (a 16th; the hero's 4: his bow is the button) — ≥ 70 % of the dip by + 2, ≈ 90 % by + 3, no
//     recoil — to 0.4 em (the hero 0.45 em), the squash leading it (`squash` past its held y 0.85 / x 1.05, his 0.8 / 1.06, on + 2,
//     relaxing onto it by + `settle`: his top edge comes back ≤ 3 % of the dip), light + 40 % at the bottom (his + 50 %: he stays the
//     brightest of the three through the held tableau, U5b), and held (the stream takes them); his pose is settled on the tableau
//     (5.2e = the button + 6), where the dive takes his cell;
//   · the wall's texture bow (the print wave and the stadium wave): 0.25 em, squash 0.8, 4 f down, 8 up;
//   · the hero's living hold: his ω dips 3 px on each kick of the encore.
// "About its baseline": a glyph is drawn about its middle line, which stands `base` ems above the baseline (the font's (ascender +
// descender) / 2: JetBrains Mono 0.36, M PLUS Rounded 0.3775), so a squash sy lowers the middle by (1 − sy)·base ems.
import { clamp, ease } from '../engine/math.ts';

/** A bow's state: how far the face has gone down (ems, + down), its squash (y) and stretch (x) factors, its light factor. */
export type BowState = { dip: number; sy: number; sx: number; light: number };
export const BOW_REST: BowState = { dip: 0, sy: 1, sx: 1, light: 1 };

/** The middle line's height above the baseline, in ems, for the two stacks the company draws in. */
export const BASELINE = { mono: 0.36, rounded: 0.3775 } as const;
/** How far a squash sy moves a face's middle line down when it squashes about its baseline (ems). */
export const baselineDrop = (sy: number, base: number): number => (1 - sy) * base;

/** The headliner's call (sheet §3.4): the pop, then its bow a 32nd later, the bottom on the call's 16th (+ 6), held 3, up by + 18. */
export const HEADLINER = { pop: { scale: 0.25, light: 0.8, frames: 4 }, lag: 3, down: 3, hold: 3, up: 9, dip: 0.35, sy: 0.85, sx: 1.04, light: 0.4 } as const;
/**
 * The principals' bows (sheet §3.5): a launch from the drum, down outCubic in `down` frames, the squash `squash` past its held value on
 * + 2 and settled onto it by + `settle`; held. The cat's and the guest's bottom on their drum's 16th, his in 4 (the button).
 */
export const PRINCIPAL = { down: 6, settle: 6, squash: 0.12, dip: 0.4, sy: 0.85, sx: 1.05, light: 0.4 } as const;
export const HERO_BOW = { down: 4, settle: 6, squash: 0.08, dip: 0.45, sy: 0.8, sx: 1.06, light: 0.5 } as const;
/** A principal's bow shape (PRINCIPAL, HERO_BOW). */
export type BowShape = { down: number; settle: number; squash: number; dip: number; sy: number; sx: number; light: number };
/** The wall's bow (texture): 0.25 em, squash 0.8, light + 60 %, 4 frames down (inOutSine), 8 up. */
export const WALL_BOW = { down: 4, up: 8, dip: 0.25, sy: 0.8, light: 0.6 } as const;

/** The call's pop at instant f (struck on the call: the scale and the light it adds, 0 before the call and from + 4). */
export function callPop(f: number, call: number): { scale: number; light: number } {
  const t = f - call;
  if (t < -0.25) return { scale: 1, light: 1 };
  const k = (1 - clamp(t / HEADLINER.pop.frames)) ** 2;
  return { scale: 1 + HEADLINER.pop.scale * k, light: 1 + HEADLINER.pop.light * k };
}

/** How far down a bow is (0 → 1): down I (cubic) over `down` frames from `at`, then held `hold` frames, then up L (outCubic) over `up` frames; `hold` Infinity holds it. */
export function bowDepth(f: number, at: number, down: number, hold = Infinity, up = 8): number {
  const t = f - at;
  if (t <= 0) return 0;
  if (t < down) return (t / down) ** 3;
  if (t < down + hold) return 1;
  return 1 - ease.outCubic(clamp((t - down - hold) / up));
}

/** A headliner's bow at instant f for its call (the bottom on call + 6, held to + 9, up by + 18). */
export function headlinerBow(f: number, call: number): BowState {
  const k = bowDepth(f, call + HEADLINER.lag, HEADLINER.down, HEADLINER.hold, HEADLINER.up);
  return { dip: HEADLINER.dip * k, sy: 1 - (1 - HEADLINER.sy) * k, sx: 1 + (HEADLINER.sx - 1) * k, light: 1 + HEADLINER.light * k };
}

/**
 * The launch of a principal's bow (0 → 1, held): it starts on its drum `at`, outCubic over `down` frames — 42 / 70 / 88 % on + 1 / + 2 /
 * + 3 for a 16th, 58 / 88 / 98 % for his 4 — so the step after the hit frame is the bow (check-sync's + 1 house style), and it reaches
 * the bottom with no recoil.
 */
export function bowLaunch(f: number, at: number, down: number): number {
  const t = f - at;
  if (t <= 0) return 0;
  return t >= down ? 1 : ease.outCubic(t / down);
}
/** The squash of a principal's bow (0 → 1, held): it leads the dip — out (quad) to 1 + `over` on + 2, then onto 1 by + `settle` (inOutSine). The overshoot is the y squash's only: the x stretch stops at its held value, so his width on screen never shrinks while the camera pushes in. */
export function bowSquash(f: number, at: number, settle: number, over: number): number {
  const t = f - at;
  if (t <= 0) return 0;
  if (t < 2) return (1 + over) * (1 - (1 - t / 2) ** 2);
  return t < settle ? 1 + over * (1 - ease.inOutSine((t - 2) / (settle - 2))) : 1;
}
/** A principal's bow from `at`: a launch from its drum, the squash leading it; held. */
export function principalBow(f: number, at: number, o: BowShape = PRINCIPAL): BowState {
  const k = bowLaunch(f, at, o.down);
  const q = bowSquash(f, at, o.settle, o.squash);
  return { dip: o.dip * k, sy: 1 - (1 - o.sy) * q, sx: 1 + (o.sx - 1) * Math.min(1, q), light: 1 + o.light * k };
}

/** The wall's texture bow from `at`: 4 frames down (inOutSine), 8 up (0 outside). */
export function wallBow(f: number, at: number, dip: number = WALL_BOW.dip): BowState {
  const t = f - at;
  if (t <= 0 || t >= WALL_BOW.down + WALL_BOW.up) return BOW_REST;
  const k = t < WALL_BOW.down ? ease.inOutSine(t / WALL_BOW.down) : 1 - ease.inOutSine((t - WALL_BOW.down) / WALL_BOW.up);
  return { dip: dip * k, sy: 1 - (1 - WALL_BOW.sy) * k, sx: 1, light: 1 + WALL_BOW.light * k };
}

/**
 * The line bow (U5b's held tableau; the sheet's 5.2e row): on the button the whole company bows with him — every headliner 0.3 em,
 * every wall face 0.2 em — a 32nd after his, down over a 16th, and holds until it lets go; the climax picture is the cast bowing.
 */
export const LINE_BOW = { lag: 3, down: 6, dip: 0.3, wallDip: 0.2, sy: 0.88, sx: 1.03, light: 0.25 } as const;
export function lineBow(f: number, at: number, dip: number = LINE_BOW.dip): BowState {
  const k = bowDepth(f, at + LINE_BOW.lag, LINE_BOW.down);
  return { dip: dip * k, sy: 1 - (1 - LINE_BOW.sy) * k, sx: 1 + (LINE_BOW.sx - 1) * k, light: 1 + LINE_BOW.light * k };
}

/** The deepest of several bows (a face in two waves at once bows as deep as the deeper). */
export const deepest = (bows: readonly BowState[]): BowState => bows.reduce((a, b) => (b.dip > a.dip ? b : a), BOW_REST);

/** The hero's living hold: his ω dips 3 px on a kick (down in 2 frames, back up by + 8), px. */
export function kickBob(f: number, kicks: readonly number[], px = 3): number {
  let d = 0;
  for (const k of kicks) {
    const t = f - k;
    if (t < 0 || t >= 8) continue;
    d = Math.max(d, t < 2 ? Math.sin((Math.PI / 2) * (t / 2)) : 1 - ease.outCubic((t - 2) / 6));
  }
  return px * d;
}

/** A step's dip (px): down over 2 frames on the step, up (L) over 8. */
export function stepDip(f: number, steps: readonly number[], px = 6): number {
  let d = 0;
  for (const s of steps) {
    const t = f - s;
    if (t < 0 || t >= 10) continue;
    d = Math.max(d, t < 2 ? Math.sin((Math.PI / 2) * (t / 2)) : 1 - ease.outCubic((t - 2) / 8));
  }
  return px * d;
}
