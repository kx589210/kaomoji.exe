// Signed distance fields from anti-aliased coverage, using the exact
// Euclidean distance transform of Felzenszwalb & Huttenlocher (2012).
const INF = 1e20;

/** Coverage value (0–1) of the glyph edge in the encoded field. */
export const SDF_EDGE = 0.75;

function edt1d(grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Uint16Array, z: Float64Array): void {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const d = q - r;
    grid[offset + q * stride] = f[r] + d * d;
  }
}

function edt2d(grid: Float64Array, width: number, height: number): void {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const v = new Uint16Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < width; x++) edt1d(grid, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) edt1d(grid, y * width, 1, width, f, v, z);
}

/**
 * Encodes distance to the coverage edge: 255 deep inside, SDF_EDGE×255 on the
 * edge, falling to 0 outside (`radius` sets the scale). With `supersample` k,
 * `alpha` is k× the output size in each direction: distances are computed at
 * that resolution and averaged over each k×k block. The sub-pixel offset of an
 * anti-aliased pixel (0.5 − coverage) is only exact for linear coverage of a
 * straight edge; browsers bend text coverage with a contrast curve, and a
 * magnified glyph then shows scallops one atlas texel apart. Supersampling
 * shrinks that error k times.
 */
export function sdfFromAlpha(alpha: Float32Array, width: number, height: number, radius: number, supersample = 1): Uint8ClampedArray {
  const k = Math.max(1, Math.round(supersample));
  const hw = width * k;
  const hh = height * k;
  if (alpha.length !== hw * hh) throw new Error(`coverage is ${alpha.length} values, want ${hw}×${hh}`);
  const outer = new Float64Array(hw * hh);
  const inner = new Float64Array(hw * hh);
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i];
    if (a >= 1) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const d = 0.5 - a;
      outer[i] = d > 0 ? d * d : 0;
      inner[i] = d < 0 ? d * d : 0;
    }
  }
  edt2d(outer, hw, hh);
  edt2d(inner, hw, hh);
  const out = new Uint8ClampedArray(width * height);
  const cutoff = 1 - SDF_EDGE;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let j = 0; j < k; j++) {
        for (let i = 0; i < k; i++) {
          const s = (y * k + j) * hw + x * k + i;
          sum += Math.sqrt(outer[s]) - Math.sqrt(inner[s]);
        }
      }
      // Mean over the block, converted from supersampled to output pixels.
      const d = sum / (k * k * k);
      out[y * width + x] = Math.round(255 - 255 * (d / radius + cutoff));
    }
  }
  return out;
}

/** The pixel of a block of an SDF image with the largest value (deepest inside the shape), as the [x, y] of its centre in pixels from the block's top-left. */
export function deepestPoint(data: Uint8Array, stride: number, x0: number, y0: number, w: number, h: number): [number, number] {
  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = data[(y0 + y) * stride + x0 + x];
      if (v > best) {
        best = v;
        bx = x;
        by = y;
      }
    }
  }
  return [bx + 0.5, by + 0.5];
}
