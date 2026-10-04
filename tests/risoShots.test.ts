import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAT, PROTAGONIST, faceText } from '../src/actors/cast.ts';
import { BUILD_THREADS, FLIPBOOK, HALFTONE_FACES, MOUTH_CHARS, MOUTH_FACES } from '../src/content/build.ts';
import type { Pose } from '../src/engine/camera.ts';
import { type RGB, hue, linear, multiplyRGB } from '../src/engine/color.ts';
import { counterKey } from '../src/engine/glyphAtlas.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import type { Shape } from '../src/engine/shapeField.ts';
import { RING } from '../src/motion/hit.ts';
import { FACES, HOLE, LANDINGS, MERGED, MOUTHS, SEA, SLAMS, STRETCH, SUCK, SUNRISE, TEARS } from '../src/score/build.ts';
import { partEnd, partFrame } from '../src/score/film.ts';
import { BIG, FLAT, GAP, HALFTONE_EXTENT, HALFTONE_Z, HORIZON, type RisoLayout, type Sheet, SUN, SUN_CIRCLE_PER_EM, risoFrame, risoSegment, risoTemporal, sunCentre } from '../src/shots/riso.ts';
import { FOV, FRONT } from '../src/shots/swiss.ts';
import { PAPER, PLATE, type Plate, RISO } from '../src/worlds/riso.ts';

const adv = (ch: string) => ('()'.includes(ch) ? 0.36 : 0.6);
/**
 * A layout built by hand in the shape the browser measures: advances in ems,
 * and for each of S10's mouths the largest 16:9 window inside its counter
 * (centre in ems from the glyph's centre, y up; half its height). The windows
 * sit a little off their glyphs' centres and are sized so the camera is square
 * in a window before its hole covers the frame.
 */
/** The Riso part's bar `bar` (1-based), plus `beat` beats (0-based). */
const riso = (bar: number, beat = 0): number => partFrame('riso', bar, beat);

/** v04's S12: the bars 1–14 threads off (the print steps, the sky, the chop and the rings; tests/risoBars.test.ts draws them). */
const V04_S12 = { ...BUILD_THREADS, printSteps: false, sunRings: false };

const L: RisoLayout = {
  advance: adv,
  mouths: { '〇': { x: 0, y: 0.01, half: 0.18 }, 'ロ': { x: 0.01, y: 0, half: 0.15 }, '▽': { x: 0, y: 0.05, half: 0.12 }, '◇': { x: 0, y: 0, half: 0.14 }, 'O': { x: -0.01, y: 0, half: 0.18 } },
};

/** S09's last sheet goes up on the last tear, and S10's flight starts there. */
const LAST_SHEET = TEARS[TEARS.length - 1];
/** The bursts through the mouths: the kicks of riso bar 2, and the last into S11. */
const BURSTS: readonly number[] = [...MOUTHS, HOLE];
const COUNTERS = new Set(MOUTH_CHARS.map(counterKey));

const sheetsAt = (f: number): readonly Sheet[] => risoFrame(f, L).stack?.sheets ?? [];
/** The pad (S09) and the flight (S10): every sheet but those drawn flat over them (the sheet tearing off, the registration marks). */
const pad = (f: number): Sheet[] => sheetsAt(f).filter((s) => !s.view);
/** The sheet tearing off at `f`. */
const tornAt = (f: number): Sheet | undefined => sheetsAt(f).find((s) => s.view && s.card.under.length > 0);
/** Face j's page in S10's flight at `f`, while the camera has not gone through it. */
const facePage = (f: number, j: number): Sheet | undefined => pad(f).find((s) => s.card.glyphs.rounded.some((g) => g.ch === counterKey(MOUTH_FACES[j].mouth)));
/** Every page of the flight still ahead at `f`, far to near. */
const facePages = (f: number): Sheet[] => pad(f).filter((s) => s.card.glyphs.rounded.some((g) => COUNTERS.has(g.ch)));
const glyphsOf = (s: Sheet): Glyph[] => [...s.card.glyphs.rounded, ...s.ink.glyphs.rounded];
/** A sheet's face: its longest run of glyphs in one ink, left to right (the counters cut through a page are not text). */
function faceRun(s: Sheet): Glyph[] {
  const runs = new Map<string, Glyph[]>();
  for (const g of glyphsOf(s)) if (!COUNTERS.has(g.ch)) runs.set(g.color.join(), [...(runs.get(g.color.join()) ?? []), g]);
  return [...runs.values()].sort((a, b) => b.length - a.length)[0].sort((a, b) => a.x - b.x);
}
const faceOf = (s: Sheet): string => faceRun(s).map((g) => g.ch).join('');
/** The sheet on top: the nearest of the pad, or of the flight, that prints a face. */
const onTop = (f: number): Sheet => pad(f).filter((s) => glyphsOf(s).length > 0).pop()!;
/** A page as it is printed: paper, or paper under a solid layer of ink (full density). */
const solid = (p: Plate | 'paper'): RGB => (p === 'paper' ? PAPER : multiplyRGB(PAPER, linear(RISO[p])));

