// S31U UKIYO-E (drop2 10–11, builder U · WAVE): the woodblock print's contracts — WAVE_CURL is the curl's keyline on the burst (the
// switch drafts it), the blocks print in order on the 16ths and snap into register, the hero meets the part's hand-offs, the small
// kaomoji mountain (seven rows of his faces, framed in the hollow under the lip: D2), the colour law, the downsample's
// steps, and sprayAt's game pixels landing on exactly the 27 copies' cells of the arcade's formation; round 1 (R1-T04 … T10, D2): his
// continuous loop and crisp landings, his wake on the water, the crash in the print and the spent wave, the massive wave, the boats, the
// cartouche. Every frame from the score (drop2 bars, part-local).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO2 } from '../src/content/drop2.ts';
import { linear } from '../src/engine/color.ts';
import * as D from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { FORMATION, GP, SIGNATURE_BITS, cellCentre } from '../src/shots/drop2ArcadeSprites.ts';
import { HANDOFFS, LAW, drop2Segment } from '../src/shots/drop2Shared.ts';
import { SIGNATURE } from '../src/content/drop2.ts';
import {
  BLOCK_ORDER,
  CART_TITLE,
  CRASH_AT,
  CRASH_TONGUES,
  CREST_PEAK,
  HERO_CRISP,
  IMPACT,
  PLANE,
  ROWER_SIZE,
  type VecItem,
  WAVE,
  type WaveFrame,
  WAVE_CARTOUCHE,
  blockAt,
  blockState,
  boatBob,
  boatTumble,
  cartoucheBytes,
  crashBurst,
  crashClaws,
  derezAt,
  downsampleCell,
  fromScreen,
  heroPlane,
  heroWave,
  prowScreen,
  rollAt,
  scanLineY,
  spentAt,
  sprayAt,
  throwAt,
  toScreen,
  waveCam,
  waveFrame,
  wavePoint,
  waveSegment,
  waveTemporal,
} from '../src/shots/drop2Wave.ts';
import {
  BACK,
  BOATS,
  BOTTOM,
  CURL_EYE,
  FACE,
  FOAM_LINES,
  HORIZON,
  LIP_CLAWS,
  LIP_CUT,
  MOUNDS,
  MOUNTAIN,
  MOUNTAIN_FACES,
  MOUNTAIN_SHAPE,
  PHI,
  SCROLL_REST,
  SCROLL_ROW,
  STRIPES,
  TROUGH_Y,
  WATER_END,
  WAVE_CURL,
  clawOutline,
  clawsOf,
  curlPoint,
  gunwaleOf,
  inside as insidePoly,
  lipClaws,
  lipThickness,
  rowS,
} from '../src/shots/drop2WaveGeom.ts';
import { failedFills, visibleStraights } from './drop2WaveLines.ts';

const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);

test('the wave is drop 2’s part from 10.1 to 12.1, its first frame a hard cut (the burst), its sub-frames never leave the segment', () => {
  assert.deepEqual(WAVE, { from: at(10), to: at(12) });
  assert.equal(waveSegment(at(10)).from, at(10));
  for (const f of [at(10), at(11), at(12) - 1]) assert.deepEqual(waveSegment(f), drop2Segment(f));
  // 64 sub-frames on the barrel dive, 32 on the eruption and the crash.
  for (const f of range(D.BARREL.from, D.WAVE_CRASH)) assert.equal(waveTemporal(f).samples, 64, `dive ${f}`);
  assert.equal(waveTemporal(at(10)).samples, 32);
  assert.equal(waveTemporal(at(11, 1.5)).samples, 32);
});

test('WAVE_CURL: four quarter arcs of a golden spiral, each starting where the one before ends, tangent to it; the eye is inside the last', () => {
  assert.equal(WAVE_CURL.length, 4);
  for (let k = 0; k < 4; k++) {
    const a = WAVE_CURL[k];
    assert.equal(a.a1 - a.a0, 90);
    if (k > 0) {
      const p = WAVE_CURL[k - 1];
      assert.ok(Math.abs(p.r / a.r - PHI) < 1e-9, 'radii shrink by φ');
      const end = curlPoint(k - 1e-9);
      const start = curlPoint(k);
      assert.ok(Math.hypot(end[0] - start[0], end[1] - start[1]) < 0.5, `arc ${k} joins`);
      assert.equal(p.a1, a.a0, 'tangent: the same direction at the joint');
    }
  }
  const last = WAVE_CURL[3];
  assert.ok(Math.hypot(CURL_EYE[0] - last.cx, CURL_EYE[1] - last.cy) < last.r);
});

test('on the burst (10.1) every arc of WAVE_CURL lies within 2 px of the print’s sumi keyline (the switch’s drafting is the print, contract §6.3)', () => {
  const fr = waveFrame(at(10));
  const sumi = linear('#1B1A18');
  const strokes = fr.layers.flatMap((L) => L.vec).filter((v): v is Extract<VecItem, { kind: 'stroke' }> => v.kind === 'stroke' && v.color.every((c, i) => Math.abs(c - sumi[i]) < 1e-6));
  // The camera of the burst frame is the identity (plane = screen).
  const cam = waveCam(at(10));
  assert.deepEqual(cam, { fx: 960, fy: 540, zoom: 1, roll: 0 });
  const dist = (x: number, y: number): number => {
    let best = Infinity;
    for (const s of strokes) {
      for (let i = 0; i + 3 < s.pts.length; i += 2) {
        const [ax, ay, bx, by] = [s.pts[i], s.pts[i + 1], s.pts[i + 2], s.pts[i + 3]];
        const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2));
        best = Math.min(best, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)));
      }
    }
    return best;
  };
  for (const a of WAVE_CURL) {
    for (let j = 0; j <= 30; j++) {
      const t = ((a.a0 + (a.a1 - a.a0) * (j / 30)) * Math.PI) / 180;
      const d = dist(a.cx + a.r * Math.cos(t), a.cy + a.r * Math.sin(t));
      assert.ok(d <= 2, `arc point ${j} is ${d.toFixed(2)} px off the keyline`);
    }
  }
});

