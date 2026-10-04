// Break 7, SLING (v2): the pure shot module src/shots/breakLaunch.ts (its v2 section), pinned to the build sheet
// notes/bid2/break-sheet2.md (§3 break 7, §4.1 the carried shot's identity, §5 C7–C8, §6.1, §11.3) and the design
// notes/extend/interlude-final.md (§3.7, §4.2, §10.4). Assertions are about what the viewer sees: where his ω is on screen, how the
// slingshot reads on full draw, what the window says, where the red cursor goes, and that the reused pieces are v04's, one bar later.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BREAK_TEXTS, BREAK_TEXTS_V2 } from '../src/content/break.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as BR from '../src/score/break.ts';
import { rigAt } from '../src/score/energy.ts';
import { partFrame } from '../src/score/film.ts';
import { BREAK_PALETTE, HERO_ADVANCE, camPose, frameOf, toScreen } from '../src/shots/breakShared.ts';
import {
  FIST_TOP,
  GROUND_SPEED,
  GROUND_STREAKS,
  LAUNCH_ATLAS_V2,
  LAUNCH_V2,
  LINK7,
  LOUDER_BUTTON,
  SLING_KEYS,
  CAR_RAMS,
  PACK_STEP,
  bandAtV2,
  browsV2,
  carsAt,
  chaseOf,
  chaseV2,
  cordPx,
  cursorAt,
  forkAt,
  forkParts,
  heroCharsV2,
  heroPoseV2,
  launchAtV2,
  launchCamV2,
  launchSegmentV2,
  launchTemporalV2,
  TRAIL,
  trailAt,
  WHIP_IN_ZOOM,
  WHIP_STRETCH,
  omegaOnScreenV2,
  slingCam,
  slingCords,
  slingState,
  stackStep,
  stackStepV2,
  uppercut,
  WIND_UP,
  windUp,
  windUpShare,
  windowAt,
  windowAtV2,
} from '../src/shots/breakLaunch.ts';
import { graphCam, graphTemporal } from '../src/shots/breakGraph.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, onShutter, poseMoved } from './lib/energyAudit.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);
const advance = (ch: string): number => (HERO_ADVANCE as Record<string, number>)[ch] ?? (ch === ' ' ? 0.28 : /[぀-ヿ]/u.test(ch) ? 1 : 0.6);
const L = { advance };
const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a.toFixed(3)} vs ${b}`);
/** A world point on screen through the shot camera only (no rig). */
const cam = (f: number, x: number, y: number): [number, number] => toScreen(launchCamV2(f), x, y);
const omegaCam = (f: number): [number, number] => {
  const h = heroPoseV2(f);
  return cam(f, h.omega[0], h.omega[1]);
};
const shutter = (F: number): number[] => temporalSamples(F, launchTemporalV2(F), launchSegmentV2(F)).map((s) => s.frame);
const FULL = BR.REVERSE - 1; // 8.1 − 1: full draw, settled

test('the launch is native: the switch is on, and break 6.4a → drop 2 is two segments cut on 8.1 (C8), no sub-frame crossing it', () => {
  assert.equal(LAUNCH_V2, true);
  assert.deepEqual(launchSegmentV2(BR.WHIP_CUT), { from: BR.WHIP_CUT, to: BR.REVERSE });
  assert.deepEqual(launchSegmentV2(BR.REVERSE), { from: BR.REVERSE, to: BR.BREAK_END_V2 });
  for (const F of [BR.WHIP_CUT, BR.CATCH, FULL]) for (const s of shutter(F)) assert.ok(s >= BR.WHIP_CUT && s < BR.REVERSE, `${F}: sub-frame ${s}`);
  for (const F of [BR.REVERSE, BR.BREAK_END_V2 - 1]) for (const s of shutter(F)) assert.ok(s >= BR.REVERSE && s < BR.BREAK_END_V2, `${F}: sub-frame ${s}`);
});

test('C7, the whip’s tail (6.4a → 7.1): his ω stays within (1000 ± 150, 580 ± 60) while he flies left through the world (≈ 120 px a frame on screen at the catch’s zoom) on 64 sub-frames; the catch is on 7.1’s kick, ω at (900, 560)', () => {
  for (let f = BR.WHIP_CUT; f < BR.CATCH; f += 0.25) {
    const [x, y] = omegaCam(f);
    assert.ok(Math.abs(x - 1000) <= 150 && Math.abs(y - 580) <= 60, `${f}: ω at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    // He flies left through the world (his flight, slingState): a world point at his height runs right relative to him.
    const s0 = slingState(f);
    const s1 = slingState(f + 0.25);
    const rel = (g: number, s: typeof s0) => (cam(g, 1500, s.wy)[0] - toScreen(launchCamV2(g), s.wx, s.wy)[0]) / launchCamV2(g).zoom;
    near((rel(f + 0.25, s1) - rel(f, s0)) * 4 * slingState(BR.CATCH).zoom, 120, 1e-6, `${f}: the world streaks past him`);
  }
  for (const F of [BR.WHIP_CUT, BR.WHIP_CUT + 1, BR.CATCH - 1]) assert.equal(launchTemporalV2(F).samples, 64);
  const [x, y] = omegaCam(BR.CATCH);
  near(x, 900, 1e-6, 'ω x on the catch');
  near(y, 560, 1e-6, 'ω y on the catch');
});

