// S27 SLASH and the drop2 1.1 seam (src/shots/drop2Slash.ts): the story the build sheet tells (notes/d2build/sheet.md §4.0, §4.2,
// §5.0, §5.2, §5.3; the 20-bar sheet notes/bid2/drop2-sheet2.md §1.3 C, §6.1), read back from the pure shot. The seam reads the
// break's last frame live (src/shots/breakLaunch.ts): v04's post and band, or its v2 ending's frontal fork, whichever the break draws.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { S27_CAST } from '../src/content/castDrop2.ts';
import { DROP2_S27_LOG } from '../src/content/drop2.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BLADES, DROP2_START, HATS2, POP, POP_OUT, TURNS } from '../src/score/drop2.ts';
import { rigAt } from '../src/score/energy.ts';
import { bandCord, blocksAt, confettiV2, forkAt, launchAt, launchCam, omegaOnScreen, pegAt } from '../src/shots/breakLaunch.ts';
import { type BreakCam, HERO_ADVANCE, toScreen } from '../src/shots/breakShared.ts';
import { BLADE_LINES, S27_MASTER, springL } from '../src/shots/drop2Shared.ts';
import * as S from '../src/shots/drop2Slash.ts';
import { partFrame } from '../src/score/film.ts';

/** Drop 2's bar `bar`, beat `beat` (both 1-based, as src/score/drop2.ts writes them), as a film frame. */
const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);

const ADV: Record<string, number> = HERO_ADVANCE;
const rounded = (ch: string) => ADV[ch] ?? 0.6;
const L: S.SlashLayout = { rounded, jp: () => 1, mono: () => 0.6, display: () => 0.62, dot: () => 1 };

test('the seam: his ω on drop2 1.1 is ≤ 60 px from the break’s last-frame ω and already moving; he lands on the S27 master by drop2 1.1&', () => {
  const before = omegaOnScreen(S.SEAM);
  const caught = S.omegaScreen(S.SEAM, rounded);
  assert.ok(Math.hypot(caught[0] - before[0], caught[1] - before[1]) < 1.5, `the break’s last frame is its own pose: ${caught} vs ${before}`);
  const first = S.omegaScreen(DROP2_START, rounded);
  const d = Math.hypot(first[0] - before[0], first[1] - before[1]);
  // The break's ending decides the distance (v04: ≈ 40 px; its v2 frontal fork shot: ≈ 11 px): ≤ 60 px, and already moving.
  assert.ok(d > 3 && d <= 60, `the drop frame already moves, ≤ 60 px: ${d.toFixed(1)}`);
  const settled = S.omegaScreen(DROP2_START + 12, rounded);
  const master = toScreen(S.slashCam(DROP2_START + 12), S27_MASTER.centre[0], 512);
  assert.ok(Math.abs(settled[0] - master[0]) < 4, `settled on the master by drop2 1.1&: ${settled}`);
  const w = S.faceWidthScreen(DROP2_START + 12, rounded) / S.slashCam(DROP2_START + 12).zoom;
  assert.ok(Math.abs(w - S27_MASTER.width) < 12, `1240 px wide: ${w.toFixed(1)}`);
});

test('the speed lines (if the break has them) streak off and the つ / っ paws fold into the brackets in 3 frames; the brows stay until drop2 1.2 and pop off', () => {
  const parts = (f: number) => S.heroS27(f, rounded).map((h) => h.part);
  assert.ok(parts(DROP2_START).includes('tsu'), 'the break’s paws are caught on drop2 1.1');
  assert.ok(!parts(DROP2_START + 3).includes('speed') && !parts(DROP2_START + 3).includes('tsu'), 'gone on drop2 1.1 + 3');
  assert.equal(parts(BLADES[1] - 1).filter((p) => p === 'brow').length, 2, 'determined brows until drop2 1.2');
  assert.equal(parts(BLADES[1] + 4).filter((p) => p === 'brow').length, 0, 'popped off');
  assert.equal(parts(BLADES[1] - 1).filter((p) => p === 'arm').length, 0);
  assert.deepEqual(S.heroS27(BLADES[1], rounded).filter((h) => h.part === 'arm').map((h) => h.ch), ['ヽ', 'ノ'], 'ヽ(•ω•)ノ on drop2 1.2');
  assert.deepEqual(S.heroS27(BLADES[4], rounded).filter((h) => h.part === 'arm').map((h) => h.ch), ['＼', '／'], '＼(•ω•)／ on drop2 1.4');
  for (const f of [BLADES[1], BLADES[4]]) {
    const at = temporalSamples(f, S.slashTemporal(f), S.slashSegment(f)).map((s) => S.heroS27(s.frame, rounded).filter((h) => h.part === 'arm').map((h) => h.ch).join(''));
    assert.equal(new Set(at).size, 1, `${f}: the arms swap whole on the drum frame (${[...new Set(at)]})`);
  }
});

