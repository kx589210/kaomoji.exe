// Break bar 1's photography and screen readouts (src/shots/breakFall.ts): the look easing from the club's (on its last frame) to the flat break's
// by break 2.1, the sub-frames the falling glass needs, one segment across 2.1; the party monitor falling away on 1.1 and the REPAIR MODE
// chips. The build sheet: notes/break/break-sheet.md section 3 break bar 1, 4.2, 4.8, 7.1.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHIP_REPAIR, CURSOR } from '../src/content/break.ts';
import { MONITOR_GLYPHS } from '../src/content/drop1.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as BR from '../src/score/break.ts';
import * as F from '../src/shots/breakFall.ts';
import { HUD, hudContent } from '../src/shots/hud.ts';
import { CLUB_BLOOM } from '../src/shots/lines.ts';
import { CLUB_END } from '../src/score/drop1.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const advance = (ch: string): number => (ch === ' ' ? 0.6 : 0.6);
const CREAM_LUMA = 0.2126 * 0.982 + 0.7152 * 0.896 + 0.0722 * 0.686;

test('frame 1920 is photographed exactly as the club photographed 1919, and the look eases to the flat break look by 22.1 — no snap, and the cream paint never blooms', () => {
  assert.deepEqual(F.fallLook(at(1)), { toneMapping: 'linear', exposure: 1, bloom: { ...CLUB_BLOOM }, aberration: 0, grain: 0.05, vignette: 0.22 });
  const end = F.fallLook(at(2));
  assert.deepEqual(end, F.BREAK_LOOK);
  assert.deepEqual(F.BREAK_LOOK, { toneMapping: 'linear', exposure: 1, bloom: { intensity: 0.35, threshold: 1, smoothing: 0.1, radius: 0.7 }, aberration: 0, grain: 0.03, vignette: 0.06 });
  for (let f = at(1); f < at(2); f++) {
    const a = F.fallLook(f);
    const b = F.fallLook(f + 1);
    assert.ok(Math.abs(b.bloom.intensity - a.bloom.intensity) < 0.05 && Math.abs(b.bloom.threshold - a.bloom.threshold) < 0.03 && Math.abs(b.vignette - a.vignette) < 0.01, `no snap at ${f}`);
    if (f >= BR.PLIPS[0]) assert.ok(a.bloom.threshold >= CREAM_LUMA, `the cream does not glow on ${f} (threshold ${a.bloom.threshold.toFixed(3)})`);
  }
});

test('the falling glass is sampled densely enough that it blurs instead of printing copies: no corner moves more than 3.5 px between sub-frames', () => {
  for (let f = at(1); f < at(2); f++) {
    const t = F.fallTemporal(f);
    assert.equal(t.shutter, 0.5);
    assert.ok(t.samples >= (f >= BR.FACE_FALL.from ? 48 : 32), `at least the sheet's count on ${f}`);
    const v = F.fallSpeed(f);
    assert.ok((v * t.shutter) / t.samples <= 3.5, `${f}: ${v.toFixed(0)} px a frame on ${t.samples} sub-frames`);
  }
  // Over the flat world it asks only for what the shard needs (the dispatcher takes the larger count).
  assert.ok(F.fallTemporal(at(2, 1.5) + 2).samples <= 16);
  assert.ok(F.fallTemporal(at(2, 2.625)).samples >= 32, 'the shard turning edge-on');
});

test('one segment from 21.1 to the match cut: frame 2016’s shutter reaches back into the fall, no sub-frame of 1920 reaches the club', () => {
  assert.deepEqual(F.fallSegment(), { from: BR.BREAK_START, to: BR.MATCH_CUT });
  assert.ok(temporalSamples(at(1), F.fallTemporal(at(1)), F.fallSegment()).every((s) => s.frame >= at(1)));
});

