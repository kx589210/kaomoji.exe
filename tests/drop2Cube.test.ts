// S28 STYLE CUBE (src/shots/drop2Cube.ts): the turn lands on the kicks, faces re-skin only while they face away, the camera and the
// hero hand over at drop2 3.1 (sheet §5.4, §5.5, §9 H1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { temporalSamples } from '../src/engine/temporal.ts';
import { LED_ROWS } from '../src/content/drop2.ts';
import { linear } from '../src/engine/color.ts';
import { BLADES, KICKS2, POP, POP_OUT, TURNS, WHIP } from '../src/score/drop2.ts';
import { HERO_ADVANCE } from '../src/shots/breakShared.ts';
import * as C from '../src/shots/drop2Cube.ts';
import { PALETTES, SWISS_OMEGA } from '../src/shots/drop2Shared.ts';
import * as S from '../src/shots/drop2Slash.ts';

const ADV: Record<string, number> = HERO_ADVANCE;
const L: S.SlashLayout = { rounded: (ch) => ADV[ch] ?? 0.6, jp: (ch) => ('(•ω•)'.includes(ch) ? 0.5 : 1), mono: () => 0.6, display: () => 0.62, dot: () => 1 };

test('the turns launch on the &s and land exactly on the kicks, −90° each, with an anticipation and a recoil', () => {
  TURNS.forEach((t, k) => {
    assert.ok(KICKS2.includes(t.to), `${t.to} is a kick`);
    assert.ok(Math.abs(C.cubeTheta(t.to) + 90 * (k + 1)) < 1e-9, `lands on ${t.to}: ${C.cubeTheta(t.to)}`);
    assert.ok(C.cubeTheta(t.from + 1.5) > -90 * k, `${t.from}: anticipation against the turn`);
    assert.ok(C.cubeTheta(t.to + 3) > -90 * (k + 1), `${t.to}: recoil`);
    assert.ok(Math.abs(C.cubeTheta(t.to + 6) + 90 * (k + 1)) < 1e-9, 'settled 6 f later');
  });
  assert.ok(Math.abs(C.cubeTheta(WHIP.to)) < 1e-9, 'the whip unwinds the four turns: +360° back to 0 by drop2 3.1');
});

// Iteration 2 (the director's ruling 7; sync review 1, flow review 2): the whip into drop2 3.1 is a slam, not a cubic in-out — it eases in
// and is fastest on its LAST frame, so the biggest change lands on the downbeat (drop2 3.1), not on the "and" before it (the in-out peaked
// at drop2 3.1 − 5 and coasted into the beat at 15 /255 of change). It unwinds the cube (+360°: LED, Riso, Swiss, then slot 0 as the terminal),
// so the face that leaves on the landing frame is the light Swiss paper and the frame's biggest change is the cut to the dark terminal
// on drop2 3.1 (wound on, −360°, the light faces passed mid-whip and the dark LED came in a frame early).
test('the whip slams onto drop2 3.1: still until drop2 2.4&, its turn a frame grows every frame and is the largest on the frame into drop2 3.1', () => {
  assert.ok(Math.abs(C.cubeTheta(WHIP.from) + 360) < 1e-9, 'the whip starts from the landed neon face');
  const step = (f: number) => Math.abs(C.cubeTheta(f) - C.cubeTheta(f - 1));
  const steps = Array.from({ length: WHIP.to - WHIP.from }, (_, i) => step(WHIP.from + 1 + i));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], `faster every frame: ${steps.map((x) => x.toFixed(0)).join(' ')}`);
  assert.ok(steps.at(-1)! > 70, `the last frame turns ${steps.at(-1)!.toFixed(0)}°`);
  assert.ok(steps.slice(0, 4).reduce((a, b) => a + b, 0) < 0.05 * 360, 'the first third barely moves');
  const camStep = (f: number) => Math.abs(Math.log(S.slashCam(f).zoom / S.slashCam(f - 1).zoom));
  for (let f = WHIP.from + 2; f < WHIP.to; f++) assert.ok(camStep(f + 1) > camStep(f), `the camera unwinds on the same slam: ${f + 1}`);
});

test('at rest exactly one face fills 1500 × 844; turned, two faces share the silhouette without a gap', () => {
  for (const t of TURNS) {
    const v = C.visibleFaces(t.to + 8);
    assert.equal(v.length, 1);
    assert.ok(Math.abs(v[0].x0 - 210) < 0.5 && Math.abs(v[0].x1 - 1710) < 0.5, `${t.to}: ${v[0].x0} ${v[0].x1}`);
  }
  const mid = C.visibleFaces(TURNS[1].to - 3);
  assert.equal(mid.length, 2);
  assert.ok(Math.abs(mid[0].x1 - mid[1].x0) < 1e-6, 'the faces abut');
});

