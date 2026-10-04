import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { GlyphField, TUBE_CORE_GLSL } from '../src/engine/glyphField.ts';
import type { GlyphAtlas } from '../src/engine/glyphAtlas.ts';

/** GLSL's smoothstep, refusing edge0 ≥ edge1 (undefined in GLSL; ANGLE/D3D inverts it). */
function strictSmoothstep(e0: number, e1: number, x: number): number {
  if (!(e0 < e1)) throw new Error(`smoothstep(${e0}, ${e1}, …): edge0 ≥ edge1 is undefined in GLSL`);
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
/** The shader's own tubeCore, run in JS: its GLSL with the float declarations dropped. */
const tubeCore = new Function(
  'smoothstep',
  `${TUBE_CORE_GLSL.replace(/\bfloat\s+(\w+)\s*\(([^)]*)\)/, (_, name: string, args: string) => `function ${name}(${args.replace(/\bfloat\s+/g, '')})`).replace(/\bfloat\s+/g, 'let ')}; return tubeCore;`,
)(strictSmoothstep) as (m: number, edge: number, aa: number, aaRef: number) => number;

/** The club's atlas: fontPx 96, radius 30, so the field changes by 3.2 / s per device pixel for a glyph s device px per em. */
const aaFor = (devicePxPerEm: number): number => 0.7 * (3.2 / devicePxPerEm);
const EDGE = 0.75 + 0.06;
const ms = Array.from({ length: 241 }, (_, i) => EDGE - 0.1 + i * 0.0025);

test('the neon tube’s white core is well defined for glyphs of every size at every render scale: no inverted smoothstep, 0–1, whiter towards the middle of the stroke', () => {
  for (const scale of [0.5, 1, 1.5, 2]) {
    for (let px = 3; px <= 2000; px *= 1.07) {
      const aa = aaFor(px * scale);
      let last = -1;
      for (const m of ms) {
        const c = tubeCore(m, EDGE, aa, aa * scale);
        assert.ok(c >= 0 && c <= 1, `${px.toFixed(1)} px at ×${scale}: ${c}`);
        assert.ok(c >= last - 1e-12, `${px.toFixed(1)} px at ×${scale}: the core darkens towards the middle at m ${m}`);
        last = c;
      }
    }
  }
});

test('where the glyph resolves a tube the core is the approved 1x look, and a 2x render draws the very same core (resolution-independent)', () => {
  for (let px = 33; px <= 2000; px *= 1.07) {
    const aa1 = aaFor(px);
    if (aa1 >= 0.07 - 0.0011) continue;
    for (const m of ms) {
      const approved = strictSmoothstep(EDGE + aa1, EDGE + 0.07, m);
      assert.ok(Math.abs(tubeCore(m, EDGE, aa1, aa1) - approved) < 1e-12, `${px.toFixed(1)} px at 1x, m ${m}`);
      const aa2 = aaFor(2 * px);
      assert.ok(Math.abs(tubeCore(m, EDGE, aa2, aa2 * 2) - approved) < 1e-12, `${px.toFixed(1)} px at 2x, m ${m}`);
    }
  }
});

test('too small to resolve a tube, the core is an anti-aliased step at the same place, so the stroke’s average whiteness carries on from the resolved sizes', () => {
  const mean = (aa: number, ref: number) => ms.filter((m) => m <= EDGE + 0.1).reduce((s, m) => s + tubeCore(m, EDGE, aa, ref), 0);
  const justResolved = mean(0.0685, 0.0685);
  const justNot = mean(0.0705, 0.0705);
  assert.ok(Math.abs(justNot - justResolved) < 0.15 * justResolved, `${justResolved.toFixed(2)} → ${justNot.toFixed(2)}`);
});

test('the field measures its render target, so the core’s reference is 1080p at any scale', () => {
  const atlas = { texture: new THREE.Texture(), entries: new Map(), cellH: 120, fontPx: 96, radius: 30 } as unknown as GlyphAtlas;
  const field = new GlyphField({ capacity: 4, atlas });
  const material = field.mesh.material as THREE.ShaderMaterial;
  assert.match(material.fragmentShader, /tubeCore\(/, 'the fragment shader calls tubeCore');
  const draw = (height: number | null, buffer = 1080) => {
    const renderer = { getRenderTarget: () => (height === null ? null : { height }), getDrawingBufferSize: (v: THREE.Vector2) => v.set(buffer * (16 / 9), buffer) } as unknown as THREE.WebGLRenderer;
    field.mesh.onBeforeRender(renderer, new THREE.Scene(), new THREE.Camera(), field.mesh.geometry, material, null as unknown as THREE.Group);
    return material.uniforms.uRef.value as number;
  };
  assert.equal(draw(1080), 1);
  assert.equal(draw(2160), 2);
  assert.equal(draw(null, 2160), 2, 'drawing to the canvas: its drawing buffer');
  field.dispose();
});
