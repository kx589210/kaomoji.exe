// Renderer B, bar 3 of the cosmos (src/shots/cosmosSolar.ts, its leaf src/shots/cosmosSolarStamps.ts): the slingshot spirograph against
// the design (notes/cosmos3/final.md §4 bar 17) and the build sheet (notes/bcos/sheet.md §4.3, §6.3): the camera is the design's
// (landed low on Earth's ring looking at the Sun, FOV 70°; the dive; the slingshot round the Sun; the exit looking down 30°), the rings'
// clock and the slow-mo, the cursors and what they infect, the Sun that turns over into him inside the peak blur, the stamps' slots (the
// A → B contract, a leaf A can import), the spirograph through the past camera (8 rings × 24 trails), the fling. Every pin is part-local
// (the score's names), so the film map may move.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO_FACES, PLANETS, SUN_FACE } from '../src/content/castCosmos.ts';
import { CURSORS, DIVE, FLING, LAP, LEVELS, ORBIT_LAND, RATCHETS, SLINGSHOT, SLOWMO, cs } from '../src/score/cosmos.ts';
import * as S from '../src/shots/cosmosSolar.ts';
import * as Leaf from '../src/shots/cosmosSolarStamps.ts';

const D2R = Math.PI / 180;
/** A design frame (cosmos 3.1 = 1536) as a film instant on today's map. */
const d = (design: number): number => LEVELS.solar + design - 1536;

test('the landing is the design’s: on Earth’s ring 0.35 over the ecliptic, looking at the Sun, FOV 70°; the Sun ≈ 520 px at the left third', () => {
  assert.ok(Math.abs((2 * Math.atan(960 / S.FOCAL)) / D2R - 70) < 0.2, 'FOV 70° across the frame');
  const cam = S.solarCamera(ORBIT_LAND.at);
  assert.ok(Math.abs(Math.hypot(cam.eye[0], cam.eye[2]) - 1.75) < 1e-9 && Math.abs(cam.eye[1] - 0.35) < 1e-9, 'on Earth’s ring, 0.35 up');
  assert.deepEqual(cam, Leaf.landingCamera(), 'B’s camera on 3.1 is the leaf’s landing camera (the contract’s)');
  // Looking at the Sun, turned so that it sits at the left third, cropped by nothing but its rays; ≈ 520 px across.
  for (const f of [ORBIT_LAND.at, ORBIT_LAND.settled, DIVE.from - 1]) {
    const c = S.solarCamera(f);
    const sun = S.project(c, [0, 0, 0])!;
    const D = 2 * S.SUN.r * sun.k;
    assert.ok(sun.x > -760 && sun.x < -560 && Math.abs(sun.y) < 80, `${f - LEVELS.solar}: the Sun at ${sun.x.toFixed(0)}, ${sun.y.toFixed(0)}`);
    assert.ok(D > 460 && D < 600, `${f - LEVELS.solar}: the Sun ${D.toFixed(0)} px across`);
    // The Sun is in the view's vertical plane up to the yaw: the camera looks at it, turned 27° right.
    const toSun = [-c.eye[0], -c.eye[1], -c.eye[2]];
    const l = Math.hypot(toSun[0], toSun[1], toSun[2]);
    const ang = Math.acos((toSun[0] * c.fwd[0] + toSun[1] * c.fwd[1] + toSun[2] * c.fwd[2]) / l) / D2R;
    assert.ok(Math.abs(ang - 27) < 3, `turned ${ang.toFixed(1)}° off the Sun`);
  }
  // Huge arcs of type: the near rings' names and faces pass the lens at caps ≥ 60 px (the largest far bigger).
  const f = ORBIT_LAND.settled;
  const c = S.solarCamera(f);
  const caps = S.SOLAR_CARDS.filter((x) => x.row === 0)
    .map((x) => ({ x, q: S.project(c, S.cardPos(x, f), 0.05) }))
    .filter((o) => o.q && Math.abs(o.q.x) < 960 && Math.abs(o.q.y) < 540)
    .map((o) => 0.73 * o.x.em * o.q!.k);
  assert.ok(caps.filter((v) => v >= 60).length >= 6, `${caps.filter((v) => v >= 60).length} cards at cap ≥ 60 px`);
  assert.ok(Math.max(...caps) > 150, `the nearest type ${Math.max(...caps).toFixed(0)} px`);
  // Earth (him) at the right third, big: the subject opposite the Sun.
  const e = S.project(c, S.cardPos(S.EARTH_CARD, f))!;
  assert.ok(e.x > 300 && e.x < 700 && Math.abs(e.y) < 200, `Earth at ${e.x.toFixed(0)}, ${e.y.toFixed(0)}`);
  assert.ok(S.EM.hero * e.k > 180, `Earth’s globe ${(S.EM.hero * e.k).toFixed(0)} px`);
});

