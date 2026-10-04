// S30 FULL COMBO (drop2 5.1–7.1 − 1: the crane bar 5, new, and the built game bar 6, re-keyed; E8) and the part that holds it with S31
// (Drop2Game, drop2 5.1–8.1 − 1): the Swiss rhythm game whose notes are the real drum hits and whose highway is the song's own
// spectrogram, down which he can see the song's future; bar 5 opens on it in plan, a poster of the whole song, and craned back into the
// road; the camera whip-tilts into the party monitor and whip-pans into the kernel (20-bar sheet notes/bid2/drop2-sheet2.md §3 bars
// 5–7, §1.3 C, E, F). The story, read back from the pure module (src/shots/drop2Game.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { S30_CLAP, S30_KICK, S30_VOX } from '../src/content/castDrop2.ts';
import type { Pose } from '../src/engine/camera.ts';
import { linear } from '../src/engine/color.ts';
import type { Glyph } from '../src/engine/glyphField.ts';
import { temporalSamples } from '../src/engine/temporal.ts';
import { aimPose } from '../src/motion/hit.ts';
import { CLAPS2, CRANE, CRASH, DISC, DROP2_END, FULL_COMBO, GAME, HAT_BYTES, HATS2, KERNEL, KICKS2, NOTES_CLAP, NOTES_KICK, NOTES_VOX, PAN, PROBES, ROLL31, SCRUB, SWITCH, TILT, VOX_KANA } from '../src/score/drop2.ts';
import { SIGNATURE, VOX_KANA_TEXT } from '../src/content/drop2.ts';
import { partEnd, partFrame } from '../src/score/film.ts';
import { HEARTBEAT, OPEN, OUTRO_START } from '../src/score/outro.ts';
import { TOTAL_FRAMES } from '../src/score/tempo.ts';
import { HANDOFFS, PALETTES, SWISS_OMEGA, drop2Segment } from '../src/shots/drop2Shared.ts';
import { FOV, FRONT } from '../src/shots/swiss.ts';
import {
  BARRIER,
  GAME_STRINGS,
  type GameLayout,
  HIGHWAY,
  KICK_POSES5,
  KICKS5,
  NOTES,
  PRINT_IN,
  type Spectrum,
  combo,
  discAt,
  emptySpectrum,
  gameAim,
  gameFrame,
  gameTemporal,
  heroAt,
  highwayView,
  horizonLabels,
  parseSpectrum,
  perfectTags,
  printIn,
  project,
  projectV,
  ridgesAt,
  score,
  sigma,
} from '../src/shots/drop2Game.ts';
import { assertFastMovesSampled, assertNeverStill, poseMoved, screenMove } from './lib/energyAudit.ts';

const L: GameLayout = {
  jp: (ch) => ('()（）;'.includes(ch) ? 0.36 : 0.62),
  faces: (s) => 0.6 * [...s].length,
  heavy: () => 0.62,
  bold: () => 0.6,
  medium: () => 0.58,
  ui: () => 0.6,
  mono: () => 0.6,
  rounded: (ch) => ('()'.includes(ch) ? 0.4 : 0.8),
};
/** Drop 2's bar `bar`, beat `beat` (both 1-based, as src/score/drop2.ts writes them), as a film frame. */
const d2at = (bar: number, beat = 1): number => partFrame('drop2', bar, beat - 1);
const range = (a: number, b: number, step = 1) => Array.from({ length: Math.ceil((b - a) / step) }, (_, i) => a + i * step);
/** A spectrum that is silent but for bin `bin`, full on the frames in [from, to). */
const toneSpectrum = (bin: number, from: number, to: number): Spectrum => {
  const bytes = new Uint8Array(TOTAL_FRAMES * 96);
  for (let f = from; f < to; f++) bytes[f * 96 + bin] = 255;
  return parseSpectrum(bytes);
};
/** Two colours the same (engine RGB). */
const same = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
/** Defender's red as the game prints it (LAW.defender.print through linear: the same array the module uses). */
const RED_PRINT = gameFrame(GAME + 30, { jp: () => 0.6, faces: () => 1, heavy: () => 0.6, bold: () => 0.6, medium: () => 0.6, ui: () => 0.6, mono: () => 0.6, rounded: () => 0.6 }, emptySpectrum()).track.under.find((sh) => sh.kind === 'rect' && sh.color[0] > 0.5 && sh.color[1] < 0.1)!.color;
const camera = (f: number): { pose: Pose; samples: number } => ({ pose: aimPose(gameAim(f), FRONT, FOV), samples: temporalSamples(f, gameTemporal(f)).filter((s) => s.frame >= f - gameTemporal(f).shutter / 2 - 1e-9).length });

test('the highway recedes from the red judgement rule (y 880) to the vanishing point (960, 196): σ(Δ) = 48 / (48 + Δ)', () => {
  assert.equal(sigma(0), 1);
  const ys: [number, number][] = [[0, 880], [24, 652], [48, 538], [96, 424], [192, 333], [384, 272], [576, 249]];
  for (const [d, y] of ys) assert.ok(Math.abs(project(0, 0, d)[1] - y) < 1, `Δ ${d}: y ${project(0, 0, d)[1].toFixed(1)}, not ${y}`);
  assert.deepEqual(project(-840, 0, 0), [120, 880], 'the outer lane rule at the playhead');
  assert.ok(Math.abs(project(0, 150, 0)[1] - 730) < 1e-9, 'a full ridge stands 150 px above the playhead');
});

// E8 on the 20-bar drop 2 (sheet §3 bar 5): the hard match cut lands on the game seen in plan — the whole rest of the song printed as a
// flat Swiss poster of hairlines, its end at the top (y 110) — and the crane tips it back into the as-built road by drop2 5.2, which
// looks six bars ahead (the end of the film far beyond, no end edge).
test('E8: on the cut he sees the whole rest of the song as a poster (its end at the top), and from drop2 5.2 the as-built road six bars deep', () => {
  const plan = ridgesAt(GAME, emptySpectrum());
  const pt = plan.lines.map((l) => l.t);
  assert.equal(Math.max(...pt), partEnd('outro') - 6, 'the poster runs to the song’s last 16th');
  assert.ok(plan.end && Math.abs(plan.end.y - 110) < 1e-6, 'the song’s end rule at the poster’s head');
  assert.ok(plan.lines.every((l) => l.heights.every((h) => h === 0) || l.barrier), 'in plan the ridges lie flat (hairlines)');
  for (let i = 1; i < pt.length; i++) assert.ok(pt[i] < pt[i - 1], 'drawn far to near');
  const r = ridgesAt(CRANE.to, emptySpectrum());
  const ts = r.lines.map((l) => l.t);
  assert.equal(HIGHWAY.ahead, 6 * 96, 'six bars deep');
  assert.ok(CRANE.to + HIGHWAY.ahead < partEnd('outro'), 'the end of the film lies beyond the far end');
  assert.equal(Math.max(...ts), CRANE.to + HIGHWAY.ahead, 'the far end’s 16th');
  assert.ok(Math.min(...ts) <= CRANE.to - 6 && Math.min(...ts) >= CRANE.to + HIGHWAY.behind, 'and just behind the playhead');
  for (let i = 1; i < ts.length; i++) assert.ok(ts[i] < ts[i - 1], 'drawn far to near');
  assert.equal(r.end, null, 'no end edge: the song does not end within sight');
  assert.deepEqual(highwayView(CRANE.to), { ...highwayView(CRANE.to + 40), far: highwayView(CRANE.to).far }, 'the road from 5.2 is the as-built camera');
  assert.equal(ridgesAt(CRANE.to + 40, emptySpectrum()).lines.filter((l) => l.t > partEnd('outro') - 6).length, 0, 'nothing past the song’s end');
});

