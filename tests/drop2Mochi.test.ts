// THE MOCHI WAVE (drop2 10–11 with DROP2_THREADS.waveStyle 'mochi'; src/shots/drop2Mochi*.ts, src/scenes/drop2WaveMochi.ts): the flag
// (the film's since 2026-10-03; v09's wave stays behind waveStyle 'v09': tests/drop2Wave.test.ts), the port's numbers against the prototype's acceptance
// (output/qa/wave-lab/final/port-spec.md §11: no hook, the halftone's coverage, his margins and tilt), the print's plates and the 120
// knock-out, the switch drafting exactly the key block, the film's hand-off into the arcade kept (ruling 1: the leap to the mothership,
// sprayAt's contract), the lettering's sub-flag (ruling 2), the kept furniture (ruling 3), D3 on every frame and purity.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import opentype from 'opentype.js';
import { MOCHI_ROWERS } from '../src/content/drop2Mochi.ts';
import { linear } from '../src/engine/color.ts';
import { Drop2Scene } from '../src/scenes/drop2.ts';
import { Drop2Switch } from '../src/scenes/drop2Switch.ts';
import { Drop2Wave } from '../src/scenes/drop2Wave.ts';
import { Drop2WaveMochi } from '../src/scenes/drop2WaveMochi.ts';
import * as D from '../src/score/drop2.ts';
import { FORMATION, GP, MOTHERSHIP, SIGNATURE_BITS, cellCentre } from '../src/shots/drop2ArcadeSprites.ts';
import { FUJI_FACES, LEAP_SPLASH, MOCHI_HEX, PRESS, ROUNDED_SPACE, defaultMochiFonts, mochiFrame, mochiHeroRect, mochiLook, mochiSprayAt, mochiTemporal, mochiTime, pressLines, wipeAt, wipeCover } from '../src/shots/drop2Mochi.ts';
import {
  CART,
  DRAFT_SEGS,
  atU,
  rebA,
  LEAP,
  N,
  WT,
  bez,
  camera,
  draftScreen,
  heroState,
  LAUNCH,
  launchEase,
  mainA,
  plateAt,
  toScreen,
  waveOutline,
  mainPose,
  fromScreen,
  whiteCov,
  whiteShare,
} from '../src/shots/drop2MochiKit.ts';
import { LAW } from '../src/shots/drop2Shared.ts';
import * as S from '../src/shots/drop2Switch.ts';
import { dockAt } from '../src/shots/drop2SwitchSlot.ts';
import { DROP2_THREADS, threadsOf } from '../src/shots/drop2Threads.ts';
import { MOUNTAIN_FACES } from '../src/shots/drop2WaveGeom.ts';
import { failedFills, visibleStraights } from './drop2WaveLines.ts';

const F0 = D.BURST;
const film = (local: number): number => F0 + local;
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);

test('the flag: the film draws the mochi by default (since 2026-10-03), its switch drafting the mochi; DROP2_THREADS.waveStyle "v09" still draws v09’s wave and its golden curl', () => {
  assert.deepEqual(DROP2_THREADS, { waveStyle: 'mochi', mochiSfx: true });
  const film0 = new Drop2Scene();
  assert.ok(film0.byName.wave instanceof Drop2WaveMochi);
  assert.ok(film0.byName.switch instanceof Drop2Switch);
  assert.equal((film0.byName.switch as unknown as { draft: string }).draft, 'mochi');
  const v09 = new Drop2Scene(undefined, threadsOf({ waveStyle: 'v09' }));
  assert.ok(v09.byName.wave instanceof Drop2Wave);
  assert.ok(!(v09.byName.wave instanceof Drop2WaveMochi));
  assert.equal((v09.byName.switch as unknown as { draft: string }).draft, 'curl');
});

