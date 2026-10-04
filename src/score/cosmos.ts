// Events of the cosmos, the film part 'cosmos' (6 bars: film bars 15–20 on the 58-bar map): "VERTIGO ∞ · LIGHTSPEED PRESS", bars 15–20
// (design notes/cosmos3/final.md §3, §4, §7, §9; prototype cosmos3/widget.html, sources cosmos3/w/j3–j7.js; build sheet
// notes/bcos/sheet.md §4). One camera, one trick a level, and the light gets louder every bar: the printed-white Big Bang frozen
// into bullet time (cosmos 1, 10⁻⁷ m); Earth's night side lit as city lights, the sunrise (2, 10⁷ m); the slingshot spirograph round
// the Sun, which turns out to be him (3, 10¹³ m); warp behind him, the snap-out to the neon spiral (4, 10²¹ m); lightning along his
// signature across the cosmic web, the Defender's scan (5, 10²⁴ m); the event horizon: the antivirus's sandbox swallows the lit
// universe and the approved stutter crushes it to one amber point (6, 10²⁶ m → ∞), where the comic club opens. The picture
// (src/scenes/cosmos.ts → cosmosBang.ts, cosmosSling.ts, cosmosHorizon.ts) and the music (scripts/audio/sections/cosmos.mjs) read
// these lists, so every hit lands on the same frame.
//
// Positions are cosmos-local through `cs(bar, beat)` = partFrame('cosmos', bar, beat − 1): bar 1-based inside the part, beat 1-based
// (cs(2, 3.5) is cosmos 2.3&, the design's 16.3& = film frame 1500 on the 58-bar map; cosmos bar n is film bar 14 + n). Rules
// (tests/cosmos.test.ts audits them): every exported frame on the 3-frame grid (the 32nd notes); export only numbers, number arrays,
// arrays of [from, to] pairs, { from, to } objects and arrays of objects whose frame fields are at / from / to / until / shows (radii,
// counts, notes, inks ride along as other fields); windows { from, to } with `to` exclusive; an event on the part's first downbeat is
// COSMOS.from, a window that runs to its end runs to COSMOS.to. Detail under the 32nd grid (a 2-frame drag-trail stamp, a 4-frame snap,
// a 1-frame anticipation) belongs to the shot module; the sheet lists it. Never the cosmos's built end (film.ts builtEnd): the whole
// part is this file's. Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import type { EnergyAccent } from './energy.ts';
import { partEnd, partFrame, partStart } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

/** The cosmos's bar `bar`, beat `beat` (both 1-based; cosmos 2.3& is cs(2, 3.5)), as a film frame. */
export const cs = (bar: number, beat = 1): number => partFrame('cosmos', bar, beat - 1);

/** The cosmos: from the Big Bang on cosmos 1.1 (after the transition's vacuum) to the comic club's dot on club 1.1. */
export const COSMOS = { from: partStart('cosmos'), to: partEnd('cosmos') } as const;

/**
 * The sub-renderers that draw the cosmos (src/scenes/cosmos.ts routes by these; sheet §2): A, the printed Big Bang and Earth (cosmos
 * 1–2); B, the slingshot and the warp (3–4); C, the cosmic web and the event horizon (5–6). Each its builder's.
 */
export const COSMOS_PARTS: readonly { id: 'A' | 'B' | 'C'; from: number; to: number }[] = [
  { id: 'A', from: COSMOS.from, to: cs(3) },
  { id: 'B', from: cs(3), to: cs(5) },
  { id: 'C', from: cs(5), to: COSMOS.to },
];
/** Which COSMOS_PARTS row draws instant `frame` (clamped into the part). */
export const cosmosPartIndex = (frame: number): number => {
  const i = COSMOS_PARTS.findIndex((p) => frame < p.to);
  return i < 0 ? COSMOS_PARTS.length - 1 : i;
};

/** Each level of scale arrives on its downbeat (the arrival move, the paste flare, the Eames square). */
export const LEVELS = { bang: COSMOS.from, earth: cs(2), solar: cs(3), galaxy: cs(4), web: cs(5), horizon: cs(6) } as const;

// ——— Drums (the drop groove: four on the floor from the bang) ——————————————————————————————————————————————————————————————————

