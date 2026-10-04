import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planChunks } from '../scripts/lib/remotion.mjs';

test('plans only missing frames, split into chunks', () => {
  assert.deepEqual(planChunks(10, new Set(), 4), [[0, 3], [4, 7], [8, 9]]);
  assert.deepEqual(planChunks(10, new Set([0, 1, 2, 5, 9]), 4), [[3, 4], [6, 8]]);
  assert.deepEqual(planChunks(3, new Set([0, 1, 2]), 4), []);
});
