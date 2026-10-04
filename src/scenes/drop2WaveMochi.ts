// S31U UKIYO-E · THE MOCHI WAVE, drop2 10.1–12.1 − 1, the 'wave' part when DROP2_THREADS.waveStyle is 'mochi' (src/shots/drop2Threads.ts;
// the pure shot: src/shots/drop2Mochi.ts). Each sub-frame: the world's layers (vectors, then each layer's glyphs) into one target; the
// world pass lays the crash's halftone white water over it (94 → 119: hex dots on the wave's plane, the pale-blue polka, the taiko ring)
// and, on the 72 mie, turns everything outside the iris into an indigo print (grayscale → contrast 1.3 → colour #2B56A8 → multiply
// #5E78B0 → screen #0B1736, as the prototype's canvas did); the overlays go over that (the iris's rims, focus lines, the byte seal, rings,
// ザッパーン, the brackets, him). The print pass then multiplies the washi's fibres in (screen-fixed), warms the corners and, from 11.4,
// runs v09's downsample unchanged (everything above the scan line quantised into game pixels of Defender's 8-bit version of this same
// picture, fizzling out over the last 16th). Over that, the scan line, the spray's game pixels and the mothership (WaveFrame.top).
// Constructible in Node (no GL before init).
import * as THREE from 'three';
import { linear } from '../engine/color.ts';
import { FlatLayer } from '../engine/flatLayer.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { cssStack } from '../engine/fonts.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { MOCHI_STRINGS, type MochiFrame, mochiFrame, mochiLook, mochiSegment, mochiTemporal, mochiTime } from '../shots/drop2Mochi.ts';
import { HT_S } from '../shots/drop2MochiKit.ts';
import type { Fonts } from '../shots/drop2MochiPen.ts';
import type { WaveLayer } from '../shots/drop2Wave.ts';
import { GAME_PALETTE } from '../shots/drop2Wave.ts';
import type { ScenePart } from './drop2Stub.ts';
import { Drop2Switch } from './drop2Switch.ts';
import { SCREEN_POSE, VectorMesh } from './drop2WaveMesh.ts';

const advanceOf =
  (atlas: GlyphAtlas, fallback = 0.6): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? fallback;
const v3 = (hex: string): THREE.Vector3 => new THREE.Vector3(...linear(hex));

