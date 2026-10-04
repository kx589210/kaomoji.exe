// S31 OVERFLOW (drop2 7.1–8.1 − 1; as built: sheet §5.8; moved by a bar and its whip-pan landing in the kernel: the 20-bar sheet
// notes/bid2/drop2-sheet2.md §1.3 F, §6.3): he surfs the party monitor's memory gauge past every programmer's limit until the integer
// wraps to 0x80000000, kernel space, and flings him there. The story, read back from the pure module (src/shots/drop2Overflow.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KERNEL_TEXT, MONITOR2 } from '../src/content/drop2.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BOW, CRACK, FRIENDS_ROLLS, KERNEL, PAN, SNAP, SURF, TILT, WRAP } from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { HANDOFFS } from '../src/shots/drop2Shared.ts';
import { formatFriends } from '../src/shots/hud.ts';
import { FRONT } from '../src/shots/swiss.ts';
import {
  CARD,
  HEX_AT,
  KERNEL_LANDING,
  MON,
  NAVE_PILLARS,
  PAN_STREAKS,
  panWorld,
  snapSparks,
  OVERFLOW_STRINGS,
  type OverflowLayout,
  bowAmplitude,
  crackAt,
  frontAt,
  friendsAt,
  hypeAt,
  memoryAt,
  memoryText,
  odometerGlyphs,
  overflowCamX,
  overflowContent,
  snapPieces,
  surfer,
  wallDx,
  wallLean,
  warningsAt,
  wrapAt,
} from '../src/shots/drop2Overflow.ts';

const L: OverflowLayout = { mono: () => 0.6, jp: (s) => 0.9 * [...s].length, rounded: (ch) => ('()'.includes(ch) ? 0.4 : 0.8) };
/** Drop 2's bar `bar`, beat `beat` (both 1-based, as src/score/drop2.ts writes them), as a film frame. */
const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

test('the odometer counts the programmer’s limits on the kicks — 256, 65,536, 16,777,216, 2,147,483,647 — climbing by powers of two on the 16ths, and +1 wraps it to −2,147,483,648', () => {
  assert.equal(memoryAt(SURF[0] - 1), 255, 'it arrives at 255 % (0xFF), the FULL COMBO’s');
  assert.deepEqual(SURF.map(memoryAt), [256, 65536, 16777216, 2147483647]);
  assert.equal(memoryAt(WRAP), -2147483648);
  assert.equal(memoryAt(WRAP - 1), 2147483647, 'INT_MAX holds until the wrap');
  for (let f = SURF[0]; f < SURF[3]; f++) assert.ok(memoryAt(f + 1) >= memoryAt(f), `${f}: never counts down before the wrap`);
  for (const f of range(SURF[0], SURF[3], 6)) assert.ok(Number.isInteger(Math.log2(memoryAt(f))), `${f}: ${memoryAt(f)} is a power of two`);
  for (const f of range(SURF[0], WRAP)) if (f % 6 !== 0) assert.equal(memoryAt(f), memoryAt(f - (f % 6)), `${f}: it ticks on the 16ths only`);
});

test('the memory prints with hud.ts’s commas, in amber below 65,536 and in pink from there', () => {
  assert.equal(memoryText(SURF[1]), formatFriends(65536));
  assert.deepEqual(SURF.map(memoryText), [...MONITOR2.memory.slice(0, 4)]);
  assert.equal(memoryText(WRAP), MONITOR2.memory[4]);
  const colour = (f: number) => odometerGlyphs(f + 4).find((g) => /\d/.test(g.ch))!.color;
  assert.ok(colour(SURF[0])[1] > colour(SURF[1])[1], 'amber (more green) before 65,536, pink from it');
});

test('friends roll ∞ → ∞+1 → ∞×2 → ∞^∞ → NaN and hype ∞ → ERR on the wrap', () => {
  assert.equal(friendsAt(FRIENDS_ROLLS[0] - 1), '∞');
  assert.deepEqual(FRIENDS_ROLLS.map(friendsAt), [...MONITOR2.friends.slice(1)]);
  assert.equal(hypeAt(WRAP - 1), '∞');
  assert.equal(hypeAt(WRAP), 'ERR');
});