/** The approved 20.4 stutter (cosmos 6.4 to the end): slices of 6·6·3·3·3·3 frames, each even slice showing the one before's content. */
export const STUTTER = { from: cs(6, 4), to: COSMOS.to } as const;
/** A kick on every beat, the bang's to the stutter's (whose content is 6.4's beat, played twice). */
export const KICKS: readonly number[] = steps(COSMOS.from, COSMOS.to, BEAT);
/** Clap + snare on beats 2 and 4 (6.4's inside the stutter's content). */
export const CLAPS: readonly number[] = KICKS.filter((f) => (f - COSMOS.from) % (2 * BEAT) === BEAT);
/** Open hats on the &s, to 6.3& (6.4& is never played: the stutter shows 6.4's first 12 frames only). */
export const OPEN_HATS: readonly number[] = steps(COSMOS.from + EIGHTH, STUTTER.from, BEAT);
/** Closed 16ths on the e and the a of every beat, to the stutter. */
export const HATS: readonly number[] = KICKS.filter((k) => k < STUTTER.from).flatMap((k) => [k + SIXTEENTH, k + 3 * SIXTEENTH]);
/** Cosmos 1.4: the fill on the 16ths into the landing on Earth (the fountain's quarters). */
export const FILL: readonly number[] = steps(cs(1, 4), cs(2), SIXTEENTH);
/** The chords, one a bar, doubling into the cut (IV · Vsus → V · iii · vi · IV → V · iii → vi). 6 ends on vi: 21.1's IV restarts the loop. */
export const CHORDS: readonly { at: number; chord: 'IV' | 'Vsus' | 'V' | 'iii' | 'vi' }[] = [
  { at: cs(1), chord: 'IV' },
  { at: cs(2), chord: 'Vsus' },
  { at: cs(2, 3), chord: 'V' },
  { at: cs(3), chord: 'iii' },
  { at: cs(4), chord: 'vi' },
  { at: cs(5), chord: 'IV' },
  { at: cs(5, 3), chord: 'V' },
  { at: cs(6), chord: 'iii' },
  { at: cs(6, 3), chord: 'vi' },
];
/**
 * The hook (M1), sung (`voxChop`) a row a bar from cosmos 2: drop 1's HOOK rows 0–2 (scripts/audio/sections/drop1.mjs) on cosmos 2–4,
 * and the new rows A (cosmos 5) and B (cosmos 6). `len` in sixteenths; `top` marks the bar's highest note ((>ω<) on whatever carries
 * him); `whisper` the scan's ducked E6; row B's D6 on 6.4 is stuttered into the club's D6. Row B keeps the music bible's ceiling, G6
 * (M1): the design's A6 on 6.1a is G6 here, with its neighbours re-voiced (sheet §9, decision M-1).
 */
export const HOOK: readonly { at: number; midi: number; len: number; top?: true; whisper?: true }[] = [
  ...[
    [0, 79, 2], [2, 77, 1], [3, 79, 2], [6, 82, 2, 1], [8, 81, 3], [11, 79, 1], [12, 77, 2], [14, 76, 2],
  ].map(([s, midi, len, top]) => ({ at: cs(2) + s * SIXTEENTH, midi, len, ...(top ? { top: true as const } : {}) })),
  ...[
    [0, 79, 2], [2, 81, 1], [3, 84, 2, 1], [6, 83, 2], [8, 81, 4], [12, 79, 2], [14, 81, 2],
  ].map(([s, midi, len, top]) => ({ at: cs(3) + s * SIXTEENTH, midi, len, ...(top ? { top: true as const } : {}) })),
  ...[
    [0, 81, 2], [2, 84, 1], [3, 86, 2], [6, 84, 2], [8, 88, 4, 1], [12, 86, 2], [14, 84, 2],
  ].map(([s, midi, len, top]) => ({ at: cs(4) + s * SIXTEENTH, midi, len, ...(top ? { top: true as const } : {}) })),
  ...[
    [0, 84, 2], [2, 86, 1], [3, 89, 2], [6, 86, 2], [8, 91, 3, 1], [11, 89, 1], [12, 88, 2, 0, 1], [14, 86, 0.5], [14.5, 86, 1.5],
  ].map(([s, midi, len, top, whisper]) => ({ at: cs(5) + s * SIXTEENTH, midi, len, ...(top ? { top: true as const } : {}), ...(whisper ? { whisper: true as const } : {}) })),
  ...[
    [0, 88, 2], [2, 89, 1], [3, 91, 2, 1], [6, 88, 2], [8, 89, 3], [11, 88, 1], [12, 86, 4],
  ].map(([s, midi, len, top]) => ({ at: cs(6) + s * SIXTEENTH, midi, len, ...(top ? { top: true as const } : {}) })),
];
/** The bars' highest notes: (>ω<) on whatever carries him (16.2& crest, 17.1a Earth, 18.3 the spiral's star, 19.3 his node, 20.1a the rider). */
export const HOOK_TOPS: readonly number[] = HOOK.filter((n) => n.top).map((n) => n.at);
/** 6.1–6.2&: the waltz's answer as bells, C6 C6 A5 A5 (M6): the universe was born to the waltz and leaves on its answer. */
export const WALTZ_ANSWER: readonly { at: number; midi: number }[] = [
  { at: cs(6), midi: 84 },
  { at: cs(6, 1.5), midi: 84 },
  { at: cs(6, 2), midi: 81 },
  { at: cs(6, 2.5), midi: 81 },
];

