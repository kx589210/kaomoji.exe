// Break bar 6, GRAPH (new): the graph-editor rollercoaster — the pure model in src/shots/breakGraph.ts. Build sheet
// notes/bid2/break-sheet2.md §3 "Break 6 · GRAPH", §5 C6 / C7, §6.1–§6.4, §7.2, §11.3–§11.4; design notes/extend/interlude-final.md
// §3.6, §3.9–§3.11, §4.2, §10.4 (its widget's bar-32 code, notes/extend/iw/src/c.js, and ride.mjs). Part-local frames throughout:
// at(6) is break 6.1, design(2976) the same frame named on the 58-bar map.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO_FACES_V2 } from '../src/content/castBreak.ts';
import { SIGNATURE } from '../src/content/break.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { punch } from '../src/motion/hit.ts';
import * as BR from '../src/score/break.ts';
import { rigAt } from '../src/score/energy.ts';
import { partBar, partFrame, partStart } from '../src/score/film.ts';
import * as G from '../src/shots/breakGraph.ts';
import * as D from '../src/shots/breakGraphDraw.ts';
import { GRAPH_HERO_STRINGS, GRAPH_MONO_STRINGS } from '../src/shots/breakGraphDraw.ts';
import { selectChip, selectMarquee } from '../src/shots/breakDefender.ts';
import { faceCore } from '../src/shots/breakHero.ts';
import { GROUND_SPEED, GROUND_STREAKS, slingState } from '../src/shots/breakLaunch.ts';
import { BREAK_PALETTE, camPose, flow, fromEngine, lSegment, toEngine, toScreen } from '../src/shots/breakShared.ts';
import { BreakScene } from '../src/scenes/break.ts';
import { BreakGraph, GRAPH_CAPACITY } from '../src/scenes/breakGraph.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, onShutter, poseMoved, screenMove } from './lib/energyAudit.ts';

const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);
const design = (f: number): number => partStart('break') + f - 2496;
const G0 = BR.GRAPH.from;
const G1 = BR.GRAPH.to;
/** Every instant of [a, b) at `step` (sub-frames included). */
const instants = (a: number, b: number, step = 0.125): number[] => Array.from({ length: Math.round((b - a) / step) }, (_, i) => a + i * step);
const near = (a: number, b: number, tol: number, what: string): void => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a.toFixed(3)} vs ${b.toFixed(3)} (±${tol})`);

/** His ω on screen at instant f under a rig zoom about the frame's centre (the break has no shakes: the rig is punches only). */
const withZoom = (s: readonly [number, number], z: number): [number, number] => [960 + (s[0] - 960) * z, 540 + (s[1] - 540) * z];
/** The design's rig in bar 6 (ACCENTS_V2), switched in when the launch is native: its zoom at instant f. */
const v2Zoom = (f: number): number => 1 + BR.ACCENTS_V2.reduce((z, a) => z + (a.punch ?? 0) * punch(f, a.at), 0);

// --- The track: keys, values, the signature --------------------------------------------------------------------------------------

test('ten keyframes on the bar’s drum hits, valued his signature E2 80 A2 20 CF 89 20 E2 80 A2; icons by drum (◆ kick, ⧗ clap, ● hat)', () => {
  assert.deepEqual(G.KEYS.map((k) => k.frame), [...BR.GRAPH_KEYS]);
  assert.deepEqual(G.KEYS.map((k) => k.byte), [...SIGNATURE]);
  assert.deepEqual(G.KEYS.map((k) => k.value), SIGNATURE.map((b) => parseInt(b, 16)));
  // The design's table (interlude-final §3.6): k1 K, k2 oh, k3 h, k4 K + C, k5 K, k6 oh, k7 K + C, k8 K, k9 K + oh, k10 K.
  assert.deepEqual(G.KEYS.map((k) => k.drums), [1, 4, 4, 3, 1, 4, 3, 1, 5, 1]);
  for (const k of G.KEYS) {
    if (k.drums & 1) assert.ok(BR.KICKS_V2.includes(k.frame), `◆ on a kick (${k.frame})`);
    if (k.drums & 2) assert.ok(BR.CLAPS_V2.includes(k.frame), `⧗ on a clap (${k.frame})`);
    if (k.drums & 4) assert.ok(BR.OPEN_HATS_V2.includes(k.frame) || BR.CLOSED_HATS_V2.includes(k.frame), `● on a hat (${k.frame})`);
    assert.equal(k.x, (k.frame - G0) * G.TRACK.pxPerFrame, 'world x = 24 px a frame from break 6.1');
  }
  assert.deepEqual(G.KEYS.map((k) => k.ease), ['inCubic', 'outQuad', 'inQuart', 'inOutSine', 'inSine', 'inCubic', 'outBack', 'outElastic', 'inBack', null]);
  for (const k of G.KEYS.slice(0, 9)) assert.equal(G.valueAt(k.frame), k.value, `the curve passes through k at ${k.frame}`);
});

test('the rail is his own y over time (980 − value × 3.6); his car rides it on two wheels and his ω sits on the car, 138 over the rail; a flat lead-in at 0xE2 comes from off-frame left', () => {
  assert.equal(G.TRACK.seat, 138, 'the design’s 150 lowered so his ω sits on the car’s top edge (sheet change log)');
  for (const f of instants(G0, G.YANK, 0.5)) {
    const x = G.playX(f);
    near(x, (G.rideT(f) - G0) * 24, 1e-9, `the playhead at ${f} (24 px a frame of ride time)`);
    near(G.railAtX(x), 980 - G.valueAt(G.rideT(f)) * 3.6, 1e-9, `railAtX at ${f}`);
    const c = G.carAt(f);
    near(c.x, G.carOnRail(x).x, 1e-9, `his car is the rail’s car at the playhead (${f})`);
    near(c.y, G.carOnRail(x).y, 1e-9, `his car y (${f})`);
    // His ω on the car's normal, (seat − lift) over its centre: upright in a level car, leaning with it on a drop or a climb.
    const [wx, wy] = G.omegaAt(f);
    near(Math.hypot(wx - c.x, wy - c.y), G.TRACK.seat - G.CAR.lift, 1e-6, `ω on the car at ${f}`);
    near(Math.atan2(wx - c.x, c.y - wy), c.th, 1e-6, `ω along the car’s normal at ${f}`);
    assert.ok(Math.abs(c.th) < (88 * Math.PI) / 180, `the car never stands past 88° (${((c.th * 180) / Math.PI).toFixed(1)}° at ${f})`);
  }
  // The wheels are on the rail: a car away from the valleys stands on the chord between two rail points 120 px of arc apart.
  for (const x of [800, 1300, 1600]) {
    const s0 = G.arcOfX(x);
    const a = G.xOfArc(s0 - G.CAR.wheel);
    const b = G.xOfArc(s0 + G.CAR.wheel);
    const th = Math.atan2(G.railAtX(b) - G.railAtX(a), b - a);
    near(G.carOnRail(x).th, th, 1e-9, `the chord at x ${x}`);
  }
  for (const x of [-1600, -800, -1]) near(G.railAtX(x), 980 - 226 * 3.6, 1e-9, `the lead-in at x ${x}`);
});

test('in a valley the car touches down: on k2 (6.1&) and the two bottoms (6.2, 6.4) it lies level on the rail point under the playhead, his ω 138 straight above it', () => {
  assert.deepEqual(G.VALLEYS.map((i) => G.KEYS[i].frame), [BR.RIDE.from, ...BR.BOTTOMS]);
  for (const i of G.VALLEYS) {
    const f = G.KEYS[i].frame;
    const c = G.carAt(f);
    const x = G.playX(f);
    near(c.th, 0, 1e-9, `level on ${f}`);
    near(c.x, x, 1e-9, `over the key on ${f}`);
    near(c.y, G.railY(f) - G.CAR.lift, 1e-9, `wheels on the rail on ${f}`);
    const [wx, wy] = G.omegaAt(f);
    near(wx, x, 1e-9, `ω x on ${f}`);
    near(wy, G.railY(f) - G.TRACK.seat, 1e-9, `ω y on ${f}`);
    // It flares in over the last 2 frames' travel (round 1 BOTTOM-SNAP: over 1.5 his ω swung 124 px in the frame into the first bottom)
    // and rocks back onto the chord over 5 frames: no jump.
    for (const d of [-2, 5]) near(G.touchAt(G.playX(f + d)), 0, 1e-9, `free of the valley at ${d} f`);
    for (let e = -2; e < 6; e += 0.125) {
      const a = G.omegaAt(f + e);
      const b = G.omegaAt(f + e + 0.125);
      assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) < 80, `ω moves < 80 px in an eighth of a frame at ${f} + ${e}`);
    }
  }
});

test('the two plunges bottom out exactly on the backbeats (k4, k7 = 0x20: K + C on break 6.2 and 6.4), descending all the way in', () => {
  assert.deepEqual(BR.BOTTOMS, [design(3000), design(3048)]);
  for (const [i, b] of BR.BOTTOMS.entries()) {
    near(G.valueAt(b), 0x20, 1e-9, `bottom ${i + 1}`);
    for (const d of [0.25, 0.5, 1, 2, 3, 4]) assert.ok(G.valueAt(b - d) > G.valueAt(b) && G.valueAt(b + d) > G.valueAt(b), `bottom ${i + 1} is the lowest point within ±${d}`);
    const p = BR.PLUNGES[i];
    const desc = instants(p.from, p.to, 0.25).map(G.valueAt);
    for (let j = 1; j < desc.length; j++) assert.ok(desc[j] <= desc[j - 1] + 1e-9, `plunge ${i + 1} only descends`);
  }
  // The easeOutBack spike overshoots k8 (0xE2) before settling on it; the crest k5 is the top of the lift hill.
  assert.ok(Math.max(...instants(BR.BOTTOMS[1], G.KEYS[7].frame).map(G.valueAt)) > 0xe2 + 10, 'the spike overshoots');
  assert.equal(G.valueAt(BR.CREST), 0xcf);
});

// --- C6: the selection carried across a hard cut --------------------------------------------------------------------------------

test('C6 on break 6.1: his ω on screen at (960, 540), apparent em 352 (5.4&’s 414 × 0.85 = 351.9: ×1.00), (⊙ω⊙), the marquee x 300–1620 y 250–830', () => {
  const c = G.graphCam(G0);
  near(c.omega[0], 960, 1e-9, 'ω x');
  near(c.omega[1], 540, 1e-9, 'ω y');
  const w = G.omegaAt(G0);
  const s = toScreen(c, w[0], w[1]);
  near(s[0], 960, 1e-6, 'ω x through toScreen');
  near(s[1], 540, 1e-6, 'ω y through toScreen');
  near(c.zoom, 1.6, 1e-9, 'Z 1.60');
  assert.equal(G.heroAt(G0).em, G.CUT_EM);
  const em = G.heroAt(G0).em * c.zoom;
  assert.ok(em / (414 * 0.85) >= 0.99 && em / (414 * 0.85) <= 1.01, `apparent em ${em} vs 351.9`);
  assert.equal(G.heroAt(G0).face, HERO_FACES_V2.seated);
  assert.equal(G.heroAt(G0 - 0.25).face, HERO_FACES_V2.seated, 'the cut frame’s first sub-frames too');
  const m = G.marqueeAt(G0);
  assert.ok(m, 'the marquee is up on the cut');
  assert.deepEqual([m.x0, m.y0, m.x1, m.y1].map((v) => Math.round(v * 1000) / 1000), [300, 250, 1620, 830]);
  assert.equal(m.alpha, 1);
  assert.deepEqual(G.SELECTION, { x0: 300, y0: 250, x1: 1620, y1: 830 });
  // The marquee shrinks with him (it keeps hugging his face) and folds away with T8 by 6.1&.
  const m3 = G.marqueeAt(G0 + 3)!;
  assert.ok(m3.x1 - m3.x0 < 1320 * 0.95, 'it shrinks with the reveal');
  assert.equal(G.marqueeAt(BR.SELECT_FOLD.to), null, 'gone by 6.1&');
});

test('the reveal: Z 1.60 → 0.80 (L) by 6.1&, his ω (960, 540) → (740, 434); at 6.1& the frame holds k1–k6', () => {
  const c = G.graphCam(BR.RIDE.from);
  near(c.zoom, 0.8, 1e-6, 'Z at 6.1&');
  near(c.omega[0], 740, 1e-6, 'ω x at 6.1&');
  near(c.omega[1], 434, 1e-6, 'ω y at 6.1&');
  // The design's centre (563, 500) at 2988 (C.y 12 lower: his seat is 12 px lower on the rail).
  near(c.cx, 563, 1, 'C.x');
  near(c.cy, G.omegaAt(BR.RIDE.from)[1] + (540 - 434) / 0.8, 1e-6, 'C.y');
  for (const k of G.KEYS.slice(0, 6)) {
    const [x, y] = toScreen(c, k.x, G.railY(k.frame));
    assert.ok(x > 96 && x < 1920 && y > 56 && y < 984, `k at ${k.frame} inside the editor’s window on 6.1& (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }
  // Monotone pull-back with one launch overshoot (L): never under 0.74, never back over 1.6.
  for (const f of instants(G0, BR.RIDE.from)) assert.ok(G.graphCam(f).zoom >= 0.74 && G.graphCam(f).zoom <= 1.6 + 1e-9);
});