test('the fill front lands on the kicks: 700 on drop2 6.1 (impact), the surge settles at 1300, it hits the wall (1824) exactly on drop2 6.3, bows, then gushes out after the snap', () => {
  assert.equal(frontAt(SURF[0]), 700);
  assert.ok(frontAt(SURF[1] + 5) > 1250, `the surge launched on drop2 6.2 carries it to 1300 within a 16th (${frontAt(SURF[1] + 5).toFixed(0)})`);
  assert.ok(Math.abs(frontAt(BOW - 7) - 1380) < 15, `then +40 a 16th (${frontAt(BOW - 7).toFixed(0)})`);
  assert.ok(frontAt(SURF[1] - 1) < 760, 'nothing surges before the kick');
  assert.equal(frontAt(BOW), MON.wall);
  for (let f = d2at(5, 4.5); f < SNAP + 20; f += 0.25) assert.ok(Math.abs(frontAt(f + 0.25) - frontAt(f)) < 160, `${f}: the front never jumps`);
  assert.ok(frontAt(SNAP + 12) > 2300, 'after the snap the fill pours out past the wall');
  assert.ok(frontAt(WRAP + 3) < frontAt(WRAP - 1) - 1000, 'the wrap yanks the fill back left');
});

test('he surfs 110 px behind the front, feet on the gauge, until the snap; then rides out with the gush', () => {
  for (const f of range(SURF[0], SNAP)) {
    const s = surfer(f);
    assert.ok(Math.abs(s.x - (frontAt(f) - MON.hero.behind)) < 1e-6, `${f}: x = front − 110`);
    // (His squash and his pump keep his feet planted: the centre drops by the height he loses.)
    assert.ok(Math.abs(s.y - (MON.y0 + MON.hero.centreY)) < 24, `${f}: on the gauge top (bob ±6, squash and pump ≤ 17)`);
    assert.equal(s.face, 'ᕕ(•ω•)ᕗ');
  }
  assert.ok(Math.abs(surfer(SNAP + 12).x - (1874 + 26 * 12)) < 1e-6);
});

test('H3: he lands surfing on drop2 7.1 at screen (590, 380), 420 px wide; flung one turn, he lands in the kernel on drop2 8.1 at its HANDOFFS place, 600 px of ink, his amber self (•ω•)', () => {
  const h3 = HANDOFFS.find((h) => h.frame === SURF[0])!;
  const s = surfer(SURF[0]);
  const cam = { x: overflowCamX(SURF[0]), y: MON.y0 + 540 };
  // (The landing's squash keeps his feet on the gauge, so his centre sits up to 10 px lower on the landing frame.)
  assert.ok(Math.abs(s.x - cam.x + 960 - h3.centre[0]) < 1 && Math.abs(s.y - cam.y + 540 - h3.centre[1]) <= 10, `screen (${(s.x - cam.x + 960).toFixed(0)}, ${(s.y - cam.y + 540).toFixed(0)})`);
  assert.equal(s.width, h3.width);
  const k = HANDOFFS.find((h) => h.frame === KERNEL.from)!;
  assert.deepEqual([k.face, k.width, ...k.centre], ['(•ω•)', KERNEL_LANDING.ink, KERNEL_LANDING.x, KERNEL_LANDING.y], 'the kernel’s first frame is where the pan lands him');
  const end = surfer(PAN.to - 1e-3);
  const camEnd = overflowCamX(PAN.to - 1e-3);
  assert.ok(Math.abs(end.x - camEnd + 960 - k.centre[0]) < 3 && Math.abs(end.y - MON.y0 - k.centre[1]) < 2, 'at the kernel’s landing on screen as the pan lands');
  assert.ok(Math.abs(0.955 * end.width - k.width) < 2, '600 px of bracket-to-bracket ink');
  assert.equal(end.face, '(•ω•)');
  assert.deepEqual([end.tube, end.level, end.arms], [0, 1, 0], 'his amber self, no arms: no neon tube (the reel no longer follows)');
  assert.ok(Math.abs(surfer(PAN.to - 1e-3).rot - 2 * Math.PI) < 0.05 && surfer(WRAP).rot < 0.5, 'one counter-clockwise turn');
  // A slam lands at its fastest (≈ 2500 px a frame), so a thousandth of a frame before the landing it is still ≈ 2.5 px out.
  assert.ok(Math.abs(overflowCamX(PAN.to - 1e-3) + 2400) < 3, 'the camera lands at C.x −2400 (as built)');
  assert.equal(overflowCamX(PAN.to), -2400);
});

