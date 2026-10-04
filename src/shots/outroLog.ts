// S33 CORE DUMP, outro 1.1–2.1 − 1 (builder O · OUTRO; build sheet notes/d2build/sheet.md §4.2 rows outro 1.1–1.4&, §5.12, §9 H5). Pure.
// Drop 2's frozen field (H5: every cell `@`, drained to dim text — his former cells too, filled by drop 2's drain — rebuilt here
// from T7_GRID and his mask, never from drop 2's GPU state) decodes in place on the intro's terminal grid: rows 0–21 into a hexdump of the field (`40` for every `@`, `3d 2b
// 2a` where his cells were), rows 22–29 into the crash log's first eight lines, each left → right over 6 f on the 32nds, the rest of the
// field decaying to blank top-down. Then the log's printed lines (E11): the guest's exit, the backtrace three lines a frame (the film's
// sections in reverse), the table set back, the blink scheduler, the lost heartbeat and its promise of the wink's frame, the stats,
// and `exit` typed on the 32nds — each scrolling the log up a row, critically damped. (Iteration 3: the guest's exit and the stats
// on outro 1.2, the backtrace three lines a frame behind the flip, the table and the prompt on outro 1.2&, `exit` into Enter on outro 1.3; the
// scheduler's fail, FATAL and the promise are the dying system's last lines, printed under the prompt.)
// Iteration 2 (rulings 14, 15): once the decode has landed the whole log is dim texture (LOG_TEXTURE), and outro bar 1 stages its story
// large over it, one line a beat (STAGE): `Segmentation fault (cute dumped)` as an inverse pink bar on outro 1.1, the guest's
// (╯°□°)╯︵ ┻━┻ on outro 1.2, `table restored ┬─┬ノ(•ω•ノ)` on its &, `next wink at frame outro 2.2` on outro 1.3 — Enter's beat (iteration 3), so
// the promise is drawn over the screen (lastWords) and is the last thing visible as the CRT goes to a line. Above it
// (×ω×), on an opaque backing, grows from drop 2's hand-off to 1.45× over outro 1.1 (LOG_GROW) and is lit by the decode into the CRT's
// phosphor (src/shots/outroPhosphor.ts) — breathing, twitching on the lost heartbeat, his eyes flicking to • as the table is restored.
// The camera pushes in about his face until Enter. The aperture (the squeeze, the line, the ω) is src/shots/outroScreen.ts.
// Flat world: origin at the frame centre, y up; 1 unit = 1 px at 1080p.
import { RAMP } from '../actors/asciiFace.ts';
import { kaomoji } from '../actors/cast.ts';
import { CURSOR, DECODE as DECODE_GLYPHS, PROMPT } from '../content/boot.ts';
import { GUEST_FLIP } from '../content/castDrop2.ts';
import { HERO_OUT, OUTRO_BACKTRACE, OUTRO_LOG_DECODE, OUTRO_LOG_PRINT, type OutroLine, TABLE_BACK, hexRow } from '../content/outroV04.ts';
import { type Pose } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import { SWAP_LEAD, type Segment, type Temporal, struck, withDensity } from '../engine/temporal.ts';
import { layoutLines, lineWidth } from '../engine/textGrid.ts';
import type { Advance } from '../engine/typeset.ts';
import type { Look } from '../engine/types.ts';
import { aimPose } from '../motion/hit.ts';
import { BACKTRACE, DECODE, DIP, ENTER, GUEST_EXIT, HEARTBEAT, KEYS, LINE, LOG_DECODE, OPEN, OUTRO_START, PROMISE, SEGFAULT, SQUEEZE, TABLE, WINK } from '../score/outroV04.ts';
import { seedFrame } from '../score/film.ts';
import { FRAMES_PER_BAR } from '../score/tempo.ts';
import { ALPHA, T7_CONDENSED, T7_GRID, flow, outroSegment, snap } from './drop2Shared.ts';
import { FOV, FRONT_DISTANCE } from './intro.ts';
import { HERO_PHOSPHOR } from './outroPhosphor.ts';
import { INK, PALETTE, TERM, TERMINAL_CURVATURE, cellCenter, terminalLook } from '../worlds/terminal.ts';

