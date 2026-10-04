// S31M MEMPHIS, drop2 14.1–15.1 − 1 (2.5D), layer 3/5 memphis.css (builder act2b; build sheet notes/bid2/drop2-sheet2.md §3 bar 14,
// §4.11, from the design notes/extend/drop2-final.md): he lands as the totem's face; the firewall panels slam and the ω laminate
// climbs them; the set turns 90°: they are his shelves; crane up and grid snap into the pictograms.
// The pure picture is src/shots/drop2Memphis.ts. This class draws it with an orthographic camera in four passes:
//   1. the room: the floor (white, its tile lines, the ω bacteria laminate growing from the totem, straightening on the grid snap and
//      cooling to Aicher's blue) and the walls that stand (procedural laminates, unlit, three tones by face);
//   2. under the set: the pictograms' grid, lanes, start line and bytes as the grid snap reveals them (a FlatLayer, src/shots/drop2Picto.ts
//      trackLayers);
//   3. the hard shadow: every object again in #111, its view offset (12, 12) px on screen, no depth;
//   4. the objects: each primitive with its laminate, a 6 px #111 silhouette (a back-face hull a few px bigger), his face on his block,
//      the lemon disc's signature rim, the firewall's tag; then over them the pictograms' figures unfolding on the last click.
// Constructible in Node (no GL before init). Tests: tests/drop2Memphis.test.ts.
import * as THREE from 'three';
import { fillDistance, frontal } from '../engine/camera.ts';
import { type RGB, linear, mixRGB } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import {
  BLOCK,
  DISC,
  FACE,
  FACE_TEXT,
  INKS,
  type InkName,
  type Laminate,
  type Prim,
  type Solid,
  basis,
  inkAt,
  memphisFrame,
  memphisLook,
  memphisSegment,
  memphisTemporal,
  setTurn,
  snapOverlay,
} from '../shots/drop2Memphis.ts';
import { type InkBox, PICTO_INK, PICTO_STRINGS, type PictoLayout, inkKey } from '../shots/drop2Picto.ts';
import { FONTS, advanceOf, chars, measureInk } from './drop2Picto.ts';
import type { ScenePart } from './drop2Stub.ts';

const SCREEN = frontal(fillDistance(1080, 20), 0, 0, 20);
/** The outline (px at 1080p) and the hard shadow's offset (px, right and down). */
const OUTLINE = 6;
const SHADOW = 12;
const INK111: RGB = linear('#111111');

const LAMINATE_ID: Readonly<Record<Laminate, number>> = { solid: 0, checker: 1, zigzag: 2, dots: 3, grid: 4, stripes: 5, band: 6 };
/** Each laminate's cell (world px). */
const CELL: Readonly<Record<Laminate, number>> = { solid: 1, checker: 40, zigzag: 56, dots: 44, grid: 40, stripes: 34, band: 45 };
/** Each laminate's second ink, by the solid's own. */
function secondInk(lam: Laminate, ink: InkName): InkName {
  if (lam === 'grid') return 'white';
  if (lam === 'dots') return ink === 'cobalt' || ink === 'turquoise' || ink === 'ink' ? 'white' : 'ink';
  if (lam === 'stripes' && ink === 'white') return 'turquoise';
  return 'ink';
}

