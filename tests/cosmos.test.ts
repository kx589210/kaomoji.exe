// The cosmos (the film part 'cosmos', 6 bars: "VERTIGO ∞ · LIGHTSPEED PRESS", design notes/cosmos3/final.md §3–§7, bars 15–20; build
// sheet notes/bcos/sheet.md §4–§8): its score against the design, part-locally (the design's frames are the 58-bar map's, 15.1 =
// 1344: every pin below is COSMOS.from + the design's offset, so the map may move); the drums, the hook and the readout; the stutter and
// the out hand-off to the comic club; photosensitivity; photography; its camera energy (COSMOS_ACCENTS, merged by src/score/energy.ts);
// the power dial and the look; the cast and the strings; and its dispatcher, which routes every instant to renderer A, B or C (stubs
// until builders A–C land them).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HAS_COLLECTION } from './lib/collection.ts';
import * as CAST from '../src/content/castCosmos.ts';
import * as TXT from '../src/content/cosmos.ts';
import { FONT_FILES, STACKS } from '../src/engine/fonts.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { CosmosScene } from '../src/scenes/cosmos.ts';
import * as CS from '../src/score/cosmos.ts';
import { ACCENTS, PUNCHES, flashAt } from '../src/score/energy.ts';
import { partEnd, partFrame, partStart, partTail } from '../src/score/film.ts';
import { TRANSITION_END } from '../src/score/transition.ts';
import { type RGB, linear } from '../src/engine/color.ts';
import { encodeRGB, luma } from '../src/engine/post/dotScreen.ts';
import { RISO_PRINT_DEFAULTS, packRisoLut, resolveRiso, risoLut, risoPrintAt } from '../src/engine/post/risoModel.ts';
import type { Look } from '../src/engine/types.ts';
import { BAR_LOOK, GROUNDS, PAPER, STAGED_BARS, WHITE_HOT, cosmosLook, cosmosTemporal, powerAt, stageAt } from '../src/shots/cosmosKit.ts';
import { assertOnGrid, assertRigContinuous, jolt, scoreFrames } from './lib/energyAudit.ts';

type TextItem = (typeof TXT.COSMOS_TEXTS)[number];
const { findMissing } = (await import('../scripts/check-glyphs.mjs' as string)) as { findMissing: (texts: readonly TextItem[], cov: Map<string, Set<number>>, stacks: typeof STACKS) => unknown[] };
const { readCoverage } = (await import('../scripts/lib/cmap.mjs' as string)) as { readCoverage: (font: Buffer) => Set<number> };
const KX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** A design frame (58-bar numbering, cosmos 1.1 = 1344) as a film frame on today's map. */
const d = (designFrame: number): number => CS.COSMOS.from + designFrame - 1344;
const { cs, COSMOS } = CS;

test('the cosmos runs from the Big Bang (after the transition’s vacuum) to the comic club’s dot on club 1.1; cs() is 1-based like the sheets; its three renderers tile it two bars each', () => {
  assert.deepEqual({ ...COSMOS }, { from: partStart('cosmos'), to: partEnd('cosmos') });
  assert.equal(COSMOS.from, TRANSITION_END);
  assert.equal(COSMOS.to - COSMOS.from, 6 * 96);
  assert.equal(cs(2, 3.5), partFrame('cosmos', 2, 2.5));
  assert.deepEqual(CS.COSMOS_PARTS.map((p) => [p.id, p.from, p.to]), [['A', COSMOS.from, cs(3)], ['B', cs(3), cs(5)], ['C', cs(5), COSMOS.to]]);
  assert.deepEqual({ ...CS.LEVELS }, { bang: d(1344), earth: d(1440), solar: d(1536), galaxy: d(1632), web: d(1728), horizon: d(1824) });
});

test('every event the cosmos’s score exports — its accents, the stutter’s content frames and the hook’s notes included — sits on the 32nd-note grid', () => {
  assertOnGrid(scoreFrames('cosmos', CS));
  assertOnGrid(CS.STUTTER_SLICES.map((s, i) => [`STUTTER_SLICES[${i}].shows`, s.shows] as const));
  assertOnGrid(CS.HOOK.map((n, i) => [`HOOK[${i}].at`, n.at] as const));
});