test('the faces land in order: B Swiss on drop2 2.1, C Riso on drop2 2.2, D LED on drop2 2.3, E neon on drop2 2.4, the terminal grid on drop2 3.1', () => {
  assert.deepEqual(TURNS.map((t) => C.frontWorld(t.to)), ['swiss', 'riso', 'led', 'neon']);
  assert.equal(C.frontWorld(POP - 0.01), 'terminal');
  assert.equal(C.frontWorld(POP_OUT), 'A', 'the pop-out starts from S27’s frame');
  // Iteration 3 (verify: the Swiss paper and the Riso passed at drop2 3.1 − 4 … 3.1 − 1 as a cream pop before the beat, and drop2 3.1 itself was dark): the
  // whip passes only dark worlds — the LED, then the light faces re-skinned while they faced away (C as the neon, B as the LED) — so the
  // light comes on drop2 3.1 itself.
  const fronts = [WHIP.from + 8, WHIP.from + 9, POP - 1].map(C.frontWorld);
  assert.deepEqual(fronts, ['led', 'neon', 'led'], `${fronts}`);
});

test('no light face over the whip: from drop2 2.4& to 3.1 every visible face is a dark world (LED, neon, the terminal grid)', () => {
  for (let f = WHIP.from; f < POP; f += 0.125) {
    const light = C.visibleFaces(f).filter((v) => v.world === 'swiss' || v.world === 'riso' || v.world === 'A');
    assert.equal(light.length, 0, `${f}: ${light.map((v) => v.world)}`);
  }
});

test('every slot is re-skinned only while it faces away', () => {
  for (let k = 0; k < 4; k++) {
    let prev = C.slotWorldAt(k, POP_OUT);
    for (let f = POP_OUT; f < POP; f += 0.125) {
      const w = C.slotWorldAt(k, f);
      if (w !== prev) assert.ok(!C.visibleFaces(f).some((v) => v.slot === k) && !C.visibleFaces(f - 0.125).some((v) => v.slot === k), `slot ${k} at ${f}: re-skinned ${prev} → ${w} in view`);
      prev = w;
    }
  }
});

test('the pop-out shrinks S27’s whole frame into the cube’s front: 1920 × 1080 → 1500 × 844, centre 540 → 560', () => {
  assert.deepEqual(C.box(POP_OUT - 1), { w: 1920, h: 1080, cy: 540 });
  const b = C.box(TURNS[0].to + 10);
  assert.ok(Math.abs(b.w - 1500) < 3 && Math.abs(b.h - 844) < 2 && Math.abs(b.cy - 560) < 0.5);
});

test('the hero re-dresses on each landing, whole on the kick’s frame, hops, and crouches into the whip; S29 draws him from drop2 3.1 − 6', () => {
  assert.equal(C.cubeHero(POP_OUT + 2, L).dress, 'swiss');
  assert.equal(C.cubeHero(POP_OUT + 2, L).face, '＼(•ω•)／');
  C.LANDINGS.forEach((l) => {
    const at = temporalSamples(l.at, S.slashTemporal(l.at), S.slashSegment(l.at)).map((s) => `${C.cubeHero(s.frame, L).dress} ${C.cubeHero(s.frame, L).face}`);
    assert.deepEqual([...new Set(at)], [`${l.world} ${l.face}`], `${l.at}: whole on the kick`);
  });
  const y = (f: number) => C.cubeHero(f, L).chars.find((c) => c.part === 'mouth')!.y;
  assert.ok(y(TURNS[0].to + 3) < y(TURNS[0].to) - 8, 'a hop on the landing');
  const sy = (f: number) => C.cubeHero(f, L).chars.find((c) => c.part === 'mouth')!.size;
  assert.ok(sy(C.HANDOVER - 1) < sy(TURNS[3].to + 1) * 0.9, 'the wind-up crouch');
  assert.equal(C.HANDOVER, POP - 6);
  const w = C.cubeHeroPlace(TURNS[0].to + 12);
  assert.ok(Math.abs(w.width - 960) < 1 && Math.abs(w.cy - 520) < 0.5, '960 px at (960, 520)');
});

