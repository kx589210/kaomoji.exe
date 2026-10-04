// The flat world around the hero, break bars 2–5 (src/shots/breakWorld.ts): the landed glass, the pooling morph into blocks, the
// presses, the diamond wipe, break bar 5's relayout, the peekers, the repeater, the restart wipe, and how the flat part samples time.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BAR22_BLOCKS, BAR25_BLOCKS } from '../src/shots/breakShared.ts';
import {
  LANDED,
  PANELS,
  fanAt,
  flatSegment,
  flatTemporal,
  groundAt,
  panelsAt,
  peekAt,
  rippleAt,
  washAt,
  worldAt,
} from '../src/shots/breakWorld.ts';
import { partFrame } from '../src/score/film.ts';

/** The break's bar `bar`, beat `beat` (both 1-based, fractions allowed: break 2.1& = at(2, 1.5)), as a film frame. */
const at = (bar: number, beat = 1): number => partFrame('break', bar, beat - 1);

const near = (a: number, b: number, eps: number, msg: string): void => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);

test('the 33 visible blank pieces land where Appendix B says (centroid, clockwise angle, colour)', () => {
  assert.equal(LANDED.length, 33);
  const want: [number, number, number, number, string][] = [
    // Iteration 2 (ruling 1): P1 is cell 33, the pane above his face; cell 46 lets go with K6 as a card.
    [33, 1040, 970, 23.95, 'violet'],
    [46, 1446, 251, 6.17, 'violet'],
    [66, 190, 985, -10.3, 'yellow'],
    [69, 331, 1211, 4.8, 'coral'],
    [55, 765, 1181, -6.1, 'coral'],
    [42, 1181, 936, 7.0, 'mint'],
    [39, 642, 878, 9.5, 'coral'],
    [65, 308, -157, -1.9, 'yellow'],
    [47, 1305, 35, -9.7, 'violet'],
  ];
  for (const [k, x, y, a, c] of want) {
    const p = LANDED.find((l) => l.cell === k);
    assert.ok(p, `cell ${k}`);
    near(p.at[0], x, 0.5, `x of ${k}`);
    near(p.at[1], y, 0.5, `y of ${k}`);
    near(p.angle, a, 0.05, `angle of ${k}`);
    assert.equal(p.color, c, `colour of ${k}`);
  }
  for (const off of [62, 63, 64, 70, 71, 72]) assert.ok(!LANDED.some((l) => l.cell === off), `off-frame cell ${off} is never drawn`);
});

test('the ground: cream from 22.1, mint once the diamond covers the frame, cream again under the restart wipe', () => {
  assert.equal(groundAt(at(2)), 'cream');
  assert.equal(groundAt(at(4, 1.375)), 'cream');
  assert.equal(groundAt(at(4, 1.5) - 2), 'mint');
  assert.equal(groundAt(at(4, 4.75) - 1), 'mint');
  assert.equal(groundAt(at(4, 4.75)), 'cream');
  assert.equal(groundAt(at(6) - 1), 'cream');
});

test('22.1: the landed pieces lie flat, each with its outline and a full (12, 12) hard shadow; no blocks yet', () => {
  const w = worldAt(at(2));
  assert.equal(w.items.length, 33);
  for (const it of w.items) {
    assert.equal(it.polys.length, 1);
    assert.equal(it.shape, 0);
    assert.equal(it.outline, 6);
    assert.deepEqual(it.shadow, [12, 12]);
  }
});

test('the pooling morph: by 2061 the world is the four blocks and four confetti, the glass gone', () => {
  const w = worldAt(at(2, 2.875));
  assert.equal(w.items.filter((i) => i.polys.length > 0).length, 0);
  assert.equal(w.items.filter((i) => i.role === 'block').length, 4);
  assert.equal(w.items.filter((i) => i.role === 'confetti').length, 4);
  assert.equal(w.items.length, 8);
  const mid = worldAt(at(2, 2.25));
  assert.ok(mid.items.some((i) => i.polys.length > 1 && i.role === 'block'), 'mid-morph: polygons pool into a block by colour');
});