test('the design’s timeline, bar by bar (final.md §4), at the design’s offsets', () => {
  const pins: [string, number, number][] = [
    ['BANG', CS.BANG, 1344], ['WHITE.to', CS.WHITE.to, 1350], ['TIME.freeze', CS.TIME.freeze, 1350], ['TIME.restart', CS.TIME.restart, 1416],
    ['SHELL', CS.SHELL, 1368], ['SWEEP', CS.SWEEP, 1380], ['LOCK.from', CS.LOCK.from, 1392], ['REAM', CS.REAM, 1404], ['SLICE', CS.SLICE.at, 1416],
    ['SLICE.held', CS.SLICE.held, 1422], ['SLICE.back', CS.SLICE.back, 1428], ['SPARK', CS.SPARK, 1434],
    ['LANDING', CS.LANDING, 1440], ['TILT_UP', CS.TILT_UP, 1452], ['OUTRUN', CS.OUTRUN, 1464], ['PREDAWN', CS.PREDAWN, 1476], ['SUNRISE', CS.SUNRISE.at, 1488],
    ['SUNRISE.settled', CS.SUNRISE.settled, 1500], ['MOON_BEAM', CS.MOON_BEAM, 1500], ['UNWRAP', CS.UNWRAP.at, 1512], ['WHIP', CS.WHIP.from, 1524],
    ['ORBIT_LAND', CS.ORBIT_LAND.at, 1536], ['ORBIT_LAND.settled', CS.ORBIT_LAND.settled, 1542], ['DIVE', CS.DIVE.from, 1560], ['SLINGSHOT', CS.SLINGSHOT, 1584],
    ['SLOWMO', CS.SLOWMO.from, 1596], ['LAP', CS.LAP.at, 1608], ['LAP.relax', CS.LAP.relax, 1617], ['FLING', CS.FLING.from, 1620],
    ['WARP', CS.WARP, 1632], ['DUST.looms', CS.DUST.looms, 1650], ['DUST.punch', CS.DUST.punch, 1656], ['REVEAL', CS.REVEAL, 1680], ['IGNITION.to', CS.IGNITION.to, 1692],
    ['QUASAR', CS.QUASAR.at, 1704], ['QUASAR.gone', CS.QUASAR.gone, 1716], ['TILT', CS.TILT.from, 1716], ['TILT.streak', CS.TILT.streak, 1722],
    ['MATCH', CS.MATCH, 1728], ['ROLL', CS.ROLL.at, 1752], ['ROLL.settled', CS.ROLL.settled, 1764], ['WALL', CS.WALL, 1776], ['RACK.to', CS.RACK.to, 1788],
    ['SCAN', CS.SCAN.from, 1800], ['WINK', CS.WINK, 1812], ['RETICLE', CS.RETICLE, 1818],
    ['HORIZON', CS.HORIZON.at, 1824], ['HORIZON.twisted', CS.HORIZON.twisted, 1830], ['INFINITY', CS.INFINITY, 1848], ['SANDBOX', CS.SANDBOX, 1872],
    ['STUTTER', CS.STUTTER.from, 1896], ['POINT', CS.POINT.from, 1917],
  ];
  for (const [name, f, design] of pins) assert.equal(f, d(design), `${name}: design ${design}`);
  assert.deepEqual(CS.REAM_PASTES.map((p) => [p.at, p.n]), [[d(1350), 7], [d(1356), 49], [d(1362), 343]]);
  assert.deepEqual(CS.FOUNTAIN.map((p) => [p.at, p.n]), [[d(1416), 343], [d(1422), 2400], [d(1428), 17000], [d(1434), 118000]]);
  assert.deepEqual([...CS.POWERS], [1428, 1431, 1434, 1437].map(d), 'Eames squares rush in a 32nd apart');
  assert.deepEqual([...CS.WAVE_RINGS], Array.from({ length: 13 }, (_, k) => d(1440 + 6 * k)), 'ring k flips at 1440 + 6(k − 1); 13, the antipode, on 1512');
  assert.deepEqual([...CS.RATCHETS], [1548, 1572, 1596].map(d));
  assert.deepEqual(CS.CURSORS.map((c) => [c.at, c.to, c.rings.length]), [[d(1548), d(1596), 2], [d(1554), d(1602), 2], [d(1560), d(1608), 3]], 'a cursor takes 48 f a ring');
  assert.deepEqual(CS.GLANCES.map((g) => [g.from, g.to]), [[d(1644), d(1650)], [d(1668), d(1674)]]);
  assert.deepEqual([...CS.LIGHT_BURSTS], [1686, 1692, 1698].map(d));
  assert.deepEqual([...CS.HOPS], Array.from({ length: 11 }, (_, n) => d(1734 + 6 * n)), 'hop n on 1734 + 6(n − 1): 4 is the discharge, 8 the wall, 11 the 16th before the scan');
  assert.equal(CS.HOPS[3], CS.ROLL.at);
  assert.equal(CS.HOPS[7], CS.WALL);
  assert.deepEqual([...CS.SPAGHETTI], [d(1824), d(1848)], 'the innermost band spaghettifies on the kicks to 1860');
  assert.deepEqual(CS.ORBIT.map((o) => [o.at, o.yaw, o.move]), [[d(1344), -12, 'drift'], [d(1350), -12, 'drift'], [d(1368), 48, 'L'], [d(1386), 52, 'drift'], [d(1392), 70, 'I'], [d(1404), 90, 'L'], [d(1416), 180, 'L']]);
});