test('the ω sings the hook: it swells on each note of drop2 bar 1 and holds open through the long one (drop2 1.3)', () => {
  assert.equal(S.mouthPulse(DROP2_START - 1), 1);
  assert.ok(S.mouthPulse(d2at(1, 3) + 2) > 1.05, 'the long note holds');
  assert.ok(S.mouthPulse(d2at(1, 3.5) + 4) > 1.05 === false || S.mouthPulse(d2at(1, 3.5) + 4) <= 1.06);
});

test('the band snaps: copy k reaches his body on drop2 1.1 + ⌈3k/8⌉, the peg pops and is gone by drop2 1.1 + 4', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(S.copyHome), [DROP2_START + 1, DROP2_START + 1, DROP2_START + 2, DROP2_START + 2, DROP2_START + 2, DROP2_START + 3, DROP2_START + 3, DROP2_START + 3]);
  assert.equal(S.bandCopies(DROP2_START, rounded).length, 8);
  assert.equal(S.bandCopies(DROP2_START + 1, rounded).length, 6);
  assert.equal(S.bandCopies(DROP2_START + 3, rounded).length, 0);
  // The break's anchor (read live): v04's post pops 1 → 1.2 → 0; the v2 ending has a fork instead (no post), which falls away.
  if (pegAt(S.SEAM)) assert.ok(S.pegShapes(DROP2_START + 1).length === 4 && S.pegShapes(DROP2_START + 4).length === 0);
  else assert.ok([S.SEAM, DROP2_START, DROP2_START + 4].every((f) => S.pegShapes(f).length === 0), 'no post to pop');
});

test('the v2 seam: the break’s fork (its last frame’s blocks) springs its prongs apart 40 px on drop2 1.1 and falls out of the frame by + 16', () => {
  if (pegAt(S.SEAM)) return;
  const brk = blocksAt(S.SEAM).blocks;
  const k = forkAt(S.SEAM);
  // On the break's last frame the fork is the break's, part for part (the shadows first, then the blocks).
  const at = (f: number) => S.region0(f).blocks.slice(brk.length);
  assert.equal(at(S.SEAM).length, brk.length);
  brk.forEach((b, i) => {
    const g = at(S.SEAM)[i];
    assert.ok(Math.abs(g.x - (b.x - 960)) < 1e-6 && Math.abs(g.y - (540 - b.y)) < 1e-6, `block ${i} where the break leaves it`);
  });
  // Each prong's tip turns outward about the crotch (L keyed on the drop, 40 px, plus the tumble once it falls); the stem only falls.
  const tipOpen = (f: number, i: number) => {
    const b = S.forkFall(f, brk[i])[0];
    const tip = brk[i].color === 'yellow' ? k.U : k.L;
    const r = Math.hypot(tip[0] - k.crotch[0], tip[1] - k.crotch[1]);
    return Math.abs(((b.rot - brk[i].rot) * Math.PI) / 180) * r;
  };
  const prongs = brk.map((b, i) => (b.color === 'mint' ? -1 : i)).filter((i) => i >= 0);
  assert.equal(prongs.length, 2);
  for (const i of prongs) {
    const one = tipOpen(DROP2_START + 1, i);
    assert.ok(one > 2 && one <= S.FORK_FALL.open + 1e-6, `prong ${i} springs open on the drop, ≤ 40 px before it tumbles: ${one.toFixed(1)}`);
    assert.ok(tipOpen(DROP2_START + 6, i) > tipOpen(DROP2_START + 3, i) && tipOpen(DROP2_START + 3, i) > one, `prong ${i} keeps tumbling apart`);
  }
  // It falls (gravity) and has left the frame by + 16.
  const y = (f: number) => Math.min(...S.forkFall(f, brk[1]).map((b) => b.y));
  assert.ok(y(DROP2_START + 8) > y(DROP2_START + 4) + 50 && y(DROP2_START + 4) >= y(DROP2_START + 1));
  assert.equal(S.region0(DROP2_START + S.FORK_FALL.gone).blocks.length, 0, 'gone by + 16');
});

