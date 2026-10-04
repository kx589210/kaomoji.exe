// Bars 11–14 of the 60-bar map (the part 'riso', build sheet notes/b114/sheet.md §3.11–3.14, §8 W4): S09–S11 as approved,
// frame for frame (their random draws on v04's clock), A8's press slug, T2's backs converging into register, and S12's proof → print,
// sky roller, sea chop and halftone rings, handing the lift v04's sun.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROTAGONIST, faceText } from '../src/actors/cast.ts';
import { SIGNATURE } from '../src/content/boot.ts';
import { BUILD_THREADS, PRINT, RISO_GLYPHS, RISO_SLUG, SEA_STEP, SKY, SUN_RING } from '../src/content/build.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { FACES, FLIP, MERGED, PRINT_STEPS, REGISTER, SKY_ROLLER, SKY_UNPRINT, SLAMS, SLUG, STRETCH, SUCK, SUNRISE, SUN_RINGS } from '../src/score/build.ts';
import { partEnd, partFrame, seedFrame } from '../src/score/film.ts';
import {
  BIG, FLAT, HORIZON, MASK_PX, OMEGA_S11, PRINT_PITCH, REGISTER_K, RISO_ATLAS, type RisoLayout, type RisoThreads, SKY_TOP, SUN, halftoneAt, preRollTurn, printCoverage,
  printScale, registerK, risoFrame, risoSegment, risoTemporal, s12Aim, s12OutputFrame, seaChop, skyFront,
} from '../src/shots/riso.ts';
import { FRONT } from '../src/shots/swiss.ts';
import { PLATE, misregistration } from '../src/worlds/riso.ts';

const riso = (bar: number, beat = 0): number => partFrame('riso', bar, beat);
const L: RisoLayout = {
  advance: (ch) => ('()'.includes(ch) ? 0.36 : 0.6),
  slug: (ch) => (ch === ' ' ? 0.25 : 0.55),
  mouths: { '〇': { x: 0, y: 0.01, half: 0.18 }, 'ロ': { x: 0.01, y: 0, half: 0.15 }, '▽': { x: 0, y: 0.05, half: 0.12 }, '◇': { x: 0, y: 0, half: 0.14 }, 'O': { x: -0.01, y: 0, half: 0.18 } },
};
const ON: RisoThreads = BUILD_THREADS;
const OFF: RisoThreads = { ...BUILD_THREADS, register: false, slugs: false, printSteps: false, sunRings: false };
/** The same numbers, +0 and −0 alike (a drift of 0 × a negative noise is −0; the pinned values went through JSON). */
const same = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const sameShift = (a: { pink: readonly number[]; blue: readonly number[] }, b: { pink: readonly number[]; blue: readonly number[] }): boolean => same(a.pink, b.pink) && same(a.blue, b.blue);

test('the Riso world’s misregistration reads its noise on `clock` and its beats on `frame`: moved with its beats, it draws what it drew', () => {
  const strong = [960, 1056];
  for (const f of [961, 975.5, 1003, 1055.75]) {
    assert.deepEqual(misregistration(f, strong, 12), misregistration(f, strong, 12, f), 'the clock defaults to the frame');
    assert.deepEqual(misregistration(f + 192, strong.map((s) => s + 192), 12, f), misregistration(f, strong, 12), `${f}: moved, the same plates`);
  }
  assert.notDeepEqual(misregistration(980 + 192, [1152, 1248], 12), misregistration(980, [960, 1056], 12), 'on the film’s clock it would re-roll');
});

