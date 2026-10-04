// Round-1 review fixes on the flat world and the system (src/shots/breakWorld.ts, breakSystem.ts, breakShared.ts): readable cast
// (R1-06, R1-13), dancers clear of the fan (R1-07), break bar 5's 16ths on screen (R1-03), crisp wipes (R1-08), a clean ripple (R1-09), a
// livelier hold (R1-11), the 16ths kept on screen up to the hang (R1-07b) and a callout that predicts the cut (R1-13).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CALLOUT_CHIP } from '../src/content/break.ts';
import { DANCERS } from '../src/content/castBreak.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { DANCERS_LAND, DANCER_SWAPS, FAN, FAN_FOLD, FRIENDS, FRIENDS_DUCK, HANG, MATCH_CUT, PEEKS, RIPPLE } from '../src/score/break.ts';
import { HERO_ADVANCE, breakCam, frameOf, rotate, tighten, toScreen } from '../src/shots/breakShared.ts';
import { faceCore, heroAt } from '../src/shots/breakHero.ts';
import { MONITOR_BOX, calloutAt, monitorAt, tagsAt } from '../src/shots/breakSystem.ts';
import { blockAt, dancersAt, fanAt, flatSegment, flatTemporal, peekAt, rippleAt, setFaceAdvance, shockedAt, wipePanels, worldAt } from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

/** The cast's advances (ems) in the jp stack (Noto Sans JP and its fallbacks), measured with opentype.js from public/fonts. */
const JP_EM: Readonly<Record<string, number>> = {
  '▼・ᴥ・▼': 4.505, '( ° ∀ ° )ﾉﾞ': 4.15, '( ° ∀ ° )': 3.15, 'ﾉﾞ': 1, '|_￣))': 2.391, '(・_・;)': 3.379, '┬┴┬┴┤(･_├┬┴┬┴': 11.349, '(´･_･`)': 3.32,
  '(」゜ロ゜)」': 5.598, '＼(º □ º l|l)/': 5.195, '／(=☉ x ☉=)＼': 6.514, 'ʕ ˵• ₒ •˵ ʔ': 3.605,
  '♪(┌・。・)┌': 6.598, '┌(★o☆)┘': 5.184, '⁽⁽◝( • ω • )◜⁾⁾': 5.504, '✺◟( • ω • )◞✺': 6.26, '┐(︶▽︶)┌': 5.598, '╮(︶▽︶)╭': 5.598,
  '└(＾＾)┐': 4.598, '┌(＾＾)┘': 4.598, '₍₍ (ง ˘ω˘ )ว ⁾⁾': 4.896, 'ʚ(｡˃ ᵕ ˂ )ɞ': 3.94, '♪♪♪ ヽ(ˇ∀ˇ )ゞ': 8.238, '⸜( *ˊᵕˋ* )⸝': 4.504,
  '(￣▽￣)ノ': 4.598, '(=^･ω･^=)': 4.414,
};
const jpEm = (s: string): number => JP_EM[s] ?? 0.62 * [...s].length;
setFaceAdvance(jpEm);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
type P = readonly [number, number];
type Quad = readonly P[];
/** Separating-axis test for two convex polygons. */
const overlap = (a: Quad, b: Quad): boolean => {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const n: P = [q[1] - p[1], p[0] - q[0]];
      const proj = (s: Quad) => s.map((v) => v[0] * n[0] + v[1] * n[1]);
      const [pa, pb] = [proj(a), proj(b)];
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
    }
  }
  return true;
};
const box = (x: number, y: number, hw: number, hh: number): Quad => [[x - hw, y - hh], [x + hw, y - hh], [x + hw, y + hh], [x - hw, y + hh]];
const heroAdv = (ch: string): number => (HERO_ADVANCE as Record<string, number>)[ch] ?? 0.62;
/** The ink boxes of his face core (world layout px), grown by `grow` px, as a copy turned `angle` about `pivot` and scaled `scale`. */
const coreBoxes = (f: number, angle: number, pivot: P, scale: number, grow: number): Quad[] =>
  faceCore(f).map((g) => {
    // Ink, not the advance box: side bearings take about a fifth of the advance; a bracket is a 0.28 em curve; ±0.45 em about the middle.
    const hw = (g.ch === "(" || g.ch === ")" ? 0.14 : 0.4 * heroAdv(g.ch)) * g.size * g.stretch + grow;
    const b = box(g.x, g.y + 0.01 * g.size, hw, 0.45 * g.size * g.sy + grow);
    return b.map(([x, y]) => {
      const [rx, ry] = rotate(scale * (x - pivot[0]), scale * (y - pivot[1]), angle);
      return [pivot[0] + rx, pivot[1] + ry] as const;
    });
  });
