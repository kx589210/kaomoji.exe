// The cosmos (its bars 1–4) in 3D: the cosmos easter egg, photographed (spec
// revision 8). One continuous camera:
// - cosmos bar 1: the Big Bang (src/shots/burst.ts) throws out thousands of
//   white-hot little faces among the big enamel pieces; on the fill the big
//   pieces fly off while the little faces fall back in and, on cosmos 2.1,
//   lock into Earth and its Moon;
// - cosmos bar 2: Earth of faces — clouds, city lights, a blue rim of air —
//   spins while the camera pulls back, surging on every kick; meteors of faces
//   land on the kicks of beats 2–4 and stay lit;
// - cosmos bar 3: out through the galaxy's arm, its stars and pink and violet
//   nebulae streaming past, Earth shrinking to a point;
// - cosmos bar 4: the whole galaxy, tens of thousands of faces, a light running
//   out along the arms on each kick; on beat 3 it turns face-on and the view
//   flattens (a dolly zoom to almost orthographic); on the stutter of beat 4
//   each slice redraws it one step closer to neon — the bridge into the club
//   (club 1.1).
// Every position is part-local (src/score/film.ts). Pure: the scene
// (src/scenes/kosmos.ts) draws it.
import { FILLER, GALAXY_FACES } from '../content/castDrop1.ts';
import type { Pose } from '../engine/camera.ts';
import type { Card } from '../engine/cardField.ts';
import { type RGB, linear, mixRGB, scaleRGB } from '../engine/color.ts';
import { type GalaxyPlacement, type GalaxyStar, type GalaxyStyle, PHOTO_STYLE, neonOf } from '../engine/galaxyField.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Spike } from '../engine/spikeField.ts';
import { struck } from '../engine/temporal.ts';
import { moveTrack, punch, strike } from '../motion/hit.ts';
import { CLAPS, COSMOS_END, FILL, HATS, KICKS, LEVELS, METEOR_LANDS, OPEN_HATS, RESUME, STUTTER } from '../score/drop1.ts';
import { partFrame, partStart, seedFrame } from '../score/film.ts';
import { SPACE, SPACE_BLACK } from '../worlds/space.ts';
import { AFTER, BURST_V, EARTH_R, GATHER, ORIGIN, burstCamera, burstClock, fib } from './burst.ts';
import { type Galaxy, type GalaxyKind, SKY, photoGalaxy, starWorld } from './galaxies.ts';
import { type CardCamera, type CardLayout, type Planet, card, earthCards, earthDay, earthInk, earthSlot, planetCards } from './kosmos.ts';

type V3 = readonly [number, number, number];
const TAU = 2 * Math.PI;
const unit = (v: readonly number[]): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const gauss = (...ns: number[]): number => Math.sqrt(-2 * Math.log(hash(...ns, 1) + 1e-12)) * Math.cos(TAU * hash(...ns, 2));
/** A position in the cosmos: bar 1-based, beat 0-based. */
const cosmos = (bar: number, beat = 0): number => partFrame('cosmos', bar, beat);

/** The span this module draws: the cosmos's content (cosmos 1–4; its held bars 5–6 show its last frame). */
export const VOYAGE = { from: partStart('cosmos'), to: COSMOS_END } as const;
/** Cosmos 4.3: the camera rises over the galaxy and the view flattens, until the stutter. */
export const FLATTEN = { from: cosmos(4, 2), to: STUTTER.from } as const;

// ── Earth and the Moon ────────────────────────────────────────────────────
export const EARTH_N = 2200;
export const EARTH_EM = 26;
const EARTH_SEED = 77;
export const MOON_N = 420;
export const MOON_R = 0.27 * EARTH_R;
const MOON_ORBIT = 2.5 * EARTH_R;
/** Little faces of the Big Bang that fly off for good. */
export const AWAY_N = 2600;
/** Sunlight comes from the left and a little in front. */
export const SUN_DIR: V3 = unit([-0.78, 0.28, 0.55]);
const MOON_INK = { land: [linear('#9C9A96'), linear('#86858A'), linear('#B3B0AA')], sea: [linear('#4B4C52'), linear('#5D5E64')] } as const;

/** Earth's faces pop out on each kick of cosmos bar 2. */
const earthPop = (f: number): number => 1 + 0.06 * KICKS.filter((k) => k < cosmos(3) && k <= f && k > f - 14).reduce((s, k) => s + punch(f, k), 0);

/** Earth at `f`: centred where the sun burst, spinning slowly. */
export const earthPlanet = (f: number, pop = 1): Planet => ({ centre: ORIGIN, radius: EARTH_R * pop, spin: 1.9 + 0.006 * (f - GATHER.to), tilt: 0.35, n: EARTH_N, em: EARTH_EM, seed: EARTH_SEED });

