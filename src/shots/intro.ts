// Shots S01, S02R (the RAIN bar), S02–S04 and the first half of T1 (the part 'intro', 5 bars) as pure functions of the frame: camera,
// finishing, sampling and the state of every glyph. The scene (src/scenes/intro.ts) copies this state into its GlyphFields each
// sub-frame. Positions are intro-local (src/score/film.ts). The RAIN bar's walls, scan and readout are src/shots/introRain.ts.
//
// Bars 1–14 (build sheet notes/b114/sheet.md §3.1–3.5, W1): what v04 approved stays frame for frame and the new work is added on
// top (the story bible's 先保留、再加). The log runs on its own clock (logClock: held through the RAIN bar), so the highway, the typing
// and the fling draw v04's log; the face's random draws are keyed to seedFrame, so S04 and T1 draw v04's noise a bar later; the atlas
// keeps v04's character order. Every addition sits behind its INTRO_THREADS flag (src/content/boot.ts).
import { type FaceCell, RAMP } from '../actors/asciiFace.ts';
import { COMMAND, CURSOR, DECODE, INTRO_THREADS, LOG_LINES, LOOK_BAND, type LogLine, PROMPT, RAIN_CAMERA, TICKER, TUBE, V04_INTRO_TEXTS, progressText } from '../content/boot.ts';
import { type Pose, fillDistance, mixPose, visibleHeight } from '../engine/camera.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { clamp, ease, lerp, prog, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import { type Segment, type Temporal, withDensity } from '../engine/temporal.ts';
import { cellWidth, layoutLines } from '../engine/textGrid.ts';
import type { Look } from '../engine/types.ts';
import { type Aim, type AimMove, RING, aimMoves, aimPose, composeAim, flash, flowAim, launch, slam, strike, within } from '../motion/hit.ts';
import { partFrame, partStart, seedFrame } from '../score/film.ts';
import {
  BLINK,
  CRANE,
  CURSOR_BLINKS,
  DOME_FALL,
  DOME_RISE,
  ENTER_FRAME,
  FLING,
  HIGHWAY_START,
  INTRO_END,
  LAUNCH,
  LOCK,
  LOG_START,
  MORPH,
  PRINT_HEAD,
  PROGRESS_STEPS,
  PROMPT_FRAME,
  PUSH,
  RAIN,
  RED_BAND,
  SLAM,
  TICKER_FRAMES,
  TUBE_FADE,
  TUBE_KICK,
  TUBE_RAMP,
  WHIP,
  WHITE_BAND_OFF,
  WINDUP as S01_WINDUP,
  logClock,
  logFrames,
  typeFrames,
} from '../score/intro.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { SWISS_RED } from '../worlds/swiss.ts';
import { INK, TERM, TERMINAL_CURVATURE, cellCenter, terminalLook } from '../worlds/terminal.ts';
import { DEFENDER_INK, type Euler, RAIN_ATLAS, RAIN_KEYS, eulerPose, poseEuler, rainCamera } from './introRain.ts';

export const FOV = 20;
/** The frontal camera sees exactly the 1920×1080 text plane. */
export const FRONT_DISTANCE = fillDistance(1080, FOV);
const LOG_ROWS = 28;
const PROGRESS_ROW = 28;
/** Terminal row of the command prompt (the cursor drops one row below it on Enter). */
export const PROMPT_ROW = 30;
/** Frames for a new line to sweep in from left to right. */
const REVEAL = 3;
const PROMPT_Y = cellCenter(0, PROMPT_ROW)[1];
const PROGRESS_Y = cellCenter(0, PROGRESS_ROW)[1];

/** Brightness of the screen glass: it warms up over the intro's first 8 frames and fades out as the red circle takes over, so the disc lands on exactly Swiss red. */
export const screenPower = (frame: number): number =>
  Math.min(1, Math.max(0.15, (frame - partStart('intro')) / 8)) * (1 - prog(frame, PUSH.from + 2, PUSH.to - 4, ease.inCubic));

/** The giant face of S04: `(•ω•)` shaded as ASCII art on a finer grid than the terminal (square raster pixels: 9.6/4 = 19.2/8). */
export const FACE = { text: '(•ω•)', cols: 176, rows: 38, cellW: 9.6, cellH: 19.2, fontPx: 16, subX: 4, subY: 8, y: 16 } as const;
/** Diameter of the circle a glyph morphs into, in ems (the GlyphField is built with the same value). */
export const CIRCLE_PER_EM = 1.25;
/** Camera distance at the intro's end (swiss 1.1): the eye's circle then covers the frame diagonal with 5% to spare. */
export const PUSH_END_DISTANCE = (0.95 * FACE.fontPx * CIRCLE_PER_EM) / (visibleHeight(1, FOV) * Math.hypot(1, 16 / 9));
export const INTRO_CAPACITY = 8192;

/**
 * Every string the intro's atlas holds (the scene builds it from these, in this order). v04's characters come first in v04's order —
 * its log and ticker as v04 printed them (src/content/boot.ts V04_INTRO_TEXTS), the progress bar, the command, the cursor, the decode
 * flicker, the face's ramp — so each keeps its atlas slot and every glyph v04 drew draws to the bit (the identity gates of build sheet
 * §9); the new characters follow (the Defender's lines, the infected flip's ω, the ticker's new digits, the rain, its readout), then
 * the signature's bytes as whole keys.
 */
export const INTRO_GLYPHS: readonly string[] = [
  ...[
    ...new Set(
      [
        ...V04_INTRO_TEXTS,
        ...Array.from({ length: 9 }, (_, s) => progressText(s)),
        PROMPT,
        COMMAND,
        CURSOR,
        DECODE,
        RAMP,
        '-',
        ...LOG_LINES.map((l) => l.text),
        ...TICKER.map((l) => l.text),
        ...RAIN_ATLAS,
      ].join(''),
    ),
  ].filter((c) => c !== ' '),
  ...RAIN_KEYS,
];
const DECODE_CHARS = [...DECODE];

