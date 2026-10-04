// Break bar 6, GRAPH (new): the graph-editor rollercoaster — the part 'graph' of the break scene (src/scenes/break.ts), break 6.1 to the
// whip's hidden cut (6.4a + 3). Build sheet notes/bid2/break-sheet2.md §3 "Break 6 · GRAPH"; the pure model is
// src/shots/breakGraph.ts and what it draws src/shots/breakGraphDraw.ts — this class owns the GPU objects and draws, back to front:
//   1. the paper and the 16ths' graph paper, at ×0.9 (a little behind the track)            — FlatLayer `back`
//   2. the beats' graph paper, the supports, the rails and ties, the keys (handles, icons, hex chips); the hook — FlatLayer `world`
//   3. the bottoms' shockwaves and sparks; C7's flung violet panel and its streaks                 — FlatLayer `fx`
//   4. the train of his four copies                                                               — FlatLayer `train`
//   5. k10's handles stretched into a V, his car, him, T9                                          — FlatLayer `hero`
//   6. the ratchet's clacks, the segment labels                                                    — FlatLayer `top`
//   7. the click's marquee and its dim (6.4e → 6.4&), the editor's chrome and the red cursor, fixed to the screen at the inverse of the
//      rig's punch (the world punches inside the upright window; the window does not)            — FlatLayer `chrome`
// and in screenOverlay, once per output frame and fixed to the screen: the selection carried across C6 (the red marquee and T8).
// Each group is drawn at its own instant (graphDraw, groupAt): the track (back, world, top) and him (hero) on their short shutters
// (TRACK_SHUTTER, HERO_SHUTTER: the frame's sub-frames squeezed about the output instant; review round 2, G-1) or one sharp instant
// where groupShutter says so — their content and their camera at that instant, the rig's punch at that instant's too — so they stay
// legible without printing stop-motion; the sparks and the train keep the frame's shutter but on the snaps (SNAPS: the ratchet's
// notches, the click, the yank), the panels always.
// Flat layers draw no polygons, so the ⧗ icons, the playhead's pentagon and the cursor are triangle fans (PolyField) placed in the
// layers' own scenes between their shapes and their type (renderOrder 0.5) or over everything (9.5).
// Constructible in Node (tests build the break scene): no GL before init().
import * as THREE from 'three';
import { frontal } from '../engine/camera.ts';
import { cssStack } from '../engine/fonts.ts';
import { loadFonts } from '../engine/fontLoader.ts';
import { type GlyphAtlas, buildGlyphAtlas } from '../engine/glyphAtlas.ts';
import { FlatLayer, type Paper } from '../engine/flatLayer.ts';
import type { Segment, Temporal } from '../engine/temporal.ts';
import type { Advance } from '../engine/typeset.ts';
import type { FrameContext, Look } from '../engine/types.ts';
import { rigAt } from '../score/energy.ts';
import { BREAK_PALETTE, FOV, FRONT, camPose } from '../shots/breakShared.ts';
import { graphLook, graphSegment, graphTemporal } from '../shots/breakGraph.ts';
import { type GraphCam } from '../shots/breakGraph.ts';
import { GRAPH_HERO_STRINGS, GRAPH_MONO_STRINGS, type GraphLayer, type Poly, graphDraw, graphOverlay, setGraphAdvance, setT8Advance } from '../shots/breakGraphDraw.ts';
import type { BreakPart } from './break.ts';

const SCREEN = frontal(FRONT, 0, 0, FOV);
const chars = (texts: readonly string[]): string[] => [...new Set(texts.flatMap((t) => [...t]))].filter((c) => c.trim() !== '');
const advanceOf =
  (atlas: GlyphAtlas): Advance =>
  (ch) =>
    atlas.entries.get(ch)?.advance ?? 0.28;

const POLY_VERT = /* glsl */ `
attribute vec4 aColor;
varying vec4 vColor;
void main() {
  vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const POLY_FRAG = /* glsl */ `
