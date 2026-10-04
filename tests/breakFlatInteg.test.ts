// Integration fixes on the flat part (break bars 2–5) found in the integrated rough cut (break-wip-v02).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import { DIAMOND } from '../src/score/break.ts';
import { flatSegment, flatTemporal, groundAt, worldAt } from '../src/shots/breakWorld.ts';

const mint = (f: number) => worldAt(f).items.find((i) => i.role === 'block' && i.colorName === 'mint');

test('24.1: the kick launches the diamond wipe — the mint block is already off at full speed on 2208 (a launch, not an ease-in), one sharp instant per frame', () => {
  const before = mint(DIAMOND - 1)!;
  const hit = mint(DIAMOND)!;
  assert.ok(hit.scale >= 2, `on the kick it has already grown: scale ${hit.scale.toFixed(2)}`);
  assert.ok(Math.hypot(hit.x - before.x, hit.y - before.y) >= 150, `and moved toward the centre: ${Math.hypot(hit.x - before.x, hit.y - before.y).toFixed(0)} px`);
  // Every sub-frame of the kick's frame shows the same instant (no ghost of the resting block under the launched one).
  for (const s of temporalSamples(DIAMOND, flatTemporal(DIAMOND), flatSegment(DIAMOND))) {
    const m = mint(s.frame)!;
    assert.equal(m.scale, hit.scale, `scale @ ${s.frame.toFixed(3)}`);
    assert.equal(m.x, hit.x, `x @ ${s.frame.toFixed(3)}`);
  }
  // The step per frame shrinks after the kick (a launch decelerates), and the diamond is whole by the time the ground turns mint.
  const scales = Array.from({ length: 10 }, (_, i) => mint(DIAMOND + i)!.scale);
  for (let i = 2; i < scales.length; i++) assert.ok(scales[i] - scales[i - 1] <= scales[i - 1] - scales[i - 2] + 1e-9, `decelerating at ${DIAMOND + i}`);
  assert.ok(Math.abs(scales[9] - 6) < 1e-6, `full size on ${DIAMOND + 9}: ${scales[9]}`);
  assert.equal(groundAt(DIAMOND + 10), 'mint');
});
