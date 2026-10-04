// Bridge B (v08, X03: src/score/bridgeB.ts, src/shots/bridgeB.ts, src/scenes/bridgeB.ts, with drop 2's crash shot src/shots/drop2Crash.ts
// and the bullet time's tape stop, src/scenes/drop2Bullet.ts): THE CRASH TAKES TIME. The v07 review: the turn from the spin into the ending's
// crash was abrupt, like a break, its transition too short. These pin the score's grid, the two clocks (the camera's tape stop landing front-on on the downbeat; the
// program's frame rate falling, every stage on a fresh picture, frozen from 1.4), the honest camera line, the stages a beat apart, the
// blue moving on the film's time and taken back by the inhale, the anchor across both lines, and the scene's photography.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cameraLine, hexOf } from '../src/content/bridgeB.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import type { Renderable } from '../src/engine/types.ts';
import { BridgeBScene } from '../src/scenes/bridgeB.ts';
import * as B from '../src/score/bridgeB.ts';
import { BULLET, DRAIN, DROP2_END, MUSIC_BOX, HEARTBEATS, ORBIT, PLATES, crashClock } from '../src/score/drop2.ts';
import { partEnd, partFrame, partStart } from '../src/score/film.ts';
import { LUB, OUTRO_START } from '../src/score/outro.ts';
import { SHOTS } from '../src/score/shots.ts';
import { SPANS } from '../src/score/spans.ts';
import * as BB from '../src/shots/bridgeB.ts';
import { orbitDegrees } from '../src/shots/drop2Bullet.ts';
import * as K from '../src/shots/drop2Crash.ts';
import { HANDOFFS } from '../src/shots/drop2Shared.ts';

const S = B.BRIDGE_B_START;
const END = B.BRIDGE_B_END;
const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

test('bridge B is film bar 58 (5472–5567), a span of its own scene and the shot X03 (continuous both ways), built (no stub)', () => {
  assert.deepEqual([S, END], [partStart('bridgeB'), partEnd('bridgeB')]);
  assert.deepEqual([S, END], [5472, 5568]);
  assert.deepEqual([S, END], [DROP2_END, OUTRO_START]);
  assert.deepEqual(SPANS.filter((s) => s.key === 'bridgeB'), [{ from: S, to: END, key: 'bridgeB' }]);
  const x03 = SHOTS.find((s) => s.id === 'X03')!;
  assert.deepEqual([x03.fromBar, x03.toBar, x03.world, x03.exit], [58, 58, 'terminal', 'continuous']);
  assert.equal(B.at(1, 3.5), S + 60);
  assert.deepEqual(B.BRIDGE_B_ACCENTS, [], 'the rig adds nothing (since drop 2’s reel blades): the camera is the one failing');
});

test('the score’s rules: every frame on the 3-frame grid (the 32nd notes), windows { from, to } with to after from, every event between drop 2’s last beat and the outro', () => {
  const frames: number[] = [];
  const windows: { from: number; to: number }[] = [];
  for (const [name, v] of Object.entries(B)) {
    if (typeof v === 'number') frames.push(v);
    else if (Array.isArray(v)) for (const x of v) {
      if (typeof x === 'number') frames.push(x);
      // (DRAIN_RINGS' from / to are distances, px from his outline; its `at` a frame.)
      else for (const k of (name === 'DRAIN_RINGS' ? ['at'] : ['at', 'from', 'to']) as readonly ('at' | 'from' | 'to')[]) if (typeof (x as Record<string, unknown>)[k] === 'number' && Number.isFinite((x as Record<string, number>)[k])) frames.push((x as Record<string, number>)[k]);
    }
    else if (v && typeof v === 'object' && 'from' in v && 'to' in v) {
      windows.push(v as { from: number; to: number });
      frames.push((v as { from: number }).from, (v as { to: number }).to);
    } else if (v && typeof v === 'object' && name === 'STAGES') frames.push(...Object.values(v as Record<string, number>));
  }
  for (const f of frames) {
    if (f === B.TAPE_LAG || f === B.TINT.first) continue;
    assert.equal(f % 3, 0, `${f} on the grid`);
    assert.ok(f >= B.TAPE_STOP.from && f <= END, `${f} inside the hand-off`);
  }
  for (const w of windows) assert.ok(w.to > w.from, `${w.from}–${w.to}`);
  assert.equal(B.TAPE_STOP.from, partFrame('drop2', 20, 3), 'the tape stop starts on drop2 20.4 (the music box’s C♯6, the plates)');
  assert.deepEqual([B.STAGES.colour, B.STAGES.tear, B.STAGES.corrupt, B.STAGES.freeze], [B.at(1), B.at(1, 2), B.at(1, 3), B.at(1, 4)], 'a stage a beat');
  assert.deepEqual([B.HAND_OFF_ZERO.from, B.HAND_OFF_ZERO.to], [END - 6, END], 'the zero: the last 16th');
  assert.deepEqual([B.INHALE.from, B.INHALE.to], [END - 12, END]);
});

