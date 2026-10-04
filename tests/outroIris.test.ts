// E3 IRIS (src/shots/outroIris.ts, outroSpots.ts, outroW5.ts): the pry on the tonic, the wink on the promised frame, ↑ ↑, Enter and
// 1 → 2 → 4 → 8 with the spots onto the worlds he infected; W5 (build sheet §3.3, §4 3.1 / 4.1, §5.1, §7 E3, §7.1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CURSOR, PROMPT } from '../src/content/boot.ts';
import * as C from '../src/content/outro.ts';
import { clamp } from '../src/engine/math.ts';
import { SWAP_LEAD, temporalSamples } from '../src/engine/temporal.ts';
import * as O from '../src/score/outro.ts';
import { insideIris, irisRadiusAt, polarAngle } from '../src/shots/outroAperture.ts';
import * as I from '../src/shots/outroIris.ts';
import { DOT_AT_OPEN, IRIS, SPOT_AT, W5_BOX } from '../src/shots/outroShared.ts';
import * as S from '../src/shots/outroSpots.ts';
import * as W from '../src/shots/outroW5.ts';
import { INKS } from '../src/shots/outroKit.ts';

const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const ROUND: Record<string, number> = { '(': 0.36, ')': 0.36, '•': 0.42, 'ω': 0.82, '<': 0.6, ヽ: 1, ﾉ: 0.5, '✧': 1 };
const rounded = (ch: string) => ROUND[ch] ?? 0.6;
const mono = () => 0.6;
const subs = (F: number): number[] => temporalSamples(F, I.irisTemporal(F), { from: O.OUTRO_START, to: O.LOOP }).map((s) => s.frame);

test('the pry: the iris starts as the dot (r = DOT_AT_OPEN.w / 2) and springs open on the tonic — ¾ by + 3, past round to 420–440, settled on 400 ± 8 by + 14', () => {
  assert.equal(I.irisRadius(O.OPEN - 1), DOT_AT_OPEN.w / 2);
  const p = (f: number) => (I.irisRadius(f) - DOT_AT_OPEN.w / 2) / (IRIS.open - DOT_AT_OPEN.w / 2);
  assert.ok(p(O.OPEN + 3) >= 0.75, `${p(O.OPEN + 3)}`);
  const top = Math.max(...range(O.OPEN, O.OPEN + 12, 0.25).map(I.irisRadius));
  assert.ok(top >= 420 && top <= 440, `overshoot ${top}`);
  for (const f of range(O.OPEN + 14, O.RUN - 1)) assert.ok(Math.abs(I.irisRadius(f) - IRIS.open) <= 8 + 1e-9, `${f}: ${I.irisRadius(f)}`);
});

test('the living hold: the iris never holds still (breath a beat, strain a 16th); Enter shoves it to ≈ 440 and it settles on 420; the last doubling strains it to 440', () => {
  for (const f of range(O.OPEN + 1, O.BURST)) assert.notEqual(I.irisRadius(f), I.irisRadius(f - 1), `${f}`);
  const shove = Math.max(...range(O.RUN, O.RUN + 8, 0.25).map(I.irisRadius));
  assert.ok(shove >= 432 && shove <= 450, `shove ${shove}`);
  assert.ok(Math.abs(I.irisRadius(O.COUNTER[3] - 1) - IRIS.run) <= 9, `${I.irisRadius(O.COUNTER[3] - 1)}`);
  assert.ok(Math.abs(I.irisRadius(O.BURST - 1) - IRIS.strained) <= 9, `${I.irisRadius(O.BURST - 1)}`);
});

test('the wink: (•ω•) → (•ω<) whole on every sub-frame of WINK (the morph done by WINK − SWAP_LEAD), the ✧ popping beside him', () => {
  assert.deepEqual(I.rightEye(O.WINK - SWAP_LEAD), { ch: '<', morph: 0 });
  assert.equal(I.rightEye(O.WINK - 6).ch, '•');
  for (const f of subs(O.WINK)) {
    const h = I.irisHero(f, rounded);
    assert.equal(h.glyphs[3].ch, '<', `${f}`);
    assert.equal(h.glyphs[3].morph, 0);
  }
  assert.equal(I.starAt(O.WINK - 1), null);
  assert.ok(I.starAt(O.WINK)!.size > 0);
});

