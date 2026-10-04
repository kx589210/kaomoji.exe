// Renderer B's screen overlay (cosmos 3.1 → 5.1; the layout: src/shots/cosmosSolarType.ts): the Powers-of-Ten labels, captions and legends
// and the big threat counts, typeset once per output frame after the Riso pass (clean of the print and the blur), before the bloom. The
// labels are cream with an amber glow edge (bars 17–18: "type with a glow edge"); a count's number is amber, its THREATS the Defender's
// red (print red while the power dial is under 0.5, neon red from there: cosmosKit defenderRed).
import type * as THREE from 'three';
import { COSMOS_ATLASES } from '../content/cosmos.ts';
import { type RGB, linear } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { FOV, FRONT, defenderRed } from '../shots/cosmosKit.ts';
import { type Ink, bTypeAt } from '../shots/cosmosSolarType.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const CREAM = linear('#FFE2B4', 1.25);
const AMBER = linear('#FFB23E', 1.5);
const PAPER = linear('#F2EDE3', 0.9);

export class TypeRenderer {
  private layer: FlatLayer | null = null;
  private advance: { display: (ch: string) => number; mono: (ch: string) => number } | null = null;
  private readonly owned: { dispose(): void }[] = [];

  /** Builds its atlases (call after loadFonts()). */
  init(size: { width: number; height: number }): void {
    const D = COSMOS_ATLASES.display;
    const M = COSMOS_ATLASES.mono;
    const display = buildGlyphAtlas([...D.chars], (px) => `${D.weight} ${px}px ${cssStack(D.role)}`, { fontPx: 160, radius: 20, size: 2048 });
    const mono = buildGlyphAtlas([...M.chars], (px) => `${M.weight} ${px}px ${cssStack(M.role)}`, { fontPx: 64, radius: 8, size: 1024 });
    this.layer = new FlatLayer({ atlases: { display, mono }, blend: 'normal', aspect: size.width / size.height, shapes: 4, glyphs: 256 });
    this.advance = { display: advanceOf(display), mono: advanceOf(mono) };
    this.owned.push(display.texture, mono.texture, this.layer);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const red = linear(defenderRed(frame), 1.3);
    const ink = (k: Ink): RGB => (k === 'cream' ? CREAM : k === 'amber' ? AMBER : k === 'red' ? red : PAPER);
    const display: Glyph[] = [];
    const mono: Glyph[] = [];
    for (const g of bTypeAt(frame, this.advance!)) {
      const glyph: Glyph = { ch: g.ch, x: g.x, y: g.y, size: g.size, color: ink(g.ink), alpha: g.alpha, rot: g.rot, stretch: g.stretch };
      if (g.atlas === 'display') display.push(g.ink === 'cream' ? { ...glyph, outline: 0.05, outlineColor: linear('#FFB23E', 0.9) } : glyph);
      else mono.push(glyph);
    }
    this.layer!.draw(gl, target, SCREEN, { under: [], glyphs: { display, mono }, over: [] }, null);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
