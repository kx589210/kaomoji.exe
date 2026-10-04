import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import { readCoverage } from '../scripts/lib/cmap.mjs';

const font = (f) => fs.readFileSync(new URL(`../public/fonts/${f}`, import.meta.url));

test('reads coverage of a Latin monospace font', () => {
  const cov = readCoverage(font('jetbrains-mono.ttf'));
  assert.ok(cov.has(0x41), 'A');
  assert.ok(cov.has(0x2588), 'full block');
  assert.ok(!cov.has(0xff89), 'no halfwidth katakana');
});

test('reads coverage of CJK and syllabics fonts', () => {
  assert.ok(readCoverage(font('mplus-1-code.ttf')).has(0x30c4), 'ツ');
  assert.ok(readCoverage(font('noto-sans-jp.ttf')).has(0xff89), 'ﾉ');
  assert.ok(readCoverage(font('noto-sans-thai-looped.ttf')).has(0x0e07), 'ง');
  assert.ok(readCoverage(font('noto-sans-canadian-aboriginal.ttf')).has(0x1555), 'ᕕ');
});
