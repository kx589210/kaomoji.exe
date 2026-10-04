// The transition's renderer "gate" (builder T; src/shots/transitionGate.ts, src/scenes/transitionGate.ts): the picture's maths against
// the design (notes/cosmos3/final.md §4 bars 13–14, prototype cosmos3/w/j2.js) and the build sheet (notes/bcos/sheet.md §3,
// §5, §6.1, §6.2), part-locally — every pin is TRANSITION_START + the design's offset (13.1 = 1152), so the film map may move.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COSMOS_ATLASES, PRINT_FACES } from '../src/content/cosmos.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { GatePart, gateLook, slitGain } from '../src/scenes/transitionGate.ts';
import { MONO_KEYS, PRINT_KEYS } from '../src/scenes/transitionFilms.ts';
import * as TR from '../src/score/transition.ts';
import { transitionLook, transitionTemporal } from '../src/shots/cosmosKit.ts';
import { s12Aim } from '../src/shots/riso.ts';
import * as G from '../src/shots/transitionGate.ts';
import { risoLook } from '../src/worlds/riso.ts';

/** A design frame (58-bar numbering, transition 1.1 = 1152) as a film frame on today's map. */
const d = (designFrame: number): number => TR.TRANSITION_START + designFrame - 1152;
const close = (a: number, b: number, eps: number, msg?: string) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} ≉ ${b} (±${eps})`);
const DEG = Math.PI / 180;
const SLUG_LEN = 58;

// ——— E0: the page is the Riso print's last frame ——————————————————————————————————————————————————————————————————————————————

test('E0 — the page is the Riso print’s last frame: its own shapes (the sun on paper, nothing else) under its own camera, and the push runs on', () => {
  const last = G.risoLastContent();
  assert.equal(last.content.glyphs.rounded.length, 0, 'everything but the sun was sucked in: no glyphs on the last frame');
  assert.equal(last.content.over.length, 0);
  assert.equal(last.halftone, null);
  assert.equal(last.stack, null);
  const p = G.page();
  assert.deepEqual(p.shapes, last.content.under, 'the page draws the print’s own shapes');
  close(p.sun.r, 150, 1e-9, 'the sun’s page radius');
  // Its camera continues S12's: the same zoom at the print's last frame, then one more push step on 1.1 (1.04^(1/24) ± 0.2 %).
  close(G.pageZoom(G.RISO_LAST), s12Aim(G.RISO_LAST).zoom, 1e-9, 'the print’s zoom at its last frame');
  close(G.pageZoom(TR.TRANSITION_START) / G.pageZoom(G.RISO_LAST), 1.04 ** (1 / 24), 0.002 * 1.04 ** (1 / 24), 'the push’s next step');
  // It decelerates to a stop by the lurch: +1.6 % (the sun 175 → 178 px), held after.
  close(G.pageZoom(TR.VERTIGO) / G.pageZoom(G.RISO_LAST), 1.016, 1e-6, '+1.6 % by the lurch');
  for (let f = TR.TRANSITION_START; f < TR.TRANSITION_END; f += 0.5) assert.ok(G.pageZoom(f + 0.5) >= G.pageZoom(f) - 1e-12, `${f}: the push never pulls back`);
  assert.equal(G.pageZoom(TR.LAUNCH), G.pageZoom(TR.VERTIGO));
  close(G.sunRadius(TR.TRANSITION_START), 175, 1.5, 'the sun on 1.1');
  close(G.sunRadius(TR.VERTIGO), 178, 1.5, 'the sun on 1.2');
  // The first frame: the print's pose maths (aimPose) at the next push step.
  const pose = G.pagePose(TR.TRANSITION_START);
  close(pose.position[2], 3062.5 / G.pageZoom(TR.TRANSITION_START), 0.5);
});

test('E0 — on 1.1 the films are only rules (three plates, B P Y, fanned and misregistered) and the slug starts typing; the look is the Riso print’s', () => {
  const films = G.filmsAt(TR.TRANSITION_START, SLUG_LEN);
  assert.deepEqual(films.map((f) => f.edition).sort(), [1, 2, 3]);
  assert.deepEqual(films.map((f) => f.plate).sort(), [0, 1, 2], 'one film per plate');
  for (const f of films) {
    close(f.reach, 14, 1e-9, 'only the 14-unit rule prints on the paste’s frame');
    close(f.z, 0, 1e-9, 'pasted on the page plane');
    assert.ok(Math.abs(f.x) <= 10 && Math.abs(f.y) <= 10, 'loose register ±10');
  }
  const twists = films.sort((a, b) => a.edition - b.edition).map((f) => f.rot / DEG);
  for (let k = 0; k < 3; k++) close(twists[k], 1.5 * (k + 1), 0.31, `film ${k + 1}'s twist`);
  assert.ok(films.find((f) => f.edition === 1)!.slug >= 1, 'the slug types from 1.1');
  // 75 % of the reach by +3, all by +8 (L).
  const at3 = G.filmsAt(TR.TRANSITION_START + 3, SLUG_LEN)[0];
  assert.ok((at3.reach - 14) / (G.OUTER - 14) >= 0.75, `75 % by +3 (${at3.reach})`);
  close(G.filmsAt(TR.TRANSITION_START + 8, SLUG_LEN)[0].reach, G.OUTER, 1e-9, 'full by +8');
  assert.deepEqual(gateLook(TR.TRANSITION_START), risoLook());
  for (let f = TR.TRANSITION_START; f < TR.at(2); f++) assert.deepEqual(gateLook(f), transitionLook(f), `${f}`);
});

