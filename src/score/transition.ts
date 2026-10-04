// Events of the transition, the film part 'transition' (2 bars between the Riso print and the cosmos; film bars 13–14 on the 58-bar
// map): "VERTIGO ∞ · LIGHTSPEED PRESS", bars 13–14 (design notes/cosmos3/final.md §4; build sheet notes/bcos/sheet.md §3).
// Bar 1, DUPLICATOR → VERTIGO (half time, ii Gm11, the exhale): the Riso page Ctrl+V's itself toward us as its three plates, a Vertigo
// dolly zoom holds the sun dead still while the films tear apart in depth and waltz to the 8-bit Blue Danube, and the camera launches
// down the tunnel. Bar 2, STAR GATE → CRASH STOP → ✦ (C9sus4 over a C pedal): the speed doubles with every roll stage while four press
// passes turn the lights out, the gate stops dead on 2.3, the dolly zoom runs backwards on the 32nds (3D → 2D), the flat page slams
// shut sideways into a vertical slit that crosses the horizontal flare (2D → 1D: the ✦ cross), and on 2.4& the music cuts to the
// vacuum: one white-hot point (0D) until the Big Bang on cosmos 1.1. The picture (src/scenes/transition.ts → transitionGate.ts) and
// the music (scripts/audio/sections/transition.mjs) read these lists, so every hit lands on the same frame.
//
// Positions are transition-local: `at(2, 3.5)` is the transition's bar 2, the & of beat 3 (1-based beats, as on the sheets; the
// design's film frames are the 58-bar numbering, 13.1 = at(1, 1)). Rules (tests/transition.test.ts audits them): every exported frame
// on the 3-frame grid (the 32nd notes); export only numbers, number arrays, arrays of [from, to] pairs, { from, to } objects and arrays
// of objects whose frame fields are at / from / to / until (amounts, radii, colours ride along as other fields, unaudited); windows
// { from, to } with `to` exclusive; an event on the part's first downbeat is TRANSITION_START, a window that runs to its end runs to
// TRANSITION_END. Detail below the 32nd grid (a 1-frame settle, the whine ending a frame early) belongs to the shot or music module.
// Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import type { EnergyAccent } from './energy.ts';
import { partEnd, partFrame, partStart } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24
const EIGHTH = BEAT / 2; // 12
const SIXTEENTH = BEAT / 4; // 6
const THIRTY_SECOND = BEAT / 8; // 3
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

/** The transition's bar `bar`, beat `beat` (both 1-based; 2.3& is at(2, 3.5)), as a film frame. */
export const at = (bar: number, beat = 1): number => partFrame('transition', bar, beat - 1);

/** The transition runs from the Riso print's end (riso's last frame: the sun on the paper sea) to the Big Bang on cosmos 1.1. */
export const TRANSITION_START = partStart('transition');
export const TRANSITION_END = partEnd('transition');

/** The sub-renderers that draw the transition (src/scenes/transition.ts routes by these): one, the builder's (sheet §2). */
export const TRANSITION_PARTS: readonly { id: 'gate'; from: number; to: number }[] = [{ id: 'gate', from: TRANSITION_START, to: TRANSITION_END }];
/** Which TRANSITION_PARTS row draws instant `frame` (clamped into the part). */
export const transitionPartIndex = (frame: number): number => {
  const i = TRANSITION_PARTS.findIndex((p) => frame < p.to);
  return i < 0 ? TRANSITION_PARTS.length - 1 : i;
};

// ——— Bar 1: DUPLICATOR → VERTIGO (half time, ii Gm11) ————————————————————————————————————————————————————————————————————————

/** 1.1, E0 (no cut): the frame is the Riso print's last plus the first three films' rules wiping out from the window edge. */
export const EXHALE = TRANSITION_START;
/** The page Ctrl+V's itself: films 1–3 (B, P, Y) on 1.1, 4–6 (P, Y, B) on 1.1&, 7–9 on 1.2 (with the Vertigo lurch). */
export const PASTES: readonly { at: number; films: readonly number[] }[] = [
  { at: at(1, 1), films: [1, 2, 3] },
  { at: at(1, 1.5), films: [4, 5, 6] },
  { at: at(1, 2), films: [7, 8, 9] },
];
/** 1.2& → 1.3&: AUTO-REPEAT (the held C5 is a held key): films 10–18 slide out of the sun's rim one every 32nd, into the gaps. */
export const AUTO_REPEAT: readonly number[] = steps(at(1, 2.5), at(1, 3.625), THIRTY_SECOND);
/** The waltz steps: every strip and guilloche band steps one slot (L, 8 f, 6 % overshoot), the faces swap pose in unison. */
export const WALTZ_STEPS: readonly number[] = [at(1, 1.5), at(1, 2), at(1, 2.5)];
/** The waltzing station: strips and bands spin in alternating directions, 0 → 0.12 turn/s by 1.3, held through C5, 0 by 1.4. */
export const SPIN = { from: at(1, 2.5), to: at(1, 4) } as const;
/** The ⊕ marks printing solid (top-right on 1.1& for 4 f, bottom-right on 1.2, bottom-left while C5 holds). */
export const TARGETS: readonly { at: number; corner: 'tr' | 'br' | 'bl'; to?: number }[] = [
  { at: at(1, 1.5), corner: 'tr' },
  { at: at(1, 2), corner: 'br' },
  { at: at(1, 2.5), corner: 'bl', to: at(1, 3.75) },
];
/**
 * The Vertigo dolly zoom (d · tan(φ/2) = 540: the page plane maps 1 : 1 to the screen, so the sun and the paper never move while the
 * films separate in depth). The depth reveal q = 400 / d, φ = 2·atan(1.35 q), keyed: an ease-in creep to 1.2, the lurch on 1.2 (L: 75 %
 * in 3 f), a glide to 1.3 whose velocity is 0 on 1.3 (the hand-over to the flight). Prototype: cosmos3/w/j2.js qOf.
 */
