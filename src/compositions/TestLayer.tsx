import { ThreeCanvas } from '@remotion/three';
import { useCallback } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { FullscreenQuad, FULLSCREEN_VERT } from '../engine/fullscreen.ts';
import { Layer2D } from '../engine/layer2d.ts';
import { ease, prog } from '../engine/math.ts';
import { Stage } from '../engine/Stage.tsx';
import { FLAT_LOOK, type FrameContext, type Look, type Quality, type Renderable } from '../engine/types.ts';

/**
 * Test scene: a 1-logical-pixel vertical line at x = 960 (scale check), a bar
 * that whips across the screen (motion-blur check) and glowing text (bloom check).
 */
class LayerTest implements Renderable {
  private readonly clean: boolean;
  private layer: Layer2D | null = null;
  private quad: FullscreenQuad | null = null;

  constructor(clean: boolean) {
    this.clean = clean;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }) {
    await loadFonts();
    this.layer = new Layer2D(size.width, size.height);
    this.quad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: this.layer.texture } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: /* glsl */ `
          uniform sampler2D map;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(map, vUv);
            float glow = step(0.5, c.g) * step(c.r, 0.5);
            gl_FragColor = vec4(c.rgb * (1.0 + glow * 2.0), 1.0);
          }`,
        depthTest: false,
        depthWrite: false,
      }),
    );
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    const layer = this.layer!;
    layer.paint((c) => {
      c.fillStyle = '#0c0f0e';
      c.fillRect(0, 0, 1920, 1080);
      c.fillStyle = '#ffffff';
      c.fillRect(960, 0, 1, 1080);
      const x = -400 + 2720 * prog(ctx.frame, 20, 40, ease.inOutCubic);
      c.fillStyle = '#e8402b';
      c.fillRect(x, 700, 400, 120);
      c.fillStyle = '#4cf08c';
      c.font = `700 120px ${cssStack('mono')}`;
      c.fillText('(•ω•) kaomoji', 200, 400);
    });
    this.quad!.render(gl, target);
  }

  look(): Look {
    if (this.clean) return FLAT_LOOK;
    return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 1.2, threshold: 1, smoothing: 0.2, radius: 0.75 }, aberration: 0.001, grain: 0.3, vignette: 0.4 };
  }

  dispose() {
    this.layer?.dispose();
    this.quad?.dispose();
  }
}

export const TestLayer: React.FC<{ quality: Quality; clean?: boolean }> = ({ quality, clean = false }) => {
  const { width, height } = useVideoConfig();
  const create = useCallback(() => new LayerTest(clean), [clean]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={create} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
