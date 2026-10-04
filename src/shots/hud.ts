// The party monitor (spec revision 9 §4 暗线, §15 文字小梗 8): the program's
// own readout in a corner, in the terminal's type and colours, drawn as text
// mode (style B): a double-line box-drawing frame, and gauges
// filled with the density ramp the giant ASCII face of intro bar 4 was drawn with. It is an easter
// egg that turns up now and then, not a fixture: it pops up for
// a moment on Earth (friends online: 8,100,000,000, held while it shows), on
// the galaxy's stutter, and on the dance floor, staying up through the throw
// until the screen is about to break — typed in, then gone. The numbers climb
// with every level of scale underneath; memory climbs to 99% and holds there,
// then jumps to 128%, red, the frame (•ω•) is thrown. Pure: a scene draws
// hudContent() on top of its picture, in screen px (origin at the centre, y up).
import { type RGB, linear } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, smoothstep } from '../engine/math.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Advance } from '../engine/typeset.ts';
import { BURST, CLUB_END, COSMOS_END, FLIP, HATS, HIT, LEVELS, RESUME, SILENCE, STUTTER } from '../score/drop1.ts';
import { PALETTE } from '../worlds/terminal.ts';

const GREEN = linear(PALETTE.green, 1.4);
const DIM = linear(PALETTE.text, 0.55);
const AMBER = linear(PALETTE.amber, 1.5);
const RED = linear(PALETTE.pink, 1.6);
const PANEL = linear('#06091C');

/** The readout pops up on Earth for a moment after the cut (cosmos bar 2). */
const EARTH_WINDOW = [LEVELS.earth + 6, LEVELS.earth + 52] as const;
/**
 * A window over the stutter that runs on `over` frames into the club (club 1.1 follows the cosmos's content end): its cosmos side and,
 * when the cosmos's held bars sit between them (src/score/film.ts partTail), its club side placed as if they did not — typed in already,
 * fading on the same club frames — so each part shows what it showed with no bars between them. Without held bars the two are one; so
 * they are when the bars between are fewer than the window is long (v08's one-bar bridge A, a stub: the club side would start before the
 * cosmos side ends), the readout staying up across them, the club's frames showing what they showed.
 */
const overTheCut = (from: number, over: number): [number, number][] => {
  if (LEVELS.cosmos === STUTTER.to) return [[from, STUTTER.to + over]];
  const club = LEVELS.cosmos - (STUTTER.to - from);
  return club < STUTTER.to + over
    ? [[from, LEVELS.cosmos + over]]
    : [
        [from, STUTTER.to + over],
        [club, LEVELS.cosmos + over],
      ];
};

/** When the readout is on screen: [from, to). On Earth, through the stutter, and from club 2.3 on the dance floor straight through the throw to the club's last frame (the last before the glass breaks, its held bars aside) — one window, so memory's jump to 128% is seen happening on FLIP. */
export const HUD_WINDOWS: readonly (readonly [number, number])[] = [
  EARTH_WINDOW,
  ...overTheCut(STUTTER.from - 12, 14),
  [LEVELS.table + 48, CLUB_END],
];

/** A key of one of the readout's numbers: [frame, value]. */
type Key = readonly [number, number];

/**
 * Friends online: one at the burst, the boot log's 1,024 as time snaps back, Earth's population — held while Earth's window
 * shows it, the climb to the solar system starting as it closes — then each level's count, and ∞ on the party table. The cosmos level's
 * count is reached on the cosmos's last frame (COSMOS_END) and held over its held bars to club 1.1.
 */
export const FRIENDS_KEYS: readonly Key[] = [
  [BURST, 1],
  [RESUME, 1024],
  [LEVELS.earth, 8.1e9],
  [EARTH_WINDOW[1], 8.1e9],
  [LEVELS.solar, 4.2e13],
  [LEVELS.galaxy, 9.9e18],
  [COSMOS_END, 2.0e24],
  [LEVELS.cosmos, 2.0e24],
  [LEVELS.table, Infinity],
];
/** Memory %: climbing with the levels to 99% on the party table, held there until he is thrown. */
export const MEMORY_KEYS: readonly Key[] = [
  [BURST, 12],
  [RESUME, 20],
  [LEVELS.earth, 31],
  [LEVELS.solar, 48],
  [LEVELS.galaxy, 77],
  [COSMOS_END, 96],
  [LEVELS.cosmos, 96],
  [LEVELS.table, 99],
];
/** Memory % from FLIP, the frame (•ω•) is thrown: over the top, in red. */
export const THROWN_MEMORY = 128;
/** CPU %: flat out from the party table. */
export const CPU_KEYS: readonly Key[] = [
  [BURST, 34],
  [RESUME, 45],
  [LEVELS.earth, 61],
  [LEVELS.solar, 72],
  [LEVELS.galaxy, 88],
  [COSMOS_END, 97],
  [LEVELS.cosmos, 97],
  [LEVELS.table, 100],
];