test('blocks sit at bar 22’s layout, breathing ±2 % and ±2° (R1-11), pressing into their shadows on the kicks', () => {
  const blk = (f: number, c: string) => worldAt(f).items.find((i) => i.role === 'block' && i.colorName === c)!;
  for (const c of ['yellow', 'violet', 'coral', 'mint'] as const) {
    const b = blk(at(2, 4.5), c);
    const want = BAR22_BLOCKS[c];
    near(b.x, want.x, 1.5, `${c} x`);
    near(b.y, want.y, 1.5, `${c} y`);
    near(b.rot, want.rot, 2.01, `${c} rot`);
    near(b.scale, 1, 0.0201, `${c} scale`);
  }
  const before = blk(at(3) - 1, 'coral');
  const pressed = blk(at(3) + 2, 'coral');
  assert.ok(pressed.x - before.x > 6 && pressed.y - before.y > 6, 'pressed (+8, +8)');
  assert.ok(pressed.shadow[0] < 6, `shadow shrinks toward 4: ${pressed.shadow[0]}`);
  near(blk(at(3, 1.5), 'coral').shadow[0], 12, 0.01, 'recovered');
});

test('24.1: the mint block spins, grows ×6 and becomes the ground; a cream square pops into its place', () => {
  const mint = (f: number) => worldAt(f).items.find((i) => i.role === 'block' && i.colorName === 'mint');
  const m = mint(at(4) + 1)!; // a launch on the kick (integration v02): about half-way a frame after it
  assert.ok(m.scale > 2 && m.scale < 5.5, `mid-wipe scale ${m.scale}`);
  near(mint(at(4, 1.5) - 2.1)!.scale, 6, 0.05, 'full');
  assert.equal(mint(at(4, 1.5) - 2), undefined, 'the mint block is the ground now');
  assert.ok(worldAt(at(4, 1.5)).items.some((i) => i.colorName === 'cream'), 'the cream square');
  assert.ok(!worldAt(at(4, 1.25) - 1).items.some((i) => i.colorName === 'cream'), 'not before 2214');
});

test('bar 25: no blocks under the cover, then they spring in from the centre out to the clean grid layout', () => {
  assert.equal(worldAt(at(4, 4.75) + 2).items.filter((i) => i.role === 'block').length, 0);
  const blocks = (f: number) => worldAt(f).items.filter((i) => i.role === 'block');
  assert.deepEqual(blocks(at(5, 1.125)).map((b) => b.colorName), ['coral']);
  assert.equal(blocks(at(5, 1.375)).length, 4);
  for (const b of blocks(at(5, 2.5))) {
    const want = BAR25_BLOCKS[b.colorName as keyof typeof BAR25_BLOCKS];
    near(b.x, want.x, 0.5, `${b.colorName} x`);
    near(b.y, want.y, 0.5, `${b.colorName} y`);
    near(b.rot, 0, 2.01, `${b.colorName} rot`);
  }
});

test('one peeker at a time; the guest is caught in the stutter and gone when time jumps back', () => {
  for (let f = at(2); f < at(5); f++) assert.ok(peekAt(f).length <= 1, `two peekers on ${f}`);
  for (const f of [at(3, 4), at(3, 4.125), at(3, 4.25), at(3, 4.5) - 1]) assert.equal(peekAt(f)[0]?.face, '|_￣))', `guest on ${f}`);
  assert.notEqual(peekAt(at(3, 4.5))[0]?.face, '|_￣))');
});

test('the fan: eight copies spread sideways about a point far above him (±0.45 / 0.9 / 1.35 / 1.8°: ±79–315 px) on 25.2, breathing; folded and gone from the ripple', () => {
  const fan = fanAt(at(5, 2.5) - 1);
  assert.equal(fan.length, 8);
  const angles = fan.map((c) => c.angle).sort((a, b) => a - b);
  [-1.8, -1.35, -0.9, -0.45, 0.45, 0.9, 1.35, 1.8].forEach((a, i) => near(angles[i], a, 0.08, `copy ${i}`));
  for (const c of fan) assert.ok(c.pivot[1] < -5000, 'the pivot is far above him');
  assert.equal(fanAt(at(5, 2) - 1).length, 0);
  assert.equal(fanAt(at(5, 4) + 1).length, 0);
  const r = rippleAt(at(5, 4.25) - 2);
  assert.equal(r.length, 3);
  assert.ok(r.every((c) => c.scale >= 1 && c.scale <= 1.6));
  assert.equal(rippleAt(at(5, 4.875)).length, 0);
});