/** The Moon's centre at `f`: on a tilted orbit, starting to Earth's upper right. */
export const moonCentre = (f: number): V3 => {
  const a = 0.75 + 0.0105 * (f - GATHER.to);
  return [ORIGIN[0] + MOON_ORBIT * Math.cos(a), ORIGIN[1] + MOON_ORBIT * 0.32 * Math.sin(a) + 0.18 * MOON_ORBIT, ORIGIN[2] + MOON_ORBIT * 0.85 * Math.sin(a)];
};
export const moonPlanet = (f: number): Planet => ({ centre: moonCentre(f), radius: MOON_R, spin: 0.4 + 0.004 * (f - GATHER.to), tilt: 0.2, n: MOON_N, em: 15, seed: 91, land: MOON_INK.land, sea: MOON_INK.sea });

/** Earth and the Moon fade as they shrink into the arm. */
export const earthFade = (f: number): number => 1 - smoothstep(cosmos(3, 3), cosmos(4, 0.5), f);

// ── The drums on the small things ────────────────────────────────────────
// Every change keyed to a drum — a face swap, which things sparkle, a flare's
// onset, a meteor landing — is taken a quarter frame early (struck), so the
// drum's own output frame shows it whole rather than half-blended with the
// frame before; its decay is timed from the drum itself.
/** Frames since the drum at `at`, from 0 (a quarter frame early it is already the hit). */
const since = (at: number, f: number): number => Math.max(0, f - at);

/** A sparkle for item `k` at `f`: a fifth of things flare on each closed hat, a quarter flare harder on each open hat (×1 when quiet). */
export function hatPulse(f: number, k: number): number {
  let p = 1;
  const h = HATS.filter((x) => struck(x, f) && x > f - 10).pop();
  if (h !== undefined && hash(k, seedFrame(h), 71) < 0.22) p = Math.max(p, 1 + 0.35 * Math.exp(-since(h, f) / 2.5));
  const o = OPEN_HATS.filter((x) => struck(x, f) && x > f - 16).pop();
  if (o !== undefined && hash(k, seedFrame(o), 72) < 0.25) p = Math.max(p, 1 + 1.2 * Math.exp(-since(o, f) / 4));
  return p;
}
/** How many claps have gone by at `f`: every face swaps at once on each, whole on the clap's frame. */
export const clapsBy = (f: number): number => CLAPS.filter((c) => struck(c, f)).length;
/** A flare on each clap (×1 when quiet). */
const clapFlare = (f: number, k = 1.6): number => {
  const c = CLAPS.filter((x) => struck(x, f) && x > f - 20).pop();
  return c === undefined ? 1 : 1 + (k - 1) * Math.exp(-since(c, f) / 5);
};

// ── The Big Bang's little faces ───────────────────────────────────────────
type Mote = { fate: 'earth' | 'moon' | 'away'; slot: number; dir: V3; speed: number; em: number; color: RGB; face: number };
const TEMPS: readonly RGB[] = [SKY.hot, SKY.white, SKY.sun, SKY.gold, SKY.orange, SKY.white];

/** Every little face: Earth's slots first (each flies out roughly along its own slot's ray, so it falls back home), then the Moon's, then the ones that fly away. */
export const MOTES: readonly Mote[] = (() => {
  const out: Mote[] = [];
  const lockEarth = earthPlanet(GATHER.to);
  const lockMoon = moonPlanet(GATHER.to);
  const total = EARTH_N + MOON_N + AWAY_N;
  for (let i = 0; i < total; i++) {
    const fate = i < EARTH_N ? 'earth' : i < EARTH_N + MOON_N ? 'moon' : 'away';
    const slot = fate === 'earth' ? i : fate === 'moon' ? i - EARTH_N : i - EARTH_N - MOON_N;
    const home = fate === 'earth' ? earthSlot(lockEarth, slot).n : fate === 'moon' ? unit(sub(earthSlot(lockMoon, slot).centre, ORIGIN)) : fib((slot * 7919) % AWAY_N, AWAY_N);
    const jitter = fate === 'away' ? 0.08 : 0.32;
    const dir = unit([home[0] + jitter * gauss(i, 11), home[1] + jitter * gauss(i, 12), home[2] + jitter * gauss(i, 13)]);
    const u = hash(i, 14);
    const b = 0.16 + 0.6 * u ** 3 + 2.4 * u ** 40;
    out.push({ fate, slot, dir, speed: 0.12 + 1.15 * hash(i, 15) ** 0.8, em: 7 + 12 * hash(i, 16), color: scaleRGB(TEMPS[Math.floor(hash(i, 17) * TEMPS.length)], b), face: i });
  }
  return out;
})();

const HOT: RGB = scaleRGB(SKY.white, 1.3);

/** How far mote `m` has flown at `f`: with the burst until time snaps back, then slowing (as if held), so on the fill the faces hang round the camera to fall back in. */
const reach = (m: Mote, f: number): number => {
  const v = 0.7 * BURST_V * m.speed;
  if (f <= RESUME) return 30 + v * burstClock(f);
  return 30 + v * burstClock(RESUME) + v * AFTER * 14 * (1 - Math.exp(-(f - RESUME) / 14));
};
const flying = (m: Mote, f: number): V3 => add(ORIGIN, mul(m.dir, reach(m, f)));

/**
 * The little faces at `f` (cosmos bar 1): `light` — flying, white-hot, cooling to
 * their stars' colours, facing the camera — and `solid` — Earth's, settling
 * into its surface on the fill, turning from the camera to lie on it and
 * taking the land's and sea's colours (sorted far to near).
 */
