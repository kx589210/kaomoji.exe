// A held tail (src/score/film.ts partTail): a part that grew holds its last built frame over its new bars until they are built. This
// draws the part's own scene at the instants the tail shows (heldFrame): each sub-frame of a tail frame is the matching sub-frame of
// the part's last built frame, with that frame's look, photography (shutter and segment) and screen overlay, so the hold is that
// frame, frozen; the camera energy holds with it (src/score/energy.ts rigAt). Only the film grain, seeded by the output frame, moves.
// `make` must be the shared() maker of the part's scene (src/scenes/index.ts), so the live span and the hold draw one scene, made
// and initialised once.
import type * as THREE from 'three';
import { DEFAULT_TEMPORAL, type Segment, type Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { heldFrame } from '../score/film.ts';
import { FPS, FRAMES_PER_BEAT } from '../score/tempo.ts';

/** The widest shutter a held frame keeps: heldFrame tells a tail frame's sub-frames by rounding, so they stay within half a frame. */
const MAX_SHUTTER = 0.96;

export class HeldScene implements Renderable {
  private readonly make: () => Renderable;

  constructor(make: () => Renderable) {
    this.make = make;
  }

  private get inner(): Renderable {
    return this.make();
  }

  init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    return this.inner.init(gl, size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const frame = heldFrame(ctx.frame);
    this.inner.render(gl, { ...ctx, frame, cam: heldFrame(ctx.cam), t: frame / FPS, beat: frame / FRAMES_PER_BEAT }, target);
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.inner.screenOverlay?.(gl, target, heldFrame(frame));
  }

  look(frame: number): Look {
    return this.inner.look(heldFrame(frame));
  }

  /** The held frame's own sampling, its shutter kept inside half a frame either side and without a phosphor tail. */
  temporal(frame: number): Temporal {
    const t = this.inner.temporal?.(heldFrame(frame)) ?? DEFAULT_TEMPORAL;
    return { ...t, shutter: Math.min(t.shutter, MAX_SHUTTER), persistence: 0 };
  }

  /** The held frame's segment, moved to output frame `frame`, and never before the tail (instants before it are the live span's). */
  segment(frame: number): Segment {
    const at = heldFrame(frame);
    const d = Math.round(frame) - at;
    const s = this.inner.segment?.(at) ?? { from: -Infinity, to: Infinity };
    return { from: Math.max(s.from + d, at + 1), to: s.to + d };
  }

  dispose(): void {
    this.inner.dispose();
  }
}
