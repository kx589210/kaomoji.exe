// Events of the break, the film part 'break': THE INTERLUDE, 8 bars (src/score/film.ts). Build sheet
// notes/bid2/break-sheet2.md (binding), from the design notes/extend/interlude-final.md and its widget
// (notes/extend/interlude-widget.html); the as-built (v04) sheet is notes/break/break-sheet.md.
//   break 1 FALL       the glass falls into the paint and becomes the world (as built, unchanged)
//   break 2 IRIS       the antivirus pulls his core apart (red marquee, torn work orders), he snaps it back; the shard comes home
//   break 3 LOOP       the red cursor flings his bracket through a loop and slams it in backwards; the floor tilts; one beat of its POV
//   break 4 STEPS      wide and low: the other bracket walks home over the litter; eyes and world re-roll to tofu; the hang; the restart
//   break 5 WHOLE      he is whole; his ripple infects the spying guest (￣ω￣)ノ; the antivirus selects him
//   break 6 GRAPH      (new) dragged into a graph editor, he rides his own signature as a rollercoaster; the rewind draws the slingshot
//   break 7 SLING      caught; the cars concertina into the extrude stack; one notch per kick until the braced Y and the V band read; sudo, root
//   break 8 FAKE DROP  the reverse angle: the soap film catches him, the gloat, silence, ( ・ω・)?, the black hole his ω eats; drop 2 pops it
// The picture (src/scenes/break*.ts, src/shots/break*.ts) and the music (scripts/audio/sections/break*.mjs) read these names, so every hit
// lands on the same frame. Positions are break-local: at(2, 1.5) and "break 2.1&" are the break's bar 2, the & of beat 1 (1-based beats).
//
// TWO LAYERS (the story bible's 先保留、再加 rule: every built and liked shot carried over unchanged, then only extended):
//   - v04 names (the first half of this file): the as-built break of the 36-bar master, bars 1–6, every value exactly as approved
//     (part-local, so only the part's start moved). The as-built code reads them and draws exactly v04 — bars 1–5 in place, v04's bar 6
//     (the slingshot) one bar later, in break 7, through the dispatcher's carried-over stub (src/scenes/break.ts, carriedInstant below).
//     Do not change a v04 value: it is the identity proof's baseline (sheet §4).
//   - v2 names (the second half): the 8-bar design. A v04 name the design re-times or re-voices gets a `_V2` twin (LOUDER_V2 is LOUDER one
//     bar later); a new idea gets a new name (MARQUEE, TILT, POV, GRAPH_KEYS, NOTCHES, RELEASE …). A builder switches a consumer from a
//     v04 name to its v2 one when that consumer is rebuilt, and logs it (sheet §4.3).
// Rules (tests/break.test.ts audits them): every exported frame is a multiple of 3 (the 32nd-note grid); export only numbers, number
// arrays, { from, to } objects (or plain objects of frames) and arrays of objects whose frame fields are named at / from / to / until
// (counts, sizes, motion ends off the grid and one-frame staggers go in the shot modules); functions are allowed (not audited). Windows
// are { from, to } with `to` exclusive. Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import { SMASH } from './drop1.ts';
import type { GlyphFlash } from './cuts.ts';
import type { EnergyAccent } from './energy.ts';
import { heldFrame, partBars, partEnd, partFrame, partStart } from './film.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** The break's bar `bar`, beat `beat` (both 1-based; break 2.1& is at(2, 1.5); a 32nd past a 16th is + 0.125), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

// ——— The v2 switches (sheet §4.1, §4.3) ———————————————————————————————————————————————————————————————————————————————————————————

/** Set (only) by a KEEP-FIRST identity proof's bundle (webpack DefinePlugin): true draws that stretch exactly as v04 / the skeleton did. */
declare const __KX_FLAT_V04__: boolean | undefined;
declare const __KX_GRAPH_V04__: boolean | undefined;
declare const __KX_LAUNCH_V04__: boolean | undefined;
/**
 * The three v2 switches, one per rebuilt part, here (not in the shot modules) so the rig below follows them too. The shot modules
 * re-export them (breakShared.ts FLAT_V2, breakGraph.ts GRAPH_V2, breakLaunch.ts LAUNCH_V2). All on in the film; a proof bundle turns one
 * off with its DefinePlugin flag and nothing else changes:
 *   FLAT_V2    break 2–5: the travelling camera, the depths, the floor and its mess, the antivirus's hand, the POV, the infected guest,
 *              the selection; off: every frame of bars 2–5 is v04's, byte for byte (with v04's punches).
 *   GRAPH_V2   break 6.1 → 6.4a: the graph-editor coaster; off: the skeleton's stub (the flat world's last frame, held; v04's bar-6 punches).
 *   LAUNCH_V2  6.4a → the end: the catch, the sling, the fake drop, the v2 last frame drop 2 reads; off: the skeleton's stub (v04's
 *              slingshot one bar later with its carried punches, then its last frame held) and the seam reads v04's last frame.
 */
export const FLAT_V2: boolean = typeof __KX_FLAT_V04__ === 'undefined' ? true : !__KX_FLAT_V04__;
export const GRAPH_V2: boolean = typeof __KX_GRAPH_V04__ === 'undefined' ? true : !__KX_GRAPH_V04__;
export const LAUNCH_V2: boolean = typeof __KX_LAUNCH_V04__ === 'undefined' ? true : !__KX_LAUNCH_V04__;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v04 — the as-built break (bars 1–6 of the 36-bar master), unchanged values
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ——— Bounds and parts ————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * v04: the break runs from the glass giving way on its downbeat (Drop 1's smash, where the club's span ends) to the end of v04's content,
 * break 7.1. BREAK_END is NOT the part's end any more: every v04 window that ran "to the end" still ends here, and the as-built code (the
 * launch, the film, the music) reads it as its last frame + 1. The part's end is BREAK_END_V2 (= partEnd('break'), drop 2's downbeat).
 */
export const BREAK_START = SMASH;
export const BREAK_END = at(7);
/** v04's six downbeats: 1 FALL, 2 IRIS, 3 LOOP, 4 STEPS, 5 WHOLE, 6 SLINGSHOT (the as-built bars). The 8 bars: BREAK_BARS_V2. */
export const BREAK_BARS: readonly number[] = [1, 2, 3, 4, 5, 6].map((b) => at(b));
/** v04's three parts of the break scene: the glass falling (3D glass into a flat pool), the flat world, the launch (and the soap film). */
export const FALL = { from: BREAK_START, to: at(2) } as const;
export const FLAT = { from: at(2), to: at(6) } as const;
export const LAUNCH = { from: at(6), to: BREAK_END } as const;
/**
 * Break 2.1, where the fall hands its landed state to the flat world, is continuous but a segment boundary (the slap frame is the flat
 * world's alone: R2-03); break 6.1 is a hard cut — v04's match cut into the callout, the v2 design's C6 (the selection carried into the
 * graph editor).
 */
export const MATCH_CUT = LAUNCH.from;

// ——— Break bar 1 · FALL: the glass falls into the paint ———————————————————————————————————————————————————————————————————————————

/** The party monitor's last row (the club's HUD, read live) glitch-slices (break 1.1 and the frame after) and falls away; below the frame 20 frames in. */
export const MONITOR_FALL = { from: at(1), to: at(1) + 7 * THIRTY_SECOND } as const;
/**
 * Every release of blank glass (`from`) and its landing (`to`), in order: the four singles P1–P4, the four crumbles C1–C4, the eight
 * cascades K1–K8 (the cells each group holds: break-sheet §4.3). Every release is a tink, every landing before the impact a plip.
 */
