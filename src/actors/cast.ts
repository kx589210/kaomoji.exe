// The cast of spec §4 as rigs: a kaomoji is a row of parts (bracket, eye,
// mouth, cheek, ear), each drawn as its own glyph and typeset with the font's
// advances, so parts can blink, swap, stretch or fly off one by one. Only
// characters that pass check-glyphs belong here; src/content/build.ts lists
// every face for it.
import { type Advance, typeset } from '../engine/typeset.ts';

export type Role = 'bracket' | 'eye' | 'mouth' | 'cheek' | 'ear';
export type Kaomoji = readonly { ch: string; role: Role }[];

const ROLES: Record<string, Role> = { b: 'bracket', e: 'eye', m: 'mouth', c: 'cheek', r: 'ear' };

/** A kaomoji from its text and one role letter per character: b bracket, e eye, m mouth, c cheek, r ear. */
export function kaomoji(text: string, roles: string): Kaomoji {
  const chars = [...text];
  if (chars.length !== roles.length) throw new Error(`${text}: ${chars.length} characters, ${roles.length} roles`);
  return chars.map((ch, i) => ({ ch, role: ROLES[roles[i]] }));
}

export const faceText = (k: Kaomoji): string => k.map((p) => p.ch).join('');

/** (•ω•): the protagonist. */
export const PROTAGONIST = kaomoji('(•ω•)', 'bemeb');
/** (=^･ω･^=): the cat that joins in the Riso world (spec §4). */
export const CAT = kaomoji('(=^･ω･^=)', 'bcremercb');

/** Eye pairs and mouths of the Swiss grid (S06): each of the 8 × 8 pairings is a different face. */
export const EYES: readonly (readonly [string, string])[] = [['•', '•'], ['＾', '＾'], ['－', '－'], ['°', '°'], ['≧', '≦'], ['>', '<'], ['◕', '◕'], ['･', '･']];
export const MOUTHS: readonly string[] = ['ω', '▽', '∀', 'ᴥ', '〇', '□', 'ε', 'д'];

export function expression(eyes: number, mouth: number): Kaomoji {
  const [l, r] = EYES[eyes];
  return kaomoji(`(${l}${MOUTHS[mouth]}${r})`, 'bemeb');
}

/** Closed eyes for a blink: a narrow dash, so it fits in the place of any eye (a full-width － runs into the mouth of small-eyed faces). */
export const SHUT = '-';

export type PlacedPart = { ch: string; role: Role; index: number; dx: number };

/** Parts of `k` with their centres `dx` in ems from the face's centre. */
export function layoutFace(k: Kaomoji, advance: Advance, tracking = 0.02): PlacedPart[] {
  const line = typeset(k.map((p) => p.ch), advance, tracking);
  return line.chars.map((c, i) => ({ ch: c.ch, role: k[i].role, index: i, dx: c.x - line.width / 2 }));
}

/** Width of a face in ems. */
export const faceWidth = (k: Kaomoji, advance: Advance, tracking = 0.02): number => typeset(k.map((p) => p.ch), advance, tracking).width;
