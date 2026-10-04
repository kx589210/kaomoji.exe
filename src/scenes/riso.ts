// The Riso world (the part 'riso', S09–S12) on the GPU: paper with fibre, and every
// shape and glyph printed with multiply blending, so overprints make third
// colours in any order. S09's and S10's sheets are stacks drawn back to front,
// each an opaque page (normal blend) with its inks multiplied over it; through
// S10's last mouth S11's halftone plane shows, drawn first with its own camera.
// S12's proof (bars 1–14, riso 4.1 … 4.1a) prints its face in S11's two screens
// through a mask of the face's glyphs, drawn first each frame.
// The shots are pure (src/shots/riso.ts).
import * as THREE from 'three';
import { HALFTONE_FACES, MOUTH_CHARS } from '../content/build.ts';
import { frontal } from '../engine/camera.ts';
import type { RGB } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas, counterKey } from '../engine/glyphAtlas.ts';
import { HalftonePlane, faceMasks } from '../engine/halftone.ts';
import { blendMode } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import {
  HALFTONE_EXTENT, MASK_COVER, MASK_PX, PRINT_PITCH, QUAD_PER_EM, RISO_ATLAS, type RisoLayout, type RisoPrint, SUN_CIRCLE_PER_EM, risoFrame, risoSegment, risoTemporal,
} from '../shots/riso.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { PAPER, PAPER_GRAIN, PLATE, SCREEN, risoLook } from '../worlds/riso.ts';
import { advanceOf } from './swiss.ts';

/** The proof's mask covers this many times the frame (world units at z 0), centred on the plane's origin: S12's face never leaves it. */
const PRINT_MASK_K = 1.25;
/** The proof's plane: this many times the frame, wide enough for every view of S12 while it prints. */
const PRINT_EXTENT = 1.6;

// The proof: S11's two screens (its pitch and angles), but positive — each cell's dot is as big as the print's coverage where the mask's
// channel (red: the pink screen, green: the blue) says the face is, read a little softened at the cell's centre, as S11's blurred masks
// are. Each screen and its image move together by the plate's shift (its misregistration).
const PRINT_FRAG = /* glsl */ `
  uniform sampler2D mask;
  uniform vec2 uMaskSize;
  uniform float uPitch;
  uniform vec2 uAngle;
  uniform vec3 uInkA;
  uniform vec3 uInkB;
  uniform float uCover;
  uniform vec2 uShiftA;
  uniform vec2 uShiftB;
  varying vec2 vPlane;
  float face(vec2 p, vec4 channel) {
    float s = 0.0;
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        float w = (2.0 - abs(float(i))) * (2.0 - abs(float(j)));
        s += w * dot(texture2D(mask, (p + 5.0 * vec2(float(i), float(j))) / uMaskSize + 0.5), channel);
      }
    }
    return s / 16.0;
  }
  float dots(vec2 p, float angle, vec2 shift, vec4 channel) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 g = mat2(c, -s, s, c) * (p - shift) / uPitch;
    vec2 cell = floor(g) + 0.5;
    vec2 centre = mat2(c, s, -s, c) * (cell * uPitch) + shift;
    float area = uCover * face(centre - shift, channel);
    if (area < 1e-4) return 0.0;
    float r = sqrt(area / 3.14159265);
    float d = (length(g - cell) - r) * uPitch;
    float aa = max(fwidth(d), 1e-4) * 0.7;
    return 1.0 - smoothstep(-aa, aa, d);
  }
  void main() {
    vec3 t = mix(vec3(1.0), uInkA, dots(vPlane, uAngle.x, uShiftA, vec4(1.0, 0.0, 0.0, 0.0))) * mix(vec3(1.0), uInkB, dots(vPlane, uAngle.y, uShiftB, vec4(0.0, 1.0, 0.0, 0.0)));
    gl_FragColor = vec4(t, 1.0);
  }`;

/** S12's proof on the GPU: the mask of the face's glyphs (drawn by a FlatLayer of its own into a target), and the screened plane over the paper. */
class ProofPrint {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly target = new THREE.WebGLRenderTarget(1920, 1080, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  private readonly view = frontal(FRONT * PRINT_MASK_K, 0, 0, FOV);
  private static readonly BLACK: { color: RGB; grain: number } = { color: [0, 0, 0], grain: 0 };
  private readonly layer: FlatLayer;

  constructor(layer: FlatLayer) {
    this.layer = layer;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        mask: { value: this.target.texture },
        uMaskSize: { value: new THREE.Vector2(1920 * PRINT_MASK_K, 1080 * PRINT_MASK_K) },
        uPitch: { value: PRINT_PITCH },
        uAngle: { value: new THREE.Vector2(SCREEN.angle.pink, SCREEN.angle.blue) },
        uInkA: { value: new THREE.Vector3(...PLATE.pink) },
        uInkB: { value: new THREE.Vector3(...PLATE.blue) },
        uCover: { value: 0 },
        uShiftA: { value: new THREE.Vector2() },
        uShiftB: { value: new THREE.Vector2() },
      },
      vertexShader: 'varying vec2 vPlane; void main() { vPlane = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: PRINT_FRAG,
      ...blendMode('multiply'),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1920 * PRINT_EXTENT, 1080 * PRINT_EXTENT), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Draws the print's mask (or hides the proof when there is none). */
  update(gl: THREE.WebGLRenderer, p: RisoPrint | null | undefined): void {
    this.mesh.visible = !!p;
    if (!p) return;
    this.layer.draw(gl, this.target, this.view, { under: [], glyphs: { rounded: p.mask }, over: [] }, ProofPrint.BLACK);
    this.material.uniforms.uCover.value = p.coverage;
    (this.material.uniforms.uShiftA.value as THREE.Vector2).set(p.shift.pink[0], p.shift.pink[1]);
    (this.material.uniforms.uShiftB.value as THREE.Vector2).set(p.shift.blue[0], p.shift.blue[1]);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.target.dispose();
  }
}

