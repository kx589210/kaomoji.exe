// S31S THE SWITCH, drop2 9 (src/shots/drop2Switch.ts; build sheet notes/bid2/drop2-sheet2.md §3 bar 9, §5 #10–#12, §6.3; design
// notes/extend/drop2-final.md §3.2, §4.5, §4.7): Defender v2.0's POV, half time. Read back like a viewer, beat by beat, and the
// hand-off contracts the kernel (K) and the wave (U) read. Every frame is the score's (no literal frame anywhere: part-local via the names).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { READOUT2, SIGNATURE, SIGNATURE_BYTES, SWITCH_TEXT } from '../src/content/drop2.ts';
import { linear } from '../src/engine/color.ts';
import * as D2 from '../src/score/drop2.ts';
import { DROP2_ACCENTS } from '../src/score/drop2.ts';
import { HANDOFFS, LAW, drop2Segment } from '../src/shots/drop2Shared.ts';
import * as S from '../src/shots/drop2Switch.ts';
import { FACE_ADVANCE, FACE_INK } from '../src/shots/drop2SwitchType.ts';
import { WAVE_CURL } from '../src/shots/drop2WaveGeom.ts';
import { type CameraAt, assertFastMovesSampled, assertNeverStill, assertRigContinuous, onShutter, poseMoved } from './lib/energyAudit.ts';

const { SWITCH, EXPLODE, SIGNATURE_MATCH, BOX, CONTAINED, BULGE, SPILL, FLOOD, ARCS, BURST, XRAY, CYANOTYPE } = D2;
const T0 = SWITCH.from;
const D2_BYTES = SIGNATURE_BYTES.join(' ');
const LAST = BURST - 1;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;
const frames = (a: number, b: number, step = 0.125): number[] => Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step);

test('the part: drop2 9.1 to the burst (10.1), one bar, half time; its frames are the score’s and on the 32nd grid', () => {
  assert.equal(BURST - T0, 96);
  for (const f of [XRAY.from, CYANOTYPE.from, CYANOTYPE.to, ...EXPLODE, SIGNATURE_MATCH.from, S.RED_FLASH, BOX, CONTAINED, BULGE, ...SPILL, FLOOD, ...ARCS]) {
    assert.ok(f >= T0 && f < BURST, `${f} inside the bar`);
    assert.equal(f % 3, 0, `${f} on the grid`);
  }
  assert.equal(S.RED_FLASH, SIGNATURE_MATCH.from + 9, 'the red outline flash on the tenth byte');
});

test('the camera: the heavy dolly 1.00 → 1.12 to the backbeat, the creep to 1.14, the fast pull-back to 0.85 landing by the flood; front-on but for the axonometric turn', () => {
  const c = S.switchCam;
  assert.equal(c(T0).zoom, 1, 'his 600 px on 9.1 (the kernel’s)');
  assert.ok(near(c(BOX).zoom, 1.12), 'dolly lands on 9.3 (front-on: zoom = dolly)');
  assert.ok(near(c(SPILL[0] - 1).zoom, 1.14, 2e-3), 'creep');
  assert.ok(c(SPILL[0]).zoom < c(SPILL[0] - 1).zoom - 0.03, 'the pull-back moves on the pop itself (L)');
  assert.equal(c(FLOOD).zoom, 0.85, '510 px on the flood');
  assert.equal(c(LAST).zoom, 0.85);
  for (let f = T0; f < BOX; f += 0.5) assert.ok(c(f + 0.5).dolly >= c(f).dolly - 1e-12, `dolly never backs off at ${f}`);
  assert.ok(near(c(EXPLODE[0] + 12).zoom, c(EXPLODE[0] + 12).dolly * (1 + S.AXO.push), 0.01), 'the axonometric pushes in on the drawing');
  assert.ok(Math.min(...frames(SPILL[0], FLOOD).map((f) => c(f).zoom)) < 0.85, 'the pull-back overshoots (L) and lands');
  // The axonometric turn: still before 9.1&, launched on it (L), snapped back to exactly front-on by the box (I).
  for (const f of [T0, EXPLODE[0] - 1, BOX, CONTAINED, FLOOD, LAST]) assert.equal(c(f).axo, 0, `front-on at ${f}`);
  assert.ok(c(EXPLODE[0]).axo > 0, 'moving on the 8th itself');
  assert.ok(near(c(EXPLODE[0] + 12).axo, 1, 0.02), 'settled into the axonometric');
  assert.ok(near(c(EXPLODE[0] + 12).yaw, (S.AXO.yaw * Math.PI) / 180, 0.02));
  assert.ok(c(EXPLODE[0] + 12).fov < 10, 'flattened toward orthographic (a dolly-zoom)');
  // Smooth: no camera value jumps between sub-frames except where the curves are steep by design (the slam lands on the box).
  for (const f of frames(T0, LAST)) {
    const a = c(f);
    const b = c(f + 0.125);
    assert.ok(Math.abs(b.zoom - a.zoom) < 0.03 && Math.abs(b.axo - a.axo) < 0.12, `${f}: continuous`);
  }
});

