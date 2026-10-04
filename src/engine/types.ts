import type * as THREE from 'three';
import { type ComicInkLook, mixComicInk } from './post/comicModel.ts';
import { type KaleidoLook, mixKaleido } from './post/kaleidoMath.ts';
import { type PixelLook, mixPixel } from './post/pixelMath.ts';
import { type RisoPrintLook, mixRisoPrint } from './post/risoModel.ts';
import type { Segment, Temporal } from './temporal.ts';
import type { View } from './view.ts';

export type Quality = 'draft' | 'final';

/** The instant being drawn. `frame` may be fractional (motion-blur samples) and slightly outside the film. */
export type FrameContext = {
  frame: number;
  /** The instant for cameras and the screen-space rig: `frame` inside the shutter, the shutter-open instant for phosphor-tail sub-frames (their camera must not ghost). */
  cam: number;
  /** Seconds since the start of the composition. */
  t: number;
  /** Beats since the start of the composition. */
  beat: number;
  quality: Quality;
  /** Render target size in device pixels. */
  width: number;
  height: number;
};

/** Finishing for one output frame. */
export type Look = {
  toneMapping: 'linear' | 'agx';
  /** Multiplies the HDR image before bloom and tone mapping. */
  exposure: number;
  bloom: { intensity: number; threshold: number; smoothing: number; radius: number };
  /** Chromatic aberration offset in UV units; 0 disables it. */
  aberration: number;
  /** Film grain strength, 0–1. */
  grain: number;
  /** Vignette darkness, 0–1. */
  vignette: number;
  /** Mix to white after tone mapping, in display space (0–1): the downbeat flash. */
  flash?: number;
  /** CRT screen (terminal world); absent or amount 0 = off. `band` (0–1, top → bottom) is where the brighter refresh band rolls. */
  crt?: { amount: number; curvature: number; scanlines: number; lines: number; grille: number; band?: number };
  /**
   * The 字符闪 character flash (src/score/cuts.ts, src/engine/post/glyphFlash.ts): the finished picture as coloured characters on black.
   * `amount` is the share of the cells that turn (absent or 0 = off, 1 = all of them); `cell` the cell height in px at 1080p. The
   * Director adds the score's flashes; a scene (a transition) may set its own, and the stronger wins.
   */
  glyphs?: { amount: number; cell: number };
  /**
   * The kaleidoscope (src/engine/post/kaleidoscope.ts; every field: KaleidoLook in post/kaleidoMath.ts): the picture mirrored into
   * N-fold symmetry, or a wallpaper of mandalas. Absent or amount 0 = off (its pass is skipped and costs nothing). It folds the
   * exposed HDR sum first, before the Riso print, the comic and the finishing; the screen overlay (a readout) is drawn after it,
   * unmirrored. To draw a hero unmirrored over a mirrored feed inside a scene, use post/effectQuad.ts instead.
   */
  kaleido?: KaleidoLook;
  /**
   * The Riso print (src/engine/post/risoPrint.ts; every field: RisoPrintLook in post/risoModel.ts): the picture printed in pink, blue
   * and yellow on paper; `night` prints space as solid ink, `power` turns the room light off and the plates on as neon (HDR: the
   * bloom makes the glow). Absent or amount 0 = off. Runs on the exposed HDR sum before the finishing (bloom, grain and vignette land
   * on the print); the screen overlay is drawn after it, clean.
   */
  riso?: RisoPrintLook;
  /**
   * The comic book (src/engine/post/comicInk.ts; every field: ComicInkLook in post/comicModel.ts): the club's palette, Ben-Day dots,
   * keylines, plates off register, speed lines. Absent, or amount 0 without lines = off. Runs after the Riso print (never on with
   * it in practice), before the finishing; the screen overlay is drawn after it, clean.
   */
  comic?: ComicInkLook;
  /**
   * The 8-bit look (src/engine/post/pixel.ts; every field: PixelLook in post/pixelMath.ts): game pixels, a palette or posterise, a
   * dither, scanlines. Absent or amount 0 = off. Runs on the finished display colours, after the finishing and before the character
   * flash and the CRT, so the screen overlay is pixelated with the picture.
   */
  pixel?: PixelLook;
};

export const FLAT_LOOK: Look = {
  toneMapping: 'linear',
  exposure: 1,
  bloom: { intensity: 0, threshold: 1, smoothing: 0.1, radius: 0.7 },
  aberration: 0,
  grain: 0,
  vignette: 0,
};

/** Anything the pipeline can draw: a test scene, a shot, the whole film. */
export interface Renderable {
  /** Builds GPU resources once per browser tab. */
  init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void>;
  /** Draws instant `ctx` into `target`. Must depend on `ctx` only. */
  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void;
  /** Finishing for integer output frame `frame`. */
  look(frame: number): Look;
  /** Sub-frame sampling for output frame `frame`; the pipeline uses DEFAULT_TEMPORAL when absent. */
  temporal?(frame: number): Temporal;
  /** The shot span that contains output frame `frame`; its sub-frames stay inside it. */
  segment?(frame: number): Segment;
  /** Screen-space move of the finished picture at instant `frame` (may be fractional); none when absent. */
  view?(frame: number): View;
  /**
   * Draws a screen readout over integer output frame `frame`, once, into `target` (the summed sub-frames, before the look): fixed to the
   * screen, so the view's punches and shakes and the motion blur never move, streak or double it; it still gets the look (exposure,
   * bloom, tone mapping, flash, CRT). (Named so it cannot clash with a scene's own `overlay` layer.)
   */
  screenOverlay?(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void;
  dispose(): void;
}

/**
 * A finishing between `a` (t = 0) and `b` (t = 1): the numbers blend; the tone mapping, the CRT and the character flash come from
 * whichever is nearer; the kaleidoscope, Riso print, comic and 8-bit look blend through their own helpers (a side without one fades
 * it in from amount 0 with the other side's settings) and are left out when neither side has one.
 */
export function mixLook(a: Look, b: Look, t: number): Look {
  const m = (x: number, y: number) => x + (y - x) * t;
  const near = t < 0.5 ? a : b;
  const kaleido = mixKaleido(a.kaleido, b.kaleido, t);
  const riso = mixRisoPrint(a.riso, b.riso, t);
  const comic = mixComicInk(a.comic, b.comic, t);
  const pixel = mixPixel(a.pixel, b.pixel, t);
  return {
    toneMapping: near.toneMapping,
    exposure: m(a.exposure, b.exposure),
    bloom: { intensity: m(a.bloom.intensity, b.bloom.intensity), threshold: m(a.bloom.threshold, b.bloom.threshold), smoothing: m(a.bloom.smoothing, b.bloom.smoothing), radius: m(a.bloom.radius, b.bloom.radius) },
    aberration: m(a.aberration, b.aberration),
    grain: m(a.grain, b.grain),
    vignette: m(a.vignette, b.vignette),
    flash: m(a.flash ?? 0, b.flash ?? 0),
    crt: near.crt,
    ...(near.glyphs ? { glyphs: near.glyphs } : {}),
    ...(kaleido ? { kaleido } : {}),
    ...(riso ? { riso } : {}),
    ...(comic ? { comic } : {}),
    ...(pixel ? { pixel } : {}),
  };
}