test('the print prints block by block on the 16ths (keyline, pale, Prussian, the sky + the mountain, the boats + the cartouche’s frame): each whole on its drum frame, then off register by ≤ 3 px, in register 3 frames later', () => {
  assert.deepEqual(BLOCK_ORDER.map(blockAt), D.BLOCKS.slice(0, 5));
  BLOCK_ORDER.forEach((b, i) => {
    const f = D.BLOCKS[i];
    assert.equal(blockState(b, f - 1).on, false, `${b} not before`);
    assert.equal(blockState(b, f - 0.25).on, true, `${b} whole on its frame (struck half a shutter early)`);
    const s = blockState(b, f);
    assert.ok(Math.hypot(s.dx, s.dy) <= 3.5, `${b} off register by ≤ 3 px`);
    assert.deepEqual([blockState(b, f + 3).dx, blockState(b, f + 3).dy], [0, 0], `${b} in register by + 3`);
  });
  assert.deepEqual([blockState('key', at(10)).dx, blockState('key', at(10)).dy], [0, 0], 'the keyline is the drafting: in register from its first frame');
});

// Round 1 (R1-T04 … T07): the crest and the prow moved with the massive wave (D2) and the loop he now surfs; HANDOFFS' rows for them
// (drop2Shared, the lead's) are internal to this part — handed off to the lead to update; the part's own edges (the burst, the
// mothership) still meet HANDOFFS.
test('the hero at every hand-off: erupting from the box (HANDOFFS) to (900, 420) at 760 px by + 12; on the crest on 10.3 (〜(•ω•)〜, ≈ 560 px, his board on the curl); on the prow on 11.2& (ヽ(•ω•)ノ, 440 px, right of x 1360); the mothership (HANDOFFS) on the last frame; ≥ 420 px throughout', () => {
  const near = (f: number, x: number, y: number, w: number, tol = 30): void => {
    const h = heroWave(f);
    assert.ok(Math.hypot(h.x - x, h.y - y) <= tol, `${f - D.DROP2_START}: at (${h.x.toFixed(0)}, ${h.y.toFixed(0)}), wanted (${x}, ${y})`);
    assert.ok(Math.abs(h.width / w - 1) <= 0.05, `${f - D.DROP2_START}: ${h.width.toFixed(0)} px, wanted ${w}`);
  };
  const row = (frame: number) => HANDOFFS.find((r) => r.frame === frame)!;
  const burst = heroWave(D.BURST);
  assert.equal(burst.face, row(D.BURST).face);
  assert.ok(Math.hypot(burst.x - 960, burst.y - 540) < 30, 'erupts from the box’s centre (the launch already moves on its frame)');
  near(D.BURST + 12, 900, 420, 760);
  const crest = heroWave(D.CREST);
  assert.equal(crest.face, HERO2.ride);
  assert.ok(Math.abs(crest.width / (560 * waveCam(D.CREST).zoom) - 1) < 0.02, `${crest.width.toFixed(0)} px`);
  // His centre is on the crest: over the curl's outer edge near its top, his lower bracket on it.
  const onPlane = heroPlane(D.CREST);
  const edge = Array.from({ length: 41 }, (_, i) => curlPoint(0.1 + (0.4 * i) / 40));
  const gap = Math.min(...edge.map((p) => Math.hypot(p[0] - onPlane[0], p[1] - onPlane[1])));
  assert.ok(gap > 30 && gap < 70, `his centre ${gap.toFixed(0)} px off the crest`);
  const prow = heroWave(D.PROW);
  assert.equal(prow.face, HERO2.cheer);
  assert.equal(prow.width, 440);
  for (const f of range(D.PROW, D.DOWNSAMPLE.from)) assert.ok(heroWave(f).x - heroWave(f).width / 2 >= 1360, `${f - D.DROP2_START}: right of 1360 (T07)`);
  const last = heroWave(D.ARCADE.from - 1);
  assert.equal(last.bitmap, true);
  near(D.ARCADE.from - 1, 960, 230, 546, 1);
  for (const f of range(D.BURST + 3, D.ARCADE.from)) assert.ok(heroWave(f).width >= 420, `${f - D.DROP2_START}: ${heroWave(f).width.toFixed(0)} px`);
});

test('R1-T04 (round 1): he moves, he never snaps — his centre moves ≤ 40 px a frame through 10.1–11.4 (but the dive’s and the crash’s launches and the 11.4 leap, kept); the beat frames he lands on are crisp (one instant for every sub-frame, the pose swapped whole); 3 frames of anticipation (squash ≤ 0.93) before the 10.2 kick; on 10.3 a recoil 1.06 → 1.00', () => {
  const skip = new Set([...range(D.BARREL.from, D.BARREL.from + 2), ...range(D.WAVE_CRASH, D.WAVE_CRASH + 2), ...range(D.DOWNSAMPLE.from, D.ARCADE.from)]);
  for (let f = D.BURST + 1; f < D.ARCADE.from; f++) {
    if (skip.has(f)) continue;
    const a = heroWave(f - 1);
    const b = heroWave(f);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    assert.ok(d <= 40, `${f - D.DROP2_START}: he moves ${d.toFixed(0)} px`);
  }
  for (const k of HERO_CRISP) {
    assert.deepEqual(heroWave(k - 0.25), heroWave(k + 0.24), `${k - D.DROP2_START}: one instant for the whole shutter`);
    assert.deepEqual(heroWave(k - 0.25), heroWave(k), `${k - D.DROP2_START}: the frame's own instant`);
  }
  // The pose swaps only on beat frames: never between two sub-frames of one frame (a cross-dissolve).
  for (let f = D.BURST; f < D.ARCADE.from; f++) assert.equal(heroWave(f - 0.25).face, heroWave(f + 0.24).face, `${f - D.DROP2_START}: one face a frame`);
  [0.99, 0.97, 0.93].forEach((m, i) => assert.ok(heroWave(D.BLOCKS[4] - 3 + i).sy <= m, `${D.BLOCKS[4] - 3 + i - D.DROP2_START}: winding up`));
  assert.ok(heroWave(D.BLOCKS[4] - 1).sy <= 0.93, 'the squash before the kick');
  assert.ok(Math.abs(heroWave(D.CREST).sx - 1.06) < 0.005 && Math.abs(heroWave(D.CREST + 6).sx - heroWave(D.CREST + 12).sx) < 0.02, 'the crest’s recoil');
  // 11.3: he stays on the prow (the boat dips under him, no hop): within 20 px of the prow's point all bar.
  for (const f of range(D.PROW + 1, D.DOWNSAMPLE.from)) {
    const p = prowScreen(f);
    const h = heroWave(f);
    assert.ok(Math.abs(h.x - p[0]) < 1 && h.y < p[1] && p[1] - h.y < 80, `${f - D.DROP2_START}: on the prow`);
  }
});

