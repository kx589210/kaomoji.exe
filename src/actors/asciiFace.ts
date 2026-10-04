// A kaomoji drawn as shaded ASCII art. Each cell of a coverage raster gets a
// brightness from an embossed height field lit from the top left, and a
// character from a ramp. rasterParts() draws the raster with Canvas 2D in the
// browser; shadeFace() is pure, so Node tests pin it.
import { SDF_EDGE, sdfFromAlpha } from '../engine/sdf.ts';

/** Characters from dark to bright. */
export const RAMP = ' .:-=+*#%@';

export type Raster = {
  cols: number;
  rows: number;
  /** Raster pixels per cell, horizontally and vertically (the pixels are square). */
  subX: number;
  subY: number;
  /** One coverage map per character of the kaomoji: (cols·subX) × (rows·subY), row-major, y down. */
  parts: Float32Array[];
};

export type FaceCell = { col: number; row: number; ch: string; lum: number; part: number };

const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Cells covered by the kaomoji (coverage ≥ 0.25). The height field is a
 * plateau with a bevel `bevel` cells wide; its normal, lit by `light`, gives a
 * brightness 0.3–1 and a ramp character. `part` is the character that covers
 * the cell most.
 */
export function shadeFace(r: Raster, opts: { light?: readonly [number, number, number]; bevel?: number } = {}): FaceCell[] {
  const w = r.cols * r.subX;
  const h = r.rows * r.subY;
  const alpha = new Float32Array(w * h);
  for (const p of r.parts) for (let i = 0; i < alpha.length; i++) alpha[i] = Math.max(alpha[i], p[i]);
  const radius = 6 * r.subX;
  const sdf = sdfFromAlpha(alpha, w, h, radius);
  const bevel = (opts.bevel ?? 1.6) * r.subX;
  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) height[i] = smooth(0, bevel, -(SDF_EDGE - sdf[i] / 255) * radius);
  const H = (x: number, y: number) => height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  const [lx, ly, lz] = opts.light ?? [-0.5, 0.6, 0.62];
  const ll = Math.hypot(lx, ly, lz);
  const cells: FaceCell[] = [];
  const area = r.subX * r.subY;
  for (let row = 0; row < r.rows; row++) {
    for (let col = 0; col < r.cols; col++) {
      const x0 = col * r.subX;
      const y0 = row * r.subY;
      let cover = 0;
      const byPart = r.parts.map(() => 0);
      for (let y = y0; y < y0 + r.subY; y++) {
        for (let x = x0; x < x0 + r.subX; x++) {
          cover += alpha[y * w + x];
          r.parts.forEach((p, k) => {
            byPart[k] += p[y * w + x];
          });
        }
      }
      if (cover / area < 0.25) continue;
      const cx = x0 + (r.subX >> 1);
      const cy = y0 + (r.subY >> 1);
      const gx = ((H(cx + 2, cy) - H(cx - 2, cy)) / 4) * bevel;
      const gy = ((H(cx, cy + 2) - H(cx, cy - 2)) / 4) * bevel;
      const nl = Math.hypot(gx, gy, 1);
      const lit = (-gx * lx + gy * ly + lz) / (nl * ll);
      const lum = Math.min(1, 0.3 + 0.7 * Math.max(0, lit));
      const part = byPart.indexOf(Math.max(...byPart));
      cells.push({ col, row, ch: RAMP[Math.min(9, Math.max(1, Math.round(lum * 9)))], lum, part });
    }
  }
  return cells;
}

/** Draws each character of `text` into its own coverage map; the string is centred and scaled to fill `fill` of the grid. Browser only. */
export function rasterParts(text: string, font: (px: number) => string, cols: number, rows: number, subX: number, subY: number, fill = 0.94): Raster {
  const w = cols * subX;
  const h = rows * subY;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable');
  const REF = 200;
  ctx.font = font(REF);
  const m = ctx.measureText(text);
  const px = REF * Math.min((w * fill) / m.width, (h * fill) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
  ctx.font = font(px);
  const box = ctx.measureText(text);
  const left = (w - box.width) / 2;
  const baseline = (h + box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2;
  const chars = [...text];
  const parts = chars.map((ch, i) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillText(ch, left + ctx.measureText(chars.slice(0, i).join('')).width, baseline);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const a = new Float32Array(w * h);
    for (let k = 0; k < a.length; k++) a[k] = rgba[k * 4 + 3] / 255;
    return a;
  });
  return { cols, rows, subX, subY, parts };
}