test('drums: the drop groove from the bang — a kick every beat to the stutter’s, claps on 2 and 4, open hats on the &s to 6.3&, closed 16ths on the e and the a, the fill into Earth', () => {
  assert.deepEqual([...CS.KICKS], Array.from({ length: 24 }, (_, i) => COSMOS.from + 24 * i));
  assert.deepEqual([...CS.CLAPS], CS.KICKS.filter((_, i) => i % 2 === 1));
  assert.deepEqual([...CS.OPEN_HATS], Array.from({ length: 23 }, (_, i) => COSMOS.from + 12 + 24 * i));
  assert.equal(CS.OPEN_HATS.at(-1), cs(6, 3.5), '6.4& is never played: the stutter shows 6.4’s first 12 frames only');
  assert.equal(CS.HATS.length, 46);
  for (const h of CS.HATS) assert.ok([6, 18].includes((h - COSMOS.from) % 24) && h < CS.STUTTER.from);
  assert.deepEqual([...CS.FILL], [1416, 1422, 1428, 1434].map(d));
  assert.deepEqual(CS.CHORDS.map((c) => [c.at, c.chord]), [[d(1344), 'IV'], [d(1440), 'Vsus'], [d(1488), 'V'], [d(1536), 'iii'], [d(1632), 'vi'], [d(1728), 'IV'], [d(1776), 'V'], [d(1824), 'iii'], [d(1872), 'vi']]);
  assert.equal(CS.CHORDS.at(-1)!.chord, 'vi', 'cosmos 6 ends on vi, so club 1.1’s IV restarts the loop');
  assert.deepEqual(CS.WALTZ_ANSWER.map((n) => [n.at, n.midi]), [[d(1824), 84], [d(1836), 84], [d(1848), 81], [d(1860), 81]], 'the waltz’s answer as bells: C6 C6 A5 A5');
});

test('the hook: drop 1’s rows 0–2 on cosmos 2–4 and the new rows A and B on 5–6, under the music bible’s ceiling (G6), one top note a bar on whatever carries him', () => {
  const rows = [2, 3, 4, 5, 6].map((bar) => CS.HOOK.filter((n) => n.at >= cs(bar) && n.at < (bar === 6 ? COSMOS.to : cs(bar + 1))));
  assert.equal(CS.HOOK.filter((n) => n.at < cs(2)).length, 0, 'no hook under the bang');
  assert.deepEqual(rows[0].map((n) => [n.at, n.midi]), [[1440, 79], [1452, 77], [1458, 79], [1476, 82], [1488, 81], [1506, 79], [1512, 77], [1524, 76]].map(([f, m]) => [d(f), m]));
  assert.deepEqual(rows[1].map((n) => [n.at, n.midi]), [[1536, 79], [1548, 81], [1554, 84], [1572, 83], [1584, 81], [1608, 79], [1620, 81]].map(([f, m]) => [d(f), m]));
  assert.deepEqual(rows[2].map((n) => [n.at, n.midi]), [[1632, 81], [1644, 84], [1650, 86], [1668, 84], [1680, 88], [1704, 86], [1716, 84]].map(([f, m]) => [d(f), m]));
  assert.deepEqual(rows[3].map((n) => [n.at, n.midi]), [[1728, 84], [1740, 86], [1746, 89], [1764, 86], [1776, 91], [1794, 89], [1800, 88], [1812, 86], [1815, 86]].map(([f, m]) => [d(f), m]));
  for (const n of CS.HOOK) assert.ok(n.midi <= 91, `${n.at}: MIDI ${n.midi} over the ceiling G6`);
  for (const r of rows) assert.equal(r.filter((n) => n.top).length, 1, 'one top note a bar');
  assert.deepEqual([...CS.HOOK_TOPS], [1476, 1554, 1680, 1776, 1842].map(d));
  assert.ok(CS.HOOK.find((n) => n.at === d(1800))!.whisper, 'the scan’s E6 is whispered');
  assert.equal(rows[4].at(-1)!.at, CS.STUTTER.from, 'row B’s D6 sits on 6.4, stuttered into the club’s D6');
});

