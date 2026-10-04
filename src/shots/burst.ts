// S13 (cosmos bar 1; spec revision 8 §7, §6 T3, §15 视觉大招 2), photographed: on
// the drop the sun bursts — the Big Bang — into 3D enamel kaomoji in pearl,
// ice, gold and rose, gold chrome stars, rings and planetoids flying out
// along radial rays, so the chaos has an order: shells of pieces on spokes,
// among thousands of white-hot little faces (src/shots/voyage.ts). A
// sixteenth later the burst's clock freezes (a slow living drift) while the
// camera swings 120° round it, with depth of field and glow; every face looks
// outward from the centre. On beat 3 time snaps back and the camera carries
// on round; on the fill the big pieces fly off past the camera while the
// little faces fall back in and, on cosmos 2.1, lock into Earth. Every
// position is part-local (src/score/film.ts). Pure: the scene
// (src/scenes/kosmos.ts) draws it.
import { BURST_FACES } from '../content/castDrop1.ts';
import type { Pose } from '../engine/camera.ts';
import { type RGB, multiplyRGB, scaleRGB } from '../engine/color.ts';
import type { FlatContent } from '../engine/flatLayer.ts';
import { clamp, lerp, smoothstep } from '../engine/math.ts';
import { hash } from '../engine/random.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Temporal } from '../engine/temporal.ts';
import { aimPose, launch, moveTrack, strike } from '../motion/hit.ts';
import { BANG_KICKS, BURST, FILL, FREEZE, LEVELS, RESUME } from '../score/drop1.ts';
import { partEnd, partFrame } from '../score/film.ts';
import { PAPER as RISO_PAPER, PLATE } from '../worlds/riso.ts';
import { SPACE, SPACE_BLACK } from '../worlds/space.ts';
import { SUN, s12Aim, sunCentre } from './riso.ts';
import { FOV, FRONT } from './swiss.ts';

type Vec3 = readonly [number, number, number];
export type PieceKind = 'face' | 'star' | 'ring' | 'orb';
export type Piece = {
  kind: PieceKind;
  /** The face a 'face' piece extrudes ('' otherwise). */
  face: string;
  /** Unit direction of its ray from the centre. */
  dir: Vec3;
  /** Share of BURST_V: its shell on the ray. */
  speed: number;
  /** Turn about its own facing axis at the burst, and its tumble rate (radians per frame of the burst's clock). */
  roll: number;
  rate: number;
  /** Faces: em in world units; others: diameter. */
  size: number;
  color: RGB;
  /** Chrome instead of enamel. */
  chrome: boolean;
};

/** Burst speed: world units per frame of the burst's clock (the cloud is ~1 400 across when it freezes, filling the frame). */
export const BURST_V = 110;
/** After the resume everything flies out this many times faster. */
export const AFTER = 1.7;
/** The lens's radius at full aperture (world units). */
export const APERTURE = 22;
/** How far the camera swings round the frozen burst (radians); it carries on round to a full turn after the resume. */
export const SWING = (120 * Math.PI) / 180;
/** The little faces fall back in over the fill … */
export const GATHER = { from: LEVELS.earth - 24, to: LEVELS.earth } as const;
/** … into Earth: this radius (world units = px at 1080p on cosmos 2.1). */
export const EARTH_R = 450;
/** S12's last frame: the riso's last, the frame before the drop. */
const S12_END = partEnd('riso') - 1;
/** Where it all comes from: the sun on S12's last frame. */
export const ORIGIN: Vec3 = [sunCentre(S12_END)[0], sunCentre(S12_END)[1], 0];
/** The camera S12 ends on; S13 opens on it. */
const START: Pose = aimPose(s12Aim(S12_END), FRONT, FOV);
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
export const RAYS = 58;
const PER_RAY = 6;
const FACES = 220;
const ORBS = 56;

const unit = (v: readonly number[]): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
/** Point `k` of an `n`-point Fibonacci sphere. */
export const fib = (k: number, n: number): Vec3 => {
  const y = 1 - (2 * (k + 0.5)) / n;
  const ring = Math.sqrt(1 - y * y);
  return [ring * Math.cos(GOLDEN * k), y, ring * Math.sin(GOLDEN * k)];
};

const ENAMEL: readonly RGB[] = [SPACE.pearl, SPACE.rose, SPACE.ice, SPACE.gold, SPACE.rose, SPACE.violet, SPACE.gold];

/**
 * The burst's pieces: RAYS spokes on a Fibonacci sphere, PER_RAY pieces on
 * each at evenly spaced shells — planetoids nearest the centre, then chrome
 * stars and rings, faces on the outer shells — in pearl, ice, gold, rose and
 * violet enamel; the stars and half the rings gold chrome.
 */
