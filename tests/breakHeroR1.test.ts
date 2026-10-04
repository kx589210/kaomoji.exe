// Round-1 review fixes on the hero (src/shots/breakHero.ts): the break 4.3 clap whole on its frame (R1-02b), E3's galaxy that reads as a
// galaxy (R1-02a), the pop-out and ghost-snare accents before the hang (R1-07b, R1-11), the loose brackets' living hold (R1-11), and
// the keyline that keeps him one subject in front of his copies (R1-06).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linear } from '../src/engine/color.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { FRAGMENTS, apply, galaxyAt, galaxyParts, heroAt, heroFx, keylineAt, pivotOf, tofuSides } from '../src/shots/breakHero.ts';
import { flatSegment, flatTemporal } from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const frag = (f: number, k: number) => heroAt(f).frags.find((d) => d.k === k);
const centre = (f: number, k: number): [number, number] => apply(frag(f, k)!.m, FRAGMENTS.find((q) => q.k === k)!.c);
const eyesOf = (f: number) => heroAt(f).tex.glyphs.filter((g) => g.group === 'eyeL' || g.group === 'eyeR').map((g) => `${g.group}:${g.ch}`);

test('R1-02b: the 24.3 clap is whole on its frame — every sub-frame of 2256 shows • over the empty slot (no box) above the rescan, (－ω－) below', () => {
  for (const s of temporalSamples(at(4, 3), flatTemporal(at(4, 3)), flatSegment(at(4, 3)))) {
    const h = heroAt(s.frame);
    assert.deepEqual(eyesOf(s.frame), ['eyeL:•'], `upper face on ${s.frame.toFixed(3)}`);
    assert.equal(h.tex.tofu, null, `the box is gone on ${s.frame.toFixed(3)}`);
    assert.ok(h.texNew, `the dazed face waits below the bar on ${s.frame.toFixed(3)}`);
    assert.equal(tofuSides(s.frame).length, 4, `the box's sides kick off on ${s.frame.toFixed(3)}`);
  }
  for (const s of temporalSamples(at(4, 3) - 1, flatTemporal(at(4, 3) - 1), flatSegment(at(4, 3) - 1))) {
    const h = heroAt(s.frame);
    assert.ok(h.tex.tofu, `the box is whole on ${s.frame.toFixed(3)}`);
    assert.equal(h.texNew, null, `no rescan yet on ${s.frame.toFixed(3)}`);
    assert.equal(tofuSides(s.frame).length, 0);
  }
});

const SPACE = linear('#0B0C0E');
test('R1-02a: E3 is a tiny galaxy flying at his eye — a dark space disc (1.15 × its size, an ink rim), ≥ 40 px from the start, dots ≥ 4 px at full alpha, a white streak behind it', () => {
  near(galaxyAt(at(4, 2.75))!.size, 40, 0.5, 'starts at 40 px');
  for (const f of [at(4, 2.75), at(4, 2.75) + 2, at(4, 3) - 2, at(4, 3) - 0.5]) {
    const g = galaxyParts(f)!;
    assert.deepEqual(g.disc.color, SPACE, `the disc is space-dark on ${f}`);
    near(g.disc.d, 1.15 * galaxyAt(f)!.size, 0.5, `disc diameter on ${f}`);
    assert.ok(g.disc.rim >= 3, 'an ink rim');
    assert.ok(g.dots.length >= 60, `enough dots to read as arms on ${f}`);
    for (const d of g.dots) {
      assert.ok(d.size >= 4, `dot ≥ 4 px on ${f}`);
      assert.equal(d.alpha, 1, `dots at full alpha on ${f}`);
    }
  }
  for (const f of [at(4, 2.75) + 1, at(4, 2.875), at(4, 3) - 1]) {
    const tr = galaxyParts(f)!.trail;
    assert.ok(tr.length >= 8, `a streak behind it on ${f}`);
    const widths = tr.map((s) => s.w);
    near(Math.max(...widths), 6, 0.6, 'the streak is 6 px at its head');
    assert.ok(Math.min(...widths) < 1.5, 'tapering to nothing at its tail');
  }
  // Two frames before it lands (break 4.3 − 2), it is already big enough to see as a galaxy (not a speck).
  assert.ok(galaxyAt(at(4, 3) - 2)!.size >= 110, `size on 2254: ${galaxyAt(at(4, 3) - 2)!.size}`);
});

