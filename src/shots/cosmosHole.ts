// Cosmos 6, "EVENT HORIZON · 10²⁶ m → ∞" (renderer C's second bar; build sheet notes/bcos/sheet.md §4.6, §6.5, §6.6, design
// notes/cosmos3/final.md §4 bar 20, prototype cosmos3/w/j6.js): pure. The antivirus's sandbox as a black hole: the whole lit universe
// as a thin accretion disc seen from 55° over its plane (a real tilted annulus under a perspective camera), textured with five bands of
// every level's light that spin differentially (Kepler, ≤ 0.75 turn/s for r ≥ 200 px) and drain inward a band a beat; its far half lensed
// into an arch over the void and a thin under-arch beneath it; an amber photon ring; the red rim (drawn after the print). On 6.1 the web
// winds into it (the twist + tilt, E18); on 6.3 the sandbox sucks (the drain ×3, the disc shrinks to r 640, the corners turn VOID);
// on 6.4 the approved stutter crushes it in hard steps (r 400 · 240 · 130 · 60 · 22, −30° a slice) to one amber point: his • eye, where
// the comic club opens (E20).
//
// Units: the disc's own plane in px (1 unit = 1 px at the disc's centre when face-on), y "up the disc" (the far side once tilted); the
// screen in px at 1080p, origin at the frame centre, y up. Content time is the stutter's content frame (score stutterFrame): every
// picture function here takes an output instant and maps it itself, so the stutter's repeats are exact. Plain Node loads this file:
// no three / remotion / react imports.
import { DEFENDER_FACE, HERO_FACES } from '../content/castCosmos.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import { HATS, HOOK, HORIZON, INFINITY, KICKS, OPEN_HATS, POINT, SANDBOX, SPAGHETTI, STUTTER, STUTTER_SLICES, cs, stutterFrame } from '../score/cosmos.ts';
import { frameOf } from './cosmosKit.ts';
import { easeCos, env, lastOf, launchL } from './cosmosWeb.ts';

// ——— The hole's geometry (design §4 bar 20; sheet §4.6) ——————————————————————————————————————————————————————————————————————

export const HOLE = {
  /** The camera's distance from the disc's centre (px); its focal length equals it, so the centre plane is 1 px a unit. */
  distance: 3000,
  /** How far the camera tilts over the plane from face-on (degrees): the disc is seen 35° above its plane. */
  tilt: 55,
  /** The disc's inner and outer radius (disc px): from just outside the photon ring to beyond every corner of the frame. */
  rin: 150,
  rout: 2100,
  /** The sandbox: the shadow (VOID), its red rim (drawn after the print), the amber photon ring (screen px at the push of 1). */
  shadow: 92,
  rim: 101,
  photon: 112,
  /** The Defender's post at 12 o'clock over the arch (screen px) and his own small red ring. */
  post: 300,
  postRing: 46,
  /** Where his node was on 5.4a (r, θ in the face-on disc: screen (−300, +420)) and how close he rides by the stutter. */
  heroFrom: { r: Math.hypot(300, 420), theta: Math.atan2(420, -300) },
  heroTo: 150,
  /** The suck's end: the disc's outer edge by the stutter (disc px). */
  shrinkTo: 640,
  /** Five bands of every level's light, inner → outer: web · warp · orbits · Earth · bang. */
  bands: 5,
} as const;

export type BandId = 'web' | 'warp' | 'orbit' | 'earth' | 'bang';
export const BANDS: readonly BandId[] = ['web', 'warp', 'orbit', 'earth', 'bang'];

/** The disc's log radius of r: 0 at the inner edge, 1 at the outer (the strip's v before the drain). */
export const logRadius = (r: number): number => Math.log(r / HOLE.rin) / Math.log(HOLE.rout / HOLE.rin);
/** The radius of log radius l. */
export const radiusOfLog = (l: number): number => HOLE.rin * (HOLE.rout / HOLE.rin) ** l;

// ——— Time ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The stutter's slice drawing output instant `f` (−1 before the stutter; 5 is the point). */
export function sliceAt(f: number): number {
  if (f < STUTTER.from) return -1;
  let k = 0;
  STUTTER_SLICES.forEach((s, i) => {
    if (f >= s.at) k = i;
  });
  return k;
}
/** The content instant output instant `f` shows (the stutter's repeats; itself elsewhere). */
export const contentAt = (f: number): number => stutterFrame(f);
/** Frames since the sandbox opened (cosmos 6.1), in content time. */
const since = (cf: number): number => cf - HORIZON.at;

// ——— The camera: the twist's tilt, the slow push with its kick surges, the stutter's steps ————————————————————————————————————————

