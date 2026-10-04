// Review focus #2: a 4K render (scale 2) must be 3840×2160 and Canvas 2D
// layers must stay sharp. KX-TestLayer draws a 1-logical-pixel white line at
// x = 960, which must land on device columns 1920–1921 with dark neighbours.
// The clean look turns off bloom and chromatic aberration, which would
// otherwise (correctly) spread the line.
//   node scripts/check-scale.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decodePng } from './lib/png.mjs';
import { renderStillsTo } from './lib/remotion.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-scale-'));
const files = await renderStillsTo(dir, { comp: 'KX-TestLayer', frames: [0], scale: 2, inputProps: { quality: 'draft', clean: true } });
const img = decodePng(fs.readFileSync(files.get(0)));
const lum = (x, y) => {
  const o = (y * img.width + x) * img.channels;
  return (img.data[o] + img.data[o + 1] + img.data[o + 2]) / 3;
};
const y = 200; // logical y = 100: nothing but the line is drawn there
const line = [1920, 1921].map((x) => lum(x, y));
const around = [1916, 1917, 1924, 1925].map((x) => lum(x, y));
console.log(`size ${img.width}×${img.height}; line ${line.map((v) => v.toFixed(0)).join('/')}; neighbours ${around.map((v) => v.toFixed(0)).join('/')}`);
const ok = img.width === 3840 && img.height === 2160 && line.every((v) => v > 200) && around.every((v) => v < 100);
if (!ok) {
  console.error('SCALE CHECK FAILED: wrong size or a soft/misplaced hairline');
  process.exit(1);
}
console.log('scale check OK');
