// The arcade's bitmaps and the formation's grid (S31E 8-BIT / S31V VOXEL, drop2 12–13; builder A · ARCADE+VOXEL; build sheet
// notes/bid2/drop2-sheet2.md §3 "drop2 12", "drop2 13", design notes/extend/drop2-final.md §4.9–§4.10). Pure data, shared by the
// wave's last 16th (its spray flies to the formation's cells: src/shots/drop2Wave.ts sprayAt) and the arcade (src/shots/drop2Arcade.ts).
// The game is drawn on a 320 × 180 grid of 6 px game pixels (the whole 1920 × 1080 frame); layout px, origin top left, y down.
import { SIGNATURE_BYTES } from '../content/drop2.ts';

/** One game pixel, in layout px. */
export const GP = 6;
/** Game pixels across and down the frame. */
export const GAME_W = 320;
export const GAME_H = 180;

/**
 * The formation is his signature in binary (design §4.9): column k = byte k of E2 80 A2 20 CF 89 20 E2 80 A2, rows top → bottom = bit
 * 7 → bit 0; a set bit is a copy. 27 copies.
 */
export const SIGNATURE_BITS: readonly (readonly boolean[])[] = Array.from({ length: 8 }, (_, row) => SIGNATURE_BYTES.map((b) => ((parseInt(b, 16) >> (7 - row)) & 1) === 1));

/** The formation's grid: 10 columns × 8 rows of cells, pitch 108 × 54 px (18 × 9 game px), its top left at (420, 438) on drop2 12.1 (the
 * design's (420, 440) snapped to the 6 px game grid). */
export const FORMATION = { cols: 10, rows: 8, pitchX: 108, pitchY: 54, left: 420, top: 438 } as const;
/** A copy's sprite: 15 × 7 game px (90 × 42 px), at the left of its cell (the cell's last 3 × 2 game px are the gutter). */
export const COPY_W = 15;
export const COPY_H = 7;

/** The centre of formation cell (col, row) on drop2 12.1, layout px. */
export const cellCentre = (col: number, row: number): [number, number] => [FORMATION.left + col * FORMATION.pitchX + (COPY_W * GP) / 2, FORMATION.top + row * FORMATION.pitchY + (COPY_H * GP) / 2];

/** Rows of a bitmap ('#' lit, '.' dark) → its lit pixels [x, y]. */
export const litOf = (rows: readonly string[]): [number, number][] => rows.flatMap((r, y) => [...r].flatMap((c, x) => (c === '#' ? [[x, y] as [number, number]] : [])));

/**
 * A copy of him, 15 × 7: brackets, two eyes, the ω; its arms つ outside the brackets, down (frame 0) or up (frame 1), toggling every
 * march step like an invader's legs.
 */
export const COPY_SPRITE: readonly [readonly string[], readonly string[]] = [
  [
    '...#.......#...',
    '..#.........#..',
    '..#..#...#..#..',
    '..#.........#..',
    '#.#..#.#.#..#.#',
    '#.#...#.#...#.#',
    '...#.......#...',
  ],
  [
    '#..#.......#..#',
    '#.#.........#.#',
    '..#..#...#..#..',
    '..#.........#..',
    '..#..#.#.#..#..',
    '..#...#.#...#..',
    '...#.......#...',
  ],
];

/**
 * The mothership (him): 13 × 9 at 42 px a pixel (7 game px), 546 × 378 px centred on (960, 230) on drop2 12.1 (design §4.9). Redrawn
 * from the design's bitmap so it reads as (•ω•) and not as [:.;]: round brackets, 2 × 2 eyes, and a two-row ω with three upstrokes
 * (3, 6, 9) joined at the bottom (4–5, 7–8).
 */
export const HERO_BITMAP: readonly string[] = [
  '.#.........#.',
  '#...........#',
  '#..##...##..#',
  '#..##...##..#',
  '#...........#',
  '#..#..#..#..#',
  '#..#..#..#..#',
  '#...##.##...#',
  '.#.........#.',
];
export const MOTHERSHIP = { cx: 960, cy: 230, px: 42 } as const;

/**
 * The cabinet's 5 × 7 pixel font, for the HUD: drawn as game pixels, so the 6 px pixel pass keeps it crisp and the tilt stands it up
 * with everything else. Covers ARCADE_TEXT (src/content/drop2.ts) and the score's digits.
 */
const FONT5: Readonly<Record<string, readonly string[]>> = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  '▲': ['.....', '..#..', '..#..', '.###.', '.###.', '#####', '#####'],
  '▯': ['.....', '#####', '#...#', '#...#', '#...#', '#...#', '#####'],
};
/** The lit pixels [x, y] (game px from the text's top left, 6 px advance) of a HUD line in the 5 × 7 font; unknown characters are blank. */
export function pixelText(text: string): [number, number][] {
  const out: [number, number][] = [];
  [...text].forEach((ch, i) => (FONT5[ch] ?? FONT5[' ']).forEach((row, y) => [...row].forEach((c, x) => c === '#' && out.push([i * 6 + x, y]))));
  return out;
}
/** A HUD line's width in game px. */
export const pixelTextWidth = (text: string): number => [...text].length * 6 - 1;
/** Whether every character of the text has a glyph in the 5 × 7 font. */
export const pixelTextCovers = (text: string): boolean => [...text].every((ch) => ch in FONT5);
