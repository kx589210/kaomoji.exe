// The party monitor on the GPU: a flat layer in screen px (a fixed frontal
// camera, 1 unit = 1 px at 1080p), drawn over a scene's finished picture —
// the scene's screenOverlay(), once per output frame after the sub-frames are
// summed, so the energy rig's punches and shakes never streak or double it.
// The readout itself is pure (src/shots/hud.ts).
import type * as THREE from 'three';
import { MONITOR_GLYPHS } from '../content/drop1.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { hudContent } from '../shots/hud.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);

export class HudLayer {
  private layer: FlatLayer | null = null;
  private advance: ((ch: string) => number) | null = null;
  private readonly owned: { dispose(): void }[] = [];

  /** Call after the fonts have loaded. */
  init(size: { width: number; height: number }): void {
    const mono = buildGlyphAtlas(MONITOR_GLYPHS, (px) => `600 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14 });
    this.layer = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect: size.width / size.height, shapes: 64, glyphs: 512 });
    this.advance = advanceOf(mono);
    this.owned.push(mono.texture, this.layer);
  }

  /** Draws the readout over whatever `target` holds (normal blending): output frame `frame`'s state (hudContent), over the summed sub-frames. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.layer!.draw(gl, target, SCREEN, hudContent(frame, this.advance!), null);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
