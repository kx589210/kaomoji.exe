// The 8-bit look (src/engine/post/pixel.ts): its pure maths and CPU reference (src/engine/post/pixelMath.ts) — the cell grid and how
// it scales, the palettes and the OKLab snap, the ordered dither, the scattered crumble, the gaps — and how the effect turns a
// PixelLook into uniforms. The picture on the GPU is the integrator's still check.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { linear, type RGB } from '../src/engine/color.ts';
import { EffectQuad, effectQuadFragment } from '../src/engine/post/effectQuad.ts';
import { PIXEL_FRAGMENT, PixelEffect } from '../src/engine/post/pixel.ts';
import {
  BAYER4, OKLAB_LAB, OKLAB_LMS, PIXEL_MAX_COLOURS, PIXEL_PALETTES, type PixelLook, type PixelParams, bayer, cellPick, gapCover, linearToSrgb, mixPixel,
  oklab, parseHex, pixelCellOf, pixelCellPx, pixelShade, quantize, resolvePixel, srgbToLinear,
} from '../src/engine/post/pixelMath.ts';

const near = (a: readonly number[], b: readonly number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const show8 = (c: RGB) => c.map((v) => Math.round(255 * linearToSrgb(v)));
const P = (look: PixelLook, height = 1080) => resolvePixel(look, height)!;
// A smooth, coloured picture defined in logical 1080p px, sampled at device px of a frame `k` times 1080p.
const picture = (k: number) => (x: number, y: number): RGB => {
  const u = x / k / 1920;
  const v = y / k / 1080;
  return [srgbToLinear(u), srgbToLinear(v), srgbToLinear(0.5 + 0.4 * Math.sin(6 * u + 4 * v))];
};

test('the game pixel is `cell` px at 1080p, scaled with the frame and rounded, never below 1 device px', () => {
  assert.equal(pixelCellPx(6, 1080), 6);
  assert.equal(pixelCellPx(6, 2160), 12);
  assert.equal(pixelCellPx(5, 2160), 10);
  assert.equal(pixelCellPx(0.2, 1080), 1);
  assert.equal(pixelCellPx(2.6, 1080), 3);
});

test('the grid is anchored at the frame centre: the centre pixel starts cell (0, 0), and a 6 px grid tiles 1920 × 1080 exactly', () => {
  assert.deepEqual(pixelCellOf(960.5, 540.5, 6, 1920, 1080), [0, 0]);
  assert.deepEqual(pixelCellOf(959.5, 539.5, 6, 1920, 1080), [-1, -1]);
  assert.deepEqual(pixelCellOf(0.5, 0.5, 6, 1920, 1080), [-160, -90]);
  assert.deepEqual(pixelCellOf(1919.5, 1079.5, 6, 1920, 1080), [159, 89]);
  assert.deepEqual(pixelCellOf(1920.5, 1080.5, 12, 3840, 2160), [0, 0], 'the same cell at 4K');
});

test('resolve: absent or amount 0 draws nothing; a palette by name or by list; bad input fails loudly', () => {
  assert.equal(resolvePixel(undefined, 1080), null);
  assert.equal(resolvePixel({ amount: 0, cell: 6 }, 1080), null);
  assert.equal(resolvePixel({ amount: -1, cell: 6 }, 1080), null);
  const named = P({ amount: 2, cell: 6, palette: 'dmg4', dither: 0.2 }, 2160);
  assert.equal(named.amount, 1, 'amount clamps to 1');
  assert.equal(named.cellPx, 12);
  assert.equal(named.mode, 1);
  assert.equal(named.colours.length, 4);
  const listed = P({ amount: 1, cell: 6, palette: ['#000000', '#FFB23E'] });
  assert.deepEqual(listed.colours[1], linear('#FFB23E'), 'palette colours are the exact sRGB decode (the encoder brings back the hex)');
  assert.equal(P({ amount: 1, cell: 6, levels: 4 }).mode, 2);
  assert.equal(P({ amount: 1, cell: 6, levels: 999 }).levels, 256);
  const plain = P({ amount: 1, cell: 6, dither: 0.5 });
  assert.equal(plain.mode, 0);
  assert.equal(plain.dither, 0, 'no snap, no dither');
  assert.throws(() => resolvePixel({ amount: 1, cell: 6, palette: ['#000000'] }, 1080), /2–16 colours/);
  assert.throws(() => resolvePixel({ amount: 1, cell: 6, palette: Array(17).fill('#000000') }, 1080), /2–16 colours/);
  assert.throws(() => resolvePixel({ amount: 1, cell: 6, palette: ['#000000', 'FFB23E'] }, 1080), /not a #rrggbb/);
  assert.throws(() => resolvePixel({ amount: 1, cell: 6, palette: 'nes' as never }, 1080), /no palette named/);
  assert.throws(() => resolvePixel({ amount: 1, cell: 0 }, 1080), /cell must be > 0/);
});

test('the presets are valid, distinct, ≤ 16 colours; the film palette keeps the colour logic (amber = virus, red = antivirus)', () => {
  for (const [name, list] of Object.entries(PIXEL_PALETTES)) {
    assert.ok(list.length >= 2 && list.length <= PIXEL_MAX_COLOURS, name);
    assert.equal(new Set(list.map((h) => h.toUpperCase())).size, list.length, `${name} has no duplicates`);
    list.forEach((h) => parseHex(h));
  }
  const film: readonly string[] = PIXEL_PALETTES.film16;
  assert.ok(film.includes('#FFB23E') && film.includes('#FF4A1C'));
  for (const name of ['amber4', 'red4', 'dmg4'] as const) {
    const L = PIXEL_PALETTES[name].map((h) => oklab(linear(h))[0]);
    assert.ok(L.every((v, i) => i === 0 || v > L[i - 1]), `${name} runs dark to light`);
  }
});

test('OKLab: white is L 1, black 0, greys have no chroma, pure red matches the published value', () => {
  assert.ok(near(oklab([1, 1, 1]), [1, 0, 0], 1e-4));
  assert.deepEqual(oklab([0, 0, 0]), [0, 0, 0]);
  const g = oklab([0.2, 0.2, 0.2]);
  assert.ok(Math.abs(g[1]) < 1e-4 && Math.abs(g[2]) < 1e-4);
  assert.ok(near(oklab([1, 0, 0]), [0.627955, 0.224863, 0.125846], 1e-4));
});

test('the sRGB transfer round-trips and matches color.ts', () => {
  for (const v of [0, 0.001, 0.003, 0.04, 0.2, 0.5, 1]) assert.ok(Math.abs(srgbToLinear(linearToSrgb(v)) - v) < 1e-9, `${v}`);
  assert.ok(near([srgbToLinear(0x80 / 255)], [linear('#808080')[0]], 1e-12));
});

test('every palette colour snaps to itself, and a colour snaps to the one that looks nearest', () => {
  for (const name of Object.keys(PIXEL_PALETTES) as (keyof typeof PIXEL_PALETTES)[]) {
    const p = P({ amount: 1, cell: 6, palette: name });
    p.colours.forEach((c) => assert.deepEqual(quantize(c, p, 0, 0), c, `${name}`));
  }
  const p = P({ amount: 1, cell: 6, palette: 'film16' });
  assert.deepEqual(show8(quantize(linear('#F0A040'), p, 0, 0)), [0xff, 0xb2, 0x3e], 'an orange is the virus amber');
  assert.deepEqual(show8(quantize(linear('#E02010'), p, 0, 0)), [0xff, 0x4a, 0x1c], 'a red is the antivirus red');
  assert.deepEqual(show8(quantize(linear('#000000'), p, 0, 0)), [0x07, 0x06, 0x0c]);
  const mono = P({ amount: 1, cell: 6, palette: 'onebit' });
  assert.deepEqual(show8(quantize(linear('#404040'), mono, 0, 0)), [0, 0, 0]);
  assert.deepEqual(show8(quantize(linear('#C0C0C0'), mono, 0, 0)), [255, 255, 255]);
});

test('posterise: `levels` even display steps per channel', () => {
  const p = P({ amount: 1, cell: 6, levels: 4 });
  const steps = new Set<number>();
  for (let i = 0; i <= 64; i++) steps.add(show8(quantize([srgbToLinear(i / 64), 0, 0], p, 0, 0))[0]);
  assert.deepEqual([...steps].sort((a, b) => a - b), [0, 85, 170, 255]);
});

test('the Bayer matrix: 16 distinct thresholds, mean ½, repeating every 4 game pixels, negative cells included', () => {
  assert.deepEqual([...BAYER4].sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i));
  let sum = 0;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) sum += bayer(x, y);
  assert.equal(sum / 16, 0.5);
  for (const [x, y] of [[0, 0], [3, 1], [-1, -1], [-7, 5]]) assert.equal(bayer(x, y), bayer(x + 4, y - 8));
  assert.equal(bayer(-1, -1), bayer(3, 3));
});

