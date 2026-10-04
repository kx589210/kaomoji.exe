// Kaomoji as the stuff of the cosmos (spec revision 8: no
// flat discs with faces printed on them — the forms are made of faces). A
// planet is thousands of faces standing on a sphere, each facing outward, so
// the camera foreshortens them like tiles on a globe and the far side turns
// away; land and sea are colours; light from one side shades it into a ball.
// A galaxy is tens of thousands of faces in a thin tilted disk — a bulge whose
// stars thin out with radius like a Plummer sphere, an exponential disk wound
// into logarithmic spiral arms, inside turning faster than out — drawn as
// added light, so where the faces crowd the arms glow. Pure: cards for
// src/engine/cardField.ts.
import type { Card } from '../engine/cardField.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import { clamp } from '../engine/math.ts';
import { hash, rng } from '../engine/random.ts';
import { RETRO } from '../worlds/retro.ts';

type V3 = readonly [number, number, number];
/** What the cards need from the atlas: a face's width over height, and the quad's height per em. */
export type CardLayout = { aspect: (face: string) => number; quadPerEm: number; faces: readonly string[] };
/** A camera for the cards: where it is and its unit right and up (for cards that face it). */
export type CardCamera = { eye: V3; right: V3; up: V3 };

const TAU = 2 * Math.PI;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const unit = (v: readonly number[]): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

/** A card of `face`, `em` world units high, at `centre`, its right and up along the unit vectors given. */
export function card(L: CardLayout, face: string, centre: V3, right: V3, up: V3, em: number, color: RGB, alpha = 1): Card {
  const h = 0.5 * em * L.quadPerEm;
  return { face, centre, right: scale(right, h * L.aspect(face)), up: scale(up, h), color, alpha };
}

/** Rotation of `d` about the y axis by `a`, then a tip about x by `tilt`. */
export function turn(d: V3, a: number, tilt: number): V3 {
  const x = d[0] * Math.cos(a) + d[2] * Math.sin(a);
  const z = -d[0] * Math.sin(a) + d[2] * Math.cos(a);
  return [x, d[1] * Math.cos(tilt) - z * Math.sin(tilt), d[1] * Math.sin(tilt) + z * Math.cos(tilt)];
}

/** Land or sea at unit direction `d` (a few waves of longitude and latitude). */
export function isLand(d: V3): boolean {
  const lon = Math.atan2(d[2], d[0]);
  const lat = Math.asin(clamp(d[1], -1, 1));
  return Math.sin(2 * lon + 1.3 * Math.sin(3 * lat)) + 0.8 * Math.sin(3 * lat - lon) + 0.6 * Math.sin(5 * lon + 2 * lat + 1) > 0.15;
}
const LAND: readonly RGB[] = [RETRO.mustard, RETRO.orange, RETRO.cream, RETRO.mustard, RETRO.red];
const SEA: readonly RGB[] = [RETRO.teal, RETRO.sky, RETRO.teal, mixRGB(RETRO.sky, RETRO.cream, 0.3)];

export type Planet = { centre: V3; radius: number; spin: number; tilt: number; n: number; em: number; seed: number; land?: readonly RGB[]; sea?: readonly RGB[] };

/**
 * The cards of a planet: `n` faces on a Fibonacci sphere, each standing on
 * the surface facing out (its up towards the planet's north), lit from
 * `light` (a unit direction) — bright on the day side, dim on the night side
 * — and sorted far to near for `cam`.
 */
