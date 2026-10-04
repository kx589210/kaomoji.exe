// The cosmos's music (scripts/audio/sections/cosmos.mjs; its voices in scripts/audio/cosmosVoices.mjs, its stage and lone mix in
// scripts/audio/cosmosStage.mjs and cosmosMix.mjs), the part 'cosmos' (6 bars), against its build sheet (notes/bcos/sheet.md §4,
// §11), the design (notes/cosmos3/final.md §9 bars 15–20) and the music bible (§2.1, §3, §4.3–4.4, §6): drop 1's groove and
// voices, the printed Big Bang (the drop's loudest beat), the freeze and its spin-up, every level's arrival, the hook rows 0–2, A and B,
// "wa" on the infection claps, the Defender's scan (dry, C), the waltz's answer, and the approved stutter cut from the finished mix into
// the club's dot. Every frame is the score's (src/score/cosmos.ts), every event lands on frame × 800 at 48 kHz, and the sounds are
// measured in the rendered audio, not only in the event list.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { measure, partsAlone } from '../scripts/audio/cosmosMix.mjs';
import { mixAlone, sampleOf } from '../scripts/audio/cosmosStage.mjs';
import { boing, burst, clank, flap, grains, hum, scanner, woodBlock } from '../scripts/audio/cosmosVoices.mjs';
import { Biquad } from '../scripts/audio/filters.mjs';
import { LIMIT_DB, MARGIN_DB } from '../scripts/audio/limiter.mjs';
import { integratedLoudness, truePeakDb } from '../scripts/audio/meter.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import { tink } from '../scripts/audio/breakVoices.mjs';
import { group as groupOf, sixteenths as sixteenthsOf } from '../scripts/audio/perceived.mjs';
import { fmBell } from '../scripts/audio/fm.mjs';
import {
  ARP, BANG_CHORD, BANG_PAD, BANG_TRIM, BED_DB, BELL_RING, BREATH, CASCADE, CUTS, GLASS, HAT_AIR, HOOK_LIFT_DB, HOOK_MAX_BOOST_DB, HOOK_NOTE_DB, OPEN_AIR, PREVIEWS, ROOT, SENDS, SILENCES, STAB, STAB_FRAMES, TINK,
  PRELAP, WA_CLAPS, bangTrimDb, bedGain, breathLevel, chordAt, cursorPan, drainSpeed, freezeLevel, hopNote, hopPan, kickGain, prelapVoices, renderCosmos, spinRate, stabBright, stutter, subLevel,
  trimStutter, voxDuck,
} from '../scripts/audio/sections/cosmos.mjs';
import * as CLUB from '../scripts/audio/sections/club.mjs';
import { VOICINGS } from '../scripts/audio/sections/drop1.mjs';
import * as TRANSITION from '../scripts/audio/sections/transition.mjs';
import { SENDS as TR_SENDS, renderTransition } from '../scripts/audio/sections/transition.mjs';
import * as C from '../src/score/cosmos.ts';
import { POINT as TRANSITION_POINT } from '../src/score/transition.ts';
import { partBar, partFrame, partStart } from '../src/score/film.ts';

const SR = 48000;
const at = (frame) => sampleOf(frame, SR);
const ORIGIN = C.COSMOS.from;
const N = at(C.COSMOS.to) - at(ORIGIN);
const lo = (frame) => at(frame) - at(ORIGIN);
const rms = (x, a, b) => Math.sqrt(x.subarray(a, b).reduce((s, v) => s + v * v, 0) / Math.max(1, b - a));
const dB = (v) => 20 * Math.log10(Math.max(1e-12, v));
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
const pitch = (x, a, b) => {
  const ups = [];
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) ups.push(i - x[i] / (x[i] - x[i - 1]));
  return ups.length < 2 ? 0 : ((ups.length - 1) * SR) / (ups[ups.length - 1] - ups[0]);
};
/** The magnitude of `x`'s component at `hz` over [a, b) (Goertzel, Hann window). */
const tone = (x, a, b, hz) => {
  const c = 2 * Math.cos((2 * Math.PI * hz) / SR);
  let s1 = 0;
  let s2 = 0;
  for (let i = a; i < b; i++) {
    const v = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a))) + c * s1 - s2;
    s2 = s1;
    s1 = v;
  }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2));
};
/** Whether `x` sounds MIDI note `m` over [a, b): its line at least `k` × what lies a semitone either side. */
const sounds = (x, a, b, m, k = 3) => {
  const at0 = tone(x, a, b, midiHz(m));
  return at0 > k * tone(x, a, b, midiHz(m + 1)) && at0 > k * tone(x, a, b, midiHz(m - 1));
};
const lowpass = (x, hz) => {
  const fs = [Biquad.lowpass(SR, hz), Biquad.lowpass(SR, hz)];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
const band = (x, a, b) => {
  const fs = [Biquad.highpass(SR, a), Biquad.highpass(SR, a), ...(b ? [Biquad.lowpass(SR, b), Biquad.lowpass(SR, b)] : [])];
  return Float32Array.from(x, (v) => fs.reduce((y, f) => f.process(y), v));
};
/** The cosmos rendered alone (stems start on cosmos 1.1): { stems, events }. */
const render = (solo) => {
  const stems = { post: stereo(N), sub: new Float32Array(N) };
  for (const k of Object.keys(SENDS)) stems[k] = stereo(N);
  const events = renderCosmos(stems, SR, { origin: ORIGIN, ...(solo ? { solo } : {}) });
  return { stems, events };
};
const mono = (stems, only = null) => {
  const m = new Float32Array(N);
  for (const [k, b] of Object.entries(stems)) if (b.L && (!only || only.includes(k))) for (let i = 0; i < N; i++) m[i] += 0.5 * (b.L[i] + b.R[i]);
  return m;
};
const solo1 = (kind, frame = null) => mono(render((k, f) => k === kind && (frame === null || f === frame)).stems);
const FULL = render();
const MIX = partsAlone(['transition', 'cosmos']);
/** The cosmos's finishing without the club's pickups (continuity plan v07 PRELAP): the stutter edit and its trim alone. */
const editOnly = (l, r, sr, o) => {
  stutter(l, r, sr, o);
  trimStutter(l, r, sr, LIMIT_DB - MARGIN_DB, o);
};
/** MIX finished by the edit alone: the stutter's own repeats and splices. */
const EDIT = (() => {
  const origin = partStart('transition');
  const n = at(C.COSMOS.to) - at(origin);
  const sends = { ...TR_SENDS, ...SENDS };
  const stems = { post: stereo(n), sub: new Float32Array(n) };
  for (const k of Object.keys(sends)) stems[k] = stereo(n);
  renderTransition(stems, SR, { origin });
  renderCosmos(stems, SR, { origin });
  const cuts = [...TRANSITION.CUTS, ...CUTS];
  const silences = [...TRANSITION.SILENCES, ...SILENCES];
  const { L, R } = mixAlone(stems, SR, { origin, sends, cuts, silences, finish: (l, r, sr, o) => { TRANSITION.finish(l, r, sr, o); editOnly(l, r, sr, o); } });
  return { L, R, origin };
})();
/** Momentary loudness (one beat, bible §0) of the beat starting on `frame`, in the lift + cosmos mix. */
const beatLufs = (frame) => measure(MIX.L, MIX.R, MIX.origin, frame, frame + 24).lufs;

// ——— Pure helpers ———————————————————————————————————————————————————————————————————————————————————————————————————————————————

test('the chords: IV · Vsus → V · iii · vi · IV → V · iii → vi on drop 1\'s voicings, the roots B♭1 C2 A1 D2 on the sub, no tonic', () => {
  assert.deepEqual(C.CHORDS.map((c) => chordAt(c.at)), ['IV', 'Vsus', 'V', 'iii', 'vi', 'IV', 'V', 'iii', 'vi']);
  assert.equal(chordAt(C.cs(2, 3) - 1), 'Vsus');
  assert.equal(chordAt(C.COSMOS.to - 1), 'vi', 'ends on vi: the club\'s IV restarts the loop');
  assert.deepEqual(ROOT, { IV: 34, Vsus: 36, V: 36, iii: 33, vi: 38 });
  // The bang sings B♭maj9 an octave up with the waltz's swallowed B♭5 on top (M10).
  assert.deepEqual(BANG_CHORD, [72, 74, 77, 81, 82]);
});

test('the bang: the kick 0.72 (0.5 after), the sub blooming in over its beat from 35 %; the stabs on the claps only; the breath into the sunrise', () => {
  assert.equal(kickGain(C.BANG), 0.72);
  assert.equal(kickGain(C.cs(1, 2)), 0.5);
  assert.ok(near(subLevel(C.BANG), 0.35, 1e-9));
  assert.equal(subLevel(C.cs(1, 2)), 1);
  for (let f = C.BANG; f < C.cs(1, 2); f++) assert.ok(subLevel(f + 1) >= subLevel(f));
  assert.equal(stabBright(C.LEVELS.galaxy), 1.2);
  assert.equal(stabBright(C.LEVELS.web), 1);
  // No chord held: two stabs a bar, on the claps (2 and 4), from the first clap (1.2) — drop 1's six-a-bar chop is gone.
  assert.deepEqual(STAB_FRAMES, C.CLAPS.filter((f) => f >= C.SHELL));
  for (let b = 1; b <= 6; b++) assert.equal(STAB_FRAMES.filter((f) => f >= C.cs(b) && f < C.cs(b) + 96).length, 2, `bar ${b}: two stabs`);
  assert.ok(STAB.voices <= 3 && STAB.frames <= 4 && STAB.from + STAB.floor <= 6000 && SENDS.csStab <= 0.12, 'short, thin, dry, no presence');
  // The breath (M2's "brief swell into a section start"): FALL-sized, swelling 2.2& → 2.3, gone by 2.4.
  assert.ok(BREATH.voices <= 3 && BREATH.peak <= 0.07 && BREATH.cutoff <= 1200);
  assert.equal(breathLevel(C.PREDAWN - 1), 0);
  assert.equal(breathLevel(C.PREDAWN), 0);
  assert.ok(near(breathLevel(C.SUNRISE.at), BREATH.peak, 1e-9));
  for (let f = C.PREDAWN; f < C.SUNRISE.at; f++) assert.ok(breathLevel(f + 1) >= breathLevel(f));
  assert.ok(breathLevel(C.SUNRISE.at + 12) < 0.1 * BREATH.peak, 'down 20 dB half a beat after the sunrise');
  assert.equal(breathLevel(C.UNWRAP.at), 0);
  assert.equal(STAB_FRAMES[0], C.cs(1, 2), 'the stabs come in on the first clap (1.2)');
  assert.ok(STAB_FRAMES.every((f) => f >= C.SHELL && f < C.COSMOS.to));
});

test('the freeze: the roar held at −3 dB on 1.1e, settling toward −18 dB, spun up two octaves on the slice and cut on SLICE.held', () => {
  assert.equal(freezeLevel(C.TIME.freeze - 1), 0);
  assert.ok(near(dB(freezeLevel(C.TIME.freeze)), -3, 0.01));
  assert.ok(dB(freezeLevel(C.SLICE.at - 1)) < -15 && dB(freezeLevel(C.SLICE.at - 1)) > -18.01);
  assert.ok(freezeLevel(C.SLICE.held - 1) > freezeLevel(C.SLICE.at - 1));
  assert.equal(freezeLevel(C.SLICE.held), 0);
  assert.equal(spinRate(C.SLICE.at - 1), 1);
  assert.equal(spinRate(C.SLICE.held), 4);
});

test('the bed under the bang: 1 through cosmos 1.1\'s beat, BED_DB from 1.2 (stepped just before its kick)', () => {
  assert.ok(BED_DB < 0 && BED_DB > -2);
  assert.equal(bedGain(C.BANG), 1);
  assert.equal(bedGain(C.SHELL - 2), 1);
  assert.ok(near(bedGain(C.SHELL), 10 ** (BED_DB / 20), 1e-9));
  assert.ok(near(bedGain(C.COSMOS.to - 1), 10 ** (BED_DB / 20), 1e-9));
});

test('the arcs: chord tones two octaves up (IV, then V from 5.3), spreading wider hop by hop; the cursors circle once in 8 sixteenths', () => {
  C.HOPS.forEach((f, k) => {
    assert.ok(VOICINGS[chordAt(f)].map((m) => m + 24).includes(hopNote(k)), `hop ${k} in its chord`);
    assert.ok(Math.abs(hopPan(k)) <= 0.85);
  });
  const mean = (ks) => ks.reduce((s, k) => s + Math.abs(hopPan(k)), 0) / ks.length;
  assert.ok(mean([7, 8, 9, 10]) > mean([0, 1, 2, 3]) + 0.2, 'wider at the end');
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(cursorPan(k, 0) - cursorPan(k, 8)) < 1e-9);
});

