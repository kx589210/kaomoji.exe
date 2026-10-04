import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SDF_EDGE, deepestPoint, sdfFromAlpha } from '../src/engine/sdf.ts';

test('a filled square gives an SDF that is high inside, low outside and ~edge on the boundary', () => {
  const w = 64;
  const h = 64;
  const alpha = new Float32Array(w * h);
  for (let y = 20; y < 44; y++) for (let x = 20; x < 44; x++) alpha[y * w + x] = 1;
  const sdf = sdfFromAlpha(alpha, w, h, 8);
  assert.equal(sdf[32 * w + 32], 255);
  assert.equal(sdf[2 * w + 2], 0);
  const edge = (sdf[32 * w + 19] + sdf[32 * w + 20]) / 2 / 255;
  assert.ok(Math.abs(edge - SDF_EDGE) < 0.08, `edge ${edge}`);
  for (let x = 12; x < 32; x++) assert.ok(sdf[32 * w + x + 1] >= sdf[32 * w + x], `monotonic at ${x}`);
});

/** Largest distance (output px) between the SDF's edge and a circle, over 720 directions, with bilinear sampling. */
function circleEdgeError(sdf: Uint8ClampedArray, n: number, cx: number, cy: number, r: number): number {
  const at = (x: number, y: number) => {
    const fx = x - 0.5;
    const fy = y - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const g = (i: number, j: number) => sdf[(y0 + j) * n + x0 + i];
    return (g(0, 0) * (1 - tx) + g(1, 0) * tx) * (1 - ty) + (g(0, 1) * (1 - tx) + g(1, 1) * tx) * ty;
  };
  let worst = 0;
  for (let k = 0; k < 720; k++) {
    const a = (k / 720) * 2 * Math.PI;
    let lo = r - 3;
    let hi = r + 3;
    for (let it = 0; it < 40; it++) {
      const m = (lo + hi) / 2;
      if (at(cx + Math.cos(a) * m, cy + Math.sin(a) * m) > SDF_EDGE * 255) lo = m;
      else hi = m;
    }
    worst = Math.max(worst, Math.abs((lo + hi) / 2 - r));
  }
  return worst;
}

test('a supersampled raster keeps curved edges within 0.1 px even when coverage is not linear (text gamma)', () => {
  const n = 64;
  const k = 4;
  const [cx, cy, r] = [32.3, 31.7, 20];
  const hi = n * k;
  const alpha = new Float32Array(hi * hi);
  for (let y = 0; y < hi; y++) {
    for (let x = 0; x < hi; x++) {
      let c = 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((x + (i + 0.5) / 4 - cx * k) ** 2 + (y + (j + 0.5) / 4 - cy * k) ** 2 < (r * k) ** 2) c++;
      // Browsers boost text coverage with a contrast curve; model that with a power.
      alpha[y * hi + x] = (c / 16) ** 0.6;
    }
  }
  const sdf = sdfFromAlpha(alpha, n, n, 8, k);
  assert.equal(sdf.length, n * n);
  const err = circleEdgeError(sdf, n, cx, cy, r);
  assert.ok(err < 0.1, `edge error ${err.toFixed(3)} px`);
});

test('deepestPoint finds the largest value inside a block of a strided image', () => {
  const stride = 16;
  const data = new Uint8Array(stride * 12);
  data[(2 + 3) * stride + (4 + 6)] = 250; // block starts at (4, 2); peak at (6, 3) inside it
  data[0] = 255; // outside the block: ignored
  assert.deepEqual(deepestPoint(data, stride, 4, 2, 10, 8), [6.5, 3.5]);
});
