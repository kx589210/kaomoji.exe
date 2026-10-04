// The ending's kit (the five parts' common pure helpers, build sheet notes/b58/ending-sheet.md §7): its inks (the colour law,
// OUTRO_HEX run through linear()), layout px ↔ the flat world, mono lines on the terminal's cells, rounded faces typeset glyph by
// glyph (so an eye can wink alone), whole faces with their ω re-inked amber, and the pops, glows and eases every part uses.
// The hand-off geometry two parts must agree on is src/shots/outroShared.ts (the lead's); this file is the ending builder's own.
// Pure: Node tests import it. Layout px: 1920 × 1080, origin top-left, y down; the flat world: centre, y up (1 unit = 1 px at 1080p).
import type { RGB } from '../engine/color.ts';
import { linear, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp } from '../engine/math.ts';
import { SWAP_LEAD } from '../engine/temporal.ts';
import { cellWidth, layoutLines } from '../engine/textGrid.ts';
import type { Advance } from '../engine/typeset.ts';
import { OUTRO_HEX } from './outroShared.ts';

// ——— Space ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Layout x → flat world x. */
export const X = (x: number): number => x - 960;
/** Layout y → flat world y. */
export const Y = (y: number): number => 540 - y;
/**
 * The layout y of a glyph's centre (its atlas quad's middle line: Canvas `textBaseline = 'middle'`) for type of `size` px set on
 * `baseline`: the em box's middle sits ≈ 0.3 em above the alphabetic baseline in JetBrains Mono, M PLUS Rounded and Inter Tight.
 */
export const MIDDLE = 0.3;
export const middleY = (baseline: number, size: number): number => baseline - MIDDLE * size;

// ——— Inks (linear light; above 1 blooms) ——————————————————————————————————————————————————————————————————————————————————————

export const INKS = {
  blue: linear(OUTRO_HEX.blue),
  blueEdge: linear(OUTRO_HEX.blueEdge),
  /** E1's type: #F2F6FF ×1.2 (a slight bloom), its dim, its small print (#A9BCF5 at 55 %). */
  text: linear(OUTRO_HEX.blueText, 1.2),
  paper: linear(OUTRO_HEX.blueText, 0.92),
  dim: linear(OUTRO_HEX.blueDim),
  small: linear(OUTRO_HEX.blueDim, 0.55),
  navy: linear(OUTRO_HEX.navy),
  band: linear(OUTRO_HEX.band),
  /** DEFENDER red, emissive (×1.6 on dark grounds: the ring, the dot, the rim; ×1.25 on blue, on its navy chip). */
  red: linear(OUTRO_HEX.red, 1.6),
  redOnBlue: linear(OUTRO_HEX.red, 1.25),
  /** The hero: phosphor amber ×1.9 (outroPhosphor's), the plain amber of an infected ω, the ✧. */
  hero: linear(OUTRO_HEX.amber, 1.9),
  amber: linear(OUTRO_HEX.amber, 1.5),
  starCore: linear(OUTRO_HEX.starCore, 2.2),
  pink: linear(OUTRO_HEX.pink, 1.6),
  green: linear(OUTRO_HEX.green, 1.4),
  mint: linear(OUTRO_HEX.mint, 1.2),
  mintDim: linear(OUTRO_HEX.mint, 0.55),
  ground: linear(OUTRO_HEX.ground),
  white: linear(OUTRO_HEX.white),
  hot: linear(OUTRO_HEX.white, 2.4),
} as const;

// ——— Time ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A brightness that jumps to 1 + k on `at` and decays with time constant `tau` (1 before `at`). */
export const glow = (f: number, at: number, k: number, tau: number): number => (f >= at ? 1 + k * Math.exp(-(f - at) / tau) : 1);
/**
 * A pop: `from` on `at`, back to 1 over `frames` (cubic-out); 1 before. It starts with the swap it pops (struck: SWAP_LEAD before
 * `at`), so every sub-frame that shows the new thing shows it popped (keyed on `at` itself it printed a second, unpopped copy).
 */
export const pop = (f: number, at: number, from: number, frames: number): number => {
  if (f < at - SWAP_LEAD) return 1;
  const u = clamp((f - at) / frames);
  return from + (1 - from) * (1 - (1 - u) ** 3);
};
/** Cubic-out over [at, at + frames] (0 before, 1 after): a move that starts at full speed on its frame and lands without overshoot. */
export const outCubicAt = (f: number, at: number, frames: number): number => {
  const u = clamp((f - at) / frames);
  return 1 - (1 - u) ** 3;
};
/** A squash pulse through `peak` and back to 1 over `frames` (a sine bump), from `at`. */
export const bump = (f: number, at: number, peak: number, frames: number): number => {
  const u = (f - at) / frames;
  return u <= 0 || u >= 1 ? 1 : 1 + (peak - 1) * Math.sin(Math.PI * u);
};