test('the drain triples on the sandbox; the vox ducks −10 dB under the scan; "wa" on every infection clap but 5.4 (and none before Earth)', () => {
  assert.equal(drainSpeed(C.HORIZON.at), 1);
  assert.ok(near(drainSpeed(C.SANDBOX - 0.001), 2, 1e-3));
  assert.equal(drainSpeed(C.SANDBOX), 6);
  assert.ok(near(dB(voxDuck(C.SCAN.from)), -10, 1e-9));
  assert.equal(voxDuck(C.WINK), 1);
  assert.equal(voxDuck(C.SCAN.from - 1), 1);
  assert.deepEqual(WA_CLAPS, C.CLAPS.filter((f) => f >= C.LEVELS.earth && f < C.STUTTER.from && f !== C.SCAN.from));
  assert.ok(!WA_CLAPS.includes(C.SCAN.from) && !WA_CLAPS.includes(C.SHELL));
});

test('the new voices: a card flap (gone in 30 ms), the burst (wide, darkening), the frozen grain at its rate, the hum at 120 Hz', () => {
  const f = new Float32Array(SR / 4);
  flap(f, 100, SR, { gain: 0.05 });
  assert.equal(rms(f, 0, 100), 0);
  assert.ok(rms(f, 100 + 0.03 * SR, SR / 4) === 0, 'a flap is gone in 30 ms');
  const L = new Float32Array(SR * 2);
  const R = new Float32Array(SR * 2);
  burst(L, R, 0, SR, { gain: 0.3, decay: 1.4, holdMs: 140, body: 0.2 });
  assert.ok(rms(L, 0, 0.1 * SR) > 4 * rms(L, 1.0 * SR, 1.2 * SR), 'it dies');
  const hi = (a, b) => rms(band(L, 4000), a, b) / rms(L, a, b);
  assert.ok(hi(0, 0.05 * SR) > 3 * hi(0.8 * SR, 0.9 * SR), 'it darkens');
  let c = 0;
  for (let i = 0; i < 0.1 * SR; i++) c += L[i] * R[i];
  assert.ok(c / (0.1 * SR) < 0.8 * rms(L, 0, 0.1 * SR) * rms(R, 0, 0.1 * SR), 'its sides are decorrelated (wide)');
  // A grain cloud of a 440 Hz tone at rate 2 sounds at 880 Hz.
  const src = Float32Array.from({ length: 2400 }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / SR));
  const g = new Float32Array(SR / 2);
  grains(g, src, 0, g.length, SR, { gain: 1, grainMs: 30, density: 80, rate: () => 2, cutoff: 6000, seed: 1 });
  assert.ok(near(pitch(lowpass(g, 1300), 0.1 * SR, 0.4 * SR), 880, 0.05), 'the spin-up raises the pitch with the rate');
  const h = new Float32Array(SR / 2);
  hum(h, 0, h.length, SR, { gain: 0.035, swell: 0.1 });
  assert.ok(near(pitch(lowpass(h, 150), 0.1 * SR, 0.4 * SR), 120, 0.03), 'the hum is the mains\' 120 Hz');
});