// v04's S10/S11 halftone shifts and S12's last eighth, from the 58-bar copy taken before the 60-bar map (riso at v04's 768).
const V04_SHIFT: Record<string, { pink: [number, number]; blue: [number, number] }> = {
  864.5: { pink: [3.7971169817399684, -2.211808002441373], blue: [0.22995985274530453, 4.689868570200504] },
  900: { pink: [2.730298570041146, -5.946513194440397], blue: [0.7472264411763192, -1.5642136064616876] },
  960: { pink: [0, 0], blue: [0, 0] },
  962: { pink: [-0.40751582764956973, 0.4107587794143536], blue: [0.049049609972434696, -0.4494279472175034] },
  967.25: { pink: [0.24655612614795563, -0.47892932664406085], blue: [0.3447706902424683, 0.6036592632896113] },
  983: { pink: [0.5590248065351349, -2.272944841474416], blue: [1.5872064538187782, 2.398577389733304] },
  1001: { pink: [0.3193212296506117, -2.264135850631356], blue: [2.161444883145675, 2.451304231897453] },
  1030.5: { pink: [0.9124907429982686, -1.5199693134819485], blue: [-0.7537226979849794, 1.7231228150541196] },
  1055: { pink: [1.6418273586540868, -0.6042200571498457], blue: [2.086000042821806, -0.5234181630673524] },
};
const V04_SUCK: Record<string, { sun: [number, number, number][]; glyphs: [string, number, number, number][] }> = {
  1140: { sun: [[-0.1769032795034048, 5.253624065664216, 350], [-1.7017904981994911, -4.942898837728804, 224]], glyphs: [['ω', -1071, -315, 56], ['ω', -741, -315, 56]] },
  1145.5: {
    sun: [[-0.0830741409354514, 4.535845367330676, 343.30373426239197], [-1.6759583397349762, -6.924640727499629, 218.10728615090494]],
    glyphs: [['ω', -1099.5405733610821, -325.7287702047255, 57.90865429156457], ['ω', -758.293146285791, -325.7287702047255, 57.90865429156457]],
  },
  1150: {
    sun: [[-0.16071906491331175, 4.7853449601926945, 309.75197152451983], [-1.5826326012487106, -6.6529356872196965, 188.58173494157748]],
    glyphs: [['ω', 91.59366701157752, -296.7330537236731, 15.766939008425371], ['ω', 90.6842360415322, -203.82518545405688, 15.766939008425371]],
  },
  1150.75: { sun: [[-0.20539208283506472, 4.725705624228193, 300], [-1.5329718812277178, -6.561095840306968, 180]], glyphs: [] },
  1151: { sun: [[-0.2222412082354914, 4.699507964641752, 300], [-1.5142415661956152, -6.526933583123184, 180]], glyphs: [] },
};

test('S10’s and S11’s halftone plates drift as they did in v04, frame for frame (G1, G5)', () => {
  for (const [t, shift] of Object.entries(V04_SHIFT)) {
    const f = Number(t) - 768 + partFrame('riso', 1);
    assert.equal(seedFrame(f), Math.floor(Number(t)) + (Number(t) % 1), `${f} seeds as v04’s ${t}`);
    for (const th of [ON, OFF]) {
      const h = risoFrame(f, L, th).halftone;
      assert.ok(sameShift(h?.shift ?? halftoneAt(f).shift, shift), `${f} (v04 ${t})`);
    }
    assert.ok(sameShift(halftoneAt(f).shift, shift), `${f} (v04 ${t})`);
  }
});

test('the hand-off: the suck (riso 4.4&) and the last frame are v04’s, with every thread on or off; the last frame’s shutter sees only v04’s sun (G4)', () => {
  for (const [t, want] of Object.entries(V04_SUCK)) {
    const f = Number(t) - 768 + partFrame('riso', 1);
    assert.ok(f >= SUCK.from && f < partEnd('riso'));
    for (const th of [ON, OFF]) {
      const c = risoFrame(f, L, th).content;
      assert.deepEqual(c.under.slice(-2).map((s) => [s.x, s.y, s.w]), want.sun, `${f}: the sun`);
      assert.deepEqual(c.glyphs.rounded.slice(0, 2).map((g) => [g.ch, g.x, g.y, g.size]), want.glyphs, `${f}: the sea’s ω rows`);
    }
  }
  const last = risoFrame(partEnd('riso') - 1, L, ON);
  assert.deepEqual(last.camera, risoFrame(partEnd('riso') - 1, L, OFF).camera);
  assert.equal(last.content.under.length + last.content.over.length + last.content.glyphs.rounded.length, 2, 'only the sun');
  assert.ok(!last.print);
});