test('the planes lift one an 8th on the scan notes (brackets 120, eyes 240, ω 360 px toward the lens) and slam back on the box', () => {
  for (const [k, layer] of (['brackets', 'eyes', 'mouth'] as const).entries()) {
    assert.equal(S.liftAt(layer, EXPLODE[k] - 1), 0, `${layer} still before its note`);
    assert.ok(S.liftAt(layer, EXPLODE[k]) > 0, `${layer} moves on its note`);
    const full = Math.min(EXPLODE[k] + 11, BOX - 6);
    assert.ok(near(S.liftAt(layer, full), S.LIFT[layer], 0.06 * S.LIFT[layer]), `${layer} at ${S.LIFT[layer]}`);
    assert.equal(S.liftAt(layer, BOX), 0, `${layer} slammed back on 9.3`);
  }
  assert.deepEqual(S.LIFT, { brackets: 120, eyes: 240, mouth: 360 });
});

test('the hand-offs: he is the kernel’s 600 px at (960, 540) on 9.1 and 510 px hardened on the flood; the reticle ring is the kernel’s (Ø 900, his centre)', () => {
  const h0 = HANDOFFS.find((h) => h.frame === T0)!;
  const h1 = HANDOFFS.find((h) => h.frame === FLOOD)!;
  for (const [h, f] of [[h0, T0], [h1, FLOOD]] as const) {
    const me = S.heroAt(f);
    assert.equal(me.face, h.face, `${f}: face`);
    assert.ok(near(me.width, h.width, 0.5), `${f}: width ${me.width}`);
    assert.deepEqual(me.centre, [...h.centre]);
  }
  const r = S.reticleAt(T0);
  assert.deepEqual(r.centre, [960, 540]);
  assert.equal(2 * r.r, 900);
  assert.equal(S.heroAt(FLOOD - 1).face, '(•ω•)', 'hardens on the flood, not before');
});

test('the reticle: locked on him; its ticks step on the 8th hats, snap inward on the lock (9.2&); it rides the box after 9.3 and splits 1 → 2 → 4 → 8 on the pops', () => {
  assert.equal(S.reticleAt(SIGNATURE_MATCH.from - 1).inward, 0);
  assert.ok(S.reticleAt(SIGNATURE_MATCH.from + 6).inward > 0.99);
  const hats = D2.HATS2.filter((h) => h >= T0 && h < BOX);
  assert.ok(hats.length >= 4);
  for (const h of hats) assert.ok(S.reticleAt(h + 3).rot > S.reticleAt(h - 0.5).rot + 1, `a step on the hat ${h}`);
  for (const [k, n] of [1, 2, 4, 8].entries()) assert.equal(S.splitReticles(SPILL[k] + 1).filter((x) => x.alpha > 0.5).length, n, `${n} reticles after pop ${k}`);
  assert.ok(S.reticleAt(FLOOD).r < 450, 'tracking the box as the camera pulls back');
});