test('R1-T05 (round 1): he surfs on the water — the trough at the face’s foot by 10.2 + 8 (as he lands), the face, then the crest; his wake is laid on the water where he rode (nowhere else), behind him, as one unbroken tapered run each, and bleeds slowly outward', () => {
  const K = D.BLOCKS[4];
  // Landed on the trough: his centre over it by his lift.
  const t = heroPlane(K + 8);
  assert.ok(t[1] < TROUGH_Y && TROUGH_Y - t[1] < 90, `on the trough at 10.2 + 8: ${t[1].toFixed(0)}`);
  // Every point of his wake is on the water: within 26 px of the face/trough line or the curl's outer edge (it soaks in 20 px).
  const face = FACE;
  const curl = Array.from({ length: 201 }, (_, i) => curlPoint((0.6 * i) / 200));
  const distTo = (p: readonly number[], line: readonly (readonly number[])[]): number => {
    let best = Infinity;
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = line[i - 1];
      const [bx, by] = line[i];
      const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / L2));
      best = Math.min(best, Math.hypot(p[0] - ax - t * (bx - ax), p[1] - ay - t * (by - ay)));
    }
    return best;
  };
  const fr = waveFrame(D.BARREL.from - 1);
  const amberQuads = fr.layers[4].vec.filter((v) => v.kind === 'quad' && v.colors[0].every((c, i) => Math.abs(c - linear(LAW.hero)[i]) < 1e-6));
  assert.ok(amberQuads.length > 40, `his wake is printed: ${amberQuads.length} quads`);
  // The core's centre line (mid of each core quad) lies on the water.
  const cam = waveCam(D.BARREL.from - 1);
  for (const q of amberQuads.filter((_, i) => i % 3 === 1)) {
    const mid = fromScreen(cam, 1, [(q.pts[0] + q.pts[2] + q.pts[4] + q.pts[6]) / 4, (q.pts[1] + q.pts[3] + q.pts[5] + q.pts[7]) / 4]);
    assert.ok(Math.min(distTo(mid, face), distTo(mid, curl)) < 26, `wake at (${mid[0].toFixed(0)}, ${mid[1].toFixed(0)}) is on the water`);
  }
  // None before he reaches the water.
  const before = waveFrame(K + 4).layers[4].vec.filter((v) => v.kind === 'quad' && v.colors[0].every((c, i) => Math.abs(c - linear(LAW.hero)[i]) < 1e-6));
  assert.equal(before.length, 0);
});

test('R1-T06 (round 1; round 2): the crash stays in the print — the lip is thrown onto the boats (landing on 11.1, in frame), the body under it still printed in its blues; the boats tumble 11.1 + 6 → 11.2; from 11.1& a spent wave: the whole wave lowered 30 %, the lip folded back into a small foam nose at the crest’s end (round 2: no foam field of flattened ribbons on the water), a silhouette unlike the standing curl', () => {
  // The lip lands on the boats on 11.1: the impact among the middle boat's hull, on screen.
  const cam = waveCam(D.WAVE_CRASH);
  const imp = toScreen(cam, 1, IMPACT);
  assert.ok(imp[0] > 0 && imp[0] < 1920 && imp[1] > 0 && imp[1] < 1080, `the impact in frame: (${imp[0].toFixed(0)}, ${imp[1].toFixed(0)})`);
  const mid = BOATS[1];
  assert.ok(Math.abs(IMPACT[0] - mid.x) < mid.len / 2 && Math.abs(IMPACT[1] - mid.y) < 60, 'on the middle boat');
  assert.ok(throwAt(D.WAVE_CRASH) > 0.97 && throwAt(D.WAVE_CRASH - 11) === 0);
  // The wave is still printed in the crash (no blank page): hundreds of its band quads in the frame.
  const fr = waveFrame(D.WAVE_CRASH + 3);
  assert.ok(fr.layers[4].vec.filter((v) => v.kind === 'quad').length > 300);
  // The boats tumble under the foam.
  assert.ok(Math.abs(boatTumble(0, D.WAVE_CRASH + 15)) > 60 && boatTumble(0, D.SEAL) === 360);
  // The spent wave: its crest lowered by 30 % of its height over the floor; the lip collapsed onto the water.
  const top0 = CREST_PEAK;
  const top1 = wavePoint(D.SEAL + 6, top0);
  assert.ok(top1[1] - top0[1] >= 0.29 * (BOTTOM - top0[1]), `the crest down ${(top1[1] - top0[1]).toFixed(0)} px`);
  // Round 2 (R2-01/R2-02): under the burst the thrown lip folds back into the crest's foam nose — the lip lies within the nose, at
  // the end of the lowered crest, above the mountain (no ribbons left on the water, no arch of stretched water over the hollow).
  const nose = wavePoint(D.SEAL, curlPoint(LIP_CUT, lipThickness(LIP_CUT) / 2));
  for (const s of [0.6, 1, 1.3]) {
    const p = wavePoint(D.SEAL, curlPoint(s));
    assert.ok(Math.hypot(p[0] - nose[0], p[1] - nose[1]) < 130, `the lip (s ${s}) folded into the nose: ${Math.hypot(p[0] - nose[0], p[1] - nose[1]).toFixed(0)} px from it`);
    assert.ok(p[1] < MOUNTAIN.base - MOUNTAIN.height - 20, `above the mountain: y ${p[1].toFixed(0)}`);
  }
  assert.ok(spentAt(D.WAVE_CRASH + 5) === 0 && Math.abs(spentAt(D.SEAL + 6) - 0.3) < 1e-9);
});

