// LEGACY, retired 2026-10-01 (the 58-bar ending sheet, notes/b58/ending-sheet.md): the frames of the v04 2-bar ending ("STILL HERE"),
// kept verbatim only so its salvage sources still compile and keep their tests while the new 4-bar ending is built:
// src/shots/outroLog.ts, outroScreen.ts, outroLens.ts (and their scenes), scripts/audio/sections/outro.mjs and their tests. Nothing in the
// film draws from it any more: src/scenes/outro.ts dispatches the new parts, and src/score/outro.ts is the new score. Its OUTRO_ACCENTS and
// OUTRO_GLYPHS are not wired (src/score/energy.ts and cuts.ts read src/score/outro.ts). Delete this file with the last salvage source.
// The original header follows.
// Events of the ending, the film's part 'outro' (its last 2 bars, src/score/film.ts), from the build sheet
// (notes/d2build/sheet.md: the beat sheet's "STILL HERE" with the eggs E11 and E12 merged in). Positions are the outro's own bars
// (`outro 1.1` = its downbeat; at(bar, beat) below), so the ending moves with its part when bars are inserted before it. The frozen field decodes in place into a hexdump and a crash
// log with the film's real timestamps: `Segmentation fault (cute dumped)`, a backtrace that is the film in reverse, the lost
// heartbeat, a blink scheduler that promises the frame of the wink, the guest's table flip and the hero setting it back, `exit`; on
// outro 1.3 — the lost heartbeat — Enter squeezes the CRT to a white line that holds the beat with the promise left glowing under it,
// the line dips into his ω on 1.4 and holds it, is pried open into a lens on the first tonic chord, he winks on the promised frame,
// presses ↑, and the cursor blinks after the last beat with the film's first sound. The picture (src/scenes/outro*.ts,
// src/shots/outro*.ts) and the music (scripts/audio/sections/outro*.mjs) read these lists, so every hit lands on the same frame.
// Rules (tests/outro.test.ts and tests/energyStandard.test.ts audit them): every exported frame is a multiple of 3 (the 32nd-note
// grid); export only numbers, number arrays, { from, to } objects and arrays of objects whose frame fields are named at / from / to /
// until. Windows are { from, to } with `to` exclusive. Plain Node loads this file: erasable TypeScript only, no three / remotion /
// react imports.
import type { GlyphFlash } from './cuts.ts';
import type { EnergyAccent } from './energy.ts';
import { CURSOR_BLINKS } from './intro.ts';
import { partFrame, partStart } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** The outro's bar `bar`, beat `beat` (both 1-based; outro 1.1& is at(1, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('outro', bar, beat - 1);

/**
 * The outro runs from its downbeat, outro 1.1 (drop 2 hands over), to the end of its content: the last frame of the film once it is built
 * through. On the 58-bar map the outro is 4 bars, of which these 2 are built: OUTRO_END is outro 3.1, and bars 3–4 hold its last frame
 * (src/score/film.ts partTail) to the end of the film.
 */
export const OUTRO_START = partStart('outro');
export const OUTRO_END = partFrame('outro', 3); // legacy: pinned to the v04 ending's 2 bars (it was builtEnd('outro'), equal while the outro is built for 2)

/** The e-piano's chords, then the film's first and only tonic. The V comes on outro 1.2& (iteration 3, with Enter on 1.3), so it rings a
 *  half beat before Enter sags it with the power. */
export const CHORDS_OUT: readonly { at: number; chord: 'IV' | 'Vsus' | 'V' | 'I' }[] = [
  { at: at(1), chord: 'IV' },
  { at: at(1, 2), chord: 'Vsus' },
  { at: at(1, 2.5), chord: 'V' },
  { at: at(2), chord: 'I' },
];

// ——— outro bar 1: the crash log (E11), staged one line a beat (iteration 2, ruling 14) ——————————————————————————————————————————
// The log itself is dim texture; outro bar 1 stages its story large, one line a beat (src/shots/outroLog.ts STAGE): cute dumped on
// outro 1.1, the guest's table flip on 1.2 and his `table restored ┬─┬ノ(•ω•ノ)` on its &, the promise of the wink's frame on 1.3 — with Enter
// (iteration 3), so it is the last thing left on the screen as the CRT goes to a line (src/shots/outroLog.ts lastWords).

/** The frozen field decodes in place: the hexdump, and the crash log's first 8 lines on the 32nds (each left → right over 6 f). */
export const DECODE = at(1);
export const LOG_DECODE: readonly number[] = steps(at(1), at(1, 2), THIRTY_SECOND);
/** `Segmentation fault (cute dumped)`, staged on the downbeat with the decode (the crash's headline; not printed in the log). */
export const SEGFAULT = at(1);
/** The guest flips the table and leaves (staged, and printed: the log starts printing here); he sets it back on the & (staged; his
 *  eyes flick to • for 2 frames). */
export const GUEST_EXIT = at(1, 2);
export const TABLE = at(1, 2.5);
/** The backtrace from its header here, three lines a frame (the film's sections in reverse), scrolling by behind the flip and done by
 *  outro 1.2& (iteration 3: before the prompt). */
