// The ending, the film's part 'outro' (its 5 bars, CURTAIN CALL): its score's pins, bar by bar (the build sheet
// notes/b58/ending-sheet.md r4 §3 is the binding timeline these come from), the energy standard over its frames, the story's order,
// the promise of the wink, the signature and its copy, the readout, the cast of the curtain call, the hand-off geometry the parts share,
// the loop into frame 0, and the dispatcher that hands each instant to its part. Every frame is written in the outro's own bars
// (at(bar, beat), 1-based, as src/score/outro.ts writes them), so the pins move with the part. Builders add their own
// tests/outro<Part>.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAT, PROTAGONIST, faceText } from '../src/actors/cast.ts';
import { COMMAND, CURSOR, PROMPT } from '../src/content/boot.ts';
import * as C from '../src/content/outro.ts';
import { lineWidth } from '../src/engine/textGrid.ts';
import { OutroScene } from '../src/scenes/outro.ts';
import { flashAt } from '../src/score/energy.ts';
import { FILM, builtEnd, partBars, partEnd, partStart, partTail } from '../src/score/film.ts';
import { CURSOR_BLINKS } from '../src/score/intro.ts';
import * as O from '../src/score/outro.ts';
import { HOOK2 } from '../src/score/drop2.ts';
import { SECTIONS } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import { FPS, FRAMES_PER_BAR, TOTAL_BARS, TOTAL_FRAMES, barFrame } from '../src/score/tempo.ts';
import { FRONT_DISTANCE, introCamera, screenPower } from '../src/shots/intro.ts';
import * as SH from '../src/shots/outroShared.ts';
import { cellCenter } from '../src/worlds/terminal.ts';
import { assertFlashesRare, assertOnGrid, assertRigContinuous, scoreFrames } from './lib/energyAudit.ts';

const at = O.at;

// ——— Bounds, spans, section ————————————————————————————————————————————————————————————————————————————————————————————————————

test('the ending runs from its downbeat to the end of the film: its content to builtEnd (then its held tail, if any), KX-Outro renders it all, and frame 0 follows', () => {
  assert.equal(O.OUTRO_START, partStart('outro'));
  assert.equal(O.OUTRO_END, builtEnd('outro'), 'the content ends where the outro is built to');
  assert.equal(O.OUTRO_END, O.LOOP, 'built through: no held tail');
  assert.equal(O.LOOP, partEnd('outro'));
  assert.equal(O.LOOP, TOTAL_FRAMES, 'the ending is the film’s last part');
  assert.equal(FILM.find((p) => p.id === 'outro')!.bars, 5, 'five bars (U5): blue, monitor, iris, the curtain call, the bows → cursor');
  const tail = partTail('outro');
  assert.deepEqual(SPANS.filter((s) => s.key === 'outro'), [
    { from: O.OUTRO_START, to: O.OUTRO_END, key: 'outro' },
    ...(tail ? [{ from: tail.from, to: tail.to, key: 'outro' as const, held: true as const }] : []),
  ]);
  const s = SECTIONS.find((x) => x.id === 'outro')!;
  assert.deepEqual([barFrame(s.fromBar), barFrame(s.toBar + 1)], [O.OUTRO_START, TOTAL_FRAMES], 'KX-Outro');
});

test('every event the ending’s score exports — its accents and its part table included — sits on the 32nd-note grid', () => {
  assertOnGrid(scoreFrames('outro', O));
});

test('through the ending no edge of the frame ever shows, nothing snaps, and there is no white flash; the accents are soft, none on the seam, the burst the only shake, none from his bow', () => {
  assertRigContinuous(O.OUTRO_START, O.OUTRO_END, []);
  assertFlashesRare(O.OUTRO_START, O.OUTRO_END, []);
  for (let f = O.OUTRO_START; f < O.OUTRO_END; f++) assert.equal(flashAt(f), 0, `no white on ${f}`);
  assert.deepEqual([...O.OUTRO_ACCENTS], [
    { at: at(1, 2), punch: 0.03 },
    { at: at(1, 3), punch: 0.02 },
    { at: at(1, 4), punch: 0.02 },
    { at: at(2), punch: 0.03 },
    { at: at(3), punch: 0.03 },
    { at: at(3, 4), punch: 0.02 },
    { at: at(4), punch: 0.05, shake: 0.3 },
    { at: at(4, 2), punch: 0.02 },
    { at: at(4, 4), punch: 0.02 },
    { at: at(5, 1.5), punch: 0.03 },
  ]);
  assert.ok(O.OUTRO_ACCENTS.every((a) => a.at >= O.OUTRO_START + 24), 'the seam decodes in place on outro 1.1: no punch moves the field');
  assert.ok(O.OUTRO_ACCENTS.every((a) => a.at < O.MONITOR_PUSH.from || a.at >= O.OPEN), 'the monitor keeps its own push: no punch in outro 2.2–2.4');
  assert.ok(O.OUTRO_ACCENTS.every((a) => a.at < O.BOWS.hero), 'nothing from his bow on: the button is his bow and the dive one continuous move');
  assert.ok(O.OUTRO_ACCENTS.filter((a) => a.at > O.BURST && a.at < O.BOWS.hero).every((a) => O.CLAPS.includes(a.at)), 'in the curtain call the punches ride the claps');
  assert.deepEqual(O.OUTRO_ACCENTS.filter((a) => (a.shake ?? 0) > 0).map((a) => a.at), [O.BURST]);
  assert.ok(O.OUTRO_ACCENTS.every((a) => (a.flash ?? 0) === 0));
  assert.deepEqual(O.OUTRO_GLYPHS, [], 'no hard cut in the ending: no character flash');
});

