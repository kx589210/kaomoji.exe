// THE INTERLUDE, the part 'break' (8 bars), skeleton: its score's two layers (v04 as built, unchanged; v2 the design), the energy standard
// over its frames, the shot table's break rows, its cast and strings, and the dispatcher that hands each frame to its part — the stubs
// included (the graph: a hold of the flat world's last frame; the launch: v04's slingshot carried over one bar later, then held). Build
// sheet: notes/bid2/break-sheet2.md (design notes/extend/interlude-final.md; v04's notes/break/break-sheet.md).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type * as THREE from 'three';
import { HAS_COLLECTION, NO_COLLECTION, readCollection } from './lib/collection.ts';
import * as CAST from '../src/content/castBreak.ts';
import { BREAK_TEXTS, BREAK_TEXTS_V2, MONITOR_ROWS_V2, ORDER_TEXTS, PEEK_FACES_V2, SIGNATURE, WAVER, orderId } from '../src/content/break.ts';
import { DEFAULT_TEMPORAL, type Temporal, temporalSamples } from '../src/engine/temporal.ts';
import type { FrameContext, Look, Renderable } from '../src/engine/types.ts';
import { FLAT_LOOK } from '../src/engine/types.ts';
import { BreakScene, RemapPart } from '../src/scenes/break.ts';
import * as BR from '../src/score/break.ts';
import { SMASH } from '../src/score/drop1.ts';
import { flashAt } from '../src/score/energy.ts';
import { SECTIONS, SHOTS } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import { FRAMES_PER_BAR, barFrame } from '../src/score/tempo.ts';
import { BreakGraph } from '../src/scenes/breakGraph.ts';
import { graphCam } from '../src/shots/breakGraph.ts';
import { launchCam, launchCamV2 } from '../src/shots/breakLaunch.ts';
import { breakCam, camPose, flatCam } from '../src/shots/breakShared.ts';
import { type CameraAt, assertFastMovesSampled, assertFlashesRare, assertNeverStill, assertOnGrid, assertRigContinuous, jolt, onShutter, peak, poseMoved, scoreFrames } from './lib/energyAudit.ts';
import { partBar, partBars, partEnd, partFrame, partStart, partTail, seedFrame, v07Frame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);
const steps = (a: number, b: number, step: number): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const within = (f: number, w: { from: number; to: number }): boolean => f >= w.from && f < w.to;
/** A design frame on the 58-bar map (interlude-final.md: the break starts on 2496) as a film frame now. */
const design = (f: number): number => partStart('break') + f - 2496;

// --- Bounds, parts, cuts ----------------------------------------------------------------------------------------------------------

test('the break runs 8 bars, built through, from the glass giving way on break 1.1 to drop 2’s downbeat: one span, drawn by the break scene, and KX-Break renders exactly it', () => {
  assert.equal(BR.BREAK_START, SMASH, 'the break takes over from the club on the smash');
  assert.deepEqual([BR.BREAK_START, BR.BREAK_END_V2], [partStart('break'), partEnd('break')]);
  assert.equal(partBars('break').length, 8);
  assert.equal(partTail('break'), null, 'no held tail: the skeleton draws every bar');
  assert.deepEqual(SPANS.filter((s) => s.key === 'break'), [{ from: BR.BREAK_START, to: BR.BREAK_END_V2, key: 'break' }]);
  const s = SECTIONS.find((x) => x.id === 'break')!;
  assert.deepEqual([barFrame(s.fromBar), barFrame(s.toBar + 1)], [BR.BREAK_START, BR.BREAK_END_V2], 'KX-Break');
  assert.deepEqual(BR.BREAK_BARS_V2, [1, 2, 3, 4, 5, 6, 7, 8].map((b) => at(b)));
  // v04's end stays where it was: every v04 window that ran to the end, and the as-built code, read it.
  assert.equal(BR.BREAK_END, at(7));
  assert.deepEqual(BR.BREAK_BARS, [1, 2, 3, 4, 5, 6].map((b) => at(b)));
});

test('four parts tile the break — the fall to 2.1, the flat world to 6.1, the graph to the whip’s hidden cut (6.4a), the launch to the end — and every boundary is a cut point of the editing plan', () => {
  assert.deepEqual(BR.BREAK_PARTS.map((p) => [p.name, p.from, p.to]), [
    ['fall', BR.BREAK_START, at(2)],
    ['flat', at(2), at(6)],
    ['graph', at(6), BR.WHIP_CUT],
    ['launch', BR.WHIP_CUT, BR.BREAK_END_V2],
  ]);
  assert.equal(BR.WHIP_CUT, design(3069));
  assert.equal(BR.REVERSE, design(3168));
  for (let f = BR.BREAK_START - 2; f < BR.BREAK_END_V2 + 2; f += 0.5) {
    const p = BR.BREAK_PARTS.find((x) => within(f, x));
    assert.equal(BR.breakPartAt(f), p ? p.name : f < BR.BREAK_START ? 'fall' : 'launch', `${f}`);
  }
  assert.deepEqual(Object.values(BR.CUTS_V2), [BR.BREAK_START, at(2), design(2748), BR.STUTTER_END, at(4), at(5), at(6), BR.WHIP_CUT, BR.REVERSE, BR.BREAK_END_V2], 'C0–C9');
  const v = Object.values(BR.CUTS_V2);
  assert.ok(v.every((f, i) => i === 0 || f > v[i - 1]), 'in order');
});

test('every event the break’s score exports — both layers, the accents included — sits on the 32nd-note grid', () => {
  assertOnGrid(scoreFrames('break', BR));
});

