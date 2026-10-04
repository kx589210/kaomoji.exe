// Renderer B, bar 3 of the cosmos (cosmos 3.1 → 4.1: "SLINGSHOT SPIROGRAPH · 10¹³ m"; build sheet notes/bcos/sheet.md §4.3 and §6.3,
// design notes/cosmos3/final.md §4 bar 17, prototype cosmos3/w/j4.js from "bar 17"), the pure half: the world (eight rings of
// kinetic type round the Sun, each a band of three rows of upright type: the planet's name alternating with its face, flanked by two rows
// of micro-type), the camera (the design's: landed low on Earth's ring looking at the Sun, the dive at the Sun, the 180° slingshot round
// it, the slow-mo exit up and out on the far side, the victory lap, the fling back to one star), the overtype cursors and what they
// infect, the Sun that turns over into him and its coronal mass ejection, the drag trail's six stamps landing on Earth's ring (E11), and
// the spirograph: one continuous trail per glyph cluster (24 a ring) drawn through the PAST camera (`spiroTrails`).
//
// World units are the design's (Earth's ring r 1.75; the Sun at the origin; the ecliptic is y = 0) in three.js's convention (y up, the
// camera looks down its −z); a ring point at angle a is (r cos a, 0, −r sin a), the prototype's world mirrored in z. Screen positions are
// 1080p px from the frame centre, y up (the flat world's units). Every time is a film instant (fractional during the sub-frames), always
// from the score's names, never a film frame. Plain Node loads this file (tests): no three / remotion / react.
import { HERO_FACES, PLANETS, REAM_FACES, SUN_FACE } from '../content/castCosmos.ts';
import { HOOK, HOOK_TOPS, KICKS, LAP, CURSORS, DIVE, FLING, LEVELS, ORBIT_LAND, RATCHETS, SLINGSHOT, SLOWMO, WHIP, cs } from '../score/cosmos.ts';
import { SWAP_LEAD } from '../engine/temporal.ts';
import { hash } from '../engine/random.ts';
import { Im, L, cO, clamp01, env, lastOf, lerp, sF } from './cosmosSolarKit.ts';
import { earthCamera, globeOnScreen, stampLayout } from './cosmosEarth.ts';
import { type Cam, EARTH_RING, LAND, STAMP_ANGLES, type V3, lookAlong, orbitCam, project } from './cosmosSolarStamps.ts';

// The camera primitives and the A → B contract live in the leaf src/shots/cosmosSolarStamps.ts (renderer A imports it without a cycle).
export { type Cam, EARTH_RING, FOCAL, FOV_Y, LAND, STAMP_ANGLES, type V3, landingCamera, lookAlong, orbitCam, project, stampSlots } from './cosmosSolarStamps.ts';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ——— The clock of the rings (the slow-mo exit runs it at 0.25×) ——————————————————————————————————————————————————————————————

const T0 = LEVELS.solar;
/** The slow-mo: 1 → 0.25 over SLOWMO.from + 0…4, held to + 8, back to 1 by SLOWMO.to (= the lap). */
const RAMP = [SLOWMO.from, SLOWMO.from + 4, SLOWMO.from + 8, SLOWMO.to] as const;
/** The rings' clock: frames of spin since cosmos 3.1 (the integral of the slow-mo's rate; negative before 3.1, where it runs at 1×). */
export function solarClock(f: number): number {
  const [a, b, c, d] = RAMP;
  const seg = (x: number, x0: number, x1: number, r0: number, r1: number): number => {
    const u = Math.min(Math.max(x, x0), x1) - x0;
    return r0 * u + ((r1 - r0) * u * u) / (2 * (x1 - x0));
  };
  if (f <= a) return f - T0;
  return a - T0 + seg(f, a, b, 1, 0.25) + seg(f, b, c, 0.25, 0.25) + seg(f, c, d, 0.25, 1) + Math.max(0, f - d);
}

// ——— The camera's move ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** The dive at the Sun: an impact from 3.2 into 3.3 (0 → 1, a 2 % rebound over the next 6 f). */
export const diveAt = (f: number): number => (f < DIVE.from ? 0 : Im(f - DIVE.from, DIVE.to - DIVE.from));
/** The slingshot's 180° whip round the Sun: eased over SLINGSHOT − 5 … + 6, peaking ≈ 26°/f on the kick. */
export const slingAt = (f: number): number => sF((f - (SLINGSHOT - 5)) / 11);
/**
 * The victory lap's 35° whip: a hit launch on the 3.4 kick (full speed from ¾ of a frame before it, 75 % in 3 f, no rebound), so its
 * biggest step lands on the ding's own frame.
 */
