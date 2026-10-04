// The system's voice in the flat world, break bars 2–5, as pure functions of the frame. Owned by the flat builder (build sheet
// notes/break/break-sheet.md §4.8). One voice at a time: break bar 1's chips are the fall's, bar 6's window the launch's.
//   - the party monitor (screen, text mode like src/shots/hud.ts, whose meter and RAMP it reuses): it springs up on break 2.4 and types
//     in, its status line and gauges stepping on MONITOR_LINES — integrity climbing in ramp waves, memory running away — the hang's
//     blinking line and `restarting`, swept by the restart wipe, back on break 5.1 without typing, folded away on 5.2;
//   - the patch tags T0–T8 in the world: popping on their frames with their leaders drawing to a seam, typing a character a frame,
//     retyping (the unchanged prefix stays), the copy burst of break 4.3& and the folds;
//   - the callout (screen) that signposts the match cut: corner brackets, edges, the 15 % dim outside, the `zoom ×1.29` chip.
// v2 (the second half of this file): the monitor re-voiced. The work orders and the selection that replace the tags and the callout are
// the antivirus's (src/shots/breakDefender.ts).
// Strings come from src/content/break.ts. Layout px; the scene draws the monitor and the callout in screenOverlay (fixed to the screen,
// once per output frame) and the tags in the world. Plain Node imports it (tests): no three / remotion / react imports.
import { CALLOUT_CHIP, CROSS, GAUGES_V2, MONITOR_ROWS_V2, MONITOR_STATUS, MONITOR_TITLE, MONITOR_TITLE_V2, TAG_TEXTS, TICK } from '../content/break.ts';
import { type RGB, linear } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import { CALLOUT, CALLOUT_CHIP as CHIP_AT, CALLOUT_EDGES, CLOSED_HATS, HANG, LOCK, MATCH_CUT, MONITOR, MONITOR_FOLD, MONITOR_LINES_V2, POP_OUT, POV, RESTARTING, REVEAL, SHARD_FLIGHT, TAGS, TAG_COPIES, TAG_RETYPES, WIPE, WIPE_COVER } from '../score/break.ts';
import { partFrame } from '../score/film.ts';
import { RAMP, meter } from './hud.ts';
import { BREAK_PALETTE, breakCam, fromScreen, frameOf, lGlyph, lSegment, lShape, launchL, pop } from './breakShared.ts';
import { shardLowerLeft } from './breakFall.ts';
import { shardScreen } from './breakHero.ts';
import { grade, washAt } from './breakWorld.ts';

type V2 = readonly [number, number];
const EMPTY: FlatContent = { under: [], glyphs: {}, over: [] };
/** The break's bar `bar` (1-based) plus `beat` beats (0-based, may be fractional), as a film frame. */
const brk = (bar: number, beat = 0): number => partFrame('break', bar, beat);

// ——— The party monitor (screen) ———————————————————————————————————————————————————————————————————————————————————————————————

