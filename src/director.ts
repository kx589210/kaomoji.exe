// The film as one Renderable. Each frame goes to the scene whose span contains
// it, and only scenes that overlap the composition are built. Sub-frames stay
// in the output frame's segment (the scene's own, or its whole span), so the
// boundary between two scenes is a clean cut. Scenes that two spans share are
// made once (shared()).
import type * as THREE from 'three';
import { loadFonts } from './engine/fontLoader.ts';
import { DEFAULT_TEMPORAL, type Segment, type Temporal } from './engine/temporal.ts';
import type { FrameContext, Look, Renderable } from './engine/types.ts';
import { IDENTITY_VIEW, type View } from './engine/view.ts';

export type SceneSpan = { from: number; to: number; make: () => Renderable };
/**
 * The film's camera energy: a screen-space view per instant, a white flash per output frame and, optionally, the 字符闪 character
 * flash per output frame (src/score/cuts.ts glyphFlashAt). Leaving the energy out (continuity renders) leaves out all three.
 */
export type Energy = { view(frame: number): View; flash(frame: number): number; glyphs?(frame: number): { amount: number; cell: number } };

export class Director implements Renderable {
  private readonly active: { from: number; to: number; scene: Renderable }[];
  private readonly energy: Energy | undefined;

  constructor(spans: readonly SceneSpan[], range: Segment, energy?: Energy) {
    this.energy = energy;
    this.active = spans.filter((s) => s.to > range.from && s.from < range.to).map((s) => ({ from: s.from, to: s.to, scene: s.make() }));
    if (this.active.length === 0) throw new Error(`no scene covers frames ${range.from}–${range.to}`);
  }

  private at(frame: number) {
    return this.active.find((s) => frame >= s.from && frame < s.to) ?? (frame < this.active[0].from ? this.active[0] : this.active[this.active.length - 1]);
  }

  /** Each scene once: two spans (or a span and a transition) may hold the same one. */
  private scenes(): Renderable[] {
    return [...new Set(this.active.map((s) => s.scene))];
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    // The character flash draws its atlas with the mono font on first use, whichever scenes are on screen.
    await Promise.all([...this.scenes().map((s) => s.init(gl, size)), ...(this.energy?.glyphs ? [loadFonts()] : [])]);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.at(ctx.frame).scene.render(gl, ctx, target);
  }

  /** The screen overlay of the scene that holds output frame `frame` (the party monitor), if it has one. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.at(frame).scene.screenOverlay?.(gl, target, frame);
  }

  /** The scene's look, with the energy's white flash (the stronger of the two) and its character flash (the stronger) merged in. */
  look(frame: number): Look {
    let look = this.at(frame).scene.look(frame);
    const f = this.energy?.flash(frame) ?? 0;
    if (f > 0) look = { ...look, flash: Math.max(look.flash ?? 0, f) };
    const g = this.energy?.glyphs?.(frame);
    if (g && g.amount > (look.glyphs?.amount ?? 0)) look = { ...look, glyphs: g };
    return look;
  }

  view(frame: number): View {
    return this.energy?.view(frame) ?? IDENTITY_VIEW;
  }

  temporal(frame: number): Temporal {
    return this.at(frame).scene.temporal?.(frame) ?? DEFAULT_TEMPORAL;
  }

  segment(frame: number): Segment {
    const s = this.at(frame);
    return s.scene.segment?.(frame) ?? { from: s.from, to: s.to };
  }

  dispose(): void {
    for (const s of this.scenes()) s.dispose();
  }
}

/**
 * A scene that several owners share (the spans of a section and the
 * transitions into and out of it): made on first use, once per call of
 * shared(), and its init and dispose run once however many owners call them.
 */
export function shared(make: () => Renderable): () => Renderable {
  let scene: Renderable | null = null;
  return () => {
    if (scene) return scene;
    const inner = make();
    let ready: Promise<void> | null = null;
    let disposed = false;
    scene = {
      init: (gl, size) => (ready ??= inner.init(gl, size)),
      render: (gl, ctx, target) => inner.render(gl, ctx, target),
      look: (frame) => inner.look(frame),
      temporal: (frame) => inner.temporal?.(frame) ?? DEFAULT_TEMPORAL,
      segment: inner.segment ? (frame) => inner.segment!(frame) : undefined,
      screenOverlay: inner.screenOverlay ? (gl, target, frame) => inner.screenOverlay!(gl, target, frame) : undefined,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        inner.dispose();
      },
    };
    return scene;
  };
}
