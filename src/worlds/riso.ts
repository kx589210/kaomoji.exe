// The Riso world (spec §5): paper, three inks that print by multiplying,
// halftone screens and the drift of the plates. Pure.
import { type RGB, linear, transmit } from '../engine/color.ts';
import { ease, prog } from '../engine/math.ts';
import { hash, noise1 } from '../engine/random.ts';
import type { Look } from '../engine/types.ts';

export const RISO = { paper: '#F2EDE3', pink: '#FF48B0', blue: '#0078BF', yellow: '#FFE800' } as const;
/** How much light a solid layer of ink takes away: 0.85 lets the paper glow through, as Riso inks do. */
export const DENSITY = 0.85;
export const PAPER: RGB = linear(RISO.paper);

export type Plate = 'pink' | 'blue' | 'yellow';
/** What a solid layer of each ink lets through. Overprints multiply: pink × blue is a purple. */
export const PLATE: Readonly<Record<Plate, RGB>> = {
  pink: transmit(linear(RISO.pink), DENSITY),
  blue: transmit(linear(RISO.blue), DENSITY),
  yellow: transmit(linear(RISO.yellow), DENSITY),
};
/** Halftone screens: dot pitch in world units and one angle per plate, as on a press. */
export const SCREEN: { pitch: number; angle: Readonly<Record<Plate, number>> } = { pitch: 10, angle: { pink: (75 * Math.PI) / 180, blue: (15 * Math.PI) / 180, yellow: 0 } };
/** Fibre texture of the paper background. */
export const PAPER_GRAIN = 0.035;

/** Printed matter: no glow; grain and a little vignette. */
export function risoLook(): Look {
  return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: 0.22, vignette: 0.14 };
}

/**
 * Where each plate prints relative to where it should, in px, at `frame`:
 * the plates drift apart by up to `amount` between strong beats and snap into
 * register on each of them (spec §5: 重拍时"对版"), ringing once as they seat.
 * The drift's noise reads `clock` (the frame by default) and the beats read
 * `frame`: a part moved along the film's map passes seedFrame(frame), so its
 * plates drift exactly as they were approved (the Riso part, build sheet
 * notes/b114/sheet.md §8 W4).
 */
export function misregistration(frame: number, strong: readonly number[], amount = 12, clock = frame): Record<Plate, [number, number]> {
  const prev = strong.filter((s) => s <= frame).pop();
  const next = strong.find((s) => s > frame);
  const apart = (prev === undefined ? 1 : prog(frame, prev, prev + 30, ease.inOutSine)) * (next === undefined ? 1 : 1 - prog(frame, next - 4, next, ease.inCubic));
  // After each strong beat the plates ring once as they seat: a clack (spec §3.1 rule 5).
  const since = prev === undefined ? Infinity : frame - prev;
  const clack = since > 0 && since < 8 ? 0.4 * amount * Math.exp(-since / 2) * Math.sin((Math.PI * since) / 2.5) : 0;
  const drift = (seed: number): [number, number] => [
    amount * apart * noise1(clock / 37, seed) + clack * (2 * hash(seed, 7) - 1),
    amount * apart * noise1(clock / 41, seed + 1) + clack * (2 * hash(seed, 8) - 1),
  ];
  return { pink: drift(11), blue: drift(23), yellow: drift(37) };
}