test('the Riso part times its sub-frames as v04 did through riso 1–3 and the suck', () => {
  const V04_TEMPORAL: Record<number, [number, number]> = {
    768: [48, 0.2], 800: [48, 0.2], 863: [48, 0.2], 864: [48, 0.5], 900: [48, 0.5], 960: [64, 0.5], 1000: [16, 0.5], 1055: [48, 0.5], 1139: [64, 0.5], 1140: [64, 0.5], 1151: [64, 0.5],
  };
  for (const [t, [samples, shutter]] of Object.entries(V04_TEMPORAL)) {
    const f = Number(t) - 768 + partFrame('riso', 1);
    assert.deepEqual(risoTemporal(f), { samples, shutter, persistence: 0 }, `${f} (v04 ${t})`);
  }
  for (const [a, b] of [[PRINT_STEPS[0], PRINT_STEPS[3] + 4], [STRETCH.from - 1, STRETCH.from + 10], [SUNRISE.from - 1, SUCK.from - 1]] as const) {
    for (let f = a; f <= b; f++) assert.ok(risoTemporal(f).samples >= 32, `${f}: ${risoTemporal(f).samples} sub-frames`);
  }
});

test('the Riso atlas keeps v04’s cells; N1’s ・ packs after the mouths’ counters; A8’s slug has its own atlas', () => {
  const v04Main = [...new Set([faceText(PROTAGONIST), '(=^･ω･^=)', '(-ω-)'].join(''))];
  assert.ok(v04Main.every((c) => c === ' ' || RISO_ATLAS.main.includes(c)));
  // The main atlas as approved (the v02/v03 cuts), character for character: every cell, and the counters after it, where they were.
  assert.equal(RISO_ATLAS.main.join(''), '(•ω)=^･-ノヽﾉ≧▽≦/°oO〇Σロ☆（゜◇）＼＾／●');
  assert.deepEqual(RISO_ATLAS.main, RISO_GLYPHS.filter((c) => (!RISO_ATLAS.slug.includes(c) || !SIGNATURE.includes(c)) && !RISO_ATLAS.added.includes(c)));
  assert.deepEqual(RISO_ATLAS.added, ['・'], 'N1: the eyes of Σ(・ロ・), after the counters');
  assert.ok(RISO_ATLAS.added.every((c) => !RISO_ATLAS.main.includes(c) && !RISO_ATLAS.slug.includes(c)));
  for (const c of SIGNATURE.replaceAll(' ', '')) assert.ok(RISO_ATLAS.slug.includes(c), `the slug has ${c}`);
  assert.ok(RISO_ATLAS.slug.every((c) => !RISO_ATLAS.main.includes(c)), 'no slug-only character joins the main atlas (its counters would move)');
  assert.equal(RISO_ATLAS.main.length, RISO_GLYPHS.length - RISO_ATLAS.slug.length - RISO_ATLAS.added.length);
});

/** The registration-marks sheet of an S09 frame (or T2’s backs). */
const marksOf = (f: number, th: RisoThreads = ON) => {
  const sheets = risoFrame(f, L, th).stack!.sheets;
  return sheets[sheets.length - 1];
};

test('A8: the signature as a press slug by the bottom-left mark through S09 (riso 1), blue with a pink ghost, never turning; gone with the marks', () => {
  for (let f = SLUG.from; f < SLUG.to; f += 5.5) {
    const slug = marksOf(f).ink.glyphs.slug ?? [];
    const text = SIGNATURE.replaceAll(' ', '');
    const blue = slug.filter((g) => g.color === PLATE.blue);
    const pink = slug.filter((g) => g.color === PLATE.pink);
    assert.equal(blue.map((g) => g.ch).join(''), text, `${f}: the blue plate`);
    assert.equal(pink.map((g) => g.ch).join(''), text, `${f}: the pink ghost`);
    for (const g of blue) assert.ok(g.size === RISO_SLUG.px && Math.abs(g.y - RISO_SLUG.y) < 1e-9 && !g.rot && (g.alpha ?? 1) === 1, `${f}: ${g.ch}`);
    for (const [i, g] of pink.entries()) {
      assert.ok(Math.abs(g.x - blue[i].x - RISO_SLUG.ghost[0]) < 1e-9 && Math.abs(g.y - blue[i].y + RISO_SLUG.ghost[1]) < 1e-9, 'the ghost a touch off register, down-right');
      assert.equal(g.alpha, RISO_SLUG.ghostAlpha);
    }
    const left = blue[0].x - (L.slug!(blue[0].ch) * RISO_SLUG.px) / 2;
    assert.ok(Math.abs(left - RISO_SLUG.x) < 1e-9, `${f}: set from x ${RISO_SLUG.x}`);
    assert.ok(left > -840 + 50, 'right of the mark’s arm');
  }
  assert.equal(marksOf(SLUG.from, OFF).ink.glyphs.slug?.length ?? 0, 0, 'off: no slug');
  assert.ok(risoFrame(SLUG.to, L).stack!.sheets.every((s) => !(s.ink.glyphs.slug?.length)), 'gone on riso 2.1');
  // … from riso 2.1's whole shutter (it reaches back a quarter frame into S09's marks), so S10's first frame is v04's byte for byte.
  for (const f of [SLUG.to - 0.25, SLUG.to - 0.125]) assert.ok(risoFrame(f, L).stack!.sheets.every((s) => !(s.ink.glyphs.slug?.length)), `none in riso 2.1's shutter (${f})`);
  assert.ok((marksOf(SLUG.to - 0.3).ink.glyphs.slug?.length ?? 0) > 0, 'there until then');
  // The slug leaves S09's marks as they were.
  for (const f of [SLUG.from, SLUG.from + 30]) assert.deepEqual(marksOf(f).ink.over, marksOf(f, OFF).ink.over);
});

