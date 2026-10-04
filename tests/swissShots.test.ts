// The Swiss part's shots S05 (the lens), S06 (the split) and S07a (the glass, its first 72 frames v04's), and the part's sampling,
// segments and look. S07B (the scan) is tests/swissScan.test.ts; S08 (the infection) tests/swissInfect.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROTAGONIST, SHUT, faceText, faceWidth, layoutFace } from '../src/actors/cast.ts';
import { ARCS, BASS_PIECES, BUILD_THREADS, type BuildThreads, DISC as LENS, GLASS_TYPE, LABELS, REACQUIRE_TICKS, S05_FROM, SWISS_SMALL_PRINT } from '../src/content/build.ts';
import { S06_HOSTS } from '../src/content/castBuild.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import {
  ARC_BLOWOUT,
  ARC_PRINT,
  ARC_STEPS,
  DISC_LAND,
  FLIP,
  GLASS_TURN,
  HIT3,
  IRIS,
  LENS_TRACK,
  PIECES,
  PULL,
  RED_CELL,
  REACQUIRE,
  RETURN,
  ROW_RULE,
  RULES,
  S05_BLINK,
  S05_BLINK_V04,
  S06_HOP,
  SIG_SWISS,
  SLIDE,
  SPLITS,
  SWEEPS,
} from '../src/score/build.ts';
import { partBar, partEnd, partFrame } from '../src/score/film.ts';
import { TOTAL_BARS } from '../src/score/tempo.ts';
import {
  ARC_SEGMENTS,
  FRONT,
  HERO_LEAF,
  PEN,
  PIECE_FLIGHT,
  ROW,
  S06_CAST,
  type SwissLayout,
  V04_DISC,
  ZOOM,
  cellCentre,
  glassPose,
  lensAt,
  levelAt,
  mouthAt,
  rightEye,
  rowX,
  swissFrame,
  swissLookAt,
  swissSegment,
  swissTemporal,
  truck,
} from '../src/shots/swiss.ts';
import { INK, PAPER, SWISS_RED } from '../src/worlds/swiss.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, onShutter, poseMoved } from './lib/energyAudit.ts';

const adv = (ch: string) => (ch === ' ' ? 0.28 : '()'.includes(ch) ? 0.36 : 0.62);
const L: SwissLayout = { jp: adv, display: adv, text: adv };
const V04: BuildThreads = { ...BUILD_THREADS, lens: false, reacquire: false, slugs: false };
const same = (a: readonly number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const discs = (s: readonly Shape[]) => s.filter((x) => x.kind === 'ellipse' && same(x.color, SWISS_RED));
/** Faces in a list of glyphs, split where the gap between neighbours is wider than a face's own spacing. */
function faces(g: readonly Glyph[]): Glyph[][] {
  const out: Glyph[][] = [];
  for (const x of g) {
    const last = out[out.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && Math.abs(prev.y - x.y) < 1e-9 && prev.size === x.size && x.x > prev.x && x.x - prev.x < 1.2 * x.size) last.push(x);
    else out.push([x]);
  }
  return out;
}
const text = (p: readonly Glyph[]) => p.map((x) => x.ch).join('');
/** The Swiss part's bar `bar` (1-based), plus `beat` beats (0-based). */
const swiss = (bar: number, beat = 0): number => partFrame('swiss', bar, beat);
/** A frame in each level of S06's grid, after its split has settled. */
const S06_SAMPLES = [SPLITS[0] + 20, SPLITS[1] + 16, SPLITS[2] + 17, SPLITS[3] + 18];
/** Screen position of world point (x, y) through the frame's camera. */
const onScreen = (f: number, x: number, y: number, threads = BUILD_THREADS): [number, number] => {
  const c = swissFrame(f, L, threads).camera;
  const zoom = FRONT / c.position[2];
  return [(x - c.target[0]) * zoom, (y - c.target[1]) * zoom];
};

// ——— S05: the lens ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('swiss 1.1 is full Swiss red: the T1 disc still covers the frame through its whole shutter, with nothing over it (lens on and off)', () => {
  for (const threads of [BUILD_THREADS, V04]) {
    for (const frame of [swiss(1), swiss(1) + 0.25]) {
      const f = swissFrame(frame, L, threads);
      const [d] = discs(f.world.under);
      const c = f.camera.target;
      const zoom = FRONT / f.camera.position[2];
      const far = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => Math.hypot(c[0] + (sx * 960) / zoom - d.x, c[1] + (sy * 540) / zoom - d.y)));
      assert.ok(d.w / 2 >= far, 'a red disc covers every corner of the view');
      assert.equal(f.world.under.length, 1);
      assert.equal(f.world.glyphs.jp.length + f.overlay.glyphs.display.length + f.overlay.glyphs.text.length + (f.pieces?.list.length ?? 0), 0);
    }
  }
});

