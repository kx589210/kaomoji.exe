// The club (its bars 1–4) and the break into break 1.1 on the GPU: the dancing
// lines as flat layers in screen px (unlit glass under, the lit tubes added as
// light); from the hit on club 4.4 his one face cracked on the glass; from the
// break's downbeat (break 1.1) the glass breaks into real glass shards —
// extruded, bevelled, physical glass (transmission, dispersion, iridescence)
// like swiss bar 3's glass face, lit by a code-built studio — each carrying
// its piece of the face (the cracked
// frame, rendered once into a texture), flying out at the viewer while the
// club behind the glass (a dimmed backplate) bends through them. The party
// monitor over everything. The shots are pure (src/shots/lines.ts,
// src/shots/glass.ts).
import * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { smoothstep } from '../engine/math.ts';
import { studioEnvironment } from '../engine/env.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { FLIP } from '../score/drop1.ts';
import { DECAL_Z, GLASS, SHARDS, SHARD_DEPTH, clubSegment, clubTemporal, decalUV, glassFrame, shardFlight } from '../shots/glass.ts';
import { CLUB_BLOOM, CLUB_TEXTS, type ClubLayout, VOID, linesFrame } from '../shots/lines.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { HudLayer } from './hud.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');

/**
 * The shards' face: the frozen glass added onto each shard as it was drawn — its colour one to one. (Plain additive blending would weight
 * it by the frozen frame's alpha, which the light layers summed over the paper to 2–3 on the face and the cracks: twice as bright.)
 */
export const shardDecal = (map: THREE.Texture): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    map,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });

