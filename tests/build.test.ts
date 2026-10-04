import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HAS_COLLECTION } from './lib/collection.ts';
import { ARCS, BASS_PIECES, BASS_STRIPS, BUILD_TEXTS, BUILD_THREADS, DEFENDER_POV, DISC, FLIPBOOK, GLASS_TYPE, GUEST, LABELS, MOUTH_FACES, OMEGA_AT, POV_TEXTS, PRINT, RISO_ADDED, RISO_GLYPHS, S08_CARDS, S08_GUEST, S08_HERO, S08_QUARANTINE, SWISS_CAST, SWISS_DISPLAY, SWISS_TEXT, marilyn, povReadout, reticleX } from '../src/content/build.ts';
import { HEADLINERS } from '../src/content/outro.ts';
import { SWISS } from '../src/worlds/swiss.ts';
import { BUILD_CAST, RAIN_FACES, S06_HOSTS, S08_FACES, S08_FOOTER, S08_HEADLINE } from '../src/content/castBuild.ts';
import { SIGNATURE } from '../src/content/boot.ts';
import * as B from '../src/score/build.ts';
import { partBars, partEnd, partFrame } from '../src/score/film.ts';

/** The Swiss part's bar `bar` (1-based), plus `beat` beats (0-based). */
const swiss = (bar: number, beat = 0): number => partFrame('swiss', bar, beat);
/** The Riso part's bar `bar` (1-based), plus `beat` beats (0-based). */
const riso = (bar: number, beat = 0): number => partFrame('riso', bar, beat);
const key = (face: string) => face.normalize('NFKC').replace(/\s/gu, '');

test('every build event lies in the Swiss and Riso parts on the 32nd-note grid (but the arcs’ 2-frame ripple and the muffle’s half-frame snap)', () => {
  const lists = [B.KICKS, B.HATS, B.CLAPS, B.FILL, B.ROLL, B.RULES, B.SPLITS, B.SWEEPS, B.SLAMS, B.TEARS, B.MOUTHS, B.LANDINGS, B.FACES, B.HOPS, B.PIECES, B.ARC_STEPS, B.REACQUIRE, B.INFECT, B.REGISTER, B.PRINT_STEPS, B.SUN_RINGS];
  const windows = [B.DISC_LAND, B.SLIDE, B.PULL, B.FLIP, B.STRETCH, B.SEA, B.SUNRISE, B.SUCK, B.SILENCE, B.RETICLE, B.XRAY_MOVES, B.SWELL, B.SKY_ROLLER, B.SKY_UNPRINT, B.SLUG];
  const frames = [
    ...lists.flat(),
    ...windows.flatMap((w) => [w.from, w.to]),
    B.ROW_RULE, B.S05_BLINK, B.LENS_TRACK, B.RED_CELL, B.GLASS_TURN, B.HIT3, B.IRIS, B.PING, B.ZERO_THREATS, B.RETURN, B.SWEEP3, B.QUARANTINE.in, B.QUARANTINE.at, B.REVIVE, B.BLINK_WAVE, B.HOLE, B.MERGED, B.WAVE_DONE,
    B.SIG_SWISS.from, B.SIG_SWISS.to, B.SIG_SWISS.leave, B.SIG_SWISS.gone,
  ];
  for (const f of frames) {
    assert.ok(f >= B.BUILD_START && f <= B.BUILD_END, `${f} is inside the build`);
    assert.ok(Number.isInteger(f / 3), `${f} is on the 32nd-note grid`);
  }
  assert.deepEqual([...B.ARC_PRINT], [482, 484, 486, 488, 490, 492], 'ring k on 482 + 2k: a ripple out of the lens');
  assert.deepEqual({ ...B.MUFFLE.in }, { from: 770, to: 776 }, 'ramped in after the shutter click’s attack');
  assert.deepEqual({ ...B.MUFFLE.out }, { from: 815.5, to: 816 });
});

