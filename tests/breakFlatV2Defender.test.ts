// v2 of the flat bars (break 2–5), the antivirus's hand (src/shots/breakDefender.ts; sheet notes/bid2/break-sheet2.md §3, §5, §7.2,
// §9; the design's §5.2–§5.6): the red cursor's acts, the marquees (the iris's tug-of-war, the selection C6 carries), the work orders
// (their IDs spell his signature) and their litter, the POV's schedule.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ORDER_TEXTS, POV_LOCK_TEXTS, POV_READOUT, SIGNATURE } from '../src/content/break.ts';
import {
  BRACKET_LAUNCH,
  CURSOR_ACTS,
  DIAMOND,
  DIZZY,
  HANG,
  IRIS_CLOSE,
  MARQUEE,
  ORDER_COPIES,
  ORDER_RETYPES,
  ORDERS,
  POV,
  POV_SWEEP,
  SELECT,
  SELECT_CHIP,
  STUTTER,
  TEARS,
  TRIPLE,
  WIPE,
  WIPE_COVER,
} from '../src/score/break.ts';
import { partFrame } from '../src/score/film.ts';
import { ANTS, CURSOR_CLICKS_V2, ORDER_IDS, SELECT_RECT, cursorsAt, irisMarquee, litterAt, ordersAt, povAt, selectChip, selectMarquee } from '../src/shots/breakDefender.ts';
import { partAt } from '../src/shots/breakHero.ts';
import { flatCamV2, frameOf, toScreen } from '../src/shots/breakShared.ts';

const C6 = partFrame('break', 6);
const onScreen = (f: number, p: readonly [number, number]): [number, number] => toScreen(flatCamV2(f), p[0], p[1]);
const dist = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const inFrame = (p: { x: number; y: number }, m = 0): boolean => p.x >= m && p.x <= 1920 - m && p.y >= m && p.y <= 1080 - m;

test('the IDs of T0 → T9 spell his signature E2 80 A2 20 CF 89 20 E2 80 A2, which is • ω • in UTF-8', () => {
  assert.deepEqual(ORDER_IDS, SIGNATURE.map((b) => `#${b}`));
  assert.equal(Buffer.from(SIGNATURE.join(''), 'hex').toString('utf8'), '• ω •');
});

test('2.2, the iris: the marquee snaps round his core and turns −70° with it; one sharp instant per output frame (screen UI); 8 handles; the cursor holds its bottom handle, in frame throughout', () => {
  assert.equal(irisMarquee(MARQUEE.from - 0.6), null);
  for (let f = MARQUEE.from; f < IRIS_CLOSE.from; f++) {
    const m = irisMarquee(f)!;
    assert.equal(m.handles.length, 8, `handles on ${f}`);
    // Drawn whole on its frame: every sub-frame instant of the shutter shows the frame's marquee.
    for (const d of [-0.25, -0.125, 0.125, 0.24]) assert.deepEqual(irisMarquee(f + d), m, `sharp on ${f}${d}`);
    // The bottom handle (BR → BL's middle) is the one the cursor drags; it and the cursor stay well inside the frame.
    const grip = m.handles[6];
    assert.ok(inFrame(grip, 40), `the bottom handle in frame on ${f}: ${grip.x.toFixed(0)}, ${grip.y.toFixed(0)}`);
    const c = cursorsAt(f);
    assert.equal(c.length, 1);
    assert.ok(dist([c[0].x, c[0].y], [grip.x, grip.y]) < 1, `the cursor on the bottom handle on ${f}`);
  }
  // It turns −70° (the top edge's screen angle; y down) with his core, almost all the way by 2.2& − 1.
  const angle = (f: number) => {
    const [a, b] = irisMarquee(f)!.handles;
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  };
  assert.ok(Math.abs(angle(MARQUEE.from)) < 0.5, `level on 2.2: ${angle(MARQUEE.from)}`);
  assert.ok(angle(IRIS_CLOSE.from - 1) < -60 && angle(IRIS_CLOSE.from - 1) > -72, `turned on 2.2& − 1: ${angle(IRIS_CLOSE.from - 1)}`);
});

test('2.2&: he pulls back — the selection snaps (no handles, its dashes flying apart, gone by the lock) and the cursor is flung off the frame within 12 frames', () => {
  const m = irisMarquee(IRIS_CLOSE.from)!;
  assert.equal(m.handles.length, 0);
  assert.ok(m.dashes.length > 10);
  assert.equal(irisMarquee(MARQUEE.to), null);
  const c = cursorsAt(IRIS_CLOSE.from + 11.75)[0];
  assert.ok(!inFrame(c), `flung off: ${c.x.toFixed(0)}, ${c.y.toFixed(0)}`);
  assert.equal(cursorsAt(IRIS_CLOSE.from + 12).length, 0);
});