test('SIGNATURE MATCH: the film’s only reading of his bytes — a byte a frame from 9.2&, `100%` with the red flash on the tenth, red on #0B1650, gone on the box', () => {
  const chip = S.signatureChip;
  assert.equal(chip(SIGNATURE_MATCH.from - 1), null);
  for (let k = 0; k < 10; k++) {
    const c = chip(SIGNATURE_MATCH.from + k)!;
    assert.equal(c.bytes, k + 1, `${k + 1} bytes on frame ${k}`);
    assert.ok(SIGNATURE.match.startsWith(c.text), c.text);
  }
  assert.equal(chip(S.RED_FLASH)!.text, SIGNATURE.match);
  assert.equal(chip(BOX - 1)!.text, SIGNATURE.match, 'held to the backbeat');
  assert.equal(chip(BOX), null);
  assert.ok(READOUT2.some((l) => l.at === SIGNATURE_MATCH.from && l.text === SIGNATURE.match));
  assert.equal(S.outlineRed(S.RED_FLASH), true);
  assert.equal(S.outlineRed(S.RED_FLASH + 1), true);
  assert.equal(S.outlineRed(S.RED_FLASH + 2), false);
  assert.equal(S.outlineRed(S.RED_FLASH - 1), false);
});

test('the box: four corners fly in from the screen’s corners and land on 9.3, where it CLANGS whole (edges, a heavy stroke, the hatch flaring, a red shock ring out of it); the corner bulges 12 px on 9.3& + 9; it holds through the flood, bulging and cracking with light', () => {
  const b = S.mainBox;
  assert.equal(b(BOX - 7).corner, 0);
  assert.equal(b(BOX).corner, 1);
  assert.ok(b(BOX - 3).corner > 0 && b(BOX - 3).corner < 0.3, 'eased in (an impact)');
  // Whole on the backbeat's every sub-frame (struck a quarter frame early), none of it on the frame before.
  assert.equal(b(BOX - 0.75).edges, 0);
  assert.equal(b(BOX - 0.25).edges, 1);
  assert.equal(b(BOX).edges, 1);
  assert.ok(b(BOX).weight > 1.8 && b(BOX + 6).weight === 1, 'a heavy stroke on the clang, settled in 6 f');
  assert.ok(b(BOX).hatch > 1.8 * b(BOX + 8).hatch, 'the hatch flares on the clang');
  assert.equal(S.shockAt(BOX - 0.75), null);
  const s0 = S.shockAt(BOX)!;
  const s1 = S.shockAt(BOX + 4)!;
  assert.ok(s0.alpha > 0.7 && s1.scale > s0.scale && s1.alpha < s0.alpha, 'the shock ring grows and fades');
  assert.equal(S.shockAt(BOX + 8), null);
  assert.equal(b(BULGE - 1).bulge, 0);
  assert.ok(near(Math.max(...frames(BULGE, SPILL[0]).map((f) => b(f).bulge)), 12, 0.6), 'the corner bulges 12 px');
  assert.equal(S.crackAt(FLOOD - 1), 0);
  assert.equal(S.crackAt(LAST), 1);
  for (let f = FLOOD; f < LAST; f++) assert.ok(S.crackAt(f + 1) > S.crackAt(f), 'the light only grows');
  for (const at of ARCS) assert.ok(S.crackAt(at) - S.crackAt(at - 1) > 2 * (S.crackAt(at - 1) - S.crackAt(at - 2)), `it cracks open in a step on the compass tick ${at}`);
  const burst = S.boxBurstAt(LAST);
  assert.deepEqual(burst.centre, [960, 540]);
  assert.ok(near(burst.face, 510, 1), `his face ${burst.face}`);
  assert.ok(burst.crack === 1 && burst.w > burst.face && burst.h > 0);
});

