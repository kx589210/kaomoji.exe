// The kaleidoscope (src/engine/post/kaleidoscope.ts): its pure maths and CPU reference (src/engine/post/kaleidoMath.ts) — the fold,
// its symmetry, that it never tears (radial, rect and hex tiles, whole and morphing N), the spin / turn / zoom controls, the edge
// reflection, the seams, where a drawn point gets mirrored to — and how the effect turns a KaleidoLook into uniforms. The picture on
// the GPU is the integrator's still check.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { EffectQuad } from '../src/engine/post/effectQuad.ts';
import { KALEIDO_FRAGMENT, KaleidoscopeEffect } from '../src/engine/post/kaleidoscope.ts';
import {
  KALEIDO_MAX_FACETS, type KaleidoLook, type KaleidoParams, kaleidoFold, kaleidoImages, kaleidoLocal, kaleidoSource, kaleidoUv, mirrorUv,
  mixKaleido, resolveKaleido,
} from '../src/engine/post/kaleidoMath.ts';

type V2 = readonly [number, number];
const K = (look: Omit<KaleidoLook, 'amount'> & { amount?: number }) => resolveKaleido({ amount: 1, ...look })!;
const src = (P: V2, k: KaleidoParams) => kaleidoSource(P, k).src;
const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const rot = (p: V2, a: number, c: V2 = [0, 0]): [number, number] => {
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + Math.cos(a) * x - Math.sin(a) * y, c[1] + Math.sin(a) * x + Math.cos(a) * y];
};
const polar = (r: number, a: number, c: V2 = [0, 0]): [number, number] => [c[0] - r * Math.sin(a), c[1] + r * Math.cos(a)]; // a from 12 o'clock, CCW
const FRAME: V2 = [1920, 1080];

/**
 * The largest |Δ picture point| / |Δ output point| over a dense walk of the frame (rows, columns and diagonals, 1.5 px steps): a fold
 * is a piecewise isometry, so a seamless one never exceeds 1 / zoom anywhere — a tear shows up as a ratio of tens or hundreds.
 * Rows every 31 px and columns every 43 px cross every mirror line and cell border the tilings draw.
 */
function stretch(k: KaleidoParams, viaUv = false): number {
  const at = (P: V2) => (viaUv ? kaleidoUv(src(P, k), FRAME).map((v, i) => v * FRAME[i]) as unknown as V2 : src(P, k));
  let worst = 0;
  const h = 1.5;
  for (let y = -540; y <= 540; y += 31) {
    for (let x = -960; x <= 960; x += h) {
      for (const d of [[h, 0], [0, h], [h, h]] as const) {
        const a: V2 = [x, y];
        const b: V2 = [x + d[0], y + d[1]];
        worst = Math.max(worst, dist(at(a), at(b)) / dist(a, b));
      }
    }
  }
  for (let x = -960; x <= 960; x += 43) {
    for (let y = -540; y <= 540; y += h) worst = Math.max(worst, dist(at([x, y]), at([x, y + h])) / h);
  }
  return worst;
}

test('the fold maps every angle into the wedge [0, π/N], is even, and is the identity inside the wedge', () => {
  for (const n of [1, 3, 8, 10, 12, 7.3]) {
    const w = Math.PI / n;
    for (let a = -Math.PI; a <= Math.PI; a += 0.01) {
      const f = kaleidoFold(a, n);
      assert.ok(f >= -1e-12 && f <= w + 1e-12, `N ${n}, a ${a}`);
      assert.equal(f, kaleidoFold(-a, n));
    }
    for (let a = 0; a <= w; a += w / 10) assert.ok(Math.abs(kaleidoFold(a, n) - a) < 1e-12);
  }
  assert.ok(Math.abs(kaleidoFold(Math.PI, 7.3) - kaleidoFold(-Math.PI, 7.3)) < 1e-12, 'a fractional N agrees across 6 o’clock');
});

test('at rest the wedge just left of 12 o’clock is the picture itself', () => {
  const k = K({ facets: 8 });
  for (const r of [0, 10, 300, 900]) for (let a = 0; a <= Math.PI / 8; a += Math.PI / 80) assert.ok(dist(src(polar(r, a), k), polar(r, a)) < 1e-9);
});

