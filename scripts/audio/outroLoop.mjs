// The ending's `loop` preview (music.md §6.4; sections/outro.mjs LOOP_PREVIEW; r4: film bar 61 + the intro's first bar): outro 5 — the
// bows, the button, the I chord ringing out under the dive (U6), the two ticks, the settle's zero — then the film's first bar, cut from
// the whole film's mix through the real chain (renderStems, mixdown) and written to public/audio/sections/loop.wav, so the seam the film
// loops over is heard from the tree. It imports scripts/audio/outroAsBuilt.mjs first (a no-op since the ending is built through on disk,
// r4). It writes only loop.wav, never bgm.wav or the other sections (bgm-locked.sh's files), and prints the preview's loudness and the
// seam's numbers.
//   node scripts/audio/outroLoop.mjs
import * as asBuilt from './outroAsBuilt.mjs';
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { SR, mixdown, renderStems } = await import('./bgm.mjs');
const { integratedLoudness, truePeakDb } = await import('./meter.mjs');
const { LOOP_PREVIEW, loopPreview } = await import('./sections/outro.mjs');
const { writeWav } = await import('./wav.mjs');
const O = await import('../../src/score/outro.ts');
const { CURSOR_BLINKS } = await import('../../src/score/intro.ts');
const { partStart } = await import('../../src/score/film.ts');
const { FPS, FRAMES_PER_BEAT } = await import('../../src/score/tempo.ts');

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const t0 = Date.now();
const { L, R } = mixdown(renderStems().stems, SR);
const p = loopPreview(L, R, SR);
const dir = path.join(KX, 'public', 'audio', 'sections');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `${LOOP_PREVIEW.id}.wav`);
const tmp = `${out}.tmp`;
writeWav(tmp, p.L, p.R, SR);
fs.renameSync(tmp, out);

// The seam: where the ending's half stops sounding, the join, and the ticks on the preview's own frames (one a beat across the join).
const at = (frame) => Math.round((frame / FPS) * SR);
const join = at(LOOP_PREVIEW.spans[0].to) - at(LOOP_PREVIEW.spans[0].from);
let last = -1;
for (let i = 0; i < join; i++) if (p.L[i] !== 0 || p.R[i] !== 0) last = i;
const ticks = [...O.TICKS.map((f) => f - LOOP_PREVIEW.spans[0].from), ...CURSOR_BLINKS.map(([f]) => f - partStart('intro') + join / (SR / FPS))];
console.log(`${path.relative(KX, out)}: ${(p.L.length / SR).toFixed(2)} s (film ${LOOP_PREVIEW.spans.map((w) => `${w.from}–${w.to - 1}`).join(' → ')}), built through: ${asBuilt.patched ? 'by outroAsBuilt' : 'on disk'}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(`  ${integratedLoudness(p.L, p.R, SR).toFixed(2)} LUFS · ${truePeakDb(p.L, p.R).toFixed(2)} dBTP`);
console.log(`  the ending's last sound ends on preview frame ${(last / (SR / FPS)).toFixed(2)}; zero from there to the join (frame ${join / (SR / FPS)}); frame 0's first sample ${(20 * Math.log10(Math.max(Math.abs(p.L[join]), Math.abs(p.R[join])))).toFixed(1)} dBFS`);
console.log(`  ticks on preview frames ${ticks.join(', ')} (a beat = ${FRAMES_PER_BEAT})`);
// The ring-out (U6): the level on the frame before each tick: the chord's tail, ≈ −32 dBFS under the first; before the second, only the first
// tick's own tail (the ring has closed to zero by then: tests/outroAudio.test.mjs).
const frameDb = (f) => {
  const a = at(f - LOOP_PREVIEW.spans[0].from);
  const b = at(f + 1 - LOOP_PREVIEW.spans[0].from);
  let e = 0;
  for (let i = a; i < b; i++) e += 0.5 * (p.L[i] * p.L[i] + p.R[i] * p.R[i]);
  return e > 0 ? (10 * Math.log10(e / (b - a))).toFixed(1) : '−∞';
};
console.log(`  the tail before the ticks: ${O.TICKS.map((f) => `${frameDb(f - 1)} dBFS on ${f - 1 - LOOP_PREVIEW.spans[0].from}`).join(', ')}`);
