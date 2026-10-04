// The kit the transition's and the cosmos's renderers share (pure; the parts 'transition' and 'cosmos', "VERTIGO ∞ · LIGHTSPEED PRESS";
// build sheet notes/bcos/sheet.md §9–§10, design notes/cosmos3/final.md §8): the palette, the power dial (print → neon), the
// look of every output frame, the sub-frames the score asks for, and the stub each renderer starts from. The renderers' looks and
// temporals start here and may override a frame for a reason the sheet gives (the bang's blown white, the stutter's slices); the palette
// is the design's and is shared, never re-typed in a part.
// Plain Node loads this file (tests): no three / remotion / react imports.
import { type RGB, linear } from '../engine/color.ts';
import type { FlatContent, Paper } from '../engine/flatLayer.ts';
import type { RisoPrintLook } from '../engine/post/risoModel.ts';
import type { Shape } from '../engine/shapeField.ts';
import { DEFAULT_TEMPORAL, type Temporal } from '../engine/temporal.ts';
import type { Look } from '../engine/types.ts';
import { COSMOS, KICKS as COSMOS_KICKS, LEVELS, POWER, STUTTER, SUBFRAMES as COSMOS_SUBFRAMES, cs } from '../score/cosmos.ts';
import { CRASH, CROSS, SUBFRAMES as TRANSITION_SUBFRAMES, TRANSITION_START, at } from '../score/transition.ts';
import { misregistration, risoLook } from '../worlds/riso.ts';

// ——— The palette (design §8; one per role: red is the Defender's, amber is his, hosts are pink, cyan and cream) ————————————————————

export const HEX = {
  /** The Riso world's paper (renders #F0ECE2 under the grain), the inks as printed in bars 13–14. */
  PAPER: '#F2EDE3',
  PRINT_PINK: '#FF48B0',
  PRINT_BLUE: '#0078BF',
  /** The yellow plate: light and his sun in bars 13–14; him only from cosmos 1.1. */
  PRINT_YELLOW: '#FFE800',
  /** The films' Y plate prints a pale yellow, so a P × Y overprint reads raspberry, never the Defender's red (prototype j2). */
  FILM_YELLOW: '#FFF0A0',
  /** His sun's core in bars 13–14 (riso's last frame). */
  SUN_CORE: '#F26A45',
  /** The press passes' paper, one per kick of transition bar 2 (score PRESS_PASSES carries the same). */
  PASS_1: '#664285',
  PASS_2: '#272369',
  PASS_3: '#0A033B',
  PASS_4: '#0A0313',
  /** Neon: the plates powered (RisoPrint's tubes). */
  NEON_PINK: '#FF3D8B',
  CYAN: '#3FE0FF',
  AMBER: '#FFB23E',
  /** Paper as light; the point's core. */
  CORE: '#FFE2B4',
  /** The white-hot: the ✦ cross, the point, the bang's light. */
  WHITE_HOT: '#FFF6EC',
  /** The Defender's spot ink, drawn after the Riso pass: print red while p < 0.5, neon red from there. */
  RED_PRINT: '#E8402B',
  RED: '#FF4A1C',
  /** The void the club opens from. */
  VOID: '#07060C',
} as const;

/** Each cosmos bar's printed space (design §8 "ground"): never empty black until the sandbox's corners (6.3) turn VOID. */
export const GROUNDS: readonly string[] = ['#160F45', '#120D3C', '#0E0A30', '#0B0824', '#09071A', '#07060C'];

export const PAPER: RGB = linear(HEX.PAPER);
export const AMBER: RGB = linear(HEX.AMBER);
export const CYAN: RGB = linear(HEX.CYAN);
export const NEON_PINK: RGB = linear(HEX.NEON_PINK);
export const CORE: RGB = linear(HEX.CORE);
export const WHITE_HOT: RGB = linear(HEX.WHITE_HOT);
export const VOID: RGB = linear(HEX.VOID);

