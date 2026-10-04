// The dot screen the print effects share (src/engine/post/dotScreen.ts): the tone tables, the screen, the hash noise, where a
// pixel is; and static checks of the two shaders that carry the chunk (src/engine/post/risoPrint.ts, comicInk.ts). The GPU
// itself is not available in Node: the integrator checks the pictures with stills.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linear, srgb8 } from '../src/engine/color.ts';
import { ComicInkEffect } from '../src/engine/post/comicInk.ts';
import {
  DOT_SCREEN_GLSL, EUCLID_THRESHOLDS, MOIRE_FLAT, MOIRE_START, ROUND_RADII, ROUND_TOUCH, TABLE_STEPS, decode, encode, euclidCoverage, euclidThreshold,
  hash2, pcg, planePoint, roundArea, roundRadius, screenInk, screenPx, uvOf, valueNoise,
} from '../src/engine/post/dotScreen.ts';
import { RisoPrintEffect } from '../src/engine/post/risoPrint.ts';
import { buildRisoLut } from '../src/engine/post/risoModel.ts';
import { type View, viewMatrix } from '../src/engine/view.ts';

const deg = (d: number) => (d * Math.PI) / 180;

/** Mean ink over a w × h (1080p px) patch sampled at the centres of device pixels `px` device px per 1080p px. */
const meanInk = (cover: number, pitch: number, angle: number, shape: number, px: number, w = 200, h = 200, rough = 0) => {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < h * px; y++) {
    for (let x = 0; x < w * px; x++) {
      sum += screenInk([(x + 0.5) / px + 3.7, (y + 0.5) / px - 11.3], cover, pitch, angle, shape, px, rough, 7);
      n++;
    }
  }
  return sum / n;
};

test('the tables give each tone exactly: a disc of roundRadius(c), and the Euclidean spot above euclidThreshold(c), cover c of a cell', () => {
  for (let i = 0; i <= 128; i++) {
    const c = i / 128;
    assert.ok(Math.abs(roundArea(roundRadius(c)) - c) < 2e-3, `round ${c}: ${roundArea(roundRadius(c))}`);
    assert.ok(Math.abs(euclidCoverage(euclidThreshold(c)) - c) < 2e-3, `euclid ${c}: ${euclidCoverage(euclidThreshold(c))}`);
  }
  assert.equal(ROUND_RADII.length, TABLE_STEPS + 1);
  assert.equal(EUCLID_THRESHOLDS.length, TABLE_STEPS + 1);
  assert.equal(roundRadius(ROUND_TOUCH), 0.5, 'round dots touch at π/4');
  assert.equal(euclidThreshold(0.5), 0, 'the Euclidean spot is a checkerboard at 50 %');
  assert.equal(EUCLID_THRESHOLDS[0], 1);
  assert.equal(EUCLID_THRESHOLDS[TABLE_STEPS], -1);
});

test('a screen inks its tone: over 400 dots the mean ink is the tone within 0.01, both spots, any angle, at 1080p and at 4K', () => {
  for (const shape of [0, 1]) {
    for (const cover of [0.03, 0.1, 0.25, 0.5, 0.75, 0.9, 0.97]) {
      for (const angle of [0, deg(15), deg(45), deg(75)]) {
        const m = meanInk(cover, 10, angle, shape, 1);
        assert.ok(Math.abs(m - cover) < 0.01, `shape ${shape}, tone ${cover}, ${angle.toFixed(2)} rad at 1080p: ${m.toFixed(4)}`);
      }
      const k = meanInk(cover, 10, deg(15), shape, 2, 100, 100);
      assert.ok(Math.abs(k - cover) < 0.01, `shape ${shape}, tone ${cover} at 4K: ${k.toFixed(4)}`);
    }
  }
});

test('tone 0 is no ink and tone 1 is solid ink, everywhere and at any pitch', () => {
  for (let i = 0; i < 200; i++) {
    const p = [hash2(i, 0, 1) * 2000 - 1000, hash2(i, 1, 1) * 2000 - 1000] as const;
    for (const shape of [0, 1]) {
      for (const pitch of [1, 10, 30]) {
        assert.equal(screenInk(p, 0, pitch, 0.3, shape, 1, 0.35, 3), 0);
        assert.equal(screenInk(p, 1, pitch, 0.3, shape, 1, 0.35, 3), 1);
      }
    }
  }
});

