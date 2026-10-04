// Renderer C's screen overlay on the GPU (the pure shot is src/shots/cosmosWebOverlay.ts): drawn once per output frame after the Riso
// pass, before the bloom — the Defender's red spot ink (placed under the rig's view, so it stays glued through the punches), the type in
// neon tube outline, the counts, and the party monitor's box. Two flat layers in screen px: the dark backings (normal blend) and the
// light (added). The atlases are the cosmos's (src/content/cosmos.ts COSMOS_ATLASES): display, mono, and the monitor's readout.
import type * as THREE from 'three';
import type { GlyphAtlas } from '../engine/glyphAtlas.ts';
import { COSMOS_ATLASES } from '../content/cosmos.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { ENERGY } from '../score/energy.ts';
import { FOV, FRONT } from '../shots/cosmosKit.ts';
import { type OverlayAdvances, cOverlay } from '../shots/cosmosWebOverlay.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);

export class OverlayRenderer {
  private dark: FlatLayer | null = null;
  private light: FlatLayer | null = null;
  private adv: OverlayAdvances | null = null;
  private readonly owned: { dispose(): void }[] = [];

  /** Call after the fonts have loaded. */
  init(size: { width: number; height: number }, face: GlyphAtlas): void {
    const A = COSMOS_ATLASES;
    const display = buildGlyphAtlas(A.display.chars, (px) => `${A.display.weight} ${px}px ${cssStack(A.display.role)}`, { fontPx: 160, radius: 24, size: 4096 });
    const mono = buildGlyphAtlas(A.mono.chars, (px) => `${A.mono.weight} ${px}px ${cssStack(A.mono.role)}`, { fontPx: 96, radius: 14, size: 2048 });
    const readout = buildGlyphAtlas(A.readout.chars, (px) => `${A.readout.weight} ${px}px ${cssStack(A.readout.role)}`, { fontPx: 96, radius: 14, size: 2048 });
    const aspect = size.width / size.height;
    this.dark = new FlatLayer({ atlases: { display, mono, readout, face }, blend: 'normal', aspect, shapes: 256, glyphs: 512 });
    this.light = new FlatLayer({ atlases: { display, mono, face }, blend: 'add', aspect, shapes: 2048, glyphs: 512 });
    this.adv = { display: advanceOf(display), mono: advanceOf(mono), readout: advanceOf(readout) };
    this.owned.push(display.texture, mono.texture, readout.texture, this.dark, this.light);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const o = cOverlay(frame, ENERGY.view(frame), this.adv!);
    if (o.dark.length || Object.values(o.darkGlyphs).some((g) => g.length)) {
      this.dark!.draw(gl, target, SCREEN, { under: o.dark, glyphs: o.darkGlyphs, over: [] }, null);
    }
    if (o.light.length || Object.values(o.lightGlyphs).some((g) => g.length)) {
      this.light!.draw(gl, target, SCREEN, { under: o.light, glyphs: o.lightGlyphs, over: [] }, null);
    }
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