test('the party monitor leaves on 21.1: on 1920 it is the club’s 1919 box exactly, its [FATAL] row glitch-sliced on 1920–1921, then the whole box falls away, below the bottom edge by 1940', () => {
  // The club's last drawn box (club 4's last frame; on the 58-bar map the club's held bars hold it up to break 1.1).
  const was = hudContent(CLUB_END - 1, advance);
  const now = F.monitorFall(at(1), advance);
  const fatal = (g: { ch: string; y: number }) => g.y < -540 + HUD.margin + HUD.pitch;
  const box = (c: typeof now) => c.glyphs.mono.filter((g) => !fatal(g));
  assert.deepEqual(box(now).map((g) => [g.ch, g.x, g.y, g.alpha]), box(was).map((g) => [g.ch, g.x, g.y, g.alpha]), 'the same box on 1920');
  assert.ok(now.glyphs.mono.some(fatal), 'the [FATAL] row lights on the thoom');
  assert.notDeepEqual(F.monitorFall(at(1), advance).glyphs.mono.filter(fatal).map((g) => g.x), F.monitorFall(at(1) + 1, advance).glyphs.mono.filter(fatal).map((g) => g.x), 'sliced differently on 1921');
  const g30 = F.monitorFall(at(1, 1.5) - 2, advance).glyphs.mono;
  assert.ok(g30.every((g) => g.y < box(was).find((h) => h.ch === g.ch)!.y + 1), 'it falls');
  assert.ok(F.monitorFall(at(1, 1.75) + 2, advance).glyphs.mono.every((g) => g.y < -540 - 20), 'below the frame by 1940');
  assert.equal(F.monitorFall(at(1, 1.875), advance).glyphs.mono.length, 0);
});

test('the four REPAIR MODE chips decode in the corners on 1944, 1950, 1956, 1962 (TL, TR, BR, BL) — four frames of ramp noise, then the text — blink their cursor and fold into their corners on 22.1', () => {
  assert.deepEqual(F.chipsContent(at(1, 2) - 1, advance).under, []);
  const quadrant = (i: number, x: number, y: number) => (i === 0 || i === 3 ? x < 0 : x > 0) && (i < 2 ? y > 0 : y < 0);
  const text = (f: number, i: number) => (F.chipsContent(f, advance).glyphs.chip ?? []).filter((g) => quadrant(i, g.x, g.y)).sort((a, b) => a.x - b.x);
  const word = [...CHIP_REPAIR].filter((c) => c !== ' ').join('');
  BR.CHIPS.forEach((at, i) => {
    assert.equal(text(at - 1, i).length, 0, `chip ${i} not before ${at}`);
    const noise = text(at, i).map((g) => g.ch).join('');
    assert.notEqual(noise.replace(CURSOR, ''), word, `chip ${i} scrambles first`);
    assert.equal(text(at + 4, i).map((g) => g.ch).join('').replace(CURSOR, ''), word, `chip ${i} reads REPAIR MODE on ${at + 4}`);
  });
  const corners = F.chipsContent(at(1, 4.25) + 2, advance).under;
  assert.equal(corners.length, 4);
  const sides = corners.map((r) => [r.x - r.w / 2, r.x + r.w / 2, r.y + r.h / 2, r.y - r.h / 2]);
  // TL, TR, BR, BL: 48 px from the side edges, 40 px from the top or bottom (engine px: centre origin, y up).
  assert.deepEqual(sides.map(([l, r, t, b], i) => [[0, 3].includes(i) ? l : r, i < 2 ? t : b].map((v) => Math.round(v))), [[-912, 500], [912, 500], [912, -500], [-912, -500]]);
  assert.ok(F.chipsContent(at(2) + 2, advance).under.every((r, i) => r.w < corners[i].w), 'folding on 22.1');
  assert.deepEqual(F.chipsContent(BR.CHIPS_UP.to, advance).under, [], 'gone');
  const cursorOn = (f: number) => text(f, 0).some((g) => g.ch === CURSOR);
  assert.notEqual(cursorOn(at(1, 2.75) - 2), cursorOn(at(1, 3) - 2), 'the cursor blinks 6 on, 6 off');
});

test('every character the fall puts on screen is in the atlas it is drawn from (a missing one throws at render time): the monitor in Drop 1’s MONITOR_GLYPHS, the chips in CHIP_CHARS', () => {
  const mono = new Set(MONITOR_GLYPHS);
  const chip = new Set(F.CHIP_CHARS);
  for (let f = BR.BREAK_START; f < BR.CHIPS_UP.to; f++) {
    for (const g of F.monitorFall(f, advance).glyphs.mono ?? []) assert.ok(mono.has(g.ch), `monitor ${JSON.stringify(g.ch)} on ${f}`);
    for (const g of F.chipsContent(f, advance).glyphs.chip ?? []) assert.ok(chip.has(g.ch), `chip ${JSON.stringify(g.ch)} on ${f}`);
  }
});