type LogCell = { ch: string; line: number; col: number; width: number; appear: number; ink: RGB };
type Source = { ch: string; x: number; y: number; size: number; ink: RGB };
/** A face cell and the glyph that flies to it: from `source`, via `cloud` (where it hangs between the burst and the slam, flung towards the camera), turning `spin` on the way. */
export type Target = { x: number; y: number; ch: string; ink: RGB; part: number; source: number; cloud: [number, number, number]; spin: number };
export type IntroLayout = {
  log: LogCell[];
  /** What is on screen just before the launch. */
  sources: Source[];
  /** One per face cell, in face order. */
  targets: Target[];
  /** Sources no face cell uses; they fly off the top. */
  leftovers: number[];
  /** Centre y of the left and the right eye. */
  eyes: [number, number];
  /** Position of the right eye's centre glyph: the zoom target. */
  eye: [number, number];
  eyeTarget: number;
};

/** A brightness boost that jumps to 1 + k on `at` and decays with time constant `tau`. */
const glow = (frame: number, at: number, k: number, tau: number): number => (frame >= at ? 1 + k * Math.exp(-(frame - at) / tau) : 1);

/** DEFENDER red on the terminal (`linear('#E8402B', 1.7)`): the antivirus's runs in the log, its band (src/shots/introRain.ts DEFENDER_INK). */
export const LOG_RED: RGB = DEFENDER_INK;

/** The ink of character `index` of a log line: its own runs first (the Defender's red), then the kaomoji accent, then the kind's colours. */
export function lineInk(line: LogLine, index: number): RGB {
  for (const run of line.inks ?? []) if (index >= run.from && index < run.to) return LOG_RED;
  if (line.accent !== undefined && index >= line.accent) return INK.pink;
  if (line.kind === 'title') return INK.amber;
  if (line.kind === 'dim') return INK.dim;
  if (line.kind === 'warn') return INK.amber;
  return index < 6 ? INK.green : INK.text;
}

/**
 * The log's lines and when each appears, ON THE LOG'S CLOCK (src/score/intro.ts logClock: the film frame in intro 1, held on 95 through
 * the RAIN bar, v04's frame from intro 3.1 on): the boot log, then the daemons' ticker under the typing (its film frames moved onto the
 * clock, so each prints on v04's frame).
 */
const LOG: readonly { line: LogLine; at: number }[] = [...LOG_LINES.map((line, i) => ({ line, at: logFrames[i] })), ...TICKER.map((line, i) => ({ line, at: logClock(TICKER_FRAMES[i]) }))];

function logCells(): LogCell[] {
  const cells: LogCell[] = [];
  LOG.forEach(({ line, at }, i) => {
    const chars = [...line.text];
    let col = 0;
    chars.forEach((ch, j) => {
      const width = cellWidth(ch);
      if (ch !== ' ') cells.push({ ch, line: i, col, width, appear: at + (REVEAL * j) / chars.length, ink: lineInk(line, j) });
      col += width;
    });
  });
  return cells;
}

/** Rows the log has scrolled at film instant `frame`: 0 until 28 lines are out, then one row per new line, eased over 2 frames (on the log's clock). */
export function scrollAt(frame: number): number {
  const clock = logClock(frame);
  let lines = 0;
  for (const { at } of LOG) lines += smoothstep(at, at + 2, clock);
  return Math.max(0, lines - LOG_ROWS);
}

/** How fast the cursor's phosphor fades once a blink is over (frames to 1/e). */
export const PHOSPHOR = 4;

/** Cells of the title row (the print head C1 runs along it at the reveal front). */
const TITLE_COLS = [...LOG_LINES[0].text].reduce((n, ch) => n + cellWidth(ch), 0);

/**
 * The cursor's cell and brightness at `frame`, or null. Before the log it blinks twice on black, each blink fading out like phosphor
 * rather than cutting off. C1, the print head: on intro 1.3 it runs along row 0 at the title's reveal front, so the title comes out of
 * the cursor, and on 51 it drops to column 0 of the next free row. It stays with the log until the tilt (the page freezes for the RAIN
 * bar, cursor and all, and the highway has none: v04's).
 */
function cursorAt(frame: number): { cell: [number, number]; level: number } | null {
  if (frame < LOG_START) {
    let level = 0;
    for (const [a, b] of CURSOR_BLINKS) if (frame >= a) level = frame < b ? 1 : Math.exp(-(frame - b) / PHOSPHOR);
    return level > 0 ? { cell: [0, 0], level } : null;
  }
  if (frame < PRINT_HEAD.to) return { cell: [(TITLE_COLS * (frame - PRINT_HEAD.from)) / (PRINT_HEAD.to - PRINT_HEAD.from), 0], level: 1 };
  if (frame < RAIN.from) return { cell: [0, logFrames.filter((f) => f <= frame).length - scrollAt(frame)], level: 1 };
  if (frame < PROMPT_FRAME) return null;
  if (frame >= ENTER_FRAME) return { cell: [0, PROMPT_ROW + 1], level: 1 };
  const typed = typeFrames.filter((f) => f <= frame).length;
  const idle = typed === typeFrames.length ? frame - typeFrames[typed - 1] : 0;
  return Math.floor(idle / 6) % 2 === 0 ? { cell: [PROMPT.length + typed, PROMPT_ROW], level: 1 } : null;
}

// ——— The dome ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** How much the crest heaves on each beat of the highway (with its forward surge): up fast over 2 frames, settling τ 8. */
export const DOME_HEAVE = 0.35;
const heave = (frame: number): number => {
  const t = (frame - DOME_RISE.from) % FRAMES_PER_BEAT;
  return frame < DOME_RISE.from + FRAMES_PER_BEAT ? 0 : smoothstep(0, 2, t) * Math.exp(-t / 8);
};