export function moteCards(L: CardLayout, f: number, cam: CardCamera): { light: Card[]; solid: Card[] } {
  const light: Card[] = [];
  const solid: { card: Card; depth: number }[] = [];
  if (f < VOYAGE.from || f >= GATHER.to + 8) return { light, solid: [] };
  const heat = 1 - smoothstep(VOYAGE.from, VOYAGE.from + 54, f);
  // Through the freeze the little faces hang back as a dim haze round the big pieces.
  const haze = 1 - 0.55 * smoothstep(VOYAGE.from + 4, VOYAGE.from + 10, f) * (1 - smoothstep(cosmos(1, 2), cosmos(1, 2.3), f));
  // Falling in a shell at a time, one on each snare of the fill, slamming home on the downbeat.
  const u = clamp(
    moveTrack(f, 0, [
      { at: FILL[0], to: 0.12, tau: 2, bounce: 0 },
      { at: FILL[1], to: 0.3, tau: 2, bounce: 0 },
      { at: FILL[2], to: 0.55, tau: 2, bounce: 0 },
      { at: FILL[3], to: 0.8, tau: 2, bounce: 0 },
      { at: GATHER.to, to: 1, kind: 'slam', lead: 5, bounce: 0 },
    ]),
  );
  const lockEarth = earthPlanet(GATHER.to);
  const lockMoon = moonPlanet(GATHER.to);
  const grow = smoothstep(VOYAGE.from, VOYAGE.from + 3, f);
  for (const m of MOTES) {
    const face = L.faces[Math.floor(hash(m.slot, m.fate === 'earth' ? EARTH_SEED : m.face) * L.faces.length)];
    const hot = mixRGB(m.color, HOT, heat);
    if (m.fate === 'away') {
      const gone = 1 - smoothstep(GATHER.from, GATHER.to + 6, f);
      if (gone <= 0) continue;
      light.push(card(L, face, flying(m, f), cam.right, cam.up, m.em * grow, scaleRGB(hot, gone * haze)));
      continue;
    }
    if (f >= GATHER.to) continue;
    const s = m.fate === 'earth' ? earthSlot(lockEarth, m.slot) : earthSlot(lockMoon, m.slot);
    const pos = mix3(flying(m, f), s.centre, u);
    const right = unit(mix3(cam.right, s.east, u));
    const up = unit(mix3(cam.up, s.north, u));
    const em = lerp(m.em, m.fate === 'earth' ? EARTH_EM * (0.85 + 0.3 * hash(m.slot, EARTH_SEED + 1)) : 15, u) * grow;
    const settle = smoothstep(0.55, 1, u);
    if (settle < 1) light.push(card(L, face, pos, right, up, em, scaleRGB(hot, (1 - settle) * haze)));
    if (settle > 0 && m.fate === 'earth') {
      const ink = scaleRGB(earthInk(s.base, m.slot), 0.03 + earthDay(s.n, SUN_DIR));
      solid.push({ card: card(L, face, pos, right, up, em, mixRGB(hot, ink, u), settle), depth: len(sub(cam.eye, pos)) });
    }
  }
  return { light, solid: solid.sort((a, b) => b.depth - a.depth).map((o) => o.card) };
}

// ── Earth, the Moon and the meteors (cosmos bar 2 on) ─────────────────────
type Meteor = { land: number; slot: number; dir: V3; face: number; length: number };
/** Fourteen faces land on each kick of beats 2–4 of cosmos bar 2, each on a slot facing the camera. */
export const METEORS: readonly Meteor[] = METEOR_LANDS.flatMap((land, b) =>
  Array.from({ length: b === 2 ? 24 : 14 }, (_, j): Meteor => {
    let slot = 0;
    for (let t = 0; t < 60; t++) {
      slot = Math.floor(hash(b, j, t, 21) * EARTH_N);
      const n = earthSlot(earthPlanet(land), slot).n;
      if (n[2] > 0.45) break;
    }
    const n = earthSlot(earthPlanet(land), slot).n;
    return { land: land + (j % 3) - 1, slot, dir: unit([n[0] * 0.5 + 0.8 * (hash(b, j, 22) - 0.5), n[1] * 0.5 + 0.55, n[2] * 0.5 + 0.9]), face: b * 14 + j, length: 2300 + 700 * hash(b, j, 23) };
  }),
);
const FALL = 22;

