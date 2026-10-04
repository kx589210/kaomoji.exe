// Galaxies of kaomoji on the GPU (spec revision 8: every galaxy as dense as
// the first). Each star is written once — its radius and angle in its
// galaxy's plane, its height off the plane, its size, colour, face (an atlas
// entry) and which galaxy it belongs to — and every frame only each galaxy's
// pose is sent: its centre and radius, its tilt and heading, how far it has
// turned (inside faster than out) and how bright it is. The vertex shader
// places every star and turns its card to face the camera; the cards are
// added as light, so where faces crowd, a galaxy glows.
import * as THREE from 'three';
import type { RGB } from './color.ts';
import type { GlyphAtlas } from './glyphAtlas.ts';
import { SDF_EDGE } from './sdf.ts';

/** A star in its galaxy: radius and angle in the plane (galaxy radii, radians), height off it (galaxy radii), em (galaxy radii), colour, face. */
export type GalaxyStar = { r: number; a: number; z: number; em: number; color: RGB; face: string };
/** A galaxy's place at an instant: centre and radius (world units), tilt (0 face-on … π/2 edge-on) and heading (about the view's up), spin (radians at radius 1), light (multiplies its stars' colour; 0 hides it). */
export type GalaxyPlacement = { centre: readonly [number, number, number]; radius: number; tilt: number; heading: number; spin: number; light: number };

/**
 * How the stars are drawn at an instant (the bridge from the photograph to
 * the neon club flattens and re-draws them step by step):
 * - maxPx: cards bigger than this on screen fade out (from 0.6 of it), so
 *   stars the camera flies past never fill the frame;
 * - wave: a ring of extra light running out along galaxy `wave.galaxy`'s
 *   disk (front radius and width in galaxy radii, gain);
 * - flat: the disk's thickness (1 as made, 0 flat);
 * - neon: each star's colour snapped to its neon hue (0 or 1);
 * - tube: the faces drawn as tubes (their outline only), 0 or 1;
 * - em: multiplies every card's size.
 */
export type GalaxyStyle = { maxPx: number; wave: { galaxy: number; front: number; width: number; gain: number }; flat: number; neon: number; tube: number; em: number };
export const PHOTO_STYLE: GalaxyStyle = { maxPx: 1e6, wave: { galaxy: 0, front: -1, width: 0.1, gain: 0 }, flat: 1, neon: 0, tube: 0, em: 1 };

/** The neon hue of a star of colour `c` (linear): warm rose to pink, gold and orange to amber, blue to cyan, white stays; at the star's brightness. */
export function neonOf(c: RGB): RGB {
  const l = Math.max(1e-6, c[0] + c[1] + c[2]);
  const warm = (c[0] - c[2]) / Math.max(1e-6, c[0] + c[2]);
  const hue: RGB = warm > 0.3 && c[1] / Math.max(1e-6, c[0]) < 0.62 ? NEON_PINK : warm > 0.12 ? NEON_AMBER : warm < -0.04 ? NEON_CYAN : NEON_WHITE;
  const k = l / Math.max(1e-6, hue[0] + hue[1] + hue[2]);
  return [hue[0] * k, hue[1] * k, hue[2] * k];
}
const NEON_PINK: RGB = [1, 0.047, 0.258];
const NEON_AMBER: RGB = [1, 0.43, 0.088];
const NEON_CYAN: RGB = [0.068, 0.79, 1];
const NEON_WHITE: RGB = [0.9, 0.92, 1];

export const MAX_GALAXIES = 64;

export class GalaxyField {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly count: number;

