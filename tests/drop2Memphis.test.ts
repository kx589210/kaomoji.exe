// S31M MEMPHIS (drop2 14, builder act2b): the hand-offs (the voxel well's pieces and his block in, the pictograms' head disc out:
// voxelStateAt → memphisSolidsFrom, totemFaceAt), every drum's picture event (the landing, the slabs on the 16ths, the props on the 8ths, the
// panels' slams, the turn, the crane, the four ruler clicks), the set turning while he keeps facing us, the walls' cutaway, the colour law
// (red only Defender's firewall, amber only him and his infection), the grid snap landing exactly on the pictograms' first frame. Every
// frame from the score (src/score/drop2.ts), none hard-coded.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO2 } from '../src/content/drop2.ts';
import { linear } from '../src/engine/color.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { SWAP_LEAD } from '../src/engine/temporal.ts';
import * as D from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { voxelStateAt } from '../src/shots/drop2ArcadeVoxel.ts';
import {
  AICHER,
  BLOCK,
  CLICKS,
  FACE,
  GROOVE,
  INKS,
  MEM,
  PIECES,
  PANEL_IN,
  PLAN_ZOOM,
  PRECOOL,
  PROP_LAYOUT,
  SKY,
  WALLS_AWAY,
  basis,
  clickAt,
  coolAt,
  craneAt,
  dropHeight,
  groove,
  growFromCentre,
  growFromStart,
  heroBlock,
  inkAt,
  memphisCam,
  memphisFrame,
  memphisLook,
  memphisSegment,
  memphisSolidsFrom,
  memphisTemporal,
  panelIn,
  project,
  setAlpha,
  setTurn,
  slabPop,
  snapOverlay,
  totemFaceAt,
  wallStand,
} from '../src/shots/drop2Memphis.ts';
import { FIG, GROUND, HEAD_AT, type PictoLayout, inkKey, joinLayers, pictoFrame, scrollAt, trackLayers } from '../src/shots/drop2Picto.ts';
import { DROP2_PARTS, HANDOFFS, LAW, drop2Segment } from '../src/shots/drop2Shared.ts';
import { Drop2Scene } from '../src/scenes/drop2.ts';
import { Drop2Memphis } from '../src/scenes/drop2Memphis.ts';

const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
/** A stand-in for the browser's measurements (the ink boxes and the advances). */
const LAYOUT: PictoLayout = {
  advance: { rounded: () => 0.6, jp: () => 1, display: () => 0.6 },
  ink: new Map([HERO2.base, '(￣▽￣)', '(￣ω￣)'].map((t) => [inkKey('rounded', t), { left: 0, right: 0.6 * [...t].length, up: 0.4, down: 0.4 }])),
};

test('Memphis is drop2 14: the dispatcher sends the memphis row to Drop2Memphis (constructible in Node)', () => {
  assert.deepEqual(MEM, { from: at(14), to: at(15) });
  const row = DROP2_PARTS.find((p) => p.name === 'memphis')!;
  assert.deepEqual([row.from, row.to], [MEM.from, MEM.to]);
  const s = new Drop2Scene();
  assert.ok(s.byName.memphis instanceof Drop2Memphis);
  assert.doesNotThrow(() => new Drop2Memphis());
});

test('the hand-off in (HANDOFFS TOTEM): his face 600 px at (960, 420) on 14.1, held there through the bar until the crane', () => {
  const h = HANDOFFS.find((x) => x.frame === D.TOTEM)!;
  assert.equal(h.face, HERO2.base);
  for (const f of [D.TOTEM, D.TOTEM + 30, D.SET_ROTATE.to, D.CRANE_UP.from]) {
    const c = memphisCam(f);
    const [x, y] = project(c, heroBlock(f).face);
    near(x, h.centre[0], 0.5, `x on ${f}`);
    near(y, h.centre[1], 0.5, `y on ${f}`);
  }
  // His face is the block's front: 600 world px at zoom 1 (turned 10° for the block's side: within 2 %).
  const w = FACE.width * Math.cos(10 * (Math.PI / 180)) * memphisCam(D.TOTEM).zoom;
  near(w, h.width, 0.02 * h.width, 'width on 14.1');
  // The landing squash 1.12 / 0.88 on 14.1 (I), settled within 12 f.
  const s0 = heroBlock(D.TOTEM).squash;
  near(s0[0], 1.12, 1e-9, 'squash x');
  near(s0[1], 0.88, 1e-9, 'squash y');
  const s1 = heroBlock(D.TOTEM + 12).squash;
  assert.ok(Math.abs(s1[0] - 1) < 0.01);
});

