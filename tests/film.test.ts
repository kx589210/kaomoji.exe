// The FILM map (src/score/film.ts): rules that hold for any map, so this file survives inserting bars. Today's numbers are pinned in
// tests/filmMap.test.ts, the one test that names absolute frames.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FILM, type PartId, STUBS, TAILS, TOTAL_BARS, TOTAL_FRAMES, builtEnd, heldFrame, isHeld, locate, partBar, partBars, partEnd, partFrame, partStart, seedFrame, v07Frame } from '../src/score/film.ts';
import * as tempo from '../src/score/tempo.ts';
import { BEATS_PER_BAR, FRAMES_PER_BAR, FRAMES_PER_BEAT, barFrame, barOfFrame } from '../src/score/tempo.ts';

const ids = FILM.map((p) => p.id);
/** Beats to try: on and between the 32nd-note grid, up to the next downbeat. */
const BEATS = [0, 0.125, 0.25, 0.5, 1, 1.25, 1.5, 2, 2.75, 3, 3.5, 3.875, 4];

test('parts have unique ids and a whole, positive number of bars; the film is their sum', () => {
  assert.equal(new Set(ids).size, ids.length);
  for (const p of FILM) assert.ok(Number.isInteger(p.bars) && p.bars > 0, `${p.id}: ${p.bars} bars`);
  assert.equal(TOTAL_BARS, FILM.reduce((n, p) => n + p.bars, 0));
  assert.equal(TOTAL_FRAMES, TOTAL_BARS * FRAMES_PER_BAR);
});

test('tempo.ts re-exports the film length from the map, so its old importers keep working', () => {
  assert.equal(tempo.TOTAL_BARS, TOTAL_BARS);
  assert.equal(tempo.TOTAL_FRAMES, TOTAL_FRAMES);
});

test('the parts tile the film in order: each starts on a bar line where the one before ends', () => {
  assert.equal(partStart(ids[0]), 0);
  ids.forEach((id, i) => {
    const bars = FILM[i].bars;
    assert.equal(partStart(id) % FRAMES_PER_BAR, 0, `${id} starts on a downbeat`);
    assert.equal(partEnd(id) - partStart(id), bars * FRAMES_PER_BAR, `${id} is ${bars} bars long`);
    if (i > 0) assert.equal(partStart(id), partEnd(ids[i - 1]), `${ids[i - 1]} → ${id}`);
  });
  assert.equal(partEnd(ids[ids.length - 1]), TOTAL_FRAMES);
});

test('part-local bars count from 1 inside each part and map onto consecutive film bars', () => {
  let next = 1;
  for (const p of FILM) {
    assert.deepEqual(partBars(p.id), Array.from({ length: p.bars }, (_, i) => next + i), p.id);
    assert.equal(partBar(p.id), next, `${p.id}: bar 1 is the default`);
    for (let b = 1; b <= p.bars + 1; b++) assert.equal(partBar(p.id, b), next + b - 1, `${p.id} ${b}`);
    next += p.bars;
  }
  assert.equal(next, TOTAL_BARS + 1);
});

test("partFrame is barFrame's own arithmetic on the part's film bar, bit for bit", () => {
  for (const p of FILM) {
    for (let bar = 1; bar <= p.bars; bar++) {
      for (const beat of BEATS) {
        const f = partFrame(p.id, bar, beat);
        assert.ok(Object.is(f, barFrame(partBar(p.id, bar), beat)), `${p.id} ${bar}, beat ${beat}`);
        assert.ok(Object.is(f, partStart(p.id) + (bar - 1) * FRAMES_PER_BAR + beat * FRAMES_PER_BEAT), `${p.id} ${bar}, beat ${beat}`);
      }
      assert.equal(partFrame(p.id, bar), partFrame(p.id, bar, 0), `${p.id} ${bar}: beat 0 is the default`);
    }
    assert.equal(partFrame(p.id, 1), partStart(p.id), `${p.id}: bar 1 is the part's first frame`);
    assert.equal(partFrame(p.id, p.bars + 1), partEnd(p.id), `${p.id}: the bar after the last is the part's end`);
    assert.equal(partFrame(p.id, p.bars, BEATS_PER_BAR), partEnd(p.id), `${p.id}: the last bar's 4th beat ends on the part's end`);
  }
});

