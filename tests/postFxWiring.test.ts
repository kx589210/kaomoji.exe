// The new looks' wiring (Look.kaleido / .riso / .comic / .pixel → src/engine/pipeline.ts): each effect has its own pass in the
// composer, in the order the effects were designed for; every one is off unless the frame's look asks for it, so a look without
// them leaves the composer exactly as before; and while a pass that reworks the picture (kaleidoscope, print, comic) is on, the
// screen overlay (the readout) is drawn after it instead of into the sum, so it stays clean. A fake renderer stands in for WebGL:
// every GPU call is absorbed, the draws that matter are recorded.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Pass } from 'postprocessing';
import * as THREE from 'three';
import { Pipeline } from '../src/engine/pipeline.ts';
import { FLAT_LOOK, type Look, mixLook, type Renderable } from '../src/engine/types.ts';

/** Absorbs any GPU call: every property is itself, every call returns itself, every assignment is taken. */
const sink: never = new Proxy(() => undefined, {
  get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : key === 'then' ? undefined : sink),
  apply: () => sink,
  set: () => true,
}) as never;

/** A WebGLRenderer stand-in, 1920 × 1080, that absorbs every call and remembers which target each draw went to. */
function fakeRenderer() {
  let target: unknown = null;
  const draws: unknown[] = [];
  const own: Record<string, unknown> = {
    getDrawingBufferSize: (v: THREE.Vector2) => v.set(1920, 1080),
    getSize: (v: THREE.Vector2) => v.set(1920, 1080),
    getPixelRatio: () => 1,
    getContext: () => new Proxy({ getContextAttributes: () => ({ alpha: false }) }, { get: (t, k) => (k in t ? t[k as 'getContextAttributes'] : sink) }),
    setRenderTarget: (t: unknown) => (target = t),
    getRenderTarget: () => target,
    render: () => draws.push(target),
    outputColorSpace: THREE.LinearSRGBColorSpace,
  };
  const gl = new Proxy(own, { get: (t, k) => (k in t ? t[k as string] : sink), set: () => true }) as unknown as THREE.WebGLRenderer;
  return { gl, draws };
}

type Internals = { composer: { passes: Pass[] }; accum: THREE.WebGLRenderTarget; applyLook(look: Look, frame: number): void };
const internals = (p: Pipeline) => p as unknown as Internals;
/** The composer's passes by role: the effects a pass holds ('finishing' for the main pass: bloom … grain), or the pass's own name. */
const roles = (p: Pipeline) =>
  internals(p).composer.passes.map((pass) => {
    const effects = (pass as unknown as { effects?: { name: string }[] }).effects;
    if (!effects) return pass.name;
    const names = effects.map((e) => e.name);
    return names.includes('BloomEffect') ? 'finishing' : names.join('+');
  });
const enabled = (p: Pipeline) => Object.fromEntries(roles(p).map((r, i) => [r, internals(p).composer.passes[i].enabled]));

const KALEIDO: Look = { ...FLAT_LOOK, kaleido: { amount: 1, facets: 8 } };
const RISO: Look = { ...FLAT_LOOK, riso: { amount: 1 } };
const COMIC: Look = { ...FLAT_LOOK, comic: { amount: 1 } };
const PIXEL: Look = { ...FLAT_LOOK, pixel: { amount: 1, cell: 6, palette: 'film16' } };

test('each new look has its own pass, in the designed order: fold, print, ink, then the readout, the finishing, game pixels, the flash, the CRT', () => {
  const p = new Pipeline(fakeRenderer().gl, { quality: 'draft' });
  assert.deepEqual(roles(p), [
    'TextureInputPass',
    'KaleidoscopeEffect',
    'RisoPrintEffect',
    'ComicInkEffect',
    'OverlayPass',
    'finishing',
    'PixelEffect',
    'GlyphFlashEffect',
    'CrtEffect',
  ]);
});

