// The transition's music (scripts/audio/sections/transition.mjs; its voices in scripts/audio/cosmosVoices.mjs, its stage and lone mix in
// scripts/audio/cosmosStage.mjs and cosmosMix.mjs), the part 'transition' (2 bars), against its build sheet (notes/bcos/sheet.md
// §3, §11), the design (notes/cosmos3/final.md §9 bars 13–14) and the music bible (§2.1, §4.2–4.3, §5 S2): the exhale, the 8-bit
// Blue Danube, the Vertigo wobble, the launch and the doubling roll, the press passes, the flight noise cut dead on the crash, the
// collapse, and S2 — the vacuum, gated to digital zero but for the point's whine. Every frame is the score's (src/score/transition.ts),
// every event lands on frame × 800 at 48 kHz, and the sounds are measured in the rendered audio, not only in the event list.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { mixAlone, sampleOf } from '../scripts/audio/cosmosStage.mjs';
import { measure, partsAlone } from '../scripts/audio/cosmosMix.mjs';
import { burr, paperThwack, pressClunk, rumble, swellNoise } from '../scripts/audio/cosmosVoices.mjs';
import { Biquad } from '../scripts/audio/filters.mjs';
import { truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import {
  CUTS, LIFT_ROOTS, LIFT_TRIM_DB, LIFT_VOICINGS, PREVIEWS, SENDS, SILENCES, flightCentre, flightPan, kickGain, liftTrim, padCutoff, renderTransition, rollVoice,
  speedAt, whineFreq, wobbleAt,
} from '../scripts/audio/sections/transition.mjs';
import { partBar } from '../src/score/film.ts';
import * as T from '../src/score/transition.ts';

const SR = 48000;
const at = (frame) => sampleOf(frame, SR);
const ORIGIN = T.TRANSITION_START;
const N = at(T.TRANSITION_END) - at(ORIGIN);
const lo = (frame) => at(frame) - at(ORIGIN);
const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / Math.max(1, b - a));
const dB = (v) => 20 * Math.log10(Math.max(1e-12, v));
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
/** Frequency of `x` over [a, b) from its rising zero crossings (Hz). */
const pitch = (x, a, b) => {
  const ups = [];
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) ups.push(i - x[i] / (x[i] - x[i - 1]));
  return ups.length < 2 ? 0 : ((ups.length - 1) * SR) / (ups[ups.length - 1] - ups[0]);
};
const lowpass = (x, hz) => {
  const fs = [Biquad.lowpass(SR, hz), Biquad.lowpass(SR, hz)];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
const band = (x, lo2, hi) => {
  const fs = [Biquad.highpass(SR, lo2), Biquad.highpass(SR, lo2), ...(hi ? [Biquad.lowpass(SR, hi), Biquad.lowpass(SR, hi)] : [])];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
/** The transition rendered alone (stems start on its first frame): { stems, events }. */
const render = (solo) => {
  const stems = { post: stereo(N), sub: new Float32Array(N) };
  for (const k of Object.keys(SENDS)) stems[k] = stereo(N);
  const events = renderTransition(stems, SR, { origin: ORIGIN, ...(solo ? { solo } : {}) });
  return { stems, events };
};
/** Every bus but the post bus summed to mono. */
const music = (stems) => {
  const m = new Float32Array(N);
  for (const [k, b] of Object.entries(stems)) if (k !== 'post' && b.L) for (let i = 0; i < N; i++) m[i] += 0.5 * (b.L[i] + b.R[i]);
  return m;
};
const FULL = render();
const MIX = partsAlone(['transition']);

// ——— Pure helpers ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('the lift voicings: drop 1\'s Vsus upper voices (C D F B♭) with D5 on top over G1, then F5 on top over the C2 pedal', () => {
  assert.deepEqual(LIFT_VOICINGS.ii, [60, 62, 65, 70, 74]);
  assert.deepEqual(LIFT_VOICINGS.Vsus, [60, 62, 65, 70, 77]);
  assert.deepEqual(LIFT_ROOTS, { ii: 31, Vsus: 36 });
});

test('the kicks: 0.45 on the exhale, 0.5 on the launch, then bar 2 climbing 0.5 → 0.6', () => {
  assert.equal(kickGain(T.EXHALE), 0.45);
  assert.equal(kickGain(T.LAUNCH), 0.5);
  const bar2 = T.KICKS.filter((k) => k >= T.at(2));
  assert.equal(kickGain(bar2[0]), 0.5);
  assert.ok(Math.abs(kickGain(bar2[bar2.length - 1]) - 0.6) < 1e-9);
  for (let i = 1; i < bar2.length; i++) assert.ok(kickGain(bar2[i]) > kickGain(bar2[i - 1]));
});