export const lapAt = (f: number): number => (f < LAP.at - 0.75 ? 0 : 1 - Math.exp(-0.462 * (f - LAP.at + 0.75)));
/**
 * The exit: the slingshot's follow-through. The whip's momentum carries the camera up and out on the far side from the moment the swing
 * ends (SLINGSHOT + 6, a 16th after the kick), decelerating (cubic out) over 10 f into the slow-mo's hold, so it is nearly still when the
 * lap's whip launches on the kick.
 */
export const EXIT = { from: SLINGSHOT + 6, frames: 10 } as const;
const exitAt = (f: number): number => cO((f - EXIT.from) / EXIT.frames);
/** The whip into 3.1 (A's, 90° right, an impact into the downbeat) as this world's past, and its 2 % rebound (settled by 3.1 + 6). */
export function whipYaw(f: number): number {
  const t = f - ORBIT_LAND.at;
  if (t >= 6) return 0;
  if (t > 0) return -90 * 0.02 * Math.sin(Math.PI * (t / 6)) * D2R;
  return 90 * (1 - Im(t + 12, 12)) * D2R;
}
/** The landing's living hold: the camera drifts along Earth's ring (0.08° of azimuth a frame) from 3.1 until the dive launches. */
export const drift = (f: number): number => 0.08 * D2R * Math.min(Math.max(f - ORBIT_LAND.at, 0), DIVE.from - ORBIT_LAND.at);
/** The camera's azimuth round the Sun (radians): the landing's, its drift, +5° with the dive, +180° the slingshot, +35° the lap. */
export const azimuth = (f: number): number => LAND.psi + drift(f) + (5 * diveAt(f) + 180 * slingAt(f) + 35 * lapAt(f)) * D2R;

/** The fling (3.4& → 4.1): 0 → 1, 75 % in 3 f, decelerating to a stop on 4.1 − 1. */
export function flingAt(f: number): number {
  const t = f - FLING.from;
  if (t <= 0) return 0;
  const k = 0.462;
  return Math.min(1, (1 - Math.exp(-k * t)) / (1 - Math.exp(-k * (FLING.to - 1 - FLING.from))));
}
/** How far the fling throws the camera back: ×10² (the solar system shrinks to one star ≈ 50 px across). */
export const FLING_ZOOM = 100;

/** The dive's target and the slingshot's radius and height; the exit's (looking down 30° at the Sun from the far side). */
export const ORBIT = { dive: { r: 1.15, h: 0.2 }, exit: { r: 1.1, h: 0.64 } } as const;

/**
 * The camera at instant `f` (the design's, final.md §4 bar 17): landed on Earth's ring 0.35 over the ecliptic, looking at the Sun turned to
 * the left third (LAND, FOV 70°), drifting along the ring; the dive (3.2 → 3.3, an impact) closes to r 1.15 just over the plane and turns
 * onto the Sun; the slingshot swings 180° round it (the Sun on the centre); the exit rises up on the far side (r 1.1, height 0.64:
 * looking down 30° at the Sun); the lap swings 35° more; the fling throws it straight back along its view axis (the system shrinks into
 * the screen centre). Before 3.1 it carries A's whip (for the trails' past).
 */
