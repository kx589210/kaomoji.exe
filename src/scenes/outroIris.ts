// OutroIris, outro 3.1 → 4.1 (E3 IRIS; build sheet notes/b58/ending-sheet.md §3.3, §4 3.1 / 4.1, §5.1, §7 E3, §7.1): the dot pried
// open on the tonic into the antivirus's own circle, ヽ(•ω•)ﾉ holding it, the wink on the promised frame with its ✧, ↑ ↑ at the
// prompt, Enter and friends 1 → 2 → 4 → 8 with the spots opening onto the worlds he infected (src/scenes/outroSpots.ts); W5, the
// readout, outside the iris (screenOverlay). Pure content: src/shots/outroIris.ts, outroSpots.ts, outroW5.ts; the aperture is the
// shared pass (src/scenes/outroAperture.ts).
import type * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { FOV, FRONT_DISTANCE } from '../shots/intro.ts';
import { irisAperture, irisFriends, irisInterior, irisLook, irisPose, irisSegment, irisTemporal } from '../shots/outroIris.ts';
import { spotsLit } from '../shots/outroSpots.ts';
import { w5Content } from '../shots/outroW5.ts';
import { OutroAperturePass } from './outroAperture.ts';
import { OutroLayers } from './outroKit.ts';
import { type OutroSpots, acquireSpots, releaseSpots } from './outroSpots.ts';
import type { OutroPart } from './outroStub.ts';

const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);
/** The wink's morph passes through a circle the size of his • (M PLUS Rounded's dot is ≈ 0.29 em): the v04 lens's. */
const DOT_PER_EM = 0.3;

export class OutroIris implements OutroPart {
  private readonly kit = new OutroLayers(['mono', 'rounded'], ['add', 'normal'], { shapes: 64, glyphs: 512 });
  private readonly aperture = new OutroAperturePass();
  private spots: OutroSpots | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await this.kit.init(size, DOT_PER_EM);
    this.aperture.init(size);
    this.spots = await acquireSpots(size);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const F = Math.round(f);
    this.aperture.clearGlass(gl);
    this.kit.layer('add').draw(gl, this.aperture.pic, irisPose(ctx.cam), irisInterior(f, { rounded: this.kit.advance('rounded'), mono: this.kit.advance('mono') }), null);
    const lit = spotsLit(F);
    if (lit) this.spots!.render(gl, F);
    this.aperture.draw(gl, target, irisAperture(f), lit ? { spotPlain: this.spots!.plain!.texture, spotFx: this.spots!.fx!.texture } : {});
  }

  /** W5, fixed to the screen outside the iris. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.kit.layer('normal').draw(gl, target, SCREEN, w5Content(frame, this.kit.advance('mono'), irisFriends), null);
  }

  look(frame: number): Look {
    return irisLook(frame);
  }

  temporal(frame: number): Temporal {
    return irisTemporal(frame);
  }

  segment(): Segment {
    return irisSegment();
  }

  dispose(): void {
    this.kit.dispose();
    this.aperture.dispose();
    if (this.spots) releaseSpots();
  }
}