test('C7’s after side: he is sharp — one instant per frame (review round 1 F2): on every sub-frame of a whip-tail frame his ω and his size on screen are the frame’s, while the camera (the world) moves under him; stretched along his flight 1.06 → 1 by the catch', () => {
  for (const F of [BR.WHIP_CUT, BR.WHIP_CUT + 1, BR.CATCH - 1, BR.CATCH]) {
    const subs = shutter(F).filter((s) => s < BR.CATCH || F === BR.CATCH);
    const at0 = omegaCam(subs[0]);
    const em0 = heroPoseV2(subs[0]).em * launchCamV2(subs[0]).zoom;
    for (const s of subs) {
      if (F === BR.CATCH && s >= BR.CATCH) continue;
      const o = omegaCam(s);
      near(Math.hypot(o[0] - at0[0], o[1] - at0[1]), 0, 1e-6, `${F}: his ω on sub-frame ${s.toFixed(3)}`);
      near(heroPoseV2(s).em * launchCamV2(s).zoom, em0, 1e-6, `${F}: his size on sub-frame ${s.toFixed(3)}`);
    }
    if (F < BR.CATCH) {
      const a = toScreen(launchCamV2(subs[0]), 1500, 580);
      const b = toScreen(launchCamV2(subs.at(-1)!), 1500, 580);
      assert.ok(Math.abs(b[0] - a[0]) > 10, `${F}: the world moves ${Math.abs(b[0] - a[0]).toFixed(1)} px under him`);
    }
  }
  // The kick's frame's early sub-frames show him where (and as) the catch has him.
  const c0 = omegaCam(BR.CATCH);
  const e = omegaCam(BR.CATCH - 0.1);
  near(Math.hypot(e[0] - c0[0], e[1] - c0[1]), 0, 1e-6, 'the catch on its early sub-frames');
  near(heroPoseV2(BR.CATCH - 0.1).sx, heroPoseV2(BR.CATCH).sx, 1e-12, 'the catch’s squeeze on its early sub-frames');
  near(heroPoseV2(BR.WHIP_CUT).sx, 1 + WHIP_STRETCH, 1e-12, 'stretched along his flight on 6.4a');
  assert.ok(heroPoseV2(BR.CATCH - 1).sx < heroPoseV2(BR.WHIP_CUT + 1).sx && heroPoseV2(BR.CATCH - 1).sx > 1, 'easing out');
});

test('C7’s after side still flies: the camera pushes in 1.30 → 1.55 landing on 7.1’s kick (no speed left), he slides left on screen at a constant speed into the catch, exposed like the graph side’s whip (shutter 0.5, 64 sub-frames) — and the fork stays off-frame right (but for its tip leaving the corner on 6.4a)', () => {
  const z = (f: number) => launchCamV2(f).zoom;
  near(z(BR.WHIP_CUT), WHIP_IN_ZOOM, 1e-9, 'the cut');
  for (let f = BR.WHIP_CUT; f < BR.CATCH; f += 0.25) assert.ok(z(f + 0.25) > z(f), `${f}: pushing in`);
  near(z(BR.CATCH), 1.55, 1e-9, 'the catch');
  near((z(BR.CATCH) - z(BR.CATCH - 0.05)) / 0.05, 0, 0.05, 'landing on the kick');
  const v = [0, 1, 2].map((i) => omegaCam(BR.WHIP_CUT + i + 1)[0] - omegaCam(BR.WHIP_CUT + i)[0]);
  for (const d of v) near(d, -100 / 3, 1e-6, 'a constant slide left');
  // On the cut his ω is exactly where the graph side's whip holds it (0 px eye trace across C7).
  const g = graphCam(BR.WHIP_CUT - 0.25).omega;
  near(Math.hypot(omegaCam(BR.WHIP_CUT)[0] - g[0], omegaCam(BR.WHIP_CUT)[1] - g[1]), 0, 0.5, 'ω across C7');
  for (const F of [BR.WHIP_CUT, BR.CATCH - 1]) near(launchTemporalV2(F).shutter, 0.5, 1e-12, `${F}: the whip's exposure`);
  near(launchTemporalV2(BR.CATCH).shutter, 0.35, 1e-12, 'the catch: as built');
  // The graph side's whip is exposed the same way (its live temporal).
  near(graphTemporal(BR.WHIP_CUT - 1).shutter, 0.5, 1e-12, 'the graph side');
  // Nothing of the fork in frame on the whip's tail (its pills are 120 px wide: their centre lines stay 60 px × zoom past the frame) —
  // but for its yellow prong's tip whipping out of the top-right corner on 6.4a and the next frame (above y 200, right of x 1700).
  for (const f of [BR.WHIP_CUT, BR.WHIP_CUT + 1]) {
    const [x, y] = cam(f, ...forkAt(f).U);
    assert.ok(x > 1700 && y < 200, `${f}: the tip at (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }
  for (let f = BR.WHIP_CUT + 1.5; f < BR.CATCH; f += 0.25) {
    const k = forkAt(f);
    for (const [a, b] of [[k.crotch, k.U], [k.crotch, k.L], [k.crotch, k.stem]] as const) {
      for (let s = 0; s <= 1; s += 0.05) {
        const [x, y] = cam(f, a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s);
        assert.ok(x - 60 * z(f) > 1920 || y - 60 * z(f) > 1080 || y + 60 * z(f) < 0, `${f}: the fork at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      }
    }
  }
});

