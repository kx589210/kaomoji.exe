// The transition, the film part 'transition' (2 bars between the Riso print and the cosmos: "VERTIGO ∞ · LIGHTSPEED PRESS", bars 13–14 of
// the design; src/score/transition.ts): the dispatcher. Every sub-frame instant goes to the renderer whose TRANSITION_PARTS row holds it
// (one today: 'gate', src/scenes/transitionGate.ts, builder T), and every output frame takes that renderer's look, sub-frames and
// screen overlay; the segments are the score's (sub-frames never cross the crash stop, the ✦ cross or the vacuum). Build sheet
// notes/bcos/sheet.md §9. The renderer is a stub until built (src/scenes/cosmosStub.ts): this file needs no edit when it lands.
// Constructible in Node (tests build it): no GL before init().
import type * as THREE from 'three';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { TRANSITION_PARTS, transitionPartIndex, transitionSegment } from '../score/transition.ts';
import type { CosmosPart } from './cosmosStub.ts';
import { GatePart } from './transitionGate.ts';

type PartId = (typeof TRANSITION_PARTS)[number]['id'];

export class TransitionScene implements Renderable {
  /** The renderers, by TRANSITION_PARTS id (made here, so the film makes and initialises each once). */
  readonly parts: Readonly<Record<PartId, CosmosPart>> = { gate: new GatePart() };

  /** The renderer that draws instant `frame` (clamped into the part). */
  partAt(frame: number): CosmosPart {
    return this.parts[TRANSITION_PARTS[transitionPartIndex(frame)].id];
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    for (const p of Object.values(this.parts)) await p.init(gl, size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.partAt(ctx.frame).render(gl, ctx, target);
  }

  /** The renderer's screen overlay at output frame `frame`, drawn once after the picture's passes (clean of the print and the blur). */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.partAt(frame).screenOverlay?.(gl, target, frame);
  }

  look(frame: number): Look {
    return this.partAt(frame).look(frame);
  }

  temporal(frame: number): Temporal {
    return this.partAt(frame).temporal(frame);
  }

  /** The score's segments: E2 the crash stop, E3 the cross, E4 the vacuum, and the part's own bounds. */
  segment(frame: number): Segment {
    return transitionSegment(frame);
  }

  dispose(): void {
    for (const p of Object.values(this.parts)) p.dispose();
  }
}
