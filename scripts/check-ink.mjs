// Renders KX-TestInk (the terminal's HDR inks as flat stripes, linear tone
// mapping, no bloom) and checks that over-bright colours keep their hue: amber
// and pink must come out as the palette colours of spec §5, not shifted towards
// yellow or white by per-channel clipping.
//   node scripts/check-ink.mjs
import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const WANT = [
  { name: 'amber', x: 320, rgb: [255, 178, 62] },
  { name: 'pink', x: 960, rgb: [255, 95, 162] },
  { name: 'text', x: 1600, rgb: [225, 255, 234] },
];
const files = await renderStillsTo(path.join(KX, 'output', 'qa', 'check-ink'), { comp: 'KX-TestInk', frames: [0], scale: 1, inputProps: { quality: 'draft' } });
const img = decodePng(fs.readFileSync(files.get(0)));
const problems = [];
for (const w of WANT) {
  const got = [0, 0, 0];
  for (let y = 520; y < 560; y++) {
    for (let x = w.x - 20; x < w.x + 20; x++) {
      const i = (y * img.width + x) * img.channels;
      for (let c = 0; c < 3; c++) got[c] += img.data[i + c] / 1600;
    }
  }
  const off = Math.max(...got.map((v, c) => Math.abs(v - w.rgb[c])));
  const text = `${w.name}: got (${got.map((v) => v.toFixed(1)).join(', ')}), want (${w.rgb.join(', ')})`;
  if (off > 3) problems.push(text);
  else console.log(text);
}
if (problems.length) {
  console.error(`ink check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('ink check OK');
