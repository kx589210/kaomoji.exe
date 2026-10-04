// S31E 8-BIT and S31V VOXEL (drop2 12–13, builder A · ARCADE+VOXEL): the formation is his signature in binary and the wave's spray lands
// on it (formationFromSpray ∘ sprayAt), shooting him makes more of him (27 → ≈ 74), every 8th has a picture event, the mothership meets
// HANDOFFS, the game pixels sit on the 6 px grid, voxelFrom stands every pixel up where it was (nothing jumps on 13.1), the well's
// pieces are real tetrominoes, his ghost portrait locks cyan, the four-line clear, voxelStateAt's hand-off to Memphis, the camera's
// tilt (75 % by + 6, settled by + 20) and isometric landing. Every frame from the score.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as D from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { ARCADE_SPAN, COPIES, SIGNATURE_CELLS, arcadeAt, arcadeLook, arcadeTemporal, boltsAt, copiesAt, formationFromSpray, hudLines, marchAt, mothershipAt, rippleAt, scoreAt } from '../src/shots/drop2Arcade.ts';
import { GP, HERO_BITMAP, MOTHERSHIP, SIGNATURE_BITS, pixelTextCovers } from '../src/shots/drop2ArcadeSprites.ts';
import { CLEARED, DIORAMA, GHOST, INVADER_CELLS, I_PIECE, PIECES, VOXEL, WELL_GRID, arcadeCam, burstAt, camPose, floorReach, ghostAt, mothershipCubes, mothershipScreen, project, voxelCam, voxelFrame, voxelFrom, voxelStateAt, voxelTemporal, wellAt } from '../src/shots/drop2ArcadeVoxel.ts';
import { HANDOFFS } from '../src/shots/drop2Shared.ts';
import { FOV, FRONT } from '../src/shots/swiss.ts';
import { sprayAt } from '../src/shots/drop2Wave.ts';
import { Drop2Arcade } from '../src/scenes/drop2Arcade.ts';
import { Drop2Voxel } from '../src/scenes/drop2Voxel.ts';
import { Drop2Scene } from '../src/scenes/drop2.ts';

const at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number): number[] => Array.from({ length: b - a }, (_, i) => a + i);

test('the arcade is drop2 12, the voxel well drop2 13; one renderer draws both (the tilt is a camera move), dispatched under both part names', () => {
  assert.deepEqual(ARCADE_SPAN, { from: at(12), to: at(13) });
  assert.deepEqual(VOXEL, { from: at(13), to: at(14) });
  const s = new Drop2Scene();
  assert.ok(s.byName.arcade instanceof Drop2Arcade);
  assert.ok(s.byName.voxel instanceof Drop2Voxel && s.byName.voxel instanceof Drop2Arcade);
});

