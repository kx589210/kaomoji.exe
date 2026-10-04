// S29 Z-BUFFER, drop2 3.1 − 6 … 5.1 − 1 (build sheet notes/d2build/sheet.md §5.6, §4.2 rows drop2 3.1–4.4&, §9 H1–H2; the review fixes of the
// 20-bar sheet notes/bid2/drop2-sheet2.md §1.3 D are pinned in tests/drop2ZbufReview.test.ts, and re-pinned here): the one real 3D of drop 2.
// One raymarched hero — his glyph's signed distance, extruded — drawn in characters whose design language is chosen by depth, who
// swallows himself into donut.c, lands cell for cell in intro bar 4's giant face and blinks with both eyes, then collapses flat into the
// Swiss cells the drop2 5.1 match cut needs. These tests read the cells back like a viewer would: which dialect, where, how big.
// The hero here is a stand-in raster with the real face's layout (brackets, two dots, an ω); the scene rasterises the real glyph.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Raster, shadeFace } from '../src/actors/asciiFace.ts';
import { DIALECT_GLYPHS } from '../src/content/drop2.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BLINK2, COLLAPSE, GAME, KICKS2, POP, PREROLL, PUPILS, RES_STEPS, RIMS2, SWEEPS, SWING, SWISS_SWEEP, ZBUF2, ZBUF2_MARCH } from '../src/score/drop2.ts';
import { READOUT2 } from '../src/content/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { BAR4, bar4CellCentre, drop2Segment } from '../src/shots/drop2Shared.ts';
import { FACE } from '../src/shots/intro.ts';
import * as Z from '../src/shots/drop2Zbuf.ts';

/** Drop 2's bar `bar`, beat `beat` (both 1-based, as src/score/drop2.ts writes them), as a film frame. */
const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);

// ——— A stand-in for the rasterised (•ω•) on S04's grid (176 × 38 cells of 4 × 8 px) ————————————————————————————————————————

function fakeRaster(): Raster {
  const subX = FACE.subX;
  const subY = FACE.subY;
  const w = FACE.cols * subX;
  const h = FACE.rows * subY;
  const annulus = (cx: number, cy: number, ro: number, ri: number, keep: (x: number, y: number) => boolean) => (x: number, y: number) => {
    const r = Math.hypot(x - cx, y - cy);
    return r <= ro && r >= ri && keep(x, y);
  };
  const disc = (cx: number, cy: number, r: number) => (x: number, y: number) => Math.hypot(x - cx, y - cy) <= r;
  const open = annulus(230, 152, 190, 150, (x, y) => Math.abs(Math.atan2(y - 152, x - 230)) > Math.PI - 0.85);
  const close = annulus(474, 152, 190, 150, (x, y) => Math.abs(Math.atan2(y - 152, x - 474)) < 0.85);
  const mouth = (x: number, y: number) => y >= 140 && (annulus(322, 140, 42, 18, () => true)(x, y) || annulus(382, 140, 42, 18, () => true)(x, y));
  const shapes = [open, disc(215, 125, 30), mouth, disc(489, 125, 30), close];
  const parts = shapes.map((inside) => {
    const a = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let c = 0;
        for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) if (inside(x + dx, y + dy)) c += 0.25;
        a[y * w + x] = c;
      }
    }
    return a;
  });
  return { cols: FACE.cols, rows: FACE.rows, subX, subY, parts };
}

