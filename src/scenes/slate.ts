// Placeholder for frames whose scene is not built yet: the shot's id, world,
// space and bars on a dark card. For scrubbing the whole film in the Studio;
// never part of a delivered render.
import * as THREE from 'three';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { Layer2D } from '../engine/layer2d.ts';
import type { Temporal } from '../engine/temporal.ts';
import { FLAT_LOOK, type FrameContext, type Look, type Renderable } from '../engine/types.ts';
import { shotAtFrame } from '../score/shots.ts';

export class SlateScene implements Renderable {
  private layer: Layer2D | null = null;
  private quad: FullscreenQuad | null = null;
  private painted = '';

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.layer = new Layer2D(size.width, size.height);
    this.quad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: this.layer.texture } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
      }),
    );
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const shot = shotAtFrame(ctx.frame);
    const label = `${shot.id} · ${shot.world} · ${shot.space} · bars ${shot.fromBar}–${shot.toBar}`;
    if (label !== this.painted) {
      this.painted = label;
      this.layer!.paint((c) => {
        c.fillStyle = '#16181a';
        c.fillRect(0, 0, 1920, 1080);
        c.fillStyle = '#8a8f94';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = `500 44px ${cssStack('mono')}`;
        c.fillText(label, 960, 520);
        c.font = `400 26px ${cssStack('mono')}`;
        c.fillText('not built yet', 960, 590);
      });
    }
    this.quad!.render(gl, target);
  }

  look(): Look {
    return FLAT_LOOK;
  }

  temporal(): Temporal {
    return { samples: 1, shutter: 0, persistence: 0 };
  }

  dispose(): void {
    this.layer?.dispose();
    this.quad?.dispose();
  }
}