/**
 * How far the dome is up at `frame`: launching 0 → 1 on intro 3.1 (τ 3), heaving on every beat after it (the page breathes with the
 * kick and the camera's surge), easing back to 0 through the whip; 0 with `dome` off.
 */
export function domeAt(frame: number): number {
  if (!INTRO_THREADS.dome || frame < DOME_RISE.from || frame >= DOME_FALL.to) return 0;
  return clamp(launch(frame, DOME_RISE.from, { tau: 3, bounce: 0 })) * (1 + DOME_HEAVE * heave(frame)) * (1 - prog(frame, DOME_FALL.from, DOME_FALL.to, ease.inOutSine));
}

/**
 * The dome's shape (world units): its crest 750 ahead of the highway camera, 70 high (heaving to 95 on the beats, below the camera's
 * 110, so no row is ever seen edge-on or from below), σ 420 along the flight and 500 across it. The rows rise toward the camera into a
 * crest and the far ones tuck behind it, the columns bowing over it. Not the design prose's 140 / 700 / 900 (src/content/boot.ts DOME):
 * that bump is 90 % up under the camera itself, so it lifts the near rows and the progress bar to the camera's own height and the page
 * leaves the frame (230 showed an empty floor; its fallback amplitude 90 fails the same way); nor the prototype's 90 / 950 / 500, whose
 * crest sits in the fog and barely reads. The progress bar stays on the page (≤ 30 up).
 */
export const DOME_SHAPE = { amp: 70, ahead: 750, sigma: 420, across: 0.7 } as const;

/**
 * The dome's lift of the log plane at `frame`, as a function of (x, y), or null while it is down: the page bulges up round
 * the flight path, its crest DOME_SHAPE.ahead in front of the highway camera, so the receding text columns rise to a crest and fall — they curve.
 */
export function domeLift(frame: number): ((x: number, y: number) => number) | null {
  const b = domeAt(frame);
  if (b === 0) return null;
  const cam = highway(Math.min(frame, WHIP.from)).position;
  const cx = cam[0];
  const cy = cam[1] + DOME_SHAPE.ahead;
  const k = DOME_SHAPE.amp * b;
  const s2 = DOME_SHAPE.sigma * DOME_SHAPE.sigma;
  return (x, y) => k * Math.exp(-(DOME_SHAPE.across * (x - cx) * (x - cx) + (y - cy) * (y - cy)) / s2);
}

function terminalGlyphs(frame: number, log: readonly LogCell[], out: Glyph[]): number {
  let n = 0;
  const clock = logClock(frame);
  const scroll = scrollAt(frame);
  const lift = domeLift(frame);
  for (const c of log) {
    if (clock < c.appear) continue;
    const row = c.line - scroll;
    if (row < -70 || row > LOG_ROWS + 0.5) continue;
    const [x, y] = cellCenter(c.col, row, c.width);
    const entering = row > LOG_ROWS - 0.5 ? clamp(LOG_ROWS + 0.5 - row) : 1;
    const g: Glyph = { ch: c.ch, x, y, size: TERM.fontPx, color: scaleRGB(c.ink, glow(clock, c.appear, 1.6, 4)), alpha: smoothstep(c.appear, c.appear + 1, clock) * entering };
    if (lift) g.z = lift(x, y);
    out[n++] = g;
  }
  if (frame >= PROGRESS_STEPS[0]) {
    const step = PROGRESS_STEPS.filter((f) => f <= frame).length;
    const pulse = glow(frame, PROGRESS_STEPS[step - 1], 1.4, 4);
    for (const c of layoutLines([progressText(step)])) {
      if (c.ch === ' ') continue;
      const [x, y] = cellCenter(c.col, PROGRESS_ROW, c.width);
      const bar = '█▉▊▋▌▍▎▏'.includes(c.ch);
      const ink = bar ? INK.green : c.ch === '✧' ? INK.pink : /[0-9%]/.test(c.ch) ? INK.amber : INK.text;
      const g: Glyph = { ch: c.ch, x, y, size: TERM.fontPx, color: scaleRGB(ink, bar || ink === INK.amber ? pulse : 1) };
      if (lift) g.z = lift(x, y);
      out[n++] = g;
    }
  }
  if (frame >= PROMPT_FRAME) {
    const typed = typeFrames.filter((f) => f <= frame).length;
    const enter = glow(frame, ENTER_FRAME, 2, 5);
    for (const c of layoutLines([PROMPT + COMMAND.slice(0, typed)])) {
      if (c.ch === ' ') continue;
      const [x, y] = cellCenter(c.col, PROMPT_ROW, c.width);
      const k = c.col - PROMPT.length;
      const at = k >= 0 ? typeFrames[k] : PROMPT_FRAME;
      const pop = k >= 0 ? 1 + 0.35 * Math.exp(-(frame - at) / 3) : 1;
      const g: Glyph = { ch: c.ch, x, y, size: TERM.fontPx * pop, color: scaleRGB(k >= 0 ? INK.text : INK.green, glow(frame, at, 1.8, 4) * enter) };
      if (lift) g.z = lift(x, y);
      out[n++] = g;
    }
  }
  const cursor = cursorAt(frame);
  if (cursor) {
    const [x, y] = cellCenter(cursor.cell[0], cursor.cell[1]);
    out[n++] = { ch: CURSOR, x, y, size: TERM.fontPx, color: scaleRGB(INK.green, 1.1 * cursor.level) };
  }
  return n;
}

const faceXY = (col: number, row: number): [number, number] => [(col - FACE.cols / 2 + 0.5) * FACE.cellW, FACE.y + (FACE.rows / 2 - row - 0.5) * FACE.cellH];