export function planetCards(L: CardLayout, p: Planet, cam: CardCamera, light: V3): Card[] {
  const out: { card: Card; depth: number }[] = [];
  const north0: V3 = [0, 1, 0];
  for (let k = 0; k < p.n; k++) {
    const y = 1 - (2 * (k + 0.5)) / p.n;
    const ring = Math.sqrt(1 - y * y);
    const base: V3 = [ring * Math.cos(GOLDEN * k), y, ring * Math.sin(GOLDEN * k)];
    const n = turn(base, p.spin, p.tilt);
    const centre: V3 = [p.centre[0] + n[0] * p.radius, p.centre[1] + n[1] * p.radius, p.centre[2] + n[2] * p.radius];
    const toEye = unit([cam.eye[0] - centre[0], cam.eye[1] - centre[1], cam.eye[2] - centre[2]]);
    if (dot(n, toEye) < -0.05) continue;
    const pole = turn(north0, p.spin, p.tilt);
    const east = unit(cross(pole, n));
    const north = cross(n, east);
    const lit = Math.max(0, dot(n, light));
    const bright = 0.16 + 1.0 * lit ** 0.9;
    const land = isLand(base);
    const inks = land ? (p.land ?? LAND) : (p.sea ?? SEA);
    const face = L.faces[Math.floor(hash(k, p.seed) * L.faces.length)];
    const em = p.em * (0.85 + 0.3 * hash(k, p.seed + 1));
    out.push({ card: card(L, face, centre, east, north, em, scaleRGB(inks[k % inks.length], bright)), depth: dot([centre[0] - cam.eye[0], centre[1] - cam.eye[1], centre[2] - cam.eye[2]], scale(toEye, -1)) });
  }
  return out.sort((a, b) => b.depth - a.depth).map((o) => o.card);
}

/** A star of a galaxy, in its own plane: radius and angle (galaxy radii, radians), height off the plane, face, colour, em (galaxy radii). */
export type Star = { r: number; a: number; z: number; face: string; color: RGB; em: number };

/**
 * A procedural spiral galaxy of `n` stars: 15% bulge (radius a√(u/(1−u)), a
 * Plummer sphere seen whole, puffed above and below the plane), the rest an
 * exponential disk (radius ~ Gamma(2, h)) whose angles crowd round `arms`
 * logarithmic spirals of pitch `pitch` (a fifth scattered between them), thin
 * in height. Cream and mustard in the bulge, teal to sky outward, 3% hot pink
 * and orange knots.
 */
export function makeGalaxy(L: CardLayout, n: number, seed: number, arms: number, pitch: number): Star[] {
  const r = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r());
  const h = 0.25;
  const out: Star[] = [];
  const nB = Math.round(0.15 * n);
  for (let k = 0; k < n; k++) {
    const bulge = k < nB;
    let rad: number;
    let a: number;
    let z: number;
    if (bulge) {
      do {
        const u = r();
        rad = 0.07 * Math.sqrt(u / (1 - u + 1e-9));
      } while (rad > 0.34);
      a = TAU * r();
      z = 0.6 * rad * gauss() * 0.6;
    } else {
      do rad = -h * Math.log(r() * r() + 1e-300);
      while (rad > 1.05 || rad < 0.04);
      const arm = Math.floor(r() * arms);
      const wind = Math.log(rad / 0.04) / Math.tan(pitch);
      a = r() < 0.2 ? TAU * r() : (TAU * arm) / arms + wind + 0.28 * (0.4 + rad) * gauss();
      z = 0.012 * gauss();
    }
    const t = Math.min(1, rad / 0.9);
    const knot = !bulge && r() < 0.03;
    const color: RGB = bulge ? scaleRGB(mixRGB(RETRO.cream, RETRO.mustard, 0.5 * r()), 0.55) : knot ? mixRGB(RETRO.red, RETRO.orange, r()) : mixRGB(mixRGB(RETRO.cream, RETRO.teal, 0.25 + 0.6 * t), RETRO.sky, 0.6 * t * r());
    const em = (bulge ? 0.012 : 0.009) * (0.6 + 0.8 * r()) * (knot ? 1.6 : 1);
    out.push({ r: rad, a, z, face: L.faces[Math.floor(r() * L.faces.length)], color, em });
  }
  return out;
}

export type GalaxyPose = { centre: V3; radius: number; spin: number; tilt: number; heading: number; light: number };

