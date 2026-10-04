// The finished master on standard meters (iteration 3, ruling 16). v02's bgm.wav sat at −1.51 dBTP on the project's old meter but
// read −1.08 on an 8× check and −1.26 on ffmpeg. The film is rendered and written as bgm.mjs writes it (16-bit, dithered), and
// read on meters that share nothing with meter.mjs: ffmpeg's own 192 kHz resampler (what its ebur128 peak=true measures) and 8×
// windowed sincs, the iteration-2 verifier's among them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { mixdown, renderStems, SR } from '../scripts/audio/bgm.mjs';
import { CEILING_DB } from '../scripts/audio/limiter.mjs';
import { readWav, writeWav } from '../scripts/audio/wav.mjs';
import { INDEPENDENT, ffmpegTruePeakDb, independentDb } from './lib/truePeak.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-master-'));
const file = path.join(dir, 'bgm.wav');
{
  const { stems } = renderStems(SR);
  const { L, R } = mixdown(stems, SR);
  writeWav(file, L, R, SR);
}
const { channels } = readWav(file);

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('the written film is under the −2.0 dBTP master ceiling on ffmpeg (192 kHz, as its ebur128 peak=true)', () => {
  const tp = ffmpegTruePeakDb(file);
  assert.ok(tp <= CEILING_DB, `${tp.toFixed(3)} dBTP`);
});

for (const name of ['8×, 64-tap Kaiser β 8 (the iteration-2 verifier’s check)', '8×, 128-tap Kaiser β 10', '8×, 64-tap Kaiser β 9 cut at 0.92 of Nyquist']) {
  test(`the written film is under the −2.0 dBTP master ceiling on an independent ${name}`, () => {
    const tp = independentDb(channels, INDEPENDENT[name]);
    assert.ok(tp <= CEILING_DB, `${tp.toFixed(3)} dBTP`);
  });
}
