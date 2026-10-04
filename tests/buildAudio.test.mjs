import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { BUILD_THREADS } from '../src/content/build.ts';
import { mixdown, renderStems } from '../scripts/audio/bgm.mjs';
import { chordRow } from '../scripts/audio/sections/build.mjs';
import { renderTransition } from '../scripts/audio/sections/transition.mjs';
import { correlation, integratedLoudness, lowCorrelation, truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { fft } from '../scripts/lib/fft.mjs';
import {
  BUILD_CHORDS, CLAPS, DISC_LAND, FACES, FILL, HATS, HIT3, HOLE, HOPS, INFECT, IRIS, KICKS, LANDINGS, LENS_TRACK, MOUTHS, PING, PRINT_STEPS, PULL, REVIVE,
  ROLL, RETURN, RULES, SEA, SHIMMER, SILENCE, SLAMS, SLIDE, SPLITS, SPLIT_STAGGER, STRETCH, SUNRISE, SWEEPS, SWELL, TEARS, ZERO_THREATS,
} from '../src/score/build.ts';
import { partEnd, partFrame, partStart, seedFrame } from '../src/score/film.ts';
import { DEFENDER_BEEPS, RAIN } from '../src/score/intro.ts';
import { CARDS, turnStart } from '../src/transitions/flip.ts';

const SR = 48000;
const at = (frame) => Math.round((frame / 60) * SR);
const N = at(partEnd('riso') + 48); // the intro and the build (to riso's end, 19.2 s) and two beats after
const { stems, events } = renderStems(SR, N);
const of = (kind) => events.filter((e) => e.kind === kind).map((e) => e.at);
const rmsOf = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / (b - a));

test('every drum hit of the build lands on its frame', () => {
  assert.deepEqual(of('kick'), KICKS.map(at));
  assert.deepEqual(of('clap'), CLAPS.map(at));
  assert.deepEqual(of('fill'), FILL.map(at));
  assert.deepEqual(of('roll'), ROLL.map(at));
});

test('picture hits sound on their frames: rules, splits, sweeps, 144 card clicks, the tears, the slams, the mouths, the punch', () => {
  assert.deepEqual(of('rule'), RULES.map(at));
  assert.deepEqual(of('split'), SPLITS.map(at));
  assert.deepEqual(of('sweep'), SWEEPS.map(at), 'the sweep whooshes peak as the bars cross, on the claps');
  const cards = [];
  for (let row = 0; row < CARDS.rows; row++) for (let col = 0; col < CARDS.cols; col++) cards.push(at(turnStart(col, row)));
  assert.deepEqual(of('card'), cards);
  assert.deepEqual(of('tear'), TEARS.map(at), 'a rip on every tear');
  assert.deepEqual(of('slam'), SLAMS.map(at), 'a press on every slam');
  assert.deepEqual(of('mouth'), MOUTHS.map(at), 'a pop on every burst through a mouth but the last, which has the punch');
  assert.deepEqual(of('punch'), [at(HOLE)]);
});

/** A one-pole high-pass at `fc` Hz: the rips' band, above the slams' thud. */
function highPass(x, fc) {
  const y = new Float32Array(x.length);
  const a = 1 / (1 + (2 * Math.PI * fc) / SR);
  for (let i = 1; i < x.length; i++) y[i] = a * (y[i - 1] + x[i] - x[i - 1]);
  return y;
}
const energyOf = (x, a, b) => x.subarray(a, b).reduce((s, v) => s + v * v, 0);
/** Crossings of zero a second, halved: about where the energy of a band of noise sits (Hz). */
const brightness = (x, a, b) => {
  let n = 0;
  for (let i = a + 1; i < b; i++) if (x[i] >= 0 !== x[i - 1] >= 0) n++;
  return (n / (b - a)) * (SR / 2);
};

test("S09: each sheet's rip sounds from the side it is torn toward — its arp note's (even sixteenths left, odd right) — even under a slam", () => {
  const L = highPass(stems.fx.L, 2000);
  const R = highPass(stems.fx.R, 2000);
  for (const f of TEARS) {
    const side = ((f - partStart('riso')) / 6) % 2 === 0 ? -1 : 1;
    const db = 10 * Math.log10(energyOf(L, at(f), at(f + 6)) / energyOf(R, at(f), at(f + 6)));
    assert.ok(-side * db > 2, `the rip on ${f} sits ${db.toFixed(1)} dB to the left`);
  }
  // The arp the tears follow: its even sixteenths on the left.
  const music = (f) => 10 * Math.log10(energyOf(stems.music.L, at(f), at(f + 4)) / energyOf(stems.music.R, at(f), at(f + 4)));
  for (const f of TEARS) assert.ok((((f - partStart('riso')) / 6) % 2 === 0 ? 1 : -1) * music(f) > 0, `the arp note on ${f}`);
});