/** Text mode as hud.ts: JetBrains Mono 19 px, 27 px a line, 44 columns, 46 px from the bottom-left corner, on a 94 % dark backing. */
export const MONITOR_BOX = { size: 19, pitch: 27, cols: 44, margin: 46, backing: 0.94 } as const;
const TERM = {
  bg: linear('#0C0F0E'),
  text: linear('#D8F5E1'),
  dim: linear('#D8F5E1', 0.55),
  green: linear('#4CF08C'),
  amber: linear('#FFB23E'),
  pink: linear('#FF5FA2'),
};
type Level = 'text' | 'err' | 'warn' | 'ok';
/** The status line by frame (MONITOR_LINES), with its level. */
const STATUS: readonly [number, string, Level][] = [
  [brk(2, 3), MONITOR_STATUS.patch1, 'text'],
  [brk(2, 3.5), MONITOR_STATUS.patch2, 'text'],
  [brk(3, 2), MONITOR_STATUS.mismatch, 'err'],
  [brk(3, 3.75), MONITOR_STATUS.patch3, 'text'],
  [brk(4, 0.5), MONITOR_STATUS.patch4, 'text'],
  [brk(4, 1), MONITOR_STATUS.retry(2), 'text'],
  [brk(4, 1.125), MONITOR_STATUS.retry(3), 'text'],
  [brk(4, 1.25), MONITOR_STATUS.retry(4), 'text'],
  [brk(4, 1.375), MONITOR_STATUS.retry(5), 'text'],
  [brk(4, 1.5), MONITOR_STATUS.tofu, 'err'],
  [brk(4, 1.75), MONITOR_STATUS.fetch, 'warn'],
  [brk(4, 2), MONITOR_STATUS.restored, 'ok'],
  [brk(4, 2.5), MONITOR_STATUS.detached, 'err'],
  [brk(4, 2.75), MONITOR_STATUS.patch27, 'text'],
  [HANG, MONITOR_STATUS.hang, 'err'],
  [RESTARTING, MONITOR_STATUS.restarting, 'warn'],
  [REVEAL, MONITOR_STATUS.restarted, 'ok'],
];
/** Integrity climbs in ramp waves (each [frame, value, wave start]); memory steps up as every fix makes things messier. */
const INTEGRITY: readonly [number, number, number][] = [
  [brk(2, 3), 38, brk(2, 3) + 2],
  [brk(3, 3.75), 64, brk(3, 3.75)],
  [brk(4, 2), 89, brk(4, 2)],
  [brk(4, 2.5), 81, brk(4, 2.5)],
  [REVEAL, 100, REVEAL],
];
const MEMORY: readonly [number, number][] = [
  [brk(2, 3), 131],
  [brk(3, 2), 148],
  [brk(3, 3.75), 156],
  [brk(4, 2), 172],
  [HANG, 199],
  [REVEAL, 64],
];
const latest = <T extends readonly [number, ...unknown[]]>(keys: readonly T[], t: number): T | null => keys.filter((k) => k[0] <= t).pop() ?? null;
/** Break bar 4's closed 16ths up to the hang: the memory digits tick +1 % on each (R1-07b), running away between the monitor's own steps. */
const MEMORY_TICKS: readonly number[] = CLOSED_HATS.filter((h) => h >= brk(4) && h < HANG);
const memoryAt = (t: number): number => {
  const [at, base] = latest(MEMORY, t)!;
  return at >= HANG ? base : base + MEMORY_TICKS.filter((h) => h >= at && h <= t).length;
};
/** A gauge mid-wave: each newly filled cell steps through the ramp a character a frame, the wave front moving 2 cells a frame. */
const waveMeter = (from: number, to: number, start: number, t: number): string => {
  const a = meter(from);
  const b = meter(to);
  if (to < from) return b;
  let out = '';
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    const ia = RAMP.indexOf(a[i]);
    const ib = RAMP.indexOf(b[i]);
    if (ib <= ia) {
      out += b[i];
      continue;
    }
    const k = Math.floor(t - (start + n / 2));
    out += RAMP[Math.max(ia, Math.min(ib, k))];
    n++;
  }
  return out;
};