function faceInk(c: FaceCell, k: number): RGB {
  const eye = c.part === 1 || c.part === 3;
  const base = eye
    ? mixRGB(INK.text, linear('#ffffff', 2.2), c.lum)
    : c.part === 2
      ? mixRGB(scaleRGB(INK.pink, 0.45), INK.pink, c.lum)
      : mixRGB(scaleRGB(INK.green, 0.3), mixRGB(INK.green, INK.text, 0.35), c.lum);
  return scaleRGB(base, 0.9 + 0.2 * hash(k, 5));
}

/**
 * Pairs what is on screen just before the launch with the cells of the face.
 * Both are sorted left to right and matched in order, so the characters flow
 * sideways instead of crossing; when the face has more cells than there are
 * characters, some characters split into several.
 */
export function buildIntroLayout(face: readonly FaceCell[]): IntroLayout {
  const log = logCells();
  const before: Glyph[] = [];
  const count = terminalGlyphs(LAUNCH - 1e-3, log, before);
  const sources: Source[] = before
    .slice(0, count)
    .filter((g) => Math.abs(g.x) <= 980 && Math.abs(g.y) <= 560 && (g.alpha ?? 1) > 0.5)
    .map((g) => ({ ch: g.ch, x: g.x, y: g.y, size: g.size, ink: g.color }));
  const byX = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x - b.x || a.y - b.y;
  const srcOrder = sources.map((_, i) => i).sort((a, b) => byX(sources[a], sources[b]));
  const cells = face.map((c) => ({ c, xy: faceXY(c.col, c.row) })).sort((a, b) => byX({ x: a.xy[0], y: a.xy[1] }, { x: b.xy[0], y: b.xy[1] }));
  const used = new Set<number>();
  const targets: Target[] = cells.map(({ c, xy }, k) => {
    const source = srcOrder[Math.min(srcOrder.length - 1, Math.floor((k * srcOrder.length) / cells.length))];
    used.add(source);
    return {
      x: xy[0],
      y: xy[1],
      ch: c.ch,
      ink: faceInk(c, k),
      part: c.part,
      source,
      cloud: [
        lerp(sources[source].x, xy[0], 0.35) + (hash(k, 21) - 0.5) * 520,
        lerp(sources[source].y, xy[1], 0.35) + (hash(k, 22) - 0.5) * 380,
        300 + 1100 * hash(k, 23),
      ],
      spin: (hash(k, 4) - 0.5) * 2 * Math.PI,
    };
  });
  const leftovers = sources.map((_, i) => i).filter((i) => !used.has(i));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const eyeY = (part: number) => mean(targets.filter((t) => t.part === part).map((t) => t.y));
  const right = targets.filter((t) => t.part === 3);
  const cx = mean(right.map((t) => t.x));
  const cy = eyeY(3);
  let eyeTarget = -1;
  let best = Infinity;
  targets.forEach((t, k) => {
    const d = Math.hypot(t.x - cx, t.y - cy);
    if (t.part === 3 && d < best) {
      best = d;
      eyeTarget = k;
    }
  });
  if (eyeTarget < 0) throw new Error('the face has no right eye (part 3)');
  return { log, sources, targets, leftovers, eyes: [eyeY(1), eyeY(3)], eye: [targets[eyeTarget].x, targets[eyeTarget].y], eyeTarget };
}

/** Vertical scale of the eyes during the blink: 1 open, 0.06 shut, with a little overshoot on opening. */
export function blinkSquash(frame: number): number {
  if (frame < BLINK.close || frame >= BLINK.done) return 1;
  if (frame < BLINK.shut) return lerp(1, 0.06, prog(frame, BLINK.close, BLINK.shut, ease.inCubic));
  if (frame < BLINK.open) return 0.06;
  return lerp(0.06, 1, prog(frame, BLINK.open, BLINK.done, ease.outBack));
}

// ——— The antivirus looks (intro 5.3&) ———————————————————————————————————————————————————————————————————————————————————————————

/** The red refresh band's centre at `frame`, in screen px from the frame's top (it enters above the frame and leaves below it). */
const bandY = (frame: number): number => -LOOK_BAND.px / 2 + ((1080 + LOOK_BAND.px) * (frame - RED_BAND.from)) / (RED_BAND.to - RED_BAND.from);

/**
 * The DEFENDER-red band (intro 5.3&, `redBand`): where it is (screen px from the top, its centre) and how strong, or null. It rolls top →
 * bottom over 444–456, LOOK_BAND.px tall at LOOK_BAND.alpha additive; the scene draws it on the tube, under the CRT.
 */
export function redBandAt(frame: number): { y: number; alpha: number } | null {
  if (!INTRO_THREADS.redBand || frame < RED_BAND.from || frame >= RED_BAND.to) return null;
  return { y: bandY(frame), alpha: LOOK_BAND.alpha };
}

/**
 * How far a face cell at screen y (px from the top) mixes toward red at `frame`: LOOK_BAND.mix while the band has crossed it within its
 * last LOOK_BAND.frames frames. Over by intro 5.4 (456), so T1's frames are v04's.
 */
export function bandMix(frame: number, screenY: number): number {
  if (!INTRO_THREADS.redBand || frame < RED_BAND.from || frame >= RED_BAND.to) return 0;
  const now = bandY(frame);
  const before = bandY(Math.max(RED_BAND.from, frame - LOOK_BAND.frames));
  return screenY > before - LOOK_BAND.reach && screenY < now + LOOK_BAND.reach ? LOOK_BAND.mix : 0;
}

/** The tear under the band: the face rows it reads slip sideways, a horizontal-sync tear (world units, re-rolled a frame). */
export const BAND_TEAR = 9;
const tear = (frame: number, screenY: number): number => {
  if (!INTRO_THREADS.redBand || frame < RED_BAND.from || frame >= RED_BAND.to) return 0;
  const d = Math.abs(screenY - bandY(frame));
  if (d > LOOK_BAND.px / 2) return 0;
  return BAND_TEAR * (1 - d / (LOOK_BAND.px / 2)) * (2 * hash(Math.floor(screenY / 12), Math.floor(frame), 31) - 1);
};

