// S32B BULLET TIME, drop2 19.4&–20.4& (src/shots/drop2Bullet.ts; sheet §3 drop2 19.4&–20.4&, §4.16, §5 #30–#31): the frozen frame lifted into
// depth and orbited 360° with a shallow focus, a glass crown and the guest revealed by the angle, a music box and two heartbeats, landing in
// 8 plates for the built drain. Pure: a synthetic frozen field stands in for the GPU's, as in tests/drop2OverloadCrash.test.ts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linear } from '../src/engine/color.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { BULLET, CRASH_HOLD, CROWN_TINGS, DEPTH_LIFT, DRAIN, HEARTBEATS, MUSIC_BOX, ORBIT, PLATES, RINGS, crashClock } from '../src/score/drop2.ts';
import { PALETTES, T7_GRID, drop2Segment, t7CellCentre } from '../src/shots/drop2Shared.ts';
import * as B from '../src/shots/drop2Bullet.ts';
import * as K from '../src/shots/drop2Crash.ts';
import * as O from '../src/shots/drop2Overload.ts';
import { hash } from '../src/engine/random.ts';
import { FOV } from '../src/shots/swiss.ts';
import { partFrame } from '../src/score/film.ts';

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const adv = (ch: string) => (ch === ' ' ? 0.3 : '()'.includes(ch) ? 0.45 : 0.7);
const width = (s: string) => [...s].reduce((w, ch) => w + adv(ch), 0);
const L: O.OverloadLayout = {
  advance: { rounded: adv, jp: adv, mono: () => 0.6, display: adv, bold: () => 0.6 },
  ink: new Map(O.INK_STRINGS.map(([font, text]) => [O.inkKey(font, text), { left: 0.06, right: width(text) - 0.06, up: 0.45, down: 0.4 }])),
  ascii: [],
  led: [],
  marquee: { width: 1, lit: [] },
};
// A frozen field like the GPU's (the crash test's): six worlds' colours round him, paler toward him, his (×ω×) a ring of =+* cells.
const worlds = [PALETTES.neon.cyan, PALETTES.terminal.green, PALETTES.swiss.red, PALETTES.riso.pink, PALETTES.interlude.ground, PALETTES.interlude.mint];
const FIELD: O.FieldCell[] = [];
for (let row = O.FIELD.r0; row <= O.FIELD.r1; row++) {
  for (let col = O.FIELD.c0; col <= O.FIELD.c1; col++) {
    const [x, y] = t7CellCentre(col, row);
    const e = Math.hypot((x - 960) / 2.6, y - 540);
    const hero = e < 190 && e > 120;
    const sector = Math.floor(((Math.atan2(y - 540, x - 960) + Math.PI) / (2 * Math.PI)) * 6 + hash(col, row, 7) * 0.2) % 6;
    const warm = Math.exp(-((e / 260) ** 2));
    const ink = hero ? O.HERO_INK : O.fieldInk(linear(worlds[sector]).map((v, k) => v + warm * [1, 0.88, 0.72][k]) as unknown as [number, number, number]);
    FIELD.push({ col, row, i: hero ? 4 + Math.floor(hash(col, row) * 3) : 9, ink, hero, lum: O.luma(ink) });
  }
}
const PLAN = K.sortPlan(FIELD);
const CAP = K.capsuleOf(FIELD);