test('R1-02a: the full spiral holds at his eye, turning, through 2256–2259, winds in over 2259–2265; his right eye is never an empty slot', () => {
  const g56 = galaxyAt(at(4, 3))!;
  near(g56.x, 1290, 1, 'at the eye x');
  near(g56.y, 582, 1, 'at the eye y');
  for (const f of [at(4, 3), at(4, 3) + 1, at(4, 3) + 2, at(4, 3.125)]) {
    near(galaxyAt(f)!.size, 220, 0.5, `full size on ${f}`);
    assert.equal(galaxyAt(f)!.wind, 0, `not winding yet on ${f}`);
  }
  assert.ok(galaxyAt(at(4, 3) + 2)!.turn > galaxyAt(at(4, 3))!.turn + 0.03, 'turning while it holds');
  near(galaxyAt(at(4, 3.25))!.wind, 0.5, 1e-9, 'half wound on 2262');
  near(galaxyAt(at(4, 3.375))!.wind, 1, 1e-9, 'wound in on 2265');
  // The eye slot: the galaxy's disc covers it until the rescan has put the dazed pill there (the bar's line above the eye's centre).
  for (let f = at(4, 3); f < at(4, 3.5); f += 0.5) {
    const g = galaxyParts(f);
    const disc = g && g.disc.d * g.disc.alpha > 40;
    const pill = heroAt(f).texNew !== null && heroAt(f).clipY <= 582;
    const after = f >= at(4, 3.25); // past the rescan the right eye is the dazed pill on both textures
    assert.ok(disc || pill || after, `the right eye is something on ${f}`);
  }
  // After the wind a faint white glint turns inside the pill for the rest of the beat.
  const glint = galaxyParts(at(4, 3.5) + 2)!;
  assert.ok(glint.dots.length > 0 && glint.dots.every((d) => d.alpha > 0 && d.alpha < 0.6), 'a faint glint');
  assert.equal(glint.disc.alpha, 0, 'the disc is gone');
  assert.equal(galaxyParts(at(4, 4)), null);
});

test('R1-07b: on 24.3& the eye fragment pops white for one frame with a small ring, and the face recoils 6 px', () => {
  const white = linear('#FFFFFF');
  assert.deepEqual(frag(at(4, 3.5), 37)!.tint, white, 'white on 2268');
  for (const f of [at(4, 3.5) - 1, at(4, 3.5) + 1, at(4, 3.75) - 2]) assert.equal(frag(f, 37)!.tint, null, `not on ${f}`);
  for (const s of temporalSamples(at(4, 3.5), flatTemporal(at(4, 3.5)), flatSegment(at(4, 3.5)))) assert.deepEqual(frag(s.frame, 37)!.tint, white, `whole on ${s.frame.toFixed(3)}`);
  const rings = heroFx(at(4, 3.625)).shapes.filter((s) => s.kind === 'ring');
  assert.ok(rings.length >= 1, 'a ring at the pop-out');
  const dx = centre(at(4, 3.5) + 2, 0)[0] - centre(at(4, 3.5) - 1, 0)[0];
  assert.ok(dx > 4, `the face recoils right: ${dx.toFixed(2)} px`);
});

test('R1-11: on the 24.3& ghost snare (2274) the dangling eye takes a 10 px kick and the face pops 1.04', () => {
  const [ax, ay] = centre(at(4, 3.75) - 1, 37);
  const [bx, by] = centre(at(4, 3.75) + 2, 37);
  assert.ok(Math.hypot(bx - ax, by - ay) > 7, `kicked: ${Math.hypot(bx - ax, by - ay).toFixed(2)} px`);
  const span = (f: number) => {
    const a = centre(f, 29);
    const b = centre(f, 22);
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
  };
  assert.ok(span(at(4, 3.75) + 2) > span(at(4, 3.75) - 1) * 1.025, `popped: ${(span(at(4, 3.75) + 2) / span(at(4, 3.75) - 1)).toFixed(4)}`);
});

test('R1-11: the loose brackets twitch 6 px toward their slots on the 22.3& and 22.4& glass hats (2076, 2100)', () => {
  for (const [k, g] of [[52, 'open'], [45, 'close']] as const) {
    const pin = (f: number) => apply(frag(f, k)!.m, pivotOf(g));
    for (const hat of [at(2, 3.5), at(2, 4.5)]) {
      const d = Math.hypot(pin(hat + 3)[0] - pin(hat)[0], pin(hat + 3)[1] - pin(hat)[1]);
      assert.ok(d > 4.5 && d < 9, `${g} twitches on ${hat}: ${d.toFixed(2)} px`);
    }
  }
});

test('R1-03: awake, he bops 3 % on 25.1&’s closed 16th (2322), so the bar’s first 16ths are on him too', () => {
  const width = (f: number) => {
    const g = heroAt(f).glyphs!;
    return g[g.length - 1].x - g[0].x;
  };
  assert.ok(width(at(5, 1.75) + 0.2) > width(at(5, 1.75) - 0.5) * 1.02, `a bop on 2322: ${(width(at(5, 1.75) + 0.2) / width(at(5, 1.75) - 0.5)).toFixed(4)}`);
});

test('R1-06: a 10 px cream keyline holds him apart from his copies while they fan and ripple behind him, and only then', () => {
  assert.equal(keylineAt(at(5, 1.75) - 2), 0);
  for (const f of [at(5, 2.25), at(5, 3) - 2, at(5, 3.75), at(5, 4.25) - 2]) near(keylineAt(f), 10, 1e-9, `keyline on ${f}`);
  assert.ok(keylineAt(at(5, 2) + 1) > 0 && keylineAt(at(5, 2) + 1) < 10, 'growing in with the fan');
  assert.equal(keylineAt(at(5, 4.75) + 2), 0);
  assert.equal(keylineAt(at(6) - 1), 0, 'none at the match cut');
  assert.equal(heroAt(at(5, 3) - 2).keyline, 10);
});