/** Discrete changes are taken at the output frame: every shutter sub-frame of a frame sees one state. */
const frameOf = (f: number): number => Math.floor(f + 0.5);
/** A brightness boost that jumps to 1 + k on `at` and decays with time constant `tau` (the intro's). */
const glow = (f: number, at: number, k: number, tau: number): number => (f >= at ? 1 + k * Math.exp(-(f - at) / tau) : 1);

// ——— H5: the frozen field ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** His (×ω×)'s ink coverage (0–1) of T7 cell (col, row) at the freeze: measured by the scene from the font, faked by the tests. */
export type Coverage = (col: number, row: number) => number;
/** The ramp index his frozen mask held in a cell (T7_HERO: clamped to `=` `+` `*`), by coverage; −1 where the cell was not his. */
export function heroIndex(coverage: number): number {
  if (coverage < 0.25) return -1;
  return coverage >= 0.75 ? 6 : coverage >= 0.5 ? 5 : 4;
}
/** The glyph field cell (col, row) held at the freeze: `@` (every non-hero cell saturated by drop2 8.3 − 6), or his `=` `+` `*`. */
export const frozenGlyph = (col: number, row: number, cover: Coverage): string => {
  const i = heroIndex(cover(col, row));
  return i < 0 ? '@' : RAMP[i];
};
/** The hexdump of the frozen field (rows 0–21): byte j of row r is field cell (r, 9j + 4). */
export const hexdump = (cover: Coverage): string[] =>
  Array.from({ length: DUMP_ROWS }, (_, r) => hexRow(r, Array.from({ length: 16 }, (_, j) => frozenGlyph(9 * j + 4, r, cover)).join('')));

const DUMP_ROWS = 22;
const LOG_ROW = 22;
/** The content row of the first printed line: one blank row under the decoded log, so the newest line settles on row 30. */
const PRINT_ROW = 31;
const [COL0, COL1] = T7_GRID.cols;
const [ROW0, ROW1] = T7_GRID.rows;
/** Frames a printed line takes to sweep in (the intro's REVEAL); the backtrace prints whole, three lines a frame. */
const REVEAL = 3;
/** The backtrace's lines a frame (iteration 3: done by outro 1.2& − 4, so the scroll has caught up when the prompt prints on outro 1.2&). */
export const TRACE_RATE = 3;
/** The frame backtrace line `i` (#i) prints on: three a frame from the frame after its header (outro 1.2 + 4 … 1.2& − 4). */
export const traceFrame = (i: number): number => BACKTRACE + 1 + Math.floor(i / TRACE_RATE);

// ——— Inks ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The drained field (H5): #D8F5E1 at 42 %. */
export const DRAINED = linear(PALETTE.text, ALPHA.drained);
const DUMP = scaleRGB(INK.green, ALPHA.hexdump);
const ADDRESS = scaleRGB(INK.green, 0.3);
const HIS = scaleRGB(INK.amber, 0.5);
const TRACE = linear(PALETTE.text, 0.55);
const TRACE_BAR = scaleRGB(INK.green, 0.7);
const GROUND = linear(PALETTE.bg);
const HAZE = linear(PALETTE.green);
const BAR = linear(PALETTE.pink, 1.1);
/** His crisp amber at 70 % (H5's condensed face, glowing a little): drop 2's T7 condenses into exactly this ink (a HANDOFF). */
export const LOG_HERO_INK = scaleRGB(INK.amber, 0.7);

/** A log line's ink at character j: the boot log's rules (tags in colour, a face from `accent` on, a timestamp dim). */
function lineInk(l: OutroLine, j: number, stamp: number): RGB {
  if (l.accent !== undefined && j >= l.accent) return l.kind === 'ok' ? INK.amber : INK.pink;
  if (j < stamp) return INK.dim;
  switch (l.kind) {
    case 'pink':
      return INK.pink;
    case 'dim':
      return INK.dim;
    case 'fail':
      return j < 6 ? INK.pink : INK.text;
    case 'ok':
      return j < 6 ? INK.green : INK.text;
    case 'exit':
      return j < 6 ? INK.amber : INK.text;
    default:
      return INK.text;
  }
}
/** Characters of a leading kernel timestamp (`[   51.000000]`), drawn dim like the boot log's. */
const stampLength = (text: string): number => (/^\[ *\d+\.\d{6}\]/.exec(text)?.[0].length ?? 0);
/** A backtrace line: dim, its bar number (after `.ts:`) green. */
const traceInk = (text: string, j: number): RGB => {
  const k = text.indexOf('.ts:');
  return k >= 0 && j >= k + 4 && j < k + 6 ? TRACE_BAR : TRACE;
};

