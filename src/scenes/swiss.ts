// The Swiss world (the part 'swiss', S05–S08) on the GPU: the poster plane through the shot camera, then the screen-space overlay
// over it. The shots are pure (src/shots/swiss.ts); this class draws what they return:
// - S05–S06: S05's Saul Bass cut paper (BassPieces: the jp atlas's glyphs with a ragged edge, knocked out to paper where the lens is
//   under them), drawn with the poster between its shapes and its type;
// - S07: the poster and its layers into a backplate, which the glass (src/scenes/glass.ts, untouched) refracts;
// - S07B: the antivirus's POV mapped on that backplate before the glass sees it (the X-ray: paper → ground, ink → bone, edges, red
//   scanlines; the iris), its `clean ✓` stamps printed on it, the reticle over the glass, the readout once per output frame;
// - the pull: the glass dissolving into his card face (a mix of the glass over its backplate).
import * as THREE from 'three';
import { SWISS_DISPLAY, SWISS_JP, SWISS_MONO, SWISS_TEXT } from '../content/build.ts';
import { frontal } from '../engine/camera.ts';
import type { RGB } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { SDF_EDGE } from '../engine/sdf.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { BASS_CUT, DEFENDER_POV } from '../content/build.ts';
import { BONE, FOV, FRONT, GROUND, type Pieces, type Pov, type SwissLayout, readoutAt, swissFrame, swissLookAt, swissSegment, swissTemporal } from '../shots/swiss.ts';
import { INK, PAPER, SWISS_RED } from '../worlds/swiss.ts';
import { GlassHero } from './glass.ts';

/** Advance of a character in ems, from the atlas; a space (not in the atlas) is 0.28 em. */
export const advanceOf =
  (atlas: GlyphAtlas): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? 0.28;

const vec3 = (c: RGB) => new THREE.Vector3(c[0], c[1], c[2]);

/**
 * The centre of a glyph's ink in ems from its quad's centre, y up: the centroid of the atlas texels inside its edge. (deepestInside
 * returns the first texel of the SDF's saturated plateau, which for a fat bullet sits a tenth of an em up and left of its centre.)
 */
export function inkCentre(atlas: GlyphAtlas, ch: string): [number, number] {
  const e = atlas.entries.get(ch);
  if (!e) throw new Error(`"${ch}" is not in the atlas`);
  const size = atlas.texture.image.width;
  const data = atlas.texture.image.data as Uint8Array;
  const x0 = Math.round(e.u0 * size);
  const y0 = Math.round(e.v0 * size);
  const w = Math.round((e.u1 - e.u0) * size);
  const edge = SDF_EDGE * 255;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < atlas.cellH; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y0 + y) * size + x0 + x] < edge) continue;
      sx += x + 0.5;
      sy += y + 0.5;
      n++;
    }
  }
  if (n === 0) return [0, 0];
  return [(sx / n - w / 2) / atlas.fontPx, (atlas.cellH / 2 - sy / n) / atlas.fontPx];
}
/** A 32-bit integer hash (PCG, as the paper's fibre) and value noise from it, for the pieces' ragged edges: the same on every GPU. */
const PCG_NOISE = /* glsl */ `
  uint pcg(uint v) {
    uint state = v * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
  }
  float cell(vec2 i, float seed) {
    return float(pcg(uint(int(i.x) + 4096) ^ pcg(uint(int(i.y) + 4096) ^ pcg(uint(seed))))) / 4294967295.0;
  }
  float vnoise(vec2 p, float seed) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(cell(i, seed), cell(i + vec2(1.0, 0.0), seed), u.x), mix(cell(i + vec2(0.0, 1.0), seed), cell(i + vec2(1.0, 1.0), seed), u.x), u.y);
  }`;

/**
 * S05's Saul Bass cut paper on the poster plane: each piece its jp-atlas glyph with a ragged edge (the SDF threshold moved by fixed
 * value noise, BASS_CUT), straight alpha over the poster; ink outside the knockout ellipse, paper inside it (the lens's red under him).
 */
