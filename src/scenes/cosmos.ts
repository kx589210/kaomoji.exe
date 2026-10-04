// The cosmos, the film part 'cosmos' (6 bars: "VERTIGO ∞ · LIGHTSPEED PRESS", bars 15–20 of the design; src/score/cosmos.ts): the
// dispatcher. Every sub-frame instant goes to the renderer whose COSMOS_PARTS row holds it — A, the printed Big Bang and Earth
// (cosmos 1–2, src/scenes/cosmosAPart.ts); B, the slingshot and the warp to the neon spiral (3–4, cosmosBSling.ts); C, the lightning web
// and the event horizon to the amber point (5–6, cosmosCPart.ts) — and every output frame takes that renderer's look, sub-frames and
// screen overlay. The segments are the score's (sub-frames never cross the bang's white, the freeze, the slice or a stutter slice); the
// seams between renderers (the whip into 3.1, the tilt into 5.1) are continuous moves, so their sub-frames run across them, each instant
// drawn by its own renderer. Build sheet notes/bcos/sheet.md §9. The three renderers keep the CosmosPart contract
// (src/scenes/cosmosStub.ts); the stubs they replaced (cosmosBang.ts, cosmosSling.ts, cosmosHorizon.ts) are no longer drawn.
// Constructible in Node (tests build it): no GL before init().
import type * as THREE from 'three';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { COSMOS_PARTS, cosmosPartIndex, cosmosSegment } from '../score/cosmos.ts';
import { BangPart } from './cosmosAPart.ts';
import { SlingPart } from './cosmosBSling.ts';
import { CosmosCPart } from './cosmosCPart.ts';
import type { CosmosPart } from './cosmosStub.ts';

type PartId = (typeof COSMOS_PARTS)[number]['id'];

export class CosmosScene implements Renderable {
  /** The renderers, by COSMOS_PARTS id (made here, so the film makes and initialises each once). */
  readonly parts: Readonly<Record<PartId, CosmosPart>> = { A: new BangPart(), B: new SlingPart(), C: new CosmosCPart() };

  /** The renderer that draws instant `frame` (clamped into the part). */
  partAt(frame: number): CosmosPart {
    return this.parts[COSMOS_PARTS[cosmosPartIndex(frame)].id];
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    for (const p of Object.values(this.parts)) await p.init(gl, size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.partAt(ctx.frame).render(gl, ctx, target);
  }

  /** The renderer's screen overlay at output frame `frame` (the Defender's red, the readout, the type), once, after the Riso pass. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.partAt(frame).screenOverlay?.(gl, target, frame);
  }

  look(frame: number): Look {
    return this.partAt(frame).look(frame);
  }

  temporal(frame: number): Temporal {
    return this.partAt(frame).temporal(frame);
  }

  /** The score's segments: E5 the bang's white, E6 the freeze, E8 the slice, E19 every stutter slice, E20 the part's end. */
  segment(frame: number): Segment {
    return cosmosSegment(frame);
  }

  dispose(): void {
    for (const p of Object.values(this.parts)) p.dispose();
  }
}
