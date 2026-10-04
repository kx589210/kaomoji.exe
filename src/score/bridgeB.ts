// Events of bridge B, the film part 'bridgeB' (v08: one bar between drop 2 and the ending; film bar 58, frames 5472–5567 on the 63-bar
// map). The v07 review (2026-10-03) found the turn from the spin into the ending's crash abrupt, like a break, its transition too short: the bullet time's orbit
// condensed into (×ω×) and the blue screen burst out of him within a quarter of a second; this bar lets the crash TAKE TIME (+1.6 s).
// Contract: output/qa/v08/MAP-CONTRACT.md.
//
// THE CRASH TAKES TIME (X03). The bullet time's camera was the one thing still running ("camera 60.0 fps · still rolling"); now it runs
// down too, and the program's frozen frame comes apart in stages, a stage a beat, until the system takes over in blue:
//   drop2 20.4  TAPE STOP: the camera's clock runs down — the orbit's last twelve degrees and the plates' landing take the whole beat
//               (twice as long, slowing to rest exactly on the bridge's downbeat); from 20.4& the picture drops every other frame.
//   1.1  COLOUR  the landing, front-on: the frame rate falls to 20 fps; the outer rings (pink, violet) drain to the terminal's dim text, from
//               the edges in (nothing jumps on the line: the change starts there and spreads). The music box runs down a note (A♯5, flat).
//   1.1& HEART   his heart, slower and late: on the lub the CRT loses vertical hold for a picture (the field slips a row), his indigo spot
//               turns half the blue screen's blue and a blue glow beats out of him.
//   1.2  TEAR    15 fps: the middle rings (cyan, green) drain; the field tears sideways in bands (the horizontal hold); the blue leaks out of
//               his spot into the dim text round it. The music box, a 16th late (F♯5, flatter).
//   1.3  CORRUPT 10 fps, then 5: the pale rim drains (the field is all dim text); blocks of it print their own bytes (the hexdump the ending
//               decodes) and a few go blue; he condenses into the crisp amber (×ω×) the ending starts from. The sound skips.
//   1.4  FREEZE  `camera 0.0 fps · not responding`: the picture stops; a grey veil (the kernel's `not responding`) settles over it; only the
//               blue still moves. The last note (D♯5, sagging) and a stuck buffer.
//   1.4& + 6     the inhale: the blue draws everything it touched back into his spot (WP6's wind-up, quadratic), the dim @ filling in
//               behind it; the hand-off's digital zero (the last 16th); then the blue screen bursts out of him on outro 1.1, as approved.
//
// Two clocks (the picture): the PROGRAM's frames (programFrame: the frame rate falling; every stage lands on a fresh frame) and the
// CAMERA's time (cameraTime: the tape stop, after which the crash's own clock runs 12 frames later than before). The blue screen — the
// system — runs on the film's own time: it moves while the picture is frozen.
//
// Positions are bridge-local: `at(1, 3.5)` is the bridge's bar 1, the & of beat 3 (1-based beats, as on the sheets); drop 2's last beat,
// where the tape stop runs, is written here too (d2) so both sides read one schedule. Rules (as the transition's,
// src/score/transition.ts): every exported frame on the 3-frame grid (the 32nd notes); windows { from, to } with `to` exclusive; an event
// on the part's first downbeat is BRIDGE_B_START, a window that runs to its end runs to BRIDGE_B_END. The picture (src/shots/bridgeB.ts,
// src/shots/drop2Crash.ts, src/scenes/bridgeB.ts) and the music (scripts/audio/sections/bridgeB.mjs) read these lists, so every hit lands
// on the same frame. Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import type { EnergyAccent } from './energy.ts';
import { partEnd, partFrame, partStart } from './film.ts';

/** The bridge's bar `bar`, beat `beat` (both 1-based; 1.3& is at(1, 3.5)), as a film frame. */
export const at = (bar: number, beat = 1): number => partFrame('bridgeB', bar, beat - 1);
/** Drop 2's last bar (20), beat `beat` (1-based): the hand-off's beat before the line. */
const d2 = (beat: number): number => partFrame('drop2', 20, beat - 1);
const SIXTEENTH = 6;
const THIRTY_SECOND = 3;

/** The bridge runs from drop 2's end (the bullet time landed front-on, at rest) to the blue screen bursting out of him on outro 1.1. */
export const BRIDGE_B_START = partStart('bridgeB');
export const BRIDGE_B_END = partEnd('bridgeB');

// ——— The camera's clock: the tape stop (drop2 20.4 → bridge 1.1) ————————————————————————————————————————————————————————————————

/**
 * The tape stop: from drop2 20.4 (the music box's C♯6, the plates landing) the camera's clock runs down at a constant deceleration, from
 * full speed to rest on the bridge's downbeat, so the bullet time's last beat (the orbit's last 12°, the plates' landing, the aperture
 * closing) takes the whole beat instead of half of it, and lands front-on, at rest, on 1.1.
 */
