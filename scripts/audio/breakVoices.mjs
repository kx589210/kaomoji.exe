// The break's own voices and bus effects (the part 'break'; sections/break.mjs plays them). The shared voices (drums.mjs, synth.mjs, fm.mjs,
// fx.mjs, vox.mjs, keys.mjs) cover most of the build sheet's recipes (break-sheet §5.2); these are the ones they do not: pitch sweeps,
// the glass's tinks and plips, a pad and a chip arp that bend (the C♯ pivot, the warble), a sung line with vibrato and a pitch curve,
// and the edits the hang and the held breath make to whole buses (the stutter, the tape stop, the high-pass suck).
// Every voice adds into its output from a sample index; every bus edit works in place on a Float32Array. Deterministic for a seed.
import { rng } from '../../src/engine/random.ts';
import { SVF } from './filters.mjs';
import { fmBell } from './fm.mjs';
import { panGains } from './mix.mjs';
import { Osc } from './osc.mjs';
import { VOWELS } from './vox.mjs';

const put = (out, i, v) => {
  if (i >= 0 && i < out.length) out[i] += v;
};

/**
 * A sine or a (band-limited) square sweeping exponentially from `from` to `to` Hz over `ms`, with a short attack and release and an
 * optional exponential decay (`decayMs`, the time constant): blips, beeps, the falling monitor, thwips, pops, the rescan's sweep.
 */
export function chirp(out, at, sr, { from, to = from, ms, gain = 0.1, wave = 'sine', attackMs = 1, releaseMs = 3, decayMs = 0 }) {
  const n = Math.round((ms / 1000) * sr);
  const att = Math.max(1, (attackMs / 1000) * sr);
  const rel = Math.max(1, (releaseMs / 1000) * sr);
  const o = new Osc(sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = from * (to / from) ** (i / n);
    const env = Math.min(1, i / att) * Math.min(1, (n - i) / rel) * (decayMs ? Math.exp(-t / (decayMs / 1000)) : 1);
    put(out, at + i, gain * env * (wave === 'square' ? o.pulse(f, 0.5) : o.sine(f)));
  }
}

/** A paint drop landing (break-sheet §5.2 plip): a sine falling from `freq` to two thirds of it in 20 ms over a 120 Hz thud, gone in 0.12 s. */
export function plip(out, at, sr, { freq, gain = 0.05 }) {
  const n = Math.round(0.12 * sr);
  let p = 0;
  let q = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    p += (freq * (0.66 + 0.34 * Math.exp(-t / 0.007))) / sr;
    q += 120 / sr;
    const env = Math.min(1, t / 0.001) * Math.exp(-t / 0.02) * Math.min(1, (n - i) / (0.004 * sr));
    put(out, at + i, gain * env * (Math.sin(2 * Math.PI * p) + 0.8 * Math.sin(2 * Math.PI * q)));
  }
}

/**
 * A pane of glass struck (break-sheet §5.2 glass tink): an FM bell with an inharmonic modulator (×5.37) whose index dies in a few tens of
 * milliseconds, ringing for `decayMs` (600 in break 1, 300 in the cascade, 150 as the hats of break 2–4), plus a 3 ms tick of noise above 6 kHz.
 */
export function tink(out, at, sr, { freq, gain = 0.12, decayMs = 600, ratio = 5.37, index = 1.6, click = 0.35, seed = 1 }) {
  fmBell(out, at, sr, { freq, gain, decay: decayMs / 3000, ratio, index, attackMs: 1 });
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.003 * sr);
  for (let i = 0; i < n + Math.round(0.002 * sr); i++) {
    f.process(i < n ? r() * 2 - 1 : 0, 6000, 0.7);
    put(out, at + i, gain * click * f.hp * (i < n ? 1 - i / n : 1));
  }
}

/** The tuned glass bell with its pitch wobbling (`hz`, ± `cents`): the dizzy A5 of break 3.3. Otherwise as fmBell. */
export function wobbleBell(out, at, sr, { freq, gain = 0.14, decay = 0.3, ratio = 3.5, index = 2.5, hz = 6, cents = 50 }) {
  const n = Math.round(decay * 5 * sr);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = freq * 2 ** ((cents / 1200) * Math.sin(2 * Math.PI * hz * t));
    pc += f / sr;
    pm += (f * ratio) / sr;
    const env = Math.min(1, t / 0.0015) * Math.exp(-t / decay);
    const idx = index * Math.exp(-t / (decay * 0.35));
    put(out, at + i, gain * env * Math.sin(2 * Math.PI * pc + idx * Math.sin(2 * Math.PI * pm)));
  }
}