test('the shutter: every sub-frame of output frame F is taken at F … F + 0.1 (a hit keyed to F is whole on F; a draft frame is the prototype’s F); 32 sub-frames round the film’s camera-energy accents', () => {
  for (const F of [film(0), film(24), film(96), film(150)]) {
    assert.equal(mochiTime(F), F - F0);
    for (const s of [-0.24, -0.1, 0.1, 0.24]) {
      const t = mochiTime(F + s);
      assert.ok(t >= F - F0 && t <= F - F0 + 0.1 + 1e-9, `${F - F0}${s}`);
    }
  }
  assert.equal(mochiTemporal(film(96)).samples, 32);
  assert.equal(mochiTemporal(film(60)).samples, 16);
});

test('the print (port-spec §3): key block on 10.1, the sky on 10.1e, pale, Prussian and red on the next 16ths, each dropped off register and snapping home; on 11.2 every plate but the stage lifts off and re-registers on 126 / 132', () => {
  const on = (p: Parameters<typeof plateAt>[0], f: number, stage = false) => plateAt(p, f, stage).on;
  assert.ok(on('key', 0) && !on('sky', 5) && on('sky', 6) && !on('pale', 11) && on('pale', 12) && !on('deep', 17) && on('deep', 18) && !on('red', 23) && on('red', 24));
  for (const [p, at] of [
    ['pale', 12],
    ['deep', 18],
    ['red', 24],
  ] as const) {
    const s = plateAt(p, at, false);
    assert.ok(Math.hypot(s.dx, s.dy) > 20, `${p} lands off register`);
    const later = plateAt(p, at + 9, false);
    assert.equal(Math.hypot(later.dx, later.dy), 0, `${p} in register`);
  }
  for (const p of ['sky', 'pale', 'deep', 'red'] as const) {
    assert.ok(!on(p, 120), `${p} lifted off on the stamp`);
    assert.ok(on(p, 120, true), `${p} stays on the stage`);
  }
  assert.ok(on('sky', 126) && on('pale', 126) && !on('deep', 131) && on('deep', 132) && on('red', 132));
});

test('the switch drafts exactly the key block: on 10.1 the six cubics it ruled lie within 2 px of the mochi’s keyline on screen', () => {
  const cam = camera(0);
  const A = mainA(0).map((p) => toScreen(cam, 1, p.x, p.y));
  const segs = draftScreen();
  assert.equal(segs.length, 6);
  let worst = 0;
  for (const s of segs)
    for (let i = 0; i <= 40; i++) {
      const [x, y] = bez(s, i / 40);
      worst = Math.max(worst, Math.min(...A.map((q) => Math.hypot(q[0] - x, q[1] - y))));
    }
  assert.ok(worst < 2, `${worst.toFixed(2)} px`);
  // The drafted pose is the rest outline at g .62 placed at (600, 900): the main pose of 10.1.
  const P = mainPose(0);
  assert.deepEqual([P.g, P.bx, P.by, P.sx, P.sy, P.lean, P.dent, P.rip], [0.62, 600, 900, 1, 1, 0, 0, 0]);
  assert.ok(Math.abs(DRAFT_SEGS[0][0] - (-700 * (0.55 + 0.45 * 0.62) + 600)) < 1e-9);
  // And the print's own keyline on 10.1 is drawn through those points (a stroke in the frame passes within 1 px of each).
  const fr = mochiFrame(F0);
  const strokes = fr.layers.flatMap((L) => L.vec).filter((v) => v.kind === 'stroke');
  for (const q of A.filter((_, i) => i % 20 === 0)) {
    const near = strokes.some((v) => {
      for (let i = 0; i < v.pts.length; i += 2) if (Math.hypot(v.pts[i] - q[0], v.pts[i + 1] - q[1]) < 1) return true;
      return false;
    });
    assert.ok(near, `the keyline passes (${q[0].toFixed(0)}, ${q[1].toFixed(0)})`);
  }
});

test('port-spec §11: the mochi never hooks while it rears and flops (84 → 100: no point turned back and up past u .55)', () => {
  for (let f = 84; f <= 100; f++) {
    const A = waveOutline(mainPose(WT(f)));
    for (const p of A) if (p.u >= 0.55 && p.u <= 0.95) assert.ok(!(p.tx < -0.05 && p.ty < -0.05), `${f}: hook at u ${p.u.toFixed(2)}`);
  }
});

