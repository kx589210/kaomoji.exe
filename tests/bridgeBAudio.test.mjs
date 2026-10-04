// Bridge B's sound (scripts/audio/sections/bridgeB.mjs, its voices scripts/audio/bridgeBVoices.mjs; score src/score/bridgeB.ts): the
// crash taking time — the music box running down, his heart slower, the glitches small and dry, no chord bed, then drop 2's zero. Rendered
// alone (a three-bar slice round the bridge, the stage's own buses), and its finish() on a synthetic mix: the events on the score's frames,
// nothing outside the bar, the notes on pitch and dying away, the heart low and mono, the skip and the stuck buffer doing what they say.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skip, stuck, tapeStopRate, varispeed, windingBox } from '../scripts/audio/bridgeBVoices.mjs';
import { stereo } from '../scripts/audio/mix.mjs';
import * as BB from '../scripts/audio/sections/bridgeB.mjs';
import * as D2S from '../scripts/audio/sections/drop2.mjs';
import * as B from '../src/score/bridgeB.ts';
import { ZERO } from '../src/score/drop2.ts';
import { partFrame } from '../src/score/film.ts';
import { FPS } from '../src/score/tempo.ts';

const SR = 48000;
const ORIGIN = partFrame('drop2', 20);
const TO = partFrame('outro', 2);
const n = Math.round(((TO - ORIGIN) / FPS) * SR);
const at = (f) => Math.round(((f - ORIGIN) / FPS) * SR);
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);
const rms = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const dB = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '−∞');

function render(solo = () => true) {
  const stems = { post: stereo(n), sub: new Float32Array(n) };
  for (const k of Object.keys(BB.SENDS)) stems[k] = stereo(n);
  const events = BB.renderBridgeB(stems, SR, { origin: ORIGIN, solo }).map((e) => ({ kind: e.kind, frame: (e.at / SR) * FPS }));
  return { stems, events };
}
const full = render();
const mono = (bus) => Float32Array.from(bus.L, (v, i) => 0.5 * (v + bus.R[i]));

test('its hooks: its own buses (bb…; the music box in the chime’s room, the heart and the glitches dry), no cut or silence of its own (drop 2’s ZERO is the bar’s last 16th), the seam’s preview', () => {
  assert.deepEqual(BB.CUTS, []);
  assert.deepEqual(BB.SILENCES, []);
  assert.deepEqual(Object.keys(BB.SENDS), ['bbbox', 'bbheart', 'bbglitch']);
  assert.equal(BB.SENDS.bbbox, 0.55, 'the chime’s send: the bullet time’s room');
  assert.ok(BB.SENDS.bbheart === 0 && BB.SENDS.bbglitch <= 0.05);
  assert.deepEqual([ZERO.from, ZERO.to], [B.HAND_OFF_ZERO.from, B.HAND_OFF_ZERO.to]);
  assert.ok(D2S.CUTS.includes(ZERO.from) && D2S.SILENCES.some((w) => w.from === ZERO.from && w.to === ZERO.to), 'drop 2 declares the zero (and restarts the plate on it)');
  assert.deepEqual(BB.PREVIEWS.map((p) => p.id), ['bridgeB-seam']);
});

test('every event on its frame of the score: the music box running down, the heart, the slip, the tear, the skip, the stuck buffer — kinds bb…, the heartbeat’s ending in “heart”', () => {
  const of = (kind) => full.events.filter((e) => e.kind === kind).map((e) => +e.frame.toFixed(6));
  assert.deepEqual(of('bbmusicbox'), B.MUSIC_BOX_B.map((x) => x.at));
  assert.deepEqual(of('bbheart'), [B.HEART_B.lub]);
  assert.deepEqual(of('bbslip'), [B.SLIP_CLICK]);
  assert.deepEqual(of('bbtear'), [B.TEAR_CHIRPS[0]]);
  assert.deepEqual(of('bbskip'), [B.SKIP.from]);
  assert.deepEqual(of('bbstuck'), [B.STUCK.from]);
  assert.deepEqual(of('bbcrown'), [B.FREEZE_GLASS.at]);
  // T7's drain sounds, moved here with the drain: the whoosh on the landing, a falling blip on the landing and on the tear.
  assert.deepEqual(of('bbdrain'), [B.STAGES.colour]);
  assert.deepEqual(of('bbfall'), [B.STAGES.colour, B.STAGES.tear]);
  for (const e of full.events) assert.ok(e.kind.startsWith('bb'), e.kind);
});

