// OutroBlue, outro 1.1 → 2.2 (film 5184–5303; E1 BLUE, the squeeze included): the ending's first part (build sheet
// notes/b58/ending-sheet.md §3.1, §3.2 rows 2.1 → 2.1a, §4, §5, §7 E1). The picture (src/shots/outroBlue.ts) is painted into the
// part's own target `pic` — the ground (the blue screen inside the burst's front, drop 2's dark glass outside it; WP6), then the paint
// layer (normal blend: the copy, the staged lines, the code, the bytes and his face with their navy shadows, the antivirus's marks) and
// the light layer (additive) under the push — and put on the frame through the aperture: whole until Enter, then squeezed into the
// white-hot line (src/shots/outroAperture.ts squeezeAt), the burst's ring of light added over it in screen space (WP6: the band's light
// running out of his spot on the front). From Enter the last word is lifted out of the picture and drawn over it in
// screen space, gliding to the centre where OutroMonitor holds it. OutroMonitor renders this part once at ENTER − 1 for its ghost.
import * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { linear } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { ENTER } from '../score/outro.ts';
import { FOV, FRONT_DISTANCE } from '../shots/intro.ts';
import { GHOST_GLSL, SQUEEZE_GLSL, ghostAlpha, squeezeAt } from '../shots/outroAperture.ts';
import { BURST, type BlueLayout, blueFrame, blueLook, blueSegment, blueTemporal, lastWordContent, lastWordPlace } from '../shots/outroBlue.ts';
import { OUTRO_HEX, SEAM_SPOT } from '../shots/outroShared.ts';
import { OutroLayers } from './outroKit.ts';
import type { OutroPart } from './outroStub.ts';

const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);
const v3 = (hex: string, k = 1) => new THREE.Vector3(...linear(hex, k));
/** SEAM_SPOT as the shaders read it: centre (layout px), the straight half-run, the half-height. */
const spotUniform = () => new THREE.Vector4(SEAM_SPOT.centre[0], SEAM_SPOT.centre[1], SEAM_SPOT.hw - SEAM_SPOT.hh, SEAM_SPOT.hh);
/** A front the shaders can hold: −∞ (nothing blue yet) and anything past the reach (all blue) as finite numbers. */
const finite = (front: number): number => Math.max(-1e4, Math.min(1e4, front));

/**
 * How far layout point p lies outside his spot (outroShared.ts SEAM_SPOT: centre, straight half-run, half-height): the burst's measure
 * (src/shots/outroBlue.ts seamSpotDistance, the same stadium).
 */
const SPOT_GLSL = /* glsl */ `
  uniform vec4 uSpot;
  float spotD(vec2 p) { return length(vec2(max(0.0, abs(p.x - uSpot.x) - uSpot.z), p.y - uSpot.y)) - uSpot.w; }`;

