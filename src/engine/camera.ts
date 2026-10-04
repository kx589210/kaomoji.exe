// Camera poses as plain numbers, so shot code stays pure and testable. The
// scene copies a Pose into a THREE.PerspectiveCamera.
export type Vec3 = readonly [number, number, number];
export type Pose = { position: Vec3; target: Vec3; up: Vec3; fov: number };

const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** Interpolates two poses; `up` is re-normalised. */
export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  position: mix3(a.position, b.position, t),
  target: mix3(a.target, b.target, t),
  up: norm(mix3(a.up, b.up, t)),
  fov: a.fov + (b.fov - a.fov) * t,
});

/** Looking straight at the point (x, y) of the z = 0 plane from `distance`. */
export const frontal = (distance: number, x = 0, y = 0, fov = 20): Pose => ({ position: [x, y, distance], target: [x, y, 0], up: [0, 1, 0], fov });

/** Height of the z = 0 plane visible from `distance` with a vertical field of view `fov` (degrees). */
export const visibleHeight = (distance: number, fov: number): number => 2 * distance * Math.tan((fov * Math.PI) / 360);

/** Distance at which a plane region `height` tall exactly fills the view. */
export const fillDistance = (height: number, fov: number): number => height / 2 / Math.tan((fov * Math.PI) / 360);