const RASTER = fakeRaster();
const HERO = Z.heroFromRaster(RASTER);
const frames = new Map<string, Z.ZFrame>();
const frameAt = (f: number, mode: 'full' | 'hero' = 'full'): Z.ZFrame => {
  const key = `${f}:${mode}`;
  if (!frames.has(key)) frames.set(key, Z.zbufFrame(f, HERO, mode));
  return frames.get(key)!;
};
const hero = (fr: Z.ZFrame) => fr.cells.filter((c) => c.hero);
const share = (fr: Z.ZFrame, d: Z.Dialect) => hero(fr).filter((c) => c.dialect === d).length / Math.max(1, hero(fr).length);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const inkBox = (cells: readonly Z.ZCell[], grid: Z.Grid) => {
  const x0 = Math.min(...cells.map((c) => c.x - grid.cw / 2));
  const x1 = Math.max(...cells.map((c) => c.x + grid.cw / 2));
  const y0 = Math.min(...cells.map((c) => c.y - grid.ch / 2));
  const y1 = Math.max(...cells.map((c) => c.y + grid.ch / 2));
  return { width: x1 - x0, height: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

// ——— The object ——————————————————————————————————————————————————————————————————————————————————————————————————————————

test('the signed distance of a coverage raster: negative inside, zero on the edge, px from the edge outside', () => {
  const w = 64;
  const h = 64;
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) <= 12 ? 1 : 0;
  const d = Z.signedDistance(a, w, h);
  const at = (x: number, y: number) => d[y * w + x];
  assert.ok(Math.abs(at(32, 32) + 12) < 1.5, `centre ${at(32, 32)}`);
  assert.ok(Math.abs(at(32 + 20, 32) - 8) < 1.5, `outside ${at(52, 32)}`);
  assert.ok(Math.abs(at(32 + 12, 32)) < 1.2, `edge ${at(44, 32)}`);
});

test('the hero is (•ω•) on S04’s raster: five parts — bracket, eye, ω, eye, bracket — in S04’s world px about the raster’s centre', () => {
  assert.deepEqual(HERO.parts.map((p) => p.kind), ['bracket', 'eye', 'mouth', 'eye', 'bracket']);
  assert.equal(HERO.px, FACE.cellW / FACE.subX);
  assert.ok(Math.abs(HERO.inkWidth - 624 * HERO.px) < 3 * HERO.px, `ink width ${HERO.inkWidth}`);
  const [, eyeL, mouth, eyeR] = HERO.parts;
  assert.ok(eyeL.centre[0] < 0 && eyeR.centre[0] > 0 && Math.abs(eyeL.centre[0] + eyeR.centre[0]) < 2 * HERO.px, 'eyes mirror about the centre');
  assert.ok(eyeL.centre[1] > mouth.centre[1], 'y up: the eyes sit above the ω');
  assert.ok(Z.partDistance(eyeL, eyeL.centre[0], eyeL.centre[1]) < -25 * HERO.px, 'deep inside the dot');
  assert.ok(Z.partDistance(eyeL, eyeL.centre[0] + 50 * HERO.px, eyeL.centre[1]) > 15 * HERO.px, 'outside it');
  assert.ok(Z.partDistance(eyeL, 5000, 0) > 3000, 'far away is far');
  assert.ok(Math.abs(HERO.em - HERO.inkWidth / 2.7) < 1e-9, 'em: the face core is 2.7 em wide (S27’s master)');
});

// ——— The camera (§5.6.8) ———————————————————————————————————————————————————————————————————————————————————————————————

test('the pre-roll (drop2 3.1 − 6 … 3.1 − 1): FOV 2°, front-on, his front 960 px wide centred on (960, 520) — S28’s exact framing', () => {
  for (const f of [PREROLL, POP - 1]) {
    const cam = Z.zbufCamera(f, HERO);
    assert.ok(Math.abs(cam.fov - 2) < 1e-9 && cam.yaw === 0 && cam.pitch === 0 && cam.roll === 0, `${f}`);
    assert.ok(Math.abs(cam.scale * HERO.inkWidth - 960) < 1e-6, `${f} width`);
    const [x, y] = Z.project(cam, [HERO.inkCentre[0], HERO.inkCentre[1], 0]);
    assert.ok(Math.hypot(x - 960, y - 520) < 1e-6, `${f} centre ${x}, ${y}`);
  }
});

test('the dimension pop (rev 1): on drop2 3.1 itself he is turned ≥ 10° and tipped, his depth already 0.36 em, overshooting to 0.6 em and settling to 0.42 em by + 6; still 960 px at (960, 520)', () => {
  const cam = Z.zbufCamera(POP, HERO);
  assert.ok(cam.yaw >= 10 && cam.pitch >= 4, `yaw ${cam.yaw}, pitch ${cam.pitch}`);
  assert.ok(Math.abs(cam.fov - 2) < 1e-9 && Math.abs(cam.width - 960) < 1e-6, `fov ${cam.fov}, width ${cam.width}`);
  const [x, y] = Z.project(cam, [HERO.inkCentre[0], HERO.inkCentre[1], 0]);
  assert.ok(Math.hypot(x - 960, y - 520) < 1e-6, `centre ${x}, ${y}`);
  const em = (f: number) => 0.42 * Z.extrusion(f);
  assert.equal(Z.extrusion(POP - 1), 0, 'flat in the pre-roll');
  assert.ok(em(POP) > 0.33, `${em(POP)} em on the downbeat`);
  assert.ok(Math.abs(em(POP + 2) - 0.6) < 1e-9, `peak ${em(POP + 2)}`);
  assert.ok(Math.abs(em(POP + 6) - 0.42) < 1e-9 && Math.abs(em(POP + 20) - 0.42) < 1e-9);
  // Sub-frames of drop2 3.1 never reach back into the flat pre-roll: the pop is crisp.
  for (const t of Z.zbufSampling(POP, HERO).instants) assert.ok(t >= POP, `instant ${t}`);
  // His light flares on the pop instead of a grey wash.
  assert.ok(Z.zbufLook(POP).exposure > 1.25 * Z.zbufLook(POP + 16).exposure);
});

test('the dolly-zoom: FOV 2° → 38° over drop2 3.1–3.2 (cubic-out) while he grows from 960 px to 1250 px by 3.1& (rev 3); the backdrop recedes behind him', () => {
  const at = (f: number) => Z.zbufCamera(f, HERO);
  assert.ok(at(d2at(3, 1.5)).fov > 30, 'mostly done by the & (cubic-out)');
  assert.ok(Math.abs(at(d2at(3, 2)).fov - 38) < 0.5);
  for (let f = POP; f < ZBUF2.sizeBy; f++) {
    const w = at(f).width;
    assert.ok(w >= 930 && w <= 1300 && at(f + 1).width >= w - 8, `${f}: he grows through the dolly-zoom (${w.toFixed(1)} px)`);
  }
  assert.ok(at(d2at(3, 2)).yaw > 12 && at(d2at(3, 2)).yaw <= Z.YAW_MAX, `yaw ${at(d2at(3, 2)).yaw}`);
  // The vertigo: the plane behind him shrinks while he holds his size.
  const size = (f: number) => {
    const m = Z.dotMap(at(f), HERO).m;
    return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  };
  assert.ok(Math.abs(size(POP) - 1) < 1e-9 && size(d2at(3, 2)) / (at(d2at(3, 2)).width / 960) < 0.95, `backdrop scale ${size(POP)} → ${size(d2at(3, 2)).toFixed(3)}, behind him growing ${(at(d2at(3, 2)).width / 960).toFixed(2)}×`);
});

test('his ω and eyes stay readable (rev 1; rev 3 relaxes the caps to the review’s ±25° keys): the yaw never passes YAW_MAX; the pitch swings', () => {
  for (let f = POP; f < SWING.from; f += 0.25) assert.ok(Math.abs(Z.zbufCamera(f, HERO).yaw) <= Z.YAW_MAX, `${f}: ${Z.zbufCamera(f, HERO).yaw}`);
  const pitches = Array.from({ length: SWING.from - d2at(3, 2) }, (_, i) => Z.zbufCamera(d2at(3, 2) + i, HERO).pitch);
  assert.ok(Math.max(...pitches) - Math.min(...pitches) > 6, 'the pitch swings');
});

test('his own light (rev 1): his front faces are always the lit planes and the walls fall into shade, at any yaw', () => {
  for (const f of [d2at(3, 2) + 2, d2at(3, 2.5), d2at(4, 3), d2at(4, 3.25), d2at(4, 3.5) + 2]) {
    const cells = hero(frameAt(f)).filter((c) => c.part !== 'torus');
    const front = cells.filter(Z.isFront);
    const walls = cells.filter((c) => !Z.isFront(c));
    const lit = (xs: Z.ZCell[]) => mean(xs.map((c) => c.lum - Z.GLINT.gain * c.glint));
    assert.ok(front.length > 0 && walls.length > 0, `${f}: ${front.length} front, ${walls.length} wall cells`);
    assert.ok(lit(front) > lit(walls) + 0.2, `${f}: front ${lit(front).toFixed(2)} vs walls ${lit(walls).toFixed(2)}`);
  }
  assert.ok(Z.lumW([0, 0, 1]) > 0.7 && Z.lumW([-1, 0, 0]) < 0.5 && Z.lumW([1, 0, 0]) < 0.5);
});

test('the ω and the eyes are a mask (rev 1): at every yaw their front cells keep their own ink as glyphs — never a block, a slab or a paper fill — and never touch each other', () => {
  // (The reference: nearly front-on as the swing lands; rev 3's conveyor turns on every march.)
  const ref = hero(frameAt(SWING.to - 2)).filter((c) => Z.isFeature(c) && c.part === 'mouth').length;
  for (const f of [d2at(3, 2) + 2, d2at(3, 2.5), d2at(4, 3), d2at(4, 3.25), d2at(4, 3.5) + 2]) {
    const cells = hero(frameAt(f));
    const mouth = cells.filter((c) => Z.isFeature(c) && c.part === 'mouth');
    const eyes = cells.filter((c) => Z.isFeature(c) && c.part === 'eye');
    assert.ok(mouth.length > 0.45 * ref, `${f}: ${mouth.length} ω front cells (front-on ${ref})`);
    assert.ok(eyes.filter((c) => c.x < 960).length > 0 && eyes.filter((c) => c.x > 960).length > 0, `${f}: both eyes`);
    for (const c of [...mouth, ...eyes]) {
      assert.ok(!DIALECT_GLYPHS.brutal.slice(2).includes(c.ch), `${f}: ${c.part} drawn as a block ${c.ch}`);
      if (c.dialect === 'brutal') assert.ok(c.ink === 'b-mouth' || c.ink === 'b-eye', `${f}: brutal ${c.ink}`);
      if (c.dialect === 'riso') assert.ok(c.ink === (c.part === 'mouth' ? 'r-mouth' : 'r-eye'), `${f}: riso ${c.ink}`);
    }
    const at = new Set(eyes.map((c) => `${c.col},${c.row}`));
    for (const c of mouth) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.ok(!at.has(`${c.col + dc},${c.row + dr}`), `${f}: the ω touches an eye at ${c.col}, ${c.row}`);
  }
  // In BRUTAL his ω and eyes lay no ground: only the brackets are tiles.
  const c = Z.zbufContent(d2at(4, 3.25), HERO);
  const feature = hero(frameAt(d2at(4, 3.25))).filter((x) => x.dialect === 'brutal' && Z.isFeature(x));
  assert.ok(feature.length > 0, 'BRUTAL reaches his features at drop2 4.3 + 6');
  const tiles = new Set(c.base.under.map((s) => `${Math.round(s.x)},${Math.round(s.y)}`));
  for (const x of feature) assert.ok(!tiles.has(`${Math.round(x.x - 960)},${Math.round(540 - x.y)}`), 'no tile under a feature');
});

test('the ω reads on the conveyor (rev 2, D2-CONVEYOR-OMEGA): one dialect for all of it, its front face’s outline closed and unoccluded; in NEON it is a neon letter — a bright outline tube, dimmer tubes inside, no walls, no back edges', () => {
  const key = (c: number, r: number) => `${c},${r}`;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const components = (xs: readonly Z.ZCell[], nb: readonly number[][]) => {
    const left = new Map(xs.map((c) => [key(c.col, c.row), c]));
    let n = 0;
    while (left.size > 0) {
      n++;
      const stack = [left.values().next().value!];
      left.delete(key(stack[0].col, stack[0].row));
      while (stack.length > 0) {
        const c = stack.pop()!;
        for (const [dc, dr] of nb) {
          const o = left.get(key(c.col + dc, c.row + dr));
          if (o) {
            left.delete(key(o.col, o.row));
            stack.push(o);
          }
        }
      }
    }
    return n;
  };
  const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const OMEGA_INK: Partial<Record<Z.Dialect, string>> = { neon: 'amber', brutal: 'b-mouth', terminal: 'pink', led: 'pink' };
  for (const [f, want] of [[d2at(4, 2.25), 'neon'], [d2at(4, 2.75), 'neon'], [d2at(4, 3.75), 'brutal']] as const) {
    const fr = frameAt(f);
    const mouth = hero(fr).filter((c) => c.part === 'mouth');
    const front = mouth.filter(Z.isFront);
    assert.deepEqual([...new Set(mouth.map((c) => c.dialect))], [want], `${f}: the ω is one dialect`);
    const mask = new Set(front.map((c) => key(c.col, c.row)));
    assert.equal(components(front, N4), 1, `${f}: the ω’s front face is one region`);
    const outline = front.filter((c) => N4.some(([dc, dr]) => !mask.has(key(c.col + dc, c.row + dr))));
    assert.ok(outline.length > 30, `${f}: ${outline.length} outline cells`);
    for (const c of outline) assert.ok(c.ch.trim() !== '' && c.ink === OMEGA_INK[want], `${f}: outline cell ${c.col}, ${c.row} is ${JSON.stringify(c.ch)} in ${c.ink}`);
    assert.equal(components(outline, N8), 1, `${f}: the outline is one closed ring`);
    if (want === 'neon') {
      for (const c of mouth) {
        if (Z.isFront(c)) assert.ok(DIALECT_GLYPHS.neon.includes(c.ch), `${f}: a tube stroke, not ${c.ch}`);
        else assert.equal(c.ch, ' ', `${f}: wall cell ${c.col}, ${c.row} drew ${c.ch}`);
      }
    }
    // Unoccluded: on every outline cell the picture holds the ω's own glyph and nothing else (no rim white, no slab, no other stroke).
    const content = Z.zbufContent(f, HERO);
    const glyphs = [...(content.base.glyphs.mono ?? []), ...(content.base.glyphs.digits ?? []), ...(content.ink.glyphs.mono ?? []), ...(content.light.glyphs.mono ?? [])];
    const on = new Map<string, typeof glyphs>();
    for (const g of glyphs) {
      const k = key(Math.round(g.x), Math.round(g.y));
      on.set(k, [...(on.get(k) ?? []), g]);
    }
    const at = (c: Z.ZCell) => on.get(key(Math.round(c.x - 960), Math.round(540 - c.y))) ?? [];
    if (want === 'neon') {
      const ring = new Set(outline);
      for (const c of front) assert.ok(ring.has(c) ? at(c)[0].alpha! >= 0.75 : at(c)[0].alpha! <= 0.5, `${f}: ${ring.has(c) ? 'outline' : 'fill'} alpha ${at(c)[0].alpha}`);
    }
    for (const c of outline) {
      const [x, y] = [Math.round(c.x - 960), Math.round(540 - c.y)];
      assert.deepEqual(at(c).map((g) => g.ch), [c.ch], `${f}: outline cell ${c.col}, ${c.row} holds ${JSON.stringify(at(c).map((g) => g.ch))}`);
      const shapes = content.base.under.filter((s) => Math.round(s.x) === x && Math.round(s.y) === y);
      assert.ok(shapes.length <= 1, `${f}: ${shapes.length} grounds under an outline cell`);
    }
  }
});

test('his ω and eyes never flicker between dialects on the conveyor (rev 2): one dialect each per frame; the ω changes only on the march kicks, an eye at most once in 6 frames', () => {
  const changes = new Map<number, number[]>();
  const last = new Map<number, string>();
  for (let f = ZBUF2.reform.to; f < BLINK2.close; f++) {
    const cells = Z.zbufFrame(f, HERO, 'hero').cells; // his cells only: the dialects are the same
    for (const pid of [1, 2, 3]) {
      const ds = new Set(cells.filter((c) => c.pid === pid).map((c) => c.dialect));
      if (ds.size === 0) continue;
      assert.equal(ds.size, 1, `${f}: part ${pid} in ${[...ds]}`);
      const d = [...ds][0]!;
      if (last.has(pid) && last.get(pid) !== d) changes.set(pid, [...(changes.get(pid) ?? []), f]);
      last.set(pid, d);
    }
  }
  for (const at of changes.get(2) ?? []) assert.ok(ZBUF2_MARCH.some((k) => at >= k - 8 && at <= k), `the ω changes language with the marches only (${at})`);
  assert.ok((changes.get(2) ?? []).length >= 2, 'it does change with them');
  for (const pid of [1, 3]) {
    const at = changes.get(pid) ?? [];
    for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 6, `eye ${pid} changes at ${at}`);
  }
});