/** A cast face's ink box (Noto Sans JP; the tests' fake advance: 0.62 em a character). */
const faceBox = (key: string, x: number, y: number, size: number): Quad => box(x, y, (jpEm(key) * size) / 2, 0.45 * size);
/**
 * His ink with its 8 px outline and its (14, 14) shadow (not the cream keyline, which is the ground's colour). Brackets span the
 * whole em (±0.5 em about the middle) and are a 0.28 em curve; other glyphs ±0.45 em and 0.8 of their advance.
 */
const inkBoxes = (f: number): Quad[] =>
  faceCore(f).flatMap((g) => {
    const bracket = g.ch === '(' || g.ch === ')';
    const hw = (bracket ? 0.14 : 0.4 * heroAdv(g.ch)) * g.size * g.stretch + 8;
    const hh = (bracket ? 0.5 : 0.45) * g.size * g.sy + 8;
    return [box(g.x, g.y, hw, hh), box(g.x + 14, g.y + 14, hw, hh)];
  });

test('R1-07: the fan never reaches a dancer’s face — no copy comes near its eyes and mouth (since iteration 2 they never share a beat), and his ink never touches it, 2358–2375', () => {
  for (let f = DANCERS_LAND; f < RIPPLE; f += 1) {
    const copies = fanAt(f).flatMap((c) => coreBoxes(f, c.angle, c.pivot, c.scale, 4));
    const hero = inkBoxes(f);
    for (const d of dancersAt(f)) {
      // The dancers stand in front of the copies with a cream knock-out: a copy's bracket tip may tuck behind a head, never reach the face.
      const face = box(d.x, d.y, (jpEm(d.key) * d.size) / 2, 0.2 * d.size);
      for (const c of copies) assert.ok(!overlap(face, c), `a copy reaches ${d.key}'s face on ${f}`);
      for (const h of hero) assert.ok(!overlap(face, h), `his ink reaches ${d.key}'s face on ${f}`);
    }
  }
});

test('R1-07: every dancer stands in front from the landing on (2358) until they duck (2370), with a cream knock-out of 6–8 px', () => {
  for (const f of [DANCERS_LAND, at(5, 3.375), at(5, 3.5), at(5, 3.625), FRIENDS_DUCK.from - 0.5]) {
    const ds = dancersAt(f);
    assert.ok(ds.length >= 6, `six dancers on ${f}`);
    for (const d of ds.filter((q) => Object.values(DANCERS).flat().includes(q.key as never))) {
      assert.equal(d.behind, false, `${d.key} in front on ${f}`);
      assert.ok(d.knock >= 6 && d.knock <= 8, `${d.key} knock-out ${d.knock}`);
    }
  }
});

test('R1-03: bar 25’s 16ths are on screen — the fan’s colours chase one copy on every 16th, whole on its frame', () => {
  const colors = (f: number) => fanAt(f).map((c) => c.color).join(',');
  for (let h = FAN + 6; h < FAN_FOLD.from; h += 6) {
    assert.notEqual(colors(h), colors(h - 1), `a chase step on ${h}`);
    for (const s of temporalSamples(h, flatTemporal(h), flatSegment(h))) assert.equal(colors(s.frame), colors(h), `whole on ${s.frame.toFixed(3)}`);
  }
  assert.equal(colors(FAN + 2), colors(FAN + 5), 'no change between the 16ths');
});

