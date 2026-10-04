// Round 2, D2-REEL-STATIC (src/shots/drop2Overload.ts; sheet §5.9): drop2 bar 7 is every world racing past him. Each card entered on its move
// and then sat still (3.5 /255 a frame against 9–12 in drop2 bars 2–6), so the climax went quiet. Now each world races past in its own
// direction for its whole card, he ticks on every 8th without moving, and a coarse software picture of the reel (shapes, glyph stems,
// the three blends, the card camera; 640 × 360 averaged to 320 × 180 luma, as the review measures with mad.mjs) changes by a median of at
// least 6 /255 a frame. Pure: a fake layout stands in for what only the browser can measure.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RGB } from '../src/engine/color.ts';
import type { FlatContent } from '../src/engine/flatLayer.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { hash } from '../src/engine/random.ts';
import type { Blend, Shape } from '../src/engine/shapeField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { CUTS2, REEL, REEL_BLADES, REGISTER, WIPES, stutterFrame } from '../src/score/drop2.ts';
import * as O from '../src/shots/drop2Overload.ts';

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** A fake layout shaped like the browser's: faces by their ink, a dotted LED hero and marquee, an ASCII hero. */
const adv = (ch: string) => (ch === ' ' ? 0.3 : '()'.includes(ch) ? 0.45 : 0.7);
const width = (s: string) => [...s].reduce((w, ch) => w + adv(ch), 0);
const L: O.OverloadLayout = {
  advance: { rounded: adv, jp: adv, mono: () => 0.6, display: adv, bold: () => 0.6 },
  ink: new Map(O.INK_STRINGS.map(([font, text]) => [O.inkKey(font, text), { left: 0.06, right: width(text) - 0.06, up: 0.45, down: 0.4 }])),
  ascii: range(0, 62 * 18).filter((k) => hash(k, 9) < 0.4).map((k) => ({ dx: -300 + 9.6 * (k % 62), dy: -170 + 19.2 * Math.floor(k / 62), ch: '=', lum: hash(k, 3), part: Math.floor((k % 62) / 13) })),
  led: range(0, 51 * 17).filter((k) => hash(k, 5) < 0.35).map((k) => [(k % 51) - 25, Math.floor(k / 51) - 8] as const),
  marquee: { width: 120, lit: range(0, 120 * 8).filter((k) => hash(k, 6) < 0.35).map((k) => [k % 120, Math.floor(k / 120)] as const) },
};
/** The holds under the cut flashes (E9): the old shot's last clean frame, repeated on purpose. */
const HOLDS = new Set(CUTS2.slice(1).flatMap((c) => [c - 2, c - 1]));

// ——— A coarse software picture of the reel ——————————————————————————————————————————————————————————————————————————————————