test('the spill: on each 32nd every box squeezes out a copy (×2 ×4 ×8 ×16 of him), each boxed a 32nd later but the last; every satellite box fails at once on the flood', () => {
  const hims = (f: number) => 1 + S.SPILL_COPIES.filter((c) => c.born <= f).length;
  assert.deepEqual(SPILL.map((f) => hims(f)), [2, 4, 8, 16]);
  assert.deepEqual(SPILL.map((f) => S.boxesAt(f).length), [1, 2, 4, 8]);
  assert.equal(S.SPILL_COPIES.filter((c) => c.boxedAt === null).length, 8, 'the last batch is never boxed');
  for (const c of S.SPILL_COPIES) if (c.boxedAt !== null) assert.equal(c.boxedAt, SPILL[c.gen + 1]);
  assert.equal(S.boxesAt(FLOOD).filter((b) => !b.main && b.fail <= 0).length, 0, 'every satellite fails on 9.4&');
  assert.equal(S.boxesAt(FLOOD - 0.25).filter((b) => !b.main && b.fail <= 0).length, 0, '…on every sub-frame of the snare’s frame');
  assert.equal(S.boxesAt(FLOOD - 0.75).filter((b) => !b.main && b.fail > 0).length, 0, 'and on none of the frame before');
  assert.ok(S.failFlash(FLOOD) > 0.7 && S.failFlash(FLOOD - 0.75) === 0 && S.failFlash(FLOOD + 4) === 0, 'each failing box flashes white-hot on the snare, gone in 4 f');
  assert.equal(S.boxesAt(FLOOD).filter((b) => b.main).length, 1, 'his own box holds');
  // The boxes never overlap and stay inside the frame at the pull-back's widest.
  const boxes = S.boxesAt(SPILL[3] + 2).filter((b) => !b.main);
  for (const a of boxes)
    for (const o of [...boxes, S.boxesAt(SPILL[3] + 2).find((b) => b.main)!])
      if (a !== o) assert.ok(Math.abs(a.cx - o.cx) >= a.hw + o.hw || Math.abs(a.cy - o.cy) >= a.hh + o.hh, 'no overlap');
  const z = S.switchCam(SPILL[3] + 2).zoom;
  for (const a of boxes) assert.ok(Math.abs(a.cx) + a.hw < 960 / z && Math.abs(a.cy) + a.hh < 540 / z, 'inside the frame');
  // The big line counts them on the pops.
  assert.equal(S.bigLine(CONTAINED + 6)!.text, 'THREAT CONTAINED ✓');
  for (const [k, n] of [2, 4, 8, 16].entries()) assert.equal(S.bigLine(SPILL[k] + 2)!.text, SWITCH_TEXT.failed(n));
  assert.equal(S.bigLine(LAST)!.text, SWITCH_TEXT.failed(16));
  assert.equal(S.bigLine(CONTAINED - 1), null);
  assert.ok(READOUT2.some((l) => l.at === CONTAINED && l.text === 'THREAT CONTAINED ✓'));
  assert.ok(READOUT2.some((l) => l.at === SPILL[0] && l.text === SWITCH_TEXT.failed(2)));
});

