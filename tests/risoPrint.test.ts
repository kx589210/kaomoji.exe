// The Riso print post pass: the separation table, the per-pixel model (src/engine/post/risoModel.ts, the shader's maths in
// TypeScript) and the effect's set-up (src/engine/post/risoPrint.ts). The GPU picture is checked by the integrator's stills.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { type RGB, linear } from '../src/engine/color.ts';
import { type Vec2, luma } from '../src/engine/post/dotScreen.ts';
import { RisoPrintEffect } from '../src/engine/post/risoPrint.ts';
import {
  RISO_PRINT_ANGLES, RISO_PRINT_DENSITY, RISO_PRINT_GRAIN, RISO_PRINT_INKS, RISO_PRINT_PITCH, RISO_SPACE, type RisoPrintLook, type RisoPrintSettings, type Sampler,
  buildRisoLut, mixRisoPrint, packRisoLut, resolveRiso, risoCoverage, risoLut, risoLutMode, risoNeonWeights, risoPrintAt, risoPrinted,
} from '../src/engine/post/risoModel.ts';
import { DENSITY, PAPER_GRAIN, RISO, SCREEN, misregistration } from '../src/worlds/riso.ts';

const LUT = risoLut();
const PACKED = packRisoLut(LUT);
const G = LUT.size;
const HD: Vec2 = [1920, 1080];
const UHD: Vec2 = [3840, 2160];
const PAPER = linear(RISO_PRINT_INKS.paper);

const cov = (hex: string, night: number) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return risoCoverage(PACKED, G, [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], night);
};
/** A picture given in 1080p screen px (centre origin, y up), sampled at uv as the pass does (clamped to the edge). */
const picture = (f: (x: number, y: number) => RGB): Sampler => (u, v) => f((Math.min(1, Math.max(0, u)) - 0.5) * 1920, (Math.min(1, Math.max(0, v)) - 0.5) * 1080);
const flat = (c: RGB): Sampler => () => c;
/** Every device pixel whose centre is inside the 1080p rectangle [x0, x1) × [y0, y1) of a `res` frame, through the model. */
const patch = (sample: Sampler, st: RisoPrintSettings, x0: number, y0: number, x1: number, y1: number, res: Vec2 = HD): RGB[] => {
  const k = res[1] / 1080;
  const out: RGB[] = [];
  for (let fy = Math.ceil((y0 * k + res[1] / 2) - 0.5); fy + 0.5 < y1 * k + res[1] / 2; fy++) {
    for (let fx = Math.ceil((x0 * k + res[0] / 2) - 0.5); fx + 0.5 < x1 * k + res[0] / 2; fx++) out.push(risoPrintAt(sample, [fx + 0.5, fy + 0.5], res, st, PACKED, G));
  }
  return out;
};
const mean = (cs: readonly RGB[]): RGB => [0, 1, 2].map((c) => cs.reduce((s, x) => s + x[c], 0) / cs.length) as unknown as RGB;
const close = (a: RGB, b: RGB, tol: number, msg: string) => assert.ok(a.every((v, i) => Math.abs(v - b[i]) < tol), `${msg}: ${a.map((v) => v.toFixed(4))} vs ${b.map((v) => v.toFixed(4))}`);
/** A clean press (no fibre, no mottle) so a flat field prints exactly its inks. */
const clean = (look: Omit<RisoPrintLook, 'amount'> & { amount?: number }) => resolveRiso({ amount: 1, paperGrain: 0, mottle: 0, ...look });

test('the print uses the Riso world’s paper, inks, density, screen and paper grain', () => {
  assert.deepEqual(RISO_PRINT_INKS, RISO);
  assert.equal(RISO_PRINT_DENSITY, DENSITY);
  assert.equal(RISO_PRINT_PITCH, SCREEN.pitch);
  assert.deepEqual(RISO_PRINT_ANGLES, SCREEN.angle);
  assert.equal(RISO_PRINT_GRAIN, PAPER_GRAIN);
});

