import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RGB } from '../src/engine/color.ts';
import type { Pose } from '../src/engine/camera.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { CLAPS, FILL, HATS, KICKS, LEVELS, OPEN_HATS, STUTTER, stutterFrame } from '../src/score/drop1.ts';
import { partEnd, partFrame, partStart } from '../src/score/film.ts';
import { EARTH_R, coreAt } from '../src/shots/burst.ts';
import type { CardCamera, CardLayout } from '../src/shots/kosmos.ts';
import {
  GALAXY_R,
  bellFlares,
  bodies,
  bridgeShrink,
  bridgeStep,
  clapsBy,
  coreShade,
  dustOn,
  earthFade,
  galaxyCentre,
  galaxyPlacements,
  galaxySpikes,
  galaxySpin,
  galaxyStyle,
  hatFlares,
  hatPulse,
  localCards,
  skyCards,
  voyageBackground,
  voyageCamera,
} from '../src/shots/voyage.ts';

/** A position in the cosmos: bar 1-based, beat 0-based. */
const cosmos = (bar: number, beat = 0): number => partFrame('cosmos', bar, beat);
/** A margin either side of the cosmos: frames from a little before the drop to a little into the club. */
const BEFORE = partStart('cosmos') - 52;
const AFTER = partStart('club') + 64;
/** The first stab after time snaps back (cosmos 1.3&). */
const STAB = cosmos(1, 2.5);
/** The first output frame of each slice of the stutter (6, 6, 3, 3, 3, 3 frames). */
const SLICES = [0, 6, 12, 15, 18, 21].map((k) => STUTTER.from + k);
/** One output frame per bridge step: the last frame before the stutter, then each slice's first. */
const STEP_FRAMES = [STUTTER.from - 1, ...SLICES];
const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const sum = (c: RGB): number => c[0] + c[1] + c[2];
const luminance = (c: RGB): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const coreColour = (f: number): RGB => bodies(f, coreAt(f)).earth.color;
const coreRadius = (f: number): number => bodies(f, coreAt(f)).earth.r;

type Flare = { x: number; y: number; size: number; light: number; rays: number[] };
/** The star flares in `shapes`, one per position: a soft disc and its crossing rays (size = the longest ray, light = the brightest ray, rays = each ray's angle). */
function flares(shapes: readonly Shape[]): Map<string, Flare> {
  const out = new Map<string, Flare>();
  for (const s of shapes) {
    const key = `${s.x.toFixed(4)} ${s.y.toFixed(4)}`;
    const g = out.get(key) ?? { x: s.x, y: s.y, size: 0, light: 0, rays: [] };
    if (s.kind === 'segment') {
      g.size = Math.max(g.size, s.w);
      g.light = Math.max(g.light, sum(s.color));
      g.rays.push(s.rot ?? 0);
    }
    out.set(key, g);
  }
  return out;
}
/** How saturated a colour is: 0 for grey or white, 1 for a pure hue. */
const saturation = (c: RGB): number => (Math.max(...c) - Math.min(...c)) / Math.max(1e-9, Math.max(...c));
/** The flares of `draw` that appear on frame `f` (not there on f − 1). */
const born = (draw: (f: number) => Shape[], f: number): [string, Flare][] => {
  const before = flares(draw(f - 1));
  return [...flares(draw(f))].filter(([k]) => !before.has(k));
};

// ── The stutter's bridge: steps and shrink ──────────────────────────────────

test('the bridge stands still until the stutter, then takes one step on each of its six slices', () => {
  for (const f of [...range(partStart('cosmos'), STUTTER.from), STUTTER.from - 0.5]) assert.equal(bridgeStep(f), 0, `${f}`);
  assert.deepEqual(SLICES.map(bridgeStep), [1, 2, 3, 4, 5, 6]);
  // The step holds through each slice.
  for (let i = 0; i < SLICES.length; i++) {
    const end = i + 1 < SLICES.length ? SLICES[i + 1] : STUTTER.to;
    for (const f of range(SLICES[i], end)) assert.equal(bridgeStep(f), i + 1, `${f}`);
  }
});