test('the hand-off in from the voxel well (contract §6.3): every piece the well leaves becomes a Memphis solid where it was, flying into the totem one ring a 16th', () => {
  const state = voxelStateAt(D.TOTEM - 1);
  const solids = memphisSolidsFrom(state);
  assert.equal(solids.length, state.pieces.length);
  assert.deepEqual(PIECES, solids);
  const shape: Record<string, string> = { S: 'squiggle', Z: 'squiggle', O: 'box', T: 'prism', L: 'arch', J: 'arch', I: 'cylinder' };
  solids.forEach((s, i) => {
    assert.deepEqual(s.screen, state.pieces[i].centre);
    assert.equal(s.shape, shape[state.pieces[i].type]);
    assert.equal(s.arrive, D.SLABS[s.ring]);
  });
  // The pieces are drawn where the well left them on 14.1 (the morph lands without a jump).
  const fr = memphisFrame(D.TOTEM);
  const c = memphisCam(D.TOTEM);
  for (const p of solids) {
    const s = fr.solids.find((x) => x.id === `piece${p.id}`)!;
    if (p.ring === 0) continue;
    const [x, y] = project(c, s.pos);
    near(x, p.screen[0], 1, 'piece x');
    near(y, p.screen[1], 1, 'piece y');
  }
  // All gone into the totem by the last slab's 16th.
  assert.ok(memphisFrame(D.SLABS[3] + 3).solids.every((s) => !s.id.startsWith('piece')));
  // 14.1 is clean: no wall stands yet (they spring up on the second 16th with the slabs).
  for (const w of ['left', 'right', 'frontLeft', 'frontRight'] as const) assert.equal(wallStand(w, D.TOTEM), 0);
});