test('the crane (drop2 5.1 → 5.2): 75 % of its way by + 6, landing exactly on 5.2; the ridges stand up only as it passes halfway; the poster’s far future fades as the road takes over', () => {
  const c = (f: number) => highwayView(f).c;
  assert.equal(c(GAME), 0);
  // The cut lands crisp on the poster: every sub-frame of the cut frame is the plan view; the crane launches after it.
  for (const s of temporalSamples(GAME, gameTemporal(GAME), drop2Segment(GAME))) assert.equal(c(s.frame), 0, `the cut frame is the plan view (${s.frame})`);
  assert.ok(Math.abs(c(GAME + 6) - 0.75) < 1e-9, `75 % by + 6: ${c(GAME + 6)}`);
  for (let f = GAME; f < CRANE.to; f++) assert.ok(c(f + 1) > c(f), `${f}: always moving into the landing`);
  assert.equal(c(CRANE.to), 1);
  assert.equal(highwayView(GAME + 2).relief, 0, 'flat in plan');
  assert.equal(highwayView(CRANE.to).relief, 1, 'the road’s full relief');
  assert.equal(highwayView(GAME).fade, 1, 'the whole poster on the cut');
  assert.equal(highwayView(CRANE.to - 6).fade, 0, 'only the road’s six bars by its tail');
  // The now-line never moves: the playhead is y 880 at scale 1 throughout.
  for (let f = GAME; f <= CRANE.to; f += 0.5) {
    const v = highwayView(f);
    const [x, y] = projectV(v, 300, 0, 0);
    assert.ok(Math.abs(y - 880) < 1e-9 && Math.abs(x - 1260) < 1e-9, `${f}: the playhead holds (${x}, ${y})`);
  }
});

test('the poster is the song’s spectrogram printed: in plan each 16th is a hairline shaded band by band by the mix’s level', () => {
  const spec = toneSpectrum(12, d2at(6), d2at(6, 1.25));
  // Round 1 (R2): the poster prints in over the cut's first frames (printIn); its shading is read relative to how far it has printed.
  const F = GAME + 2;
  const k = printIn(F);
  const line = ridgesAt(F, spec).lines.find((l) => l.t === d2at(6))!;
  const quiet = ridgesAt(F, spec).lines.find((l) => l.t === d2at(6, 2))!;
  assert.ok(line.tone && quiet.tone, 'shaded in plan');
  assert.ok(Math.max(...line.tone!) / k > 0.95 && Math.min(...quiet.tone!) / k < 0.15, 'the loud band solid, the quiet floor a faint grey');
  // The cut lands on the paper: no ink on 5.1, the hairlines inking in over PRINT_IN frames, never back.
  assert.ok(Math.max(...ridgesAt(GAME, spec).lines.find((l) => l.t === d2at(6))!.tone!) === 0, 'blank paper on the cut frame');
  let last = 0;
  for (let f = GAME; f <= GAME + PRINT_IN; f += 0.25) {
    assert.ok(printIn(f) >= last, `${f}: printing in`);
    last = printIn(f);
  }
  assert.equal(printIn(GAME + PRINT_IN), 1);
  assert.equal(ridgesAt(CRANE.to, spec).lines.find((l) => l.t === d2at(6))!.tone, null, 'solid ink on the road');
});

test('the ridges are the real mix: a loud bin rises at its own place on both sides (the bass in the middle, under him), only on its own 16ths', () => {
  const bin = 10;
  const spec = toneSpectrum(bin, d2at(5, 3), d2at(5, 3.25));
  const r = ridgesAt(CRANE.to, spec);
  const lit = r.lines.filter((l) => !l.barrier && l.heights.some((h) => h > 1));
  assert.deepEqual(lit.map((l) => l.t), [d2at(5, 3)], 'only the ridge of that 16th');
  const top = Math.max(...lit[0].heights);
  const peaks = lit[0].u.filter((_, i) => lit[0].heights[i] === top);
  const want = (840 * (bin + 0.5)) / 96;
  assert.deepEqual(peaks.map((u) => Math.round(Math.abs(u))).sort(), [Math.round(want), Math.round(want)], 'mirrored: both sides of the middle');
  assert.ok(Math.abs(top - HIGHWAY.height) < 1e-9, 'a full bin is 150 px tall at the playhead');
  assert.ok(lit[0].heights.every((h, i) => h === top || h <= 0.6 * top + 1e-9 || Math.abs(Math.abs(lit[0].u[i]) - want) < 1e-9), 'its neighbours hold at most 60 % of it');
});

test('the “now” ridge (crossing the playhead) is red, the played ones grey, the downbeats’ ridges heavier (on the road, from drop2 5.2: as built)', () => {
  const R = CRANE.to;
  const r = ridgesAt(R + 2, emptySpectrum());
  const now = r.lines.filter((l) => l.red);
  assert.deepEqual(now.map((l) => l.t), [R]);
  assert.deepEqual(ridgesAt(R + 4, emptySpectrum()).lines.filter((l) => l.red).map((l) => l.t), [R + 6], 'the next one takes over halfway');
  assert.ok(r.lines.filter((l) => l.t < R).every((l) => l.past) && r.lines.filter((l) => l.t > R).every((l) => !l.past));
  const width = (t: number) => r.lines.find((l) => l.t === t)!.width;
  assert.ok(width(NOTES_KICK[0]) > width(NOTES_KICK[0] - 6) * 1.4, 'a bar line (drop2 6.1) is 1.6× the 16ths');
});

test('E8’s scrub: on drop2 5.3 FULL COMBO’s own ridge glints red down the highway for a 16th — the future, for a moment', () => {
  const glints = (f: number) => ridgesAt(f, emptySpectrum()).lines.filter((l) => l.glint).map((l) => l.t);
  assert.deepEqual(glints(SCRUB - 1), []);
  assert.deepEqual(glints(SCRUB), [FULL_COMBO]);
  assert.deepEqual(glints(SCRUB + 6), []);
});

