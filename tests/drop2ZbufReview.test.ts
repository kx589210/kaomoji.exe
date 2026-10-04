// S29's review fixes (the 20-bar sheet notes/bid2/drop2-sheet2.md §1.3 D, §3 drop2 3–4; design notes/extend/drop2-final.md
// §3.1 bars 37–38, §4.3; ZBUF2 in src/score/drop2.ts): the orbit ±25° on its keys, hat-ratcheted; the dolly-zoom to 1250 px (65 % of the
// width) by 3.1&; the ground is the front band's dialect, each change a radial cell wipe from his centre landing on its beat (two light
// beats: Riso pink on 3.2, Brutal cream on 4.2); the donut one beat; the conveyor's four states; Defender's flat 2D scan line on 3.2,
// shearing across his depth; and the colour law (his ω amber on Swiss cells). Kept exactly: bar 4's frame and the blink (4.4 on).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Raster } from '../src/actors/asciiFace.ts';
import { READOUT2 } from '../src/content/drop2.ts';
import { linear } from '../src/engine/color.ts';
import { BLINK2, COLLAPSE, HATS2, POP, SWING, ZBUF2, ZBUF2_GROUNDS, ZBUF2_MARCH, ZBUF2_YAW } from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { LAW, SWISS_OMEGA } from '../src/shots/drop2Shared.ts';
import { FACE } from '../src/shots/intro.ts';
import * as Z from '../src/shots/drop2Zbuf.ts';

const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);

/** The same stand-in raster as tests/drop2Zbuf.test.ts: (•ω•)'s layout on S04's grid. */
function fakeRaster(): Raster {
  const subX = FACE.subX;
  const subY = FACE.subY;
  const w = FACE.cols * subX;
  const h = FACE.rows * subY;
  const annulus = (cx: number, cy: number, ro: number, ri: number, keep: (x: number, y: number) => boolean) => (x: number, y: number) => {
    const r = Math.hypot(x - cx, y - cy);
    return r <= ro && r >= ri && keep(x, y);
  };
  const disc = (cx: number, cy: number, r: number) => (x: number, y: number) => Math.hypot(x - cx, y - cy) <= r;
  const open = annulus(230, 152, 190, 150, (x, y) => Math.abs(Math.atan2(y - 152, x - 230)) > Math.PI - 0.85);
  const close = annulus(474, 152, 190, 150, (x, y) => Math.abs(Math.atan2(y - 152, x - 474)) < 0.85);
  const mouth = (x: number, y: number) => y >= 140 && (annulus(322, 140, 42, 18, () => true)(x, y) || annulus(382, 140, 42, 18, () => true)(x, y));
  const shapes = [open, disc(215, 125, 30), mouth, disc(489, 125, 30), close];
  const parts = shapes.map((inside) => {
    const a = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let c = 0;
        for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) if (inside(x + dx, y + dy)) c += 0.25;
        a[y * w + x] = c;
      }
    }
    return a;
  });
  return { cols: FACE.cols, rows: FACE.rows, subX, subY, parts };
}
const HERO = Z.heroFromRaster(fakeRaster());
const frames = new Map<number, Z.ZFrame>();
const frameAt = (f: number): Z.ZFrame => {
  if (!frames.has(f)) frames.set(f, Z.zbufFrame(f, HERO));
  return frames.get(f)!;
};
const heroCells = (fr: Z.ZFrame) => fr.cells.filter((c) => c.hero);

