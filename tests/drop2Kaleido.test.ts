// S31X THE MIRROR TRAP (drop2 16–17, builder act2b): the film's brightest frames on 16.1, the mirrors snapping on the beats (impacts,
// never strobes: N ≤ 64, the wallpaper's cell ≥ 270 px, the spin ≤ 0.5 rev/s — the photosensitivity guards), the rings born on their
// beats, his face at 520 px condensing out of the light and hardening under the ∞, `[DEFENDER] giving up` on 17.4, the reticle that
// flies off past the top-right corner (the guest's hat), the whip into the reel's NEON card (600 px, lit at 0.6). Every frame from the score.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUEST_VARIANTS } from '../src/content/castDrop2.ts';
import { HERO2, SIGNATURE } from '../src/content/drop2.ts';
import { SWAP_LEAD } from '../src/engine/temporal.ts';
import * as D from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import {
  BANDS,
  BIRTH_RADIUS,
  DRUMS,
  GIVING_UP_LINE,
  HERO_WIDTH,
  KAL,
  KALEIDO_STRINGS,
  type KaleidoLayout,
  MIN_CELL,
  RATCHET_HITS,
  STRAIN,
  REEL_LEVEL,
  REEL_WIDTH,
  WHIP_LENGTH,
  bandRadius,
  browsOn,
  desaturation,
  facetsAt,
  heroAlpha,
  heroWidth,
  inkKey,
  kaleidoLook,
  kaleidoSegment,
  kaleidoTemporal,
  lightVeil,
  chamberClock,
  overAt,
  ratchet,
  spinAt,
  strainAt,
  tubeMix,
  wallpaperAt,
  wallpaperScale,
  whipPan,
} from '../src/shots/drop2Kaleido.ts';
import { DROP2_PARTS, HANDOFFS, LAW, RETICLE_HAT, drop2Segment } from '../src/shots/drop2Shared.ts';
import { Drop2Scene } from '../src/scenes/drop2.ts';
import { Drop2Kaleido } from '../src/scenes/drop2Kaleido.ts';

const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
const LAYOUT: KaleidoLayout = {
  advance: { rounded: () => 0.6, jp: () => 1, display: () => 0.6 },
  ink: new Map([[inkKey('rounded', HERO2.base), { left: 0, right: 3, up: 0.4, down: 0.4 }]]),
};

test('the mirror trap is drop2 16–17: the dispatcher sends the kaleido row to Drop2Kaleido (constructible in Node)', () => {
  assert.deepEqual(KAL, { from: at(16), to: at(18) });
  const row = DROP2_PARTS.find((p) => p.name === 'kaleido')!;
  assert.deepEqual([row.from, row.to], [KAL.from, KAL.to]);
  assert.ok(new Drop2Scene().byName.kaleido instanceof Drop2Kaleido);
});

test('the light: 16.1 and the frame after are the white picture (the film’s brightest), falling as the mandala crystallises, gone by + 16', () => {
  assert.equal(lightVeil(D.LIGHT.from), 1);
  assert.equal(lightVeil(D.LIGHT.from + 1), 1);
  assert.ok(lightVeil(D.LIGHT.from + 9) <= 0.5);
  assert.equal(lightVeil(D.LIGHT.from + 16), 0);
  // No vignette nor grain under the white; he condenses out of it.
  assert.equal(kaleidoLook(D.LIGHT.from).vignette, 0);
  assert.equal(heroAlpha(D.LIGHT.from), 0);
  assert.equal(heroAlpha(D.LIGHT.from + 9), 1);
});

test('the hand-offs: his face 520 px at (960, 540) on 16.1 (breathing ±2 %), growing to the reel’s 600 in the whip, its NEON tube lit at 0.6', () => {
  const h = HANDOFFS.find((x) => x.frame === D.LIGHT.from)!;
  assert.equal(h.width, HERO_WIDTH);
  for (const f of range(KAL.from, D.WHIP_REEL.from)) near(heroWidth(f), HERO_WIDTH, 0.021 * HERO_WIDTH, `breathing on ${f}`);
  near(heroWidth(D.WHIP_REEL.to - 1), REEL_WIDTH, 1e-9, 'the reel’s width');
  const reel = HANDOFFS.find((x) => x.frame === D.REEL.from)!;
  assert.equal(reel.width, REEL_WIDTH);
  assert.equal(REEL_LEVEL, 0.6);
  // He takes on the NEON dress inside the blur (not before the whip starts, complete well before its landing).
  assert.equal(tubeMix(D.WHIP_REEL.from), 0);
  assert.equal(tubeMix(D.WHIP_REEL.from + 9), 1);
  // The whip-pan: 0 on 17.4&, its full length and its fastest on the reel's downbeat (I).
  assert.equal(whipPan(D.WHIP_REEL.from), 0);
  near(whipPan(D.WHIP_REEL.to), WHIP_LENGTH, 1e-9, 'landed');
  assert.ok(whipPan(D.WHIP_REEL.to) - whipPan(D.WHIP_REEL.to - 1) > whipPan(D.WHIP_REEL.from + 2) - whipPan(D.WHIP_REEL.from + 1), 'fastest at the end');
});

