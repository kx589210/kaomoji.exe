// The review checks (scripts/check-sync.mjs, check-flash.mjs, check-seams.mjs, check-loudness.mjs; scripts/README-checks.md):
// their measures on synthetic arrays, and each command run end to end on tiny synthetic clips and WAVs (no renders).
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
import { failingSpans, redValue, transitions, windows } from '../scripts/check-flash.mjs';
import { integrated, kWeightCoefficients, loudestWindow, measure, powerPrefix, truePeakEnvelope } from '../scripts/check-loudness.mjs';
import { blockChange, brightOverlap, judgeSeam } from '../scripts/check-seams.mjs';
import { drumEvents, judgeEvent, tally } from '../scripts/check-sync.mjs';
import { encodePng } from '../scripts/lib/png.mjs';
import { ffmpegPath } from '../scripts/lib/remotion.mjs';
import { cliArgs, filmMap, grabFrames, probe } from '../scripts/lib/review.mjs';

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const W = 96;
const H = 54;
let dir;

let runs = 0;
/** Runs a check; returns { code, out, json } (json = what it wrote to --json). */
function run(script, args) {
  const json = path.join(dir, `${script}-${++runs}.json`);
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args, '--json', json], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr, json: fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : null };
}

/** A 60 fps H.264 clip (lossless, yuv420p) of `n` W × H frames; paint(f, set) colours pixels with set(x, y, [r, g, b]). */
function clip(name, n, paint) {
  const d = path.join(dir, name);
  fs.mkdirSync(d);
  for (let f = 0; f < n; f++) {
    const data = Buffer.alloc(W * H * 3);
    paint(f, (x, y, c) => data.set(c, (y * W + x) * 3));
    fs.writeFileSync(path.join(d, `f${f}.png`), encodePng({ width: W, height: H, channels: 3, data }));
  }
  const out = path.join(dir, `${name}.mp4`);
  execFileSync(ffmpegPath(), ['-y', '-v', 'error', '-framerate', '60', '-i', path.join(d, 'f%d.png'), '-c:v', 'libx264', '-qp', '0', '-pix_fmt', 'yuv420p', out]);
  return out;
}

const fill = (set, c, x0 = 0, y0 = 0, x1 = W, y1 = H) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c);
};

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kx-checks-'));
});
after(() => fs.rmSync(dir, { recursive: true, force: true }));

// ------------------------------------------------------------------------------------------------------------------------ shared

test('a negative number after an option is glued to it, so parseArgs takes it as the value', () => {
  assert.deepEqual(cliArgs(['a.wav', '--max-tp', '-1.5', '--bars', '--start', '-3', '--x=-2']), ['a.wav', '--max-tp=-1.5', '--bars', '--start=-3', '--x=-2']);
});

test('the film map gives every part its frames and labels a frame by part, bar and beat', async () => {
  const map = await filmMap();
  assert.equal(map.parts[0].from, 0);
  for (let i = 1; i < map.parts.length; i++) assert.equal(map.parts[i].from, map.parts[i - 1].to, `${map.parts[i].id} follows ${map.parts[i - 1].id}`);
  assert.equal(map.parts.at(-1).to, map.total);
  const p = map.parts[1];
  assert.equal(map.label(p.from + 96 + 2 * 24 + 6).trim(), `${p.from / 96 + 2} ${p.id} 2.3+6`);
  assert.deepEqual(map.range(p.id), { id: p.id, from: p.from, to: p.to });
  assert.deepEqual(map.range('3-4'), { id: 'bars 3–4', from: 192, to: 384 });
  assert.equal(map.start(p.id), p.from);
  assert.equal(map.start('120'), 120);
});

test('frames grabbed by seeking are exactly the frames asked for (no repeat after the seek)', async () => {
  const file = clip('ramp', 60, (f, set) => fill(set, [10 + 4 * f, 10 + 4 * f, 10 + 4 * f]));
  assert.equal(probe(file).frames, 60);
  const { frames } = await grabFrames(file, [52, 3, 37, 38, 39]);
  for (const f of [3, 37, 38, 39, 52]) {
    const rgb = frames.get(f);
    let s = 0;
    for (const v of rgb) s += v;
    assert.ok(Math.abs(s / rgb.length - (10 + 4 * f)) < 1.5, `frame ${f}: mean ${(s / rgb.length).toFixed(1)}, want ${10 + 4 * f}`);
  }
});