test('the camera’s clock (the tape stop): the film’s own to drop2 20.4, then slowing at a constant rate to rest, reaching the bullet time’s landing (front-on, 360°) on the bridge’s downbeat; 12 frames late after it', () => {
  for (const f of [BULLET.from, PLATES.from - 1, B.TAPE_STOP.from]) assert.equal(B.cameraTime(f), f);
  assert.equal(B.cameraTime(S), DRAIN.from, 'lands on the bullet time’s landing');
  assert.equal(B.TAPE_LAG, 12);
  for (const f of [S, S + 10, END]) assert.equal(B.cameraTime(f), f - B.TAPE_LAG);
  let last = -Infinity;
  let speed = Infinity;
  for (let f = B.TAPE_STOP.from; f <= S; f += 0.25) {
    const c = B.cameraTime(f);
    assert.ok(c >= last, `${f}: never backward`);
    const v = (B.cameraTime(f + 0.25) - c) / 0.25;
    if (f < S) assert.ok(v <= speed + 1e-9, `${f}: slowing`);
    speed = v;
    last = c;
  }
  assert.ok(B.cameraTime(S - 1) - B.cameraTime(S - 2) < 0.1, 'at rest on landing');
  // The picture: the orbit reaches 360° on the downbeat (the bullet time's camera on its clock), not on 20.4&.
  assert.ok(360 - orbitDegrees(B.cameraTime(S - 4)) > 0 && 360 - orbitDegrees(B.cameraTime(S - 4)) < 0.2, 'still settling in the last frames');
  assert.equal(orbitDegrees(B.cameraTime(S)), 360);
  assert.ok(orbitDegrees(B.cameraTime(DRAIN.from)) < orbitDegrees(DRAIN.from), 'the last beat is slower than as built');
  assert.equal(ORBIT.to, DRAIN.from);
});

test('the program’s frames (the frame rate falling, E9’s honest egg): 30 fps from drop2 20.4&, 20 on the landing, 15 on the tear, 10 on the corruption, 5 from 1.3&, frozen from the freeze; every stage lands on a fresh picture; held frames keep their sub-frames', () => {
  for (const f of range(BULLET.from, partFrame('drop2', 20, 3.5))) assert.equal(B.programFrame(f), f);
  const fresh = (f: number) => B.programFrame(f) === f;
  for (const f of [S, B.STAGES.tear, B.STAGES.corrupt, B.at(1, 3.5), B.FREEZE, B.HEART_B.lub, B.MUSIC_BOX_B[0].at]) assert.ok(fresh(f), `${f} is a new picture`);
  const rateIn = (a: number, b: number) => range(a, b).filter(fresh).length / ((b - a) / 60);
  assert.deepEqual([rateIn(partFrame('drop2', 20, 3.5), S), rateIn(S, B.STAGES.tear), rateIn(B.STAGES.tear, B.STAGES.corrupt), rateIn(B.STAGES.corrupt, B.at(1, 3.5)), rateIn(B.at(1, 3.5), B.FREEZE)], [30, 20, 15, 10, 5]);
  for (const f of range(B.FREEZE, END)) assert.equal(B.programFrame(f), B.FREEZE, `${f}: frozen`);
  for (const f of [S + 1.25, B.STAGES.tear + 2.1, B.FREEZE + 7.2]) assert.ok(Math.abs((B.programFrame(f) - Math.round(B.programFrame(f))) - (f - Math.round(f))) < 1e-9, 'the sub-frame’s offset kept');
  for (const f of range(S - 20, END, 0.5)) assert.equal(B.programFrame(B.programFrame(f)), B.programFrame(f), 'a held picture is its own');
});

test('the camera line is honest: 60 fps through the tape stop (every frame new, only slower), then falling on the 8ths as the dropped frames fill its window, `0.0 · not responding` from the freeze, fading with the inhale', () => {
  for (const f of range(partFrame('drop2', 20), partFrame('drop2', 20, 3.5) + 12)) assert.equal(B.cameraFps(f).fps, 60, `${f}`);
  let last = 61;
  for (let f = partFrame('drop2', 20, 3.5) + 12; f < B.FREEZE; f += 12) {
    const c = B.cameraFps(f);
    assert.ok(!c.frozen && c.fps <= last, `${f}: ${c.fps}`);
    last = c.fps;
  }
  assert.ok(last <= 20, `under 20 by the freeze: ${last}`);
  for (const f of [B.FREEZE, END - 1]) assert.deepEqual(B.cameraFps(f), { fps: 0, frozen: true });
  assert.equal(BB.cameraLineText(partFrame('drop2', 20)).text, 'camera 60.0 fps · still rolling');
  assert.equal(BB.cameraLineText(S).text, `camera ${B.cameraFps(S).fps.toFixed(1)} fps · dropping frames`);
  assert.equal(BB.cameraLineText(B.FREEZE).text, 'camera 0.0 fps · not responding');
  assert.equal(cameraLine(0, true), 'camera 0.0 fps · not responding');
  assert.equal(BB.lineFade(B.INHALE.from), 1);
  assert.equal(BB.lineFade(END - 1), 0, 'gone on H5');
  assert.deepEqual([hexOf('@'), hexOf('='), hexOf('+'), hexOf('*')], ['40', '3d', '2b', '2a']);
});

