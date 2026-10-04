// Diffraction spikes (the space-telescope look): thin rays of light through
// the brightest stars, added as light. Each spike is a quad facing the camera,
// turned to its angle, glowing along its length and fading to its ends; its
// state is written on the CPU every sub-frame.
import * as THREE from 'three';
import type { RGB } from './color.ts';

type V3 = readonly [number, number, number];
export type Spike = { centre: V3; /** Half-length and half-width, world units. */ length: number; width: number; angle: number; color: RGB };

export class SpikeField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly a: THREE.InstancedBufferAttribute;
  private readonly b: THREE.InstancedBufferAttribute;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.b = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aA', this.a); // centre xyz, angle
    this.geo.setAttribute('aB', this.b); // length, width, packed colour (r, g·b)
    this.geo.instanceCount = 0;
    base.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: { uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uCapsule: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 aA;
        attribute vec4 aB;
        attribute vec3 aRgb;
        uniform vec3 uRight;
        uniform vec3 uUp;
        varying vec2 vP;
        varying vec3 vColor;
        void main() {
          float c = cos(aA.w), s = sin(aA.w);
          vec3 along = uRight * c + uUp * s;
          vec3 across = -uRight * s + uUp * c;
          vec3 world = aA.xyz + position.x * along * aB.x + position.y * across * aB.y * 6.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
          vP = vec2(position.x, position.y * 6.0);
          vColor = aRgb;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uCapsule;
        varying vec2 vP;
        varying vec3 vColor;
        void main() {
          float along = 1.0 - abs(vP.x);
          float ray = exp(-vP.y * vP.y * 1.6) * along * along * along;
          // A flat-design capsule: even along its length, round-ended, hard-edged.
          float r = length(vec2(max(abs(vP.x) - 0.9, 0.0) * 6.0, vP.y));
          float capsule = 1.0 - smoothstep(0.75, 1.0, r);
          float i = mix(ray, capsule, uCapsule);
          if (i < 0.002) discard;
          gl_FragColor = vec4(vColor * i, i);
        }`,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.geo.setAttribute('aRgb', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  /** Writes the spikes and the camera's unit right and up; `capsule` (0–1) turns the soft rays into flat round-ended capsules. */
  write(spikes: readonly Spike[], right: V3, up: V3, capsule = 0): void {
    this.material.uniforms.uCapsule.value = capsule;
    if (spikes.length > this.capacity) throw new Error(`spike field is full (${spikes.length})`);
    const a = this.a.array as Float32Array;
    const b = this.b.array as Float32Array;
    const rgb = (this.geo.getAttribute('aRgb') as THREE.InstancedBufferAttribute).array as Float32Array;
    spikes.forEach((s, i) => {
      a.set([s.centre[0], s.centre[1], s.centre[2], s.angle], 4 * i);
      b.set([s.length, s.width, 0, 0], 4 * i);
      rgb.set(s.color, 3 * i);
    });
    this.geo.instanceCount = spikes.length;
    this.a.needsUpdate = true;
    this.b.needsUpdate = true;
    (this.geo.getAttribute('aRgb') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.material.uniforms.uRight.value as THREE.Vector3).set(...right);
    (this.material.uniforms.uUp.value as THREE.Vector3).set(...up);
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
