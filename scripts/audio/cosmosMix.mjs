// The transition and the cosmos mixed on their own, as bgm.mjs mixes the film (cosmosStage.mjs mixAlone): their previews and the WAVs
// render.mjs cuts KX-Transition and KX-Cosmos to, until bgm.mjs plays them; and their loudness, bar by bar and beat by beat (bible §6.4).
//   node scripts/audio/cosmosMix.mjs            writes public/audio/sections/transition-wip.wav (transition 1.1 = sample 0),
//                                                       cosmos-wip.wav (cosmos 1.1 = sample 0) and lift-cosmos-wip.wav (both), and
//                                                       prints each bar's LUFS, each beat's momentary and the true peak.
//   … --json FILE                                       also writes the measurements as JSON.
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { partEnd, partStart } from '../../src/score/film.ts';
import { FPS, FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../../src/score/tempo.ts';
import { mixAlone, sampleOf } from './cosmosStage.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from './meter.mjs';
import { stereo } from './mix.mjs';
import * as COSMOS from './sections/cosmos.mjs';
import * as TRANSITION from './sections/transition.mjs';
import { writeWav } from './wav.mjs';

export const SR = 48000;
// eslint-disable-next-line @remotion/non-pure-animation -- the film part 'transition', not a CSS transition
const PARTS = { transition: { mod: TRANSITION, render: TRANSITION.renderTransition }, cosmos: { mod: COSMOS, render: COSMOS.renderCosmos } };

/**
 * The parts `ids` (in film order, contiguous) rendered on stems that start on the first one's first frame and mixed alone:
 * { L, R, stems, events, origin }. `solo` as the section renderers take it.
 */
export function partsAlone(ids, sr = SR, { solo } = {}) {
  const origin = partStart(ids[0]);
  const end = partEnd(ids[ids.length - 1]);
  const n = sampleOf(end, sr) - sampleOf(origin, sr);
  const sends = Object.assign({}, ...ids.map((id) => PARTS[id].mod.SENDS));
  const stems = { post: stereo(n), sub: new Float32Array(n) };
  for (const k of Object.keys(sends)) stems[k] = stereo(n);
  const events = ids.flatMap((id) => PARTS[id].render(stems, sr, { origin, ...(solo ? { solo } : {}) }));
  const finishes = ids.map((id) => PARTS[id].mod.finish);
  const { L, R } = mixAlone(stems, sr, {
    origin,
    sends,
    cuts: ids.flatMap((id) => PARTS[id].mod.CUTS),
    silences: ids.flatMap((id) => PARTS[id].mod.SILENCES),
    finish: (l, r, s, o) => finishes.forEach((f) => f(l, r, s, o)),
  });
  return { L, R, stems, events, origin };
}

/** Loudness of [from, to) frames of a mix starting on `origin`: integrated (LUFS) and the true peak. */
export function measure(L, R, origin, from, to, sr = SR) {
  const a = Math.max(0, sampleOf(from, sr) - sampleOf(origin, sr));
  const b = Math.min(L.length, sampleOf(to, sr) - sampleOf(origin, sr));
  const l = L.subarray(a, b);
  const r = R.subarray(a, b);
  return { lufs: integratedLoudness(l, r, sr), tp: truePeakDb(l, r) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const out = path.join(KX, 'public', 'audio', 'sections');
  fs.mkdirSync(out, { recursive: true });
  const both = partsAlone(['transition', 'cosmos']);
  const report = { parts: {}, bars: [], beats: [] };
  for (const id of ['transition', 'cosmos']) {
    const m = measure(both.L, both.R, both.origin, partStart(id), partEnd(id));
    const a = sampleOf(partStart(id), SR) - sampleOf(both.origin, SR);
    const b = sampleOf(partEnd(id), SR) - sampleOf(both.origin, SR);
    report.parts[id] = { lufs: +m.lufs.toFixed(2), truePeakDb: +m.tp.toFixed(2), correlation: +correlation(both.L.subarray(a, b), both.R.subarray(a, b)).toFixed(3), lowCorrelation: +lowCorrelation(both.L.subarray(a, b), both.R.subarray(a, b), SR).toFixed(3) };
    for (let f = partStart(id), k = 1; f < partEnd(id); f += FRAMES_PER_BAR, k++) {
      const bar = measure(both.L, both.R, both.origin, f, f + FRAMES_PER_BAR);
      report.bars.push({ part: id, bar: k, lufs: +bar.lufs.toFixed(2), tp: +bar.tp.toFixed(2) });
      for (let beat = 0; beat < 4; beat++) {
        const g = f + beat * FRAMES_PER_BEAT;
        const mo = measure(both.L, both.R, both.origin, g, g + FRAMES_PER_BEAT);
        report.beats.push({ part: id, pos: `${k}.${beat + 1}`, momentary: +mo.lufs.toFixed(2) });
      }
    }
  }
  report.both = { lufs: +measure(both.L, both.R, both.origin, partStart('transition'), partEnd('cosmos')).lufs.toFixed(2), truePeakDb: +truePeakDb(both.L, both.R).toFixed(2) };
  const slice = (id) => {
    const a = sampleOf(partStart(id), SR) - sampleOf(both.origin, SR);
    const b = sampleOf(partEnd(id), SR) - sampleOf(both.origin, SR);
    return [both.L.slice(a, b), both.R.slice(a, b)];
  };
  writeWav(path.join(out, 'transition-wip.wav'), ...slice('transition'), SR);
  writeWav(path.join(out, 'cosmos-wip.wav'), ...slice('cosmos'), SR);
  writeWav(path.join(out, 'lift-cosmos-wip.wav'), both.L, both.R, SR);
  console.log(JSON.stringify(report.parts), JSON.stringify(report.both));
  for (const b of report.bars) console.log(`${b.part} ${b.bar}: ${b.lufs} LUFS (tp ${b.tp})  ${report.beats.filter((x) => x.part === b.part && x.pos.startsWith(`${b.bar}.`)).map((x) => `${x.pos} ${x.momentary}`).join('  ')}`);
  const j = process.argv.indexOf('--json');
  if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(report, null, 2));
  console.log(`seconds: ${(both.L.length / SR).toFixed(2)} (${FPS} fps)`);
}
