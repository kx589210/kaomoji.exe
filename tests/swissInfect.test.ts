// S08, the infection (swiss 5): the Swiss poster of 114 faces and its own type, the Warhol silkscreen wave from his amber card, the
// antivirus's quarantine of three copies and their revival as Four-Marilyns 2×2s, the blink wave, the camera's drift, T2's fronts
// (build sheet §3.10; design final.md §4.6). The poster's data (S08_CARDS, the tints, marilyn) are pinned in tests/build.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILD_THREADS, GUEST_PULSE, OMEGA_AT, S08_CARDS, S08_GUEST, S08_HERO, S08_QUARANTINE, TINTS, marilyn } from '../src/content/build.ts';
import { linear } from '../src/engine/color.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { FLIP, GREY, GUEST_RING, INFECT, PULL, QUARANTINE, REVIVE, STRIPS_OUT, WAVE_DONE, blinkFrame, infectFrame } from '../src/score/build.ts';
import { AMBER, FRONT, type SwissLayout, cardAt, s08Zoom, swissFrame, swissTemporal } from '../src/shots/swiss.ts';
import { INK, PAPER, SWISS_RED } from '../src/worlds/swiss.ts';

const adv = (ch: string) => (ch === ' ' ? 0.28 : '()'.includes(ch) ? 0.36 : 0.62);
const L: SwissLayout = { jp: adv, display: adv, text: adv };
const same = (a: readonly number[], b: readonly number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const TINT = { pink: linear(TINTS.pink), blue: linear(TINTS.blue), yellow: linear(TINTS.yellow), grey: linear(TINTS.grey) };
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** The 112 px squares drawn on card (col, row) at `f` (tints, amber, the guest's red, the revived 2×2's paper). */
const squares = (f: number, col: number, row: number): Shape[] => {
  const [x, y] = cardAt(col, row);
  return swissFrame(f, L).world.under.filter((s) => s.kind === 'rect' && Math.abs(s.x - x) < 60 && Math.abs(s.y - y) < 70 && Math.max(s.w, s.h) > 50 && s.alpha === undefined);
};
/** The glyphs drawn on card (col, row) at `f`, as a string. */
const face = (f: number, col: number, row: number, threads = BUILD_THREADS): string => {
  const [x, y] = cardAt(col, row);
  const fr = swissFrame(f, L, threads);
  return [...fr.world.glyphs.jp, ...fr.world.glyphs.display].filter((g) => Math.abs(g.x - x) < 58 && Math.abs(g.y - y) < 58).map((g) => g.ch).join('');
};
const tintOf = (f: number, col: number, row: number): string | null => {
  const s = squares(f, col, row).find((q) => q.w > 100 && q.h > 100);
  if (!s) return null;
  return (Object.entries(TINT).find(([, c]) => same(s.color, c))?.[0] ?? (same(s.color, AMBER) ? 'amber' : same(s.color, SWISS_RED) ? 'red' : same(s.color, PAPER) ? 'paper' : 'other'));
};

test('the pull lands square on the poster on 5.1: his card amber at (60, 0), the guest’s red, the type, 114 faces; 12 frames to read before anything moves', () => {
  assert.deepEqual(cardAt(S08_HERO[0], S08_HERO[1]), [...OMEGA_AT]);
  const f = PULL.to;
  assert.equal(tintOf(f, 8, 4), 'amber');
  assert.equal(tintOf(f, 12, 2), 'red');
  assert.equal(face(f, 8, 4), '(•ω•)');
  assert.equal(face(f, 12, 2), '(￣▽￣)');
  assert.equal(face(f, 0, 0), 'K');
  assert.equal(face(f, 14, 8), '9');
  for (const c of S08_CARDS.filter((x) => x.kind === 'face')) assert.equal(face(f, c.col, c.row), c.text.replace(/\s/gu, ''), `${c.col},${c.row}`);
  // Nothing changes on the poster before the wave's first step.
  const before = JSON.stringify(swissFrame(f + 1, L).world.glyphs);
  assert.equal(JSON.stringify(swissFrame(INFECT[0] - 1.01, L).world.glyphs), before.replaceAll('"y":', '"y":'), 'a still crowd to read (the camera drifts)');
});

test('the wave: a card at Manhattan distance d from his prints on step ⌈d/2⌉ — the tint wipes in from the edge facing his card, the face swaps to him on the middle frame, a 6 px hop lands on the third', () => {
  for (const c of S08_CARDS.filter((x) => x.tint)) {
    const at = infectFrame(c.col, c.row);
    assert.equal(at, INFECT[Math.ceil(c.d / 2) - 1]);
    assert.equal(tintOf(at - 0.01, c.col, c.row), null, `${c.col},${c.row} still plain`);
  }
  // A card right of his: the wipe starts from its left edge.
  const [x] = cardAt(9, 4);
  const wipe = squares(INFECT[0], 9, 4).find((s) => s.w < 100)!;
  assert.ok(wipe.x - wipe.w / 2 - (x - 56) < 1e-6, 'from the edge facing him');
  assert.ok(squares(INFECT[0] + 1, 9, 4).find((s) => s.w > 60 && s.w < 112), 'still wiping on the middle frame');
  assert.equal(face(INFECT[0] + 0.5, 9, 4), S08_CARDS.find((c) => c.col === 9 && c.row === 4)!.text.replace(/\s/gu, ''));
  assert.equal(face(INFECT[0] + 1, 9, 4), '(•ω•)');
  const y = (f: number) => swissFrame(f, L).world.glyphs.jp.find((g) => Math.abs(g.x - x - 3) < 50 && g.ch === 'ω' && Math.abs(g.y - cardAt(9, 4)[1]) < 20)!.y;
  assert.ok(y(INFECT[0] + 1.5) > y(INFECT[0] + 3) + 4, 'the hop');
  assert.ok(Math.abs(y(INFECT[0] + 3) - (cardAt(9, 4)[1] - 3)) < 1e-9, 'landed, printed 3 px off register');
});

test('on the last step (906) the whole poster is him — the headline and footer type too (with cleanCorner on, the corner’s two blank cards too; by default they sit under the counter tab) — but the guest', () => {
  assert.equal(WAVE_DONE, INFECT[INFECT.length - 1]);
  const f = WAVE_DONE + 3;
  for (const c of S08_CARDS) {
    const got = face(f, c.col, c.row);
    if (c.kind === 'guest') assert.equal(got, '(￣▽￣)');
    else if (c.kind === 'counter' && !BUILD_THREADS.cleanCorner) assert.equal(got, '', `${c.col},${c.row}: under the counter tab`);
    else if (c.quarantine) assert.equal(got, '(•ω•)'.repeat(4), `${c.col},${c.row}: a 2×2`);
    else assert.ok(got === '(•ω•)' || got === '(-ω-)', `${c.col},${c.row}: ${got}`);
  }
});

test('N3 reverted: under the counter tab (the default again) the corner’s two cards draw nothing; with cleanCorner on they are blank cream until the wave reaches them, then printed with him', () => {
  const corner = S08_CARDS.filter((c) => c.kind === 'counter');
  assert.deepEqual(corner.map((c) => [c.col, c.row]), [[14, 0], [15, 0]]);
  for (const c of corner) {
    const at = infectFrame(c.col, c.row);
    const clean = { ...BUILD_THREADS, cleanCorner: true };
    assert.equal(face(PULL.to, c.col, c.row, clean), '', `${c.col},${c.row} blank on 5.1 (clean)`);
    assert.ok(['(•ω•)', '(-ω-)'].includes(face(at + 3, c.col, c.row, clean)), `${c.col},${c.row} is him (clean)`);
    assert.equal(face(at + 3, c.col, c.row), '', `${c.col},${c.row} empty under the counter tab`);
  }
});

test('the guest is never infected: its red card and (￣▽￣) through the bar; on 888 a red ring pulse (r 70 → 120, 3 px, fading over 8 frames) and a 10 px hop', () => {
  for (const f of range(PULL.to, FLIP.from, 3)) {
    assert.equal(tintOf(f, S08_GUEST[0], S08_GUEST[1]), 'red', `${f}`);
    assert.equal(face(f, S08_GUEST[0], S08_GUEST[1]), '(￣▽￣)');
  }
  const ring = (f: number) => swissFrame(f, L).world.over.find((s) => s.kind === 'ring');
  assert.equal(ring(GUEST_RING.from - 0.01), undefined);
  const r = ring(GUEST_RING.from + 4)!;
  assert.ok(Math.abs(r.w / 2 - 95) < 1e-6 && r.r === GUEST_PULSE.width && same(r.color, SWISS_RED) && Math.abs((r.alpha ?? 1) - 0.5) < 1e-9);
  assert.equal(ring(GUEST_RING.to), undefined);
  const [, gy] = cardAt(S08_GUEST[0], S08_GUEST[1]);
  assert.ok(squares(GUEST_RING.from + 3, S08_GUEST[0], S08_GUEST[1])[0].y - gy > 9, 'the hop');
});

test('the quarantine: red cut-paper strips fly in round the three copies from 882 and land on 888; the copies go grey over 888–892; on 900 the strips fly off and each copy reprints as a Four-Marilyns 2×2', () => {
  const strips = (f: number, col: number, row: number) => {
    const [x, y] = cardAt(col, row);
    return swissFrame(f, L).world.over.filter((s) => s.kind === 'rect' && same(s.color, SWISS_RED) && Math.abs(s.x - x) < 200 && Math.abs(s.y - y) < 200);
  };
  for (const [col, row] of S08_QUARANTINE) {
    assert.equal(strips(QUARANTINE.in - 0.01, col, row).length, 0);
    assert.equal(strips(QUARANTINE.in + 1, col, row).length, 4);
    const [x] = cardAt(col, row);
    const left = (f: number) => strips(f, col, row).find((s) => s.h > 100 && s.x < x)!;
    assert.ok(Math.abs(left(QUARANTINE.at).x - (x - 66)) < 1e-6, `landed on 888 round ${col},${row}`);
    assert.ok(left(QUARANTINE.in + 3).x < x - 66 - 20, 'flying in from 40 px out');
    assert.equal(tintOf(GREY.to, col, row), 'grey');
    assert.notEqual(tintOf(GREY.from - 0.01, col, row), 'grey');
    assert.equal(face(REVIVE - 0.01, col, row), '(•ω•)');
    assert.equal(face(STRIPS_OUT.to, col, row), '(•ω•)'.repeat(4));
    assert.ok(strips(REVIVE + 3, col, row).every((s) => (s.alpha ?? 1) < 1), 'the strips fly off');
    assert.equal(strips(STRIPS_OUT.to, col, row).length, 0);
    // The 2×2: pink, yellow and blue quadrants (and one paper), never red or amber.
    const q = squares(REVIVE + 4, col, row).filter((s) => s.w === 56).map((s) => Object.entries(TINT).find(([, c]) => same(s.color, c))?.[0]).sort();
    assert.deepEqual(q, ['blue', 'pink', 'yellow']);
    assert.deepEqual(marilyn(col, row).map((m) => m.tint).sort(), ['blue', 'paper', 'pink', 'yellow']);
  }
});

test('the colour law on the poster: amber only on his card, DEFENDER red only on the guest’s card, its ring and the quarantine strips; no yellow round his card', () => {
  for (const f of [PULL.to, INFECT[2] + 1, QUARANTINE.at + 2, REVIVE + 4, FLIP.from - 1]) {
    const fr = swissFrame(f, L);
    for (const s of [...fr.world.under, ...fr.world.over]) {
      if (same(s.color, AMBER)) assert.ok(Math.hypot(s.x - OMEGA_AT[0], s.y - OMEGA_AT[1]) < 1, `amber off his card at ${f}`);
      if (same(s.color, SWISS_RED)) {
        const guest = Math.hypot(s.x - cardAt(12, 2)[0], s.y - cardAt(12, 2)[1]) < 30;
        const strip = S08_QUARANTINE.some(([c, r]) => Math.hypot(s.x - cardAt(c, r)[0], s.y - cardAt(c, r)[1]) < 200) && s.kind === 'rect' && Math.min(s.w, s.h) < 20;
        assert.ok(guest || strip, `red at ${s.x}, ${s.y} on ${f}`);
      }
    }
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (dc || dr) assert.notEqual(tintOf(f, 8 + dc, 4 + dr), 'yellow', `yellow beside his amber at ${f}`);
  }
  // No two 4-neighbours print the same tint.
  const f = WAVE_DONE + 3;
  const drawn = (x: (typeof S08_CARDS)[number]) => x.tint && !x.quarantine && (x.kind !== 'counter' || BUILD_THREADS.cleanCorner);
  for (const c of S08_CARDS.filter(drawn)) {
    for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const n = S08_CARDS.find((x) => x.col === c.col + dc && x.row === c.row + dr && drawn(x));
      if (n) assert.notEqual(tintOf(f, c.col, c.row), tintOf(f, n.col, n.row), `${c.col},${c.row} and ${n.col},${n.row}`);
    }
  }
});

