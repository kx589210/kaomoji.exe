// The comic club, bars 4–6 (src/shots/clubInkB.ts, club builder b; build sheet notes/b58/club-sheet.md §3.5–§3.8, §4 E6–E14, §5): the
// honeypot match cut, the crash zoom into the lens, the reticle and the LOCK, the E10 match on his face, the plates registering into exact
// red, the page and the flight (v04's law) landing his ω on the glass's, the 15 focus lines on the crack angles, the tension meter; every
// swap whole on its drum frame, every character in its atlas, amber his and red the antivirus's, sub-frames inside their segments.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HERO_INK, GUEST_INK } from '../src/content/castClub.ts';
import { CARRIER, INK_ATLASES, type InkAtlasId, SCAN_LOCKED, SERIAL, scanBalloon } from '../src/content/club.ts';
import { multiplyRGB } from '../src/engine/color.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as C from '../src/score/club.ts';
import { inkPartAt, inkSegment } from '../src/shots/clubInk.ts';
import { AMBER, INK_FINISH, K, LEMON_PLATE, MAGENTA_PLATE, NIGHT, PAPER, PINK, RED, VOID, type InkLayout } from '../src/shots/clubInkKit.ts';
import * as B from '../src/shots/clubInkB.ts';
import { GLASS, SHARDS, glassFrame } from '../src/shots/glass.ts';

const advance = (ch: string): number => (ch.charCodeAt(0) > 0x2000 ? 1 : 0.6);
const L: InkLayout = { advance: { face: advance, sfx: advance, ui: advance, display: advance, mono: advance, readout: advance } };
type Id = keyof typeof B.B_PARTS;
const MINE: readonly Id[] = ['bar', 'lens', 'incident', 'flight'];
/** The draw list of instant f, by the dispatcher's routing (bars 4–6 only). */
const drawsAt = (f: number): B.InkDrawB[] => {
  const id = inkPartAt(f) as Id;
  assert.ok(MINE.includes(id), `${f} routes to ${id}`);
  return B.B_PARTS[id].frame(f, L);
};
const glyphsOf = (draws: readonly B.InkDrawB[]): { atlas: string; g: Glyph }[] => draws.flatMap((d) => Object.entries(d.content.glyphs).flatMap(([atlas, gs]) => gs.map((g) => ({ atlas, g }))));
const same = (a: readonly number[], b: readonly number[], eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const has = (draws: readonly B.InkDrawB[], ch: string, color?: readonly number[]) => glyphsOf(draws).some(({ g }) => g.ch === ch && (!color || same(g.color, color)));
const temporalOf = (F: number) => B.B_PARTS[inkPartAt(F) as Id].temporal(F);
/** Every sub-frame instant of output frame F (its own part's photography, clamped into the club's segment). */
const samplesOf = (F: number): number[] => temporalSamples(F, temporalOf(F), inkSegment(F)).map((s) => s.frame);
const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);

test('bars 4–6 are four parts under their stubs’ names, routed as the score says; each draws every instant of its range from a ground', () => {
  assert.deepEqual([B.BAR_RANGE.from, B.BAR_RANGE.to], [C.MATCH_CUP, C.LENS]);
  assert.deepEqual([B.LENS_RANGE.from, B.LENS_RANGE.to], [C.LENS, C.KICK_CUP]);
  assert.deepEqual([B.INCIDENT_RANGE.from, B.INCIDENT_RANGE.to], [C.KICK_CUP, C.THROW]);
  assert.deepEqual([B.FLIGHT_RANGE.from, B.FLIGHT_RANGE.to], [C.THROW, C.HIT]);
  for (const f of range(C.MATCH_CUP, C.HIT, 0.5)) {
    const d = drawsAt(f);
    assert.ok(d.length > 1 && d[0].paper, `${f}: a ground first, then the picture`);
  }
});

test('every character drawn is in the atlas it is drawn from (src/content/club.ts INK_ATLASES), on every half frame of bars 4–6', () => {
  const missing = new Set<string>();
  for (const f of range(C.MATCH_CUP, C.HIT, 0.5)) {
    for (const { atlas, g } of glyphsOf(drawsAt(f))) if (!INK_ATLASES[atlas as InkAtlasId].chars.includes(g.ch)) missing.add(`${atlas}:${g.ch}@${f}`);
  }
  assert.deepEqual([...missing], []);
});

test('swaps are whole on their drum frame: every sub-frame of the frame shows the new state (taken at the output frame)', () => {
  const every = (F: number, ok: (d: B.InkDrawB[]) => boolean, what: string, before = true) => {
    for (const s of samplesOf(F)) assert.ok(ok(drawsAt(s)), `${what}: frame ${F}, sub-frame ${s}`);
    if (before) for (const s of samplesOf(F - 1)) assert.ok(!ok(drawsAt(s)), `${what}: not yet on frame ${F - 1}, sub-frame ${s}`);
  };
  const ground = (d: B.InkDrawB[]) => d[0].paper!.color;
  every(C.LENS, (d) => same(ground(d), PAPER), 'the landing in the lens (club 4.3)');
  every(C.SPLASH, (d) => has(d, '・') && !has(d, '￣'), 'SPLASH: (・_・) wet');
  every(C.LIGHTS_OUT, (d) => same(ground(d), K), 'lights out');
  every(C.RED_EYES, (d) => has(d, '°', RED), 'his eyes red');
  every(C.GRAB, (d) => has(d, '□', RED), 'the red face on the grab');
  every(B.SWING.from, (d) => has(d, 'Σ', AMBER), 'the swing (U2): Σ(°ω°;) as he is whipped round, 8 frames before the throw');
  every(C.THROW, (d) => has(d, 'Σ', AMBER), 'the throw: Σ(°ω°;) launched', false);
  every(C.LOCK, (d) => has(d, '1'), 'the LOCK: [SCAN] 1 threat');
  every(C.club(6), (d) => d.every((x) => !x.clip), 'panel 9 baked from club 6.1');
  every(C.CLEAR, (d) => d.every((x) => !x.page), 'the page gone at the clear');
  every(C.HIT - 1, (d) => has(d, '>', AMBER) && has(d, '<', AMBER), 'his (>ω<) on HIT − 1', false);
});

test('E6, the match cut: on club 4.1 the cocktail’s rim is r 300 about the centre and the red cherry r 44 on it, where the record left him', () => {
  const cam = B.barCam(C.MATCH_CUP, advance);
  assert.ok(Math.abs(cam.zoom * 114 - 300) < 1, `rim ${cam.zoom * 114}`);
  const cherry = drawsAt(C.MATCH_CUP).flatMap((d) => d.polys ?? []).filter((p) => same(p.color, RED));
  assert.equal(cherry.length, 1, 'one red thing: the cherry');
  const xs = cherry[0].tri.filter((_, i) => i % 2 === 0);
  const ys = cherry[0].tri.filter((_, i) => i % 2 === 1);
  const c = B.toScreen(cam, [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]);
  const r = ((Math.max(...xs) - Math.min(...xs)) / 2) * cam.zoom;
  assert.ok(Math.hypot(c[0], c[1]) < 1.5, `cherry at ${c}`);
  assert.ok(Math.abs(r - 44.7) < 3, `cherry r ${r} (with its keyline)`);
});