test('E5b: T1’s red contracts into the lens, landing at (150, 30), r 300 — 142 px from the centre of the frame, within the 155 px budget', () => {
  const d = lensAt(DISC_LAND.from + 20.5, L);
  assert.ok(Math.abs(d.x - LENS.x) < 1e-6 && Math.abs(d.y - LENS.y) < 1e-6 && Math.abs(d.r - LENS.r) < 1);
  // On the camera of the downbeat (S05_FROM) it lands at (122, 73).
  const [sx, sy] = [(LENS.x - S05_FROM.x) * S05_FROM.zoom, (LENS.y - S05_FROM.y) * S05_FROM.zoom];
  assert.ok(Math.abs(sx - 122) < 0.5 && Math.abs(sy - 73.2) < 0.5 && Math.hypot(sx, sy) < 155);
  const [lx, ly] = onScreen(DISC_LAND.to, d.x, d.y);
  assert.ok(Math.hypot(lx, ly) < 155, `landed ${Math.hypot(lx, ly).toFixed(0)} px from the centre`);
  const early = lensAt(DISC_LAND.from + 3.5, L);
  assert.ok(Math.hypot(early.x, early.y) > 0.6 * Math.hypot(LENS.x, LENS.y), 'most of the way within 3 frames');
});

test('the lens tracks him on 1.4: it slides onto his right eye (the screen-right •, the eye T1 entered) and stays on it', () => {
  const [ex, ey] = rightEye(L);
  const eye = layoutFace(PROTAGONIST, L.jp)[3];
  assert.equal(eye.role, 'eye');
  assert.ok(eye.dx > 0, 'the screen-right eye');
  assert.ok(Math.hypot(lensAt(LENS_TRACK - 0.01, L).x - LENS.x, lensAt(LENS_TRACK - 0.01, L).y - LENS.y) < 1e-6, 'still until 1.4');
  for (const f of [LENS_TRACK + 20, swiss(2) - 1]) {
    const d = lensAt(f, L);
    assert.ok(Math.hypot(d.x - ex, d.y - ey) < 1, `on his eye at ${f}`);
  }
  const p = swissFrame(LENS_TRACK + 20, L).pieces!;
  assert.deepEqual([p.knock!.x, p.knock!.y], [lensAt(LENS_TRACK + 20, L).x, lensAt(LENS_TRACK + 20, L).y], 'he knocks out to paper where the lens is under him');
});

test('the arcs: 6 rings of 4 + k segments fanning only over −35° … +150°, so the lower-left (his) stays clear', () => {
  assert.equal(ARC_SEGMENTS.length, ARCS.radii.length);
  ARC_SEGMENTS.forEach((segs, k) => {
    assert.equal(segs.length, 4 + k);
    assert.ok(Math.abs(segs[0][0] - ARCS.fanDeg[0]) < 1e-9 && Math.abs(segs[segs.length - 1][1] - ARCS.fanDeg[1]) < 1e-9, `ring ${k} spans the fan`);
    for (let i = 1; i < segs.length; i++) {
      const gap = segs[i][0] - segs[i - 1][1];
      assert.ok(gap >= ARCS.gapDeg[0] - 1e-9 && gap <= ARCS.gapDeg[1] + 1e-9, `ring ${k} gap ${gap}`);
    }
  });
  const arcRects = (f: number) => swissFrame(f, L).world.under.filter((s) => s.kind === 'rect' && s.rot !== undefined);
  const c = { x: LENS.x, y: LENS.y };
  for (const f of [ARC_PRINT[5] + 4, ARC_STEPS[0] + 3, ARC_STEPS[1] + 12]) {
    const r = arcRects(f);
    assert.ok(r.length > 100, `${r.length} arc pieces at ${f}`);
    for (const s of r) {
      const a = (Math.atan2(s.y - c.y, s.x - c.x) * 180) / Math.PI;
      assert.ok(a > ARCS.fanDeg[0] - ARCS.stepDeg - 1 && a < ARCS.fanDeg[1] + ARCS.stepDeg + 1, `an arc at ${a.toFixed(0)}° at ${f}`);
    }
  }
});

test('the arcs print outward ring by ring from 482, step ±11° on the kicks of 1.2 and 1.3 (alternate rings opposite), tighten to 92 % on 1.4 and blow out by 582', () => {
  const rings = (f: number) => new Set(swissFrame(f, L).world.under.filter((s) => s.kind === 'rect' && s.rot !== undefined).map((s) => s.h)).size;
  assert.equal(rings(ARC_PRINT[0] - 0.01), 0);
  for (let k = 0; k < 6; k++) assert.equal(rings(ARC_PRINT[k] + 0.5), k + 1, `ring ${k} prints on ${ARC_PRINT[k]}`);
  // The first segment's start angle of rings 0 and 1 after the first step: opposite ways, 11°.
  const start = (f: number, k: number) => {
    const s = swissFrame(f, L).world.under.filter((x) => x.kind === 'rect' && x.h === ARCS.widths[k]);
    const a = s.map((x) => (Math.atan2(x.y - LENS.y, x.x - LENS.x) * 180) / Math.PI);
    return Math.min(...a);
  };
  const turn0 = start(ARC_STEPS[0] + 14, 0) - start(ARC_STEPS[0] - 1, 0);
  const turn1 = start(ARC_STEPS[0] + 14, 1) - start(ARC_STEPS[0] - 1, 1);
  assert.ok(Math.abs(turn0 - 11) < 1 && Math.abs(turn1 + 11) < 1, `${turn0} ${turn1}`);
  const radius = (f: number) => {
    const d = lensAt(f, L);
    const s = swissFrame(f, L).world.under.filter((x) => x.kind === 'rect' && x.h === ARCS.widths[0]);
    return Math.hypot(s[0].x - d.x, s[0].y - d.y);
  };
  assert.ok(Math.abs(radius(LENS_TRACK + 23) / radius(LENS_TRACK - 2) - ARCS.tighten) < 0.012, 'tightened to 92 %');
  assert.equal(swissFrame(ARC_BLOWOUT.to, L).world.under.filter((s) => s.kind === 'rect' && s.rot !== undefined).length, 0, 'blown out');
});