/** The cards of galaxy `stars` placed by `g` (turned `spin` with the inside faster, its plane tipped `tilt` about x and turned `heading` about y), each facing the camera, as light. */
export function galaxyCards(L: CardLayout, stars: readonly Star[], g: GalaxyPose, cam: CardCamera): Card[] {
  const out: Card[] = [];
  const ct = Math.cos(g.tilt);
  const st = Math.sin(g.tilt);
  const ch = Math.cos(g.heading);
  const sh = Math.sin(g.heading);
  for (const s of stars) {
    // Flat rotation curve: the angle advances as spin / r (capped in the middle).
    const a = s.a + g.spin / Math.max(0.12, s.r);
    const x0 = s.r * Math.cos(a);
    const y0 = s.r * Math.sin(a);
    // Face-on the disk is the xy plane (its height along z); tip it `tilt` about x (0 face-on, π/2 edge-on), then turn it about y.
    const x1 = x0;
    const y1 = y0 * ct - s.z * st;
    const z1 = y0 * st + s.z * ct;
    const x = x1 * ch + z1 * sh;
    const z = -x1 * sh + z1 * ch;
    const centre: V3 = [g.centre[0] + x * g.radius, g.centre[1] + y1 * g.radius, g.centre[2] + z * g.radius];
    out.push(card(L, s.face, centre, cam.right, cam.up, s.em * g.radius, scaleRGB(s.color, g.light)));
  }
  return out;
}

/** Earth as the satellites photograph it, in faces: deep blue sea, sand and green land, white poles, a sharp line between day and night. */
const EARTH = {
  sea: [linear('#0B2C6E'), linear('#123D8F'), linear('#0E3480')],
  land: [linear('#B89A63'), linear('#6E8B3D'), linear('#4F7032'), linear('#9C7A4A')],
  ice: [linear('#EAF2FF')],
  cloud: linear('#FFFFFF'),
  city: linear('#FFC46B'),
  air: linear('#5FA0FF'),
} as const;

/** Cloud cover at unit direction `d`: swirling bands (thresholded waves). */
const cloudy = (d: V3): boolean => {
  const lon = Math.atan2(d[2], d[0]);
  const lat = Math.asin(clamp(d[1], -1, 1));
  return Math.sin(4 * lat + 1.5 * Math.sin(2 * lon + 3 * lat)) + 0.7 * Math.sin(6 * lon - 2 * lat + 0.5) > 0.75;
};

/** Surface slot `k` of planet `p` (a Fibonacci sphere turned by its spin and tilt): its unturned direction, its normal, its centre on the surface, and its east and north. */
export function earthSlot(p: Planet, k: number): { base: V3; n: V3; centre: V3; east: V3; north: V3 } {
  const y = 1 - (2 * (k + 0.5)) / p.n;
  const ring = Math.sqrt(1 - y * y);
  const base: V3 = [ring * Math.cos(GOLDEN * k), y, ring * Math.sin(GOLDEN * k)];
  const n = turn(base, p.spin, p.tilt);
  const pole = turn([0, 1, 0], p.spin, p.tilt);
  const east = unit(cross(pole, n));
  return { base, n, centre: [p.centre[0] + n[0] * p.radius, p.centre[1] + n[1] * p.radius, p.centre[2] + n[2] * p.radius], east, north: cross(n, east) };
}

/** The unlit colour of Earth's surface slot `k` (unturned direction `base`): ice at the poles, land or sea. */
export function earthInk(base: V3, k: number): RGB {
  const inks = Math.abs(base[1]) > 0.9 ? EARTH.ice : isLand(base) ? EARTH.land : EARTH.sea;
  return inks[k % inks.length];
}

/** Daylight on a surface of normal `n` under `sun`: a sharp terminator, brighter towards the sub-solar point. */
export const earthDay = (n: V3, sun: V3): number => {
  const d = dot(n, sun);
  const k = clamp((d + 0.06) / 0.3);
  return k * k * (3 - 2 * k) * (0.45 + 0.75 * Math.max(0, d));
};

/** How much of Earth's dressing shows (each 0–1): clouds, air and city lights. */
export type EarthDress = { clouds: number; air: number; cities: number; /** How many times every face has swapped (on the claps). */ swap?: number };

/**
 * Earth in faces, lit by `sun` (a unit direction): the surface (sea, land,
 * ice at the poles) with a sharp terminator; white cloud faces in swirling
 * bands just above it; the night side dark but for gold city lights on the
 * land; the air glowing blue round the rim. `solid` cards sorted far to near,
 * `light` cards to add.
 */
