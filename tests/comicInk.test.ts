// The comic-book post pass: the palette, posterisation and Ben-Day shading, keylines, misregistration and speed lines (the
// shader's maths in TypeScript, src/engine/post/comicModel.ts) and the effect's set-up (src/engine/post/comicInk.ts). The GPU
// picture is checked by the integrator's stills.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { type RGB, linear } from '../src/engine/color.ts';
import { ComicInkEffect } from '../src/engine/post/comicInk.ts';
import {
  COMIC_INKS, COMIC_INK_DEFAULTS, COMIC_PALETTE, type ComicInkLook, type ComicInkSettings, type Sampler, type SpeedLines, comicActive, comicInkAt, comicKeyAt, comicKeyDotsAt,
  comicLevels, comicPlateAt, comicTone, lineReach, mixComicInk, nearestInk, resolveComic, speedLineInk,
} from '../src/engine/post/comicModel.ts';
import { type Vec2, decodeRGB, encodeRGB, hash2 } from '../src/engine/post/dotScreen.ts';

const HD: Vec2 = [1920, 1080];
const ST = resolveComic({ amount: 1 });
const PAPER = ST.paper;
const KEY = ST.key;
const SHADE = ST.shade;
const flat = (c: RGB): Sampler => () => c;
const picture = (f: (x: number, y: number) => RGB): Sampler => (u, v) => f((Math.min(1, Math.max(0, u)) - 0.5) * 1920, (Math.min(1, Math.max(0, v)) - 0.5) * 1080);
/** The printed page (colour plates, key plate, keylines) over a size × size patch of 1080p device px, through the whole model. */
const prints = (sample: Sampler, st: ComicInkSettings = ST, size = 64): RGB[] => {
  const out: RGB[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.push(comicInkAt(sample, [x + 0.5 + 1171, y + 0.5 + 443], HD, st));
  return out;
};
const mean = (cs: readonly RGB[]): RGB => [0, 1, 2].map((c) => cs.reduce((s, x) => s + x[c], 0) / cs.length) as unknown as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const close = (a: RGB, b: RGB, tol: number, msg: string) => assert.ok(a.every((v, i) => Math.abs(v - b[i]) < tol), `${msg}: ${a.map((v) => v.toFixed(4))} vs ${b.map((v) => v.toFixed(4))}`);
/** A display-space mix of two linear colours, back to linear: the colour the eye reads half way between them. */
const between = (a: RGB, b: RGB, t: number): RGB => decodeRGB(mix(encodeRGB(a), encodeRGB(b), t));

test('the palette is the club’s (club3 §7.1); defaults: 16 px Ben-Day, 4 tints, 6 px keylines, plates 1.5 px off register', () => {
  assert.deepEqual(COMIC_PALETTE, { paper: '#FDF3D8', key: '#111111', night: '#23215E', cyan: '#19B8E6', pink: '#F2499B', lemon: '#FFF0A0', amber: '#FFB23E', red: '#E8402B' });
  assert.deepEqual(PAPER, linear(COMIC_PALETTE.paper));
  assert.deepEqual(SHADE, linear(COMIC_PALETTE.night));
  assert.equal(ST.pitch, 16);
  assert.equal(ST.levels, 4);
  assert.equal(ST.outline, 6);
  assert.deepEqual(ST.offsets, { c: [1.5, -1], m: [1.5, -1], y: [1.5, -1] });
  assert.equal(COMIC_INKS.length, 6);
});

test('every palette colour prints as itself, solid; white is the page and black the key', () => {
  for (const ink of COMIC_INKS) for (const p of prints(flat(ink.color), ST, 24)) close(p, ink.color, 1e-9, `ink ${encodeRGB(ink.color)}`);
  for (const p of prints(flat([1, 1, 1]), ST, 24)) close(p, PAPER, 1e-9, 'white');
  for (const p of prints(flat(PAPER), ST, 24)) close(p, PAPER, 1e-9, 'paper');
  for (const p of prints(flat([0, 0, 0]), ST, 24)) close(p, KEY, 1e-9, 'black');
});

test('pixels snap to the ink nearest their hue: skin to red (Lichtenstein), sky to cyan, a neon cyan to cyan, orange to amber', () => {
  const inkOf = (hex: string) => nearestInk(encodeRGB(linear(hex)), COMIC_INKS);
  assert.equal(inkOf('#F0B090'), 3);
  assert.equal(inkOf('#80C0F0'), 0);
  assert.equal(inkOf('#3FE0FF'), 0);
  assert.equal(inkOf('#FF9020'), 2);
  assert.equal(inkOf('#FF60C0'), 1);
  assert.equal(inkOf('#3020A0'), 5);
});

test('lighter than its ink: the ink’s dots on paper; darker: shade dots over the ink; greys: key dots on paper', () => {
  const cyan = COMIC_INKS[0].color;
  const red = COMIC_INKS[3].color;
  close(mean(prints(flat(between(PAPER, cyan, 0.5)))), mix(PAPER, cyan, 0.5), 0.02, 'half-tint cyan');
  close(mean(prints(flat(between(PAPER, cyan, 0.25)))), mix(PAPER, cyan, 0.25), 0.02, 'quarter-tint cyan');
  const shadowed = decodeRGB(encodeRGB(red).map((v) => v * 0.55) as unknown as RGB);
  const depth = comicLevels(comicTone(encodeRGB(shadowed), encodeRGB(red), encodeRGB(SHADE)), 4);
  assert.equal(depth, 0.5);
  close(mean(prints(flat(shadowed))), mix(red, SHADE, depth), 0.02, 'red in shadow');
  const grey: RGB = [0.2, 0.2, 0.2];
  const tone = comicLevels(comicTone(encodeRGB(grey), encodeRGB(PAPER), encodeRGB(KEY)), 4);
  assert.equal(tone, 0.5);
  close(mean(prints(flat(grey))), mix(PAPER, KEY, tone), 0.02, 'grey');
});

test('levels snap the tone to flat tints; levels 1 is flat colour: every pixel exactly the page, an ink, the shade or the key', () => {
  assert.deepEqual([0, 0.1, 0.13, 0.4, 0.62, 0.9, 1.2].map((a) => comicLevels(a, 4)), [0, 0, 0.25, 0.5, 0.5, 1, 1]);
  assert.equal(comicLevels(0.37, 0), 0.37);
  const flatSt = resolveComic({ amount: 1, levels: 1 });
  const allowed = [PAPER, KEY, SHADE, ...COMIC_INKS.map((i) => i.color)];
  for (const hex of ['#F0B090', '#80C0F0', '#701010', '#FF9020', '#3FE0FF', '#8040C0']) {
    for (const p of prints(flat(linear(hex)), flatSt, 32)) assert.ok(allowed.some((c) => c.every((v, i) => Math.abs(v - p[i]) < 1e-12)), `${hex}: ${p}`);
  }
});

test('Ben-Day dots are round, laid on the ink’s own angle at the pitch, and ride the anchor', () => {
  const tint = flat(between(PAPER, COMIC_INKS[0].color, 0.25));
  const a = COMIC_INKS[0].angle;
  for (let i = 0; i < 40; i++) {
    const s: Vec2 = [hash2(i, 0, 4) * 600 - 300, hash2(i, 1, 4) * 600 - 300];
    const at = (p: Vec2, st = ST) => comicPlateAt(tint, p, HD, st, 1);
    close(at([s[0] + 16 * Math.cos(a), s[1] + 16 * Math.sin(a)]), at(s), 1e-9, 'one pitch along the rows');
    close(at([s[0] - 16 * Math.sin(a), s[1] + 16 * Math.cos(a)]), at(s), 1e-9, 'one pitch across');
    const zoomed = resolveComic({ amount: 1, screen: { x: 0, y: 0, zoom: 2, roll: 0 } });
    close(comicPlateAt(tint, [s[0] + 32 * Math.cos(a), s[1] + 32 * Math.sin(a)], HD, zoomed, 2), comicPlateAt(tint, s, HD, zoomed, 2), 1e-9, 'zoomed 2×: two pitches on screen');
  }
});

test('keylines: a shape on the page gets a K line just inside its rim, `outline` px wide; the page stays clean', () => {
  const cyan = COMIC_INKS[0].color;
  const disc = picture((x, y) => (Math.hypot(x, y) < 200 ? cyan : PAPER));
  const key = (x: number, st = ST) => comicKeyAt(disc, [x, 0.25], HD, st);
  for (const d of [0.5, 2, 4, 5.5]) assert.equal(key(200 - d), 1, `${d} px inside`);
  assert.equal(key(193), 0, '7 px inside: the fill');
  assert.equal(key(0), 0);
  for (const d of [0.5, 3, 8]) assert.equal(key(200 + d), 0, `${d} px outside: the page`);
  assert.equal(key(197, resolveComic({ amount: 1, outline: 0 })), 0, 'outline 0: no keylines');
  assert.equal(key(190, resolveComic({ amount: 1, outline: 12 })), 1, 'a 12 px keyline');
  assert.equal(comicKeyAt(flat([0.3, 0.5, 0.1]), [10, 10], HD, ST), 0, 'a flat field has no edges');
  close(comicInkAt(disc, [960 + 198.5, 540.5], HD, ST), KEY, 1e-9, 'the pixel is key');
});

test('keylines go on the darker side, so a thin bright stroke on black survives (its K edge is on the black)', () => {
  const stroke = picture((x) => (Math.abs(x) < 1 ? [1, 1, 1] : [0, 0, 0]));
  assert.equal(comicKeyAt(stroke, [0, 0], HD, ST), 0);
  assert.equal(comicKeyAt(stroke, [3.5, 0], HD, ST), 1);
  const out = comicInkAt(stroke, [960.5, 540.5], HD, resolveComic({ amount: 1, offsets: { c: [0, 0], m: [0, 0], y: [0, 0] } }));
  close(out, PAPER, 1e-9, 'the stroke prints as the page');
});

test('the colour plates go out of register channel by channel (cyan = red light, magenta = green, yellow = blue); the key stays put', () => {
  const cyan = COMIC_INKS[0].color;
  const disc = picture((x, y) => (Math.hypot(x, y) < 200 ? cyan : PAPER));
  const frag: Vec2 = [960 + 205.5, 540.5];
  const slipped = resolveComic({ amount: 1, offsets: { c: [10, 0], m: [0, 0], y: [0, 0] } });
  close(comicInkAt(disc, frag, HD, slipped), [cyan[0], PAPER[1], PAPER[2]], 1e-9, 'the cyan plate slid 10 px right past the rim');
  close(comicInkAt(disc, frag, HD, ST), PAPER, 1e-9, 'all plates 1.5 px off together: still the page there');
});

test('greys print on the key plate, in register: the colour plates’ offsets never split a grey’s dots into colour', () => {
  const ramp = picture((x) => {
    const g = Math.min(1, Math.max(0, (x + 960) / 1920)) ** 2.2;
    return [g, g, g];
  });
  const wild = resolveComic({ amount: 1, offsets: { c: [6, 0], m: [0, 5], y: [-4, 3] } });
  const still = resolveComic({ amount: 1, offsets: { c: [0, 0], m: [0, 0], y: [0, 0] } });
  for (let i = 0; i < 300; i++) {
    const f: Vec2 = [hash2(i, 6, 3) * 1920, hash2(i, 7, 3) * 1080];
    const a = comicInkAt(ramp, f, HD, wild);
    close(a, comicInkAt(ramp, f, HD, still), 1e-12, `frag ${f}`);
    close(a, mix(PAPER, KEY, (a[0] - PAPER[0]) / (KEY[0] - PAPER[0])), 1e-9, 'a mix of page and key only');
  }
  assert.equal(comicKeyDotsAt(flat([1, 1, 1]), [5, 5], HD, ST, 1), 0, 'white: no key dots');
  assert.equal(comicKeyDotsAt(flat([0, 0, 0]), [5, 5], HD, ST, 1), 1, 'black: solid key');
  assert.equal(comicKeyDotsAt(flat(COMIC_INKS[1].color), [5, 5], HD, ST, 1), 0, 'an ink: nothing on the key plate');
});

test('amount 0 is the input untouched; ½ is half way; speed lines draw on their own', () => {
  const sample = picture((x, y) => [Math.abs(x) / 960, Math.abs(y) / 540, 0.4]);
  const frag: Vec2 = [700.5, 300.5];
  const input = sample(frag[0] / 1920, frag[1] / 1080);
  assert.deepEqual(comicInkAt(sample, frag, HD, resolveComic({ amount: 0 })), input);
  const full = comicInkAt(sample, frag, HD, ST);
  close(comicInkAt(sample, frag, HD, resolveComic({ amount: 0.5 })), mix(input, full, 0.5), 1e-12, 'half');
  const lines: SpeedLines = { kind: 'focus', x: 0, y: 0, count: 90, width: 30, inner: 0, seed: 1, amount: 1 };
  const look: ComicInkLook = { amount: 0, lines };
  assert.equal(comicActive(look), true);
  assert.equal(comicActive({ amount: 0 }), false);
  assert.equal(comicActive({ amount: 0, lines: { ...lines, amount: 0 } }), false);
  let inked = 0;
  for (let i = 0; i < 400; i++) {
    const f: Vec2 = [hash2(i, 2, 6) * 1920, hash2(i, 3, 6) * 1080];
    const out = comicInkAt(sample, f, HD, resolveComic(look));
    const k = speedLineInk(lines, [f[0] - 960, f[1] - 540], 1);
    close(out, mix(sample(f[0] / 1920, f[1] / 1080), KEY, k), 1e-12, 'lines in key over the input');
    if (k > 0.5) inked++;
  }
  assert.ok(inked > 20, `the lines show: ${inked} of 400`);
});

test('focus lines: the inner circle stays clear, `count · amount` lines, widening toward the frame edge, re-jittered by the seed', () => {
  const l: SpeedLines = { kind: 'focus', x: 0, y: 0, count: 60, width: 14, inner: 200, seed: 3, amount: 1 };
  const ring = (r: number, line = l) => Array.from({ length: 7200 }, (_, i) => speedLineInk(line, [r * Math.cos((i * Math.PI) / 3600), r * Math.sin((i * Math.PI) / 3600)], 1));
  assert.ok(ring(150).every((v) => v === 0), 'clear inside the inner radius');
  const runs = (v: number[]) => v.filter((x, i) => x > 0.5 && v[(i + v.length - 1) % v.length] <= 0.5).length;
  assert.equal(runs(ring(900)), 60);
  const half = runs(ring(900, { ...l, amount: 0.5 }));
  assert.ok(half > 18 && half < 42, `amount ½: ${half} lines`);
  const width = (r: number) => ring(r).reduce((s, x) => s + x, 0) * ((2 * Math.PI * r) / 7200);
  assert.ok(width(1000) > width(600) * 1.2, 'wider out toward the edge');
  const other = ring(900, { ...l, seed: 4 });
  assert.ok(ring(900).some((v, i) => Math.abs(v - other[i]) > 0.5), 'a new seed is a new set of lines');
  assert.ok(Math.abs(lineReach(l) - Math.hypot(960, 540)) < 1e-9);
  assert.ok(Math.abs(lineReach({ ...l, x: 960, y: 540 }) - Math.hypot(1920, 1080)) < 1e-9);
});

test('parallel speed lines run along their angle in dashes and keep clear of the subject', () => {
  const l: SpeedLines = { kind: 'parallel', x: 0, y: 0, angle: 0.3, count: 40, width: 8, inner: 150, seed: 2, amount: 1 };
  const dir: Vec2 = [Math.cos(0.3), Math.sin(0.3)];
  let same = 0;
  let total = 0;
  let inked = 0;
  for (let i = 0; i < 4000; i++) {
    const s: Vec2 = [hash2(i, 4, 8) * 1920 - 960, hash2(i, 5, 8) * 1080 - 540];
    const v = speedLineInk(l, s, 1);
    if (Math.hypot(s[0], s[1]) < 150) assert.equal(v, 0, 'clear round the subject');
    if (v > 0.5) {
      inked++;
      total++;
      if (speedLineInk(l, [s[0] + 4 * dir[0], s[1] + 4 * dir[1]], 1) > 0.25) same++;
    }
  }
  assert.ok(inked > 100, `${inked}`);
  assert.ok(same / total > 0.9, `streaks run along the angle: ${same}/${total}`);
});

test('the effect is off without a comic or lines, on for lines alone, and takes the look', () => {
  const fx = new ComicInkEffect();
  const u = fx.uniforms;
  fx.setSize(3840, 2160);
  assert.equal(u.get('scale')!.value, 2);
  assert.equal(fx.configure(undefined), false);
  assert.equal(fx.configure({ amount: 0 }), false);
  const lines: SpeedLines = { kind: 'parallel', x: 10, y: 20, angle: 0.5, count: 30.4, width: 6, inner: 100, seed: 7.2, amount: 0.8 };
  assert.equal(fx.configure({ amount: 0, lines }), true);
  assert.equal(u.get('amount')!.value, 0);
  assert.equal(u.get('lineKind')!.value, 2);
  assert.deepEqual((u.get('lineA')!.value as THREE.Vector4).toArray(), [10, 20, 0.5, 30]);
  assert.deepEqual((u.get('lineB')!.value as THREE.Vector4).toArray(), [6, 100, 7, 0.8]);
  assert.deepEqual((u.get('lineInk')!.value as THREE.Vector3).toArray(), [...KEY]);
  const look: ComicInkLook = { amount: 1, pitch: 20, levels: 2, outline: 8, offsets: { c: [4, 0] }, inks: COMIC_INKS.slice(0, 3), screen: { x: 1, y: 2, zoom: 1.5, roll: 0.2 } };
  assert.equal(fx.configure(look), true);
  assert.equal(u.get('amount')!.value, 1);
  assert.equal(u.get('pitch')!.value, 20);
  assert.equal(u.get('levels')!.value, 2);
  assert.equal(u.get('outline')!.value, 8);
  assert.deepEqual((u.get('offC')!.value as THREE.Vector2).toArray(), [4, 0]);
  assert.deepEqual((u.get('offM')!.value as THREE.Vector2).toArray(), [1.5, -1]);
  assert.equal(u.get('inRegister')!.value, 0);
  assert.equal(u.get('inkCount')!.value, 3);
  const shown = u.get('inkShown')!.value as THREE.Vector3[];
  const lin = u.get('inkLinear')!.value as THREE.Vector3[];
  assert.equal(shown.length, 8);
  close(shown[1].toArray() as unknown as RGB, encodeRGB(COMIC_INKS[1].color), 1e-6, 'display ink');
  assert.deepEqual(lin[2].toArray(), [...COMIC_INKS[2].color]);
  assert.deepEqual(lin[5].toArray(), [0, 0, 0], 'unused slots cleared');
  assert.deepEqual((u.get('inkAngle')!.value as number[]).slice(0, 3), COMIC_INKS.slice(0, 3).map((i) => i.angle));
  assert.equal(u.get('lineKind')!.value, 0, 'no lines');
  assert.deepEqual((u.get('anchor')!.value as THREE.Vector4).toArray(), [1, 2, 1.5, 0.2]);
  assert.equal(fx.configure({ amount: 1 }), true);
  assert.equal(u.get('inRegister')!.value, 1);
  fx.dispose();
});

test('mixComicInk blends the numbers, fades in a side without a comic, and takes the palette and lines from the nearer side', () => {
  assert.equal(mixComicInk(undefined, undefined, 0.3), undefined);
  const lines: SpeedLines = { kind: 'focus', x: 0, y: 0, count: 40, width: 10, inner: 50, seed: 1, amount: 1 };
  const a: ComicInkLook = { amount: 1, outline: 4, offsets: { c: [8, 0] }, lines };
  const b: ComicInkLook = { amount: 1, outline: 8, offsets: { c: [0, 0] }, inks: COMIC_INKS.slice(0, 2) };
  const m = mixComicInk(a, b, 0.25)!;
  assert.equal(m.outline, 5);
  assert.deepEqual(m.offsets!.c, [6, 0]);
  assert.deepEqual(m.lines, resolveComic(a).lines);
  assert.deepEqual(m.inks, COMIC_INK_DEFAULTS.inks);
  const n = mixComicInk(a, b, 0.75)!;
  assert.equal(n.lines, undefined);
  assert.equal(n.inks!.length, 2);
  const fade = mixComicInk(undefined, b, 0.4)!;
  assert.ok(Math.abs(fade.amount - 0.4) < 1e-12);
  assert.equal(fade.outline, 8);
});
