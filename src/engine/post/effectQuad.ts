import type { Effect } from 'postprocessing';
import * as THREE from 'three';
import { FULLSCREEN_VERT, FullscreenQuad } from '../fullscreen.ts';

/** The fragment shader that runs an effect's mainImage on a texture: the parts postprocessing's EffectMaterial would supply. */
export function effectQuadFragment(effect: Effect): string {
  return /* glsl */ `
uniform sampler2D inputBuffer;
uniform vec2 resolution;
uniform vec2 texelSize;
varying vec2 vUv;
${effect.getFragmentShader()}
void main() {
  vec4 outputColor;
  mainImage(texture2D(inputBuffer, vUv), vUv, outputColor);
  gl_FragColor = outputColor;
}`;
}

/**
 * Runs one of the post effects (PixelEffect, KaleidoscopeEffect, GlyphFlashEffect: any whose mainImage reads only `inputBuffer`,
 * `resolution` and its own uniforms) inside a scene, from a texture into a target — for a look that must not cover the whole
 * frame: the kaleidoscope of a feed with the hero drawn over it unmirrored, a feed pixelated before the sprites land on it. The quad
 * shares the effect's uniform objects, so `effect.configure(...)` sets it up; `draw` sizes it (sizes stay 1080p px, scaled to the
 * target), reads `input` and overwrites `target` (no blending; draw the rest on top afterwards). It owns its material, not the effect.
 */
export class EffectQuad {
  readonly effect: Effect;
  private readonly quad: FullscreenQuad;
  private readonly material: THREE.ShaderMaterial;
  private readonly size = new THREE.Vector2();

  constructor(effect: Effect) {
    this.effect = effect;
    const uniforms: Record<string, THREE.IUniform> = {
      inputBuffer: new THREE.Uniform(null),
      resolution: new THREE.Uniform(new THREE.Vector2(1, 1)),
      texelSize: new THREE.Uniform(new THREE.Vector2(1, 1)),
    };
    for (const [name, u] of effect.uniforms) uniforms[name] = u;
    this.material = new THREE.ShaderMaterial({ uniforms, vertexShader: FULLSCREEN_VERT, fragmentShader: effectQuadFragment(effect), depthTest: false, depthWrite: false });
    this.quad = new FullscreenQuad(this.material);
  }

  /** The shader's uniforms (the effect's own, plus inputBuffer / resolution / texelSize). */
  get uniforms(): Record<string, THREE.IUniform> {
    return this.material.uniforms;
  }

  draw(gl: THREE.WebGLRenderer, input: THREE.Texture, target: THREE.WebGLRenderTarget | null): void {
    if (target) this.size.set(target.width, target.height);
    else gl.getDrawingBufferSize(this.size);
    this.effect.setSize(this.size.x, this.size.y);
    const u = this.material.uniforms;
    u.inputBuffer.value = input;
    (u.resolution.value as THREE.Vector2).copy(this.size);
    (u.texelSize.value as THREE.Vector2).set(1 / this.size.x, 1 / this.size.y);
    this.quad.render(gl, target);
  }

  dispose(): void {
    this.quad.dispose();
  }
}
