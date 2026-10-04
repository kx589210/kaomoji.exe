// The spots' worlds on the GPU (build sheet notes/b58/ending-sheet.md §7.1, R2): once per output frame, every lit spot's world is
// drawn at rest into one texture (`plain`), and each world that has a Look of its own is finished from it into a second (`fx`) through
// EffectQuad — the Riso print, the 8-bit pixels, the printed-and-powered cosmos, the comic's Ben-Day and focus lines, drop 2's
// kaleidoscope (its headliner drawn on top afterwards, unmirrored) — each pass scissored to its spot's box. OutroIris draws the spots
// while they open; OutroCompany reads the same cache, frozen at BURST − 1, while they pop away on the burst. One renderer per tab,
// reference-counted (acquireSpots / releaseSpots), so both parts share its targets and its cache. Pure content: src/shots/outroSpots.ts.
import * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { ComicInkEffect } from '../engine/post/comicInk.ts';
import { EffectQuad } from '../engine/post/effectQuad.ts';
import { KaleidoscopeEffect } from '../engine/post/kaleidoscope.ts';
import { PixelEffect } from '../engine/post/pixel.ts';
import { RisoPrintEffect } from '../engine/post/risoPrint.ts';
import { FOV, FRONT_DISTANCE } from '../shots/intro.ts';
import { SPOT_WORLDS, spotBox, spotLook, spotsContent } from '../shots/outroSpots.ts';
import type { OmegaPlan } from '../shots/outroKit.ts';
import { acquireAtlas, measureOmegas, releaseAtlas } from './outroKit.ts';

const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);
const target = (size: { width: number; height: number }) => {
  const t = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
  t.texture.minFilter = THREE.LinearFilter;
  t.texture.magFilter = THREE.LinearFilter;
  return t;
};

export class OutroSpots {
  plain: THREE.WebGLRenderTarget | null = null;
  fx: THREE.WebGLRenderTarget | null = null;
  private layer: FlatLayer | null = null;
  private plan: OmegaPlan | null = null;
  private readonly quads = { riso: null as EffectQuad | null, comic: null as EffectQuad | null, pixel: null as EffectQuad | null, kaleido: null as EffectQuad | null };
  private cached = '';
  private size = { width: 1920, height: 1080 };

  async init(size: { width: number; height: number }): Promise<void> {
    this.size = size;
    const faces = await acquireAtlas('faces');
    this.layer = new FlatLayer({ atlases: { faces }, blend: 'normal', aspect: size.width / size.height, shapes: 512, glyphs: 64 });
    this.plan = measureOmegas('faces');
    this.plain = target(size);
    this.fx = target(size);
    this.quads.riso = new EffectQuad(new RisoPrintEffect());
    this.quads.comic = new EffectQuad(new ComicInkEffect());
    this.quads.pixel = new EffectQuad(new PixelEffect());
    this.quads.kaleido = new EffectQuad(new KaleidoscopeEffect());
  }

  /** The spots' textures for output frame F (a deterministic cache: the content is a pure function of F and `friends`). */
  render(gl: THREE.WebGLRenderer, F: number, friends = true): void {
    const key = `${F}:${friends}`;
    if (key === this.cached) return;
    this.cached = key;
    const content = spotsContent(F, this.plan!, friends);
    const clear = gl.getClearColor(new THREE.Color());
    const alpha = gl.getClearAlpha();
    gl.setClearColor(0x000000, 1);
    gl.setRenderTarget(this.plain);
    gl.clear(true, false, false);
    this.layer!.draw(gl, this.plain!, SCREEN, content.plain, null);
    gl.setRenderTarget(this.fx);
    gl.clear(true, false, false);
    const k = this.size.height / 1080;
    const fx = this.fx!;
    SPOT_WORLDS.forEach((_, i) => {
      const look = spotLook(i, F);
      if (!look) return;
      const [x0, y0, x1, y1] = spotBox(i);
      fx.scissor.set(Math.floor(x0 * k), Math.floor((1080 - y1) * k), Math.ceil((x1 - x0) * k), Math.ceil((y1 - y0) * k));
      fx.scissorTest = true;
      const pass = (q: EffectQuad | null, on: boolean) => {
        if (q && on) q.draw(gl, this.plain!.texture, fx);
      };
      pass(this.quads.riso, (this.quads.riso!.effect as RisoPrintEffect).configure(look.riso));
      pass(this.quads.comic, (this.quads.comic!.effect as ComicInkEffect).configure(look.comic));
      pass(this.quads.pixel, (this.quads.pixel!.effect as PixelEffect).configure(look.pixel));
      pass(this.quads.kaleido, (this.quads.kaleido!.effect as KaleidoscopeEffect).configure(look.kaleido));
      fx.scissorTest = false;
    });
    // Drop 2's headliner over its kaleidoscope, unmirrored.
    this.layer!.draw(gl, fx, SCREEN, content.over, null);
    gl.setClearColor(clear, alpha);
  }

  dispose(): void {
    this.layer?.dispose();
    this.plain?.dispose();
    this.fx?.dispose();
    for (const q of Object.values(this.quads)) q?.dispose();
    releaseAtlas('faces');
  }
}

let shared: { spots: OutroSpots; users: number; ready: Promise<void> } | null = null;
/** The tab's spots renderer, built on first use; call releaseSpots once per acquire. */
export async function acquireSpots(size: { width: number; height: number }): Promise<OutroSpots> {
  if (!shared) {
    const spots = new OutroSpots();
    shared = { spots, users: 0, ready: spots.init(size) };
  }
  shared.users++;
  await shared.ready;
  return shared.spots;
}
export function releaseSpots(): void {
  if (!shared) return;
  shared.users--;
  if (shared.users <= 0) {
    shared.spots.dispose();
    shared = null;
  }
}
