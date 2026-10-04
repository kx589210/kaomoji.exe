// E8: the song's own spectrogram, one row per film frame, that S30's highway is drawn from (scripts/audio/spectrumDrop2.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TOTAL_FRAMES } from '../src/score/tempo.ts';

type SpectrumModule = {
  SPECTRUM: { rows: number; bins: number; hop: number; window: number; fmin: number; fmax: number; dbMin: number };
  binOfHz: (hz: number) => number;
  spectrumRows: (L: Float32Array, R: Float32Array, sr: number, o?: { rows?: number }) => Uint8Array;
};
const S = (await import('../scripts/audio/spectrumDrop2.mjs' as string)) as SpectrumModule;

const SR = 48000;
/** `frames` film frames of a sine at `hz` and amplitude `amp` (both channels), then `silent` frames of silence. */
const tone = (hz: number, amp: number, frames: number, silent: number): Float32Array => {
  const n = ((frames + silent) * SR) / 60;
  const out = new Float32Array(n);
  for (let i = 0; i < (frames * SR) / 60; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / SR);
  return out;
};

test('the spectrum is one row per film frame (TOTAL_FRAMES) of 96 log-frequency bins from 30 Hz to 16 kHz, hopping one frame (800 samples at 48 kHz)', () => {
  assert.deepEqual([S.SPECTRUM.rows, S.SPECTRUM.bins, S.SPECTRUM.hop, S.SPECTRUM.window, S.SPECTRUM.fmin, S.SPECTRUM.fmax, S.SPECTRUM.dbMin], [TOTAL_FRAMES, 96, 800, 4096, 30, 16000, -72]);
  assert.equal(S.binOfHz(30), 0);
  assert.equal(S.binOfHz(15999), 95);
  assert.ok(S.binOfHz(60) < S.binOfHz(120) && S.binOfHz(120) < S.binOfHz(4000), 'the bins climb with the pitch');
});

test('a tone lights its own bin at its level (dB −72…0 → 0…255), and silence reads 0', () => {
  const x = tone(440, 0.5, 30, 30);
  const rows = S.spectrumRows(x, x, SR, { rows: 60 });
  assert.equal(rows.length, 60 * 96);
  const row = (k: number) => Array.from(rows.subarray(k * 96, (k + 1) * 96));
  const r = row(15);
  const peak = r.indexOf(Math.max(...r));
  assert.equal(peak, S.binOfHz(440), `440 Hz peaks in bin ${S.binOfHz(440)}, not ${peak}`);
  const want = ((20 * Math.log10(0.5) + 72) / 72) * 255;
  assert.ok(Math.abs(r[peak] - want) <= 6, `−6 dB reads ≈ ${want.toFixed(0)}, got ${r[peak]}`);
  assert.ok(r[S.binOfHz(60)] < 40 && r[S.binOfHz(8000)] < 40, 'far from the tone the bins stay low');
  assert.ok(row(58).every((v) => v === 0), 'two frames into the silence (past the window) every bin is 0');
});

test('the window is centred on each frame’s first sample: a click on frame 20 shows on rows 19–21 (±½ window) and not on row 10 or 30', () => {
  const x = new Float32Array((40 * SR) / 60);
  x[(20 * SR) / 60] = 1;
  const rows = S.spectrumRows(x, x, SR, { rows: 40 });
  const loud = (k: number) => Math.max(...rows.subarray(k * 96, (k + 1) * 96));
  assert.ok(loud(20) > 0 && loud(19) > 0 && loud(21) > 0);
  assert.equal(loud(10), 0);
  assert.equal(loud(30), 0);
});
