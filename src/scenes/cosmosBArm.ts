// Renderer B's GPU fields for the arm and the galaxy (cosmos 3.4& → 5.1; the pure half: src/shots/cosmosGalaxy.ts): the arm's stars
// round the chase camera (TunnelField: streaks with a face at the head, or tiny star systems in the fling), the dust wall he punches
// open (DustField), and the spiral's 60,000 stars (SpiralField). Every star is placed on the GPU from a few uniforms per sub-frame (the
// travel, the galaxy's placement and spin, the ignition), so a 64-sample frame costs the CPU nothing per star.
import * as THREE from 'three';
import type { RGB } from '../engine/color.ts';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import { SDF_EDGE } from '../engine/sdf.ts';

const BLEND_ADD = { blending: THREE.AdditiveBlending, premultipliedAlpha: true, depthTest: false, depthWrite: false, transparent: true } as const;

// ——— The arm's stars (the tunnel) ————————————————————————————————————————————————————————————————————————————————————————————————

/** What the tunnel draws at an instant (see TunnelField). */
export type TunnelState = {
  /** Travel down the arm; the streak's length (arm units); the depth behind which the stars are his. */
  travel: number;
  tail: number;
  amber: number;
  /** 1: tiny star systems (rings round a host face: the fling); 0: streaks with a face at the head (the warp). */
  rosette: number;
  alpha: number;
  /** Extra light (the brighter stretch behind the dust wall). */
  gain: number;
  /** The bubble round him the stars give way to (screen px: x, y, radius; radius 0 for none). */
  clear: readonly [number, number, number];
};

const TUNNEL_COMMON = /* glsl */ `
  attribute vec4 aStar;   // r, a, z0, size
  attribute vec4 aUvH;    // host face uv (u0, v0, u1, v1)
  attribute vec4 aUvI;    // his twin's uv
  attribute vec4 aInfo;   // ink (0 cyan, 1 pink, 2 cream), hash, aspect host, aspect twin
  uniform float uT;
  uniform float uZL;
  uniform float uTail;
  uniform float uAmber;
  uniform float uRos;
  uniform float uAlpha;
  uniform float uGain;
  uniform vec3 uInk[4];
  uniform vec3 uClear;    // a bubble round him (screen px: x, y, radius) the stars give way to
  varying vec4 vColor;
  float clearAt(vec2 p) { return smoothstep(uClear.z * 0.55, uClear.z, length(p - uClear.xy)); }
  vec3 headAt(float dz) { return vec3(aStar.x * cos(aStar.y), aStar.x * sin(aStar.y), -dz); }
  float depthOf() { return mod(aStar.z - uT, uZL); }
  vec3 inkOf(float dz) { return dz < uAmber ? uInk[3] : uInk[int(aInfo.x + 0.5)]; }
  // Far stars fade in out of the vanishing point; the hash varies their light.
  float lightOf(float dz) { return uAlpha * uGain * (1.0 - smoothstep(uZL * 0.4, uZL * 0.95, dz)) * (0.55 + 0.45 * aInfo.y); }
`;

/** A tunnel star as the field takes it. */
export type TunnelStarInput = { r: number; a: number; z: number; s: number; ink: number; h: number; host: string; twin: string };

/**
 * The arm round the chase camera: stars on a cylinder repeating every `length` along −z, placed on the GPU from the travel. Two meshes
 * share the stars: `streaks`, each star's light smeared from where it was (the tail, `tail` deeper) to where it is (the head) as a screen-
 * space ribbon; and `heads`, the face at the head (the host, or his twin once it is behind him) or, in the fling, a tiny star system of
 * rings round it. Added as light; no depth test.
 */
export class TunnelField {
  readonly streaks: THREE.Mesh;
  readonly heads: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly streakMat: THREE.ShaderMaterial;
  private readonly headMat: THREE.ShaderMaterial;