test('the Defender\'s voices are pitch class C: the sandbox clank on C3, the scanner sweeping 2.4 kHz → 900 Hz; the boing 350 Hz; the woodblock', () => {
  const k = new Float32Array(SR / 2);
  clank(k, 0, SR, { freq: midiHz(48), gain: 0.2 });
  assert.ok(near(pitch(lowpass(k, 200), 0.05 * SR, 0.2 * SR), midiHz(48), 0.04), `the clank on C3: ${pitch(lowpass(k, 200), 0.05 * SR, 0.2 * SR).toFixed(1)}`);
  const s = new Float32Array(SR / 4);
  scanner(s, 0, 9600, SR, { from: 2400, to: 900, buzz: 30, gain: 0.05 });
  assert.ok(near(pitch(s, 100, 600), 2400, 0.05) && near(pitch(s, 9000, 9500), 900, 0.05), 'the scan sweeps down');
  const b = new Float32Array(SR / 2);
  boing(b, 0, SR, { freq: 350, gain: 0.13 });
  assert.ok(near(pitch(lowpass(b, 500), 0.15 * SR, 0.3 * SR), 350, 0.04));
  const w = new Float32Array(SR / 4);
  woodBlock(w, 0, SR, { freq: midiHz(76), gain: 0.1 });
  assert.ok(near(pitch(lowpass(w, 900), 0.002 * SR, 0.05 * SR), midiHz(76), 0.05));
});

// ——— Every event on its frame ————————————————————————————————————————————————————————————————————————————————————————————————

test('every event lands on its score frame (frame × 800 at 48 kHz): one row per kind', () => {
  const lead = C.HOOK.filter((n) => !n.whisper && !(n.at >= C.WINK && n.at < C.HORIZON.at)).map((n) => n.at);
  const levels = [C.LEVELS.earth, C.LEVELS.solar, C.LEVELS.galaxy, C.LEVELS.web, C.LEVELS.horizon];
  const expect = {
    cskick: C.KICKS, csclap: C.CLAPS, csfillsnare: C.FILL, cshat: C.HATS, csopenhat: C.OPEN_HATS,
    cspad: [C.BANG], csbreath: [C.SUNRISE.at], cstink: GLASS.map((t) => t.at), csstab: [C.cs(1, 2)], cssub: [C.BANG], cspluck: [C.OPEN_HATS[0]],
    cslead: lead, cswhisper: [C.SCAN.from], cshehe: [C.WINK, C.WINK + 3], cswa: [...WA_CLAPS, C.SLINGSHOT].sort((a, b) => a - b),
    cssung: [C.BANG], cshey: [C.LOCK.from],
    cslevel: levels, cszoom: levels, csbells: levels.slice(0, 4),
    cscrash: [C.BANG], csimpact: [C.BANG], csburst: [C.BANG], csfreeze: [C.TIME.freeze], csspin: [C.SLICE.at], csglitter: [C.BANG],
    cspop: C.REAM_PASTES.map((p) => p.at), csratchet: [C.SHELL], csorbit: [C.ORBIT[2].at, C.ORBIT[4].at, C.ORBIT[5].at, C.ORBIT[6].at],
    cslock: [C.LOCK.from], csshing: [C.SLICE.at], csriser: [C.FILL[0]], csfountain: [C.FOUNTAIN[0].at], csodo: C.POWERS,
    csflap: C.WAVE_RINGS.filter((f) => f < C.SUNRISE.at), cstilt: [C.TILT_UP], cszip: C.CLAPS.filter((f) => f >= C.LEVELS.earth && f < C.LEVELS.solar),
    csswell: [C.SUNRISE.at], cssunrise: [C.SUNRISE.at], cscrane: [C.SUNRISE.at], cstinks: [C.SUNRISE.at], csbeam: [C.MOON_BEAM], csmoon: [C.MOON_BEAM],
    csclunk: [C.UNWRAP.at], csbellchord: [C.UNWRAP.at, C.LAP.at], csfwip: [C.WHIP.to - 2], csstamp: [C.WHIP.from],
    csblock: C.RATCHETS, csclack: [C.CURSORS[0].at], csdoppler: [C.SLINGSHOT], csboing: [C.SLINGSHOT], cscme: [C.SLINGSHOT],
    csshk: C.CLAPS.filter((f) => f >= C.LEVELS.solar && f < C.LEVELS.galaxy), cslap: [C.LAP.at], csding: [C.LAP.at], csfling: [C.FLING.from], cscharge: [C.FLING.from],
    cswarp: [C.WARP], cswarpboom: [C.WARP], csdrone: [C.WARP], csstardust: [C.LEVELS.galaxy], cswhoomp: [C.DUST.punch],
    csshort: C.CLAPS.filter((f) => f >= C.LEVELS.galaxy && f < C.LEVELS.web), csrevwhoosh: [C.REVEAL], cschime: [C.cs(4, 1.5)], csquasar: [C.QUASAR.at], csdisc: [C.TILT.from],
    csarc: C.HOPS, csglass: [C.ROLL.at, C.SCAN.from], csroll: [C.ROLL.at], csbounce: [C.WALL], csmetal: [C.WALL], csshower: [C.WALL], cszapback: [C.WALL + 3],
    csscan: [C.SCAN.from], csallclear: [C.WINK], csbeep: [C.RETICLE],
    csanswer: C.WALTZ_ANSWER.map((n) => n.at), csspaghetti: C.SPAGHETTI, csshing6: [C.INFINITY], csdrain: [C.HORIZON.at],
    csclank: [C.SANDBOX], cssubsweep: [C.SANDBOX], csrevcym: [C.STUTTER.from],
    csspark: [...new Set(C.STUTTER_SLICES.map((s) => s.shows))], cshum: [C.STUTTER.from + 6],
  };
  const got = {};
  for (const e of FULL.events) (got[e.kind] ??= []).push(e.at);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(expect).sort(), 'the kinds');
  for (const [kind, frames] of Object.entries(expect)) assert.deepEqual(got[kind], frames.map(at), kind);
  assert.ok(FULL.events.every((e) => e.kind.startsWith('cs')), 'every kind is cs…');
  const drums = new RegExp('^(?!.*rev)[a-z0-9]*(kick|clap|snare|ghost|heart)$');
  assert.deepEqual([...new Set(FULL.events.filter((e) => drums.test(e.kind)).map((e) => e.kind))].sort(), ['csclap', 'cskick', 'csfillsnare'].sort());
  assert.equal(got.cslead.length + got.cswhisper.length + got.cshehe.length, C.HOOK.length, 'every hook note sung once');
});

test('the sounds start on their samples (solo renders): the bang, the slice\'s shing, the sunrise, the slingshot, the sandbox, a hop', () => {
  for (const [kind, frame] of [['cskick', C.BANG], ['csshing', C.SLICE.at], ['cssunrise', C.SUNRISE.at], ['csboing', C.SLINGSHOT], ['csclank', C.SANDBOX], ['csarc', C.HOPS[5]]]) {
    const m = solo1(kind, frame);
    const s = lo(frame);
    assert.equal(rms(m, 0, s), 0, `${kind}: nothing before its sample`);
    assert.ok(rms(m, s, s + 0.01 * SR) > 1e-4, `${kind}: sounding from it`);
  }
});

// ——— The bang and the freeze ——————————————————————————————————————————————————————————————————————————————————————————————————

test('the burst roars to 1.1e and freezes there: its own sound is gone 25 ms later; the grain holds from 1.1e and spins up into the slice', () => {
  const b = solo1('csburst');
  assert.ok(rms(b, 0, lo(C.TIME.freeze)) > 1e-2, 'the roar');
  assert.equal(rms(b, lo(C.TIME.freeze) + Math.round(0.021 * SR), N), 0, 'frozen: no tail of it');
  const g = mono(render((k) => k === 'csfreeze').stems);
  assert.equal(rms(g, 0, lo(C.TIME.freeze)), 0);
  assert.ok(rms(g, lo(C.TIME.freeze), lo(C.TIME.freeze) + 1200) > 0.1 * rms(b, lo(C.TIME.freeze) - 1600, lo(C.TIME.freeze)), 'it takes the roar over');
  assert.equal(rms(g, lo(C.SLICE.held) + 80, N), 0, 'cut on SLICE.held');
  const bright = (a, z) => rms(band(g, 2500), a, z) / rms(g, a, z);
  assert.ok(bright(lo(C.SLICE.held) - 1600, lo(C.SLICE.held)) > 2 * bright(lo(C.cs(1, 3)), lo(C.cs(1, 3.5))), 'the spin-up is brighter (two octaves up)');
});

