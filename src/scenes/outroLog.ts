// The ending's first part, outro 1.1–2.1 − 1: S33 CORE DUMP and the CRT off (builder O · OUTRO; build sheet notes/d2build/sheet.md §4.2
// rows outro 1.1–1.4&, §5.12, §5.13, §9 H5–H6).
// What it draws: drop 2's frozen field (H5, rebuilt from T7_GRID and his (×ω×) mask measured here from the font — never from drop 2's
// GPU state) decoding in place on the intro's terminal grid into a hexdump and the crash log, then the printed lines scrolling up
// (the guest's exit and the stats, the backtrace three lines a frame, the table set back and `exit`, then the dying system's last
// lines) — dim texture once the decode has landed — while outro bar 1 stages its story large, one line a beat (iteration 2: cute dumped as
// an inverse bar, the flip, ┬─┬ノ(•ω•ノ), the promise of the wink's frame), under (×ω×) on his backing, grown and lit in the CRT's
// phosphor, with his twitch and his flick of life; the push about his face; then Enter, on outro 1.3 with the lost heartbeat (iteration
// 3): the picture squeezes to a white-hot line that holds the beat, dips into his ω on outro 1.4 and holds it — and the promise, drawn
// over the screen after the aperture, is left glowing under the line, fading like phosphor (lastWords). The log is drawn into the screen pass's picture — a light layer of mono glyphs on the
// terminal's glass; a normal layer with his backing, the staged band (or the inverse's pink bar and its dark type); an additive layer
// with the staged type and him (his phosphor blooms) — and the pass (src/scenes/outroScreen.ts) puts the aperture of
// src/shots/outroScreen.ts on the frame. Pure content in src/shots/outroLog.ts; strings in src/content/outro.ts. Tests:
// tests/outroLog.test.ts, tests/outroScreen.test.ts.
import type * as THREE from 'three';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { T7_GRID, T7_HERO } from '../shots/drop2Shared.ts';
import {
  type Coverage,
  type LogLayout,
  OUTRO_LOG_MONO,
  OUTRO_LOG_ROUNDED,
  buildLogLayout,
  lastWords,
  logBacking,
  logGlyphs,
  logHero,
  logPose,
  outroLogLook,
  outroLogSegment,
  outroLogTemporal,
  stagedLine,
} from '../shots/outroLog.ts';
import { screenAt } from '../shots/outroScreen.ts';
import { OutroScreenPass } from './outroScreen.ts';

const MONO = (px: number) => `500 ${px}px ${cssStack('mono')}`;
const ROUNDED = (px: number) => `${T7_HERO.weight} ${px}px ${cssStack('rounded')}`;
export const advanceOf = (atlas: GlyphAtlas): Advance => (ch) => atlas.entries.get(ch)?.advance ?? 0.28;

/**
 * His (×ω×) at the freeze (T7_HERO: M PLUS Rounded ExtraBold, ink 1020 px wide, centred (960, 540)) rasterised with Canvas 2D, and
 * its ink coverage of every T7 cell: the mask drop 2's field froze, so the hexdump prints what was there. Browser only.
 */
