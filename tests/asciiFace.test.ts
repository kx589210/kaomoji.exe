import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type FaceCell, RAMP, shadeFace } from '../src/actors/asciiFace.ts';

/** Anti-aliased disc coverage on a w × h raster. */
function disc(w: number, h: number, cx: number, cy: number, r: number): Float32Array {
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = Math.min(1, Math.max(0, r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5));
  return a;
}

const SUB_X = 4;
const SUB_Y = 8;
const centre = (c: FaceCell): [number, number] => [c.col * SUB_X + SUB_X / 2, c.row * SUB_Y + SUB_Y / 2];

test('an embossed disc: a flat top, a lit upper-left rim, a shaded lower-right rim and nothing outside', () => {
  const cells = shadeFace({ cols: 40, rows: 20, subX: SUB_X, subY: SUB_Y, parts: [disc(160, 160, 80, 80, 60)] });
  const dist = (c: FaceCell) => {
    const [x, y] = centre(c);
    return Math.hypot(x - 80, y - 80);
  };
  assert.ok(cells.length > 300);
  assert.ok(cells.every((c) => dist(c) < 65), 'no cells outside the disc');
  assert.ok(cells.every((c) => c.ch !== ' ' && RAMP.includes(c.ch) && c.part === 0));
  const flat = cells.find((c) => c.col === 20 && c.row === 10)!;
  assert.equal(flat.ch, '#');
  const rim = cells.filter((c) => dist(c) > 52 && dist(c) < 59);
  const upperLeft = rim.filter((c) => centre(c)[0] < 70 && centre(c)[1] < 70);
  const lowerRight = rim.filter((c) => centre(c)[0] > 90 && centre(c)[1] > 90);
  const mean = (cs: FaceCell[]) => cs.reduce((a, c) => a + c.lum, 0) / cs.length;
  assert.ok(upperLeft.length > 0 && lowerRight.length > 0);
  assert.ok(mean(upperLeft) > flat.lum + 0.1, `lit rim ${mean(upperLeft)} vs flat ${flat.lum}`);
  assert.ok(mean(lowerRight) < flat.lum - 0.1, `shaded rim ${mean(lowerRight)} vs flat ${flat.lum}`);
});

test('each cell belongs to the character that covers it most', () => {
  const cells = shadeFace({ cols: 40, rows: 10, subX: SUB_X, subY: SUB_Y, parts: [disc(160, 80, 40, 40, 30), disc(160, 80, 120, 40, 30)] });
  assert.ok(cells.some((c) => c.part === 0) && cells.some((c) => c.part === 1));
  assert.ok(cells.filter((c) => c.col < 20).every((c) => c.part === 0));
  assert.ok(cells.filter((c) => c.col >= 20).every((c) => c.part === 1));
});