test('ordered dither: a colour between two palette entries becomes a checker of both, in proportion; dither 0 is flat', () => {
  const pal = ['#000000', '#FFFFFF'];
  const grey = (d: number): RGB => [srgbToLinear(d), srgbToLinear(d), srgbToLinear(d)];
  const share = (look: PixelLook, d: number) => {
    const p = P(look);
    let white = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) white += show8(quantize(grey(d), p, x, y))[0] === 255 ? 1 : 0;
    return white / 16;
  };
  // The snap is perceptual: OKLab L 0.5 (the half-way between black and white) is display 0.3885, not 0.5.
  assert.equal(share({ amount: 1, cell: 6, palette: pal }, 0.35), 0, 'no dither: a grey below the perceptual middle is all black');
  assert.equal(share({ amount: 1, cell: 6, palette: pal }, 0.42), 1, 'no dither: one above it is all white');
  const half = share({ amount: 1, cell: 6, palette: pal, dither: 1 }, 0.3885);
  assert.ok(half >= 0.4 && half <= 0.6, `the perceptual middle grey dithers to about half white (${half})`);
  assert.ok(share({ amount: 1, cell: 6, palette: pal, dither: 1 }, 0.25) < half, 'darker greys have fewer white pixels');
  assert.equal(share({ amount: 1, cell: 6, palette: pal, dither: 0.2 }, 0.02), 0, 'black stays black under a light dither');
});

