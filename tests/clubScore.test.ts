// The comic club INK's score (src/score/club.ts; build sheet notes/b58/club-sheet.md §2–§4): its bounds on the map, the drum grid
// and the story beats as designed, bars 5–6 exactly v04's throw moved onto club bars 5–6, everything on the 32nd-note grid, the cuts
// and shots tiling the club, and its camera energy (no white flash, the throw's shakes stopping dead on the hit, the glass beat with
// v04's own draw).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coverZoom, covered } from '../src/engine/view.ts';
import { punch, shake } from '../src/motion/hit.ts';
import * as C from '../src/score/club.ts';
import * as D1 from '../src/score/drop1.ts';
import { rigAt } from '../src/score/energy.ts';
import { partBar, partEnd, partFrame, partStart, seedFrame } from '../src/score/film.ts';
import { FRAMES_PER_BAR, FRAMES_PER_BEAT } from '../src/score/tempo.ts';
import { inkFlashAt, inkRigAt } from '../src/shots/clubInk.ts';
import { assertOnGrid, scoreFrames } from './lib/energyAudit.ts';

const BEAT = FRAMES_PER_BEAT;
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** v04's club bars 3–4 (drop1.ts, still at club bars 3–4 on today's map) moved onto the INK club's bars 5–6. */
const MOVE = C.club(5) - partFrame('club', 3);

test('the club is the part “club”: 6 bars from the dot inking on club 1.1 to the glass giving way on break 1.1; club() is partFrame("club")', () => {
  assert.deepEqual({ ...C.CLUB }, { from: partStart('club'), to: partEnd('club') });
  assert.equal(C.CLUB.to - C.CLUB.from, 6 * FRAMES_PER_BAR);
  assert.equal(C.SMASH, partStart('break'));
  assert.equal(C.HIT, partFrame('club', 6, 3), 'the hit on club 6.4');
  assert.deepEqual({ ...C.SILENCE }, { from: C.HIT, to: C.SMASH });
  assert.equal(C.club(2, 2.125), partFrame('club', 2, 2.125));
  assert.equal(partBar('club'), 24, 'film bars 24–29 on the 63-bar map, after bridge A (the cover’s issue number reads it: No. 23 on the 60- and 61-bar maps)');
});

test('every frame the score exports sits on the 32nd-note grid (accents and windows included)', () => {
  assertOnGrid(scoreFrames('club', C));
});

test('the drum grid (design §8): a kick every beat to club 6.3, the flam a 32nd after club 2.3, claps on 2 and 4, open hats on the &s but the scratch’s, 16ths but under the scanner ticks', () => {
  assert.deepEqual([...C.KICKS], steps(C.CLUB.from, C.HIT, BEAT));
  assert.equal(C.KICKS.length, 23);
  assert.equal(C.FLAM, C.club(2, 2) + 3);
  assert.deepEqual([...C.CLAPS], [1944, 1992, 2040, 2088, 2136, 2184, 2232, 2280, 2328, 2376, 2424].map((f) => f - 1920 + C.CLUB.from));
  assert.equal(C.OPEN_HATS.length, 17);
  assert.ok(!C.OPEN_HATS.includes(C.SCRATCH) && C.OPEN_HATS.every((f) => (f - C.CLUB.from) % BEAT === BEAT / 2 && f < C.THROW), 'every & to club 5.2&, but 2.4&');
  assert.deepEqual([...C.SCANNER_TICKS], steps(C.club(4, 1.25), C.club(4, 3), 6));
  assert.equal(C.SCANNER_TICKS.length, 7, 'seven ticks + the LOCK fill the balloon’s eight cells');
  assert.ok(C.HATS.every((f) => (f - C.CLUB.from) % 6 === 0 && f < C.THROW && !C.SCANNER_TICKS.includes(f)));
  assert.equal(C.HATS.length + C.SCANNER_TICKS.length, (C.THROW - C.CLUB.from) / 6);
  assert.deepEqual([...C.FILL], [C.club(3, 3), C.club(3, 3.25), C.club(3, 3.5), C.club(3, 3.75)]);
  assert.deepEqual([...C.RIDE], [C.club(3), C.club(3, 1), C.club(3, 2), C.club(3, 3)]);
  assert.equal(C.STABS.length, 18);
});