export const TAPE_STOP = { from: d2(4), to: BRIDGE_B_START } as const;
/**
 * The frozen chord (drop 2's bullet time: scripts/audio/drop2Bullet.mjs) runs down with the tape stop and out over this window — from
 * drop2 20.4& to the bridge's second beat (the tear) — so the old world's held sound carries across the line, dying, and is no bed.
 */
export const CHORD_OUT = { from: d2(4.5), to: at(1, 2) } as const;
/** How far the camera's clock has fallen behind the film's by the end of the tape stop: half its span (12 frames). */
export const TAPE_LAG = (TAPE_STOP.to - TAPE_STOP.from) / 2;
/**
 * The camera's time at film instant `f` (sub-frames kept): the film's own until 20.4; through the tape stop f − t² / (2 · span) (t the
 * frames since 20.4: speed 1 → 0), so it reaches drop2 20.4& (the bullet time's landing) on 1.1; from there the film's time less TAPE_LAG.
 */
export function cameraTime(f: number): number {
  const t = f - TAPE_STOP.from;
  if (t <= 0) return f;
  const span = TAPE_STOP.to - TAPE_STOP.from;
  if (t >= span) return f - TAPE_LAG;
  return TAPE_STOP.from + t - (t * t) / (2 * span);
}

// ——— The program's frames: the frame rate falling (the honest-fps egg, E9's grammar) ———————————————————————————————————————————————

/**
 * From each `at` on only every `every`-th output frame is a new picture (the rest repeat it, sub-frames and all), until the next entry:
 * 30 fps from drop2 20.4&, 20 on the landing, 15 on the tear, 10 on the corruption, 5 from 1.3&; nothing new from the freeze (1.4). Each
 * entry starts on a fresh frame, so every stage lands whole on its beat.
 */
export const FRAME_RATES: readonly { at: number; every: number }[] = [
  { at: d2(4.5), every: 2 },
  { at: at(1), every: 3 },
  { at: at(1, 2), every: 4 },
  { at: at(1, 3), every: 6 },
  { at: at(1, 3.5), every: 12 },
];
/** The freeze: from here the program shows this frame, `camera 0.0 fps · not responding`, until the blue screen. */
export const FREEZE = at(1, 4);

/** The frame the program shows at film instant `frame`: itself, or the held frame of its rate (its sub-frame offset kept, like a held tail). */
export function programFrame(frame: number): number {
  const out = Math.round(frame);
  const off = frame - out;
  if (out < FRAME_RATES[0].at) return frame;
  if (out >= FREEZE) return FREEZE + off;
  let r = FRAME_RATES[0];
  for (const x of FRAME_RATES) if (x.at <= out) r = x;
  return out - ((out - r.at) % r.every) + off;
}

/**
 * The camera line's honest count at output frame `frame` (E9's rule, src/score/drop2.ts honestFps): updated on the 8ths, the distinct
 * pictures among the 60 output frames up to the last 8th; `frozen` from the freeze. 60 through the tape stop (every frame is new, only
 * slower), then falling as the dropped frames fill the window.
 */
export function cameraFps(frame: number): { fps: number; frozen: boolean } {
  const e = Math.floor(Math.round(frame) / 12) * 12;
  if (e >= FREEZE) return { fps: 0, frozen: true };
  const shown = new Set<number>();
  for (let g = e - 59; g <= e; g++) shown.add(Math.round(programFrame(g)));
  return { fps: shown.size, frozen: false };
}

// ——— The stages, a beat each ————————————————————————————————————————————————————————————————————————————————————————————————————

/** The four stages of the crash, on the bridge's beats: the colour goes, the picture tears, it corrupts, it freezes. */
export const STAGES = { colour: at(1), tear: at(1, 2), corrupt: at(1, 3), freeze: FREEZE } as const;
/**
 * The colour drains ring by ring, from the edges in, a ring a stage (`at`): the cells `from` … `to` px outside his outline (his capsule;
 * his clearing is inside it, negative). Within a stage the outer cells go first over RIPPLE frames.
 */
export const DRAIN_RINGS: readonly { at: number; from: number; to: number }[] = [
  { at: STAGES.colour, from: 330, to: Infinity },
  { at: STAGES.tear, from: 120, to: 330 },
  { at: STAGES.corrupt, from: -Infinity, to: 120 },
];
/** The CRT loses vertical hold on his heart's lub (1.1&): the field one row down for a 32nd (one picture at 20 fps). Defined below HEART_B. */
/**
 * The horizontal hold goes: bands of rows torn sideways on the tear and again, wider, on the corruption, each settling within the beat;
 * a last small one the freeze stops mid-tear (the inhale draws it straight).
 */
