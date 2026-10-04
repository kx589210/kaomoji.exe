// S31P PICTOGRAMS (drop2 15, builder act2b): the Aicher rig (one stroke, every limb on a 45° step, a quantum a 16th), the hand-offs (the
// crane lands on his head disc; the contact sheet's 130 px head; the tube's push to the kaleidoscope's 520 px), touché — Defender
// re-infected on the clap — the world roll in four 45° snaps on the drumline's 16ths with him upright, the sheet's eight flops, the hinge
// into an eight-mirror tube and its light, the run-up before 15.1 that the Memphis grid snap draws. Every frame from the score.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUEST, GUEST_INFECTED } from '../src/content/castDrop2.ts';
import { HERO2, SIGNATURE } from '../src/content/drop2.ts';
import { SWAP_LEAD } from '../src/engine/temporal.ts';
import * as D from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { HERO_WIDTH } from '../src/shots/drop2Kaleido.ts';
import {
  BAR,
  DRUMS,
  FACES,
  FIG,
  HEAD_AT,
  HERO_KEYS,
  PIC,
  POSES,
  type PictoLayout,
  RED_KEYS,
  RUN_UP,
  SHEET_HEAD,
  TILE_ANGLES,
  TRACK,
  TRACK_ORDER,
  barBend,
  foldAt,
  heroLimbs,
  inkKey,
  landing,
  joinLayers,
  pictoFrame,
  pictoSegment,
  pictoTemporal,
  poseAt,
  redFace,
  rig,
  rollAt,
  scrollAt,
  trackLayers,
  tubeCamera,
  tubeLight,
  tubeWhite,
  wallsAt,
} from '../src/shots/drop2Picto.ts';
import { DROP2_PARTS, HANDOFFS, drop2Segment } from '../src/shots/drop2Shared.ts';
import { Drop2Scene } from '../src/scenes/drop2.ts';
import { Drop2Picto } from '../src/scenes/drop2Picto.ts';

const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
const DEG = 180 / Math.PI;
const LAYOUT: PictoLayout = {
  advance: { rounded: () => 0.6, jp: () => 1, display: () => 0.6 },
  ink: new Map([HERO2.base, GUEST.face, GUEST_INFECTED.face].map((t) => [inkKey('rounded', t), { left: 0, right: 0.6 * [...t].length, up: 0.4, down: 0.4 }])),
};

test('the pictograms are drop2 15: the dispatcher sends the picto row to Drop2Picto (constructible in Node)', () => {
  assert.deepEqual(PIC, { from: at(15), to: at(16) });
  const row = DROP2_PARTS.find((p) => p.name === 'picto')!;
  assert.deepEqual([row.from, row.to], [PIC.from, PIC.to]);
  assert.ok(new Drop2Scene().byName.picto instanceof Drop2Picto);
});

test('the Aicher rig: every limb of every pose on a 45° step; his head 240 (face 200) at (960, 300) on 15.1; the figure 880 px tall', () => {
  for (const [name, p] of Object.entries(POSES)) for (const a of [p.torso, ...p.armF, ...p.armB, ...p.legF, ...p.legB]) assert.equal(Math.abs(a % 45), 0, `${name}: ${a}°`);
  const h = HANDOFFS.find((x) => x.frame === D.PICTO)!;
  assert.deepEqual(HEAD_AT, h.centre);
  assert.equal(FIG.head, h.width);
  assert.equal(FIG.face, 200);
  assert.deepEqual(heroLimbs(D.PICTO).head, [...HEAD_AT]);
  const r = rig(POSES.stand, HEAD_AT, 1, 1);
  const toe = Math.max(...r.joints.map((j) => Math.max(j.a[1], j.b[1]) + j.w / 2));
  near(toe - (HEAD_AT[1] - FIG.head / 2), 880, 12, 'head top to toe');
  assert.deepEqual(FACES, { hero: HERO2.base, defender: [GUEST.face, GUEST_INFECTED.face] });
});

test('a pose change turns each limb one 45° quantum a 16th (a 4-frame snap, 6° over), settled on its 16th', () => {
  const garde = HERO_KEYS.find((k) => k.pose === 'garde')!;
  for (let k = 0; k < 4; k++) {
    const p = poseAt(HERO_KEYS, garde.at + 6 * k + 4).pose;
    for (const a of [p.torso, ...p.armF, ...p.armB, ...p.legF, ...p.legB]) near(((a % 45) + 45) % 45, 0, 1e-9, `settled on a 45° step at + ${6 * k + 4}`);
  }
});

