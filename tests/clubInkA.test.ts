// The comic club INK, bars 1–3 (src/shots/clubInkA.ts; build sheet notes/b58/club-sheet.md §3.2–§3.4, §4 E1–E6, §5): the dot that
// inks as his eye, the burst that becomes the focus lines, the splash cover, the page cut by BOOM bands into panels, the cat DJ's record
// inset and the dive into the Busby Berkeley record, the rise into the match cut. Readers recover meaning from the draw lists (who is
// where, in which ink) through each draw's camera.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pose } from '../src/engine/camera.ts';
import type { RGB } from '../src/engine/color.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { type ScreenAnchor, planePoint } from '../src/engine/post/dotScreen.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { CAT_INK, FLEXER, GIRL, HERO_INK } from '../src/content/castClub.ts';
import { INK_ATLASES } from '../src/content/club.ts';
import * as C from '../src/score/club.ts';
import { inkSegment, inkTemporal } from '../src/shots/clubInk.ts';
import { HOOK_NODS, RECORD_PART, SPLASH, burstFront, focusPointOf, highFiveAt, inkAAim, leapFollow, recordAngle, recordPlates } from '../src/shots/clubInkA.ts';
import type { InkDrawB, Poly } from '../src/shots/clubInkB.ts';
import { AMBER, CYAN, FRONT, type InkDraw, type InkLayout, K, NIGHT, PAPER, PINK, PLATE_REST, RED, VOID } from '../src/shots/clubInkKit.ts';

const { HOOK } = (await import('../scripts/audio/sections/drop1.mjs' as string)) as { HOOK: readonly (readonly (readonly number[])[])[] };

const advance = (ch: string): number => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6);
const L: InkLayout = { advance: { face: advance, sfx: advance, ui: advance, display: advance, mono: advance, readout: advance } };
const frameAt = (f: number): InkDraw[] => (f < C.RECORD ? SPLASH : RECORD_PART).frame(f, L);

/** Screen px (1080p, y up, origin at the centre) of world point (x, y) on z = 0 seen through `pose`. */
function screenOf(pose: Pose, x: number, y: number): [number, number] {
  const zoom = FRONT / (pose.position[2] - pose.target[2]);
  const r = Math.atan2(pose.up[0], pose.up[1]);
  const dx = x - pose.target[0];
  const dy = y - pose.target[1];
  return [zoom * (Math.cos(r) * dx - Math.sin(r) * dy), zoom * (Math.sin(r) * dx + Math.cos(r) * dy)];
}
const zoomOf = (pose: Pose): number => FRONT / (pose.position[2] - pose.target[2]);
const same = (a: RGB, b: RGB): boolean => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
type Item = { pose: Pose; shape?: Shape; glyph?: Glyph; atlas?: string };
function items(draws: readonly InkDraw[]): Item[] {
  const out: Item[] = [];
  for (const d of draws) {
    for (const s of d.content.under) out.push({ pose: d.pose, shape: s });
    for (const [atlas, gs] of Object.entries(d.content.glyphs)) for (const g of gs) out.push({ pose: d.pose, glyph: g, atlas });
    for (const s of d.content.over) out.push({ pose: d.pose, shape: s });
  }
  return out;
}
const glyphsIn = (draws: readonly InkDraw[], color?: RGB): Item[] => items(draws).filter((i) => i.glyph && (!color || same(i.glyph.color, color)));
const shapesIn = (draws: readonly InkDraw[], color?: RGB): Item[] => items(draws).filter((i) => i.shape && (!color || same(i.shape.color, color)));
/** The polygons of a draw list (the scene's polygon layer), with their draw's pose and the screen their fixed screens print on. */
const polysIn = (draws: readonly InkDraw[], color?: RGB): { pose: Pose; poly: Poly; anchor?: ScreenAnchor }[] =>
  (draws as readonly InkDrawB[]).flatMap((d) => (d.polys ?? []).filter((p) => !color || same(p.color, color)).map((poly) => ({ pose: d.pose, poly, anchor: d.anchor })));
/** Where a fixed screen's plane point lands on screen (dotScreen.ts: screen = (x, y) + zoom · R(roll) · plane). */
const anchorScreen = (a: ScreenAnchor, p: readonly [number, number]): [number, number] => [a.x + a.zoom * (Math.cos(a.roll) * p[0] - Math.sin(a.roll) * p[1]), a.y + a.zoom * (Math.sin(a.roll) * p[0] + Math.cos(a.roll) * p[1])];
/** The sub-frame instants an output frame is photographed at (its part's shutter, inside its segment). */
const instants = (F: number): number[] => temporalSamples(F, inkTemporal(F), inkSegment(F)).map((s) => s.frame);
/** P1's Ben-Day ground: its pink dot instances (solid round discs 20–60 px across on screen). */
const p1Dots = (draws: readonly InkDraw[]): Item[] =>
  shapesIn(draws, PINK).filter((i) => i.shape!.kind === 'ellipse' && i.shape!.w === i.shape!.h && !i.shape!.tint && i.shape!.w * zoomOf(i.pose) > 20 && i.shape!.w * zoomOf(i.pose) < 60);

test('E1, the dot inks: on club 1.1 his left • eye is an amber disc Ø 190 on the cosmos point (the frame centre, ≤ 2 px) — v08: open already (bridge A opened the point to it; it grew Ø 120 → 190 by +3 when the club began on the point) — and so on +3; the ground is the void', () => {
  for (const [f, d] of [[C.DOT_INKS, 190], [C.DOT_INKS + 3, 190]] as const) {
    const draws = frameAt(f);
    assert.ok(draws[0].paper && same(draws[0].paper.color, VOID), `${f}: the cosmos's black stays the ground`);
    const discs = shapesIn(draws, AMBER).filter((i) => i.shape!.kind === 'ellipse' && Math.abs(i.shape!.w - i.shape!.h) < 1e-6 && !i.shape!.tint);
    const eye = discs.map((i) => ({ at: screenOf(i.pose, i.shape!.x, i.shape!.y), d: i.shape!.w * zoomOf(i.pose) })).sort((a, b) => Math.hypot(...a.at) - Math.hypot(...b.at))[0];
    assert.ok(eye, `${f}: an amber eye disc`);
    assert.ok(Math.hypot(...eye.at) <= 2, `${f}: the eye at ${eye.at}`);
    assert.ok(Math.abs(eye.d - d) <= 0.05 * d, `${f}: Ø ${eye.d.toFixed(1)} ≠ ${d}`);
  }
});