// ——— Cosmos 1 (15): PRINTED BIG BANG · BULLET TIME · 10⁻⁷ m (IV, B♭maj9; drop 1's tier-1 hit) ——————————————————————————————————

/** 1.1, E5: the bang in printed white — only his face is printed (the film's one white; the pipeline switch hides in it). */
export const BANG = COSMOS.from;
/** The white: bare paper on 1.1, the halftone printing back in from the corners, the plates snapping into register on 1.1e. */
export const WHITE = { from: BANG, to: cs(1, 1.25) } as const;
/** The explosion clock τ: 1× through the white, a freeze landing on 1.1e (0.03×), held; the slice on 1.4 restarts it (0.03 → 4× in 3 f). */
export const TIME = { freeze: cs(1, 1.25), restart: cs(1, 4) } as const;
/** CTRL+V in frozen time: only he moves, pasting himself behind his card (the ream and the counter). */
export const REAM_PASTES: readonly { at: number; n: number }[] = [
  { at: cs(1, 1.25), n: 7 },
  { at: cs(1, 1.5), n: 49 },
  { at: cs(1, 1.75), n: 343 },
];
/**
 * The bullet-time orbit (yaw about his card, camera 0.62 W from O, FOV 64°, pitch +8°): a drift of +0.3°/f between steps; step 1 (L) on
 * 1.2 settled by 1.2&; step 2 an impact into V* on 1.3 (from 1.2a); step 2b (L) on 1.3& → edge-on by 1.3& + 6; step 3 (L) on 1.4 → 180°
 * by 1.4&; then the crash zoom-out, an impact into 2.1.
 */
export const ORBIT: readonly { at: number; yaw: number; move: 'drift' | 'L' | 'I' }[] = [
  { at: BANG, yaw: -12, move: 'drift' },
  { at: cs(1, 1.25), yaw: -12, move: 'drift' },
  { at: cs(1, 2), yaw: 48, move: 'L' },
  { at: cs(1, 2.75), yaw: 52, move: 'drift' },
  { at: cs(1, 3), yaw: 70, move: 'I' },
  { at: cs(1, 3.5), yaw: 90, move: 'L' },
  { at: cs(1, 4), yaw: 180, move: 'L' },
];
/** 1.2: orbit step 1 + THE SHOCK SHELL (guilloche, 12 f, every card glints) + he waves ヽ(•ω•)ノ for 8 f. */
export const SHELL = cs(1, 2);
/** 1.2&: the light sweep (a specular band left → right in 6 f; the 36 fragments flash among the cards). */
export const SWEEP = cs(1, 2.5);
/** 1.3, E7: THE ANAMORPHIC LOCK at V* — 36 frozen fragments line up into `10⁻⁷ m` (reads 12 f), the caption flies in. */
export const LOCK = { from: cs(1, 3), to: cs(1, 3.5) } as const;
/** 1.3&: THE REAM — step 2b turns his card edge-on: 343 printed sheets. */
export const REAM = cs(1, 3.5);
/** 1.4, E8: THE SLICE (the clap's hot line through (−80, 0) at −35°; the halves slide ±28 px, held to 1.4e, back by 1.4&) → time restarts. */
export const SLICE = { at: cs(1, 4), held: cs(1, 4.25), back: cs(1, 4.5) } as const;
/** The card fountain: the 343-sheet ream fans out a quarter of the deck on each fill snare; the copies paste themselves. */
export const FOUNTAIN: readonly { at: number; n: number }[] = [
  { at: cs(1, 4), n: 343 },
  { at: cs(1, 4.25), n: 2400 },
  { at: cs(1, 4.5), n: 17000 },
  { at: cs(1, 4.75), n: 118000 },
];
/** 1.4&: POWERS OF TEN — the crash zoom-out (an impact into 2.1); cream Eames squares rush in, one per 32nd. */
export const POWERS: readonly number[] = steps(cs(1, 4.5), cs(2), THIRTY_SECOND);
/** 1.4a: THE SPARK — the explosion is a 30 px amber spark on one card of Earth's night side; the Eames square closes on it. */
export const SPARK = cs(1, 4.75);

// ——— Cosmos 2 (16): CITY LIGHTS → SUNRISE · 10⁷ m (Vsus → V on 2.3; HOOK row 0) ———————————————————————————————————————————————

