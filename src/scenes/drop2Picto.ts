// S31P PICTOGRAMS, drop2 15.1–16.1 − 1 (2D, a 3D hinge on its last 8th), layer 4/5 pictograms.svg (builder act2b; build sheet
// notes/bid2/drop2-sheet2.md §3.15, §4.12, from the design notes/extend/drop2-final.md): touché re-infects Defender; the flop
// while the world rolls in 45° snaps; the contact sheet; the tiles hinge into mirrors.
// The pure picture is src/shots/drop2Picto.ts. This class draws it: the track and the sheet as flat content (one FlatLayer); the hinge as
// the sheet's eight outer tiles rendered into a half-float target and mapped onto eight quads that swing up toward a perspective camera
// (FOV 20, the flat world's own camera, so the walls and the flat centre tile agree), over the centre tile and its gathering light.
// Constructible in Node (no GL before init). Tests: tests/drop2Picto.test.ts.
import * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { type InkBox, PICTO_INK, PICTO_STRINGS, type PictoFont, type PictoLayout, inkKey, pictoFrame, pictoLook, pictoSegment, pictoTemporal, tubeWhite } from '../shots/drop2Picto.ts';
import type { ScenePart } from './drop2Stub.ts';

const FOV = 20;
const FRONT = fillDistance(1080, FOV);
const SCREEN = frontal(FRONT, 0, 0, FOV);
/** The pictograms' fonts by atlas (the Memphis grid snap builds the same atlases: src/scenes/drop2Memphis.ts). */
export const FONTS: Readonly<Record<PictoFont, (px: number) => string>> = {
  rounded: (px) => `800 ${px}px ${cssStack('rounded')}`,
  jp: (px) => `900 ${px}px ${cssStack('jp')}`,
  display: (px) => `700 ${px}px ${cssStack('display')}`,
};
export const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
export const advanceOf =
  (atlas: GlyphAtlas): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? 0.3;
/** A string's ink box at 1 em (textBaseline middle, from its start), measured in the browser. */
export function measureInk(font: (px: number) => string, text: string): InkBox {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is unavailable');
  g.font = font(200);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const m = g.measureText(text);
  return { left: -m.actualBoundingBoxLeft / 200, right: m.actualBoundingBoxRight / 200, up: m.actualBoundingBoxAscent / 200, down: m.actualBoundingBoxDescent / 200 };
}

