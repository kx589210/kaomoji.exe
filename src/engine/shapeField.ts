import * as THREE from 'three';
import type { RGB } from './color.ts';

export type ShapeKind = 'rect' | 'ellipse' | 'ring' | 'segment';

export type Shape = {
  kind: ShapeKind;
  /** Centre in the field's local units (y up). */
  x: number;
  y: number;
  z?: number;
  /** Full width and height. */
  w: number;
  h: number;
  /** rect: corner radius; ring: line width (inside the ellipse). A segment is a capsule `w` long end to end and `h` thick. */
  r?: number;
  /** Radians about the local z axis. */
  rot?: number;
  /** Linear colour: the ink for 'normal' and 'add', its transmittance for 'multiply'. */
  color: RGB;
  alpha?: number;
  /** Halftone: the share of the area (0–1) printed as dots `screen` units apart on a grid turned by `angle` radians. Absent or 1: solid. */
  tint?: number;
  screen?: number;
  angle?: number;
  /** An outline this wide (local units) just inside the edge, in `outlineColor`; absent or 0: none. */
  outline?: number;
  outlineColor?: RGB;
  /** A soft edge: alpha rises from 0 at the edge to full this far inside (local units) — light spilling, a beam through haze. Absent or 0: crisp. */
  soft?: number;
};

export type Blend = 'normal' | 'multiply' | 'add';

const KIND: Record<ShapeKind, number> = { rect: 0, ellipse: 1, ring: 2, segment: 3 };

/** GL blending for a Blend; 'multiply' and 'add' expect colour premultiplied by alpha. */
export const blendMode = (b: Blend): { blending: THREE.Blending; premultipliedAlpha: boolean } =>
  b === 'normal' ? { blending: THREE.NormalBlending, premultipliedAlpha: false } : { blending: b === 'multiply' ? THREE.MultiplyBlending : THREE.AdditiveBlending, premultipliedAlpha: true };

/**
 * Instanced flat shapes (rounded rectangles, ellipses, rings, capsules), each a signed
 * distance evaluated per pixel, so edges stay crisp at any zoom. A tint below
 * 1 prints as a halftone screen fixed to the shape's plane. Inks blend
 * 'normal' (opaque paint), 'multiply' (overprinting inks: the order does not
 * matter) or 'add' (light).
 */
export class ShapeField {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly pos: THREE.InstancedBufferAttribute;
  private readonly size: THREE.InstancedBufferAttribute;
  private readonly color: THREE.InstancedBufferAttribute;
  private readonly tone: THREE.InstancedBufferAttribute;
  private readonly stroke: THREE.InstancedBufferAttribute;

