// Renders KX-TestGrain (flat grey with the terminal's grain) at the start,
// middle and end of the film's length and checks that the grain stays grain:
// the same spread and mean everywhere, and a new pattern every frame.
//   node scripts/check-grain.mjs
import fs from 'node:fs';
import path from 'node:path';
import { TOTAL_FRAMES } from '../src/score/tempo.ts';
import { decodePng } from './lib/png.mjs';
import { KX, renderStillsTo } from './lib/remotion.mjs';

const FRAMES = [0, 1, TOTAL_FRAMES / 2, TOTAL_FRAMES - 1];
const files = await renderStillsTo(path.join(KX, 'output', 'qa', 'check-grain'), { comp: 'KX-TestGrain', frames: FRAMES, scale: 1, inputProps: { quality: 'draft' } });
const patch = (frame) => {
  const img = decodePng(fs.readFileSync(files.get(frame)));
  const out = [];
  for (let y = 390; y < 690; y++) {
    for (let x = 760; x < 1160; x++) {
      const i = (y * img.width + x) * img.channels;
      out.push(0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]);
    }
  }
  return out;
};
const stats = (v) => {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return { mean, sd: Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length) };
};
const corr = (a, b) => {
  const sa = stats(a);
  const sb = stats(b);
  return a.reduce((s, v, i) => s + (v - sa.mean) * (b[i] - sb.mean), 0) / (a.length * sa.sd * sb.sd);
};
const patches = new Map(FRAMES.map((f) => [f, patch(f)]));
const problems = [];
const ref = stats(patches.get(0));
for (const f of FRAMES) {
  const s = stats(patches.get(f));
  console.log(`frame ${f}: mean ${s.mean.toFixed(2)}, sd ${s.sd.toFixed(2)}`);
  if (s.sd < 2 || s.sd > 8) problems.push(`frame ${f}: grain spread ${s.sd.toFixed(2)} is outside 2–8 code values`);
  if (Math.abs(s.mean - ref.mean) > 1) problems.push(`frame ${f}: mean ${s.mean.toFixed(2)} drifted from ${ref.mean.toFixed(2)}`);
}
for (const [a, b] of [[FRAMES[0], FRAMES[1]], [FRAMES[2], FRAMES[3]]]) {
  const c = corr(patches.get(a), patches.get(b));
  if (Math.abs(c) > 0.1) problems.push(`frames ${a} and ${b} share a grain pattern (correlation ${c.toFixed(2)})`);
}
if (problems.length) {
  console.error(`grain check FAILED\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('grain check OK');
