import * as THREE from 'three';

export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/** One triangle that covers the viewport, with its own scene and camera. */
export class FullscreenQuad {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly mesh: THREE.Mesh;

  constructor(material: THREE.Material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null): void {
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
