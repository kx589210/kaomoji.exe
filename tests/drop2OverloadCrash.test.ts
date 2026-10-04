// T7, drop2 8.3–end − 1 (src/shots/drop2Crash.ts; sheet §4.2 rows drop2 8.3–8.4&, §5.11, §9 H5): the freeze on the frame the last drop lands, the
// frozen type swirling round him into rings of colour (the film's most beautiful frame), the rings of light, the drain and the condense
// into the decodable state the ending starts from — v08: the drain, the condense and the blue are bridge B's (src/score/bridgeB.ts:
// the crash takes time, a stage a beat, on the program's falling frame rate; H5 on the bridge's last frame). Pure: a synthetic frozen
// field stands in for the GPU's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hue as hueOf, linear } from '../src/engine/color.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BULLET, CRASH, DRAIN, DROP2_END, RINGS, SORT, crashClock, stutterFrame, v04Of } from '../src/score/drop2.ts';
import { BRIDGE_B_END, BRIDGE_B_START, CONDENSE_B, FREEZE, HEART_B, INHALE, LEAKS, STAGES, TAPE_LAG, TINT, programFrame } from '../src/score/bridgeB.ts';
import * as BB from '../src/shots/bridgeB.ts';
import { partEnd, partFrame, partStart } from '../src/score/film.ts';
import { OUTRO_START } from '../src/score/outro.ts';
import { HANDOFFS, PALETTES, T7_CONDENSED, drop2Segment, t7CellCentre } from '../src/shots/drop2Shared.ts';
import * as K from '../src/shots/drop2Crash.ts';
import * as O from '../src/shots/drop2Overload.ts';
import { hash } from '../src/engine/random.ts';
import { LOG_HERO_INK, logHero } from '../src/shots/outroLog.ts';
import { OUTRO_HEX, SEAM_SPOT } from '../src/shots/outroShared.ts';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Drop 2's bar `bar`, beat `beat` (both 1-based, as src/score/drop2.ts writes them), as a film frame. */
const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
/**
 * The frames the crash shot itself draws (Drop2Overload): to the bullet time and from bridge B (v08); the bullet time between, with its
 * tape stop over drop 2's last beat, is Drop2Bullet's.
 */
const drawn = (f: number): boolean => f < BULLET.from || f >= BRIDGE_B_START;
/** The new pictures among the frames [a, b) the crash shot draws: every one before bridge B; in it the program's fresh frames (its frame rate falling). */
const pictures = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i).filter((f) => drawn(f) && (f < BRIDGE_B_START || programFrame(f) === f));

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const adv = (ch: string) => (ch === ' ' ? 0.3 : '()'.includes(ch) ? 0.45 : 0.7);
const width = (s: string) => [...s].reduce((w, ch) => w + adv(ch), 0);
const L: O.OverloadLayout = {
  advance: { rounded: adv, jp: adv, mono: () => 0.6, display: adv, bold: () => 0.6 },
  ink: new Map(O.INK_STRINGS.map(([font, text]) => [O.inkKey(font, text), { left: 0.06, right: width(text) - 0.06, up: 0.45, down: 0.4 }])),
  ascii: [],
  led: [],
  marquee: { width: 1, lit: [] },
};
/**
 * A frozen field like the GPU's: six worlds' colours in sectors round the centre (as S27's composite crash-zoomed), paler toward him
 * (his warm light), and his (×ω×) as a ring of calm =+* cells (an outline with a counter inside, so he has a clearing).
 */
const worlds = [PALETTES.neon.cyan, PALETTES.terminal.green, PALETTES.swiss.red, PALETTES.riso.pink, PALETTES.interlude.ground, PALETTES.interlude.mint];
const FIELD: O.FieldCell[] = [];
for (let row = O.FIELD.r0; row <= O.FIELD.r1; row++) {
  for (let col = O.FIELD.c0; col <= O.FIELD.c1; col++) {
    const [x, y] = t7CellCentre(col, row);
    const e = Math.hypot((x - 960) / 2.6, y - 540);
    const hero = e < 190 && e > 120;
    const sector = Math.floor(((Math.atan2(y - 540, x - 960) + Math.PI) / (2 * Math.PI)) * 6 + hash(col, row, 7) * 0.2) % 6;
    const warm = Math.exp(-((e / 260) ** 2));
    const ink = hero ? O.HERO_INK : O.fieldInk(linear(worlds[sector]).map((v, k) => v + warm * [1, 0.88, 0.72][k]) as unknown as [number, number, number]);
    FIELD.push({ col, row, i: hero ? 4 + Math.floor(hash(col, row) * 3) : 9, ink, hero, lum: O.luma(ink) });
  }
}
const PLAN = K.sortPlan(FIELD);
const CAP = K.capsuleOf(FIELD);
const M = O.clearing(FIELD);
const glyphsAt = (f: number): Glyph[] => {
  const out: Glyph[] = [];
  const n = K.crashGlyphs(f, FIELD, PLAN, out);
  return out.slice(0, n);
};
const layoutOf = (g: Glyph): [number, number] => [g.x + 960, 540 - g.y];
const cellAt = (g: Glyph): [number, number] => {
  const [x, y] = layoutOf(g);
  return [Math.round((x - 84) / 13.2 - 0.5), Math.round((y - 60) / 30 - 0.5)];
};
const movable = FIELD.map((c, k) => k).filter((k) => !FIELD[k].hero && M[k] < 1);
const slotD = (k: number) => K.capsuleDistance(...t7CellCentre(FIELD[PLAN[k].to].col, FIELD[PLAN[k].to].row), CAP);

test('the freeze: from the drop’s landing the content stops dead; the frame holds three frames, slipping two rows down on the first (the CRT losing vertical hold)', () => {
  for (let f = CRASH; f < DROP2_END; f++) assert.equal(stutterFrame(f), CRASH);
  assert.equal(K.slip(CRASH), 60);
  for (const f of [CRASH + 1, CRASH + 2, CRASH + 40]) assert.equal(K.slip(f), 0);
  const a = glyphsAt(CRASH + 1);
  const b = glyphsAt(CRASH + 2.25);
  assert.deepEqual(a.map((g) => [g.x, g.y, g.ch]), b.map((g) => [g.x, g.y, g.ch]), 'held through drop2 8.3 + 2');
  assert.ok(glyphsAt(CRASH).every((g, i) => Math.abs(g.y - (a[i].y - 60)) < 1e-9), 'on drop2 8.3 every row sits 60 px lower');
  const h0 = K.crashHero(CRASH, FIELD, L);
  const h1 = K.crashHero(CRASH + 1, FIELD, L);
  assert.ok(h0.bold.every((g, i) => Math.abs(g.y - (h1.bold[i].y - 60)) < 1e-9), 'his cells slip with the field');
  for (const f of [CRASH, CRASH + 1, CRASH + 2]) assert.equal(K.crashTemporal(f).samples, 1);
});

