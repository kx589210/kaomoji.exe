// E5 CURSOR (src/shots/outroCursor.ts): the ending's last beat is S01's frames −24 … −1 (U5b, the lead's ruling after review round 1: the
// █ lands on 5.4; r4 was the last two beats, −48 … −1), and the loop into frame 0 is one more beat (build sheet r4 §3.5, §4 OUT).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as O from '../src/score/outro.ts';
import { CURSOR_BLINKS } from '../src/score/intro.ts';
import { FRONT_DISTANCE, PHOSPHOR, introCamera, introLook, introTemporal, screenPower } from '../src/shots/intro.ts';
import * as K from '../src/shots/outroCompany.ts';
import * as U from '../src/shots/outroCursor.ts';
import { INK, TERM, cellCenter } from '../src/worlds/terminal.ts';

const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

test('U5b · the last beat is S01 at frames −24 … −1: its camera, its look, its sampling', () => {
  for (const f of range(O.SLAM.to, O.LOOP, 0.5)) {
    assert.deepEqual(U.cursorPose(f), introCamera(f - O.LOOP, [0, 0]));
    assert.deepEqual(U.cursorLook(Math.round(f)), introLook(Math.round(f) - O.LOOP));
  }
  assert.deepEqual(U.cursorTemporal(O.LOOP - 1), introTemporal(-1));
  assert.equal(U.s01Frame(O.SLAM.to), -24);
});

test('U1: the phosphor tail of the cursor’s first frames never reaches back across the landing (5.4) into the dive (it stacked the zooming █ into ghosts); from the landing + 4 on it is S01’s own', () => {
  for (const f of range(O.SLAM.to, O.SLAM.to + 8)) {
    const t = U.cursorTemporal(f);
    const open = f - t.shutter / 2;
    // (The shutter itself straddles the landing on its first frame, as at every seam of the ending; only the tail is kept out.)
    assert.ok(open - 3 * t.persistence >= Math.min(open, O.SLAM.to) - 1e-9, `${f}: the tail reaches ${open - 3 * t.persistence}`);
    if (f >= O.SLAM.to + 4) assert.deepEqual(t, introTemporal(f - O.LOOP));
  }
});

test('the cursor: S01’s blinks replayed from the landing (U5b: one, on 5.4; lit, then a phosphor fade τ 4), ≈ 0.29 on the last frame; the tube settles 1 → 0.15 so frame 0 (screenPower 0.15) carries on', () => {
  const s01 = CURSOR_BLINKS.map(([a, b]) => [a - CURSOR_BLINKS[0][0], b - CURSOR_BLINKS[0][0]]).filter(([a]) => a < O.LOOP - O.SLAM.to);
  assert.deepEqual(O.CURSOR.map(([a, b]) => [a - O.SLAM.to, b - O.SLAM.to]), s01);
  assert.equal(O.CURSOR.length, 1);
  assert.equal(U.cursorLevel(O.SLAM.to), 1);
  const [, end] = O.CURSOR.at(-1)!;
  assert.ok(Math.abs(U.cursorLevel(O.LOOP - 1) - Math.exp(-(O.LOOP - 1 - end) / PHOSPHOR)) < 1e-12);
  assert.ok(Math.abs(U.cursorLevel(O.LOOP - 1) - 0.29) < 0.04, `${U.cursorLevel(O.LOOP - 1)}`);
  assert.equal(U.outroPower(O.SETTLE.from), 1);
  assert.ok(Math.abs(U.outroPower(O.LOOP - 1) - screenPower(0)) < 1e-12, 'the last frame’s power is frame 0’s');
  for (const f of range(O.SETTLE.from, O.LOOP - 1)) assert.ok(U.outroPower(f + 1) <= U.outroPower(f));
  const g = U.cursorGlyph(O.SLAM.to)!;
  assert.deepEqual([g.ch, g.x, g.y, g.size], ['█', ...cellCenter(0, 0), TERM.fontPx]);
  assert.deepEqual(g.color, INK.green.map((c) => c * 1.1));
});

test('the seam from the slam: OutroCompany’s cursor on the landing (5.4) sits where OutroCursor draws S01’s, at the same scale and ink', () => {
  const zoom = (p: { position: readonly number[]; target: readonly number[] }) => FRONT_DISTANCE / (p.position[2] - p.target[2]);
  const pose = U.cursorPose(O.SLAM.to);
  const [cx, cy] = cellCenter(0, 0);
  const z = zoom(pose);
  const s01: [number, number] = [960 + (cx - pose.target[0]) * z, 540 - (cy - pose.target[1]) * z];
  const mine = K.onScreen(O.SLAM.to, K.CELL());
  assert.ok(Math.abs(mine[0] - s01[0]) < 1 && Math.abs(mine[1] - s01[1]) < 1, `${mine} vs ${s01}`);
  assert.ok(Math.abs(K.stageAim(O.SLAM.to).zoom - z) / z < 2e-3);
  const theirs = K.heroContent(O.SLAM.to - 1e-9, () => 0.6).cursor!;
  assert.ok(Math.abs(theirs.size - TERM.fontPx) < 1e-6, `${theirs.size}`);
  assert.deepEqual(theirs.color.map((c) => +c.toFixed(6)), INK.green.map((c) => +(c * 1.1).toFixed(6)));
});