// ——— Mono lines on the terminal's cells ——————————————————————————————————————————————————————————————————————————————————————

/** A mono line's glyph ink by character index (code points). */
export type InkAt = (j: number, ch: string) => RGB;
export type MonoOpts = {
  /** The line's left edge (layout px) — or its centre with `centre: true`. */
  x: number;
  baseline: number;
  size: number;
  ink: InkAt;
  alpha?: number;
  /** Only the first `count` characters (code points) show: typing. */
  count?: number;
  centre?: boolean;
  /** `advance` of the mono atlas (ems): one cell is advance('0'). */
  advance: Advance;
  /** Characters (by index) to draw as another glyph (the decode flicker). */
  swap?: (j: number, ch: string) => string;
  /** A per-character scale (a pop). */
  scale?: (j: number) => number;
};
/** One cell of a mono line, in ems: JetBrains Mono's advance. */
export const cellEm = (advance: Advance): number => advance('0');
/** The width of a mono line in layout px (terminal cells: wide characters take two). */
export const monoWidth = (text: string, size: number, advance: Advance): number => {
  let w = 0;
  for (const ch of text) w += cellWidth(ch);
  return w * cellEm(advance) * size;
};
/** Glyphs of a mono line on its cells (spaces skipped), in the flat world. */
export function monoLine(text: string, o: MonoOpts): Glyph[] {
  const cell = cellEm(o.advance) * o.size;
  const left = o.centre ? o.x - monoWidth(text, o.size, o.advance) / 2 : o.x;
  const y = Y(middleY(o.baseline, o.size));
  const out: Glyph[] = [];
  layoutLines([text]).forEach((c, j) => {
    if (c.ch === ' ' || c.width === 0 || j >= (o.count ?? Infinity)) return;
    const ch = o.swap ? o.swap(j, c.ch) : c.ch;
    const k = o.scale ? o.scale(j) : 1;
    out.push({ ch, x: X(left + (c.col + c.width / 2) * cell), y, size: o.size * k, color: o.ink(j, c.ch), alpha: o.alpha });
  });
  return out;
}
/** Index ranges (code points) of a mono line's ink runs → an InkAt. */
export const inkRuns = (runs: readonly { from: number; to: number; ink: RGB }[], base: RGB): InkAt => (j) => runs.find((r) => j >= r.from && j < r.to)?.ink ?? base;

// ——— Rounded faces, glyph by glyph ————————————————————————————————————————————————————————————————————————————————————————————

/** The rounded atlas's tracking for his faces (the drop 2 hand-off sets him so: src/shots/drop2Crash.ts crispFace). */
export const FACE_TRACKING = 0.02;
/** Each glyph's centre offset (ems, from the face's centre) for a face typeset with `advance` (and per-slot advances `widths` if given). */
export function faceOffsets(chars: readonly string[], advance: Advance, widths?: readonly number[]): number[] {
  const w = widths ?? chars.map((ch) => advance(ch));
  const total = w.reduce((a, b) => a + b, 0) + FACE_TRACKING * (chars.length - 1);
  let x = -total / 2;
  return w.map((wi) => {
    const c = x + wi / 2;
    x += wi + FACE_TRACKING;
    return c;
  });
}
/** A face's width in ems (typeset with the face tracking). */
export const faceWidth = (chars: readonly string[], advance: Advance): number => chars.reduce((a, ch) => a + advance(ch), 0) + FACE_TRACKING * (chars.length - 1);
export type FaceGlyphOpts = {
  /** Centre, layout px (its middle line). */
  centre: readonly [number, number];
  em: number;
  advance: Advance;
  ink: (i: number, ch: string) => RGB;
  alpha?: number;
  rot?: number;
  /** Vertical squash about the face's middle line (1 = none), and a horizontal stretch of the whole face. */
  squash?: number;
  stretch?: number;
  /** Per-glyph overrides (a morph, a wink's scale). */
  edit?: (i: number, g: Glyph) => Glyph | null;
  widths?: readonly number[];
};
/** A face set glyph by glyph about its centre (rotated by `rot`), in the flat world. */
export function faceGlyphs(text: string | readonly string[], o: FaceGlyphOpts): Glyph[] {
  const chars = typeof text === 'string' ? [...text] : [...text];
  const offs = faceOffsets(chars, o.advance, o.widths);
  const [cx, cy] = [X(o.centre[0]), Y(o.centre[1])];
  const rot = o.rot ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const sx = o.stretch ?? 1;
  const out: Glyph[] = [];
  chars.forEach((ch, i) => {
    const dx = offs[i] * o.em * sx;
    let g: Glyph | null = { ch, x: cx + dx * cos, y: cy + dx * sin, size: o.em, color: o.ink(i, ch), alpha: o.alpha, rot, ...(o.squash !== undefined && o.squash !== 1 ? { stretch: 1 / Math.max(0.05, o.squash) } : {}) };
    if (o.squash !== undefined && o.squash !== 1) g = { ...g, size: o.em * o.squash };
    if (o.edit) g = o.edit(i, g);
    if (g) out.push(g);
  });
  return out;
}