test('the rings run as banners along their orbits (read the right way round from the lens); Earth alone faces the lens', () => {
  const f = ORBIT_LAND.settled;
  const eye = S.solarCamera(f).eye;
  for (const c of S.SOLAR_CARDS.filter((x) => x.row === 0 && x.j % 5 === 0)) {
    const run = S.cardRun(c, f, eye);
    const a = S.cardAngle(c, f);
    // Along the ring (perpendicular to the radius), level.
    assert.ok(Math.abs(run[0] * Math.cos(a) - run[2] * Math.sin(a)) < 1e-9 && run[1] === 0);
    // The lens sees its front: run × up points back toward the lens.
    const p = S.cardPos(c, f);
    const n = [-run[2], 0, run[0]];
    assert.ok(n[0] * (eye[0] - p[0]) + n[2] * (eye[2] - p[2]) >= -1e-9, `${S.RINGS[c.ring].name} ${c.j} reads mirrored`);
  }
  assert.equal(S.MICRO.under < 0 && S.MICRO.over > 0.12, true, 'the micro rows run under and over the main row');
});

test('the dive closes on the Sun and turns onto it; the slingshot swings 180° round it (≈ 26°/f on the kick) with the Sun on the centre (E12)', () => {
  const sunAt = (f: number) => S.project(S.solarCamera(f), [0, 0, 0])!;
  const landed = sunAt(DIVE.from);
  const dived = sunAt(DIVE.to);
  assert.ok(Math.hypot(dived.x, dived.y) < 2, 'on the centre by the slingshot');
  assert.ok(dived.k > 1.3 * landed.k, 'the Sun swells as the camera dives at it');
  assert.ok(Math.abs(Math.hypot(S.solarCamera(DIVE.to).eye[0], S.solarCamera(DIVE.to).eye[2]) - S.ORBIT.dive.r) < 0.03);
  const step = (f: number) => (S.azimuth(f + 0.5) - S.azimuth(f - 0.5)) / D2R;
  assert.ok(step(SLINGSHOT) > 20 && step(SLINGSHOT) < 30, `peak ${step(SLINGSHOT).toFixed(1)}°/f`);
  assert.ok(Math.abs((S.azimuth(SLINGSHOT + 8) - S.azimuth(SLINGSHOT - 8)) / D2R - 180) < 6);
  for (let f = SLINGSHOT - 3; f <= SLINGSHOT + 3; f += 0.5) {
    const sun = sunAt(f);
    assert.ok(Math.hypot(sun.x, sun.y) <= 80, `the Sun at ${f - SLINGSHOT}: ${sun.x.toFixed(0)}, ${sun.y.toFixed(0)}`);
  }
  // The card turns over inside the blur: its face swaps edge-on, between the kick's neighbours; then it is him, his face wide.
  assert.equal(S.sunFace(SLINGSHOT - 3), SUN_FACE);
  assert.equal(S.sunFace(SLINGSHOT + 3), HERO_FACES.sun);
  assert.ok(Math.abs(S.sunTurn(SLINGSHOT) - Math.PI / 2) < 1e-9, 'edge-on exactly on the kick');
  assert.ok(S.SUN_FACE_WIDTH >= 0.6, 'his face ≥ 60 % of the disc’s width');
  // The coronal mass ejection: three loops of faces, every face ≥ 18 px, erupting from the kick at full speed.
  assert.equal(S.cme(SLINGSHOT - 0.5).length, 0);
  assert.equal(S.cme(SLINGSHOT + 6).length, 3 * S.CME_PER_LOOP);
  const R = S.SUN.r * sunAt(SLINGSHOT + 6).k;
  assert.ok(Math.min(...S.cme(SLINGSHOT + 6).map((m) => m.em * R)) >= 18, 'CME faces ≥ 18 px');
  assert.ok(S.cmeAt(SLINGSHOT + 1) - S.cmeAt(SLINGSHOT) > S.cmeAt(SLINGSHOT + 3) - S.cmeAt(SLINGSHOT + 2), 'the eruption’s biggest step is its first');
});

