// Renders KX-TestCRT (flat grey through the CRT effect) and measures it:
// black rounded corners from the curvature, scanlines at the requested
// period, and a sensible overall level.
//   node scripts/check-crt.mjs
import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const LINES = 360;
const files = await renderStillsTo(path.join(KX, 'output', 'qa', 'check-crt'), { comp: 'KX-TestCRT', frames: [0], scale: 1, inputProps: { quality: 'draft' } });
const img = decodePng(fs.readFileSync(files.get(0)));
const luma = (x, y) => {
  const i = (y * img.width + x) * img.channels;
  return (0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]) / 255;
};
const problems = [];
if (luma(3, 3) > 0.02) problems.push(`corner is not black: ${luma(3, 3).toFixed(3)}`);
let mean = 0;
for (let y = 400; y < 680; y++) for (let x = 900; x < 1020; x++) mean += luma(x, y) / (280 * 120);
if (mean < 0.25 || mean > 0.9) problems.push(`centre level ${mean.toFixed(3)} is outside 0.25–0.9`);
// Scanline period along the centre column: the autocorrelation peaks at 1080 / LINES px.
const col = Array.from({ length: 280 }, (_, i) => luma(960, 400 + i));
const avg = col.reduce((a, b) => a + b, 0) / col.length;
const ac = (lag) => col.slice(lag).reduce((a, v, i) => a + (v - avg) * (col[i] - avg), 0);
const lags = [2, 3, 4, 5, 6];
const best = lags.reduce((b, l) => (ac(l) > ac(b) ? l : b));
if (best !== Math.round(1080 / LINES)) problems.push(`scanline period ${best} px, want ${Math.round(1080 / LINES)}`);
if (problems.length) {
  console.error(`CRT check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`CRT check OK (centre ${mean.toFixed(3)}, scanline period ${best} px)`);
