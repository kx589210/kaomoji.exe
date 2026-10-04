// The ending's A/B, for listening (the whole-film mix pass, 2026-10-03; sections/outro.mjs ENDING_STYLE, ENDING_B): the film's mix
// rendered twice through the real chain (renderStems, mixdown), once with the held bed of the earlier ending (A) and once without
// it (B, the film's since 2026-10-03), and cut to the ending, 5376–5855 (480 frames from the drop 2 → outro seam), plus the 4 s round
// that seam (5256–5495). Each cut is written as a WAV and muxed with the full-film cut's own frames (output/frames/<frames>/, the rendered JPEGs; no Remotion render)
// into an MP4 the way the delivery is (scripts/lib/encode.mjs). The film's style (ENDING_STYLE) is checked against public/audio/bgm.wav: the
// flag must leave the film's ending as it is. It never writes bgm.wav or the section WAVs.
//   node scripts/audio/endingAB.mjs [--frames kaomoji-full-v05] [--out output/qa/full-v05/ending-ab]
import console from 'node:console';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { partStart } from '../../src/score/film.ts';
import { FPS, TOTAL_FRAMES } from '../../src/score/tempo.ts';
import { DELIVERY_AUDIO, TO_BT709 } from '../lib/encode.mjs';
import { frameName } from '../lib/frames.mjs';
import { ffmpegPath } from '../lib/remotion.mjs';
import { SR, mixdown, renderStems } from './bgm.mjs';
import { ENDING_STYLE } from './sections/outro.mjs';
import { integratedLoudness, truePeakDb } from './meter.mjs';
import { readWav, writeWav } from './wav.mjs';

const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { values } = parseArgs({ options: { frames: { type: 'string', default: 'kaomoji-full-v05' }, out: { type: 'string', default: 'output/qa/full-v05/ending-ab' } } });
const framesDir = path.join(KX, 'output', 'frames', values.frames);
const outDir = path.resolve(KX, values.out);
const seamDir = path.join(path.dirname(outDir), 'seams-mix');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(seamDir, { recursive: true });
const at = (frame) => Math.round((frame / FPS) * SR);
const OUTRO = partStart('outro');
const CLIPS = [
  { name: 'ending', dir: outDir, from: OUTRO, to: TOTAL_FRAMES },
  { name: 'drop2-outro', dir: seamDir, from: OUTRO - 120, to: OUTRO + 120 },
];

const film = readWav(path.join(KX, 'public', 'audio', 'bgm.wav')).channels;
for (const style of ['A', 'B']) {
  const t0 = Date.now();
  const { L, R } = mixdown(renderStems(SR, undefined, { ending: style }).stems, SR);
  if (style === ENDING_STYLE) {
    // bgm.wav holds the mix dithered to 16 bits: the same mix is within 2 LSB of it everywhere.
    let worst = 0;
    for (let i = at(OUTRO); i < L.length; i++) worst = Math.max(worst, Math.abs(L[i] - film[0][i]), Math.abs(R[i] - film[1][i]));
    console.log(`${style} (the film's) against bgm.wav over the ending: max |Δ| ${(worst * 32768).toFixed(2)} LSB`);
    if (worst * 32768 > 2.5) throw new Error(`endingAB: ${style} is not the film’s ending (rebuild bgm.wav first)`);
  }
  for (const c of CLIPS) {
    const [a, b] = [at(c.from), at(c.to)];
    const wav = path.join(c.dir, `${c.name}-${style}.wav`);
    writeWav(wav, L.slice(a, b), R.slice(a, b), SR);
    const mp4 = path.join(c.dir, `${c.name}-${style}.mp4`);
    const pattern = path.join(framesDir, frameName(0, TOTAL_FRAMES).replace(/\d+/, (d) => `%0${d.length}d`));
    execFileSync(ffmpegPath(), [
      '-y', '-hide_banner', '-v', 'error', '-framerate', String(FPS), '-start_number', String(c.from), '-i', pattern, '-i', wav,
      '-map', '0:v', '-map', '1:a', '-frames:v', String(c.to - c.from), '-vf', TO_BT709, '-c:v', 'libx264', '-preset', 'medium', '-crf', '16',
      ...DELIVERY_AUDIO, '-movflags', '+faststart', mp4,
    ]);
    console.log(`${path.relative(KX, mp4)}: ${c.to - c.from} frames, ${integratedLoudness(L.slice(a, b), R.slice(a, b), SR).toFixed(2)} LUFS, ${truePeakDb(L.slice(a, b), R.slice(a, b)).toFixed(2)} dBTP`);
  }
  console.log(`${style}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
process.exit(0);