test('four on the floor until the 32nd roll but the scan bar’s first two beats; off-beat hats but under the scan; sixteenths in riso bar 3', () => {
  assert.equal(B.KICKS.length, (riso(4, 2) - swiss(1)) / 24 - 2, 'swiss 1.1 to riso 4.2, less swiss 4.1 and 4.2');
  assert.ok(!B.KICKS.includes(B.IRIS) && !B.KICKS.includes(B.PING));
  assert.ok(B.KICKS.includes(B.RETURN) && B.KICKS.includes(B.SWEEP3), 'the groove slams back on swiss 4.3');
  assert.ok(B.KICKS.every((f) => (f - swiss(1)) % 24 === 0));
  assert.ok(B.HATS.filter((f) => f < riso(3)).every((f) => (f - swiss(1)) % 24 === 12));
  assert.ok(!B.HATS.includes(swiss(4, 0.5)) && !B.HATS.includes(swiss(4, 1.5)) && B.HATS.includes(swiss(4, 2.5)), 'no hats 768–815');
  assert.equal(B.HATS.filter((f) => f >= riso(3) && f < riso(4)).length, 16);
  assert.ok(B.HATS.every((f) => f < riso(4, 2)));
});

test('claps on beats 2 and 4 from swiss bar 3 to riso bar 2 (the scan bar’s 4.2 clap inside the muffle), a fill on the last beat of swiss bar 5', () => {
  assert.deepEqual([...B.CLAPS], [swiss(3, 1), swiss(3, 3), swiss(4, 1), swiss(4, 3), swiss(5, 1), swiss(5, 3), riso(1, 1), riso(1, 3), riso(2, 1), riso(2, 3)]);
  assert.deepEqual([...B.FILL], [swiss(5, 3), swiss(5, 3.25), swiss(5, 3.5), swiss(5, 3.75)]);
  assert.deepEqual([...B.REGISTER], [...B.FILL], 'the plates converge on the fill');
});

test('the snare roll goes eighths → sixteenths → 32nds and stops before the silent half beat', () => {
  const gaps = B.ROLL.slice(1).map((f, i) => f - B.ROLL[i]);
  assert.deepEqual([...new Set(gaps)], [12, 6, 3]);
  assert.ok(gaps.every((g, i) => i === 0 || g <= gaps[i - 1]), 'never slows down');
  assert.ok(B.ROLL[B.ROLL.length - 1] < B.SILENCE.from);
  assert.deepEqual({ ...B.SILENCE }, { from: riso(4, 3.5), to: partEnd('riso') });
});

test('S05, the lens (swiss 1): the arcs print, step on the kicks of 1.2 and 1.3, five cut-paper pieces land on the eighths, the lens tracks his eye on 1.4, he blinks on 1.4&', () => {
  assert.deepEqual([...B.RULES], Array.from({ length: 7 }, (_, i) => swiss(1, (i + 1) / 2)));
  assert.equal(B.ROW_RULE, swiss(1, 1));
  assert.deepEqual([...B.ARC_STEPS], [swiss(1, 1), swiss(1, 2)]);
  assert.ok(B.ARC_STEPS.every((f) => B.KICKS.includes(f)));
  assert.deepEqual([...B.PIECES], [504, 516, 528, 540, 552]);
  assert.equal(B.LENS_TRACK, 552);
  assert.equal(B.S05_BLINK, 564);
  assert.deepEqual({ ...B.SIG_SWISS }, { from: 525, to: 540, leave: 648, gone: 654 });
  assert.equal(LABELS.sig, SIGNATURE);
});

test('S06 and S07a: the splits on the beats of swiss 2, the re-acquire ticks, the red cells; the glass (swiss 3): sweeps on its claps, the turn on 3.3, the third hit on 3.4, the J-cut swell into the iris', () => {
  assert.deepEqual([...B.SPLITS], [swiss(2), swiss(2, 1), swiss(2, 2), swiss(2, 3)]);
  assert.deepEqual([...B.REACQUIRE], B.SPLITS.slice(1));
  assert.equal(B.SPLIT_STAGGER, 3);
  assert.equal(B.RED_CELL, swiss(2, 3.5));
  assert.deepEqual([...B.SWEEPS], [swiss(3, 1), swiss(3, 3), swiss(4, 3)]);
  assert.ok(B.SWEEPS.every((f) => B.CLAPS.includes(f)));
  assert.equal(B.GLASS_TURN, swiss(3, 2));
  assert.equal(B.HIT3, swiss(3, 3));
  assert.deepEqual({ ...B.SWELL }, { from: 756, to: 768 });
});

