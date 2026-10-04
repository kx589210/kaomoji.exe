// The ending's aperture (build sheet §5.13, §9 H6): the picture squeezing to a line on Enter, the line shrinking and dipping into his
// ω, and the line pried open into a lens on the first tonic — one pure function of the frame, so the two parts that draw it (OutroLog
// until outro 2.1 − 1, OutroLens from outro 2.1) hand over without a seam.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHASE, DIP, ENTER, LINE, OPEN, OUTRO_END, OUTRO_START, RELEASE, SHRINK, TICKS } from '../src/score/outroV04.ts';
import { SWAP_LEAD } from '../src/engine/temporal.ts';
import { BUTTON, CHASE_SPARK, OMEGA_DEPTH, OMEGA_HALF, buttonDim, lensClock, lidY, omega, screenAt } from '../src/shots/outroScreen.ts';

/** The button's silence (outro 2.3&–2.4 − 1): everything but the rim's chase holds still there (round 2), so the flow pins skip it. */
const held = (f: number) => f >= BUTTON.from && f < BUTTON.to;

const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('until Enter the whole log picture shows, unsqueezed', () => {
  for (let f = OUTRO_START; f < ENTER; f += 7) {
    const s = screenAt(f);
    assert.equal(s.mode, 'picture', `${f}`);
    assert.equal(s.sy, 1, `${f}`);
    assert.equal(s.gain, 1, `${f}`);
  }
});

test('Enter squeezes the picture to a line about y 540 (impact into LINE), brightening toward white-hot', () => {
  let last = 1;
  for (let f = ENTER; f < LINE; f += 0.5) {
    const s = screenAt(f);
    assert.equal(s.mode, 'picture');
    assert.ok(s.sy <= last + 1e-12, `the squeeze only closes (${f})`);
    last = s.sy;
  }
  near(screenAt(LINE - 1e-6).sy, 0.004, 1e-4, 'a 4 px stripe on the line frame');
  assert.ok(screenAt(LINE - 1).gain > 1.5 && screenAt(LINE - 1).edge > 0.5, 'brighter as it closes, its edges burning');
  assert.equal(screenAt(ENTER + 3).white, 0, 'no grey wash while the picture is still tall');
  assert.ok(screenAt(LINE - 0.02).white > 0.8, 'the last thin band burns white');
  // Cubic-in: slow to leave, fastest on arrival (an impact).
  assert.ok(1 - screenAt(ENTER + 2).sy < 0.05 && 1 - screenAt(ENTER + 5).sy > 0.5);
});

test('from LINE a full-width 2 px line holds flat through outro 1.3, dips into his ω (its middle 600 px, 56 px deep) on outro 1.4, and shrinks to 1500 px by outro 2.1', () => {
  const l = screenAt(LINE);
  assert.equal(l.mode, 'lens');
  assert.equal(l.h, 0, 'a line has no height');
  near(l.w, 1920, 1e-9, 'full width on outro 1.3 + 6');
  // Iteration 3 (ruling 13 as meant): the line holds flat to outro 1.4 — 18 frames, every sub-frame of them — then the ω snaps in over a 32nd.
  assert.ok(DIP.from - LINE >= 18);
  for (let f = LINE; f < DIP.from - SWAP_LEAD; f += 0.25) assert.equal(screenAt(f).dipL, 0, `${f}: the flat line`);
  assert.ok(screenAt(DIP.from).dipL > 0, 'the dip starts on outro 1.4');
  near(screenAt(DIP.to).dipL, OMEGA_DEPTH, 1e-9, 'full ω on outro 1.4 + 3');
  for (let f = DIP.to; f < OPEN; f += 0.25) near(screenAt(f).dipL, OMEGA_DEPTH, 1e-9, `${f}: the ω held to outro 2.1`);
  near(screenAt(SHRINK.to - 1e-6).w, 1500, 0.01, '1500 px as it opens');
  // The held line is never dead: its tips draw in from the start of the hold (≥ 1 px a frame each side by LINE + 3).
  assert.ok(screenAt(LINE + 3).w < screenAt(LINE + 2).w - 2, `drawing in (${screenAt(LINE + 2).w.toFixed(1)} → ${screenAt(LINE + 3).w.toFixed(1)})`);
  for (let f = LINE; f < OPEN; f += 0.5) {
    const s = screenAt(f);
    assert.equal(s.dipU, s.dipL, `the line is one curve (${f})`);
    assert.ok(s.w <= 1920 && s.w >= 1500);
    if (f > LINE) assert.ok(s.w < screenAt(f - 0.5).w, `${f}: the tips only draw in`);
  }
});