test('the sort: his cells and his clearing stay; every other cell takes another one’s place — the colours in rings round him, the palest beside him, all turning the same way round', () => {
  // A permutation of the movable cells; his cells and the cells inside his outline keep their places.
  assert.deepEqual([...movable.map((k) => PLAN[k].to)].sort((a, b) => a - b), movable);
  FIELD.forEach((c, k) => {
    if (c.hero || M[k] >= 1) assert.equal(PLAN[k].to, k);
  });
  assert.ok(movable.length > 3000 && FIELD.some((c, k) => !c.hero && M[k] >= 1), 'most cells move; a clearing stays');
  // Rings: cut the cells by their colour's place into the bands; every cell of a band sits no farther out than every cell of the next.
  const byKey = [...movable].sort((a, b) => K.ringKey(FIELD[a].ink) - K.ringKey(FIELD[b].ink) || a - b);
  const n = byKey.length;
  let prevMax = -Infinity;
  for (let j = 0; j < K.BANDS; j++) {
    const band = byKey.slice(Math.floor((j * n) / K.BANDS), Math.floor(((j + 1) * n) / K.BANDS)).map(slotD);
    assert.ok(Math.min(...band) >= prevMax - 1e-9, `band ${j} lies outside band ${j - 1}`);
    prevMax = Math.max(...band);
  }
  // The palest (his own light) take the innermost ring; the warm amber, last in the order, the outermost.
  assert.ok(K.ringKey([1, 0.95, 0.9]) < K.ringKey(linear(PALETTES.terminal.green)) && K.ringKey(linear(PALETTES.terminal.green)) < K.ringKey(linear(PALETTES.neon.cyan)));
  assert.ok(K.ringKey(linear(PALETTES.neon.cyan)) < K.ringKey(linear(PALETTES.interlude.ground)) && K.ringKey(linear(PALETTES.interlude.ground)) < K.ringKey(linear(PALETTES.riso.pink)));
  assert.ok(K.ringKey(linear(PALETTES.riso.pink)) < K.ringKey(linear(PALETTES.swiss.red)) && K.ringKey(linear(PALETTES.swiss.red)) < K.ringKey(linear(PALETTES.terminal.amber)));
  // A swirl, not a shuffle: every cell turns the same way round him, less than a full turn.
  for (const k of movable) assert.ok(PLAN[k].turn >= 0 && PLAN[k].turn < 2 * Math.PI, `${k}: ${PLAN[k].turn}`);
  // The same plan from the same field (every browser).
  assert.deepEqual(K.sortPlan(FIELD).map((s) => s.to), PLAN.map((s) => s.to));
});

