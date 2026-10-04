// Iteration 2 of the break (the director's rulings 1–5 after the whole-film review of kaomoji-full-v01): the picture halves that are
// pure logic — the restart wipe revealing him on break 5.1's kick (ruling 2), the kicks the picture used to miss (ruling 3), break bar 5's punches
// and one decoration a beat (ruling 4). Ruling 1's push and first pane are pinned in breakFallMotion / breakFall, ruling 5 and 1's
// sound in breakAudio.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as BR from '../src/score/break.ts';
import { BAR22_BLOCKS, BLOCK_COLORS } from '../src/shots/breakShared.ts';
import { dancersAt, fanAt, flatSegment, flatTemporal, rippleAt, wipePanels, worldAt } from '../src/shots/breakWorld.ts';
import { peak } from './lib/energyAudit.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const subFrames = (f: number): number[] => temporalSamples(f, flatTemporal(f), flatSegment(f)).map((s) => s.frame);

// --- Ruling 2: break 5.1 on its kick ---------------------------------------------------------------------------------------------------

test('ruling 2: the restart wipe keeps the frame covered through 2303 and its last panel leaves on 25.1’s kick — his face is revealed on 2304, not on 2301–2303', () => {
  const covered = (f: number): boolean => {
    const panels = wipePanels(f);
    for (let x = 0; x <= 1920; x += 4) if (!panels.some((p) => p.x0 <= x && p.x1 >= x)) return false;
    return true;
  };
  for (let f = BR.WIPE_COVER; f < BR.REVEAL; f++) assert.ok(covered(f), `the frame is covered on ${f}`);
  // Under the cover the stack stays whole, its top three creeping back from the left edge (≤ 60 px): nothing of him shows before break 5.1.
  for (let f = BR.WIPE_COVER; f < BR.REVEAL; f++) for (const p of wipePanels(f)) assert.ok(p.x0 <= 60 && p.x1 >= 1920, `${p.color} on ${f}: ${p.x0.toFixed(0)}–${p.x1.toFixed(0)}`);
  // Break 5.1: the stack launches off together — his face (x 230–1690 at em 414, stretch 1.3) is clear; a sliver at the right edge says it left.
  const last = wipePanels(BR.REVEAL);
  assert.equal(last.length, 4, 'the whole stack is still leaving on 2304');
  for (const p of last) assert.ok(p.x0 >= 1700 && p.x0 < 1920, `${p.color}'s trailing edge is past his face on 2304: x ${p.x0.toFixed(0)}`);
  // The biggest move of the wipe's exit is on break 5.1: every trailing edge travels further into that frame than in any other frame of the cover.
  const x0 = (f: number, c: string): number => wipePanels(f).find((p) => p.color === c)?.x0 ?? 1920;
  for (const c of ['yellow', 'mint', 'coral', 'violet']) {
    const into = x0(BR.REVEAL, c) - x0(BR.REVEAL - 1, c);
    for (let f = BR.WIPE_COVER + 1; f < BR.REVEAL + 3; f++) if (f !== BR.REVEAL) assert.ok(x0(f, c) - x0(f - 1, c) < into / 4, `${c} moves most into 2304 (${f})`);
  }
  assert.equal(wipePanels(BR.REVEAL + 1).length, 0, 'gone on 2305');
  // One sharp instant a frame (R1-08), break 5.1 included.
  for (const f of [BR.REVEAL - 1, BR.REVEAL]) for (const s of subFrames(f)) assert.equal(JSON.stringify(wipePanels(s)), JSON.stringify(wipePanels(f)), `${f} @ ${s.toFixed(3)}`);
});

// --- Ruling 3: the ghost kicks get a picture ---------------------------------------------------------------------------------------

/** How far break bar 2–3's blocks are pressed into their shadows at instant f (0–1), read from the world's block items. */
const pressed = (f: number): number[] =>
  worldAt(f).items.filter((i) => i.role === 'block' && i.colorName !== 'cream').map((i) => (i.x - BAR22_BLOCKS[i.colorName as (typeof BLOCK_COLORS)[number]].x) / 8);
const confetti = (f: number): number[] => worldAt(f).items.filter((i) => i.role === 'confetti').map((i) => i.rot);

test('ruling 3: on 22.2& (2052, the ghost kick) and 23.2& (2148, inside the loop) the blocks slam 8 px into their shadows and the confetti tick 45°, whole on the kick’s own frame and none of it on the frame before', () => {
  assert.deepEqual(BR.STRIKES, [at(2, 2.5), at(3, 2.5)]);
  for (const k of BR.STRIKES) {
    assert.ok(BR.KICKS.includes(k) || BR.GHOST_KICKS.includes(k), `${k} is a kick`);
    for (const s of subFrames(k)) for (const p of pressed(s)) assert.ok(p > 0.99, `pressed through frame ${k} (${s.toFixed(3)}): ${p.toFixed(2)}`);
    for (const s of subFrames(k - 1)) for (const p of pressed(s)) assert.ok(p < 0.01, `not yet on frame ${k - 1} (${s.toFixed(3)}): ${p.toFixed(2)}`);
    // The shadows close (12 → 4 px) with the press, and the blocks come back up over the next 8 frames.
    const shadow = worldAt(k).items.find((i) => i.role === 'block')!.shadow[0];
    assert.ok(Math.abs(shadow - 4) < 0.1, `the shadow is 4 px on ${k}: ${shadow}`);
    for (const p of pressed(k + 10)) assert.ok(p < 0.01, `released by ${k + 10}`);
    const tick = confetti(k).map((r, i) => r - confetti(k - 1)[i]);
    for (const d of tick) assert.ok(d >= 44 && d <= 47, `the confetti tick 45° on ${k}: ${d.toFixed(1)}°`);
    const within = subFrames(k).map((s) => confetti(s)[0]);
    assert.ok(Math.max(...within) - Math.min(...within) < 1, `whole on its frame (no smear): ${within.map((r) => r.toFixed(1)).join(' ')}`);
  }
});