test('T2’s backs: S09’s first sheet, its plates converging into register on the fill’s sixteenths ×5 → ×4 → ×3 → ×2 → ×1.4, then S09’s own on riso 1.1', () => {
  assert.deepEqual([...REGISTER_K], [5, 4, 3, 2, 1.4]);
  assert.equal(registerK(FLIP.from), REGISTER_K[0]);
  REGISTER.forEach((at, i) => {
    assert.ok(Math.abs(registerK(at - 0.01) - REGISTER_K[i]) < 0.02, `before ${at}`);
    const step = REGISTER_K[i + 1] - REGISTER_K[i];
    const moved = (registerK(at + 2) - REGISTER_K[i]) / step;
    assert.ok(moved > 0.85, `${at}: a 2-frame launch (${moved.toFixed(2)} of the way after 2 frames)`);
    assert.ok(Math.abs(registerK(at + 5.99) - REGISTER_K[i + 1]) < 0.02, `${at}: seated`);
    assert.ok(Math.abs(registerK(at + 3) - REGISTER_K[i + 1]) > 0.02, `${at}: a clack as the plate seats`);
  });
  // The pink plate of the face prints ×k its S09 offset (−14, +6), the blue (+14, −6).
  const face = (f: number) => risoFrame(f, L).stack!.sheets[0].ink.glyphs.rounded;
  for (const f of [FLIP.from, REGISTER[1] + 6, FLIP.to - 0.25]) {
    const [pink, blue] = [face(f).filter((g) => g.color === PLATE.pink), face(f).filter((g) => g.color === PLATE.blue)];
    const s09 = risoFrame(SLAMS[0], L).stack!.sheets[0].ink.glyphs.rounded;
    const [p0, b0] = [s09.filter((g) => g.color === PLATE.pink), s09.filter((g) => g.color === PLATE.blue)];
    const k = registerK(f);
    pink.forEach((g, i) => assert.ok(Math.abs(g.x - p0[i].x - 1.1 * -14 * (k - 1)) < 1e-6 && Math.abs(g.y - p0[i].y - 1.1 * 6 * (k - 1)) < 1e-6, `${f}: pink ${g.ch}`));
    blue.forEach((g, i) => assert.ok(Math.abs(g.x - b0[i].x - 1.1 * 14 * (k - 1)) < 1e-6 && Math.abs(g.y - b0[i].y + 1.1 * 6 * (k - 1)) < 1e-6, `${f}: blue ${g.ch}`));
  }
  // The marks pre-roll −4π/8 … 0, a step on each sixteenth of the fill, seated by riso 1.1 where S09's own marks take over.
  assert.equal(preRollTurn(FLIP.from), -4);
  REGISTER.forEach((at, i) => assert.ok(Math.abs(preRollTurn(at + 6 - 1e-3) - (i - 3)) < 0.01, `${at}`));
  const arms = (f: number) => marksOf(f).ink.over.filter((s) => s.kind === 'segment').map((s) => s.rot ?? 0);
  arms(FLIP.to - 0.01).forEach((r, i) => assert.ok(Math.abs(r - arms(SLAMS[0])[i]) < 1e-6, 'the marks meet S09’s'));
  assert.deepEqual(marksOf(FLIP.to - 0.01).ink.glyphs.slug, marksOf(SLAMS[0]).ink.glyphs.slug, 'the slug is on the plate');
  // The sheet as S09 slams it on riso 1.1 (110 %), the same page and marks; without register, S09’s first frame as v04's backs were.
  assert.deepEqual(risoFrame(FLIP.to - 1, L).stack!.sheets[0].card, risoFrame(SLAMS[0], L).stack!.sheets[0].card);
  assert.deepEqual(risoFrame(FLIP.from + 10, L, { ...ON, register: false }), risoFrame(SLAMS[0], L, { ...ON, register: false }));
});

