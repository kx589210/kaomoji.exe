import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cellWidth, layoutLines, lineWidth } from '../src/engine/textGrid.ts';

test('ASCII, Greek, symbols and halfwidth forms take one cell; kana and fullwidth forms take two', () => {
  for (const ch of ['a', ' ', 'ω', '•', '█', '━', '┻', '°', '∀', '✧', '･', 'ﾉ', 'ง', 'ᕕ', '▎']) assert.equal(cellWidth(ch), 1, ch);
  for (const ch of ['ツ', '；', '・', '＾', '〇', '︵', '猫']) assert.equal(cellWidth(ch), 2, ch);
  assert.equal(cellWidth('́'), 0);
});

test('mixed-width lines stay on the grid', () => {
  const cells = layoutLines(['ab', '(；・∀・)']);
  assert.deepEqual(
    cells.map((c) => [c.ch, c.line, c.col, c.width]),
    [['a', 0, 0, 1], ['b', 0, 1, 1], ['(', 1, 0, 1], ['；', 1, 1, 2], ['・', 1, 3, 2], ['∀', 1, 5, 1], ['・', 1, 6, 2], [')', 1, 8, 1]],
  );
  assert.equal(lineWidth('(；・∀・)'), 9);
});

test('an astral character is one character of width two', () => {
  assert.deepEqual(layoutLines(['😀a']).map((c) => c.col), [0, 2]);
});