export const PIECE_FALLS: readonly { from: number; to: number }[] = [
  { from: at(1), to: at(1, 2.25) }, // P1 · cell 33 (iteration 2: the pane above his face; cell 46 is now a K6 card)
  { from: at(1, 2), to: at(1, 3.25) }, // P2 · 66
  { from: at(1, 2.5), to: at(1, 3.5) }, // P3 · 60
  { from: at(1, 2.5), to: at(1, 2.75) }, // C1 · 69, 73
  { from: at(1, 3), to: at(1, 4) }, // P4 · 35
  { from: at(1, 3.25), to: at(1, 3.5) }, // C2 · 55, 56, 57
  { from: at(1, 3.5), to: at(1, 3.75) }, // C3 · 54, 58
  { from: at(1, 3.75), to: at(1, 4) }, // C4 · 40, 41, 42, 68
  { from: at(1, 4), to: at(1, 4.25) }, // K1 · 39, 43
  { from: at(1, 4.125), to: at(1, 4.375) }, // K2 · 74, 67
  { from: at(1, 4.25), to: at(1, 4.5) }, // K3 · 20, 17
  { from: at(1, 4.375), to: at(1, 4.625) }, // K4 · 19, 18
  { from: at(1, 4.5), to: at(1, 4.75) }, // K5 · 31, 32
  { from: at(1, 4.625), to: at(1, 4.875) }, // K6 · 34, 46
  { from: at(1, 4.75), to: at(2) }, // K7 · 50, 47, 61
  { from: at(1, 4.875), to: at(2) }, // K8 · 49, 48, 65 (and the six cells wholly off the frame, silently)
];
/** The 35 face cells let go together on break 1.4 (all but the E2 shard) and slap flat on break 2.1. */
export const FACE_FALL = { from: at(1, 4), to: at(2) } as const;
/** The glass motif: one release on break 1.1, two on 1.2, four on 1.3, eight on 1.4 (a tink each). */
export const FALL_TINKS: readonly number[] = [...new Set(PIECE_FALLS.map((p) => p.from))];
/** A plip on every landing before the impact, its pitch climbing as the paint rises. */
export const PLIPS: readonly number[] = [...new Set(PIECE_FALLS.map((p) => p.to))].filter((f) => f < at(2)).sort((a, b) => a - b);
/** P1 glints (a 3-frame bevel flare) as it crosses in front of his ω (iteration 2, ruling 1: it falls straight across his face). */
export const P1_GLINT = at(1, 1.875);
/** The four corner chips decode `REPAIR MODE▌` (TL, TR, BR, BL), each with a key press. */
export const CHIPS: readonly number[] = [at(1, 2), at(1, 2.25), at(1, 2.5), at(1, 2.75)];
/** The chips are up from the first decode until they have folded into their corners (break 2.1 and the 5 frames after). */
export const CHIPS_UP = { from: CHIPS[0], to: at(2) + SIXTEENTH } as const;
/** The pool surges up the frame as the face lets go: its base edge from 860 to −40 px. */
export const POOL_SURGE = { from: at(1, 4), to: at(1, 4.875) } as const;

// ——— E2 · the shard on our side ————————————————————————————————————————————————————————————————————————————————————————————————

/** The shard that carries his left × (cell 37) does not let go on break 1.4: it stays on our side of the screen, frozen on screen. */
export const SHARD_STAYS = FACE_FALL.from;
/** He knocks on it from behind: with the twitch on break 2.1&, and with the iris closing on 2.2&. */
export const KNOCKS: readonly number[] = [at(2, 1.5), at(2, 2.5)];
/**
 * It pops back through the screen (edge-on on break 2.2a, where the flat world takes it over) and slams into his left eye on the pain
 * clap.
 */
export const SHARD_FLIGHT = { from: KNOCKS[1], to: at(2, 3) } as const;

// ——— Break bar 2 · IRIS ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The face pieces slap flat (the hand-off from the fall), a black shockwave ring runs out. */
export const IMPACT = at(2);
/** Every face piece twitches 10 px toward its slot: the system's first attempt. */
export const TWITCH = at(2, 1.5);
/** The 33 polygons pool by colour and spring into the four blocks (the four smallest become confetti); settled 20 frames in. */
export const MORPH = { from: at(2, 2), to: at(2, 2) + 7 * THIRTY_SECOND } as const;
/** The iris opens (anticipation, anticlockwise −70°) and closes (clockwise +70°, ease-in cubic) about his face's centre. */
export const IRIS_OPEN = { from: at(2, 2), to: at(2, 2.5) } as const;
export const IRIS_CLOSE = { from: at(2, 2.5), to: at(2, 3) } as const;
/** The iris locks (31 pieces, the shard among them) on the clap: (>ω<), pain. */
export const LOCK = at(2, 3);
/** The party monitor springs up from under the bottom edge (break bars 2–5's system voice), until it folds away on break 5.2. */
export const MONITOR = { from: at(2, 4), to: at(5, 2) + SIXTEENTH } as const;
/** Each change of the monitor's status line (or a number it shows): break-sheet §4.8. */
export const MONITOR_LINES: readonly number[] = [
  at(2, 4), at(2, 4.5),
  at(3, 3), at(3, 4.75),
  at(4, 1.5), at(4, 2), at(4, 2.125), at(4, 2.25), at(4, 2.375), at(4, 2.5), at(4, 2.75), at(4, 3), at(4, 3.5), at(4, 3.75), at(4, 4), at(4, 4.25),
  at(5),
];
/** The monitor folds away (height → 0) as the fan opens. */
export const MONITOR_FOLD = { from: at(5, 2), to: at(5, 2) + SIXTEENTH } as const;
/** One peeker at a time: out (`from`) and back in (`to`, when it starts to slide back). The guest is the third (caught in the stutter). */
export const PEEKS: readonly { from: number; to: number }[] = [
  { from: at(2, 4.5), to: at(2, 4.875) },
  { from: at(3, 1.5), to: at(3, 2.25) },
  { from: at(3, 3.5), to: at(3, 4.5) },
  { from: at(3, 4.5), to: at(4, 1.25) },
  { from: at(4, 2.5), to: at(4, 3.25) },
  { from: at(4, 3.5), to: at(4, 4) },
];
/** The second peeker's hand waves: +15°, then −15°. */
export const PEEK_WAVES: readonly number[] = [at(3, 1.75), at(3, 2)];
/** The patch tags T0–T8: popped (`from`) until they start to fold (`to`); T4–T8 are swept by the restart wipe. */
export const TAGS: readonly { from: number; to: number }[] = [
  { from: at(2, 1.5), to: at(3) }, // T0 eye.L ✗ wrong side of screen → ✓ retrieved from viewer (E2)
  { from: at(2, 3.5), to: at(3) }, // T1 patch face.core ✓
  { from: at(2, 4.5), to: at(3) }, // T2 patch eyes ✓
  { from: at(3, 3.5), to: at(4) }, // T3 bracket.L ✗ mismatch → ✓ retry 1
  { from: at(4, 1.5), to: at(4, 4.5) }, // T4 patch patch.L ✓
  { from: at(4, 2), to: at(4, 4.5) }, // T5 eye.* ✗ retry 2…5 → eye.R ✗ tofu → rescan ✓ (E3)
  { from: at(4, 3.25), to: at(4, 4.5) }, // T6 bracket.R ✓
  { from: at(4, 3.5), to: at(4, 4.5) }, // T7 eye.L ✗ detached
  { from: at(4, 3.75), to: at(4, 4.5) }, // T8 patch(patch(patch)) ✓
];
/** Tags retyping: T0 (break 2.3), T3 (3.4a), T5 (counting on 4.2 and the three 32nds after it, 4.2& tofu, 4.3 rescan). */
export const TAG_RETYPES: readonly number[] = [at(2, 3), at(3, 4.75), at(4, 2.125), at(4, 2.25), at(4, 2.375), at(4, 2.5), at(4, 3)];
/** Every visible tag copies itself at (+10, +10), twice. */
export const TAG_COPIES: readonly number[] = [at(4, 3.75), at(4, 3.875)];
/** The blocks press into their shadows on every kick and ghost kick from break 2.2& to the hang. */
export const PRESSES: readonly number[] = [at(2, 2.5), at(3), at(3, 2.5), at(4), at(4, 2), at(4, 2.5)];
/**
 * Iteration 2, ruling 3: the two kicks the picture used to miss — the break 2.2& ghost kick (the morph still easing out) and 3.2&
 * (inside the loop's whip) — are struck, not launched: the blocks slam into their shadows and the confetti tick 45°, whole on the kick's
 * own frame.
 */
export const STRIKES: readonly number[] = [at(2, 2.5), at(3, 2.5)];

// ——— Break bar 3 · LOOP ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The "(" launches onto its path (still mirrored: it reads ")"), climbs, reaches the apex and whips round the loop. */
export const BRACKET_LAUNCH = at(3);
export const APEX = at(3, 2);
export const LOOP = { from: at(3, 2), to: at(3, 2) + 18 } as const;
export const LOOP_PEAK = at(3, 2.5);
/** It slams into the left slot — the wrong piece: (＠ω＠), dizzy; the camera sways. */
export const DIZZY = at(3, 3);
export const SWAY = { from: at(3, 3), to: at(3, 4) } as const;
/** A red outline blinks on the wrong bracket, 3 frames on, 3 off. */
export const RED_BLINK = at(3, 3.5);
/** The stutter: break 3.4's frame is shown on each of its four 32nds, with fresh glitch slices; time jumps back on 3.4&. */
export const STUTTER: readonly number[] = steps(at(3, 4), at(3, 4.5), THIRTY_SECOND);
export const STUTTER_END = at(3, 4.5);
/** The card flip of the wrong bracket: edge-on halfway, locked (✓) at the end. */
export const CARD_FLIP = { from: at(3, 4.5), to: at(3, 4.5) + SIXTEENTH } as const;
export const FLIP_EDGE = at(3, 4.5) + THIRTY_SECOND;
export const SWAY_ECHO = { from: at(3, 4.5), to: at(4) } as const;
/** The confetti snap-rotate 45° on every 8th of break bar 3. */
export const CONFETTI_SNAPS: readonly number[] = steps(at(3), at(4), EIGHTH);