export const BACKTRACE = at(1, 2) + THIRTY_SECOND;
/** The blink scheduler will not stop (its boop a 32nd before outro 1.3, a pickup into the kick). */
export const SCHEDULER_FAIL = at(1, 3) - THIRTY_SECOND;
/** `[FATAL] heartbeat lost: (•ω•)` — the soft kick (drop 2's rhythm game charts it), and his twitch. */
export const HEARTBEAT = at(1, 3);
/** The scheduler's promise of the wink's frame, staged on the heartbeat: the last thing the terminal says, left glowing as it goes off. */
export const PROMISE = at(1, 3);
/** The film's numbers (`… friends online: 1`), printed under the guest's [EXIT] line as he leaves (iteration 3: the terminal's own
 *  lines all come before the prompt, and Enter is on outro 1.3). */
export const STATS = at(1, 2);
/** `exit`, one key a 32nd on outro 1.2& (as the table is set back); Enter on 1.3, with the lost heartbeat (iteration 3: ruling 13 as
 *  meant — the squeeze on 1.3 gives the line and the ω a beat each). */
export const KEYS: readonly number[] = steps(at(1, 2.5), at(1, 3), THIRTY_SECOND);
export const ENTER = at(1, 3);

// ——— The button (E12) ———————————————————————————————————————————————————————————————————————————————————————————————————————

/** The CRT squeezes to a line on Enter, outro 1.3 (impact on LINE, a 16th later); the white line holds the rest of the beat, drawing
 *  in toward 1500 px, and dips into his ω on 1.4, which holds the whole beat to 2.1 (iteration 3: ruling 13 as meant — the line and the
 *  ω a beat each; iteration 2 had put the squeeze on 1.4, 6 and 12 frames). */
export const SQUEEZE = { from: ENTER, to: ENTER + SIXTEENTH } as const;
export const LINE = ENTER + SIXTEENTH;
export const DIP = { from: at(1, 4), to: at(1, 4) + THIRTY_SECOND } as const;
export const SHRINK = { from: LINE, to: at(2) } as const;
/** outro 2.1: the first tonic; the line is pried open into a lens with ヽ(•ω•)ﾉ holding it; the bell arpeggio. */
export const OPEN = at(2);
export const BELLS: readonly number[] = steps(at(2), at(2) + 4 * THIRTY_SECOND, THIRTY_SECOND);
/** His arms hold the lid through the wink and let go on its & (iteration 2, ruling 13). */
export const ARMS_DOWN = at(2, 2.5);
/** outro 2.2: (•ω<)✧, the only wink in the film, on the frame the scheduler promised. */
export const WINK = at(2, 2);
/** The ✧ twinkles; the readout comes back calm (W5). None on outro 2.3&: from the click to the tick everything but the chase spark and the cursor holds (R-O2-7). */
export const TWINKLES: readonly number[] = [at(2, 2.5), at(2, 4), at(2, 4.5)];
export const MONITOR_BACK = at(2, 2.5);
/** outro 2.3: ↑ recalls `> kaomoji --run --party█`; he rises; the chord holds at full under it. */
export const RECALL = at(2, 3);
/** The rim's bright chase, once round the lens: a struck spark that starts at the top of the lid, right above his face, and runs clockwise at an even speed (R-O2-6, `CHASE_SPARK` in src/shots/outroScreen.ts). */
export const CHASE = { from: at(2, 3.5), to: at(2, 4.5) } as const;
/** outro 2.3&: the button — the whole mix chokes to silence over a 32nd as the chase starts (scripts/audio/sections/outro.mjs STOP). */
export const RELEASE = CHASE.from;
/** The cursor: S01's two blinks (src/score/intro.ts CURSOR_BLINKS, intro positions) replayed from outro 2.3, each fading like
 *  phosphor after it. */
export const CURSOR: readonly (readonly [number, number])[] = CURSOR_BLINKS.map(([a, b]) => [a - partStart('intro') + RECALL, b - partStart('intro') + RECALL] as const);
/** S01's cursor tick on each blink: the one on outro 2.4 is the last sound of the film, and its first. */
export const TICKS: readonly number[] = CURSOR.map(([a]) => a);
/** Silence from here (the post-release tail is gated). */
export const SILENT = at(2, 4.5) + SIXTEENTH;

// ——— Camera energy and the character flash ———————————————————————————————————————————————————————————————————————————————————

/** The outro's camera energy (src/score/energy.ts): soft punches on the guest's table flip (outro 1.2; iteration 2: cute dumped moved onto 1.1,
 *  where a punch would shake the decode's in-place seam), the lost heartbeat and the last chord; no white, no shake. */
export const OUTRO_ACCENTS: readonly EnergyAccent[] = [
  { at: GUEST_EXIT, punch: 0.03 },
  { at: HEARTBEAT, punch: 0.02 },
  { at: OPEN, punch: 0.03 },
];

/** The outro's character flashes: none — the ending has no hard cut (the decode, the squeeze and the lens are continuous). */
export const OUTRO_GLYPHS: readonly GlyphFlash[] = [];