test('the flood (rev 2; R1-T02: piled on the scoreboard’s box and round it, ~70): amber copies, each big enough to read as him (≥ 60 px), pour down-left in two gushes on the snares, one stream per failed box, into a heap that fills from the corner up — row on row, no copy on another (a crowd of him, not glyph texture)', () => {
  assert.equal(S.floodAt(FLOOD - 1).length, 0);
  const end = S.floodAt(LAST);
  assert.ok(end.length >= 60 && end.length <= 180, `${end.length} copies`);
  const inkW = (s: number) => (s * (FACE_INK[2] - FACE_INK[0])) / FACE_ADVANCE;
  const inkH = (s: number) => (s * (FACE_INK[3] - FACE_INK[1])) / FACE_ADVANCE;
  for (const p of end) {
    assert.ok(p.landed && p.alpha === 1, 'all landed by the burst');
    assert.ok(p.x - inkW(p.size) / 2 >= 0 && p.x + inkW(p.size) / 2 <= 1100 && p.y > 400 && p.y + inkH(p.size) / 2 <= 1080, `in the bottom-left, whole: ${p.x.toFixed(0)}, ${p.y.toFixed(0)}`);
    assert.ok(p.size >= 60 && p.size <= 80, `readable as him: ${p.size.toFixed(0)} px`);
    assert.ok(Math.abs(p.rot) <= 0.08, 'settled in rows, not tumbled');
  }
  for (const [i, a] of end.entries())
    for (const b of end.slice(i + 1))
      assert.ok(Math.abs(a.x - b.x) >= 0.85 * (inkW(a.size) + inkW(b.size)) / 2 || Math.abs(a.y - b.y) >= 0.85 * (inkH(a.size) + inkH(b.size)) / 2, `no copy on another: (${a.x.toFixed(0)}, ${a.y.toFixed(0)}) / (${b.x.toFixed(0)}, ${b.y.toFixed(0)})`);
  // Two gushes, one on each of the flood's snares, every drop launched within a beat's 8th of its snare.
  const [s0, s1] = D2.SPILL_SNARES;
  const g0 = S.FLOOD_DROPS.filter((d) => d.spawn >= s0 && d.spawn < s0 + 4);
  const g1 = S.FLOOD_DROPS.filter((d) => d.spawn >= s1 && d.spawn < s1 + 3);
  assert.equal(g0.length + g1.length, S.FLOOD_DROPS.length, 'every drop in a gush');
  assert.ok(g0.length > g1.length && g1.length > 0.25 * S.FLOOD_DROPS.length, 'the first gush the bigger');
  // One stream per failed box: a box's drops share its arc (the same hop), so in the blur they read as a pour, not a scatter.
  const bySrc = new Map<number, Set<number>>();
  for (const d of S.FLOOD_DROPS) bySrc.set(d.src, (bySrc.get(d.src) ?? new Set()).add(d.lift));
  assert.ok(bySrc.size >= 12, `${bySrc.size} streams`);
  for (const [src, lifts] of bySrc) assert.equal(lifts.size, 1, `stream ${src}: one arc`);
  // The heap fills from the corner up (water): the first quarter to land sits deeper than the last quarter.
  const order = [...S.FLOOD_DROPS].sort((a, b) => a.spawn + a.dur - (b.spawn + b.dur));
  const q = Math.floor(order.length / 4);
  const depth = (d: S.FloodDrop) => d.to[1] - 0.58 * d.to[0];
  const mean = (xs: S.FloodDrop[]) => xs.reduce((s, d) => s + depth(d), 0) / xs.length;
  assert.ok(mean(order.slice(0, q)) > mean(order.slice(-q)) + 60, 'deepest first');
  // In the air they are faces, not specks: a frame into each gush most of the copies in flight are ≥ 60 % of their landed size.
  for (const f of [s0 + 2, s1 + 1]) {
    const air = S.floodAt(f).filter((p) => !p.landed);
    assert.ok(air.length >= 10, `${f}: ${air.length} in the air`);
  }
  const landed = (f: number) => S.floodAt(f).filter((p) => p.landed).length;
  assert.ok(landed(FLOOD + 6) < landed(FLOOD + 9) && landed(FLOOD + 9) < end.length);
  assert.equal(landed(LAST), end.length);
  // A shorter shutter under the flood: the copies stay legible in flight (the camera is still there; only they move).
  for (let f = FLOOD; f <= LAST; f++) assert.ok(S.switchTemporal(f).shutter <= 0.35, `${f}: shutter`);
  assert.equal(S.switchTemporal(FLOOD - 1).shutter, 0.5);
});

test('the bytes become his box’s label: the ten bytes SIGNATURE MATCH typed are stamped on the box’s top edge just after the clang, and ride it — readable for ≥ 40 frames — to the burst (the chip alone held them whole for 3)', () => {
  assert.equal(S.sigTagAt(BOX), null, 'the clang frame is the box’s alone');
  assert.equal(S.sigTagAt(S.TAG_STAMP - 1), null);
  assert.ok(S.TAG_STAMP > BOX && S.TAG_STAMP <= BOX + 3, 'a follow-through of the clang, with the ▣ stamps');
  const t0 = S.sigTagAt(S.TAG_STAMP)!;
  assert.equal(t0.text, D2_BYTES);
  assert.ok(t0.scale >= 1.3, 'stamped down from big');
  for (let f = S.TAG_STAMP + 3; f <= LAST; f++) {
    const t = S.sigTagAt(f)!;
    assert.ok(t.scale === 1 && t.alpha === 1, `${f}: settled`);
    const top = S.toScreen(f, 0, S.MAIN.hh + S.mainBox(f).swell)[1];
    assert.ok(Math.abs(t.x - 960) < 3, `${f}: centred on the box`);
    const gap = top - (t.y + t.h / 2);
    assert.ok(gap >= 6 && gap <= 24, `${f}: hung on its top edge (${gap.toFixed(1)} px)`);
    assert.ok(t.w >= 400 && t.w <= 2 * S.MAIN.hw * S.switchCam(f).zoom, `${f}: no wider than the box`);
    for (const b of S.boxesAt(f).filter((x) => !x.main && x.fail <= 0)) {
      const z = S.switchCam(f).zoom;
      const [x, y] = S.toScreen(f, b.cx, b.cy);
      assert.ok(Math.abs(x - t.x) >= b.hw * z + t.w / 2 || Math.abs(y - t.y) >= b.hh * z + t.h / 2, `${f}: clear of box ${b.id}`);
    }
  }
  assert.ok(LAST - (S.TAG_STAMP + 3) + 1 >= 40);
});

