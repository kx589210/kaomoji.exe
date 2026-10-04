// The terminal world (spec §5): palette, text grid and finishing. Pure.
import { linear } from '../engine/color.ts';
import type { Look } from '../engine/types.ts';

export const PALETTE = { bg: '#0C0F0E', text: '#D8F5E1', green: '#4CF08C', amber: '#FFB23E', pink: '#FF5FA2' } as const;

/** Terminal text in logical px: font size, monospace cell, margins, grid size. */
export const TERM = { fontPx: 22, cellW: 13.2, cellH: 30, left: 84, top: 60, cols: 130, rows: 32 } as const;

/** Centre of the cell span that starts at (col, row) and is `width` cells wide, on the text plane (origin at the frame centre, y up). */
export const cellCenter = (col: number, row: number, width = 1): [number, number] => [
  TERM.left + (col + width / 2) * TERM.cellW - 960,
  540 - TERM.top - (row + 0.5) * TERM.cellH,
];

/** Text inks: linear light, slightly above 1 so bright text blooms. */
export const INK = {
  text: linear(PALETTE.text, 1.5),
  dim: linear(PALETTE.text, 0.42),
  green: linear(PALETTE.green, 1.7),
  amber: linear(PALETTE.amber, 1.7),
  pink: linear(PALETTE.pink, 1.7),
} as const;

/** How far the CRT glass bulges on the terminal screen (the barrel curvature). */
export const TERMINAL_CURVATURE = 0.045;

/** Finishing of the terminal world. `crt` (0–1) fades the CRT, grain, vignette and fringing together; `flash` brightens for hits; `band` places the rolling refresh band; `curvature` is the glass's bulge. */
export function terminalLook(crt: number, flash = 0, band = 0, curvature = TERMINAL_CURVATURE): Look {
  return {
    toneMapping: 'linear',
    exposure: 1 + 0.45 * flash,
    bloom: { intensity: 1.3 + 1.4 * flash, threshold: 0.85, smoothing: 0.25, radius: 0.75 },
    aberration: 0.0011 * crt,
    grain: 0.35 * crt,
    vignette: 0.55 * crt,
    crt: { amount: crt, curvature, scanlines: 0.3, lines: 360, grille: 0.12, band },
  };
}
