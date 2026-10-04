// Round-2 review fixes on the hero (src/shots/breakHero.ts, the flat camera in src/shots/breakShared.ts): the fan's copies show only
// outside his silhouette (R2-03: the copies are clipped by a plate — the hull of his face core — while they fan, wave and ripple), and the break-bar-3 loop-the-loop
// hangs whole in the frame, apart from the yellow block (R2-04: the camera tilts up after the bracket; the loop is a little smaller and
// lower; the flying bracket wears a 6 px cream keyline).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BREAK_PALETTE, breakCam, rotate, toScreen } from '../src/shots/breakShared.ts';
import { FRAGMENTS, INK_EM, apply, faceCore, heroAt, keylineAt, plateAt, restPlacement } from '../src/shots/breakHero.ts';
import { fanAt } from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
type Box = { x0: number; y0: number; x1: number; y1: number };

/** A whole-hero glyph's ink box (layout px), grown by `grow` px. */
const inkBox = (g: { ch: string; x: number; y: number; size: number; stretch: number; sy: number }, grow = 0): Box => {
  const [l, r, t, b] = INK_EM[g.ch];
  return { x0: g.x + l * g.size * g.stretch - grow, x1: g.x + r * g.size * g.stretch + grow, y0: g.y + t * g.size * g.sy - grow, y1: g.y + b * g.size * g.sy + grow };
};

test('R2-03: the ink table is the font’s (M PLUS Rounded 1c ExtraBold, text-middle 0.3775 em over the baseline)', () => {
  // "(" from the font: x 0.061–0.377 of its 0.412 advance, y −0.185–0.770 about the baseline.
  const [l, r, t, b] = INK_EM['('];
  near(l, 0.061 - 0.206, 1e-3, '( left');
  near(r, 0.377 - 0.206, 1e-3, '( right');
  near(t, -(0.77 - 0.3775), 1e-3, '( top');
  near(b, 0.185 + 0.3775, 1e-3, '( bottom');
  for (const ch of ['(', ')', '－', '•', 'ω', '☆', '⌒', '*', '≧', '≦']) assert.ok(INK_EM[ch], `${ch} measured`);
});

test('R2-03: his plate (the hull his copies are clipped by) stands exactly while he wears the keyline (his copies fan, wave and ripple behind him)', () => {
  for (const f of [at(5, 1.75) - 2, at(5, 2) - 1, at(5, 4.75) + 2, at(6) - 1]) assert.equal(plateAt(f), null, `no plate on ${f}`);
  for (const f of [at(5, 2) + 1, at(5, 2.5), at(5, 3.25), at(5, 3.625), at(5, 4), at(5, 4.5) + 2]) {
    const p = plateAt(f);
    assert.ok(p, `a plate on ${f}`);
    assert.ok(keylineAt(f) > 0, `keyline on ${f}`);
    assert.equal(heroAt(f).plate?.x0, p.x0, `heroAt carries the plate on ${f}`);
    // The plate is the hole-filled hull of his face core: a rounded rect from "(" to ")" over every glyph's ink.
    const core = faceCore(f);
    assert.ok(p.r > 0 && p.r < 0.5 * (p.y1 - p.y0), 'rounded corners');
    const open = core.find((g) => g.ch === '(')!;
    const close = core[core.length - 1];
    near(p.x0, open.x, 1e-9, `from "(" on ${f}`);
    near(p.x1, close.x, 1e-9, `to ")" on ${f}`);
    for (const g of core) {
      const b = inkBox(g);
      assert.ok(b.y0 - p.y0 >= 30 && p.y1 - b.y1 >= 30, `${g.ch}'s ink is ≥ 30 px inside the plate's top and bottom on ${f}`);
    }
  }
});