/** The instants in [a, b), searched in eighths of a frame, at which `value` differs from its value an eighth of a frame before. */
function changes<T>(a: number, b: number, value: (f: number) => T): number[] {
  const out: number[] = [];
  let prev = value(a - 0.125);
  for (let f = a; f < b; f += 0.125) {
    const v = value(f);
    if (v !== prev) out.push(f);
    prev = v;
  }
  return out;
}

/** The share of the 1920 × 1080 frame a (turned) rect covers, sampled on a 64 × 36 grid. */
function covers(r: Shape): number {
  const c = Math.cos(r.rot ?? 0);
  const s = Math.sin(r.rot ?? 0);
  let n = 0;
  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 36; j++) {
      const x = -960 + 30 * (i + 0.5) - r.x;
      const y = -540 + 30 * (j + 0.5) - r.y;
      if (Math.abs(x * c + y * s) <= r.w / 2 && Math.abs(-x * s + y * c) <= r.h / 2) n++;
    }
  }
  return n / (64 * 36);
}

const direction = (p: Pose): number[] => {
  const d = p.target.map((v, i) => v - p.position[i]);
  return d.map((v) => v / Math.hypot(...d));
};

test('pink over blue prints a purple third colour, whichever goes down first', () => {
  const pink = multiplyRGB(PAPER, PLATE.pink);
  const blue = multiplyRGB(PAPER, PLATE.blue);
  const a = multiplyRGB(pink, PLATE.blue);
  const b = multiplyRGB(blue, PLATE.pink);
  assert.ok(a.every((v, i) => Math.abs(v - b[i]) < 1e-12));
  const h = hue(a);
  assert.ok(h > 250 && h < 300, `purple: ${h}`);
  const gap = (x: number, y: number) => Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
  assert.ok(gap(h, hue(pink)) > 40 && gap(h, hue(blue)) > 40, 'a colour of its own');
});

test('S09 is a tear-off flipbook: the sheet on top changes on every tear and at no other instant, through FLIPBOOK in order; its last sheet (LAST_SHEET) is the first open mouth', () => {
  assert.deepEqual(changes(riso(1), riso(2), (f) => faceOf(onTop(f))), [...TEARS]);
  const sheets = FLIPBOOK.flat();
  assert.equal(sheets.length, TEARS.length + 1, 'a sheet on the downbeat and one more on each tear');
  [riso(1), ...TEARS].forEach((f, s) => assert.equal(faceOf(onTop(f + 1)), sheets[s], `sheet ${s} (from ${f})`));
  assert.equal(sheets[sheets.length - 1], MOUTH_FACES[0].face, "the flipbook's last drawing is S10's first mouth");
});

test('S09: on every beat a new face slams down — in at 110%, mostly settled within 3 frames — and on the tears between, the pad barely breathes', () => {
  const width = (f: number) => onTop(f).card.under[0].w;
  for (const s of SLAMS) {
    // The beat's last sheet, 5 frames after its tear, has as good as settled.
    const settled = width(s + 17);
    assert.ok(Math.abs(width(s) / settled - 1.1) < 0.005, `${s}: in at ${(width(s) / settled).toFixed(4)}`);
    assert.ok(width(s + 3) / settled < 1.04, `${s}: settling fast (${(width(s + 3) / settled).toFixed(4)} after 3 frames)`);
  }
  for (const t of TEARS.filter((f) => !SLAMS.includes(f) && f < LAST_SHEET)) {
    const breath = width(t) / width(t + 5);
    assert.ok(breath > 1 && breath < 1.02, `${t}: a breath of ${breath.toFixed(4)}`);
  }
});

