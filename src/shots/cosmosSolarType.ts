// Renderer B's type (cosmos 3.1 → 5.1; build sheet notes/bcos/sheet.md §4.3–§4.4 and §8.2, design notes/cosmos3/final.md §4
// bars 17–18 and §8, threads.md (c)): the Powers-of-Ten labels in Inter Tight Black with their raised exponents (0.55 em on the cap line,
// never superscript code points), the exponent's odometer rolling through the fling (13 → 21) and the tilt (21 → 24), the captions and
// legends in JetBrains Mono, and the big threat counts (an amber number, a red THREATS) slamming on 3.4 and 4.4. Drawn as the screen
// overlay, once per output frame after the Riso pass (clean of the print and the blur). Pure: the layout only, in 1080p px from the
// frame centre (y up); the scene typesets it with its atlases' advances.
import { LEVEL_TYPE, plain, raisedRuns, sciCount, scaleLabel, threatWord } from '../content/cosmos.ts';
import { EXPONENT, FLING, LAP, LEVELS, QUASAR, TILT, threatsAt } from '../score/cosmos.ts';
import { Im, clamp01, lerp } from './cosmosSolarKit.ts';

export type Advance = (ch: string) => number;
export type Ink = 'cream' | 'amber' | 'red' | 'mono';
/** One glyph of the overlay: its atlas, character, centre, em, ink, opacity, turn (radians, counter-clockwise) and horizontal stretch. */
export type TypeGlyph = { atlas: 'display' | 'mono'; ch: string; x: number; y: number; size: number; ink: Ink; alpha: number; rot: number; stretch: number };

/** A raised run sits at this share of the em, its centre lifted this share of the em (its cap top on the main run's cap line). */
export const RAISED = { size: 0.55, lift: 0.2 } as const;

/**
 * The tilt's roll lands 2 f before the seam (on 5.1 − 2: the odometer reads a whole 24 for the cut, where C's 5.1 sets 10²⁴ m), so the
 * label never cuts mid-roll (BC1).
 */
export const TILT_ROLL_END = TILT.to - 2;
/** The exponent the label reads at output frame `frame` (EXPONENT's rolls; fractional while it rolls): 13 on bar 3, 21 on bar 4. */
export function exponentAt(frame: number): number {
  for (const row of EXPONENT) {
    if (row.from < LEVELS.solar || row.from >= LEVELS.web) continue;
    const to = row.from === TILT.from ? TILT_ROLL_END : row.to;
    if (frame >= row.from && frame < to) return lerp(row.a, row.b, (frame - row.from) / (to - row.from));
  }
  if (frame >= TILT_ROLL_END) return 24;
  return frame >= FLING.to ? 21 : 13;
}

/**
 * A line of display type with its raised runs, laid out along direction `rot` from (x, y) (the line's start, its centre line): each glyph's
 * centre, em, and the run it belongs to. `odometer` rolls the raised run's digits: the integer part of `value` sliding out and the next
 * sliding in (with two smear copies each, the motion-blurred strips).
 */
function line(text: string, o: { x: number; y: number; em: number; rot: number; advance: Advance; ink: (raised: boolean) => Ink; alpha: number; stretch?: number; odometer?: number }): TypeGlyph[] {
  const out: TypeGlyph[] = [];
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  const st = o.stretch ?? 1;
  let u = 0;
  const at = (du: number, dv: number): [number, number] => [o.x + c * du - s * dv, o.y + s * du + c * dv];
  for (const run of raisedRuns(text)) {
    const em = run.raised ? o.em * RAISED.size : o.em;
    const lift = run.raised ? o.em * RAISED.lift : 0;
    const roll = run.raised && o.odometer !== undefined ? o.odometer : null;
    const chars = [...run.text];
    const strings = roll === null ? [chars] : [[...String(Math.floor(roll))], [...String(Math.floor(roll) + 1)]];
    const frac = roll === null ? 0 : roll - Math.floor(roll);
    let width = 0;
    strings.forEach((cs, k) => {
      let du = u;
      for (const ch of cs) {
        const w = o.advance(ch) * em * st;
        if (ch !== ' ') {
          // The roll: the current value slides down out of the cap line, the next one drops in from above.
          const dv = roll === null ? 0 : (k === 0 ? -frac : 1 - frac) * em * 1.1;
          const a = roll === null ? 1 : k === 0 ? 1 - frac : frac;
          for (const [smear, sa] of roll === null || frac === 0 ? [[0, 1]] : [[0, 1], [0.12, 0.35], [-0.12, 0.35]]) {
            const [x, y] = at(du + w / 2, lift + dv + smear * em);
            out.push({ atlas: 'display', ch, x, y, size: em, ink: o.ink(run.raised), alpha: o.alpha * a * sa, rot: o.rot, stretch: st });
          }
        }
        du += w;
      }
      width = Math.max(width, du - u);
    });
    u += width;
  }
  return out;
}
/** The width (px) of display `text` at `em` (raised runs at 0.55 em). */
export function lineWidth(text: string, em: number, advance: Advance): number {
  return raisedRuns(text).reduce((w, r) => w + [...r.text].reduce((s, ch) => s + advance(ch), 0) * em * (r.raised ? RAISED.size : 1), 0);
}
/** A line of mono type, left-aligned at (x, y). */
function mono(text: string, x: number, y: number, em: number, advance: Advance, alpha: number): TypeGlyph[] {
  const out: TypeGlyph[] = [];
  let u = 0;
  for (const ch of text) {
    const w = advance(ch) * em;
    if (ch !== ' ') out.push({ atlas: 'mono', ch, x: x + u + w / 2, y, size: em, ink: 'mono', alpha, rot: 0, stretch: 1 });
    u += w;
  }
  return out;
}