test('the bank: 24° into the slingshot and out (peaking on the kick), 10° into the lap; never past the house’s 25°', () => {
  assert.equal(S.bankAt(SLINGSHOT - 6), 0);
  assert.ok(Math.abs(S.bankAt(SLINGSHOT + 0.5) - S.BANK.sling) < 0.01);
  assert.ok(S.bankAt(SLINGSHOT + 7) < 1e-9);
  assert.ok(S.bankAt(LAP.at + 7) > 0.9 * S.BANK.lap && S.bankAt(LAP.at + 14) < 1e-9);
  for (let f = cs(3); f < cs(4); f += 0.5) assert.ok(S.bankAt(f) <= 25 * D2R, 'never past the house’s 25°');
});

test('the landing carries the whip’s 2 % rebound and settles by 3.1 + 6; before 3.1 the trails’ past camera is A’s whip (90° to the left)', () => {
  assert.equal(S.whipYaw(ORBIT_LAND.at), 0);
  assert.equal(S.whipYaw(ORBIT_LAND.at + 6), 0);
  assert.ok(Math.abs(S.whipYaw(ORBIT_LAND.at + 3) + 1.8 * D2R) < 1e-9, 'a 1.8° overshoot to the right at +3');
  assert.ok(Math.abs(S.whipYaw(ORBIT_LAND.at - 12) - 90 * D2R) < 1e-9, 'the whip starts 90° to the left');
  const sunX = (f: number) => S.project(S.solarCamera(f), [0, 0, 0])?.x ?? Infinity;
  assert.ok(sunX(ORBIT_LAND.at - 2) > sunX(ORBIT_LAND.at), 'the pan carries the Sun leftwards into the landing');
  // The living hold: the camera drifts along the ring until the dive.
  assert.ok(S.drift(DIVE.from) > S.drift(ORBIT_LAND.settled) && S.drift(DIVE.from + 6) === S.drift(DIVE.from));
});

test('the rings: eight bands of kinetic type at the planets’ radii, Kepler-turning, ratcheting a tile on each 3.n&, counter-turning neighbours', () => {
  assert.deepEqual(S.RINGS.map((r) => r.r), PLANETS.map((p) => p.r));
  assert.ok(S.SOLAR_CARDS.length >= 1200 && S.SOLAR_CARDS.length <= 2000, `${S.SOLAR_CARDS.length} cards (the design's ≈ 1,800)`);
  for (const r of S.RINGS) assert.equal(r.n % 2, 0, `${r.name}: names and faces alternate`);
  assert.ok(S.spinRate(0.8) > S.spinRate(6) * 10, 'inner rings much faster');
  const venus = S.SOLAR_CARDS.find((c) => c.ring === 1 && c.row === 0 && c.j === 0)!;
  const earth = S.SOLAR_CARDS.find((c) => c.ring === 2 && c.row === 0 && c.j === 0)!;
  const jump = (c: S.SolarCard) => S.ratchet(c.ring, RATCHETS[0] + 12) - S.ratchet(c.ring, RATCHETS[0] - 1);
  assert.ok(Math.abs(Math.abs(jump(venus)) - (2 * Math.PI) / S.RINGS[1].n) < 1e-3, 'one tile a ratchet');
  assert.ok(Math.sign(jump(venus)) !== Math.sign(jump(earth)), 'neighbours counter-turn');
});

test('the slow-mo runs the rings at 0.25× (3.3& + 4 … + 8) and back to 1× by the lap; the clock is continuous', () => {
  const rate = (f: number) => (S.solarClock(f + 0.01) - S.solarClock(f - 0.01)) / 0.02;
  assert.ok(Math.abs(rate(SLOWMO.from - 2) - 1) < 1e-6);
  assert.ok(Math.abs(rate(SLOWMO.from + 6) - 0.25) < 1e-6);
  assert.ok(Math.abs(rate(SLOWMO.to + 1) - 1) < 1e-6);
  for (let f = cs(3) - 20; f < cs(4); f += 0.25) assert.ok(Math.abs(S.solarClock(f + 0.25) - S.solarClock(f)) <= 0.2501);
});