test('the readout: 1 THREAT on the bang, the ream’s 7 · 49 · 343, the fountain to 118k, 8.1×10⁹ as Earth falls, climbing a decade-run each level, the scan’s joke at 2.0×10³⁶, ∞ on 6.2', () => {
  const at = (f: number) => CS.threatsAt(f);
  assert.deepEqual([at(d(1344)), at(d(1350)), at(d(1356)), at(d(1362)), at(d(1415)), at(d(1416)), at(d(1422)), at(d(1428)), at(d(1434)), at(d(1440))], [1, 7, 49, 343, 343, 343, 2400, 17000, 118000, 118000]);
  for (const [f, n] of [[1512, 8.1e9], [1608, 4.2e13], [1704, 9.9e20], [1788, 1.6e33], [1812, 2.0e36]] as const) assert.ok(Math.abs(Math.log10(at(d(f)) / n)) < 1e-9, `${f}: ${at(d(f))} against ${n}`);
  assert.equal(at(CS.INFINITY), Infinity);
  for (let f = COSMOS.from + 1; f < COSMOS.to; f++) assert.ok(at(f) >= at(f - 1), `${f}: the count never falls (it keeps climbing through the scan)`);
  for (let i = 1; i < CS.EXPONENT.length; i++) {
    assert.ok(CS.EXPONENT[i].from >= CS.EXPONENT[i - 1].to, 'the odometer’s rows do not overlap');
    assert.equal(CS.EXPONENT[i].a, CS.EXPONENT[i - 1].b, 'it rolls on from where it stopped');
  }
  assert.deepEqual([CS.EXPONENT[0].a, CS.EXPONENT.at(-1)!.b, CS.EXPONENT.at(-1)!.to], [-7, 29, CS.INFINITY]);
  assert.deepEqual(CS.DEFENDER_LINES.map((l) => [l.text, l.from, l.to]), [['stamp', d(1812), d(1824)], ['sandbox', d(1872), d(1914)], ['done', d(1914), d(1917)]]);
  assert.deepEqual(CS.MONITOR.map((w) => [w.from, w.to]), [[d(1446), d(1494)], [d(1884), d(1911)]]);
});

test('the stutter (approved): 6·6·3·3·3·3 slices from 6.4, each even slice showing the one before’s content, shrinking and turning −30° a slice to the point', () => {
  assert.deepEqual({ ...CS.STUTTER }, { from: cs(6, 4), to: COSMOS.to });
  assert.deepEqual(CS.STUTTER_SLICES.map((s) => [s.at - CS.STUTTER.from, s.shows - CS.STUTTER.from, s.r, s.turn]), [[0, 0, 400, 0], [6, 0, 240, -30], [12, 6, 130, -60], [15, 6, 60, -90], [18, 9, 22, -120], [21, 9, 'point', -150]]);
  const S = CS.STUTTER.from;
  assert.deepEqual(Array.from({ length: 24 }, (_, i) => CS.stutterFrame(S + i) - S), [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 7, 8, 9, 10, 11, 9, 10, 11]);
  assert.equal(CS.stutterFrame(S - 1), S - 1);
  assert.deepEqual(CS.SEGMENTS.slice(-6).map((s) => [...s]), CS.STUTTER_SLICES.map((s, i) => [s.at, CS.STUTTER_SLICES[i + 1]?.at ?? COSMOS.to]), 'every slice its own segment');
});