const W = 640;
const H = 360;
const S = W / 1920;
const ATLAS_ORDER = ['rounded', 'jp', 'mono', 'display', 'bold'];
type Xf = { zoom: number; cos: number; sin: number };
const SCREEN: Xf = { zoom: 1, cos: 1, sin: 0 };
const newBuf = (): Float32Array => new Float32Array(W * H * 3);
function put(buf: Float32Array, i: number, c: RGB, a: number, blend: Blend): void {
  const k = i * 3;
  for (let ch = 0; ch < 3; ch++) {
    const d = buf[k + ch];
    buf[k + ch] = blend === 'add' ? d + c[ch] * a : blend === 'multiply' ? d * (1 - a + a * c[ch]) : d * (1 - a) + c[ch] * a;
  }
}
/** Signed inside distance (layout px) of local point (u, v) in a shape of half sizes (a, b). */
function inside(kind: Shape['kind'], u: number, v: number, a: number, b: number, r: number): number {
  if (kind === 'ellipse' || kind === 'ring') {
    const d = (1 - Math.sqrt((u / a) ** 2 + (v / b) ** 2)) * Math.min(a, b);
    if (kind === 'ellipse') return d;
    const ai = Math.max(0.5, a - r);
    const bi = Math.max(0.5, b - r);
    return Math.min(d, (Math.sqrt((u / ai) ** 2 + (v / bi) ** 2) - 1) * Math.min(ai, bi));
  }
  const rr = kind === 'rect' ? Math.min(r, a, b) : 0;
  const qx = Math.abs(u) - (a - rr);
  const qy = Math.abs(v) - (b - rr);
  return -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr);
}
function drawShape(buf: Float32Array, s: Shape, blend: Blend, t: Xf): void {
  let w = s.w * t.zoom;
  let h = s.h * t.zoom;
  let alpha = (s.alpha ?? 1) * (s.screen ? (s.tint ?? 1) : 1);
  const px3 = 1 / S; // one picture pixel in layout px: thinner shapes keep their area
  if (s.kind !== 'ring') {
    if (w < px3) [alpha, w] = [(alpha * w) / px3, px3];
    if (h < px3) [alpha, h] = [(alpha * h) / px3, px3];
  }
  if (alpha <= 0.001) return;
  const cx = (960 + t.zoom * (s.x * t.cos - s.y * t.sin)) * S;
  const cy = (540 - t.zoom * (s.x * t.sin + s.y * t.cos)) * S;
  const rot = (s.rot ?? 0) - Math.atan2(t.sin, t.cos);
  const [c, sn] = [Math.cos(rot), Math.sin(rot)];
  const [a, b] = [w / 2, h / 2];
  const ex = (Math.abs(a * c) + Math.abs(b * sn)) * S;
  const ey = (Math.abs(a * sn) + Math.abs(b * c)) * S;
  const soft = (s.soft ?? 0) * t.zoom;
  const ol = (s.outline ?? 0) * t.zoom;
  for (let py = Math.max(0, Math.floor(cy - ey)); py <= Math.min(H - 1, Math.ceil(cy + ey)); py++) {
    for (let px = Math.max(0, Math.floor(cx - ex)); px <= Math.min(W - 1, Math.ceil(cx + ex)); px++) {
      const dx = (px + 0.5 - cx) / S;
      const dy = -(py + 0.5 - cy) / S;
      const d = inside(s.kind, dx * c + dy * sn, -dx * sn + dy * c, a, b, (s.r ?? 0) * t.zoom);
      if (d < -1.5) continue;
      let cov = Math.min(1, (d + 1.5) / 3);
      if (soft > 0) cov *= Math.min(1, Math.max(0, d / soft));
      if (cov > 0) put(buf, py * W + px, ol > 0 && d < ol && s.outlineColor ? s.outlineColor : s.color, alpha * cov, blend);
    }
  }
}
/** A glyph as its ink: three stems and a bar (tubes thinner), its outline fattening it in the outline's colour. */
function drawGlyph(buf: Float32Array, g: Glyph, blend: Blend, t: Xf): void {
  const em = g.size;
  const sx = g.stretch ?? 1;
  const stem = (g.tube ? 0.07 : 0.12) * em;
  const parts: [number, number, number][] = [[-0.2 * em * sx, stem, 0.7 * em], [0, stem, 0.7 * em], [0.2 * em * sx, stem, 0.7 * em], [0, 0.5 * em * sx, 0.1 * em]];
  const ol = (g.outline ?? 0) * em;
  const draw = (color: RGB, grow: number) => {
    for (const [x, w, h] of parts) drawShape(buf, { kind: 'rect', x: g.x + x, y: g.y, w: w + 2 * grow, h: h + 2 * grow, color, alpha: g.alpha ?? 1, rot: g.rot ?? 0 }, blend, t);
  };
  if (ol > 0 && g.outlineColor) draw(g.outlineColor, ol);
  draw(g.color, 0);
}
function drawContent(buf: Float32Array, c: FlatContent, blend: Blend, t: Xf): void {
  for (const s of c.under) drawShape(buf, s, blend, t);
  for (const k of ATLAS_ORDER) for (const g of c.glyphs[k] ?? []) drawGlyph(buf, g, blend, t);
  for (const s of c.over) drawShape(buf, s, blend, t);
}
function drawCard(buf: Float32Array, world: O.World, c: number, cam: number, t: Xf): void {
  const frame = O.cardFrame(world, c, L, false, cam);
  for (let i = 0; i < buf.length; i += 3) buf.set(frame.ground, i);
  for (const d of frame.draws) drawContent(buf, d.content, d.blend, d.cam === 'card' ? t : SCREEN);
}
/** The reel at sub-frame instant `s`, as the scene composes it: content at the honest stutter's time, the camera at true time. */
function picture(s: number): Float32Array {
  const c = O.contentTime(s);
  const { zoom, roll } = O.reelCamera(s);
  const t: Xf = { zoom, cos: Math.cos(-roll), sin: Math.sin(-roll) };
  const plan = O.planAt(c);
  const buf = newBuf();
  if (plan.kind === 'card') drawCard(buf, plan.world, c, s, t);
  else if (plan.kind === 'edge') {
    drawCard(buf, plan.under, c, s, t);
    const over = newBuf();
    drawCard(over, plan.over, c, s, t);
    const e = Math.max(0, Math.min(W, Math.round(plan.edge * S)));
    for (let py = 0; py < H; py++) buf.set(over.subarray(py * W * 3, (py * W + e) * 3), py * W * 3);
  } else throw new Error('the blades are not in the picture');
  for (const d of plan.fx) drawContent(buf, d.content, d.blend, d.cam === 'card' ? t : SCREEN);
  return buf;
}
const srgb = (v: number): number => {
  const x = Math.min(1, Math.max(0, v));
  return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
};
/** Output frame `f` as 320 × 180 luma: three sub-frames over the half shutter averaged in linear light, then 2 × 2 boxes. */
function frameLuma(f: number): Float32Array {
  const acc = newBuf();
  for (const o of [-1 / 6, 0, 1 / 6]) {
    const b = picture(f + o);
    for (let i = 0; i < acc.length; i++) acc[i] += b[i] / 3;
  }
  const out = new Float32Array(320 * 180);
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 320; x++) {
      let l = 0;
      for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const k = ((2 * y + j) * W + 2 * x + i) * 3;
        l += 0.2126 * srgb(acc[k]) + 0.7152 * srgb(acc[k + 1]) + 0.0722 * srgb(acc[k + 2]);
      }
      out[y * 320 + x] = l / 4;
    }
  }
  return out;
}
/** Mean absolute luma change (0–255) of each output frame a … b − 1 against the frame before (mad.mjs's measure). */
function change(a: number, b: number): Map<number, number> {
  const out = new Map<number, number>();
  let prev = frameLuma(a - 1);
  for (let f = a; f < b; f++) {
    const cur = frameLuma(f);
    let s = 0;
    for (let i = 0; i < cur.length; i++) s += Math.abs(cur[i] - prev[i]);
    out.set(f, s / cur.length);
    prev = cur;
  }
  return out;
}
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// ——— The tests —————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('D2-REEL-STATIC: drop2 bar 7 races — the reel’s picture changes by a median of at least 6 /255 a frame over drop2 7.1–7.4& − 1 (the E9 holds excepted), and every card keeps moving', () => {
  const m = change(REEL.from, REEL_BLADES[0]);
  const moving = [...m].filter(([f]) => !HOLDS.has(f));
  const med = median(moving.map(([, v]) => v));
  assert.ok(med >= 6, `median ${med.toFixed(2)} /255 (round 1: ≈ 2.9 in this picture, 3.5 in the render)`);
  for (const [f, v] of moving) assert.ok(v >= 0.3, `${f}: ${v.toFixed(2)} /255 — a card stood still`);
  for (const f of HOLDS) assert.ok(stutterFrame(f) === stutterFrame(f - 1) || stutterFrame(f) === f - 1, `${f} holds`);
});