test('the wall bows like rubber: the gauge row bulges 190 px on drop2 6.3 + 3, settles to 160 by + 9, the top and bottom rows never move', () => {
  assert.equal(bowAmplitude(BOW - 1), 0);
  assert.ok(Math.abs(bowAmplitude(BOW + 3) - 190) < 8, `${bowAmplitude(BOW + 3).toFixed(0)}`);
  assert.ok(Math.abs(bowAmplitude(BOW + 9) - 160) < 6);
  assert.equal(wallDx(8, BOW + 3), bowAmplitude(BOW + 3));
  assert.ok(wallDx(5, BOW + 3) > 0 && wallDx(5, BOW + 3) < wallDx(7, BOW + 3), 'a cosine falloff');
  for (const r of [0, 1, 15, 16]) assert.equal(wallDx(r, BOW + 3), 0, `row ${r} is fixed`);
  assert.ok(wallLean(5, BOW + 3) > 0 && wallLean(11, BOW + 3) < 0 && wallLean(8, BOW + 3) === 0, 'the rows lean along the curve: out at the foot above the bulge, at the head below it');
});

test('the crack: on the clap two ═ become ╪ and ╬ around a 3-cell gap, widening a cell a 16th to 6', () => {
  assert.equal(crackAt(CRACK - 1), null);
  assert.equal(crackAt(CRACK)!.gap[1] - crackAt(CRACK)!.gap[0] + 1, 3);
  assert.equal(crackAt(CRACK + 18)!.gap[1] - crackAt(CRACK + 18)!.gap[0] + 1, 6);
  const top = (f: number) => overflowContent(f, L).monitor.glyphs.mono!.filter((g) => Math.abs(g.y - (540 - MON.y0 - MON.top - MON.cellH / 2)) < 1);
  const chars = top(CRACK + 1).map((g) => g.ch).join('');
  assert.ok(chars.includes('╪') && chars.includes('╬'), 'the crack’s glyphs are drawn');
});

test('the snap: the bowed wall, both corners and the last six cells of the top and bottom rows fly off right, spinning and falling', () => {
  assert.equal(snapPieces(SNAP - 1.01).length, 0, 'launched on the frame before drop2 6.3&');
  const at = snapPieces(SNAP);
  assert.equal(at.length, 15 + 2 + 12);
  const later = snapPieces(SNAP + 10);
  for (let i = 0; i < at.length; i++) {
    assert.ok(later[i].x > at[i].x + 250, `piece ${i} flies right`);
    assert.ok(Math.abs(later[i].rot - at[i].rot) > 0.5, `piece ${i} spins`);
  }
  assert.ok(later.reduce((s, p, i) => s + p.y - at[i].y, 0) > 0, 'and falls');
});

test('the warnings stack with the newest on row 15 and type in', () => {
  assert.deepEqual(warningsAt(SURF[1] + 20).map((w) => w.text), [MONITOR2.w4[1], MONITOR2.overflow[0]]);
  assert.deepEqual(warningsAt(WRAP + 10).map((w) => w.row), [13, 14, 15]);
  assert.equal(warningsAt(WRAP + 10)[2].text, MONITOR2.overflow[2]);
});