test('THE SMALL KAOMOJI MOUNTAIN (D2: small and low in the centre, framed inside the hollow under the lip): seven rows of his faces, row k holding k + 1, ≈ 262 × 156 px on the horizon; no claw of the lip ever touching it on screen; one amber • on the peak; unobstructed by him 11.1& → 11.4 (T07)', () => {
  assert.equal(MOUNTAIN.rows, 7);
  assert.equal(MOUNTAIN_FACES.length, 35);
  for (let r = 1; r <= 7; r++) assert.equal(MOUNTAIN_FACES.filter((m) => m.row === r).length, r + 1);
  const xs = MOUNTAIN_SHAPE.map((p) => p[0]);
  const ys = MOUNTAIN_SHAPE.map((p) => p[1]);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  assert.ok(box.x1 - box.x0 < 360 && box.y1 - box.y0 < 200, 'small');
  assert.ok(Math.abs(MOUNTAIN.x - 960) < 100 && MOUNTAIN.base === HORIZON && HORIZON > 760, 'low in the centre');
  // Inside the hollow under the lip: right of the face, left of the lip's reach, below the lip's underside.
  const faceX = Math.max(...FACE.filter((p) => p[1] > 600 && p[1] < HORIZON).map((p) => p[0]));
  const lipX = Math.max(...WAVE_CURL.map((a) => a.cx + a.r));
  assert.ok(box.x0 > faceX && box.x1 < lipX, `framed in the hollow: ${box.x0.toFixed(0)}–${box.x1.toFixed(0)} between ${faceX.toFixed(0)} and ${lipX.toFixed(0)}`);
  // No claw of the lip touches it, on screen, while the print is seen whole (the claws ride plane 1.1, the mountain 0.35); in the
  // barrel dive (10.4 →) the lens passes under the lip and the near fingers may cross the far peak (parallax).
  const plane = MOUNTAIN_SHAPE.map((p) => p as [number, number]);
  for (let f = D.BLOCKS[3]; f < D.BARREL.from; f += 2) {
    const cam = waveCam(f);
    const mtn = plane.map((p) => toScreen(cam, PLANE.mountain, p));
    const mx = mtn.map((p) => p[0]);
    const my = mtn.map((p) => p[1]);
    const mbox = { x0: Math.min(...mx) + 24, x1: Math.max(...mx) - 24, y0: Math.min(...my) + 8, y1: Math.max(...my) };
    for (const c of lipClaws(1, SCROLL_REST)) for (const k of clawsOf(c.claw)) for (const p of clawOutline(k)) {
      const q = toScreen(cam, PLANE.wave, p);
      assert.ok(!(q[0] > mbox.x0 && q[0] < mbox.x1 && q[1] > mbox.y0 && q[1] < mbox.y1), `${f - D.DROP2_START}: a claw at (${q[0].toFixed(0)}, ${q[1].toFixed(0)}) on the mountain`);
    }
  }
  // Untouched by the crash: no tongue of foam ever crosses its silhouette, on screen.
  for (let f = D.WAVE_CRASH; f < D.SEAL + 6; f++) {
    const cam = waveCam(f);
    const mtn = plane.map((p) => toScreen(cam, PLANE.mountain, p));
    for (const c of crashClaws(f)) for (const k of clawsOf(c)) for (const p of clawOutline(k)) assert.ok(!insidePoly(mtn, toScreen(cam, PLANE.claws, p)), `${f - D.DROP2_START}: the crash's foam on the mountain`);
  }
  // T07: from 11.1& to 11.4 nothing of him covers it.
  for (const f of range(D.WAVE_CRASH + 15, D.DOWNSAMPLE.from)) {
    const cam = waveCam(f);
    const mtn = plane.map((p) => toScreen(cam, PLANE.mountain, p));
    const h = heroWave(f);
    const hb = { x0: h.x - h.width / 2, x1: h.x + h.width / 2, y0: h.y - 0.35 * h.width, y1: h.y + 0.35 * h.width };
    const over = mtn.some((p) => p[0] > hb.x0 && p[0] < hb.x1 && p[1] > hb.y0 && p[1] < hb.y1);
    assert.ok(!over, `${f - D.DROP2_START}: he covers the mountain`);
  }
  // The amber • on the peak once the sky block prints.
  const amber = linear(LAW.hero);
  const peak = waveFrame(D.BLOCKS[3] + 3).layers[1].glyphs.rounded.filter((g) => g.ch === '•' && g.color.every((c, i) => Math.abs(c - amber[i]) < 1e-6));
  assert.equal(peak.length, 1);
  assert.equal(waveFrame(D.BLOCKS[3] - 1).layers[1].glyphs.rounded.length, 0, 'prints with the sky block');
});

test('D2 (the wave was too thin) + T08: a massive wave — its crest near the top edge, 400 + px of water at mid-height, the lip far out over a big hollow and ending above 60 % of its height, its fingers leaving the lower third open; a dozen striated bands with white lines between them; a sea of crested mounds', () => {
  const at = (pts: readonly (readonly number[])[], y: number): number => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
    }
    return NaN;
  };
  assert.ok(CREST_PEAK[1] < 140, 'the crest near the top edge');
  const thick = at(FACE.slice(0, 26), 600) - at(BACK, 600);
  assert.ok(thick >= 400 && thick <= 600, `${thick.toFixed(0)} px of water at mid-height`);
  assert.ok(Math.max(...WAVE_CURL.map((a) => a.cx + a.r)) >= 1050, 'the lip overhangs far to the right');
  // The hollow: from the lip's underside at the crest to the trough.
  const top = CREST_PEAK[1] + lipThickness(0);
  const h = TROUGH_Y - top;
  assert.ok((curlPoint(WATER_END)[1] - top) / h <= 0.6, 'the water ends above 60 % of the hollow');
  const lowest = Math.max(...LIP_CLAWS.flatMap((c) => clawsOf(c).flatMap((k) => clawOutline(k).map((p) => p[1]))));
  assert.ok((lowest - top) / h <= 0.72, `the fingers hang to ${(((lowest - top) / h) * 100).toFixed(0)} % of the hollow`);
  assert.ok(STRIPES.length >= 8 && STRIPES.length <= 14 && FOAM_LINES.filter((l) => l.pts.length > 20).length >= 8, 'striated');
  // Darkest on the inner face: each band's inner end darker than the skin's.
  assert.ok(STRIPES[STRIPES.length - 1].t1 >= 0.95 && STRIPES[0].t0 <= 0.05);
  assert.ok(MOUNDS.length >= 6, 'a sea of mounds');
});