// ——— The layout: built once (the scene measures his mask; everything else is fixed) ———————————————————————————————————————————

/** A field cell (every one shows the drained `@` until its decode starts: H5's even field), what it decodes to (`ch` '' = blank), when its decode starts, its final ink. */
type FieldCell = { col: number; row: number; width: number; ch: string; from: number; ink: RGB };
/** A printed character: content row, appear instant, ink; `whole` = it appears whole on its output frame (the prompt), `pop` = typed. */
type PrintCell = { col: number; row: number; width: number; ch: string; at: number; ink: RGB; whole: boolean; pop: boolean };
type Printed = { at: number; text: string; row: number; line: OutroLine; reveal: number; scale: number };
export type LogLayout = { cells: readonly FieldCell[]; prints: readonly PrintCell[]; dump: readonly string[] };

const PROMPT_TEXT = OUTRO_LOG_PRINT[OUTRO_LOG_PRINT.length - 1];
/** `Segmentation fault (cute dumped)`: staged (STAGE), not printed in the log. */
const INVERSE = OUTRO_LOG_PRINT.find((l) => l.kind === 'inverse')!;
/** Every line the log prints, in time order (the backtrace's 15 lines after its header, three a frame; ties keep the content's order),
 *  each on its own content row. */
function printOrder(): Printed[] {
  const lines: { at: number; line: OutroLine; reveal: number; scale: number }[] = [];
  for (const l of OUTRO_LOG_PRINT) {
    if (l === INVERSE) continue;
    lines.push({ at: l.at, line: l, reveal: REVEAL, scale: l.text.startsWith('[FATAL]') ? 1.4 : 1 });
    if (l.at === BACKTRACE) OUTRO_BACKTRACE.forEach((text, i) => lines.push({ at: traceFrame(i), line: { text, kind: 'dim' }, reveal: 1, scale: 1 }));
  }
  lines.sort((a, b) => a.at - b.at);
  return lines.map((l, i) => ({ at: l.at, text: l.line.text, row: PRINT_ROW + i, line: l.line, reveal: l.reveal, scale: l.scale }));
}
const PRINTED = printOrder();
/** The prompt's printed line (`> exit`): the scheduler's fail, FATAL and the promise print after it, as Enter is pressed. */
const PROMPT_LINE = PRINTED.find((p) => p.line === PROMPT_TEXT)!;
/** The printed lines: frame, text, content row. */
export const printedLines = (): { at: number; text: string; row: number }[] => PRINTED.map(({ at, text, row }) => ({ at, text, row }));

/** Decode start of a cell that decays to blank: top-down over outro 1.1–1.1 + 6. */
const blankFrom = (row: number): number => DECODE + (6 * (row - ROW0)) / (ROW1 - ROW0);