test('the crumble: amount is the share of game pixels that turn, a fixed set that only grows', () => {
  const cells: [number, number][] = [];
  for (let y = -45; y < 45; y++) for (let x = -80; x < 80; x++) cells.push([x, y]);
  const picks = cells.map(([x, y]) => cellPick(x, y));
  for (const a of [0.1, 0.5, 0.9]) {
    const share = picks.filter((p) => p < a).length / picks.length;
    assert.ok(Math.abs(share - a) < 0.02, `amount ${a} turns ${share}`);
  }
  assert.ok(picks.every((p) => p >= 0 && p < 1), 'amount 1 turns every cell');
  assert.equal(cellPick(3, -2), cellPick(3, -2), 'deterministic');
});

test('pixelShade: every device pixel of a game pixel shows one colour (no gaps), and 1-px cells without a snap are the picture itself', () => {
  const p = P({ amount: 1, cell: 8, palette: 'pico16', dither: 0.15 });
  const pic = picture(1);
  for (const [cx, cy] of [[0, 0], [-3, 2], [20, -10]]) {
    const ref = pixelShade(pic, 960 + cx * 8 + 0.5, 540 + cy * 8 + 0.5, p, 1920, 1080);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) assert.deepEqual(pixelShade(pic, 960 + cx * 8 + i + 0.5, 540 + cy * 8 + j + 0.5, p, 1920, 1080), ref);
  }
  const id = P({ amount: 1, cell: 1 });
  for (const [x, y] of [[0.5, 0.5], [960.5, 540.5], [1919.5, 3.5]]) assert.ok(near(pixelShade(pic, x, y, id, 1920, 1080), pic(x, y), 1e-12));
});

