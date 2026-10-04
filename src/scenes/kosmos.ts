// The cosmos (its bars 1–4) on the GPU (the cosmos easter egg, photographed):
// the flat layer of cosmos bar 1's first instants (the Riso sun of S12's last
// frame and the shockwave), then one 3D world — far stars, the galaxies as
// GPU fields (light and dust), the spikes, the arm round Earth, the Big Bang's extruded pieces (enamel and
// chrome in a code-built studio, a core light) and its little faces, Earth's
// and the Moon's dark bodies under their faces, the meteors — and the party
// monitor over it all. Through the freeze every motion-blur sub-frame moves
// the camera to its own point of a lens (a Vogel disk) aimed at the burst's
// centre, so the frame has real depth of field; through the stutter a
// repeated output frame shows its slice again. The shots are pure
// (src/shots/burst.ts, src/shots/voyage.ts).
import { staticFile } from 'remotion';
import * as THREE from 'three';
import { MINI_FACES } from '../content/drop1.ts';
import { type Pose, frontal } from '../engine/camera.ts';
import { CardField } from '../engine/cardField.ts';
import { studioEnvironment } from '../engine/env.ts';
import { extrudeText, loadOpentype } from '../engine/extrude.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { EXTRUDE_FONT, cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { GalaxyField } from '../engine/galaxyField.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { smoothstep } from '../engine/math.ts';
import { SpikeField } from '../engine/spikeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import { type FrameContext, type Look, type Renderable, mixLook } from '../engine/types.ts';
import { BURST, STUTTER, stutterFrame } from '../score/drop1.ts';
import { GATHER, ORIGIN, PIECES, burstAperture, burstFlat, burstPaper, burstTemporal, coreAt, lensIndex, piecePose, vogel } from '../shots/burst.ts';
import { type CardCamera, type CardLayout } from '../shots/kosmos.ts';
import {
  CORE_LIMB, VOYAGE, bellFlares, bodies, hatFlares, bridgeShrink, dustOn, earthScene, farGalaxies, galaxyPlacements, galaxySpikes, galaxyStyle, heroGalaxy, localCards, moteCards, skyCards, voyageBackground, voyageCamera,
} from '../shots/voyage.ts';
import { PAPER_GRAIN, risoLook } from '../worlds/riso.ts';
import { spaceLook } from '../worlds/space.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { HudLayer } from './hud.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);

/** Faces are extruded at this em (world units) and scaled to each piece's size. */
const EM = 100;

/** `pose` with its eye moved across the lens by `dx`, `dy` (world units, in the view's right and up), still aimed at its target. */
function onLens<P extends Pose>(pose: P, dx: number, dy: number): P {
  const f = new THREE.Vector3(...pose.target).sub(new THREE.Vector3(...pose.position)).normalize();
  const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(...pose.up)).normalize();
  const up = new THREE.Vector3().crossVectors(right, f);
  const eye = new THREE.Vector3(...pose.position).addScaledVector(right, dx).addScaledVector(up, dy);
  return { ...pose, position: [eye.x, eye.y, eye.z] };
}

/**
 * The scene's transparent fields, in the order they are drawn. three.js draws
 * its opaque list first — the Big Bang's pieces and the dark bodies of Earth
 * and the Moon, which write depth — so renderOrder only orders these among
 * themselves. `behind`: the field reaches beyond those solids and depth-tests
 * against them, so they hide it (it never writes depth, so its own additive
 * order is unchanged). The faces standing on Earth's surface and the meteors
 * landing on it are billboards just above the body, which would clip them.
 */
export const KOSMOS_FIELDS = [
  { name: 'sky', behind: true },
  { name: 'galaxies', behind: true },
  { name: 'dust', behind: true },
  { name: 'spikes', behind: true },
  { name: 'local', behind: true },
  { name: 'motes', behind: true },
  { name: 'solid', behind: false },
  { name: 'front', behind: false },
  { name: 'flight', behind: false },
] as const;
type FieldName = (typeof KOSMOS_FIELDS)[number]['name'];

/** A four-pointed star, `1` across, in the xy plane. */
function starShape(): THREE.Shape {
  const s = new THREE.Shape();
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.PI / 2;
    const r = i % 2 ? 0.16 : 0.5;
    if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a));
    else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return s;
}