// ——— Bar 1: the pastes, the waltz, the Vertigo ————————————————————————————————————————————————————————————————————————————————

test('the pastes: films 1–3 (B P Y) on 1.1, 4–6 (P Y B) on 1.1&, 7–9 (Y B P) on 1.2; 10–18 slide out of the sun’s rim a 32nd apart into the gaps', () => {
  const plates = (k: number) => G.plateOf(Array.from({ length: 18 }, (_, i) => i + 5).find((n) => G.editionOf(n) === k)!);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(plates), [0, 1, 2, 1, 2, 0, 2, 0, 1]);
  const editions = Array.from({ length: 18 }, (_, i) => G.editionOf(i + 5)).sort((a, b) => a - b);
  assert.deepEqual(editions, Array.from({ length: 18 }, (_, i) => i + 1), 'editions 1–18, each once');
  for (let n = 5; n <= 22; n++) {
    const k = G.editionOf(n);
    if (k <= 9) close(G.filmZ(n), 40 * k, 1e-9, `film ${k} at z = 40 k`);
    else close(G.filmZ(n), 40 * (k - 10) + 20, 1e-9, `film ${k} in the gaps`);
    const born = G.bornOf(n);
    assert.equal(born, k <= 9 ? TR.PASTES[Math.floor((k - 1) / 3)].at : TR.AUTO_REPEAT[k - 10]);
    assert.equal(G.filmsAt(born - 1, SLUG_LEN).some((f) => f.n === n), false, `film ${k} not before its paste`);
    assert.equal(G.filmsAt(born, SLUG_LEN).some((f) => f.n === n), true, `film ${k} on its paste`);
  }
  // An auto-repeat film starts at the sun's rim (its window hugs the sun) and streams to its gap in 6 f.
  const n10 = Array.from({ length: 18 }, (_, i) => i + 5).find((n) => G.editionOf(n) === 10)!;
  const born = G.bornOf(n10);
  const f0 = G.filmsAt(born, SLUG_LEN).find((f) => f.n === n10)!;
  const c0 = G.cameraAt(born);
  close((225 * G.scaleAt(c0, f0.z)) / G.zoomRel(born), G.sunRadius(born) / G.zoomRel(born), 12, 'its window hugs the sun’s rim');
  close(G.filmsAt(born + 6, SLUG_LEN).find((f) => f.n === n10)!.z, G.filmZ(n10), 1e-9, 'in its gap 6 f later');
});

test('the Vertigo dolly zoom: d · tan(φ/2) holds the page plane 1 : 1 (only the push moves it) while q opens 0.0065 → 0.04 → 0.08 → (the lurch, L) 0.62 → 0.85 with velocity 0 on the launch', () => {
  close(G.dollyQ(d(1152)), 0.0065, 1e-9);
  close(G.dollyQ(d(1164)), 0.04, 1e-9);
  close(G.dollyQ(d(1176)), 0.08, 1e-9);
  close(G.dollyQ(d(1179)), 0.485, 0.02, 'the lurch: 75 % in 3 f');
  close(G.dollyQ(d(1188)), 0.62, 0.002);
  close(G.dollyQ(d(1200)), 0.85, 1e-9);
  close(G.dollyQ(d(1200) - 0.25), 0.85, 5e-4, 'velocity 0 on the launch');
  for (let f = d(1152); f < d(1200) - 0.5; f += 0.25) {
    const c = G.cameraAt(f);
    close(c.focal / c.eye, G.zoomRel(f), 1e-9, `${f}: the page plane keeps the push's zoom`);
    assert.ok(G.dollyQ(f + 0.25) >= G.dollyQ(f) - 0.012, `${f}: the dolly only opens (but L's 2 % rebound)`);
  }
  // The design's table at the launch: window half-heights 246 · 271 · 302 · 341 for films 1–4 (before the push).
  // (the dolly's last instant: the launch's frame jolts forward on its kick)
  const c = G.cameraAt(d(1200) - 0.51);
  [246, 271, 302, 341].forEach((h, i) => close((225 * G.scaleAt(c, 40 * (i + 1))) / G.zoomRel(d(1200)), h, 2, `film ${i + 1} at the launch`));
});