test('nothing of it before the bridge or from the zero on; each voice starts on its frame (its sound alone, silent before it)', () => {
  for (const [name, bus] of Object.entries(full.stems)) {
    if (name === 'sub') continue;
    for (const x of [bus.L, bus.R]) {
      assert.equal(rms(x, 0, at(B.BRIDGE_B_START)), 0, `${name}: nothing before the bridge`);
      assert.ok(rms(x, at(B.HAND_OFF_ZERO.from), n) < 1e-9, `${name}: nothing from the zero on`);
    }
  }
  for (const kind of ['bbmusicbox', 'bbheart', 'bbslip', 'bbtear', 'bbdrain', 'bbfall']) {
    const first = full.events.find((e) => e.kind === kind).frame;
    const one = render((k, f) => k === kind && f === first);
    const sum = new Float32Array(n);
    for (const [name, bus] of Object.entries(one.stems)) if (name !== 'sub') for (let i = 0; i < n; i++) sum[i] += bus.L[i] + bus.R[i];
    assert.equal(rms(sum, 0, at(first)), 0, `${kind}: silent before ${first}`);
    assert.ok(rms(sum, at(first), at(first) + 0.03 * SR) > 1e-4, `${kind}: sounding on its frame`);
  }
});

test('the music box runs down: each note on its pitch, flatter each time (the last sagging further as it rings), quieter each time, and dying away — no chord bed', () => {
  const box = mono(full.stems.bbbox);
  /** The spectrum's peak (cents from `m`) over samples [a, b). */
  const peak = (a, b, m) => {
    let best = 0;
    let where = 0;
    for (let c = -150; c <= 50; c += 1) {
      const hz = midiHz(m + c / 100);
      let re = 0;
      let im = 0;
      for (let i = a; i < b; i++) {
        const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * (i - a)) / (b - a));
        re += w * box[i] * Math.cos((2 * Math.PI * hz * i) / SR);
        im += w * box[i] * Math.sin((2 * Math.PI * hz * i) / SR);
      }
      if (Math.hypot(re, im) > best) {
        best = Math.hypot(re, im);
        where = c;
      }
    }
    return where;
  };
  const levels = [];
  B.MUSIC_BOX_B.forEach((x, k) => {
    const a = at(x.at);
    const last = k === B.MUSIC_BOX_B.length - 1;
    // The next note starts 30–36 frames later: judge each in its own time (the first 60–300 ms), the last one's start before its sag.
    const c = peak(a + Math.round(0.06 * SR), a + Math.round((last ? 0.12 : 0.3) * SR), x.midi);
    const want = x.cents + (last ? BB.BOX.sag.cents * (0.09 / BB.BOX.sag.seconds) : 0);
    assert.ok(Math.abs(c - want) <= 12, `${x.at}: ${c} cents off ${x.midi}, want ${want.toFixed(0)}`);
    // Each note's own level (rendered alone: the one before still rings under it).
    const one = mono(render((kind, f) => kind === 'bbmusicbox' && f === x.at).stems.bbbox);
    levels.push(rms(one, a, a + Math.round(0.1 * SR)));
  });
  for (let k = 1; k < levels.length; k++) assert.ok(levels[k] < levels[k - 1], `quieter each time: ${levels.map(dB)}`);
  // The last tine sags as it rings: later in its ring it reads lower than at its start.
  const lastNote = B.MUSIC_BOX_B[B.MUSIC_BOX_B.length - 1];
  const a = at(lastNote.at);
  assert.ok(peak(a + Math.round(0.25 * SR), a + Math.round(0.37 * SR), lastNote.midi) < peak(a + Math.round(0.02 * SR), a + Math.round(0.14 * SR), lastNote.midi) - 30, 'the last sags');
  // Dying away (the spring running down: shorter rings than the bullet time's 0.8 s): each note ≥ 6 dB under its first 100 ms by 0.6 s and
  // ≥ 12 dB by 1.2 s (no held bed under the crash).
  B.MUSIC_BOX_B.slice(0, 2).forEach((x) => {
    const a0 = at(x.at);
    const one = mono(render((kind, f) => kind === 'bbmusicbox' && f === x.at).stems.bbbox);
    const first = rms(one, a0, a0 + Math.round(0.1 * SR));
    const later = rms(one, a0 + Math.round(0.6 * SR), a0 + Math.round(0.7 * SR));
    const last = rms(one, a0 + Math.round(1.2 * SR), a0 + Math.round(1.3 * SR));
    assert.ok(later < first * 10 ** (-6 / 20) && last < first * 10 ** (-12 / 20), `${x.at}: rings away (${dB(first)} → ${dB(later)} → ${dB(last)} dB)`);
  });
});