test('the cross-dissolve: the S27 hero leaves the cube’s front over the same 4 frames the separate hero arrives', () => {
  for (const f of [POP_OUT, POP_OUT + 1, POP_OUT + 2, POP_OUT + 4]) assert.ok(Math.abs(C.s27HeroShare(f) + C.cubeHero(f, L).alpha - 1) < 1e-9);
});

test('every face motif draws only cast faces and its own numerals', () => {
  assert.ok((C.swissFace(TURNS[0].to + 8, L).glyphs.jp ?? []).length === 4);
  assert.ok((C.risoFace(TURNS[1].to + 4, L).glyphs.jp ?? []).length >= 4);
  assert.ok((C.ledFaceSource(TURNS[2].to + 5, L).content.glyphs.dot ?? []).length >= 3);
  assert.ok((C.neonFace(TURNS[3].to + 1, L).add.glyphs.rounded ?? []).length >= 3);
});

test('the pre-roll hand-over to S29’s renderer is whole on its frame: every sub-frame of drop2 3.1 − 6 is drawn by Drop2Zbuf, none of drop2 2.4& + 5', () => {
  const by = (f: number) => temporalSamples(f, S.slashTemporal(f), S.slashSegment(f)).map((s) => C.zbufDrawsHero(s.frame));
  assert.ok(by(C.HANDOVER).every(Boolean), `${C.HANDOVER}: all S29 cells, no double exposure`);
  assert.ok(!by(C.HANDOVER - 1).some(Boolean), `${C.HANDOVER - 1}: all S28’s hero`);
  assert.ok(by(POP - 1).every(Boolean));
});

// ——— Round-1 review fix (R1-liftoff-ghost) ——————————————————————————————————————————————————————————————————————————————————————

test('the lift-off is registered: over the 4 f dissolve the lifted hero sits exactly where the poster draws him (only the look changes)', () => {
  assert.equal(C.LIFT_OFF, POP_OUT + 4, 'he leaves the poster once the dissolve is done');
  for (let f = POP_OUT - 0.25; f <= C.LIFT_OFF - 0.75; f += 0.125) {
    const m = C.posterMap(f)!;
    assert.ok(m, `${f}: the poster shows`);
    const poster = S.heroS27(f, L.rounded).filter((h) => h.part !== 'brow');
    const lifted = C.cubeHero(f, L).chars;
    assert.equal(lifted.length, poster.length, `${f}: the same characters`);
    poster.forEach((p, i) => {
      const q = lifted[i];
      assert.equal(q.ch, p.ch);
      const x = m.ox + m.sx * p.x;
      const y = m.oy + m.sy * p.y;
      assert.ok(Math.hypot(q.x - x, q.y - y) < 1.5, `${f} ${p.ch}: (${q.x.toFixed(1)}, ${q.y.toFixed(1)}) vs the poster’s (${x.toFixed(1)}, ${y.toFixed(1)})`);
      assert.ok(Math.abs(q.size / (p.size * m.sy) - 1) < 0.01 && Math.abs((q.size * q.stretch) / (p.size * p.stretch * m.sx) - 1) < 0.01, `${f} ${p.ch}: its size`);
      assert.ok(Math.abs(q.rot - p.rot) < 1e-9);
    });
  }
});

test('after the dissolve he leaves the poster on a launch and holds 960 px at (960, 520) until face B lands; no jump on the way', () => {
  const mouth = (f: number) => C.cubeHero(f, L).chars.find((c) => c.part === 'mouth')!;
  const open = (f: number) => C.cubeHero(f, L).chars.find((c) => c.part === 'open')!;
  const close = (f: number) => C.cubeHero(f, L).chars.find((c) => c.part === 'close')!;
  for (const f of [C.LIFT_OFF + 4, TURNS[0].to - 1]) {
    const w = close(f).x - open(f).x;
    const ref = (S.masterChars(L.rounded)[4].x - S.masterChars(L.rounded)[0].x) * (C.cubeHeroPlace(f).width / 1240);
    assert.ok(Math.abs(C.cubeHeroPlace(f).width - 960) < 6, `${f}: the place has settled`);
    assert.ok(Math.abs(w - ref) < 1.5, `${f}: 960 px wide (${w.toFixed(1)} vs ${ref.toFixed(1)})`);
    assert.ok(Math.abs(mouth(f).x - 960) < 1.5, `${f}: centred`);
  }
  let prev = mouth(POP_OUT - 0.25);
  for (let f = POP_OUT; f < TURNS[0].to - 0.5; f += 0.125) {
    const m = mouth(f);
    assert.ok(Math.hypot(m.x - prev.x, m.y - prev.y) < 14, `${f}: the ω moves ${Math.hypot(m.x - prev.x, m.y - prev.y).toFixed(1)} px in an 8th of a frame`);
    prev = m;
  }
});