// --- v04: the as-built layer, unchanged --------------------------------------------------------------------------------------------

test('v04’s key moments stay exactly where they were approved (part-local): the fall, E2, the iris, the loop and stutter, E3, the hang, the reveal, the callout, E5, E6', () => {
  const perBeat = [1, 2, 3, 4].map((b) => BR.FALL_TINKS.filter((f) => f >= at(1, b) && f < at(1, b + 1)).length);
  assert.deepEqual(perBeat, [1, 2, 4, 8], 'one release on 1.1, two on 1.2, four on 1.3, eight on 1.4');
  assert.equal(BR.PIECE_FALLS.length, 16);
  assert.deepEqual(BR.FACE_FALL, { from: at(1, 4), to: BR.IMPACT });
  assert.deepEqual(BR.KNOCKS, [at(2, 1.5), at(2, 2.5)]);
  assert.deepEqual(BR.SHARD_FLIGHT, { from: BR.KNOCKS[1], to: BR.LOCK });
  assert.equal(BR.LOCK, at(2, 3));
  assert.deepEqual(BR.STUTTER, steps(at(3, 4), at(3, 4.5), 3));
  assert.equal(BR.STUTTER_END, at(3, 4.5));
  assert.deepEqual(BR.REROLL, steps(at(4, 2), at(4, 2.5), 3));
  assert.equal(BR.TOFU, at(4, 2.5));
  assert.equal(BR.HANG, at(4, 4));
  assert.deepEqual(BR.WIPE, { from: at(4, 4.5), to: at(5) });
  assert.equal(BR.REVEAL, at(5));
  assert.deepEqual(BR.CALLOUT, { from: at(5, 4.5), to: at(6) });
  assert.equal(BR.MATCH_CUT, at(6));
  assert.equal(BR.LOUDER, at(6, 2));
  assert.deepEqual(BR.SUDO, steps(at(6, 3), at(6, 4), 6));
  assert.equal(BR.GRANTED, at(6, 4));
  assert.deepEqual(BR.WINDOW, { from: at(6, 1.5), to: BR.BREAK_END });
  assert.deepEqual(BR.SLINGSHOT, [at(6, 3), at(6, 3.5), at(6, 4), at(6, 4.25)]);
  assert.deepEqual(BR.CREEP, steps(at(6, 4.5), BR.BREAK_END, 3));
  assert.deepEqual(BR.BLACK_FILM, { from: BR.HELD, to: BR.BREAK_END });
  assert.equal(BR.POP, partStart('drop2'));
  assert.deepEqual(BR.KICKS, [at(2), at(3), at(3, 2.5), at(4), at(4, 2.5), at(5), at(5, 2), at(5, 3), at(5, 4), at(6), at(6, 2), at(6, 3), at(6, 3.5), at(6, 4), at(6, 4.25)]);
  assert.deepEqual(BR.CLAPS, [at(2, 3), at(3, 3), at(4, 3), at(5, 2), at(5, 4), at(6, 2), at(6, 3), at(6, 3.5), at(6, 4), at(6, 4.25)]);
  const perBar = [2, 3, 4, 5, 6].map((b) => BR.HOOK.filter((f) => f >= at(b) && f < at(b + 1)).length);
  assert.deepEqual(perBar, [2, 4, 6, 8, 4], 'the hook rebuilt as his face is');
});

// --- The carried-over launch ---------------------------------------------------------------------------------------------------------

test('the skeleton carries v04’s slingshot one bar later: break 7 shows v04’s break 6 instant for instant, the whip’s tail holds its first frame, break 8 its last', () => {
  assert.deepEqual(BR.CARRIED, { from: at(7), to: at(8) });
  for (const f of [at(7), at(7) + 0.25, at(7, 2.5) - 0.25, at(8) - 1, at(8) - 0.75]) assert.equal(BR.carriedInstant(f), f - FRAMES_PER_BAR, `${f}`);
  for (const f of [BR.WHIP_CUT, BR.WHIP_CUT + 1, at(7) - 1]) assert.equal(BR.carriedInstant(f), BR.MATCH_CUT, `${f}: v04’s first launch frame`);
  for (const f of [at(8), at(8, 3), BR.BREAK_END_V2 - 1]) assert.equal(BR.carriedInstant(f), BR.BREAK_END - 1, `${f}: v04’s last frame`);
  assert.equal(BR.carriedInstant(at(8) + 0.25), BR.BREAK_END - 0.75, 'a sub-frame keeps its offset');
  assert.equal(BR.carriedInstant(at(5)), at(5), 'outside the launch: as it is');
  // The output frames of break 7 seed as v04's bar 6 did (film grain, shakes), so the carried frames keep their approved draws.
  for (const f of [at(7), at(7, 3) + 0.25, at(8) - 1]) assert.equal(seedFrame(f), seedFrame(f - 2 * FRAMES_PER_BAR) + FRAMES_PER_BAR, `${f}: one bar after bar 5, as v04’s bar 6`);
  assert.equal(seedFrame(at(7)) + FRAMES_PER_BAR, seedFrame(at(8)), 'bar 8 seeds as v04’s bar 7 (not approved: a hold)');
  assert.equal(seedFrame(at(6)), v07Frame(at(6)), 'the GRAPH bar is new: it seeds with its own frames (as on the 61-bar map, where it was approved: v08’s bridge A moved it a bar)');
});