/** Where the camera's view puts world point p on the 1080p frame (layout px, y down). */
function project(cam: B.BulletCamera, p: readonly [number, number, number]): [number, number] {
  const e = cam.pose.position;
  const v: [number, number, number] = [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
  const f = 540 / Math.tan((cam.pose.fov * Math.PI) / 360);
  const z = v[0] * cam.basis.forward[0] + v[1] * cam.basis.forward[1] + v[2] * cam.basis.forward[2];
  const x = v[0] * cam.basis.right[0] + v[1] * cam.basis.right[1] + v[2] * cam.basis.right[2];
  const y = v[0] * cam.basis.up[0] + v[1] * cam.basis.up[1] + v[2] * cam.basis.up[2];
  return [960 + (f * x) / z, 540 - (f * y) / z];
}

test('the orbit leaves THE FRAME from rest on 19.4&, is the score’s orbit from 20.1& (180° behind him on 20.2 + 9), and lands front-on, at rest, on 20.4&: never faster than 5.6°/f, smooth', () => {
  assert.equal(B.orbitDegrees(BULLET.from), 0);
  assert.equal(B.orbitDegrees(DRAIN.from), 360);
  const theta = (f: number) => (360 * (1 - Math.cos((Math.PI * (f - ORBIT.from)) / (ORBIT.to - ORBIT.from)))) / 2;
  assert.ok(Math.abs(B.orbitDegrees(partFrame('drop2', 20, 1) + 9) - 180) < 0.01, 'behind him on 20.2 + 9');
  for (let f = BULLET.from + B.SWING.ease; f <= DRAIN.from; f += 0.5) assert.ok(Math.abs(B.orbitDegrees(f) - theta(f)) < 1e-9, `${f}: the score's orbit`);
  let prevV = 0;
  for (let f = BULLET.from; f < DRAIN.from; f += 0.25) {
    const v = (B.orbitDegrees(f + 0.25) - B.orbitDegrees(f)) * 4;
    assert.ok(v > 0 || f === BULLET.from, `${f}: always turning`);
    assert.ok(v <= 5.6, `${f}: ${v.toFixed(2)}°/f`);
    assert.ok(Math.abs(v - prevV) < 0.15, `${f}: no jolt (${prevV.toFixed(3)} → ${v.toFixed(3)})`);
    prevV = v;
  }
  assert.ok(B.orbitDegrees(BULLET.from + 1) < 0.1 && 360 - B.orbitDegrees(DRAIN.from - 1) < 0.1, 'from rest, to rest');
});

test('front-on and at rest the bullet camera is the crash shot’s (FOV 20 at FRONT / its held drift), so THE FRAME → bullet time is seamless; it dollies to 34° behind him and rises a little mid-turn', () => {
  const crash = K.crashPose(B.HELD);
  const cam = B.bulletCamera(BULLET.from);
  assert.deepEqual(cam.pose.target, crash.target);
  assert.equal(cam.pose.fov, crash.fov);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(cam.pose.position[i] - crash.position[i]) < 1e-9, `position ${i}: ${cam.pose.position[i]} vs ${crash.position[i]}`);
  assert.equal(B.bulletCamera(DRAIN.from).pose.fov, FOV);
  const mid = B.bulletCamera(partFrame('drop2', 20, 1) + 9);
  assert.ok(Math.abs(mid.fov - B.LENS.wide) < 1e-9);
  assert.ok(mid.pose.position[2] < 0 && mid.pose.position[1] > 0, 'behind him, a little above');
  // The z = 0 plane is framed as the crash pose frames it (the held drift's zoom) whatever the field of view.
  for (const f of [BULLET.from, DRAIN.from]) {
    const [x] = project(B.bulletCamera(f), [400, 0, 0]);
    assert.ok(Math.abs(x - (960 + 400 * B.ZOOM)) < 1e-6, `${x}`);
  }
  const side = B.bulletCamera(BULLET.from + 30);
  assert.ok(Math.abs(project({ ...side, basis: side.basis }, [0, 100, 0])[1] - project(B.bulletCamera(BULLET.from + 30), [0, 100, 0])[1]) < 1e-9);
});

test('front-on nothing changes as the rings lift: every cell pushed back is scaled so the front camera sees it where it was, as big as it was', () => {
  const cam = B.bulletCamera(BULLET.from);
  for (const z of [0, -64, -200, -448, 80]) {
    for (const [x, y] of [[0, 0], [-700, 300], [850, -420]] as const) {
      const p = B.atDepth(x, y, z);
      const [sx, sy] = project(cam, p);
      assert.ok(Math.abs(sx - (960 + x * B.ZOOM)) < 1e-6 && Math.abs(sy - (540 - y * B.ZOOM)) < 1e-6, `(${x}, ${y}) at z ${z}: (${sx}, ${sy})`);
      // A glyph's size scales by the same factor, so its projected size is its size on the frame.
      const size = 22 * B.compensation(z);
      const [ex] = project(cam, [p[0] + size, p[1], p[2]]);
      assert.ok(Math.abs(ex - sx - 22 * B.ZOOM) < 1e-6);
    }
  }
});

test('the depth: each ring band lifts to its own depth over 19.4& → 20.1 (inner first), the pink outer rings deepest; then lands in 8 plates on 20.4, outer first, one a frame', () => {
  for (let k = 0; k < B.PLATE_BANDS; k++) {
    assert.equal(B.bandDepth(BULLET.from - 0.25, k), 0);
    assert.equal(B.bandDepth(DEPTH_LIFT.from, k), 0, 'front-on it barely shows: from nothing');
    assert.ok(Math.abs(B.bandDepth(DEPTH_LIFT.to, k) - 1) < 1e-9, `band ${k} lifted by 20.1`);
    assert.equal(B.bandZ(DEPTH_LIFT.to + 20, k), -k * B.Z_STEP);
    const at = B.plateAt(k);
    assert.equal(at, PLATES.from + B.PLATE_BANDS - 1 - k);
    assert.ok(B.bandDepth(at - 1, k) > 0.2, `band ${k} still up on ${at - 1}`);
    assert.equal(B.bandDepth(at, k), 0, `band ${k} lands on its clack, ${at}`);
    for (let f = at + B.LAND.settle; f < DRAIN.from; f += 0.25) assert.equal(B.bandDepth(f, k), 0);
  }
  assert.equal(B.plateAt(B.PLATE_BANDS - 1), PLATES.from, 'the outermost first, on 20.4');
  assert.equal(B.plateAt(0), PLATES.from + 7);
  assert.ok(B.plateAt(0) + B.LAND.settle <= DRAIN.from - 1, 'flat before the drain');
  // A plate falls faster and faster onto its frame (an impact, not a fade).
  const k = 5;
  const d = range(B.plateAt(k) - B.LAND.fall, B.plateAt(k) + 1).map((f) => B.bandDepth(f, k));
  for (let i = 2; i < d.length - 1; i++) assert.ok(d[i - 1] - d[i] > d[i - 2] - d[i - 1] - 1e-12, 'accelerating');
});