test('R2-03: no copy shows between his brackets during the fan and the stagger-wave — every copy glyph there falls inside the plate (clipped)', () => {
  for (let f = at(5, 2.125); f < at(5, 4); f += 0.5) {
    const p = plateAt(f)!;
    const core = faceCore(f);
    for (const c of fanAt(f)) {
      for (const g of core) {
        // The copy's glyph box with its 4 px outline, turned with the copy about the fan's pivot.
        const b = inkBox(g, c.stroke + 1);
        const pts = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => {
          const [rx, ry] = rotate(c.scale * (x - c.pivot[0]), c.scale * (y - c.pivot[1]), c.angle);
          return [c.pivot[0] + rx, c.pivot[1] + ry];
        });
        const xs = pts.map((q) => q[0]);
        const ys = pts.map((q) => q[1]);
        // Wholly left or right of his bracket placements: outside his silhouette (the fringe). Otherwise the plate must hide it.
        if (Math.max(...xs) <= p.x0 || Math.min(...xs) >= p.x1) continue;
        // A copy bracket that straddles one of his brackets shows only its outer bulge, outside him, past his dilated bracket.
        if ((g.ch === '(' || g.ch === ')') && (Math.min(...xs) < p.x0 || Math.max(...xs) > p.x1)) continue;
        assert.ok(Math.min(...ys) >= p.y0 && Math.max(...ys) <= p.y1, `a ${c.color} copy's ${g.ch} leaves the plate between his brackets on ${f}: y ${Math.min(...ys).toFixed(0)}–${Math.max(...ys).toFixed(0)} vs ${p.y0.toFixed(0)}–${p.y1.toFixed(0)}`);
      }
    }
  }
});

// ——— R2-04 ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

/**
 * The "(" ink at rest (em 360, stretch 1.3, at its rest placement, y 540) as its stroke's centre line — a quadratic arc from tip to
 * tip through the bulge, inside the font's ink box — and the pad round it: half the stroke (0.055 em) + its 8 px outline + 6 px keyline.
 */
const OPEN_PAD = 0.055 * 360 + 14;
const openArc = (): [number, number][] => {
  const [l, r, t, b] = INK_EM['('];
  const w = 0.055;
  const top: [number, number] = [r - w, t + w];
  const bot: [number, number] = [r - w, b - w];
  const bulge: [number, number] = [l + w, (t + b) / 2];
  const c: [number, number] = [2 * bulge[0] - (top[0] + bot[0]) / 2, 2 * bulge[1] - (top[1] + bot[1]) / 2];
  const x = restPlacement().open;
  return Array.from({ length: 17 }, (_, i) => {
    const s = i / 16;
    const ex = (1 - s) ** 2 * top[0] + 2 * (1 - s) * s * c[0] + s * s * bot[0];
    const ey = (1 - s) ** 2 * top[1] + 2 * (1 - s) * s * c[1] + s * s * bot[1];
    return [x + ex * 360 * 1.3, 540 + ey * 360];
  });
};
/** How far the flying "(" ink (with outline and keyline) stays inside the frame's top and left edges on `f` (screen px). */
const openClearance = (f: number): { top: number; left: number } => {
  const d = heroAt(f).frags.find((q) => q.k === 52)!;
  const cam = breakCam(f);
  const pts = openArc().map(([x, y]) => toScreen(cam, ...apply(d.m, [x, y])));
  const pad = OPEN_PAD * cam.zoom;
  return { top: Math.min(...pts.map((p) => p[1])) - pad, left: Math.min(...pts.map((p) => p[0])) - pad };
};

test('R2-04: the flat camera tilts up after the bracket — C.y 560 → 470 over 2112–2136 (F, from a standstill on the kick), held through the loop, back with the dive by 2160', () => {
  for (const f of [at(2, 4.5), at(3) - 1, at(3)]) near(breakCam(f).cy, 560, 1e-9, `cy on ${f}`);
  for (const f of [at(3, 2), at(3, 2.25) - 2, at(3, 2.5)]) near(breakCam(f).cy, 470, 1e-9, `cy on ${f}`);
  near(breakCam(at(3, 1.5)).cy, 515, 1e-9, 'halfway (F) on 2124');
  near(breakCam(at(3) + 0.25).cy, 560, 0.05, 'from a standstill');
  near(breakCam(at(3, 2.75)).cy, 515, 1e-9, 'halfway back on 2154');
  for (const f of [at(3, 3), at(3, 3.5), at(4) - 1]) near(breakCam(f).cy, 560, 1e-9, `cy on ${f}`);
  // The face drops ≈ 90 px on screen, no more: his ω stays well inside the frame.
  const [, wy] = toScreen(breakCam(at(3, 2.25) - 2), 957, 597);
  const [, wy0] = toScreen(breakCam(at(3)), 957, 597);
  assert.ok(wy - wy0 > 80 && wy - wy0 < 110, `the face drops ${(wy - wy0).toFixed(0)} px`);
  // Smooth: never more than 12 px a quarter frame at a frame corner (the energy test checks the whole flat part).
  for (let f = at(3); f < at(4); f += 0.25) {
    const a = toScreen(breakCam(f), 0, 0);
    const b = toScreen(breakCam(f + 0.25), 0, 0);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 12 || (f >= at(3, 4) - 0.5 && f < at(3, 4.5) + 0.5), `jump at ${f}`);
  }
});

