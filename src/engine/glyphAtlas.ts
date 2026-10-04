import * as THREE from 'three';
import { deepestPoint, sdfFromAlpha } from './sdf.ts';

export type AtlasEntry = {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  aspect: number;
  /** Advance width of the string in ems (for typesetting characters one by one). */
  advance: number;
  /** A counter entry (see counterKey): the largest 16:9 window inside the hole — its centre (ems from the quad's centre, y up) and half its height (ems). */
  window?: { x: number; y: number; half: number };
};

/** Key of the atlas entry that is the counter of `s` — the hole its strokes enclose (the inside of an o, a ロ, a ▽) — as a filled shape. Drawn inverted at the glyph's place and size, it is a sheet with that hole cut through it. */
export const counterKey = (s: string): string => `counter:${s}`;

/** The counter of a rasterized glyph: what neither is ink nor connects to the cell's border. */
function counterOf(alpha: Float32Array, w: number, h: number): Float32Array {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const reach = (i: number) => {
    if (outside[i] === 0 && alpha[i] < 0.5) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    reach(x);
    reach((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    reach(y * w);
    reach(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    if (x > 0) reach(i - 1);
    if (x < w - 1) reach(i + 1);
    if (i >= w) reach(i - w);
    if (i < w * (h - 1)) reach(i + w);
  }
  const hole = new Float32Array(w * h);
  for (let i = 0; i < hole.length; i++) hole[i] = outside[i] === 0 && alpha[i] < 0.5 ? 1 : 0;
  return hole;
}

/** The largest 16:9 rectangle inside `mask` (1 = inside): its centre and half-height, in mask pixels. */
function largestWindow(mask: Float32Array, w: number, h: number): { cx: number; cy: number; half: number } {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) sum[(y + 1) * (w + 1) + x + 1] = mask[y * w + x] + sum[y * (w + 1) + x + 1] + sum[(y + 1) * (w + 1) + x] - sum[y * (w + 1) + x];
  const full = (x0: number, y0: number, x1: number, y1: number): boolean => {
    if (x0 < 0 || y0 < 0 || x1 > w || y1 > h) return false;
    const s = sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0];
    return s >= (x1 - x0) * (y1 - y0);
  };
  let best = { cx: w / 2, cy: h / 2, half: 0 };
  for (let cy = 1; cy < h; cy += 2) {
    for (let cx = 1; cx < w; cx += 2) {
      if (!mask[cy * w + cx]) continue;
      let lo = best.half;
      if (!full(Math.floor(cx - (16 / 9) * lo), Math.floor(cy - lo), Math.ceil(cx + (16 / 9) * lo), Math.ceil(cy + lo))) continue;
      let hi = h / 2;
      while (hi - lo > 0.5) {
        const t = (lo + hi) / 2;
        if (full(Math.floor(cx - (16 / 9) * t), Math.floor(cy - t), Math.ceil(cx + (16 / 9) * t), Math.ceil(cy + t))) lo = t;
        else hi = t;
      }
      if (lo > best.half) best = { cx, cy, half: lo };
    }
  }
  return best;
}
export type GlyphAtlas = {
  texture: THREE.DataTexture;
  entries: Map<string, AtlasEntry>;
  /** Font size the glyphs were rasterized at, in atlas pixels. */
  fontPx: number;
  /** Height of every entry in atlas pixels (one quad height). */
  cellH: number;
  /** SDF radius in atlas pixels. */
  radius: number;
};

/**
 * Rasterizes each string once with Canvas 2D at `supersample`× the atlas
 * resolution, converts it to a signed distance field at atlas resolution and
 * packs it into one R8 texture. Rows are stored top-down: v0 is the top of an
 * entry, v1 its bottom.
 */
export function buildGlyphAtlas(
  strings: readonly string[],
  font: (px: number) => string,
  opts: { fontPx?: number; radius?: number; size?: number; supersample?: number; counters?: readonly string[]; after?: readonly string[] } = {},
): GlyphAtlas {
  const fontPx = opts.fontPx ?? 96;
  const radius = opts.radius ?? 12;
  const size = opts.size ?? 4096;
  const k = opts.supersample ?? 4;
  const pad = radius + 2;
  const cellH = Math.ceil(fontPx * 1.35) + pad * 2;
  const data = new Uint8Array(size * size);
  const entries = new Map<string, AtlasEntry>();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  let x = 0;
  let y = 0;
  // `after`: strings packed after the counters (added to an approved atlas, so none of its cells moves).
  const jobs = [
    ...strings.map((s) => ({ key: s, s, counter: false })),
    ...(opts.counters ?? []).map((s) => ({ key: counterKey(s), s, counter: true })),
    ...(opts.after ?? []).map((s) => ({ key: s, s, counter: false })),
  ];
  for (const { key, s, counter } of jobs) {
    if (entries.has(key)) continue;
    ctx.font = font(fontPx);
    const advance = ctx.measureText(s).width;
    const w = Math.ceil(advance) + pad * 2;
    if (x + w > size) {
      x = 0;
      y += cellH;
    }
    if (y + cellH > size) throw new Error('glyph atlas is full');
    canvas.width = w * k;
    canvas.height = cellH * k;
    ctx.font = font(fontPx * k);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(s, pad * k, (cellH * k) / 2);
    const rgba = ctx.getImageData(0, 0, w * k, cellH * k).data;
    let alpha: Float32Array = new Float32Array(w * k * cellH * k);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3] / 255;
    let window: AtlasEntry['window'];
    if (counter) {
      alpha = counterOf(alpha, w * k, cellH * k);
      const best = largestWindow(alpha, w * k, cellH * k);
      if (best.half === 0) throw new Error(`"${s}" encloses no counter`);
      window = { x: (best.cx - (w * k) / 2) / (fontPx * k), y: ((cellH * k) / 2 - best.cy) / (fontPx * k), half: best.half / (fontPx * k) };
    }
    const sdf = sdfFromAlpha(alpha, w, cellH, radius, k);
    for (let row = 0; row < cellH; row++) data.set(sdf.subarray(row * w, (row + 1) * w), (y + row) * size + x);
    entries.set(key, { u0: x / size, v0: y / size, u1: (x + w) / size, v1: (y + cellH) / size, aspect: w / cellH, advance: advance / fontPx, ...(window ? { window } : {}) });
    x += w;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, entries, fontPx, cellH, radius };
}

/** The point deepest inside the glyph of `s`, in ems from its quad's centre, y up (the camera of S10 flies through it). */
export function deepestInside(atlas: GlyphAtlas, s: string): [number, number] {
  const e = atlas.entries.get(s);
  if (!e) throw new Error(`"${s}" is not in the atlas`);
  const size = atlas.texture.image.width;
  const x0 = Math.round(e.u0 * size);
  const w = Math.round((e.u1 - e.u0) * size);
  const [x, y] = deepestPoint(atlas.texture.image.data as Uint8Array, size, x0, Math.round(e.v0 * size), w, atlas.cellH);
  return [(x - w / 2) / atlas.fontPx, (atlas.cellH / 2 - y) / atlas.fontPx];
}