export const TEARS: readonly number[] = [STAGES.tear, STAGES.corrupt, FREEZE];
/** The corruption prints in three waves on its 16ths (each a fresh picture), outward from him. */
export const CORRUPT_WAVES: readonly number[] = [STAGES.corrupt, STAGES.corrupt + SIXTEENTH, STAGES.corrupt + 2 * SIXTEENTH];
/** He condenses into the crisp (×ω×) on the corruption (the crisp face crossing over its + 4 … + 9). */
export const CONDENSE_B = { from: STAGES.corrupt, to: BRIDGE_B_END } as const;
/** The `not responding` veil settles over the frozen picture (over a 16th) and lifts with the inhale. */
export const VEIL = { from: FREEZE, to: FREEZE + SIXTEENTH } as const;

// ——— The blue (the system, on the film's own time) ——————————————————————————————————————————————————————————————————————————————

/** His heart, slower and late: one lub-dub on 1.1& (the dub 9 frames after, not 6), 60 frames after drop2 20.3's and 84 before the ending's. */
export const HEART_B = { lub: at(1, 1.5), dub: at(1, 1.5) + 3 * THIRTY_SECOND } as const;
/** The CRT's slip (its vertical hold lost with his heart's lub: the screen jolts with the heartbeat), one picture long. */
export const SLIP = { from: HEART_B.lub, to: HEART_B.lub + THIRTY_SECOND } as const;
/**
 * His spot turns from indigo to the blue screen's blue in two steps (each over a 16th): `first` of the way on the lub, the rest on the
 * corruption, when his crisp face (drawn over it, not added to it) takes over from his big ASCII one, whose amber the blue would wash out.
 */
export const TINT = { from: HEART_B.lub, frames: SIXTEENTH, first: 0.55, full: STAGES.corrupt } as const;
/** The blue leaks out of his spot a step on the lub and on each stage after it (px past his clearing, each a launch: ¾ in 3 frames). */
export const LEAKS: readonly { at: number; px: number }[] = [
  { at: HEART_B.lub, px: 40 },
  { at: STAGES.tear, px: 70 },
  { at: STAGES.corrupt, px: 90 },
  { at: FREEZE, px: 50 },
];
/** The inhale: the blue draws in onto his face, accelerating (WP6's, given 12 frames), landing as SEAM_SPOT on outro 1.1. */
export const INHALE = { from: BRIDGE_B_END - 2 * SIXTEENTH, to: BRIDGE_B_END } as const;
/** The hand-off's digital zero (the last 16th before the ending): the music's; src/score/drop2.ts ZERO is this window (v08). */
export const HAND_OFF_ZERO = { from: BRIDGE_B_END - SIXTEENTH, to: BRIDGE_B_END } as const;

// ——— The sound's events (scripts/audio/sections/bridgeB.mjs) ———————————————————————————————————————————————————————————————————

/**
 * The music box runs down: drop2 20.4's C♯6 (drop 2's) and then A♯5, F♯5, D♯5 — the blue screen's glass figure (C♯6 A♯5 F♯5 D♯5 on
 * outro 1.1's 32nds) played slower and slower (24, 30, 36 frames apart: a 16th later each time), each note flatter (`cents`).
 */
export const MUSIC_BOX_B: readonly { at: number; midi: number; cents: number }[] = [
  { at: at(1), midi: 82, cents: -30 },
  { at: at(1, 2) + SIXTEENTH, midi: 78, cents: -55 },
  { at: at(1, 3) + 3 * SIXTEENTH, midi: 75, cents: -85 },
];
/** The CRT's slip on the lub: one dry relay click under the heart. */
export const SLIP_CLICK = SLIP.from;
/** The tear: two short chirps a 32nd apart, falling. */
export const TEAR_CHIRPS: readonly number[] = [STAGES.tear, STAGES.tear + THIRTY_SECOND];
/** The corruption: the sound skips — a 32nd of the mix repeated, four times, as the picture prints its bytes. */
export const SKIP = { from: STAGES.corrupt, to: STAGES.corrupt + 4 * THIRTY_SECOND } as const;
/** The freeze: the stuck buffer — the last 32nd before it looped, fading and darkening, until the zero. */
export const STUCK = { from: FREEZE, to: HAND_OFF_ZERO.from } as const;
/** And over it the blue screen's first glass droplet a beat early (C♯6, its figure's first note: the J-cut into outro 1.1), lighting the veil. */
export const FREEZE_GLASS = { at: FREEZE, midi: 85 } as const;

/** Its camera energy: none (from drop 2's reel blades on the rig adds nothing: the honest stutter, and here the camera is the one failing). */
export const BRIDGE_B_ACCENTS: readonly EnergyAccent[] = [];