test('the sound’s events: the music box runs down (A♯5, F♯5, D♯5 after drop 2’s C♯6: the blue screen’s glass figure, slower each time, flatter each time); his heart slower between drop 2’s and the ending’s; the glitches on their stages', () => {
  const box = [MUSIC_BOX[MUSIC_BOX.length - 1].at, ...B.MUSIC_BOX_B.map((x) => x.at)];
  const gaps = box.slice(1).map((f, i) => f - box[i]);
  assert.deepEqual(gaps, [24, 30, 36], 'a 16th later each time');
  assert.deepEqual([MUSIC_BOX[MUSIC_BOX.length - 1].midi, ...B.MUSIC_BOX_B.map((x) => x.midi)], [85, 82, 78, 75], 'C♯6 A♯5 F♯5 D♯5');
  for (let k = 1; k < B.MUSIC_BOX_B.length; k++) assert.ok(B.MUSIC_BOX_B[k].cents < B.MUSIC_BOX_B[k - 1].cents, 'flatter each time');
  const lubs = [HEARTBEATS[0].at, HEARTBEATS[1].at, B.HEART_B.lub, LUB[0]];
  const beats = lubs.slice(1).map((f, i) => f - lubs[i]);
  assert.ok(beats[1] > beats[0] && beats[2] > beats[1], `the heart slows: ${beats}`);
  assert.ok(B.HEART_B.dub - B.HEART_B.lub > HEARTBEATS[0].dub - HEARTBEATS[0].at, 'the dub later too');
  assert.deepEqual([B.SLIP_CLICK, B.TEAR_CHIRPS[0], B.SKIP.from, B.STUCK.from], [B.HEART_B.lub, B.STAGES.tear, B.STAGES.corrupt, B.STAGES.freeze]);
  assert.equal(B.SLIP.from, B.HEART_B.lub, 'the CRT jolts with his heart, not on the line');
  assert.deepEqual([B.STUCK.to], [B.HAND_OFF_ZERO.from], 'the stuck buffer until the zero');
});

test('the blue is the system’s: the spot, its leak and his heart’s glow move on the film’s time while the program is frozen; the inhale takes the leak, the corruption, the veil and the freeze’s tear back in by the last frame but one', () => {
  const cap = { hx: 494, hy: 190 };
  const spot = (f: number) => K.seamSpotAt(f, cap)!;
  // Frozen program, moving blue: through the freeze the program shows one picture while the leak and the spot change.
  assert.equal(B.programFrame(B.FREEZE + 2), B.programFrame(B.FREEZE + 10));
  assert.notEqual(BB.leakPx(B.FREEZE + 2), BB.leakPx(B.FREEZE + 10));
  assert.notEqual(spot(END - 3).hw, spot(END - 6).hw);
  for (const f of [END - 2, END - 1]) {
    assert.equal(BB.leakPx(f), 0);
    assert.equal(BB.veilAt(f), 0);
    assert.equal(BB.retractU(f), 1);
  }
  assert.ok(BB.heartPulseB(B.HEART_B.lub) === 1 && BB.heartPulseB(B.HEART_B.lub - 1) === 0, 'his heart beats on the lub');
  assert.ok(BB.heartPulseB(B.HEART_B.dub) >= 0.6 - 1e-9, 'and the dub');
  // The blue leaks into the type round the spot, never under it.
  const s = spot(B.FREEZE);
  assert.equal(BB.leakTint(960, s.cy, B.FREEZE, s), 0, 'under the spot: cleared, not tinted');
  assert.ok(BB.leakTint(960, s.cy - s.hh - 20, B.FREEZE, s) > 0.5, 'just outside it: blue');
  assert.equal(BB.leakTint(960, s.cy - s.hh - 400, B.FREEZE, s), 0, 'far out: the dim text');
});