export type MonitorState = { rows: string[]; status: string; level: Level; integrity: number; memory: number; typed: number; rise: number; fold: number; blink: boolean };
/** The monitor at output frame `f`, or null when it is not on screen (before break 2.4, under the restart wipe, after its fold). */
export function monitorAt(f: number): MonitorState | null {
  const t = frameOf(f);
  if (t < MONITOR.from || t >= MONITOR.to) return null;
  if (t >= WIPE.from + 1 && t < WIPE.to) return null;
  const s = latest(STATUS, t)!;
  const ik = INTEGRITY.findIndex((k) => k === latest(INTEGRITY, t));
  const [, integrity, start] = INTEGRITY[ik];
  const before = ik > 0 ? INTEGRITY[ik - 1][1] : 0;
  const instant = t >= REVEAL;
  const gauge = instant ? meter(integrity) : waveMeter(before, integrity, start, t);
  const memory = memoryAt(t);
  const pct = (n: number) => `${String(n).padStart(3)}%`;
  const inner = 40;
  const pad = (s: string) => (s.length > inner ? s.slice(0, inner) : s + ' '.repeat(inner - s.length));
  let status = s[1];
  if (s[0] === RESTARTING) {
    // `restarting [··········]` fills with the ramp, 3 cells a frame.
    const k = t - RESTARTING;
    status = status.replace(/·+/, (dots) => [...dots].map((_, j) => RAMP[clamp(3 * k - j, 0, RAMP.length - 1)] === ' ' ? '·' : RAMP[clamp(3 * k - j, 0, RAMP.length - 1)]).join(''));
  }
  const title = MONITOR_TITLE;
  const rows = [
    `╔═${title}${'═'.repeat(MONITOR_BOX.cols - 3 - title.length)}╗`,
    `║ ${pad(`memory    ${meter(memory)} ${pct(memory)}`)} ║`,
    `║ ${pad(`integrity ${gauge} ${pct(integrity)}${integrity >= 100 ? ` ${TICK}` : ''}`)} ║`,
    `║ ${pad(status)} ║`,
    `╚${'═'.repeat(MONITOR_BOX.cols - 2)}╝`,
  ];
  const typed = instant ? 1 : clamp((t - MONITOR.from) / 8);
  const rise = instant ? 1 : launchL(t - MONITOR.from);
  const fold = ease.inCubic(clamp((t - MONITOR_FOLD.from) / (MONITOR_FOLD.to - MONITOR_FOLD.from)));
  const blink = s[2] === 'err' && s[0] === HANG && Math.floor((t - HANG) / 3) % 2 === 1;
  return { rows, status, level: s[2], integrity, memory, typed, rise, fold, blink };
}

const levelColor = (l: Level): RGB => (l === 'err' ? TERM.pink : l === 'warn' ? TERM.amber : l === 'ok' ? TERM.green : TERM.text);
/** The monitor as screen content (mono atlas; engine units = screen px under the frontal pose). */
export function monitorContent(f: number, advance: Advance): FlatContent {
  const m = monitorAt(f);
  if (!m || m.fold >= 1) return EMPTY;
  const cell = advance('═') * MONITOR_BOX.size;
  const left = MONITOR_BOX.margin;
  const h = MONITOR_BOX.pitch * m.rows.length;
  const bottom = 1080 - MONITOR_BOX.margin + (1 - m.rise) * (h + MONITOR_BOX.margin + 20);
  const top = bottom - h;
  const sy = 1 - m.fold;
  const midY = (top + bottom) / 2;
  const yOf = (row: number) => midY + (top + MONITOR_BOX.pitch * (row + 0.5) - midY) * sy;
  const width = MONITOR_BOX.cols * cell;
  const under: Shape[] = [lShape({ kind: 'rect', x: left + width / 2, y: midY, w: width + 12, h: (h + 8) * sy, color: TERM.bg, alpha: MONITOR_BOX.backing })];
  const glyphs: Glyph[] = [];
  const count = Math.ceil(m.typed * MONITOR_BOX.cols * 1.5);
  m.rows.forEach((row, r) => {
    if (r === 3 && m.blink) return;
    [...row].forEach((ch, c) => {
      if (ch === ' ' || c >= count) return;
      const frame = r === 0 || r === 4 || c === 0 || c === MONITOR_BOX.cols - 1;
      let color = frame ? TERM.dim : TERM.text;
      if (!frame && r === 1) color = m.memory > 100 ? TERM.pink : m.memory > 90 ? TERM.amber : TERM.green;
      if (!frame && r === 2) color = m.integrity >= 100 || m.integrity <= 90 ? TERM.green : TERM.amber;
      if (!frame && r === 3) color = levelColor(m.level);
      if (r === 0 && c >= 2 && c < 2 + MONITOR_TITLE.length) color = TERM.green;
      glyphs.push(lGlyph({ ch, x: left + (c + 0.5) * cell, y: yOf(r), size: MONITOR_BOX.size * Math.max(sy, 0.05), stretch: 1 / Math.max(sy, 0.05), color }));
    });
  });
  return { under, glyphs: { mono: glyphs }, over: [] };
}

// ——— The patch tags (world) ————————————————————————————————————————————————————————————————————————————————————————————————————