/** A knuckle on glass from behind (E2): a dry tick of noise above 4 kHz and two sine bodies (1.2 and 2.4 kHz) dying in ~30 ms. */
export function knock(out, at, sr, { gain = 0.08, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.09 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(i < 0.002 * sr ? r() * 2 - 1 : 0, 4000, 0.7);
    const body = (Math.sin(2 * Math.PI * 1200 * t) + 0.6 * Math.sin(2 * Math.PI * 2400 * t)) * Math.exp(-t / 0.01) * Math.min(1, t / 0.0005);
    put(out, at + i, gain * (1.2 * f.hp + body));
  }
}

/** Paint slapping flat (break 2.1): low-passed noise for 40 ms over a 180 Hz body for 60 ms. */
export function slap(out, at, sr, { gain = 0.3, seed = 1 } = {}) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round(0.1 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f.process(r() * 2 - 1, 2000, 0.8);
    const env = Math.min(1, t / 0.0008);
    put(out, at + i, gain * env * (f.lp * Math.exp(-t / 0.012) * 1.6 + 0.7 * Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t / 0.02)));
  }
}

/** The shapes pooling into blocks (break 2.2): a chord of plucked saws through a resonant low-pass opening 300 → 1200 Hz over 220 ms. */
export function gloop(out, at, sr, { freqs, gain = 0.18, seed = 1 }) {
  const r = rng(seed);
  const oscs = freqs.map((f) => ({ f, o: new Osc(sr, r()) }));
  const flt = new SVF(sr);
  const n = Math.round(0.42 * sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let x = 0;
    for (const { f, o } of oscs) x += o.saw(f);
    flt.process(x / Math.sqrt(oscs.length), 300 * 4 ** Math.min(1, t / 0.22), 8);
    const env = Math.min(1, t / 0.003) * Math.exp(-t / 0.12);
    put(out, at + i, gain * env * flt.lp);
  }
}

/**
 * Glass grains (break-sheet §5.2 swarm): tinks of the chord's tones in octaves 6–7 (`tones`, Hz), short and quiet, their rate rising from
 * `from` to `to` grains a second over `len` samples and their level swelling (×0.4 → ×1.2), each panned at random. Into the stereo pair from sample `at`.
 */
export function tinkSwarm(outL, outR, at, len, sr, { tones, from = 10, to = 60, gain = 0.02, seed = 1 }) {
  const r = rng(seed);
  const T = len / sr;
  // The first grain on `at`, then ever closer.
  for (let t = 0; t < T; t += (1 / (from + (to - from) * Math.min(1, t / T))) * (0.5 + r())) {
    const b = new Float32Array(Math.round(0.25 * sr));
    tink(b, 0, sr, { freq: tones[Math.floor(r() * tones.length)], gain: gain * (0.6 + 0.4 * r()) * (0.4 + 0.8 * (t / T)), decayMs: 200, click: 0.25, seed: 1 + Math.floor(r() * 1e6) });
    const [l, rr] = panGains(1.6 * r() - 0.8);
    const s = at + Math.round(t * sr);
    for (let i = 0; i < b.length; i++) {
      put(outL, s + i, b[i] * l);
      put(outR, s + i, b[i] * rr);
    }
  }
}

/** Noise through a band-pass sweeping from `from` to `to` Hz over `ms`, a 1 ms attack, then falling away: the fan's fwip, a zip. */
export function zip(out, at, sr, { from, to, ms, gain = 0.05, q = 2, seed = 1 }) {
  const r = rng(seed);
  const f = new SVF(sr);
  const n = Math.round((ms / 1000) * sr);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    f.process(r() * 2 - 1, from * (to / from) ** u, q);
    put(out, at + i, (gain * Math.min(1, i / (0.001 * sr)) * (1 - u) ** 1.5 * f.bp) / Math.sqrt(q));
  }
}

/**
 * The slingshot's rubber band (break-sheet §5.2): a sine stretching exponentially from `from` to `to` Hz over `len` samples, a semitone
 * higher after each of `steps` (sample offsets; each step glides over `glide` samples), trembling at `trem` Hz (depth `depth`), its level
 * growing from `g0` to `g1`.
 */
export function rubberBand(out, at, len, sr, { from = 300, to = 2400, steps = [], glide = 800, trem = 40, depth = 0.5, g0 = 0.015, g1 = 0.07 } = {}) {
  let p = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const up = steps.reduce((s, x) => s + Math.min(1, Math.max(0, (i - x) / glide)), 0);
    p += (from * (to / from) ** u * 2 ** (up / 12)) / sr;
    const env = g0 * (g1 / g0) ** u * (1 - depth * (0.5 + 0.5 * Math.sin((2 * Math.PI * trem * i) / sr))) * Math.min(1, i / (0.003 * sr));
    put(out, at + i, env * Math.sin(2 * Math.PI * p));
  }
}