test('E1: the jagged front is full on the dot’s own frame (plan v07 §2.3: its spikes in the frame’s corners, its trough past the top and bottom), past the corners by +4, and until then everything printed beyond it is covered by the void again — but his face, drawn over the void (v08: bridge A printed it whole a bar before)', () => {
  assert.equal(burstFront(0), 1150);
  assert.ok(burstFront(0) * 0.73 > 540 && burstFront(0) < Math.hypot(960, 540) * 1.1, 'full on +0: the trough beyond the frame’s top and bottom, the spikes at its corners');
  assert.ok(burstFront(4) * 0.6 > Math.hypot(960, 540), 'the trough clears the corners by +4');
  /** Whether rect `s` (world, rotated) contains world point (x, y). */
  const inside = (s: Shape, x: number, y: number): boolean => {
    const r = -(s.rot ?? 0);
    const dx = x - s.x;
    const dy = y - s.y;
    return Math.abs(Math.cos(r) * dx - Math.sin(r) * dy) <= s.w / 2 && Math.abs(Math.sin(r) * dx + Math.cos(r) * dy) <= s.h / 2;
  };
  // While the front is in the frame (+0 … +2; from +3 it is past every edge and the void's slivers lie outside it).
  for (let t = 0; t <= 2; t++) {
    const all = items(frameAt(C.DOT_INKS + t));
    const voids = all.map((i, k) => ({ i, k })).filter(({ i }) => i.shape && i.shape.kind === 'rect' && same(i.shape.color, VOID));
    assert.ok(voids.length > 300, `+${t}: the void's slivers`);
    const lastVoid = Math.max(...voids.map((v) => v.k));
    let beyond = 0;
    let face = 0;
    all.forEach((i, k) => {
      const it = (i.shape ?? i.glyph)!;
      if (same(it.color, VOID)) return;
      const r = Math.hypot(...screenOf(i.pose, it.x, it.y));
      if (r <= burstFront(t) * 1.2) return;
      // His face (its type and its inked eyes, in its inks) is drawn after the void's slivers: whole past the front.
      if (k > lastVoid && (i.glyph || [AMBER, K, NIGHT, PAPER].some((c) => same(it.color, c)))) {
        face++;
        return;
      }
      beyond++;
      assert.ok(voids.some((v) => v.k > k && inside(v.i.shape!, it.x, it.y)), `+${t}: a ${i.shape ? i.shape.kind : `"${i.glyph!.ch}"`} at r ${r.toFixed(0)} shows outside the front ${burstFront(t)}`);
    });
    if (t === 0) assert.ok(face > 0, 'his face reaches past the front on +0, drawn whole over the void (v08)');
    void beyond;
  }
});

test('E1 → splash: through the first beat the page prints in (the paper clears from his eye outward, the dots stretch), and on the pull-back the stretched dots are K focus lines on paper (figure and ground swap), every line aimed at the vanishing point', () => {
  // The print-in (plan v07 §2.3): the void stays the ground until the pull-back; the paper's disc grows, the dots stretch along their rays.
  const discR = (f: number) => Math.max(0, ...shapesIn(frameAt(f), PAPER).filter((i) => i.shape!.kind === 'ellipse' && i.shape!.w === i.shape!.h && i.shape!.w * zoomOf(i.pose) > 300).map((i) => (i.shape!.w * zoomOf(i.pose)) / 2));
  let last = -1;
  for (let f = C.DOT_INKS; f < C.PULL_BACK; f += 3) {
    assert.ok(same(frameAt(f)[0].paper!.color, VOID), `${f}: still the void's ground`);
    const r = discR(f);
    assert.ok(r >= last, `${f}: the paper's disc grows (${r.toFixed(0)} px)`);
    last = r;
  }
  assert.ok(discR(C.PULL_BACK - 1) > 500, 'the middle of the frame is paper by the pull-back (the rays round it are the focus lines to come)');
  assert.equal(discR(C.DOT_INKS + 1), 0, 'none in the burst’s first frames');
  const draws = frameAt(C.PULL_BACK);
  assert.ok(draws[0].paper && same(draws[0].paper.color, PAPER));
  const lines = shapesIn(draws, K).filter((i) => i.shape!.kind === 'ellipse' && i.shape!.w > 20 * i.shape!.h);
  assert.ok(lines.length >= 60, `${lines.length} focus lines`);
  // On the pull-back's frame the vanishing point has snapped most of the way from his eye to his feet (snapL).
  const eye = focusPointOf(C.PULL_BACK, L);
  for (const i of lines) {
    const d = Math.atan2(i.shape!.y - eye[1], i.shape!.x - eye[0]) - (i.shape!.rot ?? 0);
    const off = Math.abs(Math.atan2(Math.sin(2 * d), Math.cos(2 * d))) / 2;
    assert.ok(off < (3 * Math.PI) / 180, `a line off its vanishing point by ${((off * 180) / Math.PI).toFixed(1)}°`);
  }
});

test('every drum-timed swap is whole on its drum frame: the disco point on 1.4, the girl’s infection on 2.2&, the flexer’s on 2.4e', () => {
  const has = (f: number, ch: string, color?: RGB): boolean => glyphsIn(frameAt(f), color).some((i) => i.glyph!.ch === ch);
  for (const f of instants(C.DISCO)) assert.ok(!has(f, 'ヽ', AMBER) && has(f, 'ノ', AMBER), `${f}: (•ω•)ノ`);
  for (const f of instants(C.DISCO - 1)) assert.ok(has(f, 'ヽ', AMBER), `${f}: ヽ(•ω•)ノ`);
  const mouth = [...GIRL.host].find((c) => !GIRL.infected.includes(c))!;
  for (const f of instants(C.INFECTIONS[0])) assert.ok(!has(f, mouth), `${f}: her ${mouth} is gone`);
  for (const f of instants(C.INFECTIONS[0] - 1)) assert.ok(has(f, mouth), `${f}: her ${mouth}`);
  const lip = [...FLEXER.host].find((c) => !FLEXER.infected.includes(c))!;
  for (const f of instants(C.INFECTIONS[1])) assert.ok(!has(f, lip), `${f}: his ${lip} is gone`);
  for (const f of instants(C.INFECTIONS[1] - 1)) assert.ok(has(f, lip), `${f}: his ${lip}`);
});

test('every character drawn is in its atlas, no draw overflows the ink layer’s fields, no coordinate is NaN (club 1.1 → 4.1, two instants a frame)', () => {
  const sets = Object.fromEntries(Object.entries(INK_ATLASES).map(([id, a]) => [id, new Set<string>(a.chars)]));
  for (let F = C.CLUB.from; F < C.MATCH_CUP; F++) {
    for (const f of [F, F + 0.4]) {
      const draws = frameAt(f);
      assert.ok(draws.length > 0 && draws[0].paper, `${f}: a ground first`);
      for (const d of draws) {
        assert.ok(d.content.under.length <= 8192 && d.content.over.length <= 512, `${f}: shapes ${d.content.under.length}/${d.content.over.length}`);
        for (const s of [...d.content.under, ...d.content.over]) assert.ok([s.x, s.y, s.w, s.h, s.rot ?? 0].every(Number.isFinite), `${f}: a ${s.kind} at ${s.x}, ${s.y}`);
        for (const [atlas, gs] of Object.entries(d.content.glyphs)) {
          assert.ok(atlas in sets && atlas !== 'readout', `${f}: atlas ${atlas}`);
          assert.ok(gs.length <= 8192, `${f}: ${gs.length} glyphs`);
          for (const g of gs) {
            assert.ok(sets[atlas].has(g.ch), `${f}: "${g.ch}" is not in the ${atlas} atlas`);
            assert.ok([g.x, g.y, g.size, g.rot ?? 0].every(Number.isFinite), `${f}: "${g.ch}" at ${g.x}, ${g.y}`);
          }
        }
      }
    }
  }
});

