import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_TEMPORAL, SWAP_LEAD, struck, temporalSamples, windowOf, withDensity } from '../src/engine/temporal.ts';

const total = (s: { weight: number }[]) => s.reduce((a, x) => a + x.weight, 0);

test('a plain shutter spreads equal-weight samples around the frame', () => {
  const s = temporalSamples(10, { samples: 4, shutter: 0.5, persistence: 0 });
  assert.deepEqual(s.map((x) => x.frame), [9.8125, 9.9375, 10.0625, 10.1875]);
  for (const x of s) assert.equal(x.weight, 0.25);
});

test('one sample is the frame itself', () => {
  assert.deepEqual(temporalSamples(7, { samples: 1, shutter: 0.5, persistence: 2 }), [{ frame: 7, weight: 1, cam: 7 }]);
});

test('persistence adds an exponential tail into the past', () => {
  const s = temporalSamples(100, { samples: 64, shutter: 0.5, persistence: 2 });
  assert.equal(s.length, 64);
  assert.ok(Math.abs(total(s) - 1) < 1e-9);
  assert.ok(s.every((x, i) => i === 0 || x.frame > s[i - 1].frame), 'oldest first');
  assert.ok(s[0].frame < 94 && s[0].frame > 93.7, `the tail reaches back 3τ before the shutter opens: ${s[0].frame}`);
  const near = (t: number) => s.reduce((b, x) => (Math.abs(x.frame - t) < Math.abs(b.frame - t) ? x : b));
  const ratio = near(99.75 - 2).weight / near(100).weight;
  assert.ok(Math.abs(ratio - Math.exp(-1)) < 0.05, `one persistence time earlier the weight is 1/e: ${ratio}`);
});

test('samples never leave the segment, so a hard cut is not double-exposed', () => {
  const after = temporalSamples(96, { samples: 16, shutter: 0.5, persistence: 0 }, { from: 96, to: 192 });
  assert.ok(after.every((x) => x.frame >= 96));
  const before = temporalSamples(95, { samples: 16, shutter: 4, persistence: 1.5 }, { from: 0, to: 96 });
  assert.ok(before.every((x) => x.frame < 96));
  assert.ok(Math.abs(total(before) - 1) < 1e-9);
});

test('afterglow scales the phosphor tail against the shutter', () => {
  const full = temporalSamples(50, { samples: 32, shutter: 0.5, persistence: 1.2 });
  const faint = temporalSamples(50, { samples: 32, shutter: 0.5, persistence: 1.2, afterglow: 0.2 });
  const tail = (s: { frame: number; weight: number }[]) => s.filter((x) => x.frame < 49.75).reduce((a, x) => a + x.weight, 0);
  assert.ok(Math.abs(total(faint) - 1) < 1e-9);
  assert.deepEqual(faint.map((x) => x.frame), full.map((x) => x.frame));
  assert.ok(tail(full) > 0.6, `full tail ${tail(full)}`);
  assert.ok(tail(faint) > 0.2 && tail(faint) < 0.35, `faint tail ${tail(faint)}`);
});

test('a sampling spec can be sized by samples per frame of its window', () => {
  assert.equal(windowOf({ samples: 1, shutter: 0.5, persistence: 0 }), 0.5);
  assert.ok(Math.abs(windowOf({ samples: 1, shutter: 0.5, persistence: 1.5 }) - 5) < 1e-12);
  const t = withDensity({ shutter: 0.5, persistence: 1.2, afterglow: 0.2 }, 32);
  assert.equal(t.samples, 132);
  assert.equal(t.afterglow, 0.2);
  assert.ok(t.samples / windowOf(t) >= 32);
});

test('phosphor-tail sub-frames keep the camera of the shutter-open instant; shutter sub-frames keep their own', () => {
  const s = temporalSamples(100, { samples: 40, shutter: 0.5, persistence: 2 });
  for (const x of s) assert.equal(x.cam, x.frame < 99.75 ? 99.75 : x.frame);
  const clamped = temporalSamples(96.2, { samples: 40, shutter: 0.5, persistence: 2 }, { from: 96, to: 200 });
  for (const x of clamped) assert.ok(x.cam >= 96 && x.cam <= 96.45, `${x.cam}`);
});

test('a swap keyed to a drum, taken SWAP_LEAD early, is whole on the drum’s own output frame and absent from the frame before', () => {
  assert.ok(SWAP_LEAD > 0 && SWAP_LEAD < 0.5, `${SWAP_LEAD}`);
  // The default shutter, and the cosmos's 24 sub-frames of 180°.
  for (const spec of [DEFAULT_TEMPORAL, { samples: 24, shutter: 0.5, persistence: 0 }]) {
    for (const drum of [1272, 1320, 1500]) {
      const on = temporalSamples(drum, spec);
      assert.ok(on.every((s) => struck(drum, s.frame)), `every sub-frame of ${drum} shows the new state`);
      const before = temporalSamples(drum - 1, spec);
      assert.ok(before.every((s) => !struck(drum, s.frame)), `no sub-frame of ${drum - 1} shows it`);
    }
  }
  // On integer frames (stills, drafts) it is the drum frame itself.
  assert.equal(struck(1272, 1272), true);
  assert.equal(struck(1272, 1271), false);
});