test('R1-03 (iteration 2): every 16th of 25.3 moves the friends — they jump on 25.3, land on 25.3e, bounce and change faces on 25.3&, duck on 25.3a', () => {
  // (Ruling 4 gave the friends break 5.3 alone, so their dips on break bar 5's closed 16ths went with 5.1& and 5.2.)
  const ink = (f: number) => dancersAt(f).filter((d) => d.color === 'ink');
  const y = (f: number) => ink(f).map((d) => d.y);
  assert.equal(ink(FRIENDS.from - 0.5).length, 0, 'none before 25.3');
  for (const [a, b, what] of [[FRIENDS.from, FRIENDS.from + 2, 'jump'], [DANCERS_LAND - 1, DANCERS_LAND + 1, 'land'], [DANCER_SWAPS[0] - 0.3, DANCER_SWAPS[0] + 3, 'bounce'], [FRIENDS_DUCK.from - 0.3, FRIENDS_DUCK.from + 4, 'duck']] as const) {
    const moved = y(b).map((v, i) => Math.abs(v - y(a)[i]));
    assert.ok(Math.min(...moved) > 2, `the ${what} on ${a}: ${moved.map((v) => v.toFixed(1)).join(' ')} px`);
  }
  assert.notEqual(ink(DANCER_SWAPS[0] - 1).map((d) => d.key).join('|'), ink(DANCER_SWAPS[0] + 1).map((d) => d.key).join('|'), 'they change faces on 25.3&');
});

test('R1-03: bar 25’s confetti tick 15° on every closed 16th and turn 1° a frame between', () => {
  const turn = (f: number) => worldAt(f).items.filter((i) => i.role === 'confetti').map((i) => i.rot);
  const h = at(5, 2.75);
  const d = turn(h + 3).map((r, i) => r - turn(h - 0.5)[i]);
  for (const x of d) assert.ok(x > 14 && x < 21, `tick on ${h}: ${x.toFixed(2)}°`);
  const e = turn(at(5, 3) - 1).map((r, i) => r - turn(at(5, 3) - 2)[i]);
  for (const x of e) near(x, 1, 0.3, 'living turn');
});

test('R1-11: the living hold is visible — bar 22–24 blocks breathe ±2° and ±2 %, confetti turn 1° a frame', () => {
  const rots: number[] = [];
  const scales: number[] = [];
  for (let f = at(2, 3) - 2; f < at(4); f += 2) {
    const b = worldAt(f).items.find((i) => i.role === 'block' && i.colorName === 'coral')!;
    rots.push(b.rot);
    scales.push(b.scale);
  }
  assert.ok(Math.max(...rots) - Math.min(...rots) > 3.5, `rot swing ${(Math.max(...rots) - Math.min(...rots)).toFixed(2)}°`);
  assert.ok(Math.max(...scales) - Math.min(...scales) > 0.035, 'scale swing');
  const c = (f: number) => worldAt(f).items.filter((i) => i.role === 'confetti')[0].rot;
  near(c(at(2, 4.5) + 1) - c(at(2, 4.5)), 1, 0.01, 'confetti turn');
});