test('the blink wave: from his card on 900, every copy (the 2×2s too) blinks (-ω-) for 3 frames at 900 + 0.7·d', () => {
  for (const [col, row] of [[8, 4], [9, 4], [0, 0], [15, 8], [10, 5]] as const) {
    const at = blinkFrame(col, row);
    assert.ok(!face(at - 0.01, col, row).includes('-ω-'), `${col},${row} open before`);
    assert.ok(face(at + 1, col, row).includes('(-ω-)'), `${col},${row} shut at ${at + 1}`);
    assert.ok(!face(at + 3, col, row).includes('-ω-'), `${col},${row} open after`);
  }
  assert.equal(blinkFrame(8, 4), REVIVE);
});

test('the camera drifts in toward his card (1 → 1.03 about (60, 0) by 900), back square for the flip on 5.3, and stays square under T2', () => {
  assert.equal(s08Zoom(PULL.to), 1);
  assert.ok(Math.abs(s08Zoom(REVIVE) - 1.03) < 1e-9);
  assert.equal(s08Zoom(FLIP.from), 1);
  for (const f of range(PULL.to + 1, FLIP.from)) {
    const c = swissFrame(f, L).camera;
    const z = FRONT / c.position[2];
    assert.ok(z > 1 - 1e-9, `${f}`);
    const sx = (OMEGA_AT[0] - c.target[0]) * z;
    assert.ok(Math.abs(sx - OMEGA_AT[0]) < 1e-6 && Math.abs((OMEGA_AT[1] - c.target[1]) * z) < 1e-6, `about his card at ${f}`);
  }
  for (const f of range(FLIP.from, FLIP.to)) assert.deepEqual([...swissFrame(f, L).camera.position], [0, 0, FRONT], `square under T2 at ${f}`);
});