// ——— The timeline, bar by bar (sheet §3) ——————————————————————————————————————————————————————————————————————————————————————

test('outro 1, E1 BLUE: the seam, the bytes, three flips a 32nd apart, the stamp on 1.2, the slot on 1.2&, one staged line a beat, lub-dub on 1 and 3', () => {
  assert.deepEqual(O.SEAM_BAND, { from: at(1), to: at(1) + 3 }, 'the band crosses the tube in the downbeat’s first 3 frames');
  assert.deepEqual([O.HEX, O.HEX_SETTLED], [at(1, 1.125), at(1, 1.375)]);
  assert.deepEqual(O.LUB, [at(1), at(1, 3)]);
  assert.deepEqual(O.DUB, [at(1, 1.25), at(1, 3.25)], 'a 16th after each lub');
  assert.deepEqual(O.FLIPS, [at(1, 1.5), at(1, 1.625), at(1, 1.75)], 'one UTF-8 group a 32nd from 1.1&');
  assert.deepEqual(O.GATHER, { from: O.FLIPS[1], to: at(1, 1.875) }, 'the face closes on 1.1a + 3');
  assert.equal(O.STAMP, at(1, 2));
  assert.deepEqual(O.LINES, [at(1, 2), at(1, 3), at(1, 4), at(2)], 'one staged line a beat, the antivirus’s last on 2.1');
  assert.deepEqual(O.CODE_ROWS, [at(1, 2.25), at(1, 2.5), at(1, 2.75), at(1, 3), at(1, 3.25), at(1, 3.5), at(1, 3.75)], '21 module rows, 3 a 16th');
  assert.equal(O.PROGRESS.length, C.PROGRESS_STEPS);
  assert.deepEqual([O.PROGRESS[0], O.PROGRESS.at(-1)], [O.FLIPS[0], at(1, 4.75)], 'a step a 16th, 100 % on 1.4a');
  assert.deepEqual(O.SLOT, { from: at(1, 2.5), to: at(1, 3) });
  assert.deepEqual([O.BODY, O.SMALL_PRINT], [O.SLOT.from, O.SLOT.from], 'the copy prints as he leaves the centre');
  assert.deepEqual(O.FLICK, { from: at(1, 4), to: at(1, 4.25) }, 'a 16th of • (6 frames): still here');
  assert.deepEqual(O.RETICLE, { from: at(1, 4.5), to: at(2) });
  assert.deepEqual(O.BLUE_PUSH, { from: O.OUTRO_START, to: O.ENTER });
});

test('outro 2, E1 → E2 MONITOR: the ✓ takes the lub’s slot and the dub never comes; exit; the squeeze into the flatline; the ω on 2.3; the curl on its &; the iris-out on 2.4; two knocks', () => {
  assert.equal(O.LAST_BEAT, at(2));
  assert.equal(O.LAST_BEAT - O.LUB[1], 48, 'the ✓ lands two beats after the last lub: where the next heartbeat would have been');
  assert.equal(O.HEARTBEAT, O.LAST_BEAT, 'drop 2’s game charts the last heartbeat');
  assert.deepEqual(O.LOCK_BEEPS, [at(2), at(2) + 3]);
  assert.equal(O.DUB_MISSING, at(2, 1.25));
  assert.equal(O.DUB_MISSING - O.LAST_BEAT, O.DUB[0] - O.LUB[0], 'the missing dub is exactly where a dub would follow the ✓');
  assert.equal(O.HEARTBEAT_LOST, O.DUB_MISSING);
  assert.deepEqual(O.KEYS, [at(2, 1.25), at(2, 1.375), at(2, 1.5), at(2, 1.625)], '`exit`, a key a 32nd');
  assert.equal(O.KEYS.length, [...C.EXIT_TYPED].length);
  assert.equal(O.ENTER, at(2, 1.75));
  assert.deepEqual(O.SQUEEZE, { from: O.ENTER, to: at(2, 2) });
  assert.equal(O.LINE, at(2, 2));
  assert.deepEqual(O.FLATLINE, { from: at(2, 2), to: at(2, 3) });
  assert.deepEqual(O.MONITOR_PUSH, { from: at(2, 2), to: at(2, 4) });
  assert.deepEqual(O.LAST_WORD, { from: O.ENTER, to: at(2, 4) });
  assert.equal(O.BEEP, at(2, 3));
  assert.deepEqual(O.PULSE, { from: at(2, 3), to: at(2, 3.5) });
  assert.deepEqual(O.CURL, { from: at(2, 3.5), to: at(2, 3.5) + 9 });
  assert.equal(O.TWITCH, O.CURL.to);
  assert.deepEqual(O.CLOSE, { from: at(2, 4), to: at(2, 4) + 9 });
  assert.deepEqual(O.WHINE, { from: O.LINE, to: O.CLOSE.to });
  assert.deepEqual(O.KNOCKS, [at(2, 4.5), at(2, 4.75)], 'tok on 2.4&, tok! on 2.4a: the lub-dub back');
  assert.equal(O.KNOCKS[1] - O.KNOCKS[0], O.DUB[0] - O.LUB[0]);
  assert.equal(O.CREAK, at(3) - 3);
  assert.deepEqual(O.BREATH, { from: O.BEEP, to: O.OPEN }, 'the inhale from the beep into the tonic (M4)');
});