// ——— Break bar 4 · STEPS ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The mint block spins, grows ×6 and becomes the ground (a diamond wipe over 10 frames); a cream square pops into its old place. */
export const DIAMOND = at(4);
export const CREAM_SQUARE = at(4) + SIXTEENTH;
/** The ")" walks home: hops 1–8 on the 16ths, an onion copy at each; hop 9 lands in the right slot on the clap. */
export const HOPS: readonly number[] = steps(at(4), at(4, 3), SIXTEENTH).slice(0, 8);
export const HOP_HOME = at(4, 3);
/** The ＠ spin slows to a stop. */
export const SPIN_STOP = { from: at(4), to: at(4, 2) } as const;
/** E3: the re-roll — his eyes swap on each 32nd of break 4.2 (◎ ⊙ ● ×) and stop on 4.2&: (•ω□), the right eye a tofu box tagged `20 22`. */
export const REROLL: readonly number[] = steps(at(4, 2), at(4, 2.5), THIRTY_SECOND);
export const TOFU = at(4, 2.5);
/** E3: the system fetches U+2022 from /dev/galaxy; drop 1's galaxy streaks in from the upper right and lands in the eye on the clap. */
export const FETCH = TOFU + SIXTEENTH;
export const GALAXY = { from: FETCH, to: at(4, 3) } as const;
/** …and winds into the eye while the rescan bar sweeps his eyes from below: (－ω－), dazed. */
export const GALAXY_WIND = { from: at(4, 3), to: at(4, 3) + SIXTEENTH } as const;
export const RESCAN = { from: at(4, 3), to: at(4, 3) + SIXTEENTH } as const;
/** The left-eye fragment (the E2 shard again) pops out and dangles: `eye.L ✗ detached`. */
export const POP_OUT = at(4, 3.5);
/** The hang: everything stops and sags, the frame washes out; glitch slices; the gasp; `restarting [··········]`. */
export const HANG = at(4, 4);
export const SAG = { from: at(4, 4), to: at(4, 4.5) } as const;
export const HANG_GLITCH: readonly number[] = [at(4, 4), at(4, 4) + THIRTY_SECOND];
export const SHOCKED = at(4, 4) + THIRTY_SECOND;
export const RESTARTING = at(4, 4) + 2 * THIRTY_SECOND;
/** The colour-stack restart wipe: four panels in (one frame apart), the frame fully covered six frames in, clear on break 5.1. */
export const WIPE = { from: at(4, 4.5), to: at(5) } as const;
export const WIPE_COVER = WIPE.from + SIXTEENTH;

// ——— Break bar 5 · WHOLE ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** He is whole: (－ω－), the seams zip shut from the ω out, he un-squashes; a ✧ glints on ")"; the blocks spring back in. */
export const REVEAL = at(5);
export const HEAL = { from: at(5), to: at(5, 1.5) } as const;
export const GLINT = at(5) + 3 * THIRTY_SECOND;
/** He wakes: (•ω•). */
export const BLINK = at(5, 1.5);
/**
 * Break bar 5 has one decoration a beat (iteration 2, ruling 4: the review counted 5–6 focal points a frame): the fan on break 5.2, the
 * friends on 5.3, the outline ripple on 5.4 — each gone before the next one comes. (☆ω☆): the fan of eight copies opens, breathes on
 * 5.2&, and folds into him over 5.2's last 16th.
 */
export const FAN = at(5, 2);
export const FAN_BREATHS: readonly number[] = [at(5, 2.5)];
export const FAN_FOLD = { from: at(5, 3) - SIXTEENTH, to: at(5, 3) } as const;
/**
 * (⌒ω⌒)ﾉ waves and tosses a ☆ off the frame (the break's wink, replaced); the friends jump up onto the blocks and land, the guest slides
 * out and waves back, forgiven; the dancers change on break 5.3& and duck back behind their blocks over 5.3's last 16th.
 */
export const WAVE = at(5, 3);
export const FRIENDS = { from: WAVE, to: at(5, 4) } as const;
export const DANCERS_LAND = WAVE + SIXTEENTH;
export const DANCER_SWAPS: readonly number[] = [at(5, 3.5)];
export const FRIENDS_DUCK = { from: at(5, 4) - SIXTEENTH, to: at(5, 4) } as const;
/** (*≧ω≦*): the outline ripple fires out of him. */
export const RIPPLE = at(5, 4);
/** The callout (screen) signposts the cut: corner brackets, then edges (with the 15% dim outside), then its chip `zoom ×1.29`. */
export const CALLOUT = { from: at(5, 4.5), to: at(6) } as const;
export const CALLOUT_EDGES = at(5, 4.5) + THIRTY_SECOND;
export const CALLOUT_CHIP = at(5, 4.5) + 2 * THIRTY_SECOND;

// ——— Break bar 6 · SLINGSHOT (v04's bar 6: the skeleton draws it one bar later, in break 7, CARRIED below) ——————————————————————————————

/** (ง•ω•)ง✧ behind an extrude stack; his brows drop in, left then right: (ง•̀ω•́)ง✧. */
export const BROWS: readonly number[] = [at(6) + SIXTEENTH, at(6, 1.5)];
export const STACK_BREATHS: readonly number[] = [at(6, 1.5), at(6, 2.5)];
/** The stack's colours step one copy deeper on every 16th until the slingshot. */
export const STACK_CHASE: readonly number[] = steps(at(6), at(6, 3), SIXTEENTH);
/** E5: the system's window pops (`(；・∀・) party too loud`, [ OK ] [ LOUDER ]) and speaks to the last frame. */
export const WINDOW = { from: at(6, 1.5), to: BREAK_END } as const;
export const DIALOG = WINDOW.from;
/** E5: his right fist hits [ LOUDER ]; `LOUDER requires root` (the body card-flips); `sudo make it louder`, a word on each 16th. */
export const LOUDER = at(6, 2);
export const ROOT = at(6, 2.5);
export const SUDO: readonly number[] = steps(at(6, 3), at(6, 4), SIXTEENTH);
/** E5: the password line prints — showing `150bpm!!` on this one frame, `********` after. */
export const PASSWORD = at(6, 4) - THIRTY_SECOND;
/** E5: `access granted ヽ(°〇°)ﾉ`; then the volume gauge runs away and `[WARN] party overload` blinks. */
export const GRANTED = at(6, 4);
export const OVERLOAD = at(6, 4) + SIXTEENTH;
/**
 * The slingshot: he steps back on break 6.3, 6.3&, 6.4 and 6.4e; the band stretches; then he creeps back on the 32nds of the held
 * breath.
 */
export const SLINGSHOT: readonly number[] = [at(6, 3), at(6, 3.5), at(6, 4), at(6, 4) + SIXTEENTH];
export const CREEP: readonly number[] = steps(at(6, 4.5), BREAK_END, THIRTY_SECOND);
/** The band's tension pulses, peg to hero, on the 32nds of break 6.4. */
export const TENSION: readonly number[] = steps(at(6, 4), at(6, 4.5), THIRTY_SECOND);
/** Break 6.4&: the drums stop; nothing else does. A ✧ glint on his right fist. */
export const HELD = at(6, 4.5);
export const FIST_GLINT = at(6, 4.5) + 2 * THIRTY_SECOND;
/** E6: the screen catches thin-film light (fading in over the 8th from break 6.3) … */
export const FILM = { from: at(6, 3), to: at(6, 3.5) } as const;
/** … bulges toward him on each step of break 6.4 and each creep … */
export const FILM_BULGE: readonly number[] = [...SLINGSHOT.slice(2), ...CREEP];
/** … thins to black at its centre through the held breath … */
export const BLACK_FILM = { from: HELD, to: BREAK_END } as const;
/** … and pops on drop 2's downbeat (drawn by drop 2's scene, from src/shots/breakFilm.ts). */
export const POP = partStart('drop2');

// ——— Drums and music (break-sheet §5) ————————————————————————————————————————————————————————————————————————————————————————————