test('red belongs to the antivirus: none before the flam opens his strip; then only in the lounge strip (cherry, ✦, ting!) on the right; in bar 3 only the scan line one beat late', () => {
  const reds = (f: number) => items(frameAt(f)).filter((i) => same((i.shape ?? i.glyph)!.color, RED));
  for (let f = C.CLUB.from; f < C.FLAM; f += 1) assert.equal(reds(f).length, 0, `${f}`);
  for (let f = C.FLAM; f < C.DIVE.from; f += 1)
    for (const i of reds(f)) {
      const it = (i.shape ?? i.glyph)!;
      assert.ok(screenOf(i.pose, it.x, it.y)[0] > 380, `${f}: red at ${screenOf(i.pose, it.x, it.y)}`);
    }
  for (let f = C.RECORD; f < C.MATCH_CUP; f += 1) assert.equal(reds(f).length > 0, f >= C.SCAN_SWEEP.from && f < C.SCAN_SWEEP.to, `${f}`);
});

test('amber is his alone: every amber character is one of his faces’ or an infected ω (his mark), never a friend’s face', () => {
  const his = new Set([...Object.values(HERO_INK).flat().join('')]);
  for (let f = C.CLUB.from; f < C.MATCH_CUP; f += 3)
    for (const i of glyphsIn(frameAt(f), AMBER)) assert.ok(his.has(i.glyph!.ch) || i.glyph!.ch === 'ω', `${f}: amber "${i.glyph!.ch}"`);
  assert.ok(!glyphsIn(frameAt(C.INSET + 6), AMBER).some((i) => [...CAT_INK].filter((c) => c !== 'ω').includes(i.glyph!.ch) && !his.has(i.glyph!.ch)), 'the cat is not infected');
});

test('E5: the dive lands through the ring — at club 3.1 − ε the inset shows the bar-3 record at the same scale, centre and turn', () => {
  const label = (f: number) => {
    const discs = shapesIn(frameAt(f), PINK).filter((i) => i.shape!.kind === 'ellipse' && Math.abs(i.shape!.w - i.shape!.h) < 1e-6 && !i.shape!.tint);
    const big = discs.sort((a, b) => b.shape!.w * zoomOf(b.pose) - a.shape!.w * zoomOf(a.pose))[0];
    return { at: screenOf(big.pose, big.shape!.x, big.shape!.y), r: (big.shape!.w * zoomOf(big.pose)) / 2 };
  };
  const a = label(C.RECORD - 0.02);
  const b = label(C.RECORD);
  assert.ok(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) <= 4, `centres ${a.at} → ${b.at}`);
  assert.ok(Math.abs(a.r / b.r - 1) <= 0.03, `radii ${a.r.toFixed(1)} → ${b.r.toFixed(1)}`);
  assert.ok(Math.abs(recordAngle(C.RECORD - 0.02) - recordAngle(C.RECORD)) < 0.01, 'one turn function across the cut');
  const hex = (f: number) => glyphsIn(frameAt(f), K).filter((i) => i.atlas === 'mono')[0];
  const ha = hex(C.RECORD - 0.02);
  const hb = hex(C.RECORD);
  const pa = screenOf(ha.pose, ha.glyph!.x, ha.glyph!.y);
  const pb = screenOf(hb.pose, hb.glyph!.x, hb.glyph!.y);
  assert.ok(Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) <= 8, `the label's hex ${pa} → ${pb}`);
});

test('E6 hand-off: on club 4.1 − 1 the record is r 300 on screen with his face at its centre (the cherry’s spot)', () => {
  for (const f of [C.MATCH_CUP - 1, C.MATCH_CUP - 0.75]) {
    const draws = frameAt(f);
    const vinyl = shapesIn(draws, K).filter((i) => i.shape!.kind === 'ellipse' && i.shape!.w === i.shape!.h).sort((a, b) => b.shape!.w - a.shape!.w)[0];
    const r = (vinyl.shape!.w * zoomOf(vinyl.pose)) / 2;
    assert.ok(Math.abs(r - 300) <= 6, `${f}: r ${r.toFixed(1)}`);
    const face = glyphsIn(draws, AMBER).filter((i) => i.glyph!.ch !== 'ω').map((i) => screenOf(i.pose, i.glyph!.x, i.glyph!.y));
    const mid = [face.reduce((s, p) => s + p[0], 0) / face.length, face.reduce((s, p) => s + p[1], 0) / face.length];
    assert.ok(Math.hypot(mid[0], mid[1]) <= 6, `${f}: his face at ${mid}`);
  }
});

test('the head-bob nods on the music’s hook: bars 1–2 on HOOK[3] and HOOK[4] (sections/drop1.mjs), bar 3 on PEAK', () => {
  const starts = (row: readonly (readonly number[])[]) => row.map((n) => n[0]);
  assert.deepEqual(HOOK_NODS[0], starts(HOOK[3]));
  assert.deepEqual(HOOK_NODS[1], starts(HOOK[4]));
  assert.deepEqual(HOOK_NODS[2], [0, 1, 2, 4, 5, 6, 8, 11, 12]);
});

test('the shot camera never holds (≤ 12 still frames in a row) and every frame it moves > 20 px takes ≥ 32 sub-frames', () => {
  const corner = (a: ReturnType<typeof inkAAim>, s: [number, number]): [number, number] => {
    const c = Math.cos(-a.roll);
    const n = Math.sin(-a.roll);
    return [a.x + (c * s[0] - n * s[1]) / a.zoom, a.y + (n * s[0] + c * s[1]) / a.zoom];
  };
  const toScreen = (a: ReturnType<typeof inkAAim>, p: [number, number]): [number, number] => {
    const dx = p[0] - a.x;
    const dy = p[1] - a.y;
    return [a.zoom * (Math.cos(a.roll) * dx - Math.sin(a.roll) * dy), a.zoom * (Math.sin(a.roll) * dx + Math.cos(a.roll) * dy)];
  };
  let still = 0;
  for (let F = C.CLUB.from; F < C.MATCH_CUP - 1; F++) {
    const a = inkAAim(F);
    const b = inkAAim(F + 1);
    let speed = 0;
    for (const s of [[960, 540], [-960, 540], [960, -540], [-960, -540], [0, 0]] as [number, number][]) {
      const q = toScreen(b, corner(a, s));
      speed = Math.max(speed, Math.hypot(q[0] - s[0], q[1] - s[1]));
    }
    still = speed < 0.3 ? still + 1 : 0;
    assert.ok(still <= 12, `${F}: the camera has held for ${still} frames`);
    // The pull-back's snap (plan v07 §4 C1) falls between two frames (it starts half a frame before its kick): neither frame's shutter sees
    // it, so its jump is a cut, never a smear.
    if (speed > 20 && F !== C.PULL_BACK - 1) assert.ok(inkTemporal(F).samples >= 32, `${F}: ${speed.toFixed(0)} px a frame on ${inkTemporal(F).samples} sub-frames`);
  }
});

