// T2 (spec §6) on the GPU: the Swiss scene renders live into one target and
// the Riso scene into another — live, S09's first sheet with its plates
// converging into register (bars 1–14: `register`), or once, its first frame,
// as v04's did; 144 cards in front of a backdrop of Riso ink show the first on
// their fronts and the second on their backs, and turn over along the diagonal
// (src/transitions/flip.ts). Near edge-on a card takes the ink too (v04: Swiss
// red behind; the colour law keeps red for the antivirus).
import * as THREE from 'three';
import { BUILD_THREADS } from '../content/build.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { type FrameContext, type Look, type Renderable, mixLook } from '../engine/types.ts';
import { FPS, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { CARDS, T2_EDGE, T2_INK, T2_SAMPLES, T2_SEGMENT, backsLive, cardCentre, flipAngle, t2Camera, turnedShare } from './flip.ts';

const CARD_VERT = /* glsl */ `
  attribute vec4 aCard;   // centre x, y, angle, -
  uniform float uCell;
  varying vec2 vLocal;    // -0.5 … 0.5 across the card as printed
  varying vec2 vCentre;
  varying float vShade;
  varying float vFacing;
  vec3 turn(vec3 v, vec3 k, float a) {
    return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
  }
  void main() {
    // Each card turns about its bottom-left → top-right diagonal, so the wave (top-left → bottom-right) tips it over.
    vec3 axis = normalize(vec3(1.0, 1.0, 0.0));
    vec3 p = turn(vec3(position.xy * uCell, 0.0), axis, aCard.z);
    vec3 n = turn(vec3(0.0, 0.0, 1.0), axis, aCard.z);
    vec4 mv = modelViewMatrix * vec4(aCard.xy + p.xy, p.z + 40.0 * sin(aCard.z), 1.0);
    gl_Position = projectionMatrix * mv;
    vLocal = position.xy;
    vCentre = aCard.xy;
    // Darker edge-on, a white glint as the card passes the light; exactly 1 lying flat either way up.
    vShade = 0.62 + 0.38 * abs(n.z) + 0.55 * exp(-pow((aCard.z - 1.1) / 0.2, 2.0));
    vFacing = abs(n.z);
  }`;

const CARD_FRAG = /* glsl */ `
  uniform sampler2D front;
  uniform sampler2D back;
  uniform float uCell;
  uniform vec3 uInk;
  uniform float uEdge;
  varying vec2 vLocal;
  varying vec2 vCentre;
  varying float vShade;
  varying float vFacing;
  void main() {
    // The back holds the card's piece mirrored across the turning axis, so it lands upright once turned over.
    vec2 q = gl_FrontFacing ? vLocal : vLocal.yx;
    vec2 uv = (vCentre + q * uCell) / vec2(1920.0, 1080.0) + 0.5;
    vec3 c = gl_FrontFacing ? texture2D(front, uv).rgb : texture2D(back, uv).rgb;
    // Near edge-on the card takes the Riso ink: fully edge-on, none once it faces the camera more than uEdge.
    gl_FragColor = vec4(mix(c * vShade, uInk, clamp(1.0 - vFacing / uEdge, 0.0, 1.0)), 1.0);
  }`;

export class TileFlip implements Renderable {
  private readonly front: Renderable;
  private readonly back: Renderable;
  private readonly backFrame: number;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 20000);
  private readonly owned: { dispose(): void }[] = [];
  private frontTarget: THREE.WebGLRenderTarget | null = null;
  private backTarget: THREE.WebGLRenderTarget | null = null;
  private cards: THREE.InstancedBufferAttribute | null = null;
  private backDrawn = false;

  /** `front` renders live; `back` live too while its plates converge (backsLive), else once, at `backFrame`. */
  constructor(front: Renderable, back: Renderable, backFrame: number) {
    this.front = front;
    this.back = back;
    this.backFrame = backFrame;
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await Promise.all([this.front.init(gl, size), this.back.init(gl, size)]);
    this.frontTarget = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.backTarget = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    const backdrop = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Vector3(...T2_INK) } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: 'uniform vec3 color; void main() { gl_FragColor = vec4(color, 1.0); }',
        depthTest: false,
        depthWrite: false,
      }),
    );
    backdrop.mesh.renderOrder = -1;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.instanceCount = CARDS.cols * CARDS.rows;
    this.cards = new THREE.InstancedBufferAttribute(new Float32Array(geo.instanceCount * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCard', this.cards);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        front: { value: this.frontTarget.texture },
        back: { value: this.backTarget.texture },
        uCell: { value: CARDS.size },
        uInk: { value: new THREE.Vector3(...T2_INK) },
        uEdge: { value: T2_EDGE },
      },
      vertexShader: CARD_VERT,
      fragmentShader: CARD_FRAG,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    this.scene.add(backdrop.mesh, mesh);
    this.camera.aspect = size.width / size.height;
    this.camera.position.set(0, 0, FRONT);
    this.camera.updateProjectionMatrix();
    base.dispose();
    this.owned.push(this.frontTarget, this.backTarget, backdrop, geo, material);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.front.render(gl, ctx, this.frontTarget!);
    if (backsLive(BUILD_THREADS)) {
      // The backs at this instant: S09's first sheet, its plates converging on the fill (src/shots/riso.ts s09PreRoll).
      this.back.render(gl, ctx, this.backTarget!);
    } else if (!this.backDrawn) {
      // S09's first frame is the same for every sub-frame of T2: draw it once.
      this.back.render(gl, { ...ctx, frame: this.backFrame, cam: this.backFrame, t: this.backFrame / FPS, beat: this.backFrame / FRAMES_PER_BEAT }, this.backTarget!);
      this.backDrawn = true;
    }
    const a = this.cards!.array as Float32Array;
    for (let row = 0; row < CARDS.rows; row++) {
      for (let col = 0; col < CARDS.cols; col++) {
        const i = 4 * (row * CARDS.cols + col);
        const [x, y] = cardCentre(col, row);
        a[i] = x;
        a[i + 1] = y;
        a[i + 2] = flipAngle(ctx.frame, col, row);
        a[i + 3] = 0;
      }
    }
    this.cards!.needsUpdate = true;
    this.camera.position.set(...t2Camera(ctx.cam).position);
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  /** The Swiss finishing turns into the Riso one as the cards turn, so riso 1.1 (the Riso scene itself) follows on without a jump. */
  look(frame: number): Look {
    return mixLook(this.front.look(frame), this.back.look(this.backFrame), turnedShare(frame));
  }

  temporal(): Temporal {
    return { samples: T2_SAMPLES, shutter: 0.5, persistence: 0 };
  }

  segment(): Segment {
    return T2_SEGMENT;
  }

  dispose(): void {
    this.front.dispose();
    this.back.dispose();
    for (const o of this.owned) o.dispose();
  }
}