const COMMON = /* glsl */ `
  vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

// The world pass: the halftone white water and the 72 mie, over the world.
const WORLD_FRAG = /* glsl */ `
  uniform sampler2D world;
  uniform vec4 cam;        // z, focus x, focus y, roll (the wave's plane, p = 1)
  uniform vec2 shake;      // screen px
  uniform float htOn;
  uniform vec4 ht;         // R, drain y, breathe, polka (f − 94)
  uniform vec2 impact;
  uniform float polkaPop;
  uniform vec4 taiko;      // on, R, band, d
  uniform vec4 mie;        // on, cx, cy, R
  uniform vec3 cW;
  uniform vec3 cA;
  uniform vec3 cB;
  uniform vec3 cPolka;
  uniform vec3 cTaiko;
  varying vec2 vUv;
  ${COMMON}
  const float S = ${HT_S.toFixed(1)};
  vec2 plane(vec2 lp) {
    vec2 d = lp - vec2(960.0, 540.0) - shake;
    float c = cos(-cam.w), s = sin(-cam.w);
    return cam.yz + vec2(d.x * c - d.y * s, d.x * s + d.y * c) / cam.x;
  }
  float smoothR(float a, float b, float x) { return smoothstep(a, b, x); }
  float cov(vec2 p) {
    float R = ht.x;
    if (R <= 0.0) return 0.0;
    vec2 q = vec2((p.x - impact.x) / R, (p.y - impact.y) / (R * 0.82));
    float d = length(q);
    float c = 1.0 - smoothstep(1.0 - min(0.5, 260.0 / R), 1.02, d);
    return c * smoothstep(ht.y - 30.0, ht.y + 190.0, p.y);
  }
  float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
  vec3 clipColor(vec3 c) {
    float l = lum(c), n = min(min(c.r, c.g), c.b), x = max(max(c.r, c.g), c.b);
    if (n < 0.0) c = l + (c - l) * l / max(l - n, 1e-5);
    if (x > 1.0) c = l + (c - l) * (1.0 - l) / max(x - l, 1e-5);
    return c;
  }
  vec3 setLum(vec3 c, float l) { return clipColor(c + (l - lum(c))); }
  void main() {
    vec2 lp = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    vec3 col = texture2D(world, vUv).rgb;
    if (mie.x > 0.5 && distance(lp, mie.yz) > mie.w) {
      vec3 s = toSrgb(col);
      float g = dot(s, vec3(0.2126, 0.7152, 0.0722));
      g = clamp(((g - 0.5) * 1.3 + 0.5) * 1.05, 0.0, 1.0);
      vec3 r = setLum(vec3(43.0, 86.0, 168.0) / 255.0, g);
      r *= vec3(94.0, 120.0, 176.0) / 255.0;
      vec3 sc = vec3(11.0, 23.0, 54.0) / 255.0;
      r = r + sc - r * sc;
      col = toLin(clamp(r, 0.0, 1.0));
    }
    if (htOn > 0.5) {
      vec2 p = plane(lp);
      float aa = 1.0 / cam.x;
      float rMax = S * 0.66;
      float aB = 0.0, aA = 0.0, aW = 0.0, aT = 0.0;
      float rowH = S * 0.866;
      float j0 = floor((p.y + 340.0) / rowH);
      for (int dj = -1; dj <= 2; dj++) {
        float j = j0 + float(dj);
        float cy = -340.0 + j * rowH;
        float ox = mod(j, 2.0) * S * 0.5;
        float i0 = floor((p.x + 340.0 - ox) / S);
        for (int di = -1; di <= 2; di++) {
          vec2 c = vec2(-340.0 + ox + (i0 + float(di)) * S, cy);
          float cv = cov(c);
          if (cv >= 0.03) {
            float r = rMax * pow(cv, 0.75) * (1.0 + 0.04 * sin(c.x * 0.01 + c.y * 0.013 + ht.z * 0.5));
            float a = clamp((r - distance(p, c)) / aa + 0.5, 0.0, 1.0);
            if (cv > 0.72) aW = max(aW, a); else if (cv > 0.36) aA = max(aA, a); else aB = max(aB, a);
          }
          if (taiko.x > 0.5) {
            float dd = length(vec2(c.x - impact.x, (c.y - impact.y) / 0.82)) - taiko.y;
            if (abs(dd) <= taiko.z) {
              float k = 1.0 - abs(dd) / taiko.z;
              float r = S * 0.42 * k * (1.0 - taiko.w / 8.0);
              if (r >= 1.0 && cv >= 0.7) aT = max(aT, clamp((r - distance(p, c)) / aa + 0.5, 0.0, 1.0));
            }
          }
        }
      }
      col = mix(col, cB, aB);
      col = mix(col, cA, aA);
      col = mix(col, cW, aW);
      // The pale-blue polka inside the white, rising 7 px a frame.
      float fr = ht.w + 94.0;
      float aP = 0.0;
      float y0 = p.y + ht.w * 7.0;
      float k0 = floor((y0 + 300.0) / 104.0);
      for (int dk = -1; dk <= 1; dk++) {
        float k = k0 + float(dk);
        float ox = mod(k, 2.0) * 60.0;
        float i0 = floor((p.x + 300.0 - ox) / 120.0);
        for (int di = -1; di <= 1; di++) {
          vec2 id = vec2(i0 + float(di), k);
          vec2 g0 = vec2(-300.0 + ox + id.x * 120.0 + (h21(id + 3.1) - 0.5) * 30.0, -300.0 + k * 104.0 + (h21(id + 7.7) - 0.5) * 30.0);
          vec2 c = vec2(g0.x + 14.0 * sin((fr + g0.y) / 7.0), g0.y - ht.w * 7.0);
          if (cov(c) < 0.95) continue;
          float r = (10.0 + 9.0 * h21(id + 1.9)) * polkaPop * (0.9 + 0.1 * sin(fr / 3.0 + g0.x));
          aP = max(aP, clamp((r - distance(p, c)) / aa + 0.5, 0.0, 1.0));
        }
      }
      col = mix(col, cPolka, aP);
      col = mix(col, cTaiko, aT);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

// The print pass: the washi's fibres and specks multiplied in (40 %), the warm corners, and v09's downsample.
const PRINT_FRAG = /* glsl */ `
  uniform sampler2D print;
  uniform sampler2D game;
  uniform float lineY;
  uniform float cell;
  uniform float derez;
  uniform vec3 palette[10];
  uniform float paperOn;
  uniform sampler2D under;
  uniform vec4 wipe;       // cx, cy, R (layout px), on: the print wipe out of the switch (10.1 … 10.1 + 2)
  varying vec2 vUv;
  ${COMMON}
  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    return length(pa - ba * h);
  }
  // The washi (screen-fixed, as the prototype's multiplied texture): short curved fibres and specks of brown, ≈ 2–4 % darker.
  vec3 fibres(vec2 lp) {
    float dark = 0.0;
    vec2 cellI = floor(lp / 28.0);
    for (int dy = -1; dy <= 1; dy++)
      for (int dx = -1; dx <= 1; dx++) {
        vec2 id = cellI + vec2(float(dx), float(dy));
        vec2 o = (id + vec2(h21(id), h21(id + 5.3))) * 28.0;
        float ang = h21(id + 9.1) * 3.14159;
        float len = 6.0 + h21(id + 2.7) * 34.0;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 bend = vec2(-dir.y, dir.x) * (h21(id + 4.4) - 0.5) * 6.0;
        vec2 a = o, m = o + dir * len * 0.5 + bend, b = o + dir * len;
        float d = min(segDist(lp, a, m), segDist(lp, m, b));
        float w = 0.3 + h21(id + 8.8) * 0.55;
        float al = 0.04 + h21(id + 6.6) * 0.07;
        dark += al * clamp(w + 0.5 - d, 0.0, 1.0);
      }
    vec2 sid = floor(lp / 16.0);
    vec2 sp = (sid + vec2(h21(sid + 1.3), h21(sid + 2.9))) * 16.0;
    float speck = h21(sid + 0.7) * 0.06 * clamp(1.2 - length(lp - sp), 0.0, 1.0);
    // The texture is white with brown fibres (rgba(120, 100, 60, a)), multiplied in at 40 %.
    vec3 fib = 1.0 - 0.4 * min(dark, 0.3) * (1.0 - vec3(120.0, 100.0, 60.0) / 255.0);
    return fib * (1.0 - 0.4 * speck * (1.0 - vec3(110.0, 90.0, 50.0) / 255.0));
  }
  vec3 snap(vec3 c) {
    vec3 s = toSrgb(c);
    float best = 1e9; vec3 pick = c;
    for (int i = 0; i < 10; i++) {
      vec3 d = toSrgb(palette[i]) - s;
      float e = dot(d, d);
      if (e < best) { best = e; pick = palette[i]; }
    }
    return pick;
  }
  void main() {
    vec2 lp = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    vec3 col;
    if (cell > 0.0 && lp.y < lineY) {
      vec2 c0 = (floor(lp / cell) + 0.5) * cell;
      float q = cell * 0.25;
      vec3 raw = 0.25 * (texture2D(game, vec2((c0.x - q) / 1920.0, 1.0 - (c0.y - q) / 1080.0)).rgb + texture2D(game, vec2((c0.x + q) / 1920.0, 1.0 - (c0.y - q) / 1080.0)).rgb
        + texture2D(game, vec2((c0.x - q) / 1920.0, 1.0 - (c0.y + q) / 1080.0)).rgb + texture2D(game, vec2((c0.x + q) / 1920.0, 1.0 - (c0.y + q) / 1080.0)).rgb);
      col = snap(raw);
      if (h21(floor(lp / cell) + vec2(17.0, 3.0)) < derez) col = vec3(0.0);
      float fy = fract(lp.y / cell);
      col *= fy > 0.84 ? 0.72 : 1.0;
    } else {
      col = texture2D(print, vec2(lp.x / 1920.0, 1.0 - lp.y / 1080.0)).rgb;
      if (paperOn > 0.5) {
        vec3 s = toSrgb(col) * fibres(lp);
        // The warm vignette: rgba(60, 40, 10) from 0 at 0.55 H to 0.2 at 1.15 H.
        float r = length(lp - vec2(960.0, 540.0));
        float v = 0.2 * clamp((r - 594.0) / (1242.0 - 594.0), 0.0, 1.0);
        s = mix(s, vec3(60.0, 40.0, 10.0) / 255.0, v);
        col = toLin(clamp(s, 0.0, 1.0));
      }
    }
    if (wipe.w > 0.5) {
      // Outside the wipe's circle: the switch's own picture (its rim, a sumi ring, is drawn over the edge).
      float outside = clamp(distance(lp, wipe.xy) - wipe.z + 0.5, 0.0, 1.0);
      col = mix(col, texture2D(under, vUv).rgb, outside);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export class Drop2WaveMochi implements ScenePart {
  private vec: VectorMesh | null = null;
  private glyphs: FlatLayer | null = null;
  private fonts: Fonts | null = null;
  private world: THREE.WebGLRenderTarget | null = null;
  private print: THREE.WebGLRenderTarget | null = null;
  private game: THREE.WebGLRenderTarget | null = null;
  /** The switch's picture under the print wipe (10.1 … 10.1 + 2), drawn by its own renderer (the mochi's drafting). */
  private under: THREE.WebGLRenderTarget | null = null;
  private readonly blueprint = new Drop2Switch({ draft: 'mochi' });
  private worldQuad: FullscreenQuad | null = null;
  private worldMat: THREE.ShaderMaterial | null = null;
  private printQuad: FullscreenQuad | null = null;
  private printMat: THREE.ShaderMaterial | null = null;
  private readonly owned: { dispose(): void }[] = [];
  private readonly sfx: boolean;
  /** The last frame built per mode (mochiTime puts half of an output frame's sub-frames on one instant). */
  private readonly memo = new Map<'print' | 'game', { key: number; fr: MochiFrame }>();

  constructor(o: { sfx?: boolean } = {}) {
    this.sfx = o.sfx ?? true;
  }

  async init(gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.vec) return;
    await loadFonts();
    await this.blueprint.init(gl, size);
    const atlas = (chars: readonly string[], o: { fontPx: number; radius: number; size: number }): GlyphAtlas => {
      const a = buildGlyphAtlas(chars, (px) => `900 ${px}px ${cssStack('rounded')}`, o);
      this.owned.push(a.texture);
      return a;
    };
    const rounded = atlas(MOCHI_STRINGS.rounded, { fontPx: 96, radius: 16, size: 2048 });
    const hero = atlas(MOCHI_STRINGS.hero, { fontPx: 160, radius: 36, size: 2048 });
    const aspect = size.width / size.height;
    this.vec = new VectorMesh(aspect);
    this.glyphs = new FlatLayer({ atlases: { rounded, hero }, blend: 'normal', aspect, shapes: 8, glyphs: 2000 });
    this.fonts = { rounded: advanceOf(rounded), hero: advanceOf(hero) };
    this.worldMat = new THREE.ShaderMaterial({
      uniforms: {
        world: { value: null },
        cam: { value: new THREE.Vector4(1, 960, 540, 0) },
        shake: { value: new THREE.Vector2(0, 0) },
        htOn: { value: 0 },
        ht: { value: new THREE.Vector4() },
        impact: { value: new THREE.Vector2() },
        polkaPop: { value: 1 },
        taiko: { value: new THREE.Vector4() },
        mie: { value: new THREE.Vector4() },
        cW: { value: v3('#FFFDF6') },
        cA: { value: v3('#D6ECF8') },
        cB: { value: v3('#9CCBEE') },
        cPolka: { value: v3('#BFDCF2') },
        cTaiko: { value: v3('#86B9E6') },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: WORLD_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.worldQuad = new FullscreenQuad(this.worldMat);
    this.printMat = new THREE.ShaderMaterial({
      uniforms: {
        print: { value: null },
        game: { value: null },
        lineY: { value: 0 },
        cell: { value: 0 },
        derez: { value: 0 },
        paperOn: { value: 1 },
        under: { value: null },
        wipe: { value: new THREE.Vector4() },
        palette: { value: GAME_PALETTE.map((h) => v3(h)) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: PRINT_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.printQuad = new FullscreenQuad(this.printMat);
    this.owned.push(this.vec, this.glyphs, this.worldQuad, this.printQuad);
  }

  private targets(ctx: FrameContext): void {
    if (this.print && this.print.width === ctx.width && this.print.height === ctx.height) return;
    for (const t of [this.world, this.print, this.game, this.under]) t?.dispose();
    const make = () => new THREE.WebGLRenderTarget(ctx.width, ctx.height, { type: THREE.HalfFloatType, samples: ctx.quality === 'final' ? 4 : 0, depthBuffer: false });
    this.world = make();
    this.print = make();
    this.game = make();
    this.under = make();
  }

  private paintLayers(gl: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, layers: readonly WaveLayer[]): void {
    for (const L of layers) {
      this.vec!.draw(gl, rt, L.vec);
      if (L.glyphs.rounded.length + L.glyphs.hero.length > 0) this.glyphs!.draw(gl, rt, SCREEN_POSE, { under: [], glyphs: { rounded: L.glyphs.rounded, hero: L.glyphs.hero }, over: [] }, null);
    }
  }
  private ground(gl: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, hex: string): void {
    this.vec!.draw(gl, rt, [{ kind: 'fill', pts: [-10, -10, 1930, -10, 1930, 1090, -10, 1090], color: linear(hex), alpha: 1 }]);
  }
  private frame(f: number, mode: 'print' | 'game'): MochiFrame {
    const key = mochiTime(f);
    const got = this.memo.get(mode);
    if (got?.key === key) return got.fr;
    const fr = mochiFrame(f, this.fonts!, mode, { sfx: this.sfx });
    this.memo.set(mode, { key, fr });
    return fr;
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    this.targets(ctx);
    const c = this.frame(ctx.frame, 'print');
    const world = c.layers.slice(0, c.world);
    const over = c.layers.slice(c.world);
    const passed = c.halftone !== null || c.mie !== null;
    // The world (into its own target when the world pass runs over it), then the overlays.
    this.ground(gl, passed ? this.world! : this.print!, '#F3EAD3');
    this.paintLayers(gl, passed ? this.world! : this.print!, world);
    if (passed) {
      const u = this.worldMat!.uniforms;
      u.world.value = this.world!.texture;
      (u.cam.value as THREE.Vector4).set(c.mcam.z, c.mcam.x, c.mcam.y, c.mcam.r);
      (u.shake.value as THREE.Vector2).set(c.mcam.sx, c.mcam.sy);
      const h = c.halftone;
      u.htOn.value = h ? 1 : 0;
      if (h) {
        (u.ht.value as THREE.Vector4).set(h.R, h.yd, h.breathe, h.polka);
        (u.impact.value as THREE.Vector2).set(h.impact[0], h.impact[1]);
        u.polkaPop.value = h.polkaPop;
        (u.taiko.value as THREE.Vector4).set(h.ring ? 1 : 0, h.ring?.R ?? 0, h.ring?.band ?? 1, h.ring?.d ?? 0);
      }
      (u.mie.value as THREE.Vector4).set(c.mie ? 1 : 0, c.mie?.cx ?? 0, c.mie?.cy ?? 0, c.mie?.R ?? 0);
      this.worldQuad!.render(gl, this.print!);
    }
    this.paintLayers(gl, this.print!, over);
    // Defender's 8-bit version of the same picture, for the downsample.
    if (c.downsample) {
      const g = this.frame(ctx.frame, 'game');
      this.ground(gl, this.game!, '#000000');
      this.paintLayers(gl, this.game!, g.layers);
    }
    const u = this.printMat!.uniforms;
    u.print.value = this.print!.texture;
    u.game.value = this.game!.texture;
    u.lineY.value = c.downsample?.lineY ?? 0;
    u.cell.value = c.downsample?.cell ?? 0;
    u.derez.value = c.downsample?.derez ?? 0;
    // The print wipe (10.1 … 10.1 + 2): the switch's own picture at this instant, outside the circle.
    if (c.wipe) this.blueprint.render(gl, ctx, this.under!);
    u.under.value = this.under!.texture;
    (u.wipe.value as THREE.Vector4).set(c.wipe?.cx ?? 0, c.wipe?.cy ?? 0, c.wipe?.R ?? 0, c.wipe ? 1 : 0);
    this.printQuad!.render(gl, target);
    this.vec!.draw(gl, target, c.top.vec);
  }

  look(frame: number): Look {
    return mochiLook(frame);
  }

  temporal(frame: number): Temporal {
    return mochiTemporal(frame);
  }

  segment(frame: number): Segment {
    return mochiSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    for (const t of [this.world, this.print, this.game, this.under]) t?.dispose();
    this.blueprint.dispose();
    this.world = null;
    this.print = null;
    this.game = null;
    this.under = null;
    this.vec = null;
  }
}
