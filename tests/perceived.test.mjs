// The perceived-loudness meter (scripts/audio/perceived.mjs; the continuity plan's FW7): a Zwicker-type loudness in sones and DIN 45692
// sharpness in acum, calibrated on their own definitions, behaving as the ear does where LUFS does not — synthetic signals only, no renders.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAL_DB, bark, calibrate, earDb, group, loudnessOf, quantile, sixteenths, smallSpeaker, testSignal } from '../scripts/audio/perceived.mjs';

const SR = 48000;
const of = (x, o) => loudnessOf([x], 0, x.length, SR, o);

test('the scales: Bark (Zwicker & Terhardt), the ear (BS.1387: +6.5 dB near 3.3 kHz, falling below 100 Hz and over 10 kHz), the small speaker', () => {
  assert.ok(Math.abs(bark(1000) - 8.51) < 0.05, `1 kHz is ${bark(1000).toFixed(2)} Bark`);
  assert.ok(bark(15500) > 23.5 && bark(15500) < 24.5);
  const peak = [2000, 3000, 3300, 4000, 5000].map(earDb);
  assert.ok(Math.max(...peak) > 2 && earDb(3300) > earDb(1000) + 3, 'the ear canal lifts 2–5 kHz');
  assert.ok(earDb(50) < earDb(1000) - 15 && earDb(14000) < earDb(1000) - 10, 'and falls at both ends');
  assert.ok(smallSpeaker(60) < 0.01 && smallSpeaker(3000) > 3 && Math.abs(smallSpeaker(1000) - 1) < 0.3, 'the phone: no bass, a presence peak');
  assert.equal(CAL_DB, 90, 'a full-scale RMS signal plays at 90 dB SPL');
});

test('sones: a 1 kHz tone at 40 dB SPL is 1 sone; every 10 dB doubles it (60 dB ≈ 4, 80 dB ≈ 16)', () => {
  const { c } = calibrate();
  assert.ok(c > 0.06 && c < 0.11, `the constant (${c.toFixed(4)}) is near Zwicker's 0.08`);
  const at = (spl) => of(testSignal(SR, { hz: 1000, spl })).sones;
  assert.ok(Math.abs(at(40) - 1) < 0.01, `40 dB: ${at(40).toFixed(3)} sone`);
  assert.ok(Math.abs(at(60) / 4 - 1) < 0.2, `60 dB: ${at(60).toFixed(2)} sones`);
  assert.ok(Math.abs(at(80) / 16 - 1) < 0.25, `80 dB: ${at(80).toFixed(2)} sones`);
});

test('the ear, not the meter: at the same SPL a 3 kHz tone is louder than 1 kHz, 63 Hz quieter; broadband noise is far louder than a tone', () => {
  const tone = (hz) => of(testSignal(SR, { hz, spl: 60 })).sones;
  assert.ok(tone(3150) > 1.3 * tone(1000), `3.15 kHz ${tone(3150).toFixed(1)} against 1 kHz ${tone(1000).toFixed(1)}`);
  assert.ok(tone(63) < 0.5 * tone(1000), `63 Hz ${tone(63).toFixed(1)}`);
  const white = of(testSignal(SR, { band: [20, 16000], spl: 60 })).sones;
  assert.ok(white > 2.5 * tone(1000), `white noise ${white.toFixed(1)} sones against the tone's ${tone(1000).toFixed(1)}`);
});

test('acum: noise one critical band wide at 1 kHz, 60 dB, is 1 acum; high noise is sharp, low noise dull; the phone curve lifts a 4 kHz band', () => {
  const { k } = calibrate();
  assert.ok(k > 0.09 && k < 0.13, `the constant (${k.toFixed(4)}) is near DIN 45692's 0.11`);
  const nb = (lo, hi) => of(testSignal(SR, { band: [lo, hi], spl: 60 }));
  assert.ok(Math.abs(nb(920, 1080).acum - 1) < 0.01);
  assert.ok(nb(7500, 8500).acum > 5 && nb(20, 2000).acum < 1.2, `8 kHz ${nb(7500, 8500).acum.toFixed(2)}, low ${nb(20, 2000).acum.toFixed(2)} acum`);
  const white = nb(20, 16000).acum;
  assert.ok(white > 2.3 && white < 3.3, `white noise ${white.toFixed(2)} acum`);
  const x = testSignal(SR, { band: [3700, 4300], spl: 60 });
  assert.ok(of(x, { speaker: true }).sones > 1.15 * of(x).sones, 'the small speaker\'s presence peak');
});

test('a mix per 16th and grouped: silence is 0, a loud passage louder, a beat its four 16ths, quantiles as sorted', () => {
  const n = Math.round((48 / 60) * SR);
  const L = new Float32Array(n);
  const tone = testSignal(SR, { hz: 1000, spl: 70 });
  for (let i = 0; i < 2 * tone.length; i++) L[Math.round((24 / 60) * SR) + i] = tone[i % tone.length] * 0.5 * (1 + Math.min(1, i / tone.length));
  const rows = sixteenths(L, L, SR, 0, 48);
  assert.equal(rows.length, 8);
  assert.equal(rows[0].sones, 0);
  assert.ok(rows[5].sones > rows[4].sones && rows[4].sones > 1);
  const [quiet, loud] = group(rows, 4);
  assert.ok(Math.abs(loud.sones - rows.slice(4).reduce((s, r) => s + r.sones, 0) / 4) < 1e-9 && quiet.sones < loud.sones);
  assert.equal(quantile([3, 1, 2], 0.5), 2);
});