test('the held line is alive (iteration 3): white-hot on LINE and cooling every frame, flaring as the ω snaps in, then swelling into outro 2.1 with the inhale — never a still, and near the lens rim’s light by outro 2.1', () => {
  const rim = (f: number) => screenAt(f).rim;
  assert.ok(rim(LINE) >= 2, `the impact lands hot (${rim(LINE).toFixed(2)})`);
  for (let f = LINE; f < DIP.from - 1; f++) assert.ok(rim(f + 1) < rim(f) - 0.01, `${f}: cooling (${rim(f).toFixed(3)} → ${rim(f + 1).toFixed(3)})`);
  assert.ok(rim(DIP.from - 1) < 1.6, `cooled to a white line by outro 1.4 (${rim(DIP.from - 1).toFixed(2)})`);
  assert.ok(rim(DIP.from + 1) > rim(DIP.from - 1) + 0.1, `the ω snaps in with a flare (${rim(DIP.from - 1).toFixed(2)} → ${rim(DIP.from + 1).toFixed(2)})`);
  for (let f = DIP.from + 1; f < OPEN - 1; f++) assert.ok(Math.abs(rim(f + 1) - rim(f)) > 0.01, `${f}: still changing (${rim(f).toFixed(3)} → ${rim(f + 1).toFixed(3)})`);
  assert.ok(rim(OPEN - 1) > rim(DIP.to + 9), `building into the pry-open (${rim(DIP.to + 9).toFixed(2)} → ${rim(OPEN - 1).toFixed(2)})`);
  assert.ok(Math.abs(rim(OPEN - 1e-3) - rim(OPEN + 1e-3)) < 0.5, `the hand-off to the lens's rim (${rim(OPEN - 1e-3).toFixed(2)} → ${rim(OPEN + 1e-3).toFixed(2)})`);
});

test('the held line floats (iteration 3): ±4 px about y 540 over 28 frames from LINE, sagging first after the slam, level again on outro 2.1 — fastest where its light changes least, so no frame of the two beats is a still', () => {
  const lift = (f: number) => screenAt(f).lift;
  near(lift(LINE), 0, 1e-9, 'level on the slam');
  assert.ok(lift(LINE + 3) > 0, 'sags first (down is +)');
  const lifts = Array.from({ length: OPEN - LINE }, (_, i) => lift(LINE + i));
  assert.ok(Math.max(...lifts) <= 4 + 1e-9 && Math.min(...lifts) >= -4 - 1e-9 && Math.max(...lifts) > 3.9, '±4 px');
  near(lift(OPEN - 1e-6), 0, 0.01, 'level again as it is pried open (the lens floats from 0)');
  near(lift(OPEN), 0, 1e-9, 'the lens starts level');
  const rim = (f: number) => screenAt(f).rim;
  for (let f = LINE; f < OPEN - 1; f++) {
    const light = Math.abs(rim(f + 1) - rim(f));
    const float = Math.abs(lift(f + 1) - lift(f));
    assert.ok(light > 0.02 || float >= 0.5, `${f}: light ${light.toFixed(3)}, float ${float.toFixed(2)} px`);
  }
});