test('a position outside its part throws instead of quietly landing in a neighbour', () => {
  const p = FILM[0];
  const bad: [PartId, number, number?][] = [
    [p.id, 0],
    [p.id, -1],
    [p.id, p.bars + 2],
    [p.id, 1.5],
    [p.id, Number.NaN],
    [p.id, 1, -0.25],
    [p.id, 1, BEATS_PER_BAR + 0.5],
    [p.id, 1, Number.NaN],
    [p.id, p.bars + 1, 0.5],
    ['nope' as PartId, 1],
  ];
  for (const [id, bar, beat] of bad) assert.throws(() => partFrame(id, bar, beat), RangeError, `partFrame(${id}, ${bar}, ${beat})`);
  assert.throws(() => partBar(p.id, 0), RangeError);
  assert.throws(() => partBar(p.id, p.bars + 2), RangeError);
  assert.throws(() => partStart('nope' as PartId), RangeError);
  assert.throws(() => partEnd('nope' as PartId), RangeError);
  assert.throws(() => partBars('nope' as PartId), RangeError);
});

test('locate finds the part, its bar and the beat of any frame, and partFrame takes it back', () => {
  for (const p of FILM) {
    for (let bar = 1; bar <= p.bars; bar++) {
      for (const beat of BEATS.filter((b) => b < BEATS_PER_BAR)) {
        const f = partFrame(p.id, bar, beat);
        assert.deepEqual(locate(f), { id: p.id, bar, beat }, `frame ${f}`);
      }
    }
  }
  for (let f = 0; f < TOTAL_FRAMES; f += 0.75) {
    const at = locate(f);
    assert.ok(f >= partStart(at.id) && f < partEnd(at.id), `frame ${f} lies inside ${at.id}`);
    assert.equal(partBar(at.id, at.bar), barOfFrame(f), `frame ${f}: the same film bar as barOfFrame`);
    assert.ok(Object.is(partFrame(at.id, at.bar, at.beat), f), `frame ${f} round trip`);
  }
});

test('locate clamps frames outside the film to the first and last parts, counting bars on past them', () => {
  const first = FILM[0];
  const last = FILM[FILM.length - 1];
  assert.deepEqual(locate(-FRAMES_PER_BEAT), { id: first.id, bar: 0, beat: 3 });
  assert.deepEqual(locate(TOTAL_FRAMES), { id: last.id, bar: last.bars + 1, beat: 0 });
  assert.deepEqual(locate(TOTAL_FRAMES + 1.5 * FRAMES_PER_BEAT), { id: last.id, bar: last.bars + 1, beat: 1.5 });
});

test('a stub (a part not built yet) holds the last built frame of the part before it on every one of its frames, sub-frames kept; it is never a held tail, so it is not gated to silence', () => {
  for (const s of STUBS) {
    const i = FILM.findIndex((p) => p.id === s.id);
    assert.ok(i > 0, `${s.id} has a part before it`);
    assert.equal(s.holds, FILM[i - 1].id);
    assert.equal(s.frame, builtEnd(s.holds) - 1);
    assert.deepEqual([s.from, s.to], [partStart(s.id), partEnd(s.id)]);
    assert.ok(!TAILS.some((t) => t.from < s.to && t.to > s.from), `${s.id} is not a held tail`);
    for (let f = s.from; f < s.to; f += 0.25) {
      assert.ok(isHeld(f), `${f} is held`);
      assert.ok(Object.is(heldFrame(f), s.frame + (f - Math.round(f))), `${f} shows ${s.frame}`);
      assert.equal(seedFrame(f), f, `${f}: a stub seeds with its own frames`);
    }
    assert.ok(!isHeld(s.from - 1) || TAILS.length > 0, 'the frame before a stub is drawn');
    assert.ok(!isHeld(s.to) || s.to === TOTAL_FRAMES, 'the frame after a stub is drawn');
  }
});

test('v07Frame moves every frame of a part by one whole number of bars (its own place on the 61-bar map), so floor(), round() and sub-frames keep their relations', () => {
  for (const p of FILM) {
    const d = partStart(p.id) - v07Frame(partStart(p.id));
    assert.equal(d % FRAMES_PER_BAR, 0, p.id);
    for (let f = partStart(p.id); f < partEnd(p.id); f += 7.25) assert.equal(f - v07Frame(f), d, `${p.id} ${f}`);
  }
});
