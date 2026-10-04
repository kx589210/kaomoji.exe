// Break bar 1 on the GPU (src/score/break.ts FALL): the glass falls into the paint. Build sheet
// notes/break/break-sheet.md §3 break bar 1, §4.3–§4.5, §7.1. The motion is pure (src/shots/breakFall.ts); this file only draws it.
//
// Each sub-frame, two passes:
//   1. the backplate (a HalfFloat target with a stencil): the void; the panes still standing, each its piece of the cracked last frame of
//      drop 1 (rendered once per 1-px jolt of his face into `frozen`, exactly as the club drew it, so the break's first frame looks like it), their cracks
//      flaring round each fresh hole; the cream paint pool (one SDF shader: the rising base band smooth-min'd with every landing's
//      splat, a rim of the piece's paint running ahead) — it marks the stencil, so shadows fall only on paint; the falling pieces' hard
//      shadows (their screen silhouettes, offset, 35 %); the landed pieces as flat polygons: shadow, paint, and their cyan crack edges
//      turning into a 6 px ink outline, trimmed on clockwise;
//   2. the glass, into the target: the backplate as the backdrop (three's transmission pass refracts it), and every falling piece as
//      real extruded, bevelled glass — MeshPhysicalMaterial, dispersion and iridescence, lit by a code-built studio (a white softbox
//      top left, a cyan strip right, amber from below) — carrying its smoked piece of the frozen frame on its front (and, seen from
//      behind, on its back); the face's pieces fade their smoked body away to the amber ink and cross into flat ink (amber, an 8 px
//      ink outline) as they arrive on break 2.1, where the flat world takes them over.
// renderOver draws E2's shard on our side of the screen (break 1.4 → edge-on on 2.2a) and the knocks' ripples, at the inverse of the rig;
// screenOverlay the party monitor falling away (break 1.1 and 20 frames on) and the REPAIR MODE chips (1.2 to 2.1 + 5).
import * as THREE from 'three';
import { MONITOR_GLYPHS } from '../content/drop1.ts';
import { type Pose, frontal } from '../engine/camera.ts';
import { type RGB, linear } from '../engine/color.ts';
import { studioEnvironment } from '../engine/env.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { FullscreenQuad, FULLSCREEN_VERT } from '../engine/fullscreen.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Shape } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Quality } from '../engine/types.ts';
import { BREAK_START, CHIPS_UP, FACE_FALL, PIECE_FALLS, SHARD_FLIGHT } from '../score/break.ts';
import { rigAt } from '../score/energy.ts';
import * as F from '../shots/breakFall.ts';
import { DECAL_Z, SHARDS, SHARD_DEPTH, glassFrame } from '../shots/glass.ts';
import { HERO, VOID } from '../shots/lines.ts';
import { FOV, FRONT } from '../shots/swiss.ts';
import type { BreakPart } from './break.ts';
import { advanceOf } from './swiss.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
const v3 = (c: RGB): THREE.Vector3 => new THREE.Vector3(c[0], c[1], c[2]);
const INK = linear('#111111');
const CREAM = linear('#FDF3D8');
const CRACK = linear('#C9F2FF');
const AMBER = linear('#FFB23E');
const PAINT: Readonly<Record<F.Paint, RGB>> = Object.fromEntries(Object.entries(F.PAINT_HEX).map(([k, h]) => [k, linear(h)])) as Record<F.Paint, RGB>;
/** The last frame whose 1-px jolt of his face the frozen glass shows: from break 1.4 his face is in pieces, and the shard keeps it. */
const LAST_JOLT = FACE_FALL.from - 1;
/** How much of its smoke a falling pane keeps where paint is behind it: glass over paint, not a black hole punched in it (review R1-05). */
const GLASS_OVER_PAINT = 0.35;
/** E2's drop shadow while knock 1 lifts it toward us (ink, this alpha: it is glass). */
const SHARD_DROP_ALPHA = 0.45;
/** Pieces of the frozen frame with no glass in them yet: the pane, sampled one to one (layout UVs: a point's own place on the frame). */
const screenUV = (x: number, y: number): [number, number] => [(x + 960) / 1920, (y + 540) / 1080];

// ——— Shaders ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * A standing pane: its piece of the frozen frame, opaque. Each crack edge is lit by its own gain (edgeGains: ×1.6 as the cell across
 * lets go, then 40 % round a hole); a crack pixel takes the gain of the nearest edge. From break 1.1 the glass catches a softbox sheen — a
 * base and a broad band sweeping across it (none on break 1.1, so the seam holds) — which the holes do not: they read as holes onto the void.
 */