  /** `galaxies[g]` are the stars of galaxy g. 'light' adds them; 'dark' lays them over what is there (dust that drinks the light), at `opacity`. */
  constructor(atlas: GlyphAtlas, galaxies: readonly (readonly GalaxyStar[])[], o: { mode?: 'light' | 'dark'; opacity?: number } = {}) {
    const dark = o.mode === 'dark';
    if (galaxies.length > MAX_GALAXIES) throw new Error(`at most ${MAX_GALAXIES} galaxies`);
    const n = galaxies.reduce((s, g) => s + g.length, 0);
    this.count = n;
    const star = new Float32Array(n * 4);
    const color = new Float32Array(n * 4);
    const uv = new Float32Array(n * 4);
    const neon = new Float32Array(n * 3);
    let i = 0;
    galaxies.forEach((stars, g) => {
      for (const s of stars) {
        const e = atlas.entries.get(s.face);
        if (!e) throw new Error(`face "${s.face}" is not in the atlas`);
        star.set([s.r, s.a, s.z, s.em], 4 * i);
        color.set([s.color[0], s.color[1], s.color[2], g + e.aspect / 1000], 4 * i);
        uv.set([e.u0, e.v0, e.u1, e.v1], 4 * i);
        neon.set(neonOf(s.color), 3 * i);
        i++;
      }
    });
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('aStar', new THREE.InstancedBufferAttribute(star, 4));
    this.geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 4));
    this.geo.setAttribute('aUv', new THREE.InstancedBufferAttribute(uv, 4));
    this.geo.setAttribute('aNeon', new THREE.InstancedBufferAttribute(neon, 3));
    this.geo.instanceCount = n;
    base.dispose();
    const vec4s = () => Array.from({ length: MAX_GALAXIES }, () => new THREE.Vector4());
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: atlas.texture },
        uQuadPerEm: { value: atlas.cellH / atlas.fontPx },
        uCentre: { value: vec4s() },
        uPose: { value: vec4s() },
        uRight: { value: new THREE.Vector3(1, 0, 0) },
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uPxScale: { value: 1080 / (2 * Math.tan((10 * Math.PI) / 180)) },
        uMinPx: { value: 2.6 },
        uOpacity: { value: o.opacity ?? 0.5 },
        uMaxPx: { value: 1e6 },
        uWave: { value: new THREE.Vector4(0, -1, 0.1, 0) },
        uFlat: { value: 1 },
        uNeon: { value: 0 },
        uTube: { value: 0 },
        uEm: { value: 1 },
      },
      vertexShader: /* glsl */ `
        #define MAX_GALAXIES ${MAX_GALAXIES}
        attribute vec4 aStar;  // r, a, z, em
        attribute vec4 aColor; // rgb, galaxy index + aspect / 1000
        attribute vec4 aUv;
        attribute vec3 aNeon;
        uniform vec4 uCentre[MAX_GALAXIES]; // xyz, radius
        uniform vec4 uPose[MAX_GALAXIES];   // tilt, heading, spin, light
        uniform vec3 uRight;
        uniform vec3 uUp;
        uniform float uQuadPerEm;
        uniform float uPxScale; // px per world unit at distance 1 (viewport height / (2 tan(fov / 2)))
        uniform float uMinPx;   // no card smaller than this on screen: smaller ones grow and dim to keep their light
        uniform float uMaxPx;   // cards bigger than this fade out
        uniform vec4 uWave;     // galaxy, front, width, gain
        uniform float uFlat;
        uniform float uNeon;
        uniform float uEm;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          int g = int(floor(aColor.w + 0.0001));
          float aspect = (aColor.w - float(g)) * 1000.0;
          vec4 c = uCentre[g];
          vec4 p = uPose[g];
          if (p.w <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          float a = aStar.y + p.z / max(0.12, aStar.x);
          vec3 q = vec3(aStar.x * cos(a), aStar.x * sin(a), aStar.z * uFlat);
          float ct = cos(p.x), st = sin(p.x);
          q = vec3(q.x, q.y * ct - q.z * st, q.y * st + q.z * ct);
          float ch = cos(p.y), sh = sin(p.y);
          q = vec3(q.x * ch + q.z * sh, q.y, -q.x * sh + q.z * ch);
          float h = 0.5 * aStar.w * c.w * uQuadPerEm * uEm;
          vec3 at = c.xyz + q * c.w;
          float depth = max(1.0, -(modelViewMatrix * vec4(at, 1.0)).z);
          float px = 2.0 * h * uPxScale / depth;
          float k = max(1.0, uMinPx / px);
          float big = 1.0 - smoothstep(0.6 * uMaxPx, uMaxPx, px);
          h *= k;
          vec3 world = at + position.x * uRight * h * aspect + position.y * uUp * h;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
          vUv = vec2(mix(aUv.x, aUv.z, position.x * 0.5 + 0.5), mix(aUv.w, aUv.y, position.y * 0.5 + 0.5));
          float wave = (g == int(uWave.x + 0.5)) ? uWave.w * exp(-pow((aStar.x - uWave.y) / uWave.z, 2.0)) : 0.0;
          vColor = mix(aColor.rgb, aNeon, uNeon) * p.w * (1.0 + wave) * big / (k * k);
          vFade = min(1.0, p.w) * big / (k * k);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        uniform float uOpacity;
        uniform float uTube;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          float m = texture2D(atlas, vUv).r;
          float aa = max(fwidth(m), 1e-4) * 0.7;
          float a = smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, m);
          // A tube: only a band round the glyph's edge.
          float band = 1.0 - smoothstep(0.035 - aa, 0.035 + aa, abs(m - ${SDF_EDGE.toFixed(4)}));
          a = mix(a, band, uTube);
          if (a < 0.003) discard;
          #ifdef DARK
            gl_FragColor = vec4(vColor / max(vFade, 1e-4), a * uOpacity * vFade);
          #else
            gl_FragColor = vec4(vColor * a, a);
          #endif
        }`,
      defines: dark ? { DARK: '' } : {},
      blending: dark ? THREE.NormalBlending : THREE.AdditiveBlending,
      premultipliedAlpha: !dark,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
  }

  /** Sets every galaxy's placement (galaxies not given are hidden) and the camera's unit right and up. */
  place(placements: readonly GalaxyPlacement[], right: readonly [number, number, number], up: readonly [number, number, number]): void {
    const centre = this.material.uniforms.uCentre.value as THREE.Vector4[];
    const pose = this.material.uniforms.uPose.value as THREE.Vector4[];
    for (let g = 0; g < MAX_GALAXIES; g++) {
      const p = placements[g];
      if (!p) {
        pose[g].set(0, 0, 0, 0);
        continue;
      }
      centre[g].set(p.centre[0], p.centre[1], p.centre[2], p.radius);
      pose[g].set(p.tilt, p.heading, p.spin, p.light);
    }
    (this.material.uniforms.uRight.value as THREE.Vector3).set(...right);
    (this.material.uniforms.uUp.value as THREE.Vector3).set(...up);
  }

  /** How the stars are drawn (see GalaxyStyle). */
  style(s: GalaxyStyle): void {
    const u = this.material.uniforms;
    u.uMaxPx.value = s.maxPx;
    (u.uWave.value as THREE.Vector4).set(s.wave.galaxy, s.wave.front, Math.max(1e-3, s.wave.width), s.wave.gain);
    u.uFlat.value = s.flat;
    u.uNeon.value = s.neon;
    u.uTube.value = s.tube;
    u.uEm.value = s.em;
  }

  /** The viewport's height in device px and the camera's vertical field of view (degrees), for the minimum card size. */
  setViewport(heightPx: number, fov: number): void {
    this.material.uniforms.uPxScale.value = heightPx / (2 * Math.tan((fov * Math.PI) / 360));
    this.material.uniforms.uMinPx.value = 2.6 * (heightPx / 1080);
  }

  /** How many stars it holds. */
  get stars(): number {
    return this.count;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