test('outro 3, E3 IRIS: the pry on the tonic, W5 on its &, the wink on 3.2, survived on its &, ↑ ↑ on 3.3 and its &, Enter on 3.4 and the doublings on its 16ths', () => {
  assert.equal(O.OPEN, at(3));
  assert.deepEqual(O.BELLS, [at(3), at(3) + 3, at(3) + 6, at(3) + 9]);
  assert.deepEqual(O.IRIS_PUSH, { from: at(3), to: at(4) });
  assert.equal(O.MONITOR_BACK, at(3, 1.5));
  assert.equal(O.WINK, at(3, 2));
  assert.deepEqual(O.DEFENDER_BLIPS, [O.WINK, O.WINK + 3]);
  assert.equal(O.SURVIVED, at(3, 2.5));
  assert.deepEqual(O.TWINKLES, [at(3, 2.5), at(3, 3), at(3, 3.5), at(3, 4), at(3, 4.5)], 'every 8th to the burst');
  assert.deepEqual(O.RECALL, [at(3, 3), at(3, 3.5)]);
  assert.deepEqual(O.VOX_PICKUPS, [at(3, 3.25), at(3, 3.75)]);
  assert.deepEqual(O.LET_GO, { from: at(3, 3), to: at(3, 4) }, 'the left arm is off the rim for the two ↑');
  assert.equal(O.RUN, at(3, 4));
  assert.deepEqual(O.COUNTER, [at(3, 4), at(3, 4.25), at(3, 4.5), at(3, 4.75)], '1 → 2 → 4 → 8');
  assert.equal(O.COUNTER.length, C.COUNTER_TEXT.steps.length);
  assert.deepEqual(O.SPOTS, O.COUNTER.slice(1));
  assert.deepEqual(O.RISER, { from: O.RECALL[0], to: at(4) });
});