/** Earth, the Moon and the landed meteors at `f`: surface and clouds (solid, far to near), cities, air and glows (light, on the front only), meteors in flight (light). */
export function earthScene(L: CardLayout, f: number, cam: CardCamera): { solid: Card[]; front: Card[]; flight: Card[] } {
  const fade = earthFade(f);
  if (f < GATHER.to || fade <= 0) return { solid: [], front: [], flight: [] };
  const dressed = smoothstep(GATHER.to, GATHER.to + 14, f);
  const earth = earthCards(L, earthPlanet(f, earthPop(f)), cam, SUN_DIR, { clouds: dressed, air: dressed, cities: dressed, swap: clapsBy(f) });
  const moonIn = smoothstep(GATHER.to - 4, GATHER.to + 2, f);
  const moon = planetCards(L, moonPlanet(f), cam, SUN_DIR).map((c) => ({ ...c, alpha: moonIn }));
  const front = earth.light.map((c, k) => ({ ...c, color: scaleRGB(c.color, hatPulse(f, k)) }));
  const flight: Card[] = [];
  for (const m of METEORS) {
    const face = L.faces[(m.face + 7 * clapsBy(f)) % L.faces.length];
    const s = earthSlot(earthPlanet(f, earthPop(f)), m.slot);
    if (!struck(m.land, f)) {
      const u = (f - (m.land - FALL)) / FALL;
      if (u <= 0) continue;
      const home = earthSlot(earthPlanet(m.land), m.slot).centre;
      for (let j = 0; j < 6; j++) {
        const v = clamp(u - 0.045 * j);
        if (v <= 0) break;
        const pos = add(home, mul(m.dir, m.length * (1 - v * v)));
        flight.push(card(L, face, pos, cam.right, cam.up, 34 * (1 - 0.12 * j), scaleRGB(SPACE.gold, 2.4 * 0.55 ** j)));
      }
    } else {
      // Landed: a flash on the surface, then the face stays lit, riding the planet.
      const t = since(m.land, f);
      const glow = (m.land >= METEOR_LANDS[2] - 1 ? 4 : 2.6) * Math.exp(-t / 7) + 0.9;
      front.push(card(L, face, s.centre, s.east, s.north, EARTH_EM * (1.1 + 1.4 * Math.exp(-t / 5)), scaleRGB(SPACE.gold, glow * hatPulse(f, m.face + 500) * clapFlare(f, 1.4))));
    }
  }
  const solid = [...moon, ...earth.solid];
  return { solid: solid.map((c) => ({ ...c, alpha: (c.alpha ?? 1) * fade })), front: front.map((c) => ({ ...c, color: scaleRGB(c.color, fade) })), flight };
}

const DARK_BODY = linear('#02060F');
/** The core's colour as its heat falls from 1 to 0, like iron cooling: white-hot, gold, orange, deep red, then Earth's dark body (never grey). */
const COOLING: readonly RGB[] = [DARK_BODY, scaleRGB(linear('#C81E06'), 0.14), scaleRGB(linear('#FF6A1A'), 1.4), scaleRGB(SKY.gold, 2.4), scaleRGB(SKY.white, 3)];
function cooling(heat: number): RGB {
  const x = clamp(heat) * (COOLING.length - 1);
  const i = Math.min(COOLING.length - 2, Math.floor(x));
  return mixRGB(COOLING[i], COOLING[i + 1], x - i);
}

/**
 * How the core is shaded across its disc (mu: the cosine between the view and
 * the surface, 1 in the middle, 0 at the limb), for a limb from 0 (hot: it
 * glows from inside, the limb a third of the middle) to 1 (an ember: the limb
 * near black, so the cooling ball reads as a ball, never a flat disc). The
 * scene's shader uses the same numbers.
 */
export const CORE_LIMB = { hot: { floor: 0.3, power: 0.55 }, cold: { floor: 0.04, power: 1.5 } } as const;
export function coreShade(mu: number, limb: number): number {
  const floor = lerp(CORE_LIMB.hot.floor, CORE_LIMB.cold.floor, limb);
  return floor + (1 - floor) * clamp(mu) ** lerp(CORE_LIMB.hot.power, CORE_LIMB.cold.power, limb);
}

/** The dark bodies under the faces: Earth's (the Big Bang's core cooling into it; its limb darkening as it cools past orange) and the Moon's. */
export function bodies(f: number, core: { r: number; heat: number; flare: number }): { earth: { r: number; color: RGB; limb: number }; moon: { centre: V3; r: number; on: boolean } } {
  const fade = earthFade(f);
  const r = f < GATHER.to ? core.r : 0.985 * EARTH_R * earthPop(f) * (fade > 0 ? 1 : 0);
  const limb = 1 - smoothstep(0.3, 0.5, core.heat);
  return { earth: { r, color: scaleRGB(cooling(core.heat), core.flare), limb }, moon: { centre: moonCentre(f), r: 0.97 * MOON_R, on: f >= GATHER.to - 2 && fade > 0 } };
}

// ── The galaxy ────────────────────────────────────────────────────────────
export const GALAXY_R = 1e5;
const GALAXY_TILT = (55 * Math.PI) / 180;
const GALAXY_HEADING = 0.25;
const POOL: readonly string[] = [...GALAXY_FACES, ...FILLER];
let heroMemo: Galaxy | null = null;
/** Our galaxy: a grand-design spiral of 60 000 faces. */
export const heroGalaxy = (): Galaxy => (heroMemo ??= photoGalaxy(POOL, 60000, 4242, 'grand'));

