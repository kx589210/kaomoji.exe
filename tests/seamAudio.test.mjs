// The continuity plan's seam QA tools (docs/2026-10-03-continuity-plan-v07.md FW1–FW6; scripts/README-checks.md): check-seam-audio.mjs (does
// the music cross a seam), check-seams.mjs's anchor and dead-picture reports, and seam-clips.mjs's helpers — on synthetic events, WAVs and
// tiny clips, with no render of the film.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { writeWav } from '../scripts/audio/wav.mjs';
import { powerPrefix } from '../scripts/check-loudness.mjs';
import {
  BAR,
  BEAT,
  EVENT_SEAMS,
  FIX_SEAMS,
  HOOK_EXEMPT,
  HOOK_TABLE,
  KICK,
  PLAN_SEAMS,
  RHYTHM,
  breathIn,
  hookLevels,
  isHookKind,
  judgeHook,
  levelDb,
  lufsOver,
  normKind,
  parseSeams,
  plateRestarts,
  roomOf,
  roomStep,
  seamReasons,
  seamVoices,
} from '../scripts/check-seam-audio.mjs';
import { anchorHold, bestAnchor, classCentroids, deadRuns, frameLevels, hsv } from '../scripts/check-seams.mjs';
import { bmp, drawText, seamRuns, seamSound, textWidth } from '../scripts/seam-clips.mjs';
import { encodePng } from '../scripts/lib/png.mjs';
import { ffmpegPath } from '../scripts/lib/remotion.mjs';

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const SR = 48000;
const SPF = SR / 60;
let dir;
before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-seamaudio-'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const tone = (n, hz, amp, phase = 0) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR + phase));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);

// ------------------------------------------------------------------------------------------------------------------- the voices

test('a kind is its voice whichever section plays it: the section prefix goes; drums and kicks are told apart', () => {
  assert.deepEqual(['cskick', 'clkick', 'd2kick', 'trkick', 'outkick', 'brhook', 'd1crack', 'cs', 'power'].map(normKind), ['kick', 'kick', 'kick', 'kick', 'kick', 'hook', 'crack', 'cs', 'power']);
  for (const k of ['cskick', 'clhat', 'd2openhat', 'clsnare', 'd2shaker', 'd2taiko', 'trroll', 'clcrash', 'd2tamb']) assert.ok(RHYTHM.test(normKind(k)), k);
  for (const k of ['cslead', 'clpiano', 'd2koto', 'clstab', 'brtink', 'outheart']) assert.ok(!RHYTHM.test(normKind(k)), k);
  assert.ok(KICK.test('d2kick') && KICK.test('clflamkick') && !KICK.test('d2revkick') && !KICK.test('clsnare'));
  assert.ok(isHookKind('d2lead') && isHookKind('d2dominohook') && isHookKind('clhook') && !isHookKind('d2domino'));
});

test('across a seam: the old world ringing on (L), the new one arriving early (J), the new kinds on the downbeat and the kick spine', () => {
  const S = 2112;
  const ev = [
    { frame: S - 80, kind: 'cstink' },
    { frame: S + 6, kind: 'cstink' }, // rings on into the club: an L cut
    { frame: S - 60, kind: 'cslead' }, // gone after the seam
    { frame: S - 6, kind: 'clpiano' }, // first heard in the beat before, kept by the new bar: a J cut
    { frame: S + 30, kind: 'clpiano' },
    { frame: S - 12, kind: 'clhorn' }, // early but never again: no J cut
    { frame: S - 24, kind: 'cskick' },
    { frame: S, kind: 'clkick' },
    { frame: S, kind: 'clcrash' },
    { frame: S + 1, kind: 'clstab' },
    { frame: S + 2, kind: 'cldot' },
    { frame: S + 40, kind: 'clhat' }, // drums never count as carry
    { frame: S - 50, kind: 'cshat' },
  ];
  const v = seamVoices(ev, S);
  assert.deepEqual(v.tail, ['tink']);
  assert.deepEqual(v.prelap, ['piano']);
  // kick was heard (cskick → kick), the rest is new on 1.
  assert.deepEqual(v.fresh, ['crash', 'dot', 'stab']);
  assert.deepEqual(v.kick, { bar: true, before: true, after: true });
  assert.equal(seamVoices(ev.filter((e) => e.frame !== S), S).kick.after, false);
});

