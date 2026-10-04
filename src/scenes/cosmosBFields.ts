// Renderer B's own GPU field (cosmos 3–4; build sheet notes/bcos/sheet.md §10): SegField, light drawn as tapered capsules in screen
// space — the spirograph's trails through the past camera, the orbits, the corona's rays, the cursors, the glints and sparks, the paste
// flare's starburst and streak, the shock ring's dots, the arms' neon spines and the quasar's jets. Each segment runs from (x0, y0) to
// (x1, y1) in 1080p px from the frame centre (y up, the flat world's units), half-widths w0 → w1, and glows with a white-hot core inside a
// soft halo (two gaussians across it); a segment with no length is a round dot. Added as light; drawn without a camera (its own
// clip-space mapping), so it sits exactly where the pure code projected it.
import * as THREE from 'three';
import type { RGB } from '../engine/color.ts';

/** How a segment burns across its width: the core's share of the half-width and the halo's gain. */
export type SegStyle = { core: number; halo: number };

export class SegField {
  readonly mesh: THREE.Mesh;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly capacity: number;
  private readonly geo: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly a: THREE.InstancedBufferAttribute;
  private readonly b: THREE.InstancedBufferAttribute;
  private readonly c: THREE.InstancedBufferAttribute;
  private n = 0;

  constructor(capacity: number, style: SegStyle = { core: 0.32, halo: 0.3 }) {
    this.capacity = capacity;
    const base = new THREE.PlaneGeometry(2, 2);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    const attr = () => new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.a = attr();
    this.b = attr();
    this.c = attr();
    this.geo.setAttribute('aA', this.a); // x0, y0, x1, y1 (1080p px, centred, y up)
    this.geo.setAttribute('aB', this.b); // w0, w1 (half-widths, px), unused, unused
    this.geo.setAttribute('aC', this.c); // linear rgb × intensity, alpha
    this.geo.instanceCount = 0;
    base.dispose();
    this.material = new THREE.ShaderMaterial({
      uniforms: { uCore: { value: style.core }, uHalo: { value: style.halo } },
      vertexShader: /* glsl */ `
        attribute vec4 aA;
        attribute vec4 aB;
        attribute vec4 aC;
        varying vec2 vS;     // along (px from the start), across (px)
        varying vec3 vL;     // length, w0, w1
        varying vec4 vColor;
        void main() {
          vec2 p0 = aA.xy;
          vec2 p1 = aA.zw;
          vec2 d = p1 - p0;
          float l = length(d);
          vec2 u = l > 1e-4 ? d / l : vec2(1.0, 0.0);
          vec2 n = vec2(-u.y, u.x);
          // The quad runs 1.5 half-widths past each end (the round caps) and to each side, so an HDR light's halo fades out inside it
          // (the fragment's window) instead of being cut square by its edge.
          float w = 1.5 * max(aB.x, aB.y);
          float s = mix(-w, l + w, position.x * 0.5 + 0.5);
          float t = position.y * w;
          vec2 p = p0 + u * s + n * t;
          gl_Position = vec4(p.x / 960.0, p.y / 540.0, 0.0, 1.0);
          vS = vec2(s, t);
          vL = vec3(l, aB.x, aB.y);
          vColor = aC;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uCore;
        uniform float uHalo;
        varying vec2 vS;
        varying vec3 vL;
        varying vec4 vColor;
        void main() {
          float l = vL.x;
          float c = clamp(vS.x / max(l, 1e-4), 0.0, 1.0);
          float w = max(mix(vL.y, vL.z, c), 1e-3);
          float d = length(vec2(vS.x - c * l, vS.y)) / w;
          float i = exp(-d * d / (uCore * uCore)) + uHalo * exp(-2.2 * d * d);
          // A window to 0 at 1.5 half-widths (the quad's reach): a light far above 1 stays round, never a square.
          i *= vColor.a * (1.0 - smoothstep(1.1, 1.5, d));
          if (i < 0.002) discard;
          gl_FragColor = vec4(vColor.rgb * i, i);
        }`,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Empties the field (call before each sub-frame's pushes). */
  begin(): void {
    this.n = 0;
  }

  get count(): number {
    return this.n;
  }

  /** A segment (or a dot, x0 = x1 and y0 = y1) of light `color` × `a`. Silently dropped past capacity (logged once). */
  push(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, color: RGB, a = 1): void {
    if (this.n >= this.capacity) {
      if (this.n === this.capacity) console.warn(`kxb: SegField full (${this.capacity})`);
      this.n++;
      return;
    }
    if (!(a > 0.001) || !(Math.max(w0, w1) > 0.05)) return;
    const k = 4 * this.n++;
    const A = this.a.array as Float32Array;
    const B = this.b.array as Float32Array;
    const C = this.c.array as Float32Array;
    A[k] = x0;
    A[k + 1] = y0;
    A[k + 2] = x1;
    A[k + 3] = y1;
    B[k] = w0;
    B[k + 1] = w1;
    C[k] = color[0];
    C[k + 1] = color[1];
    C[k + 2] = color[2];
    C[k + 3] = a;
  }

  /** A dot of light. */
  dot(x: number, y: number, r: number, color: RGB, a = 1): void {
    this.push(x, y, x, y, r, r, color, a);
  }

  /** Uploads what was pushed (only the used part) and draws it into `target` (never clears). */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget): void {
    const n = Math.min(this.n, this.capacity);
    this.geo.instanceCount = n;
    if (n === 0) return;
    for (const at of [this.a, this.b, this.c]) {
      at.clearUpdateRanges();
      at.addUpdateRange(0, 4 * n);
      at.needsUpdate = true;
    }
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}
