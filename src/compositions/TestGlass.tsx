import { ThreeCanvas } from '@remotion/three';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { EXTRUDE_FONT } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { studioEnvironment } from '../engine/env.ts';
import { extrudeText, loadOpentype } from '../engine/extrude.ts';
import { Stage } from '../engine/Stage.tsx';
import type { FrameContext, Look, Quality, Renderable } from '../engine/types.ts';

/** Checks extrusion, holes, the procedural environment and glass (transmission + dispersion). */
class GlassTest implements Renderable {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 100);
  private readonly face = new THREE.Group();
  private readonly owned: { dispose(): void }[] = [];

  async init(gl: THREE.WebGLRenderer) {
    await loadFonts();
    const font = await loadOpentype(staticFile(EXTRUDE_FONT));
    const env = studioEnvironment(gl, [
      { color: '#ffffff', intensity: 6, position: [0, 5, 2], size: [6, 2] },
      { color: '#ff48b0', intensity: 4, position: [-5, 0, 1], size: [2, 5] },
      { color: '#0078bf', intensity: 4, position: [5, 0, 1], size: [2, 5] },
      { color: '#4cf08c', intensity: 2, position: [0, -4, 3], size: [6, 1] },
    ]);
    this.scene.environment = env;
    this.scene.background = new THREE.Color('#f1eee7');
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.6, ior: 1.45, dispersion: 4,
      clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.35, iridescenceIOR: 1.3, attenuationColor: new THREE.Color('#cdf3ff'), attenuationDistance: 3, specularIntensity: 1,
    });
    const eyeGlass = new THREE.MeshPhysicalMaterial({ color: '#16161a', metalness: 0, roughness: 0.02, transmission: 0.25, thickness: 0.4, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5 });
    const parts: [string, number, number][] = [['(', -1.05, 0], ['ω', 0, -0.28], [')', 1.05, 0]];
    for (const [ch, x, y] of parts) {
      const geo = extrudeText(font, ch, { size: ch === 'ω' ? 0.9 : 1.6, depth: 0.32 });
      const mesh = new THREE.Mesh(geo, glass);
      mesh.position.set(x, y, 0);
      this.face.add(mesh);
      this.owned.push(geo);
    }
    const eyeGeo = new THREE.SphereGeometry(0.16, 64, 32);
    for (const x of [-0.42, 0.42]) {
      const eye = new THREE.Mesh(eyeGeo, eyeGlass);
      eye.position.set(x, 0.3, 0.05);
      eye.scale.set(1, 1.15, 0.7);
      this.face.add(eye);
    }
    // A glyph with a hole: the triangle must stay open in the middle.
    const holeGeo = extrudeText(font, '▽', { size: 0.8, depth: 0.25 });
    const hole = new THREE.Mesh(holeGeo, eyeGlass);
    hole.position.set(1.9, -1.05, 0);
    this.scene.add(hole);
    this.owned.push(eyeGeo, holeGeo, glass, eyeGlass, env);
    this.scene.add(this.face);
    const grid = new THREE.GridHelper(20, 40, '#e8402b', '#111111');
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -2;
    this.scene.add(grid);
    this.camera.position.set(0, 0, 5.2);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget) {
    this.face.rotation.y = 0.6 * Math.sin(ctx.t * 1.4);
    this.face.rotation.x = 0.12 * Math.sin(ctx.t * 0.9);
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  look(): Look {
    return { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0.8, threshold: 1, smoothing: 0.2, radius: 0.7 }, aberration: 0, grain: 0.1, vignette: 0.2 };
  }

  dispose() {
    for (const o of this.owned) o.dispose();
  }
}

const createGlassTest = () => new GlassTest();

export const TestGlass: React.FC<{ quality: Quality }> = ({ quality }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <ThreeCanvas width={width} height={height} flat frameloop="demand" gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}>
        <Stage create={createGlassTest} quality={quality} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