test('every character the monitor draws is in OVERFLOW_STRINGS, so the atlases have it', () => {
  for (const f of range(TILT.from, PAN.to, 2)) {
    const c = overflowContent(f + 0.5, L);
    for (const layer of [c.monitor, c.faces, c.pieces])
      for (const [k, gs] of Object.entries(layer.glyphs)) {
        const atlas = new Set(OVERFLOW_STRINGS[k as keyof typeof OVERFLOW_STRINGS]);
        for (const g of gs) assert.ok(atlas.has(g.ch), `${f}: ${g.ch} is not in the ${k} atlas`);
      }
    const p = panWorld(f + 0.5);
    for (const layer of [p.glass, p.light]) for (const g of layer.glyphs.rounded ?? []) assert.ok(OVERFLOW_STRINGS.rounded.includes(g.ch), `${f}: ${g.ch} is not in the rounded atlas`);
  }
});

// ——— Round-1 fixes (R1-05, R1-pan-over-black, R1-10, R1-s31-idle-and-snap) ————————————————————————————————————————————————————

/** Where a world point (layout px, at depth z) lands on screen at `f` (the camera trucks and pans along x; C.y is the monitor's). */
const onScreen = (x: number, z: number, f: number): number => 960 + ((x - overflowCamX(f)) * FRONT) / (FRONT - z);
const flat = (g: { x: number; y: number }) => [g.x + 960, 540 - g.y] as const;

// Iteration 2 (the director's ruling 7; sync review 1): the whip-pan slams onto drop2 7.1 — the camera eases in and is fastest on its last
// frame, so the card and the tube lines arrive in the pan's last frames and the biggest change lands on the downbeat (drop2 7.1).
test('the whip-pan slams onto drop2 7.1: still on the wrap, its step a frame grows every frame and is the largest into drop2 7.1', () => {
  const steps = range(WRAP + 1, PAN.to + 1).map((f) => overflowCamX(f - 1) - overflowCamX(f));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], `faster every frame: ${steps.map((x) => x.toFixed(0)).join(' ')}`);
  assert.ok(steps.at(-1)! > 0.2 * (overflowCamX(WRAP) + 2400), `the last frame pans ${steps.at(-1)!.toFixed(0)} px`);
  assert.equal(overflowCamX(WRAP), overflowCamX(WRAP - 1), 'still on the wrap');
});

test('F: the whip-pan carries the kernel’s nave in — two rows of eight red process pillars receding to the core, hung where the pan lands; off screen as the wrap fires, in frame over the landing’s last sub-frames', () => {
  assert.equal(NAVE_PILLARS.length, 16, '16 processes');
  const pillars = (f: number) => panWorld(f).glass.under.filter((s) => (s.z ?? 0) === 0 && s.x < CARD.x + 960 + 1000);
  const mine = pillars(PAN.to - 1e-3).slice(0, NAVE_PILLARS.length);
  NAVE_PILLARS.forEach((p, i) => {
    const s = mine[i];
    assert.ok(Math.abs(s.x - (p.x + CARD.x - 960)) < 1e-6 && Math.abs(s.y - (540 - ((p.y0 + p.y1) / 2 + CARD.y))) < 1e-6, `pillar ${i} at its place in the landing frame`);
  });
  // Receding to the core: thinner and shorter toward the middle, the rows mirrored about x 960.
  for (let k = 1; k < 8; k++) assert.ok(NAVE_PILLARS[2 * k].w < NAVE_PILLARS[2 * k - 2].w && NAVE_PILLARS[2 * k].y0 - NAVE_PILLARS[2 * k].y1 < NAVE_PILLARS[2 * k - 2].y0 - NAVE_PILLARS[2 * k - 2].y1);
  for (let k = 0; k < 8; k++) assert.ok(Math.abs(NAVE_PILLARS[2 * k].x + NAVE_PILLARS[2 * k + 1].x - 1920) < 1e-9);
  const visible = (f: number) =>
    pillars(f).slice(0, NAVE_PILLARS.length).filter((s) => {
      const x = onScreen(flat(s)[0], 0, f);
      return x > 0 && x < 1920;
    }).length;
  assert.equal(visible(WRAP), 0, 'off to the left as the wrap fires');
  assert.ok(visible(PAN.to - 0.25) >= 12, `nearly all of them in the landing frame’s first sub-frame (${visible(PAN.to - 0.25)})`);
  // Defender's colours only: emissive red pillars (one pulsing on each 16th), red and green lines between.
  const red = panWorld(PAN.to - 1).light.under.filter((s) => s.color[0] > s.color[1] * 4);
  assert.ok(red.length >= 2 * NAVE_PILLARS.length, 'the pillars glow red');
});

