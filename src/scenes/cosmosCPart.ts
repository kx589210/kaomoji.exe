// Renderer C of the cosmos, "LIGHTNING WEB → EVENT HORIZON → the amber point" (cosmos 5–6: COSMOS_PARTS 'C'; build sheet
// notes/bcos/sheet.md §4.5–§4.6, §6.4–§6.6; design notes/cosmos3/final.md §4 bars 19–20). Keeps the CosmosPart contract
// (src/scenes/cosmosStub.ts): the dispatcher (src/scenes/cosmos.ts) makes it as renderer C (the stub cosmosHorizon.ts is no longer
// drawn). Every instant from cosmos 5.1 to club 1.1 is drawn here: cosmos 5 by the web (src/scenes/cosmosCWeb.ts), cosmos 6 by the event
// horizon (src/scenes/cosmosCHole.ts); the Defender's red, the type and the party monitor are its screen overlay, drawn once per output
// frame after the Riso pass (src/scenes/cosmosCOverlay.ts). Constructible in Node: no GL before init().
import type * as THREE from 'three';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { HORIZON, cs } from '../score/cosmos.ts';
import { cFaces, cLook, cTemporal, lensPoint } from '../shots/cosmosWebPart.ts';
import { WebRenderer } from './cosmosCWeb.ts';
import { HoleRenderer } from './cosmosCHole.ts';
import { OverlayRenderer } from './cosmosCOverlay.ts';
import type { CosmosPart } from './cosmosStub.ts';

export class CosmosCPart implements CosmosPart {
  private readonly web = new WebRenderer();
  private readonly hole = new HoleRenderer();
  private readonly overlay = new OverlayRenderer();
  private readonly owned: { dispose(): void }[] = [];

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const face = buildGlyphAtlas(cFaces(), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 96, radius: 12, size: 4096 });
    this.owned.push(face.texture);
    this.web.init({ face }, size);
    // The web's last frame, for the twist and the disc's web band (drawn once, on first need: any frame may be rendered first).
    this.hole.init({ face }, size, (target) => this.web.draw(gl, target, HORIZON.at - 1e-3, null));
    this.overlay.init(size, face);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = Math.max(ctx.frame, cs(5));
    if (f < cs(6)) this.web.draw(gl, target, f, lensPoint(ctx.frame));
    else this.hole.draw(gl, target, f);
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.overlay.draw(gl, target, frame);
  }

  look(frame: number): Look {
    return cLook(frame);
  }

  temporal(frame: number): Temporal {
    return cTemporal(frame);
  }

  dispose(): void {
    this.web.dispose();
    this.hole.dispose();
    this.overlay.dispose();
    for (const o of this.owned) o.dispose();
  }
}