test('his heart: low (≥ 80 % of its energy under a one-pole 150 Hz) and in the middle, one lub-dub, the dub 9 frames after the lub and quieter', () => {
  const { L, R } = full.stems.bbheart;
  let diff = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    diff += (L[i] - R[i]) ** 2;
    sum += (L[i] + R[i]) ** 2;
  }
  assert.ok(diff < 1e-9 * sum, 'mono');
  const x = mono(full.stems.bbheart);
  let lp = 0;
  let lo = 0;
  let all = 0;
  const k = 1 - Math.exp((-2 * Math.PI * 150) / SR);
  for (let i = 0; i < n; i++) {
    lp += k * (x[i] - lp);
    lo += lp * lp;
    all += x[i] * x[i];
  }
  assert.ok(lo > 0.8 * all, `low: ${(lo / all).toFixed(2)}`);
  const lub = rms(x, at(B.HEART_B.lub), at(B.HEART_B.lub) + Math.round(0.05 * SR));
  const dub = rms(x, at(B.HEART_B.dub) + Math.round(0.005 * SR), at(B.HEART_B.dub) + Math.round(0.05 * SR));
  assert.ok(dub < lub && dub > 0.2 * lub, `the dub after the lub, quieter: ${dB(lub)} / ${dB(dub)} dB`);
});

test('the skip and the stuck buffer (finish()): on the corruption a 32nd of the mix repeated four times, each quieter; on the freeze the 32nd before it looping to the zero, quieter and darker each time; nothing else touched', () => {
  const N = Math.round((B.BRIDGE_B_END / FPS) * SR) + 4800;
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    L[i] = 0.3 * Math.sin((2 * Math.PI * 523 * i) / SR) * (1 + 0.5 * Math.sin(i / 2000));
    R[i] = 0.25 * Math.sin((2 * Math.PI * 659 * i) / SR + 1);
  }
  const L0 = L.slice();
  const R0 = R.slice();
  BB.finish(L, R, SR);
  const s = (f) => Math.round((f / FPS) * SR);
  const slice = s(B.SKIP.from + 3) - s(B.SKIP.from);
  for (let i = 0; i < s(B.SKIP.from) - 48; i += 97) assert.equal(L[i], L0[i], 'before the skip, untouched');
  // The skip: repeat k replays the slice before the corruption at −1.5 dB × k (between its splices).
  for (let k = 1; k < 4; k++) {
    for (const j of [100, 400, slice - 100]) {
      const want = 10 ** ((k * BB.SKIP_EDIT.stepDb) / 20) * L0[s(B.SKIP.from) - slice + j];
      assert.ok(Math.abs(L[s(B.SKIP.from) + k * slice + j] - want) < 1e-6, `repeat ${k}, sample ${j}`);
    }
  }
  // Between the skip and the freeze the mix is itself again.
  for (let i = s(B.SKIP.to) + 48; i < s(B.STUCK.from) - 48; i += 97) assert.equal(R[i], R0[i], 'the mix back between them');
  // The stuck buffer: each loop quieter than the one before; nothing written from the zero on.
  const loops = Math.ceil((s(B.STUCK.to) - s(B.STUCK.from)) / slice);
  const lv = Array.from({ length: loops - 1 }, (_, k) => rms(L, s(B.STUCK.from) + k * slice + 48, s(B.STUCK.from) + (k + 1) * slice - 48));
  for (let k = 1; k < lv.length; k++) assert.ok(lv[k] < lv[k - 1], `loop ${k} quieter: ${lv.map(dB)}`);
  for (let i = s(B.STUCK.to); i < N; i += 97) assert.equal(L[i], L0[i], 'nothing from the zero on');
  // The freeze's glass over the stuck buffer: the blue screen's C♯6, a beat early, closed before the zero.
  const g = Float32Array.from(L, (v, i) => v - L0[i]);
  assert.ok(rms(g, s(B.FREEZE_GLASS.at), s(B.FREEZE_GLASS.at) + 2400) > 0.01, 'the glass is heard on the freeze');
});

test('the voices: varispeed reads slower for a rate under 1 (lower and longer), the tape stop’s rate falls from 1 to its floor, a winding tine sags', () => {
  const sr = 48000;
  const sine = Float32Array.from({ length: sr }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / sr));
  const half = varispeed(sine, () => 0.5, sr);
  let zc = 0;
  for (let i = 1; i < sr / 2; i++) if (half[i - 1] < 0 && half[i] >= 0) zc++;
  assert.ok(Math.abs(zc / 0.5 - 500) < 3, `an octave down: ${zc / 0.5} Hz`);
  assert.equal(tapeStopRate(0, { start: 0, span: 100, floor: 0.5 }), 1);
  assert.equal(tapeStopRate(50, { start: 0, span: 100, floor: 0.5 }), 0.75);
  assert.equal(tapeStopRate(500, { start: 0, span: 100, floor: 0.5 }), 0.5);
  const tine = windingBox(sr, { freq: 880, sag: -100, sagSeconds: 0.2, seconds: 1 });
  const flat = windingBox(sr, { freq: 880, seconds: 1 });
  assert.ok(Math.abs(tine[10] - flat[10]) < 1e-4, 'the same strike');
  assert.notEqual(tine[sr / 2], flat[sr / 2], 'sagged later');
  void skip;
  void stuck;
});
