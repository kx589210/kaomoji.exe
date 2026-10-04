// The ending, the part 'outro' (its 5 bars, the film's last: film bars 57–61 on the 61-bar map): CURTAIN CALL. Build sheet
// notes/b58/ending-sheet.md (r4.1); bounds and every event in src/score/outro.ts; strings in src/content/outro.ts; the hand-off geometry
// in src/shots/outroShared.ts. OutroScene is the dispatcher: it hands each instant to the part that draws it (OUTRO_PARTS) — by the
// sub-frame instant for render, by the output frame for look, temporal, segment and the screen overlay:
//   OutroBlue     outro 1.1 → 2.2   E1 BLUE: the seam decoded in place, the bytes, the stamp, the slot, the staged log, `exit`, the squeeze
//   OutroMonitor  outro 2.2 → 3.1   E2 MONITOR: the flatline, the ω heartbeat, the curl into a ring, the iris-out, the dot, the knocks
//   OutroIris     outro 3.1 → 4.1   E3 IRIS: the pry on the tonic, the wink, ↑ ↑, Enter and 1 → 2 → 4 → 8 with the spots; W5
//   OutroCompany  outro 4.1 → 5.4   E4 CURTAIN CALL + E5 BOWS: the burst, the roll call on the 8ths, the walk-ons; the three bows, the
//                                   last drop, the button, the held tableau; the power-down, the company streaming home one after
//                                   another, the fold, the dive into █
//   OutroCursor   outro 5.4 → end   E5 CURSOR: S01 at −24 … −1 (one blink), settling into frame 0 (the loop)
// The ending has no hard cut: one segment (OUTRO_SEGMENT); the continuous hand-offs blend under a shutter that straddles one, and the
// two impact landings (the squeeze on 2.2, the slam on 5.4) agree at the instant of landing (OUTRO_SEAMS). All five parts are built
// (2026-10-01; the contract is still src/scenes/outroStub.ts's OutroPart); r4 (U5, the fifth bar) kept the five parts and their classes:
// OutroCompany now draws outro 4.1 → 5.4 and OutroCursor 5.4 → end (r4.1, U5b: the landing moved 5.3 → 5.4), read from
// OUTRO_PARTS. The sheet agent owns this file; each part's
// file is its builder's (sheet §10), and none of them needs an edit here: a part that needs another (the monitor's ghost of the blue
// screen) gets it through its constructor below.
import type * as THREE from 'three';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { OUTRO_PARTS, outroPartIndex } from '../score/outro.ts';
import { OutroBlue } from './outroBlue.ts';
import { OutroCompany } from './outroCompany.ts';
import { OutroCursor } from './outroCursor.ts';
import { OutroIris } from './outroIris.ts';
import { OutroMonitor } from './outroMonitor.ts';
import type { OutroPart } from './outroStub.ts';

export class OutroScene implements Renderable {
  /** In OUTRO_PARTS order: blue, monitor, iris, company, cursor. */
  readonly parts: readonly OutroPart[];

  constructor() {
    const blue = new OutroBlue();
    this.parts = [blue, new OutroMonitor({ blue }), new OutroIris(), new OutroCompany(), new OutroCursor()];
    if (this.parts.length !== OUTRO_PARTS.length) throw new Error(`outro: ${this.parts.length} parts for ${OUTRO_PARTS.length} rows of OUTRO_PARTS`);
  }

  private part(frame: number): OutroPart {
    return this.parts[outroPartIndex(frame)];
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await Promise.all(this.parts.map((p) => p.init(gl, size)));
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.part(ctx.frame).render(gl, ctx, target);
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.part(frame).screenOverlay?.(gl, target, frame);
  }

  look(frame: number): Look {
    return this.part(frame).look(frame);
  }

  temporal(frame: number): Temporal {
    return this.part(frame).temporal(frame);
  }

  segment(frame: number): Segment {
    return this.part(frame).segment(frame);
  }

  dispose(): void {
    for (const p of this.parts) p.dispose();
  }
}