export function earthCards(L: CardLayout, p: Planet, cam: CardCamera, sun: V3, dress: EarthDress = { clouds: 1, air: 1, cities: 1 }): { solid: Card[]; light: Card[] } {
  const solid: { card: Card; depth: number }[] = [];
  const light: Card[] = [];
  const pole = turn([0, 1, 0], p.spin, p.tilt);
  const place = (base: V3, radius: number) => {
    const n = turn(base, p.spin, p.tilt);
    const centre: V3 = [p.centre[0] + n[0] * radius, p.centre[1] + n[1] * radius, p.centre[2] + n[2] * radius];
    const toEye = unit([cam.eye[0] - centre[0], cam.eye[1] - centre[1], cam.eye[2] - centre[2]]);
    const east = unit(cross(pole, n));
    return { n, centre, toEye, east, north: cross(n, east), dist: Math.hypot(cam.eye[0] - centre[0], cam.eye[1] - centre[1], cam.eye[2] - centre[2]) };
  };
  for (let k = 0; k < p.n; k++) {
    const s = earthSlot(p, k);
    const toEye = unit([cam.eye[0] - s.centre[0], cam.eye[1] - s.centre[1], cam.eye[2] - s.centre[2]]);
    if (dot(s.n, toEye) < -0.05) continue;
    const ice = Math.abs(s.base[1]) > 0.9;
    const land = isLand(s.base);
    const lit = earthDay(s.n, sun);
    const face = L.faces[(Math.floor(hash(k, p.seed) * L.faces.length) + 7 * (dress.swap ?? 0)) % L.faces.length];
    const em = p.em * (0.85 + 0.3 * hash(k, p.seed + 1));
    const dist = Math.hypot(cam.eye[0] - s.centre[0], cam.eye[1] - s.centre[1], cam.eye[2] - s.centre[2]);
    solid.push({ card: card(L, face, s.centre, s.east, s.north, em, scaleRGB(earthInk(s.base, k), 0.03 + lit)), depth: dist });
    // City lights on the night side's land.
    if (dress.cities > 0 && land && !ice && lit < 0.02 && hash(k, p.seed + 2) < 0.55) light.push(card(L, face, s.centre, s.east, s.north, em * 0.7, scaleRGB(EARTH.city, dress.cities * (0.9 + 0.8 * hash(k, p.seed + 3)))));
  }
  const clouds = dress.clouds > 0 ? Math.round(p.n * 0.6) : 0;
  for (let k = 0; k < clouds; k++) {
    const y = 1 - (2 * (k + 0.5)) / clouds;
    const ring = Math.sqrt(1 - y * y);
    const base: V3 = [ring * Math.cos(GOLDEN * k + 0.7), y, ring * Math.sin(GOLDEN * k + 0.7)];
    if (!cloudy(base)) continue;
    const s = place(base, p.radius * 1.018);
    if (dot(s.n, s.toEye) < -0.05) continue;
    const lit = earthDay(s.n, sun);
    solid.push({ card: card(L, L.faces[Math.floor(hash(k, p.seed + 5) * L.faces.length)], s.centre, s.east, s.north, p.em * 0.95, scaleRGB(EARTH.cloud, 0.04 + 1.05 * lit), 0.82 * dress.clouds), depth: s.dist - 1 });
  }
  // The air: a rim of blue faces, brighter on the day side.
  for (let k = 0; dress.air > 0 && k < 1400; k++) {
    const y = 1 - (2 * (k + 0.5)) / 1400;
    const ring = Math.sqrt(1 - y * y);
    const d = turn([ring * Math.cos(GOLDEN * k), y, ring * Math.sin(GOLDEN * k)], 0.2 * p.spin, p.tilt);
    const r = p.radius * (1.035 + 0.05 * hash(k, p.seed + 7));
    const centre: V3 = [p.centre[0] + d[0] * r, p.centre[1] + d[1] * r, p.centre[2] + d[2] * r];
    const toEye = unit([cam.eye[0] - centre[0], cam.eye[1] - centre[1], cam.eye[2] - centre[2]]);
    const graze = 1 - Math.abs(dot(d, toEye));
    if (graze < 0.6) continue;
    const sunny = 0.25 + 0.75 * clamp(dot(d, sun) + 0.3);
    light.push(card(L, L.faces[Math.floor(hash(k, p.seed + 9) * L.faces.length)], centre, cam.right, cam.up, p.em * 0.6, scaleRGB(EARTH.air, dress.air * 0.55 * graze ** 4 * sunny)));
  }
  return { solid: solid.sort((a, b) => b.depth - a.depth).map((o) => o.card), light };
}