test('H-1 (break-sheet2 §13.5) + R1-T13: the v2 seam’s confetti are the break’s own (confettiV2) — on drop2 1.1 where its last frame left them; then the pop flings them out of the frame like the fork’s prongs (outward, falling), gone by + 16, clear of W1’s line', () => {
  if (pegAt(S.SEAM)) return;
  const shift = (f: number, i: number): [number, number] => {
    const g = S.region0(f).confetti[i];
    const w = confettiV2(f)[i];
    return [g.x - w.x, g.y - w.y];
  };
  for (const t of [0, 1, 3, 6, 8, 12, 15]) {
    const f = DROP2_START + t;
    const want = confettiV2(f);
    const got = S.region0(f).confetti;
    assert.equal(got.length, want.length, `the break’s pieces and shadows, no more, no fewer (+${t})`);
    got.forEach((g, i) => {
      assert.deepEqual({ ...g, x: 0, y: 0 }, { ...want[i], x: 0, y: 0 }, `piece ${i} is the break’s, only moved (+${t})`);
      // Outward from the frame's centre (x away from 0), and down by the fork's fall.
      const [dx] = shift(f, i);
      if (t > 0 && Math.abs(want[i].x) > 1) assert.ok(Math.sign(dx) === Math.sign(want[i].x) || Math.abs(dx) < 1e-9, `piece ${i} flies outward (+${t})`);
    });
  }
  // The cut: on drop2 1.1 each piece is within a frame’s drift (0.4 px) and turn (0.5°) of the break’s last frame; no fling yet.
  const last = confettiV2(S.SEAM);
  S.region0(DROP2_START).confetti.forEach((g, i) => assert.ok(Math.hypot(g.x - last[i].x, g.y - last[i].y) < 1.5, `piece ${i} continues from the break’s last frame`));
  assert.deepEqual(shift(DROP2_START, 0), [0, 0]);
  // Accelerating away: every piece moves further each frame, and none is left by + 16 (the fork's own exit).
  for (let i = 0; i < confettiV2(DROP2_START).length; i++) {
    let last = 0;
    for (let t = 1; t < S.FORK_FALL.gone; t++) {
      const d = Math.hypot(...shift(DROP2_START + t, i));
      assert.ok(d > last, `piece ${i} accelerates (+${t})`);
      last = d;
    }
  }
  assert.equal(S.region0(DROP2_START + S.FORK_FALL.gone).confetti.length, 0, 'gone by + 16');
  assert.ok(Math.hypot(...shift(DROP2_START + 6, 0)) > 120, 'well on its way by W1’s first line (+ 6)');
});

test('the drop2 1.1 seam: drop 2 pops the break’s own anchor post, keeps its cord until the last copy is home, and its links leave turned and outlined as the break left them', () => {
  const brk = launchAt(S.SEAM, { advance: rounded });
  if (pegAt(S.SEAM)) {
    // v04: the post, the break’s own parts on the seam instant (a post seen from the side, not three discs), popped about its centre after it.
    assert.deepEqual(S.pegShapes(S.SEAM), brk.front.over, 'the break’s post, part for part');
    const body = brk.front.over[1];
    assert.deepEqual([DROP2_START, DROP2_START + 1, DROP2_START + 2, DROP2_START + 3].map((f) => +(S.pegShapes(f)[1].h / body.h).toFixed(6)), [1.1, 1.2, 0.8, 0.4], 'the pop 1 → 1.2 → 0');
    for (const f of [DROP2_START, DROP2_START + 1, DROP2_START + 2, DROP2_START + 3]) assert.deepEqual([S.pegShapes(f)[1].x, S.pegShapes(f)[1].y], [body.x, body.y], `${f}: about the post’s centre`);
  }
  // The cord: the break’s band cord on its last frame (v04: 6.4 px of ink from his fist to the post; v2: across the fork’s tips), in
  // region 0’s world, until the last copy is home.
  const bc = bandCord(S.SEAM)!;
  assert.ok(bc, 'the break leaves a cord');
  for (const f of [S.SEAM, DROP2_START, DROP2_START + 1.5, S.copyHome(8) - 0.25]) {
    const c = S.region0(f).cord;
    assert.equal(c.length, 1, `${f}: the cord is there`);
    assert.equal(c[0].kind, 'segment');
    assert.ok(Math.abs(c[0].h - bc.w) < 1e-9, `${f}: as wide as the break’s (${bc.w.toFixed(2)} px)`);
    assert.ok(Math.abs(c[0].x - ((bc.x0 + bc.x1) / 2 - 960)) < 1e-6 && Math.abs(c[0].y - (540 - (bc.y0 + bc.y1) / 2)) < 1e-6, `${f}: where the break’s is`);
  }
  assert.equal(S.region0(S.copyHome(8)).cord.length, 0, 'gone once the last copy is home');
  // The links on the seam instant: on screen where the break’s are, at their size, turned across the cord and outlined like them.
  const onScreen = (c: BreakCam, g: { x: number; y: number; size: number; rot?: number; outline?: number }) => {
    const [x, y] = toScreen(c, g.x + 960, 540 - g.y);
    return { x, y, size: g.size * c.zoom, deg: (-(g.rot ?? 0) * 180) / Math.PI + c.roll, outline: (g.outline ?? 0) * g.size * c.zoom };
  };
  // The links: v04's eight ")" on one band; v2's four "(" and four ")" on the fork's two sides.
  const isLink = (ch: string) => ch === ')' || ch === '(';
  const want = (brk.back.glyphs.hero ?? []).filter((g) => isLink(g.ch)).map((g) => onScreen(launchCam(S.SEAM), g));
  const got = S.bandCopies(S.SEAM, rounded).filter((g) => isLink(g.ch)).map((g) => onScreen(S.slashCam(S.SEAM), g));
  assert.equal(got.length, 8);
  assert.equal(got.length, want.length);
  want.forEach((w, i) => {
    const g = got[i];
    assert.ok(Math.hypot(g.x - w.x, g.y - w.y) < 0.01 && Math.abs(g.size - w.size) < 0.01, `link ${i}: (${g.x}, ${g.y}) ${g.size} vs (${w.x}, ${w.y}) ${w.size}`);
    assert.ok(Math.abs(g.deg - w.deg) < 0.01, `link ${i}: turned ${g.deg.toFixed(2)}° vs the break’s ${w.deg.toFixed(2)}°`);
    assert.ok(Math.abs(g.outline - w.outline) < 0.01, `link ${i}: outlined ${g.outline.toFixed(2)} px vs the break’s ${w.outline.toFixed(2)}`);
  });
  // The turn across the cord eases out with the flight: by the time a copy is home only the break camera's roll is left on it.
  const f = S.copyHome(8) - 0.01;
  for (const g of S.bandCopies(f, rounded).filter((x) => isLink(x.ch))) {
    const deg = onScreen(S.slashCam(f), g).deg;
    assert.ok(Math.abs(deg - launchCam(S.SEAM).roll) < 0.05, `${f}: a link turned ${deg.toFixed(3)}°`);
  }
});