test('drop 2 reads the break’s last drawn frame on its downbeat − 1: v2’s (sheet §7.3: frontal, Z 1.05, C (960, 540), roll 0) now the launch is native; v04’s functions, read from v04’s end on, still hold v04’s last frame (the stub’s)', () => {
  for (const f of [BR.BREAK_END, at(8), partStart('drop2') - 1, partStart('drop2') - 0.75]) assert.equal(BR.asBuiltHeld(f), BR.BREAK_END - 1 + (f - Math.round(f)), `${f}`);
  for (const f of [at(6), BR.BREAK_END - 1, BR.BREAK_END - 0.25]) assert.equal(BR.asBuiltHeld(f), f, `${f}: v04’s own frames are themselves`);
  const seam = partStart('drop2') - 1;
  assert.ok(BR.LAUNCH_V2, 'the film draws the launch natively');
  assert.deepEqual(launchCam(seam), launchCamV2(seam), 'the seam reads the v2 last frame');
  assert.deepEqual(launchCam(seam), { zoom: 1.05, cx: 960, cy: 540, roll: 0, dy: 0 }, 'the final contract’s camera');
  assert.deepEqual(breakCam(seam), breakCam(BR.BREAK_END - 1), 'v04’s flat camera (read by the fall and the stub) still holds its last frame');
});

// --- The energy standard ---------------------------------------------------------------------------------------------------------------

test('through the break no edge of the frame ever shows, no punch snaps in or out, and no white flash at all', () => {
  assertRigContinuous(BR.BREAK_START, BR.BREAK_END_V2, []);
  assertFlashesRare(BR.BREAK_START, BR.BREAK_END_V2, []);
  for (let f = BR.BREAK_START; f < BR.BREAK_END_V2; f++) assert.equal(flashAt(f), 0, `no white on ${f}: the sheet bans full-frame white in the break`);
});

test('the rig follows the switches part by part: all on (the film) is the design’s ACCENTS_V2 exactly; a part switched off gets back the punches its v04 frames were approved with (v04’s as built, the carried slingshot’s one bar later)', () => {
  assert.ok(BR.FLAT_V2 && BR.GRAPH_V2 && BR.LAUNCH_V2, 'the film draws every part natively');
  assert.deepEqual(BR.BREAK_ACCENTS, BR.ACCENTS_V2);
  assert.deepEqual(BR.breakAccents({ flat: true, graph: true, launch: true }), BR.ACCENTS_V2);
  const off = BR.breakAccents({ flat: false, graph: false, launch: false });
  assert.deepEqual(off, [...BR.V04_ACCENTS, ...BR.CARRIED_ACCENTS], 'all off: the skeleton’s rig');
  assert.equal(BR.V04_ACCENTS.length, 18);
  assert.deepEqual(BR.CARRIED_ACCENTS.map((a) => a.at - FRAMES_PER_BAR), BR.V04_ACCENTS.filter((a) => a.at >= BR.MATCH_CUT).map((a) => a.at));
  // Each part's punches are over before the next part's first frame, so switching one part never moves another's rig.
  const parts = [[BR.BREAK_START, BR.MATCH_CUT], [BR.MATCH_CUT, BR.WHIP_CUT], [BR.WHIP_CUT, BR.BREAK_END_V2]];
  for (const list of [BR.ACCENTS_V2, BR.V04_ACCENTS, BR.CARRIED_ACCENTS]) for (const a of list) {
    const [, to] = parts.find(([from, end]) => a.at >= from && a.at < end)!;
    assert.ok(a.at + 14 <= to, `the punch on ${a.at} is over (${a.at + 14}) by its part’s end ${to}`);
  }
  for (const flat of [false, true]) for (const graph of [false, true]) for (const launch of [false, true]) {
    const r = BR.breakAccents({ flat, graph, launch });
    const pick = (from: number, to: number) => r.filter((a) => a.at >= from && a.at < to);
    assert.deepEqual(pick(BR.BREAK_START, BR.MATCH_CUT), (flat ? BR.ACCENTS_V2 : BR.V04_ACCENTS).filter((a) => a.at < BR.MATCH_CUT));
    assert.deepEqual(pick(BR.MATCH_CUT, BR.WHIP_CUT), (graph ? BR.ACCENTS_V2 : BR.V04_ACCENTS).filter((a) => a.at >= BR.MATCH_CUT && a.at < BR.WHIP_CUT));
    assert.deepEqual(pick(BR.WHIP_CUT, BR.BREAK_END_V2), (launch ? BR.ACCENTS_V2 : BR.CARRIED_ACCENTS).filter((a) => a.at >= BR.WHIP_CUT));
  }
  const beats = new Set([BR.BREAK_START, ...BR.KICKS, ...BR.GHOST_KICKS, ...BR.KICKS.map((k) => k + FRAMES_PER_BAR)]);
  for (const a of off) {
    assert.ok(beats.has(a.at), `the accent on ${a.at} is on a kick`);
    assert.ok((a.punch ?? 0) >= 0.01 && (a.punch ?? 0) <= 0.045, `punch ${a.punch} on ${a.at}`);
    assert.equal(a.shake ?? 0, 0);
    assert.equal(a.flash ?? 0, 0);
  }
  const f = BR.BREAK_START;
  assert.ok(peak(f) > 1.01 && peak(f) < 1.025, `the glass gives way with a soft punch: ${peak(f).toFixed(4)}`);
  assert.ok(jolt(f) < 0.01);
  for (const g of [BR.PULL_OUT.from, BR.GRAPH.from, ...BR.NOTCHES, BR.REVERSE, BR.RELEASE]) assert.ok(peak(g) < 1 + 1e-9, `no punch where the scene’s own camera launches: ${g} peaks ${peak(g).toFixed(4)}`);
});