test('every time the stutter jumps back to repeat a slice, the bridge takes a step on that same frame', () => {
  let jumps = 0;
  for (let out = STUTTER.from + 1; out < STUTTER.to; out++) {
    if (stutterFrame(out) >= stutterFrame(out - 1)) continue;
    jumps++;
    assert.equal(bridgeStep(out), bridgeStep(out - 1) + 1, `frame ${out} repeats a slice`);
  }
  assert.equal(jumps, 3);
});

test('on every slice the galaxy snaps smaller, still at least about a third of its size, and on the last it is a point', () => {
  for (const f of range(cosmos(4), STUTTER.from)) assert.equal(bridgeShrink(f), 1, `full size before the stutter (${f})`);
  const sizes = STEP_FRAMES.map(bridgeShrink);
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] < sizes[i - 1], `slice ${i}: ${sizes[i]} after ${sizes[i - 1]}`);
  for (let i = 1; i <= 5; i++) assert.ok(sizes[i] >= 1 / 3 - 0.005, `slice ${i} still reads as a galaxy: ${sizes[i]}`);
  assert.ok(sizes[6] <= 0.1, `the last slice is a point: ${sizes[6]}`);
  // A point, not nothing: the scene pulls the camera back by 1 / size.
  assert.ok(sizes[6] > 0, 'the point is still there on the last slice');
  // A snap, not a zoom: the size holds through each slice.
  for (let out = STUTTER.from; out < STUTTER.to; out++) assert.equal(bridgeShrink(out), bridgeShrink(SLICES.filter((s) => s <= out).at(-1)!), `${out}`);
});

test('through the stutter the camera looks straight at the galaxy’s core, so the point it shrinks to is the centre of the frame', () => {
  for (let out = STUTTER.from; out < STUTTER.to; out++) {
    const f = stutterFrame(out);
    const cam = voyageCamera(f);
    const core = galaxyCentre(f);
    const miss = Math.hypot(cam.target[0] - core[0], cam.target[1] - core[1], cam.target[2] - core[2]);
    assert.ok(miss < 1e-6 * GALAXY_R, `frame ${out}: the target is ${miss} from the core`);
    // Square on: looking straight down the view axis, so the target sits mid-frame.
    assert.ok(Math.abs(cam.position[0] - cam.target[0]) < 1e-6 && Math.abs(cam.position[1] - cam.target[1]) < 1e-6, `frame ${out}`);
  }
});

// ── The galaxy's turn ───────────────────────────────────────────────────────

test('the galaxy turns faster from the stutter on, without a jump where it starts', () => {
  const before = galaxySpin(STUTTER.from - 1) - galaxySpin(STUTTER.from - 2);
  const during = galaxySpin(STUTTER.from + 8) - galaxySpin(STUTTER.from + 7);
  assert.ok(before > 0, 'it turns before the stutter');
  assert.ok(during > 3 * before, `${during} a frame in the stutter against ${before} before`);
  const into = galaxySpin(STUTTER.from) - galaxySpin(STUTTER.from - 1);
  assert.ok(Math.abs(into - before) < 0.5 * before, `the turn into the stutter (${into}) is an ordinary frame's`);
});

test('each repeated slice visibly jumps the galaxy back: far more than an ordinary frame’s turn', () => {
  const ordinary = galaxySpin(STUTTER.from - 1) - galaxySpin(STUTTER.from - 2);
  let repeats = 0;
  for (let out = STUTTER.from + 1; out < STUTTER.to; out++) {
    if (stutterFrame(out) >= stutterFrame(out - 1)) continue;
    repeats++;
    const back = galaxySpin(stutterFrame(out - 1)) - galaxySpin(stutterFrame(out));
    assert.ok(back > 10 * ordinary, `frame ${out}: jumps back ${back.toFixed(4)} rad against ${ordinary} a frame`);
  }
  assert.equal(repeats, 3, 'three repeated slices');
});

// ── The look steps toward neon ──────────────────────────────────────────────

/** Everything about the galaxy's look at output frame `out` (content frame stutterFrame(out)). */
function look(out: number) {
  const f = stutterFrame(out);
  const style = galaxyStyle(f, out, 1);
  const spikes = galaxySpikes(f, out, galaxyPlacements(f)[0], style.flat);
  return { neon: style.neon, tube: style.tube, em: style.em, background: sum(voyageBackground(out)), dust: dustOn(out), capsule: spikes.capsule, spikes: spikes.spikes.length };
}

