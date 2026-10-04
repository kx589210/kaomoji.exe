// Every string the ending's parts draw, per atlas (src/scenes/outroKit.ts builds one shared atlas of each). The strings themselves are
// src/content/outro.ts's (check-glyphs reads them there, with the role each is drawn in); this file only says which atlas each one is
// rasterised into. Per-character atlases list characters; `faces` and `wall` list whole faces (one entry each) plus the lone ω their
// infected mouths are re-inked with. Pure.
import { CURSOR, DECODE, PROMPT } from '../content/boot.ts';
import {
  BODY_COPY,
  CAT_OUT,
  COUNTER_TEXT,
  EXIT_LINE,
  FOOTNOTES,
  GUEST_OUT,
  HEADLINERS,
  HERO_OUT,
  PROGRESS_STEPS,
  RECALL_LINES,
  SIGNATURE,
  SIG_GLYPHS,
  SMALL_PRINT_LINES,
  STAGED,
  W5_DEFENDER,
  W5_FRAME_CHARS,
  W5_SURVIVED,
  W5_TITLE,
  W5_WINK_ROW,
  progressText,
  w5Friends,
  w5Frame,
} from '../content/outro.ts';
import { RAMP } from '../actors/asciiFace.ts';
import { charsOf } from './outroKit.ts';
import { WALL_FACES } from './outroWall.ts';

/** Per-character mono (JetBrains Mono 500): the terminal and the blue screen. */
const MONO_TEXTS: readonly string[] = [
  SIGNATURE,
  ...FOOTNOTES,
  ...SMALL_PRINT_LINES.map((l) => l.text),
  EXIT_LINE,
  DECODE,
  RAMP,
  ...Array.from({ length: PROGRESS_STEPS + 1 }, (_, s) => progressText(s)),
  ...RECALL_LINES,
  PROMPT,
  CURSOR,
  [COUNTER_TEXT.label, ...COUNTER_TEXT.steps, COUNTER_TEXT.arrow].join(''),
  W5_TITLE,
  W5_FRAME_CHARS,
  w5Friends(1234567890),
  w5Frame(0),
  W5_WINK_ROW,
  W5_SURVIVED,
  ...[W5_DEFENDER.clean, W5_DEFENDER.wink, ...W5_DEFENDER.doubling, W5_DEFENDER.infinite, W5_DEFENDER.friendly],
  '↑',
];

export const OUTRO_ATLAS = {
  mono: charsOf(MONO_TEXTS),
  bold: charsOf([...STAGED.map((l) => l.text), '0123456789']),
  rounded: charsOf([...Object.values(HERO_OUT), ...SIG_GLYPHS, '()', CURSOR]),
  display: charsOf([BODY_COPY]),
  // The guest on stage is set a glyph at a time (outroKit.ts charFace: his ￣ drop to his eye line), so his characters are entries too.
  faces: [...new Set([...HEADLINERS.map((h) => h.face), GUEST_OUT.onStage, CAT_OUT.face, CAT_OUT.bow, 'ω', ...GUEST_OUT.onStage])],
  wall: [...new Set([...WALL_FACES, 'ω'])],
} as const satisfies Record<string, readonly string[]>;
