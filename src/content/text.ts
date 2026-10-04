// Every string that appears on screen, grouped by the font role that draws it.
// scripts/check-glyphs.mjs verifies each character against the font stacks.
import type { FontRole } from '../engine/fonts.ts';
import { BURST_FACES } from './castDrop1.ts';

export type TextItem = { role: FontRole; text: string; where: string };

/** The cast of spec §4 and the expression alternates used by the rig. */
export const CAST: readonly string[] = [
  '(•ω•)', '(－ω－)', '(•▽•)', '(＾▽＾)', '(•ω<)', '(=^･ω･^=)', '┏(＾0＾)┛', '┗(＾0＾)┓',
  '(╯°□°)╯︵ ┻━┻', 'ヽ(°〇°)ﾉ', 'ᕕ( ᐛ )ᕗ', 'ʕ•ᴥ•ʔ', '¯\\_(ツ)_/¯', '(ง •_•)ง', '(；・∀・)', '✧', '♪',
];

export const TECH_SAMPLE_TEXT = {
  header: 'kaomoji.exe · tech sample',
  prompt: 'kaomoji --demo',
  status: ['[ OK ] gpu: angle · webgl2', '[ OK ] fonts: 12 files · 0 tofu', '[ OK ] motion blur: 16 samples'],
  swiss: ['150', 'bpm', 'kaomoji.exe', 'tech sample', '60 fps · 4k', '03/03'],
} as const;

/** Strings rasterized into the SDF atlas for glyph particles. */
export const SPRITES: readonly string[] = [...CAST, 'ω', '•', '･', '♪', '✧', '＾', '▽'];

/** Characters whose outlines are extruded in 3D (all must exist in EXTRUDE_FONT): the tech sample's and S13's burst of faces. */
export const EXTRUDE_CHARS = [...new Set([...'()ω▽', ...BURST_FACES.join('')])].filter((c) => c !== ' ' && c !== '　').join('');

export const TEXTS: readonly TextItem[] = [
  ...CAST.flatMap((text) => (['mono', 'jp', 'rounded'] as const).map((role) => ({ role, text, where: 'cast' }))),
  { role: 'mono', text: '> ' + TECH_SAMPLE_TEXT.prompt, where: 'tech sample prompt' },
  { role: 'mono', text: TECH_SAMPLE_TEXT.header, where: 'tech sample header' },
  ...TECH_SAMPLE_TEXT.status.map((text) => ({ role: 'mono' as const, text, where: 'tech sample status' })),
  ...TECH_SAMPLE_TEXT.swiss.map((text) => ({ role: 'display' as const, text, where: 'tech sample swiss' })),
  ...SPRITES.map((text) => ({ role: 'rounded' as const, text, where: 'sprites' })),
];
