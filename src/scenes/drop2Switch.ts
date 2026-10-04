// S31S THE SWITCH, drop2 9.1–10.1 − 1 (2.5D, Defender v2.0's POV, half time) (builder S · SWITCH; build sheet notes/bid2/drop2-sheet2.md
// §3 "The switch", §4.7, §5 #10–#12, §6.3; design notes/extend/drop2-final.md §3.2, §4.5, §4.7): the X-ray deepens to cyanotype; his
// font is exploded and his bytes read (the film's one SIGNATURE MATCH); a red box on the backbeat; amber copies spill from every box; the
// flood, and compass arcs drafting the wave. The shots are pure (src/shots/drop2Switch.ts timing, camera and contracts;
// drop2SwitchFrame.ts the content per layer; drop2SwitchType.ts his glyphs' real contours, read here from the hero's font file). This class
// draws what they return, back to front: the sheet and its grid, the leaking light (additive, behind him), the X-ray fill, the blueprint
// planes, Defender's red, the POV's scanlines, his amber copies (after the POV: its eyes cannot render amber) and the flood, the HUD. Constructible in
// Node (the dispatcher's tests build it): no GL before init(). Tests: tests/drop2Switch.test.ts, drop2SwitchType.test.ts, drop2SwitchFrame.test.ts.
import { staticFile } from 'remotion';
import type * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { loadOpentype } from '../engine/extrude.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type FontRole, cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { switchLook, switchSegment, switchTemporal } from '../shots/drop2Switch.ts';
import { SWITCH_STRINGS, type SwitchAdvances, switchFrame } from '../shots/drop2SwitchFrame.ts';
import { FACE_CHAR_ADVANCE, type FacePlans, type PathCmd, facePlans } from '../shots/drop2SwitchType.ts';
import type { ScenePart } from './drop2Stub.ts';
import { advanceOf } from './swiss.ts';

/** The hero's face font (M PLUS Rounded 1c ExtraBold): its outlines are what Defender v2.0 reads. */
const HERO_FONT = 'fonts/mplus-rounded-1c-extrabold.ttf';
const FOV = 20;
/** The screen's own camera: one unit a px at 1080p, origin at the frame's centre, y up. */
const SCREEN = frontal(fillDistance(1080, FOV), 0, 0, FOV);
const chars = (strings: readonly string[]): string[] => [...new Set(strings.join(''))].filter((c) => c !== ' ');

type Layers = Record<'grid' | 'fill' | 'blue' | 'red' | 'light' | 'scan' | 'amber' | 'hud', FlatLayer>;

export class Drop2Switch implements ScenePart {
  private plans: FacePlans | null = null;
  private adv: SwitchAdvances | null = null;
  private layers: Layers | null = null;
  private readonly owned: { dispose(): void }[] = [];
  /** What Defender drafts on the flood: v09's golden curl, or the mochi wave's outline (DROP2_THREADS.waveStyle 'mochi'). */
  private readonly draft: 'curl' | 'mochi';

  constructor(o: { draft?: 'curl' | 'mochi' } = {}) {
    this.draft = o.draft ?? 'curl';
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.layers) return;
    await loadFonts();
    const font = await loadOpentype(staticFile(HERO_FONT));
    this.plans = facePlans((ch) => ({ cmds: font.getPath(ch, 0, 0, font.unitsPerEm).commands as PathCmd[], advance: FACE_CHAR_ADVANCE[ch] }), font.unitsPerEm);
    const atlas = (strings: readonly string[], role: FontRole, weight: number, o: { fontPx: number; radius: number; size: number }): GlyphAtlas => {
      const a = buildGlyphAtlas(strings, (px) => `${weight} ${px}px ${cssStack(role)}`, o);
      this.owned.push(a.texture);
      return a;
    };
    const mono = atlas(chars(SWITCH_STRINGS.mono), 'mono', 700, { fontPx: 64, radius: 8, size: 1024 });
    const display = atlas(chars(SWITCH_STRINGS.display), 'display', 900, { fontPx: 160, radius: 20, size: 2048 });
    const jp = atlas(chars(SWITCH_STRINGS.jp), 'jp', 700, { fontPx: 96, radius: 12, size: 512 });
    const rounded = atlas([...SWITCH_STRINGS.rounded], 'rounded', 800, { fontPx: 160, radius: 20, size: 2048 });
    this.adv = { mono: advanceOf(mono), display: advanceOf(display), jp: advanceOf(jp), rounded: advanceOf(rounded) };
    const aspect = size.width / size.height;
    const layer = (atlases: Record<string, GlyphAtlas>, blend: 'normal' | 'add', shapes: number, glyphs: number): FlatLayer => {
      const l = new FlatLayer({ atlases, blend, aspect, shapes, glyphs });
      this.owned.push(l);
      return l;
    };
    this.layers = {
      grid: layer({}, 'normal', 512, 16),
      fill: layer({ rounded }, 'normal', 8, 16),
      blue: layer({ mono }, 'normal', 4096, 256),
      red: layer({ mono }, 'normal', 2048, 32),
      light: layer({}, 'add', 256, 16),
      scan: layer({}, 'normal', 512, 16),
      amber: layer({ rounded }, 'normal', 8, 1024),
      hud: layer({ display, mono, jp }, 'normal', 2048, 512),
    };
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const L = this.layers!;
    const c = switchFrame(ctx.frame, this.plans!, this.adv!, ctx.cam, this.draft);
    L.grid.draw(gl, target, c.pose, { under: c.grid, glyphs: {}, over: [] }, { color: c.ground, grain: 0 });
    // The light leaks from behind him: under his lines (backlit) and Defender's box.
    L.light.draw(gl, target, c.pose, { under: c.light, glyphs: {}, over: [] }, null);
    L.fill.draw(gl, target, c.pose, { under: [], glyphs: { rounded: c.fill }, over: [] }, null);
    L.blue.draw(gl, target, c.pose, { under: c.blue, glyphs: { mono: c.blueText }, over: [] }, null);
    L.red.draw(gl, target, c.pose, { under: c.red, glyphs: { mono: c.redText }, over: [] }, null);
    L.scan.draw(gl, target, SCREEN, { under: c.scan, glyphs: {}, over: [] }, null);
    L.amber.draw(gl, target, c.pose, { under: [], glyphs: { rounded: c.amber }, over: [] }, null);
    if (c.flood.length) L.amber.draw(gl, target, SCREEN, { under: [], glyphs: { rounded: c.flood }, over: [] }, null);
    L.hud.draw(gl, target, SCREEN, { under: c.hud, glyphs: c.hudText, over: [] }, null);
  }

  look(frame: number): Look {
    return switchLook(frame);
  }

  temporal(frame: number): Temporal {
    return switchTemporal(frame);
  }

  segment(frame: number): Segment {
    return switchSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.layers = null;
  }
}
