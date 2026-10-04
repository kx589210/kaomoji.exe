// Tonal voices: an 8-bit pulse arpeggio, a soft sub-bass pulse, a plucked
// bass and supersaw chords.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { panGains } from './mix.mjs';
import { Osc } from './osc.mjs';

/**
 * 8-bit pulse arpeggio. `notes` are { at, len, freq, duty } (samples, Hz).
 * Each note is zero-mean (a ±1 pulse of duty d averages 2d − 1), so gating
 * the notes leaves no DC offset or infrasound. The sum goes through a resonant
 * low-pass whose cutoff is `cutoff(i)` Hz at sample i, then a sample-and-hold
 * at `crushHz` and a `bits`-bit quantiser.
 */
export function pulseArp(out, notes, sr, { gain = 0.15, cutoff = () => 8000, q = 1.1, crushHz = 16000, bits = 7 } = {}) {
  const raw = new Float32Array(out.length);
  const rel = Math.round(0.004 * sr);
  for (const note of notes) {
    const o = new Osc(sr);
    for (let i = 0; i < note.len + rel; i++) {
      const j = note.at + i;
      if (j < 0 || j >= raw.length) continue;
      const env = Math.min(1, i / (0.002 * sr)) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      raw[j] += env * (o.pulse(note.freq, note.duty) - (2 * note.duty - 1));
    }
  }
  const f = new SVF(sr);
  const hold = Math.max(1, Math.round(sr / crushHz));
  const levels = 2 ** (bits - 1);
  let held = 0;
  for (let i = 0; i < raw.length; i++) {
    f.process(raw[i], cutoff(i), q);
    if (i % hold === 0) held = Math.round(f.lp * levels) / levels;
    out[i] += gain * held;
  }
}

/** A soft sub-bass thump: a sine gliding from 2 × `freq` down to `freq`, 3 ms attack, exponential decay. */
export function subPulse(out, at, sr, { freq = 55, gain = 0.5, decayMs = 380 } = {}) {
  const n = Math.round((sr * decayMs * 5) / 1000);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const t = i / sr;
    ph += (freq * (1 + Math.exp(-t / 0.03))) / sr;
    const env = Math.min(1, t / 0.003) * Math.exp(-t / (decayMs / 1000));
    if (j >= 0) out[j] += gain * env * Math.sin(2 * Math.PI * ph);
  }
}

/** Plucked bass: a saw through a low-pass whose cutoff snaps shut, over a sine at the fundamental. Notes are { at, len, freq } (samples, Hz). */
export function pluckBass(out, notes, sr, { gain = 0.4, bright = 2600 } = {}) {
  const buf = new Float32Array(out.length);
  const rel = Math.round(0.012 * sr);
  for (const note of notes) {
    const saw = new Osc(sr);
    const sub = new Osc(sr);
    const f = new SVF(sr);
    for (let i = 0; i < note.len + rel; i++) {
      const j = note.at + i;
      if (j < 0 || j >= buf.length) continue;
      const t = i / sr;
      const env = Math.min(1, t / 0.002) * Math.exp(-t / 0.2) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      f.process(saw.saw(note.freq), 110 + bright * Math.exp(-t / 0.055), 1.3);
      // A rising saw's fundamental is −sin, so the sub sine goes in with the same sign (added, they would cancel).
      buf[j] += gain * env * (0.7 * f.lp - 0.5 * sub.sine(note.freq));
    }
  }
  // A DC blocker (one-pole high-pass at 10 Hz): a pluck's decaying first cycles are not symmetric.
  const k = Math.exp((-2 * Math.PI * 10) / sr);
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < buf.length; i++) {
    y1 = buf[i] - x1 + k * y1;
    x1 = buf[i];
    out[i] += y1;
  }
}

/**
 * Supersaw chords (spec §8): every chord tone is `voices` saws detuned across
 * ±`detune` semitones and spread across the stereo field (neighbouring
 * detunes on opposite sides), through a resonant low-pass per side whose
 * cutoff is `cutoff(i)` Hz at sample i. Chords are { at, len, freqs }.
 */
export function supersaw(outL, outR, chords, sr, { gain = 0.1, voices = 7, detune = 0.2, spread = 0.9, cutoff = () => 3000, q = 0.8, seed = 1 } = {}) {
  const r = rng(seed);
  const L = new Float32Array(outL.length);
  const R = new Float32Array(outR.length);
  const att = Math.round(0.006 * sr);
  const rel = Math.round(0.08 * sr);
  for (const chord of chords) {
    for (const freq of chord.freqs) {
      for (let v = 0; v < voices; v++) {
        const x = voices === 1 ? 0 : (2 * v) / (voices - 1) - 1;
        const f = freq * 2 ** ((detune * x + 0.02 * (r() - 0.5)) / 12);
        const [gl, gr] = panGains(spread * (v % 2 === 0 ? x : -x));
        const o = new Osc(sr, r());
        for (let i = 0; i < chord.len + rel; i++) {
          const j = chord.at + i;
          if (j < 0 || j >= L.length) continue;
          const s = Math.min(1, i / att) * (i < chord.len ? 1 : 1 - (i - chord.len) / rel) * o.saw(f);
          L[j] += s * gl;
          R[j] += s * gr;
        }
      }
    }
  }
  const fl = new SVF(sr);
  const fr = new SVF(sr);
  const norm = gain / Math.sqrt(voices);
  for (let i = 0; i < L.length; i++) {
    const c = cutoff(i);
    fl.process(L[i], c, q);
    fr.process(R[i], c, q);
    outL[i] += norm * fl.lp;
    outR[i] += norm * fr.lp;
  }
}