/** Writes every glyph of the intro at `frame` into `out` and returns how many there are (the RAIN bar's walls are src/shots/introRain.ts). */
export function introGlyphs(frame: number, L: IntroLayout, out: Glyph[]): number {
  if (frame < LAUNCH) return terminalGlyphs(frame, L.log, out);
  let n = 0;
  // The launch flings the glyphs into a cloud (a launch on the downbeat); the cloud keeps turning and bobbing (a living hold);
  // on the lock they slam into the face (an impact on beat 3), which then breathes until the push.
  const fling = launch(frame, FLING.from, { tau: 3 });
  const lock = slam(frame, SLAM.to, SLAM.to - SLAM.from);
  const up = clamp(fling) * (1 - clamp(lock));
  const glowOnLock = 1.3 * flash(frame, LOCK);
  const squash = blinkSquash(frame);
  const others = 1 - prog(frame, PUSH.from + 2, PUSH.to - 4, ease.inCubic);
  // The flicker's draws on v04's clock (seedFrame: S04 sits a bar later than in v04, and draws v04's noise there).
  const seed = seedFrame(frame);
  const tick = Math.floor(seed / 4);
  const turn = (CLOUD_TURN * Math.max(0, frame - FLING.from)) / 24;
  const breathe = 1 + 0.012 * Math.sin((2 * Math.PI * (frame - LOCK)) / FRAMES_PER_BAR) * clamp((frame - LOCK) / 12) * (1 - smoothstep(PUSH.from - 12, PUSH.from, frame));
  // The red band reads the face where it crosses it (screen y through the face camera).
  const looking = INTRO_THREADS.redBand && frame >= RED_BAND.from && frame < RED_BAND.to;
  const pose = looking ? introCamera(frame, L.eye) : null;
  const screenY = (x: number, y: number): number => {
    const p = pose!;
    const k = 1080 / visibleHeight(p.position[2] - p.target[2], p.fov);
    return 540 - ((x - p.target[0]) * p.up[0] + (y - p.target[1]) * p.up[1]) * k;
  };
  L.targets.forEach((t, k) => {
    const s = L.sources[t.source];
    // The cloud turns about the face's centre and each glyph bobs, so the hang is never still.
    const cx = t.cloud[0] * Math.cos(turn) - (t.cloud[1] - FACE.y) * Math.sin(turn);
    const cy = FACE.y + t.cloud[0] * Math.sin(turn) + (t.cloud[1] - FACE.y) * Math.cos(turn) + 6 * Math.sin((2 * Math.PI * frame) / 24 + 7 * t.spin);
    const tx = t.x * breathe;
    const ty = FACE.y + (t.y - FACE.y) * breathe;
    let x = lerp(lerp(s.x, cx, fling), tx, lock);
    let y = lerp(lerp(s.y, cy, fling), ty, lock);
    const z = lerp(t.cloud[2] * fling, 0, lock);
    let ch = frame < LAUNCH + 1 ? s.ch : frame < SLAM.to - 2 ? DECODE_CHARS[Math.floor(hash(k, Math.floor(seed / 2)) * DECODE_CHARS.length)] : t.ch;
    // Once settled, one cell in twenty shimmers to a neighbouring shade every 4 frames (secondary motion).
    if (frame >= LOCK + RING && hash(k, tick, 9) < 0.05) ch = RAMP[clamp(RAMP.indexOf(t.ch) + (hash(k, tick, 8) < 0.5 ? -1 : 1), 1, RAMP.length - 1)];
    if ((t.part === 1 || t.part === 3) && squash !== 1) {
      const eyeY = FACE.y + (L.eyes[t.part === 1 ? 0 : 1] - FACE.y) * breathe;
      y = eyeY + (y - eyeY) * squash;
      if (squash < 0.4) ch = '-';
    }
    let color = scaleRGB(mixRGB(s.ink, t.ink, clamp(lock)), 1 + glowOnLock);
    if (looking) {
      const sy = screenY(x, y);
      const m = bandMix(frame, sy);
      if (m > 0) color = mixRGB(color, LOG_RED, m);
      x += tear(frame, sy);
    }
    let morph = 0;
    let alpha = others;
    if (k === L.eyeTarget) {
      morph = prog(frame, MORPH.from, MORPH.to, ease.inOutCubic);
      color = mixRGB(color, SWISS_RED, prog(frame, MORPH.from + 2, MORPH.to + 2, ease.inOutSine));
      if (morph > 0) ch = t.ch;
      alpha = 1;
    }
    out[n++] = { ch, x, y, z, size: lerp(s.size, FACE.fontPx, clamp(lock)) * (1 + 0.3 * up) * breathe, color, alpha, morph, rot: up * t.spin };
  });
  // Characters no face cell uses fly out of the frame in the launch.
  const q = clamp(launch(frame, FLING.from, { tau: 3, bounce: 0 }));
  if (q < 1) {
    for (const i of L.leftovers) {
      const s = L.sources[i];
      const d = Math.hypot(s.x, s.y) || 1;
      out[n++] = { ch: s.ch, x: s.x + (s.x / d) * 1500 * q, y: s.y + (s.y / d) * 1500 * q, z: 600 * q, size: s.size, color: s.ink, alpha: 1 - q };
    }
  }
  return n;
}

/** x of the highway's centre line: between the progress bar (x ≈ −876…−414) and the middle of the log column (text runs to x ≈ −300). */
export const HIGHWAY_X = -620;
/** How much the glyph cloud turns a beat while it hangs (radians). */
const CLOUD_TURN = 0.02;

