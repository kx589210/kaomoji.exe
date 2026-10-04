import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FRAMES_PER_BAR, FRAMES_PER_BEAT, TOTAL_BARS, TOTAL_FRAMES, barFrame, barOfFrame, barSeconds, frameToBeat, frameToSeconds, secondsToFrame,
} from '../src/score/tempo.ts';

test('grid constants match the spec', () => {
  assert.equal(FRAMES_PER_BEAT, 24);
  assert.equal(FRAMES_PER_BAR, 96);
  // The film's length comes from its map (src/score/film.ts; today's numbers are pinned in tests/filmMap.test.ts).
  assert.equal(TOTAL_FRAMES, TOTAL_BARS * FRAMES_PER_BAR);
});

test('bar and beat conversions', () => {
  assert.equal(barFrame(1), 0);
  assert.equal(barFrame(5), 384);
  assert.equal(barFrame(36, 4), 3456);
  assert.equal(barFrame(2, 0.5), 108);
  assert.equal(barOfFrame(95), 1);
  assert.equal(barOfFrame(96), 2);
  assert.equal(barOfFrame(95.9), 1);
  assert.equal(frameToBeat(24), 1);
  assert.equal(barSeconds(13), 19.2);
  assert.equal(frameToSeconds(3456), 57.6);
  assert.equal(secondsToFrame(0.4), 24);
});

test('conversions accept fractional and negative frames', () => {
  assert.equal(barOfFrame(-0.25), 0);
  assert.ok(Number.isFinite(frameToBeat(-0.25)));
});