/** The value of `keys` at `tick`: a key's own value on its frame, climbing towards the next key between (in log space for `log`; towards ∞ twelve decades over the first half, then ∞), held after the last. */
function climb(keys: readonly Key[], tick: number, log = false): number {
  let i = -1;
  while (i + 1 < keys.length && keys[i + 1][0] <= tick) i++;
  if (i < 0) return keys[0][1];
  const a = keys[i];
  const b = keys[i + 1];
  if (!b || tick === a[0] || a[1] === b[1]) return a[1];
  const u = (tick - a[0]) / (b[0] - a[0]);
  if (!log) return a[1] + u * (b[1] - a[1]);
  if (!Number.isFinite(b[1])) return u > 0.5 ? Infinity : a[1] * 10 ** (u * 12);
  return 10 ** (Math.log10(a[1]) + u * (Math.log10(b[1]) - Math.log10(a[1])));
}

/** A warning line: shown over [from, to), blinking on the sixteenths. */
export type Warning = { from: number; to: number; text: string; level: 'warn' | 'err' };
export const WARNINGS: readonly Warning[] = [
  ...overTheCut(STUTTER.from, 24).map(([from, to]): Warning => ({ from, to, text: '[WARN] party exceeds galaxy', level: 'warn' })),
  { from: LEVELS.table, to: FLIP, text: '[WARN] cuteness exceeds safe limits', level: 'warn' },
  { from: FLIP, to: HIT, text: '[ERR] (•ω•) thrown at screen', level: 'err' },
  { from: HIT, to: SILENCE.to, text: '[FATAL] screen integrity 0%', level: 'err' },
];

export type Monitor = { friends: number; memory: number; cpu: number; warning: Warning | null };

/** The readout at `frame`: the numbers step on each sixteenth (a counter ticking over, not a smooth slide); memory jumps on FLIP. */
export function monitorAt(frame: number): Monitor {
  const tick = HATS.filter((h) => h <= frame).pop() ?? frame;
  const friends = Math.round(climb(FRIENDS_KEYS, tick, true));
  const memory = frame >= FLIP ? THROWN_MEMORY : Math.round(climb(MEMORY_KEYS, tick));
  const cpu = Math.round(climb(CPU_KEYS, tick));
  const warning = WARNINGS.find((w) => frame >= w.from && frame < w.to) ?? null;
  return { friends, memory, cpu, warning };
}

/** Friends online as the readout prints it: digits with commas up to a trillion, then mantissa and exponent (9.96e12 is 1.0e13, never 10.0e12), then ∞. */
export function formatFriends(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1e12) return Math.round(n).toLocaleString('en-US');
  const [mantissa, exponent] = n.toExponential(1).split('e');
  return `${mantissa}e${Number(exponent)}`;
}

/** The density ramp of intro bar 4's ASCII face (src/actors/asciiFace.ts), sparse to dense. */
export const RAMP = ' .:-=+*#%@';
/** A gauge `cells` wide for a percentage, filled with the ramp: full cells dense, the cell it is filling partway, the rest blank (over 100 it stays full). */
export const meter = (pct: number, cells = 20): string => {
  let out = '';
  for (let i = 0; i < cells; i++) {
    const v = clamp((Math.min(100, pct) / 100) * cells - i);
    out += RAMP[Math.round(v * (RAMP.length - 1))];
  }
  return out;
};

/** The readout's width in characters, frame included. */
export const COLS = 44;
/** A row of the readout: its frame characters (dim) and its content, each placed by column. */
export type Row = { frame: { col: number; text: string }[]; text: string; col: number; color: RGB };