test('the SCAN bar (swiss 4): the iris on 4.1, twelve hops on the 32nds from 4.1e, the seventh dead on him on 4.2 (the ping), `0 threats ✓` on 4.2a, the hard cut back on 4.3, red bar 3 on 4.4, the pull on 4.4&', () => {
  assert.equal(B.IRIS, 768);
  assert.deepEqual({ ...B.RETICLE }, { from: 771, to: 774 });
  assert.deepEqual([...B.HOPS], [774, 777, 780, 783, 786, 789, 792, 795, 798, 801, 804, 807]);
  assert.equal(B.HOPS[6], B.PING, 'hop 7 lands on him on the clap');
  assert.ok(B.CLAPS.includes(B.PING));
  assert.equal(B.ZERO_THREATS, 810);
  assert.ok(B.ZERO_THREATS > B.HOPS.at(-1)!, '144/144 by 807, the ✓ after');
  assert.equal(B.RETURN, 816);
  assert.equal(B.SWEEP3, 840);
  assert.deepEqual({ ...B.PULL }, { from: 852, to: 864 });
  assert.deepEqual({ ...B.XRAY_MOVES }, { from: 768, to: 810 });
  assert.deepEqual({ ...B.MUFFLE.in }, { from: 770, to: 776 });
  // The readout: `· 0 threats` on every readout, 12 more cells a hop, the ✓ only once all 144 are clean.
  assert.deepEqual([povReadout(0), povReadout(144, true)], ['[SCAN] grid 000/144 · 0 threats', '[SCAN] grid 144/144 · 0 threats ✓']);
  assert.ok(POV_TEXTS.filter((t) => t.startsWith('[SCAN]')).every((t) => t.includes('· 0 threats')));
  assert.equal(POV_TEXTS.filter((t) => t.startsWith('[SCAN]')).length, 14);
});

test('S08 (swiss 5): the pull lands, the wave prints a ring pair a sixteenth from 5.1&, the quarantine on 5.2, the revival and blink wave on 5.2&, T2 on 5.3–5.4', () => {
  assert.deepEqual([...B.INFECT], [876, 882, 888, 894, 900, 906]);
  assert.deepEqual({ ...B.QUARANTINE }, { in: 882, at: 888 });
  assert.deepEqual([B.REVIVE, B.BLINK_WAVE], [900, 900]);
  assert.deepEqual({ ...B.FLIP }, { from: swiss(5, 2), to: partEnd('swiss') });
  assert.equal(B.WAVE_DONE, 906, 'the whole poster is him by the last step');
  assert.deepEqual([[9, 4], [8, 6], [10, 5], [12, 8], [15, 8], [0, 0], [0, 8]].map(([c, r]) => B.infectFrame(c, r)), [876, 876, 882, 894, 906, 906, 906]);
  assert.deepEqual(S08_QUARANTINE.map(([c, r]) => B.infectFrame(c, r)), [876, 882, 882], 'the three copies are infected before the strips land');
  assert.equal(B.blinkFrame(8, 4), 900);
  assert.ok(Math.abs(B.blinkFrame(0, 0) - (900 + 0.7 * 12)) < 1e-9);
});

