import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pose } from '../src/engine/camera.ts';
import { KOSMOS_FIELDS } from '../src/scenes/kosmos.ts';
import { LEVELS } from '../src/score/drop1.ts';
import { ORIGIN, coreAt } from '../src/shots/burst.ts';
import type { CardCamera, CardLayout } from '../src/shots/kosmos.ts';
import { bodies, localCards, skyCards, voyageCamera } from '../src/shots/voyage.ts';

type V3 = readonly [number, number, number];
const FACES: CardLayout = { aspect: () => 2, quadPerEm: 1.25, faces: Array.from({ length: 97 }, (_, i) => `face${i}`) };
function cardCamera(p: Pose): CardCamera {
  const f = [p.target[0] - p.position[0], p.target[1] - p.position[1], p.target[2] - p.position[2]];
  const fl = Math.hypot(f[0], f[1], f[2]);
  const fw = [f[0] / fl, f[1] / fl, f[2] / fl];
  const r = [fw[1] * p.up[2] - fw[2] * p.up[1], fw[2] * p.up[0] - fw[0] * p.up[2], fw[0] * p.up[1] - fw[1] * p.up[0]];
  const rl = Math.hypot(r[0], r[1], r[2]);
  const right = [r[0] / rl, r[1] / rl, r[2] / rl] as const;
  const up = [right[1] * fw[2] - right[2] * fw[1], right[2] * fw[0] - right[0] * fw[2], right[0] * fw[1] - right[1] * fw[0]] as const;
  return { eye: p.position, right, up };
}
/** Whether the segment from the eye to `p` passes through the sphere (centre `c`, radius `r`) before reaching `p`: `p` is hidden behind it. */
function behind(eye: V3, p: V3, c: V3, r: number): boolean {
  const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const u = [d[0] / len, d[1] / len, d[2] / len];
  const oc = [eye[0] - c[0], eye[1] - c[1], eye[2] - c[2]];
  const b = oc[0] * u[0] + oc[1] * u[1] + oc[2] * u[2];
  const disc = b * b - (oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - r * r);
  if (disc <= 0) return false;
  const t = -b - Math.sqrt(disc);
  return t > 0 && t < len;
}

test('stars of the far sky and of the arm lie behind Earth’s dark body on screen, so draw order alone cannot hide them', () => {
  let sky = 0;
  let arm = 0;
  // Frames on Earth (cosmos bar 2 and the start of bar 3), from its arrival.
  for (const f of [2, 42, 82, 112].map((k) => LEVELS.earth + k)) {
    const pose = voyageCamera(f);
    const cam = cardCamera(pose);
    const px = 1080 / (2 * Math.tan((pose.fov * Math.PI) / 360));
    const earth = bodies(f, coreAt(f)).earth.r;
    sky += skyCards(FACES, f, cam, px, 2e5, 1).filter((c) => behind(cam.eye, c.centre, ORIGIN, earth)).length;
    arm += localCards(FACES, f, cam, px, 1).filter((c) => behind(cam.eye, c.centre, ORIGIN, earth)).length;
  }
  assert.ok(sky > 0 && arm > 0, `${sky} sky stars and ${arm} arm cards behind Earth`);
});

test('every field that reaches beyond the Big Bang’s pieces and the dark bodies is hidden by them (depth-tested); the faces on Earth’s surface and the falling meteors are not', () => {
  const by = new Map<string, { behind: boolean }>(KOSMOS_FIELDS.map((f) => [f.name, f]));
  for (const name of ['sky', 'galaxies', 'dust', 'spikes', 'local', 'motes']) assert.equal(by.get(name)?.behind, true, `${name} depth-tests`);
  // Billboards standing on the surface (the rim of air) or landing on it (meteors) would be clipped by the body just under them.
  for (const name of ['solid', 'front', 'flight']) assert.equal(by.get(name)?.behind, false, `${name} draws over the body`);
  assert.equal(KOSMOS_FIELDS.length, 9, 'all nine fields are listed');
  assert.equal(new Set(KOSMOS_FIELDS.map((f) => f.name)).size, 9);
});
