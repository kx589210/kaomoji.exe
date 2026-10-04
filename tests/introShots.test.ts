import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FaceCell } from '../src/actors/asciiFace.ts';
import { RAMP } from '../src/actors/asciiFace.ts';
import { CURSOR, DECODE, INTRO_THREADS, type IntroThreads, LOG_LINES, LOOK_BAND, PROMPT, TUBE } from '../src/content/boot.ts';
import { hash } from '../src/engine/random.ts';
import { type Pose, visibleHeight } from '../src/engine/camera.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples, windowOf } from '../src/engine/temporal.ts';
import { aimMoves, within } from '../src/motion/hit.ts';
import { CIRCLE_PER_EM, DOME_SHAPE, FACE, FOV, FRONT_DISTANCE, HIGHWAY_CURVATURE, INTRO_CAPACITY, INTRO_GLYPHS, LOG_RED, PROMPT_ROW, S01_MOVES, S01_MOVES_TITLE_SAFE, S04_MOVES, TITLE_SAFE_X, bandMix, buildIntroLayout, domeAt, domeLift, hazeGain, hazePulse, introCamera, introGlyphs, introLook, introSegment, introTemporal, lineInk, redBandAt, screenPower, scrollAt } from '../src/shots/intro.ts';
import { partEnd, partFrame, partStart, seedFrame } from '../src/score/film.ts';
import { CRANE, CURSOR_BLINKS, DOME_FALL, ENTER_FRAME, FLING, HIGHWAY_START, LAUNCH, LOCK, LOG_START, PRINT_HEAD, PROGRESS_STEPS, PUSH, RAIN, RED_BAND, SLAM, TICKER_FRAMES, TUBE_FADE, WHIP, WHITE_BAND_OFF, logClock, logFrames, typeFrames } from '../src/score/intro.ts';
import { SWISS_RED } from '../src/worlds/swiss.ts';
import { INK, TERM, TERMINAL_CURVATURE, cellCenter } from '../src/worlds/terminal.ts';

const CUT_S02 = HIGHWAY_START;
/** Runs `body` with some INTRO_THREADS flags switched (the shots read them at call time), then puts them back. */
function withThreads(flags: Partial<IntroThreads>, body: () => void): void {
  const saved = { ...INTRO_THREADS };
  Object.assign(INTRO_THREADS, flags);
  try {
    body();
  } finally {
    Object.assign(INTRO_THREADS, saved);
  }
}

// A stand-in face: a block of cells split into the five characters of (•ω•).
const face: FaceCell[] = [];
for (let row = 10; row < 28; row++) {
  for (let col = 30; col < 146; col++) {
    const part = col < 50 ? 0 : col < 70 ? 1 : col < 106 ? 2 : col < 126 ? 3 : 4;
    face.push({ col, row, ch: '#', lum: 0.73, part });
  }
}
const L = buildIntroLayout(face);
const glyphs = (frame: number) => {
  const out: Glyph[] = [];
  const n = introGlyphs(frame, L, out);
  return out.slice(0, n);
};
const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
/** The intro's bar `bar` (1-based), plus `beat` beats (0-based). */
const intro = (bar: number, beat = 0): number => partFrame('intro', bar, beat);

test('the frontal camera sees exactly the 1920×1080 text plane', () => {
  assert.ok(Math.abs(visibleHeight(FRONT_DISTANCE, FOV) - 1080) < 1e-6);
});

test('the camera is continuous everywhere: the tilt off the log (E1, 95 → 96), the crane onto the highway (E2, 191 → 192), the whip, the launch, the push', () => {
  const dir = (p: Pose) => {
    const v = p.target.map((t, i) => t - p.position[i]);
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  };
  for (const f of [RAIN.from, RAIN.from + 0.5, CRANE.from, HIGHWAY_START, WHIP.from + 4, WHIP.to, LAUNCH, PUSH.from]) {
    const a = introCamera(f - 1e-4, L.eye);
    const b = introCamera(f, L.eye);
    assert.ok(dist(a.position, b.position) < 0.5 && dist(dir(a), dir(b)) < 1e-3 && Math.abs(a.fov - b.fov) < 0.01, `continuous at ${f}`);
  }
});