test('the formation is his signature in binary: 27 copies, column k = byte k, rows bit 7 → 0; the wave’s last game pixels are exactly those cells (formationFromSpray ∘ sprayAt)', () => {
  assert.equal(SIGNATURE_CELLS.length, 27);
  const bytes = ['E2', '80', 'A2', '20', 'CF', '89', '20', 'E2', '80', 'A2'];
  for (let c = 0; c < 10; c++) {
    const v = SIGNATURE_BITS.reduce((acc, row, r) => acc | ((row[c] ? 1 : 0) << (7 - r)), 0);
    assert.equal(v.toString(16).toUpperCase().padStart(2, '0'), bytes[c]);
  }
  const fromSpray = formationFromSpray(sprayAt(D.ARCADE.from - 1));
  assert.deepEqual(fromSpray, [...SIGNATURE_CELLS].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  assert.equal(copiesAt(D.ARCADE.from).length, 27, 'the 27 on 12.1');
});

test('shooting him makes more of him: each hit on SPLITS grows the formation, ≈ 74 of the 80 cells by 12.4&; every new copy pops from a neighbour into a free cell', () => {
  const n = (f: number) => copiesAt(f).length;
  assert.equal(n(D.SPLITS[0] - 1), 27);
  assert.equal(n(D.SPLITS[0]), 28);
  for (let i = 1; i < D.SPLITS.length; i++) assert.ok(n(D.SPLITS[i]) > n(D.SPLITS[i - 1]));
  assert.ok(n(D.ARCADE.to - 1) >= 70 && n(D.ARCADE.to - 1) <= 80);
  const cells = new Set(COPIES.map((k) => `${k.c},${k.r}`));
  assert.equal(cells.size, COPIES.length, 'no cell twice');
  for (const k of COPIES.filter((q) => q.from)) assert.equal(Math.abs(k.c - k.from![0]) + Math.abs(k.r - k.from![1]), 1);
  // Defender's bolts fly on the &s and reach their copy on the split 12 frames later.
  for (const p of D.PEWS) {
    assert.equal(boltsAt(p - 1).length, 0);
    assert.equal(boltsAt(p).length, 1);
  }
});

test('every 8th of bar 12 has a picture event: the march steps (quarters, then 8ths, then 16ths), the pews, the splits, the dive, the stomp, the invasion', () => {
  const sig = (f: number) => JSON.stringify(arcadeAt(f).px.map((p) => [p.x, p.y, p.s, p.ink]));
  // 12.1 is the arcade's arrival itself (the scan line's wipe lands it); every later 8th changes the picture inside the arcade.
  for (const f of range(1, 8).map((k) => D.ARCADE.from + 12 * k)) assert.notEqual(sig(f), sig(f - 1), `${f - D.DROP2_START} changes on its 8th`);
  assert.equal(marchAt(D.ARCADE.from).step, 0);
  for (const m of D.MARCH_NOTES.filter((x) => x < D.ARCADE.to)) assert.notDeepEqual(marchAt(m), marchAt(m - 1), `march ${m - D.DROP2_START}`);
});

test('the mothership (him) meets HANDOFFS on 12.1 — 546 px at (960, 230), amber — dives on 12.3&, lands flat on the cannon on 12.4, and is back up by 13.1', () => {
  const row = HANDOFFS.find((r) => r.frame === D.ARCADE.from)!;
  const ms = mothershipAt(D.ARCADE.from);
  assert.deepEqual([Math.round(ms.cx), Math.round(ms.cy)], [...row.centre]);
  assert.equal(HERO_BITMAP[0].length * MOTHERSHIP.px, row.width);
  const amber = arcadeAt(D.ARCADE.from).px.filter((p) => p.ink === 'amber');
  const xs = amber.map((p) => p.x);
  assert.equal(Math.max(...xs) + amber[0].s - Math.min(...xs), 546);
  assert.ok(mothershipAt(D.STOMP).sy < 0.6, 'a pancake on the stomp');
  assert.ok(mothershipAt(D.DIVE + 6).cy > mothershipAt(D.DIVE).cy + 100, 'diving');
  assert.ok(Math.hypot(mothershipAt(D.ARCADE.to - 1).cx - 960, mothershipAt(D.ARCADE.to - 1).cy - 230) < 40, 'back up');
});

test('the arcade is drawn on the 6 px game grid, and voxelFrom stands every one of its pixels up where it was (13.1: nothing jumps)', () => {
  // Everything but the hovering mothership (R9: he hovers off the grid, the 6 px pass averages his edges) sits on the grid.
  for (const f of [D.ARCADE.from, at(12, 2.5), D.STOMP, D.ARCADE.to - 1]) for (const p of arcadeAt(f).px) {
    if (p.ink === 'amber' && f < D.DIVE - 4) continue;
    assert.equal(p.x % GP, 0);
    assert.equal(p.y % GP, 0);
  }
  const last = arcadeAt(D.ARCADE.to - 1);
  const cubes = voxelFrom(last, 0);
  assert.equal(cubes.length, last.px.length);
  last.px.forEach((p, i) => {
    assert.equal(cubes[i].x, p.x + p.s / 2 - 960);
    assert.equal(cubes[i].y, 540 - (p.y + (p.h ?? p.s) / 2));
    assert.equal(cubes[i].sz, 0);
  });
  // The voxel bar's first frame is the arcade's last picture, flat (its cubes 0 deep, the frontal camera), and he is where he was.
  const v0 = voxelFrame(VOXEL.from);
  assert.ok(v0.cubes.every((c) => c.sz < 0.02), 'flat on 13.1');
  // Round 2 (R2-05): bar 12 has its own camera now — frontal on 12.1, pushing and tilting a little through the bar — and 13.1's tilt
  // starts exactly where it ends; so the arcade's last picture and the voxel's first are seen through the same camera.
  const c0 = arcadeCam(D.ARCADE.from);
  assert.ok(c0.pitch === 0 && c0.yaw === 0 && c0.dist === FRONT && c0.fov === FOV && c0.pivot.every((v) => Math.abs(v) < 1e-9), 'frontal on 12.1');
  assert.deepEqual(voxelCam(VOXEL.from), arcadeCam(VOXEL.from));
  const cam = voxelCam(VOXEL.from);
  const amber = last.px.filter((p) => p.ink === 'amber');
  const hero = mothershipCubes(VOXEL.from);
  assert.equal(hero.length, amber.length);
  amber.forEach((p, i) => {
    const [sx, sy] = project(cam, [hero[i].x, hero[i].y, hero[i].z]);
    const [ax, ay] = project(cam, [p.x + p.s / 2 - 960, 540 - (p.y + (p.h ?? p.s) / 2), 0]);
    // ≤ 6 px: the arcade's pixels lie on the playfield the camera now looks down on (4.5°), his voxel cubes face the lens (a keystone of
    // a few px across his 378 px height), on the frame the tilt launches from.
    assert.ok(Math.abs(sx - ax) <= 6 && Math.abs(sy - ay) <= 6, `hero pixel ${i}: (${sx.toFixed(1)}, ${sy.toFixed(1)}) vs (${ax.toFixed(1)}, ${ay.toFixed(1)})`);
  });
  // No motion blur on stepped pixel art (one sample) but the mothership's flight.
  assert.equal(arcadeTemporal(D.ARCADE.from).samples, 1);
  assert.ok(arcadeTemporal(D.DIVE + 2).samples >= 16);
});

// Ruling (builder A, 2026-10-02): the sheet's tilt to pitch 50° / yaw 30° looked down the table from its far end, so the stack (and his
// face in it, the bar's payoff) sat small and foreshortened at the back of the frame; the tilt lands on a 3/4 diorama instead (pitch 26°,
// yaw 20°) with the whole well in frame. Same timing (75 % by + 6, settled by + 20), same isometric landing.
test('the tilt: pitch 0 → 22°, yaw 0 → 20° (the diorama), 75 % by + 6, settled by + 20; 64 sub-frames on it and on the burst; then the morph lands isometric (35.26° / 45°, a near-orthographic lens)', () => {
  // From where the arcade's camera left it (R2-05: arcadeCam ends pitched 4.5°).
  const p0 = arcadeCam(VOXEL.from).pitch;
  const p = (f: number) => (voxelCam(f).pitch - p0) / (DIORAMA.pitch - p0);
  assert.equal(p(VOXEL.from), 0);
  assert.ok(p(VOXEL.from + 6) >= 0.75, `75 % by + 6: ${p(VOXEL.from + 6)}`);
  assert.ok(Math.abs(p(VOXEL.from + 20) - 1) < 1e-6);
  for (const f of range(VOXEL.from, VOXEL.from + 12)) assert.equal(voxelTemporal(f).samples, 64);
  for (const f of range(D.LINE_CLEAR + 4, D.LINE_CLEAR + 12)) assert.equal(voxelTemporal(f).samples, 64);
  const iso = voxelCam(VOXEL.to - 0.25);
  assert.ok(Math.abs((iso.pitch * 180) / Math.PI - 35.264) < 0.01);
  assert.ok(Math.abs((iso.yaw * 180) / Math.PI - 45) < 0.01);
  assert.ok(iso.fov < 2);
});

test('the well: the pieces are real tetrominoes tiling his face’s rows 5–12 (column 10 open), the I-piece drops down column 10; the ghost portrait locks cyan', () => {
  const shapes = PIECES.filter((p) => p !== I_PIECE);
  for (const p of shapes) assert.equal(p.cells.length, 4);
  const cells = new Set(shapes.flatMap((p) => p.cells.map(([c, r]) => `${c},${r}`)));
  for (let r = 4; r < 12; r++) for (let c = 0; c < 20; c++) assert.equal(cells.has(`${c},${r}`), c !== WELL_GRID.gapCol, `cell ${c},${r}`);
  const I = I_PIECE;
  assert.equal(I.type, 'I');
  // Only the last piece is the column-10 I; the bands' own I-pieces lock in their bands (white or cyan by his portrait).
  for (const p of PIECES.filter((q) => q !== I_PIECE && q.type === 'I')) assert.ok(p.cells.every(([c, r]) => c !== WELL_GRID.gapCol && r >= 4));
  assert.ok(I.cells.every(([c]) => c === WELL_GRID.gapCol));
  assert.equal(I.drop, D.HARD_DROPS[4]);
  // Pieces land on their drops (the 8ths): drawn from 6 frames before (hung over their slots, slammed down).
  assert.deepEqual([...new Set(PIECES.map((p) => p.drop))], [...D.HARD_DROPS]);
  // The ghost: (•ω•) on 20 × 10.
  assert.equal(GHOST.length, 10);
  for (const row of GHOST) assert.equal(row.length, 20);
  assert.ok(ghostAt(7, 5) && ghostAt(8, 14) && ghostAt(1, 1), 'eyes and brackets');
  const fr = wellAt(D.HARD_DROPS[3] + 2);
  assert.ok(fr.cubes.some((c) => c.ink === 'cyan') && fr.cubes.some((c) => c.ink === 'white'));
  assert.ok(fr.ghost.length > 0);
});

test('the four-line clear (13.4): the upper red pair and his face’s rows 1–2 glow cream for 4 frames, then ≈ 1 000 cubes fly at the lens, the nearest passing it within 5 frames', () => {
  assert.deepEqual([...CLEARED], [2, 3, 4, 5]);
  assert.ok(wellAt(D.LINE_CLEAR).cubes.some((c) => c.ink === 'cream'));
  assert.ok(!wellAt(D.LINE_CLEAR - 1).cubes.some((c) => c.ink === 'cream'));
  const b = burstAt(D.LINE_CLEAR + 4);
  assert.ok(b.length >= 900, `${b.length} cubes`);
  const cam = camPose(voxelCam(D.LINE_CLEAR));
  const dist = (f: number) => Math.min(...burstAt(f).map((c) => Math.hypot(c.x - cam.position[0], c.y - cam.position[1], c.z - cam.position[2])));
  assert.ok(dist(D.LINE_CLEAR + 4 + 6) < dist(D.LINE_CLEAR + 4) * 0.25, 'the nearest reach the lens');
});

test('voxelStateAt (contract §6.3, 1247 → 1248): the pieces left, typed and coloured, his block at the centre ≈ 600 px wide, an isometric camera over a white floor', () => {
  const s = voxelStateAt(VOXEL.to - 1);
  assert.ok(s.pieces.length >= 30);
  assert.ok(s.pieces.every((p) => ['I', 'O', 'T', 'S', 'Z', 'L', 'J'].includes(p.type) && p.cells.length === 4));
  assert.equal(s.floor, '#FFFFFF');
  assert.deepEqual(s.camera, { pitch: 35.264, yaw: 45, ortho: true });
  const row = HANDOFFS.find((r) => r.frame === D.TOTEM);
  if (row) {
    assert.ok(Math.abs(s.hero.centre[0] - row.centre[0]) < 60, `hero x ${s.hero.centre[0].toFixed(0)}`);
    assert.ok(Math.abs(s.hero.width / row.width - 1) < 0.2, `hero width ${s.hero.width.toFixed(0)}`);
  }
  void project;
});

test('the HUD is game pixels in the cabinet’s 5 × 7 font (crisp under the 6 px pass; it stands up in the tilt): every character covered; Defender scores 100 a hit — every hit that makes more of him — and loses a life to the stomp', () => {
  for (const f of [D.ARCADE.from, D.STOMP, D.ARCADE.to - 1]) for (const l of hudLines(f)) assert.ok(pixelTextCovers(l.text), l.text);
  assert.equal(scoreAt(D.SPLITS[0] - 1), 0);
  assert.equal(scoreAt(D.SPLITS[0]), 100);
  assert.equal(scoreAt(D.ARCADE.to - 1), 100 * D.SPLITS.length);
  assert.match(hudLines(D.SPLITS[1])[0].text, /^SCORE 000200$/);
  assert.match(hudLines(D.STOMP - 1)[2].text, /▲▲▲$/);
  assert.match(hudLines(D.STOMP)[2].text, /▲▲▯$/);
  assert.ok(arcadeAt(D.ARCADE.from).px.some((p) => p.id >= 600000), 'the HUD is pixels');
});

test('his face in the stack (13.3, the payoff): every cell over a stroke of his portrait locks cyan, every other cell white, and the I-piece’s open column never crosses a stroke', () => {
  const grid = new Map<string, boolean>();
  for (const [c, r] of INVADER_CELLS) grid.set(`${c},${r}`, ghostAt(r + 1, c));
  for (const p of PIECES.filter((q) => q !== I_PIECE)) for (const [c, r] of p.cells) grid.set(`${c},${r}`, ghostAt(r + 1, c));
  for (let fr = 1; fr <= 10; fr++) assert.ok(!ghostAt(fr, WELL_GRID.gapCol), `face row ${fr} has no stroke in the open column`);
  let cyan = 0;
  for (let fr = 1; fr <= 10; fr++) for (let c = 0; c < 20; c++) if (c !== WELL_GRID.gapCol) {
    assert.equal(grid.get(`${c},${fr - 1}`), ghostAt(fr, c), `cell ${c},${fr - 1}`);
    if (ghostAt(fr, c)) cyan++;
  }
  assert.ok(cyan > 40);
});

test('the voxel mothership stays near the lens, in front of the playfield and its blocks, ≥ 520 px, top centre, cropped by the top edge; he hard-drops down x 960 into 14.1 at 640 px', () => {
  for (let f = VOXEL.from + 6; f < D.VOXEL_MORPH.from; f += 6) {
    const s = mothershipScreen(f);
    // From where the arcade's camera left him (R2-05), centred by + 20.
    assert.ok(s.width >= 520 && Math.abs(s.x) <= 12 && (f < VOXEL.from + 20 || s.x === 0), `${f}`);
    assert.ok(s.y - (s.width * HERO_BITMAP.length) / HERO_BITMAP[0].length / 2 < 0, 'cropped by the top edge');
    assert.ok(mothershipCubes(f).every((c) => c.z > 80), `in front of the playfield at ${f}`);
  }
  const land = mothershipScreen(VOXEL.to - 0.25);
  // 640 px of face: the totem's 600 drawn 1.12 wide on 14.1's squash is 672 (R1-T12: Δ ≤ 40 px).
  assert.ok(Math.abs(land.y - 420) < 12 && Math.abs(land.width - 640) < 6);
});

test('R1-T12 (round 1): edit #16 is his hard drop — a wind-up on 13.4&, then down x 960 on the slam curve (accelerating), whole at (960, 420) and 600 px on 14.1 − 1 (Δ ≤ 40 px to the totem’s face on 14.1), his face filling into the amber block with an ink face, drawn over the well', () => {
  const ys = range(D.VOXEL_MORPH.from, VOXEL.to).map((f) => mothershipScreen(f).y);
  const last = mothershipScreen(VOXEL.to - 1);
  assert.ok(Math.hypot(last.x, last.y - 420) <= 40 && Math.abs(last.width - 600) <= 40, `lands at (${960 + last.x}, ${last.y.toFixed(0)}) ${last.width.toFixed(0)} px`);
  // After the wind-up every frame is lower than the one before, and the steps grow (gravity: the fastest frame is the last).
  const steps = ys.slice(3).map((y, i) => y - ys[i + 2]);
  for (const s of steps) assert.ok(s > 0, `falls every frame: ${steps.map((v) => v.toFixed(0)).join(' ')}`);
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] >= steps[i - 1] - 1, `accelerates: ${steps.map((v) => v.toFixed(0)).join(' ')}`);
  assert.ok(ys[1] < mothershipScreen(D.VOXEL_MORPH.from - 1).y, 'a wind-up: up first');
  // The block: on 14.1 − 1 every cell of the 15 × 9 slab is there, his face's pixels ink, the rest amber; before the drop, his pixels only.
  const cubes = mothershipCubes(VOXEL.to - 1);
  assert.equal(cubes.length, 15 * 9);
  assert.equal(cubes.filter((c) => c.ink === 'ink').length, HERO_BITMAP.join('').split('#').length - 1);
  assert.ok(mothershipCubes(D.VOXEL_MORPH.from - 1).every((c) => c.ink === 'amber'));
  // Drawn over everything from the drop (never cut by the well's cubes), in the world before it.
  assert.equal(voxelFrame(D.VOXEL_MORPH.from).hero.length > 0, true);
  assert.equal(voxelFrame(D.VOXEL_MORPH.from - 2).hero.length, 0);
});