/** The label's arrival: it slams in on its level's downbeat (1.25 → 1 over 3 f, an impact), its alpha up in 2 f. */
const slam = (f: number, at: number): { k: number; a: number } => ({ k: 1 + 0.25 * (1 - Math.min(1, Im(f - at + 3, 3))), a: clamp01((f - at + 1) / 2) });

/**
 * The overlay at output frame `frame`: bar 3's `10¹³ m` set vertically up the right edge (cropped by it), `SOLAR SYSTEM` and `1 ● = 1
 * planet` beside it, `4.2×10¹³ THREATS` slamming bottom-left on 3.4, the exponent rolling to 21 through the fling; bar 4's `10²¹ m` landing
 * bottom-right stretched by the warp and snapping sharp 6 f later, `MILKY WAY` · `1 ● = 1 star`, `9.9×10²⁰ THREATS` top-left on 4.4, the
 * exponent rolling to 24 through the tilt.
 */
export function bTypeAt(frame: number, adv: { display: Advance; mono: Advance }): TypeGlyph[] {
  const out: TypeGlyph[] = [];
  const e = exponentAt(frame);
  const rolling = Math.abs(e - Math.round(e)) > 1e-6;
  const odometer = rolling ? e : undefined;
  const label = (n: number) => scaleLabel(Math.round(n));
  if (frame < LEVELS.galaxy) {
    // Bar 3: vertical, reading bottom → top along the right edge, its cap tops cropped by the frame.
    const { k, a } = slam(frame, LEVELS.solar);
    const em = 300 * k;
    const text = label(rolling ? Math.floor(e) : e);
    const w = lineWidth(text, em, adv.display);
    out.push(...line(text, { x: 960 - em * 0.26, y: -w / 2, em, rot: Math.PI / 2, advance: adv.display, ink: () => 'cream', alpha: a, odometer }));
    const t = LEVEL_TYPE.solar;
    out.push(...mono(t.caption ?? '', 960 - em * 0.62 - 230, -455, 22, adv.mono, a));
    out.push(...mono(t.legend, 960 - em * 0.62 - 230, -485, 18, adv.mono, 0.8 * a));
    if (frame >= LAP.at && frame < FLING.from) out.push(...count(frame, LAP.at, -900, -420, 96, adv.display));
  } else {
    // Bar 4: bottom-right, stretched by the warp and snapping sharp on 4.1 + 6.
    const t0 = frame - LEVELS.galaxy;
    const stretch = t0 < 6 ? lerp(2.2, 1, (t0 / 6) ** 0.5) : 1;
    const em = 200;
    const text = label(rolling ? Math.floor(e) : e);
    const w = lineWidth(text, em, adv.display) * stretch;
    out.push(...line(text, { x: 930 - w, y: -440, em, rot: 0, advance: adv.display, ink: () => 'cream', alpha: clamp01((t0 + 1) / 2), stretch, odometer }));
    const t = LEVEL_TYPE.galaxy;
    out.push(...mono(`${t.caption ?? ''} · ${t.legend}`, 930 - 430, -320, 20, adv.mono, clamp01((t0 - 4) / 3)));
    if (frame >= QUASAR.at && frame < QUASAR.at + 12) out.push(...count(frame, QUASAR.at, -900, 420, 90, adv.display));
  }
  return out;
}

/** A big count on `at`: the number (amber, its exponent raised) and THREATS (red), slamming in (1.3 → 1 in 2 f), left-aligned at (x, y). */
function count(frame: number, at: number, x: number, y: number, em: number, advance: Advance): TypeGlyph[] {
  const n = threatsAt(at);
  const k = 1 + 0.3 * (1 - Math.min(1, Im(frame - at + 1, 2)));
  const num = sciCount(n);
  const e = em * k;
  const out = line(num, { x, y, em: e, rot: 0, advance, ink: () => 'amber', alpha: 1 });
  const w = lineWidth(num, e, advance);
  out.push(...line(` ${threatWord(n)}`, { x: x + w, y, em: e, rot: 0, advance, ink: () => 'red', alpha: 1 }));
  return out;
}

/** Every string this overlay can draw (for a test against the atlases' characters). */
export const B_TYPE_TEXTS: readonly string[] = [
  ...[13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((e) => plain(scaleLabel(e))),
  plain(sciCount(4.2e13)),
  plain(sciCount(9.9e20)),
  'THREATS',
];
