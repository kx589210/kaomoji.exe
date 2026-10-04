// Events of bridge A, the film part 'bridgeA' (v08: one bar between the cosmos and the comic club; film bar 23, frames 2112–2207 on the
// 63-bar map). The v07 review (2026-10-03) found the turn from the cosmos to the comic too fast: the event horizon's amber point became the club's eye and the page
// printed in within a beat; this bar gives that change room (+1.6 s). Contract: output/qa/v08/MAP-CONTRACT.md.
//
// THE BREATH THAT PRINTS THE CLUB (X02). The camera stays on the point — his left • eye, the anchor at the frame's centre on every frame
// of the bar — and pushes in on it from the cosmos's scale (the point r 17 px) to the club's (the eye r 60 on club 1.1) while the club's
// world is printed round it, a layer a beat, as its groove arrives a layer a beat:
//   beat 1  the breath: the stutter's three Ben-Day rings ripple out (still turning clockwise, as the stutter turned), the point blinks on
//           1& (it is an eye); the cosmos's glass plays the hook's head on its tinks (D6 C6 D6), the club's piano lands IV, hats creep in.
//   beat 2  the plates land on the kick (muffled: the club heard through a wall): (•ω•) printed out of register — cyan and pink plates
//           off one way and the other, the amber off a little — round the eye, which is the registration point; the page's border
//           drawn clockwise by the pen, crop marks at its corners; a register step on 2&, where the hook's F6 is whispered.
//   beat 3  register: the plates snap onto the key (the bass enters, the hook's E6 whispered); the register targets pop; the Ben-Day
//           dots start printing outward from the eye.
//   beat 4  the dots print ring after ring on the fill's hits as the push speeds up, the page's border and marks fly out of the frame;
//           the piano and horn pick up into club 1.1, where the burst lands as approved.
//
// Positions are bridge-local: `at(1, 3.5)` is the bridge's bar 1, the & of beat 3 (1-based beats, as on the sheets). Rules (as the
// transition's, src/score/transition.ts): every exported frame on the 3-frame grid (the 32nd notes); windows { from, to } with `to`
// exclusive; an event on the part's first downbeat is BRIDGE_A_START, a window that runs to its end runs to BRIDGE_A_END. The picture
// (src/shots/bridgeA.ts, src/scenes/bridgeA.ts) and the music (scripts/audio/sections/bridgeA.mjs) read these lists, so every hit lands
// on the same frame. Plain Node loads this file: erasable TypeScript only, no three / remotion / react imports.
import type { EnergyAccent } from './energy.ts';
import { partEnd, partFrame, partStart } from './film.ts';

/** The bridge's bar `bar`, beat `beat` (both 1-based; 1.3& is at(1, 3.5)), as a film frame. */
export const at = (bar: number, beat = 1): number => partFrame('bridgeA', bar, beat - 1);

/** The bridge runs from the cosmos's end (the event horizon's last frame: the amber point) to the comic club's first dot on club 1.1. */
export const BRIDGE_A_START = partStart('bridgeA');
export const BRIDGE_A_END = partEnd('bridgeA');
/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

// ——— Beat 1 · the breath ————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The landing (bridge 1.1): the cosmos's stutter has crushed to the point; its rings start to ripple out, the club's piano lands IV. */
export const LANDING = BRIDGE_A_START;
/** The point blinks: shut on 1& (the glass's C6), open again on 1a (its D6). */
export const BLINK = { from: at(1, 1.5), to: at(1, 1.75) } as const;
/** The cosmos's glass carried in, playing the hook's head (HOOK[3]'s D6 C6 D6, sixteenths 0, 2, 3): the landing, the blink, the reopening. */
export const GLASS: readonly number[] = [LANDING, BLINK.from, BLINK.to];
/** … then thinning on the e and a of beats 2 and 3, as the cosmos's band blinks were (club bar 1 carries the glass on: CARRY_TINKS). */
export const GLASS_THREAD: readonly number[] = [at(1, 2.25), at(1, 2.75), at(1, 3.25), at(1, 3.75)];

