import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coverZoom } from '../src/engine/view.ts';
import { BUILD_START, FILL, HOLE, KICKS, RETURN, ROLL } from '../src/score/build.ts';
import { shake } from '../src/motion/hit.ts';
import { ACCENTS, PUNCHES, flashAt, rigAt } from '../src/score/energy.ts';
import * as C from '../src/score/club.ts';
import * as D1 from '../src/score/drop1.ts';
import { ENTER_FRAME, HIGHWAY_START, LAUNCH, LOCK } from '../src/score/intro.ts';
import { isHeld, partBars, partEnd, partFrame, partStart, seedFrame } from '../src/score/film.ts';
import { FRAMES_PER_BAR, barFrame } from '../src/score/tempo.ts';
import { POINT as COSMOS_POINT } from '../src/score/cosmos.ts';

test('the build punches every kick, bigger bar by bar, its onset on the kick', () => {
  const peakAfter = (k: number) => Math.max(...[0.5, 1, 1.5, 2, 3].map((d) => rigAt(k + d).zoom));
  let last = 0;
  for (const bar of [...partBars('swiss'), ...partBars('riso')]) {
    // The groove's return after the scan (swiss 4.3) takes its own punch, as the hole does.
    const ks = KICKS.filter((k) => k >= barFrame(bar) && k < barFrame(bar + 1) && k % FRAMES_PER_BAR !== 0 && k !== RETURN);
    if (!ks.length) continue;
    const z = peakAfter(ks[0]);
    assert.ok(z > 1 && z >= last - 1e-9, `bar ${bar}: ${z}`);
    last = z;
  }
  const k = KICKS.find((f) => f % FRAMES_PER_BAR !== 0 && f > partFrame('swiss', 2))!;
  assert.equal(rigAt(k).zoom, 1, 'nothing before the onset');
  assert.ok(rigAt(k + 1).zoom > 1, 'moving from the kick on');
});

test('every punch and accent has a finite amount: a bar added to swiss or riso (or between them) needs its own KICK_ARC entry in src/score/energy.ts', () => {
  for (const p of PUNCHES) assert.ok(Number.isFinite(p.amount) && p.amount > 0, `punch at ${p.at}: ${p.amount}`);
  for (const a of ACCENTS) assert.ok(Number.isFinite(a.flash) && Number.isFinite(a.shake), `accent at ${a.at}: flash ${a.flash}, shake ${a.shake}`);
});

test('the intro punches only on its sub pulses (the highway and the typing), Enter, the launch and the lock — not on the RAIN bar’s tilt', () => {
  for (const f of [HIGHWAY_START, partFrame('intro', 4), ENTER_FRAME, LAUNCH, LOCK]) assert.ok(rigAt(f + 1.5).zoom >= 1.03, `${f}`);
  const intro = (bar: number, beat = 0): number => partFrame('intro', bar, beat);
  for (const f of [intro(1, 1), intro(1, 2), intro(1, 3), intro(2), intro(2, 2), intro(2, 3), intro(3, 1), intro(4, 1), intro(4, 2), intro(5, 3)]) assert.equal(rigAt(f + 1.5).zoom, 1, `no punch at ${f}`);
});

test('white flashes only on Enter, the lock, the arrival in the Riso world (riso 1.1) and the hole; none on the red hand-offs', () => {
  const white = [ENTER_FRAME, LOCK, partStart('riso'), HOLE];
  for (const f of white) assert.ok(flashAt(f) >= 0.4, `${f}`);
  for (const f of [BUILD_START, partFrame('swiss', 3)]) assert.equal(flashAt(f), 0, `red hand-off ${f}`);
  for (let f = partStart('intro'); f < partEnd('riso'); f++) if (!white.some((w) => f >= w && f < w + 8)) assert.ok(flashAt(f) <= 0.25, `only a bump at ${f}`);
});

test('shakes only on the big accents, the fill and the roll', () => {
  const shaken = [ENTER_FRAME, LAUNCH, LOCK, RETURN, HOLE, ...FILL, ...ROLL];
  for (let f = partStart('intro'); f < partEnd('riso'); f += 0.5) {
    const v = rigAt(f);
    if (Math.hypot(v.x, v.y) > 0.01) assert.ok(shaken.some((a) => f > a && f < a + 16), `a shake at ${f}`);
  }
});

test('between kicks the rig is exactly still', () => {
  const busy = [...FILL, RETURN, HOLE, ...ROLL];
  for (const k of KICKS.filter((f) => f < partFrame('riso', 3))) {
    for (let f = k + 14; f < k + 24; f += 0.5) {
      if (busy.some((b) => f > b - 1 && f < b + 16)) continue;
      assert.deepEqual(rigAt(f), { zoom: 1, x: 0, y: 0, roll: 0 }, `${f}`);
    }
  }
});