test('the orbit’s yaw runs from the pop’s as-built 14° through ZBUF2_YAW’s keys (Catmull-Rom): +25° on 3.2, 0° on the swallow, −25° on the re-form, the conveyor’s −15 / +25 / −10, 0° into bar 4', () => {
  // (The first key is the pop's as-built pose, 14°: KEEP-FIRST keeps the dimension pop exactly.)
  assert.equal(Z.yawKeyed(POP), Z.POP_TURN.yaw);
  for (const k of ZBUF2_YAW.filter((x) => x.at > POP)) assert.ok(Math.abs(Z.yawKeyed(k.at) - k.deg) < 1e-9, `${k.at}: ${Z.yawKeyed(k.at)} vs ${k.deg}`);
  for (let f = POP; f < SWING.from; f += 0.5) assert.ok(Math.abs(Z.yawKeyed(f + 0.5) - Z.yawKeyed(f)) < 1.6, `${f}: no faster than the keys need`);
  // The camera's yaw is the keys + the ratchet + the hand-held sway (× 0.6): never past ±30°.
  for (let f = POP; f < SWING.from; f += 1) {
    const y = Z.zbufCamera(f, HERO).yaw;
    assert.ok(Math.abs(y - Z.yawKeyed(f)) <= Z.RATCHET.deg + 2, `${f}: ${y.toFixed(2)} near the keys`);
    assert.ok(Math.abs(y) <= Z.YAW_MAX, `${f}: |yaw| ≤ ${Z.YAW_MAX}`);
  }
});

test('the hat ratchet: each 16th hat kicks the orbit 3° further in its direction of travel (2 f launch, 6 f decay), so the turn steps with the hats', () => {
  const hats = HATS2.filter((h) => h >= POP && h < SWING.from);
  for (const h of hats.slice(1, -1)) {
    const dir = Math.sign(Z.yawKeyed(h + 3) - Z.yawKeyed(h));
    if (dir === 0) continue;
    assert.equal(Z.ratchet(h), Z.ratchet(h) /* defined */);
    const kick = Z.ratchet(h + Z.RATCHET.launch) - Z.ratchet(h);
    assert.ok(dir * kick > 1.5, `${h}: ${kick.toFixed(2)}° in the direction of travel`);
  }
  assert.equal(Z.ratchet(POP - 1), 0);
  assert.equal(Z.ratchet(SWING.to), 0, 'none by bar 4');
  for (let f = POP; f < SWING.from; f += 0.25) assert.ok(Math.abs(Z.ratchet(f)) <= Z.RATCHET.deg + 1e-9 + 0.6, `${f}: at most a step and a tail`);
});

test('the dolly-zoom grows him from 960 px on the pop to 1250 px (65 % of the width) by 3.1&, centred (960, 530); he stays that size through the orbit (pushes 4 % on the claps, the dolly pump on top)', () => {
  assert.ok(Math.abs(Z.zbufCamera(POP, HERO).width - 960) < 1e-6, 'the pop starts at the pre-roll’s 960 px');
  const w = (f: number) => Z.zbufCamera(f, HERO).width;
  assert.ok(Math.abs(w(ZBUF2.sizeBy) / 1250 - 1) < 0.045, `1250 px by 3.1&: ${w(ZBUF2.sizeBy).toFixed(0)}`);
  assert.ok(Math.abs(1250 / 1920 - 0.65) < 0.002);
  for (let f = ZBUF2.sizeBy; f < SWING.from; f += 3) assert.ok(w(f) > 1180 && w(f) < 1400, `${f}: ${w(f).toFixed(0)} px`);
  assert.ok(Math.abs(Z.zbufCamera(ZBUF2.sizeBy, HERO).centre[1] - 530) < 20);
});

test('the pitch: ±4° on a 2-bar sine (plus his bounce), level on bar 4’s frame', () => {
  const p = (f: number) => Z.zbufCamera(f, HERO).pitch - Z.nod(f).pitch;
  assert.ok(Math.abs(p(POP) - Z.POP_TURN.pitch) < 0.6, `tipped 6° on the pop, as built: ${p(POP).toFixed(2)}`);
  assert.ok(Math.abs(p(POP + 24) - 4 * Math.cos((2 * Math.PI * 24) / 192)) < 1e-6, 'then the 2-bar sine');
  assert.ok(Math.abs(p(POP + 96)) < 6 && p(POP + 96) < -2.5, `the other way a bar later: ${p(POP + 96).toFixed(2)}`);
  assert.equal(Z.zbufCamera(BLINK2.close, HERO).pitch, 0);
});