test('THE FRAME’s cells in depth: every cell but his, on its slot, in its ring’s band (inner bright, outer pink), lit by the rings of light; his cells are his card', () => {
  const all = B.heldCells(FIELD, PLAN);
  const cells = all.slice(0, B.frameCellCount(FIELD));
  assert.equal(cells.length, FIELD.filter((c) => !c.hero && c.i > 0).length);
  assert.ok(all.length > 2 * cells.length, 'and the world beyond the frame');
  // The bands follow the rings: further out, deeper.
  const meanD = range(0, B.PLATE_BANDS).map((k) => {
    const ds = cells.filter((c) => c.band === k).map((c) => c.d);
    return ds.reduce((a, b) => a + b, 0) / ds.length;
  });
  for (let k = 1; k < B.PLATE_BANDS; k++) assert.ok(meanD[k] > meanD[k - 1], `band ${k} lies outside band ${k - 1}`);
  // Front-on on 19.4& a cell is THE FRAME's glyph: same place, size and (bar the rings of light that keep leaving him) colour.
  const flat: import('../src/engine/glyphField.ts').Glyph[] = [];
  const n = K.crashGlyphs(B.HELD, FIELD, PLAN, flat);
  const byPlace = new Map(flat.slice(0, n).map((g) => [`${g.x.toFixed(3)},${g.y.toFixed(3)}`, g]));
  const waves = B.pulsesAt(B.HELD);
  for (const c of cells) {
    const g = B.cellGlyph(c, B.HELD, 0, waves, 1);
    const twin = byPlace.get(`${g.x.toFixed(3)},${g.y.toFixed(3)}`);
    assert.ok(twin, `(${g.x}, ${g.y}) is a cell of THE FRAME`);
    assert.equal(g.ch, twin.ch);
    assert.equal(g.size, twin.size);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(g.color[i] - twin.color[i]) < 1e-6, `colour ${i}: ${g.color[i]} vs ${twin.color[i]}`);
  }
  assert.equal(byPlace.size, cells.length, 'one cell for each glyph of THE FRAME');
  // Front-on, at rest, what the camera sees is THE FRAME: every frame cell, and nothing of the world beyond it.
  const seen: import('../src/engine/glyphField.ts').Glyph[] = [];
  const front = B.bulletCamera(BULLET.from);
  const shown = B.fieldGlyphsAt(all, BULLET.from, front, seen);
  const frameKeys = new Set(cells.map((c) => `${c.x},${c.y}`));
  const onFrame = seen.slice(0, shown).filter((g) => frameKeys.has(`${g.x},${g.y}`));
  assert.equal(onFrame.length, cells.length, 'every cell of THE FRAME');
  for (const g of seen.slice(0, shown).filter((q) => !frameKeys.has(`${q.x},${q.y}`))) {
    const [x, y] = project(front, [g.x, g.y, g.z ?? 0]);
    const half = (g.size * B.ZOOM) / 2;
    assert.ok(x + half < 0 || x - half > 1920 || y + half < 0 || y - half > 1080, `beyond the frame, off it: (${x.toFixed(0)}, ${y.toFixed(0)})`);
  }
  // Beyond the frame the rings carry on: a cell beyond takes the colour of the ring at its distance.
  for (const c of all.slice(cells.length, cells.length + 200)) assert.ok(c.d > 0 && c.band >= 0 && c.band < B.PLATE_BANDS && Math.max(...c.ink) > 0);
  // Turned, the world beyond fills the frame: no edge of the frozen field shows at 40°.
  const turned = B.bulletCamera(BULLET.from + 18);
  assert.ok(B.fieldGlyphsAt(all, BULLET.from + 18, turned, seen) > shown, 'more of the world in view as it turns');
});