/** Half time in break bars 2–4, four on the floor in 5, the build in 6; no drums in bar 1 and none from break 6.4&. */
export const KICKS: readonly number[] = [
  at(2),
  at(3), at(3, 2.5),
  at(4), at(4, 2.5),
  at(5), at(5, 2), at(5, 3), at(5, 4),
  at(6), at(6, 2), at(6, 3), at(6, 3.5), at(6, 4), at(6, 4.25),
];
export const GHOST_KICKS: readonly number[] = [at(2, 2.5), at(4, 2)];
export const CLAPS: readonly number[] = [at(2, 3), at(3, 3), at(4, 3), at(5, 2), at(5, 4), at(6, 2), at(6, 3), at(6, 3.5), at(6, 4), at(6, 4.25)];
export const GHOST_SNARES: readonly number[] = [at(4, 2.25), at(4, 3.75)];
export const REVERSE_SNARE = { from: at(3, 4.5), to: at(4) } as const;
/** Open hats on the offbeat 8ths of break bar 5 and 6.1–6.2; a closed hat never sounds on an open hat's frame. */
export const OPEN_HATS: readonly number[] = [at(5, 1.5), at(5, 2.5), at(5, 3.5), at(5, 4.5), at(6, 1.5), at(6, 2.5)];
export const CLOSED_HATS: readonly number[] = [
  at(3), at(3, 1.5), at(3, 2), at(3, 2.5), at(3, 3), at(3, 3.5), at(3, 4.5),
  ...steps(at(4), at(4, 4), SIXTEENTH),
  ...steps(at(5), at(6), SIXTEENTH),
  ...steps(at(6), at(6, 4), SIXTEENTH),
  ...TENSION,
].filter((h) => !OPEN_HATS.includes(h));
/** The glass hats: a tink on the offbeats of break bars 2–4 (bar 2: 2.1& also knocks; bar 4: 4.3& also pops the eye out). */
export const GLASS_HATS: readonly number[] = [
  at(2, 1.5), at(2, 2.5), at(2, 3.5), at(2, 4.5),
  at(3, 1.5), at(3, 2.5), at(3, 3.5), at(3, 4.5),
  at(4, 1.5), at(4, 2.5), at(4, 3.5),
];
/** Drop 1's hook rebuilt note by note: 2 notes in break bar 2, 4 in 3, 6 in 4, all of HOOK[3] in 5, the first half of HOOK[4] in 6. */
export const HOOK: readonly number[] = [
  at(2), at(2, 3),
  at(3), at(3, 1.75), at(3, 3), at(3, 4),
  at(4), at(4, 1.5), at(4, 1.75), at(4, 2.5), at(4, 3), at(4, 4),
  at(5), at(5, 1.5), at(5, 1.75), at(5, 2.5), at(5, 3), at(5, 3.75), at(5, 4), at(5, 4.5),
  at(6), at(6, 1.5), at(6, 1.75), at(6, 2.5),
];
/** The chord changes (the sub follows the roots): C9sus4, C9, Am9, Dm9, B♭maj9, C9sus4, C♯9sus4. */
export const CHORDS: readonly number[] = [at(2), at(2, 3), at(3), at(4), at(5), at(6), at(6, 3)];
/**
 * The glass pad sounds under the whole fall, from break 1.1 (iteration 2, ruling 1: it came in on 1.2 and break bar 1 sat 12 LU under
 * drop 1's last bar, −21.6 LUFS, like the track cutting out), over a low sub tail of the thoom; the reverse cymbal, the sub swell and
 * the swarm rise into the impact.
 */
export const GLASS_PAD = { from: at(1), to: at(2) } as const;
export const SUB_TAIL = { from: at(1), to: at(1, 3) } as const;
export const REVERSE_CYMBAL = { from: at(1, 3), to: at(2) } as const;
export const SWARM = { from: at(1, 4), to: at(2) } as const;
/** The hang's tape stop (the music bus silent from the wipe), the hung buzz, the power-on under the wipe. */
export const TAPE_STOP = { from: HANG, to: WIPE.from } as const;
export const HUNG_BUZZ = { from: SHOCKED, to: SHOCKED + 2 * THIRTY_SECOND } as const;
export const POWER_ON = WIPE;
/** The 8-bit arp: break bar 4 (to the hang), bar 5, bar 6 to the slingshot; then the glass motif rising (16ths) and the 32nd race. */
export const ARPS: readonly { from: number; to: number }[] = [
  { from: at(4), to: HANG },
  { from: at(5), to: at(6) },
  { from: at(6), to: at(6, 3) },
];
export const MOTIF_UP: readonly number[] = steps(at(6, 3), at(6, 4), SIXTEENTH);
export const ARP_RACE: readonly number[] = steps(at(6, 4), BREAK_END, THIRTY_SECOND);
/** Break bar 6 from the slingshot: the vox climbs on each step, then "hup!" as the drums stop; the riser, the rubber band, the high-pass suck. */
export const VOX_STEPS: readonly number[] = SLINGSHOT;
export const HUP = HELD;
export const RISER = { from: at(6), to: BREAK_END } as const;
export const RUBBER_BAND = { from: at(6, 3), to: BREAK_END } as const;
export const HP_SUCK = { from: at(6, 4.5) + 2 * THIRTY_SECOND, to: BREAK_END } as const;

// ——— Camera energy ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** v04's camera energy (the as-built rig: punches only, 0.01–0.045; never a shake or a white flash). */
export const V04_ACCENTS: readonly EnergyAccent[] = [
  { at: BREAK_START, punch: 0.015 },
  { at: IMPACT, punch: 0.04 },
  { at: at(2, 2.5), punch: 0.01 },
  { at: at(3), punch: 0.02 },
  { at: at(3, 2.5), punch: 0.015 },
  { at: at(4), punch: 0.025 },
  { at: at(4, 2), punch: 0.01 },
  { at: at(4, 2.5), punch: 0.015 },
  // Break bar 5 (iteration 2, ruling 4): the music's loudest bar so far gets the break's biggest punches — the reveal first.
  { at: REVEAL, punch: 0.045 },
  { at: at(5, 2), punch: 0.04 },
  { at: at(5, 3), punch: 0.04 },
  { at: at(5, 4), punch: 0.04 },
  { at: MATCH_CUT, punch: 0.02 },
  { at: LOUDER, punch: 0.02 },
  { at: at(6, 3), punch: 0.015 },
  { at: at(6, 3.5), punch: 0.015 },
  { at: at(6, 4), punch: 0.01 },
  { at: at(6, 4.25), punch: 0.01 },
];

/**
 * The skeleton's rig for the carried-over slingshot: v04's bar-6 accents again one bar later, where the stub plays it in break 7 — the
 * pipeline punches the output frame, while the as-built launch reads its own rig at its v04 instants (the film's screen-fixed
 * counter-zoom, the uppercut's solve), so both copies are needed while the stub draws (LAUNCH_V2 off). BREAK_ACCENTS (below ACCENTS_V2)
 * picks per part.
 */
export const CARRIED_ACCENTS: readonly EnergyAccent[] = V04_ACCENTS.filter((a) => a.at >= MATCH_CUT).map((a) => ({ ...a, at: a.at + FRAMES_PER_BAR }));

/** The break's character flashes (字符闪), merged by src/score/cuts.ts: none — the break has no hard cut in a drop (director's ruling 10). */
export const BREAK_GLYPHS: readonly GlyphFlash[] = [];

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// v2 — the 8-bar interlude (sheet §3; the design's film frames on the 58-bar map are part-local here: design frame − 2496)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ——— Bounds, bars, parts, cuts ————————————————————————————————————————————————————————————————————————————————————————————————————

/** The break's end: drop 2's downbeat (partEnd('break')), where drop 2 pops the film. The break span (src/score/spans.ts) runs to here. */
export const BREAK_END_V2 = partEnd('break');
/** The eight downbeats: 1 FALL, 2 IRIS, 3 LOOP, 4 STEPS, 5 WHOLE, 6 GRAPH, 7 SLING, 8 FAKE DROP. */
export const BREAK_BARS_V2: readonly number[] = partBars('break').map((_, i) => at(i + 1));
/** C7: the whip's hidden cut, inside break 6.4a (a segment boundary under 64 sub-frames of whip): the graph ends, the launch begins. */
export const WHIP_CUT = at(6, 4.875);
/** C8: the hard cut to the reverse angle (the shot from the target), on break 8.1: a segment boundary inside the launch. */
export const REVERSE = at(8);
/** The four parts of the break scene (src/scenes/break.ts dispatches by them); every boundary is a segment boundary. */
export type BreakPartName = 'fall' | 'flat' | 'graph' | 'launch';
export const BREAK_PARTS: readonly { name: BreakPartName; from: number; to: number }[] = [
  { name: 'fall', from: BREAK_START, to: at(2) },
  { name: 'flat', from: at(2), to: at(6) },
  { name: 'graph', from: at(6), to: WHIP_CUT },
  { name: 'launch', from: WHIP_CUT, to: BREAK_END_V2 },
];
/** The part that holds instant (or output frame) `frame`; instants outside the break go to the nearer end. */
export function breakPartAt(frame: number): BreakPartName {
  const p = BREAK_PARTS.find((x) => frame >= x.from && frame < x.to);
  return p ? p.name : frame < BREAK_START ? 'fall' : 'launch';
}
/**
 * The editing plan's cut points (sheet §5), C0–C9: C0 the club's frame continues into the fall; C1 the slap (continuous, a segment
 * boundary); C2 the scan-wipe into the antivirus's POV; C3 the hard cut back; C4 shape becomes ground; C5 the restart wipe; C6 the hard
 * match cut carried by the selection; C7 the whip's hidden cut; C8 the reverse angle; C9 the pop (drop 2 draws it).
 */