/** S12's print at `f`: the mask's glyphs by character, the solid glyphs. */
const printAt = (f: number, th: RisoThreads = ON) => {
  const fr = risoFrame(f, L, th);
  return { fr, mask: fr.print?.mask ?? [], solid: fr.content.glyphs.rounded.filter((g) => g.size > 200) };
};
/** A world point on screen (1080p px from the centre) through S12's camera. */
const onScreen = (f: number, [x, y]: readonly [number, number]): [number, number] => {
  const a = s12Aim(f);
  return [(x - a.x) * a.zoom, (y - a.y) * a.zoom];
};

test('S12 cuts to the proof: (•ω•) printed as S11’s rosette, its ω on S11’s ω point and at S11’s size (E15, ≤ 10 px; ≈ 0.76 of BIG), negative → positive', () => {
  const { fr, mask, solid } = printAt(PRINT_STEPS[0]);
  assert.equal(fr.print!.coverage, PRINT.coverage[0]);
  assert.equal(PRINT_PITCH, 22, 'S11’s screen');
  assert.equal(solid.length, 0, 'nothing solid yet');
  assert.equal(mask.map((g) => g.ch).join(''), faceText(PROTAGONIST));
  const w = mask.find((g) => g.ch === 'ω')!;
  const [sx, sy] = onScreen(PRINT_STEPS[0], [w.x, w.y]);
  assert.ok(Math.hypot(sx - OMEGA_S11[0], sy - OMEGA_S11[1]) <= PRINT.pinPx, `the ω at (${sx.toFixed(1)}, ${sy.toFixed(1)})`);
  // The ω is as big on screen as S11's faces were on its last frame (MASK_PX ems at S11's last zoom), within 3 % of the design's 0.76 of BIG.
  const s11 = risoFrame(partFrame('riso', 4) - 1, L).camera;
  const s11Em = (MASK_PX * FRONT) / (s11.position[2] - s11.target[2]);
  assert.ok(Math.abs((w.size * s12Aim(PRINT_STEPS[0]).zoom) / s11Em - 1) < 1e-9, `the ω's em ${w.size.toFixed(1)} vs S11's ${s11Em.toFixed(1)}`);
  assert.ok(Math.abs(w.size / (PRINT.scale[0] * BIG.size) - 1) < 0.03);
  for (const g of mask) assert.deepEqual(g.color, [1, 1, 0], `${g.ch}: both screens`);
});

test('S12 prints on the snare sixteenths: screens 0.75 → 0.45 → 0.18 → 0, the face 0.76 → 1 of BIG, blue solid from the second step, pink from the third', () => {
  PRINT_STEPS.forEach((at, i) => {
    assert.ok(Math.abs(printCoverage(at + 6 - 0.01) - PRINT.coverage[i]) < 0.02, `${at}: coverage`);
    assert.ok(Math.abs(printScale(at + 6 - 0.01) - PRINT.scale[i]) < 0.005, `${at}: scale`);
    if (i > 0) {
      const moved = (printScale(at + 2) - PRINT.scale[i - 1]) / (PRINT.scale[i] - PRINT.scale[i - 1]);
      assert.ok(moved > 0.6, `${at}: a launch (${moved.toFixed(2)} in 2 frames)`);
    }
  });
  const roles = (f: number) => {
    const { mask, solid } = printAt(f);
    const m = (ch: string) => mask.find((g) => g.ch === ch)?.color.join('') ?? '-';
    const s = (ch: string) => solid.find((g) => g.ch === ch)?.color;
    return { bracketMask: m('('), eyeMask: m('•'), omegaMask: m('ω'), bracketSolid: s('('), eyeSolid: s('•') };
  };
  const at = (i: number) => roles(PRINT_STEPS[i] + 3);
  assert.deepEqual(at(1), { bracketMask: '100', eyeMask: '110', omegaMask: '100', bracketSolid: PLATE.blue, eyeSolid: undefined });
  assert.deepEqual(at(2), { bracketMask: '100', eyeMask: '-', omegaMask: '100', bracketSolid: PLATE.blue, eyeSolid: PLATE.pink });
  const end = printAt(STRETCH.from - 0.25);
  assert.ok(end.fr.print!.coverage < 1e-3, 'screens out by the stretch');
  // From the stretch on, the face is v04's: the print hands over without a jump.
  const v = risoFrame(STRETCH.from, L, OFF).content.glyphs.rounded.filter((g) => g.size > 200);
  const p = risoFrame(STRETCH.from, L, ON).content.glyphs.rounded.filter((g) => g.size > 200);
  assert.deepEqual(p, v);
  const before = printAt(STRETCH.from - 0.01).solid;
  before.forEach((g, i) => assert.ok(Math.abs(g.x - v[i].x) < 0.5 && Math.abs(g.y - v[i].y) < 0.5 && Math.abs(g.size - v[i].size) < 0.5, `${g.ch} meets the stretch`));
  assert.ok(!risoFrame(STRETCH.from, L).print, 'no print from the stretch');
});

