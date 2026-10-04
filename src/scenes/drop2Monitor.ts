// The party monitor over drop 2 on the GPU (build sheet notes/d2build/sheet.md §7.1; the integrator's): a flat layer in screen px
// (a fixed frontal camera, 1 unit = 1 px at 1080p), drawn by Drop2Scene.screenOverlay over the summed sub-frames of every drop 2 frame,
// so the rig's punches and shakes never streak or double it — the model is src/scenes/hud.ts's HudLayer. The readout itself is pure
// (src/shots/drop2Monitor.ts: W1–W3 with Defender's red rows, the act-1 hairline, the kernel's v1 slot; empty outside them). E9's fps line
// is Drop2Overload's own screenOverlay, never drawn here.
import type * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { MONITOR_CHARS, readoutContent } from '../shots/drop2Monitor.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);

export class Drop2MonitorLayer {
  private layer: FlatLayer | null = null;
  private advance: ((ch: string) => number) | null = null;
  private readonly owned: { dispose(): void }[] = [];

  /** Builds its mono atlas (hud.ts's weight) and layer at the device size, after the fonts have loaded. */
  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.layer) return;
    await loadFonts();
    const mono = buildGlyphAtlas([...MONITOR_CHARS], (px) => `600 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 2048 });
    this.layer = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect: size.width / size.height, shapes: 16, glyphs: 768 });
    this.advance = advanceOf(mono);
    this.owned.push(mono.texture, this.layer);
  }

  /** Draws drop 2's readout for output frame `frame` over `target` (normal blending): the windows, the hairline, the v1 slot; nothing outside them. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const c = readoutContent(frame, this.advance!);
    if ((c.glyphs.mono ?? []).length === 0 && c.under.length === 0) return;
    this.layer!.draw(gl, target, SCREEN, c, null);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.layer = null;
  }
}