test('outro 4, E4 CURTAIN CALL (U5: unhurried): the burst, the wall over its first 8th, eight calls one per 8th, each on a drum hit of the encore, the hop on 4.1e, the walk-ons planting on 4.4a', () => {
  assert.equal(O.BURST, at(4));
  assert.deepEqual(O.WALL_PRINT, { from: at(4), to: at(4, 1.5) });
  assert.deepEqual(O.CALLS, [at(4), at(4, 1.5), at(4, 2), at(4, 2.5), at(4, 3), at(4, 3.5), at(4, 4), at(4, 4.5)], 'one headliner an 8th, the whole bar');
  assert.equal(O.CALLS.length, C.HEADLINERS.length);
  assert.deepEqual(C.HEADLINERS.map((h) => h.seat), ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'], 'riser A on beats 1–2, riser B on beats 3–4, left to right');
  // The encore's drums: four on the floor, claps on 2 and 4, hats on the off-8ths; each hit of outro 4 is a call (every drum hit has its visual event).
  assert.deepEqual(O.KICKS, [at(4), at(4, 2), at(4, 3), at(4, 4), at(5), at(5, 2)], 'four on the floor through 5.1, then the button on his bow');
  assert.deepEqual(O.CLAPS, [at(4, 2), at(4, 4), at(5, 1.5)]);
  assert.deepEqual(O.HATS, [at(4, 1.5), at(4, 2.5), at(4, 3.5), at(4, 4.5)]);
  const bar4 = [...O.KICKS, ...O.CLAPS, ...O.HATS].filter((f) => f < at(5));
  for (const f of bar4) assert.ok(O.CALLS.includes(f), `the drum hit on ${f} is a call`);
  assert.deepEqual([...new Set(bar4)].sort((a, b) => a - b), [...O.CALLS], 'and every call is a drum hit');
  // The encore: drop 2's hook row 1 in its own rhythm (its first bar's eight onsets), ending on 4.4&.
  const row = HOOK2.filter((h) => h.at < HOOK2[0].at + FRAMES_PER_BAR).map((h) => h.at - HOOK2[0].at);
  assert.deepEqual(O.ENCORE.map((f) => f - O.BURST), row, 'the hook row 1’s own rhythm');
  assert.deepEqual([O.ENCORE[0], O.ENCORE.at(-1)], [at(4), at(4, 4.5)]);
  assert.deepEqual(O.HOP, { from: at(4), to: at(4, 1.25) }, 'he lands on 4.1e, a 16th of his own');
  assert.deepEqual(O.PULLBACK, { from: at(4), to: at(4, 1.5) });
  assert.deepEqual(O.WALK_ON, { from: at(4, 3), to: at(4, 4.75) }, 'the guest saunters on from 4.3 (as the calls return to the left)');
  assert.deepEqual(O.CAT_DASH, { from: at(4, 4), to: O.WALK_ON.to }, 'the cat dashes on from 4.4; both plant on 4.4a, the pickup');
  assert.deepEqual(O.STEPS, [at(4, 3), at(4, 3.5), at(4, 4), at(4, 4.5)], 'a step an 8th');
  assert.ok(!O.CALLS.includes(O.HOP.to) && !O.CALLS.includes(O.WALK_ON.to), 'the landings have frames of their own');
  assert.deepEqual(O.BOW_WAVE, { from: O.CALLS[1], to: O.BOWS.guest });
  assert.ok(O.BOWS.cat > O.BOW_WAVE.from && O.BOWS.cat < O.BOW_WAVE.to, 'the wave crests on the cat’s bow');
  assert.deepEqual(O.STAGE_PUSH, { from: O.PULLBACK.to, to: O.TABLEAU_HOLD.to }, 'one slow push from the pull-back’s settle through the held tableau (U5b)');
});

test('outro 5, E5 BOWS → CURSOR (U5 / U6 / U5b): ba-da-BUM on 5.1 / 5.1& / 5.2, the plink on 5.1a, the button, the bowed tableau held half a beat, then a beat and a half of stream, power-down, fold and dive, the slam on 5.4 with its tick, one blink', () => {
  assert.deepEqual(O.BOWS, { cat: at(5), guest: at(5, 1.5), hero: at(5, 2) });
  assert.deepEqual([O.BOWS.cat, O.BOWS.guest, O.BOWS.hero], [O.KICKS[4], O.CLAPS[2], O.KICKS[5]], 'each bow on a drum hit: kick, clap, the button');
  assert.deepEqual(O.DROP, { from: O.BOWS.guest, to: at(5, 1.75) }, 'the last drop plinks on 5.1a');
  assert.equal(O.ANTICIPATE, O.BOWS.hero - 3);
  assert.equal(O.TABLEAU, O.BOWS.hero + 6, 'the three are down together a 16th into his bow');
  assert.deepEqual(O.STOP, { from: O.BOWS.hero, to: O.BOWS.hero + 3 }, 'the band stops on his bow, over a 32nd');
  assert.equal(O.SILENT, O.STOP.to);
  // U5b (the lead's ruling after review round 1): the bowed tableau holds to 5.2& (half a beat from the button), nothing leaving.
  assert.deepEqual(O.TABLEAU_HOLD, { from: O.TABLEAU, to: at(5, 2.5) }, 'the climax picture settles: held from the bottom of his bow to 5.2&');
  assert.equal(O.TABLEAU_HOLD.to - O.BOWS.hero, 12, 'half a beat from the button');
  // Then one move of a beat and a half: the company home one after another, the tube powering down, the push into him, the fold, the dive.
  assert.deepEqual(O.POWER_DOWN, { from: O.TABLEAU_HOLD.to, to: O.SLAM.to }, 'the tube powers down from the end of the hold to the landing');
  assert.deepEqual(O.ABSORB, { from: O.TABLEAU_HOLD.to, to: O.FOLD.from }, 'the company streams in from the end of the hold and is home by the fold');
  assert.deepEqual(O.CLEAR, O.ABSORB, 'the stage clears by the power-down and the stream, not by a wipe');
  assert.deepEqual(O.FOLD, { from: at(5, 3.5), to: at(5, 3.75) }, 'a 16th of fold from 5.3&, the █ whole a 16th before the landing');
  assert.deepEqual(O.HERO_HOLD, { from: O.TABLEAU, to: O.FOLD.from });
  assert.deepEqual(O.SLAM, { from: O.TABLEAU_HOLD.to, to: at(5, 4) }, 'the dive from the end of the hold, landing on 5.4');
  assert.equal(O.SLAM.to - O.SLAM.from, 36, 'the move: a beat and a half');
  // U6: one continuous move of at least a beat from his bow to the landing; the █ is whole while the camera is still moving.
  assert.ok(O.SLAM.to - O.BOWS.hero >= 48, 'U5b: two beats from his bow to the █ (r4: one)');
  assert.ok(O.ABSORB.to - O.ABSORB.from >= 24, 'U5b: the company streams in over a beat: one after another, visibly');
  assert.ok(O.FOLD.to - O.FOLD.from >= 6, 'the fold is read over a 16th');
  assert.ok(O.FOLD.to < O.SLAM.to, 'the █ arrives still moving and lands with the tick');
  assert.deepEqual(O.RING_OUT, { from: O.STOP.from, to: O.SETTLE.from }, 'the I chord rings from the button, under the landing’s tick, and has died by the settle');
  // The music's keys (MAP-61 §8, the music fixer): the ring from the button, the landing's tick on the landing, the tail dead by the settle.
  assert.equal(O.TICKS[0], O.SLAM.to);
  assert.ok(O.TICKS[0] < O.RING_OUT.to && O.RING_OUT.to <= O.SETTLE.from);
  // The judge's G1: no two peaks of the bows, the drop, the hold, the fold and the landing on one frame.
  const peaks = [O.BOWS.cat, O.BOWS.guest, O.DROP.to, O.ANTICIPATE, O.BOWS.hero, O.TABLEAU, O.TABLEAU_HOLD.to, O.FOLD.from, O.FOLD.to, O.SLAM.to];
  assert.equal(new Set(peaks).size, peaks.length);
  for (let i = 1; i < peaks.length; i++) assert.ok(peaks[i] > peaks[i - 1], `${peaks[i]} after ${peaks[i - 1]}`);
  assert.deepEqual(O.CHORDS_OUT.map((c) => [c.chord, c.at]), [['IV', at(1)], ['Vsus', at(2)], ['V', at(2, 2)], ['I', at(3)], ['I', at(4)], ['I', at(5, 2)]], 'IV → Vsus → V → the first tonic, re-struck on the burst and on the button (music.md §2.2)');
});

test('the story runs in order, every beat owned: decode → bytes → face → stamp → slot → ✓ → missing dub → exit → line → ω → curl → iris-out → knocks → pry → wink → ↑ ↑ → run → burst → calls → walk-ons → bows → button → fold → slam → ticks', () => {
  const chain = [
    O.OUTRO_START, O.HEX, O.FLIPS[0], O.GATHER.to, O.STAMP, O.SLOT.from, O.FLICK.from, O.RETICLE.from, O.LAST_BEAT, O.DUB_MISSING, O.ENTER, O.LINE,
    O.BEEP, O.CURL.from, O.CLOSE.from, O.KNOCKS[0], O.KNOCKS[1], O.OPEN, O.MONITOR_BACK, O.WINK, O.SURVIVED, O.RECALL[0], O.RECALL[1], O.RUN,
    O.BURST, O.HOP.to, O.CALLS[1], O.WALK_ON.from, O.CAT_DASH.from, O.CALLS[7], O.WALK_ON.to, O.BOWS.cat, O.BOWS.guest, O.DROP.to, O.BOWS.hero, O.TABLEAU,
    O.TABLEAU_HOLD.to, O.FOLD.from, O.FOLD.to, O.SLAM.to, O.SETTLE.from, O.LOOP,
  ];
  for (let i = 1; i < chain.length; i++) assert.ok(chain[i] > chain[i - 1], `${chain[i]} after ${chain[i - 1]} (#${i})`);
});

// ——— The parts and the dispatcher ———————————————————————————————————————————————————————————————————————————————————————————————

test('the five parts tile the ending from its downbeat to the film’s end, each at least a beat, on the sheet’s seams', () => {
  assert.deepEqual(O.OUTRO_PARTS.map((p) => [p.name, p.from, p.to]), [
    ['blue', at(1), at(2, 2)],
    ['monitor', at(2, 2), at(3)],
    ['iris', at(3), at(4)],
    ['company', at(4), at(5, 4)],
    ['cursor', at(5, 4), O.LOOP],
  ]);
  for (let i = 1; i < O.OUTRO_PARTS.length; i++) assert.equal(O.OUTRO_PARTS[i].from, O.OUTRO_PARTS[i - 1].to);
  for (const p of O.OUTRO_PARTS) assert.ok(p.to - p.from >= 24, p.name);
  assert.deepEqual([O.OUTRO_PARTS[1].from, O.OUTRO_PARTS[2].from, O.OUTRO_PARTS[3].from, O.OUTRO_PARTS[4].from], [O.LINE, O.OPEN, O.BURST, O.SLAM.to]);
  // By instant: a sub-frame a quarter before a seam is still the earlier part's; outside the ending, the nearest part.
  for (let i = 1; i < O.OUTRO_PARTS.length; i++) {
    const s = O.OUTRO_PARTS[i].from;
    assert.equal(O.outroPartIndex(s - 0.25), i - 1, `${s} − 0.25`);
    assert.equal(O.outroPartIndex(s), i, `${s}`);
  }
  assert.equal(O.outroPartIndex(O.OUTRO_START - 0.25), 0);
  assert.equal(O.outroPartIndex(O.LOOP + 0.25), O.OUTRO_PARTS.length - 1);
  assert.deepEqual(O.OUTRO_SEGMENT, { from: O.OUTRO_START, to: O.OUTRO_END }, 'one segment: no hard cut');
});

test('the seams a cut is checked on: drop 2’s hand-off and every part hand-off, the two impact landings (the squeeze on 2.2, the slam on 5.4) reported, not judged', () => {
  assert.deepEqual(O.OUTRO_SEAMS.map((s) => s.at), [O.OUTRO_START, ...O.OUTRO_PARTS.slice(1).map((p) => p.from)], 'one seam per hand-off, in order');
  assert.deepEqual(O.OUTRO_SEAMS.filter((s) => s.kind === 'impact').map((s) => s.at), [O.SQUEEZE.to, O.SLAM.to], 'the impacts are the two I landings');
  assert.deepEqual([O.SQUEEZE.to, O.SLAM.to], [at(2, 2), at(5, 4)]);
  assert.equal(O.OUTRO_SEAMS.map((s) => (s.kind === 'impact' ? `${s.at}:cut` : String(s.at))).join(','), [at(1), `${at(2, 2)}:cut`, at(3), at(4), `${at(5, 4)}:cut`].join(','));
});

test('the dispatcher builds one part per row, hands each frame to its part, and keeps one segment (constructible in Node)', () => {
  const scene = new OutroScene();
  assert.deepEqual(scene.parts.map((p) => p.constructor.name), ['OutroBlue', 'OutroMonitor', 'OutroIris', 'OutroCompany', 'OutroCursor']);
  for (let f = O.OUTRO_START; f < O.LOOP; f += 3) {
    assert.deepEqual(scene.segment(f), { from: O.OUTRO_START, to: O.OUTRO_END }, `segment ${f}`);
    assert.ok(scene.temporal(f).samples >= 1, `temporal ${f}`);
    assert.ok(scene.look(f).exposure > 0, `look ${f}`);
  }
});

// ——— The promise, the signature, the copy ——————————————————————————————————————————————————————————————————————————————————————

test('the promise is kept to the frame: staged line 3, the scheduler’s stamp in the small print and W5’s frame row all name WINK, the frame he winks on', () => {
  assert.equal(C.STAGED[2].text, `next wink at frame ${O.WINK}`);
  const digits = C.STAGED[2].inks.find((r) => r.ink === 'amber')!;
  assert.equal([...C.STAGED[2].text].slice(digits.from, digits.to).join(''), String(O.WINK), 'the frame number in his amber');
  assert.equal(C.SMALL_PRINT_LINES[10].text, `${C.stamp(O.WINK)} blink-scheduler: next wink`);
  assert.equal(C.W5_WINK_ROW, `frame     ${O.WINK} ✧ · ${(O.WINK / FPS).toFixed(6)} s`);
  assert.ok(C.SMALL_PRINT_LINES[10].text.startsWith(`[${(O.WINK / FPS).toFixed(6).padStart(12)}]`));
  assert.equal(C.stamp(5400), '[   90.000000]', 'the stamp format (a utility check of the boot log’s format, not a film position)');
});

test('the signature is the UTF-8 of • ω •: its groups decode into his glyphs, one per flip, and the xxd line is the one gutter that decodes', () => {
  assert.deepEqual([...new TextEncoder().encode(C.SIGNATURE_TEXT)], [...C.SIGNATURE_BYTES]);
  assert.equal(C.SIGNATURE, 'E2 80 A2 20 CF 89 20 E2 80 A2');
  assert.equal(C.SIG_GROUP.length, C.SIGNATURE_BYTES.length);
  const decoded = [0, 1, 2].map((g) => new TextDecoder().decode(new Uint8Array(C.SIGNATURE_BYTES.filter((_, i) => C.SIG_GROUP[i] === g))));
  assert.deepEqual(decoded, [...C.SIG_GLYPHS]);
  assert.ok(C.SIGNATURE_BYTES.every((b, i) => (C.SIG_GROUP[i] === -1) === (b === 0x20)), 'the spaces are the gaps');
  assert.equal(C.SIG_GLYPHS.length, O.FLIPS.length);
  assert.equal(C.SMALL_PRINT_LINES[0].text, `0x7ffd3a40  ${C.SIGNATURE.toLowerCase()}  |• ω •|`);
  assert.ok(C.FOOTNOTES[0].endsWith(C.SIGNATURE));
});

test('the blue screen’s copy: four staged lines (cute dumped inverse; the culprit’s registered face in red; the promise; the antivirus’s last word with its red chip and ✓), one body line, 15 progress states to 100 %', () => {
  assert.deepEqual(C.STAGED.map((l) => [l.style, l.text]), [
    ['inverse', 'Segmentation fault (cute dumped)'],
    ['plain', 'liquid detected on /dev/keyboard (￣▽￣)'],
    ['plain', `next wink at frame ${O.WINK}`],
    ['plain', '[DEFENDER] threat removed ✓'],
  ]);
  assert.equal(C.STAGED.length, O.LINES.length);
  for (const l of C.STAGED) for (const r of l.inks) assert.ok(r.from >= 0 && r.to <= [...l.text].length && r.from < r.to, `${l.text}: ${r.from}–${r.to}`);
  const cut = (l: (typeof C.STAGED)[number], ink: string) => l.inks.filter((r) => r.ink === ink).map((r) => [...l.text].slice(r.from, r.to).join(''));
  assert.deepEqual(cut(C.STAGED[1], 'redChip'), ['(￣▽￣)'], 'the guest’s registered (out of date) signature, red on navy');
  assert.deepEqual([cut(C.STAGED[3], 'redChip'), cut(C.STAGED[3], 'red')], [['[DEFENDER]'], ['✓']]);
  assert.equal(C.progressText(0), 'saving friends [          ]   0%');
  assert.equal(C.progressText(C.PROGRESS_STEPS), 'saving friends [██████████] 100%');
  for (let s = 0; s <= C.PROGRESS_STEPS; s++) assert.equal([...C.progressText(s)].length, [...C.progressText(0)].length, `step ${s} keeps its width`);
  assert.equal(C.BODY_COPY, 'kaomoji.exe partied a little too hard.');
});

test('the small print is exactly 14 lines that fit its column (≤ 64 cells: 620 px at 16 px): the xxd line, the film’s sections in reverse with their last bars, the scheduler, the table, the stats, heartbeat lost', () => {
  const lines = C.SMALL_PRINT_LINES.map((l) => l.text);
  assert.equal(lines.length, 14);
  for (const l of lines) assert.ok(lineWidth(l) <= 64, `${lineWidth(l)} cells: ${l}`);
  const trace = lines.slice(1, 9);
  const parts = ['drop2', 'break', 'club', 'cosmos', 'transition', 'riso', 'swiss', 'intro'] as const;
  trace.forEach((l, i) => {
    assert.ok(l.startsWith(`#${i} `), l);
    assert.ok(l.includes(`:${String(partBars(parts[i]).at(-1)).padStart(2, '0')}`), `${l}: the ${parts[i]}’s last bar`);
  });
  assert.ok(trace[0].includes(C.GUEST_OUT.infected), 'the last drop is the infected guest’s');
  assert.ok(trace[7].endsWith(COMMAND), 'main(): kaomoji --run --party');
  assert.equal(lines[9], '[FAIL] stopping blink-scheduler.service: still blinking');
  assert.equal(lines[11], `[EXIT] ${C.GUEST_OUT.flip}   [ OK ] ${C.TABLE_BACK}`);
  assert.equal(lines[12], `${TOTAL_BARS}/${TOTAL_BARS} bars · ${TOTAL_FRAMES} frames · 150 bpm · 0 tofu · friends online: 1`);
  assert.equal(lines[13], '[FATAL] heartbeat lost: (•ω•)');
  for (const l of C.SMALL_PRINT_LINES) for (const r of l.inks) assert.ok(r.from >= 0 && r.to <= [...l.text].length && r.from < r.to, l.text);
  // His ω in the infected guest's face is amber, the rest of it red (the colour law).
  const g = C.SMALL_PRINT_LINES[1];
  const omega = [...g.text].lastIndexOf('ω');
  assert.equal(g.inks.find((r) => omega >= r.from && omega < r.to)!.ink, 'amber');
});

test('the readout (W5): the boot’s verdict bookended, the wink’s honest frame, the antivirus counting 1 · 2 · 4 · 8 · ∞, and its last line friendly; values from column 10 of the row', () => {
  assert.ok(C.W5_DEFENDER.clean.endsWith('0 threats ✓'), 'the boot log’s `[SCAN] … 0 threats ✓`, bookended');
  assert.equal(C.W5_DEFENDER.wink, 'defender  1 threat');
  assert.deepEqual(C.W5_DEFENDER.doubling, ['defender  1 threat', 'defender  2 threats', 'defender  4 threats', 'defender  8 threats']);
  assert.equal(C.W5_DEFENDER.infinite, 'defender  ∞ threats');
  assert.equal(C.W5_DEFENDER.friendly, 'defender  0 threats (•ω•)');
  assert.equal(C.W5_SURVIVED, '[ OK ] (•ω•) survived');
  // Every row is a label padded to 10 characters, then its value: the values line up in one column.
  for (const row of [C.w5Friends(1), C.w5Frame(O.MONITOR_BACK), C.W5_WINK_ROW, C.W5_DEFENDER.clean, C.W5_DEFENDER.infinite, C.W5_DEFENDER.friendly]) {
    assert.match(row.slice(0, 10), /^[a-z]+ +$/, `label: ${row}`);
    assert.match(row.slice(10), /^\S/u, `value: ${row}`);
  }
  assert.ok(C.W5_TITLE.trim() === 'kaomoji.exe :: party monitor');
  assert.equal(SH.W5_BOX.valueCol, 12, 'two columns of margin + the 10-character labels');
});

test('the prompt recalls the antivirus’s `exit`, then his own first command; the counter doubles to 8', () => {
  assert.deepEqual(C.RECALL_LINES, [`${PROMPT}↑`, `${PROMPT}exit`, `${PROMPT}${COMMAND}${CURSOR}`]);
  assert.equal(C.EXIT_LINE, `${PROMPT}${C.EXIT_TYPED}`);
  assert.deepEqual(C.COUNTER_TEXT.steps.map(Number), [1, 2, 4, 8]);
});

test('the homage borrows the crash screen’s layout, never its words or its sad face', () => {
  for (const t of C.OUTRO_TEXTS) for (const b of C.BLUE_SCREEN_BANNED) assert.ok(!t.text.toLowerCase().includes(b), `"${b}" in ${t.where}: ${t.text}`);
});

// ——— The cast ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('the cast: only the hero, the guest and the cat act (the film’s own faces); the curtain call’s headliners are one per world, in film order, each its own face, none a principal', () => {
  assert.equal(C.HERO_OUT.alive, faceText(PROTAGONIST));
  assert.equal(C.CAT_OUT.face, faceText(CAT));
  for (const f of Object.values(C.HERO_OUT)) assert.ok(f === '✧' || /ω/.test(f), `${f}: a face of his rig`);
  assert.ok([C.GUEST_OUT.infected, C.GUEST_OUT.onStage].every((f) => f.includes('￣ω￣')), 'the guest arrives infected');
  assert.deepEqual(C.HEADLINERS.map((h) => h.world), ['boot', 'swiss', 'riso', 'transition', 'cosmos', 'club', 'interlude', 'drop2']);
  assert.deepEqual(C.HEADLINERS.map((h) => h.seat), ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4']);
  assert.deepEqual(C.HEADLINERS.map((h) => h.spot), [null, 1, 2, 3, 4, 5, 6, 7], 'seven wait in the spots; the boot’s prints in on the burst');
  const norm = (s: string) => s.normalize('NFKC').replace(/\s/g, '');
  const faces = C.HEADLINERS.map((h) => norm(h.face));
  assert.equal(new Set(faces).size, faces.length, 'no headliner twice');
  const principals = [...Object.values(C.HERO_OUT), ...Object.values(C.GUEST_OUT), ...Object.values(C.CAT_OUT), C.TABLE_BACK].map(norm);
  for (const f of faces) assert.ok(!principals.includes(f), `${f} is a principal`);
});