export class KosmosScene implements Renderable {
  private layer: FlatLayer | null = null;
  private flares: FlatLayer | null = null;
  private readonly hud = new HudLayer();
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(20, 16 / 9, 10, 1e7);
  private readonly key = new THREE.DirectionalLight('#fff4e6', 1.4);
  private readonly coreLight = new THREE.PointLight('#ffe6b8', 0, 0, 0);
  private readonly meshes: { mesh: THREE.Mesh; piece: number }[] = [];
  private earthBody: THREE.Mesh | null = null;
  private moonBody: THREE.Mesh | null = null;
  private layout: CardLayout | null = null;
  private sky: CardField | null = null;
  private galaxies: GalaxyField | null = null;
  private dust: GalaxyField | null = null;
  private spikes: SpikeField | null = null;
  private local: CardField | null = null;
  private motes: CardField | null = null;
  private solid: CardField | null = null;
  private front: CardField | null = null;
  private flight: CardField | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.layer = new FlatLayer({ atlases: {}, blend: 'normal', aspect: size.width / size.height, shapes: 256, glyphs: 16 });
    this.flares = new FlatLayer({ atlases: {}, blend: 'add', aspect: size.width / size.height, shapes: 64, glyphs: 16 });
    this.owned.push(this.flares);
    this.hud.init(size);
    this.owned.push(this.layer, this.hud);

    // The faces as cards and galaxy stars.
    const atlas = buildGlyphAtlas(MINI_FACES, (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 48, radius: 8 });
    this.layout = { aspect: (f) => atlas.entries.get(f)!.aspect, quadPerEm: atlas.cellH / atlas.fontPx, faces: MINI_FACES };
    const hero = heroGalaxy();
    const far = farGalaxies();
    const behind = (name: FieldName): boolean => KOSMOS_FIELDS.find((f) => f.name === name)!.behind;
    this.sky = new CardField({ capacity: 1500, atlas, blend: 'add', depthTest: behind('sky') });
    this.galaxies = new GalaxyField(atlas, [hero.stars, ...far.map((g) => g.stars)]);
    this.dust = new GalaxyField(atlas, [hero.dust, ...far.map((g) => g.dust)], { mode: 'dark', opacity: 0.55 });
    this.spikes = new SpikeField(800);
    this.local = new CardField({ capacity: 8000, atlas, blend: 'add', depthTest: behind('local') });
    this.motes = new CardField({ capacity: 6000, atlas, blend: 'add', depthTest: behind('motes') });
    this.solid = new CardField({ capacity: 6000, atlas, blend: 'normal', hideBacks: true, depthTest: behind('solid') });
    this.front = new CardField({ capacity: 4000, atlas, blend: 'add', hideBacks: true, depthTest: behind('front') });
    this.flight = new CardField({ capacity: 600, atlas, blend: 'add', depthTest: behind('flight') });
    // The galaxy and spike fields have no depth option of their own: their materials are set here.
    for (const [name, field] of [['galaxies', this.galaxies], ['dust', this.dust], ['spikes', this.spikes]] as const) (field.mesh.material as THREE.Material).depthTest = behind(name);
    const meshes: Record<FieldName, THREE.Object3D> = {
      sky: this.sky.mesh, galaxies: this.galaxies.mesh, dust: this.dust.mesh, spikes: this.spikes.mesh, local: this.local.mesh, motes: this.motes.mesh, solid: this.solid.mesh, front: this.front.mesh, flight: this.flight.mesh,
    };
    KOSMOS_FIELDS.forEach((f, i) => {
      meshes[f.name].renderOrder = i;
      this.scene.add(meshes[f.name]);
    });
    this.owned.push(atlas.texture, this.sky, this.galaxies, this.dust, this.spikes, this.local, this.motes, this.solid, this.front, this.flight);

    // A studio lit all round for the Big Bang's pieces (the camera swings round them): a warm key, cool fills, an ice and a gold rim.
    this.scene.environment = studioEnvironment(
      gl,
      [
        { color: '#fff4e6', intensity: 6, position: [0, 5, 0], size: [6, 6] },
        { color: '#e8eeff', intensity: 2.6, position: [0, 1, 5], size: [5, 3] },
        { color: '#e8eeff', intensity: 2.6, position: [0, 1, -5], size: [5, 3] },
        { color: '#9ab8ff', intensity: 4, position: [-5, 1, 0], size: [2, 5] },
        { color: '#ffb37a', intensity: 4, position: [5, 1, 0], size: [2, 5] },
        { color: '#ffd49a', intensity: 1.6, position: [0, -5, 0], size: [6, 6] },
      ],
      0x05060c,
    );
    this.key.position.set(900, 1800, 0);
    this.camera.add(this.key);
    this.scene.add(this.camera);
    this.coreLight.position.set(...ORIGIN);
    this.scene.add(this.coreLight);
    this.owned.push(this.scene.environment);