/** Each tag: its texts (with the frames they are typed on), its place, and where its leader runs (a seam, or a function of the frame). */
type TagSpec = { texts: readonly string[]; at: readonly number[]; x: number; y: number; to: (f: number) => V2 };
const SEAM = { eyeL: [650, 500] as V2, open: [405, 470] as V2, eyeR: [1290, 478] as V2, close: [1522, 700] as V2, mouth: [960, 470] as V2, hole: [625, 585] as V2, core: [1040, 520] as V2 };
/** E2's shard on our side: its lower-left corner (screen, riding the knock's jolt and lift), taken back into the world through the camera. */
const t0Leader = (f: number): V2 => {
  if (f < SHARD_FLIGHT.from) {
    const p = shardLowerLeft(f);
    return fromScreen(breakCam(f), p[0], p[1]);
  }
  if (f < LOCK) {
    const c = shardScreen(f).centre;
    return fromScreen(breakCam(f), c[0], c[1] + 40);
  }
  return SEAM.eyeL;
};
const SPECS: readonly TagSpec[] = [
  { texts: TAG_TEXTS.t0, at: [brk(2, 0.5), brk(2, 2)], x: 290, y: 360, to: t0Leader },
  { texts: TAG_TEXTS.t1, at: [brk(2, 2.5)], x: 1420, y: 250, to: () => SEAM.core },
  { texts: TAG_TEXTS.t2, at: [brk(2, 3.5)], x: 500, y: 230, to: () => SEAM.eyeL },
  { texts: TAG_TEXTS.t3, at: [brk(3, 2.5), brk(3, 3.75)], x: 420, y: 820, to: () => [420, 700] },
  { texts: TAG_TEXTS.t4, at: [brk(4, 0.5)], x: 520, y: 240, to: () => SEAM.open },
  { texts: TAG_TEXTS.t5, at: [brk(4, 1), brk(4, 1.125), brk(4, 1.25), brk(4, 1.375), brk(4, 1.5), brk(4, 2)], x: 1380, y: 250, to: () => SEAM.eyeR },
  { texts: TAG_TEXTS.t6, at: [brk(4, 2.25)], x: 1500, y: 830, to: () => SEAM.close },
  { texts: TAG_TEXTS.t7, at: [brk(4, 2.5)], x: 290, y: 360, to: () => SEAM.hole },
  { texts: TAG_TEXTS.t8, at: [brk(4, 2.75)], x: 960, y: 190, to: () => SEAM.mouth },
];
void TAG_RETYPES;
/**
 * The copy bursts: every visible tag adds a copy of itself at (+10, +10) on every 16th from the bracket's tag (break 4.3 + 6) to the
 * hang — break bar 4's closed hats there and the score's TAG_COPIES (R1-07b): the system's patches pile up on the beat while the music tightens.
 */
export const TAG_BURSTS: readonly number[] = [...new Set([...CLOSED_HATS.filter((h) => h > POP_OUT - 12 && h < HANG), ...TAG_COPIES])].sort((a, b) => a - b);

export type Tag = {
  id: number;
  /** The text being shown (typing), and the whole of the current text. */
  text: string;
  full: string;
  error: boolean;
  x: number;
  y: number;
  scale: number;
  /** The leader from the seam dot (x0, y0) toward the tag's nearest corner, drawn `leader` of the way (0–1). */
  dot: V2;
  leader: number;
  copies: number;
  /** A burst's frame: the newest copy jumps in with a one-frame RGB split. */
  split: boolean;
};
const TAG_SIZE = 22;
/** The RGB split of a burst: the terminal's pink-red and a cyan. */
const SPLIT: readonly [RGB, RGB] = [linear('#FF5FA2'), linear('#3FE0FF')];
/** The tags on screen at instant `f` (world, layout px). Tags under the restart wipe stay until the panels cover the frame. */
export function tagsAt(f: number, advance: Advance): Tag[] {
  const t = frameOf(f);
  const out: Tag[] = [];
  SPECS.forEach((s, id) => {
    const w = TAGS[id];
    const swept = w.to === WIPE.from;
    const end = swept ? WIPE_COVER : w.to + 8;
    if (t < w.from || t >= end) return;
    const i = s.at.filter((a) => a <= t).length - 1;
    const full = s.texts[i];
    const prev = i > 0 ? s.texts[i - 1] : '';
    let common = 0;
    while (common < prev.length && common < full.length && prev[common] === full[common]) common++;
    const shown = full.slice(0, Math.min(full.length, common + (t - s.at[i]) + 1));
    const closing = !swept && t >= w.to;
    const k = t - w.to;
    const scale = closing ? 1 - ease.inCubic(clamp(k / 4)) : pop(t - w.from);
    const leader = closing ? 1 - clamp((k - 4) / 4) : clamp((t - w.from + 1) / 4);
    const copies = TAG_BURSTS.filter((c) => t >= c && c >= w.from).length;
    void advance;
    out.push({ id, text: shown, full, error: full.includes(CROSS), x: s.x, y: s.y, scale, dot: s.to(f), leader, copies, split: copies > 0 && TAG_BURSTS.includes(t) });
  });
  return out;
}

