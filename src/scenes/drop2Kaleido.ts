// S31X THE MIRROR TRAP, drop2 16.1–18.1 − 1 (2D post), layer 5/5 mirror.trap (builder act2b; build sheet notes/bid2/drop2-sheet2.md
// §3.16–17, §4.13, from the design notes/extend/drop2-final.md): the brightest frame of the film; the rings born at the centre; ∞
// copies; the clamp's red star; [DEFENDER] giving up; the reticle that flies off; the unfold and the whip-pan into the reel.
// The pure picture is src/shots/drop2Kaleido.ts. This class draws, every sub-frame: the chamber (two flat layers: inks, then light) into
// its own half-float target; the fold (post/kaleidoscope.ts through post/effectQuad.ts) from that target into the frame; then, unmirrored,
// his face, the brass eyepiece, the hat and the whip's NEON card; the give-up pill over them; the light (three flat layers).
// Constructible in Node (no GL before init). Tests: tests/drop2Kaleido.test.ts.
import * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { EffectQuad } from '../engine/post/effectQuad.ts';
import { KaleidoscopeEffect } from '../engine/post/kaleidoscope.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { REEL_CAST } from '../content/castDrop2.ts';
import { linear } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { PALETTES } from '../shots/drop2Shared.ts';
import {
  type InkBox,
  KALEIDO_INK,
  KALEIDO_STRINGS,
  KALEIDO_WHOLE,
  type KaleidoFont,
  type KaleidoLayout,
  TILE_FRAG,
  chamberAt,
  foldAt,
  inkKey,
  kaleidoLook,
  kaleidoSegment,
  kaleidoTemporal,
  overAt,
  wallpaperAt,
} from '../shots/drop2Kaleido.ts';
import type { ScenePart } from './drop2Stub.ts';

const FOV = 20;
const SCREEN = frontal(fillDistance(1080, FOV), 0, 0, FOV);
const FONTS: Readonly<Record<KaleidoFont, (px: number) => string>> = {
  rounded: (px) => `800 ${px}px ${cssStack('rounded')}`,
  jp: (px) => `900 ${px}px ${cssStack('jp')}`,
  display: (px) => `900 ${px}px ${cssStack('display')}`,
};
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
const advanceOf =
  (atlas: GlyphAtlas): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? 0.3;

/** A string's ink box at 1 em, measured as the atlas draws it (textBaseline middle, from the string's start). */
function measureInk(font: (px: number) => string, text: string): InkBox {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const g = c.getContext('2d');
  if (!g) throw new Error('Canvas 2D is unavailable');
  g.font = font(200);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const m = g.measureText(text);
  return { left: -m.actualBoundingBoxLeft / 200, right: m.actualBoundingBoxRight / 200, up: m.actualBoundingBoxAscent / 200, down: m.actualBoundingBoxDescent / 200 };
}