test('the drag (2.4& → 3.3&): the cursor comes in from the left, grips the loose "(" on 3.1 and rides it through the loop to the slam, then leaves left', () => {
  const drag = CURSOR_ACTS[1];
  assert.ok(cursorsAt(drag.from)[0].x < 0, 'in from off the left');
  for (let f = BRACKET_LAUNCH; f < DIZZY; f += 1) {
    const c = cursorsAt(f)[0];
    const p = onScreen(f, partAt(f, 'open'));
    // It leads the bracket by half a frame (it drags; the bracket follows), gripping its edge — even round the loop at ≈ 140 px a frame.
    assert.ok(dist([c.x, c.y], p) < 150, `on the bracket on ${f}: ${dist([c.x, c.y], p).toFixed(0)} px`);
  }
  assert.ok(cursorsAt(drag.to - 0.25)[0].x < 0, 'gone left');
});

test('every click (bars 2–5) dips the arrow to 0.88 on its frame and springs it back over 4 frames', () => {
  for (const c of CURSOR_CLICKS_V2.filter((k) => k !== TRIPLE)) {
    const arrows = cursorsAt(c).filter((d) => d.kind === 'arrow');
    assert.ok(arrows.some((d) => Math.abs(d.scale - 0.88) < 1e-9), `click on +${c - partFrame('break', 1)}`);
    if (!CURSOR_CLICKS_V2.some((k) => k > c && k <= c + 4)) assert.ok(cursorsAt(c + 4).every((d) => d.kind !== 'arrow' || d.scale > 0.999), `back by +4 after ${c}`);
  }
});

test('4.3a → the hang: three red cursors jitter round his face, freeze into busy-spinners on the hang (a step every 3 frames), and are swept by the restart wipe', () => {
  const live = cursorsAt(TRIPLE + 5);
  assert.equal(live.length, 3);
  assert.ok(live.every((c) => c.kind === 'arrow'));
  const h0 = cursorsAt(HANG + 0.5);
  const h1 = cursorsAt(HANG + 3.5);
  assert.ok(h0.every((c) => c.kind === 'spinner') && h0.length === 3);
  assert.deepEqual(h1.map((c) => [c.x, c.y]), h0.map((c) => [c.x, c.y]), 'frozen');
  assert.deepEqual(h1.map((c) => c.spin - 1), h0.map((c) => c.spin), 'one step every 3 frames');
  assert.equal(cursorsAt(WIPE.from + 6).length, 0);
});

test('5.4& (C6): the selection snaps its corners in, draws its edges, pops 8 handles, dims the outside 15 %; on +479 it is the whole rect x 300–1620, y 250–830, its ants marching 2 px a frame, T8 typed whole, the cursor on its bottom-right handle', () => {
  assert.equal(selectMarquee(SELECT.from - 1), null);
  const m = selectMarquee(C6 - 1)!;
  assert.deepEqual(m.rect, { x0: 300, y0: 250, x1: 1620, y1: 830 });
  assert.equal(m.handles.length, 8);
  assert.ok(m.handles.every((h) => h.s === 1));
  assert.equal(m.dim, 0.15);
  // Every dash lies on the rect's edge, and they cover 12 of every 20 px of the perimeter.
  const R = SELECT_RECT;
  const onEdge = (p: readonly number[]) => ((Math.abs(p[0] - R.x0) < 0.01 || Math.abs(p[0] - R.x1) < 0.01) && p[1] >= R.y0 - 0.01 && p[1] <= R.y1 + 0.01) || ((Math.abs(p[1] - R.y0) < 0.01 || Math.abs(p[1] - R.y1) < 0.01) && p[0] >= R.x0 - 0.01 && p[0] <= R.x1 + 0.01);
  assert.ok(m.dashes.every(([a, b]) => onEdge(a) && onEdge(b)));
  const inked = m.dashes.reduce((s, [a, b]) => s + dist(a, b), 0);
  const perimeter = 2 * (R.x1 - R.x0 + R.y1 - R.y0);
  assert.ok(Math.abs(inked - (perimeter * ANTS.on) / (ANTS.on + ANTS.off)) < 8 * ANTS.on, `ants cover ${inked.toFixed(0)} px`);
  // Marching: a frame later the pattern has moved 2 px along each edge.
  const top = (f: number) => selectMarquee(f)!.dashes.filter(([a, b]) => a[1] === R.y0 && b[1] === R.y0 && a[0] > R.x0 + 1).map(([a]) => a[0]).sort((x, y) => x - y)[0];
  assert.equal(Math.round((top(C6 - 1) - top(C6 - 2)) * 100) / 100 === ANTS.march || Math.round((top(C6 - 2) - top(C6 - 1)) * 100) / 100 === ANTS.march, true);
  assert.equal(selectMarquee(SELECT.from + 1)!.handles.length, 0, 'handles pop on the chip');
  assert.equal(selectMarquee(SELECT_CHIP)!.handles.length, 8);
  const chip = selectChip(C6 - 1)!;
  assert.equal(chip.text, ORDER_TEXTS[8][0]);
  assert.equal(chip.id, '#80');
  for (let f = SELECT.from; f < C6; f++) {
    const c = cursorsAt(f)[0];
    assert.ok(dist([c.x, c.y], [R.x1 + 8, R.y1 + 8]) < 1, `on the bottom-right handle on ${f}`);
  }
});

