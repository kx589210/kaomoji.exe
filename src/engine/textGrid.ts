// Terminal text on a monospace grid: how many cells a character takes and
// where each character of a block of lines sits. Pure; Node tests pin it.

// East Asian Wide and Fullwidth ranges (simplified from UAX #11). Ambiguous
// characters such as ω • ° □ ∀ ━ are narrow, as in most terminals.
const WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f], [0x2e80, 0x303e], [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf],
  [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe30, 0xfe4f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff], [0x20000, 0x3fffd],
];
const COMBINING: readonly (readonly [number, number])[] = [[0x0300, 0x036f], [0x20d0, 0x20ff], [0xfe20, 0xfe2f]];
const within = (cp: number, ranges: readonly (readonly [number, number])[]) => ranges.some(([a, b]) => cp >= a && cp <= b);

/** Cells a character takes: 2 for East Asian wide and fullwidth forms, 0 for combining marks, otherwise 1. */
export function cellWidth(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (within(cp, COMBINING)) return 0;
  return within(cp, WIDE) ? 2 : 1;
}

export type Cell = { ch: string; line: number; col: number; width: number };

/** Every character of `lines` (one row per line) with its first column and width. Combining marks share the previous column. */
export function layoutLines(lines: readonly string[]): Cell[] {
  const cells: Cell[] = [];
  lines.forEach((text, line) => {
    let col = 0;
    for (const ch of text) {
      const width = cellWidth(ch);
      cells.push({ ch, line, col: width === 0 ? Math.max(0, col - 1) : col, width });
      col += width;
    }
  });
  return cells;
}

/** Width of a line in cells. */
export const lineWidth = (text: string): number => [...text].reduce((w, ch) => w + cellWidth(ch), 0);