// ——— The power dial ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** RisoPrint's `power` at instant `frame` (score POWER: held from each row's `at`; a row with `to` ramps over [at, to)); 0 before the bang. */
export function powerAt(frame: number): number {
  let p = 0;
  for (const row of POWER) {
    if (frame < row.at) break;
    if (row.to === undefined || frame >= row.to) p = row.p;
    else {
      const t = (frame - row.at) / (row.to - row.at);
      p = p + (row.p - p) * t;
    }
  }
  return p;
}
/** The Defender's red at instant `frame`: print red while the dial is under 0.5, neon red from there (both drawn after the pass). */
export const defenderRed = (frame: number): string => (powerAt(frame) < 0.5 ? HEX.RED_PRINT : HEX.RED);

// ——— The looks ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The transition: drawn in ink with the Riso world's constants (multiply on paper in bar 1; the press passes switch the inks to light in
 * bar 2), so its first frame finishes exactly as the Riso print's last (risoLook). Bar 2: the grain thins 0.22 → 0.18 and the vignette
 * deepens 0.14 → 0.16 over the passes (2.1 → the cross on 2.4); from the crash a little bloom (0.15, high threshold: the sun and the
 * cross only).
 */
export function transitionLook(frame: number): Look {
  const base = risoLook();
  const u = Math.min(1, Math.max(0, (frame - at(2)) / (CROSS - at(2))));
  return {
    ...base,
    grain: base.grain + (0.18 - base.grain) * u,
    vignette: base.vignette + (0.16 - base.vignette) * u,
    bloom: frame >= CRASH ? { intensity: 0.15, threshold: 0.85, smoothing: 0.1, radius: 0.7 } : base.bloom,
  };
}

/** Design §8 per cosmos bar: bloom intensity / threshold, grain, vignette, aberration (px), the plates' misregistration (px). */
export const BAR_LOOK: readonly { bloom: number; threshold: number; grain: number; vignette: number; aberration: number; register: number }[] = [
  { bloom: 0.35, threshold: 0.9, grain: 0.16, vignette: 0.16, aberration: 0, register: 3 },
  { bloom: 0.5, threshold: 0.88, grain: 0.12, vignette: 0.17, aberration: 0, register: 3 },
  { bloom: 0.7, threshold: 0.85, grain: 0.09, vignette: 0.18, aberration: 0.2, register: 2 },
  { bloom: 0.85, threshold: 0.8, grain: 0.07, vignette: 0.2, aberration: 0.3, register: 1 },
  { bloom: 1.05, threshold: 0.77, grain: 0.06, vignette: 0.21, aberration: 0.4, register: 0 },
  { bloom: 1.15, threshold: 0.75, grain: 0.05, vignette: 0.22, aberration: 0.4, register: 0 },
];
/** px of chromatic aberration → the Look's UV units (the pipeline applies `aberration` as a UV offset). */
const ABERRATION_PER_PX = 1 / 1920;
/** Cosmos 4: the bloom rises with the neon ignition (0.85 → 1.0 as p goes 0.6 → 0.85); its plates come into register with it (1 → 0 px). */
const IGNITION_SPAN = { from: 0.6, to: 0.85 } as const;

/** The cosmos bar (1–6) instant `frame` lies in. */
export const cosmosBar = (frame: number): number => Math.min(6, Math.max(1, Math.floor((frame - COSMOS.from) / 96) + 1));