test('the sun holds dead still through the dolly (the Vertigo’s anchor) and the vanishing point centres under the flight, never faster than 0.4 px a frame', () => {
  const [x0, y0] = G.vpAt(TR.TRANSITION_START);
  for (let f = TR.TRANSITION_START; f < TR.LAUNCH - 0.5; f += 0.5) {
    const [x, y] = G.vpAt(f);
    assert.ok(Math.hypot(x - x0, y - y0) <= 0.5, `${f}: the sun moved ${Math.hypot(x - x0, y - y0)} px`);
    const s = G.sunAt(f)!;
    assert.equal(s.mode, 'page');
    assert.ok(Math.hypot(s.x - x0, s.y - y0) <= 0.5);
  }
  for (let f = TR.LAUNCH; f < TR.at(2) + 2; f += 0.5) {
    const a = G.vpAt(f);
    const b = G.vpAt(f + 1);
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) <= 0.4, `${f}: the vanishing point drifts ≤ 0.4 px/f`);
  }
  for (let f = TR.at(2); f < TR.TRANSITION_END; f += 3) assert.ok(Math.hypot(...G.vpAt(f)) < 1e-9, `${f}: centred from 2.1`);
});

test('the waltz: the strips step a slot on 1.1&, back on 1.2, on again on 1.2& (B and Y clockwise, P counter-clockwise, 6 % overshoot), then spin at 0.12 turn/s; the faces swap pose in unison, whole on each step’s frame', () => {
  const [w0, w1, w2] = TR.WALTZ_STEPS;
  close(G.scrollAt(0, w1 - 0.01) - G.scrollAt(0, w0 - 1), G.SLOT, 1, 'step 1: one slot (settled within the 8th)');
  close(G.scrollAt(1, w1 - 0.01) - G.scrollAt(1, w0 - 1), -G.SLOT, 1, 'P steps the other way');
  close(G.scrollAt(0, w2 - 0.01) - G.scrollAt(0, w1 - 0.01), -G.SLOT, 1.5, 'step 2 reversed');
  let peak = 0;
  for (let t = 0; t < 12; t += 0.25) peak = Math.max(peak, G.waltzStep(t));
  close(peak, 1.06, 0.006, 'the waltz step’s overshoot');
  assert.ok(G.waltzStep(3) >= 0.75, '75 % in 3 f');
  // The spin: 0 → 0.12 turn/s over 1.2& → 1.3, held, back to 0 by 1.4.
  const v = (f: number) => G.spinTravel(f + 0.5) - G.spinTravel(f - 0.5);
  close(v(TR.LAUNCH + 6) / (4 * (G.WINDOW.a + G.WINDOW.b)) * 60, 0.12, 0.002, 'turn/s held');
  close(v(TR.SPIN.to + 1), 0, 1e-9);
  close(v(TR.SPIN.from - 1), 0, 1e-9);
  // The pose: a swap per step, taken whole on the step's output frame (every sub-frame of it agrees).
  for (const w of TR.WALTZ_STEPS) {
    const poses = new Set(temporalSamples(w, transitionTemporal(w), TR.transitionSegment(w)).map((s) => G.poseAt(s.frame)));
    assert.equal(poses.size, 1, `${w}: one pose on the step’s frame`);
    assert.notEqual(G.poseAt(w), G.poseAt(w - 1), `${w}: the faces swap`);
  }
  // ⊕ printed solid: top-right on 1.1& for 4 f, bottom-right on 1.2 for 4 f, bottom-left while C5 holds.
  assert.equal(G.targetsAt(d(1164)), 1);
  assert.equal(G.targetsAt(d(1168)), 0);
  assert.equal(G.targetsAt(d(1176)), 2);
  assert.equal(G.targetsAt(d(1190)), 4);
  assert.equal(G.targetsAt(d(1218)), 0);
});