test('Saul Bass’s cut paper: five pieces, each an impact from its side landing exactly on its eighth, in its place on the row', () => {
  const parts = layoutFace(PROTAGONIST, L.jp);
  assert.deepEqual([...PIECES], [swiss(1, 1), swiss(1, 1.5), swiss(1, 2), swiss(1, 2.5), swiss(1, 3)]);
  BASS_PIECES.forEach((p, i) => {
    const at = PIECES[i];
    const piece = (f: number) => swissFrame(f, L).pieces!.list.find((x) => x.seed === i + 1);
    assert.equal(piece(at - PIECE_FLIGHT.lead - 0.01), undefined, `${p.ch} not yet`);
    const landed = piece(at)!;
    assert.equal(landed.ch, p.ch);
    assert.ok(Math.abs(landed.x - (rowX(L) + parts[i].dx * ROW.size)) < 1e-9 && Math.abs(landed.y - ROW.y) < 1e-9 && landed.rot === 0, `${p.ch} crisp in place on ${at}`);
    const before = piece(at - 5)!;
    const from = { left: [-1, 0], top: [0, 1], bottom: [0, -1], right: [1, 0] }[p.from];
    assert.ok((before.x - landed.x) * from[0] + (before.y - landed.y) * from[1] > 100, `${p.ch} comes from the ${p.from}`);
  });
  const all = swissFrame(swiss(2) - 1, L).pieces!.list;
  assert.equal(all.map((x) => x.ch).join(''), faceText(PROTAGONIST), 'he is whole by 1.4');
});

test('the pieces jitter on twos while they move (one draw for every sub-frame of an output frame) and never after they land', () => {
  const at = PIECES[2];
  const p = (f: number) => swissFrame(f, L).pieces!.list.find((x) => x.seed === 3)!;
  assert.equal(p(at - 6.25).rot, p(at - 5.75).rot, 'the sub-frames of one output frame share a draw');
  assert.notEqual(p(at - 7).rot, p(at - 5).rot, 're-rolled every second frame');
  assert.ok(Math.abs(p(at - 6).rot) <= (Math.PI / 180) * 1 + 1e-12);
  for (let f = at; f < at + 30; f += 0.5) assert.equal(p(f).rot, 0);
});

test('he blinks on the last eighth (his eyes squash shut), with the lens; v04’s S05 (lens off) slides him in on 1.3 and blinks on 1.4', () => {
  const eyes = (f: number) => swissFrame(f, L).pieces!.list.filter((x) => x.ch === '•').map((x) => x.sy);
  assert.deepEqual(eyes(S05_BLINK - 1), [1, 1]);
  assert.ok(eyes(S05_BLINK + 3).every((s) => s < 0.2), 'shut');
  assert.deepEqual(eyes(S05_BLINK + 6), [1, 1]);
  assert.equal(S05_BLINK, swiss(1, 3.5));
  // v04's path.
  const v = (f: number) => swissFrame(f, L, V04);
  assert.equal(v(SLIDE.from - 0.01).world.glyphs.jp.length, 0);
  assert.equal(v(SLIDE.from + 30).pieces, null);
  const [d] = discs(v(DISC_LAND.from + 30).world.under);
  assert.ok(Math.abs(d.x - V04_DISC.x) < 1e-6 && Math.abs(d.y - V04_DISC.y) < 1e-6);
  assert.equal(text(v(S05_BLINK_V04 - 1).world.glyphs.jp), faceText(PROTAGONIST));
  assert.equal(v(S05_BLINK_V04 + 1).world.glyphs.jp.filter((x) => x.ch === SHUT).length, 2);
  assert.equal(v(S05_BLINK_V04 + 7).world.glyphs.jp.filter((x) => x.ch === SHUT).length, 0);
  assert.equal(v(DISC_LAND.from + 30).world.under.filter((s) => s.rot !== undefined).length, 0, 'no arcs');
});