test('at the intro’s end the red circle covers the frame and the camera looks at the eye', () => {
  const p = introCamera(partEnd('intro'), L.eye);
  assert.ok(dist([p.target[0], p.target[1]], L.eye) < 1e-6);
  const circle = FACE.fontPx * CIRCLE_PER_EM;
  assert.ok(circle >= visibleHeight(p.position[2], p.fov) * Math.hypot(1, 16 / 9), 'covers the diagonal');
});

test('the intro has no hard cut left (one segment), and fast moves get more sub-frames', () => {
  assert.deepEqual(introSegment(), { from: partStart('intro'), to: partEnd('intro') });
  for (const f of [S01_MOVES[0].at + 2, S01_MOVES[1].at + 2, S01_MOVES[2].at + 4, WHIP.from + 6, LAUNCH - 6, PUSH.from + 6]) assert.ok(introTemporal(f).samples >= 48 && introTemporal(f).persistence === 0, `camera move at ${f}`);
  assert.ok(introTemporal(S01_MOVES[0].at + 16).persistence > 0, 'phosphor persistence on the terminal between the camera moves');
  // The RAIN bar keeps the phosphor trail (the camera is taken at the shutter): 64 a frame of window from S01's wind-up through the crane.
  for (const [f, n] of [[RAIN.from - 3, 64], [RAIN.from + 2, 64], [RAIN.from + 30, 64], [CRANE.from + 10, 64]] as const) {
    const t = introTemporal(f);
    assert.ok(t.persistence > 0 && Math.abs(t.samples / windowOf(t) - n) < 1, `frame ${f}: ${(t.samples / windowOf(t)).toFixed(1)} a frame`);
  }
});

test('the log fills the screen in the burst, then scrolls; the warning is amber', () => {
  assert.equal(scrollAt(LOG_START + 12), 0);
  assert.ok(scrollAt(CUT_S02 - 6) > 1);
  const warn = LOG_LINES.findIndex((l) => l.kind === 'warn');
  assert.ok(L.log.filter((c) => c.line === warn).every((c) => c.ink === INK.amber));
});

test('at the launch every flying glyph starts exactly where a terminal glyph was', () => {
  const before = glyphs(LAUNCH - 1e-3);
  const at = glyphs(LAUNCH);
  assert.ok(at.length > face.length - 1);
  for (const g of at) {
    if ((g.alpha ?? 1) === 0) continue;
    assert.ok(before.some((b) => b.ch === g.ch && Math.abs(b.x - g.x) < 1e-6 && Math.abs(b.y - g.y) < 1e-6), `${g.ch} at ${g.x}, ${g.y}`);
  }
});

test('the glyphs launch into a cloud on the downbeat, keep turning while they hang, and slam onto their cells on the lock', () => {
  const at = (f: number) => glyphs(f);
  const a = at(FLING.to + 4);
  const b = at(SLAM.from - 1);
  assert.ok(L.targets.some((_, k) => Math.hypot(a[k].x - b[k].x, a[k].y - b[k].y) > 1), 'the cloud keeps moving');
  L.targets.forEach((_, k) => assert.ok((a[k].z ?? 0) > 100, 'flung towards the camera'));
  const lock = at(LOCK);
  L.targets.forEach((t, k) => assert.ok(Math.abs(lock[k].x - t.x) < 1e-6 && Math.abs(lock[k].y - t.y) < 1e-6 && Math.abs(lock[k].z ?? 0) < 1e-6, `on its cell on the lock: ${k}`));
  const settled = at(LOCK + 12);
  L.targets.forEach((t, k) => assert.ok(Math.abs(RAMP.indexOf(settled[k].ch) - RAMP.indexOf(t.ch)) <= 1, `char ${settled[k].ch} for ${t.ch}`));
});

test('the right eye’s centre glyph becomes a Swiss red circle at the zoom centre', () => {
  const g = glyphs(PUSH.to - 0.1)[L.eyeTarget];
  assert.ok(L.targets[L.eyeTarget].part === 3);
  assert.ok((g.morph ?? 0) > 0.999);
  assert.ok(dist(g.color, SWISS_RED) < 0.02);
  assert.ok(dist([g.x, g.y], L.eye) < 1e-6);
  assert.equal(introLook(PUSH.to - 1).crt!.amount < 0.1, true);
});