export const CUTS_V2 = {
  C0: BREAK_START,
  C1: at(2),
  C2: at(3, 3.5),
  C3: STUTTER_END,
  C4: at(4),
  C5: at(5),
  C6: at(6),
  C7: WHIP_CUT,
  C8: REVERSE,
  C9: BREAK_END_V2,
} as const;

// ——— The skeleton's carried-over launch (until the sling and fake-drop builders re-time it natively) ————————————————————————————————

/** Where v04's bar 6 (the slingshot) plays now: break 7, one bar later (the design's "old 26.1–26.3 + 672"). */
export const CARRIED = { from: at(7), to: at(8) } as const;
/** A hold of instant `h`: instant f shows h, its sub-frame offset kept (as heldFrame does for a held tail). */
const holdAt = (h: number, f: number): number => h + (f - Math.round(f));
/**
 * The v04 instant the skeleton's launch stub shows at instant f of the launch part: the whip's tail [WHIP_CUT, break 7.1) holds v04's
 * first launch frame (MATCH_CUT); break 7 plays v04's bar 6 (f − one bar: every v04 frame of the slingshot at its new place, pixel for
 * pixel); break 8 holds v04's last frame (BREAK_END − 1), as the held tail did. Instants before the launch are returned as they are.
 */
export function carriedInstant(f: number): number {
  if (f < WHIP_CUT) return f;
  if (f < CARRIED.from) return holdAt(MATCH_CUT, f);
  if (f < CARRIED.to) return f - FRAMES_PER_BAR;
  return holdAt(BREAK_END - 1, f);
}
/**
 * The instant v04's launch functions (src/shots/breakLaunch.ts, breakShared.ts breakCam) evaluate for instant f: heldFrame, and from v04's
 * end on (BREAK_END) its last frame — so drop 2, reading the break's state on its downbeat − 1, reads exactly the frame the skeleton holds
 * there (v04's last). The launch builder retires it when the break's last frame is native (sheet §4.3).
 */
export const asBuiltHeld = (f: number): number => {
  const h = heldFrame(f);
  return h >= BREAK_END ? holdAt(BREAK_END - 1, h) : h;
};

// ——— Break bar 2 · IRIS (v2 additions: the travelling camera, three depths, the floor band, the antivirus's hand) ————————————————————

/** The pooled world gets its floor band (darker cream, world y 900–1100): the coral and mint stand on it, the litter will lie on it. */
export const FLOOR_BAND = at(2, 2);
/** The three pale far blobs rise in the back depth (L, 12 f). */
export const FAR_BLOBS = at(2, 2);
/**
 * The red marquee (marching ants, 8 handles) snaps round his core; the red cursor grabs its top-right handle and rotates the selection
 * −70° (the as-built iris opening, now done by the antivirus); on 2.2& he pulls back, the dashes snap and scatter; gone on the lock.
 */
export const MARQUEE = { from: at(2, 2), to: at(2, 3) } as const;
/** The yellow pill, knocked off its perch by the lock's ring: slides 140 px down-right turning −20°, lands (I) with a thud (mess 1). */
export const PILL_DROP = { from: at(2, 3), to: at(2, 3.5) } as const;

// ——— The antivirus's work orders T0–T9 (the as-built tags re-voiced; their ID chips spell the signature) ——————————————————————————————

/**
 * The work orders T0–T9: popped (`from`) until torn or swept (`to`). IDs (src/content/break.ts ORDER_TEXTS) read E2 80 A2 20 CF 89 20 E2 80
 * A2 in order. T0, T1 torn by the lock; T2 swatted by the card flip; T3, T4 torn by the landing and the galaxy; T5–T7 swept by the restart
 * wipe; T8 folds with the marquee in the editor; T9 torn by the whip. At most 4 on screen at once (T7's copies aside).
 */
export const ORDERS: readonly { from: number; to: number }[] = [
  { from: at(2, 1.5), to: at(2, 3) }, // T0 #E2 quarantine eye.L → viewer ✓
  { from: at(2, 2), to: at(2, 3) }, // T1 #80 removing face.core ✓
  { from: at(2, 4.5), to: at(3, 4.75) }, // T2 #A2 removing bracket.L ✓ → bracket.L flipped ✓
  { from: at(4, 1.5), to: at(4, 3) }, // T3 #20 removing bracket.R ✓
  { from: at(4, 2), to: at(4, 3) }, // T4 #CF replacing eye.* ✓ retry 2…5 → deleting U+2022 ✓
  { from: at(4, 3.25), to: WIPE.from }, // T5 #89 rescan: sedate ✓
  { from: at(4, 3.5), to: WIPE.from }, // T6 #20 removing eye.L ✓ (again)
  { from: at(4, 3.75), to: WIPE.from }, // T7 #E2 remove(remove(remove)) ✓
  { from: at(5, 4.75), to: at(6, 1.5) }, // T8 #80 select (•ω•) · threats 2 (screen; carried across C6, folds 6.1a → 6.1&)
  { from: at(6, 4.5), to: WHIP_CUT }, // T9 #A2 rewind (•ω•) → 0 ✓ (torn by the whip on 6.4a)
];
/** Retypes: T2 `bracket.L flipped ✓` (3.3); T4 `retry 3`, `4`, `5` (the re-roll's 32nds) and `deleting U+2022 ✓` (4.2&). */
export const ORDER_RETYPES: readonly number[] = [at(3, 3), at(4, 2.125), at(4, 2.25), at(4, 2.375), at(4, 2.5)];
/** T7 copies itself at (+10, +10), twice (1-frame RGB split): the only copy-burst of the interlude. */
export const ORDER_COPIES: readonly number[] = [at(4, 3.75), at(4, 3.875)];
/** A tear (the tag splits on a jagged line, both halves flutter down onto the floor band and stay; an amber spark): T0 + T1, T2, T3 + T4, T9. */
export const TEARS: readonly number[] = [at(2, 3), at(3, 4.75), at(4, 3), at(6, 4.75)];

/** The party monitor, re-voiced (sheet §9.3): a line or a count changes on each of these (src/content/break.ts MONITOR_ROWS_V2, in order). */
export const MONITOR_LINES_V2: readonly number[] = [
  at(2, 4), at(2, 4.5),
  at(3, 3), at(3, 4.75),
  at(4, 1.5), at(4, 2), at(4, 2.125), at(4, 2.25), at(4, 2.375), at(4, 2.5), at(4, 2.75), at(4, 3), at(4, 3.25), at(4, 3.5), at(4, 3.75), at(4, 4), at(4, 4.25),
  at(5),
];

// ——— The red cursor (the antivirus's hand: a 72 px red arrow on the screen layer) ———————————————————————————————————————————————————

/** Where it acts (sheet §3.10): the marquee and rotate; the bracket's drag (in on 2.4&, slam, out left by 3.3&); T3; the re-roll and the delete; the triple → busy-spinners (frozen to the wipe); the select → letting go in the editor; the rewind and the fling; the OK attempt, the bonk, the hover, ⊘ dropping off. */
export const CURSOR_ACTS: readonly { from: number; to: number }[] = [
  { from: at(2, 2), to: at(2, 3) },
  { from: at(2, 4.5), to: at(3, 3.5) },
  { from: at(4, 1.5), to: at(4, 1.75) },
  { from: at(4, 2), to: at(4, 2.75) },
  { from: at(4, 3.75), to: WIPE.from },
  { from: at(5, 4.5), to: at(6, 1.25) },
  { from: at(6, 4.25), to: WHIP_CUT },
  { from: at(7, 1.75), to: at(7, 4.5) },
];
/** Its dry clicks: grab the marquee, grab the bracket, T3, the four reels, the triple, the select, letting go in the editor, the rewind. */
export const CURSOR_CLICKS: readonly number[] = [at(2, 2), at(3), at(4, 1.5), ...steps(at(4, 2), at(4, 2.5), THIRTY_SECOND), at(4, 3.75), at(5, 4.5), at(6), at(6, 4.5)];

// ——— Break bar 3 · LOOP (v2: the drag, the floor tilt and the heap, the antivirus's POV) ————————————————————————————————————————————