test("S09: on every later sixteenth the sheet on top tears off toward its arp note's side (even sixteenths left, odd right) — a launch, three quarters of the frame bare within 3 frames — its torn edge trailing", () => {
  const sheets = FLIPBOOK.flat();
  for (const f of TEARS) {
    const n = (f - riso(1)) / 6; // the sixteenth of riso bar 1; the arp plays its even sixteenths on the left
    const side = n % 2 === 0 ? -1 : 1;
    const page = (t: number) => tornAt(f + t)!.card.under[0];
    assert.equal(faceOf(tornAt(f)!), sheets[n - 1], `${f}: the sheet that was on top tears off`);
    assert.ok(covers(page(0)) > 0.99, `${f}: still whole as it starts to tear`);
    // Flung sideways, not just leaning off the pad (it sits 30 px toward its side before it goes): most of the way out within a frame, hardly up or down.
    assert.ok(side * page(1).x > 500 && Math.abs(page(1).y) < 0.25 * Math.abs(page(1).x), `${f}: off to the ${side < 0 ? 'left' : 'right'} (${page(1).x.toFixed(0)}, ${page(1).y.toFixed(0)} after a frame)`);
    assert.ok(covers(page(1)) < 0.6, `${f}: a launch (${covers(page(1)).toFixed(2)} still covered after a frame)`);
    assert.ok(covers(page(3)) < 0.25, `${f}: three quarters bare after 3 frames (${covers(page(3)).toFixed(2)} covered)`);
    for (let t = 0.5; t < 6; t += 0.5) assert.ok(covers(page(t)) <= covers(page(t - 0.5)), `${f}: never back (${t})`);
    // The ragged edge where it left the pad: diamond teeth all along the side it trails.
    const teeth = tornAt(f)!.card.under.slice(1);
    assert.ok(teeth.length > 10, `${f}: ${teeth.length} teeth`);
    for (const d of teeth) assert.ok(Math.abs((d.rot ?? 0) - Math.PI / 4) < 1e-9 && Math.abs(d.x + 960 * side) < 1e-9, `${f}: a tooth at ${d.x}`);
  }
  assert.equal(tornAt(riso(1) + 3), undefined, 'nothing tears on the downbeat');
});

test('S09 draws four faces, a beat each — the protagonist, the cat, a grin, and a shout whose mouth opens wider sheet by sheet — on solid paper, pink, blue and yellow pages', () => {
  assert.equal(FLIPBOOK.length, SLAMS.length, 'a face a beat');
  assert.ok(FLIPBOOK.every((beat) => beat.length === 4), 'a drawing a sixteenth');
  assert.equal(FLIPBOOK[0][0], faceText(PROTAGONIST));
  assert.equal(FLIPBOOK[1][0], faceText(CAT));
  assert.ok(FLIPBOOK[2].slice(0, 3).every((t) => t.includes('≧▽≦')), 'a grin');
  const open = FLIPBOOK[3].map((t) => ['o', 'O', '〇'].findIndex((m) => t.includes(m)));
  assert.ok(open.every((o, i) => o >= 0 && (i === 0 || o >= open[i - 1])) && open[3] > open[0], `the mouth opens: ${open}`);
  const pages: readonly (Plate | 'paper')[] = ['paper', 'pink', 'blue', 'yellow'];
  [riso(1), ...TEARS].forEach((f, s) => assert.deepEqual(onTop(f + 1).card.under[0].color, solid(pages[s % 4]), `sheet ${s}: a solid ${pages[s % 4]} page`));
});

test('S09: the registration marks turn π/8 on every sixteenth, printed flat over everything until the flight', () => {
  for (let n = 0; n < 16; n++) {
    const f = riso(1) + 6 * n + 1;
    const marks = sheetsAt(f)[sheetsAt(f).length - 1];
    assert.deepEqual(marks.view, FLAT, `${f}: flat on the frame`);
    const turns = marks.ink.over.filter((s) => s.kind === 'segment').map((s) => s.rot ?? 0);
    assert.equal(turns.length, 16, 'two arms, two plates, four corners');
    for (const r of turns) assert.ok([0, 1].some((q) => Math.abs(r - (n * Math.PI) / 8 - (q * Math.PI) / 2) < 1e-9), `${f}: an arm at ${r}`);
  }
  assert.ok(sheetsAt(MOUTHS[0] + 1).every((s) => !s.view), 'no marks in the flight');
});

test('S09 → S10: the last sheet, the first mouth, is printed where and as big as the sheet before it, and the dive into it starts from the flat view', () => {
  const c = risoFrame(LAST_SHEET, L).camera;
  assert.ok(c.position.every((v, i) => Math.abs(v - FLAT.position[i]) < 1e-9) && c.fov === FLAT.fov, 'the flight starts where the flat view is');
  assert.ok(direction(c).every((v, i) => Math.abs(v - direction(FLAT)[i]) < 1e-12) && c.up.every((v, i) => Math.abs(v - FLAT.up[i]) < 1e-12));
  // With equal advances 'ヽ(°O°)ﾉ' (sheet 14) and 'ヽ(°〇°)ﾉ' set the same; the new one jolts with its arp note (≤ 18 px).
  const before = faceRun(onTop(LAST_SHEET - 1));
  const after = faceRun(onTop(LAST_SHEET));
  assert.equal(after.length, before.length);
  const shift = after[0].x - before[0].x;
  assert.ok(Math.abs(shift) <= 20, `jolted ${shift}`);
  after.forEach((g, i) => {
    const b = before[i];
    assert.ok(Math.abs(g.size / b.size - 1) < 0.003 && Math.abs(g.y - b.y) < 1 && Math.abs(g.x - shift - b.x) < 3, `${g.ch}: at ${g.x.toFixed(1)}, ${g.y.toFixed(1)}, ${g.size.toFixed(1)} after ${b.x.toFixed(1)}, ${b.y.toFixed(1)}, ${b.size.toFixed(1)}`);
    assert.ok(Math.abs(g.z ?? 0) < 1e-9, 'hung where the pad lies, so the flat view sees it 1:1');
  });
});