test('bar 5’s chart has no new faces: his own poses on the kicks, Defender’s faceless probes in the CLAP lane, the hook’s kana, the hats, then the signature’s ten bytes riding the HAT lane', () => {
  const bar5 = NOTES.filter((n) => n.at >= GAME && n.at < NOTES_KICK[0]);
  const lane = (k: number) => bar5.filter((n) => n.lane === k);
  assert.deepEqual(lane(0).map((n) => n.at), [...KICKS5]);
  assert.deepEqual(KICKS5, KICKS2.filter((k) => k >= GAME && k < NOTES_KICK[0]), 'every kick of bar 5');
  assert.deepEqual(lane(0).map((n) => n.face), KICKS5.map((_, i) => KICK_POSES5[i % KICK_POSES5.length]));
  assert.ok(lane(0).every((n) => /\(•ω•\)/.test(n.face!)), 'his poses');
  assert.deepEqual(lane(1).map((n) => [n.at, n.kind]), PROBES.map((at) => [at, 'probe']), 'the CLAP lane: the probes, faceless');
  assert.ok(lane(1).every((n) => n.face === undefined));
  assert.deepEqual(lane(3).map((n) => [n.at, n.face]), VOX_KANA.map((at, i) => [at, VOX_KANA_TEXT[i]]), 'あ い う え お');
  assert.deepEqual(lane(2).filter((n) => n.kind === 'byte').map((n) => [n.at, n.text]), HAT_BYTES.map((at, i) => [at, SIGNATURE.hat[i]]), 'the bytes ride the HAT lane');
  assert.deepEqual(lane(2).map((n) => n.at), HATS2.filter((h) => h >= GAME && h < NOTES_KICK[0]), 'one HAT note per 16th (hat or byte)');
});

test('the notes of bar 6 are the as-built game bar’s real drum hits (moved +96), faces in the cast’s order; the future rides the lanes as plain cards and stops dead at the crash', () => {
  const bar31 = NOTES.filter((n) => n.at >= NOTES_KICK[0] && n.at < TILT.to);
  const lane = (k: number, kind?: string) => bar31.filter((n) => n.lane === k && (kind === undefined || n.kind === kind));
  assert.deepEqual(lane(0).map((n) => n.at), [...NOTES_KICK]);
  assert.deepEqual(lane(0).map((n) => n.face), S30_KICK.map((c) => c.face));
  assert.deepEqual(lane(1, 'face').map((n) => n.at), [...NOTES_CLAP]);
  assert.deepEqual(lane(1, 'face').map((n) => n.face), S30_CLAP.map((c) => c.face));
  assert.deepEqual(lane(1, 'roll').map((n) => n.at), [...ROLL31]);
  assert.deepEqual(lane(2).map((n) => n.at), HATS2.filter((h) => h >= NOTES_KICK[0] && h < TILT.to));
  assert.deepEqual(lane(3).map((n) => n.at), [...NOTES_VOX]);
  assert.deepEqual(lane(3).map((n) => n.face), S30_VOX.map((c) => c.face));
  const future = NOTES.filter((n) => n.at >= TILT.to);
  assert.ok(future.every((n) => n.face === undefined), 'plain cards');
  for (const k of KICKS2.filter((f) => f >= TILT.to)) assert.ok(future.some((n) => n.at === k && n.lane === 0), `kick ${k}`);
  for (const c of CLAPS2.filter((f) => f >= TILT.to)) assert.ok(future.some((n) => n.at === c && n.lane === 1), `clap ${c}`);
  assert.equal(future.filter((n) => n.at >= CRASH && n.at < HEARTBEAT).length, 0, 'the crash is an empty stretch');
  assert.deepEqual(future.filter((n) => n.at >= HEARTBEAT).map((n) => [n.at, n.lane]), [[HEARTBEAT, 0], [OPEN, 3]], 'then the soft kick and the last chord');
});

test('a note rides until its hit frame and is gone on it: every sub-frame of the hit frame is past it, every one of the frame before shows it', () => {
  const shown = (s: number, at: number, lane: number) => gameFrame(s, L, emptySpectrum()).notes.some((n) => n.at === at && n.lane === lane);
  for (const at of [...NOTES_KICK.slice(0, 3), ...ROLL31]) {
    const lane = NOTES_KICK.includes(at) ? 0 : 1;
    for (const s of temporalSamples(at, gameTemporal(at), drop2Segment(at))) assert.ok(!shown(s.frame, at, lane), `${at}: gone at ${s.frame}`);
    for (const s of temporalSamples(at - 1, gameTemporal(at - 1), drop2Segment(at - 1))) assert.ok(shown(s.frame, at, lane), `${at}: still there at ${s.frame}`);
  }
});

test('COMBO counts every note he hits up to FULL COMBO and holds; SCORE climbs with each hit and lands exactly on 255 255 on drop2 5.4', () => {
  assert.equal(combo(GAME - 1), 0);
  assert.ok(combo(GAME) >= 2, 'the kick, the vox and the hat on drop2 5.1');
  for (let f = GAME; f < FULL_COMBO + 30; f++) assert.ok(combo(f + 1) >= combo(f), `${f}: never drops`);
  const judged = NOTES.filter((n) => n.at >= GAME && n.at <= FULL_COMBO).length;
  assert.equal(combo(FULL_COMBO), judged);
  assert.equal(combo(TILT.to), judged, 'the game is over after FULL COMBO');
  assert.equal(score(FULL_COMBO), 255255);
  assert.equal(score(GAME - 1), 0);
  for (const f of range(GAME, FULL_COMBO)) assert.ok(score(f + 1) >= score(f));
});

/** The PERFECT tags on screen at `f`, with their boxes (layout px: the word's advance × size, the em's height). */
const tagsAt = (f: number) =>
  perfectTags(f, L)
    .filter((t) => t.alpha > 1e-3)
    .map((t) => {
      const w = [...'PERFECT'].reduce((a, ch) => a + L.ui(ch), 0) * t.size;
      const x0 = t.x - t.align * w;
      return { ...t, x0, x1: x0 + w, y0: t.y - t.size / 2, y1: t.y + t.size / 2, cx: x0 + w / 2 };
    });
const overlaps = (a: { x0: number; x1: number; y0: number; y1: number }, b: { x0: number; x1: number; y0: number; y1: number }) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

