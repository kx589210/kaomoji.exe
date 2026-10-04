// The look test for the cosmos made of kaomoji (KX-TestKosmos): frame 0 a
// planet of faces, frame 1 a spiral galaxy of faces, tipped and glowing.
import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { MINI_FACES } from '../content/drop1.ts';
import { CardField } from '../engine/cardField.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { hash } from '../engine/random.ts';
import { Stage } from '../engine/Stage.tsx';
import type { FrameContext, Look, Quality, Renderable } from '../engine/types.ts';
import { type CardCamera, type CardLayout, type Star, card, earthCards, galaxyCards, makeGalaxy } from '../shots/kosmos.ts';
import { SKY } from '../shots/galaxies.ts';
import { retroLook } from '../worlds/retro.ts';

class KosmosTest implements Renderable {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(20, 16 / 9, 10, 100000);
  private solid: CardField | null = null;
  private light: CardField | null = null;
  private front: CardField | null = null;
  private layout: CardLayout | null = null;
  private galaxy: Star[] = [];
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }) {
    await loadFonts();
    const atlas = buildGlyphAtlas(MINI_FACES, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 48, radius: 8 });
    this.layout = { aspect: (f) => atlas.entries.get(f)!.aspect, quadPerEm: atlas.cellH / atlas.fontPx, faces: MINI_FACES };
    this.light = new CardField({ capacity: 40000, atlas, blend: 'add' });
    this.solid = new CardField({ capacity: 8000, atlas, blend: 'normal', hideBacks: true });
    this.front = new CardField({ capacity: 8000, atlas, blend: 'add' });
    this.light.mesh.renderOrder = 1;
    this.solid.mesh.renderOrder = 2;
    this.front.mesh.renderOrder = 3;
    this.scene.add(this.light.mesh, this.solid.mesh, this.front.mesh);
    this.scene.background = new THREE.Color().setRGB(...(SKY.black as [number, number, number]));
    this.galaxy = makeGalaxy(this.layout, 26000, 4242, 2, (14 * Math.PI) / 180);
    this.camera.aspect = size.width / size.height;
    this.owned.push(atlas.texture, this.light, this.solid, this.front);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    const L = this.layout!;
    const t = ctx.frame;
    const eye: [number, number, number] = [0, 0, 3200];
    this.camera.position.set(...eye);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const cam: CardCamera = { eye, right: [right.x, right.y, right.z], up: [up.x, up.y, up.z] };
    // Far stars: faces of very uneven brightness in their temperatures' colours.
    const temps = [SKY.hot, SKY.white, SKY.sun, SKY.gold, SKY.orange];
    const far = Array.from({ length: 900 }, (_, k) => {
      const b = 0.08 + 0.5 * hash(k, 5) ** 6 + 2.5 * hash(k, 6) ** 60;
      const c = temps[Math.floor(hash(k, 7) * temps.length)];
      return card(L, L.faces[k % L.faces.length], [(hash(k, 1) - 0.5) * 4400, (hash(k, 2) - 0.5) * 2500, -900 - 1800 * hash(k, 3)], cam.right, cam.up, 4 + 7 * hash(k, 4), [c[0] * b, c[1] * b, c[2] * b]);
    });
    if (Math.round(t) % 2 === 0) {
      const planet = { centre: [0, 0, 0] as const, radius: 420, spin: 1.9 + 0.01 * t, tilt: 0.35, n: 2200, em: 26, seed: 77 };
      const sun = [-0.78, 0.28, 0.55];
      const l = Math.hypot(...sun);
      const e = earthCards(L, planet, cam, [sun[0] / l, sun[1] / l, sun[2] / l]);
      this.light!.write(far);
      this.solid!.write(e.solid);
      this.front!.write(e.light);
    } else {
      this.solid!.write([]);
      this.front!.write([]);
      this.light!.write([...far, ...galaxyCards(L, this.galaxy, { centre: [0, -20, 0], radius: 1050, spin: 0.002 * t, tilt: (58 * Math.PI) / 180, heading: 0.35, light: 0.3 }, cam)]);
    }
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  look(): Look {
    return { ...retroLook(), vignette: 0.2, grain: 0.05, bloom: { intensity: 0.9, threshold: 0.75, smoothing: 0.3, radius: 0.75 } };
  }

  dispose() {
    for (const o of this.owned) o.dispose();
  }
}

const createKosmosTest = () => new KosmosTest();

export const TestKosmos: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={createKosmosTest} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