test('pixelShade: amount below 1 leaves the cells it does not pick untouched, at full resolution', () => {
  const p = P({ amount: 0.5, cell: 8, levels: 2 });
  const pic = picture(1);
  let kept = 0;
  let turned = 0;
  for (let cy = -20; cy < 20; cy++) {
    for (let cx = -20; cx < 20; cx++) {
      const x = 960 + cx * 8 + 3.5;
      const y = 540 + cy * 8 + 5.5;
      const out = pixelShade(pic, x, y, p, 1920, 1080);
      if (cellPick(cx, cy) >= 0.5) {
        assert.deepEqual(out, pic(x, y));
        kept++;
      } else turned++;
    }
  }
  assert.ok(kept > 600 && turned > 600);
});

test('a 4K render is the 1080p one, scaled: each 2 × 2 block of 4K pixels shows the 1080p pixel, gaps averaged exactly', () => {
  const look: PixelLook = { amount: 1, cell: 6, palette: 'film16', dither: 0.2, scanlines: 0.6, grid: 0.3 };
  const hd = P(look, 1080);
  const uhd = P(look, 2160);
  for (const [x, y] of [[960, 540], [100, 77], [1500, 1000], [961, 545], [3, 1078]]) {
    const one = pixelShade(picture(1), x + 0.5, y + 0.5, hd, 1920, 1080);
    const four = [0, 1].flatMap((j) => [0, 1].map((i) => pixelShade(picture(2), 2 * x + i + 0.5, 2 * y + j + 0.5, uhd, 3840, 2160)));
    // The snapped colour is the same; the gap darkness is a box coverage, so the four 4K pixels average (in display) to the 1080p one.
    const avg = [0, 1, 2].map((c) => four.reduce((s, q) => s + linearToSrgb(q[c]), 0) / 4);
    assert.ok(near(avg, one.map(linearToSrgb), 0.03), `pixel (${x}, ${y}): ${avg} vs ${one.map(linearToSrgb)}`);
  }
});

test('scanlines and grid: a gap of `gap` × cell along the bottom row / left column, as dark as asked, nothing elsewhere', () => {
  assert.equal(gapCover(0, 6, 0.25), 1);
  assert.equal(gapCover(1, 6, 0.25), 0.5);
  assert.equal(gapCover(2, 6, 0.25), 0);
  assert.equal(gapCover(1, 12, 0.25), 1);
  assert.equal(gapCover(2, 12, 0.25), 1);
  assert.equal(gapCover(3, 12, 0.25), 0);
  const white = (): RGB => [1, 1, 1];
  const p = P({ amount: 1, cell: 6, scanlines: 0.5 });
  const shown = (x: number, y: number) => linearToSrgb(pixelShade(white, x, y, p, 1920, 1080)[0]);
  assert.ok(Math.abs(shown(960.5, 540.5) - 0.5) < 1e-9, 'bottom row of the cell: half as bright, as displayed');
  assert.ok(Math.abs(shown(960.5, 541.5) - 0.75) < 1e-9, 'the gap ends half way through the second row (6 × 0.25 = 1.5 px)');
  assert.ok(Math.abs(shown(960.5, 543.5) - 1) < 1e-9);
  assert.ok(Math.abs(shown(963.5, 543.5) - 1) < 1e-9, 'no grid asked for');
});

test('mixPixel blends the numbers, the cell geometrically, and takes the palette from the nearer side', () => {
  assert.equal(mixPixel(undefined, undefined, 0.5), undefined);
  const a: PixelLook = { amount: 1, cell: 2, palette: 'dmg4', scanlines: 0.4 };
  const b: PixelLook = { amount: 0.5, cell: 32, palette: 'film16' };
  const m = mixPixel(a, b, 0.5)!;
  assert.equal(m.amount, 0.75);
  assert.ok(Math.abs(m.cell - 8) < 1e-9);
  assert.equal(m.palette, 'film16');
  assert.equal(m.scanlines, 0.2);
  assert.equal(mixPixel(a, b, 0.25)!.palette, 'dmg4');
  const fadeIn = mixPixel(undefined, b, 0.25)!;
  assert.equal(fadeIn.amount, 0.125);
  assert.equal(fadeIn.cell, 32);
});

