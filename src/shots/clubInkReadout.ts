// The comic club's party monitor (threads.md (c), rows 23.2–26.4), pure: the readout over the comic — the approved text-mode box, its
// geometry, rows, typing, fade and terminal colours exactly as src/shots/hud.ts draws them, with the club's two windows (src/score/club.ts
// READOUT_A on the dance floor, READOUT_C from the trap to the glass) and warnings (src/content/club.ts READOUT_LINES). It is the screen
// overlay, outside the comic (the comic pass never prints it). Its last frame is the box the break's falling monitor picks up on break
// 1.1 (src/shots/breakFall.ts monitorFall reads hud.ts hudContent there): when the club goes live, hud.ts takes these windows and
// warnings in place of v04's club window and the two stay one (sheet §5.2, §12). Screen px at 1080p, origin at the centre, y up.
import { type RGB, linear } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import { READOUT_LINES, READOUT_ROWS } from '../content/club.ts';
import { READOUT_A, READOUT_C, READOUT_WARNINGS, THROW } from '../score/club.ts';
import { BURST } from '../score/drop1.ts';
import { PALETTE } from '../worlds/terminal.ts';
import { COLS, HUD, formatFriends, meter } from './hud.ts';

const GREEN = linear(PALETTE.green, 1.4);
const DIM = linear(PALETTE.text, 0.55);
const AMBER = linear(PALETTE.amber, 1.5);
const RED = linear(PALETTE.pink, 1.6);
const PANEL = linear('#06091C');

/** When the readout is on screen: [from, to). */
export const INK_HUD_WINDOWS: readonly (readonly [number, number])[] = [
  [READOUT_A.from, READOUT_A.to],
  [READOUT_C.from, READOUT_C.to],
];
/** The warnings with their text, as hud.ts's Warning. */
export const INK_WARNINGS: readonly { from: number; to: number; text: string; level: 'warn' | 'err' }[] = READOUT_WARNINGS.map((w) => ({ from: w.from, to: w.to, text: READOUT_LINES[w.line], level: w.level }));

/** The readout at `frame`: friends ∞ and cpu 100 % all through the club; memory 99 %, then 128 % (red) from the throw. */
export function inkMonitorAt(frame: number): { friends: number; memory: number; cpu: number; warning: (typeof INK_WARNINGS)[number] | null } {
  return { friends: Infinity, memory: frame >= THROW ? 128 : 99, cpu: 100, warning: INK_WARNINGS.find((w) => frame >= w.from && frame < w.to) ?? null };
}

type Row = { frame: { col: number; text: string }[]; text: string; col: number; color: RGB };

/** The rows at `frame`, top to bottom, as hud.ts hudLines (memory amber over 90 %, red over 100 %; cpu amber at 100 %). */
export function inkHudLines(frame: number): Row[] {
  const m = inkMonitorAt(frame);
  const hot = m.memory > 100;
  const title = ' kaomoji.exe :: party monitor ';
  const side = (text: string, color: RGB): Row => ({ frame: [{ col: 0, text: '║' }, { col: COLS - 1, text: '║' }], text, col: 2, color });
  const pct = (n: number) => `${String(n).padStart(3)}%`;
  const rows: Row[] = [
    { frame: [{ col: 0, text: '╔═' + title + '═'.repeat(COLS - 3 - title.length) + '╗' }], text: '', col: 0, color: DIM },
    side(`${READOUT_ROWS[0].replace('∞', formatFriends(m.friends))}`, GREEN),
    side(`${READOUT_ROWS[1]}${meter(m.memory)} ${pct(m.memory)}`, hot ? RED : m.memory > 90 ? AMBER : GREEN),
    side(`${READOUT_ROWS[2]}${meter(m.cpu)} ${pct(m.cpu)}`, m.cpu >= 100 ? AMBER : GREEN),
    { frame: [{ col: 0, text: '╚' + '═'.repeat(COLS - 2) + '╝' }], text: '', col: 0, color: DIM },
  ];
  if (m.warning) rows.push({ frame: [], text: m.warning.text, col: 2, color: m.warning.level === 'err' ? RED : AMBER });
  return rows;
}

/** The readout drawn at instant `frame` (taken at the output frame), in screen px: hud.ts hudContent with the club's windows and rows. */
export function inkHudContent(frame: number, advance: Advance): FlatContent {
  const out = Math.round(frame);
  const w = INK_HUD_WINDOWS.find(([a, b]) => out >= a && out < b);
  if (!w) return { under: [], glyphs: {}, over: [] };
  const rows = inkHudLines(out);
  const typed = clamp((out - w[0]) / 8);
  const shown = smoothstep(-1, 1, out - w[0]) * (1 - smoothstep(w[1] - 4, w[1], out));
  const left = -960 + HUD.margin;
  const cell = advance('═') * HUD.size;
  const bottom = -540 + HUD.margin;
  const top = bottom + HUD.pitch * rows.length;
  const under: Shape[] = [{ kind: 'rect', x: left - 6 + (COLS * cell + 12) / 2, y: (top + bottom) / 2, w: COLS * cell + 12, h: top - bottom + 8, color: PANEL, alpha: HUD.panel * shown }];
  const glyphs: Glyph[] = [];
  const put = (text: string, col: number, y: number, color: RGB, count: number) => {
    [...text].slice(0, count).forEach((ch, i) => {
      if (ch.trim() !== '') glyphs.push({ ch, x: left + (col + i + 0.5) * cell, y, size: HUD.size, color, alpha: shown });
    });
  };
  rows.forEach((r, i) => {
    // The warning (the one row outside the box) blinks on the sixteenths, in phase with hud.ts (from BURST).
    if (r.frame.length === 0 && Math.floor((out - BURST) / 3) % 2 === 1) return;
    const y = top - i * HUD.pitch - HUD.pitch / 2;
    const count = Math.ceil(typed * COLS * 1.5);
    for (const f of r.frame) put(f.text, f.col, y, DIM, Math.max(0, count - f.col));
    put(r.text, r.col, y, r.color, Math.max(0, count - r.col));
  });
  return { under, glyphs: { mono: glyphs }, over: [] };
}