test('the pad opens 500 Hz → 16 kHz from 1.1 to the vacuum; the wobble sags −30 cents on the lurch and is back by the launch', () => {
  assert.equal(padCutoff(T.OPEN.from), 500);
  assert.ok(near(padCutoff(T.OPEN.to), 16000, 1e-9));
  assert.ok(padCutoff(T.at(2)) > padCutoff(T.at(1, 3)));
  assert.equal(wobbleAt(T.WOBBLE.from), 0);
  assert.equal(wobbleAt(T.WOBBLE.to), 0);
  assert.ok(near(wobbleAt((T.WOBBLE.from + T.WOBBLE.to) / 2), -0.3, 1e-9));
});

test('the flight: 0 before the launch, 6 → 12 → 24 units a frame (each step a launch: 75 % in 3 frames), dead on the crash', () => {
  assert.equal(speedAt(T.LAUNCH - 1), 0);
  assert.ok(near(speedAt(T.LAUNCH + 3), 0.75 * 6, 0.01), `75 % of 6 by +3: ${speedAt(T.LAUNCH + 3)}`);
  assert.ok(near(speedAt(T.at(2) - 1), 6, 0.01));
  assert.ok(near(speedAt(T.at(2, 2) - 1), 12, 0.01));
  assert.ok(near(speedAt(T.CRASH - 1), 24, 0.01));
  assert.equal(speedAt(T.CRASH), 0);
  assert.ok(near(flightCentre(T.at(2) - 1), 600, 0.02), `600 Hz at 6 u/f: ${flightCentre(T.at(2) - 1)}`);
  assert.ok(near(flightCentre(T.CRASH - 1), 4000, 0.02), `4 kHz at 24 u/f: ${flightCentre(T.CRASH - 1)}`);
});

test('the flight noise pans left → right in four steps with the corkscrew; the whine wavers ±1 % on a new step every 2 frames', () => {
  assert.equal(flightPan(T.CORKSCREW[0] - 1), 0);
  const settled = T.CORKSCREW.map((c, k) => flightPan((T.CORKSCREW[k + 1] ?? T.CRASH) - 0.01));
  for (let k = 1; k < settled.length; k++) assert.ok(settled[k] > settled[k - 1], `step ${k} further right`);
  assert.ok(settled[0] < -0.4 && settled[settled.length - 1] > 0.4, `left → right: ${settled.map((x) => x.toFixed(2))}`);
  for (let f = T.POINT; f < T.TRANSITION_END; f++) assert.ok(Math.abs(whineFreq(f) / 10500 - 1) <= 0.01 + 1e-12);
  assert.equal(whineFreq(T.POINT), whineFreq(T.POINT + 1));
  assert.ok(new Set(Array.from({ length: 6 }, (_, k) => whineFreq(T.POINT + 2 * k))).size > 3, 'the whine steps');
});

test('the roll: 0.16 → 0.45 and 220 → 420 Hz over bar 2, shooting up from the cross; the lift\'s trim is its bar\'s', () => {
  const bar2 = T.ROLL.filter((r) => r >= T.at(2));
  assert.ok(near(rollVoice(bar2[0]).gain, 0.16, 1e-9) && near(rollVoice(bar2[0]).tone, 220, 1e-9));
  assert.ok(near(rollVoice(bar2[bar2.length - 1]).gain, 0.45, 1e-9));
  assert.ok(rollVoice(bar2[bar2.length - 1]).tone > 420);
  assert.ok(near(liftTrim(T.at(1, 2)), 10 ** (LIFT_TRIM_DB[0] / 20), 1e-9));
  assert.ok(near(liftTrim(T.at(2, 2)), 10 ** (LIFT_TRIM_DB[1] / 20), 1e-9));
});

