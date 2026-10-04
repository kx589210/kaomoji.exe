// Renderer B of the cosmos, "SLINGSHOT SPIROGRAPH → WARP ARM → NEON SPIRAL" (cosmos 3.1 → 5.1: COSMOS_PARTS 'B'; build sheet
// notes/bcos/sheet.md §4.3–§4.4, §6.3–§6.4; design notes/cosmos3/final.md §4 bars 17–18). Keeps the CosmosPart contract
// (src/scenes/cosmosStub.ts) and the stub's class name; the dispatcher (src/scenes/cosmos.ts) makes it as renderer B
// (the stub src/scenes/cosmosSling.ts is no longer drawn). Cosmos 3 is the solar system (src/scenes/cosmosBSolar.ts); from the fling (3.4&) the galaxy's arm opens
// round the shrinking system and cosmos 4 is the warp, the snap-out and the neon spiral (src/scenes/cosmosBGalaxy.ts). Those are the
// printed world. The screen overlay, drawn once per output frame after the Riso pass, carries the light that burns past the print
// (src/scenes/cosmosBHot.ts: the spirograph, the light grammar, his face and wake, the neon power-up, the jets, the streak; it samples the
// frame's own shutter itself) and then the Powers-of-Ten type and the threat counts (src/scenes/cosmosBType.ts).
// Constructible in Node: no GL before init().
import type * as THREE from 'three';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Quality } from '../engine/types.ts';
import { FLING, cs } from '../score/cosmos.ts';
import { bLook, bTemporal } from '../shots/cosmosGalaxyLook.ts';
import { B_FACES, B_WORDS } from '../shots/cosmosSolarKit.ts';
import { GalaxyRenderer } from './cosmosBGalaxy.ts';
import { HotRenderer } from './cosmosBHot.ts';
import { SolarRenderer } from './cosmosBSolar.ts';
import { TypeRenderer } from './cosmosBType.ts';
import type { CosmosPart } from './cosmosStub.ts';

export class SlingPart implements CosmosPart {
  private readonly solar = new SolarRenderer();
  private readonly galaxy = new GalaxyRenderer();
  private readonly type = new TypeRenderer();
  private readonly hot = new HotRenderer();
  private readonly owned: { dispose(): void }[] = [];
  /** The quality of the frame being drawn (its sub-frames tell; the hot overlay samples the same shutter). */
  private quality: Quality = 'final';

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const face = buildGlyphAtlas(B_FACES, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 96, radius: 12, size: 4096 });
    const word = buildGlyphAtlas(B_WORDS, (px) => `900 ${px}px ${cssStack('display')}`, { fontPx: 128, radius: 16, size: 2048 });
    this.owned.push(face.texture, word.texture);
    this.solar.init({ face, word }, size);
    this.galaxy.init(gl, { face }, size);
    this.type.init(size);
    this.hot.init({ face }, size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.quality = ctx.quality;
    const f = Math.max(ctx.frame, cs(3));
    if (f < FLING.from) {
      this.solar.draw(gl, target, f, { paper: true });
    } else if (f < cs(4)) {
      // The fling: the arm opens round the system as it shrinks to one star.
      this.galaxy.draw(gl, target, f);
      this.solar.draw(gl, target, f, { paper: false });
    } else {
      this.galaxy.draw(gl, target, f);
    }
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.hot.draw(gl, target, frame, this.quality);
    this.type.draw(gl, target, frame);
  }

  look(frame: number): Look {
    return bLook(frame);
  }

  temporal(frame: number): Temporal {
    return bTemporal(frame);
  }

  dispose(): void {
    this.solar.dispose();
    this.galaxy.dispose();
    this.type.dispose();
    this.hot.dispose();
    for (const o of this.owned) o.dispose();
  }
}
