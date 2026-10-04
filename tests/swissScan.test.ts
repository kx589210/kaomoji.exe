// S07B, the SCAN bar (swiss 4, new): the iris into the antivirus's X-ray POV, the reticle's 12 hops on the 32nds, the ping on him,
// `0 threats ✓`, the hard cut back to colour on 4.3, red bar 3 through him and the pull anchored on his ω (build sheet §3.9, §4 E9–E11).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILD_THREADS, CLEAN, DEFENDER_POV, IRIS_RING, OMEGA_AT, POV_GRID, reticleX } from '../src/content/build.ts';
import { HIT3, HOPS, IRIS, PING, PULL, PULL_EXIT, PULL_FADE, RETICLE, RETURN, SWEEPS, XRAY_MOVES, ZERO_THREATS } from '../src/score/build.ts';
import { partFrame } from '../src/score/film.ts';
import {
  FRONT,
  GLASS,
  type SwissLayout,
  glassFadeAt,
  glassPose,
  hopsAt,
  irisAt,
  mouthAt,
  povAt,
  readoutAt,
  reticleAt,
  s07Disc,
  scanView,
  swissFrame,
  swissTemporal,
} from '../src/shots/swiss.ts';
import { SWISS_RED } from '../src/worlds/swiss.ts';

const adv = (ch: string) => (ch === ' ' ? 0.28 : '()'.includes(ch) ? 0.36 : 0.62);
const L: SwissLayout = { jp: adv, display: adv, text: adv, mono: () => 0.6 };
const swiss = (bar: number, beat = 0): number => partFrame('swiss', bar, beat);
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const readout = (f: number) => readoutAt(f, L)?.glyphs.mono.map((g) => g.ch).join('') ?? null;
const same = (a: readonly number[], b: readonly number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
/** Where his printed ω (mouthAt) is on screen through the frame's poster camera. */
const omegaOnScreen = (f: number): [number, number] => {
  const c = swissFrame(f, L).camera;
  const zoom = FRONT / c.position[2];
  const [ax, ay] = mouthAt(L);
  return [(ax - c.target[0]) * zoom, (ay - c.target[1]) * zoom];
};
const GLASS_PROJ = FRONT / (FRONT - GLASS.z);

test('the scan bar is swiss 4: the iris on 4.1, the ping on 4.2, the ✓ on 4.2a, the hard cut on 4.3, the pull on 4.4&', () => {
  assert.deepEqual([IRIS, PING, ZERO_THREATS, RETURN, PULL.from, PULL.to], [swiss(4), swiss(4, 1), swiss(4, 1.75), swiss(4, 2), swiss(4, 3.5), swiss(5)]);
  assert.deepEqual([IRIS, PING, ZERO_THREATS, RETURN, PULL.from], [768, 792, 810, 816, 852]);
});

test('E9: the iris opens from the disc’s 767 centre, r 330 → past every corner (launch τ 2: most of it by 770), the whole frame POV by 774', () => {
  const c = s07Disc(IRIS - 1);
  const i0 = irisAt(IRIS)!;
  assert.deepEqual([i0.x, i0.y, i0.r], [c.x, c.y, IRIS_RING.open[0]]);
  assert.equal(c.r, IRIS_RING.breathe[1], 'the disc has breathed to 330 by 767');
  assert.ok(irisAt(IRIS + 2)!.r > IRIS_RING.open[0] + 0.6 * (IRIS_RING.open[1] - IRIS_RING.open[0]), 'most of the way by 770');
  assert.equal(irisAt(IRIS + 6), null, 'past every corner by 774');
  assert.equal(irisAt(IRIS - 1), null);
  for (let f = IRIS; f < IRIS + 6; f += 0.5) assert.ok(irisAt(f) === null || irisAt(f + 0.5) === null || irisAt(f + 0.5)!.r >= irisAt(f)!.r, `opening at ${f}`);
});

test('the reticle forms out of the lens over 771–774 and hops the 12 columns on the 32nds (launch τ 1), each landing before the next takes off', () => {
  assert.deepEqual([...HOPS], range(774, 808, 3));
  assert.deepEqual([RETICLE.from, RETICLE.to], [771, 774]);
  const r0 = reticleAt(RETICLE.from);
  assert.ok(Math.hypot(r0.x - s07Disc(RETICLE.from).x, r0.y - s07Disc(RETICLE.from).y) < 1e-6 && r0.r === IRIS_RING.breathe[0], 'the lens itself');
  assert.deepEqual([reticleAt(HOPS[0]).x, reticleAt(HOPS[0]).y, reticleAt(HOPS[0]).r], [reticleX(0), DEFENDER_POV.reticle.y, DEFENDER_POV.reticle.r]);
  HOPS.forEach((at, k) => {
    if (k === 0) return;
    assert.ok(Math.abs(reticleAt(at).x - reticleX(k - 1)) < 0.06 * POV_GRID.cellW, `still on column ${k} when hop ${k + 1} goes`);
    assert.ok(Math.abs(reticleAt(at + 2).x - reticleX(k)) < 0.15 * POV_GRID.cellW, `most of the way within 2 frames of ${at}`);
  });
  assert.ok(Math.abs(reticleAt(ZERO_THREATS).x - reticleX(11)) < 10, 'on column 12 for the ✓');
  assert.equal(reticleX(HOPS.indexOf(PING)), 80, 'hop 7 lands dead on him (his ω at 60)');
});

test('the joke beat (4.2): the reticle pings dead on him — a second ring r 92 → 160, fading over 8 frames — and nothing locks', () => {
  const rings = (f: number) => swissFrame(f, L).hud?.over.filter((s) => s.kind === 'ring') ?? [];
  assert.equal(rings(PING - 0.01).length, 1);
  const ping = rings(PING + 1).find((s) => (s.alpha ?? 1) < 1)!;
  assert.ok(ping && ping.x === 80 && ping.y === DEFENDER_POV.reticle.y);
  assert.ok(rings(PING + 6).find((s) => (s.alpha ?? 1) < 1)!.w / 2 > 140);
  assert.equal(rings(PING + 8).length, 1);
  assert.ok(readout(PING + 4)!.endsWith('0threats'), 'still 0 threats');
});

test('the readout: `[SCAN] grid NNN/144 · 0 threats` on every frame 771–815, 12 cells more a hop, 144/144 by 807, the ✓ from 810, gone on the cut', () => {
  assert.equal(readout(RETICLE.from - 0.01), null);
  assert.equal(readout(RETURN), null);
  for (const f of range(RETICLE.from, RETURN)) assert.ok(readout(f)!.includes('·0threats'), `· 0 threats at ${f}`);
  assert.ok(readout(RETICLE.from)!.includes('000/144'));
  assert.ok(readout(HOPS[0])!.includes('012/144'));
  assert.ok(readout(HOPS[11])!.includes('144/144') && HOPS[11] === 807);
  assert.equal(hopsAt(HOPS[11] - 0.01), 11);
  assert.ok(!readout(ZERO_THREATS - 1)!.includes('✓'));
  assert.ok(readout(ZERO_THREATS)!.endsWith('✓'));
  const o = readoutAt(ZERO_THREATS, L)!;
  const red = o.glyphs.mono.filter((g) => g.color[0] > g.color[2] * 2);
  assert.equal(red.map((g) => g.ch).join(''), '[SCAN]✓', '[SCAN] and ✓ in DEFENDER red, the rest bone');
  assert.ok(o.glyphs.mono[0].color[0] > 1.5 * readoutAt(RETURN - 1, L)!.glyphs.mono[0].color[0], 'the ✓ flashes ×2');
  assert.ok(readoutAt(RETICLE.from + 1, L, )!.under.length === 1, 'on the readout slot’s ground');
});

test('the stamps: column k’s 12 cells stamp `clean ✓` top → bottom over 2 frames from hop k — every cell but those under the readout — on the plate (behind the glass)', () => {
  const stamps = (f: number) => povAt(f, L)!.stamps.glyphs.mono.filter((g) => g.ch === '✓');
  assert.equal(stamps(HOPS[0] - 0.01).length, 0);
  assert.equal(stamps(HOPS[0]).length, 1);
  assert.equal(stamps(HOPS[0] + 2).length, 11, 'the bottom one of column 1 is under the readout');
  assert.equal(stamps(HOPS[3] + 2).length - stamps(HOPS[2] + 2).length, 12, 'column 4 whole');
  const all = stamps(ZERO_THREATS);
  assert.ok(all.length >= 140 && all.length < 144, `${all.length} stamps`);
  const width = 0.6 * 19 * '[SCAN] grid 144/144 · 0 threats ✓'.length;
  for (const g of all) assert.ok(!(g.x > -930 && g.x < -914 + width + 12 && Math.abs(g.y + 470) < 25), `a stamp under the readout at ${g.x}, ${g.y}`);
  for (const g of stamps(ZERO_THREATS)) assert.ok(same(g.color, SWISS_RED), '✓ red');
  assert.ok(povAt(ZERO_THREATS, L)!.stamps.glyphs.mono.some((g) => CLEAN.startsWith(g.ch)));
  assert.equal(povAt(RETURN, L), null);
});

test('under the X-ray (768–810) his ω is re-aimed from (truck, −330) onto (60, 0), at rest; the glass turns dead-on and drifts there', () => {
  const at = (f: number) => omegaOnScreen(f);
  const [x0, y0] = at(IRIS - 1);
  assert.ok(y0 < -330 && x0 > 60, `from ${x0.toFixed(0)}, ${y0.toFixed(0)}`);
  assert.ok(Math.hypot(at(IRIS)[0] - x0, at(IRIS)[1] - y0) < 0.5, 'no jump on the iris');
  for (const f of range(XRAY_MOVES.to, RETURN)) assert.ok(Math.hypot(at(f)[0] - OMEGA_AT[0], at(f)[1] - OMEGA_AT[1]) < 1e-6, `on (60, 0) at ${f}`);
  assert.equal(scanView(IRIS + 10, L).zoom, scanView(RETURN - 1, L).zoom, 'the poster at rest under the X-ray');
  const g = glassPose(XRAY_MOVES.to, L)!;
  assert.deepEqual([g.rx, g.ry, g.rz], [0, 0, 0], 'dead-on');
  assert.ok(Math.abs(g.x * GLASS_PROJ - OMEGA_AT[0]) < 1e-6 && g.y === 0, 'centred on (60, 0) on screen');
  const d = s07Disc(XRAY_MOVES.to);
  assert.deepEqual([d.x, d.y, d.r], [60, 0, IRIS_RING.open[0]], 'the disc slid behind him');
});

test('E10: the hard cut back on 4.3 is sound-led and 0 px: the camera, his ω, the glass and the disc continue across 815 → 816', () => {
  for (const [a, b] of [[RETURN - 0.25, RETURN], [RETURN - 1, RETURN]]) {
    const [ax, ay] = omegaOnScreen(a);
    const [bx, by] = omegaOnScreen(b);
    assert.ok(Math.hypot(ax - bx, ay - by) < 1e-6, `the ω at ${a} → ${b}`);
    const ga = glassPose(a, L)!;
    const gb = glassPose(b, L)!;
    assert.ok(Math.abs(ga.x - gb.x) * GLASS_PROJ < 1 && Math.abs(ga.scale - gb.scale) < 1e-9 && Math.abs(ga.rz - gb.rz) < 0.002, `the glass at ${a} → ${b}`);
  }
  assert.ok(povAt(RETURN - 0.01, L) !== null && povAt(RETURN, L) === null, 'X-ray → colour on the cut');
  const disc = (f: number) => swissFrame(f, L).overlay.under.find((s) => s.kind === 'ellipse' && same(s.color, SWISS_RED))!;
  assert.ok(Math.hypot(disc(RETURN).x - 60, disc(RETURN).y) < 1e-6, 'the red disc exactly behind him');
});

test('from the cut, the push: 2.5 % a beat about (60, 0), the poster, the glass and the layers together, with a living drift', () => {
  const z = (f: number) => scanView(f, L).zoom;
  assert.ok(Math.abs(z(RETURN + 24) / z(RETURN) - 1.025) < 1e-9);
  assert.ok(Math.abs(glassPose(RETURN + 24, L)!.scale / glassPose(RETURN, L)!.scale - 1.025) < 1e-9);
  for (const f of range(RETURN, PULL.from)) {
    const [x, y] = omegaOnScreen(f);
    assert.ok(Math.hypot(x - 60, y) < 1e-6, `the ω stays on (60, 0) at ${f}`);
  }
  const g = range(ZERO_THREATS + 1, PULL.from).map((f) => glassPose(f, L)!);
  assert.ok(g.some((p) => Math.abs(p.rz) > 0.005) && g.every((p) => Math.abs(p.rz) <= 0.0101), 'rz ±0.01');
});

test('red bar 3 (4.4) sweeps at his height, straight through him, across the whole frame on the clap', () => {
  const bar = swissFrame(SWEEPS[2], L).overlay.over.find((s) => same(s.color, SWISS_RED) && s.h > 80)!;
  assert.ok(Math.abs(bar.y) < 20 && bar.x - bar.w / 2 < -960 && bar.x + bar.w / 2 > 960);
  assert.equal(swissTemporal(SWEEPS[2] + 2).samples, 48);
});

test('E11: the pull (4.4&) is anchored on his ω — within 2 px of (60, 0) through 852–863 — and lands the poster square on 5.1', () => {
  for (const f of range(PULL.from, PULL.to, 0.25)) {
    const [x, y] = omegaOnScreen(f);
    assert.ok(Math.hypot(x - OMEGA_AT[0], y - OMEGA_AT[1]) <= 2, `the ω at ${f}: ${x.toFixed(2)}, ${y.toFixed(2)}`);
  }
  const z = (f: number) => FRONT / swissFrame(f, L).camera.position[2];
  assert.ok(Math.log(z(PULL.from + 3)) / Math.log(z(PULL.from)) < 0.3, '75 % of the log-zoom in 3 frames');
  for (const f of range(PULL.from, PULL.to - 1, 0.5)) assert.ok(z(f + 0.5) <= z(f), `pulling back at ${f}`);
  const end = swissFrame(PULL.to, L).camera;
  assert.ok(Math.abs(end.position[2] - FRONT) < 1e-6 && Math.abs(end.target[0]) < 1e-9 && Math.abs(end.target[1]) < 1e-9, 'square on 5.1');
  for (const f of range(PULL.from - 1, PULL.to + 1)) assert.equal(swissTemporal(f).samples, 64, `64 sub-frames at ${f}`);
});

test('in the pull the big type (v04: "150"; N2: his bytes) whips left and the disc right, gone by 858; the glass shrinks with the poster and dissolves into his card face over 858–860', () => {
  const o = (f: number) => swissFrame(f, L).overlay;
  assert.ok(o(PULL_EXIT.from).glyphs.display.some((g) => g.size > 100));
  assert.equal(o(PULL_EXIT.to).glyphs.display.filter((g) => g.size > 100 && g.x > -1100).length, 0, 'the big type gone');
  assert.equal(o(PULL_EXIT.to).under.filter((s) => s.kind === 'ellipse' && s.x - s.w / 2 < 960).length, 0, 'disc gone');
  assert.deepEqual([glassFadeAt(PULL_FADE.from), glassFadeAt(PULL_FADE.from + 1), glassFadeAt(PULL_FADE.to)], [1, 0.5, 0]);
  assert.equal(glassPose(PULL_FADE.to, L), null);
  const g = glassPose(PULL_FADE.from, L)!;
  const width = GLASS.faceEm * GLASS.em * g.scale * GLASS_PROJ;
  assert.ok(width < 150, `the glass is ${width.toFixed(0)} px wide when it dissolves`);
  assert.ok(Math.abs(g.x * GLASS_PROJ - OMEGA_AT[0]) < 1, 'in his card’s place');
});

test('the POV’s rungs: full X-ray, lite (colour plate with the scanlines, stamps, reticle, readout and iris ring), or the hops as a HUD only', () => {
  const full = povAt(IRIS + 1, L)!;
  assert.equal(full.mode, 'full');
  assert.ok(full.iris !== null);
  const lite = povAt(IRIS + 1, L, { ...BUILD_THREADS, pov: 'lite' })!;
  assert.equal(lite.mode, 'lite');
  assert.ok(lite.iris !== null && povAt(ZERO_THREATS, L, { ...BUILD_THREADS, pov: 'lite' })!.stamps.glyphs.mono.length > 0);
  const hud = povAt(IRIS + 1, L, { ...BUILD_THREADS, pov: false })!;
  assert.equal(hud.mode, 'hud');
  assert.equal(hud.iris, null);
  assert.equal(povAt(ZERO_THREATS, L, { ...BUILD_THREADS, pov: false })!.stamps.glyphs.mono.length, 0);
  assert.ok(swissFrame(PING, L, { ...BUILD_THREADS, pov: false }).hud !== null, 'the reticle still hops');
  // The scanlines crawl 3 px a frame, one offset per output frame.
  assert.equal(povAt(IRIS + 1, L)!.crawl, povAt(IRIS + 1.25, L)!.crawl);
  assert.equal((povAt(IRIS + 2, L)!.crawl - povAt(IRIS + 1, L)!.crawl + 9) % 9, 3);
});

test('the scan bar never holds the picture still: the iris, the re-aim and the hops carry 768–810, the drift 811–815, the push after the cut', () => {
  for (const f of range(IRIS - 1, RETURN + 2)) {
    if (f < XRAY_MOVES.to) assert.ok(swissTemporal(f).samples >= 48, `48 sub-frames at ${f}`);
  }
  const moved = (f: number) => {
    const a = glassPose(f - 1, L)!;
    const b = glassPose(f, L)!;
    const [ax, ay] = omegaOnScreen(f - 1);
    const [bx, by] = omegaOnScreen(f);
    return Math.abs(a.x - b.x) + Math.abs(a.ry - b.ry) + Math.abs(a.rz - b.rz) + Math.abs(a.scale - b.scale) + Math.hypot(ax - bx, ay - by) > 1e-4;
  };
  for (const f of range(HIT3, PULL_FADE.to)) assert.ok(moved(f) || (f >= IRIS && f <= IRIS + 1), `something moves at ${f}`);
});

test('the scanner’s light: each column washes bone as the reticle stamps it and fades within a few frames (on the plate, under its stamps)', () => {
  const wash = (f: number) => povAt(f, L)!.stamps.under.filter((s) => s.w === POV_GRID.cellW && s.h === 1080);
  assert.equal(wash(HOPS[0] - 0.01).length, 0);
  const w0 = wash(HOPS[0])[0];
  assert.ok(w0 && Math.abs(w0.x - reticleX(0)) < 1e-9 && (w0.alpha ?? 1) > 0.1, 'column 1 lights on its hop');
  assert.ok(wash(HOPS[0] + 20).every((s) => Math.abs(s.x - reticleX(0)) > 1), 'and has faded by the time the reticle is far along');
  assert.ok(wash(PING).some((s) => Math.abs(s.x - reticleX(HOPS.indexOf(PING))) < 1e-9), 'his column lights on the ping');
});

test('after the ✓ the glass sways slowly about its own axes (the refraction swims) while it faces us, starting from rest on 810', () => {
  const g = (f: number) => glassPose(f, L)!;
  assert.deepEqual([g(ZERO_THREATS).rx, g(ZERO_THREATS).ry], [0, 0]);
  const rys = range(ZERO_THREATS + 1, PULL.from).map((f) => g(f).ry);
  assert.ok(Math.max(...rys.map(Math.abs)) > 0.03 && Math.max(...rys.map(Math.abs)) <= 0.0601, 'ry within ±0.06');
  assert.ok(Math.abs(g(RETURN).ry) < 0.045, 'near dead-on on the cut (2.6°)');
});