export function solarCamera(f: number): Cam {
  const dv = diveAt(f);
  const late = f >= EXIT.from;
  const ex = late ? exitAt(f) : 0;
  const r = late ? lerp(ORBIT.dive.r, ORBIT.exit.r, ex) : lerp(LAND.r, ORBIT.dive.r, dv);
  const h = late ? lerp(ORBIT.dive.h, ORBIT.exit.h, ex) : lerp(LAND.h, ORBIT.dive.h, dv);
  const yaw = f < DIVE.from ? LAND.yaw : lerp(LAND.yaw, 0, clamp01(dv * 1.4));
  let cam = orbitCam(azimuth(f), r, h, yaw);
  let eye = cam.eye;
  let fwd = cam.fwd;
  // A's whip as this camera's past (and its rebound): a yaw about the vertical (positive turns left).
  const w = whipYaw(f);
  if (w !== 0) fwd = [fwd[0] * Math.cos(w) + fwd[2] * Math.sin(w), fwd[1], -fwd[0] * Math.sin(w) + fwd[2] * Math.cos(w)];
  // The fling: straight back along the view axis, so everything converges on the screen centre.
  const fl = flingAt(f);
  if (fl > 0) {
    const back = (FLING_ZOOM ** fl - 1) * Math.max(0.5, -dot(eye, fwd));
    eye = [eye[0] - fwd[0] * back, eye[1] - fwd[1] * back, eye[2] - fwd[2] * back];
  }
  cam = lookAlong(eye, fwd);
  const roll = bankAt(f);
  if (roll === 0) return cam;
  // The bank into the slingshot (and the lap): the picture turns about the view axis, so the trails curl into loops.
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  const right: V3 = [cam.right[0] * c + cam.up[0] * s, cam.right[1] * c + cam.up[1] * s, cam.right[2] * c + cam.up[2] * s];
  const up: V3 = [cam.up[0] * c - cam.right[0] * s, cam.up[1] * c - cam.right[1] * s, cam.up[2] * c - cam.right[2] * s];
  return { ...cam, right, up };
}
/** The bank (radians, the picture turning clockwise): 24° into the slingshot and out again, 10° into the lap's whip. */
export const BANK = { sling: 24 * D2R, lap: 10 * D2R } as const;
export function bankAt(f: number): number {
  const sling = Math.sin(Math.PI * slingAt(f)) ** 2 * BANK.sling;
  const lap = f < LAP.at ? 0 : Math.sin(Math.PI * Math.min(1, (f - LAP.at) / 14)) ** 2 * BANK.lap;
  return sling + lap;
}

// ——— The rings of kinetic type ————————————————————————————————————————————————————————————————————————————————————————————————

/** Host inks per ring (prototype RINK; hosts are pink, cyan or cream — never amber, which is his; Earth's ring is his already). */
export type Ink = 'amber' | 'pink' | 'cyan' | 'cream' | 'ice' | 'rose';
export const RING_INKS: readonly Ink[] = ['ice', 'pink', 'amber', 'cyan', 'rose', 'cream', 'cyan', 'pink'];

export type Ring = {
  /** Index 0 (Mercury) … 7 (Neptune). */
  readonly i: number;
  readonly name: string;
  readonly host: string;
  readonly infected: string;
  /** Radius (Earth 1.75). */
  readonly r: number;
  /** Main-row cards (even: name, face, name, face …). */
  readonly n: number;
  readonly ink: Ink;
  /** When its overtype cursor starts (Earth's ring is his from the start: −Infinity). */
  readonly cursor: number;
  /** Its phase (radians): where card 0 stands on 3.1 (Earth's ring is turned so that Earth stands at EARTH_RING.at). */
  readonly phase: number;
};
/** Main-row cards per ring: the names and faces nearly touch at cap ≈ 0.11 (the design's 0.12). */
const MAIN_COUNT = [6, 12, 22, 22, 30, 40, 44, 44];
const ringCursor = (name: string): number => {
  if (name === 'EARTH') return -Infinity;
  const row = CURSORS.find((c) => c.rings.includes(name.toLowerCase()));
  if (!row) throw new Error(`no cursor for ${name}`);
  return row.at;
};
export const EARTH = 2;
export const NEPTUNE = 7;
export const RINGS: readonly Ring[] = PLANETS.map((p, i) => ({
  i,
  name: p.name,
  host: p.host,
  infected: p.infected,
  r: p.r,
  n: MAIN_COUNT[i],
  ink: RING_INKS[i],
  cursor: ringCursor(p.name),
  // Earth (card 1 of its ring, the first globe) stands at EARTH_RING.at on 3.1; every other ring keeps its own phase.
  phase: i === EARTH ? EARTH_RING.at - TAU / MAIN_COUNT[i] : i * 0.7,
}));
/** The asteroid belt (halftone dots between Mars and Jupiter). */
export const BELT = { r0: 2.7, r1: 2.9, count: 700 } as const;

/** A card: ring, row (0 main, 1 micro-type under it, 2 micro-type over it), index j of n on its row, what it shows, its em (world units). */
export type CardKind = 'word' | 'face' | 'earth' | 'micro';
export type SolarCard = { readonly ring: number; readonly row: 0 | 1 | 2; readonly j: number; readonly n: number; readonly kind: CardKind; readonly r: number; readonly em: number };
/** Main-row em of a name (Inter Tight Black: cap ≈ 0.11) and of a face (M PLUS Rounded); Earth's own globe (him) is the bar's subject. */
export const EM = { word: 0.15, face: 0.13, earth: 0.16, micro: 0.042, hero: 0.4 } as const;
/**
 * The micro-type rows run along the same ring as the main row, one under its baseline and one over its caps (a band of three lines of
 * type, like a ticker's); their names repeat this far apart per character.
 */