test('the mirrors: N on each MIRRORS beat (8 → 12 → 16 → 24 → 30, the unfold 12 → 6 → 2), each change an impact over 3 f, never above 64', () => {
  for (const m of D.MIRRORS) assert.equal(facetsAt(m.at), m.n);
  for (let f = KAL.from; f < KAL.to; f += 0.5) assert.ok(facetsAt(f) <= 64 && facetsAt(f) >= 2);
  // Between two counts the change happens only in the 3 frames before the beat (no strobing back and forth).
  for (let i = 1; i < D.MIRRORS.length; i++) {
    const m = D.MIRRORS[i];
    const prev = D.MIRRORS[i - 1].n;
    for (let f = D.MIRRORS[i - 1].at; f <= m.at - 3; f++) assert.equal(facetsAt(f), prev, `held before ${m.at}`);
  }
});

test('the ∞ wallpaper (17.2 → 17.3): hex cells shrinking 1080 → 270 px (never smaller), collapsing back into one mandala on the clamp', () => {
  assert.equal(wallpaperAt(D.WALLPAPER.from - 7), null);
  assert.equal(wallpaperAt(D.CLAMP.from), null);
  near(wallpaperAt(D.WALLPAPER.from)!.cell, 1080, 1e-9, 'the cell on 17.2');
  // A continuous zoom-out (R10): the open cell is the picture itself (scale 1), so the tiling switches on unseen; at the smallest cell each
  // cell shows his eyepiece's heart (± 540 px, scale ¼); the scale only ever falls as the cell shrinks.
  near(wallpaperAt(D.WALLPAPER.from - 6)!.scale, 1, 1e-9, 'open: the picture itself');
  near(wallpaperScale(MIN_CELL), 0.25, 1e-9, 'smallest: ± 540 px');
  for (let c = MIN_CELL; c < 2400; c += 10) assert.ok(wallpaperScale(c + 10) >= wallpaperScale(c), `monotone at ${c}`);
  // It multiplies on the ratchet's hits: the cell's biggest steps are into 17.2& and 17.2a, and it is at its smallest from 17.2a.
  const step = (f: number) => wallpaperAt(f - 1)!.cell - wallpaperAt(f)!.cell;
  const steps = range(D.WALLPAPER.from + 1, D.CLAMP.from - 3).map((f) => [f, step(f)] as const).sort((a, b) => b[1] - a[1]);
  assert.deepEqual(steps.slice(0, 2).map((x) => x[0]).sort((a, b) => a - b), RATCHET_HITS.filter((h) => h > D.WALLPAPER.from && h < D.CLAMP.from));
  // The collapse is the clamp's slam (R10: one burst): still at its smallest on 17.3 − 1, gone on 17.3's instant.
  near(wallpaperAt(D.CLAMP.from - 1)!.cell, MIN_CELL, 1e-9, 'held small into the clamp');
  assert.equal(wallpaperAt(D.CLAMP.from - SWAP_LEAD), null, 'one mandala on the slam');
  // The clamp lands whole on its instant: the grey, the star, the reticles shut — nothing of it on 17.3 − 1.
  assert.equal(desaturation(D.CLAMP.from - 1), 0);
  assert.equal(desaturation(D.CLAMP.from - SWAP_LEAD), 0.5);
});

