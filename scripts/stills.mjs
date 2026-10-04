// Renders stills and tiles them into a labeled contact sheet.
//   node scripts/stills.mjs --comp KX-TestLayer --frames 0,25,30,59 [--scale 2] [--final] [--name test-layer]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { decodePng, drawLabel, encodePng, imageStats, resize } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const { values } = parseArgs({
  options: { comp: { type: 'string' }, frames: { type: 'string' }, scale: { type: 'string', default: '1' }, final: { type: 'boolean', default: false }, name: { type: 'string' } },
});
if (!values.comp || !values.frames) throw new Error('usage: --comp ID --frames a,b,c');
const frames = values.frames.split(',').map(Number);
const name = values.name ?? values.comp.toLowerCase();
const dir = path.join(KX, 'output', 'qa', name);
const files = await renderStillsTo(dir, { comp: values.comp, frames, scale: Number(values.scale), inputProps: { quality: values.final ? 'final' : 'draft' } });

const TW = 480;
const TH = 270;
const cols = Math.min(4, frames.length);
const rows = Math.ceil(frames.length / cols);
const gap = 8;
const width = cols * TW + (cols + 1) * gap;
const height = rows * TH + (rows + 1) * gap;
const sheet = { width, height, channels: 3, data: new Uint8Array(width * height * 3).fill(24) };
frames.forEach((f, k) => {
  const file = files.get(f);
  if (!file) throw new Error(`frame ${f} was not rendered`);
  const img = decodePng(fs.readFileSync(file));
  const s = imageStats(img);
  console.log(`frame ${String(f).padStart(4)}  ${img.width}×${img.height}  mean ${s.mean.map((m) => m.toFixed(0)).join('/')}  std ${s.std.map((m) => m.toFixed(1)).join('/')}`);
  const thumb = resize(img, TW, TH);
  drawLabel(thumb, 8, 8, String(f), 4, [255, 214, 0]);
  const ox = gap + (k % cols) * (TW + gap);
  const oy = gap + Math.floor(k / cols) * (TH + gap);
  for (let y = 0; y < TH; y++) sheet.data.set(thumb.data.subarray(y * TW * 3, (y + 1) * TW * 3), ((oy + y) * width + ox) * 3);
});
const out = path.join(KX, 'output', 'qa', `${name}-sheet.png`);
fs.writeFileSync(out, encodePng(sheet));
console.log(`contact sheet → ${path.relative(process.cwd(), out)}`);