/** The twist (δ, 0 → 1 in about 6 f, L): the web winds into the spiral as the camera tilts over the plane. */
export const twistAt = (cf: number): number => clamp(launchL(since(cf)));
/** The tilt (radians) at content instant cf: 55° under the twist (L, its 3 % overshoot kept). */
export const tiltAt = (cf: number): number => ((HOLE.tilt * Math.PI) / 180) * Math.min(1.02, launchL(since(cf)));
/** The kick's surge on the disc (×1.35 for 2 f, back over 10 f): the light grammar's pulse, here the whole SUBJECT. */
export function kickPulse(cf: number): number {
  const k = lastOf(KICKS, cf);
  const t = cf - k;
  return t < 0 ? 0 : t < 2 ? 1 : env(t - 2, 8);
}
/** The slow push 1.00 → 1.12 by 6.2& + 11 (design 1871), eased, with a 2.5 % surge on every kick. */
export const pushAt = (cf: number): number => (1 + 0.12 * easeCos(since(cf) / (cs(6, 3) - 1 - HORIZON.at))) * (1 + 0.025 * kickPulse(cf));

export type HoleCam = { tilt: number; /** screen scale about the centre (push × the slice's) */ zoom: number; /** screen turn (radians, ccw +) */ turn: number };

/** The stutter's slice scale (its disc radius over the suck's 640) and turn (radians); 1 and 0 before it. */
export function sliceStep(slice: number): { scale: number; turn: number } {
  if (slice < 0) return { scale: 1, turn: 0 };
  const s = STUTTER_SLICES[slice];
  return { scale: s.r === 'point' ? 0 : s.r / HOLE.shrinkTo, turn: (s.turn * Math.PI) / 180 };
}

/** The camera at output instant `f`. */
export function holeCam(f: number): HoleCam {
  const cf = contentAt(f);
  const { scale, turn } = sliceStep(sliceAt(f));
  return { tilt: tiltAt(cf), zoom: pushAt(cf) * scale, turn };
}

/** A disc point (x, y in the disc plane, y toward the far side) on screen, y up: the tilted perspective, then the zoom and the turn. */
export function projectDisc(cam: HoleCam, x: number, y: number): { x: number; y: number; k: number } {
  const D = HOLE.distance;
  const s = Math.sin(cam.tilt);
  const depth = D + y * s;
  const k = (D / depth) * cam.zoom;
  const X = x * k;
  const Y = y * Math.cos(cam.tilt) * k;
  const c = Math.cos(cam.turn);
  const n = Math.sin(cam.turn);
  return { x: X * c - Y * n, y: X * n + Y * c, k };
}
/** A screen-centred point (the void's furniture) at screen offset (x, y) under the camera's zoom and turn (no tilt: it faces us). */
export function screenAt(cam: HoleCam, x: number, y: number): [number, number] {
  const c = Math.cos(cam.turn);
  const n = Math.sin(cam.turn);
  return [(x * c - y * n) * cam.zoom, (x * n + y * c) * cam.zoom];
}

// ——— The disc's motion: differential rotation, the drain, the suck ————————————————————————————————————————————————————————————

/** Angular speed at disc radius r (rad/frame, clockwise): Kepler, 0.75 turn/s at r 200 px, capped at 0.2 rad/f near the hole. */
export const omega = (r: number): number => Math.min(0.2, ((0.75 * 2 * Math.PI) / 60) * (200 / Math.max(r, 60)) ** 1.5);

/** The drain's step on content frame `f`: a band a beat, ×1.6 on a kick's surge, ×3 from the sandbox's suck (6.3). */
const drainStep = (f: number): number => (0.2 / 24) * (1 + 0.6 * env(f - lastOf(KICKS, f), 10)) * (f >= SANDBOX ? 3 : 1);
const DRAIN_TABLE: readonly number[] = (() => {
  const out = [0];
  for (let f = HORIZON.at; f < STUTTER.to + 2; f++) out.push(out[out.length - 1] + drainStep(f));
  return out;
})();
/** How far the bands have drained inward (log-radius units, a band = 0.2) by content instant cf (interpolated between frames). */
export function drainAt(cf: number): number {
  const t = clamp(cf - HORIZON.at, 0, DRAIN_TABLE.length - 2);
  const i = Math.floor(t);
  return lerp(DRAIN_TABLE[i], DRAIN_TABLE[i + 1], t - i);
}

/** The disc's visible outer edge (disc px): beyond every corner until the suck, then in to 640 by the stutter (eased). */
export const routAt = (cf: number): number => (cf < SANDBOX ? HOLE.rout : lerp(HOLE.rout, HOLE.shrinkTo, smoothstep(SANDBOX, STUTTER.from, cf)));

