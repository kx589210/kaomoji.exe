// Frame files of a resumable render. Names have one fixed width for the whole
// composition (Remotion pads to the last frame of each renderFrames call,
// which changes between chunks). Frames are written atomically, only complete
// JPEGs count as done, and a manifest refuses frames from a different setup.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** File name of `frame` in a composition of `total` frames, e.g. f0005.jpeg for 3456 frames. */
export const frameName = (frame, total, ext = 'jpeg') => `f${String(frame).padStart(String(total - 1).length, '0')}.${ext}`;

/** ffmpeg input pattern matching frameName. */
export const framePattern = (total, ext = 'jpeg') => `f%0${String(total - 1).length}d.${ext}`;

/** True if `buf` starts with the JPEG SOI marker and ends with EOI. */
export const isCompleteJpeg = (buf) => buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;

/** Writes a frame under a temporary name and renames it, so an interrupted write never leaves a partial frame behind. */
export function writeFrameAtomic(dir, frame, total, buffer) {
  const file = path.join(dir, frameName(frame, total));
  fs.writeFileSync(`${file}.tmp`, buffer);
  fs.renameSync(`${file}.tmp`, file);
}

/** Frames of a `total`-frame composition already on disk as complete JPEGs under their own names. */
export function framesOnDisk(dir, total) {
  const done = new Set();
  const names = new Set(fs.readdirSync(dir));
  for (let f = 0; f < total; f++) {
    const name = frameName(f, total);
    if (names.has(name) && isCompleteJpeg(fs.readFileSync(path.join(dir, name)))) done.add(f);
  }
  return done;
}

/** Records what the frames in `dir` were rendered with; throws if they came from a different setup. */
export function checkManifest(dir, want) {
  const file = path.join(dir, 'manifest.json');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(want, null, 2));
    return;
  }
  const have = JSON.parse(fs.readFileSync(file, 'utf8'));
  const diff = Object.keys({ ...have, ...want }).filter((k) => JSON.stringify(have[k]) !== JSON.stringify(want[k]));
  if (diff.length > 0) {
    throw new Error(`frames in ${dir} do not match this render (manifest differs in ${diff.join(', ')}); use a new --name or delete that folder`);
  }
}

/** Hash of every file that can change a rendered pixel: the source and the public assets except audio. */
export function sourceHash(kx) {
  const h = crypto.createHash('sha256');
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, e.name);
      const rel = path.relative(kx, p).split(path.sep).join('/');
      if (rel === 'public/audio') continue;
      if (e.isDirectory()) walk(p);
      else h.update(rel).update(fs.readFileSync(p));
    }
  };
  walk(path.join(kx, 'src'));
  walk(path.join(kx, 'public'));
  return h.digest('hex').slice(0, 16);
}
