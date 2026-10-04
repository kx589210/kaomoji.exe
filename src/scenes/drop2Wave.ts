// S31U UKIYO-E, drop2 10.1–12.1 − 1 (2.5D), layer 1/5 ukiyoe.print (builder U · WAVE; build sheet notes/bid2/drop2-sheet2.md §3
// "drop2 10–11", §4.3, §4.8; the pure shot: src/shots/drop2Wave.ts, its geometry src/shots/drop2WaveGeom.ts). Each sub-frame paints the
// print's passes into its own target (the vector painter, then the glyphs of each pass), then copies it onto the frame through the
// print pass: the woodgrain cut into the blocks (multiplied at 6 %, moving with the wave's plane) and, from drop2 11.4, Defender's
// downsample — everything above the scan line quantised into game pixels of the film's 16 colours, the washi turned black. Over that:
// the scan line, the game pixels the spray became and the mothership's bitmap (src/shots/drop2Wave.ts WaveFrame.top). The dispatcher
// (src/scenes/drop2.ts) sends it the 'wave' part's instants; constructible in Node (no GL before init).
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
import { PALETTES } from '../shots/drop2Shared.ts';
import { GAME_PALETTE, WAVE_STRINGS, type WaveCam, type WaveFrame, waveFrame, waveLook, waveSegment, waveTemporal } from '../shots/drop2Wave.ts';
import type { ScenePart } from './drop2Stub.ts';
import { SCREEN_POSE, VectorMesh } from './drop2WaveMesh.ts';

const advanceOf =
  (atlas: GlyphAtlas, fallback = 0.6): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? fallback;

const toLinear = (hex: string): [number, number, number] => linear(hex) as [number, number, number];