test('the out hand-off (sheet §6.2, the club’s contract): the last three frames are the point alone — no shutter, no rig, no readout, no Defender line — and nothing of the cosmos straddles club 1.1', () => {
  assert.deepEqual({ ...CS.POINT }, { from: COSMOS.to - 3, to: COSMOS.to });
  assert.equal(CS.STUTTER_SLICES.at(-1)!.r, 'point');
  assert.ok(CS.MONITOR.every((w) => w.to <= CS.POINT.from - 6), 'the monitor closed before the last slices');
  assert.ok(CS.DEFENDER_LINES.every((l) => l.to <= CS.POINT.from), '`sandbox ✓` ends on the last slice but one');
  for (const f of [CS.POINT.from, CS.POINT.from + 1, COSMOS.to - 1]) assert.equal(cosmosTemporal(f).samples, 1, `${f}: a hard step`);
  assert.ok(CS.SUBFRAMES.every((w) => w.to <= COSMOS.to));
  for (const a of CS.COSMOS_ACCENTS) {
    if ((a.shake ?? 0) > 0) assert.ok(Math.min(a.at + 16, a.until ?? Infinity) <= CS.POINT.from, `the shake on ${a.at} is still on at the point`);
    if ((a.punch ?? 0) > 0) assert.ok(a.at + 14 <= CS.POINT.from, `the punch on ${a.at} is still on at the point`);
  }
  const last = cosmosLook(COSMOS.to - 1);
  assert.deepEqual([last.riso?.power, last.bloom.intensity, last.bloom.threshold, last.aberration], [1, 1.15, 0.75, 0], 'full neon, the club’s bloom, no aberration');
  // …and what the film draws there: the live renderer C (through the dispatcher) keeps the same contract on the point's frames.
  const scene = new CosmosScene();
  for (const f of [CS.POINT.from, CS.POINT.from + 1, COSMOS.to - 1]) {
    const l = scene.look(f);
    assert.deepEqual([l.riso?.power, l.bloom.intensity, l.bloom.threshold, l.aberration], [1, 1.15, 0.75, 0], `${f}: the live look is full neon`);
    assert.equal(scene.temporal(f).samples, 1, `${f}: the live renderer steps hard`);
  }
});

test('photosensitivity (design §3.2): the bang is the only white; the reserved block events stand at least 24 f apart but the one 12-frame gap, relight → twist', () => {
  const at = CS.RESERVED_FLASHES.map((r) => r.at);
  assert.deepEqual(at, [1344, 1440, 1488, 1536, 1584, 1632, 1680, 1728, 1800, 1824].map(d));
  const gaps = at.slice(1).map((f, i) => f - (CS.RESERVED_FLASHES[i].to ?? at[i]));
  assert.deepEqual(gaps.filter((g) => g < 24), [12], `gaps ${gaps}`);
  for (let f = COSMOS.from; f < COSMOS.to; f++) assert.equal(flashAt(f), 0, `${f}: the rig never flashes white in the cosmos (its light is the picture’s)`);
  assert.deepEqual(CS.PASTE_FLARES.map((p) => p.at), [d(1440), d(1536), d(1632), d(1728), d(1824)]);
  assert.equal(CS.PASTE_FLARES.at(-1)!.gain, 0.6, 'the twist flare is reduced');
});

test('photography: the segments tile the part (the white, the freeze, the slice, every stutter slice); no sub-frame window crosses one but at one sample; 64 over every fast move', () => {
  for (let i = 1; i < CS.SEGMENTS.length; i++) assert.equal(CS.SEGMENTS[i][0], CS.SEGMENTS[i - 1][1]);
  assert.deepEqual([CS.SEGMENTS[0][0], CS.SEGMENTS.at(-1)![1]], [COSMOS.from, COSMOS.to]);
  assert.deepEqual(CS.SEGMENTS.slice(0, 3).map((s) => s[0]), [d(1344), d(1350), d(1416)]);
  const edges = CS.SEGMENTS.map((s) => s[0]);
  for (const w of CS.SUBFRAMES) for (const e of edges) assert.ok(!(w.from < e && w.to > e) || w.samples === 1, `[${w.from}, ${w.to}) crosses ${e}`);
  for (let f = COSMOS.from; f < COSMOS.to; f++) {
    const t = cosmosTemporal(f);
    const seg = CS.cosmosSegment(f);
    for (const s of temporalSamples(f, t, seg)) assert.ok(s.frame >= seg.from && s.frame < seg.to, `a sub-frame of ${f} leaves its segment`);
    assert.ok(t.samples >= 16 || f >= CS.STUTTER.from, `${f}: ${t.samples}`);
  }
  for (const f of [1346, 1370, 1390, 1420, 1460, 1494, 1530, 1584, 1610, 1625, 1678, 1720, 1758, 1820].map(d)) assert.equal(cosmosTemporal(f).samples, 64, `${f}`);
  assert.equal(cosmosTemporal(d(1584)).shutter, 6, 'the slingshot’s 6-frame shutter');
});