const STAND_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float sheen;
  uniform float sweep;
  uniform vec4 edges[4];
  uniform float gains[4];
  uniform int count;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(map, vUv).rgb;
    float crack = smoothstep(0.05, 0.25, c.b - c.r);
    vec2 p = vUv * vec2(1920.0, 1080.0);
    float best = 1e9;
    float g = 1.0;
    for (int i = 0; i < 4; i++) {
      if (i >= count) break;
      vec2 a = edges[i].xy;
      vec2 ab = edges[i].zw - a;
      float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
      float d = length(p - a - ab * t);
      if (d < best) {
        best = d;
        g = gains[i];
      }
    }
    float band = exp(-pow((p.x * 0.5 + (1080.0 - p.y) * 0.866 - sweep) / 260.0, 2.0));
    vec3 lit = sheen * (${F.STAND_SHEEN.base.toFixed(4)} + ${F.STAND_SHEEN.band.toFixed(4)} * band) * vec3(0.9, 0.97, 1.0);
    gl_FragColor = vec4(c * (1.0 + (g - 1.0) * crack) + lit, 1.0);
  }`;
const UV_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/**
 * The smoked decal on a falling piece (premultiplied): the frozen frame at `opacity` (85 % once it lets go), its smoke thinned to
 * `overPaint` wherever the backplate behind it is paint (glass over paint, not a hole punched in it: review R1-05); `inkOnly` fades the
 * dark glass away and keeps the amber neon; `inked` crosses to flat ink (amber, ink outline), its outline white while `pop` (break 2.1's
 * slap); a white band sweeping across it (a specular glint) at layout x `sweep`; `flatMode` (the shutter of break 2.1's frame) drops the studio.
 */
const DECAL_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D inkedMap;
  uniform sampler2D backdrop;
  uniform vec2 resolution;
  uniform float overPaint;
  uniform float opacity;
  uniform float inkOnly;
  uniform float inked;
  uniform float pop;
  uniform float flatMode;
  uniform float sweep;
  uniform float sweepStrength;
  uniform float glint;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 neon = texture2D(map, vUv).rgb;
    vec4 ink = texture2D(inkedMap, vUv);
    vec3 behind = texture2D(backdrop, gl_FragCoord.xy / resolution).rgb;
    float paint = smoothstep(0.12, 0.3, dot(behind, vec3(0.2126, 0.7152, 0.0722)));
    float amber = smoothstep(0.08, 0.35, neon.r - neon.b);
    float a = opacity * mix(1.0, amber, inkOnly) * mix(mix(1.0, overPaint, paint), 1.0, amber);
    vec3 c = neon * a;
    if (pop > 0.5 && ink.a > 0.001) {
      vec3 col = ink.rgb / ink.a;
      float edge = 1.0 - smoothstep(0.05, 0.3, max(col.r, max(col.g, col.b)));
      ink.rgb = mix(ink.rgb, vec3(ink.a), edge);
    }
    c = mix(c, ink.rgb, inked);
    a = mix(a, ink.a, inked);
    float band = sweepStrength * (1.0 - smoothstep(0.0, 36.0, abs(vUv.x * 1920.0 + vUv.y * 1080.0 * 0.577 - sweep)));
    // The studio on its face: as the pane tumbles, its face mirrors the softbox (top left) and the cyan strip (right) — a flare that
    // blooms (HDR) — plus a grazing Fresnel sheen. Facing the lens (standing, landing) it mirrors nothing.
    vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 V = normalize(vView);
    vec3 R = reflect(-V, N);
    float soft = pow(max(dot(R, normalize(vec3(-0.55, 0.62, 0.56))), 0.0), 40.0);
    float strip = pow(max(dot(R, normalize(vec3(0.9, 0.0, 0.42))), 0.0), 90.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 spec = (2.6 * soft + 0.25 * fres) * vec3(1.0) * (1.0 + 2.0 * glint) + 1.4 * strip * vec3(0.6, 0.92, 1.0);
    float k = max(a, 0.3);
    float live = 1.0 - flatMode;
    c += (vec3(band) + spec) * k * live;
    gl_FragColor = vec4(c, max(a, live * min(1.0, band * 0.35 + 0.3 * (soft + strip))));
  }`;