test('a pen draws each group of module rules on its eighth of swiss bar 1 at an even speed, and the row on beat 2', () => {
  const under = (f: number) => swissFrame(f, L).world.under;
  const thin = (f: number) => under(f).filter((s) => s.kind === 'rect' && s.rot === undefined && s.alpha !== undefined && s.alpha < 0.5 && Math.min(s.w, s.h) < 2);
  assert.equal(thin(RULES[0] - 0.01).length, 0);
  assert.equal(thin(RULES[0] + 0.5).length, 1);
  const first = (f: number) => thin(f)[0].h;
  assert.ok(Math.abs(first(RULES[0] + 6) - first(RULES[0] + 3) - (first(RULES[0] + 9) - first(RULES[0] + 6))) < 1e-6, 'an even speed');
  const full = (s: Shape) => s.w >= 2200 - 1e-6 || s.h >= 1280 - 1e-6;
  assert.equal(thin(RULES[6] + 2 + PEN.draw).filter(full).length, 22);
  const row = (f: number) => under(f).find((s) => s.kind === 'rect' && s.rot === undefined && s.h === 5);
  assert.equal(row(ROW_RULE - 0.01), undefined);
  assert.ok(row(ROW_RULE + PEN.draw)!.w >= 2200 - 1e-6);
});

test('A7: the signature types as Swiss small print beside the footer from 1.2a, two characters a frame, and leaves with the labels', () => {
  const sig = (f: number, threads = BUILD_THREADS) => swissFrame(f, L, threads).overlay.glyphs.text.filter((g) => g.size === SWISS_SMALL_PRINT.px);
  assert.equal(sig(SIG_SWISS.from - 0.01).length, 0);
  assert.equal(sig(SIG_SWISS.from).length, 2);
  const all = sig(SIG_SWISS.to + 1);
  assert.equal(all.map((g) => g.ch).join(''), LABELS.sig.replaceAll(' ', ''));
  const footer = swissFrame(SIG_SWISS.to + 1, L).overlay.glyphs.text.filter((g) => g.size === 20);
  assert.ok(Math.max(...all.map((g) => g.x)) < Math.min(...footer.map((g) => g.x)), 'left of the footer');
  assert.ok(all.every((g) => Math.abs((g.alpha ?? 1) - SWISS_SMALL_PRINT.alpha) < 1e-9 && g.y === SWISS_SMALL_PRINT.baseline));
  assert.equal(sig(SIG_SWISS.gone).filter((g) => (g.alpha ?? 1) > 0.01).length, 0);
  assert.equal(sig(SIG_SWISS.to + 1, { ...BUILD_THREADS, slugs: false }).length, 0);
});

test('N3 reverted (2026-10-03: the Swiss part keeps its beat counter): the corner counter shows the real (film) bar number, of the map’s length, by default; with cleanCorner on, the corner stays clear — no bar counter, no beat squares, no ink tab over swiss 1–5', () => {
  const inCorner = (x: number, y: number) => x > 700 && y > 380;
  const corner = (f: number, threads = BUILD_THREADS) => {
    const o = swissFrame(f, L, threads).overlay;
    return [
      ...o.glyphs.display.filter((g) => g.size === 34 && inCorner(g.x, g.y)),
      ...o.under.filter((s) => s.kind === 'rect' && same(s.color, INK) && inCorner(s.x, s.y)),
      ...o.over.filter((s) => s.kind === 'rect' && s.w === 10 && inCorner(s.x, s.y)),
    ];
  };
  const CLEAN: BuildThreads = { ...BUILD_THREADS, cleanCorner: true };
  for (let f = swiss(1); f < FLIP.to; f += 3) assert.equal(corner(f, CLEAN).length, 0, `the corner is clear at ${f} with cleanCorner on`);
  const V04_CORNER: BuildThreads = BUILD_THREADS;
  assert.ok(corner(swiss(2) + 20).length > 0, 'the counter is back by default');
  const read = (f: number) =>
    swissFrame(f, L, V04_CORNER)
      .overlay.glyphs.display.filter((g) => (g.alpha ?? 1) > 0.5 && g.size === 34)
      .sort((a, b) => a.x - b.x)
      .map((g) => g.ch)
      .join('');
  const counter = (bar: number) => `${String(bar).padStart(2, '0')}/${TOTAL_BARS}`;
  assert.equal(read(swiss(2) - 10), counter(partBar('swiss', 1)));
  assert.equal(read(swiss(2) + 20), counter(partBar('swiss', 2)));
  assert.equal(read(swiss(4) + 20), counter(partBar('swiss', 4)));
  assert.equal(read(swiss(5) + 20), counter(partBar('swiss', 5)));
});

test('S05: the poster camera glides out of the red with the lens in view, and down onto the row by 1.4 (the design’s camera, as approved)', () => {
  for (let f = DISC_LAND.to; f < LENS_TRACK; f++) {
    const [x, y] = onScreen(f, LENS.x, LENS.y);
    assert.ok(Math.abs(x) + LENS.r * 1.1 < 960 + LENS.r && Math.abs(y) < 540, `the lens in view at ${f}`);
    const a = onScreen(f, LENS.x, LENS.y);
    const b = onScreen(f + 1, LENS.x, LENS.y);
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.5, `the lens swims across the frame at ${f}`);
  }
  for (let f = LENS_TRACK + 4; f < SPLITS[0]; f++) {
    const c = swissFrame(f, L).camera;
    const zoom = FRONT / c.position[2];
    assert.ok(c.target[1] - 540 / zoom < ROW.rule - 2, `the row in view at ${f}`);
  }
});