test('the whip’s streaks: the speed lines rush right through the empty violet above and below him, and the ground is whip-streaked (its tints and the torn chrome’s colours, soft, rushing right with the world) — all behind him; on the catch they snap back: 30 % left on the kick’s own frame, gone by its third (review round 1 F2)', () => {
  for (const s of TRAIL) assert.ok(s.y < 300 || s.y > 820, `a speed line at y ${s.y} crosses his face`);
  assert.equal(trailAt(BR.WHIP_CUT - 0.5), 0);
  for (let f = BR.WHIP_CUT; frameOf(f) < BR.CATCH; f += 0.25) assert.equal(trailAt(f), 1);
  for (const s of shutter(BR.CATCH)) near(trailAt(s), trailAt(BR.CATCH), 1e-12, `${s}: one instant on the kick's frame`);
  assert.ok(trailAt(BR.CATCH) > 0.25 && trailAt(BR.CATCH) < 0.35, `${trailAt(BR.CATCH).toFixed(3)} left on the kick`);
  assert.ok(trailAt(BR.CATCH + 1) > 0 && trailAt(BR.CATCH + 1) < 0.1);
  assert.equal(trailAt(BR.CATCH + 2), 0);
  // The ground's streaks cover the frame top to bottom, rush right at GROUND_SPEED, and are under everything of his.
  assert.ok(GROUND_STREAKS.length >= 40);
  const ys = GROUND_STREAKS.map((t) => t.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] < 60, `a gap in the streaks at y ${ys[i - 1].toFixed(0)}–${ys[i].toFixed(0)}`);
  assert.ok(ys[0] < 40 && ys.at(-1)! > 1040, 'top to bottom');
  assert.ok(GROUND_SPEED >= 120, 'whip speed');
  const level = (f: number) => launchAtV2(f, L).back.under.filter((x) => x.kind === 'segment' && Math.abs(x.rot ?? 0) < 1e-9).length;
  assert.ok(level(BR.WHIP_CUT + 1) >= 2 * TRAIL.length + GROUND_STREAKS.length, 'drawn on the tail');
  // On the cut frame they come in at half strength (the graph side's violet strip lands flat; the cut's change stays under the whip's start).
  const strength = (f: number) => launchAtV2(f, L).back.under.reduce((a, x) => a + (x.kind === 'segment' && x.alpha !== undefined ? x.alpha : 0), 0);
  for (const s of shutter(BR.WHIP_CUT)) near(strength(s) / strength(BR.WHIP_CUT + 1), 0.5, 1e-9, `${s}: half strength on the cut frame`);
  assert.ok(level(BR.CATCH + 3) < TRAIL.length, 'gone after the catch');
});

