// Renderer A's second bar, pure: "CITY LIGHTS → SUNRISE · 10⁷ m" (the part 'cosmos', bar 2; build sheet notes/bcos/sheet.md §4.2,
// design notes/cosmos3/final.md §4 bar 16, prototype cosmos3/w/j4.js). Every time is a film instant (fractional through the sub-frames)
// and every position comes from the score's names.
//
// Earth (R = 1, centre O, his tile at the north pole +y) is a sphere of 24,000 double-sided face cards on a Fibonacci lattice: the front a
// host face on a pink (land), blue (ocean) or cream (cloud band) card, the back its ω twin in amber. The stadium wave flips ring k (1 … 13)
// on the 16th 2.1 + 6(k − 1), each card ragged by a 0–4 f hash; a card turns 180° about its east–west axis (L) and its twin faces out. The
// rings start as his six neighbours and widen to ≈ 18° a ring, so the wildfire outruns the flyover. Night until the sunrise: cards printed
// dim, the flipped ones lamps; on 2.3 the terminator sweeps toward the camera and every later flip glints. The camera: the crash zoom-out
// lands straight down on his tile, tilts up into a low flyover (the horizon settles at y ≈ +250), cranes up into the sunrise (Earth R
// ≈ 650 px, the Sun breaking the limb), and on 2.4& whips right with the Ctrl+V drag trail. The ring-counter is a real ring of type round
// Earth: an arch across the sky from the flyover (the camera inside its radius), swinging into a flat ellipse round the globe on the crane,
// unwrapping into `8,100,000,000 THREATS` on 2.4. Plain Node loads this file (tests): no three / remotion / react.
import { CROWDS, EARTH_HOSTS, FLINCH_FACES, HERO_FACES, MOON_FACES } from '../content/castCosmos.ts';
import { groupDigits, THREAT_WORD } from '../content/cosmos.ts';
import type { Pose } from '../engine/camera.ts';
import { hash } from '../engine/random.ts';
import { HOOK, HOOK_TOPS, LANDING, LEVELS, MONITOR, MOON_BEAM, OUTRUN, POWERS, PREDAWN, SPARK, SUNRISE, TILT_UP, UNWRAP, WAVE_RINGS, WHIP, threatsAt } from '../score/cosmos.ts';
import { COLS, formatFriends, meter } from './hud.ts';
import { type V3, Im, L, LK, LK_LEAD, clamp01, cO, lerp, norm, project, sF } from './cosmosBang.ts';

