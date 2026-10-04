import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { Layer2D } from '../engine/layer2d.ts';
import { Stage } from '../engine/Stage.tsx';
import { FLAT_LOOK, type FrameContext, type Look, type Quality, type Renderable } from '../engine/types.ts';

/** Flat grey (sRGB #9a9a9a) through the CRT, for check-crt and for eyeballing. */
class TestCrtRoot implements Renderable {
  private layer: Layer2D | null = null;
  private quad: FullscreenQuad | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }) {
    this.layer = new Layer2D(size.width, size.height);
    this.layer.paint((c) => {
      c.fillStyle = '#9a9a9a';
      c.fillRect(0, 0, 1920, 1080);
    });
    this.quad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: this.layer.texture } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
      }),
    );
  }

  render(gl: THREE.WebGLRenderer, _ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    this.quad!.render(gl, target);
  }

  look(): Look {
    return { ...FLAT_LOOK, crt: { amount: 1, curvature: 0.045, scanlines: 0.5, lines: 360, grille: 0 } };
  }

  dispose() {
    this.layer?.dispose();
    this.quad?.dispose();
  }
}

const createTestCrt = () => new TestCrtRoot();

export const TestCRT: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}>
        <Stage create={createTestCrt} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