test('bar 17 ratchets on the build’s hits (R10): the flow, the chamber’s life and the zoom idle between them and land on each', () => {
  assert.deepEqual(RATCHET_HITS, [...new Set(D.BUILD_SNARES2.filter((h) => h >= D.MIRRORS[4].at && h <= D.CLAMP.from))]);
  for (const h of RATCHET_HITS) assert.equal(ratchet(h), h, `on the hit ${h}`);
  assert.equal(ratchet(RATCHET_HITS[0] - 5), RATCHET_HITS[0] - 5, 'a steady clock before');
  assert.equal(ratchet(D.CLAMP.from + 5), D.CLAMP.from + 5, 'and after');
  for (let i = 1; i < RATCHET_HITS.length; i++) {
    const a: number = RATCHET_HITS[i - 1];
    const b: number = RATCHET_HITS[i];
    const steps: number[] = range(a + 1, b + 1).map((f) => ratchet(f) - ratchet(f - 1));
    // The biggest step of each interval is into its hit; the idle runs at ⅓.
    assert.equal(steps.indexOf(Math.max(...steps)), steps.length - 1, `into ${b}`);
    near(ratchet(a + 1) - ratchet(a), 1 / 3, 1e-9, `idle after ${a}`);
    for (let f = a; f < b; f += 0.25) assert.ok(ratchet(f + 0.25) >= ratchet(f), 'never backwards');
  }
  // The spin idles at a tenth between the hits and surges into each, never over the guard.
  const rev = (f: number) => ((spinAt(f + 1) - spinAt(f)) * 60) / (2 * Math.PI);
  for (const h of RATCHET_HITS.slice(1, -1)) assert.ok(rev(h - 1) > 4 * rev(h + 2), `the spin surges into ${h}`);
  // The burst's bands darken into the reel (no light pictograms band on the last 16th of the unfold).
  const last = BANDS[BANDS.length - 1];
  assert.equal(last.at, D.GIVING_UP + 18);
  assert.ok(['voxel', 'wave', 'blueprint'].includes(last.world), last.world);
});

test('the clamp cranks a notch tighter on each of the hold’s hits (17.3e and the cracks’ 32nds), on the hit’s own frame; the burst lets go', () => {
  const hits = D.BUILD_SNARES2.filter((h) => h > D.CLAMP.from && h < D.GIVING_UP);
  assert.deepEqual(STRAIN.hits, hits);
  hits.forEach((h, k) => {
    near(strainAt(h), STRAIN.notch * (k + 1), 1e-9, `on ${h}`);
    near(strainAt(h - 1), STRAIN.notch * k, 1e-9, `held before ${h}`);
  });
  assert.equal(strainAt(hits[0] - 1), 0);
  assert.equal(strainAt(D.GIVING_UP), 0, 'released by the burst');
  // Under the clamp the chamber's clock stops: only the notches move it.
  assert.equal(chamberClock(D.CLAMP.from + 5), chamberClock(D.GIVING_UP - 1));
  let min = Infinity;
  for (let f = D.WALLPAPER.from - 3; f < D.CLAMP.from; f += 0.25) {
    const w = wallpaperAt(f);
    if (w) min = Math.min(min, w.cell);
  }
  near(min, MIN_CELL, 1, 'the smallest cell');
  assert.ok(min >= MIN_CELL - 1e-9);
  assert.equal(MIN_CELL, 270);
});

test('photosensitivity: the mandala never spins faster than 0.5 rev/s', () => {
  for (let f = KAL.from; f < KAL.to - 1; f++) {
    const rev = ((spinAt(f + 1) - spinAt(f)) * 60) / (2 * Math.PI);
    assert.ok(Math.abs(rev) <= 0.5 + 1e-9, `${rev.toFixed(3)} rev/s on ${f}`);
  }
});

test('the rings: PICTOGRAMS, MEMPHIS, VOXEL, WAVE, BLUEPRINT born on their beats at 260 px, flowing outward', () => {
  for (const r of D.KALEIDO_RINGS) assert.ok(BANDS.some((b) => b.at === r.at && b.world === r.world), `${r.world} on ${r.at}`);
  for (const b of BANDS.slice(0, 5)) {
    near(bandRadius(b.at, b.at), BIRTH_RADIUS, 1e-9, 'born at 260');
    assert.ok(bandRadius(b.at, b.at + 24) > BIRTH_RADIUS, 'flowing outward');
  }
  // The flow stops under the clamp.
  near(bandRadius(D.KALEIDO_RINGS[4].at, D.CLAMP.from + 12), bandRadius(D.KALEIDO_RINGS[4].at, D.CLAMP.from), 1e-9, 'held by the clamp');
});