test('the cars (review round 2 CONCERTINA-SCALE): the train rams his back one a frame on the four crunch thumps (7.1 − 2 … 7.1 + 1, the third on the catch) — each rider ≈ half his size at his face, sharp and squashed 0.62 against his back on its own frame, drawn on top of the ones still coming; rushing in from frame-right before it, gone after it — and its colour’s two stack layers snap in on the next frame, so the stack builds yellow, mint, coral, cream', () => {
  const screenOf = (f: number) =>
    carsAt(f).map((c) => {
      const [x, y] = toScreen(launchCamV2(f), c.x, c.y);
      return { color: c.color, sx: c.sx, x, y, em: c.em * launchCamV2(f).zoom };
    });
  const colors = ['yellow', 'mint', 'coral', 'cream'];
  assert.equal(carsAt(BR.WHIP_CUT - 0.5).length, 0, 'none before the cut');
  // On the audio's crunch (scripts/audio/sections/break.mjs: CRUNCH = CATCH − 2, four thumps a frame apart; tests/breakAudio pins it).
  assert.deepEqual([...CAR_RAMS], [BR.CATCH - 2, BR.CATCH - 1, BR.CATCH, BR.CATCH + 1]);
  CAR_RAMS.forEach((ram, i) => {
    const [hx, hy] = omegaCam(ram);
    const hem = heroPoseV2(ram).em * launchCamV2(ram).zoom;
    const subs = shutter(ram);
    const first = screenOf(subs[0]).at(-1)!;
    for (const s of subs) {
      const car = screenOf(s).at(-1)!; // the rammed one, on top
      assert.equal(car.color, colors[i], `${ram}: car ${i + 1} rams`);
      near(car.sx, 0.62, 1e-12, `${ram}: squashed`);
      near(Math.hypot(car.x - first.x, car.y - first.y), 0, 1e-6, `${ram}: sharp on ${s.toFixed(3)}`);
      assert.ok(car.em >= 0.4 * hem && car.em <= 0.55 * hem && car.em >= 220 && car.em <= 300, `${ram}: rider em ${car.em.toFixed(0)} (his ${hem.toFixed(0)})`);
      assert.ok(car.x - hx > 0.9 * hem, `${ram}: at his back (rider ${(car.x - hx).toFixed(0)} px right of his ω)`);
      assert.ok(Math.abs(car.y - hy) < 0.45 * hem, `${ram}: at his face (${(car.y - hy).toFixed(0)} px from his ω)`);
      assert.ok(car.x + 0.5 * car.em < 1920, `${ram}: in frame`);
    }
    // Before its ram it rushes in from the right (further right, moving left through the shutter).
    if (ram - 1 >= BR.WHIP_CUT) {
      const pre = shutter(ram - 1);
      const a = screenOf(pre[0]).find((c) => c.color === colors[i])!;
      const z = screenOf(pre.at(-1)!).find((c) => c.color === colors[i])!;
      assert.ok(z.x < a.x - 20 && z.x > first.x, `${ram - 1}: car ${i + 1} rushing in (${a.x.toFixed(0)} → ${z.x.toFixed(0)})`);
    }
    // Gone from the next frame: its rider is the two stack layers of its colour (none of them before).
    for (const s of shutter(ram + 1)) assert.ok(!carsAt(s).some((c) => c.color === colors[i]), `${ram + 1}: car ${i + 1} gone`);
    const layers = (f: number) => bandAtV2(f).filter((c) => c.k <= 8 && c.color === colors[i] && c.scale > 0).length;
    for (const s of shutter(ram)) assert.equal(layers(s), 0, `${s}: no ${colors[i]} layer while its car rams`);
    for (const s of shutter(ram + 1)) assert.equal(layers(s), 2, `${s}: the ${colors[i]} layers snapped in`);
  });
  assert.equal(carsAt(BR.CATCH + 1.75).length, 0, 'all gone from 7.1 + 2');
  // The stack bursts out on the kick (not two frames later), the ink 9th with it.
  for (const s of shutter(BR.CATCH)) assert.ok(stackStepV2(s) > 3, `${s}: the stack's step ${stackStepV2(s).toFixed(2)}`);
  for (const s of shutter(BR.CATCH - 1)) assert.equal(bandAtV2(s)[8].scale, 0, 'no ink copy before the burst');
  for (const s of shutter(BR.CATCH)) assert.ok(bandAtV2(s)[8].scale > 0, 'the ink copy with the burst');
});

test('the cords twang on the whip’s tail (whip-streaked by the 64 sub-frames) and are straight and taut from the catch', () => {
  const ink = BREAK_PALETTE.ink;
  const cords = (f: number) => launchAtV2(f, L).back.under.filter((x) => x.kind === 'segment' && x.color === ink && Math.abs(x.rot ?? 0) > 0.05);
  assert.ok(cords(BR.WHIP_CUT + 1.1).length >= cords(BR.CATCH + 1).length + 16, 'bowed (many segments) on the tail');
});

test('the catch: he carries on 40 px (by 7.1 + 3) and the band pulls him back by 7.1&; the cords thin 14 → 10 px on screen with the stretch, back to 14', () => {
  near(omegaCam(BR.CATCH + 3)[0], 860, 3, 'carried on 40 px');
  assert.ok(Math.abs(omegaCam(BR.CATCH + 12)[0] - 900) < 6, 'pulled back by 7.1&');
  near(cordPx(BR.CATCH - 1), 14, 1e-9, 'slack in the whip');
  near(cordPx(BR.CATCH + 3), 10, 1e-9, 'thinnest at the stretch');
  near(cordPx(BR.CATCH + 15), 14, 0.05, 'slack again');
});

test('one notch per kick (7.2, 7.3, 7.4, 7.4&): his em 360 → 324 → 292 → 262 → 236 and the camera 1.55 → 1.20 → 0.95 → 0.76 → 0.62, each a launch already moving on its kick’s frame and still the frame before', () => {
  const keys = SLING_KEYS;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    // v07 WP5: the hold before each notch winds up (windUp of the step crept by the kick's previous frame); the kick carries the rest.
    near(heroPoseV2(k.at - 1).em, keys[i - 1].em + (k.em - keys[i - 1].em) * windUp(k.at - 1, i), 1e-9, `em before notch ${i}`);
    const kick = Math.abs(heroPoseV2(k.at).em - heroPoseV2(k.at - 1).em);
    const before = Math.abs(heroPoseV2(k.at - 1).em - heroPoseV2(k.at - 2).em);
    assert.ok(kick > 0.1 * Math.abs(k.em - keys[i - 1].em) && kick > 3 * before, `notch ${i} is the hit: ${kick.toFixed(2)} on its kick, ${before.toFixed(2)} the frame before`);
    // Home 11 frames on, but for the next notch's wind-up already creeping (v07).
    const next = keys[i + 1];
    const w = next ? windUp(k.at + 11, i + 1) : 0;
    near(heroPoseV2(k.at + 11).em, k.em + (next ? (next.em - k.em) * w : 0), 1e-9, `em settled after notch ${i}`);
    near(slingState(k.at + 11).wx, k.wx + (next ? (next.wx - k.wx) * w : 0), 1e-9, `ω settled after notch ${i}`);
  }
  // His ω on screen where nothing winds up: the bar's last (full draw). (v06 also pinned 7.3 − 1 and 7.4 − 1; they are mid-wind-up now.)
  const want: [number, number, number][] = [[FULL, 720, 640]];
  for (const [f, x, y] of want) {
    const [sx, sy] = omegaCam(f);
    assert.ok(Math.hypot(sx - x, sy - y) < 4, `${f}: ω on screen (${sx.toFixed(1)}, ${sy.toFixed(1)}) for (${x}, ${y})`);
  }
  const s = slingState(FULL);
  near(s.zoom, 0.62, 1e-9, 'Z on full draw');
});