test('E8, the crash zoom: his left lens arrives at the centre, ×11.6 (Ø 110 → 1276, the lens part’s circle), landing on club 4.3 (I)', () => {
  const [lens] = B.guestLenses(advance);
  const before = B.barCam(C.LENS - 1e-3, advance);
  assert.ok(Math.abs(before.zoom - B.CRASH_ZOOM_TO) < 0.01);
  const at = B.toScreen(before, lens);
  assert.ok(Math.hypot(at[0], at[1]) < 0.5, `${at}`);
  // An impact: accelerating, so the zoom's step grows frame to frame.
  const z = range(C.CRASH_ZOOM.from, C.LENS + 1).map((f) => Math.log(B.barCam(Math.min(f, C.LENS - 1e-3), advance).zoom));
  for (let i = 2; i < z.length; i++) assert.ok(z[i] - z[i - 1] >= z[i - 1] - z[i - 2] - 1e-9, `${i}`);
});

test('the reticle hops on the 16ths to each carrier (tagged), and on the LOCK closes on him (r 90 → 64); the balloon fills a cell a tick', () => {
  B.RETICLE_STOPS.slice(1, 4).forEach((stop, i) => {
    // The third hop is cut short by the run onto him (round 2, R2-7: I over the 32nd before the LOCK): most of the way there by then.
    const r = B.reticleAt(i < 2 ? C.HOPS[i] + 5.9 : C.LOCK - B.LOCK_RUN - 0.01);
    assert.ok(Math.hypot(r.x - stop.p[0], r.y - stop.p[1]) < (i < 2 ? 5 : 30), `hop ${i}`);
    assert.ok(has(B.B_PARTS.lens.frame(C.HOPS[i] + 1, L), CARRIER[0], RED), `the tag on hop ${i}`);
  });
  const lock = B.reticleAt(C.LOCK + 18);
  assert.ok(Math.hypot(lock.x - B.HERO_IN_LENS[0], lock.y - B.HERO_IN_LENS[1]) < 1 && Math.abs(lock.r - 64) < 1);
  const text = (f: number) => glyphsOf(drawsAt(f)).filter(({ atlas, g }) => atlas === 'mono' && same(g.color, RED)).map(({ g }) => g.ch).join('');
  assert.equal(text(C.SHADES), '[SCAN]', 'the cells are boxes, the words glyphs');
  assert.equal(text(C.LOCK), SCAN_LOCKED.replace(/ /g, ''));
});

test('E10, the match on his face: the inset’s (•ω•) on club 4.4a and the kick’s (…) on club 5.1 are within 20 px and the same size ±20 %', () => {
  const core = (draws: B.InkDrawB[], size: number) => {
    const gs = glyphsOf(draws).filter(({ g }) => same(g.color, AMBER) && Math.abs(g.size - size) < 1 && '(•ω•)'.includes(g.ch)).map(({ g }) => g);
    const xs = gs.map((g) => g.x);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, gs.reduce((s, g) => s + g.y, 0) / gs.length];
  };
  const out = core(drawsAt(C.KICK_CUP - 1), 190);
  const into = core(drawsAt(C.KICK_CUP), 220);
  assert.ok(Math.hypot(out[0] - into[0], out[1] - into[1]) < 20, `${out} → ${into}`);
  assert.ok(Math.abs(220 / 190 - 1) < 0.2);
});

test('the M × Y plates register into exactly his red: magenta′ × lemon′ (multiply) is #E8402B; on the grab the rage face is that red', () => {
  const m = multiplyRGB(MAGENTA_PLATE, LEMON_PLATE);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(m[i] - RED[i]) < 0.005, `${i}: ${m[i]} vs ${RED[i]}`);
  const plates = drawsAt(C.PLATES.from + 1);
  const printed = plates.filter((d) => d.layer === 'print').flatMap((d) => Object.values(d.content.glyphs).flat());
  assert.ok(printed.some((g) => same(g.color, MAGENTA_PLATE)) && printed.some((g) => same(g.color, LEMON_PLATE)), 'both plates overprint');
  assert.ok(has(drawsAt(C.GRAB), '╯', RED));
});

test('the throw (E13): the swing lets him go on the throw exactly at WOUND, where the flight law starts him: em 200, turned as the loop left him', () => {
  const h = B.heldAt(C.THROW, advance);
  assert.ok(Math.hypot(h.x - B.WOUND[0], h.y - B.WOUND[1]) < 0.5 && Math.abs(h.rot - B.WOUND_ROT) < 1e-3, `${h.x}, ${h.y}`);
  const p = B.flightAt(C.THROW);
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  assert.deepEqual([p.x, p.y, p.em, p.rot].map(r3), [B.WOUND[0], B.WOUND[1], B.HELD_EM, B.WOUND_ROT].map(r3));
});

