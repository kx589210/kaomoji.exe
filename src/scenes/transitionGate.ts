// The transition's renderer, "DUPLICATOR → VERTIGO → STAR GATE → CRASH STOP → ✦" (the part 'transition', both bars; build sheet
// notes/bcos/sheet.md §3, design notes/cosmos3/final.md §4 bars 13–14, prototype cosmos3/w/j2.js). Builder T.
// The dispatcher (src/scenes/transition.ts) routes every instant of the part here and gives it the score's segments (the crash stop,
// the cross and the vacuum are hard steps: one sub-frame each from the crash on).
//
// Each sub-frame, back to front (all maths in src/shots/transitionGate.ts):
//   1. the page: the Riso paper and its sun — in bar 1 the Riso print's own last-frame shapes under its own camera (the transition's
//      first frame is the print's last plus the films: E0), from the launch the sun as ink at the vanishing point (multiply);
//   2. the press passes' printed space inside their dark fronts (LensPasses.drawUnder, ground);
//   3. the films' and gates' ink in 3D (FilmField, multiply): on the paper whole, on the passes' dark papers thinner (the bands stay dark);
//   4. the sun as light, the light at the end of the tunnel (LensPasses.drawUnder, sun), so no ink dims it;
//   5. the films' and gates' light behind the fronts (FilmField, light: the beads, the faces, the gates);
//   6. the lens over them: the singing rings, the ghosts, the flare (LensPasses.drawOver).
// From the cross: the printed space, then the ✦ (the flat page, frozen once into a target, squashed into the slit) and the point.
import * as THREE from 'three';
import { SLUG } from '../content/cosmos.ts';
import { frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { FOV, FRONT, transitionLook } from '../shots/cosmosKit.ts';
import { CRASH, at } from '../score/transition.ts';
import { FROZEN_PAGE, SLAM_PAGE, type GateFrame, gateFrame, gateTemporal, page, pagePose, pageZoom, slitAt } from '../shots/transitionGate.ts';
import { PAPER, PAPER_GRAIN, PLATE } from '../worlds/riso.ts';
import type { CosmosPart } from './cosmosStub.ts';
import { FilmField } from './transitionFilms.ts';
import { LensPasses } from './transitionLens.ts';

const SLUG_LENGTH = [...SLUG].length;
const SCREEN_POSE = frontal(FRONT, 0, 0, FOV);

/** The sun's ink shapes (the page's own in bar 1, in page units; screen units from the launch), with its blue keyline. */
function sunShapes(g: GateFrame, f: number): Shape[] {
  const s = g.sun;
  if (!s || s.mode === 'light') return [];
  if (s.mode === 'page') {
    const p = page();
    const z = pageZoom(f);
    const out = [...p.shapes];
    if (s.keyline.alpha > 0) out.push({ kind: 'ring', x: p.sun.x, y: p.sun.y, w: (2 * s.keyline.r) / z, h: (2 * s.keyline.r) / z, r: s.keyline.width / z, color: PLATE.blue, alpha: s.keyline.alpha });
    return out;
  }
  return [
    { kind: 'ellipse', x: s.x + s.yellow[0], y: s.y + s.yellow[1], w: 2 * s.r, h: 2 * s.r, color: PLATE.yellow, alpha: s.yellowAlpha },
    { kind: 'ellipse', x: s.x + s.pink[0], y: s.y + s.pink[1], w: 2 * s.core, h: 2 * s.core, color: PLATE.pink, alpha: s.pinkAlpha },
    { kind: 'ring', x: s.x, y: s.y, w: 2 * s.keyline.r, h: 2 * s.keyline.r, r: s.keyline.width, color: PLATE.blue, alpha: s.keyline.alpha },
  ];
}

/**
 * The look (cosmosKit's transitionLook: the Riso print's through bar 1, the grain thinning and the vignette deepening over bar 2, a
 * little bloom from the crash) with the passes doing the switch to light: the bloom rises 0 → 0.35 over 2.1 → 2.3 (threshold 0.6:
 * the neon streaks, the knock-outs, the gates' faces, the flare and the sun glow), so the tunnel the press turns into light glows like
 * neon before the crash stop snaps it back to the sun's 0.15 — kept low, so the glow never lifts the dark between the streaks into a
 * veil (rev1c T1: the ground behind the passes stays dark).
 */
export function gateLook(frame: number): Look {
  const base = transitionLook(frame);
  if (frame < at(2) || frame >= CRASH) return base;
  const u = (frame - at(2)) / (CRASH - at(2));
  return { ...base, bloom: { intensity: 0.35 * u, threshold: 0.6, smoothing: 0.15, radius: 0.75 } };
}

/** How bright the slit is for its width: the squash conserves the page's light (1920 px into 3 × W), tempered so it stays a line (the flat page glows now: 0.25, so the slit keeps its pink and blue fringes instead of blowing to a white bar). */
export const slitGain = (width: number): number => 0.25 * (1920 / (3 * width)) ** 0.75;

export class GatePart implements CosmosPart {
  private paper: FlatLayer | null = null;
  private films: FilmField | null = null;
  private lens: LensPasses | null = null;
  /** The flat page the cross squashes: rendered once, on first need (any frame may be the first one rendered), at the target's size. */
  private frozen: THREE.WebGLRenderTarget | null = null;
  private frozenReady = false;
  /** v07, the slam's page: the flat page as on the frame before the cross (before the last pass's kick darkens its middle), rendered once. */
  private slamPage: THREE.WebGLRenderTarget | null = null;
  private slamReady = false;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.paper = new FlatLayer({ atlases: {}, blend: 'multiply', aspect: size.width / size.height, shapes: 16 });
    this.films = new FilmField();
    this.lens = new LensPasses();
  }

  /** Steps 1–5 of the header at instant f into `target`. */
  private drawPage(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, g: GateFrame, f: number, dpl: number): void {
    const press = g.press;
    const allDark = press.inner > 0 && press.outer > 0;
    const shapes = sunShapes(g, f);
    const lit = press.inner > 0 || press.outer > 0;
    if (!allDark) this.paper!.draw(gl, target, g.phase === 'page' ? pagePose(f) : SCREEN_POSE, { under: shapes, glyphs: {}, over: [] }, { color: PAPER, grain: PAPER_GRAIN });
    this.lens!.drawUnder(gl, target, g, dpl, { ground: true, sun: false });
    if (g.films.length) {
      // The ink prints everywhere (on the paper whole, on the passes' dark papers thinner): the tunnel's bands stay dark behind the fronts.
      this.films!.set(g.films, g.camera, { front: press, pose: g.pose, hat: g.hat, devicePerLogical: dpl });
      this.films!.draw(gl, target, { multiply: true, light: false });
    }
    this.lens!.drawUnder(gl, target, g, dpl, { ground: false, sun: true });
    // Behind the fronts the tubes, the knock-outs and the gates are light over the dark ink.
    if (g.films.length && lit) this.films!.draw(gl, target, { multiply: false, light: true });
  }

  private ensureFrozen(gl: THREE.WebGLRenderer, width: number, height: number): THREE.Texture {
    if (!this.frozen || this.frozen.width !== width || this.frozen.height !== height) {
      this.frozen?.dispose();
      this.frozen = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: false });
      this.frozenReady = false;
    }
    if (!this.frozenReady) {
      gl.setRenderTarget(this.frozen);
      gl.setClearColor(0x000000, 1);
      gl.clear(true, false, false);
      const g = gateFrame(FROZEN_PAGE, SLUG_LENGTH);
      this.drawPage(gl, this.frozen, g, FROZEN_PAGE, height / 1080);
      this.frozenReady = true;
    }
    return this.frozen.texture;
  }

  private ensureSlamPage(gl: THREE.WebGLRenderer, width: number, height: number): THREE.Texture {
    if (!this.slamPage || this.slamPage.width !== width || this.slamPage.height !== height) {
      this.slamPage?.dispose();
      this.slamPage = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: false });
      this.slamReady = false;
    }
    if (!this.slamReady) {
      gl.setRenderTarget(this.slamPage);
      gl.setClearColor(0x000000, 1);
      gl.clear(true, false, false);
      const g = gateFrame(SLAM_PAGE, SLUG_LENGTH);
      this.drawPage(gl, this.slamPage, g, SLAM_PAGE, height / 1080);
      this.slamReady = true;
    }
    return this.slamPage.texture;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const dpl = ctx.height / 1080;
    const g = gateFrame(f, SLUG_LENGTH);
    if (g.squash !== null) {
      // v07, the slam: the printed space, then the frozen flat page squashed sideways about the axis (shots: squashAt), the lens over it.
      const slam = this.ensureSlamPage(gl, ctx.width, ctx.height);
      this.lens!.drawUnder(gl, target, g, dpl, { ground: true, sun: false });
      this.lens!.drawOver(gl, target, g, dpl, slam, 0);
      return;
    }
    if (g.phase === 'cross' || g.phase === 'point') {
      const frozen = slitAt(f) ? this.ensureFrozen(gl, ctx.width, ctx.height) : null;
      this.lens!.drawUnder(gl, target, g, dpl);
      const sl = g.slit;
      this.lens!.drawOver(gl, target, g, dpl, frozen, sl ? slitGain(sl.width) : 0);
      return;
    }
    this.drawPage(gl, target, g, f, dpl);
    this.lens!.drawOver(gl, target, g, dpl, null, 0);
  }

  look(frame: number): Look {
    return gateLook(frame);
  }

  temporal(frame: number): Temporal {
    return gateTemporal(frame);
  }

  dispose(): void {
    this.paper?.dispose();
    this.films?.dispose();
    this.lens?.dispose();
    this.frozen?.dispose();
    this.slamPage?.dispose();
  }
}