test('S12’s print never holds still: something moves on every frame from the cut to the stretch (no dead frames)', () => {
  for (let f = PRINT_STEPS[0] + 1; f < STRETCH.from; f++) {
    const a = printAt(f - 1).fr.print!;
    const b = printAt(f).fr.print!;
    const was = printAt(f - 1).mask;
    const glyphMoved = printAt(f).mask.some((g, i) => was[i] !== undefined && Math.max(Math.abs(g.x - was[i].x), Math.abs(g.y - was[i].y), Math.abs(g.size - was[i].size)) > 0.5);
    const moved = Math.abs(b.coverage - a.coverage) > 1e-3 || b.shift.pink.some((v, i) => Math.abs(v - a.shift.pink[i]) > 0.5) || glyphMoved;
    assert.ok(moved, `${f}`);
  }
});

test('S12’s sky: a roller prints it top → bottom over the stretch (yellow 15 % → 55 %, pink 0 → 30 % in the lower third), and it un-prints by 1331', () => {
  const sky = (f: number, th: RisoThreads = ON): Shape[] => risoFrame(f, L, th).content.under.filter((s) => s.kind === 'rect' && s.w === 2800);
  assert.equal(sky(SKY_ROLLER.from - 0.01).length, 0);
  assert.equal(sky(SKY_ROLLER.from + 4, OFF).length, 0, 'off: no sky');
  assert.ok(skyFront(SKY_ROLLER.from) >= SKY_TOP - 1, 'the roller starts above every view');
  assert.ok(Math.abs(skyFront(SKY_ROLLER.to - 1) - HORIZON) < 1, 'and lands on the horizon');
  for (let f = SKY_ROLLER.from + 1; f < SKY_ROLLER.to; f++) assert.ok(skyFront(f) < skyFront(f - 1), `${f}: rolling down`);
  const full = sky(SKY_ROLLER.to + 2);
  const yellow = full.filter((s) => s.color === PLATE.yellow).sort((a, b) => b.y - a.y);
  const pink = full.filter((s) => s.color === PLATE.pink);
  assert.ok(yellow.length >= 8 && pink.length >= 2);
  for (let i = 1; i < yellow.length; i++) assert.ok(yellow[i].tint! >= yellow[i - 1].tint!, 'deeper toward the horizon');
  assert.ok(Math.abs(Math.min(...yellow.map((s) => s.tint!)) - SKY.yellow[0]) < 0.05 && Math.abs(Math.max(...yellow.map((s) => s.tint!)) - SKY.yellow[1]) < 0.03);
  assert.ok(Math.max(...pink.map((s) => s.tint!)) <= SKY.pink[1] + 1e-9 && pink.every((s) => s.y + s.h / 2 <= HORIZON + (SKY_TOP - HORIZON) / 3 + 1));
  for (const s of full) assert.ok(s.screen === SKY.pitch && s.y - s.h / 2 >= HORIZON - 1e-9, 'a screen of its own pitch, above the horizon');
  assert.ok(Math.max(...sky(SKY_UNPRINT.from + 3).map((s) => s.tint!)) < 0.6 * SKY.yellow[1], 'un-printing');
  assert.equal(sky(SKY_UNPRINT.to - 1).length, 0, 'gone by 1331');
});