test('finite everywhere, including fractional and out-of-range frames, and within capacity', () => {
  for (const f of [-0.25, 0, 47.9, 95.75, 150.5, 185.3, 191.9, 276.2, 300.7, 359.5, 383.75, 384.2].map((n) => partStart('intro') + n)) {
    const gs = glyphs(f);
    assert.ok(gs.length <= INTRO_CAPACITY);
    for (const g of gs) assert.ok([g.x, g.y, g.z ?? 0, g.size, ...g.color, g.alpha ?? 1].every(Number.isFinite), `frame ${f}`);
    const p = introCamera(f, L.eye);
    assert.ok([...p.position, ...p.target, ...p.up, p.fov].every(Number.isFinite), `camera ${f}`);
  }
});

test('the highway flies over the log column, not the empty middle of the plane', () => {
  for (const f of [CUT_S02, CUT_S02 + 34, CUT_S02 + 74]) {
    const p = introCamera(f, L.eye);
    assert.ok(p.position[0] > -800 && p.position[0] < -400, `camera x ${p.position[0]} at ${f}`);
    assert.ok(p.target[0] > -800 && p.target[0] < -400, `target x ${p.target[0]} at ${f}`);
  }
});

test('the terminal keeps a faint phosphor trail; the fly-up keeps its long trails', () => {
  const tail = (f: number) => temporalSamples(f, introTemporal(f)).filter((s) => s.frame < f - 0.25).reduce((a, s) => a + s.weight, 0);
  const terminal = CUT_S02 - 6;
  assert.ok(tail(terminal) > 0.1 && tail(terminal) < 0.4, `terminal tail ${tail(terminal)}`);
  assert.ok(tail(FLING.from + 6) > 0.5 && tail(SLAM.from + 6) > 0.5, `fly-up tails ${tail(FLING.from + 6)}, ${tail(SLAM.from + 6)}`);
});

test('every intro frame samples its whole window densely, so trails are streaks, not stamps', () => {
  for (let f = partStart('intro'); f < partEnd('intro'); f++) {
    const t = introTemporal(f);
    const perFrame = t.samples / windowOf(t);
    assert.ok(perFrame >= 32, `frame ${f}: ${perFrame.toFixed(1)} samples per frame of window`);
    if (within(f, [[FLING.from, FLING.to + 3], [SLAM.from, SLAM.to + 4]])) assert.ok(perFrame >= 48, `fly-up frame ${f}: ${perFrame.toFixed(1)}`);
  }
});

test('S03 glides after the typing: the prompt, every typed character and the cursor stay in view; the cursor after Enter too', () => {
  const tan = Math.tan((FOV * Math.PI) / 360);
  const inView = (f: number, col: number, row: number) => {
    const p = introCamera(f, L.eye);
    const halfH = p.position[2] * tan;
    const [x, y] = cellCenter(col, row);
    return Math.abs(x - p.position[0]) < 0.95 * halfH * (16 / 9) && Math.abs(y - p.position[1]) < 0.95 * halfH;
  };
  for (let f = WHIP.to + 8; f < ENTER_FRAME; f += 0.5) {
    const typed = typeFrames.filter((t) => t <= f).length;
    for (const c of [0, PROMPT.length + typed]) assert.ok(inView(f, c, PROMPT_ROW), `frame ${f}: col ${c}`);
  }
  for (let f = ENTER_FRAME + 1; f < ENTER_FRAME + 4; f++) assert.ok(inView(f, 0, PROMPT_ROW + 1), `cursor at ${f}`);
});

test('the screen glass warms up at the start and is gone under the red circle', () => {
  assert.equal(screenPower(partStart('intro')), 0.15);
  assert.equal(screenPower(WHIP.to + 8), 1);
  assert.equal(screenPower(PUSH.to - 1), 0);
});

