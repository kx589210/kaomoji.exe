// GPU helpers of the flat bars' v2 layers (src/scenes/breakFlat.ts draws them only when FLAT_V2): owned by the flat builder.
//   PolyField  filled polygons with an ink stroke (signed distance, crisp at any zoom; concave allowed, ≤ 12 corners), in the world or on
//              the screen: the antivirus's red cursor, the torn halves of its work orders (their jagged edges), their shadows;
//   PovPass    the antivirus's POV (break 3.3& → 3.4&): the frame above the scanline remapped to a cold mono X-ray — ink pale, paper dark,
//              the blocks grey by luminance, his amber near-white and his ω a white-hot core whose halo blooms — with a 2 % barrel and
//              rolling scanlines; below the scanline the frame is untouched (the scan-wipe, C2).
import * as THREE from 'three';
import type { Pose } from '../engine/camera.ts';
import type { RGB } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';

type V2 = readonly [number, number];
const MAX_CORNERS = 12;
/** A polygon to draw: its corners in its own frame, placed by `at` (translate), `rot` (degrees clockwise) and `scale` (x may flip); layout px. */
export type Poly = {
  pts: readonly V2[];
  at: V2;
  rot?: number;
  scale?: V2;
  fill: RGB;
  /** Ink stroke: `grow` px outside the edge and `line` px wide inside the grown edge (a centred 8 px stroke is grow 4, line 8). */
  line?: number;
  lineColor?: RGB;
  grow?: number;
  alpha?: number;
  z?: number;
};

const POLY_VERT = /* glsl */ `
uniform vec4 uBox;
uniform mat3 uM;
uniform float uZ;
varying vec2 vLocal;
void main() {
  vLocal = uBox.xy + position.xy * uBox.zw;
  vec2 w = (uM * vec3(vLocal, 1.0)).xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(w.x - 960.0, 540.0 - w.y, uZ, 1.0);
}`;
const POLY_FRAG = /* glsl */ `
uniform vec2 uV[${MAX_CORNERS}];
uniform float uN;
uniform vec3 uFill;
uniform vec3 uLine;
uniform float uGrow;
uniform float uLineW;
uniform float uAlpha;
varying vec2 vLocal;
float sdPoly(vec2 p) {
  int n = int(uN + 0.5);
  float d = dot(p - uV[0], p - uV[0]);
  float s = 1.0;
  vec2 vj = uV[0];
  for (int k = 0; k < ${MAX_CORNERS}; k++) { if (k == n - 1) vj = uV[k]; }
  for (int i = 0; i < ${MAX_CORNERS}; i++) {
    if (i >= n) break;
    vec2 vi = uV[i];
    vec2 e = vj - vi;
    vec2 w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / max(dot(e, e), 1e-6), 0.0, 1.0);
    d = min(d, dot(b, b));
    bool c1 = p.y >= vi.y;
    bool c2 = p.y < vj.y;
    bool c3 = e.x * w.y > e.y * w.x;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s *= -1.0;
    vj = vi;
  }
  return s * sqrt(d);
}
void main() {
  float d = sdPoly(vLocal) - uGrow;
  float aa = max(0.75 * length(fwidth(vLocal)), 1e-4);
  float cov = clamp(0.5 - d / aa, 0.0, 1.0);
  if (cov <= 0.0) discard;
  float inner = uLineW > 0.0 ? clamp(0.5 - (d + uLineW) / aa, 0.0, 1.0) : 1.0;
  gl_FragColor = vec4(mix(uLine, uFill, inner), 1.0) * (cov * uAlpha);
}`;
// Layout px (y down) map to engine units (y up), which mirrors every quad: draw both faces. Premultiplied alpha, as the flat world.
const premultiplied = { side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor } as const;