export const MICRO = { under: -0.045, over: 0.175, perChar: 0.036, gap: 0.05 } as const;
export const SOLAR_CARDS: readonly SolarCard[] = RINGS.flatMap((ring) => {
  const main = Array.from({ length: ring.n }, (_, j): SolarCard => ({ ring: ring.i, row: 0, j, n: ring.n, kind: j % 2 === 0 ? 'word' : ring.i === EARTH ? 'earth' : 'face', r: ring.r, em: j % 2 === 0 ? EM.word : ring.i === EARTH ? EM.earth : EM.face }));
  const micro = ([1, 2] as const).flatMap((row) => {
    const r = ring.r;
    const n = Math.max(6, Math.round((TAU * r) / (ring.name.length * MICRO.perChar + MICRO.gap)));
    return Array.from({ length: n }, (_, j): SolarCard => ({ ring: ring.i, row, j, n, kind: 'micro', r, em: EM.micro }));
  });
  return [...main, ...micro];
});

/** Kepler: each ring turns ∝ r^−1.5 (Earth 0.42° a frame of the rings' clock). */
export const spinRate = (r: number): number => 0.42 * D2R * (1.75 / r) ** 1.5;
/** The ratchet on 3.1&, 3.2&, 3.3&: every ring jumps one main-row tile in ≈ 4 f, neighbours counter-turning (a combination lock). */
export function ratchet(ring: number, f: number): number {
  const step = TAU / RINGS[ring].n;
  const dir = ring % 2 ? -1 : 1;
  return RATCHETS.reduce((s, h) => s + Math.min(1, L(f - h)) * dir * step, 0);
}
/** Ring `ring`'s turn at instant `f` (its spin and ratchet, from its phase). */
export const ringTurn = (ring: number, f: number): number => spinRate(RINGS[ring].r) * solarClock(f) + ratchet(ring, f) + RINGS[ring].phase;
/** Card `c`'s angle round the Sun at instant `f` (its ring's spin, ratchet and phase). */
export const cardAngle = (c: SolarCard, f: number): number => (c.j * TAU) / c.n + ringTurn(c.ring, f);
/** Card `c`'s place at instant `f` (the main row on the ecliptic; the micro rows under and over it). */
export function cardPos(c: SolarCard, f: number): V3 {
  const a = cardAngle(c, f);
  const y = c.row === 0 ? 0 : c.row === 1 ? MICRO.under : MICRO.over;
  return [c.r * Math.cos(a), y, -c.r * Math.sin(a)];
}
/**
 * The way card `c`'s type runs at instant `f`, seen from `eye`: along its ring (the tangent of increasing angle), flipped where the lens
 * sees the card's back, so the rings read as curved banners of type in perspective (a fence of upright letters along each orbit).
 */
export function cardRun(c: SolarCard, f: number, eye: V3): V3 {
  const a = cardAngle(c, f);
  const out: V3 = [Math.cos(a), 0, -Math.sin(a)];
  const p: V3 = [c.r * out[0], 0, c.r * out[2]];
  const facing = (eye[0] - p[0]) * out[0] + (eye[2] - p[2]) * out[2];
  const s = facing >= 0 ? 1 : -1;
  return [-Math.sin(a) * s, 0, -Math.cos(a) * s];
}

// ——— The overtype cursors ——————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * Ring `ring`'s cursor angle (from its card 0, radians) at instant `f`: −1 before it starts; then 1/8 turn a 16th, each step a launch,
 * so a ring takes 48 f (score CURSORS: …to); 2π when done. Earth's ring is his already (2π).
 */
export function cursorAngle(ring: number, f: number): number {
  const s = RINGS[ring].cursor;
  if (s === -Infinity) return TAU;
  const t = f - s;
  if (t < 0) return -1;
  if (t >= 48) return TAU;
  return (Math.floor(t / 6) + Math.min(1, L((t % 6) + 1))) * (Math.PI / 4);
}
/** The output frame on which the point `a` radians round ring `ring` from its card 0 is overtyped (its cursor has passed it). */
function overtypedAngle(ring: number, a: number): number {
  const s = RINGS[ring].cursor;
  if (s === -Infinity) return -Infinity;
  let at = s;
  while (at < s + 48 && cursorAngle(ring, at) <= a) at++;
  return at;
}
const OVERTYPED = new Map<SolarCard, number>();
/**
 * The output frame on which card `c` is overtyped (the first frame its cursor has passed it: the rewrite lands whole on a frame, with its
 * Ctrl+V ghost, pop and spark from there); −Infinity on Earth's ring (his from the start).
 */