// --- The ride camera ----------------------------------------------------------------------------------------------------------------

test('the ride camera keeps him in frame: ω screen y in [400, 720] on every instant 6.1 → the hidden cut he is drawn at, with today’s rig and with ACCENTS_V2', () => {
  // He is drawn at his group's instants (groupAt: a short shutter, or one sharp instant): what is on screen is his place at those.
  for (const f of instants(G0, G1)) {
    const s = G.graphCam(G.groupAt('hero', f)).omega;
    const today = rigAt(f);
    assert.equal(today.x, 0);
    assert.equal(today.y, 0);
    assert.equal(today.roll, 0);
    for (const [name, z] of [['today', today.zoom], ['v2', v2Zoom(f)]] as const) {
      const [, y] = withZoom(s, z);
      assert.ok(y >= 400 && y <= 720, `${name}: ω screen y ${y.toFixed(1)} at ${f}`);
    }
  }
  // The design's acceptance stills (sheet §11.3): 504 and 552 in [400, 720], 556 ≥ 400.
  for (const f of [at(6, 2), at(6, 4)]) assert.ok(G.graphCam(f).omega[1] >= 400 && G.graphCam(f).omega[1] <= 720);
  assert.ok(G.graphCam(at(6, 4) + 4).omega[1] >= 400);
});

test('the ride: x locked to the playhead (at screen x 740 ± 2) from 6.1& to the click on 6.4e — but in the ratchet’s holds, where he creeps ≤ 16 px ahead of the still camera — his ω leaning with his car about it; the bank is a spring, |roll| ≤ 9°, changing ≤ 3° a frame (on a notch, with it)', () => {
  const inNotch = (f: number) => G.NOTCHES.some((n) => f > n - G.RATCHET.lead && f <= n - G.RATCHET.lead + G.RATCHET.dur);
  for (const f of instants(BR.RIDE.from, G.CLICK_SNAP.from)) {
    const c = G.graphCam(f);
    const held = G.camT(f) !== G.rideT(f);
    if (held) assert.ok(c.head >= 740 - 1e-6 && c.head <= 756, `the playhead’s screen x at ${f} in a hold: ${c.head.toFixed(1)}`);
    else near(c.head, 740, 2, `the playhead’s screen x at ${f}`);
    assert.ok(c.omega[0] >= 560 && c.omega[0] <= 920, `ω screen x ${c.omega[0].toFixed(0)} at ${f}: he leans, never far`);
  }
  let prev = G.graphCam(G0).roll;
  for (const f of instants(G0, G1, 0.25).slice(1)) {
    const r = G.graphCam(f).roll;
    assert.ok(Math.abs(r) <= 9 + 1e-9, `|roll| ${r.toFixed(2)}° at ${f}`);
    // A notch carries the camera's ride time 2.5–6 frames in one: its bank turns with it (the crest's tip ≈ 5° in the kick's frame).
    assert.ok(Math.abs(r - prev) <= (inNotch(f) ? 3 : 0.75) + 1e-9, `roll step ${(r - prev).toFixed(3)}° in a quarter frame at ${f}`);
    prev = r;
  }
  assert.ok(Math.max(...instants(BR.RIDE.from, BR.RIDE.to, 1).map((f) => Math.abs(G.graphCam(f).roll))) > 3, 'it really banks');
  assert.equal(G.graphCam(G0).roll, 0);
  near(G.graphCam(BR.FLING).roll, 0, 1e-9, 'level again for the whip');
});

test('the camera hands the reveal to the ride without a jolt: the world keeps its speed across 6.1& (the spring starts where the reveal leaves it)', () => {
  const r = BR.RIDE.from;
  const centre = (f: number) => { const c = G.graphCam(f); return [c.cx, c.cy]; };
  const v = (a: number, b: number) => centre(b).map((x, i) => (x - centre(a)[i]) / (b - a));
  const before = v(r - 0.02, r - 0.01);
  const after = v(r + 0.01, r + 0.02);
  // ≤ 6 px a frame of difference: the valley's bounce turns his ω round on this key, and the clamp takes it within the frame.
  for (const i of [0, 1]) near(after[i], before[i], 6, `camera centre speed (axis ${i}) across 6.1& (px a frame)`);
});

