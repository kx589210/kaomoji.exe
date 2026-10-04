import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findMissing } from '../scripts/check-glyphs.mjs';

const coverage = new Map([
  ['A', new Set([0x61, 0x62])],
  ['B', new Set([0x63])],
]);
const stacks = { mono: ['A', 'B'] };

test('a character covered by a later font in the stack is fine', () => {
  assert.deepEqual(findMissing([{ role: 'mono', text: 'abc', where: 't' }], coverage, stacks), []);
});

test('an emoji nobody covers is reported with its code point', () => {
  const missing = findMissing([{ role: 'mono', text: 'a😀', where: 'test' }], coverage, stacks);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].codePoint, 'U+1F600');
  assert.equal(missing[0].where, 'test');
});

test('spaces are ignored', () => {
  assert.deepEqual(findMissing([{ role: 'mono', text: 'a b　c', where: 't' }], coverage, stacks), []);
});
