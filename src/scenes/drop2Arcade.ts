// S31E 8-BIT (drop2 12) and S31V VOXEL (drop2 13, 3D), one renderer (builder A · ARCADE+VOXEL; build sheet
// notes/bid2/drop2-sheet2.md §3 "drop2 12–13", §4.9–§4.10; the pure shots: src/shots/drop2Arcade.ts, src/shots/drop2ArcadeVoxel.ts).
// Every game pixel is a cube of an InstancedMesh, flat-shaded in three tones (front 100 %, top 78 %, side 58 %): in bar 12 they are 0 px
// deep under the frontal camera (a flat 8-bit picture), on 13.1 the camera tilts and they stand up, so the tilt is a camera move only;
// the well's ghost portrait is a set of faint additive cyan quads on the playfield; the floor turns white through the morph; the HUD is
// on the cabinet's glass (DotGothic16, flat, over the cubes). The dispatcher (src/scenes/drop2.ts) sends this class the 'arcade' rows
// and, as Drop2Voxel (src/scenes/drop2Voxel.ts), the 'voxel' rows; constructible in Node (no GL before init).
import * as THREE from 'three';
import { type RGB, linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { ARCADE_TEXT } from '../content/drop2.ts';
import { GUEST_SWEAT, type Ink, arcadeAt, arcadeLook, arcadeSegment, arcadeTemporal } from '../shots/drop2Arcade.ts';
import { type Cube, VOXEL, camBasis, camPose, project, voxelCam, voxelFrame, voxelFrom, voxelLook, voxelSegment, voxelTemporal } from '../shots/drop2ArcadeVoxel.ts';
import { textGlyphs } from '../shots/common.ts';
import type { ScenePart } from './drop2Stub.ts';
import { SCREEN_POSE } from './drop2WaveMesh.ts';

/** The inks, linear (his amber and Defender's red a little hot, for the bloom). */
const INK: Readonly<Record<Ink, RGB>> = {
  white: linear('#F2F2F2'),
  cyan: linear('#3BD6FF', 1.35),
  green: linear('#3DFF6E'),
  amber: linear('#FFB23E', 1.3),
  red: linear('#E8402B', 1.3),
  redDeep: linear('#9E2A1B'),
  cream: linear('#F6F0E0', 1.25),
  grey: linear('#3A3F46'),
  ghost: linear('#3BD6FF'),
  black: linear('#000000'),
  pink: linear('#FF2E9A'),
  lemon: linear('#FFE600'),
  turquoise: linear('#00C2C7'),
  mint: linear('#4BE3A0'),
  cobalt: linear('#1F3BFF'),
  ink: linear('#111111'),
  cyanDeep: linear('#1A86B8'),
  cyanHot: linear('#8CEBFF', 1.3),
  silver: linear('#D2D7DE'),
  wall: linear('#5B6270'),
};

const CUBE_VERT = /* glsl */ `
  varying vec3 vColor;
  void main() {
    // Flat three-tone shading by the face's own normal: front (+z) 100 %, top/bottom 78 / 52 %, sides 58 / 70 %, back 45 %.
    vec3 n = normal;
    float tone = n.z > 0.5 ? 1.0 : n.z < -0.5 ? 0.45 : n.y > 0.5 ? 0.78 : n.y < -0.5 ? 0.52 : n.x > 0.5 ? 0.58 : 0.7;
    vColor = instanceColor * tone;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;
const CUBE_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() { gl_FragColor = vec4(vColor, 1.0); }`;

/** The playfield: black, the morph's white wiping outward from the drop line (the frame's centre plane). */
const FLOOR_VERT = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uRight;
  uniform vec3 uPivot;
  uniform float uReach;
  varying vec3 vW;
  void main() {
    float d = abs(dot(vW - uPivot, uRight));
    float k = 1.0 - smoothstep(uReach - 14.0, uReach + 14.0, d);
    gl_FragColor = vec4(vec3(k), 1.0);
  }`;

const advanceOf =
  (atlas: GlyphAtlas, fallback = 0.6): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? fallback;

export class Drop2Arcade implements ScenePart {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private cubes: THREE.InstancedMesh | null = null;
  /** His cubes in the voxel bar: their own scene, drawn after a depth clear, so nothing of the well ever cuts into him (R1-T12). */
  private heroScene: THREE.Scene | null = null;
  private heroCubes: THREE.InstancedMesh | null = null;
  private ghosts: THREE.InstancedMesh | null = null;
  private floor: THREE.Mesh | null = null;
  private hud: FlatLayer | null = null;
  private adv: { dot: Advance; jp: Advance } | null = null;
  private readonly capacity = 16000;
  private readonly owned: { dispose(): void }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.scene) return;
    await loadFonts();
    const hudChars = [...new Set([ARCADE_TEXT.score, ARCADE_TEXT.hi, ARCADE_TEXT.defender, ...ARCADE_TEXT.lives, ARCADE_TEXT.lines].join(''))].filter((c) => c !== ' ');
    const dot = buildGlyphAtlas(hudChars, (px) => `400 ${px}px ${cssStack('dot')}`, { fontPx: 64, radius: 8, size: 1024 });
    const jp = buildGlyphAtlas([...new Set([...GUEST_SWEAT])], (px) => `900 ${px}px ${cssStack('jp')}`, { fontPx: 64, radius: 8, size: 512 });
    this.owned.push(dot.texture, jp.texture);
    const aspect = size.width / size.height;
    this.hud = new FlatLayer({ atlases: { dot, jp }, blend: 'normal', aspect, shapes: 8, glyphs: 128 });
    this.owned.push(this.hud);
    this.adv = { dot: advanceOf(dot), jp: advanceOf(jp, 1) };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(20, aspect, 10, 80000);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.ShaderMaterial({ vertexShader: CUBE_VERT, fragmentShader: CUBE_FRAG });
    this.cubes = new THREE.InstancedMesh(box, mat, this.capacity);
    this.cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cubes.setColorAt(0, new THREE.Color(0, 0, 0));
    this.cubes.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    this.cubes.frustumCulled = false;
    this.heroCubes = new THREE.InstancedMesh(box, mat, 512);
    this.heroCubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.heroCubes.setColorAt(0, new THREE.Color(0, 0, 0));
    this.heroCubes.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    this.heroCubes.frustumCulled = false;
    this.heroScene = new THREE.Scene();
    this.heroScene.add(this.heroCubes);
    const quad = new THREE.PlaneGeometry(1, 1);
    // His ghost portrait: the cyan his face will lock in, as a faint additive preview on the playfield (a falling-block game's ghost piece).
    const gmat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...INK.ghost), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
    this.ghosts = new THREE.InstancedMesh(quad, gmat, 256);
    this.ghosts.frustumCulled = false;
    this.ghosts.renderOrder = -1;
    const fmat = new THREE.ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      uniforms: { uRight: { value: new THREE.Vector3(1, 0, 0) }, uPivot: { value: new THREE.Vector3() }, uReach: { value: -100 } },
    });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), fmat);
    this.floor.position.set(0, 0, -2);
    this.floor.renderOrder = -2;
    this.scene.add(this.floor, this.ghosts, this.cubes);
    this.owned.push(box, mat, quad, gmat, fmat, { dispose: () => this.floor?.geometry.dispose() });
  }

  private setCubes(list: readonly Cube[], mesh: THREE.InstancedMesh = this.cubes!): void {
    const n = Math.min(list.length, mesh === this.cubes ? this.capacity : 512);
    for (let i = 0; i < n; i++) {
      const k = list[i];
      this.v.set(k.x, k.y, k.z);
      if (k.rot) this.q.setFromEuler(this.e.set(k.rot[0], k.rot[1], k.rot[2]));
      else this.q.identity();
      this.s.set(Math.max(1e-4, k.sx), Math.max(1e-4, k.sy), Math.max(1e-4, k.sz));
      this.m.compose(this.v, this.q, this.s);
      mesh.setMatrixAt(i, this.m);
      const c = INK[k.ink];
      mesh.setColorAt(i, this.c.setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace));
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const voxel = f >= VOXEL.from;
    const fr = voxel ? voxelFrame(f) : null;
    const a = voxel ? null : arcadeAt(f);
    const cubes = fr ? fr.cubes : voxelFrom(a!, 0);
    // Bar 12 has its own moving camera (round 2, R2-05: arcadeCam, through voxelCam); 13.1's tilt starts where it ends.
    const cam = voxelCam(ctx.cam);
    this.setCubes(cubes);
    // The ghost portrait.
    const g = fr?.ghost ?? [];
    for (let i = 0; i < g.length && i < 256; i++) {
      this.m.compose(this.v.set(g[i].x, g[i].y, 0.5), this.q.identity(), this.s.set(g[i].w, g[i].h, 1));
      this.ghosts!.setMatrixAt(i, this.m);
    }
    this.ghosts!.count = Math.min(256, g.length);
    this.ghosts!.instanceMatrix.needsUpdate = true;
    (this.ghosts!.material as THREE.MeshBasicMaterial).opacity = g[0]?.alpha ?? 0;
    // The floor: black, the white wiping outward from his drop line through the morph.
    const pose = camPose(cam);
    const fu = (this.floor!.material as THREE.ShaderMaterial).uniforms;
    const right = camBasis(cam).r;
    fu.uRight.value.set(right[0], right[1], right[2]);
    fu.uPivot.value.set(pose.target[0], pose.target[1], pose.target[2]);
    fu.uReach.value = fr && fr.floorReach > 0 ? fr.floorReach : -100;
    const camera = this.camera!;
    camera.position.set(...pose.position);
    camera.up.set(...pose.up);
    camera.lookAt(...pose.target);
    camera.fov = pose.fov;
    const dist = Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]);
    camera.near = Math.max(5, dist / 200);
    camera.far = dist * 4 + 20000;
    camera.updateProjectionMatrix();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clearDepth();
    gl.render(this.scene!, camera);
    if (fr && fr.hero.length > 0) {
      this.setCubes(fr.hero, this.heroCubes!);
      gl.clearDepth();
      gl.render(this.heroScene!, camera);
    }
    gl.autoClear = auto;
    // The HUD on the glass.
    const hud = fr ? fr.hud : a!.hud;
    const flat = fr ? fr.flat : 1;
    const glyphs: { dot: Glyph[]; jp: Glyph[] } = { dot: [], jp: [] };
    for (const h of hud) {
      const atlas = h.text === GUEST_SWEAT ? 'jp' : 'dot';
      // In bar 12 the cannon's face sits on the playfield: through the arcade's camera, with the cannon's pixels.
      let [x, y, size] = [h.x, h.y, h.size];
      if (!fr) {
        const q = project(cam, [h.x - 960, 540 - h.y, 0]);
        const q1 = project(cam, [h.x - 860, 540 - h.y, 0]);
        [x, y, size] = [q[0], q[1], (h.size * Math.hypot(q1[0] - q[0], q1[1] - q[1])) / 100];
      }
      glyphs[atlas].push(...textGlyphs(h.text, { x: x - 960, y: 540 - y, size, color: INK[h.ink], advance: this.adv![atlas], align: h.align, alpha: flat }));
    }
    if (flat > 0) this.hud!.draw(gl, target, SCREEN_POSE, { under: [], glyphs, over: [] }, null);
  }

  look(frame: number): Look {
    return frame >= VOXEL.from ? voxelLook(frame) : arcadeLook(frame);
  }

  temporal(frame: number): Temporal {
    return frame >= VOXEL.from ? voxelTemporal(frame) : arcadeTemporal(frame);
  }

  segment(frame: number): Segment {
    return frame >= VOXEL.from ? voxelSegment(frame) : arcadeSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.cubes?.dispose();
    this.heroCubes?.dispose();
    this.ghosts?.dispose();
    this.scene = null;
  }
}