test('the bottoms land low in the frame, and the world stops with him: no momentum carries the camera past him after the first bottom', () => {
  for (const b of BR.BOTTOMS) assert.ok(G.graphCam(b).omega[1] >= 640, `ω screen y ${G.graphCam(b).omega[1].toFixed(0)} on the bottom ${b}`);
  // The judge's ride.mjs: 710 on the bottom, ≈ 595 three frames on, ≈ 430 twelve on — a recoil, never a slam.
  for (let f = BR.BOTTOMS[0]; f < BR.BOTTOMS[0] + 14; f += 0.5) {
    const d = G.graphCam(f + 0.5).omega[1] - G.graphCam(f).omega[1];
    assert.ok(Math.abs(d) <= 30, `ω screen y moves ${d.toFixed(1)} px in half a frame at ${f}`);
  }
  near(G.graphCam(BR.BOTTOMS[0] + 12).omega[1], 430, 20, 'recoiled to the top of the clamp 12 f on');
});

test('the swing and the whip: from 6.4& the camera swings left ahead of him, then whips with him — ω within (1000 ± 150, 580 ± 60) from 6.4& + 3 to the hidden cut', () => {
  for (const f of instants(BR.SWING.to, G1)) {
    const [x, y] = G.graphCam(f).omega;
    assert.ok(Math.abs(x - 1000) <= 150 && Math.abs(y - 580) <= 60, `ω (${x.toFixed(0)}, ${y.toFixed(0)}) at ${f}`);
  }
  // Pure whip: the world streams past ≥ 100 px a frame on screen across the hidden cut's last frame.
  const c0 = G.graphCam(G1 - 1);
  const c1 = G.graphCam(G1 - 0.5);
  const p = [c0.cx, c0.cy] as const;
  assert.ok(Math.abs(toScreen(c1, p[0], p[1])[0] - toScreen(c0, p[0], p[1])[0]) / 0.5 >= 100, 'the world whips by');
  // The crash-in: his apparent size rises without a step from the kick and meets the sling side's whip tail across the hidden cut.
  const mine = (f: number) => G.RIDE_EM * G.graphCam(f).zoom;
  const theirs = slingState(BR.WHIP_CUT);
  const r = mine(G1 - 0.01) / (theirs.em * theirs.zoom);
  assert.ok(r >= 0.9 && r <= 1.1, `apparent em across C7: ${mine(G1 - 0.01).toFixed(0)} | ${(theirs.em * theirs.zoom).toFixed(0)}`);
  // v07 WP5: it leans in from the score's WHIP (from rest), at most × 1.31 a frame, and crosses the cut without a stop (at the sling
  // side's starting rate: its tail is an ease-out quad to the catch).
  near(mine(G.WHIP_LEAN), G.RIDE_EM, 1e-9, 'the crash-in starts at rest on the whip');
  near(G.WHIP_LEAN, BR.WHIP.from, 1e-9, 'the score’s whip');
  for (const f of instants(G.WHIP_LEAN, G1, 0.25).slice(1)) assert.ok(mine(f) > mine(f - 0.25), `the crash-in only closes in (${f})`);
  for (let f = G.WHIP_LEAN + 1; f < G1; f++) assert.ok(mine(f) / mine(f - 1) <= 1.31, `no pop: × ${(mine(f) / mine(f - 1)).toFixed(3)} at ${f}`);
  const rate = (a: number, b: number, z: (f: number) => number) => Math.log(z(b) / z(a)) / (b - a);
  const sling = (f: number) => slingState(f).em * slingState(f).zoom;
  const graphRate = rate(G1 - 0.02, G1 - 0.01, mine);
  const slingRate = rate(G1, G1 + 0.01, sling);
  assert.ok(Math.abs(graphRate - slingRate) / slingRate < 0.05, `no stop across C7: ${graphRate.toFixed(4)} | ${slingRate.toFixed(4)} a frame`);
  // He streaks left on screen at the sling side's whip speed band (its tail's 120, its streaks' 260) — the world past him, that is.
  for (const f of [G1 - 2, G1 - 1, G1 - 0.25]) {
    const c0 = G.graphCam(f - 0.01);
    const c1 = G.graphCam(f);
    const w = G.omegaAt(f);
    const v = (toScreen(c0, w[0], w[1])[0] - toScreen(c1, w[0], w[1])[0]) / 0.01;
    assert.ok(v <= -100 && v >= -300, `the world streams past him at ${(-v).toFixed(0)} px a frame (${f})`);
  }
  // He flies left the whole time from the fling.
  for (const f of instants(G.FLUNG, G1, 0.5).slice(1)) assert.ok(G.omegaAt(f)[0] < G.omegaAt(f - 0.5)[0], `he flies left at ${f}`);
});

test('the energy standard over the bar: ≥ 32 sub-frames wherever the camera moves > 20 px, 64 on the plunges and the whip, never still > 12 frames', () => {
  const cameraAt: CameraAt = (f) => ({ pose: camPose(G.graphCam(f)), samples: onShutter(f, G.graphTemporal(Math.round(f))) });
  assertFastMovesSampled(G0, G1, cameraAt);
  assertNeverStill(G0, G1, poseMoved(cameraAt));
  for (let f = G0; f < G1; f++) assert.ok(G.graphTemporal(f).samples >= 32, `≥ 32 at ${f}`);
  for (const f of [498, 503, 507, 546, 552, 555, 564, 570, 572].map((d) => G0 + d - 480)) assert.equal(G.graphTemporal(f).samples, 64, `64 at +${f - G0 + 480}`);
  assert.equal(G.graphTemporal(G0 + 30).samples, 32);
  // The whip really is fast: the camera moves well over 20 px a frame on its last frames.
  assert.ok(screenMove(camPose(G.graphCam(G1 - 2)), camPose(G.graphCam(G1 - 1))) > 100);
});

test('one segment from break 6.1 to the whip’s hidden cut: no sub-frame of the graph reaches into the slingshot or back into the flat world', () => {
  for (let f = G0; f < G1; f++) {
    assert.deepEqual(G.graphSegment(), { from: G0, to: G1 });
    for (const s of temporalSamples(f, G.graphTemporal(f), G.graphSegment())) assert.ok(s.frame >= G0 && s.frame < G1, `sub-frame ${s.frame} of ${f}`);
  }
  assert.equal(G1, BR.WHIP_CUT);
  assert.ok(BR.WHIP_CUT > BR.FLING && BR.WHIP_CUT < at(7));
});

// --- Him, the car, the train ------------------------------------------------------------------------------------------------------

test('his faces: seated (⊙ω⊙), arms up on 6.1a, the lift from the first chain click, airtime on the crest, arms up again, the rattle swapping every 3 f, rewound', () => {
  const F = HERO_FACES_V2;
  const face = (d: number) => G.heroAt(G0 + d).face;
  assert.equal(face(0), F.seated);
  assert.equal(face(5), F.seated);
  assert.equal(face(6), F.armsUp);
  assert.equal(face(29), F.armsUp);
  assert.equal(face(30), F.lift);
  assert.equal(face(47), F.lift);
  assert.equal(face(48), F.airtime);
  assert.equal(face(53), F.airtime);
  assert.equal(face(54), F.armsUp);
  assert.equal(face(77), F.armsUp);
  assert.deepEqual([78, 79, 80, 81, 82, 83].map(face), [F.rattle[0], F.rattle[0], F.rattle[0], F.rattle[1], F.rattle[1], F.rattle[1]]);
  assert.equal(face(84), F.rewound);
  assert.equal(face(92), F.rewound);
  for (let f = G0; f < G1; f++) assert.ok(/ω/u.test(G.heroAt(f).face), 'his ω in every face');
});