test('no edge of the frozen world ever shows and nothing walls the lens: the world beyond the frame fades out toward its border, a cell nearing the lens fades out, and front-on nothing changes', () => {
  const all = B.heldCells(FIELD, PLAN);
  const nFrame = B.frameCellCount(FIELD);
  // The frame's own cells are whole; beyond it the light falls off with the distance past the frame's edge, to nothing at the border.
  for (const c of all.slice(0, nFrame)) assert.equal(c.fade, 1);
  const [c0, c1] = T7_GRID.cols;
  const [r0, r1] = T7_GRID.rows;
  const over = (c: B.HeldCell): number => {
    const col = Math.round((c.x + 960 - t7CellCentre(0, 0)[0]) / T7_GRID.cellW);
    const row = Math.round((540 - c.y - t7CellCentre(0, 0)[1]) / T7_GRID.cellH);
    return Math.max(Math.max(c0 - col, col - c1, 0) / B.BEYOND.cols, Math.max(r0 - row, row - r1, 0) / B.BEYOND.rows);
  };
  const beyond = all.slice(nFrame);
  for (const c of beyond) {
    const o = over(c);
    assert.ok(o > 0 && o <= 1 + 1e-9, `beyond the frame: ${o}`);
    assert.ok(Math.abs(c.fade - B.beyondFade(o)) < 1e-12, `fade ${c.fade} at ${o}`);
  }
  assert.equal(B.beyondFade(1), 0, 'nothing at the border');
  assert.equal(B.beyondFade(B.BEYOND.fade[0]), 1, 'whole near the frame');
  for (let o = 0; o < 1; o += 0.01) assert.ok(B.beyondFade(o + 0.01) <= B.beyondFade(o), 'never brighter further out');
  // A cell's light carries its fade.
  const c = beyond.find((q) => q.fade > 0.2 && q.fade < 0.8)!;
  const g = B.cellGlyph(c, BULLET.from + 30, 1, B.pulsesAt(BULLET.from + 30), 1);
  const whole = B.cellGlyph({ ...c, fade: 1 }, BULLET.from + 30, 1, B.pulsesAt(BULLET.from + 30), 1);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(g.color[i] - whole.color[i] * c.fade) < 1e-9);
  // Near the lens a cell fades out (none closer than NEAR.from is drawn), so no cell walls off the side of the frame.
  let nearSeen = 0;
  for (let f = BULLET.from; f < DRAIN.from; f++) {
    const cam = B.bulletCamera(f);
    const out: import('../src/engine/glyphField.ts').Glyph[] = [];
    const n = B.fieldGlyphsAt(all, f, cam, out);
    const e = cam.pose.position;
    const w = cam.basis.forward;
    for (let i = 0; i < n; i++) {
      const q = out[i];
      const zc = (q.x - e[0]) * w[0] + (q.y - e[1]) * w[1] + ((q.z ?? 0) - e[2]) * w[2];
      assert.ok(zc >= B.NEAR.from, `${f}: a cell ${zc.toFixed(0)} from the lens`);
      if (zc < B.NEAR.to) nearSeen++;
    }
    // Front-on (the crash's pose and the hand-back) no cell is near the lens: THE FRAME's light, untouched.
    if (B.orbitDegrees(f) < 20 || B.orbitDegrees(f) > 340) {
      for (let i = 0; i < n; i++) {
        const q = out[i];
        const zc = (q.x - e[0]) * w[0] + (q.y - e[1]) * w[1] + ((q.z ?? 0) - e[2]) * w[2];
        assert.ok(zc >= B.NEAR.to, `${f}: front-on, ${zc.toFixed(0)}`);
      }
    }
  }
  assert.ok(nearSeen > 0, 'side-on some cells are fading at the lens');
  assert.equal(B.nearFade(B.NEAR.to), 1);
  assert.equal(B.nearFade(B.NEAR.from), 0);
});

test('the living hold: rings of light leave him every 6 frames (±8 %, brighter on every sound), and the two the plates land on are the built ones, so on 20.4& they are exactly where the built drain’s are', () => {
  assert.deepEqual(B.pulsesAt(B.HELD).at, [...RINGS]);
  for (let w = BULLET.from; w < DRAIN.from; w += B.PULSE) assert.ok(B.waveGain(w) >= B.PULSE_GAIN.hold && B.waveGain(w) <= K.RING.gain, `${w}`);
  assert.equal(B.waveGain(BULLET.from + 6), B.PULSE_GAIN.hold, 'a living hold: ±8 %');
  assert.ok(B.waveGain(HEARTBEATS[0].at) > 3 * B.PULSE_GAIN.hold && B.waveGain(HEARTBEATS[1].at) < B.waveGain(HEARTBEATS[0].at), 'the lubs');
  assert.equal(B.waveGain(PLATES.from), K.RING.gain);
  for (const d of range(0, 800, 10)) {
    for (const f of [DRAIN.from - 0.75, DRAIN.from - 0.5, DRAIN.from - 0.25]) {
      const p = B.pulsesAt(f);
      const mine = K.ringGainAt(f, d, p.at, p.gain);
      const built = K.ringGain(f, d);
      assert.ok(Math.abs(mine - built) < 1e-6, `${f}, ${d} px: ${mine} vs the drain's ${built}`);
    }
  }
  // …and the glints twinkle in phase with the drain's on its first frame.
  for (const g of K.GLINTS) {
    const f = B.HAND_BACK;
    assert.ok(Math.abs(K.glintAt(B.glintClock(f), f, g, CAP) - K.glintLevel(f, g, CAP)) < 1e-6, `glint (${g.x}, ${g.y})`);
  }
  assert.equal(B.glintClock(B.HELD), B.HELD);
});