test('the swirl leaves him ring by ring from drop2 8.3 + 3 (inner first) and every cell is home on the grid by drop2 8.4 − 1: THE FRAME is still', () => {
  for (const k of movable) {
    assert.ok(PLAN[k].t0 >= SORT.from && PLAN[k].t0 <= SORT.from + K.SORT_STAGGER, `${k} leaves at ${PLAN[k].t0}`);
    assert.ok(PLAN[k].t0 + K.SORT_FRAMES <= SORT.to - 1 + 1e-9, 'home by drop2 8.4 − 1');
  }
  const inner = movable.filter((k) => slotD(k) < 60).map((k) => PLAN[k].t0);
  const outer = movable.filter((k) => slotD(k) > 400).map((k) => PLAN[k].t0);
  assert.ok(Math.max(...inner) < Math.min(...outer), 'the inner rings leave first');
  assert.equal(K.swirl(SORT.from - 0.01, SORT.from), 0);
  assert.ok(K.swirl(SORT.from + 1, SORT.from) > 0.15, 'off at speed');
  // On drop2 8.4 every glyph sits on the grid, in its slot.
  for (const q of glyphsAt(RINGS[0])) {
    const [x, y] = layoutOf(q);
    const col = (x - 84) / 13.2 - 0.5;
    const row = (y - 60) / 30 - 0.5;
    assert.ok(Math.abs(col - Math.round(col)) < 1e-6 && Math.abs(row - Math.round(row)) < 1e-6, `on the grid (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }
  // Mid-swirl a cell is between its own place's radius and its slot's, turned part of the way.
  const k = movable.find((j) => PLAN[j].turn > 1)!;
  const p = K.swirlPosition(CRASH + 12, k, FIELD, PLAN);
  const r = (x: number, y: number) => Math.hypot((x - 960) / K.SWIRL_ASPECT, y - 540);
  const r0 = r(...t7CellCentre(FIELD[k].col, FIELD[k].row));
  const r1 = r(...t7CellCentre(FIELD[PLAN[k].to].col, FIELD[PLAN[k].to].row));
  assert.ok(r(...p) >= Math.min(r0, r1) - 1e-6 && r(...p) <= Math.max(r0, r1) + 1e-6);
  for (const f of range(SORT.from, SORT.to)) assert.equal(K.crashTemporal(f).samples, 64, `${f}: the glyphs streak`);
});

test('THE FRAME (drop2 8.4–8.4& − 1) glows toward him and is dark at the edges: a spectrum of rings round his dark clearing, the cells beside him over the glow’s threshold', () => {
  const g = glyphsAt(RINGS[0] + 3);
  const lumAt = (pred: (d: number) => boolean) => {
    const ls = g.filter((q) => {
      const [x, y] = layoutOf(q);
      const [col, row] = cellAt(q);
      const k = FIELD.findIndex((c) => c.col === col && c.row === row);
      return M[k] === 0 && pred(K.capsuleDistance(x, y, CAP));
    }).map((q) => Math.max(...q.color));
    return ls.reduce((a, b) => a + b, 0) / ls.length;
  };
  const near = lumAt((d) => d > O.CLEAR.outside && d < O.CLEAR.outside + 60); // just outside his clearing
  const edge = lumAt((d) => d > 420);
  assert.ok(near >= 0.9, `beside him ${near.toFixed(2)}`);
  // Round 2: the edges are lit enough for the film's pink to read (≈ 0.13–0.2), still a fifth of the light beside him.
  assert.ok(edge <= 0.25 && near / edge >= 4, `at the edges ${edge.toFixed(2)} (beside him ${near.toFixed(2)})`);
  assert.ok(K.glowAt(0) > 1 && K.glowAt(600) < 0.25);
  // The rings: ring colours change smoothly outward (the bands bleed into one spectrum): neighbouring places in the order differ little.
  const order = [...movable].sort((a, b) => slotD(a) - slotD(b));
  const ink = (k: number) => PLAN[k].ink;
  let jumps = 0;
  for (let i = 1; i < order.length; i++) {
    const a = ink(order[i - 1]);
    const b = ink(order[i]);
    if (Math.max(...[0, 1, 2].map((c) => Math.abs(a[c] - b[c]))) > 0.35) jumps++;
  }
  assert.ok(jumps < order.length * 0.05, `${jumps} hard jumps between neighbouring rings`);
  // Saturated: the rings are colour, not grey (bar the pale rim beside him).
  const sat = (c: readonly number[]) => (Math.max(...c) - Math.min(...c)) / Math.max(...c);
  const outer = order.slice(Math.floor(order.length * 0.3)).map((k) => sat(ink(k)));
  assert.ok(outer.reduce((a, b) => a + b, 0) / outer.length > 0.6, 'saturated');
});

test('THE FRAME breathes: rings of light leave his outline on drop2 8.4 and 8.4 + 6, +40 % at the crest, the view drifting ≤ 2 % and never stopping', () => {
  assert.equal(K.ringGain(RINGS[0] - 1, 0), 1);
  assert.ok(Math.abs(K.ringGain(RINGS[0], K.RING.from) - 1.4) < 1e-9, 'born at the rim of his black spot on drop2 8.4');
  assert.ok(K.RING.from >= O.CLEAR.inside && K.RING.from <= O.CLEAR.outside, 'the rim: the clearing’s feather');
  assert.ok(Math.abs(K.ringGain(RINGS[1], K.RING.from + 6 * K.RING.speed) - 1.4) < 0.01, 'the first ring 420 px further out when the second leaves');
  assert.ok(K.ringGain(RINGS[1], K.RING.from + 3 * K.RING.speed) < 1.05, 'dark between the rings');
  for (let f = CRASH; f < BRIDGE_B_END; f += 0.25) {
    const z = K.driftZoom(f);
    assert.ok(z >= 1 && z <= 1.02 + 1e-12, `${f}: ${z}`);
  }
  // On every new picture up to the freeze (bridge B's are the program's fresh frames: the frame rate falling).
  const ps = pictures(CRASH, FREEZE + 1);
  for (let i = 1; i < ps.length; i++) assert.notEqual(K.driftZoom(ps[i]), K.driftZoom(ps[i - 1]), `${ps[i]}: the view never stops`);
  assert.equal(K.driftZoom(FREEZE), 1, 'back at exactly 1.00 by the program’s freeze (bridge 1.4)');
  assert.equal(K.driftZoom(BRIDGE_B_END - 1), 1, 'and for the hand-off (R12)');
  for (const f of range(RINGS[0], DRAIN.from)) assert.equal(K.crashTemporal(f).samples, 8);
});

test('his face outranks the frame: hot pale-amber =+* strokes (the same characters, so the hexdump bytes stay) over his face filled in amber, in a dark clearing', () => {
  const h = K.crashHero(RINGS[0], FIELD, L);
  const his = FIELD.filter((c) => c.hero);
  assert.equal(h.bold.length, his.length);
  assert.deepEqual(h.bold.map((g) => g.ch), his.map((c) => '=+*'[c.i - 4]));
  for (const g of h.bold) assert.ok(Math.max(...g.color) > 2 && g.color[0] >= g.color[1] && g.color[1] > g.color[2], 'hot, amber-white');
  assert.ok(h.rounded.length === 5 && h.rounded.map((g) => g.ch).join('') === '(×ω×)', 'his face, filled, under the strokes');
  assert.ok(h.under.length > his.length, 'his glow');
  // The clearing: the type inside his outline is dark; the brightest type outside sits right beside it.
  const inside = glyphsAt(RINGS[0]).filter((q) => {
    const [col, row] = cellAt(q);
    const k = FIELD.findIndex((c) => c.col === col && c.row === row);
    return M[k] >= 1;
  });
  assert.ok(inside.length > 50, `${inside.length} cells in his clearing`);
  for (const q of inside) assert.ok(Math.max(...q.color) < 0.004, `dark in the clearing: ${q.color}`);
});

// ——— Round 2: D2-CRASH-MUD (the clearing was an olive box: dim green @ under an amber haze, square-edged; the outer ring a dull maroon;
// the rings stood still from drop2 8.4 − 4) ————————————————————————————————————————————————————————————————————————————————————————————

test('D2-CRASH-MUD: his clearing is the soap film’s black spot — shaped by his outline (a function of the distance from it alone, no box), soft-edged, and no @ shows inside it', () => {
  const d = (k: number) => K.capsuleDistance(...t7CellCentre(FIELD[k].col, FIELD[k].row), CAP);
  FIELD.forEach((c, k) => {
    if (c.hero) return assert.equal(M[k], 0);
    const want = 1 - O.smoothstepClear(d(k));
    assert.ok(Math.abs(M[k] - want) < 1e-6, `${c.col},${c.row}: the clearing follows his outline (d ${d(k).toFixed(0)}: ${M[k]} vs ${want})`);
  });
  assert.equal(O.smoothstepClear(O.CLEAR.inside), 0);
  assert.equal(O.smoothstepClear(O.CLEAR.outside), 1);
  assert.ok(O.CLEAR.outside - O.CLEAR.inside >= 45, 'a soft edge, at least a row and a half');
  // The old clearing was every cell between his first and last cell of a row (a box): its corners now stay type.
  const corners = FIELD.map((c, k) => k).filter((k) => !FIELD[k].hero && d(k) > O.CLEAR.outside);
  const spans = O.heroSpans(FIELD);
  const boxCorners = corners.filter((k) => {
    const s = spans.get(FIELD[k].row);
    return s !== undefined && FIELD[k].col > s[0] && FIELD[k].col < s[1];
  });
  for (const k of boxCorners) assert.equal(M[k], 0, `${FIELD[k].col},${FIELD[k].row}: outside his outline, not cleared`);
  assert.equal(O.CLEARING, 0);
  // No @ shows inside: from the freeze through THE FRAME, and in the overload's field.
  for (const f of [CRASH + 1, RINGS[0], RINGS[1] + 3, DRAIN.from + 2]) {
    for (const q of glyphsAt(f)) {
      const [col, row] = cellAt(q);
      const k = FIELD.findIndex((c) => c.col === col && c.row === row);
      if (k >= 0 && M[k] >= 1 && !FIELD[k].hero && PLAN[k].to === k) assert.ok(Math.max(...q.color) * (q.alpha ?? 1) < 0.004, `${f}: no @ in his clearing (${q.color})`);
    }
  }
  const out: Glyph[] = [];
  const n = O.fieldGlyphs(FIELD, out);
  out.slice(0, n).forEach((q) => {
    const [col, row] = cellAt(q);
    const k = FIELD.findIndex((c) => c.col === col && c.row === row);
    if (M[k] >= 1) assert.ok(Math.max(...q.color) < 0.004, 'drop2 8.1–8.2 too');
  });
});

test('D2-CRASH-MUD: under him a deep indigo spot (amber’s complement) shaped like his outline, soft-edged; the amber glow stays tight round his strokes — no haze over the clearing', () => {
  const h = K.crashHero(RINGS[0], FIELD, L);
  const spot = h.under[0];
  assert.equal(spot.kind, 'rect');
  assert.ok(Math.abs((spot.r ?? 0) - spot.h / 2) < 1e-6 && spot.w > spot.h, 'a stadium: his outline’s shape');
  assert.ok(Math.abs(spot.w / 2 - spot.h / 2 - (CAP.hx - CAP.hy)) < 1e-6, 'the same straight run as his outline');
  assert.ok((spot.soft ?? 0) >= 40, 'soft-edged');
  assert.ok(spot.color[2] > 2.5 * spot.color[0] && spot.color[2] > 3 * spot.color[1] && Math.max(...spot.color) < 0.08, `deep indigo (${spot.color})`);
  // The rest of his glow: small halos on his cells only (none wider than about a cell and a half), so it cannot fog the clearing.
  const amber = h.under.slice(1);
  assert.ok(amber.length === FIELD.filter((c) => c.hero).length, 'one halo per cell of his, no wide glow');
  for (const s of amber) assert.ok(s.w <= 34 && s.h <= 48 && s.color[0] > s.color[2], 'tight and amber');
  // WP6 (v07): from the drain's hand-back the spot is seamSpot's (first under him), v06's spent: exactly v06's spot on the hand-back,
  // then it turns blue, holds his clearing and inhales onto him (the next test).
  const back = K.SEAM_GLOW.from;
  const v06 = O.heroField(FIELD, CRASH, L, { scale: K.condense(back).scale, cy: K.condense(back).cy, alpha: 1, spot: 1 }).under[0];
  const seam = K.crashHero(back, FIELD, L).under[0];
  assert.equal(seam.kind, v06.kind);
  for (const k of ['x', 'y', 'w', 'h', 'r', 'soft'] as const) assert.ok(Math.abs((seam[k] ?? 0) - (v06[k] ?? 0)) < 1e-9, `${k} on the hand-back: ${seam[k]} vs ${v06[k]}`);
  assert.deepEqual(seam.color, O.HERO_SPOT.ink, 'still indigo on the hand-back');
  assert.equal(K.crashHero(back, FIELD, L).under[1].alpha, 0, 'v06’s spot spent');
  // drop2 8.1–8.2: the same spot under his field face.
  const f = O.heroField(FIELD, d2at(8, 2.5), L);
  assert.ok(f.under[0].kind === 'rect' && f.under[0].color[2] > 2.5 * f.under[0].color[0]);
});

test('D2-CRASH-MUD: the outer rings are the soap film’s pink, saturated and lit enough to read as pink (not a dull maroon)', () => {
  const order = [...movable].sort((a, b) => slotD(a) - slotD(b));
  const outer = order.slice(Math.floor(order.length * 0.9));
  const sat = (c: readonly number[]) => (Math.max(...c) - Math.min(...c)) / Math.max(...c);
  const hues = outer.map((k) => hueOf(PLAN[k].ink));
  const pink = hues.filter((h) => h >= 300 && h <= 345).length;
  assert.ok(pink >= 0.9 * outer.length, `the outermost tenth is magenta-pink (${pink} of ${outer.length})`);
  for (const k of outer) assert.ok(sat(PLAN[k].ink) >= 0.85, `saturated (${PLAN[k].ink})`);
  // On THE FRAME the outermost rings are lit to at least 0.13 of full: pink, not maroon.
  const g = glyphsAt(RINGS[0] + 3).filter((q) => K.capsuleDistance(...layoutOf(q), CAP) > slotD(outer[0]));
  const level = g.reduce((a, q) => a + Math.max(...q.color), 0) / g.length;
  assert.ok(level >= 0.13 && level <= 0.4, `outer rings at ${level.toFixed(3)}`);
});

const byRank = new Map(movable.map((k) => [PLAN[k].rank!, k]));
test('D2-CRASH-MUD: from drop2 8.4 − 3 the hue rings drift outward, one ring a beat, so THE FRAME shimmers like the drop2 1.1 film — while every glyph stays on its cell', () => {
  assert.equal(K.ringDrift(K.DRIFT_FROM), 0);
  assert.equal(K.DRIFT_FROM, RINGS[0] - 3);
  assert.ok(Math.abs(K.ringDrift(BULLET.from - 1) - (K.RING_SHARE * (BULLET.from - 1 - K.DRIFT_FROM)) / 24) < 1e-9, 'one ring a beat (to the bullet time, which holds it)');
  assert.ok(K.RING_SHARE >= 1 / 8 && K.RING_SHARE <= 1 / 4);
  // It never stops while the crash shot draws (the bullet time between holds it: positions frozen, the camera moving).
  const ps = pictures(K.DRIFT_FROM, FREEZE + 1);
  for (let i = 1; i < ps.length; i++) assert.ok(K.ringDrift(ps[i]) > K.ringDrift(ps[i - 1]), `${ps[i]}: it never stops`);
  // At a fixed cell the colour becomes one from further in the rings' order (inner → outer): the rings move outward.
  const ring = movable.filter((k) => slotD(k) > 40);
  let moved = 0;
  for (const k of ring) {
    const a = K.ringSource(PLAN, k, RINGS[0]);
    const b = K.ringSource(PLAN, k, DRAIN.from - 1);
    assert.ok(b >= 0 && b <= a, `${k}: inward colours move out (rank ${a} → ${b})`);
    assert.deepEqual(K.ringInkAt(PLAN, k, DRAIN.from - 1), PLAN[byRank.get(b)!].ink);
    if (b < a && Math.max(...[0, 1, 2].map((c) => Math.abs(K.ringInkAt(PLAN, k, DRAIN.from - 1)[c] - K.ringInkAt(PLAN, k, RINGS[0])[c]))) > 1e-4) moved++;
  }
  assert.ok(moved > 0.5 * ring.length, `${moved} of ${ring.length} cells shimmer between drop2 8.4 and 8.4& − 1`);
  assert.deepEqual(K.ringInkAt(PLAN, ring[0], K.DRIFT_FROM - 5), K.ringInkAt(PLAN, ring[0], K.DRIFT_FROM), 'still before drop2 8.4 − 3');
  // Every glyph still sits on its cell on drop2 8.4& − 1 (the colours move, the type does not).
  for (const q of glyphsAt(DRAIN.from - 1)) {
    const [x, y] = layoutOf(q);
    const col = (x - 84) / 13.2 - 0.5;
    assert.ok(Math.abs(col - Math.round(col)) < 1e-6, `on the grid (${x.toFixed(2)}, ${y.toFixed(2)})`);
  }
});

test('D2-CRASH-MUD: THE FRAME sparkles — six glints (drop 1’s galaxy’s four-point stars) twinkle in turn on the rings from drop2 8.4 − 3, never on him, gone as the drain reaches them', () => {
  assert.equal(K.GLINTS.length, 6);
  for (const g of K.GLINTS) {
    assert.ok(K.capsuleDistance(g.x, g.y, CAP) > O.CLEAR.outside + 10, `(${g.x}, ${g.y}) sits on the rings, off his black spot`);
    assert.ok(g.x - g.size / 2 > 0 && g.x + g.size / 2 < 1920 && g.y - g.size / 2 > 0 && g.y + g.size / 2 < 1080, 'whole in the frame');
  }
  for (const f of range(CRASH, K.GLINT_FROM)) assert.equal(K.glints(f, FIELD).length, 0, `${f}: none before the swirl settles`);
  // In turn: at no frame are more than half of them near full.
  for (let f = K.GLINT_FROM; f < DRAIN.from; f += 0.5) {
    const lit = K.GLINTS.filter((g) => K.glintLevel(f, g, CAP) > 0.8).length;
    assert.ok(lit <= 3, `${f}: ${lit} at full`);
  }
  for (const f of range(K.GLINT_FROM + 2, DRAIN.from)) assert.ok(K.glints(f, FIELD).length >= 5, `${f}: some glint is lit`);
  // v08: they drain with their rings in bridge B (the landing's, the tear's), and the music box's A♯5 on the landing flares them first.
  for (const f of range(STAGES.tear + 2 * BB.RIPPLE + BB.DRAIN_STEP + 2, BRIDGE_B_END)) assert.equal(K.glints(f, FIELD).length, 0, `${f}: drained`);
  assert.ok(Math.max(...K.GLINTS.map((g) => K.glintLevel(STAGES.colour, g, CAP))) > 0.5, 'the landing note flares them');
});

test('D2-CRASH-MUD: in the drain his old face never shows as a stencil — his former cells and the rest of his black spot fill with the dim @ together (v08: on the corruption, bridge 1.3), and (WP6) stay clear together under his blue spot', () => {
  const his = new Set(FIELD.map((c, k) => k).filter((k) => FIELD[k].hero).map((k) => `${FIELD[k].col},${FIELD[k].row}`));
  const spot = new Set(FIELD.map((c, k) => k).filter((k) => !FIELD[k].hero && M[k] >= 1).map((k) => `${FIELD[k].col},${FIELD[k].row}`));
  const dimLum = O.luma(K.DRAINED);
  let seen = 0;
  for (const f of range(STAGES.corrupt - 2, BRIDGE_B_END)) {
    const t = programFrame(f);
    const lum = (q: Glyph) => O.luma(q.color) * (q.alpha ?? 1);
    // Both kinds of cell are one function of time and place: the drained @ filling in (RESIDUE for his cells; the spot's rim cells by their
    // ring's stage, a cell up to 2 frames late) where the blue spot has left them. (A row torn sideways is skipped: its cells moved.)
    for (const q of glyphsAt(f)) {
      const [x, y] = layoutOf(q);
      const row = Math.round((y - 60) / 30 - 0.5);
      if (BB.tearDx(row, t, BB.retractU(f)) !== 0) continue;
      const c = cellAt(q);
      const key = c.join();
      const hisCell = his.has(key) && q.ch === '@';
      if (!hisCell && !spot.has(key)) continue;
      const fill = hisCell ? clamp01((t - K.RESIDUE.from) / (K.RESIDUE.to - K.RESIDUE.from)) : BB.drainedBy(t, BB.drainAt(K.capsuleDistance(x, y, CAP), BB.drainJitter(c[0], c[1])));
      // (Exposed by the inhale, a rim cell takes the leak's blue as it goes back in.)
      const tint = hisCell ? 0 : BB.leakTint(x, y, f, K.seamSpotAt(f, CAP)!);
      const ink = BB.leakInk([0, 1, 2].map((ch) => K.DRAINED[ch] * fill) as [number, number, number], tint);
      const w = (hisCell ? dimLum * fill : O.luma(ink)) * (1 - K.spotCover(f, CAP, x, y));
      assert.ok(Math.abs(lum(q) - w) < 1e-3, `${f} ${key}: ${lum(q).toFixed(4)} vs ${w.toFixed(4)}`);
      seen++;
    }
  }
  assert.ok(seen > 1000, `${seen} cells judged`);
  assert.equal(K.RESIDUE.from, K.drainStart(0));
  assert.ok(K.RESIDUE.from >= STAGES.corrupt && K.RESIDUE.from < STAGES.corrupt + BB.RIPPLE, 'on the corruption');
});

test('v08, the blue: his spot stays indigo through the landing, turns half the blue screen’s blue on his heart’s lub and the rest on the corruption, holds his clearing, leaks out a step a stage, and the inhale draws it all back in (I), landing on outro 1.1 as SEAM_SPOT, the @ clearing out under it', () => {
  const spotAt = (f: number) => K.crashHero(f, FIELD, L).under[0];
  const blue = linear(OUTRO_HEX.blue);
  const indigo = O.HERO_SPOT.ink;
  // From the bullet time's hand-back to the lub: v06's indigo spot, his clearing's size.
  for (const f of [K.SEAM_GLOW.from, BRIDGE_B_START, TINT.from - 1]) assert.deepEqual(spotAt(f).color, indigo, `${f}: indigo`);
  const half = spotAt(TINT.from + TINT.frames).color;
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(half[k] - (indigo[k] + TINT.first * (blue[k] * K.SEAM_GLOW.drained - indigo[k]))) < 1e-9, `half way on the lub: ${half}`);
  const full = spotAt(TINT.full + TINT.frames).color;
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(full[k] - blue[k] * K.SEAM_GLOW.drained) < 1e-9, `the blue screen's blue at ${K.SEAM_GLOW.drained} from the corruption: ${full}`);
  assert.equal(TINT.from, HEART_B.lub);
  // It holds his clearing's size until the inhale, then draws in, never growing, and lands on outro 1.1 (the instant the ending takes over).
  assert.equal(spotAt(INHALE.from).w, spotAt(BRIDGE_B_START).w, 'held through the bridge');
  let w = Infinity;
  for (let f = INHALE.from; f < BRIDGE_B_END; f += 0.25) {
    const sp = spotAt(f);
    assert.ok(sp.w <= w + 1e-9, `${f}: drawing in`);
    w = sp.w;
  }
  const land = K.seamSpotAt(BRIDGE_B_END, CAP)!;
  assert.deepEqual([land.hw, land.hh, land.cy, land.soft], [SEAM_SPOT.hw, SEAM_SPOT.hh, SEAM_SPOT.centre[1], SEAM_SPOT.soft]);
  const span = (a: number, b: number) => spotAt(a).w - spotAt(b).w;
  assert.ok(span(BRIDGE_B_END - 2, BRIDGE_B_END - 1) > 3 * span(INHALE.from, INHALE.from + 1), 'accelerating (an impact, no hold)');
  // The leak: none before the lub, a step on it and on each stage after (¾ in 3 frames), all of it back in by the bridge's last frame.
  assert.equal(BB.leakPx(HEART_B.lub - 1), 0);
  for (const l of LEAKS) assert.ok(BB.leakPx(l.at + 3) - BB.leakPx(l.at - 0.5) > 0.7 * l.px * (1 - BB.retractU(l.at + 3)), `a step on ${l.at}`);
  assert.equal(BB.leakPx(BRIDGE_B_END - 1), 0);
  // The bridge's last frame: his face on a clean blue spot in the dim field — no @ over the spot's full-lit core, the field whole outside it.
  const g = glyphsAt(BRIDGE_B_END - 1).filter((q) => (q.alpha ?? 1) > 0.02);
  const sp = K.seamSpotAt(BRIDGE_B_END - 1, CAP)!;
  const inCore = (q: Glyph) => {
    const [x, y] = layoutOf(q);
    return Math.hypot(Math.max(0, Math.abs(x - 960) - (sp.hw - sp.hh)), y - sp.cy) - sp.hh < -sp.soft;
  };
  assert.equal(g.filter(inCore).length, 0, 'clear under the spot');
  assert.ok(g.length > 0.9 * FIELD.length, 'the field round it whole');
  assert.ok(Math.max(...sp.ink) <= blue[2] * K.SEAM_GLOW.held + 1e-9, 'never brighter than the blue screen');
});

test('v08, the drain a ring a stage: the edges on the landing (bridge 1.1), the middle on the tear (1.2), the pale rim and his clearing on the corruption (1.3), each ring from its outer edge in, so the field is one even dim text (but where the blue reaches) by the freeze', () => {
  const dim = linear(PALETTES.terminal.text, 0.42);
  const near = (a: readonly number[], b: readonly number[]) => [0, 1, 2].every((k) => Math.abs(a[k] - b[k]) < 1e-6);
  assert.ok(K.drainStart(700) >= STAGES.colour && K.drainStart(700) < K.drainStart(400) && K.drainStart(400) <= STAGES.colour + BB.RIPPLE, 'the edges on the landing, the outermost first');
  assert.ok(K.drainStart(200) >= STAGES.tear && K.drainStart(200) <= STAGES.tear + BB.RIPPLE, 'the middle on the tear');
  assert.ok(K.drainStart(60) >= STAGES.corrupt && K.drainStart(-50) <= STAGES.corrupt + BB.RIPPLE, 'the rim and the clearing on the corruption');
  assert.ok(K.drainStart(2000) >= BRIDGE_B_START, 'nothing drains in drop 2 (its last beat is the bullet time’s landing)');
  const d = (q: Glyph) => K.capsuleDistance(...layoutOf(q), CAP);
  // A picture into each stage (no blue yet on the landing's; then the cells the blue does not reach).
  const reach = (f: number) => K.seamSpotAt(f, CAP)!;
  const plain = (f: number) => (q: Glyph) => BB.leakTint(...layoutOf(q), f, reach(f)) === 0 && q.ch === '@';
  const a = glyphsAt(STAGES.colour + 12);
  assert.ok(a.filter((q) => d(q) > 360).length > 50);
  for (const q of a.filter((x) => d(x) > 360)) assert.ok(near(q.color, dim), `the edges drained on the landing: ${q.color}`);
  assert.ok(a.filter((q) => d(q) > 20 && d(q) < 80).every((q) => Math.abs(q.color[1] - dim[1]) > 1e-3), 'his neighbours still coloured');
  const b = glyphsAt(STAGES.tear + 12).filter(plain(STAGES.tear + 12));
  for (const q of b.filter((x) => d(x) > 140)) assert.ok(near(q.color, dim), `the middle drained on the tear: ${q.color}`);
  assert.ok(b.filter((q) => d(q) > 20 && d(q) < 80).every((q) => Math.abs(q.color[1] - dim[1]) > 1e-3), 'the rim still coloured');
  // The freeze: every @ is the dim text, or (where the blue reaches) the dim text turning the blue screen's dim type.
  const f = FREEZE;
  const c = glyphsAt(f).filter((q) => q.ch === '@' && (q.alpha ?? 1) === 1);
  assert.ok(c.length > 0.5 * FIELD.length, `${c.length} cells judged (the spot clears a third)`);
  for (const q of c) assert.ok(near(q.color, BB.leakInk(dim, BB.leakTint(...layoutOf(q), f, reach(f)))), `drained by the freeze: ${q.color}`);
});

test('v08, the glitches: the CRT slips a row on his heart’s lub (not on the line); rows tear sideways on the tear and the corruption, settling within the beat, and the freeze stops one mid-tear until the inhale; blocks print the field’s own bytes in hex (or blue, or shifted) only where the blue reaches', () => {
  // The slip: the field one row down on the lub's picture, back on the next; nothing slips on the bridge's first frame.
  const y0 = (f: number) => Math.min(...glyphsAt(f).map((q) => layoutOf(q)[1]));
  assert.equal(y0(STAGES.colour), y0(BRIDGE_B_START - 12), 'no jump on the line');
  assert.equal(y0(HEART_B.lub) - y0(BRIDGE_B_START - 12), 30, 'one row down on the lub');
  assert.equal(y0(HEART_B.lub + 3), y0(BRIDGE_B_START - 12), 'back on the next picture');
  // The tears: whole cells, some rows thrown, gone again before the next stage; the freeze's held until the inhale draws it straight.
  const rows = range(-2, 34);
  const thrown = (f: number) => rows.filter((r) => BB.tearDx(r, programFrame(f), BB.retractU(f)) !== 0).length;
  for (const f of [STAGES.tear, STAGES.corrupt, FREEZE]) assert.ok(thrown(f) >= 6, `rows torn on ${f}: ${thrown(f)}`);
  for (const r of rows) assert.ok(Math.abs(BB.tearDx(r, STAGES.tear) / 13.2 - Math.round(BB.tearDx(r, STAGES.tear) / 13.2)) < 1e-9, 'whole cells');
  assert.equal(thrown(STAGES.corrupt - 1), 0, 'the tear settled within its beat');
  assert.ok(thrown(BRIDGE_B_END - 7) > 0, 'the freeze holds its tear');
  assert.equal(thrown(BRIDGE_B_END - 1), 0, 'drawn straight by the last frame');
  // The corruption: hex digits of '@' (40), in blocks, from the corruption on, where the blue reaches; none on H5.
  const hex = (f: number) => glyphsAt(f).filter((q) => q.ch !== '@').map((q) => q.ch);
  assert.equal(hex(STAGES.corrupt - 1).length, 0, 'none before the corruption');
  assert.ok(hex(STAGES.corrupt).length > 20, 'printed on the corruption');
  assert.ok(hex(FREEZE).every((ch) => '0123456789abcdef'.includes(ch)) && hex(FREEZE).includes('4'), 'the field’s bytes (@ = 40)');
  assert.ok(hex(FREEZE).length > hex(STAGES.corrupt).length, 'growing outward wave by wave');
  assert.equal(hex(BRIDGE_B_END - 1).length, 0, 'taken back with the blue');
  const blocks = BB.corruptBlocks(K.clearStadium(CAP));
  for (const blk of blocks) assert.ok(BB.stadiumDistance(blk.cx, blk.cy, K.clearStadium(CAP)) > 0, 'outside his clearing: never over his face');
  // The veil over the frozen picture: none before the freeze, settling over a 16th, gone by the last frame.
  assert.equal(BB.veilAt(FREEZE - 1), 0);
  assert.ok(BB.veilAt(FREEZE + 6) > 0.99);
  assert.equal(BB.veilAt(BRIDGE_B_END - 1), 0);
});

test('H5 on the bridge’s last frame (v08: bridge B’s, drop 2 ending on the bullet time’s landing): one even field — every cell an @ in dim text at 42 %, his former cells too, on the grid — and one face on his blue spot (WP6: the cells under it clear)', () => {
  const dim = linear(PALETTES.terminal.text, 0.42);
  const last = BRIDGE_B_END - 1;
  const g = glyphsAt(last);
  const seen = new Set<string>();
  for (const q of g) {
    assert.equal(q.ch, '@');
    assert.equal(q.size, 22);
    // Full wherever the spot is not; under it, cleared by its cover.
    assert.ok(Math.abs((q.alpha ?? 1) - (1 - K.spotCover(last, CAP, ...layoutOf(q)))) < 1e-9, `alpha ${q.alpha}`);
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(q.color[k] - dim[k]) < 1e-6, `drained ink ${q.color}`);
    seen.add(cellAt(q).join());
  }
  assert.equal(seen.size, g.length, 'every cell of the grid at most once');
  const whole = FIELD.filter((c) => K.spotCover(last, CAP, ...t7CellCentre(c.col, c.row)) === 0);
  assert.ok(whole.every((c) => seen.has(`${c.col},${c.row}`)), 'every cell outside the spot');
  // His big ASCII face is gone; only the crisp one is left, on the blue spot (the one thing under him: the leak, the glow, the veil gone).
  const h = K.crashHero(last, FIELD, L);
  assert.equal(h.bold.length + h.rounded.length, 0);
  assert.equal(h.under.length, 1);
  assert.deepEqual(h.under[0], K.seamSpot(last, CAP));
  assert.equal(K.H5.field.ch, '@');
  assert.equal(K.H5.his.ch, '@');
  assert.deepEqual([K.H5.spot.hw, K.H5.spot.hh, ...K.H5.spot.centre, K.H5.spot.landsOn], [SEAM_SPOT.hw, SEAM_SPOT.hh, ...SEAM_SPOT.centre, BRIDGE_B_END]);
  assert.equal(BRIDGE_B_END, OUTRO_START);
  assert.equal(DROP2_END, partStart('bridgeB'));
});

test('the condense (v08: on the corruption, bridge 1.3, on the program’s pictures): his cells pull into a crisp amber (×ω×), 440 px at (960, 450), crossing over its + 4 … + 9; the bridge’s last frame is H5', () => {
  const h = K.condense(BRIDGE_B_END - 1);
  assert.ok(Math.abs(h.scale - 0.43) < 0.005 && Math.abs(h.cy - 450) < 0.5, `${h.scale} ${h.cy}`);
  for (const f of [DRAIN.from - 1, BRIDGE_B_START, CONDENSE_B.from - 1]) assert.equal(K.condense(f).scale, 1, `${f}: full size`);
  // The crossing on the program's pictures (10 fps from the corruption: 1.3, + 6, + 12 …).
  assert.deepEqual([CONDENSE_B.from, CONDENSE_B.from + 6, CONDENSE_B.from + 12, FREEZE, BRIDGE_B_END - 1].map((f) => +K.condense(f).crisp.toFixed(3)), [0, 0.4, 1, 1, 1]);
  assert.equal(K.condense(CONDENSE_B.from + 3).crisp, K.condense(CONDENSE_B.from).crisp, 'a held picture holds the crossing');
  const face = K.crispFace(BRIDGE_B_END - 1, L);
  const xs = face.map((g) => g.x + 960);
  assert.equal(face.map((g) => g.ch).join(''), T7_CONDENSED.face);
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 960) < 6);
  assert.equal(K.crispFace(CONDENSE_B.from - 2, L).length, 0, 'not before the crossing');
  // On the corruption's first picture his cells are on their way to (960, 450), smaller.
  const mid = K.crashHero(CONDENSE_B.from, FIELD, L).bold;
  const ys = mid.map((g) => 540 - g.y);
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  assert.ok(cy < 540 - 2 && cy > 450 && mid[0].size < 22, `on the way: centre ${cy.toFixed(1)}, size ${mid[0].size.toFixed(1)}`);
  const h5 = HANDOFFS.find((x) => x.frame === BRIDGE_B_END - 1)!;
  assert.deepEqual([h5.face, h5.width, ...h5.centre], [T7_CONDENSED.face, 440, 960, 450]);
  assert.equal(K.H5.face, T7_CONDENSED.face);
  assert.deepEqual(K.H5.centre, [960, 450]);
  assert.equal(OUTRO_START, partEnd('bridgeB'));
  assert.equal(DROP2_END, partEnd('drop2'));
});

