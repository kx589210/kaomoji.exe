// Drop 2's last part, drop2 7.1–end − 1: S32 OVERLOAD and T7 on the GPU (build sheet notes/d2build/sheet.md §4.2 rows drop2 7.1–8.4&, §5.9–
// §5.11, §9 H4–H5). The pure picture is src/shots/drop2Overload.ts (drop2 bar 7's reel, the blades, the field, E10, E9) and
// src/shots/drop2Crash.ts (T7); this class copies it to the GPU.
// - The reel: each card is flat content drawn straight into the target; a wipe draws the card it reveals into one card-sized render
//   target and lays it over the old card left of the wipe's edge; the blades lay five cards over the terminal card, each through S27's
//   half-plane regions (the same BSP as the pure regionAt), sheared along its blade. Content time is the honest stutter's
//   (contentTime: the holds and the falling frame rate repeat their source frames exactly).
// - From drop2 8.1 (FIELD_FROM, the drop2 8.1 kick) the picture is drop 2's own character field: the content (the six-world composite,
//   crash-zooming) is rendered at a quarter of the frame into a float target and read back once per content frame, with his silhouette in a second target; the pure
//   buildField turns the cells into glyphs on the terminal grid. E10's guest and drop are drawn over it, crisp, at true time.
// - From the freeze the field is the one read back at drop2 8.3 (with the guest and the splash in it); the pure crash module sorts, rings,
//   drains and condenses it. Every cache is keyed by a content frame and rebuilt the same way in any browser (render.mjs restarts the
//   browser every 240 frames, so any frame may be the first).
// The handed-in world drawers (Drop2Worlds) are not used: every card here is drawn by this part's own pure content.
import * as THREE from 'three';
import { type Raster, shadeFace } from '../actors/asciiFace.ts';
import { linear } from '../engine/color.ts';
import { FlatLayer, type Paper } from '../engine/flatLayer.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { FULLSCREEN_VERT, FullscreenQuad } from '../engine/fullscreen.ts';
import type { Glyph } from '../engine/glyphField.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import type { Blend } from '../engine/shapeField.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../engine/types.ts';
import { CRASH, stutterFrame } from '../score/drop2.ts';
import { PALETTES, T7_GRID } from '../shots/drop2Shared.ts';
import { type Slot, crashGlyphs, crashHero, crashLook, crashPose, crashSegment, crashTemporal, crispFace, glints, sortPlan } from '../shots/drop2Crash.ts';
import {
  type BladeState,
  type Draw,
  FIELD_FROM,
  type FieldCell,
  type FontKey,
  HERO_FACES,
  HERO_WIDTH,
  INK_STRINGS,
  type InkBox,
  MARQUEE,
  OVERLOAD_STRINGS,
  type OverloadLayout,
  SCREEN_POSE,
  type World,
  buildField,
  cardFrame,
  cardPose,
  contentTime,
  fadeContent,
  fieldGlyphs,
  fpsContent,
  freezeOverlayAlpha,
  guestContent,
  heroFaceAt,
  heroField,
  heroScale,
  inkGlyphs,
  inkKey,
  outputOf,
  overloadLook,
  overloadSegment,
  overloadTemporal,
  planAt,
} from '../shots/drop2Overload.ts';
import type { Pose } from '../engine/camera.ts';
import type { Drop2Worlds } from './drop2Worlds.ts';
import { advanceOf } from './swiss.ts';

/** What Drop2Scene hands this part: the shared world drawers (unused: this part draws its own cards). */
export type OverloadKit = { worlds: Drop2Worlds };
/** What the bullet time (src/scenes/drop2Bullet.ts) reads of this part: its atlases and layout, and THE FRAME's frozen field and sort plan. */
export type BulletKit = { atlases: Readonly<Record<FontKey, GlyphAtlas>>; layout: OverloadLayout; field: readonly FieldCell[]; plan: readonly Slot[] };

const FONTS: Readonly<Record<FontKey, (px: number) => string>> = {
  rounded: (px) => `800 ${px}px ${cssStack('rounded')}`,
  jp: (px) => `900 ${px}px ${cssStack('jp')}`,
  mono: (px) => `500 ${px}px ${cssStack('mono')}`,
  display: (px) => `900 ${px}px ${cssStack('display')}`,
  bold: (px) => `800 ${px}px ${cssStack('mono')}`,
};
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
/** The field is read back from content rendered at this size (a quarter of the 1080p frame's pixels). */
const PROBE = { w: 960, h: 540 } as const;
/** Region ids of the compositor, in BLADE_LINES order after the base (terminal = 0). */
const REGION: Readonly<Record<World, number>> = { terminal: 0, interlude: 1, swiss: 2, riso: 3, neon: 4, led: 5, space: -1 };

