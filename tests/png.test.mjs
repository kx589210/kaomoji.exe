import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodePng, diffImages, drawLabel, encodePng, imageStats, resize } from '../scripts/lib/png.mjs';

const noise = (width, height, channels) => {
  const data = new Uint8Array(width * height * channels);
  let s = 12345;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    data[i] = s >>> 24;
  }
  return { width, height, channels, data };
};

test('round-trips every filter type, RGB and RGBA', () => {
  for (const channels of [3, 4]) {
    const img = noise(17, 9, channels);
    for (const filter of [0, 1, 2, 3, 4]) {
      const back = decodePng(encodePng(img, { filter }));
      assert.equal(back.width, 17);
      assert.equal(back.height, 9);
      assert.equal(back.channels, channels);
      assert.deepEqual(back.data, img.data, `filter ${filter}, ${channels} channels`);
    }
  }
});

test('stats of a solid image have zero spread', () => {
  const img = { width: 4, height: 4, channels: 3, data: new Uint8Array(48).fill(200) };
  const s = imageStats(img);
  assert.deepEqual(s.mean, [200, 200, 200]);
  assert.deepEqual(s.std, [0, 0, 0]);
});

test('diff of identical images is zero, and finds a changed pixel', () => {
  const a = noise(8, 8, 4);
  const b = { ...a, data: a.data.slice() };
  assert.deepEqual(diffImages(a, b), { max: 0, mean: 0 });
  b.data[5] = (b.data[5] + 100) % 256;
  assert.ok(diffImages(a, b).max > 0);
});

test('resize box-filters to the mean', () => {
  const img = { width: 2, height: 2, channels: 3, data: new Uint8Array([0, 0, 0, 100, 100, 100, 200, 200, 200, 100, 100, 100]) };
  const r = resize(img, 1, 1);
  assert.deepEqual([...r.data], [100, 100, 100]);
});

test('drawLabel paints digits', () => {
  const img = { width: 40, height: 20, channels: 3, data: new Uint8Array(40 * 20 * 3) };
  drawLabel(img, 2, 2, '0123', 2, [255, 255, 255]);
  assert.ok(imageStats(img).mean[0] > 0);
});
