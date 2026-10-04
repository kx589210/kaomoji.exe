// The comic club "INK" on the GPU (the part 'club', club 1.1 → break 1.1): the dispatcher's GPU half (src/shots/clubInk.ts). It builds the
// club's kit once — its atlases (src/content/club.ts INK_ATLASES), its flat layers (`ink` paints over, `print` overprints), its polygon layers
// (the stars, wedges, slanted panels, arcs and the glass's bowl, with an optional dot or line screen) and the page (the whole club baked once
// into one mipmapped texture, drawn as a plane that recedes and tilts under the flight) — routes every sub-frame instant to the part that
// draws it (inkPartAt) and executes that part's draw list (src/shots/clubInkKit.ts InkDraw, extended by src/shots/clubInkB.ts InkDrawB:
// polygons, scissor clips, the page); from the hit on club 6.4 it draws the v04 glass exactly as src/scenes/club.ts did (the same atlas,
// layers and code path, re-keyed by glassInstant); the party monitor is its screen overlay (src/shots/clubInkReadout.ts). Build sheet
// notes/b58/club-sheet.md §9–§10. The film draws the club with it (src/scenes/index.ts); KX-ClubInk previews it alone. The v04 club
// (src/scenes/club.ts) stays in the tree: its glass is this scene's last beat.
import * as THREE from 'three';
import { INK_ATLASES, type InkAtlasId } from '../content/club.ts';
import { MONITOR_GLYPHS } from '../content/drop1.ts';
import { type Pose, fillDistance, frontal } from '../engine/camera.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { SCREEN_FIXED, type ScreenAnchor } from '../engine/post/dotScreen.ts';
import { blendMode } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { PARTS, glassInstant, inkLookAt, inkPartAt, inkSegment, inkTemporal } from '../shots/clubInk.ts';
import { type InkLayout, PAPER, SCREEN, bumpDraws } from '../shots/clubInkKit.ts';
import { type Clip, type InkDrawB, PAGE, PANELS, type Poly, diptychFrame, pageFurniture } from '../shots/clubInkB.ts';
import { inkHudContent } from '../shots/clubInkReadout.ts';
import { glassFrame } from '../shots/glass.ts';
import { CLUB_TEXTS, VOID } from '../shots/lines.ts';
import { advanceOf } from './swiss.ts';

const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
/** Atlas SDF reach, as K's scene (keylines up to 0.234 em). */
const RADIUS = 30;
/** The atlases drawn into the picture, in the order a FlatLayer draws them (the readout's is the screen overlay's); every character in them is checked by check-glyphs through src/content/club.ts CLUB_INK_TEXTS. */
export const INK_PICTURE_ATLASES: readonly Exclude<InkAtlasId, 'readout'>[] = ['face', 'sfx', 'ui', 'display', 'mono'];