test('the ω: deepest in its two bowls, a raised cusp in the middle, flat at both ends, symmetric', () => {
  near(omega(-1), 0, 1e-9, 'left end');
  near(omega(1), 0, 1e-9, 'right end');
  near(omega(-0.5), 1, 1e-9, 'left bowl');
  near(omega(0.5), 1, 1e-9, 'right bowl');
  assert.ok(omega(0) > 0.15 && omega(0) < 0.6, `the middle cusp sits part-way up (${omega(0)})`);
  for (let s = -1; s <= 1; s += 0.05) near(omega(s), omega(-s), 1e-9, `symmetric at ${s}`);
  assert.equal(omega(1.3), 0, 'nothing beyond the ends');
  // The slope is continuous everywhere but at the cusp (no kink for the rim's glow to seam on); it flares flat into the line.
  const slope = (s: number) => (omega(s + 1e-5) - omega(s - 1e-5)) / 2e-5;
  for (let s = 0.02; s < 0.99; s += 0.01) assert.ok(Math.abs(slope(s + 0.005) - slope(s)) < 0.2, `smooth at ${s.toFixed(2)}`);
  assert.ok(Math.abs(slope(0.9999)) < 0.01, 'flat where it meets the line');
});

test('outro 2.1 pries the line open into a lens: a launch keyed one frame early — 440 tall with a ≈ 470 overshoot on outro 2.1 + 5, settled by outro 2.1&, 1640 wide', () => {
  const at = (f: number) => screenAt(f);
  assert.ok(at(OPEN).h > 50 && at(OPEN).h < 100, `16.6 % on the beat frame (${at(OPEN).h})`);
  assert.ok(at(OPEN + 2).h > 300, '75 % by outro 2.1 + 3');
  near(at(OPEN + 5).h, 470, 8, 'the overshoot');
  near(at(OPEN + 12).h, 440, 3, 'settled');
  near(at(OPEN + 12).w, 1640, 3, 'width');
  // The ω relaxes into the lower lid by outro 2.1 + 6; the upper lid lets go of it as it opens.
  near(at(OPEN).dipL, OMEGA_DEPTH, 1e-9, 'the lower lid starts as the mouth');
  assert.ok(at(OPEN + 3).dipL < OMEGA_DEPTH && at(OPEN + 3).dipL > 0);
  assert.equal(at(OPEN + 6).dipL, 0, 'an arc by outro 2.1 + 6');
  assert.ok(at(OPEN).dipU < at(OPEN).dipL, 'the upper lid leaves the mouth first');
  assert.equal(at(OPEN + 12).dipU, 0);
});

test('the lens breathes ±12 px once it has settled, and the shot pushes 1.00 → 1.05 over outro bar 2 without stalling (R1-bar36-quiet)', () => {
  const hs = Array.from({ length: 40 }, (_, i) => screenAt(OPEN + 18 + i).h); // (before the button’s click on outro 2.3&)
  const range = Math.max(...hs) - Math.min(...hs);
  assert.ok(range > 21 && range <= 25, `breathing ±12 (${range})`);
  assert.equal(screenAt(OPEN - 1).zoom, 1);
  near(screenAt(OPEN).zoom, 1, 1e-3, 'starts at 1');
  near(screenAt(OUTRO_END - 1).zoom, 1.05, 2e-3, 'ends at 1.05');
  for (let f = OPEN; f < OUTRO_END - 1; f++) if (!held(f + 1)) assert.ok(screenAt(f + 1).zoom > screenAt(f).zoom, `the flow never stops (${f})`);
  // It floats ±8 px over two beats, its turns where the breath is fastest: wherever the breath turns, the whole rim is still moving.
  const lid = (f: number, which: -1 | 1) => 540 + (which * screenAt(f).h * screenAt(f).zoom) / 2 + screenAt(f).lift;
  const lifts = Array.from({ length: 96 }, (_, i) => screenAt(OPEN + 18 + i).lift);
  assert.ok(Math.max(...lifts) - Math.min(...lifts) > 15 && Math.max(...lifts) - Math.min(...lifts) <= 16.5, 'the float');
  near(screenAt(OPEN).lift, 0, 1e-9, 'the lens floats from level (the line’s own float is level again on outro 2.1)');
  for (let f = OPEN + 18; f < OUTRO_END; f++) {
    if (held(f) || f === BUTTON.to) continue; // (outro 2.4 restarts from rest a quarter frame in, and relights the rim: tested below)
    const speed = Math.max(Math.abs(lid(f, -1) - lid(f - 1, -1)), Math.abs(lid(f, 1) - lid(f - 1, 1)));
    assert.ok(speed > 0.6, `${f}: the rim moves ${speed.toFixed(2)} px`);
  }
  // A launch, then a cruise: still travelling on the last frames (the rim's tips ≥ 0.3 px a frame), never an ease-out stall.
  for (let f = OPEN + 24; f < OUTRO_END; f++) if (!held(f) && f !== BUTTON.to) assert.ok((screenAt(f).zoom - screenAt(f - 1).zoom) * 820 > 0.3, `the push moves the tips (${f})`);
});