test('the claim backspaced (R1-T14): THREAT CONTAINED ✓ is erased right to left over the held breath’s last 6 frames, gone by 9.4 − 1; on 9.4 `quarantine failed ×2` types into a clean field over 3 f, and the count steps ×4 ×8 ×16 on the pops — never a mashed word', () => {
  const old = [...S.CLAIM];
  const shown = (f: number) => {
    const b = S.bigLine(f)!;
    return [...b.text].slice(0, b.count).join('');
  };
  assert.equal(S.CLAIM, 'THREAT CONTAINED ✓');
  assert.deepEqual([S.BACKSPACE.from, S.BACKSPACE.to], [SPILL[0] - 6, SPILL[0]]);
  assert.equal(shown(S.BACKSPACE.from - 1), S.CLAIM, 'whole before the backspace');
  for (let f = S.BACKSPACE.from; f < SPILL[0]; f++) {
    assert.ok(S.CLAIM.startsWith(shown(f)) && shown(f).length < shown(f - 1).length, `${f}: right to left (${shown(f)})`);
    assert.ok(S.bigLine(f)!.cursor, `${f}: the cursor at its head`);
  }
  assert.ok(!shown(S.BACKSPACE.from).includes('✓'), 'the ✓ goes first');
  assert.equal(shown(SPILL[0] - 1), '', 'erased by 9.4 − 1');
  assert.ok(old.length === 18);
  // 9.4: typed into a clean field, whole on its third frame; then the count on each pop.
  const neu = SWITCH_TEXT.failed(2);
  assert.ok(neu.startsWith(shown(SPILL[0])) && shown(SPILL[0]).length > 0 && shown(SPILL[0]) !== neu, `typing on the pop: ${shown(SPILL[0])}`);
  assert.equal(shown(SPILL[0] + 2), neu);
  for (const [k, n] of [2, 4, 8, 16].entries()) assert.equal(shown(SPILL[k] + (k === 0 ? 2 : 0)), SWITCH_TEXT.failed(n), `×${n} on its pop`);
  // Never a mash: every frame shows a head of the claim or of a failure count.
  const lines = [S.CLAIM, ...[2, 4, 8, 16].map((n) => SWITCH_TEXT.failed(n))];
  for (let f = CONTAINED; f <= LAST; f++) assert.ok(lines.some((l) => l.startsWith(shown(f))), `${f}: ${shown(f)}`);
});

test('he never vanishes in the flood’s light: from the flood his lines are hardened (≥ 3 px) over a dark keyline (≥ 6 px wider), the core darkening only as the light grows behind him (backlit by the burst)', () => {
  assert.deepEqual(S.heroInk(FLOOD - 1), { width: 2, keyline: 0, dark: 0 });
  assert.ok(S.heroInk(FLOOD).keyline > 0, 'on the snare');
  for (let f = FLOOD + 2; f <= LAST; f++) {
    const h = S.heroInk(f);
    assert.ok(h.width >= 3 && h.keyline >= 6, `${f}: ${h.width} / ${h.keyline}`);
    assert.ok(h.dark <= Math.sqrt(S.crackAt(f)) + 1e-9, `${f}: the core darkens no faster than the light`);
  }
  assert.ok(S.heroInk(LAST).dark >= 0.85, 'a dark silhouette against the light on the cut');
});