    const materials = new Map<string, THREE.MeshPhysicalMaterial>();
    const material = (rgb: readonly number[], chrome: boolean): THREE.MeshPhysicalMaterial => {
      const k = `${rgb.join(',')}:${chrome}`;
      if (!materials.has(k)) {
        const color = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2]);
        const m = chrome
          ? new THREE.MeshPhysicalMaterial({ color: color.clone().lerp(new THREE.Color('#ffffff'), 0.4), roughness: 0.12, metalness: 1, envMapIntensity: 1.6, side: THREE.DoubleSide })
          : new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.85, side: THREE.DoubleSide });
        materials.set(k, m);
        this.owned.push(m);
      }
      return materials.get(k)!;
    };
    const font = await loadOpentype(staticFile(EXTRUDE_FONT));
    const star = new THREE.ExtrudeGeometry(starShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 3 }).center();
    const ring = new THREE.TorusGeometry(0.5, 0.09, 16, 48);
    const orb = new THREE.SphereGeometry(0.5, 32, 16);
    this.owned.push(star, ring, orb);
    PIECES.forEach((p, i) => {
      let geo: THREE.BufferGeometry;
      if (p.kind === 'face') {
        geo = extrudeText(font, p.face, { size: EM, depth: 24, bevel: 4, bevelSegments: 4, curveSegments: 10 });
        this.owned.push(geo);
      } else geo = p.kind === 'star' ? star : p.kind === 'ring' ? ring : orb;
      const mesh = new THREE.Mesh(geo, material(p.color, p.chrome));
      this.meshes.push({ mesh, piece: i });
      this.scene.add(mesh);
    });

    // The bodies: the core (white-hot, then Earth's dark body) and the Moon's.
    const sphere = new THREE.SphereGeometry(1, 48, 24);
    // The core glows from inside, its limb darker like a star's, so it reads as a ball, never a flat disc; once it cools past orange the limb goes near black (coreShade in voyage.ts).
    const { hot, cold } = CORE_LIMB;
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color('#ffffff') }, limb: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform float limb;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
          float floorL = mix(${hot.floor.toFixed(4)}, ${cold.floor.toFixed(4)}, limb);
          gl_FragColor = vec4(color * (floorL + (1.0 - floorL) * pow(mu, mix(${hot.power.toFixed(4)}, ${cold.power.toFixed(4)}, limb))), 1.0);
        }`,
    });
    const moonMat = new THREE.MeshBasicMaterial({ color: '#060606', toneMapped: false });
    this.earthBody = new THREE.Mesh(sphere, earthMat);
    this.moonBody = new THREE.Mesh(sphere, moonMat);
    this.earthBody.position.set(...ORIGIN);
    this.scene.add(this.earthBody, this.moonBody);
    this.owned.push(sphere, earthMat, moonMat);
    this.camera.aspect = size.width / size.height;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const L = this.layout!;
    // Through the stutter a repeated output frame shows its slice again: its whole shutter is shifted back, so no sub-frame mixes two slices.
    const out = Math.round(ctx.frame);
    const shift = out - stutterFrame(out);
    const f = ctx.frame - shift;
    let pose = voyageCamera(ctx.cam - shift);
    // The lens: sub-frame i of this output frame sits at Vogel point lensIndex(i).
    const aperture = burstAperture(f);
    if (aperture > 0) {
      const t = burstTemporal(out);
      const open = out - t.shutter / 2;
      const i = Math.min(t.samples - 1, Math.max(0, Math.round(((ctx.frame - open) / t.shutter) * t.samples - 0.5)));
      const [vx, vy] = vogel(lensIndex(i, t.samples), t.samples);
      pose = onLens(pose, aperture * vx, aperture * vy);
    }
    // On the stutter the galaxy snaps smaller slice by slice, down to a point.
    const k = 1 / bridgeShrink(out);
    if (k !== 1) {
      const [tx, ty, tz] = pose.target;
      pose = { ...pose, position: [tx + (pose.position[0] - tx) * k, ty + (pose.position[1] - ty) * k, tz + (pose.position[2] - tz) * k], near: pose.near * k, far: pose.far * k };
    }
    const bg = f < BURST + 0.5 ? burstPaper(f) : voyageBackground(out);
    this.layer!.draw(gl, target, pose, f < BURST + 14 ? burstFlat(f) : { under: [], glyphs: {}, over: [] }, { color: bg, grain: f < BURST + 0.5 ? PAPER_GRAIN : 0 });

    this.camera.position.set(...pose.position);
    this.camera.up.set(...pose.up);
    this.camera.lookAt(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.near = pose.near;
    this.camera.far = pose.far;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const cam: CardCamera = { eye: pose.position, right: [right.x, right.y, right.z], up: [up.x, up.y, up.z] };
    const viewport = ctx.height / 1080;
    const pxScale = ctx.height / (2 * Math.tan((pose.fov * Math.PI) / 360));
    const dist = Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]);

    // Far stars and the galaxies.
    this.sky!.write(f < BURST + 0.5 ? [] : skyCards(L, f, cam, pxScale, Math.min(pose.far * 0.5, dist * 8 + 2e5), viewport));
    const placements = galaxyPlacements(f);
    const style = galaxyStyle(f, out, viewport);
    for (const g of [this.galaxies!, this.dust!]) {
      g.setViewport(ctx.height, pose.fov);
      g.place(placements, cam.right, cam.up);
      g.style(style);
    }
    this.dust!.mesh.visible = dustOn(out);
    const sp = galaxySpikes(f, out, placements[0], style.flat);
    this.spikes!.write(sp.spikes, cam.right, cam.up, sp.capsule);
    this.local!.write(localCards(L, f, cam, pxScale, viewport));

    // The Big Bang: its pieces, its core and light, its little faces.
    for (const { mesh, piece } of this.meshes) {
      const p = PIECES[piece];
      const s = piecePose(p, f);
      // A piece about to cross the lens shrinks away instead of flashing across the frame.
      const size = p.kind === 'face' ? p.size * 3 : p.size;
      const near = smoothstep(2 * size, 4 * size, Math.hypot(s.pos[0] - pose.position[0], s.pos[1] - pose.position[1], s.pos[2] - pose.position[2]));
      mesh.visible = s.scale * near > 1e-4;
      if (!mesh.visible) continue;
      mesh.position.set(...s.pos);
      mesh.lookAt(s.pos[0] + s.facing[0], s.pos[1] + s.facing[1], s.pos[2] + s.facing[2]);
      mesh.rotateZ(s.roll);
      if (p.kind === 'ring') mesh.rotateX(0.9 + s.roll);
      mesh.scale.setScalar(s.scale * near * (p.kind === 'face' ? p.size / EM : p.size));
    }
    const core = coreAt(f);
    this.coreLight.intensity = f > BURST && f < GATHER.to ? 6 * core.heat * core.light : 0;
    const motes = moteCards(L, f, cam);
    this.motes!.write(motes.light);

    // Earth, the Moon and the meteors.
    const b = bodies(f, core);
    this.earthBody!.visible = b.earth.r > 0;
    this.earthBody!.scale.setScalar(Math.max(1e-3, b.earth.r));
    const earthMat = this.earthBody!.material as THREE.ShaderMaterial;
    earthMat.uniforms.color.value.setRGB(b.earth.color[0], b.earth.color[1], b.earth.color[2]);
    earthMat.uniforms.limb.value = b.earth.limb;
    this.moonBody!.visible = b.moon.on;
    this.moonBody!.position.set(...b.moon.centre);
    this.moonBody!.scale.setScalar(b.moon.r);
    const earth = earthScene(L, f, cam);
    this.solid!.write(f < GATHER.to ? motes.solid : earth.solid);
    this.front!.write(earth.front);
    this.flight!.write(earth.flight);

    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clearDepth();
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
    this.flares!.draw(gl, target, SCREEN, { under: [...bellFlares(f), ...hatFlares(f)], glyphs: {}, over: [] }, null);
  }

  /** The party monitor, once per output frame over the finished picture: fixed to the screen, so the punches and shakes don't streak it. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.hud.draw(gl, target, frame);
  }

  look(frame: number): Look {
    // Cosmos bar 1 a little darker, so the enamel keeps its colour through AgX.
    const space = spaceLook();
    const look = { ...space, exposure: space.exposure * (0.75 + 0.25 * smoothstep(GATHER.from, GATHER.to, frame)) };
    return mixLook(risoLook(), look, smoothstep(BURST, BURST + 4, frame));
  }

  temporal(frame: number): Temporal {
    return frame < GATHER.to ? burstTemporal(frame) : { samples: 24, shutter: 0.5, persistence: 0 };
  }

  /** One continuous camera; the stutter's repeats stay inside it. */
  segment(frame: number): Segment {
    return frame >= STUTTER.from && frame < STUTTER.to ? { from: STUTTER.from, to: STUTTER.to } : { from: VOYAGE.from, to: STUTTER.from };
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