test('the lids: the upper lid above and the lower lid below the centre, meeting at the tips; the line state is one curve', () => {
  const s = screenAt(OPEN + 40);
  const top = lidY(s, 960, 'upper');
  const bot = lidY(s, 960, 'lower');
  near(bot - top, s.h, 1e-6, 'the lens height at the centre');
  near(lidY(s, 960 - s.w / 2, 'upper'), 540, 1e-6, 'the tips meet on y 540');
  near(lidY(s, 960 + s.w / 2, 'lower'), 540, 1e-6, 'right tip');
  near(lidY(s, 640, 'upper'), 352, 12, 'the lid ≈ 352 at x ± 320 (the arms touch it)');
  const line = screenAt(OPEN - 2);
  for (const x of [300, 600, 960, 1200, 1500]) near(lidY(line, x, 'upper'), lidY(line, x, 'lower'), 1e-9, `one curve at x ${x}`);
  near(lidY(line, 960 - OMEGA_HALF / 2, 'lower'), 540 + OMEGA_DEPTH, 1e-6, 'the bowl of the dip');
  near(lidY(line, 960 - OMEGA_HALF - 10, 'lower'), 540, 1e-6, 'flat outside his mouth');
  assert.ok(OMEGA_HALF * 2 < 700 && OMEGA_DEPTH >= 50, 'a mouth, not a bump');
});

test('the rim’s chase runs once round the lens over outro 2.3& → 2.4&, and nowhere else', () => {
  assert.equal(screenAt(CHASE.from - 1).chase, -1);
  assert.equal(screenAt(CHASE.to).chase, -1);
  near(screenAt(CHASE.from).chase, SWAP_LEAD / (CHASE.to - CHASE.from), 1e-9, 'starts struck: outro 2.3&’s shutter already shows its head');
  const mid = screenAt((CHASE.from + CHASE.to) / 2 - SWAP_LEAD).chase;
  near(mid, 0.5, 1e-9, 'half way round at the middle');
});

test('the aperture is a continuous function across the parts’ hand-off at outro 2.1 except for the launch itself', () => {
  const a = screenAt(OPEN - 1e-3);
  const b = screenAt(OPEN + 1e-3);
  near(a.w, 1500, 0.5, 'the line has shrunk to 1500');
  assert.ok(b.w > a.w && b.w - a.w < 30, 'the width launches with the lens (16.6 % of +140 on the beat frame)');
  near(a.dipL, b.dipL, 0.5, 'the lower lid keeps the ω');
  near(a.zoom, b.zoom, 1e-3, 'no zoom jump');
});

