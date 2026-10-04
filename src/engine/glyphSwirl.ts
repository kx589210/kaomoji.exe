import * as THREE from 'three';
import { rng } from './random.ts';
import type { GlyphAtlas } from './glyphAtlas.ts';

export type SwirlOptions = {
  count: number;
  sprites: readonly string[];
  atlas: GlyphAtlas;
  seed: number;
  /** HDR colors (components may exceed 1 so particles bloom). */
  palette: readonly THREE.Color[];
  /** Sprite height range in world units. */
  size?: readonly [number, number];
  /** Vertical spread (standard deviation) of the swarm in world units. */
  thickness?: number;
  /** 'add' glows (for dark scenes); 'normal' paints solid ink (for light scenes). */
  blend?: 'add' | 'normal';
};

/**
 * Glyph sprites orbiting the origin. Positions are computed on the GPU from
 * static per-instance parameters and three uniforms, so the swarm is a pure
 * function of time.
 */
export class GlyphSwirl {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(o: SwirlOptions) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('uv', base.getAttribute('uv'));
    geo.instanceCount = o.count;
    const rand = rng(o.seed);
    const [sMin, sMax] = o.size ?? [0.02, 0.08];
    const thickness = o.thickness ?? 0.35;
    // Approximate normal distribution from three uniforms (Irwin–Hall).
    const normal = () => rand() + rand() + rand() - 1.5;
    const orbit = new Float32Array(o.count * 4);
    const look = new Float32Array(o.count * 4);
    const uvs = new Float32Array(o.count * 4);
    const colors = new Float32Array(o.count * 3);
    for (let i = 0; i < o.count; i++) {
      const sprite = o.sprites[Math.floor(rand() * o.sprites.length)];
      const e = o.atlas.entries.get(sprite);
      if (!e) throw new Error(`sprite "${sprite}" is not in the atlas`);
      const r = 0.7 + 2.6 * Math.sqrt(rand());
      orbit.set([r, ((0.25 + 0.9 * rand()) * (rand() < 0.5 ? 1 : 1.15)) / Math.sqrt(r), rand() * Math.PI * 2, normal() * 2 * thickness * (0.4 + r / 3.3)], i * 4);
      look.set([sMin + (sMax - sMin) * rand() ** 2, e.aspect, rand(), rand() * Math.PI * 2], i * 4);
      uvs.set([e.u0, e.v0, e.u1, e.v1], i * 4);
      const c = o.palette[Math.floor(rand() * o.palette.length)];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(orbit, 4));
    geo.setAttribute('aLook', new THREE.InstancedBufferAttribute(look, 4));
    geo.setAttribute('aUv', new THREE.InstancedBufferAttribute(uvs, 4));
    geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
    this.material = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: o.atlas.texture }, uTime: { value: 0 }, uReveal: { value: 0 }, uBurst: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec4 aOrbit;   // radius, angular speed, phase, height
        attribute vec4 aLook;    // size, aspect, seed, spin phase
        attribute vec4 aUv;      // u0, v0 (top), u1, v1 (bottom)
        attribute vec3 aColor;
        uniform float uTime;
        uniform float uReveal;
        uniform float uBurst;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float r = aOrbit.x * mix(3.2, 1.0, uReveal) * uBurst;
          float a = aOrbit.z + aOrbit.y * uTime;
          vec3 c = vec3(cos(a) * r, aOrbit.w + 0.12 * sin(uTime * 1.3 + aLook.z * 6.2831), sin(a) * r);
          vec4 mv = modelViewMatrix * vec4(c, 1.0);
          float spin = aLook.w + uTime * (aLook.z - 0.5) * 2.0;
          vec2 p = position.xy * aLook.x * vec2(aLook.y, 1.0);
          mv.xy += mat2(cos(spin), sin(spin), -sin(spin), cos(spin)) * p;
          gl_Position = projectionMatrix * mv;
          vUv = vec2(mix(aUv.x, aUv.z, uv.x), mix(aUv.w, aUv.y, uv.y));
          vColor = aColor;
          vAlpha = smoothstep(0.0, 0.25, uReveal);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = texture2D(atlas, vUv).r;
          float w = max(fwidth(d), 1e-4) * 0.7;
          float a = smoothstep(0.75 - w, 0.75 + w, d) * vAlpha;
          if (a < 0.004) discard;
          #ifdef INK
            gl_FragColor = vec4(vColor, a);
          #else
            gl_FragColor = vec4(vColor * a, a);
          #endif
        }`,
      defines: o.blend === 'normal' ? { INK: '' } : {},
      blending: o.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
  }

  update(u: { time: number; reveal: number; burst: number }): void {
    this.material.uniforms.uTime.value = u.time;
    this.material.uniforms.uReveal.value = u.reveal;
    this.material.uniforms.uBurst.value = u.burst;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