/** Centre of the cursor's cell (0, 0): S01 opens 16× closer on it. */
const CURSOR_XY = cellCenter(0, 0);
const S01_START: Aim = { zoom: 16, x: CURSOR_XY[0], y: CURSOR_XY[1], roll: 0 };
/**
 * S01's launches, each on its beat: a notch back on the cursor's second blink, the title filling the frame as it types in (τ 4, roll
 * 0: v04's 1.5 % roll read as a one-frame tumble), the whole log cropped by the frame.
 */
export const S01_MOVES: readonly AimMove[] = [
  { at: partFrame('intro', 1, 1), aim: { zoom: 11, x: CURSOR_XY[0] + 20, y: CURSOR_XY[1] - 6, roll: -0.02 } },
  { at: LOG_START, tau: 4, aim: { zoom: 4.2, x: -660, y: 400, roll: 0 } },
  { at: partFrame('intro', 1, 3), tau: 4, aim: { zoom: 2.6, x: -560, y: 190, roll: 0 } },
];
/**
 * The log's aim x with INTRO_THREADS.titleSafe (whole-film review 2026-10-03). With −660 the frame's flow (zoom ×1.03 and x + 6 a
 * beat) carries the title's K out of the CRT glass: 'AOMOJI.EXE' on 52–64, 'OMOJI.EXE' on 72. At −694 the K's cell stays ≥ 40 px
 * inside the glass through 50–72 (it is worst on 72, the frame before the next launch). The same launch, so the camera changes on
 * 49–95 only: ≈ 143 px on 54–72, easing out by 80, then ≤ 3 px (the next launch's overshoot scales with its longer travel); 48 and 96
 * change through their motion-blur sub-frames (96 by ≤ 4 levels). The tilt's pose on 96 is the same, bit for bit
 * (tests/introShots.test.ts), so the RAIN bar is untouched.
 */
export const TITLE_SAFE_X = -694;
/** S01_MOVES with the log's aim at TITLE_SAFE_X. */
export const S01_MOVES_TITLE_SAFE: readonly AimMove[] = S01_MOVES.map((m) => (m.at === LOG_START ? { ...m, aim: { ...m.aim, x: TITLE_SAFE_X } } : m));
/** S01's flow under the launches: a slow push from the intro's first frame, and a drift that carries the cursor across the screen, so it never stops. */
const s01Aim = (frame: number): Aim =>
  composeAim(aimMoves(frame, S01_START, INTRO_THREADS.titleSafe ? S01_MOVES_TITLE_SAFE : S01_MOVES), flowAim(frame, partStart('intro'), { zoom: 1.03, x: 6 }));

/** S01's camera; over its last sixteenth it winds up (反向预备) — it tips RAIN_CAMERA.windup degrees, looking a hair lower — into the tilt. */
function s01(frame: number): Pose {
  const pose = aimPose(s01Aim(frame), FRONT_DISTANCE, FOV);
  if (frame <= S01_WINDUP.from) return pose;
  const e = poseEuler(pose);
  return eulerPose({ ...e, pitch: e.pitch - RAIN_CAMERA.windup * smoothstep(S01_WINDUP.from, S01_WINDUP.to, frame) });
}

/**
 * S02: low over the tilted text plane, 290 behind the progress bar and 110
 * above it, pitched 8° down, so the bar spans most of the width in the lower
 * foreground and the log recedes to a horizon just above the centre. The
 * camera flies on without stopping — surging on every beat — and sways and
 * banks once a bar.
 */
function highway(frame: number): Pose {
  const n = (frame - HIGHWAY_START) / 24;
  const fwd = 30 * (n + (0.5 / (2 * Math.PI)) * Math.sin(2 * Math.PI * n));
  const phase = (2 * Math.PI * (frame - HIGHWAY_START)) / FRAMES_PER_BAR;
  const across = 40 * Math.sin(phase);
  const bank = 0.04 * Math.cos(phase);
  const height = 110;
  const y = PROGRESS_Y - 290 + fwd;
  return {
    position: [HIGHWAY_X + across, y, height],
    target: [HIGHWAY_X + across * 0.35, y + height / Math.tan((8 * Math.PI) / 180), 0],
    up: [Math.sin(bank), 0, Math.cos(bank)],
    fov: 55,
  };
}

/** S01's pose as the tilt takes it (its 96 position, square down: the tilt adds the wind-up's pitch itself) and the highway's on intro 3.1, where the crane lands. */
const TILT_FROM: Euler = poseEuler(aimPose(s01Aim(RAIN.from), FRONT_DISTANCE, FOV));
const CRANE_LAND: Euler = poseEuler(highway(HIGHWAY_START));

/** A little above the prompt, so the progress bar shows along the top. */
const LINE_Y = PROMPT_Y + 15;
/** The prompt line's left edge. */
const LINE_LEFT = cellCenter(0, PROMPT_ROW)[0] - TERM.cellW / 2;
/** S03's zoom: 8× as the first word types, widening steadily to 4.2× by the launch. */
const s03Zoom = (frame: number): number => 8 * (4.2 / 8) ** clamp((frame - WHIP.to) / (LAUNCH - WHIP.to));
/** Where the cursor is, smoothed: the camera glides after the typing instead of stepping with it. */
function followX(frame: number): number {
  let x = cellCenter(PROMPT.length, PROMPT_ROW)[0];
  for (const t of typeFrames) if (frame > t) x += TERM.cellW * (1 - Math.exp(-(frame - t) / 6));
  return x;
}
/** S03: the camera glides after the typing (the cursor right of centre), widening as the line grows, never cutting off the prompt. */
function s03Aim(frame: number): Aim {
  const zoom = s03Zoom(frame);
  const half = 960 / zoom;
  const x = Math.min(followX(frame) - 0.36 * half, LINE_LEFT - 20 + half);
  return { zoom, x, y: LINE_Y + 60 * clamp((frame - WHIP.to) / (LAUNCH - WHIP.to)), roll: 0.015 * clamp((frame - WHIP.to) / (LAUNCH - WHIP.to)) };
}