test('the separation: night prints black as solid pink over blue and white as paper; day the other way round', () => {
  const blackNight = cov('#000000', 1);
  assert.ok(blackNight[0] > 0.95 && blackNight[1] > 0.95 && blackNight[2] < 0.05, `${blackNight}`);
  assert.ok(cov('#FFFFFF', 1).every((c) => c < 0.08));
  assert.ok(cov('#000000', 0).every((c) => c < 0.02));
  const whiteDay = cov('#FFFFFF', 0);
  assert.ok(whiteDay[0] + whiteDay[1] + whiteDay[2] > 1.5, `${whiteDay}`);
  assert.deepEqual(risoPrinted([1, 1, 0]), RISO_SPACE);
});

test('the separation puts each ink’s own colour on its own plate', () => {
  for (const night of [0, 1]) {
    const pink = cov(RISO.pink, night);
    const blue = cov(RISO.blue, night);
    const yellow = cov(RISO.yellow, night);
    assert.ok(pink[0] > 0.9 && pink[1] < 0.25 && pink[2] < 0.1, `pink ${night}: ${pink}`);
    assert.ok(blue[1] > 0.9 && blue[2] < 0.1, `blue ${night}: ${blue}`);
    assert.ok(yellow[2] > 0.9 && yellow[0] < 0.1, `yellow ${night}: ${yellow}`);
  }
});

test('the grey ramp prints monotone: at night more light prints lighter, by day darker, from paper to printed space', () => {
  const printedLuma = (i: number, night: number) => luma(risoPrinted(risoCoverage(PACKED, G, [i / 32, i / 32, i / 32], night)));
  for (let i = 1; i <= 32; i++) {
    assert.ok(printedLuma(i, 1) >= printedLuma(i - 1, 1), `night ${i}`);
    assert.ok(printedLuma(i, 0) <= printedLuma(i - 1, 0), `day ${i}`);
  }
  assert.ok(printedLuma(32, 1) > 0.8 && printedLuma(0, 0) > 0.8, 'the light end is paper');
  assert.ok(printedLuma(0, 1) < 0.1 && printedLuma(32, 0) < 0.15, 'the dark end is dense ink');
});

test('the packed texture reads back the table at its nodes (8-bit) and interpolates between them', () => {
  for (let i = 0; i < 200; i++) {
    const r = i % G;
    const g = (i * 7) % G;
    const b = (i * 13) % G;
    const node: RGB = [r / (G - 1), g / (G - 1), b / (G - 1)];
    for (const mode of [0, 1] as const) {
      const table = mode === 0 ? LUT.day : LUT.night;
      const at = risoLutMode(PACKED, G, node, mode);
      const j = ((r * G + g) * G + b) * 3;
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(at[k] - table[j + k]) <= 0.5 / 255 + 1e-9, `node ${node} plate ${k}`);
      if (b < G - 1) {
        const mid = risoLutMode(PACKED, G, [node[0], node[1], (b + 0.5) / (G - 1)], mode);
        const next = risoLutMode(PACKED, G, [node[0], node[1], (b + 1) / (G - 1)], mode);
        for (let k = 0; k < 3; k++) assert.ok(Math.abs(mid[k] - (at[k] + next[k]) / 2) < 1e-9);
      }
    }
  }
  const half = risoCoverage(PACKED, G, [0.3, 0.6, 0.2], 0.5);
  const d = risoCoverage(PACKED, G, [0.3, 0.6, 0.2], 0);
  const n = risoCoverage(PACKED, G, [0.3, 0.6, 0.2], 1);
  close(half, [(d[0] + n[0]) / 2, (d[1] + n[1]) / 2, (d[2] + n[2]) / 2], 1e-9, 'night 0.5 is the mean of the two tables');
});