test('R1-06/R1-13: each peeker shows its whole face for at least 6 frames, clear of the monitor, the tags and the other cast', () => {
  for (let i = 0; i < PEEKS.length; i++) {
    const w = PEEKS[i];
    let run = 0;
    let best = 0;
    for (let f = w.from; f < w.to + 4; f++) {
      const p = peekAt(f)[0];
      const shown = p ? p.shown : 0;
      run = shown >= 0.7 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    assert.ok(best >= 6, `peeker ${i} shows ≥ 70 % of itself for ${best} frames`);
  }
  // Clear of the monitor (screen) and of every tag, on every frame it is out.
  const monitor = box(MONITOR_BOX.margin + 251, 1080 - MONITOR_BOX.margin - 68, 260, 72);
  for (let f = at(2, 4.25) + 2; f < at(4, 4.5) - 2; f++) {
    for (const p of peekAt(f)) {
      if (p.shown < 0.3) continue;
      const cam = breakCam(f);
      const [sx, sy] = p.screen ? [p.x, p.y] : toScreen(cam, p.x, p.y);
      const k = p.screen ? 1 : cam.zoom;
      const b = faceBox(p.face, sx, sy, p.size * k);
      if (monitorAt(f)) assert.ok(!overlap(b, monitor), `peeker ${p.face} under the monitor on ${f}`);
      for (const t of tagsAt(f, () => 0.6)) {
        const [tx, ty] = toScreen(cam, t.x, t.y);
        const tb = box(tx, ty, (0.5 * (t.full.length * 0.6 * 22 + 20) + 4) * cam.zoom, 22 * cam.zoom);
        assert.ok(!overlap(b, tb), `peeker ${p.face} under tag ${t.id} on ${f}`);
      }
    }
  }
});

test('R1-13: the 23.1& peeker is off the loop’s path (its box never meets the flying bracket)', () => {
  for (let f = at(3, 1.5); f < at(3, 2.5) - 2; f++) {
    const p = peekAt(f)[0];
    if (!p || p.shown < 0.05) continue;
    const b = faceBox(p.face, p.x, p.y, p.size);
    const open = heroAt(f).frags.filter((d) => d.k === 51 || d.k === 52 || d.k === 53);
    for (const d of open) {
      const c: P = [d.m[0] * 397 + d.m[2] * 562 + d.m[4], d.m[1] * 397 + d.m[3] * 562 + d.m[5]];
      assert.ok(!overlap(b, box(c[0], c[1], 110, 200)), `the bracket flies through the peeker on ${f}`);
    }
  }
});

test('R1-13: the gasp is drawn in front with a knock-out, each face clear of the others, of his ")" and of every tag', () => {
  const f = at(4, 4.5) - 2;
  const faces = shockedAt(f);
  assert.equal(faces.length, 4);
  const cam = breakCam(f);
  const boxes = faces.map((s) => {
    assert.equal(s.behind, false, `${s.key} in front`);
    assert.ok(s.knock >= 5, `${s.key} knock-out`);
    const [x, y] = toScreen(cam, s.x, s.y);
    return faceBox(s.key, x, y, s.size * cam.zoom);
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.ok(!overlap(boxes[i], boxes[j]), `${faces[i].key} meets ${faces[j].key}`);
  const tags = tagsAt(f, () => 0.6).map((t) => {
    const [tx, ty] = toScreen(cam, t.x + 10 * t.copies, t.y + 10 * t.copies);
    return box(tx - 5 * t.copies * cam.zoom, ty - 5 * t.copies * cam.zoom, (0.5 * (t.full.length * 0.6 * 22 + 20) + 5 * t.copies + 4) * cam.zoom, (19 + 5 * t.copies) * cam.zoom);
  });
  boxes.forEach((b, i) => tags.forEach((t, j) => assert.ok(!overlap(b, t), `${faces[i].key} meets tag ${j}`)));
  // His ")" in its slot (world (1522, 582), em 360 stretched 1.3), on screen.
  const [cx, cy] = toScreen(cam, 1522, 582);
  const close = box(cx, cy, 0.5 * 0.412 * 360 * 1.3 * cam.zoom, 180 * cam.zoom);
  boxes.forEach((b, i) => assert.ok(!overlap(b, close), `${faces[i].key} behind his ")"`));
});

test('R1-08: the restart wipe and the diamond wipe keep hard edges — the panels and the diamond are one sharp instant per frame (they cross 300–640 px a frame: any shutter eats a 6 px edge)', () => {
  for (const out of [at(4, 4.5) + 1, at(4, 4.625), at(4, 4.75) - 2, at(4, 4.75) + 2]) {
    const ref = JSON.stringify(wipePanels(out));
    assert.ok(wipePanels(out).length > 0, `panels on ${out}`);
    for (const s of temporalSamples(out, flatTemporal(out), flatSegment(out))) assert.equal(JSON.stringify(wipePanels(s.frame)), ref, `${out} @ ${s.frame.toFixed(3)}`);
  }
  const mint = (f: number) => worldAt(f).items.find((i) => i.role === 'block' && i.colorName === 'mint')!;
  for (const out of [at(4) + 2, at(4, 1.25) - 2, at(4, 1.25)]) {
    const ss = temporalSamples(out, flatTemporal(out), flatSegment(out)).map((s) => mint(s.frame).scale);
    const spread = Math.max(...ss) - Math.min(...ss);
    const frame = Math.abs(mint(out + 0.5).scale - mint(out - 0.5).scale);
    assert.ok(frame > 0.05 && spread < 1e-9, `diamond blur on ${out}: ${spread.toFixed(4)} vs a frame's ${frame.toFixed(4)}`);
  }
});

test('R1-09: the 25.4 ripple is four opaque coloured outlines, their strokes thinning 6 → 0 as they grow 1.0 → 1.45', () => {
  const all = new Map<number, { scale: number; stroke: number }[]>();
  for (let f = RIPPLE; f < RIPPLE + 20; f++) {
    const r = rippleAt(f);
    assert.ok(r.length <= 4, `${r.length} copies on ${f}`);
    r.forEach((c, i) => {
      assert.equal(c.alpha, 1, 'opaque');
      assert.ok(c.scale >= 1 && c.scale <= 1.45 + 1e-9, `scale ${c.scale}`);
      assert.ok(c.stroke >= 0 && c.stroke <= 6, `stroke ${c.stroke}`);
      all.set(i, [...(all.get(i) ?? []), { scale: c.scale, stroke: c.stroke }]);
    });
  }
  assert.deepEqual([...new Set(rippleAt(RIPPLE + 7).map((c) => c.color))].length, 4, 'four colours at once');
  near(rippleAt(RIPPLE)[0].stroke, 6, 1e-9, 'a full 6 px stroke at the start');
  assert.equal(rippleAt(RIPPLE + 20).length, 0, 'gone before the callout');
});

test('R1-07b: the tags copy themselves on every 16th from 24.3& + 6 to the hang, each burst a whole-frame jump', () => {
  const copies = (f: number) => Math.max(...tagsAt(f, () => 0.6).map((t) => t.copies));
  assert.equal(copies(at(4, 3.25) - 1), 0);
  const bursts = [at(4, 3.25), at(4, 3.5), at(4, 3.75), at(4, 3.875)];
  bursts.forEach((b, i) => {
    assert.equal(copies(b), i + 1, `${i + 1} copies on ${b}`);
    assert.equal(copies(b - 1), i, `before ${b}`);
    assert.ok(tagsAt(b, () => 0.6).some((t) => t.split), `an RGB split on ${b}`);
    assert.ok(!tagsAt(b + 1, () => 0.6).some((t) => t.split) || bursts.includes(b + 1), `one frame of split after ${b}`);
  });
  assert.ok(HANG > bursts[3]);
});

test('R1-07b: the monitor’s memory ticks up on every 16th of bar 24 until the hang', () => {
  const mem = (f: number) => monitorAt(f)!.memory;
  for (let h = at(4); h < HANG; h += 6) {
    if ([at(4, 3)].includes(h)) continue;
    assert.ok(mem(h) > mem(h - 1), `memory ticks on ${h}: ${mem(h - 1)} → ${mem(h)}`);
  }
  assert.equal(mem(HANG), 199);
});

test('R1-13: the callout frames exactly what 26.1 shows — its box is the frame shrunk by the cut’s zoom ratio, centred', () => {
  const ratio = breakCam(MATCH_CUT).zoom / breakCam(MATCH_CUT - 1).zoom;
  near(ratio, 1.48, 0.01, 'zoom ratio');
  const c = calloutAt(at(6) - 1)!;
  near(c.x1 - c.x0, 1920 / ratio, 1.5, 'width');
  near(c.y1 - c.y0, 1080 / ratio, 1.5, 'height');
  near((c.x0 + c.x1) / 2, 960, 1, 'centre x');
  near((c.y0 + c.y1) / 2, 540, 1, 'centre y');
  assert.equal(c.chip, CALLOUT_CHIP);
});

test('R1-13: the callout’s chip names the cut’s zoom (×1.48)', () => {
  const ratio = breakCam(MATCH_CUT).zoom / breakCam(MATCH_CUT - 1).zoom;
  assert.equal(CALLOUT_CHIP, `zoom ×${ratio.toFixed(2)}`);
});

void frameOf;
void blockAt;
void tighten;
