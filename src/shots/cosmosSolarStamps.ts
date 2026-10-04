// Renderer B's landing on Earth's ring at cosmos 3.1 and the A → B contract of E10 → E11 (build sheet notes/bcos/sheet.md §6.3;
// design notes/cosmos3/final.md §4 bar 17, 1536): a LEAF module (it imports only the score), so renderer A's Earth
// (src/shots/cosmosEarth.ts) can import `stampSlots()` without an import cycle (src/shots/cosmosSolar.ts imports A's stamp layout).
//
// The landing camera is the design's: on Earth's ring (r 1.75), 0.35 above the ecliptic, looking at the Sun with the Sun turned to the
// left third (≈ 520 px across, cropped by the left edge), FOV 70° across the frame. Earth sits on its ring 85° round from the camera, at
// the right third, level with the Sun (the subject opposite the Sun, the rings arcing between them); the six drag-trail stamps' slots run
// on along the ring from Earth toward the frame's centre (the trail Earth was dragged along, laid onto its orbit). The camera primitives (a pinhole in three.js's convention: y up, looking down its −z)
// live here too; cosmosSolar re-exports them. World units are the design's (Earth's ring r 1.75, the Sun at the origin, the ecliptic
// y = 0; a ring point at angle a is (r cos a, 0, −r sin a)). Screen positions are 1080p px from the frame centre, y up.
// Plain Node loads this file (tests): no three / remotion / react imports.
import { ORBIT_LAND } from '../score/cosmos.ts';

export type V3 = readonly [number, number, number];
const D2R = Math.PI / 180;

/** The landing lens: 70° across the frame (the design's FOV 70°; the prototype's focal 1371 px at 1080p). */
export const FOCAL = 1371;
/** Its vertical field of view (degrees), for THREE.PerspectiveCamera. */
export const FOV_Y = (2 * Math.atan(540 / FOCAL)) / D2R;

/** A camera: its eye, its unit forward, right and up (right = forward × up, as three.js's lookAt), its focal length (px at 1080p). */
export type Cam = { eye: V3; fwd: V3; right: V3; up: V3; focal: number };

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A camera at `eye` looking along `fwd`, its picture upright to `up` (three.js's lookAt basis). */
export function lookAlong(eye: V3, fwd: V3, up: V3 = [0, 1, 0], focal = FOCAL): Cam {
  const f = norm(fwd);
  const right = norm(cross(f, up));
  return { eye, fwd: f, right, up: cross(right, f), focal };
}

/** Where `p` lands on screen (1080p px from the centre, y up), how many px a world unit is there (`k`) and its depth; null behind the lens. */
export function project(cam: Cam, p: V3, near = 0.02): { x: number; y: number; k: number; z: number } | null {
  const d = sub(p, cam.eye);
  const z = dot(d, cam.fwd);
  if (z < near) return null;
  const k = cam.focal / z;
  return { x: dot(d, cam.right) * k, y: dot(d, cam.up) * k, k, z };
}

/**
 * A camera on a circle round the Sun: at azimuth `psi` (radians, a ring point's angle), `r` from the Sun's axis and `h` over the
 * ecliptic, looking at the Sun but turned `yaw` radians to the right of it (the Sun moves left on screen) and pitched `pitch` radians
 * up from the line to the Sun.
 */
export function orbitCam(psi: number, r: number, h: number, yaw: number, pitch = 0, focal = FOCAL): Cam {
  const eye: V3 = [r * Math.cos(psi), h, -r * Math.sin(psi)];
  // The horizontal direction to the Sun, and the camera's right in the ecliptic (forward × up).
  const hd: V3 = [-Math.cos(psi), 0, Math.sin(psi)];
  const right: V3 = [-hd[2], 0, hd[0]];
  const fh: V3 = [Math.cos(yaw) * hd[0] + Math.sin(yaw) * right[0], 0, Math.cos(yaw) * hd[2] + Math.sin(yaw) * right[2]];
  const el = Math.atan2(-h, r) + pitch;
  return lookAlong(eye, [fh[0] * Math.cos(el), Math.sin(el), fh[2] * Math.cos(el)], [0, 1, 0], focal);
}

/** The landing pose (cosmos 3.1, settled): on Earth's ring, 0.35 up, the Sun turned 27° to the left (its centre ≈ 680 px left). */
export const LAND = { psi: -100 * D2R, r: 1.75, h: 0.35, yaw: 27 * D2R } as const;
/** The camera of the landing (cosmos 3.1, the whip's rebound not yet begun): B's camera on ORBIT_LAND.at is exactly this. */
export const landingCamera = (): Cam => orbitCam(LAND.psi, LAND.r, LAND.h, LAND.yaw);

/** Earth's ring and where Earth (his globe: the first globe card of the ring) stands on it on 3.1: 85° round from the camera. */
export const EARTH_RING = { r: 1.75, at: LAND.psi + 85 * D2R } as const;
/**
 * The six stamps' slots on Earth's ring, 0.12 rad apart (prototype initStamps' spacing), from the trail's first stamp (the farthest,
 * 0.72 rad round from Earth) to its last (next to Earth): they run on from Earth toward the frame's centre.
 */
export const STAMP_ANGLES: readonly number[] = Array.from({ length: 6 }, (_, k) => (6 - k) * 0.12);
/** Slot `k`'s point on Earth's ring on 3.1 (Earth's angle plus STAMP_ANGLES[k]). */
export const landingSlot = (k: number): V3 => {
  const a = EARTH_RING.at + STAMP_ANGLES[k];
  return [EARTH_RING.r * Math.cos(a), 0, -EARTH_RING.r * Math.sin(a)];
};

/**
 * THE A → B CONTRACT (sheet §6.3): where the six crisp Ctrl+V stamps of the whip's drag trail sit on cosmos 3.1, in 1080p px from the
 * frame centre, y up, from the first stamped to the last: six slots on Earth's ring next to Earth, seen by B's landing camera. A lands its
 * trail here (its last stamp exactly on slot 5; the prototype's layout puts the others on the way there); from 3.1 B shrinks each stamp
 * and glides it onto its slot riding the ring, fading as the ring's tiles paste over (E11).
 */
export function stampSlots(): [number, number][] {
  const cam = landingCamera();
  return STAMP_ANGLES.map((_, k) => {
    const p = project(cam, landingSlot(k))!;
    return [p.x, p.y];
  });
}
/** The instant the slots are seen (3.1): a re-export so a reader of this leaf needs nothing else. */
export const STAMP_SLOTS_AT = ORBIT_LAND.at;
