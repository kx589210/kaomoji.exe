// The ending's last part, outro 2.1–end − 1: S34 STILL HERE (builder O · OUTRO; build sheet notes/d2build/sheet.md §4.2 rows
// outro 2.1–2.4&, §5.13, §9 H6).
// What it draws: the ω-dipped line (H6) pried open from inside into a vesica lens on the first tonic chord — its lower lid relaxing from
// the ω — inside it the terminal's glass with ヽ(•ω•)ﾉ in phosphor amber holding the lids through the wink (•ω<)✧, which lands
// exactly on WINK (the frame the log promised; the only wink in the film), then the arms sliding away, the ✧ twinkles, `> kaomoji --run --party█` recalled on
// outro 2.3, the cursor with S01's blinks (CURSOR) and phosphor fade, the rim's chase; outside on black, W5 (`[ OK ] (•ω•) survived`) in
// the monitor's slot (screenOverlay). The interior is drawn into the screen pass's picture; the mask and rim are the pass's
// (src/scenes/outroScreen.ts; post/crt.ts is the lead's). The film's last frame keeps the CRT settings frame 0 starts from. Pure
// content in src/shots/outroLens.ts; strings in src/content/outro.ts. Tests: tests/outroLens.test.ts, tests/outroScreen.test.ts.
import type * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { FOV, FRONT_DISTANCE } from '../shots/intro.ts';
import { OUTRO_LENS_MONO, OUTRO_LENS_ROUNDED, lensCommand, lensHero, outroLensLook, outroLensSegment, outroLensTemporal, w5Content } from '../shots/outroLens.ts';
import { screenAt } from '../shots/outroScreen.ts';
import { advanceOf } from './outroLog.ts';
import { OutroScreenPass } from './outroScreen.ts';

const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);
/** The wink's morph passes through a circle the size of his • (M PLUS Rounded's dot is ≈ 0.29 em). */
const DOT_PER_EM = 0.3;

export class OutroLens implements Renderable {
  private readonly screen = new OutroScreenPass();
  private readonly owned: { dispose(): void }[] = [];
  private inside: FlatLayer | null = null;
  private monitor: FlatLayer | null = null;
  private rounded: Advance | null = null;
  private mono: Advance | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const mono = buildGlyphAtlas(OUTRO_LENS_MONO, (px) => `500 ${px}px ${cssStack('mono')}`, { size: 2048 });
    const rounded = buildGlyphAtlas(OUTRO_LENS_ROUNDED, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 20, size: 2048 });
    const aspect = size.width / size.height;
    this.inside = new FlatLayer({ atlases: { rounded, mono }, blend: 'add', aspect, shapes: 16, glyphs: 64, circlePerEm: DOT_PER_EM });
    this.monitor = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect, shapes: 16, glyphs: 512 });
    this.rounded = advanceOf(rounded);
    this.mono = advanceOf(mono);
    this.screen.init(size);
    this.owned.push(mono.texture, rounded.texture, this.inside, this.monitor, this.screen);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const s = screenAt(ctx.frame);
    this.screen.clearPic(gl);
    const hero = lensHero(ctx.frame, this.rounded!);
    this.inside!.draw(gl, this.screen.pic, SCREEN, { under: [], glyphs: { rounded: hero.glyphs, mono: lensCommand(ctx.frame, this.mono!) }, over: [] }, null);
    this.screen.draw(gl, target, s, true);
  }

  /** W5, fixed to the screen outside the lens. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.monitor!.draw(gl, target, SCREEN, w5Content(frame, this.mono!), null);
  }

  look(frame: number): Look {
    return outroLensLook(frame);
  }

  temporal(frame: number): Temporal {
    return outroLensTemporal(frame);
  }

  segment(): Segment {
    return outroLensSegment();
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