// -------------------------------------------------------------------------------------------------------------------------- sync

test('a drum is a hit when its own frame is the accent, close one frame off, a miss further off, none without one', () => {
  const m = new Array(60).fill(1);
  m[20] = 5; // on the drum
  m[31] = 5; // a launch one frame after the drum on 30
  m[43] = 5; // three frames late for the drum on 40
  assert.equal(judgeEvent(m, 20).verdict, 'hit');
  assert.deepEqual([judgeEvent(m, 30).verdict, judgeEvent(m, 30).offset], ['close', 1]);
  assert.deepEqual([judgeEvent(m, 40).verdict, judgeEvent(m, 40).offset], ['miss', 3]);
  assert.equal(judgeEvent(m, 52).verdict, 'none');
  assert.equal(judgeEvent(m, 0).verdict, 'edge');
});

test('a change rising over two frames still counts for the drum when its frame carries most of the peak', () => {
  const m = new Array(40).fill(1);
  m[20] = 4.5;
  m[21] = 5;
  assert.equal(judgeEvent(m, 20).verdict, 'hit');
  m[20] = 2;
  assert.equal(judgeEvent(m, 20).verdict, 'close');
});

test('the base is the motion before the drum: a busy shot needs a bigger change to accent', () => {
  const m = new Array(40).fill(10);
  m[20] = 12; // 1.2 × the base of 10
  assert.equal(judgeEvent(m, 20).verdict, 'none');
  m[20] = 14;
  assert.equal(judgeEvent(m, 20).verdict, 'hit');
  assert.equal(judgeEvent(m, 20, { accent: 1.5 }).verdict, 'none');
});

test('drum events merge per frame and leave out hats and reversed sounds', () => {
  const at = (f) => Math.round((f / 60) * 48000);
  const ev = drumEvents(
    [
      { kind: 'brkick', at: at(2016) },
      { kind: 'brclap', at: at(2016) },
      { kind: 'brclap', at: at(2016) },
      { kind: 'brhat', at: at(2028) },
      { kind: 'brrevsnare', at: at(2040) },
      { kind: 'outheart', at: at(3300) },
      { kind: 'kick', at: at(384) },
    ],
    { sr: 48000 },
  );
  assert.deepEqual(ev, [
    { frame: 384, kinds: ['kick'] },
    { frame: 2016, kinds: ['brkick', 'brclap'] },
    { frame: 3300, kinds: ['outheart'] },
  ]);
  const t = tally([{ verdict: 'hit' }, { verdict: 'close' }, { verdict: 'miss' }, { verdict: 'none' }, { verdict: 'edge' }]);
  assert.deepEqual({ events: t.events, onBeat: t.onBeat, edge: t.edge }, { events: 4, onBeat: 0.5, edge: 1 });
});

test('check-sync on a clip: hit, close, miss and none, and the on-beat share decides the exit code', () => {
  // A white square on grey appears on 30 (the drum on 30), goes on 61 (drum on 60), comes back on 93 (drum on 90); nothing on 110.
  const file = clip('sync', 120, (f, set) => {
    fill(set, [64, 64, 64]);
    if ((f >= 30 && f < 61) || f >= 93) fill(set, [255, 255, 255], 36, 18, 60, 36);
  });
  const events = path.join(dir, 'events.json');
  fs.writeFileSync(events, JSON.stringify([30, 60, [90, 'kick'], { frame: 110, kind: 'clap' }]));
  const loose = run('check-sync.mjs', [file, '--events', events, '--min-on-beat', '0.5']);
  assert.equal(loose.code, 0, loose.out);
  assert.deepEqual(
    loose.json.events.map((e) => [e.frame, e.verdict, e.offset]),
    [
      [30, 'hit', 0],
      [60, 'close', 1],
      [90, 'miss', 3],
      [110, 'none', null],
    ],
  );
  assert.deepEqual(loose.json.summary.map((s) => [s.id, s.events, s.onBeat]), [['intro', 4, 0.5]]);
  const strict = run('check-sync.mjs', [file, '--events', events]);
  assert.equal(strict.code, 1, strict.out);
  assert.match(strict.out, /sync check FAILED/);
  const capped = run('check-sync.mjs', [file, '--events', events, '--min-on-beat', '0.5', '--max-miss', '0']);
  assert.equal(capped.code, 1, capped.out);
});