// ——— Shaders ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const LAM_VERT = /* glsl */ `
  uniform vec3 uSize;
  varying vec3 vLocal;
  varying vec3 vNL;
  varying vec3 vWorld;
  varying vec3 vNW;
  void main() {
    vLocal = position * uSize;
    vNL = normal;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

/** The ω bacteria: a tiny ω (two lower half-circles) in some cells, turned at random; \`straight\` flattens it into a dash on a 45° step. */
const OMEGA_GLSL = /* glsl */ `
  uniform float uFill;
  uniform float uOmegaR;
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float omegaArc(vec2 p, float r) {
    vec2 q = vec2(abs(p.x) - r, p.y);
    return q.y <= 0.0 ? abs(length(q) - r) : length(vec2(abs(q.x) - r, q.y));
  }
  float dashD(vec2 p, float r) {
    return length(vec2(p.x - clamp(p.x, -2.0 * r, 2.0 * r), p.y));
  }
  // Coverage of the field at uv (world px), cell c, stroke w; cellC is the cell's centre (for the growth masks).
  float omegaField(vec2 uv, float c, float w, float straight, out vec2 cellC, out float h) {
    vec2 id = floor(uv / c);
    cellC = (id + 0.5) * c;
    float h1 = hash21(id);
    float h2 = hash21(id + 17.13);
    float h3 = hash21(id + 41.7);
    h = hash21(id + 3.9);
    if (h > uFill) return 0.0;
    vec2 p = uv - cellC - (vec2(h1, h2) - 0.5) * c * 0.38;
    float a = h3 * 6.2831853;
    a = mix(a, floor(a / 0.7853982 + 0.5) * 0.7853982, straight);
    float ca = cos(a);
    float sa = sin(a);
    p = vec2(ca * p.x + sa * p.y, -sa * p.x + ca * p.y);
    float r = c * uOmegaR * (0.8 + 0.4 * h1);
    float d = mix(omegaArc(p, r), dashD(p, r), straight);
    float aa = fwidth(d) * 0.8 + 1e-4;
    return 1.0 - smoothstep(w * 0.5 - aa, w * 0.5 + aa, d);
  }`;

const LAM_FRAG = /* glsl */ `
  uniform vec3 uSize;
  uniform vec3 uBase;
  uniform vec3 uInk;
  uniform vec3 uAmber;
  uniform float uPattern;
  uniform float uCell;
  uniform float uCyl;
  uniform vec2 uLight;
  uniform float uInfect;
  uniform float uStraight;
  uniform float uFaceFlat;
  varying vec3 vLocal;
  varying vec3 vNL;
  varying vec3 vWorld;
  varying vec3 vNW;
  ${OMEGA_GLSL}
  vec2 faceUV() {
    vec3 n = abs(vNL);
    if (uCyl > 0.5 && n.y < 0.5) return vec2(atan(vLocal.z, vLocal.x) * uSize.x * 0.5, vLocal.y);
    if (n.y >= n.x && n.y >= n.z) return vLocal.xz;
    if (n.x >= n.z) return vec2(vLocal.z, vLocal.y);
    return vec2(vLocal.x, vLocal.y);
  }
  float band(float v) {
    // A soft-edged 50 % band of a triangle wave (antialiased).
    float t = abs(fract(v) - 0.5);
    float w = fwidth(v) * 0.75 + 1e-4;
    return smoothstep(0.25 - w, 0.25 + w, t);
  }
  float pattern(vec2 q) {
    int k = int(uPattern + 0.5);
    float c = uCell;
    if (k == 1) {
      vec2 s = sin(q * 3.14159265 / c);
      float v = s.x * s.y;
      float w = fwidth(v) * 0.75 + 1e-4;
      return smoothstep(-w, w, v);
    }
    if (k == 2) {
      float y = q.y + (1.0 - uStraight) * abs(fract(q.x / c) - 0.5) * c * 0.9;
      return band(y / (c * 0.7));
    }
    if (k == 3) {
      vec2 g = (fract(q / c) - 0.5) * c;
      float d = length(g) - c * 0.17;
      float w = fwidth(d) * 0.75 + 1e-4;
      return 1.0 - smoothstep(-w, w, d);
    }
    if (k == 4) {
      vec2 g = abs(fract(q / c + 0.5) - 0.5) * c;
      float d = min(g.x, g.y) - 2.0;
      float w = fwidth(d) * 0.75 + 1e-4;
      return 1.0 - smoothstep(-w, w, d);
    }
    if (k == 5) return band((q.x + q.y) / c);
    if (k == 6) {
      // The checker band along the wall's foot, in the wall's own frame (its height above its base edge): standing, the same as world y;
      // folded flat it stays a strip at the edge (R10: in world y the whole folded wall was the band, and its rise swept a grey flash).
      float yb = vLocal.y + 0.5 * uSize.y;
      if (yb > 92.0) return 0.0;
      vec2 s = sin(vec2(q.x, yb) * 3.14159265 / c);
      float v = s.x * s.y;
      float w = fwidth(v) * 0.75 + 1e-4;
      return smoothstep(-w, w, v);
    }
    return 0.0;
  }
  vec3 shade(vec3 c) {
    vec3 n = normalize(vNW);
    if (n.y > 0.6) return mix(c, vec3(1.0), 0.2);
    if (n.y < -0.6) return c * 0.55;
    vec2 h = normalize(n.xz + vec2(1e-5));
    return c * (0.72 + 0.28 * max(dot(h, uLight), 0.0));
  }
  void main() {
    vec2 q = faceUV();
    // A drum's or a cone's cap is plain: the laminate wraps the side.
    bool cap = uCyl > 0.5 && abs(vNL.y) > 0.5;
    vec3 c = cap ? uBase : mix(uBase, uInk, pattern(q));
    if (uInfect > -1e4) {
      vec2 cc;
      float h;
      float m = omegaField(q + 7.0, 84.0, 7.5, uStraight, cc, h);
      float front = uInfect + (h - 0.5) * 120.0;
      c = mix(c, uAmber, m * step(vWorld.y, front));
    }
    // His face side (the block's local +z) is always his amber, whichever way it points.
    gl_FragColor = vec4(uFaceFlat > 0.5 && vNL.z > 0.5 ? c : shade(c), 1.0);
  }`;

const FLOOR_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uFloor;
  uniform vec3 uTile;
  uniform vec3 uOmega;
  uniform float uTileStep;
  uniform float uTileAlpha;
  uniform float uFront;
  uniform float uStraight;
  uniform float uOmegaAlpha;
  uniform float uTurn;
  varying vec3 vWorld;
  ${OMEGA_GLSL}
  void main() {
    // The floor turns with the set.
    float ct = cos(uTurn);
    float st = sin(uTurn);
    vec2 q = vec2(ct * vWorld.x - st * vWorld.z, st * vWorld.x + ct * vWorld.z);
    vec3 c = uFloor;
    vec2 g = abs(fract(q / uTileStep + 0.5) - 0.5) * uTileStep;
    float dl = min(g.x, g.y) - 1.2;
    float aa = fwidth(dl) * 0.75 + 1e-4;
    c = mix(c, uTile, uTileAlpha * (1.0 - smoothstep(-aa, aa, dl)));
    vec2 cc;
    float h;
    float m = omegaField(q, 104.0, 4.6, uStraight, cc, h);
    float keep = step(length(cc) + (h / uFill - 0.5) * 260.0, uFront);
    c = mix(c, uOmega, m * keep * uOmegaAlpha);
    gl_FragColor = vec4(c, 1.0);
  }`;

const FLAT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
/** A decal: the texture's alpha in one ink. */
const DECAL_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uInk;
  uniform float uAlpha;
  varying vec2 vUv;
  void main() {
    float a = texture2D(map, vUv).a * uAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uInk, a);
  }`;
const SOLID_FRAG = /* glsl */ `
  uniform vec3 uInk;
  void main() { gl_FragColor = vec4(uInk, 1.0); }`;

// ——— Geometry ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/** A sine squiggle along x (length 1 world unit per unit), \`amp\` its amplitude, \`radius\` its tube, \`periods\` its waves. */
function squiggleGeometry(length: number, amp: number, radius: number, periods: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const u = i / 160;
    pts.push(new THREE.Vector3((u - 0.5) * length, amp * Math.sin(u * periods * 2 * Math.PI), 0));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, radius, 14, false);
}
function prismGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(0, 0.5);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