test('ACCENTS_V2 (the design’s rig, switched in when the launch is native): punches only, on drum hits, ≤ 0.05, none where the scene’s own camera launches', () => {
  const drums = new Set([BR.BREAK_START, ...BR.KICKS_V2, ...BR.GHOST_KICKS_V2, ...BR.CLAPS_V2]);
  const launches = [BR.PULL_OUT.from, BR.GRAPH.from, BR.SWING.from, ...BR.NOTCHES, BR.REVERSE, BR.RELEASE, BR.SPLAT];
  assert.equal(BR.ACCENTS_V2.length, 18);
  for (const a of BR.ACCENTS_V2) {
    assert.ok(drums.has(a.at), `${a.at} on a drum`);
    assert.ok(!launches.includes(a.at), `${a.at}: no punch where the camera launches`);
    assert.ok((a.punch ?? 0) >= 0.01 && (a.punch ?? 0) <= 0.05);
    assert.equal(a.shake ?? 0, 0);
    assert.equal(a.flash ?? 0, 0);
  }
  assert.deepEqual(BR.ACCENTS_V2.map((a) => a.at), [2496, 2592, 2628, 2640, 2688, 2724, 2736, 2808, 2832, 2904, 2928, 2952, 3000, 3024, 3048, 3180, 3192, 3198].map(design));
});

// --- v2: the design's timeline --------------------------------------------------------------------------------------------------------

test('v2 bar 2–5: the marquee, the work orders and their tears, the tilt and the heap, the POV beat, the world re-roll, the guest infected, the selection', () => {
  assert.deepEqual(BR.MARQUEE, { from: design(2616), to: design(2640) });
  assert.equal(BR.ORDERS.length, 10, 'T0–T9');
  for (let f = BR.BREAK_START; f < BR.BREAK_END_V2; f++) assert.ok(BR.ORDERS.filter((o) => within(f, o)).length <= 4, `at most 4 orders on ${f}`);
  for (const t of BR.TEARS) assert.ok(BR.ORDERS.some((o) => o.to === t || (t === BR.FLING && o.to === BR.WHIP_CUT)), `a tear on ${t} ends an order`);
  assert.deepEqual(BR.ORDER_COPIES, [design(2850), design(2853)]);
  assert.ok(BR.ORDER_COPIES.every((f) => within(f, BR.ORDERS[7])), 'only T7 copies itself');
  assert.equal(BR.TILT, design(2736));
  assert.equal(BR.HEAP, design(2748));
  assert.deepEqual(BR.POV, { from: design(2748), to: design(2772) });
  assert.equal(BR.POV.to, BR.STUTTER_END, 'the hard cut back is the stutter’s end (a segment boundary)');
  assert.deepEqual(BR.POV_LOCKS, [design(2748), design(2754), design(2760), design(2763), design(2766), design(2769)]);
  for (let i = 1; i < BR.PEEKS_V2.length; i++) assert.ok(BR.PEEKS_V2[i - 1].to <= BR.PEEKS_V2[i].from, 'one peeker at a time');
  assert.ok(BR.PEEKS_V2.every((p) => p.to <= design(2820) || p.from >= design(2856)), 'no peeker over 4.2& → 4.4 (clutter)');
  assert.ok(!BR.PEEKS_V2.some((p) => within(BR.POV.from, p)), 'the guest is gone when we are him');
  assert.deepEqual(BR.CRASH_ZOOM, { from: design(2820), to: design(2826) });
  assert.equal(BR.INFECT, design(2958));
  assert.deepEqual(BR.SELECT, { from: design(2964), to: design(2976) });
  assert.equal(BR.UI_POP, design(2973));
  assert.equal(BR.MONITOR_LINES_V2.length, MONITOR_ROWS_V2.length, 'one monitor change per line');
});

test('v2 bar 6, GRAPH: ten keyframes on the drum hits, valued the signature; the plunges bottom out on the backbeats; the rewind, the fling and the whip’s hidden cut', () => {
  assert.equal(BR.GRAPH_KEYS.length, SIGNATURE.length);
  const hits = new Set([...BR.KICKS_V2, ...BR.CLAPS_V2, ...BR.OPEN_HATS_V2, ...BR.CLOSED_HATS_V2]);
  for (const k of BR.GRAPH_KEYS) assert.ok(hits.has(k), `key ${k} on a drum hit`);
  assert.deepEqual(BR.GRAPH_KEYS, [2976, 2988, 2994, 3000, 3024, 3036, 3048, 3054, 3060, 3066].map(design));
  assert.deepEqual(BR.BOTTOMS, [design(3000), design(3048)]);
  for (const b of BR.BOTTOMS) assert.ok(BR.KICKS_V2.includes(b) && BR.CLAPS_V2.includes(b), 'a bottom on a K + C');
  assert.deepEqual(BR.PLUNGES.map((p) => p.to), BR.BOTTOMS);
  assert.deepEqual(BR.CHAIN_CLICKS, [design(3006), design(3012), design(3018)]);
  assert.ok(BR.CHAIN_CLICKS.every((c) => BR.CLOSED_HATS_V2.includes(c)), 'the ratchet is the 16th hats');
  assert.equal(BR.CREST, design(3024));
  assert.deepEqual(BR.REWIND, { from: design(3060), to: design(3066) });
  assert.equal(BR.FLING, design(3066));
  assert.deepEqual(BR.WHIP, { from: design(3063), to: design(3072) });
  assert.ok(within(BR.WHIP_CUT, BR.WHIP));
  assert.equal(BR.HOOK_V2.filter((h) => within(h, BR.GRAPH)).length, 7, 'HOOK[4] whole');
});

