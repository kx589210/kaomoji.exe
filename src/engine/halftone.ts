// S11's halftone field (spec §7: 满屏半调网点，网点的大小在负形里组成一张颜文字脸):
// two ink screens (pink and blue, at their own angles) of round dots whose
// size comes from a face mask; where the face is the dots vanish, so the face
// shows as bare paper. The plane multiplies onto the paper like any Riso ink.
import * as THREE from 'three';
import type { RGB } from './color.ts';
import { blendMode } from './shapeField.ts';

/** z of the plane, which mask channel shows (weights), the dot scale (1 = dots just touching), and each ink's shift in px. */
export type HalftoneState = { z: number; faces: readonly [number, number, number, number]; scale: number; shift: Readonly<Record<'pink' | 'blue', readonly [number, number]>> };

/** Coverage masks of up to four strings, one per RGBA channel, each drawn centred on an area `cover` times the 1920 × 1080 frame (at half resolution) and blurred, so a face larger than the frame bleeds off it instead of being cut by the mask's edge. Browser only. */
export function faceMasks(texts: readonly string[], font: (px: number) => string, px = 300, blur = 6, cover = 1): THREE.DataTexture {
  const w = Math.round(960 * cover);
  const h = Math.round(540 * cover);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const data = new Uint8Array(w * h * 4);
  texts.slice(0, 4).forEach((text, k) => {
    ctx.clearRect(0, 0, w, h);
    ctx.filter = `blur(${blur / 2}px)`;
    ctx.font = font(px / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, w / 2, h / 2);
    const a = ctx.getImageData(0, 0, w, h).data;
    // Canvas rows run top-down, texture rows bottom-up.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[((h - 1 - y) * w + x) * 4 + k] = a[(y * w + x) * 4 + 3];
  });
  // Clear the border: the texture clamps to its edge, and a face touching it would smear across the whole plane.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) data.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 4);
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

const HALFTONE_FRAG = /* glsl */ `
  uniform sampler2D mask;
  uniform vec4 uFace;
  uniform float uPitch;
  uniform vec2 uAngle;
  uniform vec3 uInkA;
  uniform vec3 uInkB;
  uniform float uScale;
  uniform vec2 uShiftA;
  uniform vec2 uShiftB;
  uniform float uCover;
  varying vec2 vPlane;
  // Coverage of one ink's dot screen at plane point p: the dot of p's cell has a radius set by the mask at the cell's centre.
  float dots(vec2 p, float angle, vec2 shift) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 g = mat2(c, -s, s, c) * (p - shift) / uPitch;
    vec2 cell = floor(g) + 0.5;
    vec2 centre = mat2(c, s, -s, c) * (cell * uPitch) + shift;
    float face = dot(texture2D(mask, centre / (vec2(1920.0, 1080.0) * uCover) + 0.5), uFace);
    float r = 0.5 * uScale * (1.0 - face);
    float d = (length(g - cell) - r) * uPitch;
    float aa = max(fwidth(d), 1e-4) * 0.7;
    return 1.0 - smoothstep(-aa, aa, d);
  }
  void main() {
    vec3 t = mix(vec3(1.0), uInkA, dots(vPlane, uAngle.x, uShiftA)) * mix(vec3(1.0), uInkB, dots(vPlane, uAngle.y, uShiftB));
    gl_FragColor = vec4(t, 1.0);
  }`;

/** The halftone field as a plane `extent` times the frame, facing +z; it multiplies what is behind it by its inks. */
export class HalftonePlane {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(o: { mask: THREE.Texture; pitch: number; angles: readonly [number, number]; inks: readonly [RGB, RGB]; extent: number; cover?: number }) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        mask: { value: o.mask },
        uFace: { value: new THREE.Vector4(1, 0, 0, 0) },
        uPitch: { value: o.pitch },
        uAngle: { value: new THREE.Vector2(o.angles[0], o.angles[1]) },
        uInkA: { value: new THREE.Vector3(...o.inks[0]) },
        uInkB: { value: new THREE.Vector3(...o.inks[1]) },
        uScale: { value: 0.8 },
        uShiftA: { value: new THREE.Vector2() },
        uShiftB: { value: new THREE.Vector2() },
        uCover: { value: o.cover ?? 1 },
      },
      vertexShader: 'varying vec2 vPlane; void main() { vPlane = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: HALFTONE_FRAG,
      ...blendMode('multiply'),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1920 * o.extent, 1080 * o.extent), this.material);
    this.mesh.frustumCulled = false;
  }

  update(h: HalftoneState | null): void {
    this.mesh.visible = h !== null;
    if (!h) return;
    this.mesh.position.z = h.z;
    (this.material.uniforms.uFace.value as THREE.Vector4).set(h.faces[0], h.faces[1], h.faces[2], h.faces[3]);
    this.material.uniforms.uScale.value = h.scale;
    (this.material.uniforms.uShiftA.value as THREE.Vector2).set(h.shift.pink[0], h.shift.pink[1]);
    (this.material.uniforms.uShiftB.value as THREE.Vector2).set(h.shift.blue[0], h.shift.blue[1]);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