/** The bars the print is staged on (sheet §9.2 "the stage"): cosmos 1–4. Cosmos 5–6 keep the press's own night (renderer C's look). */
export const STAGED_BARS = 4;
/** The white-hot the knock-outs reach as the power rises (design §8 "knockout paper → white-hot core"): paper at p 0.12 … white-hot at 0.85. */
const STAGE_HOT = { from: 0.12, to: 0.85 } as const;
/** The staged bars' bloom knee: its threshold this far above the stage paper's luminance (linear), this soft. */
export const STAGE_KNEE = { over: 0.05, smoothing: 0.15 } as const;
/** Relative luminance of a linear colour (Rec. 709, as the bloom's luminance pass). */
const lumaOf = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * The print's stage on cosmos 1–4 (sheet §9.2; the review's sheet-look): RisoPrint `levels` lands printed space on the bar's GROUNDS
 * (so the ground is the design's #160F45 … #0B0824, not the room-dimmed purple of the press's own space) and bare paper on paper →
 * white-hot as p rises (the knock-outs are the light; the room's dimming and its dusk no longer flatten them), and `hdr` 1 carries the
 * renderers' light above 1 through the print, so lamps, the sun, flares, streaks, glints, sparks, the bulge, the jets and the band
 * keep their energy for the bloom: draw them at 2–6× (HDR), in the picture (carried through) or in the screen overlay (after the print,
 * before the bloom). The bloom's knee sits just above the stage's paper (cosmosLook), so only that light glows. Cosmos 5–6: nothing
 * (C's look is the press's own neon).
 */
export function stageAt(frame: number, p = powerAt(frame)): Pick<RisoPrintLook, 'levels' | 'hdr'> {
  const bar = cosmosBar(frame);
  if (bar > STAGED_BARS) return {};
  const u = Math.min(1, Math.max(0, (p - STAGE_HOT.from) / (STAGE_HOT.to - STAGE_HOT.from)));
  const hot = u * u * (3 - 2 * u);
  const paper = [0, 1, 2].map((c) => PAPER[c] + (WHITE_HOT[c] - PAPER[c]) * hot) as unknown as RGB;
  return { levels: { ground: linear(GROUNDS[bar - 1]), paper }, hdr: 1 };
}

/**
 * The base finishing of cosmos output frame `frame`: the 3D render re-printed by RisoPrint at night (`night` 1) with the power dial, the
 * plates out of register by the bar's amount (snapping into register on every kick: misregistration's clack), then bloom, grain, vignette
 * and aberration by the bar; on cosmos 1–4 the print is staged (stageAt: the bar's ground, paper → white-hot, HDR carried through).
 * The bang (1.1–1.1e) blows the print to bare paper with its own exposure (builder A overrides), and cosmos 6
 * runs the aberration down to 0 by full power (stutter slice 4). The screen overlays (the Defender's red, the readout, the type) are drawn
 * after the print by the renderers' screenOverlay.
 */
export function cosmosLook(frame: number): Look {
  const bar = cosmosBar(frame);
  const row = BAR_LOOK[bar - 1];
  const p = powerAt(frame);
  let { bloom, aberration, register } = row;
  if (bar === 4) {
    const u = Math.min(1, Math.max(0, (p - IGNITION_SPAN.from) / (IGNITION_SPAN.to - IGNITION_SPAN.from)));
    bloom = 0.85 + 0.15 * u;
    register = 1 - u;
  }
  if (bar === 6) aberration *= Math.max(0, 1 - (p - 0.95) / 0.05);
  const offsets = register > 0 ? misregistration(frame, COSMOS_KICKS, register) : undefined;
  // voidPitch 0: the room fades smoothly; the default coarse void screen turns a held half power into a full-frame checkerboard.
  const stage = stageAt(frame, p);
  const riso: RisoPrintLook = { amount: 1, night: 1, power: p, voidPitch: 0, ...(offsets ? { offsets } : {}), ...stage };
  // Staged, the knock-outs are paper at full brightness: the bloom's knee sits just above the stage's paper, so light blooms (the
  // neon, the renderers' HDR light) and paper does not (a paper-level knee veils every ground with glow: +8 … +10 luma measured).
  const knee = stage.levels ? { threshold: Math.max(row.threshold, lumaOf(stage.levels.paper) + STAGE_KNEE.over), smoothing: STAGE_KNEE.smoothing } : { threshold: row.threshold, smoothing: 0.3 };
  return {
    toneMapping: 'linear',
    exposure: 1,
    bloom: { intensity: bloom, ...knee, radius: 0.75 },
    aberration: aberration * ABERRATION_PER_PX,
    grain: row.grain,
    vignette: row.vignette,
    riso,
  };
}

// ——— Sub-frames ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

type Window = { from: number; to: number; samples: number; shutter: number };
const fromWindows = (frame: number, windows: readonly Window[]): Temporal => {
  const w = windows.find((x) => frame >= x.from && frame < x.to);
  return w ? { samples: w.samples, shutter: w.shutter, persistence: 0 } : DEFAULT_TEMPORAL;
};
/** The transition's sub-frames at output frame `frame` (score SUBFRAMES; 16 at 0.5 elsewhere). */
export const transitionTemporal = (frame: number): Temporal => fromWindows(frame, TRANSITION_SUBFRAMES);
/** The cosmos's sub-frames at output frame `frame` (score SUBFRAMES; 16 at 0.5 elsewhere; 1 through the stutter). */
export const cosmosTemporal = (frame: number): Temporal => fromWindows(frame, COSMOS_SUBFRAMES);

// ——— The stub every renderer starts from ——————————————————————————————————————————————————————————————————————————————————————————

/** The flat world's camera (1 unit = 1 px at z = 0; src/shots/swiss.ts FRONT, FOV 20). */
export { FOV, FRONT } from './swiss.ts';
/** The output frame a sub-frame instant belongs to (drum-timed swaps land whole on their drum's frame). */
export const frameOf = (f: number): number => Math.floor(f + 0.5);

/** The characters a stub's label can show. */
export const STUB_CHARS = 'transitoncsmABCgehz·0123456789.+ ';

/**
 * A renderer not built yet: its ground, a bar along the bottom filling over its frames [from, to), a block on every kick (so a stub cut
 * still shows the beat) and a label (`cosmos A · 2.3 · +124`). Not part of the design: replace it.
 */
export function stubContent(f: number, o: { label: string; part: 'transition' | 'cosmos'; from: number; to: number; ground: RGB; kicks: readonly number[] }): { content: FlatContent; paper: Paper; text: string } {
  const u = Math.min(1, Math.max(0, (f - o.from) / (o.to - o.from)));
  const ink = o.ground === PAPER ? linear(HEX.PRINT_BLUE) : PAPER;
  const under: Shape[] = [{ kind: 'rect', x: -960 + 960 * u, y: -500, w: 1920 * u, h: 24, color: ink }];
  const d = frameOf(f);
  if (o.kicks.some((k) => d >= k && d < k + 6)) under.push({ kind: 'rect', x: 0, y: -460, w: 120, h: 40, color: AMBER });
  const start = o.part === 'transition' ? TRANSITION_START : COSMOS.from;
  const rel = d - start;
  const text = `${o.label} · ${Math.floor(rel / 96) + 1}.${Math.floor((rel % 96) / 24) + 1} · +${rel}`;
  return { content: { under, glyphs: {}, over: [] }, paper: { color: o.ground, grain: 0.035 }, text };
}

/** Each cosmos bar's ground as linear RGB (the stubs paint it; the builders' printed space starts from it). */
export const groundAt = (frame: number): RGB => linear(GROUNDS[cosmosBar(frame) - 1]);
/** The level that has arrived by instant `frame` (the one whose downbeat is the latest ≤ frame). */
export const levelAt = (frame: number): keyof typeof LEVELS => {
  let id: keyof typeof LEVELS = 'bang';
  for (const [k, at] of Object.entries(LEVELS) as [keyof typeof LEVELS, number][]) if (frame >= at) id = k;
  return id;
};
/** Inside the approved stutter (the renderers of cosmos 6 map output frames to content with the score's stutterFrame). */
export const inStutter = (frame: number): boolean => frame >= STUTTER.from && frame < STUTTER.to;
/** Cosmos 6.3: from here the sandbox's corners are VOID. */
export const VOID_CORNERS = cs(6, 3);
