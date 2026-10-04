// Joins rendered sections into one preview: their frames (kept by render.mjs
// in output/frames/<name>/) are linked into one sequence and encoded exactly
// as render.mjs encodes a section — a master with the matching slice of the
// whole soundtrack (public/audio/bgm.wav), then the 1080p copy. (Joining the
// finished MP4s with ffmpeg's concat demuxer dropped their edit lists and
// started the video 21 ms after the audio.) The result is checked for frame
// count, stream start times and audio sync.
//   node scripts/join.mjs --parts intro-v02,build-v01 --name upto-bar12-v01
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { readWav, writeWav } from './audio/wav.mjs';
import { downscale, encodeMaster, probeVideo } from './lib/encode.mjs';
import { xcorrLag } from './lib/fft.mjs';
import { frameName, framePattern } from './lib/frames.mjs';
import { KX, ffmpegPath, ffprobePath } from './lib/remotion.mjs';

const { values } = parseArgs({ options: { parts: { type: 'string' }, name: { type: 'string' } } });
if (!values.parts || !values.name) throw new Error('usage: --parts a,b --name NAME');
const outDir = path.join(KX, 'output');
const tmp = path.join(outDir, 'frames', values.name);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
const sources = values.parts.split(',').flatMap((p) => {
  const dir = path.join(outDir, 'frames', p);
  return fs.readdirSync(dir).filter((f) => /^f\d+\.jpeg$/.test(f)).sort().map((f) => path.join(dir, f));
});
const total = sources.length;
sources.forEach((src, i) => {
  const dst = path.join(tmp, frameName(i, total));
  try {
    fs.linkSync(src, dst);
  } catch {
    fs.copyFileSync(src, dst);
  }
});
const bgm = readWav(path.join(KX, 'public', 'audio', 'bgm.wav'));
const n = Math.round((total / 60) * bgm.sampleRate);
const wav = path.join(tmp, 'audio.wav');
writeWav(wav, bgm.channels[0].subarray(0, n), bgm.channels[1].subarray(0, n), bgm.sampleRate, { dither: false });
const master = path.join(tmp, 'master.mp4');
console.log(`${total} frames from ${values.parts}: encoding the master`);
encodeMaster({ frames: path.join(tmp, framePattern(total)), wav, out: master, progress: true });
const file = path.join(outDir, `${values.name}-1080p.mp4`);
console.log(`encoding ${path.basename(file)}`);
downscale({ src: master, out: file, width: 1920, height: 1080, progress: true });

const got = probeVideo(file);
if (got.frames !== total) {
  console.error(`${path.basename(file)}: ${got.frames} frames, want ${total}`);
  process.exit(1);
}
const starts = JSON.parse(execFileSync(ffprobePath(), ['-v', 'error', '-show_entries', 'stream=start_time', '-of', 'json', file]).toString()).streams.map((s) => Number(s.start_time));
if (starts.some((s) => Math.abs(s) > 0.001)) {
  console.error(`${path.basename(file)}: streams start at ${starts.join(', ')} s, want 0`);
  process.exit(1);
}
const decoded = path.join(tmp, 'decoded.wav');
execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-i', file, '-map', '0:a', '-c:a', 'pcm_s16le', '-ar', '48000', decoded], { stdio: 'inherit' });
const src = readWav(wav).channels[0];
const back = readWav(decoded).channels[0];
const len = Math.min(src.length, back.length, 48000 * 20);
const lag = xcorrLag(src.subarray(0, len), back.subarray(0, len), 4800);
console.log(`${path.basename(file)}: ${total} frames, streams start at 0, audio lag ${lag} samples`);
if (Math.abs(lag) > 1) {
  console.error('AUDIO OUT OF SYNC');
  process.exit(1);
}
fs.rmSync(master, { force: true });