const DECAL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalMatrix * vec3(0.0, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

/** A hard shadow: the mesh's screen silhouette moved `offset` (NDC), in ink at `alpha`; only where the stencil says paint. */
const SHADOW_VERT = /* glsl */ `
  uniform vec2 offset;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.xy += offset * gl_Position.w;
  }`;
/** A face piece's shadow: only its ink casts one (the glass is clear by then) — the flat ink's coverage at the piece's rest UV. */
const INK_SHADOW_FRAG = /* glsl */ `
  uniform sampler2D inkedMap;
  uniform vec3 color;
  uniform float alpha;
  varying vec2 vUv;
  void main() { gl_FragColor = vec4(color, alpha * texture2D(inkedMap, vUv).a); }`;
const FLAT_FRAG = /* glsl */ `
  uniform vec3 color;
  uniform float alpha;
  void main() { gl_FragColor = vec4(color, alpha); }`;

/** A landed piece's outline: a band `width` px inside its edge, ink where the trim has passed, still cyan crack beyond; all white while `pop`. */
const RING_VERT = /* glsl */ `
  attribute vec2 inward;
  attribute float frac;
  uniform float width;
  varying float vFrac;
  void main() {
    vFrac = frac;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy + inward * width, 0.0, 1.0);
  }`;
const RING_FRAG = /* glsl */ `
  uniform vec3 ink;
  uniform vec3 crack;
  uniform float trim;
  uniform float pop;
  varying float vFrac;
  void main() { gl_FragColor = vec4(pop > 0.5 ? vec3(1.0) : vFrac <= trim ? ink : crack, 1.0); }`;

const MAX_SPLATS = 40;
/**
 * The paint pool on the world plane (layout px): the base band below its rippling edge, smooth-min'd (k = 60) with every splat; cream,
 * antialiased by the distance's own derivative; each splat's rim in the piece's paint running ahead of the cream while it grows.
 * Covered pixels mark the stencil (1), so shadows fall only on paint.
 */
const POOL_VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vP = vec2(w.x + 960.0, 540.0 - w.y);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const POOL_FRAG = /* glsl */ `
  uniform float edge;
  uniform float phase;
  uniform vec3 cream;
  uniform int count;
  uniform vec4 splats[${MAX_SPLATS}];
  uniform vec4 rims[${MAX_SPLATS}];
  varying vec2 vP;
  float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
  }
  void main() {
    float d = edge + 10.0 * sin(6.2831853 * (vP.x - phase) / 320.0) - vP.y;
    for (int i = 0; i < ${MAX_SPLATS}; i++) {
      if (i >= count) break;
      d = smin(d, length(vP - splats[i].xy) - splats[i].z, 60.0);
    }
    float fw = max(fwidth(d), 1e-3);
    float paint = clamp(0.5 - d / fw, 0.0, 1.0);
    vec4 col = vec4(cream * paint, paint);
    for (int i = 0; i < ${MAX_SPLATS}; i++) {
      if (i >= count) break;
      if (rims[i].w <= 0.0) continue;
      float ring = abs(length(vP - splats[i].xy) - splats[i].w) - 2.0;
      float on = clamp(0.5 - ring / fw, 0.0, 1.0) * rims[i].w * (1.0 - paint);
      col = vec4(col.rgb * (1.0 - on) + rims[i].rgb * on, col.a + on * (1.0 - col.a));
    }
    if (col.a < 0.004) discard;
    gl_FragColor = col;
  }`;

/** E2's shard on our side: its piece of the frozen frame, opaque, with a still white highlight band (40 px, 25 %, at −30°). */
const SHARD_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 centre;
  varying vec2 vUv;
  varying vec2 vLocal;
  void main() {
    vec3 c = texture2D(map, vUv).rgb;
    float t = dot(vLocal - vec2(-18.0, 14.0), vec2(0.5, 0.8660254));
    float band = 0.25 * (1.0 - smoothstep(18.0, 22.0, abs(t)));
    gl_FragColor = vec4(mix(c, vec3(1.0), band), 1.0);
  }`;
const SHARD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vLocal;
  void main() {
    vUv = uv;
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const flatMaterial = (color: RGB, alpha = 1, extra: Partial<THREE.ShaderMaterialParameters> = {}): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: { color: { value: v3(color) }, alpha: { value: alpha } },
    vertexShader: UV_VERT,
    fragmentShader: FLAT_FRAG,
    depthTest: false,
    depthWrite: false,
    // Transparent, every one: three draws its opaque list before its transparent one whatever the renderOrder, and the backplate's
    // order (pool, shadows, landed paint) is all renderOrder.
    transparent: true,
    side: THREE.DoubleSide,
    ...extra,
  });

/** A polygon (engine px, relative to its own origin) as a flat ShapeGeometry with UVs from `uv` of each vertex. */
const polygon = (pts: readonly (readonly number[])[], uv?: (x: number, y: number) => [number, number]): THREE.ShapeGeometry => {
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  if (uv) {
    const pos = geo.getAttribute('position');
    const a = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) a.set(uv(pos.getX(i), pos.getY(i)), 2 * i);
    geo.setAttribute('uv', new THREE.BufferAttribute(a, 2));
  }
  return geo;
};
/** The outline band of a polygon (engine px, relative to its centre) for RING_VERT. */
const ringGeometry = (pts: readonly F.V2[]): THREE.BufferGeometry => {
  const r = F.outlineRing(pts);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(r.outer.flatMap(([x, y]) => [x, y, 0]), 3));
  geo.setAttribute('inward', new THREE.Float32BufferAttribute(r.inward.flatMap(([x, y]) => [x, y]), 2));
  geo.setAttribute('frac', new THREE.Float32BufferAttribute(r.frac, 1));
  geo.setIndex(r.index);
  return geo;
};

type Cell = {
  k: number;
  /** The pane, standing (backplate). */
  stand: THREE.Mesh;
  standMat: THREE.ShaderMaterial;
  /** The glass, falling (glass pass): the body and the decal front and back. */
  group: THREE.Group;
  body: THREE.Mesh;
  bodyMat: THREE.MeshPhysicalMaterial;
  decals: THREE.ShaderMaterial[];
  /** Its hard shadow while it falls (backplate). */
  shadow: THREE.Mesh;
  shadowMat: THREE.ShaderMaterial;
};
type Landed = { piece: F.Piece; group: THREE.Group; shadowMat: THREE.ShaderMaterial; ringMat: THREE.ShaderMaterial };

export class BreakFall implements BreakPart {
  /** E2's shard on our side of the screen (until it is edge-on, break 2.2a) and the knocks' ripples (to 2.2a + 3), over whichever part holds the instant. */
  readonly over: Segment = F.FALL_OVER;
  /** The monitor falling away (break 1.1 and 20 frames on) and the chips, which fold into their corners on 2.1 (and the 5 frames after). */
  readonly overlay: Segment = { from: BREAK_START, to: CHIPS_UP.to };

  private layers: { dark: FlatLayer; light: FlatLayer; fore: FlatLayer; ink: FlatLayer; overlay: FlatLayer; ripples: FlatLayer } | null = null;
  private advance: { neon: (ch: string) => number; mono: (ch: string) => number; chip: (ch: string) => number } | null = null;
  private frozen: THREE.WebGLRenderTarget | null = null;
  private frozenKey = Number.NaN;
  private inked: THREE.WebGLRenderTarget | null = null;
  private inkedReady = false;
  private backplate: THREE.WebGLRenderTarget | null = null;
  private backplateQuality: Quality | null = null;
  private size = { width: 1920, height: 1080 };
  private readonly back = new THREE.Scene();
  private readonly glass = new THREE.Scene();
  private readonly shardScene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 1e5);
  private readonly shardCamera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 1e5);
  private readonly cells = new Map<number, Cell>();
  private readonly landed: Landed[] = [];
  private pool: THREE.ShaderMaterial | null = null;
  private backdrop: THREE.ShaderMaterial | null = null;
  private shard: { group: THREE.Group; slab: THREE.Mesh; mat: THREE.ShaderMaterial; drop: THREE.Mesh } | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.size = size;
    const aspect = size.width / size.height;
    // The club's neon type (the same font, size and radius as its atlas, so the frozen glass is drawn exactly as drop 1's last frame was).
    const neon = buildGlyphAtlas(chars([HERO.dying]), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 96, radius: 30, size: 1024 });
    const mono = buildGlyphAtlas(MONITOR_GLYPHS, (px) => `600 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14 });
    const chip = buildGlyphAtlas(F.CHIP_CHARS, (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 1024 });
    this.layers = {
      dark: new FlatLayer({ atlases: { neon }, blend: 'normal', aspect, shapes: 16, glyphs: 16 }),
      light: new FlatLayer({ atlases: { neon }, blend: 'add', aspect, shapes: 16, glyphs: 64 }),
      fore: new FlatLayer({ atlases: {}, blend: 'add', aspect, shapes: 1024, glyphs: 16 }),
      ink: new FlatLayer({ atlases: { neon }, blend: 'normal', aspect, shapes: 16, glyphs: 64 }),
      overlay: new FlatLayer({ atlases: { mono, chip } as Record<string, GlyphAtlas>, blend: 'normal', aspect, shapes: 64, glyphs: 512 }),
      ripples: new FlatLayer({ atlases: {}, blend: 'normal', aspect, shapes: 16, glyphs: 16 }),
    };
    this.advance = { neon: advanceOf(neon), mono: advanceOf(mono), chip: advanceOf(chip) };
    this.owned.push(neon.texture, mono.texture, chip.texture, ...Object.values(this.layers));
    this.frozen = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.inked = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType });
    this.owned.push(this.frozen, this.inked);

    // The studio the glass reflects: a white softbox top left, a cyan strip on the right, the neon's amber spill from below.
    const env = studioEnvironment(
      gl,
      [
        { color: '#ffffff', intensity: 6, position: [-4, 4, 3], size: [4, 2.5] },
        { color: '#9AEBFF', intensity: 3, position: [5, 0, 2], size: [0.7, 5] },
        { color: '#FFB23E', intensity: 1.5, position: [0, -5, 1.5], size: [6, 1.5] },
      ],
      0x0a0a0a,
    );
    this.glass.environment = env;
    this.owned.push(env);
    const base = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.05, transmission: 1, thickness: SHARD_DEPTH, ior: 1.5, dispersion: 5,
      clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.3, iridescenceIOR: 1.3, attenuationColor: new THREE.Color('#e6f7f2'), attenuationDistance: 400, specularIntensity: 1,
    });
    this.owned.push(base);

    // The backdrop of the glass pass: the backplate, which the transmission pass refracts.
    this.backdrop = new THREE.ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }',
      depthTest: false,
      depthWrite: false,
    });
    const quad = new FullscreenQuad(this.backdrop);
    quad.mesh.renderOrder = -1;
    this.glass.add(quad.mesh);
    this.owned.push(quad);

    // Every cell of the crack that ever shows: the pane, the glass, the shadow.
    const thick = new Map(F.PIECES.map((p) => [p.k, p.thickness]));
    for (const s of SHARDS) {
      if (F.OFF_FRAME_CELLS.includes(s.k)) continue;
      const local = s.pts.map(([x, y]) => [x - s.c[0], y - s.c[1]] as const);
      const standGeo = polygon(s.pts, screenUV);
      // Its crack edges in the shader's frame space (layout x, y up: a point's own place on the frozen frame × 1920 × 1080).
      const edges = Array.from({ length: 4 }, (_, i) => {
        const a = s.pts[i % s.pts.length];
        const b = s.pts[(i + 1) % s.pts.length];
        return new THREE.Vector4(a[0] + 960, a[1] + 540, b[0] + 960, b[1] + 540);
      });
      const standMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: this.frozen.texture }, sheen: { value: 0 }, sweep: { value: 0 }, edges: { value: edges }, gains: { value: [1, 1, 1, 1] }, count: { value: s.pts.length } },
        vertexShader: UV_VERT,
        fragmentShader: STAND_FRAG,
        depthTest: false,
        depthWrite: false,
      });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.renderOrder = 1;
      this.back.add(stand);
      const t = thick.get(s.k) ?? SHARD_DEPTH;
      const k = t / SHARD_DEPTH;
      const shape = new THREE.Shape(local.map(([x, y]) => new THREE.Vector2(x, y)));
      const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: SHARD_DEPTH, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.5, bevelSegments: 2 });
      bodyGeo.translate(0, 0, -SHARD_DEPTH / 2);
      const bodyMat = base.clone();
      bodyMat.thickness = t;
      // The face's glass fades out (opacity) as it lands: transparent from the start — flipping it later needs a recompile three would
      // not do, and the frame would depend on which frame a browser happened to draw first.
      bodyMat.transparent = F.FACE_CELLS.includes(s.k);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.z = k;
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      group.add(body);
      const decals: THREE.ShaderMaterial[] = [];
      for (const side of [1, -1]) {
        const z = side * DECAL_Z * k;
        const m = FRONT / (FRONT - z);
        const geo = polygon(local, (x, y) => [((x + s.c[0]) * m + 960) / 1920, ((y + s.c[1]) * m + 540) / 1080]);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: this.frozen.texture }, inkedMap: { value: this.inked.texture }, backdrop: { value: null }, resolution: { value: new THREE.Vector2(size.width, size.height) },
            overPaint: { value: GLASS_OVER_PAINT }, opacity: { value: 1 }, inkOnly: { value: 0 }, inked: { value: 0 }, pop: { value: 0 }, flatMode: { value: 0 },
            sweep: { value: -1e4 }, sweepStrength: { value: 0 }, glint: { value: 0 },
          },
          vertexShader: DECAL_VERT,
          fragmentShader: DECAL_FRAG,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
          blendSrcAlpha: THREE.OneFactor,
          blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        });
        const decal = new THREE.Mesh(geo, mat);
        decal.position.z = z;
        decal.renderOrder = 2;
        group.add(decal);
        decals.push(mat);
        this.owned.push(geo, mat);
      }
      group.visible = false;
      this.glass.add(group);
      const shadowMat = new THREE.ShaderMaterial({
        uniforms: { color: { value: v3(INK) }, alpha: { value: 0.35 }, offset: { value: new THREE.Vector2() }, inkedMap: { value: this.inked.texture } },
        vertexShader: SHADOW_VERT,
        fragmentShader: F.FACE_CELLS.includes(s.k) ? INK_SHADOW_FRAG : FLAT_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.KeepStencilOp,
      });
      const shadowGeo = polygon(local, (x, y) => screenUV(x + s.c[0], y + s.c[1]));
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.matrixAutoUpdate = false;
      shadow.renderOrder = 3;
      shadow.visible = false;
      this.back.add(shadow);
      this.cells.set(s.k, { k: s.k, stand, standMat, group, body, bodyMat, decals, shadow, shadowMat });
      this.owned.push(standGeo, standMat, bodyGeo, bodyMat, shadowGeo, shadowMat);
    }

    // The paint pool: one SDF plane over the world, in front of the standing panes.
    this.pool = new THREE.ShaderMaterial({
      uniforms: {
        edge: { value: 1100 }, phase: { value: 0 }, cream: { value: v3(CREAM) }, count: { value: 0 },
        splats: { value: Array.from({ length: MAX_SPLATS }, () => new THREE.Vector4()) }, rims: { value: Array.from({ length: MAX_SPLATS }, () => new THREE.Vector4()) },
      },
      vertexShader: POOL_VERT,
      fragmentShader: POOL_FRAG,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilZPass: THREE.ReplaceStencilOp,
    });
    const poolGeo = new THREE.PlaneGeometry(4000, 2600);
    const poolMesh = new THREE.Mesh(poolGeo, this.pool);
    poolMesh.renderOrder = 2;
    this.back.add(poolMesh);
    this.owned.push(this.pool, poolGeo);

    // The landed pieces: flat paint polygons with their ink outlines and hard shadows (world px, about their landing points).
    for (const l of F.PIECE_LANDING) {
      const piece = F.PIECES.find((p) => p.k === l.k)!;
      const local = l.pts.map(([x, y]) => [x - l.centroid[0], -(y - l.centroid[1])] as const);
      const geo = polygon(local);
      const shadowMat = flatMaterial(INK, 1, {
        stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
      });
      const fillMat = flatMaterial(PAINT[l.paint]);
      const ringGeo = ringGeometry(local);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: { width: { value: 6 }, trim: { value: 1 }, pop: { value: 0 }, ink: { value: v3(INK) }, crack: { value: v3(CRACK) } },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const shadow = new THREE.Mesh(geo, shadowMat);
      shadow.position.set(12, -12, 0);
      shadow.renderOrder = 4;
      const fill = new THREE.Mesh(geo, fillMat);
      fill.renderOrder = 5 + piece.order * 0.01;
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.renderOrder = 5.005 + piece.order * 0.01;
      const group = new THREE.Group();
      group.add(shadow, fill, ring);
      group.position.set(...F.toEngine(l.centroid), 0);
      group.visible = false;
      this.back.add(group);
      this.landed.push({ piece, group, shadowMat, ringMat });
      this.owned.push(geo, shadowMat, fillMat, ringGeo, ringMat);
    }

    // E2's shard on our side: its piece of the frozen frame on a 10 px slab, a cyan hairline round its edge.
    const e2 = SHARDS[F.E2_CELL];
    const e2Local = e2.pts.map(([x, y]) => [x - e2.c[0], y - e2.c[1]] as const);
    const shardMat = new THREE.ShaderMaterial({ uniforms: { map: { value: this.frozen.texture }, centre: { value: new THREE.Vector2() } }, vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG, side: THREE.DoubleSide });
    const shardGeo = polygon(e2Local, (x, y) => screenUV(x + e2.c[0], y + e2.c[1]));
    const face = new THREE.Mesh(shardGeo, shardMat);
    face.position.z = 5.5;
    const slabGeo = new THREE.ExtrudeGeometry(new THREE.Shape(e2Local.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 10, bevelEnabled: false });
    slabGeo.translate(0, 0, -5);
    const slabMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...linear('#E6FBFF', 1.3)), toneMapped: false });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    const hairGeo = ringGeometry(e2Local);
    const hairMat = new THREE.ShaderMaterial({ uniforms: { width: { value: 2.2 }, trim: { value: 1 }, pop: { value: 0 }, ink: { value: v3(CRACK) }, crack: { value: v3(CRACK) } }, vertexShader: RING_VERT, fragmentShader: RING_FRAG, side: THREE.DoubleSide });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.z = 5.6;
    const shardGroup = new THREE.Group();
    shardGroup.add(slab, face, hair);
    this.shardScene.add(shardGroup);
    // Its drop shadow on the world when knock 1 lifts it toward us: its outline in ink, offset down-right, under everything of it.
    // Transparent (drawn after the shard's opaque meshes) but depth-tested behind them, so it shows only outside the shard.
    const dropMat = flatMaterial(INK, SHARD_DROP_ALPHA, { depthTest: true });
    const drop = new THREE.Mesh(shardGeo, dropMat);
    drop.visible = false;
    this.shardScene.add(drop);
    this.shard = { group: shardGroup, slab, mat: shardMat, drop };
    this.owned.push(shardMat, shardGeo, slabGeo, slabMat, hairGeo, hairMat, dropMat);

    for (const c of [this.camera, this.shardCamera]) {
      c.aspect = aspect;
      c.updateProjectionMatrix();
    }
  }

  /** The cracked glass with his face at the jolt of instant `f` (frozen after break 1.3), rendered once per jolt into `frozen`. */
  private ensureFrozen(gl: THREE.WebGLRenderer, f: number): void {
    const step = Math.floor(Math.floor(Math.min(f, LAST_JOLT) + 0.5) / 2);
    if (step === this.frozenKey) return;
    const g = glassFrame(2 * step, this.advance!.neon);
    const L = this.layers!;
    L.dark.draw(gl, this.frozen!, SCREEN, { under: [], glyphs: {}, over: [] }, { color: VOID, grain: 0 });
    L.light.draw(gl, this.frozen!, SCREEN, g.light, null);
    L.fore.draw(gl, this.frozen!, SCREEN, { under: g.cracks, glyphs: {}, over: [] }, null);
    this.frozenKey = step;
  }

  /** His face of the last jolt as flat ink — amber, an 8 px ink outline — at the same place: what the face's pieces cross into by break 2.1. */
  private ensureInked(gl: THREE.WebGLRenderer): void {
    if (this.inkedReady) return;
    const g = glassFrame(2 * Math.floor(LAST_JOLT / 2), this.advance!.neon);
    const glyphs = (g.light.glyphs.neon ?? []).map((x) => ({ ...x, color: AMBER, tube: undefined, outline: 8 / x.size, outlineColor: INK }));
    gl.setRenderTarget(this.inked!);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    this.layers!.ink.draw(gl, this.inked!, SCREEN, { under: [], glyphs: { neon: glyphs }, over: [] }, null);
    this.inkedReady = true;
  }

  /** The backplate, multisampled when the film is (made on first use at that quality: pure in ctx). */
  private plate(quality: Quality): THREE.WebGLRenderTarget {
    if (this.backplate && this.backplateQuality === quality) return this.backplate;
    this.backplate?.dispose();
    this.backplate = new THREE.WebGLRenderTarget(this.size.width, this.size.height, { type: THREE.HalfFloatType, samples: quality === 'final' ? 4 : 0, depthBuffer: true, stencilBuffer: true });
    this.backplateQuality = quality;
    return this.backplate;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    this.ensureFrozen(gl, f);
    this.ensureInked(gl);
    const pose = F.fallPose(ctx.cam);
    this.camera.position.set(...pose.position);
    this.camera.up.set(...pose.up);
    this.camera.lookAt(...pose.target);
    this.camera.updateMatrixWorld();
    const toNdc = (dx: number, dy: number) => new THREE.Vector2((2 * dx) / 1920, (-2 * dy) / 1080);
    const plate = this.plate(ctx.quality);

    // The blank pieces: standing, falling or landed.
    for (const p of F.PIECES) {
      const c = this.cells.get(p.k)!;
      const s = F.pieceAt(p, f);
      c.stand.visible = s.phase === 'stand';
      c.group.visible = s.phase === 'fall';
      c.shadow.visible = s.phase === 'fall';
      if (s.phase === 'fall') {
        c.group.matrix.fromArray(s.matrix as number[]);
        c.group.matrixWorldNeedsUpdate = true;
        c.shadow.matrix.fromArray(s.matrix as number[]);
        c.shadow.matrixWorldNeedsUpdate = true;
        c.shadowMat.uniforms.offset.value = toNdc(s.shadow.dx, s.shadow.dy);
        c.shadowMat.uniforms.alpha.value = s.shadow.alpha;
        c.bodyMat.transmission = s.transmission;
        c.bodyMat.envMapIntensity = 1 + 3 * s.glint;
        // P1's specular sweep over its release's first 4 frames.
        const sweep = p.k === F.P1_CELL && f < PIECE_FALLS[0].from + 4 ? p.from[0] + 0.577 * p.from[1] - 260 + 520 * Math.max(0, f - PIECE_FALLS[0].from) / 4 : -1e4;
        for (const d of c.decals) {
          d.uniforms.backdrop.value = plate.texture;
          d.uniforms.opacity.value = s.decal;
          d.uniforms.sweep.value = sweep;
          d.uniforms.sweepStrength.value = sweep > -1e3 ? 1.2 : 0;
          d.uniforms.glint.value = s.glint;
        }
      }
      const l = this.landed.find((x) => x.piece === p)!;
      l.group.visible = s.phase === 'land';
      if (s.phase === 'land') {
        l.group.scale.set(s.sx, s.sy, 1);
        l.ringMat.uniforms.width.value = s.outline.width;
        l.ringMat.uniforms.trim.value = s.outline.trim;
        l.ringMat.uniforms.pop.value = s.outline.pop ? 1 : 0;
      }
    }
    // The face: standing until break 1.4, then falling; the E2 shard stands until then and is drawn over (renderOver) from there.
    for (const k of F.FACE_CELLS) {
      const c = this.cells.get(k)!;
      if (k === F.E2_CELL) {
        c.stand.visible = f < FACE_FALL.from;
        continue;
      }
      const s = F.faceAt(k, f);
      c.stand.visible = s.phase === 'stand';
      c.group.visible = s.phase === 'fall';
      c.shadow.visible = s.phase === 'fall';
      if (s.phase !== 'fall') continue;
      c.group.matrix.fromArray(s.matrix as number[]);
      c.group.matrixWorldNeedsUpdate = true;
      c.shadow.matrix.fromArray(s.matrix as number[]);
      c.shadow.matrixWorldNeedsUpdate = true;
      c.shadowMat.uniforms.offset.value = toNdc(s.shadow.dx, s.shadow.dy);
      c.shadowMat.uniforms.alpha.value = s.shadow.alpha;
      c.bodyMat.transmission = s.transmission;
      c.bodyMat.opacity = s.body;
      // The shutter of break 2.1's frame: no glass left, only the flat ink with its white outline pop (the flat world's own picture of it).
      c.body.visible = !s.flat;
      for (const d of c.decals) {
        d.uniforms.backdrop.value = plate.texture;
        d.uniforms.opacity.value = s.decal;
        d.uniforms.inkOnly.value = s.inkOnly;
        d.uniforms.inked.value = s.inked;
        d.uniforms.pop.value = s.flat ? 1 : 0;
        d.uniforms.flatMode.value = s.flat ? 1 : 0;
        d.uniforms.sweep.value = s.sweep ?? -1e4;
        d.uniforms.sweepStrength.value = s.sweep === null ? 0 : 1.4;
      }
    }
    const sheen = F.standSheen(f);
    for (const [k, c] of this.cells) {
      if (!c.stand.visible) continue;
      const g = F.edgeGains(k, f);
      c.standMat.uniforms.gains.value = [0, 1, 2, 3].map((i) => g[i] ?? 1);
      c.standMat.uniforms.sheen.value = sheen.amount;
      c.standMat.uniforms.sweep.value = sheen.sweep;
    }

    // The pool: its edge, its ripple, every splat so far.
    const u = this.pool!.uniforms;
    u.edge.value = F.poolEdge(f);
    u.phase.value = 6 * (f - BREAK_START);
    let n = 0;
    for (const p of F.PIECES) {
      const sp = F.splatAt(p, f);
      if (!sp || n >= MAX_SPLATS) continue;
      (u.splats.value[n] as THREE.Vector4).set(sp.cx, sp.cy, sp.r, sp.rim);
      (u.rims.value[n] as THREE.Vector4).set(...PAINT[p.paint], sp.rimAlpha);
      n++;
    }
    u.count.value = n;

    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(plate);
    gl.setClearColor(new THREE.Color().setRGB(...VOID), 1);
    gl.clear(true, true, true);
    gl.render(this.back, this.camera);
    this.backdrop!.uniforms.map.value = plate.texture;
    const scale = gl.transmissionResolutionScale;
    gl.transmissionResolutionScale = f >= FACE_FALL.from ? 0.5 : 1;
    gl.setRenderTarget(target);
    gl.clearDepth();
    gl.render(this.glass, this.camera);
    gl.transmissionResolutionScale = scale;
    gl.autoClear = auto;
  }

  /** E2's shard on our side of the screen (to break 2.2a), its drop shadow when knock 1 lifts it, and the knocks' ripples (to 2.2a + 3), over whatever part drew the instant. */
  renderOver(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    this.ensureFrozen(gl, f);
    const s = F.shardAt(f);
    const pose: Pose = s?.screen ? F.inverseRigPose(rigAt(ctx.cam)) : SCREEN;
    const auto = gl.autoClear;
    gl.autoClear = false;
    if (s && f < F.SHARD_HANDOFF) {
      const g = this.shard!.group;
      g.position.set(...F.toEngine(s.c), 0);
      g.rotation.set(0, Math.acos(Math.min(1, Math.max(-1, s.scaleX))), (-s.rot * Math.PI) / 180, 'ZYX');
      g.scale.set(s.scale, s.scale, 1);
      this.shard!.slab.visible = s.scaleX < 0.999;
      const drop = this.shard!.drop;
      drop.visible = s.lift > 0;
      drop.position.set(g.position.x + F.SHARD_SHADOW * s.lift, g.position.y - F.SHARD_SHADOW * s.lift, -8);
      drop.rotation.copy(g.rotation);
      drop.scale.copy(g.scale);
      this.shardCamera.position.set(...pose.position);
      this.shardCamera.up.set(...pose.up);
      this.shardCamera.lookAt(...pose.target);
      gl.setRenderTarget(target);
      gl.clearDepth();
      gl.render(this.shardScene, this.shardCamera);
    }
    // Crack-cyan rings between ink edges (outside and in): they read on the cream and on the glass alike (review R1-03).
    const rings: Shape[] = F.knockRipples(f).flatMap((r): Shape[] => {
      if (r.r < 0.5) return [];
      const [x, y] = F.toEngine([r.cx, r.cy]);
      return [
        { kind: 'ring', x, y, w: 2 * (r.r + r.edge), h: 2 * (r.r + r.edge), r: Math.min(r.r + r.edge, r.stroke + 2 * r.edge), color: linear(r.edgeColor), alpha: r.alpha },
        { kind: 'ring', x, y, w: 2 * r.r, h: 2 * r.r, r: r.stroke, color: linear(r.color), alpha: r.alpha },
      ];
    });
    if (rings.length) this.layers!.ripples.draw(gl, target, f < SHARD_FLIGHT.from ? pose : SCREEN, { under: rings, glyphs: {}, over: [] }, null);
    gl.autoClear = auto;
  }

  /** The monitor falling away and the chips, once per output frame over the finished picture (fixed to the screen). */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const m = F.monitorFall(frame, this.advance!.mono);
    const c = F.chipsContent(frame, this.advance!.chip);
    if (m.under.length + c.under.length === 0) return;
    this.layers!.overlay.draw(gl, target, SCREEN, { under: [...m.under, ...c.under], glyphs: { mono: m.glyphs.mono ?? [], chip: c.glyphs.chip ?? [] }, over: [] }, null);
  }

  look(frame: number): Look {
    return F.fallLook(frame);
  }

  temporal(frame: number): Temporal {
    return F.fallTemporal(frame);
  }

  segment(): Segment {
    return F.fallSegment();
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.backplate?.dispose();
  }
}