test('the print rides the camera: the comic pass’s dot screen is anchored to the shot camera (the frame centre prints the world point the camera aims at)', () => {
  for (const F of [C.DOT_INKS + 10, C.STOMP, C.HIGH_FIVE, C.FIST_BUMP, C.SWAP, C.RISE.from + 6]) {
    const look = (F < C.RECORD ? SPLASH : RECORD_PART).look(F);
    const a = inkAAim(F);
    assert.ok(look.comic && look.comic.screen, `${F}`);
    if (a.zoom < 5 / 16 || a.zoom > 2.2) continue;
    const p = planePoint([0, 0], look.comic.screen);
    assert.ok(Math.hypot(p[0] - a.x, p[1] - a.y) < 1e-6, `${F}: ${p} ≠ ${a.x}, ${a.y}`);
  }
});

test('bars 1–3 are pure: the page bake can take its panels (club 1.4, 2.2&, 2.3&, 3.3) and every instant draws the same list twice', () => {
  for (const f of [C.DISCO, C.INFECTIONS[0], C.TING, C.FLOWER, C.DIVE.from + 7.3]) {
    const a = JSON.stringify(frameAt(f));
    assert.equal(JSON.stringify(frameAt(f)), a, `${f}`);
    assert.ok(items(frameAt(f)).length > 50, `${f}: a panel worth baking`);
  }
});

test('the record: the cat’s inset smears back 1.5 turns on the scratch, then both inset and floor run forward at 0.8° a frame', () => {
  assert.ok(Math.abs(recordAngle(C.INSET + 6) - recordAngle(C.INSET) + 3 * Math.PI) < 1e-9, '1.5 turns back over the scratch');
  for (const f of [C.INSET + 8, C.RECORD, C.RECORD + 20]) assert.ok(Math.abs(recordAngle(f + 1) - recordAngle(f) - (0.8 * Math.PI) / 180) < 1e-9, `${f}`);
  // From the second kick of the record (plan v07 §4 C3, the DJ's nudge) it turns by beats: the same 19.2° a beat, ≈ 40 % of it on the
  // kick's own frame, ≈ 20 % on the next, a crawl between.
  const d = (f: number) => (recordAngle(f) - recordAngle(f - 1)) / ((0.8 * Math.PI) / 180) / 24;
  for (const k of C.KICKS.filter((f) => f > C.RECORD && f < C.MATCH_CUP)) {
    assert.ok(Math.abs((recordAngle(k + 24) - recordAngle(k)) / ((19.2 * Math.PI) / 180) - 1) < 1e-6, `${k}: a beat's turn`);
    assert.ok(d(k) > 0.35 && d(k) < 0.45 && d(k + 1) > 0.15 && d(k + 1) < 0.25, `${k}: the surge ${d(k).toFixed(2)}, ${d(k + 1).toFixed(2)}`);
    for (let t = 3; t < 23; t++) assert.ok(d(k + t) < 0.025, `${k}+${t}: the crawl ${d(k + t).toFixed(3)}`);
  }
  assert.ok(glyphsIn(frameAt(C.INSET + 4)).some((i) => i.glyph!.ch === '･'), 'the cat DJ peeks over the inset');
  assert.ok(shapesIn(frameAt(C.SCRATCH + 1), CYAN).length > 0, 'P2 stays behind the inset');
});

test('what appears on a drum is whole on its frame: no sub-frame of the drum frame misses it (the crowd, BOOM’s B, CLAP!, P1, P2, the lounge strip, the burst → splash swap)', () => {
  const allHave = (F: number, pick: (draws: InkDraw[]) => boolean, what: string) => {
    for (const f of instants(F)) assert.ok(pick(frameAt(f)), `${what}: missing at ${f} (frame ${F})`);
  };
  const glyph = (atlas: string, ch: string, color?: RGB) => (d: InkDraw[]) => glyphsIn(d, color).some((i) => i.atlas === atlas && i.glyph!.ch === ch);
  allHave(C.CROWD_UP, glyph('face', 'ω', AMBER), 'the crowd’s amber ω');
  allHave(C.STOMP, glyph('sfx', 'B', PAPER), 'BOOM’s B');
  allHave(C.DISCO, glyph('sfx', 'C', PINK), 'CLAP!');
  allHave(C.BANDS[0], (d) => p1Dots(d).length > 400, 'P1’s pink ground');
  allHave(C.BANDS[1], (d) => shapesIn(d, CYAN).some((i) => i.shape!.kind === 'rect' && i.shape!.w > 10000), 'P2’s cyan ground');
  allHave(C.FLAM, (d) => glyphsIn(d, PAPER).some((i) => i.glyph!.ch === '▽'), 'the guest in the lounge strip');
  for (const f of instants(C.PULL_BACK)) assert.ok(same(frameAt(f)[0].paper!.color, PAPER), `${f}: the swap to paper is whole on the pull-back`);
  for (const f of instants(C.PULL_BACK - 1)) assert.ok(same(frameAt(f)[0].paper!.color, VOID), `${f}: and not before`);
  for (const f of instants(C.PULL_BACK)) assert.ok(glyphsIn(frameAt(f), AMBER).some((i) => i.glyph!.ch === 'ヽ'), `${f}: ヽ(•ω•)ノ whole on the pull-back`);
});

test('the print keeps red only while the antivirus is in the picture (the lounge strip, the scan line): a pale pink or pink smeared over amber never prints red', () => {
  const hasRed = (F: number) => ((F < C.RECORD ? SPLASH : RECORD_PART).look(F).comic?.inks ?? [{ color: RED }]).some((i) => same(i.color, RED));
  for (const F of [C.DOT_INKS, C.DISCO, C.HIGH_FIVE, C.INFECTIONS[0], C.RECORD, C.SWAP, C.RISE.from + 10]) assert.equal(hasRed(F), false, `${F}`);
  for (const F of [C.FLAM, C.TING, C.FIST_BUMP, C.SCAN_SWEEP.from + 6]) assert.equal(hasRed(F), true, `${F}`);
  for (let F = C.CLUB.from; F < C.MATCH_CUP; F++) {
    const reds = items(frameAt(F)).some((i) => same((i.shape ?? i.glyph)!.color, RED));
    if (reds) assert.ok(hasRed(F), `${F}: red drawn but not printed`);
  }
});

test('a leap never doubles him: every sub-frame of a take-off or a landing frame draws one hero, and he leaves P1 from where his bounce had him', () => {
  for (const F of [C.LEAPS[0].from - 1, C.LEAPS[0].from, C.LEAPS[0].to, C.LEAPS[1].from - 1, C.LEAPS[1].from, C.LEAPS[1].to])
    for (const f of instants(F)) {
      const heroes = glyphsIn(frameAt(f), AMBER).filter((i) => i.glyph!.ch === '(');
      assert.equal(heroes.length, 1, `${f} (frame ${F}): ${heroes.length} heroes`);
    }
  const at = (f: number) => {
    const g = glyphsIn(frameAt(f), AMBER).find((i) => i.glyph!.ch === '(')!;
    return screenOf(g.pose, g.glyph!.x, g.glyph!.y);
  };
  const before = at(C.LEAPS[1].from - 1);
  const after = at(C.LEAPS[1].from);
  assert.ok(Math.abs(after[1] - before[1]) < 12, `take-off ${before} → ${after}`);
});

