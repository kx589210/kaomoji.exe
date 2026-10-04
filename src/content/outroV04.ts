// LEGACY, retired 2026-10-01 (the 58-bar ending sheet, notes/b58/ending-sheet.md): the strings of the v04 2-bar ending, kept
// verbatim (on the v04 frames of src/score/outroV04.ts) only for its salvage sources and their tests. The film no longer draws them and
// check-glyphs no longer lists them: the ending's strings are src/content/outro.ts. Delete with the last salvage source.
// The original header follows.
// What the ending draws (the outro, the film's last 2 bars): every on-screen string, for scripts/check-glyphs.mjs and for the ending's shots to import (strings
// live here; the shots import them, never the other way round). The crash log is E11 (build sheet notes/d2build/sheet.md §5.12):
// its timestamps are the film's real time, read from the score files, so they stay true if a frame moves. Roles: the terminal in
// JetBrains Mono (`mono`), the hero in M PLUS Rounded (`rounded`).
import { COMMAND, CURSOR, PROMPT } from './boot.ts';
import { GUEST, GUEST_FLIP } from './castDrop2.ts';
import type { TextItem } from './text.ts';
import { CRASH, LATCH, WRAP } from '../score/drop2.ts';
import { partBar } from '../score/film.ts';
import { BACKTRACE, GUEST_EXIT, HEARTBEAT, KEYS, PROMISE, SCHEDULER_FAIL, SEGFAULT, STATS, TABLE, WINK } from '../score/outroV04.ts';
import { FPS, TOTAL_BARS, TOTAL_FRAMES, BPM } from '../score/tempo.ts';

/** A kernel-log timestamp of film frame `frame` (the film's real time), in the boot log's format: the outro's downbeat → `[   54.400000]` today. */
export const stamp = (frame: number): string => `[${(frame / FPS).toFixed(6).padStart(12)}]`;

/**
 * One line of the crash log. `kind` sets its ink: `pink` (the monitor's last words, FATAL), `text`, `dim`, `fail` (`[FAIL]` pink, the
 * rest text), `ok` (`[ OK ]` green), `exit` (`[EXIT]` amber), `inverse` (#0C0F0E on a #FF5FA2 bar). From `accent` on, the line is a
 * face: pink in `text` / `fail` / `exit` lines, amber in `ok` lines (the boot log's accent rule).
 */
export type OutroLine = { text: string; kind: 'pink' | 'text' | 'dim' | 'fail' | 'ok' | 'exit' | 'inverse'; accent?: number };

const chars = (s: string): number => [...s].length;
const withFace = (text: string, kind: OutroLine['kind'], face: string): OutroLine => ({ text: `${text}${face}`, kind, accent: chars(text) });

/** The hero's faces in the ending (rounded): crashed, twitching (+ eyes), the flick of life, holding the lens open, and the only wink. */
export const HERO_OUT = {
  crashed: '(×ω×)',
  twitch: '(+ω+)',
  alive: '(•ω•)',
  arms: 'ヽ(•ω•)ﾉ',
  wink: '(•ω<)✧',
} as const;

/** The table he sets back (the boot log's `negotiating with table ┻━┻`, answered). */
export const TABLE_BACK = '┬─┬ノ(•ω•ノ)';

/** Rows 22–29, decoded in place from outro 1.1 (LOG_DECODE: one line a 32nd). */
export const OUTRO_LOG_DECODE: readonly OutroLine[] = [
  { text: `${stamp(WRAP)} party-monitor: memory -2147483648% · hype ERR · friends NaN`, kind: 'pink' },
  { text: `${stamp(LATCH)} kaomoji.exe: renderer stuck in ascii (cut rate > flash rate)`, kind: 'text' },
  withFace(`${stamp(CRASH)} kaomoji.exe: liquid detected on /dev/keyboard `, 'text', GUEST.face),
  { text: '[FAIL] confetti pool exhausted (4096/4096)', kind: 'fail' },
  { text: '[FAIL] unmounting /dev/smile', kind: 'fail' },
  { text: '[FAIL] calibrating mouth ... ω', kind: 'fail' },
  { text: '[FAIL] syncing hi-hats to 16th notes', kind: 'fail' },
  withFace('[ OK ] dumping core ... saved ', 'ok', HERO_OUT.alive),
];

/** `file:NN`: a backtrace frame's location, its line number the film bar (two digits). */
const loc = (file: string, bar: number): string => `${file}:${String(bar).padStart(2, '0')}`;

/** The backtrace, printed three lines a frame after its header (BACKTRACE; done 5 frames later): the film's sections in reverse, the
 *  line numbers bar numbers (film bars, read from the map: drop2.ts:34 … intro.ts:01 today). */
