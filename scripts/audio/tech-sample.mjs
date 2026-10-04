// The 5-second tech sample track, placed from the same events as the picture.
//   node scripts/audio/tech-sample.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HIT_FRAME, KICKS, REVEAL, STATUS_FRAMES, TECH_SAMPLE_FRAMES, WHIP, typeFrames } from '../../src/score/techSample.ts';
import { FPS, FRAMES_PER_BEAT } from '../../src/score/tempo.ts';
import { blip, click, hat, impact, kick, riser } from './drums.mjs';
import { limit } from './limiter.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from './meter.mjs';
import { spectrogramPng } from './spectrogram.mjs';
import { writeWav } from './wav.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SR = 48000;
const N = Math.round((TECH_SAMPLE_FRAMES / FPS) * SR);
const at = (frame) => Math.round((frame / FPS) * SR);

const kicks = new Float32Array(N);
const hatsL = new Float32Array(N);
const hatsR = new Float32Array(N);
const keysL = new Float32Array(N);
const keysR = new Float32Array(N);
const fx = new Float32Array(N);

typeFrames.forEach((f, i) => {
  const pan = (i % 5) / 4 - 0.5;
  const k = new Float32Array(N);
  click(k, at(f), SR, { gain: 0.3, tone: 2200 + (i % 3) * 300 }, 100 + i);
  for (let s = 0; s < N; s++) {
    keysL[s] += k[s] * (0.5 - pan * 0.4);
    keysR[s] += k[s] * (0.5 + pan * 0.4);
  }
});
STATUS_FRAMES.forEach((f, i) => blip(fx, at(f), SR, { freq: 1320 * 2 ** ((i * 4) / 12), gain: 0.12 }));
riser(fx, at(WHIP.from - 12), at(WHIP.to) - at(WHIP.from - 12), SR, { gain: 0.25 }, 7);
KICKS.forEach((f, i) => kick(kicks, at(f), SR, {}, 200 + i));
for (let f = WHIP.to; f < HIT_FRAME; f += FRAMES_PER_BEAT / 2) {
  if ((f - WHIP.to) % FRAMES_PER_BEAT === 0) continue;
  hat(hatsL, at(f), SR, { gain: 0.18 }, f);
  hat(hatsR, at(f + 1), SR, { gain: 0.16 }, f + 1);
}
riser(fx, at(REVEAL.from), at(HIT_FRAME) - at(REVEAL.from), SR, { gain: 0.3 }, 9);
impact(fx, at(HIT_FRAME), SR, { gain: 0.95 }, 11);

const L = new Float32Array(N);
const R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = 0.8 * kicks[i] + hatsL[i] + keysL[i] + 0.7 * fx[i];
  R[i] = 0.8 * kicks[i] + hatsR[i] + keysR[i] + 0.7 * fx[i];
}
limit(L, R, SR, { ceilingDb: -1.2 });

const out = path.join(KX, 'public', 'audio', 'tech-sample.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
writeWav(out, L, R, SR);
const qa = path.join(KX, 'output', 'qa');
fs.mkdirSync(qa, { recursive: true });
spectrogramPng(path.join(qa, 'tech-sample-spectrogram.png'), L, R, SR);
const report = {
  lufs: +integratedLoudness(L, R, SR).toFixed(2),
  truePeakDb: +truePeakDb(L, R).toFixed(2),
  correlation: +correlation(L, R).toFixed(3),
  lowCorrelation: +lowCorrelation(L, R, SR).toFixed(3),
};
fs.writeFileSync(path.join(qa, 'tech-sample-audio.json'), JSON.stringify(report, null, 2));
console.log(`tech-sample.wav  ${(N / SR).toFixed(2)} s`, report);
if (report.truePeakDb > -1) {
  console.error(`TRUE PEAK ${report.truePeakDb} dBTP is over the −1 dBTP ceiling`);
  process.exit(1);
}
