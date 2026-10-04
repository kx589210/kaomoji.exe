// The energy standard's audits (spec §3.1 v2: a camera that keeps flowing plus
// beat accents, rare white flashes, every move on the 32nd-note grid, enough
// sub-frames wherever the camera moves fast), shared so that each section's
// own test file runs them over its own frames. tests/energyStandard.test.ts
// runs them from the intro through the cosmos part, tests/energy.test.ts holds
// Drop 1's own energy, and tests/break.test.ts, drop2.test.ts and
// outro.test.ts extend coverage from break 1.1 to the end. Not a test file itself (node --test picks up *.test.*).
import assert from 'node:assert/strict';
import type { Pose } from '../../src/engine/camera.ts';
import { type Temporal, temporalSamples } from '../../src/engine/temporal.ts';
import { coverZoom } from '../../src/engine/view.ts';
import { flashAt, rigAt } from '../../src/score/energy.ts';
import { FRAMES_PER_BEAT } from '../../src/score/tempo.ts';
import { FRONT } from '../../src/shots/swiss.ts';

/** A section's shot camera at output frame `frame` (may be fractional) and the sub-frames its scene puts on the shutter there. */
export type CameraAt = (frame: number) => { pose: Pose; samples: number };
/** Frames an audit leaves out (hard cuts, moves checked on their own). */
export type Skip = (frame: number) => boolean;
const never: Skip = () => false;

/** Sub-frames on the shutter itself: a phosphor tail's samples show the past (at the shutter-open camera), not the move. */
export const onShutter = (frame: number, t: Temporal): number => temporalSamples(frame, t).filter((s) => s.frame >= frame - t.shutter / 2 - 1e-9).length;

/** How far the picture moves between two frontal poses, in screen px at 1080p: the aim's shift at the new zoom plus the zoom's change at the frame's corner. */
export const screenMove = (a: Pose, b: Pose): number => {
  const depth = (p: Pose) => Math.hypot(p.position[0] - p.target[0], p.position[1] - p.target[1], p.position[2] - p.target[2]);
  const za = FRONT / depth(a);
  const zb = FRONT / depth(b);
  return Math.hypot(b.target[0] - a.target[0], b.target[1] - a.target[1]) * zb + 1100 * Math.abs(Math.log(zb / za)) + 1100 * Math.abs(Math.atan2(b.up[0], b.up[1]) - Math.atan2(a.up[0], a.up[1]));
};

/** Two poses exactly the same (a 3D camera that has not moved). */
export const samePose = (a: Pose, b: Pose): boolean => a.fov === b.fov && [0, 1, 2].every((i) => a.position[i] === b.position[i] && a.target[i] === b.target[i] && a.up[i] === b.up[i]);

/** The instants in [a, b), searched in eighths of a frame, at which `value` differs from its value an eighth of a frame before. */
export function changes<T>(a: number, b: number, value: (f: number) => T): number[] {
  const out: number[] = [];
  let prev = value(a - 0.125);
  for (let f = a; f < b; f += 0.125) {
    const v = value(f);
    if (v !== prev) out.push(f);
    prev = v;
  }
  return out;
}

export type FastFrame = { f: number; move: number; samples: number };
/** The frames in [a, b) (but `skip`'s) whose camera moves more than 20 px across the frame, with the sub-frames on their shutter. */
export const fastFrames = (a: number, b: number, at: CameraAt, skip: Skip = never): FastFrame[] =>
  Array.from({ length: b - a }, (_, i) => a + i)
    .filter((f) => !skip(f))
    .map((f) => ({ f, move: screenMove(at(f - 0.5).pose, at(f + 0.5).pose), samples: at(f).samples }))
    .filter((m) => m.move > 20);

/** Every frame in [a, b) whose camera moves more than 20 px gets at least `min` sub-frames on its shutter (so it blurs instead of printing copies). */
export function assertFastMovesSampled(a: number, b: number, at: CameraAt, skip: Skip = never, min = 32): void {
  for (const m of fastFrames(a, b, at, skip)) assert.ok(m.samples >= min, `frame ${m.f}: ${m.move.toFixed(0)} px a frame on ${m.samples} sub-frames`);
}

/** Whether the shot camera moved from frame f − 1 to f (a skipped frame counts as moving): the `moved` of assertNeverStill for a frontal shot. */
export const poseMoved =
  (at: CameraAt, skip: Skip = never) =>
  (f: number): boolean =>
    skip(f) || !(screenMove(at(f - 1).pose, at(f).pose) < 1e-9);

/**
 * The camera — the film's rig (punches and shakes, src/score/energy.ts) together with the shot's own camera, `moved(f)` (from f − 1 to
 * f) — never holds exactly still for more than `max` frames in a row over the integer frames [a, b).
 */
