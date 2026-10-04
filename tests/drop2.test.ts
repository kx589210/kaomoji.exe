// Drop 2, the film's part 'drop2' (20 bars, "THE VIRUS WAR"): its score's pins — above all KEEP-FIRST, the approved bars of the v04
// master carried by whole bars with every value they had — the energy standard over its frames, the character flash, the segments and
// the parts the scene dispatches to (the stubs included), the honest stutter (E9), the seam with the break, the shared contracts, the
// colour law, the signature and the readout, and drop 2's strings. The build sheet these pins come from is notes/bid2/drop2-sheet2.md
// (the as-built bars: notes/d2build/sheet.md). Builders add their own tests/drop2<Name>.test.ts. Every frame is written in drop 2's
// own bars (at(bar, beat), 1-based, as src/score/drop2.ts writes them), so the pins move with the part when bars are inserted before it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAST_DROP2, GUEST_VARIANTS } from '../src/content/castDrop2.ts';
import { DROP2_EXTRUDE, DROP2_SLATES, DROP2_TEXTS, HERO2, READOUT2, SCOREBOARD, SIGNATURE, SIGNATURE_BYTES } from '../src/content/drop2.ts';
import { FLAT_LOOK } from '../src/engine/types.ts';
import { IDENTITY_VIEW } from '../src/engine/view.ts';
import { Drop2Scene } from '../src/scenes/drop2.ts';
import { Drop2Held, Drop2Stub, partSpan, slateContent } from '../src/scenes/drop2Stub.ts';
import { glyphAmount } from '../src/score/cuts.ts';
import * as D2 from '../src/score/drop2.ts';
import { flashAt, rigAt } from '../src/score/energy.ts';
import { builtEnd, partBar, partEnd, partFrame, partStart, partTail, seedFrame, v07Frame } from '../src/score/film.ts';
import { OUTRO_START } from '../src/score/outro.ts';
import { SECTIONS, SHOTS, shotFrames } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import { barFrame } from '../src/score/tempo.ts';
import { heroPose, launchCam, omegaOnScreen } from '../src/shots/breakLaunch.ts';
import { HERO_ADVANCE } from '../src/shots/breakShared.ts';
import * as SH from '../src/shots/drop2Shared.ts';
import * as SL from '../src/shots/drop2Slash.ts';
import { assertFlashesRare, assertOnGrid, assertRigContinuous, scoreFrames } from './lib/energyAudit.ts';

