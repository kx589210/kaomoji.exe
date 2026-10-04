import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nestContours, pointInPolygon, signedArea, type Pt } from '../src/engine/contours.ts';

const square = (x: number, y: number, s: number, cw = false): Pt[] => {
  const pts: Pt[] = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
  return cw ? pts.reverse() : pts;
};

test('signed area and point-in-polygon', () => {
  assert.equal(signedArea(square(0, 0, 2)), 4);
  assert.equal(signedArea(square(0, 0, 2, true)), -4);
  assert.ok(pointInPolygon([1, 1], square(0, 0, 2)));
  assert.ok(!pointInPolygon([3, 1], square(0, 0, 2)));
});

test('nesting ignores winding: outer, hole, island in the hole, separate outer', () => {
  const contours = [square(0, 0, 10, true), square(2, 2, 6, true), square(4, 4, 2), square(20, 0, 3)];
  const groups = nestContours(contours);
  assert.deepEqual(groups.map((g) => g.outer).sort(), [0, 2, 3]);
  assert.deepEqual(groups.find((g) => g.outer === 0)!.holes, [1]);
  assert.deepEqual(groups.find((g) => g.outer === 2)!.holes, []);
});
