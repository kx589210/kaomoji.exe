// Galaxies of kaomoji, photographed (NASA-style, after the review; the
// look of the space telescopes' deep fields): true black space; stars in the
// colours of their temperature — blue-white, white, yellow, orange — and of
// very uneven brightness, most of them faint and a few blazing (those carry
// diffraction spikes); a warm white-gold bulge; blue-white arms; dark dust
// lanes that eat the light along the arms' inner edges; a few rose knots
// where stars are being born. Several kinds — grand-design, many-armed and
// barred spirals, ellipticals, irregulars — each tens of thousands of faces.
// And the layouts the cosmos puts them in. Pure.
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import type { GalaxyPlacement, GalaxyStar } from '../engine/galaxyField.ts';
import { rng } from '../engine/random.ts';

const TAU = 2 * Math.PI;

/** Star colours by temperature, and the rest of the telescope palette (linear). */
export const SKY = {
  black: linear('#030409'),
  hot: linear('#B9CCFF'),
  white: linear('#F4F6FF'),
  sun: linear('#FFF0D6'),
  gold: linear('#FFD49A'),
  orange: linear('#FFB070'),
  rose: linear('#FF6E9C'),
  dust: linear('#1A0F0A'),
} as const;

export type GalaxyKind = 'grand' | 'multi' | 'barred' | 'elliptical' | 'irregular';

/** A galaxy: its stars (light), its dust (dark), and which stars blaze (indices into stars). */
export type Galaxy = { stars: GalaxyStar[]; dust: GalaxyStar[]; bright: number[] };

/** Brightness of a star: most faint, a few blazing (a steep power law). */
const brightness = (u: number): number => 0.12 + 0.55 * u ** 3 + 3.2 * u ** 40;

/**
 * A galaxy of `n` faces of kind `kind`. Spirals: a bulge whose stars thin out
 * like a Plummer sphere, warm; an exponential disk, thinned inside so the
 * arms' faces stay visible, wound into logarithmic arms, the young stars blue
 * to white; dust along each arm's inner edge (dark faces that drink the light
 * behind them); 2% rose knots. A barred spiral's inner stars sit on a bar. An
 * elliptical is a warm Plummer ball; an irregular a few lumpy blue clouds.
 */
export function photoGalaxy(faces: readonly string[], n: number, seed: number, kind: GalaxyKind): Galaxy {
  const r = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r());
  const face = () => faces[Math.floor(r() * faces.length)];
  const stars: GalaxyStar[] = [];
  const dust: GalaxyStar[] = [];
  const temp = (k: number): RGB => (k < 0.25 ? mixRGB(SKY.hot, SKY.white, k / 0.25) : k < 0.6 ? mixRGB(SKY.white, SKY.sun, (k - 0.25) / 0.35) : mixRGB(SKY.gold, SKY.orange, (k - 0.6) / 0.4));
  const push = (rad: number, a: number, z: number, em: number, color: RGB) => stars.push({ r: rad, a, z, em, color, face: face() });
  if (kind === 'elliptical') {
    for (let k = 0; k < n; k++) {
      let rad: number;
      do {
        const u = r();
        rad = 0.16 * Math.sqrt(u / (1 - u + 1e-9));
      } while (rad > 0.95);
      push(rad, TAU * r(), 0.45 * rad * gauss(), 0.011 * (0.6 + 0.8 * r()), scaleRGB(temp(0.55 + 0.45 * r()), 0.55 * brightness(r())));
    }
  } else if (kind === 'irregular') {
    const clouds = Array.from({ length: 5 }, () => ({ x: (r() - 0.5) * 1.1, y: (r() - 0.5) * 0.8, s: 0.12 + 0.2 * r() }));
    for (let k = 0; k < n; k++) {
      const c = clouds[k % clouds.length];
      const x = c.x + c.s * gauss();
      const y = c.y + c.s * gauss();
      const knot = r() < 0.04;
      push(Math.hypot(x, y), Math.atan2(y, x), 0.05 * gauss(), 0.011 * (0.6 + 0.8 * r()), knot ? scaleRGB(SKY.rose, 1.2) : scaleRGB(temp(0.35 * r()), brightness(r())));
    }
  } else {
    const arms = kind === 'multi' ? 3 + (seed % 2) : 2;
    const pitch = ((kind === 'multi' ? 20 : 13) + 4 * r()) * (Math.PI / 180);
    const nB = Math.round((kind === 'barred' ? 0.22 : 0.16) * n);
    const start = kind === 'barred' ? 0.3 : 0.06;
    for (let k = 0; k < n; k++) {
      if (k < nB) {
        if (kind === 'barred' && r() < 0.6) {
          const along = (r() - 0.5) * 0.7;
          const across = 0.05 * gauss();
          push(Math.hypot(along, across), Math.atan2(across, along), 0.02 * gauss(), 0.012 * (0.6 + 0.8 * r()), scaleRGB(temp(0.6 + 0.4 * r()), 0.6 * brightness(r())));
          continue;
        }
        let rad: number;
        do {
          const u = r();
          rad = 0.06 * Math.sqrt(u / (1 - u + 1e-9));
        } while (rad > 0.3);
        push(rad, TAU * r(), 0.45 * rad * gauss(), 0.013 * (0.6 + 0.8 * r()), scaleRGB(temp(0.55 + 0.45 * r()), 0.6 * brightness(r())));
        continue;
      }
      let rad: number;
      do rad = -0.26 * Math.log(r() * r() + 1e-300);
      while (rad > 1.05 || rad < start || r() > Math.min(1, (rad / 0.3) ** 1.5));
      const arm = Math.floor(r() * arms);
      const centre = (TAU * arm) / arms + Math.log(rad / start) / Math.tan(pitch);
      const between = r() < 0.18;
      const off = between ? TAU * r() : 0.2 * (0.5 + rad) * gauss();
      // Dust: dark faces along each arm's inner edge.
      if (!between && r() < 0.16) {
        dust.push({ r: rad, a: centre - (0.06 + 0.05 * r()) * (1 + rad), z: 0.01 * gauss(), em: 0.02 * (0.7 + 0.6 * r()), color: SKY.dust, face: face() });
      }
      const knot = !between && r() < 0.02;
      const t = Math.min(1, rad / 0.9);
      const color = knot ? scaleRGB(SKY.rose, 1.1) : scaleRGB(temp(between ? 0.5 + 0.3 * r() : (1 - t) * 0.6 * r()), (between ? 0.45 : 1) * brightness(r()));
      push(rad, centre + off, 0.012 * gauss(), (knot ? 0.016 : 0.01) * (0.6 + 0.8 * r()), color);
    }
  }
  // The blazing few: the brightest stars carry spikes.
  const bright = stars
    .map((s, i) => ({ i, l: s.color[0] + s.color[1] + s.color[2] }))
    .sort((a, b) => b.l - a.l)
    .slice(0, Math.max(3, Math.round(n / 2500)))
    .map((x) => x.i);
  return { stars, dust, bright };
}