test('port-spec §11 + ruling 4: the crash’s halftone white water covers ≥ 90 % of the screen on 11.1, drains in three steps (102 / 108 / 114) and is ≤ 1 % by 114, gone on 120', () => {
  assert.ok(whiteShare(95) < 0.4, `95: ${whiteShare(95)}`);
  assert.ok(whiteShare(96) >= 0.9, `96: ${whiteShare(96)}`);
  assert.ok(whiteShare(101) > whiteShare(102) && whiteShare(107) > whiteShare(108) + 0.1 && whiteShare(113) > whiteShare(114), 'steps');
  assert.ok(whiteShare(114) <= 0.01, `114: ${whiteShare(114)}`);
  assert.equal(whiteShare(120), 0);
  assert.ok(mochiFrame(film(96)).halftone, 'the halftone is on');
  assert.equal(mochiFrame(film(120)).halftone, null);
});

test('port-spec §11: his centre stays in x 240–1680, y 120–980 on every frame; he tilts ≤ 25° but in his three spins (85–93, 126–138, 156–168)', () => {
  for (let f = 0; f < N; f++) {
    if (f >= LEAP.bitmap) continue;
    const h = heroState(f);
    const [x, y] = h.screen ? [h.x, h.y] : toScreen(camera(f), 1, h.x, h.y);
    assert.ok(x >= 240 && x <= 1680 && y >= 120 && y <= 980, `${f}: (${x.toFixed(0)}, ${y.toFixed(0)})`);
    const spin = (f > 84 && f < 94) || (f > 125 && f < 139) || (f > 155 && f < 168);
    // (The prototype's measure: whole degrees.)
    const rot = Math.atan2(Math.sin(h.rot), Math.cos(h.rot));
    if (!spin) assert.ok(Math.round(Math.abs((rot * 180) / Math.PI)) <= 25, `${f}: tilt ${((rot * 180) / Math.PI).toFixed(0)}°`);
  }
});

test('ruling 1: the hand-off stays the film’s — on 11.4 he leaves the apex of his spin for the mothership, (•ω•) by 11.4& + 6, then the arcade’s bitmap; sprayAt’s contract holds (on 12.1 − 1 exactly the 27 copies’ cells are lit)', () => {
  const h0 = heroState(LEAP.from);
  assert.ok(h0.screen && h0.pose === 'cheer' && h0.brows === 1, 'the mini mie on the apex');
  const h1 = heroState(LEAP.bitmap - 1);
  assert.equal(h1.pose, 'base');
  assert.ok(Math.hypot(h1.x - MOTHERSHIP.cx, h1.y - MOTHERSHIP.cy) < 12, 'over the mothership');
  // The bitmap is drawn over the quantised picture from its frame (the arcade's HANDOFFS row).
  const top = mochiFrame(film(LEAP.bitmap)).top.vec.filter((v) => v.kind === 'fill' && v.color.every((c, i) => Math.abs(c - linear(LAW.hero)[i]) < 1e-6));
  assert.ok(top.length > 20, 'the mothership’s bitmap');
  assert.equal(mochiFrame(film(LEAP.bitmap - 1)).top.vec.filter((v) => v.kind === 'fill' && v.color.every((c, i) => Math.abs(c - linear(LAW.hero)[i]) < 1e-6)).length, 0);
  // The downsample is v09's: from 11.4 everything above the scan line is quantised, fizzling out over the last 16th.
  assert.equal(mochiFrame(film(167)).downsample, null);
  assert.ok(mochiFrame(film(170)).downsample!.cell > 0);
  assert.equal(mochiFrame(D.ARCADE.from - 1).downsample!.derez, 1);
  const px = mochiSprayAt(D.ARCADE.from - 1).filter((p) => p.on > 0.99);
  const copies: [number, number][] = [];
  for (let c = 0; c < FORMATION.cols; c++) for (let r = 0; r < FORMATION.rows; r++) if (SIGNATURE_BITS[r][c]) copies.push(cellCentre(c, r));
  assert.equal(px.length, 27);
  for (const p of px) {
    assert.ok(p.x % GP === 0 && p.y % GP === 0);
    assert.ok(copies.some(([x, y]) => Math.abs(x - p.x) <= GP && Math.abs(y - p.y) <= GP));
  }
  assert.equal(mochiSprayAt(D.DOWNSAMPLE.from - 1).length, 0);
});

