// The intro (the part 'intro': S01, the RAIN bar, S02–S04 and the first half of T1) on the GPU. Every character of the terminal is an
// instance of one GlyphField, the rain's walls of a second one turned to stand on the page (src/shots/introRain.ts), the scan's red lines
// a ShapeField beside them, the readout a flat layer over the screen and the antivirus's red band a strip on the tube; src/shots/intro.ts
// and src/shots/introRain.ts decide where each one is and how it looks, and this class copies that into the GPU.
import * as THREE from 'three';
import { rasterParts, shadeFace } from '../actors/asciiFace.ts';
import { RAIN_INK } from '../content/boot.ts';
import { frontal } from '../engine/camera.ts';
import { linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { type Glyph, GlyphField } from '../engine/glyphField.ts';
import { ShapeField } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import {
  CIRCLE_PER_EM,
  FACE,
  FOV,
  FRONT_DISTANCE,
  INTRO_CAPACITY,
  INTRO_GLYPHS,
  type IntroLayout,
  buildIntroLayout,
  hazeGain,
  hazePulse,
  introCamera,
  introFog,
  introGlyphs,
  introLook,
  introSegment,
  introTemporal,
  redBandAt,
  screenPower,
} from '../shots/intro.ts';
import { DEFENDER_INK, FLOOR_CAPACITY, RAIN_CAPACITY, type RainLayout, SCAN_CAPACITY, rainFloor, rainGlyphs, rainHud, rainLayout, scanLines } from '../shots/introRain.ts';
import { PALETTE } from '../worlds/terminal.ts';

/** The readout's frontal camera: 1 unit = 1 px at 1080p on z = 0. */
const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);

export class IntroScene implements Renderable {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(20, 16 / 9, 1, 20000);
  private readonly glyphs: Glyph[] = [];
  private readonly rainBuf: Glyph[] = [];
  private readonly owned: { dispose(): void }[] = [];
  private field: GlyphField | null = null;
  private rain: GlyphField | null = null;
  private scan: ShapeField | null = null;
  private hud: FlatLayer | null = null;
  private atlas: GlyphAtlas | null = null;
  private layout: IntroLayout | null = null;
  private rainL: RainLayout | null = null;
  private screen: THREE.ShaderMaterial | null = null;
  private band: THREE.ShaderMaterial | null = null;
  private bandQuad: FullscreenQuad | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const atlas = buildGlyphAtlas(INTRO_GLYPHS, (px) => `500 ${px}px ${cssStack('mono')}`);
    this.atlas = atlas;
    const raster = rasterParts(FACE.text, (px) => `900 ${px}px ${cssStack('rounded')}`, FACE.cols, FACE.rows, FACE.subX, FACE.subY);
    const layout = buildIntroLayout(shadeFace(raster));
    this.layout = layout;
    this.rainL = rainLayout((f) => introCamera(f, layout.eye));
    this.field = new GlyphField({ capacity: INTRO_CAPACITY + FLOOR_CAPACITY, atlas, blend: 'add', circlePerEm: CIRCLE_PER_EM });
    // The rain stands on the page: its field is turned +90° about x, so a glyph's local (x, y, z) is the world's (x, z, −y) and it
    // faces the camera looking along +y. The scan's lines cut the walls the same way.
    this.rain = new GlyphField({ capacity: RAIN_CAPACITY, atlas, blend: 'add' });
    this.rain.mesh.rotation.x = Math.PI / 2;
    this.rain.setFog(RAIN_INK.fog[0], RAIN_INK.fog[1], RAIN_INK.fog[2]);
    this.scan = new ShapeField({ capacity: SCAN_CAPACITY, blend: 'add' });
    this.scan.mesh.rotation.x = Math.PI / 2;
    // The dark glass of the screen with a faint phosphor haze in the middle; it warms up over the first frames.
    this.screen = new THREE.ShaderMaterial({
      uniforms: { base: { value: new THREE.Vector3(...linear(PALETTE.bg)) }, haze: { value: new THREE.Vector3(...linear(PALETTE.green, 0.012)) }, power: { value: 1 }, pulse: { value: 1 } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform vec3 base;
        uniform vec3 haze;
        uniform float power;
        uniform float pulse;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * vec2(2.0, 2.4);
          gl_FragColor = vec4((base + haze * pulse * exp(-dot(p, p) * 1.6)) * power, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new FullscreenQuad(this.screen);
    quad.mesh.renderOrder = -1;
    // The antivirus looks (intro 5.3&): a DEFENDER-red strip rolling down the tube, added to the picture (y in 1080p px from the top).
    this.band = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Vector3(...DEFENDER_INK) }, y: { value: -1000 }, halfH: { value: 30 }, alpha: { value: 0 } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform float y;
        uniform float halfH;
        uniform float alpha;
        varying vec2 vUv;
        void main() {
          float d = abs((1.0 - vUv.y) * 1080.0 - y);
          float core = 1.0 - smoothstep(halfH - 6.0, halfH + 2.0, d);
          float glow = 0.18 * exp(-max(d - halfH, 0.0) / 28.0);
          gl_FragColor = vec4(color * alpha * max(core, glow), 1.0);
        }`,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.bandQuad = new FullscreenQuad(this.band);
    this.bandQuad.mesh.renderOrder = 10;
    this.bandQuad.mesh.visible = false;
    this.scene.add(quad.mesh, this.field.mesh, this.rain.mesh, this.scan.mesh, this.bandQuad.mesh);
    this.camera.aspect = size.width / size.height;
    this.hud = new FlatLayer({ atlases: { mono: atlas }, blend: 'normal', aspect: size.width / size.height, shapes: 8, glyphs: 128 });
    this.owned.push(atlas.texture, quad, this.field, this.rain, this.scan, this.bandQuad, this.hud);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const field = this.field!;
    const layout = this.layout!;
    const n = rainFloor(ctx.frame, this.glyphs, introGlyphs(ctx.frame, layout, this.glyphs));
    for (let i = 0; i < n; i++) field.set(i, this.glyphs[i]);
    field.commit(n);
    // The camera and the fog follow ctx.cam: phosphor-tail sub-frames keep the shutter-open framing, so only the glyphs trail.
    field.setFog(...introFog(ctx.cam));
    const pose = introCamera(ctx.cam, layout.eye);
    const rain = this.rain!;
    const r = rainGlyphs(ctx.frame, this.rainL!, pose, this.rainBuf);
    for (let i = 0; i < r; i++) rain.set(i, this.rainBuf[i]);
    rain.commit(r);
    const lines = scanLines(ctx.frame);
    lines.forEach((s, i) => this.scan!.set(i, s));
    this.scan!.commit(lines.length);
    const band = redBandAt(ctx.frame);
    this.bandQuad!.mesh.visible = band !== null;
    if (band) {
      this.band!.uniforms.y.value = band.y;
      this.band!.uniforms.alpha.value = band.alpha;
    }
    this.camera.position.set(...pose.position);
    this.camera.up.set(...pose.up);
    this.camera.lookAt(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    this.screen!.uniforms.power.value = screenPower(ctx.frame);
    this.screen!.uniforms.pulse.value = hazePulse(ctx.frame) * hazeGain(ctx.frame);
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    const atlas = this.atlas!;
    const readout = rainHud(ctx.frame, (ch) => atlas.entries.get(ch)?.advance ?? 0.6);
    if (readout) this.hud!.draw(gl, target, SCREEN, readout, null);
  }

  look(frame: number): Look {
    return introLook(frame);
  }

  temporal(frame: number): Temporal {
    return introTemporal(frame);
  }

  segment(): Segment {
    return introSegment();
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
