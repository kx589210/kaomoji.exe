// The flat part's camera against the energy standard (tests/lib/energyAudit.ts): fast moves are sampled enough to blur, the camera
// (shot camera + the rig) never holds still for more than 12 frames, and the shot camera never snaps except where the sheet cuts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLAT, STUTTER, STUTTER_END, WIPE_COVER, LOCK } from '../src/score/break.ts';
import { breakCam, camPose, toScreen } from '../src/shots/breakShared.ts';
import { flatTemporal } from '../src/shots/breakWorld.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, onShutter, poseMoved } from './lib/energyAudit.ts';

const at: CameraAt = (f) => ({ pose: camPose(breakCam(f)), samples: onShutter(f, flatTemporal(f)) });
/** The stutter (one sub-frame by design, the frame frozen) and the reset hidden under the restart wipe's full cover. */
const skip = (f: number): boolean => (f >= STUTTER[0] && f <= STUTTER_END) || f === WIPE_COVER;

test('the flat camera: every frame moving more than 20 px gets ≥ 32 sub-frames', () => {
  assertFastMovesSampled(FLAT.from, FLAT.to, at, skip);
});

test('the flat camera with the rig never holds still for more than 12 frames', () => {
  assertNeverStill(FLAT.from, FLAT.to, poseMoved(at, skip));
});

test('the shot camera never snaps but on the 22.3 nudge, the stutter and the reset under the wipe’s cover', () => {
  const allowed = (f: number) => (f > LOCK - 1 && f <= LOCK + 1) || (f >= STUTTER[0] - 0.5 && f <= STUTTER_END + 0.5) || (f > WIPE_COVER - 1 && f <= WIPE_COVER + 0.5);
  for (let f = FLAT.from + 0.25; f < FLAT.to; f += 0.25) {
    if (allowed(f)) continue;
    const a = breakCam(f - 0.25);
    const b = breakCam(f);
    const corner = Math.max(...([[0, 0], [1920, 0], [0, 1080], [1920, 1080]] as const).map(([x, y]) => {
      const p = toScreen(a, x, y);
      const q = toScreen(b, x, y);
      return Math.hypot(p[0] - q[0], p[1] - q[1]);
    }));
    assert.ok(corner < 12, `the camera jumps ${corner.toFixed(1)} px at ${f}`);
  }
});
