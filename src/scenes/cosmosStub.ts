// The contract every renderer of the transition and the cosmos keeps (CosmosPart: a Renderable with its own look and temporal; the
// dispatchers src/scenes/transition.ts and src/scenes/cosmos.ts route to it and give it the score's segments), and the stub each one
// starts as (build sheet notes/bcos/sheet.md §9): its ground, a progress bar, a block on every kick and a label, so the film plays
// end to end and a cut shows the beat while the builders work. A builder replaces a stub by rewriting the part's own file
// (src/scenes/transitionGate.ts, cosmosBang.ts, cosmosSling.ts, cosmosHorizon.ts): same class name, a no-argument constructor, the
// CosmosPart contract; nothing here or in the dispatchers needs an edit. Constructible in Node (tests build the dispatchers): no GL
// before init().
import type * as THREE from 'three';
import type { RGB } from '../engine/color.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { textGlyphs } from '../shots/common.ts';
import { FOV, FRONT, PAPER, STUB_CHARS, stubContent } from '../shots/cosmosKit.ts';
import { advanceOf } from './swiss.ts';

/**
 * A renderer of the transition or the cosmos: drawn by its dispatcher for the sub-frame instants its part's range holds (the score's
 * TRANSITION_PARTS / COSMOS_PARTS), asked for the look and the sub-frames of the output frames in that range, and for the screen overlay
 * (the Defender's red, the readout, the type: drawn once per output frame after the Riso pass) when it has one.
 */
export type CosmosPart = Renderable & { look(frame: number): Look; temporal(frame: number): Temporal };

/** What a stub shows and how its output frames finish. */
export type StubSpec = {
  /** The label's name: `transition gate`, `cosmos A` … */
  label: string;
  part: 'transition' | 'cosmos';
  /** The part's range [from, to) (its progress bar fills over it). */
  from: number;
  to: number;
  /** Its ground at instant `frame` (linear). */
  ground: (frame: number) => RGB;
  /** The kicks it shows a block on. */
  kicks: readonly number[];
  look: (frame: number) => Look;
  temporal: (frame: number) => Temporal;
};

const SCREEN = frontal(FRONT, 0, 0, FOV);

/** A part not built yet (see the file header). */
export class CosmosStub implements CosmosPart {
  private layer: FlatLayer | null = null;
  private advance: Advance | null = null;
  private readonly owned: { dispose(): void }[] = [];
  protected readonly spec: StubSpec;

  constructor(spec: StubSpec) {
    this.spec = spec;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const mono = buildGlyphAtlas([...new Set(STUB_CHARS)].filter((c) => c !== ' '), (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 64, radius: 8, size: 1024 });
    this.layer = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect: size.width / size.height, shapes: 16, glyphs: 64 });
    this.advance = advanceOf(mono);
    this.owned.push(mono.texture, this.layer);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const s = this.spec;
    const { content, paper } = stubContent(ctx.frame, { label: s.label, part: s.part, from: s.from, to: s.to, ground: s.ground(ctx.frame), kicks: s.kicks });
    this.layer!.draw(gl, target, SCREEN, content, paper);
  }

  /** The label, over the finished picture (clean of the print and the blur, as the readout will be). */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const s = this.spec;
    const ground = s.ground(frame);
    const { text } = stubContent(frame, { label: s.label, part: s.part, from: s.from, to: s.to, ground, kicks: s.kicks });
    const ink: RGB = ground === PAPER ? [0.02, 0.05, 0.2] : PAPER;
    const glyphs = textGlyphs(text, { x: -900, y: 470, size: 34, color: ink, advance: this.advance!, align: 0 });
    this.layer!.draw(gl, target, SCREEN, { under: [], glyphs: { mono: glyphs }, over: [] }, null);
  }

  look(frame: number): Look {
    return this.spec.look(frame);
  }

  temporal(frame: number): Temporal {
    return this.spec.temporal(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