test('the new voices: the burr, the paper thwack, the press clunk (a 70 Hz thump), the rumble (40 Hz) and the swell stopping dead', () => {
  const b = new Float32Array(SR / 2);
  burr(b, 1000, SR, { gain: 0.05 });
  assert.equal(rms(b, 0, 1000), 0);
  assert.ok(rms(b, 1000 + 0.012 * SR, SR / 2) < 0.02 * rms(b, 1000, 1000 + 0.003 * SR), 'a burr is gone in 12 ms');
  const t = new Float32Array(SR / 2);
  paperThwack(t, 0, SR, { gain: 0.15 });
  assert.ok(rms(band(t, 500, 3000), 0, 0.02 * SR) > 1.5 * rms(band(t, 6000), 0, 0.02 * SR), 'the thwack is paper (its noise round 1.2–2.6 kHz)');
  assert.ok(rms(band(t, 100, 300), 0, 0.02 * SR) > rms(band(t, 500, 3000), 0, 0.02 * SR), 'over a 160 Hz body');
  const c = new Float32Array(SR / 2);
  pressClunk(c, 0, SR, { gain: 0.25 });
  assert.ok(near(pitch(lowpass(c, 150), 0.03 * SR, 0.15 * SR), 70, 0.05), `the clunk's thump ≈ 70 Hz: ${pitch(lowpass(c, 150), 0.03 * SR, 0.15 * SR).toFixed(1)}`);
  const r = new Float32Array(SR);
  rumble(r, 0, SR, SR, { freq: 40, gain: 0.2 });
  assert.ok(near(pitch(lowpass(r, 60), 0.5 * SR, SR - 100), 40, 0.06), 'the rumble is 40 Hz');
  assert.ok(rms(r, 0.8 * SR, SR) > 3 * rms(r, 0, 0.2 * SR), 'and it swells');
  const s = new Float32Array(SR);
  swellNoise(s, 0, SR / 2, SR, { gain: 0.1 });
  assert.equal(rms(s, SR / 2, SR), 0, 'the swell stops dead on its last sample');
});

// ——— Every event on its frame ————————————————————————————————————————————————————————————————————————————————————————————————

test('every event lands on its score frame (frame × 800 at 48 kHz): one row per kind', () => {
  const bar2Kicks = T.KICKS.filter((k) => k >= T.at(2));
  const expect = {
    trkick: T.KICKS,
    trclunk: bar2Kicks,
    trsnare: T.ROLL.filter((r) => r < T.at(2)),
    trroll: T.ROLL.filter((r) => r >= T.at(2)),
    trhat: T.HATS,
    trboom: [T.EXHALE],
    trfwump: [T.EXHALE],
    trriser: [T.OPEN.from],
    trpaste: T.PASTE_TICKS,
    trburr: T.KEY_REPEAT,
    trrim: [T.RIM],
    trlaunch: [T.LAUNCH],
    trgate: T.GATES,
    trflight: [T.FLIGHT_NOISE.from],
    trcorkscrew: [T.CORKSCREW[0]],
    trslam: [T.CRASH],
    trblip: T.COLLAPSE_BLIPS,
    trrumble: [T.RUMBLE.from],
    trrevcym: [T.REVERSE_CYMBAL.to],
    trshing: [T.SHING],
    trpad: T.CHORDS.map((c) => c.at),
    trsub: [T.LAUNCH],
    trwaltz: T.WALTZ.map((w) => w.at),
    trwhine: [T.WHINE.from],
  };
  const got = {};
  for (const e of FULL.events) (got[e.kind] ??= []).push(e.at);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(expect).sort(), 'the kinds');
  for (const [kind, frames] of Object.entries(expect)) assert.deepEqual(got[kind], frames.map(at), kind);
  assert.ok(FULL.events.every((e) => e.kind.startsWith('tr')), 'every kind is tr…');
  // check-sync's drums: the kicks and the snares are found by its kinds; the roll's 8ths–32nds are not counted as drums.
  const drums = new RegExp('^(?!.*rev)[a-z0-9]*(kick|clap|snare|ghost|heart)$');
  assert.deepEqual([...new Set(FULL.events.filter((e) => drums.test(e.kind)).map((e) => e.kind))].sort(), ['trkick', 'trsnare']);
});

test('the sounds start on their samples: the exhale\'s kick, the rim on the lurch, the slam on the crash (solo renders)', () => {
  for (const [kind, frame] of [['trkick', T.EXHALE], ['trrim', T.RIM], ['trslam', T.CRASH], ['trshing', T.SHING]]) {
    const m = music(render((k, f) => k === kind && f === frame).stems);
    const s = lo(frame);
    assert.equal(rms(m, 0, s), 0, `${kind}: nothing before its sample`);
    assert.ok(rms(m, s, s + 0.01 * SR) > 1e-3, `${kind}: sounding from it`);
  }
});