// v08 (2026-10-03): the very start of the cosmos was too loud, so the bang is a little quieter (BANG_TRIM). It was the
// drop's loudest beat in LUFS (bible §4.3: −9.36, ≥ the cosmos's next + 0.3, ≥ the club's loudest + 0.3); trimmed 2 dB it stays the
// cosmos's biggest hit to the ear (sones, perceived.mjs: the measure since FW7) and the loudest beat of its bar, while the club's
// own hits (its 1.1 −9.9, its 6.4 −9.97 LUFS) now out-measure it in LUFS.
test('cosmos 1.1 a little quieter (10-03): the finished mix × BANG_TRIM — 2 dB down through 1.1, eased back by 2.1; nothing else moves', () => {
  assert.ok(BANG_TRIM.db >= -2 && BANG_TRIM.db <= -1.5, `a little: ${BANG_TRIM.db} dB`);
  assert.deepEqual([BANG_TRIM.hold, BANG_TRIM.to], [C.SHELL, C.LEVELS.earth]);
  assert.equal(bangTrimDb(C.BANG - 1e-3), 0, 'the run-up and the vacuum untouched');
  assert.equal(bangTrimDb(C.BANG), BANG_TRIM.db);
  assert.equal(bangTrimDb(C.SHELL - 1e-3), BANG_TRIM.db, 'held through the bang\'s beat');
  for (let f = C.SHELL; f < C.LEVELS.earth; f += 0.5) assert.ok(bangTrimDb(f + 0.5) >= bangTrimDb(f), `eases back, never dips: +${f - C.BANG}`);
  assert.ok(bangTrimDb(C.LEVELS.earth - 1) > -0.01 && bangTrimDb(C.LEVELS.earth) === 0, 'back to the approved level by Earth');
  // In the mix: MIX (finished with the trim) is EDIT (the same mix, untrimmed) × the trim's gain, sample for sample, up to the stutter.
  const o = at(MIX.origin);
  let inside = 0;
  let outside = 0;
  for (let i = 0; i < at(C.STUTTER.from) - o - 400; i++) {
    const g = 10 ** (bangTrimDb(((o + i) / SR) * 60) / 20);
    const d = Math.max(Math.abs(MIX.L[i] - EDIT.L[i] * g), Math.abs(MIX.R[i] - EDIT.R[i] * g));
    if (g === 1) outside = Math.max(outside, d);
    else inside = Math.max(inside, d);
  }
  assert.equal(outside, 0, 'outside 1.1 → 2.1 the mix is untouched');
  assert.ok(inside < 1e-6, `a pure gain: ${inside}`);
  const plain = measure(EDIT.L, EDIT.R, EDIT.origin, C.BANG, C.SHELL).lufs;
  const bang = beatLufs(C.BANG);
  assert.ok(Math.abs(bang - plain - BANG_TRIM.db) < 0.01, `the bang's beat ${plain.toFixed(2)} → ${bang.toFixed(2)} LUFS`);
  assert.ok(bang >= -11.6, `still a hit: ${bang.toFixed(2)}`);
  for (let f = C.SHELL; f < C.LEVELS.earth; f += 24) assert.ok(bang >= beatLufs(f) + 0.1, `the loudest beat of bar 1: ${bang.toFixed(2)} vs ${beatLufs(f).toFixed(2)} on +${f - C.BANG}`);
  // To the ear (sones): 9–14 % softer than untrimmed, and still the cosmos's biggest beat.
  const sonesOf = (m) => groupOf(sixteenthsOf(m.L, m.R, SR, C.COSMOS.from - m.origin, C.COSMOS.to - m.origin, { small: false }), 4).map((b) => b.sones);
  const [ours, ...others] = sonesOf(MIX);
  const [was] = sonesOf(EDIT);
  assert.ok(ours / was >= 0.86 && ours / was <= 0.91, `the bang's beat ${was.toFixed(1)} → ${ours.toFixed(1)} sones`);
  assert.ok(ours >= Math.max(...others), `the cosmos's biggest beat to the ear: ${ours.toFixed(1)} vs ${Math.max(...others).toFixed(1)} sones`);
});

// A chord held behind everything is noise (music bible M2). With no chord held from 1.2
// (round 2: the glass pad and drop 1's six-a-bar stabs gone, the hook lifted and levelled) the cosmos sits at −11.1 — under the bible's
// −10.0 (an arc rule, handed to the lead's rescoping list) but still a step up from riso (−11.9) and the transition (−12.7), the bang
// its loudest beat by ≥ 0.7 LU. (v08 → 10-03: the bang 2 dB down, eased back over bar 1 — bar 1 −10.8 → −12.2, the
// part −11.1 → −11.3.)
test('the cosmos\'s loudness: −11.1 ± 0.3 (no chord held: M2), bars 2–6 within 0.6 of −11.1 (bar 1 −12.2 ± 0.3: the bang\'s trim), true peak ≤ −2.0 dBTP', () => {
  const part = measure(MIX.L, MIX.R, MIX.origin, C.COSMOS.from, C.COSMOS.to);
  assert.ok(Math.abs(part.lufs + 11.1) <= 0.3, `the cosmos ${part.lufs.toFixed(2)}`);
  for (let b = 1; b <= 6; b++) {
    const x = measure(MIX.L, MIX.R, MIX.origin, C.cs(b), C.cs(b) + 96).lufs;
    if (b === 1) assert.ok(Math.abs(x + 12.2) <= 0.3, `bar 1 (BANG_TRIM): ${x.toFixed(2)}`);
    else assert.ok(Math.abs(x + 11.1) <= 0.6, `bar ${b}: ${x.toFixed(2)}`);
  }
  assert.ok(truePeakDb(MIX.L, MIX.R) <= -2.0 + 1e-6, `true peak ${truePeakDb(MIX.L, MIX.R).toFixed(2)}`);
});

// ——— The hook, the scan, the answer ————————————————————————————————————————————————————————————————————————————————————————————

test('the scan: the hook ducks under it (the whispered E6 alone at full), the scanner is dry; the beeps are C7, the all-clear C6 + E6', () => {
  assert.ok(SENDS.csDry <= 0.05, 'the Defender is dry (M8/M9)');
  const v = mono(render((k) => k === 'cslead').stems);
  // The ping-pong of row A's notes before the scan: quieter inside the scan than just before it.
  assert.ok(dB(rms(v, lo(C.SCAN.from) + 600, lo(C.WINK))) < dB(rms(v, lo(C.SCAN.from) - 1600, lo(C.SCAN.from))) - 6, 'the vox ducks');
  const w = solo1('cswhisper');
  assert.ok(sounds(w, lo(C.SCAN.from) + 600, lo(C.SCAN.from) + 4600, 88, 2), 'the whisper is E6');
  const beeps = solo1('csbeep');
  assert.ok(sounds(beeps, lo(C.RETICLE), lo(C.RETICLE) + 1400, 96), 'C7');
  assert.ok(rms(beeps, lo(C.RETICLE) + Math.round(0.035 * SR), lo(C.RETICLE) + Math.round(0.055 * SR)) < 0.1 * rms(beeps, lo(C.RETICLE) + 100, lo(C.RETICLE) + 1300), 'two beeps, a gap between');
  assert.ok(rms(beeps, lo(C.RETICLE) + Math.round(0.062 * SR), lo(C.RETICLE) + Math.round(0.088 * SR)) > 0.3 * rms(beeps, lo(C.RETICLE) + 100, lo(C.RETICLE) + 1300));
  const ac = solo1('csallclear');
  assert.ok(sounds(ac, lo(C.WINK), lo(C.WINK) + 4800, 84) && sounds(ac, lo(C.WINK), lo(C.WINK) + 4800, 88), 'the chime is C6 + E6');
});

test('the waltz\'s answer: four bells C6 C6 A5 A5 on 6.1 – 6.2& (M6)', () => {
  const m = solo1('csanswer');
  C.WALTZ_ANSWER.forEach((n) => {
    assert.ok(sounds(m, lo(n.at) + 100, lo(n.at) + 6100, n.midi), `${n.midi} on +${n.at - ORIGIN}`);
  });
});

// ——— The stutter and the out-join ——————————————————————————————————————————————————————————————————————————————————————————————