/** 2.1, E9: the spark is his city light — straight down onto the night side; the label slams `10⁷ m`. */
export const LANDING = cs(2);
/** The stadium wave: ring k (1–13; 13 is the antipode) flips at 2.1 + 6(k − 1) frames (each card ±0–4 f by hash), igniting lamps. */
export const WAVE_RINGS: readonly number[] = steps(cs(2), cs(2, 4.25), SIXTEENTH);
/** 2.1&: the tilt-up flyover (−90° → −22°, L, settled 18 f later), flying along the wave at 2.0°/f while it runs at 2.5°/f. */
export const TILT_UP = cs(2, 1.5);
/** 2.2: the wave outruns us (a tracking surge ×1.8, L); the faces ahead flinch. */
export const OUTRUN = cs(2, 2);
/** 2.2&: pre-dawn — a cyan glow on the limb; the crest's newest lamps flash (>ω<) for 6 f (HOOK's top). */
export const PREDAWN = cs(2, 2.5);
/** 2.3: CRANE UP INTO THE SUNRISE (L, settled 12 f later); the terminator sweeps toward the camera over the same 12 f. */
export const SUNRISE = { at: cs(2, 3), settled: cs(2, 3.5) } as const;
/** 2.3&: THE MOON BEAM — amber, from the limb up through the rising Sun to the Moon in 6 f (the 2001 alignment, default on). */
export const MOON_BEAM = cs(2, 3.5);
/** 2.4: EARTH INFECTED — the ring-counter unwraps into a row (8 f) and locks 8,100,000,000; THREATS slams a 32nd later. */
export const UNWRAP = { at: cs(2, 4), slam: cs(2, 4.125) } as const;
/** 2.4& → 3.1, E10: the whip pan (90° right, an impact into 3.1) with the Ctrl+V drag trail: six crisp Earth stamps, one every 2 f. */
export const WHIP = { from: cs(2, 4.5), to: cs(3) } as const;

// ——— Cosmos 3 (17): SLINGSHOT SPIROGRAPH · 10¹³ m (iii, Am9; HOOK row 1) ————————————————————————————————————————————————————

/** 3.1, E11: the trail is an orbit — the six stamps glide onto Earth's ring (settled 6 f later); 16 copies paste per 16th to 3.2. */
export const ORBIT_LAND = { at: cs(3), settled: cs(3, 1.25), filled: cs(3, 2) } as const;
/** 3.1&, 3.2&, 3.3&: the ratchet (every ring jumps a tile in 4 f, neighbours counter-turning) and its wood-block tick. */
export const RATCHETS: readonly number[] = [cs(3, 1.5), cs(3, 2.5), cs(3, 3.5)];
/** The overtype cursors, pasted from Earth's (already amber) ring by 3-frame amber sparks, each finishing its ring 48 f later (1/8 turn a 16th). */
export const CURSORS: readonly { at: number; to: number; rings: readonly string[] }[] = [
  { at: cs(3, 1.5), to: cs(3, 3.5), rings: ['venus', 'mars'] },
  { at: cs(3, 1.75), to: cs(3, 3.75), rings: ['mercury', 'jupiter'] },
  { at: cs(3, 2), to: cs(3, 4), rings: ['saturn', 'uranus', 'neptune'] },
];
/** 3.2: THE DIVE at the Sun (r 1.75 → 1.0, accelerating: an impact into 3.3). */
export const DIVE = { from: cs(3, 2), to: cs(3, 3) } as const;
/** 3.3, E12: THE SLINGSHOT — the whip 180° round the Sun peaks on the kick; the spirograph; the Sun turns over into him (CME). */
export const SLINGSHOT = cs(3, 3);
/** 3.3& → 3.4: the slow-mo exit (0.25× by 3.3& + 4 f, back to 1× by 3.4). */
export const SLOWMO = { from: cs(3, 3.5), to: cs(3, 4) } as const;
/** 3.4: THE VICTORY LAP — Neptune's cursor dings, every orbit is amber, a 35° whip curls them into the amber spirograph, held 10 f. */
export const LAP = { at: cs(3, 4), relax: cs(3, 4.375) } as const;
/** 3.4& → 4.1, E13: FLUNG OUT — 75 % of 10¹³ → 10²¹ in 3 f, decelerating to a stop on 4.1 − 1; the solar system is one amber star. */
export const FLING = { from: cs(3, 4.5), to: cs(4) } as const;

// ——— Cosmos 4 (18): WARP ARM → NEON SPIRAL · 10²¹ m (vi, Dm9; HOOK row 2) ————————————————————————————————————————————————————