test('R1-T11 + R9 (round 1): the HUD is never under the mothership (≥ 16 px clear through bar 12’s hover); he never sits still before the dive (≥ 1.4 px a frame); the snares of 12.1& and 12.2& startle the formation (a game pixel up for 3 frames) and kick the cannon', () => {
  const box = (px: { x: number; y: number; s: number; h?: number }[]) => ({ x0: Math.min(...px.map((p) => p.x)), x1: Math.max(...px.map((p) => p.x + p.s)), y0: Math.min(...px.map((p) => p.y)), y1: Math.max(...px.map((p) => p.y + (p.h ?? p.s))) });
  for (let f = D.ARCADE.from; f < D.DIVE + 2; f++) {
    const fr = arcadeAt(f);
    const ms = fr.px.filter((p) => p.ink === 'amber');
    const hudPx = fr.px.filter((p) => p.id >= 600000);
    for (const k of [0, 1, 2]) {
      const line = box(hudPx.filter((p) => Math.floor((p.id - 600000) / 4000) === k));
      for (const p of ms) {
        const dx = Math.max(line.x0 - (p.x + p.s), p.x - line.x1, 0);
        const dy = Math.max(line.y0 - (p.y + (p.h ?? p.s)), p.y - line.y1, 0);
        assert.ok(Math.hypot(dx, dy) >= 16, `${f - D.DROP2_START}: the mothership ${Math.hypot(dx, dy).toFixed(0)} px from HUD line ${k}`);
      }
    }
  }
  for (let f = D.ARCADE.from; f < D.DIVE - 8; f++) {
    const a = mothershipAt(f);
    const b = mothershipAt(f + 1);
    assert.ok(Math.hypot(b.cx - a.cx, b.cy - a.cy) >= 1.4, `${f - D.DROP2_START}: moves ${Math.hypot(b.cx - a.cx, b.cy - a.cy).toFixed(2)} px`);
  }
  // The signature's first copy (its pixels' top), which never splits away.
  const [c0, r0] = SIGNATURE_CELLS[0];
  const copyY = (f: number) => Math.min(...arcadeAt(f).px.filter((p) => p.id >= 200000 + (c0 * 8 + r0) * 200 && p.id < 200000 + (c0 * 8 + r0 + 1) * 200).map((p) => p.y));
  const cannonY = (f: number) => Math.min(...arcadeAt(f).px.filter((p) => p.id >= 130000 && p.id < 140000).map((p) => p.y));
  for (const p of D.PEWS.slice(0, 2)) {
    assert.ok(copyY(p) < copyY(p - 1), `${p - D.DROP2_START}: the formation hops up on the snare`);
    assert.equal(cannonY(p), cannonY(p - 1) + GP, 'the cannon kicks');
    assert.equal(cannonY(p + 3), cannonY(p - 1), 'and is back 3 frames later');
  }
});