test('S12’s sea steps with the snare: its ω rows rock ±SEA_STEP/2 on the sixteenths from MERGED and the 32nds from SUNRISE, back on v04’s drift by 1329', () => {
  assert.equal(seaChop(MERGED - 0.01, 0), 0);
  assert.ok(Math.abs(Math.abs(seaChop(MERGED + 5, 0)) - SEA_STEP / 2) < 0.2, 'the first step');
  assert.ok(Math.sign(seaChop(MERGED + 5, 0)) === -Math.sign(seaChop(MERGED + 5, 1)), 'neighbouring rows rock opposite ways');
  assert.ok(Math.sign(seaChop(MERGED + 11, 0)) === -Math.sign(seaChop(MERGED + 5, 0)), 'and back on the next sixteenth');
  assert.ok(Math.sign(seaChop(SUNRISE.from + 2.9, 0)) === -Math.sign(seaChop(SUNRISE.from + 5.9, 0)), 'on the 32nds from the sunrise');
  for (let f = SKY_UNPRINT.from + 3; f < partEnd('riso'); f += 0.25) assert.equal(seaChop(f, 0), 0, `${f}`);
  const rows = (f: number, th: RisoThreads) => risoFrame(f, L, th).content.glyphs.rounded.filter((g) => g.ch === 'ω' && g.size < 100).map((g) => g.x);
  rows(MERGED + 4, ON).forEach((x, i) => assert.ok(Math.abs(Math.abs(x - rows(MERGED + 4, OFF)[i]) - SEA_STEP / 2) < 0.5));
});

test('S12’s sun rings: a ring of 36 dots off the rim on every 32nd of the roll (r + 10 → r + 160, 12 → 4 px), printed in the sun’s own plates (yellow, pink over it a touch off register: its orange), no rays; gone by 1331', () => {
  const dots = (f: number, plate: 'yellow' | 'pink' = 'yellow', th: RisoThreads = ON): Shape[] =>
    risoFrame(f, L, th).content.under.filter((s) => s.kind === 'ellipse' && s.w < 2 * SUN_RING.size[0] && s.color === PLATE[plate]);
  const rays = (f: number, th: RisoThreads = ON) => risoFrame(f, L, th).content.under.filter((s) => s.kind === 'rect' && s.w === 10).length;
  // Each output frame's sub-frames draw its rings (see the next test): none on the frame before the sunrise, the first on its own frame.
  assert.equal(dots(SUNRISE.from - 1).length + dots(SUNRISE.from - 1.25).length, 0);
  assert.equal(dots(SUNRISE.from).length, SUN_RING.dots);
  assert.equal(dots(SUNRISE.from - 0.25).length, SUN_RING.dots, 'all through its shutter');
  assert.equal(dots(SUNRISE.from + 4).length, 2 * SUN_RING.dots, 'a ring a 32nd');
  assert.equal(SUN_RINGS.length, 12);
  for (let f = SUNRISE.from; f < SUCK.from; f++) assert.equal(rays(f), 0, `no rays on ${f}`);
  assert.equal(rays(SUCK.from - 1, OFF), 12, 'off: v04’s rays');
  assert.equal(dots(SUCK.from - 1, 'yellow', OFF).length + dots(SUCK.from - 1, 'pink', OFF).length, 0, 'off: no rings');
  // Each yellow dot has a pink one of its size, offset as the sun's two plates are (the orange of the sun's core, so the rings read on the yellow sky).
  for (const f of [SUNRISE.from + 2, SUNRISE.from + 13, SUNRISE.to + 4]) {
    const [y, p] = [dots(f), dots(f, 'pink')];
    assert.equal(p.length, y.length, `${f}`);
    const sun = risoFrame(f, L).content.under.slice(-2);
    const [dx, dy] = [sun[1].x - sun[0].x, sun[1].y - sun[0].y];
    y.forEach((d, i) => assert.ok(Math.abs(p[i].x - d.x - dx) < 1e-9 && Math.abs(p[i].y - d.y - dy) < 1e-9 && p[i].w === d.w && p[i].alpha === d.alpha, `${f}: dot ${i}`));
  }
  // Halftone dots do not fade, they shrink: full ink until 60 % of the way out, then gone by the end.
  assert.ok(dots(SUNRISE.from + 5).every((d) => (d.alpha ?? 1) === 1), 'full ink halfway out');
  assert.ok(dots(SUNRISE.from + 9).slice(0, SUN_RING.dots).every((d) => (d.alpha ?? 1) < 0.5), 'fading at the end');
  const ring = (f: number) => dots(f).slice(0, SUN_RING.dots);
  const fr = risoFrame(SUNRISE.from, L).content.under;
  const sun = fr[fr.length - 2];
  const [cx, cy] = [sun.x, sun.y];
  const r0 = Math.hypot(ring(SUNRISE.from)[0].x - cx, ring(SUNRISE.from)[0].y - cy);
  assert.ok(r0 > sun.w / 2 + 5 && r0 < sun.w / 2 + 40, `born at the rim (${r0.toFixed(0)} vs ${sun.w / 2})`);
  assert.ok(ring(SUNRISE.from + 9)[0].w < ring(SUNRISE.from + 1)[0].w, 'the dots shrink as they go');
  assert.equal(dots(SKY_UNPRINT.to - 1).length + dots(SKY_UNPRINT.to - 1, 'pink').length, 0, 'gone by 1331');
});

