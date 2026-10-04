// S32B BULLET TIME, drop2 19.4&–20.4& on the GPU (builder B; build sheet notes/bid2/drop2-sheet2.md §3, §4.16, §5 #30–#31). The pure
// picture is src/shots/drop2Bullet.ts: THE FRAME's held cells lifted into 8 plates, the orbit with its lens, the living hold (rings of
// light, heartbeats, the music box's flares, the glints), the crown's sparkles, his card and the guest's. This class copies it to the GPU:
// - The field, his card, the glints and the sparkles are flat content drawn by FlatLayers whose glyphs and shapes are BILLBOARDS (their
//   vertex shaders patched at build: each quad is laid out in view space round its centre), so nothing ever reads mirrored and a card
//   stood up by `standUp` faces the camera whole. Front-on and flat they draw what Drop2Overload draws.
// - The crown is real glass (S07's material, tinted the cocktail's pink): everything behind it is drawn into a backplate, laid under the
//   glass as an opaque full-screen quad so three's transmission pass refracts it; then the glass; then whatever is nearer the lens.
// - Light is added, so the cells' order does not matter; the two things that are not light — the guest's dark tube glass and the crown —
//   are drawn back to front with the cells split round them by their depth along the view.
// - THE FRAME itself (the frozen field and its sort plan, the atlases, the layout) is Drop2Overload's (bulletKit); from the last half frame
//   (handsBack) the sub-frames are handed to it: front-on and flat, the built drain draws them, exactly.
// It stands in for THE FRAME held (Drop2Held, the skeleton's stub: `held()` is the content instant), filmed by a camera that moves.
// v08 (bridge B, src/score/bridgeB.ts): it draws drop 2's last beat too, on its camera's time (bulletTimeAt): from 20.4 the camera's clock
// runs down (the tape stop: the orbit's last 12° and the plates' landing take the whole beat, landing front-on at rest on the bridge's
// downbeat) and from 20.4& every other frame repeats (the frame rate falling); the shutter and the lens stay the output frame's.
import * as THREE from 'three';
import type { Pose, Vec3 } from '../engine/camera.ts';
import { linear } from '../engine/color.ts';
import { studioEnvironment } from '../engine/env.ts';
import { FlatLayer, type FlatContent, type Paper } from '../engine/flatLayer.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import type { Glyph } from '../engine/glyphField.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { CRASH, CRASH_HOLD } from '../score/drop2.ts';
import {
  type BulletCamera,
  CROWN,
  CROWN_TINT,
  type HeldCell,
  bulletCamera,
  bulletGlints,
  bulletLook,
  bulletSegment,
  bulletTemporal,
  fieldGlyphsAt,
  skyGlyphsAt,
  crownGlow,
  crownSpikes,
  crownSparkles,
  guestAnchor,
  guestCard,
  handsBack,
  heldCells,
  heroCard,
  lensPoint,
  revealAlpha,
  viewDepth,
} from '../shots/drop2Bullet.ts';
import { bulletTimeAt } from '../shots/bridgeB.ts';
import { capsuleOf, guestContent } from '../shots/drop2Overload.ts';
import { PALETTES } from '../shots/drop2Shared.ts';
import type { Drop2Overload } from './drop2Overload.ts';
import { Drop2Held } from './drop2Stub.ts';

// ——— Billboards: the flat engine's quads laid out in view space ————————————————————————————————————————————————————————————————