export function measureFrozenHero(): Coverage {
  const W = 1920;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const REF = 200;
  ctx.font = ROUNDED(REF);
  const m = ctx.measureText(T7_HERO.face);
  const px = (REF * T7_HERO.width) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
  ctx.font = ROUNDED(px);
  const box = ctx.measureText(T7_HERO.face);
  const x = T7_HERO.centre[0] - (box.actualBoundingBoxRight - box.actualBoundingBoxLeft) / 2;
  const y = T7_HERO.centre[1] + (box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2;
  ctx.fillStyle = '#fff';
  ctx.fillText(T7_HERO.face, x, y);
  const a = ctx.getImageData(0, 0, W, H).data;
  const cache = new Map<number, number>();
  return (col, row) => {
    const key = (row - T7_GRID.rows[0]) * 1000 + (col - T7_GRID.cols[0]);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const x0 = Math.round(T7_GRID.left + col * T7_GRID.cellW);
    const x1 = Math.round(T7_GRID.left + (col + 1) * T7_GRID.cellW);
    const y0 = Math.round(T7_GRID.top + row * T7_GRID.cellH);
    const y1 = Math.round(T7_GRID.top + (row + 1) * T7_GRID.cellH);
    let sum = 0;
    let n = 0;
    for (let yy = y0; yy < y1; yy++)
      for (let xx = x0; xx < x1; xx++) {
        n++;
        if (xx >= 0 && xx < W && yy >= 0 && yy < H) sum += a[(yy * W + xx) * 4 + 3] / 255;
      }
    const c = n > 0 ? sum / n : 0;
    cache.set(key, c);
    return c;
  };
}

export class OutroLog implements Renderable {
  private readonly screen = new OutroScreenPass();
  private readonly glyphs: Glyph[] = [];
  private readonly owned: { dispose(): void }[] = [];
  private light: FlatLayer | null = null;
  private solid: FlatLayer | null = null;
  private glow: FlatLayer | null = null;
  private layout: LogLayout | null = null;
  private advance: Advance | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const mono = buildGlyphAtlas(OUTRO_LOG_MONO, MONO, { size: 2048 });
    const rounded = buildGlyphAtlas(OUTRO_LOG_ROUNDED, ROUNDED, { fontPx: 160, radius: 20, size: 2048 });
    const aspect = size.width / size.height;
    this.light = new FlatLayer({ atlases: { mono }, blend: 'add', aspect, shapes: 16, glyphs: 8192 });
    this.solid = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect, shapes: 16, glyphs: 64 });
    this.glow = new FlatLayer({ atlases: { mono, rounded }, blend: 'add', aspect, shapes: 16, glyphs: 64 });
    this.layout = buildLogLayout(measureFrozenHero());
    this.advance = advanceOf(rounded);
    this.screen.init(size);
    this.owned.push(mono.texture, rounded.texture, this.light, this.solid, this.glow, this.screen);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const s = screenAt(ctx.frame);
    if (s.mode === 'picture') {
      const pic = this.screen.pic;
      this.screen.clearPic(gl);
      const pose = logPose(ctx.cam);
      // The phosphor tail ghosts the log's changes in place (its scroll is taken at ctx.cam); he and the staged lines are not phosphor
      // traces, so they are drawn whole at the shutter's instants (ctx.cam): his eyes' 2-frame flicks and each staged line's beat read
      // clean; his backing goes where he goes.
      const n = logGlyphs(ctx.frame, this.layout!, this.glyphs, ctx.cam);
      this.glyphs.length = n;
      this.light!.draw(gl, pic, pose, { under: [], glyphs: { mono: this.glyphs }, over: [] }, null);
      const staged = stagedLine(ctx.cam);
      const hero = logHero(ctx.cam, this.advance!);
      this.solid!.draw(gl, pic, pose, { under: [logBacking(ctx.cam), ...staged.under], glyphs: { mono: staged.dark }, over: [] }, null);
      this.glow!.draw(gl, pic, pose, { under: [], glyphs: { mono: staged.bright, rounded: hero.glyphs }, over: [] }, null);
    }
    this.screen.draw(gl, target, s, s.mode === 'picture');
    // The last words: over the screen, never squeezed — the last thing visible as the CRT goes to a line (additive: they glow).
    const words = lastWords(ctx.cam);
    if (words.bright.length > 0) this.glow!.draw(gl, target, logPose(ctx.cam), { under: [], glyphs: { mono: words.bright }, over: [] }, null);
  }

  look(frame: number): Look {
    return outroLogLook(frame);
  }

  temporal(frame: number): Temporal {
    return outroLogTemporal(frame);
  }

  segment(): Segment {
    return outroLogSegment();
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