test('S08’s poster: 144 cards — the headline and footer type, his amber card, the guest’s red card, the counter’s tab and 114 different faces; no ￣-eyed face beside the guest', () => {
  assert.equal(S08_CARDS.length, 144);
  const by = (k: string) => S08_CARDS.filter((c) => c.kind === k);
  assert.deepEqual(by('headline').map((c) => c.text).join(''), S08_HEADLINE);
  assert.deepEqual(by('footer').map((c) => c.text).join(''), S08_FOOTER);
  assert.ok(by('headline').every((c) => c.row === 0) && by('footer').every((c) => c.row === 8));
  assert.deepEqual(by('hero').map((c) => [c.col, c.row, c.text, c.d]), [[S08_HERO[0], S08_HERO[1], '(•ω•)', 0]]);
  assert.deepEqual(by('guest').map((c) => [c.col, c.row, c.text]), [[S08_GUEST[0], S08_GUEST[1], GUEST]]);
  assert.deepEqual(by('counter').map((c) => [c.col, c.row]), [[14, 0], [15, 0]]);
  const faces = by('face');
  assert.equal(faces.length, 114);
  assert.deepEqual(new Set(faces.map((c) => c.text)), new Set(S08_FACES), 'every cast face, once');
  for (const c of faces) if (Math.max(Math.abs(c.col - S08_GUEST[0]), Math.abs(c.row - S08_GUEST[1])) === 1) assert.ok(!/[￣‾¯]/.test(c.text), `${c.text} beside the guest`);
});

test('S08’s Warhol tints: pink, blue, yellow only (no red, no amber); no two 4-neighbours alike; no yellow touching his amber card; none on his or the guest’s; the corner’s two cards (N3) tinted without changing any approved tint', () => {
  const at = new Map(S08_CARDS.map((c) => [`${c.col},${c.row}`, c]));
  // Every card's tint, row by row (p b y, - untinted): the approved poster's, but the corner's two (14, 0) and (15, 0), untinted under v04's tab.
  const approved = 'pbpypypybybpyb--ypbpbpbpybpybpybpbpbpbybpybp-ybyypbpypbpbpybpbybpbybpbpb-bpybypyypbybpbpbpybpbybpypbybpypybpbybybpbpbpybybpypbybybpbpbpybybpbpbp';
  const now = S08_CARDS.map((c) => (c.tint ? c.tint[0] : '-')).join('');
  assert.equal(now.length, approved.length);
  for (let i = 0; i < now.length; i++) if (approved[i] !== '-' || S08_CARDS[i].kind !== 'counter') assert.equal(now[i], approved[i], `card ${i}: ${S08_CARDS[i].col},${S08_CARDS[i].row}`);
  for (const c of S08_CARDS) {
    if (['hero', 'guest'].includes(c.kind)) {
      assert.equal(c.tint, undefined, `${c.kind} untinted`);
      continue;
    }
    assert.ok(['pink', 'blue', 'yellow'].includes(c.tint!), `${c.col},${c.row}: ${c.tint}`);
    if (Math.max(Math.abs(c.col - S08_HERO[0]), Math.abs(c.row - S08_HERO[1])) === 1) assert.notEqual(c.tint, 'yellow', `${c.col},${c.row} touches his amber`);
    for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const n = at.get(`${c.col + dc},${c.row + dr}`);
      if (n?.tint) assert.notEqual(n.tint, c.tint, `${c.col},${c.row} and ${n.col},${n.row}`);
    }
  }
  assert.deepEqual(S08_CARDS.filter((c) => c.quarantine).map((c) => [c.col, c.row]), S08_QUARANTINE.map((q) => [...q]));
  // The revived 2×2s: four prints each, one per ink, never red or amber; on (7, 3), beside him, the yellow is the quadrant farthest from his card.
  for (const [c, r] of S08_QUARANTINE) assert.deepEqual(marilyn(c, r).map((q) => q.tint).sort(), ['blue', 'paper', 'pink', 'yellow']);
  const y = marilyn(7, 3).find((q) => q.tint === 'yellow')!;
  assert.deepEqual([y.dx, y.dy], [-30, 30], 'top-left: away from (8, 4)');
});

test('the cast of bars 1–14: real faces, all different, none wearing his ω, the guest’s ￣▽￣ or the table-flip core °□°; the cast file is what castBuild.mjs writes', () => {
  assert.deepEqual([RAIN_FACES.length, S06_HOSTS.level1.length, S06_HOSTS.level2.length, S06_HOSTS.level3.length, S08_FACES.length], [8, 3, 12, 48, 114]);
  assert.equal(new Set(BUILD_CAST.map(key)).size, BUILD_CAST.length, 'no face twice');
  for (const f of BUILD_CAST) assert.ok(!/ω|°□°|°ロ°/.test(f) && !/￣▽￣|‾▽‾|￣∀￣/.test(key(f)), f);
  assert.ok(SWISS_CAST.includes(GUEST) && SWISS_CAST.includes('(•ω•)'));
  if (!HAS_COLLECTION) return; // the casting script reads the unpublished collection (tests/lib/collection.ts)
  const script = fileURLToPath(new URL('../scripts/castBuild.mjs', import.meta.url));
  const out = execFileSync(process.execPath, [script, '--print'], { encoding: 'utf8' });
  assert.equal(out, fs.readFileSync(new URL('../src/content/castBuild.ts', import.meta.url), 'utf8'));
});