// --- Ruling 4: break bar 5 ---------------------------------------------------------------------------------------------------------------

test('ruling 4: bar 25’s four kicks punch 0.035–0.045 (the reveal the biggest), with no shake and no white — v04’s rig, as built; in v2 the reveal’s punch is the pull-out (sheet §4.4 #8) and 5.2–5.4 keep theirs', () => {
  // v04's layer (the rig the carried bars were approved with: the identity proofs switch the flat bars back to it).
  const bar25 = BR.V04_ACCENTS.filter((a) => a.at >= BR.REVEAL && a.at < BR.MATCH_CUT);
  assert.deepEqual(bar25.map((a) => a.at), [at(5), at(5, 2), at(5, 3), at(5, 4)]);
  for (const a of bar25) {
    assert.ok((a.punch ?? 0) >= 0.035 && (a.punch ?? 0) <= 0.045, `punch ${a.punch} on ${a.at}`);
    assert.equal(a.shake ?? 0, 0);
    assert.equal(a.flash ?? 0, 0);
  }
  assert.equal(Math.max(...bar25.map((a) => a.punch ?? 0)), bar25[0].punch, 'the reveal is the biggest');
  // v2 (the film): no rig punch on 5.1 — the scene's pull-out (Z 1.45 → 1.00, L on the kick) is the hit; the other three kicks as built.
  const v2 = BR.BREAK_ACCENTS.filter((a) => a.at >= BR.REVEAL && a.at < BR.MATCH_CUT);
  assert.deepEqual(v2, bar25.slice(1), 'v2: 5.2, 5.3, 5.4 as built');
  assert.ok(peak(BR.REVEAL) < 1 + 1e-9, `no punch fights the pull-out: ${peak(BR.REVEAL).toFixed(4)}`);
});

test('ruling 4: one decoration a beat in bar 25 — the fan on 25.2, the friends on 25.3, the outline ripple on 25.4 — each gone (folded, ducked) before the next one comes', () => {
  const on = (f: number) => ({ fan: fanAt(f).length > 0, friends: dancersAt(f).length > 0, ripple: rippleAt(f).length > 0 });
  for (let f = BR.REVEAL; f < BR.MATCH_CUT; f += 0.25) {
    const o = on(f);
    const n = [o.fan, o.friends, o.ripple].filter(Boolean).length;
    assert.ok(n <= 1, `${n} decorations at once on ${f}: ${JSON.stringify(o)}`);
    if (f < BR.FAN) assert.equal(n, 0, `25.1 is his alone (${f})`);
  }
  assert.deepEqual(on(at(5, 2.5)), { fan: true, friends: false, ripple: false }, '25.2: the fan');
  assert.deepEqual(on(at(5, 3.5)), { fan: false, friends: true, ripple: false }, '25.3: the friends');
  assert.deepEqual(on(at(5, 4.25) - 2), { fan: false, friends: false, ripple: true }, '25.4: the ripple');
  // The fan folds into him over break 5.2's last 16th, the friends duck back behind their blocks over 5.3's.
  assert.deepEqual(BR.FAN_FOLD, { from: BR.WAVE - 6, to: BR.WAVE });
  assert.deepEqual(BR.FRIENDS, { from: BR.WAVE, to: BR.RIPPLE });
  assert.deepEqual(BR.FRIENDS_DUCK, { from: BR.RIPPLE - 6, to: BR.RIPPLE });
  assert.equal(fanAt(BR.FAN_FOLD.from).length, 8, 'the fan is open as the fold starts');
  assert.ok(Math.max(...fanAt(BR.FAN_FOLD.to - 0.5).map((c) => Math.abs(c.angle))) < 0.1, 'and closed into him by 25.3');
  // Up on break 5.3: every friend, the cat and the forgiven guest, landed on 5.3e and in front of the world.
  const up = dancersAt(BR.DANCERS_LAND + 2);
  assert.ok(up.length >= 7, `six dancers and the guest: ${up.length}`);
  assert.ok(up.filter((d) => d.color === 'ink').every((d) => !d.behind), 'in front once landed');
  const down = dancersAt(BR.FRIENDS_DUCK.to - 0.5);
  assert.ok(down.every((d) => d.behind), 'ducking behind their blocks');
});