export class RisoScene implements Renderable {
  private layer: FlatLayer | null = null;
  /** The sheets' pages and knockouts: opaque. */
  private cards: FlatLayer | null = null;
  private layout: RisoLayout | null = null;
  private halftone: HalftonePlane | null = null;
  private proof: ProofPrint | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    // S10's mouths are cut through their sheets: the atlas also holds each mouth's counter, with the window the camera dives through.
    // v04's characters in v04's order (RISO_ATLAS.main), so every cell and counter sits where it did; A8's slug has an atlas of its own.
    const rounded = buildGlyphAtlas(RISO_ATLAS.main, (px) => `900 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 20, counters: MOUTH_CHARS, after: RISO_ATLAS.added });
    const slug = buildGlyphAtlas(RISO_ATLAS.slug, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 64, radius: 8, size: 512 });
    const atlases = { rounded, slug };
    this.layer = new FlatLayer({ atlases, blend: 'multiply', aspect: size.width / size.height, circlePerEm: SUN_CIRCLE_PER_EM });
    this.cards = new FlatLayer({ atlases, blend: 'normal', aspect: size.width / size.height, circlePerEm: SUN_CIRCLE_PER_EM });
    if (Math.abs(rounded.cellH / rounded.fontPx - QUAD_PER_EM) > 1e-9) throw new Error('the Riso atlas no longer matches QUAD_PER_EM');
    this.layout = { advance: advanceOf(rounded), slug: advanceOf(slug), mouths: Object.fromEntries(MOUTH_CHARS.map((m) => [m, rounded.entries.get(counterKey(m))!.window!])) };
    this.owned.push(rounded.texture, slug.texture, this.layer, this.cards);
    // Draw order within a pass: paper (−1), halftone or proof (−0.8), then the inks.
    const mask = faceMasks(HALFTONE_FACES, (px) => `900 ${px}px ${cssStack('rounded')}`, MASK_PX, 6, MASK_COVER);
    this.halftone = new HalftonePlane({ mask, pitch: PRINT_PITCH, angles: [SCREEN.angle.pink, SCREEN.angle.blue], inks: [PLATE.pink, PLATE.blue], extent: HALFTONE_EXTENT, cover: MASK_COVER });
    this.halftone.mesh.renderOrder = -0.8;
    this.layer.scene.add(this.halftone.mesh);
    const maskLayer = new FlatLayer({ atlases: { rounded }, blend: 'normal', aspect: 16 / 9, circlePerEm: SUN_CIRCLE_PER_EM });
    this.proof = new ProofPrint(maskLayer);
    this.proof.mesh.renderOrder = -0.8;
    this.layer.scene.add(this.proof.mesh);
    this.owned.push(this.halftone, mask, maskLayer, this.proof);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = risoFrame(ctx.frame, this.layout!);
    this.proof!.update(gl, f.print);
    if (f.stack) {
      const none = { under: [], glyphs: {}, over: [] };
      const st = f.stack;
      // Pages hang close to the camera in S10's flight: fade what comes nearer than 40, gone by 10.
      this.layer!.setNearFade(10, 40);
      this.cards!.setNearFade(10, 40);
      if (st.halftone) {
        this.halftone!.update(f.halftone);
        this.layer!.draw(gl, target, st.view, none, { color: PAPER, grain: PAPER_GRAIN });
      } else this.cards!.draw(gl, target, st.view, none, { color: st.clear, grain: PAPER_GRAIN });
      this.halftone!.update(null);
      for (const s of st.sheets) {
        this.cards!.draw(gl, target, s.view ?? st.view, s.card, null);
        this.layer!.draw(gl, target, s.view ?? st.view, s.ink, null);
      }
      return;
    }
    this.halftone!.update(f.halftone);
    this.layer!.setNearFade(f.near[0], f.near[1]);
    this.layer!.draw(gl, target, f.camera, f.content, { color: PAPER, grain: PAPER_GRAIN });
  }

  look(): Look {
    return risoLook();
  }

  temporal(frame: number): Temporal {
    return risoTemporal(frame);
  }

  segment(frame: number): Segment {
    return risoSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