test('RISO prints in plate colours (rev 1): solid multiply tints under his features — the ω hot pink, the eyes blue — at least half a plate even under the glint, never paper-white', () => {
  for (const f of [d2at(3, 2) + 4, d2at(3, 2.5)]) {
    const c = Z.zbufContent(f, HERO);
    const tint = new Map(c.ink.under.map((s) => [`${Math.round(s.x)},${Math.round(s.y)}`, s.color]));
    const features = hero(frameAt(f)).filter((x) => x.ink === 'r-mouth' || x.ink === 'r-eye');
    assert.ok(features.length > 40, `${f}: ${features.length} feature cells`);
    let solid = 0;
    for (const x of features) {
      const t = tint.get(`${Math.round(x.x - 960)},${Math.round(540 - x.y)}`);
      assert.ok(t, `${f}: a tint under every feature cell`);
      // Plate density: pink takes out green, blue takes out red.
      const density = x.ink === 'r-mouth' ? (1 - t[1]) / (1 - 0.065) : 1 - t[0];
      if (x.cover > 0.7) assert.ok(density >= 0.4, `${f}: ${x.ink} at ${density.toFixed(2)} of a plate`);
      if (density > 0.8) solid++;
    }
    if (f === d2at(3, 2) + 4) assert.ok(solid > 0.5 * features.length, `${f}: ${solid} of ${features.length} print a solid plate`);
    assert.ok(c.ink.under.length <= Z.CAPACITY.tints);
  }
});

test('the swing onto intro bar 4 is an impact: it accelerates into drop2 4.4 and lands there exactly — FOV 12°, S04’s 1.3 zoom, front-on, (960, 540)', () => {
  const cam = Z.zbufCamera(BLINK2.close, HERO);
  assert.ok(Math.abs(cam.fov - BAR4.fov) < 1e-9 && cam.yaw === 0 && cam.pitch === 0);
  assert.ok(Math.abs(cam.scale - 1.3) < 1e-9);
  for (const [col, row] of [[87, 18], [10, 3], [160, 30]]) {
    const wx = (col - FACE.cols / 2 + 0.5) * FACE.cellW;
    const wy = (FACE.rows / 2 - row - 0.5) * FACE.cellH;
    const [x, y] = Z.project(cam, [wx, wy, 0]);
    const [ex, ey] = bar4CellCentre(col, row);
    assert.ok(Math.hypot(x - ex, y - ey) < 0.01, `S04 cell (${col}, ${row}) lands on its bar-4 place: ${x.toFixed(2)}, ${y.toFixed(2)} vs ${ex}, ${ey}`);
  }
  const yaw = (f: number) => Z.zbufCamera(f, HERO).yaw;
  const steps = [SWING.to - 8, SWING.to - 6, SWING.to - 4, SWING.to - 2, SWING.to - 1].map((f) => Math.abs(yaw(f + 1) - yaw(f)));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] >= steps[i - 1], `the swing accelerates: ${steps.map((s) => s.toFixed(2))}`);
  assert.ok(Math.abs(yaw(SWING.to + 1)) < 1e-9 && Math.abs(yaw(SWING.to + 10)) < 1e-9, 'and holds front-on');
});