test('every intro camera move starts (launch) or lands (slam) on the grid, and the camera never stops', () => {
  for (const m of [...S01_MOVES, ...S04_MOVES]) assert.equal(m.at % 12, 0, `on the grid: ${m.at}`);
  const pose = (f: number) => introCamera(f, L.eye);
  const moved = (a: Pose, b: Pose) => Math.hypot(...a.position.map((v, i) => v - b.position[i])) + Math.hypot(...a.target.map((v, i) => v - b.target[i])) + Math.abs(a.fov - b.fov);
  for (let f = partStart('intro') + 1; f < partEnd('intro'); f++) assert.ok(moved(pose(f - 1), pose(f)) > 1e-6, `the camera stops at ${f}`);
  assert.ok(Math.abs(pose(partStart('intro')).position[2] - FRONT_DISTANCE / 16) < 1e-9, 'opens 16× on the cursor');
});

test('a brighter band rolls down the CRT once a bar, and the haze pulses on the arp', () => {
  assert.equal(introLook(intro(1)).crt!.band, 0);
  assert.equal(introLook(intro(1, 2)).crt!.band, 0.5);
  assert.ok(hazePulse(LOG_START) > hazePulse(LOG_START + 3) && hazePulse(LOG_START + 3) > 1);
  assert.equal(hazePulse(LOG_START + 6), hazePulse(LOG_START));
  assert.equal(hazePulse(partStart('intro') + 10), 1);
});

test('the log keeps scrolling behind the command, one dim line per eighth note', () => {
  assert.ok(scrollAt(TICKER_FRAMES[3] + 3) - scrollAt(TICKER_FRAMES[2] + 3) > 0.99);
  assert.ok(L.log.some((c) => c.line >= LOG_LINES.length && c.ink === INK.dim));
});

test('S01: on black the cursor blinks twice, lit for three sixteenths on each beat, then fading out like phosphor', () => {
  assert.deepEqual(CURSOR_BLINKS.map((b) => [...b]), [[intro(1), intro(1, 0.75)], [intro(1, 1), intro(1, 1.75)]]);
  const level = (f: number) => {
    const c = glyphs(f).find((g) => g.ch === CURSOR);
    return c ? c.color[1] / (INK.green[1] * 1.1) : 0;
  };
  for (const [on, off] of CURSOR_BLINKS) {
    for (let f = on; f < off; f++) assert.ok(Math.abs(level(f) - 1) < 1e-9, `lit at ${f}`);
    assert.ok(Math.abs(level(off + 4) - Math.exp(-1)) < 1e-9, 'a phosphor fade (4 frames)');
    assert.ok(level(off + 5.9) > 0.2 && level(off + 5.9) < 0.3, `still glowing before the next beat: ${level(off + 5.9)}`);
  }
});

test('S01: the camera drifts the cursor across the screen, at least 2.5 px a frame once a launch has settled', () => {
  const onScreen = (f: number): [number, number] => {
    const p = introCamera(f, L.eye);
    const perUnit = 1080 / visibleHeight(p.position[2] - p.target[2], FOV);
    const [x, y] = cellCenter(0, 0);
    return [(x - p.target[0]) * perUnit, (y - p.target[1]) * perUnit];
  };
  for (let f = S01_MOVES[0].at + 6; f < LOG_START; f++) {
    const [a, b] = [onScreen(f - 1), onScreen(f)];
    assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > 2.5, `the cursor moves ${Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(2)} px at ${f}`);
  }
});

test('the highway bulges like the CRT glass: the screen’s curvature through the RAIN bar’s cruise, ramping to the highway’s over the crane, easing back through the whip', () => {
  const k = (f: number) => introLook(f).crt!.curvature;
  for (let f = RAIN.from; f < CRANE.from; f++) assert.equal(k(f), TERMINAL_CURVATURE, `${f}`);
  for (let f = CRANE.from; f < CUT_S02; f += 0.5) assert.ok(k(f + 0.5) >= k(f) && Math.abs(k(f + 0.5) - k(f)) < 0.02, `ramps over the crane at ${f}`);
  for (let f = CUT_S02; f < WHIP.from; f++) assert.equal(k(f), HIGHWAY_CURVATURE, `${f}`);
  assert.ok(HIGHWAY_CURVATURE >= 4 * TERMINAL_CURVATURE);
  for (let f = WHIP.from; f < WHIP.to; f += 0.5) assert.ok(k(f + 0.5) <= k(f) && Math.abs(k(f + 0.5) - k(f)) < 0.04, `eases back at ${f}`);
  assert.equal(k(WHIP.to), TERMINAL_CURVATURE);
});