test('the work orders: T0–T7 pop on their frames and type a character a frame (a retype keeps the common prefix); only T7 copies itself (4.3a and 3 frames later); a torn order is gone from its tear, T5–T7 from the wipe’s cover', () => {
  const of = (f: number, i: number) => ordersAt(f).find((o) => o.i === i);
  for (let i = 0; i < 8; i++) {
    assert.equal(of(ORDERS[i].from - 1, i), undefined, `T${i} not yet`);
    const o = of(ORDERS[i].from, i)!;
    assert.equal([...o.text].length, 1, `T${i} types from one character`);
    assert.ok(Math.abs(o.scale - 0.6) < 1e-9, `T${i} pops`);
    assert.equal(o.id, `#${SIGNATURE[i]}`);
    if (!ORDER_RETYPES.some((r) => r > ORDERS[i].from && r <= ORDERS[i].from + 4)) assert.equal([...of(ORDERS[i].from + 4, i)!.text].length, Math.min(5, [...o.full].length));
  }
  assert.equal(of(ORDER_RETYPES[0], 2)!.text, 'b', 'T2 retypes (no common prefix)');
  assert.equal(of(ORDER_RETYPES[1], 4)!.text, ORDER_TEXTS[4][1], 'T4 retry 3: only the digit changes');
  for (let f = ORDERS[0].from; f < WIPE_COVER; f++) for (const o of ordersAt(f)) assert.equal(o.copies > 0, o.i === 7 && f >= ORDER_COPIES[0], `copies of T${o.i} on ${f}`);
  assert.equal(of(ORDER_COPIES[1], 7)!.copies, 2);
  const live = (f: number) => ordersAt(f).map((o) => o.i);
  assert.ok(!live(TEARS[0]).includes(0) && !live(TEARS[0]).includes(1));
  assert.ok(!live(TEARS[1]).includes(2));
  assert.ok(!live(TEARS[2]).includes(3) && !live(TEARS[2]).includes(4));
  assert.deepEqual(live(WIPE_COVER - 1), [5, 6, 7]);
  assert.deepEqual(live(WIPE_COVER), []);
});

test('the litter: two halves per torn order flutter onto the floor band and lie there ID up; T0’s and T1’s slide into the heap with the skid; level on the mint ground from 4.1; swept by the restart wipe', () => {
  assert.equal(litterAt(TEARS[0] - 1).length, 0);
  assert.equal(litterAt(TEARS[0]).length, 4);
  assert.equal(litterAt(TEARS[1]).length, 6);
  assert.equal(litterAt(TEARS[2]).length, 10);
  assert.equal(litterAt(WIPE_COVER).length, 0);
  // Landed (≤ 30 frames after the tear): face up, on the band (world y 900–1100), each right half with its ID chip.
  const rest = litterAt(TEARS[0] + 40);
  for (const l of rest) {
    assert.equal(l.sx, 1);
    assert.ok(l.y > 900 && l.y < 1100, `on the band: ${l.y.toFixed(0)}`);
    assert.equal(l.chip !== null, l.half === 1);
  }
  // The skid carries T0's and T1's halves into the heap.
  const a = litterAt(DIZZY - 1).filter((l) => l.i <= 1);
  const b = litterAt(DIZZY + 14).filter((l) => l.i <= 1);
  a.forEach((l, k) => assert.ok(dist([l.x, l.y], [b[k].x, b[k].y]) > 50, `T${l.i} half ${l.half} slides`));
  // On the mint ground they lie level (their own small turn only).
  for (const l of litterAt(DIAMOND + 12)) assert.ok(Math.abs(l.rot) <= 20, `level: ${l.rot}`);
});

test('the POV (3.3& → 3.4&): the red scanline sweeps down 252–255; the reticle locks the ω (220 px), the flipped bracket (+6), then eye.L tightening 220 → 190 → 160 → 130 on the stutter’s 32nds; the readout types out; nothing outside', () => {
  assert.equal(povAt(POV.from - 0.3), null);
  assert.equal(povAt(POV.to), null);
  assert.equal(povAt(POV_SWEEP.from)!.sweep, 0);
  assert.ok(povAt(POV_SWEEP.from + 1.5)!.sweep! > 400);
  assert.equal(povAt(POV_SWEEP.to)!.sweep, null);
  const r0 = povAt(POV.from)!.reticle;
  assert.equal(r0.label, POV_LOCK_TEXTS[0]);
  assert.equal(r0.r, 220);
  assert.ok(dist([r0.x, r0.y], onScreen(POV.from, partAt(POV.from, 'mouth'))) < 1);
  const r1 = povAt(POV.from + 8)!.reticle;
  assert.equal(r1.label, POV_LOCK_TEXTS[1]);
  assert.equal(r1.r, 200);
  STUTTER.forEach((s, k) => {
    const r = povAt(s + 2)!.reticle;
    assert.equal(r.label, POV_LOCK_TEXTS[2]);
    assert.equal(r.r, 220 - 30 * k, `lock ${k}`);
  });
  assert.equal(povAt(POV.to - 1)!.readout, POV_READOUT);
  assert.equal(frameOf(POV.from), POV.from);
});
