// Events of the intro, the part 'intro' (5 bars; spec §7 S01–S04, §8 开机; the bars 1–14 design
// notes/b112/final.md §3.1–3.5, build sheet notes/b114/sheet.md). The picture
// (src/shots/intro.ts) and the music (scripts/audio/sections/intro.mjs) both read
// these lists, so every keystroke and hit lands on the same frame. Positions are
// intro-local (src/score/film.ts): `intro 3.2` is the intro's bar 3, beat 2.
//
//   intro 1  S01  the boot log (frames 0–47 are the loop seam: locked)
//   intro 2  S02R the RAIN bar (new): tilt up off the frozen log into kaomoji rain; the red scan misses his amber column; the crane down
//   intro 3  S02  the highway (v04 intro 2) + the dome + the rain sky
//   intro 4  S03  typing (v04 intro 3)
//   intro 5  S04  the ASCII face (v04 intro 4): the tube kick, the red band, T1
//
// The log has its own clock (logClock): it holds through the RAIN bar, so `logFrames` stay on it (= v04's frames) while every other
// list here is film frames.
import { COMMAND, DEFENDER_LINE, LOG_LINES, SCAN_LINE } from '../content/boot.ts';
import { partEnd, partFrame, partStart } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const EIGHTH = FRAMES_PER_BEAT / 2; // 12 frames
const SIXTEENTH = FRAMES_PER_BEAT / 4; // 6 frames
const THIRTY_SECOND = FRAMES_PER_BEAT / 8; // 3 frames

/** The intro's bar `bar` (1-based), plus `beat` beats (0-based). */
const intro = (bar: number, beat = 0): number => partFrame('intro', bar, beat);
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

/** T1 hands over to the Swiss world here: the intro's end (swiss 1.1). */
export const INTRO_END = partEnd('intro');
/** The harmony, one chord a bar (music bible §2; no tonic anywhere): IV B♭maj7 · Vsus C9sus4 · V C7 · iii Am7 · vi Dm7. */
export const INTRO_CHORDS = ['IV', 'Vsus', 'V', 'iii', 'vi'] as const;

// ——— intro 1 · S01 BOOT ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Lit spans of the cursor before the log starts: it blinks twice, on each beat for three sixteenths (then it fades like phosphor). */
export const CURSOR_BLINKS: readonly (readonly [number, number])[] = [
  [partStart('intro'), partStart('intro') + 3 * SIXTEENTH],
  [intro(1, 1), intro(1, 1) + 3 * SIXTEENTH],
];
/** The boot log starts on beat 3 of the intro's bar 1 (intro 1.3). */
export const LOG_START = intro(1, 2);
/** Lines in the burst that fills the screen, two per frame. */
export const BURST = 24;

/**
 * Frame on which each log line appears ON THE LOG'S CLOCK (logClock below; = the film frame up to intro 2.1, = v04's frame after
 * it): the title on beat 3, a burst of 24 lines at two per frame, then one line per 32nd note. A warning waits for the next beat, so it
 * lands with its own accent. Film frames: LOG_TICKS.
 */
export const logFrames: readonly number[] = (() => {
  const out: number[] = [];
  let f = LOG_START;
  LOG_LINES.forEach((line, i) => {
    if (i === 0) f = LOG_START;
    else if (i <= BURST) f = LOG_START + 1 + Math.floor((i - 1) / 2);
    else {
      f = i === BURST + 1 ? LOG_START + BURST / 2 + 3 : f + THIRTY_SECOND;
      if (line.kind === 'warn') f = Math.ceil(f / FRAMES_PER_BEAT) * FRAMES_PER_BEAT;
    }
    out.push(f);
  });
  return out;
})();

