// S31K KERNEL, drop2 8.1–9.1 − 1 (2.5D) (builder K · KERNEL, written by the act-1 fixer in round 1; build sheet
// notes/bid2/drop2-sheet2.md §3 "drop2 8", §4.4, §5 #9–#10, §6.3; design notes/extend/drop2-final.md §4.6): the whip lands him
// in Defender's nave at 0x80000000; the flood topples its 16 processes like dominoes on the 16ths; v1 hangs; the act's red hairline lifts
// into the install bar and wipes the picture to Defender's slate X-ray, its ring redrawn as v2.0's reticle for the 9.1 match cut.
// The shot is pure (src/shots/drop2Kernel.ts: the nave, the camera, the dominoes, the flood, the core, the scan, the hang, the install, the
// contracts kernelRingAt / installBarAt); this class draws what it returns, back to front, in two passes: the live kernel over the whole
// frame, then — left of the install's edge, through the render target's scissor — the same instant in the X-ray skin; the install's edge
// and label last, over both. Constructible in Node (the dispatcher's tests build it): no GL before init(). Tests: tests/drop2Kernel.test.ts.
import type * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type FontRole, cssStack } from '../engine/fonts.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { KERNEL_STRINGS, type KernelAdvances, type KernelFrame, installBarAt, kernelFrame, kernelHud, kernelLook, kernelSegment, kernelTemporal } from '../shots/drop2Kernel.ts';
import type { ScenePart } from './drop2Stub.ts';
import { advanceOf } from './swiss.ts';

const FOV = 20;
/** The screen's own camera: one unit a px at 1080p, origin at the frame's centre, y up. */
const SCREEN = frontal(fillDistance(1080, FOV), 0, 0, FOV);
const chars = (strings: readonly string[]): string[] => [...new Set(strings.join(''))].filter((c) => c !== ' ');

type Layers = Record<'back' | 'glow' | 'nave' | 'faces' | 'screen' | 'hero' | 'hud', FlatLayer>;

export class Drop2Kernel implements ScenePart {
  private adv: KernelAdvances | null = null;
  private layers: Layers | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.layers) return;
    await loadFonts();
    const atlas = (strings: readonly string[], role: FontRole, weight: number, o: { fontPx: number; radius: number; size: number }): GlyphAtlas => {
      const a = buildGlyphAtlas(strings, (px) => `${weight} ${px}px ${cssStack(role)}`, o);
      this.owned.push(a.texture);
      return a;
    };
    const mono = atlas(chars(KERNEL_STRINGS.mono), 'mono', 600, { fontPx: 96, radius: 12, size: 2048 });
    // The dizzy faces are whole keys (as the overflow draws them).
    const jp = atlas([...KERNEL_STRINGS.jp], 'jp', 700, { fontPx: 96, radius: 12, size: 2048 });
    const rounded = atlas([...KERNEL_STRINGS.rounded], 'rounded', 800, { fontPx: 160, radius: 20, size: 1024 });
    this.adv = { mono: advanceOf(mono), jp: advanceOf(jp), rounded: advanceOf(rounded) };
    const aspect = size.width / size.height;
    const layer = (atlases: Record<string, GlyphAtlas>, blend: 'normal' | 'add', shapes: number, glyphs: number): FlatLayer => {
      const l = new FlatLayer({ atlases, blend, aspect, shapes, glyphs });
      this.owned.push(l);
      return l;
    };
    this.layers = {
      back: layer({ mono }, 'normal', 64, 4096),
      glow: layer({}, 'add', 1024, 16),
      nave: layer({ mono }, 'normal', 16, 8192),
      faces: layer({ jp }, 'normal', 64, 64),
      screen: layer({}, 'normal', 1024, 16),
      hero: layer({ rounded }, 'normal', 8, 16),
      hud: layer({ mono }, 'normal', 16, 128),
    };
  }

  /** One skin of the kernel: the world back to front, then the screen's layers (the veil under the bar and him; the POV's scanlines and reticle over him). */
  private pass(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, c: KernelFrame, xray: boolean): void {
    const L = this.layers!;
    const none = { under: [], glyphs: {}, over: [] };
    L.back.draw(gl, target, c.pose, { under: c.back.under, glyphs: { mono: c.back.mono }, over: [] }, { color: c.ground, grain: 0 });
    if (c.glow.length) L.glow.draw(gl, target, c.pose, { ...none, under: c.glow }, null);
    L.nave.draw(gl, target, c.pose, { under: [], glyphs: { mono: c.nave }, over: [] }, null);
    if (c.faces.jp.length) L.faces.draw(gl, target, c.pose, { under: c.faces.chips, glyphs: { jp: c.faces.jp }, over: [] }, null);
    if (!xray && c.screen.length) L.screen.draw(gl, target, SCREEN, { ...none, under: c.screen }, null);
    if (c.bar.length) L.screen.draw(gl, target, SCREEN, { ...none, under: c.bar }, null);
    L.hero.draw(gl, target, SCREEN, { under: [], glyphs: { rounded: c.hero }, over: [] }, null);
    if (xray && c.screen.length) L.screen.draw(gl, target, SCREEN, { ...none, under: c.screen }, null);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const adv = this.adv!;
    this.pass(gl, target, kernelFrame(ctx.frame, adv, ctx.cam, 'live'), false);
    // Left of the install's edge: Defender's slate X-ray of the same instant (the render target's scissor, in device px; always restored,
    // or the pipeline's next clear of this target would be clipped too).
    const bar = installBarAt(ctx.frame);
    if (bar && bar.edge > 0.5) {
      const w = Math.min(target.width, Math.round((bar.edge / 1920) * target.width));
      target.scissor.set(0, 0, w, target.height);
      target.scissorTest = true;
      try {
        this.pass(gl, target, kernelFrame(ctx.frame, adv, ctx.cam, 'xray'), true);
      } finally {
        target.scissorTest = false;
        target.scissor.set(0, 0, target.width, target.height);
        gl.setRenderTarget(target);
      }
    }
    const hud = kernelHud(ctx.frame, adv.mono);
    if (hud.shapes.length || hud.mono.length) this.layers!.hud.draw(gl, target, SCREEN, { under: hud.shapes, glyphs: { mono: hud.mono }, over: [] }, null);
  }

  look(frame: number): Look {
    return kernelLook(frame);
  }

  temporal(frame: number): Temporal {
    return kernelTemporal(frame);
  }

  segment(frame: number): Segment {
    return kernelSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.layers = null;
  }
}