test('R1-T09 (round 1): Defender’s boats are long crescent hulls with a raised bow; the rowers are cream heads ≥ 28 px with red outlines, their faces in Noto Sans JP — (￣▽￣), looking up (￣□￣」) on the crest, (￣ω￣) with an amber ω from the seal', () => {
  for (const b of BOATS) {
    const g = gunwaleOf(b, 0);
    const bow = g[0];
    const mid = g[12];
    assert.ok(b.len / b.h >= 12, 'slim');
    assert.ok(mid[1] - bow[1] >= 0.06 * b.len, `the bow rises ${(mid[1] - bow[1]).toFixed(0)} px`);
  }
  assert.ok(ROWER_SIZE >= 28);
  const jpFaces = (f: number) => waveFrame(f).layers[3].glyphs.jp.map((g) => g.ch).join('');
  assert.ok(jpFaces(D.BLOCKS[4] + 2).includes('▽'));
  assert.ok(jpFaces(D.CREST + 2).includes('□'));
  const after = waveFrame(D.SEAL + 2).layers[3];
  assert.ok(after.glyphs.jp.some((g) => g.ch === 'ω' && g.color.every((c, i) => Math.abs(c - linear(LAW.hero)[i]) < 1e-6)), 'the amber ω');
  // The heads: cream fills outlined in Defender's red.
  const cream = linear('#FBF7EE');
  assert.ok(after.vec.filter((v) => v.kind === 'fill' && v.color.every((c, i) => Math.abs(c - cream[i]) < 1e-6)).length >= 10);
});

test('R1-T10 (round 1): the cartouche reads in order — his bytes in one column, top to bottom, E2 80 A2 · 20 CF 89 · 20 E2 80 A2, a wider space between the words', () => {
  const b = cartoucheBytes();
  assert.deepEqual(b.map((x) => x.text).join(' '), SIGNATURE.cartouche.join(' '));
  assert.ok(b.every((x) => x.x === b[0].x), 'one column');
  for (let i = 1; i < b.length; i++) assert.ok(b[i].y > b[i - 1].y, 'top to bottom');
  const steps = b.slice(1).map((x, i) => x.y - b[i].y);
  assert.ok(steps[2] > steps[0] && steps[5] > steps[0], 'word gaps');
  assert.ok(b[0].y > WAVE_CARTOUCHE.y0 + 10 && b[b.length - 1].y < WAVE_CARTOUCHE.y1 - 10, 'inside the slip');
});

test('the colour law in the print: red only on Defender’s boats, boxes, rowers and scan line, and his title in the cartouche until he signs it; amber only on him, his seal, the hulls’ ω, the rowers’ ω and the mountain’s peak', () => {
  const red = linear(LAW.defender.print);
  const amber = linear(LAW.hero);
  const same = (a: readonly number[], b: readonly number[]) => a.every((c, i) => Math.abs(c - b[i]) < 1e-6);
  for (const f of [at(10, 1.5), at(10, 3), at(11, 2), at(11, 3)]) {
    const fr = waveFrame(f);
    fr.layers.forEach((L, i) => {
      const reds = L.vec.filter((v) => (v.kind === 'fill' || v.kind === 'stroke') && same(v.color, red)).length + [...L.glyphs.jp, ...L.glyphs.rounded].filter((g) => same(g.color, red)).length;
      // Layer 7 is the paper: Defender's red title in the cartouche, lifted off on the seal (11.2) as his bytes ink in.
      if (i !== 3 && !(i === 7 && f < D.SEAL + 2)) assert.equal(reds, 0, `layer ${i} has no red at ${f - D.DROP2_START}`);
      const ambers = L.vec.filter((v) => v.kind === 'fill' && same(v.color, amber)).length + [...L.glyphs.jp, ...L.glyphs.rounded, ...L.glyphs.hero].filter((g) => same(g.color, amber)).length;
      if (![1, 3, 6, 7].includes(i)) assert.equal(ambers, 0, `layer ${i} has no amber at ${f - D.DROP2_START}`);
    });
  }
});

test('the downsample (11.4 → 12.1): the scan line waits on the top edge on 11.3&, sweeps down and leaves the bottom on the last frame; above it 4 → 8 → 16 → 32 px on the 16ths', () => {
  assert.equal(scanLineY(D.DOWNSAMPLE.from - 13), null);
  assert.equal(scanLineY(D.DOWNSAMPLE.from - 12), 2);
  const ys = range(D.DOWNSAMPLE.from, D.DOWNSAMPLE.to).map((f) => scanLineY(f)!);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] > ys[i - 1]);
  assert.ok(ys[ys.length - 1] >= 1080);
  assert.deepEqual(D.DOWNSAMPLE_STEPS.map(downsampleCell), [4, 8, 16, 32]);
  assert.equal(downsampleCell(D.DOWNSAMPLE.from - 1), 0);
});