// The ✧'s ink reach from its centre, in ems of its size: the glyph (Noto Sans Symbols 2, measured: a 0.768 em square, centred) plus its
// 0.075 em outline.
const STAR_REACH = 0.384 + 0.075;
// The rounded atlas's real advances (M PLUS Rounded 1c ExtraBold, measured with the ink in ROUNDED_INK), for the clearances.
const ADV: Record<string, number> = { '(': 0.412, ')': 0.412, '•': 0.526, 'ω': 0.822, '<': 0.689, ヽ: 1, ﾉ: 0.5 };
const real = (ch: string) => ADV[ch] ?? 0.6;
type P = readonly [number, number];
/** An arm's ink hull on screen (layout px), from irisHero's glyph and the push. */
const armOnScreen = (f: number, ch: 'ヽ' | 'ﾉ'): P[] => {
  const g = I.irisHero(f, real).glyphs.find((q) => q.ch === ch)!;
  const z = I.irisZoom(f);
  return I.armHull(ch, { x: g.x, y: g.y, size: g.size, stretch: g.stretch ?? 1, rot: g.rot ?? 0 }).map(([x, y]) => [960 + x * z, 540 - y * z] as const);
};
const aabb = (pts: readonly P[]): [number, number, number, number] => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
/** The gap between two boxes [x0, y0, x1, y1] (negative: they overlap). */
const boxGap = (a: readonly number[], b: readonly number[]) => Math.max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3]);
/** A face glyph's ink box on screen. */
const faceOnScreen = (f: number): [number, number, number, number][] => {
  const z = I.irisZoom(f);
  const s = (x: number, y: number): P => [960 + (x - 960) * z, 540 + (y - 540) * z];
  return I.irisFace(f, real).slots.map(({ box }) => [...s(box[0], box[1]), ...s(box[2], box[3])] as [number, number, number, number]);
};
const segDist = (p: P, a: P, b: P) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const polyDist = (p: P, poly: readonly P[]) => Math.min(...poly.map((a, i) => segDist(p, a, poly[(i + 1) % poly.length])));
const pointBoxDist = (p: P, b: readonly number[]) => Math.hypot(Math.max(0, b[0] - p[0], p[0] - b[2]), Math.max(0, b[1] - p[1], p[1] - b[3]));
/** The ✧ on screen: its centre and its ink reach. */
const starOnScreen = (f: number): { c: P; r: number } => {
  const s = I.starAt(f)!;
  const z = I.irisZoom(f);
  return { c: [960 + (s.x - 960) * z, 540 + (s.y - 540) * z], r: STAR_REACH * s.size * z };
};

test('the ✧ stays inside the rim (its ink, outline included, ≥ 20 px inside) through the pop, every twinkle and his rise', () => {
  for (const f of range(O.WINK, O.BURST, 0.5)) {
    const s = starOnScreen(f);
    const far = Math.hypot(s.c[0] - 960, s.c[1] - 540) + s.r;
    assert.ok(far <= I.irisRadius(f) - 20, `${f}: ${far.toFixed(0)} vs ${I.irisRadius(f).toFixed(0)}`);
  }
});