class BassPieces {
  readonly mesh: THREE.Mesh;
  private readonly geo = new THREE.InstancedBufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly pos: THREE.InstancedBufferAttribute;
  private readonly size: THREE.InstancedBufferAttribute;
  private readonly uv: THREE.InstancedBufferAttribute;
  private readonly quadPerEm: number;
  private readonly atlas: GlyphAtlas;

  constructor(atlas: GlyphAtlas) {
    this.atlas = atlas;
    const capacity = 8;
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.instanceCount = 0;
    const attr = () => new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.pos = attr();
    this.size = attr();
    this.uv = attr();
    this.geo.setAttribute('aPos', this.pos);
    this.geo.setAttribute('aSize', this.size);
    this.geo.setAttribute('aUv', this.uv);
    this.quadPerEm = atlas.cellH / atlas.fontPx;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        atlas: { value: atlas.texture },
        uKnock: { value: new THREE.Vector4(0, 0, 0, 0) },
        uInk: { value: vec3(INK) },
        uPaper: { value: vec3(PAPER) },
        uRagged: { value: BASS_CUT.ragged },
        uNoise: { value: BASS_CUT.noiseScale },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aPos;   // x, y, rotation, seed
        attribute vec4 aSize;  // quad height, glyph aspect (w/h), scale x, scale y
        attribute vec4 aUv;    // u0, v0 (top), u1, v1 (bottom)
        varying vec2 vLocal;
        varying vec4 vBox;
        varying float vAspect;
        varying vec2 vPlane;
        varying float vSeed;
        void main() {
          vec2 local = position.xy * vec2(max(aSize.y, 1.0), 1.0);
          vec2 q = local * aSize.x * aSize.zw;
          float c = cos(aPos.z);
          float s = sin(aPos.z);
          vec2 p = aPos.xy + mat2(c, s, -s, c) * q;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);
          vLocal = local;
          vBox = aUv;
          vAspect = aSize.y;
          vPlane = p;
          vSeed = aPos.w;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        uniform vec4 uKnock;   // the knockout ellipse on the plane: centre, half-axes (0 = none)
        uniform vec3 uInk;
        uniform vec3 uPaper;
        uniform float uRagged;
        uniform float uNoise;
        varying vec2 vLocal;
        varying vec4 vBox;
        varying float vAspect;
        varying vec2 vPlane;
        varying float vSeed;
        ${PCG_NOISE}
        void main() {
          vec2 g = vec2(vLocal.x / vAspect + 0.5, vLocal.y + 0.5);
          float inside = step(0.0, g.x) * step(g.x, 1.0) * step(0.0, g.y) * step(g.y, 1.0);
          vec2 uv = vec2(mix(vBox.x, vBox.z, clamp(g.x, 0.0, 1.0)), mix(vBox.w, vBox.y, clamp(g.y, 0.0, 1.0)));
          float d = texture2D(atlas, uv).r * inside;
          // Hand-cut: the edge wanders by fixed noise, two octaves, fixed to the piece (it never swims).
          vec2 np = vLocal * uNoise;
          float n = 0.65 * vnoise(np, vSeed) + 0.35 * vnoise(np * 2.9 + 7.0, vSeed + 31.0);
          float m = d + uRagged * (2.0 * n - 1.0) * step(0.02, d);
          float aa = max(fwidth(m), 1e-4) * 0.7;
          float a = smoothstep(${SDF_EDGE.toFixed(4)} - aa, ${SDF_EDGE.toFixed(4)} + aa, m);
          if (a < 0.003) discard;
          float paper = 0.0;
          if (uKnock.z > 0.0) {
            float e = (length((vPlane - uKnock.xy) / uKnock.zw) - 1.0) * min(uKnock.z, uKnock.w);
            float ea = max(fwidth(e), 1e-4) * 0.7;
            paper = 1.0 - smoothstep(-ea, ea, e);
          }
          gl_FragColor = vec4(mix(uInk, uPaper, paper), a);
        }`,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    // Over the poster's shapes (the lens), under its type.
    this.mesh.renderOrder = 0.5;
    base.dispose();
  }

  set(p: Pieces | null): void {
    if (!p || p.list.length === 0) {
      this.mesh.visible = false;
      return;
    }
    const a = this.pos.array as Float32Array;
    const s = this.size.array as Float32Array;
    const u = this.uv.array as Float32Array;
    p.list.forEach((x, i) => {
      const e = this.atlas.entries.get(x.ch);
      if (!e) throw new Error(`cut paper: "${x.ch}" is not in the atlas`);
      const k = 4 * i;
      a.set([x.x, x.y, x.rot, x.seed], k);
      s.set([x.size * this.quadPerEm, e.aspect, x.sx, x.sy], k);
      u.set([e.u0, e.v0, e.u1, e.v1], k);
    });
    this.geo.instanceCount = p.list.length;
    for (const b of [this.pos, this.size, this.uv]) b.needsUpdate = true;
    const k = p.knock;
    (this.material.uniforms.uKnock.value as THREE.Vector4).set(k?.x ?? 0, k?.y ?? 0, k?.rx ?? 0, k?.ry ?? 0);
    this.mesh.visible = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/**
 * How the X-ray reads the poster: paper → ground; a solid ink area → a faint bone fill (`fill`) with a bone outline (`edge`, the Sobel
 * edge of the plate's luminance at 1080p pixel steps, `gain` lifting the faint module rules to about 0.45); the lens's red → ground
 * (its edge stays). The prototype's look (notes/b112/w/src/j4.js), kept over the design's flat 0.85 fill.
 */
export const XRAY = { fill: 0.14, edge: 0.85, gain: 2.5 } as const;

/**
 * The antivirus's X-ray on a full-screen plate (FULLSCREEN_VERT): uniforms as SwissScene.init sets them. Exported for the sections that
 * adapt the POV signature (the club, the interlude, drop 2: build sheet §6 DEFENDER_POV).
 */
export const XRAY_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 uIris;      // centre (1080p px from the frame's centre, y up), radius; z < 0: the whole frame
  uniform float uAnnulus;
  uniform float uFull;     // 1: X-ray, 0: the lite rung (colour with the scanlines)
  uniform float uCrawl;
  uniform vec3 uLines;     // width, pitch, alpha (1080p px)
  uniform float uDevice;   // device px per 1080p px
  uniform vec3 uGround;
  uniform vec3 uBone;
  uniform vec3 uRed;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform vec3 uLook;      // fill, edge, gain
  varying vec2 vUv;
  // The POV is composited in display space, as the approved prototype was (a 14 % bone fill must look faint, not mid-grey).
  vec3 toDisplay(vec3 c) { c = max(c, 0.0); return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float L(vec2 o) { return luma(toDisplay(texture2D(map, vUv + o / vec2(1920.0, 1080.0)).rgb)); }
  void main() {
    vec3 lin = texture2D(map, vUv).rgb;
    vec3 col = toDisplay(lin);
    vec2 px = vUv * vec2(1920.0, 1080.0);
    vec3 xr = col;
    if (uFull > 0.5) {
      float lp = luma(toDisplay(uPaper));
      float li = luma(toDisplay(uInk));
      float redness = clamp((col.r - max(col.g, col.b)) / max(col.r, 1e-4), 0.0, 1.0);
      float ink = clamp((lp - luma(col)) / (lp - li), 0.0, 1.0) * (1.0 - smoothstep(0.55, 0.8, redness));
      float gx = (L(vec2(1, 1)) + 2.0 * L(vec2(1, 0)) + L(vec2(1, -1))) - (L(vec2(-1, 1)) + 2.0 * L(vec2(-1, 0)) + L(vec2(-1, -1)));
      float gy = (L(vec2(-1, 1)) + 2.0 * L(vec2(0, 1)) + L(vec2(1, 1))) - (L(vec2(-1, -1)) + 2.0 * L(vec2(0, -1)) + L(vec2(1, -1)));
      float edge = clamp(uLook.z * length(vec2(gx, gy)) / (4.0 * (lp - li)), 0.0, 1.0);
      xr = mix(toDisplay(uGround), toDisplay(uBone), max(uLook.x * ink, uLook.y * edge));
    }
    // The red scanlines, crawling down: whole 1080p px from the top, so at 4K each lands on whole device pixels.
    float fromTop = 1080.0 - px.y;
    xr = mix(xr, toDisplay(uRed), uLines.z * step(mod(fromTop - uCrawl, uLines.y), uLines.x));
    vec3 outc = xr;
    if (uIris.z >= 0.0) {
      float d = length(px - vec2(960.0, 540.0) - uIris.xy);
      float aa = 0.75 / uDevice;
      float inside = 1.0 - smoothstep(uIris.z - aa, uIris.z + aa, d);
      float ring = (1.0 - inside) * (1.0 - smoothstep(uIris.z + uAnnulus - aa, uIris.z + uAnnulus + aa, d));
      outc = mix(mix(col, xr, inside), toDisplay(uRed), ring);
    }
    gl_FragColor = vec4(toLinear(outc), 1.0);
  }`;

export class SwissScene implements Renderable {
  private world: FlatLayer | null = null;
  private overlay: FlatLayer | null = null;
  private stamps: FlatLayer | null = null;
  private hud: FlatLayer | null = null;
  private readout: FlatLayer | null = null;
  private pieces: BassPieces | null = null;
  private layout: SwissLayout | null = null;
  private glass: GlassHero | null = null;
  private backplate: THREE.WebGLRenderTarget | null = null;
  private povPlate: THREE.WebGLRenderTarget | null = null;
  private glassTarget: THREE.WebGLRenderTarget | null = null;
  private xray: FullscreenQuad | null = null;
  private xrayMaterial: THREE.ShaderMaterial | null = null;
  private mix: FullscreenQuad | null = null;
  private mixMaterial: THREE.ShaderMaterial | null = null;
  private size = { width: 1920, height: 1080 };
  private readonly owned: { dispose(): void }[] = [];

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.size = size;
    const jp = buildGlyphAtlas(SWISS_JP, (px) => `900 ${px}px ${cssStack('jp')}`, { fontPx: 160, radius: 20 });
    const display = buildGlyphAtlas(SWISS_DISPLAY, (px) => `900 ${px}px ${cssStack('display')}`, { fontPx: 160, radius: 20, size: 2048 });
    const text = buildGlyphAtlas(SWISS_TEXT, (px) => `600 ${px}px ${cssStack('display')}`, { fontPx: 96, radius: 12, size: 2048 });
    const mono = buildGlyphAtlas(SWISS_MONO, (px) => `500 ${px}px ${cssStack('mono')}`, { fontPx: 64, radius: 8, size: 1024 });
    const atlases = { jp, display, text };
    const aspect = size.width / size.height;
    this.world = new FlatLayer({ atlases, blend: 'normal', aspect });
    this.overlay = new FlatLayer({ atlases, blend: 'normal', aspect });
    this.stamps = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect });
    this.hud = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect });
    this.readout = new FlatLayer({ atlases: { mono }, blend: 'normal', aspect });
    this.pieces = new BassPieces(jp);
    this.world.scene.add(this.pieces.mesh);
    this.layout = { jp: advanceOf(jp), display: advanceOf(display), text: advanceOf(text), mono: advanceOf(mono), bullet: inkCentre(jp, '•') };
    this.owned.push(jp.texture, display.texture, text.texture, mono.texture, this.world, this.overlay, this.stamps, this.hud, this.readout, this.pieces);
    this.glass = new GlassHero();
    await this.glass.init(gl, size);
    const plate = () => new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, depthBuffer: false });
    this.backplate = plate();
    this.povPlate = plate();
    this.xrayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        uIris: { value: new THREE.Vector3(0, 0, -1) },
        uAnnulus: { value: 140 },
        uFull: { value: 1 },
        uCrawl: { value: 0 },
        uLines: { value: new THREE.Vector3(DEFENDER_POV.scanlines.width, DEFENDER_POV.scanlines.pitch, DEFENDER_POV.scanlines.alpha) },
        uDevice: { value: size.height / 1080 },
        uGround: { value: vec3(GROUND) },
        uBone: { value: vec3(BONE) },
        uRed: { value: vec3(SWISS_RED) },
        uPaper: { value: vec3(PAPER) },
        uInk: { value: vec3(INK) },
        uLook: { value: new THREE.Vector3(XRAY.fill, XRAY.edge, XRAY.gain) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: XRAY_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.xray = new FullscreenQuad(this.xrayMaterial);
    this.mixMaterial = new THREE.ShaderMaterial({
      uniforms: { plate: { value: null }, glass: { value: null }, amount: { value: 1 } },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: 'uniform sampler2D plate; uniform sampler2D glass; uniform float amount; varying vec2 vUv; void main() { gl_FragColor = vec4(mix(texture2D(plate, vUv).rgb, texture2D(glass, vUv).rgb, amount), 1.0); }',
      depthTest: false,
      depthWrite: false,
    });
    this.mix = new FullscreenQuad(this.mixMaterial);
    this.owned.push(this.glass, this.backplate, this.povPlate, this.xray, this.mix);
  }

  /** The antivirus's X-ray (or the lite rung's scanlines) and the iris, from the backplate onto the POV plate. */
  private povPass(gl: THREE.WebGLRenderer, pov: Pov): void {
    const u = this.xrayMaterial!.uniforms;
    u.map.value = this.backplate!.texture;
    (u.uIris.value as THREE.Vector3).set(pov.iris?.x ?? 0, pov.iris?.y ?? 0, pov.iris ? pov.iris.r : -1);
    u.uFull.value = pov.mode === 'full' ? 1 : 0;
    u.uCrawl.value = pov.crawl;
    this.xray!.render(gl, this.povPlate!);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const f = swissFrame(ctx.frame, this.layout!);
    const screen = frontal(FRONT, 0, 0, FOV);
    const plated = f.pov !== null && f.pov.mode !== 'hud';
    // With the glass (or the POV) on screen the poster goes into the backplate first, so it can be mapped and refracted.
    const out = f.glass || plated ? this.backplate! : target;
    this.pieces!.set(f.pieces);
    this.world!.draw(gl, out, f.camera, f.world, { color: PAPER, grain: 0 });
    this.overlay!.draw(gl, out, screen, f.overlay, null);
    let plate = this.backplate!;
    if (plated) {
      this.povPass(gl, f.pov!);
      this.stamps!.draw(gl, this.povPlate!, screen, f.pov!.stamps, null);
      plate = this.povPlate!;
    }
    if (f.glass && f.glassFade >= 1) this.glass!.render(gl, plate.texture, f.glass, target);
    else if (f.glass) {
      // The glass dissolving into his card face: the glass over its plate, mixed back to the plate.
      if (!this.glassTarget) {
        this.glassTarget = new THREE.WebGLRenderTarget(this.size.width, this.size.height, { type: THREE.HalfFloatType, samples: ctx.quality === 'final' ? 4 : 0, depthBuffer: true });
        this.owned.push(this.glassTarget);
      }
      this.glass!.render(gl, plate.texture, f.glass, this.glassTarget);
      this.mixMaterial!.uniforms.plate.value = plate.texture;
      this.mixMaterial!.uniforms.glass.value = this.glassTarget.texture;
      this.mixMaterial!.uniforms.amount.value = f.glassFade;
      this.mix!.render(gl, target);
    } else if (plated) {
      this.mixMaterial!.uniforms.plate.value = plate.texture;
      this.mixMaterial!.uniforms.glass.value = plate.texture;
      this.mixMaterial!.uniforms.amount.value = 0;
      this.mix!.render(gl, target);
    }
    if (f.hud) this.hud!.draw(gl, target, screen, f.hud, null);
  }

  /** The POV's readout: once per output frame, fixed to the screen (never shaken or blurred), before the look (so its ✓ blooms). */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const r = readoutAt(frame, this.layout!);
    if (r) this.readout!.draw(gl, target, frontal(FRONT, 0, 0, FOV), r, null);
  }

  look(frame: number): Look {
    return swissLookAt(frame);
  }

  temporal(frame: number): Temporal {
    return swissTemporal(frame);
  }

  segment(frame: number): Segment {
    return swissSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