test('the backbeats squash him (G 1.08 / 0.90), the crest throws him 70 px out of his seat in 2 frames, his own hits pop his face; each chain click jerks the car', () => {
  for (const b of BR.BOTTOMS) {
    const h = G.heroAt(b);
    near(h.sx, 1.08, 1e-9, 'G-squash x');
    near(h.sy, 0.9, 1e-9, 'G-squash y');
    assert.ok(Math.abs(G.heroAt(b + 14).sx - 1) < 1e-9, 'settled by 14 f');
  }
  // Airtime is thrown off the crest's kick (from the beat frame's shutter opening), floats, and is pulled back in before the drop.
  assert.equal(G.heroAt(BR.CREST - G.HIT_LEAD - 0.01).air, 0, 'seated until the kick');
  assert.ok(G.heroAt(BR.CREST).air > 5, 'rising on the kick’s frame');
  near(G.heroAt(BR.CREST + 2 - G.HIT_LEAD).air, 70, 1e-9, 'up 70 px 2 frames on (round 1 SYNC-2: 30 px was 1 % of the frame)');
  assert.ok(G.heroAt(BR.CREST + 1).air > 60, 'most of the throw by the kick’s next frame');
  assert.equal(G.heroAt(BR.CREST + 12).air, 0, 'back in his seat');
  // His face pops on his own hits: the crest (+12 %), the rattle's two eye swaps (+10 %), from their beat frames' shutter openings.
  near(G.facePopAt(BR.CREST + 0.01 - G.HIT_LEAD), 1.12, 0.002, 'the crest’s pop');
  for (const f of [BR.RATTLE.from, BR.RATTLE.from + 3]) assert.ok(G.facePopAt(f) > 1.04, `the rattle’s pop on ${f}`);
  assert.equal(G.facePopAt(BR.BOTTOMS[0]), 1);
  for (const c of BR.CHAIN_CLICKS) assert.equal(G.carAt(c).jerk, 2, `the ratchet on ${c}`);
  assert.equal(G.carAt(BR.CHAIN_CLICKS[0] + 3).jerk, 0);
  // The car pops in under him on the cut (0.6 → 1.05 → 1 over 5 f), about his ω; he settles into his seat (sy 0.96 → 1, 6 f).
  assert.ok(Math.abs(G.carAt(G0).s - 0.6) < 1e-9 && Math.abs(G.carAt(G0 + 3).s - 1.05) < 1e-9 && G.carAt(G0 + 5).s === 1);
  near(G.heroAt(G0).sy, 0.96, 1e-9, 'seated settle');
  near(G.heroAt(G0 + 6).sy, 1, 1e-9, 'settled');
});

test('the train: four copies of him in yellow, mint, coral and violet ride behind him on the track in half-size cars, a fixed arc apart, through the ride', () => {
  for (let f = G0; f < BR.REWIND.from; f += 3) {
    const cars = G.trainAt(f);
    assert.deepEqual(cars.map((c) => c.color), ['yellow', 'mint', 'coral', 'violet']);
    const me = G.arcOfX(G.playX(f));
    cars.forEach((c, i) => {
      const x = G.xOfArc(me - G.TRAIN_GAP * (i + 1));
      const k = G.carOnRail(x, 0.5);
      // On the crest's kick the whole train hops TRAIN_AIR px off the rail along its cars' normals (round 1 F3), back on it by 6.3&.
      const air = G.trainAirAt(f);
      near(c.x, k.x + air * Math.sin(k.th), 1e-6, `car ${i + 1} x at ${f}`);
      near(c.y, k.y - air * Math.cos(k.th), 1e-6, `car ${i + 1} y at ${f}`);
      near(c.th, k.th, 1e-9, `car ${i + 1} angle at ${f}`);
    });
  }
  near(G.trainAirAt(BR.CREST + 2 - G.HIT_LEAD), G.TRAIN_AIR, 1e-9, 'airborne 2 frames into the crest');
  assert.equal(G.trainAirAt(BR.CREST - G.HIT_LEAD - 0.01), 0);
  assert.equal(G.trainAirAt(BR.CREST + 12), 0, 'back on the rail by 6.3&');
});

// --- The keys' chips, the labels ---------------------------------------------------------------------------------------------------

test('hex chips: E2 80 A2 20 CF pop together through the reveal (1 f apart), then each pops only as he passes its key; never three at once after; k10 has none', () => {
  const open = (f: number) => G.KEYS.map((_, i) => G.chipAt(i, f)).flatMap((c, i) => (c ? [i] : []));
  assert.deepEqual(open(G0), [0]);
  assert.deepEqual(open(G0 + 4), [0, 1, 2, 3, 4]);
  assert.deepEqual(open(BR.CHIPS_REVEAL.to - 1), [0, 1, 2, 3, 4]);
  for (let f = BR.CHIPS_FOLD.to; f < G1; f++) assert.ok(open(f).length <= 2, `≤ 2 chips at ${f}: ${open(f)}`);
  for (let f = G0; f < G1; f++) assert.equal(G.chipAt(9, f), null, 'T9 stands in for k10’s chip');
  for (const i of [3, 4, 5, 6, 7, 8]) assert.ok(G.chipAt(i, G.KEYS[i].frame + 1), `chip ${SIGNATURE[i]} as he passes`);
  assert.equal(G.chipAt(2, BR.CHIPS_FOLD.from + 1)?.sy, 1, 'k3’s chip stays up (it is passed on 6.1a) while the others fold');
});

test('segment labels only on the two plunges and on the red easeInBack', () => {
  const texts = (f: number) => G.labelsAt(f).map((l) => `${l.text}${l.red ? ':red' : ''}`);
  assert.deepEqual(texts(BR.LABELS[0] + 2), ['easeInQuart']);
  assert.deepEqual(texts(BR.LABELS[1] + 2), ['easeInCubic']);
  assert.deepEqual(texts(BR.LABELS[2] + 2), ['easeInBack:red']);
  assert.deepEqual(texts(BR.LABELS[0] - 1), []);
  assert.deepEqual(texts(BR.CREST + 3), []);
});

// --- The rewind, the fling ---------------------------------------------------------------------------------------------------------

test('the rewind: the cursor drags k10 back in time past k9 and below 0x00 — a red easeInBack hook — and k10’s handles stretch from him to grips pinned at its old place', () => {
  // The yank is a snap off the rewind's kick (round 1 F1 / 6.4&): it starts as the frame before closes its shutter and is home on the
  // kick's own instant, so the kick's frame carries all of it and the frames after are still.
  near(G.YANK, BR.REWIND.from - 0.75, 1e-9, 'the yank starts as the frame before the kick closes its shutter');
  for (const sm of temporalSamples(BR.REWIND.from - 1, G.graphTemporal(BR.REWIND.from - 1), G.graphSegment())) assert.ok(sm.frame <= G.YANK, 'the frame before is all click');
  assert.ok(G.hookU(BR.REWIND.from) > 0.99, `home on the kick’s own instant (${G.hookU(BR.REWIND.from).toFixed(4)})`);
  assert.equal(G.hookAt(G.YANK - 0.01), null);
  const h0 = G.hookAt(G.YANK)!;
  assert.deepEqual(h0[0], [G.KEYS[8].x, G.railY(G.KEYS[8].frame)], 'from k9');
  assert.deepEqual(h0[3], [G.KEYS[9].x, G.railY(G.KEYS[9].frame)], 'k10 where it was as the yank starts');
  for (const sm of temporalSamples(BR.REWIND.from, G.graphTemporal(BR.REWIND.from), G.graphSegment())) assert.ok(sm.frame >= G.YANK, `the kick’s frame is all yank (${sm.frame.toFixed(3)})`);
  const h1 = G.hookAt(BR.REWIND.from + 5)!;
  assert.ok(h1[3][0] < G.KEYS[8].x, 'dragged back in time past k9');
  assert.ok(h1[3][1] > 980, 'below 0x00');
  const grips = G.GRIPS;
  near(grips[0][0], G.KEYS[9].x - 96, 1e-9, 'left grip');
  near(grips[1][0], G.KEYS[9].x + 96, 1e-9, 'right grip');
  for (const f of instants(BR.REWIND.from + 1, G1, 1)) {
    const v = G.cordsAt(f);
    assert.ok(v, `the handle-V at ${f}`);
    assert.deepEqual(v.grips, grips);
    const [a] = v.grips;
    assert.ok(v.anchor[0] < a[0], 'the V points left, him at its apex');
  }
  // Yanked back down the hook, he is at the dragged key by the kick's next frame (full draw, held to the fling) and flung on the 16th kick.
  const d = G.hookAt(G.YANK + G.DRAW_FRAMES)![3];
  for (const f of [G.YANK + G.DRAW_FRAMES, G.FLUNG]) {
    near(G.omegaAt(f)[0], d[0], 1e-6, `ω x at full draw (${f})`);
    near(G.omegaAt(f)[1], d[1] - G.TRACK.seat, 1e-6, `ω y at full draw (${f})`);
  }
  assert.ok(BR.KICKS_V2.includes(BR.FLING) && BR.KICKS_V2.includes(BR.REWIND.from));
  // The fling is a launch: every sub-frame of the kick's frame has him in flight (no still pose ghosted under the streak).
  near(G.FLUNG, BR.FLING - G.HIT_LEAD, 1e-9, 'the motion leads the kick by a quarter frame');
  const kick = temporalSamples(BR.FLING, G.graphTemporal(BR.FLING), G.graphSegment());
  for (const sm of kick) assert.ok(sm.frame >= G.FLUNG, `every sub-frame of the kick is past the launch (${sm.frame.toFixed(3)})`);
  // On screen (v07: the crash-in already leans in on the fling, so a world px is more than one on screen).
  const last = kick[kick.length - 1].frame;
  assert.ok((d[0] - G.omegaAt(last)[0]) * G.graphCam(last).zoom > 60, 'and by its last he is well on his way');
});