test('S12’s sun rings print crisp (RI1): through every output frame’s shutter each dot holds its place and size on screen, so no dot smears into a dash along its ring’s flight, the sun’s launches or the push', () => {
  const dots = (f: number): Shape[] => risoFrame(f, L).content.under.filter((s) => s.kind === 'ellipse' && s.w < 2 * SUN_RING.size[0]);
  /** A world shape on S12's screen (1080p px from the centre): S12's camera is (p − aim) × zoom, never rolled. */
  const onScreen = (s: Shape, f: number): [number, number, number, number] => {
    const a = s12Aim(f);
    assert.equal(a.roll, 0);
    return [(s.x - a.x) * a.zoom, (s.y - a.y) * a.zoom, s.w * a.zoom, s.h * a.zoom];
  };
  let held = 0;
  let ringed = 0;
  for (let f = SUNRISE.from; f < SKY_UNPRINT.to; f++) {
    const spec = risoTemporal(f);
    assert.ok(spec.shutter < 1 && spec.persistence === 0, `${f}: a sub-frame belongs to the frame it rounds to`);
    const whole = dots(f);
    const frame = whole.map((s) => onScreen(s, f));
    if (frame.length > 0) ringed++;
    for (const s of temporalSamples(f, spec, risoSegment(f))) {
      assert.equal(s12OutputFrame(s.frame), f);
      const sub = dots(s.frame);
      assert.equal(sub.length, frame.length, `${s.frame}: the frame's rings, all of them`);
      sub.forEach((d, i) => {
        const q = onScreen(d, s.frame);
        assert.ok(q.every((v, j) => Math.abs(v - frame[i][j]) < 1e-6), `${s.frame}: dot ${i} at ${q.map((v) => v.toFixed(2))} vs ${frame[i].map((v) => v.toFixed(2))}`);
        assert.ok(d.color === whole[i].color && d.alpha === whole[i].alpha, `${s.frame}: dot ${i}'s ink`);
      });
      held++;
    }
  }
  assert.equal(ringed, SKY_UNPRINT.to - 1 - SUNRISE.from, 'rings on every frame from the sunrise until they are gone on 1331');
  assert.ok(held > 30 * 32, `${held} sub-frames`);
  // The hold is only for the rings: the sun itself still moves (and blurs) through the shutter on its launches.
  const sun = (f: number) => risoFrame(f, L).content.under.at(-2)!;
  assert.ok(Math.abs(sun(SUNRISE.from + 1.2).y - sun(SUNRISE.from + 0.8).y) > 2, 'the sun launches through the shutter');
});

test('S12 prints only in Riso inks: pink, blue and yellow plates (red is the antivirus’s, amber his)', () => {
  const inks = [PLATE.pink, PLATE.blue, PLATE.yellow];
  for (let f = riso(4); f < partEnd('riso'); f += 1.5) {
    const c = risoFrame(f, L).content;
    for (const s of [...c.under, ...c.over]) assert.ok(inks.includes(s.color), `${f}: a ${s.kind} in ${s.color}`);
    for (const g of c.glyphs.rounded as Glyph[]) assert.ok(inks.includes(g.color), `${f}: ${g.ch} in ${g.color}`);
  }
  assert.ok(SUN.core < SUN.r);
  assert.deepEqual(FLAT, risoFrame(SLAMS[0], L).stack!.view);
  assert.equal(FACES.length, 4);
});
