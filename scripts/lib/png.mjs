// Minimal PNG codec for QA scripts: 8-bit RGB/RGBA, non-interlaced,
// all five row filters. Plus a few image helpers for contact sheets.
import zlib from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};
const predict = (f, a, b, c) => (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c));

export function encodePng(img, opts = {}) {
  const { width, height, channels, data } = img;
  const filter = opts.filter ?? 0;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const o = y * (stride + 1);
    raw[o] = filter;
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const a = x >= channels ? data[i - channels] : 0;
      const b = y > 0 ? data[i - stride] : 0;
      const c = y > 0 && x >= channels ? data[i - stride - channels] : 0;
      raw[o + 1 + x] = (data[i] - predict(filter, a, b, c)) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG file');
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const [depth, colorType, , , interlace] = [data[8], data[9], data[10], data[11], data[12]];
      if (depth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`unsupported PNG (depth ${depth}, color type ${colorType}, interlace ${interlace})`);
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    if (f > 4) throw new Error(`bad filter ${f} on row ${y}`);
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[dst + x - channels] : 0;
      const b = y > 0 ? out[dst - stride + x] : 0;
      const c = y > 0 && x >= channels ? out[dst - stride + x - channels] : 0;
      out[dst + x] = (raw[src + x] + predict(f, a, b, c)) & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

export function imageStats(img) {
  const n = img.width * img.height;
  const sum = [0, 0, 0];
  const sq = [0, 0, 0];
  for (let p = 0; p < n; p++) {
    for (let c = 0; c < 3; c++) {
      const v = img.data[p * img.channels + c];
      sum[c] += v;
      sq[c] += v * v;
    }
  }
  const mean = sum.map((s) => s / n);
  const std = sq.map((s, c) => Math.sqrt(Math.max(0, s / n - mean[c] * mean[c])));
  return { mean, std };
}

export function diffImages(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('image sizes differ');
  let max = 0;
  let total = 0;
  const n = a.width * a.height;
  for (let p = 0; p < n; p++) {
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(a.data[p * a.channels + c] - b.data[p * b.channels + c]);
      if (d > max) max = d;
      total += d;
    }
  }
  return { max, mean: total / (n * 3) };
}

export function resize(img, w, h) {
  const out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * img.height) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * img.height) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * img.width) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * img.width) / w));
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) s += img.data[(yy * img.width + xx) * img.channels + c];
        out[(y * w + x) * 3 + c] = Math.round(s / ((y1 - y0) * (x1 - x0)));
      }
    }
  }
  return { width: w, height: h, channels: 3, data: out };
}

// 3×5 bitmap digits for frame labels on contact sheets.
const DIGITS = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111',
};

export function drawLabel(img, x, y, text, scale, rgb) {
  [...text].forEach((ch, k) => {
    const bits = DIGITS[ch];
    if (!bits) return;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (bits[r * 3 + c] !== '1') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = x + (k * 4 + c) * scale + dx;
            const py = y + r * scale + dy;
            if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
            const o = (py * img.width + px) * img.channels;
            img.data[o] = rgb[0];
            img.data[o + 1] = rgb[1];
            img.data[o + 2] = rgb[2];
          }
        }
      }
    }
  });
}
