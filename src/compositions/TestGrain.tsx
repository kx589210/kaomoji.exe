import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { Layer2D } from '../engine/layer2d.ts';
import { Stage } from '../engine/Stage.tsx';
import { FLAT_LOOK, type FrameContext, type Look, type Quality, type Renderable } from '../engine/types.ts';

/** Flat grey (sRGB #8a8a8a) with the terminal's grain, as long as the film, for check-grain. */
class GrainTest implements Renderable {
  private layer: Layer2D | null = null;
  private quad: FullscreenQuad | null = null;

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }) {
    this.layer = new Layer2D(size.width, size.height);
    this.layer.paint((c) => {
      c.fillStyle = '#8a8a8a';
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
    return { ...FLAT_LOOK, grain: 0.35 };
  }

  dispose() {
    this.layer?.dispose();
    this.quad?.dispose();
  }
}

const createGrainTest = () => new GrainTest();

export const TestGrain: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}>
        <Stage create={createGrainTest} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