test('the overtype cursors: pasted from Earth’s ring by the score’s sparks, 1/8 turn a 16th, every orbit amber by the lap; hosts never amber', () => {
  for (const row of CURSORS) {
    for (const name of row.rings) {
      const i = S.RINGS.findIndex((r) => r.name.toLowerCase() === name);
      assert.equal(S.cursorAngle(i, row.at - 0.5), -1);
      assert.ok(S.cursorAngle(i, row.at + 6) > Math.PI / 4 && S.cursorAngle(i, row.at + 6) <= Math.PI / 2 + 1e-9);
      assert.equal(S.cursorAngle(i, row.to), 2 * Math.PI, `${name} done on ${row.to - cs(3)}`);
    }
  }
  for (const c of S.SOLAR_CARDS) {
    assert.ok(S.infectedAt(c, LAP.at), 'every card amber on the ding');
    if (c.ring === S.EARTH) assert.ok(S.infectedAt(c, cs(3)), 'Earth’s ring is his from the start');
    else assert.ok(!S.infectedAt(c, cs(3)), 'the other rings are hosts on the downbeat');
  }
  assert.ok(S.RING_INKS.every((ink, i) => i === S.EARTH || ink !== 'amber'), 'host inks are pink, cyan, cream');
  for (const r of S.RINGS) if (r.i !== S.EARTH && r.i !== S.NEPTUNE) assert.ok(!r.host.includes('ω') && r.infected.includes('ω'), `${r.name}: host ${r.host}, twin ${r.infected}`);
  for (const c of S.SOLAR_CARDS.filter((x) => x.ring !== S.EARTH)) {
    const at = S.overtypedAt(c);
    assert.ok(Number.isInteger(at) && at >= S.RINGS[c.ring].cursor && at <= S.RINGS[c.ring].cursor + 48);
    assert.equal(S.infectedAt(c, at - 0.51), at > LAP.at ? true : false);
    assert.equal(S.infectedAt(c, at - 0.49), true);
  }
  // The spirograph's clusters turn amber with the cursor, the hosts' never before it.
  for (let ring = 0; ring < 8; ring++) {
    for (let j = 0; j < S.SPIRO_PER_RING; j++) {
      assert.equal(S.spiroAmber(ring, j, cs(3)), ring === S.EARTH);
      assert.equal(S.spiroAmber(ring, j, LAP.at), true);
    }
  }
});

test('E11 (the A → B contract, a leaf module): six slots on Earth’s ring next to Earth, on screen, a stamp apart; Earth’s ring pastes itself by 3.2', () => {
  const slots = S.stampSlots();
  assert.deepEqual(slots, Leaf.stampSlots(), 'cosmosSolar re-exports the leaf’s contract');
  assert.equal(slots.length, 6);
  const earth = S.project(S.solarCamera(ORBIT_LAND.at), S.cardPos(S.EARTH_CARD, ORBIT_LAND.at))!;
  for (const [x, y] of slots) assert.ok(Math.abs(x) < 900 && Math.abs(y) < 500, `slot ${x.toFixed(0)}, ${y.toFixed(0)} on screen`);
  for (let k = 1; k < 6; k++) {
    const gap = Math.hypot(slots[k][0] - slots[k - 1][0], slots[k][1] - slots[k - 1][1]);
    assert.ok(gap > 30 && gap < 220, `stamps ${k - 1}–${k} ${gap.toFixed(0)} px apart`);
  }
  assert.ok(Math.hypot(slots[5][0] - earth.x, slots[5][1] - earth.y) < 200, 'the last stamp lands next to Earth');
  // On 3.1 B's moving slots are the leaf's.
  for (let k = 0; k < 6; k++) {
    const q = S.project(S.solarCamera(ORBIT_LAND.at), S.slotPoint(k, ORBIT_LAND.at))!;
    assert.ok(Math.hypot(q.x - slots[k][0], q.y - slots[k][1]) < 1e-6);
  }
  const earthRing = S.SOLAR_CARDS.filter((c) => c.ring === S.EARTH);
  assert.ok(earthRing.every((c) => S.pastedAt(c) <= ORBIT_LAND.filled), 'the ring is whole by 3.2');
  assert.ok(earthRing.some((c) => S.pastedAt(c) === ORBIT_LAND.at + 6), 'the first copies paste on the first 16th');
  assert.equal(S.pastedAt(S.EARTH_CARD), -Infinity);
});