test('every punch dies away on its own: the rig never snaps back as a punch ends', () => {
  const busy = [...FILL, HOLE, ...ROLL];
  for (const k of KICKS) {
    if (busy.some((b) => k + 10 > b - 1 && k + 10 < b + 16)) continue;
    for (const t of [10, 12, 14]) {
      const [a, b] = [rigAt(k + t - 1e-6), rigAt(k + t + 1e-6)];
      assert.ok(Math.abs(a.zoom - b.zoom) < 1e-6, `snap of ${(a.zoom - b.zoom).toExponential(2)} at ${k} + ${t}`);
    }
  }
});

test('no edge of the frame ever shows, and the energy never jumps', () => {
  let prev = rigAt(partStart('intro') - 1);
  for (let f = partStart('intro') - 0.95; f < partEnd('riso'); f += 0.05) {
    const v = rigAt(f);
    assert.ok(coverZoom(v) <= v.zoom + 1e-9, `${f}`);
    assert.ok(Math.abs(v.zoom - prev.zoom) < 0.01 && Math.abs(v.x - prev.x) < 2 && Math.abs(v.y - prev.y) < 2 && Math.abs(v.roll - prev.roll) < 0.002, `jump at ${f}`);
    prev = v;
  }
});

test('the camera dies down to stillness in the silent half beat before the drop', () => {
  for (let f = partEnd('riso') - 2; f < partEnd('riso'); f += 0.25) {
    const v = rigAt(f);
    assert.ok(Math.abs(v.zoom - 1) < 0.002 && Math.hypot(v.x, v.y) < 0.5, `${f}`);
  }
  assert.equal(flashAt(partEnd('riso') - 1), 0);
});

/** The peak zoom of the punch a hit on `k` sets off. */
const peak = (k: number) => Math.max(...[0.5, 1, 1.5, 2, 3].map((d) => rigAt(k + d).zoom));
/** How hard the frame is jolted at instant `f` (px a frame): the jump in its screen velocity across the instant. A shake starting there jolts it; one already running does not. */
const jolt = (f: number, h = 1e-3): number => {
  const [a, b, c] = [rigAt(f - h), rigAt(f), rigAt(f + h)];
  return Math.hypot((c.x - b.x) / h - (b.x - a.x) / h, (c.y - b.y) / h - (b.y - a.y) / h);
};

// The cosmos lists its own energy (src/score/cosmos.ts COSMOS_ACCENTS: the bang's shake, five punches, the stutter's jolts, no white),
// pinned in tests/cosmos.test.ts; v04's burst, freeze, fill and galaxy stutter left with its scene. Drop 1's club is the comic club INK
// (src/score/club.ts CLUB_ACCENTS, merged into energy.ts): its punches on its story beats, pinned in tests/clubScore.test.ts; v04's neon
// club (drop1.ts SIDE, FLIP, BUILD_KICKS, ROLL, HIT on club 3–4) is retired. Below, what the film's rig does with it.
test('Drop 1’s club punches its story beats and its throw’s kicks: nothing before each, then a zoom beyond what the shakes alone need', () => {
  for (const a of C.CLUB_ACCENTS.filter((x) => (x.punch ?? 0) >= 0.03)) {
    const on = rigAt(a.at);
    assert.ok(Math.abs(on.zoom - Math.max(1, coverZoom(on))) < 1e-12, `the punch on ${a.at} starts before its beat`);
    const v = rigAt(a.at + 1.5);
    assert.ok(v.zoom > 1.02 && v.zoom - coverZoom(v) > 0.015, `a punch on ${a.at}: ${v.zoom.toFixed(4)}, where the shakes alone need ${coverZoom(v).toFixed(4)}`);
  }
});

test('Drop 1’s club never flashes white: the dot inks on club 1.1 without one, and the glass makes its own smack', () => {
  for (let f = C.CLUB.from; f < C.CLUB.to; f++) assert.equal(flashAt(f), 0, `${f}`);
});

test('through the throw the frame punches harder kick by kick into the hit, and every drum of the roll jolts it, harder from its eighths to its sixteenths to its thirty-seconds', () => {
  const kicks = C.THROW_KICKS.filter((k) => k > C.THROW);
  assert.ok(kicks.length >= 3, 'the throw has its kicks');
  for (let i = 1; i < kicks.length; i++) assert.ok(peak(kicks[i]) > peak(kicks[i - 1]), `the kick at ${kicks[i]}: a punch to ${peak(kicks[i]).toFixed(4)} after ${peak(kicks[i - 1]).toFixed(4)}`);
  assert.ok(jolt(C.THROW) > 2, `the throw jolts the frame: ${jolt(C.THROW).toFixed(2)}`);
  for (const r of C.ROLL) assert.ok(jolt(r) > 2, `the roll's drum at ${r}: a jolt of ${jolt(r).toFixed(2)}`);
  const between = (a: number, b: number) => C.ROLL.filter((r) => r >= a && r < b && !C.THROW_KICKS.includes(r)).map((r) => jolt(r));
  const eighths = between(C.club(6), C.club(6, 1));
  const sixteenths = between(C.club(6, 1), C.club(6, 2));
  const thirtySeconds = between(C.club(6, 2), C.HIT);
  assert.ok(eighths.length && sixteenths.length && thirtySeconds.length, 'the roll speeds up from eighths to sixteenths to thirty-seconds');
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  assert.ok(mean(sixteenths) > mean(eighths), `sixteenths ${sixteenths.map((j) => j.toFixed(1))} against eighths ${eighths.map((j) => j.toFixed(1))}`);
  assert.ok(mean(thirtySeconds) > mean(sixteenths), `thirty-seconds ${thirtySeconds.map((j) => j.toFixed(1))} against sixteenths ${sixteenths.map((j) => j.toFixed(1))}`);
});