/** The ground: the blue screen (#1E4FD8, vignetting to #102A80) inside the burst's front, drop 2's dark glass (#0C0F0E) outside it. */
const GROUND_FRAG = /* glsl */ `
  uniform vec3 blue;
  uniform vec3 edge;
  uniform vec3 dark;
  uniform float front;
  varying vec2 vUv;
  ${SPOT_GLSL}
  void main() {
    vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    vec2 q = (vUv - 0.5) * vec2(1.7, 1.25);
    vec3 b = mix(blue, edge, smoothstep(0.25, 0.95, length(q)));
    gl_FragColor = vec4(mix(b, dark, smoothstep(front - 1.5, front + 1.5, spotD(p))), 1.0);
  }`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D uPic;
  uniform float uSy;
  uniform float uGain;
  uniform float uWhite;
  uniform float uEdge;
  uniform float uPx;
  uniform vec3 uCore;
  uniform vec3 uGlow;
  uniform float uGhost;
  uniform float uFront;
  uniform float uRing;
  uniform vec3 uRingInk;
  uniform vec2 uRingShape;
  varying vec2 vUv;
  vec3 pic(vec2 q) { return texture2D(uPic, vec2(q.x / 1920.0, 1.0 - q.y / 1080.0)).rgb; }
  ${SQUEEZE_GLSL}
  ${GHOST_GLSL}
  ${SPOT_GLSL}
  void main() {
    vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    vec3 col = squeezed(p, uSy, uGain, uWhite, uEdge, uPx, uCore, uGlow);
    // Round the squeezing band, the tube's phosphor still holds the last picture (the ghost OutroMonitor carries on under the line).
    float out_ = smoothstep(540.0 * uSy - 0.5 * uPx, 540.0 * uSy + 0.5 * uPx, abs(p.y - 540.0));
    col += phosphorOf(pic(p)) * uGlow * uGhost * out_;
    // WP6: the burst's rim, the band's light as a ring running out of his spot just inside the front (additive, over the picture).
    if (uRing > 0.0) {
      float r = (spotD(p) - uFront + uRingShape.y) / uRingShape.x;
      col += uRingInk * uRing * exp(-r * r);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export class OutroBlue implements OutroPart {
  private readonly kit = new OutroLayers(['mono', 'bold', 'rounded', 'display'], ['normal', 'add'], { shapes: 2048, glyphs: 8192 });
  private layout: BlueLayout | null = null;
  private picTarget: THREE.WebGLRenderTarget | null = null;
  private ground: FullscreenQuad | null = null;
  private composite: FullscreenQuad | null = null;
  private width = 1920;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await this.kit.init(size);
    this.layout = { mono: this.kit.advance('mono'), bold: this.kit.advance('bold'), rounded: this.kit.advance('rounded'), display: this.kit.advance('display') };
    this.width = size.width;
    this.picTarget = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.picTarget.texture.minFilter = THREE.LinearFilter;
    this.picTarget.texture.magFilter = THREE.LinearFilter;
    const u = (value: unknown) => ({ value });
    this.ground = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { blue: u(v3(OUTRO_HEX.blue)), edge: u(v3(OUTRO_HEX.blueEdge)), dark: u(v3(OUTRO_HEX.ground)), front: u(1e4), uSpot: u(spotUniform()) },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: GROUND_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.composite = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: {
          uPic: u(this.picTarget.texture), uSy: u(1), uGain: u(1), uWhite: u(0), uEdge: u(0), uPx: u(1), uCore: u(v3(OUTRO_HEX.white)), uGlow: u(v3(OUTRO_HEX.band)), uGhost: u(0),
          uSpot: u(spotUniform()), uFront: u(1e4), uRing: u(0), uRingInk: u(v3(OUTRO_HEX.band)), uRingShape: u(new THREE.Vector2(BURST.ring.width, BURST.ring.lead)),
        },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: COMPOSITE_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  /**
   * The picture alone at instant `frame` (unsqueezed, no screen-space last word), line 4 left out when `lifted`: OutroMonitor's ghost
   * is the frame ENTER − 1 with the last word already lifted out (it glows centred under the line, so the ghost must not hold a copy).
   */
  renderPicture(gl: THREE.WebGLRenderer, frame: number, target: THREE.WebGLRenderTarget, lifted: boolean): void {
    this.paint(gl, blueFrame(frame, this.layout!, { lifted }), target);
  }

  private paint(gl: THREE.WebGLRenderer, fr: ReturnType<typeof blueFrame>, pic: THREE.WebGLRenderTarget): void {
    (this.ground!.mesh.material as THREE.ShaderMaterial).uniforms.front.value = finite(fr.front);
    this.ground!.render(gl, pic);
    this.kit.layer('normal').draw(gl, pic, fr.pose, fr.paint, null);
    this.kit.layer('add').draw(gl, pic, fr.pose, fr.light, null);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const L = this.layout!;
    const fr = blueFrame(ctx.frame, L);
    const pic = this.picTarget!;
    this.paint(gl, fr, pic);
    const s = squeezeAt(ctx.frame);
    const m = (this.composite!.mesh.material as THREE.ShaderMaterial).uniforms;
    m.uSy.value = s.sy;
    m.uGain.value = s.gain;
    m.uWhite.value = s.white;
    m.uEdge.value = s.edge;
    m.uPx.value = 1920 / this.width;
    m.uGhost.value = ghostAlpha(ctx.frame);
    m.uFront.value = finite(fr.front);
    m.uRing.value = fr.ring;
    this.composite!.render(gl, target);
    // The last word: lifted out of the picture on Enter, drawn over the squeeze in screen space.
    if (ctx.frame >= ENTER - 0.25) {
      const w = lastWordContent(lastWordPlace(ctx.frame, L), 1, L);
      this.kit.layer('normal').draw(gl, target, SCREEN, { under: w.under, glyphs: { bold: w.glyphs }, over: [] }, null);
    }
  }

  look(frame: number): Look {
    return blueLook(frame);
  }

  temporal(frame: number): Temporal {
    return blueTemporal(frame);
  }

  segment(): Segment {
    return blueSegment();
  }

  dispose(): void {
    this.kit.dispose();
    this.picTarget?.dispose();
    this.ground?.dispose();
    this.composite?.dispose();
  }
}