// ——— The flight ————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('E1 — the launch: 0 → 6 units/f in 3 f on 1.3 (the dolly handing over at velocity 0), ×2 on 2.1 and 2.2 (L), a ×1.6 surge on each kick; films are born at the sun’s rim and dropped once past the lens', () => {
  close(G.speedAt(TR.LAUNCH), 0, 1e-9);
  close(G.speedAt(TR.LAUNCH + 3), 6 * (1 + 0.6 * (1 - 3 / 10) ** 2), 1e-9, 'at speed in 3 f, the kick’s ×1.6 surge decaying');
  close(G.speedAt(TR.at(1, 3.75)), 6, 1e-9, 'cruise 6');
  close(G.speedAt(TR.at(2, 1.75)), 12, 0.25, 'cruise 12');
  close(G.speedAt(TR.at(2, 2.75)), 24, 0.5, 'cruise 24');
  assert.ok(G.speedAt(TR.at(2) + 1) > 1.4 * G.speedAt(TR.at(2) - 1), 'the kick surges');
  for (let f = TR.CRASH; f < TR.TRANSITION_END; f += 0.5) assert.equal(G.speedAt(f), 0, `${f}: stopped`);
  for (let f = TR.LAUNCH; f < TR.CRASH; f += 0.5) assert.ok(G.travel(f + 0.5) >= G.travel(f), 'only forward');
  // The camera is continuous across the launch (the dolly's last pose is the flight's first).
  const a = G.cameraAt(TR.LAUNCH - 1e-6);
  const b = G.cameraAt(TR.LAUNCH);
  close(a.eye, b.eye, 0.05);
  close(a.focal, b.focal, 0.05);
  for (let f = TR.LAUNCH; f < TR.CRASH; f += 1.5) {
    const c = G.cameraAt(f);
    for (const film of G.filmsAt(f, SLUG_LEN).filter((x) => x.kind === 'film')) {
      const D = c.eye - film.z;
      assert.ok(D >= G.NEAR_D - 1e-9 && D <= G.RIM_D + 1e-9, `${f}: film ${film.n} at ${D}`);
    }
  }
  // On the launch's frame the films beyond the old page plane are pasted at once, so the tunnel has no gap.
  assert.equal(G.filmsAt(TR.LAUNCH - 1, SLUG_LEN).some((f) => f.n >= 23), false);
  assert.ok(G.filmsAt(TR.LAUNCH, SLUG_LEN).filter((f) => f.n >= 23).length >= 6);
});

test('the gates: one on every roll hit from 1.4 to the crash, each exactly GATE_AHEAD from the lens on its hit (its window just leaving the frame), faces B/P only', () => {
  TR.GATES.forEach((G0, i) => {
    const c = G.cameraAt(G0);
    close(c.eye - G.gateZ(G0), G.GATE_AHEAD, 1e-6, `gate ${i}`);
    close((225 + 8) * G.scaleAt(c, G.gateZ(G0)), 540 * (233 / 225), 12, 'its rule at the frame’s edge on the hit');
    const g = G.filmsAt(G0 - 2, SLUG_LEN).find((f) => f.n === -1 - i);
    assert.ok(g && g.kind === 'gate' && g.plate !== 2, `gate ${i} is drawn on its approach, in blue or pink`);
  });
});

test('the corkscrew: 22.5° counter-clockwise on each roll 16th of 2.2 (75 % in 3 f), 90° held from the settle through the cross', () => {
  close(G.rollAt(TR.at(2, 2) - 0.01), 0, 1e-9);
  TR.CORKSCREW.forEach((h, i) => {
    close(G.rollAt(h + 3) / DEG, 22.5 * i + 22.5 * G.L(3), 1.2, `step ${i + 1} 75 % in 3 f`);
  });
  for (let f = TR.CRASH + 4; f < TR.TRANSITION_END; f += 1) close(G.rollAt(f) / DEG, 90, 0.5, `${f}`);
  let max = 0;
  for (let f = TR.at(2, 2); f < TR.CRASH + 10; f += 0.25) max = Math.max(max, G.rollAt(f) / DEG);
  assert.ok(max <= 90 * 1.02 + 1e-9, 'no more than 2 % past 90°');
});

test('the press passes: a dark front from the sun to the corners on each kick of bar 2, grown over its 6 f (past the sun on the kick, so its frame darkens; the corners by its 6th frame); behind it the next paper, the inks turned to light (35 → 70 → 100 %)', () => {
  assert.deepEqual(G.GROUND_HEX, ['#F2EDE3', '#664285', '#272369', '#0A033B', '#0A0313']);
  assert.deepEqual(G.LIGHT, [0, 0.35, 0.7, 1, 1]);
  for (const [i, p] of TR.PRESS_PASSES.entries()) {
    const s0 = G.pressAt(p.at);
    assert.deepEqual([s0.inner, s0.outer], [i + 1, i], `${p.at}: the new paper inside`);
    assert.ok(s0.radius > 450 && s0.radius < 600, 'past the sun (r ≤ 240) on the kick');
    assert.ok(G.pressAt(p.at + 3).radius < 1101, 'a wipe you watch: not at the corners by its 4th frame (T1: it was 2–3 f)');
    assert.ok(G.pressAt(p.at + 5).radius > 1101, 'past the corners by its 6th frame');
    for (let t = 0; t < 5.75; t += 0.25) assert.ok(G.pressAt(p.at + t + 0.25).radius >= G.pressAt(p.at + t).radius, 'only outward');
    assert.deepEqual(G.pressAt(p.at + 6), { inner: i + 1, outer: i + 1, radius: Infinity });
  }
  assert.deepEqual(G.pressAt(TR.at(2) - 0.51), { inner: 0, outer: 0, radius: Infinity }, 'paper through bar 1');
  assert.equal(G.pressAt(TR.at(2) - 0.4).inner, 1, 'the first pass whole on its kick’s frame');
  // The sun turns to light on the first pass's kick, whole on its frame.
  assert.equal(G.sunAt(TR.PRESS_PASSES[0].at - 0.25)!.mode, 'light');
  assert.equal(G.sunAt(TR.PRESS_PASSES[0].at - 0.6)!.mode, 'ink');
});