test('the floor’s white (13.4& → 14.1) is a wipe out from his drop line, not a fade through grey: 0 before the morph, growing, past the frame by 14.1 − 2', () => {
  assert.equal(floorReach(D.VOXEL_MORPH.from - 1), 0);
  for (let f = D.VOXEL_MORPH.from; f < VOXEL.to - 1; f++) assert.ok(floorReach(f + 1) >= floorReach(f));
  assert.ok(floorReach(VOXEL.to - 2) > 4000);
});

test('R2-05 (round 2: bar 12 had drop 2’s lowest motion — a locked camera, a picture that all but stopped between the march steps — where the music goes double time): the camera flows (frontal on 12.1, moving on every frame, gathering speed and tilting a little into 13.1’s tilt, punching on the 8ths) and keeps the cabinet’s HUD and ground line in frame; a stadium wave runs through his copies on every 8th until the dive; the stomp is an impact — shake, cracked bunkers and their debris, the formation thrown out, a shock ring, a phosphor bloom; the tube flickers', () => {
  const hud = (c: ReturnType<typeof arcadeCam>) => [project(c, [48 - 960, 540 - 24, 0]), project(c, [1872 - 960, 540 - 24, 0]), project(c, [0, 540 - 1050, 0])];
  let prev = arcadeCam(D.ARCADE.from);
  for (let f = D.ARCADE.from + 1; f < D.ARCADE.to; f++) {
    const c = arcadeCam(f);
    const moved = Math.hypot(c.pivot[0] - prev.pivot[0], c.pivot[1] - prev.pivot[1]) + Math.abs(c.dist - prev.dist) * 0.3 + Math.abs(c.pitch - prev.pitch) * 3000;
    assert.ok(moved > 0.3, `${f - D.DROP2_START}: the camera moves (${moved.toFixed(2)})`);
    prev = c;
    if (f >= D.STOMP - 1 && f < D.STOMP + 12) continue;
    const [l, r, g] = hud(c);
    assert.ok(l[0] >= 0 && r[0] <= 1920 && l[1] >= 0 && g[1] <= 1080, `${f - D.DROP2_START}: the HUD and the ground line in frame`);
  }
  // Gathering speed: the last quarter moves the camera more than the first.
  const travel = (a: number, b: number) => {
    let s = 0;
    for (let f = a; f < b; f++) s += Math.abs(arcadeCam(f + 1).dist - arcadeCam(f).dist) + Math.abs(arcadeCam(f + 1).pitch - arcadeCam(f).pitch) * 3000;
    return s;
  };
  assert.ok(travel(D.ARCADE.to - 24, D.ARCADE.to - 1) > 1.5 * travel(D.ARCADE.from, D.ARCADE.from + 23));
  assert.ok(arcadeCam(D.ARCADE.to - 1).pitch > (3 * Math.PI) / 180, 'tilting toward the diorama');
  // The stadium wave: on every frame from 12.1 to the dive some copy is mid-hop.
  for (let f = D.ARCADE.from; f < D.DIVE - 1; f++) assert.ok(COPIES.some((k) => rippleAt(k.c, f, k.r) === 1), `${f - D.DROP2_START}: the wave is running`);
  assert.ok(COPIES.every((k) => rippleAt(k.c, D.DIVE + 1, k.r) === 0), 'still for the dive');
  // The stomp.
  const shake = Math.max(...[0, 1, 2, 3].map((k) => Math.hypot(arcadeCam(D.STOMP + k).pivot[0] - arcadeCam(D.STOMP - 1).pivot[0], arcadeCam(D.STOMP + k).pivot[1] - arcadeCam(D.STOMP - 1).pivot[1])));
  assert.ok(shake > 8, `the stomp shakes the camera ${shake.toFixed(0)} px`);
  const bunker = (f: number) => arcadeAt(f).px.filter((p) => p.id >= 100000 && p.id < 120000).length;
  assert.ok(bunker(D.STOMP) < bunker(D.STOMP - 1) - 40, `the bunkers crack: ${bunker(D.STOMP - 1)} → ${bunker(D.STOMP)} pixels`);
  assert.ok(arcadeAt(D.STOMP + 4).px.filter((p) => p.id >= 140000 && p.id < 141000).length >= 20, 'debris');
  assert.ok(arcadeAt(D.STOMP + 3).px.filter((p) => p.id >= 460000 && p.id < 461000).length >= 40, 'a shock ring');
  const xs = (f: number) => arcadeAt(f).px.filter((p) => p.id >= 200000 && p.id < 300000).map((p) => p.x);
  assert.ok(Math.max(...xs(D.STOMP + 1)) - Math.min(...xs(D.STOMP + 1)) > Math.max(...xs(D.STOMP - 1)) - Math.min(...xs(D.STOMP - 1)), 'the formation thrown out');
  assert.ok(arcadeLook(D.STOMP).bloom.intensity > 1.2 && arcadeLook(D.STOMP).exposure > 1.2 && arcadeLook(D.STOMP + 20).exposure < 1.06, 'a phosphor bloom that fades');
  const exp = range(D.ARCADE.from, D.ARCADE.from + 12).map((f) => arcadeLook(f).exposure);
  assert.ok(new Set(exp.map((e) => e.toFixed(4))).size >= 8 && exp.every((e) => Math.abs(e - 1) <= 0.03), 'the phosphor flickers (≤ 3 %)');
});