test("S10's five faces are MOUTH_FACES in order, with five mouth shapes; each page is cut through by its own mouth's counter where the mouth is printed, and the ghost plate keeps out of the hole", () => {
  assert.equal(MOUTH_FACES.length, BURSTS.length, 'a face for each burst');
  assert.equal(new Set(MOUTH_FACES.map((m) => m.mouth)).size, MOUTH_FACES.length);
  const seen: string[] = [];
  for (let f = LAST_SHEET; f < HOLE - 1; f += 0.5) {
    const face = faceOf(onTop(f));
    if (seen[seen.length - 1] !== face) seen.push(face);
  }
  assert.deepEqual(seen, MOUTH_FACES.map((m) => m.face), 'one face after another down the flight');
  MOUTH_FACES.forEach(({ face, mouth }, j) => {
    assert.equal([...face].filter((ch) => ch === mouth).length, 1, `${face} has one ${mouth}`);
    const p = facePage(j === 0 ? LAST_SHEET + 1 : LANDINGS[j - 1], j)!;
    assert.equal(faceOf(p), face);
    const holes = p.card.glyphs.rounded.filter((g) => COUNTERS.has(g.ch));
    assert.equal(holes.length, 1);
    const [hole] = holes;
    assert.ok(hole.invert, `${face}: the page is everything but the counter`);
    const m = faceRun(p).find((g) => g.ch === mouth)!;
    assert.ok(Math.abs(hole.x - m.x) < 1e-9 && Math.abs(hole.y - m.y) < 1e-9 && hole.size === m.size && hole.z === m.z, `${face}: the hole is the mouth's own counter`);
    assert.equal(glyphsOf(p).filter((g) => g.ch === mouth).length, 1, `${face}: no second plate over the hole`);
  });
});

test('S10 bursts through a mouth on every kick of riso bar 2 and through the last on riso 3.1 (HOLE): each face is gone within 3 frames of its kick, and only once the camera sees nothing but its hole', () => {
  BURSTS.forEach((kick, j) => {
    const { mouth } = MOUTH_FACES[j];
    let last = -Infinity;
    for (let f = LAST_SHEET; f < kick + 4; f += 0.125) if (facePage(f, j)) last = f;
    assert.ok(last >= kick - 3 && last < kick + 2, `face ${j} is burst through after ${last}; its kick is ${kick}`);
    // The view at the page's depth just after it went, against the window of its hole just before.
    const hole = facePage(last, j)!.card.glyphs.rounded.find((g) => g.ch === counterKey(mouth))!;
    const w = L.mouths[mouth];
    const c = risoFrame(last + 0.125, L).camera.position;
    const d = c[2] - (hole.z ?? 0);
    assert.ok(d > 0, `face ${j}: dropped before the camera reaches it`);
    const dx = Math.abs(c[0] - hole.x - w.x * hole.size) + (960 * d) / FRONT;
    const dy = Math.abs(c[1] - hole.y - w.y * hole.size) + (540 * d) / FRONT;
    assert.ok(dx <= (16 / 9) * w.half * hole.size + 2 && dy <= w.half * hole.size + 2, `face ${j}: the view reaches ±${dx.toFixed(0)} × ±${dy.toFixed(0)} of a ${((16 / 9) * w.half * hole.size).toFixed(0)} × ${(w.half * hole.size).toFixed(0)} window`);
  });
});

test('S10 lands on the next face on each and: FRONT from it, square on it, the face filling the frame', () => {
  LANDINGS.forEach((f, i) => {
    const p = facePage(f, i + 1)!;
    const run = faceRun(p);
    const c = risoFrame(f, L).camera.position;
    const z = run[0].z ?? 0;
    assert.ok(Math.abs(c[2] - z - FRONT) < 0.002 * FRONT, `${f}: ${(c[2] - z).toFixed(1)} from face ${i + 1}`);
    const half = (g: Glyph) => (adv(g.ch) * g.size) / 2;
    const left = run[0].x - half(run[0]) - c[0];
    const right = run[run.length - 1].x + half(run[run.length - 1]) - c[0];
    assert.ok(left < -960 && right > 960, `${f}: the face spans ${left.toFixed(0)} to ${right.toFixed(0)}`);
    assert.ok(Math.abs(left + right) / 2 <= 20, `${f}: square on it but for the arp's jolt (${((left + right) / 2).toFixed(1)})`);
  });
});