test('T7’s finishing: the CRT thunks on with the freeze (curvature 0.02), never a white flash; one segment to drop 2’s end (bridge B is its own); the glitches pulse the aberration and let it go', () => {
  for (let f = CRASH; f < BRIDGE_B_END; f++) {
    const look = K.crashLook(f);
    assert.equal(look.crt?.amount, 1);
    assert.equal(look.crt?.curvature, 0.02);
    assert.equal(look.flash ?? 0, 0);
    if (f < DROP2_END) {
      assert.deepEqual(K.crashSegment(f), drop2Segment(f));
      assert.deepEqual(K.crashSegment(f), { from: CRASH, to: DROP2_END });
    }
  }
  assert.deepEqual(K.crashLook(BRIDGE_B_END - 1), K.H5.look);
  for (const s of temporalSamples(CRASH + 14, K.crashTemporal(CRASH + 14), K.crashSegment(CRASH + 14))) assert.ok(s.frame >= CRASH, 'never back across the freeze');
  for (const f of range(BRIDGE_B_START, BRIDGE_B_END)) assert.equal(K.crashTemporal(f).samples, 16);
  // The aberration: × (1 + k) on the slip and each tear, decaying (6 frames), back to the terminal's own by the last frame.
  const base = K.crashLook(BRIDGE_B_START - 12 + 0).aberration;
  for (const f of [HEART_B.lub, STAGES.tear, STAGES.corrupt, FREEZE]) assert.ok(K.crashLook(f).aberration > 2.9 * base, `${f}: a pulse`);
  assert.equal(K.crashLook(BRIDGE_B_START).aberration, base, 'none on the line');
  assert.ok(Math.abs(K.crashLook(BRIDGE_B_END - 1).aberration / base - 1) < 0.2, 'let go by the hand-off');
});