test('camera energy: the bang shakes (6 px); a +4 % punch only on the kicks where the level’s camera does not launch (2.4, 4.4, 5.3, 5.4, 6.3); the stutter jolts each slice; no white; continuous but at the point', () => {
  const punched = PUNCHES.filter((p) => p.at >= COSMOS.from && p.at < COSMOS.to).map((p) => [p.at, p.amount]);
  assert.deepEqual(punched, [1512, 1704, 1776, 1800, 1872].map((f) => [d(f), 0.04]));
  const shakes = ACCENTS.filter((a) => a.at >= COSMOS.from && a.at < COSMOS.to);
  assert.deepEqual(shakes.map((a) => a.at), [d(1344), ...CS.STUTTER_SLICES.slice(0, 5).map((s) => s.at)]);
  assert.ok(shakes.every((a) => a.flash === 0));
  assert.equal(shakes[0].shake * 16, 6, 'the bang: 6 px');
  assert.ok(jolt(CS.BANG) > 2, 'the bang jolts the frame');
  const live = partTail('cosmos') === null ? COSMOS.to : partTail('cosmos')!.from;
  assertRigContinuous(COSMOS.from, Math.min(live, CS.POINT.from), [...CS.STUTTER_SLICES.map((s) => s.at)]);
});

test('the power dial: print → neon, stepped on each level downbeat under its paste flare, ramped behind the ignition and over cosmos 6 to full neon by the stutter’s fourth slice', () => {
  const p = (f: number) => powerAt(f);
  assert.deepEqual([p(d(1344)), p(d(1440)), p(d(1536)), p(d(1632)), p(d(1680)), p(d(1692)), p(d(1728)), p(d(1824))].map((x) => Math.round(x * 1000) / 1000), [0.12, 0.28, 0.48, 0.6, 0.6, 0.85, 0.9, 0.95]);
  assert.equal(p(d(1911)), 1);
  assert.equal(p(COSMOS.from - 1), 0);
  for (let f = COSMOS.from + 1; f < COSMOS.to; f++) assert.ok(p(f) >= p(f - 1) - 1e-12, `${f}: the dial only rises`);
  for (let bar = 1; bar <= 6; bar++) {
    const look = cosmosLook(cs(bar, 1.5));
    assert.equal(look.riso?.night, 1, 'printed at night: space is ink');
    assert.equal(look.riso?.amount, 1);
    if (bar !== 4) assert.equal(look.bloom.intensity, BAR_LOOK[bar - 1].bloom, `bar ${bar}`);
  }
  assert.equal(cosmosLook(cs(4, 1)).bloom.intensity, 0.85);
  assert.equal(cosmosLook(cs(4, 4)).bloom.intensity, 1, 'the bloom rises with the ignition');
});