test('club bars 5–6 are v04’s club bars 3–4, moved: the kick, the splash, the lights out, the grab, the throw, its kicks, claps and roll, the hit', () => {
  assert.deepEqual([C.KICK_CUP, C.SPLASH, C.LIGHTS_OUT, C.GRAB, C.THROW, C.HIT], [D1.SIDE, D1.SPLASH, D1.LIGHTS_OUT, D1.GRAB, D1.FLIP, D1.HIT].map((f) => f + MOVE));
  assert.deepEqual([...C.THROW_KICKS], D1.BUILD_KICKS.map((f) => f + MOVE));
  assert.deepEqual([...C.THROW_CLAPS], D1.BUILD_CLAPS.map((f) => f + MOVE));
  assert.deepEqual([...C.ROLL], D1.ROLL.map((f) => f + MOVE));
  assert.equal(C.ROLL.length, 14);
  assert.deepEqual([...C.FLICKS], C.ROLL.slice(0, 9), 'panels 1–9 flick on the roll’s first nine hits');
});

test('the story beats sit where the design puts them (final.md’s frames, where club 1.1 = 1920; the film’s are design − 1920 + CLUB.from, 2112 today)', () => {
  const at = (f: number) => f - 1920 + C.CLUB.from;
  const want: [string, number, number][] = [
    ['DOT_INKS', C.DOT_INKS, at(1920)], ['PULL_BACK', C.PULL_BACK, at(1944)], ['CROWD_UP', C.CROWD_UP, at(1956)], ['STOMP', C.STOMP, at(1968)],
    ['CORNER_BOX', C.CORNER_BOX, at(1974)], ['TAGLINE', C.TAGLINE, at(1980)], ['BARCODE', C.BARCODE, at(1986)], ['DISCO', C.DISCO, at(1992)],
    ['TEAR', C.TEAR, at(2028)], ['HIGH_FIVE', C.HIGH_FIVE, at(2040)], ['FIST_BUMP', C.FIST_BUMP, at(2088)], ['TING', C.TING, at(2076)],
    ['INSET', C.INSET, at(2100)], ['RECORD', C.RECORD, at(2112)], ['SWAP', C.SWAP, at(2136)], ['FLOWER', C.FLOWER, at(2160)],
    ['MATCH_CUP', C.MATCH_CUP, at(2208)], ['SHADES', C.SHADES, at(2232)], ['LENS', C.LENS, at(2256)], ['LOCK', C.LOCK, at(2280)],
    ['NOTICE', C.NOTICE, at(2292)], ['KICK_CUP', C.KICK_CUP, at(2304)], ['RED_EYES', C.RED_EYES, at(2334)], ['BORDER_SNAP', C.BORDER_SNAP, at(2364)],
    ['PAGE', C.PAGE, at(2376)], ['CLEAR', C.CLEAR, at(2466)], ['HIT', C.HIT, at(2472)],
  ];
  for (const [name, got, frame] of want) assert.equal(got, frame, name);
  assert.deepEqual(C.LEAPS.map((l) => [l.from, l.to]), [[at(2004), at(2016)], [at(2052), at(2064)]]);
  assert.deepEqual([...C.BENDAY_RINGS], [at(1926), at(1932), at(1938), at(1944)]);
  assert.deepEqual([...C.INFECTIONS], [at(2052), at(2094)]);
  assert.deepEqual([...C.HOPS], [at(2262), at(2268), at(2274)]);
  // Continuity plan v07 §4 C3: the Berkeley steps moved from the &s to the kicks after the needle drop (the DJ's nudge).
  assert.deepEqual([...C.BERKELEY_STEPS], [at(2136), at(2160), at(2184)]);
  assert.deepEqual([C.PLATES.from, C.PLATES.to], [at(2337), at(2340)], 'the plates slam in over a 32nd, registering on the grab');
  assert.equal(C.reactionAt(7) - C.reactionAt(0), 10.5, 'eight reaction balloons 1.5 frames apart');
});