test('the cursor lets go on the cut and parks top-right; a living hold through the ride (round 1 F6); swoops on the 32nd before 6.4e and lands on k10 with the click; holds it from under it, never on his face (CURSOR-EYE); drags it through the rewind; flicked off before the cut', () => {
  const c0 = G.cursorAt(G0)!;
  near(c0.x, G.CURSOR_LET_GO[0], 1e-9, 'let go where 5.4& held the marquee');
  near(c0.y, G.CURSOR_LET_GO[1], 1e-9, 'let go y');
  const r = G.cursorAt(BR.RIDE.from)!;
  near(Math.hypot(r.x - G.CURSOR_PARK[0], r.y - G.CURSOR_PARK[1]), G.HOVER_SHAKE, 1e-6, 'parked by 6.1& (its shake aside)');
  // The living hold: it moves every frame (drifting toward him, left and down), shaking ±3 px every 2 frames.
  const at = (f: number) => G.cursorAt(f)!;
  for (let f = BR.RIDE.from + 1; f < G.SWOOP.from; f++) assert.ok(Math.hypot(at(f).x - at(f - 1).x, at(f).y - at(f - 1).y) > 0.2, `the cursor lives at ${f}`);
  const quiet = (f: number) => !BR.BOTTOMS.some((b) => f - b >= 0 && f - b < 4);
  const drift = (f: number) => G.CURSOR_PARK[0] + (G.CURSOR_HOVER[0] - G.CURSOR_PARK[0]) * flow((f - BR.RIDE.from) / (G.SWOOP.from - BR.RIDE.from));
  for (let f = BR.RIDE.from; f < G.SWOOP.from; f++) {
    if (!quiet(f)) continue;
    const sh = at(f).x - drift(f);
    near(Math.abs(sh), G.HOVER_SHAKE, 1e-6, `±${G.HOVER_SHAKE} px off its drift at ${f}`);
    if (quiet(f + 2) && f + 2 < G.SWOOP.from) near(at(f + 2).x - drift(f + 2), -sh, 1e-6, `the shake flips every 2 frames (${f})`);
  }
  assert.ok(at(G.SWOOP.from - 1).x < G.CURSOR_PARK[0] - 300 && at(G.SWOOP.from - 1).y > G.CURSOR_PARK[1] + 80, 'drifted toward him');
  for (const b of BR.BOTTOMS) {
    const twitch = Math.hypot(at(b).x - at(b - 1).x, at(b).y - at(b - 1).y);
    assert.ok(twitch > 15 && at(b).rot < -8, `it twitches on the bottom ${b} (${twitch.toFixed(1)} px)`);
    near(at(b + 4).rot, 0, 1e-9, 'and settles');
  }
  // The swoop: cubic in over the 32nd before the kick, landing on k10 (GRAB under it) on the kick's frame — its biggest step.
  const k10 = (f: number) => toScreen(G.graphCam(f), ...G.keyPoint(9));
  const land = at(BR.RATTLE.from);
  near(land.x, k10(BR.RATTLE.from)[0] + G.GRAB[0], 1e-6, 'lands on k10 (x)');
  near(land.y, k10(BR.RATTLE.from)[1] + G.GRAB[1], 1e-6, 'lands on k10 (y)');
  assert.equal(land.s, 0.9, 'the click: pressed');
  const steps = [G.SWOOP.from + 1, G.SWOOP.from + 2, BR.RATTLE.from].map((f) => Math.hypot(at(f).x - at(f - 1).x, at(f).y - at(f - 1).y));
  assert.ok(steps[2] > steps[1] && steps[1] > steps[0], `the swoop accelerates into the click (${steps.map((v) => v.toFixed(0)).join(', ')})`);
  // Holding the key from under it, its tip ≥ 55 px under his right eye (or well to its side): the antivirus aims at the key, not him.
  for (let f = BR.RATTLE.from; f < G.FLUNG; f++) {
    const c = at(f);
    const h = G.heroAt(f);
    const eye = D.faceLayout(h.face).filter((g) => g.ch === '⊙' || g.ch === '✦').at(-1)!;
    const rot = (h.rot * Math.PI) / 180;
    const e = toScreen(G.graphCam(f), h.x + Math.cos(rot) * eye.dx * h.em, h.y + Math.sin(rot) * eye.dx * h.em);
    assert.ok(c.y - e[1] >= 55 || Math.abs(c.x - e[0]) >= 120, `the cursor’s tip (${c.x.toFixed(0)}, ${c.y.toFixed(0)}) clear of his right eye (${e[0].toFixed(0)}, ${e[1].toFixed(0)}) at ${f}`);
  }
  const grab = at(BR.REWIND.from + 2);
  const key = toScreen(G.graphCam(BR.REWIND.from + 2), ...G.hookAt(BR.REWIND.from + 2)![3]);
  near(grab.x, key[0] + G.GRAB[0], 1e-6, 'on the dragged key (x)');
  near(grab.y, key[1] + G.GRAB[1], 1e-6, 'on the dragged key (y)');
  assert.equal(at(BR.REWIND.from).s, 0.9, 'pressed for the yank');
  const gone = G.cursorAt(G1 - 0.25);
  assert.ok(!gone || gone.x > 1920 || gone.y < -80, 'off the frame by the cut');
});

test('the chrome assembles on break 6.1 (L, staggered 1 f) and is torn wholly off the frame before the hidden cut; the status types the antivirus’s two lines', () => {
  const c0 = G.chromeAt(G0);
  assert.ok(c0.title.dy <= -56 && c0.axis.dx <= -96 && c0.ruler.dy >= 96, 'off on the cut frame');
  const c = G.chromeAt(BR.RIDE.from + 2);
  for (const v of [c.title.dy, c.axis.dx, c.ruler.dy]) assert.ok(Math.abs(v) < 0.5, 'home by 6.1& (+ its 2-frame stagger)');
  const t = G.chromeAt(G1 - 0.25);
  assert.ok(t.title.dy <= -62 && t.axis.dx <= -102 && t.ruler.dy >= 102, 'torn off by the cut');
  assert.equal(G.chromeAt(BR.RATTLE.from).status, '[DEFENDER] easing (•ω•) → 0 px/f');
  assert.equal(G.chromeAt(BR.REWIND.from + 3).status, '[DEFENDER] rewind (•ω•)'.slice(0, 16), '4 characters a frame');
  assert.equal(G.chromeAt(BR.REWIND.from + 5).status, '[DEFENDER] rewind (•ω•)');
  // The playhead's pentagon reads the film bar of break 6 and the beat, changing on the beat, never on the 16ths.
  assert.equal(G.chromeAt(G0).beat, `${partBar('break', 6)}.1`);
  assert.equal(G.chromeAt(at(6, 2) - 1).beat, `${partBar('break', 6)}.1`);
  assert.equal(G.chromeAt(at(6, 2)).beat, `${partBar('break', 6)}.2`);
  assert.equal(G.chromeAt(at(6, 4) + 6).beat, `${partBar('break', 6)}.4`);
});

test('the audio builder’s rail roar can follow his speed along the track: fastest at the bottoms, slowest on the lift hill and the crest', () => {
  const v = (f: number) => G.railSpeed(f);
  assert.ok(v(BR.BOTTOMS[0] - 0.5) > 4 * v(BR.CREST), 'the plunge is far faster than the crest');
  assert.ok(v(BR.LIFT.from + 3) < v(BR.BOTTOMS[0] - 0.5));
  for (let f = G0; f < BR.REWIND.from; f += 0.5) assert.ok(v(f) >= 24 - 1e-6, 'never slower than the playhead');
});

// --- The impacts ---------------------------------------------------------------------------------------------------------------