test('every drum of bar 14 has its picture: the slabs on the 16ths, the props on the 8ths, the panels on 14.2 and 14.2e, the turn on 14.3, the crane on 14.4, the ruler clicks', () => {
  // The slabs pop on SLABS (keyed one frame before: the beat frame already moves), 8 % over.
  D.SLABS.forEach((s) => {
    assert.equal(slabPop(s - 2, s), 0);
    assert.ok(slabPop(s, s) > 0.1, `slab on ${s}`);
    const peakPop = Math.max(...range(s, s + 12).map((f) => slabPop(f, s)));
    assert.ok(peakPop > 1.05 && peakPop < 1.11, `the boing: ${peakPop}`);
  });
  // The props land on their 8ths (I) and bounce twice.
  for (const p of PROP_LAYOUT) {
    assert.ok(D.PROPS.includes(p.at));
    assert.ok(dropHeight(p.at - 1, p.at) > 0);
    assert.equal(dropHeight(p.at, p.at), 0);
    const bounces = range(p.at + 1, p.at + 16).filter((f) => dropHeight(f, p.at) === 0 && dropHeight(f - 1, p.at) > 0);
    assert.equal(bounces.length, 2, `${p.id} bounces twice`);
  }
  // The firewall: each panel slams home on its beat.
  for (const f of D.PANELS) {
    assert.equal(panelIn(f, f), 1);
    assert.equal(panelIn(f - SWAP_LEAD, f), 1, 'home on the beat’s whole frame');
    assert.equal(panelIn(f - PANEL_IN - 1, f), 0);
    assert.ok(panelIn(f - 1, f) < 0.75, 'fastest into the beat');
    // A shutter (R10): it rolls down from its top edge inside its own footprint, never flying across the frame.
    const solid = (g: number) => memphisFrame(g).solids.find((x) => x.id === (f === D.PANELS[0] ? 'panelRight' : 'panelLeft'))!;
    const home = solid(f);
    const half = solid(f - 2);
    near(half.pos[0], home.pos[0], 1e-6, 'x');
    near(half.pos[2], home.pos[2], 1e-6, 'z');
    near(half.pos[1] + half.size[1] / 2, home.pos[1] + home.size[1] / 2, 1e-6, 'its top edge');
    assert.ok(half.size[1] < home.size[1]);
  }
  // The turn: a −4° anticipation, −90° exactly on 14.3.
  assert.equal(setTurn(D.SET_ROTATE.from - 4), 0);
  assert.ok(setTurn(D.SET_ROTATE.from) > 3.9);
  assert.equal(setTurn(D.SET_ROTATE.to), -90);
  // The crane leaves on 14.4 and lands in plan view on 15.1 − 1.
  assert.equal(craneAt(D.CRANE_UP.from), 0);
  assert.ok(craneAt(D.CRANE_UP.from + 1) > 0);
  assert.equal(craneAt(D.CRANE_UP.to - 1), 1);
  near(memphisCam(D.CRANE_UP.to - 1).pitch, Math.PI / 2, 1e-9, 'plan view');
  // The snap's four stages are the score's ruler 32nds one 32nd later (R4): three on the second … fourth ruler clicks, the last ON 15.1.
  const snap = [CLICKS.lines90, CLICKS.lines45, CLICKS.straighten, CLICKS.sheet];
  assert.equal(CLICKS.sheet, D.PICTO, 'the sheet slams in on 15.1');
  for (let k = 0; k < 3; k++) assert.equal(snap[k], D.GRID_SNAP[k + 1], `stage ${k + 1} on a ruler click`);
  for (let k = 1; k < 4; k++) assert.equal(snap[k] - snap[k - 1], D.GRID_SNAP[1] - D.GRID_SNAP[0], 'a 32nd apart');
  assert.equal(WALLS_AWAY, D.GRID_SNAP[0], 'the first ruler click: the walls are away');
  for (const c of snap.slice(0, 3)) {
    assert.equal(clickAt(c, c), 1);
    assert.ok(clickAt(c - 1, c) < 0.5);
  }
  // Every kick of the bar is one of those events.
  const events = new Set([D.TOTEM, D.PANELS[0], D.SET_ROTATE.to, D.CRANE_UP.from]);
  for (const k of D.KICKS2.filter((k) => k >= MEM.from && k < MEM.to)) assert.ok(events.has(k), `kick ${k}`);
  // And every clap, open hat and cowbell 8th: the slabs, the props, the panels, the laminate's start (14.1&), the infection (14.2&), the
  // turn, the groove's pumps after it, the crane, the ruler clicks.
  const all = new Set([...events, ...D.SLABS, ...D.PROPS, ...D.PANELS, MEM.from + 12, D.PANELS[0] + 12, ...GROOVE, WALLS_AWAY, ...snap]);
  const drums = [...D.CLAPS2, ...D.OPEN_HATS2, ...D.COWBELL2].filter((k) => k >= MEM.from && k < MEM.to);
  for (const k of drums) assert.ok(all.has(k), `drum ${k} (local ${k - D.DROP2_START})`);
  assert.deepEqual(GROOVE, D.COWBELL2.filter((c) => c >= D.SET_ROTATE.to && c < D.CRANE_UP.from));
  for (const g of GROOVE) assert.ok(groove(g, 0) > 0.05, 'the totem squashes on the pump');
});