test('the flight law (v04’s, S0 200): he grows ever faster to ≈ 1710 on HIT − 1 and 1800 on the hit, one tumble dying out face-on, his ω landing on the glass’s', () => {
  let last = 0;
  for (const f of range(C.THROW, C.HIT + 1)) {
    const p = B.flightAt(f);
    assert.ok(p.em >= last, `${f}`);
    last = p.em;
  }
  const end = B.flightAt(C.HIT - 1);
  assert.ok(Math.abs(end.em - 1710) < 10, `${end.em}`);
  const wrapped = ((end.rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  assert.ok(Math.min(wrapped, 2 * Math.PI - wrapped) < 0.01, `face-on: ${wrapped}`);
  const hit = B.flightAt(C.HIT);
  assert.deepEqual([hit.x, hit.y, hit.em].map((v) => Math.round(v * 1e6) / 1e6), [B.OMEGA_AT_HIT[0], B.OMEGA_AT_HIT[1], B.AT_GLASS_EM]);
});

test('E14, the hand-off: on HIT − 1 the frame is VOID + him + the 15 lines, his ω’s ink on the glass’s ω of the hit, the plates in register', () => {
  const draws = drawsAt(C.HIT - 1);
  assert.ok(same(draws[0].paper!.color, VOID));
  assert.ok(draws.every((d) => !d.page && !d.clip), 'no page, no panel');
  assert.deepEqual(B.flightPlates(C.HIT - 1), [0, 0]);
  // The glass's own ω on the hit (its glyph's middle line, its ink OMEGA_INK_DROP of an em lower).
  const g = glassFrame(GLASS.hit, advance).light.glyphs.neon.find((x) => x.ch === 'ω')!;
  assert.ok(Math.abs(g.x - B.OMEGA_AT_HIT[0]) < 5 && Math.abs(g.y - B.OMEGA_INK_DROP * g.size - B.OMEGA_AT_HIT[1]) < 5, `glass ω ${g.x}, ${g.y - B.OMEGA_INK_DROP * g.size}`);
  // His: the ω glyph (unturned on HIT − 1) with its ink drop lands within 3 px of it.
  const w = glyphsOf(draws).filter(({ g: x }) => x.ch === 'ω' && same(x.color, AMBER)).map(({ g: x }) => x)[0];
  assert.ok(Math.hypot(w.x - B.OMEGA_AT_HIT[0], w.y - B.OMEGA_INK_DROP * w.size - B.OMEGA_AT_HIT[1]) < 4, `his ω ${w.x}, ${w.y - B.OMEGA_INK_DROP * w.size}`);
  assert.ok(w.size > 1690 && w.size < 1730);
});

test('the focus lines lie on the glass’s 15 crack angles (imported from glass.ts SHARDS, not copied), fading up from club 5.4', () => {
  assert.equal(B.CRACK_ANGLES.length, 15);
  SHARDS.filter((s) => s.ring === 0).forEach((s, i) => assert.ok(Math.abs(Math.atan2(s.pts[1][1], s.pts[1][0]) - B.CRACK_ANGLES[i]) < 1e-12));
  const lines = drawsAt(C.PAGE + 30).flatMap((d) => d.polys ?? []).find((p) => same(p.color, PAPER) && p.tri.length === 15 * 2 * 3 * 4);
  assert.ok(lines, 'one poly of 15 wedges');
  for (let i = 0; i < 15; i++) {
    const t = lines!.tri.slice(i * 24, i * 24 + 24);
    const [cx, cy] = [t[0], t[1]];
    assert.ok(Math.abs(Math.atan2(cy, cx) - B.CRACK_ANGLES[i]) < 1e-6, `line ${i}`);
  }
  assert.ok(!drawsAt(C.PAGE - 1).flatMap((d) => d.polys ?? []).some((p) => p.tri.length === 15 * 24), 'none before club 5.4');
});

test('the page (sheet §3.8): nine panels frozen at the designed instants; panel 9 punched out on the throw, the page at 0.5 by club 5.3&, 0.16 by the clear', () => {
  assert.deepEqual(B.PANELS.map((p) => [p.part, p.at - C.CLUB.from]), [
    ['splash', C.DISCO - C.CLUB.from], ['splash', C.INFECTIONS[0] - C.CLUB.from], ['splash', C.TING - C.CLUB.from], ['record', C.FLOWER - C.CLUB.from],
    ['bar', C.MATCH_CUP + 6 - C.CLUB.from], ['bar', C.SHADES + 8 - C.CLUB.from], ['lens', C.LOCK + 2 - C.CLUB.from], ['incident', C.SPLASH + 4 - C.CLUB.from], ['diptych', C.club(6) - 1 - C.CLUB.from],
  ]);
  // Panel 9 full frame up to the throw; on the throw's frame (all of it) the punch-out, about panel 9.
  const at = B.pageCam(C.THROW);
  assert.ok(Math.abs(at.zoom - 2 ** -B.PAGE_KICK) < 1e-9 && at.turn === 0 && at.pitch === 0);
  assert.ok(Math.hypot(at.x - B.PANEL9.x, at.y - B.PANEL9.y) < 0.02 * Math.hypot(B.PANEL9.x, B.PANEL9.y));
  assert.equal(B.pageCam(C.THROW - 0.2).zoom, 2 ** -B.PAGE_KICK, 'whole on the throw’s frame');
  assert.ok(Math.abs(B.pageCam(C.PAGE - 12).zoom - 0.5) < 0.05, 'about half size by club 5.3&');
  // From club 5.4 the page recedes on the drums: slapped back on each hit, the biggest step of its run landing on the hit's frame.
  for (const h of B.RECEDE_HITS) {
    const step = (f: number) => Math.abs(Math.log(B.pageCam(f).zoom / B.pageCam(f - 1).zoom));
    for (const g of [h - 2, h - 1, h + 1, h + 2]) if (g > C.PAGE && g < C.CLEAR) assert.ok(step(h) >= step(g) - 1e-9, `slapped on ${h} (vs ${g})`);
  }
  assert.ok(Math.abs(B.pageCam(C.CLEAR).zoom - 0.16) < 1e-6 && Math.abs(B.pageCam(C.CLEAR).dark - 0.85) < 1e-6);
  for (const f of [C.THROW, C.club(6) - 1]) assert.ok(drawsAt(f).some((d) => d.clip) && drawsAt(f).some((d) => d.page), `${f}: page + live panel 9`);
  for (const f of [C.club(6), C.CLEAR - 1]) assert.ok(drawsAt(f).some((d) => d.page) && !drawsAt(f).some((d) => d.clip), `${f}: the page alone`);
});

test('the tension meter: plates along his motion (≤ 12 px) to club 6.1, then 3, 8, ±12 → 20 rattling on the 32nds, 0 on HIT − 1', () => {
  const m = (f: number) => Math.hypot(...B.flightPlates(f));
  for (const f of range(C.THROW, C.club(6))) assert.ok(m(f) <= 12 + 1e-9, `${f}`);
  assert.ok(Math.abs(m(C.club(6)) - 3) < 1e-9 && Math.abs(m(C.club(6, 1)) - 8) < 1e-9 && Math.abs(m(C.club(6, 2)) - 12) < 1e-9);
  assert.ok(Math.abs(m(C.HIT - 3) - 20) < 1e-9 && m(C.HIT - 1) === 0);
  const a = B.flightPlates(C.club(6, 2));
  const b = B.flightPlates(C.club(6, 2) + 3);
  assert.ok(a[0] * b[0] + a[1] * b[1] < 0, 'each 32nd the other way');
});

test('looks: the lens unprinted (the antivirus’s screen), every other frame printed with the comic pass, no flash; the flight’s plates are the tension meter', () => {
  for (const f of range(C.MATCH_CUP, C.HIT)) {
    const id = inkPartAt(f) as Id;
    const look = B.B_PARTS[id].look(f);
    assert.equal(look.flash ?? 0, 0);
    if (id === 'lens') assert.deepEqual(look, INK_FINISH);
    else assert.equal(look.comic?.amount, 1, `${f}`);
    if (id === 'flight') assert.deepEqual(look.comic?.offsets?.c, B.flightPlates(f));
  }
});

test('photography: ≥ 24 sub-frames everywhere, the crash zoom and its landing 96, the throw 32 @ 0.35 (round 1: v04’s 0.75 smeared the printed page) then 32 @ 0.4 (R14); no sub-frame leaves its segment', () => {
  for (const F of range(C.MATCH_CUP, C.HIT)) {
    const t = temporalOf(F);
    assert.ok(t.samples >= 24, `${F}`);
    const seg = inkSegment(F);
    for (const s of samplesOf(F)) assert.ok(s >= seg.from && s < seg.to, `${F}: ${s}`);
  }
  for (const F of [...range(C.CRASH_ZOOM.from, C.CRASH_ZOOM.to), C.LENS]) assert.equal(temporalOf(F).samples, 96, `${F}`);
  assert.deepEqual(temporalOf(C.THROW), { samples: 32, shutter: 0.35, persistence: 0 });
  assert.ok(B.THROW_SHUTTER <= 0.35);
  assert.deepEqual(temporalOf(C.THROW + 20), { samples: 32, shutter: 0.4, persistence: 0 });
});

test('colour belongs to its owner: amber glyphs only his (his faces, the friends’ ω mouths), red glyphs only the antivirus’s (its faces, its system voice)', () => {
  const amber = new Set([...Object.values(HERO_INK).flat().join(''), 'ω']);
  const red = new Set([...GUEST_INK.rage, ...GUEST_INK.redEyes, ...SCAN_LOCKED, ...scanBalloon(8), ...CARRIER, ...SERIAL]);
  for (const f of range(C.MATCH_CUP, C.HIT, 2)) {
    for (const { g } of glyphsOf(drawsAt(f))) {
      // A rim or shadow pass (its outline its own colour) is the hand that holds him, not ink of the character.
      if (g.outlineColor && same(g.outlineColor, g.color)) continue;
      if (same(g.color, AMBER)) assert.ok(amber.has(g.ch), `amber ${g.ch} at ${f}`);
      if (same(g.color, RED)) assert.ok(red.has(g.ch), `red ${g.ch} at ${f}`);
    }
  }
  assert.ok(!same(NIGHT, RED));
});

test('the flight’s drum jolts are whole on their frame: every sub-frame of a roll hit’s frame draws him at the same jolted place', () => {
  // His ω (the reaction balloons' amber mouths are small: he is ≥ 200 em).
  const omega = (f: number) => glyphsOf(drawsAt(f)).filter(({ g }) => g.ch === 'ω' && same(g.color, AMBER) && g.size > 150).map(({ g }) => g)[0];
  for (const h of C.ROLL.filter((r) => r < C.CLEAR)) {
    const xs = samplesOf(h).map((s) => omega(s));
    const spread = Math.max(...xs.flatMap((a) => xs.map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
    // His own flight moves him a little inside the shutter; a jolt split across it would be ≥ 14 px.
    assert.ok(spread < 10, `${h}: ${spread.toFixed(1)} px`);
  }
});

test('the pink panel prints pink (R2-6): its Ben-Day is real round PINK dots on PAPER, pitch 22–28 at 45°, covering ≥ 45 % (≥ 55 % on the kick and the splash)', () => {
  for (const F of [C.KICK_CUP, C.KICK_CUP + 2, C.SPLASH, C.SPLASH + 4, C.LIGHTS_OUT - 1]) {
    const draws = drawsAt(F);
    // One draw of its own (the PolyLayer's capacity), solid PINK, no shader screen (its cosine screen prints a .35 tint as ≈ 20 %).
    const dots = draws.filter((d) => d.polys?.length === 1 && same(d.polys[0].color, PINK) && d.polys[0].tri.length > 60 * 3000);
    assert.equal(dots.length, 1, `${F}: the dots`);
    const p = dots[0].polys![0];
    assert.ok(p.tint === undefined && p.screen === undefined, `${F}: solid ink`);
    // Each dot is a decagon (10 triangles round its centre): its area over the lattice cell is the coverage.
    const cx = (i: number) => p.tri[60 * i];
    const cy = (i: number) => p.tri[60 * i + 1];
    let area = 0;
    for (let k = 0; k < 10; k++) {
      const t = p.tri.slice(6 * k, 6 * k + 6);
      area += Math.abs((t[2] - t[0]) * (t[5] - t[1]) - (t[4] - t[0]) * (t[3] - t[1])) / 2;
    }
    // The lattice: the nearest neighbour of the dot nearest the centre.
    const n = p.tri.length / 60;
    let c0 = 0;
    for (let i = 1; i < n; i++) if (Math.hypot(cx(i), cy(i)) < Math.hypot(cx(c0), cy(c0))) c0 = i;
    let nb = c0 === 0 ? 1 : 0;
    for (let i = 0; i < n; i++) if (i !== c0 && Math.hypot(cx(i) - cx(c0), cy(i) - cy(c0)) < Math.hypot(cx(nb) - cx(c0), cy(nb) - cy(c0))) nb = i;
    const pitch = Math.hypot(cx(nb) - cx(c0), cy(nb) - cy(c0));
    const angle = (Math.atan2(cy(nb) - cy(c0), cx(nb) - cx(c0)) * 180) / Math.PI;
    assert.ok(pitch >= 22 && pitch <= 28, `${F}: pitch ${pitch.toFixed(1)}`);
    assert.ok(Math.abs(((angle % 90) + 90) % 90 - 45) < 1e-6, `${F}: 45° (${angle.toFixed(1)}°)`);
    const coverage = area / pitch ** 2;
    assert.ok(coverage >= 0.45 && coverage <= 0.7, `${F}: coverage ${coverage.toFixed(3)}`);
    if (F === C.KICK_CUP || F === C.SPLASH) assert.ok(coverage >= 0.55, `${F}: the dots swell on the drum (${coverage.toFixed(3)})`);
    // The dots reach every edge of the frame.
    let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
    for (let i = 0; i < p.tri.length; i += 2) [x0, x1, y0, y1] = [Math.min(x0, p.tri[i]), Math.max(x1, p.tri[i]), Math.min(y0, p.tri[i + 1]), Math.max(y1, p.tri[i + 1])];
    assert.ok(x0 < -1000 && x1 > 1000 && y0 < -600 && y1 > 600, `${F}: full bleed`);
  }
  for (const p of drawsAt(C.KICK_CUP + 2).flatMap((d) => d.polys ?? [])) if ((p.tint ?? 1) === 1) assert.ok(!same(p.color, RED) || p.tri.length < 600, 'no big red area in the pink panel');
});

// ——— U2: the throw an audience reads in one look ————————————————————————————————————————————————————————————————————————————————

test('U2, the throw: the grab, a wind-up away from the release (anticipation), one big loop accelerating into the drum, the release on THROW, the follow-through up and over', () => {
  const R = B.LOOP.c;
  const at = (g: number) => B.throwPose(g, advance);
  const grab = at(C.GRAB);
  const wound = at(B.SWING.from);
  // The wind-up hauls him away from where he will be let go (down before up): its pull points against the release, ≥ 100 px further off.
  const dist = (p: { x: number; y: number }) => Math.hypot(p.x - B.WOUND[0], p.y - B.WOUND[1]);
  assert.ok(dist(wound) > dist(grab) + 100, `anticipation: ${dist(grab).toFixed(0)} → ${dist(wound).toFixed(0)} px from the release`);
  // Down before up: the haul drags him ≥ 150 px down, and the loop lets him go above where he was grabbed.
  assert.ok(wound.y < grab.y - 150 && B.WOUND[1] > grab.y, `the wind-up pulls down, against the throw up and over: ${grab.y.toFixed(0)} → ${wound.y.toFixed(0)}, released at ${B.WOUND[1].toFixed(0)}`);
  assert.ok(wound.sx > 1.05 && wound.sy < 0.95, 'squashed in the wind-up');
  // The swing (round 1, R1/T1): a big arc (≥ 60° round the loop, ≥ 500 px of travel for the fist), turning faster every frame but never more
  // than 45° in one (the arc reads on every frame). Its last step ≤ 200 px (round 2, R2-2: the loop grew to 780 × 510, so its steps did; the
  // swoosh behind him spans them — round 1's limit of 125 px was for a bare strobe).
  const frames = Array.from({ length: B.SWING.to - B.SWING.from + 1 }, (_, i) => at(B.SWING.from + i));
  let path = 0;
  let last = 0;
  let step = 0;
  for (let i = 1; i < frames.length; i++) {
    const turn = frames[i - 1].angle - frames[i].angle;
    const deg = (r: number) => ((r * 180) / Math.PI).toFixed(1);
    assert.ok(turn > last, `accelerating round the loop: ${deg(turn)}° after ${deg(last)}°`);
    assert.ok(turn <= (45 * Math.PI) / 180, `no frame steps more than 45°: ${deg(turn)}°`);
    last = turn;
    step = Math.hypot(frames[i].hand[0] - frames[i - 1].hand[0], frames[i].hand[1] - frames[i - 1].hand[1]);
    path += step;
  }
  assert.ok(step <= 200, `the fist's last step ${step.toFixed(0)} px`);
  assert.ok(path >= 500, `the swing's fist travels ${path.toFixed(0)} px`);
  const sweep = Math.abs(frames[0].angle - frames[frames.length - 1].angle);
  assert.ok(sweep >= (60 * Math.PI) / 180, `round the loop ${((sweep * 180) / Math.PI).toFixed(0)}°`);
  assert.ok(frames.slice(0, -1).every((p) => p.held) && !at(C.THROW).held, 'held through the swing, let go on the throw');
  // The fist rides the loop the whole swing; he leaves along its tangent, clockwise, and tumbles on the same way (the flight's turn falls).
  for (const p of frames) assert.ok(Math.abs(((p.hand[0] - R[0]) / B.LOOP.rx) ** 2 + ((p.hand[1] - R[1]) / B.LOOP.ry) ** 2 - 1) < 1e-9, 'on the loop');
  const t0 = B.flightAt(C.THROW);
  const t1 = B.flightAt(C.THROW + 1);
  const tangent = [B.LOOP.rx * Math.sin(B.LOOP.to), -B.LOOP.ry * Math.cos(B.LOOP.to)].map((v, _, a) => v / Math.hypot(a[0], a[1]));
  const go = [t1.x - t0.x, t1.y - t0.y];
  assert.ok((go[0] * tangent[0] + go[1] * tangent[1]) / Math.hypot(go[0], go[1]) > 0.9, 'he flies off along the loop’s tangent');
  assert.ok(t1.rot < t0.rot, 'the tumble carries on clockwise');
  // The follow-through carries on round the loop, the same way (clockwise), then the arm draws back into his shoulder.
  const after = at(C.THROW + 4);
  assert.ok(after.angle < at(C.THROW).angle && !after.held);
  const S = B.shoulderAt(C.THROW, advance);
  assert.ok(Math.hypot(at(C.THROW + 8).hand[0] - S[0], at(C.THROW + 8).hand[1] - S[1]) < 1, 'the arm drawn back into his shoulder before it would pop off');
});

test('U2/U3, hands belong to their owners: the guest’s arm is a curved hose from his shoulder to a fist on the hero’s head, in his RED on a K keyline; the hero’s face is whole on every frame of the swing and the flight', () => {
  for (const F of [C.GRAB + 2, B.SWING.from + 3, C.THROW - 1]) {
    const draws = drawsAt(F);
    const red = draws.flatMap((d) => d.polys ?? []).filter((p) => same(p.color, RED));
    assert.ok(red.reduce((n, p) => n + p.tri.length / 6, 0) > 60, `frame ${F}: the arm and fist are drawn as shapes in his red`);
    // Every sub-frame of the frame draws the hero in one place (taken at the output frame).
    // His glyphs (all amber; a friend's amber is only an infected ω).
    const where = (f: number) => glyphsOf(drawsAt(f)).filter(({ g }) => same(g.color, AMBER) && g.ch !== 'ω').map(({ g }) => `${g.ch}${g.x.toFixed(3)},${g.y.toFixed(3)}`).join('|');
    const one = new Set(samplesOf(F).map(where));
    assert.equal(one.size, 1, `frame ${F}: his face drawn in ${one.size} places across the shutter`);
  }
  for (const F of [C.THROW, C.THROW + 1, C.THROW + 6, C.club(6, 1), C.club(6, 2) + 1]) {
    const where = (f: number) => glyphsOf(drawsAt(f)).filter(({ g }) => same(g.color, AMBER) && g.ch !== 'ω').map(({ g }) => `${g.ch}${g.x.toFixed(3)},${g.y.toFixed(3)},${g.size.toFixed(3)}`).join('|');
    assert.equal(new Set(samplesOf(F).map(where)).size, 1, `the flight, frame ${F}: whole on its frame`);
  }
});

// ——— Round 1 fixes (review of club-wip-v03: T1–T4, T8, R1–R5, R8) ———————————————————————————————————————————————————————————————

/** Rough advances of the face font (M PLUS Rounded 1c ExtraBold, ems), for the tests that need his real length. */
const FACE_ADV: Record<string, number> = { 'Σ': 0.62, '(': 0.36, ')': 0.36, '°': 0.42, 'ω': 0.8, ';': 0.3, '•': 0.36, 'ﾟ': 0.5, '⊙': 0.9, '>': 0.6, '<': 0.6 };
const faceAdv = (ch: string): number => FACE_ADV[ch] ?? 0.6;

test('T1, the release carries the swing’s momentum: his ω never changes speed by more than ×2 frame to frame from the swing into the flight, and leaves at ≥ 60 % of the swing’s last step', () => {
  const omega = (d: number): [number, number] => (d < C.THROW ? [B.throwPose(d, advance).x, B.throwPose(d, advance).y] : [B.flightAt(d).x, B.flightAt(d).y]);
  const speed = (d: number) => Math.hypot(omega(d)[0] - omega(d - 1)[0], omega(d)[1] - omega(d - 1)[1]);
  for (let d = C.THROW - 2; d <= C.THROW + 5; d++) {
    const r = speed(d) / speed(d - 1);
    assert.ok(r > 0.5 && r < 2, `${d}: ${speed(d - 1).toFixed(0)} → ${speed(d).toFixed(0)} px/f`);
  }
  assert.ok(speed(C.THROW + 1) >= 0.6 * speed(C.THROW), `first flight step ${speed(C.THROW + 1).toFixed(0)} after the swing's ${speed(C.THROW).toFixed(0)}`);
  // The momentum is gone by the hit: the law still lands his ω on the glass's (the E14 test pins it).
  assert.ok(Math.hypot(B.flightAt(C.HIT).x - B.OMEGA_AT_HIT[0], B.flightAt(C.HIT).y - B.OMEGA_AT_HIT[1]) < 1e-6);
});

test('T1/R8, he stays in frame: from the throw to club 5.4 his whole turned face (fill, keyline, rim) keeps ≥ 40 px inside the top and bottom edges', () => {
  for (let d = C.THROW; d <= C.PAGE; d++) {
    const H = B.heroInFlight(d, faceAdv);
    const half = (B.widthOf(H.face, faceAdv) / 2) * H.em;
    const thick = 0.55 * H.em + Math.min(0.036 * H.em, 24) + Math.min(0.025 * H.em, 14);
    const ext = Math.abs(Math.sin(H.rot)) * half + Math.abs(Math.cos(H.rot)) * thick;
    assert.ok(H.cy + ext <= 540 - 40 && H.cy - ext >= -540 + 40, `${d}: ${(H.cy - ext).toFixed(0)}..${(H.cy + ext).toFixed(0)}`);
  }
});

test('T2/R2-2, the swing is drawn light on the dark and does not knot: one AMBER→PAPER swoosh on a K keyline behind him and PAPER speed lines outside his body on every swinging frame; no multiples, no RED ︵', () => {
  for (let F = B.SWING.from + 1; F < C.THROW; F++) {
    const draws = drawsAt(F);
    const polys = draws.flatMap((d) => d.polys ?? []);
    // The swoosh: its K keyline, then 18 bands from PAPER at the tail to AMBER at the head.
    const sw = B.swooshPolys(F, advance);
    assert.equal(sw.length, 19, `${F}: the swoosh`);
    assert.ok(same(sw[0].color, K) && same(sw[18].color, B.tintRGB(PAPER, AMBER, (17.5 / 18) ** 0.8)), `${F}: K keyline, amber head`);
    assert.ok(polys.some((p) => p.tri === sw[18].tri || (same(p.color, sw[18].color) && p.tri.length === sw[18].tri.length)), `${F}: drawn`);
    // Drawn behind him: every one of his glyphs comes after the swoosh in the draw list.
    const iSwoosh = draws.findIndex((d) => (d.polys ?? []).some((p) => same(p.color, sw[18].color)));
    const iHero = draws.findIndex((d) => Object.values(d.content.glyphs).flat().some((g) => g.ch === 'Σ' && same(g.color, AMBER)));
    assert.ok(iSwoosh >= 0 && iHero > iSwoosh, `${F}: the swoosh behind him (${iSwoosh} < ${iHero})`);
    // PAPER speed lines (K lines vanish on the dark panel), never a copy of him.
    assert.ok(B.speedLinePolys(F, advance).length / 6 >= 12, `${F}: speed lines`);
    assert.equal(glyphsOf(draws).filter(({ g }) => g.outlineColor && same(g.outlineColor, AMBER) && same(g.color, K)).length, 0, `${F}: no hollow multiples`);
    assert.equal(glyphsOf(draws).filter(({ g }) => g.ch === 'Σ' && same(g.color, AMBER)).length, 1, `${F}: him, once`);
  }
  // No RED ︵ round the top (the arm is the red arc): no red band of the old trail's 80 triangles, on any frame of the throw.
  for (let F = C.GRAB; F < C.THROW + 8; F++) assert.equal(drawsAt(F).flatMap((d) => d.polys ?? []).filter((p) => same(p.color, RED) && p.tri.length / 6 === 80).length, 0, `${F}`);
});

test('T3/R3, the stamp is whole on its drum and after it: every sub-frame of THROW … club 5.4 draws it in one place; the throw’s page launches from rest', () => {
  const stamp = (f: number) => glyphsOf(drawsAt(f)).filter(({ atlas, g }) => atlas === 'mono' && g.size > 20 && g.ch === 'Q').map(({ g }) => `${g.x.toFixed(2)},${g.y.toFixed(2)},${g.size.toFixed(2)}`).join('|');
  for (let F = C.THROW; F < C.PAGE; F += 3) {
    const at = new Set(samplesOf(F).map(stamp));
    assert.equal(at.size, 1, `${F}: the stamp in ${at.size} places across the shutter`);
    assert.ok(stamp(F) !== '', `${F}: the stamp is drawn`);
  }
  // The punch-out on the drum is the pull-back's biggest step; the rest starts from rest.
  const step = (d: number) => Math.log(B.pageCam(d - 1).zoom / B.pageCam(d).zoom);
  for (let d = C.THROW + 1; d < C.PAGE - 2; d++) assert.ok(step(d) < step(C.THROW), `${d}: ${step(d).toFixed(3)} vs the drum's ${step(C.THROW).toFixed(3)}`);
  assert.ok(step(C.THROW + 1) < 0.5 * step(C.THROW), 'from rest after the kick');
});

test('T4/R4, the party monitor reads over the page: a solid K plate exactly under its box from the throw, fading out by the clear', () => {
  const plate = (F: number) => drawsAt(F).flatMap((d) => d.content.under).find((s) => s.kind === 'rect' && same(s.color, K) && (s.w ?? 0) > 400 && (s.h ?? 0) > 100);
  for (const F of [C.THROW, C.PAGE, C.club(6, 1), C.CLEAR - B.PLATE_FADE]) {
    const p = plate(F);
    assert.ok(p && (p.alpha ?? 1) === 1, `${F}: the plate`);
    assert.ok(p.x - p.w! / 2 < -900 && p.y - p.h! / 2 < -490, `${F}: bottom-left, where the box is`);
  }
  assert.ok((plate(C.CLEAR - 3)?.alpha ?? 0) < 1 && !plate(C.CLEAR) && !plate(C.HIT - 1), 'gone by the clear: the box is v04’s again into the glass');
});

test('T8/R8, the spin reads: two rotation marks outside his face (beyond its half-length), strokes ≥ 10 px; the border snaps where his body crosses panel 9’s border on club 5.3&', () => {
  for (const F of [C.THROW + 4, C.BORDER_SNAP, C.PAGE]) {
    const H = B.heroInFlight(F, faceAdv);
    const half = (B.widthOf(H.face, faceAdv) / 2) * H.em;
    const arcs = B.spinArcs(F, H, faceAdv);
    assert.equal(arcs.length, 2, `${F}: two arcs`);
    for (const m of arcs) {
      assert.ok(m.w >= 10, `${F}: stroke ${m.w.toFixed(1)} px`);
      for (const q of [...m.pts, ...m.head]) assert.ok(Math.hypot(q[0] - H.cx, q[1] - H.cy) > half, `${F}: an arc inside his face`);
    }
  }
  const snap = B.snapAt();
  const H = B.heroInFlight(C.BORDER_SNAP, faceAdv);
  assert.ok(snap.s < (B.widthOf(H.face, faceAdv) / 2) * H.em, `the snap ${snap.s.toFixed(0)} px along his axis, inside his length`);
  const onBorder = Math.abs(Math.abs(snap.g[1] - B.PANEL9.y) - 540) < 1e-6 || Math.abs(Math.abs(snap.g[0] - B.PANEL9.x) - 960) < 1e-6;
  assert.ok(onBorder, 'on panel 9’s border');
});

test('R5, the roll does not strobe the frame’s edges: from club 6.2 no shove and no smear on the drums, the jitter ≤ 8 px; the secondary lines keep their inner ends and change on the 16ths', () => {
  for (let F = C.club(6, 1); F < C.HIT; F++) {
    const H = B.heroInFlight(F, faceAdv);
    const P = B.flightAt(F);
    assert.ok(H.sx === 1 && H.sy === 1, `${F}: no smear`);
    assert.ok(Math.hypot(H.P.x - P.x, H.P.y - P.y) <= 8 / Math.SQRT2 + 1e-9, `${F}: jitter ${Math.hypot(H.P.x - P.x, H.P.y - P.y).toFixed(1)} px`);
    assert.ok(H.em <= P.em * 1.02 + 1e-9, `${F}: a pump of ≤ 2 %`);
  }
  const lines = (F: number) => drawsAt(F).flatMap((d) => d.polys ?? []).find((p) => same(p.color, PAPER) && p.tri.length === 30 * 24 && p.alpha === undefined);
  const a = lines(C.club(6, 2));
  const b = lines(C.club(6, 2) + 3);
  const c = lines(C.club(6, 2) + 6);
  assert.ok(a && b && c);
  assert.deepEqual(a.tri, b.tri, 'unchanged within a 16th');
  assert.notDeepEqual(a.tri, c.tri, 're-inked on the next 16th');
});

// ——— Round 2 fixes (review of club-wip-v04: R2-2, R2-6, R2-7, B1, B2) ————————————————————————————————————————————————————————————

test('R2-2, the arc is bigger than him: the loop is ≥ 1.2 × his face wide at the release and ≥ 1.6 × at its bottom (he is hauled back to em 140), and the whole swing stays in frame', () => {
  const width = (em: number) => B.widthOf(HERO_INK.flight[0], faceAdv) * em;
  assert.ok(2 * B.LOOP.rx >= 1.2 * width(B.HELD_EM), `loop ${2 * B.LOOP.rx} vs his ${width(B.HELD_EM).toFixed(0)} px`);
  assert.ok(2 * B.LOOP.rx >= 1.6 * width(B.throwPose(B.SWING.from, faceAdv).em), 'at the bottom');
  assert.equal(B.throwPose(B.SWING.from, faceAdv).em, B.EM_LOW);
  assert.ok(B.throwPose(C.THROW - 1e-6, faceAdv).em > 199, 'out at us by the release');
  // His ω's path through the swing spans ≥ 400 × 500 px (round 1: 350 × 440).
  const path = range(B.SWING.from, C.THROW + 1).map((d) => (d < C.THROW ? B.throwPose(d, faceAdv) : { x: B.WOUND[0], y: B.WOUND[1] }));
  const xs = path.map((p) => p.x);
  const ys = path.map((p) => p.y);
  assert.ok(Math.max(...xs) - Math.min(...xs) >= 400 && Math.max(...ys) - Math.min(...ys) >= 500, `${(Math.max(...xs) - Math.min(...xs)).toFixed(0)} × ${(Math.max(...ys) - Math.min(...ys)).toFixed(0)}`);
  // In frame on every frame of the haul and the swing: his turned face (fill, keyline, rim) inside the frame's edges.
  for (let d = C.GRAB; d < C.THROW; d++) {
    const T = B.throwPose(d, faceAdv);
    const half = (width(T.em) / 2) * T.sx + 24;
    const thick = 0.55 * T.em * T.sy + 24;
    const ex = Math.abs(Math.cos(T.rot)) * half + Math.abs(Math.sin(T.rot)) * thick;
    const ey = Math.abs(Math.sin(T.rot)) * half + Math.abs(Math.cos(T.rot)) * thick;
    const [cx, cy] = B.omegaAnchor(HERO_INK.flight[0], T.x, T.y, T.em, T.rot, T.sx, T.sy, faceAdv);
    assert.ok(cx - ex >= -960 && cx + ex <= 960 && cy - ey >= -540 && cy + ey <= 540, `${d}: x ${(cx - ex).toFixed(0)}..${(cx + ex).toFixed(0)} y ${(cy - ey).toFixed(0)}..${(cy + ey).toFixed(0)}`);
  }
});

test('R2-2, the speed lines stay outside his body: no point of them inside his face’s box (+ 20 px), on any swinging frame; at most three', () => {
  assert.equal(B.SPEED_LINES.length, 3);
  for (let F = B.SWING.from + 1; F < C.THROW; F++) {
    const T = B.throwPose(F, advance);
    const face = HERO_INK.flight[0];
    const [hx, hy] = B.omegaAnchor(face, T.x, T.y, T.em, T.rot, T.sx, T.sy, advance);
    const a = (B.widthOf(face, advance) / 2) * T.em * T.sx + 20;
    const b = 0.55 * T.em * T.sy + 20;
    const tri = B.speedLinePolys(F, advance);
    for (let i = 0; i < tri.length; i += 2) {
      const dx = tri[i] - hx;
      const dy = tri[i + 1] - hy;
      const qx = dx * Math.cos(-T.rot) - dy * Math.sin(-T.rot);
      const qy = dx * Math.sin(-T.rot) + dy * Math.cos(-T.rot);
      assert.ok((qx / a) ** 2 + (qy / b) ** 2 >= 1 - 1e-6, `${F}: a speed line across his body`);
    }
  }
});

test('R2-2, the hand flies open on the release: open (spread) on THROW … +2, curling on +3, a fist again from +4; drawn in his red', () => {
  for (let k = 0; k < B.HAND_OPEN; k++) assert.equal(B.throwPose(C.THROW + k, advance).open, 1, `+${k}`);
  assert.ok(B.throwPose(C.THROW + B.HAND_OPEN, advance).open > 0 && B.throwPose(C.THROW + B.HAND_OPEN, advance).open < 1);
  assert.equal(B.throwPose(C.THROW + B.HAND_OPEN + 1, advance).open, 0);
  assert.equal(B.throwPose(C.THROW - 1, advance).open, 0, 'a fist while he is held');
  // The open hand has seven red parts (palm, heel, four fingers, the thumb, 28-gons); the fist's are 32-gons.
  const redParts = (F: number) => drawsAt(F).flatMap((d) => d.polys ?? []).filter((p) => same(p.color, RED) && p.tri.length / 6 === 28).length;
  assert.equal(redParts(C.THROW), 7, 'open on the drum');
  assert.equal(redParts(C.THROW + B.HAND_OPEN + 1), 0, 'a fist again');
});

test('B2, the release carries: his ω leaves toward the centre at the swing’s speed and slows smoothly (each step 60–95 % of the last) for 10 frames, never parks before club 5.4, and swoops onto the centre by club 5.4', () => {
  const at = (d: number): [number, number] => (d < C.THROW ? [B.throwPose(d, advance).x, B.throwPose(d, advance).y] : [B.flightAt(d).x, B.flightAt(d).y]);
  const step = (d: number) => Math.hypot(at(d)[0] - at(d - 1)[0], at(d)[1] - at(d - 1)[1]);
  for (let d = C.THROW + 1; d <= C.THROW + 10; d++) {
    const r = step(d) / step(d - 1);
    assert.ok(r >= 0.6 && r <= 0.95, `+${d - C.THROW}: ${step(d - 1).toFixed(0)} → ${step(d).toFixed(0)} px/f`);
  }
  // Round 1 parked him: 2–3 px/f of the law's own motion for a beat (≈ 40 px over club 5.3& → 5.4). Now ≥ 5 px/f to club 5.4, ≥ 80 px over that.
  for (let d = C.THROW + 1; d <= C.PAGE; d++) assert.ok(step(d) >= 5, `+${d - C.THROW}: parked (${step(d).toFixed(1)} px/f)`);
  let late = 0;
  for (let d = C.BORDER_SNAP + 1; d <= C.PAGE; d++) late += step(d);
  assert.ok(late >= 80, `${late.toFixed(0)} px over club 5.3& → 5.4`);
  // Toward the centre: the first step points within 50° of the glass's ω (aimed just right of it, the carry bending him down into it; round 1
  // left at 62° and turned away, 90–120° off it, for a beat).
  const go = [at(C.THROW + 1)[0] - at(C.THROW)[0], at(C.THROW + 1)[1] - at(C.THROW)[1]];
  const to = [B.OMEGA_AT_HIT[0] - B.WOUND[0], B.OMEGA_AT_HIT[1] - B.WOUND[1]];
  const cos = (go[0] * to[0] + go[1] * to[1]) / (Math.hypot(go[0], go[1]) * Math.hypot(to[0], to[1]));
  assert.ok(cos >= Math.cos((50 * Math.PI) / 180), `${((Math.acos(cos) * 180) / Math.PI).toFixed(0)}° off the centre`);
  // Let go up-left of the centre; near it by club 5.4 (within 80 px: round 1 parked 230 px right of it), never more than 200 px right of it.
  assert.ok(B.WOUND[0] < -150 && B.WOUND[1] > 100);
  const P = B.flightAt(C.PAGE);
  assert.ok(Math.hypot(P.x - B.OMEGA_AT_HIT[0], P.y - B.OMEGA_AT_HIT[1]) < 80, `${P.x.toFixed(0)}, ${P.y.toFixed(0)}`);
  for (let d = C.THROW; d <= C.PAGE; d++) assert.ok(at(d)[0] < 200, `+${d - C.THROW}: x ${at(d)[0].toFixed(0)}`);
  // "At us": em grows ≥ 5 px/f off the release, ≥ 250 by club 5.3&.
  assert.ok(B.flightAt(C.THROW + 1).em - B.flightAt(C.THROW).em >= 5 && B.flightAt(C.BORDER_SNAP).em >= 250);
  // No jolt and no jitter while the carry is strong (its first 6 frames): the drawn ω is the law's.
  for (let d = C.THROW; d < C.THROW + 6; d++) {
    const H = B.heroInFlight(d, advance);
    const P2 = B.flightAt(d);
    assert.ok(Math.hypot(H.P.x - P2.x, H.P.y - P2.y) < 1e-9 && H.sx === 1 && H.sy === 1, `+${d - C.THROW}`);
  }
});

test('R2-7/B1, the LOCK is on its drum: the reticle lands on him on the LOCK (I over the 32nd before), the brackets, the hatching (0.5) and the inset (its first frame, 1.18×) are whole on every sub-frame of it, and the inset does not cover him', () => {
  const lensDraws = (f: number) => B.B_PARTS.lens.frame(f, L) as B.InkDrawB[];
  const subs = samplesOf(C.LOCK);
  assert.ok(subs.some((s) => s < C.LOCK), 'the drum frame has sub-frames before the drum instant');
  const sig = (f: number) => {
    const draws = lensDraws(f);
    const insetDraws = draws.filter((d) => d.content.under.some((s) => s.kind === 'rect' && same(s.color, NIGHT)));
    const face = glyphsOf(draws).filter(({ g }) => same(g.color, AMBER) && g.size > 150).map(({ g }) => `${g.ch}${g.x.toFixed(3)},${g.y.toFixed(3)},${g.size.toFixed(3)}`);
    const hatch = draws.flatMap((d) => d.polys ?? []).filter((p) => same(p.color, RED) && p.lines).map((p) => p.tint);
    const r = B.reticleAt(f);
    return JSON.stringify({ inset: insetDraws.length, poses: insetDraws.map((d) => d.pose.position.map((v) => v.toFixed(3))), face, hatch, r });
  };
  assert.equal(new Set(subs.map(sig)).size, 1, 'whole on the LOCK’s frame');
  const at = JSON.parse(sig(C.LOCK));
  assert.equal(at.inset, 1, 'the inset on the LOCK');
  assert.deepEqual(at.hatch, [0.5], 'the hatching floods whole on the drum');
  assert.ok(Math.hypot(at.r.x - B.HERO_IN_LENS[0], at.r.y - B.HERO_IN_LENS[1]) < 1e-9 && at.r.r < 90, 'the reticle on him, closing');
  assert.ok(at.face.length > 0, 'his face in the inset');
  assert.equal(B.insetScale(C.LOCK), 1.18);
  assert.ok(Math.abs(B.insetScale(C.LOCK + 3) - 1) < 0.01);
  // Not before: no inset box on the frame before (only its four corner ticks fly in), the reticle still on its way.
  for (const s of samplesOf(C.LOCK - 1)) {
    assert.equal(lensDraws(s).flatMap((d) => d.content.under).filter((x) => x.kind === 'rect' && same(x.color, NIGHT)).length, 0, `${s}`);
    assert.ok(Math.hypot(B.reticleAt(s).x - B.HERO_IN_LENS[0], B.reticleAt(s).y - B.HERO_IN_LENS[1]) > 50, 'still running');
  }
  // The inset's box (569 × 409 at INSET_AT, at its biggest on the LOCK) clears the reticle's brackets round him (and so him).
  const [ix, iy] = B.INSET_AT;
  for (const d of [C.LOCK, C.LOCK + 1, C.LOCK + 6]) {
    const hb = (409 / 2) * B.insetScale(d) + 5;
    const ret = B.reticleAt(d);
    const rb = ret.r * 1.3 * B.lockBrackets(d) + 10;
    assert.ok(ret.y + rb < iy - hb || ret.y - rb > iy + hb, `${d}: brackets ${(ret.y - rb).toFixed(0)}..${(ret.y + rb).toFixed(0)} vs the box ${(iy - hb).toFixed(0)}..${(iy + hb).toFixed(0)}`);
  }
  assert.ok(Math.abs(B.HERO_IN_LENS[0] - ix) < 300, 'beside his place: a magnification');
  // The hatching settles to 0.35 by LOCK + 4.
  assert.equal(B.hatchTint(C.LOCK + 4), 0.35);
});