// ——— S06: the split ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('S06’s cast: him in his cell, each level’s hosts (S06_HOSTS) in the cells that level adds, 64 different faces', () => {
  assert.deepEqual(HERO_LEAF, [4, 3]);
  assert.equal(faceText(S06_CAST.get('4,3')!), '(•ω•)');
  assert.equal(new Set([...S06_CAST.values()].map(faceText)).size, 64);
  const shown = (f: number) => new Set(faces(swissFrame(f, L).world.glyphs.jp).map(text));
  const strip = (s: string) => s.replace(/\s/gu, '');
  const at1 = shown(S06_SAMPLES[1]);
  for (const h of S06_HOSTS.level1) assert.ok(at1.has(strip(h)), `${h} at level 1`);
  const at2 = shown(S06_SAMPLES[2]);
  for (const h of S06_HOSTS.level2) assert.ok(at2.has(strip(h)), `${h} at level 2`);
  const at3 = shown(S06_SAMPLES[3]);
  for (const h of S06_HOSTS.level3) assert.ok(at3.has(strip(h)), `${h} at level 3`);
});

test('swiss bar 2 splits the grid on every beat: 1, 4, 16, then 64 cells (at one cell he is still S05’s cut paper)', () => {
  const f0 = swissFrame(S06_SAMPLES[0], L);
  assert.equal(f0.world.glyphs.jp.length, 0);
  assert.equal(f0.pieces!.list.map((p) => p.ch).join(''), '(•ω•)');
  for (const [i, n] of [[1, 4], [2, 16], [3, 64]] as const) assert.equal(faces(swissFrame(S06_SAMPLES[i], L).world.glyphs.jp).length, n, `level ${i}`);
  for (const [level, f] of SPLITS.entries()) {
    assert.equal(levelAt(f - 0.01), Math.max(0, level - 1));
    assert.equal(levelAt(f), level);
  }
  // Without the lens, v04's S06: his glyphs at one cell, reversing out over a few frames.
  const ink = (f: number) => swissFrame(f, L, V04).world.glyphs.jp[0].color[0];
  assert.ok(ink(SPLITS[0] + 4) > INK[0] + 0.1 && ink(SPLITS[0] + 4) < PAPER[0] - 0.1);
  assert.ok(same([ink(SPLITS[0] + 8)], [PAPER[0]]));
});

test('the lens swells over him from where it sat at the end of S05, and he reverses out inside it', () => {
  const end = lensAt(SPLITS[0] - 1, L);
  const p = swissFrame(SPLITS[0], L).pieces!;
  assert.ok(Math.abs(p.knock!.x - end.x) < 1e-6 && Math.abs(p.knock!.y - end.y) < 1e-6 && Math.abs(p.knock!.rx - end.r) < 0.05 * end.r, 'continuous from 575');
  const later = swissFrame(SPLITS[0] + 12, L).pieces!;
  assert.ok(later.knock!.rx > 2 * HALF, 'swollen over the whole frame');
  assert.ok(Math.hypot(later.knock!.x, later.knock!.y) < 0.2 * Math.hypot(end.x, end.y), 'centred');
});
const HALF = Math.hypot(960, 540) / 2;

test('the giant face hops onto 2.1& (8 px up and down, landing on the hat, then a 2 % squash) and keeps breathing — no dead frame on S06’s first beat', () => {
  const y = (f: number, threads = BUILD_THREADS) => swissFrame(f, L, threads).pieces!.list[2].y;
  const off = { ...BUILD_THREADS, reacquire: false };
  const dy = (f: number) => y(f) - y(f, off);
  assert.equal(S06_HOP, swiss(2, 0.5));
  assert.ok(dy(S06_HOP - 4) > 7.9, 'up 8 px');
  assert.ok(Math.abs(dy(S06_HOP)) < 1e-9, 'landing on the hat');
  assert.ok(dy(S06_HOP - 1) > 1, 'moving into it');
  assert.ok(swissFrame(S06_HOP + 3, L).pieces!.list[0].sx > 1.015, 'squashing');
  const size = (f: number) => swissFrame(f, L).pieces!.list[0].size;
  for (let f = SPLITS[0] + 1; f < SPLITS[1]; f++) assert.notEqual(size(f), size(f - 1), `breathing at ${f}`);
});

test('re-acquire: on each split after the first, four red L-ticks snap round his oval from 12 px out within 6 frames', () => {
  const tickRects = (f: number, threads = BUILD_THREADS) => swissFrame(f, L, threads).world.over.filter((s) => same(s.color, SWISS_RED));
  assert.equal(tickRects(REACQUIRE[0] - 0.01).length, 0);
  for (const at of REACQUIRE) {
    assert.equal(tickRects(at + 1).length, 8, `4 L-ticks on ${at}`);
    const oval = (f: number) => discs(swissFrame(f, L).world.under)[0];
    const out = (f: number) => Math.max(...tickRects(f).map((s) => Math.abs(s.x - oval(f).x) - oval(f).w / 2));
    assert.ok(out(at) - out(at + 6) > 8, `they snap in on ${at}`);
    const settled = tickRects(at + 8).filter((s) => s.w === REACQUIRE_TICKS.arm);
    for (const s of settled) assert.ok(Math.abs(Math.abs(s.y - oval(at + 8).y) - (oval(at + 8).h / 2 + 8)) < 0.5, 'round the oval');
  }
  assert.equal(tickRects(REACQUIRE[1] + 3, { ...BUILD_THREADS, reacquire: false }).length, 0);
});