/** The counterchange (6.2): a wave from the hole outward swaps the structure's cyan and pink (L, 6 f); its front's radius (disc px). */
export const counterFront = (cf: number): number => (cf < INFINITY ? 0 : lerp(HOLE.rin, HOLE.rout * 1.05, Math.min(1, launchL(cf - INFINITY) * 1.08)));

/** The spaghettifying kick's strength at cf: the innermost band streaks inward across the horizon (full on the SPAGHETTI kicks). */
export function spaghettiAt(cf: number): number {
  const k = lastOf(KICKS, cf);
  if (k < HORIZON.at || k >= STUTTER.from) return 0;
  return env(cf - k, 12) * (SPAGHETTI.includes(k) ? 1 : 0.55);
}

/** The lensed shock ring on the 6.2 clap (disc px from the centre, L to 1300 in 10 f) and its strength; null outside it. */
export function shockRing(cf: number): { r: number; a: number } | null {
  const t = cf - INFINITY;
  if (t < 0 || t >= 14) return null;
  return { r: lerp(HOLE.rin, 1500, Math.min(1, launchL(t) * 1.05)), a: 1 - t / 14 };
}

// ——— Who is where ————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The bar's top note (row B's G6 on 6.1a): (>ω<) on the rider for its two 16ths. */
export const HOOK_TOP_B = HOOK.find((n) => n.top && n.at >= HORIZON.at)!.at;

/** His ride: from where his node was to the photon ring by the stutter, carried round by the disc (clockwise), bobbing on the hook. */
export function heroRide(cf: number): { r: number; theta: number; face: string; bob: number } {
  const u = clamp(since(cf) / (STUTTER.from - HORIZON.at));
  const r = lerp(HOLE.heroFrom.r, HOLE.heroTo, u * u * (3 - 2 * u));
  // He rides a little slower than the gas round him (0.6 of the local spin), so he reads, and spirals in.
  const theta = HOLE.heroFrom.theta - 0.6 * omega(r) * Math.max(0, since(cf));
  let bob = 0;
  for (const n of HOOK) if (n.at >= HORIZON.at && n.at < STUTTER.to && cf >= n.at && cf < n.at + n.len * 6) bob = 6 * Math.sin(Math.PI * clamp((cf - n.at) / 4));
  const out = frameOf(cf);
  const face = out >= HOOK_TOP_B && out < HOOK_TOP_B + 12 ? HERO_FACES.top : HERO_FACES.face;
  return { r, theta, face, bob };
}

/** The Defender: his node at the centre opens into the void and he rises to his post (L); he scales away with the stutter, gone from slice 3. */
export function defenderPost(f: number): { x: number; y: number; alpha: number; face: string } {
  const cf = contentAt(f);
  const slice = sliceAt(f);
  const rise = Math.min(1.02, launchL(since(cf) + 1));
  return { x: 0, y: HOLE.post * rise, alpha: slice >= 3 ? 0 : 1, face: DEFENDER_FACE };
}

/** The void opening (0 → 1, L, from 6.1; his node opens into it). */
export const openAt = (cf: number): number => Math.min(1.03, launchL(since(cf) + 0.5));

/** The red rim's radius factor: a pulse on the suck (6.3), tightening from 6.3& (red swing ≤ 20: a thin ring). */
export const rimPulse = (cf: number): number => (1 + 0.15 * env(cf - SANDBOX, 10)) * (cf >= cs(6, 3.5) ? lerp(1, 0.92, clamp((cf - cs(6, 3.5)) / 12)) : 1);

/** The photon ring's light: an amber pulse on every kick (the spaghetti's arrival), back over 8 f. */
export const photonPulse = (cf: number): number => 1 + 0.9 * env(cf - lastOf(KICKS, cf), 8);

// ——— The stardust in the void corners ————————————————————————————————————————————————————————————————————————————————————————

/** Stardust specks (screen px, drifting): visible in the VOID the suck leaves (from 6.3), gone by the last slice before the point. */
export const DUST_COUNT = 160;
export function dustAlpha(f: number): number {
  const cf = contentAt(f);
  if (f >= STUTTER.from) return clamp(1 - (f - STUTTER.from) / 18);
  return smoothstep(SANDBOX, SANDBOX + 12, cf);
}
export function dustAt(f: number): { x: number; y: number; a: number; cyan: boolean }[] {
  const a = dustAlpha(f);
  if (a <= 0) return [];
  const cf = contentAt(f);
  const out: { x: number; y: number; a: number; cyan: boolean }[] = [];
  for (let k = 0; k < DUST_COUNT; k++) {
    // Each speck falls slowly toward the hole (the suck), a little faster near it.
    const x0 = (hash(k, 31) - 0.5) * 2200;
    const y0 = (hash(k, 33) - 0.5) * 1250;
    const pull = 1 - 0.06 * clamp((cf - SANDBOX) / 24) * (1 + hash(k, 32));
    out.push({ x: x0 * pull, y: y0 * pull, a: a * (0.25 + 0.75 * hash(k, 34) ** 3), cyan: k % 3 !== 0 });
  }
  return out;
}