test("S10's faces hang GAP apart — far, so through a mouth the next looks a sixth of its size — each off to the side of the one before; the last one's mouth is on the axis S11 flies on", () => {
  assert.ok(GAP >= 5 * FRONT, 'not crowded together');
  const z = MOUTH_FACES.map((_, j) => facePage(j === 0 ? LAST_SHEET + 1 : LANDINGS[j - 1], j)!.card.glyphs.rounded[0].z ?? 0);
  assert.ok(Math.abs(z[0]) < 1e-9, "the first hangs where S09's pad lies");
  z.slice(1).forEach((v, i) => assert.ok(Math.abs(z[i] - v - GAP) < 1e-6, `face ${i + 1} at ${v}`));
  // On every kick the camera is the same short way in front of its face (the face over 5× the size that fills the frame), so the bursts are GAP apart too …
  const near = BURSTS.map((kick, j) => risoFrame(kick, L).camera.position[2] - z[j]);
  near.forEach((d, j) => assert.ok(d > 0 && d < FRONT / 5 && Math.abs(d - near[0]) < 1e-6 * FRONT, `the burst ${j}: ${d.toFixed(2)} in front of its face`));
  // … and between them it crosses sideways, from the mouth it burst through to the next face's centre.
  LANDINGS.forEach((f, i) => {
    const from = risoFrame(BURSTS[i], L).camera.position;
    const to = risoFrame(f, L).camera.position;
    assert.ok(Math.hypot(to[0] - from[0], to[1] - from[1]) > 300, `gap ${i}: ${Math.hypot(to[0] - from[0], to[1] - from[1]).toFixed(0)} px sideways`);
  });
  const c = risoFrame(HOLE, L).camera.position;
  assert.ok(Math.abs(c[0]) < 1e-9 && Math.abs(c[1]) < 1e-9);
});

test('S10 never stops and is fastest just after each kick: a rush peaking within a sixteenth, slowing to a living hold on each and, accelerating into the next kick; the first dive accelerates from S09’s last sheet into riso 2.1', () => {
  const z = (f: number) => risoFrame(f, L).camera.position[2];
  const speed = (f: number) => (z(f - 0.05) - z(f + 0.05)) / 0.1;
  for (let f = LAST_SHEET + 0.25; f < MOUTHS[0]; f += 0.25) assert.ok(speed(f) > speed(f - 0.25), `the first dive accelerates (${f})`);
  for (let f = MOUTHS[0]; f < HOLE - 0.25; f += 0.25) assert.ok(speed(f) >= 0.03 * FRONT, `the flight stops at ${f} (${speed(f).toFixed(1)} a frame)`);
  MOUTHS.forEach((kick, i) => {
    const beat = Array.from({ length: 96 }, (_, k) => kick + k / 4).filter((f) => f < HOLE - 0.25);
    const fastest = beat.reduce((a, b) => (speed(b) > speed(a) ? b : a));
    const slowest = beat.reduce((a, b) => (speed(b) < speed(a) ? b : a));
    assert.ok(fastest > kick && fastest <= kick + 6, `beat ${i}: fastest at ${fastest}`);
    assert.ok(Math.abs(slowest - LANDINGS[i]) <= 0.5, `beat ${i}: slowest at ${slowest}, landing on ${LANDINGS[i]}`);
    assert.ok(speed(fastest) > 5 * speed(LANDINGS[i]), `beat ${i}: a rush, not a drift`);
    for (let f = LANDINGS[i] + 0.25; f < BURSTS[i + 1] - 0.25; f += 0.25) assert.ok(speed(f) > speed(f - 0.25), `accelerating into the kick (${f})`);
  });
});