/** The guest peeks in from the left frame edge (red `|_￣))`), watching the slam — moved from v04's 3.3& slot, since 3.3& is now the POV. */
export const GUEST_PEEK_V2 = { from: at(3, 2.5), to: at(3, 3.5) } as const;
/** One peeker at a time (v2): the dog, the waver, the guest (moved), the uneasy one; v04's 4.2& and 4.3& peekers are cut (clutter). */
export const PEEKS_V2: readonly { from: number; to: number }[] = [PEEKS[0], PEEKS[1], GUEST_PEEK_V2, PEEKS[3]];
/** THE FLOOR TILTS (mess 2): the floor band and what stands on it rotate −10° about (960, 1000) (L); the camera never rolls. */
export const TILT = at(3, 3);
/** The coral, the mint and the litter skid ≈ 120 px downhill (ease-in quad) and pile up at the low end, landing (I, thud) on the HEAP. */
export const SKID = { from: at(3, 3), to: at(3, 3.5) } as const;
export const HEAP = at(3, 3.5);
/** He wobbles ±4° (sine) instead of the camera swaying: the world is crooked under him (v04's SWAY window, moved into him). */
export const WOBBLE = SWAY;
/** The antivirus's POV, one beat: the red scanline sweeps down (3.3& + 3 f), the X-ray behind it; hard cut back on 3.4& (C3). */
export const POV = { from: at(3, 3.5), to: STUTTER_END } as const;
export const POV_SWEEP = { from: at(3, 3.5), to: at(3, 3.5) + THIRTY_SECOND } as const;
/** The reticle: on the ω (`access denied`), on the flipped bracket, then locking onto eye.L in four 32nds (220 → 130 px; the stutter). */
export const POV_LOCKS: readonly number[] = [at(3, 3.5), at(3, 3.75), ...STUTTER];
/** The scanner hum, J-cut a 32nd before the POV; the CRT tick as it switches off. */
export const SCANNER_HUM = { from: at(3, 3.5) - THIRTY_SECOND, to: STUTTER_END } as const;

// ——— Break bar 4 · STEPS (v2: wide and low, the world re-roll, the tofu block, the crash zoom, the red rescan, the tip) ————————————

/** The world re-rolls with his eyes: every block's fill cycles yellow → violet → mint → coral, one sharp swap per tick. */
export const WORLD_REROLL: readonly number[] = REROLL;
/** …and lands wrong (mess 3): yellow ↔ violet, the coral as it was, the cream square a tofu block (cream, ink outline, an ink X). */
export const TOFU_BLOCK = TOFU;
/** The crash zoom into the tofu eye (L, 6 f: Z 0.90 → 1.65), and its whoosh rising into it. */
export const CRASH_ZOOM = { from: at(4, 2.5), to: at(4, 2.75) } as const;
export const CRASH_WHOOSH = { from: at(4, 2.25), to: at(4, 2.5) } as const;
/** The antivirus answers with a red scanline up the eye band (720 → 440 in 6 f): (－ω－), sedated (v04's rescan, re-voiced red). */
export const RED_RESCAN = RESCAN;
/** T5 `rescan: sedate ✓` pops top-right. */
export const SEDATE = at(4, 3.25);
/** The frenzy: three red cursors jitter round his face; T7 copies itself. */
export const TRIPLE = at(4, 3.75);
/** The hang, bigger: the world sags 60 px, the crooked coral tips over 30° (mess 4), the three cursors freeze into busy-spinners. */
export const TIP = HANG;

// ——— Break bar 5 · WHOLE (v2: the pull-out, the arc, the guest infected, the selection, the size match into C6) ————————————————————

/** The pull-out on the kick (L, Z 1.45 → 1.00): the hit, so no rig punch on 5.1; then the slow lateral arc. */
export const PULL_OUT = { from: at(5), to: at(5, 1.5) } as const;
export const ARC = { from: at(5, 1.5), to: at(5, 4.5) } as const;
/** The guest (red (￣▽￣), em 112) slides out beside the cat on 5.3 and spies, until he ducks out after his wave. */
export const GUEST_SPY = { from: at(5, 3), to: at(5, 4.75) } as const;
/** The ripple outline that crosses him flashes amber where it crosses (3 f) … */
export const INFECT_FLASH = { from: at(5, 4.125), to: at(5, 4.25) } as const;
/** … and his ▽ flips to an amber ω: (￣ω￣)ノ (the infection bloop). */
export const INFECT = at(5, 4.25);
/** One wave (+15°, back), then he ducks behind the violet block (cubic in). */
export const GUEST_WAVE_V2 = { from: at(5, 4.375), to: at(5, 4.625) } as const;
export const GUEST_DUCK = { from: at(5, 4.625), to: at(5, 4.75) } as const;
/**
 * The antivirus's core selects him (v04's callout window, re-voiced): the red marquee's corner brackets snap in, its edges draw out (with the
 * 15 % dim outside), its chip T8 types; (⊙ω⊙). The camera eases (cubic in-out, 8 f from SELECT.from) to Z 0.85 so his apparent em matches
 * the car's on 6.1 (C6, ×1.00).
 */
export const SELECT = CALLOUT;
export const SELECT_EDGES = CALLOUT_EDGES;
export const SELECT_CHIP = CALLOUT_CHIP;
export const SIZE_EASE = CALLOUT.from;
/** The editor's UI pop, J-cut a 32nd before C6; the chip's two key presses. */
export const UI_POP = at(5, 4.875);
export const CHIP_KEYS: readonly number[] = [at(5, 4.75), at(5, 4.875)];

// ——— Break bar 6 · GRAPH (new: the graph-editor rollercoaster) ——————————————————————————————————————————————————————————————————————

/** The bar: from C6 (the editor opens on the kick) to the whip's hidden cut. */
export const GRAPH = { from: at(6), to: WHIP_CUT } as const;
/**
 * The ten keyframes, on the bar's drum hits; their values are the signature E2 80 A2 20 CF 89 20 E2 80 A2 (src/content/break.ts
 * GRAPH_VALUES): k1 K (top), k2 oh, k3 h, k4 K + C (bottom), k5 K (crest), k6 oh, k7 K + C (bottom), k8 K, k9 K + oh, k10 K (dragged).
 */
export const GRAPH_KEYS: readonly number[] = [at(6), at(6, 1.5), at(6, 1.75), at(6, 2), at(6, 3), at(6, 3.5), at(6, 4), at(6, 4.25), at(6, 4.5), at(6, 4.75)];
/** The chrome assembles (L, staggered 1 f), the marquee shrinks with him (L), the car pops in under him; the reveal (Z 1.60 → 0.80, L). */
export const CHROME = { from: at(6), to: at(6, 1.25) } as const;
export const GRAPH_REVEAL = { from: at(6), to: at(6, 1.5) } as const;
/** The selection folds away with T8. */
export const SELECT_FOLD = { from: at(6, 1.25), to: at(6, 1.5) } as const;
/** All five hex chips (E2 80 A2 20 CF) show together through the reveal, then fold; from then on each pops as he passes its key. */
export const CHIPS_REVEAL = { from: at(6), to: at(6, 1.75) } as const;
export const CHIPS_FOLD = { from: at(6, 1.75), to: at(6, 2) } as const;
/** The ride: the camera locked to the playhead (x), a clamped spring (y), a spring bank. */
export const RIDE = { from: at(6, 1.5), to: at(6, 4.5) } as const;
/** \(★ω★)/: arms up. */
export const ARMS_UP: readonly number[] = [at(6, 1.25), at(6, 3.25)];
/** The two plunges (a whistle each) and the two bottoms on the backbeats (G-squash, sparks, the vox scooping / bending into them). */
export const PLUNGES: readonly { from: number; to: number }[] = [
  { from: at(6, 1.75), to: at(6, 2) },
  { from: at(6, 3.5), to: at(6, 4) },
];
export const BOTTOMS: readonly number[] = [at(6, 2), at(6, 4)];
/** The lift hill: one ratchet notch per chain click on the 16th hats ((｀・ω・´) from the first). */
export const LIFT = { from: at(6, 2.25), to: at(6, 3) } as const;
export const CHAIN_CLICKS: readonly number[] = [at(6, 2.25), at(6, 2.5), at(6, 2.75)];
/** The crest: airtime, (✧ω✧), the train hangs. */
export const CREST = at(6, 3);
/** The segment labels pop: `easeInQuart`, `easeInCubic`, the red `easeInBack`. */
export const LABELS: readonly number[] = [at(6, 1.75), at(6, 3.5), at(6, 4.5)];
/** The elastic rattle on the 16th fill (his eyes swap every 3 f); the red cursor swoops in toward k10. */
export const RATTLE = { from: at(6, 4.25), to: at(6, 4.5) } as const;
/** THE REWIND: the cursor drags k10 back past k9 and below 0x00 — the red easeInBack hook; k10's handles stretch behind him into a V; T9. */
export const REWIND = { from: at(6, 4.5), to: at(6, 4.75) } as const;
/** The camera swings left ahead of him (his ω x 740 → ≈ 1000). */
export const SWING = { from: at(6, 4.5), to: at(6, 4.5) + THIRTY_SECOND } as const;
/** FLUNG: the cursor flicks k10 and lets go; the chrome tears off at the edges; the whip (64 sub-frames) with its hidden cut. */
export const FLING = at(6, 4.75);
export const CHROME_TEAR = { from: FLING, to: WHIP_CUT } as const;
export const WHIP = { from: at(6, 4.5) + THIRTY_SECOND, to: at(7) } as const;

