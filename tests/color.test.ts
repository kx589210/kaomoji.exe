import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hue, linear, mixRGB, multiplyRGB, scaleRGB, srgb8, transmit } from '../src/engine/color.ts';

const close = (a: readonly number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-5);

test('sRGB hex to linear light', () => {
  assert.deepEqual(linear('#ffffff'), [1, 1, 1]);
  assert.deepEqual(linear('#000000'), [0, 0, 0]);
  assert.ok(close(linear('#808080'), [0.2158605, 0.2158605, 0.2158605]));
  assert.ok(close(linear('#E8402B', 2), [2 * 0.8069523, 2 * 0.0512695, 2 * 0.0241576]));
});

test('mix and scale', () => {
  assert.deepEqual(mixRGB([0, 0, 0], [1, 2, 3], 0.5), [0.5, 1, 1.5]);
  assert.deepEqual(scaleRGB([1, 2, 3], 2), [2, 4, 6]);
});

test('an ink at density 0 lets everything through, at density 1 it is the ink itself', () => {
  const ink = linear('#0078BF');
  assert.deepEqual(transmit(ink, 0), [1, 1, 1]);
  assert.ok(close(transmit(ink, 1), ink));
  assert.deepEqual(multiplyRGB([0.5, 0.2, 1], [0.5, 1, 0.1]), [0.25, 0.2, 0.1]);
});

test('srgb8 inverts linear(), and hue reads the colour wheel', () => {
  assert.deepEqual(srgb8(linear('#E8402B')), [0xe8, 0x40, 0x2b]);
  assert.ok(Math.abs(hue(linear('#0000FF')) - 240) < 1e-9);
  assert.ok(Math.abs(hue(linear('#FF0000'))) < 1e-9);
});
