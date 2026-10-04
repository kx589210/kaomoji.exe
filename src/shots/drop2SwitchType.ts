// The switch's type-design blueprint of his face (S31S, drop2 9; build sheet notes/bid2/drop2-sheet2.md §3 bar 9, design
// notes/extend/drop2-final.md §4.7 "Skeleton"): Defender v2.0 reads (•ω•) the way a type designer reads a font — the real contours of
// M PLUS Rounded 1c ExtraBold (the hero's face, public/fonts/mplus-rounded-1c-extrabold.ttf), each outline with its on-curve points and its
// quadratic handles, the parts on three planes (the brackets, the eyes, the ω) for the exploded scan, and the hardened face's brows.
// Pure: the scene parses the font (engine/extrude.ts loadOpentype) and hands the path commands in; tests parse the same file from disk.
// Units: em, x right from the face's left edge (its pen origin), y up from the baseline. Builder S owns this file.
import { HERO_ADVANCE } from './breakShared.ts';

/** A point in em (x right, y up). */
export type Pt = readonly [number, number];
/** An opentype.js path command, as `glyph.getPath(0, 0, unitsPerEm).commands` returns it (font units, y down). */
export type PathCmd = { type: 'M' | 'L' | 'Q' | 'C' | 'Z'; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
/** An off-curve control point and its two leader lines' ends (the on-curve points before and after it). */
export type Handle = { at: Pt; from: Pt; to: Pt };
/** One closed contour: its on-curve points in order, its handles, and the outline flattened (closed: the last point is the first). */
export type Contour = { on: Pt[]; handles: Handle[]; poly: Pt[] };
/** A glyph's plan: its contours, its ink box [x0, y0, x1, y1] and its advance. */
export type GlyphPlan = { contours: Contour[]; box: readonly [number, number, number, number]; advance: number };

/** The three planes the exploded scan lifts, back to front (design §4.7: 120 / 240 / 360 px in z). */
export type Layer = 'brackets' | 'eyes' | 'mouth';
export const LAYERS: readonly Layer[] = ['brackets', 'eyes', 'mouth'];

/**
 * (•ω•) as the film sets it: each part's character, its pen x (em) and its plane. The advances are the font's (shots/breakShared.ts
 * HERO_ADVANCE, the film's constant): ( 0.412 · • 0.526 · ω 0.822 · • 0.526 · ) 0.412 = 2.698 em, the face's width.
 */
export const FACE_PARTS: readonly { part: string; ch: string; x: number; layer: Layer }[] = [
  { part: 'open', ch: '(', x: 0, layer: 'brackets' },
  { part: 'eyeL', ch: '•', x: 0.412, layer: 'eyes' },
  { part: 'mouth', ch: 'ω', x: 0.938, layer: 'mouth' },
  { part: 'eyeR', ch: '•', x: 1.76, layer: 'eyes' },
  { part: 'close', ch: ')', x: 2.286, layer: 'brackets' },
];
/** The face's advance width in em: what the film calls his width (S27_MASTER: 1240 px at em 459.6). */
export const FACE_ADVANCE = 2.698;
/** The brackets' ink runs from −0.185 to 0.770 em: its middle, 0.2925 em above the baseline, is the face's centre (S27_MASTER). */
export const INK_MID = 0.2925;
/** The face's ink box in em [x0, y0, x1, y1] (the font's; tests/drop2SwitchType.test.ts checks it against faceInkBox). */
export const FACE_INK = [0.061, -0.185, 2.637, 0.77] as const;

/**
 * The hardened face (•̀ω•́) (HERO2.hard, the flood): the font's combining grave over the left eye, the acute over the right, each mark's
 * ink centred on its eye's ink in x and kept at the font's own height (0.59–0.77 em, just over the • at 0.51). The marks have no advance
 * and the font does not position them without GPOS, so facePlans places them itself (it needs the ink boxes): FacePlans.brows.
 */
export const BROW_CHARS = ['̀', '́'] as const;

/** Every character the plan needs from the font. */
export const FACE_CHARS: readonly string[] = ['(', '•', 'ω', ')', ...BROW_CHARS];
/** Their advances in em: the film's (shots/breakShared.ts HERO_ADVANCE, the font's own — tests check it); the combining marks have none. */
export const FACE_CHAR_ADVANCE: Readonly<Record<string, number>> = { '(': HERO_ADVANCE['('], '•': HERO_ADVANCE['•'], ω: HERO_ADVANCE.ω, ')': HERO_ADVANCE[')'], '̀': 0, '́': 0 };

const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;

/**
 * A glyph's plan from its path commands (`cmds` in font units, y down, as `getPath(0, 0, upm)` gives them): every contour's on-curve points,
 * one handle per quadratic (two per cubic), and the outline flattened into chords no longer than `maxChord` em.
 */
export function glyphPlan(cmds: readonly PathCmd[], advance: number, upm = 1000, maxChord = 0.05): GlyphPlan {
  const P = (x: number | undefined, y: number | undefined): Pt => [r6((x ?? 0) / upm), r6(-(y ?? 0) / upm)];
  const contours: Contour[] = [];
  let cur: Contour | null = null;
  let pen: Pt = [0, 0];
  let start: Pt = [0, 0];
  const seg = (to: Pt): void => {
    cur!.poly.push(to);
  };
  const close = (): void => {
    if (!cur) return;
    const first = cur.poly[0];
    const last = cur.poly[cur.poly.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      // Straight back to the start, in chords.
      const n = Math.max(1, Math.ceil(Math.hypot(first[0] - last[0], first[1] - last[1]) / maxChord));
      for (let i = 1; i <= n; i++) seg(i === n ? first : [r6(last[0] + ((first[0] - last[0]) * i) / n), r6(last[1] + ((first[1] - last[1]) * i) / n)]);
    }
    // The closing point repeats the first on-curve point: keep it once.
    const on = cur.on;
    if (on.length > 1 && on[on.length - 1][0] === on[0][0] && on[on.length - 1][1] === on[0][1]) on.pop();
    contours.push(cur);
    cur = null;
  };
  for (const c of cmds) {
    if (c.type === 'M') {
      close();
      pen = start = P(c.x, c.y);
      cur = { on: [pen], handles: [], poly: [pen] };
    } else if (c.type === 'L') {
      const to = P(c.x, c.y);
      const n = Math.max(1, Math.ceil(Math.hypot(to[0] - pen[0], to[1] - pen[1]) / maxChord));
      for (let i = 1; i <= n; i++) seg(i === n ? to : [r6(pen[0] + ((to[0] - pen[0]) * i) / n), r6(pen[1] + ((to[1] - pen[1]) * i) / n)]);
      cur!.on.push(to);
      pen = to;
    } else if (c.type === 'Q') {
      const k = P(c.x1, c.y1);
      const to = P(c.x, c.y);
      const len = Math.hypot(k[0] - pen[0], k[1] - pen[1]) + Math.hypot(to[0] - k[0], to[1] - k[1]);
      const n = Math.max(2, Math.ceil(len / maxChord));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        seg(i === n ? to : [r6(u * u * pen[0] + 2 * u * t * k[0] + t * t * to[0]), r6(u * u * pen[1] + 2 * u * t * k[1] + t * t * to[1])]);
      }
      cur!.handles.push({ at: k, from: pen, to });
      cur!.on.push(to);
      pen = to;
    } else if (c.type === 'C') {
      const k1 = P(c.x1, c.y1);
      const k2 = P(c.x2, c.y2);
      const to = P(c.x, c.y);
      const len = Math.hypot(k1[0] - pen[0], k1[1] - pen[1]) + Math.hypot(k2[0] - k1[0], k2[1] - k1[1]) + Math.hypot(to[0] - k2[0], to[1] - k2[1]);
      const n = Math.max(2, Math.ceil(len / maxChord));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        const b = (a: number, p: number, q: number, d: number): number => u * u * u * a + 3 * u * u * t * p + 3 * u * t * t * q + t * t * t * d;
        seg(i === n ? to : [r6(b(pen[0], k1[0], k2[0], to[0])), r6(b(pen[1], k1[1], k2[1], to[1]))]);
      }
      cur!.handles.push({ at: k1, from: pen, to: k2 }, { at: k2, from: k1, to });
      cur!.on.push(to);
      pen = to;
    } else if (c.type === 'Z') {
      close();
      pen = start;
    }
  }
  close();
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of contours)
    for (const [x, y] of c.poly) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return { contours, box: [x0, y0, x1, y1], advance };
}