/** 4.1, E13: release into warp — he bursts out of his star; the camera reverses from the fling into a chase (L, full in 3 f). */
export const WARP = cs(4);
/** The glances: warp drops to 15 % for 6 f and the faces can be read (he looks back on the first). */
export const GLANCES: readonly { from: number; to: number }[] = [
  { from: cs(4, 1.5), to: cs(4, 1.75) },
  { from: cs(4, 2.5), to: cs(4, 2.75) },
];
/** 4.1a: ヽ(•ω•)ノ; a wall of halftone dust looms. 4.2: THE DUST-LANE PUNCH (he punches it open; surge ×2.5, bank 25°, L). */
export const DUST = { looms: cs(4, 1.75), punch: cs(4, 2) } as const;
/** 4.3, E14: THE SNAP ZOOM-OUT (a 4-frame impact into 4.3) + NEON IGNITION (the ring core → rim to 4.3&; p 0.6 → 0.85 behind it). */
export const REVEAL = cs(4, 3);
export const IGNITION = { from: REVEAL, to: cs(4, 3.5) } as const;
/** Light bursts race out every arm, one per 16th. */
export const LIGHT_BURSTS: readonly number[] = [cs(4, 3.25), cs(4, 3.5), cs(4, 3.75)];
/** 4.4: QUASAR — two amber jets along the axis in 4 f (L); the last arm pops; gone by 4.4&. */
export const QUASAR = { at: cs(4, 4), gone: cs(4, 4.5) } as const;
/** 4.4& → 5.1: TILT THROUGH THE DISC (an impact into 5.1); the core's anamorphic streak widens to the frame from 4.4a. */
export const TILT = { from: cs(4, 4.5), streak: cs(4, 4.75), to: cs(5) } as const;

// ——— Cosmos 5 (19): LIGHTNING WEB · 10²⁴ m (IV → V on 5.3; hook row A) ———————————————————————————————————————————————————————

/** 5.1, E15: THE MATCH CUT — the galaxy's horizontal light is a filament of the web; the pull-back into the web in 3D (L). */
export const MATCH = cs(5);
/**
 * The lightning: breadth-first from his node, one hop per 16th from 5.1e (hop n on 5.1e + 6(n − 1)): 11 hops, the last on 5.3a, the 16th
 * before the scan (hop 4 is the discharge on 5.2, hop 8 the wall on 5.3); the fuse burns behind each arc.
 */
export const HOPS: readonly number[] = steps(cs(5, 1.25), cs(5, 4), SIXTEENTH);
/** 5.2, E16: ROLL 90° clockwise about his node (L, settled 12 f later) + THE DISCHARGE (hop 4: every frontier node fires). */
export const ROLL = { at: cs(5, 2), settled: cs(5, 2.5) } as const;
/** 5.3: THE WALL — hop 8 strikes the Defender's red hex shield; the arcs glance off in spark showers; the rack focus to him (to 5.3&). */
export const WALL = cs(5, 3);
export const RACK = { from: WALL, to: cs(5, 3.5) } as const;
/** 5.4, E17: THE SCAN — one red scanline top → bottom in 12 f; every light under it goes out (the universe plays dead). */
export const SCAN = { from: cs(5, 4), to: cs(5, 4.5) } as const;
/** 5.4&: THE JOKE — every light snaps back on with a wink; the red stamp `[SCAN] 0 THREATS ✓`. */
export const WINK = cs(5, 4.5);
/** 5.4a: THE HINT — his red reticle twitches onto the hero's node for 4 f; two dry Defender beeps; the view arrives at the Defender. */
export const RETICLE = cs(5, 4.75);

// ——— Cosmos 6 (20): EVENT HORIZON · 10²⁶ m → ∞ (iii → vi on 6.3; hook row B; the waltz's answer) ——————————————————————————————

/** 6.1, E18: THE SANDBOX OPENS — the web winds into a spiral (δ 0 → 1 in 6 f) as the camera tilts 55°: an accretion disc. */
export const HORIZON = { at: cs(6), twisted: cs(6, 1.25) } as const;
/** The innermost band spaghettifies on these kicks (a short pitch-down zip each). */
export const SPAGHETTI: readonly number[] = [cs(6), cs(6, 2)];
/** 6.2: ∞ — the exponent lies down; `∞ THREATS` slams; the structure inks swap cyan ↔ pink at equal luminance. */
export const INFINITY = cs(6, 2);
/** 6.3: SANDBOX ▶ — the red ring pulses, the drain triples, the disc shrinks to r 640 by 6.4; the corners become VOID. */
export const SANDBOX = cs(6, 3);
/** The stutter's slices (output frame `at` shows content from `shows` on), the disc's radius and the turn (−30° a slice) each takes. */
export const STUTTER_SLICES: readonly { at: number; shows: number; r: number | 'point'; turn: number }[] = [
  { at: STUTTER.from, shows: STUTTER.from, r: 400, turn: 0 },
  { at: STUTTER.from + 6, shows: STUTTER.from, r: 240, turn: -30 },
  { at: STUTTER.from + 12, shows: STUTTER.from + 6, r: 130, turn: -60 },
  { at: STUTTER.from + 15, shows: STUTTER.from + 6, r: 60, turn: -90 },
  { at: STUTTER.from + 18, shows: STUTTER.from + 9, r: 22, turn: -120 },
  { at: STUTTER.from + 21, shows: STUTTER.from + 9, r: 'point', turn: -150 },
];
/** The content frame the stutter shows at output frame `frame` (elsewhere `frame` itself): 6·6·3·3·3·3, each even slice a repeat. */
export function stutterFrame(frame: number): number {
  if (frame < STUTTER.from || frame >= STUTTER.to) return frame;
  let s = STUTTER_SLICES[0];
  for (const x of STUTTER_SLICES) if (frame >= x.at) s = x;
  return s.shows + (frame - s.at);
}
/** E20: VOID #07060C and one amber point at the frame centre (his • eye, where the comic club opens), to the part's end. */
export const POINT = { from: STUTTER.from + 21, to: COSMOS.to } as const;

