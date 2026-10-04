// The retro-futurist world (spec revision 8 §5: 50–60 年代太空时代海报):
// deep-blue space, cream, teal, orange, red and mustard, flat fills with
// halftone shading, starbursts and dotted orbits; in 3D, glossy enamel and
// chrome. Pure.
import { type RGB, linear } from '../engine/color.ts';
import type { Look } from '../engine/types.ts';

export const RETRO_HEX = {
  space: '#121B3E',
  deep: '#0A1030',
  cream: '#F5EBD3',
  teal: '#2CB7A6',
  orange: '#F36B3B',
  red: '#E43F3F',
  mustard: '#F4B63C',
  sky: '#4C8FD6',
} as const;
export const RETRO = {
  space: linear(RETRO_HEX.space),
  deep: linear(RETRO_HEX.deep),
  cream: linear(RETRO_HEX.cream),
  teal: linear(RETRO_HEX.teal),
  orange: linear(RETRO_HEX.orange),
  red: linear(RETRO_HEX.red),
  mustard: linear(RETRO_HEX.mustard),
  sky: linear(RETRO_HEX.sky),
} as const;
/** The fills planets, faces and pieces take, in turn. */
export const RETRO_FILLS: readonly RGB[] = [RETRO.teal, RETRO.orange, RETRO.mustard, RETRO.red, RETRO.cream, RETRO.sky];
/** The world's background: space. */
export const RETRO_PAPER: RGB = RETRO.space;
/** Halftone shading: dot pitch (logical px at 1080p) and screen angle. */
export const RETRO_SCREEN = { pitch: 9, angle: (45 * Math.PI) / 180 } as const;

/** Poster space: a soft glow on whatever is lit (stars, the sun, enamel highlights), paper grain and a vignette. */
export function retroLook(): Look {
  return {
    toneMapping: 'linear',
    exposure: 1,
    bloom: { intensity: 0.75, threshold: 0.85, smoothing: 0.25, radius: 0.7 },
    aberration: 0,
    grain: 0.08,
    vignette: 0.3,
  };
}