/** The face's plans, by character, and the brows placed over the eyes. */
export type FacePlans = { glyphs: Readonly<Record<string, GlyphPlan>>; brows: readonly { part: string; ch: string; x: number; layer: Layer }[] };

/** Every glyph the face needs, from a font reader (`read(ch)` → its commands in font units and its advance in em), with the brows placed. */
export function facePlans(read: (ch: string) => { cmds: readonly PathCmd[]; advance: number }, upm = 1000): FacePlans {
  const glyphs: Record<string, GlyphPlan> = {};
  for (const ch of FACE_CHARS) {
    const r = read(ch);
    glyphs[ch] = glyphPlan(r.cmds, r.advance, upm);
  }
  const eyes = FACE_PARTS.filter((p) => p.layer === 'eyes');
  const eye = glyphs['•'];
  const brows = BROW_CHARS.map((ch, k) => {
    const g = glyphs[ch];
    const ex = eyes[k].x + (eye.box[0] + eye.box[2]) / 2;
    return { part: k === 0 ? 'browL' : 'browR', ch, x: ex - (g.box[0] + g.box[2]) / 2, layer: 'eyes' as Layer };
  });
  return { glyphs, brows };
}

/** The face's ink box in em [x0, y0, x1, y1] (the brackets bound it). */
export function faceInkBox(plans: FacePlans): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of FACE_PARTS) {
    const b = plans.glyphs[p.ch].box;
    x0 = Math.min(x0, p.x + b[0]);
    y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, p.x + b[2]);
    y1 = Math.max(y1, b[3]);
  }
  return [x0, y0, x1, y1];
}

/** Where the face's em point lands in the flat world (px, y up) when the face is `width` wide (its advance) and centred on (cx, cy). */
export const emToWorld =
  (o: { cx: number; cy: number; width: number }) =>
  (p: Pt): [number, number] => {
    const em = o.width / FACE_ADVANCE;
    return [o.cx + (p[0] - FACE_ADVANCE / 2) * em, o.cy + (p[1] - INK_MID) * em];
  };
