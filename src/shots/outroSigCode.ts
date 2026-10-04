// The blue screen's 2D code (build sheet notes/b58/ending-sheet.md §5.3 layer 3, R5): a real version-1 byte-mode symbol at
// error-correction level Q carrying exactly the signature's 10 bytes (E2 80 A2 20 CF 89 20 E2 80 A2), so a phone pointed at the paused
// frame reads `• ω •`. An in-repo encoder (ISO/IEC 18004: Reed–Solomon over GF(256) with x⁸ + x⁴ + x³ + x² + 1, the BCH-coded format
// bits, the eight data masks scored by the four penalty rules), so no package is needed; the letters "QR" are never put on screen.
// Level Q (25 % recovery: R5), not the design's L: the 10 bytes still fit version 1 (Q holds 11), and the scanlines, the grain and the
// push cost a few modules at most. Pure: tests/outroSigCode.test.ts reads the symbol back (format bits, unmask, codewords, the RS
// syndromes) and gets the bytes. Rows are top-down; module [r][c] true = dark.
import { SIGNATURE_BYTES } from '../content/outro.ts';

export const QR_SIZE = 21;
/** Version 1, level Q: 26 codewords, 13 of data and 13 of error correction, one block. */
export const QR_DATA_CODEWORDS = 13;
export const QR_EC_CODEWORDS = 13;
/** The format's two error-correction bits for Q (L 01, M 00, Q 11, H 10). */
const ECL_Q = 0b11;

/** GF(256) multiply, modulo x⁸ + x⁴ + x³ + x² + 1 (0x11D). */
export function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
/** The RS generator's coefficients (highest power first, the leading 1 dropped) for `degree` EC codewords: roots α⁰ … α^(degree−1). */
export function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}
/** The EC codewords of `data`: the remainder of data(x)·x^degree divided by the generator. */
export function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

/** The 13 data codewords: mode 0100 (bytes), an 8-bit count, the bytes, the terminator, then the pads 0xEC 0x11 … */
export function dataCodewords(bytes: readonly number[]): number[] {
  const bits: number[] = [];
  const put = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, 8);
  for (const b of bytes) put(b, 8);
  const capacity = QR_DATA_CODEWORDS * 8;
  if (bits.length > capacity) throw new Error(`outroSigCode: ${bytes.length} bytes do not fit version 1-Q`);
  put(0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; out.length < QR_DATA_CODEWORDS; pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

type Grid = boolean[][];
const grid = (v: boolean): Grid => Array.from({ length: QR_SIZE }, () => new Array<boolean>(QR_SIZE).fill(v));

/** The function patterns of version 1: the three finders and their separators, the timing lines, the format areas, the dark module. */
export function functionModules(): { dark: Grid; isFunction: Grid } {
  const dark = grid(false);
  const isFunction = grid(false);
  const set = (r: number, c: number, d: boolean) => {
    if (r < 0 || c < 0 || r >= QR_SIZE || c >= QR_SIZE) return;
    dark[r][c] = d;
    isFunction[r][c] = true;
  };
  // Timing patterns.
  for (let i = 0; i < QR_SIZE; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // Finders (with their light separators), top-left, top-right, bottom-left.
  for (const [r0, c0] of [[3, 3], [3, QR_SIZE - 4], [QR_SIZE - 4, 3]] as const) {
    for (let dr = -4; dr <= 4; dr++)
      for (let dc = -4; dc <= 4; dc++) {
        const d = Math.max(Math.abs(dr), Math.abs(dc));
        set(r0 + dr, c0 + dc, d !== 2 && d !== 4);
      }
  }
  // Format areas (reserved; drawn with the chosen mask) and the dark module.
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) set(8, i, false);
    if (!isFunction[i][8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, QR_SIZE - 1 - i, false);
    set(QR_SIZE - 1 - i, 8, false);
  }
  set(QR_SIZE - 8, 8, true);
  return { dark, isFunction };
}

/** The 15 format bits for level Q and `mask` (BCH(15,5), generator 0x537, XOR 0x5412). */
export function formatBits(mask: number): number {
  const data = (ECL_Q << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}
/** Where format bit i (0 = least significant) goes, both copies: [row, col] pairs. */
export function formatPositions(): { first: [number, number][]; second: [number, number][] } {
  const first: [number, number][] = [];
  for (let i = 0; i <= 5; i++) first.push([i, 8]);
  first.push([7, 8], [8, 8], [8, 7]);
  for (let i = 9; i < 15; i++) first.push([8, 14 - i]);
  const second: [number, number][] = [];
  for (let i = 0; i < 8; i++) second.push([8, QR_SIZE - 1 - i]);
  for (let i = 8; i < 15; i++) second.push([QR_SIZE - 15 + i, 8]);
  return { first, second };
}

/** Data mask `m` at (row r, column c): true = flip the module. */
export function maskBit(m: number, r: number, c: number): boolean {
  switch (m) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(c / 3) + Math.floor(r / 2)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

/** The data area in reading order: the two-column zigzag from the bottom right, skipping the vertical timing column. */
export function dataOrder(isFunction: Grid): [number, number][] {
  const out: [number, number][] = [];
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < QR_SIZE; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? QR_SIZE - 1 - vert : vert;
        if (!isFunction[r][c]) out.push([r, c]);
      }
    }
  }
  return out;
}