const D2R = Math.PI / 180;
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ——— The globe of cards ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Cards on the globe (the design's count; the cut-line is 12k). */
export const EARTH_N = 24000;
/** A card's side (R): the lattice's spacing, 6 % gutter. */
export const CARD_SIDE = Math.sqrt((4 * Math.PI) / EARTH_N) * 0.94;
/** Earth's focal length (1080p px; j4 EF) and vertical FOV (degrees). */
export const EARTH_FOCAL = 1560;
export const EARTH_FOV = (2 * Math.atan(540 / EARTH_FOCAL)) / D2R;
/**
 * The wave's rings: ring k (1 … 13) is every card within RING_THETA[k − 1] degrees of his tile not yet in an earlier ring. Ring 1 is his
 * six neighbours, ring 2 the pond's ripple, then the front widens to ≈ 18° a ring (≈ 3°/f, ahead of the flyover); ring 13 is the antipode.
 */
export const RING_THETA: readonly number[] = [1.9, 4.5, 9, 16, ...Array.from({ length: 9 }, (_, i) => 16 + ((180 - 16) * (i + 1)) / 9)];
/** The card-up reference: every card's up is this projected on its tangent plane (it degenerates only beyond the limb, never on screen). */
const UP_REF: V3 = norm([0.857, -0.514, 0]);

export type CardInk = 'ocean' | 'land' | 'cloud';
export type EarthCard = {
  /** Unit position (= its normal), its up and right on the tangent plane (unit). */
  readonly p: V3;
  readonly up: V3;
  readonly right: V3;
  /** Degrees from his tile; the ring it flips with; the frame its flip starts (ragged by 0–4 f). */
  readonly theta: number;
  readonly ring: number;
  readonly flip: number;
  readonly host: string;
  readonly twin: string;
  /** The face it pulls ahead of the wave (2.2 on), when its host has one. */
  readonly flinch: string | null;
  readonly ink: CardInk;
};

/** Earth's hosts: the named pairs and the crowd (cast: castCosmos.ts), by hash. */
const HOSTS: readonly { host: string; twin: string }[] = [
  ...EARTH_HOSTS.map((e) => ({ host: e.host, twin: e.infected ?? e.host })),
  ...CROWDS.earth.map((c) => ({ host: c.host, twin: c.infected })),
];
const FLINCH = new Map(FLINCH_FACES.map((x) => [x.host, x.flinch]));

/** The ring a card `theta` degrees from his tile belongs to (1 … 13). */
export function ringOf(theta: number): number {
  const k = RING_THETA.findIndex((t) => theta <= t);
  return k < 0 ? RING_THETA.length : k + 1;
}

/** One globe of `n` cards on a Fibonacci lattice (deterministic): card 0 is his tile at the north pole; `salt` varies the hashes. */
function buildGlobe(n: number, salt: number): EarthCard[] {
  const out: EarthCard[] = [];
  for (let i = 0; i < n; i++) {
    const y = i === 0 ? 1 : 1 - (2 * (i + 0.5)) / n;
    const k = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.399963229728653;
    const p: V3 = [k * Math.cos(a), y, k * Math.sin(a)];
    const proj: V3 = [UP_REF[0] - dot(UP_REF, p) * p[0], UP_REF[1] - dot(UP_REF, p) * p[1], UP_REF[2] - dot(UP_REF, p) * p[2]];
    const up = norm(proj);
    const right = norm(cross(up, p));
    const theta = Math.acos(Math.min(1, y)) / D2R;
    const ring = ringOf(theta);
    const flip = i === 0 ? SPARK : WAVE_RINGS[ring - 1] + 4 * hash(i + salt, 21);
    const lon = Math.atan2(p[2], p[0]);
    const m = Math.sin(3.1 * p[0] + 1.3) * Math.sin(2.3 * p[1] + 0.4) + 0.6 * Math.sin(4.1 * p[2] - 2.1 * p[0]);
    const cloud = Math.abs(p[1] - 0.35 * Math.sin(3 * lon) - 0.1) < 0.07;
    const h = i === 0 ? { host: HERO_FACES.face, twin: HERO_FACES.face } : HOSTS[Math.floor(hash(i + salt, 22) * HOSTS.length)];
    out.push({ p, up, right, theta, ring, flip, host: h.host, twin: h.twin, flinch: FLINCH.get(h.host) ?? null, ink: cloud ? 'cloud' : m > 0.15 ? 'land' : 'ocean' });
  }
  return out;
}

let cardCache: EarthCard[] | null = null;
/** The globe (deterministic, built once): card 0 is his tile at the north pole. */
export function earthCards(): readonly EarthCard[] {
  cardCache ??= buildGlobe(EARTH_N, 0);
  return cardCache;
}
/**
 * The coarse globe: the same Earth (lands, oceans, the cloud band, the wave's rings) in cards that still read as faces at the crane's
 * distance (≈ 60 px at the near side, R ≈ 650 px), where the 24,000 fall under 15 px and print as a moiré against the Riso screen. The
 * renderer cross-fades to it as the crane rises (an LOD: the landing and the flyover are the design's 24k).
 */
export const COARSE_N = 3000;
export const COARSE_SIDE = Math.sqrt((4 * Math.PI) / COARSE_N) * 0.94;
let coarseCache: EarthCard[] | null = null;
export function coarseCards(): readonly EarthCard[] {
  coarseCache ??= buildGlobe(COARSE_N, 7919);
  return coarseCache;
}
/** The cross-fade from the fine globe to the coarse (0 … 1) at instant `f`: over the crane's rise, 2.3 + 1 → 2.3 + 9, under its blur. */
export const coarseFade = (f: number): number => clamp01((f - SUNRISE.at - 1) / 8);
/**
 * Earth's night side pastes in on 1.4a's fill snare (Ctrl+V: the 118k copies are the sea of faces the spark sits on): until then the
 * shrinking bang hangs in the dark; on the snare's frame the cards are pasted from the frame's edges inward, whole a frame later. The
 * radius (1080p px from the frame's centre) inside which the cards are not yet pasted, at output frame `f`; 0 once pasted.
 */
export function seaPaste(f: number): number {
  const k = Math.floor(f + 0.5) - SPARK;
  return k < 0 ? 1e6 : k === 0 ? 250 : 0;
}
/** How far a card has turned at instant `f` (0 front out … 1 twin out; the launch's ≤ 3 % rebound kept): π times this is its flip angle. */
export const flipAt = (card: EarthCard, f: number): number => Math.min(1.04, L(f - card.flip));
/** Infected (its twin faces out) once it has turned past 90°. */
export const infected = (card: EarthCard, f: number): boolean => flipAt(card, f) >= 0.5;

// ——— The camera: crash zoom-out → straight down → tilt-up flyover → crane into the sunrise → whip ————————————————————————————————

/** The flyover's altitude (R above the surface) and pitch (degrees down from the local horizontal): the horizon settles at y ≈ +250. */
export const FLY = { altitude: 0.35, pitch: 51.3 } as const;
/** Straight down on his tile at the landing (tiles ≈ 130 px). */
export const LANDED_ALTITUDE = 0.25;
/** The crane's distance from O and pitch (Earth R ≈ 625 px, its centre ≈ 250 px below the frame's). */
export const CRANE = { distance: 2.6, pitch: 81 } as const;
/** The flyover's speed along the wave (degrees of arc a frame): a drift through the tilt, the cruise from the surge on 2.2. */
const FLY_DRIFT = 0.25;
const FLY_RATE = 0.9;
/**
 * 2.2's tracking surge: the cruise's speed × (1 + this) at once on the clap, decaying to the cruise over ≈ 10 f. It steps half a frame
 * before the clap, between the previous frame's sub-frames and the clap frame's, so the clap's frame is the first to move at the new
 * speed through all of its sub-frames (the frame before is untouched): the step is whole on the drum's frame.
 */
export const FLY_SURGE = 0.8;
export const SURGE_LEAD = 0.5;
/** The flyover's speed (degrees of arc a frame) at instant `g`, before the crane slows it. */
export function flySpeed(g: number): number {
  const drift = g <= TILT_UP ? 0 : FLY_DRIFT * Math.min(1, L(g - TILT_UP));
  const t = g - (OUTRUN - SURGE_LEAD);
  return t < 0 ? drift : drift + (FLY_RATE - FLY_DRIFT) + FLY_RATE * FLY_SURGE * Math.exp(-t / 4);
}

/** Degrees of arc flown from the pole by instant `f` (the flyover from the tilt, a ×1.8 velocity step on 2.2 decaying to the cruise; slowing through the crane). */
export function flown(f: number): number {
  if (f <= TILT_UP) return 0;
  const step = 0.25;
  let x = 0;
  for (let g = TILT_UP; g < f; g += step) {
    const dt = Math.min(step, f - g);
    // drifting forward through the tilt; on 2.2 the tracking surge chases the front (×1.8 at once), which still outruns us to the horizon
    const rate = flySpeed(g + dt / 2);
    const crane = g < SUNRISE.at ? 1 : lerp(1, 0.2, clamp01((g - SUNRISE.at) / 12));
    x += rate * crane * dt;
  }
  return x;
}

export type EarthCamera = { th: number; distance: number; pitch: number; pan: number; pose: Pose };

/**
 * The crash zoom-out's altitude over his tile (R) at instant `f`, 1.4& → 2.1: rising off his tile as the bang shrinks into it (an ease-in
 * from 1.4&), then from 1.4a (the spark, the night side pasted in) still accelerating, an impact landing on 2.1 (its biggest step on the
 * landing's own frame: the slam), a 2 % rebound after.
 */
export function zoomAltitude(f: number): number {
  const a0 = LANDED_ALTITUDE * Math.exp(-1.2);
  const am = 0.12;
  const pre = clamp01((f - POWERS[0]) / (SPARK - POWERS[0])) ** 2;
  return a0 + (am - a0) * pre + (LANDED_ALTITUDE - am) * Im(f - SPARK, LANDING - SPARK);
}

/** The camera at instant `f` from the crash zoom-out (1.4&) to the whip's end: arc flown, distance from O, pitch, the whip's pan (degrees). */
export function earthCamera(f: number): EarthCamera {
  let distance: number;
  let pitch: number;
  const th = flown(f);
  if (f < LANDING) {
    // The crash zoom-out: rising off his tile (the sea of cards rushes in from the edges), kicked back on the spark's fill.
    distance = 1 + zoomAltitude(f);
    pitch = 90;
  } else if (f < SUNRISE.at - LK_LEAD) {
    const tilt = Math.min(1.02, L(f - TILT_UP));
    const alt = lerp(zoomAltitude(f), FLY.altitude, Math.min(1, tilt));
    distance = 1 + alt - 0.004 * Math.max(0, Math.min(f, TILT_UP) - LANDING) * (f < TILT_UP ? 1 : 0);
    pitch = lerp(90, FLY.pitch, tilt);
  } else {
    // the crane: kicked on 2.3 (from its first sub-frame), so the Sun breaks the limb on the kick itself
    const u = Math.min(1.02, LK(f - SUNRISE.at));
    distance = lerp(1 + FLY.altitude, CRANE.distance, u) + 0.004 * Math.max(0, f - SUNRISE.settled);
    pitch = lerp(FLY.pitch, CRANE.pitch, u);
  }
  // The whip: a 2-frame anticipation (3° left), then 90° right, an impact into 3.1 (≈ 14–18°/f at the end).
  const pan = whipPan(f);
  const t = th * D2R;
  const p = pitch * D2R;
  const ph: V3 = [Math.sin(t), Math.cos(t), 0];
  const tan: V3 = [Math.cos(t), -Math.sin(t), 0];
  let fwd: V3 = [Math.cos(p) * tan[0] - Math.sin(p) * ph[0], Math.cos(p) * tan[1] - Math.sin(p) * ph[1], 0];
  const up: V3 = [ph[0] * Math.cos(p) + tan[0] * Math.sin(p), ph[1] * Math.cos(p) + tan[1] * Math.sin(p), 0];
  if (pan !== 0) {
    const a = -pan * D2R;
    const right = cross(fwd, up);
    fwd = norm([fwd[0] * Math.cos(a) - right[0] * Math.sin(a), fwd[1] * Math.cos(a) - right[1] * Math.sin(a), fwd[2] * Math.cos(a) - right[2] * Math.sin(a)]);
  }
  const eye: V3 = [ph[0] * distance, ph[1] * distance, 0];
  return { th, distance, pitch, pan, pose: { position: eye, target: [eye[0] + fwd[0], eye[1] + fwd[1], eye[2] + fwd[2]], up, fov: EARTH_FOV } };
}

/** The whip's pan (degrees, + right) at instant `f`: −3° over the 2 frames before 2.4&, then 90° right as an impact into 3.1. */
export function whipPan(f: number): number {
  if (f < WHIP.from - 2) return 0;
  if (f < WHIP.from) return -3 * sF((f - (WHIP.from - 2)) / 2);
  return -3 + 93 * Im(f - WHIP.from, WHIP.to - WHIP.from);
}

// ——— Light: night, the sunrise, the terminator, the Moon ——————————————————————————————————————————————————————————————————————

/** The Sun's disc on screen (px): a white-hot core (r ≥ 60, drawn as light: HDR) and its heart. */
export const SUN_DISC = { r: 64, heart: 30 } as const;
/** The Moon card on screen (px): its em (the design's 64), its half width and half height (a 3.2 : 1 card). */
export const MOON_CARD = { em: 64, hw: 64 * 1.6, hh: (64 * 1.6) / 3.2 } as const;
/** Where the Moon card hangs on screen (px above the frame's centre; design §4 bar 16: (0, +500)), on the camera's vertical over the Sun. */
export const MOON_ON_SCREEN = 500;
export const moonOnScreen = (): number => MOON_ON_SCREEN;
/** The Sun's centre over the limb's apex (px) once the crane lands: a little clear of it (the design's Sun breaking the limb at (0, +410)). */
const SUN_CLEAR = 0.25 * SUN_DISC.r;
let riseRate: number | null = null;
/** The rising Sun's climb after the crane settles (px a frame): it reaches the infected Moon on THREATS's slam (2.4 + a 32nd), eclipsed dead centre there. */
export function sunRiseRate(): number {
  riseRate ??= (MOON_ON_SCREEN - globeOnScreen(earthCamera(UNWRAP.slam).pose).top - SUN_CLEAR) / (UNWRAP.slam - SUNRISE.settled);
  return riseRate;
}
/**
 * How far the Sun's centre stands over the limb's apex (px) at instant `f`: under it until 2.3's first sub-frame; then cresting on the kick
 * itself (its centre 0.3 r under the limb: the light breaks with the drum, never frames later), lifting clear as the crane lands (LK), and
 * climbing on toward the Moon from the settle (the rising Sun). The crane moves the limb; the Sun keeps to it.
 */
export function sunRise(f: number): number {
  if (f < SUNRISE.at - LK_LEAD) return -3 * SUN_DISC.r;
  const u = Math.min(1, LK(f - SUNRISE.at));
  return lerp(-0.3 * SUN_DISC.r, SUN_CLEAR, u) + sunRiseRate() * Math.max(0, f - SUNRISE.settled);
}
/** The Sun on screen at instant `f` (px, y up): over the limb's apex on the camera's vertical. */
export function sunScreen(f: number): { x: number; y: number; r: number } {
  const g = globeOnScreen(earthCamera(f).pose);
  return { x: g.x, y: g.top + sunRise(f), r: SUN_DISC.r };
}
/** The unit direction from `pose`'s eye through screen point (x, y) (px, y up): where to hang the Sun far away, so Earth hides what is under the limb. */
export function rayThrough(pose: Pose, x: number, y: number): V3 {
  const f = norm([pose.target[0] - pose.position[0], pose.target[1] - pose.position[1], pose.target[2] - pose.position[2]]);
  const r = norm(cross(f, pose.up));
  const u = cross(r, f);
  const kx = x / EARTH_FOCAL;
  const ky = y / EARTH_FOCAL;
  return norm([f[0] + kx * r[0] + ky * u[0], f[1] + kx * r[1] + ky * u[1], f[2] + kx * r[2] + ky * u[2]]);
}
/** The Moon's position (world): fixed relative to the camera (sky-far) until the whip, then left where it was so the pan sweeps it away. */
export function moonPosition(f: number): V3 {
  const c = earthCamera(Math.min(f, WHIP.from - 3)).pose;
  const d = rayThrough(c, 0, MOON_ON_SCREEN);
  return [c.position[0] + MOON_DISTANCE * d[0], c.position[1] + MOON_DISTANCE * d[1], c.position[2] + MOON_DISTANCE * d[2]];
}
/**
 * The light the terminator sweeps with (the prototype's: 71.6° of arc ahead of the crane in the flight plane), so the day crosses the limb
 * first and reaches the near side by the crane's settle; the Sun's disc is drawn on the limb (sunScreen).
 */
export function lightDirection(): V3 {
  const t = (earthCamera(SUNRISE.at).th + 71.6) * D2R;
  return [Math.sin(t), Math.cos(t), 0];
}
/** The terminator at instant `f`: a card is in day when its normal · the Sun's direction exceeds this (2: all night … −0.7: day), sweeping from 2.3's first sub-frame. */
export const terminator = (f: number): number => (f < SUNRISE.at - LK_LEAD ? 2 : lerp(1.05, -0.7, cO((f - SUNRISE.at + LK_LEAD) / 12)));
/** Day: how far the sunrise has come (0 night … 1), kicked on 2.3. */
export const dawn = (f: number): number => Math.min(1, LK(f - SUNRISE.at));
/** The limb's atmosphere (0–1): asleep at night, waking from the pre-dawn, full in the day. */
export const atmosphere = (f: number): number => (f < PREDAWN ? 0.35 : f < SUNRISE.at - LK_LEAD ? lerp(0.35, 0.7, (f - PREDAWN) / (SUNRISE.at - PREDAWN)) : 0.9);
/** The Moon: far above the rising Sun (the 2001 alignment), its face before and after the beam (it flips with a glint on 2.3& + 3). */
export const MOON_DISTANCE = 30;
/** How eclipsed the Sun is by the Moon card at instant `f` (0 none … 1 the card's band across the disc's centre), from the crane to the whip. */
export function eclipseAt(f: number): number {
  if (f < SUNRISE.at || f >= WHIP.from) return 0;
  const sun = sunScreen(f);
  const moon = project(earthCamera(f).pose, moonPosition(f), EARTH_FOCAL);
  if (!moon) return 0;
  return clamp01(1 - Math.abs(sun.y - moon.y) / (SUN_DISC.r + MOON_CARD.hh));
}
export function moonFace(f: number): string {
  return Math.floor(f + 0.5) >= MOON_BEAM + 3 ? (MOON_FACES.infected ?? MOON_FACES.host) : MOON_FACES.host;
}
/** The beam: from the limb straight up through the Sun to the Moon in 6 f (0–1 reach) and its fade over the next 6. */
export function beamAt(f: number): { reach: number; alpha: number } | null {
  if (f < MOON_BEAM || f >= MOON_BEAM + 12) return null;
  return { reach: clamp01((f - MOON_BEAM) / 6), alpha: 1 - clamp01((f - MOON_BEAM - 6) / 6) };
}

// ——— The hook, the crest, the light grammar on Earth ———————————————————————————————————————————————————————————————————————————

/** His tile bobs +6 px on the hook's note starts (as a fraction: 0 … 1 over the note's first 4 f). */
export function hookBob(f: number): number {
  for (const n of HOOK) {
    const t = f - n.at;
    if (t >= 0 && t < 4) return Math.sin((Math.PI * t) / 4);
  }
  return 0;
}
/** The crest's newest lamps flash (>ω<) for 6 f on the bar's top note (2.2&): the flip window of the lamps that wear it. */
export function topFlash(f: number): { from: number; to: number } | null {
  const top = HOOK_TOPS.find((t) => f >= t && f < t + 6 && t >= LEVELS.earth && t < LEVELS.solar);
  return top === undefined ? null : { from: top - 6, to: top };
}
/** Ahead of the front, faces flinch from 2.2 until the front reaches them: the band of degrees past the front that flinches (0 before 2.2). */
export const flinchBand = (f: number): number => (f < OUTRUN ? 0 : 14);
/** The wave front's angle from his tile (degrees) at instant `f`: the outer edge of the newest ring to start flipping. */
export function frontAt(f: number): number {
  let k = 0;
  for (let i = 0; i < WAVE_RINGS.length; i++) if (f >= WAVE_RINGS[i]) k = i + 1;
  return k === 0 ? 0 : RING_THETA[k - 1];
}
/**
 * The visible front (degrees from his tile) at instant `f`: the inner edge of the newest ring, the last whole ring of lamps; the faces
 * ahead of it flinch (those of the newest ring still waiting for their flip among them), and 2.2's shock ring leaves from it.
 */
export function litFront(f: number): number {
  let k = 0;
  for (let i = 0; i < WAVE_RINGS.length; i++) if (f >= WAVE_RINGS[i]) k = i + 1;
  return k <= 1 ? 0 : RING_THETA[k - 2];
}

// ——— The ring-counter: the count on a real ring of type round Earth ———————————————————————————————————————————————————————————

/** The ring's radius (R) and, for the flyover, how far its plane leans back from the flight's local up (the cosine: an arch over the frame). */
export const RING = { radius: 1.45, flyLean: 0.98 } as const;
/**
 * The flyover's ring plane at instant `f`: leaning back from the flight's local up and turned with the flight, so from the flyover the
 * ring is an arch across the sky band, its crown under the Moon card and its legs falling to the horizon at the frame's edges, keeping its
 * place in the sky while the ground streams under it (the design's "like a planet's ring seen from its surface").
 */
export function flyNormal(f: number): V3 {
  const t = flown(f) * D2R;
  const k = RING.flyLean;
  const m = Math.sqrt(1 - k * k);
  return norm([k * Math.sin(t) - m * Math.cos(t), k * Math.cos(t) + m * Math.sin(t), 0]);
}
/** The crane's ring plane: tilted so the settled crane sits 4° above it (a flat ellipse round the globe, its front across the lower globe, its back behind the limb). */
let craneCache: V3 | null = null;
export function craneNormal(): V3 {
  if (craneCache) return craneCache;
  const t = (earthCamera(SUNRISE.settled).th + 86) * D2R;
  craneCache = [Math.sin(t), Math.cos(t), 0];
  return craneCache;
}
/** Characters round the ring: 8 blocks of 24 slots, each block the count (right-aligned in 13) and ` THREATS · `. */
export const RING_BLOCK = 24;
export const RING_SLOTS = 8 * RING_BLOCK;
/** The ring shows from the tilt-up to the whip. */
export const ringShown = (f: number): boolean => f >= TILT_UP && f < WHIP.from;
/** The ring's plane normal at instant `f`: swinging from the arch to the ellipse with the crane (L). */
export function ringNormal(f: number): V3 {
  const u = f < SUNRISE.at ? 0 : Math.min(1, L(f - SUNRISE.at));
  const a = flyNormal(f);
  const b = craneNormal();
  return norm([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]);
}
/** The ring's turn (radians) at instant `f`: slowly, the text marching round. */
export const ringTurn = (f: number): number => -(f - TILT_UP) * 0.004;
/** The count's text (13 slots, right-aligned) at output frame `f`: rolling log-linearly 118,000 → 8,100,000,000 over the bar. */
export function ringCount(f: number): string {
  return groupDigits(threatsAt(Math.floor(f + 0.5))).padStart(13, ' ');
}
/** Slot `s`'s character at output frame `f` and whether it is the count's (amber) or the word's (red). */
export function ringChar(s: number, f: number): { ch: string; count: boolean } {
  const k = ((s % RING_BLOCK) + RING_BLOCK) % RING_BLOCK;
  if (k < 13) return { ch: ringCount(f)[k], count: true };
  const word = ` ${THREAT_WORD.many} · `;
  return { ch: word[k - 13] ?? ' ', count: false };
}
/** Slot `s`'s centre on the ring and the ring's tangent there (unit), at instant `f`. */
export function ringSlot(s: number, f: number): { centre: V3; tangent: V3; normal: V3 } {
  const n = ringNormal(f);
  const h: V3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const a = norm(cross(h, n));
  const b = cross(n, a);
  const t = (s / RING_SLOTS) * 2 * Math.PI + ringTurn(f);
  const c = Math.cos(t);
  const si = Math.sin(t);
  const centre: V3 = [RING.radius * (c * a[0] + si * b[0]), RING.radius * (c * a[1] + si * b[1]), RING.radius * (c * a[2] + si * b[2])];
  const tangent: V3 = [-si * a[0] + c * b[0], -si * a[1] + c * b[1], -si * a[2] + c * b[2]];
  return { centre, tangent, normal: n };
}
/** The type's size on the ring (R, one em): the slots' arc over the count's advance. */
export const RING_EM = ((2 * Math.PI * RING.radius) / RING_SLOTS) / 0.62;

// ——— 2.4: the unwrap, THREATS, the whip's drag trail ————————————————————————————————————————————————————————————————————————————

/** The locked row: `8,100,000,000` across the lower third (centre y, digit size px) and `THREATS` under it (y, size). */
export const UNWRAP_ROW = { y: -292, size: 190, word: { y: -472, size: 120 } } as const;
/** How far the ring's characters have slid off into the row (L over 8 f from 2.4); 0 before. */
export const unwrapped = (f: number): number => (f < UNWRAP.at ? 0 : Math.min(1, L(f - UNWRAP.at)));
/** THREATS slams after it (an impact landing on 2.4 + a 32nd: 1.3× → 1 over 2 f), or null before. */
export const threatsSlam = (f: number): number | null => (f < UNWRAP.slam - 2 ? null : 1 + 0.3 * (1 - Math.min(1, Im(f - (UNWRAP.slam - 2), 2))));
/** The row reads 2.4 → 2.4&, then smears out to the left with the whip (0 … 1 over 4 f). */
export const rowExit = (f: number): number => (f < WHIP.from ? 0 : clamp01((f - WHIP.from) / 4));

/**
 * The drag trail's slots on Earth's orbit (screen px, y up) where renderer B's cs 3.1 starts the six stamps (prototype cosmos3/w/j4.js
 * initStamps with B's landing camera). B owns the orbit: when B exports stampSlots() this list must equal it (sheet §6.3).
 */
export const A_STAMP_SLOTS: readonly (readonly [number, number])[] = [
  [-214.9, 222.5],
  [-265.8, 228.8],
  [-318.3, 231.9],
  [-372.1, 231.8],
  [-427.1, 228.6],
  [-483.1, 222.2],
];
/** The stamps' slot radius (px) at 3.1. */
export const SLOT_RADIUS = 60;
/** Where the six stamps are laid (screen px centre, radius), from the globe as it stands at 2.4& (`globe`) to the slots, accelerating and shrinking. */
export function stampLayout(globe: { x: number; y: number; r: number }, slots: readonly (readonly [number, number])[] = A_STAMP_SLOTS): { x: number; y: number; r: number }[] {
  return slots.map(([sx, sy], k) => {
    const w = ((k + 1) / 6) ** 2;
    return { x: lerp(globe.x, sx, w), y: lerp(globe.y, sy, w), r: lerp(globe.r, SLOT_RADIUS, w) };
  });
}
/** The stamp frames: one every 2 f from 2.4& (the six dry chks). */
export const STAMP_AT: readonly number[] = Array.from({ length: 6 }, (_, k) => WHIP.from + 2 * k);
/** The live globe along the trail at instant `f`: on stamp k's spot at its frame, gliding between (it leaves each stamp where it was). */
export function trailGlobe(f: number, layout: readonly { x: number; y: number; r: number }[], globe: { x: number; y: number; r: number }): { x: number; y: number; r: number } {
  const k = (f - WHIP.from) / 2;
  const mix = (a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }, t: number) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), r: lerp(a.r, b.r, t) });
  if (k <= -1) return globe;
  if (k < 0) return mix(globe, layout[0], k + 1);
  if (k >= layout.length - 1) return layout[layout.length - 1];
  const i = Math.floor(k);
  return mix(layout[i], layout[i + 1], k - i);
}
/**
 * Earth's disc on screen from `pose` (1080p px, y up), along the frame's vertical through its centre: the silhouette's top (the horizon,
 * or the limb's apex) and bottom (clamped below the frame), the disc's middle and half-height (its radius), and its centre's x.
 */