// ——— The waltz ——————————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('the 8-bit Blue Danube: 15 notes at their pitches (two phrases in F), the last B♭5 cut by the vacuum, none of it rings into it', () => {
  assert.equal(T.WALTZ.length, 15);
  const { stems } = render((k) => k === 'trwaltz');
  const m = music(stems);
  for (const w of T.WALTZ) {
    const a = lo(w.at) + Math.round(0.012 * SR);
    const b = Math.min(lo(w.to), a + Math.round(0.06 * SR));
    const hz = pitch(lowpass(m, midiHz(w.midi) * 1.5), a, b);
    assert.ok(near(hz, midiHz(w.midi), 0.03), `${w.note} at ${w.at - ORIGIN}: ${hz.toFixed(1)} Hz ≈ ${midiHz(w.midi).toFixed(1)}`);
  }
  assert.equal(T.WALTZ[T.WALTZ.length - 1].note, 'B♭5');
  assert.equal(T.WALTZ[T.WALTZ.length - 1].to, T.POINT);
  assert.equal(rms(m, lo(T.POINT) + Math.round(0.0016 * SR), N), 0, 'no waltz (nor its ping-pong) after the cut');
});

test('the waltz sits on top: ≥ 3 dB over the pad in bar 1 (the bible\'s ≈ 3 dB), and the pad is behind its opening filter', () => {
  const w = music(render((k) => k === 'trwaltz').stems);
  const p = music(render((k) => k === 'trpad').stems);
  const a = lo(T.at(1, 1));
  const b = lo(T.at(2, 1));
  const diff = dB(rms(w, a, b)) - dB(rms(p, a, b));
  assert.ok(diff >= 3, `waltz over pad in bar 1: ${diff.toFixed(1)} dB`);
  // 1.1: the pad is dark (its low-pass at 500 Hz); by 2.3 it is bright.
  const early = rms(band(p, 3000), lo(T.at(1, 1)), lo(T.at(1, 1.5))) / rms(p, lo(T.at(1, 1)), lo(T.at(1, 1.5)));
  const late = rms(band(p, 3000), lo(T.at(2, 3)), lo(T.at(2, 3.5))) / rms(p, lo(T.at(2, 3)), lo(T.at(2, 3.5)));
  assert.ok(late > 5 * early, `the filter opens: highs ${early.toFixed(3)} → ${late.toFixed(3)} of the pad`);
});

// ——— The flight, the crash, the collapse ———————————————————————————————————————————————————————————————————————————————————————

test('the flight noise runs from the launch and is cut dead on the crash; its band climbs with the speed', () => {
  const m = music(render((k) => k === 'trflight').stems);
  assert.equal(rms(m, 0, lo(T.LAUNCH)), 0, 'nothing before the launch');
  assert.ok(rms(m, lo(T.CRASH) - Math.round(0.03 * SR), lo(T.CRASH)) > 1e-3, 'loud into the crash');
  assert.equal(rms(m, lo(T.CRASH) + Math.round(0.0016 * SR), lo(T.CRASH) + Math.round(0.05 * SR)), 0, 'dead after it (no tail)');
  const share = (a, b) => rms(band(m, 2500), a, b) / rms(m, a, b);
  assert.ok(share(lo(T.CRASH) - 2400, lo(T.CRASH)) > 2 * share(lo(T.at(1, 3.5)), lo(T.at(1, 4))), 'brighter at 24 u/f than at 6');
});

test('the reverse cymbal stops dead on the vacuum; the collapse blips climb whole tones from C6, one a 32nd', () => {
  const c = music(render((k) => k === 'trrevcym').stems);
  assert.ok(rms(c, lo(T.POINT) - 400, lo(T.POINT)) > 3 * rms(c, lo(T.REVERSE_CYMBAL.from), lo(T.REVERSE_CYMBAL.from) + 400), 'it swells');
  assert.equal(rms(c, lo(T.POINT) + Math.round(0.0016 * SR), N), 0, 'and stops dead');
  const b = music(render((k) => k === 'trblip').stems);
  const hz = T.COLLAPSE_BLIPS.map((f, k) => pitch(lowpass(b, midiHz(84 + 2 * k) * 1.4), lo(f) + 60, lo(f) + 1500));
  hz.forEach((h, k) => assert.ok(near(h, midiHz(84 + 2 * k), 0.03), `blip ${k}: ${h.toFixed(0)} Hz ≈ ${midiHz(84 + 2 * k).toFixed(0)}`));
});

// ——— S2, the vacuum ——————————————————————————————————————————————————————————————————————————————————————————————————————————

