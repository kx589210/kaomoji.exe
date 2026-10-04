// The Swiss world (spec §5): palette and finishing. Pure.
import { type RGB, linear } from '../engine/color.ts';
import type { Look } from '../engine/types.ts';

export const SWISS = { paper: '#F1EEE7', ink: '#111111', red: '#E8402B' } as const;
export const PAPER: RGB = linear(SWISS.paper);
export const INK: RGB = linear(SWISS.ink);
export const SWISS_RED: RGB = linear(SWISS.red);

/** Clean (spec §5: 干净，无纹理): no glow except over S07's glass, a trace of grain against banding, no vignette. */
export function swissLook(glass: boolean): Look {
  return {
    toneMapping: 'linear',
    exposure: 1,
    bloom: glass ? { intensity: 0.6, threshold: 1, smoothing: 0.2, radius: 0.7 } : { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 },
    aberration: 0,
    grain: 0.05,
    vignette: 0,
  };
}