test('dots sit on a lattice turned by the angle: a dot on every pitch step along the rows and across them', () => {
  for (const angle of [0, deg(15), deg(45), deg(75)]) {
    const along = [10 * Math.cos(angle), 10 * Math.sin(angle)];
    const across = [-10 * Math.sin(angle), 10 * Math.cos(angle)];
    for (let i = 0; i < 50; i++) {
      const p = [hash2(i, 2, 5) * 500, hash2(i, 3, 5) * 500] as const;
      for (const shape of [0, 1]) {
        const v = screenInk(p, 0.4, 10, angle, shape, 1);
        assert.ok(Math.abs(screenInk([p[0] + along[0], p[1] + along[1]], 0.4, 10, angle, shape, 1) - v) < 1e-6);
        assert.ok(Math.abs(screenInk([p[0] - 3 * across[0], p[1] - 3 * across[1]], 0.4, 10, angle, shape, 1) - v) < 1e-6);
      }
    }
    // A round dot is centred on the lattice point and the cell corner is bare.
    assert.equal(screenInk([0, 0], 0.2, 10, angle, 0, 1), 1);
    assert.equal(screenInk([(along[0] + across[0]) / 2, (along[1] + across[1]) / 2], 0.2, 10, angle, 0, 1), 0);
  }
});

test('round dots are discs: the ink falls from 1 to 0 across one device px at radius √(c/π) · pitch, in every direction', () => {
  const pitch = 20;
  const r = Math.sqrt(0.3 / Math.PI) * pitch;
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    const at = (d: number) => screenInk([d * Math.cos(a), d * Math.sin(a)], 0.3, pitch, deg(45), 0, 1);
    assert.equal(at(r - 0.6), 1);
    assert.equal(at(r + 0.6), 0);
    assert.ok(Math.abs(at(r) - 0.5) < 1e-6);
    // At 4K the edge is twice as sharp, at the same 1080p radius.
    const at4k = (d: number) => screenInk([d * Math.cos(a), d * Math.sin(a)], 0.3, pitch, deg(45), 0, 2);
    assert.equal(at4k(r - 0.3), 1);
    assert.equal(at4k(r + 0.3), 0);
    assert.ok(Math.abs(at4k(r) - 0.5) < 1e-6);
  }
});

test('a screen finer than 2.5 device px prints its flat tone (no moiré); from 5 device px it is fully dotted', () => {
  for (const cover of [0.2, 0.5, 0.8]) {
    for (let i = 0; i < 40; i++) {
      const p = [hash2(i, 4, 9) * 300, hash2(i, 5, 9) * 300] as const;
      assert.equal(screenInk(p, cover, MOIRE_FLAT, 0.2, 1, 1), cover);
      assert.equal(screenInk(p, cover, 2, 0.2, 0, 1), cover);
      assert.equal(screenInk(p, cover, 1, 0.2, 0, 2), cover, '1 px pitch at 4K is 2 device px: flat');
    }
  }
  assert.equal(screenInk([0, 0], 0.3, MOIRE_START, 0, 0, 1), 1, 'the dot centre is solid at 5 px');
  assert.equal(screenInk([2.5, 2.5], 0.3, MOIRE_START, 0, 0, 1), 0, 'and the cell corner bare');
});

test('rough edges keep the tone and stay within `rough` px of the true edge', () => {
  for (const cover of [0.2, 0.5, 0.8]) assert.ok(Math.abs(meanInk(cover, 10, deg(75), 1, 1, 200, 200, 0.35) - cover) < 0.012);
  const r = Math.sqrt(0.3 / Math.PI) * 20;
  for (let k = 0; k < 64; k++) {
    const a = (k * Math.PI) / 32;
    assert.equal(screenInk([(r - 1.0) * Math.cos(a), (r - 1.0) * Math.sin(a)], 0.3, 20, 0, 0, 1, 0.35, 5), 1);
    assert.equal(screenInk([(r + 1.0) * Math.cos(a), (r + 1.0) * Math.sin(a)], 0.3, 20, 0, 0, 1, 0.35, 5), 0);
  }
});