test('H5 is pixel-continuous: on the bridge’s last frame his crisp face is the one the ending draws on outro 1.1 — same glyphs, places, size and ink', () => {
  const mine = K.crispFace(BRIDGE_B_END - 1, L);
  const theirs = logHero(OUTRO_START, L.advance.rounded).glyphs;
  assert.deepEqual(mine.map((g) => g.ch), theirs.map((g) => g.ch));
  mine.forEach((g, i) => {
    assert.ok(Math.abs(g.x - theirs[i].x) < 1e-6 && Math.abs(g.y - theirs[i].y) < 1e-6, `glyph ${i} at (${g.x}, ${g.y}) vs (${theirs[i].x}, ${theirs[i].y})`);
    assert.ok(Math.abs(g.size - theirs[i].size) < 1e-6, `glyph ${i} size`);
    assert.deepEqual(g.color, LOG_HERO_INK);
  });
  assert.equal(mine[0].alpha, 1, 'fully crossed over by the hand-off');
});

test('E10 on the freeze: the guest, his glass and the splash hang crisp over the frozen field (not slipped) through drop2 8.3& − 1, dissolving by drop2 8.3& + 5', () => {
  assert.deepEqual(range(CRASH - 1, CRASH + 20).map((f) => +O.freezeOverlayAlpha(f).toFixed(3)), [0, ...range(0, 12).map(() => 1), 0.833, 0.667, 0.5, 0.333, 0.167, 0, 0, 0]);
  const g = O.guestContent(CRASH, L);
  const splash = g.light.under.filter((s) => (s.color[0] > 1 || s.kind === 'ring') && 540 - s.y > 900);
  assert.ok(splash.length >= 12, 'the crown is drawn');
  for (const s of splash) assert.ok(540 - s.y + (s.h ?? 0) / 2 <= 1062, `on screen: y ${(540 - s.y).toFixed(0)}`);
  const faded = O.fadeContent(g.light, 0.5);
  assert.ok(faded.under.every((s, i) => Math.abs((s.alpha ?? 1) - 0.5 * (g.light.under[i].alpha ?? 1)) < 1e-9));
});