test('v2 bar 7, SLING: v04’s events one bar later (brows, stack, dialog, LOUDER, root, sudo, password, granted), the catch, one notch per kick, the [ROOT] row, full draw', () => {
  const shifted: [readonly number[] | number, readonly number[] | number][] = [
    [BR.BROWS, BR.BROWS_V2], [BR.STACK_BREATHS, BR.STACK_BREATHS_V2], [BR.STACK_CHASE, BR.STACK_CHASE_V2], [BR.DIALOG, BR.DIALOG_V2],
    [BR.LOUDER, BR.LOUDER_V2], [BR.ROOT, BR.ROOT_V2], [BR.SUDO, BR.SUDO_V2], [BR.PASSWORD, BR.PASSWORD_V2], [BR.GRANTED, BR.GRANTED_V2],
  ];
  for (const [v04, v2] of shifted) assert.deepEqual([v2].flat(), [v04].flat().map((f) => f + FRAMES_PER_BAR));
  assert.equal(BR.CATCH, design(3072));
  assert.deepEqual(BR.NOTCHES, [3096, 3120, 3144, 3156].map(design));
  assert.ok(BR.NOTCHES.every((n) => BR.KICKS_V2.includes(n)), 'one notch per kick');
  assert.equal(BR.ROOT_ROW, design(3150));
  assert.equal(BR.OVERLOAD_V2, design(3156));
  assert.deepEqual(BR.TENSION_V2, [3120, 3156, 3159, 3162, 3165].map(design));
  assert.deepEqual(BR.WINDOW_V2, { from: BR.DIALOG_V2, to: BR.BREAK_END_V2 });
});

test('v2 bar 8, FAKE DROP: the reverse angle, the creeps, the held breath, the release on 8.3, the splat, then digital silence; the look and the black spot', () => {
  assert.deepEqual(BR.CREEPS, [3180, 3192, 3198, 3204, 3207, 3210, 3213].map(design));
  assert.equal(BR.HELD_V2, design(3204));
  assert.equal(BR.RELEASE, at(8, 3));
  assert.equal(BR.SPLAT, design(3222));
  assert.equal(BR.LOOK, design(3234));
  assert.equal(BR.QMARK, design(3237));
  assert.ok(BR.GETS_IT - BR.QMARK >= 15, `the take holds ${BR.GETS_IT - BR.QMARK} frames`);
  assert.deepEqual(BR.BLACK_STEPS, [3252, 3255, 3258, 3261].map(design));
  assert.deepEqual(BR.SILENCE, { from: BR.LOOK, to: BR.BREAK_END_V2 });
  const drums = [...BR.KICKS_V2, ...BR.CLAPS_V2, ...BR.OPEN_HATS_V2, ...BR.CLOSED_HATS_V2, ...BR.GHOST_SNARES_V2];
  assert.ok(drums.every((d) => d < BR.HELD_V2), 'the drums stop on 8.2&');
  assert.deepEqual(BR.VOLUME_STEPS, [3171, 3192, 3204, 3213].map(design));
  assert.equal(BR.ARP_RACE_V2.length, 8);
  assert.ok(BR.ARP_RACE_V2.every((f) => f < BR.RELEASE));
});

test('v2 music: half time 2–4, four on the floor 5–6 with the 16th fill, the notches’ kicks in 7, the accelerating K + C in 8; the hook 2 → 4 → 6 → 8 → 7 notes; the chords and the pivot on 8.1', () => {
  const perBar = [2, 3, 4, 5, 6].map((b) => BR.HOOK_V2.filter((f) => f >= at(b) && f < at(b + 1)).length);
  assert.deepEqual(perBar, [2, 4, 6, 8, 7]);
  assert.deepEqual(BR.KICKS_V2.filter((k) => k >= at(6)), [2976, 3000, 3024, 3048, 3054, 3060, 3066, 3072, 3096, 3120, 3144, 3156, 3168, 3180, 3192, 3198].map(design));
  assert.deepEqual(BR.CHORDS_V2.filter((c) => c >= at(6)), [at(6), at(6, 3), at(7), at(7, 3), at(8)]);
  assert.ok(BR.OPEN_HATS_V2.every((h) => !BR.CLOSED_HATS_V2.includes(h)), 'a closed hat never on an open hat');
  assert.ok(BR.CLOSED_HATS_V2.every((h, i) => i === 0 || h > BR.CLOSED_HATS_V2[i - 1]));
  assert.ok(!BR.CLOSED_HATS_V2.some((h) => h > BR.STUTTER[0] && h < BR.STUTTER_END), 'no live hat inside the stutter');
  assert.deepEqual(BR.VOX_STEPS_V2, BR.NOTCHES);
  assert.deepEqual(BR.MOTIF_UP_V2, BR.SUDO_V2);
});

// --- The shot table ------------------------------------------------------------------------------------------------------------------

test('the shot table’s break rows: S21–S25 as built, S26G the graph (new, 2.5D, whips), S26S the sling (2.5D, hard-cuts to the reverse angle), S26 the fake drop (the break’s one 3D shot, T6)', () => {
  const rows = SHOTS.filter((s) => s.fromBar >= partBar('break') && s.toBar <= partBar('break', 8));
  assert.deepEqual(rows.map((s) => [s.id, s.fromBar - partBar('break') + 1, s.space, s.exit]), [
    ['S21', 1, '2.5d', 'continuous'],
    ['S22', 2, '2d', 'continuous'],
    ['S23', 3, '2.5d', 'continuous'],
    ['S24', 4, '2d', 'T5'],
    ['S25', 5, '2d', 'match'],
    ['S26G', 6, '2.5d', 'whip'],
    ['S26S', 7, '2.5d', 'cut'],
    ['S26', 8, '3d', 'T6'],
  ]);
  assert.ok(rows.every((s) => s.world === 'brutal' && s.fromBar === s.toBar));
});