export function globeOnScreen(pose: Pose): { x: number; y: number; r: number; top: number; bottom: number } {
  const e = pose.position;
  const d = Math.hypot(e[0], e[1], e[2]);
  const f = norm([pose.target[0] - e[0], pose.target[1] - e[1], pose.target[2] - e[2]]);
  const r = norm(cross(f, pose.up));
  const u = cross(r, f);
  const o: V3 = [-e[0] / d, -e[1] / d, -e[2] / d];
  const z = dot(o, f);
  const x = z > 1e-3 ? (dot(o, r) * EARTH_FOCAL) / z : 0;
  // the centre's angle below the view axis (in the vertical plane) and the disc's angular radius
  const below = Math.atan2(-dot(o, u), dot(o, f));
  const alpha = Math.asin(Math.min(0.999, 1 / d));
  const ang = (a: number) => Math.max(-1.55, Math.min(1.55, a));
  const top = -EARTH_FOCAL * Math.tan(ang(below - alpha));
  const bottom = -EARTH_FOCAL * Math.tan(ang(below + alpha));
  return { x, y: (top + bottom) / 2, r: (top - bottom) / 2, top, bottom };
}

// ——— The party monitor (the approved box of src/shots/hud.ts, its own window: cosmos 2.1e → 2.3e) ——————————————————————————————

