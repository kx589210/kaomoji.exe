// The comic club INK's energy audit (build sheet notes/b58/club-sheet.md §14; review R14): the energy standard's two camera audits
// (tests/lib/energyAudit.ts) over the club's own frames, as tests/energyStandard.test.ts runs them from the intro through the cosmos and
// the break, drop 2 and the outro run them over theirs. The shot camera of every instant is its part's own (src/shots/clubInkA.ts for
// bars 1–3, src/shots/clubInkB.ts for bars 4–6, routed as the dispatcher routes it) and its photography is the dispatcher's
// (inkTemporal). Handled on their own: the seams where the camera changes world without moving the picture (the dive landing on the
// record, the crash zoom landing in the lens, the throw handing the diptych to the page) and the hard cuts; the lights-out's living hold
// (slow on purpose: alive, never fast); the glass beat (v04's static frame: only the rig's hit shake moves it).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pose } from '../src/engine/camera.ts';
import { aimPose } from '../src/motion/hit.ts';
import * as C from '../src/score/club.ts';
import { inkPartAt, inkTemporal } from '../src/shots/clubInk.ts';
import { inkAAim } from '../src/shots/clubInkA.ts';
import { camPose, barCam, incidentCam, lensCam, lensFrame, pageCam, tiltedPose } from '../src/shots/clubInkB.ts';
import { FOV, FRONT, type InkLayout, SCREEN } from '../src/shots/clubInkKit.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, fastFrames, onShutter, samePose, screenMove } from './lib/energyAudit.ts';

const advance = (ch: string): number => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6);
const L: InkLayout = { advance: { face: advance, sfx: advance, ui: advance, display: advance, mono: advance, readout: advance } };

/** The shot camera of instant `f`: the pose its part draws its world through (the rig's punches and shakes come on top). */
function cameraAt(f: number): Pose {
  const id = inkPartAt(f);
  if (id === 'splash' || id === 'record') return aimPose(inkAAim(f), FRONT, FOV);
  if (id === 'bar') return camPose(barCam(f, advance));
  // The lens's world pose (a slow drift): its own exported camera; the test below checks its frame draws the world through it.
  if (id === 'lens') return camPose(lensCam(f));
  // The throw's frame is whole: its early sub-frames (instants before THROW, routed to the incident) are drawn by the flight.
  if (id === 'incident' && Math.floor(f + 0.5) < C.THROW) return camPose(incidentCam(f));
  if (id === 'incident' || id === 'flight') return tiltedPose(pageCam(f));
  // The glass: v04's static frame (src/shots/glass.ts), no shot camera.
  return SCREEN;
}

test('the lens draws its world through lensCam (the camera the audit reads): its first world draw is posed by it', () => {
  for (let f = C.LENS; f < C.KICK_CUP; f += 0.5) {
    const world = lensFrame(f, L).map((d) => d.pose).find((p) => !samePose(p, SCREEN)) ?? SCREEN; // on LENS itself the drift is 0
    assert.ok(samePose(world, camPose(lensCam(f))), `${f}`);
  }
});

const at: CameraAt = (frame) => ({ pose: cameraAt(frame), samples: onShutter(frame, inkTemporal(frame)) });

/**
 * The output frames whose half-frame neighbours sit in different camera worlds: the hard cuts (club 4.1, 5.1, the hit) and the seams
 * where one part's camera hands over to the next with the picture continuous — the dive landing on the record (E5), the crash zoom
 * landing in the lens (E8) and the throw (E13: the instant THROW − ½ is already the page's). Each is checked on its own below.
 */
const SEAMS: readonly number[] = [C.RECORD, C.MATCH_CUP, C.LENS, C.KICK_CUP, C.THROW - 1, C.HIT];
const seam = (f: number): boolean => SEAMS.includes(f);
/** v04's throw: the long shutter as he launches (THROW … THROW + 13); the flight after it. */
const LAUNCH = { from: C.THROW, to: C.THROW + 14 } as const;

test('every frame of the club whose camera moves fast (> 20 px a frame) gets at least 32 sub-frames on its shutter, club 1.1 → the launch', () => {
  const fast = fastFrames(C.CLUB.from + 1, LAUNCH.to, at, seam);
  // The audit has something to audit: the pull-back, both leaps (the second a 3-frame swish since plan v07 §4 C2), the dive, the rise, the
  // tilt, the crash zoom, the grab's punch-in, the launch.
  assert.ok(fast.length > 100, `${fast.length} fast frames`);
  for (const [name, f] of [['PULL_BACK', C.PULL_BACK + 2], ['LEAPS[0]', C.LEAPS[0].from + 6], ['LEAPS[1]', C.LEAPS[1].from + 1], ['DIVE', C.DIVE.from + 6], ['RISE', C.RISE.from + 12], ['TILT', C.TILT.to - 4], ['CRASH_ZOOM', C.CRASH_ZOOM.from + 6], ['THROW', C.THROW + 2]] as const) {
    assert.ok(fast.some((m) => m.f === f), `${name} (${f}) moves fast`);
  }
  assertFastMovesSampled(C.CLUB.from + 1, LAUNCH.to, at, seam);
});

test('the seams: the dive’s and the crash zoom’s landing frames and the launch take the long photography; no sub-frame of a hard cut is audited across it', () => {
  for (const f of [C.RECORD, C.LENS]) assert.ok(at(f).samples >= 32, `${f}: ${at(f).samples} sub-frames`);
  for (let f = LAUNCH.from; f < LAUNCH.to; f++) assert.ok(at(f).samples >= 32, `the launch, ${f}: ${at(f).samples} sub-frames`);
  // The frame before the throw: its own shutter (≤ ±0.15 f) stays in the incident, so its picture does not cross the hand-over.
  const t = inkTemporal(C.THROW - 1);
  assert.ok(t.shutter / 2 < 0.5, `the frame before the throw keeps its shutter inside the incident (${t.shutter})`);
});

// R14 (fixed in round 1): the page slaps back on every recede hit (20–59 px a frame at the frame corner, THROW + 22 … HIT − 9), so
// flightTemporal photographs the whole flight on 32 sub-frames (the hero is taken at the output frame: only the page blurs).
test('the flight (the launch → the hit): every frame whose page camera moves fast gets at least 32 sub-frames on its shutter', () => {
  assertFastMovesSampled(LAUNCH.to, C.HIT, at, seam);
});

test('the lights-out is a living hold: the camera drifts 0.5–4 px a frame from the clap to the grab (alive, never fast, never still)', () => {
  for (let f = C.LIGHTS_OUT + 1; f < C.GRAB; f++) {
    const m = screenMove(cameraAt(f - 1), cameraAt(f));
    assert.ok(m >= 0.5 && m <= 4, `${f}: ${m.toFixed(2)} px a frame`);
  }
});

test('the camera, with the club’s punches and shakes, never holds exactly still for more than 12 frames, club 1.1 → break 1.1 (the glass on the rig’s hit shake alone)', () => {
  assertNeverStill(C.CLUB.from + 1, C.CLUB.to, (f) => seam(f) || !samePose(cameraAt(f - 1), cameraAt(f)));
  // The glass has no shot camera of its own: from the hit only the rig moves it, and its shake dies out within the beat.
  for (let f = C.HIT + 1; f < C.CLUB.to; f++) assert.ok(samePose(cameraAt(f - 1), cameraAt(f)), `${f}: the glass holds its frame`);
});