test('S2: the music is digital zero from 2.4& to the Big Bang (post excluded), and the hooks say so (CUTS, SILENCES)', () => {
  assert.deepEqual(CUTS, [T.POINT]);
  assert.deepEqual(SILENCES, [{ from: T.POINT, to: T.TRANSITION_END }]);
  // The finished mix of every bus but the post bus (the chain as bgm.mjs runs it: the vacuum gated after the plate): exact zeros after
  // the 1.5 ms ramp.
  const { L, R } = mixAlone({ ...FULL.stems, post: stereo(N) }, SR, { origin: ORIGIN, sends: SENDS, cuts: CUTS, silences: SILENCES });
  const a = lo(T.POINT) + Math.round(0.0016 * SR);
  assert.ok(rms(L, lo(T.POINT) - 2400, lo(T.POINT)) > 1e-3, 'music up to the point');
  let nonzero = 0;
  for (let i = a; i < N; i++) if (L[i] !== 0 || R[i] !== 0) nonzero++;
  assert.equal(nonzero, 0, 'samples of music after the point');
  // Every own bus holds nothing after the point.
  for (const k of Object.keys(SENDS)) assert.equal(rms(FULL.stems[k].L, a, N) + rms(FULL.stems[k].R, a, N), 0, k);
});

test('S2\'s one sound: the point\'s whine alone on the post bus (≈ 10.5 kHz, ≈ −38 dBFS), cut a frame before the bang; no inhale', () => {
  const p = FULL.stems.post;
  assert.equal(rms(p.L, 0, lo(T.POINT)), 0, 'nothing on the post bus before the point (no inhale: M4 belongs to riso 4.4& and the ending)');
  const a = lo(T.POINT) + Math.round(0.01 * SR);
  const b = lo(T.TRANSITION_END - 1) - 10;
  const hz = pitch(p.L, a, a + Math.round(0.03 * SR));
  assert.ok(near(hz, 10500, 0.015), `the whine ≈ 10.5 kHz: ${hz.toFixed(0)}`);
  const level = dB(rms(p.L, a, a + Math.round(0.03 * SR)) * Math.SQRT2);
  assert.ok(level > -44 && level < -34, `≈ −38 dBFS peak: ${level.toFixed(1)}`);
  assert.ok(rms(p.L, a, b) > 0, 'sounding through the vacuum');
  assert.equal(rms(p.L, lo(T.TRANSITION_END - 1), N), 0, 'gone on the last frame');
  assert.ok(!FULL.events.some((e) => /inhale|breath/.test(e.kind)));
});

// ——— Loudness, determinism, previews ——————————————————————————————————————————————————————————————————————————————————————————

test('the lift\'s loudness (bible §1): −13.0 ± 0.7, bar 1 ≈ −14.5 (the exhale), bar 2 ≈ −11.5; true peak ≤ −2.0 dBTP', () => {
  const { L, R } = MIX;
  const part = measure(L, R, ORIGIN, T.TRANSITION_START, T.TRANSITION_END);
  const b1 = measure(L, R, ORIGIN, T.at(1), T.at(2)).lufs;
  const b2 = measure(L, R, ORIGIN, T.at(2), T.TRANSITION_END).lufs;
  assert.ok(Math.abs(part.lufs + 13.0) <= 0.7, `the lift ${part.lufs.toFixed(2)} LUFS`);
  assert.ok(Math.abs(b1 + 14.5) <= 0.5, `bar 1 ${b1.toFixed(2)}`);
  assert.ok(Math.abs(b2 + 11.5) <= 0.5, `bar 2 ${b2.toFixed(2)}`);
  assert.ok(truePeakDb(L, R) <= -2.0 + 1e-6, `true peak ${truePeakDb(L, R).toFixed(2)}`);
});

test('deterministic: two renders are sample-identical; the previews are the lift seam and the bang', () => {
  const h = (x) => createHash('sha256').update(Buffer.from(x.buffer)).digest('hex');
  const again = render();
  for (const k of [...Object.keys(SENDS), 'post']) {
    assert.equal(h(again.stems[k].L), h(FULL.stems[k].L), k);
    assert.equal(h(again.stems[k].R), h(FULL.stems[k].R), k);
  }
  assert.deepEqual(PREVIEWS.map((p) => p.id), ['lift-seam', 'bang']);
  assert.deepEqual(PREVIEWS[1], { id: 'bang', fromBar: partBar('transition', 2), toBar: partBar('cosmos', 1) });
});