test('C1 is the band’s line: its head crosses y 540 left → right in 3 frames (drop2 1.1–1.1 + 3), the wake behind it opening TERMINAL above', () => {
  const xs = [DROP2_START, DROP2_START + 1, DROP2_START + 2, DROP2_START + 3].map((f) => S.bladeHead(0, f));
  assert.ok(xs[0] > 250 && xs[0] < 450, `the drop frame already slices: ${xs[0].toFixed(0)}`);
  assert.ok(xs[1] > xs[0] + 400 && xs[2] > xs[1] + 400, `${xs.map((x) => x.toFixed(0))}`);
  assert.equal(xs[3], 1920, 'across by drop2 1.1 + 3');
  assert.equal(S.regionAt(200, 520, DROP2_START), 'terminal', 'TERMINAL above the line behind the head');
  assert.equal(S.regionAt(200, 60, DROP2_START), 'interlude', 'the wake leans back: far from the line it opens later');
  assert.equal(S.regionAt(1500, 300, DROP2_START), 'interlude', 'ahead of the head the break’s world still shows');
  assert.equal(S.regionAt(1900, 10, DROP2_START + 4), 'terminal', 'the whole top half is open by drop2 1.1 + 4');
  assert.equal(S.regionAt(200, 800, DROP2_START + 8), 'interlude', 'below the line the break’s world goes on');
});

test('the final style frame at drop2 1.4&: six worlds share his face, each region holding the features the sheet lists', () => {
  const f = POP_OUT - 1;
  const at = (x: number, y: number) => S.regionAt(x, y, f);
  assert.equal(at(440, 430), 'neon', '( top');
  assert.equal(at(440, 650), 'riso', '( bottom');
  assert.equal(at(650, 480), 'terminal', '•L top');
  assert.equal(at(960, 480), 'terminal', 'ω top');
  assert.equal(at(960, 640), 'interlude', 'ω bottom');
  assert.equal(at(1270, 480), 'swiss', '•R top');
  assert.equal(at(1480, 430), 'swiss', ') top');
  assert.equal(at(1480, 650), 'led', ') bottom');
  assert.deepEqual([...new Set([0, 300, 600, 900, 1200, 1500, 1900].flatMap((x) => [100, 500, 700, 1000].map((y) => at(x, y))))].sort(), [...S.S27_WORLDS].sort());
});

// Iteration 2 (the director's ruling 8; sync review 8): S27's whole idea is "every kick slices", so each blade from C2 on is keyed
// 1.5 frames earlier and crosses his face ON its beat — reaching him on the frame before, through his face inside the beat frame's own
// shutter, the new world's biggest reveal on the beat (each neighbour about half of it, so the rig's punch on the frame after does not
// out-change it). (C1 rides the drop itself: its frame before is the break's.)
test('C2–C5 cross his face on their beats: not on him the frame before, through his face in the beat frame’s shutter, the biggest reveal on the beat', () => {
  const worlds = ['terminal', 'swiss', 'riso', 'neon', 'led'];
  for (let k = 1; k < BLADES.length; k++) {
    const b = BLADES[k];
    const len = S.bladeDir(k).len;
    const face = len - 230; // his ink reaches ≈ 230 px from the centre line, where C2–C5 end
    assert.ok(S.bladeHead(k, b - 1) < face, `C${k + 1}: not on his face on ${b - 1} (${S.bladeHead(k, b - 1).toFixed(0)} of ${len.toFixed(0)})`);
    assert.ok(S.bladeHead(k, b - 0.25) > face && S.bladeHead(k, b - 0.25) < len, `C${k + 1}: on his face as the beat's shutter opens (${S.bladeHead(k, b - 0.25).toFixed(0)})`);
    assert.equal(S.bladeHead(k, b + 0.25), len, `C${k + 1}: across as it closes`);
    // The new world's area, averaged over each frame's shutter (8 instants over ± ¼ frame), on a 16 px grid.
    const area = (f: number) => {
      let n = 0;
      for (let i = 0; i < 8; i++) for (let x = 8; x < 1920; x += 16) for (let y = 8; y < 1080; y += 16) if (S.regionAt(x, y, f - 0.25 + i / 14) === worlds[k]) n++;
      return n / 8;
    };
    const [a, p, c, n] = [b - 2, b - 1, b, b + 1].map(area);
    const step = { before: p - a, beat: c - p, after: n - c };
    assert.ok(step.beat > 1.6 * step.before && step.beat > 1.6 * step.after, `C${k + 1}: reveal steps ${step.before.toFixed(0)} / ${step.beat.toFixed(0)} / ${step.after.toFixed(0)}`);
  }
});