test('the bottoms hit on their beat frames: the squash, the shockwave and the sparks start at the beat frame’s shutter opening, which is short there (the impact frame)', () => {
  for (const b of BR.BOTTOMS) {
    const open = b - G.IMPACT_SHUTTER / 2;
    assert.equal(G.graphTemporal(b).shutter, G.IMPACT_SHUTTER, `the impact frame’s shutter on ${b}`);
    assert.ok(G.IMPACT_SHUTTER <= 0.15);
    for (const s of temporalSamples(b, G.graphTemporal(b), G.graphSegment())) {
      assert.equal(G.impactsAt(s.frame).length, 1, `the impact is up on every sub-frame of ${b} (${s.frame.toFixed(3)})`);
      near(G.heroAt(s.frame).sx, 1.08, 1e-9, `squashed on every sub-frame of ${b}`);
    }
    assert.equal(G.impactsAt(b - G.HIT_LEAD - 0.01).length, 0, 'nothing before the beat frame opens');
    assert.ok(open >= b - G.HIT_LEAD, 'the lead covers the shutter');
    assert.deepEqual(G.impactsAt(b)[0], { x: G.playX(b), y: G.railY(b), e: G.HIT_LEAD }, 'out of the bottom key');
    assert.equal(G.impactsAt(b + 12).length, 0, 'over by 12 frames');
  }
  for (let f = G0; f < G1; f++) if (!BR.BOTTOMS.includes(f)) assert.equal(G.graphTemporal(f).shutter, 0.5);
});

// --- C6: the selection is the flat world's own, and so is his face --------------------------------------------------------------

test('C6: the graph draws the flat world’s own selection on 6.1 (its ants, handles, dim and T8, unmoved), and lays (⊙ω⊙) out eye for eye as the flat world does', () => {
  const sel = selectMarquee(G0)!;
  const L = D.graphOverlay(G0)!;
  assert.ok(L, 'the overlay is up on the cut');
  const segs = L.under.filter((s) => s.kind === 'segment');
  assert.equal(segs.length, sel.dashes.length, 'every dash, as the flat world has them');
  sel.dashes.forEach(([p, q], i) => assert.deepEqual(segs[i], lSegment(p[0], p[1], q[0], q[1], 4, BREAK_PALETTE.red, 1), `dash ${i}`));
  const chip = selectChip(G0)!;
  assert.equal(chip.text, chip.full, 'T8 typed whole');
  // His face: the flat world types (⊙ω⊙) on the hero's advances (⊙ full width); the graph's layout has the same proportions.
  const flatFace = faceCore(G0 - 1, true);
  const w = flatFace.find((g) => g.ch === 'ω')!;
  const eyeR = flatFace.filter((g) => g.ch === '⊙')[1];
  const mine = D.faceLayout(HERO_FACES_V2.seated);
  const mEyeR = mine.filter((g) => g.ch === '⊙')[1];
  for (const [i, g] of flatFace.entries()) near(mine[i].dx / mEyeR.dx, (g.x - w.x) / (eyeR.x - w.x), 1e-6, `glyph ${g.ch} of (⊙ω⊙)`);
});

// --- Every instant draws inside the scene's capacities ------------------------------------------------------------------------------

test('every instant of the bar fits the scene’s layers (a field that overflows throws mid-render), and every glyph it draws is in its atlas', () => {
  const tris = (polys: readonly { pts: readonly unknown[] }[]) => polys.reduce((n, p) => n + p.pts.length - 2, 0);
  const mono = new Set(GRAPH_MONO_STRINGS.flatMap((t) => [...t]));
  const hero = new Set(GRAPH_HERO_STRINGS.flatMap((t) => [...t]));
  const peak: Record<string, number> = {};
  const check = (name: keyof typeof GRAPH_CAPACITY, L: D.GraphLayer, f: number) => {
    const cap = GRAPH_CAPACITY[name];
    const glyphs = [...L.glyphs.hero, ...L.glyphs.mono];
    peak[name] = Math.max(peak[name] ?? 0, L.under.length);
    assert.ok(L.under.length <= cap.shapes, `${name}: ${L.under.length} shapes at ${f}`);
    assert.ok(L.over.length <= 512, `${name}: ${L.over.length} shapes over at ${f}`);
    assert.ok(L.glyphs.hero.length <= cap.glyphs && L.glyphs.mono.length <= cap.glyphs, `${name}: ${glyphs.length} glyphs at ${f}`);
    assert.ok(tris(L.polys) <= cap.polys && tris(L.polysOver) <= cap.polys, `${name}: polys at ${f}`);
    for (const g of L.glyphs.mono) assert.ok(mono.has(g.ch), `${name}: mono "${g.ch}" at ${f}`);
    for (const g of L.glyphs.hero) assert.ok(hero.has(g.ch), `${name}: hero "${g.ch}" at ${f}`);
  };
  for (const f of instants(G0, G1, 0.25)) {
    const fr = D.graphFrame(f);
    for (const name of ['back', 'world', 'fx', 'train', 'hero', 'top', 'chrome'] as const) check(name, fr[name], f);
  }
  for (let f = G0; f < G1; f++) {
    const o = D.graphOverlay(f);
    if (o) check('overlay', o, f);
  }
  assert.ok(peak.world > 200, 'the world really draws');
});

test('the click (6.4e): the view snaps to the selection on the kick and holds still through the rattle; he dives and rings inside the still frame, the car only judders (|tilt| ≤ RATTLE_TILT), the jolts knock him and his section on +558 and +561', () => {
  const sel = G.graphCam(BR.RATTLE.from + 1);
  near(sel.zoom, G.SELECT.zoom, 1e-9, 'framed at SELECT.zoom');
  near(sel.roll, 0, 1e-9, 'level');
  // The snap: 7/8 there on the kick's own instant (its one sharp instant), home half a frame on; none of it in the frame before.
  const from = G.graphCam(G.CLICK_SNAP.from);
  near((G.graphCam(BR.RATTLE.from).cx - from.cx) / (sel.cx - from.cx), 0.875, 1e-6, 'the kick’s instant is 7/8 of the snap');
  for (const sm of temporalSamples(BR.RATTLE.from - 1, G.graphTemporal(BR.RATTLE.from - 1), G.graphSegment())) assert.ok(sm.frame < G.CLICK_SNAP.from, 'the frame before is all ride');
  // Still from half a frame after the kick to the yank: the world does not move while he rattles.
  for (const f of instants(BR.RATTLE.from + 0.5, G.YANK)) {
    const c = G.graphCam(f);
    assert.deepEqual([c.zoom, c.cx, c.cy, c.roll], [sel.zoom, sel.cx, sel.cy, sel.roll], `still at ${f}`);
    assert.ok(Math.abs(G.carAt(f).th) <= (G.RATTLE_TILT * Math.PI) / 180 + 1e-9, `car tilt ${((G.carAt(f).th * 180) / Math.PI).toFixed(1)}° at ${f}`);
  }
  // He dives inside it (review round 2, G-1): off the kick, three frames down to the elastic's overshoot on the fill's 32nd — ≥ 80 px
  // of screen in each of the first two, never more than RATE in one — and stays in the ride's window.
  const y = (f: number) => G.graphCam(f).omega[1];
  const steps = [1, 2, 3].map((d) => y(BR.RATTLE.from + d) - y(BR.RATTLE.from + d - 1));
  assert.ok(steps[0] >= 80 && steps[1] >= 80, `the dive shows: ${steps.map((v) => v.toFixed(0)).join(', ')} px`);
  assert.ok(y(BR.RATTLE.from + 3) - y(BR.RATTLE.from) >= 180, 'and goes a long way down');
  for (let f = BR.RATTLE.from; f < G.YANK; f++) assert.ok(y(f) >= 400 && y(f) <= 712, `ω screen y ${y(f).toFixed(0)} at ${f}`);
  // The jolts: ±8 px on screen on the kick and its 32nd (taken at the output frame), 40 % the frame after, nothing between.
  assert.deepEqual(G.joltAt(BR.RATTLE.from), [8, -8]);
  assert.deepEqual(G.joltAt(BR.RATTLE.from + 3 + 0.2), [-8, 8]);
  assert.deepEqual(G.joltAt(BR.RATTLE.from + 1).map((v) => Math.round(v * 10) / 10), [3.2, -3.2]);
  assert.deepEqual(G.joltAt(BR.RATTLE.from + 2), [0, 0]);
  assert.equal(G.joltWeight(G.KEYS[7].x + 10), 1, 'the elastic section takes it whole');
  assert.equal(G.joltWeight(G.KEYS[7].x - 60), 0, 'the rest of the rail stays');
  // His car and him take the jolt with the section (screen px through the still framing's zoom).
  const z = G.graphCam(BR.RATTLE.from).zoom;
  const body = D.graphFrame(BR.RATTLE.from).hero.glyphs.hero.filter((g) => g.ch === 'ω').at(-1)!;
  const plain = G.heroAt(BR.RATTLE.from);
  const want = toEngine(plain.x + 8 / z, plain.y - 8 / z);
  near(body.x, want[0], 0.05, 'the jolt moves him (x)');
  near(body.y, want[1], 0.05, 'the jolt moves him (y)');
  // The selection: the curve's last segment red-edged and a red ring round k10, from the click until the yank folds it into the hook.
  assert.equal(G.selectedAt(BR.RATTLE.from - G.HIT_LEAD), true);
  assert.equal(G.selectedAt(BR.RATTLE.from - G.HIT_LEAD - 0.01), false);
  assert.equal(G.selectedAt(G.YANK), false);
  const red = D.graphFrame(BR.RATTLE.from).world.under.filter((sh) => sh.color === BREAK_PALETTE.red);
  assert.ok(red.length > 3, 'red-edged rail and the ring on the click');
  assert.equal(D.graphFrame(BR.RATTLE.from - 1).world.under.filter((sh) => sh.color === BREAK_PALETTE.red).length, 0, 'none before');
  // The limiter comes in smoothly: no frame-to-frame tilt jump over 25° on the way in.
  for (const f of instants(BR.RATTLE.from - 3, BR.RATTLE.from + 1, 0.25).slice(1)) {
    const d = Math.abs(G.carAt(f).th - G.carAt(f - 0.25).th) * (180 / Math.PI);
    assert.ok(d <= 25, `tilt step ${d.toFixed(1)}° in a quarter frame at ${f}`);
  }
});