test('D2-GAME-PERFECT-PILE: one PERFECT per lane at a time — a new hit replaces the last, popping 1.15 → 1, gone by + 8; none for the hats', () => {
  // (FULL COMBO's frame starts a quarter early, as every drum swap does: struck().)
  for (const f of range(GAME - 1, FULL_COMBO - 0.25, 0.25)) {
    const lanes = tagsAt(f).map((t) => t.lane);
    assert.equal(new Set(lanes).size, lanes.length, `${f}: one tag per lane (${lanes})`);
    assert.ok(!lanes.includes(2), `${f}: no tag for the hats`);
    assert.ok(lanes.length <= 3 && tagsAt(f).every((t) => !t.burst), `${f}: no pile before FULL COMBO`);
  }
  // The snare roll: every 16th and 32nd replaces the tag before it, popped on its own frame.
  for (const h of ROLL31) {
    const t = tagsAt(h).find((x) => x.lane === 1)!;
    assert.equal(t.at, h, `${h}: its own tag`);
    assert.ok(Math.abs(t.size / 44 - 1.15) < 1e-9, `${h}: popped 1.15× on its hit frame`);
  }
  // A lone tag (the first kick's): popped, settled to 44 px by + 5, whole until + 4, gone by + 8.
  const k = NOTES_KICK[0];
  const one = (f: number) => tagsAt(f).find((x) => x.at === k && x.lane === 0);
  assert.ok(Math.abs(one(k)!.size - 44 * 1.15) < 1e-9);
  assert.ok(Math.abs(one(k + 5)!.size - 44) < 1e-6, 'settled by + 5');
  assert.equal(one(k + 4)!.alpha, 1, 'whole until + 4');
  assert.equal(one(k + 8), undefined, 'gone by + 8');
  // It pops from its left end on the baseline: the word stays left-aligned with the lane's label.
  assert.ok(Math.abs(one(k)!.x - one(k + 6)!.x) < 1e-9);
});

test('D2-GAME-PERFECT-PILE: PERFECT sits under its lane, left-aligned with the lane’s label, clear of every chip, note, label and of the other tags, drawn over the notes with a paper knock-out', () => {
  for (const f of range(GAME, FULL_COMBO, 0.5)) {
    const c = gameFrame(f, L, emptySpectrum());
    const tags = tagsAt(f);
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) assert.ok(!overlaps(tags[i], tags[j]), `${f}: tags ${tags[i].lane} and ${tags[j].lane} overlap`);
    const chips = [...c.notes, ...c.pops].map((m) => ({ x0: m.x - m.w / 2, x1: m.x + m.w / 2, y0: m.y - m.h / 2, y1: m.y + m.h / 2 }));
    for (const t of tags) {
      assert.ok(Math.abs(t.x - (960 + [-840, -600, 360, 600][t.lane] + 12)) < 1e-9 && t.align === 0, `${f}: left-aligned with its lane’s label`);
      for (const m of chips) assert.ok(!overlaps(t, m), `${f}: lane ${t.lane}'s tag touches a chip at ${m.x0.toFixed(0)}–${m.x1.toFixed(0)}, ${m.y0.toFixed(0)}–${m.y1.toFixed(0)}`);
      assert.ok(t.y0 > 946 + 11, `${f}: below the lane label (${t.y0.toFixed(1)})`);
      // Inside the frame through S30's flow zoom.
      const z = gameAim(f).zoom;
      assert.ok(540 + (t.y1 - 540) * z <= 1076 && 960 + (t.x0 - 960) * z >= 8 && 960 + (t.x1 - 960) * z <= 1912, `${f}: lane ${t.lane}'s tag in frame`);
    }
    const drawn = c.hero.glyphs.ui ?? [];
    assert.equal(drawn.length, tags.length * 'PERFECT'.length, `${f}: every tag drawn (in the hero layer, over the track’s notes)`);
    const paper = linear(PALETTES.swiss.ground);
    for (const g of drawn) assert.ok((g.outline ?? 0) >= 0.06 && g.outlineColor?.every((v, i) => Math.abs(v - paper[i]) < 1e-9), 'knocked out of anything under it (a paper outline)');
  }
});

test('D2-GAME-PERFECT-PILE: FULL COMBO is the one multi-PERFECT moment — 8 tags burst from the clap lane’s tag into a starburst of words, gone by + 7', () => {
  const at = (t: number) => tagsAt(FULL_COMBO + t);
  assert.equal(at(0).length, 8);
  assert.ok(at(0).every((t) => t.burst && t.lane === 1), 'the clap lane’s tag becomes the burst');
  const last = tagsAt(FULL_COMBO - 0.5).find((t) => t.lane === 1)!;
  // (popped again: FULL COMBO is a hit too, so the word is 1.15× and its middle a few px right of the settling tag's.)
  for (const t of at(0)) assert.ok(Math.hypot(t.cx - last.cx, t.y - last.y) < 12, 'from where the last tag stood');
  const mid = at(4);
  assert.equal(mid.length, 8);
  for (const t of mid) assert.ok(Math.hypot(t.cx - last.cx, t.y - last.y) > 70, 'flung out');
  for (let i = 0; i < mid.length; i++) for (let j = i + 1; j < mid.length; j++) assert.ok(Math.hypot(mid[i].cx - mid[j].cx, mid[i].y - mid[j].y) > 40, 'apart');
  // A starburst: each word's middle on its own ray from the hub (≥ 20° apart), the word turned onto that ray (mod 180°).
  const rays = mid.map((t) => Math.atan2(t.y - at(0)[0].y, t.cx - at(0)[0].cx)).sort((p, q) => p - q);
  for (let i = 1; i < rays.length; i++) assert.ok(rays[i] - rays[i - 1] > (20 * Math.PI) / 180, 'each word on its own ray');
  for (const t of mid) {
    const ray = Math.atan2(t.y - at(0)[0].y, t.cx - at(0)[0].cx);
    const off = (((t.rot + ray) % Math.PI) + Math.PI) % Math.PI;
    assert.ok(Math.min(off, Math.PI - off) < 0.25, `turned onto its ray (${off.toFixed(2)})`);
  }
  assert.ok(mid.every((t) => Math.abs(t.rot) <= Math.PI / 2 + 0.2), 'none upside down');
  assert.ok(mid.every((t) => t.y <= last.y + 1), 'the upper half: none lost off the bottom of the frame');
  assert.equal(at(7).length, 0, 'gone by + 7');
});

test('the Swiss red disc falls onto his head: in from the top on drop2 5.3 + 9, touching his brackets (y 376) on drop2 5.4, then bursting into 8 bars', () => {
  assert.equal(discAt(DISC.from - 1).disc, null);
  assert.ok(discAt(DISC.from).disc!.y + 150 > 0, 'its lower edge is in frame as it appears');
  assert.ok(Math.abs(discAt(DISC.to - 1e-6).disc!.y + 150 - 376) < 0.1);
  assert.equal(discAt(FULL_COMBO).disc, null);
  assert.equal(discAt(FULL_COMBO + 2).bars.length, 8);
  assert.equal(discAt(FULL_COMBO + 14).bars.length, 0, 'gone by + 14');
});