/** The log's layout for his frozen mask `cover`. */
export function buildLogLayout(cover: Coverage): LogLayout {
  const dump = hexdump(cover);
  const cells: FieldCell[] = [];
  for (let row = ROW0; row <= ROW1; row++) {
    // What the row decodes into, by column: the dump, a log line, or nothing.
    const target = new Map<number, { ch: string; width: number; ink: RGB }>();
    const covered = new Set<number>();
    let from: (col: number) => number = () => blankFrom(row);
    if (row >= 0 && row < DUMP_ROWS) {
      for (const c of layoutLines([dump[row]])) {
        const j = c.col >= 63 && c.col < 79 ? c.col - 63 : c.col >= 12 && c.col < 60 ? Math.floor((c.col - 12 - (c.col >= 37 ? 1 : 0)) / 3) : -1;
        const his = j >= 0 && heroIndex(cover(9 * j + 4, row)) >= 0;
        target.set(c.col, { ch: c.ch, width: c.width, ink: c.col < 10 ? ADDRESS : his ? HIS : DUMP });
      }
      // The whole dump row decodes at once on the downbeat (its columns past the dump into blank).
      from = () => DECODE;
    } else if (row >= LOG_ROW && row < LOG_ROW + OUTRO_LOG_DECODE.length) {
      const line = OUTRO_LOG_DECODE[row - LOG_ROW];
      const start = LOG_DECODE[row - LOG_ROW];
      const stamp = stampLength(line.text);
      layoutLines([line.text]).forEach((c, j) => {
        target.set(c.col, { ch: c.ch, width: c.width, ink: lineInk(line, j, stamp) });
        for (let k = 1; k < c.width; k++) covered.add(c.col + k);
      });
      // Left → right across the whole row over 6 f (the text itself in about half of that).
      from = (col) => start + (6 * (col - COL0)) / (COL1 - COL0);
    }
    for (let col = COL0; col <= COL1; col++) {
      const t = covered.has(col) ? undefined : target.get(col);
      const ch = t && t.ch !== ' ' ? t.ch : '';
      cells.push({ col, row, width: t?.width ?? 1, ch, from: from(col), ink: t?.ink ?? DRAINED });
    }
  }
  const prints: PrintCell[] = [];
  for (const p of PRINTED) {
    const stamp = stampLength(p.text);
    const n = [...p.text].length;
    if (p.line === PROMPT_TEXT) {
      // `> ` with the prompt, then `exit` one key a 32nd.
      layoutLines([p.text]).forEach((c, j) => {
        const k = j - PROMPT.length;
        if (c.ch !== ' ') prints.push({ col: c.col, row: p.row, width: c.width, ch: c.ch, at: k < 0 ? p.at : KEYS[k], ink: k < 0 ? INK.green : INK.text, whole: true, pop: k >= 0 });
      });
      continue;
    }
    layoutLines([p.text]).forEach((c, j) => {
      if (c.ch === ' ') return;
      const ink = p.reveal === 1 ? traceInk(p.text, j) : scaleRGB(lineInk(p.line, j, stamp), p.scale);
      prints.push({ col: c.col, row: p.row, width: c.width, ch: c.ch, at: p.at + (p.reveal * j) / n, ink, whole: false, pop: false });
    });
  }
  return { cells, prints, dump };
}

// ——— Time ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Critically damped step response, time constant `tau`: from rest, no overshoot. */
const settle = (t: number, tau = 3): number => (t <= 0 ? 0 : 1 - (1 + t / tau) * Math.exp(-t / tau));
/** Rows the log has scrolled at instant `f`: one per printed line, each easing in critically damped (τ 3 f; the backtrace's lines,
 *  three a frame, τ 1 f, so the spew keeps up and the prompt after it prints on the screen's bottom rows). */
export function scrollAt(f: number): number {
  let s = 0;
  for (const p of PRINTED) s += settle(f - p.at, p.reveal === 1 ? 1 : 3);
  return s;
}

const DECODE_LIST = [...DECODE_GLYPHS];
const flicker = (col: number, row: number, F: number): string => DECODE_LIST[Math.floor(hash(col - COL0, row - ROW0, seedFrame(F), 35) * DECODE_LIST.length)];

/**
 * How far the log has gone over to dim texture at instant `f` (iteration 2, ruling 14): 0 through the decode's flicker (outro 1.1–1.1 + 2:
 * the seam and the downbeat's event stay as they were), 1 by outro 1.1& − 4. The log's light then sits at LOG_TEXTURE of its ink and its pops
 * (a decode settling, a line printing, a key) at a third of theirs, so nothing of it blooms and the staged lines carry the bar.
 */
export const LOG_TEXTURE = 0.16;
const TEXTURE_FROM = DECODE + 2;
const textureAt = (f: number): number => flow((f - TEXTURE_FROM) / 6);

/**
 * Writes the light layer's glyphs (the field, the dump, the log, the printed lines) at instant `f` into `out`; returns the count.
 * `cam` is the instant the scroll is taken at (FrameContext.cam: the shutter-open instant for the phosphor tail), so the tail ghosts
 * what changed in a cell — a decode's flicker, a line printing in — and never smears the scrolling log into streaks.
 */