/** Far galaxies behind it (seen through cosmos bar 4): offsets from our galaxy's centre, radius, tilt, heading, kind. */
const FAR: readonly { at: V3; r: number; tilt: number; heading: number; kind: GalaxyKind; seed: number }[] = [
  { at: [-2.3e5, 1.1e5, -6e5], r: 2.6e4, tilt: 0.9, heading: 0.4, kind: 'barred', seed: 501 },
  { at: [2.5e5, 0.9e5, -8e5], r: 3.0e4, tilt: 0.5, heading: -0.6, kind: 'multi', seed: 502 },
  { at: [-2.6e5, -1.2e5, -7e5], r: 2.0e4, tilt: 1.2, heading: 0.2, kind: 'elliptical', seed: 503 },
  { at: [2.2e5, -1.3e5, -5e5], r: 2.4e4, tilt: 0.7, heading: 0.9, kind: 'grand', seed: 504 },
  { at: [0.4e5, 1.6e5, -1.1e6], r: 1.8e4, tilt: 1.0, heading: -0.3, kind: 'irregular', seed: 505 },
  { at: [-0.6e5, -1.7e5, -9e5], r: 2.2e4, tilt: 0.4, heading: 1.2, kind: 'multi', seed: 506 },
];
let farMemo: Galaxy[] | null = null;
export const farGalaxies = (): Galaxy[] => (farMemo ??= FAR.map((g) => photoGalaxy(POOL, 9000, g.seed, g.kind)));

/** The angle (at spin 0) of the brightest arm of `g` at radius `r`. */
export function armAngle(g: Galaxy, r: number): number {
  const bins = new Float64Array(90);
  for (const s of g.stars) {
    if (Math.abs(s.r - r) > 0.02) continue;
    const a = ((s.a % TAU) + TAU) % TAU;
    bins[Math.floor((a / TAU) * 90) % 90] += s.color[0] + s.color[1] + s.color[2];
  }
  let best = 0;
  for (let i = 1; i < 90; i++) if (bins[i] > bins[best]) best = i;
  return ((best + 0.5) / 90) * TAU;
}
/** Where Earth sits in the galaxy: on an arm, this far out (galaxy radii). */
const EARTH_AT = 0.62;
let earthAngleMemo: number | null = null;
const earthAngle = (): number => (earthAngleMemo ??= armAngle(heroGalaxy(), EARTH_AT));

/** The galaxy's turn at content frame `f`: slow, then faster through the stutter, so each repeated slice visibly jumps back. */
export const galaxySpin = (f: number): number => 0.0016 * (f - GATHER.to) + 0.012 * Math.max(0, f - STUTTER.from);
/** The flatten is itself the cosmos 4.3 hit: a launch on the kick, settling exactly on the stutter. */
const flatten = (f: number): number => clamp(strike(f, FLATTEN.from, 3, 0));
const galaxyTilt = (f: number): number => GALAXY_TILT * (1 - flatten(f));
const galaxyHeading = (f: number): number => GALAXY_HEADING * (1 - flatten(f));

/** Our galaxy's centre at `f`: wherever puts Earth on its arm. */
export function galaxyCentre(f: number): V3 {
  const at: GalaxyStar = { r: EARTH_AT, a: earthAngle(), z: 0, em: 0, color: [0, 0, 0], face: '' };
  const e = starWorld(at, { centre: [0, 0, 0], radius: GALAXY_R, tilt: galaxyTilt(f), heading: galaxyHeading(f), spin: galaxySpin(f), light: 1 });
  return sub(ORIGIN, e);
}

/** Every galaxy's placement at `f`: ours first, then the far ones. */
export function galaxyPlacements(f: number): GalaxyPlacement[] {
  const g = galaxyCentre(f);
  // Dimmer while the camera is still inside the disk (its stars crowd the view), full once it is out.
  const light = 0.6 * smoothstep(cosmos(2, 3), cosmos(3, 3), f) * lerp(0.35, 1, smoothstep(cosmos(3, 2.5), cosmos(4, 0.5), f));
  const far = smoothstep(cosmos(4), cosmos(4, 1.6), f) * (1 - smoothstep(FLATTEN.from + 6, FLATTEN.to, f));
  return [
    { centre: g, radius: GALAXY_R, tilt: galaxyTilt(f), heading: galaxyHeading(f), spin: galaxySpin(f), light },
    ...FAR.map((s, i) => ({ centre: add(g, s.at), radius: s.r, tilt: s.tilt, heading: s.heading, spin: 0.3 * i + galaxySpin(f), light: far })),
  ];
}

// ── The camera ────────────────────────────────────────────────────────────
/** How much is seen (world units, the frame's height at the target): Earth close up, then out through the arm to the whole galaxy, face-on. */
const H_KEYS: readonly (readonly [number, number])[] = [
  [GATHER.to, 1080],
  [cosmos(2, 2), 1500],
  [cosmos(3), 3600],
  [cosmos(3, 2), 1.4e4],
  [cosmos(4), 5.6e4],
  [FLATTEN.from, 1.32e5],
  [FLATTEN.to, 2.1e5],
  [VOYAGE.to, 2.2e5],
];
/** A monotone cubic through (x, y) keys (Fritsch–Carlson), so the pull never stalls or backs up. */
function monotone(keys: readonly (readonly [number, number])[], x: number): number {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  const d = keys.slice(0, -1).map((k, i) => (keys[i + 1][1] - k[1]) / (keys[i + 1][0] - k[0]));
  const m = keys.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])));
  let i = 0;
  while (x > keys[i + 1][0]) i++;
  const h = keys[i + 1][0] - keys[i][0];
  const t = (x - keys[i][0]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h * m[i + 1];
}
const LOG_KEYS = H_KEYS.map(([f, h]) => [f, Math.log(h)] as const);