test('every string the ending draws is listed for check-glyphs with the role its scene draws it in', () => {
  const listed = (role: string) => new Set(C.OUTRO_TEXTS.filter((t) => t.role === role).map((t) => t.text));
  const mono = listed('mono');
  const rounded = listed('rounded');
  for (const f of Object.values(C.HERO_OUT)) assert.ok(rounded.has(f), `hero ${f}`);
  for (const t of [C.SIGNATURE, ...C.STAGED.map((l) => l.text), ...C.FOOTNOTES, ...C.SMALL_PRINT_LINES.map((l) => l.text), C.EXIT_LINE, ...C.RECALL_LINES, C.W5_WINK_ROW, C.W5_SURVIVED, C.GUEST_OUT.onStage, C.CAT_OUT.face, C.CAT_OUT.bow, ...C.HEADLINERS.map((h) => h.face)]) assert.ok(mono.has(t), `mono ${t}`);
  for (let s = 0; s <= C.PROGRESS_STEPS; s++) assert.ok(mono.has(C.progressText(s)));
  assert.ok(listed('display').has(C.BODY_COPY));
  assert.deepEqual(C.OUTRO_EXTRUDE, []);
});

// ——— The hand-offs the parts share (sheet §4) ————————————————————————————————————————————————————————————————————————————————