export const PIECES: readonly Piece[] = (() => {
  const out: Piece[] = [];
  let face = 0;
  let orbs = 0;
  for (let k = 0; k < RAYS; k++) {
    const dir = unit(fib(k, RAYS));
    for (let j = 0; j < PER_RAY; j++) {
      const r = (n: number) => hash(k, j, 1301 + n);
      let kind: PieceKind = j >= 2 && face < FACES ? 'face' : j === 0 && orbs < ORBS ? 'orb' : (k + j) % 2 ? 'star' : 'ring';
      if (kind === 'face') face++;
      if (kind === 'orb') orbs++;
      if (j >= 2 && kind !== 'face') kind = 'star';
      const i = out.length;
      out.push({
        kind,
        face: kind === 'face' ? BURST_FACES[(face - 1) % BURST_FACES.length] : '',
        dir,
        speed: 0.25 + (0.75 * (j + 0.4 * r(1))) / PER_RAY,
        roll: 0.5 * (r(2) - 0.5),
        rate: kind === 'face' ? 0.01 + 0.015 * r(3) : 0.05 + 0.08 * r(3),
        size: kind === 'face' ? 62 + 26 * r(4) : kind === 'star' ? 26 + 18 * r(4) : kind === 'ring' ? 30 + 16 * r(4) : 34 + 26 * r(4),
        chrome: kind === 'star' || (kind === 'ring' && j % 2 === 0),
        color: kind === 'star' ? SPACE.gold : kind === 'orb' ? SPACE.pearl : ENAMEL[i % ENAMEL.length],
      });
    }
  }
  return out;
})();

/** The burst's own time: running from the drop, frozen through FREEZE but for a 2% drift (a living hold), then running again — faster — from the resume. */
export function burstClock(frame: number): number {
  if (frame <= BURST) return 0;
  const frozen = FREEZE.from - BURST;
  if (frame <= FREEZE.from) return frame - BURST;
  // Frozen but for a 2% drift — and a hiccup outward on the kick under the freeze.
  if (frame <= RESUME) return frozen + 0.02 * (frame - FREEZE.from) + 1.5 * strike(frame, BANG_KICKS[1], 2, 0);
  return frozen + 0.02 * (RESUME - FREEZE.from) + 1.5 + AFTER * (frame - RESUME);
}

/** Where piece `p` is at `frame`: out along its ray, tumbling; on the fill it flies on and off past the camera, shrinking away as the planet forms. */
export function piecePose(p: Piece, frame: number): { pos: Vec3; facing: Vec3; roll: number; scale: number } {
  const tau = burstClock(frame);
  const d = 40 + BURST_V * p.speed * tau;
  const grown = smoothstep(0, 3, tau);
  return { pos: [ORIGIN[0] + p.dir[0] * d, ORIGIN[1] + p.dir[1] * d, ORIGIN[2] + p.dir[2] * d], facing: p.dir, roll: p.roll + p.rate * tau, scale: grown * (1 - smoothstep(GATHER.from, GATHER.to - 2, frame)) };
}

const smootherstep = (u: number): number => {
  const t = clamp(u);
  return t * t * t * (t * (6 * t - 15) + 10);
};

/** The orbit's pose at swing `theta`: round the burst's centre at S12's distance, a little higher mid-way. */
function orbitPose(theta: number, lift: number): Pose {
  const c = ORIGIN;
  return { position: [c[0] + FRONT * Math.sin(theta), c[1] + lift, c[2] + FRONT * Math.cos(theta)], target: [c[0], c[1], c[2]], up: [0, 1, 0], fov: FOV };
}
/** The camera once Earth has formed: square on to the burst's centre, where the cosmos's screen has its middle. */
export const SQUARE: Pose = orbitPose(0, 0);

/**
 * The 3D camera: S12's last pose through the burst (turning to aim at the
 * sun, so the swing turns about it), a 120° swing round the frozen cloud
 * (easing in and out, no push at the peak), then on round to a full turn as
 * the debris falls back in, square on again for the lock — where it stays.
 */
export function burstCamera(frame: number): Pose {
  if (frame <= FREEZE.from) {
    const u = smoothstep(BURST, FREEZE.from, frame);
    return {
      position: [lerp(START.position[0], SQUARE.position[0], u), lerp(START.position[1], SQUARE.position[1], u), lerp(START.position[2], SQUARE.position[2], u)],
      target: [lerp(START.target[0], SQUARE.target[0], u), lerp(START.target[1], SQUARE.target[1], u), lerp(START.target[2], SQUARE.target[2], u)],
      up: START.up,
      fov: FOV,
    };
  }
  if (frame < RESUME) {
    const u = (frame - FREEZE.from) / (RESUME - FREEZE.from);
    return orbitPose(SWING * smootherstep(u), 0.12 * FRONT * Math.sin(Math.PI * u));
  }
  // After the resume the camera kicks round on each beat and snare of the fill and coasts between, square on again by the downbeat.
  if (frame < GATHER.to) {
    const deg = Math.PI / 180;
    const a = moveTrack(frame, SWING, [
      { at: RESUME, to: SWING + 80 * deg, tau: 3, bounce: 0 },
      { at: FILL[0], to: SWING + 120 * deg, tau: 1.2, bounce: 0 },
      { at: FILL[1], to: SWING + 160 * deg, tau: 1.2, bounce: 0 },
      { at: FILL[2], to: SWING + 200 * deg, tau: 1, bounce: 0 },
      { at: FILL[3], to: 2 * Math.PI, tau: 0.75, bounce: 0 },
    ]);
    return orbitPose(a, 0);
  }
  return SQUARE;
}