/** Time warped so the pull surges on every kick and coasts towards the next, never stopping (spec §3.1 rules 2–3). */
function surge(f: number): number {
  if (f < GATHER.to || f >= STUTTER.from) return f;
  const t = (f - GATHER.to) / 24;
  const i = Math.floor(t);
  const u = t - i;
  // Most of each beat's step out in the first three frames after the kick, then a coast — never a stop.
  return GATHER.to + (i + lerp(u, strike(24 * u, 0, 3, 0), 0.7)) * 24;
}

/** The frame's height at the target (world units) at `f`. */
export const viewHeight = (f: number): number => Math.exp(monotone(LOG_KEYS, surge(f)));
/** The lens: 20° until cosmos 4.3, then a dolly zoom down to 1.6° (almost orthographic) by the stutter. */
export const voyageFov = (f: number): number => lerp(20, 1.6, flatten(f));
/** From Earth to our galaxy's core: where the camera looks. */
const lookAtCore = (f: number): number => smoothstep(cosmos(3, 2), cosmos(4, 1.2), f);

/** The camera at `f`, with near and far planes for its scale. */
export function voyageCamera(f: number): Pose & { near: number; far: number } {
  if (f < GATHER.to) return { ...burstCamera(f), near: 10, far: 2e5 };
  const fov = voyageFov(f);
  const dist = viewHeight(f) / (2 * Math.tan((fov * Math.PI) / 360));
  const target = mix3(ORIGIN, galaxyCentre(f), lookAtCore(f));
  return { position: [target[0], target[1], target[2] + dist], target, up: [0, 1, 0], fov, near: Math.max(10, dist * 0.02), far: dist * 30 + 3e6 };
}

// ── Out through the arm ───────────────────────────────────────────────────
type Local = { pos: V3; em: number; color: RGB; face: number; neb: boolean };
/** The arm round Earth: stars at every scale from 1 500 to 24 000 units (so they pass the camera at an even rate as it pulls back), in the galaxy's plane, and pink and violet nebulae. */
export const LOCAL: readonly Local[] = (() => {
  const out: Local[] = [];
  const ct = Math.cos(GALAXY_TILT);
  const st = Math.sin(GALAXY_TILT);
  const ch = Math.cos(GALAXY_HEADING);
  const sh = Math.sin(GALAXY_HEADING);
  const toWorld = (x: number, y: number, z: number): V3 => {
    const y1 = y * ct - z * st;
    const z1 = y * st + z * ct;
    return [ORIGIN[0] + x * ch + z1 * sh, ORIGIN[1] + y1, ORIGIN[2] - x * sh + z1 * ch];
  };
  const nebulae = Array.from({ length: 7 }, (_, i) => ({ r: 2000 * 10 ** hash(i, 31), a: TAU * hash(i, 32), color: [SKY.rose, SPACE.violet, linear('#C04CFF'), SKY.rose][i % 4] }));
  for (let i = 0; out.length < 7500 && i < 20000; i++) {
    const neb = hash(i, 33) < 0.2;
    let x: number;
    let y: number;
    let z: number;
    let color: RGB;
    let em: number;
    if (neb) {
      const c = nebulae[i % nebulae.length];
      x = c.r * Math.cos(c.a) + 0.45 * c.r * gauss(i, 34);
      y = c.r * Math.sin(c.a) + 0.45 * c.r * gauss(i, 35);
      z = 0.15 * c.r * gauss(i, 36);
      color = scaleRGB(c.color, 0.035 + 0.05 * hash(i, 37));
      em = 0.045 * c.r * (0.6 + 0.8 * hash(i, 38));
    } else {
      const r = 1500 * 16 ** hash(i, 39);
      const a = TAU * hash(i, 40);
      x = r * Math.cos(a);
      y = r * Math.sin(a);
      z = 0.1 * r * gauss(i, 41);
      const u = hash(i, 42);
      color = scaleRGB(TEMPS[Math.floor(hash(i, 43) * TEMPS.length)], 0.07 + 0.45 * u ** 3 + 2.2 * u ** 40);
      em = r * (0.007 + 0.009 * hash(i, 44));
    }
    const pos = toWorld(x, y, z);
    // Keep the line of sight to Earth clear.
    const d = unit(sub(pos, ORIGIN));
    if (d[2] > 0.88) continue;
    out.push({ pos, em, color, face: i, neb });
  }
  return out;
})();

/** How bright the arm round Earth is at `f`. */
const localLight = (f: number): number => smoothstep(cosmos(2, 2.5), cosmos(3, 1), f) * (1 - smoothstep(cosmos(4), cosmos(4, 1.8), f));

