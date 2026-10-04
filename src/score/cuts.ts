// The 字符闪 character flash (design.md §3): the film's signature, used only
// where the picture "breaks" — drop 2's dark cut into the terminal and its
// crumble into its bar 8 (iteration 2: the light → light cuts cut clean on the
// kick). A flashed cut is drawn as coloured characters from the cut frame
// through cut + 3 (never before the cut: the kick frame carries the change),
// and a ramp can take the picture into characters over a stretch. The intro, the build and drop 1 (parts
// intro … club) never flash (they stay as built). Each section lists its own entries in its score file —
// BREAK_GLYPHS (break.ts), DROP2_GLYPHS (drop2.ts), OUTRO_GLYPHS (outro.ts) —
// and this module merges them; the Director adds glyphFlashAt() to the look of
// each output frame (src/score/energy.ts ENERGY.glyphs), and the pipeline's
// GlyphFlashEffect (src/engine/post/glyphFlash.ts) draws it. A section's
// builder never edits this file.
// Plain Node loads this file: erasable TypeScript only, no three / remotion /
// react imports.
import { BREAK_END, BREAK_GLYPHS } from './break.ts';
import { DROP2_END, DROP2_GLYPHS } from './drop2.ts';
import { OUTRO_END, OUTRO_GLYPHS } from './outro.ts';

/**
 * One character-flash entry. `at` and `until` are frames on the 3-frame grid (the section's grid audit counts them); `amount` is
 * how much of the picture turns into characters (0–1, default 1): at 1 every cell is a character, below 1 that share of the cells
 * (a fixed, scattered set — the same cells at every frame, growing as the amount grows, so a ramp crumbles the picture cell by cell).
 *
 * - `{ at }` — a hard cut on frame `at` (the first frame of the new shot): frames at … at+3 (the new shot) are characters, at
 *   `amount`; the old shot's frames before the cut stay plain, so the biggest change lands on the cut frame itself. The cut must still
 *   be a segment boundary (the flash is per output frame and never blends the shots).
 * - `{ at, through }` — a held cut: as `{ at }`, but the characters stay on from `at` through frame `through` (inclusive, at least
 *   `at`; shorter or longer than a plain cut's 4 frames), so a section can keep the picture in characters until the frame its own
 *   change lands on (drop 2's crumble holds through the frame before drop2 8.1 and lets go on that kick, where its own field takes
 *   over). Not a ramp: it
 *   never takes `until`.
 * - `{ at, until }` — a ramp (T7): 0 on frame `at`, rising linearly to `amount` on frame `until`, then held at `amount` up to the end
 *   of the section that lists it (exclusive), so the crash stays in characters until the next section takes over.
 *
 * Several entries on one frame: the strongest wins. Rules (tests/glyphFlash.test.ts): `at` never before break 1.1 (`SMASH`); `at`
 * before the section's end (a cut on a section boundary goes in the later section's list); `until` after `at` and inside the
 * section; `through` at least `at`, inside the section, never with `until` (it is the last frame shown, so it need not sit on the
 * grid); no energy white flash above 0.05 on a frame that flashes (the white runs first and greys the black between the
 * characters: put such an accent on `at` + 6 or later, or `at` − 9 or earlier). A score file imports only `type GlyphFlash` from
 * here, never a value (this module imports the score files).
 */
export type GlyphFlash = { at: number; until?: number; through?: number; amount?: number };

/** How many output frames a plain flashed cut `{ at }` turns into characters: the cut frame and the 3 after it. */
export const CUT_FRAMES = 4;

/** A section's entries and the frame its ramps hold up to (its end, exclusive). */
export type GlyphSection = { flashes: readonly GlyphFlash[]; end: number };

/** The character flash of one output frame: the share of the cells that are characters (0 = off) and the cell height in px at 1080p. */
export type GlyphLook = { amount: number; cell: number };

/** Character cell height in px at 1080p: a 213 × 72 terminal (cells are 0.6 as wide as tall, a mono font's advance); scales with the render. */
export const GLYPH_CELL = 15;

/** Every section's entries, in film order. */
export const GLYPH_SECTIONS: readonly GlyphSection[] = [
  { flashes: BREAK_GLYPHS, end: BREAK_END },
  { flashes: DROP2_GLYPHS, end: DROP2_END },
  { flashes: OUTRO_GLYPHS, end: OUTRO_END },
];

/** How much of output frame `frame` one section's entries turn into characters (0–1). */
export function glyphAmount(section: GlyphSection, frame: number): number {
  let out = 0;
  for (const e of section.flashes) {
    const full = e.amount ?? 1;
    let a = 0;
    if (e.until === undefined) a = frame >= e.at && frame <= (e.through ?? e.at + CUT_FRAMES - 1) ? full : 0;
    else if (frame >= e.at && frame < section.end) a = full * Math.min(1, (frame - e.at) / (e.until - e.at));
    out = Math.max(out, a);
  }
  return out;
}

/** The film's character flash on output frame `frame`: the strongest of every section's entries, with the default cell. */
export function glyphFlashAt(frame: number): GlyphLook {
  let amount = 0;
  for (const s of GLYPH_SECTIONS) amount = Math.max(amount, glyphAmount(s, frame));
  return { amount, cell: GLYPH_CELL };
}