test('H2: the match cut lands on (•ω•), #111 with an amber ω (2 px #111 keyline, sheet §1.3 C), 560 px wide at (960, 520), the camera square on', () => {
  const h2 = HANDOFFS.find((h) => h.frame === GAME)!;
  const h = heroAt(GAME);
  assert.equal(h.face, h2.face);
  assert.ok(Math.abs(h.width - h2.width) < 1e-6 && Math.abs(h.x - h2.centre[0]) < 1e-6 && Math.abs(h.y - h2.centre[1]) < 1e-6, `${h.width} at (${h.x}, ${h.y})`);
  const a = gameAim(GAME);
  assert.deepEqual([a.zoom, a.x, a.y, a.roll], [1, 0, 0, 0]);
  const glyphs = gameFrame(GAME, L, emptySpectrum()).hero.glyphs.jp!;
  const omegas = glyphs.filter((g) => g.ch === 'ω');
  assert.equal(omegas.length, 2, 'the ω’s ink knock-out and the amber ω over it');
  assert.ok(Math.max(...omegas[0].color) < 0.02, 'its ink under it');
  assert.deepEqual(omegas[1].color, linear(SWISS_OMEGA.fill), 'the ω is amber');
  assert.deepEqual(omegas[1].outlineColor, linear(SWISS_OMEGA.keyline.color), 'with a #111 keyline');
  assert.ok(Math.abs(omegas[1].outline! * omegas[1].size - SWISS_OMEGA.keyline.px) < 1e-9, '2 px');
  assert.ok(glyphs.filter((g) => g.ch !== 'ω').every((g) => Math.max(...g.color) < 0.02), 'the rest #111');
});

test('his poses land on the beats: bar 5 ヽ(•ω•)ノ catching probe 1 (5.2), └(•ω•)┐ probe 2 (5.4); bar 6 (as built) ヽ(•ω•)ノ on 6.2, trembling (•ω•;) on 6.3, ＼(•ω•)／ leaping on 6.4, amber ᕕ(•ω•)ᕗ inside the tilt’s blur', () => {
  assert.equal(heroAt(GAME).face, '(•ω•)');
  assert.equal(heroAt(PROBES[0]).face, 'ヽ(•ω•)ノ');
  assert.equal(heroAt(PROBES[1]).face, '└(•ω•)┐');
  assert.equal(heroAt(NOTES_KICK[0]).face, '(•ω•)', 'bar 6 opens as built');
  assert.equal(heroAt(NOTES_KICK[1] - 1).face, '(•ω•)');
  assert.equal(heroAt(NOTES_KICK[1]).face, 'ヽ(•ω•)ノ');
  assert.equal(heroAt(NOTES_KICK[2]).face, '(•ω•;)');
  assert.notEqual(heroAt(NOTES_KICK[2] + 2).x, heroAt(NOTES_KICK[2] + 3).x, 'he trembles');
  assert.equal(heroAt(FULL_COMBO).face, '＼(•ω•)／');
  assert.ok(Math.abs(heroAt(FULL_COMBO + 11).y - 400) < 4, 'leaps to (960, 400)');
  // Iteration 2: the tilt slams (fastest on its last frames), so the swap sits 3 frames before the landing, inside its blur.
  assert.equal(heroAt(TILT.to - 4).face, '＼(•ω•)／');
  assert.equal(heroAt(TILT.to - 3).face, 'ᕕ(•ω•)ᕗ');
  assert.ok(screenMove(camera(TILT.to - 3.5).pose, camera(TILT.to - 2.5).pose) > 100, 'the swap is inside the whip’s blur');
});

// Iteration 2 (the director's ruling 7; sync review 1): the tilt into drop2 6.1 is a slam — still on drop2 5.4&, fastest on its last frame, so
// the biggest change lands on the downbeat (drop2 6.1), not on the open hat 200 ms before it — with a tiny recoil after.
test('the whip-tilt slams the camera 1300 px into the monitor (fastest into drop2 7.1, a recoil under 3 %, settled by + 12) and unwinds the zoom; then the monitor’s camera; the pan lands in the kernel at C (−2400, 1840), level', () => {
  const cy = (f: number) => 540 - gameAim(f).y;
  assert.ok(Math.abs(cy(TILT.from - 1) - 540) < 1e-9);
  assert.ok(Math.abs(cy(TILT.from) - 540) < 1e-9, 'still on drop2 5.4&');
  const steps = Array.from({ length: TILT.to - TILT.from }, (_, i) => cy(TILT.from + 1 + i) - cy(TILT.from + i));
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], `faster every frame: ${steps.map((x) => x.toFixed(0)).join(' ')}`);
  assert.ok(steps.at(-1)! > 0.2 * 1300, `the last frame drops ${steps.at(-1)!.toFixed(0)} px`);
  assert.ok(Math.abs(cy(TILT.to) - 1840) < 1e-9);
  const over = Math.max(...Array.from({ length: 48 }, (_, i) => cy(TILT.to + i / 4) - 1840));
  assert.ok(over > 5 && over < 0.03 * 1300, `a tiny recoil: ${over.toFixed(1)} px`);
  assert.ok(Math.abs(cy(TILT.to + 12) - 1840) < 1e-9, 'settled by + 12');
  assert.ok(Math.abs(gameAim(TILT.to).zoom - 1) < 1e-9 && Math.abs(gameAim(TILT.to).roll) < 1e-9);
  assert.ok(gameAim(TILT.from - 1).zoom > 1.05, 'the S30 flow zoomed in to 1.06');
  const end = gameAim(KERNEL.from - 1e-3);
  // The pan slams in at ≈ 2500 px a frame: a thousandth of a frame before drop2 8.1 it is ≈ 2.5 px short.
  assert.ok(Math.abs(end.x + 2400 + 960) < 3 && Math.abs(540 - end.y - 1840) < 1e-9 && end.zoom === 1, 'C (−2400, 1840)');
  assert.ok(Math.abs(end.roll) < 1e-3, 'level as it lands');
  for (let f = GAME; f < KERNEL.from - 0.25; f += 0.25) assert.ok(screenMove(aimPose(gameAim(f), FRONT, FOV), aimPose(gameAim(f + 0.25), FRONT, FOV)) < 800, `${f}: no jump`);
});

test('the energy standard: every frame whose camera moves more than 20 px gets ≥ 32 sub-frames, and the camera never holds still for 12 frames', () => {
  assertFastMovesSampled(GAME, KERNEL.from, camera);
  // In the crane bar the crane is the camera (the highway's own): a point of the road a bar ahead moves on screen every frame until 5.2.
  const crane = (f: number) => projectV(highwayView(f), -600, 0, d2at(6) - f)[1];
  const moved = (f: number) => (f <= CRANE.to ? Math.abs(crane(f) - crane(f - 1)) > 1e-6 : poseMoved(camera)(f));
  assertNeverStill(GAME, KERNEL.from, moved);
  // The crane's fast part gets 64 sub-frames, its tail 32.
  for (let f = GAME; f < GAME + 6; f++) assert.ok(gameTemporal(f).samples >= 64, `${f}: the crane’s fast part`);
  for (let f = GAME + 6; f < CRANE.to; f++) assert.ok(gameTemporal(f).samples >= 32, `${f}: its tail`);
});

