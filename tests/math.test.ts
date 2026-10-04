import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clamp, ease, invLerp, lerp, prog, remap, smoothstep, springAt } from '../src/engine/math.ts';

test('basic interpolation', () => {
  assert.equal(clamp(2), 1);
  assert.equal(clamp(-1), 0);
  assert.equal(lerp(10, 20, 0.25), 12.5);
  assert.equal(invLerp(10, 20, 15), 0.5);
  assert.equal(invLerp(5, 5, 7), 0);
  assert.equal(remap(15, 10, 20, 0, 100), 50);
  assert.equal(remap(25, 10, 20, 0, 100), 100);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
});

test('every easing starts at 0 and ends at 1', () => {
  for (const [name, e] of Object.entries(ease)) {
    assert.ok(Math.abs(e(0)) < 1e-9, `${name}(0)`);
    assert.ok(Math.abs(e(1) - 1) < 1e-9, `${name}(1)`);
  }
});

test('prog clamps outside its window', () => {
  assert.equal(prog(-5, 0, 10), 0);
  assert.equal(prog(15, 0, 10), 1);
  assert.equal(prog(5, 0, 10, ease.linear), 0.5);
});

test('springAt starts at 0, settles at 1 and is finite before t = 0', () => {
  assert.equal(springAt(0), 0);
  assert.equal(springAt(-1), 0);
  assert.ok(Math.abs(springAt(10) - 1) < 1e-4);
  const wobbly = [...Array(200)].map((_, i) => springAt(i / 100, { stiffness: 200, damping: 8, mass: 1 }));
  assert.ok(Math.max(...wobbly) > 1.05, 'underdamped overshoots');
  const stiff = [...Array(200)].map((_, i) => springAt(i / 100, { stiffness: 100, damping: 20, mass: 1 }));
  assert.ok(Math.max(...stiff) <= 1 + 1e-9, 'critically damped does not overshoot');
  const heavy = [...Array(200)].map((_, i) => springAt(i / 100, { stiffness: 100, damping: 40, mass: 1 }));
  assert.ok(heavy.every(Number.isFinite) && Math.max(...heavy) <= 1 + 1e-9, 'overdamped');
  assert.ok(
    Math.abs(springAt(0.3, { stiffness: 100, damping: 19.999, mass: 1 }) - springAt(0.3, { stiffness: 100, damping: 20.001, mass: 1 })) < 1e-3,
    'continuous across critical damping',
  );
});