// ——— Browser-only measuring ————————————————————————————————————————————————————————————————————————————————————————————————————

function canvas2d(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) throw new Error('Canvas 2D is unavailable');
  return g;
}
/** A string's ink box at 1 em, measured as the atlas draws it (textBaseline middle, from the string's start). */
function measureInk(font: (px: number) => string, text: string): InkBox {
  const g = canvas2d(4, 4);
  g.font = font(200);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const m = g.measureText(text);
  return { left: -m.actualBoundingBoxLeft / 200, right: m.actualBoundingBoxRight / 200, up: m.actualBoundingBoxAscent / 200, down: m.actualBoundingBoxDescent / 200 };
}
/** Coverage (0–1, row-major, y down) of `text` drawn with its ink `inkWidth` px wide, centred in a `w` × `h` px canvas at `scale` canvas px per layout px. */
function coverage(font: (px: number) => string, text: string, inkWidth: number, w: number, h: number, scale: number, perChar = false): Float32Array[] {
  const box = measureInk(font, text);
  const em = (inkWidth / (box.right - box.left)) * scale;
  const g = canvas2d(w, h);
  g.font = font(em);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  const start = w / 2 - (em * (box.left + box.right)) / 2;
  const mid = h / 2 - (em * (box.down - box.up)) / 2;
  const list = perChar ? [...text].map((ch, i) => ({ ch, x: start + g.measureText([...text].slice(0, i).join('')).width })) : [{ ch: text, x: start }];
  return list.map(({ ch, x }) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.fillText(ch, x, mid);
    const rgba = g.getImageData(0, 0, w, h).data;
    const a = new Float32Array(w * h);
    for (let k = 0; k < a.length; k++) a[k] = rgba[k * 4 + 3] / 255;
    return a;
  });
}
/** The terminal card's ASCII hero: his rounded face 600 px wide, shaded in 9.6 × 19.2 cells (S27's terminal treatment). */
function asciiHero(): OverloadLayout['ascii'] {
  const cellW = 9.6;
  const cellH = 19.2;
  const subX = 4;
  const subY = 8;
  const cols = Math.ceil((HERO_WIDTH + 4 * cellW) / cellW);
  const rows = Math.ceil(340 / cellH);
  const scale = subX / cellW;
  const parts = coverage(FONTS.rounded, HERO_FACES.base, HERO_WIDTH, cols * subX, rows * subY, scale, true);
  const raster: Raster = { cols, rows, subX, subY, parts };
  return shadeFace(raster).map((c) => ({ dx: (c.col + 0.5) * cellW - (cols * cellW) / 2, dy: (c.row + 0.5) * cellH - (rows * cellH) / 2, ch: c.ch, lum: c.lum, part: c.part }));
}
/** Lit dots of `text` in DotGothic16 on a 12 px lattice: the box average of each dot's 12 × 12 px cell over `threshold`. */
function dots(text: string, inkWidth: number, colsHalf: number, rowsHalf: number, threshold: number): [number, number][] {
  const w = 24 * colsHalf + 12;
  const h = 24 * rowsHalf + 12;
  const [a] = coverage((px) => `400 ${px}px ${cssStack('dot')}`, text, inkWidth, w, h, 1);
  const out: [number, number][] = [];
  for (let j = -rowsHalf; j <= rowsHalf; j++) {
    for (let i = -colsHalf; i <= colsHalf; i++) {
      const cx = w / 2 + 12 * i;
      const cy = h / 2 + 12 * j;
      let s = 0;
      let n = 0;
      for (let y = Math.round(cy - 6); y < Math.round(cy + 6); y++) for (let x = Math.round(cx - 6); x < Math.round(cx + 6); x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        s += a[y * w + x];
        n++;
      }
      if (n > 0 && s / n > threshold) out.push([i, j]);
    }
  }
  return out;
}
/** The LED marquee: its text 8 dots tall, lit dots per (col, row from the top), one period wide. */
function marquee(): OverloadLayout['marquee'] {
  const font = (px: number) => `400 ${px}px ${cssStack('dot')}`;
  const g = canvas2d(4, 4);
  g.font = font(96);
  const wide = g.measureText(MARQUEE).width;
  const cols = Math.ceil(wide / 12) + 4;
  const box = measureInk(font, MARQUEE);
  const lit = dots(MARQUEE, (box.right - box.left) * 96, Math.ceil(cols / 2), 4, 0.33).map(([i, j]) => [i + Math.ceil(cols / 2), j + 4] as [number, number]);
  return { width: cols + 2, lit: lit.filter(([, r]) => r >= 0 && r < 8) };
}

