// What each new part of drop 2 is until its builder lands (build sheet notes/bid2/drop2-sheet2.md §9): a slate — the part's ground,
// its shot id, title and one idea, the hero where he stands on its first beat (src/shots/drop2Shared.ts HANDOFFS), the beat counter, a
// block on every kick and a progress bar — so the film plays end to end, a cut shows the beat and the hand-offs, and nobody mistakes it
// for the picture. And the bullet time's stand-in: the crash shot's last frame before it, held (the score's crashClock), which is what
// the orbit's front views must be.
// A builder replaces a stub by rewriting the part's own file (src/scenes/drop2Kernel.ts, drop2Switch.ts, drop2Wave.ts, drop2Arcade.ts,
// drop2Voxel.ts, drop2Memphis.ts, drop2Picto.ts, drop2Kaleido.ts, drop2Bullet.ts): same class name and constructor, the ScenePart
// contract (src/scenes/drop2.ts); the dispatcher needs no edit. Constructible in Node (tests build the dispatcher): no GL before init().
import type * as THREE from 'three';
import { DROP2_SLATES, SLATE_CHARS, type Slate, beatLabel } from '../content/drop2.ts';
import { fillDistance, frontal } from '../engine/camera.ts';
import { type RGB, linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import { FLAT_LOOK, type FrameContext, type Look, type Renderable } from '../engine/types.ts';
import { KICKS2 } from '../score/drop2.ts';
import { locate } from '../score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../score/tempo.ts';
import { textGlyphs } from '../shots/common.ts';
import { DROP2_PARTS, LAW, drop2Segment } from '../shots/drop2Shared.ts';

/** What every part of drop 2 implements: a Renderable that always answers look, temporal and segment. */
export type ScenePart = Renderable & { look(frame: number): Look; temporal(frame: number): Temporal; segment(frame: number): Segment };

/** A slate's part name (DROP2_PARTS). */
export type SlateName = keyof typeof DROP2_SLATES;

const FOV = 20;
/** A frontal camera at which one world unit is one px at 1080p (origin at the frame's centre, y up). */
const SCREEN = frontal(fillDistance(1080, FOV), 0, 0, FOV);
/** One sample, no blur: a slate does not move between its beats. */
const STILL: Temporal = { samples: 1, shutter: 0.5, persistence: 0 };
const advanceOf =
  (atlas: GlyphAtlas): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? 0.6;

/** The span of drop 2 a part draws (its rows of DROP2_PARTS, first to last). */
export const partSpan = (name: string): { from: number; to: number } => {
  const rows = DROP2_PARTS.filter((p) => p.name === name);
  if (rows.length === 0) throw new RangeError(`drop2Stub: no part '${name}'`);
  return { from: rows[0].from, to: rows[rows.length - 1].to };
};

/** The slate's content at output frame `frame` (pure): its shapes and its text lines (layout px, y down). */
export function slateContent(name: SlateName, frame: number): { shapes: { x: number; y: number; w: number; h: number; color: string; alpha: number }[]; lines: { text: string; x: number; y: number; size: number; align: number; color: string }[] } {
  const s: Slate = DROP2_SLATES[name];
  const span = partSpan(name);
  const f = Math.round(frame);
  const p = Math.min(1, Math.max(0, (f - span.from) / (span.to - span.from)));
  const kick = KICKS2.filter((k) => k <= f).pop();
  const lit = kick !== undefined && f - kick < 6 ? 1 - (f - kick) / 6 : 0;
  const { bar, beat } = locate(f);
  const b = Math.floor(beat + 1e-9);
  const sixteenth = Math.floor((beat - b) * 4 + 1e-9);
  return {
    shapes: [
      { x: 960 * p, y: 1074, w: 1920 * p, h: 12, color: s.ink, alpha: 0.6 },
      { x: 1800, y: 120, w: 120, h: 120, color: LAW.hero, alpha: 0.15 + 0.85 * lit },
    ],
    lines: [
      { text: `${s.shot} ${s.title}`, x: 60, y: 110, size: 44, align: 0, color: s.ink },
      { text: s.idea, x: 60, y: 170, size: 28, align: 0, color: s.ink },
      { text: s.hero.face, x: s.hero.x, y: s.hero.y, size: s.hero.width / 3, align: 0.5, color: LAW.hero },
      { text: beatLabel(bar, b + 1, sixteenth), x: 60, y: 1010, size: 56, align: 0, color: s.ink },
    ],
  };
}

/** A new part not built yet (see the file header). */
export class Drop2Stub implements ScenePart {
  protected readonly name: SlateName;
  private layer: FlatLayer | null = null;
  private advance: Advance | null = null;
  private readonly owned: { dispose(): void }[] = [];

  constructor(name: SlateName) {
    this.name = name;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.layer) return;
    await loadFonts();
    const mono = buildGlyphAtlas([...SLATE_CHARS].filter((c) => c !== ' '), (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 64, radius: 8, size: 1024 });
    this.layer = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect: size.width / size.height, shapes: 8, glyphs: 256 });
    this.advance = advanceOf(mono);
    this.owned.push(mono.texture, this.layer);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const c = slateContent(this.name, ctx.frame);
    const under: Shape[] = c.shapes.map((r) => ({ kind: 'rect', x: r.x - 960, y: 540 - r.y, w: r.w, h: r.h, color: linear(r.color), alpha: r.alpha }));
    const glyphs = c.lines.flatMap((l) => textGlyphs(l.text, { x: l.x - 960, y: 540 - l.y, size: l.size, color: linear(l.color), advance: this.advance!, align: l.align }));
    const ground: RGB = linear(DROP2_SLATES[this.name].ground);
    this.layer!.draw(gl, target, SCREEN, { under, glyphs: { mono: glyphs }, over: [] }, { color: ground, grain: 0 });
  }

  look(): Look {
    return FLAT_LOOK;
  }

  temporal(): Temporal {
    return STILL;
  }

  segment(frame: number): Segment {
    return drop2Segment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.layer = null;
  }
}

/**
 * Another part's instant `hold`, held (as src/scenes/hold.ts holds a tail): every sub-frame is the matching sub-frame of `hold`, with its
 * look, its photography (the shutter inside half a frame, no phosphor tail) and its screen overlay. The inner part belongs to the
 * dispatcher, which initialises and disposes it.
 */
export class Drop2Held implements ScenePart {
  private readonly inner: ScenePart;
  private readonly hold: number;

  constructor(inner: ScenePart, hold: number) {
    this.inner = inner;
    this.hold = hold;
  }

  /** The instant `frame` shows: `hold`, with `frame`'s offset from its output frame. */
  held(frame: number): number {
    return this.hold + (frame - Math.round(frame));
  }

  async init(): Promise<void> {}

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const frame = this.held(ctx.frame);
    this.inner.render(gl, { ...ctx, frame, cam: this.held(ctx.cam), t: frame / FPS, beat: frame / FRAMES_PER_BEAT }, target);
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget): void {
    this.inner.screenOverlay?.(gl, target, this.hold);
  }

  look(): Look {
    return this.inner.look(this.hold);
  }

  temporal(): Temporal {
    const t = this.inner.temporal(this.hold);
    return { ...t, shutter: Math.min(t.shutter, 0.96), persistence: 0 };
  }

  segment(frame: number): Segment {
    return drop2Segment(frame);
  }

  dispose(): void {}
}