const WALL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vZ;
  void main() {
    vUv = uv;
    vZ = position.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
// The tiles are the mirrors: their pictures, brightening toward the tube's end (z 0), where the light gathers.
const WALL_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float light;
  uniform float reach;
  varying vec2 vUv;
  varying float vZ;
  void main() {
    vec3 c = texture2D(map, vUv).rgb;
    float end = 1.0 - clamp(vZ / reach, 0.0, 1.0);
    vec3 lit = c * (0.62 + 0.38 * end) + vec3(1.0, 0.97, 0.9) * light * (0.35 + 0.65 * end);
    gl_FragColor = vec4(lit, 1.0);
  }`;

export class Drop2Picto implements ScenePart {
  private flat: FlatLayer | null = null;
  private glow: FlatLayer | null = null;
  private layout: PictoLayout | null = null;
  private sheet: THREE.WebGLRenderTarget | null = null;
  private readonly walls = new THREE.Scene();
  private camera: THREE.PerspectiveCamera | null = null;
  private wallGeo: THREE.BufferGeometry | null = null;
  private wallMat: THREE.ShaderMaterial | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.flat) return;
    await loadFonts();
    const rounded = buildGlyphAtlas(chars([...PICTO_STRINGS.rounded, 'ω']), FONTS.rounded, { fontPx: 160, radius: 20, size: 2048 });
    const display = buildGlyphAtlas(chars(PICTO_STRINGS.display), FONTS.display, { fontPx: 96, radius: 12, size: 512 });
    const aspect = size.width / size.height;
    this.flat = new FlatLayer({ atlases: { rounded, display }, blend: 'normal', aspect, shapes: 4096, glyphs: 512 });
    this.glow = new FlatLayer({ atlases: {}, blend: 'add', aspect, shapes: 16 });
    const ink = new Map<string, InkBox>();
    for (const [font, text] of PICTO_INK) ink.set(inkKey(font, text), measureInk(FONTS[font], text));
    this.layout = { advance: { rounded: advanceOf(rounded), jp: () => 1, display: advanceOf(display) }, ink };
    this.sheet = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, 1, 60000);
    // Eight quads (4 corners each, 2 triangles), corners rewritten every sub-frame.
    this.wallGeo = new THREE.BufferGeometry();
    this.wallGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.wallGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8 * 4 * 2), 2));
    const index: number[] = [];
    for (let i = 0; i < 8; i++) index.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
    this.wallGeo.setIndex(index);
    this.wallMat = new THREE.ShaderMaterial({ uniforms: { map: { value: this.sheet.texture }, light: { value: 0 }, reach: { value: 1500 } }, vertexShader: WALL_VERT, fragmentShader: WALL_FRAG, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.wallGeo, this.wallMat);
    mesh.frustumCulled = false;
    this.walls.add(mesh);
    this.owned.push(rounded.texture, display.texture, this.flat, this.glow, this.sheet, this.wallGeo, this.wallMat);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const p = pictoFrame(f, this.layout!);
    if (p.mode === 'track') {
      this.flat!.draw(gl, target, SCREEN, p.content, { color: p.ground, grain: 0 });
      return;
    }
    const pose = { position: p.camera.position, target: p.camera.target, up: [0, 1, 0] as const, fov: p.camera.fov };
    if (p.mode === 'sheet') {
      this.flat!.draw(gl, target, pose, p.content, { color: p.ground, grain: 0 });
      return;
    }
    // The hinge: the outer tiles into the sheet target; the centre tile and its light; the walls over them.
    this.flat!.draw(gl, this.sheet!, SCREEN, p.sheet, { color: linear('#F4F1EA'), grain: 0 });
    this.flat!.draw(gl, target, pose, p.centre, { color: p.ground, grain: 0 });
    this.glow!.draw(gl, target, pose, p.glow, null);
    const pos = this.wallGeo!.getAttribute('position') as THREE.BufferAttribute;
    const uv = this.wallGeo!.getAttribute('uv') as THREE.BufferAttribute;
    p.walls.forEach((w, i) => {
      w.corners.forEach((c, k) => pos.setXYZ(4 * i + k, c[0], c[1], c[2]));
      const [u0, v0, u1, v1] = w.uv;
      uv.setXY(4 * i, u0, v0);
      uv.setXY(4 * i + 1, u1, v0);
      uv.setXY(4 * i + 2, u1, v1);
      uv.setXY(4 * i + 3, u0, v1);
    });
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    this.wallMat!.uniforms.light.value = p.light;
    const cam = this.camera!;
    cam.position.set(...pose.position);
    cam.up.set(...pose.up);
    cam.lookAt(...pose.target);
    cam.fov = pose.fov;
    cam.updateProjectionMatrix();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clear(false, true, false);
    gl.render(this.walls, cam);
    gl.autoClear = auto;
    // The light filling the frame toward 16.1 (over the walls too).
    const l = p.light ** 2;
    this.glow!.draw(gl, target, SCREEN, { under: [{ kind: 'ellipse', x: 0, y: 0, w: 2800, h: 2000, color: [l * 0.85, l * 0.83, l * 0.78], soft: 1200 }], glyphs: {}, over: [] }, null);
    // Its last half-frame is the kaleidoscope's light itself (struck half a shutter early), opaque: the white chamber with its light over it
    // (src/shots/drop2Kaleido.ts chamberAt and overAt at 16.1: ≈ 1 + 1 + 0.6 in the linear HDR sum), so 16.1's whole shutter is the light.
    const w = tubeWhite(ctx.frame);
    if (w > 0) this.flat!.draw(gl, target, SCREEN, { under: [{ kind: 'rect', x: 0, y: 0, w: 2200, h: 1300, color: [2.6, 2.575, 2.49], alpha: w }], glyphs: {}, over: [] }, null);
  }

  look(frame: number): Look {
    return pictoLook(frame);
  }

  temporal(frame: number): Temporal {
    return pictoTemporal(frame);
  }

  segment(frame: number): Segment {
    return pictoSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.flat = this.glow = null;
    this.sheet = null;
  }
}