/** A thing switched on (break-sheet §5.2 powerOn): a sine rising 80 → 880 Hz with a square a fifth up, swelling to its end (`len` samples). */
export function powerUp(out, at, len, sr, { gain = 0.12 } = {}) {
  const sq = new Osc(sr);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const f = 80 * 11 ** u;
    p += f / sr;
    const env = u ** 2 * Math.min(1, (len - i) / (0.002 * sr));
    put(out, at + i, gain * env * (Math.sin(2 * Math.PI * p) + 0.25 * sq.pulse(1.5 * f, 0.5)));
  }
}

/**
 * Supersaw pad chords that bend: like synth.mjs's supersaw (each tone `voices` saws detuned across ± `detune` semitones, spread across
 * the stereo field), but every voice follows `bend(i)` (semitones at sample i: the C♯ pivot's glide, the warble), the level follows
 * `gain` (a number or a function of i: fades) and each chord has its own attack and release. Chords are { at, len, freqs }; `cutoff(i)`
 * drives a resonant low-pass per side.
 */
export function pad(outL, outR, chords, sr, { voices = 5, detune = 0.14, spread = 0.6, gain = 0.1, cutoff = () => 3000, q = 0.7, bend = () => 0, attackMs = 30, releaseMs = 200, seed = 1 } = {}) {
  const n = outL.length;
  const r = rng(seed);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const bendMul = new Float32Array(n);
  for (let i = 0; i < n; i++) bendMul[i] = 2 ** (bend(i) / 12);
  const att = Math.max(1, (attackMs / 1000) * sr);
  const rel = Math.max(1, (releaseMs / 1000) * sr);
  for (const chord of chords) {
    for (const freq of chord.freqs) {
      for (let v = 0; v < voices; v++) {
        const x = voices === 1 ? 0 : (2 * v) / (voices - 1) - 1;
        const f = freq * 2 ** ((detune * x + 0.02 * (r() - 0.5) * (voices > 1 ? 1 : 0)) / 12);
        const [gl, gr] = panGains(spread * (v % 2 === 0 ? x : -x));
        const o = new Osc(sr, voices === 1 ? 0 : r());
        for (let i = 0; i < chord.len + rel; i++) {
          const j = chord.at + i;
          if (j < 0) continue;
          if (j >= n) break;
          const d = (i - chord.len) / rel;
          const s = Math.min(1, i / att) * (d < 0 ? 1 : (1 - d) * Math.exp(-3 * d)) * o.saw(f * bendMul[j]);
          L[j] += s * gl;
          R[j] += s * gr;
        }
      }
    }
  }
  const fl = new SVF(sr);
  const fr = new SVF(sr);
  const level = typeof gain === 'function' ? gain : () => gain;
  const norm = 1 / Math.sqrt(voices);
  for (let i = 0; i < n; i++) {
    const c = cutoff(i);
    fl.process(L[i], c, q);
    fr.process(R[i], c, q);
    const g = norm * level(i);
    outL[i] += g * fl.lp;
    outR[i] += g * fr.lp;
  }
}

/**
 * The 8-bit arp (break-sheet §5.2): zero-mean band-limited pulses ({ at, len, freq, duty }; 2 ms attack, 20 ms release) bent by
 * `bend(i)` semitones, through a resonant low-pass at `cutoff(i)`, then held at `crushHz(i)` (0: not crushed; the hold restarts on each
 * note) and quantised to `bits` (what is quieter than half a step passes, so a note's attack is not swallowed).
 */
export function chip(out, notes, sr, { gain = 0.08, cutoff = () => 8000, q = 1.1, bend = () => 0, crushHz = () => 0, bits = 7 } = {}) {
  const n = out.length;
  const raw = new Float32Array(n);
  const onset = new Uint8Array(n);
  const rel = Math.round(0.02 * sr);
  for (const note of notes) {
    if (note.at + 1 >= 0 && note.at + 1 < n) onset[note.at + 1] = 1; // its first non-zero sample (the attack starts from 0)
    const o = new Osc(sr);
    for (let i = 0; i < note.len + rel; i++) {
      const j = note.at + i;
      if (j < 0) continue;
      if (j >= n) break;
      const env = Math.min(1, i / (0.002 * sr)) * (i < note.len ? 1 : 1 - (i - note.len) / rel);
      raw[j] += env * (o.pulse(note.freq * 2 ** (bend(j) / 12), note.duty) - (2 * note.duty - 1));
    }
  }
  const f = new SVF(sr);
  const levels = 2 ** (bits - 1);
  let held = 0;
  let next = 0;
  for (let i = 0; i < n; i++) {
    f.process(raw[i], cutoff(i), q);
    const hz = crushHz(i);
    // The hold restarts on each note, so a crushed note still starts on its sample.
    if (!hz || i >= next || onset[i]) {
      held = hz && Math.abs(f.lp) * levels >= 0.5 ? Math.round(f.lp * levels) / levels : f.lp;
      next = i + (hz ? sr / hz : 1);
    }
    out[i] += gain * held;
  }
}