test('the collapse pulls back (L keyed drop2 4.4&) to a flat 560 px face at (960, 520), FOV 2°, settled for the drop2 5.1 match cut', () => {
  for (const f of [GAME - 3, GAME - 2, GAME - 1]) {
    const cam = Z.zbufCamera(f, HERO);
    assert.ok(Math.abs(cam.fov - 2) < 0.15, `${f} fov ${cam.fov}`);
    const w = cam.scale * HERO.inkWidth;
    assert.ok(Math.abs(w - 560) / 560 < (f === GAME - 1 ? 0.005 : 0.012), `${f} width ${w}`);
    const [x, y] = Z.project(cam, [HERO.inkCentre[0], HERO.inkCentre[1], 0]);
    assert.ok(Math.hypot(x - 960, y - 520) < 2, `${f} centre ${x}, ${y}`);
    assert.equal(Z.extrusion(f), 0, `${f}: flat`);
  }
});

test('the camera never jumps: his centre moves smoothly frame to frame except into the swing’s landing and the collapse', () => {
  const centre = (f: number) => Z.project(Z.zbufCamera(f, HERO), [HERO.inkCentre[0], HERO.inkCentre[1], 0]);
  for (let f = PREROLL + 1; f < GAME; f++) {
    const a = centre(f - 1);
    const b = centre(f);
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) < 40, `${f}: ${Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1)} px`);
  }
});

test('the kicks punch the FOV −5 % from drop2 3.2 to 4.3 (the picture zooms in on the hit and springs back)', () => {
  // Rev 2: struck at the output frame — the whole shutter of the kick frame is at the punch's peak, none of the frame before's.
  const unpunched = (f: number) => 540 / Math.tan((Z.zbufCamera(f, HERO).fov * Math.PI) / 360);
  for (const k of KICKS2.filter((x) => x >= d2at(3, 2) && x <= d2at(4, 3))) {
    for (const t of [k - 1.25, k - 1, k - 0.75]) assert.ok(Math.abs(Z.zbufCamera(t, HERO).fpx / unpunched(t) - 1) < 1e-9, `kick ${k}: no punch at ${t}`);
    for (const t of [k - 0.25, k, k + 0.25]) assert.ok(Z.zbufCamera(t, HERO).fpx / unpunched(t) > 1.045, `kick ${k}: ${(Z.zbufCamera(t, HERO).fpx / unpunched(t)).toFixed(3)} at ${t}`);
    assert.ok(Z.zbufCamera(k + 6, HERO).fpx / unpunched(k + 6) < Z.zbufCamera(k, HERO).fpx / unpunched(k), `kick ${k}: springs back`);
  }
});

test('the cells follow the kicks, coarse to fine: 13.5 × 24.75 → 12 × 22 → 10.8 × 19.8, S04’s 12.48 × 24.96 on drop2 4.4, 12 × 22 for the collapse', () => {
  const size = (f: number) => [Z.cellGrid(f).cw, Z.cellGrid(f).ch];
  assert.deepEqual(size(PREROLL), [13.5, 24.75]);
  assert.deepEqual(size(RES_STEPS[0] - 1), [13.5, 24.75]);
  assert.deepEqual(size(RES_STEPS[0]), [12, 22]);
  assert.deepEqual(size(RES_STEPS[1]), [12, 22]);
  assert.deepEqual(size(RES_STEPS[2]), [10.8, 19.8]);
  assert.deepEqual(size(RES_STEPS[3]), [BAR4.cellW, BAR4.cellH]);
  assert.deepEqual(size(RES_STEPS[4]), [12, 22]);
  assert.deepEqual(size(GAME - 1), [12, 22]);
  const g = Z.cellGrid(SWING.to + 4);
  for (const [col, row] of [[0, 0], [87, 18], [175, 37]]) {
    const [ex, ey] = bar4CellCentre(col, row);
    assert.ok(Math.abs(g.ox + (col + 0.5) * g.cw - ex) < 1e-9 && Math.abs(g.oy + (row + 0.5) * g.ch - ey) < 1e-9, `intro bar 4 grid (${col}, ${row})`);
  }
  assert.deepEqual([Z.cellGrid(d2at(3, 2.25) + 2).ox, Z.cellGrid(d2at(3, 2.25) + 2).oy, Z.cellGrid(d2at(3, 2.25) + 2).cw], [0, 0, 12], 'the 12 × 22 grid is the backdrop’s, from layout (0, 0)');
});

test('the pre-roll (drop2 3.1 − 6 … 3.1 − 1): the same flat green ASCII face every frame, 13.5 × 24.75 cells, no background — S28 draws it over the whip', () => {
  const a = frameAt(PREROLL, 'hero');
  assert.ok(hero(a).length > 40, `${hero(a).length} cells`);
  assert.equal(share(a, 'terminal'), 1);
  for (let f = PREROLL + 1; f < POP; f++) assert.deepEqual(hero(frameAt(f, 'hero')).map((c) => [c.col, c.row, c.ch]), hero(a).map((c) => [c.col, c.row, c.ch]), `${f} = ${PREROLL}`);
  assert.ok(a.cells.every((c) => c.hero), 'only his cells: the background is S28’s');
  const box = inkBox(hero(a), a.grid);
  assert.ok(Math.abs(box.width - 960) < 2 * 13.5 + 1, `width ${box.width}`);
});

test('drop2 3.1–3.2: TERMINAL, then the RISO sweep runs through him back → front and lands on the clap', () => {
  assert.equal(share(frameAt(d2at(3, 1.5)), 'terminal'), 1);
  const mid = frameAt(SWEEPS[0].from + 6);
  const riso = hero(mid).filter((c) => c.dialect === 'riso');
  const term = hero(mid).filter((c) => c.dialect === 'terminal');
  assert.ok(riso.length > 0 && term.length > 0, `mid-sweep both: ${riso.length} riso, ${term.length} terminal`);
  assert.ok(mean(riso.map((c) => c.depth)) > mean(term.map((c) => c.depth)), 'the deeper cells are RISO first');
  assert.equal(share(frameAt(SWEEPS[0].to), 'riso'), 1, 'whole on the clap');
  assert.equal(share(frameAt(d2at(3, 2.75)), 'riso'), 1);
});

test('donut.exe (drop2 3.3 – 3.4, one beat): every cell is donut.c’s ramp; the torus fills its 960 px, inside the frame', () => {
  for (const f of [d2at(3, 3) + 8, d2at(3, 3.5) + 2]) {
    const fr = frameAt(f);
    assert.equal(share(fr, 'donut'), 1, `${f}`);
    for (const c of hero(fr)) assert.ok(DIALECT_GLYPHS.donut.includes(c.ch), `${f}: ${c.ch}`);
    const box = inkBox(hero(fr), fr.grid);
    assert.ok(box.width > 800 && box.width < 1120, `${f}: torus ${box.width.toFixed(0)} px wide`);
    assert.ok(box.cy - box.height / 2 > 10 || box.height < 1060, `${f}: inside the frame (${box.height.toFixed(0)} px tall)`);
    assert.ok(Math.abs(box.cx - 960) < 40 && Math.abs(box.cy - 530) < 60, `${f}: centred ${box.cx.toFixed(0)}, ${box.cy.toFixed(0)}`);
  }
});

