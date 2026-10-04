import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as D from '../src/score/drop1.ts';
import { isHeld, partEnd, partFrame, partStart, partTail } from '../src/score/film.ts';
import { SPANS } from '../src/score/spans.ts';
import { FRAMES_PER_BEAT } from '../src/score/tempo.ts';

/** Positions in the cosmos and the club: bar 1-based, beat 0-based. */
const cosmos = (bar: number, beat = 0): number => partFrame('cosmos', bar, beat);
const club = (bar: number, beat = 0): number => partFrame('club', bar, beat);
const BEAT = FRAMES_PER_BEAT;
const SIXTEENTH = BEAT / 4;

test('Drop 1 runs from the drop on cosmos 1.1 to the smash on break 1.1', () => {
  assert.deepEqual([D.DROP1_START, D.DROP1_END, D.SMASH], [partStart('cosmos'), partEnd('club'), partStart('break')]);
});

test('on the 63-bar map both parts are 6 bars, both built through, with bridge A (v08, a stub) between them: the cosmos (its content ends on bridge A’s downbeat; nothing holds since its bars 5–6 were built, 2026-10-02) and the club — the comic club INK — to the smash', () => {
  assert.deepEqual([D.COSMOS_END, D.CLUB_END], [partEnd('cosmos'), D.SMASH]);
  assert.equal(D.COSMOS_END, partStart('bridgeA'));
  assert.equal(partEnd('bridgeA'), partStart('club'));
  assert.equal(partTail('cosmos'), null);
  assert.equal(partTail('club'), null);
  const drums = [...D.BANG_KICKS, ...D.KICKS, ...D.CLAPS, ...D.OPEN_HATS, ...D.HATS, ...D.FILL, ...D.BUILD_KICKS, ...D.BUILD_CLAPS, ...D.ROLL];
  for (const f of drums) assert.ok(!isHeld(f), `no drum in a held bar (${f})`);
});

test('cosmos bar 1 is half time under the freeze: kicks on 1, 2½ and 3, the snare as time snaps back, a sixteenth fill on beat 4', () => {
  assert.equal(D.BURST, cosmos(1));
  assert.deepEqual({ ...D.FREEZE }, { from: cosmos(1) + SIXTEENTH, to: cosmos(1, 2) });
  assert.equal(D.RESUME, cosmos(1, 2));
  assert.deepEqual([...D.BANG_KICKS], [cosmos(1), cosmos(1, 1.5), cosmos(1, 2)]);
  assert.deepEqual([...D.BANG_SNARES], [cosmos(1, 2)]);
  assert.deepEqual([...D.FILL], [cosmos(1, 3), cosmos(1, 3.25), cosmos(1, 3.5), cosmos(1, 3.75)]);
});

test('cosmos bar 2 to club 3.3 is four on the floor: a kick on every beat, claps on 2 and 4, open hats on the offbeats', () => {
  // Every beat of cosmos 2.1 – club 3.2 (v04's grid; the cosmos is built through, so none of its bars is held and skipped; nor is bridge A,
  // built in v08 with a kick on each of its beats: src/score/bridgeA.ts KICKS).
  const beats = Array.from({ length: (club(3, 1) - cosmos(2)) / BEAT + 1 }, (_, i) => cosmos(2) + BEAT * i).filter((f) => !isHeld(f));
  assert.deepEqual([...D.KICKS], beats, 'every beat');
  assert.equal(D.KICKS.length, (club(3, 1) - cosmos(2)) / BEAT + 1, 'cosmos 2.1 – 6.4, bridge A and club 1.1 – 3.2');
  for (let f = partStart('bridgeA'); f < partEnd('bridgeA'); f += BEAT) assert.ok(D.KICKS.includes(f), `bridge A's beat ${f}`);
  assert.equal(D.KICKS.at(-1), club(3, 1));
  assert.deepEqual(D.CLAPS.slice(0, 4), [cosmos(2, 1), cosmos(2, 3), cosmos(3, 1), cosmos(3, 3)]);
  assert.ok(D.CLAPS.every((f) => (f - cosmos(2)) % (2 * BEAT) === BEAT));
  assert.deepEqual(D.OPEN_HATS.slice(0, 2), [cosmos(2, 0.5), cosmos(2, 1.5)]);
  assert.equal(D.HATS[0], cosmos(1));
  const sixteenths = Array.from({ length: (club(3, 2) - cosmos(1)) / SIXTEENTH }, (_, i) => cosmos(1) + SIXTEENTH * i).filter((f) => !isHeld(f));
  assert.ok(D.HATS.every((f, i) => f === sixteenths[i]) && D.HATS.length === sixteenths.length && D.HATS.at(-1)! < D.FLIP);
});

