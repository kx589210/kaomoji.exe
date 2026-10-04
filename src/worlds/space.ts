// The cosmos easter egg's world (bars 13–16, spec revision 8 after the review's
// notes: NASA-style): deep-space photography. True black, stars in the
// colours of their temperature, bloom on what blazes, a little grain and a
// vignette, like a space telescope's frame. Pure.
import { type RGB, linear } from '../engine/color.ts';
import type { Look } from '../engine/types.ts';

/** The pieces of the Big Bang: pearl and ice enamel, gold and rose, chrome. */
export const SPACE = {
  pearl: linear('#F4F1EA'),
  ice: linear('#6E9BFF'),
  gold: linear('#FFB347'),
  rose: linear('#FF4F8B'),
  violet: linear('#7B5CFF'),
  black: linear('#030409'),
} as const;

/** The background of space. */
export const SPACE_BLACK: RGB = SPACE.black;

/** A telescope's frame: glow on what blazes, faint grain, a soft vignette. */
export function spaceLook(): Look {
  return {
    toneMapping: 'agx',
    exposure: 1.25,
    bloom: { intensity: 0.9, threshold: 0.75, smoothing: 0.3, radius: 0.75 },
    aberration: 0,
    grain: 0.05,
    vignette: 0.22,
  };
}