const PRINT_FRAG = /* glsl */ `
  uniform sampler2D print;
  uniform sampler2D game;   // Defender's 8-bit version of the same print
  uniform float lineY;      // lp px from the top; everything above is quantised
  uniform float cell;       // game pixel, lp px (0 = off)
  uniform float derez;      // the fizzle: the share of game pixels gone black
  uniform vec3 washi;       // linear
  uniform vec3 palette[10]; // linear: the game palette
  uniform vec4 wood;        // the wave plane: focus (x, y), zoom, roll
  varying vec2 vUv;

  vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  // Woodgrain on the wave's plane: long rings stretched along x, wobbling; 0 … 1.
  float woodgrain(vec2 q) {
    float w = q.y * 0.11 + 7.0 * vnoise(q * vec2(0.0021, 0.009)) + 2.0 * vnoise(q * vec2(0.01, 0.05));
    float ring = smoothstep(0.55, 1.0, abs(sin(w)));
    float fibre = vnoise(q * vec2(0.02, 0.6));
    return 0.65 * ring + 0.35 * fibre;
  }
  vec2 planeOf(vec2 lp) {
    float c = cos(wood.w), s = sin(wood.w);
    vec2 v = (lp - vec2(960.0, 540.0)) / wood.z;
    return wood.xy + vec2(c * v.x - s * v.y, s * v.x + c * v.y);
  }
  vec3 printed(vec2 lp) {
    vec3 c = texture2D(print, vec2(lp.x / 1920.0, 1.0 - lp.y / 1080.0)).rgb;
    return c * (1.0 - 0.06 * woodgrain(planeOf(lp)));
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
      // The fizzle: each game pixel drops out at its own moment (a random order over the last 16th).
      if (h21(floor(lp / cell) + vec2(17.0, 3.0)) < derez) col = vec3(0.0);
      // The game pixel's scanline gap.
      float fy = fract(lp.y / cell);
      col *= fy > 0.84 ? 0.72 : 1.0;
    } else {
      col = printed(lp);
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export class Drop2Wave implements ScenePart {
  private vec: VectorMesh | null = null;
  private glyphs: FlatLayer | null = null;
  private heroLayer: FlatLayer | null = null;
  private layout: { rounded: Advance; jp: Advance } | null = null;
  private print: THREE.WebGLRenderTarget | null = null;
  private game: THREE.WebGLRenderTarget | null = null;
  private printQuad: FullscreenQuad | null = null;
  private printMat: THREE.ShaderMaterial | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    if (this.vec) return;
    await loadFonts();
    const atlas = (chars: readonly string[], role: 'rounded' | 'jp', weight: number, o: { fontPx: number; radius: number; size: number }): GlyphAtlas => {
      const a = buildGlyphAtlas(chars, (px) => `${weight} ${px}px ${cssStack(role)}`, o);
      this.owned.push(a.texture);
      return a;
    };
    const rounded = atlas(WAVE_STRINGS.rounded, 'rounded', 800, { fontPx: 64, radius: 10, size: 1024 });
    const jp = atlas(WAVE_STRINGS.jp, 'jp', 900, { fontPx: 96, radius: 14, size: 2048 });
    const hero = atlas(WAVE_STRINGS.rounded, 'rounded', 800, { fontPx: 160, radius: 36, size: 2048 });
    const aspect = size.width / size.height;
    this.vec = new VectorMesh(aspect);
    this.glyphs = new FlatLayer({ atlases: { rounded, jp }, blend: 'normal', aspect, shapes: 8, glyphs: 6000 });
    this.heroLayer = new FlatLayer({ atlases: { hero }, blend: 'normal', aspect, shapes: 8, glyphs: 64 });
    this.layout = { rounded: advanceOf(rounded), jp: advanceOf(jp, 1) };
    this.printMat = new THREE.ShaderMaterial({
      uniforms: {
        print: { value: null },
        lineY: { value: 0 },
        cell: { value: 0 },
        derez: { value: 0 },
        washi: { value: new THREE.Vector3(...toLinear(PALETTES.ukiyoe.washi)) },
        game: { value: null },
        palette: { value: GAME_PALETTE.map((h) => new THREE.Vector3(...toLinear(h))) },
        wood: { value: new THREE.Vector4(960, 540, 1, 0) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: PRINT_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.printQuad = new FullscreenQuad(this.printMat);
    this.owned.push(this.vec, this.glyphs, this.heroLayer, this.printQuad);
  }

  private targets(ctx: FrameContext): { print: THREE.WebGLRenderTarget; game: THREE.WebGLRenderTarget } {
    if (!this.print || this.print.width !== ctx.width || this.print.height !== ctx.height) {
      this.print?.dispose();
      this.game?.dispose();
      const make = () => new THREE.WebGLRenderTarget(ctx.width, ctx.height, { type: THREE.HalfFloatType, samples: ctx.quality === 'final' ? 4 : 0, depthBuffer: false });
      this.print = make();
      this.game = make();
    }
    return { print: this.print, game: this.game! };
  }

  /** Paints a frame's passes into `rt`, over its ground. */
  private paint(gl: THREE.WebGLRenderer, rt: THREE.WebGLRenderTarget, c: WaveFrame, ground: string): void {
    this.vec!.draw(gl, rt, [{ kind: 'fill', pts: [-10, -10, 1930, -10, 1930, 1090, -10, 1090], color: linear(ground), alpha: 1 }]);
    for (const L of c.layers) {
      this.vec!.draw(gl, rt, L.vec);
      if (L.glyphs.rounded.length + L.glyphs.jp.length > 0) this.glyphs!.draw(gl, rt, SCREEN_POSE, { under: [], glyphs: { rounded: L.glyphs.rounded, jp: L.glyphs.jp }, over: [] }, null);
      if (L.glyphs.hero.length > 0) this.heroLayer!.draw(gl, rt, SCREEN_POSE, { under: [], glyphs: { hero: L.glyphs.hero }, over: [] }, null);
    }
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const c = waveFrame(ctx.frame, this.layout!);
    const rts = this.targets(ctx);
    this.paint(gl, rts.print, c, PALETTES.ukiyoe.washi);
    if (c.downsample) this.paint(gl, rts.game, waveFrame(ctx.frame, this.layout!, 'game'), '#000000');
    const u = this.printMat!.uniforms;
    u.print.value = rts.print.texture;
    u.game.value = rts.game.texture;
    u.lineY.value = c.downsample?.lineY ?? 0;
    u.cell.value = c.downsample?.cell ?? 0;
    u.derez.value = c.downsample?.derez ?? 0;
    const cam: WaveCam = c.cam;
    (u.wood.value as THREE.Vector4).set(cam.fx, cam.fy, cam.zoom, cam.roll);
    this.printQuad!.render(gl, target);
    this.vec!.draw(gl, target, c.top.vec);
  }

  look(frame: number): Look {
    return waveLook(frame);
  }

  temporal(frame: number): Temporal {
    return waveTemporal(frame);
  }

  segment(frame: number): Segment {
    return waveSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.print?.dispose();
    this.game?.dispose();
    this.print = null;
    this.game = null;
    this.vec = null;
  }
}