test('the set turns, he does not: the turntable drags his block and he springs back to face us; the walls fold like a pop-up book', () => {
  const b0 = heroBlock(D.SET_ROTATE.from - 6);
  const b1 = heroBlock(D.SET_ROTATE.to + 18);
  near(b1.yaw, b0.yaw + (memphisCam(D.SET_ROTATE.to + 18).yaw - memphisCam(D.SET_ROTATE.from - 6).yaw), 0.01, 'his yaw follows the camera, not the set');
  // Before the turn the left and right walls stand; after, the left (with the lemon disc) still stands, the right has folded, the
  // hidden front-left wall has risen.
  const before = D.SET_ROTATE.from - 6;
  const after = D.SET_ROTATE.to + 6;
  assert.ok(wallStand('left', before) > 0.95 && wallStand('right', before) > 0.95);
  assert.equal(wallStand('frontLeft', before), 0);
  assert.ok(wallStand('left', after) > 0.95);
  assert.ok(wallStand('right', after) < 0.05);
  assert.ok(wallStand('frontLeft', after) > 0.95);
  // The panels became shelves: thin slabs jutting out at his sides.
  const panels = memphisFrame(after).solids.filter((s) => s.id.startsWith('panel'));
  assert.equal(panels.length, 2);
  for (const p of panels) assert.ok(p.size[1] < 60, `a shelf is thin: ${p.size[1]}`);
  // Everything folds away under the crane by the first ruler click.
  for (const w of ['left', 'right', 'frontLeft', 'frontRight'] as const) assert.equal(wallStand(w, WALLS_AWAY), 0);
});

test('the colour law: red is only Defender’s firewall (panels, shelves), amber only his block and his infection on that red', () => {
  for (const f of [D.TOTEM + 30, D.PANELS[1] + 6, D.SET_ROTATE.to + 6]) {
    for (const s of memphisFrame(f).solids) {
      if (s.ink === 'red') assert.ok(s.id.startsWith('panel'), `${s.id} is red`);
      assert.notEqual(s.ink, 'amber', `${s.id} is amber`);
      if (s.infect !== null) assert.equal(s.ink, 'red', 'only Defender’s red is infected');
    }
  }
  assert.equal(INKS.red, LAW.defender.print);
  assert.equal(INKS.amber, LAW.hero);
  // The lemon is clear of his amber (design: hue 54°), and the grid snap cools every ink to Aicher's.
  assert.notEqual(INKS.lemon, INKS.amber);
  assert.deepEqual(inkAt('white', 1), linear(AICHER.white));
  assert.deepEqual(inkAt('cobalt', 0), linear(INKS.cobalt));
});

test('the hand-off out (contract §6.3, HANDOFFS PICTO): plan view, his face the pictograms’ 200 px on the 240 px head disc at (960, 300), the floor their blue', () => {
  const last = D.PICTO - 1;
  const t = totemFaceAt(last);
  near(t.centre[0], HEAD_AT[0], 0.5, 'x');
  near(t.centre[1], HEAD_AT[1], 0.5, 'y');
  near(t.width, FIG.head, 0.5, 'head');
  near(t.face, FIG.face, 0.5, 'face');
  const h = HANDOFFS.find((x) => x.frame === D.PICTO)!;
  near(t.width, h.width, 0.5, 'HANDOFFS width');
  assert.equal(memphisCam(last).zoom, PLAN_ZOOM);
  assert.equal(BLOCK.w * PLAN_ZOOM, FIG.head);
  const fr = memphisFrame(last);
  // The floor is only tinted on 15.1 − 1 and turns their blue on the snap: the biggest change of the hand-off is the downbeat's (R4).
  assert.notDeepEqual(fr.floor.ink, GROUND, 'still tinted on 15.1 − 1');
  assert.deepEqual(memphisFrame(D.PICTO - SWAP_LEAD).floor.ink, GROUND);
  near(coolAt(last), PRECOOL, 1e-9, 'the first tint');
  assert.equal(coolAt(D.PICTO - SWAP_LEAD), 1);
  // The set holds whole through 15.1 − 1 and is gone on 15.1's instant (SWAP_LEAD early): a snap, no dissolve (R4).
  assert.equal(fr.alpha, 1, 'the set is whole on 15.1 − 1');
  assert.equal(setAlpha(D.PICTO - SWAP_LEAD), 0, 'gone on the snap');
  assert.equal(memphisFrame(D.PICTO - SWAP_LEAD).alpha, 0);
  for (const f of range(CLICKS.lines90 - 3, D.PICTO)) assert.equal(setAlpha(f), 1, `whole on ${f}`);
});