// ——— The groove, a layer a beat —————————————————————————————————————————————————————————————————————————————————————————————————

/** Closed hats on the sixteenths from 1.1e (texture only), creeping up to club bar 1's own fade-in; open hats on the &s from beat 2. */
export const HATS: readonly number[] = steps(at(1, 1.25), BRIDGE_A_END, 6);
export const OPEN_HATS: readonly number[] = [at(1, 2.5), at(1, 3.5), at(1, 4.5)];
/**
 * The kick from beat 2, low-passed (the club through a wall) and opening beat by beat into club 1.1; each is a print bump in the picture.
 * Beat 1 is the breath (FW2's designed breath: the landing has the piano's low octave for its body, no kick).
 */
export const KICKS: readonly number[] = [at(1, 2), at(1, 3), at(1, 4)];
/** The bass from beat 3: the sub on the root (B♭) from 3.1, the pluck on the &s. */
export const BASS = at(1, 3);
export const PLUCKS: readonly number[] = [at(1, 3.5), at(1, 4.5)];
/** The fill into club 1.1: the sixteenths of beat 4 and its last 32nd (each prints the Ben-Day dots a ring further). */
export const FILL: readonly number[] = [at(1, 4), at(1, 4.25), at(1, 4.5), at(1, 4.75), at(1, 4.875)];
/** The pickup into club 1.1: a piano stab on IV on 4a, a horn lipped up into the downbeat on the last 32nd (the cosmos's own gesture). */
export const PICKUP = { piano: at(1, 4.75), horn: at(1, 4.875) } as const;
/**
 * The piano (the club's house stab on IV): the landing on 1.1, a stab on the register step (2&), then from the bass the club's own 3-3-2 —
 * the second half of its STABS bar (sixteenths 8, 10, 13) — and the pickup on 4a: the floor's rhythm heard before the floor is seen.
 */
export const STABS: readonly number[] = [LANDING, at(1, 2.5), at(1, 3), at(1, 3.5), at(1, 4.25), PICKUP.piano];
/** A reversed cymbal swelling from 3.1 into club 1.1's crash. */
export const SWELL = { from: at(1, 3), to: BRIDGE_A_END } as const;

// ——— The print ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Beat 2: the plates land out of register (with the first kick); a register step on 2&; in register on 3.1 (with the bass). */
export const PLATES = at(1, 2);
export const REGISTER_STEP = at(1, 2.5);
export const REGISTER = at(1, 3);
/** The hook whispered on the register's two steps (HOOK[3]'s F6 and E6, sixteenths 6 and 8): the club's voice arriving early. */
export const HOOK_GHOST: readonly { at: number; midi: number; sixteenths: number }[] = [
  { at: REGISTER_STEP, midi: 89, sixteenths: 2 },
  { at: REGISTER, midi: 88, sixteenths: 3 },
];
/** The pen draws the page's border clockwise from its top-left corner over beat 2 (crop marks pop as it turns each corner). */
export const PEN = { from: PLATES, to: at(1, 2.875) } as const;
/** The register targets pop on 3.1, as the plates snap on. */
export const TARGETS = REGISTER;
/** The Ben-Day dots print outward from the eye: from 3.1e, a ring further on each sixteenth, then on each hit of the fill. */
export const DOTS: readonly number[] = [at(1, 3.25), at(1, 3.5), at(1, 3.75), ...FILL];
/** The push in on the eye: the whole bar, slow through the breath, faster into club 1.1 (where the club's own camera takes over). */
export const PUSH = { from: BRIDGE_A_START, to: BRIDGE_A_END } as const;

/**
 * Its camera energy: none from the rig. Every kick is a print bump drawn by the scene itself on the kick's own frame (crisp: a rig punch
 * smears the keylines through the shutter, src/score/club.ts clubRigInstant), and the push is the shot's own camera, never still.
 */
export const BRIDGE_A_ACCENTS: readonly EnergyAccent[] = [];