test('the shader is generated from the same constants as the reference', () => {
  for (const v of BAYER4) assert.ok(PIXEL_FRAGMENT.includes(String((v + 0.5) / 16)), `Bayer ${v}`);
  for (const r of [...OKLAB_LMS, ...OKLAB_LAB]) for (const v of r) assert.ok(PIXEL_FRAGMENT.includes(String(v)), `OKLab ${v}`);
  assert.ok(PIXEL_FRAGMENT.includes('2246822507u'), 'the crumble salt');
  assert.ok(!/\bconst\s+\w+\s+(?!PX_)\w+\s*(\[|=)/.test(PIXEL_FRAGMENT), 'every shader constant carries the PX_ prefix');
});

test('PixelEffect: nothing to do at amount 0; the uniforms follow the look, the cell scales with the frame', () => {
  const fx = new PixelEffect();
  assert.equal(fx.configure(undefined), false);
  assert.equal(fx.configure({ amount: 0, cell: 6, palette: 'dmg4' }), false);
  assert.equal(fx.uniforms.get('amount')!.value, 0);
  fx.setSize(3840, 2160);
  assert.equal(fx.configure({ amount: 1, cell: 6, palette: 'dmg4', dither: 0.2, scanlines: 0.5 }), true);
  const u = fx.uniforms;
  assert.equal(u.get('cellPx')!.value, 12);
  assert.equal(u.get('mode')!.value, 1);
  assert.equal(u.get('count')!.value, 4);
  const lin = u.get('paletteLin')!.value as THREE.Vector3[];
  const lab = u.get('palette')!.value as THREE.Vector3[];
  assert.equal(lin.length, PIXEL_MAX_COLOURS);
  assert.ok(near(lin[3].toArray(), linear('#9BBC0F')));
  assert.ok(near(lab[3].toArray(), oklab(linear('#9BBC0F'))));
  assert.deepEqual(lin[4].toArray(), [0, 0, 0], 'unused entries are cleared');
  assert.equal(u.get('scanlines')!.value, 0.5);
  fx.setSize(1920, 1080);
  fx.configure({ amount: 1, cell: 6, levels: 8 });
  assert.equal(u.get('cellPx')!.value, 6);
  assert.equal(u.get('mode')!.value, 2);
  assert.equal(u.get('count')!.value, 0);
  assert.equal(u.get('levels')!.value, 8);
  fx.dispose();
});

test('EffectQuad runs the same shader in a scene: it shares the effect’s uniforms, so configure() drives it', () => {
  const fx = new PixelEffect();
  const quad = new EffectQuad(fx);
  assert.equal(quad.uniforms.amount, fx.uniforms.get('amount'));
  fx.configure({ amount: 1, cell: 4 });
  assert.equal(quad.uniforms.amount.value, 1);
  const src = effectQuadFragment(fx);
  assert.ok(src.includes(PIXEL_FRAGMENT) && /void main\(\)/.test(src) && /uniform vec2 resolution;/.test(src));
  quad.dispose();
});

// Keeps the PixelParams type honest about what the shader needs.
test('PixelParams carries everything the shader reads', () => {
  const p: PixelParams = P({ amount: 1, cell: 6, palette: 'cga4', dither: 0.1, scanlines: 0.2, grid: 0.3, gap: 0.5 });
  assert.deepEqual(Object.keys(p).sort(), ['amount', 'cellPx', 'colours', 'dither', 'gap', 'grid', 'labs', 'levels', 'mode', 'scanlines'].sort());
  assert.equal(p.gap, 0.5);
});
