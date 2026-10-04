// W5, the readout in the party monitor's slot (style B, src/shots/hud.ts), back for the ending's last two bars (build sheet
// notes/b58/ending-sheet.md §5.1, threads.md (c)): typed in calm on outro 3.1&, its frame row counting the film's real frames (the
// wink's frame held in amber for an 8th: the promise kept, to the frame), its defender row the antivirus talking (red): `0 threats ✓`
// (the boot's verdict, bookended), `1 threat` blinking on the wink, 1 · 2 · 4 · 8 with the doublings, `∞` on the burst, and its last
// line friendly after the guest's last drop: `0 threats (•ω•)`. Screen-space (a screen overlay: no punch, no push, no world Look);
// OutroIris draws it from 3.1&, OutroCompany through the burst until the hem blanks it. Pure.
import { HERO_OUT, W5_DEFENDER, W5_SURVIVED, W5_TITLE, W5_WINK_ROW, w5Friends, w5Frame } from '../content/outro.ts';
import { type RGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import { BURST, COUNTER, DROP, MONITOR_BACK, SURVIVED, WINK } from '../score/outro.ts';
import { FRAMES_PER_BEAT } from '../score/tempo.ts';
import { COLS } from './hud.ts';
import { INKS, glow } from './outroKit.ts';
import { W5_BOX } from './outroShared.ts';

/** How long the wink's frame row holds in amber: an 8th. */
export const WINK_ROW_HOLD = FRAMES_PER_BEAT / 2;
/** The defender row's colours: the label and the count red (the antivirus talking); its last line's `0 threats` green, his face amber. */
export type W5Ink = 'frame' | 'text' | 'green' | 'red' | 'amber' | 'dim';
export type W5Row = { y: number; frame: readonly { col: number; text: string }[]; text: string; col: number; inks: (j: number, ch: string) => W5Ink; hidden?: boolean; flare?: number };

/** The defender row's text at output frame `F` (from 3.1&): its whole arc. */
export function defenderRow(F: number): string {
  if (F >= DROP.to) return W5_DEFENDER.friendly;
  if (F >= BURST) return W5_DEFENDER.infinite;
  const k = COUNTER.filter((at) => F >= at).length;
  if (k > 0) return W5_DEFENDER.doubling[k - 1];
  if (F >= WINK) return W5_DEFENDER.wink;
  return W5_DEFENDER.clean;
}
/** The wink's `1 threat` blinks twice (3 frames on, 3 off) from the wink. */
export const defenderBlinkOff = (F: number): boolean => F >= WINK && F < WINK + 12 && Math.floor((F - WINK) / 3) % 2 === 1;
/** The frame row at output frame F: the live film frame, the wink's held in amber for an 8th. */
export const frameRow = (F: number): string => (F >= WINK && F < WINK + WINK_ROW_HOLD ? W5_WINK_ROW : w5Frame(F));

/** W5's rows at output frame F with `friends` counted by the caller (the iris's doublings; the company's honest count). */
export function w5Rows(F: number, friends: number): W5Row[] {
  const r = W5_BOX.rows;
  const side = (y: number, text: string, inks: W5Row['inks'], extra: Partial<W5Row> = {}): W5Row => ({ y, frame: [{ col: 0, text: '║' }, { col: COLS - 1, text: '║' }], text, col: 2, inks, ...extra });
  const def = defenderRow(F);
  const friendly = def === W5_DEFENDER.friendly;
  const zeroAt = def.indexOf('0 threats');
  const faceAt = [...def].length - [...HERO_OUT.alive].length;
  const rows: W5Row[] = [
    { y: r.title, frame: [{ col: 0, text: `╔═${W5_TITLE}${'═'.repeat(COLS - 3 - W5_TITLE.length)}╗` }], text: '', col: 0, inks: () => 'frame' },
    side(r.friends, w5Friends(friends), (j) => (j < 10 ? 'text' : 'green')),
    side(r.frame, frameRow(F), (j) => (F >= WINK && F < WINK + WINK_ROW_HOLD ? 'amber' : j < 10 ? 'text' : 'dim')),
    side(r.defender, def, (j) => (friendly && j >= zeroAt && j < zeroAt + 9 ? 'green' : friendly && j >= faceAt ? 'amber' : 'red'), { hidden: defenderBlinkOff(F) }),
    { y: r.bottom, frame: [{ col: 0, text: `╚${'═'.repeat(COLS - 2)}╝` }], text: '', col: 0, inks: () => 'frame' },
  ];
  if (F >= SURVIVED) {
    const okEnd = '[ OK ]'.length;
    const face = W5_SURVIVED.indexOf(HERO_OUT.alive);
    rows.push({ y: r.line, frame: [], text: W5_SURVIVED, col: 2, inks: (j) => (j < okEnd ? 'green' : j >= face && j < face + [...HERO_OUT.alive].length ? 'amber' : 'text') });
  }
  return rows;
}

const INK_OF: Readonly<Record<W5Ink, RGB>> = { frame: INKS.mintDim, text: INKS.mint, green: INKS.green, red: INKS.red, amber: INKS.amber, dim: scaleRGB(INKS.mint, 0.8) };
const PANEL = INKS.ground;

/**
 * W5 drawn at instant `f` (screen px, the flat world: centre, y up). Typed in over 8 frames from MONITOR_BACK, column by column, the
 * frame with the rows; every change of a row flares it (the readout's blip); `friendsAt(F)` counts; `blank(y)` (the hem) hides
 * everything above a layout y; `level` dims the whole box.
 */
export function w5Content(f: number, advance: Advance, friendsAt: (F: number) => number, o: { blankTo?: number; level?: number } = {}): FlatContent {
  const F = Math.round(f);
  if (F < MONITOR_BACK) return { under: [], glyphs: {}, over: [] };
  const typed = clamp((F - MONITOR_BACK) / 8);
  const shown = smoothstep(-1, 1, F - MONITOR_BACK) * (o.level ?? 1);
  const cell = advance('═') * W5_BOX.size;
  const left = W5_BOX.x0 + 6;
  const blank = o.blankTo ?? -Infinity;
  const count = Math.ceil(typed * COLS * 1.5);
  const friends = friendsAt(F);
  const friendsFlare = Math.max(1, ...[0, 1, 2, 3].map((k) => (friendsAt(F - k) !== friendsAt(F - k - 1) ? glow(F, F - k, 0.8, 2) : 1)));
  const glyphs: Glyph[] = [];
  for (const row of w5Rows(F, friends)) {
    if (row.y < blank) continue;
    const y = 540 - row.y;
    const flare = row.y === W5_BOX.rows.friends ? friendsFlare : 1;
    const put = (text: string, col: number, ink: (j: number, ch: string) => RGB) =>
      [...text].slice(0, Math.max(0, count - col)).forEach((ch, j) => {
        if (ch.trim() !== '') glyphs.push({ ch, x: left - 960 + (col + j + 0.5) * cell, y, size: W5_BOX.size, color: ink(j, ch), alpha: shown });
      });
    for (const fr of row.frame) put(fr.text, fr.col, () => INK_OF.frame);
    if (!row.hidden) put(row.text, row.col, (j, ch) => scaleRGB(INK_OF[row.inks(j, ch)], flare));
  }
  const top = Math.max(W5_BOX.y0, blank);
  const under: Shape[] = top < W5_BOX.y1 ? [{ kind: 'rect', x: (W5_BOX.x0 + W5_BOX.x1) / 2 - 960, y: 540 - (top + W5_BOX.y1) / 2, w: W5_BOX.x1 - W5_BOX.x0, h: W5_BOX.y1 - top, color: PANEL, alpha: 0.85 * shown }] : [];
  return { under, glyphs: { mono: glyphs }, over: [] };
}
