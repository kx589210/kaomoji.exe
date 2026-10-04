// The ending's aperture on the GPU (build sheet notes/b58/ending-sheet.md §4, §7 E2–E4): one pass every part after the line
// uses (OutroMonitor, OutroIris, OutroCompany), so the two sides of each seam draw the same shape with the same function. A part draws
// its interior into `pic` (screen layout space), optionally the spots' worlds into two textures (plain and effect-processed) and a
// cached ghost, then `draw` puts on the frame only what the tube still shows: the trace and its head, the curl's window, the ring and
// its iris-out, the dot, the knocks' ripples, the pried-open iris with its spots, the burst — every rim lit like the v04 line (kept).
// The shapes and their GLSL are src/shots/outroAperture.ts's (pure, tested there).
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { APERTURE_GLSL, type ApertureState, GHOST_GLSL, MAX_SPOTS, apertureUniforms } from '../shots/outroAperture.ts';
import { OUTRO_HEX } from '../shots/outroShared.ts';

const FRAG = /* glsl */ `
  uniform sampler2D uPicTex;
  uniform sampler2D uSpotPlain;
  uniform sampler2D uSpotFx;
  uniform sampler2D uGhostTex;
  varying vec2 vUv;
  ${GHOST_GLSL}
  vec2 uvOf(vec2 q) { return vec2(q.x / 1920.0, 1.0 - q.y / 1080.0); }
  vec3 pic(vec2 q) { return texture2D(uPicTex, uvOf(q)).rgb; }
  vec3 spotPic(vec2 q, float fx) { return fx > 0.5 ? texture2D(uSpotFx, uvOf(q)).rgb : texture2D(uSpotPlain, uvOf(q)).rgb; }
  vec3 ghost(vec2 q) {
    vec2 uv = uvOf(q);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0);
    // A phosphor afterimage holds the bright strokes (the type, his face), never the blue ground it was drawn on.
    return phosphorOf(texture2D(uGhostTex, uv).rgb);
  }
  ${APERTURE_GLSL}
  void main() {
    vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    gl_FragColor = vec4(aperture(p), 1.0);
  }`;

const GROUND_FRAG = /* glsl */ `
  uniform vec3 base;
  uniform vec3 haze;
  uniform float pulse;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.0, 2.4);
    gl_FragColor = vec4(base + haze * pulse * exp(-dot(p, p) * 1.6), 1.0);
  }`;

const v3 = (hex: string, k = 1) => new THREE.Vector3(...linear(hex, k));
const target = (size: { width: number; height: number }) => {
  const t = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
  t.texture.minFilter = THREE.LinearFilter;
  t.texture.magFilter = THREE.LinearFilter;
  return t;
};

/** The pass: init at device size; clear and draw the interior into `pic`; `draw` the aperture onto the frame. */
export class OutroAperturePass {
  private picTarget: THREE.WebGLRenderTarget | null = null;
  private quad: FullscreenQuad | null = null;
  private ground: FullscreenQuad | null = null;
  private black: THREE.DataTexture | null = null;
  private width = 1920;

  init(size: { width: number; height: number }): void {
    this.width = size.width;
    this.picTarget = target(size);
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.black.needsUpdate = true;
    const u = (value: unknown) => ({ value });
    const spots = Array.from({ length: MAX_SPOTS }, () => new THREE.Vector4());
    const spotK = Array.from({ length: MAX_SPOTS }, () => new THREE.Vector4());
    this.quad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: {
          uPicTex: u(this.picTarget.texture),
          uSpotPlain: u(this.black),
          uSpotFx: u(this.black),
          uGhostTex: u(this.black),
          uMode: u(1),
          uInside: u(0),
          uPx: u(1),
          uLineY: u(540),
          uHalf: u(0),
          uPulse: u(-1e4),
          uDepth: u(0),
          uOmegaHalf: u(300),
          uHead: u(-1e4),
          uHeadSpeed: u(1),
          uHeadLight: u(0),
          uHeat: u(1),
          uOld: u(1),
          uHaloMint: u(1),
          uC: u(0),
          uCurl: u(new THREE.Vector4()),
          uFlatten: u(0),
          uRing: u(0),
          uDot: u(new THREE.Vector2()),
          uDotGlow: u(1),
          uRipples: u(new THREE.Vector4()),
          uTrailR: u(new THREE.Vector3()),
          uTrailA: u(new THREE.Vector3()),
          uIrisR: u(0),
          uDent: u(new THREE.Vector2()),
          uRim: u(new THREE.Vector2(3, 1)),
          uSpot: u(spots),
          uSpotK: u(spotK),
          uGhost: u(0),
          uZoom: u(1),
          uWhite: u(v3(OUTRO_HEX.white)),
          uMint: u(v3(OUTRO_HEX.mint)),
          uBand: u(v3(OUTRO_HEX.band)),
          uAmber: u(v3(OUTRO_HEX.amber, 1.5)),
          uRed: u(v3(OUTRO_HEX.red, 1.6)),
          uGreen: u(v3(OUTRO_HEX.green, 1.4)),
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.ground = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { base: u(v3(OUTRO_HEX.ground)), haze: u(v3(OUTRO_HEX.green, 0.012)), pulse: u(1) },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: GROUND_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  /** The interior's target (screen layout space). */
  get pic(): THREE.WebGLRenderTarget {
    return this.picTarget!;
  }

  /** Clears `into` (default: `pic`) to the terminal's glass: the dark ground with the intro's faint phosphor haze (`pulse` brightens it). */
  clearGlass(gl: THREE.WebGLRenderer, pulse = 1, into: THREE.WebGLRenderTarget | null = this.picTarget): void {
    (this.ground!.mesh.material as THREE.ShaderMaterial).uniforms.pulse.value = pulse;
    this.ground!.render(gl, into);
  }

  /** Puts what the tube shows (`s`) into `out`, reading the interior, the spots' textures and the ghost (black when absent). */
  draw(gl: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, s: ApertureState, tex: { spotPlain?: THREE.Texture; spotFx?: THREE.Texture; ghost?: THREE.Texture } = {}): void {
    const m = (this.quad!.mesh.material as THREE.ShaderMaterial).uniforms;
    m.uSpotPlain.value = tex.spotPlain ?? this.black;
    m.uSpotFx.value = tex.spotFx ?? this.black;
    m.uGhostTex.value = tex.ghost ?? this.black;
    m.uPx.value = 1920 / this.width;
    for (const [name, v] of Object.entries(apertureUniforms(s))) {
      const slot = m[name];
      if (typeof v === 'number') slot.value = v;
      else if (name === 'uSpot' || name === 'uSpotK') (slot.value as THREE.Vector4[]).forEach((vec, i) => vec.set(v[4 * i], v[4 * i + 1], v[4 * i + 2], v[4 * i + 3]));
      else (slot.value as THREE.Vector2 | THREE.Vector3 | THREE.Vector4).fromArray(v as number[]);
    }
    this.quad!.render(gl, out);
  }

  dispose(): void {
    this.picTarget?.dispose();
    this.quad?.dispose();
    this.ground?.dispose();
    this.black?.dispose();
  }
}
