// S07's glass (•ω•) (spec §15 视觉大招 1): extruded glyph outlines in a
// physical glass (transmission, dispersion, iridescence) turning in front of
// the Swiss poster. The poster is rendered first into a backplate and drawn
// here as an opaque full-screen quad, so three's transmission pass sees it and
// the glass refracts it: the grid and the red disc bend inside the face and
// its edges split into colours.
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { studioEnvironment } from '../engine/env.ts';
import { glassText, loadOpentype } from '../engine/extrude.ts';
import { EXTRUDE_FONT } from '../engine/fonts.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { FOV, FRONT, type GlassPose } from '../shots/swiss.ts';

/** Em of the glass face's brackets in world units (logical px at the poster plane): the face stands about 70% of the frame high. */
const EM = 640;

export class GlassHero {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 20000);
  private readonly face = new THREE.Group();
  private readonly owned: { dispose(): void }[] = [];
  private backdrop: THREE.ShaderMaterial | null = null;

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    const font = await loadOpentype(staticFile(EXTRUDE_FONT));
    // The Swiss studio (spec §5: 哑光纸和红漆): white softboxes and a red lacquer panel.
    const env = studioEnvironment(
      gl,
      [
        { color: '#ffffff', intensity: 6, position: [0, 5, 2], size: [6, 2] },
        { color: '#e8402b', intensity: 5, position: [-5, -1, 1], size: [2, 5] },
        { color: '#ffffff', intensity: 3, position: [5, 1, 1], size: [1, 5] },
        { color: '#f1eee7', intensity: 1, position: [0, -5, 1], size: [6, 2] },
      ],
      0x0a0a0a,
    );
    this.scene.environment = env;
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.035, transmission: 1, thickness: 0.375 * EM, ior: 1.45, dispersion: 5,
      clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.3, iridescenceIOR: 1.3, attenuationColor: new THREE.Color('#fff4ec'), attenuationDistance: 4 * EM, specularIntensity: 1,
    });
    const eyeGlass = new THREE.MeshPhysicalMaterial({ color: '#111111', roughness: 0.02, transmission: 0.2, thickness: 0.25 * EM, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.5 });
    // The tech sample's proportions, in ems of the brackets.
    for (const [ch, x, y, s] of [['(', -0.656, 0, 1], ['ω', 0, -0.175, 0.5625], [')', 0.656, 0, 1]] as const) {
      const geo = glassText(font, ch, { size: s * EM, depth: 0.2 * EM });
      const mesh = new THREE.Mesh(geo, glass);
      mesh.position.set(x * EM, y * EM, 0);
      this.face.add(mesh);
      this.owned.push(geo);
    }
    const eyeGeo = new THREE.SphereGeometry(0.1 * EM, 64, 32);
    for (const x of [-0.2625, 0.2625]) {
      const eye = new THREE.Mesh(eyeGeo, eyeGlass);
      eye.position.set(x * EM, 0.1875 * EM, 0.03 * EM);
      eye.scale.set(1, 1.15, 0.7);
      this.face.add(eye);
    }
    this.backdrop = new THREE.ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
      depthTest: false,
      depthWrite: false,
    });
    const quad = new FullscreenQuad(this.backdrop);
    quad.mesh.renderOrder = -1;
    this.scene.add(quad.mesh, this.face);
    this.camera.aspect = size.width / size.height;
    this.camera.position.set(0, 0, FRONT);
    this.camera.updateProjectionMatrix();
    this.owned.push(glass, eyeGlass, eyeGeo, env, quad);
  }

  /** Draws the backplate and the glass face at `pose` into `target` (clearing it). */
  render(gl: THREE.WebGLRenderer, backplate: THREE.Texture, pose: GlassPose, target: THREE.WebGLRenderTarget): void {
    this.backdrop!.uniforms.map.value = backplate;
    this.face.position.set(pose.x, pose.y, pose.z);
    this.face.rotation.set(pose.rx, pose.ry, pose.rz);
    this.face.scale.setScalar(pose.scale);
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