test('the infection is photographed on 32 sub-frames (874–910)', () => {
  for (const f of range(874, 911)) assert.ok(swissTemporal(f).samples >= 32, `${f}`);
});

test('with the infection off: v04’s ripple and blink over the recast poster — no tints, no strips; with the type cards off, blank cards', () => {
  const off = { ...BUILD_THREADS, infection: false };
  const fr = swissFrame(WAVE_DONE + 3, L, off);
  assert.equal(fr.world.under.filter((s) => s.kind === 'rect' && Object.values(TINT).some((c) => same(s.color, c))).length, 0);
  assert.equal(fr.world.over.length, 0);
  assert.equal(face(PULL.to + 2, 3, 6, off), '(´；д；`)', 'the recast face');
  assert.equal(face(WAVE_DONE + 3, 3, 6, off), '(<_<)', 'v04’s ripple swaps it for another face of the cast');
  const noType = swissFrame(PULL.to + 2, L, { ...BUILD_THREADS, typeCards: false });
  assert.equal(noType.world.glyphs.display.length, 0);
  assert.ok(same(INK, INK) && same(PAPER, PAPER));
});

test('the press thumps on every print step: the poster jolts in (≤ 0.6 %) and back over a sixteenth, ending square for the flip', () => {
  for (const at of INFECT) {
    assert.ok(s08Zoom(at + 1.5) - s08Zoom(at + 1.5, { ...BUILD_THREADS, infection: false }) > 0.005, `a thump on ${at}`);
    assert.ok(s08Zoom(at + 4) - s08Zoom(at + 4, { ...BUILD_THREADS, infection: false }) > 0.0015, `still easing out after ${at}`);
    assert.equal(s08Zoom(at), s08Zoom(at, { ...BUILD_THREADS, infection: false }), `none before ${at}`);
  }
  assert.equal(s08Zoom(FLIP.from), 1);
});