export const DOLLY: readonly { at: number; q: number }[] = [
  { at: at(1, 1), q: 0.0065 },
  { at: at(1, 1.5), q: 0.04 },
  { at: at(1, 2), q: 0.08 },
  { at: at(1, 2.125), q: 0.485 },
  { at: at(1, 2.5), q: 0.62 },
  { at: at(1, 3), q: 0.85 },
];
/** 1.2, E0b: VERTIGO — the lurch (the rim tock). */
export const VERTIGO = at(1, 2);
/** The Riso print's S12 push (zoom 1.04^((f − riso 4.1)/24)) runs on and decelerates to a stop by 1.2 (+1.6 %: the sun 175 → 178 px). */
export const PUSH = { from: TRANSITION_START, to: VERTIGO } as const;
/** The vanishing point eases from the sun's 6 px offset to the frame centre by 1.3. */
export const VP_CENTRED = at(1, 3);

/** 1.3, E1: LAUNCH — the camera jolts forward down the tunnel (0 → 6 units/f by 3 f, the kick's ×1.6 surge over 10 f). */
export const LAUNCH = at(1, 3);
/** The flight: units of travel a frame from each frame on (launch, then ×2 per roll stage), stopped dead by the crash. */
export const SPEED: readonly { at: number; units: number }[] = [
  { at: LAUNCH, units: 6 },
  { at: at(2, 1), units: 12 },
  { at: at(2, 2), units: 24 },
  { at: at(2, 3), units: 0 },
];
/** Chase lights: every film's rule lights in turn from the sun to the lens in 8 f (1.3&, 1.4&). */
export const CHASE_LIGHTS: readonly number[] = [at(1, 3.5), at(1, 4.5)];
/** 1.4: the flare is born — a knocked-out horizontal line through the sun (8 px, 1400 px), the lens's, always horizontal. */
export const FLARE_BORN = at(1, 4);

// ——— Bar 2: STAR GATE → CRASH STOP → ✦ (C9sus4 over a C2 pedal) ——————————————————————————————————————————————————————————————