test('A1: the Defender’s runs of the log are DEFENDER red (its face on 53, `[SCAN]` on 55), before the kaomoji accent and the kinds', () => {
  const red = (i: number) => [...LOG_LINES[i].text].map((_, j) => lineInk(LOG_LINES[i], j) === LOG_RED);
  const def = LOG_LINES.findIndex((l) => l.text.includes('defender loaded'));
  const scan = LOG_LINES.findIndex((l) => l.text.startsWith('[SCAN]'));
  assert.equal(logFrames[def], 53);
  assert.equal(logFrames[scan], 55);
  const runs = (i: number) => red(i).map((r, j) => (r ? [...LOG_LINES[i].text][j] : '')).join('');
  assert.equal(runs(def), '(￣▽￣)');
  assert.equal(runs(scan), '[SCAN]');
  assert.ok(LOG_LINES.every((_, i) => i === def || i === scan || red(i).every((r) => !r)), 'red is only the antivirus');
  assert.ok(L.log.some((c) => c.ink === LOG_RED));
});

test('C1, the print head: on intro 1.3 the cursor runs along row 0 at the title’s reveal front, and on 51 drops to column 0 of the next free row', () => {
  const cursor = (f: number) => glyphs(f).find((g) => g.ch === CURSOR)!;
  const row0 = cellCenter(0, 0)[1];
  let last = -Infinity;
  for (let f = PRINT_HEAD.from; f < PRINT_HEAD.to; f += 0.25) {
    const c = cursor(f);
    assert.equal(c.y, row0, `on row 0 at ${f}`);
    assert.ok(c.x > last, `running right at ${f}`);
    last = c.x;
    const title = glyphs(f).filter((g) => g.ch !== CURSOR && g.y === row0 && (g.alpha ?? 1) > 0);
    if (title.length) assert.ok(Math.max(...title.map((g) => g.x)) <= c.x + 1e-6, `the title comes out of the cursor at ${f}`);
  }
  const at51 = cursor(PRINT_HEAD.to);
  assert.equal(at51.x, cellCenter(0, 0)[0]);
  assert.equal(at51.y, cellCenter(0, logFrames.filter((f) => f <= PRINT_HEAD.to).length - scrollAt(PRINT_HEAD.to))[1]);
  assert.deepEqual(cursor(PRINT_HEAD.from - 1).x, cellCenter(0, 0)[0], 'before the title: the blinking cursor of the locked seam');
});

test('the log runs on its own clock: frozen through the RAIN bar, resuming on intro 3.1 as v04’s intro 2.1 (192 → 96); the ticker on v04’s frames', () => {
  assert.equal(logClock(CUT_S02), 96);
  for (let f = RAIN.from; f < CUT_S02; f += 3) assert.equal(scrollAt(f), scrollAt(RAIN.from - 1), `held at ${f}`);
  assert.ok(scrollAt(CUT_S02 + 24) > scrollAt(CUT_S02), 'the friends stream on from 192');
  assert.deepEqual(TICKER_FRAMES.map(logClock), TICKER_FRAMES.map((f) => f - 96));
});

test('S04’s flicker draws v04’s noise a bar later: the decode characters are keyed to seedFrame', () => {
  const chars = [...DECODE];
  for (const f of [FLING.from + 2, FLING.from + 13.5, SLAM.from]) {
    assert.equal(seedFrame(f), f - 96, 'intro 5 seeds as v04’s intro 4');
    const gs = glyphs(f);
    L.targets.forEach((_, k) => {
      if (k % 37) return;
      assert.equal(gs[k].ch, chars[Math.floor(hash(k, Math.floor(seedFrame(f) / 2)) * chars.length)], `glyph ${k} at ${f}`);
    });
  }
});