// ------------------------------------------------------------------------------------------------------------------------- flash

test('a transition is a swing of 0.1 from the last extreme with the darker side under 0.8', () => {
  const square = (period, lo, hi, n = 60) => Array.from({ length: n }, (_, i) => (Math.floor(i / period) % 2 ? hi : lo));
  assert.deepEqual(transitions(square(5, 0.1, 0.6)).map((t) => t.at), [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  assert.deepEqual(transitions(square(5, 0.1, 0.6)).slice(0, 2).map((t) => t.dir), [1, -1]);
  assert.equal(transitions(square(5, 0.85, 0.98)).length, 0, 'both sides over 0.8: no flash');
  assert.equal(transitions(square(5, 0.3, 0.38)).length, 0, 'a swing under 0.1');
  // A slow ramp up and down is one transition each way, not one per frame.
  const ramp = Array.from({ length: 41 }, (_, i) => (i <= 20 ? 0.02 * i : 0.02 * (40 - i)));
  assert.deepEqual(transitions(ramp).map((t) => t.dir), [1, -1]);
});

test('more than three flashes in a second (8 transitions) fails; 7 do not', () => {
  const seven = [0, 5, 10, 15, 20, 25, 30];
  assert.equal(Math.max(...windows(seven, 60).map((w) => w.count)), 7);
  assert.deepEqual(failingSpans(seven, 60), []);
  assert.deepEqual(failingSpans([...seven, 35], 60), [{ from: 0, to: 60, count: 8 }]);
  assert.deepEqual(failingSpans([0, 30, 60, 90, 120], 60), [], 'two transitions a second');
  assert.equal(failingSpans([0, 5, 10, 15, 20, 25, 30, 35, 40, 45], 60).length, 1, 'overlapping windows merge');
});

test('the red value is WCAG’s (R − G − B) × 320 for saturated reds only', () => {
  assert.equal(redValue(255, 0, 0), 320);
  assert.ok(Math.abs(redValue(230, 20, 10) - (200 / 255) * 320) < 1e-9);
  assert.equal(redValue(200, 100, 100), 0, 'not saturated');
  assert.equal(redValue(0, 0, 0), 0);
});

test('check-flash on a clip: a small block flickering 7.5 times a second fails the 6 × 6 grid only', () => {
  // The top-left 6 × 6 block (16 × 9 px) swings between linear 0.1 and 0.4 every 4 frames from 20 to 80; the rest holds grey.
  // In its 3 × 3 block that is a swing of 0.075 (under 0.1), in the whole frame less.
  const file = clip('flash', 120, (f, set) => {
    fill(set, [128, 128, 128]);
    fill(set, f >= 20 && f < 80 && Math.floor(f / 4) % 2 ? [170, 170, 170] : [89, 89, 89], 0, 0, 16, 9);
  });
  const r = run('check-flash.mjs', [file, '--size', '96x54']);
  assert.equal(r.code, 1, r.out);
  assert.ok(r.json.failures.length >= 1);
  for (const f of r.json.failures) assert.deepEqual([f.kind, f.grid, f.worst], ['luminance', 6, '6×6 r0c0']);
  assert.ok(r.json.failures[0].flashes > 3);
  const intro = r.json.summary.find((s) => s.id === 'intro');
  assert.ok(intro.worst['luminance-3'].flashes <= 3 && intro.worst['luminance-1'].flashes === 0, JSON.stringify(intro.worst));
  const wcag = run('check-flash.mjs', [file, '--size', '96x54', '--grids', '1,3']);
  assert.equal(wcag.code, 0, wcag.out);
});

// ------------------------------------------------------------------------------------------------------------------------- seams

const image = (paint) => {
  const data = new Uint8Array(W * H * 3);
  paint((x, y, c) => data.set(c, (y * W + x) * 3));
  return { width: W, height: H, channels: 3, data };
};

test('the seam change is the mean difference of 8 × 8 block averages, 0–255', () => {
  const black = image((set) => fill(set, [0, 0, 0]));
  const white = image((set) => fill(set, [255, 255, 255]));
  assert.equal(blockChange(black, black), 0);
  assert.equal(blockChange(black, white), 255);
  // A 1-px checkerboard and flat grey of the same mean do not differ block by block.
  const checker = image((set) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, (x + y) % 2 ? [200, 200, 200] : [0, 0, 0]);
  });
  assert.equal(blockChange(checker, image((set) => fill(set, [100, 100, 100]))), 0);
});

