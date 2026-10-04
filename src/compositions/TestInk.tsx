import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { Stage } from '../engine/Stage.tsx';
import { FLAT_LOOK, type FrameContext, type Look, type Quality, type Renderable } from '../engine/types.ts';
import { INK } from '../worlds/terminal.ts';

/** Three flat stripes in the terminal's HDR inks (amber, pink, text; each above 1 in some channel), for check-ink. */
class TestInkRoot implements Renderable {
  private quad: FullscreenQuad | null = null;

  async init() {
    this.quad = new FullscreenQuad(
      new THREE.ShaderMaterial({
        uniforms: { a: { value: new THREE.Vector3(...INK.amber) }, b: { value: new THREE.Vector3(...INK.pink) }, c: { value: new THREE.Vector3(...INK.text) } },
        vertexShader: FULLSCREEN_VERT,
        fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec2 vUv; void main() { gl_FragColor = vec4(vUv.x < 1.0 / 3.0 ? a : vUv.x < 2.0 / 3.0 ? b : c, 1.0); }',
      }),
    );
  }

  render(gl: THREE.WebGLRenderer, _ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    this.quad!.render(gl, target);
  }

  look(): Look {
    return FLAT_LOOK;
  }

  dispose() {
    this.quad?.dispose();
  }
}

const createTestInk = () => new TestInkRoot();

export const TestInk: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}>
        <Stage create={createTestInk} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