export function overtypedAt(c: SolarCard): number {
  let at = OVERTYPED.get(c);
  if (at === undefined) {
    at = overtypedAngle(c.ring, (c.j * TAU) / c.n);
    OVERTYPED.set(c, at);
  }
  return at;
}
/** Is card `c` amber (his) at instant `f` (by its output frame)? Its cursor has passed it, or the lap has turned every orbit amber. */
export const infectedAt = (c: SolarCard, f: number): boolean => Math.floor(f + 0.5) >= Math.min(LAP.at, overtypedAt(c));
/** What card `c` shows at instant `f`: the ring's name (Neptune's cursor rewrites only its word, in amber), its host or its ω twin. */
export function cardText(c: SolarCard, f: number): string {
  const ring = RINGS[c.ring];
  if (c.kind === 'word' || c.kind === 'micro') return ring.name;
  if (c.kind === 'earth') return HERO_FACES.face;
  return infectedAt(c, f) ? ring.infected : ring.host;
}

// ——— Earth's ring builds itself out of the drag trail (E11) ————————————————————————————————————————————————————————————————————

/** Earth (main row, card 1 of its ring: the first globe) — the card that carries him on this bar. */
export const EARTH_CARD = SOLAR_CARDS.find((c) => c.ring === EARTH && c.row === 0 && c.kind === 'earth')!;
/** Slot `k`'s point on Earth's ring at instant `f` (it rides the ring, behind Earth; on 3.1 it is the leaf's landingSlot). */
export function slotPoint(k: number, f: number): V3 {
  const a = cardAngle(EARTH_CARD, f) + STAMP_ANGLES[k];
  return [RINGS[EARTH].r * Math.cos(a), 0, -RINGS[EARTH].r * Math.sin(a)];
}
/** A stamp on screen: centre (1080p px, y up), the globe's radius (px) and how opaque it is. */
export type Stamp = { x: number; y: number; r: number; alpha: number };
let TRAIL_STAMPS: { x: number; y: number; r: number }[] | null = null;
/**
 * Where A's drag trail leaves the six stamps as cosmos 3.1 begins (A's own pure layout, src/shots/cosmosEarth.ts `stampLayout` of its
 * globe at the whip's start, onto A's slots): screen px, y up, the globe's radius. B picks each stamp up exactly there (E11).
 */
export function trailStamps(): readonly { x: number; y: number; r: number }[] {
  TRAIL_STAMPS ??= stampLayout(globeOnScreen(earthCamera(WHIP.from).pose)).map((c) => ({ x: c.x, y: c.y, r: c.r }));
  return TRAIL_STAMPS;
}
/** The stamps' first 16th: on 3.1 each shrinks from A's size to min(90, 0.6 r) px (a launch: most of it on 3.1 + 1), then glides. */
export const STAMP_SHRINK = { max: 90, share: 0.6 } as const;
/**
 * Stamp `k` (0 … 5) on output frame `frame` of E11, the morph cut (ORBIT_LAND.at → .settled; the prototype's 1536 → 1542, j4 solar()):
 * picked up exactly where A's trail left it (`trailStamps`), shrunk at once to min(90, 0.6 r) px, then glided (cubic out) onto its slot
 * riding Earth's ring, shrinking on to a ring tile and fading (alpha 1 − u) as the tile pastes over it; null outside the landing. Keyed to
 * whole output frames: the stamps are drawn once per output frame, outside the sub-frame sum (the six crisp stamps, sheet §14).
 */
export function stampAt(k: number, frame: number): Stamp | null {
  const out = Math.round(frame);
  if (out < ORBIT_LAND.at || out >= ORBIT_LAND.settled) return null;
  const from = trailStamps()[k];
  const q = project(solarCamera(out), slotPoint(k, out));
  const u = (out - ORBIT_LAND.at) / (ORBIT_LAND.settled - ORBIT_LAND.at);
  const e = cO(u);
  const tile = q ? EM.earth * q.k * 0.5 : 18;
  const shrunk = Math.min(STAMP_SHRINK.max, STAMP_SHRINK.share * from.r);
  return { x: lerp(from.x, q ? q.x : from.x, e), y: lerp(from.y, q ? q.y : from.y, e), r: lerp(shrunk, tile, e), alpha: 1 - u };
}
/**
 * Earth's ring pastes itself: the six stamps on 3.1, then copies spreading both ways from Earth, 16 a 16th (counting both rows of micro-
 * type as the design's ring of copies), whole by 3.2. When card `c` of Earth's ring appears (−Infinity for the other rings).
 */