test('the bright-stroke overlap is bright-in-both over bright-in-either, and undefined with nothing bright', () => {
  const sq = (x0) => image((set) => fill(set, [255, 255, 255], x0, 10, x0 + 10, 20));
  assert.equal(brightOverlap(sq(20), sq(20)), 1);
  assert.ok(Math.abs(brightOverlap(sq(20), sq(25)) - 50 / 150) < 1e-12);
  assert.equal(brightOverlap(sq(20), sq(60)), 0);
  assert.ok(Number.isNaN(brightOverlap(image((set) => fill(set, [40, 40, 40])), image((set) => fill(set, [90, 0, 0])))));
});

test('a judged seam passes on a small change, lined-up strokes or a jump no bigger than the motion around it', () => {
  assert.equal(judgeSeam({ change: 2, overlap: 0, jump: 9 }), 'change');
  assert.equal(judgeSeam({ change: 40, overlap: 0.7, jump: 9 }), 'overlap');
  assert.equal(judgeSeam({ change: 40, overlap: NaN, jump: 1.2 }), 'jump');
  assert.equal(judgeSeam({ change: 40, overlap: 0.2, jump: 4 }), 'FAIL');
  assert.equal(judgeSeam({ change: 40, overlap: 0.2, jump: 4 }, { kind: 'cut' }), 'cut');
});

test('check-seams on a clip: a moving square passes, a cut to another picture fails unless marked as a cut', () => {
  const file = clip('seams', 60, (f, set) => {
    if (f < 30) {
      fill(set, [30, 30, 60]);
      fill(set, [255, 255, 255], 10 + f, 20, 26 + f, 34);
    } else {
      fill(set, [200, 60, 40]);
      fill(set, [255, 255, 255], 70, 2, 90, 12);
    }
  });
  const save = path.join(dir, 'seam-sheets');
  const judged = run('check-seams.mjs', [file, '--seams', '20,30', '--save', save]);
  assert.equal(judged.code, 1, judged.out);
  const [moving, cut] = judged.json.seams;
  assert.equal(moving.frame, 20);
  assert.notEqual(moving.verdict, 'FAIL', JSON.stringify(moving));
  assert.ok(moving.overlap > 0.8, `the square moves 1 px a frame: overlap ${moving.overlap}`);
  assert.deepEqual([cut.frame, cut.verdict], [30, 'FAIL']);
  assert.ok(cut.change > 50 && cut.overlap < 0.05, JSON.stringify(cut));
  assert.ok(fs.existsSync(path.join(save, 'seam-30.png')));
  const marked = run('check-seams.mjs', [file, '--seams', '20,30:cut', '--save', save, '--no-sheets']);
  assert.equal(marked.code, 0, marked.out);
  assert.equal(marked.json.seams[1].verdict, 'cut');
});

// ---------------------------------------------------------------------------------------------------------------------- loudness

const SR = 48000;
const sine = (n, hz, amp, phase = 0) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR + phase));

