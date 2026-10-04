// E2 MONITOR (src/shots/outroMonitor.ts, the aperture's shapes in src/shots/outroAperture.ts): the flatline and its head, the ω
// heartbeat, the curl into a ring of its own length, the iris-out, the dot, the knocks, the pry (build sheet §3.2, §4, §7 E2).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as C from '../src/content/outro.ts';
import { HERO_OUT } from '../src/content/outro.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import * as O from '../src/score/outro.ts';
import { omega } from '../src/shots/outroAperture.ts';
import * as M from '../src/shots/outroMonitor.ts';
import { DOT_AT_OPEN, MONITOR } from '../src/shots/outroShared.ts';

const range = (a: number, b: number, step = 1): number[] => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('the flatline: the squeezed line full width and white-hot on 2.2, drawing in to 1500 px (before the push) by the beep, floating, cooling; the head sweeps it', () => {
  const s = M.monitorAperture(O.LINE);
  assert.equal(s.mode, 'trace');
  assert.equal(s.half, 960);
  near(s.heat, 2.2, 1e-9, 'white-hot');
  near(M.traceHalf(O.BEEP), 750, 1e-9, 'drawn in');
  assert.ok(M.monitorAperture(O.LINE + 7).lineY !== 540, 'floating');
  near(M.headX(O.LINE), M.HEAD.from, 1e-9, 'head from');
  near(M.headX(O.BEEP - 1e-9), M.HEAD.to, 1e-3, 'head to');
  assert.ok(M.oldTrace(O.BEEP) < 0.6 && M.oldTrace(O.LINE) === 1);
});

test('the heartbeat on 2.3: one pulse shaped like his ω runs in from the trace’s left end and settles at the centre by 2.3&, the head leading it', () => {
  assert.equal(M.monitorAperture(O.BEEP - 1).depth, 0);
  const s = M.monitorAperture(O.BEEP);
  near(s.pulse, 960 + (210 - 960) * s.zoom, 1e-9, 'in at the left end');
  near(M.pulseX(O.PULSE.to), 960, 1e-9, 'at the centre');
  near(M.headX(O.BEEP + 4) - M.pulseX(O.BEEP + 4), M.OMEGA_HALF, 1e-9, 'the head leads');
  assert.equal(omega(0), 0.3, 'the ω’s cusp');
  assert.equal(omega(0.25), 0.3 + 0.7 * Math.sin(Math.PI / 4));
  assert.equal(omega(1), 0);
});

test('the curl keeps the trace’s length and its centroid: an arc of the pushed 1500 px about (960, 540), a ring of r 260 round his face by CURL.to', () => {
  const Lp = 2 * M.traceHalf(O.CURL.from) * M.monitorZoom(O.CURL.from);
  near(Lp, 1500 * M.monitorZoom(O.CURL.from), 1e-6, 'the pushed trace');
  for (const f of range(O.CURL.from, O.CURL.to, 0.5)) {
    const g = M.curlGeometry(f, Lp);
    near(g.cy + (g.R * Math.sin(g.theta)) / g.theta, 540, 1e-6, `centroid on ${f}`);
  }
  const first = M.curlGeometry(O.CURL.from + 0.5, Lp);
  near(2 * first.theta * first.R, Lp, 3, 'the arc is the trace’s length as it starts to bend');
  assert.ok(M.curlAt(O.CURL.from + 3) >= 0.75, '¾ by + 3');
  const ring = M.curlGeometry(O.CURL.to, Lp);
  near(ring.R, MONITOR.ring, 1e-6, 'r 260');
  near(ring.cy, 540, 1e-6, 'about the centre');
  assert.equal(M.monitorAperture(O.CURL.from).inside, 1, 'the window opens with the curl');
});

test('inside the ring his (×ω×) twitches (+ω+) for one 32nd; the iris-out closes it r 251 / 187 / 87 / 14 on + 3 / 6 / 8 / 9; then the dot', () => {
  assert.equal(M.ringFace(O.TWITCH - 1), HERO_OUT.crashed);
  assert.equal(M.ringFace(O.TWITCH), HERO_OUT.twitch);
  assert.equal(M.ringFace(O.TWITCH + 3), HERO_OUT.crashed);
  near(M.closeRadius(O.CLOSE.from + 3), 251, 0.5, '+3');
  near(M.closeRadius(O.CLOSE.from + 6), 187, 0.5, '+6');
  near(M.closeRadius(O.CLOSE.from + 8), 87, 0.5, '+8');
  near(M.closeRadius(O.CLOSE.from + 9), 14, 1e-9, '+9');
  assert.equal(M.monitorAperture(O.CLOSE.to).ring, 0);
  assert.deepEqual(M.dotSize(O.CLOSE.to), { w: 28, h: 28 });
});