test('the drafting: Defender drafts the wave builder’s WAVE_CURL (contract §6.3) — four tangent compass arcs, one a 32nd from the flood; on the cut every drafted arc lies on its keyline (≤ 2 px), in the left 60 % (the mountain stands right of it)', () => {
  const arcs = S.CURL_ARCS;
  assert.equal(arcs.length, WAVE_CURL.length);
  const end = (a: S.Arc, t: number): [number, number] => [a.centre[0] + a.r * Math.cos(t), a.centre[1] + a.r * Math.sin(t)];
  for (const [k, a] of arcs.entries()) {
    const w = WAVE_CURL[k];
    // Every drafted point on the keyline's circle, and the arc spans the keyline's quarter (both ends within 2 px).
    for (let i = 0; i <= 32; i++) {
      const [x, y] = end(a, a.a0 + ((a.a1 - a.a0) * i) / 32);
      assert.ok(Math.abs(Math.hypot(x - w.cx, y - w.cy) - w.r) <= 2, `arc ${k} point ${i} on the keyline`);
    }
    const kw = (deg: number): [number, number] => [w.cx + w.r * Math.cos((deg * Math.PI) / 180), w.cy + w.r * Math.sin((deg * Math.PI) / 180)];
    for (const [p, q] of [[end(a, a.a0), kw(w.a0)], [end(a, a.a1), kw(w.a1)]]) assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) <= 2, `arc ${k}: its ends are the keyline's`);
  }
  for (let k = 1; k < arcs.length; k++) {
    const p = end(arcs[k - 1], arcs[k - 1].a1);
    const q = end(arcs[k], arcs[k].a0);
    assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6, `arc ${k} starts where ${k - 1} ends`);
  }
  const pts = arcs.flatMap((a) => Array.from({ length: 33 }, (_, i) => end(a, a.a0 + ((a.a1 - a.a0) * i) / 32)));
  assert.ok(Math.max(...pts.map((p) => p[0])) <= 0.6 * 1920 + 2, 'the lip in the left 60 % (the mountain stands right of it)');
  assert.ok(Math.min(...pts.map((p) => p[1])) > 120, 'its crest in frame');
  for (const [k, at] of ARCS.entries()) {
    assert.equal(S.arcDrawn(k, at - 2), 0);
    assert.equal(S.arcDrawn(k, at + 2), 1, `arc ${k} drawn within the 32nd`);
  }
  assert.equal(S.arcDrawn(3, LAST), 1, 'every arc complete on the cut');
});

test('the drafting’s construction: each arc comes with its compass square (the golden rectangle’s, the classic overlay on Hokusai’s wave) — centre, both arc ends and the far corner; the squares tile, each 1/φ of the one before', () => {
  const sq = S.CURL_SQUARES;
  assert.equal(sq.length, S.CURL_ARCS.length);
  for (const [k, q] of sq.entries()) {
    const a = S.CURL_ARCS[k];
    const ends = [a.a0, a.a1].map((t) => [a.centre[0] + a.r * Math.cos(t), a.centre[1] + a.r * Math.sin(t)]);
    const has = (p: readonly number[]) => q.corners.some((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) < 1e-6);
    assert.ok(has(a.centre) && has(ends[0]) && has(ends[1]), `square ${k}: the compass's centre and both arc ends are its corners`);
    const side = Math.hypot(q.corners[1][0] - q.corners[0][0], q.corners[1][1] - q.corners[0][1]);
    assert.ok(near(side, a.r, 1e-6), `square ${k}: side = radius`);
    if (k > 0) assert.ok(near(a.r / S.CURL_ARCS[k - 1].r, 1 / ((1 + Math.sqrt(5)) / 2), 1e-6), 'each 1/φ of the one before');
  }
  // Drawn with its arc: nothing before the arc's tick, whole by the time the arc is.
  for (const [k, at] of ARCS.entries()) {
    assert.equal(S.squareDrawn(k, at - 1), 0);
    assert.equal(S.squareDrawn(k, at + 2), 1);
  }
});

test('the colour law: red is Defender’s (#FF4A1C emissive ×1.6, its #0B1650 on blue), amber only the copies; his blueprint is white — no amber in Defender’s eyes', () => {
  assert.deepEqual(S.INK.red, linear(LAW.defender.emissive, LAW.defender.emissiveGain));
  assert.deepEqual(S.INK.onBlue, linear(LAW.defender.onBlue));
  assert.deepEqual(S.INK.amber.map((v) => v / S.INK.amber[0]), linear(LAW.hero).map((v) => v / linear(LAW.hero)[0]));
  const [r, g, b] = S.INK.line;
  assert.ok(b >= g && g >= r * 0.9, 'his lines are the blueprint white');
});