// ——— U3: the hands belong to their characters ——————————————————————————————————————————————————————————————————————————————————

test('U3, the high five: her own arm (from under her bracket) cocks back, slaps onto his raised ノ on the clap and recoils up; he rises into it and is still again before he leaps', () => {
  const at = (F: number) => highFiveAt(F, L)!;
  assert.equal(highFiveAt(C.HIGH_FIVE - 10, L), null, 'no arm before it comes out');
  const out = at(C.HIGH_FIVE - 9);
  assert.ok(Math.hypot(out.S[0] - out.bracket[0], out.S[1] - out.bracket[1]) < 0.35 * out.em, 'her shoulder is under her own bracket');
  const cock = at(C.HIGH_FIVE - 6);
  const slap = at(C.HIGH_FIVE);
  const back = at(C.HIGH_FIVE + 9);
  const gap = (p: { G: readonly number[]; HF: readonly number[] }) => Math.hypot(p.G[0] - p.HF[0], p.G[1] - p.HF[1]);
  assert.ok(gap(slap) < 0.12 * slap.em, `contact on the clap: the glove ${gap(slap).toFixed(0)} from his ノ`);
  assert.ok(gap(cock) > 0.6 * cock.em && gap(back) > 0.6 * back.em, 'away from his hand before (approach) and after (recoil)');
  assert.ok(cock.G[1] < cock.S[1] && back.G[1] < back.S[1], 'cocked up before the slap, raised after it (y down)');
  // The slap accelerates into the clap (I): every frame of it moves further than the one before.
  let last = 0;
  for (let F = C.HIGH_FIVE - 5; F <= C.HIGH_FIVE; F++) {
    const a = at(F - 1).G;
    const b = at(F).G;
    const step = Math.hypot(b[0] - a[0], b[1] - a[1]);
    assert.ok(step > last, `the slap at ${F}: ${step.toFixed(1)} after ${last.toFixed(1)}`);
    last = step;
  }
  assert.ok(at(C.HIGH_FIVE - 2).lean < 0, 'he rises into it');
  assert.equal(at(C.LEAPS[1].from - 1).lean, 0, 'and is back on his spot before he leaps (the take-off never jumps)');
});

// ——— Club round 1 (fixer 'a'): T5 the record, T6 P1, T7 the leaps' pan, T9 the rise, T10 trail / landing / ting, R6, R7 —————————————————

/** The hero's face on screen at instant f: the middle of his amber ( and ) (his fill; one of each per frame by the test above). */
function heroAt(f: number): [number, number] {
  const gs = glyphsIn(frameAt(f), AMBER);
  const a = gs.find((i) => i.glyph!.ch === '(')!;
  const b = gs.find((i) => i.glyph!.ch === ')')!;
  const p = screenOf(a.pose, a.glyph!.x, a.glyph!.y);
  const q = screenOf(b.pose, b.glyph!.x, b.glyph!.y);
  return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
}

test('T7, the leaps: the pan launches with him, so his screen x stays in the frame (±700 px) and never whips back against the leap (≤ 65 px a frame); the pan is settled a frame before the kick he lands on', () => {
  for (const k of [0, 1] as const) {
    const { from, to } = C.LEAPS[k];
    const x0 = heroAt(from - 1)[0];
    let prev = x0;
    let ahead = -Infinity;
    for (let F = from; F < to; F++) {
      const x = heroAt(F)[0];
      assert.ok(Math.abs(x) <= 700, `leap ${k + 1}, ${F}: his face at x ${x.toFixed(0)}`);
      assert.ok(x - prev >= -62, `leap ${k + 1}, ${F}: he slides back ${(prev - x).toFixed(0)} px against the leap`);
      // On the launch he never drops back: the pan never overtakes him.
      if (F - from <= 3) assert.ok(x - prev >= -20, `leap ${k + 1}, ${F}: the pan overtakes him (${(x - prev).toFixed(0)} px)`);
      ahead = Math.max(ahead, x - x0);
      prev = x;
    }
    // The second leap pulls him visibly ahead toward the next panel (the first one zooms out while he lands on P1's left third, so his face
    // holds its place on the launch and the page sweeps under him).
    // (Since plan v07 §4 C2 the second leap is a swish pan: the page streaks past under him in 3 frames, then he lands in a still panel; he
    // does not pull ahead of it.)
    if (k === 1) assert.ok(ahead > -80, `leap 2: he keeps his place through the swish (${ahead.toFixed(0)} px)`);
    // The pan: no motion before the launch, settled into the kick (the landing frame is photographed still: T10), then the 2 % overshoot.
    assert.equal(leapFollow(from, k), 0);
    assert.ok(Math.abs(leapFollow(to - 1, k) - 1) < 0.005 && leapFollow(to, k) === 1, `leap ${k + 1}: settled into the kick`);
    if (k === 0) assert.ok(leapFollow(to + 3, k) > 1.015, `leap ${k + 1}: the landing's overshoot`);
    // Leap 2 (plan v07 §4 C2): settled 3 frames before the kick (the page holds still under his landing), then the page steps on the flam.
    if (k === 1) {
      for (let F = to - 3; F <= C.FLAM; F++) assert.ok(Math.abs(leapFollow(F, k) - leapFollow(F - 1, k)) < 0.012, `leap 2: near still on ${F}`);
      const ax = (F: number) => inkAAim(F).x * inkAAim(F).zoom;
      assert.ok(ax(C.FLAM) - ax(C.FLAM - 1) > 15, `the page steps on the flam: ${(ax(C.FLAM) - ax(C.FLAM - 1)).toFixed(1)} px`);
    }
  }
});

test('T10, the landing frames: the camera is still on the kick (≤ 15 px a frame at the frame corners on 2.1 and 2.3), so the keylines print solid', () => {
  const toScreen = (a: ReturnType<typeof inkAAim>, p: [number, number]): [number, number] => {
    const dx = p[0] - a.x;
    const dy = p[1] - a.y;
    return [a.zoom * (Math.cos(a.roll) * dx - Math.sin(a.roll) * dy), a.zoom * (Math.sin(a.roll) * dx + Math.cos(a.roll) * dy)];
  };
  const back = (a: ReturnType<typeof inkAAim>, s: [number, number]): [number, number] => {
    const c = Math.cos(-a.roll);
    const n = Math.sin(-a.roll);
    return [a.x + (c * s[0] - n * s[1]) / a.zoom, a.y + (n * s[0] + c * s[1]) / a.zoom];
  };
  for (const F of [C.LEAPS[0].to, C.LEAPS[1].to]) {
    const a = inkAAim(F - 0.25);
    const b = inkAAim(F + 0.25);
    let speed = 0;
    for (const s of [[960, 540], [-960, 540], [960, -540], [-960, -540]] as [number, number][]) {
      const q = toScreen(b, back(a, s));
      speed = Math.max(speed, 2 * Math.hypot(q[0] - s[0], q[1] - s[1]));
    }
    assert.ok(speed <= 15, `${F}: ${speed.toFixed(1)} px a frame on the kick`);
  }
});