// ——— Break bar 7 · SLING (v04's slingshot one bar later, extended: the concertina, the braced Y, the V cords, the notches) ——————————

/** The bar. */
export const SLING = { from: at(7), to: at(8) } as const;
/** CAUGHT on the kick: the band takes his momentum; the four cars ram his back and concertina into the extrude stack (offset 0 → 13 → 9 px, L 6 f). */
export const CATCH = at(7);
export const CONCERTINA = { from: at(7), to: at(7) + SIXTEENTH } as const;
/** v04's events, one bar later: the brows, the stack's breaths and chase, the dialog, LOUDER, root, sudo, the password, access granted. */
export const BROWS_V2: readonly number[] = BROWS.map((f) => f + FRAMES_PER_BAR);
export const STACK_BREATHS_V2: readonly number[] = STACK_BREATHS.map((f) => f + FRAMES_PER_BAR);
export const STACK_CHASE_V2: readonly number[] = STACK_CHASE.map((f) => f + FRAMES_PER_BAR);
export const DIALOG_V2 = DIALOG + FRAMES_PER_BAR;
export const LOUDER_V2 = LOUDER + FRAMES_PER_BAR;
export const ROOT_V2 = ROOT + FRAMES_PER_BAR;
export const SUDO_V2: readonly number[] = SUDO.map((f) => f + FRAMES_PER_BAR);
export const PASSWORD_V2 = PASSWORD + FRAMES_PER_BAR;
export const GRANTED_V2 = GRANTED + FRAMES_PER_BAR;
/** The window speaks from the dialog to the break's last frame (printed on the film through break 8). */
export const WINDOW_V2 = { from: DIALOG_V2, to: BREAK_END_V2 } as const;
/** The red cursor slides in toward [ OK ] (it would click it 3 f after LOUDER) — and is bonked by the uppercut, spinning away up-left. */
export const CURSOR_OK = { from: at(7, 1.75), to: LOUDER_V2 } as const;
export const BONK = { from: LOUDER_V2, to: ROOT_V2 } as const;
/** It comes back and hovers by the window, shaking ±4 px every 2 f. */
export const HOVER = { from: ROOT_V2, to: at(7, 3) } as const;
/** ─=≡Σ((( つ•̀ω•́)つ: his right つ closes over the cords; the stack becomes the band (its brackets fly onto the cords as 8 links). */
export const GRIP = at(7, 3);
export const LINK_FLIGHT = { from: GRIP, to: GRIP + SIXTEENTH } as const;
/** A 4 px creep; a ripple runs down the links, a frame late per link. */
export const LINK_RIPPLE = at(7, 3.5);
/** `access granted`: the red cursor turns into ⊘, greys and drops off the bottom. */
export const DENIED = { from: GRANTED_V2, to: at(7, 4.5) } as const;
/** The readout milestone: `[ROOT] uid=0 (•ω•)`. */
export const ROOT_ROW = GRANTED_V2 + SIXTEENTH;
/** Full draw: `volume … 113%` and `[WARN] party overload` (blinking 3/3 f) — v04's overload moved to the last notch. */
export const OVERLOAD_V2 = at(7, 4.5);
/** One notch per kick: he steps back into depth (em 360 → 324 → 292 → 262 → 236) and the camera pulls back (Z 1.55 → 0.62) until the slingshot reads whole. */
export const NOTCHES: readonly number[] = [LOUDER_V2, GRIP, GRANTED_V2, OVERLOAD_V2];
/** Tension pulses fork → him: on the grip, and on every 32nd of full draw. */
export const TENSION_V2: readonly number[] = [GRIP, ...steps(OVERLOAD_V2, at(8), THIRTY_SECOND)];

// ——— Break bar 8 · FAKE DROP (aimed at us) ————————————————————————————————————————————————————————————————————————————————————————

/** The bar. */
export const FAKE_DROP = { from: REVERSE, to: BREAK_END_V2 } as const;
/** The reverse angle settles into the aim (C (1140, 448) → (960, 540), F). */
export const AIM = { from: REVERSE, to: at(8, 2) } as const;
/** The screen catches the light: thin-film colour fades in (only where thin, never on ink or him). */
export const FILM_IN = { from: REVERSE + THIRTY_SECOND, to: at(8, 1.5) } as const;
/** The volume row: 116 % (3 f after the cut, so the window is pixel-identical across C8), 119 %, 122 %, 125 %. */
export const VOLUME_STEPS: readonly number[] = [REVERSE + THIRTY_SECOND, at(8, 2), at(8, 2.5), at(8, 2.875)];
/** The creeps back into the depth (em 230, 220, 212, then a 32nd each: 206 / 200 / 194 / 188); the film's suction deepens on each. */
export const CREEPS: readonly number[] = [at(8, 1.5), at(8, 2), at(8, 2.25), ...steps(at(8, 2.5), at(8, 3), THIRTY_SECOND)];
export const SUCTION = { from: at(8, 1.5), to: at(8, 3) } as const;
/** THE HELD BREATH: the drums stop, "hup!"; a white tension pulse down each arm per 32nd; a ✧ glint on his right fist. */
export const HELD_V2 = at(8, 2.5);
export const HUP_V2 = HELD_V2;
export const TENSION_34: readonly number[] = steps(HELD_V2, at(8, 3), THIRTY_SECOND);
export const FIST_GLINT_V2 = at(8, 2.75);
/** RELEASE on the beat where the drop should land: the music cut dead; he flies at the camera; the band snaps into one straight line at y 540 and is plucked (40 → 0 px). */
export const RELEASE = at(8, 3);
export const FORK_PASS = RELEASE + THIRTY_SECOND;
export const PLUCK = { from: FORK_PASS, to: at(8, 4) } as const;
/** SPLAT: the film flips into a dome toward us and catches him like a trampoline; the gloat types under the bwomp (3 characters a frame, done GLOAT_DONE). */
export const SPLAT = at(8, 3.25);
export const DOME = { from: SPLAT, to: at(8, 4) } as const;
export const GLOAT = SPLAT;
export const GLOAT_DONE = SPLAT + 3 * THIRTY_SECOND;
/** THE LOOK: digital silence from here; his eyes un-squeeze, ( ・ω・)? — the "?" pops a 32nd later — held 15 frames whole. */
export const LOOK = at(8, 3.75);
export const QMARK = LOOK + THIRTY_SECOND;
/** He gets it: the "?" pops out, his brows drop (ˋ, then ˊ) and his ω eats a black spot into the film, one sharp step per 32nd (45 → 180 px). */
export const GETS_IT = at(8, 4.5);
export const BROWS_34: readonly number[] = [GETS_IT, GETS_IT + THIRTY_SECOND];
export const BLACK_STEPS: readonly number[] = steps(GETS_IT, BREAK_END_V2, THIRTY_SECOND);
/** S4, the dead air: digital zero to drop 2's downbeat (a CUT on its first frame; no pip). */
export const SILENCE = { from: LOOK, to: BREAK_END_V2 } as const;

// ——— Drums and music (v2: sheet §7; the design's §8) ————————————————————————————————————————————————————————————————————————————————