test('v04’s build, moved: swiss 1–3 by 96 frames (the RAIN bar), v04’s swiss 4 (S08 and T2) and the Riso part by 192 (and the SCAN bar)', () => {
  // [v04 value, today's]
  assert.deepEqual([...B.SPLITS], [480, 504, 528, 552].map((f) => f + 96));
  assert.deepEqual([B.RED_CELL, B.GLASS_TURN, B.SWEEPS[0], B.SWEEPS[1]], [564, 624, 600, 648].map((f) => f + 96));
  assert.deepEqual([B.FLIP.from, B.FLIP.to, ...B.FILL], [720, 768, 744, 750, 756, 762].map((f) => f + 192));
  assert.deepEqual([...B.SLAMS, ...B.MOUTHS, B.HOLE, ...B.FACES], [768, 792, 816, 840, 864, 888, 912, 936, 960, 960, 984, 1008, 1032].map((f) => f + 192));
  assert.deepEqual([...B.TEARS].slice(0, 3), [774, 780, 786].map((f) => f + 192));
  assert.deepEqual([B.STRETCH.from, B.MERGED, B.SUNRISE.from, B.SUNRISE.to, B.SUCK.from, B.SUCK.to], [1080, 1092, 1104, 1128, 1140, 1152].map((f) => f + 192));
  assert.deepEqual([...B.ROLL].slice(0, 2), [960, 972].map((f) => f + 192));
});

test('S12 (riso 4): the print on the snare sixteenths, the sky roller on 4.2, a ring off the sun on every 32nd of beats 3–4, the sky un-printed by the suck', () => {
  assert.deepEqual([...B.PRINT_STEPS], [1248, 1254, 1260, 1266]);
  assert.deepEqual({ ...B.SKY_ROLLER }, { from: 1272, to: 1281 });
  assert.deepEqual([B.SUN_RINGS[0], B.SUN_RINGS.at(-1), B.SUN_RINGS.length], [1296, 1329, 12]);
  assert.deepEqual({ ...B.SKY_UNPRINT }, { from: 1326, to: 1332 });
  assert.equal(B.SKY_UNPRINT.to, B.SUCK.from);
  assert.deepEqual({ ...B.SLUG }, { from: riso(1), to: riso(2) });
});

test('the harmony, one chord a bar of swiss + riso (the scan bar holds iii; Riso IV V iii vi as approved; no tonic)', () => {
  assert.equal(B.BUILD_CHORDS.length, partBars('swiss').length + partBars('riso').length);
  assert.deepEqual(B.BUILD_CHORDS.slice(5), ['IV', 'V', 'iii', 'vi']);
  assert.equal(B.BUILD_CHORDS[3], 'iii');
  assert.ok(!(B.BUILD_CHORDS as readonly string[]).includes('I'));
});

test('S09, the tear-off flipbook: a face slams down on every beat of riso bar 1, and a sheet tears off on every later sixteenth', () => {
  assert.deepEqual([...B.SLAMS], [riso(1), riso(1, 1), riso(1, 2), riso(1, 3)]);
  assert.deepEqual([...B.TEARS], Array.from({ length: 15 }, (_, i) => riso(1, (i + 1) / 4)));
  assert.ok(B.SLAMS.every((f) => B.KICKS.includes(f)), 'every slam on a kick');
  assert.ok(B.SLAMS.slice(1).every((f) => B.TEARS.includes(f)), 'on the later beats the slam is the new sheet under the tear');
  // One drawing on the downbeat and one under each tear, a face a beat.
  assert.equal(FLIPBOOK.length, B.SLAMS.length);
  assert.equal(FLIPBOOK.flat().length, B.TEARS.length + 1);
});