test('every sound of the bullet time lights something: the heartbeats swell the rings, the music box’s four notes flare the glints, each crown ting sparks a droplet', () => {
  assert.equal(B.heartbeat(HEARTBEATS[0].at - 1), 1);
  const lub = B.heartbeat(HEARTBEATS[0].at);
  assert.ok(lub >= 1.07 && lub <= 1.09, `the first lub +8 % (${lub})`);
  assert.ok(B.heartbeat(HEARTBEATS[0].dub) > B.heartbeat(HEARTBEATS[0].dub - 1), 'the dub');
  // The rings swell by the mix (the second heartbeat 6 dB down: half); the accents that land it in the picture are SEEN's (the R3 test).
  assert.ok(B.heartbeat(HEARTBEATS[1].at) - B.heartbeat(HEARTBEATS[1].at - 1) < 0.6 * (lub - 1), 'the second heartbeat weaker');
  for (const n of MUSIC_BOX) {
    assert.ok(B.flare(n.at) > 0.99, `the music box on ${n.at}`);
    assert.ok(B.flare(n.at - 1) < B.flare(n.at) - 0.5, 'a flare, on its frame');
    const lit = K.GLINTS.filter((g) => B.glintLevelAt(n.at, g, CAP) > 0.85).length;
    assert.ok(lit >= 4, `${n.at}: the glints flare (${lit})`);
  }
  assert.equal(B.flare(MUSIC_BOX[0].at - 1), 0);
  for (const at of CROWN_TINGS) {
    assert.ok(B.revealAlpha(B.orbitAngle(at)) > 0.99, `${at}: the crown is in view`);
    const s = B.crownSparkles(at, 1);
    assert.ok(s.length >= 3, `${at}: a droplet sparks`);
  }
  assert.equal(B.crownSpikes().length, 12);
  assert.ok(B.crownGlow(CROWN_TINGS[3], 1).length > 12, 'the drink\u2019s light inside the glass');
  assert.equal(new Set(CROWN_TINGS.map((at) => B.crownSparkles(at, 1).at(-1)!.x)).size, 12, 'in turn round the crown');
});

test('his heart still beats: on every lub and dub his frozen (×ω×) throbs — bigger and brighter, whole on its frame, the dub smaller, the second heartbeat a little weaker — still before the first lub and long settled before the plates', () => {
  const front = B.basisOf([0, 0, 1000], [0, 0, 0]);
  // His size across his own card (it turns with the orbit: cardTurn).
  const size = (f: number) => {
    const r = B.turnedBasis(front, B.cardTurn(f)).right;
    const g = B.heroCard(FIELD, L, front, f).glyphs.bold!;
    const xs = g.map((q) => q.x * r[0] + q.y * r[1] + (q.z ?? 0) * r[2]);
    return Math.max(...xs) - Math.min(...xs);
  };
  const light = (f: number) => B.heroCard(FIELD, L, B.basisOf([0, 0, 1000], [0, 0, 0]), f).glyphs.bold![0].color[0];
  const rest = size(B.HELD);
  assert.equal(B.throbAt(HEARTBEATS[0].at - 1), 0);
  assert.equal(size(HEARTBEATS[0].at - 1), rest, 'still before the first lub');
  for (const [i, h] of HEARTBEATS.entries()) {
    const k = B.SEEN[i];
    for (const [at, w] of [[h.at, 1], [h.dub, 0.6]] as const) {
      // Whole on its frame: every sub-frame of the beat's own frame sees it (none of the frame before does more than the tail).
      assert.ok(Math.abs(B.throbAt(at - 0.4) - B.throbAt(at)) < 1e-9, `${at}: whole on its frame`);
      assert.ok(B.throbAt(at) >= k * w - 0.02, `${at}: the throb ${B.throbAt(at)}`);
      assert.ok(B.throbAt(at) > B.throbAt(at - 1) + 0.25 * k * w, `${at}: a thump, on its frame`);
    }
  }
  assert.ok(size(HEARTBEATS[0].at) / rest > 1.03 && size(HEARTBEATS[0].at) / rest < 1.05, 'the first lub: about 4 % bigger');
  assert.ok(light(HEARTBEATS[0].at) / light(B.HELD) > 1.3, 'and brighter');
  const [first, second] = HEARTBEATS.map((h) => size(h.at) / rest - 1);
  assert.ok(second < first && second > 0.8 * first, `the second heartbeat a little weaker, but landing (${second.toFixed(4)} against ${first.toFixed(4)})`);
  for (let f = HEARTBEATS[1].dub + B.THROB.span; f < DRAIN.from; f++) assert.equal(B.throbAt(f), 0, `${f}: settled`);
  assert.ok(HEARTBEATS[1].dub + B.THROB.span <= PLATES.from, 'settled before the plates land');
});

