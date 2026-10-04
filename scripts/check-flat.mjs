// Renders KX-TestFlat and checks the flat layers: multiply inks overprint to
// one third colour in either order, a 50% halftone averages to half the ink,
// normal paint is exact, and an inverted glyph is a sheet with a hole; on
// frame 1, outlines keep their share of the em at any size with no gap
// between fill and ink.
//   node scripts/check-flat.mjs
import fs from 'node:fs';
import path from 'node:path';
import { TEST_FLAT, TEST_OUTLINES } from '../src/compositions/testFlatLayout.ts';
import { srgb8 } from '../src/engine/color.ts';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const files = await renderStillsTo(path.join(KX, 'output', 'qa', 'check-flat'), { comp: 'KX-TestFlat', frames: [0, 1], scale: 1, inputProps: { quality: 'draft' } });
const img = decodePng(fs.readFileSync(files.get(0)));
const problems = [];
for (const p of TEST_FLAT.patches) {
  const cx = 960 + p.x;
  const cy = 540 - p.y;
  const got = [0, 0, 0];
  for (let y = cy - 20; y < cy + 20; y++) {
    for (let x = cx - 20; x < cx + 20; x++) {
      const i = (y * img.width + x) * img.channels;
      for (let c = 0; c < 3; c++) got[c] += img.data[i + c] / 1600;
    }
  }
  const off = Math.max(...got.map((v, c) => Math.abs(v - p.want[c])));
  const text = `${p.name}: got (${got.map((v) => v.toFixed(1)).join(', ')}), want (${p.want.map((v) => +v.toFixed(1)).join(', ')})`;
  if (off > p.tol) problems.push(text);
  else console.log(text);
}
// Outlines: scan right from each disc's centre — fill, then ink, then paper; no paper between fill and ink; the ink band keeps its share of the em.
const out = decodePng(fs.readFileSync(files.get(1)));
const px = (x, y) => [0, 1, 2].map((c) => out.data[(y * out.width + x) * out.channels + c]);
const near = (a, b, tol) => a.every((v, c) => Math.abs(v - b[c]) <= tol);
const [fill, ink, paper] = [TEST_OUTLINES.fill, TEST_OUTLINES.ink, TEST_OUTLINES.paper].map(srgb8);
for (const p of TEST_OUTLINES.probes) {
  const cy = Math.round(540 - p.y);
  let x = Math.round(960 + p.x);
  const start = x;
  while (near(px(x, cy), fill, 12) && x < out.width - 1) x++;
  const fillEnd = x;
  while (!near(px(x, cy), ink, 24) && !near(px(x, cy), paper, 12) && x < out.width - 1) x++;
  const gapPaper = near(px(x, cy), paper, 12);
  const inkStart = x;
  while (!near(px(x, cy), paper, 12) && x < out.width - 1) x++;
  const band = x - inkStart + (inkStart - fillEnd) / 2;
  const share = band / p.size;
  const text = `outline at size ${p.size}: fill to ${fillEnd - start} px, ink band ${band.toFixed(1)} px = ${share.toFixed(3)} em (want ${TEST_OUTLINES.outline})`;
  if (gapPaper || x - inkStart < 1) problems.push(`${text}: paper between fill and ink`);
  else if (Math.abs(share - TEST_OUTLINES.outline) > 0.15 * TEST_OUTLINES.outline) problems.push(text);
  else console.log(text);
}
if (problems.length) {
  console.error(`flat check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('flat check OK');