test('the colour-stack restart wipe: fully covered on 24.4& + 6, its last panel leaving on 25.1 (past his face; ruling 2), clear on 2305, light → dark → light', () => {
  assert.deepEqual(PANELS.map((p) => p.color), ['yellow', 'mint', 'coral', 'violet']);
  const cover = (f: number) => panelsAt(f).filter((p) => p.x0 <= 0 && p.x1 >= 1920).length;
  assert.equal(cover(at(4, 4.75)), 4);
  assert.ok(panelsAt(at(5)).every((p) => p.x0 >= 1700), 'only a sliver at the right edge on 2304');
  assert.equal(panelsAt(at(5) + 1).length, 0);
  assert.equal(panelsAt(at(4, 4.5) - 1).length, 0);
  assert.ok(panelsAt(at(4, 4.5) + 1).length >= 1);
});

test('the hang washes the frame out from 24.4 and holds it under the wipe', () => {
  assert.equal(washAt(at(4, 4) - 1), 0);
  near(washAt(at(4, 4.25)), 1, 1e-9, 'full');
  near(washAt(at(4, 4.75) - 1), 1, 1e-9, 'held');
  assert.equal(washAt(at(4, 4.75)), 0);
});

test('time: one segment to the stutter’s end and one to the match cut; 1 sample in the stutter, 32 on the fast moves', () => {
  assert.deepEqual(flatSegment(at(3, 4.5) - 1), { from: at(1), to: at(3, 4.5) });
  assert.deepEqual(flatSegment(at(3, 4.5)), { from: at(3, 4.5), to: at(6) });
  assert.deepEqual(flatSegment(at(6) - 1), { from: at(3, 4.5), to: at(6) });
  for (const f of [at(3, 4), at(3, 4.25), at(3, 4.5) - 1]) assert.equal(flatTemporal(f).samples, 1);
  for (const f of [at(2), at(2, 2), at(2, 2.75), at(2, 3) - 1, at(3), at(3, 2.5), at(4) + 2, at(4, 2.875), at(4, 4.625), at(5, 2) + 2]) assert.ok(flatTemporal(f).samples >= 32, `${f}`);
  assert.equal(flatTemporal(at(2, 4.5)).samples, 16);
  // No sub-frame of the stutter's last frame reaches past the time jump.
  for (const s of temporalSamples(at(3, 4.5), flatTemporal(at(3, 4.5)), flatSegment(at(3, 4.5)))) assert.ok(s.frame >= at(3, 4.5));
});

test('the diamond spreads under the other blocks: during the wipe the mint block is drawn first', () => {
  const items = worldAt(at(4, 1.25)).items;
  assert.equal(items[0].colorName, 'mint');
  assert.equal(items[0].role, 'block');
  assert.ok(items.findIndex((i) => i.colorName === 'violet' && i.role === 'block') > 0);
});