test('the galaxy is a photograph until the stutter: no neon, no tubes, black space, dust, thin spikes', () => {
  for (const out of [cosmos(4), cosmos(4, 1.5) + 4, STUTTER.from - 1]) {
    const l = look(out);
    assert.deepEqual([l.neon, l.tube, l.em, l.dust, l.capsule], [0, 0, 1, true, 0], `${out}`);
    assert.equal(l.background, sum(voyageBackground(cosmos(2, 2) + 4)), `${out}: the same black as the rest of the voyage`);
  }
});

test('each slice of the stutter redraws the galaxy one step closer to neon, and nothing steps back', () => {
  const steps = STEP_FRAMES.map(look);
  for (let i = 1; i < steps.length; i++) {
    const [a, b] = [steps[i - 1], steps[i]];
    assert.ok(b.neon >= a.neon && b.tube >= a.tube && b.em >= a.em && b.capsule >= a.capsule && b.background >= a.background && b.spikes >= a.spikes, `slice ${i} steps back: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
    assert.ok(!b.dust || a.dust, `slice ${i}: the dust comes back`);
  }
  for (let i = 1; i <= 5; i++) assert.notDeepEqual(steps[i], steps[i - 1], `slice ${i} changes the look`);
});

test('step by step: capsules (1), neon colours (2), tubes drawn bigger (3), the black lifts and the dust goes (4), a ring (5)', () => {
  const [s0, s1, s2, s3, s4, s5, s6] = STEP_FRAMES.map(look);
  assert.deepEqual([s0.capsule, s1.capsule], [0, 1], 'capsules on the first slice');
  assert.deepEqual([s1.neon, s2.neon], [0, 1], 'neon on the second');
  assert.deepEqual([s2.tube, s3.tube], [0, 1], 'tubes on the third');
  assert.ok(s3.em > s2.em, 'the tubes are drawn bigger');
  assert.deepEqual([s3.dust, s4.dust], [true, false], 'the dust goes on the fourth');
  assert.ok(s4.background > s3.background, 'the black lifts on the fourth');
  assert.ok(Math.max(...voyageBackground(SLICES[3])) < 0.02, 'to a near-black');
  assert.ok(s5.spikes > s4.spikes, 'the ring on the fifth');
  assert.deepEqual(s6, s5, 'the last slice only shrinks it');
});

test('on the first slice the galaxy’s spikes become capsules: shorter and fatter, on the same stars', () => {
  const f = STUTTER.from;
  const p = galaxyPlacements(f)[0];
  const flat = galaxyStyle(f, f, 1).flat;
  const thin = galaxySpikes(f, STUTTER.from - 1, p, flat);
  const caps = galaxySpikes(f, STUTTER.from, p, flat);
  assert.ok(thin.spikes.length > 0, 'the blazing stars have spikes in cosmos bar 4');
  assert.equal(caps.spikes.length, thin.spikes.length);
  thin.spikes.forEach((a, i) => {
    const b = caps.spikes[i];
    assert.deepEqual(b.centre, a.centre, `spike ${i} stays on its star`);
    assert.ok(b.length < a.length, `spike ${i} is shorter`);
    assert.ok(b.width / b.length > 2 * (a.width / a.length), `spike ${i} is fatter`);
  });
});

test('on the second slice the spikes snap to vivid neon colours; the first slice keeps their colours', () => {
  const f = STUTTER.from;
  const p = galaxyPlacements(f)[0];
  const flat = galaxyStyle(f, f, 1).flat;
  const [s0, s1, s2] = [STUTTER.from - 1, SLICES[0], SLICES[1]].map((out) => galaxySpikes(f, out, p, flat).spikes);
  assert.deepEqual(s1.map((s) => s.color), s0.map((s) => s.color));
  assert.ok(s2.some((s, i) => s.color.some((v, j) => Math.abs(v - s1[i].color[j]) > 1e-6)), 'some spike changes colour');
  // Neon: the pale star colours of the photograph turn into strong hues.
  const mean = (spikes: typeof s1): number => spikes.reduce((s, x) => s + saturation(x.color), 0) / spikes.length;
  assert.ok(mean(s2) > 2 * mean(s1), `the spikes are far more vivid: saturation ${mean(s1).toFixed(2)} → ${mean(s2).toFixed(2)}`);
  const vivid = s2.filter((s, i) => saturation(s.color) > saturation(s1[i].color)).length;
  assert.ok(vivid > 0.75 * s2.length, `${vivid} of ${s2.length} spikes are more vivid`);
});

test('on the fifth slice a ring of capsules draws the galaxy’s rim, all the way round, and stays', () => {
  const f = stutterFrame(SLICES[4]);
  const p = galaxyPlacements(f)[0];
  const flat = galaxyStyle(f, SLICES[4], 1).flat;
  const before = galaxySpikes(f, SLICES[3], p, flat).spikes;
  const after = galaxySpikes(f, SLICES[4], p, flat).spikes;
  const ring = after.slice(before.length);
  assert.ok(ring.length >= 24, `${ring.length} capsules in the ring`);
  const r = ring.map((s) => Math.hypot(s.centre[0] - p.centre[0], s.centre[1] - p.centre[1], s.centre[2] - p.centre[2]));
  for (const d of r) assert.ok(Math.abs(d - r[0]) < 1e-6 * GALAXY_R, 'every capsule is as far from the core');
  assert.ok(r[0] >= GALAXY_R, `on the rim (${r[0]} from the core)`);
  const mid = [0, 1, 2].map((j) => ring.reduce((s, c) => s + c.centre[j], 0) / ring.length);
  assert.ok(Math.hypot(mid[0] - p.centre[0], mid[1] - p.centre[1], mid[2] - p.centre[2]) < 0.01 * GALAXY_R, 'a closed ring round the core');
  assert.equal(galaxySpikes(f, SLICES[5], p, flat).spikes.length, after.length, 'the ring stays on the last slice');
});

// ── The offbeat glints ──────────────────────────────────────────────────────

test('two cross-stars glint on each open hat of cosmos bars 2–4, one smaller and dimmer on each hat between, nothing new on the kicks', () => {
  const open: Flare[] = [];
  const closed: Flare[] = [];
  for (let f = cosmos(2, 0.5); f <= cosmos(4, 2.5); f++) {
    const fresh = born(hatFlares, f).map(([, g]) => g);
    const want = OPEN_HATS.includes(f) ? 2 : HATS.includes(f) && !KICKS.includes(f) ? 1 : 0;
    assert.equal(fresh.length, want, `frame ${f}`);
    for (const g of fresh) {
      assert.equal(g.rays.length, 2, `frame ${f}: a glint is a cross of two rays`);
      const turn = Math.abs(g.rays[1] - g.rays[0]) % Math.PI;
      assert.ok(Math.abs(turn - Math.PI / 2) < 1e-9, `frame ${f}: its rays cross at right angles (${turn.toFixed(3)} rad)`);
    }
    (OPEN_HATS.includes(f) ? open : closed).push(...fresh);
  }
  assert.ok(Math.min(...open.map((g) => g.size)) > Math.max(...closed.map((g) => g.size)), 'the open hats’ glints are larger');
  assert.ok(Math.min(...open.map((g) => g.light)) > Math.max(...closed.map((g) => g.light)), 'and brighter');
});

test('every glint dims frame by frame and is gone 10 frames after its hat', () => {
  for (let f = cosmos(2, 0.5); f <= cosmos(4, 2.5); f++) {
    for (const [key, g] of born(hatFlares, f)) {
      let last = g.light;
      for (let t = 1; t < 10; t++) {
        const now = flares(hatFlares(f + t)).get(key);
        assert.ok(now && now.light < last, `the glint of ${f} at +${t}`);
        last = now.light;
      }
      assert.ok(flares(hatFlares(f + 5)).get(key)!.light < g.light, `dimmer at +5 than on ${f}`);
      assert.equal(flares(hatFlares(f + 10)).has(key), false, `the glint of ${f} is gone at +10`);
    }
  }
});

test('every glint on screen was born on a hat of cosmos bars 2–4 less than 10 frames before, and stays over the subject', () => {
  // The hats run every sixteenth from the drop, so "a hat in the last 10 frames" is always true: trace each glint back to its own birth instead.
  const hats = new Set([...HATS, ...OPEN_HATS]);
  for (let f = BEFORE; f < AFTER; f++) {
    for (const [key, g] of flares(hatFlares(f))) {
      let birth = f;
      while (birth > f - 20 && flares(hatFlares(birth - 1)).has(key)) birth--;
      assert.ok(hats.has(birth), `frame ${f}: a glint born on ${birth}, which is no hat`);
      assert.ok(birth >= LEVELS.earth && birth < STUTTER.from, `frame ${f}: a glint born on ${birth}, outside cosmos bars 2–4 before the stutter`);
      assert.ok(f - birth < 10, `frame ${f}: the glint of ${birth} outlives 10 frames`);
      assert.ok(Math.abs(g.x) <= 500 && Math.abs(g.y) <= 350, `frame ${f}: a glint at (${g.x.toFixed(0)}, ${g.y.toFixed(0)})`);
    }
  }
});

test('the Big Bang of cosmos bar 1 has no hat glints, nor does cosmos 2.1', () => {
  for (let f = BEFORE; f <= LEVELS.earth + 5; f++) assert.equal(hatFlares(f).length, 0, `${f}`);
});

test('no new glint is born from the stutter on', () => {
  for (let f = STUTTER.from; f < AFTER; f++) assert.equal(born(hatFlares, f).length, 0, `${f}`);
});

test('no glint before the first open hat of cosmos bar 2', () => {
  for (let f = BEFORE; f < OPEN_HATS[0]; f++) assert.equal(hatFlares(f).length, 0, `${f}`);
});

test('no glint at all once the stutter starts', () => {
  for (let f = STUTTER.from; f < AFTER; f++) assert.equal(hatFlares(f).length, 0, `${f}`);
});

// ── The bells on each level ─────────────────────────────────────────────────

const BELL_LEVELS = [LEVELS.earth, LEVELS.solar, LEVELS.galaxy];

test('the bells flare on the arrival of Earth, the solar system and the galaxy, four flares marching left to right', () => {
  for (const at of BELL_LEVELS) {
    assert.equal(bellFlares(at - 1).length, 0, `quiet just before ${at}`);
    assert.ok(bellFlares(at).length > 0, `a flare on ${at}`);
    const births = range(at, at + 24).flatMap((f) => born(bellFlares, f).map(([, g]) => ({ f, x: g.x })));
    assert.equal(births.length, 4, `four bells on ${at}`);
    // The bell run (scripts/audio/sections/drop1.mjs) plays its four notes 3 frames apart, panned left to right: each flare lights with its note.
    assert.deepEqual(births.map((b) => b.f - at), [0, 3, 6, 9], `the flares of ${at} ring with the notes of the bell run`);
    for (let i = 1; i < 4; i++) assert.ok(births[i].x > births[i - 1].x, `bell ${i + 1} of ${at} is right of bell ${i}`);
    for (const s of bellFlares(at + 9)) assert.ok(Math.abs(s.x) < 960 && Math.abs(s.y) < 540, 'on screen');
  }
});

test('each bell’s flare dims and is gone 15 frames after it rings; none outside a beat after an arrival in the cosmos', () => {
  for (const at of BELL_LEVELS) {
    for (let f = at; f < at + 24; f++) {
      for (const [key, g] of born(bellFlares, f)) {
        assert.ok(flares(bellFlares(f + 5)).get(key)!.light < g.light, `the flare of ${f} is dimmer at +5`);
        assert.equal(flares(bellFlares(f + 15)).has(key), false, `the flare of ${f} is gone at +15`);
      }
    }
  }
  for (let f = partStart('cosmos'); f < STUTTER.to; f++) {
    if (bellFlares(f).length === 0) continue;
    assert.ok(BELL_LEVELS.some((at) => f >= at && f < at + 24), `a bell flare on ${f}`);
  }
});

// ── The core cools into Earth ───────────────────────────────────────────────

test('the core flares on the stab at cosmos 1.3& and has settled before the fill', () => {
  const quiet = luminance(coreColour(STAB - 1));
  assert.ok(luminance(coreColour(STAB)) > 1.5 * quiet, 'a flare on the stab');
  assert.ok(Math.abs(luminance(coreColour(STAB + 11)) - quiet) < 0.1 * quiet, 'settled 11 frames after it');
});

test('the core cools a step on each snare of the fill: white, gold, orange, deep red, then dark', () => {
  const FILL = [cosmos(1, 3), cosmos(1, 3.25), cosmos(1, 3.5), cosmos(1, 3.75)];
  const samples = [FILL[0] - 1, ...FILL.map((h) => h + 5)].map(coreColour);
  for (let i = 1; i < samples.length; i++) assert.ok(luminance(samples[i]) < luminance(samples[i - 1]), `dimmer after snare ${i}`);
  // Redder each time: less green against red (white ≈ 1, gold, orange, deep red ≈ 0).
  const green = samples.slice(0, 4).map((c) => c[1] / c[0]);
  assert.ok(green[0] > 0.9, `white-hot first (${green[0].toFixed(2)})`);
  for (let i = 1; i < 4; i++) assert.ok(green[i] < green[i - 1], `redder after snare ${i}: ${green.map((g) => g.toFixed(2))}`);
  assert.ok(green[3] < 0.15, 'deep red after the third');
  // A step on the hit, not a ramp: most of each step's cooling comes in its first three frames.
  for (const h of FILL) {
    const all = coreAt(h - 1).heat - coreAt(h + 5).heat;
    assert.ok(all > 0.1, `snare ${h} cools it`);
    assert.ok(coreAt(h - 1).heat - coreAt(h + 3).heat > 0.75 * all, `snare ${h} cools it at once`);
  }
});

/** Not grey: white-hot (every channel blown out), clearly warm (red leads, a strong hue) or dark (Earth's body). */
const notGrey = (c: RGB): boolean => {
  const white = Math.min(...c) >= 1;
  const warm = c[0] >= c[1] && c[0] >= c[2] && saturation(c) >= 0.3;
  const dark = Math.max(...c) <= 0.01;
  return white || warm || dark;
};

test('the core is never grey while it cools: white-hot, clearly warm or dark at every instant from the resume to cosmos 2.1', () => {
  for (let f = cosmos(1, 2); f <= cosmos(2); f += 0.125) {
    const c = coreColour(f);
    assert.ok(notGrey(c), `frame ${f}: ${c.map((v) => v.toFixed(4))}`);
  }
});

test('nowhere on its way from white-hot to dark does the core pass through grey, however fast it cools', () => {
  // Sub-frames can land anywhere on the ramp, so sweep the heat itself (the core of the fill, before it grows).
  const fill = cosmos(1, 3.25);
  for (let i = 0; i <= 2000; i++) {
    const heat = i / 2000;
    const c = bodies(fill, { r: coreAt(fill).r, heat, flare: 1 }).earth.color;
    assert.ok(notGrey(c), `heat ${heat}: ${c.map((v) => v.toFixed(4))}`);
  }
  // And it does go all the way: white-hot at the top, dark at the bottom.
  assert.ok(Math.min(...bodies(fill, { r: 30, heat: 1, flare: 1 }).earth.color) >= 1, 'white-hot at full heat');
  assert.ok(Math.max(...bodies(fill, { r: 30, heat: 0, flare: 1 }).earth.color) <= 0.01, 'dark when cold');
});

test('the core is dark by cosmos 2.1 and stays dark under Earth’s faces', () => {
  for (let f = cosmos(2); f <= cosmos(2, 3.75) + 2; f++) assert.ok(Math.max(...coreColour(f)) <= 0.01, `${f}: ${coreColour(f)}`);
});

test('the core stays a point until the third snare of the fill and grows to Earth only once it has cooled', () => {
  for (let f = cosmos(1); f <= cosmos(1, 3.5); f += 0.25) assert.ok(coreRadius(f) <= EARTH_R / 3, `${f}: ${coreRadius(f)}`);
  for (let f = cosmos(1, 2); f <= cosmos(2); f += 0.25) {
    if (coreRadius(f) > EARTH_R / 2) assert.ok(coreAt(f).heat <= 0.3, `${f}: half Earth's size while still at heat ${coreAt(f).heat.toFixed(2)}`);
  }
  assert.ok(coreRadius(cosmos(2)) >= 0.95 * EARTH_R, `Earth-sized on cosmos 2.1 (${coreRadius(cosmos(2))})`);
});

test('Earth’s dark body is Earth-sized from cosmos bar 2 until Earth fades into the arm, then it goes', () => {
  for (let f = cosmos(2); f < partEnd('cosmos'); f++) {
    const r = coreRadius(f);
    if (earthFade(f) > 0) assert.ok(r >= 0.95 * EARTH_R && r <= 1.1 * EARTH_R, `${f}: ${r}`);
    else assert.equal(r, 0, `${f}: the body outlives Earth`);
  }
  assert.ok(earthFade(partEnd('cosmos') - 1) <= 0, 'Earth has faded by the end of the cosmos');
});

// ── The drums on the small things ───────────────────────────────────────────

test('the small things hold steady when the hats are quiet and never dim below their own light', () => {
  for (const f of [BEFORE, partStart('cosmos') - 1, partFrame('club', 3, 3)]) for (let k = 0; k < 200; k++) assert.equal(hatPulse(f, k), 1, `item ${k} on ${f}`);
  for (let f = partStart('cosmos'); f < partStart('club') + 4; f += 3) for (let k = 0; k < 40; k++) assert.ok(hatPulse(f, k) >= 1, `item ${k} on ${f}`);
});

test('right on an open hat some of the small things sparkle, not all, and harder than on a closed hat', () => {
  const N = 400;
  const items = range(0, N);
  for (const o of OPEN_HATS.filter((h) => h < STUTTER.from)) {
    const lit = items.filter((k) => hatPulse(o, k) > 1).length;
    assert.ok(lit > 0 && lit < N, `${lit} of ${N} sparkle on ${o}`);
  }
  const onOpen = Math.max(...items.map((k) => hatPulse(cosmos(2, 0.5), k)));
  const onClosed = Math.max(...items.map((k) => hatPulse(cosmos(2, 0.25), k)));
  assert.ok(onClosed > 1, 'a closed hat sparkles too');
  assert.ok(onOpen > onClosed, `open ${onOpen.toFixed(2)} against closed ${onClosed.toFixed(2)}`);
});

// ── Whole on the drum frame (sync-3) ────────────────────────────────────────

/** The cosmos's sampling from cosmos bar 2 on (KosmosScene.temporal). */
const KOSMOS_TEMPORAL = { samples: 24, shutter: 0.5, persistence: 0 };
const FACES: CardLayout = { aspect: () => 2, quadPerEm: 1.25, faces: Array.from({ length: 97 }, (_, i) => `face${i}`) };
/** A card camera for a pose: its eye and unit right and up. */
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
const pxScaleAt = (height: number, fov: number): number => height / (2 * Math.tan((fov * Math.PI) / 360));

test('the faces swap on each clap of cosmos bars 2–4 whole on the clap’s own frame: every sub-frame of it has swapped, none of the frame before', () => {
  const claps = CLAPS.filter((c) => c >= LEVELS.earth && c < STUTTER.from);
  assert.equal(claps.length, 5, 'the claps of cosmos bars 2–4 before the stutter');
  claps.forEach((c, i) => {
    const n = CLAPS.indexOf(c) + 1;
    for (const s of temporalSamples(c, KOSMOS_TEMPORAL)) assert.equal(clapsBy(s.frame), n, `clap ${c}, sub-frame ${s.frame}`);
    for (const s of temporalSamples(c - 1, KOSMOS_TEMPORAL)) assert.equal(clapsBy(s.frame), n - 1, `frame ${c - 1}, sub-frame ${s.frame} (clap ${i})`);
  });
});

test('the arm’s faces swap whole on the clap frame: no sub-frame of a clap shows a face from before it', () => {
  // The arm is lit over cosmos 2.3–4.2; its stars stand still, so a card is known by its centre.
  for (const c of CLAPS.filter((x) => x >= cosmos(2, 3) && x <= cosmos(4, 1))) {
    const faces = (f: number): Map<string, string> => {
      const pose = voyageCamera(f);
      const cam = cardCamera(pose);
      return new Map(localCards(FACES, f, cam, pxScaleAt(1080, pose.fov), 1).map((k) => [k.centre.map((v) => v.toFixed(3)).join(','), k.face]));
    };
    const after = faces(c + 0.24);
    const before = faces(c - 0.76);
    let checked = 0;
    let changed = 0;
    for (const s of temporalSamples(c, KOSMOS_TEMPORAL)) {
      for (const [key, face] of faces(s.frame)) {
        if (!after.has(key)) continue;
        checked++;
        assert.equal(face, after.get(key), `clap ${c}, sub-frame ${s.frame.toFixed(3)}: a face from before the clap`);
        if (before.get(key) !== face) changed++;
      }
    }
    assert.ok(checked > 1000 && changed > 0.9 * checked, `clap ${c}: ${changed} of ${checked} faces swapped`);
  }
});

// ── The far stars in 1080p pixels (gpu-4) ───────────────────────────────────

test('the far stars are sized in 1080p pixels: a 4K frame draws them the same size in the world, 3–9 px at 1080p', () => {
  for (const f of [cosmos(1, 2), cosmos(2, 1.75), cosmos(3, 2.25) + 2]) {
    const pose = voyageCamera(f);
    const cam = cardCamera(pose);
    const reach = 2e5;
    const hd = skyCards(FACES, f, cam, pxScaleAt(1080, pose.fov), reach, 1);
    const k4 = skyCards(FACES, f, cam, pxScaleAt(2160, pose.fov), reach, 2);
    assert.equal(k4.length, hd.length);
    const h = (c: { up: readonly number[] }) => 2 * Math.hypot(c.up[0], c.up[1], c.up[2]);
    hd.forEach((c, i) => {
      assert.ok(Math.abs(h(k4[i]) - h(c)) < 1e-6 * h(c), `star ${i} on ${f}: ${h(k4[i])} at 4K vs ${h(c)} at 1080p`);
      const em = h(c) / FACES.quadPerEm;
      const px = (em * pxScaleAt(1080, pose.fov)) / reach;
      assert.ok(px >= 3 - 1e-9 && px <= 9 + 1e-9, `star ${i} on ${f}: ${px} px at 1080p`);
    });
  }
});

// ── The ember reads as a cooling ball (design-12) ───────────────────────────

test('the ember never outshines the small deep-red core while it grows into Earth: its area × brightness only falls from the last snare on', () => {
  const glow = (f: number): number => coreRadius(f) ** 2 * Math.max(...coreColour(f));
  const ember = glow(FILL[3] - 1);
  assert.ok(coreRadius(FILL[3] - 1) < 0.3 * EARTH_R, 'still small before the last snare');
  for (let f = FILL[3] - 1; f <= LEVELS.earth; f += 0.125) assert.ok(glow(f) <= 1.02 * ember, `${f}: r ${coreRadius(f).toFixed(0)}, ${coreColour(f).map((v) => v.toFixed(4))} — ${(glow(f) / ember).toFixed(2)}× the ember`);
});

test('once it cools to deep red the core’s limb darkens like a ball’s; while hot it keeps its soft glowing limb', () => {
  const at = (f: number) => bodies(f, coreAt(f)).earth;
  for (const f of [cosmos(1, 2), FILL[0] - 1, FILL[1] + 2, FILL[2] - 1]) assert.equal(at(f).limb, 0, `the hot core's limb at ${f}`);
  for (const f of [FILL[2] + 6, FILL[3] - 1, FILL[3] + 3, LEVELS.earth]) assert.equal(at(f).limb, 1, `the ember's limb at ${f}`);
  // The hot core's shading is the one approved: a third at the very limb.
  assert.ok(Math.abs(coreShade(0, 0) - 0.3) < 1e-9 && Math.abs(coreShade(1, 0) - 1) < 1e-9);
  // The ember: nine tenths of the way out (mu ≈ 0.44) at most a third of its middle, and near black at the limb.
  const mu = Math.sqrt(1 - 0.9 ** 2);
  assert.ok(coreShade(mu, 1) < 0.35 * coreShade(1, 1), `${coreShade(mu, 1)}`);
  assert.ok(coreShade(0, 1) < 0.06, `${coreShade(0, 1)}`);
  for (let i = 1; i <= 20; i++) assert.ok(coreShade(i / 20, 1) > coreShade((i - 1) / 20, 1), 'brighter towards the middle');
});
