// Bridge A (v08), X02, the part 'bridgeA' (src/score/bridgeA.ts): the breath between the event horizon's point and the comic club's first
// dot, on the GPU. Its picture is the pure draw list of src/shots/bridgeA.ts — the club's splash world printed round his eye a layer a beat
// while the camera pushes in on it — executed with the club's own ink kit: the club's 'face' atlas (src/content/club.ts INK_ATLASES, cut
// as src/scenes/clubInk.ts cuts it, so the face is club 1.1's face to the pixel) and one flat layer that paints over (the bridge prints
// nothing in multiply and needs no polygons). Its look (the cosmos's bloom going, the club's comic print coming in), its sub-frames and its
// segment (its own bar) come from the same module. Constructible in Node (tests build it): no GL before init().
import type * as THREE from 'three';
import { INK_ATLASES } from '../content/club.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { BRIDGE_A_SEGMENT, bridgeAAt, bridgeALook, bridgeATemporal } from '../shots/bridgeA.ts';
import type { InkLayout } from '../shots/clubInkKit.ts';
import { advanceOf } from './swiss.ts';

/** Atlas SDF reach, as the club's scene (keylines up to 0.234 em). */
const RADIUS = 30;

export class BridgeAScene implements Renderable {
  private ink: FlatLayer | null = null;
  private layout: InkLayout | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const a = INK_ATLASES.face;
    const face = buildGlyphAtlas(a.chars, (px) => `${a.weight} ${px}px ${cssStack(a.role)}`, { fontPx: 96, radius: RADIUS });
    this.ink = new FlatLayer({ atlases: { face }, blend: 'normal', aspect: size.width / size.height, shapes: 8192, glyphs: 512 });
    const adv = advanceOf(face);
    // Only the face atlas is drawn here; the layout's other atlases (the club's lettering) are never read by the bridge.
    this.layout = { advance: { face: adv, sfx: adv, ui: adv, display: adv, mono: adv, readout: adv } };
    this.owned.push(face.texture, this.ink);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    for (const d of bridgeAAt(ctx.frame, this.layout!)) this.ink!.draw(gl, target, d.pose, d.content, d.paper ?? null);
  }

  look(frame: number): Look {
    return bridgeALook(frame);
  }

  temporal(frame: number): Temporal {
    return bridgeATemporal(frame);
  }

  segment(): Segment {
    return BRIDGE_A_SEGMENT;
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