test('the sub-frames stay in one shot: S30 and S31 share the segment that opens on the drop2 5.1 match cut (the crane, the tilt and the pan are continuous into the kernel)', () => {
  const seg = drop2Segment(GAME);
  assert.equal(seg.from, GAME);
  assert.ok(seg.to >= KERNEL.from, 'no hard cut until past the kernel');
  for (const f of range(GAME, KERNEL.from)) assert.deepEqual(drop2Segment(f), seg);
});

test('every swap made on a drum is whole on the drum’s frame: his face and the COMBO numerals', () => {
  const state = (s: number) => {
    const c = gameFrame(s, L, emptySpectrum());
    // (His face's glyphs: the lens burst's 18 px ω notches ride Defender's bars, not his face.)
    return `${(c.hero.glyphs.jp ?? []).filter((g) => g.size >= 100).map((g) => g.ch).join('')}|${(c.type.glyphs.heavy ?? []).filter((g) => (g.alpha ?? 1) > 0.999).map((g) => g.ch).join('')}`;
  };
  for (const e of [PROBES[0], PROBES[1], NOTES_KICK[1], NOTES_KICK[2], FULL_COMBO]) {
    const now = temporalSamples(e, gameTemporal(e), drop2Segment(e)).map((s) => state(s.frame));
    const was = temporalSamples(e - 1, gameTemporal(e - 1), drop2Segment(e - 1)).map((s) => state(s.frame));
    assert.equal(new Set(now.map((x) => x.split('|')[0])).size, 1, `${e}: one face through its frame`);
    assert.equal(new Set(was.map((x) => x.split('|')[0])).size, 1, `${e - 1}: one face through the frame before`);
    assert.notEqual(now[0].split('|')[0], was[0].split('|')[0], `${e}: the swap shows on its frame`);
  }
});

test('every character drawn is in GAME_STRINGS, so the atlases have it', () => {
  const sets = Object.fromEntries(Object.entries(GAME_STRINGS).map(([k, v]) => [k, new Set(v)]));
  for (const f of range(GAME, KERNEL.from, 2)) {
    const c = gameFrame(f + 0.25, L, toneSpectrum(5, GAME, partFrame('outro', 1, 1.5)));
    for (const layer of [c.back, c.monitor, c.inner, c.track, c.type, c.glass, c.glow, c.hero, c.light, c.fore])
      for (const [k, gs] of Object.entries(layer.glyphs) as [string, readonly Glyph[]][]) {
        assert.ok(sets[k], `${f}: no atlas called ${k}`);
        for (const g of gs) assert.ok(sets[k].has(g.ch), `${f}: ${g.ch} is not in the ${k} atlas`);
      }
  }
});

test('the spectrum file must be the whole song: one row per film frame (TOTAL_FRAMES) of 96 bins', () => {
  assert.throws(() => parseSpectrum(new Uint8Array(10)));
  const f = d2at(6, 2);
  assert.equal(emptySpectrum().at(f, 5), 0);
  assert.equal(toneSpectrum(5, f, f + 1).at(f, 5), 1);
  assert.equal(toneSpectrum(5, f, f + 1).at(99999, 5), 0, 'outside the film: silence');
});

test('the future’s cards stop being drawn past PAN: Drop2Game draws nothing of S30 once the monitor fills the frame', () => {
  const c = gameFrame(PAN.from, L, emptySpectrum());
  assert.equal(c.notes.length, 0);
  assert.equal(c.ridges.lines.length, 0);
});

test('Drop2Game is constructible in plain Node (no GL, no DOM in the constructor) and forwards the pure look, temporal and segment', async () => {
  const { Drop2Game } = await import('../src/scenes/drop2Game.ts');
  const g = new Drop2Game();
  for (const f of [GAME, d2at(5, 3) + 2, d2at(6, 3) + 2, TILT.from + 3, d2at(7, 2), PAN.from + 2, KERNEL.from - 1]) {
    assert.deepEqual(g.temporal(f), gameTemporal(f));
    assert.deepEqual(g.segment(f), drop2Segment(f));
    assert.ok(g.look(f).toneMapping === 'linear');
  }
  assert.equal(g.look(d2at(5, 3) + 2).crt, undefined, 'the crane bar is clean Swiss paper');
  assert.equal(g.look(d2at(6, 3) + 2).crt, undefined, 'S30 is clean Swiss paper');
  assert.ok(g.look(d2at(7, 2)).crt!.amount === 1 && Math.abs(g.look(d2at(7, 2)).crt!.curvature - 0.06) < 1e-9, 'S31 is the CRT monitor (curvature 0.06)');
  // Iteration 2: the CRT drains on the pan's own slam — still on through the blur, gone on the landing (drop2 8.1 is the kernel's look).
  const crt = (f: number) => g.look(f).crt?.amount ?? 0;
  assert.ok(crt(PAN.from + 6) > 0.95 && crt(KERNEL.from - 1) > 0.3 && crt(KERNEL.from - 1) < 0.7, `draining with the pan: ${crt(PAN.from + 6).toFixed(2)} → ${crt(KERNEL.from - 1).toFixed(2)}`);
  assert.ok(crt(KERNEL.from - 0.25) < 0.2, 'nearly gone in the landing frame’s first sub-frame');
});

// ——— Round-1 fixes (R1-11, R1-note-chips-tiny, R1-05, R1-pan-over-black) ——————————————————————————————————————————————————————

const faced = NOTES.filter((n) => n.kind === 'face' && n.at > GAME && n.at <= FULL_COMBO);
const chipOf = (f: number, n: { at: number; lane: number }) => gameFrame(f, L, emptySpectrum()).notes.find((m) => m.at === n.at && m.lane === n.lane)!;

test('R1-11: every face reaches the judgement rule big enough to read — grown 1.5–2.2× the sheet’s size over its last 200 px, ≥ 34 px (≈ 28 px of ink) on the frame before its hit', () => {
  for (const n of faced) {
    const near = chipOf(n.at - 1, n);
    const sheet = Math.min(30, 200 / L.faces(n.face!)) * near.s;
    assert.ok(near.em / sheet >= 1.5 && near.em / sheet <= 2.2, `${n.at} lane ${n.lane}: grown ${(near.em / sheet).toFixed(2)}×`);
    assert.ok(near.h / (56 * near.s) >= 1.4, 'its chip grows with it');
    assert.ok(near.em >= 34, `${n.at} lane ${n.lane}: ${n.face} at ${near.em.toFixed(1)} px`);
    assert.ok(near.em * L.faces(n.face!) <= near.w - 20 * near.s, 'the face fits its chip');
    const glyph = gameFrame(n.at - 1, L, emptySpectrum()).track.glyphs.faces!.find((g) => g.ch === n.face)!;
    assert.ok(Math.abs(glyph.size - near.em) < 1e-6, 'the face is drawn at that size');
    // 200 px up the highway (y 680) it is still the sheet's perspective chip (for the notes that ride in on the road: the crane bar's
    // first ones are already near the rule when the poster tips back).
    if (n.at - 60 < CRANE.to) continue;
    const far = range(n.at - 60, n.at).map((f) => chipOf(f, n)).find((m) => m && m.y >= 680)!;
    assert.ok(far.w / (216 * far.s) < 1.05 && far.w / (216 * far.s) > 0.95, `${n.at}: not grown before y 680`);
  }
});

