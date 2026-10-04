// OutroMonitor, outro 2.2 → 3.1 (E2 MONITOR; build sheet notes/b58/ending-sheet.md §3.2, §4 2.2 / 3.1, §7 E2): the flatline with
// its write head, the ghost of the blue screen (OutroBlue's frame ENTER − 1, rendered once into a cached texture: hence `blue`), the
// antivirus's last word centred under it, the push; the heartbeat pulse shaped like his ω; the curl of the trace into a ring of its own
// length round his (×ω×); the iris-out to the red dot; the knocks, their ripples and his fingertips. Pure content in
// src/shots/outroMonitor.ts; the aperture is the shared pass (src/scenes/outroAperture.ts).
import * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { FOV, FRONT_DISTANCE } from '../shots/intro.ts';
import { type BlueLayout, lastWordContent } from '../shots/outroBlue.ts';
import { GHOST_FRAME, INTERIOR_FROM, lastWordAt, lastWordLevel, monitorAperture, monitorInterior, monitorLook, monitorNotches, monitorSegment, monitorTemporal, promiseGlyphs } from '../shots/outroMonitor.ts';
import { OutroAperturePass } from './outroAperture.ts';
import { OutroBlue } from './outroBlue.ts';
import { OutroLayers } from './outroKit.ts';
import type { OutroPart } from './outroStub.ts';

const SCREEN = frontal(FRONT_DISTANCE, 0, 0, FOV);

export class OutroMonitor implements OutroPart {
  /** OutroBlue, whose frame ENTER − 1 the ghost shows (rendered once: a deterministic cache). */
  readonly blue: OutroPart;
  private readonly kit = new OutroLayers(['mono', 'bold', 'rounded', 'display'], ['normal'], { shapes: 64, glyphs: 256 });
  private readonly aperture = new OutroAperturePass();
  private ghost: THREE.WebGLRenderTarget | null = null;
  private ghostReady = false;
  private layout: BlueLayout | null = null;

  constructor(o: { blue: OutroPart }) {
    this.blue = o.blue;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await this.kit.init(size);
    this.layout = { mono: this.kit.advance('mono'), bold: this.kit.advance('bold'), rounded: this.kit.advance('rounded'), display: this.kit.advance('display') };
    this.aperture.init(size);
    this.ghost = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.ghost.texture.minFilter = THREE.LinearFilter;
    this.ghost.texture.magFilter = THREE.LinearFilter;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    if (!this.ghostReady) {
      // The picture the beam just left: OutroBlue at ENTER − 1, once (pure in its frame, so any render order gives the same texture).
      if (this.blue instanceof OutroBlue) this.blue.renderPicture(gl, GHOST_FRAME, this.ghost!, true);
      else this.blue.render(gl, { ...ctx, frame: GHOST_FRAME, cam: GHOST_FRAME }, this.ghost!);
      this.ghostReady = true;
    }
    const layer = this.kit.layer('normal');
    if (f >= INTERIOR_FROM - 0.25) {
      this.aperture.clearGlass(gl);
      layer.draw(gl, this.aperture.pic, SCREEN, monitorInterior(f, this.layout!.rounded), null);
    }
    this.aperture.draw(gl, target, monitorAperture(f), { ghost: this.ghost!.texture });
    const level = lastWordLevel(f);
    const notches = monitorNotches(f);
    // His answer under the line from the beep: the promise (v04's power-off, kept: review F2).
    const promise = promiseGlyphs(f, this.layout!.bold);
    if (level > 0 || notches.length || promise.length) {
      const word = level > 0 ? lastWordContent(lastWordAt(f), 1, this.layout!) : { under: [], glyphs: [] };
      layer.draw(
        gl,
        target,
        SCREEN,
        { under: word.under.map((s) => ({ ...s, alpha: (s.alpha ?? 1) * level })), glyphs: { bold: [...word.glyphs.map((g) => ({ ...g, alpha: (g.alpha ?? 1) * level })), ...promise] }, over: notches },
        null,
      );
    }
  }

  look(frame: number): Look {
    return monitorLook(frame);
  }

  temporal(frame: number): Temporal {
    return monitorTemporal(frame);
  }

  segment(): Segment {
    return monitorSegment();
  }

  dispose(): void {
    this.kit.dispose();
    this.aperture.dispose();
    this.ghost?.dispose();
  }
}