test('the spirograph: one continuous trail per glyph cluster (8 rings × 24) through the past camera; at rest short arcs, in the whip loops', () => {
  const trails = S.spiroTrails(SLINGSHOT);
  assert.ok(trails.length >= 100 && trails.length <= 8 * S.SPIRO_PER_RING, `${trails.length} trails`);
  // Each trail's head is its cluster now; point k is the cluster k steps back, seen by the camera of then (the past camera).
  const t = trails.find((x) => x.ring === 4)!;
  const step = S.trailFrames(SLINGSHOT) / t.K;
  for (const k of [0, 3, 9]) {
    if (k >= t.n) continue;
    const f = SLINGSHOT - k * step;
    const a = S.spiroAngle(t.j) + S.ringTurn(4, f);
    const q = S.project(S.solarCamera(f), [S.RINGS[4].r * Math.cos(a), 0, -S.RINGS[4].r * Math.sin(a)], 0.05)!;
    assert.ok(Math.hypot(q.x - t.x[k], q.y - t.y[k]) < 1e-6, `point ${k}`);
    if (k > 0) assert.ok(Math.hypot(t.x[k] - t.x[k - 1], t.y[k] - t.y[k - 1]) <= S.TRAIL.maxJump, 'continuous');
  }
  // Stable: a later sub-frame's trail runs along the same path (its point k + 1 is this one's point k when one step apart).
  const later = S.spiroTrails(SLINGSHOT + step).find((x) => x.ring === t.ring && x.j === t.j)!;
  if (later && later.n > 4 && later.K === t.K) assert.ok(Math.hypot(later.x[1] - t.x[0], later.y[1] - t.y[0]) < 1e-6);
  // Lengths: the whip's loops sweep far more than the landing's arcs; the trails never reach back past the landing.
  const sweep = (f: number) => S.spiroTrails(f).reduce((s, x) => s + Array.from({ length: x.n - 1 }, (_, k) => Math.hypot(x.x[k + 1] - x.x[k], x.y[k + 1] - x.y[k])).reduce((a, b) => a + b, 0), 0);
  assert.ok(sweep(SLINGSHOT + 2) > 4 * sweep(DIVE.from - 4), 'the whip curls them');
  assert.equal(S.trailFrames(ORBIT_LAND.at), 0);
  assert.equal(S.trailFrames(ORBIT_LAND.at + 6), 6);
  // Line coverage ≤ 30 % at its peak (the 4 px core, inside the frame).
  for (const f of [SLINGSHOT, SLINGSHOT + 4, SLINGSHOT + 8, LAP.at + 4]) {
    let L = 0;
    for (const x of S.spiroTrails(f)) for (let k = 1; k < x.n; k++) if (Math.max(Math.abs(x.x[k]), Math.abs(x.x[k - 1])) < 960 && Math.max(Math.abs(x.y[k]), Math.abs(x.y[k - 1])) < 540) L += Math.hypot(x.x[k] - x.x[k - 1], x.y[k] - x.y[k - 1]);
    assert.ok((4 * L) / (1920 * 1080) <= 0.3, `${f - SLINGSHOT}: coverage ${((400 * L) / (1920 * 1080)).toFixed(0)} %`);
  }
});

test('the trails relax in the slow-mo (readable rings), curl again into the lap’s amber spirograph, brighter, held to LAP.relax', () => {
  assert.equal(S.trailFrames(SLINGSHOT), S.TRAIL.frames);
  assert.ok(Math.abs(S.trailFrames(SLOWMO.from + 6) - S.TRAIL.relaxed) < 1e-9);
  assert.equal(S.trailFrames(LAP.at + 4), S.TRAIL.frames);
  assert.ok(S.trailGain(LAP.at + 2) >= 1.7 * S.trailGain(LAP.at - 2), 'the amber spirograph burns brighter on the lap');
  assert.ok(S.trailGain(LAP.relax + 12) < S.trailGain(LAP.relax), 'then relaxes');
});