test('touché on the clap (15.2): Defender’s athlete (￣▽￣) → (￣ω￣), re-infected on screen; it is beaten from the next frame', () => {
  assert.equal(redFace(D.TOUCHE - 1), GUEST.face);
  assert.equal(redFace(D.TOUCHE), GUEST_INFECTED.face);
  assert.ok(RED_KEYS.some((k) => k.pose === 'beaten' && k.at === D.TOUCHE + 1));
  assert.ok(HERO_KEYS.some((k) => k.pose === 'lunge' && k.at <= D.TOUCHE && k.at >= D.TOUCHE - 3));
});

test('the flop: the world rolls round him in four 45° snaps on the drumline’s 16ths (2 f each, 6° over), 180° held, back to 0 under the sheet', () => {
  assert.deepEqual(D.WORLD_ROLL.filter((f) => !DRUMS.drumline.includes(f)), []);
  assert.equal(rollAt(D.WORLD_ROLL[0]), 0);
  D.WORLD_ROLL.forEach((f, k) => {
    near(rollAt(f + 2) * DEG, 45 * k + 51, 1e-9, `the snap's overshoot ${k}`);
    near(rollAt(f + 4) * DEG, 45 * (k + 1), 1e-9, `settled ${k}`);
  });
  for (const f of range(D.WORLD_ROLL[3] + 4, D.SHEET)) near(rollAt(f) * DEG, 180, 1e-9, 'held');
  assert.equal(rollAt(D.SHEET), 0);
  // He stays upright through it (his limbs are never rolled), and the bar bends into an amber ω as the roll lands.
  assert.deepEqual(heroLimbs(D.WORLD_ROLL[2]).head, heroLimbs(D.WORLD_ROLL[2]).head);
  assert.equal(barBend(D.WORLD_ROLL[3]), 0);
  assert.equal(barBend(D.WORLD_ROLL[3] + 4), 1);
  assert.ok(BAR.x1 > BAR.x0);
});

test('every kick of bar 15 has its picture (land, touché, roll, sheet); the lanes carry the signature’s bytes', () => {
  const events = [D.PICTO, D.TOUCHE, D.WORLD_ROLL[0], D.SHEET];
  assert.deepEqual(DRUMS.kicks, events);
  assert.equal(TRACK.lanes, SIGNATURE.lanes.length);
  const G = trackLayers(D.PICTO, LAYOUT);
  assert.equal(G.start.display.map((g) => g.ch).join(''), SIGNATURE.lanes.join(''));
  // The layers join back into the bar's flat content in their order.
  const f = pictoFrame(D.PICTO + 30, LAYOUT);
  assert.equal(f.mode, 'track');
  if (f.mode === 'track') assert.deepEqual(f.content, joinLayers(trackLayers(D.PICTO + 30, LAYOUT), TRACK_ORDER));
});

test('the landing on 15.1 (R4): the lanes settle into register in one frame, the figures stomp and settle by + 6; nothing of it before the snap', () => {
  const at = D.PICTO;
  // Before the snap's instant (SWAP_LEAD early) nothing lands.
  assert.deepEqual(landing(at - SWAP_LEAD - 0.01), { spread: 0, stomp: 0 });
  // On 15.1: the lines a little wide, the figures low and large; home on + 1 (lines) and by + 6 (figures).
  const l0 = landing(at);
  assert.ok(l0.spread > 0.03 && l0.stomp === 1);
  assert.equal(landing(at + 1).spread, 0);
  for (const f of range(at + 6, at + 12)) assert.ok(Math.abs(landing(f).stomp) < 0.06, `settled on ${f - at}`);
  // The geometry: on the snap his head is lower and his disc squashed wide; settled by + 9; the lanes wider about the centre than on + 1.
  const head = (f: number) => trackLayers(f, LAYOUT).hero.shapes.find((s) => s.kind === 'ellipse')!;
  assert.ok(head(at).y < head(at + 9).y - 30, 'his head dips on the stomp (world y up)');
  assert.ok(head(at).w > FIG.head && head(at).h < FIG.head, 'squashed wide');
  near(head(at + 9).w, FIG.head, 1e-6, 'settled');
  const lanes = (f: number) => trackLayers(f, LAYOUT).lanes.shapes.filter((s) => s.h < 8 && Math.abs(s.rot ?? 0) < 1e-6);
  const spanOf = (f: number) => Math.max(...lanes(f).map((s) => s.y)) - Math.min(...lanes(f).map((s) => s.y));
  assert.ok(spanOf(at) > spanOf(at + 1) * 1.02, 'the lanes snap in from a little wide');
});

