// The party monitor's corner windows over drop 2 (build sheet notes/d2build/sheet.md §7.1; written by the integrator, no monitor
// builder ran). Pure: the readout carries the film's 暗线 from the break's overload to S31's full-screen box — W1 over S27 (`[ OK ] party
// resumed · (•ω•) v2.0`), W2 over the cube (costume 3/4 → cache full), W3 over S29 (`[ERR] unexpected dimension: z`) — memory ticking
// up a step a 16th from the break's 125 % toward the 255 % (0xFF) S31's box opens on. hud.ts's style B box (its `meter`,
// `formatFriends`, `HUD` metrics, read-only) in the bottom-left slot, typed in over 8 frames, folding shut over its last 5. Rulings
// (the integrator's): W3 folds before intro bar 4's frame (drop2 4.4 − 5 … 4.4 − 1) so S04's homage and the drop2 5.1 match cut have one subject; W4 is not
// drawn — S30's frame has no free corner (KICK/CLAP lanes bottom-left, SCORE and FULL top-left, COMBO top-right, HAT/VOX
// bottom-right), and its last line `[ OK ] FULL COMBO · memory 255% (0xFF)` opens S31's box instead. E9's fps line is
// Drop2Overload's (screenOverlay), never drawn here. Screen px, origin at the centre, y up (the flat world).
//
// Defender's quiet thread through act 1 (build sheet notes/bid2/drop2-sheet2.md §1.3 item I, §4.4, §7.2; design §4.4; the act-1
// fixer, round 1, R1-T03), additive over the approved bars (先保留、再加: item I's boxes — the bottom edge y ≥ 1056 and the window boxes):
//   - the HAIRLINE: 2 px of Defender's red at 70 % along the bottom edge (y 1076–1078), growing from the left on each downbeat it is keyed
//     to (score HAIRLINE: 4 % on drop2 1.1& … 94 % on 8.1, 100 % on 8.4), a 14 px mono tag riding its tip (`defender updating n%` →
//     `defender v2.0 downloaded`); on 8.4& it is no longer drawn here: the kernel lifts the same object into the install bar
//     (src/shots/drop2Kernel.ts installBarAt reads hairlineAt);
//   - Defender's red row in each window (score DEFENDER_ROWS: W1 `[DEFENDER] sandbox breached (￣ω￣;)`, W2 `4 scans · 0 matches`, W3
//     `2D scanner · axis z unsupported`): red, its ω amber (the infection); the box grows a row upward over 3 frames as it types in;
//   - the v1 slot (drop2 8.1 → 8.4& − 1): `defender.sys` in a red 2 px frame, bottom left, a log of its four lines, greyed by the hang.
import { AVATAR, MONITOR2, READOUT2, type ReadoutLine, hairlineTag } from '../content/drop2.ts';
import { type RGB, linear, mixRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import { DEFENDER_ROWS, FULL_COMBO, HAIRLINE, HANG, HATS2, INSTALL, KERNEL, W1, W2, W3 } from '../score/drop2.ts';
import { PALETTE } from '../worlds/terminal.ts';
import { LAW } from './drop2Shared.ts';
import { COLS, HUD, RAMP, formatFriends, meter } from './hud.ts';

const GREEN = linear(PALETTE.green, 1.4);
const DIM = linear(PALETTE.text, 0.55);
const AMBER = linear(PALETTE.amber, 1.5);
const RED = linear(PALETTE.pink, 1.6);
const PANEL = linear('#06091C');
/** Defender's red on the dark panels (emissive, LAW) and his amber (the ω inside Defender's lines: the infection). */
const DEFENDER = linear(LAW.defender.emissive, LAW.defender.emissiveGain);
const HERO = linear(LAW.hero, 1.5);
/** The hang's grey (a program that does not respond). */
const GREY = linear('#8E9592');

/** A line under the box: from `at` on (until the next), its level's colour; warnings and errors blink 3 on, 3 off. */
type Line = { at: number; text: string; level: 'ok' | 'warn' | 'err' };
/** Defender's red row in a window (additive, sheet §1.3 I): from `at` on, under the window's line. */
type DefenderRow = { at: number; text: string };
export type MonitorWindow = { from: number; to: number; lines: readonly Line[]; defender: DefenderRow };

/** Defender's line drawn at `at` on `site` (READOUT2: one script, one source of the strings). */
const readoutAt = (site: ReadoutLine['site'], at: number): string => {
  const l = READOUT2.find((x) => x.site === site && x.at === at);
  if (!l) throw new Error(`drop2Monitor: no ${site} line at ${at}`);
  return l.text;
};

/** The windows drop 2 draws (sheet §7.1, with the integrator's rulings in the header), each with Defender's red row (item I). */
export const MONITOR_WINDOWS: readonly MonitorWindow[] = [
  { from: W1.from, to: W1.to, lines: [{ at: W1.from, text: MONITOR2.w1, level: 'ok' }], defender: { at: DEFENDER_ROWS[0], text: readoutAt('W1', DEFENDER_ROWS[0]) } },
  { from: W2.from, to: W2.to, lines: [{ at: W2.from, text: MONITOR2.w2[0], level: 'ok' }, { at: W2.from + 24, text: MONITOR2.w2[1], level: 'warn' }], defender: { at: DEFENDER_ROWS[1], text: readoutAt('W2', DEFENDER_ROWS[1]) } },
  { from: W3.from, to: W3.to, lines: [{ at: W3.from, text: MONITOR2.w3, level: 'err' }], defender: { at: DEFENDER_ROWS[2], text: readoutAt('W3', DEFENDER_ROWS[2]) } },
];

/** Memory % through drop 2: the break's 125 % on drop2 1.1&, climbing past each window to 255 % (0xFF) on the FULL COMBO (S31 opens on it). */
const MEMORY_KEYS: readonly (readonly [number, number])[] = [
  [W1.from, 125],
  [W1.to, 135],
  [W2.from, 168],
  [W2.to, 180],
  [W3.from, 214],
  [W3.to, 230],
  [FULL_COMBO, 255],
];

/** Memory % at output frame `frame`: a counter ticking over on each 16th hat (held between), climbing linearly between the keys. */
export function memoryAt(frame: number): number {
  const out = Math.round(frame);
  const tick = HATS2.filter((h) => h <= out).pop() ?? out;
  let i = 0;
  while (i + 1 < MEMORY_KEYS.length && MEMORY_KEYS[i + 1][0] <= tick) i++;
  const [a, va] = MEMORY_KEYS[i];
  const next = MEMORY_KEYS[i + 1];
  if (!next || tick <= a) return va;
  return Math.round(va + ((tick - a) / (next[0] - a)) * (next[1] - va));
}

/** The line a window shows at `out`, or null. */
const lineAt = (w: MonitorWindow, out: number): Line | null => [...w.lines].reverse().find((l) => l.at <= out) ?? null;

/** Frames a window takes to fold shut (its last ones). */
const FOLD = 5;
/** Frames Defender's row takes to open its row (the box grows upward) and to type in. */
const ROW_GROW = 3;
const ROW_TYPE = 8;

/** Glyphs of one line laid by each character's own advance (Defender's lines hold full-width ￣), red with an amber ω, typed to `count`. */
function defenderLine(text: string, x: number, y: number, size: number, advance: Advance, color: RGB, alpha: number, count: number, omega: RGB = HERO): Glyph[] {
  const out: Glyph[] = [];
  let cx = x;
  [...text].forEach((ch, i) => {
    const w = advance(ch) * size;
    if (i < count && ch.trim() !== '') out.push({ ch, x: cx + w / 2, y, size, color: ch === 'ω' ? omega : color, alpha });
    cx += w;
  });
  return out;
}

/**
 * The windows at instant `frame`, read at the output frame (every step — a tick, a typed character, a blink — is whole on its frame):
 * the hud.ts box (title, friends, memory with its ramp meter, hype) on a dark backing, the window's line under it, typed in from the left
 * over 8 frames and folding toward its middle over the last 5; from its row's frame, Defender's red row under the line (the box grows a
 * row upward over 3 frames, the row typing in over 8). Empty outside every window.
 */
export function monitorContent(frame: number, advance: Advance): FlatContent {
  const out = Math.round(frame);
  const w = MONITOR_WINDOWS.find((x) => out >= x.from && out < x.to);
  if (!w) return { under: [], glyphs: {}, over: [] };
  const mem = memoryAt(out);
  const title = MONITOR2.title;
  const side = (s: string) => ({ frame: [{ col: 0, text: '║' }, { col: COLS - 1, text: '║' }], text: s });
  const rows: { frame: { col: number; text: string }[]; text: string; color: RGB }[] = [
    { frame: [{ col: 0, text: '╔═' + title + '═'.repeat(COLS - 3 - [...title].length) + '╗' }], text: '', color: DIM },
    { ...side(`${MONITOR2.rows[0]}  ${formatFriends(Infinity)}`), color: GREEN },
    { ...side(`${MONITOR2.rows[1]}   ${meter(mem)} ${mem}%`), color: mem > 100 ? RED : GREEN },
    { ...side(`${MONITOR2.rows[2]}     ${formatFriends(Infinity)}`), color: GREEN },
    { frame: [{ col: 0, text: '╚' + '═'.repeat(COLS - 2) + '╝' }], text: '', color: DIM },
  ];
  const l = lineAt(w, out);
  const blinkOff = l !== null && l.level !== 'ok' && Math.floor((out - l.at) / 3) % 2 === 1;
  const lineRow = l ? { frame: [], text: l.text, color: l.level === 'ok' ? GREEN : l.level === 'warn' ? AMBER : RED } : null;
  const typed = clamp((out - w.from + 1) / 8);
  const fold = clamp((w.to - out) / FOLD);
  const shown = smoothstep(-1, 1, out - w.from);
  const cell = advance('═') * HUD.size;
  const left = -960 + HUD.margin;
  const bottom = -540 + HUD.margin;
  // Defender's row: the box grows a row upward (cubic-out, whole on its third frame), the row types in under the window's line.
  const d = w.defender;
  const grow = out < d.at ? 0 : 1 - (1 - clamp((out - d.at + 1) / ROW_GROW)) ** 3;
  const n = rows.length + 1 + grow;
  const top = bottom + HUD.pitch * n;
  const mid = (top + bottom) / 2;
  const y = (i: number) => mid + (top - i * HUD.pitch - HUD.pitch / 2 - mid) * fold;
  const boxTop = mid + (top - mid) * fold;
  const boxBottom = mid + (bottom - mid) * fold; // the backing runs under the line too, so it reads over the brightest world
  const under: Shape[] = [{ kind: 'rect', x: left - 6 + (COLS * cell + 12) / 2, y: (boxTop + boxBottom) / 2, w: COLS * cell + 12, h: boxTop - boxBottom + 8 * fold, color: PANEL, alpha: HUD.panel * shown * fold }];
  const glyphs: Glyph[] = [];
  const count = Math.ceil(typed * (COLS + 2));
  const put = (s: string, col: number, row: number, color: RGB) => {
    [...s].slice(0, Math.max(0, count - col)).forEach((ch, i) => {
      if (ch.trim() !== '') glyphs.push({ ch, x: left + (col + i + 0.5) * cell, y: y(row), size: HUD.size, color, alpha: shown * (0.35 + 0.65 * fold) });
    });
  };
  rows.forEach((r, i) => {
    for (const f of r.frame) put(f.text, f.col, i, DIM);
    put(r.text, 2, i, r.color);
  });
  if (lineRow && !blinkOff) put(lineRow.text, 2, rows.length, lineRow.color);
  if (out >= d.at) {
    const typedRow = Math.ceil(clamp((out - d.at + 1) / ROW_TYPE) * ([...d.text].length + 1));
    glyphs.push(...defenderLine(d.text, left + 2 * cell, y(rows.length + 1), HUD.size, advance, DEFENDER, grow * shown * (0.35 + 0.65 * fold), typedRow));
  }
  return { under, glyphs: { mono: glyphs }, over: [] };
}

// ——— The hairline (sheet §4.4; design §4.4) ——————————————————————————————————————————————————————————————————————————————————————

/** The hairline's place and type (layout px): 2 px at 70 % on y 1076–1078; its tag 14 px mono, Defender red at 50 %, riding the tip. */
export const HAIR = { y: 1077, h: 2, alpha: 0.7, tag: 14, tagAlpha: 0.5, tagGap: 6, grow: 8 } as const;
export type Hairline = { pct: number; len: number; y: number; h: number; alpha: number; tag: string };

/**
 * The hairline at instant `f` (layout px), or null before its first key and from the install (8.4&: the kernel's install bar is the same
 * object, src/shots/drop2Kernel.ts installBarAt). On each HAIRLINE key it grows from the last length to the key's `pct` of the width,
 * launched on the key (the beat frame already moves) and cubic-out over 8 frames; its tag counts the percentage up with it.
 */
export function hairlineAt(f: number): Hairline | null {
  if (f >= INSTALL.from) return null;
  let pct = 0;
  HAIRLINE.forEach((k, i) => {
    const u = clamp((f - k.at + 1) / HAIR.grow);
    if (u <= 0) return;
    const prev = i === 0 ? 0 : HAIRLINE[i - 1].pct;
    pct = lerp(prev, k.pct, 1 - (1 - u) ** 3);
  });
  if (pct <= 0) return null;
  const n = Math.min(100, Math.round(pct));
  return { pct, len: (1920 * pct) / 100, y: HAIR.y, h: HAIR.h, alpha: HAIR.alpha, tag: hairlineTag(Math.max(1, n)) };
}

/** The hairline drawn at output frame `frame` (screen px): the line from the left edge and its tag right-aligned on its tip (never off the left edge). */
export function hairlineContent(frame: number, advance: Advance): FlatContent {
  const h = hairlineAt(Math.round(frame));
  if (!h) return { under: [], glyphs: {}, over: [] };
  const under: Shape[] = [{ kind: 'rect', x: -960 + h.len / 2, y: 540 - h.y, w: h.len, h: h.h, color: DEFENDER, alpha: h.alpha }];
  const width = [...h.tag].reduce((a, ch) => a + advance(ch) * HAIR.tag, 0);
  const x0 = Math.max(8, h.len - HAIR.tagGap - width);
  const glyphs = defenderLine(h.tag, -960 + x0, 540 - (h.y - HAIR.tagGap - HAIR.tag * 0.55), HAIR.tag, advance, DEFENDER, HAIR.tagAlpha, Infinity, DEFENDER);
  return { under, glyphs: { mono: glyphs }, over: [] };
}

// ——— The v1 slot (drop2 8: the kernel; sheet §4.4, §7.2) ————————————————————————————————————————————————————————————————————————

/** The v1 slot's box (layout px): bottom left, a red 2 px frame on #0C0F0E at 88 %; JetBrains Mono 24 px, four rows. */
export const SLOT1 = { x: 48, bottom: 1032, w: 620, size: 24, pitch: 34, pad: 14, rows: 4, open: 4, fold: 5, grey: 6, type: 8 } as const;
/** The slot's lines in the kernel (READOUT2 site 'slot', drop2 8.1 → the install). */
export const SLOT1_LINES: readonly ReadoutLine[] = READOUT2.filter((l) => l.site === 'slot' && l.at >= KERNEL.from && l.at < INSTALL.from);
const SLOT_GROUND = linear('#0C0F0E');

/**
 * Defender v1's slot at output frame `frame`: it opens on the kernel's downbeat (its box growing up from its bottom edge over 4 frames),
 * logs each line on its frame (typed over 8), greys over 6 frames from the hang and folds shut over the 5 frames before the install. Empty
 * outside the kernel.
 */
export function slotContent(frame: number, advance: Advance): FlatContent {
  const out = Math.round(frame);
  if (out < KERNEL.from || out >= INSTALL.from) return { under: [], glyphs: {}, over: [] };
  const open = 1 - (1 - clamp((out - KERNEL.from + 1) / SLOT1.open)) ** 3;
  const fold = clamp((INSTALL.from - out) / SLOT1.fold);
  const grey = out < HANG.from ? 0 : clamp((out - HANG.from + 1) / SLOT1.grey);
  const ink = mixRGB(DEFENDER, GREY, grey);
  const h = 2 * SLOT1.pad + SLOT1.rows * SLOT1.pitch;
  const bottom = 540 - SLOT1.bottom;
  const midFull = bottom + h / 2;
  const hh = h * open * fold;
  const cy = lerp(bottom + hh / 2, midFull, 1 - fold);
  const under: Shape[] = [{ kind: 'rect', x: -960 + SLOT1.x + SLOT1.w / 2, y: cy, w: SLOT1.w, h: Math.max(2, hh), color: SLOT_GROUND, alpha: 0.88, outline: 2, outlineColor: ink }];
  const glyphs: Glyph[] = [];
  if (open >= 0.999) {
    const top = bottom + h;
    SLOT1_LINES.forEach((l, i) => {
      if (out < l.at) return;
      const count = Math.ceil(clamp((out - l.at + 1) / SLOT1.type) * ([...l.text].length + 1));
      const y = cy + (top - SLOT1.pad - (i + 0.5) * SLOT1.pitch - midFull) * fold;
      glyphs.push(...defenderLine(l.text, -960 + SLOT1.x + 18, y, SLOT1.size, advance, ink, fold, count, mixRGB(HERO, GREY, grey)));
    });
  }
  return { under, glyphs: { mono: glyphs }, over: [] };
}

/** Everything the monitor layer draws at output frame `frame`: the windows, the hairline, the v1 slot (each empty outside its span). */
export function readoutContent(frame: number, advance: Advance): FlatContent {
  const parts = [monitorContent(frame, advance), hairlineContent(frame, advance), slotContent(frame, advance)];
  return { under: parts.flatMap((p) => p.under), glyphs: { mono: parts.flatMap((p) => p.glyphs.mono ?? []) }, over: [] };
}

/** Every character the windows, the hairline and the slot can show, for the layer's atlas (and, through DROP2_TEXTS, the glyph check). */
export const MONITOR_CHARS: string = [
  ...new Set([
    ...`╔═${MONITOR2.title}╗║╚╝`,
    ...MONITOR2.rows.join(''),
    '∞',
    ...'0123456789%',
    ...RAMP,
    ...MONITOR_WINDOWS.flatMap((w) => [...w.lines.flatMap((l) => [...l.text]), ...w.defender.text]),
    ...[1, 100].map(hairlineTag).join(''),
    ...SLOT1_LINES.flatMap((l) => [...l.text]),
    ...AVATAR.v1,
  ]),
]
  .filter((c) => c.trim() !== '')
  .join('');