test("S10's pages are full-bleed: whenever a face's page is the nearest thing ahead, it covers the whole view", () => {
  for (let f = LAST_SHEET; f < HOLE; f += 0.25) {
    const p = facePages(f).pop();
    if (!p) continue;
    const c = risoFrame(f, L).camera.position;
    const d = c[2] - (p.card.under[0].z ?? 0);
    const b = p.card.under;
    const [x0, x1] = [Math.min(...b.map((s) => s.x - s.w / 2)), Math.max(...b.map((s) => s.x + s.w / 2))];
    const [y0, y1] = [Math.min(...b.map((s) => s.y - s.h / 2)), Math.max(...b.map((s) => s.y + s.h / 2))];
    const [w, h] = [(960 * d) / FRONT, (540 * d) / FRONT];
    assert.ok(x0 <= c[0] - w && x1 >= c[0] + w && y0 <= c[1] - h && y1 >= c[1] + h, `${f}: the page spans x ${x0.toFixed(0)}…${x1.toFixed(0)}, y ${y0.toFixed(0)}…${y1.toFixed(0)}; the view ${(c[0] - w).toFixed(0)}…${(c[0] + w).toFixed(0)}, ${(c[1] - h).toFixed(0)}…${(c[1] + h).toFixed(0)}`);
  }
});