test('the ground is the front band’s dialect: each change a radial cell wipe from his centre, begun 7 f before its beat and landing on it (an impact: the beat carries the biggest change), never white', () => {
  for (const g of ZBUF2_GROUNDS.filter((x) => x.at > POP && x.at < BLINK2.close)) {
    const at = Z.groundAt(g.at);
    assert.deepEqual([at.under, at.radius], [g.ground, 0], `${g.at}: ${g.ground} is the whole ground on its beat`);
    const mid = Z.groundAt(g.at - 3);
    assert.equal(mid.over, g.ground, `${g.at}: wiping in`);
    assert.ok(mid.radius > 100 && mid.radius < 500, `${g.at} − 3: radius ${mid.radius}`);
    assert.ok(Z.groundAt(g.at - Z.GROUND_WIPE.frames).radius === 0 || Z.groundAt(g.at - Z.GROUND_WIPE.frames).over !== g.ground);
    // Visible for ≥ 4 frames, and each frame's step outward bigger than the last: the last (into the beat, to every corner) the biggest.
    const r = (k: number) => (k === 0 ? Z.GROUND_WIPE.reach : Z.groundAt(g.at - k).radius);
    assert.ok(r(4) > 20, 'opened 4 frames before');
    for (let k = 4; k >= 1; k--) assert.ok(r(k - 1) - r(k) > r(k) - r(k + 1), `${g.at} − ${k}: accelerating into the beat`);
  }
  assert.ok(Z.GROUND_WIPE.reach >= Math.hypot(960, 550), 'it reaches every corner by the beat');
  for (const [name, c] of Object.entries(Z.GROUND2)) {
    if (name === 'swiss') continue; // (the collapse's paper, as built: the cut lands on it)
    const l = linear(c);
    assert.ok(0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2] < 0.85, `${c} is never white`);
  }
  // Two light beats: Riso pink on 3.2, Brutal cream on 4.2.
  assert.equal(Z.groundAt(d2at(3, 2) + 6).under, 'riso');
  assert.equal(Z.groundAt(d2at(4, 2) + 6).under, 'brutal');
  assert.deepEqual([Z.GROUND2.riso, Z.GROUND2.brutal], ['#EBC3D6', '#F4E7C1']);
  // From bar 4's frame on, the as-built ground (the terminal's), untouched.
  assert.deepEqual(Z.zbufContent(BLINK2.close, HERO).paper, linear('#0C0F0E'));
});

test('the frame paper is the ground: Riso pink under the 3.2 scan, Brutal cream with #111 hard shadows under him on 4.2', () => {
  const riso = Z.zbufContent(d2at(3, 2) + 3, HERO);
  assert.deepEqual(riso.paper, linear(Z.GROUND2.riso));
  const brutal = Z.zbufContent(d2at(4, 2) + 3, HERO);
  assert.deepEqual(brutal.paper, linear(Z.GROUND2.brutal));
  const ink = linear('#111111');
  const shadows = brutal.base.under.filter((s) => s.kind === 'rect' && s.color.every((v, i) => Math.abs(v - ink[i]) < 1e-9));
  assert.ok(shadows.length > 50, `his hard shadows (${shadows.length})`);
});

test('the donut one beat: donut.c’s ramp from the swallow (3.3); on the 3.4 clap he is whole again, straight into the conveyor (front LED, mid NEON, back BRUTAL)', () => {
  const at = (f: number) => heroCells(frameAt(f));
  const donut = at(ZBUF2.donut.from + 12);
  assert.ok(donut.filter((c) => c.dialect === 'donut').length / donut.length > 0.9, 'donut.c through the beat');
  const back = at(ZBUF2.reform.to);
  const dialects = new Set(back.map((c) => c.dialect));
  assert.ok(!dialects.has('donut'), `the clap: no donut left (${[...dialects]})`);
  for (const d of dialects) assert.ok(['led', 'neon', 'brutal'].includes(d!), `${d} is one of the re-form’s three`);
  // Its two eyes ride the torus as bright nodes.
  const nodes = at(ZBUF2.donut.from + 12).filter((c) => c.node);
  assert.ok(nodes.length >= 2 && nodes.every((c) => c.ch === '@'), `•ω• never leaves: ${nodes.length} @ cells`);
});