/** v04's bars 2–5 as built; 6 the coaster's four on the floor with a 16th kick fill; 7 the notches' kicks; 8 accelerating (8th, 8th, 16th). */
export const KICKS_V2: readonly number[] = [
  ...KICKS.filter((k) => k < MATCH_CUT),
  at(6), at(6, 2), at(6, 3), at(6, 4), at(6, 4.25), at(6, 4.5), at(6, 4.75),
  CATCH, ...NOTCHES,
  REVERSE, at(8, 1.5), at(8, 2), at(8, 2.25),
];
export const GHOST_KICKS_V2: readonly number[] = GHOST_KICKS;
export const CLAPS_V2: readonly number[] = [
  ...CLAPS.filter((c) => c < MATCH_CUT),
  at(6, 2), at(6, 4),
  LOUDER_V2, GRIP, GRANTED_V2,
  REVERSE, at(8, 1.5), at(8, 2), at(8, 2.25),
];
export const GHOST_SNARES_V2: readonly number[] = GHOST_SNARES;
export const OPEN_HATS_V2: readonly number[] = [...OPEN_HATS.filter((h) => h < MATCH_CUT), at(6, 1.5), at(6, 3.5), at(6, 4.5), at(7, 1.5), at(7, 2.5), at(7, 3.5)];
/** Closed hats: v04's to bar 5; the coaster's 16ths (6.1 → 6.4, its 6.2e–6.2a the chain clicks); the sling's 16ths; bar 8's 32nds into the held breath. */
export const CLOSED_HATS_V2: readonly number[] = [
  ...CLOSED_HATS.filter((h) => h < MATCH_CUT),
  ...steps(at(6), at(6, 4), SIXTEENTH),
  ...steps(at(7), at(8), SIXTEENTH),
  ...steps(at(8, 2), HELD_V2, THIRTY_SECOND),
].filter((h) => !OPEN_HATS_V2.includes(h));
/** Light crashes: v04's (the impact, the loop's launch, the reveal) and the coaster's top and two bottoms. */
export const CRASHES_V2: readonly number[] = [IMPACT, BRACKET_LAUNCH, REVEAL, at(6), ...BOTTOMS];
/** The hook rebuilt: 2, 4, 6 notes in bars 2–4, HOOK[3] whole in 5 (v04), then HOOK[4] whole in 6 on vox + bell (its [2] scooped −7 st into 6.2, its [4] bent −5 st into 6.4). */
export const HOOK_V2: readonly number[] = [...HOOK.filter((h) => h < MATCH_CUT), at(6), at(6, 1.5), at(6, 1.75), at(6, 2.5), at(6, 3), at(6, 4), at(6, 4.5)];
/** One climbing vox note per step back (A5 C6 D6 F6), then bar 8's (G♯5 B5 C♯6 D♯6) and "hup!" (C♯6 → F♯6). */
export const VOX_STEPS_V2: readonly number[] = NOTCHES;
export const VOX_34: readonly number[] = [REVERSE, at(8, 1.5), at(8, 2), at(8, 2.25)];
/** C9sus4, C9, Am9, Dm9, B♭maj9 (v04); C9sus4 → C9 (6.3); Am9 → C9sus4 (7.3); C♯9sus4 on 8.1 (every voice glides up a semitone over 6 f), over a C♯2 drone. */
export const CHORDS_V2: readonly number[] = [...CHORDS.filter((c) => c < MATCH_CUT), at(6), at(6, 3), at(7), at(7, 3), REVERSE];
export const DRONE = { from: REVERSE, to: RELEASE } as const;
/** The 8-bit arp (v04 in bars 4–5; the coaster's C9sus4 16ths to 6.4; the sling's Am9 to the grip and C9sus4 from access granted). */
export const ARPS_V2: readonly { from: number; to: number }[] = [...ARPS.filter((a) => a.to <= MATCH_CUT), { from: at(6), to: at(6, 4) }, { from: at(7), to: GRIP }, { from: GRANTED_V2, to: REVERSE }];
/** The glass motif reversed and rising (D5 F5 A5 B♭5) on the sudo 16ths; a semitone up on 8.1 (D♯5 F♯5 A♯5 B5); the 32nd race (D♯5 … B6). */
export const MOTIF_UP_V2: readonly number[] = SUDO_V2;
export const MOTIF_34: readonly number[] = steps(REVERSE, at(8, 2), SIXTEENTH);
export const ARP_RACE_V2: readonly number[] = steps(at(8, 2), RELEASE, THIRTY_SECOND);
/** The riser and the rubber band (300 Hz, +1 st per step) from the catch; the reversed crash and the high-pass suck into the release (both peak on its last frame). */
export const RISER_V2 = { from: CATCH, to: RELEASE } as const;
export const RUBBER_BAND_V2 = { from: CATCH, to: RELEASE } as const;
export const REV_CRASH = { from: at(8, 1.5), to: RELEASE } as const;
export const HP_SUCK_V2 = { from: at(8, 2.75), to: RELEASE } as const;
/** The film's shimmer, J-cut 3 f before the reverse angle, swelling to 8.1&. */
export const SHIMMER = { from: REVERSE - THIRTY_SECOND, to: at(8, 1.5) } as const;
/** The whoosh at the camera (release → splat) and the bwomp (the film catches him: below −60 dB by GLOAT_DONE). */
export const WHOOSH_AT_CAM = { from: RELEASE, to: SPLAT } as const;
/**
 * New sounds of bars 2–5 (the design's §8.1), by the frame they sit on: the iris creak; the paper rips (T0 + T1, T2, T3 + T4); the
 * block thuds (the pill, the heap ×1.3); the skid; the POV's hum, chirp, lock beeps and CRT tick; the reel ticks; the crash-zoom whoosh;
 * the pull-out fwoom; the infection bloop; the marquee zip; the chip keys and the UI pop.
 */
export const CREAKS: readonly number[] = [MARQUEE.from];
export const RIPS: readonly number[] = [at(2, 3), at(3, 4.75), at(4, 3)];
export const THUDS: readonly number[] = [PILL_DROP.to, HEAP];
/** Bar 6's sounds: the rail roar (follows his track speed), the chain clicks, the airtime whoosh, the rewind zip, the whip whoosh (peaking on the hidden cut). */
export const RAIL_ROAR = { from: at(6), to: at(6, 4.5) } as const;
export const WHIP_WHOOSH = { from: FLING, to: at(7) } as const;
/** The offbeat bass: C3 under the coaster (6.1&, 6.3&); A2, A2, C3, C3 under the sling (7.1&, 7.2&, 7.3&, 7.4&). */
export const BASS_V2: readonly number[] = [at(6, 1.5), at(6, 3.5), at(7, 1.5), at(7, 2.5), at(7, 3.5), at(7, 4.5)];
/** Bar 7's sounds: the car crunch (4 thumps 1 f apart about the catch) and the band boing; the error chime (the dialog); the denied buzz and the granted chime (C5 → F5, a 32nd apart); the [ROOT] blip; the overflow beep. */
export const GRANTED_CHIME: readonly number[] = [GRANTED_V2, GRANTED_V2 + THIRTY_SECOND];

// ——— Camera energy (v2) ————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The design's rig (sheet §6.2): punches only; none where the scene's own camera launches (the pull-out on 5.1, C6's reveal, the swing,
 * the four notches, the reverse angle, the release, the splat). Switched in for BREAK_ACCENTS when the launch is native (sheet §4.3).
 */
export const ACCENTS_V2: readonly EnergyAccent[] = [
  { at: BREAK_START, punch: 0.015 },
  { at: IMPACT, punch: 0.04 },
  { at: at(2, 2.5), punch: 0.015 },
  { at: LOCK, punch: 0.025 },
  { at: at(3), punch: 0.025 },
  { at: at(3, 2.5), punch: 0.015 },
  { at: TILT, punch: 0.03 },
  { at: at(4, 2), punch: 0.01 },
  { at: HOP_HOME, punch: 0.03 },
  { at: FAN, punch: 0.04 },
  { at: WAVE, punch: 0.04 },
  { at: RIPPLE, punch: 0.04 },
  { at: BOTTOMS[0], punch: 0.05 },
  { at: CREST, punch: 0.02 },
  { at: BOTTOMS[1], punch: 0.05 },
  // The accelerating K + C into the held breath rise 2 → 3 → 3.5 % (the design's 1.5 % each): the integrator's ruling I-2 (2026-10-02) —
  // the creeps under them are a few per cent of his size, so at 1.5 % the interlude's loudest beat (8.2, the race into "hup!") had no
  // picture event check-sync or the eye could find. They zoom the way the scene's own push from 8.2& goes, and end before the release.
  { at: at(8, 1.5), punch: 0.02 },
  { at: at(8, 2), punch: 0.03 },
  { at: at(8, 2.25), punch: 0.035 },
];

/** Which of the three rebuilt parts draw their v2 (the switches above), for breakAccents. */
export type BreakSwitches = { flat: boolean; graph: boolean; launch: boolean };

/**
 * The rig for a set of switches, part by part (each part's accents start and end inside it: the last punch a part lists is over before
 * the next part's first frame): bars 1–5 (to MATCH_CUT; bar 1's single accent is the same in both lists) ACCENTS_V2 when the flat bars
 * are v2, else v04's; the graph bar (to WHIP_CUT) ACCENTS_V2, else v04's bar-6 punches over the stub; the launch ACCENTS_V2, else the
 * carried slingshot's (CARRIED_ACCENTS). All on is ACCENTS_V2 exactly — the design's rig (sheet §6.2), switched in now that every part is
 * native (sheet §4.3); any part switched off gets back the punches its v04 frames were approved with (the identity proofs).
 */
export function breakAccents(s: BreakSwitches): readonly EnergyAccent[] {
  const part = (list: readonly EnergyAccent[], from: number, to: number) => list.filter((a) => a.at >= from && a.at < to);
  return [
    ...part(s.flat ? ACCENTS_V2 : V04_ACCENTS, BREAK_START, MATCH_CUT),
    ...part(s.graph ? ACCENTS_V2 : V04_ACCENTS, MATCH_CUT, WHIP_CUT),
    ...part(s.launch ? ACCENTS_V2 : CARRIED_ACCENTS, WHIP_CUT, BREAK_END_V2),
  ];
}

/**
 * The break's camera energy, merged into the film's rig by src/score/energy.ts (see EnergyAccent there): breakAccents of the switches —
 * in the film, ACCENTS_V2. Punches only: the break never shakes and never flashes white.
 */
export const BREAK_ACCENTS: readonly EnergyAccent[] = breakAccents({ flat: FLAT_V2, graph: GRAPH_V2, launch: LAUNCH_V2 });
