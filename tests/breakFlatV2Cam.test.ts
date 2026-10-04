// v2 of the flat bars (break 2–5), the travelling camera (src/shots/breakShared.ts flatCamV2; sheet notes/bid2/break-sheet2.md §6.1,
// the design's §3.10): it takes over v04's push exactly on 2.1, hits the design's keys, never rolls, locks the POV about his ω, ends on C6's
// size match — and it keeps the energy standard (fast moves sampled, never still for more than 12 frames, no snap but where the sheet cuts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLAT, POV, STUTTER, STUTTER_END, WIPE_COVER, LOCK, SIZE_EASE } from '../src/score/break.ts';
import { partFrame } from '../src/score/film.ts';
import { DEPTH, FLAT_V2, HERO_EM, HERO_STYLE, POV_AIMS, POV_V2, PUSH_EYE_X, breakCam, camPose, depthZoom, flatCam, flatCamV2, fromDepth, toScreen } from '../src/shots/breakShared.ts';
import { INK_EM, eyesAt, restPlacement } from '../src/shots/breakHero.ts';
import { rigAt } from '../src/score/energy.ts';
import { flatTemporal } from '../src/shots/breakWorld.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, onShutter, poseMoved, screenMove } from './lib/energyAudit.ts';

const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);
const b2 = at(2);
const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const key = (f: number, zoom: number, cx: number, cy: number, eps = 1e-6) => {
  const c = flatCamV2(f);
  near(c.zoom, zoom, eps, `zoom on +${f - partFrame('break', 1)}`);
  near(c.cx, cx, eps * 100, `cx on +${f - partFrame('break', 1)}`);
  near(c.cy, cy, eps * 100, `cy on +${f - partFrame('break', 1)}`);
};

test('the switch: v2 is on in the film; flatCam(f, false) is v04’s breakCam exactly (the identity layer)', () => {
  assert.equal(FLAT_V2, true);
  for (let f = FLAT.from; f < FLAT.to; f += 7.25) assert.deepEqual(flatCam(f, false), breakCam(f));
  for (let f = FLAT.from; f < FLAT.to; f += 7.25) assert.deepEqual(flatCam(f), flatCamV2(f));
});

test('2.1: the v2 camera takes over the fall’s push without a step (zoom 1.043 about (960, 560))', () => {
  const v = flatCamV2(b2);
  const o = breakCam(b2);
  assert.deepEqual([v.zoom, v.cx, v.cy, v.roll], [o.zoom, o.cx, o.cy, o.roll]);
  near(v.zoom, 1.043, 1e-9, 'zoom');
});

test('the design’s keys: the eye (1.30 about (790, 510) by +140; C.x 680 before keep-fixer round 2), back out, the follow up and down, the floor, wide and low, the crash zoom, the pull back, the pull-out, the arc, the size match', () => {
  key(b2 + 44, 1.3, PUSH_EYE_X, 510);
  key(b2 + 50, 1.3, PUSH_EYE_X, 510);
  assert.equal(PUSH_EYE_X, 790);
  key(at(3), 1.12, 1000, 560);
  key(at(3, 2), 1.15, 760, 380);
  key(at(3, 2.5) - 1, 1.15, 760, 380);
  key(at(3, 3), 1.18, 960, 600);
  key(at(3, 3.5) - 1, 1.18, 960, 600);
  key(at(3, 4.5), 1.18, 960, 600);
  key(at(4) - 1, 1.18, 960, 600);
  key(at(4) + 12, 0.9, 1150, 640);
  key(at(4, 2.5), 0.9, 1050, 640);
  key(at(4, 2.5) + 6, 1.65, 1290, 560);
  key(at(4, 3) - 1, 1.65, 1290, 560);
  key(at(4, 3) + 12, 1.15, 980, 570);
  key(at(5) + 12, 1, 960, 540);
  key(at(5, 2.5), 1.04, 905, 540);
  key(at(5, 3), 1.04, 960, 540);
  key(at(5, 4.5), 1.06, 960, 540);
  key(at(5, 4.5) + 8, 0.85, 960, 540);
  key(at(6) - 1, 0.85, 960, 540);
  // The crash zoom is a 6-frame launch: three quarters of the way in 1.5 frames.
  const half = flatCamV2(at(4, 2.5) + 1.5);
  assert.ok(half.zoom > 0.9 + 0.7 * 0.75, `crash zoom at +1.5 f: ${half.zoom}`);
});