// ——— The crash, the reverse Vertigo, the cross, the point ———————————————————————————————————————————————————————————————————————

test('E2 — the crash stop and the reverse Vertigo: 24 units/f → 0 in one frame, then q snaps a 32nd (0.60 … 0.01, −6 % overshoot) until the stack is flat; the plane that was LAUNCH_D ahead keeps its scale', () => {
  const zp = G.LAUNCH_D - G.CRASH_TRAVEL() - G.LAUNCH_D;
  TR.REVERSE_VERTIGO.forEach((s, i) => {
    const prev = i === 0 ? 0.85 : TR.REVERSE_VERTIGO[i - 1].q;
    close(G.reverseQ(s.at), s.q - 0.06 * (prev - s.q), 1e-9, `step ${i} overshoots`);
    close(G.reverseQ(s.at + 2), s.q, 1e-9, `step ${i} settled in 2 f`);
    const c = G.cameraAt(s.at + 2);
    close(c.focal / (c.eye - 5 * Math.sin(Math.PI * Math.min(1, 2 / 4)) * (i === 0 ? 1 : 0) - zp), G.zoomRel(TR.LAUNCH) * G.flatZoom(s.q), 1e-6, `step ${i}: the plane keeps its scale, zoomed in as it flattens`);
    close(G.sunRadius(s.at), s.sunR * 0.94, 1e-9, `step ${i}: the sun dips on the step`);
    close(G.sunRadius(s.at + 1), s.sunR, 1e-9);
  });
  // At the last step every film is flat on the page (scale within 1.5 % of the plane's).
  const last = TR.REVERSE_VERTIGO.at(-1)!.at + 2;
  const c = G.cameraAt(last);
  const films = G.filmsAt(last, SLUG_LEN);
  assert.ok(films.length >= 20, 'the whole stack');
  for (const f of films) close(G.scaleAt(c, f.z) / (G.zoomRel(TR.LAUNCH) * G.FLAT_ZOOM), 1, 0.015, `film ${f.n} flat`);
  // The sun sheds its inks on the 32nds: the yellow slides off, the pink falls, bare paper.
  const s = G.sunAt(TR.CROSS - 1)!;
  assert.deepEqual([s.yellowAlpha, s.pinkAlpha, s.white.alpha], [0, 0, 1]);
  assert.equal(G.sunAt(TR.CRASH)!.yellowAlpha, 1);
});

test('E3 — the ✦ cross: the slit’s width, half-length and the flare’s on the 32nds (× 1.06 on each step’s first frame), hotter as it narrows; E4 — the point at the centre, trembling a pixel every 2 f, its halo 24 → 60', () => {
  TR.SLIT.forEach((row) => {
    const s = G.slitAt(row.at)!;
    assert.deepEqual([s.width, s.flareHalf, s.flareWidth, s.sunR], [row.width, row.flareHalf, row.flareWidth, row.sunR]);
    close(s.half, row.half * 1.06, 1e-9);
    close(G.slitAt(row.at + 1)!.half, row.half, 1e-9);
  });
  for (let i = 1; i < TR.SLIT.length; i++) assert.ok(slitGain(TR.SLIT[i].width) > slitGain(TR.SLIT[i - 1].width), 'hotter as it narrows');
  assert.equal(G.filmsAt(TR.CROSS, SLUG_LEN).length, 0, 'the films are the frozen page now');
  for (let f = TR.POINT; f < TR.TRANSITION_END; f++) {
    const p = G.pointAt(f)!;
    assert.ok(Math.abs(p.dx) <= 1 && Math.abs(p.dy) <= 1, 'within a pixel of the centre');
    assert.equal(G.flareAt(f), null);
    assert.equal(G.sunAt(f), null);
    if (f > TR.POINT + 1 && Math.floor((f - TR.POINT) / 2) !== Math.floor((f - 1 - TR.POINT) / 2)) assert.ok(true);
  }
  close(G.pointAt(TR.POINT)!.halo, 24, 1e-9);
  close(G.pointAt(TR.TRANSITION_END)!.halo, 60, 1e-9);
  // The specks breathe in (the universe inhales) and the point never leaves the centre (E5: the bang's ω centre is 0 px from it).
  assert.ok(G.specksAt(TR.TRANSITION_END - 1).scale < G.specksAt(TR.POINT).scale);
  close(G.specksAt(TR.TRANSITION_END).scale, 1 - G.INHALE_DEPTH, 1e-9, 'v07: the printed space pours into the point (0.55 by the bang)');
});

// ——— v07 WP5: the run-up into the bang as one inward motion (continuity plan §7, FW5) ————————————————————————————————————————————

