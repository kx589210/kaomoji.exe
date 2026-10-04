// Colours for the GPU: sRGB hex → linear-light RGB triples (HDR when scaled
// above 1), and mixing. Pure.
export type RGB = readonly [number, number, number];

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Linear RGB of an sRGB colour such as '#4CF08C', times `intensity`. */
export function linear(hex: string, intensity = 1): RGB {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [toLinear(((n >> 16) & 255) / 255) * intensity, toLinear(((n >> 8) & 255) / 255) * intensity, toLinear((n & 255) / 255) * intensity];
}

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scaleRGB = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

/** Light an ink lets through when printed at `density` (0 none … 1 full) on white: mix(1, ink, density). Overprinted inks multiply. */
export const transmit = (ink: RGB, density: number): RGB => [1 + (ink[0] - 1) * density, 1 + (ink[1] - 1) * density, 1 + (ink[2] - 1) * density];

export const multiplyRGB = (a: RGB, b: RGB): RGB => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];

const toSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** 8-bit sRGB of a linear colour, clamped. */
export const srgb8 = (c: RGB): [number, number, number] => [0, 1, 2].map((i) => Math.round(255 * Math.min(1, Math.max(0, toSrgb(c[i]))))) as [number, number, number];

/** Hue in degrees (0–360) of a linear colour as it looks in sRGB. */
export function hue(c: RGB): number {
  const [r, g, b] = [0, 1, 2].map((i) => toSrgb(Math.min(1, Math.max(0, c[i]))));
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