test('the stutter edit: each output frame plays the content frame the picture shows (6·6·3·3·3·3), spliced over 1.5 ms, back on club 1.1', () => {
  // A mix whose every frame is its own number: the edit must play stutterFrame's numbers.
  const n = at(C.COSMOS.to + 4) - at(ORIGIN);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = R[i] = Math.floor((i * 60) / SR + ORIGIN) / 10000;
  stutter(L, R, SR, { origin: ORIGIN });
  const x = Math.round(0.0015 * SR);
  const shows = [];
  for (let f = C.STUTTER.from; f < C.COSMOS.to + 2; f++) {
    for (const i of [lo(f) + x + 1, lo(f) + 400, lo(f + 1) - 1]) assert.ok(Math.abs(L[i] - C.stutterFrame(f) / 10000) < 1e-6 && L[i] === R[i], `output frame +${f - C.STUTTER.from} plays ${L[i] * 10000}`);
    shows.push(C.stutterFrame(f) - C.STUTTER.from);
  }
  assert.deepEqual(shows.slice(0, 24), [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 6, 7, 8, 6, 7, 8, 9, 10, 11, 9, 10, 11], 'the approved 6·6·3·3·3·3');
  assert.equal(L[lo(C.STUTTER.from) - 1], Math.fround((C.STUTTER.from - 1) / 10000), 'nothing before the stutter changes');
});

test('the finished stutter: its repeats are sample-exact, everything of the cosmos ends by its last frame (its splices: "no splice of the stutter clicks" below)', () => {
  // The edit alone (the stutter and its trim; finish() then writes the club's pickups over its last two cells: tested below).
  const { L } = EDIT;
  const s = (f) => at(f) - at(EDIT.origin);
  const x = Math.round(0.0015 * SR) + 1;
  // Slice 2 (output STUTTER.from + 6) replays content STUTTER.from: equal to slice 1 after the splice.
  for (const [rep, src, len] of [[6, 0, 6], [15, 12, 3], [21, 18, 3]]) {
    let worst = 0;
    for (let i = x; i < len * 800; i++) worst = Math.max(worst, Math.abs(L[s(C.STUTTER.from + rep) + i] - L[s(C.STUTTER.from + src) + i]));
    assert.ok(worst < 1e-6, `slice at +${rep} repeats +${src}: ${worst}`);
  }
  // Every own bus is silent from club 1.1 (its 1.5 ms fade); the plate does not restart there (continuity plan v07: no CUT on club 1.1).
  const end = lo(C.COSMOS.to);
  for (const k of Object.keys(SENDS)) assert.equal(rms(FULL.stems[k].L, end, N) + rms(FULL.stems[k].R, end, N), 0, k);
  assert.deepEqual(CUTS, []);
  assert.deepEqual(SILENCES, []);
  // The finished mix is the edit until the pickups (less the limiter's 5 ms look-ahead before them), the edit plus the pickups after —
  // and on 1.1 → 2.1 the edit × the bang's trim (BANG_TRIM, 10-03; a pure gain, tested above).
  const a = s(PRELAP.piano.at) - Math.round(0.006 * SR);
  const [t0, t1] = [s(C.BANG), s(BANG_TRIM.to)];
  let worst = 0;
  for (let i = 0; i < a; i++) if (i < t0 || i >= t1) worst = Math.max(worst, Math.abs(MIX.L[i] - EDIT.L[i]), Math.abs(MIX.R[i] - EDIT.R[i]));
  assert.equal(worst, 0, 'nothing before the pickups changes but the bang\'s trim');
});

/**
 * The club arrives a beat early (continuity plan v07 §2.3, FW3's J-cut): over the stutter's last two cells the club's house piano (its
 * IV stab, B♭maj9's voicing and top) and its brass (a pickup lipped up into IV) play into the dot, in the club's room, at its level.
 */
test('the club’s pickups over the stutter’s last two cells: the piano’s IV stab on +18, the horns’ pickup on +21, heard over the stutter, in the club’s room', () => {
  assert.equal(PRELAP.piano.at, C.STUTTER.from + 18);
  assert.equal(PRELAP.horn.at, C.STUTTER.from + 21);
  assert.equal(PRELAP.horn.at + PRELAP.horn.frames, C.COSMOS.to - 1, 'the pickup lands a frame before the dot');
  assert.deepEqual([PRELAP.piano.send, PRELAP.horn.send], [CLUB.SENDS.clPiano, CLUB.SENDS.clBrass], 'the club’s own sends');
  const v = prelapVoices(SR);
  const m = (x, a, b) => rms(Float32Array.from(x.L.subarray(a, b), (q, i) => 0.5 * (q + x.R[a + i])), 0, b - a);
  const s = (f) => at(f) - at(MIX.origin);
  const o = (f) => at(f) - at(PRELAP.piano.at);
  const stab = m(v, o(PRELAP.piano.at), o(PRELAP.piano.at + 3));
  const horn = m(v, o(PRELAP.horn.at), o(PRELAP.horn.at + 3));
  const mixStab = m(MIX, s(PRELAP.piano.at), s(PRELAP.piano.at + 3));
  assert.ok(dB(stab) - dB(mixStab) > -9, `the stab ${(dB(stab) - dB(mixStab)).toFixed(1)} dB re the mix`);
  assert.ok(dB(horn) - dB(mixStab) > -9, `the pickup ${(dB(horn) - dB(mixStab)).toFixed(1)} dB re the mix`);
  assert.ok(sounds(Float32Array.from(v.L, (q, i) => 0.5 * (q + v.R[i])), 0, o(PRELAP.horn.at), VOICINGS.IV[3] + 12, 2), 'the stab is B♭maj9 (its top, A5)');
  // Nothing of them before +18; the room's tail gone (40 dB down) within PRELAP.tail.
  assert.equal(rms(EDIT.L, 0, 1) >= 0, true);
  const tail = m(v, v.L.length - Math.round(0.1 * SR), v.L.length);
  assert.ok(dB(tail) < dB(stab) - 40, `the room's tail ${(dB(tail) - dB(stab)).toFixed(1)} dB by ${PRELAP.tail} s`);
});

test('the hook\'s D6 stutters into the club: row B\'s last note is D6 on 6.4, inside the stutter\'s content', () => {
  const last = C.HOOK[C.HOOK.length - 1];
  assert.equal(last.midi, 86);
  assert.equal(last.at, C.STUTTER.from);
  const v = solo1('cslead', last.at);
  assert.ok(near(pitch(lowpass(v, 1500), lo(last.at) + 300, lo(last.at) + 4000), midiHz(86), 0.04), 'it sings D6');
});

test('deterministic: two renders are sample-identical; the preview is the horizon → the club\'s dot', () => {
  const h = (x) => createHash('sha256').update(Buffer.from(x.buffer)).digest('hex');
  const again = render();
  for (const k of [...Object.keys(SENDS), 'post']) {
    assert.equal(h(again.stems[k].L), h(FULL.stems[k].L), k);
    assert.equal(h(again.stems[k].R), h(FULL.stems[k].R), k);
  }
  assert.deepEqual(PREVIEWS, [{ id: 'horizon-club', fromBar: partBar('cosmos', 6), toBar: partBar('club', 1) }]);
});

test('the film plays them: bgm.mjs renders the transition and the cosmos on their frames, and v04\'s cosmos no more', async () => {
  const { renderStems } = await import('../scripts/audio/bgm.mjs');
  const { events } = renderStems(SR);
  const inFilm = (e) => e.at >= at(C.COSMOS.from) && e.at < at(C.COSMOS.to);
  const cs = events.filter((e) => e.kind.startsWith('cs'));
  assert.deepEqual(cs.map((e) => [e.kind, e.at]), FULL.events.map((e) => [e.kind, e.at]), 'the cosmos\'s events, as rendered alone');
  assert.ok(cs.every(inFilm));
  // The transition's, as it renders alone (its own kinds: another part has a "track" kind).
  const n = at(C.COSMOS.from) - at(partStart('transition'));
  const st = { post: stereo(n), sub: new Float32Array(n) };
  for (const k of Object.keys(TR_SENDS)) st[k] = stereo(n);
  const alone = renderTransition(st, SR, { origin: partStart('transition') });
  const kinds = new Set(alone.map((e) => e.kind));
  assert.deepEqual(events.filter((e) => kinds.has(e.kind)).map((e) => [e.kind, e.at]), alone.map((e) => [e.kind, e.at]), 'the transition\'s events');
  const old = events.filter((e) => e.kind.startsWith('d1') && e.at < at(C.COSMOS.to));
  assert.deepEqual(old, [], 'no v04 cosmos (sections/drop1.mjs renderDrop1) under the new one');
});