/** The monitor's rows at output frame `f` (its window MONITOR[0]): friends = the threat count, memory and cpu climbing. */
export function monitorRows(f: number): { friends: string; memory: number; cpu: number; typed: number; shown: number } | null {
  const w = MONITOR[0];
  if (f < w.from || f >= w.to) return null;
  const u = (f - w.from) / (w.to - w.from);
  return {
    friends: formatFriends(threatsAt(f)),
    memory: Math.round(lerp(71, 78, u)),
    cpu: Math.round(lerp(88, 92, u)),
    typed: clamp01((f - w.from) / 8),
    shown: f >= w.to - 4 ? 1 - cO((f - (w.to - 4)) / 4) : 1,
  };
}
/** The monitor's box rows as text (hud.ts's frame, glyph for glyph). */
export function monitorText(m: { friends: string; memory: number; cpu: number }): string[] {
  const title = ' kaomoji.exe :: party monitor ';
  const pct = (n: number) => `${String(n).padStart(3)}%`;
  const side = (s: string) => `║ ${s.padEnd(COLS - 4)} ║`;
  return [
    `╔═${title}${'═'.repeat(COLS - 3 - title.length)}╗`,
    side(`friends  ${m.friends}`),
    side(`memory   ${meter(m.memory)} ${pct(m.memory)}`),
    side(`cpu      ${meter(m.cpu)} ${pct(m.cpu)}`),
    `╚${'═'.repeat(COLS - 2)}╝`,
  ];
}
