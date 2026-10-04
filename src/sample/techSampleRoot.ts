import { staticFile } from 'remotion';
import * as THREE from 'three';
import { SPRITES } from '../content/text.ts';
import { studioEnvironment } from '../engine/env.ts';
import { extrudeText, loadOpentype } from '../engine/extrude.ts';
import { EXTRUDE_FONT, cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { GlyphSwirl } from '../engine/glyphSwirl.ts';
import { Layer2D } from '../engine/layer2d.ts';
import { ease, lerp, prog, springAt } from '../engine/math.ts';
import { noise1 } from '../engine/random.ts';
import { DEFAULT_TEMPORAL, type Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { HIT_FRAME, REVEAL, WHIP } from '../score/techSample.ts';
import { paintSwiss, paintTerminal } from './paint.ts';

const D = 6; // distance of the two screens from the camera
const FOV = 35;
const FACE_X = 3.7; // distance of the glass face from the camera along +x
const DOLLY = 0.6;

/**
 * 0–95 terminal · 96–119 whip right (motion blur) · 120– Swiss screen with a
 * glass (•ω•) · 192– glyph swirl · 288 hit (flash + burst).
 */
export class TechSampleRoot implements Renderable {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 100);
  private readonly face = new THREE.Group();
  private readonly owned: { dispose(): void }[] = [];
  private terminal: Layer2D | null = null;
  private swiss: Layer2D | null = null;
  private swirl: GlyphSwirl | null = null;

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }) {
    await loadFonts();
    const h = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const w = h * (16 / 9);
    this.terminal = new Layer2D(size.width, size.height);
    this.swiss = new Layer2D(size.width, size.height);
    const screenGeo = new THREE.PlaneGeometry(w, h);
    const termMat = new THREE.MeshBasicMaterial({ map: this.terminal.texture, color: new THREE.Color(1.7, 1.7, 1.7), toneMapped: false });
    const swissMat = new THREE.MeshBasicMaterial({ map: this.swiss.texture, toneMapped: false });
    const termScreen = new THREE.Mesh(screenGeo, termMat);
    termScreen.position.set(0, 0, -D);
    const swissScreen = new THREE.Mesh(screenGeo, swissMat);
    swissScreen.position.set(D, 0, 0);
    swissScreen.rotation.y = -Math.PI / 2;
    this.scene.add(termScreen, swissScreen);

    const env = studioEnvironment(gl, [
      { color: '#ffffff', intensity: 6, position: [0, 5, 2], size: [6, 2] },
      { color: '#ff48b0', intensity: 4, position: [-5, 0, 1], size: [2, 5] },
      { color: '#0078bf', intensity: 4, position: [5, 0, 1], size: [2, 5] },
      { color: '#e8402b', intensity: 2, position: [0, -4, 3], size: [6, 1] },
    ]);
    this.scene.environment = env;
    const font = await loadOpentype(staticFile(EXTRUDE_FONT));
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.6, ior: 1.45, dispersion: 4,
      clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.35, iridescenceIOR: 1.3, attenuationColor: new THREE.Color('#cdf3ff'), attenuationDistance: 3,
    });
    const eyeGlass = new THREE.MeshPhysicalMaterial({ color: '#16161a', roughness: 0.02, transmission: 0.25, thickness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5 });
    const parts: [string, number, number][] = [['(', -1.05, 0], ['ω', 0, -0.28], [')', 1.05, 0]];
    for (const [ch, x, y] of parts) {
      const geo = extrudeText(font, ch, { size: ch === 'ω' ? 0.9 : 1.6, depth: 0.32 });
      const mesh = new THREE.Mesh(geo, glass);
      mesh.position.set(x, y, 0);
      this.face.add(mesh);
      this.owned.push(geo);
    }
    const eyeGeo = new THREE.SphereGeometry(0.16, 64, 32);
    for (const x of [-0.42, 0.42]) {
      const eye = new THREE.Mesh(eyeGeo, eyeGlass);
      eye.position.set(x, 0.3, 0.05);
      eye.scale.set(1, 1.15, 0.7);
      this.face.add(eye);
    }
    const pivot = new THREE.Group();
    pivot.position.set(FACE_X, 0, 0);
    pivot.rotation.y = -Math.PI / 2;
    pivot.add(this.face);
    this.scene.add(pivot);

    const atlas = buildGlyphAtlas(SPRITES, (px) => `800 ${px}px ${cssStack('rounded')}`);
    // Solid inks on the light poster: glow would vanish into the paper.
    const palette = ['#ff48b0', '#0078bf', '#e8402b', '#111111'].map((c) => new THREE.Color(c));
    this.swirl = new GlyphSwirl({ count: 14_000, sprites: SPRITES, atlas, seed: 11, palette, size: [0.02, 0.06], thickness: 0.3, blend: 'normal' });
    this.swirl.mesh.position.set(FACE_X, 0, 0);
    this.swirl.mesh.scale.setScalar(0.65);
    this.swirl.mesh.rotation.z = 0.45;
    this.scene.add(this.swirl.mesh);

    this.owned.push(screenGeo, termMat, swissMat, glass, eyeGlass, eyeGeo, atlas.texture, env);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    const f = ctx.frame;
    this.terminal!.paint((c) => paintTerminal(c, f));
    this.swiss!.paint((c) => paintSwiss(c, f));

    const yaw = -(Math.PI / 2) * prog(f, WHIP.from, WHIP.to, ease.inOutCubic);
    const dolly = DOLLY * prog(f, WHIP.to, HIT_FRAME, ease.inOutSine);
    const shake = f >= HIT_FRAME ? 0.05 * Math.exp(-(f - HIT_FRAME) / 5) : 0;
    this.camera.position.set(dolly, shake * noise1(f * 0.9, 1), shake * noise1(f * 0.9, 2));
    this.camera.rotation.set(0, yaw, 0);

    const pop = springAt((f - 104) / 60, { stiffness: 140, damping: 12, mass: 1 });
    this.face.scale.setScalar(Math.max(pop, 1e-3) * 0.85);
    this.face.rotation.y = 0.45 * Math.sin(ctx.t * 1.6);
    this.face.position.y = 0.06 * Math.sin(ctx.t * 2.2);

    this.swirl!.update({
      time: ctx.t,
      reveal: prog(f, REVEAL.from, REVEAL.to, ease.outCubic),
      burst: 1 + 2.5 * prog(f, HIT_FRAME, HIT_FRAME + 12, ease.outExpo),
    });
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  look(frame: number): Look {
    const inTerminal = 1 - prog(frame, WHIP.from, WHIP.to, ease.inOutCubic);
    const hit = frame >= HIT_FRAME ? Math.exp(-(frame - HIT_FRAME) / 3) : 0;
    return {
      toneMapping: 'linear',
      exposure: 1 + 0.35 * hit,
      bloom: { intensity: lerp(0.8, 1.2, inTerminal) + 1.5 * hit, threshold: 1, smoothing: 0.2, radius: 0.75 },
      aberration: lerp(0.0005, 0.0014, inTerminal),
      grain: lerp(0.12, 0.35, inTerminal),
      vignette: lerp(0.2, 0.5, inTerminal),
    };
  }

  temporal(frame: number): Temporal {
    // The whip moves ~200 px per frame; with 16 sub-frames its blur showed separate copies.
    return frame >= WHIP.from - 1 && frame <= WHIP.to + 1 ? { samples: 64, shutter: 0.5, persistence: 0 } : DEFAULT_TEMPORAL;
  }

  dispose() {
    this.terminal?.dispose();
    this.swiss?.dispose();
    this.swirl?.dispose();
    for (const o of this.owned) o.dispose();
  }
}