test('the hash is GLSL uint arithmetic: pcg matches a BigInt reference, hashes are uniform in [0, 1), seeded and deterministic', () => {
  // The tsconfig targets ES2018, so BigInts are built with BigInt() rather than literals.
  const B = (n: number) => BigInt(n);
  const M = B(2) ** B(32);
  const ref = (v: number): number => {
    const state = (B(v >>> 0) * B(747796405) + B(2891336453)) % M;
    const word = (((state >> ((state >> B(28)) + B(4))) ^ state) * B(277803737)) % M;
    return Number((word >> B(22)) ^ word);
  };
  for (const v of [0, 1, 2, 7, 1048576, 2 ** 31, 2 ** 32 - 1, 123456789, 3141592653]) assert.equal(pcg(v), ref(v), `pcg(${v})`);
  for (let i = 0; i < 2000; i++) assert.equal(pcg(i * 7919), ref(i * 7919));
  let sum = 0;
  for (let i = 0; i < 20000; i++) {
    const h = hash2(i % 141 - 70, Math.floor(i / 141) - 70, 3);
    assert.ok(h >= 0 && h < 1);
    sum += h;
  }
  assert.ok(Math.abs(sum / 20000 - 0.5) < 0.01);
  assert.equal(hash2(-5, 12, 9), hash2(-5, 12, 9));
  assert.notEqual(hash2(-5, 12, 9), hash2(-5, 12, 10));
  assert.notEqual(hash2(-5, 12, 9), hash2(12, -5, 9));
});

test('value noise is smooth, in [−1, 1], and equals the lattice hash on the lattice', () => {
  for (let i = 0; i < 500; i++) {
    const x = hash2(i, 6, 2) * 400 - 200;
    const y = hash2(i, 7, 2) * 400 - 200;
    const n = valueNoise(x, y, 4);
    assert.ok(n >= -1 && n <= 1);
    assert.ok(Math.abs(valueNoise(x + 0.01, y, 4) - n) < 0.04, 'continuous');
  }
  assert.equal(valueNoise(3, -8, 4), 2 * hash2(3, -8, 4) - 1);
});

test('where a pixel is: screenPx and uvOf match the pass uv; planePoint inverts engine/view.ts exactly', () => {
  for (const res of [[1920, 1080], [3840, 2160]] as const) {
    assert.deepEqual(screenPx([res[0] / 2, res[1] / 2], res), [0, 0]);
    assert.deepEqual(screenPx([res[0], res[1]], res), [960, 540]);
    for (let i = 0; i < 20; i++) {
      const frag = [hash2(i, 8, 1) * res[0], hash2(i, 9, 1) * res[1]] as const;
      const uv = uvOf(screenPx(frag, res), res);
      assert.ok(Math.abs(uv[0] - frag[0] / res[0]) < 1e-12 && Math.abs(uv[1] - frag[1] / res[1]) < 1e-12);
    }
  }
  const views: View[] = [{ zoom: 1, x: 0, y: 0, roll: 0 }, { zoom: 1.6, x: 120, y: -45, roll: 0.3 }, { zoom: 0.7, x: -300, y: 210, roll: -1.2 }];
  for (const v of views) {
    const m = viewMatrix(v);
    for (let i = 0; i < 20; i++) {
      const s = [hash2(i, 10, 2) * 1920 - 960, hash2(i, 11, 2) * 1080 - 540] as const;
      const u = s[0] / 1920 + 0.5;
      const w = s[1] / 1080 + 0.5;
      const frame = [(m[0] * u + m[3] * w + m[6] - 0.5) * 1920, (m[1] * u + m[4] * w + m[7] - 0.5) * 1080];
      const q = planePoint(s, v);
      assert.ok(Math.abs(q[0] - frame[0]) < 1e-9 && Math.abs(q[1] - frame[1]) < 1e-9, `${JSON.stringify(v)}: ${q} vs ${frame}`);
    }
  }
});

