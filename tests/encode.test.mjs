import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { readWav, writeWav } from '../scripts/audio/wav.mjs';
import { DELIVERY_TRIM_DB, downscale, encodeMaster, probeVideo } from '../scripts/lib/encode.mjs';
import { encodePng } from '../scripts/lib/png.mjs';
import { ffmpegPath } from '../scripts/lib/remotion.mjs';

// A 128×64 test card in four 32-px columns: white, black, red, Riso blue. It is
// saved as a full-range BT.601 JPEG, which is what Remotion writes for frames.
const W = 128;
const H = 64;
const COLUMNS = [[255, 255, 255], [0, 0, 0], [255, 0, 0], [0, 120, 191]];
const CENTERS = [16, 48, 80, 112];
let dir;
let master;

/** Y, Cb, Cr stored at pixel (x, y) of the first frame, read without any conversion. */
function yuvAt(file, width, height, x, y) {
  const raw = execFileSync(ffmpegPath(), ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'rawvideo', '-'], { maxBuffer: 1 << 24 });
  const c = (y >> 1) * (width >> 1) + (x >> 1);
  return [raw[y * width + x], raw[width * height + c], raw[width * height + (width >> 1) * (height >> 1) + c]];
}

/** Limited-range BT.709 Y'CbCr → 8-bit R'G'B'. */
function rgbFrom709([Y, Cb, Cr]) {
  const y = (Y - 16) / 219;
  const pb = (Cb - 128) / 224;
  const pr = (Cr - 128) / 224;
  return [y + 1.5748 * pr, y - 0.468124 * pr - 0.187324 * pb, y + 1.8556 * pb].map((v) => Math.round(v * 255));
}

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-encode-'));
  const data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data.set(COLUMNS[x >> 5], (y * W + x) * 3);
  fs.writeFileSync(path.join(dir, 'card.png'), encodePng({ width: W, height: H, channels: 3, data }));
  execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-i', path.join(dir, 'card.png'), '-pix_fmt', 'yuvj420p', '-q:v', '1', path.join(dir, 'f0.jpeg')]);
  for (let i = 1; i < 6; i++) fs.copyFileSync(path.join(dir, 'f0.jpeg'), path.join(dir, `f${i}.jpeg`));
  const silence = new Float32Array(4800);
  writeWav(path.join(dir, 'a.wav'), silence, silence, 48000, { dither: false });
  master = path.join(dir, 'master.mp4');
  encodeMaster({ frames: path.join(dir, 'f%d.jpeg'), wav: path.join(dir, 'a.wav'), out: master, fps: 60 });
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('the master is limited-range BT.709 yuv420p, tagged as such, 60 fps, with the audio', () => {
  const v = probeVideo(master);
  assert.deepEqual(
    { width: v.width, height: v.height, fps: v.fps, frames: v.frames, pixFmt: v.pixFmt, colorRange: v.colorRange, colorSpace: v.colorSpace, colorPrimaries: v.colorPrimaries, colorTransfer: v.colorTransfer },
    { width: W, height: H, fps: 60, frames: 6, pixFmt: 'yuv420p', colorRange: 'tv', colorSpace: 'bt709', colorPrimaries: 'bt709', colorTransfer: 'bt709' },
  );
  assert.equal(v.audio?.sampleRate, 48000);
  assert.equal(v.audio?.channels, 2);
});

test('the master stores white at 235, black at 16 and keeps every colour within 2 levels', () => {
  const cells = CENTERS.map((x) => yuvAt(master, W, H, x, 32));
  assert.ok(Math.abs(cells[0][0] - 235) <= 1, `white Y ${cells[0][0]}`);
  assert.ok(Math.abs(cells[1][0] - 16) <= 1, `black Y ${cells[1][0]}`);
  cells.forEach((yuv, i) => {
    const rgb = rgbFrom709(yuv);
    rgb.forEach((v, c) => assert.ok(Math.abs(v - COLUMNS[i][c]) <= 2, `column ${i}: got ${rgb} from ${yuv}, want ${COLUMNS[i]}`));
  });
});

test('the downscaled copy keeps limited-range BT.709 and its tags', () => {
  const small = path.join(dir, 'small.mp4');
  downscale({ src: master, out: small, width: W / 2, height: H / 2 });
  const v = probeVideo(small);
  assert.deepEqual(
    { width: v.width, height: v.height, pixFmt: v.pixFmt, colorRange: v.colorRange, colorSpace: v.colorSpace, colorPrimaries: v.colorPrimaries, colorTransfer: v.colorTransfer },
    { width: W / 2, height: H / 2, pixFmt: 'yuv420p', colorRange: 'tv', colorSpace: 'bt709', colorPrimaries: 'bt709', colorTransfer: 'bt709' },
  );
  assert.ok(Math.abs(yuvAt(small, W / 2, H / 2, 8, 16)[0] - 235) <= 2, 'white stays at 235 after scaling');
  assert.equal(v.audio?.sampleRate, 48000);
});

// The whole-film mix pass (2026-10-03): the delivery's AAC lifted the −2.0 dBTP master's peaks 0.5–0.75 dB, so every delivery file
// is turned down by DELIVERY_TRIM_DB before the coder (encode.mjs DELIVERY_AUDIO). One gain: a steady tone comes back that much quieter.
test('the master’s audio is the WAV turned down by DELIVERY_TRIM_DB (one gain, before the AAC), no more', () => {
  const n = 48000 / 10;
  const tone = Float32Array.from({ length: n }, (_, i) => 0.25 * Math.sin((2 * Math.PI * 1000 * i) / 48000));
  writeWav(path.join(dir, 'tone.wav'), tone, tone, 48000, { dither: false });
  const out = path.join(dir, 'tone.mp4');
  encodeMaster({ frames: path.join(dir, 'f%d.jpeg'), wav: path.join(dir, 'tone.wav'), out, fps: 60 });
  execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-i', out, '-map', '0:a', '-c:a', 'pcm_s16le', '-ar', '48000', path.join(dir, 'tone-back.wav')]);
  const back = readWav(path.join(dir, 'tone-back.wav')).channels[0];
  // The middle 40 ms, clear of the coder's priming and its last block.
  const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / (b - a));
  const [a, b] = [Math.round(0.03 * 48000), Math.round(0.07 * 48000)];
  const db = 20 * Math.log10(rms(back, a, b) / rms(tone, a, b));
  assert.ok(DELIVERY_TRIM_DB < 0, `a cut: ${DELIVERY_TRIM_DB} dB`);
  assert.ok(Math.abs(db - DELIVERY_TRIM_DB) < 0.1, `the tone comes back ${db.toFixed(2)} dB (the trim is ${DELIVERY_TRIM_DB} dB)`);
});
