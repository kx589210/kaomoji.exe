// Renders one frame twice in separate browser sessions and compares them.
//   node scripts/check-determinism.mjs --comp KX-TestLayer --frame 30 [--final]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodePng, diffImages } from './lib/png.mjs';
import { renderStillsTo } from './lib/remotion.mjs';

const { values } = parseArgs({ options: { comp: { type: 'string' }, frame: { type: 'string' }, final: { type: 'boolean', default: false } } });
const frame = Number(values.frame);
const inputProps = { quality: values.final ? 'final' : 'draft' };
const dirs = [1, 2].map((n) => fs.mkdtempSync(path.join(os.tmpdir(), `kx-det-${n}-`)));
const images = [];
for (const dir of dirs) {
  const files = await renderStillsTo(dir, { comp: values.comp, frames: [frame], inputProps });
  images.push(decodePng(fs.readFileSync(files.get(frame))));
}
const d = diffImages(images[0], images[1]);
console.log(`frame ${frame}: max diff ${d.max}, mean diff ${d.mean.toFixed(4)}`);
if (d.max > 2) {
  console.error('NOT DETERMINISTIC: renders differ by more than GPU rounding');
  process.exit(1);
}