test('the spots: clear of the main iris at its widest, of each other, of W5 and of the frame’s edge; each friend flies to its headliner’s seat', () => {
  const d = (a: SH.Point, b: SH.Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  assert.equal(SH.SPOT_AT.length, 7);
  SH.SPOT_AT.forEach((s, i) => {
    assert.ok(d(s.centre, SH.IRIS.centre) - s.r - SH.IRIS.strained >= 34, `spot ${i + 1} vs the iris`);
    assert.ok(s.centre[0] - s.r >= 16 && s.centre[0] + s.r <= 1920 - 16 && s.centre[1] - s.r >= 16 && s.centre[1] + s.r <= 1080 - 16, `spot ${i + 1} vs the frame`);
    const nx = Math.max(SH.W5_BOX.x0, Math.min(s.centre[0], SH.W5_BOX.x1));
    const ny = Math.max(SH.W5_BOX.y0, Math.min(s.centre[1], SH.W5_BOX.y1));
    assert.ok(d(s.centre, [nx, ny]) > s.r, `spot ${i + 1} vs W5`);
    for (let j = i + 1; j < SH.SPOT_AT.length; j++) assert.ok(d(s.centre, SH.SPOT_AT[j].centre) - s.r - SH.SPOT_AT[j].r >= 50, `spots ${i + 1}–${j + 1}`);
  });
  for (const h of C.HEADLINERS) {
    const seat = SH.seatAt(h.seat);
    assert.ok(seat.at[0] > 0 && seat.em >= 44, h.world);
  }
  assert.deepEqual(C.HEADLINERS.filter((h) => h.spot !== null).map((h) => SH.seatAt(h.seat).at), [[680, 606], [1240, 606], [1660, 606], [260, 690], [680, 690], [1240, 690], [1660, 690]]);
});

test('the slam lands on S01’s own pose at its frame −24 (U5b; r4: −48), and the tube settles into frame 0’s warm-up: the loop is one more beat', () => {
  // S01 at SLAM.to − LOOP (src/shots/intro.ts, the approved camera, read live): the cursor cell on screen and the zoom. The shared
  // contract CURSOR_AT_SLAM (src/shots/outroShared.ts, the lead's) must say the same: (1053.2, 540) × 15.534 at −24.
  assert.equal(O.SLAM.to - O.LOOP, -24, 'U5b: the █ lands on 5.4, S01’s frame −24');
  const pose = introCamera(O.SLAM.to - O.LOOP, [0, 0]);
  const zoom = FRONT_DISTANCE / Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]);
  const cursor = cellCenter(0, 0);
  const onScreen = [960 + (cursor[0] - pose.target[0]) * zoom, 540 - (cursor[1] - pose.target[1]) * zoom];
  assert.ok(Math.abs(onScreen[0] - SH.CURSOR_AT_SLAM.at[0]) < 0.5 && Math.abs(onScreen[1] - SH.CURSOR_AT_SLAM.at[1]) < 0.5, `S01 at ${O.SLAM.to - O.LOOP}: ${onScreen} vs CURSOR_AT_SLAM ${SH.CURSOR_AT_SLAM.at}`);
  assert.ok(Math.abs(zoom - SH.CURSOR_AT_SLAM.zoom) < 0.01, `${zoom} vs ${SH.CURSOR_AT_SLAM.zoom}`);
  // The blinks are S01's, replayed from the slam's landing (those that start before the loop: one); a tick a beat across the seam into frames 0 and 24.
  assert.deepEqual(O.CURSOR, CURSOR_BLINKS.map(([a, b]) => [a + O.SLAM.to, b + O.SLAM.to]).filter(([a]) => a < O.LOOP));
  assert.equal(O.CURSOR.length, 1, 'one blink before the loop');
  assert.deepEqual(O.TICKS, O.CURSOR.map(([a]) => a));
  const ticks = [...O.TICKS, O.LOOP + CURSOR_BLINKS[0][0], O.LOOP + CURSOR_BLINKS[1][0]];
  for (let i = 1; i < ticks.length; i++) assert.equal(ticks[i] - ticks[i - 1], 24, 'a tick a beat across the loop');
  assert.deepEqual(O.TICKS, [at(5, 4)], 'the one tick lands with the slam on 5.4: the last sound of the film');
  // The settle hands frame 0 its power: 0.15 there, as S01's warm-up starts.
  assert.deepEqual(O.SETTLE, { from: at(5, 4.75), to: O.LOOP });
  assert.equal(screenPower(0), 0.15);
  assert.ok(O.SETTLE.from >= O.CURSOR.at(-1)![1], 'the blink has gone out to its phosphor before the tube settles');
});