type Item = { mesh: THREE.Mesh; hull: THREE.Mesh | null; mat: THREE.ShaderMaterial; shape: Prim };

export class Drop2Memphis implements ScenePart {
  private readonly room = new THREE.Scene();
  private readonly objects = new THREE.Scene();
  private camera: THREE.OrthographicCamera | null = null;
  private readonly geo = new Map<Prim, THREE.BufferGeometry>();
  private readonly items = new Map<string, Item>();
  private floorMat: THREE.ShaderMaterial | null = null;
  private hullMat: THREE.ShaderMaterial | null = null;
  private shadowMat: THREE.ShaderMaterial | null = null;
  private hero: { block: Item; face: THREE.Mesh } | null = null;
  private disc: { mesh: THREE.Mesh; text: THREE.Mesh; hull: THREE.Mesh } | null = null;
  private tag: THREE.Mesh | null = null;
  private squiggle: { mesh: THREE.Mesh; hull: THREE.Mesh; amp: number } | null = null;
  private under: FlatLayer | null = null;
  private over: FlatLayer | null = null;
  private layout: PictoLayout | null = null;
  private readonly owned: { dispose(): void }[] = [];
  private readonly e = new THREE.Euler();

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.camera) return;
    await loadFonts();
    const aspect = size.width / size.height;
    this.camera = new THREE.OrthographicCamera(-960, 960, 540, -540, 1, 60000);
    // Unit primitives (each mesh scaled to its solid's size).
    this.geo.set('box', new THREE.BoxGeometry(1, 1, 1));
    this.geo.set('cylinder', new THREE.CylinderGeometry(0.5, 0.5, 1, 72));
    this.geo.set('cone', new THREE.ConeGeometry(0.5, 1, 72));
    this.geo.set('sphere', new THREE.SphereGeometry(0.5, 56, 36));
    this.geo.set('prism', prismGeometry());
    this.geo.set('arch', new THREE.TorusGeometry(0.36, 0.14, 18, 56, Math.PI));
    this.geo.set('squiggle', squiggleGeometry(1, 0.16, 0.09, 1.5));
    this.geo.set('disc', new THREE.CircleGeometry(0.5, 120));
    for (const g of this.geo.values()) this.owned.push(g);
    this.hullMat = new THREE.ShaderMaterial({ uniforms: { uInk: { value: new THREE.Vector3(...INK111) } }, vertexShader: FLAT_VERT, fragmentShader: SOLID_FRAG, side: THREE.BackSide });
    this.shadowMat = new THREE.ShaderMaterial({ uniforms: { uInk: { value: new THREE.Vector3(...INK111) } }, vertexShader: FLAT_VERT, fragmentShader: SOLID_FRAG, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
    this.owned.push(this.hullMat, this.shadowMat);
    // The floor.
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uFloor: { value: new THREE.Vector3(1, 1, 1) },
        uTile: { value: new THREE.Vector3(...linear('#C9CCD3')) },
        uOmega: { value: new THREE.Vector3(...INK111) },
        uTileStep: { value: 160 },
        uTileAlpha: { value: 1 },
        uFront: { value: 0 },
        uStraight: { value: 0 },
        uOmegaAlpha: { value: 1 },
        uTurn: { value: 0 },
        uFill: { value: 0.4 },
        uOmegaR: { value: 0.11 },
      },
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
    });
    const floorGeo = new THREE.PlaneGeometry(60000, 60000);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, this.floorMat);
    floor.frustumCulled = false;
    this.room.add(floor);
    this.owned.push(floorGeo, this.floorMat);
    // His face block and his face (a decal on its front).
    const block = this.item('hero', 'box', this.objects);
    const faceTex = this.canvasTexture(2048, Math.round((2048 * BLOCK.h) / BLOCK.w), (g, w, h) => {
      const px = 300;
      g.font = `900 ${px}px ${cssStack('rounded')}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const m = g.measureText(FACE_TEXT);
      const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const k = ((FACE.width / BLOCK.w) * w) / ink;
      g.setTransform(k, 0, 0, k, w / 2 - (k * (m.actualBoundingBoxRight - m.actualBoundingBoxLeft)) / 2, h / 2);
      g.fillStyle = '#ffffff';
      g.fillText(FACE_TEXT, 0, 0);
    });
    const face = this.decal(faceTex, INK111);
    this.objects.add(face);
    this.hero = { block, face };
    // The lemon disc with the signature round its rim.
    const discMesh = this.item('disc', 'disc', this.objects);
    const rimTex = this.canvasTexture(2048, 2048, (g, w, h) => {
      const text = DISC.rim;
      const n = [...text].length;
      g.font = `700 112px ${cssStack('display')}`;
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.translate(w / 2, h / 2);
      [...text].forEach((ch, i) => {
        g.save();
        g.rotate((i / n) * 2 * Math.PI);
        g.fillText(ch, 0, -h * 0.4);
        g.restore();
      });
      g.beginPath();
      g.arc(0, 0, h * 0.32, 0, 2 * Math.PI);
      g.lineWidth = 14;
      g.strokeStyle = '#ffffff';
      g.stroke();
    });
    const rim = this.decal(rimTex, INK111);
    const discHull = new THREE.Mesh(this.geo.get('disc')!, new THREE.ShaderMaterial({ uniforms: { uInk: { value: new THREE.Vector3(...INK111) } }, vertexShader: FLAT_VERT, fragmentShader: SOLID_FRAG, side: THREE.DoubleSide }));
    this.owned.push(discHull.material as THREE.Material);
    this.objects.add(rim, discHull);
    this.disc = { mesh: discMesh.mesh, text: rim, hull: discHull };
    // The firewall's tag.
    const tagTex = this.canvasTexture(1024, 192, (g, w, h) => {
      g.fillStyle = '#ffffff';
      const r = h / 2;
      g.beginPath();
      g.roundRect(4, 4, w - 8, h - 8, r - 4);
      g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.font = `700 104px ${cssStack('display')}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('firewall.css', w / 2, h / 2 + 4);
    });
    this.tag = this.decal(tagTex, INK111);
    this.objects.add(this.tag);
    // The lemon squiggle (rebuilt as it straightens).
    const sq = this.item('squiggle', 'box', this.objects);
    sq.mesh.geometry = squiggleGeometry(1100, 70, 22, 4.5);
    sq.hull!.geometry = squiggleGeometry(1100, 70, 22 + OUTLINE, 4.5);
    (sq.mat.uniforms.uSize.value as THREE.Vector3).set(1, 1, 1);
    this.squiggle = { mesh: sq.mesh, hull: sq.hull!, amp: 70 };
    // The pictograms' sheet for the grid snap (the same atlases as src/scenes/drop2Picto.ts).
    const rounded = buildGlyphAtlas(chars([...PICTO_STRINGS.rounded, 'ω']), FONTS.rounded, { fontPx: 160, radius: 20, size: 2048 });
    const display = buildGlyphAtlas(chars(PICTO_STRINGS.display), FONTS.display, { fontPx: 96, radius: 12, size: 512 });
    this.under = new FlatLayer({ atlases: { display }, blend: 'normal', aspect, shapes: 2048, glyphs: 256 });
    this.over = new FlatLayer({ atlases: { rounded }, blend: 'normal', aspect, shapes: 256, glyphs: 64 });
    const ink = new Map<string, InkBox>();
    for (const [font, text] of PICTO_INK) ink.set(inkKey(font, text), measureInk(FONTS[font], text));
    this.layout = { advance: { rounded: advanceOf(rounded), jp: () => 1, display: advanceOf(display) }, ink };
    this.owned.push(rounded.texture, display.texture, this.under, this.over);
  }

  /** A canvas drawn once (white ink on transparent), as a texture. */
  private canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (!g) throw new Error('Canvas 2D is unavailable');
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    this.owned.push(t);
    return t;
  }

  private decal(map: THREE.Texture, ink: RGB): THREE.Mesh {
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, uInk: { value: new THREE.Vector3(...ink) }, uAlpha: { value: 1 } },
      vertexShader: FLAT_VERT,
      fragmentShader: DECAL_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const quad = new THREE.PlaneGeometry(1, 1);
    const m = new THREE.Mesh(quad, mat);
    m.frustumCulled = false;
    m.renderOrder = 5;
    this.owned.push(mat, quad);
    return m;
  }

  /** A primitive with its laminate material and its silhouette hull, added to `scene`. */
  private item(id: string, shape: Prim, scene: THREE.Scene): Item {
    const known = this.items.get(id);
    if (known) return known;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: new THREE.Vector3(1, 1, 1) },
        uBase: { value: new THREE.Vector3(1, 1, 1) },
        uInk: { value: new THREE.Vector3(...INK111) },
        uAmber: { value: new THREE.Vector3(...linear(INKS.amber)) },
        uPattern: { value: 0 },
        uCell: { value: 40 },
        uCyl: { value: 0 },
        uLight: { value: new THREE.Vector2(1, 0) },
        uInfect: { value: -1e5 },
        uStraight: { value: 0 },
        uFaceFlat: { value: id === 'hero' ? 1 : 0 },
        uFill: { value: 0.72 },
        uOmegaR: { value: 0.13 },
      },
      vertexShader: LAM_VERT,
      fragmentShader: LAM_FRAG,
    });
    const g = this.geo.get(shape)!;
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    let hull: THREE.Mesh | null = null;
    if (scene === this.objects) {
      hull = new THREE.Mesh(g, this.hullMat!);
      hull.frustumCulled = false;
      scene.add(hull);
    }
    this.owned.push(mat);
    const it: Item = { mesh, hull, mat, shape };
    this.items.set(id, it);
    return it;
  }

  /** Places one solid: transform, size, laminate, the hull a few px bigger. */
  private place(s: Solid, zoom: number, cool: number, straight: number, light: THREE.Vector2): void {
    const it = this.item(s.id, s.shape, s.pass === 'room' ? this.room : this.objects);
    const visible = s.alpha > 0.01 && s.scale[0] * s.scale[1] * s.scale[2] > 1e-6;
    it.mesh.visible = visible;
    if (it.hull) it.hull.visible = visible;
    if (!visible) return;
    if (it.mesh.geometry !== this.geo.get(s.shape) && s.id !== 'squiggle') {
      it.mesh.geometry = this.geo.get(s.shape)!;
      if (it.hull) it.hull.geometry = this.geo.get(s.shape)!;
    }
    this.e.set(s.rot[1], s.rot[0], s.rot[2], 'YXZ');
    it.mesh.position.set(...s.pos);
    it.mesh.rotation.copy(this.e);
    // The size: pieces and the squiggle keep their own proportions (one scale), the rest are unit primitives.
    const uni = s.shape === 'squiggle' || s.shape === 'arch' || (s.shape === 'prism' && s.id.startsWith('piece'));
    const sz: [number, number, number] = s.id === 'squiggle' ? [1, 1, 1] : uni ? [s.size[0], s.size[0], s.size[0]] : [s.size[0], s.size[1], s.size[2]];
    const k: [number, number, number] = [sz[0] * s.scale[0], sz[1] * s.scale[1], sz[2] * s.scale[2]];
    it.mesh.scale.set(Math.max(1e-4, k[0]), Math.max(1e-4, k[1]), Math.max(1e-4, k[2]));
    const u = it.mat.uniforms;
    (u.uSize.value as THREE.Vector3).set(k[0], k[1], k[2]);
    const base = inkAt(s.ink, cool);
    const ink2 = inkAt(secondInk(s.laminate, s.ink), cool);
    (u.uBase.value as THREE.Vector3).set(...base);
    (u.uInk.value as THREE.Vector3).set(...ink2);
    u.uPattern.value = LAMINATE_ID[s.laminate];
    u.uCell.value = CELL[s.laminate];
    u.uCyl.value = s.shape === 'cylinder' || s.shape === 'cone' ? 1 : 0;
    u.uInfect.value = s.infect ?? -1e5;
    u.uStraight.value = straight;
    (u.uLight.value as THREE.Vector2).copy(light);
    if (it.hull && s.id !== 'squiggle') {
      // The outline: OUTLINE px at 1080p on every side (in world units at this zoom).
      const o = (2 * OUTLINE) / zoom;
      const grow = uni ? [(sz[0] * s.scale[0] + o) / (sz[0] * s.scale[0] || 1), 0, 0] : null;
      it.hull.position.copy(it.mesh.position);
      it.hull.rotation.copy(it.mesh.rotation);
      if (grow) it.hull.scale.copy(it.mesh.scale).multiplyScalar(grow[0]);
      else it.hull.scale.set(k[0] + o, k[1] + o, k[2] + o);
    }
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = ctx.frame;
    const fr = memphisFrame(f);
    const cam = this.camera!;
    const b = basis(fr.cam.pitch, fr.cam.yaw);
    // The camera: orthographic, 1 world unit = zoom px at 1080p.
    const z = fr.cam.zoom;
    cam.left = -960 / z;
    cam.right = 960 / z;
    cam.top = 540 / z;
    cam.bottom = -540 / z;
    cam.position.set(fr.cam.target[0] + b.back[0] * 20000, fr.cam.target[1] + b.back[1] * 20000, fr.cam.target[2] + b.back[2] * 20000);
    cam.up.set(...b.up);
    cam.lookAt(...fr.cam.target);
    cam.near = 1;
    cam.far = 60000;
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
    // The light: from the camera's side, turned 35° to the left (the left-front faces bright, the right-front faces in shade).
    const la = fr.cam.yaw - 35 * (Math.PI / 180);
    const light = new THREE.Vector2(Math.sin(la), Math.cos(la));
    // The floor.
    const fu = this.floorMat!.uniforms;
    (fu.uFloor.value as THREE.Vector3).set(...fr.floor.ink);
    // The bacteria: #111 on white, cooling to Aicher's white marks on blue.
    (fu.uOmega.value as THREE.Vector3).set(...mixRGB(INK111, [1, 1, 1], fr.cool));
    fu.uTileAlpha.value = fr.floor.tileAlpha * 0.5;
    fu.uFront.value = fr.floor.laminate;
    fu.uStraight.value = fr.floor.straight;
    fu.uOmegaAlpha.value = fr.alpha;
    fu.uTurn.value = -setTurn(f) * (Math.PI / 180);
    // Every solid.
    for (const it of this.items.values()) {
      it.mesh.visible = false;
      if (it.hull) it.hull.visible = false;
    }
    for (const s of fr.solids) this.place(s, z, fr.cool, fr.straight, light);
    // The set gives way on the last click: everything scales away but the floor.
    if (fr.alpha < 1) {
      for (const it of this.items.values()) {
        if (it.mesh.parent === this.room) continue;
        it.mesh.scale.multiplyScalar(Math.max(1e-4, fr.alpha));
        it.hull?.scale.multiplyScalar(Math.max(1e-4, fr.alpha));
      }
    }
    // His block and face.
    const h = fr.hero;
    const hb: Solid = { id: 'hero', shape: 'box', pos: h.centre, size: [BLOCK.w, BLOCK.h, BLOCK.d], rot: [h.yaw, -h.tilt, 0], ink: 'amber', laminate: 'solid', infect: null, scale: [h.squash[0] * fr.alpha, h.squash[1] * fr.alpha, fr.alpha], alpha: fr.alpha, pass: 'object' };
    this.place(hb, z, 0, 0, light);
    const face = this.hero!.face;
    face.visible = fr.alpha > 0.01;
    face.position.set(...h.face);
    face.rotation.set(-h.tilt, h.yaw, 0, 'YXZ');
    face.scale.set(BLOCK.w * h.squash[0] * fr.alpha, BLOCK.h * h.squash[1] * fr.alpha, 1);
    // The disc on the left wall.
    const d = this.disc!;
    const dv = fr.disc.alpha > 0.02 && fr.alpha > 0.01;
    for (const m of [d.mesh, d.text, d.hull]) {
      m.visible = dv;
      m.rotation.set(0, fr.disc.yaw, 0, 'YXZ');
    }
    if (dv) {
      const r = 2 * DISC.r * fr.disc.alpha;
      const n: [number, number, number] = [Math.sin(fr.disc.yaw), 0, Math.cos(fr.disc.yaw)];
      d.mesh.position.set(...fr.disc.pos);
      d.mesh.scale.set(r, r, 1);
      d.text.position.set(fr.disc.pos[0] + n[0] * 2, fr.disc.pos[1], fr.disc.pos[2] + n[2] * 2);
      d.text.scale.set(r * 0.98, r * 0.98, 1);
      d.hull.position.set(fr.disc.pos[0] - n[0] * 2, fr.disc.pos[1], fr.disc.pos[2] - n[2] * 2);
      d.hull.scale.set(r + (2 * OUTLINE) / z, r + (2 * OUTLINE) / z, 1);
      const du = (this.items.get('disc')!.mat.uniforms);
      (du.uBase.value as THREE.Vector3).set(...inkAt('lemon', fr.cool));
      du.uPattern.value = 0;
    }
    // The firewall's tag, top left of the right panel's face while it is a panel.
    const pr = fr.solids.find((s) => s.id === 'panelRight');
    const tag = this.tag!;
    tag.visible = !!pr && pr.size[1] > 400 && fr.alpha > 0.01;
    if (pr && tag.visible) {
      this.e.set(0, pr.rot[0], 0, 'YXZ');
      const m = new THREE.Matrix4().makeRotationFromEuler(this.e);
      const local = new THREE.Vector3(-pr.size[0] / 2 + 190, pr.size[1] / 2 - 70, pr.size[2] / 2 + 2).applyMatrix4(m);
      tag.position.set(pr.pos[0] + local.x, pr.pos[1] + local.y, pr.pos[2] + local.z);
      tag.rotation.copy(this.e);
      tag.scale.set(300, 56, 1);
    }
    // The squiggle straightens with the grid snap.
    const sq = this.squiggle!;
    const amp = 70 * (1 - fr.straight);
    if (Math.abs(amp - sq.amp) > 0.5) {
      sq.mesh.geometry.dispose();
      sq.hull.geometry.dispose();
      sq.mesh.geometry = squiggleGeometry(1100, amp, 22, 4.5);
      sq.hull.geometry = squiggleGeometry(1100, amp, 22 + OUTLINE / z, 4.5);
      sq.amp = amp;
    }
    sq.hull.position.copy(sq.mesh.position);
    sq.hull.rotation.copy(sq.mesh.rotation);
    sq.hull.scale.copy(sq.mesh.scale);
    // Passes.
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(target);
    gl.clear(false, true, false);
    gl.render(this.room, cam);
    const snap = snapOverlay(f, this.layout!);
    if (snap) this.under!.draw(gl, target, SCREEN, snap.under, null);
    if (fr.alpha > 0.01) {
      // The hard shadow: the objects in #111, the view moved (−12, −12) so the picture lands (+12, +12), no depth.
      cam.setViewOffset(1920, 1080, -SHADOW, -SHADOW, 1920, 1080);
      this.objects.overrideMaterial = this.shadowMat;
      const hidden = [this.hero!.face, this.disc!.text, this.tag!].filter((m) => m.visible);
      for (const m of hidden) m.visible = false;
      gl.render(this.objects, cam);
      for (const m of hidden) m.visible = true;
      this.objects.overrideMaterial = null;
      cam.clearViewOffset();
      gl.clear(false, true, false);
      gl.render(this.objects, cam);
    }
    gl.autoClear = auto;
    if (snap) this.over!.draw(gl, target, SCREEN, snap.over, null);
  }

  look(frame: number): Look {
    return memphisLook(frame);
  }

  temporal(frame: number): Temporal {
    return memphisTemporal(frame);
  }

  segment(frame: number): Segment {
    return memphisSegment(frame);
  }

  dispose(): void {
    if (this.squiggle) {
      this.squiggle.mesh.geometry.dispose();
      this.squiggle.hull.geometry.dispose();
      this.squiggle = null;
    }
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.items.clear();
    this.camera = null;
  }
}
