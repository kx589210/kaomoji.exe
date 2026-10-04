import assert from 'node:assert/strict';
import { test } from 'node:test';
import { typeset } from '../src/engine/typeset.ts';

test('each character sits at the centre of its advance, with tracking between characters', () => {
  const adv = (ch: string) => (ch === 'W' ? 1 : 0.5);
  const line = typeset('aWb', adv, 0.1);
  assert.deepEqual(line.chars.map((c) => c.ch), ['a', 'W', 'b']);
  assert.deepEqual(line.chars.map((c) => +c.x.toFixed(9)), [0.25, 1.1, 1.95]);
  assert.ok(Math.abs(line.width - 2.2) < 1e-9);
  assert.equal(typeset('', adv).width, 0);
});