test('E13 begins: the fling throws the camera straight back, 75 % in 3 f, stopping on 4.1 − 1; the system shrinks into the centre', () => {
  assert.equal(S.flingAt(FLING.from), 0);
  assert.ok(Math.abs(S.flingAt(FLING.from + 3) - 0.75) < 0.03);
  assert.equal(S.flingAt(FLING.to - 1), 1);
  const cam = S.solarCamera(FLING.to - 1);
  const sun = S.project(cam, [0, 0, 0])!;
  assert.ok(Math.hypot(sun.x, sun.y) < 6, 'the Sun on the centre');
  const neptune = Math.max(...[0, 1, 2, 3].map((q) => {
    const p = S.project(cam, [6 * Math.cos(q), 0, -6 * Math.sin(q)])!;
    return Math.hypot(p.x - sun.x, p.y - sun.y);
  }));
  assert.ok(neptune > 15 && neptune < 90, `one star with tiny rings (${neptune.toFixed(0)} px)`);
});

test('the hook: Earth wears (>ω<) on the bar’s top note; whatever carries him bobs +6 px on the note starts', () => {
  assert.equal(S.earthFace(d(1554)), HERO_FACES.top);
  assert.equal(S.earthFace(d(1566)), HERO_FACES.face);
  assert.ok(S.bob(d(1554) + 2) > 5.9);
  assert.equal(S.bob(d(1554) + 4.5), 0);
  assert.ok(!S.subjectIsSun(DIVE.from) && S.subjectIsSun(SLINGSHOT));
});

test('the exit is the slingshot’s follow-through: up and out on the far side, looking down 30° at the Sun, nearly still for the lap', () => {
  const moved = (f: number) => {
    const a = S.solarCamera(f - 0.5).eye;
    const b = S.solarCamera(f + 0.5).eye;
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };
  assert.equal(S.EXIT.from, SLINGSHOT + 6);
  const a = S.solarCamera(S.EXIT.from - 1e-6).eye;
  const b = S.solarCamera(S.EXIT.from).eye;
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-4, 'continuous');
  assert.ok(moved(S.EXIT.from + 0.5) > moved(S.EXIT.from + 5) && moved(S.EXIT.from + 5) > moved(S.EXIT.from + 10), 'decelerating');
  assert.ok(moved(LAP.at - 2) < 0.02 * moved(S.EXIT.from + 0.5), 'still as the lap launches');
  // The lap's whip is a hit launch: its biggest step on the ding's own frame.
  const az = (f: number) => Math.abs(S.azimuth(f) - S.azimuth(f - 1));
  assert.ok(az(LAP.at) > az(LAP.at + 1) && az(LAP.at) > az(LAP.at - 1), 'the lap’s biggest step on 3.4');
  const c = S.solarCamera(LAP.at);
  assert.ok(Math.abs(c.eye[1] - S.ORBIT.exit.h) < 1e-6, 'the far side’s height');
  assert.ok(Math.abs(Math.asin(-c.fwd[1]) / D2R - 30) < 1.5, `looking down ${(Math.asin(-c.fwd[1]) / D2R).toFixed(1)}°`);
  assert.ok(Math.hypot(S.project(c, [0, 0, 0])!.x, S.project(c, [0, 0, 0])!.y) < 2, 'at the Sun');
});

test('the kick pumps bar 3’s light (the trails, the orbits, the cards): ×1.4 on the kick’s frame from its early sub-frames, back by + 8', () => {
  for (const k of [cs(3, 2), cs(3, 3), cs(3, 4)]) {
    assert.ok(Math.abs(S.kickPump(k - 0.25) - 1.4) < 1e-9, `whole on ${k}`);
    assert.equal(S.kickPump(k - 0.3), 1);
    assert.ok(S.kickPump(k + 4) > 1 && S.kickPump(k + 4) < 1.15);
    assert.equal(S.kickPump(k + 8), 1);
  }
});
