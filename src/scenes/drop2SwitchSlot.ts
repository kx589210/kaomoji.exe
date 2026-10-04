// THE SLOT on the GPU: Defender v2.0's scoreboard (src/shots/drop2SwitchSlot.ts is the pure picture; builder S, fix R1-T02). One flat
// layer in screen px (one unit a px at 1080p, origin at the centre, y up), drawn once per output frame over the summed sub-frames by
// Drop2MonitorLayer (src/scenes/drop2Monitor.ts), so the rig's punches and shakes never streak or double it; it still gets each part's
// look (in the arcade the 8-bit pass pixelates it like the arcade's own HUD; in the mirror trap it is drawn after the kaleidoscope, never
// mirrored). Constructible in Node: no GL before init().
import type * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type FontRole, cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { type HeroRect, SLOT_CAPACITY, SLOT_STRINGS, type SlotAdvances, slotContent } from '../shots/drop2SwitchSlot.ts';
import { advanceOf } from './swiss.ts';

const FOV = 20;
const SCREEN = frontal(fillDistance(1080, FOV), 0, 0, FOV);
/** Each character once (the space too, so the line keeps its real word spacing). */
const chars = (strings: readonly string[]): string[] => [...new Set([...strings.join(''), ' '])];

export class Drop2SlotLayer {
  private layer: FlatLayer | null = null;
  private adv: SlotAdvances | null = null;
  private readonly owned: { dispose(): void }[] = [];
  /** His rect in the wave when a wave other than v09's draws him (DROP2_THREADS.waveStyle 'mochi'). */
  private readonly heroRect: HeroRect | undefined;

  constructor(o: { heroRect?: HeroRect } = {}) {
    this.heroRect = o.heroRect;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.layer) return;
    await loadFonts();
    const atlas = (strings: readonly string[], role: FontRole, weight: number, fontPx: number): GlyphAtlas => {
      const a = buildGlyphAtlas(chars(strings), (px) => `${weight} ${px}px ${cssStack(role)}`, { fontPx, radius: Math.round(fontPx / 8), size: 1024 });
      this.owned.push(a.texture);
      return a;
    };
    const display = atlas(SLOT_STRINGS.display, 'display', 900, 96);
    const mono = atlas(SLOT_STRINGS.mono, 'mono', 700, 64);
    const dot = atlas(SLOT_STRINGS.dot, 'dot', 400, 64);
    const jp = atlas(SLOT_STRINGS.jp, 'jp', 700, 96);
    this.adv = { display: advanceOf(display), mono: advanceOf(mono), dot: advanceOf(dot), jp: advanceOf(jp) };
    this.layer = new FlatLayer({ atlases: { display, mono, dot, jp }, blend: 'normal', aspect: size.width / size.height, shapes: SLOT_CAPACITY.shapes, glyphs: SLOT_CAPACITY.glyphs });
    this.owned.push(this.layer);
  }

  /** Draws the slot for output frame `frame` over `target` (normal blending); nothing outside its frames. */
  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    if (!this.layer) return;
    const c = slotContent(frame, this.adv!, this.heroRect);
    if (c.under.length === 0 && c.over.length === 0) return;
    this.layer.draw(gl, target, SCREEN, c, null);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.layer = null;
  }
}