test('the odometer reads the wrap for what it is: −2,147,483,648 % on the wrap, and a 16th later its digits roll over to 0x80000000 (kernel space), inside the pan’s blur', () => {
  const text = (f: number) => odometerGlyphs(f).map((g) => g.ch).join('');
  assert.ok(text(WRAP + 2).includes('2,147,483,648'), 'the wrap prints as built');
  assert.ok(!text(HEX_AT - 1).includes('0x'), 'as built until a 16th after the wrap');
  assert.equal(HEX_AT, WRAP + 6);
  assert.ok(text(HEX_AT + 2).includes(KERNEL_TEXT.base), `0x80000000 from + 6: ${text(HEX_AT + 2)}`);
  assert.equal(KERNEL_TEXT.base, '0x80000000');
});

test('§6.3 contract: wrapAt — his pose on screen through the fling and its velocity; on drop2 8.1 he is at the kernel’s landing, upright, his fastest', () => {
  const w = wrapAt(KERNEL.from);
  assert.deepEqual([w.face, w.x, w.y, w.ink, w.arms], ['(•ω•)', KERNEL_LANDING.x, KERNEL_LANDING.y, KERNEL_LANDING.ink, 0]);
  assert.ok(Math.abs(w.rot - 2 * Math.PI) < 1e-9, 'upright: one full turn');
  const before = wrapAt(KERNEL.from - 1);
  assert.ok(Math.hypot(w.vx, w.vy) > Math.hypot(before.vx, before.vy) && w.spin > before.spin, 'faster into the landing');
  assert.ok(Math.abs(before.x + before.vx - w.x) < 0.25 * Math.hypot(w.vx, w.vy), 'its velocity carries it to the landing');
  for (let f = WRAP; f < KERNEL.from; f++) {
    const s = surfer(f);
    const a = wrapAt(f);
    assert.ok(Math.abs(a.x - (s.x - overflowCamX(f) + 960)) < 1e-9 && Math.abs(a.y - (s.y - MON.y0)) < 1e-9, `${f}: the pose the scene draws`);
  }
});

test('R1-pan-over-black: neon tube lines hang in the dark between the monitor and the cards at four depths — the pan streaks past them at different speeds (parallax) and they have all left the frame as it lands on drop2 7.1', () => {
  assert.ok(new Set(PAN_STREAKS.map((s) => s.z)).size >= 4, 'several depths');
  const speed = (z: number) => Math.abs(onScreen(0, z, WRAP + 2) - onScreen(0, z, WRAP + 1));
  const zs = [...new Set(PAN_STREAKS.map((s) => s.z))].sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i++) assert.ok(speed(zs[i]) > speed(zs[i - 1]) * 1.1, `nearer lines move faster (${zs[i - 1]} → ${zs[i]})`);
  for (const s of PAN_STREAKS) {
    const seen = range(WRAP, PAN.to).filter((f) => onScreen(s.x1, s.z, f) > 0 && onScreen(s.x0, s.z, f) < 1920);
    assert.ok(seen.length >= 1, `line at z ${s.z} crosses the frame`);
    for (const f of [PAN.to - 0.25, PAN.to - 1e-3]) assert.ok(onScreen(s.x0, s.z, f) > 1920 + 40, `${f}: line at z ${s.z} has left (${onScreen(s.x0, s.z, f).toFixed(0)})`);
    const y = 540 + ((s.y - (MON.y0 + 540)) * FRONT) / (FRONT - s.z);
    assert.ok(y > 40 && y < 1040, `line at z ${s.z} is in frame vertically (${y.toFixed(0)})`);
  }
  assert.equal(panWorld(WRAP - 2).glass.under.length, 0, 'nothing of the pan before it fires');
});