/** A card no smaller than `minPx` on screen (smaller ones grow and dim to keep their light) and fading out as it passes `maxPx`; null when gone. */
function sized(c: Card, eye: V3, pxScale: number, minPx: number, maxPx: number): Card | null {
  const dist = len(sub(c.centre, eye));
  const h = 2 * len(c.up);
  const px = (h * pxScale) / Math.max(1, dist);
  const big = 1 - smoothstep(0.6 * maxPx, maxPx, px);
  if (big <= 0) return null;
  const k = Math.max(1, minPx / Math.max(1e-6, px));
  return { ...c, right: mul(c.right, k), up: mul(c.up, k), color: scaleRGB(c.color, big / (k * k)) };
}

/** The arm's cards at `f` for `cam` (pxScale: viewport px per unit at distance 1). */
export function localCards(L: CardLayout, f: number, cam: CardCamera, pxScale: number, viewport: number): Card[] {
  const light = localLight(f);
  if (light <= 0) return [];
  const out: Card[] = [];
  const forward = unit(sub(ORIGIN, cam.eye));
  const swap = 7 * clapsBy(f);
  const neb = clapFlare(f, 1.6);
  for (const s of LOCAL) {
    if (dot(sub(s.pos, cam.eye), forward) < 20) continue;
    const k = s.neb ? neb : hatPulse(f, s.face);
    const c = sized(card(L, L.faces[(s.face + swap) % L.faces.length], s.pos, cam.right, cam.up, s.em, scaleRGB(s.color, light * k)), cam.eye, pxScale, 2.6 * viewport, 300 * viewport);
    if (c) out.push(c);
  }
  return out;
}

// ── Far stars ─────────────────────────────────────────────────────────────
/**
 * A sky of 1 400 far stars round the camera (they keep their place on screen
 * as it pulls back), of very uneven brightness, twinkling on the hats; each
 * 3–9 px at 1080p (pxScale: device px per unit at distance 1; viewport: device
 * px per 1080p px), so a 4K frame is the same picture, scaled.
 */
export function skyCards(L: CardLayout, f: number, cam: CardCamera, pxScale: number, reach: number, viewport: number): Card[] {
  const out: Card[] = [];
  const hat = HATS.filter((h) => struck(h, f)).pop();
  for (let k = 0; k < 1400; k++) {
    const d = fib((k * 613) % 1400, 1400);
    const u = hash(k, 51);
    let b = 0.06 + 0.45 * u ** 6 + 2.2 * u ** 60;
    if (hat !== undefined && hash(k, seedFrame(hat), 52) < 0.08) b = Math.max(b, 0.9) * (1 + 2 * Math.exp(-since(hat, f) / 3));
    b *= hatPulse(f, k + 900);
    const px = (3 + 6 * hash(k, 53)) * viewport;
    const c = TEMPS[Math.floor(hash(k, 54) * TEMPS.length)];
    out.push(card(L, L.faces[(k * 37) % L.faces.length], add(cam.eye, mul(d, reach)), cam.right, cam.up, (px * reach) / pxScale, scaleRGB(c, b)));
  }
  return out;
}

// ── Cosmos bar 4: the light on the arms, the spikes, and the bridge ──────
/** The bridge's step for output frame `out`: 0 before the stutter, then one more on each of its slices (from its first frame: +0, +6, +12, +15, +18, +21). */
export function bridgeStep(out: number): number {
  const slices = [STUTTER.from, STUTTER.from + 6, STUTTER.from + 12, STUTTER.from + 15, STUTTER.from + 18, STUTTER.from + 21];
  return out < STUTTER.from ? 0 : slices.filter((s) => out >= s).length;
}

/**
 * How the galaxy is drawn at content frame `f`, output frame `out`: a light
 * running out along the arms on each kick of cosmos bar 4; flattened through the
 * dolly zoom; then, step by step on the stutter: (1) spikes become capsules,
 * (2) colours snap to neon, (3) the faces become tubes, (4) the black lifts
 * and the dust goes, (5) the rim draws itself as a ring.
 */
export function galaxyStyle(f: number, out: number, viewport: number): GalaxyStyle {
  const step = bridgeStep(out);
  const kick = KICKS.filter((k) => k >= cosmos(4) && struck(k, f)).pop();
  const t = kick === undefined ? 99 : since(kick, f);
  const clap = kick !== undefined && CLAPS.includes(kick);
  const wave = { galaxy: 0, front: 1.15 * clamp(t / 20) ** 0.7, width: clap ? 0.12 : 0.08, gain: t < 24 ? (clap ? 3.6 : 2.4) * (1 - t / 24) : 0 };
  return {
    ...PHOTO_STYLE,
    maxPx: lerp(130, 1e5, smoothstep(cosmos(3, 3), cosmos(4, 1), f)) * viewport,
    wave,
    flat: 1 - flatten(f),
    neon: step >= 2 ? 1 : 0,
    tube: step >= 3 ? 1 : 0,
    em: step >= 3 ? 1.5 : 1,
  };
}

/** The background at output frame `out`: black space, lifting to the club's tinted near-black on step 4. */
export const voyageBackground = (out: number): RGB => (bridgeStep(out) >= 4 ? linear('#0C0716') : SPACE_BLACK);
/** The dust shows until step 4. */
export const dustOn = (out: number): boolean => bridgeStep(out) < 4;

const NEON_PINK = linear('#FF3D8B');

