import * as THREE from 'three';
import type { Pose } from './camera.ts';
import type { RGB } from './color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from './fullscreen.ts';
import { type Glyph, GlyphField } from './glyphField.ts';
import type { GlyphAtlas } from './glyphAtlas.ts';
import { type Blend, type Shape, ShapeField } from './shapeField.ts';

/** What a FlatLayer draws: shapes under the type, glyphs per atlas key, shapes over the type. */
export type FlatContent = {
  under: readonly Shape[];
  glyphs: Readonly<Record<string, readonly Glyph[]>>;
  over: readonly Shape[];
};

/** A paper background: its colour and how much fibre texture it shows. */
export type Paper = { color: RGB; grain: number };

// Paper fibre: value noise of an integer hash (PCG) on the logical pixel grid
// at two scales, mean-preserving, fixed to the screen.
const PAPER_FRAG = /* glsl */ `
  uniform vec3 color;
  uniform float grain;
  varying vec2 vUv;
  uint pcg(uint v) {
    uint state = v * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
  }
  float cell(vec2 i) {
    return float(pcg(uint(i.x) ^ pcg(uint(i.y)))) / 4294967295.0;
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(cell(i), cell(i + vec2(1.0, 0.0)), u.x), mix(cell(i + vec2(0.0, 1.0)), cell(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    vec2 p = vUv * vec2(1920.0, 1080.0);
    float n = 0.6 * noise(p / 2.5) + 0.4 * noise(p / 23.0 + 17.0) - 0.5;
    gl_FragColor = vec4(color * (1.0 + grain * n), 1.0);
  }`;

/**
 * Flat design on the GPU, crisp at any zoom: a paper background, SDF shapes
 * under the type, SDF type from one or more atlases, and shapes over the
 * type, seen through a perspective camera. It never clears the target, so a
 * second layer (an overlay) can draw over a first. `scene` can take more
 * objects; the built-in ones use renderOrder −1 (paper), 0 (under), 1… (one
 * per atlas, in the order given) and 9 (over).
 */
export class FlatLayer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly paper: FullscreenQuad;
  private readonly paperMaterial: THREE.ShaderMaterial;
  private readonly under: ShapeField;
  private readonly over: ShapeField;
  private readonly fields: [string, GlyphField][];

  constructor(o: { atlases: Readonly<Record<string, GlyphAtlas>>; blend: Blend; aspect: number; shapes?: number; glyphs?: number; circlePerEm?: number }) {
    this.camera = new THREE.PerspectiveCamera(20, o.aspect, 1, 60000);
    this.paperMaterial = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Vector3() }, grain: { value: 0 } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: PAPER_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.paper = new FullscreenQuad(this.paperMaterial);
    this.paper.mesh.renderOrder = -1;
    this.under = new ShapeField({ capacity: o.shapes ?? 2048, blend: o.blend });
    this.under.mesh.renderOrder = 0;
    this.fields = Object.entries(o.atlases).map(([key, atlas], i) => {
      const f = new GlyphField({ capacity: o.glyphs ?? 4096, atlas, blend: o.blend, circlePerEm: o.circlePerEm });
      f.mesh.renderOrder = 1 + i;
      return [key, f];
    });
    this.over = new ShapeField({ capacity: 512, blend: o.blend });
    this.over.mesh.renderOrder = 9;
    this.scene.add(this.paper.mesh, this.under.mesh, ...this.fields.map(([, f]) => f.mesh), this.over.mesh);
  }

  setNearFade(start: number, end: number): void {
    this.under.setNearFade(start, end);
    this.over.setNearFade(start, end);
    for (const [, f] of this.fields) f.setNearFade(start, end);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, pose: Pose, content: FlatContent, paper: Paper | null): void {
    this.paper.mesh.visible = paper !== null;
    if (paper) {
      (this.paperMaterial.uniforms.color.value as THREE.Vector3).set(...paper.color);
      this.paperMaterial.uniforms.grain.value = paper.grain;
    }
    const fill = (field: ShapeField, shapes: readonly Shape[]) => {
      shapes.forEach((s, i) => field.set(i, s));
      field.commit(shapes.length);
    };
    fill(this.under, content.under);
    fill(this.over, content.over);
    for (const [key, field] of this.fields) {
      const glyphs = content.glyphs[key] ?? [];
      glyphs.forEach((g, i) => field.set(i, g));
      field.commit(glyphs.length);
    }
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
    this.paper.dispose();
    this.under.dispose();
    this.over.dispose();
    for (const [, f] of this.fields) f.dispose();
  }
}