test('R-OUT-BUTTON: the film’s last sound is seen — the rim flares with the last tick on outro 2.4 (up within a frame, gone in ≈ 6) and nowhere else', async () => {
  const { TICKS } = await import('../src/score/outroV04.ts');
  const tick = TICKS[TICKS.length - 1];
  // The rim's base: the slow dim over the last beat. The pulse rides on it.
  const base = (f: number) => 1 - 0.2 * Math.min(1, Math.max(0, (f - tick) / (OUTRO_END - 1 - tick)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (f - tick) / (OUTRO_END - 1 - tick)))));
  const flare = (f: number) => screenAt(f).rim / base(f) - 1;
  assert.ok(flare(tick) >= 0.25, `on the tick’s frame the rim is up (+${(100 * flare(tick)).toFixed(0)} %)`);
  assert.ok(flare(tick - 1) < 0.05, `not before it (+${(100 * flare(tick - 1)).toFixed(1)} %)`);
  for (let f = tick; f < tick + 6; f++) assert.ok(flare(f + 1) < flare(f), `${f}: dying away`);
  assert.ok(flare(tick + 7) < 0.03, `gone by ${tick + 7} (+${(100 * flare(tick + 7)).toFixed(1)} %)`);
  for (let f = OPEN; f < RELEASE - SWAP_LEAD; f += 0.25) near(flare(f), 0, 1e-9, `${f}: no flare before the last tick`);
  for (let f = RELEASE - SWAP_LEAD; f < tick - 1; f += 0.25) assert.ok(flare(f) < 0, `${f}: dimmed for the silence, not flared`);
  for (let f = tick; f < tick + 4; f += 0.125) assert.ok(Math.abs(screenAt(f + 0.125).rim - screenAt(f).rim) < 0.12, `${f}: smooth`);
});