// Iteration 3 (verify: C5 only clipped the bracket's tail in the lower-right corner on drop2 1.4 — the centre's change was 5.9 on the kick
// and 13.2 on the frame after): C5 cuts through his right cheek, between the ω and the ")" (C3's mirror), so the LED piece it opens takes
// a real share of the frame's centre on the kick itself, and the board is lit there on the kick.
test('C5 crosses his face in the centre on drop2 1.4: its piece takes ≥ 8 % of the centre (480–1440 × 270–810) on the kick, ≥ 3× the frames either side', () => {
  const share = (f: number) => {
    let n = 0;
    let m = 0;
    for (let i = 0; i < 8; i++) for (let x = 484; x < 1440; x += 8) for (let y = 274; y < 810; y += 8) {
      m++;
      if (S.regionAt(x, y, f - 0.25 + i / 14) === 'led') n++;
    }
    return n / m;
  };
  const b = BLADES[4];
  const [a, p, c, n] = [b - 2, b - 1, b, b + 1].map(share);
  assert.ok(c - p >= 0.08, `the kick opens ${(100 * (c - p)).toFixed(1)} % of the centre`);
  assert.ok(c - p >= 3 * (p - a) && c - p >= 3 * (n - c), `steps ${(100 * (p - a)).toFixed(1)} / ${(100 * (c - p)).toFixed(1)} / ${(100 * (n - c)).toFixed(1)} %`);
  // The line runs between the ω (to ≈ 1160) and the ")" (from ≈ 1430) through the centre's lower half.
  const xAt = (y: number) => BLADE_LINES[4].from[0] + ((BLADE_LINES[4].to[0] - BLADE_LINES[4].from[0]) * (y - BLADE_LINES[4].from[1])) / (BLADE_LINES[4].to[1] - BLADE_LINES[4].from[1]);
  for (const y of [540, 700, 810]) assert.ok(xAt(y) > 1180 && xAt(y) < 1300, `C5 at y ${y}: x ${xAt(y).toFixed(0)}`);
});

// Iteration 3 (verify: the centre's change on drop2 1.4 + 1 out-did drop2 1.4's — the rig's punch, shared with the intro, the build and drop 1, starts a frame after the kick
// by design): S27's own camera takes each blade kick's hit on the kick frame and hands over to the rig's punch, so the zoom's biggest step
// (S27's camera × the rig, over each frame's shutter) is on the kick, not on the frame after.
test('S27’s camera takes the blade kicks on their frames: the zoom steps most on drop2 1.2, 1.3 and 1.4, then hands over to the rig', () => {
  const zoom = (f: number) => {
    let z = 0;
    for (let i = 0; i < 8; i++) {
      const t = f - 0.25 + (i + 0.5) / 16;
      z += Math.log(S.slashCam(t).zoom * rigAt(t).zoom);
    }
    return z / 8;
  };
  for (const k of [BLADES[1], BLADES[2], BLADES[4]]) {
    const step = (f: number) => zoom(f) - zoom(f - 1);
    assert.ok(step(k - 1) < 0.003, `${k - 1}: nothing before the kick (${(100 * step(k - 1)).toFixed(2)} %)`);
    assert.ok(step(k) > 0.015 && step(k) > 1.15 * step(k + 1), `${k}: steps ${(100 * step(k)).toFixed(2)} % on the kick, ${(100 * step(k + 1)).toFixed(2)} % after`);
  }
});

test('every blade opens its world on its own beat, never earlier', () => {
  const worlds = ['terminal', 'swiss', 'riso', 'neon', 'led'];
  const probe = [[200, 300], [1700, 200], [300, 900], [200, 200], [1700, 900]];
  BLADES.forEach((b, k) => {
    const [x, y] = probe[k];
    if (k > 0) assert.notEqual(S.regionAt(x, y, b - 1), worlds[k], `${worlds[k]} not before ${b}`);
    assert.equal(S.regionAt(x, y, b + 6), worlds[k], `${worlds[k]} by ${b + 6}`);
  });
});