/**
 * A sung line (break-sheet §5.2 vox): a softened saw with a little breath through five formant band-passes morphing from `vowel` to `to`,
 * its pitch `freq` moved by `pitch(u)` semitones (u = 0 … 1 over the note) and a vibrato of ± `cents` at `hz` that fades in over 80 ms;
 * a 10 ms attack and a 40 ms release after `len` samples.
 */
export function sing(out, at, sr, { freq, len, vowel = 'a', to = vowel, pitch = () => 0, hz = 5.5, cents = 15, gain = 0.28, breath = 0.04, seed = 1 }) {
  const r = rng(seed);
  const src = new Osc(sr);
  const filters = VOWELS[vowel].map(() => new SVF(sr));
  const rel = Math.round(0.04 * sr);
  let soft = 0;
  for (let i = 0; i < len + rel; i++) {
    const j = at + i;
    if (j >= out.length) break;
    const t = i / sr;
    const u = Math.min(1, i / len);
    const k = u * u * (3 - 2 * u);
    const vib = (cents / 100) * Math.min(1, t / 0.08) * Math.sin(2 * Math.PI * hz * t);
    soft += 0.35 * (src.saw(freq * 2 ** ((pitch(u) + vib) / 12)) - soft);
    const x = soft + breath * (r() * 2 - 1);
    let y = 0;
    filters.forEach((flt, m) => {
      const [fa, da, ba] = VOWELS[vowel][m];
      const [fb, db, bb] = VOWELS[to][m];
      const fc = fa + (fb - fa) * k;
      const bw = ba + (bb - ba) * k;
      flt.process(x, fc, fc / bw);
      y += 10 ** ((da + (db - da) * k) / 20) * flt.bp * (bw / fc);
    });
    const env = Math.min(1, i / (0.01 * sr)) * (i < len ? 1 : 1 - (i - len) / rel);
    if (j >= 0) out[j] += gain * env * y;
  }
}

// --- Bus edits (in place) ------------------------------------------------------------------------------------------------------

/**
 * A tape stop over samples [a, b): the window replays from `a` at a speed falling exponentially to 2^(−semitones/12) by `b` (every
 * pitch bends down together), through a low-pass closing from `lpFrom` to `lpTo` Hz; it fades out over its last 4 ms, and the tape stays
 * stopped: everything from `b` on is silenced.
 */
export function tapeStop(x, a, b, sr, { semitones = 12, lpFrom = 8000, lpTo = 300 } = {}) {
  const src = x.slice(a, b);
  const len = b - a;
  const k = (semitones / 12) * Math.LN2;
  const f = new SVF(sr);
  const fade = Math.round(0.004 * sr);
  let pos = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const j = Math.floor(pos);
    const fr = pos - j;
    const v = j + 1 < len ? src[j] * (1 - fr) + src[j + 1] * fr : src[Math.min(j, len - 1)];
    f.process(v, lpFrom * (lpTo / lpFrom) ** p, 0.7);
    x[a + i] = f.lp * Math.min(1, (len - i) / fade);
    pos += Math.exp(-k * p);
  }
  x.fill(0, b);
}

/**
 * A stutter: the slice of `len` samples at `starts[0]` replays from each start (scaled by `gains[k]`), gated to `len` (silent to the
 * next start), until `end`, where the timeline resumes; 1.5 ms ramps at every edge so no splice clicks.
 */
export function stutterSlices(x, starts, end, len, gains, sr, rampMs = 1.5) {
  const ramp = Math.max(1, Math.round((rampMs / 1000) * sr));
  const src = x.slice(starts[0], starts[0] + len);
  starts.forEach((s, k) => {
    const to = k + 1 < starts.length ? starts[k + 1] : end;
    for (let i = s; i < to && i < x.length; i++) {
      const j = i - s;
      if (j >= len) {
        x[i] = 0;
        continue;
      }
      const g = gains[k] * (k > 0 ? Math.min(1, j / ramp) : 1) * Math.min(1, (len - j) / ramp);
      x[i] = g * src[j];
    }
  });
  for (let j = 0; j < ramp && end + j < x.length; j++) x[end + j] *= j / ramp;
}

/** A high-pass sweeping exponentially from `from` to `to` Hz over samples [a, b) (it starts from rest on `a`; `b` is meant to be a cut). */
export function sweepHighpass(x, a, b, sr, from, to) {
  const f = new SVF(sr);
  for (let i = a; i < b && i < x.length; i++) {
    f.process(x[i], from * (to / from) ** ((i - a) / (b - a)), 0.7);
    x[i] = f.hp;
  }
}