// ——— Polygons ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const POLY_VERT = /* glsl */ `
  attribute vec4 aColor;
  attribute vec4 aTone;   // tint, screen pitch, angle, lines (1) or dots (0)
  varying vec4 vColor;
  varying vec4 vTone;
  varying vec2 vPlane;
  void main() {
    vColor = aColor;
    vTone = aTone;
    vPlane = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const POLY_FRAG = /* glsl */ `
  uniform vec4 uViewport; // the target's viewport (device px): screen-fixed screens are measured in its 1080p px
  uniform vec4 uAnchor;   // the screen the fixed screens are printed on: dotScreen.ts ScreenAnchor (x, y, zoom, roll)
  varying vec4 vColor;
  varying vec4 vTone;
  varying vec2 vPlane;
  void main() {
    float a = vColor.a;
    if (vTone.y > 0.0 && vTone.x < 0.999) {
      // aTone.w: 1 = lines (else dots), + 2 = fixed to the output frame's screen (uAnchor) instead of the plane: crisp under motion blur.
      float code = floor(vTone.w + 0.5);
      vec2 plane = vPlane;
      if (code > 1.5) {
        vec2 sp = (gl_FragCoord.xy - uViewport.xy - 0.5 * uViewport.zw) * (1080.0 / uViewport.w) - uAnchor.xy;
        float ca = cos(uAnchor.w);
        float sa = sin(uAnchor.w);
        plane = vec2(ca * sp.x + sa * sp.y, -sa * sp.x + ca * sp.y) / uAnchor.z;
      }
      float c = cos(vTone.z);
      float s = sin(vTone.z);
      vec2 g = mat2(c, -s, s, c) * plane / vTone.y;
      // Round dots (ShapeField's cosine screen) or lines across g.y (a triangle wave: the line is exactly the tint's share of the pitch wide).
      float screen = mod(code, 2.0) > 0.5 ? 1.0 - 2.0 * abs(fract(g.y) - 0.5) : 0.5 + 0.25 * (cos(6.2831853 * g.x) + cos(6.2831853 * g.y));
      float e = screen - (1.0 - vTone.x);
      float w = max(fwidth(e), 1e-4) * 0.7;
      a *= smoothstep(-w, w, e);
    }
    if (a < 0.002) discard;
    #ifdef STRAIGHT
      gl_FragColor = vec4(vColor.rgb, a);
    #else
      gl_FragColor = vec4(vColor.rgb * a, a);
    #endif
  }`;

/** Filled polygons (triangles) on a flat plane, through a Pose like FlatLayer's; 'normal' paints, 'multiply' overprints. */
export class PolyLayer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly geo = new THREE.BufferGeometry();
  private readonly pos: THREE.BufferAttribute;
  private readonly color: THREE.BufferAttribute;
  private readonly tone: THREE.BufferAttribute;
  private readonly material: THREE.ShaderMaterial;
  private readonly capacity: number;

  constructor(o: { blend: 'normal' | 'multiply'; aspect: number; vertices: number }) {
    this.capacity = o.vertices;
    this.camera = new THREE.PerspectiveCamera(20, o.aspect, 1, 60000);
    const attr = (n: number) => new THREE.BufferAttribute(new Float32Array(o.vertices * n), n).setUsage(THREE.DynamicDrawUsage);
    this.pos = attr(3);
    this.color = attr(4);
    this.tone = attr(4);
    this.geo.setAttribute('position', this.pos);
    this.geo.setAttribute('aColor', this.color);
    this.geo.setAttribute('aTone', this.tone);
    this.material = new THREE.ShaderMaterial({
      uniforms: { uViewport: { value: new THREE.Vector4(0, 0, 1920, 1080) }, uAnchor: { value: new THREE.Vector4(0, 0, 1, 0) } },
      vertexShader: POLY_VERT,
      fragmentShader: POLY_FRAG,
      defines: o.blend === 'normal' ? { STRAIGHT: '' } : {},
      ...blendMode(o.blend),
      depthTest: false,
      depthWrite: false,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.geo, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, pose: Pose, polys: readonly Poly[], anchor: ScreenAnchor = SCREEN_FIXED): void {
    const p = this.pos.array as Float32Array;
    const c = this.color.array as Float32Array;
    const t = this.tone.array as Float32Array;
    let n = 0;
    for (const q of polys) {
      const verts = q.tri.length / 2;
      if (n + verts > this.capacity) throw new Error(`poly layer is full (${this.capacity})`);
      for (let i = 0; i < verts; i++, n++) {
        p.set([q.tri[2 * i], q.tri[2 * i + 1], 0], 3 * n);
        c.set([q.color[0], q.color[1], q.color[2], q.alpha ?? 1], 4 * n);
        t.set([q.tint ?? 1, q.screen ?? 0, q.angle ?? 0, (q.lines ? 1 : 0) + (q.fixed ? 2 : 0)], 4 * n);
      }
    }
    if (n === 0) return;
    for (const [a, k] of [[this.pos, 3], [this.color, 4], [this.tone, 4]] as const) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, n * k);
      a.needsUpdate = true;
    }
    this.geo.setDrawRange(0, n);
    (this.material.uniforms.uViewport.value as THREE.Vector4).copy(target.viewport);
    (this.material.uniforms.uAnchor.value as THREE.Vector4).set(anchor.x, anchor.y, anchor.zoom, anchor.roll);
    aim(this.camera, pose);
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

/** A camera to a Pose, as FlatLayer does. */
function aim(camera: THREE.PerspectiveCamera, pose: Pose): void {
  camera.position.set(...pose.position);
  camera.up.set(...pose.up);
  camera.lookAt(...pose.target);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
}

// ——— The page ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** The baked page as a plane (page units, centred, y up), sampled through its mipmaps (the bake's moiré guard). */
class PageLayer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly material: THREE.ShaderMaterial;
  private readonly geo: THREE.PlaneGeometry;

  constructor(texture: THREE.Texture, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(20, aspect, 1, 60000);
    this.geo = new THREE.PlaneGeometry(PAGE.w, PAGE.h);
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this.geo, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, pose: Pose): void {
    aim(this.camera, pose);
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

// ——— The scene ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

export class ClubInkScene implements Renderable {
  private ink: FlatLayer | null = null;
  private print: FlatLayer | null = null;
  private polyInk: PolyLayer | null = null;
  private polyPrint: PolyLayer | null = null;
  private readout: FlatLayer | null = null;
  private readoutAdvance: Advance | null = null;
  private layout: InkLayout | null = null;
  private pageTarget: THREE.WebGLRenderTarget | null = null;
  private pageLayer: PageLayer | null = null;
  /** The page is baked once, on the first frame that draws it (deterministic: its panels are pure frames). */
  private baked = false;
  private glassDark: FlatLayer | null = null;
  private glassLight: FlatLayer | null = null;
  private glassFore: FlatLayer | null = null;
  private neonAdvance: Advance | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const aspect = size.width / size.height;
    const atlas = (id: InkAtlasId): GlyphAtlas => {
      const a = INK_ATLASES[id];
      return buildGlyphAtlas(a.chars, (px) => `${a.weight} ${px}px ${cssStack(a.role)}`, { fontPx: 96, radius: RADIUS });
    };
    const atlases = Object.fromEntries(INK_PICTURE_ATLASES.map((id) => [id, atlas(id)])) as Record<Exclude<InkAtlasId, 'readout'>, GlyphAtlas>;
    this.ink = new FlatLayer({ atlases, blend: 'normal', aspect, shapes: 8192, glyphs: 8192 });
    this.print = new FlatLayer({ atlases, blend: 'multiply', aspect, shapes: 2048, glyphs: 2048 });
    this.polyInk = new PolyLayer({ blend: 'normal', aspect, vertices: 196608 });
    this.polyPrint = new PolyLayer({ blend: 'multiply', aspect, vertices: 32768 });
    const advance = Object.fromEntries(Object.entries(atlases).map(([id, a]) => [id, advanceOf(a)])) as Record<Exclude<InkAtlasId, 'readout'>, Advance>;
    // The party monitor, cut exactly as K's scene cuts it (the v04 monitor's glyphs first, in its order).
    const readoutChars = [...MONITOR_GLYPHS, ...INK_ATLASES.readout.chars.filter((c) => !MONITOR_GLYPHS.includes(c))];
    const mono = buildGlyphAtlas(readoutChars, (px) => `${INK_ATLASES.readout.weight} ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14 });
    this.readout = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect, shapes: 64, glyphs: 512 });
    this.readoutAdvance = advanceOf(mono);
    this.layout = { advance: { ...advance, readout: this.readoutAdvance } };
    // The page: one sRGB texture (perceptual 8-bit, linear when sampled), its mipmaps rebuilt by three after each draw into it.
    this.pageTarget = new THREE.WebGLRenderTarget(PAGE.w, PAGE.h, {
      colorSpace: THREE.SRGBColorSpace, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, anisotropy: 16,
    });
    this.pageLayer = new PageLayer(this.pageTarget.texture, aspect);
    // The v04 glass, exactly as K's scene and src/scenes/club.ts draw it.
    const neon = buildGlyphAtlas(chars(CLUB_TEXTS), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 96, radius: 30, size: 6144 });
    this.glassDark = new FlatLayer({ atlases: { neon }, blend: 'normal', aspect, shapes: 8192, glyphs: 16384 });
    this.glassLight = new FlatLayer({ atlases: { neon }, blend: 'add', aspect, shapes: 8192, glyphs: 16384 });
    this.glassFore = new FlatLayer({ atlases: {}, blend: 'add', aspect, shapes: 1024, glyphs: 16 });
    this.neonAdvance = advanceOf(neon);
    this.owned.push(...Object.values(atlases).map((a) => a.texture), this.ink, this.print, this.polyInk, this.polyPrint, mono.texture, this.readout);
    this.owned.push(this.pageTarget, this.pageLayer, neon.texture, this.glassDark, this.glassLight, this.glassFore);
  }

  /** The scissor of `clip` (1080p px, centre origin, y up) inside the target's current viewport. */
  private scissor(target: THREE.WebGLRenderTarget, clip: Clip | undefined): void {
    if (!clip) {
      target.scissorTest = false;
      return;
    }
    const v = target.viewport;
    const sx = v.z / 1920;
    const sy = v.w / 1080;
    const x0 = Math.floor(v.x + (clip.x0 + 960) * sx);
    const y0 = Math.floor(v.y + (clip.y0 + 540) * sy);
    const x1 = Math.ceil(v.x + (clip.x1 + 960) * sx);
    const y1 = Math.ceil(v.y + (clip.y1 + 540) * sy);
    target.scissor.set(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    target.scissorTest = true;
  }

  /** A part's draw list, in order. */
  private execute(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, draws: readonly InkDrawB[]): void {
    for (const d of draws) {
      this.scissor(target, d.clip);
      if (d.page) {
        this.bake(gl);
        this.pageLayer!.draw(gl, target, d.pose);
      } else {
        const c = d.content;
        const empty = c.under.length === 0 && c.over.length === 0 && Object.values(c.glyphs).every((g) => g.length === 0);
        if (!empty || d.paper) (d.layer === 'print' ? this.print! : this.ink!).draw(gl, target, d.pose, c, d.paper ?? null);
        if (d.polys?.length) (d.layer === 'print' ? this.polyPrint! : this.polyInk!).draw(gl, target, d.pose, d.polys, d.anchor);
      }
      if (d.clip) {
        target.scissorTest = false;
        gl.setRenderTarget(target);
      }
    }
  }

  /** The page: PAPER, the nine panels at their frozen instants, the borders, gutters and indicia. Once; any frame may be the first. */
  private bake(gl: THREE.WebGLRenderer): void {
    if (this.baked) return;
    const rt = this.pageTarget!;
    const L = this.layout!;
    // A 16:9 window the height of the page, so the page's own draws (paper, furniture) see page units at 1 px each.
    const wide = (PAGE.h * 16) / 9;
    const pagePose: Pose = frontal(fillDistance(PAGE.h, SCREEN.fov), wide / 2 - PAGE.w / 2, 0, SCREEN.fov);
    rt.viewport.set(0, 0, wide, PAGE.h);
    this.ink!.draw(gl, rt, pagePose, { under: [], glyphs: {}, over: [] }, { color: PAPER, grain: 0 });
    for (const p of PANELS) {
      // Panel k's window (y up from the bottom of the texture).
      rt.viewport.set(p.x - 960 + PAGE.w / 2, p.y - 540 + PAGE.h / 2, 1920, 1080);
      this.execute(gl, rt, p.part === 'diptych' ? diptychFrame(p.at, L) : PARTS[p.part].frame(p.at, L));
    }
    rt.viewport.set(0, 0, wide, PAGE.h);
    this.execute(gl, rt, pageFurniture(L, pagePose));
    rt.viewport.set(0, 0, PAGE.w, PAGE.h);
    rt.scissorTest = false;
    this.baked = true;
  }

  /** The v04 cracked glass at its instant `g` (K's scene, src/scenes/club.ts drawGlass). */
  private drawGlass(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, g: number): void {
    const c = glassFrame(g, this.neonAdvance!);
    this.glassDark!.draw(gl, target, SCREEN, { under: [], glyphs: {}, over: [] }, { color: VOID, grain: 0 });
    this.glassLight!.draw(gl, target, SCREEN, c.light, null);
    this.glassFore!.draw(gl, target, SCREEN, { under: c.cracks, glyphs: {}, over: [] }, null);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const id = inkPartAt(ctx.frame);
    if (id === 'glass') this.drawGlass(gl, target, glassInstant(ctx.frame));
    // The print bump (continuity plan v07 §4): on every kick the whole page drops and punches (src/shots/clubInkKit.ts bumpDraws).
    else this.execute(gl, target, bumpDraws(PARTS[id].frame(ctx.frame, this.layout!), ctx.frame));
  }

  /** The party monitor, once per output frame over the finished picture (never printed, never shaken). */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.readout!.draw(gl, target, SCREEN, inkHudContent(frame, this.readoutAdvance!), null);
  }

  look(frame: number): Look {
    return inkLookAt(frame);
  }

  temporal(frame: number): Temporal {
    return inkTemporal(frame);
  }

  segment(frame: number): Segment {
    return inkSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