test('ruling 2: ザッパーン pops on 11.1 behind its own sub-flag (DROP2_THREADS.mochiSfx), and with it off nothing else changes', () => {
  const chars = (fr: ReturnType<typeof mochiFrame>) => fr.layers.flatMap((L) => L.glyphs.hero.map((g) => g.ch)).join('');
  const on = mochiFrame(film(97));
  const off = mochiFrame(film(97), defaultMochiFonts, 'print', { sfx: false });
  assert.ok(chars(on).includes('ザ'));
  assert.ok(!chars(off).includes('ザ'));
  assert.ok(!chars(mochiFrame(film(95))).includes('ザ'));
  assert.equal(off.layers.reduce((n, L) => n + L.vec.length, 0), on.layers.reduce((n, L) => n + L.vec.length, 0));
});

test('ruling 3: the kept furniture — the rowers are the film’s guest variants ((￣▽￣) → (￣□￣」) → (￣ω￣) with an amber ω), the cartouche reads DEFENDER v2.0, his byte seal stamps E2 80 A2 · 20 · CF 89 · 20 · E2 80 A2 on 11.2, the film’s small kaomoji mountain (seven rows of (•ω•), row k holding k + 1, one amber • on the peak)', () => {
  const glyphs = (f: number) => mochiFrame(film(f)).layers.flatMap((L) => L.glyphs.rounded);
  const text = (f: number) => glyphs(f).map((g) => g.ch).join('');
  assert.ok(text(60).includes('▽') && !text(60).includes('□'));
  assert.ok(text(100).includes('□') && text(100).includes('」'));
  assert.equal(MOCHI_ROWERS.shock, '(￣□￣」)');
  const amber = linear(LAW.hero);
  assert.ok(glyphs(160).some((g) => g.ch === 'ω' && g.color.every((c, i) => Math.abs(c - amber[i]) < 1e-6)), 'an amber ω');
  for (const ch of 'DEFENDERv2.0') assert.ok(text(40).includes(ch));
  const seal = text(121);
  assert.ok(seal.includes('E280A2') || seal.replace(/ /g, '').includes('E280A2'));
  assert.ok(seal.includes('CF89'));
  // The mountain (tests/drop2Wave.test.ts 'THE SMALL KAOMOJI MOUNTAIN') is set in the print's Fuji: v09's seven rows of
  // (•ω•), row k holding k + 1 (35 faces), the top two on the snow (#5C7DB6), the rest #EEF4FC on the blue, and one amber • on the peak.
  assert.equal(FUJI_FACES.length, 35);
  assert.deepEqual(
    FUJI_FACES.map((m) => m.row),
    MOUNTAIN_FACES.map((m) => m.row),
  );
  for (let r = 1; r <= 7; r++) {
    const row = FUJI_FACES.filter((m) => m.row === r);
    assert.equal(row.length, r + 1, `row ${r}`);
    assert.ok(row.every((m) => m.y === row[0].y));
  }
  const near = (a: readonly number[], b: readonly number[]): boolean => a.every((c, i) => Math.abs(c - b[i]) < 1e-6);
  const faces = (f: number) => glyphs(f).filter((g) => g.ch === 'ω' && g.size > 9 && g.size < 20);
  assert.equal(faces(23).length, 0, 'unprinted before 10.2');
  const printed = faces(60).sort((a, b) => b.y - a.y);
  assert.equal(printed.length, 35, 'all 35 printed on 10.2 … 10.2 + 6');
  assert.ok(printed.slice(0, 5).every((g) => near(g.color, linear(MOCHI_HEX.mtn))), 'the top two rows on the snow');
  assert.ok(printed.slice(5).every((g) => near(g.color, linear(MOCHI_HEX.mtnFace))), 'the rest pale on the blue');
  const peak = glyphs(60).filter((g) => g.ch === '•' && near(g.color, amber));
  assert.equal(peak.length, 1, 'one amber • on the peak');
  assert.ok(printed.every((g) => g.y < peak[0].y) && Math.abs(peak[0].x - (printed[0].x + printed[1].x) / 2) < 2, 'the • on top, centred');
});