test('R2-ARMS-ATTACH: on every frame from 3.1 + 6 to 4.1 − 1 each arm is drawn from its shoulder (its shoulder end within 25 px of its bracket) to its hand on the rim (≤ 8 px), its stroke weight kept, the ✧ outside the ﾉ (≥ 12 px)', () => {
  for (const f of range(O.OPEN + 6, O.BURST)) {
    const brackets = faceOnScreen(f);
    for (const ch of ['ヽ', 'ﾉ'] as const) {
      const hull = armOnScreen(f, ch);
      const g = I.irisHero(f, real).glyphs.find((q) => q.ch === ch)!;
      const lay = { x: g.x, y: g.y, size: g.size, stretch: g.stretch ?? 1, rot: g.rot ?? 0 };
      const z = I.irisZoom(f);
      const at = (p: P): P => {
        const [c, s] = [Math.cos(lay.rot), Math.sin(lay.rot)];
        const [qx, qy] = [p[0] * lay.size * lay.stretch, p[1] * lay.size];
        return [960 + (lay.x + c * qx - s * qy) * z, 540 - (lay.y + s * qx + c * qy) * z];
      };
      const [base, tip] = [at(I.ARM_INK[ch].base), at(I.ARM_INK[ch].tip)];
      // The shoulder: the hull's points in the shoulder's third of the arm, the nearest of them to the bracket's ink box.
      const len = Math.hypot(tip[0] - base[0], tip[1] - base[1]);
      const near = hull.filter((p) => Math.hypot(p[0] - base[0], p[1] - base[1]) <= len / 3);
      const shoulder = Math.min(...near.map((p) => pointBoxDist(p, brackets[ch === 'ヽ' ? 0 : 4])));
      assert.ok(shoulder <= 25, `${f}: the ${ch}'s shoulder is ${shoulder.toFixed(0)} px from its bracket`);
      // The stroke's weight along the arm (the glyph scaled along its stroke): within −10 % / +25 % of the arm glyph's own.
      const v = Math.hypot(I.ARM_INK[ch].tip[0] - I.ARM_INK[ch].base[0], I.ARM_INK[ch].tip[1] - I.ARM_INK[ch].base[1]);
      const weight = (lay.size * lay.size * lay.stretch * v * z) / (len * IRIS.hero.em * I.ARMS.scale[ch]);
      assert.ok(weight >= 0.9 && weight <= 1.25, `${f}: the ${ch}'s weight ×${weight.toFixed(2)}`);
      if (ch === 'ヽ' && I.pressing(f) > 0) continue;
      const theta = polarAngle(tip[0], tip[1]);
      const rim = irisRadiusAt(I.irisAperture(f), theta);
      assert.ok(Math.abs(Math.hypot(tip[0] - 960, tip[1] - 540) - rim) <= 8, `${f}: the ${ch}'s hand ${Math.hypot(tip[0] - 960, tip[1] - 540).toFixed(0)} from the centre, the rim at ${rim.toFixed(0)}`);
    }
    if (f >= O.WINK) {
      const s = starOnScreen(f);
      const gap = polyDist(s.c, armOnScreen(f, 'ﾉ')) - s.r;
      assert.ok(gap >= 12, `${f}: the ✧ is ${gap.toFixed(1)} px off the ﾉ`);
      assert.ok(s.c[0] > Math.max(...armOnScreen(f, 'ﾉ').map((p) => p[0])), `${f}: the ✧ sits outside the ﾉ (v04's order: face, arm, ✧)`);
    }
  }
});

test('R2-ARMS-ATTACH: the pry — his two fingertips on the dot (outroMonitor’s notches, ±30°) become his hands: on the tonic each hand holds the rim at ±30° and spreads to its grip (ヽ −50°, ﾉ +36°) as it opens', () => {
  const deg = (f: number, ch: 'ヽ' | 'ﾉ') => {
    const e = I.armEnds(f, I.irisFace(f, real)).find((q) => q.ch === ch)!;
    const z = I.irisZoom(f);
    return (polarAngle(960 + (e.tip[0] - 960) * z, 540 + (e.tip[1] - 540) * z) * 180) / Math.PI;
  };
  assert.ok(Math.abs(deg(O.OPEN - 0.75, 'ヽ') + 30) < 1 && Math.abs(deg(O.OPEN - 0.75, 'ﾉ') - 30) < 1, `${deg(O.OPEN - 0.75, 'ヽ')} / ${deg(O.OPEN - 0.75, 'ﾉ')}`);
  assert.ok(Math.abs(deg(O.OPEN + 14, 'ヽ') + 50) < 1 && Math.abs(deg(O.OPEN + 14, 'ﾉ') - 36) < 1);
  assert.ok(Math.abs((I.GRIP * 180) / Math.PI + 50) < 1e-9, 'the dent is where the ヽ held');
});