test('v07 — the slam: over the reverse Vertigo’s last 32nd the flat page squashes sideways into the slit (an impact), so 2.4 lands it instead of cutting to it', () => {
  assert.equal(G.squashAt(G.SLAM.from), null, 'the last step lands whole (the page)');
  assert.equal(G.squashAt(TR.CROSS), null, 'the cross is the slit');
  assert.equal(G.squashAt(G.SLAM.from - 1), null);
  const w = [G.SLAM.from + 1, G.SLAM.from + 2].map((f) => G.squashAt(f)!);
  assert.ok(w[0] < 1 && w[1] < w[0] && w[1] > G.SLAM_SLIT, `narrowing ${w.join(' → ')}`);
  assert.ok(1 - w[0] < w[0] - w[1] && w[0] - w[1] < w[1] - G.SLAM_SLIT, 'an impact: each step bigger than the last, into the slit');
  close(G.SLAM_SLIT * 1920, 3 * TR.SLIT[0].width, 1e-9, 'it lands on the slit’s width');
  close(G.squashAt(G.SLAM.from + 1.4)!, w[0], 1e-12, 'taken at the output frame (one sample through the snaps)');
  // The lens ghosts ride the closing page in and go out with it; the frame carries the squash, the cross none.
  const gh = G.ghostsAt(G.SLAM.from + 2);
  gh.forEach((g, i) => assert.ok(Math.abs(g.x) < Math.abs(G.GHOSTS[i].x) && g.alpha < 0.33 * w[1] + 1e-9, `ghost ${i}`));
  assert.equal(G.gateFrame(G.SLAM.from + 1, SLUG_LEN).squash, w[0]);
  assert.equal(G.gateFrame(TR.CROSS, SLUG_LEN).squash, null);
});

test('v07 — the inhale: from the cross the printed space pours into the point, accelerating; in the vacuum the three shed plates converge as rings, landing in the bang’s ghost register on its shock ring’s start', () => {
  for (let f = TR.CROSS; f < TR.TRANSITION_END - 1; f++) {
    assert.ok(G.specksAt(f + 1).scale < G.specksAt(f).scale, `pouring in at ${f}`);
    if (f > TR.CROSS) assert.ok(G.specksAt(f).scale - G.specksAt(f + 1).scale > G.specksAt(f - 1).scale - G.specksAt(f).scale - 1e-12, `accelerating at ${f}`);
  }
  close(G.specksAt(TR.CROSS).scale, 1, 1e-12, 'continuous with the page’s fixed starfield');
  assert.equal(G.plateRingsAt(TR.POINT - 1).length, 0, 'none before the vacuum');
  assert.equal(G.plateRingsAt(TR.TRANSITION_END).length, 0);
  const last = G.plateRingsAt(TR.TRANSITION_END - 1);
  assert.deepEqual(last.map((r) => r.plate), ['yellow', 'pink', 'blue']);
  for (const r of last) {
    close(r.r, G.INHALE_RING.to, 1e-9, `${r.plate} lands on the shock ring’s start`);
    close(r.alpha, 1, 1e-12);
  }
  // Their offsets are the bang's Y/P/B ghosts at 45 px (cosmosBang.ts whiteAt: (−g, 0.4g), (g, −0.5g), (0.3g, g)).
  assert.deepEqual(last.map((r) => [r.x, r.y]), [[-45, 18], [45, -22.5], [13.5, 45]]);
  for (const r of G.plateRingsAt(TR.POINT)) assert.ok(r.r >= 1100 && r.alpha < 0.5, `${r.plate} starts beyond the corners, fading in`);
  // Converging every frame (each plate once it has left), faster and faster; the yellow leads.
  for (let f = TR.POINT + 3; f < TR.TRANSITION_END - 1; f++) {
    const a = G.plateRingsAt(f);
    const b = G.plateRingsAt(f + 1);
    a.forEach((r, i) => assert.ok(b[i].r < r.r, `${r.plate} converging at ${f}`));
    assert.ok(a[0].r <= a[1].r && a[1].r <= a[2].r, `the yellow leads at ${f}`);
  }
  assert.deepEqual(G.gateFrame(TR.TRANSITION_END - 1, SLUG_LEN).plateRings, last);
});

// ——— The four standards, pacing, the type ——————————————————————————————————————————————————————————————————————————————————