test('keep-fixer round 1 (F11 / SYNC-1): bar 3’s moves launch on the kicks — the ease back lands by +184 (still into 3.1), the follow-up launches on 3.1, the move onto the floor launches on 3.2& and settles by +234 (a hold before the 3.3 tilt)', () => {
  const pose = (f: number) => camPose(flatCamV2(f));
  const moved = (a: number, b: number) => screenMove(pose(a), pose(b));
  // The 8 frames before 3.1's kick are still (the ease back has landed): nothing moves the picture before the kick.
  for (let f = at(3) - 7; f <= at(3); f++) assert.ok(moved(f - 1, f) < 1e-6, `still on ${f - at(1)}: ${moved(f - 1, f).toFixed(3)} px`);
  // …and the ease back is soft at both ends (no snap on +150).
  assert.ok(moved(b2 + 54, b2 + 55) < 0.25 * moved(b2 + 64, b2 + 65), 'soft start');
  // 3.1: an L on the kick — the frame after it moves most, and three quarters of the launch's share are in by +3.
  const m = [1, 2, 3, 4, 5, 6].map((d) => moved(at(3) + d - 1, at(3) + d));
  assert.ok(m[0] > 0.5 * Math.max(...m) && m[1] >= Math.max(...m) * 0.9, `the launch: ${m.map((v) => v.toFixed(0)).join(' ')}`);
  const c3 = flatCamV2(at(3) + 3);
  assert.ok((1000 - c3.cx) / (1000 - 760) > 0.6, `follow-up 3 frames in: ${c3.cx.toFixed(0)}`);
  // It keeps drifting to the apex (a living hold, not a stop).
  assert.ok(moved(at(3) + 15, at(3) + 16) > 0.2, 'drifting');
  // 3.2&: the move onto the floor launches on the kick (L6) and settles by +234; +235 → +240 is still, so the tilt is the change on 3.3.
  assert.ok(moved(at(3, 2.5), at(3, 2.5) + 1) > 20, 'launched on 3.2&');
  for (let f = at(3, 2.5) + 7; f <= at(3, 3); f++) assert.ok(moved(f - 1, f) < 1e-6, `settled on ${f - at(1)}`);
});

test('keep-fixer round 2 (LOCK-CLIPPED): the push still tracks toward eye.L, and the IRIS LOCK (>ω<) is whole in frame, 5 % clear of both edges, from its first frame through the rig’s LOCK punch to the ease back', () => {
  // His lock face in world px: the ink of ">" … "<" at rest (INK_EM about the placements; the eyes draw at stretch 1.3, as neither is
  // wider than the × slot), plus the 8 px ink outline, and the (14, 14) hard shadow on the right.
  const x = restPlacement();
  const [eL, eR] = eyesAt(LOCK);
  assert.deepEqual([eL, eR], ['>', '<']);
  const left = x.eyeL + INK_EM[eL][0] * HERO_EM * 1.3 - HERO_STYLE.outline;
  const right = x.eyeR + INK_EM[eR][1] * HERO_EM * 1.3 + HERO_STYLE.outline + HERO_STYLE.shadow[0];
  near(left, 499, 2, 'the lock’s left edge (world)');
  near(right, 1435, 2, 'the lock’s right edge (world)');
  const margin = 0.05 * 1920;
  let peak = 0;
  for (let f = LOCK; f <= LOCK + 40; f += 0.5) {
    const c = flatCamV2(f);
    const z = rigAt(f).zoom; // the punch, about the frame's centre
    const sx = (wx: number): number => 960 + (toScreen(c, wx, 540)[0] - 960) * z;
    peak = Math.max(peak, z);
    assert.ok(sx(left) >= margin && sx(right) <= 1920 - margin, `+${f - at(1)}: the lock spans screen x ${sx(left).toFixed(0)}–${sx(right).toFixed(0)}`);
  }
  assert.ok(peak > 1.02, `the LOCK punch is inside the window: ${peak}`);
  // The push is still a push and track toward the eye: eye.L comes ≥ 100 px nearer the centre than on 2.1 and grows 1.25×, and it
  // ends left of centre (the lock's mass is on the right, the torn work orders flutter on the left).
  const eye = POV_AIMS[2];
  const e0 = toScreen(flatCamV2(b2), eye[0], eye[1])[0];
  const e1 = toScreen(flatCamV2(b2 + 44), eye[0], eye[1])[0];
  assert.ok(e1 - e0 > 100 && e1 < 960 - 150, `eye.L on screen: ${e0.toFixed(0)} → ${e1.toFixed(0)}`);
  near(flatCamV2(b2 + 44).zoom / flatCamV2(b2).zoom, 1.3 / 1.043, 1e-6, 'the push’s zoom');
});