/** The press passes, one per kick: a dark front from the sun to the corners in 6 f; the paper steps darker and the inks turn to light. */
export const PRESS_PASSES: readonly { at: number; paper: string; light: number }[] = [
  { at: at(2, 1), paper: '#664285', light: 0.35 },
  { at: at(2, 2), paper: '#272369', light: 0.7 },
  { at: at(2, 3), paper: '#0A033B', light: 1 },
  { at: at(2, 4), paper: '#0A0313', light: 1 },
];
/** 2.2: THE CORKSCREW — the picture turns 22.5° counter-clockwise on each roll 16th (L, 75 % in 3 f): 90° on 2.2a. */
export const CORKSCREW: readonly number[] = steps(at(2, 2), at(2, 3), SIXTEENTH);
/** 2.3, E2: THE CRASH STOP — 24 units/f → 0 on the kick (a 5-unit recoil over 4 f); the flight noise dies. */
export const CRASH = at(2, 3);
/** 2.3 → 2.3a: the reverse Vertigo on the 32nds (3D → 2D): q snaps down and the sun sheds its size. */
export const REVERSE_VERTIGO: readonly { at: number; q: number; sunR: number }[] = [0.6, 0.42, 0.29, 0.2, 0.13, 0.08, 0.04, 0.01].map((q, i) => ({
  at: CRASH + i * THIRTY_SECOND,
  q,
  sunR: [240, 180, 135, 100, 72, 52, 36, 24][i],
}));
/** The sun sheds its inks on the same steps: discs into register (the clack), the yellow plate slides off, the pink falls, bare paper. */
export const SUN_SHEDS: readonly { at: number; what: 'register' | 'yellow' | 'pink' | 'paper' }[] = [
  { at: CRASH, what: 'register' },
  { at: at(2, 3.25), what: 'yellow' },
  { at: at(2, 3.375), what: 'yellow' },
  { at: at(2, 3.5), what: 'pink' },
  { at: at(2, 3.625), what: 'pink' },
  { at: at(2, 3.75), what: 'pink' },
  { at: at(2, 3.875), what: 'paper' },
];
/** 2.4, E3: THE ✦ CROSS (2D → 1D) — the flat page squashes into a vertical slit that crosses the flare, one step a 32nd. */
export const CROSS = at(2, 4);
export const SLIT: readonly { at: number; width: number; half: number; flareHalf: number; flareWidth: number; sunR: number }[] = [
  { at: CROSS, width: 18, half: 540, flareHalf: 960, flareWidth: 10, sunR: 14 },
  { at: CROSS + THIRTY_SECOND, width: 12, half: 280, flareHalf: 420, flareWidth: 7, sunR: 9 },
  { at: CROSS + 2 * THIRTY_SECOND, width: 7, half: 100, flareHalf: 150, flareWidth: 4, sunR: 6 },
  { at: CROSS + 3 * THIRTY_SECOND, width: 4, half: 24, flareHalf: 30, flareWidth: 3, sunR: 5 },
];
/** 2.4&, E4: THE POINT (0D) — the music cuts to the vacuum (S2); the picture holds one white-hot trembling point until cosmos 1.1. */
export const POINT = at(2, 4.5);
/** S2, the vacuum: everything gated with a CUT on its first frame; only the point's whine on the post bus (it stops 1 f early). */
export const SILENCE = { from: POINT, to: TRANSITION_END } as const;

// ——— Drums and music (music bible §4.2–4.3; design §9) ————————————————————————————————————————————————————————————————————————

/** Kicks: the soft exhale on 1.1 (0.45), 1.3 (0.5), then every beat of bar 2 with a press clunk (0.5 → 0.6). */
export const KICKS: readonly number[] = [at(1, 1), at(1, 3), ...steps(at(2, 1), at(2, 4.5), BEAT)];
/** 1.2: the rim "tock" + paper thwack (the Vertigo lurch). */
export const RIM = VERTIGO;
/** The snare roll, doubling a stage: quarters on 1.3 and 1.4, 8ths in 2.1, 16ths in 2.2, 32nds from the crash to the vacuum. */
export const ROLL: readonly number[] = [
  ...steps(at(1, 3), at(2, 1), BEAT),
  ...steps(at(2, 1), at(2, 2), EIGHTH),
  ...steps(at(2, 2), CRASH, SIXTEENTH),
  ...steps(CRASH, POINT, THIRTY_SECOND),
];
/** A gate crosses the lens on every roll hit from 1.4 to the crash (each placed at the camera's actual position at its hit). */
export const GATES: readonly number[] = ROLL.filter((f) => f >= FLARE_BORN && f < CRASH);
/** Closed hats: the &s of bar 1, the 16ths of 2.1–2.2. */
export const HATS: readonly number[] = [...steps(at(1, 1.5), at(2, 1), BEAT), ...steps(at(2, 1), CRASH, SIXTEENTH)];
/**
 * The 8-bit Blue Danube (after J. Strauss II, Op. 314, PD: our own arrangement, two phrases of the opening motif in F; music bible §4.2):
 * `chip` square, duty 25 %, vibrato from 80 ms, ping-pong 0.3 s. The last B♭5 (2.4&) is swallowed by the vacuum and sung on cosmos 1.1.
 */