test('the loop seam reads the film’s first bar after its last', () => {
  const total = 5856;
  const ev = [{ frame: total - 30, kind: 'outtick' }, { frame: 10, kind: 'tick' }, { frame: 0, kind: 'power' }];
  const v = seamVoices(ev, total, { total });
  assert.deepEqual(v.tail, ['tick']);
  assert.deepEqual(v.fresh, ['power']);
});

// --------------------------------------------------------------------------------------------------------------------- the room

test('the room: a 1 kHz tone’s centroid is 1 kHz, its side/mid follows the channels, an octave up is a step of one octave', () => {
  const n = SR / 2;
  const t1 = tone(n, 1000, 0.3);
  const r1 = roomOf(t1, Float32Array.from(t1, (v) => 0.5 * v), SR, 0, n);
  near(r1.centroid, 1000, 25, 'centroid');
  near(r1.sideMid, 20 * Math.log10(0.25 / 0.75), 0.01, 'side/mid');
  const t2 = tone(n, 2000, 0.3);
  const r2 = roomOf(t2, Float32Array.from(t2, (v) => 0.5 * v), SR, 0, n);
  const s = roomStep(r1, r2);
  near(s.centroid, 1, 0.05, 'octave step');
  near(s.sideMid, 0, 0.01, 'same width');
  assert.ok(Number.isNaN(roomStep(r1, roomOf(new Float32Array(n), new Float32Array(n), SR, 0, n)).centroid), 'silence has no centroid');
});

test('LUFS-M of a beat: a −20 dBFS 997 Hz tone in both channels reads −20; a window over the loop joins the end to the start', () => {
  const n = SR * 2;
  const x = tone(n, 997, 0.1);
  const p = powerPrefix([x, x], SR);
  near(lufsOver(p, SR / 2, SR / 2 + 0.4 * SR), -20, 0.1, 'momentary');
  const pm = (p[n] - p[n - 1000] + p[1000] - p[0]) / 2000;
  near(lufsOver(p, n - 1000, n + 1000), -0.691 + 10 * Math.log10(pm), 1e-9, 'wrapped');
});

test('a breath: a gated window or 50 ms under −60 dBFS; the plate restarting under live music is hot, at a designed silence it is not', () => {
  const n = SPF * 200;
  const L = tone(n, 440, 0.2);
  const R = L.slice();
  assert.equal(breathIn(L, R, SR, 50, 100), null);
  assert.equal(breathIn(L, R, SR, 50, 100, { windows: [{ from: 90, to: 120 }] }), 90);
  for (let i = 120 * SPF; i < 130 * SPF; i++) L[i] = R[i] = 0;
  near(breathIn(L, R, SR, 100, 140), 120, 0.5, 'the first 50 ms window wholly in the silence (10 ms steps)');
  const [live, gated, designed] = plateRestarts([60, 120, 150], L, R, SR, { windows: [{ from: 140, to: 145 }] });
  assert.equal(live.hot, true);
  assert.equal(gated.hot, false, 'the mix is silent after the cut');
  assert.deepEqual([designed.hot, designed.designed], [false, true], 'a silence ended 5 frames before');
  near(levelDb(L, R, 0, SPF), 20 * Math.log10(0.2 / Math.SQRT2), 0.05, 'level dBFS');
});

// --------------------------------------------------------------------------------------------------------------------- the hook

test('the hook’s level is the mix minus the mix without it, in 500 Hz – 4 kHz: an equal, unrelated voice beside it reads −3 dB', () => {
  const frames = 192;
  const n = frames * SPF;
  const bus = (x) => ({ L: x, R: x });
  const hook = tone(n, 1000, 0.1);
  const other = tone(n, 1000, 0.1, Math.PI / 2);
  const full = { vox: bus(hook), drums: bus(other), sub: new Float32Array(n) };
  const none = { vox: bus(new Float32Array(n)), drums: bus(other), sub: new Float32Array(n) };
  const rows = hookLevels(full, none, SR, { from: 0, to: frames });
  assert.equal(rows.length, 2);
  for (const r of rows.slice(1)) near(r.hookDb, -3.01, 0.15, 'hook');
  const quiet = hookLevels({ ...full, vox: bus(Float32Array.from(hook, (v) => v / 10)) }, none, SR, { from: 0, to: frames });
  near(quiet[1].hookDb, 10 * Math.log10(0.01 / 1.01), 0.15, '−20 dB hook');
});