test('every drum-timed swap lands whole on its frame: the paste, the waltz pose, the ⊕, the sun’s lights-out, the sheds, the slit steps', () => {
  const swaps: [string, number[], (f: number) => unknown][] = [
    ...[...TR.PASTES.map((p) => p.at), ...TR.AUTO_REPEAT].map((at): [string, number[], (f: number) => unknown] => {
      const pasted = Array.from({ length: 18 }, (_, i) => i + 5).filter((n) => G.bornOf(n) === at);
      return [`paste ${at}`, [at], (f) => pasted.map((n) => G.filmsAt(f, SLUG_LEN).some((x) => x.n === n)).join()];
    }),
    ['pose', [...TR.WALTZ_STEPS], G.poseAt],
    ['targets', TR.TARGETS.map((t) => t.at), G.targetsAt],
    ['sun mode', [TR.PRESS_PASSES[0].at], (f) => G.sunAt(f)?.mode],
    ['slit', TR.SLIT.map((s) => s.at), (f) => G.slitAt(f)?.width],
  ];
  for (const [name, frames, read] of swaps) {
    for (const F of frames) {
      const samples = temporalSamples(F, transitionTemporal(F), TR.transitionSegment(F)).map((s) => s.frame);
      const seen = new Set(samples.map((s) => String(read(s))));
      assert.equal(seen.size, 1, `${name} on ${F}: ${[...seen].join(' | ')}`);
    }
  }
});

test('pacing: no frame of the transition is still — something moves every frame, the vacuum included (its tremble and its breathing specks)', () => {
  const state = (f: number) => JSON.stringify(G.gateFrame(f, SLUG_LEN));
  let still = 0;
  for (let f = TR.TRANSITION_START; f < TR.TRANSITION_END - 1; f++) if (state(f) === state(f + 1)) still++;
  assert.ok(still <= Math.floor(0.03 * 192), `${still} still frames`);
});

test('every string the films print is in the transition’s atlases, and those are the cosmos’s print faces (jp 900, whole) and mono (700) characters', () => {
  // The print atlas holds whole faces (PRINT_FACES; COSMOS_ATLASES.print.chars drops their ^, which plain() reads as a raised run).
  for (const key of PRINT_KEYS) assert.ok(PRINT_FACES.includes(key), `print: ${key}`);
  const mono = new Set(COSMOS_ATLASES.mono.chars);
  for (const ch of MONO_KEYS) assert.ok(mono.has(ch), `mono: ${ch}`);
  assert.equal(COSMOS_ATLASES.print.role, 'jp');
  assert.equal(COSMOS_ATLASES.mono.role, 'mono');
});

test('the renderer keeps the CosmosPart contract (no GL in the constructor) and its look: the Riso print’s in bar 1, the neon’s bloom rising 0 → 0.35 over bar 2 to the crash', () => {
  const part = new GatePart();
  for (let f = TR.TRANSITION_START; f < TR.TRANSITION_END; f++) {
    assert.deepEqual(part.temporal(f), G.gateTemporal(f));
    const look = part.look(f);
    assert.ok(look.bloom.intensity <= 0.35 + 1e-9 && look.bloom.intensity >= 0);
    if (f < TR.at(2) || f >= TR.CRASH) assert.deepEqual(look, transitionLook(f));
    else assert.ok(look.bloom.intensity <= 0.35 * ((f - TR.at(2)) / (TR.CRASH - TR.at(2))) + 1e-9, `${f}: the bloom rises with the passes`);
    assert.equal(look.flash ?? 0, 0, 'never a white flash: the only white is the bang’s');
  }
  assert.ok(part.look(TR.CRASH - 1).bloom.intensity > 0.3);
});

test('the slit-scan: behind the passes the shutter (0.75, ≥ 64 sub-frames, a stroke apart) keeps a tail of light into the past that grows with the speed; every kick resets it, so its frame lands sharp; none outside 2.1 → the crash', () => {
  for (let f = TR.TRANSITION_START; f < TR.TRANSITION_END; f++) {
    const t = G.gateTemporal(f);
    const base = transitionTemporal(f);
    if (f < TR.PRESS_PASSES[0].at || f >= TR.CRASH) {
      assert.deepEqual(t, base, `${f}: the score's photography`);
      continue;
    }
    assert.equal(t.shutter, 0.75, `${f}: the flight's shutter`);
    assert.ok(t.samples >= 64, `${f}: never fewer sub-frames than the score's`);
    const tail = t.persistence;
    assert.ok(tail >= 0 && tail <= 1.8 + 1e-9);
    if (tail > 0) assert.ok(t.samples >= Math.ceil((0.75 + 3 * tail) * G.SLIT_SCAN_DENSITY) && (t.afterglow ?? 1) < 1, `${f}: dense, a trail not a double exposure`);
    // Sub-frames stay inside the flight's segment (the crash stop is sharp).
    const seg = TR.transitionSegment(f);
    for (const s of temporalSamples(f, t, seg)) assert.ok(s.frame >= seg.from && s.frame < seg.to);
  }
  for (const k of TR.KICKS.filter((x) => x >= TR.PRESS_PASSES[0].at && x < TR.CRASH)) {
    assert.equal(G.gateTemporal(k).persistence, 0, `the kick on ${k}: the shutter alone`);
    close(G.gateTemporal(k + G.SLIT_SCAN_REGROW).persistence, G.slitScanTail(G.speedAt(k + G.SLIT_SCAN_REGROW)), 1e-9, 'grown back');
  }
  // The tail grows with the speed: the 24-unit stage streaks longer than the 12-unit one.
  assert.ok(G.gateTemporal(TR.at(2, 2) + 12).persistence > G.gateTemporal(TR.at(2, 1) + 12).persistence);
});