test('S10, through the open mouths: a burst on every kick of riso bar 2, a landing on every and, and the last burst (HOLE) on riso 3.1 with the first halftone face', () => {
  assert.deepEqual([...B.MOUTHS], [riso(2), riso(2, 1), riso(2, 2), riso(2, 3)]);
  assert.deepEqual([...B.LANDINGS], [riso(2, 0.5), riso(2, 1.5), riso(2, 2.5), riso(2, 3.5)]);
  assert.equal(B.HOLE, riso(3));
  assert.ok([...B.MOUTHS, B.HOLE].every((f) => B.KICKS.includes(f)), 'every burst on a kick');
  assert.ok(B.LANDINGS.every((f) => B.HATS.includes(f)), 'every landing on an off-beat hat');
  assert.equal(B.HOLE, B.FACES[0], 'S11 starts as the camera bursts through the last mouth');
  assert.equal(B.MOUTHS[0], B.TEARS[B.TEARS.length - 1] + 6, 'the dive into S09’s last sheet takes its last sixteenth');
  assert.equal(MOUTH_FACES.length, B.MOUTHS.length + 1, 'a face for each burst');
  assert.equal(FLIPBOOK[FLIPBOOK.length - 1][3], MOUTH_FACES[0].face, 'the first mouth is S09’s last sheet');
});

test('N1: bar 12’s mouth is Σ(・ロ・) — only the eyes change: set where v04’s Σ(°ロ°) set, character for character; the curtain call’s riso headliner matches; no drawn mouth face wears the table-flip core', () => {
  const m = MOUTH_FACES[1];
  assert.equal(m.face, 'Σ(・ロ・)');
  assert.equal(m.mouth, 'ロ');
  assert.equal(m.setAs, 'Σ(°ロ°)', 'set as v04 set it');
  const [a, b] = [[...m.face], [...m.setAs!]];
  assert.equal(a.length, b.length);
  assert.equal(a.map((c, i) => (c === b[i] ? '=' : c)).join(''), '==・=・=', 'only the eyes change');
  assert.ok(MOUTH_FACES.every((f) => !/°□°|°ロ°/u.test(f.face)), 'no mouth face wears the guest’s table-flip core');
  assert.equal(HEADLINERS.find((h) => h.world === 'riso')!.face, m.face, 'the curtain call’s A3 is the same face');
  assert.deepEqual(RISO_ADDED, ['・'], 'the one new Riso character');
  assert.deepEqual(RISO_GLYPHS.slice(-RISO_ADDED.length), RISO_ADDED, 'packed after every approved character');
  assert.ok(BUILD_TEXTS.some((t) => t.role === 'rounded' && t.text === m.face), 'check-glyphs reads the new face');
});

test('N2: the glass bars’ type is his own bytes — CF 89 is the UTF-8 of his ω, in his signature; U+03C9 is its code point; their characters pack after the approved cells', () => {
  const hex = [...new TextEncoder().encode('ω')].map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  assert.equal(GLASS_TYPE.big, hex);
  assert.ok(SIGNATURE.includes(GLASS_TYPE.big), 'the middle of his signature');
  assert.equal(GLASS_TYPE.small, `U+${'ω'.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} ω`);
  assert.deepEqual(SWISS_DISPLAY.slice(-2), ['C', 'F'], 'C and F after the approved display cells');
  assert.deepEqual(SWISS_TEXT.slice(-4), ['U', '+', '3', 'ω'], 'U + 3 ω after the approved text cells');
  for (const t of Object.values(GLASS_TYPE)) assert.ok(BUILD_TEXTS.some((x) => x.role === 'display' && x.text === t), `check-glyphs reads ${t}`);
});

