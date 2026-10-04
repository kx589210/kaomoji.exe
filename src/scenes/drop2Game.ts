// Drop 2's third part, drop2 5.1–8.1 − 1: S30 FULL COMBO (the crane bar 5 and the built bar 6) and S31 OVERFLOW (builder G · GAME; build
// sheet notes/bid2/drop2-sheet2.md §3 bars 5–7, §1.3 C/E/F). The shots are pure (src/shots/drop2Game.ts, src/shots/drop2Overflow.ts);
// this class draws what they return, back to front: the page over the monitor's dark world; the highway's plane and spectrogram ridges
// (its own mesh: paper-filled polylines with antialiased strokes, far to near, so nearer ridges hide farther ones; Defender v2.0's barrier
// filled red; the poster's far future fading as the crane lands); the full-screen monitor; the lanes, notes and labels; COMBO, SCORE,
// FULL COMBO, the red disc and Defender's ticker; the hero and PERFECT; the snap's flying pieces. The song's spectrum is
// loaded in init from public/audio/bgm-spectrum.bin (scripts/audio/spectrumDrop2.mjs, run after every music lock); if the file is
// missing the ridges lie flat and a warning is logged. It starts on the hard match cut drop2 5.1 (a segment boundary): its first frame is
// H2's (§9). Tests: tests/drop2Game.test.ts, tests/drop2Overflow.test.ts, tests/drop2GameSpectrum.test.ts.
import { staticFile } from 'remotion';
import * as THREE from 'three';
import type { Pose } from '../engine/camera.ts';
import { type RGB, linear, mixRGB } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import type { FontRole } from '../engine/fonts.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { aimPose } from '../motion/hit.ts';
import { PALETTES } from '../shots/drop2Shared.ts';
import { GAME_GROUND, GAME_STRINGS, type GameLayout, type RidgeSet, type Spectrum, emptySpectrum, gameAim, gameFrame, gameLook, gameSegment, gameTemporal, parseSpectrum, ridgePoints } from '../shots/drop2Game.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import { advanceOf } from './swiss.ts';

