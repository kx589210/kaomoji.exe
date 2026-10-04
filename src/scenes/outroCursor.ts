// OutroCursor, outro 5.4 → the film's end (E5 CURSOR; build sheet notes/b58/ending-sheet.md §3.5, §4 OUT; U5b: was 5.3): S01 at its
// frames −24 … −1 — the intro's glass and haze (the same shader, at the ending's settling power), S01's camera on the cursor cell and
// its blink — so the last frame runs into frame 0. Pure content: src/shots/outroCursor.ts. Nothing of the approved intro is edited: its
// camera, look, sampling and haze are read from src/shots/intro.ts.
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { cursorGlyph, cursorHaze, cursorLook, cursorPose, cursorSegment, cursorTemporal, outroPower } from '../shots/outroCursor.ts';
import { PALETTE } from '../worlds/terminal.ts';
import { acquireAtlas, releaseAtlas } from './outroKit.ts';
import type { OutroPart } from './outroStub.ts';

/** The intro's screen glass (src/scenes/intro.ts), verbatim: the dark ground with a faint phosphor haze, times the power. */
const GLASS_FRAG = /* glsl */ `
  uniform vec3 base;
  uniform vec3 haze;
  uniform float power;
  uniform float pulse;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(2.0, 2.4);
    gl_FragColor = vec4((base + haze * pulse * exp(-dot(p, p) * 1.6)) * power, 1.0);
  }`;

export class OutroCursor implements OutroPart {
  private glass: FullscreenQuad | null = null;
  private layer: FlatLayer | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    const mono = await acquireAtlas('mono');
    this.layer = new FlatLayer({ atlases: { mono }, blend: 'add', aspect: size.width / size.height, shapes: 4, glyphs: 4 });
    this.glass = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { base: { value: new THREE.Vector3(...linear(PALETTE.bg)) }, haze: { value: new THREE.Vector3(...linear(PALETTE.green, 0.012)) }, power: { value: 1 }, pulse: { value: 1 } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: GLASS_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const u = (this.glass!.mesh.material as THREE.ShaderMaterial).uniforms;
    u.power.value = outroPower(ctx.frame);
    u.pulse.value = cursorHaze(ctx.frame);
    this.glass!.render(gl, target);
    const g = cursorGlyph(ctx.frame);
    if (g) this.layer!.draw(gl, target, cursorPose(ctx.cam), { under: [], glyphs: { mono: [g] }, over: [] }, null);
  }

  look(frame: number): Look {
    return cursorLook(frame);
  }

  temporal(frame: number): Temporal {
    return cursorTemporal(frame);
  }

  segment(): Segment {
    return cursorSegment();
  }

  dispose(): void {
    this.layer?.dispose();
    this.glass?.dispose();
    releaseAtlas('mono');
  }
}