// ——— The readout (threads.md (c); design §7): the threat count, the scale, the Defender's red ——————————————————————————————————

/**
 * The threat count's keys: [frame, count] (a display count: the number amber, THREATS red). Steps on its keys to cosmos 2.1, then climbs
 * log-linearly between them (the ring-counter rolls 118,000 → 8,100,000,000 over cosmos 2); from 5.4& it climbs a decade every 4 f to ∞
 * on 6.2. threatsAt() reads it.
 */
export const THREATS: readonly { at: number; n: number }[] = [
  { at: BANG, n: 1 },
  { at: cs(1, 1.25), n: 7 },
  { at: cs(1, 1.5), n: 49 },
  { at: cs(1, 1.75), n: 343 },
  { at: cs(1, 4), n: 343 },
  { at: cs(1, 4.25), n: 2400 },
  { at: cs(1, 4.5), n: 17000 },
  { at: cs(1, 4.75), n: 118000 },
  { at: cs(2), n: 118000 },
  { at: cs(2, 4), n: 8.1e9 },
  { at: cs(3), n: 1e11 },
  { at: cs(3, 4), n: 4.2e13 },
  { at: cs(4), n: 1e15 },
  { at: cs(4, 4), n: 9.9e20 },
  { at: cs(5), n: 1e22 },
  { at: cs(5, 3.5), n: 1.6e33 },
  { at: cs(5, 4.5), n: 2.0e36 },
  { at: cs(6, 2), n: Infinity },
];
/** The threat count at output frame `frame` (prototype cosmos3/w/j6.js thr). */
export function threatsAt(frame: number): number {
  const k = THREATS;
  if (frame < k[0].at) return k[0].n;
  if (frame >= INFINITY) return Infinity;
  if (frame >= WINK) return 2.0e36 * 10 ** ((frame - WINK) / 4);
  let i = 0;
  while (i < k.length - 1 && frame >= k[i + 1].at) i++;
  const [a, b] = [k[i], k[Math.min(i + 1, k.length - 1)]];
  if (frame < LEVELS.earth || frame >= b.at) return frame < LEVELS.earth ? a.n : b.n;
  if (frame === a.at) return a.n;
  return 10 ** (Math.log10(a.n) + ((frame - a.at) / (b.at - a.at)) * (Math.log10(b.n) - Math.log10(a.n)));
}
/**
 * The scale label's exponent (an odometer, motion-blurred digit strips): from `a` on `from` to `b` by `to`, about two values a 32nd,
 * then held; the first row is the anamorphic `10⁻⁷ m` holding; the last ticks one value a 16th (26 · 27 · 28 · 29) until it lies down
 * as ∞ on INFINITY.
 */
export const EXPONENT: readonly { from: number; to: number; a: number; b: number }[] = [
  { from: cs(1, 3), to: cs(1, 4.5), a: -7, b: -7 },
  { from: cs(1, 4.5), to: cs(1, 4.875), a: -7, b: 7 },
  { from: WHIP.from, to: WHIP.to, a: 7, b: 13 },
  { from: FLING.from, to: FLING.to, a: 13, b: 21 },
  { from: TILT.from, to: TILT.to, a: 21, b: 24 },
  { from: RETICLE, to: HORIZON.at, a: 24, b: 26 },
  { from: HORIZON.at, to: INFINITY, a: 26, b: 29 },
];
/** The Defender's red mono lines (drawn after the Riso pass; never the word QUARANTINE here). */
export const DEFENDER_LINES: readonly { from: number; to: number; text: 'stamp' | 'sandbox' | 'done' }[] = [
  { from: WINK, to: HORIZON.at, text: 'stamp' },
  { from: SANDBOX, to: POINT.from - 3, text: 'sandbox' },
  { from: POINT.from - 3, to: POINT.from, text: 'done' },
];
/**
 * The party monitor (the approved box of src/shots/hud.ts, bottom-left, a screen overlay): typing in on 2.1e while the lamps ripple out
 * (its `friends` = threatsAt) and gone by the sunrise's settle; again from 6.3& (`friends ∞`, memory 96 %, cpu 97 %, `[WARN] party
 * exceeds universe`), closed as the stutter's fourth slice starts (output frame; the design's "closed at 1910"), so the last frames are
 * bare. Inside the stutter the box shows its content frame (stutterFrame) like the picture.
 */