test('the crown and the guest are revealed by the angle alone: invisible front-on (THE FRAME and the drain untouched), gone again by 20.4', () => {
  for (const f of [BULLET.from, BULLET.from + 4, DRAIN.from - 6, DRAIN.from - 1]) assert.equal(B.revealAlpha(B.orbitAngle(f)), 0, `${f}`);
  for (let f = CROWN_TINGS[0]; f <= CROWN_TINGS.at(-1)!; f++) assert.equal(B.revealAlpha(B.orbitAngle(f)), 1, `${f}`);
  assert.ok(B.revealAlpha(B.orbitAngle(PLATES.from)) < 0.5, 'fading into the field as the plates land');
  assert.equal(B.revealAlpha(B.orbitAngle(PLATES.from + 3)), 0, 'gone by 352°');
  // His card faces the camera: front-on it is his flat face, exactly.
  const front = B.basisOf([0, 0, 1000], [0, 0, 0]);
  const flat = K.crashHero(B.HELD, FIELD, L);
  const card = B.heroCard(FIELD, L, front);
  card.glyphs.bold!.forEach((g, i) => assert.ok(Math.abs(g.x - flat.bold[i].x) < 1e-9 && Math.abs(g.y - flat.bold[i].y) < 1e-9 && (g.z ?? 0) === 0));
  // From behind, his card still reads left to right (it turns with the camera; nothing mirrors).
  const back = B.basisOf([0, 0, -1000], [0, 0, 0]);
  const xs = B.heroCard(FIELD, L, back).glyphs.rounded!.map((g) => g.x * back.right[0] + (g.z ?? 0) * back.right[2]);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], 'his (×ω×) in order on screen');
});

test('photography: 64 sub-frames on a 90° shutter (the lens’s samples, short streaks), the depth of field open only while the rings are lifted, drop 2’s one segment, and the last half frame handed to the built drain', () => {
  for (let f = BULLET.from; f < DRAIN.from; f++) {
    assert.deepEqual(B.bulletTemporal(f), { samples: 64, shutter: 0.25, persistence: 0 });
    assert.deepEqual(B.bulletSegment(f), drop2Segment(f));
  }
  assert.equal(B.apertureAt(DEPTH_LIFT.from), 0);
  assert.equal(B.apertureAt(DEPTH_LIFT.to), B.LENS.aperture);
  assert.equal(B.apertureAt(DRAIN.from - 1), 0, 'closed by 20.4& − 1');
  // The lens points of one frame's sub-frames cover the disc, each once.
  const pts = temporalSamples(1850, B.bulletTemporal(1850)).map((s) => B.lensPoint(s.frame));
  assert.equal(new Set(pts.map((p) => p.join())).size, 64);
  assert.ok(pts.every((p) => Math.hypot(...p) <= 1));
  assert.ok(B.handsBack(DRAIN.from - 0.5) && !B.handsBack(DRAIN.from - 0.75));
  // The content clock is THE FRAME's, held: the crash shot's own functions stand still.
  assert.equal(crashClock(BULLET.from + 40.25), CRASH_HOLD.from - 1 + 0.25);
  assert.deepEqual(B.bulletLook(BULLET.from).crt, K.crashLook(B.HELD).crt);
});

test('the camera never stands still in the bullet time, and a fast frame always has 64 sub-frames', () => {
  for (let f = BULLET.from + 1; f < DRAIN.from; f++) {
    const a = B.bulletCamera(f - 1).pose.position;
    const b = B.bulletCamera(f).pose.position;
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 1e-6, `${f}: moving`);
  }
});

// ——— R3 (round 1, 2026-10-02): the magenta slab, the billboard face, the heartbeats that did not read ———————————————————————————————

/** A drawn thing on the 1080p frame: its centre's x, its footprint across (glyph and blur, px) and its blur. */
function onFrame(cam: B.BulletCamera, g: { x: number; y: number; z?: number; size: number }): { sx: number; width: number; blur: number } {
  const e = cam.pose.position;
  const v = [g.x - e[0], g.y - e[1], (g.z ?? 0) - e[2]];
  const depth = v[0] * cam.basis.forward[0] + v[1] * cam.basis.forward[1] + v[2] * cam.basis.forward[2];
  const fpx = 540 / Math.tan((cam.pose.fov * Math.PI) / 360);
  const sx = 960 + (fpx * (v[0] * cam.basis.right[0] + v[1] * cam.basis.right[1] + v[2] * cam.basis.right[2])) / depth;
  const blur = B.blurPx(cam, depth);
  return { sx, width: (fpx * g.size) / depth + blur, blur };
}