/** The tags as world content (monoB atlas): white tags with a 3 px outline and a (4, 4) hard shadow, ✓ green and ✗ red; leaders and dots in ink. */
export function tagsContent(f: number, advance: Advance): FlatContent {
  const wash = washAt(f);
  const P = (c: keyof typeof BREAK_PALETTE): RGB => grade(BREAK_PALETTE[c], wash);
  const under: Shape[] = [];
  const glyphs: Glyph[] = [];
  for (const tag of tagsAt(f, advance)) {
    const ink = tag.error ? P('red') : P('ink');
    const cw = advance('a') * TAG_SIZE;
    const w = (Math.max(1, [...tag.text].length) * cw + 20) * tag.scale;
    const h = (TAG_SIZE * 1.3 + 10) * tag.scale;
    // The leader: from the seam's dot toward the tag's nearest corner.
    const cx = tag.dot[0] < tag.x - w / 2 ? tag.x - w / 2 : tag.dot[0] > tag.x + w / 2 ? tag.x + w / 2 : tag.dot[0];
    const cy = tag.dot[1] < tag.y ? tag.y - h / 2 : tag.y + h / 2;
    if (tag.leader > 0) {
      const ex = tag.dot[0] + (cx - tag.dot[0]) * tag.leader;
      const ey = tag.dot[1] + (cy - tag.dot[1]) * tag.leader;
      const s = lSegment(tag.dot[0], tag.dot[1], ex, ey, 2, P('ink'));
      if (s) under.push(s);
      under.push(lShape({ kind: 'ellipse', x: tag.dot[0], y: tag.dot[1], w: 6 * 1.6, h: 6 * 1.6, color: P('ink') }));
    }
    if (tag.scale <= 0.01) continue;
    for (let c = tag.copies; c >= 0; c--) {
      const o = 10 * c;
      if (tag.split && c === tag.copies) {
        // The burst's frame: the new copy lands with an RGB split (pink-red and cyan ghosts 6 px either side).
        under.push(lShape({ kind: 'rect', x: tag.x + o - 6, y: tag.y + o, w, h, r: 3, color: SPLIT[0], alpha: 0.85 }));
        under.push(lShape({ kind: 'rect', x: tag.x + o + 6, y: tag.y + o, w, h, r: 3, color: SPLIT[1], alpha: 0.85 }));
      }
      under.push(lShape({ kind: 'rect', x: tag.x + o + 4, y: tag.y + o + 4, w, h, r: 3, color: P('ink') }));
      under.push(lShape({ kind: 'rect', x: tag.x + o, y: tag.y + o, w, h, r: 3, color: P('white'), outline: 3, outlineColor: ink }));
    }
    const left = tag.x - w / 2 + 10 * tag.scale;
    [...tag.text].forEach((ch, i) => {
      if (ch === ' ') return;
      const color = ch === TICK ? P('tick') : ch === CROSS ? P('red') : ink;
      glyphs.push(lGlyph({ ch, x: left + (i + 0.5) * cw * tag.scale, y: tag.y, size: TAG_SIZE * tag.scale, color }));
    });
  }
  return { under, glyphs: { monoB: glyphs }, over: [] };
}

// ——— The callout (screen, break 5.4& → the match cut) ———————————————————————————————————————————————————————————————————————————————

