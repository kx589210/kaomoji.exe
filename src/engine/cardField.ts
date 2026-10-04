// Kaomoji as particles in 3D (spec revision 8: the cosmos is made of faces).
// Each card is one atlas entry — a whole kaomoji — on a flat quad anywhere in
// space, facing any way: its centre and two edge vectors (its right and its
// up, already scaled to its width and height) are written on the CPU every
// sub-frame, so the shot code stays a pure function of time. A card on a
// sphere faces outward and is foreshortened by the camera like a tile on a
// globe; a card that turns its back can fade out, so a planet hides its far
// side. Normal blending (sort far to near first) or added light.
import * as THREE from 'three';
import type { RGB } from './color.ts';
import type { GlyphAtlas } from './glyphAtlas.ts';
import { SDF_EDGE } from './sdf.ts';
import { type Blend, blendMode } from './shapeField.ts';

type V3 = readonly [number, number, number];
export type Card = {
  /** The atlas entry (a whole face). */
  face: string;
  centre: V3;
  /** Half the card's width along its right, half its height along its up (world units); their cross product is its front. */
  right: V3;
  up: V3;
  color: RGB;
  alpha?: number;
};

export class CardField {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private readonly atlas: GlyphAtlas;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly centre: THREE.InstancedBufferAttribute;
  private readonly right: THREE.InstancedBufferAttribute;
  private readonly up: THREE.InstancedBufferAttribute;
  private readonly uv: THREE.InstancedBufferAttribute;
  private readonly color: THREE.InstancedBufferAttribute;

  /** `depthTest`: hidden behind solid meshes drawn before it (it never writes depth itself). */
  constructor(o: { capacity: number; atlas: GlyphAtlas; blend: Blend; hideBacks?: boolean; depthTest?: boolean }) {
    this.capacity = o.capacity;
    this.atlas = o.atlas;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.instanceCount = 0;
    const attr = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(o.capacity * size), size).setUsage(THREE.DynamicDrawUsage);
    this.centre = attr(3);
    this.right = attr(3);
    this.up = attr(3);
    this.uv = attr(4);
    this.color = attr(4);
    this.geo.setAttribute('aCentre', this.centre);
    this.geo.setAttribute('aRight', this.right);
    this.geo.setAttribute('aUp', this.up);
    this.geo.setAttribute('aUv', this.uv);
    this.geo.setAttribute('aColor', this.color);
    this.material = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: o.atlas.texture }, uHideBacks: { value: o.hideBacks ? 1 : 0 } },
      vertexShader: /* glsl */ `
        attribute vec3 aCentre;
        attribute vec3 aRight;
        attribute vec3 aUp;
        attribute vec4 aUv;    // u0, v0 (top), u1, v1 (bottom)
        attribute vec4 aColor; // linear rgb, alpha
        uniform float uHideBacks;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          vec3 world = aCentre + position.x * aRight + position.y * aUp;
          vec4 mv = modelViewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * mv;
          // Facing: the card's front against the direction to the eye (view space).
          vec3 n = normalize(mat3(modelViewMatrix) * cross(aRight, aUp));
          vec3 toEye = normalize(-mv.xyz);
          float facing = dot(n, toEye);
          float a = aColor.a * mix(1.0, smoothstep(0.02, 0.25, facing), uHideBacks);
          vUv = vec2(mix(aUv.x, aUv.z, position.x * 0.5 + 0.5), mix(aUv.w, aUv.y, position.y * 0.5 + 0.5));
          vColor = vec4(aColor.rgb, a);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        varying vec2 vUv;
        varying vec4 vColor;
        void main() {
          float m = texture2D(atlas, vUv).r;
          float aa = max(fwidth(m), 1e-4) * 0.7;
          float a = smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, m) * vColor.a;
          if (a < 0.003) discard;
          #ifdef STRAIGHT
            gl_FragColor = vec4(vColor.rgb, a);
          #else
            gl_FragColor = vec4(vColor.rgb * a, a);
          #endif
        }`,
      defines: o.blend === 'normal' ? { STRAIGHT: '' } : {},
      ...blendMode(o.blend),
      depthTest: o.depthTest ?? false,
      depthWrite: false,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    base.dispose();
  }

  /** The card's width over its height for `face` (its atlas entry's aspect). */
  aspect(face: string): number {
    const e = this.atlas.entries.get(face);
    if (!e) throw new Error(`card "${face}" is not in the atlas`);
    return e.aspect;
  }

  /** Writes `cards` (in the order given: for normal blending, far to near) and draws that many. */
  write(cards: readonly Card[]): void {
    if (cards.length > this.capacity) throw new Error(`card field is full (${cards.length} > ${this.capacity})`);
    const c = this.centre.array as Float32Array;
    const r = this.right.array as Float32Array;
    const u = this.up.array as Float32Array;
    const t = this.uv.array as Float32Array;
    const k = this.color.array as Float32Array;
    cards.forEach((card, i) => {
      const e = this.atlas.entries.get(card.face);
      if (!e) throw new Error(`card "${card.face}" is not in the atlas`);
      c.set(card.centre, 3 * i);
      r.set(card.right, 3 * i);
      u.set(card.up, 3 * i);
      t[4 * i] = e.u0;
      t[4 * i + 1] = e.v0;
      t[4 * i + 2] = e.u1;
      t[4 * i + 3] = e.v1;
      k[4 * i] = card.color[0];
      k[4 * i + 1] = card.color[1];
      k[4 * i + 2] = card.color[2];
      k[4 * i + 3] = card.alpha ?? 1;
    });
    this.geo.instanceCount = cards.length;
    for (const a of [this.centre, this.right, this.up, this.uv, this.color]) a.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