test('R2-ARM-PRESS / R2S-ARM-OVER-FACE: on every sub-frame from the hand leaving the rim (3.3 − 6) to 3.4 + 6 the ヽ (its ink box) stays ≥ 12 px outside every glyph of his face; it swings round the outside of his `(`, lands on the ↑ on 3.3 and presses both ↑ with its tip on the prompt’s `>`', () => {
  for (const F of range(O.RECALL[0] - 7, O.RUN + 7)) {
    for (const f of subs(F)) {
      const arm = aabb(armOnScreen(f, 'ヽ'));
      for (const [i, box] of faceOnScreen(f).entries()) assert.ok(boxGap(arm, box) >= 12, `${f.toFixed(2)}: the ヽ is ${boxGap(arm, box).toFixed(1)} px from his face's glyph ${i}`);
    }
  }
  // Both ↑: the fingertip on the line's left edge (the `>`), just over the type, for both recalls.
  for (const at of O.RECALL) {
    const e = I.armEnds(at, I.irisFace(at, real)).find((q) => q.ch === 'ヽ')!;
    assert.ok(Math.abs(e.tip[0] - I.PROMPT_X) <= 8, `${at}: the tip at x ${e.tip[0].toFixed(0)}, the prompt at ${I.PROMPT_X.toFixed(0)}`);
    assert.ok(e.tip[1] >= 650 && e.tip[1] <= 675, `${at}: the tip at y ${e.tip[1].toFixed(0)}`);
  }
  // It leaves the rim a 16th before 3.3 and is on the key on 3.3; the swing passes left of the bracket: the hand never right of the `(`.
  assert.equal(I.pressing(O.RECALL[0] - 6), 0);
  assert.equal(I.pressing(O.RECALL[0]), 1);
  for (const f of range(O.RECALL[0] - 6, O.RECALL[0] + 6, 0.25)) {
    const e = I.armEnds(f, I.irisFace(f, real)).find((q) => q.ch === 'ヽ')!;
    assert.ok(e.tip[0] < I.irisFace(f, real).slots[0].box[0], `${f}: the hand at x ${e.tip[0].toFixed(0)}`);
  }
});

test('R2-ARM-PRESS: every prompt state is set from one left edge (the long command’s, ≈ 701): `> █`, `> ↑`, `> exit` and the command start where his command will; the ↑ keycap at x ≈ 744–766', () => {
  assert.ok(Math.abs(I.PROMPT_X - (960 - (24 * 0.6 * IRIS.prompt.size) / 2)) < 1e-9);
  for (const f of [O.SURVIVED, O.RECALL[0], O.RECALL[0] + 4, O.RECALL[1], O.RUN]) {
    const g = I.promptContent(f, mono).glyphs;
    assert.equal(g[0].ch, '>');
    assert.ok(Math.abs(g[0].x + 960 - (I.PROMPT_X + 0.3 * IRIS.prompt.size)) < 1e-6, `${f}: the > at ${g[0].x + 960}`);
  }
  const cap = I.promptContent(O.RECALL[0] + 2, mono).under[0];
  assert.ok(cap.x + 960 >= 744 && cap.x + 960 <= 766, `the keycap at ${cap.x + 960}`);
});

test('F1: the ✧ is his amber at full heat — brighter than his face, its hairline strokes given v04’s weight by an outline of the same gas, a hot core, a halo, a glint on the pop and on every twinkle — at v04’s size (118), beside his winking eye outside the ﾉ (dx 294 / dy −36: R2, v04’s order)', () => {
  const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  assert.ok(lum(I.STAR_INK.body) > 1.2 * lum(INKS.hero), 'brighter than his face');
  assert.ok(I.STAR_INK.body[0] > I.STAR_INK.body[1] * 1.6 && I.STAR_INK.body[2] < 0.1 * I.STAR_INK.body[0], 'amber (orange), not cream: the orange ✧');
  const s = I.starAt(O.WINK + 20)!;
  const g = I.starGlyphs(s);
  assert.equal(g.length, 3);
  assert.ok((g[1].outline ?? 0) >= 0.06 && (g[1].outline ?? 0) <= 0.094, 'an outline within the rounded atlas’s SDF reach');
  assert.equal(I.STAR.size, 118);
  assert.deepEqual([I.STAR.at[0] - IRIS.hero.centre[0], I.STAR.at[1] - IRIS.hero.centre[1]], [294, -36]);
  assert.ok(I.starGlint(I.starAt(O.WINK + 1)).length === 2 && I.starGlint(I.starAt(O.TWINKLES[1] + 1)).length === 2, 'the glint on the pop and on a twinkle');
  // Clear of the ﾉ (its ink hull, ≥ 12 px) from the wink to the burst: the R2-ARMS-ATTACH test above.
});