/** The film's finished mix (bgm.mjs), rendered once for the tests that measure the cosmos against the other parts. */
const filmMix = (() => {
  let memo = null;
  return async () => {
    if (memo) return memo;
    const { mixdown, renderStems } = await import('../scripts/audio/bgm.mjs');
    memo = mixdown(renderStems(SR).stems, SR);
    return memo;
  };
})();

/** The level above 2 kHz (dB, mid, 4th-order high-pass settled over 100 ms before `a`) of samples [a, b). */
const high = (L, R, a, b) => {
  const f = Biquad.highpass(SR, 2000);
  const g = Biquad.highpass(SR, 2000);
  let s = 0;
  for (let i = Math.max(0, a - 4800); i < b; i++) {
    const y = g.process(f.process(0.5 * (L[i] + R[i])));
    if (i >= a) s += y * y;
  }
  return 10 * Math.log10(s / (b - a));
};

/** An in-place radix-2 FFT (re, im of a power-of-two length). */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const w = (-2 * Math.PI) / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < size / 2; j++) {
        const cr = Math.cos(w * j);
        const ci = Math.sin(w * j);
        const k = i + j + size / 2;
        const vr = re[k] * cr - im[k] * ci;
        const vi = re[k] * ci + im[k] * cr;
        re[k] = re[i + j] - vr;
        im[k] = im[i + j] - vi;
        re[i + j] += vr;
        im[i + j] += vi;
      }
    }
  }
}
/** The bible's centroid (§6.4, tests/drop2Audio.test.mjs bibleCentroid): mean over 4096-point Hann windows hopping 2048 of each window's magnitude-weighted centroid of the mid, 23 Hz – 16 kHz, over samples [a, b). */
const centroid = (L, R, a, b) => {
  let sum = 0;
  let count = 0;
  for (let s = a; s + 4096 <= b; s += 2048) {
    const re = new Float64Array(4096);
    const im = new Float64Array(4096);
    for (let i = 0; i < 4096; i++) re[i] = 0.5 * (L[s + i] + R[s + i]) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / 4096));
    fft(re, im);
    let num = 0;
    let den = 0;
    for (let k = 1; k < 2048; k++) {
      const f = (k * SR) / 4096;
      if (f < 23 || f > 16000) continue;
      const mag = Math.hypot(re[k], im[k]);
      num += f * mag;
      den += mag;
    }
    if (den > 0) {
      sum += num / den;
      count++;
    }
  }
  return sum / count;
};

// The two brightness rules after the pad's re-voicing (2026-10-02: the constant chord was the noise). Drop 1's wall carried
// most of the cosmos's 2–8 kHz, so without it the level above 2 kHz fell 1–2.7 dB under riso 4's (the old rule: within 1 dB). Round 1's
// glass pad gave back the low-mid body (the centroid at v04's, ≈ 4220 Hz), not that air: the air was the noise. So the old
// rule is restated as what it protects. (1) v01's sag (the drop sank: the centroid fell ≈ 4700 → 1100 Hz): no cosmos bar's centroid
// under the bar before the vacuum (the transition's 2), their mean ≥ 0.75 × riso 4's (the wall and the glass pad both ≈ 0.79 ×). (2) Drop 2 the brighter drop: above 2 kHz
// louder than the cosmos. Round 2 (no chord held, M2): without the glass pad's low-mid body and with FALL's glass, the cosmos's centroid
// rose to ≈ 4.7 kHz (v04 4285 Hz). The bible's centroid ratio between the drops (drop2Audio: ≥ 1.03 × drop 1's) is an arc rule: handed
// to the lead's rescoping list, not tuned here (the cosmos's harmony is not set by the arc tests).
test('the drop does not sink (v01\'s sag): every cosmos bar\'s centroid ≥ the transition 2\'s, their mean ≥ 0.75 × riso 4\'s (before its silent half beat)', async () => {
  const film = await filmMix();
  const riso = centroid(film.L, film.R, at(partFrame('riso', 4)), at(partFrame('riso', 4, 3.5)));
  const lift = centroid(film.L, film.R, at(partFrame('transition', 2)), at(TRANSITION_POINT));
  let mean = 0;
  for (let b = 1; b <= 6; b++) {
    const c = centroid(MIX.L, MIX.R, at(C.cs(b)) - at(MIX.origin), at(C.cs(b) + 96) - at(MIX.origin));
    mean += c / 6;
    assert.ok(c >= lift, `cosmos ${b}: ${c.toFixed(0)} Hz against the transition 2's ${lift.toFixed(0)}`);
  }
  assert.ok(mean >= 0.75 * riso, `the cosmos's mean ${mean.toFixed(0)} Hz against riso 4's ${riso.toFixed(0)}`);
});

test('drop 2 stays the brighter drop: its level above 2 kHz (mean of its bars, the film) ≥ the cosmos\'s + 1 dB; the hats at drop 1\'s (no presence lift: M2)', async () => {
  const film = await filmMix();
  let cosmos = 0;
  for (let b = 1; b <= 6; b++) cosmos += high(MIX.L, MIX.R, at(C.cs(b)) - at(MIX.origin), at(C.cs(b) + 96) - at(MIX.origin)) / 6;
  let drop2 = 0;
  for (let b = 1; b <= 20; b++) drop2 += high(film.L, film.R, at(partFrame('drop2', b)), at(partFrame('drop2', b) + 96)) / 20;
  assert.ok(drop2 >= cosmos + 1, `drop 2 ${drop2.toFixed(2)} dB above 2 kHz against the cosmos's ${cosmos.toFixed(2)}`);
  assert.ok(HAT_AIR === 1 && OPEN_AIR === 1, 'the hats at drop 1\'s');
});

// ——— The harmony: no chord held (2026-10-02: a chord held behind everything is
// noise, and the model is the glass after the shatter — music bible M2). v02's glass pad (5 saws × 4 notes, pumped on every kick) sounded in 100 % of the
// cosmos's 100 ms windows at −7 dB under the mix, the stabs (drop 1's 35-saw chop, six a bar) in 75 %: a chord every moment. ————————

/** Buses `names` against the part mix (lift + cosmos) in 100 ms windows, from 1.2 + the wall's fade to the stutter: each window's level re the mix (dB). */
const windowsOf = (names) => {
  const s = (f) => at(f) - at(MIX.origin);
  const a = s(C.SHELL) + Math.round((BANG_PAD.fadeMs / 1000) * SR) + 1200;
  const b = s(C.STUTTER.from);
  const w = Math.round(0.1 * SR);
  const pw = (L, R, i) => {
    let q = 0;
    for (let j = i; j < i + w; j++) q += 0.5 * (L[j] * L[j] + R[j] * R[j]);
    return q / w;
  };
  const out = [];
  for (let i = a; i + w <= b; i += w) out.push(10 * Math.log10(names.reduce((q, k) => q + pw(MIX.stems[k].L, MIX.stems[k].R, i), 0) + 1e-20) - 10 * Math.log10(pw(MIX.L, MIX.R, i) + 1e-20));
  return out;
};
/** The share of windows within `db` of the mix, and the longest run of them (beats). */
const sounding = (rel, db) => {
  let on = 0;
  let run = 0;
  let best = 0;
  for (const d of rel) {
    if (d > -db) {
      on++;
      best = Math.max(best, ++run);
    } else run = 0;
  }
  return { share: on / rel.length, beats: (best * 0.1) / (24 / 60) };
};

test('no continuous harmonic bed (M2): from 1.2 the chord buses (pad + stabs) sound — within 15 dB of the mix — in ≤ 50 % of 100 ms windows, never 2 beats in a row; any pad ≥ 12 LU under the drums', () => {
  const chords = sounding(windowsOf(['csPad', 'csStab']), 15);
  assert.ok(chords.share <= 0.5, `the pad and the stabs in ${(100 * chords.share).toFixed(0)} % of the windows`);
  assert.ok(chords.beats <= 2, `the pad and the stabs for ${chords.beats.toFixed(2)} beats in a row`);
  const s = (f) => at(f) - at(MIX.origin);
  const a = s(C.SHELL) + Math.round((BANG_PAD.fadeMs / 1000) * SR);
  const b = s(C.STUTTER.from);
  const lu = (k) => integratedLoudness(MIX.stems[k].L.subarray(a, b), MIX.stems[k].R.subarray(a, b), SR);
  assert.ok(lu('csPad') <= lu('csDrums') - 12, `the pad ${lu('csPad').toFixed(1)} LUFS against the drums' ${lu('csDrums').toFixed(1)}`);
});