// ——— Whole faces (mono, one atlas entry each) and their infected ω ——————————————————————————————————————————————————————————————

/**
 * Where each ω of a whole face sits, as the browser sets the string: the centre offsets (ems, from the face's centre) of its ω glyphs.
 * Measured by the scene from the font (prefix widths); tests fake it. The colour law: every infected ω is the hero's amber.
 */
export type OmegaPlan = (face: string) => readonly number[];
/** A plan for faces typeset with a per-character advance (the Node tests' fake, and the fallback). */
export const omegaPlanOf = (advance: Advance): OmegaPlan => (face) => {
  const chars = [...face];
  const total = chars.reduce((a, ch) => a + advance(ch), 0);
  const out: number[] = [];
  let x = -total / 2;
  for (const ch of chars) {
    if (ch === 'ω') out.push(x + advance(ch) / 2);
    x += advance(ch);
  }
  return out;
};
/** A whole face (atlas key `face`) at `centre` (layout px, its middle line) and its ω's re-inked in `omega` over it. */
export function wholeFace(face: string, o: { centre: readonly [number, number]; em: number; ink: RGB; omega?: RGB; alpha?: number; rot?: number; squash?: number; plan?: OmegaPlan; omegaKey?: string }): Glyph[] {
  const [cx, cy] = [X(o.centre[0]), Y(o.centre[1])];
  const sq = o.squash ?? 1;
  const out: Glyph[] = [{ ch: face, x: cx, y: cy, size: o.em * sq, stretch: sq !== 1 ? 1 / sq : undefined, color: o.ink, alpha: o.alpha, rot: o.rot }];
  if (o.omega && o.plan) {
    const rot = o.rot ?? 0;
    for (const dx of o.plan(face)) out.push({ ch: o.omegaKey ?? 'ω', x: cx + dx * o.em * Math.cos(rot), y: cy + dx * o.em * Math.sin(rot), size: o.em * sq, stretch: sq !== 1 ? 1 / sq : undefined, color: o.omega, alpha: o.alpha, rot });
  }
  return out;
}

/**
 * Where every character of a whole face sits as the browser sets it: the centre offsets (ems, from the face's centre) of its code
 * points, in order. Measured by the scene from the font (prefix widths); tests fake it (charPlanOf).
 */
export type CharPlan = (face: string) => readonly number[];
export const charPlanOf = (advance: Advance): CharPlan => (face) => {
  const chars = [...face];
  const total = chars.reduce((a, ch) => a + advance(ch), 0);
  let x = -total / 2;
  return chars.map((ch) => {
    const c = x + advance(ch) / 2;
    x += advance(ch);
    return c;
  });
};
/**
 * The guest's ￣ (U+FFE3) sit at the very top of the mono stack's em, so (￣▽￣) read as ( ▽ ) and ヽ(￣ω￣) as ( ω ) under a hat
 * (ending fixer a, round 1, reviews F7 / R1-GUEST-CHIP): set a glyph at a time, they drop this many ems to his eye line.
 */
export const BROW_DROP = 0.28;
/** A face set a glyph at a time on the browser's own places (a CharPlan), so single characters can move: each ￣ drops BROW_DROP em. Flat world. */
export function charFace(face: string, o: { centre: readonly [number, number]; em: number; plan: CharPlan; ink: (i: number, ch: string) => RGB; alpha?: number; rot?: number; squash?: number }): Glyph[] {
  const chars = [...face];
  const offs = o.plan(face);
  const [cx, cy] = [X(o.centre[0]), Y(o.centre[1])];
  const rot = o.rot ?? 0;
  const sq = o.squash ?? 1;
  const [c, s] = [Math.cos(rot), Math.sin(rot)];
  return chars.map((ch, i) => {
    const dx = offs[i] * o.em;
    const dy = ch === '￣' ? -BROW_DROP * o.em * sq : 0;
    return { ch, x: cx + dx * c - dy * s, y: cy + dx * s + dy * c, size: o.em * sq, stretch: sq !== 1 ? 1 / sq : undefined, color: o.ink(i, ch), alpha: o.alpha, rot };
  });
}

/** Linear mix toward black: `ink` at `level` (a fade that keeps the hue). */
export const at = (ink: RGB, level: number): RGB => scaleRGB(ink, level);
/** Unique non-space characters of some strings (an atlas's list). */
export const charsOf = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