test('the conveyor (drop2 4.1–4.3): at most three dialects at once, the march brings each in from the back', () => {
  const at = (f: number) => new Set(hero(frameAt(f)).map((c) => c.dialect));
  for (const f of [d2at(4, 1.25), d2at(4, 1.5) + 4, d2at(4, 2.5), d2at(4, 3.25) + 2, d2at(4, 3.75)]) assert.ok(at(f).size <= 3, `${f}: ${[...at(f)]}`);
  // MARCH 0 (drop2 4.1): front NEON, mid LED (rev 3: the review's four states, Z.CONVEYOR2).
  const fr = frameAt(d2at(4, 1.5));
  const neon = hero(fr).filter((c) => c.dialect === 'neon');
  const led = hero(fr).filter((c) => c.dialect === 'led');
  assert.ok(neon.length > 0 && led.length > 0, `drop2 4.1&: ${neon.length} neon, ${led.length} led`);
  assert.ok(mean(neon.map((c) => c.depth)) < mean(led.map((c) => c.depth)), 'NEON is the front band');
  const after = hero(frameAt(ZBUF2_MARCH[2] + 3));
  const nearest = [...after].sort((a, b) => a.depth - b.depth).slice(0, Math.ceil(after.length / 4));
  assert.ok(nearest.filter((c) => c.dialect === 'brutal').length > 0.6 * nearest.length, 'just after drop2 4.2 his nearest cells are BRUTAL');
  // 4.3: TERMINAL home in front, BRUTAL mid, NEON at the back (whenever his turn gives him a back band).
  const late = at(d2at(4, 3.25) + 2);
  for (const d of ['brutal', 'terminal'] as const) assert.ok(late.has(d), `drop2 4.3: ${d} (${[...late]})`);
  assert.ok([d2at(4, 3.25), d2at(4, 3.5), d2at(4, 3.75)].some((f) => at(f).has('neon')), 'NEON at the back in 4.3');
});

test('NEON draws edges only on his brackets: box strokes, their interior cells empty (his ω and eyes are neon letters, rev 2)', () => {
  const fr = frameAt(ZBUF2_MARCH[1] + 4);
  const neon = hero(fr).filter((c) => c.dialect === 'neon' && c.part === 'bracket');
  const lit = neon.filter((c) => c.ch !== ' ');
  assert.ok(lit.length > 0 && lit.length < 0.75 * neon.length, `${lit.length} lit of ${neon.length}`);
  for (const c of lit) assert.ok(DIALECT_GLYPHS.neon.includes(c.ch), c.ch);
});

test('intro bar 4 (drop2 4.4): he lands in S04’s giant face cell for cell — the same cells, mostly the same characters — all BAR4', () => {
  const fr = frameAt(BLINK2.close);
  assert.equal(share(fr, 'bar4'), 1);
  const s04 = shadeFace(RASTER);
  const key = (c: { col: number; row: number }) => `${c.col},${c.row}`;
  const want = new Map(s04.map((c) => [key(c), c.ch]));
  const got = new Map(hero(fr).map((c) => [key({ col: c.col, row: c.row }), c.ch]));
  let both = 0;
  let same = 0;
  for (const [k, ch] of got) {
    if (want.has(k)) {
      both++;
      if (want.get(k) === ch) same++;
    }
  }
  const jaccard = both / (want.size + got.size - both);
  assert.ok(jaccard > 0.85, `cells shared with S04: ${(100 * jaccard).toFixed(1)} %`);
  assert.ok(same / both > 0.5, `same characters: ${((100 * same) / both).toFixed(1)} %`);
});

test('intro bar 4’s blink: both eyes, S04’s rhythm on the grid — shut on drop2 4.4 + 3, open again by drop2 4.4&; never a wink', () => {
  const eyes = (f: number) => hero(frameAt(f)).filter((c) => c.part === 'eye');
  const open = eyes(BLINK2.close);
  const shut = eyes(BLINK2.shut + 1);
  assert.ok(shut.length < 0.4 * open.length, `${shut.length} eye cells shut vs ${open.length} open`);
  assert.ok(shut.every((c) => c.ch === '-'), 'shut eyes read -');
  const left = shut.filter((c) => c.x < 960).length;
  const right = shut.filter((c) => c.x > 960).length;
  assert.ok(left > 0 && right > 0 && Math.abs(left - right) <= Math.max(2, 0.3 * (left + right)), `both eyes: ${left} | ${right}`);
  assert.ok(Z.eyeSquash(BLINK2.close) === 1 && Z.eyeSquash(BLINK2.shut) < 0.07 && Z.eyeSquash(BLINK2.open - 1) < 0.07 && Z.eyeSquash(BLINK2.done) === 1);
});

// Iteration 2 (the director's ruling 6; sync review 6): the paper wipe covered the whole frame from drop2 5.1 − 4 — drop 2's brightest frames
// (96 % near-white), an unscheduled white flash 3–5 frames before the drop2 5.1 kick. The Swiss sweep through him keeps its 130 px/f; the
// backdrop's paper rides it only as a card around him, then slams out to the corners, landing on the cut — where S30's paper is.
test('the collapse’s paper lands on the cut: a card around him, then a slam out to the corners that S29 never finishes — the whole frame turns paper on drop2 5.1, not drop2 5.1 − 4', () => {
  const backdrop = (f: number) => frameAt(f).cells.filter((c) => !c.hero);
  const paperShare = (f: number) => backdrop(f).filter((c) => c.paper).length / backdrop(f).length;
  for (const f of [GAME - 5, GAME - 4, GAME - 3]) assert.ok(paperShare(f) < 0.45, `${f}: ${(100 * paperShare(f)).toFixed(0)} % paper — no white before the beat`);
  for (const f of [GAME - 3, GAME - 2]) assert.ok(paperShare(f + 1) > paperShare(f), `${f + 1}: growing into the cut`);
  assert.ok(paperShare(GAME - 1) < 1, 'S29 never shows the whole frame white: the paper lands with S30 on drop2 5.1');
  const steps = [GAME - 5, GAME - 4, GAME - 3, GAME - 2, GAME - 1, GAME].map((f) => Z.paperRadius(f) - Z.paperRadius(f - 1));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], `the slam is faster every frame: ${steps.map((s) => s.toFixed(0)).join(' ')}`);
  assert.ok(Z.paperRadius(GAME) > Math.hypot(960 - 6, 1069 - 520) + 8, 'on the cut it reaches every corner');
  assert.ok(Z.paperRadius(GAME - 8) >= 300, 'the card around his face is paper by drop2 4.4& + 4, so the Swiss cells never sit on the dark');
});

test('the collapse: one radial Swiss sweep from his centre outward at 130 px/f turns him to Swiss cells, the ω first; all flat by drop2 5.1 − 3', () => {
  const sweep = frameAt(SWISS_SWEEP.from + 2);
  const sw = hero(sweep).filter((c) => c.dialect === 'swiss');
  const b4 = hero(sweep).filter((c) => c.dialect === 'bar4');
  assert.ok(sw.length > 0 && b4.length > 0, `mid-sweep ${sw.length} swiss, ${b4.length} bar4`);
  const r = (c: Z.ZCell) => Math.hypot(c.x - 960, c.y - 520);
  assert.ok(Math.max(...sw.map(r)) < Math.min(...b4.map(r)) + 1e-9, 'the wipe’s front: Swiss inside, intro bar 4 outside');
  assert.ok(sw.some((c) => c.part === 'mouth'), 'his ω first');
  for (const f of [GAME - 3, GAME - 1]) assert.equal(share(frameAt(f), 'swiss'), 1, `${f}`);
  assert.equal(Z.paperRadius(COLLAPSE.from), 0, 'drop2 4.4& itself is still intro bar 4’s screen, pulling back');
  assert.equal(Z.sweepRadius(COLLAPSE.from), 0);
  assert.equal(Z.sweepRadius(COLLAPSE.from + 2) - Z.sweepRadius(COLLAPSE.from + 1), 130);
  assert.equal(Z.paperRadius(COLLAPSE.from + 2) - Z.paperRadius(COLLAPSE.from + 1), 130, 'the paper card rides the sweep');
});

