// Bridge B (v08), the part 'bridgeB' (src/score/bridgeB.ts): the bar between drop 2's bullet time and the ending's blue screen, X03 —
// THE CRASH TAKES TIME. The bullet time's tape stop lands front-on on the bridge's downbeat (drawn by drop 2's own scene on its camera's
// time); from there this scene draws drop 2's crash shot (Drop2Overload: THE FRAME, flat, front-on) on the bridge's clocks — the pure
// picture is src/shots/drop2Crash.ts with src/shots/bridgeB.ts: the program's falling frame rate, the colour draining a ring a stage, the
// slip, the tears, the corruption, his condense, the `not responding` veil; the blue spot, its leak and his heart's glow on the film's own
// time — and its fps lines (the camera's running down) over the finished frame. It ends on H5 (his crisp amber face on the blue spot in the
// dim field), where the ending's blue screen bursts out of him on outro 1.1. Contract: output/qa/v08/MAP-CONTRACT.md.
import type * as THREE from 'three';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { BRIDGE_B_END, BRIDGE_B_START } from '../score/bridgeB.ts';

/** The widest shutter a held picture keeps (its sub-frames stay within half a frame of it), as a held tail's (src/scenes/hold.ts). */
const MAX_SHUTTER = 0.96;

export class BridgeBScene implements Renderable {
  private readonly drop2: () => Renderable;
  private readonly shot: () => Renderable;

  /**
   * `drop2`: the shared() maker of drop 2's scene (src/scenes/index.ts), which makes, initialises and disposes its parts once; `crash`:
   * its crash shot (Drop2Overload, the part that drew T7's freeze and drain), which draws the bridge.
   */
  constructor(drop2: () => Renderable, crash: () => Renderable) {
    this.drop2 = drop2;
    this.shot = crash;
  }

  private get crash(): Renderable {
    return this.shot();
  }

  init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    return this.drop2().init(gl, size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.crash.render(gl, ctx, target);
  }

  /** The fps lines over the finished frame (E9's, and the camera's, running down). */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.crash.screenOverlay?.(gl, target, frame);
  }

  look(frame: number): Look {
    return this.crash.look(frame);
  }

  /** The crash shot's sub-frames (16 on a 180° shutter); a held picture's are its own (src/score/bridgeB.ts programFrame keeps their offsets). */
  temporal(frame: number): Temporal {
    const t = this.crash.temporal?.(frame) ?? { samples: 16, shutter: 0.5, persistence: 0 };
    return { ...t, shutter: Math.min(t.shutter, MAX_SHUTTER), persistence: 0 };
  }

  /** One segment, the bridge: no cut inside it (drop 2's last frame and the blue screen's first are each side's own). */
  segment(): Segment {
    return { from: BRIDGE_B_START, to: BRIDGE_B_END };
  }

  dispose(): void {
    this.drop2().dispose();
  }
}