test('the new pieces shear +14 px along their blade and ease to +3; the seams are white-hot 4 px for 6 f, then 2 px of the accent', () => {
  for (let k = 0; k < BLADES.length; k++) {
    const b = BLADES[k];
    assert.equal(S.bladeShear(k, S.bladeKey(k) - 1), 0, `C${k + 1}: still before its launch`);
    assert.ok(S.bladeShear(k, b + 3) > 12, `C${k + 1} jumps`);
    assert.ok(Math.abs(S.bladeShear(k, b + 20) - 3) < 0.5, `C${k + 1} eases to +3: ${S.bladeShear(k, b + 20)}`);
    const s = S.bladeStates(b + 2)[k];
    assert.ok(s.white > 0.99 && s.width === 4);
    const later = S.bladeStates(b + 10)[k];
    assert.ok(later.white === 0 && later.width === 2);
  }
});

test('the camera flows through S27 and the cube and is back at identity on drop2 3.1 (H1, R12); it never jumps', () => {
  const c = S.slashCam(POP);
  assert.ok(Math.abs(c.zoom - 1) < 1e-9 && Math.abs(c.roll) < 1e-9, `identity on drop2 3.1: ${c.zoom} ${c.roll}`);
  for (let f = DROP2_START; f < POP; f += 0.25) {
    const a = S.slashCam(f);
    const b = S.slashCam(f + 0.25);
    assert.ok(Math.abs(Math.log(b.zoom / a.zoom)) < 0.01 && Math.abs(b.roll - a.roll) < 0.4, `${f}: ${a.zoom} → ${b.zoom}, ${a.roll} → ${b.roll}`);
  }
  for (let f = DROP2_START; f < POP; f += 6) {
    const a = S.slashCam(f);
    const b = S.slashCam(f + 6);
    assert.ok(a.zoom !== b.zoom || a.roll !== b.roll, `${f}: never still`);
  }
  // Region 0 starts from the break’s own camera on its last frame, read live (v04: zoom 1.10, roll −4°; the v2 fork shot: 1.05, 0°).
  const r0 = S.r0Cam(S.SEAM);
  const bcam = launchCam(S.SEAM);
  assert.ok(Math.abs(r0.zoom - bcam.zoom) < 1e-9 && Math.abs(r0.roll - bcam.roll) < 1e-9, 'region 0 starts from the break’s own camera');
  const r1 = S.r0Cam(DROP2_START + 14);
  const s1 = S.slashCam(DROP2_START + 14);
  assert.ok(Math.abs(r1.zoom - s1.zoom) < 0.005 && Math.abs(r1.roll - s1.roll) < 0.05, 'and unwinds into S27’s by drop2 1.1& + 2');
});

test('E6: the hole opens from the black spot past every corner by drop2 1.1 + 6; ≈ 2000 droplets and the torn window glyphs are gone by drop2 1.2 − 1', () => {
  const r = S.holeRadius(S.SEAM);
  // R15: the break's black spot, read live (breakFilm.ts re-tunes it; it was 120 px, then 180), never a literal.
  assert.ok(Math.abs(r - S.popFilm().black) < 1e-6 && r > 0, `it starts as the black spot (${r} vs ${S.popFilm().black})`);
  const a = S.popFilm().anchor;
  const far = Math.max(...[[0, 0], [1920, 0], [0, 1080], [1920, 1080]].map(([x, y]) => Math.hypot(x - a[0], y - a[1])));
  assert.ok(Math.min(...S.rimProfile(S.RIM_GONE)) > far, `past every corner on drop2 1.1 + 6: ${Math.min(...S.rimProfile(S.RIM_GONE)).toFixed(0)} > ${far.toFixed(0)}`);
  let most = 0;
  for (let f = DROP2_START; f < S.POP_END; f += 0.5) most = Math.max(most, S.droplets(f).length);
  assert.ok(most > 150, `droplets fly: ${most}`);
  assert.equal(S.droplets(S.POP_END).length, 0);
  assert.equal(S.droplets(S.POP_END - 0.25).length, 0, 'gone by drop2 1.2 − 1');
  const torn = S.tornGlyphs(DROP2_START);
  assert.ok(torn.length > 100, `the window’s text: ${torn.length}`);
  assert.equal(S.tornGlyphs(S.POP_END - 0.25).length, 0, 'gone by drop2 1.2 − 1');
  assert.ok(S.windowBacking(DROP2_START) !== null && S.windowBacking(S.RIM_GONE) === null, 'the backing collapses by drop2 1.1 + 6');
});

test('sub-frames: 64 on the pop, 32 on the blade tips, the pop-out and the turns, 64 on the whip, 16 elsewhere', () => {
  assert.equal(S.slashTemporal(DROP2_START).samples, 64);
  assert.equal(S.slashTemporal(DROP2_START + 11).samples, 64);
  assert.equal(S.slashTemporal(DROP2_START + 14).samples, 32);
  for (const b of BLADES.slice(1)) assert.equal(S.slashTemporal(b + 2).samples, 32);
  assert.equal(S.slashTemporal(DROP2_START + 34).samples, 16);
  for (const t of TURNS) assert.equal(S.slashTemporal(t.from + 6).samples, 32);
  assert.equal(S.slashTemporal(POP - 8).samples, 64);
  assert.equal(S.slashTemporal(d2at(2, 1.25) + 2).samples, 16);
});