test('v07 — the holds between the notches wind up (FW5 / FW6: v06’s 3322–3335 was 14 dead frames under the music): from 3 frames after a kick he and the camera creep WIND_UP of the next step, moving every frame, faster toward the kick; none before the last notch; full draw unchanged', () => {
  assert.deepEqual([1, 2, 3, 4].map(windUpShare), [WIND_UP, WIND_UP, WIND_UP, 0]);
  for (let i = 1; i <= 3; i++) {
    const from = (i === 1 ? BR.CATCH : SLING_KEYS[i - 1].at) + 3;
    const to = SLING_KEYS[i].at;
    near(windUp(from, i), 0, 1e-12, `notch ${i}: from rest`);
    near(windUp(to, i), WIND_UP, 1e-12, `notch ${i}: whole on the kick`);
    let prev = 0;
    for (let f = from + 1; f < to; f++) {
      const step = windUp(f, i) - windUp(f - 1, i);
      assert.ok(step > 0 && step >= prev - 1e-12, `notch ${i}: creeping, faster and faster at ${f}`);
      prev = step;
      // The camera's zoom moves every frame of the hold (≥ 0.1 % a frame): the hold lives.
      const z0 = slingState(f - 1).zoom;
      const z1 = slingState(f).zoom;
      if (f > from + 6) assert.ok(Math.abs(z1 - z0) / z0 > 0.001, `notch ${i}: the camera moves at ${f} (${(Math.abs(z1 - z0) / z0).toFixed(4)})`);
    }
  }
  // Full draw (8.1 − 1) is v06's exactly: the last notch has no wind-up and the third is long home.
  const s = slingState(FULL);
  near(s.zoom, 0.62, 1e-9, 'Z on full draw');
  near(s.em, SLING_KEYS[4].em, 1e-9, 'em on full draw');
});

test('full draw (the sheet’s 7.4& acceptance, settled on 8.1 − 1): each arm ≥ 450 px visible past his silhouette, the V opens ≥ 12°, the arms ≥ 120 px apart at the upper tip, both tips ≥ 30 px below [WARN], the prongs and stem in frame', () => {
  const f = FULL;
  const [U, Lo] = slingCords(f)!;
  const sc = (p: readonly [number, number]) => cam(f, p[0], p[1]);
  for (const c of [U, Lo]) {
    const [a, b] = [sc(c.exit), sc(c.to)];
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) >= 450, `an arm shows ${Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(0)} px`);
  }
  const P = sc(U.from);
  const angle = (T: [number, number]) => (Math.atan2(P[1] - T[1], T[0] - P[0]) * 180) / Math.PI;
  const tu = sc(U.to);
  const tl = sc(Lo.to);
  assert.ok(angle(tu) - angle(tl) >= 12, `the V opens ${(angle(tu) - angle(tl)).toFixed(1)}°`);
  const dx = tl[0] - P[0];
  const dy = tl[1] - P[1];
  const perp = Math.abs((tu[0] - P[0]) * dy - (tu[1] - P[1]) * dx) / Math.hypot(dx, dy);
  assert.ok(perp >= 120, `the arms are ${perp.toFixed(0)} px apart at the upper tip`);
  const w = windowAtV2(f);
  const warnBottom = w.box!.y1 + 6 + 30;
  for (const t of [tu, tl]) assert.ok(t[1] - 30 >= warnBottom + 30 - 30 && t[1] >= warnBottom + 30, `a tip at y ${t[1].toFixed(0)}, [WARN] ends at ${warnBottom.toFixed(0)}`);
  for (const p of forkParts(forkAt(f))) {
    if (p.kind !== 'pill') continue;
    for (const e of [p.a, p.b]) {
      const [x, y] = sc(e);
      const r = (p.w / 2) * slingCam(f).zoom;
      assert.ok(x - r >= 0 && x + r <= 1920 && y - r >= 0 && y + r <= 1080, `${p.color} prong end (${x.toFixed(0)}, ${y.toFixed(0)}) in frame`);
    }
  }
});