test('the cuts and the shots tile the club: four segments (the comic’s three takes and the glass), seven parts, eight shots of a beat to 2.5 bars', () => {
  const tiles = (rows: readonly (readonly [number, number])[]) => {
    assert.equal(rows[0][0], C.CLUB.from);
    assert.equal(rows[rows.length - 1][1], C.CLUB.to);
    rows.forEach(([a, b], i) => {
      assert.ok(b > a);
      if (i > 0) assert.equal(a, rows[i - 1][1]);
    });
  };
  tiles(C.SEGMENTS);
  assert.deepEqual(C.SEGMENTS.map((s) => s[0]), [C.CLUB.from, C.MATCH_CUP, C.KICK_CUP, C.HIT], 'the hard cuts E6, E10 and the hit E14');
  tiles(C.INK_PARTS.map((p) => [p.from, p.to] as const));
  assert.deepEqual(C.INK_PARTS.map((p) => p.id), ['splash', 'record', 'bar', 'lens', 'incident', 'flight', 'glass']);
  tiles(C.INK_SHOTS.map((s) => [s.from, s.to] as const));
  for (const s of C.INK_SHOTS) assert.ok(s.to - s.from >= BEAT && s.to - s.from <= 2.5 * FRAMES_PER_BAR, `${s.id}: ${s.to - s.from} frames`);
  for (const [a, b] of C.SEGMENTS) assert.ok(C.INK_PARTS.every((p) => p.from >= b || p.to <= a || (p.from >= a && p.to <= b)), 'no part crosses a cut');
});

test('the harmony (music bible §2.1): IV · Vsus→V · iii · vi · IV→V · iii→vi, changing on beats 1 and 3 only, doubling into the throw and the hit', () => {
  assert.deepEqual(C.CHORDS.map((c) => c.chord), ['IV', 'Vsus', 'V', 'iii', 'vi', 'IV', 'V', 'iii', 'vi']);
  assert.equal(C.CHORDS[0].at, C.CLUB.from);
  for (const c of C.CHORDS) assert.ok((c.at - C.CLUB.from) % (2 * BEAT) === 0, `${c.chord} on a 1 or a 3`);
  assert.deepEqual(C.CHORDS.filter((c) => c.at >= C.club(5)).map((c) => c.at), [C.club(5), C.THROW, C.club(6), C.club(6, 2)]);
  assert.deepEqual([C.HOOK.from, C.HOOK.to, C.ARP.from, C.ARP.to, C.DIP.from, C.DIP.to], [C.CLUB.from, C.MATCH_CUP, C.club(2), C.MATCH_CUP, C.MATCH_CUP, C.KICK_CUP]);
});

test('every window lies inside the club and runs forward; the readout’s windows and warnings tile as threads.md has them', () => {
  for (const [k, v] of Object.entries(C)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'from' in v && 'to' in v) {
      const w = v as { from: number; to: number };
      assert.ok(w.from < w.to && w.from >= C.CLUB.from && w.to <= C.CLUB.to, k);
    }
  }
  assert.deepEqual(C.READOUT_WARNINGS.map((w) => [w.from, w.to, w.line, w.level]), [
    [C.SWAP, C.FLOWER, 'cuteness', 'warn'],
    [C.FLOWER, C.MATCH_CUP, 'scanFloor', 'err'],
    [C.LIGHTS_OUT, C.THROW, 'honeypot', 'warn'],
    [C.THROW, C.HIT, 'quarantine', 'err'],
    [C.HIT, C.CLUB.to, 'fatal', 'err'],
  ]);
});