test('H2: drop2 5.1 − 3 … 5.1 − 1 are the flat Swiss face the cut matches — 560 px bracket to bracket at (960, 520), the ω amber (the colour law; it was red)', () => {
  const fr = frameAt(GAME - 1);
  const box = inkBox(hero(fr), fr.grid);
  assert.ok(Math.abs(box.width - 560) <= 24, `width ${box.width}`);
  assert.ok(Math.abs(box.cx - 960) <= 12 && Math.abs(box.cy - 520) <= 22, `centre ${box.cx}, ${box.cy}`);
  const mouth = hero(fr).filter((c) => c.part === 'mouth');
  assert.ok(mouth.length > 0 && mouth.every((c) => c.ink === 'omega'), 'the ω is amber');
  for (const c of hero(fr)) assert.ok(DIALECT_GLYPHS.swiss.includes(c.ch), c.ch);
});

// Iteration 3 (verify: the bright moment of drop2 3.1 was S28's passing paper at drop2 3.1 − 4 … 3.1 − 1 and 3.1 itself was dark): S29's own light is the
// downbeat's — his glow blazes on drop2 3.1 (exposure ≥ 1.7× a beat later) and has mostly settled within the 16th.
test('drop2 3.1 is lit by him: S29’s exposure on the pop ≥ 1.7× a beat later, most of it gone by + 4', () => {
  const e = (f: number) => Z.zbufLook(f).exposure;
  assert.ok(e(POP) >= 1.7 * e(POP + 16), `${e(POP).toFixed(2)} on the pop, ${e(POP + 16).toFixed(2)} a beat later`);
  assert.ok(e(POP + 1) < e(POP) && e(POP + 4) - e(POP + 16) < 0.35 * (e(POP) - e(POP + 16)), 'it decays fast');
});

// Iteration 3 (verify: on the kicks of drop2 bars 3–4 the change in the 5 frames after the beat was only 1.1–2.0× frames 8–20 after it, and
// the rig's punch, shared with the intro, the build and drop 1, starts a frame late by design): S29 accents every kick itself — its exposure pumps on the kick's
// own output frame (the backdrop's dots, the Riso plates and every glowing cell at once), nothing on the frame before, settled in the 8th.
// Iteration 4 (photosensitivity; verify: at +60 % falling by e^(−t/1.2) the centre of the frame flashed 4 times in a second, drop2 3.4 − 6 … 4.2 + 3):
// +25 %, falling round over the 8th — the step up on the kick is the hit; no frame after it drops by more than a sixth of the lift.
test('every kick of drop2 3.2–4.4 pumps S29’s light on its own frame: +25 % on the kick, nothing the frame before, a round fall settled by + 12', () => {
  const kicks = KICKS2.filter((k) => k > POP && k <= SWING.to);
  assert.deepEqual(kicks, [d2at(3, 2), d2at(3, 3), d2at(3, 4), d2at(4), d2at(4, 2), d2at(4, 3), d2at(4, 4)]);
  assert.equal(Z.KICK_LIGHT, 0.25);
  assert.equal(Z.PUMP_FALL, 12);
  const e = (f: number) => Z.zbufLook(f).exposure;
  for (const k of kicks) {
    assert.equal(Z.kickGlow(k - 1), 0, `${k - 1}: nothing before the kick`);
    assert.equal(Z.kickGlow(k), 1, `${k}: the pump lands on the kick frame`);
    for (let t = 1; t < 12; t++) {
      const drop = Z.kickGlow(k + t - 1) - Z.kickGlow(k + t);
      assert.ok(drop > 0 && drop <= 1 / 6, `${k + t}: falls, by ${drop.toFixed(3)} (at most a sixth)`);
    }
    assert.ok(Math.abs(Z.kickGlow(k + 6) - 0.25) < 1e-9, `${k + 6}: a quarter left half way through the 8th`);
    assert.equal(Z.kickGlow(k + 12), 0, `${k + 12}: settled`);
    const lift = e(k) / e(k - 1);
    assert.ok(lift >= 1.2 && lift <= 1.26, `${k}: exposure ${e(k - 1).toFixed(3)} → ${e(k).toFixed(3)} (×${lift.toFixed(3)})`);
  }
  assert.equal(Z.kickGlow(POP), 0, 'the pop has its own flare');
});

// Iteration 2 (the director's ruling 9; sync review 7): the march kicks of drop2 bar 4 (above all drop2 4.3, measured ×1.3 over its
// neighbours) need a visible accent of their own: his glowing cells flare on each march kick's own frame and settle within the 8th.
test('the march kicks flare him: his glowing cells ×1.8 on each march kick’s own frame, nothing the frame before, settled by + 8', () => {
  assert.equal(Z.marchLift(ZBUF2_MARCH[0] - 1), 1);
  for (const k of ZBUF2_MARCH) {
    assert.equal(Z.marchLift(k - 1), 1, `${k - 1}: nothing before the kick`);
    assert.ok(Math.abs(Z.marchLift(k) - 1.8) < 1e-9, `${k}: the flare lands on the kick frame`);
    assert.ok(Z.marchLift(k + 2) < Z.marchLift(k + 1) && Z.marchLift(k + 1) < Z.marchLift(k), 'and decays');
    assert.ok(Z.marchLift(k + 8) < 1.05, `${k + 8}: settled`);
  }
  const light = (f: number) => {
    const gs = Z.zbufContent(f, HERO).light.glyphs.mono ?? [];
    return mean(gs.map((g) => Math.max(...g.color) * (g.alpha ?? 1)));
  };
  const k = ZBUF2_MARCH[3];
  assert.ok(light(k) > 1.4 * light(k - 1), `drop2 4.3's light glyphs: ${light(k - 1).toFixed(2)} → ${light(k).toFixed(2)}`);
});

test('the shimmer re-rolls on every 16th hat: 10–15 % of his cells change shade, the rest hold', () => {
  const hats = [d2at(3, 4.25), d2at(3, 4.5), d2at(3, 4.75)];
  for (const h of hats) {
    let n = 0;
    let on = 0;
    for (let col = 0; col < 80; col++) for (let row = 0; row < 25; row++) {
      n++;
      if (Z.shimmer(h, col, row) !== 0) on++;
    }
    assert.ok(on / n > 0.1 && on / n < 0.15, `hat ${h}: ${((100 * on) / n).toFixed(1)} %`);
    assert.deepEqual(Array.from({ length: 50 }, (_, i) => Z.shimmer(h + 5, i, 7)), Array.from({ length: 50 }, (_, i) => Z.shimmer(h, i, 7)), 'held through the 16th');
  }
  assert.notDeepEqual(Array.from({ length: 200 }, (_, i) => Z.shimmer(d2at(3, 4.25), i, 3)), Array.from({ length: 200 }, (_, i) => Z.shimmer(d2at(3, 4.5), i, 3)));
});

// ——— Time ————————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('the characters are resolved at the output frame: one sub-frame, and sub-frames never cross drop2 5.1', () => {
  for (let f = POP; f < GAME; f++) {
    assert.equal(Z.zbufTemporal(f).samples, 1);
    assert.deepEqual(Z.zbufSegment(f), drop2Segment(f));
    for (const s of temporalSamples(f, Z.zbufTemporal(f), Z.zbufSegment(f))) assert.ok(s.frame < GAME);
  }
});

