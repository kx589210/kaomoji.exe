// Today's film map, written out: the ONE test that names absolute bars and frames. Everything else derives its frames from
// src/score/film.ts (partStart / partFrame / partEnd / builtEnd), so inserting bars means editing FILM and this file, and nothing else's
// numbers. When the map changes, update the literals here deliberately.
// The 60-bar map (2026-10-01, the story bible docs/2026-10-01-virus-story.md 新结构 + the bars 1–14 design notes/b112/final.md): the
// transition inserted after riso; the cosmos, the club, the break, drop 2 and the outro grown, each built for the bars it had on the
// 36-bar map and holding its last frame over the new bars at its end (its held tail) until they are built; and inside the intro and the
// Swiss part one new bar each (the RAIN bar, intro 2; the SCAN bar, swiss 4), the bars after them renumbered in their own parts. The
// break is built through (THE INTERLUDE, notes/bid2/break-sheet2.md): its new GRAPH bar inserted inside it at break 6, v04's bar 6
// (the slingshot) carried over to break 7. Drop 2 is built through (THE VIRUS WAR, notes/bid2/drop2-sheet2.md): its approved bars kept and
// moved by whole bars (v04's drop2 5–6 to drop2 6–7, 7–8 to 18–19), its new bars 5, 8–17 and 20 seeding with their own frames.
// The 61-bar map (2026-10-02, U5 / U6, notes/b58/ending-sheet.md r4): the outro grown 4 → 5 bars at its end, the old
// outro 4 (the curtain call → the cursor) spread over outro 4–5; nothing before outro 4 moved (the outro still starts on 5376).
// The cosmos built through (2026-10-02, notes/bcos/sheet.md §12.1, R2-L1): its bars 5–6 (the lightning web, the event horizon) are
// drawn and heard, so its held tail is gone and no part holds; the map's bars and frames did not move.
// The 63-bar map (2026-10-03, v08; the v07 review: the cosmos turned into the comic too fast, and the transition into the ending was too short; output/qa/v08/MAP-CONTRACT.md): two
// one-bar parts inserted BETWEEN parts, bridgeA after the cosmos and bridgeB after drop 2, each a stub (FILM `stub: true`) that holds the
// part before it until it is built. Every part from the club on moved by a bar (96 frames), the outro by two; nothing before 2112 moved;
// v07Frame takes a moved frame back to where it was on the 61-bar map.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FILM, STUBS, TAILS, TOTAL_BARS, TOTAL_FRAMES, builtEnd, heldFrame, isHeld, isStub, locate, partBar, partEnd, partFrame, partStart, seedFrame, v07Frame } from '../src/score/film.ts';
import { PART_COMPOSITIONS, SECTION_PARTS, SECTIONS } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import { FPS } from '../src/score/tempo.ts';

test('the map: intro 5, swiss 5, riso 4, transition 2, cosmos 6, bridgeA 1, club 6, break 8, drop2 20, bridgeB 1, outro 5 = 63 bars, 6048 frames, 100.8 s; every part built through (the v08 bridges built: no stub left)', () => {
  assert.deepEqual(
    FILM.map((p) => [p.id, p.bars, p.built ?? p.bars, p.stub ?? false]),
    [
      ['intro', 5, 5, false],
      ['swiss', 5, 5, false],
      ['riso', 4, 4, false],
      ['transition', 2, 2, false],
      ['cosmos', 6, 6, false],
      ['bridgeA', 1, 1, false],
      ['club', 6, 6, false],
      ['break', 8, 8, false],
      ['drop2', 20, 20, false],
      ['bridgeB', 1, 1, false],
      ['outro', 5, 5, false],
    ],
  );
  assert.equal(TOTAL_BARS, 63);
  assert.equal(TOTAL_FRAMES, 6048);
  assert.equal(TOTAL_FRAMES / FPS, 100.8);
});

test('where each part starts and ends (frames, end exclusive), its film bars, and where its built content ends', () => {
  const table = FILM.map((p) => [p.id, partStart(p.id), partEnd(p.id), partBar(p.id, 1), partBar(p.id, p.bars), builtEnd(p.id)]);
  assert.deepEqual(table, [
    ['intro', 0, 480, 1, 5, 480],
    ['swiss', 480, 960, 6, 10, 960],
    ['riso', 960, 1344, 11, 14, 1344],
    ['transition', 1344, 1536, 15, 16, 1536],
    ['cosmos', 1536, 2112, 17, 22, 2112],
    ['bridgeA', 2112, 2208, 23, 23, 2208],
    ['club', 2208, 2784, 24, 29, 2784],
    ['break', 2784, 3552, 30, 37, 3552],
    ['drop2', 3552, 5472, 38, 57, 5472],
    ['bridgeB', 5472, 5568, 58, 58, 5568],
    ['outro', 5568, 6048, 59, 63, 6048],
  ]);
});