test('a hook bar is judged as the plan’s table sets it, and only reported elsewhere', () => {
  const loud = HOOK_TABLE.loud.from;
  assert.equal(judgeHook({ from: loud, hookDb: -5 }), 'ok');
  assert.equal(judgeHook({ from: loud, hookDb: -6.5 }), 'LOW');
  assert.equal(judgeHook({ from: HOOK_TABLE.ghost[0], hookDb: -20 }), 'QUIET');
  assert.equal(judgeHook({ from: HOOK_TABLE.ghost[0], hookDb: -13 }), 'ok');
  assert.equal(judgeHook({ from: HOOK_TABLE.statement.bar, hookDb: -Infinity }, { statement: false }), 'NONE');
  assert.equal(judgeHook({ from: HOOK_TABLE.statement.bar, hookDb: -30 }, { statement: true }), 'ok');
  assert.equal(judgeHook({ from: HOOK_EXEMPT[0].from, hookDb: -Infinity }), 'exempt');
  assert.equal(HOOK_EXEMPT[0].from, 2784, 'the FALL glass world, break 1 (2688 on the 61-bar map)');
  assert.equal(judgeHook({ from: 2400, hookDb: -27 }), 'quiet');
  assert.equal(judgeHook({ from: 2400, hookDb: -27 }, { all: true }), 'QUIET');
  assert.equal(judgeHook({ from: 2592, hookDb: -99 }, { breaths: [2664] }), 'breath');
});

// --------------------------------------------------------------------------------------------------------------------- verdicts

test('a seam fails without a carry, with too many new kinds or a jump in the room, or a hot plate; events and breaths are exempt from new@1 and room', () => {
  const base = { tail: [], prelap: ['piano'], fresh: ['a', 'b', 'c'], room: { centroid: 0.2, sideMid: -1 }, hotPlate: [], event: false, breath: false };
  assert.deepEqual(seamReasons(base), []);
  assert.deepEqual(seamReasons({ ...base, prelap: [] }), ['no carry']);
  assert.deepEqual(seamReasons({ ...base, fresh: ['a', 'b', 'c', 'd', 'e'] }), ['5 new kinds on 1']);
  assert.deepEqual(seamReasons({ ...base, room: { centroid: -0.6, sideMid: 3.5 } }), ['side/mid step', 'centroid step']);
  assert.deepEqual(seamReasons({ ...base, hotPlate: [2112] }), ['hot plate restart 2112']);
  assert.deepEqual(seamReasons({ ...base, event: true, fresh: Array(9).fill('x'), room: { centroid: 3, sideMid: 20 } }), []);
  assert.deepEqual(seamReasons({ ...base, breath: true, prelap: [], fresh: Array(9).fill('x'), room: { centroid: 3, sideMid: 20 } }), []);
});

test('the plan’s seams: §2’s are judged, the keep list reported; listed frames are judged unless they are on the keep list', () => {
  const map = { parts: [{ from: 0 }, { from: 480 }], total: 5856 };
  const plan = parseSeams('plan', map);
  assert.equal(plan.length, PLAN_SEAMS.length);
  assert.deepEqual(plan.filter((s) => s.judged).map((s) => s.frame), FIX_SEAMS);
  assert.deepEqual(plan.filter((s) => s.event).map((s) => s.frame), EVENT_SEAMS);
  assert.deepEqual(parseSeams('4320,96,300:event', map), [
    { frame: 4320, event: false, judged: true },
    { frame: 96, event: false, judged: false },
    { frame: 300, event: true, judged: true },
  ]);
  assert.ok(parseSeams('96', map, { judgeAll: true })[0].judged);
  assert.equal(PLAN_SEAMS[PLAN_SEAMS.length - 1], 6048, 'the loop (TOTAL_FRAMES on the 63-bar map)');
  for (const f of [2112, 2208, 5472, 5568]) assert.ok(FIX_SEAMS.includes(f), `v08's bridge line ${f} is judged`);
  assert.ok(PLAN_SEAMS.every((f) => f % BAR === 0) && BEAT * 4 === BAR);
});

