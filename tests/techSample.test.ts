import assert from 'node:assert/strict';
import { discColumn } from '../src/sample/paint.ts';
import { test } from 'node:test';
import { TECH_SAMPLE_TEXT } from '../src/content/text.ts';
import { HIT_FRAME, KICKS, TECH_SAMPLE_FRAMES, typeFrames, typedCount } from '../src/score/techSample.ts';

test('typing lands on 32nd notes and finishes before the status lines', () => {
  assert.equal(typeFrames.length, TECH_SAMPLE_TEXT.prompt.length);
  assert.equal(typeFrames[0], 12);
  assert.ok(typeFrames.every((f) => f % 3 === 0));
  assert.ok(typeFrames[typeFrames.length - 1] < 60);
  assert.equal(typedCount(0), 0);
  assert.equal(typedCount(12), 1);
  assert.equal(typedCount(1000), TECH_SAMPLE_TEXT.prompt.length);
});

test('kicks sit on beats and the hit is inside the sample', () => {
  assert.ok(KICKS.every((f) => f % 24 === 0));
  assert.ok(HIT_FRAME < TECH_SAMPLE_FRAMES);
});

test('the Swiss disc glides between columns and never jumps, even when it wraps', () => {
  for (let f = 120; f < 300; f += 0.25) {
    const step = Math.abs(discColumn(f + 0.25) - discColumn(f));
    assert.ok(step < 1, `frame ${f}: moved ${step.toFixed(2)} columns in a quarter frame`);
  }
  assert.equal(discColumn(120), 7);
  assert.ok(Math.abs(discColumn(143.99) - 8) < 0.01);
});