/** Where star `s` of a galaxy placed by `p` is in the world (the same sums as the GPU's). */
export function starWorld(s: GalaxyStar, p: GalaxyPlacement): [number, number, number] {
  const a = s.a + p.spin / Math.max(0.12, s.r);
  let x = s.r * Math.cos(a);
  let y = s.r * Math.sin(a);
  let z = s.z;
  const ct = Math.cos(p.tilt);
  const st = Math.sin(p.tilt);
  [y, z] = [y * ct - z * st, y * st + z * ct];
  const ch = Math.cos(p.heading);
  const sh = Math.sin(p.heading);
  [x, z] = [x * ch + z * sh, -x * sh + z * ch];
  return [p.centre[0] + x * p.radius, p.centre[1] + y * p.radius, p.centre[2] + z * p.radius];
}

/** Where a galaxy sits in a layout: centre (world units), radius, tilt and heading (radians), its kind, a seed, its brightness. */
export type Spot = { x: number; y: number; z: number; r: number; tilt: number; heading: number; kind: GalaxyKind; seed: number; light: number };

/** A deep field: galaxies of every kind spread over the frame in depth (a jittered grid, near ones bigger), none hiding another. */
export function deepField(count: number, seed: number): Spot[] {
  const r = rng(seed);
  const kinds: GalaxyKind[] = ['grand', 'multi', 'barred', 'elliptical', 'grand', 'irregular', 'multi', 'barred'];
  const cols = Math.ceil(Math.sqrt(count * 1.8));
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const z = -2600 * r();
    const near = 1 - z / 2600;
    const cx = ((i % cols) + 0.5) / cols - 0.5;
    const cy = (Math.floor(i / cols) + 0.5) / rows - 0.5;
    const spread = (3000 - z) * 0.36;
    return {
      x: (cx + (0.25 * (r() - 0.5)) / cols) * spread * (16 / 9),
      y: (cy + (0.25 * (r() - 0.5)) / rows) * spread,
      z,
      r: (160 + 120 * r()) * (0.75 + 0.25 * near) * (1 - z / 3000),
      tilt: 0.2 + 1.05 * r(),
      heading: (r() - 0.5) * 1.6,
      kind: kinds[i % kinds.length],
      seed: seed * 100 + i,
      light: 0.9 + 0.3 * r(),
    };
  });
}