test('N whole: the pattern repeats every 2π/N and is mirrored across 12 o’clock (the dihedral group D_N)', () => {
  for (const n of [3, 6, 8, 10, 12]) {
    const k = K({ facets: n, turn: 0.4, zoom: 1.7, centre: [120, -60], source: [-200, 90] });
    for (const P of [[0, 0], [300, 200], [-700, 410], [55, -500]] as V2[]) {
      for (let m = 1; m < n; m++) assert.ok(dist(src(rot(P, (2 * Math.PI * m) / n, k.centre), k), src(P, k)) < 1e-7, `N ${n}, ×${m}`);
      const mirrored: V2 = [2 * k.centre[0] - P[0], P[1]];
      assert.ok(dist(src(mirrored, k), src(P, k)) < 1e-7, `N ${n} mirror`);
    }
  }
});

test('seamless, radial: no tear anywhere, for whole and morphing N, any spin, turn, zoom and centre', () => {
  for (const look of [
    { facets: 8 }, { facets: 10, spin: 0.7, turn: -1.2 }, { facets: 7.3, zoom: 2 }, { facets: 1 }, { facets: 2.5, centre: [300, -100], source: [0, 0] },
    { facets: 64, zoom: 0.5 }, { facets: 11.9, spin: 3, centre: [-900, 500] },
  ] as const) {
    const k = K(look);
    assert.ok(stretch(k) <= 1 / k.zoom + 1e-6, `${JSON.stringify(look)}: ${stretch(k)}`);
  }
});

test('seamless, tiled: rect cells for any N, hex cells for N = 3, 6, 9, 12', () => {
  for (const look of [
    { facets: 4, tile: { cell: 240 } }, { facets: 5, tile: { cell: 300, aspect: 1.6 } }, { facets: 7.5, spin: 0.3, tile: { cell: 200 } },
    { facets: 3, tile: { cell: 260, lattice: 'hex' } }, { facets: 6, spin: 0.4, turn: 1, tile: { cell: 180, lattice: 'hex' } },
    { facets: 9, tile: { cell: 300, lattice: 'hex' } }, { facets: 12, zoom: 3, tile: { cell: 150, lattice: 'hex' }, centre: [33, 71] },
  ] as const) {
    const k = K(look);
    assert.ok(stretch(k) <= 1 / k.zoom + 1e-6, `${JSON.stringify(look)}: ${stretch(k)}`);
  }
});

test('the seam check has teeth: hex cells with N = 4 would tear, which is why N snaps to a multiple of 3', () => {
  const torn: KaleidoParams = { ...K({ facets: 6, tile: { cell: 260, lattice: 'hex' } }), facets: 4 };
  assert.ok(stretch(torn) > 5, `a hex 4-fold tears (${stretch(torn)})`);
  assert.equal(K({ facets: 4, tile: { cell: 260, lattice: 'hex' } }).facets, 3);
  assert.equal(K({ facets: 5, tile: { cell: 260, lattice: 'hex' } }).facets, 6);
  assert.equal(K({ facets: 1, tile: { cell: 260, lattice: 'hex' } }).facets, 3);
  assert.equal(K({ facets: 4, tile: { cell: 260 } }).facets, 4, 'rect keeps N');
});

test('the edge reflection keeps every sample on the picture and never tears either', () => {
  for (const u of [-3.2, -1, -0.25, 0, 0.3, 1, 1.7, 2, 5.5]) assert.ok(mirrorUv(u) >= 0 && mirrorUv(u) <= 1);
  for (const u of [0, 0.1, 0.5, 0.99, 1]) assert.ok(Math.abs(mirrorUv(u) - u) < 1e-12, 'inside, untouched');
  assert.ok(Math.abs(mirrorUv(1.2) - 0.8) < 1e-12 && Math.abs(mirrorUv(-0.2) - 0.2) < 1e-12);
  const k = K({ facets: 6, zoom: 0.4 });
  const uv = kaleidoUv(src([900, 500], k), FRAME);
  assert.ok(uv.every((v) => v >= 0 && v <= 1));
  assert.ok(stretch(k, true) <= 1 / k.zoom + 1e-6, 'through the reflection too');
});

test('spin turns the finished pattern rigidly; turn turns the picture under the mirrors; zoom scales the slice', () => {
  const base = K({ facets: 8, centre: [100, 50], source: [-40, 20] });
  const spun = K({ facets: 8, centre: [100, 50], source: [-40, 20], spin: 0.9 });
  const turned = K({ facets: 8, centre: [100, 50], source: [-40, 20], turn: 0.9 });
  const zoomed = K({ facets: 8, centre: [100, 50], source: [-40, 20], zoom: 2.5 });
  for (const P of [[400, 300], [-600, -200], [100, 400]] as V2[]) {
    assert.ok(dist(src(rot(P, 0.9, base.centre), spun), src(P, base)) < 1e-7, 'spin');
    assert.ok(dist(src(P, turned), rot(src(P, base), 0.9, base.source)) < 1e-7, 'turn');
    assert.ok(Math.abs(dist(src(P, zoomed), zoomed.source) - dist(P, zoomed.centre) / 2.5) < 1e-7, 'zoom');
  }
});

