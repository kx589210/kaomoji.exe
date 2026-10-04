import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { checkManifest, frameName, framesOnDisk, isCompleteJpeg, writeFrameAtomic } from '../scripts/lib/frames.mjs';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
const dirs = [];
const tmp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-frames-'));
  dirs.push(d);
  return d;
};
after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

test('frame names have one width for the whole composition, whatever the chunk', () => {
  assert.equal(frameName(5, 3456), 'f0005.jpeg');
  assert.equal(frameName(959, 3456), 'f0959.jpeg');
  assert.equal(frameName(3455, 3456), 'f3455.jpeg');
  assert.equal(frameName(5, 300), 'f005.jpeg');
  assert.equal(frameName(5, 100), 'f05.jpeg');
});

test('a JPEG counts only when it has both its start and its end marker', () => {
  assert.equal(isCompleteJpeg(JPEG), true);
  assert.equal(isCompleteJpeg(JPEG.subarray(0, 7)), false, 'truncated');
  assert.equal(isCompleteJpeg(Buffer.alloc(0)), false);
});

test('only complete frames with this composition’s names are done; atomic writes leave nothing half-written', () => {
  const dir = tmp();
  writeFrameAtomic(dir, 0, 3456, JPEG);
  fs.writeFileSync(path.join(dir, 'f0001.jpeg'), JPEG.subarray(0, 6));
  fs.writeFileSync(path.join(dir, 'f2.jpeg'), JPEG);
  fs.writeFileSync(path.join(dir, 'f0003.jpeg.tmp'), JPEG);
  writeFrameAtomic(dir, 960, 3456, JPEG);
  assert.deepEqual([...framesOnDisk(dir, 3456)].sort((a, b) => a - b), [0, 960]);
  assert.ok(!fs.readdirSync(dir).some((f) => f.startsWith('f0960') && f.endsWith('.tmp')));
});

test('frames from a different render setup are refused instead of reused', () => {
  const dir = tmp();
  const want = { comp: 'KX-Intro', frames: 384, scale: 2, quality: 'final', source: 'abc' };
  checkManifest(dir, want);
  checkManifest(dir, { ...want });
  assert.throws(() => checkManifest(dir, { ...want, quality: 'draft' }), /manifest/);
  assert.throws(() => checkManifest(dir, { ...want, source: 'def' }), /manifest/);
});