test('the atlas keeps v04’s character order first, then the new characters, then the whole keys (his bytes, the rain faces)', () => {
  const singles = INTRO_GLYPHS.findIndex((s) => [...s].length > 1);
  assert.equal(new Set(INTRO_GLYPHS).size, INTRO_GLYPHS.length);
  assert.equal(INTRO_GLYPHS[0], 'K', 'v04’s first character: the title’s K');
  for (const s of INTRO_GLYPHS.slice(singles)) assert.ok([...s].length > 1, `${s} after the characters`);
  for (const l of LOG_LINES) for (const ch of l.text) if (ch !== ' ') assert.ok(INTRO_GLYPHS.includes(ch), `${ch}`);
});

test('the tube kick: on the lock the glass springs to 0.12 and settles on 0.065, fringing and bloom kick, scanlines and grille thicken, the haze ×1.6; back to the terminal’s for T1', () => {
  const k = (f: number) => introLook(f).crt!;
  assert.equal(k(LOCK - 1).curvature, TERMINAL_CURVATURE);
  assert.ok(Math.abs(k(LOCK).curvature - TUBE.curvature[1]) < 1e-9);
  assert.ok(Math.abs(k(LOCK + 30).curvature - TUBE.curvature[2]) < 2e-3, `settles: ${k(LOCK + 30).curvature}`);
  assert.ok(Math.abs(k(LOCK + 6).scanlines - TUBE.scanlines[1]) < 1e-9 && Math.abs(k(LOCK + 6).grille - TUBE.grille[1]) < 1e-9);
  assert.ok(introLook(LOCK).aberration > 3 * introLook(LOCK - 1).aberration);
  assert.ok(introLook(LOCK).bloom.intensity > introLook(LOCK - 1).bloom.intensity + 0.9 * TUBE.bloom);
  assert.equal(hazeGain(LOCK), TUBE.haze);
  assert.equal(hazeGain(LOCK - 1), 1);
  assert.equal(hazeGain(TUBE_FADE.to), 1);
  assert.ok(Math.abs(k(TUBE_FADE.to).curvature - TERMINAL_CURVATURE) < 1e-9 && Math.abs(k(TUBE_FADE.to).scanlines - 0.3) < 1e-9);
  withThreads({ tubeKick: false }, () => {
    assert.equal(k(LOCK).curvature, TERMINAL_CURVATURE);
    assert.equal(hazeGain(LOCK + 4), 1);
  });
});

test('the antivirus looks (intro 5.3&): a DEFENDER-red band rolls top → bottom over 444–456; the face cells it crosses turn red for 2 frames; the white band is parked meanwhile', () => {
  assert.equal(redBandAt(RED_BAND.from - 1), null);
  assert.ok(redBandAt(RED_BAND.from)!.y < 0, 'enters above the frame');
  assert.ok(redBandAt(RED_BAND.to - 0.01)!.y > 1080, 'leaves below it');
  assert.equal(redBandAt(RED_BAND.to), null, 'gone by intro 5.4: T1 is v04’s');
  assert.equal(redBandAt(450)!.alpha, LOOK_BAND.alpha);
  const y450 = redBandAt(450)!.y;
  assert.equal(bandMix(450, y450), LOOK_BAND.mix);
  assert.equal(bandMix(450, y450 + 200), 0);
  assert.equal(bandMix(RED_BAND.to + LOOK_BAND.frames, 1000), 0, 'for 2 frames');
  const inks = (f: number) => glyphs(f).map((g) => g.color.join());
  const plain = (f: number) => {
    let out: string[] = [];
    withThreads({ redBand: false }, () => (out = inks(f)));
    return out;
  };
  const turned = (f: number) => inks(f).filter((c, i) => c !== plain(f)[i]).length;
  assert.ok(turned(450) > 50, `the face cells under the band turn red: ${turned(450)}`);
  assert.equal(turned(RED_BAND.to), 0, 'and only while it crosses them: none from intro 5.4');
  const xs = (f: number) => glyphs(f).map((g) => g.x);
  let plainX: number[] = [];
  withThreads({ redBand: false }, () => (plainX = xs(450)));
  const torn = xs(450).filter((x, i) => x !== plainX[i]).length;
  assert.ok(torn > 20 && torn < turned(450), `the rows under the band tear sideways: ${torn}`);
  for (let f = WHITE_BAND_OFF.from; f < WHITE_BAND_OFF.to; f++) assert.equal(introLook(f).crt!.band, 0, `parked at ${f}`);
  assert.equal(introLook(WHITE_BAND_OFF.to).crt!.band, (WHITE_BAND_OFF.to % 96) / 96);
  withThreads({ redBand: false }, () => {
    assert.equal(redBandAt(450), null);
    assert.equal(introLook(450).crt!.band, (450 % 96) / 96);
  });
});