test('the grid snap draws the pictograms’ own sheet: its grid full length by 15.1 − 1, and on 15.1’s instant every lane, byte and figure of their first frame', () => {
  const last = D.PICTO - 1;
  const grid = snapOverlay(last, LAYOUT)!;
  const G0 = trackLayers(last, LAYOUT);
  const lines = [...G0.grid90.shapes, ...G0.grid45.shapes];
  assert.equal(grid.under.under.length, lines.length, 'on 15.1 − 1 the grid only: no lanes, no figures yet');
  assert.equal(grid.over.under.length, 0);
  grid.under.under.forEach((s, i) => {
    assert.equal(s.w, lines[i].w);
    assert.equal(s.x, lines[i].x);
  });
  // The snap (15.1, SWAP_LEAD early): everything at once, full length, as the pictograms draw it.
  const now = D.PICTO - SWAP_LEAD;
  const snap = snapOverlay(now, LAYOUT)!;
  const G = trackLayers(now, LAYOUT);
  const ground = [...G.grid90.shapes, ...G.grid45.shapes, ...G.lanes.shapes, ...G.start.shapes];
  assert.equal(snap.under.under.length, ground.length);
  snap.under.under.forEach((s, i) => {
    assert.equal(s.w, ground[i].w);
    assert.equal(s.x, ground[i].x);
  });
  // The grid is white by then (drawn #111 on the white floor, turning white as the palette cools).
  for (const s of snap.under.under.slice(0, G.grid90.shapes.length)) assert.deepEqual(s.color.map((v) => Math.round(v * 1e6) / 1e6), [1, 1, 1]);
  // The figures: the red athlete and him, full length, as the pictograms draw them (his head their disc, landing in its stomp).
  assert.deepEqual(snap.over.under, [...G.red.shapes, ...G.hero.shapes]);
  assert.ok(snap.over.under.some((s) => s.kind === 'ellipse'), 'his head is their disc');
  // Before the clicks there is nothing of it.
  assert.equal(snapOverlay(CLICKS.lines90 - 4, LAYOUT), null);
  // The world already streams (the pictograms' run-up): their first frame continues the motion at 40 px a frame.
  near(scrollAt(D.PICTO) - scrollAt(D.PICTO - 1), 40, 2.5, 'the run-up speed');
  assert.equal(scrollAt(D.PICTO), 0);
  // And their first frame is drawn from the same layers.
  const first = pictoFrame(D.PICTO, LAYOUT);
  assert.equal(first.mode, 'track');
  if (first.mode === 'track') assert.equal(first.content.under.length, joinLayers(trackLayers(D.PICTO, LAYOUT)).under.length);
});

test('growing a line or a limb: from its centre (lines) and from its joint (limbs) — full length at 1, its first end fixed', () => {
  const s: Shape = { kind: 'segment', x: 10, y: 20, w: 110, h: 10, rot: 0.7, color: [1, 1, 1] };
  assert.deepEqual(growFromCentre(s, 1), s);
  assert.equal(growFromCentre(s, 0.5).w, 60);
  const g = growFromStart(s, 0.25);
  const a = (q: Shape) => [q.x - ((q.w - q.h) / 2) * Math.cos(q.rot ?? 0), q.y - ((q.w - q.h) / 2) * Math.sin(q.rot ?? 0)];
  const [ax, ay] = a(s);
  const [bx, by] = a({ ...s, ...g, rot: s.rot });
  near(ax, bx, 1e-9, 'start x');
  near(ay, by, 1e-9, 'start y');
  assert.equal(g.w, 0.25 * 100 + 10);
});