const RIDGE_VERT = /* glsl */ `
  attribute vec2 aEdge;
  attribute vec3 aColor;
  varying vec2 vEdge;
  varying vec3 vColor;
  void main() {
    vEdge = aEdge;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
// A stroke quad carries its signed distance across the line (vEdge.x) and the line's half width (vEdge.y): coverage is the distance to
// the edge over one device pixel. Fills carry a huge half width, so they are solid.
const RIDGE_FRAG = /* glsl */ `
  varying vec2 vEdge;
  varying vec3 vColor;
  void main() {
    float aa = max(fwidth(vEdge.x), 1e-4);
    float a = clamp((vEdge.y - abs(vEdge.x)) / aa + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(vColor, a);
  }`;

/** The highway's floor as one mesh, rebuilt every sub-frame: the paper plane, then each ridge (a paper fill down to the plane, then its stroke), far to near. */
class RidgeMesh {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly geo = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly pos: THREE.BufferAttribute;
  private readonly edge: THREE.BufferAttribute;
  private readonly color: THREE.BufferAttribute;
  private n = 0;
  private warned = false;

  private readonly capacity: number;

  constructor(aspect: number, capacity = 600_000) {
    this.capacity = capacity;
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, 1, 60000);
    this.pos = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.edge = new THREE.BufferAttribute(new Float32Array(capacity * 2), 2).setUsage(THREE.DynamicDrawUsage);
    this.color = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.pos);
    this.geo.setAttribute('aEdge', this.edge);
    this.geo.setAttribute('aColor', this.color);
    this.material = new THREE.ShaderMaterial({ vertexShader: RIDGE_VERT, fragmentShader: RIDGE_FRAG, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(this.geo, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  private vert(x: number, y: number, d: number, half: number, c: RGB): void {
    if (this.n >= this.capacity) return;
    const i = this.n++;
    const p = this.pos.array as Float32Array;
    const e = this.edge.array as Float32Array;
    const k = this.color.array as Float32Array;
    p[3 * i] = x - 960;
    p[3 * i + 1] = 540 - y;
    p[3 * i + 2] = 0;
    e[2 * i] = d;
    e[2 * i + 1] = half;
    k[3 * i] = c[0];
    k[3 * i + 1] = c[1];
    k[3 * i + 2] = c[2];
  }

  /** A solid quad (layout px) a, b, c, d. */
  private quad(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number, c: RGB): void {
    const H = 1e6;
    this.vert(ax, ay, 0, H, c);
    this.vert(bx, by, 0, H, c);
    this.vert(cx, cy, 0, H, c);
    this.vert(ax, ay, 0, H, c);
    this.vert(cx, cy, 0, H, c);
    this.vert(dx, dy, 0, H, c);
  }

  /** A line from (x0, y0) to (x1, y1), `w` wide, with a 1 px antialiasing fringe and square caps half its width long (so joints close). */
  private line(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
    const tx = (x1 - x0) / len;
    const ty = (y1 - y0) / len;
    const half = w / 2;
    const out = half + 1;
    const nx = -ty * out;
    const ny = tx * out;
    const ax = x0 - tx * half;
    const ay = y0 - ty * half;
    const bx = x1 + tx * half;
    const by = y1 + ty * half;
    this.vert(ax + nx, ay + ny, out, half, c);
    this.vert(bx + nx, by + ny, out, half, c);
    this.vert(bx - nx, by - ny, -out, half, c);
    this.vert(ax + nx, ay + ny, out, half, c);
    this.vert(bx - nx, by - ny, -out, half, c);
    this.vert(ax - nx, ay - ny, -out, half, c);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, pose: Pose, set: RidgeSet, ink: { paper: RGB; ink: RGB; red: RGB; played: RGB }): void {
    if (!set.plane && set.lines.length === 0) return;
    this.n = 0;
    if (set.plane) {
      const [a, b, c, d] = set.plane;
      this.quad(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1], ink.paper);
    }
    if (set.end) this.line(-1200, set.end.y, 3120, set.end.y, set.end.width, ink.ink);
    for (const r of set.lines) {
      const { xy, base } = ridgePoints(r);
      const n = xy.length / 2;
      // Paper fills hide the ridges behind (none needed where a ridge lies flat); Defender v2.0's barrier is a red wall.
      const fill = r.barrier ? (r.fade < 1 ? mixRGB(ink.paper, ink.red, r.fade) : ink.red) : ink.paper;
      if (r.k > 0) for (let i = 0; i + 1 < n; i++) this.quad(xy[2 * i], xy[2 * i + 1], xy[2 * i + 2], xy[2 * i + 3], xy[2 * i + 2], base, xy[2 * i], base, fill);
      const c0 = r.red || r.glint || r.barrier ? ink.red : r.past ? ink.played : ink.ink;
      // The poster's far future fades into the paper as the crane lands.
      const c = r.fade < 1 ? mixRGB(ink.paper, c0, r.fade) : c0;
      for (let i = 0; i + 1 < n; i++) this.line(xy[2 * i], xy[2 * i + 1], xy[2 * i + 2], xy[2 * i + 3], r.width, r.tone ? mixRGB(ink.paper, c, r.tone[i] ?? 1) : c);
    }
    // The crash's red edge across the highway, over the ridges (a marker, like the callout it belongs to: the louder ridges before it
    // would otherwise hide it).
    if (set.cliff) this.line(set.cliff.x0, set.cliff.y, set.cliff.x1, set.cliff.y, set.cliff.width, ink.red);
    if (this.n >= this.capacity && !this.warned) {
      this.warned = true;
      console.warn(`Drop2Game: the ridge mesh is full (${this.capacity} vertices)`);
    }
    for (const a of [this.pos, this.edge, this.color]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * a.itemSize);
      a.needsUpdate = true;
    }
    this.geo.setDrawRange(0, this.n);
    this.camera.position.set(...pose.position);
    this.camera.up.set(...pose.up);
    this.camera.lookAt(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.updateProjectionMatrix();
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
    gl.autoClear = auto;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

const PAPER = linear(PALETTES.swiss.ground);
const INK = linear(PALETTES.swiss.ink);
/** The ridges' inks: paper fills, #111 strokes, the "now" ridge red, the played ones grey (#111 at 28 % on the paper). */
const INKS = { paper: PAPER, ink: INK, red: linear(PALETTES.swiss.red), played: mixRGB(PAPER, INK, 0.28) } as const;

export class Drop2Game implements Renderable {
  private layout: GameLayout | null = null;
  private spectrum: Spectrum = emptySpectrum();
  private layers: Record<'back' | 'monitor' | 'inner' | 'track' | 'type' | 'glass' | 'hero' | 'light' | 'fore', FlatLayer> | null = null;
  private ridges: RidgeMesh | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const atlas = (strings: readonly string[], role: FontRole, weight: number, o: { fontPx: number; radius: number; size: number }): GlyphAtlas => {
      const a = buildGlyphAtlas(strings, (px) => `${weight} ${px}px ${cssStack(role)}`, o);
      this.owned.push(a.texture);
      return a;
    };
    const jp = atlas(GAME_STRINGS.jp, 'jp', 900, { fontPx: 160, radius: 20, size: 2048 });
    const faces = atlas(GAME_STRINGS.faces, 'jp', 900, { fontPx: 72, radius: 9, size: 2048 });
    const heavy = atlas(GAME_STRINGS.heavy, 'display', 900, { fontPx: 160, radius: 20, size: 2048 });
    const bold = atlas(GAME_STRINGS.bold, 'display', 700, { fontPx: 96, radius: 12, size: 1024 });
    const medium = atlas(GAME_STRINGS.medium, 'display', 500, { fontPx: 96, radius: 12, size: 1024 });
    const ui = atlas(GAME_STRINGS.ui, 'ui', 700, { fontPx: 96, radius: 12, size: 1024 });
    const mono = atlas(GAME_STRINGS.mono, 'mono', 600, { fontPx: 96, radius: 14, size: 2048 });
    const rounded = atlas(GAME_STRINGS.rounded, 'rounded', 800, { fontPx: 128, radius: 32, size: 2048 });
    const aspect = size.width / size.height;
    const layer = (atlases: Record<string, GlyphAtlas>, shapes = 1024, glyphs = 2048, blend: 'normal' | 'add' = 'normal'): FlatLayer => {
      const l = new FlatLayer({ atlases, blend, aspect, shapes, glyphs });
      this.owned.push(l);
      return l;
    };
    this.layers = {
      back: layer({}, 64, 16),
      monitor: layer({ mono }, 64, 2048),
      inner: layer({ faces }, 512, 512),
      track: layer({ bold, ui, faces }, 4096, 1024),
      type: layer({ heavy, bold, medium, mono }, 64, 256),
      glass: layer({ rounded }, 128, 64),
      hero: layer({ jp, rounded, ui }, 64, 256),
      // The neon light (add): the pan's tubes under him and his own lit tube over him, drawn twice per sub-frame.
      light: layer({ rounded }, 512, 64, 'add'),
      fore: layer({ mono }, 16, 64),
    };
    this.ridges = new RidgeMesh(aspect);
    this.owned.push(this.ridges);
    this.layout = { jp: advanceOf(jp), faces: advanceOf(faces), heavy: advanceOf(heavy), bold: advanceOf(bold), medium: advanceOf(medium), ui: advanceOf(ui), mono: advanceOf(mono), rounded: advanceOf(rounded) };
    try {
      const res = await fetch(staticFile('audio/bgm-spectrum.bin'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.spectrum = parseSpectrum(new Uint8Array(await res.arrayBuffer()));
    } catch (e) {
      console.warn(`Drop2Game: no song spectrum (public/audio/bgm-spectrum.bin: ${String(e)}); run scripts/audio/spectrumDrop2.mjs. The highway's ridges lie flat.`);
    }
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const L = this.layers!;
    const c = gameFrame(ctx.frame, this.layout!, this.spectrum);
    // Content at the sub-frame's instant; the camera at ctx.cam (the shutter-open instant on the phosphor's tail, so it never ghosts).
    const pose = aimPose(gameAim(ctx.cam), FRONT, FOV);
    L.back.draw(gl, target, pose, c.back, { color: GAME_GROUND, grain: 0 });
    this.ridges!.draw(gl, target, pose, c.ridges, INKS);
    L.monitor.draw(gl, target, pose, c.monitor, null);
    L.inner.draw(gl, target, pose, c.inner, null);
    L.track.draw(gl, target, pose, c.track, null);
    L.type.draw(gl, target, pose, c.type, null);
    L.glass.draw(gl, target, pose, c.glass, null);
    L.light.draw(gl, target, pose, c.glow, null);
    L.hero.draw(gl, target, pose, c.hero, null);
    L.light.draw(gl, target, pose, c.light, null);
    L.fore.draw(gl, target, pose, c.fore, null);
  }

  look(frame: number): Look {
    return gameLook(frame);
  }

  temporal(frame: number): Temporal {
    return gameTemporal(frame);
  }

  segment(frame: number): Segment {
    return gameSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