/** C1, the print head: the █ stays lit and runs along row 0 at the title's reveal front (48–51), then drops to the next free row on 51. */
export const PRINT_HEAD = { from: LOG_START, to: LOG_START + 3 } as const;
/** A1: `[ OK ] defender loaded (￣▽￣)` prints on 53 (the Defender's two dry C7 beeps) … */
export const DEFENDER_LOADED = logFrames[DEFENDER_LINE];
/** … and `[SCAN] kaomoji.exe ... queued` on 55; both read mid-frame on 74–95. */
export const SCAN_QUEUED = logFrames[SCAN_LINE];
/** S01's wind-up into the tilt (反向预备): the camera tips 2° (looks a hair lower) over the bar's last sixteenth, 90–95. */
export const WINDUP = { from: intro(2) - SIXTEENTH, to: intro(2) } as const;

// ——— intro 2 · S02R THE RAIN BAR (new) —————————————————————————————————————————————————————————————————————————————————————————

/** The RAIN bar: the log frozen (logClock), six walls of kaomoji rain, the red scan, the crane down onto the highway. */
export const RAIN = { from: intro(2), to: intro(3) } as const;
/** The tilt up: a launch on intro 2.1 (pitch −90° → 0°, 75 % by 99, settled by about 108; FOV 20 → 42 over 96–108). */
export const TILT = { from: intro(2), to: intro(2, 0.5) } as const;
/** The signature column (amber, wall 2): one byte of E2 80 A2 20 CF 89 20 E2 80 A2 per sixteenth from intro 2.1&; the last (A2) on 162. */
export const SIG_RAIN: readonly number[] = steps(intro(2, 0.5), intro(2, 0.5) + 10 * SIXTEENTH, SIXTEENTH);
/** The 8 face columns spawn two per eighth (walls 1–2, slow class, rotated 90° CW). */
export const RAIN_FACE_SPAWNS: readonly number[] = [intro(2, 0.5), intro(2, 1), intro(2, 1.5), intro(2, 2)];
/** Beat waves: 8 new white heads per wall spawn together (a visible rank) on intro 2.2, and again under the scan on 2.3. */
export const RAIN_WAVES: readonly number[] = [intro(2, 1), intro(2, 2)];
/** Drips (the music): an FM blip on every sixteenth of the RAIN bar (96 … 186); a 3-note cluster on the first wave. */
export const DRIPS: readonly number[] = steps(intro(2), intro(3), SIXTEENTH);
/** THE SCAN: the red plane sweeps z 2600 → 0 over intro 2.3 → 2.3&; every glyph it crosses flashes red for 3 frames but his amber column. */
export const SCAN_RAIN = { from: intro(2, 2), to: intro(2, 2.5) } as const;
/** The HUD (readout slot): `[SCAN] kaomoji.exe` types over 144–149, and its 8 ▓ cells fill on the 32nds 144 … 165 (a dry tick each). */
export const SCAN_HUD_TYPE = { from: intro(2, 2), to: intro(2, 2) + SIXTEENTH } as const;
export const SCAN_HUD_CELLS: readonly number[] = steps(intro(2, 2), intro(2, 3), THIRTY_SECOND);
/** The plane lands on the floor: the log rows take a faint red sheen for 3 frames. */
export const SCAN_SHEEN = { from: SCAN_RAIN.to, to: SCAN_RAIN.to + 3 } as const;
/** `· 0 threats ✓` appends a beat late (✓ red; the readout brightens ×2, τ 3) with the two dry C7 beeps; the crane starts. */
export const ZERO_RAIN = intro(2, 3);
/** The readout fades out over 180–190. */
export const RAIN_HUD_FADE = { from: intro(2, 3.5), to: intro(3) - 2 } as const;
/** The crane: an impact into intro 3.1, landing exactly on the highway's pose (height 1178 → 110, pitch 0 → −8°, FOV 42 → 55; the CRT's curvature 0.045 → 0.2 over it). */
export const CRANE = { from: ZERO_RAIN, to: intro(3) } as const;
/** The nearest columns hit the floor through the crane, each landing splashing its row cell (a 3-glyph splash, gone by 189); the face columns land 168–186. */
export const RAIN_LAND = { from: ZERO_RAIN, to: intro(3) - SIXTEENTH } as const;
/** Walls 1–2 fade out over 176–191 (walls 3–6 recede into the highway's sky). */
export const RAIN_NEAR_OUT = { from: ZERO_RAIN + 8, to: intro(3) } as const;
/** Where the RAIN bar needs 64 sub-frames (the tilt's launch and the crane's landing; 32 elsewhere), with the terminal's phosphor persistence. */
export const RAIN_DENSE: readonly (readonly [number, number])[] = [
  [intro(2) - 1, TILT.to + 2],
  [CRANE.from - 2, CRANE.to],
];
/** The music's marks in the RAIN bar: the tilt whoosh peaks on 98, the signature's F6 bell on its last byte (162), the crane whoosh peaks on 190. */
export const TILT_PEAK = intro(2) + 2;
export const SIG_BELL = intro(2, 0.5) + 9 * SIXTEENTH;
export const CRANE_PEAK = intro(3) - 2;
/** The Defender's two dry C7 beeps (music bible M8): it loads (53), the rain's scan finds nothing (168); the SCAN bar's (810) are src/score/build.ts ZERO_THREATS. */
export const DEFENDER_BEEPS: readonly number[] = [...(DEFENDER_LINE >= 0 ? [logFrames[DEFENDER_LINE]] : []), ZERO_RAIN];