test('the links: from 7.3 the stack’s brackets fly onto the cords — "(" ×4 on the upper (yellow) arm, ")" ×4 on the lower — link em 160, turned across their cords, on the visible arm’s k / 5 points; the gaps widen with every step', () => {
  const f = at(7, 3.5) - 1; // flown, before the ripple
  const cords = slingCords(f, 0)!;
  const links = bandAtV2(f).filter((c) => c.k <= 8);
  assert.equal(links.length, 8);
  for (const c of links) {
    const upper = c.k <= 4;
    assert.equal(c.ch, upper ? '(' : ')');
    near(c.scale * 360, LINK7, 1e-9, `link ${c.k} em`);
    const cd = cords[upper ? 0 : 1];
    const j = upper ? c.k : c.k - 4;
    const want = [cd.exit[0] + ((cd.to[0] - cd.exit[0]) * j) / 5, cd.exit[1] + ((cd.to[1] - cd.exit[1]) * j) / 5];
    assert.ok(Math.hypot(c.bx - want[0], c.by - want[1]) < 3, `link ${c.k} on its arm’s ${j}/5 point`);
    const ang = (Math.atan((cd.to[1] - cd.exit[1]) / (cd.to[0] - cd.exit[0])) * 180) / Math.PI;
    near(c.rot, ang, 0.5, `link ${c.k} turned across its cord`);
  }
  // The mean gap between neighbours (world px, the band's own stretch) grows on 7.4 and 7.4&.
  const gap = (g: number) => {
    const b = bandAtV2(g);
    let s = 0;
    for (const side of [[1, 2, 3, 4], [5, 6, 7, 8]]) for (let i = 1; i < 4; i++) s += Math.hypot(b[side[i]].bx - b[side[i] - 1].bx, b[side[i]].by - b[side[i] - 1].by);
    return s / 6;
  };
  const g = [gap(BR.NOTCHES[2] - 1), gap(BR.NOTCHES[3] - 1), gap(FULL)];
  assert.ok(g[0] < g[1] && g[1] < g[2], `gaps ${g.map((v) => v.toFixed(1)).join(' < ')}`);
});

test('the extrude stack (7.1 → 7.3): 8 coloured copies and a 9th in ink behind him, packed tight as the cars snap in; the concertina springs the step ≈ 13 → 9 px on the catch; then v04’s breaths and colour chase, exactly, one bar later; on 7.3’s own frame every face drops whole', () => {
  near(stackStepV2(CAR_RAMS[0] + 0.25), 0, 1e-9, 'nothing before the first car’s snap');
  assert.equal(bandAtV2(CAR_RAMS[0] + 0.25).length, 0, 'no stack while the first car rams');
  near(stackStepV2(BR.CATCH - 0.75), PACK_STEP, 1e-9, 'packed tight while the cars snap in (review round 2)');
  const peak = Math.max(...Array.from({ length: 24 }, (_, i) => stackStepV2(BR.CATCH + i / 4)));
  assert.ok(peak > 12 && peak < 14, `the concertina overshoots to ${peak.toFixed(2)}`);
  near(stackStepV2(BR.CATCH + 11), 9, 0.4, 'about 9 by 7.1&');
  for (let f = BR.CATCH + 14; f < BR.GRIP; f += 0.5) near(stackStepV2(f), stackStep(f - 96), 1e-12, `v04’s breaths at ${f}`);
  for (let f = BR.CATCH; f < BR.GRIP; f += 0.5) assert.equal(chaseV2(f), chaseOf(f - 96), `v04’s chase at ${f}`);
  const b = bandAtV2(BR.GRIP - 1);
  assert.equal(b.length, 9);
  assert.equal(b[8].color, 'ink');
  for (const c of b) assert.equal(c.core, 1, `copy ${c.k} whole before the grip`);
  for (const s of shutter(BR.GRIP)) for (const c of bandAtV2(s)) assert.equal(c.core, 0, `${s}: copy ${c.k}'s face is gone`);
  for (const s of shutter(BR.GRIP)) assert.ok(bandAtV2(s)[8].scale <= 0, `${s}: the ink copy is gone`);
});

test('the reused window (sheet §4.1, function-level identity): from the dialog to [ROOT] every glyph and block is v04’s one bar earlier — only the dialog face’s colour differs (amber is his only)', () => {
  for (let f = BR.DIALOG_V2; f < BR.ROOT_ROW - 0.5; f += 0.5) {
    const a = windowAtV2(f);
    const b = windowAt(f - 96);
    assert.deepEqual(a.lines, b.lines, `${f}: rows`);
    assert.deepEqual(a.rects, b.rects, `${f}: blocks`);
    assert.equal(a.glyphs.length, b.glyphs.length, `${f}: glyphs`);
    a.glyphs.forEach((g, i) => {
      const { color: ca, ...ga } = g;
      const { color: cb, ...gb } = b.glyphs[i];
      assert.deepEqual(ga, gb, `${f}: glyph ${i}`);
      void ca;
      void cb;
    });
  }
});