test('one level of scale arrives on each downbeat from cosmos bar 2 to club bar 2; the meteors land on the kicks of beats 2–4', () => {
  assert.deepEqual({ ...D.LEVELS }, { earth: cosmos(2), solar: cosmos(3), galaxy: cosmos(4), cosmos: partStart('club'), table: club(2) });
  assert.deepEqual([...D.METEOR_LANDS], [cosmos(2, 1), cosmos(2, 2), cosmos(2, 3)]);
  for (const f of D.METEOR_LANDS) assert.ok(D.KICKS.includes(f), `${f} is a kick`);
});

test('the throw: the spill on club bar 3, (•ω•) thrown on its beat 3, flying at us with the drums driving on to the hit on the last beat of club bar 4, a beat of silence, the glass breaking', () => {
  assert.equal(D.SIDE, club(3));
  assert.equal(D.FLIP, club(3, 2));
  assert.deepEqual({ ...D.THROW }, { from: club(3, 2), to: club(4, 3) });
  assert.equal(D.HIT, club(4, 3));
  assert.deepEqual({ ...D.SILENCE }, { from: club(4, 3), to: partStart('break') });
  assert.deepEqual([...D.BUILD_KICKS], [club(3, 2), club(3, 3), club(4), club(4, 1), club(4, 2)]);
  assert.deepEqual([...D.BUILD_CLAPS], [club(3, 3), club(4, 1)]);
  assert.deepEqual(
    [...D.ROLL],
    [club(4), club(4, 0.5), club(4, 1), club(4, 1.25), club(4, 1.5), club(4, 1.75), club(4, 2), club(4, 2.125), club(4, 2.25), club(4, 2.375), club(4, 2.5), club(4, 2.625), club(4, 2.75), club(4, 2.875)],
  );
});

test('the stutter shows slices of 6, 6, 3, 3, 3, 3 frames, each even slice repeating the one before; outside it time runs on', () => {
  assert.deepEqual({ ...D.STUTTER }, { from: cosmos(4, 3), to: D.COSMOS_END });
  const S = D.STUTTER.from;
  const shown = Array.from({ length: 24 }, (_, i) => D.stutterFrame(S + i));
  assert.deepEqual(shown, [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 7, 8, 9, 10, 11, 9, 10, 11].map((k) => S + k));
  assert.equal(D.stutterFrame(S - 0.5), S - 0.5);
  assert.equal(D.stutterFrame(D.STUTTER.to), D.STUTTER.to);
  assert.equal(D.stutterFrame(S + 7.25), S + 1.25, 'sub-frames keep their fraction');
});

test('every Drop 1 event sits on the 32nd-note grid', () => {
  const all = [D.BURST, D.FREEZE.from, D.FREEZE.to, ...D.BANG_KICKS, ...D.FILL, ...D.KICKS, ...D.CLAPS, ...D.OPEN_HATS, ...Object.values(D.LEVELS), ...D.METEOR_LANDS, D.STUTTER.from, D.SIDE, D.FLIP, D.HIT, ...D.BUILD_KICKS, ...D.BUILD_CLAPS, ...D.ROLL];
  for (const f of all) assert.equal(f % 3, 0, `${f}`);
});

test('the 3D cosmos draws the cosmos, the comic club INK the club up to the glass giving way on break 1.1, where the break takes over (and owns the glass falling away)', () => {
  const at = (f: number) => SPANS.find((s) => f >= s.from && f < s.to)!.key;
  assert.deepEqual(
    [at(partStart('cosmos')), at(partEnd('cosmos') - 1), at(partStart('bridgeA')), at(partStart('club')), at(partEnd('club') - 1), at(partStart('break'))],
    ['kosmos', 'kosmos', 'bridgeA', 'club', 'club', 'break'],
  );
  assert.deepEqual(
    SPANS.filter((s) => s.key === 'club').map((s) => [s.from, s.to, s.held ?? false]),
    [[partStart('club'), D.SMASH, false]],
    'the club draws every frame to the smash (its last beat the v04 cracked glass)',
  );
  assert.deepEqual(SPANS.filter((s) => s.key === 'kosmos').map((s) => [s.from, s.to, s.held ?? false]), [[D.DROP1_START, partStart('bridgeA'), false]], 'the cosmos draws every frame to bridge A (no held tail), which holds its last one');
});