// --- Round 1: the ratchet, the kicks as picture events, him sharp ----------------------------------------------------------------

test('the lift hill’s ratchet (round 1 F3 / SYNC-2): the ride’s time is hauled up the hill in notches on 6.2a and 6.2a + 6 and tipped over the crest on 6.3’s kick, each notch its frame’s; between them the camera holds dead still while he creeps on; the music caught up within 6 frames of the kick', () => {
  const [h1, h2] = G.RATCHET.hats;
  assert.deepEqual([h1, h2], [BR.CHAIN_CLICKS[1], BR.CHAIN_CLICKS[2]]);
  assert.deepEqual(G.NOTCHES, [h1, h2, BR.CREST]);
  // rideT is f outside; inside, continuous, never backwards, and ahead of the music (the train is hauled early, never late).
  for (const f of [G0, BR.BOTTOMS[0], G.RATCHET_SPAN.from, G.RATCHET_SPAN.to, BR.BOTTOMS[1]]) near(G.rideT(f), f, 1e-9, `rideT = f at ${f}`);
  assert.ok(G.RATCHET_SPAN.to > BR.CREST && G.RATCHET_SPAN.to <= BR.CREST + 6, `caught up by 6.3 + 6 (${G.RATCHET_SPAN.to - BR.CREST})`);
  let prev = G.rideT(G.RATCHET_SPAN.from - 0.01);
  for (const f of instants(G.RATCHET_SPAN.from, G.RATCHET_SPAN.to + 1, 1 / 64)) {
    const t = G.rideT(f);
    assert.ok(t >= prev - 1e-9 && t - prev < 0.6, `continuous and forwards at ${f}`);
    assert.ok(t >= f - 1e-9, `ahead of the music at ${f}`);
    assert.ok(G.camT(f) <= t + 1e-9 && t - G.camT(f) <= 0.5 + 1e-9, `the camera never ahead of him, never more than his creep behind (${f})`);
    prev = t;
  }
  // Each notch is its frame's: the frame before it is all hold, and its own instant shows it ≥ 98 % done.
  for (const n of G.NOTCHES) {
    for (const sm of temporalSamples(n - 1, G.graphTemporal(n - 1), G.graphSegment())) assert.ok(sm.frame <= n - G.RATCHET.lead, `the frame before ${n} is all hold`);
    const a = G.rideT(n - G.RATCHET.lead);
    const b = G.rideT(n - G.RATCHET.lead + G.RATCHET.dur);
    assert.ok((G.rideT(n) - a) / (b - a) >= 0.98, `the notch on ${n} is its frame’s`);
  }
  // The hats haul a 16th of track each and land him on the crest a beat early; the crest's notch tips him over it.
  near(G.rideT(h1 - G.RATCHET.lead + G.RATCHET.dur) - G.rideT(h1 - G.RATCHET.lead), 6, 0.2, 'about a 16th of track a notch');
  near(G.rideT(h2 - G.RATCHET.lead + G.RATCHET.dur), BR.CREST, 1e-9, 'on the crest after the second hat');
  near(G.rideT(BR.CREST - G.RATCHET.lead + G.RATCHET.dur) - G.rideT(BR.CREST - G.RATCHET.lead), G.RATCHET.tip, 1e-9, 'tipped over the crest');
  // The holds: the camera does not move; he creeps on.
  for (const [a, b] of [[h1, h2], [h2, BR.CREST]].map(([x, y]) => [x - G.RATCHET.lead + G.RATCHET.dur, y - G.RATCHET.lead])) {
    const c0 = G.graphCam(a);
    for (const f of instants(a, b)) {
      const c = G.graphCam(f);
      assert.deepEqual([c.zoom, c.cx, c.cy, c.roll], [c0.zoom, c0.cx, c0.cy, c0.roll], `the camera holds at ${f}`);
    }
    for (let f = Math.ceil(a) + 1; f <= b; f++) {
      const d = Math.hypot(G.graphCam(f).omega[0] - G.graphCam(f - 1).omega[0], G.graphCam(f).omega[1] - G.graphCam(f - 1).omega[1]);
      assert.ok(d > 0.5 && d < 6, `he creeps ${d.toFixed(2)} px at ${f}`);
    }
  }
  // The crest's pull-back to 0.88 is inside its notch: Z 1 teetering on the crest, 0.88 by the notch's end.
  near(G.graphCam(BR.CREST - 1).zoom, 1, 1e-9, 'Z 1 teetering on the crest');
  near(G.graphCam(BR.CREST - G.RATCHET.lead + G.RATCHET.dur).zoom, 0.88, 0.005, 'Z 0.88 over it');
});

test('the bar’s kicks are its picture events (round 1 SYNC-2 / F1): on 6.3, 6.4e and 6.4& the world moves most on the kick’s own frame (≥ 3× the frames either side); 6.4e–6.4& under the click’s marquee; on 6.4a the violet axis has crossed the frame within the kick’s frame', () => {
  const pts = G.KEYS.map((_, i) => G.keyPoint(i));
  const move = (o: number): number => {
    const a = G.graphCam(o - 1);
    const b = G.graphCam(o);
    return pts.reduce((s, p) => s + Math.hypot(toScreen(b, p[0], p[1])[0] - toScreen(a, p[0], p[1])[0], toScreen(b, p[0], p[1])[1] - toScreen(a, p[0], p[1])[1]), 0) / pts.length;
  };
  for (const k of [BR.CREST, BR.RATTLE.from, BR.REWIND.from]) {
    const m = move(k);
    assert.ok(m > 100, `the world moves ${m.toFixed(0)} px on ${k}`);
    for (const d of [-2, -1, 1, 2]) assert.ok(move(k + d) * 3 < m, `… ≥ 3× the frame ${d} from it (${move(k + d).toFixed(0)} px)`);
  }
  // The click's marquee: on from the kick's frame to the yank's (taken at the output frame), round k8 → k10, him and the cursor's grip.
  assert.equal(G.selectionAt(BR.RATTLE.from - 0.6), null);
  assert.equal(G.selectionAt(BR.REWIND.from - 0.4), null);
  assert.ok(G.SELECT_DIM * 0.9 < 0.1, 'the dim is no flash: cream’s relative luminance swings < 0.1');
  for (let o = BR.RATTLE.from; o < BR.REWIND.from; o++) {
    const r = G.selectionAt(o)!;
    assert.ok(r && G.selectionAt(o - 0.25) && G.selectionAt(o + 0.25), `up on ${o}`);
    const c = G.graphCam(o);
    for (const p of [...[7, 8, 9].map((i) => toScreen(c, ...G.keyPoint(i))), c.omega, [G.cursorAt(o)!.x, G.cursorAt(o)!.y] as const]) assert.ok(p[0] > r.x0 && p[0] < r.x1 && p[1] > r.y0 && p[1] < r.y1, `(${p[0].toFixed(0)}, ${p[1].toFixed(0)}) inside on ${o}`);
  }
  assert.ok(D.graphFrame(BR.RATTLE.from).chrome.under.some((sh) => sh.color === BREAK_PALETTE.red), 'its ants drawn');
  // 6.4a: the colour carry has crossed the frame by the fling kick frame's shutter close; nothing of it before the launch.
  assert.equal(G.axisFlingAt(G.FLUNG - 0.01), null);
  assert.ok(G.axisFlingAt(BR.FLING + 0.25)!.x >= 1920, 'violet by the kick frame’s close');
});