export const MONITOR: readonly { from: number; to: number }[] = [
  { from: cs(2, 1.25), to: cs(2, 3.25) },
  { from: cs(6, 3.5), to: STUTTER.from + 15 },
];
/** The monitor's warning line in its second window (amber: the terminal's [WARN] about his effects). */
export const MONITOR_WARN = { from: cs(6, 3.75), to: STUTTER.from + 15 } as const;

// ——— The look (design §8): the power dial, print → neon ———————————————————————————————————————————————————————————————————————

/**
 * RisoPrint's `power` (p): 0 printed … 1 powered (neon), stepped on each level downbeat under its paste flare and ramped only where the
 * design ramps it: behind the ignition ring (4.3 → 4.3&, 0.6 → 0.85) and over cosmos 6 to full neon by the stutter's fourth slice. A row
 * holds `p` from `at`; a row with `to` ramps from the previous value to `p` over [at, to). src/shots/cosmosKit.ts powerAt() reads it.
 */
export const POWER: readonly { at: number; p: number; to?: number }[] = [
  { at: BANG, p: 0.12 },
  { at: LEVELS.earth, p: 0.28 },
  { at: LEVELS.solar, p: 0.48 },
  { at: LEVELS.galaxy, p: 0.6 },
  { at: IGNITION.from, to: IGNITION.to, p: 0.85 },
  { at: LEVELS.web, p: 0.9 },
  { at: LEVELS.horizon, p: 0.95 },
  { at: LEVELS.horizon, to: STUTTER.from + 15, p: 1 },
];

// ——— The light grammar (design §3.1, G1): one SUBJECT a moment; drums → picture → light —————————————————————————————————————————

/** The paste flare on each level downbeat (a 6-ray starburst, an anamorphic streak, 4 Riso hexagon ghosts; cream/amber, never white). */
export const PASTE_FLARES: readonly { at: number; gain: number }[] = [
  { at: LEVELS.earth, gain: 1 },
  { at: LEVELS.solar, gain: 1 },
  { at: LEVELS.galaxy, gain: 1 },
  { at: LEVELS.web, gain: 1 },
  { at: LEVELS.horizon, gain: 0.6 },
];
/** The clap's guilloche shock ring (a screen-space refraction carrying a halftone rosette in the level's ink), where a clap has one. */
export const SHOCK_RINGS: readonly { at: number; ink: 'pink' | 'cyan' | 'amber'; lensed?: true }[] = [
  { at: cs(2, 2), ink: 'pink' },
  { at: cs(2, 4), ink: 'pink' },
  { at: cs(3, 2), ink: 'cyan' },
  { at: cs(4, 2), ink: 'cyan' },
  { at: cs(4, 4), ink: 'amber' },
  { at: cs(5, 2), ink: 'pink' },
  { at: cs(6, 2), ink: 'amber', lensed: true },
];
/**
 * The Eames square (four cream L marks, 3 px, 40 px arms) closing on him and blinking twice: on the spark (1.4a), each level downbeat, the
 * solar system shrunk to one star by the fling (3.4&) and his star at the neon reveal (4.3).
 */
export const EAMES: readonly number[] = [SPARK, LEVELS.earth, LEVELS.solar, FLING.from, LEVELS.galaxy, REVEAL, LEVELS.web, LEVELS.horizon];
/** The kick's emissive pulse on the SUBJECT (×1.35 for 2 f, back over 10 f): every kick from the bang to the stutter. */
export const PULSES: readonly number[] = KICKS.filter((k) => k < STUTTER.from);
/** Glints (24–60 ✦ on the light-catching particles, 6 f) on the open hats; a 3-frame ✧ spark on each newly infected face on the 16ths. */
export const GLINTS: readonly number[] = OPEN_HATS;
export const SPARKS: readonly number[] = HATS;
/**
 * Photosensitivity (design §3.2): the reserved block events (≥ 0.1 relative luminance in a 3 × 3 block), at least 24 f apart but the
 * one 12-frame gap (the relight → the twist flare); the only white is the bang's. check-flash allows ≤ 3 flashes in any 60 frames.
 */