/** The lines of the flat engine's vertex shaders that place a quad in its plane, and their billboard versions (the quad round its centre, in view space). */
const BILLBOARD: readonly (readonly [string, string])[] = [
  // GlyphField (src/engine/glyphField.ts).
  ['vec4 mv = modelViewMatrix * vec4(aPos.xy + p, aPos.z, 1.0);', 'vec4 mv = modelViewMatrix * vec4(aPos.xy, aPos.z, 1.0);\n          mv.xy += p;'],
  // ShapeField (src/engine/shapeField.ts).
  ['vec4 mv = modelViewMatrix * vec4(p, aPos.z, 1.0);', 'vec4 mv = modelViewMatrix * vec4(aPos.xy, aPos.z, 1.0);\n          mv.xy += p - aPos.xy;'],
];
/** Turns every glyph and shape of a FlatLayer into a billboard (its paper stays a screen quad). Throws if the engine's shaders have moved on. */
function billboard(layer: FlatLayer): FlatLayer {
  let patched = 0;
  layer.scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (!(m instanceof THREE.ShaderMaterial)) return;
    if (m.vertexShader === FULLSCREEN_VERT) return;
    const hit = BILLBOARD.find(([from]) => m.vertexShader.includes(from));
    if (!hit) throw new Error('drop2Bullet: a FlatLayer shader has changed; the billboard patch no longer applies');
    m.vertexShader = m.vertexShader.replace(hit[0], hit[1]);
    m.needsUpdate = true;
    patched++;
  });
  if (patched === 0) throw new Error('drop2Bullet: no FlatLayer shader to patch');
  return layer;
}

// ——— The glass crown (S07's glass, the cocktail's pink) ———————————————————————————————————————————————————————————————————————

/** The crown in glass (static: the splash is frozen): its wall, its spikes and beads, the flattened drop and the splash's ring. */
function buildCrown(material: THREE.Material, owned: { dispose(): void }[]): THREE.Group {
  const group = new THREE.Group();
  const c = new THREE.Vector3(...CROWN.centre);
  // The wall: a thin flared sheet of the drink thrown up round the drop.
  const wall = new THREE.CylinderGeometry(CROWN.radius * 1.08, CROWN.radius * 0.9, CROWN.wall, 96, 1, true);
  const wallMesh = new THREE.Mesh(wall, material);
  wallMesh.position.set(c.x, c.y + CROWN.wall / 2, c.z);
  group.add(wallMesh);
  const sphere = new THREE.SphereGeometry(1, 40, 28);
  const cone = new THREE.ConeGeometry(1, 1, 24, 1, true);
  owned.push(wall, sphere, cone);
  const up = new THREE.Vector3(0, 1, 0);
  for (const s of crownSpikes()) {
    const foot = new THREE.Vector3(...s.foot);
    const tip = new THREE.Vector3(...s.tip);
    const along = tip.clone().sub(foot);
    const spike = new THREE.Mesh(cone, material);
    spike.position.copy(foot).addScaledVector(along, 0.5);
    spike.scale.set(s.width, along.length(), s.width);
    spike.quaternion.setFromUnitVectors(up, along.clone().normalize());
    group.add(spike);
    const bead = new THREE.Mesh(sphere, material);
    bead.position.set(s.bead[0], s.bead[1], s.bead[2]);
    bead.scale.set(s.radius, s.radius * 1.12, s.radius);
    bead.quaternion.copy(spike.quaternion);
    group.add(bead);
  }
  // The flattened drop: a lens of glass where it landed.
  const disc = new THREE.Mesh(sphere, material);
  disc.position.set(c.x, c.y + CROWN.disc[1] / 2, c.z);
  disc.scale.set(CROWN.disc[0], CROWN.disc[1], CROWN.disc[0]);
  group.add(disc);
  // The splash's ring, lying round the crown's foot.
  const torus = new THREE.TorusGeometry(CROWN.ring, CROWN.tube, 20, 128);
  owned.push(torus);
  const ring = new THREE.Mesh(torus, material);
  ring.position.set(c.x, c.y + CROWN.tube, c.z);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  return group;
}

// ——— The part ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A draw of the depth-ordered pass: light (cells, cards' light, glints, sparkles) or a thing that hides what is behind it. */
type Layered = { depth: number; kind: 'guest' | 'crown' };