// --- The cast and the strings --------------------------------------------------------------------------------------------------------

const collection = readCollection<{ face: string; renders: boolean; moods: string[] }>();
const entry = new Map(collection.map((e) => [e.face, e]));
const key = (face: string) => face.normalize('NFKC').replace(/\s/gu, '');

test('the cast file is what castBreak.mjs writes (it checks every pick against the collection, the fonts and every other face in the film)', { skip: NO_COLLECTION }, () => {
  const before = fs.readFileSync(new URL('../src/content/castBreak.ts', import.meta.url), 'utf8');
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/castBreak.mjs', import.meta.url)), '--print'], { encoding: 'utf8' });
  assert.equal(out, before);
});

test('v04’s cast is exported unchanged (the carried-over code draws it); v2 casts the hero’s new faces, the guest spying and infected, three peekers (two released)', () => {
  assert.equal(CAST.PEEKERS.length, 5);
  assert.deepEqual(CAST.PEEKERS_V2, CAST.PEEKERS.slice(0, 3));
  assert.deepEqual(CAST.RELEASED, CAST.PEEKERS.slice(3));
  for (const f of CAST.RELEASED) assert.ok(!CAST.BREAK_CAST.map(key).includes(key(f)), `${f} is released`);
  assert.ok(!CAST.BREAK_CAST.includes(CAST.GUEST_WAVE), 'the forgiven wave is replaced by the infection');
  assert.equal(CAST.HERO_FACES_V2.look, '( ・ω・)?', 'the look is ( ・ω・)?');
  assert.equal(CAST.GUEST_INFECTED.replace('ω', '▽'), `${CAST.GUEST_SPY}ノ`, 'the guest infected: his own face, his ▽ an ω');
  const friends = [...CAST.PEEKERS_V2, ...CAST.SHOCKED, ...Object.values(CAST.DANCERS).flat()];
  if (HAS_COLLECTION) for (const f of [...friends, CAST.GUEST_PEEK, CAST.GUEST_SPY, CAST.CAT]) assert.ok(entry.get(f)?.renders, `${f} is a face of the collection that draws`);
  assert.equal(new Set(friends.map(key)).size, friends.length, 'none twice in the break');
});

test('the hero never winks in the break (the film’s one wink is the ending’s), and his ω is in every face he wears', () => {
  const faces = [...Object.values(CAST.HERO_FACES).flat(), ...Object.values(CAST.HERO_FACES_V2).flat()];
  for (const f of faces) {
    assert.ok(f.includes('ω'), `${f} keeps his ω`);
    assert.ok(!entry.get(f)?.moods.includes('wink & smug'), `${f} winks`);
  }
  assert.ok(!faces.some((f) => /[・•･^]ω[<~]|[>~]ω[・•･^]/u.test(f)), 'no face with one eye open and one shut');
});