test('photography: 32 sub-frames on the landing, the slams, the turn and the crane; a flat print; drop 2’s segments (no cut here)', () => {
  assert.equal(memphisTemporal(D.TOTEM).samples, 32);
  for (const p of D.PANELS) assert.equal(memphisTemporal(p).samples, 32);
  for (const f of range(D.SET_ROTATE.from - 4, D.SET_ROTATE.to + 4)) assert.equal(memphisTemporal(f).samples, 32);
  for (const f of range(D.CRANE_UP.from, D.PICTO)) assert.equal(memphisTemporal(f).samples, 32);
  const L = memphisLook(D.TOTEM);
  assert.equal(L.bloom.intensity, 0);
  assert.equal(L.vignette, 0);
  for (const f of [D.TOTEM, D.PICTO - 1]) assert.deepEqual(memphisSegment(f), drop2Segment(f));
  // The camera never holds still (the iso drift, the turn, the crane): the frame's centre moves every frame.
  for (const f of range(MEM.from + 1, MEM.to)) {
    const [c0, c1] = [memphisCam(f - 1), memphisCam(f)];
    const p = [500, 0, 500] as const;
    const moved = Math.hypot(project(c0, p)[0] - project(c1, p)[0], project(c0, p)[1] - project(c1, p)[1]);
    assert.ok(moved > 0.02 || f === MEM.from, `the camera is still on ${f}`);
  }
  // The camera's basis is orthonormal at every pitch (plan view included).
  for (const f of [D.TOTEM, D.CRANE_UP.from + 12, D.PICTO - 1]) {
    const b = basis(memphisCam(f).pitch, memphisCam(f).yaw);
    const dot = (u: readonly number[], v: readonly number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    near(dot(b.right, b.up), 0, 1e-12, 'right·up');
    near(dot(b.up, b.back), 0, 1e-12, 'up·back');
    near(dot(b.back, b.back), 1, 1e-12, '|back|');
  }
});

// ——— Continuity plan v07, seam 4800 (WP3): Memphis → the pictograms ————————————————————————————————————————————————————————————

test('v07 seam 4800, the sky ramps in before the line: from the 45° click the floor turns toward the pictograms’ blue, PRECOOL of the way by 15.1 − 1 in steps of at most 0.2 a frame, the last of it on the snap (still the frame’s biggest)', () => {
  assert.deepEqual(SKY, { from: CLICKS.lines45 - 1, to: D.PICTO - 1 });
  for (const f of range(MEM.from, SKY.from + 1)) assert.equal(coolAt(f), 0, `${f}: white until the 45° click`);
  let prev = 0;
  let step = 0;
  for (const f of range(SKY.from, D.PICTO)) {
    const c = coolAt(f);
    assert.ok(c >= prev, `${f}: it only cools`);
    step = Math.max(step, c - prev);
    prev = c;
  }
  near(coolAt(D.PICTO - 1), PRECOOL, 1e-9, 'on 15.1 − 1');
  assert.ok(PRECOOL >= 0.75, 'most of the blue before the line');
  assert.ok(step <= 0.2 + 1e-9, `a ramp, not a cut (${step.toFixed(3)} a frame)`);
  // The snap's own step (the rest of the blue, with the sheet, the lanes and the figures) is bigger than any frame of the ramp.
  assert.ok(1 - PRECOOL >= step - 1e-9, 'the downbeat keeps a step of its own');
  assert.equal(coolAt(D.PICTO - SWAP_LEAD), 1);
});

test('v07 seam 4800, the anchor: his face block becomes the head disc in place (centre and size), and his head holds within 40 px of it for 12 frames across the line (some 12-frame window holding 15.1 − 1 and 15.1)', () => {
  const t = totemFaceAt(D.PICTO - 1);
  near(t.centre[0], HEAD_AT[0], 0.5, 'x');
  near(t.centre[1], HEAD_AT[1], 0.5, 'y');
  near(t.width, FIG.head, 0.5, 'size');
  const head = (f: number): [number, number] => {
    if (f < D.PICTO) return totemFaceAt(f).centre;
    // The pictograms' head disc as drawn (the stomp scales it about the feet).
    const s = trackLayers(f, LAYOUT).hero.shapes.find((x) => x.kind === 'ellipse')!;
    return [s.x + 960, 540 - s.y];
  };
  // Some 12-frame window across the line (holding 15.1 − 1 and 15.1) keeps his head within 40 px (the crane carries the block up into
  // place before it, his run bobs him after it).
  const span = (from: number): number => {
    const ps = range(from, from + 12).map(head);
    return Math.max(...ps.map((p) => Math.hypot(p[0] - ps[0][0], p[1] - ps[0][1])), ...ps.flatMap((p) => ps.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))));
  };
  const best = Math.min(...range(D.PICTO - 11, D.PICTO).map(span));
  assert.ok(best <= 40, `the head moves ${best.toFixed(1)} px in the stillest 12 frames across the line`);
});
