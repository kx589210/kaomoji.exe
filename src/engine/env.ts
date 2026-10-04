import * as THREE from 'three';

export type StudioPanel = {
  color: THREE.ColorRepresentation;
  /** Emission multiplier; values above 1 make HDR highlights. */
  intensity: number;
  position: [number, number, number];
  size: [number, number];
};

/**
 * A code-built photo studio (glowing panels around the origin) prefiltered
 * into an environment map for reflections and refraction. No image files.
 */
export function studioEnvironment(gl: THREE.WebGLRenderer, panels: readonly StudioPanel[], background: THREE.ColorRepresentation = 0x060606): THREE.Texture {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  for (const p of panels) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(p.size[0], p.size[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.intensity), side: THREE.DoubleSide }),
    );
    mesh.position.set(...p.position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  }
  const pmrem = new THREE.PMREMGenerator(gl);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return target.texture;
}