test('no held tails and no stubs: both v08 bridges are built (bridge A, X02; bridge B, X03), so every frame of the film is drawn as itself', () => {
  assert.deepEqual(TAILS, []);
  assert.deepEqual(STUBS, []);
  assert.deepEqual(FILM.filter((p) => isStub(p.id)).map((p) => p.id), []);
  assert.deepEqual([1919, 2111, 2112, 2207, 2208, 5471, 5472, 5567, 5568, 6047].map(isHeld), [false, false, false, false, false, false, false, false, false, false]);
  for (const f of [1992, 1992.25, 2111, 2112, 2150.25, 2207, 2208, 5471, 5472, 5567, 5568, 6047]) assert.equal(heldFrame(f), f, `${f} is drawn as itself`);
});

test('the 36-bar v04 positions on the 63-bar map, and seedFrame taking each back to where its random draws were approved', () => {
  // [v04 frame, part-local position, frame on the 63-bar map]
  const rows: [number, Parameters<typeof partFrame>, number][] = [
    [96, ['intro', 3, 0], 192], // the highway (v04 intro 2): after the RAIN bar, +96
    [276, ['intro', 4, 3.5], 372], // Enter
    [372, ['intro', 5, 3.5], 468], // the push into the eye (T1)
    [384, ['swiss', 1, 0], 480], // INTRO_END, T1 lands
    [576, ['swiss', 3, 0], 672], // the glass (its first 72 frames are v04's 576–647)
    [672, ['swiss', 5, 0], 864], // S08 (v04 swiss 4): after the SCAN bar, +192
    [720, ['swiss', 5, 2], 912], // T2 (the flip) starts
    [768, ['riso', 1, 0], 960], // S09
    [1140, ['riso', 4, 3.5], 1332], // the build's silent half beat
    [1152, ['cosmos', 1, 0], 1536], // the drop
    [1512, ['cosmos', 4, 3], 1896], // drop 1's stutter (v04's)
    [1536, ['club', 1, 0], 2208], // LEVELS.cosmos: club 1.1, after bridge A
    [1776, ['club', 3, 2], 2448], // the flip
    [1896, ['club', 4, 3], 2568], // HIT
    [1920, ['break', 1, 0], 2784], // SMASH = BREAK_START
    [2028, ['break', 2, 0.5], 2892], // break 2.1&
    [2484, ['break', 7, 3.5], 3444], // v04's break 6.4& HELD: v04's bar 6 (the slingshot) is break 7 now, after the GRAPH bar
    [2496, ['drop2', 1, 0], 3552], // DROP2_START
    [2880, ['drop2', 6, 0], 4032], // S30's built game bar (drop 2's new bar 5, the crane, before it)
    [2976, ['drop2', 7, 0], 4128], // S31 OVERFLOW
    [3072, ['drop2', 18, 0], 5184], // the reel (after drop 2's new bars 8–17)
    [3216, ['drop2', 19, 2], 5328], // CRASH
    [3264, ['outro', 1, 0], 5568], // OUTRO_START, after bridge B
    [3444, ['outro', 2, 3.5], 5748], // outro 2.4& (RELEASE's chase end)
  ];
  for (const [old, args, now] of rows) {
    assert.equal(partFrame(...args), now, `${args.join(' ')}: ${now}`);
    assert.equal(seedFrame(now), old, `seedFrame(${now}) is v04's ${old}`);
  }
  for (const f of [0, 47, 95]) assert.equal(seedFrame(f), f, `${f}: intro 1 (the loop seam) never moved`);
  for (const f of [96, 150, 191, 768, 800, 863]) assert.equal(seedFrame(f), f, `${f}: the RAIN and SCAN bars are new: they seed with their own frames`);
  for (const f of [3264, 3296.25, 3359]) assert.equal(seedFrame(f), f - 96, `${f}: so does the interlude's GRAPH bar (break 6), as it was on the 61-bar map (v08's bridge A moved it a bar)`);
  assert.equal(seedFrame(3360), 2400, 'break 7.1 seeds as v04’s break 6.1 (the slingshot, carried over)');
  assert.equal(seedFrame(3456), 2496, 'break 8.1 seeds as v04’s break 7.1 (v04’s drop2 1.1: no approved break draw)');
  assert.equal(seedFrame(1400), 1400, 'the transition is not on the v04 map: it seeds with its own frames');
  for (const f of [2112, 2150.5, 2207, 5472, 5520, 5567]) assert.equal(seedFrame(f), f, `${f}: nor are the bridges`);
  for (const f of [partFrame('drop2', 5), partFrame('drop2', 8), partFrame('drop2', 17, 3.5), partFrame('drop2', 20)]) assert.equal(seedFrame(f), v07Frame(f), `${f}: drop 2's new bars seed with their own frames on the 61-bar map`);
  assert.deepEqual([partFrame('drop2', 5), partFrame('drop2', 20)].map(seedFrame), [3840, 5280]);
  assert.equal(seedFrame(2784.25), 1920.25, 'sub-frames keep their fraction');
  assert.equal(seedFrame(191.75), 191.75);
  assert.equal(seedFrame(192.25), 96.25);
  assert.deepEqual(locate(2783), { id: 'club', bar: 6, beat: 95 / 24 });
  assert.deepEqual(locate(2784), { id: 'break', bar: 1, beat: 0 });
  assert.deepEqual(locate(1535), { id: 'transition', bar: 2, beat: 95 / 24 });
  assert.deepEqual(locate(2832), { id: 'break', bar: 1, beat: 2 });
  assert.deepEqual(locate(120), { id: 'intro', bar: 2, beat: 1 });
  assert.deepEqual(locate(792), { id: 'swiss', bar: 4, beat: 1 });
  assert.deepEqual(locate(2112), { id: 'bridgeA', bar: 1, beat: 0 });
  assert.deepEqual(locate(5543), { id: 'bridgeB', bar: 1, beat: 71 / 24 });
});