test('S10: a rush rises into each burst through a mouth, a pop bursts on its kick, and a falling rush carries across the gap to the landing on the and', () => {
  const M = stems.fx.L.map((v, i) => v + stems.fx.R[i]);
  const bursts = [...MOUTHS, HOLE];
  const from = [TEARS[TEARS.length - 1], ...LANDINGS];
  // The rushes start on S09's last tear and on each landing, and swell to the burst: louder in the second half.
  assert.deepEqual(of('rush'), from.map(at));
  bursts.forEach((f, i) => {
    const mid = (from[i] + f) / 2;
    assert.ok(rmsOf(M, at(mid), at(f)) > 2 * rmsOf(M, at(from[i]), at(mid)), `the rush into ${f} rises`);
  });
  // The pop: the burst frame is far louder than the frame before it.
  for (const f of MOUTHS) assert.ok(rmsOf(M, at(f), at(f + 2)) > 3 * rmsOf(M, at(f - 1), at(f)), `a pop on ${f}`);
  // Across the gap: a rush starting on the burst whose pitch falls toward the landing.
  assert.deepEqual(of('gap'), MOUTHS.map(at));
  MOUTHS.forEach((f, i) => {
    const early = brightness(M, at(f + 4.5), at(f + 7.5));
    const late = brightness(M, at(f + 9), at(LANDINGS[i]));
    assert.ok(early > 1.2 * late, `the gap after ${f} falls: ${early.toFixed(0)} → ${late.toFixed(0)} Hz`);
  });
});