test('sprayAt (contract §6.3, 1055 → 1056): on the wave’s last frame its lit game pixels sit on exactly the 27 copies’ cells of the formation, one each, on the 6 px grid; the empty cells’ pixels have faded', () => {
  const px = sprayAt(D.ARCADE.from - 1).filter((p) => p.on > 0.99);
  const copies: [number, number][] = [];
  for (let c = 0; c < FORMATION.cols; c++) for (let r = 0; r < FORMATION.rows; r++) if (SIGNATURE_BITS[r][c]) copies.push(cellCentre(c, r));
  assert.equal(copies.length, 27);
  assert.equal(px.length, 27);
  for (const p of px) {
    assert.equal(p.x % GP, 0);
    assert.equal(p.y % GP, 0);
    assert.ok(copies.some(([x, y]) => Math.abs(x - p.x) <= GP && Math.abs(y - p.y) <= GP), `(${p.x}, ${p.y}) is a copy's cell`);
  }
  for (const [x, y] of copies) assert.ok(px.some((p) => Math.abs(x - p.x) <= GP && Math.abs(y - p.y) <= GP), `cell (${x}, ${y}) holds a pixel`);
  assert.equal(sprayAt(D.DOWNSAMPLE.from - 1).length, 0);
});

test('D1 (2026-10-02): no kaomoji in the wave’s material — the wave’s pass prints no glyph at all (his infection is amber ink), the crash and the spray only •; the scroll winds back out of the eye as the print inks, so the hollow stays open', () => {
  for (let f = WAVE.from; f < D.DOWNSAMPLE.from; f += 2) {
    const fr = waveFrame(f + 0.5);
    const wave = fr.layers[4];
    assert.ok(wave.vec.length > 50, `layer 4 is the wave at ${f}`);
    assert.equal(wave.glyphs.rounded.length + wave.glyphs.jp.length + wave.glyphs.hero.length, 0, `no glyph in the wave at ${f}`);
    for (const g of [...fr.layers[5].glyphs.rounded, ...fr.layers[5].glyphs.jp, ...fr.layers[5].glyphs.hero]) assert.equal(g.ch, '•', `only spray in the foam at ${f}`);
  }
  const scroll = (to: number): number => lipClaws(1, to).filter((c) => c.row === SCROLL_ROW).length;
  assert.equal(scroll(SCROLL_ROW.s1), SCROLL_ROW.n, 'the whole scroll on the key block (the drafted spiral)');
  for (const c of lipClaws(1, SCROLL_REST)) if (c.row === SCROLL_ROW) assert.ok(rowS(SCROLL_ROW, c.ci - (LIP_CLAWS.length - SCROLL_ROW.n)) < SCROLL_REST + 0.35);
  assert.ok(scroll(SCROLL_REST) <= 0.6 * SCROLL_ROW.n, `wound back to the lip’s tip: ${scroll(SCROLL_REST)} of ${SCROLL_ROW.n}`);
  assert.equal(scroll(3.72), SCROLL_ROW.n);
});

test('the wave is pure: the same instant draws the same frame', () => {
  for (const f of [at(10), at(10, 2.5), at(11, 1.25), at(11, 4.5)]) assert.equal(JSON.stringify(waveFrame(f)), JSON.stringify(waveFrame(f)));
});

test('the crash (11.1): the foam tongues burst from the impact on the kick — 75 % of their reach by + 2, full by + 6 — up and forward over the water (on screen they fill the frame), then curl back and sink into the foam field; none before or after', () => {
  assert.equal(crashClaws(D.WAVE_CRASH - 1).length, 0);
  assert.equal(crashClaws(D.WAVE_CRASH).length, CRASH_TONGUES);
  const reach = (f: number) => Math.max(...crashClaws(f).map((c) => Math.hypot(c.spine[c.spine.length - 1][0] - IMPACT[0], c.spine[c.spine.length - 1][1] - IMPACT[1])));
  assert.ok(reach(D.WAVE_CRASH + 2) > 0.7 * reach(D.WAVE_CRASH + 6), 'fast out');
  assert.ok(reach(D.WAVE_CRASH + 6) * waveCam(D.WAVE_CRASH + 6).zoom ** 1.1 > 700, 'they fill the frame');
  // Up and forward: every root leaves the impact upward.
  for (const c of crashClaws(D.WAVE_CRASH + 4)) assert.ok(c.spine[4][1] < c.spine[0][1], 'upward');
  assert.ok(Math.hypot(CRASH_AT[0] - 960, CRASH_AT[1] - 540) < 700, 'the impact on screen');
  // Draining: they sink (their bases go down) and are gone once it has drained.
  const baseY = (f: number) => Math.min(...crashClaws(f).map((c) => c.spine[0][1]));
  assert.ok(baseY(D.SEAL - 2) > baseY(D.WAVE_CRASH + 12) + 100);
  assert.equal(crashClaws(D.SEAL + 6).length, 0);
});

test('the cartouche is Defender’s print until he signs it: his red title on 10.2 (the boats block), lifted off on the seal (11.2) as the bytes ink in, gone 2 frames later', () => {
  const red = linear(LAW.defender.print);
  const same = (a: readonly number[], b: readonly number[]) => a.every((c, i) => Math.abs(c - b[i]) < 1e-6);
  const title = (f: number) => waveFrame(f).layers[7].glyphs.jp.filter((g) => same(g.color, red)).map((g) => g.ch).join('');
  assert.equal(title(blockAt('boats') - 1), '');
  assert.equal(title(blockAt('boats')), CART_TITLE.replace(/ /g, ''));
  assert.equal(title(D.SEAL - 1), CART_TITLE.replace(/ /g, ''));
  assert.equal(title(D.SEAL + 2), '');
});

test('the fizzle (11.4, last 16th): the quantised world drops out to black in a random order, none before 12.1 − 7, all on 12.1 − 1, so the arcade lands on a clean screen', () => {
  assert.equal(derezAt(D.ARCADE.from - 8), 0);
  assert.equal(derezAt(D.ARCADE.from - 7), 0);
  assert.ok(derezAt(D.ARCADE.from - 4) > 0.2 && derezAt(D.ARCADE.from - 4) < 0.8);
  assert.equal(derezAt(D.ARCADE.from - 1), 1);
  for (let f = D.ARCADE.from - 7; f < D.ARCADE.from - 1; f++) assert.ok(derezAt(f + 1) > derezAt(f));
  assert.equal(waveFrame(D.ARCADE.from - 1).downsample?.derez, 1);
});