test('R1-11: chips never overlap — the kick and clap hit together on drop2 5.2 and drop2 5.4 side by side, riding or popped, inside the frame, clear of the hat lane', () => {
  for (const at of [NOTES_KICK[1], FULL_COMBO]) {
    const spansOf = (rs: { x: number; w: number }[]) => rs.map((m) => [m.x - m.w / 2, m.x + m.w / 2] as const).sort((a, b) => a[0] - b[0]);
    const check = (f: number, spans: (readonly [number, number])[]) => {
      assert.ok(spans.length >= 2, `${f}: ${spans.length}`);
      for (let i = 1; i < spans.length; i++) assert.ok(spans[i][0] >= spans[i - 1][1] + 4, `${f}: chips overlap ${spans[i - 1]} / ${spans[i]}`);
      // On screen through S30's flow zoom (the roll is ≤ 0.6°).
      const z = gameAim(f).zoom;
      for (const [a, b] of spans) assert.ok(960 + (a - 960) * z >= 4 && 960 + (b - 960) * z <= 1916 && !(a < 1449 && b > 1431), `${f}: ${a.toFixed(0)}–${b.toFixed(0)} at zoom ${z.toFixed(3)}`);
    };
    for (const f of [at - 3, at - 1, at - 0.75]) check(f, spansOf(gameFrame(f, L, emptySpectrum()).notes.filter((m) => m.at === at && m.kind === 'face')));
    for (const f of [at - 0.25, at, at + 1, at + 4]) check(f, spansOf(gameFrame(f, L, emptySpectrum()).pops.filter((p) => p.at === at)));
  }
});

test('D2-GAME-PERFECT-PILE: the clap’s chip rides and pops at the kick chip’s right edge + 16 px (σ-scaled up the highway), so the pair never touches', () => {
  for (const at of [NOTES_KICK[1], FULL_COMBO]) {
    const pair = <M extends { lane: number; x: number; w: number }>(ms: M[]) => [ms.find((m) => m.lane === 0)!, ms.find((m) => m.lane === 1)!] as const;
    for (const f of range(at - 40, at - 0.5, 0.25)) {
      const ms = gameFrame(f, L, emptySpectrum()).notes.filter((m) => m.at === at && m.kind === 'face');
      const [k, c] = pair(ms);
      const gap = c.x - c.w / 2 - (k.x + k.w / 2);
      assert.ok(Math.abs(gap - 16 * c.s) < 1e-6, `${f}: riding gap ${gap.toFixed(2)} (σ ${c.s.toFixed(3)})`);
    }
    for (const f of [at - 0.25, at, at + 1, at + 3, at + 7]) {
      const [k, c] = pair(gameFrame(f, L, emptySpectrum()).pops.filter((p) => p.at === at));
      assert.ok(Math.abs(c.x - c.w / 2 - (k.x + k.w / 2) - 16) < 1e-6, `${f}: popped gap`);
    }
  }
});

test('R1-11: on its hit frame the face is not gone but pops — bigger, on its flash chip (Swiss ink: red is Defender’s, sheet §1.3 C), as PERFECT prints — and has faded by + 8', () => {
  for (const n of faced) {
    const before = chipOf(n.at - 1, n).em;
    for (const s of temporalSamples(n.at, gameTemporal(n.at), drop2Segment(n.at))) {
      const c = gameFrame(s.frame, L, emptySpectrum());
      const pop = c.track.glyphs.faces!.find((g) => g.ch === n.face && (g.alpha ?? 1) > 0.9);
      assert.ok(pop, `${n.at}: the face is on screen at ${s.frame}`);
      assert.ok(pop.size / before > 1.12 && pop.size / before < 1.35, `${n.at}: popped ${(pop.size / before).toFixed(2)}×`);
      const chip = c.pops.find((p) => p.at === n.at && p.lane === n.lane)!;
      assert.ok(chip.red, 'in its flash window');
      assert.ok(!c.track.under.some((sh) => sh.kind === 'rect' && Math.abs(sh.w - chip.w) < 1e-6 && Math.abs(sh.h - chip.h) < 1e-6 && same(sh.color, RED_PRINT)), 'its chip is never Defender’s red');
    }
    assert.ok(!gameFrame(n.at + 8, L, emptySpectrum()).track.glyphs.faces!.some((g) => g.ch === n.face && (g.alpha ?? 1) > 0.01), `${n.at}: gone by + 8`);
  }
});

test('R1-11: the notes are drawn with a short shutter — inside a frame a note slides at most 40 % of what the camera’s shutter would smear', () => {
  const n = faced[2];
  const F = n.at - 3;
  const ys = temporalSamples(F, gameTemporal(F), drop2Segment(F)).map((s) => chipOf(s.frame, n).y);
  const natural = Math.abs(project(0, 0, n.at - F - 0.25)[1] - project(0, 0, n.at - F + 0.25)[1]);
  assert.ok(Math.max(...ys) - Math.min(...ys) <= 0.4 * natural + 1e-6 || natural === 0, `${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} px vs ${natural.toFixed(2)}`);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0, 'but it still moves (no stepping)');
});