/** The face of S04 as the camera holds it: its brackets cropped by the frame. */
const FACE_AIM: Aim = { zoom: 1.3, x: 0, y: FACE.y, roll: 0 };
/** S04's moves: the camera slams back to the whole screen as the glyphs launch, then onto the face as it locks. */
export const S04_MOVES: readonly AimMove[] = [
  { at: LAUNCH, kind: 'slam', lead: 8, aim: { zoom: 1, x: 0, y: 0, roll: 0 } },
  { at: LOCK, kind: 'slam', lead: 8, aim: FACE_AIM },
];
/** The wind-up before the push: the camera eases back 3% over the half beat before it. */
const WINDUP = { from: PUSH.from - 6, depth: 0.03 } as const;
/** S04: the moves over two flows — the cloud turning in (from the launch until the slam onto the face absorbs it) and a slow push towards the right eye after the lock — and the wind-up before the push. */
function s04Aim(frame: number): Aim {
  const moved = aimMoves(frame, s03Aim(S04_MOVES[0].at - 8), S04_MOVES);
  const cloud = frame < LAUNCH ? { zoom: 1, x: 0, y: 0, roll: 0 } : flowAim(Math.min(frame, LOCK - 8), LAUNCH, { zoom: 1.04, roll: -0.012 });
  const fade = 1 - slam(frame, LOCK, 8, 0);
  const cloudFaded: Aim = { zoom: cloud.zoom ** fade, x: cloud.x * fade, y: cloud.y * fade, roll: cloud.roll * fade };
  const face = frame < LOCK ? { zoom: 1, x: 0, y: 0, roll: 0 } : flowAim(frame, LOCK, { zoom: 1.02, x: 8 });
  const aim = composeAim(composeAim(moved, cloudFaded), face);
  const wound = 1 - WINDUP.depth * smoothstep(WINDUP.from, PUSH.from, frame);
  return { ...aim, zoom: aim.zoom * wound };
}

/** The terminal camera through S03 and S04. */
const terminalAim = (frame: number): Aim => (frame < S04_MOVES[0].at - 8 ? s03Aim(frame) : s04Aim(frame));
const terminal = (frame: number): Pose => aimPose(terminalAim(frame), FRONT_DISTANCE, FOV);

/** T1's push into the right eye: an impact into the intro's end (swiss 1.1) — accelerating from the wound-up face, the eye gliding to the centre while the zoom goes evenly in scale; on swiss 1.1 its circle covers the frame. */
function push(frame: number, eye: readonly [number, number]): Pose {
  const a = terminalAim(PUSH.from);
  const p = clamp(slam(frame, PUSH.to, PUSH.to - PUSH.from, 0));
  const end = FRONT_DISTANCE / PUSH_END_DISTANCE;
  const zoom = a.zoom * (end / a.zoom) ** p;
  const off = [(eye[0] - a.x) * a.zoom, (eye[1] - a.y) * a.zoom];
  return aimPose({ zoom, x: eye[0] - (off[0] * (1 - p)) / zoom, y: eye[1] - (off[1] * (1 - p)) / zoom, roll: a.roll * (1 - p) }, FRONT_DISTANCE, FOV);
}

/**
 * Camera of the intro; `eye` is the zoom target from the layout. S01 (with its wind-up); the RAIN bar's tilt up off the log, its cruise
 * and its crane down, landing on the highway on intro 3.1 (src/shots/introRain.ts rainCamera: no cut left in the intro); the highway;
 * the whip; S03; S04; the push.
 */
export function introCamera(frame: number, eye: readonly [number, number]): Pose {
  if (frame < RAIN.from) return s01(frame);
  if (frame < HIGHWAY_START) return rainCamera(frame, TILT_FROM, CRANE_LAND);
  if (frame < WHIP.from) return highway(frame);
  // The whip: a launch with no overshoot (in pose space an overshoot swings the close-up by hundreds of pixels).
  if (frame < WHIP.from + 20) return mixPose(highway(WHIP.from), terminal(frame), strike(frame, WHIP.from, 2.5, 0));
  if (frame < PUSH.from) return terminal(frame);
  return push(frame, eye);
}

/** The highway's fog: [near, far, amount]. */
const HIGHWAY_FOG = [1100, 3800] as const;

/** Fog of the log plane: none on the screen; through the crane it comes in, so the highway has its own on intro 3.1; it fades out during the whip. */
export function introFog(frame: number): [number, number, number] {
  if (frame < CRANE.from || frame >= WHIP.to) return [0, 0, 0];
  if (frame < HIGHWAY_START) return [...HIGHWAY_FOG, prog(frame, CRANE.from, CRANE.to, ease.inOutSine)];
  return [...HIGHWAY_FOG, 1 - prog(frame, WHIP.from, WHIP.to, ease.inCubic)];
}

/** Camera moves (64 sub-frames): S01's launches, its wind-up and the tilt, the crane, the whip, the slams back to the launch and onto the face, the wind-up and the push. */
const CAMERA_MOVES: readonly (readonly [number, number])[] = [
  ...S01_MOVES.map((m) => [m.at - 1, m.at + 8] as const),
  [WHIP.from, WHIP.to + 2],
  ...S04_MOVES.map((m) => [m.at - (m.lead ?? 8), m.at + 3] as const),
  [WINDUP.from, PUSH.to],
];
/** S02's highway, from the crane's landing to the whip: it surges all the time, so every frame is a fast move. */
export const HIGHWAY = { from: HIGHWAY_START, to: WHIP.from } as const;
/** The highway and S03's glide after the typing (until Enter): the camera flows fast, so 32 sub-frames on the shutter, with the phosphor trail. */
const FAST_FLOW = { from: HIGHWAY.from, to: ENTER_FRAME } as const;
/** The glyphs' flights (long trails; the camera itself never ghosts, it is taken at the shutter's opening): the launch into the cloud and the slam onto the face. */
const FLIGHTS: readonly (readonly [number, number])[] = [
  [FLING.from, FLING.to + 3],
  [SLAM.from, SLAM.to + 4],
];
/** The phosphor trail on the terminal and in the rain: a faint glow behind every moving glyph. */
const PHOSPHOR_TRAIL = { shutter: 0.5, persistence: 1.2, afterglow: 0.2 } as const;