test('tiles repeat: rect cells every cell (even N) or every two (any N); hex cells along the lattice', () => {
  const even = K({ facets: 8, tile: { cell: 240, aspect: 1.5 } });
  const odd = K({ facets: 5, tile: { cell: 240 } });
  const hex = K({ facets: 6, tile: { cell: 200, lattice: 'hex' } });
  for (const P of [[13, 27], [-301, 144], [77, -420]] as V2[]) {
    assert.ok(dist(src([P[0] + 240, P[1]], even), src(P, even)) < 1e-6);
    assert.ok(dist(src([P[0], P[1] + 160], even), src(P, even)) < 1e-6);
    assert.ok(dist(src([P[0] + 480, P[1] - 480], odd), src(P, odd)) < 1e-6);
    for (const t of [[200, 0], [100, 100 * Math.sqrt(3)], [-100, 100 * Math.sqrt(3)]] as V2[]) assert.ok(dist(src([P[0] + t[0], P[1] + t[1]], hex), src(P, hex)) < 1e-6);
  }
});

test('the lattice: a point relative to its cell centre, and how far the border is', () => {
  const rect = K({ facets: 4, tile: { cell: 200, aspect: 2 } });
  assert.deepEqual(rect.cell, [200, 100]);
  const a = kaleidoLocal([30, 20], rect);
  assert.deepEqual(a.q, [30, 20]);
  assert.equal(a.border, 30);
  const b = kaleidoLocal([130, 20], rect);
  assert.deepEqual(b.q, [70, 20], 'the next cell is the mirror image');
  const hex = K({ facets: 6, tile: { cell: 200, lattice: 'hex' } });
  assert.ok(Math.abs(kaleidoLocal([0, 0], hex).border - 100) < 1e-9);
  assert.ok(Math.abs(kaleidoLocal([100, 0], hex).border) < 1e-9, 'half way to the right neighbour is on the border');
  assert.ok(dist(kaleidoLocal([200, 0], hex).q, [0, 0]) < 1e-9, 'a neighbour centre');
  assert.equal(kaleidoLocal([5, 5], K({ facets: 6 })).border, Infinity);
});

test('seams: zero on every mirror line and cell border, growing away from them', () => {
  const k = K({ facets: 10, seam: { width: 2, color: [1, 1, 1] } });
  for (let m = 0; m < 20; m++) assert.ok(kaleidoSource(polar(300, (m * Math.PI) / 10), k).seam < 1e-9, `mirror ${m}`);
  const mid = kaleidoSource(polar(300, Math.PI / 20), k).seam;
  assert.ok(Math.abs(mid - 300 * Math.sin(Math.PI / 20)) < 1e-9);
  const t = K({ facets: 4, tile: { cell: 200 } });
  assert.ok(kaleidoSource([100, 37], t).seam < 1e-9, 'a cell border');
});

test('kaleidoImages: a point in the slice shows up 2N times (N on a mirror), each mapping back to it; outside the slice, nowhere', () => {
  const k = K({ facets: 10, turn: 0.3, zoom: 1.4, spin: 0.2, centre: [50, -30], source: [10, 5] });
  const X = polar(120, 0.3 + Math.PI / 25, k.source);
  const images = kaleidoImages(X, k);
  assert.equal(images.length, 20);
  for (const P of images) assert.ok(dist(src(P, k), X) < 1e-7);
  assert.equal(kaleidoImages(polar(120, 0.3, k.source), k).length, 10, 'on a mirror line: one image per sector');
  assert.equal(kaleidoImages(polar(120, 0.3 + Math.PI / 5, k.source), k).length, 0, 'outside the slice the mirrors see');
  assert.deepEqual(kaleidoImages(k.source, k), [[50, -30]]);
  const frac = K({ facets: 2.5 });
  const Y = polar(200, 0.2);
  const fi = kaleidoImages(Y, frac);
  assert.ok(fi.length >= 4);
  for (const P of fi) assert.ok(dist(src(P, frac), Y) < 1e-7);
  assert.throws(() => kaleidoImages(X, K({ facets: 4, tile: { cell: 200 } })), /radial/);
});