  constructor(o: { capacity: number; blend: Blend }) {
    this.capacity = o.capacity;
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.instanceCount = 0;
    const attr = () => new THREE.InstancedBufferAttribute(new Float32Array(o.capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.pos = attr();
    this.size = attr();
    this.color = attr();
    this.tone = attr();
    this.stroke = attr();
    this.geo.setAttribute('aPos', this.pos);
    this.geo.setAttribute('aSize', this.size);
    this.geo.setAttribute('aColor', this.color);
    this.geo.setAttribute('aTone', this.tone);
    this.geo.setAttribute('aStroke', this.stroke);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uNear: { value: new THREE.Vector2(0, 0) } },
      vertexShader: /* glsl */ `
        attribute vec4 aPos;   // x, y, z, rotation
        attribute vec4 aSize;  // w, h, r, kind
        attribute vec4 aColor; // r, g, b, alpha
        attribute vec4 aTone;  // tint, screen, angle, soft
        attribute vec4 aStroke; // outline r, g, b, width
        varying vec2 vLocal;
        varying vec2 vPlane;
        varying vec4 vSize;
        varying vec4 vColor;
        varying vec4 vTone;
        varying vec4 vStroke;
        varying float vDist;
        void main() {
          // A little margin around the shape so its anti-aliased edge is not cut off.
          float pad = 2.0 + 0.01 * max(aSize.x, aSize.y);
          vec2 local = position.xy * (aSize.xy + 2.0 * pad);
          float c = cos(aPos.w);
          float s = sin(aPos.w);
          vec2 p = aPos.xy + mat2(c, s, -s, c) * local;
          vec4 mv = modelViewMatrix * vec4(p, aPos.z, 1.0);
          gl_Position = projectionMatrix * mv;
          vLocal = local;
          vPlane = p;
          vSize = aSize;
          vColor = aColor;
          vTone = aTone;
          vStroke = aStroke;
          vDist = -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec2 uNear;  // alpha rises from 0 to 1 between these view distances; (0, 0) = off
        varying vec2 vLocal;
        varying vec2 vPlane;
        varying vec4 vSize;
        varying vec4 vColor;
        varying vec4 vTone;
        varying vec4 vStroke;
        varying float vDist;
        // ("half" is a reserved word in GLSL ES 3.00, hence "hs" for the half size.)
        float box(vec2 p, vec2 hs, float r) {
          vec2 q = abs(p) - hs + r;
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        }
        float oval(vec2 p, vec2 hs) {
          return (length(p / hs) - 1.0) * min(hs.x, hs.y);
        }
        void main() {
          vec2 hs = vSize.xy * 0.5;
          float kind = vSize.w;
          float d;
          if (kind < 0.5) d = box(vLocal, hs, min(vSize.z, min(hs.x, hs.y)));
          else if (kind < 1.5) d = oval(vLocal, hs);
          else if (kind < 2.5) d = abs(oval(vLocal, hs) + vSize.z * 0.5) - vSize.z * 0.5;
          else {
            // A capsule: a segment along x with round ends, as thick as the shape is high.
            float r = hs.y;
            float l = max(hs.x - r, 0.0);
            d = length(vec2(vLocal.x - clamp(vLocal.x, -l, l), vLocal.y)) - r;
          }
          float aa = max(fwidth(d), 1e-4) * 0.7;
          float a = vTone.w > 0.0 ? pow(clamp(-d / vTone.w, 0.0, 1.0), 1.6) : 1.0 - smoothstep(-aa, aa, d);
          vec3 rgb = vColor.rgb;
          // The outline: a band just inside the edge, blended into the fill without a gap.
          if (vStroke.w > 0.0) rgb = mix(rgb, vStroke.rgb, smoothstep(-aa, aa, d + vStroke.w));
          if (vTone.y > 0.0 && vTone.x < 0.999) {
            float c = cos(vTone.z);
            float s = sin(vTone.z);
            vec2 g = mat2(c, -s, s, c) * vPlane / vTone.y;
            // A cosine screen: round dots at low tints, a checkerboard at 50%, holes at high tints.
            float screen = 0.5 + 0.25 * (cos(6.2831853 * g.x) + cos(6.2831853 * g.y));
            float e = screen - (1.0 - vTone.x);
            float w = max(fwidth(e), 1e-4) * 0.7;
            a *= smoothstep(-w, w, e);
          }
          if (uNear.y > uNear.x) a *= smoothstep(uNear.x, uNear.y, vDist);
          a *= vColor.a;
          if (a < 0.002) discard;
          #ifdef STRAIGHT
            gl_FragColor = vec4(rgb, a);
          #else
            gl_FragColor = vec4(rgb * a, a);
          #endif
        }`,
      defines: o.blend === 'normal' ? { STRAIGHT: '' } : {},
      ...blendMode(o.blend),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    base.dispose();
  }

  set(i: number, s: Shape): void {
    if (i >= this.capacity) throw new Error(`shape field is full (${this.capacity})`);
    const k = i * 4;
    const p = this.pos.array as Float32Array;
    const z = this.size.array as Float32Array;
    const c = this.color.array as Float32Array;
    const t = this.tone.array as Float32Array;
    const o = this.stroke.array as Float32Array;
    p[k] = s.x;
    p[k + 1] = s.y;
    p[k + 2] = s.z ?? 0;
    p[k + 3] = s.rot ?? 0;
    z[k] = s.w;
    z[k + 1] = s.h;
    z[k + 2] = s.r ?? 0;
    z[k + 3] = KIND[s.kind];
    c[k] = s.color[0];
    c[k + 1] = s.color[1];
    c[k + 2] = s.color[2];
    c[k + 3] = s.alpha ?? 1;
    t[k] = s.tint ?? 1;
    t[k + 1] = s.screen ?? 0;
    t[k + 2] = s.angle ?? 0;
    t[k + 3] = s.soft ?? 0;
    const oc = s.outlineColor ?? [0, 0, 0];
    o[k] = oc[0];
    o[k + 1] = oc[1];
    o[k + 2] = oc[2];
    o[k + 3] = s.outline ?? 0;
  }

  /** Draw the first `count` shapes written since the last commit. */
  commit(count: number): void {
    this.geo.instanceCount = count;
    for (const a of [this.pos, this.size, this.color, this.tone, this.stroke]) a.needsUpdate = true;
  }

  /** Fades shapes in between view distances `start` and `end`, so paper flying past the camera never fills the frame; (0, 0) turns it off. */
  setNearFade(start: number, end: number): void {
    (this.material.uniforms.uNear.value as THREE.Vector2).set(start, end);
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
