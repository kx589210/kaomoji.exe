import * as THREE from 'three';
import type { RGB } from './color.ts';
import type { GlyphAtlas } from './glyphAtlas.ts';
import { SDF_EDGE } from './sdf.ts';
import { type Blend, blendMode } from './shapeField.ts';

export type Glyph = {
  ch: string;
  /** Centre in the field's local units. */
  x: number;
  y: number;
  z?: number;
  /** Font size (em) in local units. */
  size: number;
  /** Linear colour; above 1 blooms. For 'multiply' fields, the ink's transmittance. */
  color: RGB;
  alpha?: number;
  /** 0 = the glyph, 1 = a filled circle `circlePerEm` ems across. */
  morph?: number;
  /** Radians about the local z axis. */
  rot?: number;
  /** Horizontal scale on top of `size` (1 = none). */
  stretch?: number;
  /** Draw everything but the glyph: a sheet with a glyph-shaped hole. */
  invert?: boolean;
  /** With `invert`: the sheet is this many times the glyph's quad. */
  sheet?: number;
  /** An outline this many ems wide just outside the glyph's edge, in `outlineColor` (at most 0.75 × the atlas radius); absent or 0: none. */
  outline?: number;
  outlineColor?: RGB;
  /** Neon: draw the glyph as a lit tube — its strokes thinned by this many ems, its middle white-hot; absent or 0: a plain fill. */
  tube?: number;
};

/**
 * How white-hot a neon tube is at field value `m` (`edge`: the tube's thinned
 * edge; `aa`: the edge's anti-aliasing width at the device's pixels; `aaRef`:
 * the same width measured in 1080p pixels). The core rises from just inside
 * the anti-aliased edge to full white 0.07 further in, both in field units
 * measured at 1080p, so a 4K frame draws the core the previews showed. A glyph
 * too small for that ramp (under ~32 px an em at 1080p) gets an anti-aliased
 * step at the ramp's top instead: GLSL leaves smoothstep with edge0 ≥ edge1
 * undefined (ANGLE inverts it: white rims, coloured middles, 2×2 noise).
 * Shared with the tests, which run it.
 */
export const TUBE_CORE_GLSL = /* glsl */ `
float tubeCore(float m, float edge, float aa, float aaRef) {
  float hi = edge + 0.07;
  float lo = edge + aaRef;
  if (lo < hi - 0.001) return smoothstep(lo, hi, m);
  return smoothstep(hi - aa, hi + aa, m);
}`;

/** The height (px) the glyph sizes and the tube's core are designed at. */
const REF_HEIGHT = 1080;

