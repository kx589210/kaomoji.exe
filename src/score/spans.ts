// Which scene draws which frames of the film. Pure, so Node tests pin the
// cover; src/scenes/index.ts maps each key to a scene.
// From break 1.1 on each section is one span drawn by one scene (src/scenes/break.ts,
// drop2.ts, outro.ts), whose bounds come from the section's own score file. A
// section that needs shots, sub-scenes or a transition inside its range keeps
// them inside its scene (segments keep sub-frames apart at its cuts), so its
// builder never edits this file.
// A part that grew (src/score/film.ts `built`) draws its content up to its
// builtEnd and then its held tail: a span of the same scene marked `held`,
// which shows the part's last built frame, frozen (src/scenes/hold.ts). It
// goes away by itself when the tail is built.
// A bridge (v08: bridgeA after the cosmos, bridgeB after drop 2) is a span of
// its own scene (src/scenes/bridgeA.ts, bridgeB.ts), which holds the part
// before it while it is a stub (src/score/film.ts STUBS) and is the bridge's
// builder's to fill.
import { BREAK_END_V2, BREAK_START } from './break.ts';
import { BRIDGE_A_END, BRIDGE_A_START } from './bridgeA.ts';
import { BRIDGE_B_END, BRIDGE_B_START } from './bridgeB.ts';
import { BUILD_END, FLIP as T2 } from './build.ts';
import { CLUB_END, COSMOS_END, DROP1_START, LEVELS } from './drop1.ts';
import { DROP2_END, DROP2_START } from './drop2.ts';
import { type PartId, partTail } from './film.ts';
import { INTRO_END } from './intro.ts';
import { OUTRO_END, OUTRO_START } from './outro.ts';
import { TRANSITION_END, TRANSITION_START } from './transition.ts';

export type SceneKey = 'intro' | 'swiss' | 't2' | 'riso' | 'transition' | 'kosmos' | 'bridgeA' | 'club' | 'break' | 'drop2' | 'bridgeB' | 'outro';
/** A span: frames [from, to) drawn by the scene `key`; `held`, its part's last built frame frozen (a held tail). */
export type Span = { from: number; to: number; key: SceneKey; held?: true };

/** The part's held tail (if any), drawn by the scene that draws the part's content: its last frame, frozen. */
const tail = (part: PartId, key: SceneKey): Span[] => {
  const t = partTail(part);
  return t ? [{ from: t.from, to: t.to, key, held: true }] : [];
};

export const SPANS: readonly Span[] = [
  { from: 0, to: INTRO_END, key: 'intro' },
  { from: INTRO_END, to: T2.from, key: 'swiss' },
  { from: T2.from, to: T2.to, key: 't2' },
  { from: T2.to, to: BUILD_END, key: 'riso' },
  { from: TRANSITION_START, to: TRANSITION_END, key: 'transition' },
  { from: DROP1_START, to: COSMOS_END, key: 'kosmos' },
  ...tail('cosmos', 'kosmos'),
  { from: BRIDGE_A_START, to: BRIDGE_A_END, key: 'bridgeA' },
  // The club (the comic club INK, src/scenes/clubInk.ts) runs from the dot inking on club 1.1 up to the glass giving way on break 1.1
  // (SMASH; CLUB_END now that it is built through); from there the break owns the glass, falling away into its world.
  { from: LEVELS.cosmos, to: CLUB_END, key: 'club' },
  ...tail('club', 'club'),
  { from: BREAK_START, to: BREAK_END_V2, key: 'break' },
  ...tail('break', 'break'),
  { from: DROP2_START, to: DROP2_END, key: 'drop2' },
  ...tail('drop2', 'drop2'),
  { from: BRIDGE_B_START, to: BRIDGE_B_END, key: 'bridgeB' },
  { from: OUTRO_START, to: OUTRO_END, key: 'outro' },
  ...tail('outro', 'outro'),
];