test('↑ ↑: the prompt waits from 3.2&, recalls the antivirus’s `exit` in red after a 3-frame keycap on 3.3, then his own command on 3.3&; the left hand lets go and the rim dents there', () => {
  assert.equal(I.promptState(O.SURVIVED - 1), null);
  assert.equal(I.promptState(O.SURVIVED)!.text, `${PROMPT}${CURSOR}`);
  assert.deepEqual([O.RECALL[0], O.RECALL[0] + 3, O.RECALL[1], O.RECALL[1] + 3].map((f) => I.promptState(f)!.kind), ['key', 'exit', 'key', 'command']);
  assert.equal(I.promptState(O.RECALL[0] + 3)!.text, C.RECALL_LINES[1]);
  assert.equal(I.promptState(O.RUN)!.text, C.RECALL_LINES[2]);
  const red = I.promptContent(O.RECALL[0] + 6, mono).glyphs.filter((g) => g.color[0] > 1 && g.color[1] < 0.3);
  assert.equal(red.map((g) => g.ch).join(''), C.EXIT_TYPED);
  assert.equal(I.irisDent(O.LET_GO.from - 6), 0, 'whole until the hand leaves it, a 16th before the ↑');
  assert.ok(I.irisDent(O.LET_GO.from) >= 35, 'dented as the hand lands on the ↑');
  assert.ok(Math.abs(I.irisDent(O.LET_GO.from + 12) - 40) <= 6);
  assert.ok(I.irisDent(O.RUN + 12) < 4, 'popped out on Enter');
  assert.ok(Math.abs(I.heroY(O.RUN) - IRIS.hero.risen) < 2, 'risen on the second ↑');
});

test('Enter: friends 1 → 2 → 4 → 8 on the 16ths in fixed slots, the current one bright; the counter stays inside the iris chord', () => {
  assert.deepEqual(O.COUNTER.map((f) => I.counterStep(f)), [1, 2, 3, 4]);
  assert.equal(I.counterStep(O.RUN - 1), 0);
  const nums = I.counterContent(O.COUNTER[3], mono).filter((g) => /^[0-9]$/.test(g.ch));
  assert.deepEqual(nums.map((g) => g.ch), ['1', '2', '4', '8']);
  assert.ok(nums[3].color[1] > nums[2].color[1] * 1.5, 'the current one bright, older ones dim');
  for (const f of range(O.RUN, O.BURST)) {
    const z = I.irisZoom(f);
    for (const g of I.counterContent(f, mono)) {
      const [x, y] = [960 + g.x * z, 540 - g.y * z];
      const [cx, cy] = [Math.abs(x - 960) + 0.35 * g.size * z, Math.abs(y - 540) + 0.5 * g.size * z];
      const rim = irisRadiusAt(I.irisAperture(f), polarAngle(x, y));
      assert.ok(Math.hypot(cx, cy) < rim - 6, `${f}: ${g.ch} reaches ${Math.hypot(cx, cy).toFixed(0)} of ${rim.toFixed(0)}`);
    }
  }
  assert.deepEqual([O.RUN, ...O.SPOTS].map((f) => I.irisFriends(f)), [1, 2, 4, 8]);
});

test('the spots: Swiss with 2, Riso and the transition with 4, the other four with 8; each clear of the main iris, of the others, of W5 and of the frame', () => {
  assert.deepEqual(S.SPOT_LIGHT, [O.SPOTS[0], O.SPOTS[1], O.SPOTS[1], O.SPOTS[2], O.SPOTS[2], O.SPOTS[2], O.SPOTS[2]]);
  for (const f of range(O.SPOTS[0], O.BURST, 0.5)) {
    const ap = I.irisAperture(f);
    const spots = ap.spots.filter((s) => s.inside > 0);
    for (const s of spots) {
      const rs = s.r * s.scale;
      assert.ok(Math.hypot(s.x - 960, s.y - 540) - rs >= ap.irisR + 10, `${f}: spot at ${s.x},${s.y} meets the iris`);
      assert.ok(s.x - rs >= 0 && s.x + rs <= 1920 && s.y - rs >= -40 && s.y + rs <= 1080, `${f}: in frame`);
      assert.ok(s.x - rs > W5_BOX.x1 || s.y + rs < W5_BOX.y0, `${f}: clear of W5`);
      for (const t of spots) if (t !== s) assert.ok(Math.hypot(s.x - t.x, s.y - t.y) >= rs + t.r * t.scale, `${f}: spots overlap`);
    }
  }
  assert.equal(S.spotsAt(O.SPOTS[0] - 1).filter((s) => s.inside > 0).length, 0);
  assert.equal(S.spotsAt(O.SPOTS[2] + 6).filter((s) => s.inside > 0).length, 7);
});

