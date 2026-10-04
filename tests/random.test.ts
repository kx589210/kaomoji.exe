import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hash, noise1, rng } from '../src/engine/random.ts';

test('rng is deterministic per seed and stays in [0, 1)', () => {
  const a = rng(42);
  const b = rng(42);
  const c = rng(43);
  const xs = [...Array(1000)].map(() => a());
  assert.deepEqual(xs, [...Array(1000)].map(() => b()));
  assert.notDeepEqual(xs.slice(0, 5), [...Array(5)].map(() => c()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05);
});

test('hash is stable and spreads inputs', () => {
  assert.equal(hash(1, 2, 3), hash(1, 2, 3));
  assert.notEqual(hash(1, 2, 3), hash(1, 2, 4));
  assert.ok(hash(7) >= 0 && hash(7) < 1);
});

test('noise1 is smooth and bounded', () => {
  for (let x = -10; x < 10; x += 0.37) {
    const v = noise1(x, 5);
    assert.ok(v >= -1 && v <= 1);
    assert.ok(Math.abs(noise1(x + 0.001, 5) - v) < 0.01, `continuous at ${x}`);
  }
});