export const WALTZ: readonly { at: number; to: number; note: string; midi: number }[] = [
  { at: at(1, 1), to: at(1, 1.5), note: 'F4', midi: 65 },
  { at: at(1, 1.5), to: at(1, 2), note: 'F4', midi: 65 },
  { at: at(1, 2), to: at(1, 2.5), note: 'A4', midi: 69 },
  { at: at(1, 2.5), to: at(1, 3.75), note: 'C5', midi: 72 },
  { at: at(1, 4), to: at(1, 4.25), note: 'C6', midi: 84 },
  { at: at(1, 4.25), to: at(1, 4.5), note: 'C6', midi: 84 },
  { at: at(1, 4.5), to: at(1, 4.75), note: 'A5', midi: 81 },
  { at: at(1, 4.75), to: at(2, 1), note: 'A5', midi: 81 },
  { at: at(2, 1), to: at(2, 1.5), note: 'F4', midi: 65 },
  { at: at(2, 1.5), to: at(2, 2), note: 'F4', midi: 65 },
  { at: at(2, 2), to: at(2, 2.5), note: 'A4', midi: 69 },
  { at: at(2, 2.5), to: at(2, 3.75), note: 'C5', midi: 72 },
  { at: at(2, 3.75), to: at(2, 4), note: 'C6', midi: 84 },
  { at: at(2, 4), to: at(2, 4.25), note: 'C6', midi: 84 },
  { at: at(2, 4.25), to: POINT, note: 'B♭5', midi: 82 },
];
/** The sun sings: a ring pulse r → r + 60 over 10 f on every waltz note from the flare's birth on. */
export const SINGS: readonly number[] = WALTZ.map((n) => n.at).filter((f) => f >= FLARE_BORN);
/** The chords: ii (Gm11 over G1) for bar 1, the same upper voices over a C2 pedal (C9sus4) for bar 2. */
export const CHORDS: readonly { at: number; chord: 'ii' | 'Vsus' }[] = [
  { at: at(1, 1), chord: 'ii' },
  { at: at(2, 1), chord: 'Vsus' },
];
/** The pad's low-pass opens 500 Hz → 16 kHz, and a noise riser (800 Hz → 9 kHz band) climbs, from 1.1 to the vacuum. */
export const OPEN = { from: TRANSITION_START, to: POINT } as const;
/** The vertigo wobble: the pad bends −30 cents over 1.2 → 1.2& and back by 1.3. */
export const WOBBLE = { from: VERTIGO, to: LAUNCH } as const;
/** Key-repeat paste ticks (a soft printer burr under the held C5): one per AUTO_REPEAT film. */
export const KEY_REPEAT: readonly number[] = AUTO_REPEAT;
/** Paste "chk"s on the first three pastes. */
export const PASTE_TICKS: readonly number[] = PASTES.map((p) => p.at);
/** The flight-noise bed: band noise whose centre tracks the speed (600 Hz → 4 kHz), panned L → R with the corkscrew, cut dead on the crash. */
export const FLIGHT_NOISE = { from: LAUNCH, to: CRASH } as const;
/** 2.3 → the vacuum: 8 FM collapse blips on the 32nds (from C6, +2 semitones each), a 40 Hz rumble, a reverse cymbal that stops dead. */
export const COLLAPSE_BLIPS: readonly number[] = REVERSE_VERTIGO.map((s) => s.at);
export const RUMBLE = { from: CRASH, to: POINT } as const;
export const REVERSE_CYMBAL = { from: at(2, 3.5), to: POINT } as const;
/** 2.4: the ✦ "shing" (a tiny high FM, gain 0.04). */
export const SHING = CROSS;
/** S2's one sound, on the post bus: the point's whine (`lineWhine`, ≈ 10.5 kHz, ≈ −38 dBFS), wavering ±1 % with the tremble. */
export const WHINE = SILENCE;
/** The signature slug up film 1's left window edge (threads (b) row 4; hexdump 0x0480): printed from 1.1 while the plates fly. */
export const SLUG = { from: TRANSITION_START, to: CRASH } as const;

// ——— Photography and editing (sheet §5–§6) ——————————————————————————————————————————————————————————————————————————————————

/**
 * Sub-frames never cross these: E2 (the crash stop), E3 (the cross), E4 (the vacuum) and the part's own bounds (E0 at its start is a
 * continuation of the Riso print's last frame; E5 at its end is the light cut into the bang).
 */
export const SEGMENTS: readonly (readonly [number, number])[] = [
  [TRANSITION_START, CRASH],
  [CRASH, CROSS],
  [CROSS, POINT],
  [POINT, TRANSITION_END],
];
/** The segment instant `frame` belongs to (clamped into the part). */
export function transitionSegment(frame: number): { from: number; to: number } {
  const s = SEGMENTS.find(([, to]) => frame < to) ?? SEGMENTS[SEGMENTS.length - 1];
  return { from: s[0], to: s[1] };
}
/**
 * The design's sub-frames (§11.2): 64 over the lurch and the flight (shutter 0.75 in flight), 1 through the snaps (every reverse-Vertigo
 * step, the slit and the point are hard steps), 16 everywhere else.
 */
export const SUBFRAMES: readonly { from: number; to: number; samples: number; shutter: number }[] = [
  { from: VERTIGO, to: VERTIGO + 2 * THIRTY_SECOND, samples: 64, shutter: 0.5 },
  { from: LAUNCH, to: CRASH, samples: 64, shutter: 0.75 },
  { from: CRASH, to: TRANSITION_END, samples: 1, shutter: 0 },
];

/**
 * Its camera energy (EnergyAccent, src/score/energy.ts): none. The Vertigo constraint keeps the page plane 1 : 1 with the screen, so
 * a screen-space punch or shake would move the sun the hand-off pins; the flight's surges, the crash's recoil and the corkscrew are the
 * scene's own camera, and the only white is the bang's (cosmos 1.1).
 */
export const TRANSITION_ACCENTS: readonly EnergyAccent[] = [];