test('fast moves blur inside the cell pass: 64 instants on the shutter wherever he moves more than 20 px a frame, one where he is still', () => {
  let fast = 0;
  for (let f = PREROLL; f < GAME; f++) {
    const s = Z.zbufSampling(f, HERO);
    const move = Z.screenSpeed(f, HERO);
    if (move > 20 || (f >= ZBUF2.donut.from && f < ZBUF2.donut.to)) {
      fast++;
      assert.ok(s.instants.length >= 64, `${f}: ${move.toFixed(0)} px/f on ${s.instants.length} instants`);
    }
    for (const t of s.instants) assert.ok(t >= f - 0.25 && t <= f + 0.25);
  }
  assert.ok(fast > 20, `${fast} fast frames (the dolly-zoom, the donut, the swing, the collapse)`);
  assert.equal(Z.zbufSampling(PREROLL, HERO).instants.length, 1, 'the still pre-roll');
});

test('every frame is a pure function of the frame (no hidden state)', () => {
  const a = Z.zbufFrame(d2at(4, 1.25), HERO).cells.map((c) => c.ch).join('');
  frameAt(d2at(4, 3.75));
  const b = Z.zbufFrame(d2at(4, 1.25), HERO).cells.map((c) => c.ch).join('');
  assert.equal(a, b);
});

// ——— What the scene draws ——————————————————————————————————————————————————————————————————————————————————————————————

test('every character drawn is in drop 2’s dialect strings (check-glyphs covers them) and in the atlases the scene builds', () => {
  // (and the scan line's tag, Defender's readout on drop2 3.2: READOUT2, mono)
  const allowed = new Set([...Object.values(DIALECT_GLYPHS).join(''), ...READOUT2.find((l) => l.site === 'scanline')!.text]);
  for (const c of Z.ZBUF_GLYPHS.mono) assert.ok(allowed.has(c), `mono ${c}`);
  for (const c of Z.ZBUF_GLYPHS.digits) assert.ok(DIALECT_GLYPHS.swiss.includes(c), `digit ${c}`);
  for (const f of [PREROLL, POP, d2at(3, 1.5), d2at(3, 1.75) + 1, d2at(3, 2.25) + 2, d2at(3, 3.25), d2at(3, 4.25), d2at(4, 1.25), d2at(4, 2) + 3, d2at(4, 3.25) + 2, d2at(4, 4), d2at(4, 4) + 4, GAME - 9, GAME - 1]) {
    for (const mode of ['full', 'hero'] as const) {
      const c = Z.zbufContent(f, HERO, mode);
      for (const layer of [c.base, c.ink, c.light, c.top]) {
        for (const [atlas, glyphs] of Object.entries(layer.glyphs)) {
          const set = atlas === 'digits' ? Z.ZBUF_GLYPHS.digits : Z.ZBUF_GLYPHS.mono;
          for (const g of glyphs) assert.ok(set.includes(g.ch), `${f} ${mode}: ${atlas} ${g.ch}`);
          assert.ok(glyphs.length <= Z.CAPACITY.glyphs, `${f}: ${glyphs.length} glyphs`);
        }
        assert.ok(layer.under.length <= Z.CAPACITY.shapes, `${f}: ${layer.under.length} shapes`);
        assert.ok(layer.over.length <= 512);
      }
    }
  }
});

test('drop2 3.1–3.1 + 3: the cube’s face F outline fades into the character grid; the background is the backdrop’s dim dot grid', () => {
  const outline = (f: number) => Z.zbufContent(f, HERO, 'full').base.over.reduce((a, s) => Math.max(a, s.alpha ?? 1), 0);
  assert.ok(outline(POP) > 0.8);
  assert.ok(outline(POP + 1) < outline(POP) && outline(POP + 2) < outline(POP + 1));
  assert.equal(Z.zbufContent(POP + 3, HERO, 'full').base.over.length, 0);
  const fr = frameAt(d2at(3, 1.5));
  const bg = fr.cells.filter((c) => !c.hero);
  assert.ok(bg.length > 5000, `${bg.length} background cells`);
});

// ——— Living holds and the drums ————————————————————————————————————————————————————————————————————————————————————————————

test('the camera is never still for more than 12 frames: the orbit, the swing, intro bar 4’s breathing drift, the collapse', () => {
  let still = 0;
  for (let f = POP + 1; f < GAME; f++) {
    const a = Z.zbufCamera(f - 1, HERO);
    const b = Z.zbufCamera(f, HERO);
    const moved = Math.abs(a.yaw - b.yaw) + Math.abs(a.pitch - b.pitch) + Math.abs(Math.log(b.scale / a.scale)) * 100 + Math.abs(a.fov - b.fov) + Math.abs(a.fpx - b.fpx) / 10 > 1e-3;
    still = moved ? 0 : still + 1;
    assert.ok(still <= 12, `${f}: still for ${still} frames`);
  }
});

test('the rims (kick + 18) glint: a one-frame white contour where two dialects meet, or round his silhouette', () => {
  const white = (f: number) => Z.zbufContent(f, HERO).light.glyphs.mono!.filter((g) => g.color[0] > 2 && g.color[1] > 2 && g.color[2] > 2).length;
  for (const r of RIMS2.filter((x) => x > POP && x < SWING.to)) {
    assert.ok(white(r) >= 8, `rim ${r}: ${white(r)} white glyphs`);
    assert.equal(white(r + 1), 0, `gone on ${r + 1}`);
  }
});

test('intro bar 4’s frame is S04’s own screen: no dot grid, S04’s phosphor haze instead, the CRT on', () => {
  const c = Z.zbufContent(BLINK2.close + 4, HERO);
  assert.equal(c.base.glyphs.mono!.filter((g) => g.ch === '·').length, 0, 'no backdrop dots');
  assert.ok(c.light.under.length > 0, 'the haze');
  assert.ok(Z.zbufContent(d2at(4, 1.5) + 4, HERO).base.glyphs.mono!.filter((g) => g.ch === '·').length > 5000, 'the dot grid elsewhere');
  assert.equal(Z.zbufLook(BLINK2.close + 4).crt?.amount, 1);
  assert.equal(Z.zbufLook(d2at(4, 1.5) + 4).crt?.amount, 0);
  assert.equal(Z.zbufLook(COLLAPSE.from + 6).crt?.amount, 0, 'drained 6 frames into the collapse');
});

test('he sees us (drop2 4.3&): the pupils slide 0.05 em toward the lens, and back over the swing', () => {
  assert.equal(Z.pupilShift(PUPILS - 1), 0);
  assert.ok(Math.abs(Z.pupilShift(PUPILS + 4) - 0.05) < 0.006, `${Z.pupilShift(PUPILS + 4)}`);
  assert.ok(Z.pupilShift(SWING.to - 1) < 0.02);
  assert.equal(Z.pupilShift(SWING.to), 0);
});

test('H1: on drop2 3.1 the backdrop’s dots are S28’s grid shader’s — the same 12 × 22 cell centres, ≈ 2.6 px of ink (its 1.3 px radius), the same 12 %', () => {
  const INK_EM = 0.166; // JetBrains Mono’s middle dot is 166 units across (upm 1000)
  const dots = Z.zbufContent(POP, HERO, 'full').base.glyphs.mono!.filter((g) => g.ch === '·' && (g.alpha ?? 1) * (g.stretch ?? 1) < 0.3);
  assert.ok(dots.length > 5000);
  for (const g of dots.slice(0, 400)) {
    assert.ok(Math.abs(g.size * INK_EM - 2.6) < 0.2, `ink ${(g.size * INK_EM).toFixed(2)} px`);
    const lx = g.x + 960;
    const ly = 540 - g.y - Z.BACKDROP_DOT.drop;
    assert.ok(Math.abs(((lx - 6) / 12) - Math.round((lx - 6) / 12)) < 1e-9, `x on a cell centre: ${lx}`);
    assert.ok(Math.abs(((ly - 11) / 22) - Math.round((ly - 11) / 22)) < 1e-9, `y on a cell centre (less the glyph’s measured drop): ${ly}`);
    assert.ok(Math.abs((g.alpha ?? 1) * (g.stretch ?? 1) - 0.12) < 0.09, `alpha ${g.alpha} over a streak of ${g.stretch}`);
  }
});

