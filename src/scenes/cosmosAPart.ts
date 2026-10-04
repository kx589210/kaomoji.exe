// Renderer A of the cosmos, "PRINTED BIG BANG · BULLET TIME → CITY LIGHTS → SUNRISE" (the part 'cosmos', bars 1–2: COSMOS_PARTS 'A'; build
// sheet notes/bcos/sheet.md §4.1–§4.2, §6.2–§6.3; design notes/cosmos3/final.md §4 bars 15–16; prototype cosmos3/w/j3.js, j4.js).
// It keeps the CosmosPart contract (src/scenes/cosmosStub.ts): the dispatcher (src/scenes/cosmos.ts) makes it as renderer A, in
// place of the stub it replaced. Every instant from cosmos 1.1 to 3.1 is drawn here: bar 1 by the bang (src/scenes/cosmosABang.ts),
// the crash zoom-out by Earth under the bang's shrinking inset, bar 2 by Earth (src/scenes/cosmosAEarth.ts); the counts, the ring-counter
// and the monitor are the screen overlay (src/scenes/cosmosAOverlay.ts), drawn once per output frame after the Riso print. The pure shots
// are src/shots/cosmosBang.ts and src/shots/cosmosEarth.ts. Constructible in Node: no GL before init().
import type * as THREE from 'three';
import type { Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { COSMOS_PARTS, LEVELS, POWERS } from '../score/cosmos.ts';
import { aLook, aTemporal } from '../shots/cosmosBangLook.ts';
import { BangRenderer } from './cosmosABang.ts';
import { EarthRenderer } from './cosmosAEarth.ts';
import { type AKit, buildAKit } from './cosmosAKit.ts';
import { AOverlay } from './cosmosAOverlay.ts';
import type { CosmosPart } from './cosmosStub.ts';

const RANGE = COSMOS_PARTS.find((p) => p.id === 'A')!;

export class BangPart implements CosmosPart {
  private kit: AKit | null = null;
  private readonly bang = new BangRenderer();
  private readonly earth = new EarthRenderer();
  private readonly overlay = new AOverlay();

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    this.kit = await buildAKit(size);
    this.bang.init(this.kit, size);
    this.earth.init(this.kit, size);
    this.overlay.init(this.kit, size);
    void gl;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = Math.min(RANGE.to - 1e-3, Math.max(RANGE.from, ctx.frame));
    if (f < POWERS[0]) this.bang.draw(gl, target, f);
    else if (f < LEVELS.earth) {
      this.earth.draw(gl, target, f);
      this.bang.draw(gl, target, f);
    } else this.earth.draw(gl, target, f);
  }

  /** The counts, the caption, the ring-counter and its unwrap, the party monitor: once per output frame, after the print. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.overlay.draw(gl, target, Math.min(RANGE.to - 1, Math.max(RANGE.from, frame)));
  }

  look(frame: number): Look {
    return aLook(frame);
  }

  temporal(frame: number): Temporal {
    return aTemporal(frame);
  }

  dispose(): void {
    this.bang.dispose();
    this.earth.dispose();
    this.overlay.dispose();
    for (const o of this.kit?.owned ?? []) o.dispose();
  }
}