test('two knocks from inside, lub then dub: the dot bulges to 45 then 56 and ripples; tok! leaves his fingertips; the pry stretches it to DOT_AT_OPEN on 3.1 − 1', () => {
  const peak = (at: number) => Math.max(...range(at - 1, at + 3, 0.25).map((f) => M.dotSize(f).h));
  near(peak(O.KNOCKS[0]), 45, 0.5, 'tok');
  near(peak(O.KNOCKS[1]), 56, 0.5, 'tok!');
  near(M.dotSize(O.KNOCKS[1] - 1).w, 28, 0.5, 'back by tok!');
  assert.deepEqual(M.ripples(O.KNOCKS[0] + 3).map((r) => r.a > 0), [true, false]);
  assert.ok(M.ripples(O.KNOCKS[1] + 5)[1].r > 140);
  assert.equal(M.notches(O.KNOCKS[1] - 1), 0);
  assert.equal(M.notches(O.KNOCKS[1]), 1);
  assert.deepEqual(M.dotSize(O.OPEN - 1), { w: DOT_AT_OPEN.w, h: DOT_AT_OPEN.h }, 'the hand-off to the pry');
});

test('the ghost (the blue screen the beam stopped refreshing, from Enter) and the last word decay under the line: the ghost gone by the curl, the word by 2.4', () => {
  near(M.ghostAlpha(O.ENTER), 0.35, 1e-9, 'the phosphor holds the last picture from Enter (round the squeeze)');
  near(M.ghostAlpha(O.LINE), 0.35 * Math.exp(-(O.LINE - O.ENTER) / 14), 1e-9, 'one decay across the hand-off');
  assert.equal(M.ghostAlpha(O.CURL.from), 0);
  assert.equal(M.ghostAlpha(O.ENTER - 1), 0, 'no ghost while the beam still draws the whole picture');
  near(M.lastWordLevel(O.LINE), 1, 1e-9, 'the word at full on 2.2');
  assert.equal(M.lastWordLevel(O.LAST_WORD.to), 0);
  assert.ok(M.lastWordLevel(O.BEEP) > 0.25);
  assert.equal(M.lastWordLevel(O.CURL.from + 1), 0, 'gone before the ring forms round it (it sliced through the word on + 1 … + 3)');
  assert.ok(M.lastWordLevel(O.CURL.from - 2) > 0.2, 'still there a 32nd before the curl');
});

test('F2 · his answer (v04’s power-off, kept): from the beep `next wink at frame 5592` prints under the antivirus’s last word in v04’s type — 64 px, its centre 180 px under the line, white with the number amber — holds to the curl, drops clear of the ring and glows on, gone by 3.1 − 3', () => {
  assert.equal(M.PROMISE.line, C.STAGED[2]);
  assert.equal(M.promiseState(O.BEEP - 1), null);
  const z = M.monitorZoom(O.BEEP);
  const at = M.promiseState(O.BEEP)!;
  near(at.y, 540 + 180 * z, 1e-6, 'v04’s place under the line, riding the push');
  near(at.size, 64 * z * 1.1, 1e-6, 'v04’s 64 px, popped');
  assert.ok(at.level > 1.7, 'lit on its frame');
  const held = M.promiseState(O.CURL.from - 1)!;
  assert.ok(held.level > 0.99 && Math.abs(held.y - (540 + 180 * M.monitorZoom(O.CURL.from - 1))) < 1e-6, 'held through the beat');
  for (const f of range(O.CURL.to, O.OPEN - 3, 0.5)) {
    const s = M.promiseState(f)!;
    assert.ok(s.y - 0.4 * s.size > MONITOR.centre[1] + MONITOR.ring + 12, `${f}: clear of the ring (${s.y.toFixed(0)})`);
  }
  assert.ok(M.promiseState(O.KNOCKS[0])!.level > 0.4, 'still glowing under the dot on the first knock');
  assert.equal(M.promiseState(O.OPEN - 3), null, 'gone before the pry');
  const g = M.promiseGlyphs(O.BEEP + 6, () => 0.6);
  assert.equal(g.map((q) => q.ch).join(''), C.STAGED[2].text.replaceAll(' ', ''));
  const amber = g.filter((q) => q.color[0] > 1.2 && q.color[2] < 0.3 * q.color[0]);
  assert.equal(amber.map((q) => q.ch).join(''), String(O.WINK));
});

test('the push, the trace, the curl, the close and the knocks never hold still; fast shapes get 32 sub-frames from the beep', () => {
  const sig = (f: number) => JSON.stringify(M.monitorAperture(f));
  let still = 0;
  for (const f of range(O.LINE + 1, O.OPEN)) {
    still = sig(f) === sig(f - 1) ? still + 1 : 0;
    assert.ok(still <= 12, `${f}`);
  }
  for (const f of range(O.BEEP, O.OPEN)) assert.ok(M.monitorTemporal(f).samples >= 32, `${f}`);
  for (const s of temporalSamples(O.CLOSE.to, M.monitorTemporal(O.CLOSE.to), { from: O.OUTRO_START, to: O.LOOP })) assert.ok(s.frame >= O.CLOSE.to - 1);
});