// ——— KEEP-FIRST: the crash clock (sheet §1.2 item 6, §10 builder D) ————————————————————————————————————————————————————————————

const v04 = (f: number): number => {
  const v = v04Of(f);
  if (v === null) throw new Error(`${f} is not a carried frame`);
  return v;
};
const flow = (u: number): number => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)));

test('KEEP-FIRST: the crash shot runs on v04’s clock — the freeze → THE FRAME as built, held through the bullet time; then (v08) bridge B picks THE FRAME up where the tape stop lands, TAPE_LAG later on the crash clock, on the program’s pictures', () => {
  const hold = BULLET.to - BULLET.from;
  // The clock: itself to the bullet time, held on its last frame through it, then the frame less the hold (so the drain is v04's).
  for (let f = CRASH; f < BULLET.from - 0.5; f += 0.25) assert.equal(crashClock(f), f);
  for (const f of [BULLET.from, BULLET.from + 40, DRAIN.from - 1]) assert.equal(crashClock(f), BULLET.from - 1);
  for (let f = DRAIN.from - 0.25; f < DROP2_END; f += 0.25) assert.equal(crashClock(f), f - hold);
  // v04's T7 spans, read off the carried rows: the freeze → the drain 36 frames, → drop 2's end 48.
  const toDrain = v04(DRAIN.from) - v04(CRASH);
  const toEnd = v04(DROP2_END - 1) + 1 - v04(CRASH);
  assert.equal(crashClock(DRAIN.from) - CRASH, toDrain);
  assert.equal(crashClock(DROP2_END - 1) + 1 - CRASH, toEnd);
  // The drift, as built: 1 → 1.02 from the freeze toward the drain; in bridge B (v08) the peak two crash-clock frames after the landing,
  // then back to exactly 1 by the program's freeze.
  const close = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-12, `${what}: ${a} vs ${b}`);
  for (let f = CRASH; f < BULLET.from - 0.5; f += 0.25) close(K.driftZoom(f), 1 + 0.02 * flow((v04(f) - v04(CRASH)) / (toDrain + 2)), `drift ${f}`);
  close(K.driftZoom(BRIDGE_B_START), 1 + 0.02 * flow(toDrain / (toDrain + 2)), 'the landing: as v04’s drain began');
  close(K.driftZoom(FREEZE), 1, 'the freeze');
  // The CRT's refresh band rolls down at v04's rate to the bullet time (and is held through it), then on through bridge B, three times in
  // all, and is off on the bridge's last frame.
  for (const f of [CRASH + 6, RINGS[0], BULLET.from - 1]) close(K.crashLook(f).crt?.band ?? -1, Math.min(1, (v04(f) - v04(CRASH)) / (toEnd - 1)), `band ${f}`);
  assert.equal(K.crashLook(BRIDGE_B_END - 1).crt?.band, 0);
  let wraps = 0;
  for (let f = BRIDGE_B_START + 1; f < BRIDGE_B_END - 1; f++) if ((K.crashLook(f).crt?.band ?? 0) < (K.crashLook(f - 1).crt?.band ?? 0)) wraps++;
  assert.equal(wraps, 2, 'it wraps twice in the bridge (three rolls in all)');
  // Held through the bullet time: the crash shot's view, look, ring drift and glints stand still (the camera is the bullet time's).
  const held = BULLET.from - 1;
  for (let f = BULLET.from; f < DRAIN.from; f += 3) {
    assert.equal(K.driftZoom(f), K.driftZoom(held), `${f}: the drift is held`);
    assert.deepEqual(K.crashLook(f), K.crashLook(held), `${f}: the look is held`);
    assert.equal(K.ringDrift(f), K.ringDrift(held), `${f}: the rings are held`);
    assert.deepEqual(glyphsAt(f), glyphsAt(held), `${f}: THE FRAME, held`);
    assert.deepEqual(K.glints(f, FIELD), K.glints(held, FIELD), `${f}: the glints are held`);
  }
  // In bridge B the crash clock is the program's picture less the hold and the tape stop's TAPE_LAG: the rings of light and the drift
  // where that clock puts them, sub-frames included.
  for (const f of [BRIDGE_B_START - 0.25, BRIDGE_B_START, BRIDGE_B_START + 0.25, BRIDGE_B_START + 5, STAGES.tear + 2, FREEZE, BRIDGE_B_END - 1]) {
    const c = crashClock(programFrame(f)) - TAPE_LAG;
    assert.equal(c, programFrame(f) - hold - TAPE_LAG);
    for (const d of [K.RING.from, 300, 600]) {
      const want = RINGS.reduce((g, t) => (c >= t ? g + K.RING.gain * Math.exp(-(((d - K.RING.from - K.RING.speed * (c - t)) / K.RING.width) ** 2)) : g), 1);
      close(K.ringGain(f, d), want, `${f}: the rings of light (${d} px)`);
    }
    assert.equal(K.ringDrift(f), (K.RING_SHARE * Math.max(0, c - K.DRIFT_FROM)) / 24, `${f}: the drift resumes where it stopped`);
  }
  // Its first instant is the bullet time's last (its camera's time handing back to this shot) on the crash's clock, within the stutter's
  // half frame: THE FRAME carries across drop 2's end.
  assert.ok(Math.abs(BB.crashClockB(BRIDGE_B_START - 0.5) - crashClock(BB.bulletTimeAt(BRIDGE_B_START - 0.51))) <= 0.5);
  assert.equal(BB.crashClockB(BRIDGE_B_START), crashClock(DRAIN.from));
});
