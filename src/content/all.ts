// Every string that appears on screen, and every character extruded in 3D,
// for scripts/check-glyphs.mjs. The break, drop 2 and the outro list theirs in
// src/content/break.ts, drop2.ts and outro.ts; they are merged here already.
import { RAMP } from '../actors/asciiFace.ts';
import { INTRO_TEXTS } from './boot.ts';
import { BREAK_EXTRUDE, BREAK_TEXTS, BREAK_TEXTS_V2 } from './break.ts';
import { BUILD_TEXTS } from './build.ts';
import { CLUB_INK_TEXTS } from './club.ts';
import { DROP1_TEXTS } from './drop1.ts';
import { DROP2_EXTRUDE, DROP2_TEXTS } from './drop2.ts';
import { MOCHI_TEXTS } from './drop2Mochi.ts';
import { OUTRO_EXTRUDE, OUTRO_TEXTS } from './outro.ts';
import { BRIDGE_B_TEXTS } from './bridgeB.ts';
import { EXTRUDE_CHARS, TEXTS, type TextItem } from './text.ts';

export const SCREEN_TEXTS: readonly TextItem[] = [
  ...TEXTS,
  ...INTRO_TEXTS,
  { role: 'mono', text: RAMP, where: 'ascii face ramp' },
  ...BUILD_TEXTS,
  ...DROP1_TEXTS,
  // The comic club INK (src/content/club.ts): checked now, drawn once it goes live (until then the v04 club's DROP1_TEXTS draw).
  ...CLUB_INK_TEXTS,
  ...BREAK_TEXTS,
  // The interlude's v2 strings (src/content/break.ts): checked now, drawn as each of its parts is built (until then the v04 strings draw).
  ...BREAK_TEXTS_V2,
  ...DROP2_TEXTS,
  // The mochi wave (drop2 10–11 with DROP2_THREADS.waveStyle 'mochi', the film's default since 2026-10-03).
  ...MOCHI_TEXTS,
  // Bridge B (v08): the camera's fps line running down, the corrupted blocks' hex (src/content/bridgeB.ts).
  ...BRIDGE_B_TEXTS,
  ...OUTRO_TEXTS,
];

/** Every character extruded in 3D anywhere in the film (all must exist in EXTRUDE_FONT): EXTRUDE_CHARS and each later section's own. */
export const SCREEN_EXTRUDE_CHARS: string = [...new Set([...EXTRUDE_CHARS, ...[...BREAK_EXTRUDE, ...DROP2_EXTRUDE, ...OUTRO_EXTRUDE].join('')])].filter((c) => c.trim() !== '').join('');