// ——— The point (E20) ——————————————————————————————————————————————————————————————————————————————————————————————————————

/** The club's dot (sheet §6.5): core #FFE2B4 r 4, amber #FFB23E r 9, a glow fading to r 30, at the frame centre. */
export const POINT_DOT = { core: 4, amber: 9, glow: 30 } as const;
/** Whether output instant `f` is the point (the last three frames). */
export const isPoint = (f: number): boolean => f >= POINT.from;

// ——— What the GPU draws at an instant ——————————————————————————————————————————————————————————————————————————————————————

/** The disc's per-instant state (the GPU's uniforms). */
export type DiscState = {
  /** Content time since 6.1 (frames): the differential rotation's clock. */
  t: number;
  drain: number;
  /** 0–1: the disc fading in under the twist. */
  vis: number;
  rout: number;
  /** The counterchange wave's front (disc px; 0 before 6.2). */
  cc: number;
  spaghetti: number;
  /** The whole disc's kick pulse (0–1). */
  pulse: number;
  /** Only the structure's band lines and its rim as tubes (the stutter from slice 1). */
  tubes: boolean;
  /** Its outer edge as a cyan tube (from 6.3&). */
  rimTube: boolean;
  shock: { r: number; a: number } | null;
  /** The spiral blink on the closed hats: which band (0–4) and the sweep's angle, its strength. */
  blink: { band: number; angle: number; a: number };
};

export type HolePicture = {
  out: number;
  cf: number;
  slice: number;
  cam: HoleCam;
  point: boolean;
  disc: DiscState;
  /** The web's last frame (the snapshot) wound into the disc under the twist: its alpha and its twist (radians at the centre). */
  snapshot: { alpha: number; twist: number };
  /** The lensed arch (pass B) and under-arch (pass C) strength. */
  arch: number;
  /** Screen radii (px) of the void, the photon ring (with its pulse) under the camera; the red rim's (for the overlay). */
  shadow: number;
  photon: number;
  photonGain: number;
  rim: number;
  hero: { x: number; y: number; em: number; face: string } | null;
  defender: { x: number; y: number; em: number; alpha: number; face: string } | null;
  dust: { x: number; y: number; a: number; cyan: boolean }[];
};

/** The hole at output instant `f`. */
export function holePicture(f: number): HolePicture {
  const out = frameOf(f);
  const cf = contentAt(f);
  const slice = sliceAt(f);
  const cam = holeCam(f);
  const point = slice === 5;
  const t = Math.max(0, since(cf));
  const open = openAt(cf);
  const hatK = HATS.filter((h) => h <= cf && h >= HORIZON.at).length;
  const lastHat = lastOf(HATS, cf);
  const blink = { band: hatK % HOLE.bands, angle: -0.9 - 2.4 * ((cf - lastHat) / 6), a: lastHat >= HORIZON.at && lastHat < STUTTER.from ? env(cf - lastHat, 6) : 0 };
  const disc: DiscState = {
    t,
    drain: drainAt(cf),
    vis: point ? 0 : twistAt(cf),
    rout: routAt(cf),
    cc: counterFront(cf),
    spaghetti: spaghettiAt(cf),
    pulse: cf < STUTTER.from ? kickPulse(cf) : 0,
    tubes: slice >= 1,
    rimTube: cf >= cs(6, 3.5),
    shock: shockRing(cf),
    blink,
  };
  const ride = heroRide(cf);
  const hp = projectDisc(cam, ride.r * Math.cos(ride.theta), ride.r * Math.sin(ride.theta));
  const hero = slice < 4 && !point ? { x: hp.x, y: hp.y + ride.bob * cam.zoom, em: Math.max(30 * cam.zoom, 46 * hp.k), face: ride.face } : null;
  const dp = defenderPost(f);
  const [dx, dy] = screenAt(cam, dp.x, dp.y);
  const defender = dp.alpha > 0 && !point ? { x: dx, y: dy, em: 34 * cam.zoom, alpha: dp.alpha, face: dp.face } : null;
  return {
    out,
    cf,
    slice,
    cam,
    point,
    disc,
    snapshot: { alpha: point ? 0 : 1 - twistAt(cf), twist: 1.6 * Math.min(1.02, launchL(t)) },
    arch: point ? 0 : twistAt(cf),
    shadow: HOLE.shadow * open * cam.zoom,
    photon: HOLE.photon * open * cam.zoom,
    photonGain: cf < STUTTER.from ? photonPulse(cf) : 1,
    rim: Math.max(slice === 4 ? 26 : 0, HOLE.rim * open * rimPulse(cf) * cam.zoom),
    hero,
    defender,
    dust: dustAt(f),
  };
}