/** A pool of polygon quads drawn through a camera pose (the world's, or the frontal screen pose). */
export class PolyField {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(20, 16 / 9, 1, 60000);
  private readonly meshes: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial }[] = [];
  private readonly geo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);

  constructor(capacity: number, aspect: number) {
    this.camera.aspect = aspect;
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uBox: { value: new THREE.Vector4() },
          uM: { value: new THREE.Matrix3() },
          uZ: { value: 0 },
          uV: { value: Array.from({ length: MAX_CORNERS }, () => new THREE.Vector2()) },
          uN: { value: 0 },
          uFill: { value: new THREE.Vector3() },
          uLine: { value: new THREE.Vector3() },
          uGrow: { value: 0 },
          uLineW: { value: 0 },
          uAlpha: { value: 1 },
        },
        vertexShader: POLY_VERT,
        fragmentShader: POLY_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        ...premultiplied,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = i;
      this.scene.add(mesh);
      this.meshes.push({ mesh, mat });
    }
  }

  /** Draws `polys` in order (later over earlier) into `target`, through `pose`. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, pose: Pose, polys: readonly Poly[]): void {
    if (polys.length === 0) return;
    this.meshes.forEach(({ mesh, mat }, i) => {
      const p = polys[i];
      mesh.visible = p !== undefined;
      if (!p) return;
      const u = mat.uniforms;
      const n = Math.min(MAX_CORNERS, p.pts.length);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      const V = u.uV.value as THREE.Vector2[];
      for (let k = 0; k < n; k++) {
        const [x, y] = p.pts[k];
        V[k].set(x, y);
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      const m = (p.grow ?? 0) + 3;
      (u.uBox.value as THREE.Vector4).set(x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m);
      const a = ((p.rot ?? 0) * Math.PI) / 180;
      const [sx, sy] = p.scale ?? [1, 1];
      const c = Math.cos(a);
      const s = Math.sin(a);
      // layout' = T(at) · R(rot) · S(scale) · local (y down; clockwise positive).
      (u.uM.value as THREE.Matrix3).set(c * sx, -s * sy, p.at[0], s * sx, c * sy, p.at[1], 0, 0, 1);
      u.uZ.value = p.z ?? 0;
      u.uN.value = n;
      (u.uFill.value as THREE.Vector3).set(...p.fill);
      (u.uLine.value as THREE.Vector3).set(...(p.lineColor ?? p.fill));
      u.uGrow.value = p.grow ?? 0;
      u.uLineW.value = p.line ?? 0;
      u.uAlpha.value = p.alpha ?? 1;
    });
    this.camera.position.set(...pose.position);
    this.camera.up.set(...pose.up);
    this.camera.lookAt(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.geo.dispose();
    for (const { mat } of this.meshes) mat.dispose();
  }
}

const POV_FRAG = /* glsl */ `
uniform sampler2D uSrc;
uniform float uSweep;
uniform vec2 uOmega;
uniform float uFrame;
uniform vec3 uGround;
uniform vec3 uDark;
uniform vec3 uLight;
uniform vec3 uInk;
uniform vec3 uHero;
varying vec2 vUv;
vec3 xray(vec3 c, vec2 p) {
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float sat = (mx - mn) / max(mx, 1e-4);
  float gr = c.g / max(c.r, 1e-4);
  // His amber (linear ≈ (1, 0.45, 0.05)): saturated, green about half the red, bright red. Not the yellow (g/r 0.64), the coral (0.15), the red (0.07).
  float amber = smoothstep(0.30, 0.36, gr) * (1.0 - smoothstep(0.52, 0.58, gr)) * smoothstep(0.45, 0.6, c.r) * smoothstep(0.7, 0.85, sat);
  vec3 v = mix(uInk, mix(uDark, uLight, smoothstep(0.25, 0.75, L)), smoothstep(0.03, 0.10, L));
  v = mix(v, uGround, smoothstep(0.78, 0.86, L));
  v = mix(v, uHero, amber);
  // The ω: the virus's core, white hot (HDR, so the look's bloom haloes it) — the one thing the scanner cannot take out.
  float d = length(p - uOmega);
  v = mix(v, vec3(1.45), amber * (1.0 - smoothstep(120.0, 180.0, d)));
  return v;
}
void main() {
  vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  if (p.y > uSweep) { gl_FragColor = texture2D(uSrc, vUv); return; }
  vec2 q = (p - vec2(960.0, 540.0)) / vec2(960.0, 540.0);
  vec2 qs = q * (0.98 + 0.01 * dot(q, q));
  vec2 uv = vec2(0.5 + 0.5 * qs.x, 0.5 - 0.5 * qs.y);
  vec3 x = xray(texture2D(uSrc, uv).rgb, p);
  // Rolling scanlines: 2 px at 35 % black every 4 px, a pixel a frame.
  if (mod(floor(p.y + uFrame), 4.0) < 2.0) x *= 0.65;
  gl_FragColor = vec4(x, 1.0);
}`;

/** The POV's X-ray pass: `src` (the finished flat frame) → `target`, X-rayed above the scanline. */
export class PovPass {
  private readonly quad: FullscreenQuad;

  constructor(ramp: { ground: RGB; dark: RGB; light: RGB; ink: RGB; hero: RGB }) {
    this.quad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: {
          uSrc: { value: null },
          uSweep: { value: 1080 },
          uOmega: { value: new THREE.Vector2() },
          uFrame: { value: 0 },
          uGround: { value: new THREE.Vector3(...ramp.ground) },
          uDark: { value: new THREE.Vector3(...ramp.dark) },
          uLight: { value: new THREE.Vector3(...ramp.light) },
          uInk: { value: new THREE.Vector3(...ramp.ink) },
          uHero: { value: new THREE.Vector3(...ramp.hero) },
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: POV_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  render(gl: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, target: THREE.WebGLRenderTarget, o: { sweep: number; omega: V2; frame: number }): void {
    const u = (this.quad.mesh.material as THREE.ShaderMaterial).uniforms;
    u.uSrc.value = src.texture;
    u.uSweep.value = o.sweep;
    (u.uOmega.value as THREE.Vector2).set(o.omega[0], o.omega[1]);
    u.uFrame.value = o.frame;
    this.quad.render(gl, target);
  }

  dispose(): void {
    this.quad.dispose();
  }
}