varying vec4 vColor;
void main() {
  if (vColor.a <= 0.0) discard;
  gl_FragColor = vColor;
}`;

/** Filled convex polygons (triangle fans, one colour each) on the flat world's plane, drawn inside a FlatLayer's scene at `order`. */
class PolyField {
  readonly mesh: THREE.Mesh;
  private readonly geo = new THREE.BufferGeometry();
  private readonly pos: THREE.BufferAttribute;
  private readonly col: THREE.BufferAttribute;
  private readonly capacity: number;
  private readonly material: THREE.ShaderMaterial;

  constructor(vertices: number, order: number) {
    this.capacity = vertices;
    this.pos = new THREE.BufferAttribute(new Float32Array(vertices * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(vertices * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('position', this.pos);
    this.geo.setAttribute('aColor', this.col);
    this.material = new THREE.ShaderMaterial({ vertexShader: POLY_VERT, fragmentShader: POLY_FRAG, blending: THREE.NormalBlending, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
  }

  set(polys: readonly Poly[]): void {
    const p = this.pos.array as Float32Array;
    const c = this.col.array as Float32Array;
    let n = 0;
    for (const q of polys) {
      for (let i = 1; i + 1 < q.pts.length; i++) {
        if (n + 3 > this.capacity) throw new Error(`poly field is full (${this.capacity})`);
        for (const v of [q.pts[0], q.pts[i], q.pts[i + 1]]) {
          p.set([v[0], v[1], 0], 3 * n);
          c.set([q.color[0], q.color[1], q.color[2], q.alpha ?? 1], 4 * n);
          n++;
        }
      }
    }
    this.geo.setDrawRange(0, n);
    this.mesh.visible = n > 0;
    for (const [a, k] of [[this.pos, 3], [this.col, 4]] as const) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, Math.max(1, n) * k);
      a.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
  }
}

/** A FlatLayer with polygon fields under its type and over everything. */
type Layer = { flat: FlatLayer; under: PolyField; over: PolyField };
type LayerName = 'back' | 'world' | 'fx' | 'train' | 'hero' | 'top' | 'chrome' | 'overlay';
/**
 * Each layer's capacities: shapes (under its type), glyphs (per atlas), polygons (per field, under and over). A field that overflows
 * throws mid-render, so tests/breakGraph.test.ts counts every instant's content against these.
 */
export const GRAPH_CAPACITY: Readonly<Record<LayerName, { shapes: number; glyphs: number; polys: number }>> = {
  back: { shapes: 256, glyphs: 0, polys: 64 },
  world: { shapes: 4096, glyphs: 128, polys: 256 },
  fx: { shapes: 512, glyphs: 128, polys: 0 },
  train: { shapes: 64, glyphs: 128, polys: 64 },
  hero: { shapes: 64, glyphs: 64, polys: 64 },
  top: { shapes: 512, glyphs: 256, polys: 64 },
  chrome: { shapes: 1024, glyphs: 512, polys: 256 },
  overlay: { shapes: 1024, glyphs: 128, polys: 64 },
};

export class BreakGraph implements BreakPart {
  private layers: Record<LayerName, Layer> | null = null;
  private readonly owned: { dispose(): void }[] = [];

  async init(_gl: THREE.WebGLRenderer, size: { width: number; height: number }): Promise<void> {
    await loadFonts();
    const hero = buildGlyphAtlas(chars(GRAPH_HERO_STRINGS), (px) => `800 ${px}px ${cssStack('rounded')}`, { fontPx: 160, radius: 20, size: 2048 });
    const mono = buildGlyphAtlas(chars(GRAPH_MONO_STRINGS), (px) => `700 ${px}px ${cssStack('mono')}`, { fontPx: 96, radius: 14, size: 2048 });
    this.owned.push(hero.texture, mono.texture);
    setGraphAdvance({ hero: advanceOf(hero), mono: advanceOf(mono) });
    setT8Advance({ a: advanceOf(mono)('a'), zero: advanceOf(mono)('0') });
    const aspect = size.width / size.height;
    const make = (name: LayerName, atlases: Readonly<Record<string, GlyphAtlas>>): Layer => {
      const { shapes, glyphs, polys } = GRAPH_CAPACITY[name];
      const flat = new FlatLayer({ atlases, blend: 'normal', aspect, shapes, glyphs });
      const under = new PolyField(polys * 3, 0.5);
      const over = new PolyField(polys * 3, 9.5);
      flat.scene.add(under.mesh, over.mesh);
      this.owned.push(flat, under, over);
      return { flat, under, over };
    };
    this.layers = {
      back: make('back', {}),
      world: make('world', { mono }),
      fx: make('fx', { mono }),
      train: make('train', { hero }),
      hero: make('hero', { hero, mono }),
      top: make('top', { mono }),
      chrome: make('chrome', { mono }),
      overlay: make('overlay', { mono }),
    };
  }

  private draw(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, L: Layer, pose: ReturnType<typeof camPose>, c: GraphLayer, paper: Paper | null): void {
    L.under.set(c.polys);
    L.over.set(c.polysOver);
    L.flat.draw(gl, target, pose, { under: c.under, glyphs: c.glyphs, over: c.over }, paper);
  }

  render(gl: THREE.WebGLRenderer, ctx: FrameContext, target: THREE.WebGLRenderTarget): void {
    const L = this.layers!;
    const fr = graphDraw(ctx.frame);
    const punch = rigAt(ctx.cam).zoom;
    // A group drawn at a sharp instant takes that instant's punch too: the pipeline zooms every sub-frame by its own (about the frame's
    // centre, as the camera's zoom is), so the group is drawn at the ratio and lands exactly where the output frame's punch puts it.
    const at = (c: GraphCam, instant: number, k = 1) => camPose({ ...c, zoom: c.zoom * k * (instant === ctx.frame ? 1 : rigAt(instant).zoom / punch) });
    const track = at(fr.cams.track, fr.instant.track);
    const world = at(fr.cams.world, fr.instant.world);
    this.draw(gl, target, L.back, at(fr.cams.track, fr.instant.track, 0.9), fr.back, { color: BREAK_PALETTE.cream, grain: 0 });
    this.draw(gl, target, L.world, track, fr.world, null);
    this.draw(gl, target, L.fx, world, fr.fx, null);
    this.draw(gl, target, L.train, world, fr.train, null);
    this.draw(gl, target, L.hero, at(fr.cams.hero, fr.instant.hero), fr.hero, null);
    this.draw(gl, target, L.top, track, fr.top, null);
    // The chrome is the editor's window: the rig's punch zooms the finished frame, so the window is drawn at its inverse and stays put.
    this.draw(gl, target, L.chrome, frontal(FRONT * rigAt(ctx.cam).zoom, 0, 0, FOV), fr.chrome, null);
  }

  /** The selection carried across C6 (the red marquee, the dim, T8), fixed to the screen, until it has folded away. */
  screenOverlay(gl: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget, frame: number): void {
    const o = graphOverlay(frame);
    if (o) this.draw(gl, target, this.layers!.overlay, SCREEN, o, null);
  }

  look(): Look {
    return graphLook();
  }

  temporal(frame: number): Temporal {
    return graphTemporal(frame);
  }

  segment(): Segment {
    return graphSegment();
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
    this.layers = null;
  }
}