export function logGlyphs(f: number, L: LogLayout, out: Glyph[], cam = f): number {
  const F = frameOf(f);
  const scroll = scrollAt(cam);
  const t = textureAt(f);
  const dim = lerp(1, LOG_TEXTURE, t);
  /** A pop's strength: whole before the texture, a third of it after. */
  const kk = (k: number) => k * lerp(1, 0.35, t);
  let n = 0;
  const put = (col: number, row: number, width: number, ch: string, color: RGB, size: number = TERM.fontPx, alpha = 1) => {
    const r = row - scroll;
    if (r < ROW0 - 0.6 || r > ROW1 + 0.6) return;
    const [x, y] = cellCenter(col, r, width);
    out[n++] = { ch, x, y, size, color: dim === 1 ? color : scaleRGB(color, dim), alpha };
  };
  for (const c of L.cells) {
    const s = Math.ceil(c.from - 1e-9);
    if (F < s) {
      put(c.col, c.row, 1, '@', DRAINED);
    } else if (c.ch === '') {
      // Decaying to blank: one dim flicker on its frame, then nothing.
      if (F === s) put(c.col, c.row, 1, flicker(c.col, c.row, F), scaleRGB(DRAINED, 1 + kk(0.3)));
    } else if (F < s + 2) {
      put(c.col, c.row, 1, flicker(c.col, c.row, F), scaleRGB(c.ink, 1 + kk(0.8)));
    } else {
      put(c.col, c.row, c.width, c.ch, scaleRGB(c.ink, glow(F, s + 2, kk(1.2), 4)));
    }
  }
  for (const p of L.prints) {
    if (p.whole ? F < p.at : f < p.at) continue;
    const alpha = p.whole ? 1 : smoothstep(p.at, p.at + 1, f);
    const pop = p.pop ? 1 + 0.35 * Math.exp(-Math.max(0, f - p.at) / 3) : 1;
    put(p.col, p.row, p.width, p.ch, scaleRGB(p.ink, glow(Math.max(f, p.at), p.at, kk(p.pop ? 1.8 : 1.6), 4)), TERM.fontPx * pop, alpha);
  }
  // The cursor: steady after what has been typed, from the prompt on (the dying system prints its last lines under it: iteration 3).
  const prompt = PROMPT_LINE;
  if (F >= prompt.at) put(PROMPT.length + KEYS.filter((k) => k <= F).length, prompt.row, 1, CURSOR, scaleRGB(INK.green, 1.1));
  return n;
}

// ——— The staged lines (iteration 2, ruling 14) ————————————————————————————————————————————————————————————————————————————————

/** The staged type: JetBrains Mono at 64 px (the log's is 22) on the log's 0.6 em cells, centred on (960, 720) — under him, clear of
 *  his backing at its largest, and inside the frame at the end of the push; its dark band (or the inverse's pink bar). */
export const STAGE_TYPE = { size: 64, y: 720, cell: TERM.cellW / TERM.fontPx, band: { pad: 3, h: 2.4, alpha: 0.94, soft: 30 }, bar: TERM.cellH / TERM.fontPx } as const;
type StageStyle = 'inverse' | 'pink' | 'accent';
/** A staged line: its frame, its text (each one is a log line's own words, so the atlas and check-glyphs already hold them), how it
 *  is inked, — for `accent` — where its amber starts, and whether it outlives the picture (`last`: drawn over the screen, lastWords). */
export type Staged = { at: number; text: string; style: StageStyle; accent?: number; last?: boolean };
const fromWords = (line: string | undefined, words: string): string => {
  const i = line?.indexOf(words) ?? -1;
  if (i < 0) throw new Error(`outroLog: no log line says "${words}"`);
  return line!.slice(i);
};
const TABLE_TEXT = fromWords(OUTRO_LOG_PRINT.find((l) => l.at === TABLE && l.text.includes(TABLE_BACK))?.text, 'table restored');
const PROMISE_TEXT = fromWords(OUTRO_LOG_PRINT.find((l) => l.at === PROMISE && l.text.includes('blink-scheduler:'))?.text, 'next wink');
/** One line a beat: cute dumped (outro 1.1), the guest's flip (outro 1.2), the table set back (outro 1.2&), the promise (outro 1.3), the last words. */
export const STAGE: readonly Staged[] = [
  { at: SEGFAULT, text: INVERSE.text, style: 'inverse' },
  { at: GUEST_EXIT, text: GUEST_FLIP.face, style: 'pink' },
  { at: TABLE, text: TABLE_TEXT, style: 'accent', accent: [...TABLE_TEXT].length - [...TABLE_BACK].length },
  { at: PROMISE, text: PROMISE_TEXT, style: 'accent', accent: [...PROMISE_TEXT].length - String(WINK).length, last: true },
];
/** The staged band's ground: the glass's own dark, feathered, so the log's texture stops short of the type. */
const BAND_INK = GROUND;