/**
 * Long glyph trails on the flights; 64 sub-frames and no trail on the
 * camera's fast moves; otherwise a faint phosphor trail, so glyphs streak.
 * Trails are sampled 64 per frame of window where the camera or the glyphs
 * move fast (32 on the shutter), 32 elsewhere. The RAIN bar keeps the
 * phosphor trail (the falling heads streak; the camera is taken at the
 * shutter): 64 from S01's wind-up through the crane (the cruise dollies and
 * turns 20+ px a frame too: 32 on the shutter, the energy standard's floor).
 */
export function introTemporal(frame: number): Temporal {
  if (within(frame, FLIGHTS)) return withDensity({ shutter: 0.5, persistence: 1.5 }, 64);
  if (frame >= S01_WINDUP.from && frame < HIGHWAY_START) return withDensity(PHOSPHOR_TRAIL, 64);
  if (within(frame, CAMERA_MOVES)) return { samples: 64, shutter: 0.5, persistence: 0 };
  return withDensity(PHOSPHOR_TRAIL, frame >= FAST_FLOW.from && frame < FAST_FLOW.to ? 64 : 32);
}

/** The intro has no hard cut left: the tilt (E1) and the crane (E2) are continuous moves, the whip and T1 as built. */
export function introSegment(): Segment {
  return { from: partStart('intro'), to: INTRO_END };
}

/** The glass's bulge on the highway: the text plane's long rows bow like the screen's lines do (at the terminal's curvature they would run dead straight). */
export const HIGHWAY_CURVATURE = 0.2;

/** The tube kick's curvature spring (src/content/boot.ts TUBE): the spike on the lock ringing out (τ 4) onto the held bulge. */
const TUBE_RING = 0.75;

/** How much brighter the phosphor haze glows: ×TUBE.haze from the lock through the hold, back with the CRT's fade (the tube kick). */
export function hazeGain(frame: number): number {
  if (!INTRO_THREADS.tubeKick || frame < TUBE_KICK) return 1;
  return lerp(TUBE.haze, 1, prog(frame, TUBE_FADE.from, TUBE_FADE.to, ease.inOutSine));
}

/**
 * Terminal finishing: brighter on Enter and on the lock; a refresh band rolls down the tube once a bar; the glass bulges harder over the
 * crane onto the highway and eases back through the whip; the CRT fades out as the red circle takes over. From the lock (the tube kick,
 * `tubeKick`): the tube kicks — its curvature springs to 0.12 and settles on 0.065, the fringing and the bloom kick and decay, the
 * scanlines and the grille thicken — and goes back to the terminal's with the CRT's fade on the push. The white band is parked on the
 * tube's edge while the antivirus's red one rolls (`redBand`).
 */
export function introLook(frame: number): Look {
  const crt = 1 - prog(frame, PUSH.from, PUSH.to - 2, ease.inOutSine);
  const boost = Math.max(glow(frame, ENTER_FRAME, 1, 6), glow(frame, LOCK, 1, 8)) - 1;
  const bulge = frame < RAIN.from ? 0 : frame < HIGHWAY_START ? prog(frame, CRANE.from, CRANE.to, ease.inOutSine) : 1 - prog(frame, WHIP.from, WHIP.to, ease.inOutSine);
  const parked = INTRO_THREADS.redBand && frame >= WHITE_BAND_OFF.from && frame < WHITE_BAND_OFF.to;
  const band = parked ? 0 : (((frame % FRAMES_PER_BAR) + FRAMES_PER_BAR) % FRAMES_PER_BAR) / FRAMES_PER_BAR;
  const look = terminalLook(crt, boost, band, lerp(TERMINAL_CURVATURE, HIGHWAY_CURVATURE, bulge));
  if (!INTRO_THREADS.tubeKick || frame < TUBE_KICK) return look;
  const t = frame - TUBE_KICK;
  const back = prog(frame, TUBE_FADE.from, TUBE_FADE.to, ease.inOutSine);
  const [curv0, spike, held] = TUBE.curvature;
  const [ab0, abKick, abHeld] = TUBE.aberration;
  const ramp = prog(frame, TUBE_RAMP.from, TUBE_RAMP.to, ease.outCubic);
  const curvature = lerp(held + (spike - held) * Math.exp(-t / TUBE.tau.curvature) * Math.cos(TUBE_RING * t), curv0, back);
  const aberration = lerp(abHeld + (abKick - abHeld) * Math.exp(-t / TUBE.tau.aberration), ab0, back);
  const scanlines = lerp(lerp(TUBE.scanlines[0], TUBE.scanlines[1], ramp), TUBE.scanlines[0], back);
  const grille = lerp(lerp(TUBE.grille[0], TUBE.grille[1], ramp), TUBE.grille[0], back);
  const kick = (1 - back) * Math.exp(-t / TUBE.tau.bloom);
  return {
    ...look,
    bloom: { ...look.bloom, intensity: look.bloom.intensity + TUBE.bloom * kick },
    aberration: aberration * crt,
    vignette: look.vignette + 0.25 * crt * Math.exp(-t / 6),
    crt: { ...look.crt!, curvature, scanlines, grille },
  };
}

/** The phosphor haze brightens on each sixteenth of the arp (from the title on) and fades before the next (secondary motion). */
export const hazePulse = (frame: number): number => (frame < LOG_START ? 1 : 1 + 1.5 * Math.exp(-((frame - LOG_START) % (FRAMES_PER_BEAT / 4)) / 2));