  constructor(atlas: GlyphAtlas, stars: readonly TunnelStarInput[], length: number, inks: readonly RGB[]) {
    const n = stars.length;
    const star = new Float32Array(n * 4);
    const uvh = new Float32Array(n * 4);
    const uvi = new Float32Array(n * 4);
    const info = new Float32Array(n * 4);
    stars.forEach((s, i) => {
      const eh = atlas.entries.get(s.host);
      const ei = atlas.entries.get(s.twin);
      if (!eh || !ei) throw new Error(`tunnel face "${s.host}" / "${s.twin}" is not in the atlas`);
      star.set([s.r, s.a, s.z, s.s], 4 * i);
      uvh.set([eh.u0, eh.v0, eh.u1, eh.v1], 4 * i);
      uvi.set([ei.u0, ei.v0, ei.u1, ei.v1], 4 * i);
      info.set([s.ink, s.h, eh.aspect, ei.aspect], 4 * i);
    });
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('aStar', new THREE.InstancedBufferAttribute(star, 4));
    this.geo.setAttribute('aUvH', new THREE.InstancedBufferAttribute(uvh, 4));
    this.geo.setAttribute('aUvI', new THREE.InstancedBufferAttribute(uvi, 4));
    this.geo.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
    this.geo.instanceCount = n;
    base.dispose();
    const uniforms = () => ({
      uT: { value: 0 },
      uZL: { value: length },
      uTail: { value: 0 },
      uAmber: { value: 0 },
      uRos: { value: 0 },
      uAlpha: { value: 1 },
      uGain: { value: 1 },
      uClear: { value: new THREE.Vector3(0, 0, 0) },
      uInk: { value: inks.map((c) => new THREE.Vector3(...c)) },
      atlas: { value: atlas.texture },
      uQuadPerEm: { value: atlas.cellH / atlas.fontPx },
    });
    this.streakMat = new THREE.ShaderMaterial({
      uniforms: uniforms(),
      vertexShader: /* glsl */ `
        ${TUNNEL_COMMON}
        varying vec2 vS;
        varying float vL;
        void main() {
          float dz = depthOf();
          vec4 ch = projectionMatrix * viewMatrix * vec4(headAt(dz), 1.0);
          vec4 ct = projectionMatrix * viewMatrix * vec4(headAt(dz + uTail), 1.0);
          if (dz < 0.25 || ch.w < 0.05 || ct.w < 0.05 || uRos > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec2 sh = ch.xy / ch.w * vec2(960.0, 540.0);
          vec2 st = ct.xy / ct.w * vec2(960.0, 540.0);
          vec2 d = sh - st;
          float l = length(d);
          vec2 u = l > 1e-3 ? d / l : vec2(1.0, 0.0);
          vec2 nn = vec2(-u.y, u.x);
          float k = projectionMatrix[1][1] * 540.0 / ch.w;
          float w = clamp(aStar.w * k * 0.16, 0.8, 9.0);
          float s = mix(-w, l + w, position.x * 0.5 + 0.5);
          float t = position.y * w;
          vec2 p = st + u * s + nn * t;
          gl_Position = vec4(p / vec2(960.0, 540.0), 0.0, 1.0);
          vS = vec2(s, t / w);
          vL = l;
          vColor = vec4(inkOf(dz), lightOf(dz) * clearAt(sh));
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vColor;
        varying vec2 vS;
        varying float vL;
        void main() {
          float along = clamp(vS.x / max(vL, 1.0), 0.0, 1.0);
          float i = exp(-vS.y * vS.y * 5.0) * mix(0.08, 1.0, along * along) * vColor.a;
          if (i < 0.003) discard;
          gl_FragColor = vec4(vColor.rgb * i, i);
        }`,
      ...BLEND_ADD,
    });
    this.headMat = new THREE.ShaderMaterial({
      uniforms: uniforms(),
      vertexShader: /* glsl */ `
        ${TUNNEL_COMMON}
        uniform float uQuadPerEm;
        varying vec2 vUv;
        varying vec2 vLocal;
        varying float vFace;
        void main() {
          float dz = depthOf();
          vec4 ch = projectionMatrix * viewMatrix * vec4(headAt(dz), 1.0);
          if (dz < 0.25 || ch.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float k = projectionMatrix[1][1] * 540.0 / ch.w;
          // The face ≈ 2.6 star sizes wide (prototype j5); a star system 2 across. Faces under ≈ 9 px are a dot; huge ones fade.
          float px = aStar.w * k;
          bool his = dz < uAmber;
          float aspect = his ? aInfo.w : aInfo.z;
          float h = uRos > 0.5 ? px * 2.0 : px * 2.6 / max(aspect, 0.4);
          float big = 1.0 - smoothstep(130.0, 220.0, h);
          float wq = uRos > 0.5 ? h : h * aspect;
          vec2 p = ch.xy / ch.w * vec2(960.0, 540.0) + position.xy * vec2(wq, h) * 0.5;
          gl_Position = vec4(p / vec2(960.0, 540.0), 0.0, 1.0);
          vec4 uv = his ? aUvI : aUvH;
          vUv = vec2(mix(uv.x, uv.z, position.x * 0.5 + 0.5), mix(uv.w, uv.y, position.y * 0.5 + 0.5));
          vLocal = position.xy;
          vFace = smoothstep(9.0, 16.0, h);
          vColor = vec4(inkOf(dz), lightOf(dz) * big * min(1.0, px / 2.0) * clearAt(ch.xy / ch.w * vec2(960.0, 540.0)));
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        uniform float uRos;
        varying vec4 vColor;
        varying vec2 vUv;
        varying vec2 vLocal;
        varying float vFace;
        void main() {
          float a;
          if (uRos > 0.5) {
            // A tiny star system: three rings round a bright centre.
            float r = length(vLocal);
            float rings = 0.0;
            for (int i = 0; i < 3; i++) {
              float R = 0.9 - 0.25 * float(i);
              rings += exp(-pow((r - R) / 0.04, 2.0)) * 0.7;
            }
            a = rings + exp(-r * r / 0.02);
          } else {
            float m = texture2D(atlas, vUv).r;
            float aa = max(fwidth(m), 1e-4) * 0.7;
            float glyph = smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, m);
            float dotLight = exp(-dot(vLocal, vLocal) * 6.0);
            a = mix(dotLight, glyph, vFace);
          }
          a *= vColor.a;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor.rgb * a, a);
        }`,
      ...BLEND_ADD,
    });
    this.streaks = new THREE.Mesh(this.geo, this.streakMat);
    this.heads = new THREE.Mesh(this.geo, this.headMat);
    this.streaks.frustumCulled = false;
    this.heads.frustumCulled = false;
  }