test('the stage (sheet §9.2, the review’s sheet-look): on cosmos 1–4 printed space lands on the bar’s ground and bare paper on paper → white-hot, light above 1 survives the print, only light blooms, and the 4.3 ignition brightens; cosmos 5–6 keep the press’s own night', () => {
  const LUT = risoLut();
  const PACKED = packRisoLut(LUT);
  const clean = (look: Look) => resolveRiso({ ...look.riso!, offsets: undefined, paperGrain: 0, mottle: 0 });
  const print = (look: Look, sample: (u: number, v: number) => RGB, frag: readonly [number, number] = [960.5, 540.5]) => risoPrintAt(sample, frag, [1920, 1080], clean(look), PACKED, LUT.size);
  const px = (c: RGB) => encodeRGB(c.map((v) => Math.min(1, Math.max(0, v))) as unknown as RGB).map((v) => Math.round(v * 255));
  const hex = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  // The engine's controls are opt-in: the press's own print (the outro's, the old pages) has neither.
  assert.equal(RISO_PRINT_DEFAULTS.levels, null);
  assert.equal(RISO_PRINT_DEFAULTS.hdr, 0);
  assert.equal(STAGED_BARS, 4);
  for (let bar = 1; bar <= 6; bar++) {
    const f = cs(bar, 2.5);
    const look = cosmosLook(f);
    if (bar > STAGED_BARS) {
      assert.deepEqual(stageAt(f), {}, `cosmos ${bar}: unstaged`);
      assert.equal(look.riso?.levels, undefined);
      assert.equal(look.riso?.hdr, undefined);
      continue;
    }
    // The ground: black prints as GROUNDS[bar] (the review asked ±6 luma on the cut; the print itself is exact to 1/255).
    const ground = px(print(look, () => [0, 0, 0]));
    hex(GROUNDS[bar - 1]).forEach((v, c) => assert.ok(Math.abs(ground[c] - v) <= 1, `cosmos ${bar}: black prints ${ground} for ${GROUNDS[bar - 1]}`));
    // The knock-out: white prints as the stage's paper (a whisper of the warm separation's yellow dots, plus whatever neon the power
    // lights), never room-dimmed: a patch's mean luminance within 10 % of the paper's or above it.
    const paper = look.riso!.levels!.paper;
    let white = 0;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) white += luma(print(look, () => [1, 1, 1], [900.5 + x, 500.5 + y])) / 400;
    assert.ok(white >= 0.9 * luma(paper), `cosmos ${bar}: the knock-out is paper (${white.toFixed(3)} vs ${luma(paper).toFixed(3)})`);
    // HDR: a light at 4× keeps its 3 above the print, for the bloom.
    assert.ok(print(look, () => [4, 4, 4]).every((v) => v > 3), `cosmos ${bar}: HDR survives the print`);
    // Only light blooms: the knee sits above the stage paper and below 1.2.
    assert.ok(look.bloom.threshold > luma(paper) && look.bloom.threshold + look.bloom.smoothing <= 1.2, `cosmos ${bar}: bloom knee ${look.bloom.threshold}/${look.bloom.smoothing}`);
  }
  // Paper → white-hot as the power rises (design §8).
  assert.deepEqual(stageAt(cs(1, 2)).levels?.paper, PAPER);
  stageAt(cs(4, 4)).levels!.paper.forEach((v, c) => assert.ok(Math.abs(v - WHITE_HOT[c]) < 1e-9));
  assert.equal(cosmosLook(cs(1, 2)).riso?.hdr, 1);
  // The 4.3 ignition brightens the frame (it used to darken it: the room went out under the light): amber strokes on the ground,
  // printed through the frame's own look (the dispatcher's, so B's reserved power-up is in it).
  const scene = new CosmosScene();
  const amber = linear('#FFB23E').map((v) => v * 1.5) as unknown as RGB;
  const g4 = linear(GROUNDS[3]);
  const strokes = (u: number) => (Math.floor(u * 1920) % 9 < 3 ? amber : g4);
  const mean = (f: number) => {
    let s = 0;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 36; x++) s += luma(print(scene.look(f), (u) => strokes(u), [940.5 + x, 530.5 + y]));
    return s / (12 * 36);
  };
  const before = mean(CS.REVEAL - 1);
  const lit = mean(CS.IGNITION.to);
  assert.ok(lit > before * 1.05, `the ignition brightens: ${before.toFixed(3)} → ${lit.toFixed(3)}`);
});

test('the cast: his forms and the Defender come back; hosts never wear ω, the infected always do; no ￣ω￣ anywhere; the Moon no longer sleeps with his closed eyes; his look into the lens is his alone; the generated file is in sync with its script', () => {
  const all = CAST.COSMOS_CAST.map((f) => f.replace(/\s/gu, ''));
  assert.ok(!all.some((f) => f.includes('￣ω￣')), 'the interlude’s spoiler');
  assert.ok(!all.includes('(－ω－)zzZ') && !all.includes('(－ω－)'), 'the Moon: not his closed eyes (story bible)');
  assert.equal(CAST.HERO_FACES.look, '( ・ω・)?', 'his look back at us (4.1&) is his look into the lens');
  assert.equal(all.filter((f) => f === '(・ω・)?').length, 1, 'his alone: no crowd or host wears it');
  for (const e of [...CAST.EARTH_HOSTS, ...CAST.GALAXY_STARS, ...CAST.WEB_NODES, CAST.MOON_FACES]) {
    assert.ok(!e.host.includes('ω'), `${e.host}: a host wears no ω`);
    if (e.infected) assert.ok(e.infected.includes('ω'), `${e.infected}: infected wears ω`);
  }
  for (const c of Object.values(CAST.CROWDS).flat()) assert.ok(!c.host.includes('ω') && c.infected.includes('ω'));
  for (const p of CAST.PLANETS) assert.ok(p.infected.includes('ω'), `${p.name}`);
  assert.equal(new Set(CAST.REAM_FACES).size, 24);
  assert.ok(!CAST.BANG_PARTS.includes('ω'), 'ω is his: the bang’s debris has none');
  assert.equal(CAST.HERO_FACES.face, '(•ω•)');
  assert.equal(CAST.DEFENDER_FACE, '(￣▽￣)');
  if (!HAS_COLLECTION) return; // the casting script reads the unpublished collection (tests/lib/collection.ts)
  const printed = execFileSync(process.execPath, [path.join(KX, 'scripts', 'castCosmos.mjs'), '--print'], { cwd: KX, encoding: 'utf8' });
  assert.equal(printed.replace(/\r\n/gu, '\n'), fs.readFileSync(path.join(KX, 'src', 'content', 'castCosmos.ts'), 'utf8').replace(/\r\n/gu, '\n'), 're-run scripts/castCosmos.mjs');
});