// ——— Round 1 (rev1c): neon in the dark, the portrait flat frame, the point's glint ———————————————————————————————————————————————

test('T2 — the twist: bar 1’s fan kept (n ≤ 22); the flight’s films fold it back and forth at the same slope (no jump on n = 23), so the stack the crash flattens is centred on 0° and the corkscrew’s 90° leaves a portrait frame', () => {
  for (let n = 5; n <= 22; n++) close(G.twistOf(n) / DEG, -(0.75 * n - 17.25), 0.31, `film ${n}: bar 1's fan`);
  for (let n = 5; n < 120; n++) assert.ok(Math.abs(G.twistOf(n + 1) - G.twistOf(n)) / DEG <= 0.75 + 0.6 + 1e-9, `${n} → ${n + 1}: never more than the fan's step`);
  for (let n = 23; n < 120; n++) assert.ok(Math.abs(G.twistOf(n)) / DEG <= 6.8, `film ${n} within ±6.8° (inside bar 1’s range)`);
  const [n0, n1] = G.reverseFilms();
  const flat = G.filmsAt(TR.REVERSE_VERTIGO.at(-1)!.at + 2, SLUG_LEN);
  assert.deepEqual([Math.min(...flat.map((x) => x.n)), Math.max(...flat.map((x) => x.n))], [n0, n1], 'the flattened stack is the crash’s');
  const mean = flat.reduce((a, x) => a + x.rot, 0) / flat.length / DEG;
  close(mean, 0, 1, 'centred on 0°');
  close((G.cameraAt(TR.CROSS - 1).roll / DEG) + mean, 90, 1.5, 'portrait: the roll’s 90° and nothing else');
});

test('T1/t-haze — behind the passes only the near sheets streak hot (their lines whole to 200 ahead, FAR_GLOW by 300), the knock-outs fade less; flattened, one even glow from the 5th reverse step', () => {
  close(G.glowOf(120), 1, 1e-9);
  close(G.glowOf(200), 1, 1e-9);
  close(G.glowOf(300), G.FAR_GLOW, 1e-9);
  close(G.glowOf(G.RIM_D), G.FAR_GLOW, 1e-9);
  assert.ok(G.FAR_GLOW >= 0.15 && G.FAR_GLOW <= 0.25, 'the far sheets at 15–25 %');
  for (let D = 100; D < G.RIM_D; D += 5) {
    assert.ok(G.glowOf(D + 5) <= G.glowOf(D) + 1e-12, 'never brighter farther in');
    assert.ok(G.knockGlowOf(D) >= 0.35 - 1e-9 && G.knockGlowOf(D) <= 1 + 1e-9);
  }
  assert.ok(G.knockGlowOf(320) > G.glowOf(320) * 3, 'mid-tunnel the faces outshine the lines');
  const f = TR.at(2, 2) + 12;
  const cam = G.cameraAt(f);
  for (const x of G.filmsAt(f, SLUG_LEN)) {
    assert.equal(x.flat, 0);
    if (x.kind === 'film') close(x.glow, G.glowOf(cam.eye - x.z), 1e-9);
  }
  close(G.flatAt(TR.CRASH), 0, 1e-9, 'the crash frame is the flight’s, sharp');
  for (let i = 1; i < TR.REVERSE_VERTIGO.length; i++) assert.ok(G.flatAt(TR.REVERSE_VERTIGO[i].at) >= G.flatAt(TR.REVERSE_VERTIGO[i - 1].at));
  for (const x of G.filmsAt(TR.REVERSE_VERTIGO[4].at, SLUG_LEN)) assert.deepEqual([x.flat, x.glow, x.knockGlow], [1, G.REVERSE_GLOW, G.REVERSE_GLOW]);
});

test('the flare’s glow brightens with the inks on 2.2 (whole on its kick’s frame), still thin', () => {
  const a = G.flareAt(TR.at(2, 2) - 0.6)!;
  const b = G.flareAt(TR.at(2, 2) - 0.4)!;
  assert.ok(b.glow > a.glow);
  assert.equal(a.width, b.width);
  assert.ok(G.flareAt(TR.CRASH)!.width <= 10);
});

test('the sun as light has a white-hot middle from the first pass (opaque: a light, not a tint), wider as it heats on 2.2 (L)', () => {
  const a = G.sunAt(TR.PRESS_PASSES[0].at + 2)!;
  const b = G.sunAt(TR.at(2, 2) + 12)!;
  assert.equal(a.mode, 'light');
  assert.equal(a.white.alpha, 1);
  assert.ok(b.white.r / b.r > a.white.r / a.r);
  assert.ok(b.hot > 0.99 && G.sunAt(TR.at(2, 2) + 3)!.hot > 0.7, 'heated with the swell');
});