test('flat fields print their inks: black at night is printed space, black by day bare paper, white at night paper', () => {
  close(mean(patch(flat([0, 0, 0]), clean({ night: 1 }), -20, -20, 20, 20)), RISO_SPACE, 0.006, 'black, night');
  close(mean(patch(flat([0, 0, 0]), clean({ night: 0 }), -20, -20, 20, 20)), PAPER, 1e-6, 'black, day');
  const white = cov('#FFFFFF', 1);
  close(mean(patch(flat([1, 1, 1]), clean({ night: 1 }), -20, -20, 20, 20)), risoPrinted(white), 0.012, 'white, night');
});

test('fine detail prints as solid line ink: a 2 px grey stroke is one even line, a wide band of the same grey is dots', () => {
  const grey = linear('#808080');
  const white: RGB = [1, 1, 1];
  const stroke = picture((x) => (Math.abs(x) < 1 ? grey : white));
  const band = picture((x) => (Math.abs(x) < 60 ? grey : white));
  const st = clean({ night: 1 });
  const along = (sample: Sampler) => Array.from({ length: 60 }, (_, i) => luma(risoPrintAt(sample, [960.5, 300.5 + i], HD, st, PACKED, G)));
  const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
  assert.ok(spread(along(stroke)) < 0.02, `stroke: ${spread(along(stroke))}`);
  assert.ok(spread(along(band)) > 0.2, `band: ${spread(along(band))}`);
  assert.ok(Math.max(...along(stroke)) < 0.12, 'the stroke prints dark (solid pink and blue)');
});

test('each plate prints where its offset puts it, and misregistration() from the Riso world plugs straight in', () => {
  const disc = picture((x, y) => (Math.hypot(x, y) < 100 ? [1, 1, 1] : [0, 0, 0]));
  const near = (st: RisoPrintSettings) => mean(patch(disc, st, -96, -3, -94, 3));
  close(near(clean({ night: 1 })), PAPER, 0.06, 'in register: inside the white disc is paper');
  const slipped = near(clean({ night: 1, offsets: { pink: [12, 0] } }));
  close(slipped, risoPrinted([1, 0, cov('#FFFFFF', 1)[2]]), 0.03, 'the pink plate slid right: pink shows inside the left rim');
  const offsets = misregistration(150, [96, 192], 12);
  const st = resolveRiso({ amount: 1, offsets });
  assert.deepEqual(st.offsets, offsets);
  assert.ok(Object.values(offsets).some(([x, y]) => Math.hypot(x, y) > 1), 'between beats the plates are apart');
  assert.ok(Object.values(misregistration(192, [96, 192], 12)).every(([x, y]) => x === 0 && y === 0), 'on the beat they are in register');
});

test('powered: the room goes to the void, the ink to near-black, and bright strokes burn in their own tube’s colour', () => {
  assert.ok(luma(mean(patch(flat([0, 0, 0]), clean({ night: 1, power: 1 }), -20, -20, 20, 20))) < 0.02, 'printed space with the light out');
  const dusk = luma(mean(patch(flat([0, 0, 0]), clean({ night: 0, power: 0.5 }), -20, -20, 20, 20)));
  assert.ok(dusk > 0.02 && dusk < luma(PAPER) * 0.8, `half power is dusk: ${dusk}`);
  const cyan = linear('#3FE0FF');
  const amber = linear('#FFB23E');
  const line = (c: RGB) => picture((x) => (Math.abs(x) < 1.5 ? c : [0, 0, 0]));
  const on = (c: RGB, power: number) => risoPrintAt(line(c), [960.5, 540.5], HD, clean({ night: 1, power }), PACKED, G);
  const lit = on(cyan, 1);
  assert.ok(lit[2] > 0.5 && lit[1] > 0.5 && lit[0] < 0.3 * lit[2], `a cyan stroke burns cyan: ${lit}`);
  const warm = on(amber, 1);
  assert.ok(warm[0] > warm[1] && warm[1] > warm[2] && warm[0] > 0.5, `an amber stroke burns amber: ${warm}`);
  assert.ok(luma(risoPrintAt(line(cyan), [960.5 + 40, 540.5], HD, clean({ night: 1, power: 1 }), PACKED, G)) < 0.02, 'away from it, the dark');
  const unpowered = on(cyan, 0);
  assert.ok(unpowered.every((v, i) => v <= PAPER[i]) && unpowered[2] > unpowered[0], `unpowered it is blue ink, no light: ${unpowered}`);
  const w = risoNeonWeights([0.25, 0.88, 1]);
  assert.ok(w[1] > 0.9 && w[0] < 0.1 && w[2] < 0.1, `cyan → the blue tube: ${w}`);
  const p = risoNeonWeights([1, 0.24, 0.55]);
  assert.ok(p[0] > 0.9 && p[1] < 0.1, `pink → the pink tube: ${p}`);
  const a = risoNeonWeights([1, 0.7, 0.24]);
  assert.ok(a[2] > 0.9 && a[1] < 0.1, `amber → the yellow tube: ${a}`);
  assert.deepEqual(risoNeonWeights([0.6, 0.6, 0.6]), [0, 1, 0], 'grey light → cyan');
});