test('a look without the new fields leaves every new pass off: the composer runs exactly the passes it ran before', () => {
  const p = new Pipeline(fakeRenderer().gl, { quality: 'final' });
  for (const look of [FLAT_LOOK, { ...FLAT_LOOK, crt: { amount: 1, curvature: 0.04, scanlines: 0.5, lines: 540, grille: 0.2 } }, KALEIDO, FLAT_LOOK]) {
    internals(p).applyLook(look, 0);
  }
  const on = enabled(p);
  for (const r of ['KaleidoscopeEffect', 'RisoPrintEffect', 'ComicInkEffect', 'OverlayPass', 'PixelEffect', 'GlyphFlashEffect']) assert.equal(on[r], false, `${r} is off`);
  assert.equal(on.TextureInputPass, true);
  assert.equal(on.CrtEffect, true, 'the CRT pass stays on (amount 0 is a no-op), the last pass, rendering to the screen');
  // amount 0 is off too.
  for (const look of [
    { ...FLAT_LOOK, kaleido: { amount: 0, facets: 8 } },
    { ...FLAT_LOOK, riso: { amount: 0, power: 1 } },
    { ...FLAT_LOOK, comic: { amount: 0 } },
    { ...FLAT_LOOK, pixel: { amount: 0, cell: 6 } },
  ]) {
    internals(p).applyLook(look, 0);
    const o = enabled(p);
    assert.ok(!o.KaleidoscopeEffect && !o.RisoPrintEffect && !o.ComicInkEffect && !o.PixelEffect, JSON.stringify(look));
  }
});

test('each field turns on its own pass and no other', () => {
  const p = new Pipeline(fakeRenderer().gl, { quality: 'final' });
  const cases: [Look, string][] = [[KALEIDO, 'KaleidoscopeEffect'], [RISO, 'RisoPrintEffect'], [COMIC, 'ComicInkEffect'], [PIXEL, 'PixelEffect']];
  for (const [look, role] of cases) {
    internals(p).applyLook(look, 0);
    const on = enabled(p);
    for (const r of ['KaleidoscopeEffect', 'RisoPrintEffect', 'ComicInkEffect', 'PixelEffect']) assert.equal(on[r], r === role, `${role}: ${r}`);
  }
  // Comic speed lines alone (amount 0) still run the comic pass, to draw the lines.
  internals(p).applyLook({ ...FLAT_LOOK, comic: { amount: 0, lines: { kind: 'focus', x: 0, y: 0, count: 60, width: 12, inner: 200, seed: 1, amount: 1 } } }, 0);
  assert.equal(enabled(p).ComicInkEffect, true);
});

/** A root with a readout that records the target it was drawn into. */
function rootWith(look: Look) {
  const overlays: unknown[] = [];
  const root: Renderable = {
    init: async () => {},
    render: () => {},
    look: () => look,
    screenOverlay: (_gl, target) => void overlays.push(target),
    dispose: () => {},
  };
  return { root, overlays };
}

test('the readout goes into the summed sub-frames as before, unless a pass that reworks the picture is on: then it is drawn after that pass, once', () => {
  for (const [look, late] of [[FLAT_LOOK, false], [PIXEL, false], [KALEIDO, true], [RISO, true], [COMIC, true], [{ ...RISO, exposure: 1.25 }, true]] as const) {
    const { gl } = fakeRenderer();
    const p = new Pipeline(gl, { quality: 'draft' });
    const { root, overlays } = rootWith(look);
    p.renderFrame(root, 100);
    assert.equal(overlays.length, 1, 'once per output frame');
    if (late) assert.notEqual(overlays[0], internals(p).accum, `${Object.keys(look).join(',')}: not into the sum`);
    else assert.equal(overlays[0], internals(p).accum, `${Object.keys(look).join(',')}: into the sum`);
  }
});

test('mixLook leaves the new fields out when neither side has them, so a mixed look is what it was before', () => {
  const a: Look = { ...FLAT_LOOK, exposure: 1.2 };
  const b: Look = { ...FLAT_LOOK, grain: 0.1 };
  const m = mixLook(a, b, 0.3);
  for (const k of ['kaleido', 'riso', 'comic', 'pixel']) assert.equal(k in m, false, k);
});

test('mixLook fades each new look in from the side without it, and blends two of them', () => {
  const half = mixLook(FLAT_LOOK, { ...RISO, riso: { amount: 1, night: 1 } }, 0.5);
  assert.equal(half.riso?.amount, 0.5);
  assert.equal(half.riso?.night, 1, 'the side without a print takes the other side’s settings at amount 0');
  assert.equal(mixLook(PIXEL, FLAT_LOOK, 0.25).pixel?.amount, 0.75);
  assert.equal(mixLook(FLAT_LOOK, COMIC, 0.25).comic?.amount, 0.25);
  const k = mixLook(KALEIDO, { ...FLAT_LOOK, kaleido: { amount: 1, facets: 12 } }, 0.5).kaleido;
  assert.equal(k?.facets, 10, 'the fold morphs 8 → 12 continuously');
  assert.equal(k?.amount, 1);
});
