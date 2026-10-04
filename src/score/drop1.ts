// Events of Drop 1, the parts cosmos and club (spec revision 8, §7 S13–S20,
// §8 Drop 1): the sun bursts into a Big Bang (cosmos bar 1); the camera steps
// out one level of scale a bar, in time with the kicks — Earth and its Moon
// (cosmos 2), the solar system (cosmos 3), the galaxy (cosmos 4), galaxies
// dancing (club 1), the universe on a party table (club 2); then (╯°□°)╯ flips
// the table (club 3) and it flies at the screen in slow at us (club 3–4). The
// picture (src/shots/burst.ts, voyage.ts, lines.ts, glass.ts) and the music
// (scripts/audio/sections/drop1.mjs) read these lists, so every hit lands on
// the same frame. Every position is part-local (src/score/film.ts). Both parts
// grew to 6 bars on the 58-bar map; what is written here is their first 4
// (cosmos 1–4, club 1–4), and their last 2 bars hold (film.ts partTail): the
// cosmos's content ends on COSMOS_END, the club's on CLUB_END, and no drum
// falls in a held bar.
import { builtEnd, isHeld, partEnd, partFrame, partStart } from './film.ts';
import { FRAMES_PER_BEAT } from './tempo.ts';

const BEAT = FRAMES_PER_BEAT; // 24 frames
const SIXTEENTH = BEAT / 4; // 6

/** Frames a, a + step, … below b. */
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** … leaving out the held bars (a list generated across the cosmos's held tail, between cosmos 4 and club 1). */
const played = (frames: readonly number[]): number[] => frames.filter((f) => !isHeld(f));
/** A position in the cosmos (bar 1-based, beat 0-based) … */
const cosmos = (bar: number, beat = 0): number => partFrame('cosmos', bar, beat);
/** … and in the club. */
const club = (bar: number, beat = 0): number => partFrame('club', bar, beat);

/** Drop 1 runs from the drop on cosmos 1.1 to the smash on break 1.1. */
export const DROP1_START = partStart('cosmos');
export const DROP1_END = partEnd('club');
/** Where the cosmos's content ends (cosmos 5.1, where its held bars start; partEnd('cosmos') once they are built) … */
export const COSMOS_END = builtEnd('cosmos');
/** … and the club's (club 5.1). */
export const CLUB_END = builtEnd('club');

// Cosmos bar 1, S13: the Big Bang (spec §15 视觉大招 2).
/** The sun bursts on the drop … */
export const BURST = partStart('cosmos');
/** … its clock freezes a sixteenth later while the camera circles the frozen burst … */
export const FREEZE = { from: cosmos(1) + SIXTEENTH, to: cosmos(1, 2) } as const;
/** … and time snaps back on beat 3, everything flying off into space. */
export const RESUME = FREEZE.to;
/** Cosmos bar 1 is half time under the freeze: kicks on 1, on the and of 2 and with the snare as time snaps back on 3. */
export const BANG_KICKS: readonly number[] = [partStart('cosmos'), cosmos(1, 1.5), cosmos(1, 2)];
export const BANG_SNARES: readonly number[] = [RESUME];
/** A snare fill on the sixteenths of beat 4 into the groove. */
export const FILL: readonly number[] = steps(cosmos(1, 3), cosmos(2), SIXTEENTH);

// Cosmos bar 2 to club 3.3: four on the floor.
export const GROOVE = { from: cosmos(2), to: club(3, 2) } as const;
/** A kick on every beat: each one steps the camera out (spec §3.1 rule 3). */
export const KICKS: readonly number[] = played(steps(GROOVE.from, GROOVE.to, BEAT));
/** Clap and snare on beats 2 and 4: everyone changes face at once. */
export const CLAPS: readonly number[] = KICKS.filter((f) => (f - GROOVE.from) % (2 * BEAT) === BEAT);
/** Open hats on the offbeats. */
export const OPEN_HATS: readonly number[] = KICKS.map((f) => f + BEAT / 2);
/** Closed hats on every sixteenth from the drop to the flip: the stars twinkle on them. */
export const HATS: readonly number[] = played(steps(DROP1_START, club(3, 2), SIXTEENTH));

// Cosmos bar 2 to club bar 2, S14–S18: one level of scale a bar, each arriving on its downbeat.
// (`cosmos` is the level of scale — galaxies dancing — that arrives on club 1.1, not the part.)
export const LEVELS = {
  earth: cosmos(2),
  solar: cosmos(3),
  galaxy: cosmos(4),
  cosmos: partStart('club'),
  table: club(2),
} as const;
export type Level = keyof typeof LEVELS;
/** S14: the kaomoji rain onto Earth in three groups, landing with the kicks on beats 2, 3 and 4 of cosmos bar 2. */
export const METEOR_LANDS: readonly number[] = [cosmos(2, 1), cosmos(2, 2), cosmos(2, 3)];
/** S16: the galaxy's last beat (cosmos 4.4) stutters — the system's first warning — to the end of the cosmos's content. */
export const STUTTER = { from: cosmos(4, 3), to: COSMOS_END } as const;

// Club bars 3–4: the throw (the script of 2026-10-01).
/** Club 3.1: (•ω•) kicks the cocktail out of the guest's hand … */
export const SIDE = club(3);
/** … it splashes over his face on the and … */
export const SPLASH = club(3, 0.5);
/** … on club 3.2 everything freezes and the lights die; he turns red … */
export const LIGHTS_OUT = club(3, 1);
/** … and grabs (•ω•), his hand landing on the and … */
export const GRAB = club(3, 1.5);
/** … the guest throws (•ω•) on beat 3 … */
export const FLIP = club(3, 2);
/** … who flies at us to the hit on the last beat of club bar 4: no slow motion, the drums driving on into it … */
export const THROW = { from: FLIP, to: club(4, 3) } as const;
export const HIT = THROW.to;
/** The glass gives way on the break's downbeat (break 1.1). */
export const SMASH = partStart('break');
/** … then the music stops dead for the beat before the glass breaks on break 1.1 (only the glass is heard). */
export const SILENCE = { from: HIT, to: SMASH } as const;
/** Through the throw: a kick on every beat, a clap on its beats 2 and 4, and a roll speeding up into the hit — eighths, sixteenths, thirty-seconds. */
export const BUILD_KICKS: readonly number[] = steps(FLIP, HIT, BEAT);
export const BUILD_CLAPS: readonly number[] = [club(3, 3), club(4, 1)];
export const ROLL: readonly number[] = [...steps(club(4), club(4, 1), BEAT / 2), ...steps(club(4, 1), club(4, 2), SIXTEENTH), ...steps(club(4, 2), HIT, SIXTEENTH / 2)];

/** The frame whose content shows at `frame`: inside STUTTER, slices of 6, 6, 3, 3, 3, 3 frames, each even slice repeating the one before; elsewhere `frame` itself. */
export function stutterFrame(frame: number): number {
  const t = frame - STUTTER.from;
  if (t < 0 || t >= STUTTER.to - STUTTER.from) return frame;
  const back = t < 6 ? 0 : t < 15 ? 6 : t < 21 ? 9 : 12;
  return frame - back;
}