test('the uppercut (v04’s solve with this frame’s camera and step): still until 7.1a, his right ง’s ink top on [ LOUDER ]’s bottom edge on 7.2 exactly, back by 7.2&; v04’s curve one bar later', () => {
  const fist = (f: number) => heroCharsV2(f, L).filter((c) => c.ch === 'ง')[1];
  for (const f of [BR.CATCH, at(7, 1.75) - 1]) {
    near(fist(f).dx, 0, 1e-9, `no offset on ${f}`);
    near(fist(f).dy, 0, 1e-9, `no offset on ${f}`);
  }
  const c = fist(BR.LOUDER_V2);
  const h = heroPoseV2(BR.LOUDER_V2);
  const a = (c.rot * Math.PI) / 180;
  const top: [number, number] = [c.x + Math.sin(a) * FIST_TOP * h.em * h.sy, c.y - Math.cos(a) * FIST_TOP * h.em * h.sy];
  const [sx, sy] = cam(BR.LOUDER_V2, top[0], top[1]);
  const z = rigAt(BR.LOUDER_V2).zoom;
  near(960 + (sx - 960) * z, LOUDER_BUTTON.x, 0.5, 'under the button’s centre');
  near(540 + (sy - 540) * z, LOUDER_BUTTON.bottom, 0.5, 'its top on the button’s bottom edge');
  // v04's curve, one bar later: the fist's offset is the solve times uppercut(f − one bar) (exactly 1 on 7.2).
  const reach = [fist(BR.LOUDER_V2).dx, fist(BR.LOUDER_V2).dy];
  near(uppercut(BR.LOUDER_V2 - 96), 1, 1e-12, 'on the kick');
  for (let f = BR.CATCH; f < BR.GRIP - 0.5; f += 0.5) {
    const p = fist(f);
    near(p.dx, reach[0] * uppercut(f - 96), 1e-9, `${f}: dx`);
    near(p.dy, reach[1] * uppercut(f - 96), 1e-9, `${f}: dy`);
  }
  assert.ok(windowAtV2(BR.LOUDER_V2).pressed && windowAtV2(BR.LOUDER_V2 + 5).pressed && !windowAtV2(BR.LOUDER_V2 + 6).pressed, '[ LOUDER ] pressed for 6 frames');
  assert.ok(windowAtV2(BR.LOUDER_V2).glyphs.some((g) => g.ch === '✧'), 'the ✧ pops at the contact');
});

test('the red cursor (the antivirus’s hand): in from the right toward [ OK ], over [ LOUDER ] on 7.2 — bonked away up-left, spinning — back to hover by the window, shaking ±4 px every 2 frames from 7.3; ⊘ on access granted, grey, off the bottom by 7.4&', () => {
  assert.equal(cursorAt(BR.CURSOR_OK.from - 1), null);
  const over = cursorAt(BR.LOUDER_V2 - 0.25)!;
  assert.ok(Math.abs(over.x - LOUDER_BUTTON.x) < 60 && over.y < LOUDER_BUTTON.bottom, 'over [ LOUDER ] as the fist lands');
  const bonked = cursorAt(BR.LOUDER_V2 + 6)!;
  assert.ok(bonked.x < over.x - 200 && bonked.y < over.y - 150 && Math.abs(bonked.rot) > 180, 'bonked away up-left, spinning');
  const shakes = [0, 1, 2, 3].map((i) => cursorAt(BR.GRIP + 2 * i)!.x);
  assert.ok(Math.abs(shakes[0] - shakes[1]) === 8 && Math.abs(shakes[1] - shakes[2]) === 8, `shaking ±4 px (${shakes.join(', ')})`);
  for (const f of [BR.ROOT_V2, BR.GRIP, BR.GRANTED_V2 - 1]) assert.ok(!cursorAt(f)!.deny);
  assert.ok(cursorAt(BR.GRANTED_V2)!.deny, '⊘ on access granted');
  assert.deepEqual(cursorAt(BR.GRANTED_V2)!.color, cursorAt(BR.LOUDER_V2)!.color, 'red first');
  assert.notDeepEqual(cursorAt(BR.GRANTED_V2 + 4)!.color, cursorAt(BR.LOUDER_V2)!.color, 'then grey');
  assert.ok(cursorAt(BR.DENIED.to - 1)!.y > 1080, 'off the bottom');
  assert.equal(cursorAt(BR.DENIED.to), null);
});

test('the window’s new rows: [ROOT] uid=0 (•ω•) on 7.4e (tag and face in his amber), the volume (113 %, pink) and [WARN] party overload (pink, 3 on / 3 off) on full draw; nothing in his amber but him', () => {
  assert.ok(!windowAtV2(BR.ROOT_ROW - 1).lines.includes('[ROOT] uid=0 (•ω•)'));
  assert.ok(windowAtV2(BR.ROOT_ROW).lines.includes('[ROOT] uid=0 (•ω•)'));
  const w = windowAtV2(BR.OVERLOAD_V2);
  assert.ok(w.lines.some((l) => l.endsWith(' 113%')));
  assert.ok(w.lines.includes('[WARN] party overload'));
  const on = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => windowAtV2(BR.OVERLOAD_V2 + i).lines.includes('[WARN] party overload'));
  assert.deepEqual(on, [true, true, true, false, false, false, true, true, true]);
  const amber = [1, 0.4286, 0.0482];
  const amberGlyphs = windowAtV2(FULL).glyphs.filter((g) => Math.abs(g.color[0] - 1) < 1e-6 && g.color[1] < 0.6 && g.color[1] > 0.3);
  assert.deepEqual([...new Set(amberGlyphs.map((g) => g.ch))].sort(), ['(', ')', 'O', 'R', 'T', '[', ']', 'ω', '•'].sort(), 'amber: [ROOT] and (•ω•)');
  void amber;
});