test('the dome: the log bulges up round the flight path on intro 3 — rising on its downbeat, gone through the whip — and leaves the progress bar on the page', () => {
  assert.equal(domeAt(CUT_S02), 0);
  assert.ok(domeAt(CUT_S02 + 3) > 0.6 && domeAt(CUT_S02 + 24) > 0.999);
  assert.equal(domeAt(DOME_FALL.to), 0);
  const lift = domeLift(230)!;
  const cam = introCamera(230, L.eye);
  assert.ok(lift(cam.position[0], cam.position[1] + DOME_SHAPE.ahead) > 0.99 * DOME_SHAPE.amp, 'the crest rides ahead of the camera');
  assert.ok(lift(cam.position[0], cam.position[1]) < 0.05 * cam.position[2], 'nothing rises to the camera');
  const bar = glyphs(230).filter((g) => g.y === cellCenter(0, 28)[1]);
  assert.ok(bar.length > 10 && bar.every((g) => (g.z ?? 0) < 30), 'the progress bar stays on the page');
  assert.equal(PROGRESS_STEPS[0], CUT_S02);
  withThreads({ dome: false }, () => assert.ok(glyphs(230).every((g) => g.z === undefined)));
});

test('titleSafe (2026-10-03; the film’s since that morning, off = the earlier aim): the boot title’s K stays ≥ 40 px inside the glass on 50–72; the camera moves only on 49–95, and the tilt starts from the same pose', () => {
  // The left edge of the K's cell (row 0, column 0) on screen before the CRT barrel, which keeps x 0 at the glass's edge.
  const kLeft = (f: number): number => {
    const p = introCamera(f, L.eye);
    const perUnit = 1080 / visibleHeight(p.position[2] - p.target[2], FOV);
    return 960 + (cellCenter(0, 0)[0] - TERM.cellW / 2 - p.target[0]) * perUnit;
  };
  const span = Array.from({ length: intro(1, 3) - LOG_START - 1 }, (_, i) => LOG_START + 2 + i);
  const same = [0, 24, LOG_START - 1, LOG_START, intro(1, 3) + 8];
  let approved: ReturnType<typeof introCamera>[] = [];
  withThreads({ titleSafe: false }, () => {
    assert.ok(span.some((f) => kLeft(f) < 0), 'the earlier approved aim cuts the K');
    approved = same.map((f) => introCamera(f, L.eye));
  });
  assert.equal(INTRO_THREADS.titleSafe, true, 'the film’s');
  for (const f of span) assert.ok(kLeft(f) >= 40, `frame ${f}: the K at ${kLeft(f).toFixed(1)} px`);
  same.forEach((f, i) => assert.deepEqual(introCamera(f, L.eye), approved[i], `frame ${f} as approved`));
  assert.equal(S01_MOVES_TITLE_SAFE.filter((m, i) => m !== S01_MOVES[i]).length, 1, 'one aim moves');
  assert.equal(S01_MOVES_TITLE_SAFE[1].aim.x, TITLE_SAFE_X);
  const start = { zoom: 16, x: cellCenter(0, 0)[0], y: cellCenter(0, 0)[1], roll: 0 };
  assert.deepEqual(aimMoves(RAIN.from, start, S01_MOVES_TITLE_SAFE), aimMoves(RAIN.from, start, S01_MOVES), 'the tilt takes the same pose on 96');
});