test('R6, the leaping face: photographed by the leap’s own short shutter — a 2–30 px streak across the frame’s sub-frames, never held as a sharp cut-out', () => {
  for (const k of [0, 1] as const)
    for (const F of [C.LEAPS[k].from + 1, C.LEAPS[k].from + 2, C.LEAPS[k].from + 3]) {
      const fs = instants(F);
      const a = heroAt(fs[0]);
      const b = heroAt(fs[fs.length - 1]);
      const streak = Math.hypot(b[0] - a[0], b[1] - a[1]);
      assert.ok(streak >= 2 && streak <= 30, `leap ${k + 1}, ${F}: a ${streak.toFixed(1)} px streak`);
    }
});

test('T10, the trail: a light wall (≥ 12 px cyan core on K edges), gone four frames after each landing', () => {
  // The trail's capsules (the martini icon in the lounge strip is cyan capsules too, under 6 px).
  const cyanSegs = (f: number) => shapesIn(frameAt(f), CYAN).filter((i) => i.shape!.kind === 'segment' && i.shape!.h * zoomOf(i.pose) > 8);
  for (const k of [0, 1] as const) {
    const F = C.LEAPS[k].from + 6;
    const core = cyanSegs(F).map((i) => i.shape!.h * zoomOf(i.pose));
    assert.ok(core.length > 0 && Math.min(...core) >= 12, `leap ${k + 1}: core ${Math.min(...core).toFixed(1)} px`);
    const edge = shapesIn(frameAt(F), K).filter((i) => i.shape!.kind === 'segment').map((i) => i.shape!.h * zoomOf(i.pose));
    assert.ok(Math.max(...edge) >= Math.min(...core) + 8, `leap ${k + 1}: K edges`);
    for (const f of instants(C.LEAPS[k].to)) assert.ok(cyanSegs(f).length > 0, `leap ${k + 1}: whole on the landing frame (${f})`);
    for (const f of instants(C.LEAPS[k].to + 4)) assert.equal(cyanSegs(f).length, 0, `leap ${k + 1}: gone by landing + 4 (${f})`);
  }
});

test('T10, the ting: a RED ✦ Ø ≥ 140 on the guest’s shades with red focus lines, and the camera nudges ≥ 30 px his way', () => {
  const reds = items(frameAt(C.TING)).filter((i) => i.shape && same(i.shape.color, RED));
  const ells = reds.filter((i) => i.shape!.kind === 'ellipse');
  const pts = ells.map((i) => screenOf(i.pose, i.shape!.x, i.shape!.y));
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const reach = ells.map((i, n) => Math.hypot(pts[n][0] - cx, pts[n][1] - cy) + (Math.max(i.shape!.w, i.shape!.h) / 2) * zoomOf(i.pose));
  assert.ok(Math.max(...reach) >= 66, `the ✦ reaches ${Math.max(...reach).toFixed(0)} px from its centre`);
  assert.ok(reds.filter((i) => i.shape!.kind === 'segment').length >= 8, 'red focus lines round it');
  // A page point far right (the guest's side) moves left on screen by the nudge, beyond the P2 drift (1.2 px a frame).
  const spot = (F: number): number => {
    const a = inkAAim(F);
    return a.zoom * Math.cos(a.roll) * (5000 - a.x);
  };
  const nudge = spot(C.TING - 1) - spot(C.TING + 5) - 6 * 1.2;
  assert.ok(nudge >= 30, `nudge ${nudge.toFixed(1)} px`);
  const after = spot(C.TING - 1) - spot(C.DIVE.from - 1) - (C.DIVE.from - C.TING) * 1.2;
  assert.ok(Math.abs(after) < 3, `and back by the dive (${after.toFixed(1)} px)`);
});