export function pastedAt(c: SolarCard): number {
  if (c.ring !== EARTH) return -Infinity;
  const a = (cardAngle(c, ORBIT_LAND.at) - cardAngle(EARTH_CARD, ORBIT_LAND.at) + 7 * Math.PI) % TAU - Math.PI;
  // Distance from Earth along the ring, as a share of half the ring: the near ones first.
  const u = Math.abs(a) / Math.PI;
  const steps = (ORBIT_LAND.filled - ORBIT_LAND.at) / 6;
  return c === EARTH_CARD ? -Infinity : ORBIT_LAND.at + 6 * (1 + Math.min(steps - 1, Math.floor(u * steps)));
}

// ——— The Sun, which is him ———————————————————————————————————————————————————————————————————————————————————————————————————

/** The Sun's radius (world: ≈ 520 px across on the landing, ≈ 820 px through the slingshot) and its corona's rays. */
export const SUN = { r: 0.3, rays: 48 } as const;
/** His face on the Sun is at least this share of the disc's width (the slingshot's reveal must read). */
export const SUN_FACE_WIDTH = 0.9;
/** The Sun's card turns over inside the slingshot's peak blur: 0 → π over SLINGSHOT − 3 … + 3 (its face swaps edge-on, at π/2). */
export const sunTurn = (f: number): number => Math.PI * sF((f - (SLINGSHOT - 3)) / 6);
/** The Sun's face at instant `f`: (⌒▽⌒)☆, then him (✺◟( • ω • )◞✺) once its card is past edge-on. */
export const sunFace = (f: number): string => (sunTurn(f) < Math.PI / 2 ? SUN_FACE : HERO_FACES.sun);
/** Is the Sun him yet? */
export const sunIsHim = (f: number): boolean => sunTurn(f) >= Math.PI / 2;
/** The corona's flare: 1 at rest, up to 1.6 as the CME erupts (decaying over 20 f). */
export const coronaFlare = (f: number): number => (f < SLINGSHOT ? 1 : 1 + 0.6 * Math.max(0, 1 - (f - SLINGSHOT) / 20) ** 2);

/** One face of the coronal mass ejection, in the Sun's picture plane: offsets in Sun radii (y up), em in Sun radii. */
export type CmeFace = { face: string; x: number; y: number; em: number };
/** Faces per prominence loop (the design's ≈ 300 in all, thinned so each loop reads as a chain of faces through the blur). */
export const CME_PER_LOOP = 44;
/** How far the CME has erupted at instant `f`: out of the limb from the kick at full speed (75 % in 3 f), its faces fading in over 2 f. */
export const cmeAt = (f: number): number => (f < SLINGSHOT ? 0 : 1 - Math.exp(-0.462 * (f - SLINGSHOT + 0.5)));
/** Three prominence loops of amber faces, arcing out of the limb from the slingshot (they settle in the slow-mo). */
export function cme(f: number): CmeFace[] {
  if (f < SLINGSHOT) return [];
  const g = 0.15 + 0.85 * cmeAt(f);
  const out: CmeFace[] = [];
  for (let k = 0; k < 3; k++) {
    // The prototype's angles are y-down; negated here (y up).
    const a0 = -(-Math.PI / 2 + (k - 1) * 2.1 + 0.3);
    const height = (1.2 + 0.5 * k) * g;
    for (let m = 0; m < CME_PER_LOOP; m++) {
      const u = m / (CME_PER_LOOP - 1);
      const a = a0 - (u - 0.5) * 0.9;
      const hh = 1 + height * Math.sin(Math.PI * u);
      out.push({ face: REAM_FACES[(m + k * 7) % REAM_FACES.length], x: Math.cos(a) * hh, y: Math.sin(a) * hh, em: 0.085 + 0.05 * hash(m, k, 7) });
    }
  }
  return out;
}

// ——— The spirograph ——————————————————————————————————————————————————————————————————————————————————————————————————————————

/** Each trail looks this many frames into the past (the past camera); trails break where one step jumps further than `maxJump` px. */
export const TRAIL = { frames: 18, maxJump: 600, relaxed: 5 } as const;
/**
 * How many frames of the past a trail shows at instant `f`: 18 through the landing, the dive and the slingshot (the spirograph); it relaxes
 * to 5 over the slow-mo exit (the ribbons decompress into readable rings), grows back to 18 with the lap's whip (the amber spirograph, held
 * to LAP.relax), then relaxes again into the fling. Never older than the landing (the trails grow out of 3.1).
 */