test('the builders’ hooks: the lens and arcs, the re-acquire hop, the glass kept to its third hit, the iris, the ping, the stamp, the shimmer, the pull’s exit and dissolve, S08’s read, grey, guest ring, strips and drift', () => {
  assert.deepEqual([B.ARC_BLOWOUT.from, B.ARC_BLOWOUT.to, B.S06_HOP], [576, 582, 588]);
  assert.deepEqual({ ...B.GLASS_KEPT }, { from: 672, to: 744 }, 'the first 72 frames of the glass are v04’s 576–647');
  assert.deepEqual({ ...B.DISC_BREATH }, { from: 744, to: 768 });
  assert.deepEqual([B.S07_TRUCK.from, B.S07_TRUCK.to - B.S07_TRUCK.from], [672, 84], 'v04’s truck slope: 200 px over 84 frames, not to today’s PULL');
  assert.deepEqual({ ...B.IRIS_OPEN }, { from: 768, to: 774 });
  assert.deepEqual({ ...B.PING_RING }, { from: 792, to: 800 });
  assert.deepEqual({ ...B.STAMP }, { from: 810, to: 816 });
  assert.deepEqual({ ...B.LIVING }, { from: 811, to: 852 });
  assert.deepEqual([...B.SHIMMER], [840, 843, 846, 849]);
  assert.deepEqual([B.PULL_EXIT.from, B.PULL_EXIT.to, B.PULL_FADE.from, B.PULL_FADE.to], [852, 858, 858, 860]);
  assert.deepEqual({ ...B.S08_READ }, { from: 864, to: 876 });
  assert.deepEqual([B.GREY.from, B.GREY.to, B.GUEST_RING.from, B.GUEST_RING.to, B.STRIPS_OUT.from, B.STRIPS_OUT.to], [888, 892, 888, 896, 900, 906]);
  assert.deepEqual([B.S08_DRIFT.in.from, B.S08_DRIFT.in.to, B.S08_DRIFT.out.to], [864, 900, 912]);
  assert.equal(B.S08_DRIFT.out.to, B.FLIP.from, 'square on the poster when T2 starts, as T2 expects');
  // v04's paths behind the flags, moved with the map.
  assert.deepEqual([B.SLIDE.from, B.S05_BLINK_V04, B.RIPPLE_V04, B.BLINK_WAVE_V04], [528, 552, 876, 888]);
});

test('the design data the builders draw from: the lens, the arcs, the cut paper, the POV signature, the strips, the prints; the flags default to the design, every one revertible', () => {
  assert.deepEqual(BUILD_THREADS, { lens: true, reacquire: true, pov: 'full', infection: true, typeCards: true, register: true, slugs: true, printSteps: true, sunRings: true, cleanCorner: false, glassBytes: true });
  assert.deepEqual([DISC.x, DISC.y, DISC.r], [150, 30, 300]);
  assert.equal(ARCS.radii.length, 6);
  assert.equal(ARCS.widths.length, 6);
  assert.ok(ARCS.radii.every((r, k) => k === 0 || r > ARCS.radii[k - 1]) && ARCS.radii[0] > DISC.r, 'rings outward from the lens');
  assert.deepEqual(BASS_PIECES.map((p) => p.ch).join(''), '(•ω•)', 'he pastes himself together from his own glyphs');
  assert.equal(BASS_PIECES.length, B.PIECES.length);
  assert.equal(DEFENDER_POV.red, SWISS.red, 'DEFENDER red is the Swiss red');
  assert.deepEqual(Array.from({ length: 12 }, (_, k) => reticleX(k)).filter((_, k) => k === 0 || k === 6 || k === 11), [-880, 80, 880]);
  assert.ok(Math.abs(reticleX(6) - OMEGA_AT[0]) <= 20, 'hop 7 lands dead on his ω');
  assert.equal(BASS_STRIPS.length, 4);
  assert.deepEqual([PRINT.coverage.length, PRINT.scale.length], [B.PRINT_STEPS.length, B.PRINT_STEPS.length]);
  assert.equal(PRINT.scale.at(-1), 1, 'the last step is BIG');
  assert.equal(PRINT.coverage.at(-1), 0, 'the last step is the solid two-plate print');
  for (const hex of [DEFENDER_POV.ground, DEFENDER_POV.bone]) assert.ok(!['#E8402B', '#FFB23E'].includes(hex));
});