// Iteration 2 (the director's ruling 7): the whip-pan slams onto drop2 8.1, and so does he — flung by the wrap, he flies faster and faster
// and stops dead on the downbeat, upright in the kernel (he used to ease in on a sine and be still a frame before it).
test('flung, he flies into the kernel and stops dead on drop2 8.1: his last frame’s spin and travel are his fastest', () => {
  const screen = (f: number) => [surfer(f).x - overflowCamX(f) + 960, surfer(f).y - MON.y0];
  const travel = (f: number) => Math.hypot(screen(f)[0] - screen(f - 1)[0], screen(f)[1] - screen(f - 1)[1]);
  const spin = (f: number) => Math.abs(surfer(f).rot - surfer(f - 1).rot);
  const frames = range(WRAP + 1, PAN.to + 1);
  for (const f of frames.slice(0, -1)) {
    assert.ok(spin(PAN.to) > spin(f), `the spin into drop2 7.1 (${spin(PAN.to).toFixed(2)}) is faster than on ${f} (${spin(f).toFixed(2)})`);
    assert.ok(travel(PAN.to) > travel(f), `the travel into drop2 7.1 (${travel(PAN.to).toFixed(0)} px) is faster than on ${f}`);
  }
});

test('R1-05 / F: flung, his arms ᕕ ᕗ fade over 2 frames while his spin is fast — inside the blur — and he lands as (•ω•), his full amber (no tube: the pan lands in the kernel)', () => {
  assert.equal(surfer(WRAP + 6).arms, 1);
  assert.equal(surfer(WRAP + 9).arms, 0);
  const mid = surfer(WRAP + 7.5);
  assert.ok(mid.arms > 0.3 && mid.arms < 0.7, `a fade (${mid.arms})`);
  const swapIn = range(WRAP, PAN.to, 0.25).filter((f) => surfer(f).arms > 0.02 && surfer(f).arms < 0.98);
  assert.ok(swapIn.length * 0.25 <= 2.25 && swapIn.length * 0.25 >= 1.5, `${swapIn.length * 0.25} frames`);
  for (const f of swapIn) assert.ok(Math.abs(surfer(f + 0.5).rot - surfer(f - 0.5).rot) > 0.5, `${f}: spinning fast (blurred) while they go`);
  for (const f of range(WRAP, PAN.to, 0.5)) assert.deepEqual([surfer(f).tube, surfer(f).level], [0, 1], `${f}: never a tube, always lit`);
});

test('R1-10: the odometer is a real drum — on a roll the old digit leaves through the top of its cell window as the new one comes up from the bottom, never overprinting; each value stands crisp for at least 3 frames of its 16th', () => {
  const o = MON.odometer;
  const full = MON.fontPx * 2;
  const cy = 540 - (MON.y0 + o.top + o.h / 2);
  const digitCells = (f: number) => {
    const cells = new Map<number, { y: number; k: number }[]>();
    for (const g of odometerGlyphs(f)) {
      if (!/[0-9]/.test(g.ch)) continue;
      const key = Math.round(g.x * 10);
      cells.set(key, [...(cells.get(key) ?? []), { y: g.y, k: g.size / full }]);
    }
    return [...cells.values()];
  };
  for (const at of range(SURF[0], SURF[3], 6)) {
    for (let f = at - 0.25; f <= at + 2; f += 0.125) {
      for (const cell of digitCells(f)) {
        for (const d of cell) assert.ok(d.y + (d.k * o.h) / 2 <= cy + o.h / 2 + 1e-6 && d.y - (d.k * o.h) / 2 >= cy - o.h / 2 - 1e-6, `${f}: a digit outside its window`);
        if (cell.length === 2) {
          const [a, b] = [...cell].sort((p, q) => q.y - p.y);
          assert.ok(a.y - (a.k * o.h) / 2 >= b.y + (b.k * o.h) / 2 - 1e-6, `${f}: old and new overlap`);
        }
        assert.ok(cell.length <= 2);
      }
    }
    const crisp = range(at, at + 6).filter((F) => temporalSamples(F, { samples: 32, shutter: 0.5, persistence: 0 }).every((s) => digitCells(s.frame).every((c) => c.length === 1 && Math.abs(c[0].k - 1) < 1e-6)));
    assert.ok(crisp.length >= 3, `${at}: crisp on ${crisp}`);
  }
});