test('D3 (the foam looked like hair, the lip turned into planks): the lip’s foam is big forked fingers (two rows, ≤ 40 a row), and the lip stays smooth on every frame of 10–11 — no band quad stretched into a plank, no long straight run in any keyline, from the print-in through the barrel dive and the crash', () => {
  for (const r of [0, 1]) {
    const row = lipClaws(1, SCROLL_REST).filter((c) => c.row === lipClaws(1, SCROLL_REST)[0].row || true).filter((c) => c.row.form === 'finger' && c.row.seed === [300, 400][r]);
    assert.ok(row.length >= 12 && row.length <= 40, `row ${r}: ${row.length} fingers`);
    for (const c of row) assert.ok(c.claw.children.length >= 2 && c.claw.children.length <= 3 && c.claw.children.every((k) => k.children.length === 0), 'each forks once at its tip into 2–3 claws');
  }
});

test('D3 + R2-01 / R2-02 / R2C-01 (round 2: the planks were still on screen while the old D3 test, which saw only layer 4’s quads and two keyline colours, passed): on EVERY frame of 10–11 (864 → 1055), in every layer, every fill, quad and stroke, on screen after the camera — no straight run over 90 px shows (one edge, or a row of collinear edges of several items: a cut through the bands, a strip ending in a straight line), no quad is a plank, and every fill the painter ear-clips is covered whole (no keyline left floating with no fill under it)', () => {
  const bad: string[] = [];
  // R2C-01's rule as written, besides: in layers 4 and 5 no fill edge runs over 90 px inside the frame (covered or not),
  // but along the frame's border.
  const clip = (x0: number, y0: number, x1: number, y1: number): number => {
    let [t0, t1] = [0, 1];
    for (const [p, q] of [
      [x0 - x1, x0],
      [x1 - x0, 1920 - x0],
      [y0 - y1, y0],
      [y1 - y0, 1080 - y0],
    ]) {
      if (p === 0) {
        if (q < 0) return 0;
        continue;
      }
      if (p < 0) t0 = Math.max(t0, q / p);
      else t1 = Math.min(t1, q / p);
    }
    return t1 > t0 ? (t1 - t0) * Math.hypot(x1 - x0, y1 - y0) : 0;
  };
  for (let f = WAVE.from; f < WAVE.to; f++) {
    const fr = waveFrame(f);
    for (const m of [...visibleStraights(fr), ...failedFills(fr)]) bad.push(`${f - D.DROP2_START}: ${m}`);
    for (const li of [4, 5])
      for (const v of fr.layers[li].vec) {
        if (v.kind !== 'fill') continue;
        const n = v.pts.length / 2;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const [x0, y0, x1, y1] = [v.pts[2 * i], v.pts[2 * i + 1], v.pts[2 * j], v.pts[2 * j + 1]];
          const border = (Math.abs(y0 - y1) < 1 && (y0 <= 0 || y0 >= 1080)) || (Math.abs(x0 - x1) < 1 && (x0 <= 0 || x0 >= 1920));
          const d = clip(x0, y0, x1, y1);
          if (d > 90 && !border) bad.push(`${f - D.DROP2_START}: L${li} a fill edge of ${d.toFixed(0)} px in the frame`);
        }
      }
  }
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length} findings`);
});

test('D3 + R2-01: the checker sees what the eye sees — a straight cut through the bands, a strip ending in a straight side, a plank and a self-crossing fill are each caught; a curve and a seam between two pieces of one colour are not', () => {
  const blue = [0.02, 0.05, 0.2] as const;
  const pale = [0.4, 0.5, 0.7] as const;
  const frame = (vec: VecItem[]): WaveFrame => ({ layers: [{ vec, glyphs: { rounded: [], jp: [], hero: [] } }], downsample: null, top: { vec: [], glyphs: { rounded: [], jp: [], hero: [] } }, cam: { fx: 960, fy: 540, zoom: 1, roll: 0 } });
  const ground: VecItem = { kind: 'fill', pts: [-10, -10, 1930, -10, 1930, 1090, -10, 1090], color: [0.8, 0.75, 0.6], alpha: 1, straight: true };
  // Three bands (from off the left edge), each a strip of 6 px quads ending on the same straight line at x = 900 (a cut): caught; with
  // a rounded foam end over the cut, not.
  const strip = (x1: number): VecItem[] =>
    [0, 1, 2].flatMap((b) => Array.from({ length: Math.round((x1 + 30) / 6) }, (_, j): VecItem => ({ kind: 'quad', pts: [-30 + 6 * j, 300 + 60 * b, -24 + 6 * j, 300 + 60 * b, -24 + 6 * j, 360 + 60 * b, -30 + 6 * j, 360 + 60 * b], colors: [blue, blue, pale, pale], alpha: 1 })));
  assert.ok(visibleStraights(frame([ground, ...strip(900)])).length > 0, 'a cut through the bands');
  const cap: VecItem = { kind: 'fill', pts: Array.from({ length: 48 }, (_, j) => [900 + 130 * Math.cos((2 * Math.PI * j) / 48), 390 + 130 * Math.sin((2 * Math.PI * j) / 48)]).flat(), color: [1, 1, 1], alpha: 1 };
  assert.deepEqual(visibleStraights(frame([ground, ...strip(900), cap])), [], 'the cut under a rounded foam end');
  assert.ok(visibleStraights(frame([ground, { kind: 'quad', pts: [100, 100, 400, 100, 400, 300, 100, 300], colors: [blue, blue, blue, blue], alpha: 1 }])).some((m) => m.includes('plank')), 'a plank');
  // Two pieces of one colour meeting on a long straight seam: not a line on screen.
  assert.deepEqual(visibleStraights(frame([ground, { kind: 'fill', pts: [100, 100, 500, 100, 500, 400, 100, 400], color: blue, alpha: 1, straight: true }, { kind: 'fill', pts: [500, 100, 900, 100, 900, 400, 500, 400], color: blue, alpha: 1, straight: true }])), []);
  // A round blob sampled every 10 px: no straight run.
  assert.deepEqual(visibleStraights(frame([ground, { kind: 'fill', pts: Array.from({ length: 160 }, (_, j) => [960 + 250 * Math.cos((2 * Math.PI * j) / 160), 540 + 250 * Math.sin((2 * Math.PI * j) / 160)]).flat(), color: blue, alpha: 1 }])), []);
  // A long straight keyline over the ground: caught.
  assert.ok(visibleStraights(frame([ground, { kind: 'stroke', pts: [100, 900, 700, 860], widths: [6, 6], color: blue, alpha: 1, closed: false }])).length > 0);
  // A pentagram drawn as one self-crossing outline: the painter cannot fill it whole.
  const star = [0, 2, 4, 1, 3].flatMap((k) => [500 + 200 * Math.cos((2 * Math.PI * k) / 5), 500 + 200 * Math.sin((2 * Math.PI * k) / 5)]);
  assert.ok(failedFills(frame([{ kind: 'fill', pts: star, color: blue, alpha: 1 }])).length > 0);
});

test('D3: only the print’s furniture is drawn straight on purpose — the sky’s and the sea’s graded bands and the horizon, the kento marks, the cartouche and the seal, the scan line and the game pixels', () => {
  for (const f of [WAVE.from, D.BLOCKS[4], D.WAVE_CRASH, D.SEAL + 2, D.DOWNSAMPLE.from + 3, WAVE.to - 1]) {
    const fr = waveFrame(f);
    fr.layers.forEach((L, li) =>
      L.vec.forEach((v) => {
        if (!v.straight) return;
        const ok = (li === 0 && v.kind === 'quad') || (li === 2 && (v.kind === 'quad' || (v.kind === 'stroke' && v.pts.length === 4))) || li === 7;
        assert.ok(ok, `${f - D.DROP2_START}: a straight ${v.kind} in layer ${li}`);
      }),
    );
  }
});

test('R2-04 (round 2: the 11.1 crash ramped the luminance 0.45 → 0.55 and did not land; the prow read as a lull): the lip eases in and hits ON 11.1; a foam burst covers ≥ 70 % of the frame on 11.1, + 1 and + 2, breaks up fast (< 40 % on + 4) and is gone by + 9; under it the thrown lip folds back into the nose; then the prow stays alive — the camera moves on every frame, he breathes and sways, the boats rock on the hats, the seal stamps with a recoil', () => {
  // The throw: an impact move, accelerating all the way into the hit (whole half a shutter early, so 11.1 itself shows it landed).
  assert.equal(throwAt(D.WAVE_CRASH - 0.25), 1);
  for (let f = D.WAVE_CRASH - 9; f < D.WAVE_CRASH - 1; f++) assert.ok(throwAt(f + 1) - throwAt(f) > throwAt(f) - throwAt(f - 1), `${f - D.DROP2_START}: the throw accelerates`);
  const cover = (f: number): number => {
    const bs = crashBurst(f);
    let n = 0;
    let all = 0;
    for (let y = 10; y < 1080; y += 20)
      for (let x = 10; x < 1920; x += 20) {
        all++;
        if (bs.some((b) => Math.hypot(x - b.x, y - b.y) < b.r * 0.95)) n++;
      }
    return n / all;
  };
  assert.equal(crashBurst(D.WAVE_CRASH - 1).length, 0);
  for (const f of [D.WAVE_CRASH, D.WAVE_CRASH + 1, D.WAVE_CRASH + 2]) assert.ok(cover(f) >= 0.7, `${f - D.DROP2_START}: ${(cover(f) * 100).toFixed(0)} % foam`);
  assert.ok(cover(D.WAVE_CRASH + 4) < 0.4, `breaking up: ${(cover(D.WAVE_CRASH + 4) * 100).toFixed(0)} %`);
  assert.equal(crashBurst(D.WAVE_CRASH + 9).length, 0);
  // The roll-back is done while the burst still covers most of the frame.
  assert.equal(rollAt(D.WAVE_CRASH + 3.25), 1);
  assert.ok(cover(D.WAVE_CRASH + 3) >= 0.5);
  // The prow (11.2 + 6 → 11.4): never a held frame.
  for (let f = D.SEAL + 6; f < D.DOWNSAMPLE.from; f++) {
    const a = waveCam(f);
    const b = waveCam(f + 1);
    const moved = Math.hypot(b.fx - a.fx, b.fy - a.fy) * b.zoom + Math.abs(b.zoom - a.zoom) * 960 + Math.abs(b.roll - a.roll) * 960;
    assert.ok(moved > 0.4, `${f - D.DROP2_START}: the camera moves ${moved.toFixed(2)} px`);
    const h0 = heroWave(f);
    const h1 = heroWave(f + 1);
    assert.ok(Math.abs(h1.sy - h0.sy) + Math.abs(h1.rot - h0.rot) + Math.hypot(h1.x - h0.x, h1.y - h0.y) / 100 > 0.002, `${f - D.DROP2_START}: he is alive`);
  }
  // The boats rock on the open hats after the seal.
  for (const h of D.OPEN_HATS2.filter((x) => x > D.SEAL && x < D.DOWNSAMPLE.from)) {
    const swing = Math.max(...[1, 2, 3, 4].map((k) => Math.abs(boatBob(1, h + k).tilt - boatBob(1, h - 1).tilt)));
    assert.ok(swing > 3, `${h - D.DROP2_START}: the boats rock ${swing.toFixed(1)}°`);
  }
  // The seal: stamped big, a recoil under 1, settled.
  const seal = (f: number) => waveFrame(f).layers[7].vec.find((v) => v.kind === 'fill' && v.color.every((c, i) => Math.abs(c - linear(LAW.hero)[i]) < 1e-6));
  const side = (f: number) => {
    const p = seal(f)!.pts;
    return Math.hypot(p[2] - p[0], p[3] - p[1]);
  };
  assert.ok(side(D.SEAL) > 104 * 1.3 && side(D.SEAL + 3) < 104 && Math.abs(side(D.SEAL + 9) - 104) < 0.5, `the seal: ${side(D.SEAL).toFixed(0)} → ${side(D.SEAL + 3).toFixed(0)} → ${side(D.SEAL + 9).toFixed(0)} px`);
});