test('through Drop 1’s club a shake starts only on a story hit — the kick of the cocktail, the splash, the throw — and the roll, never on the groove’s plain kicks, claps or hats', () => {
  const shakes = C.CLUB_ACCENTS.filter((a) => (a.shake ?? 0) > 0).map((a) => a.at);
  for (const a of shakes.filter((f) => f < C.HIT)) assert.ok(jolt(a) > 2, `the accent at ${a}: a jolt of ${jolt(a).toFixed(2)} px a frame`);
  // Up to the hit (what the camera does on the hit and through the silence is left to the glass).
  for (let f = C.CLUB.from - 0.5; f < C.HIT; f += 0.25) {
    if (shakes.includes(f) || isHeld(f)) continue;
    assert.ok(jolt(f, 1e-4) < 0.5, `a shake starts at ${f}: a jolt of ${jolt(f, 1e-4).toFixed(2)} px a frame`);
  }
});

// The glass giving way on break 1.1 (SMASH) is the break's first accent now (BREAK_ACCENTS); tests/break.test.ts pins it.
test('the hit on the glass punches and jolts the frame', () => {
  for (const [name, at] of [['the hit', C.HIT]] as const) {
    assert.ok(jolt(at) > 2, `${name} at ${at}: a jolt of ${jolt(at).toFixed(2)} px a frame`);
    assert.ok(peak(at) > 1.03 && peak(at) - coverZoom(rigAt(at + 1.5)) > 0.02, `${name} at ${at}: a punch to ${peak(at).toFixed(4)}`);
    assert.equal(flashAt(at), 0, `${name}: the glass makes its own flash`);
  }
});

test('the drums stop dead on the hit: from the hit to the smash the frame moves only with the hit’s own shake and punch (v04’s draw, seeded as old 1896), and holds still once they have died', () => {
  const seed = C.CLUB_ACCENTS.find((a) => a.at === C.HIT)!.seed!;
  assert.equal(seed, seedFrame(D1.HIT), 'v04’s hit’s seed');
  const hitOnly = (f: number) => {
    const t = f - C.HIT;
    const [sx, sy] = shake(f, C.HIT, seed);
    return { x: 16 * sx, y: 16 * sy, alive: t > 0 && t < 16 };
  };
  for (let f = C.HIT; f < C.SMASH; f += 0.25) {
    const v = rigAt(f);
    const h = hitOnly(f);
    const k = Math.hypot(v.x, v.y) / Math.max(1e-9, Math.hypot(h.x, h.y));
    if (h.alive) assert.ok(Math.abs(v.x * h.y - v.y * h.x) < 1e-6 && k > 0.5 && k < 2, `${f}: shaken (${v.x.toFixed(2)}, ${v.y.toFixed(2)}), the hit alone shakes (${h.x.toFixed(2)}, ${h.y.toFixed(2)})`);
    else assert.deepEqual({ x: v.x, y: v.y }, { x: 0, y: 0 }, `${f}: still`);
  }
  for (let f = C.HIT + 16; f < C.SMASH; f += 0.25) assert.deepEqual(rigAt(f), { zoom: 1, x: 0, y: 0, roll: 0 }, `${f}: the silence holds still`);
});

test('through Drop 1 no edge of the frame ever shows, and no punch or shake snaps in or out: the rig is continuous at every instant but the cut to the glass', () => {
  // Up to break 1.1, where the break takes over (tests/break.test.ts carries the audit on from there).
  for (let f = D1.DROP1_START - 16; f < D1.SMASH; f += 0.25) {
    // On the hit the picture cuts to the glass (the club renders each side of it on its own), and the roll's shakes stop dead there. A
    // held tail (the cosmos's bars 5–6) holds its part's last frame, rig and all: it starts and ends on a cut.
    if (f === C.HIT || f === COSMOS_POINT.from || isHeld(f - 1e-6) || isHeld(f) || isHeld(f + 1e-6)) continue;
    const [a, v, b] = [rigAt(f - 1e-6), rigAt(f), rigAt(f + 1e-6)];
    assert.ok(coverZoom(v) <= v.zoom + 1e-9, `an edge shows at ${f}`);
    assert.ok(Math.abs(b.zoom - a.zoom) < 1e-5, `the zoom snaps by ${(b.zoom - a.zoom).toExponential(2)} at ${f}`);
    assert.ok(Math.abs(b.x - a.x) < 1e-3 && Math.abs(b.y - a.y) < 1e-3, `the frame snaps by (${(b.x - a.x).toFixed(4)}, ${(b.y - a.y).toFixed(4)}) px at ${f}`);
    assert.ok(Math.abs(b.roll - a.roll) < 1e-6, `the roll snaps at ${f}`);
  }
});