export const RESERVED_FLASHES: readonly { at: number; what: string; to?: number }[] = [
  { at: BANG, what: 'the printed-white bang (the only white)' },
  { at: LEVELS.earth, what: 'paste flare' },
  { at: SUNRISE.at, what: 'the sunrise' },
  { at: LEVELS.solar, what: 'paste flare' },
  { at: SLINGSHOT, what: 'the slingshot burst' },
  { at: LEVELS.galaxy, what: 'paste flare' },
  { at: REVEAL, what: 'the neon power-up (coloured +30 %, 8 f)' },
  { at: LEVELS.web, what: 'paste flare on the match cut' },
  { at: SCAN.from, to: WINK, what: 'the blackout and the relight: one flash' },
  { at: LEVELS.horizon, what: 'the twist flare (+0.15)' },
];

// ——— Photography and editing (sheet §5–§6) ——————————————————————————————————————————————————————————————————————————————————

/**
 * Sub-frames never cross these (design §11.2): the bang's white (E5 at the part's start), the freeze (E6), the slice (E8), every
 * stutter slice (E19) and the part's end (E20). Every other cut of the cosmos is continuous or hidden in blur, inside one segment.
 */
export const SEGMENTS: readonly (readonly [number, number])[] = [
  [COSMOS.from, TIME.freeze],
  [TIME.freeze, SLICE.at],
  [SLICE.at, STUTTER.from],
  ...STUTTER_SLICES.map((s, i): readonly [number, number] => [s.at, STUTTER_SLICES[i + 1]?.at ?? COSMOS.to]),
];
/** The segment instant `frame` belongs to (clamped into the part). */
export function cosmosSegment(frame: number): { from: number; to: number } {
  const s = SEGMENTS.find(([, to]) => frame < to) ?? SEGMENTS[SEGMENTS.length - 1];
  return { from: s[0], to: s[1] };
}
/**
 * The design's sub-frames (§11.2), each window rounded out to the 32nd grid: 64 over every fast move (the slingshot's on a 6-frame
 * shutter), 1 through the stutter (hard steps), 16 everywhere else.
 */
export const SUBFRAMES: readonly { from: number; to: number; samples: number; shutter: number }[] = [
  { from: BANG, to: TIME.freeze, samples: 64, shutter: 0.5 },
  { from: SHELL, to: SHELL + 6, samples: 64, shutter: 0.5 },
  { from: cs(1, 2.75), to: cs(1, 3.25), samples: 64, shutter: 0.5 },
  { from: SLICE.at, to: LEVELS.earth, samples: 64, shutter: 0.5 },
  { from: TILT_UP, to: cs(2, 2.25), samples: 64, shutter: 0.5 },
  { from: SUNRISE.at, to: SUNRISE.settled, samples: 64, shutter: 0.5 },
  { from: cs(2, 4.25), to: cs(3, 1.25), samples: 64, shutter: 0.5 },
  { from: cs(3, 2.625), to: cs(3, 3.75), samples: 64, shutter: 6 },
  { from: LAP.at, to: LAP.at + 6, samples: 64, shutter: 0.5 },
  { from: FLING.from, to: cs(4, 1.5), samples: 64, shutter: 0.5 },
  { from: cs(4, 2.625), to: cs(4, 3.25), samples: 64, shutter: 0.5 },
  { from: TILT.from, to: cs(5, 1.25), samples: 64, shutter: 0.5 },
  { from: ROLL.at, to: ROLL.settled, samples: 64, shutter: 0.5 },
  { from: WINK, to: HORIZON.twisted, samples: 64, shutter: 0.5 },
  { from: STUTTER.from, to: COSMOS.to, samples: 1, shutter: 0 },
];

// ——— Camera energy (src/score/energy.ts merges it) ——————————————————————————————————————————————————————————————————————————

/**
 * The rig (EnergyAccent): no white flash anywhere (the cosmos's light is the picture's: the printed white, the paste flares, cream and
 * amber, never white); the bang's 6 px shake; a +4 % punch on a kick only where the level's camera does not move on it (the move is
 * the hit: 2.4, 4.4, 5.3, 5.4, 6.3); the approved stutter's jolts, stopped dead as the point appears (its slice is a hard step), so the
 * point sits still at the frame centre for the club's dot.
 */
export const COSMOS_ACCENTS: readonly EnergyAccent[] = [
  { at: BANG, shake: 0.375 },
  ...[UNWRAP.at, QUASAR.at, WALL, SCAN.from, SANDBOX].map((at): EnergyAccent => ({ at, punch: 0.04 })),
  ...STUTTER_SLICES.filter((s) => s.r !== 'point').map((s, i): EnergyAccent => ({ at: s.at, shake: i === 0 ? 0.3 : 0.12 + 0.03 * i, until: POINT.from })),
];