// ——— The log's clock ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The last instant the log runs before the RAIN bar: frame 95, which the page holds through intro 2. */
const LOG_HOLD = RAIN.from - 1;
/**
 * The log page's own clock at film instant `frame`: the frame itself in intro 1, held at 95 from there through the RAIN bar (no line,
 * scroll, cursor blink or log tick in 96–191), then running on from intro 3.1 as v04's intro 2.1 (192 → 96). logFrames, the scroll
 * and the cursor read it; everything else in the intro is film frames.
 */
export const logClock = (frame: number): number => (frame < LOG_HOLD ? frame : frame < RAIN.to ? LOG_HOLD : frame - (RAIN.to - RAIN.from));
/** A log-clock instant on the film (the inverse of logClock outside the hold): instants after the hold move past the RAIN bar. */
export const logToFilm = (clock: number): number => (clock <= LOG_HOLD ? clock : clock + (RAIN.to - RAIN.from));
/** Film frames of the log lines (their ticks in the music): none in the RAIN bar. */
export const LOG_TICKS: readonly number[] = logFrames.map(logToFilm);

// ——— intro 3 · S02 HIGHWAY (v04 intro 2) ———————————————————————————————————————————————————————————————————————————————————————

/** The crane lands on the highway (intro 3.1): v04's 96. */
export const HIGHWAY_START = intro(3);
/** @deprecated the old name of HIGHWAY_START (src/shots/intro.ts still reads it): there is no hard cut S01 → S02 any more. */
export const CUT_S02 = HIGHWAY_START;
/** The dome: the log plane bulges up to 140 units around the camera's line of sight, launching 0 → 1 over 192–200 … */
export const DOME_RISE = { from: HIGHWAY_START, to: HIGHWAY_START + 8 } as const;
/** Progress bar steps: one per eighth note of intro bar 3; the last one reaches 100%. */
export const PROGRESS_STEPS: readonly number[] = Array.from({ length: 8 }, (_, i) => HIGHWAY_START + i * EIGHTH);
/** Whip from the tilted terminal back to the front: a launch on the last eighth of intro bar 3, landed by intro 4.1. */
export const WHIP = { from: intro(4) - EIGHTH, to: intro(4) } as const;
/** … and eases 1 → 0 over the whip, while the rain sky's alpha goes to 0 over its first 6 frames. */
export const DOME_FALL = WHIP;
export const RAIN_SKY_OUT = { from: WHIP.from, to: WHIP.from + SIXTEENTH } as const;
/** The prompt appears below the progress bar as the whip starts. */
export const PROMPT_FRAME = WHIP.from;