test('D2-REEL-STATIC: each world races past him in its own direction for its whole card — neon →, LED ←, Swiss ←, Riso’s plates apart, the interlude ↓, space outward, the terminal ↑', () => {
  // NEON: tube lines stream in from the left after drop2 7.1 (none on drop2 7.1: the whip-pan lands on the card alone) and run right every frame.
  for (const s of O.NEON_STREAM) {
    assert.ok(O.streamHead(s, REEL.from + 0.25) <= 0, 'off screen on drop2 7.1');
    for (const f of range(REEL.from + 1, WIPES[0])) assert.ok(O.streamHead(s, f) - O.streamHead(s, f - 1) >= 50, `${f}: → at ${s.speed} px a frame`);
  }
  assert.ok(O.NEON_STREAM.filter((s) => O.streamHead(s, WIPES[0] - 1) > 0 && O.streamHead(s, WIPES[0] - 1) - s.len < 1920).length >= 6, 'most are on screen by the end of the card');
  // LED: the marquee crawls left two dots every frame, one crisp step per output frame (all its sub-frames agree).
  for (const f of range(WIPES[0], CUTS2[1] - 2)) {
    assert.equal(O.marqueeCrawl(f) - O.marqueeCrawl(f - 1), O.MARQUEE_DOTS, `${f}: ← two dots`);
    assert.equal(new Set(temporalSamples(f, O.overloadTemporal(f)).map((s) => O.marqueeCrawl(s.frame))).size, 1, `${f}: crisp`);
  }
  // SWISS: the poster slides left at full speed every frame of its card (the grid, the disc, `33/36`, the bar once it has landed).
  const disc = (c: number) => O.cardFrame('swiss', c, L).draws[0].content.under.find((s) => s.kind === 'ellipse')!.x;
  for (const f of range(CUTS2[1] + 1, WIPES[1])) assert.ok(Math.abs(disc(f - 1) - disc(f) - O.SWISS_SLIDE.speed) < 1e-9, `${f}: ← ${O.SWISS_SLIDE.speed} px`);
  assert.ok(O.SWISS_SLIDE.speed >= 26);
  // RISO: the plates run in at a constant 320 px a frame (no dead frames before they meet), snap into register on drop2 7.3 − 6, then the pink
  // plate drifts out of register again, faster every frame, until the cut.
  for (const f of range(WIPES[1], REGISTER)) assert.ok(Math.abs(O.pinkEdge(f) - O.pinkEdge(f - 1) - 320) < 1e-9, `${f}: the pink plate runs in`);
  assert.equal(O.pinkDrift(REGISTER), 0, 'in register on the snap');
  for (const f of range(REGISTER + 1, CUTS2[2] - 2)) assert.ok(O.pinkDrift(f) - O.pinkDrift(f - 1) > O.pinkDrift(f - 1) - O.pinkDrift(Math.max(REGISTER, f - 2)) - 1e-9 && O.pinkDrift(f) > O.pinkDrift(f - 1), `${f}: drifting apart, gathering speed`);
  // INTERLUDE: the blocks sink and the confetti rains down every frame (a piece wraps to the top only after it has left the bottom).
  const pieces = (c: number) => O.cardFrame('interlude', c, L).draws[0].content.under.filter((s) => s.color[0] > 0.05 || s.color[1] > 0.05);
  for (const f of range(CUTS2[2] + 1, WIPES[2] + 6)) {
    const [a, b] = [pieces(f - 1), pieces(f)];
    assert.equal(a.length, b.length);
    const down = b.filter((s, i) => s.y < a[i].y - 20).length;
    const wrapped = b.filter((s, i) => s.y > a[i].y + 600).length;
    assert.ok(down + wrapped === b.length && wrapped <= 4, `${f}: ↓ (${down} down, ${wrapped} wrapped of ${b.length})`);
    assert.ok(down >= b.length - 4 && b.length >= 30, `${f}: blocks and ≥ 28 pieces of confetti`);
  }
  // SPACE: every star flies outward from behind him each frame (a star reborn at the centre has faded out first).
  for (const f of range(WIPES[2] + 1, CUTS2[3] - 2)) {
    const out = range(0, O.WARP.stars).filter((i) => O.warpRadius(i, f) > O.warpRadius(i, f - 1)).length;
    assert.ok(out >= 0.94 * O.WARP.stars, `${f}: ${out} of ${O.WARP.stars} stars fly outward`);
  }
  // TERMINAL: the log scrolls up half a line (15 px) every frame.
  assert.equal(O.LOG_SCROLL, 0.5);
});

