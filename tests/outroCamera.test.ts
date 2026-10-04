// The energy standard over the 5-bar ending (build sheet §11): every part's camera — the blue screen's push, the monitor's push, the
// iris's dolly, the stage's pull-back, push and dive, S01's flow — never holds exactly still for more than 12 frames, and nothing that
// moves fast across the frame prints copies (≥ 32 sub-frames). (The v04 ending's camera test moved here with the new parts.)
import { test } from 'node:test';
import * as O from '../src/score/outro.ts';
import { bluePose, blueTemporal } from '../src/shots/outroBlue.ts';
import { companyTemporal, stagePose } from '../src/shots/outroCompany.ts';
import { cursorPose, cursorTemporal } from '../src/shots/outroCursor.ts';
import { irisPose, irisTemporal } from '../src/shots/outroIris.ts';
import { monitorAperture, monitorTemporal } from '../src/shots/outroMonitor.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, poseMoved } from './lib/energyAudit.ts';

const camera: CameraAt = (f) => {
  const F = Math.round(f);
  if (f < O.LINE) return { pose: bluePose(f), samples: blueTemporal(F).samples };
  if (f < O.OPEN) return { pose: bluePose(O.ENTER), samples: monitorTemporal(F).samples };
  if (f < O.BURST) return { pose: irisPose(f), samples: irisTemporal(F).samples };
  if (f < O.SLAM.to) return { pose: stagePose(f), samples: companyTemporal(F).samples };
  return { pose: cursorPose(f), samples: cursorTemporal(F).samples };
};
const pushed = poseMoved(camera);
/** The monitor's picture moves by its own push and shapes (the aperture), not a camera. */
const monitorMoved = (f: number): boolean => JSON.stringify(monitorAperture(f)) !== JSON.stringify(monitorAperture(f - 1));

test('the ending is never still for more than 12 frames', () => {
  assertNeverStill(O.OUTRO_START + 1, O.LOOP, (f) => (f >= O.LINE && f < O.OPEN ? monitorMoved(f) : pushed(f)));
});

test('fast camera moves get ≥ 32 sub-frames (the slam 64)', () => {
  assertFastMovesSampled(O.OUTRO_START, O.LOOP, camera);
});