const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const sorted = (xs: readonly number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
/** Drop 2's bar `bar`, beat `beat` (both 1-based; drop2 1.1& is at(1, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const { DROP2_START: A, DROP2_END: B } = D2;

// ——— The v04 layout, for KEEP-FIRST ————————————————————————————————————————————————————————————————————————————————————————————
/** Where the as-built drop 2 (8 bars, the v04 master) had drop2 `bar`.`beat`, on today's map (its first 8 bars). */
const old = at;
/** Where an as-built frame of drop 2 is now: bars 1–4 stay, 5–6 move one bar (the crane's), 7–8.4& move 11 (the kernel, the switch, act 2), the drain 12 (the bullet time). */
const carry = (f: number): number => {
  const l = f - A;
  return f + (l < 384 ? 0 : l < 576 ? 96 : l < 756 ? 1056 : 1152);
};
/** The carried spans (CARRIED): the frames of drop 2 that draw an approved bar. */
const carried = (f: number): boolean => D2.CARRIED.some((c) => f >= c.from && f < c.to);
const inCarried = (xs: readonly number[]): number[] => xs.filter(carried);

test('drop 2 runs from its downbeat to bridge B’s (v08: the bar before the outro), built through on its 20 bars (no held tail): drawn by drop 2’s scene, and KX-Drop2 renders exactly it', () => {
  assert.deepEqual([A, B], [partStart('drop2'), partEnd('drop2')]);
  assert.equal(builtEnd('drop2'), partEnd('drop2'));
  assert.equal(partTail('drop2'), null);
  assert.deepEqual(SPANS.filter((s) => s.key === 'drop2'), [{ from: A, to: B, key: 'drop2' }]);
  const s = SECTIONS.find((x) => x.id === 'drop2')!;
  assert.deepEqual([barFrame(s.fromBar), barFrame(s.toBar + 1)], [A, partEnd('drop2')], 'KX-Drop2');
  assert.equal(partStart('bridgeB'), B);
  assert.equal(OUTRO_START, partEnd('bridgeB'), 'bridge B (a stub holding drop 2’s last frame) sits between drop 2 and the outro');
  assert.equal(B - A, 20 * 96);
});

test('KEEP-FIRST: the approved bars tile drop 2’s carried spans, each mapped to its v04 frames; the map’s seeds take every whole carried bar back to v04 (sheet §1)', () => {
  const v04 = seedFrame(A);
  assert.deepEqual(
    D2.CARRIED.map((c) => [c.shot, c.from - A, c.to - A, c.v04 - v04, c.keep]),
    [
      ['S27', 0, 96, 0, 'identical'],
      ['S28', 96, 192, 96, 'identical'],
      ['S29', 192, 384, 192, 'changed'],
      ['S30', 480, 576, 384, 'changed'],
      ['S31', 576, 672, 480, 'identical'],
      ['S32', 1632, 1728, 576, 'identical'],
      ['S32', 1728, 1812, 672, 'identical'],
      ['T7', 1908, 1920, 756, 'changed'],
    ],
  );
  for (const c of D2.CARRIED) {
    assert.equal(carry(c.v04 - v04 + A), c.from, `${c.what} lands where carry() says`);
    for (let f = c.from; f < c.to; f += 7) assert.equal(D2.v04Of(f), c.v04 + (f - c.from), `${c.what} ${f}`);
  }
  // The whole-bar spans seed as v04 (the grain, the shakes, every hash the approved bars drew); the drain's 12 frames moved inside a bar.
  for (const c of D2.CARRIED.filter((x) => x.shot !== 'T7')) for (let f = c.from; f < c.to; f += 5) assert.equal(seedFrame(f), D2.v04Of(f), `seed of ${f}`);
  for (const f of [at(5), at(8), at(12, 2.5), at(17, 4), at(19, 4.5), at(20)]) assert.equal(D2.v04Of(f), null, `${f} is new`);
  assert.equal(seedFrame(at(5)), v07Frame(at(5)), 'a new bar seeds with its own frames (as on the 61-bar map, where it was approved: v08’s bridge A moved drop 2 a bar)');
  // The crash shot's clock: v04's around the bullet time, so the drain runs as built.
  assert.equal(D2.crashClock(D2.CRASH), D2.CRASH);
  assert.equal(D2.crashClock(D2.BULLET.from - 1), D2.BULLET.from - 1);
  for (const f of [D2.BULLET.from, D2.BULLET.from + 40, D2.BULLET.to - 1]) assert.equal(D2.crashClock(f), D2.BULLET.from - 1, `held at ${f}`);
  assert.equal(D2.crashClock(D2.BULLET.from + 10.25), D2.BULLET.from - 1 + 0.25, 'a sub-frame keeps its offset');
  assert.equal(D2.crashClock(D2.DRAIN.from) - D2.CRASH, old(8, 4.5) - old(8, 3), 'the drain starts as long after the crash as it did');
  assert.equal(D2.crashClock(B - 1) - D2.CRASH, old(9) - 1 - old(8, 3), 'and ends there');
});

test('KEEP-FIRST: every event the approved bars drew is where it was, moved with its bar — the drums under them too', () => {
  // The as-built lists (notes/d2build/sheet.md §6), carried.
  const KICKS = sorted([...steps(old(1), old(8, 3), 24), old(8, 1.5), old(8, 2.5)]);
  const CLAPS = [1, 2, 3, 4, 5, 6, 7].flatMap((b) => [old(b, 2), old(b, 4)]).concat(old(8, 2));
  const HATS = steps(old(1), old(8, 3), 6);
  const OPEN = steps(old(1) + 12, old(8), 24);
  const RIMS = steps(old(1) + 18, old(7), 24);
  for (const [name, now, was] of [
    ['KICKS2', D2.KICKS2, KICKS],
    ['CLAPS2', D2.CLAPS2, CLAPS],
    ['HATS2', D2.HATS2, HATS],
    ['OPEN_HATS2', D2.OPEN_HATS2, OPEN],
    ['RIMS2', D2.RIMS2, RIMS],
  ] as const) {
    assert.deepEqual(inCarried(now), sorted(was.map(carry)).filter(carried), `${name} under the approved bars`);
  }
  const moved: [string, unknown, unknown][] = [
    ['BLADES', D2.BLADES, [old(1), old(1, 2), old(1, 3), old(1, 3.5), old(1, 4)]],
    ['W1', D2.W1, { from: old(1) + 6, to: old(1, 3) + 12 }],
    ['W2', D2.W2, { from: old(2, 3), to: old(3) }],
    ['W3', D2.W3, { from: old(4, 2), to: old(4, 4) }],
    ['TURNS', D2.TURNS.map((t) => t.from), [old(1, 4.5), old(2, 1.5), old(2, 2.5), old(2, 3.5)]],
    ['WHIP', D2.WHIP, { from: old(2, 4.5), to: old(3) }],
    ['DONUT', D2.DONUT, { from: old(3, 3), to: old(4, 1.5) }],
    ['BLINK2', D2.BLINK2, { close: old(4, 4), shut: old(4, 4) + 3, open: old(4, 4) + 6, done: old(4, 4.5) }],
    ['COLLAPSE', D2.COLLAPSE, { from: old(4, 4.5), to: old(5) - 3 }],
    ['W4', D2.W4, { from: carry(old(5, 2)), to: carry(old(5, 4.5)) }],
    ['NOTES_KICK', D2.NOTES_KICK, [old(5), old(5, 2), old(5, 3), old(5, 4)].map(carry)],
    ['NOTES_CLAP', D2.NOTES_CLAP, [old(5, 2), old(5, 4)].map(carry)],
    ['ROLL31', D2.ROLL31, [...steps(old(5, 2.5), old(5, 3.5), 6), ...steps(old(5, 3.5), old(5, 4), 3)].map(carry)],
    ['DISC', D2.DISC, { from: carry(old(5, 4) - 15), to: carry(old(5, 4)) }],
    ['SCRUB', D2.SCRUB, carry(old(5, 3))],
    ['TILT', D2.TILT, { from: carry(old(5, 4.5)), to: carry(old(6)) }],
    ['SURF', D2.SURF, [old(6), old(6, 2), old(6, 3), old(6, 4)].map(carry)],
    ['WRAP', D2.WRAP, carry(old(6, 4.5))],
    ['SNARE32_32', D2.SNARE32_32, steps(old(6, 4), old(7), 3).map(carry)],
    ['PAN.from', D2.PAN.from, carry(old(6, 4.5))],
    ['REEL', D2.REEL, { from: carry(old(7)), to: carry(old(8)) }],
    ['CUTS2', D2.CUTS2.slice(1), [old(7, 2), old(7, 3), old(7, 4)].map(carry)],
    ['WIPES', D2.WIPES, [old(7, 1.5), old(7, 2.5), old(7, 3.5)].map(carry)],
    ['REEL_BLADES', D2.REEL_BLADES, steps(old(7, 4.5), old(8), 3).map(carry)],
    ['ROLL33', D2.ROLL33, sorted([...steps(old(7), old(7, 3), 12), ...steps(old(7, 3), old(8), 6), ...steps(old(7, 4.5), old(8), 3)]).map(carry)],
    ['LATCH', D2.LATCH, carry(old(8))],
    ['SATURATE', D2.SATURATE, [old(8), old(8, 1.5), old(8, 2), old(8, 2.5)].map(carry)],
    ['ROLL34', D2.ROLL34, steps(old(8), old(8, 3), 3).map(carry)],
    ['GUEST', D2.GUEST, carry(old(8))],
    ['DRIP', D2.DRIP, carry(old(8) + 6)],
    ['CRASH', D2.CRASH, carry(old(8, 3))],
    ['SORT', D2.SORT, { from: carry(old(8, 3) + 3), to: carry(old(8, 4)) }],
    ['RINGS', D2.RINGS, [old(8, 4), old(8, 4) + 6].map(carry)],
    ['DRAIN.from', D2.DRAIN.from, carry(old(8, 4.5))],
    ['STUTTER_RATES', D2.STUTTER_RATES.map((r) => r.at), [old(7, 4.5), old(8), old(8, 1.5), old(8, 2), old(8, 2.5)].map(carry)],
  ];
  for (const [name, now, was] of moved) assert.deepEqual(now, was, name);
  assert.deepEqual(D2.HOOK2.filter((n) => n.at < at(5)).length, 30, 'the hook rows 1–4 as built');
  assert.deepEqual(D2.NOTES_VOX, [old(5), old(5, 1.5), old(5, 1.75), old(5, 2.5), old(5, 3), old(5, 4), old(5, 4.5)].map(carry), 'the VOX lane: hook row 5, as built');
});

test('every event drop 2’s score exports — its accents included — sits on the 32nd-note grid', () => {
  assertOnGrid(scoreFrames('drop 2', D2));
});

test('through drop 2 no edge of the frame ever shows, nothing snaps but at the hard cuts and the freeze, and the only white is the drop on drop2 1.1', () => {
  assertRigContinuous(A, B, D2.SEGMENT_CUTS);
  assertFlashesRare(A, B, [A]);
  assert.ok(flashAt(A) >= 0.8, 'the drop’s white on drop2 1.1');
  for (const f of [D2.POP, D2.FULL_COMBO, D2.GIVING_UP, D2.REEL.from]) assert.ok(flashAt(f) >= 0.15 && flashAt(f) <= 0.25, `a light bump on ${f}: ${flashAt(f)}`);
  for (const w of [D2.WHIP, D2.PAN, D2.WHIP_REEL]) for (let f = w.from; f < w.to; f++) assert.ok(flashAt(f) < 0.05, `no rig white over a whip: ${f}`);
  for (const f of [D2.BURST, D2.WAVE_CRASH, D2.LIGHT.from]) assert.ok(flashAt(f) < 0.05, `${f}: the paper, the foam and the light are pictures, not the rig’s white`);
});

test('drop 2’s finale holds still for the honest stutter: from the reel blades to the end the rig adds nothing (the bullet time’s camera is its own)', () => {
  for (let f = D2.REEL_BLADES[0] + 3; f < B; f++) assert.deepEqual(rigAt(f), IDENTITY_VIEW, `rig at ${f}`);
});

test('drop 2’s camera energy: the approved bars keep their accents (moved with them), the new bars take the design’s, act 2 punches every world’s downbeat', () => {
  const asBuilt = [
    { at: old(1), punch: 0.12, flash: 0.8, shake: 1 },
    ...[old(1, 2), old(1, 3), old(1, 4)].map((f) => ({ at: f, punch: 0.04 })),
    ...[old(2), old(2, 2), old(2, 3), old(2, 4)].map((f) => ({ at: f, punch: 0.03 })),
    { at: old(3), punch: 0.07, flash: 0.2 },
    ...[old(3, 2), old(3, 3), old(3, 4), old(4), old(4, 2), old(4, 3), old(4, 4)].map((f) => ({ at: f, punch: f === old(4) || f === old(4, 3) ? 0.05 : 0.04 })),
    { at: carry(old(5, 2)), punch: 0.04 },
    { at: carry(old(5, 3)), punch: 0.04 },
    { at: carry(old(5, 4)), punch: 0.07, flash: 0.2, shake: 0.4 },
    { at: carry(old(6)), punch: 0.05, shake: 0.2 },
    { at: carry(old(6, 2)), punch: 0.05 },
    { at: carry(old(6, 3)), punch: 0.05 },
    { at: carry(old(6, 4)), punch: 0.05, shake: 0.25 },
    { at: carry(old(7)), punch: 0.08, flash: 0.2, shake: 0.6 },
    ...[old(7, 2), old(7, 3), old(7, 4)].map((f) => ({ at: carry(f), punch: 0.06 })),
  ];
  // S29's review fixes are live (§1.3 D): bars 3–4 take ZBUF2_ACCENTS (0.05 on every kick, the pop's bump lighter) — all but bar 4's kept
  // frame (4.4, BAR4), whose punch stays the as-built 0.04 so 360–371 draw v04 (§1.3 P).
  assert.equal(D2.ZBUF2_LIVE, true, 'S29’s review fixes are live');
  const zbufFixed = (f: number): boolean => f >= old(3) && f < old(5) && f !== old(4, 4);
  assert.deepEqual(
    D2.DROP2_ACCENTS.filter((a) => carried(a.at) && !(a.at === carry(old(5))) && !zbufFixed(a.at)),
    asBuilt.filter((a) => carried(a.at) && !zbufFixed(a.at)),
  );
  assert.deepEqual(D2.DROP2_ACCENTS.find((a) => a.at === D2.BAR4.from), { at: old(4, 4), punch: 0.04 }, 'bar 4’s frame keeps its as-built punch');
  assert.deepEqual(D2.DROP2_ACCENTS.filter((a) => zbufFixed(a.at)), D2.ZBUF2_ACCENTS.filter((a) => a.at !== D2.BAR4.from));
  for (let i = 1; i < D2.DROP2_ACCENTS.length; i++) assert.ok(D2.DROP2_ACCENTS[i].at > D2.DROP2_ACCENTS[i - 1].at, `in order at ${D2.DROP2_ACCENTS[i].at}`);
  const peakZoom = (k: number) => Math.max(...[0.5, 1, 1.5, 2, 3].map((d) => rigAt(k + d).zoom));
  assert.ok(peakZoom(A) > peakZoom(partStart('cosmos')), 'drop2 1.1 launches bigger than drop 1');
  for (const k of [D2.KERNEL.from, D2.SWITCH.from, D2.BURST, D2.WAVE_CRASH, D2.TOTEM, D2.LIGHT.from, D2.CLAMP.from, D2.GIVING_UP]) assert.ok(peakZoom(k) > 1.05, `the big hit ${k}: ${peakZoom(k).toFixed(3)}`);
});

test('the drums: the carried bars’ hits, the new grooves — half time on 9, double time on 12–13 — and the kick always on the beat but in the half-time bar and the stuck bar', () => {
  for (const b of [...Array(20).keys()].map((k) => k + 1)) {
    const kicks = D2.KICKS2.filter((k) => k >= at(b) && k < at(b + 1));
    if (b === 9) assert.deepEqual(kicks, [at(9), at(9, 2.5)], 'half time');
    else if (b === 19) assert.deepEqual(kicks, steps(at(19), at(19, 3), 12), 'the racing heart to the crash');
    else if (b === 20) assert.deepEqual(kicks, [], 'the bullet time: heartbeats only');
    else assert.deepEqual(kicks, [1, 2, 3, 4].map((k) => at(b, k)), `bar ${b}: four on the floor`);
  }
  for (const c of D2.CLAPS2) assert.ok(D2.KICKS2.includes(c) || c === at(9, 3), `the clap on ${c} lands with a kick (but the half-time backbeat)`);
  assert.deepEqual(D2.CLAPS2.filter((c) => c >= at(12) && c < at(14)), [], 'double time: the snare on the &s instead');
  assert.deepEqual(D2.SNARES2, [12, 13].flatMap((b) => [1.5, 2.5, 3.5, 4.5].map((k) => at(b, k))));
  assert.deepEqual(D2.HATS2.filter((h) => h >= at(9) && h < at(10)), [...steps(at(9), at(9, 3), 12), ...steps(at(9, 4), at(10), 6)], 'the half-time bar: 8ths, the held breath, the rising 16ths');
  assert.deepEqual(D2.HATS2.filter((h) => h >= D2.CRASH), [], 'nothing after the crash');
  assert.ok(D2.SHAKER2.every((h) => D2.HATS2.includes(h)));
  assert.deepEqual(D2.TAIKO2, beats([10, 11]));
  // v07 (§3, the wave-start noise): 10.1’s kick 1 → 0.75 — the beat is loud by its voices, not by a kick driven into the clip.
  assert.ok(D2.KICK_GAINS2.find((k) => k.at === D2.BURST)!.gain === 0.75, '10.1: the film’s loudest beat, its kick at 0.75');
});
const beats = (bars: number[]): number[] => bars.flatMap((b) => [1, 2, 3, 4].map((k) => at(b, k)));

test('the harmony: F♯ major, never its tonic; the antivirus’s borrowed chords in the switch and the last stand; the music’s five-chord list is a subset that holds through them', () => {
  const names = new Set(D2.HARMONY2.map((c) => c.chord));
  assert.ok(!names.has('I' as never), 'no tonic in drop 2');
  assert.deepEqual(D2.HARMONY2.filter((c) => c.at >= at(9) && c.at < at(10)).map((c) => c.chord), ['bVI', 'iv', 'V7b9']);
  assert.deepEqual(D2.HARMONY2.filter((c) => c.at >= at(17) && c.at < at(18)).map((c) => c.chord), ['bVI', 'bVII', 'V7']);
  for (const c of D2.CHORDS2) assert.ok(['IV', 'Vsus', 'V', 'iii', 'vi'].includes(c.chord), `${c.at} ${c.chord}: one drop2.mjs voices`);
  for (const c of D2.CHORDS2) assert.ok(D2.HARMONY2.some((h) => h.at === c.at), `${c.at} is a change of the harmony`);
  for (const launch of [at(10), at(18)]) assert.equal(D2.HARMONY2.find((c) => c.at === launch)!.chord, 'IV', `${launch}: every launch lands on IV`);
});

test('the hook: rows 1–4 as built, bar 5 row 4’s figure a third up (the game’s kana), bar 6 row 5 as built (its VOX notes); every note in F♯ major; act 2 re-voices the rows', () => {
  const FSHARP = [6, 8, 10, 11, 1, 3, 5];
  for (const n of [...D2.HOOK2, ...D2.HOOK2_ACT2]) assert.ok(FSHARP.includes(n.midi % 12), `${n.midi} on ${n.at} is in F♯ major`);
  const row = (b: number) => D2.HOOK2.filter((n) => n.at >= at(b) && n.at < at(b + 1));
  assert.deepEqual(row(5).map((n) => [n.at - at(5), n.len]), row(4).map((n) => [n.at - at(4), n.len]), 'row 4’s rhythm');
  assert.deepEqual(row(5).map((n) => n.midi), [90, 89, 90, 94, 92, 90, 89, 90], 'a diatonic third above row 4');
  assert.deepEqual(D2.VOX_KANA, row(5).filter((n) => n.at > at(5) && n.at < at(5, 4)).map((n) => n.at));
  assert.equal(D2.VOX_KANA.length, 5, 'あ い う え お');
  assert.deepEqual(D2.HAT_BYTES.length, SIGNATURE_BYTES.length);
  assert.ok(D2.HOOK2_ACT2.every((n) => n.at >= at(10) && n.at < at(18)), 'act 2 only');
  assert.deepEqual([...new Set(D2.HOOK2_ACT2.map((n) => n.voice))], ['koto', 'chip', 'voxHalf', 'brass', 'octaves'], 'one new timbre a world');
  assert.deepEqual(D2.DEFENDER_FIGURE.map((n) => n.midi % 12), [2, 0, 11, 10], 'Defender’s figure: D · C♮ · B · A♯');
  assert.deepEqual(D2.MUSIC_BOX.map((n) => n.midi), [78, 78, 82, 85], 'the music box, left hanging on C♯6');
});

// The character flash only where the renderer breaks (as built, the reel kept): the dark cut into the reel's terminal card and the
// crumble into the stuck bar. Act 2's world changes are moves, not breakages.
test('the character flash only where the renderer breaks: the reel’s dark cut from its frame through + 3, then the crumble held through the frame before 19.1 — nothing anywhere else in drop 2', () => {
  const section = { flashes: D2.DROP2_GLYPHS, end: B };
  const cut = at(18, 4);
  const blade = at(18, 4.5);
  const want = (f: number): number => {
    if (f >= cut && f <= cut + 3) return 1;
    if (f >= blade + 3 && f <= blade + 5) return 1 / 3;
    if (f >= blade + 6 && f <= blade + 8) return 2 / 3;
    if (f >= blade + 9 && f <= at(19) - 1) return 1;
    return 0;
  };
  for (let f = A - 3; f < B + 3; f++) assert.ok(Math.abs(glyphAmount(section, f) - want(f)) < 1e-9, `frame ${f}: ${glyphAmount(section, f)} vs ${want(f)}`);
  assert.ok(D2.DROP2_GLYPHS.every((e) => e.until === undefined), 'no ramp');
  for (const k of [1, 2, 3]) assert.equal(D2.stutterFrame(D2.REEL_BLADES[k]), D2.REEL_BLADES[k], `the crumble's step on ${D2.REEL_BLADES[k]} is a new content frame`);
  assert.equal(D2.LATCH, at(19));
});

test('sub-frames never cross a hard cut, a world-slam or the freeze (5.1, 9.1, 10.1, 14.1, the reel’s three, 19.3) and always blend across the continuous hand-offs', () => {
  assert.deepEqual(D2.SEGMENT_CUTS, [at(5), at(9), at(10), at(14), at(18, 2), at(18, 3), at(18, 4), at(19, 3)]);
  const edges = [A, ...D2.SEGMENT_CUTS, B];
  for (let f = A; f < B; f++) {
    const k = edges.findIndex((e, i) => f >= e && f < edges[i + 1]);
    assert.deepEqual(SH.drop2Segment(f), { from: edges[k], to: edges[k + 1] }, `segment of ${f}`);
  }
  for (const seam of [D2.POP_OUT, D2.POP, D2.CRANE.to, D2.TILT.to, D2.PAN.to, D2.ARCADE.from, D2.ARCADE.to, D2.PICTO, D2.LIGHT.from, D2.REEL.from, D2.BULLET.from, D2.DRAIN.from]) {
    assert.equal(SH.drop2Segment(seam).from, SH.drop2Segment(seam - 1).from, `no boundary at the continuous hand-off ${seam}`);
  }
});

test('the scene dispatches each frame to its part — the kept parts at their new spans, a stub for each new one, the overload for the finale, the bullet time to drop 2’s end (v08: its tape stop; the drain is bridge B’s) — and forwards segment, temporal and look', () => {
  assert.deepEqual(SH.DROP2_PARTS.map((p) => [p.name, p.from - A, p.to - A]), [
    ['slash', 0, 192],
    ['zbuf', 192, 384],
    ['game', 384, 672],
    ['kernel', 672, 768],
    ['switch', 768, 864],
    ['wave', 864, 1056],
    ['arcade', 1056, 1152],
    ['voxel', 1152, 1248],
    ['memphis', 1248, 1344],
    ['picto', 1344, 1440],
    ['kaleido', 1440, 1632],
    ['overload', 1632, 1812],
    ['bullet', 1812, 1920],
  ]);
  for (let i = 1; i < SH.DROP2_PARTS.length; i++) assert.equal(SH.DROP2_PARTS[i].from, SH.DROP2_PARTS[i - 1].to, 'the parts tile drop 2');
  for (const p of SH.DROP2_PARTS) for (const f of [p.from, p.to - 0.25]) assert.equal(SH.DROP2_PARTS[SH.drop2PartIndex(f)].name, p.name, `${f}`);
  const scene = new Drop2Scene();
  assert.equal(scene.parts.length, SH.DROP2_PARTS.length);
  // One overload draws the finale; the bullet time hands its last sub-frames to it, and bridge B draws its drain with it (src/scenes/bridgeB.ts).
  assert.equal(scene.parts[11], scene.byName.overload);
  assert.equal(scene.parts[12], scene.byName.bullet);
  // Built (2026-10-02): every new part — the kernel (drop2 8, round 1), the switch, the wave, the arcade, the voxel well, Memphis, the
  // pictograms, the kaleidoscope and the bullet time. No part draws its slate any more.
  for (const name of ['kernel', 'switch', 'wave', 'arcade', 'voxel', 'memphis', 'picto', 'kaleido', 'bullet'] as const) {
    assert.ok(!(scene.byName[name] instanceof Drop2Stub) && scene.byName[name].constructor !== Drop2Held, `${name} is built`);
  }
  for (let f = A; f < B; f += 7) {
    // The kernel's segment starts on its own downbeat (the whip-pan lands crisp: src/shots/drop2Kernel.ts kernelSegment); every other
    // frame forwards drop 2's.
    const seg = SH.drop2Segment(f);
    const want = f >= D2.KERNEL.from && f < D2.KERNEL.to ? { from: Math.max(seg.from, D2.KERNEL.from), to: seg.to } : seg;
    assert.deepEqual(scene.segment(f), want, `segment ${f}`);
    const t = scene.temporal(f);
    assert.ok(t.samples >= 1 && t.shutter >= 0, `temporal ${f}`);
    assert.ok(scene.look(f).exposure > 0, `look ${f}`);
  }
  assert.notEqual(scene.look(D2.KERNEL.from), FLAT_LOOK, 'the kernel finishes as the whip-pan lands it (no stub left)');
});

test('the stubs’ slates: each new part’s slate shows its shot, its beat, a block on every kick and the hero where HANDOFFS puts him on its first beat', () => {
  for (const [name, s] of Object.entries(DROP2_SLATES) as [keyof typeof DROP2_SLATES, (typeof DROP2_SLATES)[keyof typeof DROP2_SLATES]][]) {
    const span = partSpan(name);
    const h = SH.HANDOFFS.find((x) => x.frame === span.from);
    assert.ok(h, `${name}: a hand-off on its first frame`);
    assert.deepEqual([s.hero.x, s.hero.y, s.hero.width], [h.centre[0], h.centre[1], h.width], `${name}: the hero’s place`);
    const c = slateContent(name, span.from);
    assert.ok(c.lines.some((l) => l.text.startsWith(s.shot)), `${name}: its shot id`);
    assert.ok(c.shapes[1].alpha > 0.9, `${name}: its downbeat kicks`);
    assert.ok(slateContent(name, span.from + 12).shapes[1].alpha < 0.2, `${name}: and goes dark between kicks`);
    assert.ok(SHOTS.some((x) => x.id === s.shot && barFrame(x.fromBar) === span.from), `${name}: ${s.shot} is in the shot table`);
  }
});

test('E9: the picture really drops frames — holds under the reel’s cuts, 20 fps under the blades, 30 → 10 fps through 19.1–19.2, frozen from the crash (as built, moved)', () => {
  for (let f = A - 96; f < at(18); f++) assert.equal(D2.stutterFrame(f), f, `${f} is live`);
  const held = (c: number): number[] => [c - 3, c - 3, c - 3, c];
  for (const c of D2.CUTS2.slice(1)) assert.deepEqual([3, 2, 1, 0].map((k) => D2.stutterFrame(c - k)), held(c), `the hold before ${c}`);
  const b = at(18, 4.5);
  assert.deepEqual(steps(b, at(19), 1).map(D2.stutterFrame), [b, b, b, b + 3, b + 3, b + 3, b + 6, b + 6, b + 6, b + 9, b + 9, b + 9]);
  const r = at(19, 2.5);
  assert.deepEqual(steps(r, at(19, 3), 1).map(D2.stutterFrame), [r, r, r, r, r, r, r + 6, r + 6, r + 6, r + 6, r + 6, r + 6]);
  for (let f = D2.CRASH; f < B + 10; f++) assert.equal(D2.stutterFrame(f), D2.CRASH, `${f} frozen`);
  for (let f = A; f < B; f++) {
    const c = D2.stutterFrame(f);
    assert.ok(c <= f, `${f} never shows the future`);
    assert.ok(c >= SH.drop2Segment(f).from, `${f}: a hold never reaches back across a cut (${c})`);
  }
});

test('E9: the fps line prints what the picture really does, on the 8ths — the as-built readings at the moved frames', () => {
  const fpsAt = (f: number) => {
    const r = D2.honestFps(f);
    return [r.fps, r.dropped];
  };
  assert.deepEqual(
    [at(18), at(18, 2), at(18, 3), at(18, 4), at(18, 4.5), at(19), at(19, 1.5), at(19, 2), at(19, 2.5)].map(fpsAt),
    [[60, 0], [58, 2], [56, 4], [54, 6], [56, 6], [48, 14], [44, 20], [36, 28], [29, 37]],
  );
  assert.equal(D2.honestFps(D2.CRASH).frozen, true);
  assert.equal(D2.honestFps(D2.CRASH - 1).frozen, false);
});

test('the seam: drop 2 catches the break’s slingshot — the ω moves ≤ 60 px from the break’s last frame to drop2 1.1, lands on the S27 master 12 frames later', () => {
  const a = SH.heroSeam(A - 1);
  const b = SH.heroSeam(A);
  assert.deepEqual([a.omega, a.width, a.squash], [SH.SEAM_FROM.omega, SH.SEAM_FROM.width, SH.SEAM_FROM.squash]);
  const d = Math.hypot(b.omega[0] - a.omega[0], b.omega[1] - a.omega[1]);
  // The break's new ending (no post, break-sheet2 §7.3) hands over slower: ≈ 11 px on the drop frame (was > 20 against the old post).
  assert.ok(d > 3 && d <= 60, `the drop frame already moves, ≤ 60 px: ${d.toFixed(1)}`);
  const s = SH.heroSeam(A + 12);
  assert.ok(Math.abs(s.omega[0] - SH.S27_MASTER.omegaPlace[0]) < 3 && Math.abs(s.width - SH.S27_MASTER.width) < 6, `settled 12 frames in: ${s.omega} ${s.width}`);
});

test('the seam contract is the break’s real last frame, derived live: SEAM_FROM is the break’s own ω on screen, core width and squash, and HANDOFFS’ first rows are what Drop2Slash draws', () => {
  const real = omegaOnScreen(A - 1);
  assert.ok(Math.hypot(SH.SEAM_FROM.omega[0] - real[0], SH.SEAM_FROM.omega[1] - real[1]) < 1e-9);
  const pose = heroPose(A - 1);
  assert.deepEqual(SH.SEAM_FROM.squash, [pose.sx, pose.sy]);
  const zoom = launchCam(A - 1).zoom * rigAt(A - 1).zoom;
  const core = (HERO_ADVANCE['('] + HERO_ADVANCE[')']) * pose.sx + (2 * HERO_ADVANCE['•'] + HERO_ADVANCE['ω']) * pose.fx;
  assert.ok(Math.abs(SH.SEAM_FROM.width - core * pose.em * zoom) < 1e-6);
  const adv = (ch: string): number => (HERO_ADVANCE as Record<string, number>)[ch] ?? 0.6;
  for (const f of [A - 1, A, A + 1, A + 3, A + 5, A + 12]) {
    const drawn = SL.omegaScreen(f, adv);
    const want = SH.heroSeam(f).omega;
    assert.ok(Math.hypot(drawn[0] - want[0], drawn[1] - want[1]) < 3, `${f}: drawn ω vs the contract`);
  }
});

test('the launch curve is the break’s: 16.6 / 47.4 / 75.0 / 93.4 / 102.8 / 105.8 % from its beat, settled by +11', () => {
  const K = 3000;
  const got = [0, 1, 2, 3, 4, 5].map((k) => SH.springL(K + k, K));
  [0.166, 0.474, 0.75, 0.934, 1.028, 1.058].forEach((w, k) => assert.ok(Math.abs(got[k] - w) < 0.003, `+${k}: ${got[k].toFixed(4)}`));
  assert.equal(SH.springL(K - 2, K), 0);
  assert.equal(SH.impact(K, K), 1);
});

test('the hand-off contracts: the 5.1 match cut keeps size and place, the kernel’s ring is the switch’s reticle, the hero ≥ 420 px whenever he is the subject (the pictogram by its figure, the contact sheet the one beat), the ending catches the condensed hero', () => {
  const h = (frame: number) => SH.HANDOFFS.find((x) => x.frame === frame)!;
  assert.deepEqual([h(D2.GAME - 1).width, h(D2.GAME - 1).centre], [h(D2.GAME).width, h(D2.GAME).centre], 'the drop2 5.1 match cut: Δ 0 px');
  assert.deepEqual(h(D2.KERNEL_DOLLY.to).centre, h(D2.SWITCH.from).centre, 'the cracked core ring and v2.0’s reticle share his centre');
  // v08: he condenses in bridge B, whose last frame the outro catches; drop 2 ends on the bullet time's landing, front-on, full size.
  assert.deepEqual([h(partEnd('bridgeB') - 1).width, h(partEnd('bridgeB') - 1).centre], [h(OUTRO_START).width, h(OUTRO_START).centre], 'the outro catches the condensed (×ω×)');
  assert.deepEqual([h(partEnd('bridgeB') - 1).width, h(partEnd('bridgeB') - 1).centre], [SH.T7_CONDENSED.width, SH.T7_CONDENSED.centre]);
  assert.deepEqual([h(B).width, h(B).centre], [h(D2.BULLET.from).width, h(D2.BULLET.from).centre], 'the bullet time lands where it left');
  assert.deepEqual([h(D2.REEL.from).width, h(D2.REEL.from).centre], [600, [960, 540]]);
  for (const x of SH.HANDOFFS.filter((y) => y.frame >= A + 12 && y.frame < B - 1)) {
    if (x.frame === D2.SHEET || x.frame === D2.PICTO) continue;
    assert.ok(x.width >= 420, `${x.frame} ${x.look}: ${x.width} px`);
  }
  assert.equal(SH.HANDOFFS.filter((x) => x.frame < B && x.face.includes('•ω<')).length, 0, 'no wink in drop 2');
  const mine = SH.HANDOFFS.filter((x) => x.frame < B);
  for (let i = 1; i < mine.length; i++) assert.ok(mine[i].frame > mine[i - 1].frame, `drop 2's HANDOFFS in film order at ${mine[i].frame}`);
});

test('the colour law: one Defender red pair, his amber, the cocktail pink; the recolour of the old shots’ non-Defender red is on; every world the hero wears has a palette; the reticle hat is the reticle at 30 %', () => {
  assert.deepEqual([SH.LAW.defender.print, SH.LAW.defender.emissive, SH.LAW.hero, SH.LAW.cocktail], ['#E8402B', '#FF4A1C', '#FFB23E', '#FF3D8B']);
  assert.equal(SH.LAW.defender.print, SH.PALETTES.swiss.red, 'Swiss red is Defender’s (its lens, its grid)');
  assert.equal(SH.COLOR_LAW_V2, true);
  assert.equal(SH.SWISS_OMEGA.fill, SH.LAW.hero);
  for (const w of ['kernel', 'pov', 'ukiyoe', 'arcade', 'voxel', 'memphis', 'picto', 'kaleido']) assert.ok(w in SH.PALETTES, `${w} has a palette`);
  assert.ok(!(Object.values(SH.PALETTES.picto) as string[]).includes(SH.LAW.defender.print), 'Aicher’s palette has no red: Defender’s red reads as the intruder');
  assert.notEqual(SH.PALETTES.memphis.lemon, SH.LAW.hero, 'Memphis lemon is clear of his amber');
  assert.equal(SH.RETICLE_HAT.scale, 0.3);
  assert.equal(SH.RETICLE_HAT.color, SH.LAW.defender.emissive);
  for (const [w, d] of Object.entries(SH.S27_TREATMENTS)) assert.equal(d.role, 'rounded', `${w}: the master outline`);
  assert.deepEqual(SH.BLADE_LINES.map((b) => b.world), ['terminal', 'swiss', 'riso', 'neon', 'led']);
});

test('the signature: ten bytes, never decoded in drop 2 (no • or ω beside them), read by Defender exactly once — the switch’s SIGNATURE MATCH, its one red line', () => {
  const utf8 = [...Buffer.from('• ω •', 'utf8')].map((b) => b.toString(16).toUpperCase().padStart(2, '0'));
  assert.deepEqual([...SIGNATURE_BYTES], utf8);
  const withBytes = DROP2_TEXTS.filter((t) => t.text.includes('E2 80 A2') || t.text.includes('E2·80·A2') || t.text.includes('E280A2'));
  assert.ok(withBytes.length >= 4, 'in several worlds');
  for (const t of withBytes) assert.ok(!/[•ω]/u.test(t.text), `never beside a decoded glyph: ${t.text}`);
  const reads = READOUT2.filter((l) => l.text.includes(SIGNATURE_BYTES.join(' ')));
  assert.deepEqual(reads.map((l) => [l.at, l.voice]), [[D2.SIGNATURE_MATCH.from, 'defender']], 'read once, by Defender, on 9.2&');
  assert.equal(D2.SIGNATURE_MATCH.to - D2.SIGNATURE_MATCH.from, 12, 'a byte a frame, held to the backbeat');
  assert.equal(SIGNATURE.match.split(' ').filter((w) => /^[0-9A-F]{2}$/.test(w)).length, 10);
});

test('the readout: in film order, the ladder [SCAN] → [QUARANTINE] → quarantine failed → giving up on 17.4, one slot line an 8th at most, the scoreboard 5/5 → 0/5 a layer a breach', () => {
  for (let i = 1; i < READOUT2.length; i++) assert.ok(READOUT2[i].at >= READOUT2[i - 1].at, `in order at ${READOUT2[i].at}`);
  const first = (s: string) => READOUT2.find((l) => l.text.includes(s))!.at;
  // The club said [QUARANTINE] first (25.3), the interlude `quarantine failed` (27.1); in drop 2 the box's ✓ comes before every failure.
  assert.ok(first('[SCAN]') < first('THREAT CONTAINED') && first('THREAT CONTAINED') < first('quarantine failed') && first('[QUARANTINE]') < first('giving up') && first('quarantine failed') < first('giving up'));
  assert.equal(first('giving up'), D2.GIVING_UP);
  const slot = READOUT2.filter((l) => l.site === 'slot').map((l) => l.at);
  for (let i = 1; i < slot.length; i++) assert.ok(slot[i] - slot[i - 1] >= 12, `the slot at ${slot[i]}: one line an 8th at most`);
  for (const l of READOUT2.filter((x) => x.voice === 'defender')) assert.ok(!l.text.startsWith('[ OK ]'), `Defender never says OK: ${l.text}`);
  assert.deepEqual(SCOREBOARD.map((s) => s.left), [5, 4, 3, 2, 1, 0]);
  for (let i = 1; i < SCOREBOARD.length; i++) assert.ok(SCOREBOARD[i].at > SCOREBOARD[i - 1].at);
  assert.equal(SCOREBOARD.at(-1)!.at, D2.GIVING_UP);
  assert.deepEqual(D2.HAIRLINE.map((h) => h.pct), [4, 11, 23, 38, 52, 67, 81, 94, 100]);
  assert.ok(D2.HAIRLINE.at(-1)!.at < D2.INSTALL.from && D2.INSTALL.to === D2.SWITCH.from, 'full, then it lifts into the install bar that lands on the switch');
});

test('the mirror trap and the bullet time keep the design’s guards: hex tiles only at a multiple of 3, the orbit’s peak ≤ 5.6°/f with 180° behind him on 20.2 + 9, the depth landing in 8 plates', () => {
  for (const m of D2.MIRRORS) if (m.hex) assert.equal(m.n % 3, 0, `hex at N = ${m.n}`);
  assert.ok(D2.MIRRORS.every((m) => m.n <= 64));
  const len = D2.ORBIT.to - D2.ORBIT.from;
  const theta = (f: number) => (360 * (1 - Math.cos((Math.PI * (f - D2.ORBIT.from)) / len))) / 2;
  let peak = 0;
  for (let f = D2.ORBIT.from; f < D2.ORBIT.to; f++) peak = Math.max(peak, theta(f + 1) - theta(f));
  assert.ok(peak <= 5.6, `peak ${peak.toFixed(2)}°/f`);
  assert.ok(Math.abs(theta(at(20, 2) + 9) - 180) < 0.01);
  assert.equal(theta(D2.ORBIT.to), 360);
  assert.equal(D2.BULLET.to - D2.BULLET.from, 96, '16 ring pulses: the drain resumes in phase');
  assert.equal(D2.PLATES.from, at(20, 4));
  assert.deepEqual(D2.HEARTBEATS.map((h) => h.at), [at(20), at(20, 3)]);
});

test('drop 2 draws each string with the role it lists, casts no new face but the guest’s, no face twice, and keeps every cast face on screen; no look into the lens in drop 2 (his ( ・ω・)? belongs to the film’s looks, none of them here)', () => {
  assert.ok(DROP2_TEXTS.length > 100);
  for (const t of DROP2_TEXTS) assert.ok(t.text.length > 0 && t.where.length > 0, JSON.stringify(t));
  for (const t of DROP2_TEXTS) assert.ok(!t.text.includes('•ω<'), `no wink in drop 2: ${t.text}`);
  const key = (s: string) => s.normalize('NFKC').replace(/\s/gu, '');
  const keys = CAST_DROP2.map(key);
  assert.equal(new Set(keys).size, keys.length, 'no face twice in drop 2');
  const shown = new Set(DROP2_TEXTS.map((t) => key(t.text)));
  for (const f of [...CAST_DROP2, ...GUEST_VARIANTS.map((g) => g.face)]) assert.ok([...shown].some((s) => s.includes(key(f))), `${f} is listed with its role`);
  for (const g of GUEST_VARIANTS) assert.ok(/￣/u.test(g.face), `${g.face}: Defender is the guest`);
  for (const t of DROP2_TEXTS) assert.ok(!t.text.includes('・ω・)?'), `no look into the lens in drop 2: ${t.text}`);
  assert.equal(HERO2.base, '(•ω•)');
  assert.ok(DROP2_EXTRUDE.join('').includes('(•ω•)'));
});

test('the shot table: drop 2 keeps S27–S32 (S30 now two bars, S32 the reel and the stuck bar) and adds S31K–S31X and S32B; the 3D ones are the Z-buffer, the voxel well and the bullet time', () => {
  const d2 = (n: number): number => partBar('drop2', n);
  const rows = SHOTS.filter((s) => s.fromBar >= d2(1) && s.toBar <= d2(20));
  assert.deepEqual(rows.map((s) => [s.id, s.fromBar - d2(1) + 1, s.toBar - d2(1) + 1, s.space]), [
    ['S27', 1, 1, '2d'],
    ['S28', 2, 2, '2.5d'],
    ['S29', 3, 4, '3d'],
    ['S30', 5, 6, '2.5d'],
    ['S31', 7, 7, '2d'],
    ['S31K', 8, 8, '2.5d'],
    ['S31S', 9, 9, '2.5d'],
    ['S31U', 10, 11, '2.5d'],
    ['S31E', 12, 12, '2d'],
    ['S31V', 13, 13, '3d'],
    ['S31M', 14, 14, '2.5d'],
    ['S31P', 15, 15, '2d'],
    ['S31X', 16, 17, '2d'],
    ['S32', 18, 19, '2d'],
    ['S32B', 20, 20, '3d'],
  ]);
  assert.deepEqual(shotFrames(rows[2]), { from: D2.POP, to: D2.GAME });
  assert.equal(rows.at(-1)!.exit, 'T7', 'the bullet time’s drain hands over to the ending');
  // The exits are what `check-seams --seams shots` judges (continuous, match) or only reports (sheet §5): 9.1 the ring → reticle match,
  // 15.1 the crane's grid snap, 20.1 the first heartbeat's punch inside the orbit (which starts on 19.4&; that seam is judged with --render).
  assert.deepEqual(rows.map((s) => [s.id, s.exit]), [
    ['S27', 'continuous'],
    ['S28', 'whip'],
    ['S29', 'match'],
    ['S30', 'whip'],
    ['S31', 'whip'],
    ['S31K', 'match'],
    ['S31S', 'cut'],
    ['S31U', 'continuous'],
    ['S31E', 'continuous'],
    ['S31V', 'continuous'],
    ['S31M', 'punch'],
    ['S31P', 'continuous'],
    ['S31X', 'whip'],
    ['S32', 'punch'],
    ['S32B', 'T7'],
  ]);
});

test('the wobble LFO is one definition in the score: the bass’s filter (drop2Voices.mjs) and S29’s depth bands read the same function', async () => {
  const V = (await import('../scripts/audio/drop2Voices.mjs' as string)) as { wobbleLfo: (f: number) => number };
  assert.equal(V.wobbleLfo, D2.wobbleLfo, 'the audio re-exports the score’s');
  for (const r of D2.WOBBLE_RATES) assert.ok(Math.abs(D2.wobbleLfo(r.at) - 1) < 1e-9, `peaks on ${r.at}`);
  assert.equal(D2.wobbleLfo(D2.WOBBLE.from - 1), 0);
  assert.equal(D2.wobbleLfo(D2.WOBBLE.to), 0);
});