test('R1-s31: INT_MAX slams on drop2 6.4 — a 3-frame squash (wider, flatter) and a brightness flare on the digits, settled by + 4', () => {
  const digits = (f: number) => odometerGlyphs(f).filter((g) => /[0-9]/.test(g.ch));
  const at = SURF[3];
  const hit = digits(at)[0];
  const later = digits(at + 6)[0];
  assert.ok((hit.stretch ?? 1) > 1.08, `squashed: wider than tall (${hit.stretch})`);
  assert.ok(Math.max(...hit.color) > Math.max(...later.color) * 1.8, 'flaring');
  assert.ok(Math.abs((digits(at + 4)[0].stretch ?? 1) - 1) < 0.03, 'settled');
});

test('R1-s31: the surf’s living hold — he pumps on every 16th from the payout, the fill creeps on the 16ths before the surge, and its front shimmers on the arp', () => {
  for (const at of [SURF[0] + 6, SURF[0] + 12, SURF[1] + 6, SURF[2] - 6]) assert.ok(surfer(at).sy < surfer(at + 3).sy - 0.05, `${at}: a pump (${surfer(at).sy.toFixed(3)} vs ${surfer(at + 3).sy.toFixed(3)})`);
  for (const f of range(SURF[0], SNAP)) {
    const s = surfer(f);
    const feet = s.y - 150 * (1 - s.sy);
    assert.ok(Math.abs(feet - (MON.y0 + MON.hero.centreY)) <= 6.5, `${f}: feet on the gauge (${feet.toFixed(1)})`);
  }
  assert.ok(frontAt(SURF[1] - 1) > frontAt(SURF[0] + 5) + 30, 'the fill creeps on drop2 6.1’s 16ths');
  assert.ok(frontAt(SURF[1] - 1) < 760, 'but nothing surges before the kick');
  const front = (f: number) => Math.max(...overflowContent(f, L).monitor.glyphs.mono!.filter((g) => g.size === 200).map((g) => Math.max(...g.color)));
  assert.ok(front(SURF[0] + 12) > front(SURF[0] + 15) * 1.3, 'the front flares on the 16th and settles');
});

test('R1-s31: the snap launches one frame early, so on drop2 6.3& the column is already bursting — wall gone, pieces flung 40+ px, three sparks', () => {
  const rest = snapPieces(SNAP - 1);
  const burst = snapPieces(SNAP);
  assert.equal(rest.length, burst.length);
  for (let i = 0; i < burst.length; i++) assert.ok(burst[i].x - rest[i].x > 40, `piece ${i} is flung (${(burst[i].x - rest[i].x).toFixed(0)} px)`);
  const wall = (f: number) => overflowContent(f, L).monitor.glyphs.mono!.filter((g) => g.ch === '║' && g.x + 960 > MON.wall - 20).length;
  assert.ok(wall(SNAP - 1.3) > 10, 'the bowed wall stands until the launch');
  assert.equal(wall(SNAP - 0.25), 0, 'and is gone on the snap’s frame');
  assert.equal(snapSparks(SNAP).length, 3);
  assert.equal(snapSparks(SNAP + 8).length, 0, 'the sparks are gone by + 8');
});