test('the dark arrives as a coarse printed screen (C), or with voidPitch 0 as a smooth fade', () => {
  const spread = (cs: readonly RGB[]) => Math.max(...cs.map(luma)) - Math.min(...cs.map(luma));
  const screened = patch(flat([0, 0, 0]), clean({ night: 0, power: 0.5 }), -40, -40, 40, 40);
  const smooth = patch(flat([0, 0, 0]), clean({ night: 0, power: 0.5, voidPitch: 0 }), -40, -40, 40, 40);
  assert.ok(spread(screened) > 0.5, `half power, 40 px screen: a checkerboard of void (${spread(screened)})`);
  assert.ok(spread(smooth) < 1e-9, 'voidPitch 0: an even dusk');
  close(mean(smooth), mean(screened), 0.12, 'about as dark either way');
});

test('the light zone holds the room light round a point as the power rises', () => {
  const st = clean({ night: 0, power: 1, light: { x: 0, y: 0, r0: 100, r1: 300 } });
  close(mean(patch(flat([0, 0, 0]), st, -10, -10, 10, 10)), PAPER, 1e-6, 'inside r0: paper');
  assert.ok(luma(mean(patch(flat([0, 0, 0]), st, 800, 400, 820, 420))) < 0.005, 'beyond r1: the void');
});

test('amount 0 leaves the input exactly; amount ½ is half way', () => {
  const sample = picture((x, y) => [Math.abs(x) / 960, Math.abs(y) / 540, 0.3]);
  for (const frag of [[100.5, 200.5], [960.5, 540.5], [1500.5, 1000.5]] as const) {
    assert.deepEqual(risoPrintAt(sample, frag, HD, resolveRiso({ amount: 0, night: 1 }), PACKED, G), sample(frag[0] / 1920, frag[1] / 1080));
    const full = risoPrintAt(sample, frag, HD, resolveRiso({ amount: 1, night: 1 }), PACKED, G);
    const half = risoPrintAt(sample, frag, HD, resolveRiso({ amount: 0.5, night: 1 }), PACKED, G);
    const input = sample(frag[0] / 1920, frag[1] / 1080);
    close(half, [(full[0] + input[0]) / 2, (full[1] + input[1]) / 2, (full[2] + input[2]) / 2], 1e-12, 'half');
  }
});

test('a 4K frame is the 1080p print, scaled: the same patch averages to the same colour', () => {
  for (const night of [0, 1]) {
    const st = resolveRiso({ amount: 1, night });
    const grey = flat(linear('#7A6F90'));
    close(mean(patch(grey, st, -30, -30, 30, 30, UHD)), mean(patch(grey, st, -30, -30, 30, 30, HD)), 0.006, `night ${night}`);
  }
});