test('no magenta slab (R3): the lens never blows a cell up — none is drawn blurred past BOKEH (the pink outer bands sooner), a pink cell at the frame’s edge is never over 150 px across (the slab’s were 550), behind the focus and front-on nothing is touched', () => {
  const all = B.heldCells(FIELD, PLAN);
  const outer = all.filter((c) => c.band >= B.PLATE_BANDS - 2);
  assert.ok(outer.length > 1000);
  let fading = 0;
  const out: import('../src/engine/glyphField.ts').Glyph[] = [];
  for (let f = BULLET.from; f < DRAIN.from; f += 0.5) {
    const cam = B.bulletCamera(f);
    const n = B.fieldGlyphsAt(all, f, cam, out);
    for (let i = 0; i < n; i++) {
      const q = onFrame(cam, out[i]);
      assert.ok(q.blur < B.BOKEH.inner.to, `${f}: a cell blurred ${q.blur.toFixed(0)} px`);
    }
    const m = B.fieldGlyphsAt(outer, f, cam, out);
    for (let i = 0; i < m; i++) {
      const q = onFrame(cam, out[i]);
      assert.ok(q.blur < B.BOKEH.outer.to, `${f}: a pink cell blurred ${q.blur.toFixed(0)} px`);
      if (q.blur > B.BOKEH.outer.from) fading++;
      if (q.sx - q.width / 2 < 120 || q.sx + q.width / 2 > 1800) assert.ok(q.width <= 150, `${f}: a pink cell ${q.width.toFixed(0)} px across at the frame's edge (x ${q.sx.toFixed(0)})`);
    }
  }
  assert.ok(fading > 0, 'side-on the near half of the pink bands is dissolving');
  // Behind the focus the frozen world (within 2600 of him) is never blurred enough to fade; front-on the aperture is shut.
  for (let f = BULLET.from; f < DRAIN.from; f++) {
    const cam = B.bulletCamera(f);
    assert.ok(B.blurPx(cam, cam.focus + 2600) < B.BOKEH.outer.from, `${f}: ${B.blurPx(cam, cam.focus + 2600).toFixed(1)} px behind him`);
  }
  for (const f of [BULLET.from, DRAIN.from - 1]) {
    assert.equal(B.bulletCamera(f).aperture, 0);
    assert.equal(B.blurPx(B.bulletCamera(f), 300), 0);
  }
  assert.equal(B.bokehFade(0, 0), 1);
  assert.equal(B.bokehFade(B.BOKEH.inner.from, 0), 1);
  assert.equal(B.bokehFade(B.BOKEH.inner.to, 0), 0);
  assert.equal(B.bokehFade(B.BOKEH.outer.from, B.PLATE_BANDS - 1), 1);
  assert.equal(B.bokehFade(B.BOKEH.outer.to, B.PLATE_BANDS - 2), 0);
});

test('his card is a thing in the world, not a sticker (R3): it lags the orbit — up to 35°, about 0.44 θ at first — foreshortened with one side nearer the lens, never mirrored, back to frontal by 20.4; front-on it is THE FRAME’s flat face', () => {
  const DEG = Math.PI / 180;
  assert.equal(B.cardTurn(BULLET.from), 0);
  for (let f = PLATES.from; f <= DRAIN.from; f += 0.25) assert.equal(B.cardTurn(f), 0, `${f}: frontal from 20.4`);
  let prev = 0;
  let most = 0;
  for (let f = BULLET.from; f < DRAIN.from; f += 0.25) {
    const phi = B.cardTurn(f) / DEG;
    assert.ok(phi >= 0 && phi <= 35 + 1e-9, `${f}: ${phi.toFixed(2)}°`);
    assert.ok(Math.abs(phi - prev) < 0.6, `${f}: no snap (${prev.toFixed(2)}° → ${phi.toFixed(2)}°)`);
    prev = phi;
    most = Math.max(most, phi);
  }
  assert.ok(most > 34, 'it reaches 35°');
  // Side-on (θ 90° and 270°) he is seen well turned.
  const at = (deg: number): number => {
    let f = BULLET.from;
    while (B.orbitDegrees(f) < deg) f += 0.25;
    return f;
  };
  for (const deg of [90, 270]) assert.ok(B.cardTurn(at(deg)) / DEG > 25, `${deg}°: ${(B.cardTurn(at(deg)) / DEG).toFixed(1)}°`);
  // On screen his card is foreshortened (its glyphs narrowed by cos φ) and reads left to right from every angle.
  for (let f = BULLET.from + 1; f < DRAIN.from; f += 3) {
    const cam = B.bulletCamera(f);
    const rounded = B.heroCard(FIELD, L, cam.basis, f).glyphs.rounded!;
    const xs = rounded.map((g) => project(cam, [g.x, g.y, g.z ?? 0])[0]);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `${f}: his (×ω×) in order on screen`);
    const phi = B.cardTurn(f);
    for (const g of rounded) assert.ok(Math.abs((g.stretch ?? 1) - Math.cos(phi)) < 1e-12, `${f}: foreshortened`);
  }
  // Side-on one side of him is nearer the lens (so it is drawn bigger): an object, not a sticker.
  const side = at(90);
  const cam = B.bulletCamera(side);
  const depth = B.heroCard(FIELD, L, cam.basis, side).glyphs.bold!.map((g) => B.viewDepth(cam, [g.x, g.y, g.z ?? 0]));
  assert.ok(Math.max(...depth) - Math.min(...depth) > 400, `one side of him nearer the lens (${(Math.max(...depth) - Math.min(...depth)).toFixed(0)})`);
  // Front-on (THE FRAME → bullet time) his card is THE FRAME's face, exactly: no turn, no stretch, no glow.
  const flat = K.crashHero(B.HELD, FIELD, L);
  const front = B.heroCard(FIELD, L, B.bulletCamera(BULLET.from).basis, BULLET.from);
  front.glyphs.bold!.forEach((g, i) => assert.ok(Math.abs(g.x - flat.bold[i].x) < 1e-9 && Math.abs(g.y - flat.bold[i].y) < 1e-9 && g.stretch === undefined));
  assert.equal(front.under.length, flat.under.length);
  front.under.forEach((s, i) => assert.ok(s.w === flat.under[i].w && s.h === flat.under[i].h && s.color.every((v, c) => v === flat.under[i].color[c]), `under ${i}`));
});