test('F1: every spot stays ≥ 30 px inside the frame through its own pop, the burst’s pop and the burst’s punch (×1.05 about the centre) — drop 2’s kaleidoscope no longer touches the corner', () => {
  const punch = 1.05;
  for (const f of range(O.SPOTS[0], O.BURST + 3, 0.25)) {
    for (const s of S.spotsAt(f)) {
      if (s.inside <= 0 && s.rim <= 0) continue;
      const r = s.r * s.scale * punch;
      const [x, y] = [960 + (s.x - 960) * punch, 540 + (s.y - 540) * punch];
      assert.ok(x - r >= 30 && x + r <= 1890 && y - r >= 30 && y + r <= 1050, `${f}: spot at ${s.x}, ${s.y} (r ${r.toFixed(0)}) within ${Math.min(x - r, 1920 - x - r, y - r, 1080 - y - r).toFixed(0)} px of the edge`);
    }
  }
});

test('each spot is drawn in its world’s Look only while lit: Riso printed, the transition pixelated, the cosmos printed at night and powered, the club inked, drop 2 a kaleidoscope', () => {
  const kinds = SPOT_AT.map((_, i) => Object.keys(S.spotLook(i, O.SPOTS[2] + 4) ?? {}).join());
  assert.deepEqual(kinds, ['', 'riso', 'pixel', 'riso', 'comic', '', 'kaleido']);
  assert.equal(S.spotLook(3, O.SPOTS[2] + 4)!.riso!.night, 1);
  assert.equal(S.spotLook(3, O.SPOTS[2] + 4)!.riso!.power, 1);
  assert.equal(S.spotsLit(O.SPOTS[0] - 1), false);
  assert.equal(S.spotsLit(O.SPOTS[0]), true);
  assert.equal(S.spotsLit(O.BURST + 4), false, 'gone once they have popped on the burst');
  // The friend in each: its world's headliner, its ω amber where it has one.
  assert.deepEqual(S.SPOT_FACES, C.HEADLINERS.filter((h) => h.spot !== null).map((h) => h.face));
  assert.ok(insideIris(I.irisAperture(O.SPOTS[2] + 8), SPOT_AT[6].centre[0], SPOT_AT[6].centre[1]), 'drop 2’s spot is a window');
});

test('W5: types in calm on 3.1& (friends 1, the live frame, `0 threats ✓`), counts the wink’s frame in amber for an 8th, `1 threat` blinking twice, survived on 3.2&, the doublings', () => {
  const rows = (F: number) => W.w5Rows(F, I.irisFriends(F));
  const text = (F: number, y: number) => rows(F).find((r) => r.y === y)?.text;
  assert.equal(W.w5Content(O.MONITOR_BACK - 1, mono, I.irisFriends).glyphs.mono, undefined);
  assert.equal(text(O.MONITOR_BACK, W5_BOX.rows.friends), C.w5Friends(1));
  assert.equal(text(O.MONITOR_BACK + 3, W5_BOX.rows.frame), C.w5Frame(O.MONITOR_BACK + 3));
  assert.equal(text(O.MONITOR_BACK, W5_BOX.rows.defender), C.W5_DEFENDER.clean);
  assert.equal(text(O.WINK, W5_BOX.rows.frame), C.W5_WINK_ROW);
  assert.equal(text(O.WINK + 12, W5_BOX.rows.frame), C.w5Frame(O.WINK + 12));
  assert.equal(text(O.WINK, W5_BOX.rows.defender), C.W5_DEFENDER.wink);
  assert.deepEqual(range(O.WINK, O.WINK + 12).map((F) => W.defenderBlinkOff(F)), [...range(0, 12).map((k) => Math.floor(k / 3) % 2 === 1)]);
  assert.equal(text(O.SURVIVED - 1, W5_BOX.rows.line), undefined);
  assert.equal(text(O.SURVIVED, W5_BOX.rows.line), C.W5_SURVIVED);
  assert.deepEqual(O.COUNTER.map((F) => text(F, W5_BOX.rows.defender)), C.W5_DEFENDER.doubling);
  assert.deepEqual(O.COUNTER.map((F) => text(F, W5_BOX.rows.friends)), [1, 2, 4, 8].map(C.w5Friends));
  assert.equal(W.defenderRow(O.BURST), C.W5_DEFENDER.infinite);
  assert.equal(W.defenderRow(O.DROP.to), C.W5_DEFENDER.friendly);
});

test('fast moves blur: 32 sub-frames through the pry, the wink, the arm’s swings, Enter and the spots', () => {
  for (const f of [O.OPEN, O.OPEN + 5, O.WINK, O.LET_GO.from - 3, O.LET_GO.from + 2, O.RECALL[1] + 2, O.RUN, O.SPOTS[2] + 2]) assert.ok(I.irisTemporal(f).samples >= 32, `${f}`);
});
