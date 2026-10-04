import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { SPRITES } from '../content/text.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { GlyphSwirl } from '../engine/glyphSwirl.ts';
import { ease, prog } from '../engine/math.ts';
import { Stage } from '../engine/Stage.tsx';
import type { FrameContext, Look, Quality, Renderable } from '../engine/types.ts';

class GlyphTest implements Renderable {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 100);
  private swirl: GlyphSwirl | null = null;

  async init() {
    await loadFonts();
    const atlas = buildGlyphAtlas(SPRITES, (px) => `800 ${px}px ${cssStack('rounded')}`);
    const palette = ['#ff48b0', '#0078bf', '#4cf08c', '#ffffff'].map((c) => new THREE.Color(c).multiplyScalar(1.3));
    this.swirl = new GlyphSwirl({ count: 20_000, sprites: SPRITES, atlas, seed: 7, palette });
    this.scene.add(this.swirl.mesh);
    this.camera.position.set(0, 1.2, 6);
    this.camera.lookAt(0, 0, 0);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    this.swirl!.update({ time: ctx.t, reveal: prog(ctx.frame, 0, 60, ease.outCubic), burst: 1 });
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  look(): Look {
    return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 1.1, threshold: 0.9, smoothing: 0.2, radius: 0.8 }, aberration: 0.0008, grain: 0.2, vignette: 0.35 };
  }

  dispose() {
    this.swirl?.dispose();
  }
}

const createGlyphTest = () => new GlyphTest();

export const TestGlyphs: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={createGlyphTest} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