test('OUT-BUTTON-UNSEEN / SYNC2-02: the picture stops with the music on outro 2.3& and starts with the tick on outro 2.4 — click, dim, chase, relight', async () => {
  const { temporalSamples } = await import('../src/engine/temporal.ts');
  const { outroLensTemporal } = await import('../src/shots/outroLens.ts');
  const tick = TICKS[TICKS.length - 1];
  assert.deepEqual([BUTTON.from, BUTTON.to], [RELEASE, tick], 'the stop (RELEASE, the mix chokes) to the last tick');
  const subs = (F: number) => temporalSamples(F, outroLensTemporal(F)).map((s) => s.frame);
  const geometry = (f: number) => {
    const s = screenAt(f);
    return [s.w, s.h, s.dipU, s.dipL, s.zoom, s.lift];
  };
  // The click: every sub-frame of outro 2.3& and 2.3& + 1 shows the lens 6 % shorter; none of outro 2.3& − 1's or outro 2.3& + 2's does.
  const open = screenAt(RELEASE + 2).h;
  for (const F of [RELEASE, RELEASE + 1]) for (const f of subs(F)) near(screenAt(f).h, open * BUTTON.click, 1e-9, `${f}: clicked`);
  for (const F of [RELEASE - 1, RELEASE + 2]) for (const f of subs(F)) assert.ok(screenAt(f).h > open * 0.97, `${f}: open`);
  // Then the lens holds exactly still from outro 2.3& + 2 to 2.4 − 1 — breath, float, push — on every sub-frame (the pin: outro 2.3& + 3 … 2.4 − 1 constant).
  const still = geometry(RELEASE + 2);
  for (let F = RELEASE + 2; F < tick; F++) for (const f of subs(F)) assert.deepEqual(geometry(f), still, `${f}: held`);
  for (let f = RELEASE - SWAP_LEAD; f < tick - SWAP_LEAD; f += 0.125) near(lensClock(f), RELEASE - SWAP_LEAD, 1e-9, `${f}: the lens's clock stopped`);
  // ...and runs on from where it stopped on the tick's shutter: no jump, 12 frames behind.
  near(lensClock(tick + 5), tick + 5 - (BUTTON.to - BUTTON.from), 1e-9, 'runs on');
  for (const f of subs(tick)) assert.ok(lensClock(f) > RELEASE - SWAP_LEAD, `${f}: moving again on the tick`);
  for (let f = tick - 1; f < tick + 1; f += 1 / 32) for (const k of [0, 1, 2, 3, 4, 5]) assert.ok(Math.abs(geometry(f + 1 / 32)[k] - geometry(f)[k]) < 0.5, `${f}: no snap`);
  // The rim: dimmed on every sub-frame of outro 2.3& (≥ 70 % of the way), 40 % by outro 2.3& + 3 and through the silence; relit on outro 2.4 with the flare.
  const rim = (f: number) => screenAt(f).rim;
  for (const f of subs(RELEASE)) assert.ok(buttonDim(f) >= 0.7 && rim(f) <= 0.69, `${f}: rim ${rim(f).toFixed(3)}`);
  for (const f of subs(RELEASE - 1)) near(rim(f), 1, 1e-9, `${f}: full before the stop`);
  near(CHASE_SPARK.gain + (1 - BUTTON.dim), 1.8, 1e-9, 'the spark’s head burns at +80 % of the full rim over the silence');
  assert.ok(rim(RELEASE + 5) < rim(RELEASE - 1), `the pin: rim(outro 2.3& + 5) ${rim(RELEASE + 5).toFixed(3)} < rim(outro 2.3& − 1) ${rim(RELEASE - 1).toFixed(3)}`);
  for (let f = RELEASE + 3; f <= tick - 1; f++) near(rim(f), 1 - BUTTON.dim, 1e-9, `${f}: 40 % through the silence`);
  assert.ok(rim(tick) >= 1.4, `relit with the tick's +45 % (${rim(tick).toFixed(3)})`);
  assert.ok(rim(tick) / rim(tick - 1) >= 2.5, 'off → on: the tick frame is the rim’s jump');
  for (let f = tick + 1; f < OUTRO_END; f++) assert.equal(buttonDim(f), 0, `${f}: full again`);
  // The chase's head enters on outro 2.3& itself (struck), so the frame of the stop already shows it, and it runs through the silence.
  for (const f of subs(RELEASE)) assert.ok(screenAt(f).chase >= 0, `${f}: the head is on`);
  for (const f of subs(RELEASE - 1)) assert.equal(screenAt(f).chase, -1, `${f}: not before`);
  for (let F = RELEASE; F < tick; F++) assert.ok(screenAt(F + 1).chase > screenAt(F).chase, `${F}: the only thing moving`);
  // Where it runs (the compositor's CHASE_SPARK, a share of the rim from the left tip, clockwise): it enters at the top of the lid,
  // right above his face, and passes under the cursor at the bottom's middle on the tick.
  const at = (f: number) => (CHASE_SPARK.start + screenAt(f).chase) % 1;
  near(at(RELEASE), 0.25, 0.015, 'the top of the lid on the stop frame');
  near(at(tick), 0.75, 0.015, 'the bottom of the lid on the tick');
  // The proxy for change(outro 2.3&) ≥ 2.5 × change(outro 2.3& − 1): the stop frame moves the rim's brightness and the lids; the frame before moves
  // the lids by the breath alone (the rendered measure is in the round-2 report).
  const lidMove = (F: number) => Math.abs(screenAt(F).h - screenAt(F - 1).h) / 2 + Math.abs(screenAt(F).lift - screenAt(F - 1).lift);
  assert.ok(lidMove(RELEASE) >= 2.5 * lidMove(RELEASE - 1), `lids: ${lidMove(RELEASE).toFixed(2)} vs ${lidMove(RELEASE - 1).toFixed(2)} px`);
  assert.ok(rim(RELEASE - 1) - rim(RELEASE) >= 0.3, 'and the rim drops by a third on the stop frame');
});