/** A staged line's type at instant `f` (`t` frames after it landed): its pop (type 1.1 → 1, light 1.8 → 1 over ≈ 4 f), × `level`. */
function stagedType(s: Staged, f: number, level = 1): Glyph[] {
  const t = Math.max(0, f - s.at);
  const size = STAGE_TYPE.size * (1 + 0.1 * Math.exp(-t / 3));
  const light = (1 + 0.8 * Math.exp(-t / 4)) * level;
  const cell = STAGE_TYPE.cell * size;
  const y = 540 - STAGE_TYPE.y;
  const x0 = (-lineWidth(s.text) * cell) / 2;
  const glyphs: Glyph[] = [];
  layoutLines([s.text]).forEach((c, j) => {
    if (c.ch === ' ') return;
    const ink = s.style === 'inverse' ? GROUND : s.style === 'pink' ? INK.pink : j >= (s.accent ?? Infinity) ? INK.amber : INK.text;
    glyphs.push({ ch: c.ch, x: x0 + (c.col + c.width / 2) * cell, y, size, color: s.style === 'inverse' ? ink : scaleRGB(ink, light) });
  });
  return glyphs;
}

/**
 * The staged line in the picture at instant `f`: the latest of STAGE struck by then (whole from its frame's first sub-frame), landing
 * with a pop. `under`: its band (normal blend), or the inverse's pink bar; `dark`: the inverse's type (normal); `bright`: the lit type
 * (additive: it blooms). The last words (the promise) leave only their band here — the squeeze takes it with the picture — and their
 * type to lastWords. Empty before outro 1.1.
 */
export function stagedLine(f: number): { text: string; under: Shape[]; dark: Glyph[]; bright: Glyph[] } {
  let s: Staged | undefined;
  for (const x of STAGE) if (struck(x.at, f)) s = x;
  if (!s) return { text: '', under: [], dark: [], bright: [] };
  const t = Math.max(0, f - s.at);
  const y = 540 - STAGE_TYPE.y;
  const cells = lineWidth(s.text);
  if (s.style === 'inverse') {
    const glyphs = stagedType(s, f);
    const size = glyphs[0]?.size ?? STAGE_TYPE.size;
    const bar: Shape = { kind: 'rect', x: 0, y, w: (cells + 1) * STAGE_TYPE.cell * size, h: STAGE_TYPE.bar * size, color: scaleRGB(BAR, 1 + 0.6 * Math.exp(-t / 5)) };
    return { text: s.text, under: [bar], dark: glyphs, bright: [] };
  }
  const b = STAGE_TYPE.band;
  const base = STAGE_TYPE.cell * STAGE_TYPE.size;
  const band: Shape = { kind: 'rect', x: 0, y, w: (cells + 2 * b.pad) * base, h: b.h * STAGE_TYPE.size, color: BAND_INK, alpha: b.alpha, soft: b.soft };
  return { text: s.text, under: [band], dark: [], bright: s.last ? [] : stagedType(s, f) };
}

/**
 * The last words (iteration 3): the promise lands with the lost heartbeat on outro 1.3, which is Enter's beat now, and is drawn over the
 * screen (src/scenes/outroLog.ts, after the aperture), never squeezed — the squeeze takes the log, him and its band, and leaves the
 * words: the last thing visible, glowing under the white line through its beat. From LINE no beam refreshes them: they dim every
 * frame like phosphor (τ `tau`), and as the ω forms on outro 1.4 they go out, by `out.to` (outro 2.1 − 3: before the lens opens round them).
 */
export const LAST_WORDS = { tau: 24, out: { from: DIP.from, to: OPEN - 3 } } as const;
export function lastWords(f: number): { text: string; bright: Glyph[] } {
  const s = STAGE.find((x) => x.last)!;
  if (!struck(s.at, f) || f >= LAST_WORDS.out.to) return { text: '', bright: [] };
  const level = (f < LINE ? 1 : Math.exp(-(f - LINE) / LAST_WORDS.tau)) * (1 - smoothstep(LAST_WORDS.out.from, LAST_WORDS.out.to, f));
  return { text: s.text, bright: stagedType(s, f, level) };
}

