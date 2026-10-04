import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BloomEffect } from 'postprocessing';
import type { WebGLRenderTarget } from 'three';
import { GrainEffect, sizeBloom } from '../src/engine/pipeline.ts';

/** The sizes of the bloom's bright pass and of its blur's mips (internals the typings leave out). */
const sizes = (bloom: BloomEffect) => {
  const b = bloom as unknown as { luminancePass: { renderTarget: WebGLRenderTarget }; mipmapBlurPass: { downsamplingMipmaps: WebGLRenderTarget[] } };
  return {
    bright: [b.luminancePass.renderTarget.width, b.luminancePass.renderTarget.height],
    mips: b.mipmapBlurPass.downsamplingMipmaps.map((m) => [m.width, m.height]),
  };
};
const bloomAt = (width: number, height: number) => {
  const b = new BloomEffect({ mipmapBlur: true, intensity: 0, luminanceThreshold: 1, luminanceSmoothing: 0.1, radius: 0.7 });
  b.setSize(width, height); // what the composer does
  sizeBloom(b, width, height);
  return b;
};

test('at 1080p the bloom is untouched: the bright pass at full size, eight mips from half size', () => {
  const b = bloomAt(1920, 1080);
  const plain = new BloomEffect({ mipmapBlur: true });
  plain.setSize(1920, 1080);
  assert.deepEqual(sizes(b), sizes(plain));
  assert.deepEqual(sizes(b).bright, [1920, 1080]);
  assert.equal(sizes(b).mips.length, 8);
});

test('a 4K frame blooms like the 1080p preview, scaled: the bright pass is filtered down to 1080p and blurred through the very same mips', () => {
  const hd = sizes(bloomAt(1920, 1080));
  const k4 = sizes(bloomAt(3840, 2160));
  assert.deepEqual(k4.bright, [1920, 1080]);
  assert.deepEqual(k4.mips, hd.mips, 'the widest glow covers the same share of the frame');
  // Resizing back down restores the 1080p sizes (the pipeline reallocates when the drawing buffer changes).
  const b = bloomAt(3840, 2160);
  b.setSize(1920, 1080);
  sizeBloom(b, 1920, 1080);
  assert.deepEqual(sizes(b), hd);
});

test('the film grain is the 1080p grain, scaled: one grain cell per 1080p pixel at any render scale', () => {
  const g = new GrainEffect();
  const cell = (w: number, h: number) => {
    g.setSize(w, h);
    return g.uniforms.get('cell')!.value as number;
  };
  assert.equal(cell(1920, 1080), 1);
  assert.equal(cell(3840, 2160), 2);
  assert.match(g.getFragmentShader() ?? '', /uvec2\(gl_FragCoord\.xy \/ cell\)/, 'the grain is hashed on the 1080p grid');
});