export class ClubScene implements Renderable {
  private dark: FlatLayer | null = null;
  private light: FlatLayer | null = null;
  private fore: FlatLayer | null = null;
  private layout: ClubLayout | null = null;
  private readonly hud = new HudLayer();
  private readonly shatter = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 1e5);
  private frozen: THREE.WebGLRenderTarget | null = null;
  private backplate: THREE.WebGLRenderTarget | null = null;
  private frozenReady = false;
  /** How much of the club behind the glass shows: none on the break (the glass was black behind his face), fully as the shards part. */
  private readonly behind = { value: 0 };
  private readonly shards: THREE.Mesh[] = [];
  private readonly owned: { dispose(): void }[] = [];

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const neon = buildGlyphAtlas(chars(CLUB_TEXTS), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 96, radius: 30, size: 6144 });
    const aspect = size.width / size.height;
    this.dark = new FlatLayer({ atlases: { neon }, blend: 'normal', aspect, shapes: 8192, glyphs: 16384 });
    this.light = new FlatLayer({ atlases: { neon }, blend: 'add', aspect, shapes: 8192, glyphs: 16384 });
    this.fore = new FlatLayer({ atlases: {}, blend: 'add', aspect, shapes: 1024, glyphs: 16 });
    this.layout = { advance: advanceOf(neon) };
    this.hud.init(size);
    this.owned.push(neon.texture, this.dark, this.light, this.fore, this.hud);

    // The shards: real glass — the crack pattern's cells extruded and bevelled — each with its piece of the cracked frame (his face) as light on its front.
    this.frozen = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.backplate = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    const env = studioEnvironment(
      gl,
      [
        { color: '#ffffff', intensity: 7, position: [0, 5, 2], size: [6, 2] },
        { color: '#ffffff', intensity: 4, position: [-5, 1, 2], size: [2, 5] },
        { color: '#cfe8ff', intensity: 3, position: [5, -1, 2], size: [2, 5] },
        { color: '#fff1d6', intensity: 1.5, position: [0, -5, 1], size: [6, 2] },
      ],
      0x0a0a0a,
    );
    this.shatter.environment = env;
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.03, transmission: 1, thickness: 26, ior: 1.5, dispersion: 6,
      clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.35, iridescenceIOR: 1.3, attenuationColor: new THREE.Color('#dff8f0'), attenuationDistance: 300, specularIntensity: 1,
    });
    const decal = shardDecal(this.frozen.texture);
    const backdrop = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.backplate.texture }, behind: this.behind },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: 'uniform sampler2D map; uniform float behind; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb * behind, 1.0); }',
      depthTest: false,
      depthWrite: false,
    });
    const quad = new FullscreenQuad(backdrop);
    quad.mesh.renderOrder = -1;
    this.shatter.add(quad.mesh);
    this.owned.push(this.frozen, this.backplate, env, glass, decal, quad);
    for (const sh of SHARDS) {
      const shape = new THREE.Shape(sh.pts.map(([x, y]) => new THREE.Vector2(x - sh.c[0], y - sh.c[1])));
      const body = new THREE.ExtrudeGeometry(shape, { depth: SHARD_DEPTH, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.5, bevelSegments: 2 });
      body.translate(0, 0, -SHARD_DEPTH / 2);
      const front = new THREE.ShapeGeometry(shape);
      const pos = front.getAttribute('position');
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) uv.set(decalUV(pos.getX(i) + sh.c[0], pos.getY(i) + sh.c[1]), 2 * i);
      front.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      const mesh = new THREE.Mesh(body, glass);
      const face = new THREE.Mesh(front, decal);
      face.position.z = DECAL_Z;
      face.renderOrder = 2;
      mesh.add(face);
      this.shards.push(mesh);
      this.shatter.add(mesh);
      this.owned.push(body, front);
    }
    this.camera.aspect = aspect;
    this.camera.position.set(0, 0, FRONT);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  /** The cracked glass at instant `f` into `target`. */
  private drawGlass(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, f: number): void {
    const g = glassFrame(f, this.layout!.advance);
    this.dark!.draw(gl, target, SCREEN, { under: [], glyphs: {}, over: [] }, { color: VOID, grain: 0 });
    this.light!.draw(gl, target, SCREEN, g.light, null);
    this.fore!.draw(gl, target, SCREEN, { under: g.cracks, glyphs: {}, over: [] }, null);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    if (f < GLASS.hit) {
      const c = linesFrame(f, this.layout!);
      this.dark!.draw(gl, target, SCREEN, c.dark, { color: VOID, grain: 0 });
      this.light!.draw(gl, target, SCREEN, c.light, null);
      this.fore!.draw(gl, target, SCREEN, c.fore, null);
      // (•ω•) in front of it all: his black body hides what is behind him, his tubes lit on it.
      this.dark!.draw(gl, target, SCREEN, c.front.dark, null);
      this.light!.draw(gl, target, SCREEN, c.front.light, null);
    } else if (f < GLASS.shatter) {
      this.drawGlass(gl, target, f);
    } else {
      // The glass as it was on the last frame of the silence, broken into shards flying at us.
      if (!this.frozenReady) {
        this.drawGlass(gl, this.frozen!, GLASS.shatter - 1);
        // Behind the glass: the club he was thrown from (the moment of the throw, without him), dimmed. The next section is not designed yet.
        const club = linesFrame(FLIP + 12, this.layout!, false);
        this.dark!.draw(gl, this.backplate!, SCREEN, club.dark, { color: VOID, grain: 0 });
        this.light!.draw(gl, this.backplate!, SCREEN, club.light, null);
        this.dark!.draw(gl, this.backplate!, SCREEN, { under: [{ kind: 'rect', x: 0, y: 0, w: 4000, h: 3000, color: VOID, alpha: 0.35 }], glyphs: {}, over: [] }, null);
        this.frozenReady = true;
      }
      this.behind.value = smoothstep(GLASS.shatter, GLASS.shatter + 8, f);
      SHARDS.forEach((s, i) => {
        const m = this.shards[i];
        const fl = shardFlight(s, f);
        m.position.set(s.c[0] + fl.x, s.c[1] + fl.y, fl.z);
        m.rotation.set(fl.rx, fl.ry, fl.rz);
        m.visible = fl.z < FRONT - 40;
      });
      gl.setRenderTarget(target);
      gl.render(this.shatter, this.camera);
    }
  }

  /** The party monitor, once per output frame over the finished picture: fixed to the screen, so the kick punches don't streak it. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.hud.draw(gl, target, frame);
  }

  look(): Look {
    return { toneMapping: 'linear', exposure: 1, bloom: CLUB_BLOOM, aberration: 0, grain: 0.05, vignette: 0.22 };
  }

  temporal(frame: number): Temporal {
    return clubTemporal(frame);
  }

  segment(frame: number): Segment {
    return clubSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
