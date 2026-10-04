// The blue screen's 2D code (src/shots/outroSigCode.ts; build sheet §5.3 layer 3, R5) read back by an independent reader written here
// from the standard (ISO/IEC 18004, version 1): the format bits (level Q, a mask), the unmasked data in zigzag order, the Reed–Solomon
// syndromes all zero, byte mode with a count of 10, and the bytes are `• ω •` in UTF-8. A phone pointed at the paused 2.1 frame reads
// the same (checked against a render).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SIGNATURE_BYTES, SIGNATURE_TEXT } from '../src/content/outro.ts';
import { SIG_CODE, SIG_SYMBOL } from '../src/shots/outroSigCode.ts';

const N = 21;
// GF(256) with x⁸ + x⁴ + x³ + x² + 1, by log tables (not the module's shift-and-add multiply).
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
const at = (r: number, c: number): boolean => SIG_CODE[r][c];
const isFunction = (r: number, c: number): boolean => (r <= 8 && c <= 8) || (r <= 8 && c >= N - 8) || (r >= N - 8 && c <= 8) || r === 6 || c === 6;
const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** The format word, first copy round the top-left finder (bit 14 … 0). */
function readFormat(): number {
  let bits = 0;
  const cells: [number, number][] = [];
  for (let i = 0; i <= 5; i++) cells.push([i, 8]);
  cells.push([7, 8], [8, 8], [8, 7]);
  for (let i = 9; i < 15; i++) cells.push([8, 14 - i]);
  cells.forEach(([r, c], i) => {
    if (at(r, c)) bits |= 1 << i;
  });
  return bits;
}
function bch(data5: number): number {
  let rem = data5;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data5 << 10) | rem) ^ 0x5412;
}

test('the format bits say level Q and a mask, BCH-correct, and the second copy agrees', () => {
  const word = readFormat();
  const data = (word ^ 0x5412) >>> 10;
  assert.equal(bch(data), word, 'a valid BCH(15,5) word');
  assert.equal(data >>> 3, 0b11, 'level Q');
  assert.equal(data & 7, SIG_SYMBOL.mask);
  let second = 0;
  for (let i = 0; i < 8; i++) if (at(8, N - 1 - i)) second |= 1 << i;
  for (let i = 8; i < 15; i++) if (at(N - 15 + i, 8)) second |= 1 << i;
  assert.equal(second, word);
  assert.ok(at(N - 8, 8), 'the dark module');
});

test('the finders and timing patterns stand where a reader looks for them', () => {
  for (const [r0, c0] of [
    [0, 0],
    [0, N - 7],
    [N - 7, 0],
  ])
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        assert.equal(at(r0 + r, c0 + c), ring !== 2, `finder at ${r0},${c0}: ${r},${c}`);
      }
  for (let i = 8; i < N - 8; i++) {
    assert.equal(at(6, i), i % 2 === 0);
    assert.equal(at(i, 6), i % 2 === 0);
  }
});

test('read back: 26 codewords whose Reed–Solomon syndromes are all zero; byte mode, 10 bytes: E2 80 A2 20 CF 89 20 E2 80 A2 = • ω •', () => {
  const mask = MASKS[(readFormat() ^ 0x5412) >>> 10 & 7];
  const bits: number[] = [];
  for (let right = N - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < N; v++)
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? N - 1 - v : v;
        if (!isFunction(r, c)) bits.push(+(at(r, c) !== mask(r, c)));
      }
  }
  assert.equal(bits.length, 26 * 8, 'version 1: 208 data bits');
  const cw = Array.from({ length: 26 }, (_, k) => bits.slice(8 * k, 8 * k + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let j = 0; j < 13; j++) {
    let s = 0;
    for (const c of cw) s = mul(s, EXP[j]) ^ c;
    assert.equal(s, 0, `syndrome ${j}`);
  }
  const data = cw.slice(0, 13).flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >>> (7 - i)) & 1));
  const read = (from: number, n: number) => data.slice(from, from + n).reduce((a, b) => (a << 1) | b, 0);
  assert.equal(read(0, 4), 0b0100, 'byte mode');
  const count = read(4, 8);
  assert.equal(count, 10);
  const bytes = Array.from({ length: count }, (_, i) => read(12 + 8 * i, 8));
  assert.deepEqual(bytes, [...SIGNATURE_BYTES]);
  assert.equal(new TextDecoder().decode(new Uint8Array(bytes)), SIGNATURE_TEXT);
  assert.equal(read(12 + 80, 4), 0, 'the terminator');
});