// ——— The compositor ——————————————————————————————————————————————————————————————————————————————————————————————————————————

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D tex;
  uniform float mode;      // 0: left of the edge; 1: one region of the blades
  uniform float edge;      // layout px
  uniform float want;      // the region drawn
  uniform vec2 from[5];
  uniform vec2 dir[5];
  uniform vec2 nrm[5];
  uniform float lim[5];
  uniform float on[5];
  uniform vec2 shift;      // layout px the region's piece is sheared by
  varying vec2 vUv;
  bool inside(int k, vec2 p) {
    if (on[k] < 0.5) return false;
    vec2 d = p - from[k];
    float along = dot(d, dir[k]);
    return dot(d, nrm[k]) > 0.0 && along < lim[k] && along > -1.0;
  }
  float region(vec2 p) {
    if (inside(0, p)) return inside(2, p) ? 3.0 : inside(4, p) ? 5.0 : 1.0;
    return inside(1, p) ? 2.0 : inside(3, p) ? 4.0 : 0.0;
  }
  void main() {
    vec2 p = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
    if (mode < 0.5) {
      if (p.x >= edge) discard;
      gl_FragColor = texture2D(tex, vUv);
      return;
    }
    if (abs(region(p) - want) > 0.5) discard;
    vec2 q = p - shift;
    gl_FragColor = texture2D(tex, vec2(q.x / 1920.0, 1.0 - q.y / 1080.0));
  }`;

export class Drop2Overload implements Renderable {
  readonly kit: OverloadKit;
  private layers: Record<Blend, FlatLayer> | null = null;
  private field: FlatLayer | null = null;
  private overlay: FlatLayer | null = null;
  private layout: OverloadLayout | null = null;
  private size = { width: 1920, height: 1080 };
  private cardRT: THREE.WebGLRenderTarget | null = null;
  private probe: { content: THREE.WebGLRenderTarget; tmp: THREE.WebGLRenderTarget; hero: THREE.WebGLRenderTarget } | null = null;
  private comp: { quad: FullscreenQuad; mat: THREE.ShaderMaterial } | null = null;
  private readonly owned: { dispose(): void }[] = [];
  private readonly glyphs: Glyph[] = [];
  /** The field per content frame (drop2 8.1–8.2), and the frozen one with its sort plan (T7): deterministic caches. */
  private readonly fields = new Map<number, FieldCell[]>();
  private frozen: { field: FieldCell[]; plan: Slot[] } | null = null;
  private atlases: Readonly<Record<FontKey, GlyphAtlas>> | null = null;

  constructor(kit: OverloadKit) {
    this.kit = kit;
  }

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    this.size = size;
    const atlas = (k: FontKey, fontPx: number, radius: number) => buildGlyphAtlas(chars(OVERLOAD_STRINGS[k]), FONTS[k], { fontPx, radius });
    const atlases = { rounded: atlas('rounded', 160, 24), jp: atlas('jp', 160, 20), mono: atlas('mono', 96, 12), display: atlas('display', 160, 20), bold: atlas('bold', 96, 12) };
    this.atlases = atlases;
    const aspect = size.width / size.height;
    const make = (blend: Blend) => new FlatLayer({ atlases, blend, aspect, shapes: 8192, glyphs: 8192 });
    this.layers = { normal: make('normal'), add: make('add'), multiply: make('multiply') };
    // Draw order inside the field: the type (mono), then his face's fill and the crisp face (rounded), then his strokes (bold) on top.
    this.field = new FlatLayer({ atlases: { mono: atlases.mono, rounded: atlases.rounded, bold: atlases.bold }, blend: 'add', aspect, shapes: 2048, glyphs: 8192 });
    this.overlay = new FlatLayer({ atlases: { mono: atlases.mono }, blend: 'normal', aspect, shapes: 16, glyphs: 256 });
    const ink = new Map<string, InkBox>(INK_STRINGS.map(([k, t]) => [inkKey(k, t), measureInk(FONTS[k], t)]));
    this.layout = {
      advance: { rounded: advanceOf(atlases.rounded), jp: advanceOf(atlases.jp), mono: advanceOf(atlases.mono), display: advanceOf(atlases.display), bold: advanceOf(atlases.bold) },
      ink,
      ascii: asciiHero(),
      led: dots(HERO_FACES.base, HERO_WIDTH, 30, 15, 0.38),
      marquee: marquee(),
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null },
        mode: { value: 0 },
        edge: { value: 0 },
        want: { value: 0 },
        from: { value: Array.from({ length: 5 }, () => new THREE.Vector2()) },
        dir: { value: Array.from({ length: 5 }, () => new THREE.Vector2()) },
        nrm: { value: Array.from({ length: 5 }, () => new THREE.Vector2()) },
        lim: { value: [0, 0, 0, 0, 0] },
        on: { value: [0, 0, 0, 0, 0] },
        shift: { value: new THREE.Vector2() },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
    });
    this.comp = { quad: new FullscreenQuad(mat), mat };
    this.owned.push(...Object.values(atlases).map((a) => a.texture), ...Object.values(this.layers), this.field, this.overlay, this.comp.quad);
  }

  // ——— Drawing ————————————————————————————————————————————————————————————————————————————————————————————————————————————

  private cardTarget(): THREE.WebGLRenderTarget {
    if (!this.cardRT) {
      this.cardRT = new THREE.WebGLRenderTarget(this.size.width, this.size.height, { type: THREE.HalfFloatType, depthBuffer: false });
      this.owned.push(this.cardRT);
    }
    return this.cardRT;
  }

  private probes(): NonNullable<Drop2Overload['probe']> {
    if (!this.probe) {
      const rt = () => new THREE.WebGLRenderTarget(PROBE.w, PROBE.h, { type: THREE.FloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      this.probe = { content: rt(), tmp: rt(), hero: rt() };
      this.owned.push(this.probe.content, this.probe.tmp, this.probe.hero);
    }
    return this.probe;
  }

  /** One card into `target`: its ground, then its draws (the card's camera or the screen's); `cam` is the camera's instant. */
  private drawCard(gl: THREE.WebGLRenderer, world: World, c: number, target: THREE.WebGLRenderTarget, pose: Pose, fieldMode = false, cam = c): void {
    const frame = cardFrame(world, c, this.layout!, fieldMode, cam);
    const grain = world === 'riso' ? 0.035 : world === 'swiss' ? 0.02 : 0;
    let paper: Paper | null = { color: frame.ground, grain };
    for (const d of frame.draws) {
      this.layers![d.blend].draw(gl, target, d.cam === 'card' ? pose : SCREEN_POSE, d.content, paper);
      paper = null;
    }
    if (paper) this.layers!.normal.draw(gl, target, SCREEN_POSE, { under: [], glyphs: {}, over: [] }, paper);
  }

  private drawFx(gl: THREE.WebGLRenderer, fx: readonly Draw[], target: THREE.WebGLRenderTarget, pose: Pose): void {
    for (const d of fx) this.layers![d.blend].draw(gl, target, d.cam === 'card' ? pose : SCREEN_POSE, d.content, null);
  }

  /** Lays `src` over `target`: left of `edge` (mode 0), or the blades' region `want`, sheared (mode 1). */
  private composite(gl: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, target: THREE.WebGLRenderTarget, o: { edge?: number; want?: number; blades?: readonly BladeState[]; shift?: readonly [number, number] }): void {
    const u = this.comp!.mat.uniforms;
    u.tex.value = src.texture;
    u.mode.value = o.want === undefined ? 0 : 1;
    u.edge.value = o.edge ?? 0;
    u.want.value = o.want ?? 0;
    (u.shift.value as THREE.Vector2).set(...(o.shift ?? [0, 0]));
    if (o.blades) {
      o.blades.forEach((b, k) => {
        (u.from.value as THREE.Vector2[])[k].set(b.from[0], b.from[1]);
        (u.dir.value as THREE.Vector2[])[k].set(b.dir[0], b.dir[1]);
        (u.nrm.value as THREE.Vector2[])[k].set(b.normal[0], b.normal[1]);
        (u.lim.value as number[])[k] = Math.min(b.tip, b.len);
        (u.on.value as number[])[k] = b.age >= 0 ? 1 : 0;
      });
    }
    const auto = gl.autoClear;
    gl.autoClear = false;
    this.comp!.quad.render(gl, target);
    gl.autoClear = auto;
  }

  /** An instant of the reel (content time `c`, the camera at `cam`) into `target` at full size; `scratch` holds a card being laid over another. */
  private drawReel(gl: THREE.WebGLRenderer, c: number, target: THREE.WebGLRenderTarget, scratch: THREE.WebGLRenderTarget, fieldMode = false, cam = c): void {
    const plan = planAt(c);
    const pose = cardPose(cam);
    if (plan.kind === 'card') this.drawCard(gl, plan.world, c, target, pose, fieldMode, cam);
    else if (plan.kind === 'edge') {
      this.drawCard(gl, plan.under, c, target, pose, fieldMode, cam);
      this.drawCard(gl, plan.over, c, scratch, pose, fieldMode, cam);
      this.composite(gl, scratch, target, { edge: plan.edge });
    } else {
      this.drawCard(gl, plan.base, c, target, pose, fieldMode, cam);
      for (const b of plan.blades) {
        if (b.age < 0) continue;
        this.drawCard(gl, b.world, c, scratch, pose, fieldMode, cam);
        this.composite(gl, scratch, target, { want: REGION[b.world], blades: plan.blades, shift: [b.dir[0] * b.shear, b.dir[1] * b.shear] });
      }
    }
    this.drawFx(gl, plan.fx, target, pose);
  }

  /** Drop 2's own field at content frame `c`: the composite rendered small and read back, his silhouette beside it (cached per frame). */
  private fieldAt(gl: THREE.WebGLRenderer, c: number): FieldCell[] {
    const hit = this.fields.get(c);
    if (hit) return hit;
    const P = this.probes();
    const L = this.layout!;
    this.drawReel(gl, c, P.content, P.tmp, true);
    if (c >= CRASH) {
      // The frozen field reads the guest as v04 drew him (§1.3 G: the infected guest and his hat are the crisp overlay's), so the sort and
      // THE FRAME stay v04's to the byte.
      const g = guestContent(c, L, { v04: true });
      this.layers!.normal.draw(gl, P.content, SCREEN_POSE, g.glass, null);
      this.layers!.add.draw(gl, P.content, SCREEN_POSE, g.light, null);
    }
    const { s } = heroScale(c);
    const white = (): readonly [number, number, number] => [1, 1, 1];
    const mask = inkGlyphs(L, 'rounded', HERO_FACES[heroFaceAt(c)], { cx: 960, cy: 540, width: HERO_WIDTH * s, color: white });
    this.layers!.normal.draw(gl, P.hero, SCREEN_POSE, { under: [], glyphs: { rounded: mask }, over: [] }, { color: [0, 0, 0], grain: 0 });
    const rgb = new Float32Array(PROBE.w * PROBE.h * 4);
    const hero = new Float32Array(PROBE.w * PROBE.h * 4);
    gl.readRenderTargetPixels(P.content, 0, 0, PROBE.w, PROBE.h, rgb);
    gl.readRenderTargetPixels(P.hero, 0, 0, PROBE.w, PROBE.h, hero);
    // A cell's box: the probe pixels whose centres fall inside it (layout → probe px; GL rows run bottom-up).
    const box = (col: number, row: number, buf: Float32Array, ch: number): number => {
      const x0 = T7_GRID.left + col * T7_GRID.cellW;
      const y0 = T7_GRID.top + row * T7_GRID.cellH;
      const px0 = Math.max(0, Math.ceil((x0 * PROBE.w) / 1920 - 0.5));
      const px1 = Math.min(PROBE.w - 1, Math.floor(((x0 + T7_GRID.cellW) * PROBE.w) / 1920 - 0.5));
      const py0 = Math.max(0, Math.ceil((y0 * PROBE.h) / 1080 - 0.5));
      const py1 = Math.min(PROBE.h - 1, Math.floor(((y0 + T7_GRID.cellH) * PROBE.h) / 1080 - 0.5));
      let sum = 0;
      let n = 0;
      for (let py = py0; py <= py1; py++) for (let px = px0; px <= px1; px++) {
        sum += buf[((PROBE.h - 1 - py) * PROBE.w + px) * 4 + ch];
        n++;
      }
      return n > 0 ? sum / n : 0;
    };
    const cells = buildField(c, {
      rgb: (col, row) => [Math.max(0, box(col, row, rgb, 0)), Math.max(0, box(col, row, rgb, 1)), Math.max(0, box(col, row, rgb, 2))],
      hero: (col, row) => box(col, row, hero, 0),
    });
    this.fields.set(c, cells);
    return cells;
  }

  /** THE FRAME's frozen field (read back at the freeze, cached: the same in any browser) and its sort plan. */
  private frozenFrame(gl: THREE.WebGLRenderer): { field: FieldCell[]; plan: Slot[] } {
    if (!this.frozen) {
      const field = this.fieldAt(gl, CRASH);
      this.frozen = { field, plan: sortPlan(field) };
    }
    return this.frozen;
  }

  /** The bullet time's kit (after init): this part's atlases and layout, and THE FRAME's frozen field and plan (built on first call). */
  bulletKit(gl: THREE.WebGLRenderer): BulletKit {
    if (!this.atlases || !this.layout) throw new Error('drop2Overload: bulletKit() before init()');
    const f = this.frozenFrame(gl);
    return { atlases: this.atlases, layout: this.layout, field: f.field, plan: f.plan };
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const out = outputOf(ctx.frame);
    const L = this.layout!;
    const ground: Paper = { color: linear(PALETTES.terminal.ground), grain: 0 };
    if (out >= CRASH) {
      const frozen = this.frozenFrame(gl);
      const n = crashGlyphs(ctx.frame, frozen.field, frozen.plan, this.glyphs);
      const hero = crashHero(ctx.frame, frozen.field, L);
      const pose = crashPose(ctx.cam);
      this.field!.draw(gl, target, pose, { under: hero.under, glyphs: { mono: this.glyphs.slice(0, n), rounded: hero.rounded, bold: hero.bold }, over: glints(ctx.frame, frozen.field) }, ground);
      // WP6 (v07): the crisp (×ω×) over the field in the normal blend, as the ending draws him on outro 1.1 — added onto his blue spot
      // (drop2Crash.ts seamSpot) his amber washed out to a pale peach and lost its colour across the seam.
      const crisp = crispFace(ctx.frame, L);
      if (crisp.length > 0) this.layers!.normal.draw(gl, target, pose, { under: [], glyphs: { rounded: crisp }, over: [] }, null);
      // E10's payoff: the guest, his glass and the splash, stopped dead in the frame the drop landed on — crisp, exempt from the CRT's
      // slip — held while the sort starts round them, then dissolving into it (their own cells are in the frozen field).
      const a = freezeOverlayAlpha(out);
      if (a > 0) {
        const g = guestContent(CRASH, L);
        this.layers!.normal.draw(gl, target, pose, fadeContent(g.glass, a), null);
        this.layers!.add.draw(gl, target, pose, fadeContent(g.light, a), null);
      }
      return;
    }
    if (out >= FIELD_FROM) {
      const c = stutterFrame(out);
      const cells = this.fieldAt(gl, c);
      const n = fieldGlyphs(cells, this.glyphs);
      const hero = heroField(cells, c, L);
      this.field!.draw(gl, target, SCREEN_POSE, { under: hero.under, glyphs: { mono: this.glyphs.slice(0, n), rounded: hero.rounded, bold: hero.bold }, over: [] }, ground);
      const g = guestContent(ctx.frame, L);
      this.layers!.normal.draw(gl, target, SCREEN_POSE, g.glass, null);
      this.layers!.add.draw(gl, target, SCREEN_POSE, g.light, null);
      return;
    }
    // The content at the honest stutter's time; the camera (and his scale) at true time, so held frames still move.
    this.drawReel(gl, contentTime(ctx.frame), target, this.cardTarget(), false, ctx.cam);
  }

  /** E9's honest fps line, fixed to the screen over the finished frame. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    this.overlay!.draw(gl, target, SCREEN_POSE, fpsContent(frame, this.layout!.advance.mono), null);
  }

  look(frame: number): Look {
    return frame >= CRASH ? crashLook(frame) : overloadLook(frame);
  }

  temporal(frame: number): Temporal {
    return frame >= CRASH ? crashTemporal(frame) : overloadTemporal(frame);
  }

  segment(frame: number): Segment {
    return frame >= CRASH ? crashSegment(frame) : overloadSegment(frame);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.fields.clear();
    this.frozen = null;
    this.atlases = null;
  }
}