// ——— The hero ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * He grows (iteration 2, ruling 14: "the hero bigger"; this replaces round 2's glide aside, whose job — keeping the log's eggs
 * readable — the staged lines do now). On the hand-off he sits where drop 2 condensed him, (960, 450) at em 163 (H5), through the
 * decode; from outro 1.1 + 6 he swells, eased, to 1.45× at (960, 392), whole by outro 1.2 (keyed SWAP_LEAD early, so every sub-frame of outro 1.2 shows
 * him there), and holds it into the squeeze — above the staged line, his backing clear of its band.
 */
export const LOG_GROW = { from: DECODE + 6, to: GUEST_EXIT, centre: [960, 392] as const, scale: 1.45 } as const;
/** Where he is at instant `f`: his centre (layout px, y down) and his scale (1 on the hand-off). */
export function logPlace(f: number): { x: number; y: number; k: number } {
  const u = flow((f - (LOG_GROW.from - SWAP_LEAD)) / (LOG_GROW.to - LOG_GROW.from));
  const [x0, y0] = T7_CONDENSED.centre;
  return { x: lerp(x0, LOG_GROW.centre[0], u), y: lerp(y0, LOG_GROW.centre[1], u), k: lerp(1, LOG_GROW.scale, u) };
}

/** His backing: 488 × 180 px about him (layout x 716–1204, y 360–540 on the hand-off), scaled and carried with him — the glass's own
 *  colour at the hand-off spot (its ground and the phosphor haze), its edge feathered over 10 px, so it reads as a clearing in the
 *  log's texture, not a box. Opaque throughout: his phosphor is additive, and the log must not glow through him. */
const BACKING = { w: 488, h: 180 } as const;
const BACKING_INK: RGB = [GROUND[0] + 0.0113 * HAZE[0], GROUND[1] + 0.0113 * HAZE[1], GROUND[2] + 0.0113 * HAZE[2]];
export function logBacking(f: number): Shape {
  const p = logPlace(f);
  return { kind: 'rect', x: p.x - 960, y: 540 - p.y, w: BACKING.w * p.k, h: BACKING.h * p.k, color: BACKING_INK, alpha: 1, soft: 10 };
}
const TWITCH = (6 * Math.PI) / 180;

/**
 * His ink at instant `f` (ruling 15): drop 2's flat amber on the hand-off frame (H5: LOG_HERO_INK), lit into the CRT's phosphor
 * (HERO_PHOSPHOR) over the decode's six frames, from outro 1.1 + 1's flicker to full by outro 1.1 + 6.
 */
export function logHeroInk(f: number): RGB {
  if (f <= DECODE + SWAP_LEAD) return LOG_HERO_INK;
  const u = flow((f - (DECODE + SWAP_LEAD)) / (6 - SWAP_LEAD));
  return u >= 1 ? HERO_PHOSPHOR.ink : mixRGB(LOG_HERO_INK, HERO_PHOSPHOR.ink, u);
}

/** (×ω×) at instant `f`: which face (+ eyes on the lost heartbeat, • as the table is restored), its glyphs, its twitch (radians). */
export function logHero(f: number, advance: Advance): { face: string; glyphs: Glyph[]; rot: number } {
  const F = frameOf(f);
  const face = F === HEARTBEAT || F === HEARTBEAT + 1 ? HERO_OUT.twitch : F === TABLE || F === TABLE + 1 ? HERO_OUT.alive : HERO_OUT.crashed;
  // The twitch: −6° on the heartbeat (a jolt, taken at the output frame), snapping back over 8 f.
  const rot = F >= HEARTBEAT ? -TWITCH * (1 - snap(Math.max(f, HEARTBEAT), HEARTBEAT)) : 0;
  const place = logPlace(f);
  const size = T7_CONDENSED.em * place.k * (1 + 0.02 * Math.sin((2 * Math.PI * (f - OUTRO_START)) / 48));
  const ink = logHeroInk(f);
  const k = kaomoji(face, 'bemeb');
  const parts = k.map((p) => p.ch);
  const widths = parts.map((ch) => advance(ch));
  const total = widths.reduce((a, b) => a + b, 0) + 0.02 * (parts.length - 1);
  const [cx, cy] = [place.x - 960, 540 - place.y];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  let x = -total / 2;
  const glyphs: Glyph[] = parts.map((ch, i) => {
    const dx = (x + widths[i] / 2) * size;
    x += widths[i] + 0.02;
    return { ch, x: cx + dx * cos, y: cy + dx * sin, size, color: ink, rot };
  });
  return { face, glyphs, rot };
}

