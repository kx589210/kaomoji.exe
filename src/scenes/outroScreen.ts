// The ending's screen on the GPU (builder O · OUTRO; build sheet notes/d2build/sheet.md §5.13, §9 H6): a scene-owned pass that
// takes a part's picture (drawn into `pic` in the aperture's own space) and puts on the frame only what the screen still shows —
// the whole picture, the picture squeezed about y 540 and burning toward white-hot, the white-hot line dipped into his ω, or the
// picture inside the lens with its rim and the rim's chase (the button's spark, round 2) — evaluating the curves of src/shots/outroScreen.ts (screenAt) from the
// same GLSL. It also draws the terminal's glass (the intro's dark ground and phosphor haze) as the picture's ground. OutroLog and
// OutroLens each own one. The CRT's curvature and scanlines stay the look's (post/crt.ts is the lead's).
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { CHASE_SPARK, LIDS_GLSL, OMEGA_GLSL, type ScreenState } from '../shots/outroScreen.ts';
import { PALETTE } from '../worlds/terminal.ts';

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D uPic;
  uniform float uMode;
  uniform float uSy;
  uniform float uGain;
  uniform float uWhite;
  uniform float uEdge;
  uniform float uW;
  uniform float uH;
  uniform float uDipU;
  uniform float uDipL;
  uniform float uZoom;
  uniform float uLift;
  uniform float uChase;
  uniform float uRim;
  uniform float uPx;
  uniform float uHasPic;
  uniform vec3 uCore;
  uniform vec3 uGlow;
  varying vec2 vUv;
  ${OMEGA_GLSL}
  ${LIDS_GLSL}
  vec3 pic(vec2 q) { return texture2D(uPic, vec2(q.x / 1920.0, 1.0 - q.y / 1080.0)).rgb; }
  void main() {
    // Layout px, y down.
    vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    vec3 col = vec3(0.0);
    if (uMode < 0.5) {
      // The picture, squeezed about y 540 to uSy of its height, its edge anti-aliased; burning toward white-hot as it closes.
      float half_ = 540.0 * uSy;
      float d = abs(p.y - 540.0);
      float inside = 1.0 - smoothstep(half_ - 0.5 * uPx, half_ + 0.5 * uPx, d);
      vec2 q = vec2(p.x, 540.0 + (p.y - 540.0) / max(uSy, 1e-4));
      col = (pic(q) * uGain + uCore * uWhite) * inside;
      // The closing edges glow as the beam's energy piles into fewer lines.
      float rd = abs(d - half_);
      col += (uCore * (1.0 - smoothstep(0.5, 1.5, rd)) * 1.2 + uGlow * (0.5 * exp(-rd / 4.0) + 0.12 * exp(-rd / 20.0))) * uEdge;
    } else {
      // The lens (h 0 = the line): two lids, the aperture scaled by uZoom about (960, 540), then floated down by uLift.
      vec2 q = vec2(960.0, 540.0) + (p - vec2(960.0, 540.0 + uLift)) / uZoom;
      float dx = q.x - 960.0;
      float e = 0.75;
      float yu = upperLid(uW, uH, uDipU, dx);
      float yl = lowerLid(uW, uH, uDipL, dx);
      float su = (upperLid(uW, uH, uDipU, dx + e) - upperLid(uW, uH, uDipU, dx - e)) / (2.0 * e);
      float sl = (lowerLid(uW, uH, uDipL, dx + e) - lowerLid(uW, uH, uDipL, dx - e)) / (2.0 * e);
      float du = (q.y - yu) / sqrt(1.0 + su * su);
      float dl = (yl - q.y) / sqrt(1.0 + sl * sl);
      float tip = 0.5 * uW - abs(dx);
      float aa = uPx / uZoom;
      float inside = smoothstep(-0.5 * aa, 0.5 * aa, min(min(du, dl), tip));
      if (uHasPic > 0.5) col = pic(q) * inside;
      // The rim: a 2 px white-hot core and a mint glow, measured to the nearer lid (past the tips, to the tip itself).
      float rd = abs(dx) <= 0.5 * uW ? min(abs(du), abs(dl)) : length(vec2(abs(dx) - 0.5 * uW, q.y - 540.0));
      rd *= uZoom;
      float core = 1.0 - smoothstep(1.0 - 0.5 * uPx, 1.0 + 0.5 * uPx, rd);
      float halo = 0.5 * exp(-rd / 5.0) + 0.16 * exp(-rd / 26.0);
      // The chase: a spark running once round the rim, clockwise from the top of the lid (CHASE_SPARK.start of the way from the left
      // tip: over the right tip, along the bottom, round the left tip, home), at an even speed along the rim (measured by x: the lids
      // are shallow arcs), with a short tail. It is bright from its first sub-frame
      // on outro 2.3& (RELEASE) and adds its light on top of the rim's (CHASE_SPARK), so over the silence — the rim dimmed to 40 % (uRim) — the head
      // runs at +80 % of the full rim, the only thing moving (round 2, SYNC2-02: an angle-paced head raced through the left tip
      // while it faded in, and scaling the rim's own light could not lift it above the full rim: a faint glint).
      float spark = 0.0;
      if (uChase >= 0.0) {
        float hw = 0.5 * uW;
        float xs = clamp(dx, -hw, hw);
        float along = abs(du) <= abs(dl) ? (xs + hw) / (2.0 * uW) : 0.5 + (hw - xs) / (2.0 * uW);
        float behind = fract(uChase + ${CHASE_SPARK.start.toFixed(3)} - along + 1.0) * 2.0 * uW;
        float d = min(behind, 2.0 * uW - behind);
        spark = max(exp(-d * d / ${(2 * CHASE_SPARK.sigma * CHASE_SPARK.sigma).toFixed(1)}), 0.5 * exp(-behind / ${CHASE_SPARK.tail.toFixed(1)}) * step(behind, ${(5 * CHASE_SPARK.tail).toFixed(1)}));
        spark *= smoothstep(1.0, 0.94, uChase);
      }
      col += (uCore * core * 1.6 + uGlow * halo * 0.8) * (uRim + ${CHASE_SPARK.gain.toFixed(3)} * spark);
      col += uGlow * spark * ${(CHASE_SPARK.gain * CHASE_SPARK.glow).toFixed(3)} * exp(-rd / ${CHASE_SPARK.glowPx.toFixed(1)});
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

const GLASS_FRAG = /* glsl */ `
  uniform vec3 base;
  uniform vec3 haze;
  uniform float pulse;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.0, 2.4);
    gl_FragColor = vec4(base + haze * pulse * exp(-dot(p, p) * 1.6), 1.0);
  }`;

/** The pass: build in init (device size), draw a part's picture into `pic`, then `draw` it through the aperture into the frame. */
export class OutroScreenPass {
  private picTarget: THREE.WebGLRenderTarget | null = null;
  private composite: FullscreenQuad | null = null;
  private glass: FullscreenQuad | null = null;
  private width = 1920;

  init(size: { width: number; height: number }): void {
    this.width = size.width;
    this.picTarget = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.picTarget.texture.minFilter = THREE.LinearFilter;
    this.picTarget.texture.magFilter = THREE.LinearFilter;
    const u = (value: unknown) => ({ value });
    this.composite = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: {
          uPic: u(this.picTarget.texture),
          uMode: u(0),
          uSy: u(1),
          uGain: u(1),
          uWhite: u(0),
          uEdge: u(0),
          uW: u(1920),
          uH: u(0),
          uDipU: u(0),
          uDipL: u(0),
          uZoom: u(1),
          uLift: u(0),
          uChase: u(-1),
          uRim: u(1),
          uPx: u(1),
          uHasPic: u(1),
          uCore: u(new THREE.Vector3(...linear('#FFFFFF'))),
          uGlow: u(new THREE.Vector3(...linear(PALETTE.text))),
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: COMPOSITE_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.glass = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { base: u(new THREE.Vector3(...linear(PALETTE.bg))), haze: u(new THREE.Vector3(...linear(PALETTE.green, 0.012))), pulse: u(1) },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: GLASS_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  /** The target a part draws its picture into (layout space of the aperture). */
  get pic(): THREE.WebGLRenderTarget {
    return this.picTarget!;
  }

  /** Clears `pic` to the terminal's glass: the dark ground with the intro's faint phosphor haze (`pulse` brightens it). */
  clearPic(gl: THREE.WebGLRenderer, pulse = 1): void {
    (this.glass!.mesh.material as THREE.ShaderMaterial).uniforms.pulse.value = pulse;
    this.glass!.render(gl, this.picTarget);
  }

  /** Puts what the screen shows (`s`) into `target`; `withPic` false draws only the line or rim (the picture is gone). */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, s: ScreenState, withPic: boolean): void {
    const m = (this.composite!.mesh.material as THREE.ShaderMaterial).uniforms;
    m.uMode.value = s.mode === 'picture' ? 0 : 1;
    m.uSy.value = s.sy;
    m.uGain.value = s.gain;
    m.uWhite.value = s.white;
    m.uEdge.value = s.edge;
    m.uW.value = s.w;
    m.uH.value = s.h;
    m.uDipU.value = s.dipU;
    m.uDipL.value = s.dipL;
    m.uZoom.value = s.zoom;
    m.uLift.value = s.lift;
    m.uChase.value = s.chase;
    m.uRim.value = s.rim;
    m.uPx.value = 1920 / this.width;
    m.uHasPic.value = withPic ? 1 : 0;
    const auto = gl.autoClear;
    gl.autoClear = false;
    this.composite!.render(gl, target);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.picTarget?.dispose();
    this.composite?.dispose();
    this.glass?.dispose();
  }
}