export const OUTRO_BACKTRACE: readonly string[] = [
  `  #0  splash()                ${loc('drop2.ts', partBar('drop2', 8))}   the last drop ${GUEST.face}`,
  `  #1  overload(worlds=8)      ${loc('drop2.ts', partBar('drop2', 7))}   cut rate > flash rate`,
  `  #2  overflow(int32)         ${loc('drop2.ts', partBar('drop2', 6))}   memory -2147483648%`,
  `  #3  full_combo()            ${loc('drop2.ts', partBar('drop2', 5))}   the future was in the data`,
  `  #4  render3d("donut.c")     ${loc('drop2.ts', partBar('drop2', 3))}   every renderer at once`,
  `  #5  style_cube()            ${loc('drop2.ts', partBar('drop2', 2))}   4 worlds, 1 face`,
  `  #6  slash(worlds=6)         ${loc('drop2.ts', partBar('drop2', 1))}   the bubble popped`,
  `  #7  sudo("make it louder")  ${loc('break.ts', partBar('break', 6))}   access granted`,
  `  #8  fetch(U+2022)           ${loc('break.ts', partBar('break', 4))}   /dev/galaxy`,
  `  #9  patch(face.core)        ${loc('break.ts', partBar('break', 2))}   (>ω<)`,
  `  #10 throw((•ω•))            ${loc('drop1.ts', partBar('club', 3))}   (╯°□°)╯︵`,
  `  #11 galaxy.stutter()        ${loc('drop1.ts', partBar('cosmos', 4))}   party exceeds galaxy`,
  `  #12 bigbang()               ${loc('drop1.ts', partBar('cosmos', 1))}`,
  `  #13 print(riso)             ${loc('build.ts', partBar('riso', 1))}   pink · blue`,
  `  #14 main()                  ${loc('intro.ts', partBar('intro', 1))}   kaomoji --run --party`,
];

/** The film's numbers, printed under the guest's [EXIT] line on outro 1.2 (STATS), before the prompt; the dying system's own lines
 *  (the scheduler's fail, FATAL and the promise) print after it, under the prompt. */
const FILM_STATS = `${TOTAL_BARS}/${TOTAL_BARS} bars · ${TOTAL_FRAMES} frames · ${BPM} bpm · 0 tofu · friends online: 1`;

/** The lines printed at the bottom of outro bar 1, each scrolling the log up a row, with the frame each prints on. */
export const OUTRO_LOG_PRINT: readonly (OutroLine & { at: number })[] = [
  { at: SEGFAULT, text: 'Segmentation fault (cute dumped)', kind: 'inverse' },
  { at: BACKTRACE, text: 'backtrace (most recent call first):', kind: 'text' },
  { at: HEARTBEAT, ...withFace('[FATAL] heartbeat lost: ', 'pink', HERO_OUT.alive) },
  { at: SCHEDULER_FAIL, text: '[FAIL] stopping blink-scheduler.service: still blinking', kind: 'fail' },
  { at: PROMISE, text: `${stamp(PROMISE)} blink-scheduler: next wink at frame ${WINK}`, kind: 'text' },
  { at: GUEST_EXIT, ...withFace('[EXIT] ', 'exit', `${GUEST_FLIP.face} disconnected`) },
  { at: TABLE, ...withFace('[ OK ] table restored ', 'ok', TABLE_BACK) },
  { at: STATS, text: FILM_STATS, kind: 'dim' },
  { at: KEYS[0], text: `${PROMPT}exit`, kind: 'text' },
];

/** One hexdump row (rows 0–21): the address, 16 bytes in two groups of 8, and the ASCII gutter — the field's glyphs on drop 2's last frame. */
export function hexRow(row: number, glyphs: string): string {
  const g = [...glyphs.padEnd(16, '.').slice(0, 16)];
  const bytes = g.map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'));
  return `0x${(0x7ffd3a40 + 16 * row).toString(16)}  ${bytes.slice(0, 8).join(' ')}  ${bytes.slice(8).join(' ')}  |${g.join('')}|`;
}

/** W5, the readout back calm outside the lens on outro 2.2&. */
export const W5 = { rows: ['friends   1', 'memory    1%', 'hype      1%'] as const, line: '[ OK ] (•ω•) survived' } as const;

/** Every string the ending puts on screen, with the font role the scene really draws it in (the check tests each character against that role's stack only). */
export const OUTRO_TEXTS: readonly TextItem[] = [
  ...[HERO_OUT.crashed, HERO_OUT.twitch, HERO_OUT.alive, HERO_OUT.arms, HERO_OUT.wink].map((text) => ({ role: 'rounded' as const, text, where: 'the hero (S33, S34)' })),
  ...OUTRO_LOG_DECODE.map((l) => ({ role: 'mono' as const, text: l.text, where: 'S33: the crash log, decoded in place' })),
  ...OUTRO_LOG_PRINT.map((l) => ({ role: 'mono' as const, text: l.text, where: 'S33: the crash log, printed' })),
  ...OUTRO_BACKTRACE.map((text) => ({ role: 'mono' as const, text, where: 'S33: the backtrace' })),
  { role: 'mono', text: hexRow(0, '@@@@=+*+=@@@@@@@'), where: 'S33: the hexdump' },
  { role: 'mono', text: '0123456789abcdefx|@=+*. ', where: 'S33: the hexdump’s characters' },
  { role: 'mono', text: `${PROMPT}${COMMAND}${CURSOR}`, where: 'S34: the recalled command' },
  { role: 'mono', text: `${PROMPT}exit${CURSOR}`, where: 'S33: exit, typed' },
  ...[...W5.rows, W5.line].map((text) => ({ role: 'mono' as const, text, where: 'S34: W5' })),
];
/** Every string whose characters the ending extrudes in 3D: none. */
export const OUTRO_EXTRUDE: readonly string[] = [];