test('the run-up: before 15.1 the world already streams, from rest to the sprint’s 40 px a frame over RUN_UP frames (the Memphis grid snap draws it)', () => {
  assert.equal(scrollAt(D.PICTO - RUN_UP - 10), -20 * RUN_UP);
  assert.equal(scrollAt(D.PICTO), 0);
  near(scrollAt(D.PICTO) - scrollAt(D.PICTO - 0.01), 0.4, 0.01, 'into 15.1 at 40 px a frame');
  near(scrollAt(D.PICTO + 0.01) - scrollAt(D.PICTO), 0.4, 0.01, 'out of 15.1 at 40 px a frame');
  for (const f of range(D.PICTO - RUN_UP, D.PICTO + 1)) assert.ok(scrollAt(f) >= scrollAt(f - 1), 'never backwards');
});

test('the contact sheet (15.4): his flop at 0°…315° on the eight outer tiles, him upright in the centre, head 130 (HANDOFFS SHEET)', () => {
  assert.deepEqual(TILE_ANGLES.map((t) => t.deg), [0, 45, 90, 135, 180, 225, 270, 315]);
  assert.equal(new Set(TILE_ANGLES.map((t) => `${t.col},${t.row}`)).size, 8);
  assert.ok(!TILE_ANGLES.some((t) => t.col === 1 && t.row === 1));
  const h = HANDOFFS.find((x) => x.frame === D.SHEET)!;
  assert.equal(SHEET_HEAD, h.width);
  assert.equal(pictoFrame(D.SHEET, LAYOUT).mode, 'sheet');
});

test('the hinge (15.4& → 16.1): the eight tiles fold into the tube by 16.1 − 1, the push lands his head at the kaleidoscope’s 520 px, the light fills the end', () => {
  assert.equal(pictoFrame(D.HINGE.from, LAYOUT).mode, 'tube');
  for (let i = 0; i < 8; i++) {
    assert.equal(foldAt(D.HINGE.to - 1, i), 1, `tile ${i} folded`);
    assert.ok(foldAt(D.HINGE.from, i) < 0.05);
  }
  const walls = wallsAt(D.HINGE.to - 1);
  assert.equal(walls.length, 8);
  for (const w of walls) assert.ok(w.corners.every((c) => c[2] >= -1e-9), 'the walls stand toward the camera');
  near(tubeCamera(D.HINGE.to).head, HERO_WIDTH, 1, 'the push hands the kaleidoscope his 520 px');
  assert.equal(tubeLight(D.HINGE.from - 1), 0);
  assert.equal(tubeLight(D.HINGE.to), 1);
  for (const f of range(D.HINGE.from, D.HINGE.to)) assert.ok(tubeLight(f + 1) >= tubeLight(f), 'the light only grows');
  // An impact lands on its beat (review 2026-10-02, check-sync 16.1 'miss −2'): the light gathers but holds back (≤ 0.55 on 16.1 − 1, his
  // face still legible), so the white's step on 16.1 is the push's biggest change, not the frames before it.
  assert.ok(tubeLight(D.HINGE.to - 1) <= 0.55, `16.1 − 1 holds back: ${tubeLight(D.HINGE.to - 1).toFixed(2)}`);
  assert.ok(tubeLight(D.HINGE.to - 1) >= 0.4, 'but the light has gathered');
  const steps = range(D.HINGE.from, D.HINGE.to - 1).map((f) => tubeLight(f + 1) - tubeLight(f));
  assert.ok(1 - tubeLight(D.HINGE.to - 1) > 4 * Math.max(...steps), 'the step onto 16.1 dwarfs every step before it');
  // The light strikes half a shutter early: 16.1 − 1's shutter is untouched, 16.1's whole shutter is white.
  assert.equal(tubeWhite(D.HINGE.to - 1 + 0.25), 0);
  assert.equal(tubeWhite(D.HINGE.to - 0.25), 1);
});

test('photography: 48 sub-frames under the roll and the hinge, 32 on the sprint and the touché; drop 2’s segments', () => {
  for (const f of range(D.WORLD_ROLL[0], D.WORLD_ROLL[3] + 5)) assert.equal(pictoTemporal(f).samples, 48);
  for (const f of range(D.HINGE.from - 1, D.HINGE.to)) assert.equal(pictoTemporal(f).samples, 48);
  assert.equal(pictoTemporal(D.PICTO).samples, 32);
  assert.equal(pictoTemporal(D.TOUCHE).samples, 32);
  for (const f of [D.PICTO, D.SHEET, D.HINGE.to - 1]) assert.deepEqual(pictoSegment(f), drop2Segment(f));
});
