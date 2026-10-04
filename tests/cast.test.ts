import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAT, EYES, MOUTHS, PROTAGONIST, expression, faceText, faceWidth, kaomoji, layoutFace } from '../src/actors/cast.ts';
import { RISO_GLYPHS, SWISS_JP } from '../src/content/build.ts';

const adv = (ch: string) => ({ '(': 0.35, ')': 0.35, '•': 0.3, ω: 0.62 })[ch] ?? 0.5;

test('the 64 faces of the Swiss grid are all different, and face 0 is the protagonist', () => {
  const faces = new Set<string>();
  for (let e = 0; e < EYES.length; e++) for (let m = 0; m < MOUTHS.length; m++) faces.add(faceText(expression(e, m)));
  assert.equal(faces.size, 64);
  assert.equal(faceText(expression(0, 0)), faceText(PROTAGONIST));
  assert.equal(faceText(PROTAGONIST), '(•ω•)');
});

test('a face is typeset around its centre: a symmetric face has its mouth at 0', () => {
  const parts = layoutFace(PROTAGONIST, adv, 0.02);
  assert.ok(Math.abs(parts[2].dx) < 1e-9);
  assert.ok(Math.abs(parts[0].dx + parts[4].dx) < 1e-9);
  assert.deepEqual(parts.map((p) => p.role), ['bracket', 'eye', 'mouth', 'eye', 'bracket']);
  assert.ok(Math.abs(faceWidth(PROTAGONIST, adv, 0.02) - (0.35 + 0.3 + 0.62 + 0.3 + 0.35 + 4 * 0.02)) < 1e-9);
});

test('roles are given per character and must match the text', () => {
  assert.deepEqual(CAT.map((p) => p.role), ['bracket', 'cheek', 'ear', 'eye', 'mouth', 'eye', 'ear', 'cheek', 'bracket']);
  assert.throws(() => kaomoji('(•ω•)', 'bem'), /5 characters, 3 roles/);
});

test('the atlases hold every character of their faces', () => {
  for (let e = 0; e < EYES.length; e++) for (let m = 0; m < MOUTHS.length; m++) for (const p of expression(e, m)) assert.ok(SWISS_JP.includes(p.ch), p.ch);
  for (const p of CAT) assert.ok(RISO_GLYPHS.includes(p.ch), p.ch);
});