const hex = (ch: string) => `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Instanced SDF glyphs whose state is written on the CPU every sub-frame, so
 * shot code stays a pure function of time. Quads are at least square, which
 * leaves room for the glyph → circle morph; the glyph's own distance field is
 * read only inside its atlas entry, and outside it counts as far away (so an
 * inverted glyph is a sheet of ink with a hole).
 */
export class GlyphField {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private readonly atlas: GlyphAtlas;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly pos: THREE.InstancedBufferAttribute;
  private readonly shape: THREE.InstancedBufferAttribute;
  private readonly uv: THREE.InstancedBufferAttribute;
  private readonly color: THREE.InstancedBufferAttribute;
  private readonly extra: THREE.InstancedBufferAttribute;
  private readonly stroke: THREE.InstancedBufferAttribute;
  private readonly quadPerEm: number;

  constructor(o: { capacity: number; atlas: GlyphAtlas; blend?: Blend; circlePerEm?: number }) {
    this.capacity = o.capacity;
    this.atlas = o.atlas;
    this.quadPerEm = o.atlas.cellH / o.atlas.fontPx;
    const blend = o.blend ?? 'add';
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.instanceCount = 0;
    const attr = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(o.capacity * size), size).setUsage(THREE.DynamicDrawUsage);
    this.pos = attr(4);
    this.shape = attr(4);
    this.uv = attr(4);
    this.color = attr(3);
    this.extra = attr(4);
    this.stroke = attr(4);
    this.geo.setAttribute('aPos', this.pos);
    this.geo.setAttribute('aShape', this.shape);
    this.geo.setAttribute('aUv', this.uv);
    this.geo.setAttribute('aColor', this.color);
    this.geo.setAttribute('aExtra', this.extra);
    this.geo.setAttribute('aStroke', this.stroke);
    const circle = (o.circlePerEm ?? 1.25) / 2 / this.quadPerEm;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: o.atlas.texture },
        uSlope: { value: o.atlas.cellH / o.atlas.radius },
        uCircle: { value: circle },
        uFog: { value: new THREE.Vector3(0, 0, 0) },
        uNear: { value: new THREE.Vector2(0, 0) },
        uRef: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aPos;    // x, y, z, rotation
        attribute vec4 aShape;  // quad height, glyph aspect (w/h), morph, alpha
        attribute vec4 aUv;     // u0, v0 (top), u1, v1 (bottom)
        attribute vec3 aColor;
        attribute vec4 aExtra;  // stretch, invert, sheet, tube erosion (field units)
        attribute vec4 aStroke; // outline r, g, b, width (field units)
        uniform vec3 uFog;      // near, far, amount (view-space distance)
        uniform vec2 uNear;     // alpha rises from 0 to 1 between these view distances; (0, 0) = off
        varying vec2 vLocal;
        varying vec4 vBox;
        varying float vAspect;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vMorph;
        varying float vInvert;
        varying vec4 vStroke;
        varying float vTube;
        void main() {
          vec2 local = position.xy * vec2(max(aShape.y, 1.0), 1.0) * aExtra.z;
          vec2 q = local * aShape.x * vec2(aExtra.x, 1.0);
          float c = cos(aPos.w);
          float s = sin(aPos.w);
          vec2 p = mat2(c, s, -s, c) * q;
          vec4 mv = modelViewMatrix * vec4(aPos.xy + p, aPos.z, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          float fog = uFog.z > 0.0 ? 1.0 - uFog.z * smoothstep(uFog.x, uFog.y, dist) : 1.0;
          float near = uNear.y > uNear.x ? smoothstep(uNear.x, uNear.y, dist) : 1.0;
          vLocal = local;
          vBox = aUv;
          vAspect = aShape.y;
          vColor = aColor;
          vAlpha = aShape.w * fog * near;
          vMorph = aShape.z;
          vInvert = aExtra.y;
          vStroke = aStroke;
          vTube = aExtra.w;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        uniform float uSlope;
        uniform float uCircle;
        uniform float uRef;     // device px per 1080p px of the render target
        ${TUBE_CORE_GLSL}
        varying vec2 vLocal;
        varying vec4 vBox;
        varying float vAspect;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vMorph;
        varying float vInvert;
        varying vec4 vStroke;
        varying float vTube;
        void main() {
          vec2 g = vec2(vLocal.x / vAspect + 0.5, vLocal.y + 0.5);
          float inside = step(0.0, g.x) * step(g.x, 1.0) * step(0.0, g.y) * step(g.y, 1.0);
          vec2 uv = vec2(mix(vBox.x, vBox.z, clamp(g.x, 0.0, 1.0)), mix(vBox.w, vBox.y, clamp(g.y, 0.0, 1.0)));
          float d = texture2D(atlas, uv).r * inside;
          float circle = clamp(${SDF_EDGE.toFixed(4)} + (uCircle - length(vLocal)) * uSlope, 0.0, 1.0);
          float m = mix(d, circle, vMorph);
          float aa = max(fwidth(m), 1e-4) * 0.7;
          float a = smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, m);
          vec3 rgb = vColor;
          if (vTube > 0.0) {
            // A lit tube: the stroke thinned, its middle white-hot, its edges the gas's colour.
            float edge = ${SDF_EDGE.toFixed(4)} + vTube;
            a = smoothstep(edge - aa, edge + aa, m);
            float core = tubeCore(m, edge, aa, aa * uRef);
            vec3 hot = mix(vColor, vec3(max(vColor.r, max(vColor.g, vColor.b))), 0.72);
            rgb = mix(vColor, hot * 1.45, core);
          } else if (vStroke.w > 0.0 && vInvert < 0.5) {
            // The outline: its own edge further out in the field; the fill blends over it, so there is no gap.
            float e = ${SDF_EDGE.toFixed(4)} - vStroke.w;
            rgb = mix(vStroke.rgb, vColor, a);
            a = smoothstep(e - aa, e + aa, m);
          }
          a = mix(a, 1.0 - a, vInvert) * vAlpha;
          if (a < 0.003) discard;
          #ifdef STRAIGHT
            gl_FragColor = vec4(rgb, a);
          #else
            gl_FragColor = vec4(rgb * a, a);
          #endif
        }`,
      defines: blend === 'normal' ? { STRAIGHT: '' } : {},
      // 'add' and 'multiply' write colour already multiplied by alpha; marked
      // premultiplied, three blends them with ONE, ONE and DST_COLOR,
      // ONE_MINUS_SRC_ALPHA (a non-premultiplied additive blend would square
      // the alpha of every edge and fade).
      ...blendMode(blend),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    // Measure the target it is drawn into, so the tube's core keeps its 1080p look at any render scale.
    const size = new THREE.Vector2();
    this.mesh.onBeforeRender = (renderer) => {
      const target = renderer.getRenderTarget();
      const height = target ? target.height : renderer.getDrawingBufferSize(size).y;
      this.material.uniforms.uRef.value = height / REF_HEIGHT;
      this.material.uniformsNeedUpdate = true;
    };
    base.dispose();
  }

  set(i: number, g: Glyph): void {
    if (i >= this.capacity) throw new Error(`glyph field is full (${this.capacity})`);
    const e = this.atlas.entries.get(g.ch);
    if (!e) throw new Error(`glyph "${g.ch}" (${hex(g.ch)}) is not in the atlas`);
    const k = i * 4;
    const p = this.pos.array as Float32Array;
    const s = this.shape.array as Float32Array;
    const u = this.uv.array as Float32Array;
    const c = this.color.array as Float32Array;
    const x = this.extra.array as Float32Array;
    const o = this.stroke.array as Float32Array;
    p[k] = g.x;
    p[k + 1] = g.y;
    p[k + 2] = g.z ?? 0;
    p[k + 3] = g.rot ?? 0;
    s[k] = g.size * this.quadPerEm;
    s[k + 1] = e.aspect;
    s[k + 2] = g.morph ?? 0;
    s[k + 3] = g.alpha ?? 1;
    u[k] = e.u0;
    u[k + 1] = e.v0;
    u[k + 2] = e.u1;
    u[k + 3] = e.v1;
    c[i * 3] = g.color[0];
    c[i * 3 + 1] = g.color[1];
    c[i * 3 + 2] = g.color[2];
    x[k] = g.stretch ?? 1;
    x[k + 1] = g.invert ? 1 : 0;
    x[k + 2] = g.invert ? (g.sheet ?? 1) : 1;
    x[k + 3] = ((g.tube ?? 0) * this.atlas.fontPx) / this.atlas.radius;
    const oc = g.outlineColor ?? [0, 0, 0];
    o[k] = oc[0];
    o[k + 1] = oc[1];
    o[k + 2] = oc[2];
    o[k + 3] = ((g.outline ?? 0) * this.atlas.fontPx) / this.atlas.radius;
  }

  /** Draw the first `count` glyphs written since the last commit. */
  commit(count: number): void {
    this.geo.instanceCount = count;
    for (const a of [this.pos, this.shape, this.uv, this.color, this.extra, this.stroke]) a.needsUpdate = true;
  }

  /** Fades glyphs between view distances `near` and `far`; `amount` 0 turns the fog off. */
  setFog(near: number, far: number, amount: number): void {
    (this.material.uniforms.uFog.value as THREE.Vector3).set(near, far, amount);
  }

  /** Fades glyphs in between view distances `start` and `end`; (0, 0) turns it off. */
  setNearFade(start: number, end: number): void {
    (this.material.uniforms.uNear.value as THREE.Vector2).set(start, end);
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