test('the groups’ shutters (review round 2, G-1): him on HERO_SHUTTER from the second bottom’s next frame through the rewind’s kick and the track on TRACK_SHUTTER through the ride — short, centred, every sub-frame — one sharp instant on the snaps (and the track on the bottoms) and him from full draw to the cut; never stop-motion where he moves', () => {
  const span = (g: 'hero' | 'track', o: number): [number, number] => {
    const ts = temporalSamples(o, G.graphTemporal(o), G.graphSegment()).map((sm) => G.groupAt(g, sm.frame));
    return [Math.min(...ts), Math.max(...ts)];
  };
  for (let o = BR.BOTTOMS[1] + 1; o <= BR.REWIND.from; o++) {
    if (G.SNAPS.includes(o)) continue;
    assert.equal(G.groupShutter('hero', o), G.HERO_SHUTTER, `him on ${o}`);
    const [a, b] = span('hero', o);
    near(b - a, G.HERO_SHUTTER * (1 - 1 / G.graphTemporal(o).samples), 1e-9, `his sub-frames span the short shutter on ${o}`);
    near((a + b) / 2, o, 1e-9, `centred on ${o}`);
  }
  for (const b of BR.BOTTOMS) assert.equal(G.groupShutter('hero', b), G.IMPACT_SHUTTER, `the impact frame’s own shutter on ${b}`);
  for (let o = BR.REWIND.from + 1; o < G1; o++) assert.ok(G.isSharp('hero', o), `full draw and the crash-in print sharp (${o}), as the sling side across C7`);
  for (let o = G0; o <= BR.REWIND.from; o++) {
    const s = G.groupShutter('track', o);
    if (G.SNAPS.includes(o) || BR.BOTTOMS.includes(o)) assert.equal(s, 0, `the track snaps (or slams to a stop) sharp on ${o}`);
    else assert.equal(s, Math.min(G.TRACK_SHUTTER, G.graphTemporal(o).shutter), `the track’s short shutter on ${o}`);
  }
  for (let o = BR.REWIND.from + 1; o < G1; o++) assert.equal(G.groupShutter('track', o), 0.5, `the world streaks past him from the yank (${o})`);
  for (const n of G.SNAPS) for (const g of ['hero', 'track', 'world'] as const) assert.ok(G.isSharp(g, n), `${g} sharp on the snap ${n}`);
  assert.ok(!G.isSharp('hero', G.NOTCHES[0] + 1) && !G.isSharp('world', G.NOTCHES[0] + 1), 'and only on it');
  // His ω never moves more than RATE px a frame on screen, from the ride through the yank (the click's dive included: 269 px in v04).
  const at = (o: number) => G.graphCam(o).omega;
  for (let o = BR.RIDE.from + 1; o <= BR.REWIND.from; o++) {
    const d = Math.hypot(at(o)[0] - at(o - 1)[0], at(o)[1] - at(o - 1)[1]);
    assert.ok(d <= G.RATE + 1, `his step ${d.toFixed(0)} px on ${o}`);
  }
});

test('the elastic rattle (review round 2, G-1): k8 → k9 dives off the fill’s kick for three frames to a 20 % overshoot on its 32nd, rings back once and lands on k9', () => {
  const E = G.EASES.outElastic;
  assert.equal(E(0), 0);
  assert.equal(E(1), 1);
  const [k8, k9] = [G.KEYS[7], G.KEYS[8]];
  near(G.valueAt(k8.frame), k8.value, 1e-9, 'from k8');
  near(G.valueAt(k9.frame), k9.value, 1e-9, 'onto k9');
  let low = Infinity;
  let lowAt = 0;
  for (let f = k8.frame; f <= k9.frame; f += 1 / 64) {
    if (G.valueAt(f) < low) {
      low = G.valueAt(f);
      lowAt = f;
    }
  }
  near(lowAt, BR.RATTLE.from + G.RATTLE_ELASTIC.dive, 0.05, 'the bottom of the dive on the fill’s 32nd');
  near((k8.value - low) / (k8.value - k9.value), 1 + G.RATTLE_ELASTIC.over, 1e-6, 'its overshoot');
  assert.equal(BR.RATTLE.from + G.RATTLE_ELASTIC.dive, G.JOLTS[1].at, 'the second jolt is its bottom');
  // Downhill all the way to the bottom, then one ring back up past k9 and down onto it.
  for (let f = k8.frame + 0.1; f < lowAt; f += 0.1) assert.ok(G.valueAt(f) < G.valueAt(f - 0.1), `diving at ${f.toFixed(1)}`);
  assert.ok(Math.max(...instants(lowAt, k9.frame, 0.05).map(G.valueAt)) > k9.value, 'it rings back past k9');
});

test('C7 carried by the flung panel (review round 2, C7-VIOLET-VOID): from the fling to the cut the sling side’s ground streaks stream over the violet — its streaks, tones and speed, inside the panel — rising toward its cut strength; the axis’s hex labels ride with them, fading before the cut', () => {
  assert.equal(G.flungStreaksAt(BR.FLING - 1), null);
  assert.equal(G.flungStreaksAt(G1), null, 'the sling side draws its own from the cut');
  const k = [BR.FLING, BR.FLING + 1, BR.FLING + 2].map((o) => G.flungStreaksAt(o)!);
  assert.deepEqual(k.map((x) => x.ground), [...k.map((x) => x.ground)].sort((a, b) => a - b), 'rising');
  assert.ok(k[2].ground < 0.5 && k[1].ground >= 0.2, 'toward the sling side’s STREAK_CUT_ALPHA (0.5) on the cut');
  assert.ok(k[0].axis > k[1].axis && k[1].axis > k[2].axis, 'the labels fade');
  assert.equal(BR.FLING + 3, G1, 'three frames: the fling’s and the two before the cut');
  // Drawn: every streak lies inside the panel, placed on screen as the sling side places it (GROUND_SPEED px a frame from the same x).
  const f = BR.FLING + 1.1;
  const L = D.graphFrame(f).fx;
  const c = G.graphCam(f);
  const edge = G.axisFlingAt(f)!.x;
  const segs = L.under.filter((sh) => sh.kind === 'segment');
  assert.ok(segs.length > 100, `the streaks are drawn (${segs.length})`);
  const screenX = (sh: (typeof segs)[number], end: -1 | 1): number => {
    const half = (sh.w - sh.h) / 2;
    const p = fromEngine(sh.x + end * half * Math.cos(sh.rot ?? 0), sh.y + end * half * Math.sin(sh.rot ?? 0));
    return toScreen(c, p[0], p[1])[0];
  };
  for (const sh of segs) assert.ok(screenX(sh, 1) <= edge + 1e-6 && screenX(sh, -1) <= edge + 1e-6, 'inside the panel');
  const t = GROUND_STREAKS.find((g) => g.tone !== 'ink' && g.x + g.len + GROUND_SPEED * (f - BR.WHIP_CUT) < edge && g.x + GROUND_SPEED * (f - BR.WHIP_CUT) > 0)!;
  const head = t.x + t.len + GROUND_SPEED * (f - BR.WHIP_CUT);
  assert.ok(segs.some((sh) => Math.abs(screenX(sh, 1) - head) < 0.5 || Math.abs(screenX(sh, -1) - head) < 0.5), `a streak’s head where the sling side has it (${head.toFixed(1)})`);
  assert.ok(L.glyphs.mono.length > 0, 'the axis’s labels ride it');
});

test('the ties scroll a third of their pitch a frame on the flats (review round 2, G-1: at 48 px it was exactly half, the ladder’s direction ambiguous)', () => {
  assert.ok(G.TRACK.pxPerFrame / D.TIE_PITCH <= 0.34, `${G.TRACK.pxPerFrame} / ${D.TIE_PITCH}`);
  assert.ok(G.TRACK.pxPerFrame / (D.TIE_PITCH * Math.cos((45 * Math.PI) / 180)) < 0.5, 'and under half up to 45°');
});

test('the dispatcher draws break 6.1 → the hidden cut with BreakGraph (GRAPH_V2): its sampling, its look, and clean cuts at C6 and C7', () => {
  const scene = new BreakScene();
  assert.equal(G.GRAPH_V2, true);
  assert.ok(scene.graph instanceof BreakGraph, 'the graph part is native');
  for (const f of [G0, G0 + 24, BR.BOTTOMS[0], BR.RATTLE.from, G1 - 1]) {
    assert.deepEqual(scene.segment(f), { from: G0, to: G1 }, `segment of ${f}`);
    assert.deepEqual(scene.temporal(f), G.graphTemporal(f), `sampling of ${f}`);
    assert.deepEqual(scene.look(f), G.graphLook(), `look of ${f}`);
  }
  assert.ok(scene.segment(G0 - 1).to <= G0, 'C6: the flat world’s last frame ends by 6.1');
  assert.ok(scene.segment(G1).from >= G1, 'C7: the sling side starts its own segment on the hidden cut');
});
