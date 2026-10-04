import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IDENTITY_VIEW, type View, coverZoom, covered, viewMatrix } from '../src/engine/view.ts';

const apply = (m: number[], u: number, v: number) => [m[0] * u + m[3] * v + m[6], m[1] * u + m[4] * v + m[7]];
/** Where screen uv (u, w) samples the rendered frame: the frame is scaled by zoom, turned by roll, then moved by (x, y) px. */
const direct = (v: View, u: number, w: number) => {
  const px = (u - 0.5) * 1920 - v.x;
  const py = (w - 0.5) * 1080 - v.y;
  const c = Math.cos(v.roll);
  const s = Math.sin(v.roll);
  return [(c * px + s * py) / v.zoom / 1920 + 0.5, (-s * px + c * py) / v.zoom / 1080 + 0.5];
};

test('the identity view samples every pixel where it is', () => {
  assert.deepEqual(viewMatrix(IDENTITY_VIEW), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
});

test('viewMatrix maps each screen point to where the moved frame shows it', () => {
  for (const v of [{ zoom: 2, x: 0, y: 0, roll: 0 }, { zoom: 1.1, x: 30, y: -12, roll: 0 }, { zoom: 1.2, x: -8, y: 5, roll: 0.05 }]) {
    for (const [u, w] of [[0, 0], [1, 1], [0.3, 0.8], [0.5, 0.5]]) {
      const [a, b] = apply(viewMatrix(v), u, w);
      const [c, d] = direct(v, u, w);
      assert.ok(Math.abs(a - c) < 1e-12 && Math.abs(b - d) < 1e-12, `${JSON.stringify(v)} at ${u}, ${w}`);
    }
  }
});

test('covered() zooms just enough that no edge of the frame shows', () => {
  assert.equal(coverZoom(IDENTITY_VIEW), 1);
  assert.ok(Math.abs(coverZoom({ zoom: 1, x: 0, y: 54, roll: 0 }) - 1.1) < 1e-12);
  for (const v of [{ zoom: 1, x: 20, y: -15, roll: 0.01 }, { zoom: 1.03, x: -40, y: 25, roll: -0.02 }, { zoom: 1.5, x: 5, y: 5, roll: 0.004 }]) {
    const c = covered(v);
    assert.ok(c.zoom >= v.zoom);
    for (const [u, w] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const [a, b] = apply(viewMatrix(c), u, w);
      assert.ok(a >= -1e-9 && a <= 1 + 1e-9 && b >= -1e-9 && b <= 1 + 1e-9, `${JSON.stringify(v)}: corner ${u}, ${w} samples ${a}, ${b}`);
    }
  }
  assert.equal(covered({ zoom: 1.2, x: 0, y: 0, roll: 0 }).zoom, 1.2);
});