test('the strings: every character draws in its role’s stack; the signature is • ω • in UTF-8 and never sits beside a • or an ω; exponents are raised runs with U+2212, never superscript code points', () => {
  const byFamily = new Map<string, Set<number>>();
  for (const f of FONT_FILES) byFamily.set(f.family, new Set([...(byFamily.get(f.family) ?? []), ...readCoverage(fs.readFileSync(path.join(KX, 'public', f.file)))]));
  assert.deepEqual(findMissing(TXT.COSMOS_TEXTS, byFamily, STACKS), []);
  assert.equal(TXT.SIGNATURE, 'E2 80 A2 20 CF 89 20 E2 80 A2');
  for (const t of [TXT.SLUG, TXT.SIGNATURE]) assert.ok(!/[•ω]/u.test(t), `${t}: never decoded`);
  for (const t of [...TXT.DISPLAY_TEXTS, ...TXT.MONO_TEXTS]) assert.ok(!/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/u.test(t), `${t}: raised digits, not superscripts`);
  assert.deepEqual(TXT.raisedRuns(TXT.LEVEL_TYPE.bang.label), [{ text: '10', raised: false }, { text: '−7', raised: true }, { text: ' m', raised: false }]);
  assert.equal(TXT.plain(TXT.scaleLabel(-7)), '10−7 m');
  assert.deepEqual([TXT.shortCount(343), TXT.shortCount(2400), TXT.shortCount(17000), TXT.shortCount(118000), TXT.groupDigits(8.1e9)], ['343', '2.4k', '17k', '118k', '8,100,000,000']);
  assert.deepEqual([TXT.sciCount(8.1e9), TXT.sciCount(4.2e13), TXT.sciCount(9.9e20), TXT.sciCount(1.6e33), TXT.sciCount(2.0e36), TXT.sciCount(Infinity)].map(TXT.plain), ['8.1×109', '4.2×1013', '9.9×1020', '1.6×1033', '2.0×1036', '∞']);
  for (const [id, a] of Object.entries(TXT.COSMOS_ATLASES)) for (const ch of a.chars) assert.ok(ch.trim() !== '', `${id}: no space in an atlas`);
  for (const l of Object.values(TXT.LEVEL_TYPE)) for (const ch of TXT.plain(l.label).replace(/\s/gu, '')) assert.ok(TXT.COSMOS_ATLASES.display.chars.includes(ch), `${ch} in the display atlas`);
});

test('the dispatcher sends every instant to the renderer whose two bars hold it (A 1–2, B 3–4, C 5–6), takes the score’s segments and each renderer’s look and sub-frames; constructible in Node', () => {
  const scene = new CosmosScene();
  const want = (f: number) => (f < cs(3) ? scene.parts.A : f < cs(5) ? scene.parts.B : scene.parts.C);
  for (const f of [COSMOS.from - 0.3, COSMOS.from, cs(2, 4.5), cs(3) - 0.25, cs(3), cs(4, 4.5), cs(5) - 0.1, cs(5), cs(6, 4), COSMOS.to - 1, COSMOS.to + 0.4]) assert.equal(scene.partAt(f), want(f), `${f}`);
  // The renderers are live (A src/scenes/cosmosAPart.ts, B cosmosBSling.ts, C cosmosCPart.ts): each output frame's look and sub-frames
  // are the holding renderer's own (they start from cosmosKit's and override where the sheet lets them: the bang's white, B's shutter,
  // C's stutter), and the segments stay the score's.
  for (const f of [COSMOS.from, cs(2, 2), cs(3, 3), cs(4, 3), cs(5, 4), CS.STUTTER.from + 7, COSMOS.to - 1]) {
    assert.deepEqual(scene.segment(f), CS.cosmosSegment(f));
    assert.deepEqual(scene.temporal(f), want(f).temporal(f));
    assert.deepEqual(scene.look(f), want(f).look(f));
    assert.equal(scene.look(f).riso?.night, 1, `${f}: the night print all through`);
  }
});