test('ruling 3: the byte seal is set with the font’s own word space, as the prototype’s fillText sets it: the widest row (E2 80 A2, 29 px) stays ≥ 6 px inside the slab on each side', () => {
  const b = readFileSync(new URL('../public/fonts/mplus-rounded-1c-black.ttf', import.meta.url));
  const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) as unknown as { unitsPerEm: number; charToGlyph(ch: string): { advanceWidth?: number } };
  const adv = (ch: string): number => (font.charToGlyph(ch).advanceWidth ?? 0) / font.unitsPerEm;
  assert.ok(Math.abs(ROUNDED_SPACE - adv(' ')) < 0.002, `the space is ${adv(' ').toFixed(3)} em`);
  const fonts = { rounded: adv, hero: adv };
  for (const f of [121, 140, 170]) {
    const seal = mochiFrame(film(f), fonts).layers.flatMap((L) => L.glyphs.rounded).filter((g) => '0289ACEF'.includes(g.ch));
    const small = Math.min(...seal.map((g) => g.size));
    const rows = seal.filter((g) => g.size < small * 1.05).sort((p, q) => q.y - p.y);
    assert.equal(rows.length, 6 + 2 + 4 + 2 + 6, `${f}: the five rows`);
    for (const row of [rows.slice(0, 6), rows.slice(-6)]) {
      const line = [...row].sort((p, q) => p.x - q.x);
      const k = (line[0].size * (line[0].stretch ?? 1)) / 29;
      const first = line[0];
      const last = line[line.length - 1];
      const width = Math.hypot(last.x - first.x, last.y - first.y) / k + ((adv(first.ch) + adv(last.ch)) / 2) * 29;
      assert.equal(line.map((g) => g.ch).join(''), 'E280A2');
      assert.ok((CART.w + 8 - width) / 2 >= 6, `${f}: ${width.toFixed(1)} px on a ${CART.w + 8} px slab`);
    }
  }
});

test('the leap’s splash (11.4 → 12.1) comes off the rebound’s crest under him and never lands on him: every one of its game pixels stays ≥ 100 px clear of him while he is drawn (11.4 → 11.4& + 6), and lies under him', () => {
  let worst = Infinity;
  for (let f = LEAP.from; f < LEAP.bitmap; f += 0.5) {
    const r = mochiHeroRect(film(Math.floor(f)))!;
    for (const p of mochiSprayAt(film(f))) {
      const dx = Math.max(r.x - r.hw - (p.x + GP), p.x - (r.x + r.hw), 0);
      const dy = Math.max(r.y - r.hh - (p.y + GP), p.y - (r.y + r.hh), 0);
      worst = Math.min(worst, Math.hypot(dx, dy));
      assert.ok(p.y > r.y + r.hh, `${f}: a pixel at (${p.x}, ${p.y}) above his feet`);
    }
  }
  assert.ok(worst >= 100, `${worst.toFixed(0)} px`);
  // It is thrown from the rebound's crest (u .6 on 11.4), where the print's own 11.4 spray leaves the water.
  const crest = atU(rebA(LEAP.from), 0.6);
  assert.deepEqual(LEAP_SPLASH, [crest.x, crest.y]);
});

test('the colour law: Defender’s red and his amber are the film’s, and no other ink of the mochi is a red or an amber', () => {
  assert.equal(MOCHI_HEX.red, LAW.defender.print);
  assert.equal(MOCHI_HEX.amber, LAW.hero);
  for (const [k, hex] of Object.entries(MOCHI_HEX)) {
    if (k === 'red' || k === 'redS' || k === 'amber') continue;
    const n = Number.parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    // (Near-blacks aside: his outline's warm sumi #22160A.)
    assert.ok(!(r > g && r > b && sat > 0.5 && r > 80), `${k} ${hex} is no red or amber`);
  }
});