test('photography: the bar is its own segment — cut on 9.1 so DEFENDER v2.0 slams in whole on the kick (the kernel’s ring still matches the reticle), cut at the burst; ≥ 32 samples throughout, 64 on the turn, the slam and the pull-back; the POV look keeps the frame’s mean up (a grade, never an inversion)', () => {
  for (const f of [T0, BOX, FLOOD, LAST]) assert.deepEqual(S.switchSegment(f), drop2Segment(f));
  assert.equal(S.switchSegment(LAST).to, BURST);
  assert.equal(S.switchSegment(T0).from, T0, 'no kernel sub-frame under the 9.1 slam (SEGMENT_CUTS, the integrator 2026-10-02)');
  for (let f = T0; f < BURST; f++) assert.ok(S.switchTemporal(f).samples >= 32);
  for (const f of [EXPLODE[0] + 2, BOX - 2, SPILL[0] + 3]) assert.equal(S.switchTemporal(f).samples, 64, `${f}`);
  assert.ok(S.switchLook(T0).vignette <= 0.35 && S.switchLook(T0).bloom.intensity > 0);
  assert.ok(S.switchLook(LAST).bloom.intensity > S.switchLook(T0).bloom.intensity, 'the light leaks bloom');
  assert.ok(S.groundAt(T0)[2] > 0.01 && S.groundAt(CYANOTYPE.to)[2] > S.groundAt(CYANOTYPE.to)[0], 'cyanotype: dark but blue, never black');
});

test('the rig: drop 2’s accents give the switch its two hits (9.1, 9.3) and nothing fights the shot’s own pull-back', () => {
  const mine = DROP2_ACCENTS.filter((a) => a.at >= T0 && a.at < BURST).map((a) => a.at);
  assert.deepEqual(mine, [T0, BOX]);
  assert.ok(FACE_ADVANCE > 0);
});

test('卡点: every drum of the half-time bar has a picture event on its frame — the lock blink on 9.2&, the box on 9.3, the light cracking open on the flood’s snare and pulsing on the second', () => {
  assert.equal(S.lockFlash(SIGNATURE_MATCH.from - 1), 0);
  assert.equal(S.lockFlash(SIGNATURE_MATCH.from), 1);
  assert.equal(S.lockFlash(SIGNATURE_MATCH.from + 6), 0);
  assert.ok(S.switchLook(SIGNATURE_MATCH.from).exposure > S.switchLook(SIGNATURE_MATCH.from - 1).exposure + 0.1, 'the lock flares the picture');
  assert.ok(S.reticleAt(SIGNATURE_MATCH.from).stroke > 2 * S.reticleAt(SIGNATURE_MATCH.from - 1).stroke, 'and the ring');
  assert.ok(S.crackAt(FLOOD) >= 0.12, 'the light cracks open on the snare (9.4&), not after');
  for (const s of D2.SPILL_SNARES) assert.ok(S.lightPulse(s) > S.lightPulse(s - 1) + 0.15, `a light pulse on the snare ${s}`);
  assert.equal(S.mainBox(BOX).corner, 1, 'the box lands on the backbeat');
  for (const p of SPILL) assert.ok(S.SPILL_COPIES.some((c) => c.born === p), `a copy squeezes out on ${p}`);
});

test('the energy standard over the bar: the camera with the rig never holds still for more than 12 frames (the flood’s pressure keeps it alive), every fast frame gets ≥ 32 sub-frames, the rig never snaps', () => {
  const at: CameraAt = (f) => ({ pose: S.switchPose(f), samples: onShutter(f, S.switchTemporal(f)) });
  assertNeverStill(T0 + 1, BURST, poseMoved(at));
  assertFastMovesSampled(T0, BURST, at);
  assertRigContinuous(T0, BURST);
  // The pressure is felt, not seen: under 3 px of sway, and he is still the wave's 510 px at (960, 540) on the cut.
  for (let f = FLOOD; f <= LAST; f += 0.25) {
    const p = S.switchPose(f);
    assert.ok(Math.hypot(p.target[0], p.target[1]) < 3, `${f}: sway ${Math.hypot(p.target[0], p.target[1]).toFixed(2)} px`);
  }
  assert.ok(near(S.boxBurstAt(LAST).face, 510, 1));
});
