// Interpolation, easing and a closed-form spring. Pure functions of time.
export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number): number => (a === b ? 0 : (x - a) / (b - a));
export const remap = (x: number, a: number, b: number, c: number, d: number): number => lerp(c, d, clamp(invLerp(a, b, x)));
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp(invLerp(a, b, x));
  return t * t * (3 - 2 * t);
};

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inExpo: (t: number) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outQuint: (t: number) => 1 - (1 - t) ** 5,
} satisfies Record<string, Ease>;

/** Eased progress of `x` through the window [a, b], clamped to [0, 1]. */
export const prog = (x: number, a: number, b: number, e: Ease = ease.inOutCubic): number => e(clamp(invLerp(a, b, x)));

export type SpringConfig = { stiffness: number; damping: number; mass: number };

// Remotion's spring() defaults.
const SPRING: SpringConfig = { stiffness: 100, damping: 10, mass: 1 };

/** Position of a damped spring released from 0 towards 1, `t` seconds after release. */
export const springAt = (t: number, config: Partial<SpringConfig> = {}): number => {
  if (t <= 0) return 0;
  const { stiffness, damping, mass } = { ...SPRING, ...config };
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (Math.abs(zeta - 1) < 1e-6) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - root);
  const r2 = -w0 * (zeta + root);
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
};