test('the camera never rolls in v2 (the floor tilts under a level camera; his wobble replaces the sway)', () => {
  for (let f = FLAT.from; f < FLAT.to; f += 0.5) assert.equal(flatCamV2(f).roll, 0, `roll on ${f}`);
});

test('the POV: ×1.08 about his ω (it holds its pixel through the scan-wipe), robotic 2-frame snaps toward the bracket and eye.L, frozen with the stutter', () => {
  const pre = flatCamV2(POV.from - 1);
  const w = POV_AIMS[0];
  const s0 = toScreen(pre, w[0], w[1]);
  for (let f = POV.from; f < POV_V2.steps[1]; f += 0.5) {
    const s = toScreen(flatCamV2(f), w[0], w[1]);
    near(Math.hypot(s[0] - s0[0], s[1] - s0[1]), 0, 1e-6, `ω on ${f}`);
  }
  near(flatCamV2(POV.from + 3).zoom, pre.zoom * 1.08, 1e-9, 'locked in after the sweep');
  // Each step is a 2-frame snap, then still until the next.
  const a = flatCamV2(POV_V2.steps[1] + 2);
  assert.deepEqual(flatCamV2(POV_V2.steps[1] + 5), a);
  assert.ok(Math.abs(a.cx - flatCamV2(POV_V2.steps[1] - 1).cx) > 10, 'the step toward the bracket moves the aim');
  for (let f = STUTTER[0]; f < STUTTER_END; f += 1) assert.deepEqual(flatCamV2(f), flatCamV2(STUTTER[0]), `frozen in the stutter on ${f}`);
  // C3: the hard cut back to the floor framing.
  key(STUTTER_END, 1.18, 960, 600);
});

test('C6’s size match: 5.4& eases Z 1.06 → 0.85 and C.x → 960 (cubic in-out over 8 frames) so his apparent em is 414 × 0.85 = 351.9 and his ω sits on (960, 540)', () => {
  const c = flatCamV2(at(6) - 1);
  near(414 * c.zoom, 351.9, 0.01, 'apparent em');
  const [x, y] = toScreen(c, 960, 540);
  assert.deepEqual([x, y], [960, 540]);
  assert.equal(SIZE_EASE, at(5, 4.5));
  // In-out: slow at both ends of the ease.
  const d0 = flatCamV2(SIZE_EASE + 1).zoom - flatCamV2(SIZE_EASE).zoom;
  const d1 = flatCamV2(SIZE_EASE + 4.5).zoom - flatCamV2(SIZE_EASE + 3.5).zoom;
  assert.ok(Math.abs(d0) < Math.abs(d1) / 3, 'in-out');
});

test('ruling R-F2, the lateral arc swings out and back (5.1& → 5.3): centred for the wave, the guest and the ripple, the built cat and his widest face stay in frame under the rig’s +4 % punch', () => {
  // World extents measured on the v04 master (as built): the cat's right edge, the dancer's left edge (5.3), (*≧ω≦*)'s span (5.4).
  // In frame (8 px clear), or no further out than the as-built frame put it (v04 zoomed 1 → 1.08 over bar 5 at C.x 960: its punch on 5.3
  // touched the cat's ear by 10 px for a frame or two, as built).
  const inFrame = (f: number, x0: number, x1: number, punch: number, msg: string) => {
    const c = flatCamV2(f);
    const o = breakCam(f);
    for (const x of [x0, x1]) {
      const sx = 960 + (toScreen(c, x, 540)[0] - 960) * (1 + punch);
      const ox = 960 + (toScreen(o, x, 540)[0] - 960) * (1 + punch);
      assert.ok(sx >= Math.min(8, ox - 1) && sx <= Math.max(1912, ox + 1), `${msg} on +${f - at(1)}: world x ${x} → screen ${sx.toFixed(1)} (v04 ${ox.toFixed(1)})`);
    }
  };
  for (let f = at(5, 3); f < at(5, 4); f += 0.5) inFrame(f, 81, 1858, 0.04, 'the dancers and the cat');
  for (let f = at(5, 4); f < at(5, 4.5); f += 0.5) inFrame(f, 153, 1804, 0.04, 'the ripple face');
  // It does swing: out to the left under the blink and the fan, back on 5.3's kick.
  assert.ok(flatCamV2(at(5, 2.5)).cx < 910 && flatCamV2(at(5, 2.25)).cx < 940, 'out');
  near(flatCamV2(at(5, 3)).cx, 960, 1e-9, 'back on 5.3');
});