test('T6, R2-5, P1 is Lichtenstein: round Ben-Day dots on a 45° lattice ≈ 40 px apart, r ≈ 0.41 of the pitch (≥ 40 % pink, clear gaps: they never touch), riding the page and drawn by the output frame’s camera (every sub-frame prints the same dots); her outlines 9 px solid; her ◕ eyes dark with a paper highlight', () => {
  for (const F of [C.BANDS[0], C.TEAR, C.HIGH_FIVE, C.INFECTIONS[0], C.INFECTIONS[0] + 3]) {
    const fs = instants(F);
    const key = (f: number) => {
      const pts = p1Dots(frameAt(f)).map((i) => [...screenOf(i.pose, i.shape!.x, i.shape!.y), i.shape!.w * zoomOf(i.pose)]);
      return JSON.stringify(pts.map((q) => q.map((v) => Math.round(v * 10) / 10)).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    };
    const k0 = key(fs[0]);
    for (const f of fs) assert.equal(key(f), k0, `${f} (frame ${F}): the dots move inside the shutter`);
    const dots = p1Dots(frameAt(F));
    assert.ok(dots.length > 400, `${F}: ${dots.length} dots`);
    const pts = dots.map((i) => screenOf(i.pose, i.shape!.x, i.shape!.y));
    // Near the frame's centre: the nearest neighbour gives the pitch and the lattice's angle.
    const mid = pts.map((p, n) => ({ p, n })).filter(({ p }) => Math.abs(p[0]) < 400 && Math.abs(p[1]) < 300);
    assert.ok(mid.length > 20, `${F}: dots in the middle of the frame`);
    for (const { p, n } of mid.slice(0, 20)) {
      let best = Infinity;
      let ang = 0;
      pts.forEach((q, m) => {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (m !== n && d < best) {
          best = d;
          ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        }
      });
      assert.ok(best >= 32 && best <= 46, `${F}: pitch ${best.toFixed(1)} px`);
      const off = ((((ang * 180) / Math.PI - 45) % 90) + 90) % 90;
      assert.ok(Math.min(off, 90 - off) < 2, `${F}: lattice at ${((ang * 180) / Math.PI).toFixed(1)}°`);
      const r = (dots[n].shape!.w / 2) * zoomOf(dots[n].pose);
      assert.ok(r / best >= 0.36 && r / best <= 0.47, `${F}: r ${r.toFixed(1)} px on a ${best.toFixed(1)} px pitch (clear gaps under 0.5)`);
      assert.ok((Math.PI * r * r) / (best * best) >= 0.4, `${F}: ${((100 * Math.PI * r * r) / (best * best)).toFixed(0)} % pink`);
    }
    // On the page: a frame later the same dots are where the page took them (world places shared).
    const world = (g: number) => new Set(p1Dots(frameAt(g)).map((i) => `${Math.round(i.shape!.x)},${Math.round(i.shape!.y)}`));
    const now = world(F);
    const shared = [...world(F + 2)].filter((w) => now.has(w)).length;
    // (Leap 2's take-off frame: the swish pan of plan v07 §4 C2 moves the page most of a frame-width in its first frame — no dots to share.)
    if (F !== C.LEAPS[1].from) assert.ok(shared > 0.5 * now.size, `${F}: ${shared} of ${now.size} dots stay on the page`);
    const draws = frameAt(F);
    const k = items(draws).filter((i) => i.glyph && same(i.glyph.color, K) && ['✿', '︿'].includes(i.glyph.ch) && i.glyph.outline);
    assert.ok(k.length > 0, `${F}: her keyline`);
    for (const i of k) assert.ok(i.glyph!.outline! * i.glyph!.size * zoomOf(i.pose) >= 8.5, `${F}: her keyline ${(i.glyph!.outline! * i.glyph!.size * zoomOf(i.pose)).toFixed(1)} px`);
    // Hers are the last six (a friend in the splash crowd, drawn before P1, has ◕ eyes too).
    const eyes = items(draws).filter((i) => i.glyph?.ch === '◕').slice(-6);
    assert.equal(eyes.filter((e) => same(e.glyph!.color, PAPER)).length, 2, `${F}: two ◕, each a paper rim, a K keyline and a K fill`);
    for (const e of [eyes[2], eyes[5]]) {
      assert.ok(same(e.glyph!.color, K), `${F}: ◕ filled K`);
      const at = screenOf(e.pose, e.glyph!.x, e.glyph!.y);
      const lit = shapesIn(draws, PAPER).some((i) => {
        const p = screenOf(i.pose, i.shape!.x, i.shape!.y);
        return i.shape!.kind === 'ellipse' && Math.hypot(p[0] - at[0], p[1] - at[1]) < 2;
      });
      assert.ok(lit, `${F}: a paper highlight under the ◕`);
    }
  }
});

test('R7, the slap’s burst: whole on the clap frame (≥ 0.8 of its full size on every sub-frame of 2.2)', () => {
  const v = highFiveAt(C.HIGH_FIVE, L)!;
  const dir = Math.atan2(v.G[1] - v.S[1], v.G[0] - v.S[0]);
  const c: [number, number] = [v.G[0] + Math.cos(dir) * 0.22 * v.em, -(v.G[1] + Math.sin(dir) * 0.22 * v.em)];
  const burstR = (f: number): number => {
    let r = 0;
    for (const i of shapesIn(frameAt(f), PAPER)) {
      if (i.shape!.kind !== 'ellipse') continue;
      const d = Math.hypot(i.shape!.x - c[0], i.shape!.y - c[1]);
      if (d < 120) r = Math.max(r, d + Math.max(i.shape!.w, i.shape!.h) / 2);
    }
    return r;
  };
  const full = burstR(C.HIGH_FIVE + 5);
  assert.ok(full > 100, `the burst at full size (${full.toFixed(0)})`);
  for (const f of instants(C.HIGH_FIVE)) assert.ok(burstR(f) >= 0.8 * full, `${f}: the burst at ${(burstR(f) / full).toFixed(2)} of its size`);
});

test('T5, the record prints clean: 0.25 shutter from the landing on, the chorus lines held at the output frame through every sub-frame, the sectors’ dots on fixed screens riding the record, the grooves dark NIGHT, the plates slipping ≤ 1 px', () => {
  for (let F = C.RECORD + 1; F < C.MATCH_CUP; F++) assert.ok(RECORD_PART.temporal(F).shutter <= 0.25, `${F}: shutter ${RECORD_PART.temporal(F).shutter}`);
  const dancers = (f: number) =>
    glyphsIn(RECORD_PART.frame(f, L), PAPER)
      .filter((i) => ['∩', '✿', '‘'].includes(i.glyph!.ch))
      .map((i) => screenOf(i.pose, i.glyph!.x, i.glyph!.y));
  for (const F of [C.BERKELEY_STEPS[0] + 1, C.SWAP + 1, C.FLOWER + 2, C.BERKELEY_STEPS[2] + 1, C.RISE.from + 8]) {
    const fs = instants(F);
    const a = dancers(fs[0]);
    const b = dancers(fs[fs.length - 1]);
    assert.ok(a.length > 20 && a.length === b.length, `${F}: ${a.length} dancers`);
    const worst = Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1])));
    assert.ok(worst < 0.75, `${F}: a dancer moves ${worst.toFixed(2)} px inside the shutter`);
  }
  for (const F of [C.SWAP, C.FLOWER, C.RISE.from]) {
    const draws = RECORD_PART.frame(F, L);
    const sectors = polysIn(draws).filter((p) => p.poly.fixed && p.anchor && (same(p.poly.color, CYAN) || same(p.poly.color, PINK)));
    assert.ok(sectors.length >= 6, `${F}: ${sectors.length} lit sectors`);
    // The plane is the record, turned as on the output frame: record point (1000, 0) lands where the record's turn puts it.
    const ra = recordAngle(F);
    const q = anchorScreen(sectors[0].anchor!, [1000, 0]);
    const s = screenOf(sectors[0].pose, 1000 * Math.cos(ra), -1000 * Math.sin(ra));
    assert.ok(Math.hypot(q[0] - s[0], q[1] - s[1]) < 0.5, `${F}: the dots ride the record (${q} vs ${s})`);
    const grooves = shapesIn(draws, NIGHT).filter((i) => i.shape!.kind === 'ring');
    assert.ok(grooves.length >= 30, `${F}: ${grooves.length} grooves`);
    for (const g of grooves) assert.ok((g.shape!.alpha ?? 1) === 1 && g.shape!.r! * zoomOf(g.pose) >= 4, `${F}: a groove ${(g.shape!.r! * zoomOf(g.pose)).toFixed(1)} px at alpha ${g.shape!.alpha ?? 1}`);
  }
  for (let F = C.RECORD; F < C.MATCH_CUP; F++) {
    const o = recordPlates(F).c;
    assert.ok(Math.hypot(o[0] - PLATE_REST[0], o[1] - PLATE_REST[1]) <= 1, `${F}: plates ${o}`);
  }
  const slip = recordPlates(C.SWAP).c;
  assert.ok(Math.hypot(slip[0] - PLATE_REST[0], slip[1] - PLATE_REST[1]) > 0.5, 'the clap still slips');
  assert.deepEqual(RECORD_PART.look(C.SWAP).comic?.offsets?.c, slip);
});

test('T9, the rise: a screen-fixed pink Ben-Day field (24 px, never under the moiré guard) once the record’s edge is in the frame, and a dark disc into the match cut', () => {
  for (let F = C.RISE.from; F < C.MATCH_CUP; F++) {
    const z = inkAAim(F).zoom;
    const field = polysIn(RECORD_PART.frame(F, L), PINK).filter((p) => p.poly.fixed && !p.anchor && p.poly.screen === 24);
    if (1400 * z < 1140) {
      assert.equal(field.length, 1, `${F}: the field`);
      assert.ok((field[0].poly.tint ?? 1) <= 0.4, `${F}: round dots with gaps`);
    } else assert.equal(field.length, 0, `${F}: the record still fills the frame`);
  }
  const end = RECORD_PART.frame(C.MATCH_CUP - 1, L);
  assert.equal(shapesIn(end, NIGHT).filter((i) => i.shape!.kind === 'ring' && (i.shape!.alpha ?? 1) > 0.01).length, 0, 'no crowd of rings to print grey');
  for (const p of polysIn(end).filter((q) => q.anchor && q.poly.fixed)) assert.ok((p.poly.tint ?? 1) <= 0.25, `the sectors thinned: ${p.poly.tint}`);
});