export class Drop2Bullet extends Drop2Held {
  private readonly overload: Drop2Overload;
  private size = { width: 1920, height: 1080 };
  private light: FlatLayer | null = null;
  private dark: FlatLayer | null = null;
  private glass: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; crown: THREE.Group; backdrop: THREE.ShaderMaterial; material: THREE.MeshPhysicalMaterial } | null = null;
  private back: THREE.WebGLRenderTarget | null = null;
  private readonly owned: { dispose(): void }[] = [];
  private readonly cells: Glyph[] = [];

  constructor(deps: { overload: Drop2Overload }) {
    super(deps.overload, CRASH_HOLD.from - 1);
    this.overload = deps.overload;
  }

  // The base (THE FRAME held) takes no arguments here; the dispatcher always passes them.
  async init(gl?: THREE.WebGLRenderer, size?: { width: number; height: number }): Promise<void> {
    if (!gl || !size) throw new Error('drop2Bullet: init(gl, size)');
    this.size = size;
    // The crown's glass: S07's (transmission, dispersion, a clear coat), tinted the cocktail's pink in its depth.
    const env = studioEnvironment(
      gl,
      [
        { color: '#ffffff', intensity: 5, position: [0, 5, 2], size: [6, 2] },
        { color: '#ff3d8b', intensity: 4, position: [-5, -1, 1], size: [2, 5] },
        { color: '#ffb23e', intensity: 2.5, position: [5, 1, 1], size: [1, 5] },
        { color: '#3fe0ff', intensity: 1.5, position: [0, -5, -2], size: [6, 2] },
      ],
      0x070608,
    );
    const material = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.02, transmission: 1, thickness: 24, ior: 1.5, dispersion: 4,
      clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.35, iridescenceIOR: 1.3, attenuationColor: new THREE.Color(CROWN_TINT), attenuationDistance: 70, specularIntensity: 1,
      transparent: true, opacity: 1, side: THREE.DoubleSide,
    });
    const backdrop = new THREE.ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
      depthTest: false,
      depthWrite: false,
    });
    const quad = new FullscreenQuad(backdrop);
    quad.mesh.renderOrder = -1;
    const scene = new THREE.Scene();
    scene.environment = env;
    const crown = buildCrown(material, this.owned);
    scene.add(quad.mesh, crown);
    const camera = new THREE.PerspectiveCamera(20, size.width / size.height, 10, 20000);
    this.glass = { scene, camera, crown, backdrop, material };
    this.owned.push(env, material, backdrop, quad);
  }

  /** The billboard layers, on the overload's atlases (made on first use: the overload initialises alongside this part). */
  private layers(gl: THREE.WebGLRenderer): { light: FlatLayer; dark: FlatLayer } {
    if (!this.light || !this.dark) {
      const { atlases } = this.overload.bulletKit(gl);
      const aspect = this.size.width / this.size.height;
      this.light = billboard(new FlatLayer({ atlases: { mono: atlases.mono, rounded: atlases.rounded, bold: atlases.bold }, blend: 'add', aspect, shapes: 2048, glyphs: 24000 }));
      this.dark = billboard(new FlatLayer({ atlases: { rounded: atlases.rounded }, blend: 'normal', aspect, shapes: 512, glyphs: 64 }));
      this.owned.push(this.light, this.dark);
    }
    return { light: this.light, dark: this.dark };
  }

  private backplate(): THREE.WebGLRenderTarget {
    if (!this.back) {
      this.back = new THREE.WebGLRenderTarget(this.size.width, this.size.height, { type: THREE.HalfFloatType, depthBuffer: true });
      this.owned.push(this.back);
    }
    return this.back;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    // The camera's time (v08: the tape stop and the falling frame rate over drop 2's last beat; the film's own before it).
    const f = bulletTimeAt(ctx.frame);
    const camAt = bulletTimeAt(ctx.cam);
    // The last half frame of the camera's time: front-on, flat and still — the crash shot's own sub-frames (exactly what v04 drew on 20.4&).
    if (handsBack(f)) {
      this.overload.render(gl, { ...ctx, frame: f, cam: camAt }, target);
      return;
    }
    const kit = this.overload.bulletKit(gl);
    const { light, dark } = this.layers(gl);
    const cam = bulletCamera(camAt, lensPoint(ctx.frame));
    const ground: Paper = { color: linear(PALETTES.terminal.ground), grain: 0 };
    const reveal = revealAlpha(cam.theta);

    // THE FRAME's cells, lit by the living hold and stood in depth.
    const held: readonly HeldCell[] = heldCells(kit.field, kit.plan);
    const cells = this.cells;
    cells.length = skyGlyphsAt(f, cam, cells, fieldGlyphsAt(held, f, cam, cells));
    const hero = heroCard(kit.field, kit.layout, cam.basis, f);
    const glints = bulletGlints(f, capsuleOf(kit.field));
    const sparkles = crownSparkles(f, reveal);

    // The two things that hide what is behind them, back to front; the light is split round them by its depth along the view.
    const things: Layered[] = [];
    if (reveal > 0.004) {
      things.push({ depth: viewDepth(cam, guestAnchor()), kind: 'guest' });
      things.push({ depth: viewDepth(cam, CROWN.centre), kind: 'crown' });
    }
    things.sort((a, b) => b.depth - a.depth);
    const edges = [Infinity, ...things.map((t) => t.depth), -Infinity];
    const bucket = (k: number): FlatContent => {
      const inside = (p: readonly [number, number, number?]): boolean => {
        const d = viewDepth(cam, [p[0], p[1], p[2] ?? 0]);
        return d <= edges[k] && d > edges[k + 1];
      };
      const mono = cells.filter((g) => inside([g.x, g.y, g.z]));
      const heroIn = inside([0, 0, 0]);
      const shapes: Shape[] = [...glints, ...sparkles].filter((s) => inside([s.x, s.y, s.z]));
      return {
        under: heroIn ? [...hero.under, ...shapes] : shapes,
        glyphs: { mono, rounded: heroIn ? (hero.glyphs.rounded ?? []) : [], bold: heroIn ? (hero.glyphs.bold ?? []) : [] },
        over: [],
      };
    };
    const guest = guestCard(guestContent(CRASH, kit.layout, { splash: false }), cam.basis, reveal);

    // Draw: everything behind the crown into the backplate (when the crown shows), the crown refracting it into the target, then the rest.
    const crownAt = things.findIndex((t) => t.kind === 'crown');
    let into = crownAt >= 0 ? this.backplate() : target;
    let paper: Paper | null = ground;
    const drawLight = (c: FlatContent): void => {
      light.draw(gl, into, cam.pose, c, paper);
      paper = null;
    };
    for (let k = 0; k < edges.length - 1; k++) {
      drawLight(bucket(k));
      const thing = things[k];
      if (!thing) break;
      if (thing.kind === 'guest') {
        dark.draw(gl, into, cam.pose, guest.glass, null);
        light.draw(gl, into, cam.pose, guest.light, null);
      } else {
        // The drink's light inside it, then the glass bending it.
        light.draw(gl, into, cam.pose, { under: crownGlow(f, reveal), glyphs: {}, over: [] }, null);
        this.drawCrown(gl, into, target, cam, reveal);
        into = target;
      }
    }
  }

  /** The crown over the backplate `back`, into `target`: the backplate as an opaque backdrop (three's transmission sees it), then the glass. */
  private drawCrown(gl: THREE.WebGLRenderer, back: THREE.WebGLRenderTarget, target: THREE.WebGLRenderTarget, cam: BulletCamera, alpha: number): void {
    const g = this.glass!;
    g.backdrop.uniforms.map.value = back.texture;
    g.material.opacity = alpha;
    setCamera(g.camera, cam.pose);
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clearDepth();
    gl.render(g.scene, g.camera);
    gl.autoClear = auto;
  }

  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame = CRASH_HOLD.from): void {
    // E9's lines run on the film's time: the frozen one blinks on, the camera's types in on 20.1.
    this.overload.screenOverlay(gl, target, frame);
  }

  look(frame = CRASH_HOLD.from): Look {
    return bulletLook(bulletTimeAt(frame));
  }

  temporal(frame = CRASH_HOLD.from): Temporal {
    return bulletTemporal(frame);
  }

  segment(frame: number): Segment {
    return bulletSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.light = null;
    this.dark = null;
    this.glass = null;
    this.back = null;
  }
}

/** Copies a pose into a three camera. */
function setCamera(camera: THREE.PerspectiveCamera, pose: Pose): void {
  camera.position.set(...(pose.position as Vec3));
  camera.up.set(...(pose.up as Vec3));
  camera.lookAt(...(pose.target as Vec3));
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
}
