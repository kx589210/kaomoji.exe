// The contract every part of the ending keeps (OutroPart: a Renderable with its own temporal and segment), and the stub each part
// starts as: its ground colour, flat and still, so the film plays end to end while the builders work (build sheet
// notes/b58/ending-sheet.md §2, §10). A builder replaces a stub by rewriting the part's own file (src/scenes/outroBlue.ts …): same
// class name, same constructor, the OutroPart contract; nothing here or in the dispatcher (src/scenes/outro.ts) needs an edit.
// Constructible in Node (tests build OutroScene): no GL before init().
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { FLAT_LOOK, type FrameContext, type Look, type Renderable } from '../engine/types.ts';
import { OUTRO_SEGMENT } from '../score/outro.ts';

/** A part of the ending: drawn by the dispatcher for the instants OUTRO_PARTS gives it (render by sub-frame, the rest by output frame). */
export type OutroPart = Renderable & { temporal(frame: number): Temporal; segment(frame: number): Segment };

/** A part not built yet: its ground, one sample, no motion; the ending's one segment. */
export class OutroStub implements OutroPart {
  private quad: FullscreenQuad | null = null;
  private readonly ground: string;

  /** `ground`: the part's ground colour (sRGB hex), drawn linear. */
  constructor(ground: string) {
    this.ground = ground;
  }

  async init(): Promise<void> {
    const [r, g, b] = linear(this.ground).map((c) => c.toFixed(6));
    this.quad = new FullscreenQuad(new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: `void main() { gl_FragColor = vec4(${r}, ${g}, ${b}, 1.0); }` }));
  }

  render(gl: THREE.WebGLRenderer, _ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.quad!.render(gl, target);
  }

  look(): Look {
    return FLAT_LOOK;
  }

  /** Nothing moves: one sample. */
  temporal(): Temporal {
    return { samples: 1, shutter: 0, persistence: 0 };
  }

  segment(): Segment {
    return { from: OUTRO_SEGMENT.from, to: OUTRO_SEGMENT.to };
  }

  dispose(): void {
    this.quad?.dispose();
  }
}