test('the neon spark and the LED flash change only on whole frames of the hats', () => {
  for (const h of HATS2.filter((x) => x < POP_OUT).slice(0, 8)) {
    const at = temporalSamples(h, S.slashTemporal(h), S.slashSegment(h)).map((s) => S.ledRegionSource(s.frame, L).flash);
    assert.equal(new Set(at).size, 1, `${h}`);
  }
});

test('the launch of the seam is the shared launch curve keyed on the break’s last frame', () => {
  assert.ok(Math.abs(springL(DROP2_START, DROP2_START) - 0.166) < 0.003);
});

test('each world arrives by its own move: the neon tube stutters on, the Riso plates clack into register, the LED board scans on', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((k) => S.neonIgnite(BLADES[3] + k)), [0.35, 0, 0.6, 0, 1]);
  assert.equal(S.neonIgnite(BLADES[3] - 1), 0);
  for (let k = 0; k < 4; k++) {
    const at = temporalSamples(BLADES[3] + k, S.slashTemporal(BLADES[3] + k), S.slashSegment(BLADES[3] + k)).map((s) => S.neonIgnite(s.frame));
    assert.equal(new Set(at).size, 1, `the stutter is whole on frame ${BLADES[3] + k}`);
  }
  assert.equal(S.plateApart(BLADES[2] - 1), 5);
  assert.equal(S.plateApart(BLADES[2] + 3), 1, 'in register 3 f after the blade');
  const c5 = Math.min(BLADE_LINES[4].from[0], BLADE_LINES[4].to[0]);
  assert.ok(S.ledScan(BLADES[4] - 2) <= c5 && S.ledScan(BLADES[4] + 5) >= 1920, 'the board is lit edge to edge within 6 f, from C5’s line');
  assert.ok(S.ledScan(BLADES[4]) >= 1440, `lit across the frame’s centre on the kick: ${S.ledScan(BLADES[4])}`);
});

// ——— Round-1 review fixes (R1-04, R1-13) ————————————————————————————————————————————————————————————————————————————————————————

test('R1-04: in the Swiss world the hero draws last, over the red "27" and the friend face (world layers → hero, sheet §3.3)', () => {
  for (const f of [d2at(1, 2.25), d2at(1, 3), d2at(1, 3.75), d2at(1, 4.25)]) {
    const hero = S.heroS27(f, rounded);
    const draws = S.swissDraws(f, L, hero, 1);
    const last = draws[draws.length - 1];
    assert.ok((last.glyphs.rounded ?? []).length >= 5, `${f}: the last draw is his face`);
    assert.equal(Object.keys(last.glyphs).filter((k) => k !== 'rounded').length, 0, `${f}: nothing else in his draw`);
    const numeral = draws.findIndex((d) => (d.glyphs.display ?? []).length > 0);
    assert.ok(numeral >= 0 && numeral < draws.length - 1, `${f}: the numeral draws under him`);
  }
  // Over the red his black reads with a paper knockout (a Swiss overprint trick): on paper it is invisible.
  const g = S.dressHero(S.heroS27(d2at(1, 3), rounded), 'swiss').normal[0];
  assert.ok((g.outline ?? 0) > 0 && g.outlineColor !== undefined);
});

// Iteration 2 (the director's ruling 11; flow review 9): drop2 1.4 stacked six world panels, the boot log, three friends and the monitor —
// five or six focal points. The face across the worlds is the subject: the log and the Swiss friend leave over drop2 1.3's first 16th, and
// the Riso bear, the neon dancer and the LED marquee's friends never come.
test('drop2 1.3–1.4 carry no boot log and no friends in the panels: the log and the Swiss friend fade out over drop2 1.3’s first 16th, the bear, the dancer and the marquee never come', () => {
  const c3 = BLADES[2];
  for (let f = DROP2_START; f < POP_OUT; f++) {
    const n = S.neonRegion(f, L);
    assert.equal([...(n.normal.glyphs.rounded ?? []), ...(n.add.glyphs.rounded ?? [])].length, 0, `${f}: no neon dancer`);
    assert.equal((S.risoRegion(f, L).multiply.glyphs.jp ?? []).length, 0, `${f}: no Riso bear`);
    assert.equal((S.ledRegionSource(f, L).content.glyphs.dot ?? []).length, 0, `${f}: no LED marquee`);
    if (f < c3 + 6) continue;
    assert.equal((S.terminalRegion(f, L).glyphs.mono ?? []).length, 0, `${f}: no boot log, no cursor`);
    assert.equal((S.swissRegion(f, L).glyphs.jp ?? []).length, 0, `${f}: no Swiss friend`);
  }
  assert.ok((S.terminalRegion(c3 - 1, L).glyphs.mono ?? []).length > 10, 'the log runs through drop2 1.2');
  const friend = (f: number) => (S.swissRegion(f, L).glyphs.jp ?? [])[0]?.alpha ?? (S.swissRegion(f, L).glyphs.jp?.length ? 1 : 0);
  assert.equal(friend(c3 - 1), 1, 'the friend waves through drop2 1.2');
  assert.ok(friend(c3 + 3) > 0.2 && friend(c3 + 3) < 0.8, `and fades, never pops: ${friend(c3 + 3)}`);
  const logAlpha = (f: number) => Math.max(...(S.terminalRegion(f, L).glyphs.mono ?? []).map((g) => g.alpha ?? 1));
  assert.ok(logAlpha(c3 + 3) > 0.2 && logAlpha(c3 + 3) < 0.8, `the log fades with it: ${logAlpha(c3 + 3)}`);
});