/** The readout's rows at `frame`, top to bottom: the frame's top edge with the title, friends, memory, cpu, the bottom edge, and the warning line under the box. Memory is green, amber over 90%, red only over 100% (once he is thrown). */
export function hudLines(frame: number): Row[] {
  const m = monitorAt(frame);
  const hot = m.memory > 100;
  const title = ' kaomoji.exe :: party monitor ';
  const side = (text: string, color: RGB): Row => ({ frame: [{ col: 0, text: '║' }, { col: COLS - 1, text: '║' }], text, col: 2, color });
  const pct = (n: number) => `${String(n).padStart(3)}%`;
  const rows: Row[] = [
    { frame: [{ col: 0, text: '╔═' + title + '═'.repeat(COLS - 3 - title.length) + '╗' }], text: '', col: 0, color: DIM },
    side(`friends  ${formatFriends(m.friends)}`, GREEN),
    side(`memory   ${meter(m.memory)} ${pct(m.memory)}`, hot ? RED : m.memory > 90 ? AMBER : GREEN),
    side(`cpu      ${meter(m.cpu)} ${pct(m.cpu)}`, m.cpu >= 100 ? AMBER : GREEN),
    { frame: [{ col: 0, text: '╚' + '═'.repeat(COLS - 2) + '╝' }], text: '', col: 0, color: DIM },
  ];
  if (m.warning) rows.push({ frame: [], text: m.warning.text, col: 2, color: m.warning.level === 'err' ? RED : AMBER });
  return rows;
}

/** Type size and line pitch of the readout (px at 1080p), its margin from the frame's bottom-left corner, and its backing's opacity. */
export const HUD = { size: 19, pitch: 27, margin: 46, panel: 0.62 } as const;

/** The readout drawn at instant `frame`, in screen px: a dark backing, the box and its rows on a character grid, typed in over a window's first frames, the warning line blinking. */
export function hudContent(frame: number, advance: Advance): FlatContent {
  // Everything the readout does is a step — a number ticking over, the warning blinking, a character typed, the panel growing a line —
  // so it is read at the output frame, each step taken half a frame early: every sub-frame of a frame's shutter (any shutter shorter
  // than a frame) sees the same state, and no two states print over each other.
  const out = Math.round(frame);
  const w = HUD_WINDOWS.find(([a, b]) => out >= a && out < b);
  if (!w) return { under: [], glyphs: {}, over: [] };
  const rows = hudLines(out);
  const typed = clamp((out - w[0]) / 8);
  // Up on the window's first frame, fading over its last four: the backing and the text together, so a window never ends on an empty box.
  const shown = smoothstep(-1, 1, out - w[0]) * (1 - smoothstep(w[1] - 4, w[1], out));
  const left = -960 + HUD.margin;
  const cell = advance('═') * HUD.size;
  const bottom = -540 + HUD.margin;
  const top = bottom + HUD.pitch * rows.length;
  // A plain dark backing under the box (text mode has no rounded panel), so the readout reads over the brightest galaxy.
  const under: Shape[] = [{ kind: 'rect', x: left - 6 + (COLS * cell + 12) / 2, y: (top + bottom) / 2, w: COLS * cell + 12, h: top - bottom + 8, color: PANEL, alpha: HUD.panel * shown }];
  const glyphs: Glyph[] = [];
  const put = (text: string, col: number, y: number, color: RGB, count: number) => {
    [...text].slice(0, count).forEach((ch, i) => {
      if (ch.trim() !== '') glyphs.push({ ch, x: left + (col + i + 0.5) * cell, y, size: HUD.size, color, alpha: shown });
    });
  };
  rows.forEach((r, i) => {
    // The warning (the one row outside the box) blinks on the sixteenths: on for three frames, off for three.
    if (r.frame.length === 0 && Math.floor((out - BURST) / 3) % 2 === 1) return;
    const y = top - i * HUD.pitch - HUD.pitch / 2;
    // The rows type in from the left together, column by column, the frame with them.
    const count = Math.ceil(typed * COLS * 1.5);
    for (const f of r.frame) put(f.text, f.col, y, DIM, Math.max(0, count - f.col));
    put(r.text, r.col, y, r.color, Math.max(0, count - r.col));
  });
  return { under, glyphs: { mono: glyphs }, over: [] };
}

/** Every character the readout can show, for its atlas and the glyph check. */
export const HUD_CHARS: string = [...new Set([...'kaomoji.exe :: party monitor friends memory cpu 0123456789,.e% ∞╔═╗║╚╝', ...RAMP, ...WARNINGS.flatMap((w) => [...w.text])])].join('');