test('the gasp: four shocked faces pop out from behind the blocks into clear view (on screen, their centres off every block)', async () => {
  const { shockedAt } = await import('../src/shots/breakWorld.ts');
  const { breakCam, toScreen, rotate } = await import('../src/shots/breakShared.ts');
  assert.equal(shockedAt(at(4, 4) + 2).length, 0);
  const faces = shockedAt(at(4, 4.5) - 2);
  assert.equal(faces.length, 4);
  const blocks = worldAt(at(4, 4.5) - 2).items.filter((i) => i.role === 'block' || i.role === 'square');
  for (const s of faces) {
    const [x, y] = toScreen(breakCam(at(4, 4.5) - 2), s.x, s.y);
    assert.ok(x > 150 && x < 1770 && y > 100 && y < 980, `${s.key} on screen at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    for (const b of blocks) {
      const [lx, ly] = rotate(s.x - b.x, s.y - b.y, -b.rot);
      assert.ok(Math.abs(lx) > b.hx * b.scale || Math.abs(ly) > b.hy * b.scale, `${s.key} sits on the ${b.colorName} block`);
    }
  }
});

test('the second peeker comes out low enough to be seen whole below the frame’s top, right of the bracket’s loop', async () => {
  const { breakCam, toScreen } = await import('../src/shots/breakShared.ts');
  const p = peekAt(at(3, 1.875))[0];
  assert.ok(p && p.face.startsWith('( ° ∀ ° )'));
  const [x, y] = toScreen(breakCam(at(3, 1.875)), p.x, p.y);
  assert.ok(y - 0.5 * 80 * breakCam(at(3, 1.875)).zoom > 0, `its top on screen (${y.toFixed(0)})`);
  assert.ok(x > 450, `right of the loop (${x.toFixed(0)})`);
});

test('bar 25: dancers sharing a block stand far enough apart, and the forgiven guest waves from beside the violet block, clear of the cat', async () => {
  const { dancersAt } = await import('../src/shots/breakWorld.ts');
  const { breakCam, toScreen } = await import('../src/shots/breakShared.ts');
  const { CAT, GUEST_WAVE, DANCERS } = await import('../src/content/castBreak.ts');
  const d = dancersAt(at(5, 3.5));
  const on = (faces: readonly string[]) => d.filter((q) => faces.includes(q.key));
  const mint = on(DANCERS.mint);
  assert.equal(mint.length, 2);
  assert.ok(Math.abs(mint[0].x - mint[1].x) >= 300, 'mint pair apart');
  const coral = on(DANCERS.coral);
  assert.ok(Math.abs(coral[0].x - coral[1].x) >= 320, 'coral pair apart');
  const cat = d.find((q) => q.key === CAT)!;
  const guest = d.find((q) => q.key === GUEST_WAVE)!;
  assert.ok(Math.hypot(cat.x - guest.x, cat.y - guest.y) >= 280, 'guest clear of the cat');
  const [gx] = toScreen(breakCam(at(5, 3.5)), guest.x, guest.y);
  assert.ok(gx > 200 && gx < 1720, `guest on screen (${gx.toFixed(0)})`);
});

test('the dancers swap poses whole on 25.3& (iteration 2: they are on the blocks for 25.3 only): every sub-frame of the swap frame shows the new poses, none of the frame before', async () => {
  const { dancersAt } = await import('../src/shots/breakWorld.ts');
  for (const swap of [at(5, 3.5)]) {
    const keys = (f: number): string => dancersAt(f).slice(0, 6).map((d) => d.key).join('|');
    const before = keys(swap - 1);
    const after = keys(swap + 1);
    assert.notEqual(before, after, `a swap on ${swap}`);
    for (const s of temporalSamples(swap, flatTemporal(swap), flatSegment(swap))) assert.equal(keys(s.frame), after, `sub-frame ${s.frame.toFixed(3)} of ${swap}`);
    for (const s of temporalSamples(swap - 1, flatTemporal(swap - 1), flatSegment(swap - 1))) assert.equal(keys(s.frame), before, `sub-frame ${s.frame.toFixed(3)} of ${swap - 1}`);
  }
});

test('the guest is caught whole in the stutter: on 2184 all of |_￣)) is on screen, its own "|" against the frame’s left edge', () => {
  const g = peekAt(at(3, 4)).find((p) => p.color === 'red')!;
  assert.ok(g && g.screen, 'the guest peeks on 2184, fixed to the screen');
  const w = 0.62 * [...g.face].length * g.size;
  const left = g.x - w / 2;
  assert.ok(left >= 0 && left <= 20, `left edge ${left.toFixed(1)} px`);
});

test('the stutter’s glitch lands on its four 32nds: fresh slices on 2184, 2187, 2190 and 2193, each settling (same slices, shrinking offsets) until the next', async () => {
  const { glitchAt } = await import('../src/shots/breakWorld.ts');
  const layout = (out: number): string => glitchAt(out).map((b) => `${b.y0.toFixed(2)}:${b.y1.toFixed(2)}`).join(',');
  for (const s of [at(3, 4), at(3, 4.125), at(3, 4.25), at(3, 4.375)]) {
    const a = glitchAt(s);
    assert.ok(a.length >= 4, `slices on ${s}`);
    if (s > at(3, 4)) assert.notEqual(layout(s), layout(s - 1), `fresh slices on ${s}`);
    for (const k of [1, 2]) {
      const b = glitchAt(s + k);
      assert.equal(layout(s + k), layout(s), `the same slices on ${s + k}`);
      b.forEach((band, i) => assert.ok(Math.abs(band.dx) < Math.abs(glitchAt(s + k - 1)[i].dx) && Math.abs(band.dx) > 0, `slice ${i} settles on ${s + k}`));
    }
  }
  assert.equal(glitchAt(at(3, 4.5)).length, 0, 'gone when time jumps back');
});