export function trailFrames(f: number): number {
  const ease = (a: number, b: number, u: number) => a + (b - a) * sF(u);
  let n: number = TRAIL.frames;
  if (f >= EXIT.from && f < LAP.at) n = ease(TRAIL.frames, TRAIL.relaxed, (f - EXIT.from) / (SLOWMO.from - EXIT.from));
  else if (f >= LAP.at && f < LAP.relax) n = ease(TRAIL.relaxed, TRAIL.frames, (f - LAP.at) / 4);
  else if (f >= LAP.relax) n = ease(TRAIL.frames, 8, (f - LAP.relax) / 8);
  return Math.max(0, Math.min(n, f - ORBIT_LAND.at));
}
/** One continuous trail per glyph cluster: 24 a ring (the design's ≈ 8 rings × 24), half a cluster ahead of its ring's card 0. */
export const SPIRO_PER_RING = 24;
/**
 * Card `c`'s trail point `k` frames back from instant `f`: where the card was then, seen by the camera of then (the spirograph: when the
 * camera whips, the trails curl into epitrochoid loops). Null behind the lens.
 */
export const trailPoint = (c: SolarCard, f: number, k: number): { x: number; y: number; k: number; z: number } | null => project(solarCamera(f - k), cardPos(c, f - k));
/** How fast the camera turns at instant `f` (degrees of azimuth a frame, plus the dive's closing), 0 at rest … 1 at the slingshot's peak. */
export function whipness(f: number): number {
  const turn = Math.abs(azimuth(f + 0.5) - azimuth(f - 0.5)) / D2R;
  return clamp01(turn / 20);
}
/** The trails' past is sampled this many frames apart at instant `f`: 1 at rest, 1/6 in the whips (smooth curves at 26°/f). */
export const trailStep = (f: number): number => (Math.max(whipness(f), whipness(f - 6), whipness(f - 12)) > 0.08 ? 1 / 6 : 1);
/** The angle of trail `j` of a ring from its card 0 (half a cluster ahead of it). */
export const spiroAngle = (j: number): number => ((j + 0.5) * TAU) / SPIRO_PER_RING;
const SPIRO_OVERTYPED: number[][] = RINGS.map((r) => Array.from({ length: SPIRO_PER_RING }, (_, j) => overtypedAngle(r.i, spiroAngle(j))));
/** Is trail `j` of ring `ring` amber at output frame `out` (the cursor has passed its cluster, or the lap's ding)? */
export const spiroAmber = (ring: number, j: number, out: number): boolean => out >= Math.min(LAP.at, SPIRO_OVERTYPED[ring][j]);
/** A trail through the past camera: its ring and cluster, amber or the ring's ink, and its points (screen px, y up) from now (0) back. */
export type Spiro = { ring: number; j: number; amber: boolean; x: Float64Array; y: Float64Array; n: number; K: number };
/**
 * Every trail of the spirograph at instant `f`: for each ring's 24 clusters, the cluster's place over the last TRAIL.frames frames (one
 * point a frame at rest, six in the whips), each seen by the camera of its own instant — the PAST camera. At rest they are short arcs
 * along the orbits; when the camera whips they curl into epitrochoid loops, interleaving ring with ring into the guilloche. Stable: a
 * cluster is the same trail on every sub-frame (its head slides along its own path). A trail ends at the lens or at a jump past `maxJump`.
 */