test('S11 shows no halftone face before riso 3.1, and the halftone is only ever seen inside its plane: through the last mouth, then in S11', () => {
  // A quarter frame early, so the whole shutter of riso 3.1 sees the cat and no frame before it sees a face.
  for (let f = riso(1); f <= HOLE - 0.75; f += 0.25) assert.ok(risoFrame(f, L).halftone?.faces.every((v) => v === 0) ?? true, `a face at ${f}`);
  assert.deepEqual(risoFrame(HOLE, L).halftone!.faces, [1, 0, 0, 0]);
  assert.equal(HALFTONE_FACES[0], faceText(CAT), 'the cat appears on the downbeat');
  const inside = (x: number, y: number) => Math.abs(x) <= 960 * HALFTONE_EXTENT && Math.abs(y) <= 540 * HALFTONE_EXTENT;
  // S10 draws the halftone under the flight, and it shows through the last mouth: once only that face is ahead, trace a grid of rays past its page
  // (the whole tile round its hole counts as open, so this is a bound on what the hole lets through).
  for (let f = MOUTHS[0]; f < HOLE; f += 0.5) assert.ok(risoFrame(f, L).stack?.halftone, `${f}: the flight is drawn over the halftone`);
  let through = 0;
  for (let f = MOUTHS[MOUTHS.length - 1]; f < HOLE; f += 0.25) {
    const fr = risoFrame(f, L);
    if (facePages(f).length > 1) continue;
    const c = fr.camera.position;
    const pages = facePages(f);
    for (let i = 0; i <= 24; i++) {
      for (let k = 0; k <= 12; k++) {
        const [sx, sy] = [-960 + 80 * i, -540 + 90 * k];
        const at = (z: number): [number, number] => [c[0] + (sx * (c[2] - z)) / FRONT, c[1] + (sy * (c[2] - z)) / FRONT];
        const blocked = pages.some((p) => {
          const [x, y] = at(p.card.under[0].z ?? 0);
          return p.card.under.some((b) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2);
        });
        if (blocked) continue;
        through++;
        const [x, y] = at(fr.halftone!.z);
        assert.ok(inside(x, y), `${f}: the ray through (${sx}, ${sy}) meets the halftone's plane at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      }
    }
  }
  assert.ok(through > 1000, `${through} rays reach the halftone through the last mouth`);
  // S11's own camera.
  for (let f = HOLE; f < riso(4); f += 0.25) {
    const fr = risoFrame(f, L);
    const c = fr.camera;
    const halfH = (c.position[2] - fr.halftone!.z) * Math.tan((c.fov * Math.PI) / 360);
    const halfW = (halfH * 16) / 9;
    // The view's rectangle at the plane's depth, turned by the camera's roll, as an axis-aligned box.
    const roll = Math.atan2(c.up[0], c.up[1]);
    const ex = halfW * Math.abs(Math.cos(roll)) + halfH * Math.abs(Math.sin(roll));
    const ey = halfW * Math.abs(Math.sin(roll)) + halfH * Math.abs(Math.cos(roll));
    assert.ok(inside(Math.abs(c.position[0]) + ex, Math.abs(c.position[1]) + ey), `frame ${f}: the view reaches ±${ex.toFixed(0)} × ±${ey.toFixed(0)}`);
  }
});

test('the camera flows through the last mouth into S11 with no jump on riso 3.1, lands on the halftone from further than FRONT, and is square on it at FRONT a beat later, pushing in', () => {
  const a = risoFrame(HOLE - 1e-3, L).camera;
  const b = risoFrame(HOLE, L).camera;
  assert.ok(Math.hypot(...a.position.map((v, i) => v - b.position[i])) < 0.5 && a.fov === b.fov, 'no jump');
  assert.ok(direction(a).every((v, i) => Math.abs(v - direction(b)[i]) < 1e-9), 'looking the same way');
  assert.ok(b.position[0] === 0 && b.position[1] === 0 && b.fov === FOV && b.position[2] - HALFTONE_Z > FRONT);
  assert.ok(risoFrame(HOLE + 2, L).camera.position[2] < b.position[2], 'still settling in');
  assert.ok(Math.abs(risoFrame(HOLE + 24, L).camera.position[2] - HALFTONE_Z - FRONT / 1.025) < 1e-6, 'square on the halftone a beat later, pushing in 2.5% a beat');
});

test('S11: a new face on every beat, the dots pulse with the sixteenth-note hats, and the plates register on each new face', () => {
  assert.deepEqual([...FACES, riso(4) - 1].map((f) => risoFrame(f, L).halftone!.faces.indexOf(1)), [0, 1, 2, 3, 3]);
  assert.equal(risoFrame(FACES[1] - 0.2, L).halftone!.faces.indexOf(1), 1, 'the swap is a quarter frame early, so the beat frame shows only the new face');
  assert.ok(risoFrame(FACES[1] + RING, L).camera.position[2] < risoFrame(FACES[0] + RING, L).camera.position[2], 'the camera pushes in');
  const s = (f: number) => risoFrame(f, L).halftone!.scale;
  const hat = riso(3, 0.25);
  assert.ok(s(hat) > s(hat - 1) && s(hat) > s(hat + 3), 'a pulse on the hat on riso 3.1e');
  for (let f = riso(3); f < riso(4); f++) assert.ok(s(f) >= 0.8 && s(f) <= 1, `${f}`);
  const shift = (f: number) => risoFrame(f, L).halftone!.shift;
  for (const f of FACES) for (const off of Object.values(shift(f))) assert.deepEqual(off.map(Math.abs), [0, 0], `in register on ${f}`);
  assert.ok(Object.values(shift(FACES[0] + 2)).some(([x, y]) => Math.hypot(x, y) > 0.3), 'a clack as they seat');
  assert.ok(Object.values(shift(FACES[0] + 16)).some(([x, y]) => Math.hypot(x, y) > 0.5), 'drifting apart between');
  for (let f = riso(3); f < riso(4); f += 0.5) for (const [x, y] of Object.values(shift(f))) assert.ok(Math.abs(x) <= 6 && Math.abs(y) <= 6, `${f}`);
});

test('S09 flows into S10 and S10 into S11 as one take, S12 cuts hard; the tears snap on a short shutter, the flight blurs on 48 sub-frames and 64 through the last mouth', () => {
  for (const f of [riso(1) + 32, LAST_SHEET, riso(2, 1.5), riso(3) + 40]) assert.deepEqual(risoSegment(f), { from: riso(1), to: riso(4) }, `${f}`);
  assert.deepEqual(risoSegment(riso(4) + 44), { from: riso(4), to: partEnd('riso') });
  for (let f = riso(1); f < riso(2); f++) {
    const t = risoTemporal(f);
    assert.ok(t.samples >= 48 && t.shutter <= 0.25, `${f}: ${t.samples} on a ${t.shutter} shutter`);
  }
  for (let f = riso(2); f <= riso(3); f++) assert.ok(risoTemporal(f).samples >= 48, `${f}`);
  for (let f = HOLE - 2; f <= HOLE + 2; f++) assert.equal(risoTemporal(f).samples, 64, `${f}`);
});

test('S10’s faces jolt sideways with each arp note: left on the even sixteenths, right on the odd, as the tears fly and the arp pans', () => {
  for (let f = LAST_SHEET; f + 6 < HOLE; f += 6) {
    const n = (f - riso(1)) / 6;
    const x = (t: number) => facePage(f + t, 4)!.card.under[0].x;
    assert.equal(Math.sign(x(0) - x(5.75)), n % 2 === 0 ? -1 : 1, `the jolt on ${f}`);
  }
});

test('on beat 2 the brackets fly off and the mouth launches into the horizon; the sea bounces up band by band and reaches below every view', () => {
  const mouth = (f: number) => risoFrame(f, L).content.glyphs.rounded.find((x) => x.ch === 'ω' && (x.stretch ?? 1) > 20);
  assert.ok(Math.abs(mouth(STRETCH.from + 24)!.y - (HORIZON + 8)) < 1e-6);
  assert.ok(!mouth(STRETCH.from - 0.01), 'nothing moves before the beat');
  const brackets = (f: number) => risoFrame(f, L).content.glyphs.rounded.filter((x) => x.ch === '(' || x.ch === ')');
  assert.equal(brackets(STRETCH.from + 12).length, 0);
  const bands = (f: number) => risoFrame(f, L).content.under.filter((s) => s.kind === 'rect' && s.w === 2600 && s.h > 10);
  assert.equal(bands(SEA.from - 0.01).length, 0);
  const top = Math.max(...bands(SEA.from + 9 + 24).map((s) => s.y + s.h / 2));
  assert.ok(Math.abs(top - HORIZON) < 1, `${top}`);
  for (let f = SEA.from + 9 + 24; f < SUCK.from; f++) {
    const c = risoFrame(f, L).camera;
    const bottom = c.position[1] - (c.position[2] - c.target[2]) * Math.tan((c.fov * Math.PI) / 360);
    const lowest = Math.min(...bands(f).map((s) => s.y - s.h / 2));
    assert.ok(lowest < bottom - 20, `frame ${f}: the sea ends at ${lowest.toFixed(0)}, the view at ${bottom.toFixed(0)}`);
  }
});

test('S12: the sea never opens a stripe of paper between its bands, even while they bounce up', () => {
  const bands = (f: number) => risoFrame(f, L).content.under.filter((s) => s.kind === 'rect' && s.w === 2600 && s.h > 10);
  for (let f = SEA.from + 12; f < SUCK.from; f += 0.5) {
    const b = [...bands(f)].sort((p, q) => q.y + q.h / 2 - (p.y + p.h / 2));
    for (let i = 1; i < b.length; i++) {
      const gap = b[i - 1].y - b[i - 1].h / 2 - (b[i].y + b[i].h / 2);
      assert.ok(gap <= 0, `frame ${f}: a ${gap.toFixed(1)}-unit stripe under band ${i - 1}`);
    }
  }
});

test('the eyes slam into the sun on MERGED, which launches up on beats 3 and 4 through the roll (v04: a ray on each 32nd)', () => {
  const at = (f: number) => risoFrame(f, L, V04_S12).content;
  assert.equal(at(MERGED - 1).glyphs.rounded.filter((x) => x.ch === '•').length, 2);
  assert.equal(at(MERGED).glyphs.rounded.filter((x) => x.ch === '•').length, 0);
  assert.ok(Math.abs((SUN_CIRCLE_PER_EM * BIG.size) / 2 - SUN.core) < 1e-9, 'the eyes morph into circles the size of the core');
  assert.ok(Math.abs(sunCentre(SUNRISE.from + 24)[1] - (HORIZON + 50) / 2) < 1e-6, 'halfway up after beat 3');
  assert.ok(Math.abs(sunCentre(partEnd('riso') - 1)[1]) < 0.5, 'in the middle after beat 4');
  const y = (f: number) => sunCentre(f)[1];
  assert.ok(y(SUNRISE.from + 3) - y(SUNRISE.from) > 0.6 * ((HORIZON + 50) / 2 - (HORIZON + 50)), 'a launch: most of the first rise in 3 frames');
  const rays = (f: number) => at(f).under.filter((s) => s.kind === 'rect' && s.w === 10).length;
  assert.equal(rays(SUNRISE.from - 1), 0);
  assert.equal(rays(SUCK.from - 1), 12);
});

test('on the last eighth everything swells, then is sucked into the sun; the last frame’s whole shutter sees only the sun', () => {
  const bigBand = (f: number) => risoFrame(f, L).content.under.find((s) => s.kind === 'rect' && s.w > 1000);
  assert.ok(bigBand(SUCK.from + 3)!.w > bigBand(SUCK.from)!.w, 'swells first');
  for (const f of [-1.25, -1, -0.75].map((d) => partEnd('riso') + d)) {
    const c = risoFrame(f, L).content;
    assert.equal(c.glyphs.rounded.length, 0, `${f}`);
    assert.equal(c.under.length + c.over.length, 2, `${f}`);
  }
  const [yellow, pink] = risoFrame(partEnd('riso') - 1, L).content.under;
  assert.ok(yellow.color === PLATE.yellow && Math.abs(yellow.w / 2 - SUN.endR) < 1e-6);
  assert.ok(pink.color === PLATE.pink && Math.abs(pink.w / 2 - SUN.endCore) < 1e-6);
  assert.ok(risoTemporal(SUCK.from + 5).samples >= 48);
});

test('S12 lands on the cut, settling from 1.1× (v04; the print lands on S11’s size instead), and its camera pushes in all the time', () => {
  const bracket = (f: number) => risoFrame(f, L, V04_S12).content.glyphs.rounded.find((x) => x.ch === '(')!;
  assert.ok(Math.abs(bracket(riso(4)).size / bracket(riso(4) + 23).size - 1.1) < 2e-3, 'lands big on the cut and settles');
  for (let f = riso(4) + 1; f < SUCK.from; f++) assert.ok(risoFrame(f, L).camera.position[2] < risoFrame(f - 1, L).camera.position[2], `pushing in at ${f}`);
});