test('the effect is off (no table, the pass skipped) at amount 0, builds its table once, and takes the look', () => {
  let made = 0;
  const fx = new RisoPrintEffect(() => {
    made++;
    return buildRisoLut(3);
  });
  fx.setSize(3840, 2160);
  assert.equal(fx.uniforms.get('scale')!.value, 2, 'sizes are 1080p px, scaled to the render');
  assert.equal(fx.configure(undefined), false);
  assert.equal(fx.configure({ amount: 0, night: 1 }), false);
  assert.equal(made, 0, 'no table until something prints');
  assert.equal(fx.uniforms.get('amount')!.value, 0);
  const look: RisoPrintLook = {
    amount: 1.4,
    night: 0.25,
    power: 0.5,
    pitch: 12,
    offsets: { pink: [3, -2], yellow: [1, 4] },
    screen: { x: 10, y: -20, zoom: 1.5, roll: 0.1 },
    light: { x: 5, y: 6, r0: 100, r1: 50 },
    neon: { dots: 0.5 },
  };
  assert.equal(fx.configure(look), true);
  assert.equal(fx.configure(look), true);
  assert.equal(made, 1, 'one table, built on the first print');
  const u = fx.uniforms;
  assert.equal(u.get('amount')!.value, 1, 'amount clamps to 1');
  assert.equal(u.get('night')!.value, 0.25);
  assert.equal(u.get('power')!.value, 0.5);
  assert.equal(u.get('pitch')!.value, 12);
  assert.deepEqual((u.get('offPink')!.value as THREE.Vector2).toArray(), [3, -2]);
  assert.deepEqual((u.get('offBlue')!.value as THREE.Vector2).toArray(), [0, 0]);
  assert.deepEqual((u.get('offYellow')!.value as THREE.Vector2).toArray(), [1, 4]);
  assert.equal(u.get('inRegister')!.value, 0);
  assert.deepEqual((u.get('anchor')!.value as THREE.Vector4).toArray(), [10, -20, 1.5, 0.1]);
  const zone = (u.get('lightZone')!.value as THREE.Vector4).toArray();
  assert.deepEqual(zone.slice(0, 3), [5, 6, 100]);
  assert.ok(zone[3] > 100, 'r1 is kept beyond r0');
  assert.deepEqual((u.get('neonGain')!.value as THREE.Vector2).toArray(), [1, 0.5]);
  assert.equal(u.get('voidPitch')!.value, 40, 'the void screen defaults to prototype C’s 40 px');
  assert.equal(u.get('lutSize')!.value, 3);
  const tex = u.get('lut')!.value as THREE.DataTexture;
  assert.ok(tex instanceof THREE.DataTexture);
  assert.deepEqual([tex.image.width, tex.image.height], [9, 6]);
  assert.equal(tex.magFilter, THREE.LinearFilter);
  assert.equal(fx.configure({ amount: 1 }), true);
  assert.equal(u.get('inRegister')!.value, 1, 'all plates at 0: one set of taps');
  assert.deepEqual((u.get('lightZone')!.value as THREE.Vector4).toArray(), [0, 0, 0, 0], 'no light zone');
  fx.dispose();
  assert.equal(u.get('lut')!.value, null);
});

test('mixRisoPrint blends the numbers, fades in a side that has no print, and takes the light zone from the nearer side', () => {
  assert.equal(mixRisoPrint(undefined, undefined, 0.5), undefined);
  const a: RisoPrintLook = { amount: 1, night: 0, power: 0, offsets: { pink: [10, 0] }, light: { x: 0, y: 0, r0: 10, r1: 20 } };
  const b: RisoPrintLook = { amount: 1, night: 1, power: 1, offsets: { pink: [0, 0] } };
  const m = mixRisoPrint(a, b, 0.25)!;
  assert.equal(m.night, 0.25);
  assert.equal(m.power, 0.25);
  assert.deepEqual(m.offsets!.pink, [7.5, 0]);
  assert.deepEqual(m.light, resolveRiso(a).light);
  assert.equal(mixRisoPrint(a, b, 0.75)!.light, undefined);
  const fade = mixRisoPrint(undefined, b, 0.3)!;
  assert.ok(Math.abs(fade.amount - 0.3) < 1e-12);
  assert.equal(fade.night, 1, 'the missing side borrows the other’s settings');
  assert.equal(mixRisoPrint(a, undefined, 1)!.amount, 0);
});