test('the cube takes over from S27 on a whole output frame, and nothing it shows jumps there (camera, box)', () => {
  const sub = (f: number) => temporalSamples(f, S.slashTemporal(f), S.slashSegment(f)).map((s) => C.cubeDraws(s.frame));
  assert.ok(sub(C.CUBE.from).every(Boolean), 'every sub-frame of drop2 1.4& is the cube');
  assert.ok(!sub(C.CUBE.from - 1).some(Boolean), 'none of drop2 1.4& − 1');
  for (const f of [POP_OUT - 1, POP_OUT - 0.75, POP_OUT - 0.5, POP_OUT - 0.25, POP_OUT]) {
    const a = S.slashCam(f - 1e-4);
    const b = S.slashCam(f);
    assert.ok(Math.abs(a.zoom - b.zoom) < 1e-4 && Math.abs(a.roll - b.roll) < 1e-3, `${f}: the camera is continuous (${a.zoom} → ${b.zoom})`);
    assert.ok(Math.abs(C.box(f - 1e-4).w - C.box(f).w) < 0.1, `${f}: the box is continuous`);
  }
});

// The colour law on the carried bars (20-bar sheet §1.3 B, C; since 2026-10-01: red that is not the antivirus's
// becomes another colour). His ω on Swiss paper: amber #FFB23E with a 2 px #111 keyline over the as-built paper knock-out (S27's
// region, S28's face); everything else of his dress as built. The LED marquee's guest is infected: his dots Defender's red code, the ω
// still a lit (amber) dot — his.
test('item C: on Swiss paper his ω is amber with a 2 px #111 keyline over the paper knock-out (S27 and S28); his other glyphs as built', () => {
  const amber = linear(SWISS_OMEGA.fill);
  const key = linear(SWISS_OMEGA.keyline.color);
  const ink = linear(PALETTES.swiss.ink);
  const s27 = S.dressHero(S.heroS27(BLADES[1] + 2, L.rounded), 'swiss').normal;
  const cube = C.dressCubeHero(C.cubeHero(TURNS[0].to + 2, L)).normal;
  for (const [name, gs] of [['S27', s27], ['S28', cube]] as const) {
    const om = gs.filter((g) => g.ch === 'ω');
    assert.equal(om.length, 2, `${name}: the knock-out and the amber ω`);
    assert.deepEqual(om[0].color, ink, `${name}: under it, the ω's paper knock-out in ink (as built, under the new fill)`);
    assert.deepEqual(om[1].color, amber, `${name}: the ω amber`);
    assert.deepEqual(om[1].outlineColor, key, `${name}: its keyline #111`);
    assert.ok(Math.abs(om[1].outline! * om[1].size - SWISS_OMEGA.keyline.px) < 1e-9, `${name}: 2 px`);
    for (const g of gs.filter((x) => x.ch !== 'ω')) assert.notDeepEqual(g.color, linear(PALETTES.swiss.red), `${name}: no Swiss red on him (${g.ch})`);
  }
});

test('item B: the LED marquee’s second row ends on the infected guest (￣ω￣)/♫…, his dots Defender’s red code and the ω lit amber; the rest of the row as built', () => {
  const f = TURNS[2].to + 4;
  const dots = C.ledFaceSource(f, L).content.glyphs.dot ?? [];
  const red = dots.filter((g) => g.color[0] === C.LED_CODE.defender[0] && g.color[1] === C.LED_CODE.defender[1] && g.color[2] === C.LED_CODE.defender[2]);
  assert.ok(red.length > 0, 'the guest is drawn in Defender’s code');
  assert.ok(red.every((g) => g.ch !== 'ω'), 'never his ω');
  const guest = [...LED_ROWS.second.split('  ').pop()!].filter((ch) => ch.trim() !== '');
  for (const g of red) assert.ok(guest.includes(g.ch), `only the guest’s characters turn red (${g.ch})`);
  const omegas = dots.filter((g) => g.ch === 'ω');
  assert.ok(omegas.length > 0 && omegas.every((g) => g.color.every((c) => c === 1)), 'every ω on the board is a lit dot');
  const host = dots.filter((g) => !guest.includes(g.ch));
  assert.ok(host.every((g) => g.color.every((c) => c === 1)), 'the timecode and the dancer stay lit amber, as built');
});