test('the last half beat is silent and nothing of the build comes back after it', () => {
  const { L, R } = mixdown({ ...stems, post: stereo(N) }, SR);
  const peak = (a, b) => {
    let m = 0;
    for (let i = a; i < b; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    return m;
  };
  assert.ok(peak(at(SILENCE.from), at(SILENCE.to)) < 1e-6, 'the silent half beat');
  // After the silence only the next part sounds (the transition, X01, since the 58-bar map): the full mix matches a mix of the transition
  // alone (the limiter aside).
  const alone = Object.fromEntries(Object.entries(stems).map(([name, bus]) => [name, bus instanceof Float32Array ? new Float32Array(N) : stereo(N)]));
  renderTransition(alone, SR);
  const next = mixdown({ ...alone, post: stereo(N) }, SR);
  let off = 0;
  for (let i = at(SILENCE.to); i < N; i++) off = Math.max(off, Math.abs(L[i] - next.L[i]), Math.abs(R[i] - next.R[i]));
  assert.ok(off < 0.01, `no tail of the build comes back after the silence (${off.toFixed(4)})`);
  assert.ok(peak(at(SILENCE.from) - SR / 10, at(SILENCE.from) - SR / 100) > 0.05, 'loud right before it');
});

test('the reverse inhale swells into the drop and stops on it', () => {
  const x = stems.post.L;
  const end = at(SILENCE.to);
  assert.ok(rmsOf(x, end - SR / 50, end) > 4 * rmsOf(x, at(SILENCE.from), at(SILENCE.from) + SR / 50));
  assert.ok(x.subarray(end).every((v) => v === 0) && x.subarray(0, at(SILENCE.from)).every((v) => v === 0));
});

// ——— L14b (no constant chord bed — a chord held behind everything reads as noise; the music bible's reference is break
// 1 FALL). Provisional pins: the A/B is in notes/b114/music-r1/; the A side's tests are kept there. ————————————————————————————

/** Riso's chord stabs: S09's slams, S10's bursts, S11's faces, S12's print and its two sunrise hits. */
const STABS = [...SLAMS, ...MOUTHS, ...FACES, PRINT_STEPS[0], SUNRISE.from, SUNRISE.to];

test('riso’s chords are stabs on the picture’s hits over a faint glass pad: no held bed (v04’s whole-bar supersaw is gone)', () => {
  assert.deepEqual(of('stab'), STABS.map(at));
  assert.deepEqual(of('glasspad'), [at(partStart('riso'))]);
  const { L, R } = stems.chords;
  assert.ok(L.subarray(0, at(partStart('riso'))).every((v) => v === 0), 'nothing on the chords bus before riso');
  // Each stab is gone before the next eighth; what holds between the hits (the glass pad) sits ≥ 5 dB under the hit and ≥ 10 dB under
  // the drums (v04's bed sat 1.4–3.2 LU under them).
  for (const f of STABS.filter((x) => x + 23 < SILENCE.from)) {
    const hit = rmsOf(L, at(f), at(f + 3));
    const between = rmsOf(L, at(f + 13), at(f + 23));
    assert.ok(20 * Math.log10(between / hit) < -5, `between the stab on ${f} and the next beat: ${(20 * Math.log10(between / hit)).toFixed(1)} dB`);
    const drums = rmsOf(stems.drums.L, at(f + 13), at(f + 23));
    assert.ok(20 * Math.log10(between / drums) < -10, `the pad after ${f}: ${(20 * Math.log10(between / drums)).toFixed(1)} dB against the drums`);
  }
  // The pad pumps with the kick (4.2 has a kick and no stab).
  const k = at(partFrame('riso', 4, 1));
  assert.ok(rmsOf(L, k + SR / 200, k + SR / 50) < 0.5 * rmsOf(L, k + 0.25 * SR, k + 0.3 * SR), 'ducked right after the kick');
  // Wide, and high-passed: nothing to muddy the bass.
  const c = correlation(L.subarray(at(partStart('riso')), at(SILENCE.from)), R.subarray(at(partStart('riso')), at(SILENCE.from)));
  assert.ok(c > 0.3 && c < 0.9, `correlation ${c}`);
  const chords = [stems.chords.L, stems.chords.R];
  for (const f of [partStart('riso'), partFrame('riso', 3)]) assert.ok(db(band(chords, at(f), 20, 150)) < db(band(chords, at(f), 200, 5000)) - 20, `the stab on ${f} is high-passed`);
});

test('the arp: short clean notes on the Swiss part’s off-beat eighths (none in S05, the scan or S08’s wave) and on every riso sixteenth from S09’s first tear', () => {
  const want = [];
  for (let f = partStart('swiss'); f < SILENCE.from; f += 6) {
    if (f >= partStart('riso')) {
      if (f >= TEARS[0]) want.push(f);
      continue;
    }
    if (f < partFrame('swiss', 2) || (f >= IRIS && f < RETURN) || (f >= partFrame('swiss', 5) && f < partFrame('swiss', 5, 2))) continue;
    if ((f - partStart('swiss')) % 24 === 12) want.push(f);
  }
  assert.deepEqual(of('arpnote').filter((a) => a >= at(partStart('swiss'))), want.map(at));
});

test('the build still climbs without the bed: riso 1 ≥ swiss 5 + 0.3 LU, each riso bar ≥ the one before − 0.1 LU, riso 4 the build’s loudest bar', () => {
  const r = [11, 12, 13, 14].map(bar);
  assert.ok(r[0] >= bar(10) + 0.3, `riso 1 ${r[0].toFixed(2)} vs swiss 5 ${bar(10).toFixed(2)} LUFS`);
  for (let k = 1; k < 4; k++) assert.ok(r[k] >= r[k - 1] - 0.1, `riso ${k + 1} ${r[k].toFixed(2)} vs riso ${k} ${r[k - 1].toFixed(2)}`);
  for (let b = 6; b < 14; b++) assert.ok(r[3] > bar(b), `riso 4 ${r[3].toFixed(2)} vs bar ${b} ${bar(b).toFixed(2)}`);
});

test('the build section is loud enough, under the ceiling, mono in the lows, and free of DC', () => {
  const { L, R } = mixdown(stems, SR);
  const l = L.subarray(at(partStart('swiss')), at(partEnd('riso')));
  const r = R.subarray(at(partStart('swiss')), at(partEnd('riso')));
  const lufs = integratedLoudness(l, r, SR);
  assert.ok(lufs > -16 && lufs < -10, `${lufs} LUFS`);
  assert.ok(truePeakDb(L, R) <= -1.0);
  assert.ok(lowCorrelation(l, r, SR) > 0.9);
  // Tonal buses carry no DC; the drums do (a pitch-swept kick is not symmetric), which the mix's 20 Hz high-pass on the mid removes.
  for (const name of ['bass', 'chords', 'vox', 'music']) {
    for (const x of [stems[name].L, stems[name].R]) {
      const mean = x.reduce((s, v) => s + v, 0) / x.length;
      assert.ok(Math.abs(mean) < 5e-4, `${name} mean ${mean}`);
    }
  }
  for (const x of [l, r]) {
    const mean = x.reduce((s, v) => s + v, 0) / x.length;
    assert.ok(Math.abs(mean) < 5e-4, `mix mean ${mean}`);
  }
});

test('the split pops play as the faces burst out, from the beat to SPLIT_STAGGER frames after', () => {
  const pops = of('pop');
  for (const f of SPLITS) {
    assert.ok(pops.includes(at(f)), `a pop on the beat ${f}`);
    assert.ok(pops.filter((a) => a > at(f) && a <= at(f + SPLIT_STAGGER)).length >= (f === SPLITS[0] ? 0 : 1), `the new faces pop after ${f}`);
  }
  assert.ok(pops.every((a) => SPLITS.some((f) => a >= at(f) && a <= at(f + SPLIT_STAGGER))), 'every pop belongs to a split');
});

test('the slide and the pull whooshes peak where they move fastest', () => {
  // The lens slides onto his eye on swiss 1.4 ('track', bars 1–14 design); with `lens` off, v04's slide.
  if (BUILD_THREADS.lens) assert.equal(events.find((e) => e.kind === 'track').at, at(LENS_TRACK + 1));
  else assert.equal(events.find((e) => e.kind === 'slide').at, at(SLIDE.from + 1));
  assert.equal(events.find((e) => e.kind === 'pull').at, at(PULL.from + 1));
});

test("the disc's, the hole's, the stretch's and the sea's whooshes peak as they launch", () => {
  const peak = (kind) => events.find((e) => e.kind === kind).at;
  assert.equal(peak('land'), at(DISC_LAND.from + 2), 'the disc shrinks fastest just after its launch (half a frame after swiss 1.1)');
  assert.equal(peak('hole'), at(HOLE + 2), 'the burst through the last mouth into S11 whooshes as the camera settles');
  assert.equal(peak('stretch'), at(STRETCH.from + 1), 'the mouth launches into the horizon on riso 4.2');
  assert.equal(peak('sea'), at(SEA.from + 4), 'the bands launch on riso 4.2 and the 9 frames after');
});

// ——— Bars 6–14 (the bars 1–14 design notes/b112/final.md §8.3; build sheet notes/b114/sheet.md §10) ——————————————————————

/** The finished mix of the rendered span (a mixdown is about 3 s, so the loudness tests share one). */
let mixed = null;
const mix = () => (mixed ??= mixdown(stems, SR));
const lufs = (a, b) => integratedLoudness(mix().L.subarray(at(a), at(b)), mix().R.subarray(at(a), at(b)), SR);
const bar = (b) => lufs((b - 1) * 96, b * 96);
/** Energy between lo and hi Hz of the n samples from `from` (Hann-windowed), summed over `channels`. */
const band = (channels, from, lo, hi, n = 4096) => {
  let s = 0;
  for (const x of channels) {
    const re = Float64Array.from({ length: n }, (_, i) => (x[from + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)));
    const im = new Float64Array(n);
    fft(re, im);
    for (let k = Math.ceil((lo * n) / SR); k <= Math.min(n / 2, Math.floor((hi * n) / SR)); k++) s += re[k] ** 2 + im[k] ** 2;
  }
  return s;
};
const db = (x) => 10 * Math.log10(x);
const inScan = (f) => f >= partFrame('swiss', 4) && f < partFrame('swiss', 5);
const frameOf = (sample) => (sample / SR) * 60;

test('the chords are BUILD_CHORDS, one a bar: IV V iii iii vi over the Swiss part (the scan bar holds iii), and riso is v04’s IV V iii vi again', () => {
  assert.deepEqual(BUILD_CHORDS.map((_, k) => chordRow(k)), [0, 1, 2, 2, 3, 0, 1, 2, 3]);
});

test('every kick and clap of a kept bar keeps its v04 seed (v04: a kick on every beat from swiss 1.1, a clap every other from swiss 3.2); the scan bar’s take the build’s new range', () => {
  for (const e of events.filter((x) => x.kind === 'kick')) {
    const f = frameOf(e.at);
    if (inScan(f)) assert.ok(e.seed >= 1450 && e.seed < 1455, `the scan bar's kick on ${f}`);
    else assert.equal(e.seed, 600 + (seedFrame(f) - 384) / 24, `the kick on ${f} (v04 ${seedFrame(f)})`);
  }
  for (const e of events.filter((x) => x.kind === 'clap')) {
    const f = frameOf(e.at);
    if (inScan(f)) assert.ok(e.seed >= 1460 && e.seed < 1465, `the scan bar's clap on ${f}`);
    else assert.equal(e.seed, 800 + (seedFrame(f) - 600) / 48, `the clap on ${f} (v04 ${seedFrame(f)})`);
  }
});

test('swiss 1–3: the lens’s aperture clicks, arc clacks and five paper slaps, the re-acquire chirps, the third hit’s bell and the J-cut’s swell land on their frames', () => {
  if (BUILD_THREADS.lens) {
    assert.deepEqual(of('aperture'), [0, 1, 2, 3, 4, 5].map((k) => at(DISC_LAND.from + 2 + 2 * k)));
    assert.deepEqual(of('arc'), [partFrame('swiss', 1, 1), partFrame('swiss', 1, 2), LENS_TRACK].map(at));
    assert.deepEqual(of('paper'), [1, 1.5, 2, 2.5, 3].map((b) => at(partFrame('swiss', 1, b))));
  }
  if (BUILD_THREADS.reacquire) assert.deepEqual(of('chirp'), SPLITS.slice(1).map(at));
  assert.deepEqual(of('hit3'), [at(HIT3)]);
  assert.deepEqual(of('swell'), [at(SWELL.from)]);
});

test('the SCAN bar: no kick on 4.1 or 4.2 and no hat on their ands; the arp turns into a C6 radar ping on the eighths; the Defender’s shutter, hop ticks, the sonar ping on him and its two beeps land on their frames; the groove and the ting come back on 4.3', () => {
  assert.ok(!KICKS.some((f) => f >= IRIS && f < RETURN) && !HATS.some((f) => f >= IRIS && f < RETURN));
  assert.ok(!of('kick').some((a) => a >= at(IRIS) && a < at(RETURN)), 'no kick under the scan');
  assert.deepEqual(of('radar'), [0, 12, 24, 36].map((d) => at(IRIS + d)));
  assert.deepEqual(of('shutter'), [at(IRIS)]);
  assert.deepEqual(of('hop'), HOPS.map(at));
  assert.deepEqual(of('sonar'), [at(PING)]);
  assert.deepEqual(of('beeps'), [...DEFENDER_BEEPS, ZERO_THREATS].map(at), 'the Defender beeps three times in bars 1–14: loaded, the rain’s verdict, the scan’s');
  assert.deepEqual(of('return'), [at(RETURN)]);
  assert.deepEqual(of('ting'), [at(RETURN)]);
  assert.ok(of('kick').includes(at(RETURN)), 'the kick is back on 4.3');
  assert.deepEqual(of('shimmer'), SHIMMER.map(at));
  assert.ok(RAIN.to <= partStart('swiss'));
});

test('the muffle: through the antivirus the world is heard under a 1.5 kHz low-pass (the clap on 4.2 has lost its highs next to red bar 3’s on 4.4), while its own dry voices keep theirs', () => {
  const drums = [stems.drums.L, stems.drums.R];
  const tilt = (f) => db(band(drums, at(f), 4000, 16000)) - db(band(drums, at(f), 200, 1500));
  const muffled = tilt(PING);
  const open = tilt(partFrame('swiss', 4, 3));
  assert.ok(open - muffled > 15, `the clap's highs: ${muffled.toFixed(1)} dB under the muffle, ${open.toFixed(1)} dB in the open`);
  // The beeps on the ✓ (inside the muffle) are as bright as the rain's (intro 2.4, no muffle): the same voice, untouched.
  const dry = [stems.bass.L, stems.bass.R];
  const scanBeeps = db(band(dry, at(ZERO_THREATS), 1800, 2400));
  const rainBeeps = db(band(dry, at(DEFENDER_BEEPS.at(-1)), 1800, 2400));
  assert.ok(Math.abs(scanBeeps - rainBeeps) < 1, `the ✓ beeps ${scanBeeps.toFixed(1)} dB, the rain's ${rainBeeps.toFixed(1)} dB`);
  assert.equal(of('muffle').length, BUILD_THREADS.pov === false ? 0 : 1);
});

test('the SCAN bar is a breakdown (≈ −15 LUFS) whose loudest 400 ms is the groove coming back on 4.3, and the climb resumes: swiss 5 at least 0.3 LU over the glass’s bar', () => {
  const s4 = partFrame('swiss', 4);
  const swiss4 = bar(9);
  assert.ok(swiss4 > -16 && swiss4 < -14, `swiss 4 ${swiss4.toFixed(2)} LUFS`);
  const window = at(24);
  const momentary = (t) => integratedLoudness(mix().L.subarray(t, t + window), mix().R.subarray(t, t + window), SR);
  let best = { t: -1, m: -Infinity };
  for (let t = at(s4); t + window <= at(s4 + 96); t += SR / 100) {
    const m = momentary(t);
    if (m > best.m) best = { t, m };
  }
  const onReturn = momentary(at(RETURN));
  assert.ok(best.m - onReturn < 0.05, `816's window ${onReturn.toFixed(2)} vs the loudest ${best.m.toFixed(2)} at ${frameOf(best.t).toFixed(1)}`);
  assert.ok(Math.abs(frameOf(best.t) - RETURN) <= 2, `the loudest window starts at ${frameOf(best.t).toFixed(1)}`);
  assert.ok(bar(10) >= bar(8) + 0.3, `swiss 5 ${bar(10).toFixed(2)} vs the glass ${bar(8).toFixed(2)} LUFS`);
});

// L14b re-baselines the build (provisional, with the A/B): v04's −12.7 carried riso's supersaw bed (≈ 0.8 LU of the build); without it
// the build sits ≈ −13.6, every step inside it kept (the tests above), and the whole-film mix pass (M1 #3) sets the absolutes.
test('the intro and the build sit on the music bible’s arc: intro −15.4 ± 0.3; the build −13.6 ± 0.3 LUFS without the bed (L14b; v04 −12.7)', () => {
  const intro = lufs(0, partEnd('intro'));
  const build = lufs(partStart('swiss'), partEnd('riso'));
  assert.ok(Math.abs(intro + 15.4) <= 0.3, `intro ${intro.toFixed(2)} LUFS`);
  assert.ok(Math.abs(build + 13.6) <= 0.3, `build ${build.toFixed(2)} LUFS`);
});

test('swiss 5: the infection steps thump up D minor pentatonic, the virus sings "wa" (M7) as it starts and as it revives, the quarantine clacks and the guest boings on 5.2', () => {
  if (!BUILD_THREADS.infection) return;
  assert.deepEqual(of('infect'), INFECT.map(at));
  assert.deepEqual(of('wa'), [INFECT[0], REVIVE].map(at));
  assert.deepEqual(of('quarantine'), [at(partFrame('swiss', 5, 1))]);
  assert.deepEqual(of('boing'), [at(partFrame('swiss', 5, 1))]);
  assert.deepEqual(of('revive'), [at(REVIVE)]);
});

/**
 * Riso 1–3 are v04's sound: every dry bus but the bells' is sample for sample what the approved build drew there — sha256 (16 hex) of the
 * Float32 samples, L then R, over riso 1.1–3.4 (film 960–1248), pinned from the retime control tree (2026-10-01 16:03, whose build.wav is
 * the approved slice) at v04's 768–1056. L14b re-voices two of them on purpose — the arp (music: clean, short) and the
 * chords (v04's supersaw bed → stabs over a glass pad) — so they are left out, with the chime bus (the glass's bells ring over the
 * boundary from a bar further back than in v04, and the new bars' bells ring there too). (The mix differs a little more: the plate's 1 Hz modulation runs on the film's
 * clock, so riso meets it 0.2 of a cycle later than in v04, and the new bars' reverb tails; notes/b114/music2/risoid.mjs.)
 */
test('riso 1–3’s own sound is v04’s: its dry buses are the approved samples', () => {
  // v04's music a5508da342204270 and chords cfc5611a0a0c7229 (the A side of L14b's A/B) are no longer pinned.
  const V04 = { keys: '8df6d450b5a7cb35', fx: '56be93455baf6b78', drums: '319b358cf1ce7054', bass: '2dc921b14b5cbf20', vox: '89f7cc1a346258af', post: '8df6d450b5a7cb35', sub: '0b150fd32588b1da' };
  const a = at(partStart('riso'));
  const b = at(partFrame('riso', 4));
  for (const [name, want] of Object.entries(V04)) {
    const bus = stems[name];
    const h = createHash('sha256');
    for (const x of bus instanceof Float32Array ? [bus] : [bus.L, bus.R]) h.update(Buffer.from(x.slice(a, b).buffer));
    assert.equal(h.digest('hex').slice(0, 16), want, `the ${name} bus over riso 1–3`);
  }
});