test('the heartbeats land in the picture (R3): on each lub and dub the lens punches in, his halo and the crown’s light swell for two frames, a glow blooms round him and the sky of type flares — whole on the beat’s frame, gone within 12 frames, none on a front-on frame', () => {
  const zoomAt = (f: number) => Math.tan((B.fovAt(f) * Math.PI) / 360) / Math.tan((B.bulletCamera(f).fov * Math.PI) / 360);
  for (const [i, h] of HEARTBEATS.entries()) {
    for (const [at, w] of [[h.at, 1], [h.dub, 0.6]] as const) {
      const k = B.SEEN[i] * w;
      assert.ok(Math.abs(zoomAt(at) - (1 + B.THUMP.zoom * k)) < 1e-9, `${at}: the lens punches in ${(100 * (zoomAt(at) - 1)).toFixed(2)} %`);
      assert.ok(zoomAt(at) - zoomAt(at - 1) > 0.5 * B.THUMP.zoom * k, `${at}: on its frame`);
      assert.ok(Math.abs(B.beatLight(at) - B.SEEN[i] * (w === 1 ? 1 : B.BEAT_LIGHT.dub)) < 1e-12, `${at}: the light`);
      assert.ok(B.beatLight(at + 1) > 0, `${at}: for two frames`);
      assert.ok(B.glowPulse(at) > B.glowPulse(at - 1) + 0.3 * k, `${at}: the glow, on its frame`);
      assert.equal(B.heartGlow(at).length, 1, `${at}: his heart's glow`);
      assert.ok(B.bulletLook(at).bloom.intensity > B.bulletLook(at - 1).bloom.intensity, `${at}: the bloom swells`);
    }
    assert.equal(B.beatLight(h.at + 2), 0, 'the light is gone before the dub');
    assert.equal(B.heartGlow(h.at - 1).length, 0, 'nothing just before a lub');
    assert.ok(B.crownGlow(h.at, 1)[0].color[0] > B.crownGlow(h.at - 1, 1)[0].color[0], `${h.at}: the drink's light swells`);
  }
  // Both heartbeats land: the second a little weaker (SEEN), not half.
  assert.ok(B.SEEN[1] < B.SEEN[0] && B.SEEN[1] >= 0.8);
  // Nothing before the first lub; settled before the plates land; front-on the lens's own field of view and THE FRAME's look.
  const last = HEARTBEATS.at(-1)!.dub;
  for (let f = BULLET.from; f < DRAIN.from; f += 0.25) {
    if (f >= HEARTBEATS[0].at - 0.5 && f < last + B.THUMP.span) continue;
    assert.equal(B.thumpAt(f), 0, `${f}`);
    assert.equal(B.glowPulse(f), 0, `${f}`);
    assert.equal(B.beatLight(f), 0, `${f}`);
    assert.equal(B.bulletCamera(f).fov, B.fovAt(f), `${f}`);
    assert.equal(B.heartGlow(f).length, 0, `${f}`);
  }
  assert.ok(last + B.THUMP.span <= PLATES.from, 'settled before the plates');
  assert.deepEqual(B.bulletLook(BULLET.from), K.crashLook(B.HELD));
});
