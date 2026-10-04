// Helpers shared by the flat-world shots: glyphs for a line of text or a
// kaomoji, and rules drawn from one end. Pure.
import { type Kaomoji, type PlacedPart, layoutFace } from '../actors/cast.ts';
import type { RGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import { type Advance, typeset } from '../engine/typeset.ts';

export type TextOpts = {
  x: number;
  y: number;
  size: number;
  color: RGB;
  advance: Advance;
  /** 0 = x is the left edge, 0.5 = the centre, 1 = the right edge. */
  align?: number;
  tracking?: number;
  alpha?: number;
  z?: number;
  /** Only the first `count` characters show (typing). */
  count?: number;
};

/** Glyphs for one line of text; a space takes its advance and draws nothing. */
export function textGlyphs(text: string, o: TextOpts): Glyph[] {
  const line = typeset(text, o.advance, o.tracking ?? 0);
  const left = o.x - (o.align ?? 0) * line.width * o.size;
  const out: Glyph[] = [];
  line.chars.forEach((c, i) => {
    if (c.ch === ' ' || i >= (o.count ?? Infinity)) return;
    out.push({ ch: c.ch, x: left + c.x * o.size, y: o.y, z: o.z, size: o.size, color: o.color, alpha: o.alpha });
  });
  return out;
}

/** Width of a line of text in world units. */
export const textWidth = (text: string, size: number, advance: Advance, tracking = 0): number => typeset(text, advance, tracking).width * size;

export type FaceOpts = {
  x: number;
  y: number;
  size: number;
  advance: Advance;
  ink: (part: PlacedPart) => RGB;
  z?: number;
  alpha?: number;
  /** Changes a part (swaps, moves, stretches it) or drops it (null). */
  edit?: (part: PlacedPart, g: Glyph) => Glyph | null;
};

/** Glyphs for kaomoji `k` centred at (x, y), one per part. */
export function faceGlyphs(k: Kaomoji, o: FaceOpts): Glyph[] {
  const out: Glyph[] = [];
  for (const p of layoutFace(k, o.advance)) {
    const g: Glyph = { ch: p.ch, x: o.x + p.dx * o.size, y: o.y, z: o.z, size: o.size, color: o.ink(p), alpha: o.alpha };
    const e = o.edit ? o.edit(p, g) : g;
    if (e) out.push(e);
  }
  return out;
}

/** A horizontal or vertical rule from (x0, y0) towards (x1, y1), `p` (0–1) of it drawn from its start; null while nothing shows. */
export function rule(x0: number, y0: number, x1: number, y1: number, width: number, p: number, color: RGB, alpha?: number): Shape | null {
  if (p <= 0) return null;
  const x = x0 + (x1 - x0) * p;
  const y = y0 + (y1 - y0) * p;
  return { kind: 'rect', x: (x0 + x) / 2, y: (y0 + y) / 2, w: Math.max(width, Math.abs(x - x0)), h: Math.max(width, Math.abs(y - y0)), color, alpha };
}