// ——— intro 4 · S03 TYPING (v04 intro 3) ————————————————————————————————————————————————————————————————————————————————————————

/** One keystroke per character of COMMAND: each word is a burst of 32nd notes starting on a beat of intro bar 4. */
export const typeFrames: readonly number[] = COMMAND.split(/(?= )/).flatMap((word, beat) => [...word].map((_, j) => intro(4, beat) + j * THIRTY_SECOND));
/** One dim line more in the log on each eighth note of intro bar 4: daemons chattering behind the command (film frames; logClock − 96 on the page's clock). */
export const TICKER_FRAMES: readonly number[] = Array.from({ length: 8 }, (_, i) => intro(4) + i * EIGHTH);
/** Enter, on the last eighth note of intro bar 4 (intro 4.4&). */
export const ENTER_FRAME = intro(5) - EIGHTH;

// ——— intro 5 · S04 ASCII FACE + T1 (v04 intro 4) ———————————————————————————————————————————————————————————————————————————————

/** The characters leave the screen (intro 5.1). */
export const LAUNCH = intro(5);
/** The face locks into place (intro 5.3): the lock white, and the tube kick (curvature spike 0.12, τ 4, bounce 0.6; the CRT thunk). */
export const LOCK = intro(5, 2);
export const TUBE_KICK = LOCK;
/** The glyphs are flung off the screen on the launch and land in a cloud on the next eighth … */
export const FLING = { from: LAUNCH, to: LAUNCH + EIGHTH } as const;
/** … and slam into the face from the eighth before the lock, landing on it. */
export const SLAM = { from: LOCK - EIGHTH, to: LOCK } as const;
/** The antivirus looks (intro 5.3&): a DEFENDER-red refresh band rolls top → bottom over 444–456 (the "look", a dry C6). */
export const LOOK = intro(5, 2.5);
export const RED_BAND = { from: LOOK, to: LOOK + EIGHTH } as const;
/** The white once-a-bar CRT band is off from the lock to the push. */
export const WHITE_BAND_OFF = { from: LOCK, to: intro(5, 3.5) } as const;
/** The tube kick's scanlines and grille ramp in over the lock's first 6 frames (src/content/boot.ts TUBE) … */
export const TUBE_RAMP = { from: LOCK, to: LOCK + SIXTEENTH } as const;
/** … and the tube goes back to the terminal's 0.045 with the CRT's fade on the push (468–478), so T1 lands on v04's frame. */
export const TUBE_FADE = { from: intro(5, 3.5), to: INTRO_END - 2 } as const;
/** Blink on beat 4 (intro 5.4): the eyes close, stay shut, then open. */
export const BLINK = { close: intro(5, 3), shut: intro(5, 3) + 4, open: intro(5, 3) + 6, done: intro(5, 3) + 12 } as const;
/** Push into the right eye: the last eighth of intro bar 5 (intro 5.4&), landing on the intro's end (swiss 1.1). */
export const PUSH = { from: intro(5, 3.5), to: INTRO_END } as const;
/** The riser under the blink and the push. */
export const RISE = { from: intro(5, 3), to: INTRO_END } as const;
/** The eye's centre glyph turns into a circle and then into Swiss red. */
export const MORPH = { from: intro(5, 3) + 6, to: intro(5, 3) + 20 } as const;

/** The sub pulses (music): C2 swelling under the tilt (Vsus), C2 (V), A1 (iii), D2 (vi) on the downbeats of intro 2–5 (MIDI notes). */
export const SUB_PULSES: readonly { at: number; midi: number }[] = [
  { at: intro(2), midi: 36 },
  { at: intro(3), midi: 36 },
  { at: intro(4), midi: 33 },
  { at: intro(5), midi: 38 },
];