test('the bang\'s chord is the only held chord: drop 1\'s wall blooms through 1.1 (its kick does not duck it), gone 80 ms after 1.2\'s kick; then only the sunrise\'s breath', () => {
  const pad = mono(FULL.stems, ['csPad']);
  const wall = rms(pad, lo(C.BANG) + 600, lo(C.SHELL) - 600);
  assert.ok(wall > 0.03, `the wall on 1.1: ${dB(wall).toFixed(1)} dB`);
  assert.ok(rms(pad, lo(C.BANG) + 1200, lo(C.BANG) + 4800) > 0.6 * rms(pad, lo(C.BANG) + 4800, lo(C.SHELL) - 600), 'it blooms: no duck on the bang');
  const gone = lo(C.SHELL) + Math.round((BANG_PAD.fadeMs / 1000) * SR);
  assert.equal(rms(pad, gone, lo(C.PREDAWN)), 0, 'nothing held from 1.2 + 80 ms to the breath');
  assert.ok(rms(pad, lo(C.SUNRISE.at), lo(C.SUNRISE.at) + 2400) > 0, 'the breath into the sunrise');
  assert.equal(rms(pad, lo(C.UNWRAP.at) + Math.round(0.045 * SR), N), 0, 'and nothing after it (2.4)');
  const air = (a, z) => rms(band(pad, 4000), a, z) / rms(pad, a, z);
  assert.ok(air(lo(C.BANG) + 600, lo(C.SHELL) - 600) > 0.15, 'the bang\'s chord is the bright wall');
  assert.ok(air(lo(C.PREDAWN) + 2400, lo(C.UNWRAP.at)) < 0.02, 'the breath is dark (LP 1.2 kHz)');
});

test('the glass carries the chords (M2, FALL\'s material): every tink on a picture event of the score, on a tone of the chord there; bar 1 is FALL\'s figure', () => {
  const events = new Set([
    C.SHELL, C.SWEEP, ...C.REAM_PASTES.map((p) => p.at), C.LOCK.from, C.REAM, ...C.FOUNTAIN.map((p) => p.at), ...C.POWERS, ...C.WAVE_RINGS,
    ...C.CURSORS.flatMap((c) => [c.at, c.to]), C.SLINGSHOT, C.REVEAL, ...C.LIGHT_BURSTS, ...C.HOPS, ...C.HATS.filter((f) => f >= C.HORIZON.at),
  ]);
  const pcs = (name) => new Set([...VOICINGS[name], ROOT[name]].map((m) => m % 12));
  for (const t of GLASS) {
    assert.ok(events.has(t.at), `+${t.at - ORIGIN} (${t.why}) is on a picture event`);
    assert.ok(pcs(chordAt(t.at)).has(t.midi % 12), `+${t.at - ORIGIN}: ${t.midi} in ${chordAt(t.at)}`);
    assert.ok(t.at >= C.SHELL && t.at < C.STUTTER.from && Math.abs(t.pan) <= 0.85 && t.decayMs <= 600);
  }
  for (const [name, arp] of Object.entries(ARP)) for (const m of arp) assert.ok(pcs(name).has(m % 12), `${name}: ${m}`);
  assert.deepEqual(ARP.IV, [93, 89, 86, 82, 81, 77, 74], 'IV\'s is FALL\'s B♭maj9 (break.mjs TINKS)');
  // Bar 1: down the arpeggio from A6 in 8ths, then after the slice's shing the cascade rising (a 16th, then 32nds) into Earth.
  const bar1 = GLASS.filter((t) => t.at < C.LEVELS.earth);
  assert.deepEqual(bar1.map((t) => t.midi), [...ARP.IV.slice(0, 4), ...CASCADE]);
  assert.deepEqual(bar1.map((t) => t.at), [C.SHELL, C.SWEEP, C.LOCK.from, C.REAM, C.FOUNTAIN[1].at, ...C.POWERS]);
  for (let k = 1; k < CASCADE.length; k++) assert.ok(CASCADE[k] > CASCADE[k - 1], 'the cascade rises');
  // Every bar after 1 has glass on its own events (the lamp wave, the cursors, the ignition, the hops, the band blinks).
  for (let b = 2; b <= 6; b++) assert.ok(GLASS.some((t) => t.at >= C.cs(b) && t.at < C.cs(b) + 96), `bar ${b}`);
});

test('the glass is struck, not held: a tink is ≥ 20 dB down 0.5 s after its strike; the bells ring a beat or two (BELL_RING); the sends dry', () => {
  const x = new Float32Array(SR);
  tink(x, 0, SR, { freq: midiHz(89), gain: TINK.gain, decayMs: TINK.decayMs, seed: 1 });
  assert.ok(dB(rms(x, 0.5 * SR, 0.55 * SR)) <= dB(rms(x, 0, 0.05 * SR)) - 20, 'a tink');
  for (const [name, tau] of Object.entries(BELL_RING)) {
    const y = new Float32Array(4 * SR);
    fmBell(y, 0, SR, { freq: midiHz(86), gain: 0.07, decay: tau, index: 2 });
    const t20 = Math.log(10) * tau;
    assert.ok(t20 <= 2, `${name}: −20 dB after ${t20.toFixed(2)} s`);
    const k = Math.round(t20 * SR);
    assert.ok(dB(rms(y, k, k + 2400)) <= dB(rms(y, 0, 2400)) - 18, `${name}: measured`);
  }
  assert.ok(BELL_RING.level <= 0.5 && BELL_RING.chord <= 0.5 && BELL_RING.chime <= 0.25, 'the levels\' runs and the chords: −20 dB within 1.2 s');
  assert.ok(SENDS.csGlass <= 0.32 && SENDS.csBell <= 0.35 && SENDS.csStab <= 0.12, 'no plate tail held as a chord');
});

test('the glass is heard: every full tink within 13 dB of the mix over its first 80 ms (median within 11); the soft ones (hops, blinks) under them', () => {
  const s = (f) => at(f) - at(MIX.origin);
  const g = MIX.stems.csGlass;
  const w = Math.round(0.08 * SR);
  const level = (t) => {
    let a = 0;
    let m = 0;
    for (let i = s(t.at); i < s(t.at) + w; i++) {
      a += g.L[i] * g.L[i] + g.R[i] * g.R[i];
      m += MIX.L[i] * MIX.L[i] + MIX.R[i] * MIX.R[i];
    }
    return 10 * Math.log10(a / m);
  };
  const full = GLASS.filter((t) => t.gain >= 0.8 * TINK.gain).map(level);
  const soft = GLASS.filter((t) => t.gain < 0.8 * TINK.gain).map(level);
  for (const d of full) assert.ok(d >= -13, `a tink ${d.toFixed(1)} dB under the mix`);
  const med = (v) => [...v].sort((p, q) => p - q)[v.length >> 1];
  assert.ok(med(full) >= -11, `the tinks' median ${med(full).toFixed(1)}`);
  assert.ok(med(soft) < med(full), 'the hops and the blinks are the soft ones');
});