test('T5, the record’s claps: his hop and turn on the label are keyed to the clap’s own frame, so no sub-frame of 3.2 or 3.4 still shows the last turn (no double print)', () => {
  for (const F of [C.SWAP, C.RISE.from]) {
    const rots = instants(F).map((f) => glyphsIn(RECORD_PART.frame(f, L), AMBER).find((i) => i.glyph!.ch === '(')!.glyph!.rot ?? 0);
    const spread = Math.max(...rots) - Math.min(...rots);
    assert.ok(spread < (3 * Math.PI) / 180, `${F}: his turn spreads ${((spread * 180) / Math.PI).toFixed(1)}° inside the shutter`);
  }
});

test('the party monitor reads over the record: in window A the record prints a solid K plate under the readout box (its geometry, faded with it); none outside', async () => {
  const { inkHudContent } = await import('../src/shots/clubInkReadout.ts');
  const { SCREEN } = await import('../src/shots/clubInkKit.ts');
  const plateOf = (f: number): Shape | undefined =>
    frameAt(f)
      .filter((d) => d.pose === SCREEN)
      .flatMap((d) => d.content.under)
      .find((s) => s.kind === 'rect' && s.color === K && s.w > 500 && s.x < 0 && s.y < 0);
  for (let f = C.READOUT_A.from; f < C.READOUT_A.to; f++) {
    const box = inkHudContent(f, L.advance.readout).under[0];
    const plate = plateOf(f);
    if ((box?.alpha ?? 0) <= 0.001) continue;
    assert.ok(plate, `${f}: a plate under the box`);
    assert.deepEqual([plate.x, plate.y, plate.w, plate.h], [box.x, box.y, box.w, box.h], `${f}`);
    if (f >= C.READOUT_A.from + 2 && f < C.READOUT_A.to - 4) assert.equal(plate.alpha ?? 1, 1, `${f}: solid while the box is fully up`);
  }
  for (const f of [C.RECORD, C.READOUT_A.from - 1]) assert.equal(plateOf(f), undefined, `${f}`);
});

// ——— Round 2 (R2-3, A1; U3: no blur smear on a face): the characters are the output frame's ——————————————————————————————————————————

/** Screen places (and screen sizes) of the glyphs `pick` takes on output frame F, per sub-frame: on the frame (± 1100 × 700) only. */
function placesPerInstant(F: number, pick: (i: Item) => boolean): [number, number, number][][] {
  return instants(F).map((f) =>
    items(frameAt(f))
      .filter((i) => i.glyph && pick(i))
      .map((i): [number, number, number] => [...screenOf(i.pose, i.glyph!.x, i.glyph!.y), i.glyph!.size * zoomOf(i.pose)])
      .filter(([x, y]) => Math.abs(x) < 1100 && Math.abs(y) < 700)
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]),
  );
}
/** How far apart the sub-frames of F print what `pick` takes (px): 0 when it is drawn by the output frame's camera. */
function smearOf(F: number, pick: (i: Item) => boolean, what: string): number {
  const sets = placesPerInstant(F, pick);
  assert.ok(sets[0].length > 0, `${what}: nothing on frame ${F}`);
  let worst = 0;
  for (const s of sets) {
    assert.equal(s.length, sets[0].length, `${what}, frame ${F}: ${s.length} vs ${sets[0].length} glyphs across the shutter`);
    s.forEach((p, n) => (worst = Math.max(worst, Math.hypot(p[0] - sets[0][n][0], p[1] - sets[0][n][1]), Math.abs(p[2] - sets[0][n][2]))));
  }
  return worst;
}

test('R2-3, the pull-back: he is whole on every frame of it (one place through the shutter), shot at the leaps’ short shutter so only the focus lines and the floor carry the move', () => {
  const his = (i: Item) => same(i.glyph!.color, AMBER) && ['(', 'ω', 'ヽ', 'ノ'].includes(i.glyph!.ch) && i.glyph!.size * zoomOf(i.pose) > 150;
  for (let F = C.PULL_BACK; F <= C.PULL_BACK + 6; F++) {
    const t = inkTemporal(F);
    assert.ok(t.shutter <= 0.15 && t.samples >= 32, `${F}: ${t.samples} @ ${t.shutter}`);
    const s = smearOf(F, his, 'his face');
    assert.ok(s < 0.5, `${F}: his face moves ${s.toFixed(2)} px inside the shutter`);
  }
  // The cheer's bounce height switches on the output frame, not inside a frame's shutter (no double print on +8 and on the stomp).
  for (const F of [C.PULL_BACK + 8, C.STOMP]) assert.ok(smearOf(F, his, 'his face') < 0.5, `${F}`);
});

test('A1, the infection’s payoff and the cover crowd: her (◕ω◕✿) and every crowd face are whole on each frame of the leaps and of their pop (the pan carries the page, not their faces)', () => {
  const hers = (i: Item) => (i.glyph!.ch === '✿' && same(i.glyph!.color, PAPER)) || (i.glyph!.ch === '◕' && same(i.glyph!.color, K));
  for (let F = C.INFECTIONS[0]; F <= C.INFECTIONS[0] + 5; F++) {
    if (placesPerInstant(F, hers)[0].length === 0) continue;
    const s = smearOf(F, hers, 'her face');
    assert.ok(s < 0.5, `${F}: her face moves ${s.toFixed(2)} px inside the shutter`);
  }
  assert.ok(placesPerInstant(C.INFECTIONS[0] + 1, hers)[0].length >= 3, 'she is still in the frame as leap 2 takes off');
  const crowd = (i: Item) => i.glyph!.ch === 'ω' && same(i.glyph!.color, AMBER) && i.glyph!.size * zoomOf(i.pose) < 150;
  for (const F of [C.CROWD_UP + 1, C.CROWD_UP + 4, C.CROWD_UP + 9, C.STOMP, C.LEAPS[0].from, C.LEAPS[0].from + 1, C.LEAPS[0].from + 2, C.LEAPS[0].from + 3, C.LEAPS[0].from + 4]) {
    const s = smearOf(F, crowd, 'the crowd');
    assert.ok(s < 0.5, `${F}: the crowd moves ${s.toFixed(2)} px inside the shutter`);
  }
});

test('R2-3, the dive: his face on the label (and the faces of P2 and the lounge) are whole on every frame into the record, and the landing frame prints him once', () => {
  const heroes = (i: Item) => same(i.glyph!.color, AMBER) && i.glyph!.ch === '(';
  for (let F = C.DIVE.to - 6; F <= C.RECORD; F++) {
    const s = smearOf(F, heroes, 'his face');
    assert.ok(s < 1.5, `${F}: his face moves ${s.toFixed(2)} px inside the shutter`);
  }
  const faces = (i: Item) => ['ò', '▽', '･'].includes(i.glyph!.ch) && same(i.glyph!.color, PAPER);
  for (const F of [C.DIVE.from + 2, C.DIVE.from + 5, C.DIVE.from + 8]) {
    const s = smearOf(F, faces, 'the flexer, the guest and the cat');
    assert.ok(s < 0.5, `${F}: their faces move ${s.toFixed(2)} px inside the shutter`);
  }
});