test('every string the break puts on screen is listed for the glyph check with its role; the work orders’ ID chips spell his signature, which is • ω • in UTF-8', () => {
  const texts = new Set([...BREAK_TEXTS, ...BREAK_TEXTS_V2].map((t) => `${t.role} ${t.text}`));
  for (const f of [...Object.values(CAST.HERO_FACES).flat(), ...Object.values(CAST.HERO_FACES_V2).flat()]) assert.ok(texts.has(`rounded ${f}`), `hero ${f}`);
  for (const f of [...CAST.PEEKERS, ...CAST.SHOCKED, ...Object.values(CAST.DANCERS).flat(), CAST.GUEST_PEEK, CAST.GUEST_WAVE, CAST.GUEST_SPY, CAST.GUEST_INFECTED, CAST.CAT]) assert.ok(texts.has(`jp ${f}`), `cast ${f}`);
  for (const t of ORDER_TEXTS.flat()) assert.ok(texts.has(`mono ${t}`), `order ${t}`);
  for (const part of Object.values(WAVER)) assert.ok(texts.has(`jp ${part}`), `waver part ${part}`);
  assert.equal(ORDER_TEXTS.length, BR.ORDERS.length);
  assert.equal(SIGNATURE.join(' '), [...Buffer.from('• ω •', 'utf8')].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
  assert.deepEqual(ORDER_TEXTS.map((_, i) => orderId(i)), SIGNATURE.map((b) => `#${b}`));
  assert.deepEqual(PEEK_FACES_V2[2], CAST.GUEST_PEEK, 'the guest peeks third');
});

// --- The dispatcher --------------------------------------------------------------------------------------------------------------------

/** A part that records what it is asked (instants, cams, looks, overlays), with a segment and a temporal of its own. */
function recorder(segment: { from: number; to: number }): Renderable & { frames: number[]; cams: number[]; looks: number[]; overlays: number[] } {
  const r = {
    frames: [] as number[],
    cams: [] as number[],
    looks: [] as number[],
    overlays: [] as number[],
    init: async () => {},
    render: (_gl: THREE.WebGLRenderer, ctx: FrameContext) => {
      r.frames.push(ctx.frame);
      r.cams.push(ctx.cam);
    },
    look: (f: number): Look => {
      r.looks.push(f);
      return { ...FLAT_LOOK, exposure: 1 + f / 1e6 };
    },
    temporal: () => ({ samples: 24, shutter: 0.5, persistence: 2 }),
    segment: () => segment,
    screenOverlay: (_gl: THREE.WebGLRenderer, _t: THREE.WebGLRenderTarget, f: number) => {
      r.overlays.push(f);
    },
    dispose: () => {},
  };
  return r;
}
const GL = null as unknown as THREE.WebGLRenderer;
const RT = null as unknown as THREE.WebGLRenderTarget;
const ctxAt = (f: number): FrameContext => ({ frame: f, cam: f, t: 0, beat: 0, quality: 'final', width: 1920, height: 1080 }) as FrameContext;

test('the break scene hands each frame to its part, every part native: the fall, the flat world, the graph (BreakGraph), the launch (the sling and the fake drop, holding drop 2’s scene)', () => {
  const next = (): Renderable => ({ init: async () => {}, render: () => {}, look: () => FLAT_LOOK, dispose: () => {} });
  const scene = new BreakScene(next);
  assert.equal(scene.v04Launch.next, next, 'drop 2’s scene goes to the launch');
  assert.deepEqual(scene.parts.map((p) => p.name), ['fall', 'flat', 'graph', 'launch']);
  assert.ok(scene.graph instanceof BreakGraph, 'the graph bar is native');
  assert.equal(scene.launch, scene.v04Launch, 'the launch is native');
  assert.ok(!scene.parts.some((p) => p.part instanceof RemapPart), 'no stub left in the film');
  const graph: Renderable = scene.graph;
  const launch: Renderable = scene.v04Launch;
  for (const [f, part] of [[at(1), scene.fall], [at(2) - 1, scene.fall], [at(2), scene.flat], [at(6) - 1, scene.flat], [at(6), graph], [at(6, 3), graph], [BR.WHIP_CUT - 1, graph], [BR.WHIP_CUT, launch], [at(7, 2), launch], [at(8, 3), launch], [BR.BREAK_END_V2 - 1, launch]] as [number, Renderable][]) {
    assert.deepEqual(scene.look(f), part.look(f), `look of ${f}`);
    assert.deepEqual(scene.temporal(f), part.temporal?.(f) ?? DEFAULT_TEMPORAL, `temporal of ${f}`);
  }
  assert.equal(typeof scene.screenOverlay, 'function');
});

test('with every v2 switch off (a proof bundle’s DefinePlugin flags), the dispatcher builds the skeleton’s stubs again — the graph a hold of the flat world’s last frame, the launch v04’s slingshot one bar later — and the rig is v04’s plus the carried punches', () => {
  const src = (p: string) => JSON.stringify(new URL(p, import.meta.url).href);
  const script = `globalThis.__KX_FLAT_V04__ = true; globalThis.__KX_GRAPH_V04__ = true; globalThis.__KX_LAUNCH_V04__ = true;
    const BR = await import(${src('../src/score/break.ts')});
    const { BreakScene, RemapPart } = await import(${src('../src/scenes/break.ts')});
    const { FLAT_V2 } = await import(${src('../src/shots/breakShared.ts')});
    const { rigAt } = await import(${src('../src/score/energy.ts')});
    const at = (b, n = 1) => BR.BREAK_BARS_V2[b - 1] + (n - 1) * 24;
    const s = new BreakScene();
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const rig = []; for (let f = at(7); f < at(8); f += 0.5) rig.push(eq(rigAt(f), rigAt(f - 96)));
    console.log(JSON.stringify({
      sw: [BR.FLAT_V2, BR.GRAPH_V2, BR.LAUNCH_V2, FLAT_V2],
      graph: s.graph instanceof RemapPart && s.graph.inner === s.flat,
      launch: s.launch instanceof RemapPart && s.launch.inner === s.v04Launch,
      graphLook: eq(s.look(at(6, 3)), s.flat.look(at(6) - 1)),
      launchLook: eq(s.look(at(7, 2)), s.v04Launch.look(at(6, 2))),
      launchTemporal: eq(s.temporal(at(7, 2)), s.v04Launch.temporal(at(6, 2))),
      holdTail: s.temporal(at(8, 2)).persistence,
      seg7: s.segment(at(7, 2)), cut7: [s.segment(at(7) - 1).to, s.segment(at(7)).from],
      rigCarried: rig.every(Boolean),
      accents: eq(BR.BREAK_ACCENTS, [...BR.V04_ACCENTS, ...BR.CARRIED_ACCENTS]),
    }));`;
  const o = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }));
  assert.deepEqual(o.sw, [false, false, false, false], 'the flags switch all three (and the flat shots’ re-export)');
  assert.ok(o.graph, 'the graph stub draws the flat world');
  assert.ok(o.launch, 'the launch stub draws v04’s launch');
  assert.ok(o.graphLook && o.launchLook && o.launchTemporal, 'the stubs take the inner part’s look and sampling at the mapped frame');
  assert.equal(o.holdTail, 0, 'a hold has no phosphor tail');
  assert.deepEqual(o.seg7, { from: at(7), to: at(8) }, 'break 7 is v04’s launch segment, one bar later');
  assert.deepEqual(o.cut7, [at(7), at(7)], '7.1 is a stub region boundary');
  assert.ok(o.rigCarried, 'the carried picture’s rig is v04’s, one bar later');
  assert.ok(o.accents, 'the skeleton’s rig');
});