export class Drop2Kaleido implements ScenePart {
  private chamberInk: FlatLayer | null = null;
  private chamberLight: FlatLayer | null = null;
  private overInk: FlatLayer | null = null;
  /** The give-up pill and its line: over the ring's engraved bytes (same atlas), under the light. */
  private overType: FlatLayer | null = null;
  private overLight: FlatLayer | null = null;
  private chamber: THREE.WebGLRenderTarget | null = null;
  private fold: EffectQuad | null = null;
  /** The finished picture before the ∞ wallpaper tiles it (17.2 → 17.3). */
  private composite: THREE.WebGLRenderTarget | null = null;
  private tile: FullscreenQuad | null = null;
  private layout: KaleidoLayout | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.chamberInk) return;
    await loadFonts();
    const rounded = buildGlyphAtlas([...chars([...KALEIDO_STRINGS.rounded, 'ω', REEL_CAST[0].face]), ...KALEIDO_WHOLE], FONTS.rounded, { fontPx: 160, radius: 20, size: 2048 });
    const jp = buildGlyphAtlas(chars(KALEIDO_STRINGS.jp), FONTS.jp, { fontPx: 128, radius: 16, size: 512 });
    const display = buildGlyphAtlas(chars(KALEIDO_STRINGS.display), FONTS.display, { fontPx: 128, radius: 16, size: 2048 });
    const aspect = size.width / size.height;
    this.chamberInk = new FlatLayer({ atlases: { rounded, jp }, blend: 'normal', aspect, shapes: 8192, glyphs: 2048 });
    this.chamberLight = new FlatLayer({ atlases: {}, blend: 'add', aspect, shapes: 2048 });
    this.overInk = new FlatLayer({ atlases: { rounded, display }, blend: 'normal', aspect, shapes: 1024, glyphs: 512 });
    this.overType = new FlatLayer({ atlases: { display }, blend: 'normal', aspect, shapes: 16, glyphs: 64 });
    this.overLight = new FlatLayer({ atlases: { rounded }, blend: 'add', aspect, shapes: 1024, glyphs: 256 });
    this.chamber = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.fold = new EffectQuad(new KaleidoscopeEffect());
    this.composite = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    const rim = linear(PALETTES.kaleido.brass);
    this.tile = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, resolution: { value: new THREE.Vector2(size.width, size.height) }, cell: { value: 1080 }, scale: { value: 1 }, rimColor: { value: new THREE.Vector3(rim[0], rim[1], rim[2]) }, rimAlpha: { value: 1 } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: TILE_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
    const ink = new Map<string, InkBox>();
    for (const [font, text] of KALEIDO_INK) ink.set(inkKey(font, text), measureInk(FONTS[font], text));
    this.layout = { advance: { rounded: advanceOf(rounded), jp: advanceOf(jp), display: advanceOf(display) }, ink };
    this.owned.push(rounded.texture, jp.texture, display.texture, this.chamberInk, this.chamberLight, this.overInk, this.overType, this.overLight, this.chamber, this.fold, this.fold.effect, this.composite, this.tile);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const c = chamberAt(f);
    this.chamberInk!.draw(gl, this.chamber!, SCREEN, c.back, { color: c.ground, grain: 0 });
    this.chamberLight!.draw(gl, this.chamber!, SCREEN, c.light, null);
    (this.fold!.effect as KaleidoscopeEffect).configure(foldAt(f));
    const wall = wallpaperAt(f);
    const dest = wall ? this.composite! : target;
    this.fold!.draw(gl, this.chamber!.texture, dest);
    const o = overAt(f, this.layout!);
    this.overInk!.draw(gl, dest, SCREEN, o.back, null);
    this.overType!.draw(gl, dest, SCREEN, o.type, null);
    this.overLight!.draw(gl, dest, SCREEN, o.light, null);
    if (wall) {
      // The ∞ wallpaper: the picture tiled in shrinking hex cells, then him in front, full size.
      const u = (this.tile!.mesh.material as THREE.ShaderMaterial).uniforms;
      u.map.value = this.composite!.texture;
      (u.resolution.value as THREE.Vector2).set(target.width, target.height);
      u.cell.value = wall.cell;
      u.scale.value = wall.scale;
      u.rimAlpha.value = Math.min(1, Math.max(0, (1500 - wall.cell) / 420));
      this.tile!.render(gl, target);
      this.overInk!.draw(gl, target, SCREEN, o.back, null);
      this.overType!.draw(gl, target, SCREEN, o.type, null);
      this.overLight!.draw(gl, target, SCREEN, o.light, null);
    }
  }

  look(frame: number): Look {
    return kaleidoLook(frame);
  }

  temporal(frame: number): Temporal {
    return kaleidoTemporal(frame);
  }

  segment(frame: number): Segment {
    return kaleidoSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.chamberInk = this.chamberLight = this.overInk = this.overType = this.overLight = null;
    this.chamber = null;
    this.composite = null;
    this.tile = null;
    this.fold = null;
  }
}