test('the protagonist keeps (•ω•), ends next to the middle, and its cell turns red on the last eighth', () => {
  const [cx, cy] = cellCentre(3, 4, 3);
  const hero = faces(swissFrame(swiss(3) - 1, L).world.glyphs.jp).find((p) => text(p) === '(•ω•)')!;
  assert.ok(Math.abs(hero[2].x - cx) < 1e-6 && Math.abs(hero[2].y - cy) < 1e-6);
  assert.ok(same(hero[0].color, PAPER), 'reversed out of the red');
  const redNear = (f: number) => swissFrame(f, L).world.under.filter((s) => s.kind === 'rect' && same(s.color, SWISS_RED) && Math.abs(s.y - cy) < 1 && Math.abs(s.x - cx) < 130);
  assert.equal(redNear(RED_CELL - 0.01).length, 0);
  assert.equal(redNear(swiss(3) - 1).length, 1);
});

test('the poster camera never stops, and only ever sees the poster, through S05 and S06 (lens on and off)', () => {
  for (const threads of [BUILD_THREADS, V04]) {
    let last = swissFrame(swiss(1) - 0.1, L, threads).camera;
    for (let f = swiss(1); f < swiss(3); f += 1) {
      const c = swissFrame(f, L, threads).camera;
      const zoom = FRONT / c.position[2];
      assert.ok(zoom >= 1 - 1e-9, `${f}: zoom ${zoom}`);
      assert.ok(Math.abs(c.target[0]) <= 960 * (1 - 1 / zoom) + 1e-6 && Math.abs(c.target[1]) <= 540 * (1 - 1 / zoom) + 1e-6, `${f}: inside the poster`);
      if (f > swiss(1)) assert.ok(Math.hypot(c.position[0] - last.position[0], c.position[1] - last.position[1], c.position[2] - last.position[2]) > 1e-6, `the camera stops at ${f}`);
      last = c;
    }
    const a = swissFrame(swiss(2) - 0.001, L, threads).camera.position;
    const b = swissFrame(swiss(2), L, threads).camera.position;
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.5, 'S05 flows into S06');
  }
});

test('E8: S06 → S07 is a match cut on red: the disc of S07 opens within 150 px of where the red cell was', () => {
  const [cx, cy] = cellCentre(3, HERO_LEAF[0], HERO_LEAF[1]);
  const [d] = discs(swissFrame(swiss(3), L).overlay.under);
  assert.ok(Math.hypot(d.x - cx, d.y - cy) < 150, `${d.x}, ${d.y}`);
});

// ——— S07a: the glass, its first 72 frames v04's (G2) ————————————————————————————————————————————————————————————————————————————

/**
 * v04's S07 (src/shots/swiss.ts of the 58-bar copy taken before the 60-bar map, notes/b114/map/before; there swiss 3 = 576),
 * computed with this file's test layout: the camera, the glass pose, the disc, the "150" and the red bars at these v04 frames.
 */
const V04_S07: Record<number, { cam: number[]; glass: number[]; disc: number[]; one: number; bars: number[][] }> = {
  576: { cam: [62.5, 8.25, 76.56230456483908], glass: [460, 30, 150, 0, -0.55, -0.04, 1.45], disc: [40, 40, 600], one: -1007.4, bars: [] },
  583.25: { cam: [62.06845238095238, 8.25, 76.33251688516404], glass: [450.9375, 34.87708010754969, 150, 0, -0.51375, -0.03086192248739159, 1.45], disc: [50.357142857142854, 40, 600], one: -983.2333333333332, bars: [] },
  600: { cam: [61.07142857142857, 8.25, 75.80426194538524], glass: [430, 30, 150, 0, -0.43000000000000005, -0.02, 1.45], disc: [74.28571428571428, 40, 600], one: -927.4, bars: [[0, 260]] },
  611.5: { cam: [60.38690476190476, 8.25, 75.443697561004], glass: [262.4071609979777, 24.01284646056838, 150, 0.061287135600808895, -0.06606432199595558, 0.025669894454630797, 1.45], disc: [90.71428571428571, 40, 600], one: -889.0666666666667, bars: [] },
  624: { cam: [59.642857142857146, 8.25, 75.05372469840121], glass: [250, 30, 150, 0.06, -0.010000000000000064, 0.010000000000000002, 1.45], disc: [108.57142857142857, 40, 600], one: -847.4, bars: [] },
  640.75: { cam: [58.645833333333336, 8.25, 74.53431956886286], glass: [108.91746607985868, 34.877080107549695, 150, 0.14009668928009422, 0.6744751696007067, -0.057850752308496005, 1.45], disc: [132.5, 40, 600], one: -791.5666666666666, bars: [] },
  647: { cam: [58.273809523809526, 8.25, 74.34143386914396], glass: [101.2540197609575, 30.783157153320307, 150, 0.13999732015936167, 0.7049799011952125, -0.059955503564373104, 1.45], disc: [141.42857142857142, 40, 600], one: -770.7333333333333, bars: [[-460, -300]] },
  647.75: { cam: [58.229166666666664, 8.25, 74.31832115453274], glass: [100.3127210803064, 30.196314496930654, 150, 0.13999985261312908, 0.708748894598468, -0.0599972306413969, 1.45], disc: [142.5, 40, 600], one: -768.2333333333333, bars: [[-115, -300]] },
};
/** v04's sub-frames per frame over its swiss 3.1 … 3.4 (576–647). */
const V04_S07_SAMPLES = [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 16, 16, 16, 16, 16, 16, 16, 48, 48, 48, 48, 48, 48, 48];