// ——— Camera, finishing, sampling ———————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The push: 1.00 on the hand-off frame (R12) to 1.04 by PUSH_TO (outro 1.4 − 1, the frame before the ω), about his face wherever he is, so he
 * never moves on screen but by his own glide. (Iteration 3 keeps iteration 2's curve: Enter moved to outro 1.3, the push did not — it runs
 * on through the squeeze and the line, carrying the last words a pixel or two, and holds under the ω.) (About (1480, 470) the sheet's 1.06 would push the log's left column to x ≈ 0; 1.04
 * keeps the 28 px margin it had about (960, 450).)
 */
export const LOG_PUSH = 0.04;
export const PUSH_TO = DIP.from - 1;
export function logPose(f: number): Pose {
  const z = 1 + LOG_PUSH * flow((f - OUTRO_START) / (PUSH_TO - OUTRO_START));
  const p = logPlace(f);
  const [px, py] = [p.x - 960, 540 - p.y];
  return aimPose({ zoom: z, x: px * (1 - 1 / z), y: py * (1 - 1 / z), roll: 0 }, FRONT_DISTANCE, FOV);
}

/** The terminal's finishing: H5's CRT (curvature 0.02) bending to 0.045 over outro 1.1–1.1 + 4; the refresh band rolling once a bar as in the
 *  intro (outro 1.1 is a bar line, so it starts where drop 2 left it); a lift on the decode, the table flip (outro 1.2, as before: cute dumped on the downbeat keeps the seam's look), the heartbeat and Enter; the
 *  scanlines fading out as the picture squeezes to a line. */
export function outroLogLook(frame: number): Look {
  const F = Math.round(frame);
  const bend = smoothstep(OUTRO_START, OUTRO_START + 4, F);
  const curvature = bend >= 1 ? TERMINAL_CURVATURE : lerp(0.02, TERMINAL_CURVATURE, bend);
  const band = (((F % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const boost = Math.max(glow(F, DECODE, 0.4, 6), glow(F, GUEST_EXIT, 0.5, 6), glow(F, HEARTBEAT, 0.4, 6), glow(F, ENTER, 0.25, 4)) - 1;
  const look = terminalLook(1, boost, band, curvature);
  const u = clamp((F - SQUEEZE.from) / (SQUEEZE.to - SQUEEZE.from));
  const scanlines = F >= LINE ? 0 : 0.3 * (1 - u);
  return { ...look, crt: { ...look.crt!, scanlines } };
}

/** A faint phosphor tail on the log (the intro's: τ 1.2 f, afterglow 0.2, 16 sub-frames a frame of window); the squeeze and the line
 *  move fast, so 32 sub-frames and no tail. (He and the staged lines are drawn at the shutter's instants, so the tail never copies
 *  them: only the log's own changes ghost.) */
export function outroLogTemporal(frame: number): Temporal {
  if (frame >= ENTER) return { samples: 32, shutter: 0.5, persistence: 0 };
  return withDensity({ shutter: 0.5, persistence: 1.2, afterglow: 0.2 }, 16);
}
export const outroLogSegment = (): Segment => outroSegment();

// ——— Atlases ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const unique = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
/** Every character the log draws in mono: the dump's, the field's, the decode flicker's, every line's, the prompt and the cursor. */
export const OUTRO_LOG_MONO: readonly string[] = unique([
  '0123456789abcdefx|.@',
  RAMP,
  DECODE_GLYPHS,
  ...OUTRO_LOG_DECODE.map((l) => l.text),
  ...OUTRO_LOG_PRINT.map((l) => l.text),
  ...OUTRO_BACKTRACE,
  PROMPT + 'exit' + CURSOR,
]);
/** Every character of his faces in the log (rounded). */
export const OUTRO_LOG_ROUNDED: readonly string[] = unique([HERO_OUT.crashed, HERO_OUT.twitch, HERO_OUT.alive]);
