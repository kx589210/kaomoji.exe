// Motion energy of a rendered cut: how much the picture changes from each
// frame to the next (mean absolute difference of 160 × 90 grey frames, 0–255),
// summarised per bar — its mean, its peaks, and the share of "dead" frames
// that hardly change at all (the stop-and-go that reads as 顿). A flash or a
// hard cut shows as a spike; a camera that never stops keeps every frame alive.
//   node scripts/motion-energy.mjs output/upto-bar12-v02-1080p.mp4 [--from-bar 1 | --part swiss] [--dead 0.35] [--list]
// The cut's first frame is the downbeat of film bar --from-bar, or of the part --part (src/score/film.ts: intro, swiss, riso, cosmos,
// club, break, drop2, outro); each bar is listed by its film bar and its part-local bar. --list also prints the film frames of the dead
// frames, bar by bar.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { locate, partBar } from '../src/score/film.ts';
import { FRAMES_PER_BAR, barFrame } from '../src/score/tempo.ts';
import { decodePng } from './lib/png.mjs';
import { KX, ffmpegPath } from './lib/remotion.mjs';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'from-bar': { type: 'string' }, part: { type: 'string' }, dead: { type: 'string', default: '0.35' }, list: { type: 'boolean', default: false } } });
if (positionals.length !== 1 || (values.part && values['from-bar'])) throw new Error('usage: motion-energy.mjs FILE.mp4 [--from-bar N | --part PART] [--dead LEVEL] [--list]');
const file = path.resolve(KX, positionals[0]);
const W = 160;
const H = 90;
const fromBar = values.part ? partBar(values.part) : Number(values['from-bar'] ?? '1');
/** A film bar and where it sits in the map ("swiss 2"). */
const barLabel = (bar) => {
  const { id, bar: local } = locate(barFrame(bar));
  return `${String(bar).padStart(3)}  ${`${id} ${local}`.padEnd(9)}`;
};
const dead = Number(values.dead);

/** Grey 160 × 90 frames of `file` (Remotion's minimal ffmpeg has no raw muxer, so it writes small PNGs to a temp folder). */
function frames() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-motion-'));
  execFileSync(ffmpegPath(), ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area`, path.join(dir, 'f%05d.png')]);
  const out = fs
    .readdirSync(dir)
    .sort()
    .map((f) => {
      const im = decodePng(fs.readFileSync(path.join(dir, f)));
      const grey = new Float32Array(W * H);
      for (let p = 0; p < W * H; p++) grey[p] = 0.2126 * im.data[p * im.channels] + 0.7152 * im.data[p * im.channels + 1] + 0.0722 * im.data[p * im.channels + 2];
      return grey;
    });
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

const grey = frames();
const diff = [0];
for (let i = 1; i < grey.length; i++) {
  let s = 0;
  for (let p = 0; p < W * H; p++) s += Math.abs(grey[i][p] - grey[i - 1][p]);
  diff.push(s / (W * H));
}
console.log(`${path.basename(file)}: ${grey.length} frames; a frame is dead below ${dead} / 255 of change`);
console.log('bar  part       mean   peak   dead');
let deadAll = 0;
for (let b = 0; b * FRAMES_PER_BAR < diff.length; b++) {
  const d = diff.slice(b * FRAMES_PER_BAR + (b === 0 ? 1 : 0), (b + 1) * FRAMES_PER_BAR);
  const mean = d.reduce((a, v) => a + v, 0) / d.length;
  const deadCount = d.filter((v) => v < dead).length;
  deadAll += deadCount;
  console.log(`${barLabel(b + fromBar)}  ${mean.toFixed(2).padStart(5)}  ${Math.max(...d).toFixed(1).padStart(5)}  ${String(Math.round((100 * deadCount) / d.length)).padStart(3)}%`);
  if (values.list && deadCount > 0) {
    const first = barFrame(fromBar + b);
    const at = d.map((v, i) => [first + i + (b === 0 ? 1 : 0), v]).filter(([, v]) => v < dead);
    console.log('       ' + at.map(([f, v]) => `${f}:${v.toFixed(2)}`).join(' '));
  }
}
console.log(`all: ${Math.round((100 * deadAll) / (diff.length - 1))}% dead frames`);