test('G2: the glass’s first 72 frames are v04’s swiss 3.1–3.4 frame for frame — the camera, the pose, the disc, the big type’s place (N2: his bytes where v04 set "150"), the red bars and the sub-frames', () => {
  const shift = swiss(3) - 576;
  for (const [v04, ref] of Object.entries(V04_S07)) {
    const f = Number(v04) + shift;
    const s = swissFrame(f, L);
    assert.deepEqual([...s.camera.position], ref.cam, `camera at ${f}`);
    const g = glassPose(f, L)!;
    assert.deepEqual([g.x, g.y, g.z, g.rx, g.ry, g.rz, g.scale], ref.glass, `glass at ${f}`);
    const d = discs(s.overlay.under)[0];
    assert.deepEqual([d.x, d.y, d.w], ref.disc, `disc at ${f}`);
    // N2: his bytes start where v04's "150" started (its left edge) with their cap tops on v04's, at v04's measure (src/shots/swiss.ts glassType).
    const big = s.overlay.glyphs.display.find((x) => x.size > 100)!;
    assert.ok(Math.abs(big.x - (adv(big.ch) / 2) * big.size - (ref.one - (adv('1') / 2) * 460)) < 1e-9, `the big type's left edge at ${f}`);
    assert.ok(Math.abs(big.y + 0.42 * big.size - (340 + 0.42 * 460)) < 1e-9 && big.size < 460, `its cap tops on v04's at ${f}`);
    const v04Type = swissFrame(f, L, { ...BUILD_THREADS, glassBytes: false }).overlay.glyphs.display.filter((x) => x.size > 100);
    assert.equal(v04Type.map((x) => x.ch).join(''), '150', `"150" with glassBytes off at ${f}`);
    assert.equal(v04Type[0].x, ref.one, `"150" (glassBytes off) at ${f}`);
    assert.deepEqual(s.overlay.over.filter((x) => x.w === 2400).map((x) => [x.x, x.y]), ref.bars, `red bars at ${f}`);
    assert.equal(s.glass && s.pov, null);
    assert.equal(s.glassFade, 1);
  }
  for (let f = swiss(3); f < HIT3; f++) assert.equal(swissTemporal(f).samples, V04_S07_SAMPLES[f - swiss(3)], `sub-frames at ${f}`);
  assert.deepEqual(mouthAt(L), [60, 0]);
});

test('S07 trucks at v04’s slope (200 px over 84 frames) to the third hit, then decelerates (τ 10) and is at rest from the iris', () => {
  assert.equal(truck(swiss(3)), -100);
  assert.ok(Math.abs(truck(HIT3) - (-100 + (200 * 72) / 84)) < 1e-9);
  const v = (f: number) => truck(f + 0.5) - truck(f - 0.5);
  assert.ok(Math.abs(v(HIT3 + 0.5) - 200 / 84) < 0.15, 'no jolt at the hit');
  for (let f = HIT3 + 1; f < IRIS; f++) assert.ok(v(f) < v(f - 1) + 1e-9 && v(f) > 0, `slowing at ${f}`);
  assert.equal(truck(IRIS + 20), truck(IRIS));
});

test('three red bars: above him on 3.2 and below him on 3.4 (both miss), at his height through him on 4.4; each crosses the centre on its clap with both ends off the frame', () => {
  assert.deepEqual([...SWEEPS], [swiss(3, 1), swiss(3, 3), swiss(4, 3)]);
  const bars = (f: number) => swissFrame(f, L).overlay.over.filter((s) => same(s.color, SWISS_RED) && s.h >= 84);
  for (const [i, clap] of SWEEPS.entries()) {
    assert.equal(bars(clap - 6).length, 0);
    const b = bars(clap)[0];
    assert.ok(Math.abs(b.x - (i === 2 ? 60 - 60 * (b.w / 2400) : 0)) < 1e-6, 'crosses the centre on the clap');
    assert.ok(b.y * [1, -1, 1][i] > 0 && Math.abs(b.y) === [260, 300, Math.abs(b.y)][i], `bar ${i + 1} at y ${b.y}`);
    for (let f = clap - 0.5; f <= clap + 0.5; f += 0.25) {
      const x = bars(f)[0];
      assert.ok(x.x - x.w / 2 < -960 && x.x + x.w / 2 > 960, `both ends off the frame at ${f}`);
    }
  }
  assert.ok(Math.abs(bars(SWEEPS[2])[0].y) < 20, 'bar 3 at his height');
});