test('the conveyor’s four states land on their kicks (ZBUF2_MARCH), each flowing in from the back', () => {
  const want: [number, readonly string[]][] = [
    [ZBUF2_MARCH[0], ['led', 'neon', 'brutal']],
    [ZBUF2_MARCH[1], ['neon', 'led', 'riso']],
    [ZBUF2_MARCH[2], ['brutal', 'neon', 'terminal']],
    [ZBUF2_MARCH[3], ['terminal', 'brutal', 'neon']],
  ];
  for (const [k, [front, mid, back]] of want) {
    assert.deepEqual([Z.dialectAt(k, 0, 0, false), Z.dialectAt(k, 1, 0, false), Z.dialectAt(k, 2, 0, false)], [front, mid, back], `${k}`);
  }
  // The march into 4.2 flows from the back: 3 frames before the kick the back band has turned, the front not yet.
  const k = ZBUF2_MARCH[2];
  assert.equal(Z.dialectAt(k - 3, 2, 0, false), 'terminal');
  assert.equal(Z.dialectAt(k - 3, 0, 0, false), 'neon');
  assert.equal(Z.dialectAt(k - 1, 0, 0, false), 'neon', 'the front changes on the kick itself');
});

test('Defender’s beat (3.2): a flat 2 px red line sweeps the screen top → bottom over the 8th; where it crosses his depth it shears (it is flat, he is not); its tag `scan 2D · z?` rides its right end; it catches nothing', () => {
  assert.equal(Z.scanLine(ZBUF2.scan.from - 1, HERO), null);
  assert.equal(Z.scanLine(ZBUF2.scan.to, HERO), null);
  const ys = [ZBUF2.scan.from, ZBUF2.scan.from + 5, ZBUF2.scan.to - 1].map((f) => Z.scanLine(f, HERO)!.y);
  assert.ok(ys[0] < 40 && ys[2] > 1040 && ys[1] > ys[0] && ys[1] < ys[2], `top → bottom: ${ys}`);
  // Crossing his middle it breaks into steps: segments at different heights over his slabs, the line straight off him.
  const mid = Z.scanLine(ZBUF2.scan.from + 6, HERO)!;
  const heights = new Set(mid.segments.map((s) => Math.round(s.y)));
  assert.ok(heights.size >= 3, `it shears across his depth (${heights.size} heights)`);
  const off = mid.segments.filter((s) => s.x0 <= 0 || s.x1 >= 1920);
  assert.ok(off.length > 0 && off.every((s) => Math.abs(s.y - mid.y) < 1e-9), 'flat where he is not');
  assert.equal(mid.tag, READOUT2.find((l) => l.site === 'scanline')!.text);
  assert.deepEqual(mid.color, LAW.defender.print);
  // Drawn on top of everything (the `top` layer): the line's rects and its tag's characters.
  const top = Z.zbufContent(ZBUF2.scan.from + 6, HERO).top;
  assert.ok(top.under.length >= mid.segments.length && (top.glyphs.mono ?? []).length === [...mid.tag].filter((c) => c.trim() !== '').length);
  assert.equal(Z.zbufContent(ZBUF2.scan.to, HERO).top.under.length, 0);
});

test('item C: on the collapse’s Swiss cells his ω is amber with a #111 keyline (red is Defender’s); the cut lands on an amber ω', () => {
  const c = Z.zbufContent(COLLAPSE.to - 1, HERO);
  const amber = linear(SWISS_OMEGA.fill);
  const red = linear(LAW.defender.print);
  const same = (a: readonly number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  const amberCells = c.base.under.filter((s) => s.kind === 'rect' && same(s.color, amber));
  assert.ok(amberCells.length > 10, `the ω’s cells are amber (${amberCells.length})`);
  assert.equal(c.base.under.filter((s) => s.kind === 'rect' && same(s.color, red)).length, 0, 'no Swiss red on him');
  const keyline = linear(SWISS_OMEGA.keyline.color);
  // The keyline: a #111 rect 2 px larger all round under every ω cell (cells are the backdrop's 12 × 22 in the collapse).
  const keys = c.base.under.filter((s) => s.kind === 'rect' && same(s.color, keyline) && Math.abs(s.w - (12 + 2 * SWISS_OMEGA.keyline.px)) < 1e-6);
  assert.ok(keys.length >= amberCells.length, `each ω cell sits on a 2 px #111 keyline (${keys.length} / ${amberCells.length})`);
});