/** The ISO penalty of a finished symbol (N1 runs, N2 blocks, N3 finder look-alikes, N4 balance); the encoder keeps the lowest mask. */
export function penalty(m: Grid): number {
  let score = 0;
  const lines: boolean[][] = [];
  for (let i = 0; i < QR_SIZE; i++) {
    lines.push(m[i]);
    lines.push(m.map((row) => row[i]));
  }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= QR_SIZE; i++) {
      if (i < QR_SIZE && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    const s = line.map((b) => (b ? '1' : '0')).join('');
    for (const p of ['10111010000', '00001011101']) for (let k = s.indexOf(p); k >= 0; k = s.indexOf(p, k + 1)) score += 40;
  }
  for (let r = 0; r < QR_SIZE - 1; r++) for (let c = 0; c < QR_SIZE - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) score += 3;
  const dark = m.flat().filter(Boolean).length;
  score += 10 * Math.floor(Math.abs((dark * 20) / (QR_SIZE * QR_SIZE) - 10));
  return score;
}

/** The symbol for `bytes` with data mask `mask`. */
export function encodeWithMask(bytes: readonly number[], mask: number): Grid {
  const { dark, isFunction } = functionModules();
  const data = dataCodewords(bytes);
  const codewords = [...data, ...rsRemainder(data, rsDivisor(QR_EC_CODEWORDS))];
  const m = dark.map((row) => [...row]);
  dataOrder(isFunction).forEach(([r, c], i) => {
    const bit = i < codewords.length * 8 ? ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1 : false;
    m[r][c] = bit !== maskBit(mask, r, c);
  });
  const fb = formatBits(mask);
  const pos = formatPositions();
  for (let i = 0; i < 15; i++) {
    const bit = ((fb >>> i) & 1) === 1;
    m[pos.first[i][0]][pos.first[i][1]] = bit;
    m[pos.second[i][0]][pos.second[i][1]] = bit;
  }
  m[QR_SIZE - 8][8] = true;
  return m;
}

/** The symbol for `bytes`: the mask with the lowest penalty (the first on a tie). */
export function encodeSymbol(bytes: readonly number[]): { modules: Grid; mask: number } {
  let best = { modules: encodeWithMask(bytes, 0), mask: 0, score: Infinity };
  for (let mask = 0; mask < 8; mask++) {
    const modules = encodeWithMask(bytes, mask);
    const score = penalty(modules);
    if (score < best.score) best = { modules, mask, score };
  }
  return { modules: best.modules, mask: best.mask };
}

/** The signature's symbol, once. */
export const SIG_SYMBOL = encodeSymbol(SIGNATURE_BYTES);
/** Its modules, top-down. */
export const SIG_CODE: readonly (readonly boolean[])[] = SIG_SYMBOL.modules;