// ——— Rev 1: the orbit never holds (R1-zbuf-near-still) ——————————————————————————————————————————————————————————————————————

test('the glint sweeps his front faces edge to edge once a beat and back, turning round off his face on the kicks', () => {
  const centre = [960, 525] as const;
  const peakX = (f: number) => {
    let best = -1;
    let bx = 0;
    for (let x = 0; x <= 1920; x += 4) {
      const g = Z.glint(f, x, 525, centre, 1000);
      if (g > best) {
        best = g;
        bx = x;
      }
    }
    return bx;
  };
  assert.ok(peakX(POP + 12) > 800 && peakX(POP + 12) < 1120, `mid-beat it crosses his centre: ${peakX(POP + 12)}`);
  assert.ok(Math.sign(peakX(POP + 6) - peakX(POP + 18)) === -Math.sign(peakX(POP + 30) - peakX(POP + 42)) && peakX(POP + 6) !== peakX(POP + 18), 'one way, then back');
  assert.ok(Z.glint(POP + 24, 960, 525, centre, 1000) < 0.05, 'off his face on the kick');
  assert.equal(Z.glint(SWING.from, 960, 525, centre, 1000), 0, 'none in intro bar 4’s frame');
  assert.equal(Z.glint(POP - 1, 960, 525, centre, 1000), 0, 'none in the pre-roll');
});

test('he bounces on the beat: lands on every kick at full speed, launches off it, rests only at the apex on the &', () => {
  for (const k of KICKS2.filter((x) => x > POP + 12 && x < SWING.from)) {
    assert.ok(Math.abs(Z.nod(k).y - Z.NOD.px) < 1e-9, `${k}: lowest on the kick`);
    assert.ok(Z.nod(k + 12).y < 1e-9, `${k + 12}: up on the &`);
    assert.ok(Z.nod(k).y - Z.nod(k - 1).y > 1.5, `${k}: lands fast`);
    assert.ok(Z.nod(k).y - Z.nod(k + 1).y > 1.5, `${k}: launches off it`);
  }
});

test('between the hits the 3D never holds: ≥ 12 % of his cells change every frame, his corner moves ≥ 2 px, the backdrop slides in parallax', () => {
  const key = (c: Z.ZCell) => `${c.col},${c.row},${c.ch}`;
  for (const f of [d2at(3, 2) + 4, d2at(3, 2.25) + 2, d2at(3, 2.75) + 3, d2at(4, 1.5) + 2, d2at(4, 1.75) + 2, d2at(4, 2.75) + 2, d2at(4, 3) + 4]) {
    const a = frameAt(f);
    const b = Z.zbufFrame(f + 1, HERO);
    const sa = new Set(hero(a).map(key));
    const sb = new Set(hero(b).map(key));
    let same = 0;
    for (const k of sa) if (sb.has(k)) same++;
    const changed = 1 - same / Math.max(sa.size, sb.size);
    assert.ok(changed >= 0.12, `${f} → ${f + 1}: ${(100 * changed).toFixed(0)} % of his cells change`);
    const pa = Z.project(a.cam, [HERO.ink[0], HERO.ink[2], 0]);
    const pb = Z.project(b.cam, [HERO.ink[0], HERO.ink[2], 0]);
    assert.ok(Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) >= 2, `${f}: his corner moves ${Math.hypot(pb[0] - pa[0], pb[1] - pa[1]).toFixed(1)} px`);
    const da = Z.dotMap(a.cam, HERO).at;
    const db = Z.dotMap(b.cam, HERO).at;
    assert.ok(Math.hypot(db[0] - da[0], db[1] - da[1]) > 1, `${f}: the backdrop slides`);
  }
});

test('the dot plane covers the frame on every frame (its edge never shows), and every dot is blurred along its own motion, its light spread over the streak', () => {
  for (const f of [POP, d2at(3, 1.5), d2at(3, 2), d2at(3, 3), d2at(3, 4), d2at(4), d2at(4, 2), d2at(4, 3), d2at(4, 3.5) + 2]) {
    const dots = frameAt(f).cells.filter((c) => !c.hero);
    for (const [x, y] of [[0, 0], [1919, 0], [0, 1079], [1919, 1079], [40, 540], [1880, 540]]) {
      const gap = Math.min(...dots.map((c) => Math.hypot(c.x - x, c.y - y)));
      assert.ok(gap < 16, `${f}: no dot within ${gap.toFixed(0)} px of (${x}, ${y}): the plane’s edge shows`);
    }
  }
  const glyphs = (f: number) => Z.zbufContent(f, HERO).base.glyphs.mono!.filter((g) => g.ch === '·');
  // drop2 3.1 starts on S28’s grid with no instant of the flat pre-roll: crisp in the middle, a radial burst toward the corners only (the
  // dolly-zoom is cubic-out, fastest on the downbeat).
  const pop = glyphs(POP);
  const streaks = pop.map((g) => g.stretch ?? 1).sort((x, y) => x - y);
  assert.ok(streaks[streaks.length >> 1] < 3, `drop2 3.1 (a shutter reaching into the pre-roll streaks them ≈ 30×): median streak ${streaks[streaks.length >> 1].toFixed(2)}`);
  for (const g of pop) {
    if (Math.hypot(g.x, g.y) < 200) assert.ok((g.stretch ?? 1) < 2.2, `drop2 3.1 is crisp near him: a dot streaks ${g.stretch}`);
    if ((g.stretch ?? 1) > 3) assert.ok(Math.abs(Math.cos((g.rot ?? 0) - Math.atan2(g.y, g.x))) > 0.8, 'the long streaks are the radial burst');
  }
  const hit = glyphs(d2at(3, 2));
  assert.ok(hit.filter((g) => (g.stretch ?? 1) > 1.5).length > 100, 'the drop2 3.2 hit streaks the plane');
  for (const g of hit) assert.ok((g.stretch ?? 1) >= 1 && (g.alpha ?? 1) * (g.stretch ?? 1) <= 0.45 + 1e-9, 'light is spread, not added');
  const dots = frameAt(d2at(3, 2.25) + 2).cells.filter((c) => !c.hero);
  assert.ok(dots.every((c) => Number.isFinite(c.streak) && Number.isFinite(c.angle)));
});

test('the colour law on BRUTAL’s beat (drop2 4.3; whole-film review 2026-10-03): his ω glows his amber, and nothing he lights is in Defender’s red family', () => {
  // Hue of a linear-light colour, degrees (−1 for a grey). In linear light Defender's reds sit at 2–4°, the old coral ω at 0°, his amber
  // at 25°, the eyes' yellow at 38° and the neon dialect's pink at 347°.
  const hue = ([r, g, b]: readonly number[]): number => {
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mx - mn < 1e-9) return -1;
    const h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
    return h * 60;
  };
  const red = (c: readonly number[]) => {
    const h = hue(c);
    return h >= 0 && (h < 10 || h > 352);
  };
  let amber = 0;
  for (let f = d2at(4, 3); f < d2at(4, 4); f += 3) {
    const lit = Z.zbufContent(f, HERO).light.glyphs.mono ?? [];
    for (const g of lit) assert.ok(!red(g.color), `${f}: a lit glyph in Defender's red family (${g.color.map((v) => v.toFixed(2))})`);
    amber += lit.filter((g) => Math.abs(hue(g.color) - 25) < 3).length;
  }
  assert.ok(amber > 100, `his amber ω is lit through the beat (${amber} glyphs)`);
});