export function spiroTrails(f: number): Spiro[] {
  const step = trailStep(f);
  const K = Math.round(trailFrames(f) / step);
  if (K < 1) return [];
  const cams: Cam[] = [];
  const turns: number[][] = [];
  for (let k = 0; k <= K; k++) {
    cams.push(solarCamera(f - k * step));
    turns.push(RINGS.map((r) => ringTurn(r.i, f - k * step)));
  }
  const out = Math.floor(f + 0.5);
  const trails: Spiro[] = [];
  for (const ring of RINGS) {
    for (let j = 0; j < SPIRO_PER_RING; j++) {
      const xs = new Float64Array(K + 1);
      const ys = new Float64Array(K + 1);
      let n = 0;
      for (let k = 0; k <= K; k++) {
        const a = spiroAngle(j) + turns[k][ring.i];
        const q = project(cams[k], [ring.r * Math.cos(a), 0, -ring.r * Math.sin(a)], 0.05);
        if (!q) break;
        if (n > 0 && Math.hypot(q.x - xs[n - 1], q.y - ys[n - 1]) > TRAIL.maxJump) break;
        xs[n] = q.x;
        ys[n] = q.y;
        n++;
      }
      if (n > 1) trails.push({ ring: ring.i, j, amber: spiroAmber(ring.i, j, out), x: xs, y: ys, n, K });
    }
  }
  return trails;
}
/** How much the kick pumps bar 3's light (the trails, the orbits, the cards): ×(1 + PUMP) on the kick's frame, back over 8 f. */
export const PUMP = 0.4;
/** The cards' share of the pump as size: they pop ×(1 + POP × PUMP) on the kick (the type's beat), back with it. */
export const POP = 0.35;
/** The kick's pump at instant `f`: whole on the kick's output frame (taken SWAP_LEAD early, like every drum swap), (1 − t/8)² after. */
export function kickPump(f: number): number {
  const k = lastOf(KICKS, f + SWAP_LEAD);
  return 1 + PUMP * env(f - k + SWAP_LEAD, 8);
}
/**
 * How bright the trails burn (a gain on their light): short arcs at rest; with the lap's ding every orbit is amber and the whip curls them
 * into the amber spirograph, brighter (×1.8), held 10 f, then relaxing; they fade out as the fling throws the system away.
 */
export function trailGain(f: number): number {
  const lap = f < LAP.at - SWAP_LEAD ? 0 : f < LAP.relax ? 1 : Math.max(0, 1 - (f - LAP.relax) / 12);
  return (1 + 0.8 * lap) * (1 - 0.6 * flingAt(f));
}

// ——— What catches the light (the open hats' glints) and where the 16ths' sparks land ———————————————————————————————————————————

/** The main-row cards' heads on screen at instant `f` (≤ 700 px tall, inside the frame), for the open hats' ✦ glints. */
export function solarGlints(f: number): [number, number][] {
  const cam = solarCamera(f);
  const out: [number, number][] = [];
  for (const c of SOLAR_CARDS) {
    if (c.row !== 0 || pastedAt(c) > Math.floor(f + 0.5)) continue;
    const q = project(cam, cardPos(c, f));
    if (!q) continue;
    const h = c.em * q.k;
    if (h > 700 || h < 6 || Math.abs(q.x) > 930 || Math.abs(q.y + h * 0.32) > 510) continue;
    out.push([q.x, q.y + h * 0.32]);
  }
  return out;
}
/** The main-row cards overtyped in the last 3 output frames before `out` (a 3-frame ✧ spark each), on screen at instant `f`. */
export function solarSparks(f: number): [number, number][] {
  const cam = solarCamera(f);
  const o = Math.floor(f + 0.5);
  const out: [number, number][] = [];
  for (const c of SOLAR_CARDS) {
    if (c.row !== 0) continue;
    const at = overtypedAt(c);
    if (!(o - at >= 0 && o - at < 3 && at < LAP.at)) continue;
    const q = project(cam, cardPos(c, f));
    if (!q || Math.abs(q.x) > 980 || Math.abs(q.y) > 560) continue;
    out.push([q.x, q.y + c.em * q.k * 0.6]);
  }
  return out;
}

// ——— Who carries him on this bar (the SUBJECT), the hook ——————————————————————————————————————————————————————————————————————

/** His face on Earth's globe card: (>ω<) on the bar's top note for 12 f, else (•ω•). */
export function earthFace(f: number): string {
  const top = HOOK_TOPS.find((t) => t >= T0 && t < T0 + 96);
  return top !== undefined && f >= top && f < top + 12 ? HERO_FACES.top : HERO_FACES.face;
}
/** The bob (px, up) of whatever carries him, on the hook's note starts: +6 over the note's first 4 f. */
export function bob(f: number): number {
  for (const n of HOOK) {
    const t = f - n.at;
    if (t >= 0 && t < 4) return 6 * Math.sin(Math.PI * (t / 4));
  }
  return 0;
}
/** The SUBJECT: Earth (his globe) until the dive turns the camera onto the Sun; the Sun from there (it is him from the slingshot). */
export const subjectIsSun = (f: number): boolean => f >= DIVE.from + 6;

/** Cosmos 3's range in film frames (renderer B draws 3.1 → 5.1; this bar is 3.1 → 4.1). */
export const SOLAR = { from: cs(3), to: cs(4) } as const;

/** A smooth 0 → 1 over [a, b] (cubic out), for fades. */
export const fadeIn = (f: number, a: number, b: number): number => cO((f - a) / (b - a));