test('the dots ride the anchor: zoomed 2×, the screen repeats every 2 pitches on screen', () => {
  const anchor = { x: 37, y: -12, zoom: 2, roll: 0 };
  for (let i = 0; i < 30; i++) {
    const s = [hash2(i, 12, 3) * 400, hash2(i, 13, 3) * 400] as const;
    const at = (p: readonly [number, number]) => screenInk(planePoint(p, anchor), 0.4, 10, 0, 1, 2);
    assert.ok(Math.abs(at([s[0] + 20, s[1]]) - at(s)) < 1e-9);
  }
});

test('sRGB coding round-trips and matches engine/color.ts', () => {
  for (let i = 0; i <= 100; i++) assert.ok(Math.abs(decode(encode(i / 100)) - i / 100) < 1e-12);
  for (let v = 0; v < 256; v += 5) {
    const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
    assert.ok(Math.abs(decode(v / 255) - linear(hex)[0]) < 1e-12, hex);
    assert.equal(srgb8([decode(v / 255), 0, 0])[0], v);
  }
});

// ---------------------------------------------------------------------------------------------------------------------------
// Static checks of the shaders (what tsc cannot see in a template string).

const shaders = (): [string, string, ReadonlyMap<string, unknown>][] => {
  const riso = new RisoPrintEffect(() => buildRisoLut(2));
  const comic = new ComicInkEffect();
  return [
    ['RisoPrintEffect', riso.getFragmentShader()!, riso.uniforms],
    ['ComicInkEffect', comic.getFragmentShader()!, comic.uniforms],
  ];
};

test('both shaders carry the chunk with the very tables the reference uses', () => {
  for (const [name, glsl] of shaders()) {
    assert.ok(glsl.includes(DOT_SCREEN_GLSL), name);
    assert.ok(DOT_SCREEN_GLSL.includes(ROUND_RADII.map((v) => v.toFixed(7)).join(', ')));
    assert.ok(DOT_SCREEN_GLSL.includes(EUCLID_THRESHOLDS.map((v) => v.toFixed(7)).join(', ')));
  }
});

test('every uniform a shader declares is in its effect’s map and the other way round', () => {
  const builtIn = new Set(['inputBuffer', 'resolution', 'texelSize', 'cameraNear', 'cameraFar', 'aspect', 'time']);
  for (const [name, glsl, uniforms] of shaders()) {
    const declared = new Set([...glsl.matchAll(/^\s*uniform\s+\w+\s+(\w+)/gm)].map((m) => m[1]));
    for (const u of declared) assert.ok(uniforms.has(u) || builtIn.has(u), `${name}: ${u} declared but not in the map`);
    for (const u of uniforms.keys()) assert.ok(declared.has(u), `${name}: ${u} in the map but not declared`);
  }
});

test('every function is declared before it is called; smoothstep edges ascend; no GLSL ES 3 reserved word names a variable', () => {
  const reserved = /\b(?:float|int|uint|bool|vec[234]|ivec[234]|uvec[234])\s+(half|sample|input|output|filter|smooth|flat|common|active|partition|resource|patch|fixed|long|short|cast|class|union|interface|external|namespace|using|sizeof|template|this|goto|inline|noinline|public|static|extern|superp|centroid|invariant|precision|buffer|shared|texture)\b/;
  for (const [name, glsl] of shaders()) {
    const decl = new Map<string, number>();
    for (const m of glsl.matchAll(/\b(?:float|vec[234]|void|uint|int)\s+((?:kx|rp|ci)[A-Z]\w*)\s*\(/g)) decl.set(m[1], m.index!);
    assert.ok(decl.size > 5, name);
    for (const m of glsl.matchAll(/\b((?:kx|rp|ci)[A-Z]\w*)\s*\(/g)) {
      const at = decl.get(m[1]);
      assert.ok(at !== undefined, `${name}: ${m[1]} is never declared`);
      assert.ok(at <= m.index!, `${name}: ${m[1]} called before its declaration`);
    }
    for (const m of glsl.matchAll(/smoothstep\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,/g)) assert.ok(Number(m[1]) < Number(m[2]), `${name}: ${m[0]}`);
    assert.equal(reserved.exec(glsl), null, name);
    const count = (re: RegExp) => (glsl.match(re) ?? []).length;
    assert.equal(count(/\{/g), count(/\}/g), `${name}: braces`);
    assert.equal(count(/\(/g), count(/\)/g), `${name}: parentheses`);
  }
});