/** The lens's radius at `frame`: open only through the freeze, easing in and out over 6 frames at each end. */
export const burstAperture = (frame: number): number => APERTURE * smoothstep(FREEZE.from, FREEZE.from + 6, frame) * (1 - smoothstep(RESUME - 6, RESUME, frame));

/** Point `k` of an `n`-point Vogel (sunflower) disk of radius 1. */
export const vogel = (k: number, n: number): [number, number] => {
  const r = Math.sqrt((k + 0.5) / n);
  return [r * Math.cos(k * GOLDEN), r * Math.sin(k * GOLDEN)];
};
/** Sub-frame `i`'s lens point: decorrelated from time (37 is coprime with 64), so no motion streak is sharp at one end and blurred at the other. */
export const lensIndex = (i: number, n: number): number => (37 * i) % n;

/** Cosmos bar 1 samples 64 sub-frames: a fast burst, a swing with its lens, pieces flying. Through the freeze the shutter is 90°, so the frozen faces stay crisp while the camera swings; through the fill it is 72°, so each kick of the camera lands sharp. */
export function burstTemporal(frame: number): Temporal {
  const shutter = frame > FREEZE.from && frame < RESUME ? 0.25 : frame >= RESUME + 12 && frame < GATHER.to ? 0.2 : 0.5;
  return { samples: 64, shutter, persistence: 0 };
}

/** The first stab after time snaps back (cosmos 1.3&): the core flares on it. */
const STAB = partFrame('cosmos', 1, 2.5);

/**
 * The core at `frame`: a white-hot point that swells after the burst, then
 * cools a step on each hit of the fill (white, gold, orange, deep red) into
 * Earth's dark body; only from the last hit, as it goes dark, does it grow to
 * hold the little faces falling in — easing in, so it swells mostly once it is
 * nearly black and its glow (area × brightness) only falls (a big red disc
 * would read as flat). After
 * the resume its light on the pieces dims (×0.6), so a piece crossing it can't
 * flash off the grid; on the stab the core and its light flare (`flare`, ×1
 * when quiet).
 */
export function coreAt(frame: number): { r: number; heat: number; flare: number; light: number } {
  const t = frame - BURST;
  if (t < 0) return { r: 0, heat: 1, flare: 1, light: 1 };
  const last = FILL[FILL.length - 1];
  const gather = clamp((frame - last) / (GATHER.to - last)) ** 1.2;
  const flare = frame >= STAB ? 1 + 1.5 * Math.exp(-(frame - STAB) / 3) : 1;
  return {
    r: lerp(30 + 40 * smoothstep(0, 6, t) + 50 * smoothstep(RESUME, GATHER.from, frame), 0.985 * EARTH_R, gather),
    heat: 1 - 0.25 * FILL.reduce((s, at) => s + launch(frame, at, { tau: 1.5, bounce: 0 }), 0),
    flare,
    light: flare * lerp(1, 0.6, smoothstep(RESUME, RESUME + 6, frame)),
  };
}

/** The flat parts of cosmos bar 1 (in the sun's plane, seen by the 3D camera): the Riso sun of S12's last frame swelling and fading as it bursts, and a cream shockwave. */
export function burstFlat(frame: number): FlatContent {
  const under: Shape[] = [];
  const t = frame - BURST;
  if (t < 4) {
    const k = clamp(t / 4);
    const yellow = multiplyRGB(RISO_PAPER, PLATE.yellow);
    const core = multiplyRGB(yellow, PLATE.pink);
    under.push({ kind: 'ellipse', x: ORIGIN[0], y: ORIGIN[1], w: 2 * SUN.endR * (1 + 0.8 * k), h: 2 * SUN.endR * (1 + 0.8 * k), color: yellow, alpha: 1 - k });
    under.push({ kind: 'ellipse', x: ORIGIN[0], y: ORIGIN[1], w: 2 * SUN.endCore * (1 + 0.8 * k), h: 2 * SUN.endCore * (1 + 0.8 * k), color: core, alpha: 1 - k });
  }
  if (t > 0 && t < 14) {
    const ring = SUN.endR + 1500 * launch(frame, BURST, { tau: 3, bounce: 0 });
    under.push({ kind: 'ring', x: ORIGIN[0], y: ORIGIN[1], w: 2 * ring, h: 2 * ring, r: 30 * (1 - t / 14), color: scaleRGB(SPACE.pearl, 1.8), alpha: 1 - t / 14 });
  }
  return { under, glyphs: {}, over: [] };
}

/** The background: the Riso paper on the drop's first instant, then black space. */
export const burstPaper = (frame: number): RGB => (frame < BURST + 0.5 ? RISO_PAPER : SPACE_BLACK);