test('the camera energy: kick punches 2–7 %, no white flash anywhere, shakes only on the story hits and the roll, every throw shake stopping dead on the hit', () => {
  const big = new Set([C.KICK_CUP, C.SPLASH, C.THROW, C.HIT, ...C.ROLL]);
  for (const a of C.CLUB_ACCENTS) {
    assert.ok((a.flash ?? 0) === 0, `no flash at ${a.at}`);
    if (a.punch) assert.ok(a.punch >= 0.02 && a.punch <= 0.07, `punch ${a.punch} at ${a.at}`);
    if (a.shake) assert.ok(big.has(a.at), `a shake on ${a.at} (only big hits and rolls)`);
    if (a.at > C.THROW && a.at < C.HIT && a.shake) assert.equal(a.until, C.HIT);
  }
  assert.ok(!C.CLUB_ACCENTS.some((a) => a.at === C.PULL_BACK || a.at === C.RISE.from), 'no punch on a beat the shot’s own camera launches');
  for (let f = C.CLUB.from; f < C.CLUB.to; f++) assert.equal(inkFlashAt(f), 0, `${f}`);
});

test('the rig is continuous through the club but at the hit, where the throw’s shakes stop dead, and no edge ever shows', () => {
  for (let f = C.CLUB.from; f < C.CLUB.to; f += 0.25) {
    if (f === C.HIT) continue;
    const [p, v, n] = [inkRigAt(f - 1e-6), inkRigAt(f), inkRigAt(f + 1e-6)];
    assert.ok(coverZoom(v) <= v.zoom + 1e-9, `an edge shows at ${f}`);
    assert.ok(Math.abs(n.zoom - p.zoom) < 1e-5 && Math.abs(n.x - p.x) < 1e-3 && Math.abs(n.y - p.y) < 1e-3 && Math.abs(n.roll - p.roll) < 1e-6, `the rig snaps at ${f}`);
  }
});

test('the glass beat keeps v04’s camera exactly: the hit’s punch and shake (seeded as old 1896) are v04’s hit, frame for frame, in the film and the preview', () => {
  const hit = C.CLUB_ACCENTS.find((a) => a.at === C.HIT)!;
  assert.equal(hit.seed, seedFrame(D1.HIT), 'v04’s draw: v04’s hit (drop1.ts, club 4.4) is seeded with v04’s 1896');
  assert.equal(hit.seed, seedFrame(C.SMASH) - BEAT);
  // v04's rig at its hit was its hit accent alone (punch 0.07, shake 1 seeded 1896; the throw's shakes stopped dead on it): measured equal to
  // the v04 film's rigAt when the club went live (notes/b58/club-integ/rig-check.mjs, max difference 0).
  const v04 = (k: number) => {
    const t = C.HIT + k;
    const [sx, sy, sr] = k > 0 && k < 16 ? shake(t, C.HIT, 1896) : [0, 0, 0];
    return covered({ zoom: 1 + (k > 0 && k < 14 ? 0.07 * punch(t, C.HIT) : 0), x: 16 * sx, y: 16 * sy, roll: 0.006 * sr });
  };
  for (let k = 0; k < C.SMASH - C.HIT; k += 0.5) {
    assert.deepEqual(rigAt(C.HIT + k), v04(k), `the film at HIT + ${k}`);
    assert.deepEqual(inkRigAt(C.HIT + k), v04(k), `KX-ClubInk at HIT + ${k}`);
  }
});

test('live in the film: the film’s camera energy through the club is the club’s own (CLUB_ACCENTS merged into energy.ts), the preview’s exactly', () => {
  for (let f = C.CLUB.from; f < C.CLUB.to; f += 0.5) assert.deepEqual(rigAt(f), inkRigAt(f), `${f}`);
});
