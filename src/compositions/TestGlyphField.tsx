import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { GlyphField } from '../engine/glyphField.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { prog } from '../engine/math.ts';
import { Stage } from '../engine/Stage.tsx';
import { layoutLines } from '../engine/textGrid.ts';
import type { FrameContext, Look, Quality, Renderable } from '../engine/types.ts';

const LINES = ['KAOMOJI.EXE v1.0 (•ω•)', '[ OK ] mounting /dev/smile', '[WARN] cuteness exceeds safe limits (；・∀・)', 'wide: ツ・＾〇︵ | half: ･ﾉ | blocks: █▉▊▋▌▍▎▏', '(╯°□°)╯︵ ┻━┻  ¯\\_(ツ)_/¯  ✧'];
const CHARS = [...new Set([...LINES.join(''), '@'])].filter((c) => c !== ' ');

/** Terminal lines on the grid, five glyphs morphing into circles, and one glyph scaled 40× (SDF sharpness). */
class TestGlyphFieldRoot implements Renderable {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-960, 960, 540, -540, -10, 10);
  private field: GlyphField | null = null;
  private big: GlyphField | null = null;
  private atlasTexture: THREE.Texture | null = null;

  async init() {
    await loadFonts();
    const atlas = buildGlyphAtlas(CHARS, (px) => `500 ${px}px ${cssStack('mono')}`);
    this.atlasTexture = atlas.texture;
    this.field = new GlyphField({ capacity: 512, atlas });
    this.big = new GlyphField({ capacity: 1, atlas });
    this.scene.add(this.field.mesh, this.big.mesh);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    const field = this.field!;
    let n = 0;
    for (const c of layoutLines(LINES)) {
      if (c.ch === ' ') continue;
      field.set(n++, { ch: c.ch, x: -860 + (c.col + c.width / 2) * 13.2, y: 400 - c.line * 30, size: 22, color: linear('#D8F5E1', 1.4) });
    }
    for (let i = 0; i < 5; i++) {
      field.set(n++, { ch: '@', x: -300 + i * 150, y: -120, size: 80, color: linear('#E8402B'), morph: prog(ctx.frame, 10 + i * 15, 40 + i * 15) });
    }
    field.commit(n);
    this.big!.set(0, { ch: 'ω', x: 560, y: -250, size: 600, color: linear('#4CF08C', 1.2) });
    this.big!.commit(1);
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  look(): Look {
    return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0.6, threshold: 0.9, smoothing: 0.2, radius: 0.7 }, aberration: 0, grain: 0, vignette: 0 };
  }

  dispose() {
    this.field?.dispose();
    this.big?.dispose();
    this.atlasTexture?.dispose();
  }
}

const createTestGlyphField = () => new TestGlyphFieldRoot();

export const TestGlyphField: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}>
        <Stage create={createTestGlyphField} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