test('R1-11: down the highway the future is labelled, Swiss style — Defender v2.0’s switch (a red barrier), the crash’s bar · CRASH and the last bar · END at their places, readable; the crash’s silence lies flat on the poster', () => {
  for (const f of [CRANE.to, d2at(5, 3) + 2, TILT.from - 2]) {
    const labels = horizonLabels(f);
    assert.deepEqual(labels.map((l) => l.kind), ['defender', 'crash', 'end']);
    const v = highwayView(f);
    for (const l of labels) {
      const d = (l.kind === 'defender' ? BARRIER.at : l.kind === 'crash' ? CRASH : partEnd('outro')) - f;
      const [ax, ay] = projectV(v, -HIGHWAY.halfWidth, 0, d);
      assert.ok(Math.abs(l.anchor[0] - ax) < 1e-6 && Math.abs(l.anchor[1] - ay) < 1e-6, `${l.kind} anchored on the highway’s edge at its frame`);
      assert.ok(l.size >= 20 && l.at[0] > 40 && l.at[1] > 100 && l.at[1] < 400 && l.align === 1, `${l.kind} readable, on the upper left margin`);
    }
    for (let i = 1; i < labels.length; i++) assert.ok(Math.abs(labels[i - 1].at[1] - labels[i].at[1]) >= labels[0].size * 1.1, `${f}: the labels do not overlap`);
  }
  // In plan (the cut) each label sits on its own rule just inside the highway's left edge, and the whole song is in sight: the crash's
  // silence a flat gap, the ending beyond it.
  for (const l of horizonLabels(GAME)) {
    assert.equal(l.align, 0, `${l.kind}: left-aligned on its rule`);
    assert.ok(l.at[0] > l.anchor[0] && l.at[0] - l.anchor[0] < 40 && Math.abs(l.at[1] - l.anchor[1]) < 20, `${l.kind}: on its rule`);
  }
  const ys = horizonLabels(GAME).map((l) => l.at[1]);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i - 1] - ys[i] >= 20, 'nearest lowest, apart');
  const ts = ridgesAt(GAME, emptySpectrum()).lines.map((l) => l.t);
  assert.equal(ts.filter((t) => t >= CRASH && t < DROP2_END).length, 0, 'the silence is a flat gap');
  assert.ok(ts.some((t) => t >= OUTRO_START), 'and the ending lies beyond it');
  const barrier = ridgesAt(GAME, emptySpectrum()).lines.filter((l) => l.barrier);
  assert.deepEqual(barrier.map((l) => l.t), [SWITCH.from], 'the switch is the red barrier');
  const chars = new Set(GAME_STRINGS.bold);
  for (const l of horizonLabels(GAME)) for (const ch of l.text) assert.ok(ch === ' ' || chars.has(ch), `${ch} is in the bold atlas`);
});

test('F: over the whip-pan the camera rolls (−1.5° at its middle) and lands level, the look drains into the kernel’s (KERNEL_LOOK_IN), and the kernel’s nave rides in under him', async () => {
  const G = await import('../src/shots/drop2Game.ts');
  const { KERNEL_LOOK_IN, NAVE_PILLARS, PAN_STREAKS } = await import('../src/shots/drop2Overflow.ts');
  assert.equal(gameAim(PAN.from - 1.5).roll, 0);
  const mid = Math.min(...range(PAN.from, KERNEL.from, 0.25).map((f) => gameAim(f).roll));
  assert.ok(Math.abs(mid + (1.5 * Math.PI) / 180) < 2e-3, `it rolls with the pan: ${((mid * 180) / Math.PI).toFixed(2)}°`);
  assert.ok(Math.abs(gameAim(KERNEL.from - 1e-3).roll) < 1e-3, 'level as it lands');
  const look = G.gameLook(KERNEL.from - 1e-3); // (iteration 2: on the pan's slam, it lands with it)
  assert.ok(Math.abs(look.bloom.intensity - KERNEL_LOOK_IN.bloom.intensity) < 0.05 && Math.abs(look.bloom.threshold - KERNEL_LOOK_IN.bloom.threshold) < 0.03, 'the kernel’s bloom');
  const c = gameFrame(PAN.from + 4, L, emptySpectrum());
  assert.ok(c.glass.under.length >= NAVE_PILLARS.length + PAN_STREAKS.length && c.glow.under.length > 2 * (NAVE_PILLARS.length + PAN_STREAKS.length), 'the nave’s pillars and the lines in the dark');
  const landing = gameFrame(KERNEL.from - 0.25, L, emptySpectrum());
  assert.ok(landing.hero.glyphs.rounded!.length === 5 && landing.hero.glyphs.rounded!.every((g) => '(•ω•)'.includes(g.ch)), 'he lands as (•ω•): no arms left');
  const midSwap = gameFrame(PAN.from + 7.5, L, emptySpectrum()); // the middle of TUBE_SWAP (where the spin is fast)
  assert.ok(midSwap.hero.glyphs.rounded!.some((g) => g.ch === 'ᕕ' && (g.alpha ?? 1) < 0.8 && (g.alpha ?? 1) > 0.2), 'the arms fade in the blur');
  // His screen rotation lands upright: his world turn makes up for the camera’s roll.
  const h = heroAt(KERNEL.from - 1e-3);
  assert.ok(Math.abs(h.rot + gameAim(KERNEL.from - 1e-3).roll - 2 * Math.PI) < 0.01, `upright on screen (${h.rot})`);
});

test('item C on the game: Defender’s red stays his (the now-line, probes, scan bars, the lens and its burst, the barrier, the bar numerals, the ticker); his COMBO and his hits are Swiss ink; every red thing he hits takes his amber ω', () => {
  const amber = linear(SWISS_OMEGA.fill);
  // The probes: caught, stamped with his ω (snapping in over a few frames), still red.
  for (const at of PROBES) {
    const c = gameFrame(at + 3, L, emptySpectrum());
    const st = c.track.glyphs.faces!.filter((g) => g.ch === 'ω' && same(g.color, amber));
    assert.equal(st.length, 1, `${at}: one amber ω stamped`);
    assert.ok(c.track.under.some((sh) => sh.kind === 'ellipse' && same(sh.color, RED_PRINT)), `${at}: on the red disc`);
  }
  // The scan bars of bar 6's roll ride red and are notched.
  const roll = gameFrame(ROLL31[0] - 8, L, emptySpectrum());
  assert.ok(roll.notes.some((n) => n.kind === 'roll'));
  assert.ok(roll.track.under.filter((sh) => sh.kind === 'rect' && same(sh.color, RED_PRINT)).length >= 2, 'the scan bars are red');
  assert.ok(gameFrame(ROLL31[0] + 1, L, emptySpectrum()).track.glyphs.faces!.some((g) => g.ch === 'ω' && same(g.color, amber)), 'notched on the hit');
  // The lens's burst: 8 red bars, each with his amber ω.
  const burst = gameFrame(FULL_COMBO + 3, L, emptySpectrum());
  assert.equal(burst.hero.glyphs.jp!.filter((g) => g.ch === 'ω' && g.size < 40).length, 8);
  // COMBO is ink (a pale ghost under FULL COMBO), never red.
  for (const f of [GAME + 30, NOTES_KICK[1] + 3, FULL_COMBO + 6]) {
    const heavy = gameFrame(f, L, emptySpectrum()).type.glyphs.heavy!;
    assert.ok(heavy.every((g) => !same(g.color, RED_PRINT) && !(g.color[0] > 0.5 && g.color[1] < 0.1)), `${f}: COMBO is not red`);
  }
  // Defender's ticker: red type under SCORE.
  const tk = gameFrame(PROBES[0] + 6, L, emptySpectrum()).type.glyphs.mono!;
  assert.ok(tk.length > 10 && tk.every((g) => same(g.color, RED_PRINT)), 'the ticker is Defender’s red');
});