export function assertNeverStill(a: number, b: number, moved: (f: number) => boolean, max = 12): void {
  let still = 0;
  for (let f = a; f < b; f++) {
    const rig = rigAt(f);
    const quiet = rig.zoom === 1 && rig.x === 0 && rig.y === 0 && rig.roll === 0 && !moved(f);
    still = quiet ? still + 1 : 0;
    assert.ok(still <= max, `still since ${f - still}`);
  }
}

/**
 * Over [a, b) (searched in quarter frames) no edge of the frame ever shows and no punch or shake snaps in or out: the rig is continuous
 * at every instant but the `cuts` (a hard cut where a shake stops dead, Accent.until).
 */
export function assertRigContinuous(a: number, b: number, cuts: readonly number[] = []): void {
  for (let f = a; f < b; f += 0.25) {
    if (cuts.includes(f)) continue;
    const [p, v, n] = [rigAt(f - 1e-6), rigAt(f), rigAt(f + 1e-6)];
    assert.ok(coverZoom(v) <= v.zoom + 1e-9, `an edge shows at ${f}`);
    assert.ok(Math.abs(n.zoom - p.zoom) < 1e-5, `the zoom snaps by ${(n.zoom - p.zoom).toExponential(2)} at ${f}`);
    assert.ok(Math.abs(n.x - p.x) < 1e-3 && Math.abs(n.y - p.y) < 1e-3, `the frame snaps by (${(n.x - p.x).toFixed(4)}, ${(n.y - p.y).toFixed(4)}) px at ${f}`);
    assert.ok(Math.abs(n.roll - p.roll) < 1e-6, `the roll snaps at ${f}`);
  }
}

/** White flashes are rare: over the output frames [a, b), anything but the `whites` (and the 8 frames each takes to die) is at most a bump below `bump`. */
export function assertFlashesRare(a: number, b: number, whites: readonly number[] = [], bump = 0.5): void {
  for (let f = a; f < b; f++) {
    if (whites.some((w) => f >= w && f < w + 8)) continue;
    assert.ok(flashAt(f) < bump, `only a bump at ${f}: ${flashAt(f)}`);
  }
}

/** The peak zoom of the punch a hit on `k` sets off. */
export const peak = (k: number): number => Math.max(...[0.5, 1, 1.5, 2, 3].map((d) => rigAt(k + d).zoom));
/** How hard the frame is jolted at instant `f` (px a frame): the jump in its screen velocity across the instant. A shake starting there jolts it; one already running does not. */
export const jolt = (f: number, h = 1e-3): number => {
  const [a, b, c] = [rigAt(f - h), rigAt(f), rigAt(f + h)];
  return Math.hypot((c.x - b.x) / h - (b.x - a.x) / h, (c.y - b.y) / h - (b.y - a.y) / h);
};
/** How far the frame is shaken off centre over [a, b): the largest and the RMS offset (px). */
export const sway = (a: number, b: number): { max: number; rms: number } => {
  let max = 0;
  let sum = 0;
  let n = 0;
  for (let f = a; f < b; f += 0.25) {
    const v = rigAt(f);
    max = Math.max(max, Math.hypot(v.x, v.y));
    sum += v.x * v.x + v.y * v.y;
    n++;
  }
  return { max, rms: Math.sqrt(sum / n) };
};

/** Field names that hold a frame in an exported array of objects (accents, landings, windows): the others (amounts, sizes) are not frames. */
const FRAME_FIELDS = ['at', 'from', 'to', 'until'] as const;

/**
 * Every frame a score module exports, named `<label> <export>…`: numbers; the elements of number arrays and of arrays of [from, to]
 * pairs; every numeric field of a plain object ({ from, to } windows, Drop 1's LEVELS); and the at / from / to / until fields of an
 * array of objects (EnergyAccent lists). Functions and strings are skipped.
 */
export function scoreFrames(label: string, module: object): [string, number][] {
  const out: [string, number][] = [];
  for (const [k, v] of Object.entries(module)) {
    if (typeof v === 'number') out.push([`${label} ${k}`, v]);
    else if (Array.isArray(v)) {
      v.forEach((e: unknown, i) => {
        if (typeof e === 'number') out.push([`${label} ${k}[${i}]`, e]);
        else if (Array.isArray(e)) {
          e.forEach((f: unknown, j) => {
            if (typeof f === 'number') out.push([`${label} ${k}[${i}][${j}]`, f]);
          });
        }
        else if (e && typeof e === 'object') for (const p of FRAME_FIELDS) if (typeof (e as Record<string, unknown>)[p] === 'number') out.push([`${label} ${k}[${i}].${p}`, (e as Record<string, number>)[p]]);
      });
    } else if (v && typeof v === 'object') for (const [p, f] of Object.entries(v)) if (typeof f === 'number') out.push([`${label} ${k}.${p}`, f]);
  }
  return out;
}

/** Every named frame lands on the 32nd-note grid (a multiple of 3 frames). */
export function assertOnGrid(frames: readonly (readonly [string, number])[]): void {
  const T32 = FRAMES_PER_BEAT / 8;
  for (const [name, f] of frames) assert.equal(f % T32, 0, `${name} on ${f}`);
}