test('v07Frame takes every frame back to where it was on the 61-bar v07 map: nothing before bridge A moved, the club to drop 2 a bar, the outro two; the bridges are their own', () => {
  for (const f of [0, 479.5, 1536, 2111, 2111.75]) assert.equal(v07Frame(f), f, `${f}: before bridge A`);
  for (const f of [2112, 2160.25, 2207, 5472, 5567]) assert.equal(v07Frame(f), f, `${f}: a bridge is not on the 61-bar map`);
  assert.deepEqual([2208, 2784.25, 3552, 5471].map(v07Frame), [2112, 2688.25, 3456, 5375], 'club 1.1, break 1.1 + ¼, drop 2 1.1, drop 2’s last frame');
  assert.deepEqual([5568, 6047, 6048].map(v07Frame), [5376, 5855, 5856], 'outro 1.1, the film’s last frame, the loop');
});

test('sections: intro; build = swiss + riso; transition; drop1 = cosmos + bridgeA + club; break; drop2; bridgeB; outro — their bars and compositions, and the parts of drop 1 alone', () => {
  // eslint-disable-next-line @remotion/non-pure-animation -- the film part 'transition', not a CSS transition
  assert.deepEqual(SECTION_PARTS, { intro: ['intro'], build: ['swiss', 'riso'], transition: ['transition'], drop1: ['cosmos', 'bridgeA', 'club'], break: ['break'], drop2: ['drop2'], bridgeB: ['bridgeB'], outro: ['outro'] });
  assert.deepEqual(
    SECTIONS.map((s) => [s.id, s.fromBar, s.toBar, s.composition]),
    [
      ['intro', 1, 5, 'KX-Intro'],
      ['build', 6, 14, 'KX-Build'],
      ['transition', 15, 16, 'KX-Transition'],
      ['drop1', 17, 29, 'KX-Drop1'],
      ['break', 30, 37, 'KX-Break'],
      ['drop2', 38, 57, 'KX-Drop2'],
      ['bridgeB', 58, 58, 'KX-BridgeB'],
      ['outro', 59, 63, 'KX-Outro'],
    ],
  );
  assert.deepEqual(
    PART_COMPOSITIONS.map((p) => [p.part, p.fromBar, p.toBar, p.composition]),
    [
      ['cosmos', 17, 22, 'KX-Cosmos'],
      ['bridgeA', 23, 23, 'KX-BridgeA'],
      ['club', 24, 29, 'KX-Club'],
    ],
  );
});

test("today's spans (which scene draws which frames; `held`: a part's last built frame, frozen)", () => {
  assert.deepEqual(
    SPANS.map((s) => [s.key, s.from, s.to, s.held ?? false]),
    [
      ['intro', 0, 480, false],
      ['swiss', 480, 912, false],
      ['t2', 912, 960, false],
      ['riso', 960, 1344, false],
      ['transition', 1344, 1536, false],
      ['kosmos', 1536, 2112, false],
      ['bridgeA', 2112, 2208, false],
      ['club', 2208, 2784, false],
      ['break', 2784, 3552, false],
      ['drop2', 3552, 5472, false],
      ['bridgeB', 5472, 5568, false],
      ['outro', 5568, 6048, false],
    ],
  );
});
