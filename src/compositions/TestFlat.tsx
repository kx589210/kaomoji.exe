import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import type * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { Stage } from '../engine/Stage.tsx';
import { FLAT_LOOK, type FrameContext, type Look, type Quality, type Renderable } from '../engine/types.ts';
import { TEST_FLAT, TEST_OUTLINES } from './testFlatLayout.ts';

/** Frame 0: multiply inks (overprint in both orders, a halftone, a stretched glyph) under normal paint (a red disc, a sheet with a hole). Frame 1: outlines. */
class TestFlatRoot implements Renderable {
  private ink: FlatLayer | null = null;
  private solid: FlatLayer | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }) {
    await loadFonts();
    const rounded = buildGlyphAtlas(TEST_FLAT.glyphs, (px) => `900 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 20, size: 2048 });
    const aspect = size.width / size.height;
    this.ink = new FlatLayer({ atlases: { rounded }, blend: 'multiply', aspect });
    this.solid = new FlatLayer({ atlases: { rounded }, blend: 'normal', aspect });
    this.owned.push(rounded.texture, this.ink, this.solid);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    const camera = frontal(fillDistance(1080, 20));
    if (Math.round(ctx.frame) === 1) {
      // Frame 1: outlines (check-flat scans them).
      this.solid!.draw(gl, target, camera, TEST_OUTLINES.content, { color: TEST_OUTLINES.paper, grain: 0 });
      return;
    }
    this.ink!.draw(gl, target, camera, TEST_FLAT.ink, { color: TEST_FLAT.paper, grain: 0 });
    this.solid!.draw(gl, target, camera, TEST_FLAT.solid, null);
  }

  look(): Look {
    return FLAT_LOOK;
  }

  dispose() {
    for (const o of this.owned) o.dispose();
  }
}

const createTestFlat = () => new TestFlatRoot();

export const TestFlat: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}>
        <Stage create={createTestFlat} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
