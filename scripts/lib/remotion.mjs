// Shared Remotion plumbing for the kaomoji scripts. The CLI config file does
// not apply to Node APIs, so every option is passed explicitly here.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderFrames, selectComposition } from '@remotion/renderer';

/** The package root (this repository): src/, public/, scripts/ and node_modules/ sit under it. */
export const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CHROMIUM = { gl: 'angle' };

let serveUrl = null;
export async function bundleKaomoji() {
  serveUrl ??= await bundle({ entryPoint: path.join(KX, 'src', 'index.ts'), publicDir: path.join(KX, 'public'), rootDir: KX });
  return serveUrl;
}

export const openGpuBrowser = (scale = 1) => openBrowser('chrome', { chromiumOptions: CHROMIUM, forceDeviceScaleFactor: scale });

/**
 * Renders `frames` of composition `comp` as PNG files named f<frame>.png into
 * `dir`, and returns the files written by this call only, so an older still in
 * the folder can never stand in for a new one.
 */
export async function renderStillsTo(dir, { comp, frames, scale = 1, inputProps = {} }) {
  fs.mkdirSync(dir, { recursive: true });
  const url = await bundleKaomoji();
  const browser = await openGpuBrowser(scale);
  const written = new Map();
  try {
    const composition = await selectComposition({ serveUrl: url, id: comp, inputProps, puppeteerInstance: browser, chromiumOptions: CHROMIUM });
    await renderFrames({
      composition, serveUrl: url, inputProps, outputDir: null, imageFormat: 'png',
      onFrameBuffer: (buffer, frame) => {
        const file = path.join(dir, `f${frame}.png`);
        fs.writeFileSync(file, buffer);
        written.set(frame, file);
      },
      frames, scale, puppeteerInstance: browser, chromiumOptions: CHROMIUM, concurrency: 1, timeoutInMilliseconds: 180_000,
      onStart: () => undefined, onFrameUpdate: () => undefined,
      // A shader that fails to compile only logs in the browser; surface it.
      onBrowserLog: (log) => {
        if (log.type === 'error') console.error(`[browser] ${log.text}`);
      },
    });
  } finally {
    await browser.close({ silent: true });
  }
  return written;
}

/** Contiguous ranges [from, to] (inclusive) of frames not in `done`, each at most `chunkSize` long. */
export function planChunks(total, done, chunkSize) {
  const chunks = [];
  let start = -1;
  for (let f = 0; f <= total; f++) {
    const missing = f < total && !done.has(f);
    if (missing && start < 0) start = f;
    if (start >= 0 && (!missing || f - start === chunkSize)) {
      chunks.push([start, f - 1]);
      start = missing ? f : -1;
    }
  }
  return chunks;
}

/**
 * A binary from Remotion's compositor package (no system ffmpeg needed). npm installs the one package that matches this platform
 * (@remotion/compositor-<os>-<arch>…) next to @remotion/renderer (hoisted) or under it (nested); both places are searched.
 */
function compositorBinary(name) {
  const renderer = path.dirname(createRequire(import.meta.url).resolve('@remotion/renderer/package.json'));
  const dirs = [path.dirname(renderer), path.join(renderer, 'node_modules', '@remotion')];
  const file = process.platform === 'win32' ? `${name}.exe` : name;
  for (const dir of dirs.filter((d) => fs.existsSync(d))) {
    for (const pkg of fs.readdirSync(dir).filter((d) => d.startsWith('compositor-'))) {
      const exe = path.join(dir, pkg, file);
      if (fs.existsSync(exe)) return exe;
    }
  }
  throw new Error(`${name} not found in Remotion's compositor package (looked in ${dirs.join(', ')}); run npm install`);
}

export const ffmpegPath = () => compositorBinary('ffmpeg');
export const ffprobePath = () => compositorBinary('ffprobe');
