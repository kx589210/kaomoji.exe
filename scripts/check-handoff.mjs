// Renders the last intro frame (INTRO_END − 1) at final quality and checks the T1
// hand-off: the circle the right eye's centre glyph became fills the middle of
// the frame in exactly Swiss red (#E8402B), so swiss 1.1 can open on the same red.
//   node scripts/check-handoff.mjs
import fs from 'node:fs';
import path from 'node:path';
import { partStart } from '../src/score/film.ts';
import { INTRO_END } from '../src/score/intro.ts';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const WANT = [0xe8, 0x40, 0x2b];
/** The intro's last frame, film and KX-Intro-relative. */
const LAST = INTRO_END - 1;
const F = LAST - partStart('intro');
const files = await renderStillsTo(path.join(KX, 'output', 'qa', 'check-handoff'), { comp: 'KX-Intro', frames: [F], scale: 1, inputProps: { quality: 'final', energy: false } });
const img = decodePng(fs.readFileSync(files.get(F)));
const got = [0, 0, 0];
for (let y = 520; y < 560; y++) {
  for (let x = 940; x < 980; x++) {
    const i = (y * img.width + x) * img.channels;
    for (let c = 0; c < 3; c++) got[c] += img.data[i + c] / 1600;
  }
}
const off = Math.max(...got.map((v, c) => Math.abs(v - WANT[c])));
const text = `frame ${LAST} centre (${got.map((v) => v.toFixed(1)).join(', ')}), want (${WANT.join(', ')})`;
if (off > 1.5) {
  console.error(`hand-off check FAILED: ${text}`);
  process.exit(1);
}
console.log(`hand-off check OK: ${text}`);