// The cast follows the picture (iteration 2, from the drop 2 fixer's hand-off): S27_CAST lists only faces S27 draws — the log's two
// friends (in its pink lines) and the Swiss friend; the Riso bear, the neon dancer and the LED marquee's two went back to the spares.
test('every S27 cast face is drawn in S27: the log’s two friends in its lines, the Swiss friend in its cell', () => {
  const whole = new Set<string>();
  const chars = new Set<string>();
  for (let f = DROP2_START; f < S.S27_END; f++) {
    for (const g of S.terminalRegion(f, L).glyphs.mono ?? []) chars.add(g.ch);
    for (const g of S.swissRegion(f, L).glyphs.jp ?? []) whole.add(g.ch);
    const n = S.neonRegion(f, L);
    for (const g of [...(n.normal.glyphs.rounded ?? []), ...(n.add.glyphs.rounded ?? [])]) whole.add(g.ch);
    for (const g of S.risoRegion(f, L).multiply.glyphs.jp ?? []) whole.add(g.ch);
    for (const g of S.ledRegionSource(f, L).content.glyphs.dot ?? []) whole.add(g.ch);
  }
  for (const c of S27_CAST) {
    const line = DROP2_S27_LOG.find((l) => l.includes(c.face));
    const inLog = line !== undefined && [...line].filter((ch) => ch.trim() !== '').every((ch) => chars.has(ch));
    assert.ok(whole.has(c.face) || inLog, `${c.face} (${c.where}) is drawn`);
  }
});

test('R1-04: the Swiss friend face sits in a free cell: inside the Swiss region from drop2 1.2 + 6 to the pop-out, above his arms’ ink', () => {
  const c = S.SWISS_FRIEND;
  const corners: [number, number][] = [[c.x - c.w / 2, c.y - c.h / 2], [c.x + c.w / 2, c.y - c.h / 2], [c.x - c.w / 2, c.y + c.h / 2], [c.x + c.w / 2, c.y + c.h / 2]];
  for (let f = d2at(1, 2.25); f < POP_OUT; f += 3) for (const [x, y] of corners) assert.equal(S.regionAt(x, y, f), 'swiss', `${f}: (${x}, ${y})`);
  // His right arms (ノ from drop2 1.2, ／ from drop2 1.4) are 0.9 em; their ink starts ≈ 0.42 em above their placement points.
  for (const a of S27_MASTER.arms) assert.ok(c.y + c.h / 2 + 12 <= a.at[1][1] - 0.42 * 0.9 * S27_MASTER.em, `clear of ${a.right}`);
  // It sits in the cell under the pen’s y-120 rule, between the "2"’s spine and the "7"’s stroke (checked on renders).
  assert.ok(c.y - c.h / 2 >= 120 && c.x - c.w / 2 >= 1430 && c.x + c.w / 2 <= 1700);
  const jp = S.swissRegion(d2at(1, 3), L).glyphs.jp ?? [];
  assert.equal(jp.length, 1);
  assert.ok(Math.abs(jp[0].x + 960 - c.x) < 1e-9 && Math.abs(540 - jp[0].y - c.y) < 1e-9, 'drawn in its cell');
});

test('R1-13: the boot log is quiet: at most 5 lines, dim, small, and left of x 1000, so the eyes and the ω own the centre', () => {
  const lum = (g: { color: readonly number[]; alpha?: number }) => (0.2126 * g.color[0] + 0.7152 * g.color[1] + 0.0722 * g.color[2]) * (g.alpha ?? 1);
  // (Iteration 2: from drop2 1.3 it fades out; its level is checked while it is whole.)
  for (let f = DROP2_START; f < BLADES[2]; f += 1) {
    const gs = S.terminalRegion(f, L).glyphs.mono ?? [];
    const text = gs.filter((g) => g.ch !== '█');
    const rows = new Set(text.map((g) => Math.round(g.y)));
    assert.ok(rows.size <= S.S27_LOG.rows && S.S27_LOG.rows <= 5, `${f}: ${rows.size} lines`);
    for (const g of text) {
      const right = g.x + 960 + (0.6 * g.size) / 2;
      assert.ok(right <= 1005, `${f}: "${g.ch}" reaches x ${right.toFixed(0)}`);
      assert.ok(540 - g.y <= 200, `${f}: the log stays high (y ${(540 - g.y).toFixed(0)})`);
      assert.ok(lum(g) <= 0.13 && lum(g) >= 0.03, `${f}: "${g.ch}" luminance ${lum(g).toFixed(3)}`);
    }
  }
});