test('the corruption’s blocks: 18 in three waves, outward wave by wave, each in the field, outside his clearing (never over his face), the same every time', () => {
  const clear = { hw: 584, hh: 280, cy: 540 };
  const blocks = BB.corruptBlocks(clear);
  assert.equal(blocks.length, BB.CORRUPT.blocks);
  assert.deepEqual([...new Set(blocks.map((b) => b.wave))], [...B.CORRUPT_WAVES]);
  const mean = (w: number) => blocks.filter((b) => b.wave === w).reduce((s, b) => s + b.edge, 0) / blocks.filter((b) => b.wave === w).length;
  assert.ok(mean(B.CORRUPT_WAVES[0]) < mean(B.CORRUPT_WAVES[1]) && mean(B.CORRUPT_WAVES[1]) < mean(B.CORRUPT_WAVES[2]), 'outward');
  for (const b of blocks) {
    assert.ok(b.c0 >= -7 && b.c1 <= 139 && b.r0 >= -2 && b.r1 <= 33, 'in the field');
    assert.ok(BB.stadiumDistance(b.cx, b.cy, clear) > 0, 'outside his clearing');
  }
  assert.deepEqual(BB.corruptBlocks({ ...clear }), blocks);
  assert.equal(BB.blockAt(blocks, blocks[0].c0, blocks[0].r0, blocks[0].wave - 1, clear, 500), null, 'not before its wave');
  assert.equal(BB.blockAt(blocks, blocks[0].c0, blocks[0].r0, blocks[0].wave, clear, blocks[0].edge - 1), null, 'not where the blue has not reached');
  assert.ok(BB.blockAt(blocks, blocks[0].c0, blocks[0].r0, blocks[0].wave, clear, blocks[0].edge + 1), 'printed once it has');
});

test('FW5, the anchor holds across both lines: his face front-on at (960, 540), full size, from the tape stop’s last frames through the bridge’s first beat; the crisp face at (960, 450), 440 px, from the corruption + 12 to the bridge’s end and on into outro 1.1 (H5) — at least 12 frames each side', () => {
  for (const f of range(S - 12, S + 24)) {
    const h = K.condense(f);
    assert.deepEqual([h.scale, h.cy], [1, 540], `${f}: his big face at the frame's centre`);
  }
  for (const f of range(B.CONDENSE_B.from + 12, END)) {
    const h = K.condense(f);
    assert.ok(Math.abs(h.scale - 0.4314) < 0.002 && Math.abs(h.cy - 450) < 0.5, `${f}: the crisp face's place`);
    assert.equal(h.crisp, 1);
  }
  const h5 = HANDOFFS.find((x) => x.frame === END - 1)!;
  const outro = HANDOFFS.find((x) => x.frame === OUTRO_START)!;
  assert.deepEqual([h5.width, h5.centre], [outro.width, outro.centre]);
  assert.ok(END - (B.CONDENSE_B.from + 12) >= 12);
});

test('the scene: drop 2’s crash shot on the bridge’s clocks, its look and lines; one segment, the bridge; a held picture’s shutter within half a frame and no phosphor tail', () => {
  const calls: string[] = [];
  const crash: Renderable = {
    init: async () => undefined,
    render: () => void calls.push('render'),
    look: (f) => K.crashLook(f),
    temporal: () => ({ samples: 16, shutter: 0.5, persistence: 2 }),
    screenOverlay: () => void calls.push('overlay'),
    dispose: () => void calls.push('dispose'),
  };
  const drop2: Renderable = { init: async () => void calls.push('init'), render: () => undefined, look: () => K.crashLook(S), dispose: () => void calls.push('drop2 dispose') };
  const scene = new BridgeBScene(() => drop2, () => crash);
  assert.deepEqual(scene.segment(), { from: S, to: END });
  const t = scene.temporal(S + 3);
  assert.deepEqual([t.samples, t.shutter, t.persistence], [16, 0.5, 0]);
  for (const s of temporalSamples(S + 1, t, scene.segment())) assert.ok(s.frame >= S && s.frame < END);
  assert.deepEqual(scene.look(B.FREEZE), K.crashLook(B.FREEZE));
  assert.equal(scene.look(END - 1).flash ?? 0, 0, 'never a white flash');
  void scene.init(null as never, { width: 1920, height: 1080 });
  scene.dispose();
  assert.deepEqual(calls, ['init', 'drop2 dispose']);
});

test('drop 2’s side: the bullet time’s last beat is its tape stop (the crash shot takes over only on its camera’s landing), and the crash clock carries across the line', () => {
  // On drop 2's last frame the bullet time's camera still reads before its landing; on the bridge's first the crash shot reads it.
  assert.ok(BB.bulletTimeAt(S - 1) < DRAIN.from && BB.bulletTimeAt(S - 1) > DRAIN.from - 0.1);
  assert.equal(BB.crashClockB(S), crashClock(DRAIN.from));
  assert.equal(BB.bulletTimeAt(PLATES.from - 3), PLATES.from - 3, 'as built before 20.4');
  assert.ok(BB.bulletTimeAt(partFrame('drop2', 20, 3.5)) < partFrame('drop2', 20, 3.5) - 2, 'slower over the last beat');
});