test('the K-weighting at 48 kHz is BS.1770’s table', () => {
  const K48 = [
    [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
    [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621],
  ];
  kWeightCoefficients(48000).forEach((stage, s) => stage.forEach((c, k) => assert.ok(Math.abs(c - K48[s][k]) < 1e-8, `stage ${s} coefficient ${k}: ${c}`)));
});

test('a −20 dBFS 997 Hz tone in both channels reads −20 LUFS, and silence is gated out', () => {
  const tone = sine(3 * SR, 997, 0.1);
  const p = powerPrefix([tone, tone], SR);
  assert.ok(Math.abs(integrated(p, 0, tone.length, SR) + 20) < 0.05, `${integrated(p, 0, tone.length, SR)}`);
  assert.ok(Math.abs(loudestWindow(p, SR, tone.length, SR, 0.4) + 20) < 0.05);
  const half = Float32Array.from({ length: 4 * SR }, (_, i) => (i < 2 * SR ? 0 : tone[i - 2 * SR]));
  const q = powerPrefix([half, half], SR);
  // Ungated, half silence would read −23 LUFS; gated, only the three blocks straddling the onset pull it down a little.
  const gated = integrated(q, 0, half.length, SR);
  assert.ok(gated > -20.5 && gated < -20, `the silent half is below the absolute gate: ${gated}`);
  assert.equal(integrated(q, 0, 2 * SR, SR), -Infinity);
});

test('the true peak finds the peak between samples: a 12 kHz tone at 45° reads 3 dB over its samples', () => {
  const x = sine(SR / 4, 12000, 0.5, Math.PI / 4);
  const env = truePeakEnvelope(x, { taps: 64 });
  let tp = 0;
  let sp = 0;
  for (let i = 2000; i < x.length - 2000; i++) {
    tp = Math.max(tp, env[i]);
    sp = Math.max(sp, Math.abs(x[i]));
  }
  assert.ok(Math.abs(20 * Math.log10(sp) - 20 * Math.log10(0.5 * Math.SQRT1_2)) < 0.01);
  assert.ok(Math.abs(20 * Math.log10(tp) - 20 * Math.log10(0.5)) < 0.02, `true peak ${20 * Math.log10(tp)} dBTP`);
  const r = measure({ p: powerPrefix([x, x], SR), env: [env, env], channels: [x, Float32Array.from(x, (v, i) => (i === 3000 ? 1 : v))], sr: SR }, 0, x.length);
  assert.equal(r.clipped, 1);
});

test('check-loudness on a WAV: per part and per bar, and the limits decide the exit code', () => {
  // Two bars (3.2 s): bar 1 at −30 dBFS, bar 2 at −12 dBFS (1 kHz: the level steps on a zero crossing, so no ringing).
  const n = 2 * 96 * 800;
  const x = Float32Array.from(sine(n, 1000, 1), (v, i) => v * (i < n / 2 ? 10 ** (-30 / 20) : 10 ** (-12 / 20)));
  const wav = path.join(dir, 'two-bars.wav');
  writeWav(wav, x, x, SR, { dither: false });
  const ok = run('check-loudness.mjs', [wav, '--bars', '--taps', '16']);
  assert.equal(ok.code, 0, ok.out);
  assert.deepEqual(ok.json.ranges.map((r) => r.id), ['intro', 'whole file']);
  const [b1, b2] = ok.json.bars;
  assert.ok(Math.abs(b1.lufs + 30) < 0.2 && Math.abs(b2.lufs + 12) < 0.2, `${b1.lufs} ${b2.lufs}`);
  assert.ok(Math.abs(b2.tp + 12) < 0.15 && b1.tp < -29.5, `${b1.tp} ${b2.tp}`);
  const hot = run('check-loudness.mjs', [wav, '--taps', '16', '--max-lufs', '-20']);
  assert.equal(hot.code, 1, hot.out);
  assert.match(hot.out, /intro: −1\d\.\d\d LUFS > −20\.0/);
  const peak = run('check-loudness.mjs', [wav, '--taps', '16', '--max-tp', '-13']);
  assert.equal(peak.code, 1, peak.out);
  assert.match(peak.out, /true peak/);
});