test('resolve: absent or amount 0 draws nothing; N clamps to 1–64; defaults; bad zoom fails loudly', () => {
  assert.equal(resolveKaleido(undefined), null);
  assert.equal(resolveKaleido({ amount: 0, facets: 8 }), null);
  const k = K({ facets: 200, centre: [10, 20] });
  assert.equal(k.facets, KALEIDO_MAX_FACETS);
  assert.equal(K({ facets: 0.2 }).facets, 1);
  assert.deepEqual(k.source, [10, 20], 'the source defaults to the centre');
  assert.equal(k.zoom, 1);
  assert.equal(k.lattice, 0);
  assert.equal(k.seamAlpha, 0, 'no seam asked for');
  assert.equal(K({ facets: 6, tile: { cell: 2 } }).cell[0], 8, 'the cell has a floor');
  assert.throws(() => resolveKaleido({ amount: 1, facets: 6, zoom: 0 }), /zoom/);
  assert.throws(() => resolveKaleido({ amount: 1, facets: Number.NaN }), /facets/);
});

test('mixKaleido blends amount, N, spin, turn, centre and source, the zoom geometrically; tiles of one kind blend their cell', () => {
  assert.equal(mixKaleido(undefined, undefined, 0.3), undefined);
  const a: KaleidoLook = { amount: 1, facets: 8, zoom: 1, centre: [0, 0], tile: { cell: 100 } };
  const b: KaleidoLook = { amount: 1, facets: 12, zoom: 4, spin: 1, centre: [100, 0], tile: { cell: 300 }, seam: { width: 2, color: [1, 1, 1] } };
  const m = mixKaleido(a, b, 0.5)!;
  assert.equal(m.facets, 10);
  assert.ok(Math.abs(m.zoom! - 2) < 1e-9);
  assert.equal(m.spin, 0.5);
  assert.deepEqual(m.centre, [50, 0]);
  assert.deepEqual(m.source, [50, 0]);
  assert.equal(m.tile!.cell, 200);
  assert.ok(m.seam);
  assert.equal(mixKaleido(a, b, 0.4)!.seam, undefined);
  assert.equal(mixKaleido(undefined, b, 0.5)!.amount, 0.5);
  const hex = mixKaleido(a, { ...b, tile: { cell: 300, lattice: 'hex' } }, 0.7)!;
  assert.equal(hex.tile!.lattice, 'hex', 'different tilings: the nearer one');
});

test('KaleidoscopeEffect: nothing to do at amount 0; the uniforms follow the look', () => {
  const fx = new KaleidoscopeEffect();
  assert.equal(fx.configure(undefined), false);
  assert.equal(fx.configure({ amount: 0, facets: 8 }), false);
  assert.equal(fx.uniforms.get('amount')!.value, 0);
  assert.equal(fx.configure({ amount: 0.8, facets: 5, spin: 0.2, turn: 0.3, zoom: 1.5, centre: [10, -20], tile: { cell: 120, lattice: 'hex' }, seam: { width: 3, color: [2, 1, 0.5] } }), true);
  const u = fx.uniforms;
  assert.equal(u.get('amount')!.value, 0.8);
  assert.equal(u.get('facets')!.value, 6);
  assert.equal(u.get('lattice')!.value, 2);
  assert.deepEqual((u.get('centre')!.value as THREE.Vector2).toArray(), [10, -20]);
  assert.deepEqual((u.get('source')!.value as THREE.Vector2).toArray(), [10, -20]);
  assert.deepEqual((u.get('cell')!.value as THREE.Vector2).toArray(), [120, 120]);
  assert.deepEqual((u.get('seamColor')!.value as THREE.Vector3).toArray(), [2, 1, 0.5]);
  assert.equal(u.get('seamAlpha')!.value, 1);
  fx.configure({ amount: 1, facets: 8 });
  assert.equal(u.get('lattice')!.value, 0);
  assert.equal(u.get('seamAlpha')!.value, 0);
  fx.dispose();
});

test('the shader keeps its constants prefixed and reads only what the pipeline and its uniforms give it', () => {
  assert.ok(!/\bconst\s+\w+\s+(?!KL_)\w+\s*(\[|=)/.test(KALEIDO_FRAGMENT));
  assert.ok(/void mainImage\(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor\)/.test(KALEIDO_FRAGMENT));
  const quad = new EffectQuad(new KaleidoscopeEffect());
  assert.ok(quad.uniforms.facets && quad.uniforms.resolution && quad.uniforms.inputBuffer);
  quad.dispose();
});
