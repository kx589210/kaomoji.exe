// What Drop 1 draws (spec revision 9 §7 S13–S20): the cosmos's atlas of
// faces, the monitor's characters, and every on-screen string, for
// scripts/check-glyphs.mjs. (The Big Bang's extruded faces are checked against
// the extrusion font through EXTRUDE_CHARS, src/content/text.ts.)
import { HUD_CHARS, WARNINGS } from '../shots/hud.ts';
import { CLUB_TEXTS } from '../shots/lines.ts';
import { CORE_FACES, CROWD_FACES, FILLER, GALAXY_FACES, GUESTS, MOON, PANIC, PLANETS } from './castDrop1.ts';
import type { TextItem } from './text.ts';

const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c !== ' ' && c !== '　');

/** The cosmos's faces (cosmos bars 1–4), each drawn whole as one glyph of the "mini" atlas: every face of the drop's cast and the filler pool, once each. */
export const MINI_FACES: readonly string[] = [...new Set([...CROWD_FACES, ...GALAXY_FACES, ...CORE_FACES, ...GUESTS, ...PLANETS, ...MOON, ...FILLER, ...PANIC])];
/** Every character the party monitor shows, in the terminal's mono atlas. */
export const MONITOR_GLYPHS: readonly string[] = chars([HUD_CHARS]);

export const DROP1_TEXTS: readonly TextItem[] = [
  ...MINI_FACES.map((text): TextItem => ({ role: 'rounded', text, where: 'drop 1 cosmos' })),
  ...CLUB_TEXTS.map((text): TextItem => ({ role: 'rounded', text, where: 'drop 1 dancing lines' })),
  { role: 'mono', text: HUD_CHARS, where: 'party monitor' },
  ...WARNINGS.map((w): TextItem => ({ role: 'mono', text: w.text, where: 'party monitor warning' })),
];