test('check-seam-audio on a WAV and an event list: a carried seam passes, a bare one fails (exit code 1)', () => {
  const frames = 480;
  const n = frames * SPF;
  const L = Float32Array.from(tone(n, 440, 0.2), (v, i) => v + 0.05 * Math.sin((2 * Math.PI * 2000 * i) / SR));
  const R = Float32Array.from(L, (v, i) => v + 0.03 * Math.sin((2 * Math.PI * 700 * i) / SR));
  const wav = path.join(dir, 'mix.wav');
  writeWav(wav, L, R, SR, { dither: false });
  const S = 288;
  const evFile = (name, ev) => {
    const f = path.join(dir, name);
    fs.writeFileSync(f, JSON.stringify(ev));
    return f;
  };
  const carried = evFile('carried.json', [{ frame: S - 40, kind: 'cspad' }, { frame: S + 10, kind: 'cspad' }, { frame: S, kind: 'clcrash' }]);
  const bare = evFile('bare.json', [{ frame: S - 40, kind: 'cspad' }, { frame: S, kind: 'clcrash' }]);
  const run = (events) => {
    const json = path.join(dir, `${path.basename(events)}.out.json`);
    const r = spawnSync(process.execPath, [path.join(SCRIPTS, 'check-seam-audio.mjs'), wav, '--events', events, '--no-hook', '--seams', String(S), '--json', json], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr, json: fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : null };
  };
  const ok = run(carried);
  assert.equal(ok.code, 0, ok.out);
  assert.deepEqual(ok.json.seams[0].tail, ['pad']);
  assert.ok(Math.abs(ok.json.seams[0].room.sideMid) < 0.5 && Math.abs(ok.json.seams[0].room.centroid) < 0.05, JSON.stringify(ok.json.seams[0].room));
  const fail = run(bare);
  assert.equal(fail.code, 1, fail.out);
  assert.deepEqual(fail.json.seams[0].reasons, ['no carry']);
});

// ------------------------------------------------------------------------------------------------------------------ the anchors

test('colour classes: the hero’s amber and the Defender’s red, their centroids in layout px', () => {
  const [h, s, v] = hsv(255, 178, 62);
  assert.ok(h > 35 && h < 37 && s > 0.75 && v === 1);
  const W = 48;
  const H = 27;
  const rgb = Buffer.alloc(W * H * 3, 20);
  for (let y = 10; y < 14; y++) for (let x = 20; x < 24; x++) rgb.set([255, 178, 62], (y * W + x) * 3);
  for (let y = 2; y < 4; y++) for (let x = 2; x < 4; x++) rgb.set([232, 64, 43], (y * W + x) * 3);
  const c = classCentroids(rgb, W, H, 1920);
  near(c.amber.x, 22 * 40, 1e-9, 'amber x');
  near(c.amber.y, 12 * 40, 1e-9, 'amber y');
  near(c.amber.share, 16 / (W * H), 1e-12, 'amber share');
  near(c.red.x, 3 * 40, 1e-9, 'red x');
});

test('an anchor holds while it stays within 40 px of its place on f − 1; it fails on a jump at the line or when it is gone', () => {
  const at = 12;
  const still = (x) => ({ share: 0.01, x, y: 500 });
  const track = Array.from({ length: 25 }, (_, k) => still(k < 5 ? 300 : 800 + (k - 5) * 3));
  // From index 5 the anchor drifts 3 px a frame: within 40 px of its place on f − 1 (index 11: 818) from 805 … 857.
  const r = anchorHold(track, at);
  assert.deepEqual([r.from, r.to, r.hold], [5, 24, 20]);
  near(r.jump, 3, 1e-9, 'jump');
  const jumped = track.map((p, k) => (k >= at ? still(p.x + 200) : p));
  assert.deepEqual([anchorHold(jumped, at).hold, Math.round(anchorHold(jumped, at).jump)], [0, 203]);
  const gone = track.map((p, k) => (k >= at ? { share: 0, x: NaN, y: NaN } : p));
  assert.equal(anchorHold(gone, at).hold, 0);
  assert.ok(Number.isNaN(anchorHold(gone, at).jump));
  const best = bestAnchor({ amber: gone, red: track }, at);
  assert.deepEqual([best.cls, best.hold], ['red', 20]);
  const none = bestAnchor({ amber: gone, red: jumped }, at);
  assert.equal(none.hold, 0);
});

test('dead picture under live music: 12 or more still frames while the mix plays, never inside the allowed span', () => {
  const change = Float64Array.from({ length: 60 }, (_, i) => (i >= 20 && i < 40 ? 1 : 5));
  const loud = new Float64Array(60).fill(-12);
  assert.deepEqual(deadRuns(change, loud, { start: 1000, allow: [] }), [{ from: 1020, to: 1039, frames: 20, meanChange: 1 }]);
  assert.deepEqual(deadRuns(change, loud.map((v, i) => (i >= 30 ? -40 : v)), { start: 1000, allow: [] }), [], 'music stops at 1030: 10 frames left');
  assert.deepEqual(deadRuns(change, loud, { start: 1000, allow: [[1015, 1030]] }), [], '1031–1039 is only 9 frames');
  const L = new Float32Array(SPF * 10).fill(0.1);
  near(frameLevels(L, L, SR, 10)[5], -20, 1e-6, 'level');
});