export type Callout = { x0: number; x1: number; y0: number; y1: number; corners: number; edges: number; chip: string; dim: number };
/**
 * The box the callout draws: exactly what break 6.1 shows, as seen on 5.4& + 11 — the frame shrunk by the cut's zoom ratio (bar 6 opens
 * at 1.60, bar 5 ends at 1.08: ×1.48), both centred on his ω at (960, 540), so the match cut lands on the box (R1-13).
 */
export const CALLOUT_BOX = (() => {
  const ratio = breakCam(MATCH_CUT).zoom / breakCam(MATCH_CUT - 1).zoom;
  const [hw, hh] = [960 / ratio, 540 / ratio];
  return { x0: Math.round(960 - hw), x1: Math.round(960 + hw), y0: Math.round(540 - hh), y1: Math.round(540 + hh), ratio };
})();
/** The callout at output frame `f`: the match cut's frame as seen from the frame before it. */
export function calloutAt(f: number): Callout | null {
  const t = frameOf(f);
  if (t < CALLOUT.from || t >= CALLOUT.to) return null;
  const chipCount = Math.ceil(Math.max(0, t - CHIP_AT + 1) * 2);
  return {
    x0: CALLOUT_BOX.x0,
    x1: CALLOUT_BOX.x1,
    y0: CALLOUT_BOX.y0,
    y1: CALLOUT_BOX.y1,
    corners: Math.min(1.05, launchL((t - CALLOUT.from) * 3)),
    edges: clamp((t - CALLOUT_EDGES + 1) / (CALLOUT.from + 8 - CALLOUT_EDGES + 1)),
    chip: CALLOUT_CHIP.slice(0, chipCount),
    dim: 0.15 * clamp((t - CALLOUT_EDGES + 1) / 3),
  };
}
/** The callout as screen content: the dim outside, the 4 px ink frame (corner brackets, then edges growing from them), the chip. */
export function calloutContent(f: number, advance: Advance): FlatContent {
  const c = calloutAt(f);
  if (!c) return EMPTY;
  const ink = BREAK_PALETTE.ink;
  const under: Shape[] = [];
  const glyphs: Glyph[] = [];
  const black: RGB = [0, 0, 0];
  if (c.dim > 0) {
    under.push(lShape({ kind: 'rect', x: 960, y: c.y0 / 2, w: 1920, h: c.y0, color: black, alpha: c.dim }));
    under.push(lShape({ kind: 'rect', x: 960, y: (c.y1 + 1080) / 2, w: 1920, h: 1080 - c.y1, color: black, alpha: c.dim }));
    under.push(lShape({ kind: 'rect', x: c.x0 / 2, y: (c.y0 + c.y1) / 2, w: c.x0, h: c.y1 - c.y0, color: black, alpha: c.dim }));
    under.push(lShape({ kind: 'rect', x: (c.x1 + 1920) / 2, y: (c.y0 + c.y1) / 2, w: 1920 - c.x1, h: c.y1 - c.y0, color: black, alpha: c.dim }));
  }
  const W = 4;
  const len = (full: number) => 60 * c.corners + Math.max(0, full / 2 - 60) * c.edges;
  const corners: [number, number, number, number][] = [
    [c.x0, c.y0, 1, 1],
    [c.x1, c.y0, -1, 1],
    [c.x0, c.y1, 1, -1],
    [c.x1, c.y1, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    // The edges (4 px) grow from the corners; the corner brackets themselves are heavier (8 px), so they read first.
    const lx = len(c.x1 - c.x0);
    const ly = len(c.y1 - c.y0);
    for (const s of [lSegment(x, y, x + dx * lx, y, W, ink), lSegment(x, y, x, y + dy * ly, W, ink)]) if (s) under.push(s);
    const k = 60 * c.corners;
    for (const s of [lSegment(x, y, x + dx * k, y, 8, ink), lSegment(x, y, x, y + dy * k, 8, ink)]) if (s) under.push(s);
  }
  if (c.chip.length > 0) {
    const size = 20;
    const cw = advance('a') * size;
    const w = CALLOUT_CHIP.length * cw + 20;
    const h = size * 1.3 + 10;
    const x = c.x0 + w / 2;
    const y = c.y0 - h / 2 - 2;
    under.push(lShape({ kind: 'rect', x, y, w, h, r: 3, color: BREAK_PALETTE.cream, outline: 3, outlineColor: ink }));
    [...c.chip].forEach((ch, i) => {
      if (ch !== ' ') glyphs.push(lGlyph({ ch, x: c.x0 + 10 + (i + 0.5) * cw, y, size, color: ink }));
    });
  }
  return { under, glyphs: { monoB: glyphs }, over: [] };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — the party monitor re-voiced (sheet §9.3; the design's §5.5): the title counts threats, two gauges count his parts (removed, red: the
// antivirus's; fetched, amber: his), the status line is the speaker's colour (red [DEFENDER], green [ OK ], pink [FAIL] / [HANG], amber his
// [ .. ] fetch). 47 columns (the title with its threat count needs three more than v04's 44). Hidden through the antivirus's POV.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

export const MONITOR_BOX_V2 = { ...MONITOR_BOX, cols: 47 } as const;
type Speaker = 'defender' | 'ok' | 'alarm' | 'him' | 'text';
/** Who says a status line, from its prefix. */
export const speakerOf = (line: string): Speaker =>
  line.startsWith('[DEFENDER]') ? 'defender' : line.startsWith('[ OK ]') ? 'ok' : line.startsWith('[FAIL]') || line.startsWith('[HANG]') ? 'alarm' : line.startsWith('[ .. ]') ? 'him' : 'text';
/** A gauge of a count of parts: 2 cells a part, 20 cells; a newly counted cell steps up through the ramp ('-' → '@'), a character a frame. */
const PART_RAMP = '-=+*#%@';
const partGauge = (count: number, before: number, since: number, t: number): string => {
  let out = '';
  for (let c = 0; c < 20; c++) {
    const filled = c < 2 * count;
    const fresh = filled && c >= 2 * before;
    out += !filled ? '-' : fresh ? PART_RAMP[clamp(t - since - (c - 2 * before), 0, PART_RAMP.length - 1)] : '@';
  }
  return out;
};
export type MonitorStateV2 = { rows: string[]; status: string; speaker: Speaker; removed: number; fetched: number; typed: number; rise: number; fold: number; blink: boolean };
/** The v2 monitor at output frame f, or null (before 2.4, under the wipe, through the POV, after its fold). */
export function monitorAtV2(f: number): MonitorStateV2 | null {
  const t = frameOf(f);
  if (t < MONITOR.from || t >= MONITOR.to) return null;
  if (t >= WIPE.from + 1 && t < WIPE.to) return null;
  if (t >= POV.from && t < POV.to) return null;
  let status = '';
  let statusAt = MONITOR_LINES_V2[0];
  let removed = 0;
  let fetched = 0;
  let removedBefore = 0;
  let fetchedBefore = 0;
  let removedAt = 0;
  let fetchedAt = 0;
  MONITOR_LINES_V2.forEach((at, k) => {
    if (at > t) return;
    const r = MONITOR_ROWS_V2[k];
    if (r.status !== undefined) {
      status = r.status;
      statusAt = at;
    }
    if (r.removed !== undefined) {
      removedBefore = removed;
      removed = r.removed;
      removedAt = at;
    }
    if (r.fetched !== undefined) {
      fetchedBefore = fetched;
      fetched = r.fetched;
      fetchedAt = at;
    }
  });
  const instant = t >= REVEAL;
  if (status.includes('[·····]')) {
    // `forcing restart [·····]` fills with the ramp over 3 frames.
    const k = t - statusAt;
    status = status.replace(/·+/, (dots) => [...dots].map((_, j) => (2 * k - j >= 0 ? RAMP[clamp(3 + 2 * k - j, 0, RAMP.length - 1)] : '·')).join(''));
  }
  const cols = MONITOR_BOX_V2.cols;
  const inner = cols - 4;
  const pad = (s: string) => ([...s].length > inner ? [...s].slice(0, inner).join('') : s + ' '.repeat(inner - [...s].length));
  const rows = [
    `╔═${MONITOR_TITLE_V2}${'═'.repeat(Math.max(0, cols - 3 - [...MONITOR_TITLE_V2].length))}╗`,
    `║ ${pad(`${GAUGES_V2.removed} ${instant ? partGauge(removed, removed, 0, 0) : partGauge(removed, removedBefore, removedAt, t)} ${removed}`)} ║`,
    `║ ${pad(`${GAUGES_V2.fetched} ${instant ? partGauge(fetched, fetched, 0, 0) : partGauge(fetched, fetchedBefore, fetchedAt, t)} ${fetched}`)} ║`,
    `║ ${pad(status)} ║`,
    `╚${'═'.repeat(cols - 2)}╝`,
  ];
  const typed = instant ? 1 : clamp((t - MONITOR.from) / 8);
  const rise = instant ? 1 : launchL(t - MONITOR.from);
  const fold = ease.inCubic(clamp((t - MONITOR_FOLD.from) / (MONITOR_FOLD.to - MONITOR_FOLD.from)));
  const blink = status.startsWith('[HANG]') && Math.floor((t - statusAt) / 3) % 2 === 1;
  return { rows, status, speaker: speakerOf(status), removed, fetched, typed, rise, fold, blink };
}
/** The v2 monitor as screen content (the v2 mono atlas): the frame dim, the title green with its threat count red, removed red, fetched amber, the status the speaker's. */
export function monitorContentV2(f: number, advance: Advance): FlatContent {
  const m = monitorAtV2(f);
  if (!m || m.fold >= 1) return EMPTY;
  const B = MONITOR_BOX_V2;
  const cell = advance('═') * B.size;
  const left = B.margin;
  const h = B.pitch * m.rows.length;
  const bottom = 1080 - B.margin + (1 - m.rise) * (h + B.margin + 20);
  const top = bottom - h;
  const sy = 1 - m.fold;
  const midY = (top + bottom) / 2;
  const yOf = (row: number) => midY + (top + B.pitch * (row + 0.5) - midY) * sy;
  const width = B.cols * cell;
  const under: Shape[] = [lShape({ kind: 'rect', x: left + width / 2, y: midY, w: width + 12, h: (h + 8) * sy, color: TERM.bg, alpha: B.backing })];
  const glyphs: Glyph[] = [];
  const count = Math.ceil(m.typed * B.cols * 1.5);
  const red = BREAK_PALETTE.red;
  const speakerColor = (s: Speaker): RGB => (s === 'defender' ? red : s === 'ok' ? TERM.green : s === 'alarm' ? TERM.pink : s === 'him' ? TERM.amber : TERM.text);
  const titleStart = 2;
  const threatsAt = titleStart + MONITOR_TITLE_V2.indexOf('threats');
  m.rows.forEach((row, r) => {
    if (r === 3 && m.blink) return;
    [...row].forEach((ch, c) => {
      if (ch === ' ' || c >= count) return;
      const frame = r === 0 || r === 4 || c === 0 || c === B.cols - 1;
      let color = frame ? TERM.dim : TERM.text;
      if (r === 0 && c >= titleStart && c < titleStart + MONITOR_TITLE_V2.length) color = c >= threatsAt && c < threatsAt + 'threats 1'.length ? red : TERM.green;
      if (!frame && r === 1 && c >= 2 + GAUGES_V2.removed.length) color = red;
      if (!frame && r === 2 && c >= 2 + GAUGES_V2.fetched.length) color = TERM.amber;
      if (!frame && r === 3) color = speakerColor(m.speaker);
      glyphs.push(lGlyph({ ch, x: left + (c + 0.5) * cell, y: yOf(r), size: B.size * Math.max(sy, 0.05), stretch: 1 / Math.max(sy, 0.05), color }));
    });
  });
  return { under, glyphs: { mono: glyphs }, over: [] };
}
/** Every character the v2 monitor can show (for the v2 mono atlas). */
export const MONITOR_CHARS_V2: string = [MONITOR_TITLE_V2, ...Object.values(GAUGES_V2), PART_RAMP, '╔═╗║╚╝0123456789', ...MONITOR_ROWS_V2.map((r) => r.status ?? ''), RAMP].join('');