test('the hang freezes where the drift left it and sags 20 px with the picture (as built); the reset under the cover is tight (1.45), so 5.1 pulls out', () => {
  const h = flatCamV2(at(4, 4));
  const g = flatCamV2(at(4, 4) + 12);
  assert.deepEqual([g.zoom, g.cx, g.cy], [h.zoom, h.cx, h.cy]);
  assert.equal(g.dy, 20);
  near(flatCamV2(WIPE_COVER).zoom, 1.45, 1e-9, 'reset');
  near(flatCamV2(at(5)).zoom, 1.45, 1e-9, 'the pull-out starts from the reset');
});

test('depths: the back plane runs ≈ 0.77×, the front ≈ 1.24× at zoom 1; a front point drawn on the world plane lands where the plane would show it', () => {
  near(depthZoom(1, DEPTH.back), 0.773, 0.002, 'back');
  near(depthZoom(1, DEPTH.front), 1.244, 0.002, 'front');
  const c = flatCamV2(b2 + 30);
  const q = fromDepth(c, DEPTH.front, 700, 1015);
  const [sx] = toScreen(c, q.x, q.y);
  near(sx, 960 + depthZoom(c.zoom, DEPTH.front) * (700 - c.cx), 1e-6, 'front x on screen');
});

const cameraAt: CameraAt = (f) => ({ pose: camPose(flatCamV2(f)), samples: onShutter(f, flatTemporal(f, true)) });
/** The stutter (frozen by design), the POV's in and out (the scan-wipe and the hard cut back), the reset under the restart wipe's full cover. */
const skip = (f: number): boolean => (f >= STUTTER[0] && f <= STUTTER_END) || f === WIPE_COVER;

test('energy: every v2 frame moving more than 20 px gets ≥ 32 sub-frames', () => {
  assertFastMovesSampled(FLAT.from, FLAT.to, cameraAt, skip);
});

test('energy: the v2 camera with the rig never holds still for more than 12 frames', () => {
  assertNeverStill(FLAT.from, FLAT.to, poseMoved(cameraAt, skip));
});

test('the v2 shot camera never snaps but on the 2.3 nudge, the POV’s steps and its hard cut back, the stutter, the reset under the cover, and the crash zoom’s two launches (in on 4.2&, back out on the 4.3 clap)', () => {
  const allowed = (f: number) =>
    (f > LOCK - 1 && f <= LOCK + 1) || (f >= POV.from - 0.5 && f <= STUTTER_END + 0.5) || (f > WIPE_COVER - 1 && f <= WIPE_COVER + 0.5) || (f > at(4, 2.5) && f < at(4, 2.5) + 3) || (f > at(4, 3) && f < at(4, 3) + 3);
  // How far the picture moves in each quarter frame (the energy audit's measure: the aim's shift at the new zoom plus the zoom at the
  // frame's corner). A launch is fast in (75 % in 3 frames: up to ≈ 65 px a quarter frame on the 4.3 pull back) but it accelerates into
  // it; a snap is one quarter frame that moves far more than the quarter frames either side of it.
  const move = (f: number) => screenMove(camPose(flatCamV2(f - 0.25)), camPose(flatCamV2(f)));
  for (let f = FLAT.from + 0.5; f < FLAT.to - 0.25; f += 0.25) {
    if (allowed(f)) continue;
    const m = move(f);
    const around = Math.max(move(f - 0.25), move(f + 0.25));
    assert.ok(m < 25 || m < 2 * around, `the camera snaps ${m.toFixed(1)} px in a quarter frame at ${f} (neighbours ${around.toFixed(1)})`);
  }
});