test('the glass keeps turning, hits on beats 2 and 3, and on beat 4 hits a third time — a quarter turn back toward us — instead of leaving', () => {
  assert.equal(glassPose(swiss(3) - 1), null);
  const pose = (f: number) => glassPose(f, L)!;
  for (let f = swiss(3) + 1; f < swiss(3, 3); f++) assert.ok(pose(f).ry > pose(f - 1).ry, `turning at ${f}`);
  assert.ok(pose(swiss(3, 1) + 3).ry - pose(swiss(3, 1) - 1).ry > 0.15, 'a hit on beat 2');
  assert.ok(pose(GLASS_TURN + 3).ry - pose(GLASS_TURN - 1).ry > 0.35, 'a hard hit on beat 3');
  assert.ok(pose(HIT3 + 6).ry < pose(HIT3).ry - 0.25, 'the third hit turns him back');
  for (let f = HIT3; f < IRIS; f++) assert.ok(Math.abs(pose(f).x) < 400 && pose(f).scale === 1.45, `in place at ${f}: no exit`);
  const layers = swissFrame(HIT3 + 10, L).overlay;
  assert.equal(discs(layers.under).length, 1, 'the disc stays');
  assert.equal(layers.glyphs.display.filter((g) => g.size > 100).map((g) => g.ch).join(''), GLASS_TYPE.big.replaceAll(' ', ''), 'the big type (his bytes) stays');
  assert.ok(discs(swissFrame(IRIS - 1, L).overlay.under)[0].w > discs(swissFrame(HIT3, L).overlay.under)[0].w + 50, 'the disc breathes 300 → 330 into the iris');
});

test('the build sub-frames: 64 for the lens landing, the pieces’ flights and the pull; 48 for the arcs’ steps and the track; 32 for the poster’s moves; 16 otherwise', () => {
  assert.ok(swissTemporal(DISC_LAND.from + 1).samples >= 48, 'the disc shrinking from the whole frame');
  for (const at of PIECES) assert.equal(swissTemporal(at - 2).samples, 64, `the piece landing on ${at}`);
  for (const at of ARC_STEPS) assert.ok(swissTemporal(at + 6).samples >= 48);
  assert.equal(swissTemporal(LENS_TRACK + 3).samples, 48);
  assert.equal(swissTemporal(SPLITS[2] + 2).samples, 32);
  assert.equal(swissTemporal(S06_SAMPLES[1]).samples, 16);
  assert.equal(swissTemporal(PULL.from + 2).samples, 64);
  assert.ok(swissTemporal(SLIDE.from + 2, V04).samples >= 64, 'v04’s slide');
});

test('segments: S05 flows into S06; the cut to S07 (red on red) and the hard cut back from the POV on swiss 4.3; S08 and T2 one take from there', () => {
  assert.deepEqual(swissSegment(swiss(1)), { from: swiss(1), to: swiss(3) });
  assert.deepEqual(swissSegment(swiss(3) - 1), { from: swiss(1), to: swiss(3) });
  assert.deepEqual(swissSegment(swiss(3)), { from: swiss(3), to: RETURN });
  assert.deepEqual(swissSegment(RETURN - 1), { from: swiss(3), to: RETURN });
  assert.deepEqual(swissSegment(RETURN), { from: RETURN, to: partEnd('swiss') });
  assert.deepEqual(swissSegment(partEnd('swiss') - 1), { from: RETURN, to: partEnd('swiss') });
});

test('only the glass blooms: S07a, the scan and the pull', () => {
  assert.ok(swissLookAt(swiss(3, 1)).bloom.intensity > 0);
  assert.ok(swissLookAt(swiss(4, 2)).bloom.intensity > 0);
  assert.ok(swissLookAt(PULL.to - 1).bloom.intensity > 0);
  assert.equal(swissLookAt(swiss(2) + 20).bloom.intensity, 0);
  assert.equal(swissLookAt(PULL.to).bloom.intensity, 0);
  assert.equal(ZOOM, 40);
  assert.ok(faceWidth(PROTAGONIST, L.jp) > 0);
});

// ——— The energy standard over the Swiss part (tests/lib/energyAudit.ts; tests/energyStandard.test.ts runs the same audits from the intro on) ———

test('the energy standard over swiss 1.1 → 5.3: every fast camera move gets ≥ 32 sub-frames; the camera (with the rig) never holds still > 12 frames', () => {
  const at: CameraAt = (frame) => ({ pose: swissFrame(frame, L).camera, samples: onShutter(frame, swissTemporal(frame)) });
  // The hard cut to S07 (red on red) is the only jump; the hard cut back on 4.3 keeps the camera (E10).
  const skip = (f: number) => f === swiss(3);
  assertFastMovesSampled(swiss(1) + 1, FLIP.from, at, skip);
  assertNeverStill(swiss(1) + 1, FLIP.from, poseMoved(at, skip));
  for (const threads of [V04, { ...BUILD_THREADS, infection: false }, { ...BUILD_THREADS, pov: false as const }]) {
    const t: CameraAt = (frame) => ({ pose: swissFrame(frame, L, threads).camera, samples: onShutter(frame, swissTemporal(frame, threads)) });
    assertFastMovesSampled(swiss(1) + 1, FLIP.from, t, skip);
  }
});