/** Spikes on our galaxy's blazing stars (cosmos bar 4), capsules from step 1, neon from step 2; on step 5 a ring of capsules draws the rim. */
export function galaxySpikes(f: number, out: number, p: GalaxyPlacement, flat: number): { spikes: Spike[]; capsule: number } {
  const g = heroGalaxy();
  const step = bridgeStep(out);
  const on = smoothstep(cosmos(3, 3), cosmos(4, 0.5), f) * p.light;
  const spikes: Spike[] = [];
  if (on <= 0) return { spikes, capsule: 0 };
  for (const k of g.bright) {
    const st = g.stars[k];
    const c = starWorld({ ...st, z: st.z * flat }, p);
    const length = GALAXY_R * (0.035 + 0.05 * hash(k, 61)) * on * (step >= 1 ? 0.45 : 1) * (1 + 0.6 * (hatPulse(f, k + 2000) - 1));
    const color = scaleRGB(step >= 2 ? neonOf(st.color) : st.color, 0.6 * on);
    for (let a = 0; a < 3; a++) spikes.push({ centre: c, length: length * (a === 1 ? 0.6 : 1), width: length * (step >= 1 ? 0.035 : 0.012), angle: (a * Math.PI) / 3 + 0.25, color });
  }
  if (step >= 5) {
    for (let i = 0; i < 72; i++) {
      const a = (TAU * i) / 72;
      const c = starWorld({ r: 1.04, a, z: 0, em: 0, color: [0, 0, 0], face: '' }, { ...p, spin: 0 });
      spikes.push({ centre: c, length: (TAU * 1.04 * GALAXY_R) / 72 * 0.42, width: GALAXY_R * 0.006, angle: a + Math.PI / 2, color: scaleRGB(NEON_PINK, 1.4) });
    }
  }
  return { spikes, capsule: step >= 1 ? 1 : 0 };
}

/** How big the galaxy still is on output frame `out`: on each slice of the stutter it snaps a fifth smaller (still big enough to read), and on the last to a point — where the guest of club bar 1 stands. */
export function bridgeShrink(out: number): number {
  return [1, 0.8, 0.64, 0.52, 0.42, 0.33, 0.05][bridgeStep(out)];
}

/** The bells of each level's arrival, four notes panned left to right: four star flares across the frame on f, f + 3, f + 6, f + 9 (screen px, y up). */
export function bellFlares(f: number): Shape[] {
  const out: Shape[] = [];
  for (const at of [LEVELS.earth, LEVELS.solar, LEVELS.galaxy]) {
    for (let i = 0; i < 4; i++) {
      if (!struck(at + 3 * i, f) || f - (at + 3 * i) > 14) continue;
      const t = since(at + 3 * i, f);
      const k = Math.exp(-t / 4);
      const x = -630 + 420 * i;
      const y = 250 - 60 * Math.sin(i * 1.3);
      const hue: RGB = i % 2 ? [1, 0.82, 0.55] : [0.72, 0.85, 1];
      out.push({ kind: 'ellipse', x, y, w: 90, h: 90, color: scaleRGB(hue, 0.5 * k), soft: 45 });
      for (const a of [0, Math.PI / 2]) out.push({ kind: 'segment', x, y, w: 240 * (0.6 + 0.4 * k), h: 3, rot: a + 0.3, color: scaleRGB(hue, 1.6 * k) });
    }
  }
  return out;
}

/**
 * A glint on each offbeat of cosmos bars 2–4 (screen px, y up): two cross-stars
 * over the subject on each open hat, a small one on each closed hat between —
 * the faces are too small to carry the hats alone. Each is gone 10 frames on.
 */
export function hatFlares(f: number): Shape[] {
  const out: Shape[] = [];
  const glint = (at: number, i: number, size: number, gain: number, tau: number): void => {
    if (!struck(at, f) || f - at >= 10) return;
    const t = since(at, f);
    const k = Math.exp(-t / tau) * (1 - t / 10);
    const s = seedFrame(at);
    const x = 1000 * hash(s, i, 81) - 500;
    const y = 700 * hash(s, i, 82) - 350;
    const hue: RGB = hash(s, i, 83) < 0.5 ? [1, 0.82, 0.55] : [0.72, 0.85, 1];
    out.push({ kind: 'ellipse', x, y, w: 0.375 * size, h: 0.375 * size, color: scaleRGB(hue, 0.4 * gain * k), soft: 0.19 * size });
    for (const a of [0, Math.PI / 2]) out.push({ kind: 'segment', x, y, w: size * (0.6 + 0.4 * k), h: 2.5, rot: a + 0.3 + 0.5 * hash(s, i, 84), color: scaleRGB(hue, gain * k) });
  };
  const from = cosmos(2);
  for (const at of OPEN_HATS) if (at >= from && at < STUTTER.from) for (const i of [0, 1]) glint(at, i, 160, 1.2, 3);
  // The closed hats between the open ones: from the first open hat, and only those gone before the stutter (which repeats its content).
  const first = OPEN_HATS.find((x) => x >= from) ?? from;
  for (const at of HATS) if (at > first && at + 10 <= STUTTER.from && (at - from) % 12 === 6) glint(at, 2, 70, 0.7, 2);
  return out;
}