test('D2-REEL-STATIC: he ticks 1.04 → 1 on every 8th of drop2 bar 7 until the blades — inside that frame’s shutter, never on the frame before — and never moves', () => {
  assert.deepEqual(O.TICKS, range(REEL.from, REEL_BLADES[0], 12));
  const s = (c: number) => O.heroScale(c).s;
  for (const e of O.TICKS) {
    assert.ok(Math.abs(s(e + 0.25) - 1.04) < 1e-9, `${e}: 1.04 by the end of its shutter`);
    if (e > REEL.from) assert.ok(s(e - 0.25 - 1e-6) < 1.0005, `${e}: the frame before shows no tick`);
    for (let c = e + 0.25; c < e + 11.5; c += 0.5) assert.ok(s(c + 0.5) < s(c), `${c}: settling`);
  }
  assert.ok(Math.abs(s(REEL_BLADES[0] - 0.3) - 1) < 1e-3 && s(REEL_BLADES[0] + 2) === 1, 'no tick under the blades: the crash-zoom takes over smoothly');
  // No translation: his face stays centred on (960, 540) through every tick, in every world.
  for (const w of ['neon', 'swiss', 'space'] as const) {
    for (const c of [CUTS2[1] + 4.25, CUTS2[1] + 5, CUTS2[1] + 10]) {
      const gs = O.heroDraws(w, c, L).flatMap((d) => Object.values(d.content.glyphs).flat());
      const xs = gs.map((g) => g.x);
      assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2) < 1e-6, `${w} ${c}: centred`);
    }
  }
});