test('D3 on every frame of 10–11: no straight run over 90 px shows but the print’s furniture (sky and sea bands, horizon, mist bars, the baren and its press lines, cartouche and seals, focus lines, brackets, scan line, game pixels), and every fill is whole', () => {
  const bad: string[] = [];
  for (let f = 0; f < N; f++) {
    const fr = mochiFrame(film(f));
    const cam = camera(f);
    // The halftone white water (the scene's pass, over the world) hides what lies under it: the flattening puddle, 97 → 107.
    const hidden = (m: string): boolean => {
      const at = /through \((-?\d+), (-?\d+)\)/.exec(m);
      if (!at || !fr.halftone) return false;
      const p = fromScreen(cam, 1, +at[1], +at[2]);
      return whiteCov(f, p[0], p[1]) >= 0.9;
    };
    for (const m of [...visibleStraights(fr), ...failedFills(fr)]) if (!hidden(m)) bad.push(`${f}: ${m}`);
  }
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length} findings`);
});

test('the scoreboard’s dock stays the film’s (top left, ×0.72) and ghosts out of the mochi hero’s way; the default dock is untouched', () => {
  let ducked = 0;
  for (let f = D.BURST; f < D.ARCADE.from; f++) {
    const a = dockAt(f)!;
    const m = dockAt(f, mochiHeroRect)!;
    assert.deepEqual({ ...a, alpha: 0 }, { ...m, alpha: 0 }, `${f}: only the alpha differs`);
    if (m.alpha < a.alpha - 0.01 || m.alpha < 0.5) ducked++;
    const r = mochiHeroRect(f);
    if (r && r.x - r.hw < m.x1 && r.x + r.hw > m.x0 && r.y - r.hh < m.y1 && r.y + r.hh > m.y0) assert.ok(m.alpha <= 0.2 + 1e-9, `${f - D.BURST}: ghosted under him`);
  }
  assert.ok(ducked > 0);
  // It never blinks: between two ghostings it is back whole for at least half a bar (his grazes less than half a bar apart are one
  // ghosting), and it ghosts only round frames where his glyph itself lies over the box (no air): ≤ 4 frames before, ≤ 7 after.
  const alpha = range(D.BURST, D.ARCADE.from).map((f) => dockAt(f, mochiHeroRect)!.alpha);
  const whole = alpha.map((a) => a > 0.999);
  for (let i = 0; i < whole.length; i++) {
    if (whole[i] || i + 1 >= whole.length || !whole[i + 1]) continue;
    let j = i + 1;
    while (j < whole.length && whole[j]) j++;
    if (j < whole.length) assert.ok(j - i - 1 >= 2 * 24, `${i + 1}–${j - 1}: back for only ${j - i - 1} frames`);
    i = j - 1;
  }
  const over = range(D.BURST, D.ARCADE.from).map((f) => {
    const r = mochiHeroRect(f);
    const B = dockAt(f)!;
    return !!r && r.x - r.hw < B.x1 && r.x + r.hw > B.x0 && r.y - r.hh < B.y1 && r.y + r.hh > B.y0;
  });
  const firstOver = over.indexOf(true);
  const lastOver = over.lastIndexOf(true);
  assert.ok(alpha.slice(0, firstOver - 4).every((a) => a > 0.999) && alpha.slice(lastOver + 8).every((a) => a > 0.999), 'no ghosting away from him');
});

test('the mochi is pure: the same instant draws the same frame', () => {
  for (const f of [0, 72.05, 96, 121, 186]) assert.deepEqual(JSON.stringify(mochiFrame(film(f))), JSON.stringify(mochiFrame(film(f))));
  assert.ok(range(0, 3).length === 3);
});

// ——— Continuity plan v07, seam 4320 (WP3): the switch hands him and its light to the print ————————————————————————————————————————

test('v07 seam 4320, the print wipe: pressed out from the red box’s centre over 10.1 … 10.1 + 2 (never one frame’s inversion), the paper whole from + 3, a sumi rim on its edge', () => {
  const box = S.boxBurstAt(S.LAST);
  assert.equal(wipeAt(film(-1)), null, 'the switch’s last frame is the switch’s');
  assert.equal(wipeAt(film(3)), null, 'whole from + 3');
  const R = [0, 1, 2].map((k) => {
    const w = wipeAt(film(k))!;
    assert.deepEqual([w.cx, w.cy], [...box.centre], 'from the box’s centre');
    // Frame-whole: every sub-frame of the output frame sees one radius (a crisp printed edge, not a smear).
    for (const s of [-0.24, 0.1, 0.24]) assert.deepEqual(wipeAt(film(k) + s), w);
    return w.R;
  });
  assert.ok(R[0] < R[1] && R[1] < R[2], 'it grows');
  const corner = Math.hypot(960, 540);
  assert.ok(R[2] < corner, `+ 2 still shows the blueprint in the corners (${R[2].toFixed(0)} < ${corner.toFixed(0)}): the wipe takes 4 frames`);
  assert.ok(wipeCover(film(0)) > 0.5 && wipeCover(film(0)) > wipeCover(film(1)) - wipeCover(film(0)), 'the downbeat prints most of it: the biggest step is on the beat');
  // His face (and brows) is inside the print on the downbeat; the box itself is swallowed.
  const r = mochiHeroRect(film(0))!;
  assert.ok(Math.hypot(r.hw, r.hh) + Math.hypot(r.x - 960, r.y - 540) < R[0], 'his face inside the circle');
  assert.ok(Math.hypot(box.w / 2, box.h / 2) < R[0], 'the box inside the circle');
  // The rim: one closed sumi ring of radius R in the top layer (over both pictures); none from + 3.
  for (const k of [0, 1, 2]) {
    const rim = mochiFrame(film(k)).top.vec.filter((v) => v.kind === 'stroke' && v.closed);
    assert.equal(rim.length, 1);
    const [x, y] = [rim[0].pts[0], rim[0].pts[1]];
    assert.ok(Math.abs(Math.hypot(x - 960, y - 540) - R[k]) < 1e-6);
    assert.deepEqual(rim[0].kind === 'stroke' ? rim[0].color : null, linear(MOCHI_HEX.ink));
  }
  assert.equal(mochiFrame(film(3)).wipe, null);
  assert.equal(mochiFrame(film(3)).top.vec.filter((v) => v.kind === 'stroke' && v.closed).length, 0);
  // The game picture (the downsample's) never wipes.
  assert.equal(mochiFrame(film(0), defaultMochiFonts, 'game').wipe, null);
});

test('v07 seam 4320, the look under the wipe: the switch’s finish in the share the print has not covered (its glow does not drop out on the downbeat); the print’s own from + 3', () => {
  const s = S.switchLook(S.LAST);
  const flat = mochiLook(film(3));
  assert.equal(flat.bloom.intensity, 0);
  let prev = Infinity;
  for (const k of [0, 1, 2]) {
    const l = mochiLook(film(k));
    const u = 1 - wipeCover(film(k));
    assert.ok(Math.abs(l.bloom.intensity - u * s.bloom.intensity) < 1e-9);
    assert.ok(Math.abs(l.exposure - (1 + u * (s.exposure - 1))) < 1e-9);
    assert.ok(l.bloom.intensity < prev, 'it hands over as the print grows');
    prev = l.bloom.intensity;
  }
});

test('v07 seam 4320, his hand-off out of the box: on 10.1 he is the box’s face (place and size), 75 % of the way into the built eruption by + 3, the built one from + 12; he holds within 40 px of the box’s place for 12 frames across the line', () => {
  const box = S.boxBurstAt(S.LAST);
  const em = box.face / 2.698;
  const screenOf = (f: number) => {
    const h = heroState(f);
    const cam = camera(f);
    const [x, y] = h.screen ? [h.x, h.y] : toScreen(cam, 1, h.x, h.y);
    return { x, y, s: h.s * (h.screen ? 1 : cam.z), h };
  };
  const h0 = screenOf(0);
  assert.ok(Math.abs(h0.x - box.centre[0]) < 1e-9 && Math.abs(h0.y - (box.centre[1] - (22 / 360) * em)) < 1e-9, 'on the box’s face');
  assert.ok(Math.abs(h0.s * 100 * 2.698 - box.face) < 1e-6, `his face ${box.face} px wide, as the box held it`);
  assert.equal(h0.h.pose, 'base', 'the bare face, as in the box');
  assert.equal(h0.h.brows, 1, 'with the flood’s hardened brows');
  assert.equal(h0.h.board, 0);
  assert.ok(Math.abs(launchEase(3) - LAUNCH.at3) < 1e-12);
  assert.equal(launchEase(LAUNCH.to), 1);
  assert.equal(heroState(1).pose, 'jump', 'the arms out on + 1');
  assert.equal(heroState(LAUNCH.brows).brows, 0);
  // From + 12 it is the prototype's eruption (in the wave's plane again), and the hand-over into it does not jump.
  assert.equal(heroState(LAUNCH.to).screen, false);
  // (In the wave's plane: the camera itself punches on + 12, the world with him.)
  const a = screenOf(LAUNCH.to - 0.001);
  const pa = fromScreen(camera(LAUNCH.to - 0.001), 1, a.x, a.y);
  const b = heroState(LAUNCH.to);
  assert.ok(Math.hypot(pa[0] - b.x, pa[1] - b.y) < 1 && Math.abs(a.s / camera(LAUNCH.to - 0.001).z - b.s) < 0.005, 'continuous into the built path');
  // FW5: the anchor (his face) within 40 px of the box's centre on the switch's last 10 frames (the box holds him) and on 10.1, 10.1 + 1.
  for (const F of range(S.LAST - 9, S.LAST + 1)) {
    const h = S.heroAt(F);
    assert.ok(Math.hypot(h.centre[0] - 960, h.centre[1] - 540) < 40, `${F}`);
  }
  for (const f of [0, 1]) {
    const h = screenOf(f);
    assert.ok(Math.hypot(h.x - 960, h.y - 540) < 40, `10.1 + ${f}: ${h.x.toFixed(0)}, ${h.y.toFixed(0)}`);
  }
});

test('v07 seam 4320, the light becomes the print: the switch’s last beams carry over as the baren’s press lines (same rays, from the same cracks), fading out by + 12; the drafting lies on the keyline that prints', () => {
  const beams = S.crackBeams(S.LAST);
  assert.ok(beams.length >= 8);
  const lines = pressLines(0);
  assert.equal(lines.length, beams.length);
  lines.forEach((l, i) => {
    const b = beams[i];
    const a = S.toScreen(S.LAST, b.x, b.y);
    const end = S.toScreen(S.LAST, b.bx, b.by);
    assert.ok(Math.hypot(l.a[0] - a[0], l.a[1] - a[1]) < 1e-9, 'from the crack');
    // Along the beam's ray on screen.
    const cross = (l.b[0] - l.a[0]) * (end[1] - a[1]) - (l.b[1] - l.a[1]) * (end[0] - a[0]);
    assert.ok(Math.abs(cross) / Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) / Math.hypot(end[0] - a[0], end[1] - a[1]) < 1e-9, 'the same ray');
  });
  assert.ok(pressLines(6)[0].alpha < pressLines(0)[0].alpha);
  assert.deepEqual(pressLines(PRESS.fade), []);
  assert.deepEqual(pressLines(-1), []);
  // The drafting the switch rules on 9.4& lies on the key block 10.1 prints (within a pixel at every sub-frame instant of 10.1).
  for (const s of [0, 0.1, 0.25]) {
    const f = mochiTime(film(0) + s);
    const cam = camera(f);
    const outline = mainA(WT(f)).map((p) => toScreen(cam, 1, p.x, p.y));
    for (const seg of draftScreen())
      for (let i = 0; i <= 20; i++) {
        const [x, y] = bez(seg, i / 20);
        let best = Infinity;
        for (let k = 1; k < outline.length; k++) {
          const [ax, ay] = outline[k - 1];
          const [bx, by] = outline[k];
          const dx = bx - ax;
          const dy = by - ay;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
          best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
        }
        assert.ok(best < 1, `draft off the keyline by ${best.toFixed(2)} px at 10.1 + ${s}`);
      }
  }
});
