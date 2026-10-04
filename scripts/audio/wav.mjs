import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { rng } from '../../src/engine/random.ts';

/**
 * 16-bit stereo PCM. Clamps to [-1, 1]; TPDF dither (±1 LSB) unless `dither` is false. `silent` (opt-in): sample ranges [from, to)
 * written without the dither, so a mix that is digital zero there stays exact zeros in the file (the break's S4, review F8). The dither
 * is still drawn inside them and thrown away, so every sample outside them is byte for byte what it is without the option.
 */
export function writeWav(file, L, R, sampleRate, { dither = true, seed = 7, silent = [] } = {}) {
  const n = L.length;
  const data = Buffer.alloc(n * 4);
  const r = rng(seed);
  const plain = new Uint8Array(n);
  for (const [from, to] of silent) {
    if (!Number.isInteger(from) || !Number.isInteger(to)) throw new Error(`writeWav: silent range [${from}, ${to}) is not in whole samples`);
    const a = Math.max(0, from);
    const b = Math.min(n, to);
    if (a < b) plain.fill(1, a, b);
  }
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 2; ch++) {
      const x = Math.max(-1, Math.min(1, (ch === 0 ? L : R)[i]));
      const drawn = dither ? r() - r() : 0;
      const d = plain[i] ? 0 : drawn;
      data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x * 32767 + d))), i * 4 + ch * 2);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

/** Reads 16-bit PCM WAV (any channel count) into float channels. */
export function readWav(file) {
  const buf = fs.readFileSync(file);
  let pos = 12;
  let fmt = null;
  while (pos < buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    if (id === 'data') {
      if (!fmt || fmt.bits !== 16) throw new Error('only 16-bit PCM WAV is supported');
      const frames = Math.floor(Math.min(size, buf.length - body) / (2 * fmt.channels));
      const channels = Array.from({ length: fmt.channels }, () => new Float32Array(frames));
      for (let i = 0; i < frames; i++) for (let c = 0; c < fmt.channels; c++) channels[c][i] = buf.readInt16LE(body + (i * fmt.channels + c) * 2) / 32767;
      return { sampleRate: fmt.sampleRate, channels };
    }
    pos = body + size + (size % 2);
  }
  throw new Error(`${file}: no data chunk`);
}