test('R2-04: the flying bracket hangs whole in the frame — apex at screen y ≥ 170, its ink (with outline and keyline) never cut by the top edge, and clear of the left edge from 2119', () => {
  const [ax, ay] = toScreen(breakCam(at(3, 2)), ...apply(heroAt(at(3, 2)).frags.find((q) => q.k === 52)!.m, [397, 562]));
  assert.ok(ay >= 170, `apex at screen y ${ay.toFixed(0)}`);
  assert.ok(ax > 150, `apex clear of the left edge: x ${ax.toFixed(0)}`);
  // Where it lies on break 2.1 (the fall's landing) it already crosses the left edge: the climb rises straight up from there, never further out.
  const lying = openClearance(at(3) - 1).left;
  for (let f = at(3); f <= at(3, 3); f += 0.5) {
    const { top, left } = openClearance(f);
    assert.ok(top >= 8, `cut by the top edge on ${f}: ${top.toFixed(0)}`);
    assert.ok(left >= lying - 4, `further off the left edge than where it lay on ${f}: ${left.toFixed(0)} vs ${lying.toFixed(0)}`);
    if (f >= at(3, 1.25) + 1) assert.ok(left >= 0, `cut by the left edge on ${f}: ${left.toFixed(0)}`);
  }
});

test('R2-04: the loop stays clear of the ">" — its path never comes within 15 px of his left eye’s ink', () => {
  // The ">" sits in its slot (the eye's ink box at rest, 20 px lower); the loop's path is the bracket's pivot, drawn as a 10 px trail.
  const x = restPlacement().eyeL;
  const [l, , t] = INK_EM['>'];
  const corner = [x + l * 360 * 1.17, 560 + t * 360];
  for (let f = at(3, 2); f < at(3, 2.75); f += 0.25) {
    const d = heroAt(f).frags.find((q) => q.k === 52)!;
    const [px, py] = apply(d.m, [397, 562]);
    const dist = px < corner[0] || py < corner[1] ? Math.hypot(Math.max(0, corner[0] - px), Math.max(0, corner[1] - py)) : 0;
    assert.ok(dist >= 15, `the loop's path reaches the ">" on ${f}: ${dist.toFixed(1)} px`);
  }
});

test('R2-04: the flying "(" wears a 6 px cream keyline from its launch (2112) to its slam (2160), as he does in bar 25', () => {
  const cream = BREAK_PALETTE.cream;
  const keylines = (f: number) => heroAt(f).tex.glyphs.filter((g) => g.group === 'open' && g.fill === cream);
  for (const f of [at(3) - 1, at(3, 3), at(3, 3.5) - 2]) assert.equal(keylines(f).length, 0, `no keyline on ${f}`);
  for (const f of [at(3), at(3, 1.5), at(3, 2), at(3, 2.5), at(3, 3) - 1]) {
    const k = keylines(f);
    assert.equal(k.length, 1, `a keyline on ${f}`);
    assert.deepEqual(k[0].outline, cream);
    assert.equal(k[0].outlinePx, 8 + 6, 'outside his 8 px ink outline');
    const glyphs = heroAt(f).tex.glyphs.filter((g) => g.group === 'open');
    assert.ok(glyphs.indexOf(k[0]) < glyphs.findIndex((g) => g.fill !== cream), 'drawn under the bracket');
  }
  // Every sub-frame of an output frame agrees (a discrete change, taken at the output frame).
  assert.equal(keylines(at(3) - 0.25).length, 1);
  assert.equal(keylines(at(3, 3) - 0.25).length, 0);
  // The fragments that carry it are the "(" group's.
  assert.ok(FRAGMENTS.filter((q) => q.group === 'open').length === 3);
});