test('a stub draws its inner part at the mapped instants: a hold keeps the sub-frame offsets (clamped into the inner segment), a shift moves them whole; look, overlay and segment follow', () => {
  const inner = recorder({ from: 1000, to: 1100 });
  const stub = new RemapPart(inner, [{ from: 2000, to: 2096, hold: 1099 }, { from: 2096, to: 2192, shift: 1100 }, { from: 2192, to: 2300, hold: 1000 }], 'test');
  stub.render(GL, ctxAt(2010.25), RT);
  stub.render(GL, ctxAt(2150.75), RT);
  stub.render(GL, ctxAt(2200.25), RT);
  stub.render(GL, ctxAt(2199.75), RT);
  assert.deepEqual(inner.frames, [1099.25, 1050.75, 1000.25, 1000], 'hold, shift, hold, a hold clamped to the inner segment’s start');
  assert.deepEqual(inner.cams, inner.frames);
  stub.look(2010);
  stub.look(2150);
  stub.screenOverlay(GL, RT, 2250);
  assert.deepEqual(inner.looks, [1099, 1050]);
  assert.deepEqual(inner.overlays, [1000]);
  assert.deepEqual(stub.segment(2150), { from: 2100, to: 2192 }, 'a shifted region: the inner segment moved, cut to the region');
  assert.deepEqual(stub.segment(2010), { from: 2000, to: 2011 }, 'a hold: the inner segment moved to the output frame, cut to the region');
  assert.deepEqual(stub.temporal(2010), { samples: 24, shutter: 0.5, persistence: 0 });
  assert.deepEqual(stub.temporal(2150), { samples: 24, shutter: 0.5, persistence: 2 });
});

test('every part boundary is a segment boundary: 2.1’s slap is wholly the flat world’s (R2-03), the hard cut back (C3), 6.1 (C6), the whip’s hidden cut (C7) and 8.1 (C8) are clean cuts; 7.1 (the catch) is inside the launch’s segment', () => {
  const scene = new BreakScene();
  const instants = (f: number): number[] => temporalSamples(f, scene.temporal(f), scene.segment(f)).map((s) => s.frame);
  assert.deepEqual(scene.segment(at(1)), { from: BR.BREAK_START, to: BR.FLAT.from });
  for (const s of instants(at(2))) assert.ok(s >= BR.FLAT.from, `2.1 samples ${s.toFixed(3)}: the flat world draws all of it`);
  for (const s of instants(at(2) - 1)) assert.ok(s < BR.FLAT.from, `2.1 − 1 samples ${s.toFixed(3)}: the fall draws all of it`);
  assert.deepEqual([scene.segment(at(3, 4.5) - 1).to, scene.segment(at(3, 4.5)).from], [BR.STUTTER_END, BR.STUTTER_END]);
  for (const cut of [at(6), BR.WHIP_CUT, at(8)]) {
    assert.ok(scene.segment(cut - 1).to <= cut, `${cut} − 1 ends by ${cut}`);
    assert.ok(scene.segment(cut).from >= cut, `${cut} starts a segment`);
  }
  assert.deepEqual(scene.segment(at(7, 2)), { from: BR.WHIP_CUT, to: at(8) }, 'the sling is one segment from the whip’s hidden cut: the catch carries the whip’s motion across 7.1');
  for (let f = BR.BREAK_START; f < BR.BREAK_END_V2; f++) {
    const part = BR.BREAK_PARTS.find((p) => within(f, p))!;
    const g = scene.segment(f);
    assert.ok(g.from >= part.from && g.to <= part.to && within(f, g), `the segment of ${f} (${g.from}–${g.to}) stays in its part (${part.from}–${part.to})`);
  }
});

test('a part that keeps drawing over the next one (the fall’s shard on our side, until the flat world takes it over) also gets the sub-frames it needs there', () => {
  const scene = new BreakScene();
  const fall = scene.fall as unknown as { over?: { from: number; to: number }; temporal(f: number): Temporal };
  fall.over = { from: BR.SHARD_STAYS, to: BR.LOCK };
  fall.temporal = () => ({ samples: 48, shutter: 0.5, persistence: 0 });
  const flat: Renderable = scene.flat;
  assert.equal(scene.temporal(at(2, 2)).samples, Math.max(48, flat.temporal?.(at(2, 2))?.samples ?? 0));
  assert.equal(scene.temporal(at(2, 4.5)).samples, flat.temporal?.(at(2, 4.5))?.samples ?? DEFAULT_TEMPORAL.samples, 'not after it');
});

test('all 8 bars through the dispatcher, with the rig: every frame whose camera moves more than 20 px gets ≥ 32 sub-frames, and the camera never holds still for more than 12 frames (the frozen scanner and the restart wipe’s cover aside)', () => {
  const scene = new BreakScene();
  // The shot camera each part draws with: the flat bars' travelling camera (flatCam; the fall's is v04's breakCam, which it equals
  // there), the graph's ride (graphCam), the sling's and the fake drop's (launchCamV2). Each part's own test audits its part; this one
  // the whole break, the part boundaries included.
  const cam = (f: number) => (f < BR.MATCH_CUT ? flatCam(f) : f < BR.WHIP_CUT ? graphCam(f) : launchCamV2(f));
  const cameraAt: CameraAt = (f) => ({ pose: camPose(cam(f)), samples: onShutter(f, scene.temporal(f)) });
  const skip = (f: number): boolean => (f >= BR.STUTTER[0] && f <= BR.STUTTER_END) || f === BR.WIPE_COVER || f === BR.CATCH;
  assertFastMovesSampled(BR.BREAK_START, BR.BREAK_END_V2, cameraAt, skip);
  assertNeverStill(BR.BREAK_START, BR.BREAK_END_V2, poseMoved(cameraAt, skip));
});
