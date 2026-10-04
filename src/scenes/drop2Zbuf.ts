// Drop 2's second part, drop2 3.1–5.1 − 1: S29 Z-BUFFER, the one real 3D of drop 2 and the outro (builder ZBUF; build sheet notes/d2build/sheet.md
// §4.2 rows drop2 3.1–4.4&, §5.6, §9 H1–H2). The 3D is raymarched on the CPU by src/shots/drop2Zbuf.ts — his glyph's signed distance
// (M PLUS Rounded 1c Black, rasterised exactly as S04 rasterised its giant face, on S04's grid at twice its sub-pixels), extruded
// 0.42 em with rounded edges, and E7's donut.c torus (src/shots/drop2Donut.ts) — and drawn as characters on a grid: each cell's rays
// (supersampled; on fast moves each at its own instant of the shutter) give one glyph in a dialect chosen by depth. This class only
// builds the atlases and the flat layers in `init` and copies the cells into them: `base` (normal: grounds, the backdrop's dim dots on
// their plane, the collapse's paper, brutal tiles and hatching, Swiss digits, the cube's last outline), `ink` (multiply: the Riso plates'
// tints and glyphs), `light` (add: terminal, donut, LED, neon, intro bar 4, his BRUTAL features), `top` (normal: Defender's 2D scan line and its
// tag on drop2 3.2, over everything; rev 3). The characters are resolved once per output frame (one sub-frame).
// renderHero(gl, frame, target): the same pass with no backdrop — Drop2Slash draws it over S28's whipping cube on drop2 3.1 − 6 … 3.1 − 1 (cells
// 13.5 × 24.75, TERMINAL, yaw 0, no extrusion) so drop2 3.1 starts from the same pixels. Drop2Scene initialises and disposes this part.
// Tests: tests/drop2Zbuf.test.ts, tests/drop2ZbufDonut.test.ts.
import type * as THREE from 'three';
import { rasterParts } from '../actors/asciiFace.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { CAPACITY, FACE_TEXT, type Hero, ZBUF_GLYPHS, type ZContent, heroFromRaster, zbufContent, zbufLook, zbufSegment, zbufTemporal } from '../shots/drop2Zbuf.ts';
import { FACE } from '../shots/intro.ts';
import { FOV, FRONT } from '../shots/swiss.ts';

/** The flat fields' camera: 1 unit = 1 layout px. */
const SCREEN = frontal(FRONT, 0, 0, FOV);
/** His raster: S04's grid (FACE) at this many times its sub-pixels — the same fit, a finer distance field. */
const SUPERSAMPLE = 2;

export class Drop2Zbuf implements Renderable {
  private base: FlatLayer | null = null;
  private ink: FlatLayer | null = null;
  private light: FlatLayer | null = null;
  private top: FlatLayer | null = null;
  private hero: Hero | null = null;
  /** The last frame's cells (a pure function of the output frame and the mode, so caching them is deterministic). */
  private cached: { key: string; content: ZContent } | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.base) return;
    await loadFonts();
    const mono = buildGlyphAtlas(ZBUF_GLYPHS.mono, (px) => `500 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 24, size: 2048 });
    const digits = buildGlyphAtlas(ZBUF_GLYPHS.digits, (px) => `900 ${px}px ${cssStack('display')}`, { fontPx: 96, radius: 16, size: 1024 });
    const aspect = size.width / size.height;
    this.base = new FlatLayer({ atlases: { mono, digits }, blend: 'normal', aspect, shapes: CAPACITY.shapes, glyphs: CAPACITY.glyphs });
    this.ink = new FlatLayer({ atlases: { mono }, blend: 'multiply', aspect, shapes: CAPACITY.tints, glyphs: CAPACITY.glyphs });
    this.light = new FlatLayer({ atlases: { mono }, blend: 'add', aspect, shapes: 16, glyphs: CAPACITY.glyphs });
    this.top = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect, shapes: 256, glyphs: 64 });
    // S04's own raster call (scenes/intro.ts), at finer sub-pixels: in intro bar 4's frame he lands in its cells.
    const raster = rasterParts(FACE_TEXT, (px) => `900 ${px}px ${cssStack('rounded')}`, FACE.cols, FACE.rows, FACE.subX * SUPERSAMPLE, FACE.subY * SUPERSAMPLE);
    this.hero = heroFromRaster(raster);
    this.owned.push(mono.texture, digits.texture, this.base, this.ink, this.light, this.top);
  }

  private content(frame: number, mode: 'full' | 'hero'): ZContent {
    const key = `${Math.floor(frame + 0.5)}:${mode}`;
    if (this.cached?.key !== key) this.cached = { key, content: zbufContent(frame, this.hero!, mode) };
    return this.cached.content;
  }

  private draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, c: ZContent): void {
    this.base!.draw(gl, target, SCREEN, c.base, c.paper ? { color: c.paper, grain: 0 } : null);
    if ((c.ink.glyphs.mono ?? []).length > 0 || c.ink.under.length > 0) this.ink!.draw(gl, target, SCREEN, c.ink, null);
    this.light!.draw(gl, target, SCREEN, c.light, null);
    if (c.top.under.length > 0) this.top!.draw(gl, target, SCREEN, c.top, null);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.draw(gl, target, this.content(ctx.frame, 'full'));
  }

  /** S28's pre-roll hero layer (drop2 3.1 − 6 … 3.1 − 1): his cells only (TERMINAL, yaw 0, no extrusion, 13.5 × 24.75), drawn over `target`. */
  readonly renderHero = (gl: THREE.WebGLRenderer, frame: number, target: THREE.WebGLRenderTarget): void => {
    this.draw(gl, target, this.content(frame, 'hero'));
  };

  look(frame: number): Look {
    return zbufLook(frame);
  }

  /** The characters are resolved at the output frame: one sub-frame. */
  temporal(frame: number): Temporal {
    return zbufTemporal(frame);
  }

  segment(frame: number): Segment {
    return zbufSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.base = this.ink = this.light = this.top = null;
    this.cached = null;
  }
}