test('the hook leads: each note sung at one level (HOOK_NOTE_DB), lifted HOOK_LIFT_DB; cosmos 2 → the stutter: the vox the loudest pitched bus but the sub, then the glass, stabs and bells', () => {
  assert.ok(HOOK_NOTE_DB <= -20 && HOOK_LIFT_DB >= 6 && HOOK_MAX_BOOST_DB <= 18);
  const s = (f) => at(f) - at(MIX.origin);
  const a = s(C.cs(2));
  const b = s(C.STUTTER.from);
  const lu = (k) => integratedLoudness(MIX.stems[k].L.subarray(a, b), MIX.stems[k].R.subarray(a, b), SR);
  const L = Object.fromEntries(['csVox', 'csGlass', 'csStab', 'csBell', 'csBass', 'csPad'].map((k) => [k, lu(k)]));
  for (const k of ['csGlass', 'csStab', 'csBell', 'csBass', 'csPad']) assert.ok(L.csVox >= L[k], `the hook ${L.csVox.toFixed(1)} against ${k} ${L[k].toFixed(1)}`);
  for (const k of ['csGlass', 'csStab', 'csBell']) assert.ok(L[k] >= L.csBass && L[k] >= L.csPad, `${k} ${L[k].toFixed(1)} over the pluck and the breath`);
  // Note by note (the vox against the mix over each sung note, outside the scan): v02's spanned −6.6 … −32.6 dB (its vowels and pitches).
  const notes = C.HOOK.filter((n) => !n.whisper && !(n.at >= C.SCAN.from && n.at < C.WINK)).map((n) => {
    const p = s(n.at);
    const q = s(n.at + Math.max(3, n.len * 6 * 0.95));
    let v = 0;
    let m = 0;
    for (let i = p; i < q; i++) {
      v += MIX.stems.csVox.L[i] ** 2 + MIX.stems.csVox.R[i] ** 2;
      m += MIX.L[i] ** 2 + MIX.R[i] ** 2;
    }
    return 10 * Math.log10(v / m);
  });
  const sorted = [...notes].sort((p, q) => p - q);
  assert.ok(sorted[sorted.length >> 1] >= -10, `the notes' median ${sorted[sorted.length >> 1].toFixed(1)} dB under the mix`);
  assert.ok(sorted[1] >= -16, `the quietest but one ${sorted[1].toFixed(1)}`);
});


/** A kind (or kinds) of the cosmos alone through the whole chain, the stutter included: what of it is heard at output time (mid, from the transition's start). */
const outputOf = (...kinds) => {
  const m = partsAlone(['transition', 'cosmos'], SR, { solo: (k) => kinds.includes(k) });
  return { x: Float32Array.from(m.L, (v, i) => 0.5 * (v + m.R[i])), s: (f) => at(f) - at(m.origin) };
};

test('the neon crackles on every slice at output time: a spark above 3 kHz starts on each slice after the first (STUTTER.from + 6, 12, 15, 18, 21)', () => {
  const ms3 = Math.round(0.003 * SR);
  const { x, s } = outputOf('csspark');
  const fx = band(x, 3000);
  const mix = band(Float32Array.from(MIX.L, (v, i) => 0.5 * (v + MIX.R[i])), 3000);
  for (const { at: f } of C.STUTTER_SLICES.slice(1)) {
    const after = rms(fx, s(f), s(f) + ms3);
    const before = rms(fx, s(f) - ms3, s(f));
    assert.ok(after > 0.01 && after > 4 * before, `+${f - C.STUTTER.from}: the spark ${dB(before).toFixed(1)} → ${dB(after).toFixed(1)} dB`);
    const a = rms(mix, s(f), s(f) + ms3);
    const b = rms(mix, s(f) - ms3, s(f));
    assert.ok(a > 2 * b, `+${f - C.STUTTER.from}: the mix above 3 kHz ${dB(b).toFixed(1)} → ${dB(a).toFixed(1)} dB`);
  }
});

test('a transformer\'s hum runs under the stutter\'s last slices at output time (from +12, content +6), to the cosmos\'s last frame', () => {
  const { x, s } = outputOf('cshum');
  const hum = band(x, 90, 300);
  for (let f = C.STUTTER.from + 12; f < C.COSMOS.to; f++) assert.ok(rms(hum, s(f), s(f + 1)) > 0.003, `+${f - C.STUTTER.from}: the hum at ${dB(rms(hum, s(f), s(f + 1))).toFixed(1)} dB`);
  assert.equal(rms(hum, s(C.COSMOS.to) + 80, s(C.COSMOS.to) + 2400), 0, 'gone on club 1.1');
});

/**
 * The transition, the cosmos and the club on one stage, mixed as bgm.mjs will mix the film once film.ts builds the cosmos through (its
 * held bars 5–6 are silent in the film today, the stutter with them): the finished mix and the same without the edits (`plain`).
 */
const throughClub = (() => {
  let memo = null;
  return () => {
    if (memo) return memo;
    const origin = partStart('transition');
    const n = at(partFrame('club', 2)) - at(origin);
    // The cosmos finished by its edit alone: the splices are the stutter's (the club's pickups over its last two cells are tested above).
    const mods = [TRANSITION, { SENDS, CUTS, SILENCES, finish: editOnly }, CLUB];
    const sends = Object.assign({}, ...mods.map((m) => m.SENDS));
    const stems = { post: stereo(n), sub: new Float32Array(n) };
    for (const k of Object.keys(sends)) stems[k] = stereo(n);
    renderTransition(stems, SR, { origin });
    renderCosmos(stems, SR, { origin });
    CLUB.renderClub(stems, SR, { origin });
    const opts = { origin, sends, cuts: mods.flatMap((m) => m.CUTS), silences: mods.flatMap((m) => m.SILENCES) };
    const done = mixAlone(stems, SR, { ...opts, finish: (l, r, sr, o) => mods.forEach((m) => m.finish(l, r, sr, o)) });
    const plain = mixAlone(stems, SR, opts);
    memo = { ...done, plain, s: (f) => at(f) - at(origin) };
    return memo;
  };
})();

test('no splice of the stutter clicks, the one back onto club 1.1 included: across each the mix steps no further than the two passages it joins', () => {
  const { L, R, plain, s } = throughClub();
  const t = C.STUTTER.from;
  // [the splice, the content it jumps to, the content it leaves] (output frames +6, +15, +21 and club 1.1).
  const splices = [[t + 6, t, t + 6], [t + 15, t + 6, t + 9], [t + 21, t + 9, t + 12], [C.COSMOS.to, C.COSMOS.to, t + 12]];
  for (const [f, to, from] of splices) {
    for (const [X, P] of [[L, plain.L], [R, plain.R]]) {
      for (let k = 0; k < 120; k++) {
        const step = Math.abs(X[s(f) + k] - X[s(f) + k - 1]);
        const own = (g) => Math.abs(P[s(g) + k] - P[s(g) + k - 1]);
        // An equal-power cross-fade of two passages steps at most √2 × the larger of their own steps (plus the trim's gain on their level).
        assert.ok(step <= Math.SQRT2 * Math.max(own(to), own(from)) + 0.02, `+${f - t} sample ${k}: ${step.toFixed(4)} against ${own(to).toFixed(4)} / ${own(from).toFixed(4)}`);
      }
    }
  }
  // The club's own first frame is untouched by the cosmos (past the splice): its dot inks on the music the club wrote.
  const x = Math.round(0.0015 * SR) + 1;
  let worst = 0;
  for (let i = s(C.COSMOS.to) + x; i < s(C.COSMOS.to) + 800; i++) worst = Math.max(worst, Math.abs(L[i] - plain.L[i]));
  assert.ok(worst < 0.02, `club 1.1 past the splice: ${worst.toFixed(4)} from the unedited mix`);
});

// v08 (integrator ruling): the v07 review found the volume and the white noise spiking after the slingshot, so drop 2's landing lost its slam and its noise (sections/drop2.mjs
// LANDING, BLOOM) and now lands by weight at ≈ cosmos 1.1 + 0.9 LU. The bible's old 1.8 LU margin gives way to the same floor as
// tests/drop2Audio.test.mjs ('drop2 1.1 comes out of the fake drop's dead air'): drop 2 1.1 still over cosmos 1.1, by ≥ 0.5 LU.
test('cosmos 1.1 stays under drop 2 1.1 (bible §4.3; v08: ≥ 0.5 LU, the landing no longer blasts)', async () => {
  const film = await filmMix();
  const { DROP2_START } = await import('../src/score/drop2.ts');
  const drop2 = integratedLoudness(film.L.subarray(at(DROP2_START), at(DROP2_START + 24)), film.R.subarray(at(DROP2_START), at(DROP2_START + 24)), SR);
  const bang = beatLufs(C.BANG);
  assert.ok(drop2 - bang >= 0.5, `drop 2 1.1 ${drop2.toFixed(2)} against cosmos 1.1's ${bang.toFixed(2)}`);
});