test('C8 (8.1 − 1 | 8.1): the window is screen-fixed and identical on both frames, his ω moves ≤ 60 px, the links keep their colours and sides', () => {
  assert.deepEqual(windowAtV2(BR.REVERSE), windowAtV2(BR.REVERSE - 1));
  const a = omegaOnScreenV2(BR.REVERSE - 1);
  const b = omegaOnScreenV2(BR.REVERSE);
  // v07 WP5 (FW5): the reverse angle opens anchor-locked on him (v06: 60 px and 64 % bigger); only the rig's kick punch moves him.
  assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) <= 12, `ω moves ${Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1)} px`);
  // He holds the anchor (≤ 40 px from break 7's last) for 3 frames across the line and the camera settles him into the aim over the beat.
  for (const f of [BR.REVERSE - 2, BR.REVERSE + 1]) {
    const c = omegaOnScreenV2(f);
    assert.ok(Math.hypot(c[0] - a[0], c[1] - a[1]) <= 40, `${f}: ω ${Math.hypot(c[0] - a[0], c[1] - a[1]).toFixed(1)} px from 8.1 − 1`);
  }
  const l7 = bandAtV2(BR.REVERSE - 1).filter((c) => c.k <= 8);
  const l8 = bandAtV2(BR.REVERSE).filter((c) => c.k <= 8);
  assert.deepEqual(l8.map((c) => [c.k, c.ch, c.color]), l7.map((c) => [c.k, c.ch, c.color]));
});

test('the energy standard over break 7: ≥ 32 sub-frames wherever the camera moves more than 20 px a frame, and the camera with the rig never holds still for more than 12 frames', () => {
  const at2: CameraAt = (f) => ({ pose: camPose(launchCamV2(f)), samples: onShutter(f, launchTemporalV2(f)) });
  assertFastMovesSampled(BR.WHIP_CUT, BR.REVERSE, at2, (f) => f === BR.CATCH);
  assertNeverStill(BR.CATCH, BR.REVERSE, poseMoved(at2));
});

test('his faces: (ง•ω•)ง✧ from the catch, ─=≡Σ((( つ•ω•)つ whole on 7.3’s frame (the grip); his brows drop in on 7.1e and 7.1& (v04’s drop, a bar later) and stay', () => {
  for (const s of shutter(BR.GRIP - 1)) assert.equal(heroPoseV2(s).text, '(ง•ω•)ง✧');
  for (const s of shutter(BR.GRIP)) assert.equal(heroPoseV2(s).text, '─=≡Σ((( つ•ω•)つ');
  assert.equal(browsV2(BR.BROWS_V2[0] - 6, L).length, 0);
  const b = browsV2(BR.BROWS_V2[1], L);
  assert.equal(b.length, 2);
  assert.ok(b.every((c) => (c.alpha ?? 1) === 1));
  assert.equal(browsV2(FULL, L).length, 2, 'brows on at full draw');
  const parts = heroCharsV2(FULL, L).map((c) => c.part);
  assert.deepEqual(parts, ['speed', 'speed', 'speed', 'speed', 'speed', 'speed', 'open', 'tsu', 'eyeL', 'mouth', 'eyeR', 'close', 'tsu']);
});

test('every character bars 7–8 draw is in their atlas lists, and every string in the glyph check', () => {
  const hero = new Set(LAUNCH_ATLAS_V2.hero.flatMap((t) => [...t]));
  const mono = new Set(LAUNCH_ATLAS_V2.mono.flatMap((t) => [...t]));
  const checked = new Set([...BREAK_TEXTS, ...BREAK_TEXTS_V2].flatMap((t) => [...t.text]));
  for (let f = BR.WHIP_CUT; f < BR.BREAK_END_V2; f += 1) {
    const fr = launchAtV2(f, L);
    for (const g of [...(fr.back.glyphs.hero ?? []), ...(fr.front.glyphs.hero ?? []), ...(fr.top.glyphs.hero ?? []), ...(fr.window.glyphs.hero ?? [])]) {
      assert.ok(hero.has(g.ch), `${f}: ${g.ch} in the hero atlas`);
      assert.ok(checked.has(g.ch), `${f}: ${g.ch} in the glyph check`);
    }
    for (const g of fr.window.glyphs.mono ?? []) {
      assert.ok(mono.has(g.ch), `${f}: ${g.ch} in the mono atlas`);
      assert.ok(checked.has(g.ch), `${f}: ${g.ch} in the glyph check`);
    }
  }
});