test('he hardens (•̀ω•́) under the ∞ and the clamp; `[DEFENDER] giving up ╮(￣ω￣;)╭` on 17.4 in Defender’s red with an amber ω', () => {
  assert.equal(browsOn(D.WALLPAPER.from - 1), false);
  assert.equal(browsOn(D.WALLPAPER.from), true);
  assert.equal(browsOn(D.GIVING_UP + 12), false);
  assert.equal(GIVING_UP_LINE, `[DEFENDER] giving up ${GUEST_VARIANTS[2].face}`);
  assert.ok(KALEIDO_STRINGS.display.includes(GIVING_UP_LINE));
  for (const b of SIGNATURE.brass) assert.ok(KALEIDO_STRINGS.display.includes(b));
  assert.equal(overAt(D.GIVING_UP - 4, LAYOUT).type.glyphs.display!.length, 0);
  assert.equal(overAt(D.GIVING_UP - 4, LAYOUT).type.under.length, 0);
  const o = overAt(D.GIVING_UP + 6, LAYOUT);
  const line = o.type.glyphs.display!.filter((g) => Math.abs(g.size - 96) < 8);
  assert.equal(line.length, [...GIVING_UP_LINE].filter((c) => c.trim() !== '').length);
  const omega = line.filter((g) => g.ch === 'ω');
  assert.equal(omega.length, 1);
  const red = line.filter((g) => g.ch !== 'ω');
  assert.ok(red.every((g) => g.color[0] > g.color[1] * 3), 'Defender red');
  assert.ok(omega[0].color[0] > omega[0].color[2] * 3 && omega[0].color[1] > omega[0].color[2], 'amber ω');
  void LAW;
});

test('the give-up pill is its own layer, over the eyepiece: none of the ring’s engraved bytes shows through it (review, 2026-10-02)', () => {
  for (const f of range(D.GIVING_UP - 3, KAL.to)) {
    const o = overAt(f, LAYOUT);
    // The pill and its line are drawn by their own pass after the ring (src/scenes/drop2Kaleido.ts): nothing of the line is left in back.
    assert.equal(o.back.glyphs.display!.filter((g) => g.size > 60).length, 0, `no give-up glyph under the ring at ${f}`);
    assert.equal(o.back.under.filter((s) => s.kind === 'rect' && s.color[0] === 1 && s.color[1] === 1 && s.color[2] === 1).length, 0, `no pill in back at ${f}`);
    const pill = o.type.under.filter((s) => s.kind === 'rect');
    assert.equal(pill.length, 1, `one pill at ${f}`);
    assert.ok(o.type.glyphs.display!.length > 0, `its line at ${f}`);
    for (const g of o.type.glyphs.display!) {
      assert.ok(Math.abs(g.y - pill[0].y) < pill[0].h / 2 && Math.abs(g.x - pill[0].x) < pill[0].w / 2, `the line sits on its pill at ${f}`);
    }
  }
});

test('the one reticle that doesn’t fall spins off past the top-right corner, shrinking to the hat’s 30 % (the guest wears it on 19.1)', () => {
  const ringsAt = (f: number) => overAt(f, LAYOUT).back.over.filter((s) => s.kind === 'ring');
  const start = ringsAt(D.HAT_FLIGHT.from);
  const end = ringsAt(D.HAT_FLIGHT.to);
  assert.equal(start.length, 1);
  assert.equal(end.length, 1);
  assert.ok(end[0].x > 960 - 60 && end[0].y > 540 - 60, `past the top-right corner: (${end[0].x.toFixed(0)}, ${end[0].y.toFixed(0)})`);
  near(end[0].w / start[0].w, RETICLE_HAT.scale, 0.05, 'shrunk to the hat');
  assert.equal(ringsAt(D.HAT_FLIGHT.to + 2).length, 0);
});

test('every drum of bars 16–17 moves the picture: the kicks (mirror snaps, the light, the clamp, the give-up) and the snare build (the shards flare)', () => {
  assert.deepEqual(DRUMS.kicks, D.KICKS2.filter((k) => k >= KAL.from && k < KAL.to));
  const events = new Set([...D.MIRRORS.map((m) => m.at), D.LIGHT.from, D.CLAMP.from, D.GIVING_UP, D.WALLPAPER.from]);
  for (const k of DRUMS.kicks) assert.ok(events.has(k), `kick ${k}`);
  assert.ok(DRUMS.snares.length > 0);
});

test('photography: 32 on the light, the snaps, the wallpaper and the clamp; 64 on the whip; drop 2’s segments (no cut: the whip lands continuous)', () => {
  for (const f of range(D.LIGHT.from, D.LIGHT.from + 14)) assert.equal(kaleidoTemporal(f).samples, 32);
  for (const f of range(D.WHIP_REEL.from - 6, D.WHIP_REEL.to)) assert.equal(kaleidoTemporal(f).samples, 64);
  for (const f of [KAL.from, D.WHIP_REEL.to - 1]) assert.deepEqual(kaleidoSegment(f), drop2Segment(f));
  assert.deepEqual(drop2Segment(D.WHIP_REEL.to - 1), drop2Segment(D.REEL.from), 'the whip blends into the reel');
});