/** The open hats of cosmos 6 (glints along the bands) and its closed hats (the spiral blink). */
export const HOLE_OPEN_HATS: readonly number[] = OPEN_HATS.filter((h) => h >= HORIZON.at);

// ——— The club pre-lapped into the stutter (continuity plan v07 §2.3, WP1) ————————————————————————————————————————————————————————
// Pure data for the hole's GPU half (src/scenes/cosmosCHole.ts) and its lights (src/shots/cosmosWebLight.ts holeLights), which sit
// outside WP1's fence: the hook-up is a few lines in each (WP1's hand-off note, output/qa/v07/WP1/cosmos-hookup.patch). Until it is
// applied nothing draws these, and the stutter stays the approved picture.

/**
 * The club's Ben-Day rings, born early: on each of the stutter's 3-frame cells from its third slice (output frames STUTTER.from + 12, 15,
 * 18) one more concentric ring of halftone dots round the shrinking disc — accumulating, never blinking, held through the point — in the
 * paper of the club's first frame (its burst on club 1.1 is paper dots on the void, as big at these radii: the seam's grammar is the
 * club's before the club). Screen px.
 */
export const STUTTER_RINGS = { at: [STUTTER.from + 12, STUTTER.from + 15, STUTTER.from + 18], r: [170, 270, 370], pitch: 24, dot: 12, rows: 2 } as const;
/** The ring dots at output frame `f` (screen px, y up, from the centre; `d` the dot's diameter): none before the first cell. */
export function stutterRingDots(f: number): { x: number; y: number; d: number }[] {
  const out: { x: number; y: number; d: number }[] = [];
  if (f < STUTTER_RINGS.at[0] || f >= STUTTER.to) return out;
  STUTTER_RINGS.at.forEach((at, k) => {
    if (f < at) return;
    // A ring pops on its cell (its dots from 70 % on the cell's first frame), then holds.
    const grow = f - at < 1 ? 0.7 : 1;
    for (let row = 0; row < STUTTER_RINGS.rows; row++) {
      const rr = STUTTER_RINGS.r[k] + row * STUTTER_RINGS.pitch * 0.87;
      const m = Math.round((2 * Math.PI * rr) / STUTTER_RINGS.pitch);
      for (let i = 0; i < m; i++) {
        const th = (2 * Math.PI * (i + 0.5 * row)) / m + 0.1 * k;
        // The outer row's dots smaller: a halftone falling off outward.
        out.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), d: STUTTER_RINGS.dot * grow * (row === 0 ? 1 : 0.7) });
      }
    }
  });
  return out;
}
/**
 * The point as the club's eye (2109–2111, the last three frames): the amber dot grows toward the eye it is on club 1.1 (r 9 → 13 → 17),
 * keylined in the club's K (a dark ring `keyline` px wide just outside it, seen against its glow), with the eye's paper highlight up and to
 * the left, and its glow printed as halftone (amber dots on two rings, smaller outward) instead of a soft gradient. Screen px.
 */
export function pointEye(f: number): { r: number; keyline: number; highlight: { x: number; y: number; w: number; h: number; rot: number }; glow: { x: number; y: number; d: number }[] } {
  const k = Math.max(0, Math.min(2, Math.floor(f) - POINT.from));
  const r = [9, 13, 17][k];
  const glow: { x: number; y: number; d: number }[] = [];
  [r + 9, r + 17].forEach((rr, row) => {
    const m = Math.round((2 * Math.PI * rr) / 7);
    for (let i = 0; i < m; i++) {
      const th = (2 * Math.PI * (i + 0.5 * row)) / m;
      glow.push({ x: rr * Math.cos(th), y: rr * Math.sin(th), d: row === 0 ? 4 : 2.6 });
    }
  });
  return { r, keyline: 2 + k, highlight: { x: -0.38 * r, y: 0.42 * r, w: 0.24 * r, h: 0.11 * r, rot: (35 * Math.PI) / 180 }, glow };
}