test('check-seams on a clip with sound: an amber anchor holds across the seam, a still second half is dead under the music (fails with --strict)', () => {
  const W = 96;
  const H = 54;
  const d = path.join(dir, 'deadclip');
  fs.mkdirSync(d);
  for (let f = 0; f < 60; f++) {
    const data = Buffer.alloc(W * H * 3);
    for (let p = 0; p < W * H; p++) data.set([30, 30, 60], p * 3);
    for (let y = 30; y < 44; y++) for (let x = 40; x < 56; x++) data.set([255, 178, 62], (y * W + x) * 3);
    const x0 = 4 * Math.min(f, 29) % 70;
    for (let y = 4; y < 18; y++) for (let x = x0; x < x0 + 16; x++) data.set([255, 255, 255], (y * W + x) * 3);
    fs.writeFileSync(path.join(d, `f${f}.png`), encodePng({ width: W, height: H, channels: 3, data }));
  }
  const wav = path.join(dir, 'dead.wav');
  const t = tone(SR, 1000, 0.25);
  writeWav(wav, t, t, SR, { dither: false });
  const file = path.join(dir, 'dead.mp4');
  execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-framerate', '60', '-i', path.join(d, 'f%d.png'), '-i', wav, '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', file]);
  const run = (extra) => {
    const json = path.join(dir, `dead-${extra.length}.json`);
    const r = spawnSync(process.execPath, [path.join(SCRIPTS, 'check-seams.mjs'), file, '--seams', '20', '--no-sheets', '--dead-allow', '', '--json', json, ...extra], { encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr, json: fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : null };
  };
  const plain = run([]);
  assert.equal(plain.code, 0, plain.out);
  const a = plain.json.seams[0].anchor;
  assert.equal(a.cls, 'amber');
  assert.equal(a.hold, 25, 'the whole ±12 window');
  assert.equal(plain.json.dead.length, 1, plain.out);
  assert.ok(plain.json.dead[0].from <= 31 && plain.json.dead[0].to >= 55, JSON.stringify(plain.json.dead));
  const strict = run(['--strict']);
  assert.equal(strict.code, 1, strict.out);
});

// ---------------------------------------------------------------------------------------------------------------- the seam clips

test('a seam’s two bars wrap round the loop; its sound wraps too', () => {
  const { frames, runs } = seamRuns(5856, 96, 5856);
  assert.deepEqual([frames[0], frames[95], frames[96], frames[191]], [5760, 5855, 0, 95]);
  assert.deepEqual(runs.map((r) => [r.from, r.count, r.at]), [[5760, 96, 0], [0, 96, 96]]);
  assert.deepEqual(seamRuns(2112, 96, 5856).runs.map((r) => [r.from, r.count]), [[2016, 192]]);
  const L = Float32Array.from({ length: SPF * 300 }, (_, i) => i);
  const s = seamSound({ sampleRate: SR, channels: [L, L] }, 300, 10);
  assert.equal(s.L.length, 20 * SPF);
  assert.deepEqual([s.L[0], s.L[10 * SPF - 1], s.L[10 * SPF]], [290 * SPF, 300 * SPF - 1, 0]);
});

test('frames go to ffmpeg as BMP (bottom-up BGR) and labels are drawn in a bitmap font', () => {
  const rgb = Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9]);
  const b = bmp(rgb, 2, 2);
  assert.equal(b.toString('latin1', 0, 2), 'BM');
  assert.equal(b.length, 54 + 8 * 2);
  assert.deepEqual([...b.subarray(54, 60)], [255, 0, 0, 9, 9, 9], 'the bottom row first, as BGR');
  assert.deepEqual([...b.subarray(62, 68)], [0, 0, 255, 0, 255, 0]);
  const img = { width: 40, height: 10, data: Buffer.alloc(40 * 10 * 3) };
  drawText(img, 0, 0, 'A 1', 1, [255, 255, 255]);
  assert.equal(img.data[(0 * 40 + 1) * 3], 255, 'A’s apex');
  assert.equal(img.data[(0 * 40 + 0) * 3], 0);
  assert.equal(textWidth('A 1', 2), 22);
});