  set(s: TunnelState): void {
    for (const m of [this.streakMat, this.headMat]) {
      const u = m.uniforms;
      u.uT.value = s.travel;
      u.uTail.value = s.tail;
      u.uAmber.value = s.amber;
      u.uRos.value = s.rosette;
      u.uAlpha.value = s.alpha;
      u.uGain.value = s.gain;
      (u.uClear.value as THREE.Vector3).set(...s.clear);
    }
  }

  dispose(): void {
    this.geo.dispose();
    this.streakMat.dispose();
    this.headMat.dispose();
  }
}

// ——— The dust wall ———————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The wall at an instant (see DustField). */
export type DustState = { depth: number; alpha: number; since: number; hole: readonly [number, number] };

/** A stateless hash in [0, 1) (a field's own particles, made once). */
function h32(i: number, a: number): number {
  let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(a + 7, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d);
  x = Math.imul(x ^ (x >>> 12), 0x297a2d39);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}

/**
 * The dust lane he punches open: `count` halftone particles in B and P inks across the arm (clumped into a printed sheet), `depth`
 * ahead; from the punch (`since` ≥ 0) every particle inside the growing hole round him blasts outward and past the lens as a ring. Laid
 * over the picture (normal blending: dust drinks the light behind it).
 */
export class DustField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  constructor(count: number, half: readonly [number, number], inks: readonly [RGB, RGB]) {
    const p = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) p.set([(2 * h32(i, 1) - 1) * half[0], (2 * h32(i, 2) - 1) * half[1], h32(i, 3), h32(i, 4)], 4 * i);
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('aP', new THREE.InstancedBufferAttribute(p, 4));
    this.geo.instanceCount = count;
    base.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uDepth: { value: 10 },
        uAlpha: { value: 0 },
        uSince: { value: -1 },
        uHole: { value: new THREE.Vector2() },
        uInkA: { value: new THREE.Vector3(...inks[0]) },
        uInkB: { value: new THREE.Vector3(...inks[1]) },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aP; // x, y, h1, h2
        uniform float uDepth;
        uniform float uAlpha;
        uniform float uSince;
        uniform vec2 uHole;
        uniform vec3 uInkA;
        uniform vec3 uInkB;
        varying vec4 vColor;
        varying vec2 vLocal;
        void main() {
          vec2 xy = aP.xy;
          float z = -(uDepth + (aP.z - 0.5) * 0.4);
          // Clumps: big dots in the dust's thick lanes, small between (a printed halftone sheet).
          float clump = 0.5 + 0.5 * sin(xy.x * 1.3 + 2.0 * sin(xy.y * 0.7)) * cos(xy.y * 1.1 + 0.3 * xy.x);
          float size = (0.012 + 0.05 * clump * clump) * (0.6 + 0.8 * aP.w);
          if (uSince >= 0.0) {
            vec2 d = xy - uHole;
            float r = length(d);
            float R = 0.25 + 0.5 * pow(uSince, 1.3);
            float blast = 1.0 - smoothstep(R * 0.6, R, r);
            xy += normalize(d + 1e-4) * blast * (0.4 + 0.25 * uSince * uSince * (0.4 + aP.z));
            z += blast * uSince * 0.35 * (0.5 + aP.w);
            size *= 1.0 + blast * 0.6;
          }
          vec4 c = projectionMatrix * viewMatrix * vec4(xy, z, 1.0);
          if (c.w < 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float k = projectionMatrix[1][1] * 540.0 / c.w;
          float px = max(size * k, 1.2);
          vec2 p = c.xy / c.w * vec2(960.0, 540.0) + position.xy * px;
          gl_Position = vec4(p / vec2(960.0, 540.0), 0.0, 1.0);
          vLocal = position.xy;
          vColor = vec4(aP.w > 0.5 ? uInkA : uInkB, uAlpha * (1.0 - smoothstep(180.0, 320.0, px)));
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vColor;
        varying vec2 vLocal;
        void main() {
          float r = length(vLocal);
          float aa = fwidth(r) * 0.8;
          float a = (1.0 - smoothstep(1.0 - aa, 1.0, r)) * vColor.a;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor.rgb, a);
        }`,
      blending: THREE.NormalBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  set(s: DustState): void {
    const u = this.material.uniforms;
    u.uDepth.value = s.depth;
    u.uAlpha.value = s.alpha;
    u.uSince.value = s.since;
    (u.uHole.value as THREE.Vector2).set(s.hole[0], s.hole[1]);
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

// ——— The spiral galaxy ———————————————————————————————————————————————————————————————————————————————————————————————————————

type V3 = readonly [number, number, number];
/** The galaxy at an instant (see SpiralField). */
export type SpiralState = {
  core: V3;
  e1: V3;
  e2: V3;
  n: V3;
  radius: number;
  spin: number;
  /** The ignition ring (galaxy radii); the host arms' flip radius; the ring's extra light. */
  ignition: number;
  flip: number;
  wave: number;
  alpha: number;
  /** His stretch's light (arm 4: the snap's middle scale). */
  local: number;
  /** Logical px per world unit at depth 1 (the lens's focal length at 1080p). */
  focal: number;
};

/**
 * The spiral's stars as dots of light, placed on the GPU from the galaxy's placement in the arm's space: his arms (0, 2) and the bulge
 * amber, the host arms cyan (1) and pink (3) until the flip reaches them; outside the ignition ring a dim violet (unlit glass), inside it
 * lit, the ring itself burning brighter as it passes. Dots never under 1.6 px (smaller ones grow and dim, keeping their light); stars
 * flying past the lens (the tilt) fade before they fill the frame.
 */
export class SpiralField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  constructor(stars: readonly { r: number; a: number; z: number; arm: number; s: number }[], inks: { amber: RGB; cyan: RGB; pink: RGB; unlit: RGB }) {
    const n = stars.length;
    const s4 = new Float32Array(n * 4);
    const i2 = new Float32Array(n * 2);
    stars.forEach((s, i) => {
      s4.set([s.r, s.a, s.z, s.s], 4 * i);
      i2.set([s.arm, h32(i, 9)], 2 * i);
    });
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('aS', new THREE.InstancedBufferAttribute(s4, 4));
    this.geo.setAttribute('aI', new THREE.InstancedBufferAttribute(i2, 2));
    this.geo.instanceCount = n;
    base.dispose();
    const v3 = (c: RGB) => new THREE.Vector3(...c);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uCore: { value: new THREE.Vector3() },
        uE1: { value: new THREE.Vector3() },
        uE2: { value: new THREE.Vector3() },
        uN: { value: new THREE.Vector3() },
        uRadius: { value: 1 },
        uSpin: { value: 0 },
        uIg: { value: 0 },
        uFlip: { value: 0 },
        uWave: { value: 0 },
        uAlpha: { value: 0 },
        uLocal: { value: 1 },
        uFocal: { value: 1000 },
        uAmber: { value: v3(inks.amber) },
        uCyan: { value: v3(inks.cyan) },
        uPink: { value: v3(inks.pink) },
        uUnlit: { value: v3(inks.unlit) },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aS; // r, a, z, size (galaxy radii)
        attribute vec2 aI; // arm (−1 the bulge), hash
        uniform vec3 uCore;
        uniform vec3 uE1;
        uniform vec3 uE2;
        uniform vec3 uN;
        uniform float uRadius;
        uniform float uSpin;
        uniform float uIg;
        uniform float uFlip;
        uniform float uWave;
        uniform float uAlpha;
        uniform float uLocal;
        uniform float uFocal;
        uniform vec3 uAmber;
        uniform vec3 uCyan;
        uniform vec3 uPink;
        uniform vec3 uUnlit;
        varying vec4 vColor;
        varying vec2 vLocal;
        void main() {
          float r = aS.x;
          float a = aS.y + uSpin / sqrt(max(r, 0.05));
          vec3 world = uCore + (uE1 * (r * cos(a)) + uE2 * (r * sin(a)) + uN * aS.z) * uRadius;
          vec4 mv = viewMatrix * vec4(world, 1.0);
          float depth = -mv.z;
          if (depth < 0.5 || uAlpha <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float px = aS.w * uRadius * uFocal / depth;
          float k = max(1.0, 1.6 / px);
          float big = 1.0 - smoothstep(14.0, 40.0, px);
          px *= k;
          vec4 c = projectionMatrix * mv;
          vec2 p = c.xy / c.w * vec2(960.0, 540.0) + position.xy * px;
          gl_Position = vec4(p / vec2(960.0, 540.0), 0.0, 1.0);
          vLocal = position.xy;
          bool local = aI.x > 3.5;
          bool amber = aI.x < -0.5 || local || mod(aI.x, 2.0) < 0.5 || r < uFlip;
          vec3 ink = amber ? uAmber : (aI.x < 1.5 ? uCyan : uPink);
          float lit = smoothstep(uIg + 0.02, uIg - 0.04, r);
          float wave = 1.0 + uWave * exp(-pow((r - uIg) / 0.07, 2.0));
          vec3 col = mix(uUnlit, ink, lit) * wave * (0.6 + 0.6 * aI.y);
          vColor = vec4(local ? uAmber * (0.7 + 0.6 * aI.y) : col, uAlpha * big / (k * k) * (local ? uLocal : 1.0));
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vColor;
        varying vec2 vLocal;
        void main() {
          float a = exp(-dot(vLocal, vLocal) * 3.0) * vColor.a;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor.rgb * a, a);
        }`,
      ...BLEND_ADD,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  set(s: SpiralState): void {
    const u = this.material.uniforms;
    (u.uCore.value as THREE.Vector3).set(...s.core);
    (u.uE1.value as THREE.Vector3).set(...s.e1);
    (u.uE2.value as THREE.Vector3).set(...s.e2);
    (u.uN.value as THREE.Vector3).set(...s.n);
    u.uRadius.value = s.radius;
    u.uSpin.value = s.spin;
    u.uIg.value = s.ignition;
    u.uFlip.value = s.flip;
    u.uWave.value = s.wave;
    u.uAlpha.value = s.alpha;
    u.uLocal.value = s.local;
    u.uFocal.value = s.focal;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
